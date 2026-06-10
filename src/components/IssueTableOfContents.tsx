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
    <div className="absolute inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-white">Table of Contents</h2>
          <p className="mt-0.5 text-xs text-slate-400">Jump to any section in today&apos;s issue</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-900 p-2.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
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
                      ? 'border-sky-500/60 bg-sky-950/40'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    {entry.label}
                  </span>
                  <p
                    className={`mt-1 leading-snug text-white ${
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
