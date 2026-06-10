import { useNavigate } from 'react-router-dom';

interface IssueEndSlideProps {
  title?: string;
  body?: string;
  compact?: boolean;
}

export function IssueEndSlide({
  title = "That's a wrap",
  body = "You've finished today's Morning Brew. See you tomorrow.",
  compact = false,
}: IssueEndSlideProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? 'justify-center px-4 py-6' : 'justify-center px-6 py-10'
      }`}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-sky-500">Fin</span>
      <h2
        className={`mt-3 font-extrabold leading-tight text-foreground ${
          compact ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'
        }`}
      >
        {title}
      </h2>
      <p className={`mt-3 max-w-sm text-muted ${compact ? 'text-sm' : 'text-base'}`}>{body}</p>
      {!compact && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigate('/');
          }}
          className="pointer-events-auto mt-8 rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          Back to Issues
        </button>
      )}
    </div>
  );
}

export default IssueEndSlide;
