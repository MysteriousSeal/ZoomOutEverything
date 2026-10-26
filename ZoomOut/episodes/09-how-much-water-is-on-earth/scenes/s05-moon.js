// Beat 5 — "That's less than half the width of the Moon."
// The real Moon's near side (3,474 km, true scale, maria where they really are) fades in beside the water ball. A dashed half-way line splits
// the Moon, then a dashed copy of the ball glides into the Moon's left half: it fits with room to spare.
// The Moon and the ghost fade out as the camera pulls back in beat 6.
import * as L from '../../../../engine/runtime/lib.js';
import { ALL, MOON_CMP } from '../camera.js';
import { SUN_DIR } from '../env.js';

const DEG = Math.PI / 180;
const T_DRAW = [0.25, 0.9];    // the Moon fades in
const T_HALF = 1.15;           // half-way line
const T_GHOST = [1.35, 1.0];   // ghost ball glides into the Moon
const T_LABEL = 1.1;

// ghost target: centred in the Moon's left half (the half facing the ball), with room to spare
const GX = MOON_CMP.x - MOON_CMP.d / 4;

function fadeOut(v) { return 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.35, 0.5)); }
// the ghost and half-way line leave a touch ahead of the Moon body
function leadFade(v) { return 1 - L.prog(v.t, v.d - 0.45, 0.4); }

// ------------------------------------------------------------------ the Moon's near side (rendered once, then scaled)
// Real mare positions (selenographic lat, lon, radius in degrees; Procellarum and Frigoris as chains of lobes),
// a few bright rayed craters, small craters with rim shading, soft relief noise, lit from the upper left like the
// water ball (SUN_DIR).
const MARE = [
  [32.8, -15.6, 15.5], [36, -24, 9], [28, 17.5, 9.5], [8.5, 31.4, 10.5], [3, 24, 6], [17, 59.1, 7.2], [-7.8, 51.3, 8.5],
  [-15.2, 35.5, 4.8], [-21.3, -16.6, 8.5], [-10, -22.5, 5.5], [-24.4, -38.6, 4.8], [13.3, 3.6, 4.2], [7.5, -30.9, 6.5],
  [18, -50, 12], [28, -54, 10], [5, -52, 10], [-3, -43, 8], [40, -45, 8], [12, -62, 7],
  [0, -35, 9], [-10, -30, 7], [25, -38, 9], [10, -42, 9], [20, 5, 6], [-2, 40, 7], [12, 42, 6],
  [56, -38, 5], [57, -28, 5], [57, -18, 5], [56, -8, 5], [56, 2, 5], [55, 12, 4.5], [53, 22, 4], [10, 82, 4], [-1, 86, 4],
];
const RAYED = [[-43.3, -11.2, 2.2, 1], [9.6, -20.1, 2.4, 0.8], [8.1, -38, 1.6, 0.6], [23.7, -47.4, 1.0, 0.7], [-9, -1, 0.8, 0.3]];
let MOON_CV = null;
function moonTexture() {
  if (MOON_CV) return MOON_CV;
  const N = 900, R = N / 2 - 2;
  const cv = new OffscreenCanvas(N, N), g = cv.getContext('2d');
  const img = g.createImageData(N, N), D = img.data;
  const rnd = L.rng(7171);
  const craters = Array.from({ length: 420 }, () => {
    const s = Math.pow(rnd(), 3.2);
    return { lat: (Math.asin(rnd() * 2 - 1)) / DEG, lon: rnd() * 180 - 90, rad: 0.35 + s * 3.2, dep: 0.25 + rnd() * 0.35 };
  });
  const toV = (la, lo) => [Math.cos(la * DEG) * Math.sin(lo * DEG), Math.sin(la * DEG), Math.cos(la * DEG) * Math.cos(lo * DEG)];
  const mv = MARE.map(([la, lo, r]) => ({ v: toV(la, lo), c: Math.cos(r * DEG), r }));
  const rv = RAYED.map(([la, lo, r, k]) => ({ v: toV(la, lo), r, k }));
  const cr = craters.map((q) => ({ v: toV(q.lat, q.lon), cr: Math.cos(q.rad * DEG), rad: q.rad * DEG, dep: q.dep }));
  let sx = SUN_DIR.x, sy = -SUN_DIR.y, sz = 0.78; const sn = Math.hypot(sx, sy, sz); sx /= sn; sy /= sn; sz /= sn;
  const hash = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
  const vn = (x, y, z) => {   // value noise
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf), t = zf * zf * (3 - 2 * zf);
    let acc = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let d = 0; d < 2; d++)
      acc += hash(xi + a, yi + b, zi + d) * (a ? u : 1 - u) * (b ? w : 1 - w) * (d ? t : 1 - t);
    return acc;
  };
  const fbm = (x, y, z) => vn(x * 4, y * 4, z * 4) * 0.5 + vn(x * 9, y * 9, z * 9) * 0.3 + vn(x * 21, y * 21, z * 21) * 0.2;
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const X = (px + 0.5 - N / 2) / R, Y = (N / 2 - py - 0.5) / R, rho = Math.hypot(X, Y);
      if (rho > 1 + 1 / R) continue;
      const cov = L.clamp((1 - rho) * R + 0.5);
      const Z = Math.sqrt(Math.max(0, 1 - X * X - Y * Y));
      let nx = X, ny = Y, nz = Z;
      // albedo: highlands with mottling, darker maria with ragged edges
      const n1 = fbm(X + 3, Y + 7, Z);
      // maria: a merged (metaball) field of lobes with a noisy threshold, so neighbours flow into one another
      let F = 0;
      for (const m of mv) {
        const d = X * m.v[0] + Y * m.v[1] + Z * m.v[2];
        if (d < 0.5) continue;
        const ang = Math.acos(Math.min(1, d)) / DEG / (m.r * 1.1);
        if (ang < 2.2) F += Math.exp(-ang * ang * 1.6);
      }
      const mare = L.smoothstep(L.clamp((F + 0.4 * (n1 - 0.5) - 0.2) / 0.3));
      let alb = 0.68 + 0.14 * (n1 - 0.5) - 0.25 * mare * (0.75 + 0.5 * fbm(X * 2.5, Y * 2.5, Z * 2.5 + 5));
      // rays and bright crater halos
      for (const q of rv) {
        const d = X * q.v[0] + Y * q.v[1] + Z * q.v[2];
        const ang = Math.acos(Math.min(1, d)) / DEG;
        if (ang < q.r * 1.6) alb += 0.28 * q.k * (1 - ang / (q.r * 1.6));
        if (ang < 9 * q.k) alb += 0.06 * q.k * (1 - ang / (9 * q.k));   // soft ray halo
      }
      // craters: bowl normal perturbation + bright rim
      for (const q of cr) {
        const d = X * q.v[0] + Y * q.v[1] + Z * q.v[2];
        if (d < q.cr) continue;
        const ang = Math.acos(Math.min(1, d)), f = ang / q.rad;           // 0 centre .. 1 rim
        // direction away from the crater centre (tangent)
        let tx = X - q.v[0] * d, ty = Y - q.v[1] * d, tz = Z - q.v[2] * d; const tn = Math.hypot(tx, ty, tz) || 1;
        tx /= tn; ty /= tn; tz /= tn;
        const slope = (f < 0.85 ? -Math.sin(f / 0.85 * Math.PI / 2) * 0.55 : 0.5 * (1 - (f - 0.85) / 0.15)) * q.dep * (1 - 0.75 * mare);
        nx -= tx * slope; ny -= ty * slope; nz -= tz * slope;
        if (f > 0.8) alb += 0.05 * q.dep * (1 - 0.75 * mare);
      }
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      // small-scale relief from noise
      const e = 0.05;
      const h0 = fbm(X * 3, Y * 3, Z * 3);
      nx -= (fbm(X * 3 + e, Y * 3, Z * 3) - h0) / e * 0.05; ny -= (fbm(X * 3, Y * 3 + e, Z * 3) - h0) / e * 0.05;
      const ndl = nx * sx + ny * sy + nz * sz;
      const lit = L.clamp((ndl + 0.04) / 1.04);
      const sh = 0.06 + 1.0 * Math.pow(lit, 0.85);
      const v = 255 * L.clamp(alb * sh * 1.08, 0, 1);
      const o = (py * N + px) * 4;
      D[o] = v * 1.0; D[o + 1] = v * 0.985; D[o + 2] = v * 0.96; D[o + 3] = 255 * cov;
    }
  }
  g.putImageData(img, 0, 0);
  MOON_CV = { cv, N, R };
  return MOON_CV;
}

function drawMoon(c, v, a, draw) {
  const cx = v.wx(MOON_CMP.x), cy = v.wy(MOON_CMP.y), r = v.ws(MOON_CMP.d / 2);
  if (cx + r < -10 || cx - r > L.W + 10) return;
  // the whole lit body fades (and settles) in — no outline first
  const k = L.ease.outCubic(L.clamp(draw * 1.25));
  if (k <= 0) return;
  const tex = moonTexture();
  c.save();
  c.globalAlpha *= a * k;
  L.lightBlob(c, cx + SUN_DIR.x * r * 0.2, cy + SUN_DIR.y * r * 0.2, r * 1.25, [200, 205, 215], 0.07);
  const s = r / tex.R * (0.97 + 0.03 * k);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(tex.cv, cx - tex.N / 2 * s, cy - tex.N / 2 * s, tex.N * s, tex.N * s);
  c.restore();
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'Versus the Moon', sub: 'Moon: 3,474 km across' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: T_DRAW[0] + 0.05, name: 'riser', gain: 0.2, pitch: 0.9 },
      { t: T_LABEL + 0.05, name: 'impact', gain: 0.3, pitch: 0.8 },
      { t: T_HALF + 0.05, name: 'tick', gain: 0.28, pitch: 1.0 },
      { t: T_GHOST[0], name: 'swish', gain: 0.26, pitch: 1.1 },
      { t: T_GHOST[0] + T_GHOST[1] - 0.05, name: 'ping', gain: 0.24, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0 || v.t > v.d + 1) return;
    const a = fadeOut(v);
    if (a <= 0) return;
    drawMoon(ctx, v, a, L.prog(v.t, T_DRAW[0], T_DRAW[1]));
    const cx = v.wx(MOON_CMP.x), cy = v.wy(MOON_CMP.y), r = v.ws(MOON_CMP.d / 2);
    // half-way line, drawn top to bottom
    const hk = L.ease.inOutCubic(L.prog(v.t, T_HALF, 0.5));
    if (hk > 0) {
      ctx.save();
      ctx.globalAlpha *= a * leadFade(v);
      ctx.strokeStyle = 'rgba(215,222,235,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 9]);
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy - r + 2 * r * hk); ctx.stroke();
      ctx.restore();
    }
    // the ghost of the water ball glides into the Moon's left half
    const gk = L.prog(v.t, T_GHOST[0], T_GHOST[1]);
    if (gk > 0) {
      const e = L.ease.inOutCubic(gk);
      const gx = L.lerp(ALL.x, GX, e), gy = ALL.y - Math.sin(Math.PI * e) * 0.18e6;
      const sx = v.wx(gx), sy = v.wy(gy), gr = v.ws(ALL.d / 2);
      const settle = 1 + 0.05 * Math.sin(L.prog(v.t, T_GHOST[0] + T_GHOST[1], 0.6) * Math.PI * 2) * (1 - L.prog(v.t, T_GHOST[0] + T_GHOST[1], 0.6));
      ctx.save();
      ctx.globalAlpha *= a * leadFade(v) * L.clamp(gk * 4);
      L.lightBlob(ctx, sx, sy, gr * 1.4, v.accent, 0.12);
      ctx.fillStyle = L.rgba(v.accent, 0.1 + 0.08 * L.clamp((gk - 0.8) * 5));
      ctx.strokeStyle = L.rgba(v.accent, 0.95);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -v.t * 20;
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, gr * settle), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },

  drawOverlay(ctx, v) {
    const k = L.enter(v.t, T_LABEL, 0.55) * v.k;
    if (k > 0) {
      // soft dark backing so the label reads cleanly over Earth's bright limb
      ctx.save();
      ctx.globalAlpha = L.clamp(k);
      ctx.translate(L.W / 2, 440);
      ctx.scale(1, 230 / 520);
      L.lightBlob(ctx, 0, 0, 400, [2, 4, 10], 0.85);
      ctx.restore();
    }
    L.bigLabel(ctx, { x: L.W / 2, y: 470, big: '< ½ the Moon', small: 'Moon 3,474 km · water 1,385 km', k, accent: v.accent, align: 'center' });
  },
};
