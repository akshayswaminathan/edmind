// server.cjs — Express backend for scoring API
// Uses gold-standard differential lists + synonym matching + OpenAI fallback
// Run: node server.cjs

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { default: OpenAI, AzureOpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
// Raw body parsing for audio uploads
app.use('/api/transcribe', express.raw({ type: 'audio/*', limit: '10mb' }));

// ── OpenAI Client Setup ─────────────────────────────────────────────────────
// Server always uses OpenAI direct for real-time in-app calls (chat, scoring, orders).
// Azure is only used by the extraction script (process-cases.cjs).

if (!process.env.OPENAI_API_KEY) {
  console.error('Warning: Missing OPENAI_API_KEY — API endpoints will fail.');
}

const aiClient = new OpenAI();
const aiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
console.log(`Using OpenAI direct for chat/orders (model: ${aiModel})`);

// Grading client — uses gpt-5-mini via OpenAI direct
const gradingClient = aiClient;
const gradingModel = 'gpt-5-mini';

// Load gold standard data
const goldStandard = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'src/data/gold_standard.json'), 'utf-8')
);
const synonymMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'src/data/synonym_map.json'), 'utf-8')
);

// Build reverse synonym lookup: synonym -> [official name(s)]
const reverseSynonyms = {};
for (const [officialName, syns] of Object.entries(synonymMap)) {
  // Add the official name itself (lowercased)
  const key = officialName.toLowerCase().trim();
  if (!reverseSynonyms[key]) reverseSynonyms[key] = [];
  reverseSynonyms[key].push(officialName);

  // Add each synonym
  for (const syn of syns) {
    const synKey = (typeof syn === 'string' ? syn : '').toLowerCase().trim();
    if (synKey) {
      if (!reverseSynonyms[synKey]) reverseSynonyms[synKey] = [];
      reverseSynonyms[synKey].push(officialName);
    }
  }
}

// Normalize a string for matching
function normalize(s) {
  return s.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// Quick deterministic match — exact name or synonym only, no fuzzy heuristics
function findExactMatch(userEntry, officialNames) {
  const norm = normalize(userEntry);
  if (!norm || norm.length === 0) return null;

  // Exact match after normalization
  for (const official of officialNames) {
    if (norm === normalize(official)) return official;
  }

  // Reverse synonym lookup (abbreviations like PE, MI, SAH, etc.)
  const reverseMatches = reverseSynonyms[norm] || [];
  for (const officialName of reverseMatches) {
    if (officialNames.includes(officialName)) return officialName;
  }

  // Check synonym lists
  for (const official of officialNames) {
    const syns = synonymMap[official] || [];
    for (const syn of syns) {
      const normSyn = normalize(typeof syn === 'string' ? syn : '');
      if (normSyn && norm === normSyn) return official;
    }
  }

  return null;
}

async function callOpenAI(systemPrompt, userPrompt, maxTokens = 1000) {
  const response = await aiClient.chat.completions.create({
    model: aiModel,
    max_tokens: maxTokens,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return response.choices[0].message.content;
}

// POST /api/score — Score a student's differential diagnosis list
app.post('/api/score', async (req, res) => {
  try {
    const { chiefComplaint, userList, complaintSlug } = req.body;

    if (!chiefComplaint || !userList) {
      return res.status(400).json({ error: 'Missing chiefComplaint or userList' });
    }

    // Find the gold standard data for this complaint
    const gsEntry = goldStandard.find(e => {
      if (complaintSlug) {
        const slug = e.chiefComplaint.toLowerCase()
          .replace(/[・]/g, '_').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        return slug === complaintSlug;
      }
      return e.chiefComplaint.toLowerCase() === chiefComplaint.toLowerCase();
    });

    if (!gsEntry) {
      return res.status(404).json({ error: `No gold standard data for: ${chiefComplaint}` });
    }

    const redNames = gsEntry.red.map(d => d.name);
    const yellowNames = gsEntry.yellow.map(d => d.name);
    const allNames = [...redNames, ...yellowNames];

    // Phase 1: Quick exact/synonym matching
    const redCaught = [];
    const yellowCaught = [];
    const unmatched = [];

    for (const entry of userList) {
      if (entry === '(no entries)') continue;

      const redMatch = findExactMatch(entry, redNames);
      if (redMatch) {
        if (!redCaught.includes(redMatch)) redCaught.push(redMatch);
        continue;
      }

      const yellowMatch = findExactMatch(entry, yellowNames);
      if (yellowMatch) {
        if (!yellowCaught.includes(yellowMatch)) yellowCaught.push(yellowMatch);
        continue;
      }

      unmatched.push(entry);
    }

    // Phase 2: Send ALL unmatched to AI (gpt-5-nano) for semantic matching via structured outputs
    let aiRedCaught = [];
    let aiYellowCaught = [];
    let bonusDiagnoses = [];
    let invalidEntries = [];

    if (unmatched.length > 0) {
      try {
        const matchSchema = {
          name: 'diagnosis_matching',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              redMatches: {
                type: 'array',
                description: 'User entries that match a must-not-miss diagnosis',
                items: {
                  type: 'object',
                  properties: {
                    userEntry: { type: 'string', description: 'What the user typed' },
                    matchedDiagnosis: { type: 'string', description: 'Exact name from the red list' },
                  },
                  required: ['userEntry', 'matchedDiagnosis'],
                  additionalProperties: false,
                },
              },
              yellowMatches: {
                type: 'array',
                description: 'User entries that match an important diagnosis',
                items: {
                  type: 'object',
                  properties: {
                    userEntry: { type: 'string', description: 'What the user typed' },
                    matchedDiagnosis: { type: 'string', description: 'Exact name from the yellow list' },
                  },
                  required: ['userEntry', 'matchedDiagnosis'],
                  additionalProperties: false,
                },
              },
              bonus: {
                type: 'array',
                description: 'User entries that are valid EM diagnoses but not on either list',
                items: { type: 'string' },
              },
              invalid: {
                type: 'array',
                description: 'User entries that are not real diagnoses',
                items: { type: 'string' },
              },
            },
            required: ['redMatches', 'yellowMatches', 'bonus', 'invalid'],
            additionalProperties: false,
          },
        };

        const aiPrompt = `Match trainee diagnoses for "${chiefComplaint}":

TRAINEE ENTRIES:
${unmatched.map((e, i) => `${i + 1}. "${e}"`).join('\n')}

RED (must-not-miss): ${redNames.join(', ')}

YELLOW (important): ${yellowNames.join(', ')}

Match semantically and generously. "heart attack"="Myocardial infarction", "PE"="Pulmonary embolism", "stroke"="Acute stroke", "appy"="Appendicitis", etc. The matchedDiagnosis must be the EXACT name from the list above.`;

        const response = await gradingClient.chat.completions.create({
          model: gradingModel,
          max_completion_tokens: 2000,
          reasoning_effort: 'minimal',
          messages: [
            { role: 'developer', content: 'You are an EM physician matching trainee diagnoses to a gold standard list. Match generously.' },
            { role: 'user', content: aiPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: matchSchema,
          },
        });

        const aiResult = JSON.parse(response.choices[0].message.content);

        aiRedCaught = (aiResult.redMatches || []).map(m => m.matchedDiagnosis).filter(d => redNames.includes(d));
        aiYellowCaught = (aiResult.yellowMatches || []).map(m => m.matchedDiagnosis).filter(d => yellowNames.includes(d));
        bonusDiagnoses = aiResult.bonus || [];
        invalidEntries = aiResult.invalid || [];
      } catch (e) {
        console.warn('AI matching failed, treating unmatched as bonus:', e.message);
        bonusDiagnoses = unmatched;
      }
    }

    // Merge exact + AI results
    const allRedCaught = [...new Set([...redCaught, ...aiRedCaught])];
    const allYellowCaught = [...new Set([...yellowCaught, ...aiYellowCaught])];
    const redMissed = redNames.filter(d => !allRedCaught.includes(d));
    const yellowMissed = yellowNames.filter(d => !allYellowCaught.includes(d));

    // Scoring: Red diagnoses worth more than Yellow
    // Red: each caught = proportional share of 60 points
    // Yellow: each caught = proportional share of 30 points
    // Bonus: up to 10 points
    const redScore = redNames.length > 0
      ? (allRedCaught.length / redNames.length) * 60
      : 60;
    const yellowScore = yellowNames.length > 0
      ? (allYellowCaught.length / yellowNames.length) * 30
      : 30;
    const bonusScore = Math.min(bonusDiagnoses.length * 2, 10);
    const totalScore = Math.round(Math.min(redScore + yellowScore + bonusScore, 100));

    // Grade
    let grade;
    if (totalScore >= 90) grade = 'A';
    else if (totalScore >= 80) grade = 'B';
    else if (totalScore >= 70) grade = 'C';
    else if (totalScore >= 60) grade = 'D';
    else grade = 'F';

    res.json({
      redCaught: allRedCaught,
      redMissed,
      yellowCaught: allYellowCaught,
      yellowMissed,
      bonusDiagnoses,
      invalidEntries,
      score: totalScore,
      grade,
      redTotal: redNames.length,
      yellowTotal: yellowNames.length,
    });
  } catch (e) {
    console.error('Score error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Load case data for patient chat ──────────────────────────────────────────
let casesData = [];
const casesPath = path.join(__dirname, 'src/data/cases.json');
if (fs.existsSync(casesPath)) {
  casesData = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  console.log(`Loaded ${casesData.length} simulation case(s)`);
}

// POST /api/patient-chat — AI patient role-play for case simulation
app.post('/api/patient-chat', async (req, res) => {
  try {
    const { caseId, messages } = req.body;

    if (!caseId || !messages) {
      return res.status(400).json({ error: 'Missing caseId or messages' });
    }

    const caseData = casesData.find(c => c.id === caseId);
    if (!caseData) {
      return res.status(404).json({ error: `Case not found: ${caseId}` });
    }

    const p = caseData.patientProfile;
    const pe = caseData.physicalExam;

    // Build physical exam context (only non-null fields)
    const peEntries = Object.entries(pe || {})
      .filter(([, v]) => v != null)
      .map(([system, finding]) => `  ${system}: ${finding}`)
      .join('\n');

    const systemPrompt = `You are a patient in an emergency department. You are role-playing for a medical education simulator. Stay in character at all times.

YOUR IDENTITY:
- ${p.age} ${p.sex}
- Arrived: ${p.arrivalMode}
- Personality: ${p.personalityNotes}

YOUR MEDICAL HISTORY:
- Past medical history: ${caseData.pmh}
- Medications: ${p.medications || 'None that you know of'}
- Allergies: ${p.allergies || 'No known allergies'}
- Social history: ${p.socialHistory || 'Nothing notable'}

YOUR STORY (what you experienced — use this to answer questions):
${p.historyOfPresentIllness}

YOUR PHYSICAL STATE (what the doctor would find on exam):
${peEntries || '  No specific findings documented'}

RULES:
- Answer as the patient would — use plain language, not medical jargon
- Only share information the patient would reasonably know (you don't know your lab results, imaging findings, or diagnosis)
- If the doctor asks about something not covered in your story, respond plausibly and consistently with your case (e.g., if asked about family history and it's not specified, say something reasonable)
- If asked to do something physical (e.g., "take a deep breath", "can you lift your arm"), describe what happens based on your physical exam findings
- Show your personality — if you're anxious, express worry; if you're stoic, be brief
- Keep responses concise — 1-3 sentences is typical for a patient response
- NEVER break character or reveal that you are an AI or a simulation`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await aiClient.chat.completions.create({
      model: aiModel,
      max_tokens: 300,
      temperature: 0.7,
      messages: chatMessages,
    });

    const reply = response.choices[0].message.content || '';
    console.log('Patient chat response:', JSON.stringify(response.choices[0].message));

    res.json({ reply });
  } catch (e) {
    console.error('Patient chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/order-test — Look up test results for a case
app.post('/api/order-test', async (req, res) => {
  try {
    const { caseId, orderType, orderName } = req.body;

    if (!caseId || !orderType || !orderName) {
      return res.status(400).json({ error: 'Missing caseId, orderType, or orderName' });
    }

    const caseData = casesData.find(c => c.id === caseId);
    if (!caseData) {
      return res.status(404).json({ error: `Case not found: ${caseId}` });
    }

    const results = caseData.results || { labs: [], imaging: [] };
    const pool = orderType === 'imaging' ? results.imaging : results.labs;

    // Try to match the order to available results (fuzzy name match)
    const normOrder = orderName.toLowerCase().trim();
    const match = pool.find(r => {
      const normName = r.name.toLowerCase().trim();
      return normName === normOrder
        || normName.includes(normOrder)
        || normOrder.includes(normName);
    });

    if (match) {
      res.json({
        found: true,
        name: match.name,
        result: match.result,
        flag: match.flag,
      });
    } else {
      // Use AI to check if user's order name maps to something in our results
      if (pool.length > 0) {
        try {
          const aiResp = await aiClient.chat.completions.create({
            model: aiModel,
            max_tokens: 100,
            messages: [
              { role: 'system', content: 'You match clinical test orders. Return ONLY the matching test name from the available list, or "NONE" if no match. No explanation.' },
              { role: 'user', content: `Order: "${orderName}"\nAvailable results: ${pool.map(r => r.name).join(', ')}` },
            ],
          });
          const aiMatch = aiResp.choices[0].message.content.trim();
          const found = pool.find(r => r.name.toLowerCase() === aiMatch.toLowerCase());
          if (found) {
            return res.json({
              found: true,
              name: found.name,
              result: found.result,
              flag: found.flag,
            });
          }
        } catch (_) { /* fall through */ }
      }

      res.json({
        found: false,
        name: orderName,
        result: 'Not available for this case',
        flag: null,
      });
    }
  } catch (e) {
    console.error('Order test error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/case-feedback — Generate feedback on the trainee's performance
app.post('/api/case-feedback', async (req, res) => {
  try {
    const { caseId, differential, presentationAndMdm } = req.body;

    if (!caseId || !differential || !presentationAndMdm) {
      return res.status(400).json({ error: 'Missing caseId, differential, or presentationAndMdm' });
    }

    const caseData = casesData.find(c => c.id === caseId);
    if (!caseData) {
      return res.status(404).json({ error: `Case not found: ${caseId}` });
    }

    const gs = caseData.goldStandard;

    const prompt = `You are an experienced emergency medicine attending providing feedback to a trainee who just worked through an ED case simulation.

THE CASE:
- Chief complaint: ${caseData.chiefComplaint}
- Final diagnosis: ${gs.diagnosis}
- Disposition: ${gs.disposition}

GOLD STANDARD PRESENTATION & MDM:
${gs.presentation}

${gs.mdm}

THE TRAINEE'S DIFFERENTIAL DIAGNOSIS (entered before workup):
${differential.map((dx, i) => `${i + 1}. ${dx}`).join('\n')}

THE TRAINEE'S CASE PRESENTATION & MDM:
${presentationAndMdm}

Provide feedback in exactly two sections. Be specific, reference what the trainee actually wrote, and be encouraging but honest.

SECTION 1 — "What you did well"
- Did they identify the correct or dangerous diagnoses in their differential? Which must-not-miss diagnoses did they appropriately flag?
- What parts of their presentation/MDM were strong? (e.g., good structure, appropriate reasoning, correct management)
- Be specific — name the diagnoses or reasoning that was good.

SECTION 2 — "What you could improve"
- Which critical or must-not-miss diagnoses were missing from the differential?
- What was missing or incorrect in their presentation/MDM compared to the gold standard?
- Were there gaps in reasoning, risk stratification, or disposition planning?
- Be constructive — explain why these matter clinically.

Return your response as JSON with exactly two fields:
{
  "doingWell": "...",
  "couldImprove": "..."
}
Each field should be a paragraph of 3-6 sentences. Do not use bullet points or markdown — just flowing prose.`;

    const response = await aiClient.chat.completions.create({
      model: aiModel,
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'You are a board-certified EM attending giving trainee feedback. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
    });

    const text = response.choices[0].message.content;
    const feedback = JSON.parse(text.replace(/```json|```/g, '').trim());

    res.json(feedback);
  } catch (e) {
    console.error('Case feedback error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/transcribe — Transcribe audio via Deepgram
app.post('/api/transcribe', async (req, res) => {
  try {
    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (!dgKey) {
      return res.status(500).json({ error: 'DEEPGRAM_API_KEY not configured' });
    }

    const audioBuffer = req.body;
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    const dgResponse = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${dgKey}`,
          'Content-Type': req.headers['content-type'] || 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!dgResponse.ok) {
      const errText = await dgResponse.text();
      console.error('Deepgram error:', dgResponse.status, errText);
      return res.status(dgResponse.status).json({ error: `Deepgram error: ${dgResponse.status}` });
    }

    const result = await dgResponse.json();
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    res.json({ transcript });
  } catch (e) {
    console.error('Transcribe error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Export for Vercel serverless
module.exports = app;

// Start server when run directly (not imported)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log(`Loaded ${goldStandard.length} chief complaints`);
    console.log(`Loaded ${Object.keys(synonymMap).length} synonym entries`);
  });
}
