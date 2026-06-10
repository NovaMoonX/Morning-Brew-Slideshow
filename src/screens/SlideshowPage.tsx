import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@store/index';
import { useIssue } from '@hooks/useIssue';
import { resetPlayer } from '@store/slideshowSlice';
import { SlideshowPlayer } from '@components/SlideshowPlayer';
import { IssueTableOfContents } from '@components/IssueTableOfContents';
import { TTSEngine } from '@components/TTSEngine';

export function SlideshowPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Reset slide index when opening a new issue
  useEffect(() => {
    dispatch(resetPlayer());
    setTocOpen(false);
  }, [date, dispatch]);

  const issueId = date || '';
  const [tocOpen, setTocOpen] = useState(false);
  
  // Custom hook manages real-time snapshot subscription and dispatches updates to Redux
  const { issue, loading, error } = useIssue(issueId);
  const currentSlideIndex = useAppSelector((state) => state.slideshow.currentSlideIndex);

  const slides = issue?.slides ?? [];
  const totalSlides = slides.length;
  
  // Safe bounded slide reference
  const activeIndex = Math.max(0, Math.min(currentSlideIndex, totalSlides - 1));
  const activeSlide = slides[activeIndex] ?? null;
  const isAudioReady = issue?.status === 'audio_ready';

  if (loading && !issue) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="size-12 animate-spin rounded-full border-4 border-border border-t-sky-500"></div>
        <p className="mt-4 text-muted">Loading issue slide deck...</p>
      </div>
    );
  }

  if (error && !issue) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center text-foreground">
        <div className="max-w-md rounded-xl border border-red-300 bg-red-50 p-6 dark:border-red-900/35 dark:bg-red-950/20">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Error Loading Slides</h2>
          <p className="mt-2 text-sm text-red-500">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-500 transition"
          >
            Back to Issues
          </button>
        </div>
      </div>
    );
  }

  if (!issue || slides.length === 0 || !activeSlide) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-center text-foreground p-4">
        <h2 className="text-xl font-bold">No slides found</h2>
        <p className="mt-2 text-sm text-muted">
          The issue for {issueId} is still processing or has no contents.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-500 transition"
        >
          Back to Issues
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-background">
      <div className="relative mx-auto h-dvh w-full max-w-lg overflow-hidden text-foreground select-none">
      {/* Floating Exit Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 right-4 z-40 flex items-center justify-center rounded-full border border-border bg-surface-glass p-3 text-muted shadow-md backdrop-blur-md transition hover:bg-surface-elevated hover:text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
        aria-label="Exit Slideshow"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="size-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main Full-Bleed slide renderer */}
      <SlideshowPlayer
        slide={activeSlide}
        slides={slides}
        currentIndex={activeIndex}
        totalSlides={totalSlides}
        tocOpen={tocOpen}
        onOpenTableOfContents={() => setTocOpen(true)}
      />

      <IssueTableOfContents
        slides={slides}
        currentIndex={activeIndex}
        isOpen={tocOpen}
        onClose={() => setTocOpen(false)}
      />

      {/* Discreet bottom status EQ & Controls */}
      <TTSEngine
        slide={activeSlide}
        totalSlides={totalSlides}
        isAudioReady={isAudioReady}
        onOpenTableOfContents={() => setTocOpen(true)}
      />
      </div>
    </div>
  );
}

export default SlideshowPage;
