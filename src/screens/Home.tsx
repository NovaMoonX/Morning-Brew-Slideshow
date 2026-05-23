import { useEffect, useMemo } from 'react';

import { IssueStatusBanner } from '@components/IssueStatusBanner';
import { LinkExplorer } from '@components/LinkExplorer';
import { SlideshowPlayer } from '@components/SlideshowPlayer';
import { TTSEngine } from '@components/TTSEngine';
import { useIssue } from '@hooks/useIssue';
import { getTodayIssueId } from '@lib/issues/issue.utils';
import { APP_DESCRIPTION, APP_TITLE } from '@lib/app';
import { useSlideshowStore } from '@store';

export function Home() {
const issueId = getTodayIssueId();
const { issue, loading, error, isUsingMock } = useIssue(issueId);
const {
currentSlideIndex,
nextSlide,
previousSlide,
setCurrentSlideIndex,
preferKokoroAudio,
togglePreferKokoroAudio,
} = useSlideshowStore();

const slides = issue?.slides ?? [];
const totalSlides = slides.length;

const activeIndex = useMemo(() => {
if (!totalSlides) {
const result = 0;
return result;
}

const bounded = Math.min(currentSlideIndex, totalSlides - 1);
const result = Math.max(bounded, 0);
return result;
}, [currentSlideIndex, totalSlides]);

const activeSlide = slides[activeIndex] ?? null;
const links = activeSlide?.links ?? [];
const isAudioReady = issue?.status === 'audio_ready';

useEffect(() => {
setCurrentSlideIndex(activeIndex);
}, [activeIndex, setCurrentSlideIndex]);

if (loading) {
return (
<div className='page flex flex-col items-center justify-center px-4'>
<p className='text-xl font-semibold'>Loading issue {issueId}…</p>
</div>
);
}

if (error) {
return (
<div className='page flex flex-col items-center justify-center px-4'>
<div className='max-w-xl rounded-xl border border-destructive/40 p-5 bg-destructive/10 text-destructive'>
<p className='font-semibold'>Failed to load issue</p>
<p className='mt-2 text-sm'>{error}</p>
</div>
</div>
);
}

if (!issue || !activeSlide) {
return (
<div className='page flex flex-col items-center justify-center px-4'>
<div className='max-w-xl rounded-xl border border-foreground/20 p-5 bg-background/80 text-center space-y-2'>
<p className='text-2xl font-bold'>{APP_TITLE}</p>
<p className='text-foreground/70'>No issue data is available for {issueId} yet.</p>
</div>
</div>
);
}

return (
<div className='page px-4 py-10'>
<div className='mx-auto w-full max-w-3xl space-y-5'>
<header className='space-y-2'>
<h1 className='text-3xl md:text-4xl font-bold'>{APP_TITLE}</h1>
<p className='text-foreground/75'>{APP_DESCRIPTION}</p>
<p className='text-sm text-foreground/60'>Issue: {issue.id}</p>
</header>

<IssueStatusBanner status={issue.status} isUsingMock={isUsingMock} />

<SlideshowPlayer
slide={activeSlide}
currentIndex={activeIndex}
totalSlides={totalSlides}
onPrevious={() => previousSlide(totalSlides)}
onNext={() => nextSlide(totalSlides)}
/>

<TTSEngine
slide={activeSlide}
preferKokoroAudio={preferKokoroAudio && isAudioReady}
onToggleAudioMode={togglePreferKokoroAudio}
isAudioReady={isAudioReady}
/>

{issue.status === 'ready' ? null : <LinkExplorer links={links} />}
</div>
</div>
);
}

export default Home;
