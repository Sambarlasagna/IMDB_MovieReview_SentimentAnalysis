import { useState, useRef, useEffect } from 'react';
import { submitReview } from '../api';

const MAX_LEN = 5000;

function ResultBanner({ result }) {
  const barRef = useRef(null);
  const isPos = result.sentiment === 'positive';

  useEffect(() => {
    // Animate bar width after mount
    const bar = barRef.current;
    if (!bar) return;
    bar.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = `${result.confidence}%`;
      });
    });
  }, [result]);

  return (
    <div className={`result-banner ${result.sentiment}`} role="status">
      <div className="result-icon">{isPos ? '😍' : '😤'}</div>
      <div className="result-info">
        <div className="result-label">
          ✦ {isPos ? 'Positive' : 'Negative'} Sentiment
        </div>
        <div className="result-confidence">
          Model confidence: {result.confidence}%
        </div>
      </div>
      <div className="confidence-bar-wrap">
        <div className="confidence-bar" ref={barRef} />
      </div>
    </div>
  );
}

export default function AnalyzerSection({ onNewReview, showToast }) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmed = text.trim();

    if (!trimmed) {
      setError('Please enter a review before submitting.');
      return;
    }
    if (trimmed.length < 10) {
      setError('Review is too short (minimum 10 characters).');
      return;
    }

    setLoading(true);
    try {
      const data = await submitReview(trimmed);
      setResult(data);
      showToast('Review analyzed & saved!', 'success');
      onNewReview(data);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const charColor = text.length > 4500 ? 'var(--clr-neg)' : undefined;

  return (
    <section className="section" id="analyzer">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Analyze a Review</h2>
          <p className="section-sub">
            Write or paste a movie review below and hit <em>Analyze</em>.
          </p>
        </div>

        <div className="analyzer-card" id="analyzer-card">
          {result && <ResultBanner result={result} />}

          <form id="review-form" noValidate onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="review-input" className="input-label">
                Your Movie Review
              </label>
              <textarea
                id="review-input"
                name="review"
                rows={6}
                maxLength={MAX_LEN}
                placeholder="e.g. — This film was an absolute masterpiece. The cinematography, the acting, the soundtrack — everything clicked perfectly..."
                required
                aria-required="true"
                aria-describedby="char-count review-error"
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <div className="input-footer">
                <span className="error-msg" id="review-error" role="alert">
                  {error}
                </span>
                <span className="char-count" id="char-count" style={{ color: charColor }}>
                  {text.length} / {MAX_LEN}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-analyze"
              id="analyze-btn"
              disabled={loading}
            >
              <span className="btn-text">
                {loading ? 'Analyzing…' : 'Analyze Sentiment'}
              </span>
              {loading && <span className="btn-spinner" aria-hidden="true" />}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
