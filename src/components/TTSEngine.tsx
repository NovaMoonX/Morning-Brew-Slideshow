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
const preferredModeLabel = preferKokoroAudio ? 'Kokoro first' : 'Browser TTS first';
const activeModeLabel = mode === 'idle' ? 'Idle' : mode === 'kokoro' ? 'Kokoro audio' : 'Browser speech';

return (
<section className='w-full max-w-3xl rounded-2xl border border-foreground/20 p-5 bg-background/80 backdrop-blur-sm space-y-4'>
<div className='flex flex-wrap items-center gap-2 justify-between'>
<h3 className='text-lg font-semibold'>Audio</h3>
<button
type='button'
onClick={onToggleAudioMode}
disabled={!isAudioReady && preferKokoroAudio}
className={join(
'px-3 py-1.5 text-sm rounded-lg border border-foreground/25 hover:bg-foreground/10',
!isAudioReady && preferKokoroAudio && 'opacity-50 cursor-not-allowed',
)}
>
{preferredModeLabel}
</button>
</div>

<p className='text-sm text-foreground/70'>Playback mode: {activeModeLabel}</p>

<div className='flex flex-wrap gap-2'>
<button
type='button'
onClick={speak}
className='px-4 py-2 rounded-lg border border-accent bg-accent text-accent-foreground hover:bg-accent/80'
>
Play
</button>
<button
type='button'
onClick={pause}
disabled={!isSpeaking}
className={join(
'px-4 py-2 rounded-lg border border-foreground/30 hover:bg-foreground/10',
!isSpeaking && 'opacity-50 cursor-not-allowed',
)}
>
Pause
</button>
<button
type='button'
onClick={resume}
disabled={!canResume}
className={join(
'px-4 py-2 rounded-lg border border-foreground/30 hover:bg-foreground/10',
!canResume && 'opacity-50 cursor-not-allowed',
)}
>
Resume
</button>
<button
type='button'
onClick={stop}
className='px-4 py-2 rounded-lg border border-foreground/30 hover:bg-foreground/10'
>
Stop
</button>
</div>

{error ? <p className='text-sm text-destructive'>{error}</p> : null}
</section>
);
}
