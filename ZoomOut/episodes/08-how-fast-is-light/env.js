// Environment for "How Fast Is Light, Really?". Owned by the orchestrator — builders: read, don't edit.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, stars, topBar } from '../../../engine/runtime/kit.js';
import { C } from './camera.js';

const { W, H } = L;
export const ACCENT = [255, 225, 140];
export { C };

/** Light-travel time for a distance in metres, as a short human string. */
export function lightTime(m) {
  const s = m / C, YR = 31557600;
  if (s < 90) return `${L.fmt(s, s < 10 ? 1 : 0)} light-seconds`;
  if (s < 5400) return `${L.fmt(s / 60, 1)} light-minutes`;
  if (s < 2 * 86400) return `${L.fmt(s / 3600, 1)} light-hours`;
  if (s < 2 * YR) return `${L.fmt(s / 86400, 1)} light-days`;
  if (s < 1e6 * YR) return `${L.fmt(s / YR)} light-years`;
  if (s < 1e9 * YR) return `${L.fmt(s / YR / 1e6)} million light-years`;
  return `${L.fmt(s / YR / 1e9, 1)} billion light-years`;
}

export function drawBackground(c, v) {
  const g = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#0b0b12'); g.addColorStop(1, '#020205');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // two star layers that drift with the log of the zoom (parallax: deeper layers move less)
  const lz = Math.log10(v.cam.mpp);
  c.save();
  c.translate(0, ((lz * 90) % H + H) % H - H);
  stars(c, v, 0.55, 140, 31);
  c.translate(0, H);
  stars(c, v, 0.55, 140, 31);
  c.restore();
  stars(c, v, 0.35, 90, 47);
}
export function drawForeground() {}

export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  scaleBar(c, v, { k: L.ease.outCubic(L.prog(v.gt, 1.0, 0.6)), fmt: lightTime, note: 'SCALE IN LIGHT-TRAVEL TIME' });
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 0.8 });
