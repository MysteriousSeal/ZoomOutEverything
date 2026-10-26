// Builder A: the hero — a person lying on their back on a picnic blanket, LEFT arm stretched out sideways, the open hand
// (palm up) resting on the grass at the world origin. Painted once, in world metres, into three sprites of increasing
// resolution (body 1000 px/m, arm 2400 px/m, hand 7000 px/m) that sit exactly on top of each other.
// Light from the lower left (sun ~48° high), shadows to the upper right (camera.js SHADOW), shadow length ≈ 0.9 x height.
import * as L from '../../../../engine/runtime/lib.js';
import { PERSON, HEAD_DIR } from '../camera.js';
import { Painter, smooth, tube, orient, bbox, mipChain, drawSprite, mk } from './a-paint.js';

const DEG = Math.PI / 180;
const SUN = { x: -0.6, y: 0.8 }, SH = { x: 0.6, y: -0.8 };
const SHK = 0.9;   // shadow length per metre of height

// ------------------------------------------------------------------ frames
const hl = Math.hypot(HEAD_DIR.x, HEAD_DIR.y);
const A = { x: HEAD_DIR.x / hl, y: HEAD_DIR.y / hl };     // body axis, toward the head
const B = { x: -A.y, y: A.x };                             // across the body, toward screen right = the body's LEFT side
/** body frame (a along the body toward the head, b toward the body's left / screen right), metres -> world */
export const P = (a, b) => [PERSON.x + a * A.x + b * B.x, PERSON.y + a * A.y + b * B.y];
const Pp = (list) => list.map(([a, b]) => P(a, b));

// hand frame: centimetres, u along the hand toward the fingertips, v toward the little finger (thumb at -v)
export const HAND_ROT = 12 * DEG;
const HO = { u: 0.3, v: -1.45 };                           // the hand-frame point that sits at the world origin
const hc = Math.cos(HAND_ROT), hs = Math.sin(HAND_ROT);
export const Hd = (u, v) => { const x = (u - HO.u) / 100, y = (v - HO.v) / 100; return [x * hc - y * hs, x * hs + y * hc]; };
const Hp = (list) => list.map(([u, v]) => Hd(u, v));
const hdir = (deg) => [Math.cos(deg * DEG), Math.sin(deg * DEG)];

// ------------------------------------------------------------------ palette
const SKIN = {
  base: [222, 182, 160], palm: [229, 190, 172], pink: [216, 148, 142], pale: [236, 206, 188],
  shade: [148, 102, 94], deep: [98, 62, 58], hi: [250, 230, 218], rim: [208, 116, 106], crease: [146, 94, 90],
  tan: [206, 158, 128], pad: [236, 208, 172],
};
export const BLANKET = { base: [150, 44, 40], navy: [36, 48, 78], cream: [226, 212, 180], green: [44, 74, 56] };
const SHIRT = [236, 235, 228], SHORTS = [52, 62, 86], HAIR = [56, 38, 28], SHOE = [234, 233, 228];

// ------------------------------------------------------------------ the left arm + hand geometry
const SHOULDER_L = P(0.55, 0.17);
const WRIST = Hd(-9.0, 0.25);
const armDir = (() => { const dx = WRIST[0] - SHOULDER_L[0], dy = WRIST[1] - SHOULDER_L[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();
const along = (p, t, off = 0) => [p[0] - armDir[0] * t - armDir[1] * off, p[1] - armDir[1] * t + armDir[0] * off];
const ELBOW = along(WRIST, 0.265, -0.006);

function armTube() {
  const pin = Hd(-7.2, 0.15);
  return tube([
    [pin[0], pin[1], 0.056],
    [...Hd(-9.6, 0.12), 0.0585],
    [...along(WRIST, 0.05), 0.0612],
    [...along(WRIST, 0.13, -0.002), 0.0695],
    [...along(WRIST, 0.21, -0.004), 0.077],
    [ELBOW[0], ELBOW[1], 0.075],
    [...along(WRIST, 0.38, -0.004), 0.084],
    [...along(WRIST, 0.5, -0.001), 0.094],
    [SHOULDER_L[0], SHOULDER_L[1], 0.105],
    [...P(0.56, 0.08), 0.11],
  ], { per: 10, capEnd: true, capStart: false });
}

// fingers: base (cm, hand frame, at the web level), direction (deg), visible length, base width, bow (toward the middle)
const FINGERS = [
  { name: 'index', base: [2.35, -2.1], ang: -3.5, len: 6.45, w: 1.78, bow: 0.08, curl: 0.25 },
  { name: 'middle', base: [2.75, -0.32], ang: -0.5, len: 7.2, w: 1.82, bow: 0, curl: 0.28 },
  { name: 'ring', base: [2.55, 1.42], ang: 3.5, len: 6.5, w: 1.68, bow: -0.06, curl: 0.4 },
  { name: 'little', base: [1.72, 2.96], ang: 10.5, len: 5.0, w: 1.42, bow: -0.1, curl: 0.5 },
];
// segment ends as fractions of the visible length (proximal, middle, distal: the slight curl foreshortens the tip)
const SEG = [0.46, 0.76];
const WPROF = [[-0.35, 1.08], [-0.05, 1.02], [0.22, 0.99], [0.42, 0.9], [0.46, 0.87], [0.6, 0.89], [0.73, 0.82], [0.76, 0.79], [0.87, 0.81], [0.965, 0.72]];
const fingerAt = (f, s, off = 0) => {   // point on a finger (cm): s along, off across (fraction of half width, + = little side)
  const [du, dv] = hdir(f.ang);
  const b = f.bow * Math.sin(Math.PI * L.clamp(s)) * (f.ang >= 0 ? 1 : 1);
  const u = f.base[0] + du * f.len * s - dv * b, v = f.base[1] + dv * f.len * s + du * b;
  let w = 1;
  for (let i = 1; i < WPROF.length; i++) if (s <= WPROF[i][0]) { w = L.lerp(WPROF[i - 1][1], WPROF[i][1], L.invLerp(WPROF[i - 1][0], WPROF[i][0], s)); break; } else w = WPROF[i][1];
  return [u - dv * off * f.w * w / 2, v + du * off * f.w * w / 2];
};
function fingerTube(f) {
  const c = WPROF.map(([s, wk]) => { const [u, v] = fingerAt(f, s); const p = Hd(u, v); return [p[0], p[1], f.w * wk / 100]; });
  return tube(c, { per: 8, capEnd: true });
}
// thumb (palm up, relaxed: angled ~35° away from the index, attached low on the thenar, tip near the index base level)
const THUMB = [[-6.6, -2.3, 3.0], [-5.0, -3.2, 2.55], [-3.7, -4.1, 2.2], [-2.6, -4.85, 1.98], [-1.6, -5.55, 1.96], [-0.95, -6.05, 1.76]];
function thumbTube() { return tube(THUMB.map(([u, v, w]) => { const p = Hd(u, v); return [p[0], p[1], w / 100]; }), { per: 8, capEnd: true }); }
const PALM = [[-9.9, -2.5], [-9.2, -2.74], [-7.8, -3.5], [-6.3, -4.05], [-4.9, -4.4], [-3.4, -4.3], [-2.0, -3.85], [-0.6, -3.35], [0.9, -3.05], [2.0, -3.0],
  [2.75, -2.6], [3.0, -1.2], [3.3, 0.55], [3.05, 2.2], [2.3, 3.5], [1.1, 4.15], [-1.0, 4.45], [-3.5, 4.58], [-6.0, 4.3],
  [-8.0, 3.55], [-9.2, 2.98], [-9.9, 2.78]];


// ------------------------------------------------------------------ the body (body frame, metres)
const BODY = {
  head: { c: [0.745, 0.0], ra: 0.112, rb: 0.083 },
  hair: [[0.872, 0.0], [0.866, 0.052], [0.846, 0.088], [0.81, 0.103], [0.765, 0.104], [0.725, 0.096], [0.712, 0.08], [0.74, 0.072], [0.79, 0.066],
    [0.808, 0.0], [0.79, -0.066], [0.74, -0.072], [0.712, -0.08], [0.725, -0.096], [0.765, -0.104], [0.81, -0.103], [0.846, -0.088], [0.866, -0.052]],
  face: [[0.81, 0.0], [0.805, 0.05], [0.78, 0.072], [0.735, 0.077], [0.69, 0.062], [0.657, 0.04], [0.64, 0.0], [0.657, -0.04],
    [0.69, -0.062], [0.735, -0.077], [0.78, -0.072], [0.805, -0.05]],
  neck: [[0.67, 0.05], [0.6, 0.06], [0.585, 0.0], [0.6, -0.06], [0.67, -0.05]],
  shirt: [[0.6, 0.075], [0.596, 0.13], [0.578, 0.185], [0.535, 0.212], [0.47, 0.212], [0.36, 0.2], [0.22, 0.188], [0.1, 0.19], [0.055, 0.17],
    [0.045, 0.0], [0.055, -0.17], [0.1, -0.19], [0.22, -0.19], [0.36, -0.2], [0.47, -0.21], [0.535, -0.21], [0.578, -0.185], [0.596, -0.13],
    [0.6, -0.075], [0.585, -0.04], [0.575, 0.0], [0.585, 0.04]],
  shorts: [[0.1, 0.178], [0.0, 0.19], [-0.12, 0.2], [-0.23, 0.185], [-0.245, 0.11], [-0.235, 0.025], [-0.1, 0.0], [-0.235, -0.025],
    [-0.245, -0.11], [-0.23, -0.185], [-0.12, -0.2], [0.0, -0.19], [0.1, -0.178], [0.12, 0.0]],
  legL: [[-0.15, 0.1, 0.165], [-0.29, 0.108, 0.14], [-0.41, 0.116, 0.108], [-0.53, 0.123, 0.112], [-0.67, 0.13, 0.084], [-0.77, 0.136, 0.07]],
  legR: [[-0.15, -0.1, 0.165], [-0.29, -0.11, 0.14], [-0.41, -0.122, 0.108], [-0.53, -0.133, 0.112], [-0.67, -0.145, 0.084], [-0.77, -0.155, 0.07]],
  shoeL: { heel: [-0.775, 0.138], ang: 125, len: 0.2, wid: 0.096 },
  shoeR: { heel: [-0.775, -0.157], ang: -122, len: 0.2, wid: 0.096 },
  armR: [[0.55, -0.165, 0.105], [0.66, -0.225, 0.094], [0.78, -0.275, 0.085], [0.86, -0.29, 0.08], [0.9, -0.24, 0.074], [0.88, -0.16, 0.07], [0.84, -0.08, 0.07]],
};
// blanket (body frame centre, size along a and b, rotation relative to the body)
export const BLANKET_GEO = { c: [0.02, -0.33], la: 1.8, lb: 1.5, rot: 5 * DEG };
function blanketPts(inset = 0) {
  const { c, la, lb, rot } = BLANKET_GEO, cr = Math.cos(rot), sr = Math.sin(rot), r = L.rng(77);
  const out = [];
  const corners = [[la / 2, lb / 2], [-la / 2, lb / 2], [-la / 2, -lb / 2], [la / 2, -lb / 2]];
  for (let i = 0; i < 4; i++) {
    const p = corners[i], q = corners[(i + 1) % 4];
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      let a = L.lerp(p[0], q[0], t), b = L.lerp(p[1], q[1], t);
      const ia = Math.sign(a) * inset, ib = Math.sign(b) * inset;
      const wob = k === 0 ? 0 : (r() - 0.5) * 0.018;
      if (p[0] === q[0]) a += wob; else b += wob;
      a -= ia; b -= ib;
      out.push([c[0] + a * cr - b * sr, c[1] + a * sr + b * cr]);
    }
  }
  return out;
}
export const BLANKET_WORLD = blanketPts().map(([a, b]) => P(a, b));

// props on the blanket (body frame)
const PROPS = {
  book: { c: [0.18, -0.6], ang: 24, w: 0.27, h: 0.2 },
  bottle: { c: [-0.36, -0.66], ang: 72, len: 0.26, d: 0.074 },
  phone: { c: [-0.12, -0.53], ang: -8, w: 0.075, h: 0.152 },
  bag: { c: [0.55, -0.82], ang: -12, w: 0.4, h: 0.36 },
};

// ------------------------------------------------------------------ painting helpers
const rgb = (c, a = 1) => L.rgba(c, a);
function ellipse(path, cx, cy, rx, ry, rot = 0) { path.ellipse(cx, cy, Math.max(1e-6, rx), Math.max(1e-6, ry), rot, 0, Math.PI * 2); const r = Math.max(rx, ry); path.bb = { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }; return path; }
const bodyAng = Math.atan2(A.y, A.x);   // world angle of the body axis (toward the head)
/** Stroke a world polyline (smooth) with width (m), optional blur (m). */
function line(Pn, g, pts, col, a, wM, blurM = 0, cap = 'round') {
  g.save();
  g.lineCap = cap; g.lineJoin = 'round';
  g.strokeStyle = rgb(col, a);
  g.lineWidth = wM;
  if (blurM > 0) g.filter = Pn.blur(blurM);
  g.stroke(smooth(pts, false));
  g.restore();
}
function blob(Pn, g, x, y, rx, ry, rot, col, a, blurM) {
  g.save();
  g.filter = Pn.blur(blurM);
  g.fillStyle = rgb(col, a);
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill();
  g.restore();
}
/** Generic soft volume shading for a part with characteristic width `size` (m). */
function volume(Pn, mask, size, pal, k = 1) {
  const s = size;
  Pn.inner(mask, SUN.x * s * 0.5, SUN.y * s * 0.5, s * 0.5, pal.shade, 0.55 * k, 'multiply');
  Pn.inner(mask, SUN.x * s * 0.12, SUN.y * s * 0.12, s * 0.12, pal.deep, 0.35 * k, 'multiply');
  Pn.inner(mask, 0, 0, s * 0.05, pal.rim, 0.35 * k);
  Pn.inner(mask, SH.x * s * 0.3, SH.y * s * 0.3, s * 0.35, pal.hi, 0.4 * k, 'screen');
}
function noiseTex(seed, n = 256, a = 0.5) {
  const [c, g] = mk(n);
  const im = g.createImageData(n, n), d = im.data, r = L.rng(seed);
  for (let i = 0; i < n * n; i++) { const v = r(); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v * 255; d[i * 4 + 3] = 255 * a; }
  g.putImageData(im, 0, 0);
  return c;
}
/** Fine grain (pores, weave) inside a mask: device-pixel noise, alpha scaled to the sprite's resolution. */
function grain(Pn, mask, alpha, seed = 1, comp = 'overlay') {
  const tex = noiseTex(seed);
  Pn.within(mask, (g) => { Pn.id(g); g.fillStyle = g.createPattern(tex, 'repeat'); g.fillRect(0, 0, Pn.w, Pn.h); }, alpha, comp);
}

// ------------------------------------------------------------------ the hand
function handPathsOf() {
  const arm = armTube(), thumb = thumbTube(), fingers = FINGERS.map(fingerTube);
  return { arm: smooth(arm.pts), palm: smooth(orient(Hp(PALM))), thumb: smooth(thumb.pts), fingers: fingers.map((f) => smooth(f.pts)), armTube: arm };
}
/** A tapered crease (cm points in the hand frame), soft dark groove with a lit lip on its far side. */
function crease(Pn, clip, pts, w, a = 0.5) {
  const n = pts.length;
  const ctrl = pts.map(([u, v], i) => { const t = i / (n - 1), k = Math.sin(Math.PI * (0.12 + 0.76 * t)); const p = Hd(u, v); return [p[0], p[1], Math.max(0.15, k) * w / 100]; });
  const tb = smooth(tube(ctrl, { per: 6, capEnd: true, capStart: true }).pts);
  const sh = (dx, dy) => { const m = new DOMMatrix([1, 0, 0, 1, dx, dy]); const q = new Path2D(); q.addPath(tb, m); return q; };
  Pn.within(clip, (g) => {
    g.save(); g.filter = Pn.blur(w * 1.6 / 100); g.fillStyle = rgb(SKIN.shade, a * 0.35); g.fill(tb); g.restore();
    g.save(); g.filter = Pn.blur(w * 0.35 / 100); g.fillStyle = rgb(SKIN.crease, a); g.fill(tb); g.restore();
    g.save(); g.filter = Pn.blur(w * 0.5 / 100); g.fillStyle = rgb(SKIN.hi, a * 0.5); g.fill(sh(SH.x * w * 0.9 / 100, SH.y * w * 0.9 / 100)); g.restore();
  });
}

function paintHand(Pn) {
  const paths = handPathsOf();
  const all = [paths.arm, paths.palm, paths.thumb, ...paths.fingers];
  if (!Pn.hits(bbox(paths.armTube.pts.concat(Hp([[11, -8], [11, 6], [-12, -8]])), 0.1))) return paths;
  const skin = Pn.mask(all);
  const handOnly = Pn.mask([paths.palm, paths.thumb, ...paths.fingers]);
  const g = Pn.g;
  g.fillStyle = rgb(SKIN.base);
  for (const p of all) g.fill(p);
  // colour zones as soft gradients and blobs only (no hard region edges)
  Pn.within(skin, (g) => {
    const w0 = Hd(-8.4, 0), w1 = Hd(-11.5, 0), e = ELBOW;
    let gr = g.createLinearGradient(w0[0], w0[1], w1[0], w1[1]);
    gr.addColorStop(0, rgb(SKIN.palm, 1)); gr.addColorStop(1, rgb(SKIN.palm, 0));
    g.fillStyle = gr; g.fillRect(-2, -2, 4, 4);
    const S = SHOULDER_L, a0 = Hd(-8.6, 0);
    gr = g.createLinearGradient(a0[0], a0[1], S[0], S[1]);
    const te = Math.hypot(e[0] - a0[0], e[1] - a0[1]) / Math.hypot(S[0] - a0[0], S[1] - a0[1]);
    gr.addColorStop(0, rgb(SKIN.pale, 0)); gr.addColorStop(0.06, rgb(SKIN.pale, 0.45)); gr.addColorStop(te * 0.7, rgb(SKIN.base, 0.2));
    gr.addColorStop(te, rgb(SKIN.tan, 0.55)); gr.addColorStop(1, rgb(SKIN.pale, 0.35));
    g.fillStyle = gr; g.fillRect(-2, -2, 4, 4);
    // pink mounts (thenar, hypothenar, under the fingers), finger pads redder, palm centre paler
    for (const [u, v, r, a] of [[-6.0, -2.7, 2.4, 0.5], [-5.6, 3.0, 2.0, 0.42], [1.4, -2.2, 0.9, 0.35], [1.8, -0.35, 0.9, 0.3], [1.7, 1.45, 0.9, 0.3], [0.9, 2.95, 0.8, 0.3], [-1.0, -4.6, 1.2, 0.35]]) {
      const [x, y] = Hd(u, v);
      blob(Pn, g, x, y, r / 100, r / 100 * 0.8, HAND_ROT, SKIN.pink, a, r / 100 * 0.7);
    }
    for (const f of FINGERS) for (const s of [0.25, 0.61, 0.87]) {
      const [x, y] = Hd(...fingerAt(f, s));
      blob(Pn, g, x, y, f.w * 0.45 / 100, f.w * 0.36 / 100, HAND_ROT + f.ang * DEG, SKIN.pink, s > 0.8 ? 0.6 : 0.35, f.w * 0.28 / 100);
    }
    let [x, y] = Hd(-1.35, -5.7);
    blob(Pn, g, x, y, 0.011, 0.008, HAND_ROT - 0.78, SKIN.pink, 0.55, 0.005);
    [x, y] = Hd(-3.0, 0.5);
    blob(Pn, g, x, y, 0.024, 0.018, HAND_ROT, SKIN.pale, 0.45, 0.012);
    [x, y] = Hd(-9.2, 0.2);
    blob(Pn, g, x, y, 0.014, 0.03, HAND_ROT, SKIN.pale, 0.5, 0.01);
  });

  // ---- volumes
  Pn.within(handOnly, (g) => {
    const lx = SUN.x, ly = SUN.y;
    // thenar mound: lit on the flank toward the light, shaded on the far flank (toward the thumb's edge)
    let [x, y] = Hd(-5.6, -2.5);
    blob(Pn, g, x + lx * 0.008, y + ly * 0.008, 0.028, 0.017, HAND_ROT - 0.45, SKIN.hi, 0.4, 0.011);
    blob(Pn, g, x - lx * 0.014, y - ly * 0.014, 0.028, 0.013, HAND_ROT - 0.45, SKIN.shade, 0.3, 0.012);
    // hypothenar
    [x, y] = Hd(-5.0, 3.3);
    blob(Pn, g, x + lx * 0.006, y + ly * 0.006, 0.026, 0.011, HAND_ROT, SKIN.hi, 0.3, 0.009);
    blob(Pn, g, x - lx * 0.013, y - ly * 0.013, 0.028, 0.01, HAND_ROT, SKIN.shade, 0.3, 0.01);
    // the cup of the palm: a soft hollow (its light-side slope in shade, its far slope catching light)
    [x, y] = Hd(-2.6, 0.7);
    blob(Pn, g, x + lx * 0.008, y + ly * 0.008, 0.032, 0.022, HAND_ROT, SKIN.shade, 0.42, 0.016);
    blob(Pn, g, x - lx * 0.017, y - ly * 0.017, 0.026, 0.012, HAND_ROT, SKIN.hi, 0.26, 0.011);
    // yellower, raised pads (thenar, hypothenar, under the fingers)
    for (const [u, v, rx, ry, rot, a] of [[-5.4, -2.7, 0.022, 0.014, -0.45, 0.28], [-5.0, 3.2, 0.022, 0.009, 0, 0.24], [1.3, -2.1, 0.008, 0.006, 0, 0.22], [1.75, -0.32, 0.008, 0.006, 0, 0.22], [1.55, 1.45, 0.008, 0.006, 0, 0.2], [0.85, 2.95, 0.007, 0.005, 0, 0.18]]) {
      [x, y] = Hd(u, v);
      blob(Pn, g, x + lx * 0.003, y + ly * 0.003, rx, ry, HAND_ROT + rot, SKIN.pad, a, rx * 0.6);
    }
    // mounts under the fingers
    for (const [u, v] of [[1.25, -2.1], [1.7, -0.3], [1.5, 1.45], [0.75, 2.95]]) {
      [x, y] = Hd(u, v);
      blob(Pn, g, x + lx * 0.003, y + ly * 0.003, 0.009, 0.0075, HAND_ROT, SKIN.hi, 0.32, 0.005);
      blob(Pn, g, x - lx * 0.005, y - ly * 0.005, 0.009, 0.005, HAND_ROT, SKIN.shade, 0.18, 0.005);
    }
  });
  // fingers: cylinders (shade along the thumb-side edge, light along the little-finger side), rounded pads
  FINGERS.forEach((f, i) => {
    Pn.within(paths.fingers[i], (g) => {
      const top = [], bot = [];
      for (let s = 0.0; s <= 1.0001; s += 0.05) { top.push(Hd(...fingerAt(f, s, -0.95))); bot.push(Hd(...fingerAt(f, s, 0.95))); }
      line(Pn, g, top, SKIN.shade, 0.6, f.w * 0.45 / 100, f.w * 0.2 / 100);
      line(Pn, g, top, SKIN.deep, 0.3, f.w * 0.12 / 100, f.w * 0.06 / 100);
      line(Pn, g, bot, SKIN.hi, 0.3, f.w * 0.35 / 100, f.w * 0.18 / 100);
      for (const [s0, s1, k] of [[0.0, SEG[0], 0.8], [SEG[0], SEG[1], 0.9], [SEG[1], 1.0, 1.1]]) {
        const sm = (s0 + s1) / 2 + 0.01, [x, y] = Hd(...fingerAt(f, sm, 0.2));
        blob(Pn, g, x, y, (s1 - s0) * f.len * 0.34 / 100, f.w * 0.24 / 100, HAND_ROT + f.ang * DEG, SKIN.hi, 0.32 * k, f.w * 0.14 / 100);
        // pads read slightly yellower where they bulge
        blob(Pn, g, x, y, (s1 - s0) * f.len * 0.22 / 100, f.w * 0.16 / 100, HAND_ROT + f.ang * DEG, SKIN.pad, 0.14 * k, f.w * 0.1 / 100);
      }
      for (const s of [SEG[0], SEG[1]]) {
        const [x, y] = Hd(...fingerAt(f, s));
        blob(Pn, g, x, y, f.w * 0.13 / 100, f.w * 0.48 / 100, HAND_ROT + f.ang * DEG, SKIN.shade, 0.22, f.w * 0.08 / 100);
      }
      // the fingertip curls up: its end is a little darker and redder where it turns away
      const [tx, ty] = Hd(...fingerAt(f, 1.0));
      blob(Pn, g, tx, ty, f.w * 0.38 / 100, f.w * 0.5 / 100, HAND_ROT + f.ang * DEG, SKIN.rim, f.curl, f.w * 0.13 / 100);
      // the curled distal pad turns away from the camera: its far half falls into soft shade
      const [cx2, cy2] = Hd(...fingerAt(f, 0.93, -0.3));
      blob(Pn, g, cx2, cy2, f.w * 0.3 / 100, f.w * 0.3 / 100, HAND_ROT + f.ang * DEG, SKIN.shade, f.curl * 0.6, f.w * 0.15 / 100);
    });
  });
  // the gaps between the finger roots: shadowed webs
  Pn.within(handOnly, (g) => {
    for (let i = 0; i < 3; i++) {
      const a = FINGERS[i], b = FINGERS[i + 1];
      const p0 = Hd(...fingerAt(a, -0.02, 1.0)), p1 = Hd(...fingerAt(a, 0.3, 1.0));
      const q1 = Hd(...fingerAt(b, 0.3, -1.0));
      line(Pn, g, [p0, [(p1[0] + q1[0]) / 2, (p1[1] + q1[1]) / 2]], SKIN.deep, 0.35, 0.0035, 0.0025);
      line(Pn, g, [p0, [(p1[0] + q1[0]) / 2, (p1[1] + q1[1]) / 2]], SKIN.deep, 0.5, 0.001, 0.0006);
    }
  });
  // thumb: a tapered cylinder (shade on the outer edge, light toward the palm), pads either side of the IP joint
  Pn.within(paths.thumb, (g) => {
    const side = (k, off) => THUMB.slice(1).map(([u, v, w], i, A) => {
      const q = A[Math.min(i + 1, A.length - 1)], p0 = A[Math.max(i - 1, 0)], du = q[0] - p0[0], dv = q[1] - p0[1], l = Math.hypot(du, dv) || 1;
      return Hd(u - dv / l * w * 0.5 * k + du / l * off, v + du / l * w * 0.5 * k + dv / l * off);
    });
    line(Pn, g, side(-0.95, 0), SKIN.shade, 0.55, 0.009, 0.0045);
    line(Pn, g, side(-1.0, 0), SKIN.deep, 0.28, 0.0025, 0.0012);
    line(Pn, g, side(0.9, 0), SKIN.hi, 0.28, 0.007, 0.004);
    let [x, y] = Hd(-1.3, -5.75);
    blob(Pn, g, x, y, 0.0085, 0.0065, HAND_ROT - 0.78, SKIN.hi, 0.32, 0.003);
    [x, y] = Hd(-2.95, -4.3);
    blob(Pn, g, x, y, 0.0095, 0.0075, HAND_ROT - 0.78, SKIN.hi, 0.22, 0.004);
    [x, y] = Hd(-2.1, -5.0);
    blob(Pn, g, x, y, 0.0035, 0.009, HAND_ROT - 0.78, SKIN.shade, 0.25, 0.002);
    const [tx, ty] = Hd(-0.7, -6.4);
    blob(Pn, g, tx, ty, 0.006, 0.008, HAND_ROT - 0.78, SKIN.rim, 0.3, 0.003);
  });
  // whole-silhouette volume: terminator on the far side, warm rim, lit edge
  volume(Pn, skin, 0.02, SKIN, 1.1);
  Pn.within(skin, (g) => {   // the whole hand and arm: a broad falloff from the lit lower-left to the upper-right
    const c0 = Hd(-3, 0), gr = g.createLinearGradient(c0[0] + SUN.x * 0.06, c0[1] + SUN.y * 0.06, c0[0] - SUN.x * 0.06, c0[1] - SUN.y * 0.06);
    gr.addColorStop(0, rgb(SKIN.hi, 0.12)); gr.addColorStop(0.5, rgb(SKIN.hi, 0)); gr.addColorStop(1, rgb(SKIN.shade, 0.16));
    g.fillStyle = gr; g.fillRect(-2, -2, 4, 4);
  });
  // the forearm and upper arm as a cylinder: shade along the edge away from the light, light along the near edge
  {
    const tb = paths.armTube, wr = Hd(-10.4, 0.15);
    let i0 = 0;
    while (i0 < tb.centre.length - 1 && Math.hypot(tb.centre[i0][0] - Hd(-7.2, 0.15)[0], tb.centre[i0][1] - Hd(-7.2, 0.15)[1]) < Math.hypot(wr[0] - Hd(-7.2, 0.15)[0], wr[1] - Hd(-7.2, 0.15)[1])) i0++;
    const inset = (side, k) => side.slice(i0).map((p, i) => { const c = tb.centre[i + i0]; return [L.lerp(p[0], c[0], k), L.lerp(p[1], c[1], k)]; });
    Pn.within(skin, (g) => {
      line(Pn, g, inset(tb.left, 0.0), SKIN.shade, 0.5, 0.034, 0.016);
      line(Pn, g, inset(tb.left, -0.02), SKIN.deep, 0.3, 0.01, 0.005);
      line(Pn, g, inset(tb.right, 0.3), SKIN.hi, 0.3, 0.022, 0.014);
    });
  }

  // ---- creases
  crease(Pn, handOnly, [[-1.15, 4.42], [-0.62, 3.1], [0.02, 1.68], [0.55, 0.38], [1.25, -0.75], [1.65, -1.5], [1.75, -1.95]], 0.08, 0.5);
  crease(Pn, handOnly, [[-0.4, 2.6], [0.1, 1.5], [0.7, 0.2]], 0.035, 0.3);   // heart line
  crease(Pn, handOnly, [[-0.85, -3.4], [-1.5, -2.25], [-2.3, -0.9], [-2.85, 0.45], [-3.5, 1.9], [-3.95, 2.9]], 0.075, 0.48);                // head line
  crease(Pn, handOnly, [[-0.8, -3.45], [-1.5, -2.62], [-2.7, -1.98], [-4.3, -1.48], [-6.1, -1.32], [-7.8, -1.08], [-8.9, -0.85]], 0.08, 0.52);
  crease(Pn, handOnly, [[-3.6, -1.75], [-5.0, -1.9], [-6.2, -2.1]], 0.03, 0.22);  // life line
  crease(Pn, handOnly, [[-7.2, 0.9], [-5.6, 0.6], [-4.0, 0.4], [-2.2, 0.2]], 0.05, 0.25);   // faint fate line
  crease(Pn, handOnly, [[-9.15, -2.2], [-9.4, -0.6], [-9.42, 1.3], [-9.25, 2.6]], 0.045, 0.2);    // wrist creases (rascettes)
  crease(Pn, skin, [[-9.85, -1.7], [-10.1, 0.0], [-9.95, 2.0]], 0.035, 0.12);
  crease(Pn, handOnly, [[-1.6, -4.2], [-2.4, -3.85], [-3.4, -3.6]], 0.05, 0.3);
  crease(Pn, handOnly, [[-4.3, 3.9], [-3.4, 3.7], [-2.6, 3.8]], 0.04, 0.22);
  // finger flexion creases: palmar digital (base), PIP (a double crease), DIP — short curved arcs, ~75% of the width
  for (const f of FINGERS) {
    for (const [s, dbl, w, a] of [[0.015, false, 0.055, 0.42], [SEG[0], true, 0.045, 0.4], [SEG[1], false, 0.04, 0.36]]) {
      for (const d of dbl ? [-0.07, 0.07] : [0]) {
        const pts = [];
        for (let o = -0.78; o <= 0.781; o += 0.26) pts.push(fingerAt(f, s + d / f.len + 0.02 * (1 - o * o) / f.len * 3, o));
        crease(Pn, handOnly, pts, w, a);
      }
    }
  }
  crease(Pn, handOnly, [[-3.0, -3.55], [-3.55, -4.1], [-4.1, -4.65]], 0.05, 0.38);    // thumb MCP crease
  crease(Pn, handOnly, [[-1.55, -4.4], [-2.05, -4.95], [-2.6, -5.55]], 0.045, 0.42);     // thumb IP crease
  crease(Pn, handOnly, [[-1.7, -4.55], [-2.1, -5.05], [-2.5, -5.45]], 0.03, 0.25);
  // fingerprints on the distal pads (only resolved in the close-up sprite)
  if (Pn.ppm > 4000) {
    Pn.within(handOnly, (g) => {
      const pads = FINGERS.map((f) => ({ c: fingerAt(f, 0.89, 0.05), a: HAND_ROT + f.ang * DEG, rx: f.w * 0.62, ry: f.w * 0.4 }));
      pads.push({ c: [-1.25, -5.75], a: HAND_ROT - 0.78, rx: 1.2, ry: 0.8 });
      for (const pd of pads) {
        const [x, y] = Hd(...pd.c);
        g.strokeStyle = rgb(SKIN.crease, 0.1);
        g.lineWidth = 0.00018;
        for (let k = 1; k < 16; k++) {
          const f = k / 16;
          g.beginPath(); g.ellipse(x, y, pd.rx * f / 100, pd.ry * f / 100, pd.a, 0.15, Math.PI * 2 - 0.15); g.stroke();
        }
      }
    });
  }
  if (Pn.ppm > 4000) {   // micro-wrinkles: a faint lattice of tiny creases on the palm
    const rr = L.rng(19);
    Pn.within(handOnly, (g) => {
      g.filter = Pn.blur(0.00012);
      for (let i = 0; i < 900; i++) {
        const u = -9 + rr() * 11.5, v = -4.2 + rr() * 8.6, a = (rr() < 0.5 ? 0.6 : -0.7) + (rr() - 0.5) * 0.6, l = 0.12 + rr() * 0.25;
        const p0 = Hd(u, v), p1 = Hd(u + Math.cos(a) * l, v + Math.sin(a) * l);
        g.strokeStyle = rgb(SKIN.crease, 0.1);
        g.lineWidth = 0.00012;
        g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.stroke();
      }
    });
  }
  grain(Pn, skin, L.clamp(0.09 * Pn.ppm / 7000, 0.02, 0.09), 3);
  // veins at the inner wrist and forearm: faint, blue-green, under the skin; tendons near the wrist
  Pn.within(skin, (g) => {
    const v1 = [Hd(-10.0, -0.9), along(WRIST, 0.035, -0.009), along(WRIST, 0.09, -0.013), along(WRIST, 0.17, -0.009)];
    const v2 = [Hd(-10.0, 1.5), along(WRIST, 0.05, 0.012), along(WRIST, 0.11, 0.006), along(WRIST, 0.19, 0.013)];
    line(Pn, g, v1, [104, 124, 156], 0.09, 0.0028, 0.0018);
    line(Pn, g, v2, [104, 124, 156], 0.07, 0.0024, 0.0018);
    for (const off of [-0.005, 0.004]) {
      const t = [along(WRIST, 0.012, off), along(WRIST, 0.075, off * 0.8)];
      line(Pn, g, t.map(([x, y]) => [x + SH.x * 0.0012, y + SH.y * 0.0012]), SKIN.shade, 0.12, 0.003, 0.002);
      line(Pn, g, t.map(([x, y]) => [x - SH.x * 0.0012, y - SH.y * 0.0012]), SKIN.hi, 0.15, 0.003, 0.002);
    }
  });
  // the thumbnail, seen edge-on along the thumb's outer side near the tip
  Pn.within(paths.thumb, (g) => {
    const p = new Path2D();
    smooth([Hd(-2.0, -6.25), Hd(-1.5, -6.75), Hd(-1.05, -7.05), Hd(-0.9, -6.85), Hd(-1.4, -6.55), Hd(-1.9, -6.1)], true, 1, p);
    g.save(); g.filter = Pn.blur(0.0004); g.fillStyle = rgb([226, 178, 164], 0.55); g.fill(p); g.restore();
  });
  if (Pn.ppm > 4000) grassOverEdges(Pn, paths);
  return paths;
}

/** A few lawn blades leaning over the edges of the hand and wrist (the hand rests IN the grass, not on top of it). */
function grassOverEdges(Pn, paths) {
  const r = L.rng(606), g = Pn.g;
  // spots on the silhouette: [x, y, outward normal x, y, edge tangent x, y]
  const spots = [];
  const handSpot = (u, v, nAng) => { const [x, y] = Hd(u, v), a = HAND_ROT + nAng; spots.push([x, y, Math.cos(a), Math.sin(a)]); };
  for (let u = -8.4; u <= 0.6; u += 1.3) handSpot(u + (r() - 0.5) * 0.6, 4.55, Math.PI / 2);          // hypothenar edge (the lit side)
  handSpot(5.5, 4.2, Math.PI / 2 + 0.1); handSpot(3.6, 3.9, Math.PI / 2);                         // little finger
  handSpot(9.9, 0.1, 0.2); handSpot(8.2, -3.1, -1.2);                                              // finger tips
  const nb = [armDir[1], -armDir[0]];    // arm outward normal on the thumb side (upper)
  for (let t = 0.02; t < 0.12; t += 0.034) { const q = along(WRIST, t, -0.031); spots.push([q[0], q[1], -nb[0], -nb[1]]); }   // under side (lit)
  for (const t of [0.06]) { const q = along(WRIST, t, 0.031); spots.push([q[0], q[1], nb[0], nb[1]]); }
  for (const [x, y, nx, ny] of spots) {
    const out = 0.004 + r() * 0.006, len = 0.02 + r() * 0.025, wid = 0.0024 + r() * 0.0014;
    const bx = x + nx * out, by = y + ny * out;
    // lean inward over the edge at a shallow angle, mostly along the edge
    const side = r() < 0.5 ? 1 : -1, tx = -ny * side, ty = nx * side;
    const k = 0.35 + r() * 0.35;
    let dx = tx * (1 - k) - nx * k, dy = ty * (1 - k) - ny * k;
    const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    const px = -dy, py = dx, bend = (r() - 0.5) * 0.5;
    const pts = [], lft = [], rgt = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, cx = bx + dx * len * t + px * bend * len * t * t, cy = by + dy * len * t + py * bend * len * t * t;
      const hw = wid / 2 * Math.pow(1 - t, 0.6);
      lft.push([cx + px * hw, cy + py * hw]); rgt.push([cx - px * hw, cy - py * hw]); pts.push([cx, cy]);
    }
    const shape = new Path2D();
    shape.moveTo(...lft[0]); for (const q of lft.slice(1)) shape.lineTo(...q); for (const q of rgt.slice().reverse()) shape.lineTo(...q); shape.closePath();
    g.save(); g.filter = Pn.blur(0.0015); g.translate(SH.x * 0.007, SH.y * 0.007); g.fillStyle = 'rgba(60,30,20,0.28)'; g.fill(shape); g.restore();
    const tone = r();
    const gr = g.createLinearGradient(bx, by, bx + dx * len, by + dy * len);
    gr.addColorStop(0, rgb(L.mix([62, 96, 36], [84, 120, 46], tone))); gr.addColorStop(0.45, rgb(L.mix([104, 142, 54], [140, 176, 72], tone))); gr.addColorStop(1, rgb(L.mix([126, 162, 64], [168, 196, 92], tone)));
    g.fillStyle = gr; g.fill(shape);
    const half = new Path2D();
    const lit = (px * SUN.x + py * SUN.y) > 0 ? rgt : lft;
    half.moveTo(...pts[0]); for (const q of pts.slice(1)) half.lineTo(...q); for (const q of lit.slice().reverse()) half.lineTo(...q); half.closePath();
    g.fillStyle = 'rgba(20,44,10,0.28)'; g.fill(half);
  }
}

// ------------------------------------------------------------------ blanket + props + body
function paintBlanket(Pn) {
  const g = Pn.g;
  const outline = smooth(BLANKET_WORLD.slice());
  const { c, rot } = BLANKET_GEO;
  // contact shadow along the edges (the fabric is a few mm thick and lifts at the folds)
  Pn.castShadow([{ paths: [outline], dx: SH.x * 0.01, dy: SH.y * 0.01, steps: 3 }], 0.35, 0.006);
  g.fillStyle = rgb(BLANKET.base); g.fill(outline);
  Pn.within(outline, (g) => {
    // tartan in the blanket frame
    const o = P(c[0], c[1]);
    g.translate(o[0], o[1]); g.rotate(bodyAng + rot);
    // in this frame x = along the body (a), y = -b ... draw large stripes
    const stripes = (alongX, w, col, a, period, phase) => {
      g.fillStyle = rgb(col, a);
      for (let s = -1.2 + phase; s < 1.2; s += period) {
        if (alongX) g.fillRect(s, -1.2, w, 2.4); else g.fillRect(-1.2, s, 2.4, w);
      }
    };
    for (const ax of [true, false]) {
      stripes(ax, 0.11, BLANKET.navy, 0.5, 0.3, 0.0);
      stripes(ax, 0.03, BLANKET.green, 0.4, 0.3, 0.12);
      stripes(ax, 0.008, BLANKET.cream, 0.7, 0.3, 0.205);
      stripes(ax, 0.008, BLANKET.cream, 0.55, 0.3, 0.035);
      stripes(ax, 0.004, [20, 20, 24], 0.45, 0.15, 0.07);
    }
  });
  // twill weave + wool fuzz
  grain(Pn, Pn.mask([outline]), L.clamp(0.25 * Pn.ppm / 2400, 0.05, 0.25), 11);
  // soft wrinkles and the dip under the body
  const r = L.rng(5);
  Pn.within(outline, (g) => {
    for (let i = 0; i < 16; i++) {
      const a = (r() - 0.5) * 1.7 + c[0], b = (r() - 0.5) * 1.4 + c[1], len = 0.15 + r() * 0.35, ang = bodyAng + rot + (r() - 0.5) * 1.2;
      const [x, y] = P(a, b), dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2, nx = -Math.sin(ang), ny = Math.cos(ang);
      const lit = Math.sign(nx * SUN.x + ny * SUN.y) || 1;
      line(Pn, g, [[x - dx + nx * 0.008 * lit, y - dy + ny * 0.008 * lit], [x + dx + nx * 0.008 * lit, y + dy + ny * 0.008 * lit]], [255, 240, 225], 0.16, 0.012, 0.008);
      line(Pn, g, [[x - dx - nx * 0.01 * lit, y - dy - ny * 0.01 * lit], [x + dx - nx * 0.01 * lit, y + dy - ny * 0.01 * lit]], [20, 6, 6], 0.22, 0.014, 0.01);
    }
  });
  Pn.inner(Pn.mask([outline]), 0, 0, 0.012, [60, 16, 14], 0.35, 'multiply');
  // fringe on the two short ends
  g.save();
  const fr = L.rng(8);
  for (const end of [1, -1]) {
    for (let k = 0; k <= 60; k++) {
      const t = k / 60 - 0.5, b0 = c[1] + t * BLANKET_GEO.lb * 0.98, a0 = c[0] + end * BLANKET_GEO.la / 2;
      const rotP = (a, b) => { const da = a - c[0], db = b - c[1]; return P(c[0] + da * Math.cos(rot) - db * Math.sin(rot), c[1] + da * Math.sin(rot) + db * Math.cos(rot)); };
      const p0 = rotP(a0 - end * 0.004, b0), p1 = rotP(a0 + end * (0.035 + fr() * 0.015), b0 + (fr() - 0.5) * 0.012);
      g.strokeStyle = rgb(L.mix(BLANKET.cream, BLANKET.base, fr() * 0.6), 0.9);
      g.lineWidth = 0.004; g.lineCap = 'round';
      g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.stroke();
    }
  }
  g.restore();
}

function rectPts(cx, cy, w, h, ang, round = 0.15) {
  // a rounded rectangle in body frame -> world points
  const ca = Math.cos(ang * DEG), sa = Math.sin(ang * DEG), out = [];
  const r = Math.min(w, h) * round;
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
  for (const [x, y, a0] of corners) for (let k = 0; k <= 4; k++) {
    const a = (a0 + k * 22.5) * DEG, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    out.push(P(cx + px * ca - py * sa, cy + px * sa + py * ca));
  }
  return orient(out);
}

function propsGeo() {
  const b = PROPS;
  return {
    book: rectPts(b.book.c[0], b.book.c[1], b.book.h, b.book.w, b.book.ang, 0.04),
    phone: rectPts(b.phone.c[0], b.phone.c[1], b.phone.h, b.phone.w, b.phone.ang, 0.12),
    bottle: rectPts(b.bottle.c[0], b.bottle.c[1], b.bottle.len, b.bottle.d, b.bottle.ang, 0.5),
    bag: (() => {
      const { c, ang, w, h } = b.bag, r = L.rng(31), pts = [];
      for (let k = 0; k < 14; k++) {
        const t = k / 14 * Math.PI * 2, ca = Math.cos(t), sa = Math.sin(t);
        const sq = Math.pow(Math.abs(ca), 0.35) * Math.sign(ca), sq2 = Math.pow(Math.abs(sa), 0.35) * Math.sign(sa);
        const x = sq * h / 2 * (1 + (r() - 0.5) * 0.06), y = sq2 * w / 2 * (1 + (r() - 0.5) * 0.06);
        const an = ang * DEG;
        pts.push(P(c[0] + x * Math.cos(an) - y * Math.sin(an), c[1] + x * Math.sin(an) + y * Math.cos(an)));
      }
      return orient(pts);
    })(),
  };
}

// a sneaker seen from above, foot fallen outward: local x from the heel (at the ankle) to the toe, y across
const shoeQ = (s) => (x, y) => { const an = s.ang * DEG; return P(s.heel[0] + x * Math.cos(an) - y * Math.sin(an), s.heel[1] + x * Math.sin(an) + y * Math.cos(an)); };
function shoePts(s) {
  const Q = shoeQ(s), L_ = s.len, w = s.wid / 2;
  return orient([[-0.03, 0], [-0.025, w * 0.8], [0.02, w * 0.95], [0.08, w], [0.14, w * 1.02], [L_ - 0.03, w * 0.85], [L_, w * 0.35],
    [L_ + 0.004, 0], [L_, -w * 0.35], [L_ - 0.03, -w * 0.85], [0.14, -w * 1.0], [0.08, -w * 0.95], [0.02, -w * 0.9], [-0.025, -w * 0.8]].map(([x, y]) => Q(x, y)));
}

function paintBody(Pn, handPaths) {
  const g = Pn.g;
  const geo = propsGeo();
  const hair = orient(Pp(BODY.hair)), face = orient(Pp(BODY.face)), neck = orient(Pp(BODY.neck));
  const shirt = orient(Pp(BODY.shirt)), shorts = orient(Pp(BODY.shorts));
  const legL = tube(BODY.legL.map(([a, b, w]) => [...P(a, b), w]), { capEnd: true, capStart: true });
  const legR = tube(BODY.legR.map(([a, b, w]) => [...P(a, b), w]), { capEnd: true, capStart: true });
  const armR = tube(BODY.armR.map(([a, b, w]) => [...P(a, b), w]), { capEnd: true, capStart: true });
  const shoeL = shoePts(BODY.shoeL), shoeR = shoePts(BODY.shoeR);
  const headP = ellipse(new Path2D(), ...P(...BODY.head.c), BODY.head.ra, BODY.head.rb, bodyAng);
  // sleeves: around each upper arm near the shoulder
  const sleeveL = tube([[...P(0.6, 0.1), 0.15], [...SHOULDER_L, 0.15], [...along(SHOULDER_L, -0.07), 0.135], [...along(SHOULDER_L, -0.13), 0.125]], { capEnd: false, capStart: true });
  const sleeveR = tube([[...P(0.5, -0.1), 0.15], [...P(0.56, -0.17), 0.15], [...P(0.63, -0.21), 0.135], [...P(0.69, -0.24), 0.125]], { capEnd: false, capStart: true });
  const S = (pts) => smooth(pts);
  const p = {
    hair: S(hair), face: S(face), neck: S(neck), shirt: S(shirt), shorts: S(shorts), legL: S(legL.pts), legR: S(legR.pts),
    armR: S(armR.pts), shoeL: S(shoeL), shoeR: S(shoeR), sleeveL: S(sleeveL.pts), sleeveR: S(sleeveR.pts), head: headP,
    book: S(geo.book), phone: S(geo.phone), bottle: S(geo.bottle), bag: S(geo.bag),
  };
  // ---- cast shadows (swept by height), onto blanket and grass
  const sh = (paths, h) => ({ paths, dx: SH.x * h * SHK, dy: SH.y * h * SHK });
  // one union shadow (the sun is a sharp light: ~2 mm of penumbra per 20 cm of height; grass softens it a little)
  Pn.castShadow([
    sh([p.legL, p.legR], 0.12), sh([p.shorts], 0.17), sh([p.shirt, p.sleeveR, p.armR], 0.21), sh([p.neck], 0.12),
    sh([p.head, p.hair], 0.2), sh([p.shoeL, p.shoeR], 0.22), sh([p.sleeveL], 0.12),
    sh([p.book], 0.035), sh([p.bottle], 0.074), sh([p.phone], 0.009), sh([p.bag], 0.12),
    sh([handPaths.arm], 0.06), sh([handPaths.palm, ...handPaths.fingers], 0.028), sh([handPaths.thumb], 0.034),
  ], 0.42, 0.0035);
  // a tight contact shadow (ambient occlusion where things touch the ground)
  Pn.castShadow([
    { paths: [p.legL, p.legR, p.shorts, p.shirt, p.head, p.hair, p.armR, p.shoeL, p.shoeR, p.book, p.bottle, p.bag, p.phone,
      handPaths.arm, handPaths.palm, handPaths.thumb, ...handPaths.fingers], dx: SH.x * 0.004, dy: SH.y * 0.004, steps: 2 },
  ], 0.28, 0.004);

  // ---- props
  // tote bag: natural canvas, slumped, with handles
  g.fillStyle = rgb([212, 200, 172]); g.fill(p.bag);
  const bagM = Pn.mask([p.bag]);
  Pn.within(bagM, (g) => {
    const r = L.rng(41);
    for (let i = 0; i < 9; i++) {
      const [x, y] = P(PROPS.bag.c[0] + (r() - 0.5) * 0.3, PROPS.bag.c[1] + (r() - 0.5) * 0.3), a = r() * Math.PI, l = 0.08 + r() * 0.12;
      line(Pn, g, [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], [120, 104, 80], 0.35, 0.008, 0.006);
      line(Pn, g, [[x + SUN.x * 0.008, y + SUN.y * 0.008], [x + Math.cos(a) * l + SUN.x * 0.008, y + Math.sin(a) * l + SUN.y * 0.008]], [250, 244, 230], 0.3, 0.006, 0.005);
    }
    // printed logo-free band
    const [x, y] = P(PROPS.bag.c[0] - 0.02, PROPS.bag.c[1]);
    blob(Pn, g, x, y, 0.06, 0.09, bodyAng, [70, 92, 70], 0.0, 0.01);
  });
  volume(Pn, bagM, 0.12, { shade: [140, 124, 100], deep: [90, 76, 60], rim: [160, 140, 110], hi: [255, 250, 236] }, 0.8);
  grain(Pn, bagM, 0.12, 21);
  {
    // handles: two loops of webbing lying on the blanket
    const { c, ang } = PROPS.bag;
    for (const off of [-0.06, 0.06]) {
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12 * Math.PI;
        const x = 0.1 + Math.sin(t) * 0.07, y = off * 0.9 + Math.cos(t) * 0.075;
        const an = ang * DEG;
        pts.push(P(c[0] + x * Math.cos(an) - y * Math.sin(an), c[1] + x * Math.sin(an) + y * Math.cos(an)));
      }
      line(Pn, g, pts.map(([x, y]) => [x + SH.x * 0.003, y + SH.y * 0.003]), [20, 10, 6], 0.25, 0.02, 0.004);
      line(Pn, g, pts, [186, 172, 140], 1, 0.018);
      line(Pn, g, pts.map(([x, y]) => [x + SUN.x * 0.003, y + SUN.y * 0.003]), [226, 216, 192], 0.5, 0.005);
    }
  }
  // paperback, open and face down (a tent): cover + spine ridge
  {
    const bm = Pn.mask([p.book]);
    g.fillStyle = rgb([38, 92, 104]); g.fill(p.book);
    Pn.within(bm, (g) => {
      const { c, ang, w, h } = PROPS.book, an = ang * DEG;
      const Q = (x, y) => P(c[0] + x * Math.cos(an) - y * Math.sin(an), c[1] + x * Math.sin(an) + y * Math.cos(an));
      // the half facing away from the sun is darker; spine down the middle
      const half = new Path2D(); smooth([Q(-h / 2, 0), Q(h / 2, 0), Q(h / 2, w / 2), Q(-h / 2, w / 2)], true, 0, half);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fill(half);
      line(Pn, g, [Q(-h / 2, 0), Q(h / 2, 0)], [226, 222, 205], 0.9, 0.006);
      // a title band and author block (no legible text)
      for (const [y0, col] of [[-w * 0.3, [232, 176, 70]], [w * 0.3, [232, 176, 70]]]) {
        const band = new Path2D(); smooth([Q(-h * 0.25, y0 - 0.025), Q(h * 0.25, y0 - 0.025), Q(h * 0.25, y0 + 0.025), Q(-h * 0.25, y0 + 0.025)], true, 0, band);
        g.fillStyle = rgb(col, 0.85); g.fill(band);
      }
      // page edges peeking at the bottom
      line(Pn, g, [Q(-h / 2 + 0.004, -w / 2), Q(h / 2 - 0.004, -w / 2)], [244, 238, 220], 0.9, 0.004);
      line(Pn, g, [Q(-h / 2 + 0.004, w / 2), Q(h / 2 - 0.004, w / 2)], [244, 238, 220], 0.9, 0.004);
    });
    volume(Pn, bm, 0.05, { shade: [20, 50, 60], deep: [10, 20, 30], rim: [30, 70, 80], hi: [180, 230, 235] }, 0.5);
  }
  // phone: face down, dark case, camera bump
  {
    g.fillStyle = rgb([34, 34, 38]); g.fill(p.phone);
    const pm = Pn.mask([p.phone]);
    volume(Pn, pm, 0.03, { shade: [0, 0, 0], deep: [0, 0, 0], rim: [70, 70, 76], hi: [150, 156, 170] }, 0.6);
    const { c, ang, h, w } = PROPS.phone, an = ang * DEG;
    const Q = (x, y) => P(c[0] + x * Math.cos(an) - y * Math.sin(an), c[1] + x * Math.sin(an) + y * Math.cos(an));
    const cam = new Path2D(); smooth(rectPts(c[0] + 0.05 * Math.cos(an) - 0.018 * Math.sin(an), c[1] + 0.05 * Math.sin(an) + 0.018 * Math.cos(an), 0.035, 0.028, PROPS.phone.ang, 0.3), true, 1, cam);
    g.fillStyle = rgb([58, 58, 64]); g.fill(cam);
    void Q; void h; void w;
  }
  // water bottle: sage-green steel, lying; silver cap; specular stripe along the lit side
  {
    const bm = Pn.mask([p.bottle]);
    g.fillStyle = rgb([118, 146, 128]); g.fill(p.bottle);
    const { c, ang, len, d } = PROPS.bottle, an = ang * DEG;
    const Q = (x, y) => P(c[0] + x * Math.cos(an) - y * Math.sin(an), c[1] + x * Math.sin(an) + y * Math.cos(an));
    Pn.within(bm, (g) => {
      const cap = new Path2D(); smooth([Q(len / 2 - 0.045, -d), Q(len / 2 + 0.01, -d), Q(len / 2 + 0.01, d), Q(len / 2 - 0.045, d)], true, 0, cap);
      g.fillStyle = rgb([196, 200, 204]); g.fill(cap);
      line(Pn, g, [Q(len / 2 - 0.046, -d), Q(len / 2 - 0.046, d)], [40, 50, 44], 0.5, 0.003);
    });
    volume(Pn, bm, d, { shade: [40, 60, 50], deep: [10, 20, 16], rim: [70, 90, 80], hi: [240, 250, 245] }, 1);
    Pn.within(bm, (g) => {
      // sharp specular highlight of the sky/sun on the lit side
      const off = d * 0.22;
      const nx = -Math.sin(bodyAng + an), ny = Math.cos(bodyAng + an), sgn = Math.sign(nx * SUN.x + ny * SUN.y) || 1;
      const p0 = Q(-len / 2 + 0.02, 0), p1 = Q(len / 2 - 0.05, 0);
      line(Pn, g, [[p0[0] + nx * off * sgn, p0[1] + ny * off * sgn], [p1[0] + nx * off * sgn, p1[1] + ny * off * sgn]], [255, 255, 255], 0.75, d * 0.07, d * 0.03);
    });
  }

  // ---- the person, back to front
  const skinPal = SKIN;
  // right arm, raised, hand tucked under the head
  g.fillStyle = rgb(SKIN.base); g.fill(p.armR);
  const armRM = Pn.mask([p.armR]);
  volume(Pn, armRM, 0.08, skinPal, 0.9);
  grain(Pn, armRM, 0.05, 4);
  // legs
  for (const [lp, lg] of [[p.legL, legL], [p.legR, legR]]) {
    g.fillStyle = rgb(SKIN.tan); g.fill(lp);
    const m = Pn.mask([lp]);
    // knee cap and shin highlight
    Pn.within(m, (g) => {
      const kn = lg.centre[Math.round(lg.centre.length * 0.45)];
      blob(Pn, g, kn[0] + SUN.x * 0.01, kn[1] + SUN.y * 0.01, 0.035, 0.03, bodyAng, SKIN.hi, 0.3, 0.015);
      line(Pn, g, lg.centre.slice(Math.round(lg.centre.length * 0.5)).map(([x, y]) => [x + SUN.x * 0.012, y + SUN.y * 0.012]), SKIN.hi, 0.25, 0.02, 0.012);
    });
    volume(Pn, m, 0.11, skinPal, 1);
    grain(Pn, m, 0.05, 5);
  }
  // sneakers: white leather uppers seen from above (toes up, feet fallen outward), laces, the gum sole on the inner edge
  for (const [sp, s] of [[p.shoeL, BODY.shoeL], [p.shoeR, BODY.shoeR]]) {
    const Q = shoeQ(s), w = s.wid / 2, m = Pn.mask([sp]);
    g.fillStyle = rgb(SHOE); g.fill(sp);
    Pn.within(m, (g) => {
      const inner = Math.sign(s.ang) > 0 ? 1 : -1;   // the side facing the other foot shows the sole
      const sole = new Path2D(); smooth([Q(-0.03, inner * w * 0.55), Q(0.08, inner * w * 0.82), Q(s.len - 0.02, inner * w * 0.7), Q(s.len + 0.01, inner * w * 1.4), Q(0.08, inner * w * 1.4), Q(-0.04, inner * w * 1.2)], true, 1, sole);
      g.fillStyle = rgb([196, 178, 150]); g.fill(sole);
      line(Pn, g, [Q(-0.02, inner * w * 0.55), Q(0.08, inner * w * 0.8), Q(s.len - 0.02, inner * w * 0.68)], [150, 140, 120], 0.7, 0.002);
      // collar and sock at the heel end (under the leg)
      const col = new Path2D(); ellipse(col, ...Q(0.0, 0), 0.03, 0.036, bodyAng + s.ang * DEG);
      g.fillStyle = rgb([244, 244, 240]); g.fill(col);
      line(Pn, g, [Q(0.03, -w * 0.5), Q(0.035, 0), Q(0.03, w * 0.5)], [170, 170, 172], 0.8, 0.0025);
      // tongue + laces
      const tongue = new Path2D(); smooth([Q(0.03, -0.018), Q(0.12, -0.02), Q(0.125, 0.02), Q(0.03, 0.018)], true, 1, tongue);
      g.fillStyle = rgb([226, 226, 222]); g.fill(tongue);
      for (let k = 0; k < 5; k++) {
        const x = 0.045 + k * 0.017;
        line(Pn, g, [Q(x, -0.017), Q(x + 0.006, 0.017)], [246, 246, 244], 1, 0.0035);
        line(Pn, g, [Q(x + 0.006, -0.017), Q(x, 0.017)], [200, 200, 198], 1, 0.0035);
      }
      // toe cap seam + perforations
      line(Pn, g, [Q(s.len - 0.055, -w * 0.8), Q(s.len - 0.045, 0), Q(s.len - 0.055, w * 0.8)], [176, 176, 176], 0.7, 0.0018);
    });
    volume(Pn, m, 0.07, { shade: [150, 156, 172], deep: [96, 100, 112], rim: [184, 184, 190], hi: [255, 255, 255] }, 0.9);
  }
  // shorts (navy cotton): folds radiating from the crotch, hems
  {
    g.fillStyle = rgb(SHORTS); g.fill(p.shorts);
    const m = Pn.mask([p.shorts]);
    Pn.within(m, (g) => {
      const r = L.rng(17);
      for (let i = 0; i < 10; i++) {
        const side = i % 2 ? 1 : -1, a0 = -0.02 - r() * 0.08, b0 = side * (0.02 + r() * 0.03);
        const a1 = a0 - 0.08 - r() * 0.1, b1 = side * (0.08 + r() * 0.1);
        line(Pn, g, [P(a0, b0), P(a1, b1)], [16, 20, 34], 0.45, 0.008, 0.006);
        line(Pn, g, [P(a0, b0 + 0.008), P(a1, b1 + 0.008)].map(([x, y]) => [x + SUN.x * 0.006, y + SUN.y * 0.006]), [120, 134, 170], 0.3, 0.006, 0.005);
      }
      line(Pn, g, [P(0.095, 0.17), P(0.105, 0.0), P(0.095, -0.17)], [20, 26, 40], 0.5, 0.004);   // waistband seam
      line(Pn, g, [P(-0.235, 0.03), P(-0.245, 0.11), P(-0.23, 0.18)], [20, 26, 40], 0.5, 0.004);
      line(Pn, g, [P(-0.235, -0.03), P(-0.245, -0.11), P(-0.23, -0.18)], [20, 26, 40], 0.5, 0.004);
    });
    volume(Pn, m, 0.14, { shade: [26, 30, 44], deep: [10, 12, 20], rim: [40, 46, 70], hi: [150, 166, 200] }, 0.9);
    grain(Pn, m, 0.1, 6);
  }
  // left arm (the hand sprite's arm) — painted by paintHand afterwards; the shirt and sleeve go on top of its root
  return { p, armRM };
}

function paintTop(Pn) {
  // shirt, sleeves, neck, head — drawn over the arms' roots
  const g = Pn.g;
  const shirt = smooth(orient(Pp(BODY.shirt)));
  const sleeveL = tube([[...P(0.6, 0.1), 0.15], [...SHOULDER_L, 0.15], [...along(SHOULDER_L, -0.07), 0.135], [...along(SHOULDER_L, -0.13), 0.125]], { capEnd: false, capStart: true });
  const sleeveR = tube([[...P(0.5, -0.1), 0.15], [...P(0.56, -0.17), 0.15], [...P(0.63, -0.21), 0.135], [...P(0.69, -0.24), 0.125]], { capEnd: false, capStart: true });
  const sl = smooth(sleeveL.pts), sr = smooth(sleeveR.pts);
  const m = Pn.mask([shirt, sl, sr]);
  g.fillStyle = rgb(SHIRT); g.fill(shirt); g.fill(sl); g.fill(sr);
  Pn.within(m, (g) => {
    // folds: from the armpits toward the waist, and around the sleeves; light on the lower-left side of each ridge
    const r = L.rng(23);
    const fold = (pts, w, k = 1) => {
      line(Pn, g, pts.map(([x, y]) => [x + SH.x * w * 0.6, y + SH.y * w * 0.6]), [150, 156, 178], 0.2 * k, w * 1.4, w * 1.3);
      line(Pn, g, pts.map(([x, y]) => [x - SH.x * w * 0.5, y - SH.y * w * 0.5]), [255, 255, 255], 0.3 * k, w, w);
    };
    // fabric pulled from the raised right shoulder toward the left hip, and from the left shoulder down the side
    for (let i = 0; i < 5; i++) fold([P(0.5 - i * 0.03, -0.15 + r() * 0.04), P(0.34 - i * 0.03, -0.05 + r() * 0.04), P(0.16 - i * 0.02, 0.06 + r() * 0.05)], 0.018 + r() * 0.01, 0.8);
    for (let i = 0; i < 3; i++) fold([P(0.52 - i * 0.05, 0.15 + r() * 0.03), P(0.36 - i * 0.05, 0.13 + r() * 0.03), P(0.2 - i * 0.04, 0.15)], 0.015 + r() * 0.008, 0.7);
    // slack bunching above the waistband
    for (let i = 0; i < 4; i++) fold([P(0.14 + r() * 0.03, -0.14 + i * 0.08), P(0.1, -0.1 + i * 0.08 + r() * 0.02)], 0.014, 0.7);
    // the chest and belly catch the light; the sides fall away toward the blanket
    blob(Pn, g, ...P(0.42, -0.05), 0.12, 0.09, bodyAng, [255, 255, 255], 0.25, 0.05);
    // crew neck rib
    line(Pn, g, [P(0.6, 0.075), P(0.585, 0.04), P(0.575, 0.0), P(0.585, -0.04), P(0.6, -0.075)], [205, 205, 200], 1, 0.016);
    // hem stitch
    line(Pn, g, [P(0.062, 0.17), P(0.052, 0.0), P(0.062, -0.17)], [200, 200, 196], 0.8, 0.003);
    // sleeve hems
    for (const tb of [sleeveL, sleeveR]) {
      const n = tb.left.length - 1;
      line(Pn, g, [tb.left[n], tb.right[n]], [196, 198, 200], 0.9, 0.006);
    }
  });
  volume(Pn, m, 0.18, { shade: [150, 158, 178], deep: [96, 102, 120], rim: [190, 192, 200], hi: [255, 255, 255] }, 1);
  grain(Pn, m, 0.08, 7);
  // neck
  const neck = smooth(orient(Pp(BODY.neck)));
  g.fillStyle = rgb(SKIN.base); g.fill(neck);
  const nm = Pn.mask([neck]);
  volume(Pn, nm, 0.08, SKIN, 1);
  // head: hair behind (spread on the blanket), face
  const hair = smooth(orient(Pp(BODY.hair)));
  const head = ellipse(new Path2D(), ...P(0.775, 0), 0.085, 0.084, bodyAng);
  const hm = Pn.mask([hair, head]);
  g.fillStyle = rgb(HAIR); g.fill(hair); g.fill(head);
  Pn.within(hm, (g) => {
    const r = L.rng(51), hc = P(0.74, 0);
    for (let i = 0; i < 900; i++) {
      // strands from the hairline, swept back over the crown and out onto the blanket
      const side = r() * 2 - 1, a0 = 0.8 - Math.abs(side) * 0.06, b0 = side * 0.07;
      const p0 = P(a0, b0), p1 = P(a0 + 0.04 + r() * 0.04, b0 * 1.2 + side * 0.02), p2 = P(0.86 + r() * 0.02 - Math.abs(side) * 0.08, b0 * 1.35 + side * 0.03);
      const lit = L.clamp(0.5 - side * 0.3 + (r() - 0.5) * 0.6);
      g.strokeStyle = rgb(L.mix([30, 20, 14], [120, 90, 64], lit), 0.4);
      g.lineWidth = 0.0008 + r() * 0.001;
      g.beginPath(); g.moveTo(...p0); g.quadraticCurveTo(...p1, ...p2); g.stroke();
    }
    void hc;
  });
  volume(Pn, hm, 0.1, { shade: [20, 12, 8], deep: [8, 4, 2], rim: [60, 40, 30], hi: [190, 150, 110] }, 0.8);
  // ears
  for (const sd of [1, -1]) {
    const e = ellipse(new Path2D(), ...P(0.736, sd * 0.079), 0.012, 0.025, bodyAng);
    g.fillStyle = rgb(SKIN.base); g.fill(e);
    const em = Pn.mask([e]);
    volume(Pn, em, 0.02, SKIN, 1);
    Pn.within(em, (g) => blob(Pn, g, ...P(0.738, sd * 0.076), 0.008, 0.016, bodyAng, SKIN.deep, 0.35, 0.003));
  }
  const face = smooth(orient(Pp(BODY.face)));
  g.fillStyle = rgb(SKIN.base); g.fill(face);
  const fm = Pn.mask([face]);
  Pn.within(fm, (g) => {
    // light from the feet side and the body's right (-a, -b): brow and forehead, lit right cheekbone, soft far temple
    blob(Pn, g, ...P(0.79, -0.012), 0.02, 0.045, bodyAng, SKIN.hi, 0.28, 0.014);
    blob(Pn, g, ...P(0.775, 0.06), 0.02, 0.02, bodyAng, SKIN.shade, 0.25, 0.012);
    blob(Pn, g, ...P(0.715, -0.05), 0.018, 0.014, bodyAng, SKIN.hi, 0.3, 0.008);
    blob(Pn, g, ...P(0.705, 0.05), 0.02, 0.016, bodyAng, SKIN.shade, 0.22, 0.01);
    blob(Pn, g, ...P(0.7, -0.04), 0.016, 0.014, bodyAng, SKIN.pink, 0.22, 0.009);
    blob(Pn, g, ...P(0.7, 0.04), 0.016, 0.014, bodyAng, SKIN.pink, 0.22, 0.009);
    // eye sockets: soft shade around the glasses
    for (const sd of [-1, 1]) blob(Pn, g, ...P(0.748, sd * 0.034), 0.024, 0.03, bodyAng, SKIN.shade, 0.3, 0.008);
    // nose: bridge and tip lit on the right side, its shadow toward +b and the head
    line(Pn, g, [P(0.75, -0.004), P(0.71, -0.004)], SKIN.hi, 0.5, 0.006, 0.003);
    blob(Pn, g, ...P(0.722, 0.013), 0.018, 0.007, bodyAng, SKIN.shade, 0.4, 0.004);
    blob(Pn, g, ...P(0.705, 0.0), 0.007, 0.01, bodyAng, SKIN.pink, 0.3, 0.003);
    blob(Pn, g, ...P(0.706, -0.004), 0.003, 0.004, bodyAng, SKIN.hi, 0.4, 0.0015);
    for (const sd of [-1, 1]) blob(Pn, g, ...P(0.699, sd * 0.007), 0.002, 0.0035, bodyAng, SKIN.deep, 0.4, 0.0012);   // nostrils
    blob(Pn, g, ...P(0.687, 0.002), 0.008, 0.004, bodyAng, SKIN.shade, 0.15, 0.003);              // philtrum
    // mouth: relaxed closed lips, low contrast; a shadow under the lower lip
    const lip = new Path2D();
    smooth([P(0.677, -0.021), P(0.68, -0.009), P(0.678, 0.0), P(0.68, 0.009), P(0.677, 0.021), P(0.67, 0.011), P(0.668, 0.0), P(0.67, -0.011)], true, 1, lip);
    g.save(); g.filter = Pn.blur(0.0012); g.fillStyle = rgb([194, 128, 120], 0.7); g.fill(lip); g.restore();
    line(Pn, g, [P(0.6762, -0.019), P(0.677, 0.0), P(0.6762, 0.019)], [128, 76, 70], 0.55, 0.0014, 0.0006);
    blob(Pn, g, ...P(0.662, 0.004), 0.004, 0.014, bodyAng, SKIN.shade, 0.22, 0.003);
    // chin catches light; faint stubble shadow on the jaw
    blob(Pn, g, ...P(0.65, -0.006), 0.009, 0.016, bodyAng, SKIN.hi, 0.25, 0.005);
    blob(Pn, g, ...P(0.67, 0.0), 0.025, 0.05, bodyAng, [120, 110, 112], 0.08, 0.012);
  });
  volume(Pn, fm, 0.1, SKIN, 0.9);
  // sunglasses: two dark lenses, a bridge, the temples running back into the hair; sky reflection
  for (const sd of [-1, 1]) {
    const lens = new Path2D();
    smooth([P(0.765, sd * 0.012), P(0.768, sd * 0.035), P(0.762, sd * 0.058), P(0.745, sd * 0.062), P(0.73, sd * 0.052), P(0.728, sd * 0.03), P(0.735, sd * 0.012)].map((q) => q), true, 1, lens);
    Pn.castShadow([{ paths: [lens], dx: SH.x * 0.012, dy: SH.y * 0.012, steps: 3 }], 0.35, 0.003);
    g.fillStyle = rgb([18, 20, 24]); g.fill(lens);
    Pn.within(lens, (g) => {
      const c0 = P(0.75, sd * 0.03);
      const gr = g.createLinearGradient(...P(0.765, sd * 0.06), ...P(0.73, sd * 0.01));
      gr.addColorStop(0, 'rgba(120,150,190,0.0)'); gr.addColorStop(0.55, 'rgba(120,150,190,0.25)'); gr.addColorStop(1, 'rgba(220,235,255,0.45)');
      g.fillStyle = gr; g.fillRect(c0[0] - 0.1, c0[1] - 0.1, 0.2, 0.2);
    });
    line(Pn, g, [P(0.765, sd * 0.012), P(0.768, sd * 0.035), P(0.762, sd * 0.058), P(0.745, sd * 0.062)], [40, 40, 44], 1, 0.0028);
    line(Pn, g, [P(0.755, sd * 0.062), P(0.76, sd * 0.078), P(0.775, sd * 0.084)], [28, 28, 30], 1, 0.003);
  }
  line(Pn, g, [P(0.758, -0.012), P(0.762, 0.0), P(0.758, 0.012)], [30, 30, 34], 1, 0.003);
  // eyebrows peeking above the frames
  for (const sd of [-1, 1]) line(Pn, g, [P(0.772, sd * 0.014), P(0.777, sd * 0.035), P(0.772, sd * 0.055)], [60, 40, 30], 0.6, 0.004, 0.0015);
}

function paintSleeveShadowOnArm(Pn, handPaths) {
  // the sleeve hem casts a soft shadow onto the upper arm (toward the upper right of the hem)
  Pn.within(handPaths.arm, (g) => {
    const h0 = along(SHOULDER_L, -0.13);
    blob(Pn, g, h0[0] + SH.x * 0.02, h0[1] + SH.y * 0.02, 0.05, 0.03, Math.atan2(armDir[1], armDir[0]), [40, 20, 10], 0.35, 0.012);
  });
}

// ------------------------------------------------------------------ build
export function paintHero(Pn) {
  paintBlanket(Pn);
  const handPaths = handPathsOf();
  paintBody(Pn, handPaths);
  paintHand(Pn);
  paintSleeveShadowOnArm(Pn, handPaths);
  paintTop(Pn);
}

let SPR = null;
const REGIONS = {
  body: { x0: -2.02, y0: -1.25, x1: 0.4, y1: 1.7, ppm: 1100 },
  arm: { x0: -0.78, y0: -0.44, x1: 0.2, y1: 0.16, ppm: 2400 },
  hand: { x0: -0.24, y0: -0.135, x1: 0.165, y1: 0.115, ppm: 7000 },
};
const TILE = 1800;
function build(name) {
  // painted in tiles (each with a margin so blurs see their neighbours) to keep every canvas small
  const r = REGIONS[name], W_ = Math.ceil((r.x1 - r.x0) * r.ppm), H_ = Math.ceil((r.y1 - r.y0) * r.ppm);
  const nx = Math.ceil(W_ / TILE), ny = Math.ceil(H_ / TILE), tiles = [], MARGIN = Math.min(0.12, 320 / r.ppm);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const tx0 = r.x0 + i * TILE / r.ppm, ty0 = r.y0 + j * TILE / r.ppm;
    const tw = Math.min(TILE, W_ - i * TILE), th = Math.min(TILE, H_ - j * TILE);
    const Pn = new Painter(tx0 - MARGIN, ty0 - MARGIN, tx0 + tw / r.ppm + MARGIN, ty0 + th / r.ppm + MARGIN, r.ppm);
    paintHero(Pn);
    Pn.free();
    const [c, g] = mk(tw + 2, th + 2);   // 2 px of overlap with the next tile hides the seams
    const m = Math.round(MARGIN * r.ppm);
    g.drawImage(Pn.cv, m, m, tw + 2, th + 2, 0, 0, tw + 2, th + 2);
    tiles.push({ mips: mipChain(c), x0: tx0, y0: ty0, ppm: r.ppm });
  }
  return tiles;
}
export function heroSprites() {
  if (!SPR) SPR = { body: build('body'), arm: build('arm'), hand: build('hand') };
  return SPR;
}
/** Draw the hero at the current camera: the body sprite always, finer sprites on top while they add detail. */
export function drawHero(c, v) {
  const lf = v.cam.lf;
  const S = heroSprites();
  for (const t of S.body) drawSprite(c, v, t, 1);
  if (lf < 0.75) for (const t of S.arm) drawSprite(c, v, t, 1 - L.smoothstep(L.clamp((lf - 0.45) / 0.3)));
  if (lf < 0.2) for (const t of S.hand) drawSprite(c, v, t, 1 - L.smoothstep(L.clamp((lf + 0.05) / 0.25)));
}
export { bbox };
