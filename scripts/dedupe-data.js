/*
  Deduplicate questions inside each JSON under src/data by identical "question" text.
  - Keeps the first occurrence, removes subsequent duplicates
  - Preserves other fields as-is
  - Writes files prettified with 2-space indentation
*/

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

function normalizeQuestion(q) {
  if (typeof q !== 'string') return '';
  return q.replace(/\s+/g, ' ').trim();
}

function dedupeFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    if (!json || !Array.isArray(json.questions)) {
      console.log(`SKIP (no questions[]): ${path.basename(filePath)}`);
      return;
    }
    const seen = new Set();
    const before = json.questions.length;
    const deduped = [];
    for (const item of json.questions) {
      const key = normalizeQuestion(item && item.question);
      if (!key) {
        deduped.push(item);
        continue;
      }
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }
    const removed = before - deduped.length;
    if (removed > 0) {
      json.questions = deduped;
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
      console.log(`DEDUP ${path.basename(filePath)} → removed ${removed} duplicates (kept ${deduped.length})`);
    } else {
      console.log(`OK    ${path.basename(filePath)} → no duplicates`);
    }
  } catch (err) {
    console.error(`ERROR ${path.basename(filePath)}: ${err.message}`);
  }
}

function main() {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    dedupeFile(path.join(dataDir, f));
  }
}

main();


