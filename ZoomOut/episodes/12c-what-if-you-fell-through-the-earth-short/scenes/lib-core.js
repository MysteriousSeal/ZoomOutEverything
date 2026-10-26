// Shared core helpers (12c). In 12b these lived in s04-inner-core.js; the 12c cut drops that beat ("The inner core is
// about as hot as the surface of the Sun"), so its label card is gone, but the solid ball still has to be there: s05
// draws drawCrystal + the inner-core boundary flash (camera.js ICB_IN) as the faller plunges through it.
// Exports the plate, card (group / qT / cardIn / cardOut), boundary-flash, crystal and crossing-time helpers (s01, s05-s08).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, RADIUS, fallerDepth } from '../camera.js';

const { W, H } = L;
export const HOT = [255, 236, 200];

/** Global time at which the faller crosses depth `d` between gt a and b (bisection; pure, cached by the caller). */
export function crossTime(d, a, b) {
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (fallerDepth(m) < d) a = m; else b = m; }
  return (a + b) / 2;
}

/** 12b f12a: group opacity. Draws `fn` at full strength into an offscreen layer and composites it at alpha `a`, so a
 *  fading card (plate, glow, text) fades as ONE image: no translucent plate with a lingering bright dial, no pill left
 *  behind by its text. a >= 1 draws straight. */
let GROUP = null;
export function group(ctx, a, fn) {
  if (a <= 0.002) return;
  if (a >= 0.998 || typeof OffscreenCanvas === 'undefined') { ctx.save(); fn(ctx); ctx.restore(); return; }
  GROUP ??= new OffscreenCanvas(W, H);
  const g = GROUP.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0;
  g.clearRect(0, 0, W, H);
  g.setTransform(ctx.getTransform());
  g.save(); fn(g); g.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= a;
  ctx.drawImage(GROUP, 0, 0);
  ctx.restore();
}
/** Beat-local time quantised to the OUTPUT frame (motion-blur sub-frames share it), for entrances that must be fully
 *  on from their first visible frame. */
export const qT = (v) => Math.round(v.gt * 30) / 30 - (v.gt - v.t);
/** Card lifecycle: 0 before `start` (output-frame gated), then entrance progress 0..1 over `dur` (scale/lift only). */
export const cardIn = (v, start, dur = 0.45) => (qT(v) < start - 1e-6 ? -1 : L.ease.outCubic(L.prog(v.t, start, dur)));
/** Card exit: 1 → 0 over the last moments of the beat, finished before the next beat starts. */
export const cardOut = (v, lead = 0.42, dur = 0.3) => 1 - L.ease.inOutCubic(L.prog(v.t, v.d - lead, dur));

/** Soft dark plate for labels over the bright core. */
export function plate(ctx, x, y, w, h, k, r = 20, fill = 0.8) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= L.clamp(k);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 48;
  ctx.fillStyle = `rgba(16,9,7,${fill})`;
  L.roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,214,180,0.13)';
  ctx.lineWidth = 1;
  L.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.stroke();
  ctx.restore();
}

/** A ring of light on a boundary circle of radius `rad` (m) around the centre: flash e (0..1) + an outward ripple. */
export function boundaryFlash(ctx, v, rad, age, col = HOT) {
  if (age < -0.1 || age > 1.6) return;
  const rp = v.ws(rad), cx = v.wx(0), cy = v.wy(R_EARTH);
  const e = Math.exp(-Math.max(0, age) * 2.6) * L.clamp((age + 0.1) / 0.1);
  if (e < 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  L.glow(ctx, col, 26, () => {
    ctx.strokeStyle = L.rgba(col, 0.85 * e);
    ctx.lineWidth = 3 + 3 * e;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rp), 0, Math.PI * 2); ctx.stroke();
  });
  const ra = L.ease.outCubic(L.clamp(age / 1.3));
  ctx.strokeStyle = L.rgba(col, 0.35 * (1 - ra));
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rp + 140 * ra), 0, Math.PI * 2); ctx.stroke();
  // the hot spot where the faller pierces the boundary
  const fy = v.wy(fallerDepth(v.gt - Math.max(0, age)));
  L.lightBlob(ctx, cx, fy, 160, [255, 210, 150], 0.5 * e);
  ctx.restore();
}

/** Incandescent solid iron (world space): a white-hot heart, soft slowly churning mottling and a faint rim. a = 0..1. */
const MOTTLE = (() => { const r = L.rng(4404); return Array.from({ length: 26 }, () => ({ a: r() * 6.283, d: Math.sqrt(r()) * 0.82, s: 0.18 + r() * 0.22, hot: r() > 0.45, ph: r() * 9 })); })();
export function drawCrystal(ctx, v, a = 1) {
  const rp = v.ws(RADIUS.icb);
  const lod = L.clamp((rp - 140) / 220);       // gone at globe scale (rp ≈ 80 px)
  a *= lod;
  if (a <= 0.01) return;
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  if (cx + rp < 0 || cx - rp > W || cy + rp < 0 || cy - rp > H) return;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rp - 1), 0, Math.PI * 2); ctx.clip();
  // the white-yellow heart, breathing very slowly
  const br = 0.92 + 0.08 * Math.sin(v.gt * 0.9);
  const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rp);
  hg.addColorStop(0, `rgba(255,248,226,${0.3 * a * br})`);
  hg.addColorStop(0.45, `rgba(255,224,160,${0.12 * a})`);
  hg.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(cx - rp, cy - rp, rp * 2, rp * 2);
  // soft mottling: hot and cooler patches drifting on slow, noisy paths (no lines, no grid)
  for (const m of MOTTLE) {
    const an = m.a + 0.05 * v.gt + 0.25 * L.noise1(v.gt * 0.12 + m.ph, 3);
    const dd = m.d + 0.06 * L.noise1(v.gt * 0.15 + m.ph * 2, 5);
    const x = cx + Math.cos(an) * dd * rp, y = cy + Math.sin(an) * dd * rp;
    const rr = m.s * rp * (1 + 0.15 * Math.sin(v.gt * 0.5 + m.ph));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    if (m.hot) { g.addColorStop(0, `rgba(255,226,176,${0.16 * a})`); g.addColorStop(1, 'rgba(255,226,176,0)'); ctx.globalCompositeOperation = 'source-over'; }   // 12b f12a: not additive (lime cast)
    else { g.addColorStop(0, `rgba(150,60,20,${0.16 * a})`); g.addColorStop(1, 'rgba(150,60,20,0)'); ctx.globalCompositeOperation = 'multiply'; }
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  // a faint rim highlight: the solid ball has an edge
  const rg = ctx.createRadialGradient(cx, cy, rp * 0.86, cx, cy, rp);
  rg.addColorStop(0, 'rgba(255,240,210,0)');
  rg.addColorStop(1, `rgba(255,240,210,${0.12 * a})`);
  ctx.fillStyle = rg;
  ctx.fillRect(cx - rp, cy - rp, rp * 2, rp * 2);
  ctx.restore();
}
