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
className='w-full max-h-56 object-cover rounded-xl border border-foreground/20'
/>
{slide.image_caption ? (
<figcaption className='text-xs text-foreground/60'>{slide.image_caption}</figcaption>
) : null}
</figure>
) : null;

return (
<section className='w-full max-w-3xl rounded-2xl border border-foreground/20 p-5 md:p-7 bg-background/80 backdrop-blur-sm space-y-5 shadow-xl'>
<header className='space-y-2'>
<p className='text-xs font-semibold tracking-[0.2em] text-foreground/60'>{sectionLabel}</p>
<h2 className='text-2xl md:text-3xl font-bold'>{slide.title}</h2>
<p className='text-sm text-foreground/60'>{paginationLabel}</p>
</header>

{imageNode}

<p className='text-base md:text-lg leading-relaxed whitespace-pre-wrap'>{slide.body || 'No body text for this slide.'}</p>

<footer className='flex items-center justify-between gap-3'>
<button
type='button'
onClick={onPrevious}
disabled={isFirstSlide}
className={join(
'px-4 py-2 rounded-lg font-medium border transition-colors',
isFirstSlide
? 'opacity-40 cursor-not-allowed border-foreground/20'
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
'px-4 py-2 rounded-lg font-medium border transition-colors',
isLastSlide
? 'opacity-40 cursor-not-allowed border-foreground/20'
: 'hover:bg-accent/80 bg-accent text-accent-foreground border-accent',
)}
>
Next
</button>
</footer>
</section>
);
}
