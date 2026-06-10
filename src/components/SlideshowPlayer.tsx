import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch } from '@store/index';
import { nextSlide, prevSlide, togglePlay } from '@store/slideshowSlice';
import type { Slide } from '@lib/models';
import { SlideBody } from '@components/SlideBody';
import { SlideLinkList, filterSectionBodyLinks } from '@components/SlideLinkList';
import { LinkExplorer } from '@components/LinkExplorer';
import { LinkCardsSkipButton } from '@components/LinkCardsSkipButton';
import { MarketsTable, parseMarketsSlide } from '@components/MarketsTable';
import { SectionHeroCountdown } from '@components/SectionHeroCountdown';
import {
  getSectionContext,
  resolveSlideImage,
} from '@lib/slideshow/sectionContext';
import { linkCardDurationMs } from '@lib/slideshow/timing';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80';

interface SlideshowPlayerProps {
  slide: Slide;
  slides: Slide[];
  currentIndex: number;
  totalSlides: number;
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
    ? 'rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 shadow-lg'
    : 'rounded-xl border border-white/10 bg-slate-950/75 px-4 py-3 shadow-lg backdrop-blur-md';

  const box = (
    <div className={boxClass}>
      <span className="inline-block text-xs font-bold uppercase tracking-wider text-sky-400">
        {label}
      </span>
      {title && (
        <h2
          className={`mt-1.5 font-bold leading-snug text-white ${
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
    <div className="absolute top-14 left-6 right-20 z-10 md:top-16 md:left-10 md:right-24">
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
    <div className="absolute inset-0 grid w-full grid-cols-1 grid-rows-[minmax(0,54%)_minmax(0,46%)] gap-y-4 bg-slate-950">
      <div className="flex min-h-0 w-full flex-col gap-2 overflow-hidden px-6 pt-14 pb-0 md:px-10 md:pt-16">
        <SectionHeader label="MARKETS" title={null} inline />
        <div className="flex w-full min-h-0 flex-1 items-stretch">
          <MarketsTable tickers={tickers} />
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-col overflow-y-auto px-6 pb-36 pt-2 md:px-10 md:pb-40">
        <div className="mx-auto w-full max-w-xl">
          {commentaryHtml ? (
            <SlideBody slide={commentarySlide} className="text-sm md:text-base" />
          ) : (
            <p className="text-sm text-slate-400">No market commentary for today.</p>
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
    <div className="absolute inset-0 flex flex-col bg-slate-950">
      <div className="relative h-1/2 w-full shrink-0">
        <img
          src={imageUrl}
          alt=""
          className="block h-full w-full object-cover object-top"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
        {topOverlay}
      </div>

      <div
        className={`flex h-1/2 min-h-0 flex-col overflow-hidden bg-gradient-to-b from-slate-950 to-slate-950 px-6 pt-4 md:px-10 md:pt-6 ${bottomPadding}`}
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
}: SlideshowPlayerProps) {
  const dispatch = useAppDispatch();
  const percentage = totalSlides > 0 ? ((currentIndex + 1) / totalSlides) * 100 : 0;

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
      dispatch(nextSlide(totalSlides));
    } else {
      dispatch(togglePlay());
    }
  };

  const sectionLabel = slide.section_label || 'DAILY ISSUE';
  const sectionTitle = sectionContext.title;
  const sectionImageUrl = sectionContext.imageUrl ?? slide.image_url;
  const visibleLinkCount = useMemo(
    () => filterSectionBodyLinks(slide.links, sectionTitle).length,
    [slide.links, sectionTitle],
  );
  const usesSectionLayout =
    Boolean(sectionImageUrl) &&
    (slide.type === 'section_hero' ||
      slide.type === 'body' ||
      slide.type === 'bullet' ||
      slide.type === 'link_cards');
  const usesIntroSplitLayout = slide.type === 'intro' && Boolean(slide.image_url);
  const usesMarketsLayout = slide.type === 'markets';
  const usesSplitLayout = usesSectionLayout || usesIntroSplitLayout || usesMarketsLayout;
  const showSkipButton = slide.type === 'link_cards';
  const [linkCardsPaused, setLinkCardsPaused] = useState(false);

  useEffect(() => {
    setLinkCardsPaused(false);
  }, [slide.id]);

  useEffect(() => {
    if (slide.type !== 'link_cards') {
      return;
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setLinkCardsPaused(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [slide.id, slide.type]);

  const handleLinkRead = () => {
    setLinkCardsPaused(true);
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
      className="relative flex h-full w-full cursor-pointer flex-col bg-slate-950 text-white select-none"
    >
      {!usesSplitLayout && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt=""
            className="h-full w-full object-cover blur-2xl opacity-40 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/90" />
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-slate-800/80">
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
            />
          )}

          {(slide.type === 'body' || slide.type === 'bullet') && (
            <>
              {slide.title && (
                <h3 className="text-base font-bold leading-tight text-white md:text-lg">
                  {slide.title}
                </h3>
              )}
              {renderBodyContent()}
              {slide.links.length > 0 && (
                <SlideLinkList links={slide.links} sectionTitle={sectionTitle} />
              )}
            </>
          )}

          {slide.type === 'link_cards' && (
            <LinkExplorer
              links={slide.links}
              embedded
              showSkip={false}
              sectionTitle={sectionTitle}
              sectionImageUrl={sectionImageUrl}
              onReadClick={handleLinkRead}
            />
          )}
        </SplitImageLayout>
      )}

      {!usesSplitLayout && (
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
                <p className="text-sm font-medium text-slate-400">
                  Tap right to begin • Tap center to pause audio
                </p>
              </div>
            )}

            {slide.type === 'intro' && !slide.image_url && (
              <div className="mx-auto max-w-xl space-y-6 text-center">
                <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-400">
                  Today&apos;s Overview
                </h2>
                <SlideBody slide={slide} className="text-lg md:text-2xl font-light" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-[4.75rem] left-0 right-0 z-20 flex flex-col items-center gap-2">
        <div className="text-xs font-semibold tracking-wider text-slate-500">
          SLIDE {currentIndex + 1} OF {totalSlides}
        </div>
        {showSkipButton && (
          <LinkCardsSkipButton
            slideId={slide.id}
            totalSlides={totalSlides}
            linkCount={visibleLinkCount}
            durationMs={linkCardDurationMs(visibleLinkCount)}
            paused={linkCardsPaused}
          />
        )}
      </div>
    </div>
  );
}
