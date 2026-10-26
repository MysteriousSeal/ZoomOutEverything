// Beat 6 — T. rex lived closer to us than to Stegosaurus. The camera pulls out to 150 Ma: an accurate
// Stegosaurus (arched back peaking over the hips, two staggered rows of plates, four-spike thagomizer, small
// head held low, short forelimbs) walks in at the same 32 px/m scale as the T. rex (beat 5 keeps drawing it).
// Two measured brackets under the ruler: T. rex → now "66 MILLION YEARS" draws on "closer to us", then
// Stegosaurus → T. rex "≥ 82 MILLION YEARS" draws exactly on "than to Stegosaurus" (≈ 32.09 s) with "82 > 66".
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, landmark, hBracket, timelineK, ACCENT } from '../env.js';
import { GROUND, smoothPath, limb, litShape, bigK, nearNow, label, tag, footing, RIM } from './s05-dinosaurs.js';

// ------------------------------------------------------------------ the Stegosaurus (local px, 1 m ≈ 32 px; origin = ground under the hip)
const STEGO_BODY = [
  [-152, -50, 1],                                                   // tail tip
  [-124, -57], [-86, -68], [-46, -82],                             // tail, top (held clear of the ground)
  [-8, -92], [22, -91],                                             // the back peaks over the hips
  [52, -82], [76, -67],                                             // falls toward the low shoulders
  [96, -52], [110, -42],                                            // short neck, held low
  [121, -40], [133, -35], [142, -28, 1],                            // small narrow head, beak-like snout
  [134, -24], [122, -24],                                           // lower jaw
  [109, -30], [96, -35],                                            // throat
  [84, -36], [60, -33], [32, -35], [4, -41],                        // chest, belly
  [-20, -52],                                                       // behind the thigh
  [-52, -60], [-92, -56], [-128, -49],                              // tail underside
];
const FORE_NEAR = [[74, -50, 19], [77, -26, 13], [79, -6, 12], [81, 0, 13]];
const FORE_FAR = [[66, -50, 17], [63, -26, 12], [60, -6, 11], [58, 0, 12]];
const HIND_NEAR = [[2, -66, 34], [9, -34, 18], [3, -10, 14], [9, 0, 15]];
const HIND_FAR = [[-8, -66, 30], [-13, -34, 16], [-18, -10, 13], [-14, 0, 14]];

/** dorsal line height at local x (linear between body top points) */
function dorsal(x) {
  const top = STEGO_BODY.slice(0, 10);
  for (let i = 0; i < top.length - 1; i++) {
    const [x0, y0] = top[i], [x1, y1] = top[i + 1];
    if (x >= x0 && x <= x1) return L.lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return -50;
}
/** plate height (px) along the back: largest over the hips and tail base, small at the neck and tail */
const plateH = (x) => 6 + 25 * Math.exp(-Math.pow((x + 18) / 58, 2));
function plate(ctx, x, h, lean) {
  const yb = dorsal(x) + 5, bw = h * 0.98;
  smoothPath(ctx, [
    [x - bw * 0.5, yb], [x - bw * 0.62, yb - h * 0.45], [x - lean - bw * 0.12, yb - h * 0.92],
    [x - lean, yb - h, 1], [x - lean + bw * 0.2, yb - h * 0.9], [x + bw * 0.5, yb - h * 0.42], [x + bw * 0.45, yb, 1],
  ]);
}
// plate rows: near row, far row offset by half a spacing (alternating)
const PLATES = (() => { const near = [], far = []; for (let x = 92; x >= -116; x -= 23) { near.push(x); far.push(x - 11.5); } return { near, far }; })();
// the thagomizer: base x, angle (rad, measured from +x), length
const SPIKES_FAR = [[-128, -2.2, 22], [-143, -2.55, 25]];
const SPIKES_NEAR = [[-132, -2.05, 25], [-146, -2.45, 28]];
function spike(ctx, x, ang, len) {
  const yb = dorsal(x) + 3, w = 3.4;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  ctx.beginPath();
  ctx.moveTo(x - dy * w, yb + dx * w);
  ctx.quadraticCurveTo(x + dx * len * 0.5 - dy * w * 0.6, yb + dy * len * 0.5 + dx * w * 0.6, x + dx * len, yb + dy * len);
  ctx.quadraticCurveTo(x + dx * len * 0.5 + dy * w * 0.6, yb + dy * len * 0.5 - dx * w * 0.6, x + dy * w, yb - dx * w);
  ctx.closePath();
}

export function drawStego(ctx, x, gy, s, { gt = 0, alpha = 1 } = {}) {
  if (s <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, gy);
  ctx.scale(s, s);
  const off = 1.7 / Math.max(0.5, s);
  const plateTop = [104, 128, 134], plateBot = [50, 66, 74];
  // far side: legs, plates, spikes (darker, behind the body)
  litShape(ctx, () => smoothPath(ctx, limb(FORE_FAR)), { rimA: 0.15, dark: 0.45, off, y0: -60 });
  litShape(ctx, () => smoothPath(ctx, limb(HIND_FAR)), { rimA: 0.15, dark: 0.45, off, y0: -70 });
  for (const px of PLATES.far) litShape(ctx, () => plate(ctx, px, plateH(px) * 1.04, 2.5), { top: plateTop, bot: plateBot, rimA: 0.4, dark: 0.45, off, y0: -125, y1: -70 });
  for (const [sx, a, l] of SPIKES_FAR) litShape(ctx, () => spike(ctx, sx, a, l), { top: [150, 160, 160], bot: [60, 70, 74], rimA: 0.4, dark: 0.4, off: off * 0.6, y0: -90, y1: -50 });
  // body (a breath of motion: the tail sways, the head grazes)
  const sway = Math.sin(gt * 1.05 + 1.2), graze = Math.sin(gt * 0.8);
  const body = STEGO_BODY.map(([px, py, sh]) => [px, py + (px < -40 ? sway * 3.5 * Math.pow((-40 - px) / 112, 1.5) : 0) + (px > 100 ? graze * 1.6 * (px - 100) / 42 : 0), sh]);
  litShape(ctx, () => smoothPath(ctx, body), { off, y0: -95, y1: -25 });
  litShape(ctx, () => smoothPath(ctx, limb(HIND_NEAR)), { rimA: 0.3, off, y0: -75 });
  litShape(ctx, () => smoothPath(ctx, limb(FORE_NEAR)), { rimA: 0.3, off, y0: -60 });
  // near row of plates and spikes
  for (const px of PLATES.near) litShape(ctx, () => plate(ctx, px, plateH(px), 3), { top: plateTop, bot: plateBot, rimA: 0.6, off, y0: -125, y1: -70 });
  for (const [sx, a, l] of SPIKES_NEAR) litShape(ctx, () => spike(ctx, sx, a, l), { top: [190, 198, 196], bot: [80, 92, 96], rimA: 0.8, off: off * 0.6, y0: -95, y1: -50 });
  ctx.restore();
}

const B66 = 1.2, B82 = 2.40, CMP = 2.46;   // beat-local: "closer to us" · "than to Stegosaurus" (32.09 s)

export default {
  beat: 6,
  chapter: { num: '06', title: 'T. rex and Stegosaurus', sub: '66 vs 150 million years ago' },
  layer: 6,
  cues(d) {
    return [
      { t: B66, name: 'swish', gain: 0.2, pitch: 1.2 },
      { t: B66 + 0.4, name: 'tick', gain: 0.22, pitch: 1.1 },
      { t: B82, name: 'swish', gain: 0.24, pitch: 0.9 },
      { t: CMP + 0.05, name: 'ping', gain: 0.34, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const lk = timelineK(v);
    if (lk <= 0 || v.t < 0.3) return;
    const ry = rulerY(v), gy = ry - GROUND;
    const x = tx(v, AGE.stego);
    if (x < -260 || x > L.W + 260) return;
    const big = bigK(v, 7, 1.0);
    const scale = 0.9 * L.lerp(0.2, 1, big);
    const rise = L.ease.outCubic(L.prog(v.t, 0.55, 0.7));
    const nk = nearNow(v, x, 24, 50);
    const a = lk * rise * nk;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    if (big > 0.01) {
      L.lightBlob(ctx, x, gy - 60 * scale, 200 * scale, ACCENT, 0.09 * big);
      footing(ctx, x, ry, 120 * scale, big);
      drawStego(ctx, x, gy + (1 - rise) * 22, scale, { gt: v.gt, alpha: L.clamp(big * 1.6 - 0.3) });
      tag(ctx, 'STEGOSAURUS', x, gy - 150 * scale, L.clamp(big * 2 - 1) * L.ease.outCubic(L.prog(v.t, 1.0, 0.5)));
    }
    ctx.restore();
    landmark(ctx, v, AGE.stego, { k: lk * (1 - big) * nearNow(v, x, 70, 50) * bigK(v, 8, 0.6, 0.1), label: 'Stegosaurus', r: 5 });
  },
  drawOverlay(ctx, v) {
    const ry = rulerY(v), y = ry + 160;
    const xs = tx(v, AGE.stego), xt = tx(v, AGE.trex), xn = v.wx(0);
    const k66 = L.prog(v.t, B66, 0.6), k82 = L.prog(v.t, B82, 0.55);
    ctx.save();
    ctx.globalAlpha = v.k;
    // drop lines from the ruler marks to the brackets (so each end reads as "this moment")
    const drop = (xx, kk, col) => {
      if (kk <= 0) return;
      ctx.strokeStyle = L.rgba(col, 0.35 * L.clamp(kk * 2));
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(xx, ry + 12); ctx.lineTo(xx, ry + 70); ctx.moveTo(xx, ry + 110); ctx.lineTo(xx, y); ctx.stroke();
      ctx.setLineDash([]);
    };
    const WARMG = [222, 206, 186];
    drop(xt, Math.max(k66, k82), ACCENT);
    drop(xn, k66, ACCENT);
    drop(xs, k82, WARMG);
    // T. rex → now: the shorter gap (accent), then Stegosaurus → T. rex: the longer one
    hBracket(ctx, xt + 3, xn - 3, y, k66, ACCENT, '66 MILLION YEARS', 'below', 30);
    hBracket(ctx, xs + 3, xt - 3, y, k82, WARMG, '≥ 82 MILLION YEARS', 'below', 30);
    ctx.restore();
    label(ctx, v, '82 > 66', 'million years · T. rex is closer to us', v.k * L.ease.outCubic(L.prog(v.t, CMP, 0.45)));
  },
};
