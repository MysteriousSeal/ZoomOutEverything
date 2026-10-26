// Stills + contact sheets for review.
//   node engine/node/shots.mjs <episodeDir> --name review_s3 [--beats 2,3] [--per 4] [--times 1.2,5.5] [--sub 1] [--full]
// Writes build/shots/<name>_<time>.png and build/shots/<name>_sheet.jpg (labelled tiles, 270x480 each; 480x270 for landscape).
// --beats: only these beat indexes (default: all); --per: frames per beat, spread over the beat (default 4)
// --full: also keep full-resolution PNGs (default: yes; sheet is always made)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { args, closeAll, episodePaths, info, openPages, renderPng, serve } from './common.mjs';

const a = args();
const { dir, url } = episodePaths(a._[0]);
const name = a.name || 'shots';
const sub = +(a.sub || 1);
const land = JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8')).format === 'landscape';
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'build/timeline.json'), 'utf8'));
const FPS = 30;

let times = [];
if (a.times) times = String(a.times).split(',').map(Number);
else {
  const beats = a.beats ? String(a.beats).split(',').map(Number) : tl.scenes.map((_, i) => i);
  const per = +(a.per || 4);
  for (const b of beats) {
    const s = tl.scenes[b];
    for (let k = 0; k < per; k++) times.push(+(s.start + (s.end - s.start) * (k + 0.5) / per).toFixed(2));
  }
}

const outDir = path.join(dir, 'build/shots');
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serve();
const pages = await openPages(url, Math.min(4, times.length), port);
const files = [];
await Promise.all(pages.map(async (p, w) => {
  for (let i = w; i < times.length; i += pages.length) {
    const t = times[i];
    const f = path.join(outDir, `${name}_${t.toFixed(2).padStart(6, '0')}.png`);
    fs.writeFileSync(f, await renderPng(p, Math.round(t * FPS), sub));
    files[i] = f;
  }
}));
await closeAll(pages, server);

const sheet = path.join(outDir, `${name}_sheet.jpg`);
const tiles = files.flatMap((f, i) => ['-label', `${times[i].toFixed(2)}s  b${beatOf(times[i])}`, f]);
execFileSync('montage', [...tiles, '-tile', `${Math.min(6, files.length)}x`, '-geometry', land ? '480x270+4+4' : '270x480+4+4',
  '-background', '#111', '-fill', '#ddd', '-pointsize', '16', sheet]);
console.log(JSON.stringify({ sheet, frames: files }, null, 1));

function beatOf(t) { let b = 0; tl.scenes.forEach((s, i) => { if (s.start <= t) b = i; }); return b; }

// puppeteer can leave handles open after browser.close(); exit explicitly once work is done
process.exit(0);
