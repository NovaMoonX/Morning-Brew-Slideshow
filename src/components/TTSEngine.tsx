import { useAppDispatch, useAppSelector } from '@store/index';
import { togglePlay, toggleMute, toggleAudioMode } from '@store/slideshowSlice';
import { isDev } from '@lib/app/env';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@components/AudioIcons';
import type { Slide } from '@lib/models';

interface TTSEngineProps {
  slide: Slide | null;
  activeMode: 'idle' | 'kokoro' | 'browser';
  onOpenTableOfContents?: () => void;
}

export function TTSEngine({
  slide,
  activeMode,
  onOpenTableOfContents,
}: TTSEngineProps) {
  const dispatch = useAppDispatch();
  const { isPlaying, isMuted, preferKokoroAudio } = useAppSelector((state) => state.slideshow);

  if (
    !slide ||
    slide.type === 'cover' ||
    slide.type === 'link_cards' ||
    slide.type === 'end' ||
    slide.type === 'extras_hub'
  ) {
    return null;
  }

  const showToc = Boolean(onOpenTableOfContents);

  return (
    <div className="absolute bottom-6 left-0 right-0 z-30 mx-auto max-w-sm px-4 select-none">
      <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-surface-glass px-4 py-3 shadow-xl backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => dispatch(togglePlay())}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-4 ml-0.5" />}
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

        <div className="flex h-4 w-6 shrink-0 items-end gap-0.5">
          <div className={`w-1 bg-sky-400 ${isPlaying && !isMuted ? 'eq-bar' : 'h-1'}`}></div>
          <div className={`w-1 bg-sky-400 ${isPlaying && !isMuted ? 'eq-bar' : 'h-2'}`}></div>
          <div className={`w-1 bg-sky-400 ${isPlaying && !isMuted ? 'eq-bar' : 'h-1.5'}`}></div>
          <div className={`w-1 bg-sky-400 ${isPlaying && !isMuted ? 'eq-bar' : 'h-3'}`}></div>
        </div>

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

        <button
          onClick={() => dispatch(toggleMute())}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
            isMuted
              ? 'border border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'text-muted hover:bg-surface-elevated hover:text-foreground'
          }`}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          aria-pressed={isMuted}
        >
          {isMuted ? <SpeakerXMarkIcon className="size-5" /> : <SpeakerWaveIcon className="size-5" />}
        </button>
      </div>
    </div>
  );
}

export default TTSEngine;
