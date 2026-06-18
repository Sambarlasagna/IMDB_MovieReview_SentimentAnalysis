export default function Navbar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        <a href="#" className="nav-logo" id="nav-logo-link">
          <span className="logo-icon">🎬</span>
          <span>CineScope</span>
        </a>
        <div className="nav-links">
          <a href="#analyzer" id="nav-analyzer-link">Analyze</a>
          <a href="#history"  id="nav-history-link">History</a>
          <a href="#stats"    id="nav-stats-link">Stats</a>
        </div>
      </div>
    </nav>
  );
}
