// Shared node helpers: static server for the project root + headless Chrome page pool.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

export const ROOT = path.resolve(import.meta.dirname, '../..');   // /Users/colas/ELI5Shorts
export const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf' };

/** Resolve an episode dir (absolute or relative to cwd) into its URL path under ROOT. */
export function episodePaths(arg = '.') {
  const dir = path.resolve(process.cwd(), arg);
  if (!dir.startsWith(ROOT) || !fs.existsSync(path.join(dir, 'episode.json'))) {
    throw new Error(`not an episode dir (needs episode.json under ${ROOT}): ${dir}`);
  }
  return { dir, url: dir.slice(ROOT.length) };
}

export function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = path.normalize(path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/** Launch `n` independent browsers (separate processes = real parallelism), each with the episode loaded. */
export async function openPages(epUrl, n, port) {
  const epJson = JSON.parse(fs.readFileSync(path.join(ROOT, epUrl, 'episode.json'), 'utf8'));
  const fmt = epJson.format === 'landscape' ? '&fmt=landscape' : '';
  const pages = await Promise.all(Array.from({ length: n }, async () => {
    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      protocolTimeout: 900000,   // long films build big sprite caches on their first frame (can exceed the 180 s default)
      args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars'],
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewport({ width: 400, height: 400 });
    await page.goto(`http://127.0.0.1:${port}/engine/runtime/index.html?ep=${encodeURIComponent(epUrl)}${fmt}`, { waitUntil: 'load' });
    try {
      await page.evaluate(() => window.__ready);
    } catch (e) {
      const detail = await page.evaluate(() => window.__error).catch(() => null);
      throw new Error(`episode failed to load: ${detail || e}\n${errors.join('\n')}`);
    }
    return { browser, page, errors };
  }));
  return pages;
}

export async function info(p) {
  return p.page.evaluate(() => window.__info);
}

/** Render one frame; returns PNG bytes. Throws with page errors attached if drawing failed. */
export async function renderPng(p, frame, sub = 1) {
  let url;
  try {
    url = await p.page.evaluate((f, s) => window.renderFrame(f, s), frame, sub);
  } catch (e) {
    throw new Error(`frame ${frame} failed: ${e.message}\n${p.errors.join('\n')}`);
  }
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

export async function closeAll(pages, server) {
  await Promise.all(pages.map((p) => p.browser.close().catch(() => {})));
  if (server) {
    server.closeAllConnections();   // idle keep-alive sockets would otherwise keep node running
    server.close();
  }
}

/** Tiny argv parser: --key value / --flag. Positional args in `_`. */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2), nxt = argv[i + 1];
      if (nxt === undefined || nxt.startsWith('--')) out[k] = true; else { out[k] = nxt; i++; }
    } else out._.push(a);
  }
  return out;
}
