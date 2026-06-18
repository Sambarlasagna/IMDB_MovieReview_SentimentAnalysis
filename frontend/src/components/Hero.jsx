export default function Hero() {
  return (
    <header className="hero" id="hero">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="pulse-dot"></span>
          <span>CNN Model · 89.5% Accuracy</span>
        </div>
        <h1 className="hero-title">
          Decode the Sentiment<br />
          <span className="gradient-text">Behind Every Review</span>
        </h1>
        <p className="hero-sub">
          Paste any movie review and our deep-learning CNN model will instantly
          classify it as <strong>Positive</strong> or <strong>Negative</strong>
          — then store it for later analysis.
        </p>
        <a href="#analyzer" className="hero-cta" id="hero-cta-btn">
          Start Analyzing ↓
        </a>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="film-strip">
          <div className="frame frame-pos">😍 Masterpiece!</div>
          <div className="frame frame-neg">😤 Disappointing</div>
          <div className="frame frame-pos">🤩 Must Watch!</div>
          <div className="frame frame-neg">💤 Boring plot</div>
          <div className="frame frame-pos">⭐ Outstanding!</div>
        </div>
      </div>
    </header>
  );
}
