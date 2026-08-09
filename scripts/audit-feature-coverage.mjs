// Feature-coverage audit for the MDM Writer.
//
// Cross-references every diagnosis surfaced by the differential database
// (src/data/differentials.js) against the curated finding library
// (src/data/mdmFeatures.js) and reports which diagnoses have a hand-authored
// feature set vs. which fall back to the generic scaffold.
//
// Usage:
//   node scripts/audit-feature-coverage.mjs            # summary + gaps
//   node scripts/audit-feature-coverage.mjs --all      # every diagnosis
//   node scripts/audit-feature-coverage.mjs --json     # machine-readable
//
// This is the maintenance workflow for "fleshing out the buttons": run it,
// author curated sets for the flagged gaps (highest tiers first), re-run.

import { differentials } from '../src/data/differentials.js';
import { getFeatureSet } from '../src/data/mdmFeatures.js';

const args = new Set(process.argv.slice(2));
const showAll = args.has('--all');
const asJson = args.has('--json');

// tier rank for sorting: red (must-not-miss) first, then common, then rare
const TIER_RANK = { red: 0, common: 1, rare: 2 };

// Collect unique diagnoses with their most-urgent tier and the complaints they
// appear under (mirrors the de-dup logic in mdmDiagnoses.js).
const byName = new Map();
const add = (name, tier, complaint) => {
  const clean = (name || '').trim();
  if (!clean) return;
  const key = clean.toLowerCase();
  if (!byName.has(key)) byName.set(key, { name: clean, tier, complaints: [complaint] });
  const e = byName.get(key);
  if (!e.complaints.includes(complaint)) e.complaints.push(complaint);
  if (TIER_RANK[tier] < TIER_RANK[e.tier]) e.tier = tier;
};

for (const data of Object.values(differentials)) {
  const cc = data.chiefComplaint;
  (data.mustNotMiss || []).forEach(d => add(d.diagnosis, 'red', cc));
  (data.common || []).forEach(n => add(n, 'common', cc));
  (data.rare || []).forEach(n => add(n, 'rare', cc));
}

const rows = [...byName.values()]
  .map(e => {
    const fs = getFeatureSet(e.name);
    const groups = fs.groups || {};
    const featureCount = Object.values(groups).reduce((n, g) => n + (g?.length || 0), 0);
    return { ...e, curated: fs.matched, canonical: fs.name || null, featureCount };
  })
  .sort((a, b) =>
    (TIER_RANK[a.tier] - TIER_RANK[b.tier]) || a.name.localeCompare(b.name)
  );

const total = rows.length;
const curated = rows.filter(r => r.curated);
const gaps = rows.filter(r => !r.curated);

const byTier = tier => ({
  total: rows.filter(r => r.tier === tier).length,
  curated: rows.filter(r => r.tier === tier && r.curated).length,
});

if (asJson) {
  console.log(JSON.stringify({ total, curated: curated.length, gaps: gaps.length, rows }, null, 2));
  process.exit(0);
}

const pct = (a, b) => (b === 0 ? '—' : `${Math.round((100 * a) / b)}%`);

console.log('\n  MDM Writer — finding-set coverage\n');
console.log(`  Curated diagnoses in library : ${curated.length}`);
console.log(`  Unique diagnoses in DB       : ${total}`);
console.log(`  Overall coverage             : ${pct(curated.length, total)}\n`);
for (const tier of ['red', 'common', 'rare']) {
  const t = byTier(tier);
  const label = { red: 'Must-not-miss', common: 'Common      ', rare: 'Rare        ' }[tier];
  console.log(`    ${label} : ${t.curated}/${t.total}  (${pct(t.curated, t.total)})`);
}

const list = showAll ? rows : gaps;
console.log(`\n  ${showAll ? 'All diagnoses' : 'Gaps (generic fallback only)'} — ${list.length} shown:\n`);
const dot = { red: '●', common: '○', rare: '·' };
for (const r of list) {
  const mark = r.curated ? `✓ ${r.canonical !== r.name ? `→ ${r.canonical}` : ''}` : '  (generic)';
  console.log(`   ${dot[r.tier]} ${r.name.padEnd(48)} ${mark}`);
}
console.log('');
