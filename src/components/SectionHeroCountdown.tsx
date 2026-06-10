import { useEffect, useState } from 'react';
import { SECTION_HERO_DURATION_MS } from '@lib/slideshow/timing';

interface SectionHeroCountdownProps {
  slideId: string;
  sectionTitle?: string | null;
  durationMs?: number;
}

export function SectionHeroCountdown({
  slideId,
  sectionTitle,
  durationMs = SECTION_HERO_DURATION_MS,
}: SectionHeroCountdownProps) {
  const totalSeconds = Math.max(1, Math.ceil(durationMs / 1000));
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setSecondsLeft(remaining);
    }, 100);

    return () => window.clearInterval(timer);
  }, [slideId, durationMs, totalSeconds]);

  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center py-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Story starting soon
      </p>
      <p className="mt-4 text-6xl font-extrabold tabular-nums leading-none text-sky-400 md:text-7xl">
        {secondsLeft}
      </p>
      {sectionTitle && (
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300 line-clamp-2">
          {sectionTitle}
        </p>
      )}
    </div>
  );
}
