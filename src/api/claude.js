// API wrapper — calls our Express backend for scoring
export async function scoreDifferential(chiefComplaint, userList, complaintSlug) {
  const response = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chiefComplaint, userList, complaintSlug })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Scoring failed');
  }

  return response.json();
}
