import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@store/index';
import { nextSlide } from '@store/slideshowSlice';
import { SECTION_HERO_DURATION_MS } from '@lib/slideshow/timing';

interface SectionHeroCountdownProps {
  slideId: string;
  sectionLabel: string;
  sectionTitle?: string | null;
  totalSlides: number;
  mainLastIndex: number;
  durationMs?: number;
}

export function SectionHeroCountdown({
  slideId,
  sectionLabel,
  sectionTitle,
  totalSlides,
  mainLastIndex,
  durationMs = SECTION_HERO_DURATION_MS,
}: SectionHeroCountdownProps) {
  const dispatch = useAppDispatch();
  const isPlaying = useAppSelector((state) => state.slideshow.isPlaying);
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
  }, [clearTimers, dispatch, getRemainingMs, mainLastIndex, totalSlides]);

  useEffect(() => {
    advancedRef.current = false;
    deadlineRef.current = Date.now() + durationMs;
    setSecondsLeft(totalSeconds);
    clearTimers();

    if (!isPlaying) {
      return;
    }

    startTimers();
    return clearTimers;
  }, [slideId, durationMs, totalSeconds, clearTimers, startTimers, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      clearTimers();
      return;
    }
    if (!advancedRef.current && getRemainingMs() > 0) {
      startTimers();
    }
  }, [isPlaying, clearTimers, getRemainingMs, startTimers]);

  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
        {sectionLabel}
      </span>
      {sectionTitle && (
        <h2 className="mt-3 max-w-md text-2xl font-extrabold leading-tight text-foreground md:text-3xl">
          {sectionTitle}
        </h2>
      )}
      {isPlaying ? (
        <>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Story starts in
          </p>
          <p className="mt-3 text-7xl font-extrabold tabular-nums leading-none text-sky-400 md:text-8xl">
            {secondsLeft}
          </p>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted">Tap play when you&apos;re ready to continue.</p>
      )}
    </div>
  );
}
