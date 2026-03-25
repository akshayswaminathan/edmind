// scripts/scrape_wikem.cjs
// Run: node scripts/scrape_wikem.cjs
// Output: scripts/output/wikem_raw.json

const fetch = require('node-fetch');
const fs = require('fs');

const WIKEM_API = 'https://wikem.org/w/api.php';

const CHIEF_COMPLAINTS = [
  'Chest_pain',
  'Shortness_of_breath',
  'Abdominal_pain',
  'Syncope',
  'Altered_mental_status',
  'Headache',
  'Back_pain',
  'Palpitations',
  'Fever',
  'Weakness',
  'Dizziness',
  'Nausea_and_vomiting',
  'Eye_pain',
  'Sore_throat',
  'Dysuria',
  'Vaginal_bleeding',
  'Rash',
  'Seizure',
  'Overdose',
  'Pediatric_fever',
  'Hypertensive_emergency',
  'Shock'
];

async function fetchWikitext(title) {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'wikitext',
    format: 'json',
    origin: '*',
    redirects: '1'
  });

  const res = await fetch(`${WIKEM_API}?${params}`);
  const data = await res.json();

  if (data.error) {
    console.warn(`  Warning: Not found: ${title}`);
    return null;
  }

  return {
    wikitext: data?.parse?.wikitext?.['*'] || '',
    resolvedTitle: data?.parse?.title || title
  };
}

function cleanWikiLink(text) {
  return text
    .replace(/\[\[Special:MyLanguage\/([^\]|]+)(\|([^\]]+))?\]\]/g, (m, link, _, display) => display || link)
    .replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (m, link, _, display) => display || link)
    .replace(/'''|''/g, '')
    .replace(/<!--.*?-->/g, '')
    .replace(/<\/?translate>/g, '')
    .replace(/<\/?noinclude>/g, '')
    .replace(/<languages\/>/g, '')
    .replace(/\{\{.*?\}\}/g, '')
    .replace(/:$/, '')
    .trim();
}

function parseListItems(text) {
  return text
    .split('\n')
    .filter(l => l.trim().match(/^\*+/))
    .map(l => cleanWikiLink(l.replace(/^\s*\*+/, '')))
    .filter(l => l.length > 1 && !l.startsWith('See ') && !l.startsWith('<'));
}

function extractSection(wikitext, header) {
  // Match ==Header== through next == header (not ===)
  const regex = new RegExp(`^==\\s*${header}\\s*==\\s*$([\\s\\S]*?)(?=^==[^=]|\\Z)`, 'im');
  const match = wikitext.match(regex);
  return match ? match[1] : '';
}

function extractTemplateRef(sectionText) {
  // Look for {{Template Name}} references
  const match = sectionText.match(/\{\{([^}]+)\}\}/);
  return match ? `Template:${match[1].trim()}` : null;
}

function parseDDXFromTemplate(wikitext) {
  // WikEM templates use various category headers:
  // ====Critical==== / ====Emergent==== / ====Nonemergent====
  // ====Killers==== / ====Maimers==== / ====Common====
  // Or bold text categories like '''Cardiovascular-mediated syncope'''
  // We need to handle all these patterns

  const critical = [];    // Critical / Killers / Must-not-miss
  const emergent = [];    // Emergent / Maimers
  const nonemergent = []; // Nonemergent / Common / Other

  const criticalPatterns = /critical|killers?|must.?not.?miss|life.?threaten|dangerous/i;
  const emergentPatterns = /emergent|maimers?|serious|important/i;
  const nonemergentPatterns = /nonemergent|non-emergent|common|benign|other|minor/i;

  let currentCategory = 'nonemergent'; // default: capture everything
  const lines = wikitext.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Check for section headers (=== or ====)
    if (trimmed.match(/^={3,}.*={3,}$/)) {
      if (criticalPatterns.test(trimmed)) currentCategory = 'critical';
      else if (emergentPatterns.test(trimmed)) currentCategory = 'emergent';
      else if (nonemergentPatterns.test(trimmed)) currentCategory = 'nonemergent';
      // else keep current category
      continue;
    }

    // Parse list items
    if (trimmed.match(/^\*+/)) {
      const item = cleanWikiLink(trimmed.replace(/^\*+/, ''));

      if (item.length > 1 && !item.startsWith('See ') && !item.startsWith('<')) {
        if (currentCategory === 'critical') critical.push(item);
        else if (currentCategory === 'emergent') emergent.push(item);
        else nonemergent.push(item);
      }
    }
  }

  // If no categories were detected, just return all items as a flat list
  if (critical.length === 0 && emergent.length === 0 && nonemergent.length === 0) {
    // Fall back: parse all list items without categorization
    const all = parseListItems(wikitext);
    return { critical: [], emergent: [], nonemergent: all };
  }

  return { critical, emergent, nonemergent };
}

async function processComplaint(complaint) {
  const result = await fetchWikitext(complaint);
  if (!result || !result.wikitext) return null;

  const { wikitext, resolvedTitle } = result;

  // Extract sections
  const ddxSection = extractSection(wikitext, 'Differential Diagnosis');
  const evalSection = extractSection(wikitext, 'Evaluation');
  const mgmtSection = extractSection(wikitext, 'Management');

  // Check if DDX section references a template
  const templateRef = extractTemplateRef(ddxSection);
  let ddx = { critical: [], emergent: [], nonemergent: [] };

  if (templateRef) {
    console.log(`  Fetching template: ${templateRef}`);
    const templateResult = await fetchWikitext(templateRef);
    await new Promise(r => setTimeout(r, 400));
    if (templateResult && templateResult.wikitext) {
      ddx = parseDDXFromTemplate(templateResult.wikitext);
    }
  }

  // If no template or template failed, try parsing DDX directly from section
  if (ddx.critical.length === 0 && ddx.emergent.length === 0) {
    ddx = parseDDXFromTemplate(ddxSection);
  }

  // If still no structured DDX, parse as flat list
  if (ddx.critical.length === 0 && ddx.emergent.length === 0 && ddx.nonemergent.length === 0) {
    const allDDX = parseListItems(ddxSection);
    // Put them all as uncat
    ddx.nonemergent = allDDX;
  }

  const allDifferentials = [...ddx.critical, ...ddx.emergent, ...ddx.nonemergent];

  return {
    chiefComplaint: complaint.replace(/_/g, ' '),
    wikemTitle: resolvedTitle,
    wikemUrl: `https://wikem.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
    differentials: allDifferentials,
    mustNotMiss: ddx.critical,
    common: ddx.emergent,
    rare: ddx.nonemergent,
    managementPearls: parseListItems(mgmtSection).slice(0, 8),
    evaluationSteps: parseListItems(evalSection).slice(0, 8),
  };
}

async function main() {
  fs.mkdirSync('scripts/output', { recursive: true });
  const results = {};

  for (const complaint of CHIEF_COMPLAINTS) {
    console.log(`Fetching: ${complaint}...`);
    try {
      const data = await processComplaint(complaint);
      if (data) {
        results[complaint] = data;
        console.log(`  OK: ${data.differentials.length} differentials (${data.mustNotMiss.length} critical, ${data.common.length} emergent, ${data.rare.length} other)`);
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  fs.writeFileSync('scripts/output/wikem_raw.json', JSON.stringify(results, null, 2));
  console.log(`\nDone. Saved ${Object.keys(results).length} complaints -> scripts/output/wikem_raw.json`);
}

main().catch(console.error);
