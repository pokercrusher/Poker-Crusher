// tests/smoke.mjs — whole-app smoke test against the real page (audit §4.5).
//
// Serves the repo, opens every screen in headless Chromium at phone size, and
// fails on any page error. Catches the class of bug unit tests can't see:
// script-order breaks, missing globals, a screen that throws on open.
//
//   npm run smoke
//
// Needs playwright-core (devDependency) and a Chromium binary: set CHROME_PATH,
// or it falls back to the Claude Code cloud path, then PATH lookup.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath.slice(1));
    try {
        if (!file.startsWith(ROOT)) throw new Error('traversal');
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404); res.end();
    }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/index.html`;

const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    '/opt/pw-browsers/chromium',
].filter(Boolean);
const executablePath = CHROME_CANDIDATES.find(p => existsSync(p));

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));

let failures = 0;
async function visit(name, fn, { reload = true } = {}) {
    if (reload) { await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(900); }
    const before = errs.length;
    try { await fn(); await page.waitForTimeout(700); }
    catch (e) { errs.push(name + ': ' + e.message); }
    const ok = errs.length === before;
    if (!ok) failures++;
    console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : ' — ' + errs.slice(before).join(' | ')));
}

console.log('Smoke test: ' + base);
await visit('menu boots', async () => {}, { reload: true });
await visit('trainer session starts', async () => {
    await page.evaluate(() => document.getElementById('btn-train-now').click());
    await page.waitForTimeout(1500);
});
await visit('math drills menu', async () => {
    await page.evaluate(() => document.getElementById('btn-math-drills').click());
});
await visit('exploit drill answers + advances', async () => {
    await page.evaluate(() => document.getElementById('btn-math-drills').click());
    await page.evaluate(() => startMathDrill('EXPLOIT'));
    await page.evaluate(() => submitExploitAnswer(0));
    await page.evaluate(() => advanceMathDrill());
});
await visit('mixed math stays math-only', async () => {
    await page.evaluate(() => document.getElementById('btn-math-drills').click());
    await page.evaluate(() => startMathDrill('MIXED'));
    const leaked = await page.evaluate(() => mathDrill.queue.some(q => q.drillType === 'EXPLOIT'));
    if (leaked) throw new Error('EXPLOIT leaked into MIXED');
});
await visit('library opens', async () => {
    await page.evaluate(() => document.getElementById('btn-library').click());
});
await visit('stats opens', async () => {
    await page.evaluate(() => document.getElementById('btn-my-stats').click());
});
await visit('challenge opens', async () => {
    await page.evaluate(() => document.getElementById('btn-challenge').click());
});
await visit('daily run starts', async () => {
    await page.evaluate(() => document.getElementById('btn-daily-run').click());
    await page.waitForTimeout(1200);
});
await visit('poker room lobby + a dealt hand', async () => {
    await page.evaluate(() => document.getElementById('btn-poker-room').click());
    await page.waitForTimeout(500);
    await page.evaluate(() => { const b = document.querySelector('[data-pr="sit"]'); if (b) b.click(); });
    await page.waitForTimeout(2500);
    const dealt = await page.evaluate(() =>
        typeof PRT !== 'undefined' && PRT.hand && PRT.hand.seats.filter(Boolean).length >= 2);
    if (!dealt) throw new Error('no hand dealt');
});

await browser.close();
server.close();
console.log(failures === 0 ? 'SMOKE PASS — all screens clean' : `SMOKE FAIL — ${failures} screen(s) with errors`);
process.exit(failures === 0 ? 0 : 1);
