// Beat 11 — "Every year, | it drifts about three point eight centimeters farther away."
// On "Every year" a faint laser pulse runs Earth to Moon and back (how the drift is measured). On "drifts", ghost
// rings ease out of the orbit, one after another, to where the orbit would be after 250 million to 1 billion years
// at today's rate (true scale: +38,000 km per billion years); faint ghost Moons sit on them along the Earth-Moon
// line, marking where the Moon is headed. "3.8 cm / year" lands on "three point eight" in the
// label slot beside the Earth-Moon line. The rings stay (dimmer) through the final beat.
import * as L from '../../../../engine/runtime/lib.js';
import { D_MOON, RECEDE, MOON_DIR } from '../env.js';
import { sys, labelSlot, beatStart, LABEL_DX } from './s10-leaving.js';

const TAU = Math.PI * 2;
/** Beat-local timing (s). "Every year," 0.15-0.9 · "it drifts about…" 1.5-4.47 · "three" ~2.3. */
export const T11 = { laser: 0.12, rings: 1.45, ringStep: 0.28, ringDur: 1.3, tag: 1.6, big: 2.3 };
const YEARS = [0.25e9, 0.5e9, 0.75e9, 1e9];
const SUB = ["RINGS: THE NEXT BILLION YEARS", "AT TODAY'S RATE"];

let ringLayer = null;
function layer() {
  if (!ringLayer && typeof OffscreenCanvas !== 'undefined') ringLayer = new OffscreenCanvas(L.W, L.H);
  return ringLayer;
}

/** Ghost rings, beat-11-local time t (also called from the final beat). Draws in world space (screen px). The ring
 * lines go through an offscreen layer faded out of the HUD band (nothing above y 300); the wave fronts, ghost Moons
 * and the "+1 billion years" arrow near the Moon are drawn on top, where the widening is read. */
function drawRings(c, v, t, dim) {
  const s = sys(v);
  if (s.R > 6000 || s.R < 40) return;
  if (t < T11.rings) return;
  const am = Math.atan2(MOON_DIR.y, MOON_DIR.x);
  const oc = layer();
  const o = oc ? oc.getContext('2d') : c;
  if (oc) { o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.clearRect(0, 0, L.W, L.H); }
  o.save();
  o.lineCap = 'round';
  const ghosts = [];
  YEARS.forEach((yr, i) => {
    const k = L.prog(t, T11.rings + i * T11.ringStep, T11.ringDur);
    if (k <= 0) return;
    const e = L.ease.inOutCubic(k);
    const Rt = v.ws(D_MOON + RECEDE * yr);
    const R = L.lerp(s.R, Rt, e);
    const fade = (1 - i * 0.15) * dim;
    // ring: a soft glow under a fine dashed line
    o.setLineDash([]);
    o.strokeStyle = L.rgba(v.accent, 0.1 * fade);
    o.lineWidth = 7;
    o.beginPath(); o.arc(s.ex, s.ey, Math.max(0, R), 0, TAU); o.stroke();
    o.setLineDash([3, 9]);
    o.lineDashOffset = -v.gt * 6;
    o.strokeStyle = L.rgba(v.accent, (0.8 + 0.2 * (1 - k)) * fade);
    o.lineWidth = 1.8;
    o.beginPath(); o.arc(s.ex, s.ey, Math.max(0, R), 0, TAU); o.stroke();
    // the wave front around the Moon's side: bright while it widens, then it stays (dimmer) so the spread reads there
    o.setLineDash([]);
    o.strokeStyle = L.rgba([215, 225, 255], (0.25 + 0.5 * Math.sin(Math.PI * k)) * fade);
    o.lineWidth = 2.2;
    o.beginPath(); o.arc(s.ex, s.ey, Math.max(0, R), am - 0.6, am + 0.6); o.stroke();
    ghosts.push({ R, k, fade, i });
  });
  o.restore();
  if (oc) {
    // mask: transparent in the HUD band, fully in below ~y 360
    o.save();
    o.globalCompositeOperation = 'destination-in';
    const mg = o.createLinearGradient(0, 290, 0, 370);
    mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, 'rgba(0,0,0,1)');
    o.fillStyle = mg;
    o.fillRect(0, 0, L.W, L.H);
    o.restore();
    c.drawImage(oc, 0, 0);
  }
  // ghost Moons on the rings, on the Earth-Moon line: where the Moon is headed
  c.save();
  for (const { R, k, fade } of ghosts) {
    const gx = s.ex + R * MOON_DIR.x, gy = s.ey + R * MOON_DIR.y;
    const gk = fade * L.clamp(k * 3);
    L.lightBlob(c, gx, gy, 16, [200, 214, 245], 0.3 * gk);
    c.fillStyle = L.rgba([215, 220, 232], 0.6 * gk);
    c.beginPath(); c.arc(gx, gy, Math.max(0, 4.5), 0, TAU); c.fill();
    c.strokeStyle = L.rgba(v.accent, 0.55 * gk);
    c.lineWidth = 1.2;
    c.beginPath(); c.arc(gx, gy, Math.max(0, 8), 0, TAU); c.stroke();
  }
  // an outward arrow from the Moon to the 1-billion-year ghost
  const last = ghosts.find((g) => g.i === YEARS.length - 1);
  if (last) {
    const ak = L.ease.outCubic(L.clamp(last.k * 1.4)) * last.fade;
    const r0 = s.R + 12, r1 = last.R - 12;
    if (r1 > r0) {
      const x0 = s.ex + r0 * MOON_DIR.x, y0 = s.ey + r0 * MOON_DIR.y;
      const x1 = s.ex + r1 * MOON_DIR.x, y1 = s.ey + r1 * MOON_DIR.y;
      // offset to the side so it does not sit on the ghost dots
      const nx = -MOON_DIR.y * 20, ny = MOON_DIR.x * 20;
      c.strokeStyle = L.rgba(v.accent, 0.85 * ak);
      c.lineWidth = 1.8;
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(x0 + nx, y0 + ny); c.lineTo(x1 + nx, y1 + ny); c.stroke();
      const hx = x1 + nx, hy = y1 + ny, h = 8;
      c.beginPath();
      c.moveTo(hx - MOON_DIR.x * h - MOON_DIR.y * h * 0.8, hy - MOON_DIR.y * h + MOON_DIR.x * h * 0.8);
      c.lineTo(hx, hy);
      c.lineTo(hx - MOON_DIR.x * h + MOON_DIR.y * h * 0.8, hy - MOON_DIR.y * h - MOON_DIR.x * h * 0.8);
      c.stroke();
    }
  }
  c.restore();
}

/** Laser ranging: a short bright dash runs Earth to Moon, a flash at the reflector, and back. */
function drawLaser(c, v, t) {
  const DUR = 1.2;
  const p = L.prog(t, T11.laser, DUR);
  if (p <= 0 || p >= 1) return;
  const s = sys(v);
  const ax = s.ex + s.u.x * (s.er + 6), ay = s.ey + s.u.y * (s.er + 6);
  const bx = s.mx - s.u.x * 5, by = s.my - s.u.y * 5;
  const out = p < 0.5;
  const q = L.ease.inOutCubic(out ? p * 2 : (p - 0.5) * 2);
  const h = out ? q : 1 - q;
  const hx = L.lerp(ax, bx, h), hy = L.lerp(ay, by, h);
  const tl = 0.12;
  const h2 = out ? Math.max(0, h - tl) : Math.min(1, h + tl);
  const tx = L.lerp(ax, bx, h2), ty = L.lerp(ay, by, h2);
  const col = [150, 255, 190];   // a laser green, the one exception to the palette (it is a real laser)
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(tx, ty, hx, hy);
  g.addColorStop(0, L.rgba(col, 0)); g.addColorStop(1, L.rgba(col, 0.9));
  c.strokeStyle = g;
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
  c.restore();
  L.lightBlob(c, hx, hy, 14, col, 0.7);
  // reflector flash at the Moon
  const f = 1 - Math.min(1, Math.abs(p - 0.5) * 7);
  if (f > 0) L.lightBlob(c, bx, by, 34, col, 0.6 * f);
}

/** Layout of "3.8 cm / year" (screen px): baseline origin, widths. Shared with s10 (the line breaks under it). */
function bigLayout(c, v, e = 1) {
  const p = labelSlot(v);
  c.save();
  c.font = L.font(150, 800, L.FONT.display);
  const bw = c.measureText('3.8').width;
  c.font = L.font(64, 700, L.FONT.display);
  const uw = c.measureText('cm / year').width;
  c.font = L.font(24, 600, L.FONT.body);
  c.letterSpacing = '2px';
  const sw = Math.max(...SUB.map((q) => c.measureText(q).width));
  c.restore();
  const cx = p.x + LABEL_DX;
  return { p, cx, bw, uw, sw, x0: cx - (bw + 16 + uw) / 2, y: p.y + 10 + (1 - e) * 30 };
}

/** Box of the big number with its visibility k, or null. */
export function bigBox(c, v) {
  const t = v.gt - beatStart(v, 11);
  const k = L.clamp(L.enter(t, T11.big, 0.55) * (1 - L.prog(v.gt, v.tl.scenes[11].end, 0.5)));
  if (k <= 0) return null;
  const b = bigLayout(c, v);
  return { x0: b.x0 - 16, x1: b.x0 + Math.max(b.bw + 16 + b.uw, b.sw) + 16, y0: b.y - 180, y1: b.y + 98, k };
}

export default {
  beat: 11,
  chapter: { num: '11', title: '3.8 cm a year', sub: 'measured by laser ranging' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: T11.laser, name: 'blip', gain: 0.24, pitch: 1.4 },
      { t: T11.laser + 0.6, name: 'ping', gain: 0.24, pitch: 1.6 },
      { t: T11.laser + 1.2, name: 'blip', gain: 0.16, pitch: 1.2 },
      { t: T11.rings, name: 'sonar', gain: 0.24, pitch: 0.8 },
      { t: T11.rings + 0.1, name: 'riser', gain: 0.16, pitch: 0.8 },
      { t: T11.big - 0.03, name: 'impact', gain: 0.42, pitch: 0.75 },
      { t: T11.big + 0.05, name: 'bloom', gain: 0.24, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    const gs = beatStart(v, 11);
    if (v.gt < gs - 0.05) return;
    const t = v.gt - gs;
    // dimmer during the fingernail comparison
    const dim = 1 - 0.45 * L.ease.inOutCubic(L.prog(v.gt - beatStart(v, 12), 0.1, 1.0));
    drawRings(ctx, v, t, dim);
    drawLaser(ctx, v, t);
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    // the big number, in the label slot beside the Earth-Moon line
    const k = v.k * L.enter(t, T11.big, 0.55);
    if (k <= 0) return;
    const e = L.ease.outCubic(L.clamp(k));
    const B = bigLayout(ctx, v, e);
    const p = B.p;
    ctx.save();
    ctx.globalAlpha = L.clamp(k);
    ctx.translate(B.cx, p.y - 40);
    ctx.scale(1, 0.5);
    L.lightBlob(ctx, 0, 0, 360, [2, 4, 10], 0.75);
    ctx.restore();
    // "3.8 cm / year": the number in the accent, the unit set smaller beside it
    ctx.save();
    ctx.globalAlpha = L.clamp(k * 1.4);
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18;
    const big = '3.8', unit = 'cm / year';
    const { bw, x0, y } = B;
    ctx.fillStyle = L.rgba(v.accent, 0.9);
    ctx.fillRect(x0, y - 168, 90 * e, 4);
    ctx.font = L.font(150, 800, L.FONT.display);
    ctx.fillStyle = L.rgba(v.accent);
    ctx.fillText(big, x0, y);
    ctx.font = L.font(64, 700, L.FONT.display);
    ctx.fillStyle = 'rgba(235,240,250,0.95)';
    ctx.fillText(unit, x0 + bw + 16, y);
    ctx.shadowBlur = 8;
    ctx.font = L.font(24, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(205,215,230,0.95)';
    // one unit line that also explains the ghost rings (merged: the beat keeps two text elements)
    SUB.forEach((q, i) => L.trackedText(ctx, q, x0, y + 50 + i * 32 + (1 - e) * 18, 2, 'left'));
    ctx.restore();
  },
};
