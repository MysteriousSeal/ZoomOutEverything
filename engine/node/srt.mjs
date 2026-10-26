// Subtitles for upload: build/timeline.json -> out/<slug>.en.srt (YouTube captions; long-form videos don't burn them in).
//   node engine/node/srt.mjs <episodeDir>
// Each phrase is split into cues of at most two lines x 42 characters, timed by character count.
import fs from 'node:fs';
import path from 'node:path';
import { args, episodePaths } from './common.mjs';

const { dir } = episodePaths(args()._[0]);
const ep = JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8'));
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'build/timeline.json'), 'utf8'));
const MAX = 42;

const ts = (t) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

/** Greedy word wrap into lines of <= MAX chars, then pair lines into cues. */
function chunks(text) {
  const lines = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if (cur && (cur + ' ' + w).length > MAX) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  const out = [];
  for (let i = 0; i < lines.length; i += 2) out.push(lines.slice(i, i + 2));
  return out;
}

const cues = [];
for (const ln of tl.lines) {
  for (const ph of ln.phrases ?? [ln]) {
    const parts = chunks(ph.text);
    const total = parts.reduce((a, p) => a + p.join(' ').length, 0);
    let t = ph.start;
    for (const p of parts) {
      const d = (ph.end - ph.start) * p.join(' ').length / total;
      cues.push({ start: t, end: t + d, text: p.join('\n') });
      t += d;
    }
  }
}
// hold each cue a little past its speech (never into the next one)
cues.forEach((q, i) => { const n = cues[i + 1]; q.end = Math.min(q.end + 0.4, n ? n.start - 0.04 : q.end + 1.2); });

fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
const out = path.join(dir, 'out', `${ep.slug}.en.srt`);
fs.writeFileSync(out, cues.map((q, i) => `${i + 1}\n${ts(q.start)} --> ${ts(q.end)}\n${q.text}\n`).join('\n'));
console.log(`${cues.length} cues -> ${out}`);
