// scripts/fetch_pubmed.js
// Run: node scripts/fetch_pubmed.js
// Output: scripts/output/pubmed_cases.json
// No API key required. Rate limit: 3 req/sec.

const fetch = require('node-fetch');
const fs = require('fs');

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const NCBI_PARAMS = 'tool=EDMind&email=edmind@example.com';

const QUERIES = [
  '"emergency department" AND "missed diagnosis" AND "case report"[pt] AND "open access"[filter]',
  '"emergency medicine" AND "atypical presentation" AND "case report"[pt] AND "open access"[filter]',
  '"emergency department" AND "diagnostic error" AND "case report"[pt]',
  '"emergency medicine" AND "delayed diagnosis" AND "case report"[pt] AND "open access"[filter]',
  '"chest pain" AND "missed diagnosis" AND "emergency" AND "case report"[pt]',
  '"headache" AND "subarachnoid" AND "missed" AND "emergency"',
  '"back pain" AND "aortic dissection" AND "missed" AND "case report"[pt]',
  '"syncope" AND "arrhythmia" AND "missed" AND "emergency" AND "case report"[pt]',
];

async function searchPubMed(query, retmax = 40) {
  const url = `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&retmode=json&${NCBI_PARAMS}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.esearchresult?.idlist || [];
}

async function fetchSummaries(ids) {
  if (ids.length === 0) return {};
  const url = `${BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json&${NCBI_PARAMS}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

async function main() {
  fs.mkdirSync('scripts/output', { recursive: true });
  const allIds = new Set();

  for (const query of QUERIES) {
    console.log(`Searching: ${query.slice(0, 70)}...`);
    const ids = await searchPubMed(query);
    ids.forEach(id => allIds.add(id));
    console.log(`  Found ${ids.length} results (total unique: ${allIds.size})`);
    await new Promise(r => setTimeout(r, 400));
  }

  const idArray = [...allIds].slice(0, 300);
  console.log(`\nFetching summaries for ${idArray.length} PMIDs...`);

  const allSummaries = [];
  for (let i = 0; i < idArray.length; i += 20) {
    const batch = idArray.slice(i, i + 20);
    const data = await fetchSummaries(batch);
    const records = batch
      .map(id => data[id])
      .filter(r => r && r.uid && r.title);
    allSummaries.push(...records);
    process.stdout.write(`  ${allSummaries.length}/${idArray.length}\r`);
    await new Promise(r => setTimeout(r, 400));
  }

  fs.writeFileSync('scripts/output/pubmed_cases.json', JSON.stringify(allSummaries, null, 2));
  console.log(`\nSaved ${allSummaries.length} PubMed records -> scripts/output/pubmed_cases.json`);
}

main().catch(console.error);
