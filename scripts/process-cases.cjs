#!/usr/bin/env node
// process-cases.cjs — CLI tool to extract structured ED cases from a CSV of timelines
// Uses OpenAI Structured Outputs API for reliable JSON extraction with de-identification
//
// Supports two backends:
//   1. OpenAI direct — set OPENAI_API_KEY
//   2. Azure OpenAI  — set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT
//      Optionally set AZURE_OPENAI_DEPLOYMENT (default: gpt-4.1)
//      Optionally set AZURE_OPENAI_API_VERSION (default: 2024-12-01-preview)
//
// Usage:
//   node scripts/process-cases.cjs <input.csv> [output.json]
//
// The CSV must have a column called "full_timeline" containing the raw note text.
// Optional columns: visit_occurrence_id, person_id, first_note_ts, last_note_ts, note_count

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { default: OpenAI, AzureOpenAI } = require('openai');

// ── Client Setup ─────────────────────────────────────────────────────────────
// Azure takes priority if its env vars are set; otherwise fall back to OpenAI direct.

let client;
let modelName;

const azureKey = process.env.AZURE_OPENAI_API_KEY;
const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;

if (azureKey && azureEndpoint) {
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
  modelName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1';
  // Use base OpenAI client with custom baseURL to support non-standard Azure proxies
  // (e.g., Stanford's aihubapi which uses /azure-openai/ instead of /openai/)
  const baseURL = `${azureEndpoint.replace(/\/+$/, '')}/deployments/${modelName}`;
  client = new OpenAI({
    apiKey: azureKey,
    baseURL,
    timeout: 120000, // 2 minutes per request
    defaultQuery: { 'api-version': apiVersion },
    defaultHeaders: { 'api-key': azureKey },
  });
  console.log(`Using Azure OpenAI (baseURL: ${baseURL}, api-version: ${apiVersion})`);
} else if (process.env.OPENAI_API_KEY) {
  modelName = process.env.OPENAI_MODEL || 'gpt-4.1';
  client = new OpenAI();
  console.log(`Using OpenAI direct (model: ${modelName})`);
} else {
  console.error(
    'Error: No API credentials found.\n' +
    'Set OPENAI_API_KEY for OpenAI direct, or\n' +
    'set AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT for Azure OpenAI.'
  );
  process.exit(1);
}

// ── JSON Schema for Structured Outputs ──────────────────────────────────────
const CASE_SCHEMA = {
  name: 'ed_case',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: "Brief descriptive title for the case, e.g. 'Acute Abdominal Pain in a Young Woman'",
      },
      doorChart: {
        type: 'string',
        description: "One-line door chart that a charge nurse would give: age range, sex, chief complaint, acuity. E.g. 'Female, 20s — abdominal pain — ESI 3' or 'Male, 60s — chest pain, diaphoretic — ESI 2'. No diagnosis, no PMH, no plan.",
      },
      chiefComplaint: {
        type: 'string',
        description: 'Brief chief complaint in patient language, e.g. "belly pain and throwing up" not "RLQ pain with emesis"',
      },
      demographics: {
        type: 'string',
        description: "Altered demographics — shift age by 2-5 years, e.g. 'Female in her mid-20s'",
      },
      pmh: {
        type: 'string',
        description: "Past medical history in plain language, or 'None' if not mentioned",
      },
      vitals: {
        type: 'object',
        properties: {
          hr: { type: ['number', 'null'], description: 'Heart rate — adjust by 2-5 bpm from original' },
          bp: { type: ['string', 'null'], description: 'Blood pressure — adjust by a few mmHg, e.g. 118/74' },
          rr: { type: ['number', 'null'], description: 'Respiratory rate' },
          spo2: { type: ['string', 'null'], description: 'Oxygen saturation, e.g. 97%' },
          temp: { type: ['string', 'null'], description: 'Temperature, e.g. 98.6F — adjust by 0.1-0.3' },
        },
        required: ['hr', 'bp', 'rr', 'spo2', 'temp'],
        additionalProperties: false,
      },
      patientProfile: {
        type: 'object',
        description: 'Rich patient context for AI role-play. ALL TEXT MUST BE ORIGINAL — never copy from the source notes.',
        properties: {
          age: { type: 'string', description: "Shifted age range, e.g. 'mid-20s'" },
          sex: { type: 'string', description: "e.g. 'male', 'female'" },
          arrivalMode: { type: 'string', description: "How they arrived: 'walked in', 'brought by ambulance', 'wheelchair from triage', etc." },
          historyOfPresentIllness: { type: 'string', description: 'First-person narrative of what the patient would tell a doctor. Include onset, character, severity, timing, context, modifying factors, associated symptoms. Write naturally as the patient would speak — not in medical jargon. Infer reasonable details consistent with the case.' },
          socialHistory: { type: ['string', 'null'], description: 'Smoking, alcohol, drugs, occupation, living situation — or null if not mentioned' },
          medications: { type: ['string', 'null'], description: 'Current medications in patient language — or null if not mentioned' },
          allergies: { type: ['string', 'null'], description: 'Allergies — or null if not mentioned' },
          personalityNotes: { type: 'string', description: "How the patient presents behaviorally: e.g. 'visibly uncomfortable, clutching abdomen, cooperative but anxious'" },
        },
        required: ['age', 'sex', 'arrivalMode', 'historyOfPresentIllness', 'socialHistory', 'medications', 'allergies', 'personalityNotes'],
        additionalProperties: false,
      },
      physicalExam: {
        type: 'object',
        description: 'Physical exam findings by system, written in original language. Use null for systems not examined.',
        properties: {
          general: { type: ['string', 'null'], description: 'General appearance' },
          heent: { type: ['string', 'null'], description: 'Head, eyes, ears, nose, throat' },
          cardiovascular: { type: ['string', 'null'], description: 'Heart exam findings' },
          respiratory: { type: ['string', 'null'], description: 'Lung exam findings' },
          abdomen: { type: ['string', 'null'], description: 'Abdominal exam findings' },
          neurological: { type: ['string', 'null'], description: 'Neuro exam findings' },
          musculoskeletal: { type: ['string', 'null'], description: 'MSK exam findings' },
          skin: { type: ['string', 'null'], description: 'Skin/integumentary findings' },
        },
        required: ['general', 'heent', 'cardiovascular', 'respiratory', 'abdomen', 'neurological', 'musculoskeletal', 'skin'],
        additionalProperties: false,
      },
      results: {
        type: 'object',
        description: 'Lab and imaging results. Adjust non-critical numeric values slightly (e.g., WBC 15.2 → 14.8).',
        properties: {
          labs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: "Test name as ordered, e.g. 'CBC', 'Troponin', 'CMP'" },
                result: { type: 'string', description: "Result with slightly adjusted values, e.g. 'WBC 14.8 (H), Hgb 12.9, Plt 238'" },
                flag: { type: ['string', 'null'], description: "'normal', 'abnormal', or 'critical'" },
              },
              required: ['name', 'result', 'flag'],
              additionalProperties: false,
            },
          },
          imaging: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: "Study name, e.g. 'Chest X-ray', 'CT abdomen/pelvis', 'ECG'" },
                result: { type: 'string', description: 'Rephrased radiology impression — same clinical finding, different wording' },
                flag: { type: ['string', 'null'], description: "'normal', 'abnormal', or 'critical'" },
              },
              required: ['name', 'result', 'flag'],
              additionalProperties: false,
            },
          },
        },
        required: ['labs', 'imaging'],
        additionalProperties: false,
      },
      goldStandard: {
        type: 'object',
        description: 'All text must be written from scratch — never copy from the source notes.',
        properties: {
          presentation: {
            type: 'string',
            description: 'Attending-level case presentation written in your own words, covering HPI, workup, findings, and assessment',
          },
          diagnosis: {
            type: 'string',
            description: 'Final diagnosis or diagnoses',
          },
          disposition: {
            type: 'string',
            description: "Disposition and plan in your own words",
          },
          mdm: {
            type: 'string',
            description: 'Complete MDM written from scratch: differential reasoning, risk stratification, justification for interventions, disposition reasoning',
          },
        },
        required: ['presentation', 'diagnosis', 'disposition', 'mdm'],
        additionalProperties: false,
      },
    },
    required: ['title', 'doorChart', 'chiefComplaint', 'demographics', 'pmh', 'vitals', 'patientProfile', 'physicalExam', 'results', 'goldStandard'],
    additionalProperties: false,
  },
};

// ── CSV Parsing ──────────────────────────────────────────────────────────────
// Handles quoted fields with embedded commas and newlines
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (!inQuotes) {
      current = lines[i];
    } else {
      current += '\n' + lines[i];
    }

    const quoteCount = (current.match(/"/g) || []).length;
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes) {
      rows.push(current);
      current = '';
    }
  }

  if (rows.length === 0) return [];

  const header = parseCSVRow(rows[0]);
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].trim();
    if (!row) continue;
    const fields = parseCSVRow(row);
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = fields[j] || '';
    }
    result.push(obj);
  }

  return result;
}

function parseCSVRow(row) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (inQuotes) {
      if (char === '"' && row[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ── Extraction ───────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a board-certified emergency medicine physician building cases for a medical education simulator. You will receive raw ED note timelines and must produce an ABSTRACT, FICTIONALIZED representation of each case.

CRITICAL RULES — READ CAREFULLY:

1. NEVER COPY VERBATIM TEXT from the source notes. Every field must be written in your own words. The output should read as if you wrote it from memory after seeing the case — same clinical facts, entirely different language.

2. DELIBERATELY ALTER identifying details to create a fictionalized case:
   - Shift the patient's age by 2-5 years in either direction
   - Adjust non-critical vital signs slightly (HR ±3-5, BP ±3-5 mmHg, temp ±0.2)
   - Adjust non-critical lab values slightly (e.g., WBC 15.2 → 14.8, Hgb 13.1 → 12.9)
   - Keep abnormal/normal status the same — don't turn an abnormal value normal or vice versa
   - The clinical teaching point, diagnosis, and management must remain identical

3. DO NOT include any raw timeline notes or triage notes. The output is a structured abstract representation, not a copy of the chart.

4. Remove all names (patient, provider, facility), MRNs, dates, addresses, phone numbers.

FIELD-SPECIFIC INSTRUCTIONS:

doorChart:
- One-liner a charge nurse would say: age range, sex, chief complaint in plain language, acuity (ESI 1-5)
- Example: "Female, 20s — belly pain and vomiting — ESI 3"
- NO diagnosis, NO PMH, NO workup plan

chiefComplaint:
- Write in patient language, not medical jargon
- "chest pressure and trouble breathing" not "substernal chest pain with dyspnea"

patientProfile.historyOfPresentIllness:
- First-person narrative as the patient would tell it
- Natural speech, not chart language ("my stomach has been killing me since this morning" not "acute onset LLQ abdominal pain")
- Include onset, character, severity, timing, modifying factors, associated symptoms
- Infer reasonable details the patient would know even if not in the notes

physicalExam:
- Rephrase all findings in your own words
- Be specific about what was found, but use original phrasing
- null for systems not examined

results:
- Include every lab and imaging study from the case
- Slightly adjust numeric values as described above
- Rephrase radiology impressions — same finding, different wording
- If ordered but result not documented, use "Pending" with null flag

goldStandard:
- Write the presentation, MDM, diagnosis, and disposition entirely from scratch
- These should reflect what a strong attending would write, not copy the original note`;

async function processCase(row, index) {
  const timeline = row.full_timeline || '';
  if (!timeline.trim()) {
    console.warn(`  Skipping case ${index + 1}: empty timeline`);
    return null;
  }

  const visitId = row.visit_occurrence_id || `case_${index + 1}`;
  const noteCount = row.note_count || 'unknown';

  const userPrompt = `Extract a structured, de-identified ED case from this timeline:

CASE METADATA:
- Visit ID: ${visitId}
- Note count: ${noteCount}

RAW TIMELINE:
${timeline}`;

  const requestParams = {
    model: modelName,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: CASE_SCHEMA,
    },
  };

  // Support reasoning effort (e.g., AZURE_OPENAI_REASONING=low)
  const reasoning = process.env.AZURE_OPENAI_REASONING || process.env.OPENAI_REASONING;
  if (reasoning) {
    requestParams.reasoning_effort = reasoning;
  }

  const response = await client.chat.completions.create(requestParams);

  const structured = JSON.parse(response.choices[0].message.content);
  structured.id = `case_${index + 1}`;

  return structured;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/process-cases.cjs <input.csv> [output.json]');
    console.log('');
    console.log('Extracts structured, de-identified ED cases from a CSV of note timelines.');
    console.log('The CSV must have a "full_timeline" column.');
    console.log('');
    console.log('Environment variables:');
    console.log('  OpenAI direct:');
    console.log('    OPENAI_API_KEY          Your OpenAI API key');
    console.log('    OPENAI_MODEL            Model name (default: gpt-4.1)');
    console.log('');
    console.log('  Azure OpenAI:');
    console.log('    AZURE_OPENAI_API_KEY    Your Azure OpenAI API key');
    console.log('    AZURE_OPENAI_ENDPOINT   Azure endpoint URL');
    console.log('    AZURE_OPENAI_DEPLOYMENT Deployment name (default: gpt-4.1)');
    console.log('    AZURE_OPENAI_API_VERSION API version (default: 2024-12-01-preview)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/process-cases.cjs ../ed_sample_cases.csv');
    console.log('  node scripts/process-cases.cjs data.csv ./output/cases.json');
    console.log('');
    console.log('  # Using Azure:');
    console.log('  AZURE_OPENAI_API_KEY=xxx AZURE_OPENAI_ENDPOINT=https://myendpoint.openai.azure.com/ \\');
    console.log('    node scripts/process-cases.cjs data.csv');
    process.exit(0);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = path.resolve(args[1] || path.join(__dirname, '..', 'src', 'data', 'cases.json'));

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV: ${inputPath}`);
  const csvText = fs.readFileSync(inputPath, 'utf-8');
  const rows = parseCSV(csvText);
  console.log(`Found ${rows.length} case(s) in CSV`);

  if (rows.length === 0) {
    console.error('Error: No cases found in CSV');
    process.exit(1);
  }

  if (!rows[0].full_timeline) {
    console.error('Error: CSV must have a "full_timeline" column');
    console.error('Found columns:', Object.keys(rows[0]).join(', '));
    process.exit(1);
  }

  const cases = [];
  for (let i = 0; i < rows.length; i++) {
    console.log(`\nProcessing case ${i + 1} of ${rows.length}...`);
    try {
      const result = await processCase(rows[i], i);
      if (result) {
        cases.push(result);
        console.log(`  Done: ${result.title} (${result.results.labs.length} labs, ${result.results.imaging.length} imaging)`);
      }
    } catch (err) {
      console.error(`  Failed case ${i + 1}: ${err.message}`);
    }
  }

  if (cases.length === 0) {
    console.error('\nNo cases were successfully processed.');
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(cases, null, 2), 'utf-8');
  console.log(`\nDone! ${cases.length} case(s) written to: ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
