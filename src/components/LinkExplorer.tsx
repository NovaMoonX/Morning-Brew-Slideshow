import { useAppDispatch } from '@store/index';
import { nextSlide } from '@store/slideshowSlice';
import type { LinkRef } from '@lib/models';
import { getLinkDisplayDomain } from '@lib/links/domain';
import { filterSectionBodyLinks } from '@components/SlideLinkList';

interface LinkExplorerProps {
  links: LinkRef[];
  embedded?: boolean;
  showSkip?: boolean;
  totalSlides?: number;
  sectionTitle?: string | null;
}

export function LinkExplorer({
  links,
  embedded = false,
  showSkip = true,
  totalSlides = 999,
  sectionTitle = null,
}: LinkExplorerProps) {
  const dispatch = useAppDispatch();
  const visibleLinks = filterSectionBodyLinks(links, sectionTitle);

  const handleSkip = (event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(nextSlide(totalSlides));
  };

  const containerClass = embedded
    ? 'flex shrink-0 flex-col'
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
          className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-slate-300 transition hover:text-white border border-slate-800 shadow-lg"
        >
          Skip Section
        </button>
      </div>
    );
  }

  return (
    <div className={containerClass} onClick={(event) => event.stopPropagation()}>
      {embedded && (
        <div className="mb-3 shrink-0 text-center">
          <h2 className="text-base font-bold md:text-lg">Want to know more?</h2>
          <p className="mt-1 text-xs text-slate-400">Related articles from this story.</p>
        </div>
      )}

      <div
        className={`flex gap-3 overflow-x-auto scrollbar-hide snap-x w-full ${
          embedded ? 'shrink-0 pb-1' : 'pb-4 px-4'
        }`}
      >
        {visibleLinks.map((link, index) => {
          const domain = getLinkDisplayDomain(link);
          const ogTitle = link.og_title || link.anchor_text || 'Related article';
          const ogDesc =
            link.og_description || 'Tap read article to explore the full story in Morning Brew.';
          const ogImg =
            link.og_image ||
            'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&auto=format&fit=crop&q=80';

          return (
            <div
              key={`${link.url}-${index}`}
              className="flex w-56 shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 text-white shadow-xl backdrop-blur-md md:w-64"
            >
              <div className="relative h-20 w-full bg-slate-950 md:h-24">
                <img src={ogImg} alt="" className="h-full w-full object-cover" />
                <span className="absolute top-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {domain}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-3 md:p-4">
                <h3 className="text-sm font-bold leading-snug line-clamp-2">{ogTitle}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{ogDesc}</p>

                <div className="mt-3">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
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
            className="rounded-full border border-slate-800 bg-slate-900/90 px-8 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 shadow-lg backdrop-blur-md transition hover:text-white"
          >
            Skip to Next Story
          </button>
        </div>
      )}
    </div>
  );
}

export default LinkExplorer;
