import { join } from '@moondreamsdev/dreamer-ui/utils';

import type { IssueStatus } from '@lib/models';

interface IssueStatusBannerProps {
status: IssueStatus;
isUsingMock: boolean;
}

const STATUS_COPY: Record<IssueStatus, string> = {
ready: 'Slides are ready. Link enrichment and audio generation are still running.',
enriched: 'Links are enriched. High-fidelity audio generation is in progress.',
audio_ready: 'Audio is ready. Kokoro playback can be used for supported slides.',
failed: 'Pipeline failed. Check function logs and retry ingestion.',
};

export function IssueStatusBanner({ status, isUsingMock }: IssueStatusBannerProps) {
const message = STATUS_COPY[status];

const badgeClassName = join(
'inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border',
status === 'audio_ready' && 'bg-success text-success-foreground border-success/70',
status === 'enriched' && 'bg-warning text-warning-foreground border-warning/70',
status === 'ready' && 'bg-secondary text-secondary-foreground border-secondary/70',
status === 'failed' && 'bg-destructive text-destructive-foreground border-destructive/70',
);

return (
<section className='w-full max-w-3xl rounded-2xl border border-foreground/20 p-4 bg-background/80 backdrop-blur-sm space-y-2'>
<div className='flex flex-wrap items-center gap-3'>
<span className={badgeClassName}>{status.replace('_', ' ')}</span>
{isUsingMock ? <span className='text-xs text-foreground/60'>Mock mode</span> : null}
</div>
<p className='text-sm text-foreground/75'>{message}</p>
</section>
);
}
