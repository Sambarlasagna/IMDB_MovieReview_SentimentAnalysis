import { useState, useCallback } from 'react';
import Navbar          from './components/Navbar';
import Hero            from './components/Hero';
import AnalyzerSection from './components/AnalyzerSection';
import StatsSection    from './components/StatsSection';
import HistorySection  from './components/HistorySection';
import Footer          from './components/Footer';
import ToastContainer  from './components/ToastContainer';
import { useToast }    from './hooks/useToast';

export default function App() {
  // refreshKey is incremented every time a new review is submitted,
  // causing Stats and History sections to re-fetch automatically.
  const [refreshKey, setRefreshKey] = useState(0);
  const { toasts, showToast } = useToast();

  const handleNewReview = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <>
      {/* Animated background orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <Navbar />
      <Hero />

      <main>
        <AnalyzerSection onNewReview={handleNewReview} showToast={showToast} />
        <StatsSection    refreshKey={refreshKey} />
        <HistorySection  refreshKey={refreshKey} showToast={showToast} />
      </main>

      <Footer />
      <ToastContainer toasts={toasts} />
    </>
  );
}
