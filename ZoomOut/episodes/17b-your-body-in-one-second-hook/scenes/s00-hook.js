// Beat 0 — the hook. An anatomical glass-skin hand (v17i: palm, thenar, curled fingers with nails and joints) holds a premium mechanical stopwatch in front of the belly; masked headline
// YOUR BODY IN / ONE SECOND. A faint accent arc marks "one second" on the dial while the headline holds.
// OWNS the hand and the stopwatch for the WHOLE film (drawWorld every frame, LOD by zoom): the sweep hand reads
// env.clockTime(), so the stopwatch starts on the crown click in beat 1 and is still running at the end. The thumb
// lies across the crown (pad down); its upper edge runs along SKIN.surface at P.skin, where beat 4 dives in.
// Also exports the shared heart rhythm + the arm artery (used by s02 / s03): the heart beats on every whole second of
// the stopwatch, and each beat sends a pulse down the right arm into the thumb.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P, SIZE, WRIST, ELBOW, clockTime, clockStart } from '../env.js';
import { skeletonK } from './s09-marrow-map.js';

const { W, H } = L;
const R = SIZE.watchR;
const W0 = P.watch;
const KEY = [255, 222, 212];       // warm key light from the upper left

// ------------------------------------------------------------------ shared: heart rhythm + arm artery
/** Seconds since the last heartbeat: the heart beats on every whole second of the stopwatch (and keeps that rhythm before the click). */
export function heartAge(gt, tl) { const x = gt - clockStart(tl); return x - Math.floor(x); }
/** Ventricular squeeze 0..1 (fast contraction, slower release) for a given age since the beat. */
export const systole = (a) => (a < 0.36 ? Math.pow(Math.sin(Math.PI * Math.min(1, a / 0.36)), 1.4) : 0);
/** Atrial kick just before the beat (0..0.35). */
export const atrial = (a) => (a > 0.84 ? 0.35 * Math.sin(Math.PI * (a - 0.84) / 0.16) : 0);

// brachiocephalic trunk → subclavian → axillary → brachial (down the upper arm) → radial (forearm) → thumb artery → pad
const ART = [[0.0244, -1.396], [0.006, -1.424], [-0.04, -1.438], [-0.1, -1.436], [-0.15, -1.42], [-0.18, -1.392],
  [-0.198, -1.33], [-0.207, -1.25], [-0.21, -1.17], [-0.205, -1.128], [-0.17, -1.108], [-0.13, -1.09], [-0.104, -1.081],
  [-0.1, -1.098], [-0.097, -1.116], [-0.0905, -1.1305], [-0.079, -1.1395], [-0.0585, -1.1435]];
const ARTERY = (() => {
  const pts = [];
  const n = ART.length, g = (i) => ART[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < 6; s++) {
      const t = s / 6, p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      const f = (k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
      pts.push([f(0), f(1)]);
    }
  }
  pts.push(ART[n - 1]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  return { pts, u: cum.map((d) => d / total) };
})();
/** Arc-length fraction where the artery enters the hand (the wrist). */
export const ART_WRIST = ARTERY.u[12 * 6];
const PULSE_T = 0.55;   // s for a pulse to run from the heart to the thumb
/** Global time window where the arm artery shows (beats 2-3 and the start of the dive). */
export function arteryK(gt, tl, part = 'arm') {
  const s2 = tl.scenes[2].start, s3 = tl.scenes[3].start, s4 = tl.scenes[4].start;
  const a = L.smoothstep(L.prog(gt, s2 + 0.5, 0.9)) * (1 - L.smoothstep(L.prog(gt, s3 - 0.3, 0.4)));   // gone before beat 3's push-in
  if (part === 'arm') return a;
  // the hand part comes back for the hand-off to the thumb (the 3rd heartbeat of beat 3), then rides into the dive
  const h = clockStart(tl) + 10 - 0.25;
  return Math.max(a, L.smoothstep(L.prog(gt, h, 0.3)) * (1 - L.smoothstep(L.prog(gt, s4 + 0.4, 0.6))));
}
/** Pulse front (0..1 along the artery) of the latest beat, or -1. */
export function pulseFront(gt, tl) { const a = heartAge(gt, tl); return a < PULSE_T * 1.25 ? a / PULSE_T : -1; }
function artPoint(u) {
  const { pts, u: U } = ARTERY;
  let i = 1;
  while (i < U.length - 1 && U[i] < u) i++;
  const f = L.invLerp(U[i - 1], U[i], u);
  return [L.lerp(pts[i - 1][0], pts[i][0], f), L.lerp(pts[i - 1][1], pts[i][1], f)];
}
/** Draws the artery between arc fractions u0..u1 (world space) with the travelling pulse. */
export function drawArtery(c, v, u0, u1, k) {
  if (k <= 0.002) return;
  const { pts, u: U } = ARTERY;
  const mpp = v.cam.mpp;
  const lw = L.clamp(0.0026 / mpp, 1.2, 8);
  const path = (a, b) => {
    c.beginPath();
    let started = false;
    const p0 = artPoint(a);
    c.moveTo(v.wx(p0[0]), v.wy(p0[1]));
    for (let i = 0; i < pts.length; i++) {
      if (U[i] <= a || U[i] >= b) continue;
      c.lineTo(v.wx(pts[i][0]), v.wy(pts[i][1])); started = true;
    }
    const p1 = artPoint(b);
    c.lineTo(v.wx(p1[0]), v.wy(p1[1]));
    return started || b > a;
  };
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  // the vessel: a soft deep-red core inside the glass
  path(u0, u1);
  c.globalAlpha = k;
  c.strokeStyle = 'rgba(150,30,48,0.22)'; c.lineWidth = lw * 2.4; c.stroke();
  c.strokeStyle = 'rgba(232,92,104,0.32)'; c.lineWidth = lw * 0.6; c.stroke();
  // the pulse: a bright head with a fading trail
  const f = pulseFront(v.gt, v.tl);
  if (f >= 0) {
    const fade = 1 - L.smoothstep(L.prog(f, 1.0, 0.25));
    const head = Math.min(1, f), tail = Math.max(0, head - 0.16);
    const a = Math.max(u0, tail), b = Math.min(u1, head);
    if (b > a) {
      c.globalCompositeOperation = 'lighter';
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const sa = L.lerp(a, b, s / steps), sb = L.lerp(a, b, (s + 1) / steps);
        const w = (sb - tail) / Math.max(1e-6, head - tail);
        path(sa, sb);
        c.strokeStyle = L.rgba([255, 120, 128], 0.75 * k * fade * w * w); c.lineWidth = lw * (1.2 + 1.6 * w); c.stroke();
      }
      if (head >= u0 && head <= u1) {
        const hp = artPoint(head);
        L.lightBlob(c, v.wx(hp[0]), v.wy(hp[1]), lw * 9, [255, 150, 150], 0.7 * k * fade);
      }
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ geometry helpers
/** Closed outline of a tapered tube along a Catmull-Rom spine of world points [x, y, r] (screen-space path). */
export function tubePath(c, v, pts, steps = 6) {
  const n = pts.length, g = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  const sp = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const f = (k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
      sp.push([v.wx(f(0)), v.wy(f(1)), Math.max(0, v.ws(L.lerp(p1[2], p2[2], L.smoothstep(t))))]);
    }
  }
  const e = pts[n - 1];
  sp.push([v.wx(e[0]), v.wy(e[1]), Math.max(0, v.ws(e[2]))]);
  const m = sp.length, Lp = [], Rp = [], ang = [];
  for (let i = 0; i < m; i++) {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(m - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    Lp.push([sp[i][0] - dy * sp[i][2], sp[i][1] + dx * sp[i][2]]);
    Rp.push([sp[i][0] + dy * sp[i][2], sp[i][1] - dx * sp[i][2]]);
    ang.push(Math.atan2(dx, -dy));
  }
  c.moveTo(Lp[0][0], Lp[0][1]);
  for (let i = 1; i < m; i++) c.lineTo(Lp[i][0], Lp[i][1]);
  c.arc(sp[m - 1][0], sp[m - 1][1], sp[m - 1][2], ang[m - 1], ang[m - 1] - Math.PI, true);
  for (let i = m - 2; i >= 0; i--) c.lineTo(Rp[i][0], Rp[i][1]);
  c.arc(sp[0][0], sp[0][1], sp[0][2], ang[0] + Math.PI, ang[0], true);
  c.closePath();
}
/** Closed smooth outline through world points [x, y] (Catmull-Rom → Bézier). */
export function blobPath(c, v, pts) {
  const n = pts.length, p = (i) => pts[(i + n) % n];
  const X = (q) => v.wx(q[0]), Y = (q) => v.wy(q[1]);
  c.moveTo(X(p(0)), Y(p(0)));
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    c.bezierCurveTo(
      v.wx(p1[0] + (p2[0] - p0[0]) / 6), v.wy(p1[1] + (p2[1] - p0[1]) / 6),
      v.wx(p2[0] - (p3[0] - p1[0]) / 6), v.wy(p2[1] - (p3[1] - p1[1]) / 6),
      X(p2), Y(p2));
  }
  c.closePath();
}

// ------------------------------------------------------------------ v17i: the anatomical hand
// Geometry in mm, offsets from the watch centre (x right, y down). The palm faces the viewer behind the case; the thumb
// (unchanged spine, so beat 4's dive and s04's whorl clip still line up) rises from the thenar and arches over the
// crown; index, middle and ring curl round the right edge like a loose fist (PIP knuckles outermost, middle + distal
// phalanges seen from the back, tip pads pressing the bezel, nails toward us); the little finger tucks in lower with its
// tip behind the case. Palm, thenar, thumb and the proximal phalanges are ONE skin shape (U), so the thumb grows out of
// the palm without a seam; each curled finger is its own skin shape in front of it.
// Skin: no outline strokes. A screen-space "inner shadow" stack on every shape: darker toward the silhouette (soft
// subsurface core), deeper on the side away from the key light, a thin warm key rim on the upper-left edges and a faint
// warm scatter just inside it. The wrist part of U fades into env's forearm.
const MMW = (p) => [W0.x + p[0] * 1e-3, W0.y + p[1] * 1e-3];
const LDIR = [-0.6, -0.8];                                    // toward the key light (upper left), like the watch's
const SKIN_LIT = [84, 96, 124], SKIN_SHADE = [38, 46, 66];
const FA = (() => {                                            // forearm axis (mm space)
  const ux = WRIST.x - ELBOW.x, uy = WRIST.y - ELBOW.y, l = Math.hypot(ux, uy);
  return { ax: ux / l, ay: uy / l, len: l * 1e3, wx: (WRIST.x - W0.x) * 1e3, wy: (WRIST.y - W0.y) * 1e3 };
})();
const armR = (t) => 26 + 11 * (-t) / FA.len;                  // env's forearm capsule radius (mm) at t mm along the axis
/** Point on the forearm, t mm along the axis from WRIST (− = toward the elbow), o mm toward the thumb side (+). */
const armPt = (t, o) => [FA.wx + FA.ax * t + FA.ay * o, FA.wy + FA.ay * t - FA.ax * o];
const FADE_T0 = -46, FADE_T1 = -31;                            // the hand's skin fades into the forearm over this span

/** Catmull-Rom point. */
function crp(p0, p1, p2, p3, t) {
  const f = (k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
  return [f(0), f(1)];
}
/** Open Catmull-Rom chain through pts (ends extended linearly), steps samples per span, last point included. */
function chain(pts, steps = 5) {
  const n = pts.length, out = [];
  const g = (i) => (i < 0 ? [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]] : i >= n ? [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]] : pts[i]);
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < steps; s++) out.push(crp(g(i - 1), g(i), g(i + 1), g(i + 2), s / steps));
  out.push(pts[n - 1]);
  return out;
}
/** The thumb tube's edges in mm (same sampling as tubePath): L = the side toward the case, R = the outer side. */
function thumbEdges(dy, bump = null) {
  const pts = thumbSpine(dy).map(([x, y, r]) => [(x - W0.x) * 1e3, (y - W0.y) * 1e3, r * 1e3]);
  const n = pts.length, g = (i) => pts[Math.max(0, Math.min(n - 1, i))], steps = 6, sp = [];
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps, q = crp(g(i - 1), g(i), g(i + 1), g(i + 2), t);
      sp.push([q[0], q[1], L.lerp(g(i)[2], g(i + 1)[2], L.smoothstep(t))]);
    }
  }
  sp.push(pts[n - 1]);
  const m = sp.length, Lp = [], Rp = [];
  let tdx = 1, tdy = 0;
  for (let i = 0; i < m; i++) {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(m - 1, i + 1)];
    let dx = b[0] - a[0], dy2 = b[1] - a[1];
    const l = Math.hypot(dx, dy2) || 1; dx /= l; dy2 /= l;
    Lp.push([sp[i][0] - dy2 * sp[i][2], sp[i][1] + dx * sp[i][2]]);
    const rb = sp[i][2] + (bump ? bump(sp[i][0]) : 0);
    Rp.push([sp[i][0] + dy2 * rb, sp[i][1] - dx * rb]);
    if (i === m - 1) { tdx = dx; tdy = dy2; }
  }
  // tip cap (from the R side round to the L side, as tubePath's arc)
  const e = sp[m - 1], cap = [];
  for (let j = 1; j < 10; j++) {
    const th = Math.PI * j / 10;   // 0 = R side … π = L side, through the tip
    const nx = tdy, ny = -tdx;     // R-side normal
    cap.push([e[0] + (nx * Math.cos(th) + tdx * Math.sin(th)) * e[2], e[1] + (ny * Math.cos(th) + tdy * Math.sin(th)) * e[2]]);
  }
  return { L: Lp, R: Rp, cap, sp };
}

// the curled fingers: tip (on the bezel), PIP knuckle, MCP (in the palm), half-widths [tip pad, DIP, mid-phalanx, PIP],
// distal fraction of the visible length (tip→PIP). Middle longest, ring ≈ index, little ≈ 0.8× and slimmer.
const FING = [
  { name: 'index', tip: [17, -16.8], pip: [47.5, -22.5], mcp: [40, -3], w: [6.4, 7.2, 6.7, 8.2], fd: 0.44 },
  { name: 'middle', tip: [23.5, -5], pip: [61.5, -6.5], mcp: [45, 14], w: [6.7, 7.6, 7.0, 8.7], fd: 0.43 },
  { name: 'ring', tip: [22, 5.8], pip: [57, 9], mcp: [42, 26.5], w: [6.3, 7.1, 6.6, 8.0], fd: 0.44 },
  { name: 'little', tip: [13, 15.5], pip: [38.5, 26.5], mcp: [33, 37], w: [5.4, 6.0, 5.6, 6.7], fd: 0.47, behind: true },
];
// carpals (centre, half-axes, angle) and metacarpals (base → head), mm
const CARPALS = [[-45, 8, 4.6, 3.6, 0.4], [-45.5, 15.5, 4.0, 3.8, 0.1], [-45, 22.5, 3.8, 3.4, -0.2], [-41.5, 27, 2.6, 2.4, 0],
  [-37, 1.5, 4.0, 3.4, 0.6], [-36.5, 8, 3.2, 3.2, 0.2], [-36, 15, 4.8, 3.8, 0], [-36.5, 22.5, 4.2, 3.8, -0.3]];
const METAC = [[[-29.5, 5], [38, -2]], [[-29, 14.5], [43, 13]], [[-29.5, 23], [40, 26.5]], [[-30, 30], [31.5, 37.5]]];

/** The finger's frame: point at s mm from the tip toward the PIP, n mm sideways (+ = the lower/right side). */
function fingerFrame(f) {
  const dx = f.pip[0] - f.tip[0], dy = f.pip[1] - f.tip[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;                                    // + n = the finger's lower side
  const bow = f.bow ?? 0.5;                                   // all four arch the same way round the case
  const at = (u, n = 0) => { const b = bow * Math.sin(Math.PI * L.clamp(u)); return [f.tip[0] + ux * len * u + nx * (n + b), f.tip[1] + uy * len * u + ny * (n + b)]; };
  const [wT, wD, wM, wP] = f.w;                                // half-widths: tip pad, DIP, mid-phalanx waist, PIP knuckle
  const K = [[0, 0.86 * wT], [f.fd * 0.34, wT], [f.fd * 0.8, 0.94 * wT], [f.fd, wD], [f.fd + (1 - f.fd) * 0.5, wM], [0.89, wP], [1, 0.97 * wP]];
  const width = (u) => {
    let i = 0;
    while (i < K.length - 2 && K[i + 1][0] < u) i++;
    const t = L.clamp((u - K[i][0]) / (K[i + 1][0] - K[i][0]));
    return L.lerp(K[i][1], K[i + 1][1], L.smoothstep(t));
  };
  return { at, width, len, ux, uy, nx, ny, ang: Math.atan2(uy, ux) };
}
/** Finger outline (mm polygon): tip pad cap, profile with joint swells, rounded PIP knuckle cap. */
function fingerPoly(f) {
  const F = fingerFrame(f), N = 26, A = [], B = [];
  for (let i = 0; i <= N; i++) { const u = i / N, w = F.width(u); A.push(F.at(u, -w)); B.push(F.at(u, w)); }
  const cap = (u, w, dir, len, ex) => {
    const out = [];
    for (let j = 1; j < 12; j++) {
      const th = (j / 12) * Math.PI, e = Math.pow(Math.sin(th), ex);
      out.push(F.at(u + dir * (len * e) / F.len, -dir * Math.cos(th) * w));
    }
    return out;
  };
  const w0 = F.width(0), w1 = F.width(1);
  const tip = cap(0, w0, -1, w0 * 0.86, 0.8);                  // squarish-round pad (seen from the back)
  const end = cap(1, w1, 1, w1 * 0.7, 1);                      // the PIP knuckle
  return { poly: [...A, ...end, ...B.reverse(), ...tip], F };
}

/** U: palm + thenar + thumb + proximal phalanges as one mm polygon (clockwise on screen). */
function palmPoly(dy) {
  // the skin outline swells a little over the thumb's MCP and IP knuckles (outer side only; the tube itself, which
  // s04 clips the whorl to, is untouched, and both swells stay clear of the pad at P.skin)
  const te = thumbEdges(dy, (x) => 0.8 * Math.exp(-Math.pow((x + 29) / 4.5, 2)) + 0.55 * Math.exp(-Math.pow((x + 8.5) / 3, 2)));
  const P = [];
  const off = (t) => armR(t) + L.lerp(-1.2, 1.0, L.smoothstep(L.clamp((t + 44) / 13)));
  const TF = -32;                                               // the fillet leaves the forearm's radial edge here
  for (let t = -50; t < TF; t += 2) P.push(armPt(t, off(t)));
  // fillet from the radial edge of the wrist into the thumb's outer edge (the thenar rising into the thumb): a
  // quadratic curve tangent to both edges, so the snuffbox is a soft concave sweep, not a corner
  const nUpx = FA.ay, nUpy = -FA.ax;
  let i0 = 0;
  for (let i = 0; i < te.R.length; i++) {
    const q = te.R[i], rel = [q[0] - FA.wx, q[1] - FA.wy], t = rel[0] * FA.ax + rel[1] * FA.ay, o = rel[0] * nUpx + rel[1] * nUpy;
    if (o - off(t) > 1) { i0 = i; break; }
  }
  const A0 = armPt(TF, off(TF)), B0 = te.R[i0], B1 = te.R[Math.min(te.R.length - 1, i0 + 4)];
  const tx = B1[0] - B0[0], ty = B1[1] - B0[1];
  // corner = intersection of the arm edge (A0 + a·s) with the thumb edge (B0 + t·k)
  const den = FA.ax * ty - FA.ay * tx;
  const sA = Math.abs(den) > 1e-9 ? ((B0[0] - A0[0]) * ty - (B0[1] - A0[1]) * tx) / den : 0;
  const Cn = [A0[0] + FA.ax * sA, A0[1] + FA.ay * sA];
  let iB = i0;
  while (iB < te.R.length - 1 && Math.hypot(te.R[iB][0] - Cn[0], te.R[iB][1] - Cn[1]) < 9) iB++;
  const Bq = te.R[iB];
  for (let j = 0; j < 14; j++) { const u = j / 14, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u; P.push([w0 * A0[0] + w1 * Cn[0] + w2 * Bq[0], w0 * A0[1] + w1 * Cn[1] + w2 * Bq[1]]); }
  for (let i = iB; i < te.R.length; i++) P.push(te.R[i]);
  P.push(...te.cap);
  // back along the thumb's underside until it is well inside the case, then the hidden palm interior to the fingers
  for (let i = te.L.length - 1; i >= 0; i--) { P.push(te.L[i]); if (Math.hypot(te.L[i][0], te.L[i][1]) < R * 1e3 - 2) break; }
  P.push(...chain([[-12, -14], [14, -15], [30, -17], [42, -22], [49.5, -21], [55, -14], [60, -3], [57, 6], [53, 17],
    [47, 28], [43, 35.5], [35, 41.5], [22, 46.5], [6, 50.5], [-11, 53.6], [-26, 54.8], [-39, 54.6], armPt(-1, -off(-1) - 1.2), armPt(-12, -off(-12)), armPt(-20, -off(-20))], 4));
  for (let t = -24; t >= -50; t -= 2) P.push(armPt(t, -off(t)));
  return { P, te };
}

// ------------------------------------------------------------------ skin material
const polyPath = (c, P) => { c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); c.closePath(); };
function bbox(P) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
/**
 * Skin on screen polygon P (th = limb half-thickness, px). Clipped to P while detail(c) runs. extraClip(c) further
 * restricts everything (used for partial redraws). No outline strokes: the silhouette comes from inner shadows.
 */
function skinShape(c, P, th, { lit = SKIN_LIT, shade = SKIN_SHADE, detail = null, extraClip = null, rim = 1, core = [0.85, 1.0], away = [0.6, 0.8, 0.4], box = null } = {}) {
  const [x0, y0, x1, y1] = bbox(P);
  const [bx0, by0, bx1, by1] = box || [x0, y0, x1, y1];   // the region that needs shading (partial redraws: smaller blurs)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rr = Math.hypot(x1 - x0, y1 - y0) / 2;
  c.save();
  if (extraClip) extraClip(c);
  c.beginPath(); polyPath(c, P);
  c.clip();
  const g = c.createLinearGradient(cx + LDIR[0] * rr, cy + LDIR[1] * rr, cx - LDIR[0] * rr, cy - LDIR[1] * rr);
  g.addColorStop(0, L.rgba(lit)); g.addColorStop(1, L.rgba(shade));
  c.fillStyle = g; c.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  const pad = th * 3 + 12;
  const inner = (col, blur, ox, oy) => {
    if (blur < 0.3) return;
    c.save();
    c.shadowColor = col; c.shadowBlur = blur; c.shadowOffsetX = ox; c.shadowOffsetY = oy;
    c.beginPath(); c.rect(bx0 - pad, by0 - pad, bx1 - bx0 + 2 * pad, by1 - by0 + 2 * pad); polyPath(c, P);
    c.fillStyle = '#000'; c.fill('evenodd');
    c.restore();
  };
  // soft core / darker silhouette, deepest on the side turned away from the key (one blurred pass)
  inner(`rgba(4,6,13,${Math.min(0.95, core[0] + away[0] * 0.35)})`, th * (core[1] + away[1]) * 0.55, LDIR[0] * th * away[2] * 0.55, LDIR[1] * th * away[2] * 0.55);
  // key rim: only the edges that face the upper-left light (offset well beyond the blur, so it is directional)
  inner(L.rgba([240, 226, 220], 0.32 * rim), Math.max(0.6, th * 0.1), -LDIR[0] * th * 0.11, -LDIR[1] * th * 0.11);
  if (detail) detail(c);
  c.restore();
}
/** A soft brush: whatever build() fills / strokes is drawn in colour col, Gaussian-blurred (blur ≈ shadowBlur units). */
function soft(c, blur, col, build) {
  c.save();
  c.filter = `blur(${Math.max(0.3, blur * 0.5).toFixed(2)}px)`;
  c.fillStyle = col; c.strokeStyle = col;
  build(c);
  c.restore();
}

// ------------------------------------------------------------------ x-ray bones
const IV = [228, 218, 200];
/** A long bone (waisted shaft, flared rounded ends, small joint gaps) between screen points a, b; rr = end half-width px. */
function longBone(c, a, b, rr, k) {
  const [ax, ay] = a, [bx, by] = b;
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 6 || rr < 1.6) {
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by);
    c.lineWidth = Math.max(0.8, rr * 1.1); c.strokeStyle = L.rgba(IV, 0.45 * k); c.stroke();
    return;
  }
  const ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux;
  const gap = Math.min(rr * 0.55, len * 0.12), l0 = gap, Lb = len - 2 * gap;
  const P = (f, w) => [ax + ux * (l0 + Lb * f) + nx * w, ay + uy * (l0 + Lb * f) + ny * w];
  const ws = rr * 0.5, we = rr * 0.95;
  c.beginPath();
  c.moveTo(...P(0.2, ws));
  c.bezierCurveTo(...P(0.5, ws * 0.92), ...P(0.62, ws * 0.92), ...P(0.82, ws));
  c.bezierCurveTo(...P(0.92, we), ...P(1.0, we), ...P(1.0, 0));
  c.bezierCurveTo(...P(1.0, -we), ...P(0.92, -we), ...P(0.82, -ws));
  c.bezierCurveTo(...P(0.62, -ws * 0.92), ...P(0.5, -ws * 0.92), ...P(0.2, -ws));
  c.bezierCurveTo(...P(0.07, -we), ...P(0.0, -we), ...P(0.0, 0));
  c.bezierCurveTo(...P(0.0, we), ...P(0.07, we), ...P(0.2, ws));
  c.closePath();
  const g = c.createLinearGradient(...P(0.5, -we), ...P(0.5, we));
  g.addColorStop(0, L.rgba(IV, 0.2 * k)); g.addColorStop(0.5, L.rgba(IV, 0.07 * k)); g.addColorStop(1, L.rgba(IV, 0.16 * k));
  c.fillStyle = g; c.fill();
  c.lineWidth = Math.max(0.7, Math.min(1.6, rr * 0.16)); c.strokeStyle = L.rgba(IV, 0.5 * k); c.stroke();
}

// ------------------------------------------------------------------ the hand
/** Thumb press: world dy (+ = down) of the thumb tip, and the crown travel. */
function press(gt, tl) {
  const cs = clockStart(tl);
  const lift = L.ease.inOutCubic(L.prog(gt, cs - 0.42, 0.34)) * (1 - L.prog(gt, cs - 0.08, 0.08));
  const down = L.ease.outCubic(L.prog(gt, cs - 0.08, 0.08)) * (1 - L.ease.inOutCubic(L.prog(gt, cs + 0.12, 0.3)));
  const dy = -0.0011 * lift + 0.0017 * down;
  return { dy, crown: Math.max(0, dy) };
}
function thumbSpine(dy) {
  // the pad rests ON the crown: the distal points sit lower and fuller (top edge unchanged, underside down ≈ 2.8 mm)
  return [off(-0.038, -0.004, 0.0128), off(-0.0325, -0.021 + dy * 0.12, 0.0103), off(-0.0265, -0.0322 + dy * 0.35, 0.0089),
    off(-0.016, -0.0394 + dy * 0.7, 0.0086), off(-0.002, -0.0411 + dy, 0.0085), off(0.0075, -0.0414 + dy, 0.0071),
    off(0.0128, -0.0418 + dy, 0.0062)];   // the pad swells over the crown, then the distal phalanx tapers
}
const off = (dx, dy, r) => (r == null ? [W0.x + dx, W0.y + dy] : [W0.x + dx, W0.y + dy, r]);
/** Adds the thumb's outline (screen path) at gt: s04 clips the fingerprint whorl to it. */
export function thumbOutline(c, v) { tubePath(c, v, thumbSpine(press(v.gt, v.tl).dy), 6); }

let HL = null, HX = null;   // small offscreen for the wrist strip (fades into env's forearm)

/** Everything about the hand for one frame, in screen space. */
function handFrame(v, dy) {
  const S = (p) => { const q = MMW(p); return [v.wx(q[0]), v.wy(q[1])]; };
  const px = 1e-3 / v.cam.mpp;                                   // px per mm
  const { P, te } = palmPoly(dy);
  const fingers = FING.map((f) => { const { poly, F } = fingerPoly(f); return { f, F, poly: poly.map(S) }; });
  const t0 = thumbEdges(dy);                                     // the plain tube (as thumbOutline)
  return { S, px, U: P.map(S), te, thumb: [...t0.L, ...t0.cap.slice().reverse(), ...t0.R.slice().reverse()].map(S), fingers };
}

/** U's details: thenar / hypothenar volume, wrist creases, finger-root crevices, thumb joints and nail. */
function palmDetail(c, v, h, dy, fine, part = 'main') {
  const { S, px } = h;
  if (part === 'thumb') { thumbDetail(c, h, dy, fine); return; }
  const ell = (p, rx, ry, rot, col, blurK = 0.8) => soft(c, Math.min(rx, ry) * px * blurK, col, (q) => {
    const [x, y] = S(p);
    q.beginPath(); q.ellipse(x, y, Math.max(1, rx * px * 0.7), Math.max(1, ry * px * 0.7), rot, 0, Math.PI * 2); q.fill();
  });
  const curve = (pts, wmm, blurmm, col) => soft(c, blurmm * px, col, (q) => { q.beginPath(); polyLine(q, chain(pts, 6).map(S)); q.lineWidth = Math.max(0.8, wmm * px); q.lineCap = 'round'; q.stroke(); });
  // the forearm side of the wrist sits in the body's shade
  {
    const a = S(armPt(-40, 0)), b = S(armPt(-14, 0));
    const g = c.createLinearGradient(a[0], a[1], b[0], b[1]);
    g.addColorStop(0, 'rgba(10,14,24,0.55)'); g.addColorStop(1, 'rgba(10,14,24,0)');
    c.fillStyle = g; c.fillRect(-W, -H, 3 * W, 3 * H);
  }
  if (part === 'strip') return;
  // muscle volumes, lit from the upper left: the thenar (ball of the thumb) and the hypothenar (little-finger side)
  ell([-42.5, -4], 9, 7, -1.2, 'rgba(178,196,230,0.34)');
  ell([-40, 9], 7, 5.5, -1.3, 'rgba(160,178,216,0.2)');
  ell([-8, 45], 19, 4.2, -0.05, 'rgba(170,188,226,0.24)');
  ell([-33, 45], 8, 4, 0.15, 'rgba(160,178,216,0.14)');
  // the hollow of the palm between them (mostly behind the case), the shaded ulnar edge below the hypothenar
  ell([-28, 31], 10, 7, 0.7, 'rgba(3,5,11,0.42)');
  ell([-4, 54.5], 34, 3.6, 0, 'rgba(3,5,11,0.45)');
  if (fine) {
    // the thenar crease ("life line") round the thumb ball, with a faint lit lip; the palmar wrist creases
    curve([[-31, -12], [-35.5, 0], [-36.4, 13], [-33.5, 26]], 0.7, 1.1, 'rgba(3,5,11,0.32)');
    curve([[-32.2, -11], [-36.7, 0.4], [-37.6, 13], [-34.7, 25.6]], 0.5, 0.7, 'rgba(170,188,226,0.12)');
    curve([armPt(-26, 17), armPt(-25, 4), armPt(-25.8, -9)], 0.5, 0.8, 'rgba(3,5,11,0.2)');
    curve([armPt(-21, 15), armPt(-20.2, 3), armPt(-20.8, -7)], 0.4, 0.7, 'rgba(3,5,11,0.13)');
    // the heel: where the hypothenar pad meets the wrist
    curve([[-44, 47.5], [-38, 44], [-30, 42.5]], 0.6, 1.0, 'rgba(3,5,11,0.22)');
    // the proximal phalanges where they peek between the curled fingers: soft lit swells, dark partings
    for (const f of FING) ell([L.lerp(f.mcp[0], f.pip[0], 0.62), L.lerp(f.mcp[1], f.pip[1], 0.62)], 5.5, 4, 0, 'rgba(160,178,216,0.12)');
    for (let i = 0; i < 3; i++) {
      const a = FING[i], b = FING[i + 1];
      curve([[(a.pip[0] + b.pip[0]) / 2 + 1, (a.pip[1] + b.pip[1]) / 2], [(a.mcp[0] + b.mcp[0]) / 2, (a.mcp[1] + b.mcp[1]) / 2]], 1.2, 1.6, 'rgba(2,4,9,0.4)');
    }
  }
  thumbDetail(c, h, dy, fine);
}
const polyLine = (c, P) => { c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); };

/** Thumb modelling, joints, pad contact and nail (inside U / the thumb redraw). sp = the tube spine in mm [x, y, r]. */
function thumbDetail(c, h, dy, fine) {
  const { S, px } = h;
  const sp = h.te.sp, m = sp.length;
  const nr = (i) => {   // unit normal toward the outer (R = upper) side
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(m - 1, i + 1)];
    let dx = b[0] - a[0], dy2 = b[1] - a[1]; const l = Math.hypot(dx, dy2) || 1; dx /= l; dy2 /= l;
    return [dy2, -dx];
  };
  const tp = (i, k) => { const n = nr(i); return S([sp[i][0] + n[0] * k * sp[i][2], sp[i][1] + n[1] * k * sp[i][2]]); };
  const near = (x) => { let b = 0; for (let i = 0; i < m; i++) if (Math.abs(sp[i][0] - x) < Math.abs(sp[b][0] - x) && i > 6) b = i; return b; };
  const iM = near(-29), iI = near(-8), i3 = near(3.5);
  const run = (q, i0, i1, k) => { for (let i = i0; i <= i1; i++) { const p = tp(i, k); i === i0 ? q.moveTo(...p) : q.lineTo(...p); } };
  const r0 = 8.6 * px;
  // cylindrical modelling of the free thumb (fading in past the thenar): lit upper flank, shaded underside
  c.save();
  c.beginPath(); polyPath(c, h.thumb); c.clip();
  const segs = [[iM - 6, iM, 0.35], [iM, iM + 6, 0.75], [iM + 6, m - 1, 1]];
  for (const [a, b, al] of segs) {
    soft(c, 0.5 * r0, `rgba(165,184,222,${0.24 * al})`, (q) => { q.beginPath(); run(q, Math.max(0, a), b, 0.4); q.lineWidth = 0.4 * r0; q.lineCap = 'round'; q.stroke(); });
    soft(c, 0.5 * r0, `rgba(2,4,10,${0.42 * al})`, (q) => { q.beginPath(); run(q, Math.max(0, a), b, -0.78); q.lineWidth = 0.45 * r0; q.lineCap = 'round'; q.stroke(); });
  }
  c.restore();
  // the pad pressing on the crown: compressed, a touch darker on the underside
  {
    const [x, y] = S([-1, -34.6 + dy * 1e3]);
    c.save(); c.translate(x, y); c.scale(1, 0.42);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, 9 * px));
    g.addColorStop(0, 'rgba(4,7,14,0.34)'); g.addColorStop(1, 'rgba(4,7,14,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, Math.max(1, 9 * px), 0, Math.PI * 2); c.fill();
    c.restore();
  }
  if (!fine) return;
  // knuckles: the MCP and IP joints swell on the outer side
  soft(c, 3 * px, 'rgba(180,198,234,0.2)', (q) => { const p = tp(iM, 0.45); q.beginPath(); q.arc(p[0], p[1], Math.max(1, 4.5 * px), 0, Math.PI * 2); q.fill(); });
  soft(c, 2.5 * px, 'rgba(180,198,234,0.16)', (q) => { const p = tp(iI, 0.5); q.beginPath(); q.arc(p[0], p[1], Math.max(1, 3.5 * px), 0, Math.PI * 2); q.fill(); });
  // IP joint: short dorsal wrinkles on the upper flank, the flexion crease underneath
  c.lineCap = 'round';
  for (let k = -1; k <= 1; k++) {
    const i = iI + k, a = tp(i, 0.95), b = tp(i, 0.45), mid = tp(i + 0.0, 0.7);
    c.beginPath(); c.moveTo(...a); c.quadraticCurveTo(mid[0] + 0.8 * px, mid[1], ...b);
    c.strokeStyle = `rgba(4,6,12,${k === 0 ? 0.24 : 0.15})`; c.lineWidth = Math.max(0.6, 0.26 * px); c.stroke();
  }
  soft(c, 0.7 * px, 'rgba(2,4,10,0.45)', (q) => { q.beginPath(); const a = tp(iI, -1.0), b = tp(iI, -0.55); q.moveTo(...a); q.lineTo(...b); q.lineWidth = 0.6 * px; q.stroke(); });
  // thumbnail, seen from the side: a thin curved plate along the top of the distal phalanx, nail fold behind it
  {
    const out = [], inn = [];
    for (let i = i3; i < m; i++) { out.push(tp(i, 0.9)); inn.push(tp(i, L.lerp(0.6, 0.72, (i - i3) / Math.max(1, m - 1 - i3)))); }
    const e = sp[m - 1], n = nr(m - 1), t = [-n[1], n[0]];   // t = along the thumb toward the tip
    for (let j = 1; j <= 4; j++) {
      const a = (j / 4) * 0.62;
      const kx = n[0] * Math.cos(a) + t[0] * Math.sin(a), ky = n[1] * Math.cos(a) + t[1] * Math.sin(a);
      out.push(S([e[0] + kx * e[2] * 0.9, e[1] + ky * e[2] * 0.9]));
    }
    const nail = [...out, ...inn.reverse()];
    soft(c, 0.8 * px, 'rgba(2,4,10,0.45)', (q) => { q.beginPath(); polyPath(q, nail); q.lineWidth = 0.6 * px; q.stroke(); });
    const g = c.createLinearGradient(...tp(i3 + 3, 0.92), ...tp(i3 + 3, 0.6));
    g.addColorStop(0, 'rgba(205,218,242,0.32)'); g.addColorStop(1, 'rgba(110,128,168,0.14)');
    c.beginPath(); polyPath(c, nail); c.fillStyle = g; c.fill();
    soft(c, 0.6 * px, 'rgba(235,242,255,0.3)', (q) => { q.beginPath(); run(q, i3 + 2, m - 2, 0.82); q.lineWidth = 0.5 * px; q.stroke(); });
  }
}

/** One curled finger (skin, contact shadow, nail, joints). */
function drawFinger(c, v, h, fg, fine, kb) {
  const { S, px } = h;
  const { f, F, poly } = fg;
  const th = f.w[2] * px;
  const wv = (u) => F.width(u);
  const P = (u, n) => S(F.at(u, n));
  const line = (cc, u0, u1, nk, N = 12) => { for (let i = 0; i <= N; i++) { const u = L.lerp(u0, u1, i / N), q = P(u, nk * wv(u)); i ? cc.lineTo(...q) : cc.moveTo(...q); } };
  // soft contact shadow on the case / the finger below (cast down-right, away from the key)
  if (fine) {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 2.6 * px; c.shadowOffsetX = 1.0 * px; c.shadowOffsetY = 1.6 * px;
    c.beginPath(); polyPath(c, poly);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fill();
    c.restore();
    // the pad pressing on the bezel: a tight occlusion shadow round the tip
    soft(c, 2.2 * px, 'rgba(0,0,0,0.55)', (cc) => { cc.beginPath(); const q = P(0.03, 0.1 * f.w[0]); cc.ellipse(q[0], q[1], Math.max(1, f.w[0] * 0.7 * px), Math.max(1, f.w[0] * 0.95 * px), F.ang, 0, Math.PI * 2); cc.fill(); });
  }
  skinShape(c, poly, th, {
    core: [0.62, 0.75], away: [0.55, 0.7, 0.45],
    detail: (cc) => {
      const bones = () => {   // x-ray: middle and distal phalanx (the distal one short, with its tuft under the nail)
        if (kb <= 0.01) return;
        longBone(cc, P(0.975, 0), P(f.fd + 0.02, 0), f.w[2] * 0.5 * px, kb * 0.7);
        longBone(cc, P(f.fd - 0.015, 0), P(0.12, 0), f.w[0] * 0.42 * px, kb * 0.7);
      };
      if (!fine) { bones(); return; }
      cc.lineCap = 'round'; cc.lineJoin = 'round';
      // cylindrical modelling: a lit ridge along the upper side of the dorsum, the lower flank falling into shade
      soft(cc, 0.5 * th, 'rgba(165,184,222,0.26)', (q) => { q.beginPath(); line(q, 0.06, 0.95, -0.36); q.lineWidth = 0.42 * th; q.stroke(); });
      soft(cc, 0.45 * th, 'rgba(2,4,10,0.5)', (q) => { q.beginPath(); line(q, 0.02, 0.98, 0.78); q.lineWidth = 0.45 * th; q.stroke(); });
      // along the length: the PIP knuckle is the high point (catches the key), the DIP a smaller bump, the
      // middle phalanx's waist and the groove just behind the DIP sit lower
      const blob = (u, n, rx, ry, col) => soft(cc, Math.min(rx, ry) * px * 0.9, col, (q) => {
        q.beginPath(); const p = P(u, n * wv(u)); q.ellipse(p[0], p[1], Math.max(1, rx * px * 0.6), Math.max(1, ry * px * 0.6), F.ang, 0, Math.PI * 2); q.fill();
      });
      blob(0.905, -0.22, wv(0.9) * 1.05, wv(0.9) * 0.9, 'rgba(185,202,238,0.30)');
      blob(f.fd + 0.01, -0.26, wv(f.fd) * 0.62, wv(f.fd) * 0.7, 'rgba(185,202,238,0.16)');
      blob(f.fd + (1 - f.fd) * 0.52, 0.1, wv(0.7) * 0.8, wv(0.7) * 0.8, 'rgba(3,5,11,0.22)');
      blob(f.fd * 0.86, 0.05, wv(0.3) * 0.45, wv(0.3) * 0.75, 'rgba(3,5,11,0.18)');
      // skin wrinkles: an ellipse of folds over the PIP knuckle, two short transverse folds over the DIP
      const wrinkle = (u, span, a, lw, bend) => {
        const w = wv(u), p0 = P(u + bend / F.len, -w * span), p1 = P(u + bend / F.len, w * span * 0.85), pm = P(u - bend / F.len, -w * 0.1);
        cc.beginPath(); cc.moveTo(...p0); cc.quadraticCurveTo(...pm, ...p1);
        cc.strokeStyle = `rgba(4,6,12,${a})`; cc.lineWidth = Math.max(0.6, lw * px); cc.stroke();
        cc.save(); cc.translate(0.3 * px * Math.cos(F.ang), 0.3 * px * Math.sin(F.ang));
        cc.beginPath(); cc.moveTo(...p0); cc.quadraticCurveTo(...pm, ...p1);
        cc.strokeStyle = `rgba(185,202,238,${a * 0.45})`; cc.lineWidth = Math.max(0.5, lw * 0.7 * px); cc.stroke();
        cc.restore();
      };
      wrinkle(0.855, 0.3, 0.16, 0.22, 0.9); wrinkle(0.885, 0.42, 0.22, 0.26, 1.4); wrinkle(0.915, 0.44, 0.2, 0.26, 1.7); wrinkle(0.945, 0.32, 0.13, 0.22, 1.3);
      wrinkle(f.fd - 0.015, 0.38, 0.22, 0.24, 0.7); wrinkle(f.fd + 0.012, 0.3, 0.15, 0.2, 0.6);
      // the nail: a flat, slightly curved plate on the distal dorsum, set back from the tip; cuticle arc behind it
      const u0 = 0.035, u1 = f.fd * 0.62, nw = (u) => wv(u) * 0.6 * (1 - 0.14 * Math.pow(L.clamp((u - u0) / (u1 - u0)), 2));
      const side = [], other = [], cut = [], free = [];
      for (let i = 0; i <= 8; i++) { const u = L.lerp(u0, u1, i / 8); side.push(P(u, -nw(u))); other.push(P(u, nw(u))); }
      for (let j = 1; j < 8; j++) { const a = Math.PI * j / 8; cut.push(P(u1 + Math.sin(a) * 0.075 * f.fd, -Math.cos(a) * nw(u1))); }
      for (let j = 1; j < 8; j++) { const a = Math.PI * j / 8; free.push(P(u0 - Math.sin(a) * 0.03 * f.fd, Math.cos(a) * nw(u0))); }
      const nail = [...side, ...cut, ...other.reverse(), ...free];
      // the nail folds: a soft groove just outside the plate
      soft(cc, 0.9 * px, 'rgba(2,4,10,0.5)', (q) => { q.beginPath(); polyPath(q, nail); q.lineWidth = 0.7 * px; q.stroke(); });
      const np = P((u0 + u1) / 2, -nw((u0 + u1) / 2)), nq = P((u0 + u1) / 2, nw((u0 + u1) / 2));
      const ng = cc.createLinearGradient(np[0], np[1], nq[0], nq[1]);
      ng.addColorStop(0, 'rgba(196,210,238,0.22)'); ng.addColorStop(0.4, 'rgba(150,168,208,0.13)'); ng.addColorStop(1, 'rgba(80,96,134,0.06)');
      cc.beginPath(); polyPath(cc, nail); cc.fillStyle = ng; cc.fill();
      // lunula at the root, the paler free edge at the tip, a soft specular along the lit side of the curved plate
      soft(cc, 1.2 * px, 'rgba(205,218,242,0.14)', (q) => { q.beginPath(); const p = P(u1 - 0.02, 0); q.ellipse(p[0], p[1], Math.max(1, 0.1 * f.fd * F.len * px), Math.max(1, nw(u1) * 0.55 * px), F.ang, 0, Math.PI * 2); q.fill(); });
      soft(cc, 0.5 * px, 'rgba(225,234,250,0.3)', (q) => { q.beginPath(); for (let j = 0; j <= 8; j++) { const a = Math.PI * j / 8, p = P(u0 + 0.012 - Math.sin(a) * 0.022 * f.fd, Math.cos(a) * nw(u0) * 0.92); j ? q.lineTo(...p) : q.moveTo(...p); } q.lineWidth = 0.55 * px; q.stroke(); });
      soft(cc, 0.8 * px, 'rgba(235,242,255,0.32)', (q) => { q.beginPath(); for (let j = 0; j <= 6; j++) { const u = L.lerp(u0 + 0.05, u1 - 0.05, j / 6), p = P(u, -nw(u) * 0.5); j ? q.lineTo(...p) : q.moveTo(...p); } q.lineWidth = 0.7 * px; q.stroke(); });
      bones();
    },
  });
}

/** Palm-layer x-ray bones (forearm ends, carpals, metacarpals, proximal phalanges, thumb), clipped to U. */
function palmBones(c, h, dy, k, kFore, part = 'main') {
  const { S, px } = h;
  if (kFore > 0.01 && part !== 'thumb') {
    longBone(c, S(armPt(-118, 9)), S(armPt(-24, 8.5)), 6.2 * px, kFore);    // radius (thumb side)
    longBone(c, S(armPt(-124, -8.5)), S(armPt(-25, -9.5)), 5.2 * px, kFore);  // ulna
  }
  if (k <= 0.01 || part === 'strip') return;
  const d = dy * 1e3;
  if (part === 'thumb') { thumbBones(c, S, px, d, k); return; }
  for (const [x, y, rx, ry, a] of CARPALS) {
    const [sx, sy] = S([x, y]);
    c.beginPath(); c.ellipse(sx, sy, Math.max(1, rx * px), Math.max(1, ry * px), a, 0, Math.PI * 2);
    c.fillStyle = L.rgba(IV, 0.1 * k); c.fill();
    c.strokeStyle = L.rgba(IV, 0.2 * k); c.lineWidth = Math.max(0.6, Math.min(1.2, 0.25 * px)); c.stroke();
  }
  METAC.forEach(([a, b], i) => longBone(c, S(a), S(b), (i === 3 ? 3.0 : 3.4) * px, k));
  FING.forEach((f, i) => longBone(c, S(f.mcp), S(f.pip), (i === 3 ? 2.9 : 3.4) * px, k));
  thumbBones(c, S, px, d, k);
}
function thumbBones(c, S, px, d, k) {
  longBone(c, S([-39, 0]), S([-31, -25 + d * 0.05]), 3.6 * px, k);                  // thumb metacarpal
  longBone(c, S([-30.5, -27 + d * 0.2]), S([-9, -40.2 + d * 0.75]), 3.0 * px, k);   // proximal phalanx
  longBone(c, S([-7.5, -41 + d * 0.85]), S([12, -42.2 + d]), 2.6 * px, k);          // distal phalanx
}

function drawPalmLayer(c, v, h, dy, fine, k, kFore, clip, box = null, part = 'main') {
  const th = 9 * h.px;
  skinShape(c, h.U, th, {
    extraClip: clip, box,
    detail: (cc) => { palmDetail(cc, v, h, dy, fine, part); palmBones(cc, h, dy, k * 0.75, kFore * 0.8, part); },
  });
}

/** U with its wrist strip: the strip (t < FADE_T1) goes through a small offscreen and fades into env's forearm. */
function palmLayer(c, v, h, dy, fine, k, kFore) {
  const S = h.S;
  const half = (t0, t1) => (cc) => {
    const q = [armPt(t0, 90), armPt(t1, 90), armPt(t1, -90), armPt(t0, -90)].map(S);
    cc.beginPath(); polyPath(cc, q); cc.clip();
  };
  drawPalmLayer(c, v, h, dy, fine, k, kFore, half(FADE_T1, 400));
  // the strip's screen box
  const bp = [armPt(FADE_T0 - 6, 36), armPt(FADE_T0 - 6, -36), armPt(FADE_T1 + 1, 36), armPt(FADE_T1 + 1, -36)].map(S);
  let [x0, y0, x1, y1] = bbox(bp);
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
  const w = x1 - x0, hh = y1 - y0;
  if (w < 2 || hh < 2) return;
  if (!HL || HL.width < w || HL.height < hh) { HL = new OffscreenCanvas(Math.max(w, HL ? HL.width : 0), Math.max(hh, HL ? HL.height : 0)); HX = HL.getContext('2d'); }
  HX.setTransform(1, 0, 0, 1, 0, 0); HX.globalAlpha = 1; HX.globalCompositeOperation = 'source-over';
  HX.clearRect(0, 0, w, hh);
  HX.translate(-x0, -y0);
  drawPalmLayer(HX, v, h, dy, fine, k, kFore, half(FADE_T0 - 8, FADE_T1), [x0, y0, x1, y1], 'strip');
  const a = S(armPt(FADE_T0, 0)), b = S(armPt(FADE_T1, 0));
  const g = HX.createLinearGradient(a[0], a[1], b[0], b[1]);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  HX.globalCompositeOperation = 'destination-in';
  HX.fillStyle = g; HX.fillRect(x0, y0, w, hh);
  HX.setTransform(1, 0, 0, 1, 0, 0); HX.globalCompositeOperation = 'source-over';
  c.drawImage(HL, 0, 0, w, hh, x0, y0, w, hh);
}


// ------------------------------------------------------------------ the stopwatch
function drawWatch(c, v, crownDy, gt, tl) {
  const mpp = v.cam.mpp;
  const X = (x) => v.wx(x), Y = (y) => v.wy(y), S = (m) => v.ws(m);
  const cx = X(W0.x), cy = Y(W0.y), r = S(R);
  const ct = clockTime(gt, tl);
  const A = (ct % 60) / 60 * Math.PI * 2;                  // sweep angle (0 = 12 o'clock, clockwise)
  const pol = (ang, rr) => [cx + Math.sin(ang) * rr, cy - Math.cos(ang) * rr];
  // soft contact shadow on the palm
  if (r > 4) {
    const sg = c.createRadialGradient(cx + r * 0.08, cy + r * 0.14, r * 0.8, cx + r * 0.08, cy + r * 0.14, r * 1.22);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg; c.fillRect(cx - r * 1.4, cy - r * 1.3, r * 2.9, r * 2.9);
  }
  // crown: stem collar + knurled crown (depresses on the click)
  {
    const cd = S(crownDy);
    const sw = S(0.0058), sh = S(0.0038);
    const ky = cy - r - sh + r * 0.02;
    const cgx = c.createLinearGradient(cx - sw, 0, cx + sw, 0);
    cgx.addColorStop(0, '#5d6573'); cgx.addColorStop(0.35, '#e9edf3'); cgx.addColorStop(0.6, '#a9b1be'); cgx.addColorStop(1, '#4a515d');
    c.fillStyle = cgx;
    c.fillRect(cx - sw / 2, ky + cd * 0.5, sw, sh + r * 0.03);
    const kw = S(0.0104), kh = S(0.0046), ty = ky - kh + cd;
    L.roundRect(c, cx - kw / 2, ty, kw, kh, Math.min(kh * 0.35, S(0.0012)));
    const kg = c.createLinearGradient(cx - kw / 2, 0, cx + kw / 2, 0);
    kg.addColorStop(0, '#565d69'); kg.addColorStop(0.3, '#f1f3f7'); kg.addColorStop(0.55, '#b8bfca'); kg.addColorStop(1, '#3e444f');
    c.fillStyle = kg; c.fill();
    if (kw > 14) {
      c.strokeStyle = 'rgba(40,44,52,0.45)'; c.lineWidth = Math.max(0.6, kw / 70);
      for (let i = 1; i < 12; i++) { const x = cx - kw / 2 + (kw * i) / 12; c.beginPath(); c.moveTo(x, ty + kh * 0.12); c.lineTo(x, ty + kh * 0.88); c.stroke(); }
    }
  }
  // case: brushed steel ring (conic gradient = anisotropic highlights)
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
  if (r > 3) {
    const cg = c.createConicGradient(-Math.PI * 0.75 + 0.18 * Math.sin(gt * 0.45), cx, cy);   // the light drifts across the brushed steel
    const st = [[0, '#f4f6fa'], [0.08, '#9aa2b0'], [0.2, '#5a616d'], [0.32, '#c9cfd8'], [0.45, '#6f7682'], [0.55, '#3b414c'],
      [0.68, '#8d95a3'], [0.8, '#d8dde5'], [0.9, '#7d8592'], [1, '#f4f6fa']];
    for (const [o, col] of st) cg.addColorStop(o, col);
    c.fillStyle = cg;
  } else c.fillStyle = '#9aa2b0';
  c.fill();
  if (r < 3) return;
  // bevels: outer dark line, inner polished step
  c.lineWidth = Math.max(0.8, r * 0.012);
  c.strokeStyle = 'rgba(20,24,30,0.7)'; c.stroke();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r * 0.905), 0, Math.PI * 2);
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = Math.max(0.6, r * 0.01); c.stroke();
  // dial (cream, with a soft centre light)
  const dr = r * 0.88;
  c.beginPath(); c.arc(cx, cy, Math.max(0, dr), 0, Math.PI * 2);
  const dg = c.createRadialGradient(cx - dr * 0.25, cy - dr * 0.3, dr * 0.05, cx, cy, dr);
  dg.addColorStop(0, '#fbf7ee'); dg.addColorStop(0.7, '#efe8d9'); dg.addColorStop(1, '#d9cfbc');
  c.fillStyle = dg; c.fill();
  c.save();
  c.clip();
  const ink = '#1d2129';
  // the "one second" arc of the hook (glows while the headline holds, gone at the click)
  const cs = clockStart(tl);
  const ft = gt - tl.scenes[0].start;   // 17b: film-relative (the film starts after the preroll)
  const hk = L.smoothstep(L.prog(ft, 1.25, 0.6)) * (1 - L.smoothstep(L.prog(gt, cs - 0.25, 0.3)));
  if (hk > 0) {
    const pul = 0.75 + 0.25 * Math.sin(gt * 4.2);
    c.beginPath(); c.arc(cx, cy, Math.max(0, dr * 0.9), -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2) / 60 * L.ease.outCubic(L.prog(ft, 1.25, 0.7)));
    c.strokeStyle = L.rgba(ACCENT, 0.9 * hk * pul); c.lineWidth = Math.max(1, dr * 0.07); c.lineCap = 'butt'; c.stroke();
  }
  // trail behind the sweep hand (only once running)
  if (ct > 0 && dr > 12) {
    const span = Math.min(ct, 0.6) / 60 * Math.PI * 2;
    const tg = c.createConicGradient(A - Math.PI / 2 - span, cx, cy);
    tg.addColorStop(0, L.rgba(ACCENT, 0)); tg.addColorStop(span / (Math.PI * 2), L.rgba(ACCENT, 0.2)); tg.addColorStop(Math.min(1, span / (Math.PI * 2) + 0.001), L.rgba(ACCENT, 0));
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, Math.max(0, dr * 0.86), A - Math.PI / 2 - span, A - Math.PI / 2); c.closePath();
    c.fillStyle = tg; c.fill();
  }
  // track: ticks (1/5 s when big, 1 s, 5 s)
  const step = dr > 150 ? 300 : dr > 40 ? 60 : dr > 10 ? 12 : 0;
  if (step) {
    c.lineCap = 'butt';
    for (let i = 0; i < step; i++) {
      const s = (i / step) * 60;
      const five = Math.abs(s % 5) < 1e-6, one = Math.abs(s % 1) < 1e-6;
      const ang = (i / step) * Math.PI * 2;
      const r1 = dr * 0.965, r0 = dr * (five ? 0.86 : one ? 0.9 : 0.935);
      const p0 = pol(ang, r0), p1 = pol(ang, r1);
      // the tick the hand just passed glows briefly (a pulse every second)
      let col = ink, lw = five ? dr * 0.018 : one ? dr * 0.009 : dr * 0.005;
      if (one && ct > 0) {
        const age = ((ct - s) % 60 + 60) % 60;
        if (age < 0.7) {
          const gk = Math.exp(-age * 5);
          col = L.rgba(L.mix([29, 33, 41], ACCENT, gk));
          lw *= 1 + gk;
        }
      }
      c.strokeStyle = col; c.lineWidth = Math.max(0.5, lw);
      c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
    }
    // inner track rule
    c.beginPath(); c.arc(cx, cy, Math.max(0, dr * 0.965), 0, Math.PI * 2);
    c.strokeStyle = 'rgba(29,33,41,0.55)'; c.lineWidth = Math.max(0.5, dr * 0.006); c.stroke();
  }
  // numerals 5…60
  if (dr > 70) {
    c.fillStyle = ink;
    c.font = L.font(Math.round(dr * 0.115), 600, L.FONT.display);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let s = 5; s <= 60; s += 5) {
      const p = pol((s / 60) * Math.PI * 2, dr * 0.73);
      c.fillText(String(s), p[0], p[1] + dr * 0.008);
    }
    c.font = L.font(Math.round(dr * 0.042), 600, L.FONT.body);
    c.fillStyle = 'rgba(29,33,41,0.6)';
    L.trackedText(c, '1/5 SECOND', cx, cy - dr * 0.36, dr * 0.012, 'center');
  }
  // 30-minute register at 6 o'clock
  if (dr > 30) {
    const sx = cx, sy = cy + dr * 0.38, sr = dr * 0.2;
    c.beginPath(); c.arc(sx, sy, Math.max(0, sr), 0, Math.PI * 2);
    const sgd = c.createRadialGradient(sx, sy - sr * 0.3, 0, sx, sy, sr);
    sgd.addColorStop(0, '#e9e2d2'); sgd.addColorStop(1, '#d6ccb7');
    c.fillStyle = sgd; c.fill();
    c.strokeStyle = 'rgba(29,33,41,0.5)'; c.lineWidth = Math.max(0.5, dr * 0.006); c.stroke();
    if (dr > 90) {
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2, big = i % 5 === 0;
        c.beginPath(); c.moveTo(sx + Math.sin(a) * sr * (big ? 0.72 : 0.82), sy - Math.cos(a) * sr * (big ? 0.72 : 0.82));
        c.lineTo(sx + Math.sin(a) * sr * 0.93, sy - Math.cos(a) * sr * 0.93);
        c.strokeStyle = ink; c.lineWidth = Math.max(0.5, dr * (big ? 0.008 : 0.004)); c.stroke();
      }
    }
    const ma = ((ct / 60) % 30) / 30 * Math.PI * 2;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.sin(ma) * sr * 0.78, sy - Math.cos(ma) * sr * 0.78);
    c.strokeStyle = ink; c.lineWidth = Math.max(0.8, dr * 0.014); c.lineCap = 'round'; c.stroke();
    c.beginPath(); c.arc(sx, sy, Math.max(0, dr * 0.022), 0, Math.PI * 2); c.fillStyle = ink; c.fill();
  }
  // sweep hand: soft shadow, then the accent needle with a counterweight
  const needle = (ox, oy, col, alpha) => {
    c.save();
    c.translate(cx + ox, cy + oy); c.rotate(A);
    c.globalAlpha *= alpha;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(-dr * 0.012, dr * 0.2); c.lineTo(-dr * 0.006, -dr * 0.9); c.lineTo(dr * 0.006, -dr * 0.9); c.lineTo(dr * 0.012, dr * 0.2); c.closePath();
    c.fill();
    c.beginPath(); c.arc(0, dr * 0.2, Math.max(0, dr * 0.04), 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(0, 0, Math.max(0, dr * 0.05), 0, Math.PI * 2); c.fill();
    c.restore();
  };
  needle(dr * 0.018, dr * 0.03, 'rgba(40,30,20,0.28)', 1);
  needle(0, 0, L.rgba(ACCENT), 1);
  // centre cap
  c.beginPath(); c.arc(cx, cy, Math.max(0, dr * 0.026), 0, Math.PI * 2);
  c.fillStyle = '#e9edf3'; c.fill();
  // crystal: inner shadow from the bezel, a curved specular sheet, and a light sweep on the click
  const ig = c.createRadialGradient(cx, cy, dr * 0.82, cx, cy, dr);
  ig.addColorStop(0, 'rgba(0,0,0,0)'); ig.addColorStop(1, 'rgba(40,30,20,0.28)');
  c.fillStyle = ig; c.fillRect(cx - dr, cy - dr, dr * 2, dr * 2);
  c.beginPath();
  c.ellipse(cx - dr * 0.22, cy - dr * 0.42, Math.max(0, dr * 0.78), Math.max(0, dr * 0.42), -0.5, 0, Math.PI * 2);
  const spg = c.createLinearGradient(cx - dr * 0.6, cy - dr * 0.8, cx, cy - dr * 0.1);
  spg.addColorStop(0, 'rgba(255,255,255,0.32)'); spg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = spg; c.fill();
  const sw = L.prog(gt, cs + 0.02, 0.7);
  if (sw > 0 && sw < 1) {
    const gx = L.lerp(-dr * 1.4, dr * 1.4, L.ease.inOutCubic(sw));
    c.save();
    c.translate(cx, cy); c.rotate(-0.6);
    const lg = c.createLinearGradient(gx - dr * 0.3, 0, gx + dr * 0.3, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.4)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = lg; c.fillRect(-dr * 1.6, -dr * 1.6, dr * 3.2, dr * 3.2);
    c.restore();
  }
  c.restore();
  // crisp crystal rim highlight (upper left)
  c.beginPath(); c.arc(cx, cy, Math.max(0, dr * 0.995), Math.PI * 0.95, Math.PI * 1.6);
  c.strokeStyle = 'rgba(255,255,255,0.65)'; c.lineWidth = Math.max(0.6, r * 0.008); c.stroke();
}

// ------------------------------------------------------------------ scene
const BOX = { x0: W0.x - 0.16, x1: W0.x + 0.06, y0: W0.y - 0.07, y1: W0.y + 0.08 };
let FADE = null, FC = null;

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 2,
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.32, pitch: 0.8 },
      { t: 0.16, name: 'swish', gain: 0.22, pitch: 1.1 },
      { t: 0.42, name: 'swish', gain: 0.18, pitch: 1.3 },
      { t: 1.25, name: 'shimmer', gain: 0.16, pitch: 1.2 },
      { t: d - 0.6, name: 'swish', gain: 0.14, pitch: 0.9 },
    ];
  },
  drawWorld(c, v) {
    if (v.cam.mpp < 3e-6) return;                 // deep inside the thumb: the micro worlds cover the frame
    if (v.wx(BOX.x1) < -40 || v.wx(BOX.x0) > W + 40 || v.wy(BOX.y1) < -40 || v.wy(BOX.y0) > H + 40) return;
    const sc = v.tl.scenes, mpp = v.cam.mpp, lmpp = Math.log(mpp);
    // beats 10-12 dive into / pull out of the HIP, passing the hand: it only resolves once the body framing returns
    // (mpp ≥ 6e-4), so it never sweeps huge over the bone, the HUD band or the chest
    let fade = 1;
    if (v.gt >= sc[10].start - 0.1 && v.gt < sc[13].start) fade = L.smoothstep(L.clamp(L.invLerp(Math.log(3e-4), Math.log(6e-4), lmpp)));
    if (fade <= 0.002) return;
    // the dial is a bright cream disc: dim it where it would sit under the captions (beats 3-4 push-in / dive) and as a
    // near-plane foreground on the beat-9 pull-out through the thumb
    const yc = v.wy(W0.y), rr = v.ws(R);
    const capO = v.gt > sc[1].start ? L.smoothstep(L.clamp(Math.min(yc + rr - 1235, 1425 - (yc - rr)) / 70)) : 0;
    const nearK = v.gt > sc[9].start - 0.1 && v.gt < sc[10].start ? 1 - L.smoothstep(L.clamp(L.invLerp(Math.log(8e-5), Math.log(4e-4), lmpp))) : 0;
    const veil = Math.max(0.66 * capO, 0.62 * nearK);
    let dc = c;
    if (fade < 0.999) {
      if (!FADE) { FADE = new OffscreenCanvas(W, H); FC = FADE.getContext('2d'); }
      FC.setTransform(1, 0, 0, 1, 0, 0); FC.globalAlpha = 1; FC.globalCompositeOperation = 'source-over';
      FC.clearRect(0, 0, W, H);
      dc = FC;
    }
    this.drawHandWatch(dc, v, veil);
    if (dc !== c) { c.save(); c.globalAlpha = fade; c.drawImage(FADE, 0, 0); c.restore(); }
  },
  drawHandWatch(c, v, veil) {
    const { dy, crown } = press(v.gt, v.tl);
    const h = handFrame(v, dy);
    const rpx = v.ws(R), fine = rpx > 55;
    // v17h/i: in close-up the skin always shows its bones faintly (like the arm and body x-ray); while s09's skeleton is
    // up (beats 9-12) they show at its strength, so the forearm visibly ends in a gripping hand
    const kc = 0.16 * L.smoothstep(L.clamp((rpx - 50) / 60));
    const ks = skeletonK(v), kb = Math.max(ks, kc);
    // 1. palm + thenar + thumb (one skin), the wrist fading into the forearm; 2. the little finger, tip behind the case
    palmLayer(c, v, h, dy, fine, kb, kc * (1 - ks));
    drawFinger(c, v, h, h.fingers[3], fine, kb);
    // 3. the stopwatch (its contact shadow falls on the palm), the caption veil
    drawWatch(c, v, crown, v.gt, v.tl);
    if (veil > 0.002) {
      const cx = v.wx(W0.x), cy = v.wy(W0.y), r = v.ws(R);
      c.save();
      c.beginPath(); c.arc(cx, cy, Math.max(0, r * 1.01), 0, Math.PI * 2);
      c.fillStyle = `rgba(8,11,20,${veil})`; c.fill();
      c.restore();
    }
    // 4. the thumb pad in front of the crown it presses (same skin field, redrawn only round the crown)
    {
      const q0 = h.S([-9, -44]), q1 = h.S([9, -27.5]);
      const bx = [Math.min(q0[0], q1[0]), Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), Math.max(q0[1], q1[1])];
      drawPalmLayer(c, v, h, dy, fine, kb, 0, (cc) => {
        cc.beginPath(); polyPath(cc, h.thumb); cc.clip();
        cc.beginPath(); cc.rect(bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1]); cc.clip();
        cc.beginPath(); cc.rect(-W, -H, 3 * W, 3 * H); cc.arc(v.wx(W0.x), v.wy(W0.y), Math.max(0, v.ws(R) * 0.995), 0, Math.PI * 2); cc.clip('evenodd');
      }, bx, 'thumb');
    }
    // 5. ring, middle, index curled over the bezel (the upper finger overlaps the one below)
    for (const i of [2, 1, 0]) drawFinger(c, v, h, h.fingers[i], fine, kb);
    // the artery inside the hand (wrist → thumb pad), part of the beat-2/3 pulse
    const ak = arteryK(v.gt, v.tl, 'hand');
    if (ak > 0) {
      c.save();
      c.beginPath(); polyPath(c, h.U); c.clip();
      drawArtery(c, v, ART_WRIST, 1, ak * 0.9);
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const t = v.t, d = v.d;
    const lines = [
      { text: 'YOUR BODY IN', y: 492, size: 112, t0: 0.18, col: '#f6f1ea' },
      { text: 'ONE SECOND', y: 618, size: 136, t0: 0.42, col: L.rgba(ACCENT) },
    ];
    // kicker: INSIDE YOU, between hairlines
    const kk = L.enter(t, 0.85, 0.6) * (1 - L.enter(t, d - 0.75, 0.3, L.ease.inCubic));
    if (kk > 0) {
      c.save();
      c.globalAlpha = kk * v.k;
      c.font = L.font(24, 600, L.FONT.body);
      c.fillStyle = 'rgba(232,226,218,0.85)';
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 8;
      const tw = L.trackedText(c, 'INSIDE YOU', W / 2, 372 + (1 - L.ease.outCubic(kk)) * 10, 8, 'center');
      c.shadowBlur = 0;
      const lw = 64 * L.ease.outExpo(kk);
      c.fillStyle = L.rgba(ACCENT, 0.85);
      c.fillRect(W / 2 - tw / 2 - 24 - lw, 363, lw, 2);
      c.fillRect(W / 2 + tw / 2 + 24, 363, lw, 2);
      c.restore();
    }
    lines.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.7, L.ease.outExpo);
      const kout = L.enter(t, d - 0.62 + i * 0.06, 0.32, L.ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      c.save();
      c.globalAlpha = v.k;
      c.font = L.font(ln.size, 800, L.FONT.display);
      c.letterSpacing = '-1px';
      const w = c.measureText(ln.text).width;
      c.letterSpacing = '0px';
      const top = ln.y - ln.size * 0.8, bot = ln.y + ln.size * 0.12;
      c.beginPath(); c.rect(0, top - 10, W, bot - top + 20); c.clip();
      const dy = (1 - kin) * ln.size * 1.05 - kout * ln.size * 1.1;
      c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 22;
      c.fillStyle = ln.col;
      c.textBaseline = 'alphabetic';
      L.trackedText(c, ln.text, W / 2, ln.y + dy, -1, 'center');
      // a light sweep across ONE SECOND once it has landed
      if (i === 1) {
        const sw = L.prog(t, 1.1, 0.9);
        if (sw > 0 && sw < 1) {
          c.shadowBlur = 0;
          c.globalCompositeOperation = 'source-atop';
          const gx = L.lerp(W / 2 - w / 2 - 140, W / 2 + w / 2 + 140, L.ease.inOutCubic(sw));
          const g = c.createLinearGradient(gx - 80, 0, gx + 80, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,240,235,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
          L.trackedText(c, ln.text, W / 2, ln.y + dy, -1, 'center');
        }
      }
      c.restore();
      // accent rule under ONE SECOND (wipes in from the centre)
      if (i === 1) {
        const rk = L.enter(t, 0.9, 0.6, L.ease.outExpo) * (1 - kout);
        if (rk > 0) {
          c.save();
          c.globalAlpha = v.k;
          c.fillStyle = L.rgba(ACCENT, 0.9);
          const rw = 120 * rk;
          c.fillRect(W / 2 - rw / 2, ln.y + 34, rw, 4);
          c.restore();
        }
      }
    });
  },
};
