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
      className="pointer-events-none fixed top-4 left-1/2 z-50 flex h-10 -translate-x-1/2 items-center justify-center"
      aria-live="polite"
      aria-label={`${secondsLeft} seconds remaining`}
    >
      <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-sky-600 px-3 text-base font-extrabold tabular-nums leading-none text-white shadow-lg shadow-sky-600/30">
        {secondsLeft}
      </span>
    </div>
  );
}

export default SlideTimeRemaining;
