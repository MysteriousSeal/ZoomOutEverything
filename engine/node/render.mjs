// Final render: all frames (motion-blurred) -> PNG sequence -> ffmpeg (+ build/mix.wav).
//   node engine/node/render.mjs <episodeDir> [--sub 4] [--workers 6] [--from 0 --to N] [--pipe]
// --pipe: stream frames straight into ffmpeg in order (no PNGs on disk; for long films). Video only, then the mix is
//         muxed in a second pass.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { args, closeAll, episodePaths, info, openPages, renderPng, serve } from './common.mjs';

const a = args();
const { dir, url } = episodePaths(a._[0]);
const ep = JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8'));
const sub = +(a.sub || 4);
// master: loudness-normalised (-14 LUFS by default); episode.json "loudness" / "lra" override it (ASMR: quieter, wider)
const MASTER = `loudnorm=I=${ep.loudness ?? -14}:TP=-1.5:LRA=${ep.lra ?? 11},alimiter=limit=0.8:level=false:attack=1:release=50`;
const workers = +(a.workers || 6);
const framesDir = path.join(dir, 'build/frames');
fs.mkdirSync(framesDir, { recursive: true });

if (a.pipe) { await renderPiped(); process.exit(0); }

const { server, port } = await serve();
const pages = await openPages(url, workers, port);
const { frames } = await info(pages[0]);
const from = +(a.from || 0), to = Math.min(frames, +(a.to || frames));
const t0 = performance.now();
let done = 0;
await Promise.all(pages.map(async (p, w) => {
  for (let f = from + w, k = 1; f < to; f += workers, k++) {
    if (k % 250 === 0) { await p.page.reload({ waitUntil: 'load' }); await p.page.evaluate(() => window.__ready); }   // fresh canvases before they degrade
    fs.writeFileSync(path.join(framesDir, `f_${String(f).padStart(5, '0')}.png`), await guardedPng(p, f));
    if (++done % 60 === 0) {
      const el = (performance.now() - t0) / 1000;
      console.log(`frame ${done}/${to - from}  ${(el / done * 1000).toFixed(0)} ms/frame (wall)  eta ${((to - from - done) * el / done).toFixed(0)}s`);
    }
  }
}));
await closeAll(pages, server);
console.log(`rendered ${to - from} frames in ${((performance.now() - t0) / 1000).toFixed(1)}s`);

// A worker's GPU canvas can die late in a long render and hand back pure-black frames that still clear the size guard.
// Scan the written frames for them and redraw each in fresh pages (a fresh page draws them fine).
for (let pass = 1; pass <= 3; pass++) {
  const bad = blackFrames();
  if (!bad.length) break;
  console.warn(`pass ${pass}: ${bad.length} black frame(s), redrawing in fresh pages: ${bad.slice(0, 12).join(' ')}${bad.length > 12 ? ' …' : ''}`);
  const s2 = await serve(), pg = await openPages(url, Math.min(workers, bad.length), s2.port);
  await Promise.all(pg.map(async (p, w) => {
    for (let i = w; i < bad.length; i += pg.length) {
      fs.writeFileSync(path.join(framesDir, `f_${String(bad[i]).padStart(5, '0')}.png`), await guardedPng(p, bad[i]));
    }
  }));
  await closeAll(pg, s2.server);
}

function blackFrames() {
  // a dead canvas gives a frame much darker than its neighbours: all black, or the HUD over an empty scene layer.
  // Per-frame mean luma (pts counts frames from `from`), flagged against the median of the 9 frames around it.
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-start_number', String(from), '-framerate', '30', '-i', path.join(framesDir, 'f_%05d.png'),
    '-vf', 'format=gray,scale=270:480,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr || '';
  const y = [];
  let pts = 0;
  for (const ln of log.split('\n')) {
    const m = ln.match(/pts:(\d+)/), v = ln.match(/YAVG=([\d.]+)/);
    if (m) pts = +m[1];
    if (v) y[pts] = +v[1];
  }
  const out = [];
  for (let k = 0; k < y.length; k++) {
    if (y[k] === undefined) continue;
    const win = y.slice(Math.max(0, k - 4), k + 5).filter((v) => v !== undefined).sort((p, q) => p - q);
    const med = win[win.length >> 1];
    if (y[k] < 1.5 || (y[k] < med - 4 && y[k] < med * 0.85)) out.push(from + k);
  }
  return out.filter((f) => f < to);
}

if (from === 0 && to === frames) {
  fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  const out = path.join(dir, 'out', `${ep.slug}.mp4`);
  const mix = path.join(dir, 'build/mix.wav');
  const audio = fs.existsSync(mix) ? ['-i', mix, '-af', MASTER, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k'] : [];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(framesDir, 'f_%05d.png'), ...audio,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', out], { stdio: 'inherit' });
  const cover = ep.coverTime ?? 1.0;
  fs.copyFileSync(path.join(framesDir, `f_${String(Math.round(cover * 30)).padStart(5, '0')}.png`), path.join(dir, 'out', 'cover.png'));
  if (!a.keep) fs.rmSync(framesDir, { recursive: true, force: true });   // ~3 GB of PNGs per 60 s film; --keep to retain
  console.log(`done -> ${out}`);
}

async function renderPiped() {
  const { server, port } = await serve();
  const pages = await openPages(url, workers, port);
  const { frames } = await info(pages[0]);
  fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  const silent = path.join(dir, 'build', 'video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  const cover = Math.round((ep.coverTime ?? 1.0) * 30);
  const buf = new Map();
  let next = 0;
  const t0 = performance.now();
  const flush = async () => {
    while (buf.has(next)) {
      const png = buf.get(next);
      buf.delete(next);
      if (next === cover) fs.writeFileSync(path.join(dir, 'out', 'cover.png'), png);
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      next++;
      if (next % 300 === 0) {
        const el = (performance.now() - t0) / 1000;
        console.log(`frame ${next}/${frames}  ${(el / next * 1000).toFixed(0)} ms/frame (wall)  eta ${((frames - next) * el / next).toFixed(0)}s  buffered ${buf.size}`);
      }
    }
  };
  let flushing = Promise.resolve();
  await Promise.all(pages.map(async (p, w) => {
    for (let f = w; f < frames; f += workers) {
      while (f - next > workers * 12) await new Promise((r) => setTimeout(r, 20));   // keep the reorder buffer small
      buf.set(f, await guardedPng(p, f));
      flushing = flushing.then(flush);
    }
  }));
  await flushing;
  ff.stdin.end();
  await done;
  await closeAll(pages, server);
  const out = path.join(dir, 'out', `${ep.slug}.mp4`);
  const mix = path.join(dir, 'build/mix.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, ...(fs.existsSync(mix) ? ['-i', mix, '-af', MASTER, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k'] : []),
    '-c:v', 'copy', '-movflags', '+faststart', '-shortest', out], { stdio: 'inherit' });
  fs.rmSync(silent, { force: true });
  console.log(`rendered ${frames} frames in ${((performance.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
}

/** A canvas that lost its backing store under memory pressure hands back a blank (all-black, tiny) PNG instead of
 *  throwing. Every real frame carries film grain, so it is never that small: re-draw, reloading the page if needed. */
async function guardedPng(p, f) {
  for (let attempt = 0; ; attempt++) {
    const png = await renderPng(p, f, sub);
    if (png.length > 40000 || attempt === 3) {
      if (png.length <= 40000) console.warn(`frame ${f}: still blank after ${attempt} retries`);
      return png;
    }
    console.warn(`frame ${f}: blank frame (${png.length} bytes), retry ${attempt + 1}`);
    if (attempt >= 1) { await p.page.reload({ waitUntil: 'load' }); await p.page.evaluate(() => window.__ready); }
  }
}

// puppeteer can leave handles open after browser.close(); exit explicitly once work is done
process.exit(0);
