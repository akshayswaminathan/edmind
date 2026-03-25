const fs = require('fs');
const path = require('path');

// Load gold standard
const goldStandard = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/gold_standard.json'), 'utf-8')
);

// Get all unique diagnosis names
const allNames = new Set();
for (const item of goldStandard) {
  for (const d of [...item.red, ...item.yellow]) {
    allNames.add(d.name);
  }
}

const namesList = [...allNames].sort();
console.log(`Total unique diagnoses: ${namesList.length}`);

// Batch them for OpenAI calls (50 at a time)
const BATCH_SIZE = 50;
const batches = [];
for (let i = 0; i < namesList.length; i += BATCH_SIZE) {
  batches.push(namesList.slice(i, i + BATCH_SIZE));
}

console.log(`Will process ${batches.length} batches`);

async function generateSynonyms() {
  const apiKey = process.env.OPENAI_API_KEY;
  const synonymMap = {};

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    console.log(`Processing batch ${bi + 1}/${batches.length} (${batch.length} diagnoses)...`);

    const prompt = `You are a medical terminology expert. For each diagnosis below, provide common synonyms, abbreviations, and informal terms that a medical student or doctor might use.

Return a JSON object where each key is the EXACT diagnosis name I give you, and the value is an array of alternative terms (synonyms, abbreviations, informal names, lay terms).

Rules:
- Include common abbreviations (e.g., "MI" for "Myocardial infarction")
- Include lay terms (e.g., "heart attack" for "Myocardial infarction")
- Include alternative medical terms (e.g., "CVA" for "Cerebral infarction")
- Keep each synonym concise (1-4 words)
- Include 2-8 synonyms per diagnosis
- If no common synonyms exist, provide an empty array

Diagnoses:
${batch.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Return ONLY valid JSON, no markdown formatting.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 4096
        })
      });

      const data = await response.json();
      if (data.error) {
        console.error(`API error: ${data.error.message}`);
        continue;
      }

      let content = data.choices[0].message.content.trim();
      // Strip markdown code blocks if present
      content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');

      const batchResult = JSON.parse(content);
      Object.assign(synonymMap, batchResult);
      console.log(`  Got synonyms for ${Object.keys(batchResult).length} diagnoses`);
    } catch (err) {
      console.error(`Error in batch ${bi + 1}: ${err.message}`);
      // Try individual fallback for this batch
      for (const name of batch) {
        synonymMap[name] = [];
      }
    }

    // Rate limit - small delay between batches
    if (bi < batches.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Save
  const outPath = path.join(__dirname, '../src/data/synonym_map.json');
  fs.writeFileSync(outPath, JSON.stringify(synonymMap, null, 2));
  console.log(`\nSaved ${Object.keys(synonymMap).length} entries to synonym_map.json`);

  // Show some examples
  const examples = ['Myocardial infarction', 'Cerebral infarction', 'Subarachnoid hemorrhage', 'Pulmonary embolism', 'Aortic dissection'];
  for (const ex of examples) {
    if (synonymMap[ex]) {
      console.log(`  ${ex}: ${JSON.stringify(synonymMap[ex])}`);
    }
  }
}

generateSynonyms().catch(console.error);
