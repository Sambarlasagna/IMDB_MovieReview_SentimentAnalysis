import os
import time
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from transformers import AutoTokenizer
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, Histogram

PREDICTIONS = Counter(
    "cinescope_predictions_total",
    "Total sentiment predictions made",
    ["sentiment"],          # label: 'positive' or 'negative'
)
INFERENCE_TIME = Histogram(
    "cinescope_inference_seconds",
    "CNN inference latency in seconds",
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)
DB_ERRORS = Counter(
    "cinescope_db_errors_total",
    "Total database errors encountered",
)

# Load .env from the backend/ directory, and force it to override any lingering system variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)

# ─── Model Definition ──────────────────────────────────────────────────────────
class CNN(nn.Module):
    def __init__(self, vocab_size, embedding_dim, n_filters, filter_sizes,
                 output_dim, dropout_rate, pad_index):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=pad_index)
        self.convs = nn.ModuleList([
            nn.Conv1d(embedding_dim, n_filters, fs) for fs in filter_sizes
        ])
        self.fc = nn.Linear(len(filter_sizes) * n_filters, output_dim)
        self.dropout = nn.Dropout(dropout_rate)

    def forward(self, ids):
        embedded = self.dropout(self.embedding(ids))
        embedded = embedded.permute(0, 2, 1)
        conved = [torch.relu(conv(embedded)) for conv in self.convs]
        pooled = [conv.max(dim=-1).values for conv in conved]
        cat = self.dropout(torch.cat(pooled, dim=-1))
        return self.fc(cat)


# ─── Globals ───────────────────────────────────────────────────────────────────
device    = torch.device("cuda" if torch.cuda.is_available() else "cpu")
tokenizer = None
model     = None
db_conn   = None

MODEL_PATH   = os.path.join(os.path.dirname(__file__), "..", "CNNModel.pt")
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

# Hyperparameters (must match training)
VOCAB_SIZE    = 30522   # bert-base-uncased
EMBEDDING_DIM = 300
N_FILTERS     = 100
FILTER_SIZES  = [3, 5, 7]
OUTPUT_DIM    = 2
DROPOUT_RATE  = 0.5
MAX_LENGTH    = 256


# ─── Model Loader ──────────────────────────────────────────────────────────────
def load_model():
    global tokenizer, model
    print("Loading tokenizer (bert-base-uncased)...")
    tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
    pad_index = tokenizer.pad_token_id

    print("Loading CNN weights...")
    model = CNN(VOCAB_SIZE, EMBEDDING_DIM, N_FILTERS, FILTER_SIZES,
                OUTPUT_DIM, DROPOUT_RATE, pad_index).to(device)
    state = torch.load(MODEL_PATH, map_location=device, weights_only=True)
    model.load_state_dict(state)
    model.eval()
    print("[OK] CNN model ready on", device)


# ─── DB Helpers ────────────────────────────────────────────────────────────────
def _db_params():
    return dict(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "movie_reviews"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
    )

def get_db():
    """Return a live connection; reconnects if the previous one dropped."""
    global db_conn
    try:
        if db_conn is None or db_conn.closed:
            db_conn = psycopg2.connect(**_db_params())
        else:
            # Quick liveness check
            db_conn.cursor().execute("SELECT 1")
    except psycopg2.OperationalError:
        db_conn = psycopg2.connect(**_db_params())
    return db_conn


def init_db(retries: int = 10, delay: float = 3.0):
    """Create the reviews table, retrying until Postgres is ready."""
    for attempt in range(1, retries + 1):
        try:
            conn = get_db()
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS reviews (
                        id          SERIAL PRIMARY KEY,
                        review_text TEXT        NOT NULL,
                        sentiment   VARCHAR(10) NOT NULL,
                        confidence  FLOAT       NOT NULL,
                        created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
                    );
                """)
            conn.commit()
            print("[OK] Database table ready.")
            return
        except psycopg2.OperationalError as e:
            print(f"  DB not ready (attempt {attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(delay)
    raise RuntimeError(
        "Could not connect to PostgreSQL after several attempts. "
        "Make sure it is running and .env credentials are correct."
    )


# ─── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    init_db()
    yield
    global db_conn
    if db_conn and not db_conn.closed:
        db_conn.close()
        print("DB connection closed.")


# ─── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="CineScope — Movie Sentiment API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files at /static/*
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

Instrumentator().instrument(app).expose(app)

# ─── Schemas ───────────────────────────────────────────────────────────────────
class ReviewRequest(BaseModel):
    review: str


# ─── Inference ─────────────────────────────────────────────────────────────────
def predict(text: str):
    encoding = tokenizer(
        text,
        add_special_tokens=True,
        truncation=True,
        max_length=MAX_LENGTH,
        padding="max_length",
        return_tensors="pt",
    )
    input_ids = encoding["input_ids"].to(device)
    with INFERENCE_TIME.time():
        with torch.no_grad():
            logits = model(input_ids)
            probs  = torch.softmax(logits, dim=-1)
            pred   = logits.argmax(dim=-1).item()
            conf   = probs[0, pred].item()
    label = "positive" if pred == 1 else "negative"
    PREDICTIONS.labels(label).inc()
    return label, round(conf * 100, 2)


# ─── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.post("/api/reviews", summary="Submit a review for sentiment analysis")
def submit_review(body: ReviewRequest):
    text = body.review.strip()
    if not text:
        raise HTTPException(400, "Review text cannot be empty.")
    if len(text) < 10:
        raise HTTPException(400, "Review too short — minimum 10 characters.")

    sentiment, confidence = predict(text)

    try:
        conn = get_db()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO reviews (review_text, sentiment, confidence, created_at)
                   VALUES (%s, %s, %s, %s) RETURNING *""",
                (text, sentiment, confidence, datetime.utcnow()),
            )
            row = cur.fetchone()
        conn.commit()
    except psycopg2.Error as e:
        raise HTTPException(503, f"Database error: {e}")

    return {
        "id":         row["id"],
        "sentiment":  row["sentiment"],
        "confidence": row["confidence"],
        "created_at": row["created_at"].isoformat(),
    }


@app.get("/api/reviews", summary="Paginated list of past reviews")
def get_reviews(limit: int = 10, offset: int = 0):
    try:
        conn = get_db()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM reviews ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (limit, offset),
            )
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) AS total FROM reviews")
            total = cur.fetchone()["total"]
    except psycopg2.Error as e:
        raise HTTPException(503, f"Database error: {e}")

    return {"reviews": [dict(r) for r in rows], "total": total}


@app.get("/api/stats", summary="Aggregate sentiment statistics")
def get_stats():
    try:
        conn = get_db()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    COUNT(*)                                               AS total,
                    SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) AS positive,
                    SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negative,
                    ROUND(AVG(confidence)::numeric, 2)                     AS avg_confidence
                FROM reviews
            """)
            stats = cur.fetchone()
    except psycopg2.Error as e:
        raise HTTPException(503, f"Database error: {e}")

    return {
        "total":          int(stats["total"] or 0),
        "positive":       int(stats["positive"] or 0),
        "negative":       int(stats["negative"] or 0),
        "avg_confidence": float(stats["avg_confidence"] or 0),
    }


@app.get("/api/health", summary="Health check")
def health():
    db_ok = False
    try:
        get_db().cursor().execute("SELECT 1")
        db_ok = True
    except Exception:
        pass
    return {
        "model":  "loaded" if model is not None else "not loaded",
        "device": str(device),
        "db":     "connected" if db_ok else "disconnected",
    }
