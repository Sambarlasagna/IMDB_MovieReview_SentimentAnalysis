import { useState, useEffect, useCallback } from 'react';
import { fetchReviews } from '../api';

const PAGE_SIZE = 10;

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  });
}

function ReviewItem({ review, index }) {
  const isPos = review.sentiment === 'positive';
  const preview = review.review_text.length > 240
    ? review.review_text.slice(0, 240) + '…'
    : review.review_text;

  return (
    <article
      className={`review-item ${review.sentiment}`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="review-badge">
        <span className="badge-emoji">{isPos ? '😊' : '😞'}</span>
        <span className="badge-label">{review.sentiment}</span>
      </div>
      <div className="review-body">
        <p className="review-text">{preview}</p>
        <p className="review-meta">
          #{review.id}&nbsp;·&nbsp;{formatDate(review.created_at)}
        </p>
      </div>
      <div className="review-conf">
        <div className="conf-value">{review.confidence}%</div>
        <div className="conf-label">confidence</div>
      </div>
    </article>
  );
}

export default function HistorySection({ refreshKey, showToast }) {
  const [reviews, setReviews]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [filter, setFilter]         = useState('all');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);

  const load = useCallback(async (pg = 1, f = filter) => {
    setLoading(true);
    setError(false);
    try {
      const offset = (pg - 1) * PAGE_SIZE;
      const data = await fetchReviews(PAGE_SIZE, offset);
      setTotal(data.total);
      const filtered = f === 'all'
        ? data.reviews
        : data.reviews.filter(r => r.sentiment === f);
      setReviews(filtered);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Reload when a new review is submitted (refreshKey bumps)
  useEffect(() => { load(page, filter); }, [refreshKey]);  // eslint-disable-line

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleFilter(f) {
    setFilter(f);
    setPage(1);
    load(1, f);
  }

  function handleRefresh() {
    load(page, filter);
    showToast('Refreshed!', 'success');
  }

  return (
    <section className="section" id="history">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Review History</h2>
          <p className="section-sub">The latest reviews submitted for analysis.</p>
        </div>

        <div className="history-controls">
          <div className="filter-group" role="group" aria-label="Filter by sentiment">
            {['all', 'positive', 'negative'].map(f => (
              <button
                key={f}
                id={`filter-${f}-btn`}
                className={`filter-btn${filter === f ? ' active' : ''}`}
                onClick={() => handleFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-refresh" id="refresh-btn" aria-label="Refresh history" onClick={handleRefresh}>
            <span className="refresh-icon">↺</span> Refresh
          </button>
        </div>

        <div className="reviews-list" id="reviews-list" aria-live="polite" aria-label="Review history">
          {loading ? (
            <div className="loading-placeholder" id="history-loader">
              <div className="spinner-lg" />
              <p>Loading reviews…</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>⚠️</p>
              <p>Could not load reviews. Is the backend running?</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="empty-state">
              <p>🎬</p>
              <p>No reviews found yet. Be the first!</p>
            </div>
          ) : (
            reviews.map((r, i) => <ReviewItem key={r.id} review={r} index={i} />)
          )}
        </div>

        {total > 0 && !loading && (
          <div className="pagination" id="pagination">
            <button
              className="page-btn"
              id="prev-btn"
              disabled={page <= 1}
              aria-label="Previous page"
              onClick={() => { const p = page - 1; setPage(p); load(p, filter); }}
            >
              ← Prev
            </button>
            <span className="page-info" id="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              className="page-btn"
              id="next-btn"
              disabled={page >= totalPages}
              aria-label="Next page"
              onClick={() => { const p = page + 1; setPage(p); load(p, filter); }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
