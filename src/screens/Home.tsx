import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@store/index';
import { fetchAvailableIssues, testFetchLatest, clearTestFetch, fetchIssueIndexEntry, parseIssueIdFromIngestMessage } from '@store/issueSlice';
import { APP_TITLE, APP_DESCRIPTION, isDev } from '@lib/app';
import { issueHeroBadge, issueCardBadge } from '@lib/issues/issueStatus';

function DevTestFetchPanel({
  loading,
  error,
  complete,
  message,
  onFetch,
  variant = 'header',
}: {
  loading: boolean;
  error: string | null;
  complete: boolean;
  message: string | null;
  onFetch: () => void;
  variant?: 'header' | 'empty';
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [loading]);

  const buttonClass =
    variant === 'empty'
      ? 'rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50'
      : 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

  return (
    <div className={`flex flex-col gap-2 ${variant === 'header' ? 'items-center md:items-end' : 'items-center'}`}>
      <button onClick={onFetch} disabled={loading} className={buttonClass}>
        {loading ? 'Ingesting…' : 'Test: Fetch Latest Issue'}
      </button>

      {loading && (
        <div
          className={`flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 ${variant === 'header' ? 'max-w-xs text-right' : 'max-w-sm text-center'}`}
          role="status"
          aria-live="polite"
        >
          <div className="mt-0.5 size-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Working… {elapsedSec}s
            </p>
            <p className="mt-0.5">
              Fetching Morning Brew, parsing slides, writing to Firestore. Usually 10–30s; Firestore
              auth problems can take up to 2 minutes.
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-500">
              Watch the <code className="text-[10px]">npm run dev:ingest</code> terminal for step logs.
            </p>
          </div>
        </div>
      )}

      {complete && message && !loading && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 max-w-sm text-center md:text-right">
          {message}
        </p>
      )}
      {error && !loading && (
        <p className="text-xs text-red-500 dark:text-red-400 max-w-sm text-center md:text-right">{error}</p>
      )}
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { availableIssues, listLoading, issuesRefreshing, error, testFetchLoading, testFetchError, testFetchComplete, testFetchMessage } =
    useAppSelector((state) => state.issue);

  useEffect(() => {
    dispatch(fetchAvailableIssues());
  }, [dispatch]);

  const handleTestFetch = useCallback(async () => {
    dispatch(clearTestFetch());
    const result = await dispatch(testFetchLatest());
    if (testFetchLatest.fulfilled.match(result)) {
      const issueId = parseIssueIdFromIngestMessage(result.payload);
      if (issueId) {
        await dispatch(fetchIssueIndexEntry(issueId));
      }
      await dispatch(fetchAvailableIssues({ background: true }));
    }
  }, [dispatch]);

  const latestIssue = availableIssues[0];
  const pastIssues = availableIssues.slice(1);
  const latestHeroBadge = latestIssue ? issueHeroBadge(latestIssue.status) : null;

  if (listLoading && availableIssues.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center p-4">
        <div className="size-12 animate-spin rounded-full border-4 border-slate-300 border-t-sky-500"></div>
        <p className="mt-4 text-slate-500 dark:text-slate-400">Loading newsletter issues...</p>
      </div>
    );
  }

  if (error && availableIssues.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-950/15">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">Failed to Load Issues</h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-500">{error}</p>
          <button
            onClick={() => dispatch(fetchAvailableIssues())}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
          >
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Container */}
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        
        {/* Header */}
        <header className="mb-10 text-center md:text-left md:flex md:items-end md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-500">interactive slides</span>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">{APP_TITLE}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
              {APP_DESCRIPTION}
            </p>
          </div>
          {isDev && (
            <div className="mt-6 md:mt-0">
              <DevTestFetchPanel
                loading={testFetchLoading}
                error={testFetchError}
                complete={testFetchComplete}
                message={testFetchMessage}
                onFetch={handleTestFetch}
                variant="header"
              />
            </div>
          )}
        </header>

        {/* Empty state when no issues are loaded */}
        {!listLoading && availableIssues.length === 0 && !error && !issuesRefreshing && (
          <section className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">☕</div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">No issues loaded yet</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Issues are ingested automatically each morning. Check back after 6am ET.
            </p>
            {isDev && (
              <div className="mt-6">
                <DevTestFetchPanel
                  loading={testFetchLoading}
                  error={testFetchError}
                  complete={testFetchComplete}
                  message={testFetchMessage}
                  onFetch={handleTestFetch}
                  variant="empty"
                />
              </div>
            )}
          </section>
        )}

        {issuesRefreshing && availableIssues.length === 0 && (
          <section className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-10 animate-spin rounded-full border-4 border-slate-300 border-t-sky-500" />
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Loading issues from Firestore…
            </p>
          </section>
        )}

        {/* Latest Issue Hero Section */}
        {latestIssue && (
          <section className="mb-12">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Latest Daily Issue
            </h2>
            <div
              onClick={() => navigate(`/issue/${latestIssue.id}`)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-100 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:bg-slate-900"
            >
              {/* Cover Aspect Ratio Image */}
              <div className="relative h-64 sm:h-80 w-full">
                <img
                  src={latestIssue.primary_image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80'}
                  alt={latestIssue.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              </div>

              {/* Cover Details Text */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                {latestHeroBadge && (
                  <span className="inline-block rounded-full bg-sky-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    {latestHeroBadge}
                  </span>
                )}
                <h3 className={`font-bold tracking-tight md:text-3xl line-clamp-2 ${latestHeroBadge ? 'mt-3' : ''} text-2xl`}>
                  {latestIssue.title}
                </h3>
                <p className="mt-2 text-sm text-slate-300 font-medium">
                  {latestIssue.date}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Past Issues Section */}
        {pastIssues.length > 0 && (
          <section>
            <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Past Slideshows
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {pastIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => navigate(`/issue/${issue.id}`)}
                  className="group flex cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* Small Aspect Square Thumbnail */}
                  <div className="h-32 w-32 shrink-0 overflow-hidden relative">
                    <img
                      src={issue.primary_image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=80'}
                      alt={issue.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-950/10 dark:bg-slate-950/20"></div>
                  </div>

                  {/* Core Card metadata details */}
                  <div className="flex flex-col justify-between p-4">
                    <div>
                      <p className="text-xs font-semibold text-sky-500 dark:text-sky-400">
                        {issue.date}
                      </p>
                      <h4 className="mt-1 font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-sky-500 transition-colors">
                        {issue.title}
                      </h4>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {issueCardBadge(issue.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default Home;
