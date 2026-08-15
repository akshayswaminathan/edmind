// Plan auto-suggestion for the MDM writer.
//
// Hybrid model (per product decision):
//   1) A curated seed map of diagnosis -> the plan items EM clinicians most
//      commonly order for it. Ships in code, deterministic, instant.
//   2) A learned layer stored in localStorage that counts what THIS user
//      actually selects for each diagnosis, so suggestions adapt over time.
//   3) An AI fallback (see /api/suggest-plan) for diagnoses with neither.
//
// getPlanSuggestions() merges (1) + (2) and returns, per plan category, an
// ordered list of the most relevant items for the current differential.

const LEARN_KEY = 'emtools.mdm.planLearning';

// ── Curated seed associations ────────────────────────────────────────────────
// `match` tokens are matched as substrings against the normalized diagnosis
// name (and so double as lightweight aliases). Items reference the same strings
// used by PLAN_MENU / IMAGING so a suggestion click behaves like any menu click.
const SEED = [
  {
    match: ['acute coronary', 'acs', 'myocardial infarction', 'stemi', 'nstemi', 'unstable angina', 'heart attack'],
    items: { Labs: ['Troponin', 'CBC', 'BMP'], Imaging: ['ECG'], Consults: ['Cardiology'], Disposition: ['Plan to admit to telemetry'] },
  },
  {
    match: ['aortic dissection'],
    items: { Labs: ['CBC', 'CMP', 'Type & screen', 'Troponin'], Imaging: ['CTA aorta', 'ECG'], Analgesia: ['Opioid analgesia'], Consults: ['Cardiothoracic surgery', 'Vascular surgery'], Disposition: ['Plan to admit to ICU'] },
  },
  {
    match: ['pulmonary embolism', 'pe ', 'saddle'],
    items: { Labs: ['D-dimer', 'CBC', 'BMP', 'Troponin'], Imaging: ['CTA chest (PE protocol)', 'ECG'], Consults: [], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['pneumothorax'],
    items: { Labs: ['VBG'], Imaging: ['X-ray chest', 'US — lung (POCUS)'], Procedures: ['Chest tube / thoracostomy'], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['tamponade', 'pericardial effusion'],
    items: { Imaging: ['US — cardiac echo (POCUS)', 'ECG'], Procedures: ['Paracentesis'], Consults: ['Cardiology'], Disposition: ['Plan to admit to ICU'] },
  },
  {
    match: ['pericarditis'],
    items: { Labs: ['Troponin', 'CBC'], Imaging: ['ECG', 'US — cardiac echo (POCUS)'], Analgesia: ['NSAIDs'], Disposition: ['Plan to discharge home'] },
  },
  {
    match: ['pneumonia'],
    items: { Labs: ['CBC', 'BMP', 'Lactate', 'Blood cultures x2', 'Procalcitonin'], Imaging: ['X-ray chest'], Antimicrobials: ['Ceftriaxone', 'Azithromycin'], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['gerd', 'reflux', 'peptic ulcer', 'gastritis', 'dyspepsia'],
    items: { Labs: ['Lipase', 'Troponin'], Imaging: ['ECG'], Analgesia: [], Disposition: ['Plan to discharge home'] },
  },
  {
    match: ['costochondritis', 'musculoskeletal', 'chest wall'],
    items: { Analgesia: ['NSAIDs', 'Acetaminophen (Tylenol)'], Imaging: ['ECG'], Disposition: ['Plan to discharge home'] },
  },
  {
    match: ['appendicitis'],
    items: { Labs: ['CBC', 'BMP', 'Urinalysis', 'Urine hCG', 'Lactate'], Imaging: ['CT abdomen/pelvis with contrast'], Analgesia: ['Opioid analgesia'], Antiemetics: ['Ondansetron'], Antimicrobials: ['Ceftriaxone', 'Metronidazole'], Consults: ['General surgery'], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['cholecystitis', 'cholangitis', 'biliary'],
    items: { Labs: ['CBC', 'CMP', 'LFTs', 'Lipase', 'Lactate', 'Blood cultures x2'], Imaging: ['US — RUQ'], Analgesia: ['Opioid analgesia'], Antiemetics: ['Ondansetron'], Antimicrobials: ['Ceftriaxone', 'Metronidazole'], Consults: ['General surgery'], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['pancreatitis'],
    items: { Labs: ['Lipase', 'CBC', 'CMP', 'LFTs', 'Lactate'], 'IV Fluids': ['LR bolus'], Analgesia: ['Opioid analgesia'], Antiemetics: ['Ondansetron'], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['aaa', 'abdominal aortic aneurysm', 'ruptured aortic'],
    items: { Labs: ['CBC', 'CMP', 'Type & screen', 'Coags (PT/INR/PTT)'], Imaging: ['US — aorta', 'CTA aorta'], Consults: ['Vascular surgery'], Disposition: ['Plan to admit to ICU'] },
  },
  {
    match: ['pyelonephritis', 'uti', 'urinary tract infection', 'cystitis'],
    items: { Labs: ['Urinalysis', 'CBC', 'BMP', 'Blood cultures x2', 'Urine hCG'], Antimicrobials: ['Ceftriaxone'], Antiemetics: ['Ondansetron'], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['nephrolithiasis', 'kidney stone', 'ureteral', 'renal colic'],
    items: { Labs: ['Urinalysis', 'BMP', 'Urine hCG'], Imaging: ['CT abdomen/pelvis with contrast', 'US — kidney'], Analgesia: ['NSAIDs', 'Opioid analgesia'], Antiemetics: ['Ondansetron'], Disposition: ['Plan to discharge home'] },
  },
  {
    match: ['subarachnoid', 'sah', 'intracranial hemorrhage', 'ich'],
    items: { Labs: ['CBC', 'BMP', 'Coags (PT/INR/PTT)', 'Type & screen'], Imaging: ['CT head without contrast'], Procedures: ['Lumbar puncture'], Consults: ['Neurosurgery', 'Neurology'], Disposition: ['Plan to admit to ICU'] },
  },
  {
    match: ['stroke', 'cva', 'cerebrovascular', 'tia'],
    items: { Labs: ['CBC', 'BMP', 'Coags (PT/INR/PTT)', 'Troponin'], Imaging: ['CT head without contrast', 'CTA head/neck', 'ECG'], Consults: ['Neurology'], Disposition: ['Plan to admit to ICU'] },
  },
  {
    match: ['meningitis', 'encephalitis'],
    items: { Labs: ['CBC', 'BMP', 'Blood cultures x2', 'Lactate', 'Coags (PT/INR/PTT)'], Imaging: ['CT head without contrast'], Procedures: ['Lumbar puncture'], Antimicrobials: ['Ceftriaxone', 'Vancomycin'], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['sepsis', 'septic shock', 'bacteremia'],
    items: { Labs: ['CBC', 'CMP', 'Lactate', 'Blood cultures x2', 'Urinalysis', 'VBG'], 'IV Fluids': ['LR bolus'], Antimicrobials: ['Vancomycin', 'Ceftriaxone'], Disposition: ['Plan to admit to ICU'] },
  },
  {
    match: ['gi bleed', 'gastrointestinal bleed', 'upper gi', 'lower gi', 'variceal'],
    items: { Labs: ['CBC', 'CMP', 'Coags (PT/INR/PTT)', 'Type & screen', 'LFTs'], Consults: ['Gastroenterology'], Disposition: ['Plan to admit to floor'] },
  },
  {
    match: ['dka', 'diabetic ketoacidosis', 'hyperglycemic'],
    items: { Labs: ['BMP', 'VBG', 'CBC', 'Lactate', 'Urinalysis'], 'IV Fluids': ['NS bolus'], Disposition: ['Plan to admit to ICU'] },
  },
  {
    match: ['ectopic', 'ovarian torsion', 'pid', 'pelvic inflammatory'],
    items: { Labs: ['Serum hCG', 'CBC', 'Type & screen'], Imaging: ['US — pelvis (transabdominal)'], Consults: ['OB/GYN'], Disposition: ['Plan to admit to floor'] },
  },
];

// ── Matching ────────────────────────────────────────────────────────────────
function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function seedFor(dxName) {
  const norm = ` ${normalize(dxName)} `;
  return SEED.find(s => s.match.some(tok => norm.includes(` ${normalize(tok)} `) || norm.includes(normalize(tok))));
}

// ── Learned layer (localStorage) ─────────────────────────────────────────────
function readLearning() {
  try {
    const raw = localStorage.getItem(LEARN_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}
function writeLearning(data) {
  try { localStorage.setItem(LEARN_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}

// Record that, with these diagnoses in the differential, the user selected
// `item` under `category`. Counts accrue per diagnosis so future differentials
// containing the same diagnosis surface it.
export function recordPlanSelection(dxNames, category, item) {
  if (!item || !category || !dxNames?.length) return;
  const data = readLearning();
  for (const dx of dxNames) {
    const key = normalize(dx);
    if (!key) continue;
    data[key] = data[key] || {};
    data[key][category] = data[key][category] || {};
    data[key][category][item] = (data[key][category][item] || 0) + 1;
  }
  writeLearning(data);
}

// ── Suggestion assembly ──────────────────────────────────────────────────────
// Returns { [category]: [{ item, score }] } ranked, merging curated seeds
// (weight 2 each) with the user's learned counts (weight = count), summed across
// every selected diagnosis. `extra` (e.g. AI-drafted items) is folded in at
// weight 1 so it ranks below anything curated or learned.
export function getPlanSuggestions(dxNames = [], extra = {}) {
  const scores = {}; // category -> item -> score
  const bump = (category, item, by) => {
    if (!item) return;
    scores[category] = scores[category] || {};
    scores[category][item] = (scores[category][item] || 0) + by;
  };

  const learning = readLearning();
  for (const dx of dxNames) {
    const seed = seedFor(dx);
    if (seed) {
      for (const [category, items] of Object.entries(seed.items)) {
        for (const item of items) bump(category, item, 2);
      }
    }
    const learned = learning[normalize(dx)];
    if (learned) {
      for (const [category, items] of Object.entries(learned)) {
        for (const [item, count] of Object.entries(items)) bump(category, item, count);
      }
    }
  }

  for (const [category, items] of Object.entries(extra || {})) {
    for (const item of items || []) bump(category, item, 1);
  }

  const out = {};
  for (const [category, items] of Object.entries(scores)) {
    out[category] = Object.entries(items)
      .map(([item, score]) => ({ item, score }))
      .sort((a, b) => b.score - a.score);
  }
  return out;
}

// True when we have any curated/learned signal for the differential — lets the
// UI decide whether to offer the AI fallback.
export function hasSuggestions(dxNames = []) {
  const learning = readLearning();
  return dxNames.some(dx => seedFor(dx) || learning[normalize(dx)]);
}
