// node darkscan.mjs <mp4>  -> prints frames much darker than their neighbours (dead-canvas frames)
import { spawnSync } from 'node:child_process';
const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', process.argv[2], '-vf', 'format=gray,scale=270:480,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr;
const y = []; let n = -1;
for (const ln of log.split('\n')) { if (/frame:\d+/.test(ln) && /pts:/.test(ln)) n++; const v = ln.match(/YAVG=([\d.]+)/); if (v) y[n] = +v[1]; }
const out = [];
for (let k = 0; k < y.length; k++) {
  const win = y.slice(Math.max(0, k - 4), k + 5).filter((v) => v !== undefined).sort((p, q) => p - q), med = win[win.length >> 1];
  if (y[k] < 1.5 || (y[k] < med - 4 && y[k] < med * 0.85)) out.push((k / 30).toFixed(2));
}
console.log(out.length, out.slice(0, 30).join(' '));
