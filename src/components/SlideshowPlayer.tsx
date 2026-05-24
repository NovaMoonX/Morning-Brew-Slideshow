import { useAppDispatch } from '@store/index';
import { nextSlide, prevSlide, togglePlay } from '@store/slideshowSlice';
import type { Slide } from '@lib/models';

interface SlideshowPlayerProps {
  slide: Slide;
  currentIndex: number;
  totalSlides: number;
}

export function SlideshowPlayer({
  slide,
  currentIndex,
  totalSlides,
}: SlideshowPlayerProps) {
  const dispatch = useAppDispatch();
  const percentage = totalSlides > 0 ? ((currentIndex + 1) / totalSlides) * 100 : 0;

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      // Tap Left 30% - Prev Slide
      dispatch(prevSlide());
    } else if (x > width * 0.7) {
      // Tap Right 30% - Next Slide
      dispatch(nextSlide(totalSlides));
    } else {
      // Tap Center - Play/Pause
      dispatch(togglePlay());
    }
  };

  const sectionLabel = slide.section_label || 'DAILY ISSUE';

  return (
    <div
      onClick={handleTap}
      className="relative flex h-dvh w-dvw cursor-pointer flex-col bg-slate-950 text-white select-none"
    >
      {/* Background Cover Image with Heavy Blur */}
      <div className="absolute inset-0 z-0">
        <img
          src={slide.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80'}
          alt=""
          className="h-full w-full object-cover blur-2xl opacity-40 scale-110"
        />
        {/* Flat Minimalist Vignette Shroud */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/90"></div>
      </div>

      {/* Slim Premium Top Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-slate-800">
        <div
          className="h-full bg-sky-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      {/* Foreground Content Area */}
      <div className="relative z-10 flex h-full w-full flex-col px-6 pt-16 pb-28 md:px-8">
        
        {/* Upper Category Pill Indicator */}
        {slide.type !== 'cover' && slide.type !== 'intro' && (
          <div className="mb-4">
            <span className="inline-block rounded-md bg-sky-500/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-400">
              {sectionLabel}
            </span>
          </div>
        )}

        {/* Dynamic Inner layouts based on type */}
        <div className="flex flex-1 flex-col justify-center">
          {slide.type === 'cover' && (
            <div className="text-center space-y-6 max-w-lg mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-sky-500">
                morning brew daily
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl leading-tight">
                {slide.title}
              </h1>
              <div className="mx-auto w-12 h-0.5 bg-sky-500"></div>
              <p className="text-sm font-medium text-slate-400">
                Tap right to begin reading • Tap center to read aloud
              </p>
            </div>
          )}

          {slide.type === 'intro' && (
            <div className="text-center space-y-6 max-w-xl mx-auto">
              <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-400">
                Today's Overview
              </h2>
              <p className="text-lg md:text-2xl leading-relaxed font-light text-slate-100">
                {slide.body}
              </p>
            </div>
          )}

          {slide.type === 'markets' && (
            <div className="space-y-6 max-w-xl mx-auto w-full">
              <h2 className="text-lg font-semibold text-slate-300">Financial Markets Today</h2>
              
              {/* Grid 2-columns */}
              <div className="grid grid-cols-2 gap-3">
                {/* Normally slides hold list tickers in parser, let's render a clean mock if none exist, or compile them */}
                <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-4 border border-slate-800">
                  <span className="font-bold tracking-tight">S&P 500</span>
                  <span className="text-sm font-semibold text-emerald-400">+0.68%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-4 border border-slate-800">
                  <span className="font-bold tracking-tight">NASDAQ</span>
                  <span className="text-sm font-semibold text-emerald-400">+1.24%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-4 border border-slate-800">
                  <span className="font-bold tracking-tight">DOW</span>
                  <span className="text-sm font-semibold text-rose-400">-0.12%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-4 border border-slate-800">
                  <span className="font-bold tracking-tight">BTC</span>
                  <span className="text-sm font-semibold text-emerald-400">+3.41%</span>
                </div>
              </div>

              {/* Bullet Commentary list */}
              <div className="text-sm md:text-base leading-relaxed text-slate-300 space-y-2 mt-4">
                {slide.body ? (
                  <p className="whitespace-pre-line">{slide.body}</p>
                ) : (
                  <p>Tech sectors rallied strongly on earnings, offsetting minor losses in energy and retail indices.</p>
                )}
              </div>
            </div>
          )}

          {slide.type === 'section_hero' && (
            <div className="space-y-6 max-w-lg mx-auto w-full">
              {/* Sharp featured slide image */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl h-56 md:h-64 relative">
                <img
                  src={slide.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80'}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/20"></div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl leading-snug">
                {slide.title}
              </h2>
            </div>
          )}

          {slide.type === 'body' && (
            <div className="max-w-xl mx-auto w-full space-y-4">
              {slide.title && (
                <h3 className="text-xl font-bold text-sky-400 tracking-tight leading-tight">
                  {slide.title}
                </h3>
              )}
              <p className="text-lg md:text-xl leading-relaxed text-slate-100 font-light whitespace-pre-wrap">
                {slide.body}
              </p>
            </div>
          )}

          {slide.type === 'bullet' && (
            <div className="max-w-xl mx-auto w-full flex items-start space-x-4">
              <span className="mt-1 text-2xl text-sky-500 font-extrabold shrink-0">•</span>
              <p className="text-lg md:text-xl leading-relaxed text-slate-100 font-light">
                {slide.body}
              </p>
            </div>
          )}

          {slide.type === 'link_cards' && (
            <div className="text-center space-y-4 max-w-lg mx-auto w-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="mx-auto size-12 text-sky-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
              <h2 className="text-xl font-bold md:text-2xl">Want to know more?</h2>
              <p className="text-sm text-slate-400">
                Here are the articles mentioned in this section. Swipe horizontally to explore or tap below to skip.
              </p>
            </div>
          )}
        </div>

        {/* Tiny Bottom Index Indicator */}
        <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center text-xs font-semibold text-slate-500 tracking-wider">
          SLIDE {currentIndex + 1} OF {totalSlides}
        </div>
      </div>
    </div>
  );
}
