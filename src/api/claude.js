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

// Patient chat — AI role-plays as the patient
export async function chatWithPatient(caseId, messages) {
  const response = await fetch('/api/patient-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, messages }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Chat failed');
  }

  return response.json();
}

// Order a test and get results
export async function orderTest(caseId, orderType, orderName) {
  const response = await fetch('/api/order-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, orderType, orderName }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Order failed');
  }

  return response.json();
}

// Draft a finding-button set for a diagnosis with no curated set in the library.
// Returns { diagnosis, groups: { History:[{label,dir}], ... }, generated:true }.
// The clinician curates the draft on screen — see docs/mdm-finding-framework.md.
export async function suggestFindings(diagnosis) {
  const response = await fetch('/api/suggest-findings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosis }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Could not suggest findings');
  }

  return response.json();
}

// Reason over the library to propose a differential from a free-text phrase
// (chief complaint, leading diagnosis, or short vignette). `catalog` is the list
// of diagnosis names the tool knows, so suggestions map back to library entries.
// Returns { phrase, suggestions: [{ name, tier, reason }] }.
export async function suggestDifferential(phrase, catalog) {
  const response = await fetch('/api/suggest-differential', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phrase, catalog }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Could not suggest a differential');
  }

  return response.json();
}

// Load the shared finding-library overrides (published by admins, seen by all).
// Returns { overrides, configured }. Never throws for the common "not
// configured" / offline cases — the app falls back to its built-in + local set.
export async function fetchSharedLibrary() {
  try {
    const response = await fetch('/api/library');
    if (!response.ok) return { overrides: {}, configured: false };
    return await response.json();
  } catch {
    return { overrides: {}, configured: false };
  }
}

// Publish one diagnosis entry to the shared library (curated server-side).
// `token` is checked against ADMIN_TOKEN on the server. Returns the refreshed
// { overrides } document (and the curated entry).
export async function publishSharedDiagnosis({ id, entry, del = false }, token) {
  const response = await fetch('/api/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '' },
    body: JSON.stringify({ id, entry, delete: del }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Publish failed');
  }
  return response.json();
}

// Get AI feedback on trainee performance
export async function getCaseFeedback(caseId, differential, presentationAndMdm) {
  const response = await fetch('/api/case-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, differential, presentationAndMdm }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Feedback failed');
  }

  return response.json();
}
