// Pure MDM text generator. Turns the clinician's structured, de-identified
// selections into the templated medical-decision-making paragraph.
//
// Grounded in the EM Tools MDM design brief:
//   - Nothing is emitted that the user did not affirmatively click (P1/P2).
//   - Length scales with clicks; a short input yields a short note (§6).
//   - Language avoids "rules out"/"normal"; prefers "less likely" (§7).
//   - Independent reads are attributed "on my interpretation" (§7, P7).
//   - The note produces the INITIAL reasoning and stops at the handoff (P9).
//
// Input shape:
// {
//   oneLiner: { age, sex, pmh:[str], chiefComplaint, concern },
//   diagnoses: [{
//     name,
//     tier: 'likely' | 'cantmiss' | 'less' | null,
//     features: { group: [{ label, dir, id }] },
//     state:    { [featureId]: 'present' | 'absent' | 'pending' },
//   }],
//   interpretations: [{ study, read }],
//   deferred:        [{ item, rationale }],
//   calculators:     [{ name, impact }],
//   consult:         { who, what },
//   reassessment:    { on, text },
//   sdm:             { on, text },
//   uncertainty:     { on, text },
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

// ── One-liner ──────────────────────────────────────────────────────────────
export function buildOneLiner({ age, sex, pmh = [], chiefComplaint, concern } = {}) {
  const cc = (chiefComplaint || '').trim() || '[chief complaint]';
  const ageStr = age && String(age).trim() ? `${String(age).trim()}yo` : '';
  const ageSex = [ageStr, sex && sex.trim()].filter(Boolean).join(' ');
  const pmhStr = pmh.filter(Boolean).join(', ');
  const concernStr = (concern || '').trim();
  const tail = concernStr ? ` concerning for ${phrase(concernStr)}` : '';

  if (ageSex) {
    // e.g. "58yo male with a history of HTN, DM2 presenting with chest pain
    //       concerning for acute coronary syndrome."
    return `${ageSex}${pmhStr ? ` with a history of ${pmhStr}` : ''} presenting with ${cc}${tail}.`;
  }
  return `The patient${pmhStr ? ` has a history of ${pmhStr} and` : ''} presents with ${cc}${tail}.`;
}

// True when the clinician has entered any part of the one-liner. Keeps the live
// note from opening with an all-placeholder HPI before anything is set.
export function hasOneLiner({ age, sex, pmh = [], chiefComplaint, concern } = {}) {
  return Boolean(
    (age && String(age).trim()) || (sex && sex.trim()) || pmh.filter(Boolean).length ||
    (chiefComplaint && chiefComplaint.trim()) || (concern && concern.trim())
  );
}

// ── Per-diagnosis reasoning ─────────────────────────────────────────────────
// Grammatical "absence of X" that avoids double negatives when a label is itself
// phrased negatively (e.g. "Absence of cremasteric reflex" -> "the absence of
// cremasteric reflex", not "the absence of absence of cremasteric reflex").
function absenceOf(label) {
  let p = phrase(label);
  const m = p.match(/^(?:absence of|absent|no|lack of|negative(?: for)?)\s+([a-z].*)$/i);
  if (m && !/^(?:or|and)\b/i.test(m[1])) p = m[1];
  return `the absence of ${p}`;
}

function collectFindings(dx) {
  const supporting = [];
  const against = [];
  const pending = [];
  const seen = new Set();               // dedup identical phrases across buckets
  const push = (arr, text) => {
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    arr.push(text);
  };

  for (const group of Object.keys(dx.features || {})) {
    for (const f of dx.features[group]) {
      const s = dx.state?.[f.id];
      if (!s) continue;
      if (s === 'pending') { push(pending, phrase(f.label)); continue; }
      if (s === 'present') {
        push(f.dir === 'against' ? against : supporting, phrase(f.label));
      } else if (s === 'absent') {
        push(f.dir === 'against' ? supporting : against, absenceOf(f.label));
      }
    }
  }
  return {
    support: joinList(supporting),
    against: joinList(against),
    pending: joinList(pending),
  };
}

// Decision instruments attached to this diagnosis, as a trailing sentence.
function calcSentence(calculators = []) {
  const items = calculators
    .filter(c => (c?.name || '').trim())
    .map(c => {
      const impact = (c.impact || '').trim();
      return impact ? `${c.name.trim()} (${impact})` : c.name.trim();
    });
  return items.length ? ` Risk stratified with ${joinList(items)}.` : '';
}

function reasonForDiagnosis(dx) {
  const { support, against, pending } = collectFindings(dx);
  const pendingClause = pending ? ` Workup pending: ${pending}.` : '';
  const calcClause = calcSentence(dx.calculators);

  if (dx.tier === 'likely') {
    let s = `${dx.name} is felt to be the most likely diagnosis`;
    s += support ? `, supported by ${support}.` : '.';
    if (against) s += ` Arguing against this diagnosis: ${against}.`;
    return s + pendingClause + calcClause;
  }

  if (dx.tier === 'cantmiss') {
    let s = `${dx.name} is a can't-miss diagnosis that was considered and addressed`;
    if (against) s += `; it is made less likely by ${against}`;
    s += '.';
    if (support) s += ` Features that raise concern include ${support}.`;
    return s + pendingClause + calcClause;
  }

  if (dx.tier === 'less') {
    let s = against
      ? `${dx.name} is felt to be less likely given ${against}.`
      : `${dx.name} is felt to be less likely.`;
    if (support) s += ` Features that could support it include ${support}.`;
    return s + pendingClause + calcClause;
  }

  // Untiered — still summarize whatever was marked.
  if (against) {
    let s = `${dx.name} is felt to be less likely given ${against}.`;
    if (support) s += ` Features that could support it include ${support}.`;
    return s + pendingClause + calcClause;
  }
  if (support) return `${dx.name} remains under consideration given ${support}.${pendingClause}${calcClause}`;
  if (pending) return `${dx.name} was considered.${pendingClause}${calcClause}`;
  if (calcClause) return `${dx.name} was considered.${calcClause}`;
  return `${dx.name} was considered.`;
}

const TIER_RANK = { likely: 0, cantmiss: 1, less: 2, null: 3 };

// ── Plan ─────────────────────────────────────────────────────────────────────
// Returns { lines, disposition }: `lines` are the bulleted plan entries and
// `disposition` is pulled out so it can be surfaced on its own line. Medications
// are reported by their clinician-facing groups (analgesia, fluids, …).
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
  return { lines, disposition };
}

// ── Assemble ─────────────────────────────────────────────────────────────────
// Sections are separated by a blank line and use plain-text headers (no markdown
// bold), so the pasted note carries no formatting artifacts. The note opens with
// the Assessment (no HPI), and closes with a plain handoff line (no heading).
export function generateMdm(input = {}) {
  const {
    diagnoses = [],
    reassessment = {},
    sdm = {},
    uncertainty = {},
    plan = {},
    handoffLine,
  } = input;

  const sections = [];

  // 1) Assessment — per-diagnosis reasoning, ordered by tier. No opening summary.
  if (diagnoses.length) {
    const ordered = [...diagnoses].sort(
      (a, b) => (TIER_RANK[a.tier] ?? 3) - (TIER_RANK[b.tier] ?? 3)
    );
    const reasoning = ordered.map(reasonForDiagnosis).filter(Boolean).join('\n');
    if (reasoning) sections.push(`Assessment:\n${reasoning}`);
  }

  // 2) Plan — ordered categories, then serial reassessment / shared
  //    decision-making / diagnostic uncertainty, each as its own bullet.
  const { lines: planLines, disposition } = buildPlan(plan);
  if (reassessment.on) {
    const t = (reassessment.text || '').trim();
    planLines.push(`The patient will be serially reassessed${t ? ` for ${t}` : ''}.`);
  }
  if (sdm.on) {
    const t = (sdm.text || '').trim();
    planLines.push(`Shared decision-making was performed with the patient${t ? ` regarding ${t}` : ''}.`);
  }
  if (uncertainty.on) {
    const t = (uncertainty.text || '').trim();
    planLines.push(`Diagnostic uncertainty and return precautions were discussed with the patient${t ? `, including ${t}` : ''}.`);
  }
  if (planLines.length) {
    sections.push(`Plan:\n${planLines.map(l => `• ${l}`).join('\n')}`);
  }

  // 3) Disposition
  if (disposition) sections.push(`Disposition: ${cap(disposition)}.`);

  // 4) Handoff — a plain closing line, no heading.
  const handoff = (handoffLine || '').trim() || DEFAULT_HANDOFF;
  sections.push(handoff);

  return sections.join('\n\n');
}
