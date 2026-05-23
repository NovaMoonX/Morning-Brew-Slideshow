import type { LinkRef } from '@lib/models';

interface LinkExplorerProps {
links: LinkRef[];
}

export function LinkExplorer({ links }: LinkExplorerProps) {
if (!links.length) {
return null;
}

return (
<section className='w-full max-w-3xl rounded-2xl border border-foreground/20 p-5 bg-background/80 backdrop-blur-sm space-y-4'>
<h3 className='text-lg font-semibold'>Explore Links</h3>
<ul className='space-y-3'>
{links.map((link) => {
const title = link.og_title || link.anchor_text || link.url;
const summary = link.gemini_summary || link.og_description;
return (
<li key={link.url} className='rounded-xl border border-foreground/15 p-4 space-y-2'>
<a
href={link.url}
target='_blank'
rel='noreferrer'
className='font-semibold text-accent hover:underline break-words'
>
{title}
</a>
{summary ? (
<p className='text-sm text-foreground/75 leading-relaxed'>{summary}</p>
) : null}
</li>
);
})}
</ul>
</section>
);
}
