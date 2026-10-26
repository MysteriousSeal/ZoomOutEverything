// Environment for "Could Every Human Fit in One Place?". Owned by the orchestrator — builders: read, don't edit.
import * as L from '../../../engine/runtime/lib.js';
import { R_EARTH } from './camera.js';

const { W, H } = L;
export const ACCENT = [255, 130, 110];
export { R_EARTH };

/** Which view is active: 'top' (beats 0–3), 'side' (4–6), 'globe' (7–8), 'abstract' (9–12). */
export const viewOf = (beat) => (beat <= 3 ? 'top' : beat <= 6 ? 'side' : beat <= 8 ? 'globe' : 'abstract');

/** Dark veil level over the world for the abstract finale (0..1). Scenes 9–12 draw on top in drawOverlay. */
export function veilK(v) {
  const s9 = v.tl.scenes[9];
  return L.ease.inOutCubic(L.prog(v.gt, s9.start - 0.55, 0.7));   // fully veiled by s9 + 0.15, when the finale's block appears
}

// ------------------------------------------------------------------ background
export function drawBackground(c, v) {
  const g = c.createRadialGradient(W / 2, H * 0.45, 60, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#1a1214');
  g.addColorStop(0.6, '#0e0a0c');
  g.addColorStop(1, '#050405');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const mpp = v.cam.mpp;
  // map scale (beats 2–3): a cool sea tone under the island outlines
  // tied to the zoom on a log scale (1 → 200 m/px), so the warm floor dissolves into the sea over ~1.7 s, not a flash
  const seaZ = L.smoothstep(L.clamp((Math.log(mpp) - Math.log(1)) / (Math.log(200) - Math.log(1))));
  const sea = seaZ * (v.beat <= 3 ? 1 : L.clamp(1 - L.prog(v.gt, v.tl.scenes[4].start, 0.8)));
  if (sea > 0) {
    c.fillStyle = `rgba(16,30,44,${0.85 * sea})`;
    c.fillRect(0, 0, W, H);
  }
  // top-down floor grid (beats 0–1): adaptive 1 m → 1 km, cross-faded
  if (v.beat <= 2) grid(c, v, v.beat <= 1 ? 1 : L.clamp(1 - L.prog(v.t, 0, 1.2)));
}

function grid(c, v, k) {
  if (k <= 0) return;
  const mpp = v.cam.mpp;
  const lg = Math.log10(mpp * 80), base = Math.floor(lg), frac = lg - base;
  c.save();
  c.lineWidth = 1;
  for (const [step, a] of [[Math.pow(10, base), 1 - frac], [Math.pow(10, base + 1), 1]]) {
    const span = mpp * 1100;
    const x0 = Math.floor((v.cam.x - span) / step) * step, y0 = Math.floor((v.cam.y - span) / step) * step;
    const n = Math.min(80, Math.ceil(2 * span / step));
    c.strokeStyle = `rgba(255,200,190,${0.06 * a * k})`;
    c.beginPath();
    const fine = step === Math.pow(10, base);
    const onCoarse = (u) => fine && Math.abs(u / (10 * step) - Math.round(u / (10 * step))) < 1e-6;   // drawn by the coarse pass
    for (let i = 0; i <= n; i++) {
      const gx = x0 + i * step, gy = y0 + i * step;
      if (!onCoarse(gx)) { c.moveTo(v.wx(gx), v.wy(y0)); c.lineTo(v.wx(gx), v.wy(y0 + n * step)); }
      if (!onCoarse(gy)) { c.moveTo(v.wx(x0), v.wy(gy)); c.lineTo(v.wx(x0 + n * step), v.wy(gy)); }
    }
    c.stroke();
  }
  c.restore();
}

export function drawForeground(c, v) {
  const k = veilK(v);
  if (k > 0) {
    c.fillStyle = `rgba(8,5,7,${0.99 * k})`;
    c.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ HUD
const NICE = [1, 2, 5];
function niceLen(m) { const p = Math.pow(10, Math.floor(Math.log10(m))); for (const n of NICE) if (n * p >= m) return n * p; return 10 * p; }
const fmtLen = (m) => (m < 1 ? `${L.fmt(m * 100)} cm` : m < 1000 ? `${L.fmt(m)} m` : `${L.fmt(m / 1000)} km`);

export function drawHud(c, v) {
  c.save();
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(240,228,225,0.75)';
  c.textBaseline = 'middle';
  L.trackedText(c, `${v.ep.channel}  ·  ${v.ep.episodeLabel}`, 64, 160, 4);
  const n30 = Math.round(v.gt * 30), s = Math.floor(n30 / 30), f = n30 % 30;   // integer frames: no float floor jitter
  c.font = L.font(20, 400, L.FONT.mono);
  c.textAlign = 'right';
  c.fillText(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f).padStart(2, '0')}`, W - 64, 160);   // mm:ss:ff (05b runs past 60 s)
  c.fillStyle = 'rgba(240,228,225,0.18)';
  c.fillRect(64, 182, W - 128, 2);
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(64, 182, (W - 128) * L.clamp(v.gt / v.tl.total), 2);
  c.restore();
  // scale bar while the world is physical (hidden for the abstract finale)
  const k = L.ease.outCubic(L.prog(v.gt, 1.2, 0.6)) * (1 - veilK(v));
  if (k > 0) {
    const len = niceLen(v.cam.mpp * 150), px = len / v.cam.mpp;
    const x1 = W - 64, x0 = x1 - px, y = 238;
    c.save();
    c.globalAlpha = k;
    c.strokeStyle = 'rgba(240,228,225,0.85)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(x0, y - 8); c.lineTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y - 8); c.stroke();
    c.font = L.font(22, 600, L.FONT.body);
    c.fillStyle = 'rgba(240,228,225,0.85)';
    c.textAlign = 'right';
    c.fillText(fmtLen(len), x1, y - 14);
    c.restore();
  }
}

export function cues(tl) {
  return tl.scenes.slice(1, 9).map((s, i) => ({ t: s.start - 0.05, name: 'whoosh', gain: 0.2, pitch: i % 2 ? 0.8 : 1 }));
}
