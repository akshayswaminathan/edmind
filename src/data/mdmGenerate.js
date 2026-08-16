// Pure MDM text generator. Turns the clinician's structured, de-identified
// selections into the templated medical-decision-making paragraph.
//
// Grounded in the EM Tools MDM design brief:
//   - Nothing is emitted that the user did not affirmatively click (P1/P2).
//   - Length scales with clicks; a short input yields a short note (§6).
//   - Language avoids "rules out"/"normal"; prefers "less likely" (§7).
//   - The note produces the INITIAL reasoning and stops at the handoff (P9).
//
// The assessment is header-free: each diagnosis's tier (most likely / can't-miss
// / less likely / under consideration) is stated inline, so no separate
// differential summary is needed. The plan is written under a "Plan:" heading.
//
// Input shape:
// {
//   diagnoses: [{
//     name,
//     tier: 'likely' | 'cantmiss' | 'less' | 'consideration' | null,
//     features: { group: [{ label, dir, id, study? }] },
//     state:    { [featureId]: 'present' | 'absent' | 'pending' },
//   }],
//   plan: {
//     Analgesia:[], 'IV Fluids':[], Antiemetics:[], Sedation:[], Antimicrobials:[],
//     Labs:[], Imaging:[], Procedures:[], Consults:[], Disposition:[],
//   },
//   handoffLine: string,
// }

export const DEFAULT_HANDOFF = 'See the ED course for further workup and disposition.';

// Grammatical list join with an Oxford comma.
function joinList(items) {
  const arr = items.filter(Boolean);
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Lowercase the first word only when it's an ordinary capitalized word, so
// "Elevated troponin" -> "elevated troponin" but "RLQ pain", "ECG changes",
// and "S3 gallop" are preserved.
function phrase(label) {
  const first = label.split(' ')[0];
  if (/^[A-Z][a-z]/.test(first)) return label.charAt(0).toLowerCase() + label.slice(1);
  return label;
}

// The study/order that is pending for a finding. Prefers an explicit `study`
// field on the feature; otherwise strips the descriptive tail from the label
// (e.g. "CT urogram showing a mass" -> "CT urogram") so the note reads
// "pending CT urogram", never "pending CT urogram showing a mass".
const MODALITY = /\b(CTA?|CXR|E[CK]G|echo(?:cardiogram)?|ultrasound|US|POCUS|MRI|MRA|X-?ray|radiograph|KUB|esophagram|angiogram|urinalysis|UA|CT\s+\w+)\b/i;

export function pendingStudy(feature) {
  if (feature && typeof feature.study === 'string' && feature.study.trim()) {
    return feature.study.trim();
  }
  const label = (feature?.label || '').trim();
  // Two phrasings appear in the library:
  //   "finding on <study>"  -> the study follows "on" (e.g. "Filling defect on CTA chest")
  //   "<study> showing finding" -> the study precedes (e.g. "CT urogram showing a mass")
  // Either way we want just the study/order, never the finding it revealed.
  const onMatch = label.match(/^(.*?)\s+on\s+(.+)$/i);
  if (onMatch && MODALITY.test(onMatch[2])) return onMatch[2].trim();

  const cut = label.split(/\s+(?:showing|demonstrating|with|revealing|consistent with|suggestive of|positive for)\b/i)[0];
  return (cut || label).trim();
}

// ── Per-diagnosis reasoning ─────────────────────────────────────────────────
// Collects the clinician's marks into de-duplicated support / against clauses.
// Absences are grouped so multiple negatives read "the absence of X, Y, and Z"
// rather than "the absence of X, the absence of Y, and the absence of Z".
function collectFindings(dx) {
  const supportPresent = [];  // for-features marked present
  const supportAbsent = [];   // against-features marked absent (their absence supports)
  const againstPresent = [];  // against-features marked present
  const againstAbsent = [];   // for-features marked absent (their absence argues against)
  const pending = [];

  for (const group of Object.keys(dx.features || {})) {
    for (const f of dx.features[group]) {
      const s = dx.state?.[f.id];
      if (!s) continue;
      if (s === 'pending') { pending.push(pendingStudy(f)); continue; }
      if (s === 'present') {
        if (f.dir === 'against') againstPresent.push(phrase(f.label));
        else supportPresent.push(phrase(f.label));
      } else if (s === 'absent') {
        if (f.dir === 'against') supportAbsent.push(phrase(f.label));
        else againstAbsent.push(phrase(f.label));
      }
    }
  }

  const supportClauses = [...supportPresent];
  if (supportAbsent.length) supportClauses.push(`the absence of ${joinList(supportAbsent)}`);
  const againstClauses = [...againstPresent];
  if (againstAbsent.length) againstClauses.push(`the absence of ${joinList(againstAbsent)}`);

  return {
    support: joinList(supportClauses),
    against: joinList(againstClauses),
    pending: joinList(dedupe(pending)),
  };
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function reasonForDiagnosis(dx) {
  const { support, against, pending } = collectFindings(dx);
  const pendingClause = pending ? ` Pending ${pending}.` : '';

  if (dx.tier === 'likely') {
    let s = `${dx.name} is felt to be the most likely diagnosis`;
    s += support ? `, supported by ${support}.` : '.';
    if (against) s += ` Arguing against this diagnosis: ${against}.`;
    return s + pendingClause;
  }

  if (dx.tier === 'cantmiss') {
    let s = `${dx.name} is a can't-miss diagnosis under consideration`;
    if (against) s += `; it is made less likely by ${against}`;
    s += '.';
    if (support) s += ` Features that raise concern include ${support}.`;
    return s + pendingClause;
  }

  if (dx.tier === 'less') {
    let s = against
      ? `${dx.name} is felt to be less likely given ${against}.`
      : `${dx.name} is felt to be less likely.`;
    if (support) s += ` Features that could support it include ${support}.`;
    return s + pendingClause;
  }

  // Under consideration — the explicit 4th tier and the default when no tier is
  // selected. Still summarizes whatever the clinician marked.
  let s = `${dx.name} is under consideration`;
  if (support && against) {
    s += `, supported by ${support} though made less likely by ${against}.`;
  } else if (support) {
    s += `, supported by ${support}.`;
  } else if (against) {
    s += `; it is made less likely by ${against}.`;
  } else {
    s += '.';
  }
  return s + pendingClause;
}

const TIER_RANK = { likely: 0, cantmiss: 1, less: 2, consideration: 3, null: 4 };

// ── Plan ─────────────────────────────────────────────────────────────────────
// Returns the bulleted plan entries. Medications are reported by their
// clinician-facing groups (analgesia, fluids, …). Disposition is folded in as a
// final bullet so the whole plan reads under one "Plan:" heading.
function buildPlan(plan = {}) {
  const lines = [];
  const seg = (label, items) => {
    const arr = (items || []).filter(Boolean);
    if (arr.length) lines.push(`${label}: ${joinList(arr)}.`);
  };

  seg('Analgesia', plan.Analgesia);
  seg('IV fluids', plan['IV Fluids']);
  seg('Antiemetics', plan.Antiemetics);
  seg('Sedation', plan.Sedation);
  seg('Antimicrobials', plan.Antimicrobials);
  // A single "Medications" bucket is still honored for backward compatibility.
  seg('Medications', plan.Medications);

  const workup = [...(plan.Labs || []), ...(plan.Imaging || [])].filter(Boolean);
  if (workup.length) lines.push(`Workup ordered: ${joinList(workup)}.`);

  seg('Procedures', plan.Procedures);
  seg('Consults', plan.Consults);

  const disposition = joinList((plan.Disposition || []).filter(Boolean));
  if (disposition) lines.push(`Disposition: ${cap(disposition)}.`);

  return lines;
}

// ── Assemble ─────────────────────────────────────────────────────────────────
// The note is built as an ordered list of BLOCKS — one assessment paragraph per
// diagnosis (ordered by tier), then a labeled "Plan:" block of bullets, then the
// handoff line. Each block carries a stable `id` so the UI can drag-reorder them.
//
// Returns [{ id, type: 'assessment' | 'plan' | 'handoff', text }]. `generateMdm`
// joins the blocks (in this default order) into the plain-text note.
export function generateMdmBlocks(input = {}) {
  const {
    diagnoses = [],
    plan = {},
    handoffLine,
  } = input;

  const blocks = [];

  // 1) Assessment — per-diagnosis reasoning, ordered by tier. No summary sentence
  //    and no header; each diagnosis states its own tier inline.
  if (diagnoses.length) {
    const ordered = [...diagnoses].sort(
      (a, b) => (TIER_RANK[a.tier] ?? 4) - (TIER_RANK[b.tier] ?? 4)
    );
    for (const dx of ordered) {
      const text = reasonForDiagnosis(dx);
      if (text) blocks.push({ id: `dx:${dx.name}`, type: 'assessment', text });
    }
  }

  // 2) Plan — a labeled "Plan:" heading followed by one bullet per category
  //    (disposition folded in as the closing bullet).
  const planLines = buildPlan(plan);
  if (planLines.length) {
    const text = ['Plan:', ...planLines.map(l => `• ${l}`)].join('\n');
    blocks.push({ id: 'plan', type: 'plan', text });
  }

  // 3) Handoff line — closes the note, unlabeled.
  const handoff = (handoffLine || '').trim();
  if (handoff) blocks.push({ id: 'handoff', type: 'handoff', text: handoff });

  return blocks;
}

// Plain-text note in the default (tier-sorted) block order. The UI may reorder
// the blocks from generateMdmBlocks() before joining for a custom arrangement.
export function generateMdm(input = {}) {
  return generateMdmBlocks(input).map(b => b.text).join('\n\n');
}
