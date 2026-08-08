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
// Sections are separated by a blank line, and each carries a bold markdown
// header so the pasted note reads as a structured HPI / Assessment / Plan.
export function generateMdm(input = {}) {
  const {
    oneLiner = {},
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

  // 1) One-liner / HPI — only once the clinician has entered part of it.
  if (hasOneLiner(oneLiner)) {
    sections.push(`**HPI:** ${buildOneLiner(oneLiner)}`);
  }

  // 2) Assessment — differential summary + per-diagnosis reasoning (by tier)
  if (diagnoses.length) {
    const names = diagnoses.map(d => d.name);
    const mostLikely = diagnoses.find(d => d.tier === 'likely');
    let summary = `The differential diagnosis includes ${joinList(names)}.`;
    if (mostLikely) summary += ` ${mostLikely.name} is felt to be most likely.`;

    const ordered = [...diagnoses].sort(
      (a, b) => (TIER_RANK[a.tier] ?? 3) - (TIER_RANK[b.tier] ?? 3)
    );
    const reasoning = ordered.map(reasonForDiagnosis).filter(Boolean).join('\n');
    sections.push(`**Assessment:** ${summary}${reasoning ? `\n${reasoning}` : ''}`);
  }

  // 3) Data reviewed — independent interpretations (attributed), Data Cat 2
  const reads = interpretations.filter(i => (i.study || '').trim() && (i.read || '').trim());
  if (reads.length) {
    const parts = reads.map(i => `${i.study.trim()}, ${phrase(i.read.trim())}`);
    sections.push(`**Data reviewed:** On my independent interpretation: ${parts.join('; ')}.`);
  }

  // 4) Plan — one bullet per category
  const { lines: planLines, disposition } = buildPlan(plan);
  if (planLines.length) {
    sections.push(`**Plan:**\n${planLines.map(l => `• ${l}`).join('\n')}`);
  }

  // 5) Consultant discussion — Data Category 3
  if ((consult.who || '').trim()) {
    const what = (consult.what || '').trim();
    sections.push(`**Consultant discussion:** Case discussed with ${consult.who.trim()}${what ? `, ${what}` : ''}.`);
  }

  // 6) Clinical reasoning — considered-but-deferred, decision instruments,
  //    reassessment, shared decision-making, and diagnostic uncertainty. Each is
  //    creditable cognitive work that a plain note rarely captures.
  const reasoningLines = [];

  const defItems = deferred.filter(d => (d.item || '').trim());
  for (const d of defItems) {
    const r = (d.rationale || '').trim();
    reasoningLines.push(`${cap(d.item.trim())} was considered but deferred${r ? ` given ${r}` : ''}.`);
  }

  const calcLines = calculators.filter(c => (c.name || '').trim()).map(c => {
    const impact = (c.impact || '').trim();
    return `${c.name.trim()}${impact ? ` (${impact})` : ''}`;
  });
  if (calcLines.length) reasoningLines.push(`Risk stratification: ${joinList(calcLines)}.`);

  if (reassessment.on) {
    const t = (reassessment.text || '').trim();
    reasoningLines.push(`The patient will be serially reassessed${t ? ` for ${t}` : ''}.`);
  }
  if (sdm.on) {
    const t = (sdm.text || '').trim();
    reasoningLines.push(`Shared decision-making was performed with the patient${t ? ` regarding ${t}` : ''}.`);
  }
  if (uncertainty.on) {
    const t = (uncertainty.text || '').trim();
    reasoningLines.push(`Diagnostic uncertainty and return precautions were discussed with the patient${t ? `, including ${t}` : ''}.`);
  }

  if (reasoningLines.length) {
    sections.push(`**Clinical reasoning:**\n${reasoningLines.map(l => `• ${l}`).join('\n')}`);
  }

  // 7) Disposition
  if (disposition) sections.push(`**Disposition:** ${cap(disposition)}.`);

  // 8) Handoff line — closes the note. The ED course lives in the EHR; this tool
  //    writes the initial reasoning and stops here.
  const handoff = (handoffLine || '').trim() || DEFAULT_HANDOFF;
  sections.push(`**Handoff:** ${handoff}`);

  return sections.join('\n\n');
}
