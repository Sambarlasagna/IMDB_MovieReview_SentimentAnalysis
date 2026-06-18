import { useState, useEffect, useCallback } from 'react';
import { fetchStats } from '../api';

function useCounter(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    const from = 0;
    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * ease));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function StatCard({ icon, value, label, className = '' }) {
  const animated = useCounter(typeof value === 'number' ? value : 0);
  const display = typeof value === 'string' ? value : animated;
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{display}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function StatsSection({ refreshKey }) {
  const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0, avg_confidence: 0 });

  const load = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <section className="section section-alt" id="stats">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Overall Statistics</h2>
          <p className="section-sub">Aggregated data from all submitted reviews.</p>
        </div>
        <div className="stats-grid" id="stats-grid">
          <StatCard icon="📋" value={stats.total}    label="Total Reviews" />
          <StatCard icon="😊" value={stats.positive} label="Positive" className="positive-card" />
          <StatCard icon="😞" value={stats.negative} label="Negative" className="negative-card" />
          <StatCard
            icon="🎯"
            value={stats.avg_confidence ? `${stats.avg_confidence}%` : '—'}
            label="Avg. Confidence"
          />
        </div>
      </div>
    </section>
  );
}
