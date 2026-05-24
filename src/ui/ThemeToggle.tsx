import { useTheme } from '@hooks/useTheme';

function ThemeToggle() {
  const { toggleTheme, theme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 left-4 z-50 rounded-full bg-slate-200/80 p-3 text-slate-800 shadow-md backdrop-blur-md transition-all hover:bg-slate-300 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        // Sun Icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="size-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m0 13.5V21M4.93 4.93l1.59 1.59m11.96 11.96l1.59 1.59m-18 6.36h2.25m13.5 0H21M4.93 19.07l1.59-1.59m11.96-11.96l1.59-1.59M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z"
          />
        </svg>
      ) : (
        // Moon Icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="size-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;
