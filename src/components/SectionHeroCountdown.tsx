import { useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@store/index';
import { nextSlide } from '@store/slideshowSlice';
import { SECTION_HERO_DURATION_MS } from '@lib/slideshow/timing';

interface SectionHeroCountdownProps {
  slideId: string;
  sectionLabel: string;
  sectionTitle?: string | null;
  totalSlides: number;
  durationMs?: number;
}

export function SectionHeroCountdown({
  slideId,
  sectionLabel,
  sectionTitle,
  totalSlides,
  durationMs = SECTION_HERO_DURATION_MS,
}: SectionHeroCountdownProps) {
  const dispatch = useAppDispatch();
  const totalSeconds = Math.max(1, Math.ceil(durationMs / 1000));
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const advancedRef = useRef(false);

  useEffect(() => {
    advancedRef.current = false;
    setSecondsLeft(totalSeconds);
    const startedAt = Date.now();

    const tickTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remainingMs = Math.max(0, durationMs - elapsed);
      const displaySeconds = remainingMs === 0 ? 0 : Math.ceil(remainingMs / 1000);
      setSecondsLeft(displaySeconds);
    }, 50);

    const advanceTimer = window.setTimeout(() => {
      if (advancedRef.current) {
        return;
      }
      advancedRef.current = true;
      setSecondsLeft(0);
      dispatch(nextSlide(totalSlides));
    }, durationMs);

    return () => {
      window.clearInterval(tickTimer);
      window.clearTimeout(advanceTimer);
    };
  }, [slideId, durationMs, totalSeconds, dispatch, totalSlides]);

  return (
    <div className="flex min-h-[14rem] flex-col items-center justify-center px-4 py-4 text-center">
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
        {sectionLabel}
      </span>
      {sectionTitle && (
        <h2 className="mt-3 max-w-md text-2xl font-extrabold leading-tight text-white md:text-3xl">
          {sectionTitle}
        </h2>
      )}
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Story starts in
      </p>
      <p className="mt-3 text-7xl font-extrabold tabular-nums leading-none text-sky-400 md:text-8xl">
        {secondsLeft}
      </p>
    </div>
  );
}
