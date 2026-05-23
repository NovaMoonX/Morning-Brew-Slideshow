import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

import { db, isFirebaseConfigured } from '@/firebase';
import { MOCK_ISSUE } from '@lib/issues/mockIssue';
import { normalizeIssue } from '@lib/issues/issue.utils';
import type { BrewIssue } from '@lib/models';

interface UseIssueState {
issue: BrewIssue | null;
loading: boolean;
error: string | null;
isUsingMock: boolean;
}

export function useIssue(issueId: string): UseIssueState {
const [issue, setIssue] = useState<BrewIssue | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
if (!issueId) {
setIssue(null);
setLoading(false);
setError('Missing issue id.');
return;
}

if (!isFirebaseConfigured || !db) {
setIssue({ ...MOCK_ISSUE, id: issueId, date: issueId });
setLoading(false);
setError(null);
return;
}

setLoading(true);
setError(null);

const issueRef = doc(db, 'issues', issueId);
const unsubscribe = onSnapshot(
issueRef,
(snapshot) => {
if (!snapshot.exists()) {
setIssue(null);
setLoading(false);
return;
}

const normalized = normalizeIssue(snapshot.data(), issueId);
setIssue(normalized);
setLoading(false);
},
(readError) => {
const message = readError.message || 'Unable to read issue data.';
setError(message);
setIssue(null);
setLoading(false);
},
);

return () => {
unsubscribe();
};
}, [issueId]);

const isUsingMock = useMemo(() => {
const result = !isFirebaseConfigured;
return result;
}, []);

return { issue, loading, error, isUsingMock };
}
