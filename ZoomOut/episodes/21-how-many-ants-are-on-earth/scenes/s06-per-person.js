// Beat 6 (ep 21) — "Nearly two and a half million ants | for every person alive."
// 20 quadrillion ÷ 8.2 billion people ≈ 2.44 million, so the label reads NEARLY 2.5 MILLION (never a bare 2.5 MILLION).
// Under the globe: one standing person (true 7.5-head proportions, 1.75 m) and, spreading from their feet, their share
// of ants drawn TO SCALE: 2.44 million 5 mm ants side by side on a 5 mm grid cover 61 m², a disc 8.8 m across, seen in
// perspective. The ants are far below a pixel each at this scale, so the disc reads as a dense amber carpet of specks.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { subLine } from './s04-quadrillion.js';

const { W, ease, clamp, prog, lerp, rgba, mix } = L;
export const PER_PERSON = 2e16 / 8.2e9;                         // 2,439,024
const AREA = PER_PERSON * 0.005 * 0.005;                        // m², one ant per 5 × 5 mm cell
const R_M = Math.sqrt(AREA / Math.PI);                          // 4.41 m
const FIG = { h: 158, m: 1.75, x: W / 2, feet: 1326 };         // person: 1.75 m tall, drawn 158 px
const PPM = FIG.h / FIG.m;                                      // px per metre (person and ants share it)
const DISC = { rx: R_M * PPM, tilt: 0.13 };                     // ≈ 353 px; vertical squash = viewing angle
const T6 = { label: 0.12, sub: 0.32, fig: 0.25, grow0: 0.55, grow1: 2.3, person: 2.55, note: 2.35 };

// ------------------------------------------------------------------ a standing person (front view, neutral)
// right-half outline, x = half-width, y = 0 (crown) … 1 (soles), in body heights (7.5 heads; arms to mid-thigh)
const HALF = [
  [0.024, 0.128], [0.03, 0.15], [0.1, 0.17], [0.124, 0.188], [0.134, 0.225], [0.136, 0.3], [0.131, 0.375],
  [0.126, 0.45], [0.12, 0.515], [0.123, 0.56], [0.112, 0.612], [0.097, 0.607], [0.094, 0.56], [0.096, 0.515],
  [0.099, 0.45], [0.101, 0.375], [0.099, 0.3], [0.091, 0.238], [0.083, 0.3], [0.076, 0.38], [0.09, 0.465],
  [0.093, 0.52], [0.086, 0.62], [0.073, 0.72], [0.071, 0.8], [0.057, 0.93], [0.071, 0.982], [0.066, 1.0],
  [0.019, 1.0], [0.024, 0.94], [0.03, 0.8], [0.027, 0.72], [0.02, 0.6], [0.005, 0.53],
];
function personPath(ctx, x, feet, h) {
  const pts = [...HALF, ...HALF.slice().reverse().map(([a, b]) => [-a, b])].map(([a, b]) => [x + a * h, feet - h + b * h]);
  ctx.beginPath();
  ctx.moveTo((pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  ctx.closePath();
  // head (separate ellipse, overlapping the neck)
  ctx.moveTo(x + 0.047 * h, feet - h + 0.066 * h);
  ctx.ellipse(x, feet - h + 0.066 * h, 0.047 * h, 0.066 * h, 0, 0, Math.PI * 2);
}
function drawPerson(ctx, k, glow) {
  if (k <= 0) return;
  const { x, feet, h } = FIG;
  ctx.save();
  ctx.globalAlpha *= k;
  // contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.ellipse(x, feet, 0.16 * h, 0.022 * h, 0, 0, Math.PI * 2); ctx.fill();
  if (glow > 0) L.lightBlob(ctx, x, feet - h * 0.5, h * 0.9, [255, 230, 190], 0.18 * glow);
  personPath(ctx, x, feet, h);
  const g = ctx.createLinearGradient(x - 0.14 * h, 0, x + 0.14 * h, 0);
  g.addColorStop(0, 'rgb(250,248,244)'); g.addColorStop(0.55, 'rgb(222,226,234)'); g.addColorStop(1, 'rgb(150,160,178)');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ the carpet of ants (fixed specks in a unit disc)
const SPECK = (() => {
  const r = L.rng(2161), out = [];
  for (let i = 0; i < 5200; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    out.push([Math.cos(a) * d, Math.sin(a) * d, d, r(), r()]);
  }
  return out;
})();
function drawCarpet(ctx, grow, side, t) {
  if (grow <= 0) return;
  const cx = FIG.x, cy = FIG.feet, rx = DISC.rx, ry = DISC.rx * DISC.tilt;
  ctx.save();
  // base density: a warm amber mass, back half then front half
  ctx.beginPath();
  if (side < 0) ctx.rect(0, 0, W, cy); else ctx.rect(0, cy, W, 1000);
  ctx.clip();
  const R = grow;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rx * R));
  g.addColorStop(0, rgba([196, 120, 40], 0.6)); g.addColorStop(0.85, rgba([170, 100, 34], 0.5)); g.addColorStop(1, rgba([170, 100, 34], 0));
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, DISC.tilt); ctx.translate(-cx, -cy);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rx * R * 1.03), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // specks: individual ants (bright/dark flecks), drifting a hair so the mass feels alive
  for (const [u, w, d, tone, ph] of SPECK) {
    if (d > R) continue;
    if ((w < 0) !== (side < 0)) continue;
    const edge = clamp((R - d) * 12);
    const jx = Math.sin(t * 1.3 + ph * 30) * 0.6, jy = Math.cos(t * 1.1 + ph * 20) * 0.3;
    const x = cx + u * rx + jx, y = cy + w * ry + jy;
    const depth = 0.75 + 0.25 * (w + 1) / 2;                // nearer rows a touch larger
    const col = tone < 0.55 ? [255, 200, 110] : tone < 0.85 ? [120, 64, 20] : [255, 236, 190];
    ctx.fillStyle = rgba(col, (tone < 0.85 ? 0.75 : 0.9) * edge);
    const s = (tone < 0.85 ? 1.6 : 1.2) * depth;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  // the spreading front: a thin bright rim while it grows
  if (grow < 1) {
    ctx.strokeStyle = rgba([255, 214, 140], 0.5 * (1 - grow * 0.6));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0, rx * R), Math.max(0, ry * R), 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export default {
  beat: 6,
  chapter: { num: '05', title: 'Per person', sub: '20 quadrillion ÷ 8.2 billion people' },
  layer: 6,
  cues(d) {
    return [
      { t: T6.label, name: 'swish', gain: 0.22, pitch: 1.0 },
      { t: T6.grow0, name: 'shimmer', gain: 0.2, pitch: 0.8 },
      { t: T6.person, name: 'blip', gain: 0.24, pitch: 1.05 },
    ];
  },
  drawWorld(ctx, v) {},
  drawOverlay(ctx, v) {
    const t = v.t, k = v.k * (1 - ease.inCubic(prog(t, v.d - 0.3, 0.25)));   // clear out before the globe moves up
    if (t < 0 || k <= 0) return;
    ctx.save();
    ctx.globalAlpha *= k;
    // headline: NEARLY 2.5 MILLION / ANTS PER PERSON (fitted, haloed)
    const a1 = ease.outCubic(prog(t, T6.label, 0.5)), a2 = ease.outCubic(prog(t, T6.sub, 0.5));
    if (a1 > 0) {
      const text = 'NEARLY 2.5 MILLION';
      const size = L.fitSize(ctx, text, 900, 104, 800, L.FONT.display, 40);
      ctx.save();
      ctx.globalAlpha *= a1;
      ctx.font = L.font(size, 800, L.FONT.display);
      ctx.fillStyle = rgba(ACCENT);
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 22;
      L.trackedText(ctx, text, W / 2, 1100 + (1 - a1) * 26, 1, 'center');
      ctx.restore();
    }
    subLine(ctx, 'ANTS PER PERSON ALIVE', 1144, { k: a2, size: 30, track: 4, col: [236, 238, 244] });
    // the person and their ants, to scale
    const grow = Math.sqrt(ease.inOutCubic(prog(t, T6.grow0, T6.grow1 - T6.grow0)));
    const kf = ease.outCubic(prog(t, T6.fig, 0.5));
    const glow = Math.sin(Math.PI * prog(t, T6.person, 0.9));
    drawCarpet(ctx, grow, -1, v.gt);
    drawPerson(ctx, kf, glow);
    drawCarpet(ctx, grow, 1, v.gt);
    // scale note, right of the person (small, so the headline stays the one focal text)
    const kn = ease.outCubic(prog(t, T6.note, 0.5));
    if (kn > 0) {
      ctx.save();
      ctx.globalAlpha *= kn;
      const note = 'SIDE BY SIDE · TO SCALE';
      ctx.letterSpacing = '2px';
      let ns = 21;
      do { ctx.font = L.font(ns, 600, L.FONT.body); } while (ctx.measureText(note).width > 330 && --ns > 14);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = 'rgba(214,220,232,0.9)';
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
      L.trackedText(ctx, note, FIG.x + 0.2 * FIG.h + 14, FIG.feet - FIG.h * 0.55, 2, 'left');
      ctx.strokeStyle = 'rgba(214,220,232,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(FIG.x + 0.2 * FIG.h, FIG.feet - FIG.h * 0.55 - 7); ctx.lineTo(FIG.x + 0.2 * FIG.h + 6, FIG.feet - FIG.h * 0.55 - 7); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
};
