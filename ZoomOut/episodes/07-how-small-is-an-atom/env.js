// Environment for "How Small Is an Atom, Really?". Owned by the orchestrator — builders: read, don't edit.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, topBar } from '../../../engine/runtime/kit.js';

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

/** Zoom factor rounded to 2 significant figures, big values in words (no flickering digits). */
export function zoomNote(mpp) {
  const z = Math.max(1, 0.00026 / mpp);
  const p = Math.pow(10, Math.floor(Math.log10(z)) - 1);
  const r = Math.round(z / p) * p;
  if (r >= 1e12) return `ZOOM ×${L.fmt(r / 1e12, r < 1e13 ? 1 : 0)} TRILLION`;
  if (r >= 1e9) return `ZOOM ×${L.fmt(r / 1e9, r < 1e10 ? 1 : 0)} BILLION`;
  if (r >= 1e6) return `ZOOM ×${L.fmt(r / 1e6, r < 1e7 ? 1 : 0)} MILLION`;
  return `ZOOM ×${L.fmt(r)}`;
}

export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  // the scale bar steps aside during the stadium analogy (beats 9–11): real units would contradict it.
  // It leaves as the atom starts to morph and returns as the stadium folds back into the atom.
  const s = v.tl.scenes;
  const away = L.ease.inOutCubic(L.prog(v.gt, s[9].start + 0.1, 0.5)) * (1 - L.ease.inOutCubic(L.prog(v.gt, s[12].start - 0.45, 0.55)));
  const k = L.ease.outCubic(L.prog(v.gt, 1.0, 0.6)) * (1 - away);
  scaleBar(c, v, { k, note: zoomNote(v.cam.mpp) });
  captionBacking(c, v);
}

/** Beats 2–3: the caption band crosses the cell column / hair rim, so it gets a soft dark backing (drawn in the
 *  HUD pass, under the captions). Eased in and out so it never reads as a stripe. */
function captionBacking(c, v) {
  const s = v.tl.scenes;
  const k = L.ease.inOutCubic(L.prog(v.gt, s[2].start - 0.1, 0.5)) * (1 - L.ease.inOutCubic(L.prog(v.gt, s[3].end - 0.3, 0.6)));
  if (k <= 0.003) return;
  const y0 = 1225, y1 = 1450;
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [p, f] of [[0, 0], [0.18, 0.45], [0.32, 0.9], [0.5, 1], [0.68, 0.9], [0.82, 0.45], [1, 0]]) g.addColorStop(p, `rgba(2,6,9,${(0.62 * k * f).toFixed(3)})`);
  c.fillStyle = g;
  c.fillRect(0, y0, W, y1 - y0);
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 1.2 });
