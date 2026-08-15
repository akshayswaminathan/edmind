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

// Generate a candidate differential from a free-text chief complaint that isn't
// an existing diagnosis in the database. Returns { complaint, diagnoses:[{name,tier}] }.
// The clinician picks which to add — nothing is added automatically.
export async function suggestDiagnoses(complaint) {
  const response = await fetch('/api/suggest-diagnoses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaint }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Could not suggest diagnoses');
  }

  return response.json();
}

// AI fallback for plan suggestions when a diagnosis has no curated/learned
// associations. Returns { plan: { Labs:[], Imaging:[], ... } } keyed by the
// standard plan categories.
export async function suggestPlan(diagnoses) {
  const response = await fetch('/api/suggest-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnoses }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Could not suggest a plan');
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
