import { useMemo } from 'react';
import { useAppDispatch } from '@store/index';
import { goToSlide } from '@store/slideshowSlice';
import type { Slide } from '@lib/models';
import { buildTableOfContents } from '@lib/slideshow/tableOfContents';

interface IssueTableOfContentsProps {
  slides: Slide[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function IssueTableOfContents({
  slides,
  currentIndex,
  isOpen,
  onClose,
}: IssueTableOfContentsProps) {
  const dispatch = useAppDispatch();
  const entries = useMemo(() => buildTableOfContents(slides), [slides]);

  if (!isOpen) {
    return null;
  }

  const handleSelect = (slideIndex: number) => {
    dispatch(goToSlide(slideIndex));
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Table of Contents</h2>
          <p className="mt-0.5 text-xs text-muted">Jump to any section in today&apos;s issue</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-surface p-2.5 text-muted transition hover:bg-surface-elevated hover:text-foreground"
          aria-label="Close table of contents"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <ol className="space-y-2">
          {entries.map((entry) => {
            const isActive = entry.slideIndex === currentIndex;

            return (
              <li key={`${entry.slideIndex}-${entry.title}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(entry.slideIndex)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    entry.indent > 0 ? 'ml-4' : ''
                  } ${
                    isActive
                      ? 'border-sky-500/60 bg-sky-500/10 dark:bg-sky-950/40'
                      : 'border-border bg-surface/70 hover:border-border-strong hover:bg-surface'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 dark:text-sky-400">
                    {entry.label}
                  </span>
                  <p
                    className={`mt-1 leading-snug text-foreground ${
                      entry.indent > 0 ? 'text-sm font-medium' : 'text-base font-bold'
                    }`}
                  >
                    {entry.title}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export default IssueTableOfContents;
