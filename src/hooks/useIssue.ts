import { useEffect } from 'react';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/firebase';
import { isProd } from '@lib/app/env';
import { MOCK_ISSUE } from '@lib/issues/mockIssue';
import { normalizeIssue } from '@lib/issues/issue.utils';
import { useAppDispatch, useAppSelector } from '@store/index';
import {
  setActiveIssue,
  setIssueLoading,
  setIssueError,
  setUsingMock,
} from '@store/issueSlice';
import type { BrewIssue } from '@lib/models';

interface UseIssueState {
  issue: BrewIssue | null;
  loading: boolean;
  error: string | null;
  isUsingMock: boolean;
}

export function useIssue(issueId: string): UseIssueState {
  const dispatch = useAppDispatch();
  const { activeIssue, issueLoading, error, isUsingMock } = useAppSelector((state) => state.issue);

  useEffect(() => {
    if (!issueId) {
      dispatch(setIssueError('Missing issue id.'));
      dispatch(setIssueLoading(false));
      return;
    }

    // Fallback if Firebase is not configured or fails
    if (!isFirebaseConfigured || !db) {
      if (isProd) {
        dispatch(setUsingMock(false));
        dispatch(setActiveIssue(null));
        dispatch(setIssueLoading(false));
        dispatch(setIssueError('Unable to load issue. Firebase is not configured for this build.'));
        return;
      }

      dispatch(setUsingMock(true));
      const mockIssue = { ...MOCK_ISSUE, id: issueId, date: issueId };
      dispatch(setActiveIssue(mockIssue));
      dispatch(setIssueLoading(false));
      dispatch(setIssueError(null));
      return;
    }

    dispatch(setIssueLoading(true));
    dispatch(setUsingMock(false));

    const issueRef = doc(db, 'issues', issueId);

    const applySnapshot = (exists: boolean, data: unknown) => {
      dispatch(setIssueError(null));
      if (!exists) {
        dispatch(setActiveIssue(null));
        dispatch(setIssueLoading(false));
        return;
      }

      const normalized = normalizeIssue(data, issueId);
      dispatch(setActiveIssue(normalized));
      dispatch(setIssueLoading(false));
    };

    void getDocFromServer(issueRef)
      .then((snapshot) => {
        applySnapshot(snapshot.exists(), snapshot.exists() ? snapshot.data() : null);
      })
      .catch((readError: Error) => {
        dispatch(setIssueError(readError.message || 'Unable to read issue data.'));
        dispatch(setActiveIssue(null));
        dispatch(setIssueLoading(false));
      });

    const unsubscribe = onSnapshot(
      issueRef,
      (snapshot) => {
        applySnapshot(snapshot.exists(), snapshot.exists() ? snapshot.data() : null);
      },
      (readError) => {
        const message = readError.message || 'Unable to read issue data.';
        dispatch(setIssueError(message));
        dispatch(setActiveIssue(null));
        dispatch(setIssueLoading(false));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [issueId, dispatch]);

  return {
    issue: activeIssue,
    loading: issueLoading,
    error,
    isUsingMock,
  };
}
