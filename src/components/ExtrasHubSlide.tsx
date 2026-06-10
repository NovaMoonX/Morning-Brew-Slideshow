import type { ExtraSlidesMap } from '@lib/models';

interface ExtrasHubSlideProps {
  wordHtml: string | null;
  wordText: string | null;
  wordLabel: string | null;
  extraSlides: ExtraSlidesMap;
  onOpenExtra: (section: 'recs' | 'play') => void;
  onExit: () => void;
}

export function ExtrasHubSlide({
  wordHtml,
  wordText,
  wordLabel,
  extraSlides,
  onOpenExtra,
  onExit,
}: ExtrasHubSlideProps) {
  const hasRecs = (extraSlides.recs?.length ?? 0) > 0;
  const hasPlay = (extraSlides.play?.length ?? 0) > 0;

  return (
    <div
      className="relative z-10 flex h-full flex-col px-6 pb-28 pt-16 md:px-8"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center">
        <span className="text-xs font-bold uppercase tracking-widest text-sky-500">Fin</span>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight text-foreground md:text-3xl">
          That&apos;s the news
        </h1>
        <p className="mt-2 text-sm text-muted">You&apos;re all caught up on today&apos;s edition.</p>

        {(wordHtml || wordText || wordLabel) && (
          <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
              Word of the Day
            </p>
            {wordLabel && (
              <p className="mt-2 text-xl font-extrabold capitalize text-foreground">{wordLabel}</p>
            )}
            {wordHtml ? (
              <div
                className="slide-body-html mt-2 text-sm leading-relaxed text-muted [&_a]:border-b-2 [&_a]:border-sky-400 [&_a]:text-inherit [&_a]:no-underline [&_span]:underline"
                dangerouslySetInnerHTML={{ __html: wordHtml }}
              />
            ) : wordText ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">{wordText}</p>
            ) : null}
          </div>
        )}

        {(hasRecs || hasPlay) && (
          <div className="mt-6 space-y-2">
            {hasRecs && (
              <button
                type="button"
                onClick={() => onOpenExtra('recs')}
                className="pointer-events-auto flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-left font-semibold text-foreground shadow-sm transition hover:border-sky-400 hover:bg-surface-elevated"
              >
                <span>View Recs</span>
                <span className="text-sky-500" aria-hidden>
                  →
                </span>
              </button>
            )}
            {hasPlay && (
              <button
                type="button"
                onClick={() => onOpenExtra('play')}
                className="pointer-events-auto flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-left font-semibold text-foreground shadow-sm transition hover:border-sky-400 hover:bg-surface-elevated"
              >
                <span>View Play</span>
                <span className="text-sky-500" aria-hidden>
                  →
                </span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto mt-8 w-full rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          Exit
        </button>
      </div>
    </div>
  );
}

export default ExtrasHubSlide;
