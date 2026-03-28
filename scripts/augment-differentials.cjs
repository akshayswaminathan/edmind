#!/usr/bin/env node
// augment-differentials.cjs — Augments gold_standard.json with missing must-not-miss diagnoses
// Uses OpenAI Structured Outputs to review each chief complaint and add missing diagnoses.
//
// Usage:
//   node scripts/augment-differentials.cjs
//
// Reads src/data/gold_standard.json, augments it, writes back.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { default: OpenAI } = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY required for augmentation');
  process.exit(1);
}

const client = new OpenAI();
const model = 'gpt-5-mini';

const AUGMENT_SCHEMA = {
  name: 'augmented_diagnoses',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      newRed: {
        type: 'array',
        description: 'Life-threatening or emergent diagnoses missing from the red list',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Diagnosis name' },
            icd10: { type: 'string', description: 'ICD-10 code' },
          },
          required: ['name', 'icd10'],
          additionalProperties: false,
        },
      },
      newYellow: {
        type: 'array',
        description: 'Clinically important diagnoses missing from the yellow list',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Diagnosis name' },
            icd10: { type: 'string', description: 'ICD-10 code' },
          },
          required: ['name', 'icd10'],
          additionalProperties: false,
        },
      },
    },
    required: ['newRed', 'newYellow'],
    additionalProperties: false,
  },
};

const gsPath = path.join(__dirname, '..', 'src', 'data', 'gold_standard.json');
const goldStandard = JSON.parse(fs.readFileSync(gsPath, 'utf-8'));

async function augmentComplaint(entry) {
  const { chiefComplaint, red, yellow } = entry;
  const redNames = red.map(d => d.name);
  const yellowNames = yellow.map(d => d.name);

  const prompt = `Review this differential diagnosis list for the chief complaint: "${chiefComplaint}"

CURRENT RED (must-not-miss / life-threatening):
${redNames.join(', ') || '(none)'}

CURRENT YELLOW (important to consider):
${yellowNames.join(', ') || '(none)'}

Identify any missing diagnoses:
- newRed: life-threatening or emergent diagnoses an EM physician must not miss. Only true emergencies that could kill or permanently harm if missed.
- newYellow: clinically important diagnoses that change management but are not immediately life-threatening.

Rules:
- Only add diagnoses genuinely relevant to "${chiefComplaint}"
- Do NOT add anything already on either list, even if phrased differently
- If the lists are comprehensive, return empty arrays`;

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 1000,
    reasoning_effort: 'minimal',
    messages: [
      { role: 'developer', content: 'You are a board-certified emergency medicine physician.' },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: AUGMENT_SCHEMA,
    },
  });

  const msg = response.choices[0].message;
  if (!msg.content) {
    console.log(`(empty content, finish_reason: ${response.choices[0].finish_reason}, refusal: ${msg.refusal})`);
    return { newRed: [], newYellow: [] };
  }
  const result = JSON.parse(msg.content);

  // Deduplicate: don't add if already exists (case-insensitive)
  const existingNames = new Set([...redNames, ...yellowNames].map(n => n.toLowerCase()));

  const newRed = (result.newRed || []).filter(d => !existingNames.has(d.name.toLowerCase()));
  const newYellow = (result.newYellow || []).filter(d => !existingNames.has(d.name.toLowerCase()));

  return { newRed, newYellow };
}

async function main() {
  console.log(`Augmenting ${goldStandard.length} chief complaints using ${model} (structured outputs)...\n`);

  let totalNewRed = 0;
  let totalNewYellow = 0;

  for (let i = 0; i < goldStandard.length; i++) {
    const entry = goldStandard[i];
    process.stdout.write(`${i + 1}/${goldStandard.length} ${entry.chiefComplaint}... `);

    try {
      const { newRed, newYellow } = await augmentComplaint(entry);

      if (newRed.length > 0) {
        entry.red.push(...newRed);
        totalNewRed += newRed.length;
      }
      if (newYellow.length > 0) {
        entry.yellow.push(...newYellow);
        totalNewYellow += newYellow.length;
      }

      const added = newRed.length + newYellow.length;
      if (added > 0) {
        console.log(`+${newRed.length} red, +${newYellow.length} yellow`);
      } else {
        console.log('complete');
      }
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  // Write back
  fs.writeFileSync(gsPath, JSON.stringify(goldStandard, null, 2), 'utf-8');
  console.log(`\nDone! Added ${totalNewRed} red + ${totalNewYellow} yellow diagnoses across all complaints.`);
  console.log(`Updated: ${gsPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
