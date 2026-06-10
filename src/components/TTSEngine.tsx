import { useAppDispatch, useAppSelector } from '@store/index';
import { togglePlay, toggleMute, toggleAudioMode } from '@store/slideshowSlice';
import { useTTS } from '@hooks/useTTS';
import { isDev } from '@lib/app/env';
import type { Slide } from '@lib/models';

interface TTSEngineProps {
  slide: Slide | null;
  totalSlides: number;
  mainLastIndex: number;
  isAudioReady: boolean;
  onOpenTableOfContents?: () => void;
}

export function TTSEngine({
  slide,
  totalSlides,
  mainLastIndex,
  isAudioReady,
  onOpenTableOfContents,
}: TTSEngineProps) {
  const dispatch = useAppDispatch();
  const { isPlaying, isMuted, preferKokoroAudio } = useAppSelector((state) => state.slideshow);
  
  const { activeMode } = useTTS({ slide, totalSlides, mainLastIndex, isAudioReady });

  if (!slide || slide.type === 'link_cards' || slide.type === 'end' || slide.type === 'extras_hub') {
    return null;
  }

  const showToc = slide.type !== 'cover' && Boolean(onOpenTableOfContents);

  return (
    <div className="absolute bottom-6 left-0 right-0 z-30 mx-auto max-w-sm px-4 select-none">
      <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-surface-glass px-4 py-3 shadow-xl backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => dispatch(togglePlay())}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="size-4 ml-0.5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {showToc && (
            <button
              type="button"
              onClick={onOpenTableOfContents}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-muted transition hover:bg-surface hover:text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
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
          )}
        </div>

        {/* Dynamic Equalizer Visualizer */}
        <div className="flex h-4 w-6 shrink-0 items-end gap-0.5">
          <div className={`w-1 bg-sky-400 ${isPlaying ? 'eq-bar' : 'h-1'}`}></div>
          <div className={`w-1 bg-sky-400 ${isPlaying ? 'eq-bar' : 'h-2'}`}></div>
          <div className={`w-1 bg-sky-400 ${isPlaying ? 'eq-bar' : 'h-1.5'}`}></div>
          <div className={`w-1 bg-sky-400 ${isPlaying ? 'eq-bar' : 'h-3'}`}></div>
        </div>

        {/* Audio Source / Mode Indicator Pill (dev only — production uses Kokoro-first automatically) */}
        {isDev && (
          <button
            onClick={() => dispatch(toggleAudioMode())}
            className="rounded-full bg-surface-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted transition hover:bg-surface"
            aria-label="Change voice generation"
          >
            {activeMode === 'kokoro'
              ? 'Kokoro Voice'
              : activeMode === 'browser'
                ? 'Browser TTS'
                : preferKokoroAudio
                  ? 'Kokoro First'
                  : 'Browser First'}
          </button>
        )}

        {/* Mute/Unmute Toggle */}
        <button
          onClick={() => dispatch(toggleMute())}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-elevated hover:text-foreground"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5 text-rose-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.72 12H1.5v4.5h3.22L9 21.22V2.78L4.72 7.5z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default TTSEngine;
