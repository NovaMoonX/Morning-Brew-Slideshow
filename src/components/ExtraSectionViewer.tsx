import { useCallback, useEffect, useState } from 'react';
import type { Slide } from '@lib/models';
import { SlideBody } from '@components/SlideBody';

interface ExtraSectionViewerProps {
  slides: Slide[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  onPrev: () => void;
}

function normalizeInlineHtml(html: string): string {
  return html
    .replace(/(<\/(?:a|strong|b|em|i|span)>)(?=\w)/g, '$1 ')
    .replace(/(\w)(<(?:a|strong|b|em|i|span)\b)/g, '$1 $2')
    .replace(/(<\/(?:a|strong|b|em|i|span)>)(<span>)([A-Za-z])/g, '$1$2 $3')
    .replace(/(<\/span><span>)([A-Za-z])/g, '$1 $2')
    .replace(/(<\/strong>)([A-Za-z])/g, '$1 $2')
    .replace(/(<\/a>)([A-Za-z])/g, '$1 $2')
    .replace(/:(?=[A-Za-z])/g, ': ');
}

export function ExtraSectionViewer({
  slides,
  currentIndex,
  onBack,
  onNext,
  onPrev,
}: ExtraSectionViewerProps) {
  const slide = slides[currentIndex];
  const total = slides.length;
  const hasHiddenAnswer = Boolean(slide?.answer_body_html || slide?.answer_body);
  const [answerRevealed, setAnswerRevealed] = useState(false);

  useEffect(() => {
    setAnswerRevealed(false);
  }, [slide?.id, currentIndex]);

  const handleTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const width = rect.width;

      if (x < width * 0.3) {
        onPrev();
      } else if (x > width * 0.7) {
        onNext();
      }
    },
    [onNext, onPrev],
  );

  if (!slide) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-background text-foreground select-none"
      onClick={handleTap}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBack();
        }}
        className="absolute top-4 left-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-md transition hover:bg-surface-elevated"
      >
        <span aria-hidden>←</span>
        Back
      </button>

      {slide.image_url && (
        <div className="relative h-[28%] w-full shrink-0">
          <img src={slide.image_url} alt="" className="h-full w-full object-cover object-center" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-8 md:px-6 ${
          slide.image_url ? 'pt-3' : 'pt-16'
        }`}
      >
        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col">
          <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-sky-500">
            {slide.section_label}
          </span>
          {slide.title && slide.title !== slide.section_label && (
            <h2 className="mt-1 shrink-0 text-lg font-bold leading-tight text-foreground md:text-xl">
              {slide.title}
            </h2>
          )}
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <SlideBody slide={slide} className="text-sm leading-snug md:text-[0.9375rem]" />

            {hasHiddenAnswer && answerRevealed && (
              <div className="mt-6 rounded-xl border border-sky-300 bg-sky-50 px-4 py-4 dark:border-sky-800 dark:bg-sky-950/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Answer
                </p>
                {slide.answer_body_html ? (
                  <div
                    className="slide-body-html mt-2 text-sm leading-relaxed text-foreground [&_a]:border-b-2 [&_a]:border-sky-400 [&_a]:text-inherit [&_a]:no-underline"
                    dangerouslySetInnerHTML={{
                      __html: normalizeInlineHtml(slide.answer_body_html),
                    }}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('a')) {
                        event.stopPropagation();
                      }
                    }}
                  />
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{slide.answer_body}</p>
                )}
              </div>
            )}
          </div>

          {hasHiddenAnswer && !answerRevealed && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setAnswerRevealed(true);
              }}
              className="pointer-events-auto mt-4 w-full shrink-0 rounded-full border border-sky-400 bg-surface px-6 py-3 text-sm font-semibold text-sky-600 transition hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
            >
              Reveal answer
            </button>
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-xs font-semibold tracking-wider text-muted-soft">
          {currentIndex + 1} / {total}
        </div>
      )}
    </div>
  );
}

export default ExtraSectionViewer;
