// Gold-standard chief complaints + differentials
// Source: ScienceDirect supplementary table S5 (mmc5.docx)
// Red = must-not-miss (life-threatening, requires immediate stabilization)
// Yellow = important (must rule out before discharge)

import goldStandard from './gold_standard.json';
import synonymMap from './synonym_map.json';

// Build structured complaint map keyed by slug
// e.g. "Fever" -> "fever", "Chest pain" -> "chest_pain"
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[・]/g, '_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export const complaints = {};

for (const item of goldStandard) {
  const slug = toSlug(item.chiefComplaint);
  complaints[slug] = {
    chiefComplaint: item.chiefComplaint,
    slug,
    red: item.red.map(d => d.name),
    yellow: item.yellow.map(d => d.name),
    redDetails: item.red,
    yellowDetails: item.yellow,
  };
}

// Export the synonym map for use in scoring
export { synonymMap };

// Export complaint list for UI
export const COMPLAINT_LIST = Object.values(complaints).map(c => ({
  slug: c.slug,
  name: c.chiefComplaint,
  redCount: c.red.length,
  yellowCount: c.yellow.length,
  totalCount: c.red.length + c.yellow.length,
}));

export const COMPLAINT_SLUGS = Object.keys(complaints);
