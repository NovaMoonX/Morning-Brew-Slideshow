import type { LinkRef } from '@lib/models';

interface LinkExplorerProps {
  links: LinkRef[];
}

export function LinkExplorer({ links }: LinkExplorerProps) {
  if (!links.length) {
    return null;
  }

  return (
    <section className='border-foreground/20 bg-background/80 w-full max-w-3xl space-y-4 rounded-2xl border p-5 backdrop-blur-sm'>
      <h3 className='text-lg font-semibold'>Explore Links</h3>
      <ul className='space-y-3'>
        {links.map((link) => {
          const title = link.og_title || link.anchor_text || link.url;
          const summary = link.gemini_summary || link.og_description;
          return (
            <li
              key={link.url}
              className='border-foreground/15 space-y-2 rounded-xl border p-4'
            >
              <a
                href={link.url}
                target='_blank'
                rel='noreferrer'
                className='text-accent font-semibold break-words hover:underline'
              >
                {title}
              </a>
              {summary ? (
                <p className='text-foreground/75 text-sm leading-relaxed'>
                  {summary}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
