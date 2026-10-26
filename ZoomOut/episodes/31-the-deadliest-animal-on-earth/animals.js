// Animal silhouettes for Zoom Out 31 — ONE consistent style: refined graphite silhouettes (cool top light → near-black
// base), a thin cool rim light on the upper-left edges (inner-shadow trick), a faint cool backglow for separation.
// No faces, no teeth, no gore, no attack poses. The mosquito is the one detailed exception (macro scale), drawn in the
// same palette with the episode's red only as a thin back-rim.
//
//   drawAnimal(c, kind, { x, y, w, h, alpha, t, rim, flip })   kind: 'shark' | 'snake' | 'dog' | 'human' | 'mosquito' | 'virus'
//     fits the animal's own bounding box into the w × h box centred on (x, y) (aspect kept). Pure function of t.
import * as L from '../../../engine/runtime/lib.js';

const RED = [230, 60, 60];

/** Closed / open Catmull-Rom spline through pts ([x, y, corner?]) -> Path2D. corner = 1: a sharp point (zero tangent). */
export function smoothPath(pts, closed = true, p = new Path2D()) {
  const n = pts.length;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[L.clamp(i, 0, n - 1)]);
  p.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k1 = p1[2] ? 0 : 1 / 6, k2 = p2[2] ? 0 : 1 / 6;
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k1, p1[1] + (p2[1] - p0[1]) * k1,
      p2[0] - (p3[0] - p1[0]) * k2, p2[1] - (p3[1] - p1[1]) * k2, p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return p;
}

// ------------------------------------------------------------------ shark (great white, side view, facing right)
const SHARK = [
  [514, 12], [500, -18], [456, -58], [380, -92], [288, -114], [186, -126], [104, -130],
  [74, -138], [44, -196], [8, -260], [-28, -312, 1],
  [-38, -260], [-50, -194], [-72, -140], [-90, -124],
  [-172, -102], [-262, -76], [-326, -54],
  [-336, -58], [-356, -80, 1], [-366, -48],
  [-402, -34], [-442, -26],
  [-474, -62], [-514, -130], [-560, -212], [-592, -262, 1],
  [-574, -198], [-550, -118], [-526, -48], [-514, -4, 1],
  [-530, 50], [-550, 118], [-568, 180, 1],
  [-534, 140], [-494, 80], [-452, 30],
  [-412, 30], [-376, 38],
  [-360, 44], [-374, 72, 1], [-340, 54],
  [-262, 70], [-204, 82],
  [-186, 88], [-214, 124, 1], [-150, 98],
  [-62, 108], [38, 112], [118, 108],
  [140, 110], [118, 158], [80, 210], [42, 248, 1], [84, 228], [146, 180], [184, 130], [198, 108],
  [262, 96], [340, 76], [414, 50], [470, 30], [504, 20],
];
let sharkP = null;
const sharkPath = () => (sharkP ??= smoothPath(SHARK));
const SHARK_BOX = { x0: -595, x1: 516, y0: -314, y1: 250 };

// ------------------------------------------------------------------ dog (village / pariah type, standing, side view, facing right)
// Proportions: withers height 300, point of shoulder → buttock 346 (≈ 1.15 : 1), deep chest with a tuck-up, short thick
// neck, skull with a stop, muzzle ≈ 42 % of the head, two erect triangular ears, straight forelegs with small paws,
// angulated hind legs with hocks, tail in a loose upward curve. Ground y = 300.
const DOG = [
  // withers → back → croup
  [80, 0], [10, 6], [-80, 8], [-160, 4], [-196, 10],
  // tail: a loose upward curve
  [-214, 2], [-240, -22], [-258, -58], [-256, -96], [-246, -110, 1], [-238, -96], [-238, -60], [-226, -30], [-212, -8],
  // buttock → back of thigh → hock (angulated) → rear pastern → paw
  [-222, 30], [-230, 70], [-228, 112], [-218, 150], [-214, 192], [-216, 214, 1], [-206, 244], [-198, 276], [-200, 300, 1],
  [-164, 300, 1], [-166, 290], [-174, 274], [-180, 244], [-182, 224], [-176, 200], [-164, 176], [-146, 150],
  // stifle → flank → tuck-up → deep chest → elbow
  [-128, 128], [-100, 116], [-56, 124], [-6, 142], [36, 158], [58, 162],
  // straight foreleg, small paw
  [64, 178], [66, 230], [66, 270], [62, 290], [64, 300, 1], [100, 300, 1], [98, 290], [94, 272], [92, 228], [92, 180],
  // forechest → point of shoulder → short thick neck → throat
  [104, 140], [120, 98], [126, 66], [140, 36], [160, 12],
  // under the jaw → chin → nose
  [184, -4], [212, -10], [236, -16], [250, -22], [256, -30, 1],
  // muzzle top → stop → skull
  [248, -42], [228, -46], [208, -50], [198, -62], [186, -72],
  // ear (erect, triangular)
  [174, -80], [168, -110], [162, -140, 1], [152, -112], [146, -90],
  // occiput → crest of the neck → withers
  [136, -82], [120, -66], [104, -44], [92, -20],
];
const DOG_FAR_EAR = [[160, -84], [154, -112], [150, -136, 1], [140, -108], [134, -86], [146, -80]];
// far-side legs (behind, darker)
const DOG_FAR_HIND = [[-150, 120], [-176, 150], [-186, 192], [-188, 214, 1], [-178, 244], [-170, 276], [-172, 300, 1], [-136, 300, 1], [-140, 288], [-148, 272], [-154, 244], [-156, 222], [-148, 196], [-134, 170], [-118, 140]];
const DOG_FAR_FRONT = [[34, 150], [38, 190], [40, 240], [38, 280], [36, 300, 1], [72, 300, 1], [70, 288], [66, 268], [66, 228], [64, 176], [62, 150]];
let dogP = null;
const dogPaths = () => (dogP ??= { body: smoothPath(DOG), fh: smoothPath(DOG_FAR_HIND), ff: smoothPath(DOG_FAR_FRONT), fe: smoothPath(DOG_FAR_EAR) });
const DOG_BOX = { x0: -262, x1: 258, y0: -142, y1: 300 };

// ------------------------------------------------------------------ human (neutral standing pictogram, ISO 7010 style)
// One merged silhouette: torso tapering to the hips and continuing into the legs (a slight gap between the legs from
// the crotch down), separate arms ≈ 12 units off the torso with rounded shoulder caps, a round head. No face.
let humP = null;
function humanPath() {
  if (humP) return humP;
  const p = new Path2D();
  p.arc(0, -444, 58, 0, Math.PI * 2);
  // torso + legs, one outline (clockwise)
  p.moveTo(-58, -366);
  p.lineTo(58, -366);
  p.quadraticCurveTo(96, -366, 96, -328);
  p.lineTo(80, -40);            // torso tapers to the hip
  p.lineTo(78, 352);            // outer leg
  p.quadraticCurveTo(78, 376, 56, 376);
  p.lineTo(28, 376);
  p.quadraticCurveTo(8, 376, 8, 352);
  p.lineTo(6, 40);              // inner leg up to the crotch
  p.quadraticCurveTo(0, 26, -6, 40);
  p.lineTo(-8, 352);
  p.quadraticCurveTo(-8, 376, -28, 376);
  p.lineTo(-56, 376);
  p.quadraticCurveTo(-78, 376, -78, 352);
  p.lineTo(-80, -40);
  p.lineTo(-96, -328);
  p.quadraticCurveTo(-96, -366, -58, -366);
  p.closePath();
  // arms: rounded shoulder caps, gently tapered, rounded hands; parallel to the torso edge with a 12-unit gap
  for (const s of [-1, 1]) {
    const xi0 = 108, xo0 = 150, xi1 = 94, xo1 = 132, y0 = -334, y1 = -46;
    const cx0 = (xi0 + xo0) / 2, r0 = (xo0 - xi0) / 2, cx1 = (xi1 + xo1) / 2, r1 = (xo1 - xi1) / 2;
    p.moveTo(s * xi0, y0);
    // shoulder cap (half circle over the top)
    if (s > 0) p.arc(cx0, y0, r0, Math.PI, 0, false); else p.arc(-cx0, y0, r0, 0, Math.PI, true);
    p.lineTo(s * xo1, y1);
    if (s > 0) p.arc(cx1, y1, r1, 0, Math.PI, false); else p.arc(-cx1, y1, r1, Math.PI, 0, true);
    p.closePath();
  }
  return (humP = p);
}
const HUMAN_BOX = { x0: -152, x1: 152, y0: -504, y1: 376 };

// ------------------------------------------------------------------ snake (a viper lying in a wide S on the ground, facing right)
// Body thickest at ≈ 40 % from the head, tapering to a fine tail; narrow neck; a flattened triangular head ≈ 1.6× the
// neck's width, held slightly up; a continuous chain of dorsal saddles; a pale belly line; a soft ground shadow.
const SN = { N: 140, WMAX: 76 };
function snakeGeom(t) {
  const N = SN.N;
  // the S lies still on the ground; only a slow, small breathing sway (no swimming)
  const sway = Math.sin(t * 0.6) * 4;
  const ctrl = [[-440, 0], [-360, 74], [-236, 122], [-104, 70], [4, -36], [116, -104], [236, -96], [322, -30], [366, 34], [396, 58]];
  const sp = smoothPath(ctrl, false);   // only for its shape; sample with our own Catmull-Rom
  void sp;
  const CR = (p0, p1, p2, p3, u) => {
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  };
  const raw = [];
  const M = ctrl.length - 1;
  for (let i = 0; i <= 400; i++) {
    const f = (i / 400) * M, k = Math.min(M - 1, Math.floor(f)), u = f - k;
    const P = (j) => ctrl[L.clamp(j, 0, M)];
    raw.push([CR(P(k - 1)[0], P(k)[0], P(k + 1)[0], P(k + 2)[0], u), CR(P(k - 1)[1], P(k)[1], P(k + 1)[1], P(k + 2)[1], u)]);
  }
  // resample by arc length
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const len = cum[cum.length - 1], spine = [];
  for (let i = 0, j = 0; i <= N; i++) {
    const d = (i / N) * len;
    while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const u = (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
    const s = i / N;
    spine.push([L.lerp(raw[j][0], raw[j + 1][0], u), L.lerp(raw[j][1], raw[j + 1][1], u) + sway * Math.sin(Math.PI * s) * (1 - s)]);
  }
  // the neck lifts a little off the ground (screen-up): the head is held slightly up
  for (let i = 0; i <= N; i++) { const s = i / N; spine[i][1] -= 26 * Math.pow(L.smoothstep(L.clamp((s - 0.86) / 0.14)), 1.2); }
  const width = (s) => {
    const up = Math.pow(L.clamp(s / 0.6), 0.7);                       // fine tail → thickest at 60 % from the tail
    const down = s < 0.88 ? L.lerp(1, 0.66, L.smoothstep((s - 0.6) / 0.28)) : L.lerp(0.66, 0.4, L.smoothstep((s - 0.88) / 0.12));   // → a narrow neck
    return SN.WMAX * (s < 0.6 ? up : down) + 1.6;
  };
  const left = [], right = [], nrm = [];
  for (let i = 0; i <= N; i++) {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(N, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    nrm.push([nx, ny]);
    const w = width(i / N) / 2;
    left.push([spine[i][0] + nx * w, spine[i][1] + ny * w]);
    right.push([spine[i][0] - nx * w, spine[i][1] - ny * w]);
  }
  // head: flattened triangle (jaw corners ≈ 1.6× the neck), rounded snout, tilted slightly up
  const hb = spine[N], ha = spine[N - 5];
  let dx = hb[0] - ha[0], dy = hb[1] - ha[1]; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
  const ang = -0.16, ca = Math.cos(ang), sa = Math.sin(ang);
  [dx, dy] = [dx * ca - dy * sa, dx * sa + dy * ca];
  const hx = -dy, hy = dx;
  const n = width(1), Lh = 2.3 * n;
  const P = (f, s) => [hb[0] + dx * f * Lh + hx * s * n, hb[1] + dy * f * Lh + hy * s * n];
  // left neck side → jaw corner → snout → right jaw corner → right neck side (same order as the body's left→right)
  // half-widths in neck units: ≈ 0.9 at the jaw corners ≈ 1.8× the neck; straight sides converging to a blunt snout
  const head = [P(0.0, 0.5), P(0.1, 0.8), P(0.24, 0.92), P(0.3, 0.9), P(0.55, 0.68), P(0.8, 0.44), P(0.94, 0.28), P(1.0, 0.1), P(1.01, 0),
    P(1.0, -0.1), P(0.94, -0.28), P(0.8, -0.44), P(0.55, -0.68), P(0.3, -0.9), P(0.24, -0.92), P(0.1, -0.8), P(0.0, -0.5)];
  return { spine, left, right, nrm, head, width, N, P, len };
}
function snakePath(g) {
  const p = new Path2D();
  const pts = [...g.left.slice(0, -1), ...g.head, ...g.right.slice(0, -1).reverse()];
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  p.closePath();
  return p;
}
const SNAKE_BOX = { x0: -446, x1: 520, y0: -150, y1: 172 };
function drawSnake(c, o, box, s, st) {
  const g = snakeGeom(o.t ?? 0);
  const p = snakePath(g);
  // soft ground shadow (the raised head's shadow falls a little further)
  if (!o.noShadow) {
  c.save();
  c.filter = `blur(${Math.max(1, Math.round(10 * s))}px)`;
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.translate(6, 16);
  c.fill(p);
  c.restore();
  }
  silhouette(c, p, box, s, st);
  c.save(); c.clip(p);
  // dorsal saddles: a continuous chain of dark hourglass blotches across the back, separated by narrow pale gaps
  const step = 5;
  for (let i = 8; i < g.N - 2; i += step) {
    const si = i / g.N;
    const [x, y] = g.spine[i];
    let [nx, ny] = g.nrm[i];
    if (ny > 0) { nx = -nx; ny = -ny; }   // the back faces screen-up
    const tx = -ny, ty = nx;
    const w = g.width(si) / 2, hl = (step * g.len / g.N) * 0.46;
    const off = 0.05;   // the saddle sits slightly towards the back (3/4 view from above)
    const C = (u, v) => [x + tx * u * hl + nx * w * (off + v), y + ty * u * hl + ny * w * (off + v)];
    const pts = [C(-1, 0.82), C(1, 0.82), C(0.5, 0.3), C(0.85, -0.28), C(-0.85, -0.28), C(-0.5, 0.3)];
    c.fillStyle = 'rgba(8,9,12,0.42)';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k <= pts.length; k++) { const p0 = pts[k % pts.length], pm = pts[k - 1]; c.quadraticCurveTo(pm[0], pm[1], (pm[0] + p0[0]) / 2, (pm[1] + p0[1]) / 2); }
    c.closePath(); c.fill();
  }
  // pale belly line along the screen-lower edge
  c.strokeStyle = 'rgba(196,204,218,0.32)'; c.lineWidth = Math.max(0.8 / s, 3.2); c.lineCap = 'round';
  c.beginPath();
  let first = true;
  for (let i = 4; i <= g.N; i++) {
    const [x, y] = g.spine[i]; let [nx, ny] = g.nrm[i];
    if (ny < 0) { nx = -nx; ny = -ny; }
    const w = g.width(i / g.N) / 2 * 0.8;
    const px = x - 0 + nx * w, py = y + ny * w;
    if (first) { c.moveTo(px, py); first = false; } else c.lineTo(px, py);
  }
  c.stroke();
  // head: darker crown with a pale postocular stripe (no eye, no face)
  const P = g.P;
  c.fillStyle = 'rgba(8,9,12,0.35)';
  c.beginPath(); const hp = [P(0.12, 0.45), P(0.5, 0.5), P(0.86, 0.22), P(0.86, -0.1), P(0.5, -0.2), P(0.14, -0.2)];
  c.moveTo(hp[0][0], hp[0][1]); hp.slice(1).forEach((q) => c.lineTo(q[0], q[1])); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(176,186,204,0.28)'; c.lineWidth = Math.max(0.6 / s, 2.4);
  c.beginPath(); const a1 = P(0.78, -0.42), a2 = P(0.42, -0.62), a3 = P(0.12, -0.6);
  c.moveTo(a1[0], a1[1]); c.quadraticCurveTo(a2[0], a2[1], a3[0], a3[1]); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the common silhouette style
/** Fill `path` (local coords, already transformed) in the house style. sc = current px per unit (for rim widths). */
function silhouette(c, path, box, sc, { alpha = 1, rim = 1, shade = 1, glow = 1 } = {}) {
  c.save();
  c.globalAlpha *= alpha;
  // cool backglow for separation from the near-black space
  if (glow > 0) {
    c.save();
    c.shadowColor = `rgba(120,140,175,${0.22 * glow})`;
    c.shadowBlur = 46 * Math.min(1, sc * 2.2);
    c.fillStyle = 'rgb(20,22,28)';
    c.fill(path);
    c.restore();
  }
  const g = c.createLinearGradient(0, box.y0, 0, box.y1);
  g.addColorStop(0, L.rgba(L.mix([60, 66, 78], [104, 112, 128], shade)));
  g.addColorStop(0.45, L.rgba(L.mix([28, 31, 37], [46, 50, 60], shade)));
  g.addColorStop(1, 'rgb(12,13,17)');
  c.fillStyle = g;
  c.fill(path);
  // rim light on the upper-left edges: inner shadow of the outside, offset down-right
  if (rim > 0) {
    c.save();
    c.clip(path);
    const outside = new Path2D();
    outside.rect(box.x0 - 4000, box.y0 - 4000, box.x1 - box.x0 + 8000, box.y1 - box.y0 + 8000);
    outside.addPath(path);
    c.shadowColor = `rgba(205,218,238,${0.55 * rim})`;
    c.shadowBlur = Math.max(1, 5 * Math.min(1.6, sc * 3));
    c.shadowOffsetX = 2.2 * Math.min(1.6, sc * 3) + 0.6;
    c.shadowOffsetY = 3.0 * Math.min(1.6, sc * 3) + 0.8;
    c.fillStyle = '#000';
    c.fill(outside, 'evenodd');
    // a faint warm-red counter-rim on the lower-right edges (the episode's accent, very sparing)
    c.shadowColor = `rgba(230,60,60,${0.22 * rim})`;
    c.shadowOffsetX = -(1.6 * Math.min(1.6, sc * 3) + 0.4);
    c.shadowOffsetY = -(2.0 * Math.min(1.6, sc * 3) + 0.5);
    c.fill(outside, 'evenodd');
    c.restore();
  }
  // crisp hairline edge
  c.lineWidth = 1.2 / sc;
  c.strokeStyle = 'rgba(170,184,206,0.22)';
  c.stroke(path);
  c.restore();
}

function fit(box, o) {
  const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
  const s = Math.min((o.w ?? 1e9) / bw, (o.h ?? 1e9) / bh);
  return { s, cx: (box.x0 + box.x1) / 2, cy: (box.y0 + box.y1) / 2 };
}
function place(c, box, o) {
  const f = fit(box, o);
  c.translate(o.x, o.y);
  c.scale(f.s * (o.flip ? -1 : 1), f.s);
  c.translate(-f.cx, -f.cy);
  return f.s;
}

// ------------------------------------------------------------------ mosquito (female ANOPHELES, resting, side view, facing right)
// The classic Anopheles stance: proboscis, head, thorax and abdomen in one straight line tilted ≈ 45° to the surface
// (head down, abdomen up). Palps as long as the proboscis (Anopheles trait). Narrow lanceolate wings folded along the
// abdomen with faint veins and dark-spotted costal scales. Long slender tapered legs, gently curved, no bands; the hind
// pair raised. Elongated humped thorax, segmented abdomen with fine hairs. Macro lighting, no cartoon features.
// Local units: the surface is y = 60; body axis a = (-1, -1)/√2 from the head (H) towards the abdomen tip.
const MQH = [24, 30], MQA = [-Math.SQRT1_2, -Math.SQRT1_2], MQN = [Math.SQRT1_2, -Math.SQRT1_2];
/** body coordinates (s along the axis from the head, o towards the dorsal side) -> local */
const MP = (s, o) => [MQH[0] + MQA[0] * s + MQN[0] * o, MQH[1] + MQA[1] * s + MQN[1] * o];
const MOSQ_BOX = { x0: -62, x1: 92, y0: -36, y1: 63 };
const MQ_LEGS = {
  // [hip, knee, ankle, tarsus mid, tarsus tip]; far legs drawn first
  far: [
    [[15.6, 27.2], [23, 44], [42, 57], [58, 60], [74, 60.5]],
    [[12, 23.6], [16, 42], [20, 57], [28, 60], [38, 60.5]],
    [[8.6, 20], [-2, 38], [-20, 23], [-30, 9], [-38, -5]],
  ],
  near: [
    [[14.8, 27.9], [18, 47], [34, 58], [48, 60.4], [62, 61]],
    [[11.3, 24.3], [2, 42], [-6, 57], [-18, 60], [-30, 60.5]],
    [[7.7, 20.8], [-8, 40], [-30, 28], [-44, 14], [-56, 2]],
  ],
};
const MQ_LW = [1.5, 1.1, 0.75, 0.45];
function mqLeg(c, pts, sc, near, t, li) {
  const sw = Math.sin(t * 1.3 + li * 1.7) * 0.012 * (li % 3 === 2 ? 2.5 : 1);   // raised hind legs sway a little more
  const P = pts.map(([x, y], i) => {
    if (i === 0) return [x, y];
    const dx = x - pts[0][0], dy = y - pts[0][1], a = sw * Math.min(i, 2) * (li % 3 === 2 ? 1 : 0.4);
    return [pts[0][0] + dx * Math.cos(a) - dy * Math.sin(a), pts[0][1] + dx * Math.sin(a) + dy * Math.cos(a)];
  });
  const minW = 0.85 / sc;
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let s = 0; s < 4; s++) {
    const [ax, ay] = P[s], [bx, by] = P[s + 1];
    // a gentle bow on each segment
    const mx = (ax + bx) / 2, my = (ay + by) / 2, l = Math.hypot(bx - ax, by - ay);
    const bow = (s === 0 ? -0.05 : 0.045) * l;
    const qx = mx + (-(by - ay) / l) * bow, qy = my + ((bx - ax) / l) * bow;
    const w = Math.max(minW, MQ_LW[s] * (near ? 1 : 0.85));
    c.strokeStyle = near ? 'rgb(44,40,40)' : 'rgb(26,24,26)';
    c.lineWidth = w;
    c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(qx, qy, bx, by); c.stroke();
    if (sc > 1.5) {   // cool specular along the top of each segment
      c.strokeStyle = near ? 'rgba(186,198,220,0.32)' : 'rgba(150,160,180,0.12)';
      c.lineWidth = w * 0.28;
      c.beginPath(); c.moveTo(ax - w * 0.18, ay - w * 0.22); c.quadraticCurveTo(qx - w * 0.18, qy - w * 0.22, bx - w * 0.18, by - w * 0.22); c.stroke();
    }
    // knee joint
    if (s < 3 && sc > 2) { c.fillStyle = near ? 'rgb(54,50,50)' : 'rgb(30,28,30)'; c.beginPath(); c.arc(bx, by, w * 0.62, 0, Math.PI * 2); c.fill(); }
  }
}
// wing (folded, lanceolate) in body coordinates
const MQ_WING = [[19, 3.6], [27, 5.6], [40, 6.4], [56, 5.8], [70, 4.4], [79, 2.8], [83, 1.6, 1], [78, 0.6], [66, 0.6], [48, 1.2], [32, 1.8], [21, 2.6]];
let mqWingP = null;
const mqWing = () => (mqWingP ??= smoothPath(MQ_WING.map(([s, o, k]) => [...MP(s, o), k])));
const MQ_THORAX = [[3.4, -0.8], [5.4, 3.4], [9, 6.6], [13.5, 7.6], [19.5, 6.6], [25, 4.2], [27.6, 1.0], [26.2, -2.8], [21, -4.6], [13, -5.0], [7, -4.0]];
let mqThP = null;
const mqThorax = () => (mqThP ??= smoothPath(MQ_THORAX.map(([s, o]) => MP(s, o))));
const MQ_ABD = (() => {
  const L0 = [], R0 = [], spine = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, s = L.lerp(25.5, 71, u);
    const w = 4.7 * (u < 0.14 ? L.lerp(0.82, 1, u / 0.14) : 1 - 0.68 * Math.pow((u - 0.14) / 0.86, 1.25));
    spine.push([s, 0.9 * Math.sin(Math.PI * u) + 0.3, w]);
    L0.push(MP(s, 0.9 * Math.sin(Math.PI * u) + 0.3 + w)); R0.push(MP(s, 0.9 * Math.sin(Math.PI * u) + 0.3 - w));
  }
  const pts = [...L0, ...R0.reverse()];
  const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.closePath();
  return { p, spine };
})();
function drawMosquito(c, o, sc) {
  const t = o.t ?? 0;
  // soft contact shadow on the surface (macro only)
  if (sc > 1.2 && !o.noShadow) {
    c.save();
    c.translate(14, 61); c.scale(1, 0.07);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 70);
    g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 70, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  MQ_LEGS.far.forEach((p, i) => mqLeg(c, p, sc, false, t, i + 3));
  // abdomen: graphite-brown, segmented, fine hairs
  const ab = MQ_ABD.p;
  const abBox = { x0: -32, x1: 10, y0: -26, y1: 12 };
  silhouette(c, ab, abBox, sc, { glow: 0, rim: 0.9, shade: 0.75 });
  c.save(); c.clip(ab);
  for (let k = 1; k < 8; k++) {
    const q = MQ_ABD.spine[k * 5];
    const a = MP(q[0], q[1] + q[2] + 0.5), b = MP(q[0] + 0.8, q[1] - q[2] - 0.5);
    c.strokeStyle = 'rgba(6,6,8,0.75)'; c.lineWidth = Math.max(0.35, 0.55 / sc);
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    // pale intersegmental membrane (ventral half)
    const m0 = MP(q[0] + 0.9, q[1] - q[2] * 0.2), m1 = MP(q[0] + 0.9, q[1] - q[2] - 0.5);
    c.strokeStyle = 'rgba(176,170,160,0.22)'; c.lineWidth = Math.max(0.3, 0.45 / sc);
    c.beginPath(); c.moveTo(m0[0], m0[1]); c.lineTo(m1[0], m1[1]); c.stroke();
  }
  c.restore();
  if (sc > 2) {   // fine hairs along both edges, raked towards the tip
    c.strokeStyle = 'rgba(150,146,140,0.26)'; c.lineWidth = Math.max(0.1, 0.25 / sc);
    c.beginPath();
    for (let i = 2; i <= 40; i += 1) {
      const q = MQ_ABD.spine[i];
      for (const side of [1, -1]) {
        const h = 0.8 + ((i * 7 + (side > 0 ? 3 : 0)) % 5) * 0.18;
        const a = MP(q[0], q[1] + side * q[2]), b = MP(q[0] + h * 0.8, q[1] + side * (q[2] + h));
        c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
      }
    }
    c.stroke();
  }
  // wings: folded along the abdomen (the far wing a fraction below the near one)
  const wing = mqWing();
  for (const [dx, dy, al] of [[0.6, 0.9, 0.55], [0, 0, 1]]) {
    c.save();
    c.translate(dx, dy);
    c.fillStyle = `rgba(178,190,212,${0.1 * al})`;
    c.fill(wing);
    c.save(); c.clip(wing);
    if (sc > 1.2) {
      // longitudinal veins
      c.strokeStyle = `rgba(200,210,228,${0.2 * al})`; c.lineWidth = Math.max(0.1, 0.3 / sc);
      for (const off of [2.0, 3.1, 4.2, 5.2]) {
        const a = MP(20, off - 0.2), m = MP(50, off + 0.4), b = MP(81, 1.7);
        c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(m[0], m[1], b[0], b[1]); c.stroke();
      }
      // dark-spotted costal scales: dark blocks along the leading edge with pale gaps (Anopheles)
      for (const [s0, s1] of [[27, 31], [36, 43], [49, 55], [61, 67], [73, 78]]) {
        const p0 = MP(s0, 6.8), p1 = MP(s1, 6.4 - (s1 > 60 ? (s1 - 60) * 0.12 : 0)), p2 = MP(s1, 4.6 - (s1 > 60 ? (s1 - 60) * 0.12 : 0)), p3 = MP(s0, 5.0 - (s0 > 60 ? (s0 - 60) * 0.12 : 0));
        c.fillStyle = `rgba(14,12,12,${0.5 * al})`;
        c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.lineTo(p3[0], p3[1]); c.closePath(); c.fill();
      }
      // smaller scale spots on the inner veins
      c.fillStyle = `rgba(20,18,18,${0.4 * al})`;
      for (const [s, oo] of [[45, 3.0], [58, 2.6], [69, 2.0], [52, 1.8], [64, 1.4]]) { const q = MP(s, oo); c.beginPath(); c.ellipse(q[0], q[1], 1.6, 0.55, -Math.PI / 4, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
    c.strokeStyle = `rgba(214,224,240,${0.36 * al})`; c.lineWidth = Math.max(0.3, 0.6 / sc);
    c.stroke(wing);
    if (sc > 2 && al === 1) {   // fringe scales on the trailing edge
      c.strokeStyle = 'rgba(150,158,176,0.16)'; c.lineWidth = Math.max(0.08, 0.2 / sc);
      c.beginPath();
      for (let s = 22; s < 80; s += 0.9) { const a = MP(s, 1.0), b = MP(s + 0.6, 0.0); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      c.stroke();
    }
    c.restore();
  }
  // halter (balance organ) behind the thorax
  { const a = MP(25, 2), b = MP(29, -2.2); c.strokeStyle = 'rgb(66,62,60)'; c.lineWidth = Math.max(0.3, 0.5 / sc); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.fillStyle = 'rgb(70,66,62)'; c.beginPath(); c.arc(b[0], b[1], 0.6, 0, Math.PI * 2); c.fill(); }
  // thorax: elongated, humped, graphite-brown, a faint pale median stripe of scales (no dots)
  const th = mqThorax();
  silhouette(c, th, { x0: 2, x1: 26, y0: 6, y1: 32 }, sc, { glow: 0, rim: 0.6, shade: 0.55 });
  c.save(); c.clip(th);
  {
    const a = MP(4.5, 3.4), m = MP(14, 8.4), b = MP(25, 5.4);
    c.strokeStyle = 'rgba(196,192,184,0.22)'; c.lineWidth = Math.max(0.5, 1.4);
    c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(m[0], m[1], b[0], b[1]); c.stroke();
    // pleural shading low on the side
    const g = c.createLinearGradient(...MP(14, 2), ...MP(14, -5.6));
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
    c.fillStyle = g; c.fillRect(-10, 0, 50, 50);
    // matte scale texture (macro only): fine seeded stipple, lighter on the scutum
    if (sc > 2) {
      const rr = L.rng(3171);
      for (let k = 0; k < 420; k++) {
        const q = MP(3 + rr() * 25, -5.5 + rr() * 14);
        c.fillStyle = rr() < 0.55 ? 'rgba(190,184,172,0.13)' : 'rgba(0,0,0,0.22)';
        c.fillRect(q[0], q[1], 0.32, 0.32);
      }
    }
  }
  c.restore();
  // head: small, mostly compound eye
  const hc = MP(0, 0);
  c.fillStyle = 'rgb(30,28,28)'; c.beginPath(); c.arc(hc[0], hc[1], 4.6, 0, Math.PI * 2); c.fill();
  const ec = MP(-0.6, 0.4), eye = new Path2D(); eye.arc(ec[0], ec[1], 3.9, 0, Math.PI * 2);
  const ge = c.createRadialGradient(ec[0] - 1.2, ec[1] - 1.6, 0.3, ec[0], ec[1], 4.2);
  ge.addColorStop(0, 'rgb(74,72,76)'); ge.addColorStop(0.55, 'rgb(24,23,26)'); ge.addColorStop(1, 'rgb(8,8,10)');
  c.fillStyle = ge; c.fill(eye);
  if (sc > 3) {
    c.save(); c.clip(eye);
    c.strokeStyle = 'rgba(150,160,180,0.06)'; c.lineWidth = 0.06;
    for (let y = ec[1] - 4.5; y < ec[1] + 4.5; y += 0.55) for (let x = ec[0] - 4.5 + ((Math.round((y - ec[1]) / 0.55) & 1) ? 0.32 : 0); x < ec[0] + 4.5; x += 0.64) { c.beginPath(); c.arc(x, y, 0.3, 0, Math.PI * 2); c.stroke(); }
    c.restore();
  }
  c.fillStyle = 'rgba(214,224,244,0.5)'; c.beginPath(); c.ellipse(ec[0] - 1.3, ec[1] - 1.9, 1.1, 0.6, -0.6, 0, Math.PI * 2); c.fill();
  // antennae: short, forward-up, with fine whorls (female)
  c.lineCap = 'round';
  for (const [s1, o1] of [[-16, 7], [-14.5, 8.6]]) {
    const a = MP(-2.6, 3), b = MP(s1, o1), m = MP((s1 - 2.6) / 2, (o1 + 3) / 2 + 1.2);
    c.strokeStyle = 'rgb(62,58,56)'; c.lineWidth = Math.max(0.3, 0.55 / sc);
    c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(m[0], m[1], b[0], b[1]); c.stroke();
    if (sc > 2) {
      c.lineWidth = Math.max(0.06, 0.15 / sc); c.strokeStyle = 'rgba(120,116,112,0.4)';
      for (let k = 1; k < 13; k++) {
        const f = k / 13, x = L.lerp(a[0], b[0], f), y = L.lerp(a[1], b[1], f), h = 0.9 * (1 - f * 0.5);
        c.beginPath(); c.moveTo(x - h * 0.5, y - h); c.lineTo(x + h * 0.5, y + h); c.stroke();
      }
    }
  }
  // proboscis and the two palps (as long as the proboscis): slender, straight, tapered, in line with the body
  const seg = (s0, o0, s1, o1, w0, w1, col) => {
    const a = MP(s0, o0), b = MP(s1, o1), nn = 8;
    c.fillStyle = col;
    c.beginPath();
    const ux = (b[0] - a[0]), uy = (b[1] - a[1]), l = Math.hypot(ux, uy), px = -uy / l, py = ux / l;
    c.moveTo(a[0] + px * w0 / 2, a[1] + py * w0 / 2);
    c.lineTo(b[0] + px * w1 / 2, b[1] + py * w1 / 2);
    c.arc(b[0], b[1], w1 / 2, Math.atan2(py, px), Math.atan2(py, px) + Math.PI, true);
    c.lineTo(a[0] - px * w0 / 2, a[1] - py * w0 / 2);
    c.closePath(); c.fill();
    void nn;
  };
  seg(-3.2, -2.6, -30.5, -3.1, 1.15, 0.7, 'rgb(28,26,26)');       // far palp
  seg(-3.6, -0.9, -31, -0.9, Math.max(0.9, 0.8 / sc), 0.42, 'rgb(46,43,42)');   // proboscis
  { const a = MP(-28, -0.9), b = MP(-31.2, -0.9); c.strokeStyle = 'rgba(150,140,128,0.6)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }   // labella
  seg(-3.2, 0.9, -30, 1.3, 1.2, 0.75, 'rgb(52,48,46)');           // near palp
  if (sc > 1.5) { const a = MP(-4, 1.5), b = MP(-29, 1.9); c.strokeStyle = 'rgba(186,196,214,0.28)'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  MQ_LEGS.near.forEach((p, i) => mqLeg(c, p, sc, true, t, i));
}

// ------------------------------------------------------------------ rabies virion (bullet-shaped lyssavirus)
// A translucent envelope over a fine, tightly wound helical nucleocapsid (strands tilted ≈ 12°, the front half
// brighter), with a dense velvet of short glycoprotein spikes ending in small knobs — none on the flat base end.
const VIRUS_BOX = { x0: -104, x1: 108, y0: -50, y1: 50 };
function drawVirus(c, o, sc) {
  const t = o.t ?? 0;
  const R = 36, XB = -92, XD = 62;   // flat base at XB; the dome's centre at XD
  const env = new Path2D();
  env.moveTo(XB, -R + 5); env.quadraticCurveTo(XB, -R, XB + 5, -R);
  env.lineTo(XD, -R); env.arc(XD, 0, R, -Math.PI / 2, Math.PI / 2); env.lineTo(XB + 5, R);
  env.quadraticCurveTo(XB, R, XB, R - 5); env.closePath();
  // spikes: a dense short velvet on the sides and the dome (none on the flat base)
  const spikes = [];
  for (let x = XB + 4; x <= XD; x += 3.1) { spikes.push([x, -R, 0, -1]); spikes.push([x, R, 0, 1]); }
  for (let a = -86; a <= 86; a += 4.6) { const r = a * Math.PI / 180; spikes.push([XD + Math.cos(r) * R, Math.sin(r) * R, Math.cos(r), Math.sin(r)]); }
  c.lineCap = 'round';
  spikes.forEach(([x, y, nx, ny], i) => {
    const l = 6.2 + 0.7 * Math.sin(i * 2.3 + t * 1.1);
    const bright = 0.55 + 0.35 * (ny < 0 ? -ny : 0.2);   // top-lit
    c.strokeStyle = `rgba(150,162,184,${0.55 * bright})`; c.lineWidth = Math.max(0.5 / sc, 1.0);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + nx * l, y + ny * l); c.stroke();
    c.fillStyle = `rgba(200,210,228,${0.75 * bright})`;
    c.beginPath(); c.arc(x + nx * (l + 0.6), y + ny * (l + 0.6), 1.35, 0, Math.PI * 2); c.fill();
  });
  // envelope: translucent, top-lit
  c.save();
  c.shadowColor = 'rgba(120,140,175,0.25)'; c.shadowBlur = 30 * Math.min(1, sc);
  const ge = c.createLinearGradient(0, -R, 0, R);
  ge.addColorStop(0, 'rgba(120,132,156,0.34)'); ge.addColorStop(0.5, 'rgba(48,54,68,0.3)'); ge.addColorStop(1, 'rgba(20,22,28,0.5)');
  c.fillStyle = ge; c.fill(env);
  c.restore();
  // the helical nucleocapsid inside: a tight coil of fine strands, tilted ≈ 12°, back half dim, front half bright
  c.save(); c.clip(env);
  const tilt = 0.21, pitch = 3.4;
  const rAt = (x) => (x <= XD ? R - 7 : Math.sqrt(Math.max(0, (R - 7) ** 2 - (x - XD) ** 2 * 1.1)));
  for (let pass = 0; pass < 2; pass++) {
    for (let x = XB + 6; x < XD + R - 8; x += pitch) {
      const r = rAt(x);
      if (r < 3) continue;
      const rx = r * Math.sin(tilt);
      c.beginPath();
      if (pass === 0) c.ellipse(x, 0, rx, r, 0, Math.PI / 2, Math.PI * 3 / 2);       // back half (left side of the ring)
      else c.ellipse(x, 0, rx, r, 0, -Math.PI / 2, Math.PI / 2);                     // front half
      c.strokeStyle = pass === 0 ? 'rgba(120,132,156,0.22)' : 'rgba(206,214,230,0.55)';
      c.lineWidth = Math.max(0.45 / sc, pass === 0 ? 0.9 : 1.15);
      c.stroke();
    }
  }
  // a faint warm core (the RNA) along the axis
  const gc = c.createLinearGradient(0, -R, 0, R);
  gc.addColorStop(0.35, 'rgba(230,60,60,0)'); gc.addColorStop(0.5, 'rgba(230,60,60,0.10)'); gc.addColorStop(0.65, 'rgba(230,60,60,0)');
  c.fillStyle = gc; c.fillRect(XB, -R, XD + R - XB, 2 * R);
  c.restore();
  // envelope edge: a thin membrane line, brighter on top
  c.strokeStyle = 'rgba(196,208,228,0.5)'; c.lineWidth = Math.max(0.6 / sc, 1.4);
  c.stroke(env);
}

// ------------------------------------------------------------------ public
export const BOXES = { shark: SHARK_BOX, dog: DOG_BOX, human: HUMAN_BOX, snake: SNAKE_BOX, mosquito: MOSQ_BOX, virus: VIRUS_BOX };
/** fitted scale (px per unit) for a box */
export const fitScale = (kind, w, h) => fit(BOXES[kind], { w, h }).s;

/**
 * drawAnimal(c, kind, o): o = { x, y, w, h, alpha, t, rim, glow, shade, flip, pxScale, tint }
 * tint: [r, g, b, a] draws the animal as one flat colour (e.g. light steel icons on dark pills).
 */
export function drawAnimal(c, kind, o) {
  if ((o.alpha ?? 1) <= 0.001) return;
  if (o.tint) return drawTinted(c, kind, o);
  c.save();
  c.globalAlpha *= o.alpha ?? 1;
  const box = BOXES[kind];
  const s = place(c, box, o) * (o.pxScale ?? 1);
  const st = { rim: o.rim ?? 1, glow: o.glow ?? 1, shade: o.shade ?? 1 };
  if (kind === 'shark') {
    silhouette(c, sharkPath(), box, s, st);
    // gill slits: five faint arcs
    c.strokeStyle = 'rgba(150,165,190,0.22)'; c.lineWidth = 3;
    for (let k = 0; k < 5; k++) { const x = 300 - k * 20; c.beginPath(); c.moveTo(x, -50 + k * 2); c.quadraticCurveTo(x - 10, -5, x - 2, 40 - k * 2); c.stroke(); }
  } else if (kind === 'dog') {
    const P = dogPaths();
    const far = { ...st, shade: 0.45, rim: st.rim * 0.5, glow: 0 };
    silhouette(c, P.fe, box, s, far);
    silhouette(c, P.fh, box, s, far);
    silhouette(c, P.ff, box, s, far);
    silhouette(c, P.body, box, s, st);
  } else if (kind === 'human') {
    silhouette(c, humanPath(), box, s, st);
  } else if (kind === 'snake') {
    drawSnake(c, o, box, s, st);
  } else if (kind === 'mosquito') {
    drawMosquito(c, o, s);
  } else if (kind === 'virus') {
    drawVirus(c, o, s);
  }
  c.restore();
}
/** flat-colour version via an offscreen layer (source-in) */
function drawTinted(c, kind, o) {
  const k = 3, pad = 8;
  const W = Math.ceil(o.w * k) + 2 * pad, H = Math.ceil(o.h * k) + 2 * pad;
  const oc = new OffscreenCanvas(W, H), g = oc.getContext('2d');
  drawAnimal(g, kind, { ...o, x: W / 2, y: H / 2, w: o.w * k, h: o.h * k, tint: null, alpha: 1, glow: 0, noShadow: true, pxScale: 0.45 });   // thicker hairlines: they survive the 3× downsample
  g.globalCompositeOperation = 'source-in';
  const [r, gg, b, a] = o.tint;
  g.fillStyle = `rgba(${r},${gg},${b},1)`;
  g.fillRect(0, 0, W, H);
  c.save();
  c.globalAlpha *= (o.alpha ?? 1) * (a ?? 1);
  c.drawImage(oc, o.x - W / (2 * k), o.y - H / (2 * k), W / k, H / k);
  c.restore();
}
export { RED };
