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
