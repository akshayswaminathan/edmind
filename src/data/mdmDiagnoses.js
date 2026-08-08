// Diagnosis source for the MDM writer, derived from the existing differential
// database (src/data/differentials.js). Provides:
//   - MDM_COMPLAINTS: searchable chief-complaint list, each with tiered dx
//   - getComplaintDiagnoses(slug): diagnoses for one complaint
//   - ALL_DIAGNOSES: de-duplicated diagnosis index for global search / add

import { differentials } from './differentials';

// tier: 'red' = must-not-miss, 'common', 'rare'
function buildComplaint(slug, data) {
  const seen = new Set();
  const diagnoses = [];
  const push = (name, tier) => {
    const key = name.trim().toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    diagnoses.push({ name: name.trim(), tier });
  };

  (data.mustNotMiss || []).forEach(d => push(d.diagnosis, 'red'));
  (data.common || []).forEach(name => push(name, 'common'));
  (data.rare || []).forEach(name => push(name, 'rare'));

  return {
    slug,
    name: data.chiefComplaint,
    diagnoses,
    redCount: diagnoses.filter(d => d.tier === 'red').length,
  };
}

export const MDM_COMPLAINTS = Object.entries(differentials)
  .map(([slug, data]) => buildComplaint(slug, data))
  .sort((a, b) => a.name.localeCompare(b.name));

const COMPLAINT_BY_SLUG = Object.fromEntries(MDM_COMPLAINTS.map(c => [c.slug, c]));

export function getComplaintDiagnoses(slug) {
  return COMPLAINT_BY_SLUG[slug]?.diagnoses || [];
}

// De-duplicated diagnosis index across all complaints (for global search).
const diagnosisMap = new Map();
for (const complaint of MDM_COMPLAINTS) {
  for (const dx of complaint.diagnoses) {
    const key = dx.name.toLowerCase();
    if (!diagnosisMap.has(key)) {
      diagnosisMap.set(key, { name: dx.name, tier: dx.tier, complaints: [complaint.name] });
    } else {
      const existing = diagnosisMap.get(key);
      if (!existing.complaints.includes(complaint.name)) existing.complaints.push(complaint.name);
      // Prefer the most urgent tier when a dx appears under multiple complaints.
      const rank = { red: 0, common: 1, rare: 2 };
      if (rank[dx.tier] < rank[existing.tier]) existing.tier = dx.tier;
    }
  }
}

export const ALL_DIAGNOSES = Array.from(diagnosisMap.values())
  .sort((a, b) => a.name.localeCompare(b.name));

export function searchDiagnoses(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_DIAGNOSES
    .filter(d => d.name.toLowerCase().includes(q))
    .slice(0, limit);
}
