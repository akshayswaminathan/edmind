#!/usr/bin/env node
// clean-gold-standard.cjs — Strips parenthetical qualifiers from diagnosis names
// "Myocardial infarction (acute coronary syndrome)" → "Myocardial infarction"
// Also deduplicates entries within each complaint.

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const gsPath = path.join(__dirname, '..', 'src', 'data', 'gold_standard.json');
const gs = JSON.parse(fs.readFileSync(gsPath, 'utf-8'));

let cleaned = 0;
let deduped = 0;

for (const entry of gs) {
  for (const list of ['red', 'yellow']) {
    const seen = new Set();
    const filtered = [];

    for (const dx of entry[list]) {
      // Strip parenthetical qualifiers from name
      const original = dx.name;
      dx.name = dx.name.replace(/\s*\(.*?\)\s*/g, '').trim();
      if (dx.name !== original) cleaned++;

      // Deduplicate (case-insensitive)
      const key = dx.name.toLowerCase();
      if (seen.has(key)) {
        deduped++;
        continue;
      }
      seen.add(key);
      filtered.push(dx);
    }

    entry[list] = filtered;
  }
}

fs.writeFileSync(gsPath, JSON.stringify(gs, null, 2), 'utf-8');
console.log(`Cleaned ${cleaned} names, removed ${deduped} duplicates.`);
