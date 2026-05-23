import { join } from '@moondreamsdev/dreamer-ui/utils';

import type { Slide } from '@lib/models';

interface SlideshowPlayerProps {
  slide: Slide;
  currentIndex: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function SlideshowPlayer({
  slide,
  currentIndex,
  totalSlides,
  onPrevious,
  onNext,
}: SlideshowPlayerProps) {
  const isFirstSlide = currentIndex <= 0;
  const isLastSlide = currentIndex >= totalSlides - 1;

  const sectionLabel = slide.section_label || 'MORNING BREW';
  const paginationLabel = `${currentIndex + 1} / ${totalSlides}`;

  const imageNode = slide.image_url ? (
    <figure className='space-y-2'>
      <img
        src={slide.image_url}
        alt={slide.title}
        className='border-foreground/20 max-h-56 w-full rounded-xl border object-cover'
      />
      {slide.image_caption ? (
        <figcaption className='text-foreground/60 text-xs'>
          {slide.image_caption}
        </figcaption>
      ) : null}
    </figure>
  ) : null;

  return (
    <section className='border-foreground/20 bg-background/80 w-full max-w-3xl space-y-5 rounded-2xl border p-5 shadow-xl backdrop-blur-sm md:p-7'>
      <header className='space-y-2'>
        <p className='text-foreground/60 text-xs font-semibold tracking-[0.2em]'>
          {sectionLabel}
        </p>
        <h2 className='text-2xl font-bold md:text-3xl'>{slide.title}</h2>
        <p className='text-foreground/60 text-sm'>{paginationLabel}</p>
      </header>

      {imageNode}

      <p className='text-base leading-relaxed whitespace-pre-wrap md:text-lg'>
        {slide.body || 'No body text for this slide.'}
      </p>

      <footer className='flex items-center justify-between gap-3'>
        <button
          type='button'
          onClick={onPrevious}
          disabled={isFirstSlide}
          className={join(
            'rounded-lg border px-4 py-2 font-medium transition-colors',
            isFirstSlide
              ? 'border-foreground/20 cursor-not-allowed opacity-40'
              : 'hover:bg-foreground/10 border-foreground/30',
          )}
        >
          Previous
        </button>
        <button
          type='button'
          onClick={onNext}
          disabled={isLastSlide}
          className={join(
            'rounded-lg border px-4 py-2 font-medium transition-colors',
            isLastSlide
              ? 'border-foreground/20 cursor-not-allowed opacity-40'
              : 'hover:bg-accent/80 bg-accent text-accent-foreground border-accent',
          )}
        >
          Next
        </button>
      </footer>
    </section>
  );
}
