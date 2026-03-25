// server.cjs — Express backend for scoring API
// Uses gold-standard differential lists + synonym matching + OpenAI fallback
// Run: node server.cjs

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env');
  process.exit(1);
}

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

// Check if user entry matches an official diagnosis
function findMatch(userEntry, officialNames) {
  const norm = normalize(userEntry);
  if (!norm || norm.length === 0) return null;

  // Pass 1: Exact match (after normalization)
  for (const official of officialNames) {
    if (norm === normalize(official)) return official;
  }

  // Pass 2: Check reverse synonym lookup (abbreviations like PE, MI, SAH, etc.)
  const reverseMatches = reverseSynonyms[norm] || [];
  for (const officialName of reverseMatches) {
    if (officialNames.includes(officialName)) return officialName;
  }

  // Pass 3: Check synonym lists for each official diagnosis
  for (const official of officialNames) {
    const syns = synonymMap[official] || [];
    for (const syn of syns) {
      const normSyn = normalize(typeof syn === 'string' ? syn : '');
      if (normSyn && norm === normSyn) return official;
    }
  }

  // Pass 4: Substring matching (only if user entry is long enough to avoid false positives)
  if (norm.length >= 5) {
    for (const official of officialNames) {
      const normOfficial = normalize(official);
      // User typed something contained in official name
      if (normOfficial.includes(norm) && norm.length >= normOfficial.length * 0.4) return official;
      // User typed something that contains the official name
      if (norm.includes(normOfficial)) return official;
    }

    // Also check synonym substrings
    for (const official of officialNames) {
      const syns = synonymMap[official] || [];
      for (const syn of syns) {
        const normSyn = normalize(typeof syn === 'string' ? syn : '');
        if (normSyn && normSyn.length >= 4) {
          if (norm.includes(normSyn) || normSyn.includes(norm)) return official;
        }
      }
    }
  }

  // Pass 5: Word overlap for multi-word entries
  const userWords = norm.split(/\s+/).filter(w => w.length > 3);
  if (userWords.length >= 1) {
    for (const official of officialNames) {
      const officialWords = normalize(official).split(/\s+/).filter(w => w.length > 3);
      if (officialWords.length === 0) continue;
      const overlap = userWords.filter(w =>
        officialWords.some(ow => ow === w || (w.length >= 5 && (ow.includes(w) || w.includes(ow))))
      );
      if (overlap.length > 0 && overlap.length >= Math.ceil(Math.min(userWords.length, officialWords.length) * 0.5)) {
        return official;
      }
    }
  }

  return null;
}

async function callOpenAI(systemPrompt, userPrompt, maxTokens = 1000) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
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

    // Phase 1: Deterministic matching
    const redCaught = [];
    const yellowCaught = [];
    const unmatched = [];

    for (const entry of userList) {
      if (entry === '(no entries)') continue;

      // Check red list first
      const redMatch = findMatch(entry, redNames);
      if (redMatch) {
        if (!redCaught.includes(redMatch)) redCaught.push(redMatch);
        continue;
      }

      // Check yellow list
      const yellowMatch = findMatch(entry, yellowNames);
      if (yellowMatch) {
        if (!yellowCaught.includes(yellowMatch)) yellowCaught.push(yellowMatch);
        continue;
      }

      unmatched.push(entry);
    }

    // Phase 2: Use OpenAI for unmatched entries
    let aiRedCaught = [];
    let aiYellowCaught = [];
    let bonusDiagnoses = [];
    let invalidEntries = [];

    if (unmatched.length > 0) {
      try {
        const aiPrompt = `You are an emergency medicine attending. A student listed these diagnoses for "${chiefComplaint}" that I couldn't match automatically.

UNMATCHED STUDENT ENTRIES:
${unmatched.map((e, i) => `${i + 1}. ${e}`).join('\n')}

GOLD STANDARD RED (must-not-miss):
${redNames.join(', ')}

GOLD STANDARD YELLOW (important to rule out):
${yellowNames.join(', ')}

For each unmatched entry, determine:
1. Does it semantically match any RED diagnosis? (e.g., "heart attack" = "Myocardial infarction")
2. Does it semantically match any YELLOW diagnosis?
3. Is it a valid EM diagnosis but not on either list? (bonus)
4. Is it not a valid diagnosis at all? (invalid)

Return ONLY valid JSON:
{
  "redMatches": [{"userEntry": "...", "matchedDiagnosis": "..."}],
  "yellowMatches": [{"userEntry": "...", "matchedDiagnosis": "..."}],
  "bonus": ["valid dx not on list"],
  "invalid": ["not a real diagnosis"]
}`;

        const aiText = await callOpenAI(
          'You are a board-certified EM physician. Return only valid JSON.',
          aiPrompt,
          800
        );

        const aiResult = JSON.parse(aiText.replace(/```json|```/g, '').trim());

        aiRedCaught = (aiResult.redMatches || []).map(m => m.matchedDiagnosis).filter(d => redNames.includes(d));
        aiYellowCaught = (aiResult.yellowMatches || []).map(m => m.matchedDiagnosis).filter(d => yellowNames.includes(d));
        bonusDiagnoses = aiResult.bonus || [];
        invalidEntries = aiResult.invalid || [];
      } catch (e) {
        console.warn('AI fallback failed, treating unmatched as bonus:', e.message);
        bonusDiagnoses = unmatched;
      }
    }

    // Merge deterministic + AI results
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Loaded ${goldStandard.length} chief complaints`);
  console.log(`Loaded ${Object.keys(synonymMap).length} synonym entries`);
});
