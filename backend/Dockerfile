# Build context is the PROJECT ROOT (set in docker-compose)
# so we can access CNNModel.pt and backend/ from here.

FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Working directory mirrors the path expected by MODEL_PATH:
#   __file__ = /app/backend/app.py
#   MODEL_PATH = /app/backend/../CNNModel.pt = /app/CNNModel.pt  ✓
WORKDIR /app/backend

# ── Install Python deps ─────────────────────────────────────────
# Install standard GPU-enabled PyTorch (this will be a large download)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy source & model ─────────────────────────────────────────
COPY backend/ .

# Copy the trained CNN model one level up (matches MODEL_PATH in app.py)
COPY CNNModel.pt /app/CNNModel.pt

# Empty frontend dir so FastAPI's StaticFiles mount doesn't crash.
# In Docker, nginx serves the React app; FastAPI only handles /api/*.
RUN mkdir -p /app/frontend

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]