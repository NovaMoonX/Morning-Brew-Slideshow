import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@store/index';
import { nextSlide } from '@store/slideshowSlice';
import { linkCardDurationMs } from '@lib/slideshow/timing';

interface LinkCardsSkipButtonProps {
  slideId: string;
  totalSlides: number;
  mainLastIndex: number;
  linkCount: number;
  durationMs?: number;
  paused?: boolean;
}

export function LinkCardsSkipButton({
  slideId,
  totalSlides,
  mainLastIndex,
  linkCount,
  durationMs = linkCardDurationMs(linkCount),
  paused = false,
}: LinkCardsSkipButtonProps) {
  const dispatch = useAppDispatch();
  const totalSeconds = Math.max(1, Math.ceil(durationMs / 1000));
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const advancedRef = useRef(false);
  const deadlineRef = useRef(Date.now() + durationMs);
  const tickTimerRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (tickTimerRef.current !== null) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const getRemainingMs = useCallback(
    () => Math.max(0, deadlineRef.current - Date.now()),
    [],
  );

  const startTimers = useCallback(() => {
    clearTimers();
    const remainingMs = getRemainingMs();
    if (remainingMs <= 0 || advancedRef.current) {
      return;
    }

    const updateDisplay = () => {
      const left = getRemainingMs();
      setSecondsLeft(left === 0 ? 0 : Math.ceil(left / 1000));
    };

    updateDisplay();
    tickTimerRef.current = window.setInterval(updateDisplay, 50);
    advanceTimerRef.current = window.setTimeout(() => {
      if (advancedRef.current) {
        return;
      }
      advancedRef.current = true;
      setSecondsLeft(0);
      dispatch(nextSlide({ totalSlides, mainLastIndex }));
    }, remainingMs);
  }, [clearTimers, dispatch, getRemainingMs, totalSlides]);

  useEffect(() => {
    advancedRef.current = false;
    deadlineRef.current = Date.now() + durationMs;
    setSecondsLeft(totalSeconds);
    clearTimers();
    startTimers();
    return clearTimers;
  }, [slideId, durationMs, totalSeconds, clearTimers, startTimers]);

  useEffect(() => {
    if (paused) {
      clearTimers();
      return;
    }
    if (!advancedRef.current && getRemainingMs() > 0) {
      startTimers();
    }
  }, [paused, clearTimers, getRemainingMs, startTimers]);

  const handleSkip = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (advancedRef.current) {
      return;
    }
    advancedRef.current = true;
    clearTimers();
    dispatch(nextSlide({ totalSlides, mainLastIndex }));
  };

  return (
    <button
      type="button"
      onClick={handleSkip}
      className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full border border-border bg-surface py-2.5 pl-8 pr-3 text-xs font-bold uppercase tracking-wider text-muted shadow-lg transition hover:text-foreground"
    >
      <span>Skip to Next Story</span>
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-600 tabular-nums text-sm font-extrabold leading-none text-white">
        {secondsLeft}
      </span>
    </button>
  );
}

export default LinkCardsSkipButton;
