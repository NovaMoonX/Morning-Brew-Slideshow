import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  query,
  orderBy,
  limit,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase';
import { isDev, isProd } from '@lib/app/env';
import { MOCK_ISSUE } from '@lib/issues/mockIssue';
import type { BrewIssue } from '@lib/models';

export interface AvailableIssue {
  id: string;
  date: string;
  title: string;
  primary_image_url: string | null;
  status: string;
}

function docToAvailableIssue(docSnap: QueryDocumentSnapshot<DocumentData>): AvailableIssue {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    date: (data.date as string) || docSnap.id,
    title: (data.title as string) || 'Morning Brew',
    primary_image_url: (data.primary_image_url as string) || null,
    status: (data.status as string) || 'ready',
  };
}

async function loadIssueIndexFromServer(): Promise<AvailableIssue[]> {
  if (!db) {
    return [];
  }

  try {
    const ordered = query(
      collection(db, 'issue_index'),
      orderBy('fetched_at', 'desc'),
      limit(7)
    );
    const snapshot = await getDocsFromServer(ordered);
    if (!snapshot.empty) {
      return snapshot.docs.map(docToAvailableIssue);
    }
  } catch (err) {
    if (isDev) {
      console.warn('Ordered issue_index fetch failed, falling back to full collection read.', err);
    }
  }

  const snapshot = await getDocsFromServer(collection(db, 'issue_index'));
  return snapshot.docs
    .map(docToAvailableIssue)
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 7);
}

export function parseIssueIdFromIngestMessage(message: string): string | null {
  const match = message.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

interface IssueState {
  activeIssue: BrewIssue | null;
  availableIssues: AvailableIssue[];
  listLoading: boolean;
  issueLoading: boolean;
  issuesRefreshing: boolean;
  error: string | null;
  isUsingMock: boolean;
  testFetchLoading: boolean;
  testFetchError: string | null;
  testFetchComplete: boolean;
  testFetchMessage: string | null;
}

const initialState: IssueState = {
  activeIssue: null,
  availableIssues: [],
  listLoading: false,
  issueLoading: false,
  issuesRefreshing: false,
  error: null,
  isUsingMock: !isFirebaseConfigured,
  testFetchLoading: false,
  testFetchError: null,
  testFetchComplete: false,
  testFetchMessage: null,
};

// Dev-only: calls ingest_issue via functions-framework (npm run dev:ingest).
const INGEST_FUNCTION_URL = isDev
  ? 'http://127.0.0.1:8787'
  : (import.meta.env.VITE_INGEST_FUNCTION_URL as string | undefined);

const INGEST_FETCH_TIMEOUT_MS = 120_000;

export const testFetchLatest = createAsyncThunk(
  'issue/testFetchLatest',
  async (_, { rejectWithValue }) => {
    if (!INGEST_FUNCTION_URL) {
      return rejectWithValue('VITE_INGEST_FUNCTION_URL is not set.');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), INGEST_FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(INGEST_FUNCTION_URL, { signal: controller.signal });
      const body = await res.text().catch(() => '');

      if (!res.ok) {
        if (res.status === 403) {
          return rejectWithValue(
            isDev
              ? 'Ingest returned 403. Start the local server with npm run dev:ingest.'
              : 'Ingest returned 403. The Cloud Run service requires authentication — allow unauthenticated invocations in the Google Cloud Console.'
          );
        }
        return rejectWithValue(`Ingest failed (${res.status}): ${body}`);
      }

      return body || 'Ingest completed.';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return rejectWithValue(
          'Ingest timed out after 2 minutes. Check the npm run dev:ingest terminal — Firestore auth often causes long hangs (run gcloud auth application-default login).'
        );
      }
      if (err instanceof TypeError) {
        return rejectWithValue(
          'Could not reach the ingest server. Is npm run dev:ingest running on port 8787?'
        );
      }
      return rejectWithValue((err as Error).message || 'Fetch failed.');
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
);

// Async Thunk to fetch available issues for the past 7 days
export const fetchAvailableIssues = createAsyncThunk<
  AvailableIssue[],
  { background?: boolean } | void,
  { rejectValue: string }
>(
  'issue/fetchAvailableIssues',
  async (_, { rejectWithValue }) => {
    if (!isFirebaseConfigured || !db) {
      if (isProd) {
        return rejectWithValue(
          'Unable to load issues. Firebase is not configured for this build.',
        );
      }
      // Local dev fallback when .env.local is missing
      const mockIndex: AvailableIssue[] = [
        {
          id: MOCK_ISSUE.id,
          date: MOCK_ISSUE.date,
          title: MOCK_ISSUE.title,
          primary_image_url: MOCK_ISSUE.primary_image_url,
          status: MOCK_ISSUE.status,
        },
        {
          id: '2026-05-22',
          date: 'May 22, 2026',
          title: 'Unicorns Are Real & Raising Capital',
          primary_image_url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&auto=format&fit=crop&q=60',
          status: 'audio_ready',
        },
        {
          id: '2026-05-21',
          date: 'May 21, 2026',
          title: 'The AI Search Wars Heat Up Again',
          primary_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
          status: 'enriched',
        },
      ];
      return mockIndex;
    }

    try {
      return await loadIssueIndexFromServer();
    } catch (err) {
      return rejectWithValue((err as Error).message || 'Failed to fetch issues index.');
    }
  }
);

export const fetchIssueIndexEntry = createAsyncThunk<
  AvailableIssue | null,
  string,
  { rejectValue: string }
>('issue/fetchIssueIndexEntry', async (issueId, { rejectWithValue }) => {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const snap = await getDocFromServer(doc(db, 'issue_index', issueId));
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      id: snap.id,
      date: (data.date as string) || snap.id,
      title: (data.title as string) || 'Morning Brew',
      primary_image_url: (data.primary_image_url as string) || null,
      status: (data.status as string) || 'ready',
    };
  } catch (err) {
    return rejectWithValue((err as Error).message || 'Failed to fetch issue index entry.');
  }
});

const issueSlice = createSlice({
  name: 'issue',
  initialState,
  reducers: {
    setActiveIssue: (state, action: PayloadAction<BrewIssue | null>) => {
      state.activeIssue = action.payload;
    },
    setIssueLoading: (state, action: PayloadAction<boolean>) => {
      state.issueLoading = action.payload;
    },
    setIssueError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setUsingMock: (state, action: PayloadAction<boolean>) => {
      state.isUsingMock = action.payload;
    },
    clearTestFetch: (state) => {
      state.testFetchError = null;
      state.testFetchComplete = false;
      state.testFetchMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableIssues.pending, (state, action) => {
        state.error = null;
        if (action.meta.arg?.background) {
          state.issuesRefreshing = true;
        } else {
          state.listLoading = true;
        }
      })
      .addCase(
        fetchAvailableIssues.fulfilled,
        (state, action: PayloadAction<AvailableIssue[]>) => {
          state.availableIssues = action.payload;
          state.listLoading = false;
          state.issuesRefreshing = false;
        }
      )
      .addCase(fetchAvailableIssues.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Could not fetch issues list.';
        state.listLoading = false;
        state.issuesRefreshing = false;
      })
      .addCase(fetchIssueIndexEntry.fulfilled, (state, action) => {
        const entry = action.payload;
        if (!entry) {
          return;
        }
        const without = state.availableIssues.filter((issue) => issue.id !== entry.id);
        state.availableIssues = [entry, ...without]
          .sort((a, b) => b.id.localeCompare(a.id))
          .slice(0, 7);
        state.issuesRefreshing = false;
      })
      .addCase(testFetchLatest.pending, (state) => {
        state.testFetchLoading = true;
        state.testFetchError = null;
        state.testFetchComplete = false;
      })
      .addCase(testFetchLatest.fulfilled, (state, action) => {
        state.testFetchLoading = false;
        state.testFetchComplete = true;
        state.testFetchMessage = action.payload;
      })
      .addCase(testFetchLatest.rejected, (state, action) => {
        state.testFetchLoading = false;
        state.testFetchError = (action.payload as string) || 'Fetch failed.';
      });
  },
});

export const {
  setActiveIssue,
  setIssueLoading,
  setIssueError,
  setUsingMock,
  clearTestFetch,
} = issueSlice.actions;

export default issueSlice.reducer;
