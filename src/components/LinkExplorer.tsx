import { useAppDispatch } from '@store/index';
import { nextSlide } from '@store/slideshowSlice';
import type { LinkRef } from '@lib/models';
import { getLinkDisplayDomain } from '@lib/links/domain';
import {
  getLinkDisplayDescription,
  getLinkDisplayImage,
  getLinkDisplayTitle,
} from '@lib/links/display';
import { filterSectionBodyLinks } from '@components/SlideLinkList';

interface LinkExplorerProps {
  links: LinkRef[];
  embedded?: boolean;
  showSkip?: boolean;
  totalSlides?: number;
  sectionTitle?: string | null;
  sectionImageUrl?: string | null;
  onReadClick?: () => void;
}

export function LinkExplorer({
  links,
  embedded = false,
  showSkip = true,
  totalSlides = 999,
  sectionTitle = null,
  sectionImageUrl = null,
  onReadClick,
}: LinkExplorerProps) {
  const dispatch = useAppDispatch();
  const visibleLinks = filterSectionBodyLinks(links, sectionTitle);

  const handleSkip = (event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(nextSlide(totalSlides));
  };

  const containerClass = embedded
    ? 'flex shrink-0 flex-col overflow-hidden'
    : 'absolute bottom-16 left-0 right-0 z-30 flex flex-col p-4 w-full select-none';

  if (visibleLinks.length === 0) {
    if (!showSkip) {
      return null;
    }

    return (
      <div
        className={embedded ? 'flex flex-col items-center py-4' : containerClass}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={handleSkip}
          className="rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-muted transition hover:text-foreground shadow-lg"
        >
          Skip Section
        </button>
      </div>
    );
  }

  return (
    <div className={containerClass} onClick={(event) => event.stopPropagation()}>
      {embedded && (
        <div className="mb-2 shrink-0 text-center">
          <h2 className="text-sm font-bold md:text-base">Want to know more?</h2>
          <p className="mt-0.5 text-[10px] text-muted md:text-xs">
            Related articles from this story.
          </p>
        </div>
      )}

      <div
        className={`flex w-full gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory ${
          embedded ? 'shrink-0 items-stretch pb-0 scroll-pl-0' : 'items-stretch pb-4 px-4'
        }`}
      >
        {visibleLinks.map((link, index) => {
          const domain = getLinkDisplayDomain(link);
          const title = getLinkDisplayTitle(link);
          const description = getLinkDisplayDescription(link);
          const imageUrl = getLinkDisplayImage(link, sectionImageUrl);

          return (
            <div
              key={`${link.url}-${index}`}
              className={`flex shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-surface-glass text-foreground shadow-xl backdrop-blur-md ${
                embedded
                  ? 'w-[calc(100%-1.25rem)] max-w-md'
                  : 'w-[calc(100%-2rem)] max-w-md snap-center'
              }`}
            >
              <div className={`relative w-full shrink-0 bg-surface-muted ${embedded ? 'h-24' : 'h-24 md:h-28'}`}>
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute top-1.5 left-1.5 rounded-md bg-background/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                  {domain}
                </span>
              </div>

              <div
                className={
                  embedded
                    ? 'flex min-h-0 flex-1 flex-col p-2.5'
                    : 'flex min-h-0 flex-1 flex-col p-3 md:p-4'
                }
              >
                <h3
                  className={`shrink-0 font-bold leading-snug line-clamp-2 ${
                    embedded ? 'text-xs' : 'text-sm'
                  }`}
                >
                  {title}
                </h3>
                <p
                  className={`mt-0.5 min-h-0 flex-1 line-clamp-2 leading-snug text-muted ${
                    embedded ? 'text-[11px]' : 'text-xs leading-relaxed'
                  }`}
                >
                  {description}
                </p>

                <div className={`shrink-0 ${embedded ? 'mt-2' : 'mt-3'}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      event.stopPropagation();
                      onReadClick?.();
                    }}
                    className={`flex w-full items-center justify-center gap-1 rounded-lg bg-sky-600 font-semibold text-white transition hover:bg-sky-500 ${
                      embedded ? 'py-1.5 text-[10px]' : 'py-2 text-xs'
                    }`}
                  >
                    <span>Read</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showSkip && (
        <div className={`flex shrink-0 justify-center ${embedded ? 'mt-3' : 'mt-2'}`}>
          <button
            onClick={handleSkip}
            className="rounded-full border border-border bg-surface-glass px-8 py-2.5 text-xs font-bold uppercase tracking-wider text-muted shadow-lg backdrop-blur-md transition hover:text-foreground"
          >
            Skip to Next Story
          </button>
        </div>
      )}
    </div>
  );
}

export default LinkExplorer;
