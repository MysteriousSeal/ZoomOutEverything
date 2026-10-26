// Shared ant renderer for ep 21 (orchestrator-owned; builders import it, never edit — needs go in "sharedRequests").
//
// drawAnt(ctx, o) draws ONE anatomically correct worker ant in SIDE VIEW (Formica/Atta-like proportions):
//   head (compound eye, toothed mandibles), elbowed antennae (long scape + 11-segment funiculus ending in a club),
//   mesosoma (pronotum hump, mesonotum, sloping propodeum), a single petiole node, gaster with tergite bands.
//   Six legs, ALL jointed to the mesosoma (coxa → femur → tibia → tarsus with claws), walking an alternating tripod
//   gait: near-front + far-mid + near-hind move together, then far-front + near-mid + far-hind. The 3 far-side legs
//   and the far antenna are drawn behind the body, darker.
//
// o: {
//   x, y        screen point on the ground under the mesosoma (feet touch y when angle = 0)
//   len         body length in px, gaster tip → mandible tip (a 5 mm ant at mpp m/px: len = 0.005 / mpp)
//   dir         +1 faces right (default), −1 faces left
//   angle       rotation (rad, clockwise on screen) about (x, y): e.g. −Math.PI / 2 = head pointing UP (the line)
//   phase       gait phase in strides (1 = one full tripod cycle). For a walking ant: phase = gaitPhase(distance_m)
//   walk        stride amplitude 0..1 (0 = standing still, legs planted)
//   t           seconds, for antenna sweeps and breathing (default 0)
//   col         body colour [r,g,b] (default dark brown-black); legs are derived from it
//   alpha, detail (0..1: hairs, specular, segment lines; auto-reduced when small)
//   leaf        optional {col:[r,g,b], size} — a leaf fragment held up in the mandibles (leafcutters)
// }
// LOD: len < 7 px → a 3-blob silhouette with a leg haze; < 2 px → one dot. Cheap enough for hundreds per frame.
import * as L from '../../../engine/runtime/lib.js';

const TAU = Math.PI * 2;
// local frame: x forward (toward the head), y DOWN (canvas), units of body length; ground at y = 0, origin under the mesosoma
const H0 = 0.15;                                  // body underside clearance
const HIPS = { front: [0.19, -0.155], mid: [0.095, -0.14], hind: [0.005, -0.14] };
const SEG = {                                     // coxa, femur, tibia, tarsus (body lengths)
  front: [0.05, 0.17, 0.165, 0.13],
  mid: [0.045, 0.19, 0.19, 0.15],
  hind: [0.05, 0.235, 0.235, 0.19],
};
const FOOT = { front: 0.42, mid: 0.13, hind: -0.27 };   // neutral tarsus-tip x on the ground
const TARS_DIR = { front: 1, mid: 0.35, hind: -1 };       // which way the tarsus lies along the ground
const STRIDE = 0.15;

function ik(A, B, a, b) {
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const d = L.clamp(Math.hypot(dx, dy), Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const ang = Math.atan2(dy, dx);
  const off = Math.acos(L.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const k1 = [A[0] + Math.cos(ang + off) * a, A[1] + Math.sin(ang + off) * a];
  const k2 = [A[0] + Math.cos(ang - off) * a, A[1] + Math.sin(ang - off) * a];
  return k1[1] < k2[1] ? k1 : k2;                // the knee bends UP (smaller canvas y)
}

/** one leg: returns joint points [hip, coxaEnd, knee, ankle, claw] in local units */
function legPoints(which, ph, walk, far) {
  const [cx, fe, ti, ta] = SEG[which];
  const hip = HIPS[which];
  const coxaEnd = [hip[0] + (which === 'hind' ? -0.02 : which === 'front' ? 0.02 : 0), hip[1] + cx];
  const f = ((ph % 1) + 1) % 1;
  // stance (f < 0.5): foot slides back on the ground; swing: lifts and returns forward
  let off, lift;
  if (f < 0.5) { off = L.lerp(0.5, -0.5, f / 0.5); lift = 0; }
  else { const s = (f - 0.5) / 0.5; off = L.lerp(-0.5, 0.5, L.ease.inOutCubic(s)); lift = Math.sin(Math.PI * s) * 0.07; }
  const tipX = FOOT[which] + off * STRIDE * walk + (far ? -0.015 : 0);
  const claw = [tipX, -lift];
  const td = TARS_DIR[which];
  const ankle = [tipX - td * ta * 0.92, -lift - ta * 0.3];
  const knee = ik(coxaEnd, ankle, fe, ti);
  return [hip, coxaEnd, knee, ankle, claw];
}

function strokeLeg(c, pts, col, w) {
  const [hip, cx, knee, ankle, claw] = pts;
  c.strokeStyle = col;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = w * 1.5; c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(cx[0], cx[1]); c.stroke();     // coxa
  c.lineWidth = w * 1.25; c.beginPath(); c.moveTo(cx[0], cx[1]); c.lineTo(knee[0], knee[1]); c.stroke(); // femur
  c.lineWidth = w; c.beginPath(); c.moveTo(knee[0], knee[1]); c.lineTo(ankle[0], ankle[1]); c.stroke();   // tibia
  // tarsus: 5 tapering segments, sagging slightly to the ground
  c.lineWidth = w * 0.6;
  c.beginPath(); c.moveTo(ankle[0], ankle[1]);
  c.quadraticCurveTo((ankle[0] + claw[0]) / 2, Math.max(ankle[1], claw[1]) + 0.005, claw[0], claw[1]);
  c.stroke();
  // knee + tibial spur dots
  c.fillStyle = col;
  c.beginPath(); c.arc(knee[0], knee[1], w * 0.75, 0, TAU); c.fill();
}

function antenna(c, base, t, seed, col, w, far) {
  const sweep = 0.12 * Math.sin(t * 3.1 + seed) + 0.06 * L.noise1(t * 1.3, seed);
  const a1 = -1.0 + sweep * 0.4 + (far ? 0.12 : 0);          // scape: up and forward
  const elbow = [base[0] + Math.cos(a1) * 0.2, base[1] + Math.sin(a1) * 0.2];
  const a2 = 0.62 + sweep + (far ? -0.1 : 0);               // funiculus: forward and down, tapping
  c.strokeStyle = col;
  c.lineCap = 'round';
  c.lineWidth = w * 1.1;
  c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(elbow[0], elbow[1]); c.stroke();
  // funiculus: 11 segments with a slight curl, thicker club at the tip
  let p = elbow, ang = a2;
  for (let i = 0; i < 11; i++) {
    const segL = 0.026 + (i > 7 ? 0.004 : 0);
    ang += 0.035;
    const q = [p[0] + Math.cos(ang) * segL, p[1] + Math.sin(ang) * segL];
    c.lineWidth = w * (i > 7 ? 1.25 : 0.85);
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke();
    p = q;
  }
}

function bodyPaths(c) {
  return {
    gaster() { c.beginPath(); c.ellipse(-0.3, -0.175, 0.2, 0.13, 0.14, 0, TAU); },
    petiole() {
      c.beginPath();
      c.moveTo(-0.115, -0.15); c.lineTo(-0.105, -0.205);
      c.quadraticCurveTo(-0.075, -0.255, -0.05, -0.2);
      c.lineTo(-0.035, -0.16); c.closePath();
    },
    meso() {
      c.beginPath();
      c.moveTo(-0.045, -0.16);                          // propodeum foot (to the petiole)
      c.quadraticCurveTo(-0.04, -0.235, 0.0, -0.245);    // propodeal slope
      c.quadraticCurveTo(0.05, -0.24, 0.08, -0.255);     // mesonotum
      c.quadraticCurveTo(0.16, -0.305, 0.225, -0.25);    // pronotum hump
      c.quadraticCurveTo(0.25, -0.225, 0.245, -0.19);    // neck
      c.quadraticCurveTo(0.2, -0.13, 0.12, -0.135);      // underside (coxae attach here)
      c.quadraticCurveTo(0.03, -0.13, -0.045, -0.16);
      c.closePath();
    },
    head() { c.beginPath(); c.ellipse(0.335, -0.215, 0.105, 0.088, 0.22, 0, TAU); },
  };
}

export function drawAnt(c, o) {
  const len = o.len ?? 100;
  if (!(len > 0.4)) return;
  const dir = o.dir ?? 1, angle = o.angle ?? 0, walk = o.walk ?? 1, ph = o.phase ?? 0, t = o.t ?? 0;
  const col = o.col ?? [34, 21, 14];
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(o.x, o.y);
  c.rotate(angle);
  c.scale(dir * len, len);
  if (len < 2) {
    c.fillStyle = L.rgba(col);
    c.beginPath(); c.arc(0, -0.2, 0.5 / len + 0.3, 0, TAU); c.fill();
    c.restore(); return;
  }
  const bob = walk * 0.006 * Math.sin(ph * TAU * 2);
  if (len < 7) {
    c.fillStyle = L.rgba(col);
    c.beginPath(); c.ellipse(-0.3, -0.18 + bob, 0.2, 0.13, 0.14, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0.1, -0.21 + bob, 0.15, 0.07, -0.1, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0.34, -0.22 + bob, 0.1, 0.085, 0.2, 0, TAU); c.fill();
    c.strokeStyle = L.rgba(col, 0.5); c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(-0.25, 0); c.lineTo(0.1, -0.15); c.lineTo(0.42, 0); c.stroke();
    c.restore(); return;
  }
  const detail = (o.detail ?? 1) * L.clamp(L.invLerp(20, 90, len));
  const legCol = L.mix(col, [120, 80, 50], 0.28);
  const farCol = L.rgba(L.mix(col, [8, 6, 5], 0.45));
  const nearLeg = L.rgba(legCol);
  const w = Math.max(0.022, 1.3 / len);             // leg width (local units), never thinner than ~1 px
  // tripod groups: A = near-front, far-mid, near-hind (phase ph); B = the others (ph + 0.5)
  const legs = (far) => ['front', 'mid', 'hind'].map((k) => {
    const groupA = (k === 'mid') === far;
    return [k, legPoints(k, ph + (groupA ? 0 : 0.5), walk, far)];
  });
  const B = bodyPaths(c);
  // ---- far side: antenna + legs (behind the body)
  c.save();
  c.translate(0.012, -0.012);
  antenna(c, [0.39, -0.265], t, 1.7, farCol, w * 0.9, true);
  for (const [, pts] of legs(true)) strokeLeg(c, pts, farCol, w * 0.95);
  c.restore();
  // ---- body (with a gentle bob)
  c.save();
  c.translate(0, bob);
  const shade = (y0, y1, light, dark) => {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, L.rgba(light)); g.addColorStop(1, L.rgba(dark));
    return g;
  };
  const lightC = L.mix(col, [150, 110, 80], 0.32), darkC = L.mix(col, [0, 0, 0], 0.35);
  // gaster + tergite bands
  B.gaster(); c.fillStyle = shade(-0.3, -0.05, lightC, darkC); c.fill();
  if (detail > 0.05) {
    c.save(); B.gaster(); c.clip();
    c.strokeStyle = L.rgba(L.mix(col, [190, 150, 110], 0.4), 0.55 * detail);
    c.lineWidth = 0.008;
    for (const dx of [-0.2, -0.3, -0.39]) { c.beginPath(); c.ellipse(dx + 0.24, -0.175, 0.24, 0.16, 0.14, Math.PI * 0.62, Math.PI * 1.38); c.stroke(); }
    c.restore();
  }
  // petiole node (+ its peduncle into the gaster)
  B.petiole(); c.fillStyle = shade(-0.25, -0.15, lightC, darkC); c.fill();
  // mesosoma
  B.meso(); c.fillStyle = shade(-0.3, -0.13, lightC, darkC); c.fill();
  // head
  B.head(); c.fillStyle = shade(-0.3, -0.13, L.mix(lightC, col, 0.3), darkC); c.fill();
  // mandibles: toothed blades meeting in front
  c.fillStyle = L.rgba(L.mix(col, [90, 50, 25], 0.35));
  c.beginPath();
  c.moveTo(0.405, -0.19); c.quadraticCurveTo(0.47, -0.19, 0.5, -0.145);
  for (let i = 0; i < 4; i++) { const x = 0.495 - i * 0.022; c.lineTo(x - 0.008, -0.155 + i * 0.002); c.lineTo(x - 0.012, -0.147 + i * 0.002); }
  c.lineTo(0.41, -0.16); c.closePath(); c.fill();
  // compound eye
  c.fillStyle = 'rgb(14,10,8)';
  c.beginPath(); c.ellipse(0.355, -0.245, 0.03, 0.022, 0.2, 0, TAU); c.fill();
  if (detail > 0.1) {
    c.fillStyle = `rgba(255,250,235,${0.55 * detail})`;
    c.beginPath(); c.ellipse(0.348, -0.252, 0.009, 0.006, 0.2, 0, TAU); c.fill();
  }
  // specular sheen: chitin highlights along the top of each tagma
  if (detail > 0.05) {
    c.fillStyle = `rgba(255,236,205,${0.22 * detail})`;
    c.beginPath(); c.ellipse(-0.3, -0.27, 0.11, 0.025, 0.1, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0.15, -0.272, 0.06, 0.014, -0.35, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0.32, -0.285, 0.05, 0.013, 0.2, 0, TAU); c.fill();
  }
  // fine setae on the gaster and mesosoma
  if (detail > 0.4) {
    c.strokeStyle = `rgba(210,180,140,${0.4 * detail})`;
    c.lineWidth = 0.004;
    const r = L.rng(91);
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI * (0.15 + 0.7 * r()), gx = -0.3 + Math.cos(a) * 0.2, gy = -0.175 + Math.sin(a) * 0.13;
      c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.cos(a) * 0.025 - 0.01, gy + Math.sin(a) * 0.025); c.stroke();
    }
  }
  // leaf fragment held in the mandibles (leafcutters): a crescent of leaf raised over the head like a sail
  if (o.leaf) {
    const s = o.leaf.size ?? 0.55, lc = o.leaf.col ?? [96, 150, 60];
    c.save();
    c.translate(0.47, -0.17);
    c.rotate(-0.35);
    c.fillStyle = L.rgba(lc);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-s * 0.15, -s * 0.9, -s * 0.55, -s * 1.05);
    c.quadraticCurveTo(-s * 0.9, -s * 0.55, -s * 0.62, -s * 0.05);
    c.closePath(); c.fill();
    c.strokeStyle = L.rgba(L.mix(lc, [230, 240, 180], 0.4), 0.7);
    c.lineWidth = 0.008;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-s * 0.52, -s * 0.95); c.stroke();
    c.restore();
  }
  c.restore();
  // ---- near side: legs + antenna (in front of the body)
  for (const [, pts] of legs(false)) strokeLeg(c, pts, nearLeg, w);
  c.save(); c.translate(0, bob);
  antenna(c, [0.39, -0.265], t, 0.3, nearLeg, w * 0.9, false);
  c.restore();
  c.restore();
}

/** Body length (px) of a real ant of `metres` at the view's scale. */
export const antPx = (v, metres = 0.005) => metres / v.cam.mpp;
/** Gait phase for an ant that has walked `distM` metres (body advances 2 × STRIDE = 0.30 body lengths per tripod cycle at full walk). */
export const gaitPhase = (distM, lenM = 0.005) => distM / (0.3 * lenM);
