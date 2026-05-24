import { useAppDispatch } from '@store/index';
import { nextSlide } from '@store/slideshowSlice';
import type { LinkRef } from '@lib/models';

interface LinkExplorerProps {
  links: LinkRef[];
}

export function LinkExplorer({ links }: LinkExplorerProps) {
  const dispatch = useAppDispatch();

  const handleSkip = () => {
    dispatch(nextSlide(999)); // Safe mock advance, nextSlide handles index checking
  };

  const getDomainName = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch {
      return 'external link';
    }
  };

  if (!links || links.length === 0) {
    return (
      <div className="absolute bottom-28 left-0 right-0 z-30 flex flex-col items-center justify-center p-4">
        <button
          onClick={handleSkip}
          className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-slate-300 hover:text-white transition shadow-lg border border-slate-800"
        >
          Skip Section
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-16 left-0 right-0 z-30 flex flex-col p-4 w-full select-none">
      
      {/* Enriched Cards Row */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x px-4 w-full">
        {links.map((link, index) => {
          const domain = getDomainName(link.url);
          const ogTitle = link.og_title || link.anchor_text || 'Enriched Story Article';
          const ogDesc = link.og_description || 'Tap read article to explore the full story in Morning Brew.';
          const ogImg = link.og_image || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&auto=format&fit=crop&q=80';

          return (
            <div
              key={index}
              className="flex w-72 shrink-0 snap-center flex-col rounded-2xl border border-slate-800/80 bg-slate-900/90 text-white shadow-xl backdrop-blur-md overflow-hidden"
            >
              {/* Thumbnail Image */}
              <div className="h-28 w-full bg-slate-950 relative">
                <img
                  src={ogImg}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {domain}
                </span>
              </div>

              {/* Body Content */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-bold leading-snug line-clamp-2">{ogTitle}</h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">{ogDesc}</p>

                {/* Card Actions Row */}
                <div className="mt-3 flex gap-2">
                  {/* Read Article in Browser */}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition"
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

                  {/* Summary Text audio if available */}
                  {link.gemini_summary && (
                    <button
                      onClick={() => {
                        // Quick Web Speech read of summary
                        if (typeof window !== 'undefined' && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                          const utterance = new SpeechSynthesisUtterance(link.gemini_summary || '');
                          utterance.rate = 1.05;
                          utterance.lang = 'en-US';
                          window.speechSynthesis.speak(utterance);
                        }
                      }}
                      className="flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
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
                          d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                        />
                      </svg>
                      <span>Hear Summary</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prominent Bottom Skip Button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={handleSkip}
          className="rounded-full bg-slate-900/90 px-8 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition shadow-lg border border-slate-800 backdrop-blur-md"
        >
          Skip to Next Story
        </button>
      </div>
    </div>
  );
}

export default LinkExplorer;
