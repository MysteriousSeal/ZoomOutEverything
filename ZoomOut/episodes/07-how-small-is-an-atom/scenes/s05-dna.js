// Beat 5 — "Inside your cells, DNA is a strand just two nanometers wide."
// A glowing B-DNA double helix (2 nm wide, 10.5 base pairs per turn) meanders past the virus. It is already a faint
// thread in beat 4; the camera dives onto it, it brightens, a light sweep runs along it and a 2 nm bracket draws in.
//
// This file also owns the strand for the WHOLE film (beats 4–12): the same geometry resolves into space-filling
// atoms when zoomed in (beat 6), keeps one "hero" atom exactly at P.atom (beats 6–11), and dims its neighbours /
// hands the hero over to s08's empty-atom haze. s06/s07/s08 import the helpers exported here.
import * as L from '../../../../engine/runtime/lib.js';
import { P } from '../camera.js';

const { W, H } = L;
const NM = 1e-9;

// ------------------------------------------------------------------ geometry (metres)
export const R_HELIX = 1.0 * NM;            // radius: the strand is 2 nm wide
const R_BB = 0.9 * NM;                      // backbone tube centre radius
const RISE = 0.34 * NM;                     // axial rise per base pair
const OMEGA = (Math.PI * 2) / (10.5 * RISE); // twist (rad per metre)
const DELTA = 2.45;                         // angular gap between the two backbones (minor groove)
const HALF = 2.6e-6;                        // strand half-length
const TH = Math.PI - 1.32;                  // heading (rad): steep diagonal, top-right → bottom-left (clear of the chapter card)
const T0 = [Math.cos(TH), Math.sin(TH)], N0 = [-Math.sin(TH), Math.cos(TH)];
// gentle meander (zero slope at s = 0 so the strand is straight around P.dna / P.atom)
const A1 = 60e-9, LAM1 = 380e-9, A2 = 22e-9, LAM2 = 150e-9;
const bend = (s) => A1 * (Math.cos(s / LAM1) - 1) + A2 * (Math.cos(s / LAM2) - 1);
const bendD = (s) => -(A1 / LAM1) * Math.sin(s / LAM1) - (A2 / LAM2) * Math.sin(s / LAM2);

/** Centreline point at arc parameter s (metres from P.dna). */
export function center(s) {
  const n = bend(s);
  return [P.dna.x + T0[0] * s + N0[0] * n, P.dna.y + T0[1] * s + N0[1] * n];
}
/** Unit tangent and normal at s: [tx, ty, nx, ny]. */
export function frameAt(s) {
  const d = bendD(s);
  let tx = T0[0] + N0[0] * d, ty = T0[1] + N0[1] * d;
  const l = Math.hypot(tx, ty);
  tx /= l; ty /= l;
  return [tx, ty, -ty, tx];
}

// the hero atom (outer phosphate oxygen of base pair 0, strand 0) sits exactly at P.atom while the helix is locked
const HERO_R = 0.98 * NM;
const S_A = (P.atom.x - P.dna.x) * T0[0] + (P.atom.y - P.dna.y) * T0[1];
const N_A = (P.atom.x - P.dna.x) * N0[0] + (P.atom.y - P.dna.y) * N0[1];
const ANG_A = Math.asin(N_A / HERO_R);      // front-facing (cos > 0)
export const ATOM_R = 0.07 * NM;            // drawn radius of the hero atom (≈ 0.14 nm across)

// ------------------------------------------------------------------ film-wide state (functions of global time)
const ST = (v, b) => v.tl.scenes[b].start;
/** Helix spin: turns slowly, decelerates to a lock before the atom close-up, resumes during the final pull-out. */
export function spin(v) {
  const g = v.gt, a = ST(v, 5) + 1.0, b = ST(v, 6) + 0.8, OM = 0.5;
  let o;
  if (g < a) o = -OM * (a - g) - OM * (b - a) * 0.5;
  else if (g < b) { const u = (g - a) / (b - a); o = -OM * (b - a) * (0.5 - (u - u ** 3 + u ** 4 / 2)); }
  else o = 0;
  const c = ST(v, 12) + 0.6;
  if (g > c) { const x = g - c; o += OM * (x < 1 ? x * x / 2 : x - 0.5); }
  return o;
}
/** Strand brightness: a faint thread in beat 4, fully lit from beat 5. */
export const presence = (v) => 0.25 + 0.75 * L.ease.inOutCubic(L.prog(v.gt, ST(v, 5) + 0.25, 1.4));
/** Hero highlight (beat 6 "And an atom?"). */
export const heroLit = (v) => L.ease.outCubic(L.prog(v.gt, ST(v, 6) + 0.7, 0.5)) * (1 - L.ease.inOutCubic(L.prog(v.gt, ST(v, 12), 0.8)));
/** Neighbour visibility: dimmed for the label (beat 6), almost gone for the empty atom (beat 8+). */
export function neighbours(v) {
  let d = 1 - 0.4 * L.ease.inOutCubic(L.prog(v.gt, ST(v, 6) + 0.9, 0.7));
  d = L.lerp(d, 0.05, L.ease.inOutCubic(L.prog(v.gt, ST(v, 8) + 2.0, 1.1)));
  return L.lerp(d, 1, L.ease.inOutCubic(L.prog(v.gt, ST(v, 12), 1.0)));
}
/** 0 = solid hero sphere … 1 = an empty electron haze with a nucleus point (s08). */
export const emptiness = (v) => L.ease.inOutCubic(L.prog(v.gt, ST(v, 8) + 2.3, 1.3)) * (1 - L.ease.inOutCubic(L.prog(v.gt, ST(v, 12) + 0.15, 0.8)));
/** Visibility of s08's haze + nucleus: hands over to s09's stadium morph (beats 9–11) and comes back for its fold. */
export const hazeVis = (v) => L.clamp(1 - L.ease.inOutCubic(L.prog(v.gt, ST(v, 9) + 0.05, 0.7)) + L.ease.inOutCubic(L.prog(v.gt, ST(v, 12) - 0.35, 0.5)));
/** Hero centre in screen space and its radius in px. */
export const heroScreen = (v) => ({ x: v.wx(P.atom.x), y: v.wy(P.atom.y), r: v.ws(ATOM_R) });

// ------------------------------------------------------------------ palette
const BB = [130, 205, 255];                 // backbone: ice blue
const BB2 = [150, 175, 255];                // second backbone: periwinkle
const BASES = [[255, 150, 120], [255, 205, 120], [180, 140, 255], [105, 220, 255]];  // A T G C
const PAIR = [1, 0, 3, 2];
const DEEP = [6, 14, 22];
const seqAt = (i) => { const h = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return Math.floor((h - Math.floor(h)) * 4); };
// atom colours per part (element modulates lightness)
export const C_O = [175, 220, 255]; const C_P = [255, 200, 120], C_SUGAR = [110, 160, 235], C_HERO = [190, 255, 232];

// atom templates: [colourKey, r (nm), dA (rad), dz (nm), size (nm)]; dz/dA mirror for the antiparallel strand
const BACKBONE = [
  ['O', 0.98, 0.0, 0.0, 0.07],              // [0] hero candidate (outer phosphate oxygen)
  ['P', 0.87, 0.05, 0.06, 0.09],
  ['O', 0.95, -0.16, 0.1, 0.072],
  ['O', 0.83, 0.18, -0.06, 0.072],
  ['O', 0.8, -0.08, 0.18, 0.072],
  ['S', 0.8, 0.31, 0.11, 0.075],
  ['S', 0.72, 0.43, 0.03, 0.075],
  ['SO', 0.64, 0.5, 0.13, 0.072],
  ['S', 0.7, 0.55, -0.04, 0.075],
  ['S', 0.79, 0.41, -0.13, 0.075],
  ['S', 0.62, 0.64, 0.02, 0.075],
];
const BASE_F = [0.12, 0.25, 0.38];
const colourOf = (key, base) => key === 'O' ? C_O : key === 'P' ? C_P : key === 'S' ? C_SUGAR : key === 'SO' ? L.mix(C_SUGAR, C_O, 0.6)
  : key === 'N' ? L.mix(BASES[base], [255, 255, 255], 0.28) : BASES[base];

// ------------------------------------------------------------------ sprites (lazy: no DOM at import time)
const SPR = new Map();
const SS = 96, SR = 33;                      // sprite canvas size, sphere radius inside it (ratio is size-independent)
function sprite(col, lev, hi = false) {
  const key = `${col.join(',')}|${lev}|${hi}`;
  let s = SPR.get(key);
  if (s) return s;
  const S = hi ? 288 : SS;
  s = new OffscreenCanvas(S, S);
  const x = s.getContext('2d'), m = S / 2;
  x.scale(S / SS, S / SS);
  const mm = SS / 2;
  const cc = L.mix(col, DEEP, lev * 0.22);
  let g = x.createRadialGradient(mm, mm, SR * 0.8, mm, mm, mm);          // soft electron-cloud halo
  g.addColorStop(0, L.rgba(cc, 0.3));
  g.addColorStop(1, L.rgba(cc, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, SS, SS);
  void m;
  g = x.createRadialGradient(mm - SR * 0.36, mm - SR * 0.42, 1, mm, mm, SR);
  g.addColorStop(0, L.rgba(L.mix(cc, [255, 255, 255], 0.7 - lev * 0.12)));
  g.addColorStop(0.28, L.rgba(L.mix(cc, [255, 255, 255], 0.18)));
  g.addColorStop(0.72, L.rgba(L.mix(cc, [0, 0, 0], 0.42)));
  g.addColorStop(0.94, L.rgba(L.mix(cc, [0, 0, 0], 0.62), 0.95));
  g.addColorStop(1, L.rgba(L.mix(cc, [0, 0, 0], 0.62), 0));
  x.fillStyle = g;
  x.beginPath(); x.arc(mm, mm, SR, 0, Math.PI * 2); x.fill();
  // cool back-rim on the lower right: separates touching spheres
  x.globalCompositeOperation = 'lighter';
  const rg = x.createRadialGradient(mm + SR * 0.55, mm + SR * 0.6, 0, mm + SR * 0.55, mm + SR * 0.6, SR * 0.7);
  rg.addColorStop(0, L.rgba(L.mix(cc, [200, 240, 255], 0.5), 0.35 * (1 - lev * 0.2)));
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = rg;
  x.beginPath(); x.arc(mm, mm, SR, 0, Math.PI * 2); x.fill();
  SPR.set(key, s);
  return s;
}
/** Shaded atom sprite (for s07's loupe). */
export const atomSprite = (col, lev = 0, hi = false) => sprite(col, lev, hi);
export const ATOM_SPRITE_SCALE = SS / SR;
let LAYER = null;
const layerCtx = () => {
  if (!LAYER) LAYER = new OffscreenCanvas(W, H);
  const c = LAYER.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  return c;
};

// ------------------------------------------------------------------ helpers
/** Range of s whose centreline point can be on screen (exact: C(s)·T0 = s). */
function visibleS(v, padPx) {
  const m = v.cam.mpp, pad = padPx * m;
  const xs = [-pad - W / 2, W / 2 + pad].map((d) => v.cam.x + d * m);
  const a = H * (v.cam.anchor ?? 0.5);
  const ys = [-pad - a, H - a + pad].map((d) => v.cam.y + d * m);
  let lo = Infinity, hi = -Infinity;
  for (const x of xs) for (const y of ys) {
    const s = (x - P.dna.x) * T0[0] + (y - P.dna.y) * T0[1];
    lo = Math.min(lo, s); hi = Math.max(hi, s);
  }
  return [Math.max(-HALF, lo), Math.min(HALF, hi)];
}
const endTaper = (s) => L.smoothstep(L.clamp((HALF - Math.abs(s)) / 0.9e-6));

// ------------------------------------------------------------------ thread (far LOD)
function drawThread(ctx, v, s0, s1, alpha) {
  const m = v.cam.mpp, w = (2 * R_HELIX) / m;
  const ds = Math.max(RISE, 3 * m);
  const n = Math.ceil((s1 - s0) / ds);
  if (n <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const CH = 24;
  for (let k0 = 0; k0 < n; k0 += CH) {
    const sm = s0 + (k0 + CH / 2) * ds;
    const a = alpha * endTaper(sm);
    if (a <= 0.003) continue;
    ctx.beginPath();
    for (let k = k0; k <= Math.min(n, k0 + CH); k++) {
      const [x, y] = center(Math.min(s1, s0 + k * ds));
      k === k0 ? ctx.moveTo(v.wx(x), v.wy(y)) : ctx.lineTo(v.wx(x), v.wy(y));
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = L.rgba([70, 160, 255], 0.13 * a);
    ctx.lineWidth = w * 3 + 7;
    ctx.stroke();
    ctx.strokeStyle = L.rgba(L.mix(BB, [255, 255, 255], 0.35), 0.85 * a);
    ctx.lineWidth = Math.max(1, w * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ ribbon helix (mid LOD)
const NB = 6;
function drawHelix(ctx, v, s0, s1, alpha, sweepAt) {
  const m = v.cam.mpp;
  const ds = Math.max(RISE / 4, 2.5 * m);
  const n = Math.ceil((s1 - s0) / ds);
  if (n <= 0 || n > 6000) return;
  const sp = spin(v);
  const bins = [[], []].map(() => Array.from({ length: NB }, () => new Path2D()));
  const rungs = new Map();
  const front = [];                                       // front segments for the light sweep
  let prev = null;
  for (let k = 0; k <= n; k++) {
    const s = Math.min(s1, s0 + k * ds);
    const [cx, cy] = center(s), [, , nx, ny] = frameAt(s);
    const a = OMEGA * (s - S_A) + ANG_A + sp;
    const cur = [];
    for (let j = 0; j < 2; j++) {
      const ang = a + j * DELTA, lat = R_BB * Math.sin(ang);
      cur.push([v.wx(cx + nx * lat), v.wy(cy + ny * lat), Math.cos(ang)]);
    }
    if (prev) for (let j = 0; j < 2; j++) {
      const d = (cur[j][2] + prev[j][2]) / 2;
      const b = Math.min(NB - 1, Math.floor(((d + 1) / 2) * NB));
      bins[j][b].moveTo(prev[j][0], prev[j][1]);
      bins[j][b].lineTo(cur[j][0], cur[j][1]);
      if (sweepAt != null && d > 0.1) front.push([prev[j][0], prev[j][1], cur[j][0], cur[j][1], s, d]);
    }
    prev = cur;
  }
  // base-pair rungs (one per base pair), split in two coloured halves with a hairline gap
  const rungPx = RISE / m;
  if (rungPx > 2.5) {
    const i0 = Math.ceil((s0 - S_A) / RISE), i1 = Math.floor((s1 - S_A) / RISE);
    for (let i = i0; i <= i1; i++) {
      const s = S_A + i * RISE;
      const [cx, cy] = center(s), [, , nx, ny] = frameAt(s);
      const a = OMEGA * (s - S_A) + ANG_A + sp, b = seqAt(i);
      const r = R_BB * 0.82;
      const p = [a, a + DELTA].map((ang) => [r * Math.sin(ang), r * Math.cos(ang)]);
      for (let j = 0; j < 2; j++) {
        const q = p[j], o = p[1 - j];
        const e = [L.lerp(q[0], o[0], 0.47), L.lerp(q[1], o[1], 0.47)];
        const d = (q[1] + e[1]) / 2 / r;
        const bin = Math.min(NB - 1, Math.floor(((d + 1) / 2) * NB));
        const key = `${j ? PAIR[b] : b}|${bin}`;
        let path = rungs.get(key);
        if (!path) rungs.set(key, (path = new Path2D()));
        path.moveTo(v.wx(cx + nx * q[0]), v.wy(cy + ny * q[0]));
        path.lineTo(v.wx(cx + nx * e[0]), v.wy(cy + ny * e[0]));
      }
    }
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  // soft volumetric glow along the axis (blurred, so it has no hard edges)
  ctx.globalCompositeOperation = 'lighter';
  const glow = new Path2D();
  const gds = Math.max(ds * 4, 6 * m);
  for (let s = s0; s <= s1 + gds; s += gds) { const [x, y] = center(Math.min(s, s1)); s === s0 ? glow.moveTo(v.wx(x), v.wy(y)) : glow.lineTo(v.wx(x), v.wy(y)); }
  const gw = (2 * R_HELIX) / m;
  // only the shadow is visible (path drawn far off-canvas, shadow offset back): a soft, edgeless glow
  ctx.save();
  ctx.translate(-20000, 0);
  ctx.shadowOffsetX = 20000;
  ctx.shadowColor = L.rgba([60, 150, 255], 0.16);
  ctx.shadowBlur = Math.min(140, gw * 1.6);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = gw * 1.3;
  ctx.stroke(glow);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';
  const wBB = Math.max(1.2, (0.42 * NM) / m), wR = Math.max(1, (0.15 * NM) / m);
  for (let b = 0; b < NB; b++) {
    const lit = b / (NB - 1);                       // 0 back … 1 front
    const fog = L.lerp(0.28, 1, lit);
    for (const [key, path] of rungs) {
      const [bc, bb] = key.split('|').map(Number);
      if (bb !== b) continue;
      ctx.strokeStyle = L.rgba(L.mix(DEEP, BASES[bc], fog * 0.9));
      ctx.lineWidth = wR;
      ctx.stroke(path);
    }
    for (let j = 0; j < 2; j++) {
      ctx.strokeStyle = L.rgba(L.mix(DEEP, j ? BB2 : BB, fog));
      ctx.lineWidth = wBB;
      ctx.stroke(bins[j][b]);
      if (lit > 0.5) {                              // specular core: reads as a lit tube
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = L.rgba([235, 248, 255], 0.22 * (lit - 0.5) * 2);
        ctx.lineWidth = wBB * 0.34;
        ctx.stroke(bins[j][b]);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  // light sweep travelling along the strand (beat 5 reveal)
  if (sweepAt != null && front.length) {
    ctx.globalCompositeOperation = 'lighter';
    const band = 9 * NM;
    for (const [x0, y0, x1, y1, s, d] of front) {
      const f = Math.exp(-(((s - sweepAt) / band) ** 2));
      if (f < 0.03) continue;
      ctx.strokeStyle = L.rgba([200, 245, 255], 0.55 * f * d);
      ctx.lineWidth = wBB * 0.9;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ space-filling atoms (near LOD)
function drawAtoms(ctx, v, s0, s1, alpha) {
  const m = v.cam.mpp;
  const i0 = Math.ceil((s0 - S_A) / RISE) - 1, i1 = Math.floor((s1 - S_A) / RISE) + 1;
  if (i1 - i0 > 260) return;
  const sp = spin(v);
  const list = [];
  let hero = null;
  const padPx = 60;
  for (let i = i0; i <= i1; i++) {
    const s = S_A + i * RISE;
    const [cx, cy] = center(s), [tx, ty, nx, ny] = frameAt(s);
    const a = OMEGA * (s - S_A) + ANG_A + sp, b = seqAt(i);
    for (let j = 0; j < 2; j++) {
      const g = j ? -1 : 1, Aj = a + j * DELTA, base = j ? PAIR[b] : b;
      const push = (col, r, ang, dz, size, id, isHero) => {
        const lat = r * Math.sin(ang), dep = r * Math.cos(ang);
        let wx = cx + tx * dz + nx * lat, wy = cy + ty * dz + ny * lat;
        if (!isHero) {                                   // thermal jiggle (tiny, secondary motion)
          wx += L.noise1(v.gt * 0.9 + id * 0.37, 3) * 0.006 * NM;
          wy += L.noise1(v.gt * 0.8 + id * 0.53, 5) * 0.006 * NM;
        }
        const x = v.wx(wx), y = v.wy(wy), rp = (size * NM) / m;
        if (x < -padPx - rp || x > W + padPx + rp || y < -padPx - rp || y > H + padPx + rp) return;
        const o = { x, y, rp, dep, col, hero: isHero };
        if (isHero) hero = o; else list.push(o);
      };
      BACKBONE.forEach(([key, r, dA, dz, size], t) =>
        push(colourOf(key, base), r * NM, Aj + g * dA, g * dz * NM, size, i * 97 + j * 31 + t, i === 0 && j === 0 && t === 0));
      // base: from this strand's C1' toward the partner's
      const own = Aj + g * 0.64, oth = a + (j ? 0 : DELTA) - g * 0.64;
      const p = [0.62 * Math.sin(own), 0.62 * Math.cos(own)], q = [0.62 * Math.sin(oth), 0.62 * Math.cos(oth)];
      BASE_F.forEach((f, t) => {
        for (const row of [-1, 1]) {
          const lat = L.lerp(p[0], q[0], f) * NM, dep = L.lerp(p[1], q[1], f) * NM;
          const ang = Math.atan2(lat, dep), r = Math.hypot(lat, dep);
          push(colourOf(t === 1 && row > 0 ? 'N' : 'B', base), r, ang, row * 0.068 * NM, 0.074, i * 97 + j * 31 + 20 + t * 2 + (row > 0), false);
        }
      });
    }
  }
  list.sort((p, q) => p.dep - q.dep);
  const dim = neighbours(v);
  const tgt = dim * alpha < 0.999 ? layerCtx() : ctx;
  for (const o of list) {
    const lev = Math.min(3, Math.floor((1 - (o.dep / (R_HELIX) + 1) / 2) * 4));   // 0 front … 3 back
    const sz = (o.rp * SS) / SR;
    tgt.drawImage(sprite(o.col, Math.max(0, lev), o.rp > 40), o.x - sz / 2, o.y - sz / 2, sz, sz);
  }
  ctx.save();
  if (tgt !== ctx) { ctx.globalAlpha *= alpha * dim; ctx.drawImage(LAYER, 0, 0); ctx.globalAlpha = 1; }
  ctx.restore();
  if (hero) drawHero(ctx, v, hero, alpha);
}

function drawHero(ctx, v, o, alpha) {
  const lit = heroLit(v), E = emptiness(v);
  const solid = alpha * (1 - E);
  const sz = (o.rp * SS) / SR;
  ctx.save();
  if (solid > 0.002) {
    ctx.globalAlpha = solid;
    ctx.drawImage(sprite(C_O, 0, o.rp > 40), o.x - sz / 2, o.y - sz / 2, sz, sz);
    if (lit > 0) {
      ctx.globalAlpha = solid * lit;
      ctx.drawImage(sprite(C_HERO, 0, o.rp > 40), o.x - sz / 2, o.y - sz / 2, sz, sz);
    }
  }
  if (lit > 0 && alpha > 0) {
    const k = lit * alpha * (1 - E * 0.85);
    ctx.globalAlpha = 1;
    L.lightBlob(ctx, o.x, o.y, Math.max(0, o.rp * 2.6), v.accent, 0.22 * k);
    ctx.strokeStyle = L.rgba(v.accent, 0.85 * k * (1 - E));
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(o.x, o.y, Math.max(0, o.rp * 1.06), 0, Math.PI * 2); ctx.stroke();
    // one expanding "ping" ring as it lights up
    const pt = v.gt - (v.tl.scenes[6].start + 0.7);
    if (pt > 0 && pt < 1.1) {
      const u = pt / 1.1;
      ctx.strokeStyle = L.rgba(v.accent, 0.6 * (1 - u) ** 2 * alpha);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(o.x, o.y, Math.max(0, o.rp * (1.1 + 1.4 * L.ease.outCubic(u))), 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ the whole strand at any zoom
function drawStrand(ctx, v) {
  const m = v.cam.mpp, w = (2 * R_HELIX) / m;
  if (w < 0.45) return;                                   // sub-pixel: leave the frame clean
  const pres = presence(v);
  const fadeIn = L.clamp((w - 0.45) / 0.8);
  const [s0, s1] = visibleS(v, 80);
  if (s1 <= s0) return;
  const rA = (0.075 * NM) / m;                           // atom radius in px
  const helixK = L.smoothstep(L.clamp((w - 5) / 10));
  const atomK = L.smoothstep(L.clamp((rA - 2.5) / 4.5));
  const ribbonK = helixK * (1 - L.smoothstep(L.clamp((rA - 5) / 6)));
  if (helixK < 1) drawThread(ctx, v, s0, s1, pres * fadeIn * (1 - helixK));
  // beat-5 light sweep along the strand, top to bottom of the frame
  const st = v.gt - (v.tl.scenes[5].start + 1.5);
  const sweepAt = st > 0 && st < 1.9 ? L.lerp(s0, s1, L.ease.inOutCubic(st / 1.9)) : null;
  if (ribbonK > 0.003) drawHelix(ctx, v, s0, s1, pres * ribbonK, sweepAt);
  if (atomK > 0.003) drawAtoms(ctx, v, s0, s1, atomK);
}

// ------------------------------------------------------------------ caption band shade
/** While the bright ribbon helix is on screen, sink it behind the caption band (y 1280–1390). */
function captionShade(ctx, v) {
  const m = v.cam.mpp, w = (2 * R_HELIX) / m, rA = (0.075 * NM) / m;
  const k = presence(v) * L.smoothstep(L.clamp((w - 5) / 10)) * (1 - L.smoothstep(L.clamp((rA - 5) / 6)));
  if (k < 0.01) return;
  // long, eased ramps so the band itself never reads as a stripe across the background
  const y0 = 1110, y1 = 1560, g = ctx.createLinearGradient(0, y0, 0, y1);
  const a = 0.6 * k;
  for (const [s, f] of [[0, 0], [0.1, 0.08], [0.2, 0.3], [0.3, 0.75], [0.38, 1], [0.62, 1], [0.72, 0.75], [0.82, 0.3], [0.91, 0.08], [1, 0]]) {
    g.addColorStop(s, `rgba(3,9,12,${(a * f).toFixed(3)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, y1 - y0);
}

// ------------------------------------------------------------------ 2 nm bracket (beat 5 overlay)
const S_BR = -6.2 * NM;                                   // bracket sits a little up the strand, near the label
function bracket(ctx, v, k) {
  if (k <= 0) return;
  const [cx, cy] = center(S_BR), [tx, ty, nx, ny] = frameAt(S_BR);
  const x = v.wx(cx), y = v.wy(cy), half = v.ws(R_HELIX);
  const e = L.ease.outCubic(L.clamp(k * 1.25));
  const g = L.ease.inOutCubic(L.prog(k, 0.25, 0.75));    // guide lines extend after the bar
  const ax = x - nx * half, ay = y - ny * half, bx = x + nx * half, by = y + ny * half;
  const tl = 13, gl = 150 * g;
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 2.5);
  ctx.lineCap = 'round';
  // edge guides: two hairlines tangent to the helix edges, fading away from the bar
  for (const [px, py] of [[ax, ay], [bx, by]]) {
    if (gl < 1) continue;
    for (const sgn of [-1, 1]) {
      const gr = ctx.createLinearGradient(px, py, px + tx * gl * sgn, py + ty * gl * sgn);
      gr.addColorStop(0, L.rgba(v.accent, 0.7));
      gr.addColorStop(1, L.rgba(v.accent, 0));
      ctx.strokeStyle = gr;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + tx * gl * sgn, py + ty * gl * sgn); ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  const m0x = L.lerp(x, ax, e), m0y = L.lerp(y, ay, e), m1x = L.lerp(x, bx, e), m1y = L.lerp(y, by, e);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(m0x, m0y); ctx.lineTo(m1x, m1y);
    if (e > 0.98) {
      ctx.moveTo(ax - tx * tl, ay - ty * tl); ctx.lineTo(ax + tx * tl, ay + ty * tl);
      ctx.moveTo(bx - tx * tl, by - ty * tl); ctx.lineTo(bx + tx * tl, by + ty * tl);
    }
  };
  ctx.strokeStyle = 'rgba(0,8,12,0.6)';
  ctx.lineWidth = 8;
  path(); ctx.stroke();
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.25));
  ctx.lineWidth = 3.5;
  path(); ctx.stroke();
  ctx.restore();
}

const T_BRACKET = 2.65, T_LABEL = 2.8;
export default {
  beat: 5,
  chapter: { num: '05', title: 'DNA', sub: 'The double helix' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: 0.12, name: 'dive', gain: 0.26, pitch: 1.1 },
      { t: 1.45, name: 'shimmer', gain: 0.18, pitch: 1.15 },
      { t: T_BRACKET, name: 'tick', gain: 0.22, pitch: 1.1 },
      { t: T_LABEL + 0.05, name: 'blip', gain: 0.2, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    drawStrand(ctx, v);
    captionShade(ctx, v);
  },
  drawOverlay(ctx, v) {
    const out = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.35, 0.3));   // gone before the dive into the atom
    bracket(ctx, v, Math.min(v.k, L.prog(v.t, T_BRACKET, 0.5)) * out);
    const k = Math.min(v.k, L.prog(v.t, T_LABEL, 0.5)) * out;
    L.bigLabel(ctx, { x: 110, y: 570, big: '2 nm', small: 'the DNA double helix', k, accent: v.accent });
  },
};
export { C_HERO };
