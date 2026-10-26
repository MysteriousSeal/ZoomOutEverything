// Beat 3 — "A billion dollars? … Ten pallets. Ten tonnes of cash."
// Nine shrink-wrapped $100M pallets slide in along their rows next to the beat-2 pallet (which s2 owns,
// at the origin) to form a 5 × 2 grid, pitch 1.3 × 1.15 m. Each one lands on a tick with an inertia lean
// in its load, a dust puff and an accent flash; the counter above climbs $100M per pallet. The last pallet
// lands as the narrator says "Ten pallets": a floor glow and a sheen sweep mark the finished $1B block.
// The pallet renderer (drawPallet, LOD by v.cam.mpp) is exported so s4 can tile the same block outward.
import * as L from '../../../../engine/runtime/lib.js';
import { isoPt } from '../env.js';
import * as S5 from './s5-trillion.js';
import { drawScaleHuman, HANDOFF } from './s2-pallet.js';

const { ease, clamp, lerp, prog, rgba, mix } = L;

// ------------------------------------------------------------------ geometry (metres)
export const PAL = { w: 1.2, d: 1.0, base: 0.144, h: 1.15 };   // footprint, wooden base height, total height
export const PITCH = { x: 1.3, z: 1.15 };
export const BLOCK = { w: 4 * PITCH.x + PAL.w, d: PITCH.z + PAL.d };   // 6.4 × 2.15 m ($1B footprint)

// ------------------------------------------------------------------ beat-4 squeeze onto the trillion grid
// At the start of beat 4 the ten pallets close ranks onto s5's grid (pitch 1.1 × 1.0, pallets 1.0 × 0.9),
// so s4 can tile the block outward and s5 can carry on, all on ONE grid. (Mirrors s5's NX/PX/PW…, kept as
// literals: no top-level dependence on other scene modules, so import cycles stay safe.)
export const GRID = { x: 1.1, z: 1.0, w: 1.0, d: 0.9 };
export const SQ = { t: 0.05, d: 0.42 };                               // beat-4 relative
/** Squeeze progress 0..1 (eased) at the view's global time. */
export function squeezeK(v) {
  const sc = v.tl.scenes[4];
  return sc ? ease.inOutCubic(prog(v.gt - sc.start, SQ.t, SQ.d)) : 0;
}
/** Pallet pitch + footprint for squeeze progress k (0 = beat-3 layout, 1 = trillion grid). */
export function layoutAt(k) {
  return { px: lerp(PITCH.x, GRID.x, k), pz: lerp(PITCH.z, GRID.z, k), w: lerp(PAL.w, GRID.w, k), d: lerp(PAL.d, GRID.d, k) };
}

// slot order: back row (z = 0) left→right, then front row. Slot (0, 0) is s2's pallet.
const SLOTS = [];
for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) if (r || c) SLOTS.push({ x: c * PITCH.x, z: r * PITCH.z, r, c });

// ------------------------------------------------------------------ timing (seconds from beat start)
const T0 = 0.1, GAP = 0.13, SLIDE = 0.85, DIST = 6.5;
const landT = (i) => T0 + i * GAP + SLIDE;
export const DONE = landT(SLOTS.length - 1);                  // ≈ 1.99 s: "Ten pallets" (phrase at 1.90)

// ------------------------------------------------------------------ palette
export const WOOD = [158, 126, 88];
export const WOOD_DK = [34, 27, 20];
export const EDGE = [204, 210, 193];       // paper-edge stack seen from the side (s0: [214, 219, 202])
export const BILL = [138, 156, 132];       // note face (top), a shade under s0's PAPER so the tops read under the sheen
const BAND = [196, 160, 78];        // $10k strap (mustard, as s0)
const ACC = [110, 220, 140];

const quad = (ctx, pts, fill) => {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
};
const seg = (ctx, a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };

/** Plain iso box with face shading (top, +z face, +x face). */
function box(ctx, P, x, y, z, w, h, d, c, a = 1) {
  quad(ctx, [P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x, y + h, z + d)], rgba(mix(c, [255, 255, 255], 0.16), a));
  quad(ctx, [P(x, y, z + d), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x, y + h, z + d)], rgba(c, a));
  quad(ctx, [P(x + w, y, z), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x + w, y + h, z)], rgba(mix(c, [0, 0, 0], 0.34), a));
}

/** Soft contact shadow under a footprint (two layers, light from the top-left). lift = height above the floor. */
export function contactShadow(ctx, v, x, z, w, d, lift = 0, a = 1) {
  const k = a / (1 + lift * 1.6);
  if (k <= 0.01) return;
  const P = (p, r) => isoPt(v, p, 0, r);
  const m = 0.12 + lift * 0.25;
  quad(ctx, [P(x - m, z - m), P(x + w + m + 0.35, z - m), P(x + w + m + 0.35, z + d + m + 0.12), P(x - m, z + d + m + 0.12)], `rgba(0,0,0,${0.16 * k})`);
  quad(ctx, [P(x - 0.03, z - 0.03), P(x + w + 0.1, z - 0.03), P(x + w + 0.1, z + d + 0.05), P(x - 0.03, z + d + 0.05)], `rgba(0,0,0,${0.32 * k})`);
}

/**
 * One $100M pallet with its corner at (x, y, z). LOD by pixels per metre.
 * o.sh: load shear at the top (m along x, inertia lean) · o.flash: 0..1 accent edge flash · o.a: alpha
 */
export function drawPallet(ctx, v, x, y, z, o = {}) {
  const s = 1 / v.cam.mpp;                       // px per metre
  const a = o.a ?? 1, sh = o.sh ?? 0, flash = o.flash ?? 0, hs = o.hs ?? 1;
  const PW = o.w ?? PAL.w, PD = o.d ?? PAL.d;     // footprint (s4/s5 grid uses 1.0 × 0.9)
  if (hs <= 0.002) return;
  const P = hs === 1 ? (p, q, r) => isoPt(v, p, q, r) : (p, q, r) => isoPt(v, p, y + (q - y) * hs, r);
  const B = y + PAL.base, Hh = y + PAL.h;

  // ---- far: one box (+ base strip)
  if (s < 14) {
    box(ctx, P, x, y, z, PW, PAL.h, PD, EDGE, a);
    if (s > 5) box(ctx, P, x, y, z, PW, PAL.base, PD, mix(WOOD, WOOD_DK, 0.35), a);
    if (flash > 0) topEdge(ctx, v, x, y + PAL.h * hs, z, PW, PD, 0, ACC, 0.9 * flash * a, 1.5);
    return;
  }

  // ---- wooden base
  if (s < 45) {
    box(ctx, P, x, y, z, PW, PAL.base, PD, mix(WOOD, WOOD_DK, 0.25), a);
  } else {
    box(ctx, P, x + 0.02, y, z + 0.02, PW - 0.04, PAL.base - 0.03, PD - 0.04, WOOD_DK, a);   // shadowed core
    const fx = [0, 0.5275, 1.055].map((q) => q * (PW / 1.2)), fz = [0, 0.4275, 0.855].map((q) => q * PD);
    for (const zz of fz) {
      box(ctx, P, x, y, z + zz, PW, 0.022, 0.145, mix(WOOD, WOOD_DK, 0.15), a);                   // bottom board
      for (const xx of fx) box(ctx, P, x + xx, y + 0.022, z + zz, 0.145, 0.1, 0.145, mix(WOOD, [255, 236, 200], 0.06), a);
    }
    // deck: boards run along z; their ends make a dashed strip on the +z face
    box(ctx, P, x, y + 0.122, z, PW, 0.022, PD, WOOD, a);
    if (s > 70) {
      ctx.beginPath();
      for (let i = 1; i < 7; i++) {
        const xx = x + (PW * i) / 7;
        seg(ctx, P(xx, y + 0.122, z + PD), P(xx, y + 0.144, z + PD));
      }
      ctx.strokeStyle = rgba(WOOD_DK, 0.8 * a);
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.stroke();
    }
  }

  // ---- the load (sheared box)
  const x0 = x + 0.01, z0 = z + 0.01, w = PW - 0.02, d = PD - 0.02;
  const top = [P(x0 + sh, Hh, z0), P(x0 + w + sh, Hh, z0), P(x0 + w + sh, Hh, z0 + d), P(x0 + sh, Hh, z0 + d)];
  const left = [P(x0, B, z0 + d), P(x0 + w, B, z0 + d), P(x0 + w + sh, Hh, z0 + d), P(x0 + sh, Hh, z0 + d)];
  const right = [P(x0 + w, B, z0), P(x0 + w, B, z0 + d), P(x0 + w + sh, Hh, z0 + d), P(x0 + w + sh, Hh, z0)];
  quad(ctx, top, rgba(BILL, a));
  quad(ctx, left, rgba(EDGE, a));
  quad(ctx, right, rgba(mix(EDGE, [20, 30, 26], 0.38), a));
  const LP = (u, hh) => P(x0 + u + sh * hh, lerp(B, Hh, hh), z0 + d);        // +z face, u along x
  const RP = (u, hh) => P(x0 + w + sh * hh, lerp(B, Hh, hh), z0 + u);        // +x face, u along z
  const TP = (u, q) => P(x0 + sh + u, Hh, z0 + q);

  if (s >= 34) {
    // strap bands: a mustard column down the middle of every bundle stack (+z face) and across the top
    const bw = 0.032, cols = 7, cw = w / cols;
    for (let i = 0; i < cols; i++) {
      const u = cw * (i + 0.5);
      quad(ctx, [LP(u - bw / 2, 0), LP(u + bw / 2, 0), LP(u + bw / 2, 1), LP(u - bw / 2, 1)], rgba(mix(BAND, EDGE, 0.15), a));
      quad(ctx, [TP(u - bw / 2, 0), TP(u + bw / 2, 0), TP(u + bw / 2, d), TP(u - bw / 2, d)], rgba(mix(BAND, BILL, 0.25), a));
    }
    ctx.beginPath();
    for (let i = 1; i < cols; i++) { seg(ctx, LP(cw * i, 0), LP(cw * i, 1)); seg(ctx, TP(cw * i, 0), TP(cw * i, d)); }
    const rows = 15;
    if (s > 60) for (let i = 1; i < rows; i++) { const q = (d * i) / rows; seg(ctx, RP(q, 0), RP(q, 1)); seg(ctx, TP(0, q), TP(w, q)); }
    ctx.strokeStyle = rgba([40, 52, 44], 0.32 * a);
    ctx.lineWidth = 1;
    ctx.stroke();
    // $1M layers: faint horizontal courses on both sides
    if (s > 60) {
      ctx.beginPath();
      for (let k = 1; k < 9; k++) { const hh = k / 9; seg(ctx, LP(0, hh), LP(w, hh)); seg(ctx, RP(0, hh), RP(d, hh)); }
      ctx.strokeStyle = rgba([60, 70, 62], 0.16 * a);
      ctx.stroke();
    }
    // shrink-wrap: milky gloss fading downward + a soft vertical highlight near the front corner
    const [ax, ay] = LP(0, 1), [bx, by] = LP(0, 0);
    const g = ctx.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, `rgba(235,245,240,${0.2 * a})`);
    g.addColorStop(0.45, `rgba(235,245,240,${0.05 * a})`);
    g.addColorStop(1, `rgba(235,245,240,${0.1 * a})`);
    quad(ctx, left, g);
    quad(ctx, right, g);
    quad(ctx, [LP(w - 0.16, 0), LP(w - 0.07, 0), LP(w - 0.07, 1), LP(w - 0.16, 1)], `rgba(255,255,255,${0.1 * a})`);
    quad(ctx, [RP(0.1, 0), RP(0.16, 0), RP(0.16, 1), RP(0.1, 1)], `rgba(255,255,255,${0.06 * a})`);
  }
  // crisp highlight on the top edges + front vertical edge
  const Ht = y + PAL.h * hs;
  topEdge(ctx, v, x0 + sh, Ht, z0, w, d, 0, [255, 255, 255], 0.55 * a, Math.max(1, Math.min(2, s * 0.02)));
  ctx.beginPath(); seg(ctx, P(x0 + w, B, z0 + d), P(x0 + w + sh, Hh, z0 + d));
  ctx.strokeStyle = `rgba(255,255,255,${0.22 * a})`; ctx.lineWidth = 1; ctx.stroke();
  if (flash > 0) topEdge(ctx, v, x0 + sh, Ht, z0, w, d, 0, ACC, flash * a, Math.max(2, Math.min(4, s * 0.03)), o.glow ?? true);
}

/** Highlight along the two front top edges of a top face. */
function topEdge(ctx, v, x, y, z, w, d, _u, col, a, lw, glowy = false) {
  if (a <= 0.01) return;
  const P = (p, r) => isoPt(v, p, y, r);
  ctx.save();
  if (glowy) { ctx.shadowColor = rgba(col, 1); ctx.shadowBlur = 14; }
  ctx.beginPath();
  const p0 = P(x, z + d), p1 = P(x + w, z + d), p2 = P(x + w, z);
  ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
  ctx.strokeStyle = rgba(col, a);
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Screen-space culling for a footprint (generous). */
export function onScreen(v, x, z, w, d, h = 2.5) {
  const [ax, ay] = isoPt(v, x, h, z), [bx] = isoPt(v, x, 0, z + d), [cx] = isoPt(v, x + w, 0, z), [, dy] = isoPt(v, x + w, 0, z + d);
  return Math.max(ax, cx) > -40 && Math.min(bx, ax) < L.W + 40 && dy > -40 && ay < L.H + 40;
}

// ------------------------------------------------------------------ per-pallet animation
function state(i, t, lay, sq) {
  const sl = SLOTS[i];
  const t0 = T0 + i * GAP, tl = t0 + SLIDE;
  if (t < t0) return null;
  const p = prog(t, t0, SLIDE);
  const e = 1 - Math.pow(1 - p, 3.4);                         // strong ease-out: glides to a stop
  const vel = 3.4 * Math.pow(1 - p, 2.4) * DIST / SLIDE;     // m/s, for trail + lean
  const tau = t - tl;
  // the load leans into the braking (top runs ahead, −x), then rocks back and settles after the stop
  let sh = -0.05 * Math.sin(Math.PI * p);
  if (tau > 0) sh = -0.075 * Math.exp(-5.5 * tau) * Math.sin(2 * Math.PI * 2.1 * tau + 0.25);
  let flash = tau > 0 ? Math.exp(-3.2 * tau) * (tau < 0.06 ? tau / 0.06 : 1) : 0;
  // beat-4 squeeze: the load leans into the short shove towards the origin and the top edge glints as it locks
  if (sq.p > 0) {
    sh += -0.035 * (sl.c / 4) * Math.sin(Math.PI * clamp(sq.p));
    flash = Math.max(flash, 0.45 * (sl.c + sl.r) / 5 * Math.exp(-6 * Math.max(0, sq.tau)) * (sq.tau > 0 ? 1 : 0));
  }
  return { x: sl.c * lay.px + DIST * (1 - e), z: sl.r * lay.pz, sh, vel, tau, flash };
}

let handoffCanvas = null;
const PUFF = (() => { const r = L.rng(3301); return Array.from({ length: 9 }, () => [r(), r(), r(), r()]); })();

function drawPuff(ctx, v, x, z, tau) {
  if (tau <= 0 || tau > 0.9) return;
  const k = prog(tau, 0, 0.9), s = 1 / v.cam.mpp;
  if (s < 20) return;
  ctx.save();
  for (const [a, b, c, dd] of PUFF) {
    // puffs leave the leading (−x) foot and the front (+z) skirt, drifting outward and up
    const along = a * PAL.d, out = 0.05 + ease.outCubic(k) * (0.18 + b * 0.25);
    const [sx, sy] = isoPt(v, x - out, 0.03 + ease.outCubic(k) * c * 0.12, z + along);
    const r = Math.max(0, s * (0.04 + 0.07 * ease.outCubic(k)) * (0.6 + dd * 0.6));
    ctx.fillStyle = `rgba(205,215,205,${0.22 * (1 - k) * (1 - k)})`;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawTrail(ctx, v, st) {
  if (st.vel < 0.4) return;
  const len = Math.min(2.2, st.vel * 0.3), x1 = st.x + PAL.w, z = st.z;
  const [ax, ay] = isoPt(v, x1, 0, z + PAL.d / 2), [bx, by] = isoPt(v, x1 + len, 0, z + PAL.d / 2);
  const g = ctx.createLinearGradient(ax, ay, bx, by);
  const al = clamp(st.vel / 8) * 0.1;
  g.addColorStop(0, rgba(ACC, al));
  g.addColorStop(1, rgba(ACC, 0));
  const P = (p, r) => isoPt(v, p, 0.002, r);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  quad(ctx, [P(x1, z + 0.08), P(x1 + len, z + 0.3), P(x1 + len, z + PAL.d - 0.3), P(x1, z + PAL.d - 0.08)], g);
  ctx.restore();
}

// ------------------------------------------------------------------ hand-off to the trillion (s5)
/**
 * True once s5's ground layer has fully landed over the footprint [x, x+w] × [z, z+d] (s5 then owns that floor).
 * Mirrors s5's arrival rule (growing rectangle in footprint index space, + margin for its jitter).
 * Falls back to "never" if s5 does not export what it needs.
 */
export function covered(v, x, z, w, d) {
  const sc = v.tl.scenes[5];
  if (!sc || !S5.T || !S5.NX || v.gt < sc.start) return false;
  if (S5.FROM_RICH) return true;   // s5 draws every s3/s4 footprint itself from its first frame (see s4 RICH)
  const i = Math.floor((x + w) / S5.PX), j = Math.floor((z + d) / S5.PZ);
  if (i >= S5.NX || j >= S5.NZ) return false;
  const m = Math.max((i + 0.5) / S5.NX, (j + 0.5) / S5.NZ) + 0.06;
  const mm = clamp(m, 0, 1.05) / 1.05;
  return v.gt - sc.start >= S5.T.l1 + S5.T.l1Dur * ease.outCubic(mm * mm) + S5.T.drop1 + 0.02;
}

// ------------------------------------------------------------------ $1B finish: a light rim traces the block's floor outline
function blockRim(ctx, v, t) {
  const p = prog(t, DONE - 0.02, 0.7);
  if (p <= 0) return;
  const hold = lerp(1, 0.0, ease.inOutCubic(prog(t, DONE + 0.9, 1.0)));
  if (hold <= 0.01) return;
  const m = 0.14;
  // front L only (the back edges sit behind the pallets), traced from both ends towards the front corner
  const A = isoPt(v, BLOCK.w + m, 0.002, -m), C = isoPt(v, BLOCK.w + m, 0.002, BLOCK.d + m), Bp = isoPt(v, -m, 0.002, BLOCK.d + m);
  const e = ease.inOutCubic(p);
  if (e < 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'butt';
  const stroke = (lw, al) => {
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]); ctx.lineTo(lerp(A[0], C[0], e), lerp(A[1], C[1], e));
    ctx.moveTo(Bp[0], Bp[1]); ctx.lineTo(lerp(Bp[0], C[0], e), lerp(Bp[1], C[1], e));
    ctx.strokeStyle = rgba(ACC, al * hold);
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  stroke(Math.max(6, v.ws(0.22)), 0.1);
  stroke(2, 0.75);
  ctx.restore();
}

function sheen(ctx, v, t) {
  const p = prog(t, DONE + 0.05, 0.95);
  if (p <= 0 || p >= 1 || 1 / v.cam.mpp < 8) return;
  ctx.save();
  ctx.beginPath();
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    const x = c * PITCH.x + 0.01, z = r * PITCH.z + 0.01, w = PAL.w - 0.02, d = PAL.d - 0.02;
    const pts = [[x, z], [x + w, z], [x + w, z + d], [x, z + d]].map(([p, q]) => isoPt(v, p, PAL.h, q));
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let j = 1; j < 4; j++) ctx.lineTo(pts[j][0], pts[j][1]);
    ctx.closePath();
  }
  ctx.clip();
  // a diagonal band travelling from the origin corner to the front corner
  const u = lerp(-2, BLOCK.w + BLOCK.d + 2, ease.inOutCubic(p));
  const [ax, ay] = isoPt(v, u - 1.2, PAL.h, 0), [bx, by] = isoPt(v, u + 1.2, PAL.h, 0);
  const g = ctx.createLinearGradient(ax, ay, bx, by);
  const al = 0.32 * Math.sin(Math.PI * p);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(235,255,240,${al})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L.W, L.H);
  ctx.restore();
}

/** Number of $100M pallets on the floor at beat time t (incl. s2's). */
const countAt = (t) => 1 + SLOTS.filter((_, i) => t >= landT(i)).length;

export default {
  beat: 3,
  chapter: { num: '03', title: 'One billion', sub: 'Ten pallets' },
  captions: true,
  layer: 0,
  cues(d) {
    const out = SLOTS.map((_, i) => ({ t: landT(i), name: 'tick', gain: 0.28 + i * 0.012, pitch: 0.85 + i * 0.05 }));
    out.push({ t: 0.12, name: 'swish', gain: 0.18, pitch: 0.8 });
    out.push({ t: DONE, name: 'impact', gain: 0.42, pitch: 0.85 });
    out.push({ t: DONE + 0.1, name: 'shimmer', gain: 0.22, pitch: 1.1 });
    return out;
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < 0) return;
    blockRim(ctx, v, t);
    const lay = layoutAt(squeezeK(v));
    const s4 = v.tl.scenes[4], t4 = s4 ? v.gt - s4.start : -1;
    const sq = { p: (t4 - SQ.t) / SQ.d, tau: t4 - SQ.t - SQ.d };
    const PW = lay.w, PD = lay.d;
    const sts = SLOTS.map((_, i) => state(i, t, lay, sq)).map((st) => (st && covered(v, st.x, st.z, PW, PD) ? null : st));
    // shadows + trails first (on the floor), then pallets back-to-front (row, then x)
    // s2 fades its origin pallet out for mpp 0.04 → 0.06 and hands it to us: take it over (drawn on top, same footprint)
    const k0 = ease.inOutCubic(prog(t, 0, HANDOFF));
    if (k0 > 0 && !covered(v, 0, 0, PW, PD) && onScreen(v, 0, 0, PW, PD)) {
      contactShadow(ctx, v, 0, 0, PW, PD, 0, k0);
      if (k0 >= 1) drawPallet(ctx, v, 0, 0, 0, { w: PW, d: PD });
      else {
        // cross-fade as one opaque object (an alpha'd box would show its hidden faces through)
        if (!handoffCanvas) handoffCanvas = new OffscreenCanvas(L.W, L.H);
        const oc = handoffCanvas.getContext('2d');
        oc.setTransform(1, 0, 0, 1, 0, 0);
        oc.clearRect(0, 0, L.W, L.H);
        oc.setTransform(ctx.getTransform());
        drawPallet(oc, v, 0, 0, 0, { w: PW, d: PD });
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha *= k0;
        ctx.drawImage(handoffCanvas, 0, 0);
        ctx.restore();
      }
    }
    sts.forEach((st) => { if (st && onScreen(v, st.x, st.z, PW, PD)) contactShadow(ctx, v, st.x, st.z, PW, PD); });
    sts.forEach((st) => { if (st && st.tau < 0) drawTrail(ctx, v, st); });
    sts.forEach((st) => {
      if (!st || !onScreen(v, st.x, st.z, PW, PD)) return;
      drawPallet(ctx, v, st.x, 0, st.z, { sh: st.sh, flash: st.flash * 0.9, w: PW, d: PD });
      drawPuff(ctx, v, st.x, st.z, st.tau);
    });
    sheen(ctx, v, t);
    // the person for scale stands in front of the block's front-left corner: drawn last, never covered
    drawScaleHuman(ctx, v);
  },
  drawOverlay(ctx, v) {
    const t = v.t + Math.round(v.gt * 30) / 30 - v.gt;   // frame time: all sub-frames show the same count
    const k = v.k * enterK(t);
    if (k <= 0) return;
    const n = countAt(t);
    const done = n >= 10;
    // the counter steps $100M per landing; the final step gets a small lift
    const bump = done ? ease.outBack(prog(t, DONE, 0.4), 2.2) : 1;
    // same spot and size as s2's "$100,000,000" so the count simply carries on
    L.bigLabel(ctx, {
      x: 1000, y: 520, align: 'right', big: `$${L.fmt(n * 1e8)}`,
      small: `${n} ${n > 1 ? 'tonnes' : 'tonne'} · ${L.fmt(n * 2200)} lb`, k, accent: v.accent, size: done ? lerp(104, 112, bump) : 104,
    });
  },
};

function enterK(t) { return ease.outCubic(prog(t, 0.25, 0.5)); }
