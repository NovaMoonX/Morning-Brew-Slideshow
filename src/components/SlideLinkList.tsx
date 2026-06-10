import type { LinkRef } from '@lib/models';

export function filterSectionBodyLinks(
  links: LinkRef[],
  sectionTitle: string | null | undefined,
): LinkRef[] {
  const title = sectionTitle?.trim().toLowerCase() ?? '';

  return links.filter((link) => {
    const anchor = link.anchor_text.trim().toLowerCase();
    if (!anchor) {
      return false;
    }
    if (title && anchor === title) {
      return false;
    }
    if (title && anchor.length > 30 && title.startsWith(anchor.slice(0, 20))) {
      return false;
    }
    return true;
  });
}

interface SlideLinkListProps {
  links: LinkRef[];
  sectionTitle?: string | null;
}

export function SlideLinkList({ links, sectionTitle = null }: SlideLinkListProps) {
  const visible = filterSectionBodyLinks(links, sectionTitle);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      {visible.map((link, index) => (
        <a
          key={`${link.url}-${index}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="block text-sm leading-snug text-sky-400 underline decoration-sky-400 underline-offset-[3px] hover:text-sky-300"
        >
          {link.anchor_text}
        </a>
      ))}
    </div>
  );
}
