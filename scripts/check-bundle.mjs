// Bundle budget check (Part 12, FR-12.7 / AC-12.4). Run after `npm run build`:
//   node scripts/check-bundle.mjs
// - Initial JS (the entry script + modulepreloads in dist/index.html) must be ≤ 200 KB gzip.
// - The editor (React Flow) must not be part of the initial load: it is loaded on demand.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = new URL('../dist/', import.meta.url);
const BUDGET_KB = 200;

const html = readFileSync(new URL('index.html', DIST), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
const gz = (file) => gzipSync(readFileSync(new URL(file, DIST))).length;
const kb = (bytes) => (bytes / 1024).toFixed(1);

const initialBytes = initial.reduce((sum, f) => sum + gz(f), 0);
const all = readdirSync(new URL('assets/', DIST)).filter((f) => f.endsWith('.js'));
const sizes = all.map((f) => ({ file: f, gzip: gz(join('assets', f)) })).sort((a, b) => b.gzip - a.gzip);

console.log('Initial JS (loaded on every page):');
for (const f of initial) console.log(`  ${f}  ${kb(gz(f))} KB gzip`);
console.log(`  total ${kb(initialBytes)} KB gzip (budget ${BUDGET_KB} KB)`);
console.log('Largest chunks:');
for (const s of sizes.slice(0, 6)) console.log(`  assets/${s.file}  ${kb(s.gzip)} KB gzip`);

const problems = [];
if (initialBytes > BUDGET_KB * 1024) problems.push(`initial JS ${kb(initialBytes)} KB > ${BUDGET_KB} KB`);
const initialSource = initial.map((f) => readFileSync(new URL(f, DIST), 'utf8')).join('\n');
if (/react-flow__pane|xyflow/.test(initialSource)) problems.push('React Flow is in the initial bundle');

if (problems.length) {
  console.error(`\nBundle budget FAILED: ${problems.join('; ')}`);
  process.exit(1);
}
console.log('\nBundle budget OK');
