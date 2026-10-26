// Beat 0 — the hook. Dusk. A person (1.75 m, true scale) stands at the lip of a lined shaft drilled straight down,
// looks into it, crouches, and hops out over the void on the last ~0.6 s. From the start of beat 1 they fall with
// fallerDepth(gt) (arms up, pencil pose) while the shaft lamps stream past; between FALLER_SWAP mpp they fade out and
// the env's white faller marker takes over at the same point (the figure's centre sits on the faller depth).
// The ground is drawn as a true-scale cut-away: topsoil, clay with stones, bedrock with fractures, a concrete collar.
// Masked headline: WHAT IF YOU FELL / THROUGH THE EARTH? ("THE EARTH?" on an accent bar) + "A THOUGHT EXPERIMENT".
import * as L from '../../../../engine/runtime/lib.js';
import { fallerDepth } from '../camera.js';
import { FALLER_SWAP, TUNNEL_HW, FALLER_COL } from '../env.js';

const { W, H } = L;
const HOOK_END = 3.867;           // beat 1 start (global s): the person is over the hole at x = 0
const DROP = 3.95;                // fallerDepth starts moving here
const BODY = [24, 22, 30];
const RIM = [255, 178, 122];
const INK = [26, 12, 6];
const HW = TUNNEL_HW;             // 0.6 m
const COLLAR = 0.17;              // concrete collar thickness (m)
const LAMP0 = 0.95, LAMP_STEP = 2.2;   // shaft lamps: first depth and spacing (m)

// ------------------------------------------------------------------ pose (metres, x forward = +x, y up, relative to the hip)
const P = {
  stand: {
    lean: 0, tilt: -0.1, hipH: 0.93,
    legF: [[-0.03, 0], [-0.03, -0.42], [-0.06, -0.845], [0.14, -0.9]],
    legN: [[0.03, 0], [0.06, -0.42], [0.05, -0.845], [0.25, -0.9]],
    armN: [[0.03, 0.2], [0.05, -0.06], [0.06, -0.15]],
    armF: [[-0.05, 0.2], [-0.04, -0.06], [-0.03, -0.15]],
  },
  look: {
    lean: 0.1, tilt: -0.62, hipH: 0.925,
    legF: [[-0.03, 0], [-0.02, -0.42], [-0.07, -0.84], [0.13, -0.9]],
    legN: [[0.03, 0], [0.08, -0.42], [0.05, -0.84], [0.25, -0.9]],
    armN: [[0.06, 0.2], [0.1, -0.05], [0.12, -0.14]],
    armF: [[-0.02, 0.2], [0.0, -0.06], [0.02, -0.15]],
  },
  crouch: {
    lean: 0.3, tilt: -0.3, hipH: 0.8,
    legF: [[-0.03, 0], [0.1, -0.37], [-0.06, -0.715], [0.14, -0.77]],
    legN: [[0.03, 0], [0.18, -0.35], [0.05, -0.715], [0.25, -0.77]],
    armN: [[-0.15, 0.25], [-0.3, 0.08], [-0.37, 0.02]],
    armF: [[-0.2, 0.24], [-0.35, 0.1], [-0.41, 0.05]],
  },
  step: {
    lean: 0.06, tilt: -0.12, hipH: 0.95,
    legF: [[-0.03, 0], [-0.07, -0.42], [-0.27, -0.76], [-0.11, -0.85]],
    legN: [[0.03, 0], [0.27, -0.3], [0.25, -0.72], [0.43, -0.76]],
    armN: [[0.22, 0.58], [0.38, 0.78], [0.44, 0.87]],
    armF: [[0.15, 0.62], [0.27, 0.87], [0.31, 0.96]],
  },
  fall: {
    lean: 0.02, tilt: 0.34, hipH: 0.95,
    legF: [[-0.03, 0], [-0.07, -0.42], [-0.13, -0.83], [-0.03, -0.91]],
    legN: [[0.03, 0], [0.09, -0.4], [0.04, -0.82], [0.14, -0.9]],
    armN: [[0.24, 0.7], [0.4, 0.92], [0.46, 1.0]],
    armF: [[-0.19, 0.72], [-0.34, 0.95], [-0.39, 1.03]],
  },
};
const lerpPt = (a, b, k) => [L.lerp(a[0], b[0], k), L.lerp(a[1], b[1], k)];
function blend(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o = { lean: L.lerp(a.lean, b.lean, k), tilt: L.lerp(a.tilt, b.tilt, k), hipH: L.lerp(a.hipH, b.hipH, k) };
  for (const key of ['legF', 'legN', 'armN', 'armF']) o[key] = a[key].map((p, i) => lerpPt(p, b[key][i], k));
  return o;
}
const rot = (p, c, a) => {
  const x = p[0] - c[0], y = p[1] - c[1], cs = Math.cos(a), sn = Math.sin(a);
  return [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs];
};
// head profile around its centre (x forward, y up); torso (jacket) relative to the hip
const HEAD = [[-0.03, 0.125], [0.05, 0.112], [0.092, 0.07], [0.1, 0.035], [0.13, -0.005], [0.104, -0.03], [0.11, -0.055],
  [0.1, -0.075], [0.075, -0.112], [0.02, -0.115], [-0.04, -0.08], [-0.075, -0.07], [-0.115, -0.02], [-0.118, 0.05], [-0.09, 0.105]];
const TORSO = [[-0.135, -0.05], [-0.15, 0.08], [-0.13, 0.17], [-0.1, 0.3], [-0.125, 0.47], [-0.105, 0.53], [-0.04, 0.565], [0.05, 0.56],
  [0.105, 0.48], [0.13, 0.36], [0.115, 0.2], [0.135, 0.06], [0.13, -0.06]];

/** Timeline of the person (global seconds): pose, hip world position. */
function person(gt) {
  const d = HOOK_END;
  const wLook = L.ease.inOutCubic(L.prog(gt, 0.9, 0.9));
  const wCrouch = L.ease.inOutCubic(L.prog(gt, d - 1.02, 0.4));
  const stepK = L.ease.inOutCubic(L.prog(gt, d - 0.62, 0.56));
  const wStep = L.ease.inOutCubic(L.prog(gt, d - 0.62, 0.3));
  const wFall = L.ease.inOutCubic(L.prog(gt, d - 0.2, 0.6));
  let p = blend(P.stand, P.look, wLook);
  p = blend(p, P.crouch, wCrouch);
  p = blend(p, P.step, wStep);
  p = blend(p, P.fall, wFall);
  // breathing and a little flail once falling
  const fl = L.prog(gt, DROP, 0.4);
  if (fl > 0) {
    const n = (s) => L.noise1(gt * 3.1 + s, s) * 0.05 * fl;
    p.armN = p.armN.map(([x, y], i) => [x + n(1 + i), y]);
    p.armF = p.armF.map(([x, y], i) => [x + n(4 + i), y]);
    p.legN = p.legN.map(([x, y], i) => [x + (i ? n(7) * 0.6 : 0), y]);
    p.legF = p.legF.map(([x, y], i) => [x + (i ? n(9) * 0.6 : 0), y]);
  }
  const breathe = Math.sin(gt * 2.1) * 0.005 * (1 - fl);
  const x = L.lerp(-1.0, 0, stepK);
  const hop = 0.1 * Math.sin(Math.PI * stepK);
  const tb = L.clamp(gt - (d - 0.07), 0, 0.15);
  const ballistic = 0.5 * 9.81 * tb * tb;
  const b = L.ease.inOutCubic(L.prog(gt, DROP, 0.6));
  const h = p.hipH + hop;
  // hip world y (depth, down +): standing on the ground, then the figure's centre (hip + 0.1 m) rides fallerDepth
  const y = -h + ballistic + fallerDepth(gt) + b * (h - 0.1 - ballistic);
  const spin = 0.05 * L.noise1(gt * 1.3, 11) * fl;
  return { p, x, y, breathe, spin, fall: fl };
}

function build(p, breathe) {
  const R = (q) => rot(q, [0, 0], -p.lean);
  const torso = TORSO.map(([x, y]) => R([x, y * (1 + breathe)]));
  const shoulder = R([0.0, 0.48]);
  const neck = R([0.015, 0.565]);
  const pivot = [neck[0], neck[1] + 0.04];
  const hc0 = [neck[0] + 0.025, neck[1] + 0.13];
  const tilt = p.tilt - p.lean;
  const hc = rot(hc0, pivot, tilt);
  const head = HEAD.map(([x, y]) => rot([hc0[0] + x, hc0[1] + y], pivot, tilt));
  const arm = (a) => a.map(R);
  return { torso, shoulder, neck, hc, head, armN: arm(p.armN), armF: arm(p.armF), legN: p.legN, legF: p.legF };
}

// ------------------------------------------------------------------ path helpers (y up in the pose → canvas y = -y)
function area(q) { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], r = q[(i + 1) % q.length]; a += p[0] * r[1] - r[0] * p[1]; } return a; }
function capsule(c, A, ra, B, rb) {
  const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
  c.moveTo(A[0] + ra, -A[1]); c.arc(A[0], -A[1], Math.max(0, ra), 0, Math.PI * 2);
  c.moveTo(B[0] + rb, -B[1]); c.arc(B[0], -B[1], Math.max(0, rb), 0, Math.PI * 2);
  if (d <= Math.abs(ra - rb)) return;
  const ang = Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
  const off = Math.acos(L.clamp((ra - rb) / d, -1, 1));
  let q = [[A[0] + Math.cos(ang + off) * ra, -A[1] + Math.sin(ang + off) * ra], [B[0] + Math.cos(ang + off) * rb, -B[1] + Math.sin(ang + off) * rb],
    [B[0] + Math.cos(ang - off) * rb, -B[1] + Math.sin(ang - off) * rb], [A[0] + Math.cos(ang - off) * ra, -A[1] + Math.sin(ang - off) * ra]];
  if (area(q) < 0) q = q.reverse();
  q.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}
function smooth(c, pts) {
  if (area(pts.map(([x, h]) => [x, -h])) < 0) pts = pts.slice().reverse();
  const n = pts.length;
  const m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2]; };
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], e = m(i); c.quadraticCurveTo(p[0], -p[1], e[0], e[1]); }
  c.closePath();
}
function figurePath(c, q, near) {
  c.beginPath();
  const lg = near ? q.legN : q.legF;
  capsule(c, lg[0], 0.085, lg[1], 0.062);
  capsule(c, lg[1], 0.058, lg[2], 0.04);
  const heel = [lg[2][0] - 0.045 * Math.sign(lg[3][0] - lg[2][0] || 1), lg[2][1] - 0.035];
  capsule(c, heel, 0.045, lg[3], 0.03);
  const a = near ? q.armN : q.armF;
  const sh = near ? q.shoulder : [q.shoulder[0] - 0.03, q.shoulder[1]];
  if (near) {
    smooth(c, q.torso);
    capsule(c, q.neck, 0.052, [q.hc[0] - 0.02, q.hc[1] - 0.05], 0.05);
    smooth(c, q.head);
  }
  capsule(c, sh, 0.056, a[0], 0.044);
  capsule(c, a[0], 0.042, a[1], 0.031);
  capsule(c, a[1], 0.034, a[2], 0.026);
}

/** Draw the person in metre units (canvas already translated to the hip and scaled by 1/mpp).
 *  cool (0..1): inside the shaft, a cool-white rim on the near edge (the env marker's colour) so the figure reads on black. */
function drawFigure(c, v, s, rimK, fill = 0, cool = 0) {
  const q = build(s.p, s.breathe);
  const rim = 1.7 * v.cam.mpp;
  const rimC = 2.6 * v.cam.mpp;
  c.rotate(s.spin);
  for (const near of [false, true]) {
    c.save();
    c.translate(-rim, -rim * 0.6);
    figurePath(c, q, near);
    c.fillStyle = L.rgba(RIM, (near ? 0.9 : 0.55) * rimK);
    c.fill();
    c.restore();
    if (cool > 0) {
      c.save();
      c.translate(rimC, -rimC * 0.25);
      figurePath(c, q, near);
      c.fillStyle = L.rgba(FALLER_COL, (near ? 0.95 : 0.5) * cool);
      c.fill();
      c.restore();
    }
    figurePath(c, q, near);
    const body = L.mix(L.mix(BODY, [96, 74, 62], fill * 0.55), [92, 96, 112], cool * 0.35);
    c.fillStyle = L.rgba(near ? body : L.mix(body, [60, 52, 66], 0.35));
    c.fill();
  }
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
      const sx = v.wx(s.x), sy = v.wy(s.y);
      if (sx > -200 && sx < W + 200 && sy > -400 && sy < H + 400) {
        // contact shadow while standing
        if (s.fall <= 0 && v.gt < HOOK_END) {
          const lift = L.clamp((-s.y - s.p.hipH) / 0.2);
          ctx.save();
          ctx.globalAlpha = pk * (1 - lift) * (s.x < -HW - 0.05 ? 1 : 0.3);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath(); ctx.ellipse(v.wx(s.x + 0.08), v.wy(0), 0.4 / mpp, 0.03 / mpp, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // rim: dusk sun on the surface, the shaft lamps once inside (pulses as each lamp passes)
        const centre = s.y + 0.1;
        const ph = ((centre - LAMP0) / LAMP_STEP) % 1;
        const near = centre > 0.5 ? Math.exp(-Math.pow(Math.min(ph, 1 - ph) * LAMP_STEP / 0.7, 2)) : 0;
        const inside = L.clamp(centre / 1.5);
        const rimK = L.lerp(1, 0.75 + 0.35 * near, inside);
        const cool = inside * L.prog(v.gt, DROP, 0.25);
        // a cool halo behind the figure: separates it from the black shaft and hands over to the env marker's glow
        if (cool > 0) {
          const cy = v.wy(centre);
          L.lightBlob(ctx, sx, cy, L.clamp(1.15 / mpp, 46, 240), [170, 200, 255], 0.3 * cool * pk);
        }
        ctx.save();
        ctx.globalAlpha = pk;
        ctx.translate(sx, sy);
        ctx.scale(1 / mpp, 1 / mpp);
        drawFigure(ctx, v, s, rimK, inside * (0.6 + 0.4 * near), cool);
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
      ctx.font = L.font(24, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(236,226,214,0.85)';
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
      const kout = L.enter(t, d - 0.66 + i * 0.05, 0.3, L.ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      ctx.save();
      ctx.font = L.font(ln.size, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const widths = ln.parts.map(([s]) => ctx.measureText(s).width);
      ctx.letterSpacing = '0px';
      const total = widths.reduce((a, b) => a + b, 0) + (ln.parts.length > 1 ? 22 : 0);
      let x = W / 2 - total / 2;
      const top = ln.y - ln.size * 0.8, bot = ln.y + ln.size * 0.1;
      const dy = (1 - kin) * ln.size * 1.05 - kout * ln.size * 1.1;
      const by = -kout * (ln.size * 0.9 + 80);
      ln.parts.forEach(([s, acc], j) => {
        const w = widths[j];
        ctx.save();
        if (acc) {
          x += 22;
          const bk = L.enter(t, ln.t0 + 0.12, 0.55, L.ease.outExpo);
          const bx0 = x - 22, bw = w + 44;
          const bL = bx0, bR = bx0 + bw * bk;
          ctx.beginPath(); ctx.rect(bx0 - 60, top - 18, bw + 120, bot - top + 36 + 40); ctx.clip();
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
          ctx.beginPath(); ctx.rect(0, top - 12, W, bot - top + 28); ctx.clip();
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
const T_S0 = 3.97, T_S1 = 5.15;
const streakEnv = (gt) => L.smoothstep(L.invLerp(T_S0, 4.08, gt)) * (1 - L.smoothstep(L.invLerp(4.7, T_S1, gt)));
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
