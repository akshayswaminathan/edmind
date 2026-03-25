// Vercel serverless function for /api/score
import { readFileSync } from 'fs';
import { join } from 'path';

// Load data at cold start
const goldStandard = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/gold_standard.json'), 'utf-8')
);
const synonymMap = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/synonym_map.json'), 'utf-8')
);

// Build reverse synonym lookup
const reverseSynonyms = {};
for (const [officialName, syns] of Object.entries(synonymMap)) {
  const key = officialName.toLowerCase().trim();
  if (!reverseSynonyms[key]) reverseSynonyms[key] = [];
  reverseSynonyms[key].push(officialName);
  for (const syn of syns) {
    const synKey = (typeof syn === 'string' ? syn : '').toLowerCase().trim();
    if (synKey) {
      if (!reverseSynonyms[synKey]) reverseSynonyms[synKey] = [];
      reverseSynonyms[synKey].push(officialName);
    }
  }
}

function normalize(s) {
  return s.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatch(userEntry, officialNames) {
  const norm = normalize(userEntry);
  if (!norm || norm.length === 0) return null;

  for (const official of officialNames) {
    if (norm === normalize(official)) return official;
  }

  const reverseMatches = reverseSynonyms[norm] || [];
  for (const officialName of reverseMatches) {
    if (officialNames.includes(officialName)) return officialName;
  }

  for (const official of officialNames) {
    const syns = synonymMap[official] || [];
    for (const syn of syns) {
      const normSyn = normalize(typeof syn === 'string' ? syn : '');
      if (normSyn && norm === normSyn) return official;
    }
  }

  if (norm.length >= 5) {
    for (const official of officialNames) {
      const normOfficial = normalize(official);
      if (normOfficial.includes(norm) && norm.length >= normOfficial.length * 0.4) return official;
      if (norm.includes(normOfficial)) return official;
    }
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
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { chiefComplaint, userList, complaintSlug } = req.body;
    if (!chiefComplaint || !userList) {
      return res.status(400).json({ error: 'Missing chiefComplaint or userList' });
    }

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

    const redCaught = [];
    const yellowCaught = [];
    const unmatched = [];

    for (const entry of userList) {
      if (entry === '(no entries)') continue;
      const redMatch = findMatch(entry, redNames);
      if (redMatch) { if (!redCaught.includes(redMatch)) redCaught.push(redMatch); continue; }
      const yellowMatch = findMatch(entry, yellowNames);
      if (yellowMatch) { if (!yellowCaught.includes(yellowMatch)) yellowCaught.push(yellowMatch); continue; }
      unmatched.push(entry);
    }

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
1. Does it semantically match any RED diagnosis?
2. Does it semantically match any YELLOW diagnosis?
3. Is it a valid EM diagnosis but not on either list? (bonus)
4. Is it not a valid diagnosis at all? (invalid)

Return ONLY valid JSON:
{"redMatches":[{"userEntry":"...","matchedDiagnosis":"..."}],"yellowMatches":[{"userEntry":"...","matchedDiagnosis":"..."}],"bonus":["valid dx"],"invalid":["not a diagnosis"]}`;

        const aiText = await callOpenAI(
          'You are a board-certified EM physician. Return only valid JSON.',
          aiPrompt, 800
        );
        const aiResult = JSON.parse(aiText.replace(/```json|```/g, '').trim());
        aiRedCaught = (aiResult.redMatches || []).map(m => m.matchedDiagnosis).filter(d => redNames.includes(d));
        aiYellowCaught = (aiResult.yellowMatches || []).map(m => m.matchedDiagnosis).filter(d => yellowNames.includes(d));
        bonusDiagnoses = aiResult.bonus || [];
        invalidEntries = aiResult.invalid || [];
      } catch (e) {
        bonusDiagnoses = unmatched;
      }
    }

    const allRedCaught = [...new Set([...redCaught, ...aiRedCaught])];
    const allYellowCaught = [...new Set([...yellowCaught, ...aiYellowCaught])];
    const redMissed = redNames.filter(d => !allRedCaught.includes(d));
    const yellowMissed = yellowNames.filter(d => !allYellowCaught.includes(d));

    const redScore = redNames.length > 0 ? (allRedCaught.length / redNames.length) * 60 : 60;
    const yellowScore = yellowNames.length > 0 ? (allYellowCaught.length / yellowNames.length) * 30 : 30;
    const bonusScore = Math.min(bonusDiagnoses.length * 2, 10);
    const totalScore = Math.round(Math.min(redScore + yellowScore + bonusScore, 100));

    let grade;
    if (totalScore >= 90) grade = 'A';
    else if (totalScore >= 80) grade = 'B';
    else if (totalScore >= 70) grade = 'C';
    else if (totalScore >= 60) grade = 'D';
    else grade = 'F';

    res.json({
      redCaught: allRedCaught, redMissed,
      yellowCaught: allYellowCaught, yellowMissed,
      bonusDiagnoses, invalidEntries,
      score: totalScore, grade,
      redTotal: redNames.length, yellowTotal: yellowNames.length,
    });
  } catch (e) {
    console.error('Score error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
