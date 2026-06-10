interface SlideTimeRemainingProps {
  secondsLeft: number | null;
  visible: boolean;
}

export function SlideTimeRemaining({ secondsLeft, visible }: SlideTimeRemainingProps) {
  if (!visible || secondsLeft === null) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2"
      aria-live="polite"
      aria-label={`${secondsLeft} seconds remaining`}
    >
      <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-border bg-surface-glass px-3 py-1.5 text-sm font-bold tabular-nums text-sky-500 shadow-md backdrop-blur-md">
        {secondsLeft}
      </span>
    </div>
  );
}

export default SlideTimeRemaining;
