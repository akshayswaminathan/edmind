// scripts/generate_differentials.cjs
// Generates comprehensive differential diagnosis data using OpenAI GPT-4o
// Sources expert medical knowledge to create high-quality training data
// Run: node scripts/generate_differentials.cjs
// Output: src/data/differentials.js

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env');
  process.exit(1);
}

const CHIEF_COMPLAINTS = [
  { key: 'Chest_pain', display: 'Chest Pain', wikemUrl: 'https://wikem.org/wiki/Acute_chest_pain' },
  { key: 'Shortness_of_breath', display: 'Shortness of Breath', wikemUrl: 'https://wikem.org/wiki/Dyspnea' },
  { key: 'Abdominal_pain', display: 'Abdominal Pain', wikemUrl: 'https://wikem.org/wiki/Abdominal_pain' },
  { key: 'Syncope', display: 'Syncope', wikemUrl: 'https://wikem.org/wiki/Syncope' },
  { key: 'Altered_mental_status', display: 'Altered Mental Status', wikemUrl: 'https://wikem.org/wiki/Altered_mental_status' },
  { key: 'Headache', display: 'Headache', wikemUrl: 'https://wikem.org/wiki/Headache' },
  { key: 'Back_pain', display: 'Back Pain', wikemUrl: 'https://wikem.org/wiki/Back_pain' },
  { key: 'Palpitations', display: 'Palpitations', wikemUrl: 'https://wikem.org/wiki/Palpitations' },
  { key: 'Fever', display: 'Fever', wikemUrl: 'https://wikem.org/wiki/Fever' },
  { key: 'Weakness', display: 'Weakness', wikemUrl: 'https://wikem.org/wiki/Weakness' },
  { key: 'Dizziness', display: 'Dizziness', wikemUrl: 'https://wikem.org/wiki/Dizziness' },
  { key: 'Nausea_and_vomiting', display: 'Nausea and Vomiting', wikemUrl: 'https://wikem.org/wiki/Nausea_and_vomiting' },
  { key: 'Sore_throat', display: 'Sore Throat', wikemUrl: 'https://wikem.org/wiki/Sore_throat' },
  { key: 'Dysuria', display: 'Dysuria', wikemUrl: 'https://wikem.org/wiki/Dysuria' },
  { key: 'Vaginal_bleeding', display: 'Vaginal Bleeding', wikemUrl: 'https://wikem.org/wiki/Vaginal_bleeding' },
  { key: 'Rash', display: 'Rash', wikemUrl: 'https://wikem.org/wiki/Rash' },
  { key: 'Seizure', display: 'Seizure', wikemUrl: 'https://wikem.org/wiki/Seizure' },
  { key: 'Eye_pain', display: 'Eye Pain', wikemUrl: 'https://wikem.org/wiki/Eye_pain' },
  { key: 'Pediatric_fever', display: 'Pediatric Fever', wikemUrl: 'https://wikem.org/wiki/Pediatric_fever' },
  { key: 'Shock', display: 'Shock', wikemUrl: 'https://wikem.org/wiki/Shock' },
];

// Load WikEM data if available to supplement
let wikemData = {};
try {
  wikemData = JSON.parse(fs.readFileSync('scripts/output/wikem_raw.json'));
} catch (e) {
  console.log('No WikEM data found, generating purely from OpenAI');
}

async function generateForComplaint(complaint) {
  const wikemInfo = wikemData[complaint.key];
  const wikemContext = wikemInfo && wikemInfo.differentials.length > 0
    ? `\nReference differentials from WikEM: ${JSON.stringify(wikemInfo.differentials.slice(0, 30))}`
    : '';

  const prompt = `You are a board-certified emergency medicine attending physician and medical educator.

Generate a comprehensive differential diagnosis dataset for the chief complaint: "${complaint.display}"

${wikemContext}

Create the data in this exact JSON format. Be thorough and clinically accurate:

{
  "chiefComplaint": "${complaint.display}",
  "wikemUrl": "${complaint.wikemUrl}",
  "mustNotMiss": [
    {
      "diagnosis": "<diagnosis name>",
      "whyMissed": "<1 sentence: why clinicians miss this in the ED>",
      "cognitiveError": "<one of: anchoring, availability, premature_closure, framing, omission>",
      "appearsInCaseReports": <true if commonly reported in missed-diagnosis literature>
    }
  ],
  "common": ["<common diagnosis 1>", "<common diagnosis 2>", ...],
  "rare": ["<rare diagnosis 1>", "<rare diagnosis 2>", ...],
  "expertTip": "<1-2 sentence attending-level pearl for this chief complaint>",
  "dominantCognitiveError": "<most common cognitive error type for this chief complaint>"
}

Requirements:
- mustNotMiss: 4-8 diagnoses that are life-threatening or limb-threatening if missed
- common: 5-10 frequently seen diagnoses in the ED
- rare: 3-6 uncommon but valid diagnoses
- whyMissed should be specific and educational (not generic)
- cognitiveError should accurately reflect the typical error pattern
- appearsInCaseReports: true for diagnoses commonly featured in missed-diagnosis case report literature
- expertTip should be a genuine clinical pearl an attending would share

Return ONLY valid JSON. No markdown fences, no preamble.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'You are a board-certified emergency medicine attending. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

async function main() {
  fs.mkdirSync('src/data', { recursive: true });
  const enriched = {};

  for (const complaint of CHIEF_COMPLAINTS) {
    console.log(`Generating: ${complaint.display}...`);
    try {
      enriched[complaint.key] = await generateForComplaint(complaint);
      const d = enriched[complaint.key];
      console.log(`  OK: ${d.mustNotMiss.length} must-not-miss, ${d.common.length} common, ${d.rare.length} rare`);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  const output = `// AUTO-GENERATED by scripts/generate_differentials.cjs
// Sources: WikEM (CC BY-NC-SA) + OpenAI GPT-4o medical knowledge
// Regenerate: node scripts/generate_differentials.cjs

export const differentials = ${JSON.stringify(enriched, null, 2)};

export const CHIEF_COMPLAINTS = Object.keys(differentials).map(k => differentials[k].chiefComplaint);
`;

  fs.writeFileSync('src/data/differentials.js', output);
  console.log(`\nWrote ${Object.keys(enriched).length} complaints -> src/data/differentials.js`);
}

main().catch(console.error);
