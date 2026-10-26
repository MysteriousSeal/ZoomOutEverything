// Beat 8 — the other side. On the globe, a target ring marks the far end of the tunnel while the faller coasts up to
// it. At 38.0 s they arrive with zero speed: the ring flashes and a magnifier opens on the antipode (the South Pole):
// the person coasts up out of the shaft head first, "upside down" to us, and braces on the ice at the mouth. On "twelve thousand seven hundred kilometers" a dimension bracket draws
// out along the tunnel from the centre to both ends: "≈ 12,700 km" / "7,900 mi · straight through" (as voiced).
// On "you fall straight back in" (s09) they let go and drop back down the shaft.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, ARRIVE, FALL_BACK, OFF } from '../camera.js';
import { plate } from './s04-inner-core.js';

const COOL = [215, 232, 255];
const TARGET = 0.45;              // beat-local: target ring on "the other side"
const BRACKET = 3.35;             // bracket draws out on "twelve thousand..."
const LABEL = 3.65;

// ------------------------------------------------------------------ the person in the magnifier
// A standing adult (1.75 m), front view, in metres: x right, y DOWN from the crown. Same build as 07b's rebuilt figure
// (torso with neck + trapezius, legs, head, ears, short hair), with the arms posed from joints: hanging, bracing on
// the rim of the hole, or flung up as they drop back in. Dark clothes with a cool rim light (the faller's colour).
function tube(J, R) {
  const A = [], B = [];
  for (let i = 0; i < J.length; i++) {
    const a = J[Math.max(0, i - 1)], b = J[Math.min(J.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const nx = -dy, ny = dx;
    A.push([J[i][0] + nx * R[i], J[i][1] + ny * R[i]]);
    B.push([J[i][0] - nx * R[i], J[i][1] - ny * R[i]]);
  }
  // round caps at both ends (a few points on the half circles), so the parts join without notches
  const cap = (c, p, q, r) => {
    const out = [];
    const a0 = Math.atan2(p[1] - c[1], p[0] - c[0]);
    let a1 = Math.atan2(q[1] - c[1], q[0] - c[0]);
    if (a1 < a0) a1 += Math.PI * 2;
    for (let k = 1; k < 4; k++) { const an = a0 + (a1 - a0) * k / 4; out.push([c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r]); }
    return out;
  };
  const n = J.length - 1;
  return [...A, ...cap(J[n], A[n], B[n], R[n]), ...B.reverse(), ...cap(J[0], B[B.length - 1], A[0], R[0])];
}
const mirrorX = (pts) => pts.map(([x, y]) => [-x, y]);
const TORSO = [
  [0.045, 0.2], [0.047, 0.238], [0.055, 0.262], [0.086, 0.277], [0.13, 0.289], [0.17, 0.298], [0.19, 0.314],
  [0.18, 0.362], [0.16, 0.405], [0.153, 0.462], [0.144, 0.53], [0.13, 0.6], [0.133, 0.656], [0.149, 0.72],
  [0.158, 0.79], [0.156, 0.866], [0.12, 0.93], [0.04, 0.958], [0.0, 0.962],
  [-0.04, 0.955], [-0.125, 0.918], [-0.17, 0.842], [-0.171, 0.776], [-0.153, 0.704], [-0.124, 0.622],
  [-0.13, 0.566], [-0.144, 0.53], [-0.153, 0.466], [-0.16, 0.416], [-0.18, 0.374], [-0.19, 0.326],
  [-0.17, 0.311], [-0.13, 0.3], [-0.086, 0.285], [-0.055, 0.266], [-0.047, 0.24], [-0.045, 0.2],
];
const LEG_L = tube([[-0.085, 0.86], [-0.08, 1.07], [-0.072, 1.27], [-0.066, 1.52], [-0.062, 1.7]], [0.083, 0.072, 0.05, 0.045, 0.03]);
const LEG_R = tube([[0.085, 0.86], [0.08, 1.07], [0.072, 1.27], [0.066, 1.52], [0.062, 1.7]], [0.083, 0.072, 0.05, 0.045, 0.03]);
const HEAD = [
  [0, 0], [0.04, 0.006], [0.064, 0.026], [0.076, 0.058], [0.078, 0.095], [0.074, 0.13], [0.07, 0.158], [0.062, 0.182],
  [0.046, 0.206], [0.024, 0.226], [0, 0.231], [-0.024, 0.226], [-0.046, 0.206], [-0.062, 0.182], [-0.07, 0.158],
  [-0.074, 0.13], [-0.078, 0.095], [-0.076, 0.058], [-0.064, 0.026], [-0.04, 0.006],
];
const EAR = [[0.068, 0.108], [0.08, 0.104], [0.088, 0.118], [0.087, 0.142], [0.081, 0.162], [0.07, 0.168]];
const HAIR = [
  [-0.078, 0.106], [-0.082, 0.072], [-0.077, 0.036], [-0.058, 0.009], [-0.03, -0.006], [0.006, -0.011], [0.042, -0.005],
  [0.068, 0.014], [0.082, 0.046], [0.083, 0.08], [0.079, 0.108], [0.073, 0.106], [0.07, 0.08], [0.064, 0.06],
  [0.044, 0.05], [0.016, 0.047], [-0.012, 0.05], [-0.036, 0.056], [-0.058, 0.064], [-0.07, 0.08], [-0.073, 0.106],
];
// arm poses for the viewer's-left arm (the other is mirrored): shoulder, elbow, wrist, fingertips
const ARM = {
  hang: [[-0.15, 0.33], [-0.212, 0.57], [-0.226, 0.84], [-0.232, 1.02]],
  brace: [[-0.15, 0.33], [-0.425, 0.49], [-0.6, 0.705], [-0.76, 0.75]],    // hands flat on the rim, elbows out
  up: [[-0.15, 0.33], [-0.25, 0.02], [-0.27, -0.25], [-0.28, -0.43]],      // flung up as they drop back in
};
const ARM_R = [0.06, 0.05, 0.038, 0.04, 0.028, 0.032, 0.022];
const lerpP = (a, b, k) => [L.lerp(a[0], b[0], k), L.lerp(a[1], b[1], k)];
function armPts(brace, up) {
  const j = ARM.hang.map((p, i) => lerpP(lerpP(p, ARM.brace[i], brace), ARM.up[i], up));
  const [S, E, Wr, F] = j;
  // shoulder, mid upper arm, elbow, mid forearm, wrist, palm, fingertips
  return tube([S, lerpP(S, E, 0.5), E, lerpP(E, Wr, 0.5), Wr, lerpP(Wr, F, 0.45), F], ARM_R);
}
function partPath(p, pts) {
  const n = pts.length;
  const X = (i) => pts[(i + n) % n][0], Y = (i) => pts[(i + n) % n][1];
  p.moveTo((X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2);
  for (let i = 1; i <= n; i++) p.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
  p.closePath();
}
const wind = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s < 0 ? pts.slice().reverse() : pts; };
const BODY_PARTS = [LEG_L, LEG_R, TORSO, EAR, mirrorX(EAR), HEAD].map(wind);
/** Person in figure metres (the caller has set the transform): pose {brace, up}; lw = 1 screen px in metres. */
function drawPersonM(ctx, brace, up, lw) {
  const all = new Path2D();
  for (const pt of [...BODY_PARTS, wind(armPts(brace, up)), wind(mirrorX(armPts(brace, up))), wind(HAIR)]) partPath(all, pt);
  ctx.save();
  ctx.lineJoin = 'round';
  // rim: the outline stroked under the fill (only its outer half shows) + a key-light crescent from the sky side
  ctx.strokeStyle = 'rgba(205,225,255,0.75)';
  ctx.lineWidth = 2.6 * lw;
  ctx.shadowColor = 'rgba(160,200,255,0.8)'; ctx.shadowBlur = 6;
  ctx.stroke(all);
  ctx.shadowBlur = 0;
  // body: dark winter clothes, a touch lighter toward the snow glare overhead (figure y large = near the ground)
  const g = ctx.createLinearGradient(0, 0, 0, 1);
  g.addColorStop(0, 'rgb(22,26,38)'); g.addColorStop(1, 'rgb(44,52,70)');
  ctx.fillStyle = g;
  ctx.fill(all);
  // face and hands catch a little light; a faint parting line between the arms and the chest
  ctx.strokeStyle = 'rgba(2,4,10,0.55)';
  ctx.lineWidth = 1.2 * lw;
  ctx.beginPath(); ctx.moveTo(-0.15, 0.36); ctx.quadraticCurveTo(0, 0.4, 0.15, 0.36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.04, 0.214); ctx.quadraticCurveTo(0, 0.236, 0.04, 0.214); ctx.stroke();
  ctx.restore();
}

/** Magnifier inset (screen px) beside the antipode (ax, ay): the bottom of the planet seen up close. We're under the
 *  South Pole: the ice sheet is overhead, the polar sky below. The person coasts up out of the lined shaft head first,
 *  comes to rest with their waist at the mouth, braces both hands on the ice, and lets go as they fall back in.
 *  k = inset open 0..1; p = { rise 0..1, brace 0..1, up 0..1, sink (m) }. */
function inset(ctx, v, ax, ay, k, p) {
  if (k <= 0.01) return;
  const R = 112, ix = ax + 246, iy = ay - 36;
  const e = L.clamp(k);
  const cx = L.lerp(ax, ix, e), cy = L.lerp(ay, iy, e), r = R * e;
  const PX = 100;                      // inset scale: px per metre (a 1.75 m person ≈ 175 px)
  const GY = -46;                      // the ice surface (overhead), inset px
  const HW = 0.6 * PX;                 // the 1.2 m shaft (env TUNNEL_HW)
  ctx.save();
  // leader from the antipode to the lens
  ctx.globalAlpha *= L.clamp(k * 1.5);
  const an = Math.atan2(cy - ay, cx - ax);
  ctx.strokeStyle = 'rgba(225,236,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(ax, ay, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax + Math.cos(an) * 9, ay + Math.sin(an) * 9); ctx.lineTo(cx - Math.cos(an) * r, cy - Math.sin(an) * r); ctx.stroke();
  // the lens
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgb(14,18,34)';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - 1), 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, cy); ctx.scale(e, e);
  // polar twilight sky (below us), brightening toward the ice horizon overhead
  const sg = ctx.createLinearGradient(0, R, 0, GY);
  sg.addColorStop(0, 'rgb(10,16,34)'); sg.addColorStop(0.7, 'rgb(46,64,98)'); sg.addColorStop(1, 'rgb(96,120,156)');
  ctx.fillStyle = sg; ctx.fillRect(-R, GY, 2 * R, R - GY);
  // the person (clipped to the open air: inside the shaft they are hidden by the ice and the dark)
  if (p.rise > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-R, GY, 2 * R, R - GY + 2); ctx.clip();
    const G0 = 0.74;                                   // figure y (m below the crown) level with the ice at rest: the waist
    const off = (1 - p.rise) * 1.9 + p.sink;           // metres back down the shaft (towards the ice, i.e. up the screen)
    ctx.translate(0, GY);
    ctx.scale(-PX, -PX);                               // upside down to us (rotated 180°), metres
    ctx.translate(0, -G0 + off);
    drawPersonM(ctx, p.brace, p.up, 1 / (PX * e));
    ctx.restore();
  }
  // the ice sheet overhead: snow skin at the surface, blue glacial ice deeper, faint strata
  const ig = ctx.createLinearGradient(0, GY, 0, -R);
  ig.addColorStop(0, 'rgb(226,236,248)'); ig.addColorStop(0.18, 'rgb(196,214,234)'); ig.addColorStop(1, 'rgb(120,152,190)');
  ctx.fillStyle = ig;
  ctx.fillRect(-R, -R, R - HW, R + GY);
  ctx.fillRect(HW, -R, R - HW, R + GY);
  ctx.strokeStyle = 'rgba(90,120,160,0.35)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const y = GY - 12 * i - i * i * 2;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * (HW + 2), y); ctx.lineTo(s * R, y + s * 1.5); ctx.stroke(); }
  }
  // the bright snow line at the surface, and a soft drift lip at the mouth
  ctx.fillStyle = 'rgb(246,250,255)';
  ctx.fillRect(-R, GY - 3, R - HW, 3);
  ctx.fillRect(HW, GY - 3, R - HW, 3);
  // the shaft: a lined bore through the ice, dark inside, with lit lining edges
  const shg = ctx.createLinearGradient(0, GY, 0, -R);
  shg.addColorStop(0, 'rgb(20,26,38)'); shg.addColorStop(0.35, 'rgb(6,8,14)'); shg.addColorStop(1, 'rgb(3,4,8)');
  ctx.fillStyle = shg;
  ctx.fillRect(-HW, -R, 2 * HW, R + GY);
  ctx.fillStyle = 'rgb(150,160,176)';
  ctx.fillRect(-HW - 4, -R, 4, R + GY); ctx.fillRect(HW, -R, 4, R + GY);
  ctx.fillStyle = 'rgba(235,242,255,0.6)';
  ctx.fillRect(-HW - 1, -R, 1, R + GY); ctx.fillRect(HW, -R, 1, R + GY);
  ctx.restore();
  // lens rim
  ctx.strokeStyle = 'rgba(225,236,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** Dimension bracket along x, from y0 to y1, drawn out from the middle (k 0..1). */
function bracket(ctx, x, y0, y1, k, col) {
  if (k <= 0) return;
  const e = L.ease.inOutCubic(L.clamp(k));
  const mid = (y0 + y1) / 2, a = L.lerp(mid, y0, e), b = L.lerp(mid, y1, e);
  ctx.save();
  ctx.strokeStyle = L.rgba(col, 0.95);
  ctx.fillStyle = L.rgba(col, 0.95);
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(x, a); ctx.lineTo(x, b); ctx.stroke();
  const cap = L.clamp((k - 0.75) / 0.25);
  if (cap > 0) {
    for (const [yy, s] of [[a, -1], [b, 1]]) {
      ctx.globalAlpha = cap;
      ctx.beginPath(); ctx.moveTo(x - 12, yy); ctx.lineTo(x + 12, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - 5, yy - s * 10); ctx.lineTo(x + 5, yy - s * 10); ctx.closePath(); ctx.fill();
    }
  }
  // leading sparks while drawing
  if (k < 1) {
    ctx.globalAlpha = 1;
    L.lightBlob(ctx, x, a, 26, col, 0.6);
    L.lightBlob(ctx, x, b, 26, col, 0.6);
  }
  ctx.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'The other side', sub: 'Straight through the planet' },
  captions: true,
  layer: 2,
  cues(d) {
    const arr = ARRIVE - (35.07 + OFF);
    return [
      { t: TARGET, name: 'sonar', gain: 0.18, pitch: 1.2 },
      { t: arr - 0.6, name: 'riser', gain: 0.2, pitch: 1.2 },
      { t: arr, name: 'bloom', gain: 0.4, pitch: 1.0 },
      { t: arr + 0.12, name: 'blip', gain: 0.3, pitch: 1.4 },
      { t: BRACKET, name: 'swish', gain: 0.3, pitch: 1.1 },
      { t: LABEL, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: LABEL + 0.05, name: 'shimmer', gain: 0.2, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    const s8 = v.tl.scenes[8].start;
    if (v.gt < s8 || v.gt > FALL_BACK.start + 0.8) return;
    const t = v.t;
    const x = v.wx(0), y = v.wy(2 * R_EARTH);
    const age = v.gt - ARRIVE;
    // target ring at the far end
    const tk = L.ease.outCubic(L.prog(t, TARGET, 0.6)) * (1 - L.prog(v.gt, ARRIVE + 0.6, 0.6));
    if (tk > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(225,236,255,${0.8 * tk})`;
      ctx.lineWidth = 1.5;
      const r = 20 + 10 * (1 - tk) + 2 * Math.sin(v.gt * 4);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const an = i * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * (r + 5), y + Math.sin(an) * (r + 5)); ctx.lineTo(x + Math.cos(an) * (r + 13), y + Math.sin(an) * (r + 13)); ctx.stroke();
      }
      ctx.restore();
    }
    if (age < -0.05) return;
    // arrival: flash + ring
    const a = Math.max(0, age);
    const f = Math.exp(-a * 2.2) * L.clamp((age + 0.05) / 0.05);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    L.lightBlob(ctx, x, y, 150, [190, 215, 255], 0.55 * f);
    const rp = L.ease.outCubic(L.clamp(a / 1.4));
    ctx.strokeStyle = `rgba(215,232,255,${0.7 * (1 - rp)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 20 + 110 * rp), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // At globe scale a person is far below a pixel, so a magnifier inset grows out of the antipode to show them.
    // the person coasts up out of the shaft head first and comes to rest (zero speed) with the waist at the mouth,
    // braces both hands on the ice; on "you fall straight back in" they let go and drop back down the shaft (g)
    const tGo = FALL_BACK.start - 0.12;
    const pose = {
      rise: L.ease.outCubic(L.prog(age, 0.1, 0.75)),
      brace: L.ease.inOutCubic(L.prog(age, 0.7, 0.45)),
      up: L.ease.inOutCubic(L.prog(v.gt, tGo, 0.28)),
      sink: 0.5 * 9.81 * Math.max(0, v.gt - tGo) ** 2,
    };
    const ik = L.ease.outCubic(L.prog(age, 0.05, 0.5)) * (1 - L.ease.inCubic(L.prog(v.gt, FALL_BACK.start + 0.42, 0.35)));
    inset(ctx, v, x, y, ik, pose);
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const bk = L.prog(t, BRACKET, 0.8) * v.k;
    if (bk <= 0) return;
    // the dimension runs ON the tunnel (the tunnel is the 12,742 km); the plate sits off the core, upper left, with a
    // leader to the tunnel
    const x = v.wx(0), y0 = v.wy(0), y1 = v.wy(2 * R_EARTH);
    bracket(ctx, x, y0, y1, bk, v.accent);
    const cy = Math.max(436, y0 + 118);
    const k = L.enter(t, LABEL, 0.55) * v.k;
    if (k <= 0) return;
    const BIG = 72, BIGT = '≈ 12,700 km', SUB = ['7,900 MI', 'STRAIGHT THROUGH'];
    ctx.save();
    ctx.font = L.font(BIG, 800, L.FONT.display);
    ctx.letterSpacing = '-1px';
    const bigW = ctx.measureText(BIGT).width;
    ctx.font = L.font(21, 700, L.FONT.body);
    ctx.letterSpacing = '2px';
    const subW = Math.max(...SUB.map((l) => ctx.measureText(l).width));
    ctx.restore();
    const pw = Math.ceil(Math.max(bigW, subW) + 60), ph = 214;
    const px = 40;
    // a short leader from the bracket's middle to the plate
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.fillStyle = L.rgba(v.accent, 0.9);
    const lw = (x - (px + pw)) * L.ease.outCubic(k);
    ctx.fillRect(x - lw, cy - 1, lw, 2);
    ctx.restore();
    const sx = px - (1 - L.ease.outCubic(k)) * 20;
    plate(ctx, sx, cy - 100, pw, ph, k);
    L.bigLabel(ctx, { x: sx + 30, y: cy + 26, big: BIGT, small: '', k, accent: v.accent, size: BIG });
    ctx.save();
    ctx.globalAlpha *= L.clamp(k * 1.4);
    ctx.font = L.font(21, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,230,240,0.92)';
    ctx.textBaseline = 'alphabetic';
    const dy = (1 - L.ease.outCubic(k)) * 12;
    L.trackedText(ctx, SUB[0], sx + 30, cy + 66 + dy, 2);
    ctx.fillStyle = 'rgba(225,230,240,0.7)';
    L.trackedText(ctx, SUB[1], sx + 30, cy + 96 + dy, 2);
    ctx.restore();
  },
};
