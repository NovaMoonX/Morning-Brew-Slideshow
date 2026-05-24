import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase';
import { MOCK_ISSUE } from '@lib/issues/mockIssue';
import type { BrewIssue } from '@lib/models';

export interface AvailableIssue {
  id: string;
  date: string;
  title: string;
  primary_image_url: string | null;
  status: string;
}

interface IssueState {
  activeIssue: BrewIssue | null;
  availableIssues: AvailableIssue[];
  loading: boolean;
  error: string | null;
  isUsingMock: boolean;
}

const initialState: IssueState = {
  activeIssue: null,
  availableIssues: [],
  loading: false,
  error: null,
  isUsingMock: !isFirebaseConfigured,
};

// Async Thunk to fetch available issues for the past 7 days
export const fetchAvailableIssues = createAsyncThunk(
  'issue/fetchAvailableIssues',
  async (_, { rejectWithValue }) => {
    if (!isFirebaseConfigured || !db) {
      // Return a mock issue index if Firebase is not configured
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
      const q = query(
        collection(db, 'issue_index'),
        orderBy('fetched_at', 'desc'),
        limit(7)
      );
      const snapshot = await getDocs(q);
      const issues: AvailableIssue[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        issues.push({
          id: doc.id,
          date: data.date || doc.id,
          title: data.title || 'Morning Brew',
          primary_image_url: data.primary_image_url || null,
          status: data.status || 'ready',
        });
      });
      return issues;
    } catch (err) {
      return rejectWithValue((err as Error).message || 'Failed to fetch issues index.');
    }
  }
);

const issueSlice = createSlice({
  name: 'issue',
  initialState,
  reducers: {
    setActiveIssue: (state, action: PayloadAction<BrewIssue | null>) => {
      state.activeIssue = action.payload;
    },
    setIssueLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setIssueError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setUsingMock: (state, action: PayloadAction<boolean>) => {
      state.isUsingMock = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAvailableIssues.fulfilled,
        (state, action: PayloadAction<AvailableIssue[]>) => {
          state.availableIssues = action.payload;
          state.loading = false;
        }
      )
      .addCase(fetchAvailableIssues.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Could not fetch issues list.';
        state.loading = false;
      });
  },
});

export const {
  setActiveIssue,
  setIssueLoading,
  setIssueError,
  setUsingMock,
} = issueSlice.actions;

export default issueSlice.reducer;
