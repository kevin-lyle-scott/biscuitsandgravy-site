#!/usr/bin/env node
/**
 * Accessibility regression gate.
 *
 * Serves a built site directory, loads every page in both colour schemes, runs
 * axe-core against it, and exits non-zero if anything is flagged. Intended for
 * CI so that a CSS or template change cannot quietly reintroduce a violation.
 *
 *   node .github/scripts/a11y-audit.mjs _site
 *
 * Pages are discovered from the built output rather than listed here, so new
 * posts are covered automatically without touching this script.
 */
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, extname, relative, sep } from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

const ROOT = process.argv[2] || '_site';

// WCAG 2.0/2.1 A, AA and AAA, plus axe's best-practice rules. AAA is included
// deliberately: the site's colour tokens are chosen to meet 7:1, and dropping
// to AA here would stop guarding the property we actually care about.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag2aaa', 'best-practice'];

// Third-party hosts are blocked so results depend only on our own markup and
// CSS. Without this a slow CDN turns an a11y failure into a flaky one.
const THIRD_PARTY = /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|cdnjs|polyfill|cloudflareinsights/;

// Paths excluded from the gate, as substrings of the served URL. Empty by
// design: everything the site publishes is audited. The mechanism is kept so
// an exclusion, if ever needed, has to be written down and reviewed.
//
// TRAP, do not remove: research/LinguisticSemanticChunking.html pulls Tailwind
// from cdn.tailwindcss.com at runtime. Adding tailwindcss to THIRD_PARTY below
// stops `text-white` from applying, the active paradigm button renders black on
// teal, and axe reports a color-contrast failure that does not exist for real
// users (white on #00796B is 5.32:1 and passes AA).
const EXCLUDE = [];
const HONOUR_EXCLUDE = !process.argv.includes('--no-exclude');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

async function walk(dir, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'site_libs' || entry.name.startsWith('.')) continue;
      await walk(full, acc);
    } else if (extname(entry.name) === '.html') {
      acc.push(full);
    }
  }
  return acc;
}

async function discoverPages() {
  const files = await walk(ROOT);
  const pages = [];
  for (const f of files) {
    const html = await readFile(f, 'utf8');
    // Quarto emits a JS redirect stub for each `aliases:` entry. They have no
    // content and no lang attribute, so auditing them reports failures for a
    // page no human ever sees.
    if (html.includes('window.location.replace') && html.length < 2000) continue;
    const url = '/' + relative(ROOT, f).split(sep).join('/');
    if (HONOUR_EXCLUDE && EXCLUDE.some(x => url.includes(x))) continue;
    pages.push(url);
  }
  return pages.sort();
}

function serve(root) {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = join(root, p);
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const pages = await discoverPages();
if (!pages.length) {
  console.error(`No pages found under ${ROOT}. Did the site build?`);
  process.exit(1);
}

await stat(ROOT);
const server = await serve(ROOT);
const base = `http://127.0.0.1:${server.address().port}`;
// Honour an explicit browser path so the audit can also run in environments
// that ship a pre-provisioned Chromium instead of Playwright's download.
const browser = await chromium.launch(
  process.env.A11Y_CHROMIUM ? { executablePath: process.env.A11Y_CHROMIUM } : {}
);
const findings = [];

for (const scheme of ['light', 'dark']) {
  for (const page of pages) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
    const tab = await ctx.newPage();
    await tab.route('**/*', r => THIRD_PARTY.test(r.request().url()) ? r.abort() : r.continue());
    await tab.goto(base + page, { waitUntil: 'domcontentloaded' });
    // Entrance animations start elements at opacity 0; auditing before they
    // settle produces spurious colour-contrast results.
    await tab.waitForTimeout(1400);
    await tab.addScriptTag({ content: axeSource });
    const res = await tab.evaluate(t => window.axe.run(document, { runOnly: { type: 'tag', values: t } }), TAGS);
    for (const v of res.violations) {
      findings.push({
        page: `${page} [${scheme}]`, id: v.id, impact: v.impact || 'unknown', help: v.help,
        nodes: v.nodes.length,
        sample: (v.nodes[0]?.html || '').replace(/\s+/g, ' ').slice(0, 120),
      });
    }
    await ctx.close();
  }
}

await browser.close();
server.close();

const loads = pages.length * 2;
if (!findings.length) {
  console.log(`axe: no violations across ${loads} page loads (${pages.length} pages x light/dark)`);
  process.exit(0);
}

const byRule = new Map();
for (const f of findings) {
  if (!byRule.has(f.id)) byRule.set(f.id, []);
  byRule.get(f.id).push(f);
}

console.error(`axe: ${byRule.size} rule(s) violated across ${loads} page loads\n`);
const order = { critical: 0, serious: 1, moderate: 2, minor: 3, unknown: 4 };
for (const [id, list] of [...byRule.entries()].sort((a, b) => order[a[1][0].impact] - order[b[1][0].impact])) {
  const f = list[0];
  console.error(`[${f.impact}] ${id} - ${f.help}`);
  console.error(`  pages: ${list.map(l => l.page).join(', ')}`);
  console.error(`  e.g.   ${f.sample}\n`);
}
process.exit(1);
