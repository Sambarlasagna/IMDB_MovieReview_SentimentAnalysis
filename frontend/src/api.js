const API = '';   // same-origin via FastAPI static mount

export async function submitReview(reviewText) {
  const res = await fetch(`${API}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review: reviewText }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Server error');
  return data;
}

export async function fetchStats() {
  const res = await fetch(`${API}/api/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchReviews(limit = 10, offset = 0) {
  const res = await fetch(`${API}/api/reviews?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}
