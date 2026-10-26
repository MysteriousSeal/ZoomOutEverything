// Beat 15 — "In the deep sea, | many are about as thick as a garden hose."
// The camera pushes in over the Arabian Sea (3.6 km/px): the cables are big lines. A pin ring lands on one deep-sea
// cable (Mumbai - Mombasa, mid-ocean) and a circular magnifier opens above it, linked by two tangent leaders.
// Inside the lens, at true relative scale (6 px per mm), end to end on one centre line:
//   * a deep-sea cable in a stepped cutaway (polyethylene, copper, steel strength wires, the steel fibre tube, and the
//     glass fibres fanning out with tiny light pulses), sliding in from the left on "In the deep sea";
//   * a garden hose (muted sage, cut end with its bore) sliding in from the right on "a garden hose";
//   * two hairlines along the cable's edges carry across to the hose: the same thickness.
// Label "≈ 2 cm" / "0.8 in thick" on "thick". The lens folds back into the pin as the camera pulls out (beat 16).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CABLES, DEG, project } from '../env.js';
import { phraseAt, wordTime } from './s01-one-phone.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ the pin: midway along Mumbai - Mombasa ([11, 62] -> [2, 50.5])
const PIN = (() => {
  const cb = CABLES.find((c) => c.name.startsWith('Mumbai - Mombasa'));
  const a = cb ? cb.pts[1] : [11, 62], b = cb ? cb.pts[2] : [2, 50.5];
  const u = ([la, lo]) => [Math.cos(la * DEG) * Math.cos(lo * DEG), Math.cos(la * DEG) * Math.sin(lo * DEG), Math.sin(la * DEG)];
  const A = u(a), B = u(b);
  const ang = Math.acos(L.clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1));
  const f = 0.55, s = Math.sin(ang), fa = Math.sin((1 - f) * ang) / s, fb = Math.sin(f * ang) / s;
  const p = [A[0] * fa + B[0] * fb, A[1] * fa + B[1] * fb, A[2] * fa + B[2] * fb];
  return { lat: Math.asin(p[2]) / DEG, lon: Math.atan2(p[1], p[0]) / DEG };
})();

// ------------------------------------------------------------------ lens geometry (screen px) and scale
const LENS = { x: 596, y: 730, R: 234 };
const MM = 7;                                   // px per millimetre inside the lens
const CABLE_D = 18, HOSE_D = 19, HOSE_ID = 13;  // mm (lightweight deep-sea cable ~17-21 mm; a 1/2" garden hose)

// ------------------------------------------------------------------ timing
export function times(tl) {   // 18c: exported (cue times)
  const s = tl.scenes[15];
  return {
    pin: phraseAt(tl, 15, 0, 'end') - 0.15,       // ~65.9: camera is almost there
    open: phraseAt(tl, 15, 1) - 0.05,              // "many are about as thick..."
    cable: phraseAt(tl, 15, 1),                    // slides in as the lens opens: the lens never holds nothing
    thick: wordTime(tl, 15, 'thick') - 0.05,       // label + hairlines
    garden: wordTime(tl, 15, 'garden') - 0.3,      // the hose slides in ("as a garden hose")
    close: s.end - 0.05,                           // 18c (18b port): a readable 0.4 s fold across the cut, closed by s.end + 0.35, before beat 16's pull-out gets fast
  };
}

// ------------------------------------------------------------------ drawing helpers
/** A horizontal cylinder segment [x0, x1] of radius r on centre line y, shaded with a top-lit gradient. */
function cylinder(c, x0, x1, y, r, cols, alpha = 1) {
  if (x1 <= x0 || r <= 0) return;
  const g = c.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, L.rgba(cols[0], alpha));
  g.addColorStop(0.28, L.rgba(cols[1], alpha));
  g.addColorStop(0.62, L.rgba(cols[2], alpha));
  g.addColorStop(1, L.rgba(cols[3], alpha));
  c.fillStyle = g;
  c.fillRect(x0, y - r, x1 - x0, 2 * r);
}
/** The cut face of a cylinder seen from the side: a thin ellipse at x. */
function endCap(c, x, y, r, col, alpha) {
  c.fillStyle = L.rgba(col, alpha);
  c.beginPath(); c.ellipse(x, y, Math.max(0, r * 0.2), Math.max(0, r), 0, 0, TAU); c.fill();
}

/** The cutaway cable, its right end at screen x `xe` (layers step back by `peel` 0..1 each), centre line y. */
function drawCable(c, xe, y, peel, gt, alpha) {
  const R0 = (CABLE_D / 2) * MM;          // polyethylene
  const R1 = 5.6 * MM;                    // copper sheath
  const R2 = 4.7 * MM;                    // steel strength wires
  const R3 = 1.6 * MM;                    // steel fibre tube
  // step lengths (px), each revealed in turn
  const st = [40, 40, 38, 30].map((l, i) => l * L.ease.outCubic(L.clamp(peel * 4 - i * 0.75)));
  const xPE = xe - st[0] - st[1] - st[2] - st[3];
  const xCu = xPE + st[0], xSt = xCu + st[1], xTu = xSt + st[2];
  const xL = LENS.x - LENS.R - 40;
  c.save();
  // fibres (under everything): 8 coloured hairlines fanning from the tube
  const fan = L.ease.outCubic(L.clamp(peel * 4 - 3));
  if (fan > 0) {
    const cols = [[120, 190, 255], [150, 230, 255], [255, 210, 140], [170, 255, 210], [255, 170, 190], [200, 180, 255], [240, 240, 255], [120, 240, 230]];
    c.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 7 - 0.5) * 1.1 * fan;
      const len = (40 + (i % 3) * 7) * fan;
      const x1 = xTu + Math.cos(a) * len, y1 = y + Math.sin(a) * len + (i / 7 - 0.5) * R3 * 1.2;
      c.strokeStyle = L.rgba(cols[i], 0.85 * alpha);
      c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(xTu - 6, y + (i / 7 - 0.5) * R3 * 1.3); c.quadraticCurveTo(xTu + len * 0.4, y + (i / 7 - 0.5) * R3 * 1.4, x1, y1); c.stroke();
      // light leaving each fibre tip
      const pulse = 0.5 + 0.5 * Math.sin(gt * 7 + i * 1.3);
      L.lightBlob(c, x1, y1, 9 + 4 * pulse, cols[i], 0.55 * alpha * fan * (0.5 + 0.5 * pulse));
    }
  }
  // steel tube
  cylinder(c, xL, xTu, y, R3, [[230, 236, 244], [190, 198, 210], [120, 128, 140], [70, 76, 88]], alpha);
  endCap(c, xTu, y, R3, [60, 66, 78], alpha);
  // steel strength wires: helical strands
  if (xSt > xL) {
    cylinder(c, xL, xSt, y, R2, [[210, 216, 226], [160, 168, 180], [96, 104, 118], [50, 56, 66]], alpha);
    c.save();
    c.beginPath(); c.rect(xL, y - R2, xSt - xL, 2 * R2); c.clip();
    c.strokeStyle = L.rgba([30, 34, 42], 0.55 * alpha);
    c.lineWidth = 1.4;
    c.beginPath();
    for (let x = xSt - 200; x < xSt + 20; x += 8) { c.moveTo(x, y - R2); c.lineTo(x + R2 * 0.9, y + R2); }
    c.stroke();
    c.restore();
    endCap(c, xSt, y, R2, [64, 70, 82], alpha);
  }
  // copper sheath
  if (xCu > xL) {
    cylinder(c, xL, xCu, y, R1, [[255, 196, 140], [214, 130, 74], [150, 82, 44], [86, 44, 24]], alpha);
    endCap(c, xCu, y, R1, [120, 64, 34], alpha);
  }
  // polyethylene jacket (near-black, a soft sheen)
  if (xPE > xL) {
    cylinder(c, xL, xPE, y, R0, [[78, 84, 96], [34, 38, 46], [16, 18, 24], [8, 9, 12]], alpha);
    endCap(c, xPE, y, R0, [24, 26, 32], alpha);
    // the cut ring of the jacket (cross-section thickness)
    c.strokeStyle = L.rgba([110, 118, 132], 0.6 * alpha);
    c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(xPE, y, R0 * 0.2, R0, 0, 0, TAU); c.stroke();
  }
  c.restore();
  return xPE;
}

/** The garden hose, its cut end at screen x `xs`, running right; centre line y. */
function drawHose(c, xs, y, alpha) {
  const R = (HOSE_D / 2) * MM, Ri = (HOSE_ID / 2) * MM;
  const xr = LENS.x + LENS.R + 40;
  cylinder(c, xs, xr, y, R, [[150, 182, 132], [92, 128, 82], [52, 78, 48], [24, 38, 24]], alpha);
  // a thin tracer stripe and faint moulding lines
  c.fillStyle = L.rgba([214, 196, 120], 0.55 * alpha);
  c.fillRect(xs, y - R * 0.52, xr - xs, 2.2);
  c.fillStyle = L.rgba([230, 240, 220], 0.12 * alpha);
  c.fillRect(xs, y - R * 0.72, xr - xs, 1.5);
  // the cut end: wall ring + dark bore
  c.fillStyle = L.rgba([110, 146, 98], alpha);
  c.beginPath(); c.ellipse(xs, y, R * 0.24, R, 0, 0, TAU); c.fill();
  c.fillStyle = L.rgba([6, 10, 8], alpha);
  c.beginPath(); c.ellipse(xs, y, Ri * 0.24, Ri, 0, 0, TAU); c.fill();
}

/** A small tracked tag on a dark pill. */
function tag(c, str, x, y, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  c.font = L.font(19, 700, L.FONT.body);
  c.letterSpacing = '2.5px';
  const w = c.measureText(str).width - 2.5 + 24;
  c.letterSpacing = '0px';
  c.fillStyle = 'rgba(3,8,18,0.72)';
  L.roundRect(c, x - w / 2, y - 15 + (1 - k) * 6, w, 30, 15); c.fill();
  c.fillStyle = 'rgba(225,235,248,0.95)';
  c.textBaseline = 'middle';
  L.trackedText(c, str, x, y + 1 + (1 - k) * 6, 2.5, 'center');
  c.restore();
}

// ------------------------------------------------------------------ the lens
function drawLens(c, v, tm) {
  const gt = v.gt;
  const openP = L.prog(gt, tm.open, 0.6), closeP = L.prog(gt, tm.close, 0.4);
  const open = L.ease.outBack(openP, 1.25) * (1 - L.ease.inOutCubic(closeP));   // a readable fold, not a 2-frame smear
  const linkK = L.ease.outCubic(L.prog(gt, tm.open - 0.25, 0.4)) * (1 - L.ease.inCubic(L.prog(gt, tm.close, 0.3)));
  const pinK = L.ease.outBack(L.prog(gt, tm.pin, 0.5), 1.6) * (1 - L.ease.inCubic(L.prog(gt, tm.close + 0.25, 0.3)));
  if (pinK <= 0.001 && open <= 0.001) return;
  const p = project(v, PIN.lat, PIN.lon);
  if (p.z < 0.05) return;
  // the lens travels out of the pin as it opens and back into it as it closes
  const lx = L.lerp(p.x, LENS.x, L.clamp(open)), ly = L.lerp(p.y, LENS.y, L.clamp(open));
  const R = Math.max(0, LENS.R * open);
  const r0 = 15 * Math.max(0, pinK);
  c.save();
  // pin: a ring on the cable with a slow sonar ripple
  if (pinK > 0) {
    c.strokeStyle = L.rgba([225, 238, 255], 0.9 * Math.min(1, pinK));
    c.lineWidth = 2;
    c.beginPath(); c.arc(p.x, p.y, Math.max(0, r0), 0, TAU); c.stroke();
    L.lightBlob(c, p.x, p.y, 34, ACCENT, 0.45 * Math.min(1, pinK));
    const rp = ((gt - tm.pin) / 1.4) % 1;
    if (gt > tm.pin) {
      c.strokeStyle = L.rgba(ACCENT, 0.5 * (1 - rp) * Math.min(1, pinK));
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(p.x, p.y, Math.max(0, r0 * (1 + 1.6 * rp)), 0, TAU); c.stroke();
    }
  }
  // tangent leaders from the pin ring to the lens rim
  if (linkK > 0 && R > 4) {
    const dx = lx - p.x, dy = ly - p.y, dist = Math.hypot(dx, dy);
    if (dist > R + r0 + 4) {
      const base = Math.atan2(dy, dx), off = Math.asin(L.clamp((R - r0) / dist, -1, 1));
      c.strokeStyle = L.rgba([205, 222, 248], 0.42 * linkK);
      c.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        const an = base + s * (Math.PI / 2 + off);
        const ax = p.x + Math.cos(an) * r0, ay = p.y + Math.sin(an) * r0;
        const bx = lx + Math.cos(an) * R, by = ly + Math.sin(an) * R;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(L.lerp(ax, bx, linkK), L.lerp(ay, by, linkK)); c.stroke();
      }
    }
  }
  if (R < 3) { c.restore(); return; }
  // ---- lens interior: the deep sea, at millimetre scale
  c.save();
  c.beginPath(); c.arc(lx, ly, R, 0, TAU); c.clip();
  const bg = c.createRadialGradient(lx - R * 0.3, ly - R * 0.5, R * 0.1, lx, ly, R * 1.1);
  bg.addColorStop(0, 'rgb(14,30,54)');
  bg.addColorStop(0.6, 'rgb(6,14,30)');
  bg.addColorStop(1, 'rgb(2,5,12)');
  c.fillStyle = bg;
  c.fillRect(lx - R, ly - R, 2 * R, 2 * R);
  // marine snow: slow drifting specks (two depths)
  const sr = L.rng(1515);
  for (let i = 0; i < 46; i++) {
    const depth = sr() < 0.6 ? 0.5 : 1;
    const x0 = sr() * 2 - 1, y0 = sr() * 2 - 1, sz = (0.6 + sr() * 1.2) * depth;
    const x = lx + R * (((x0 + 1 + gt * 0.012 * depth + 0.02 * L.noise1(gt * 0.4 + i, 3)) % 2) - 1);
    const y = ly + R * (((y0 + 1 + gt * 0.03 * depth) % 2) - 1);
    c.fillStyle = `rgba(190,215,240,${0.18 + 0.25 * depth * sr()})`;
    c.fillRect(x, y, sz * 1.6, sz * 1.6);
  }
  // the content scales with the lens as it opens/closes
  c.translate(lx, ly);
  c.scale(open, open);
  c.translate(-LENS.x, -LENS.y);
  const cy = LENS.y + 6;
  // cable: slides in from the left, then its layers peel back
  const cin = L.ease.outCubic(L.prog(gt, tm.cable, 0.75));
  const peel = L.prog(gt, tm.cable + 0.35, 1.0);
  const xe = LENS.x + 22 - (1 - cin) * 260;
  // hose: slides in from the right on "garden hose", settles with a small overshoot
  const hin = L.ease.outBack(L.prog(gt, tm.garden, 0.7), 1.1);
  const xs = LENS.x + 84 + (1 - hin) * 330;
  const hA = L.clamp(L.prog(gt, tm.garden, 0.25));
  // soft key light under the subjects
  L.lightBlob(c, LENS.x, cy, 210, [60, 120, 200], 0.16 * cin);
  const xPE = cin > 0 ? drawCable(c, xe, cy, peel, gt, L.clamp(cin * 1.5)) : 0;
  if (hA > 0) drawHose(c, xs, cy, hA);
  // hairlines: the cable's two edges, carried across to the hose
  const hk = L.ease.inOutCubic(L.prog(gt, tm.thick + 0.05, 0.6));
  if (hk > 0) {
    const r = (CABLE_D / 2) * MM;
    c.save();
    c.setLineDash([5, 5]);
    c.lineWidth = 1.3;
    c.strokeStyle = L.rgba([235, 242, 255], 0.55 * hk);
    const x0 = LENS.x - LENS.R + 18, x1 = L.lerp(x0, LENS.x + LENS.R - 18, hk);
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x0, cy + s * (r + 1)); c.lineTo(x1, cy + s * (r + 1)); c.stroke(); }
    c.setLineDash([]);
    // caliper ticks at the cable's cut face
    c.strokeStyle = L.rgba(ACCENT, 0.95 * hk);
    c.lineWidth = 2;
    const tx = xPE - 44;
    c.beginPath();
    c.moveTo(tx, cy - r - 1); c.lineTo(tx, cy + r + 1);
    c.moveTo(tx - 12, cy - r - 1); c.lineTo(tx + 12, cy - r - 1);
    c.moveTo(tx - 12, cy + r + 1); c.lineTo(tx + 12, cy + r + 1);
    c.stroke();
    // inward arrowheads at both caps: a dimension marker, not a stray line
    c.fillStyle = L.rgba(ACCENT, 0.95 * hk);
    c.beginPath();
    c.moveTo(tx, cy - r - 1); c.lineTo(tx - 5, cy - r + 9); c.lineTo(tx + 5, cy - r + 9); c.closePath();
    c.moveTo(tx, cy + r + 1); c.lineTo(tx - 5, cy + r - 9); c.lineTo(tx + 5, cy + r - 9); c.closePath();
    c.fill();
    c.restore();
  }
  // tags
  tag(c, 'DEEP-SEA CABLE', LENS.x - 70, cy - 108, L.ease.outCubic(L.prog(gt, tm.cable + 0.3, 0.45)));
  tag(c, 'GARDEN HOSE', LENS.x + 96, cy + 108, L.ease.outCubic(L.prog(gt, tm.garden + 0.15, 0.45)));
  c.restore();
  // ---- glass: rim, inner shadow, a specular arc
  c.save();
  const ig = c.createRadialGradient(lx, ly, R * 0.82, lx, ly, R);
  ig.addColorStop(0, 'rgba(0,0,0,0)');
  ig.addColorStop(1, 'rgba(0,4,12,0.55)');
  c.fillStyle = ig;
  c.beginPath(); c.arc(lx, ly, R, 0, TAU); c.fill();
  c.strokeStyle = L.rgba(ACCENT, 0.28);
  c.lineWidth = 9;
  c.beginPath(); c.arc(lx, ly, R + 6, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(226,236,252,0.9)';
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(lx, ly, R, 0, TAU); c.stroke();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = 'rgba(200,225,255,0.22)';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath(); c.arc(lx, ly, Math.max(0, R - 10), Math.PI * 1.08, Math.PI * 1.42); c.stroke();
  c.restore();
  c.restore();
}

/** 18c: the lens's fold-back after this beat ends (s.end -> s.end + 0.47), drawn by the next 18c beat's scene (the
 *  engine stops calling this beat's overlay at its end, which popped the lens off in one frame). v = this beat's view. */
export function lensTail(ctx, v) {
  const tm = times(v.tl);
  if (v.gt < v.tl.scenes[15].end) return;
  drawLens(ctx, v, tm);
}

export default {
  beat: 15,
  chapter: { num: '15', title: 'The deep sea', sub: 'How thick is a cable?' },
  captions: true,
  layer: 6,
  // beat starts 64.92: pin 65.91 (t 0.99) · lens 66.61 (1.69) · cable 66.86 (1.94) · "thick" 67.57 (2.65)
  // · hose 67.91 (2.99) · lens folds 69.53 (4.60)
  cues(d) {
    return [
      { t: 0.99, name: 'blip', gain: 0.22, pitch: 0.9 },
      { t: 1.45, name: 'riser', gain: 0.12, pitch: 1.3 },
      { t: 1.69, name: 'bloom', gain: 0.3, pitch: 1.0 },
      { t: 1.72, name: 'swish', gain: 0.2, pitch: 1.2 },
      { t: 2.3, name: 'tick', gain: 0.16, pitch: 1.5 },
      { t: 2.45, name: 'tick', gain: 0.14, pitch: 1.7 },
      { t: 2.65, name: 'ping', gain: 0.26, pitch: 1.15 },
      { t: 2.99, name: 'swish', gain: 0.26, pitch: 0.85 },
      { t: Math.min(d - 0.05, 4.6), name: 'swish', gain: 0.14, pitch: 1.4 },
    ];
  },
  drawWorld() {},
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    drawLens(ctx, v, tm);
    const lk = L.prog(v.gt, tm.thick, 0.55) * v.k;
    L.bigLabel(ctx, { x: 96, y: 470, big: '≈ 2 cm', small: '0.8 in thick', k: lk, accent: ACCENT });
  },
};
