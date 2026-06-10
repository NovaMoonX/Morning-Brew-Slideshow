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
        className={`slide-body-html leading-relaxed text-foreground [&_a]:border-b-2 [&_a]:border-sky-400 [&_a]:text-inherit [&_a]:no-underline [&_p+_p]:mt-6 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground ${className}`}
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
