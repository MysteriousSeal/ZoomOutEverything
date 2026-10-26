// Beat 12 — Today they reach about a hundred light-years in every direction, and they're still spreading.
// The camera pulls out ten-fold: the shells settle into the full bubble, radius BUBBLE_R (100 ly), around
// the pale dot that is Earth, among a few hundred nearby stars (world space, deterministic). Every star the
// 1920s front has already passed is faintly lit in the accent; stars flare as the front reaches them. A thin
// radius rule draws itself out to the rim on "a hundred light-years". On "still spreading" soft wavefronts
// ripple off the rim while the bubble keeps growing through a calm final hold.
// This file also owns the world-space star field (visible from the nearest stars outward, beat 11 too).
import * as L from '../../../../engine/runtime/lib.js';
import { LY } from '../camera.js';
import { glowDot } from '../env.js';
import { leadR, grow } from './s10-last-trace.js';

const { W, H } = L;
const T_LAND = 1.95;                 // beat time the bubble arrives at its true size (≈ "hundred light-years")
const T_SPREAD = 4.32;               // "and they're still spreading"
const DIR = 0.36;                    // angle of the radius rule (toward the lower right, clear of the label)

// the nearest stars at their true distances (directions chosen for the layout), then a deterministic field
const NAMED = [
  [4.37, 150, 1.0, [255, 236, 200]],   // Alpha Centauri
  [5.96, 25, 0.35, [255, 150, 110]],   // Barnard's Star
  [7.86, 282, 0.3, [255, 140, 100]],   // Wolf 359
  [8.31, 318, 0.4, [255, 170, 130]],   // Lalande 21185
  [8.6, 38, 0.95, [205, 222, 255]],    // Sirius
  [10.5, 200, 0.55, [255, 210, 160]],  // Epsilon Eridani
  [11.4, 345, 0.75, [255, 240, 215]],  // Procyon
  [11.9, 168, 0.55, [255, 225, 180]],  // Tau Ceti
];
export const STARS = (() => {
  const out = NAMED.map(([d, a, b, col], i) => ({ x: Math.cos((a * Math.PI) / 180) * d * LY, y: Math.sin((a * Math.PI) / 180) * d * LY, b, col, ph: i * 1.7 }));
  const r = L.rng(1212);
  while (out.length < 460) {
    // uniform in a 3D ball of 170 ly, seen from above (so the field thickens toward the middle)
    const x = r() * 2 - 1, y = r() * 2 - 1, z = r() * 2 - 1;
    if (x * x + y * y + z * z > 1) continue;
    const d = Math.hypot(x, y) * 170;
    if (d < 12.5) continue;            // the true neighbourhood above is hand-placed
    const tint = r();
    const col = tint < 0.5 ? [255, 176, 130] : tint < 0.82 ? [255, 236, 214] : [200, 216, 255];
    out.push({ x: x * 170 * LY, y: y * 170 * LY, b: Math.pow(r(), 2.6), col, ph: r() * 20 });
  }
  return out;
})();

function drawStars(ctx, v) {
  const lm = Math.log10(v.cam.mpp);
  const k = L.clamp((lm - 13.0) / 0.7);
  if (k <= 0.01) return;
  const R = leadR(v), m = v.cam.mpp;
  const ex = v.wx(0), ey = v.wy(0);
  ctx.save();
  for (const s of STARS) {
    const x = v.wx(s.x), y = v.wy(s.y);
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const d = Math.hypot(s.x, s.y);
    const near = L.clamp((Math.hypot(x - ex, y - ey) - 6) / 30);   // no pile-up on the pale dot
    if (near <= 0) continue;
    const px = R > 0 ? (R - d) / m : -1e9;                          // + once the front has passed the star
    const flare = Math.exp(-((px / 18) ** 2));
    const inside = L.clamp((px + 4) / 40);
    const tw = 0.82 + 0.18 * Math.sin(v.gt * 1.4 + s.ph);
    const a = k * near * (0.35 + 0.65 * s.b) * tw;
    const col = L.mix(s.col, v.accent, 0.55 * inside);
    if (s.b > 0.3 || inside > 0) glowDot(ctx, x, y, 6 + 18 * s.b + 6 * inside, col, (0.25 * s.b + 0.16 * inside) * a);
    if (flare > 0.03) glowDot(ctx, x, y, 20 + 10 * s.b, v.accent, 0.42 * flare * k * near);
    ctx.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.45), Math.min(1, a * (1 + 0.3 * inside)));
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 0.7 + 1.5 * s.b + 0.3 * inside), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export default {
  beat: 12,
  chapter: { num: '12', title: 'The bubble', sub: 'Still spreading' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.1, name: 'swell', gain: 0.22, pitch: 0.8 },
      { t: T_LAND, name: 'impact', gain: 0.36, pitch: 0.7 },
      { t: T_LAND + 0.04, name: 'bloom', gain: 0.32, pitch: 0.85 },
      { t: T_LAND + 0.45, name: 'tick', gain: 0.22, pitch: 1.0 },
      { t: T_SPREAD, name: 'shimmer', gain: 0.2, pitch: 0.8 },
      { t: T_SPREAD + 0.1, name: 'swell', gain: 0.14, pitch: 0.7 },
    ];
  },
  drawWorld(ctx, v) {
    drawStars(ctx, v);
    const t = v.t;
    if (t < 0) return;
    const R = leadR(v), m = v.cam.mpp;
    const cx = v.wx(0), cy = v.wy(0), r = R / m;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // arrival: the whole bubble breathes once with light as it lands at its true size
    const land = Math.exp(-Math.max(0, t - T_LAND) * 1.8) * L.ease.outCubic(L.prog(t, T_LAND - 0.3, 0.3));
    if (land > 0.01) {
      const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.08);
      g.addColorStop(0, L.rgba(v.accent, 0)); g.addColorStop(0.85, L.rgba(v.accent, 0.12 * land)); g.addColorStop(1, L.rgba(v.accent, 0));
      ctx.fillStyle = g; ctx.fillRect(cx - r * 1.1, cy - r * 1.1, r * 2.2, r * 2.2);
    }
    // "still spreading": soft wavefronts slide off the rim and fade
    for (let q = 0; q < 4; q++) {
      const u = (t - T_SPREAD - q * 1.15) / 2.2;
      if (u <= 0 || u >= 1) continue;
      const rr = r * (1 + 0.16 * L.ease.outCubic(u));
      ctx.strokeStyle = L.rgba(v.accent, 0.3 * (1 - u) * (1 - u));
      ctx.lineWidth = 1.5 + 4 * (1 - u);
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // the radius rule: from the pale dot to the rim (drawn in on "a hundred light-years")
    const rk = L.ease.inOutCubic(L.prog(t, T_LAND + 0.35, 0.7));
    if (rk > 0) {
      const ux = Math.cos(DIR), uy = Math.sin(DIR);
      const x0 = cx + ux * 12, y0 = cy + uy * 12, len = Math.max(0, r - 16) * rk;   // 15b: stops inside the rim
      ctx.save();
      ctx.strokeStyle = `rgba(235,230,222,${0.7 * v.k})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + ux * len, y0 + uy * len); ctx.stroke();
      ctx.setLineDash([]);
      // end ticks across the rule
      const ex = x0 + ux * len, ey = y0 + uy * len;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex - uy * 9, ey + ux * 9); ctx.lineTo(ex + uy * 9, ey - ux * 9); ctx.stroke();
      // the value on the rule: a small "100 LY" tag riding on its midpoint (reads along the line)
      const tk = v.k * L.ease.outCubic(L.prog(t, T_LAND + 0.75, 0.5));
      if (tk > 0) {
        const mx = x0 + ux * (r - 12) * 0.5, my = y0 + uy * (r - 12) * 0.5;
        ctx.translate(Math.round(mx), Math.round(my));   // 15b: level, on whole pixels (the rotated tag aliased)
        ctx.font = L.font(26, 700, L.FONT.body);   // 15b: ≥ 26 px house rule
        ctx.letterSpacing = '3px';
        const tw = ctx.measureText('100 LY').width;
        ctx.letterSpacing = '0px';
        ctx.fillStyle = `rgba(6,8,14,${0.9 * tk})`;
        L.roundRect(ctx, -tw / 2 - 14, -20, tw + 26, 40, 20); ctx.fill();
        ctx.strokeStyle = L.rgba(v.accent, 0.6 * tk); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = `rgba(240,234,224,${0.95 * tk})`;
        ctx.textBaseline = 'middle';
        L.trackedText(ctx, '100 LY', 0, 1 + (1 - tk) * 6, 3, 'center');
      }
      ctx.restore();
    }
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    // a quiet reticle on the pale dot: that is us
    const ek = v.k * L.ease.outCubic(L.prog(t, T_LAND + 0.2, 0.6));
    if (ek > 0) {
      const cx = v.wx(0), cy = v.wy(0);
      ctx.save();
      ctx.strokeStyle = `rgba(235,230,222,${0.55 * ek})`;
      ctx.lineWidth = 1.5;
      const rr = 14 + 2 * Math.sin(v.gt * 2);
      for (let i = 0; i < 4; i++) {
        const a = v.gt * 0.3 + (i * Math.PI) / 2;
        ctx.beginPath(); ctx.arc(cx, cy, rr, a, a + 0.9); ctx.stroke();
      }
      ctx.restore();
    }
    L.bigLabel(ctx, { x: 64, y: 430, big: '≈ 100 LIGHT-YEARS', small: 'in every direction', k: v.k * L.enter(t, T_LAND - 0.25, 0.6), accent: v.accent, size: 80 });
  },
};
