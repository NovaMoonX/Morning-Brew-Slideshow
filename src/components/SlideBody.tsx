import type { Slide } from '@lib/models';

interface SlideBodyProps {
  slide: Slide;
  className?: string;
}

function normalizeInlineHtml(html: string): string {
  return html
    .replace(/(<\/(?:a|strong|b|em|i|span)>)(?=\w)/g, '$1 ')
    .replace(/(\w)(<(?:a|strong|b|em|i|span)\b)/g, '$1 $2')
    .replace(/(<\/(?:a|strong|b|em|i|span)>)(<span>)([A-Za-z])/g, '$1$2 $3')
    .replace(/(<\/span><span>)([A-Za-z])/g, '$1 $2')
    .replace(/(<\/strong>)([A-Za-z])/g, '$1 $2')
    .replace(/(<\/a>)([A-Za-z])/g, '$1 $2')
    .replace(/:(?=[A-Za-z])/g, ': ');
}

export function SlideBody({ slide, className = '' }: SlideBodyProps) {
  if (slide.body_html) {
    return (
      <div
        className={`slide-body-html leading-relaxed text-foreground [&_a]:border-b-2 [&_a]:border-sky-400 [&_a]:text-inherit [&_a]:no-underline [&_p+_p]:mt-6 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_ul.slide-bullets]:mt-4 [&_ul.slide-bullets]:list-none [&_ul.slide-bullets]:space-y-4 [&_ul.slide-bullets]:pl-0 [&_ul.slide-bullets>li]:relative [&_ul.slide-bullets>li]:pl-6 [&_ul.slide-bullets>li]:before:absolute [&_ul.slide-bullets>li]:before:left-0 [&_ul.slide-bullets>li]:before:font-extrabold [&_ul.slide-bullets>li]:before:text-sky-400 [&_ul.slide-bullets>li]:before:content-['•'] ${className}`}
        dangerouslySetInnerHTML={{ __html: normalizeInlineHtml(slide.body_html) }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) {
            event.stopPropagation();
          }
        }}
      />
    );
  }

  return (
    <p className={`whitespace-pre-wrap leading-relaxed text-foreground ${className}`}>
      {slide.body}
    </p>
  );
}

export function speakableText(slide: Slide): string {
  if (slide.type === 'brief_cards') {
    const parts = [slide.title?.trim()].filter(Boolean);
    for (const link of slide.links) {
      const headline = link.anchor_text?.trim() || link.og_title?.trim();
      const detail = link.og_description?.trim() || link.gemini_summary?.trim();
      if (headline && detail) {
        parts.push(`${headline}. ${detail}`);
      } else if (headline) {
        parts.push(headline);
      }
    }
    return parts.join('. ');
  }
  if (slide.id.includes('_headline_') && slide.title?.trim()) {
    const body = slide.body?.trim() ?? '';
    return body ? `${slide.title}. ${body}` : slide.title;
  }
  if (slide.body?.trim()) {
    return slide.body;
  }
  if (slide.title?.trim()) {
    return slide.title;
  }
  return '';
}
