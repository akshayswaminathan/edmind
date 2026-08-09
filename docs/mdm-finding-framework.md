# MDM Writer — Finding-Set Framework

This is the authoring standard for the **finding buttons** that appear under each
diagnosis in the MDM Writer. It defines what a *comprehensive* button set looks
like, so every diagnosis — the 300+ already in the differential database and any
new one added later — is fleshed out consistently.

The finding library lives in [`src/data/mdmFeatures.js`](../src/data/mdmFeatures.js).
Coverage against the differential database is measured by
[`scripts/audit-feature-coverage.mjs`](../scripts/audit-feature-coverage.mjs)
(`npm run audit:features`).

---

## 1. What a finding is

Each finding is a single clickable phrase the clinician marks **present (+)**,
**absent (−)**, or **pending**. It carries a **direction**:

| `dir` | Meaning when **present** | Meaning when **absent** |
| ----- | ------------------------ | ----------------------- |
| `'for'` (default) | Supports this diagnosis | Argues against it |
| `'against'` | Argues against this diagnosis | Supports it |

The generator ([`mdmGenerate.js`](../src/data/mdmGenerate.js)) turns these into
prose — "supported by …", "made less likely by …", "the absence of …". Because
the note only emits what the clinician clicks, the button set is a *menu of
things worth documenting*, never a claim about the patient.

Authoring helper:

```js
F('Elevated troponin')            // dir defaults to 'for'
F('Negative D-dimer', 'against')  // present ⇒ argues against
```

---

## 2. The five groups

Every finding belongs to one of five groups, in this fixed order (it also drives
the on-screen layout):

1. **History** — risk factors, epidemiology, exposures, and the time course that
   move the *pretest probability*. (e.g. "Prior VTE", "Recent immobilization")
2. **Symptoms** — the patient-reported pattern that discriminates this diagnosis
   from its mimics. (e.g. "Pleuritic chest pain", "Sudden tearing pain")
3. **Exam** — objective bedside findings. (e.g. "Unilateral leg swelling")
4. **Labs** — confirmatory and excluding laboratory results. (e.g. "Elevated
   lactate", "Negative D-dimer")
5. **Imaging** — including ECG and POCUS. (e.g. "Filling defect on CTA chest")

A group may be empty (`[]`) when it genuinely does not discriminate (e.g. DKA has
no imaging findings), but History / Symptoms / Exam should essentially always be
populated.

---

## 3. The comprehensiveness checklist

A finding set is **comprehensive** when it lets a clinician document both *why
they are worried* and *why they are reassured*. Concretely, aim for:

- [ ] **History: 3–5** — the risk factors and time-course cues that actually
      change pretest probability for *this* diagnosis (not generic).
- [ ] **Symptoms: 4–7** — the discriminating pattern, including the classic
      "rule-in" symptom(s).
- [ ] **Exam: 2–5** — the objective findings a clinician would look for.
- [ ] **Labs: 0–5** and **Imaging: 0–5** — paired rule-in / rule-out where one
      exists (e.g. "Elevated D-dimer" *and* "Negative D-dimer, against").
- [ ] **At least one `'against'` finding.** The note's "less likely given …"
      reasoning depends on it. Every diagnosis needs a way to be argued *down*,
      not just up.
- [ ] **Must-not-miss diagnoses carry their discriminating red flags** — the
      features whose absence a chart reviewer will look for (e.g. SAH →
      "Thunderclap onset", "Worst headache of life"; cauda equina → "Urinary
      retention", "Saddle anesthesia").
- [ ] **Phrasing is chartable prose.** The label should read cleanly after
      "supported by …" / "the absence of …". Prefer "Elevated troponin" over
      "troponin"; keep true acronyms (RLQ, ECG, JVD) as-is — the generator
      preserves all-caps first words and lowercases ordinary ones.

Total: roughly **12–22 findings** per diagnosis. Fewer than ~8 usually means the
set is not yet comprehensive; more than ~24 crowds the UI.

---

## 4. Directionality patterns worth reusing

- **Paired confirmatory test.** Add both poles so the clinician can rule in *or*
  out: `F('Elevated D-dimer')` + `F('Negative D-dimer', 'against')`.
- **The reassuring exam / benign study.** For lower-acuity diagnoses, an
  `'against'` finding lets the note say the mimic was considered and downgraded:
  `F('Reassuring / benign exam', 'against')`, `F('Completely normal ECG', 'against')`.
- **The atypical feature.** A symptom that, if present, argues *against* the
  diagnosis: for GERD, `F('Exertional pain', 'against')`; for migraine,
  `F('Thunderclap onset', 'against')`.

---

## 5. Aliases — one entry per clinical entity

The differential database names the same entity many ways ("Anxiety disorder",
"Anxiety/Panic Disorder", "Panic attack"). **Author one canonical entry and list
the variants as `aliases`** rather than duplicating the finding set. Aliases are
normalized (lowercased, punctuation and parentheticals stripped) and matched
against both the differential names and free-text the clinician types.

```js
{
  name: 'Panic attack / anxiety',
  aliases: ['panic attack', 'anxiety disorder', 'anxiety/panic disorder',
            'panic disorder', 'hyperventilation', 'panic attack / anxiety'],
  groups: { /* … */ },
}
```

Include the exact differential-database spellings as aliases so the audit counts
them as covered.

---

## 6. Adding a new diagnosis

Two supported paths:

1. **Curated (preferred, version-controlled).** Add an entry to `LIBRARY` in
   `mdmFeatures.js` following §3, then run `npm run audit:features` to confirm it
   is picked up. This is the source of truth and is human-reviewed.

2. **AI-assisted draft (in-app).** When a clinician selects a diagnosis with no
   curated set, the MDM Writer offers **"Suggest findings"**, which calls the
   backend (`POST /api/suggest-findings`) to draft a set in this exact schema.
   The draft is a *starting point the clinician curates on screen* — it is never
   emitted into the note unless the clinician clicks the individual findings. Use
   it to fill the long tail; promote frequently-used drafts into the curated
   library.

Until either is done, an uncurated diagnosis falls back to a generic scaffold so
the tool always works.

---

## 7. Maintenance workflow

```bash
npm run audit:features          # coverage summary + the current gaps
npm run audit:features -- --all # every diagnosis and where it maps
npm run audit:features -- --json# machine-readable, for tooling
```

Work the gaps highest-tier first: **must-not-miss → common → rare**. Re-run the
audit after each batch; the goal is 100% of must-not-miss and common carrying
curated sets.
