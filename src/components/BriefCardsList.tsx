import type { LinkRef } from '@lib/models';
import { getLinkDisplayDescription, getLinkDisplayTitle } from '@lib/links/display';

interface BriefCardsListProps {
  links: LinkRef[];
}

export function BriefCardsList({ links }: BriefCardsListProps) {
  if (links.length === 0) {
    return (
      <p className="text-center text-sm text-muted">No additional headlines for today.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {links.map((link, index) => {
        const headline = getLinkDisplayTitle(link);
        const description =
          link.og_description?.trim() ||
          link.gemini_summary?.trim() ||
          getLinkDisplayDescription(link);
        const hasUrl = Boolean(link.url && link.url !== '#');

        const cardClass =
          'block rounded-xl border border-border bg-surface px-4 py-3.5 shadow-sm transition hover:border-border-strong hover:bg-surface-elevated';

        if (hasUrl) {
          return (
            <a
              key={`${link.url}-${index}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={cardClass}
            >
              <p className="font-bold leading-snug text-sky-600 dark:text-sky-400">{headline}</p>
              {description && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
              )}
            </a>
          );
        }

        return (
          <div key={`${headline}-${index}`} className={cardClass}>
            <p className="font-bold leading-snug text-foreground">{headline}</p>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default BriefCardsList;
