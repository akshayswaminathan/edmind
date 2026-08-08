// Pure MDM text generator. Turns the clinician's structured, de-identified
// selections into the templated medical-decision-making paragraph.
//
// Grounded in the EDMind MDM design brief:
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
//   plan: { Medications:[], Labs:[], Imaging:[], Consults:[], Procedures:[], Disposition:[] },
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

// ── Per-diagnosis reasoning ─────────────────────────────────────────────────
function collectFindings(dx) {
  const supporting = [];
  const against = [];
  const pending = [];

  for (const group of Object.keys(dx.features || {})) {
    for (const f of dx.features[group]) {
      const s = dx.state?.[f.id];
      if (!s) continue;
      if (s === 'pending') { pending.push(phrase(f.label)); continue; }
      if (s === 'present') {
        if (f.dir === 'against') against.push(phrase(f.label));
        else supporting.push(phrase(f.label));
      } else if (s === 'absent') {
        if (f.dir === 'against') supporting.push(`the absence of ${phrase(f.label)}`);
        else against.push(`the absence of ${phrase(f.label)}`);
      }
    }
  }
  return {
    support: joinList(supporting),
    against: joinList(against),
    pending: joinList(pending),
  };
}

function reasonForDiagnosis(dx) {
  const { support, against, pending } = collectFindings(dx);
  const pendingClause = pending ? ` Workup pending: ${pending}.` : '';

  if (dx.tier === 'likely') {
    let s = `${dx.name} is felt to be the most likely diagnosis`;
    s += support ? `, supported by ${support}.` : '.';
    if (against) s += ` Arguing against this diagnosis: ${against}.`;
    return s + pendingClause;
  }

  if (dx.tier === 'cantmiss') {
    let s = `${dx.name} is a can't-miss diagnosis that was considered and addressed`;
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

  // Untiered — still summarize whatever was marked.
  if (against) {
    let s = `${dx.name} is felt to be less likely given ${against}.`;
    if (support) s += ` Features that could support it include ${support}.`;
    return s + pendingClause;
  }
  if (support) return `${dx.name} remains under consideration given ${support}.${pendingClause}`;
  if (pending) return `${dx.name} was considered.${pendingClause}`;
  return `${dx.name} was considered.`;
}

const TIER_RANK = { likely: 0, cantmiss: 1, less: 2, null: 3 };

// ── Plan ─────────────────────────────────────────────────────────────────────
function buildPlan(plan = {}) {
  const lines = [];
  const meds = (plan.Medications || []).filter(Boolean);
  const workup = [...(plan.Labs || []), ...(plan.Imaging || [])].filter(Boolean);
  const procedures = (plan.Procedures || []).filter(Boolean);
  const consults = (plan.Consults || []).filter(Boolean);
  const dispo = (plan.Disposition || []).filter(Boolean);

  if (workup.length) lines.push(`Workup ordered: ${joinList(workup)}.`);
  if (meds.length) lines.push(`Treatment: ${joinList(meds)}.`);
  if (procedures.length) lines.push(`Procedures: ${joinList(procedures)}.`);
  if (consults.length) lines.push(`Consults: ${joinList(consults)}.`);
  if (dispo.length) lines.push(`Disposition: ${joinList(dispo)}.`);
  return lines;
}

// ── Assemble ─────────────────────────────────────────────────────────────────
export function generateMdm(input = {}) {
  const {
    diagnoses = [],
    interpretations = [],
    deferred = [],
    calculators = [],
    consult = {},
    reassessment = {},
    sdm = {},
    uncertainty = {},
    plan = {},
    handoffLine,
  } = input;

  const sections = [];

  // 1) Differential summary + per-diagnosis reasoning (ordered by tier)
  if (diagnoses.length) {
    const names = diagnoses.map(d => d.name);
    const mostLikely = diagnoses.find(d => d.tier === 'likely');
    let summary = `The differential diagnosis includes ${joinList(names)}.`;
    if (mostLikely) summary += ` ${mostLikely.name} is felt to be most likely.`;
    sections.push(summary);

    const ordered = [...diagnoses].sort(
      (a, b) => (TIER_RANK[a.tier] ?? 3) - (TIER_RANK[b.tier] ?? 3)
    );
    const reasoning = ordered.map(reasonForDiagnosis).join(' ');
    if (reasoning) sections.push(reasoning);
  }

  // 3) Independent interpretations (attributed) — Data Category 2
  const reads = interpretations.filter(i => (i.study || '').trim() && (i.read || '').trim());
  if (reads.length) {
    const parts = reads.map(i => `${i.study.trim()}, ${phrase(i.read.trim())}`);
    sections.push(`On my independent interpretation: ${parts.join('; ')}.`);
  }

  // 4) Plan
  const planLines = buildPlan(plan);
  if (planLines.length) sections.push(`Plan: ${planLines.join(' ')}`);

  // 5) Consultant discussion — Data Category 3
  if ((consult.who || '').trim()) {
    const what = (consult.what || '').trim();
    sections.push(`Case discussed with ${consult.who.trim()}${what ? `, ${what}` : ''}.`);
  }

  // 6) Considered but deferred (+ risk calculators) — creditable cognitive work
  const defLines = [];
  const defItems = deferred.filter(d => (d.item || '').trim());
  for (const d of defItems) {
    const r = (d.rationale || '').trim();
    defLines.push(`${d.item.trim()} was considered but deferred${r ? ` given ${r}` : ''}`);
  }
  if (defLines.length) sections.push(`${cap(defLines.join('; '))}.`);

  const calcLines = calculators.filter(c => (c.name || '').trim()).map(c => {
    const impact = (c.impact || '').trim();
    return `${c.name.trim()}${impact ? ` (${impact})` : ''}`;
  });
  if (calcLines.length) sections.push(`Risk stratification: ${joinList(calcLines)}.`);

  // 7) Reassessment
  if (reassessment.on) {
    const t = (reassessment.text || '').trim();
    sections.push(`The patient will be serially reassessed${t ? ` for ${t}` : ''}.`);
  }

  // 8) Shared decision-making
  if (sdm.on) {
    const t = (sdm.text || '').trim();
    sections.push(`Shared decision-making was performed with the patient${t ? ` regarding ${t}` : ''}.`);
  }

  // 9) Diagnostic uncertainty
  if (uncertainty.on) {
    const t = (uncertainty.text || '').trim();
    sections.push(`Diagnostic uncertainty and return precautions were discussed with the patient${t ? `, including ${t}` : ''}.`);
  }

  // 10) Handoff line
  const handoff = (handoffLine || '').trim() || DEFAULT_HANDOFF;
  sections.push(handoff);

  return sections.join('\n\n');
}
