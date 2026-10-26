// Environment for "A Million vs a Billion vs a Trillion Seconds". Owned by the orchestrator — builders: read, don't edit.
// A vertical timeline: NOW at the top, the past below. Spine at screen x = SPINE_X, ticks in human units.
import * as L from '../../../engine/runtime/lib.js';
import { NOW_Y, YEAR, at } from './camera.js';

const { W, H } = L;
export const ACCENT = [245, 200, 90];
export const SPINE_X = 230;
export { NOW_Y, YEAR };
const DAY = 86400;

/** Human-readable duration for a number of seconds. */
export function human(s) {
  if (s < 90) return `${L.fmt(s)} s`;
  if (s < 5400) return `${L.fmt(s / 60)} min`;
  if (s < 2 * DAY) return `${L.fmt(s / 3600)} h`;
  if (s < 90 * DAY) return `${L.fmt(s / DAY)} days`;
  if (s < 2 * YEAR) return `${L.fmt(s / (YEAR / 12))} months`;
  if (s < 1e6 * YEAR) return `${L.fmt(s / YEAR)} years`;
  return `${L.fmt(s / YEAR / 1e6, 1)} million years`;
}

const UNITS = [[1, 's'], [60, 'min'], [3600, 'h'], [DAY, 'days'], [YEAR, 'years'], [1e6 * YEAR, 'million years']];
/** Label for a tick at s seconds when ticks are `step` apart: unit picked from the step, never ambiguous. */
export function tickLabel(s, step) {
  let [u, name] = UNITS[0];
  for (const [uu, nn] of UNITS) if (step >= uu * 0.99) [u, name] = [uu, nn];
  if (name === 'years' && s >= 1e6 * YEAR) [u, name] = [1e6 * YEAR, 'million years'];
  const val = s / u, digits = Math.abs(val - Math.round(val)) < 0.05 ? 0 : 1;
  return `${L.fmt(val, digits)} ${name}`;
}
const fmtMpp = (mpp) => (mpp < 1 ? `${mpp.toFixed(2)} S` : human(mpp).toUpperCase());

// tick steps in seconds (human-friendly)
const STEPS = [1, 5, 10, 30, 60, 300, 600, 1800, 3600, 6 * 3600, 12 * 3600, DAY, 2 * DAY, 7 * DAY, 30.4375 * DAY,
  91.3 * DAY, YEAR, 2 * YEAR, 5 * YEAR, 10 * YEAR, 20 * YEAR, 50 * YEAR, 100 * YEAR, 200 * YEAR, 500 * YEAR, 1000 * YEAR,
  2000 * YEAR, 5000 * YEAR, 1e4 * YEAR, 2e4 * YEAR, 5e4 * YEAR, 1e5 * YEAR, 2e5 * YEAR, 5e5 * YEAR, 1e6 * YEAR, 2e6 * YEAR];
const stepFor = (mpp, px) => STEPS.find((s) => s / mpp >= px) ?? STEPS[STEPS.length - 1];

// ------------------------------------------------------------------ background
export function drawBackground(c, v) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#120f0a');
  g.addColorStop(0.35, '#0b0b10');
  g.addColorStop(1, '#05060a');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // warm glow at NOW
  L.lightBlob(c, SPINE_X, NOW_Y, 520, [120, 90, 40], 0.35);
  // drifting "time dust": rises toward NOW, faster while zooming
  const r = L.rng(9);
  c.save();
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y0 = r() * H, sp = 10 + r() * 30, sz = 0.8 + r() * 2.2;
    const y = ((y0 - v.gt * sp) % H + H) % H;
    c.fillStyle = `rgba(240,215,160,${0.04 + r() * 0.1})`;
    c.beginPath(); c.arc(x + L.noise1(v.gt * 0.2 + i, 4) * 10, y, sz, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ the timeline spine (part of the world)
export function drawForeground(c, v) {
  const nowY = v.wy(0);
  c.save();
  // spine
  const sg = c.createLinearGradient(0, nowY, 0, H);
  sg.addColorStop(0, 'rgba(245,225,180,0.9)');
  sg.addColorStop(1, 'rgba(245,225,180,0.15)');
  c.strokeStyle = sg;
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(SPINE_X, nowY); c.lineTo(SPINE_X, H + 10); c.stroke();
  // ticks: two levels cross-faded by zoom so labels never pop
  const major = stepFor(v.cam.mpp, 150);
  const idx = STEPS.indexOf(major);
  const minor = STEPS[Math.max(0, idx - 1)];
  const fadeMinor = L.clamp((minor / v.cam.mpp - 40) / 60);
  const maxS = (H - nowY + 40) * v.cam.mpp;
  // labels fade while the camera zooms fast (they would smear into ghost stacks under motion blur)
  const vel = Math.abs(Math.log(v.cam.mpp) - Math.log(at(Math.max(0, v.gt - 1 / 30), v.tl).mpp)) * 30;
  const labelK = L.clamp(1 - vel / 1.6, 0.12, 1);
  const majorYs = [];
  for (let i = 1; i <= Math.min(60, Math.floor(maxS / major)); i++) majorYs.push(v.wy(i * major));
  c.font = L.font(22, 600, L.FONT.body);
  c.textAlign = 'right';
  c.textBaseline = 'middle';
  for (const [step, isMajor] of [[minor, false], [major, true]]) {
    if (!isMajor && (minor === major || fadeMinor <= 0)) continue;
    const n = Math.min(60, Math.floor(maxS / step));
    for (let i = 1; i <= n; i++) {
      const s = i * step;
      if (!isMajor && Math.abs(s / major - Math.round(s / major)) < 1e-6) continue;
      const y = v.wy(s);
      const a = isMajor ? 1 : fadeMinor * 0.6;
      c.fillStyle = `rgba(245,225,180,${0.75 * a})`;
      c.fillRect(SPINE_X - (isMajor ? 18 : 10), y - 1, isMajor ? 18 : 10, 2);
      const crowded = !isMajor && majorYs.some((my) => Math.abs(my - y) < 34);
      if ((isMajor || fadeMinor > 0.8) && !crowded) {
        const inCaption = y > 1270 && y < 1400 ? 0.25 : 1;   // keep the caption band clean
        const deep = y > 1400 ? 0.15 + 0.85 * (1 - L.smoothstep(L.clamp((y - 1400) / 160))) : 1;   // lower band: quiet
        c.globalAlpha = (isMajor ? 1 : (fadeMinor - 0.8) * 5 * 0.7) * labelK * inCaption * deep;
        c.fillStyle = 'rgba(235,225,205,0.8)';
        c.fillText(tickLabel(s, isMajor ? major : minor), SPINE_X - 28, y);
        c.globalAlpha = 1;
      }
    }
  }
  // NOW marker
  c.fillStyle = L.rgba(ACCENT);
  c.beginPath(); c.arc(SPINE_X, nowY, 9, 0, Math.PI * 2); c.fill();
  L.lightBlob(c, SPINE_X, nowY, 60, ACCENT, 0.6);
  c.font = L.font(26, 700, L.FONT.display);
  c.textAlign = 'right';
  c.fillStyle = L.rgba(ACCENT);
  L.trackedText(c, 'NOW', SPINE_X - 28, nowY + 1, 4, 'right');
  c.restore();
}

// ------------------------------------------------------------------ HUD
export function drawHud(c, v) {
  c.save();
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(235,228,215,0.75)';
  c.textBaseline = 'middle';
  L.trackedText(c, `${v.ep.channel}  ·  ${v.ep.episodeLabel}`, 64, 160, 4);
  const s = Math.floor(v.gt), f = Math.floor((v.gt - s) * 30);
  c.font = L.font(20, 400, L.FONT.mono);
  c.textAlign = 'right';
  c.fillText(`00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`, W - 64, 160);
  c.fillStyle = 'rgba(235,228,215,0.18)';
  c.fillRect(64, 182, W - 128, 2);
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(64, 182, (W - 128) * L.clamp(v.gt / v.tl.total), 2);
  // zoom readout: how much time one screen holds
  const k = L.ease.outCubic(L.prog(v.gt, 1.2, 0.6));
  c.globalAlpha = k;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.font = L.font(22, 600, L.FONT.body);
  c.fillStyle = 'rgba(235,228,215,0.7)';
  L.trackedText(c, `1 PX = ${fmtMpp(v.cam.mpp)}`, W - 64, 236, 2, 'right');
  c.restore();
}

export function cues(tl) {
  return tl.scenes.slice(1).map((s, i) => ({ t: s.start - 0.05, name: 'whoosh', gain: i % 2 ? 0.18 : 0.26, pitch: 0.7 }));
}
