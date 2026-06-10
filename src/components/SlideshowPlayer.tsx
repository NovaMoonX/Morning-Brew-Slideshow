import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch } from '@store/index';
import { nextSlide, prevSlide, togglePlay } from '@store/slideshowSlice';
import type { Slide } from '@lib/models';
import { SlideBody } from '@components/SlideBody';
import { SlideLinkList, filterSectionBodyLinks } from '@components/SlideLinkList';
import { LinkExplorer } from '@components/LinkExplorer';
import { LinkCardsSkipButton } from '@components/LinkCardsSkipButton';
import { MarketsTable, parseMarketsSlide } from '@components/MarketsTable';
import { SectionHeroCountdown } from '@components/SectionHeroCountdown';
import { IssueEndSlide } from '@components/IssueEndSlide';
import { BriefCardsList } from '@components/BriefCardsList';
import { ExtrasHubSlide } from '@components/ExtrasHubSlide';
import {
  getSectionContext,
  resolveSlideImage,
} from '@lib/slideshow/sectionContext';
import { getMainDeckLastIndex } from '@lib/slideshow/deckBounds';
import { linkCardDurationMs } from '@lib/slideshow/timing';
import type { ExtraSectionKey, ExtraSlidesMap } from '@lib/models';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80';

interface SlideshowPlayerProps {
  slide: Slide;
  slides: Slide[];
  currentIndex: number;
  totalSlides: number;
  tocOpen?: boolean;
  onOpenTableOfContents?: () => void;
  extraSlides?: ExtraSlidesMap;
  wordOfDayHtml?: string | null;
  wordOfDay?: string | null;
  onOpenExtra?: (section: ExtraSectionKey) => void;
  onExit?: () => void;
}

function TableOfContentsIconButton({ onClick }: { onClick: (event: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-lg transition hover:bg-surface-elevated hover:text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
      aria-label="Open table of contents"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="size-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75v-.008z"
        />
      </svg>
    </button>
  );
}

function SectionHeader({
  label,
  title,
  inline = false,
}: {
  label: string;
  title: string | null;
  inline?: boolean;
}) {
  const boxClass = inline
    ? 'rounded-xl border border-border bg-surface px-4 py-3 shadow-lg'
    : 'rounded-xl border border-border/60 bg-surface-overlay px-4 py-3 shadow-lg backdrop-blur-md';

  const box = (
    <div className={boxClass}>
      <span className="inline-block text-xs font-bold uppercase tracking-wider text-sky-400">
        {label}
      </span>
      {title && (
        <h2
          className={`mt-1.5 font-bold leading-snug text-foreground ${
            inline
              ? 'text-lg line-clamp-1 md:text-xl'
              : 'text-xl line-clamp-3 md:text-2xl'
          }`}
        >
          {title}
        </h2>
      )}
    </div>
  );

  if (inline) {
    return <div className="shrink-0">{box}</div>;
  }

  return (
    <div className="absolute top-[4.75rem] left-4 right-6 z-10 md:top-20 md:right-24">
      {box}
    </div>
  );
}

function SplitMarketsLayout({ slide }: { slide: Slide }) {
  const { tickers, commentaryHtml } = useMemo(() => parseMarketsSlide(slide), [slide]);
  const commentarySlide = useMemo(
    () => ({ ...slide, body_html: commentaryHtml || null, body: '' }),
    [slide, commentaryHtml],
  );

  return (
    <div className="absolute inset-0 flex w-full flex-col bg-background">
      <div className="shrink-0 px-4 pb-3 pt-20 md:px-10 md:pt-[4.5rem]">
        <SectionHeader label="MARKETS" title={null} inline />
        <div className="mt-2 max-h-[42vh] overflow-y-auto overscroll-contain">
          <MarketsTable tickers={tickers} compact />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-36 pt-1 md:px-10 md:pb-40">
        <div className="mx-auto w-full max-w-xl">
          {commentaryHtml ? (
            <SlideBody slide={commentarySlide} className="text-sm md:text-base" />
          ) : (
            <p className="text-sm text-muted">No market commentary for today.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SplitImageLayout({
  imageUrl,
  topOverlay,
  children,
  bottomPadding = 'pb-36 md:pb-40',
  scrollable = true,
}: {
  imageUrl: string;
  topOverlay?: React.ReactNode;
  children: React.ReactNode;
  bottomPadding?: string;
  scrollable?: boolean;
}) {
  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      <div className="relative h-1/2 w-full shrink-0">
        <img
          src={imageUrl}
          alt=""
          className="block h-full w-full object-cover object-top"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        {topOverlay}
      </div>

      <div
        className={`flex h-1/2 min-h-0 flex-col overflow-hidden bg-gradient-to-b from-background to-background px-6 pt-4 md:px-10 md:pt-6 ${bottomPadding}`}
      >
        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden">
          {scrollable ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-3 pb-4">{children}</div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SlideshowPlayer({
  slide,
  slides,
  currentIndex,
  totalSlides,
  tocOpen = false,
  onOpenTableOfContents,
  extraSlides = {},
  wordOfDayHtml = null,
  wordOfDay = null,
  onOpenExtra,
  onExit,
}: SlideshowPlayerProps) {
  const dispatch = useAppDispatch();
  const percentage = totalSlides > 0 ? ((currentIndex + 1) / totalSlides) * 100 : 0;
  const mainLastIndex = useMemo(() => getMainDeckLastIndex(slides), [slides]);

  const sectionContext = useMemo(
    () => getSectionContext(slides, slide.section_id),
    [slides, slide.section_id],
  );

  const backgroundImage = useMemo(
    () => resolveSlideImage(slide, sectionContext, FALLBACK_IMAGE),
    [slide, sectionContext],
  );

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      dispatch(prevSlide());
    } else if (x > width * 0.7) {
      if (slide.type === 'cover') {
        dispatch(togglePlay(true));
      }
      if (slide.type !== 'extras_hub' && slide.type !== 'end') {
        dispatch(nextSlide({ totalSlides, mainLastIndex }));
      }
    } else {
      dispatch(togglePlay());
    }
  };

  const sectionLabel = slide.section_label || 'DAILY ISSUE';
  const sectionTitle = sectionContext.title;
  const sectionImageUrl = slide.image_url ?? sectionContext.imageUrl;
  const visibleLinkCount = useMemo(
    () => filterSectionBodyLinks(slide.links, sectionTitle).length,
    [slide.links, sectionTitle],
  );
  const isTourHeadlineSlide = useMemo(
    () =>
      Boolean(slide.title) &&
      slide.id.includes('_headline_') &&
      (sectionTitle?.toLowerCase().includes('tour de headlines') ?? false),
    [slide.title, slide.id, sectionTitle],
  );
  const isBlankLinkTail = useMemo(() => {
    if (slide.type !== 'link_cards' || visibleLinkCount > 0) {
      return false;
    }
    return slides.slice(currentIndex).every((s) => {
      if (s.type === 'end') {
        return true;
      }
      if (s.type !== 'link_cards') {
        return false;
      }
      const ctx = getSectionContext(slides, s.section_id);
      return filterSectionBodyLinks(s.links, ctx.title).length === 0;
    });
  }, [slide.type, visibleLinkCount, slides, currentIndex]);
  const usesEndLayout = slide.type === 'end';
  const usesExtrasHubLayout = slide.type === 'extras_hub';
  const usesBriefCardsLayout = slide.type === 'brief_cards';
  const usesSectionLayout =
    Boolean(sectionImageUrl) &&
    (slide.type === 'section_hero' ||
      slide.type === 'body' ||
      slide.type === 'bullet' ||
      (slide.type === 'link_cards' && !isBlankLinkTail));
  const usesIntroSplitLayout = slide.type === 'intro' && Boolean(slide.image_url);
  const usesMarketsLayout = slide.type === 'markets';
  const usesSplitLayout =
    usesSectionLayout ||
    usesIntroSplitLayout ||
    usesMarketsLayout ||
    usesBriefCardsLayout ||
    (slide.type === 'link_cards' && isBlankLinkTail);
  const showSkipButton = slide.type === 'link_cards' && visibleLinkCount > 0 && !isBlankLinkTail;
  const [linkCardsPaused, setLinkCardsPaused] = useState(false);
  const pausedForTocRef = useRef(false);

  useEffect(() => {
    setLinkCardsPaused(false);
    pausedForTocRef.current = false;
  }, [slide.id]);

  useEffect(() => {
    if (slide.type !== 'link_cards') {
      return;
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !tocOpen) {
        setLinkCardsPaused(false);
        pausedForTocRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [slide.id, slide.type, tocOpen]);

  useEffect(() => {
    if (slide.type !== 'link_cards' || tocOpen || !pausedForTocRef.current) {
      return;
    }
    pausedForTocRef.current = false;
    setLinkCardsPaused(false);
  }, [tocOpen, slide.type]);

  const handleLinkRead = () => {
    setLinkCardsPaused(true);
  };

  const handleOpenTableOfContents = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (slide.type === 'link_cards') {
      setLinkCardsPaused(true);
      pausedForTocRef.current = true;
    }
    onOpenTableOfContents?.();
  };

  const renderBodyContent = () => {
    if (slide.type === 'bullet') {
      return (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-xl font-extrabold text-sky-400">•</span>
          <SlideBody slide={slide} className="text-base md:text-lg" />
        </div>
      );
    }

    if (slide.type === 'markets') {
      return null;
    }

    return <SlideBody slide={slide} className="text-base md:text-lg" />;
  };

  return (
    <div
      onClick={handleTap}
      className="relative flex h-full w-full cursor-pointer flex-col bg-background text-foreground select-none"
    >
      {!usesSplitLayout && !usesEndLayout && !usesExtrasHubLayout && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt=""
            className="h-full w-full object-cover blur-2xl opacity-40 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/90" />
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-border/80">
        <div
          className="h-full bg-sky-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {usesIntroSplitLayout && (
        <SplitImageLayout
          imageUrl={slide.image_url!}
          topOverlay={
            <SectionHeader label="Today's Overview" title={slide.title || null} />
          }
        >
          <SlideBody slide={slide} className="text-base md:text-lg" />
        </SplitImageLayout>
      )}

      {usesMarketsLayout && <SplitMarketsLayout slide={slide} />}

      {usesBriefCardsLayout && (
        <div className="absolute inset-0 flex flex-col overflow-hidden bg-background px-4 pb-28 pt-20 md:px-8 md:pb-32 md:pt-[4.5rem]">
          <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col">
            <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-sky-500">
              {sectionLabel}
            </span>
            <h2 className="mt-2 shrink-0 text-xl font-extrabold leading-tight text-foreground md:text-2xl">
              {slide.title}
            </h2>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <BriefCardsList links={slide.links} />
            </div>
            <div className="pointer-events-auto shrink-0 space-y-2 pt-4">
              <p className="text-center text-xs font-semibold tracking-wider text-muted-soft">
                SLIDE {currentIndex + 1} OF {totalSlides}
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch(nextSlide({ totalSlides, mainLastIndex }));
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-600 px-8 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-sky-500"
              >
                Next step
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {usesSectionLayout && (
        <SplitImageLayout
          imageUrl={sectionImageUrl!}
          topOverlay={
            slide.type === 'section_hero' ? undefined : (
              <SectionHeader label={sectionLabel} title={sectionTitle} />
            )
          }
          bottomPadding={showSkipButton ? 'pb-20 md:pb-24' : 'pb-36 md:pb-40'}
          scrollable={slide.type !== 'link_cards'}
        >
          {slide.type === 'section_hero' && (
            <SectionHeroCountdown
              slideId={slide.id}
              sectionLabel={sectionLabel}
              sectionTitle={sectionTitle}
              totalSlides={totalSlides}
              mainLastIndex={mainLastIndex}
            />
          )}

          {(slide.type === 'body' || slide.type === 'bullet') && (
            <>
              {isTourHeadlineSlide ? (
                <>
                  <h3 className="text-lg font-bold leading-snug text-foreground md:text-xl">
                    {slide.title}
                  </h3>
                  <div className="mt-3">
                    <SlideBody slide={slide} className="text-base md:text-lg" />
                  </div>
                  {slide.links.length > 0 && (
                    <SlideLinkList links={slide.links} sectionTitle={sectionTitle} />
                  )}
                </>
              ) : (
                <>
                  {slide.title && (
                    <h3 className="text-base font-bold leading-tight text-foreground md:text-lg">
                      {slide.title}
                    </h3>
                  )}
                  {renderBodyContent()}
                  {slide.links.length > 0 && (
                    <SlideLinkList links={slide.links} sectionTitle={sectionTitle} />
                  )}
                </>
              )}
            </>
          )}

          {slide.type === 'link_cards' && !isBlankLinkTail && (
            <LinkExplorer
              links={slide.links}
              embedded
              showSkip={false}
              sectionTitle={sectionTitle}
              sectionImageUrl={sectionImageUrl}
              onReadClick={handleLinkRead}
            />
          )}

          {slide.type === 'link_cards' && isBlankLinkTail && (
            <IssueEndSlide
              compact
              title={currentIndex === totalSlides - 1 ? "That's a wrap" : 'End of the issue'}
              body={
                currentIndex === totalSlides - 1
                  ? "You've finished today's Morning Brew. See you tomorrow."
                  : "You've reached the end of today's stories. Tap right to continue."
              }
            />
          )}
        </SplitImageLayout>
      )}

      {usesExtrasHubLayout && (
        <ExtrasHubSlide
          wordHtml={wordOfDayHtml ?? slide.body_html ?? null}
          wordText={
            !wordOfDayHtml && !slide.body_html
              ? (wordOfDay ?? slide.body ?? null)
              : null
          }
          wordLabel={wordOfDay}
          extraSlides={extraSlides}
          onOpenExtra={(section) => onOpenExtra?.(section)}
          onExit={() => onExit?.()}
        />
      )}

      {usesEndLayout && (
        <div className="absolute inset-0 z-10 flex flex-col bg-background">
          <div className="relative h-1/3 w-full shrink-0">
            <img
              src={backgroundImage}
              alt=""
              className="block h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <IssueEndSlide title={slide.title} body={slide.body} />
          </div>
        </div>
      )}

      {!usesSplitLayout && !usesEndLayout && !usesExtrasHubLayout && (
        <div className="relative z-10 flex h-full w-full flex-col px-6 pt-16 pb-28 md:px-8">
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">
            {slide.type === 'cover' && (
              <div className="mx-auto max-w-lg space-y-6 text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-sky-500">
                  morning brew daily
                </span>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
                  {slide.title}
                </h1>
                <div className="mx-auto h-0.5 w-12 bg-sky-500" />
                <p className="text-sm font-medium text-muted">
                  Tap right to begin • Tap center to pause audio
                </p>
                {onOpenTableOfContents && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenTableOfContents(event);
                    }}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-glass px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground shadow-lg transition hover:border-border hover:bg-surface-elevated"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75v-.008z"
                      />
                    </svg>
                    Table of Contents
                  </button>
                )}
              </div>
            )}

            {slide.type === 'intro' && !slide.image_url && (
              <div className="mx-auto max-w-xl space-y-6 text-center">
                <h2 className="text-xl font-semibold uppercase tracking-wider text-muted">
                  Today&apos;s Overview
                </h2>
                <SlideBody slide={slide} className="text-lg md:text-2xl font-light" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-[4.75rem] left-0 right-0 z-20 flex flex-col items-center gap-2">
        {slide.type !== 'brief_cards' && (
          <div className="text-xs font-semibold tracking-wider text-muted-soft">
            SLIDE {currentIndex + 1} OF {totalSlides}
          </div>
        )}
        {showSkipButton && (
          <div className="pointer-events-auto flex items-center gap-2">
            {onOpenTableOfContents && (
              <TableOfContentsIconButton onClick={handleOpenTableOfContents} />
            )}
            <LinkCardsSkipButton
              slideId={slide.id}
              totalSlides={totalSlides}
              mainLastIndex={mainLastIndex}
              linkCount={visibleLinkCount}
              durationMs={linkCardDurationMs(visibleLinkCount)}
              paused={linkCardsPaused}
            />
          </div>
        )}
      </div>
    </div>
  );
}
