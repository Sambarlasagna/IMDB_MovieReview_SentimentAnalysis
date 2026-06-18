export default function ToastContainer({ toasts }) {
  return (
    <div className="toast-container" id="toast-container" aria-live="assertive">
      {toasts.map(t => {
        const icon = t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️';
        return (
          <div key={t.id} className={`toast ${t.type}${t.fading ? ' fade-out' : ''}`}>
            <span>{icon}</span>
            <span>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
