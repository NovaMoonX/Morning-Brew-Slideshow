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

const nonRealtimeState = useMemo<UseIssueState | null>(() => {
if (!issueId) {
const result: UseIssueState = {
	issue: null,
	loading: false,
	error: 'Missing issue id.',
	isUsingMock: false,
};
return result;
}

if (!isFirebaseConfigured || !db) {
const result: UseIssueState = {
	issue: { ...MOCK_ISSUE, id: issueId, date: issueId },
	loading: false,
	error: null,
	isUsingMock: true,
};
return result;
}

const result = null;
return result;
}, [issueId]);

useEffect(() => {
if (nonRealtimeState || !db) {
return;
}

const issueRef = doc(db, 'issues', issueId);
const unsubscribe = onSnapshot(
issueRef,
(snapshot) => {
setError(null);
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
}, [issueId, nonRealtimeState]);

const isUsingMock = useMemo(() => {
const result = !isFirebaseConfigured;
return result;
}, []);

if (nonRealtimeState) {
return nonRealtimeState;
}

return { issue, loading, error, isUsingMock };
}
