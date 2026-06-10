import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@store/index';
import { useIssue } from '@hooks/useIssue';
import {
  resetPlayer,
  openExtraSection,
  closeExtraSection,
  nextExtraSlide,
  prevExtraSlide,
  togglePlay,
} from '@store/slideshowSlice';
import { SlideshowPlayer } from '@components/SlideshowPlayer';
import { IssueTableOfContents } from '@components/IssueTableOfContents';
import { TTSEngine } from '@components/TTSEngine';
import { ExtraSectionViewer } from '@components/ExtraSectionViewer';
import { SlideTimeRemaining } from '@components/SlideTimeRemaining';
import { getMainDeckLastIndex } from '@lib/slideshow/deckBounds';
import { showsTopSlideCountdown } from '@lib/slideshow/slideCountdown';
import { useTTS } from '@hooks/useTTS';

export function SlideshowPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(resetPlayer());
    setTocOpen(false);
  }, [date, dispatch]);

  const issueId = date || '';
  const [tocOpen, setTocOpen] = useState(false);

  const { issue, loading, error } = useIssue(issueId);
  const currentSlideIndex = useAppSelector((state) => state.slideshow.currentSlideIndex);
  const activeExtra = useAppSelector((state) => state.slideshow.activeExtra);
  const extraSlideIndex = useAppSelector((state) => state.slideshow.extraSlideIndex);

  const slides = issue?.slides ?? [];
  const totalSlides = slides.length;
  const extraSlides = issue?.extra_slides ?? {};
  const mainLastIndex = useMemo(() => getMainDeckLastIndex(slides), [slides]);

  const activeIndex = Math.max(0, Math.min(currentSlideIndex, mainLastIndex));
  const activeSlide = slides[activeIndex] ?? null;
  const isAudioReady = issue?.status === 'audio_ready';

  const activeExtraSlides = activeExtra ? extraSlides[activeExtra] ?? [] : [];
  const showExitButton = !activeExtra;
  const isPlaying = useAppSelector((state) => state.slideshow.isPlaying);

  const {
    activeMode,
    secondsRemaining,
    syncPausePlayback,
    syncResumePlayback,
    playSlideAudio,
  } = useTTS({
    slide: activeSlide,
    totalSlides,
    mainLastIndex,
    isAudioReady,
  });

  const handleTogglePlayback = useCallback(() => {
    if (isPlaying) {
      syncPausePlayback();
      dispatch(togglePlay(false));
      return;
    }

    if (!syncResumePlayback()) {
      playSlideAudio();
    }
    dispatch(togglePlay(true));
  }, [dispatch, isPlaying, playSlideAudio, syncPausePlayback, syncResumePlayback]);

  const showTopCountdown =
    !activeExtra &&
    isPlaying &&
    activeSlide !== null &&
    showsTopSlideCountdown(activeSlide.type);

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
      <SlideTimeRemaining secondsLeft={secondsRemaining} visible={showTopCountdown} />

      <div className="relative mx-auto h-dvh w-full max-w-lg overflow-hidden text-foreground select-none">
        {showExitButton && (
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
        )}

        <SlideshowPlayer
          slide={activeSlide}
          slides={slides}
          currentIndex={activeIndex}
          totalSlides={totalSlides}
          tocOpen={tocOpen}
          onOpenTableOfContents={() => setTocOpen(true)}
          onTogglePlayback={handleTogglePlayback}
          extraSlides={extraSlides}
          wordOfDayHtml={issue.word_of_day_html ?? null}
          wordOfDay={issue.word_of_day}
          onOpenExtra={(section) => dispatch(openExtraSection(section))}
          onExit={() => navigate('/')}
        />

        {!activeExtra && (
          <IssueTableOfContents
            slides={slides}
            currentIndex={activeIndex}
            isOpen={tocOpen}
            onClose={() => setTocOpen(false)}
          />
        )}

        {!activeExtra && (
          <TTSEngine
            slide={activeSlide}
            activeMode={activeMode}
            onOpenTableOfContents={() => setTocOpen(true)}
            onTogglePlayback={handleTogglePlayback}
          />
        )}

        {activeExtra && activeExtraSlides.length > 0 && (
          <ExtraSectionViewer
            slides={activeExtraSlides}
            currentIndex={Math.min(extraSlideIndex, activeExtraSlides.length - 1)}
            onBack={() => dispatch(closeExtraSection())}
            onNext={() => dispatch(nextExtraSlide(activeExtraSlides.length))}
            onPrev={() => dispatch(prevExtraSlide())}
          />
        )}
      </div>
    </div>
  );
}

export default SlideshowPage;
