// Beat 0 — one $10,000 strap of $100 bills, filling the frame.
// A single bill slides in, 99 more riffle onto it (the counter climbs with them), the paper band wraps
// the stack, a bracket measures its 1.1 cm, and at the very end 3 more straps drop into their final
// briefcase slots beside it (the other 11 of the bottom layer follow in beat 1, via drawBottomLayer). World units are metres, drawn in iso (env.isoPt).
// This file also exports the bill / strap drawing helpers reused by s1 (briefcase) and s2 (pallet).
import * as L from '../../../../engine/runtime/lib.js';
import { isoPt } from '../env.js';

// ------------------------------------------------------------------ real dimensions (metres)
export const BW = 0.156;          // bill length (along x)
export const BD = 0.0663;         // bill width (along z)
export const SH = 0.011;          // one strap = 100 bills
const BT = SH / 100;              // one bill
const BAND_U0 = 0.062, BAND_U1 = 0.094;   // paper band position along the bill (m from the x edge)

// ------------------------------------------------------------------ palette
export const PAPER = [170, 184, 160];     // note face: muted green-grey
const PAPER_HI = [196, 206, 186];
const INK = [58, 84, 70];
const RIBBON = [96, 124, 150];
export const EDGE = [214, 219, 202];      // stacked paper edges
export const BAND = [196, 160, 78];       // the mustard $10,000 strap
const BAND_INK = [92, 70, 30];

const C = Math.cos(Math.PI / 6), S = 0.5;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ small drawing helpers
export function poly(ctx, pts, fill) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Soft contact shadow under a footprint (x, z, w, d) on the plane y: stacked, expanding quads. */
export function softShadow(ctx, v, x, z, w, d, a = 1, spread = 0.01, y = 0) {
  if (a <= 0) return;
  const steps = [[1.0, 0.1], [0.6, 0.12], [0.3, 0.16], [0.08, 0.3]];
  for (const [k, al] of steps) {
    const e = spread * k;
    const P = (px, pz) => isoPt(v, px, y, pz);
    poly(ctx, [P(x - e * 0.4, z - e * 0.4), P(x + w + e, z - e * 0.4), P(x + w + e, z + d + e), P(x - e * 0.4, z + d + e)],
      `rgba(0,0,0,${al * a})`);
  }
}

/** Pixels per millimetre on screen at this zoom (iso foreshortened). */
const ppmm = (v) => 0.00087 / v.cam.mpp;
export const billLod = (v) => { const p = ppmm(v); return p > 1.3 ? 2 : p > 0.42 ? 1 : 0; };

/**
 * Set ctx transform so that (u, w) in MILLIMETRES on a bill lying flat at height y maps to the screen.
 * (cx, cz) = bill centre in world metres, yaw in radians (rotation in the ground plane).
 */
function billTransform(ctx, v, cx, y, cz, yaw = 0) {
  const k = 1 / (v.cam.mpp * 1000);
  const co = Math.cos(yaw), si = Math.sin(yaw);
  // world directions of the bill axes
  const ux = co, uz = si, wx = -si, wz = co;
  const a = (ux - uz) * C * k, b = (ux + uz) * S * k;
  const c = (wx - wz) * C * k, d = (wx + wz) * S * k;
  const ox = cx - (ux * BW + wx * BD) / 2, oz = cz - (uz * BW + wz * BD) / 2;
  const [ex, ey] = isoPt(v, ox, y, oz);
  ctx.setTransform(a, b, c, d, ex, ey);
}

/** The face of a $100 note in mm (156 × 66.3), stylised: frame, rosette medallion, ribbon, numerals. No portrait. */
function billArt(ctx, lod, a = 1, light = 0) {
  const U = 156, Wd = 66.3;
  if (lod < 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, U, Wd); return; }
  const g = ctx.createLinearGradient(0, 0, U * 0.6, Wd);
  g.addColorStop(0, L.rgba(L.mix(PAPER_HI, [255, 255, 255], light * 0.25), a));
  g.addColorStop(1, L.rgba(L.mix(PAPER, [255, 255, 255], light * 0.2), a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, U, Wd);
  // medallion (always: it is what makes the shape read as a note)
  ctx.fillStyle = L.rgba(L.mix(PAPER, INK, 0.22), a);
  ctx.beginPath(); ctx.ellipse(80, 33.15, 15.5, 21, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = L.rgba(RIBBON, 0.42 * a);
  ctx.fillRect(52, 0, 4.2, Wd);
  if (lod < 1) return;
  ctx.strokeStyle = L.rgba(INK, 0.55 * a);
  ctx.lineWidth = 0.6;
  ctx.strokeRect(2.6, 2.6, U - 5.2, Wd - 5.2);
  ctx.lineWidth = 0.3;
  ctx.strokeRect(4.6, 4.6, U - 9.2, Wd - 9.2);
  // medallion rings + rosette
  ctx.strokeStyle = L.rgba(INK, 0.5 * a);
  ctx.lineWidth = 0.45;
  for (const [rx, ry] of [[15.5, 21], [13.6, 19], [12.6, 18]]) { ctx.beginPath(); ctx.ellipse(80, 33.15, rx, ry, 0, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = L.rgba(L.mix(PAPER, INK, 0.38), a);
  ctx.beginPath(); ctx.ellipse(80, 33.15, 9.5, 13.5, 0, 0, TAU); ctx.fill();
  // numerals
  ctx.fillStyle = L.rgba(INK, 0.85 * a);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = L.font(13, 800, L.FONT.display);
  ctx.fillText('100', 8, 17.5);
  ctx.font = L.font(17, 800, L.FONT.display);
  ctx.fillText('100', 117, 60);
  ctx.font = L.font(8, 800, L.FONT.display);
  ctx.fillText('100', 136, 14);
  ctx.fillText('100', 8, 60);
  if (lod < 2) return;
  // guilloche waves
  ctx.lineWidth = 0.22;
  for (let k = 0; k < 6; k++) {
    ctx.strokeStyle = L.rgba(INK, (0.22 - k * 0.02) * a);
    ctx.beginPath();
    for (let u = 6; u <= 150; u += 1.5) {
      const w = 47 + k * 1.7 + Math.sin(u * 0.21 + k * 0.9) * 1.6;
      u === 6 ? ctx.moveTo(u, w) : ctx.lineTo(u, w);
    }
    ctx.stroke();
  }
  // rosette petals
  ctx.strokeStyle = L.rgba(PAPER_HI, 0.5 * a);
  ctx.lineWidth = 0.3;
  for (let k = 0; k < 12; k++) {
    ctx.beginPath(); ctx.ellipse(80, 33.15, 2.2, 8.5, (k * Math.PI) / 12, 0, TAU); ctx.stroke();
  }
  // seals
  ctx.strokeStyle = L.rgba(INK, 0.6 * a);
  ctx.lineWidth = 0.5;
  for (const [u, w] of [[32, 36], [128, 34]]) {
    ctx.beginPath(); ctx.arc(u, w, 6, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(u, w, 4.3, 0, TAU); ctx.stroke();
  }
  ctx.font = L.font(4.4, 700, L.FONT.body);
  ctx.fillStyle = L.rgba(INK, 0.75 * a);
  ctx.textAlign = 'center';
  ctx.letterSpacing = '0.6px';
  ctx.fillText('THE UNITED STATES OF AMERICA', 80, 9.6);
  ctx.font = L.font(4.2, 700, L.FONT.body);
  ctx.fillText('ONE HUNDRED DOLLARS', 112, 63.2);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}

/** Bill face lying flat with centre (cx, cz) at height y. */
export function billTop(ctx, v, cx, y, cz, yaw, lod, a = 1, light = 0) {
  ctx.save();
  billTransform(ctx, v, cx, y, cz, yaw);
  billArt(ctx, lod, a, light);
  ctx.restore();
}

/** The paper band on top of a strap whose top is at y; k = wrap progress (0..1) along top then front face. */
function band(ctx, v, x, y, z, h, k = 1, a = 1, lod = 1, text = true) {
  if (k <= 0) return;
  const L0 = BD + 0.0012, L1 = h;
  const s = k * (L0 + L1);
  const u0 = x + BAND_U0, u1 = x + BAND_U1;
  const P = (px, py, pz) => isoPt(v, px, py, pz);
  const top = y + 0.00012, zf = z + BD + 0.0006;
  // top strip (from the back edge towards the front)
  const zt = Math.min(z - 0.0006 + s, zf);
  poly(ctx, [P(u0, top, z - 0.0006), P(u1, top, z - 0.0006), P(u1, top, zt), P(u0, top, zt)], L.rgba(L.mix(BAND, [255, 240, 200], 0.12), a));
  // front strip (down the +z face)
  if (s > L0) {
    const yb = top - Math.min(s - L0, L1 + 0.00012);
    poly(ctx, [P(u0, top, zf), P(u1, top, zf), P(u1, yb, zf), P(u0, yb, zf)], L.rgba(L.mix(BAND, [0, 0, 0], 0.12), a));
    // the band's fold line along the front edge
    const [ax, ay] = P(u0, top, zf), [bx, by] = P(u1, top, zf);
    ctx.strokeStyle = L.rgba([255, 236, 180], 0.55 * a);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  // printed denomination, reading along the band
  if (text && lod >= 1 && k >= 1) {
    ctx.save();
    billTransform(ctx, v, x + BW / 2, top, z + BD / 2, 0);
    ctx.translate((BAND_U0 + BAND_U1) * 500, BD * 500);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = L.rgba(BAND_INK, 0.85 * a);
    ctx.font = L.font(9.5, 800, L.FONT.display);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$10,000', 0, 0.6);
    if (lod >= 2) {
      ctx.fillStyle = L.rgba(BAND_INK, 0.5 * a);
      ctx.fillRect(-28, -10.5, 56, 0.6);
      ctx.fillRect(-28, 9.9, 56, 0.6);
    }
    ctx.restore();
  }
}

/**
 * One $10,000 strap as a box at corner (x, y, z): paper-edge faces with bill lines, the top note and its band.
 * o.top=false skips the top face (covered by another strap); o.lod overrides the zoom-based detail.
 */
export function drawStrap(ctx, v, x, y, z, o = {}) {
  const a = o.a ?? 1, h = o.h ?? SH;
  const lod = o.lod ?? billLod(v);
  const P = (px, py, pz) => isoPt(v, px, py, pz);
  const hp = h / v.cam.mpp;
  // +z face (front-left) and +x face (front-right): stacked paper edges
  poly(ctx, [P(x, y, z + BD), P(x + BW, y, z + BD), P(x + BW, y + h, z + BD), P(x, y + h, z + BD)], L.rgba(L.mix(EDGE, [0, 0, 0], 0.1), a));
  poly(ctx, [P(x + BW, y, z), P(x + BW, y, z + BD), P(x + BW, y + h, z + BD), P(x + BW, y + h, z)], L.rgba(L.mix(EDGE, [20, 30, 25], 0.36), a));
  if (o.edgeGlow > 0) {
    poly(ctx, [P(x, y, z + BD), P(x + BW, y, z + BD), P(x + BW, y + h, z + BD), P(x, y + h, z + BD)], L.rgba([150, 255, 190], 0.35 * o.edgeGlow * a));
  }
  if (hp > 4.5) {
    const n = Math.round(L.clamp(hp / 2.6, 3, 34));
    ctx.strokeStyle = `rgba(40,55,45,${0.16 * a})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 1; i < n; i++) {
      const yy = y + (h * i) / n + (L.noise1(i * 1.7 + (o.seed ?? 0) * 13, 4) * h) / (n * 3);
      let [ax, ay] = P(x, yy, z + BD), [bx, by] = P(x + BW, yy, z + BD);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      [ax, ay] = P(x + BW, yy, z + BD); [bx, by] = P(x + BW, yy, z);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }
  if (o.top !== false) {
    if (lod >= 0 && BW / v.cam.mpp > 30) billTop(ctx, v, x + BW / 2, y + h, z + BD / 2, 0, lod, a, o.light ?? 0);
    else poly(ctx, [P(x, y + h, z), P(x + BW, y + h, z), P(x + BW, y + h, z + BD), P(x, y + h, z + BD)], L.rgba(PAPER_HI, a));
  }
  band(ctx, v, x, y + h, z, h, o.band ?? 1, a, lod, o.top !== false);
  // crisp highlight on the top front edges
  if (o.top !== false && hp > 1.5) {
    ctx.strokeStyle = L.rgba([235, 245, 230], 0.35 * a);
    ctx.lineWidth = 1;
    const [ax, ay] = P(x, y + h, z + BD), [bx, by] = P(x + BW, y + h, z + BD), [cx2, cy2] = P(x + BW, y + h, z);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.stroke();
  }
}

// ------------------------------------------------------------------ the hero strap (beat 0 choreography)
const T_FIRST = 0.88;                  // first bill lands
const FIRST_D = 1.18;                  // its slide starts at t = -0.3, so frame 0 already shows it ~75% in
const RIFFLE0 = 1.05, RIFFLE = 1.55;   // 99 bills land over this window, settling
const FLY = 0.13;                     // flight time of one riffled bill (short, small drop: discrete sheets, no smear)
const BAND_T = 2.78, BAND_D = 0.42;    // band wraps
export const DIM_T = 3.95;             // thickness bracket (phrase 2 at 4.12)
const DUP_T = 5.72;                     // the 3 seed neighbours drop into their briefcase slots
const SEEDS = 3;                        // neighbours seeded in beat 0; the other 11 drop in during beat 1 (see SEED_CELLS)
const DUP_DROP = 0.34, DUP_LIFT = 0.06;

const BILLS = (() => {
  const r = L.rng(101);
  return Array.from({ length: 100 }, (_, i) => {
    const p = (i - 1) / 98;
    return {
      land: i === 0 ? T_FIRST : RIFFLE0 + RIFFLE * (0.55 * p + 0.45 * p * p),
      ox: (r() - 0.5) * 0.0006, oz: (r() - 0.5) * 0.0005,
      yaw0: (r() - 0.5) * 0.12, dx: (r() - 0.5) * 0.004, shade: 0.9 + r() * 0.14,
    };
  });
})();

export const landedBills = (t) => BILLS.reduce((n, b) => n + (t >= b.land ? 1 : 0), 0);

/**
 * The hero strap at beat-0 time t (Infinity = finished), shifted by (X, Y, Z).
 * Drawn bill by bill while it is close; as a strap box once the camera pulls away.
 */
export function heroStrap(ctx, v, t, X = 0, Y = 0, Z = 0, o = {}) {
  const P = (px, py, pz) => isoPt(v, px, py, pz);
  const lod = billLod(v);
  const landed = landedBills(t);
  if (landed >= 100 && v.cam.mpp > 0.0006) { drawStrap(ctx, v, X, Y, Z, { seed: 1 }); return; }
  // landed bills: one paper-edge block with the bill lines; the top note sits with its own tiny misregistration
  if (landed > 0) drawStrap(ctx, v, X, Y, Z, { h: landed * BT, top: false, band: 0, seed: 1, edgeGlow: o.edgeGlow ?? 0 });
  if (landed > 0) {
    const b = BILLS[landed - 1];
    const fresh = 1 - L.clamp((t - b.land) / 0.25);
    billTop(ctx, v, X + b.ox + BW / 2, Y + landed * BT, Z + b.oz + BD / 2, 0, lod, 1, 0.25 * fresh);
    // highlight the stack's top front edges once it has some body
    if (landed > 12) {
      const y = Y + landed * BT;
      ctx.strokeStyle = 'rgba(240,248,236,0.3)';
      ctx.lineWidth = 1.2;
      const [ax, ay] = P(X + b.ox, y, Z + b.oz + BD), [bx, by] = P(X + b.ox + BW, y, Z + b.oz + BD), [cx2, cy2] = P(X + b.ox + BW, y, Z + b.oz);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.stroke();
    }
  }
  // bills in flight: the first one slides in low from the left; the rest drop in from the upper right
  for (let i = landed; i < 100; i++) {
    const b = BILLS[i];
    const dur = i === 0 ? FIRST_D : FLY;
    const p = L.prog(t, b.land - dur, dur);
    if (p <= 0) break;
    const e = i === 0 ? L.ease.outQuint(p) : L.ease.outCubic(p);
    const q = 1 - e;
    const cx = X + b.ox + BW / 2 + q * (i === 0 ? -0.03 : b.dx);
    const cz = Z + b.oz + BD / 2 + q * (i === 0 ? 0.15 : -0.008);
    const y = Y + (i + 1) * BT + q * (i === 0 ? 0.004 : 0.009);
    const yaw = q * (i === 0 ? -0.35 : b.yaw0);
    // its shadow on the stack below (the first bill casts its own soft shadow on the floor as it slides)
    if (i === 0) {
      ctx.save();
      ctx.globalAlpha = 0.32 * (1 - L.clamp((t - b.land) / 0.2));
      billTop(ctx, v, cx + 0.003 + q * 0.004, Y, cz + 0.003 + q * 0.004, yaw, -1, 1);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.18 * e;
      billTop(ctx, v, cx + 0.002, Y + i * BT, cz + 0.002, yaw, -1, 1);
      ctx.restore();
    }
    billTop(ctx, v, cx, y, cz, yaw, Math.max(0, lod - 1), L.clamp(p * 7), 0.12);
  }
  // the band wraps the finished stack
  band(ctx, v, X, Y + SH, Z, SH, L.ease.inOutCubic(L.prog(t, BAND_T, BAND_D)), 1, lod);
}

// the 14 neighbours of the hero: bottom layer of the briefcase (3 along x × 5 along z)
export const CELLS = (() => {
  const out = [];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (i || j) out.push([i, j]);
  return out.sort((p, q) => p[0] + p[1] - (q[0] + q[1]) || p[1] - q[1]);
})();

/**
 * Start time (beat-0 clock) of neighbour n (index in CELLS). The first SEEDS drop in at the end of beat 0;
 * the rest follow in beat 1 (d0 = beat-0 duration = beat 1's start), all straight into their final slots.
 */
const SEED_CELLS = ['1,0', '0,1', '1,1'];   // with the hero: a tight 2 × 2 block in the frame
const DUP_ORDER = (() => {
  const rest = CELLS.filter((c) => !SEED_CELLS.includes(String(c)));
  return CELLS.map((c) => { const s = SEED_CELLS.indexOf(String(c)); return s >= 0 ? s : SEEDS + rest.indexOf(c); });
})();
const dupStart = (n, d0) => {
  const r = DUP_ORDER[n];
  return r < SEEDS ? DUP_T + r * 0.11 : d0 + 0.1 + (r - SEEDS) * 0.04;
};

/** Neighbour drop progress (0..1, raw) at beat-0 time t. */
const dupP = (t, n, d0) => L.prog(t, dupStart(n, d0), DUP_DROP);

/** Straps of the bottom layer already landed (hero included) at beat-0 time t. */
export const bottomLanded = (t, d0) => 1 + CELLS.reduce((s, _, n) => s + (dupP(t, n, d0) >= 0.8 ? 1 : 0), 0);

/** Hero + neighbours, as they stand at beat-0 time t (Infinity = all landed); d0 = beat-0 duration. */
export function drawBottomLayer(ctx, v, t, X = 0, Y = 0, Z = 0, withShadows = true, d0 = Infinity) {
  if (withShadows) {
    // the hero's shadow is there from frame 0 and deepens as the stack grows
    const sk = L.ease.outCubic(L.prog(t, -0.3, 1.1));
    if (sk > 0) softShadow(ctx, v, X, Z, BW, BD, 0.55 * sk + 0.35 * L.clamp((t - RIFFLE0) / RIFFLE), 0.005 + 0.007 * L.clamp((t - RIFFLE0) / RIFFLE), Y);
    CELLS.forEach(([i, j], n) => {
      const k = L.ease.outCubic(dupP(t, n, d0));
      if (k > 0) softShadow(ctx, v, X + i * BW, Z + j * BD, BW, BD, 0.7 * k, 0.01 + 0.02 * (1 - k), Y);
    });
  }
  const glow = Math.sin(Math.PI * L.prog(t, DIM_T + 0.1, 1.1)) ;
  heroStrap(ctx, v, t, X, Y, Z, { edgeGlow: glow });
  CELLS.forEach(([i, j], n) => {
    const p = dupP(t, n, d0);
    if (p <= 0) return;
    // straight down into its slot with a small settle (same motion as the beat-1 cascade): no rearranging later
    const e = L.ease.outCubic(p);
    const lift = (1 - e) * DUP_LIFT + Math.sin(Math.PI * L.clamp((p - 0.7) / 0.3)) * 0.0012;
    drawStrap(ctx, v, X + i * BW, Y + lift, Z + j * BD, { a: L.clamp(p * 4), seed: i * 7 + j });
  });
}

// ------------------------------------------------------------------ the counter label
const LABEL_HANDOFF = 0.02;
/** "$100 … $10,000": climbs with the landed bills. Already half in at frame 0; gone by the beat boundary. */
function drawCounter(ctx, v) {
  const t = v.t;
  // the value is read at the frame's own time, so all motion-blur sub-frames show the same digits (no ghosting)
  const n = landedBills(t + Math.round(v.gt * 30) / 30 - v.gt);
  const k = L.enter(t, -0.2, 0.65) * (1 - L.ease.inCubic(L.prog(t, v.d - 0.3, 0.28)));
  if (k <= 0) return;
  const pulse = Math.exp(-Math.max(0, t - (BAND_T + BAND_D)) * 5) * L.prog(t, BAND_T + BAND_D - 0.01, 0.01);
  L.bigLabel(ctx, { x: 104, y: 560, big: `$${L.fmt(Math.max(1, n) * 100)}`, small: '100 bills × $100', k, accent: L.mix(v.accent, [235, 255, 240], pulse * 0.5) });
}

export default {
  beat: 0,
  chapter: null,
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.02, name: 'swish', gain: 0.32, pitch: 0.9 },
      { t: T_FIRST, name: 'tick', gain: 0.35, pitch: 0.8 },
      { t: RIFFLE0 - 0.02, name: 'count', gain: 0.32, pitch: 1.1 },
      { t: RIFFLE0 + 0.85, name: 'count', gain: 0.26, pitch: 1.25 },
      { t: BAND_T, name: 'swish', gain: 0.22, pitch: 1.4 },
      { t: BAND_T + BAND_D - 0.02, name: 'impact', gain: 0.26, pitch: 1.6 },
      { t: DIM_T + 0.1, name: 'blip', gain: 0.26, pitch: 1.0 },
      { t: DUP_T + 0.05, name: 'swish', gain: 0.2, pitch: 0.8 },
      { t: DUP_T + DUP_DROP * 0.8, name: 'tick', gain: 0.2, pitch: 1.1 },
      { t: DUP_T + 0.22 + DUP_DROP * 0.8, name: 'tick', gain: 0.18, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.gt >= v.tl.scenes[1].start) return;          // s1 takes the strap over
    // studio key light pooled on the floor under the strap
    const [lx, ly] = isoPt(v, 0.09, 0, 0.05);
    L.lightBlob(ctx, lx, ly, 0.3 / v.cam.mpp, [120, 170, 140], 0.07);
    drawBottomLayer(ctx, v, v.t, 0, 0, 0, true, v.d);
    // frame 0 is the hook: the engine skips overlays until the beat's fade-in starts, so the counter's
    // very first sub-frames are drawn here (it reads a constant $100 then, so no blur smear)
    if (v.t < LABEL_HANDOFF) drawCounter(ctx, v);
    // the band's arrival glint
    const g = L.prog(v.t, BAND_T + BAND_D - 0.05, 0.5);
    if (g > 0 && g < 1) {
      const [gx, gy] = isoPt(v, (BAND_U0 + BAND_U1) / 2, SH, BD);
      L.lightBlob(ctx, gx, gy, 140 * (0.5 + g), [255, 230, 170], 0.35 * Math.sin(g * Math.PI));
    }
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    if (t >= LABEL_HANDOFF) drawCounter(ctx, v);

    // thickness bracket on the left vertical edge of the strap
    const kd = L.prog(t, DIM_T, 0.55) * (1 - L.ease.inCubic(L.prog(t, DUP_T - 0.1, 0.3))) * v.k;
    if (kd > 0) {
      const [ax, ay] = isoPt(v, 0, 0, BD), [, by] = isoPt(v, 0, SH, BD);
      const x = ax - 44;
      ctx.save();
      // extension lines from the strap's edge to the bracket
      ctx.globalAlpha = L.clamp(kd * 2);
      ctx.strokeStyle = 'rgba(235,240,236,0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(ax - 8, ay); ctx.lineTo(x + 4, ay); ctx.moveTo(ax - 8, by); ctx.lineTo(x + 4, by); ctx.stroke();
      ctx.restore();
      L.dimension(ctx, x, by, ay, kd, [240, 245, 240], '1.1 cm', 'left');
      ctx.save();
      ctx.globalAlpha = L.clamp(kd * 2 - 1);
      ctx.font = L.font(24, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(200,212,205,0.9)';
      ctx.textBaseline = 'middle';
      L.trackedText(ctx, '0.43 IN', x - 22, (ay + by) / 2 + 34, 2, 'right');
      ctx.restore();
    }
  },
};
