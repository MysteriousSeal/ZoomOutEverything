// Environment for "How Small Is an Atom, Really?". Owned by the orchestrator — builders: read, don't edit.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, topBar } from '../../../engine/runtime/kit.js';
import { readoutMpp } from './camera.js';

const { W, H } = L;
export const ACCENT = [110, 240, 200];

/** "Microscope" depth: 0 at human scale … 1 at atomic scale (log of mpp), for tinting. */
export const depthK = (v) => L.clamp(L.invLerp(Math.log(1e-3), Math.log(1e-12), Math.log(v.cam.mpp)));

export function drawBackground(c, v) {
  const k = depthK(v);
  const g = c.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, L.rgba(L.mix([24, 30, 34], [8, 22, 26], k)));
  g.addColorStop(1, L.rgba(L.mix([6, 8, 10], [2, 6, 8], k)));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // microscope-style soft bokeh particles drifting (scale-independent)
  const r = L.rng(3);
  c.save();
  for (let i = 0; i < 40; i++) {
    const x = r() * W, y0 = r() * H, s = 6 + r() * 30;
    const y = ((y0 - v.gt * (4 + r() * 8)) % H + H) % H;
    c.fillStyle = `rgba(160,240,220,${0.015 + r() * 0.03})`;
    c.beginPath(); c.arc(x + L.noise1(v.gt * 0.2 + i, 6) * 20, y, s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** Circular "lens" vignette that tightens while zoomed in (feels like a microscope). */
export function drawForeground(c, v) {
  const k = depthK(v) * (1 - L.clamp(L.invLerp(Math.log(1e-4), Math.log(1e-2), Math.log(v.cam.mpp))));
  if (k <= 0) return;
  const g = c.createRadialGradient(W / 2, H * 0.47, W * 0.42, W / 2, H * 0.47, W * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.55 * k})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

/** Zoom factor rounded to 2 significant figures (1 below ×1), big values in words (no flickering digits). */
export function zoomNote(mpp) {
  const z = 0.00026 / mpp;
  if (z < 0.95) return `ZOOM ×${Number(z.toPrecision(1))}`;   // the final pull-out goes past life size: ×0.5, ×0.1 …
  const p = Math.pow(10, Math.floor(Math.log10(z)) - 1);
  const r = Math.max(1, Math.round(z / p) * p);
  if (r >= 1e12) return `ZOOM ×${L.fmt(r / 1e12, r < 1e13 ? 1 : 0)} TRILLION`;
  if (r >= 1e9) return `ZOOM ×${L.fmt(r / 1e9, r < 1e10 ? 1 : 0)} BILLION`;
  if (r >= 1e6) return `ZOOM ×${L.fmt(r / 1e6, r < 1e7 ? 1 : 0)} MILLION`;
  return `ZOOM ×${L.fmt(r)}`;
}

export function drawHud(c, v) {
  const s = v.tl.scenes;
  topScrim(c, v);
  c.save();
  c.globalAlpha = L.ease.outCubic(L.prog(v.gt, s[0].start, 0.3));   // the HUD eases on after the cold open
  topBar(c, v, ACCENT);
  c.restore();
  // the real scale bar steps aside for the stadium analogy (beats 9–11): real units would contradict it. It leaves
  // with the chapter change into the stadium and returns as the stadium folds back into the atom.
  const away = L.ease.inOutCubic(L.prog(v.gt, s[9].start - 0.25, 0.4)) * (1 - L.ease.inOutCubic(L.prog(v.gt, s[12].start - 0.45, 0.55)));
  // the question beat re-frames the figure smaller than the camera's scale, so the bar bows out there too
  const qOut = s[13] ? L.ease.inOutCubic(L.prog(v.gt, s[13].start, 0.4)) : 0;
  const k = L.ease.outCubic(L.prog(v.gt, s[0].start + 1.0, 0.6)) * (1 - away) * (1 - qOut);
  scaleBar(c, v, { k, note: zoomNote(readoutMpp(v.gt, v.tl)) });
  // …and in its slot, the analogy's own scale: the atom (≈ 0.1 nm) blown up to a ≈ 200 m stadium
  const ka = L.ease.inOutCubic(L.prog(v.gt, s[9].start + 1.6, 0.6)) * (1 - L.ease.inOutCubic(L.prog(v.gt, s[12].start - 0.6, 0.4)));
  if (ka > 0.003) analogyReadout(c, ka);
  captionBacking(c, v);
}

/** Scale-bar slot during the stadium beats: text only (no bar: the drawing is not to a real scale). */
function analogyReadout(c, k) {
  const x1 = L.W - 64, y = 238;
  c.save();
  c.globalAlpha = k;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.font = L.font(22, 600, L.FONT.body);
  c.fillStyle = L.rgba([235, 230, 222], 0.85);
  c.fillText('STADIUM ≈ 200 m', x1, y - 14);
  c.fillStyle = L.rgba([235, 230, 222], 0.55);
  c.font = L.font(18, 600, L.FONT.body);
  L.trackedText(c, 'ATOM ×2 TRILLION', x1, y + 26, 2, 'right');
  c.restore();
}

/** Beats 5–6: the DNA / atom field fills the HUD band, so the top bar, chapter card and readout get a soft dark
 *  scrim (plus a pool behind the scale bar, where the helix leaves the frame). Drawn first in the HUD pass. */
function topScrim(c, v) {
  const s = v.tl.scenes;
  const k = L.ease.inOutCubic(L.prog(v.gt, s[5].start + 0.2, 0.8)) * (1 - L.ease.inOutCubic(L.prog(v.gt, s[7].start + 0.3, 0.8)));
  if (k <= 0.003) return;
  c.save();
  const g = c.createLinearGradient(0, 0, 0, 320);
  for (const [p, f] of [[0, 1], [0.45, 0.95], [0.7, 0.7], [0.85, 0.35], [1, 0]]) g.addColorStop(p, `rgba(2,6,9,${(0.6 * k * f).toFixed(3)})`);
  c.fillStyle = g;
  c.fillRect(0, 0, L.W, 320);
  // a soft elliptical pool behind the scale bar + zoom note
  c.translate(870, 232);
  c.scale(1, 0.36);
  const r = c.createRadialGradient(0, 0, 0, 0, 0, 260);
  r.addColorStop(0, `rgba(2,6,9,${(0.6 * k).toFixed(3)})`);
  r.addColorStop(0.55, `rgba(2,6,9,${(0.45 * k).toFixed(3)})`);
  r.addColorStop(1, 'rgba(2,6,9,0)');
  c.fillStyle = r;
  c.fillRect(-260, -260, 520, 520);
  c.restore();
}

/** Beats 2–3: the caption crosses the cell column / hair rim, so it gets a soft elliptical pool (drawn in the HUD
 *  pass, under the captions) — about 760 px wide, no hard band across the frame. */
function captionBacking(c, v) {
  const s = v.tl.scenes;
  const k = L.ease.inOutCubic(L.prog(v.gt, s[2].start - 0.1, 0.5)) * (1 - L.ease.inOutCubic(L.prog(v.gt, s[3].end - 0.3, 0.6)));
  if (k <= 0.003) return;
  const cy = (v.ep.captionY ?? 1450) - 25;
  c.save();
  c.translate(W / 2, cy);
  c.scale(1, 0.3);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 380);
  for (const [p, f] of [[0, 1], [0.4, 0.92], [0.65, 0.6], [0.85, 0.22], [1, 0]]) g.addColorStop(p, `rgba(2,6,9,${(0.6 * k * f).toFixed(3)})`);
  c.fillStyle = g;
  c.fillRect(-380, -380, 760, 760);
  c.restore();
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 1.2 });
