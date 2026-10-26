// Beat 0 — the hook. A refined glass hand holds a premium mechanical stopwatch in front of the belly; masked headline
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
const EDGE = [70, 98, 140];        // fresnel rim (matches env's glass body)
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
/**
 * Glass material for the hand: dark translucent body, soft fresnel rim inside the edge, warm key light on the
 * upper-left edges. build() adds the outline to the current path. box = [cx, cy, r] screen bounds for gradients.
 * noRim: optional fn adding a region (screen path) where the rim is suppressed (the wrist seam).
 */
function glassShape(c, v, build, box, { top = [30, 41, 64], bot = [11, 15, 26], rim = 1, noRim = null } = {}) {
  const mpp = v.cam.mpp;
  const [cx, cy, r] = box;
  c.save();
  c.beginPath(); build();
  const g = c.createLinearGradient(cx - r * 0.6, cy - r, cx + r * 0.5, cy + r);
  g.addColorStop(0, L.rgba(top)); g.addColorStop(1, L.rgba(bot));
  c.fillStyle = g; c.fill();
  c.clip();
  if (noRim) { c.beginPath(); c.rect(-W, -H, 3 * W, 3 * H); noRim(c); c.clip('evenodd'); }
  const rw = L.clamp(0.0014 / mpp, 1, 12);
  c.beginPath(); build();
  c.lineJoin = 'round';
  c.strokeStyle = L.rgba(EDGE, 0.16 * rim); c.lineWidth = rw * 3.2; c.stroke();
  c.strokeStyle = L.rgba(EDGE, 0.34 * rim); c.lineWidth = rw * 1.5; c.stroke();
  c.strokeStyle = L.rgba([150, 180, 225], 0.5 * rim); c.lineWidth = Math.max(1, rw * 0.45); c.stroke();
  // warm key light on the upper-left edges
  const kg = c.createLinearGradient(cx - r, cy - r, cx + r * 0.2, cy + r * 0.2);
  kg.addColorStop(0, L.rgba(KEY, 0.55 * rim)); kg.addColorStop(0.55, L.rgba(KEY, 0.12 * rim)); kg.addColorStop(1, L.rgba(KEY, 0));
  c.strokeStyle = kg; c.lineWidth = rw * 1.3; c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the hand (offsets from the watch centre, metres)
const off = (dx, dy, r) => (r == null ? [W0.x + dx, W0.y + dy] : [W0.x + dx, W0.y + dy, r]);
const PALM = [off(-0.0505, 0.009), off(-0.0465, -0.006), off(-0.038, -0.017), off(-0.022, -0.0265), off(0.004, -0.0295),
  off(0.023, -0.023), off(0.0305, -0.004), off(0.029, 0.018), off(0.016, 0.034), off(-0.004, 0.0425), off(-0.022, 0.048), off(-0.04, 0.032)];
// fingers curl around the right edge of the case, seen from the back of the hand:
// [angle where it crosses the case edge (rad, + = down), half-width at the knuckle (m), reach of the bend outside the edge (m)]
// index and middle are the longest; the little finger is ~0.8x and slimmer
const FINGERS = [[-0.64, 0.0057, 0.0186], [-0.22, 0.0062, 0.0204], [0.2, 0.0058, 0.0188], [0.6, 0.0046, 0.0146]];
const TIP_IN = 0.0042;                                                  // how far the fingertip rests in over the bezel
function fingerGeo(a, hw, reach) {
  const ex = W0.x + Math.cos(a) * R, ey = W0.y + Math.sin(a) * R;      // where it crosses the case edge
  const phi = a * 0.5, dx = Math.cos(phi), dy = Math.sin(phi);         // the fingers run nearly parallel
  const at = (s, n = 0) => [ex + dx * s - dy * n, ey + dy * s + dx * n];
  const s0 = -TIP_IN * (0.85 + 0.15 * hw / 0.006), s1 = reach;
  // half-width along the finger, u 0 (tip) .. 1 (PIP bend): tapers to ~0.75x at the tip, a faint DIP swell
  const width = (u) => hw * (0.64 + 0.3 * L.smoothstep(Math.min(1, u * 1.1)) + 0.05 * Math.exp(-Math.pow((u - 0.36) / 0.07, 2)) + 0.07 * Math.exp(-Math.pow((u - 0.86) / 0.09, 2)));
  const sag = (u) => hw * 0.22 * Math.sin(Math.PI * u);              // the finger bows a touch toward the palm
  return { at, phi, s0, s1, hw, width, sag };
}
/** Outline of one finger (screen path): tapered body, elongated rounded tip (distal phalanx), rounder knuckle at the bend. */
function fingerPath(c, v, g, grow = 0) {
  const { at, s0, s1, width, sag } = g;
  const N = 14, Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, s = L.lerp(s0, s1, u), wv = width(u) + grow, n = sag(u);
    Lp.push(at(s, n - wv)); Rp.push(at(s, n + wv));
  }
  const P0 = (q) => [v.wx(q[0]), v.wy(q[1])];
  // flattened end caps: the tip a squarish rounded end (rounded rectangle), the bend a fuller curve
  const cap = (s, n, wv, dir, len, ex) => {
    const pts = [];
    for (let j = 1; j < 12; j++) {
      const th = (j / 12) * Math.PI;                     // 0..pi around the cap
      const e = Math.pow(Math.abs(Math.sin(th)), ex);     // superellipse (ex < 1: flatter than a semicircle)
      pts.push(at(s + dir * len * e, n - dir * Math.cos(th) * wv));
    }
    return pts;
  };
  const wTip = width(0) + grow, wEnd = width(1) + grow;
  const tipCap = cap(s0, sag(0), wTip, -1, wTip * 0.85, 0.85);
  const endCap = cap(s1, sag(1), wEnd, 1, wEnd * 0.7, 1);
  const all = [...Lp, ...endCap, ...Rp.slice().reverse(), ...tipCap].map(P0);
  c.moveTo(all[0][0], all[0][1]);
  for (let i = 1; i < all.length; i++) c.lineTo(all[i][0], all[i][1]);
  c.closePath();
}
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
  return [off(-0.037, -0.006, 0.0108), off(-0.0325, -0.021 + dy * 0.12, 0.0092), off(-0.0265, -0.0322 + dy * 0.35, 0.0084),
    off(-0.016, -0.0394 + dy * 0.7, 0.0081), off(-0.002, -0.0411 + dy, 0.0085), off(0.0075, -0.0414 + dy, 0.0071),
    off(0.0128, -0.0418 + dy, 0.0054)];   // the pad swells over the crown, then the distal phalanx tapers
}
/** Adds the thumb's outline (screen path) at gt: s04 clips the fingerprint whorl to it. */
export function thumbOutline(c, v) { tubePath(c, v, thumbSpine(press(v.gt, v.tl).dy), 6); }

/** Ivory hand bones (x-ray look, matching s09's skeleton), each set clipped to its own glass shape. */
function drawHandBones(c, v, k, dy) {
  const X = (x) => v.wx(x), Y = (y) => v.wy(y), S = (m) => v.ws(m);
  const IV = [228, 218, 200];
  const seg = (a, b, r) => {
    c.beginPath(); c.moveTo(X(a[0]), Y(a[1])); c.lineTo(X(b[0]), Y(b[1]));
    c.lineWidth = Math.max(1.4, S(r * 2)); c.strokeStyle = L.rgba(IV, 0.2 * k); c.stroke();
    c.lineWidth = Math.max(0.8, S(r * 0.9)); c.strokeStyle = L.rgba(IV, 0.5 * k); c.stroke();
    for (const q of [a, b]) { c.beginPath(); c.arc(X(q[0]), Y(q[1]), Math.max(0.8, S(r * 1.05)), 0, Math.PI * 2); c.fillStyle = L.rgba(IV, 0.32 * k); c.fill(); }
  };
  c.save();
  c.lineCap = 'round';
  // palm: two rows of carpals at the wrist, then metacarpals fanning toward the knuckles behind the case
  c.save();
  c.beginPath(); blobPath(c, v, PALM); c.clip();
  const CARP = [[-0.046, 0.026], [-0.0415, 0.0305], [-0.0365, 0.034], [-0.0315, 0.0365], [-0.041, 0.019], [-0.036, 0.0235], [-0.031, 0.027], [-0.026, 0.0295]];
  for (const [dx, dyy] of CARP) {
    c.beginPath(); c.ellipse(X(W0.x + dx), Y(W0.y + dyy), Math.max(1, S(0.0028)), Math.max(1, S(0.0022)), -0.6, 0, Math.PI * 2);
    c.fillStyle = L.rgba(IV, 0.26 * k); c.fill(); c.strokeStyle = L.rgba(IV, 0.45 * k); c.lineWidth = 1; c.stroke();
  }
  [[-0.036, 0.013, -0.005, -0.012], [-0.031, 0.018, 0.0, -0.002], [-0.026, 0.022, 0.003, 0.009], [-0.021, 0.026, 0.004, 0.019]].forEach(([x0, y0, x1, y1]) => seg(off(x0, y0), off(x1, y1), 0.0026));
  c.restore();
  // fingers: distal + middle phalanx along each finger (tip over the bezel → bend outside the case)
  for (const [a, hw, reach] of FINGERS) {
    const g = fingerGeo(a, hw, reach), sAt = (u) => L.lerp(g.s0, g.s1, u);
    c.save();
    c.beginPath(); fingerPath(c, v, g); c.clip();
    const P_ = (u) => g.at(sAt(u), g.sag(u));
    seg(P_(0.08), P_(0.32), hw * 0.42); seg(P_(0.42), P_(0.86), hw * 0.5);
    c.restore();
  }
  // thumb: metacarpal, proximal and distal phalanx
  c.save();
  c.beginPath(); tubePath(c, v, thumbSpine(dy), 6); blobPath(c, v, PALM); c.clip();
  seg(off(-0.0395, 0.012), off(-0.0345, -0.010 + dy * 0.05), 0.0032);
  seg(off(-0.0325, -0.0145 + dy * 0.12), off(-0.0215, -0.035 + dy * 0.5), 0.0028);
  seg(off(-0.0155, -0.0395 + dy * 0.72), off(0.006, -0.0422 + dy), 0.0024);
  c.restore();
  c.restore();
}

function drawHand(c, v, part, dy) {
  const mpp = v.cam.mpp, rpx = R / mpp;
  const fine = rpx > 55;
  const X = (x) => v.wx(x), Y = (y) => v.wy(y), S = (m) => v.ws(m);
  const cx = X(W0.x), cy = Y(W0.y);
  if (part === 'palm') {
    // the forearm region where the palm's rim is suppressed (the glass flows on from env's forearm)
    const fa = (cc) => {
      const ax = X(ELBOW.x), ay = Y(ELBOW.y), bx = X(WRIST.x), by = Y(WRIST.y);
      const ang = Math.atan2(by - ay, bx - ax), ra = S(0.037) * 0.98, rb = S(0.026) * 0.98;
      cc.moveTo(ax + Math.cos(ang + Math.PI / 2) * ra, ay + Math.sin(ang + Math.PI / 2) * ra);
      cc.lineTo(bx + Math.cos(ang + Math.PI / 2) * rb, by + Math.sin(ang + Math.PI / 2) * rb);
      cc.lineTo(bx - Math.cos(ang + Math.PI / 2) * rb, by - Math.sin(ang + Math.PI / 2) * rb);
      cc.lineTo(ax - Math.cos(ang + Math.PI / 2) * ra, ay - Math.sin(ang + Math.PI / 2) * ra);
      cc.closePath();
    };
    glassShape(c, v, () => blobPath(c, v, PALM), [cx - S(0.01), cy, S(0.05)], { top: [32, 43, 67], bot: [12, 16, 28], noRim: fa });
    if (fine) {
      // the thenar crease and the heel of the hand: soft shading lines
      c.save();
      c.beginPath(); blobPath(c, v, PALM); c.clip();
      c.strokeStyle = 'rgba(6,9,16,0.35)'; c.lineWidth = Math.max(1, S(0.0012)); c.lineCap = 'round';
      c.beginPath(); c.moveTo(X(W0.x - 0.04), Y(W0.y + 0.014)); c.quadraticCurveTo(X(W0.x - 0.03), Y(W0.y + 0.034), X(W0.x - 0.012), Y(W0.y + 0.041)); c.stroke();
      c.restore();
    }
    return;
  }
  if (part === 'fingers') {
    for (let i = FINGERS.length - 1; i >= 0; i--) {
      const [a, hw, reach] = FINGERS[i];
      const g = fingerGeo(a, hw, reach);
      const { at, phi, s0, s1, width, sag } = g;
      const sAt = (u) => L.lerp(s0, s1, u);
      const mid = at(sAt(0.5), 0);
      const tx = X(mid[0]), ty = Y(mid[1]);
      // soft contact shadow cast on the finger below (and the case edge)
      if (fine) {
        c.save();
        c.translate(-Math.sin(phi) * S(hw * 0.32), Math.cos(phi) * S(hw * 0.32));
        c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = S(0.0022);
        c.beginPath(); fingerPath(c, v, g);
        c.fillStyle = 'rgba(0,0,0,0.26)'; c.fill();
        c.restore();
      }
      glassShape(c, v, () => fingerPath(c, v, g), [tx, ty, S(0.016)], { top: [33, 45, 70], bot: [15, 20, 34], rim: 0.6 });
      if (fine) {
        c.save();
        c.beginPath(); fingerPath(c, v, g); c.clip();
        c.lineCap = 'round';
        // faint phalanx bones inside the glass (distal, middle)
        c.strokeStyle = 'rgba(160,185,225,0.07)';
        const bone = (u0, u1, r) => {
          const p0 = at(sAt(u0), sag(u0)), p1 = at(sAt(u1), sag(u1));
          c.beginPath(); c.moveTo(X(p0[0]), Y(p0[1])); c.lineTo(X(p1[0]), Y(p1[1])); c.lineWidth = Math.max(1, S(r)); c.stroke();
        };
        bone(0.07, 0.31, hw * 0.55); bone(0.41, 0.84, hw * 0.68);
        // nail: small, set back from the tip, a soft cuticle arc behind it (no specular tick)
        const nu = 0.2, nc = at(sAt(nu), sag(nu) - width(nu) * 0.14);
        const nl = S((s1 - s0) * 0.085), nwid = S(width(nu) * 0.4);
        c.save();
        c.translate(X(nc[0]), Y(nc[1])); c.rotate(phi);
        c.beginPath(); c.ellipse(0, 0, Math.max(0, nl), Math.max(0, nwid), 0, 0, Math.PI * 2);
        const ng = c.createLinearGradient(0, -nwid, 0, nwid);
        ng.addColorStop(0, 'rgba(165,188,228,0.1)'); ng.addColorStop(1, 'rgba(80,98,134,0.03)');
        c.fillStyle = ng; c.fill();
        c.strokeStyle = 'rgba(150,175,215,0.11)'; c.lineWidth = Math.max(0.7, S(0.00025)); c.stroke();
        c.beginPath(); c.ellipse(nl * 0.35, 0, Math.max(0, nl * 0.9), Math.max(0, nwid * 1.15), 0, -Math.PI * 0.42, Math.PI * 0.42);
        c.strokeStyle = 'rgba(5,8,15,0.22)'; c.lineWidth = Math.max(0.7, S(0.0003)); c.stroke();
        c.restore();
        // DIP crease (two fine lines) and the PIP knuckle: a lit swell with a few short wrinkles
        const crease = (u, al, span = 0.7, lwm = 1) => {
          const wv = width(u), k0 = at(sAt(u) + wv * 0.08, sag(u) - wv * span), k1 = at(sAt(u) + wv * 0.08, sag(u) + wv * span), km = at(sAt(u) - wv * 0.06, sag(u));
          c.beginPath(); c.moveTo(X(k0[0]), Y(k0[1])); c.quadraticCurveTo(X(km[0]), Y(km[1]), X(k1[0]), Y(k1[1]));
          c.strokeStyle = `rgba(5,8,15,${al})`; c.lineWidth = Math.max(0.8, S(0.00042 * lwm)); c.stroke();
        };
        crease(0.355, 0.3); crease(0.385, 0.16, 0.5, 0.7);
        const kn = at(sAt(0.86), sag(0.86) - width(0.86) * 0.1);
        L.lightBlob(c, X(kn[0]), Y(kn[1]), S(hw * 0.9), [150, 175, 220], 0.07);
        crease(0.8, 0.16, 0.42, 0.7); crease(0.835, 0.2, 0.5, 0.8); crease(0.87, 0.14, 0.4, 0.7);
        // cylindrical shading: a lit band along the upper side, a cool subsurface core, a darker underside
        const band = (off2, wmul, col) => {
          c.beginPath();
          for (let j = 0; j <= 10; j++) { const u = 0.06 + 0.88 * j / 10, q = at(sAt(u), sag(u) + width(u) * off2); j ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1])); }
          c.strokeStyle = col; c.lineWidth = Math.max(1, S(hw * wmul)); c.stroke();
        };
        band(-0.5, 0.36, 'rgba(170,195,235,0.1)');
        band(-0.62, 0.1, 'rgba(255,226,214,0.08)');
        band(0.05, 0.7, 'rgba(70,92,140,0.07)');
        band(0.7, 0.45, 'rgba(3,5,10,0.22)');
        // the finger turns away round the back of the case: its outer part falls into shadow (no flat end cap)
        {
          const a0 = at(sAt(0.5), 0), a1 = at(s1 + width(1) * 0.9, 0);
          const tg = c.createLinearGradient(X(a0[0]), Y(a0[1]), X(a1[0]), Y(a1[1]));
          tg.addColorStop(0, 'rgba(3,5,10,0)'); tg.addColorStop(0.55, 'rgba(3,5,10,0.3)'); tg.addColorStop(1, 'rgba(3,5,10,0.7)');
          c.fillStyle = tg; c.fillRect(0, 0, W, H);
        }
        // the fingertip catches the light where it presses on the bezel
        const tp = at(s0 + width(0) * 0.25, sag(0) - width(0) * 0.25);
        L.lightBlob(c, X(tp[0]), Y(tp[1]), S(hw * 1.1), [170, 195, 235], 0.08);
        c.restore();
      }
    }
    return;
  }
  if (part === 'thumb') {
    const sp = thumbSpine(dy);
    glassShape(c, v, () => tubePath(c, v, sp, 6), [X(W0.x - 0.02), Y(W0.y - 0.03), S(0.03)], { top: [36, 48, 76], bot: [14, 19, 33], noRim: (cc) => blobPath(cc, v, PALM.map(([x, y]) => [x + (x - W0.x) * -0.04, y + (y - W0.y) * -0.04])) });
    if (fine) {
      c.save();
      c.beginPath(); tubePath(c, v, sp, 6); c.clip();
      // glass anatomy: the thumb's bones, faint inside the glass
      c.lineCap = 'round';
      const bone = (a, b, r) => { c.beginPath(); c.moveTo(X(a[0]), Y(a[1])); c.lineTo(X(b[0]), Y(b[1])); c.lineWidth = Math.max(1, S(r)); c.stroke(); };
      // cylindrical shading of the distal thumb: lit top edge, cool core, shadowed underside where it meets the crown
      {
        const tg = c.createLinearGradient(0, Y(W0.y - 0.0496 + dy), 0, Y(W0.y - 0.0326 + dy));
        tg.addColorStop(0, 'rgba(180,204,240,0.12)'); tg.addColorStop(0.3, 'rgba(120,145,195,0.04)');
        tg.addColorStop(0.62, 'rgba(3,5,10,0)'); tg.addColorStop(1, 'rgba(3,5,10,0.32)');
        c.fillStyle = tg; c.fillRect(X(W0.x - 0.03), 0, S(0.05), H);
      }
      c.strokeStyle = 'rgba(160,185,225,0.045)';
      bone(off(-0.0345, -0.012 + dy * 0.05), off(-0.029, -0.0285 + dy * 0.3), 0.0056);
      bone(off(-0.0255, -0.0335 + dy * 0.38), off(-0.0165, -0.0398 + dy * 0.7), 0.0046);
      bone(off(-0.0125, -0.0415 + dy * 0.75), off(0.006, -0.0426 + dy), 0.0040);
      // nail on the top edge near the tip
      const nb = off(0.0068, -0.0471 + dy), ne = off(0.0152, -0.0463 + dy);
      c.beginPath();
      c.moveTo(X(nb[0]), Y(nb[1]));
      c.quadraticCurveTo(X(W0.x + 0.0118), Y(W0.y - 0.0479 + dy), X(ne[0]), Y(ne[1]));
      c.quadraticCurveTo(X(W0.x + 0.0158), Y(W0.y - 0.0452 + dy), X(W0.x + 0.0142), Y(W0.y - 0.0449 + dy));
      c.quadraticCurveTo(X(W0.x + 0.0102), Y(W0.y - 0.0458 + dy), X(nb[0]), Y(nb[1]));
      c.fillStyle = 'rgba(140,165,210,0.16)'; c.fill();
      c.strokeStyle = 'rgba(170,195,235,0.2)'; c.lineWidth = Math.max(0.8, S(0.0003)); c.stroke();
      // the pad pressing on the crown: a soft darker swell on its underside
      const pd = off(-0.0015, -0.0372 + dy);
      c.save(); c.translate(X(pd[0]), Y(pd[1]));
      c.scale(1, 0.42);
      const pg = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, S(0.0085)));
      pg.addColorStop(0, 'rgba(4,7,14,0.32)'); pg.addColorStop(1, 'rgba(4,7,14,0)');
      c.fillStyle = pg; c.beginPath(); c.arc(0, 0, Math.max(0, S(0.0085)), 0, Math.PI * 2); c.fill();
      c.restore();
      // IP joint crease
      const j0 = off(-0.0155, -0.0475 + dy * 0.7), j1 = off(-0.0135, -0.0338 + dy * 0.7);
      c.beginPath(); c.moveTo(X(j0[0]), Y(j0[1])); c.quadraticCurveTo(X(W0.x - 0.0118), Y(W0.y - 0.041 + dy * 0.7), X(j1[0]), Y(j1[1]));
      c.strokeStyle = 'rgba(5,8,15,0.4)'; c.lineWidth = Math.max(1, S(0.0007)); c.stroke();
      c.restore();
    }
  }
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
  const hk = L.smoothstep(L.prog(gt, 1.25, 0.6)) * (1 - L.smoothstep(L.prog(gt, cs - 0.25, 0.3)));
  if (hk > 0) {
    const pul = 0.75 + 0.25 * Math.sin(gt * 4.2);
    c.beginPath(); c.arc(cx, cy, Math.max(0, dr * 0.9), -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2) / 60 * L.ease.outCubic(L.prog(gt, 1.25, 0.7)));
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
    drawHand(c, v, 'palm', dy);
    drawWatch(c, v, crown, v.gt, v.tl);
    if (veil > 0.002) {
      const cx = v.wx(W0.x), cy = v.wy(W0.y), r = v.ws(R);
      c.save();
      c.beginPath(); c.arc(cx, cy, Math.max(0, r * 1.01), 0, Math.PI * 2);
      c.fillStyle = `rgba(8,11,20,${veil})`; c.fill();
      c.restore();
    }
    drawHand(c, v, 'fingers', dy);
    // the artery inside the hand (wrist → thumb pad), part of the beat-2/3 pulse
    drawHand(c, v, 'thumb', dy);
    // while s09's x-ray skeleton is up (beats 9-12) the hand shows its bones too, so the forearm visibly ends in a
    // gripping hand: carpals + metacarpals in the palm, phalanges along each finger and the thumb
    const kb = skeletonK(v);
    if (kb > 0.01) drawHandBones(c, v, kb, dy);
    const ak = arteryK(v.gt, v.tl, 'hand');
    if (ak > 0) {
      c.save();
      c.beginPath(); tubePath(c, v, thumbSpine(dy), 6); blobPath(c, v, PALM); c.clip();
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
