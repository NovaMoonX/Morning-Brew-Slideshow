import { join } from '@moondreamsdev/dreamer-ui/utils';

import { useTTS } from '@hooks/useTTS';
import type { Slide } from '@lib/models';

interface TTSEngineProps {
  slide: Slide | null;
  preferKokoroAudio: boolean;
  onToggleAudioMode: () => void;
  isAudioReady: boolean;
}

export function TTSEngine({
  slide,
  preferKokoroAudio,
  onToggleAudioMode,
  isAudioReady,
}: TTSEngineProps) {
  const { isSpeaking, mode, error, speak, pause, resume, stop } = useTTS({
    slide,
    preferKokoroAudio,
  });

  const canResume = mode !== 'idle' && !isSpeaking;
  const preferredModeLabel = preferKokoroAudio
    ? 'Kokoro first'
    : 'Browser TTS first';
  const activeModeLabel =
    mode === 'idle'
      ? 'Idle'
      : mode === 'kokoro'
        ? 'Kokoro audio'
        : 'Browser speech';

  return (
    <section className='border-foreground/20 bg-background/80 w-full max-w-3xl space-y-4 rounded-2xl border p-5 backdrop-blur-sm'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-lg font-semibold'>Audio</h3>
        <button
          type='button'
          onClick={onToggleAudioMode}
          disabled={!isAudioReady && preferKokoroAudio}
          className={join(
            'border-foreground/25 hover:bg-foreground/10 rounded-lg border px-3 py-1.5 text-sm',
            !isAudioReady &&
              preferKokoroAudio &&
              'cursor-not-allowed opacity-50',
          )}
        >
          {preferredModeLabel}
        </button>
      </div>

      <p className='text-foreground/70 text-sm'>
        Playback mode: {activeModeLabel}
      </p>

      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={speak}
          className='border-accent bg-accent text-accent-foreground hover:bg-accent/80 rounded-lg border px-4 py-2'
        >
          Play
        </button>
        <button
          type='button'
          onClick={pause}
          disabled={!isSpeaking}
          className={join(
            'border-foreground/30 hover:bg-foreground/10 rounded-lg border px-4 py-2',
            !isSpeaking && 'cursor-not-allowed opacity-50',
          )}
        >
          Pause
        </button>
        <button
          type='button'
          onClick={resume}
          disabled={!canResume}
          className={join(
            'border-foreground/30 hover:bg-foreground/10 rounded-lg border px-4 py-2',
            !canResume && 'cursor-not-allowed opacity-50',
          )}
        >
          Resume
        </button>
        <button
          type='button'
          onClick={stop}
          className='border-foreground/30 hover:bg-foreground/10 rounded-lg border px-4 py-2'
        >
          Stop
        </button>
      </div>

      {error ? <p className='text-destructive text-sm'>{error}</p> : null}
    </section>
  );
}
