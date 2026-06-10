/** User-facing labels for issue_index status values (not pipeline internals). */

export function issueHeroBadge(status: string): string | null {
  if (status === 'audio_ready') {
    return 'Audio available';
  }
  if (status === 'failed') {
    return 'Unavailable';
  }
  return null;
}

export function issueCardBadge(status: string): string {
  if (status === 'audio_ready') {
    return 'Audio available';
  }
  if (status === 'failed') {
    return 'Unavailable';
  }
  return 'Read now';
}
