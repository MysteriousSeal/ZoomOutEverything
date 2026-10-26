// Beat 9 — "To replace them, your bone marrow never stops."
// The camera pulls 4 decades out of the venule, through the thumb, to the whole body. A refined glass SKELETON resolves
// inside the figure (clipped to env.bodyPath); the adult red-marrow sites ignite top to bottom in the accent (skull,
// sternum, ribs, spine, pelvis, femur and humerus heads); the right iliac crest (P.marrow) pulses last under a
// lock-on reticle: beat 10 dives there. While the camera dives (beat 10) the ilium becomes an opaque bone surface
// around s10's cut-away. OWNS the skeleton from beat 9 to the start of beat 13 (faint ribcage over the lungs in 12).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P, ELBOW, WRIST, bodyPath, bodyOnScreen } from '../env.js';
import { zoomSpeed } from '../camera.js';

const { W, H } = L;
const IVORY = [228, 218, 200];

// ------------------------------------------------------------------ geometry (x metres, h = height above the floor)
const mirror = (pts) => pts.map(([x, h]) => [-x, h]);
// person's LEFT hip bone (x > 0); the right one (viewer's left, holds P.marrow) is its mirror
// outline: sacro-iliac joint → iliac crest → ASIS / AIIS → acetabular rim → ischium → ischial tuberosity →
// ischiopubic ramus → pubic symphysis → superior pubic ramus → pelvic brim back up to the SI joint
const HIP = [[0.046, 1.012], [0.06, 1.045], [0.09, 1.065], [0.12, 1.066], [0.139, 1.05], [0.148, 1.025], [0.146, 0.994],
  [0.138, 0.972], [0.134, 0.952], [0.13, 0.934], [0.132, 0.91], [0.131, 0.888], [0.125, 0.866], [0.114, 0.846],
  [0.108, 0.825], [0.1, 0.8], [0.082, 0.788], [0.066, 0.792], [0.048, 0.805], [0.026, 0.814], [0.008, 0.818],
  [0.005, 0.84], [0.02, 0.86], [0.045, 0.866], [0.07, 0.872], [0.062, 0.9], [0.052, 0.935], [0.046, 0.97]];
const CREST = [[0.05, 1.03], [0.06, 1.045], [0.09, 1.065], [0.12, 1.066], [0.139, 1.05], [0.148, 1.025], [0.146, 0.994]];
// the iliac wing (the marrow-rich blade above the hip socket): used for the glow site; P.marrow lies inside its mirror
const WING = [[0.05, 1.005], [0.062, 1.038], [0.09, 1.057], [0.12, 1.058], [0.135, 1.045], [0.142, 1.024], [0.138, 0.995],
  [0.127, 0.97], [0.115, 0.948], [0.098, 0.936], [0.08, 0.938], [0.064, 0.952], [0.055, 0.975]];
const ACET = { x: 0.104, h: 0.893, r: 0.023 };          // hip socket = femoral-head centre
// proximal femur (person's left): the neck from the head out to the greater trochanter, down past the lesser
// trochanter into the top of the shaft (the shaft itself is a longBone from h 0.848)
const FEMUR_TOP = [[0.112, 0.909], [0.13, 0.899], [0.143, 0.896], [0.152, 0.893], [0.157, 0.879], [0.155, 0.86], [0.151, 0.838],
  [0.13, 0.836], [0.124, 0.84], [0.127, 0.852], [0.124, 0.866], [0.112, 0.876]];
const OBT = { x: 0.066, h: 0.836, rx: 0.0155, ry: 0.02 }; // obturator foramen
// sacrum (curved sides, S1 promontory on top) + 4 pairs of sacral foramina
const SACRUM = [[-0.05, 1.03], [0, 1.022], [0.05, 1.03], [0.053, 1.0], [0.047, 0.96], [0.035, 0.92], [0.021, 0.888],
  [0.01, 0.872], [0, 0.868], [-0.01, 0.872], [-0.021, 0.888], [-0.035, 0.92], [-0.047, 0.96], [-0.053, 1.0]];
const FORAMINA = [[0.025, 1.0, 0.0042], [0.022, 0.975, 0.0038], [0.018, 0.951, 0.0033], [0.0145, 0.928, 0.0028]];
/** Vertebra i (0-6 cervical, 7-18 thoracic, 19-23 lumbar): centre height, half width, half height. */
function vert(i) {
  if (i < 7) return { h: 1.565 - i * 0.0142, hw: 0.011 + i * 0.0006, hh: 0.0059 };
  if (i < 19) return { h: 1.4656 - (i - 7) * 0.0222, hw: 0.014 + (i - 7) * 0.0006, hh: 0.0093 };
  return { h: 1.187 - (i - 19) * 0.035, hw: 0.021 + (i - 19) * 0.0016, hh: 0.0135 };
}
// cranium + upper face (front view): domed vault, temples pinched in, zygomatic arches flaring out at the cheekbones,
// the maxilla narrowing down to the upper teeth. The mandible is a separate U below it.
const half = (pts) => [...pts, ...mirror(pts.slice(1, -1)).reverse()];
const SKULL = half([[0, 1.744], [0.03, 1.738], [0.052, 1.719], [0.064, 1.69], [0.066, 1.662], [0.061, 1.64], [0.067, 1.626],
  [0.069, 1.611], [0.061, 1.597], [0.046, 1.592], [0.036, 1.578], [0.029, 1.566], [0.014, 1.561], [0, 1.56]]);
const MANDIBLE = half([[0, 1.564], [0.03, 1.567], [0.046, 1.584], [0.052, 1.606], [0.058, 1.604], [0.059, 1.58], [0.055, 1.562],
  [0.044, 1.547], [0.025, 1.535], [0.01, 1.531], [0, 1.53]]);
const ORBIT = [[0.009, 1.652], [0.026, 1.657], [0.043, 1.652], [0.046, 1.637], [0.039, 1.624], [0.024, 1.621], [0.011, 1.626], [0.007, 1.64]];
const NASAL = half([[0, 1.623], [0.006, 1.611], [0.0105, 1.597], [0.007, 1.589], [0, 1.588]]);
const LUNG_RIBS = (() => {
  // 12 ribs: [spine height, lateral reach, drop to the front end, front x, sternal height or null (floating/costal)]
  const out = [];
  const reach = [0.07, 0.105, 0.128, 0.142, 0.15, 0.155, 0.156, 0.154, 0.15, 0.142, 0.128, 0.11];
  const ster = [1.436, 1.405, 1.375, 1.345, 1.315, 1.285, 1.255, null, null, null, null, null];
  for (let i = 0; i < 12; i++) {
    const hs = 1.448 - i * 0.0182;
    out.push({ hs, w: reach[i], drop: 0.05 + i * 0.006, xf: i < 10 ? reach[i] * (0.62 - i * 0.012) : reach[i] * 0.92, st: ster[i], i });
  }
  return out;
})();

/** Closed Catmull-Rom through pts (x,h), added to the current path in screen space. */
function smooth(c, v, pts) {
  const n = pts.length, X = (x) => v.wx(x), Y = (h) => v.wy(-h);
  const p = (i) => pts[(i + n) % n];
  c.moveTo(X(p(0)[0]), Y(p(0)[1]));
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    c.bezierCurveTo(X(p1[0] + (p2[0] - p0[0]) / 6), Y(p1[1] + (p2[1] - p0[1]) / 6),
      X(p2[0] - (p3[0] - p1[0]) / 6), Y(p2[1] - (p3[1] - p1[1]) / 6), X(p2[0]), Y(p2[1]));
  }
  c.closePath();
}
/** Open smooth curve through pts (x,h) (midpoint quadratics), added to the current path. */
function openSmooth(c, v, pts) {
  const X = (x) => v.wx(x), Y = (h) => v.wy(-h);
  c.moveTo(X(pts[0][0]), Y(pts[0][1]));
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, mh = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(X(pts[i][0]), Y(pts[i][1]), i === pts.length - 2 ? X(pts[i + 1][0]) : X(mx), i === pts.length - 2 ? Y(pts[i + 1][1]) : Y(mh));
  }
}
const sideOf = (pts, s) => (s > 0 ? pts : mirror(pts));
/** One hip bone (side s) with the obturator foramen as an even-odd hole. */
function hipPath(c, v, s) {
  smooth(c, v, sideOf(HIP, s));
  ellipseW(c, v, s * OBT.x, OBT.h, OBT.rx, OBT.ry, -s * 0.45);
}
/** A long bone: shaft between two flared ends (screen-space path). */
function longBone(c, v, ax, ah, bx, bh, r, ra, rb) {
  const X = (x) => v.wx(x), Y = (h) => v.wy(-h), S = (m) => v.ws(m);
  const ang = Math.atan2(Y(bh) - Y(ah), X(bx) - X(ax)), nx = -Math.sin(ang), ny = Math.cos(ang);
  const len = Math.hypot(X(bx) - X(ax), Y(bh) - Y(ah)), ux = Math.cos(ang), uy = Math.sin(ang);
  const A = [X(ax), Y(ah)], B = [X(bx), Y(bh)], rs = S(r), ra2 = S(ra), rb2 = S(rb);
  const at = (f, side, w) => [A[0] + ux * len * f + nx * w * side, A[1] + uy * len * f + ny * w * side];
  const p1 = at(0.12, 1, rs), p2 = at(0.88, 1, rs), q2 = at(0.88, -1, rs), q1 = at(0.12, -1, rs);
  c.moveTo(...p1);
  c.lineTo(...p2);
  c.bezierCurveTo(...at(0.95, 1, rb2), ...at(1.02, 1, rb2), ...at(1.02, 0, 0));
  c.bezierCurveTo(...at(1.02, -1, rb2), ...at(0.95, -1, rb2), ...q2);
  c.lineTo(...q1);
  c.bezierCurveTo(...at(0.05, -1, ra2), ...at(-0.02, -1, ra2), ...at(-0.02, 0, 0));
  c.bezierCurveTo(...at(-0.02, 1, ra2), ...at(0.05, 1, ra2), ...p1);
  c.closePath();
  void B;
}
function ellipseW(c, v, x, h, rx, ry, rot = 0) {
  c.moveTo(v.wx(x) + v.ws(rx) * Math.cos(rot), v.wy(-h) + v.ws(rx) * Math.sin(rot));
  c.ellipse(v.wx(x), v.wy(-h), Math.max(0, v.ws(rx)), Math.max(0, v.ws(ry)), rot, 0, Math.PI * 2);
}
function rib(c, v, r, side) {
  const X = (x) => v.wx(side * x), Y = (h) => v.wy(-h);
  const { hs, w, drop, xf } = r;
  c.moveTo(X(0.018), Y(hs));
  c.bezierCurveTo(X(w * 0.75), Y(hs + 0.022), X(w * 1.06), Y(hs - drop * 0.45), X(w * 0.98), Y(hs - drop * 0.8));
  c.bezierCurveTo(X(w * 0.92), Y(hs - drop * 1.02), X(xf * 1.15), Y(hs - drop * 1.08), X(xf), Y(hs - drop * 1.02));
}
function cartilage(c, v, r, side) {
  if (!r.st && r.i > 9) return;
  const X = (x) => v.wx(side * x), Y = (h) => v.wy(-h);
  const { hs, drop, xf } = r;
  c.moveTo(X(xf), Y(hs - drop * 1.02));
  if (r.st) c.quadraticCurveTo(X(xf * 0.5), Y(hs - drop * 1.08), X(0.017), Y(r.st));
  else c.quadraticCurveTo(X(xf * 0.7), Y(hs - drop * 1.25), X(0.03 + (9 - r.i) * 0.012), Y(1.225 - (r.i - 7) * 0.012));
}

// ------------------------------------------------------------------ marrow sites (paths filled with the glow)
const SITES = [
  { t: 0.0, path: (c, v) => ellipseW(c, v, 0, 1.69, 0.052, 0.04) },                                       // skull vault
  { t: 0.16, path: (c, v) => { c.rect(v.wx(-0.016), v.wy(-1.45), v.ws(0.032), v.ws(0.22)); } },          // sternum
  { t: 0.24, path: (c, v) => { for (let i = 7; i < 24; i++) { const q = vert(i); ellipseW(c, v, 0, q.h, q.hw * 0.82, q.hh * 0.85); } smooth(c, v, SACRUM.map(([x, h]) => [x * 0.62, (h - 0.96) * 0.75 + 0.96])); } }, // spine + sacrum
  { t: 0.3, ribs: true },
  { t: 0.42, path: (c, v) => { ellipseW(c, v, -0.18, 1.425, 0.02, 0.02); ellipseW(c, v, 0.18, 1.425, 0.02, 0.02); } }, // humerus heads
  { t: 0.52, soft: { x: 0.1, h: 1.0, r: 0.065, side: 1 }, path: (c, v) => { smooth(c, v, WING); } }, // left ilium
  { t: 0.62, path: (c, v) => { for (const s of [-1, 1]) ellipseW(c, v, s * ACET.x, ACET.h, ACET.r * 0.9, ACET.r * 0.9); } }, // femoral heads (seated in the sockets)
  { t: 0.7, hero: true, soft: { x: -0.1, h: 1.0, r: 0.065, side: -1 }, path: (c, v) => { smooth(c, v, mirror(WING)); } }, // right ilium (P.marrow)
];

/** Skeleton visibility (global): in on the beat-9 pull-out, faint ribcage over the lungs in beat 12, gone in 13. */
function skelK(v) {
  const s = v.tl.scenes;
  const inT = L.ease.outCubic(L.prog(v.gt, s[9].start + 1.15, 0.9));
  const dim = L.lerp(1, 0.3, L.ease.inOutCubic(L.prog(v.gt, s[12].start + 2.3, 1.0)));
  const out = 1 - L.ease.inCubic(L.prog(v.gt, s[13].start - 0.1, 0.9));
  return inT * dim * out;
}
/** The x-ray skeleton's visibility as drawn at body scale (s00 uses it to show the hand bones with it). */
export function skeletonK(v) {
  const k = skelK(v);
  if (k <= 0) return 0;
  const lm = Math.log(v.cam.mpp);
  return k * L.smoothstep(L.clamp(L.invLerp(Math.log(2e-4), Math.log(6e-4), lm)));
}
/** Marrow-site ignition (0..1 per site) — staggered top to bottom from "bone marrow". */
function siteK(v, st) {
  const s = v.tl.scenes, t0 = s[9].start + 1.85;
  const on = L.ease.outCubic(L.prog(v.gt, t0 + st * 1.2, 0.45));
  const flash = Math.exp(-Math.max(0, v.gt - (t0 + st * 1.2)) * 3.2) * on;
  const off = 1 - L.ease.inOutCubic(L.prog(v.gt, s[12].start + 2.1, 0.9));
  return { k: on * off, flash: flash * off };
}

function boneStyle(c, v, k, fill = 0.1) {
  c.fillStyle = L.rgba(IVORY, fill * k);
  c.strokeStyle = L.rgba(IVORY, 0.62 * k);
  c.lineWidth = L.clamp(v.ws(0.0017), 0.9, 2.6);
  c.lineJoin = 'round'; c.lineCap = 'round';
}
function drawSkeleton(c, v, k, kIlium) {
  const X = (x) => v.wx(x), Y = (h) => v.wy(-h), S = (m) => v.ws(m);
  c.save();
  boneStyle(c, v, k);
  // skull: cranium with cheekbones, a separate mandible, squarish orbits under a brow ridge, the pear-shaped nasal
  // aperture, two rows of teeth, temporal lines and the coronal suture
  c.beginPath(); smooth(c, v, MANDIBLE); c.fill(); c.stroke();
  c.beginPath(); smooth(c, v, SKULL); c.fill(); c.stroke();
  c.save();
  c.beginPath(); smooth(c, v, SKULL); c.clip();
  const sk = c.createRadialGradient(X(-0.02), Y(1.71), S(0.005), X(0), Y(1.66), S(0.09));
  sk.addColorStop(0, L.rgba(IVORY, 0.16 * k)); sk.addColorStop(1, L.rgba(IVORY, 0));
  c.fillStyle = sk; c.fillRect(X(-0.08), Y(1.76), S(0.16), S(0.2));
  c.restore();
  c.beginPath(); smooth(c, v, ORBIT); smooth(c, v, mirror(ORBIT));
  c.fillStyle = L.rgba([6, 8, 14], 0.55 * k); c.fill(); c.stroke();
  c.beginPath(); smooth(c, v, NASAL); c.fillStyle = L.rgba([6, 8, 14], 0.5 * k); c.fill(); c.stroke();
  c.lineWidth = L.clamp(v.ws(0.0012), 0.7, 2);
  c.beginPath();
  openSmooth(c, v, [[-0.047, 1.656], [-0.026, 1.664], [-0.006, 1.658]]); openSmooth(c, v, [[0.006, 1.658], [0.026, 1.664], [0.047, 1.656]]);
  openSmooth(c, v, [[0.046, 1.624], [0.057, 1.613], [0.062, 1.6]]); openSmooth(c, v, [[-0.046, 1.624], [-0.057, 1.613], [-0.062, 1.6]]);
  c.strokeStyle = L.rgba(IVORY, 0.42 * k); c.stroke();
  c.beginPath();
  openSmooth(c, v, [[-0.058, 1.65], [-0.054, 1.69], [-0.036, 1.722]]); openSmooth(c, v, [[0.058, 1.65], [0.054, 1.69], [0.036, 1.722]]);
  openSmooth(c, v, [[-0.05, 1.712], [-0.02, 1.734], [0.02, 1.734], [0.05, 1.712]]);
  c.strokeStyle = L.rgba(IVORY, 0.2 * k); c.stroke();
  // teeth: an upper and a lower row meeting on the bite line
  c.beginPath();
  c.moveTo(X(-0.026), Y(1.562)); c.quadraticCurveTo(X(0), Y(1.559), X(0.026), Y(1.562));
  for (let i = -5; i <= 5; i++) { const tx = i * 0.0047, ty = 1.562 + Math.abs(i) * 0.0002; c.moveTo(X(tx), Y(ty + 0.0062)); c.lineTo(X(tx), Y(ty - 0.0062)); }
  c.strokeStyle = L.rgba(IVORY, 0.38 * k); c.stroke();
  boneStyle(c, v, k);
  // spine: 24 vertebrae (cervical small → lumbar broad) + sacrum
  c.beginPath();
  for (let i = 0; i < 24; i++) {
    const { h, hw, hh } = vert(i);
    if (h > 1.545) continue;              // C1-C2 sit behind the face and jaw (front view)
    L.roundRect(c, X(-hw), Y(h + hh), S(hw * 2), S(hh * 2), S(0.003));
    c.fill(); c.stroke();
    if (i >= 7) { c.beginPath(); c.moveTo(X(-hw), Y(h)); c.lineTo(X(-hw - (i >= 19 ? 0.022 : 0.012)), Y(h - 0.003)); c.moveTo(X(hw), Y(h)); c.lineTo(X(hw + (i >= 19 ? 0.022 : 0.012)), Y(h - 0.003)); c.stroke(); }
    c.beginPath();
  }
  drawSacrum(c, v, k);
  boneStyle(c, v, k);
  // clavicles + sternum
  c.beginPath();
  for (const s of [-1, 1]) { c.moveTo(X(s * 0.02), Y(1.452)); c.bezierCurveTo(X(s * 0.07), Y(1.47), X(s * 0.11), Y(1.452), X(s * 0.168), Y(1.468)); }
  c.lineWidth = L.clamp(v.ws(0.007), 1.4, 9); c.strokeStyle = L.rgba(IVORY, 0.42 * k); c.stroke();
  boneStyle(c, v, k);
  c.beginPath();
  c.moveTo(X(-0.026), Y(1.452)); c.lineTo(X(0.026), Y(1.452)); c.lineTo(X(0.018), Y(1.402)); c.lineTo(X(0.017), Y(1.25));
  c.lineTo(X(0.006), Y(1.226)); c.lineTo(X(0), Y(1.212)); c.lineTo(X(-0.006), Y(1.226)); c.lineTo(X(-0.017), Y(1.25)); c.lineTo(X(-0.018), Y(1.402)); c.closePath();
  c.fill(); c.stroke();
  // ribs (bone) + costal cartilage (fainter)
  c.beginPath(); for (const r of LUNG_RIBS) for (const s of [-1, 1]) rib(c, v, r, s);
  c.lineWidth = L.clamp(v.ws(0.0075), 1.2, 10); c.strokeStyle = L.rgba(IVORY, 0.2 * k); c.stroke();
  c.lineWidth = L.clamp(v.ws(0.0017), 0.9, 2.6); c.strokeStyle = L.rgba(IVORY, 0.55 * k); c.stroke();
  c.beginPath(); for (const r of LUNG_RIBS) for (const s of [-1, 1]) cartilage(c, v, r, s);
  c.lineWidth = L.clamp(v.ws(0.005), 1, 7); c.strokeStyle = L.rgba([170, 200, 230], 0.2 * k); c.stroke();
  // arms: humeri, the hanging left forearm + hand, the right forearm toward the wrist
  c.beginPath();
  longBone(c, v, 0.183, 1.428, 0.213, 1.115, 0.0095, 0.024, 0.022);
  longBone(c, v, -0.183, 1.428, -0.21, 1.135, 0.0095, 0.024, 0.022);
  longBone(c, v, 0.207, 1.1, 0.226, 0.872, 0.0052, 0.009, 0.012);
  longBone(c, v, 0.224, 1.105, 0.243, 0.878, 0.0045, 0.01, 0.007);
  const fx = (f) => L.lerp(ELBOW.x, WRIST.x, f), fy = (f) => L.lerp(-ELBOW.y, -WRIST.y, f);
  longBone(c, v, fx(0.03), fy(0.03) + 0.008, fx(0.97), fy(0.97) + 0.007, 0.0045, 0.009, 0.008);
  longBone(c, v, fx(0.03), fy(0.03) - 0.008, fx(0.97), fy(0.97) - 0.007, 0.0045, 0.009, 0.008);
  c.fill(); c.stroke();
  // the hanging left hand: two rows of carpals, five metacarpals, then proximal / middle / distal phalanges with
  // small joint gaps (the middle fingers longest), the thumb turned slightly forward on the inner side
  c.beginPath();
  for (let r = 0; r < 2; r++) for (let j = 0; j < 4; j++) ellipseW(c, v, 0.2265 + j * 0.0072 + r * 0.001, 0.8575 - r * 0.0105, 0.0035, 0.0042);
  c.fillStyle = L.rgba(IVORY, 0.14 * k); c.fill();
  c.lineWidth = L.clamp(v.ws(0.0008), 0.6, 1.6); c.strokeStyle = L.rgba(IVORY, 0.5 * k); c.stroke();
  const hseg = (x0, h0, x1, h1, r) => {
    c.beginPath(); c.moveTo(X(x0), Y(h0)); c.lineTo(X(x1), Y(h1));
    c.lineWidth = Math.max(1.2, S(r * 2)); c.strokeStyle = L.rgba(IVORY, 0.2 * k); c.stroke();
    c.lineWidth = Math.max(0.7, S(r * 0.8)); c.strokeStyle = L.rgba(IVORY, 0.55 * k); c.stroke();
    c.beginPath(); for (const [px, ph] of [[x0, h0], [x1, h1]]) { c.moveTo(X(px) + Math.max(0.7, S(r)), Y(ph)); c.arc(X(px), Y(ph), Math.max(0.7, S(r)), 0, Math.PI * 2); }
    c.fillStyle = L.rgba(IVORY, 0.35 * k); c.fill();
  };
  c.lineCap = 'round';
  const LEN = [0.86, 1, 0.97, 0.8];
  for (let f = 0; f < 4; f++) {
    const xa = 0.2265 + f * 0.0074, xb = 0.2255 + f * 0.0084, q = LEN[f];
    hseg(xa, 0.838, xb, 0.792, 0.0026);
    hseg(xb, 0.786, xb - 0.0008, 0.786 - 0.036 * q, 0.0022);
    hseg(xb - 0.001, 0.781 - 0.036 * q, xb - 0.0015, 0.781 - 0.059 * q, 0.0019);
    hseg(xb - 0.0017, 0.777 - 0.059 * q, xb - 0.002, 0.777 - 0.074 * q, 0.0016);
  }
  hseg(0.2215, 0.842, 0.2145, 0.808, 0.0027);
  hseg(0.2135, 0.803, 0.2095, 0.779, 0.0023);
  hseg(0.209, 0.774, 0.2072, 0.757, 0.0018);
  c.lineCap = 'round';
  boneStyle(c, v, k);
  // pelvis: both hip bones (ilium, ischium, pubis) with their obturator holes, sockets and seated femoral heads
  for (const s of [-1, 1]) drawHipBone(c, v, k, s);
  boneStyle(c, v, k);
  // legs: femurs (shaft + condyles), patellae, tibiae + fibulae (heads + necks are drawn with the hip sockets)
  c.beginPath();
  for (const s of [-1, 1]) {
    longBone(c, v, s * 0.141, 0.848, s * 0.093, 0.49, 0.0125, 0.0135, 0.04);
    ellipseW(c, v, s * 0.092, 0.5, 0.017, 0.021);
    longBone(c, v, s * 0.088, 0.475, s * 0.077, 0.085, 0.0115, 0.038, 0.026);
    longBone(c, v, s * 0.118, 0.45, s * 0.103, 0.095, 0.0042, 0.008, 0.009);
  }
  c.fill(); c.stroke();
  c.beginPath();
  for (const s of [-1, 1]) {   // feet: talus + metatarsal fan
    ellipseW(c, v, s * 0.074, 0.06, 0.02, 0.014);
    for (let f = 0; f < 5; f++) { c.moveTo(X(s * (0.066 + f * 0.006)), Y(0.05)); c.lineTo(X(s * (0.062 + f * 0.014)), Y(0.008)); }
  }
  c.stroke();
  c.restore();
  // the right ilium becomes an opaque bone surface while the camera dives into it (s10 cuts the hole)
  if (kIlium > 0) drawIliumSurface(c, v, kIlium);
}
function drawSacrum(c, v, k) {
  const X = (x) => v.wx(x), Y = (h) => v.wy(-h), S = (m) => v.ws(m);
  c.save();
  boneStyle(c, v, k, 0.13);
  c.beginPath(); smooth(c, v, SACRUM); c.fill(); c.stroke();
  // coccyx: three small tapering segments
  c.beginPath();
  [[0.861, 0.0075], [0.8515, 0.0058], [0.8435, 0.0042]].forEach(([h, r]) => ellipseW(c, v, 0, h, r, r * 0.62));
  c.fill(); c.stroke();
  // transverse ridges (fused vertebrae) + 4 pairs of sacral foramina
  c.beginPath();
  for (const h of [0.988, 0.963, 0.939]) { const w = 0.03 - (0.988 - h) * 0.25; c.moveTo(X(-w), Y(h)); c.quadraticCurveTo(X(0), Y(h - 0.003), X(w), Y(h)); }
  c.strokeStyle = L.rgba(IVORY, 0.28 * k); c.lineWidth = L.clamp(S(0.0012), 0.6, 2); c.stroke();
  c.beginPath();
  for (const [x, h, r] of FORAMINA) for (const s of [-1, 1]) ellipseW(c, v, s * x, h, r, r * 0.85);
  c.fillStyle = L.rgba([6, 8, 14], 0.45 * k); c.fill();
  c.strokeStyle = L.rgba(IVORY, 0.45 * k); c.lineWidth = L.clamp(S(0.001), 0.6, 2); c.stroke();
  c.restore();
}
function drawHipBone(c, v, k, s) {
  const X = (x) => v.wx(s * x), Y = (h) => v.wy(-h), S = (m) => v.ws(m);
  c.save();
  boneStyle(c, v, k);
  // the bone: ilium + ischium + pubis in one outline, obturator foramen cut out
  c.beginPath(); hipPath(c, v, s);
  c.fillStyle = L.rgba(IVORY, 0.12 * k); c.fill('evenodd'); c.stroke();
  c.save();
  c.beginPath(); hipPath(c, v, s); c.clip('evenodd');
  // iliac fossa: the shallow hollow of the wing (darker toward the pelvic brim)
  const fx = X(0.088), fy = Y(0.985), fr = S(0.05);
  const fg = c.createRadialGradient(fx, fy, 0, fx, fy, Math.max(1, fr));
  fg.addColorStop(0, `rgba(6,8,14,${0.22 * k})`); fg.addColorStop(1, 'rgba(6,8,14,0)');
  c.fillStyle = fg; c.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
  // pelvic brim (arcuate line): a ridge from the SI joint down to the pubic tubercle
  c.beginPath(); openSmooth(c, v, [[s * 0.05, 0.99], [s * 0.056, 0.94], [s * 0.066, 0.9], [s * 0.05, 0.874], [s * 0.022, 0.862]]);
  c.strokeStyle = L.rgba(IVORY, 0.3 * k); c.lineWidth = L.clamp(S(0.0014), 0.6, 2.4); c.stroke();
  // thickened iliac crest: a broad pale lip along the top of the wing
  c.beginPath(); openSmooth(c, v, sideOf(CREST, s));
  c.strokeStyle = L.rgba(IVORY, 0.2 * k); c.lineWidth = L.clamp(S(0.009), 2, 14); c.stroke();
  c.restore();
  c.beginPath(); openSmooth(c, v, sideOf(CREST, s));
  c.strokeStyle = L.rgba([255, 246, 228], 0.75 * k); c.lineWidth = L.clamp(S(0.0024), 1.2, 4); c.stroke();
  // the acetabulum: a dark cup, the femoral neck, the head seated in it, the socket's rim arching over the head
  const ax = X(ACET.x), ay = Y(ACET.h), ar = S(ACET.r);
  c.beginPath(); ellipseW(c, v, s * ACET.x, ACET.h, ACET.r * 1.2, ACET.r * 1.2);
  const sg = c.createRadialGradient(ax, ay, ar * 0.5, ax, ay, ar * 1.2);
  sg.addColorStop(0, `rgba(6,8,14,${0.5 * k})`); sg.addColorStop(1, `rgba(6,8,14,${0.1 * k})`);
  c.fillStyle = sg; c.fill();
  boneStyle(c, v, k, 0.16);
  c.beginPath(); smooth(c, v, sideOf(FEMUR_TOP, s)); c.fill(); c.stroke();
  c.beginPath(); ellipseW(c, v, s * ACET.x, ACET.h, ACET.r, ACET.r);
  const hg = c.createRadialGradient(ax - ar * 0.35, ay - ar * 0.4, ar * 0.1, ax, ay, ar);
  hg.addColorStop(0, L.rgba(IVORY, 0.42 * k)); hg.addColorStop(1, L.rgba(IVORY, 0.1 * k));
  c.fillStyle = hg; c.fill(); c.stroke();
  c.beginPath();
  const R = ACET.r * 1.17, a0 = -0.35, a1 = 2.45;
  for (let i = 0; i <= 24; i++) { const a = L.lerp(a0, a1, i / 24), px = X(ACET.x + Math.cos(a) * R), py = Y(ACET.h + Math.sin(a) * R); i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.strokeStyle = L.rgba([255, 246, 228], 0.6 * k); c.lineWidth = L.clamp(S(0.0035), 1.2, 6); c.stroke();
  c.restore();
}

// periosteal grain: a seamless tile of pits and fibre flecks, zoomed in octaves so it never pixelates
let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const N = 256, cv = new OffscreenCanvas(N, N), g = cv.getContext('2d');
  const q = L.rng(4242);
  const wrap = (fn) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) fn(ox, oy); };
  for (let i = 0; i < 700; i++) {
    const x = q() * N, y = q() * N, r = 0.6 + q() * 1.5, light = q() < 0.45, a = 0.08 + q() * 0.14;
    g.fillStyle = light ? `rgba(255,248,232,${a})` : `rgba(70,50,36,${a * 1.4})`;
    wrap((ox, oy) => { g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill(); });
  }
  g.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const x = q() * N, y = q() * N, len = 6 + q() * 16, a = -0.6 + (q() - 0.5) * 0.5, light = q() < 0.5;
    g.strokeStyle = light ? `rgba(255,246,228,${0.09 + q() * 0.08})` : `rgba(90,66,48,${0.1 + q() * 0.1})`;
    g.lineWidth = 0.8 + q() * 0.8;
    wrap((ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len); g.stroke(); });
  }
  GRAIN = cv;
  return cv;
}
function drawGrain(c, v, k) {
  const tile = grainTile();
  const z = Math.log2(1 / v.cam.mpp), o = Math.floor(z), f = z - o;
  const ox = v.wx(P.marrow.x), oy = v.wy(P.marrow.y);
  for (const [lv, w] of [[o, 1 - f], [o + 1, f]]) {
    const sc = (256 * Math.pow(2, -lv) / v.cam.mpp) / 256;   // tile ≈ 256-512 px on screen
    const p = c.createPattern(tile, 'repeat');
    p.setTransform(new DOMMatrix([sc, 0, 0, sc, ox + (lv % 3) * 37 * sc, oy + (lv % 2) * 53 * sc]));
    c.globalAlpha = k * w;
    c.fillStyle = p; c.fillRect(0, 0, W, H);
  }
  c.globalAlpha = 1;
}
/** Soft inner band along the edges of the current clip (stacked strokes of `pathFn`, offset by ox, oy). */
function innerEdge(c, pathFn, color, a, width, ox = 0, oy = 0) {
  c.save();
  c.translate(ox, oy);
  c.beginPath(); pathFn();
  c.lineJoin = 'round';
  const n = 10;
  for (let i = n; i >= 1; i--) {
    c.strokeStyle = L.rgba(color, a / n);
    c.lineWidth = Math.max(1, width * 2 * Math.pow(i / n, 1.4));
    c.stroke();
  }
  c.restore();
}
function drawIliumSurface(c, v, k) {
  const X = (x) => v.wx(x), Y = (h) => v.wy(-h), S = (m) => v.ws(m);
  const shape = () => hipPath(c, v, -1);
  c.save();
  c.globalAlpha = k;
  c.beginPath(); shape(); c.clip('evenodd');
  // base: lit from the upper left, falling off toward the lower right (a broad curved plate)
  const g = c.createLinearGradient(X(-0.16), Y(1.07), X(0.0), Y(0.79));
  g.addColorStop(0, 'rgb(236,222,198)'); g.addColorStop(0.4, 'rgb(198,178,152)'); g.addColorStop(0.75, 'rgb(150,128,104)'); g.addColorStop(1, 'rgb(96,78,62)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // the wing's convex bulge catches the key light
  const bx = X(-0.118), by = Y(1.02), br = S(0.065);
  const bg = c.createRadialGradient(bx, by, 0, bx, by, Math.max(1, br));
  bg.addColorStop(0, 'rgba(255,248,232,0.2)'); bg.addColorStop(1, 'rgba(255,248,232,0)');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  // the iliac fossa / pelvic brim side turns away from the light
  const dx = X(-0.06), dy = Y(0.93), dr = S(0.06);
  const dg = c.createRadialGradient(dx, dy, 0, dx, dy, Math.max(1, dr));
  dg.addColorStop(0, 'rgba(70,52,40,0.35)'); dg.addColorStop(1, 'rgba(70,52,40,0)');
  c.fillStyle = dg; c.fillRect(0, 0, W, H);
  // broad mottling: the cortex is never one flat colour
  const mq = L.rng(5150);
  for (let i = 0; i < 18; i++) {
    const mx = P.marrow.x + (mq() - 0.5) * 0.11, mh = P.marrow.y + (mq() - 0.5) * 0.13, mr = S(0.008 + mq() * 0.022);
    const light = mq() < 0.45, ma = 0.08 + mq() * 0.08;
    const gx = X(mx), gy = v.wy(mh);
    if (gx + mr < 0 || gx - mr > W || gy + mr < 0 || gy - mr > H) continue;
    const mg = c.createRadialGradient(gx, gy, 0, gx, gy, Math.max(1, mr));
    const col = light ? [255, 246, 226] : [120, 92, 70];
    mg.addColorStop(0, L.rgba(col, ma)); mg.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = mg; c.fillRect(gx - mr, gy - mr, mr * 2, mr * 2);
  }
  // periosteal grain (zoom-stable)
  drawGrain(c, v, k);
  c.globalAlpha = k;
  // a few nutrient foramina (tiny pits with a lit lower lip), clear of s10's opening
  const q = L.rng(919);
  for (let i = 0; i < 14; i++) {
    const a = q() * Math.PI * 2, d = 0.02 + q() * 0.04;
    const x = X(P.marrow.x + Math.cos(a) * d), y = v.wy(P.marrow.y + Math.sin(a) * d * 0.8), r = S(0.0005 + q() * 0.0007);
    if (r < 0.6) continue;
    c.fillStyle = 'rgba(70,44,36,0.6)';
    c.beginPath(); c.ellipse(x, y, Math.max(0, r * 1.3), Math.max(0, r), 0.4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,246,228,0.35)'; c.lineWidth = Math.max(0.6, r * 0.35);
    c.beginPath(); c.ellipse(x, y, Math.max(0, r * 1.3), Math.max(0, r), 0.4, 0.2, Math.PI - 0.2); c.stroke();
  }
  // the red marrow glowing through the thin cortex around the opening
  L.lightBlob(c, X(P.marrow.x), v.wy(P.marrow.y), S(0.03), [200, 60, 70], 0.14);
  // rounded edges: occlusion all round, darker lower right, a warm rim light upper left; thick lip along the crest
  const e = L.clamp(S(0.006), 4, 70);
  innerEdge(c, shape, [40, 26, 20], 0.5, e * 1.4);
  innerEdge(c, shape, [30, 18, 14], 0.55, e * 1.6, -e * 0.5, -e * 0.5);
  innerEdge(c, shape, [255, 244, 222], 0.55, e * 0.7, e * 0.35, e * 0.35);
  c.beginPath(); openSmooth(c, v, mirror(CREST));
  c.strokeStyle = 'rgba(255,248,234,0.28)'; c.lineWidth = L.clamp(S(0.008), 3, 90); c.stroke();
  c.restore();
  // crisp rim of the bone (softened while the camera zooms fast, so motion-blur sub-frames don't stack into rings)
  const calm = 1 - 0.75 * L.clamp(Math.abs(zoomSpeed(v.gt, v.tl)) / 2.5);
  c.save();
  c.globalAlpha = k;
  c.beginPath(); shape();
  c.strokeStyle = `rgba(255,246,228,${0.45 * calm})`; c.lineWidth = L.clamp(S(0.0008), 1, 3); c.stroke();
  // the femoral head seated in its socket below (a lit sphere)
  const ax = X(-ACET.x), ay = Y(ACET.h), ar = S(ACET.r);
  if (ay - ar < H + 20) {
    c.beginPath(); longBone(c, v, -0.104, 0.893, -0.138, 0.866, 0.0092, 0.0095, 0.0095);
    const ng = c.createLinearGradient(X(-0.11), Y(0.905), X(-0.125), Y(0.86));
    ng.addColorStop(0, 'rgb(196,176,150)'); ng.addColorStop(1, 'rgb(112,92,74)');
    c.fillStyle = ng; c.fill();
    c.beginPath(); c.arc(ax, ay, Math.max(0, ar * 1.15), 0, Math.PI * 2);
    c.fillStyle = 'rgba(40,24,18,0.75)'; c.fill();
    const hg = c.createRadialGradient(ax - ar * 0.4, ay - ar * 0.45, ar * 0.05, ax, ay, ar);
    hg.addColorStop(0, 'rgb(236,222,198)'); hg.addColorStop(0.6, 'rgb(176,154,128)'); hg.addColorStop(1, 'rgb(96,78,62)');
    c.beginPath(); c.arc(ax, ay, Math.max(0, ar), 0, Math.PI * 2); c.fillStyle = hg; c.fill();
    // the acetabular roof: a lit bony lip arching over the head (it sits IN the socket)
    c.beginPath();
    const R = ACET.r * 1.12;
    for (let i = 0; i <= 24; i++) { const a = L.lerp(-0.35, 2.45, i / 24), px = X(-ACET.x - Math.cos(a) * R), py = Y(ACET.h + Math.sin(a) * R); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.strokeStyle = `rgba(206,188,162,${0.5 + 0.5 * calm})`; c.lineWidth = Math.max(1.5, S(0.005)); c.stroke();
    c.strokeStyle = `rgba(255,248,232,${0.6 * calm})`; c.lineWidth = Math.max(1, S(0.0012)); c.stroke();
  }
  c.restore();
}
function drawSites(c, v, kSk) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const s of SITES) {
    const { k, flash } = siteK(v, s.t);
    if (k <= 0) continue;
    const pulse = s.hero ? 0.25 * Math.max(0, Math.sin((v.gt - v.tl.scenes[9].start - 2.75) * 5.2)) * L.prog(v.gt, v.tl.scenes[9].start + 2.7, 0.2) : 0.06 * Math.sin(v.gt * 2.4 + s.t * 9);
    const a = (0.3 + 0.55 * flash + pulse) * k * kSk;
    c.beginPath();
    if (s.ribs) { for (const r of LUNG_RIBS.slice(0, 10)) for (const sd of [-1, 1]) rib(c, v, r, sd); c.strokeStyle = L.rgba(ACCENT, a * 0.45); c.lineWidth = L.clamp(v.ws(0.004), 1.2, 6); c.stroke(); continue; }
    if (s.soft) {
      // iliac wing: marrow glowing THROUGH the bone, a soft falloff clipped to the hip bone (no hard blob edge)
      c.save();
      c.beginPath(); hipPath(c, v, s.soft.side); c.clip('evenodd');
      const gx = v.wx(s.soft.x), gy = v.wy(-s.soft.h), gr = v.ws(s.soft.r);
      const g = c.createRadialGradient(gx, gy, 0, gx, gy, Math.max(1, gr));
      g.addColorStop(0, L.rgba(ACCENT, Math.min(1, a * 0.75))); g.addColorStop(0.55, L.rgba(ACCENT, a * 0.42)); g.addColorStop(1, L.rgba(ACCENT, 0));
      c.fillStyle = g; c.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      c.restore();
      continue;
    }
    s.path(c, v);
    c.save();
    c.shadowColor = L.rgba(ACCENT, 1); c.shadowBlur = 22;
    c.fillStyle = L.rgba(ACCENT, a * 0.35); c.fill();
    c.shadowBlur = 0;
    c.clip();
    // a soft inner glow (brighter core, darker edge) instead of a flat fill
    c.shadowColor = L.rgba([255, 120, 130], 1); c.shadowBlur = 14;
    c.lineWidth = L.clamp(v.ws(0.006), 2, 10); c.strokeStyle = L.rgba(ACCENT, a * 0.5); c.stroke();
    c.shadowBlur = 0;
    c.restore();
    c.beginPath(); s.path(c, v);
    c.strokeStyle = L.rgba([255, 170, 175], a * 0.8); c.lineWidth = L.clamp(v.ws(0.0012), 0.8, 2); c.stroke();
  }
  // bloom on the right iliac crest (the dive target)
  const { k } = siteK(v, 0.7);
  if (k > 0) L.lightBlob(c, v.wx(P.marrow.x), v.wy(P.marrow.y), v.ws(0.06), ACCENT, 0.35 * k * kSk);
  c.restore();
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'Red marrow', sub: 'the cell factory inside your bones' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: 0.0, name: 'whoosh', gain: 0.32, pitch: 0.7 },
      { t: 0.25, name: 'swell', gain: 0.2, pitch: 0.8 },
      { t: 1.85, name: 'shimmer', gain: 0.2, pitch: 0.9 },
      { t: 1.9, name: 'bloom', gain: 0.24, pitch: 0.85 },
      { t: 2.1, name: 'blip', gain: 0.1, pitch: 1.2 },
      { t: 2.35, name: 'blip', gain: 0.1, pitch: 1.35 },
      { t: 2.7, name: 'ping', gain: 0.26, pitch: 0.9 },
      { t: 2.75, name: 'sonar', gain: 0.14, pitch: 1.1 },
    ];
  },
  drawWorld(c, v) {
    const k = skelK(v);
    const mpp = v.cam.mpp;
    if (k <= 0 || mpp < 8e-6 || !bodyOnScreen(v)) return;
    // the skeleton resolves as the camera reaches body scale; the ilium surface takes over while diving into it
    const s = v.tl.scenes;
    const diving = v.gt > s[10].start - 0.1 && v.gt < s[12].end;
    // beat 12's pull-out is ~7 decades in 1.2 s: there the opaque bone only bridges the first instant (gone by
    // 5e-5 m/px, ≈ 53.86 s) and dissolves straight into the glass skeleton, so it never fills the frame as a flat plate
    const pull = v.gt > s[12].start - 0.05;
    const lm = Math.log(mpp);
    const kz = pull ? L.smoothstep(L.clamp(L.invLerp(Math.log(2.5e-5), Math.log(1.5e-4), lm)))
      : L.smoothstep(L.clamp(L.invLerp(Math.log(6e-5), Math.log(2.5e-4), lm)));
    const kIlium = !diving ? 0 : pull ? L.smoothstep(L.clamp(L.invLerp(Math.log(5e-5), Math.log(1.5e-5), lm)))
      : L.smoothstep(L.clamp(L.invLerp(Math.log(5e-4), Math.log(1.8e-4), lm)));
    c.save();
    c.beginPath(); bodyPath(c, v); c.clip();
    if (kz > 0) drawSkeleton(c, v, k * kz, 0);
    if (kIlium > 0) drawIliumSurface(c, v, kIlium);
    if (kz > 0) drawSites(c, v, k * kz * (1 - kIlium));   // the surface takes over while diving in
    c.restore();
  },
  drawOverlay(c, v) {
    // lock-on reticle on the right iliac crest + a small tag ("RED MARROW · HIP BONE")
    const k = v.k * L.ease.outCubic(L.prog(v.t, 2.0, 0.5)) * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.05, 0.35)));
    if (k <= 0) return;
    const x = v.wx(P.marrow.x), y = v.wy(P.marrow.y);
    const r = L.lerp(120, 44, L.ease.outCubic(L.prog(v.t, 2.0, 0.8)));
    c.save();
    c.globalAlpha = k;
    c.strokeStyle = L.rgba(ACCENT, 0.95); c.lineWidth = 2.5;
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.stroke();
    const rot = v.t * 0.6;
    for (let i = 0; i < 4; i++) {
      const a = rot + i * Math.PI / 2;
      c.beginPath(); c.moveTo(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6)); c.lineTo(x + Math.cos(a) * (r + 20), y + Math.sin(a) * (r + 20)); c.stroke();
    }
    // tag on the left, with a hairline
    const tx = 380, ty = y + 4;
    c.strokeStyle = L.rgba([235, 230, 222], 0.6); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - r - 24, y); c.lineTo(tx + 12, ty - 10); c.stroke();
    c.font = L.font(26, 700, L.FONT.body);
    c.fillStyle = L.rgba([245, 240, 232]);
    c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 10;
    c.textBaseline = 'middle';
    L.trackedText(c, 'RED MARROW', tx, ty - 26, 3, 'right');
    c.font = L.font(22, 600, L.FONT.body);
    c.fillStyle = L.rgba([190, 200, 215]);
    L.trackedText(c, 'HIP BONE', tx, ty + 8, 3, 'right');
    c.restore();
  },
};
