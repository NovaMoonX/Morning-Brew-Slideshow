import { Link } from 'react-router-dom';
import { APP_TITLE } from '@lib/app';

function About() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground transition-colors duration-200">
      <div className="max-w-2xl space-y-6 px-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">About {APP_TITLE}</h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-light">
          A mobile-first way to read Morning Brew as an interactive slideshow, with optional listen-along audio.
        </p>
        <div className="pt-4">
          <Link
            to="/"
            className="inline-block rounded-full bg-sky-600 px-6 py-2.5 font-bold uppercase tracking-wider text-xs text-white transition hover:bg-sky-500 shadow-md"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default About;
