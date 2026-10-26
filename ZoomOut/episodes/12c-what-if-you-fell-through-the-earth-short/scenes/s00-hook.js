// Beat 0 — the hook. Dusk. A person (1.75 m, true scale, articulated: see "the person") stands on the collar lip of a lined shaft,
// looks into it, crouches, and hops out over the void on the last ~0.6 s. From the start of beat 1 they fall with
// fallerDepth(gt) (arms up, pencil pose) while the shaft lamps stream past; between FALLER_SWAP mpp they fade out and
// the env's white faller marker takes over at the same point (the figure's centre sits on the faller depth).
// The ground is drawn as a true-scale cut-away: topsoil, clay with stones, bedrock with fractures, a concrete collar.
// Masked headline: WHAT IF YOU FELL / THROUGH THE EARTH? ("THE EARTH?" on an accent bar) + "A THOUGHT EXPERIMENT".
import * as L from '../../../../engine/runtime/lib.js';
import { fallerDepth, BS, T_JUMP } from '../camera.js';
import { FALLER_SWAP, TUNNEL_HW } from '../env.js';

const { W, H } = L;
const HOOK_END = BS[1];                 // beat 1 start (global s): the person is over the hole at x = 0
const DROP = T_JUMP;                    // fallerDepth starts moving here (BS[1] + 0.083)
const BODY = [22, 20, 28];
const RIM = [255, 178, 122];
const INK = [26, 12, 6];
const HW = TUNNEL_HW;             // 0.6 m
const COLLAR = 0.34;              // concrete collar thickness (m): its raised top is the lip the person stands on
const LIP = 0.06;                 // the collar's top face stands 6 cm proud of the ground
const LAMP0 = 0.95, LAMP_STEP = 2.2;   // shaft lamps: first depth and spacing (m)

// ------------------------------------------------------------------ the person (side view, facing the hole, +x)
// An articulated adult (≈ 1.75 m) built from anatomical parts: pelvis/torso with chest, back and buttocks, a neck, a
// profile head (brow, nose, lips, chin, occiput), tapered limbs with knees, calves, elbows, hands with a thumb, and
// shoes. Poses are JOINT ANGLES (forward kinematics), so blends never cross-fade two arm positions into a double arm.
// Units: metres, y UP, origin at the hip joint, x forward. Angles in degrees: limbs 0 = hanging straight down,
// + = swung forward; knee/elbow = bend; pf = plantar-flex (toes down); lean = torso forward; head = nod down.
const THIGH = 0.44, SHIN = 0.43, ANKLE_H = 0.075, UPPER = 0.29, FORE = 0.26;
const SHOULDER = [-0.005, 0.45], NECK0 = [0.0, 0.49], PIVOT = [0.012, 0.565];
const D2R = Math.PI / 180;
const P = {
  // weight on both feet, toes of the far (front) foot at the edge of the lip, near foot a half step behind
  stand: { lean: 3, head: 4, legN: [-3, 3, 0], legF: [3, 3, 0], armN: [-2, 6, 2], armF: [-6, 7, 2] },
  // leaning in, looking down the shaft
  look: { lean: 9, head: 26, legN: [-2, 6, 0], legF: [4, 6, 0], armN: [-5, 9, 2], armF: [-9, 9, 2] },
  // the step off: the near leg swings out over the void, the far foot pushes off from the lip on its toes
  step: { lean: 13, head: 20, legN: [46, 58, 22], legF: [-20, 8, 32], armN: [-12, 18, 6], armF: [12, 20, 6] },
  // the drop: a straight "pencil" with the arms close at the sides, toes pointed
  pencil: { lean: 1, head: 14, legN: [2, 7, 48], legF: [-2, 9, 52], armN: [4, 6, 0], armF: [-4, 7, 0] },
};
function blend(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o = { lean: L.lerp(a.lean, b.lean, k), head: L.lerp(a.head, b.head, k) };
  for (const key of ['legN', 'legF', 'armN', 'armF']) o[key] = a[key].map((x, i) => L.lerp(x, b[key][i], k));
  return o;
}
const add = (p, q, s = 1) => [p[0] + q[0] * s, p[1] + q[1] * s];
const dirDown = (deg) => [Math.sin(deg * D2R), -Math.cos(deg * D2R)];   // limb direction for an angle from straight down
const rotV = (p, deg) => { const a = -deg * D2R, c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };  // + = clockwise (forward)

/** Leg joints (relative to the hip) for [thigh, knee, pf]. Foot frame: f = toe direction, up = top of the foot. */
function legFK([th, kn, pf]) {
  const knee = dirDown(th).map((x) => x * THIGH);
  const sh = th - kn;
  const ankle = add(knee, dirDown(sh), SHIN);
  const fa = (sh - pf) * D2R;
  const f = [Math.cos(fa), Math.sin(fa)], up = [-Math.sin(fa), Math.cos(fa)];
  const footPt = (u, w) => [ankle[0] + f[0] * u + up[0] * w, ankle[1] + f[1] * u + up[1] * w];
  return { knee, ankle, sh, footPt, ball: footPt(0.13, -ANKLE_H), toe: footPt(0.19, -ANKLE_H * 0.6) };
}
/** Arm joints relative to the shoulder for [shoulder, elbow, wrist]. */
function armFK([sa, ea, wa]) {
  const elbow = dirDown(sa).map((x) => x * UPPER);
  const wrist = add(elbow, dirDown(sa + ea), FORE);
  return { elbow, wrist, ha: sa + ea + wa };
}

// part outlines (local frames)
const TORSO = [   // [forward, up] around the hip joint, before the lean
  [-0.092, -0.085], [-0.108, -0.025], [-0.106, 0.05], [-0.094, 0.14], [-0.098, 0.25], [-0.108, 0.35], [-0.098, 0.42],
  [-0.07, 0.468], [-0.045, 0.505], [0.03, 0.505], [0.072, 0.468], [0.106, 0.405], [0.114, 0.335], [0.096, 0.25],
  [0.098, 0.15], [0.104, 0.06], [0.09, -0.03], [0.05, -0.088], [0.0, -0.1],
];
const HEAD = [    // profile around the neck pivot [forward, up]: nape, occiput, crown, brow, nose, lips, chin, jaw
  [-0.05, -0.03], [-0.072, 0.03], [-0.094, 0.085], [-0.098, 0.125], [-0.08, 0.172], [-0.035, 0.208], [0.02, 0.213], [0.07, 0.19],
  [0.098, 0.15], [0.106, 0.118], [0.098, 0.102], [0.104, 0.09], [0.126, 0.056], [0.106, 0.043], [0.11, 0.028],
  [0.103, 0.014], [0.106, 0.0], [0.1, -0.022], [0.078, -0.04], [0.04, -0.035], [0.02, -0.02],
];
const SHOE = [    // [along the foot, up] around the ankle
  [-0.045, 0.035], [-0.072, -0.01], [-0.075, -0.05], [-0.06, -ANKLE_H], [0.05, -ANKLE_H], [0.15, -ANKLE_H + 0.004],
  [0.185, -0.062], [0.192, -0.046], [0.172, -0.03], [0.1, -0.012], [0.04, 0.018], [0.03, 0.04],
];
const HAND = [    // [along the hand, across (front +)] from the wrist: a relaxed hand seen from the side, thumb in front
  [-0.012, -0.022], [0.04, -0.024], [0.085, -0.021], [0.118, -0.013], [0.132, 0.0], [0.124, 0.011], [0.098, 0.017],
  [0.07, 0.022], [0.045, 0.027], [0.02, 0.025], [-0.012, 0.023],
];

/** Closed tapered tube through joints J with radii R[i] = [front, back] (front = left of the direction of travel). */
function tube(J, R) {
  const A = [], B = [];
  for (let i = 0; i < J.length; i++) {
    const a = J[Math.max(0, i - 1)], b = J[Math.min(J.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const nx = -dy, ny = dx;
    A.push([J[i][0] + nx * R[i][0], J[i][1] + ny * R[i][0]]);
    B.push([J[i][0] - nx * R[i][1], J[i][1] - ny * R[i][1]]);
  }
  return A.concat(B.reverse());
}
const mid = (a, b, t) => [L.lerp(a[0], b[0], t), L.lerp(a[1], b[1], t)];

/** World-free figure geometry for a pose: a list of parts [{pts, far}] in hip-relative metres (y up). */
function figureParts(p, sway = 0) {
  const lean = p.lean;
  const T = (q) => rotV(q, lean);
  const parts = [];
  const leg = (cfg, far) => {
    const g = legFK(cfg);
    const hipF = [0.0, 0.0];
    parts.push({ far, pts: tube(
      [hipF, mid(hipF, g.knee, 0.45), g.knee, mid(g.knee, g.ankle, 0.32), mid(g.knee, g.ankle, 0.72), g.ankle],
      [[0.072, 0.078], [0.068, 0.068], [0.05, 0.052], [0.046, 0.058], [0.038, 0.042], [0.03, 0.034]]) });
    parts.push({ far, pts: SHOE.map(([u, w]) => g.footPt(u, w)) });
    return g;
  };
  const arm = (cfg, far) => {
    const sh = T(add(SHOULDER, [far ? -0.012 : 0.006, 0]));
    const g = armFK([cfg[0] + sway, cfg[1], cfg[2]]);   // arm angles are absolute: arms hang by gravity
    const el = add(sh, g.elbow), wr = add(sh, g.wrist);
    parts.push({ far, pts: tube(
      [add(sh, [0, 0.025]), sh, mid(sh, el, 0.45), el, mid(el, wr, 0.4), wr],
      [[0.035, 0.035], [0.052, 0.048], [0.042, 0.04], [0.033, 0.032], [0.032, 0.031], [0.022, 0.021]]) });
    const ha = g.ha * D2R, f = [Math.sin(ha), -Math.cos(ha)], n = [Math.cos(ha), Math.sin(ha)];
    parts.push({ far, hand: true, pts: HAND.map(([u, w]) => [wr[0] + f[0] * u + n[0] * w, wr[1] + f[1] * u + n[1] * w]) });
  };
  // far side first (it sits behind the body)
  leg(p.legF, true);
  arm(p.armF, true);
  // body: torso, neck, head
  parts.push({ far: false, pts: TORSO.map(T) });
  const n0 = T(NECK0), pv = T(PIVOT);
  parts.push({ far: false, pts: tube([add(n0, [0, -0.03]), n0, mid(n0, pv, 0.5), pv], [[0.05, 0.062], [0.048, 0.058], [0.045, 0.052], [0.045, 0.05]]) });
  parts.push({ far: false, pts: HEAD.map((q) => add(pv, rotV(q, lean + p.head))) });
  const gl = leg(p.legN, false);
  arm(p.armN, false);
  return { parts, legN: gl };
}

/** Timeline of the person (global seconds) → { p (pose), hip [x, height], fall 0..1 }. */
const T_LOOK = BS[0] + 0.7;                 // looks down the shaft
const T_STEP = HOOK_END - 0.95;             // starts the step off the lip
const T_OFF = HOOK_END - 0.32;              // the far foot leaves the lip: free fall from here
const LIP_EDGE = -HW;                       // inner edge of the collar (x, m)
function poseAt(gt) {
  let p = blend(P.stand, P.look, L.ease.inOutCubic(L.prog(gt, T_LOOK, 0.9)));
  const ks = L.prog(gt, T_STEP, T_OFF - T_STEP);
  p = blend(p, P.step, (ks * ks * (3 - ks)) / 2);   // starts from rest, still moving forward at the push-off
  p = blend(p, P.pencil, L.ease.inOutCubic(L.prog(gt, T_OFF - 0.04, 0.5)));
  return p;
}
/** Supported hip position: the far foot's ball stays planted on the lip (toes at the edge) while the body moves. */
function supportedHip(gt) {
  const p = poseAt(Math.min(gt, T_OFF));
  const g = legFK(p.legF);
  const ballX = LIP_EDGE - 0.06;           // the ball of the foot 6 cm behind the edge; toes reach it
  return [ballX - g.ball[0], LIP - g.ball[1]];
}
const G = 9.81;
function person(gt) {
  const p = poseAt(gt);
  const breathe = Math.sin(gt * 2.1) * 0.004 * (gt < T_STEP ? 1 : 0);
  let hip;
  if (gt <= T_OFF) hip = supportedHip(gt);
  else {
    // free fall from the moment the foot leaves: the take-off velocity, then gravity; drifts to the shaft's axis
    const h0 = supportedHip(T_OFF), h1 = supportedHip(T_OFF - 0.03);
    const vx = (h0[0] - h1[0]) / 0.03, vy = (h0[1] - h1[1]) / 0.03;
    const tau = gt - T_OFF;
    const xb = h0[0] + vx * tau;
    hip = [L.lerp(xb, 0, L.smoothstep(L.clamp(tau / 0.9))), h0[1] + vy * tau - 0.5 * G * tau * tau];
    // from DROP the figure's centre (hip + 0.1 m) hands over to the camera's faller depth
    const b = L.ease.inOutCubic(L.prog(gt, DROP, 0.6));
    if (b > 0) hip[1] = L.lerp(hip[1], -(fallerDepth(gt) + 0.1), b);
  }
  const sway = gt > T_OFF ? 3 * L.noise1(gt * 1.7, 13) * L.prog(gt, T_OFF, 0.6) : 0;
  return { p, hip, breathe, sway, fall: L.prog(gt, T_OFF, 0.4) };
}

// ------------------------------------------------------------------ path helpers (y up → canvas y = -y)
function smoothPath(c, pts) {
  const n = pts.length;
  const m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2]; };
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], e = m(i); c.quadraticCurveTo(p[0], -p[1], e[0], e[1]); }
  c.closePath();
}
function windCCW(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s < 0 ? pts.slice().reverse() : pts;
}
function partsPath(parts, far) {
  const path = new Path2D();
  for (const pt of parts) if (pt.far === far) smoothPath(path, windCCW(pt.pts));
  return path;
}

/** Draw the person in metre units (canvas translated to the hip, scaled by 1/mpp). Backlit: a dark silhouette with a
 *  warm rim on the sun side (left/top), the far limbs a shade lighter so overlapping limbs stay readable. */
function drawFigure(c, v, s, rimK, fill = 0) {
  const { parts } = figureParts(s.p, s.sway);
  const rim = 1.6 * v.cam.mpp;
  const body = L.mix(BODY, [92, 70, 58], fill * 0.55);
  // every part filled on its own (same opaque tone): overlaps merge seamlessly, whatever each outline's winding.
  // One rim around the outer silhouette only: drawn first (all parts, shifted) and then covered by the body fills,
  // so no rim line ever shows inside the figure (around a hand over a thigh, or a near limb over a far one).
  const paths = parts.map((pt) => { const p = new Path2D(); smoothPath(p, pt.pts); return p; });
  // hands get no rim of their own: small, dark, and read as part of the arm
  c.save();
  c.translate(-rim, -rim * 0.7);
  c.fillStyle = L.rgba(RIM, 0.9 * rimK);
  paths.forEach((p, i) => { if (!parts[i].hand) c.fill(p); });
  c.restore();
  c.fillStyle = L.rgba(body);
  for (const p of paths) c.fill(p);
  // soft form: a faint cool sky light on the top planes of the near side
  const all = partsPath(parts, false);
  c.save();
  c.clip(all);
  const g = c.createLinearGradient(-0.2, -1.0, 0.25, 0.3);
  g.addColorStop(0, `rgba(120,110,140,${0.16 * (1 - fill)})`); g.addColorStop(1, 'rgba(120,110,140,0)');
  c.fillStyle = g;
  c.fillRect(-0.6, -1.9, 1.2, 3.0);
  c.restore();
}

// ------------------------------------------------------------------ the ground cut-away (metres)
const STONES = (() => {
  const r = L.rng(1201);
  const out = [];
  while (out.length < 90) {
    const x = (r() - 0.5) * 9, y = 0.06 + Math.pow(r(), 1.3) * 5.5;
    if (Math.abs(x) < HW + COLLAR + 0.06) continue;
    const s = y < 0.3 ? 0.012 + r() * 0.025 : 0.02 + r() * 0.07;
    out.push({ x, y, rx: s, ry: s * (0.5 + r() * 0.3), a: (r() - 0.5) * 0.8, tone: r() });
  }
  return out;
})();
const ROOTS = (() => { const r = L.rng(1202); return Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * 9, len: 0.12 + r() * 0.35, bend: (r() - 0.5) * 0.25, ph: r() * 6 })); })();
const TUFTS = (() => { const r = L.rng(1203); return Array.from({ length: 70 }, () => ({ x: (r() - 0.5) * 9, h: 0.03 + r() * 0.09, ph: r() * 6.3, tone: r() })).filter((t) => Math.abs(t.x) > HW + COLLAR + 0.05); })();
const CRACKS = (() => {
  const r = L.rng(1204);
  return Array.from({ length: 22 }, () => {
    const pts = [];
    let x = (r() - 0.5) * 9, y = 1.2 + r() * 5;
    for (let i = 0; i < 5; i++) { pts.push([x, y]); x += (r() - 0.5) * 0.5; y += 0.1 + r() * 0.35; }
    return pts;
  }).filter((p) => Math.abs(p[0][0]) > HW + 0.3);
})();
// soil horizons (depth of the boundary, wavy)
const soilY = (x, base, seed) => base + 0.05 * L.noise1(x * 1.3, seed) + 0.025 * L.noise1(x * 4.1, seed + 3);

function sideClip(c, xa, xb) {
  // two slabs either side of the shaft
  c.beginPath();
  c.rect(xa, -0.01, -HW - xa, 40);
  c.rect(HW, -0.01, xb - HW, 40);
  c.clip();
}

function drawGround(c, v, k) {
  const mpp = v.cam.mpp;
  const xa = v.cam.x - (W / 2 + 20) * mpp, xb = v.cam.x + (W / 2 + 20) * mpp;
  const yb = v.cam.y + (H * (1 - v.cam.anchor) + 20) * mpp;
  if (yb < 0) return;
  c.save();
  c.globalAlpha = k;
  sideClip(c, xa, xb);
  // horizons: topsoil (dark umber) over clay (ochre-grey) over bedrock (env)
  const band = (y0f, y1f, colTop, colBot, seed0, seed1) => {
    c.beginPath();
    const st = 0.12;
    for (let x = xa; x <= xb + st; x += st) { const y = y0f(x); x === xa ? c.moveTo(x, y) : c.lineTo(x, y); }
    for (let x = xb; x >= xa - st; x -= st) c.lineTo(x, y1f(x));
    c.closePath();
    const g = c.createLinearGradient(0, 0, 0, 1.4);
    g.addColorStop(0, L.rgba(colTop)); g.addColorStop(1, L.rgba(colBot));
    c.fillStyle = g;
    c.fill();
  };
  band(() => 0, (x) => soilY(x, 1.15, 5), [100, 82, 64], [108, 92, 76]);
  band(() => 0, (x) => soilY(x, 0.3, 1), [40, 30, 26], [58, 44, 36]);
  // a soft fade from the clay into the bedrock
  const fg = c.createLinearGradient(0, 1.05, 0, 1.6);
  fg.addColorStop(0, 'rgba(108,92,76,0.55)'); fg.addColorStop(1, 'rgba(108,92,76,0)');
  c.fillStyle = fg;
  c.fillRect(xa, 1.05, xb - xa, 0.55);
  // stones: shaded pebbles with a light top edge
  for (const s of STONES) {
    if (s.x < xa - 0.2 || s.x > xb + 0.2 || s.y > yb + 0.2) continue;
    const base = s.y < 0.3 ? L.mix([70, 58, 50], [120, 104, 90], s.tone) : s.y < 1.15 ? L.mix([92, 84, 78], [150, 138, 124], s.tone) : L.mix([60, 56, 54], [118, 110, 102], s.tone);
    c.save();
    c.translate(s.x, s.y); c.rotate(s.a);
    c.fillStyle = L.rgba(L.mix(base, [0, 0, 0], 0.35));
    c.beginPath(); c.ellipse(0, s.ry * 0.18, s.rx, s.ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba(base);
    c.beginPath(); c.ellipse(0, 0, s.rx * 0.96, s.ry * 0.92, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,236,214,0.14)';
    c.beginPath(); c.ellipse(-s.rx * 0.2, -s.ry * 0.35, s.rx * 0.55, s.ry * 0.35, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // roots in the topsoil
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(20,14,12,0.55)';
  c.lineWidth = Math.max(1.1 * mpp, 0.006);
  for (const r of ROOTS) {
    if (r.x < xa || r.x > xb) continue;
    c.beginPath(); c.moveTo(r.x, 0.0);
    c.quadraticCurveTo(r.x + r.bend, r.len * 0.5, r.x + r.bend * 0.4, r.len);
    c.stroke();
  }
  // bedrock fractures
  c.strokeStyle = 'rgba(16,12,12,0.4)';
  c.lineWidth = Math.max(1.2 * mpp, 0.008);
  for (const p of CRACKS) {
    if (p[0][1] > yb + 0.5) continue;
    c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  }
  c.restore();

  // the surface: dusk light grazing the ground line, dry grass tufts
  c.save();
  c.globalAlpha = k;
  const lg = c.createLinearGradient(0, -0.02, 0, 0.08);
  lg.addColorStop(0, 'rgba(255,190,140,0.55)'); lg.addColorStop(0.3, 'rgba(255,170,120,0.18)'); lg.addColorStop(1, 'rgba(255,170,120,0)');
  c.fillStyle = lg;
  c.fillRect(xa, 0, -HW - COLLAR - xa, 0.08);
  c.fillRect(HW + COLLAR, 0, xb - HW - COLLAR, 0.08);
  c.lineCap = 'round';
  for (const t of TUFTS) {
    if (t.x < xa || t.x > xb) continue;
    const sway = 0.012 * Math.sin(v.gt * 1.6 + t.ph + t.x);
    c.strokeStyle = L.rgba(L.mix([46, 38, 34], [120, 92, 70], t.tone), 0.95);
    c.lineWidth = Math.max(1.1 * mpp, 0.005);
    for (let j = -1; j <= 1; j++) {
      c.beginPath(); c.moveTo(t.x + j * 0.01, 0.005);
      c.quadraticCurveTo(t.x + j * 0.02 + sway * 0.3, -t.h * 0.6, t.x + j * 0.035 + sway, -t.h * (1 - Math.abs(j) * 0.25));
      c.stroke();
    }
  }
  c.restore();
}

function drawCollar(c, v, k) {
  const mpp = v.cam.mpp;
  c.save();
  c.globalAlpha = k;
  for (const sgn of [-1, 1]) {
    const x0 = sgn * HW, x1 = sgn * (HW + COLLAR);
    const xl = Math.min(x0, x1), w = Math.abs(x1 - x0);
    // concrete body: raised lip 6 cm, 0.8 m deep
    const g = c.createLinearGradient(0, -0.06, 0, 0.8);
    g.addColorStop(0, '#77706a'); g.addColorStop(0.15, '#5d5753'); g.addColorStop(1, '#3b3735');
    c.fillStyle = g;
    L.roundRect(c, xl, -0.06, w, 0.86, 0.012);
    c.fill();
    // lit top face and the shaft-side edge, a seam line
    c.fillStyle = 'rgba(255,196,150,0.75)';
    c.fillRect(xl, -0.06, w, Math.max(1.4 * mpp, 0.008));
    c.fillStyle = 'rgba(255,214,170,0.35)';
    c.fillRect(sgn > 0 ? x0 : x0 - Math.max(1.4 * mpp, 0.008), -0.06, Math.max(1.4 * mpp, 0.008), 0.86);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(xl, 0.38, w, Math.max(1.2 * mpp, 0.006));
  }
  c.restore();
}

// distant land on the horizon + the low sun (screen space, tied to the ground line)
const RIDGE = (() => { const r = L.rng(1205); return Array.from({ length: 28 }, (_, i) => [i / 27, r()]); })();
function drawHorizon(c, v, k) {
  const gy = v.wy(0);
  if (gy < -60 || gy > H + 60) return;
  c.save();
  c.globalAlpha = k;
  // low sun behind the hills, left
  L.lightBlob(c, 150, gy - 18, 520, [255, 140, 80], 0.22);
  L.lightBlob(c, 150, gy - 18, 120, [255, 190, 130], 0.35);
  L.lightBlob(c, 150, gy - 14, 26, [255, 236, 200], 0.9);
  // two hazy ridges, parallax against the slow camera drift
  for (const [layer, hMax, col, par] of [[0, 34, [58, 42, 52], 0.25], [1, 18, [36, 28, 36], 0.5]]) {
    c.beginPath();
    c.moveTo(-20, gy + 1);
    for (let x = -20; x <= W + 20; x += 24) {
      const u = (x + v.cam.x / v.cam.mpp * par * 0.02) / 260 + layer * 7;
      const hh = hMax * (0.45 + 0.35 * L.noise1(u, 31 + layer) + 0.2 * L.noise1(u * 3.3, 41 + layer));
      c.lineTo(x, gy - Math.max(2, hh));
    }
    c.lineTo(W + 20, gy + 1);
    c.closePath();
    c.fillStyle = L.rgba(col, 0.92);
    c.fill();
  }
  c.restore();
}

// warm dust drifting up out of the lit shaft, and dusk motes
const MOTES = (() => { const r = L.rng(1206); return Array.from({ length: 20 }, () => [(r() - 0.5) * 1.1, r() * 2.4, r() * 6.3, 0.5 + r()]); })();
function drawMotes(c, v, k) {
  for (const [x0, h0, ph, s] of MOTES) {
    const cyc = ((v.gt * 0.12 * s + h0 / 2.4) % 1);
    const h = cyc * 2.4 - 0.4;
    const x = x0 + 0.12 * L.noise1(v.gt * 0.4 + ph, 7);
    const sx = v.wx(x), sy = v.wy(-h);
    if (sy < -20 || sy > H + 20) continue;
    const a = Math.sin(Math.PI * cyc) * (0.5 + 0.5 * Math.sin(v.gt * 2.3 * s + ph * 3));
    L.lightBlob(c, sx, sy, 3 + 4 * s, [255, 214, 170], 0.3 * k * a);
  }
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 3,
  cues(d) {
    return [
      { t: 0.1, name: 'swell', gain: 0.24, pitch: 0.8 },
      { t: 0.18, name: 'blip', gain: 0.22, pitch: 0.95 },
      { t: 0.46, name: 'blip', gain: 0.22, pitch: 1.1 },
      { t: 0.6, name: 'swish', gain: 0.26, pitch: 0.9 },
      { t: 1.0, name: 'tick', gain: 0.22, pitch: 1.3 },
      { t: 1.6, name: 'creak', gain: 0.14, pitch: 0.8 },
      { t: d - 0.66, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: d - 0.58, name: 'swish', gain: 0.3, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    const mpp = v.cam.mpp;
    // the cut-away ground, collar, horizon: the close-up only
    const gk = 1 - L.clamp(L.invLerp(0.04, 0.12, mpp));
    if (gk > 0 && v.visibleY(-1, 8)) {
      ctx.save();
      drawHorizon(ctx, v, gk);
      ctx.translate(v.wx(0), v.wy(0));
      ctx.scale(1 / mpp, 1 / mpp);
      drawGround(ctx, v, gk);
      ctx.restore();
      // the lit shaft mouth: warm light rising out of the hole
      const sx = v.wx(0), sy = v.wy(0);
      L.lightBlob(ctx, sx, sy + 0.25 / mpp, 1.5 / mpp, [255, 170, 100], 0.2 * gk);
    }
    // lamps inside the shaft (any zoom where they are distinguishable)
    const lk = 1 - L.clamp(L.invLerp(0.12, 0.4, mpp));
    if (lk > 0) {
      drawLampsScreen(ctx, v, lk);
    }
    drawSpeedStreaks(ctx, v);
    if (gk > 0) {
      ctx.save();
      ctx.translate(v.wx(0), v.wy(0));
      ctx.scale(1 / mpp, 1 / mpp);
      drawCollar(ctx, v, gk);
      ctx.restore();
    }
    // the person: true scale until the env marker takes over
    const pk = 1 - L.clamp(L.invLerp(Math.log(FALLER_SWAP[0]), Math.log(FALLER_SWAP[1]), Math.log(mpp)));
    if (pk > 0) {
      const s = person(v.gt);
      const sx = v.wx(s.hip[0]), sy = v.wy(-s.hip[1]);
      if (sx > -200 && sx < W + 200 && sy > -400 && sy < H + 400) {
        // contact shadow on the lip while the feet are on it
        const ck = 1 - L.prog(v.gt, T_OFF - 0.1, 0.15);
        if (ck > 0) {
          ctx.save();
          ctx.globalAlpha = pk * ck;
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath(); ctx.ellipse(v.wx(-HW - COLLAR / 2), v.wy(-LIP), 0.2 / mpp, 0.014 / mpp, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // rim: dusk sun on the surface, the shaft lamps once inside (pulses as each lamp passes)
        const centre = -(s.hip[1] + 0.1);
        const ph = ((((centre - LAMP0) / LAMP_STEP) % 1) + 1) % 1;
        const near = centre > 0.5 ? Math.exp(-Math.pow(Math.min(ph, 1 - ph) * LAMP_STEP / 0.7, 2)) : 0;
        const inside = L.clamp(centre / 1.5);
        const rimK = L.lerp(1, 0.75 + 0.35 * near, inside);
        // a soft warm pool of lamp light behind the figure inside the shaft (separates it from the dark bore)
        if (inside > 0) L.lightBlob(ctx, sx, v.wy(centre), L.clamp(1.0 / mpp, 46, 200), [255, 190, 140], 0.16 * inside * pk);
        ctx.save();
        ctx.globalAlpha = pk;
        ctx.translate(sx, sy);
        ctx.scale(1 / mpp, 1 / mpp);
        drawFigure(ctx, v, s, rimK, inside * (0.6 + 0.4 * near));
        ctx.restore();
      }
    }
    if (gk > 0) drawMotes(ctx, v, gk);
  },

  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    const s2 = 132;
    // sizes: fit both lines (line 2 includes the accent bar padding)
    ctx.save();
    ctx.font = L.font(s2, 800, L.FONT.display);
    ctx.letterSpacing = '-1px';
    const wA = ctx.measureText('THROUGH ').width, wB = ctx.measureText('THE EARTH?').width;
    ctx.letterSpacing = '0px';
    ctx.restore();
    const size2 = Math.min(s2, Math.floor(s2 * 930 / (wA + wB + 44)));
    const size1 = Math.round(size2 * 0.86);
    const lines = [
      { parts: [['WHAT IF YOU FELL', false]], y: 548, size: size1, t0: 0.16 },
      { parts: [['THROUGH ', false], ['THE EARTH?', true]], y: 548 + size2 * 1.12, size: size2, t0: 0.42 },
    ];
    // tagline with hairlines: A THOUGHT EXPERIMENT
    const tk = L.enter(t, 0.95, 0.6) * (1 - L.enter(t, d - 0.7, 0.25, L.ease.inCubic));
    if (tk > 0) {
      ctx.save();
      ctx.globalAlpha = tk;
      ctx.font = L.font(26, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(236,226,214,0.88)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8;
      const tw = L.trackedText(ctx, 'A THOUGHT EXPERIMENT', W / 2, 400 + (1 - L.ease.outCubic(tk)) * 10, 7, 'center');
      ctx.shadowBlur = 0;
      const lw = 70 * L.ease.outExpo(tk);
      ctx.fillStyle = L.rgba(v.accent, 0.85);
      ctx.fillRect(W / 2 - tw / 2 - 26 - lw, 391, lw, 2);
      ctx.fillRect(W / 2 + tw / 2 + 26, 391, lw, 2);
      ctx.restore();
    }
    lines.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.65, L.ease.outExpo);
      const kout = L.enter(t, d - 0.62 + i * 0.04, 0.28, L.ease.inOutCubic);
      if (kin <= 0 || kout >= 1) return;
      ctx.save();
      ctx.font = L.font(ln.size, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const widths = ln.parts.map(([s]) => ctx.measureText(s).width);
      ctx.letterSpacing = '0px';
      const total = widths.reduce((a, b) => a + b, 0) + (ln.parts.length > 1 ? 44 : 0);   // the bar pads 22 px each side
      let x = W / 2 - total / 2;
      const top = ln.y - ln.size * 0.8, bot = ln.y + ln.size * 0.1;
      // exit: a short fade with a slight lift (no mask slide: under motion blur it read as squashed letters)
      const lift = -L.ease.outCubic(kout) * 16;
      const dy = (1 - kin) * ln.size * 1.05 + lift;
      const by = lift;
      ctx.globalAlpha = 1 - kout;
      ln.parts.forEach(([s, acc], j) => {
        const w = widths[j];
        ctx.save();
        if (acc) {
          x += 22;
          const bk = L.enter(t, ln.t0 + 0.12, 0.55, L.ease.outExpo);
          const bx0 = x - 22, bw = w + 44;
          const bL = bx0, bR = bx0 + bw * bk;
          ctx.beginPath(); ctx.rect(bx0 - 60, top - 40, bw + 120, bot - top + 36 + 60); ctx.clip();
          ctx.translate(0, by);
          if (bR > bL) {
            ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
            ctx.fillStyle = L.rgba(v.accent);
            ctx.fillRect(bL, top - 16, bR - bL, bot - top + 32);
            ctx.shadowColor = 'transparent';
            const sw = L.prog(t, ln.t0 + 0.85, 0.9);
            if (sw > 0 && sw < 1) {
              const gx = L.lerp(bL - 120, bR + 120, L.ease.inOutCubic(sw));
              const g = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
              g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.38)'); g.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = g;
              ctx.fillRect(bL, top - 16, bR - bL, bot - top + 32);
            }
          }
          ctx.beginPath(); ctx.rect(Math.max(0, bL), top - 16, Math.max(0, bR - bL), bot - top + 32); ctx.clip();
          ctx.fillStyle = L.rgba(INK);
        } else {
          ctx.beginPath(); ctx.rect(0, top - 40, W, bot - top + 56); ctx.clip();
          ctx.fillStyle = '#f7f1ea';
          ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
        }
        ctx.textBaseline = 'alphabetic';
        ctx.font = L.font(ln.size, 800, L.FONT.display);
        L.trackedText(ctx, s, x, ln.y + (acc ? (1 - kin) * ln.size * 1.05 : dy), -1, 'left');
        ctx.restore();
        x += w;
      });
      ctx.restore();
    });
  },
};

// The shaft interior (screen space, crisp at every zoom): the far wall of the bore (cylinder shading + liner joints),
// and warm lamps on both walls. When the faller drops fast, lamps and joints smear into streaks (half a frame of travel).
const JOINT = 1.1;   // liner ring joints (m)
function drawLampsScreen(c, v, k) {
  const mpp = v.cam.mpp;
  const xl = v.wx(-HW), xr = v.wx(HW);
  if (xr < -20 || xl > W + 20) return;
  const yTop = v.cam.y - (H * v.cam.anchor + 40) * mpp, yBot = v.cam.y + (H * (1 - v.cam.anchor) + 40) * mpp;
  const ys = Math.max(-10, v.wy(0)), ye = H + 10;
  if (ye <= ys) return;
  const smear = Math.min(600, Math.max(0, fallerDepth(v.gt) - fallerDepth(v.gt - 1 / 60)) / mpp);   // px travelled in half a frame
  // when fast, drawSpeedStreaks takes over (world-anchored detail averages out under motion blur)
  const fastK = streakState(v).ik * streakEnv(v.gt);
  if (fastK >= 0.99) return;
  c.save();
  c.globalAlpha = k * (1 - fastK);
  c.beginPath(); c.rect(xl, ys, xr - xl, ye - ys); c.clip();
  // far wall: a lit band in the middle, dark sides (a cylinder seen from inside)
  const g = c.createLinearGradient(xl, 0, xr, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(70,56,48,0.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(xl, ys, xr - xl, ye - ys);
  // liner joints: shallow arcs (the back half of each ring), smeared when fast
  if (JOINT / mpp > 8) {
    const j0 = Math.max(0, Math.floor(yTop / JOINT)), j1 = Math.ceil(yBot / JOINT);
    c.strokeStyle = `rgba(150,124,104,${0.28 / (1 + smear / 40)})`;
    c.lineWidth = Math.max(1, 0.012 / mpp) + smear * 0.6;
    const bow = (xr - xl) * 0.12;
    for (let j = j0; j <= Math.min(j1, j0 + 300); j++) {
      const sy = v.wy(j * JOINT) + smear * 0.3;
      c.beginPath(); c.moveTo(xl, sy); c.quadraticCurveTo((xl + xr) / 2, sy - bow, xr, sy); c.stroke();
    }
  }
  // lamps
  const n0 = Math.max(0, Math.floor((yTop - LAMP0) / LAMP_STEP)), n1 = Math.ceil((yBot - LAMP0) / LAMP_STEP);
  const big = LAMP_STEP / mpp > 30;
  const fw = Math.max(1.5, 0.045 / mpp), fh = Math.max(2, 0.11 / mpp);
  for (let n = n0; n <= Math.min(n1, n0 + 400); n++) {
    const sy = v.wy(LAMP0 + n * LAMP_STEP);
    for (const sgn of [-1, 1]) {
      const sx = v.wx(sgn * (HW - 0.03));
      if (big) L.lightBlob(c, sx, sy + smear * 0.5, Math.max(10, 0.9 / mpp), [255, 176, 112], 0.42 / (1 + smear / 60));
      c.fillStyle = 'rgba(255,236,206,0.95)';
      c.fillRect(sx - fw / 2, sy - fh / 2, fw, fh + smear);
    }
  }
  // warm light pooling at the mouth
  const my = v.wy(0);
  if (my > -200 && my < H) {
    const mg = c.createLinearGradient(0, my, 0, my + 1.6 / mpp);
    mg.addColorStop(0, 'rgba(255,170,110,0.16)'); mg.addColorStop(1, 'rgba(255,170,110,0)');
    c.fillStyle = mg;
    c.fillRect(xl, my, xr - xl, 1.6 / mpp);
  }
  c.restore();
}

// ------------------------------------------------------------------ speed streaks (the fall inside the shaft)
// At 1,000-2,000 px per frame, world-anchored lamps and joints average out under motion blur. So while the faller is
// fast, the lamps and the rock are drawn as streaks whose LENGTH follows the real per-frame speed (clamped to 600 px)
// but whose on-screen travel is capped (STREAK_CAP px/frame), so every frame and every motion-blurred still shows them.
const STREAK_CAP = 230;                       // px per frame
const T_S0 = BS[1] + 0.103, T_S1 = BS[1] + 1.283;
const streakEnv = (gt) => L.smoothstep(L.invLerp(T_S0, BS[1] + 0.213, gt)) * (1 - L.smoothstep(L.invLerp(BS[1] + 0.833, T_S1, gt)));
/** Integrated streak travel (px) at gt: a pure function of time. */
function streakPhase(gt) {
  if (gt <= T_S0) return 0;
  const t1 = Math.min(gt, T_S1), n = Math.max(1, Math.ceil((t1 - T_S0) * 120)), h = (t1 - T_S0) / n;
  let acc = 0;
  for (let i = 0; i < n; i++) acc += streakEnv(T_S0 + (i + 0.5) * h) * h;
  return acc * STREAK_CAP * 30;
}
/** Real on-screen speed of the walls past the faller (px per frame) and the streak intensity 0..1. */
function streakState(v) {
  const sp = Math.max(0, fallerDepth(v.gt) - fallerDepth(v.gt - 1 / 30)) / v.cam.mpp;
  const ik = L.smoothstep(L.invLerp(25, 300, sp)) * (1 - L.smoothstep(L.invLerp(0.18, 0.6, v.cam.mpp)));
  return { sp, ik };
}
const WALL_STREAKS = (() => {
  const r = L.rng(1207);
  return Array.from({ length: 52 }, (_, i) => ({
    side: i % 2 ? 1 : -1, u: Math.pow(r(), 1.5), off: r(), len: 0.35 + 0.65 * r(), w: 0.8 + 1.4 * r(), light: r() > 0.4, a: 0.5 + 0.5 * r(),
  }));
})();
const wrap = (y, span) => ((y % span) + span) % span;

function drawSpeedStreaks(c, v) {
  if (v.gt < T_S0 || v.gt > T_S1 + 0.1) return;
  const { sp, ik } = streakState(v);
  const k = ik * streakEnv(v.gt);
  if (k <= 0.01) return;
  const mpp = v.cam.mpp;
  const xl = v.wx(-HW), xr = v.wx(HW);
  if (xr < -40 || xl > W + 40) return;
  const ph = streakPhase(v.gt);
  const top = Math.max(-20, v.wy(0));
  const SPAN = H + 900;
  c.save();
  c.beginPath(); c.rect(0, top, W, H - top + 20); c.clip();
  c.lineCap = 'round';
  // 1. the rock walls: thin pale/dark grain streaks either side of the shaft (kept off the HUD map strip, x < 170)
  const reachL = Math.max(0, Math.min(460, xl - 170)), reachR = Math.min(460, W - 130 - xr);
  for (const s of WALL_STREAKS) {
    const reach = s.side < 0 ? reachL : reachR;
    if (reach < 4) continue;
    const dx = 8 + s.u * reach;
    const x = s.side < 0 ? xl - dx : xr + dx;
    const len = L.clamp(sp * 0.55, 0, 600) * s.len;
    const y = wrap(s.off * SPAN - ph, SPAN) - 450;
    const fade = 1 - dx / (reach + 60);
    const a = (s.light ? 0.34 : 0.4) * s.a * k * fade;
    if (a <= 0.004 || len < 2) continue;
    const g = c.createLinearGradient(0, y, 0, y + len);
    const col = s.light ? [244, 226, 204] : [18, 12, 10];
    g.addColorStop(0, L.rgba(col, a)); g.addColorStop(1, L.rgba(col, 0));
    c.strokeStyle = g;
    c.lineWidth = s.w * 1.3;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.stroke();
  }
  // 2. inside the bore: a lit far wall and liner joints streaming past (between the liner walls)
  c.save();
  c.beginPath(); c.rect(xl, top, xr - xl, H - top + 20); c.clip();
  const fw = c.createLinearGradient(xl, 0, xr, 0);
  fw.addColorStop(0, 'rgba(0,0,0,0)'); fw.addColorStop(0.5, `rgba(120,88,66,${0.34 * k})`); fw.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = fw;
  c.fillRect(xl, top, xr - xl, H - top + 20);
  const JS = 470, jb = L.clamp(sp * 0.22, 10, 220);
  for (let y0 = wrap(-ph * 1.0 + 130, JS) - JS; y0 < H + JS; y0 += JS) {
    const g = c.createLinearGradient(0, y0, 0, y0 + jb);
    g.addColorStop(0, 'rgba(196,164,136,0)'); g.addColorStop(0.15, `rgba(196,164,136,${0.22 * k})`); g.addColorStop(1, 'rgba(196,164,136,0)');
    c.fillStyle = g;
    c.fillRect(xl, y0, xr - xl, jb);
  }
  c.restore();
  // 3. the lamps on both liner walls: long warm streaks, bright head, tail trailing below
  c.globalCompositeOperation = 'lighter';
  const lampLen = L.clamp(sp, 0, 600);
  const LS = SPAN / 3;
  for (const sgn of [-1, 1]) {
    const x = v.wx(sgn * (HW - 0.04));
    for (let i = 0; i < 3; i++) {
      const y = wrap(i * LS + (sgn > 0 ? LS * 0.5 : 0) - ph, SPAN) - 450;
      const len = lampLen * (0.82 + 0.18 * Math.sin(i * 2.3 + sgn));
      if (y + len < -20 || y > H + 20) continue;
      const a = (0.8 + 0.2 * ((i + (sgn > 0 ? 1 : 0)) % 2)) * k;
      // wide glow on the liner
      const gg = c.createLinearGradient(0, y, 0, y + len);
      gg.addColorStop(0, `rgba(255,190,130,${0.45 * a})`); gg.addColorStop(1, 'rgba(255,190,130,0)');
      c.fillStyle = gg;
      c.fillRect(x - 14, y - 4, 28, len + 4);
      // bright core
      const gc = c.createLinearGradient(0, y, 0, y + len);
      gc.addColorStop(0, `rgba(255,236,206,${a})`); gc.addColorStop(0.35, `rgba(255,190,130,${0.8 * a})`); gc.addColorStop(1, 'rgba(255,190,130,0)');
      c.strokeStyle = gc;
      c.lineWidth = 4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.stroke();
      L.lightBlob(c, x, y + 6, 56, [255, 190, 130], 0.55 * a);
    }
  }
  c.restore();
}
