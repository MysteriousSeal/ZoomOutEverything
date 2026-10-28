// Beat 5 — "So space agencies use it as a graveyard. | Hundreds of old spacecraft lie on the seabed, | including the
// Russian space station Mir."
// Phase A (shot 'cemetery', r 900): a dashed zone around Point Nemo (stylised, SPACECRAFT CEMETERY on "graveyard");
// controlled re-entries streak in from the north-west and break up into the zone (fiery heads, fragmenting tails). The
// counter 260+ SPACECRAFT · SINCE 1971 counts up (≈ 1 s, eased, fixed cells) and lands on "Hundreds".
// The dive (shot 'dive', phrase 1 − 0.55 s): the camera plunges into the water at Nemo; the seabed scene fades over it
// (env uwK) and the camera sinks: marine snow rushes up, the seabed rises into frame (≈ 3.7 km down, chip on "seabed").
// Wrecks: refined silhouettes in depth layers (see drawSeabed). Mir broke up on re-entry, so it is shown as scattered
// fragments: card RUSSIAN STATION / MOSTLY BURNED UP ON RE-ENTRY on "Russian", MIR · 2001 / FRAGMENTS OF A ≈ 130-TONNE
// STATION landing ON "Mir", with leaders to three fragments.
// The seabed scene stays up until the rise in beat 6 (env uwK).
import * as L from '../../../../engine/runtime/lib.js';
import {
  ACCENT, INKW, GREYT, FIRE, FACTS, NEMO, geo, geoTrace, smallCircle, dest, word, uwK, mapLabel, scrim, plate, tw,
  cellText, countAt, gq, B, PH, WD, globe,
} from '../env.js';
import { project } from '../../../../engine/runtime/earth.js';

const { W, H } = L;
const ZONE_DEG = 9;

// ------------------------------------------------------------------ re-entry streaks (deterministic)
const STREAKS = (() => {
  const r = L.rng(505), out = [];
  for (let i = 0; i < 18; i++) {
    const tgt = dest(NEMO.lat, NEMO.lon, r() * 360, Math.sqrt(r()) * ZONE_DEG * 0.85);
    const ent = dest(tgt[0], tgt[1], 292 + (r() - 0.5) * 36, 16 + r() * 8);
    out.push({ tgt, ent, t: i / 18, dur: 0.75 + r() * 0.35, frag: 3 + Math.floor(r() * 3), seed: Math.floor(r() * 1e6) });
  }
  return out;
})();
/** point along a streak at s (0..1): great-circle interpolation, altitude falling (fraction of r) */
function streakPt(g, st, s) {
  const lat = L.lerp(st.ent[0], st.tgt[0], s);
  let dl = st.tgt[1] - st.ent[1]; dl = ((dl + 540) % 360) - 180;
  const lon = st.ent[1] + dl * s;
  return project(lat, lon, g, 0.05 * (1 - s) ** 1.6);
}

// ------------------------------------------------------------------ the seabed scene (screen space)
// Depth layers (settled seabed line ≈ y 1150): a hazy distant ridge, a far row, the main row (scattered Mir fragments
// among cargo ships, tanks, engines, trusses), a sediment plane with ripples and speckle, a scatter of small half-buried
// debris across the plane, and a near foreground (y ≈ 1550–1800) of large, dark, half-buried pieces with a soft rim light.
// Mir broke up on re-entry: only ≈ 20–25 t of fragments reached the sea, scattered over ≈ 1,500 km. So: fragments.
const SNOW = (() => { const r = L.rng(77), out = []; for (let i = 0; i < 260; i++) out.push({ x: r() * W, y: r() * H, s: 0.8 + r() * 2.2, d: 0.3 + r() * 0.7, ph: r() * 6.28 }); return out; })();
const SNOW_NEAR = (() => { const r = L.rng(78), out = []; for (let i = 0; i < 26; i++) out.push({ x: r() * W, y: r() * H, s: 3 + r() * 4, d: 0.9 + r() * 0.6, ph: r() * 6.28 }); return out; })();
export const BASE_SET = 1150;

function terrainY(x, base) {
  return base + 26 * L.noise1(x / 260, 3) + 10 * L.noise1(x / 70, 4) + 3 * L.noise1(x / 18, 5);
}
/** descent progress (0 at the dive, 1 = settled on the seabed) */
const descentK = (gt, tl) => L.prog(gt, PH(5, 1, 'start', -0.15)(tl), 1.7);
export const seabedBase = (gt, tl) => L.lerp(2400, BASE_SET, L.ease.outCubic(descentK(gt, tl))) - 14 * L.prog(gt, PH(5, 1, 'start', 1.6)(tl), 7);
/** the near foreground rises faster than the main row (parallax) */
const nearBase = (base) => BASE_SET + 560 + (base - BASE_SET) * 1.5;

// tone: 1 = main row, < 1 darker (near foreground), haze handled by layer alpha
let TONE = 1, RIMK = 1;
const tc = (r, g, b, a) => `rgba(${Math.round(r * TONE)},${Math.round(g * TONE)},${Math.round(b * TONE)},${a})`;
/** rim-lit silhouette fill */
function wreckFill(c, x0, y0, x1, y1, a = 1) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, tc(78, 98, 118, a)); g.addColorStop(0.35, tc(44, 58, 74, a)); g.addColorStop(1, tc(16, 22, 32, a));
  return g;
}
function rim(c, a) { c.strokeStyle = `rgba(150,215,240,${0.55 * a * RIMK})`; c.lineWidth = 1.6; }

/** a torn section of a pressurised hull (cylinder): jagged at both ends, ring frames, a torn plate, a buckled flank */
function drawHullFrag(c, x, y, len, rad, ang, a = 1, seed = 1) {
  c.save();
  c.translate(x, y); c.rotate(ang);
  const r = L.rng(seed);
  const top = [], bot = [];
  // top edge (slightly buckled), right jagged end, bottom edge, left jagged end
  c.beginPath();
  c.moveTo(-len / 2, -rad);
  for (let k = 1; k <= 6; k++) { const xx = -len / 2 + (k * len) / 6; const yy = -rad + (k > 1 && k < 6 ? (r() - 0.5) * rad * 0.12 : 0); c.lineTo(xx, yy); top.push([xx, yy]); }
  let yy = -rad;
  while (yy < rad) { yy = Math.min(rad, yy + rad * (0.18 + r() * 0.22)); c.lineTo(len / 2 + (r() - 0.4) * rad * 0.5, yy); }
  c.lineTo(-len / 2, rad);
  yy = rad;
  while (yy > -rad) { yy = Math.max(-rad, yy - rad * (0.18 + r() * 0.22)); c.lineTo(-len / 2 + (r() - 0.6) * rad * 0.5, yy); }
  c.closePath();
  c.fillStyle = wreckFill(c, 0, -rad, 0, rad, a);
  c.fill();
  rim(c, a);
  c.beginPath(); c.moveTo(-len / 2, -rad); top.forEach(([px, py]) => c.lineTo(px, py)); c.stroke();
  // ring frames
  c.strokeStyle = tc(10, 15, 22, 0.8 * a); c.lineWidth = Math.max(1.2, rad * 0.05);
  const nf = Math.max(2, Math.round(len / (rad * 1.3)));
  for (let k = 1; k < nf; k++) { const xx = -len / 2 + (k * len) / nf; c.beginPath(); c.moveTo(xx, -rad * 0.96); c.lineTo(xx, rad); c.stroke(); }
  // a torn hole + a peeled plate
  c.fillStyle = tc(6, 9, 14, 0.92 * a);
  const hx = (r() - 0.5) * len * 0.4;
  c.beginPath(); c.moveTo(hx, -rad * 0.3); c.lineTo(hx + rad * 0.5, -rad * 0.55); c.lineTo(hx + rad * 0.7, rad * 0.05); c.lineTo(hx + rad * 0.2, rad * 0.3); c.closePath(); c.fill();
  c.fillStyle = wreckFill(c, 0, -rad * 1.5, 0, 0, a);
  c.beginPath(); c.moveTo(hx + rad * 0.5, -rad * 0.55); c.lineTo(hx + rad * 0.95, -rad * 1.25); c.lineTo(hx + rad * 1.15, -rad * 1.1); c.lineTo(hx + rad * 0.7, -rad * 0.4); c.closePath(); c.fill();
  rim(c, a); c.beginPath(); c.moveTo(hx + rad * 0.5, -rad * 0.55); c.lineTo(hx + rad * 0.95, -rad * 1.25); c.stroke();
  c.restore();
}
/** a bent solar-array / radiator frame: two lattice segments with a kink, one end in the sediment */
function drawArrayFrame(c, x, y, len, ang, a = 1, kink = -0.7) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const seg = (L0) => {
    c.strokeStyle = tc(74, 94, 114, a); c.lineWidth = 3;
    c.strokeRect(0, -14, L0, 28);
    c.lineWidth = 1.2;
    c.beginPath(); for (let k = 1; k < 6; k++) { const xx = (k * L0) / 6; c.moveTo(xx, -14); c.lineTo(xx + (k % 2 ? 4 : -3), 14); } c.stroke();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(L0, 0); c.stroke();
    rim(c, a); c.beginPath(); c.moveTo(0, -14); c.lineTo(L0, -14); c.stroke();
  };
  seg(len * 0.55);
  c.translate(len * 0.55, 0); c.rotate(kink);
  seg(len * 0.45);
  c.restore();
}
/** a flat panel (honeycomb skin) stuck in the sediment at an angle */
function drawPanel(c, x, y, w, h, ang, a = 1) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = wreckFill(c, 0, -h, 0, 0, a);
  c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w / 2 + w * 0.06, -h); c.lineTo(w / 2 - w * 0.1, -h * 0.94); c.lineTo(w / 2 - w * 0.02, -h * 0.55); c.lineTo(w / 2, 0); c.closePath(); c.fill();
  c.strokeStyle = tc(12, 18, 26, 0.6 * a); c.lineWidth = 1.5;
  c.beginPath();
  for (let k = 1; k < 7; k++) { const xx = -w / 2 + (k * w) / 7; c.moveTo(xx, -h * 0.95); c.lineTo(xx, 0); }
  for (let k = 1; k < 4; k++) { const yy = -(k * h) / 4; c.moveTo(-w / 2 + 4, yy); c.lineTo(w / 2 - 6, yy); }
  c.stroke();
  rim(c, a); c.beginPath(); c.moveTo(-w / 2 + w * 0.06, -h); c.lineTo(w / 2 - w * 0.1, -h * 0.94); c.lineTo(w / 2 - w * 0.02, -h * 0.55); c.stroke();
  c.restore();
}
/** Progress-type cargo ship: cargo module cylinder, tapered propellant section, service module with an engine skirt */
function drawProgress(c, x, y, s, ang, a = 1) {
  c.save();
  c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.fillStyle = wreckFill(c, 0, -30, 0, 30, a);
  c.beginPath();
  c.moveTo(-90, -22); c.lineTo(-20, -22); c.lineTo(0, -15); c.lineTo(20, -15); c.lineTo(30, -24); c.lineTo(80, -24);
  c.lineTo(80, 24); c.lineTo(30, 24); c.lineTo(20, 15); c.lineTo(0, 15); c.lineTo(-20, 22); c.lineTo(-90, 22);
  c.quadraticCurveTo(-104, 0, -90, -22); c.closePath(); c.fill();
  rim(c, a); c.beginPath(); c.moveTo(-90, -22); c.lineTo(-20, -22); c.lineTo(0, -15); c.lineTo(20, -15); c.lineTo(30, -24); c.lineTo(80, -24); c.stroke();
  c.strokeStyle = tc(12, 18, 26, 0.8 * a); c.lineWidth = 1.5;
  for (const xx of [-60, -35, 45, 62]) { c.beginPath(); c.moveTo(xx, -22); c.lineTo(xx, 22); c.stroke(); }
  c.strokeStyle = tc(70, 90, 110, a); c.lineWidth = 3;
  c.beginPath(); c.moveTo(-100, 0); c.lineTo(-118, 0); c.stroke();
  c.fillStyle = wreckFill(c, 0, -20, 0, 20, a);
  c.beginPath(); c.moveTo(80, -14); c.lineTo(94, -20); c.lineTo(94, 20); c.lineTo(80, 14); c.closePath(); c.fill();
  c.strokeStyle = tc(70, 90, 110, a); c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(50, -24); c.lineTo(62, -58); c.lineTo(78, -66); c.stroke();
  c.restore();
}
function drawSphere(c, x, y, r, a = 1) {
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r);
  g.addColorStop(0, tc(96, 118, 138, a)); g.addColorStop(0.5, tc(40, 54, 70, a)); g.addColorStop(1, tc(12, 18, 26, a));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fill();
  c.strokeStyle = tc(12, 18, 26, 0.7 * a); c.lineWidth = Math.max(2, r * 0.03);
  c.beginPath(); c.ellipse(x, y, r, r * 0.22, 0, 0, Math.PI * 2); c.stroke();
  rim(c, a); c.beginPath(); c.arc(x, y, Math.max(0, r - 1), Math.PI * 1.1, Math.PI * 1.75); c.stroke();
}
function drawNozzle(c, x, y, s, ang, a = 1) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.fillStyle = wreckFill(c, 0, -30, 0, 30, a);
  c.beginPath(); c.moveTo(-30, -9); c.lineTo(-10, -9); c.quadraticCurveTo(20, -14, 40, -32); c.lineTo(40, 32); c.quadraticCurveTo(20, 14, -10, 9); c.lineTo(-30, 9); c.closePath(); c.fill();
  c.fillStyle = tc(6, 9, 14, 0.95 * a);
  c.beginPath(); c.ellipse(40, 0, 7, 32, 0, 0, Math.PI * 2); c.fill();
  rim(c, a); c.beginPath(); c.moveTo(-30, -9); c.lineTo(-10, -9); c.quadraticCurveTo(20, -14, 40, -32); c.stroke();
  c.restore();
}
function drawTruss(c, x, y, len, ang, a = 1, h = 18) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.strokeStyle = tc(74, 94, 114, a); c.lineWidth = Math.max(2.4, h * 0.13);
  c.strokeRect(-len / 2, -h / 2, len, h);
  c.lineWidth = Math.max(1.4, h * 0.08);
  const n = Math.max(4, Math.round(len / (h * 1.1)));
  c.beginPath(); for (let k = 0; k < n; k++) { const x0 = -len / 2 + (k * len) / n; c.moveTo(x0, -h / 2); c.lineTo(x0 + len / n, h / 2); c.moveTo(x0 + len / n, -h / 2); c.lineTo(x0 + len / n, h / 2); } c.stroke();
  rim(c, a); c.beginPath(); c.moveTo(-len / 2, -h / 2); c.lineTo(len / 2, -h / 2); c.stroke();
  c.restore();
}

/** sediment colour at screen y for a seabed whose line is at `base` (the mounds over buried bottoms match it) */
function sedRGB(y, base) {
  const f = L.clamp((y - base) / (H - base + 1));
  const A = [40, 54, 66], B_ = [26, 38, 50], C = [9, 14, 22];
  return f < 0.12 ? L.mix(A, B_, f / 0.12) : L.mix(B_, C, (f - 0.12) / 0.88);
}
const rgb = (q, a = 1) => `rgba(${q[0] | 0},${q[1] | 0},${q[2] | 0},${a})`;
/** a soft sediment mound hiding the bottom of an object at (x, y), width w */
function mound(c, x, y, w, base, h = w * 0.16) {
  const col = sedRGB(y, base);
  c.fillStyle = rgb(col);
  c.beginPath();
  c.moveTo(x - w / 2 - h, y + h * 0.6);
  c.bezierCurveTo(x - w / 2, y - h * 0.6, x + w / 2, y - h * 0.7, x + w / 2 + h, y + h * 0.6);
  c.lineTo(x + w / 2 + h, y + h * 1.4); c.lineTo(x - w / 2 - h, y + h * 1.4);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(120,170,195,0.14)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(x - w / 2 - h * 0.6, y + h * 0.3); c.bezierCurveTo(x - w / 2, y - h * 0.55, x + w / 2, y - h * 0.65, x + w / 2 + h * 0.6, y + h * 0.3); c.stroke();
}

// small debris scattered across the sediment plane (deterministic): f = depth fraction down the plane
const SCATTER = (() => {
  const r = L.rng(4401), out = [];
  for (let i = 0; i < 46; i++) out.push({ x: r() * W, f: 0.03 + 0.42 * Math.pow(r(), 1.3), type: Math.floor(r() * 4), ang: (r() - 0.5) * 1.2, s: 0.7 + r() * 0.6, seed: Math.floor(r() * 1e6) });
  return out.sort((a, b) => a.f - b.f);
})();
const SPECK = (() => { const r = L.rng(4402), out = []; for (let i = 0; i < 260; i++) out.push({ x: r() * W, f: Math.pow(r(), 1.4), s: 0.6 + r() * 1.4, l: r() }); return out; })();

/** the Mir fragments' anchor points (for the card's leaders), main row */
const MIR_FR = [
  { x: 300, dy: -34, len: 200, rad: 40, ang: 0.07, seed: 31 },
  { x: 560, dy: -26, len: 120, rad: 32, ang: -0.22, seed: 32 },
];
const MIR_ARR = { x: 400, dy: -6, len: 150, ang: -0.35 };

/** the Mir fragments' anchor points on screen for a seabed line at `base` */
function mirAnchors(base) {
  const my = (x) => terrainY(x, base);
  return [
    ...MIR_FR.map((m) => ({ x: m.x - m.len * 0.1, y: my(m.x) + m.dy + 14 - m.rad - 4 })),
    { x: MIR_ARR.x + 10, y: my(MIR_ARR.x) + MIR_ARR.dy - 44 },
  ];
}

/** the seabed scene; returns the Mir fragments' screen anchors for the card's leaders */
function drawSeabed(c, v, k) {
  const gt = v.gt, tl = v.tl;
  const base = seabedBase(gt, tl);
  const dk = descentK(gt, tl);
  const anchors = [];
  c.save();
  c.globalAlpha = k;
  TONE = 1; RIMK = 1;
  // water column
  const wg = c.createLinearGradient(0, 0, 0, H);
  wg.addColorStop(0, 'rgb(13,44,72)'); wg.addColorStop(0.5, 'rgb(8,27,48)'); wg.addColorStop(1, 'rgb(4,13,26)');
  c.fillStyle = wg; c.fillRect(0, 0, W, H);
  // light falling from far above (strong while sinking, a faint residue stays so the water column isn't empty)
  const rays = 0.3 + 0.7 * (1 - L.smoothstep(dk));
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = 140 + i * 210 + 40 * Math.sin(gt * 0.4 + i);
    const g = c.createLinearGradient(0, 0, 0, 1300);
    g.addColorStop(0, `rgba(90,170,220,${0.12 * rays})`); g.addColorStop(1, 'rgba(90,170,220,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x + 30, 0); c.lineTo(x + 160, 1300); c.lineTo(x + 60, 1300); c.closePath(); c.fill();
  }
  c.restore();
  // a soft cold light pool over the wreck field
  L.lightBlob(c, 520, base - 120, 900, [70, 145, 185], 0.32);
  // marine snow: rushes up while sinking, then drifts
  const rush = 1600 * (1 - Math.pow(1 - L.clamp(dk), 2)) + 18 * gt;
  for (const p of SNOW) {
    const y = ((p.y - rush * p.d) % H + H) % H;
    const x = p.x + 8 * Math.sin(gt * 0.6 + p.ph);
    const streak = (1 - L.clamp(dk)) * 30 * p.d;
    c.fillStyle = `rgba(190,220,235,${0.28 * p.d})`;
    c.beginPath(); c.ellipse(x, y + streak / 2, p.s * 0.5, (p.s + streak) / 2, 0, 0, Math.PI * 2); c.fill();
  }
  if (base < H + 200) {
    // ---- distant ridge (very hazy) with tiny silhouettes
    const rb = base - 170;
    c.save();
    c.globalAlpha *= 0.22;
    c.fillStyle = 'rgb(20,40,58)';
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) c.lineTo(x, terrainY(x + 2300, rb) - 30 * L.noise1(x / 400, 9));
    c.lineTo(W, H); c.closePath(); c.fill();
    for (const [x, s] of [[120, 0.35], [350, 0.3], [610, 0.4], [880, 0.33], [1010, 0.28]]) drawProgress(c, x, terrainY(x + 2300, rb) - 30 * L.noise1(x / 400, 9) - 4, s, (x % 3 - 1) * 0.12, 0.9);
    c.restore();
    // ---- far row (hazy)
    const fb = base - 90;
    c.save();
    c.globalAlpha *= 0.45;
    c.fillStyle = 'rgb(14,26,40)';
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) c.lineTo(x, terrainY(x + 900, fb));
    c.lineTo(W, H); c.closePath(); c.fill();
    const fy = (x) => terrainY(x + 900, fb);
    drawProgress(c, 190, fy(190) - 6, 0.55, 0.12, 0.8);
    drawSphere(c, 330, fy(330) - 8, 15, 0.8);
    drawNozzle(c, 470, fy(470) - 2, 0.6, 0.4, 0.8);
    drawHullFrag(c, 600, fy(600) - 10, 90, 18, -0.1, 0.8, 7);
    drawTruss(c, 740, fy(740) - 4, 90, -0.2, 0.8);
    drawSphere(c, 860, fy(860) - 10, 18, 0.8);
    drawPanel(c, 980, fy(980) + 2, 70, 34, 0.25, 0.8);
    drawPanel(c, 60, fy(60) + 2, 60, 30, -0.3, 0.8);
    c.restore();
    // ---- main row (wrecks first, then the sediment over their buried bottoms)
    const my = (x) => terrainY(x, base);
    drawSphere(c, 95, my(95) - 26, 44, 1);
    drawArrayFrame(c, MIR_ARR.x - 60, my(MIR_ARR.x) + MIR_ARR.dy, MIR_ARR.len, MIR_ARR.ang, 1);
    MIR_FR.forEach((m) => drawHullFrag(c, m.x, my(m.x) + m.dy + 14, m.len, m.rad, m.ang, 1, m.seed));
    drawNozzle(c, 700, my(700) - 18, 0.9, -0.5, 1);
    drawProgress(c, 860, my(860) - 14, 1.0, -0.14, 1);
    drawTruss(c, 1020, my(1020) - 8, 150, 0.32, 1);
    // sediment plane
    const sg = c.createLinearGradient(0, base - 40, 0, H);
    const f12 = Math.min(0.99, 52 / Math.max(60, H - base + 40));
    sg.addColorStop(0, 'rgb(40,54,66)'); sg.addColorStop(f12, 'rgb(26,38,50)'); sg.addColorStop(1, 'rgb(9,14,22)');
    c.fillStyle = sg;
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) c.lineTo(x, terrainY(x, base) + 8);
    c.lineTo(W, H); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,170,195,0.25)'; c.lineWidth = 1.5;
    c.beginPath(); for (let x = 0; x <= W; x += 8) { const y = terrainY(x, base) + 8; if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
    // ripples: wavy bands, wider and fainter toward the viewer
    const span = H - base;
    for (let i = 0; i < 26; i++) {
      const f = (i + 0.5) / 26, y0 = base + 22 + span * Math.pow(f, 1.7);
      if (y0 > H + 10) break;
      const amp = 1.5 + 6 * f, per = 34 + 140 * f, ph = i * 1.7;
      c.lineWidth = 1 + 1.6 * f;
      c.strokeStyle = `rgba(0,0,0,${0.16 + 0.1 * f})`;
      c.beginPath(); for (let x = -10; x <= W + 10; x += 10) { const y = y0 + 3 + amp * Math.sin(x / per + ph) + 4 * L.noise1(x / 300 + i, 21); if (x > -10) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
      c.strokeStyle = `rgba(120,165,190,${0.09 * (1 - 0.6 * f)})`;
      c.beginPath(); for (let x = -10; x <= W + 10; x += 10) { const y = y0 + amp * Math.sin(x / per + ph) + 4 * L.noise1(x / 300 + i, 21); if (x > -10) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
    }
    // speckle (pebbles / nodules), bigger toward the viewer
    for (const p of SPECK) {
      const y = base + 16 + span * p.f, s = p.s * (0.6 + 3 * p.f);
      if (y > H + 6) continue;
      c.fillStyle = p.l > 0.5 ? 'rgba(70,92,110,0.55)' : 'rgba(4,8,14,0.5)';
      c.beginPath(); c.ellipse(p.x, y, s, s * 0.5, 0, 0, Math.PI * 2); c.fill();
    }
    // scattered small debris, half-buried (perspective: bigger lower down)
    for (const d of SCATTER) {
      const y = base + 24 + span * d.f, sc = d.s * (0.45 + 1.8 * d.f);
      if (y > H + 40) continue;
      TONE = 0.95 - 0.2 * d.f;
      if (d.type === 0) drawPanel(c, d.x, y + 4 * sc, 60 * sc, 26 * sc, d.ang * 0.6, 1);
      else if (d.type === 1) drawTruss(c, d.x, y - 3 * sc, 80 * sc, d.ang * 0.3, 1, 12 * sc);
      else if (d.type === 2) drawSphere(c, d.x, y - 6 * sc, 14 * sc, 1);
      else drawHullFrag(c, d.x, y - 8 * sc, 70 * sc, 14 * sc, d.ang * 0.4, 1, d.seed);
      mound(c, d.x, y + 6 * sc, (d.type === 1 ? 70 : d.type === 2 ? 26 : 56) * sc, base);
    }
    TONE = 1;
    // ---- near foreground: large, dark, half-buried pieces with a soft rim light
    const nb = nearBase(base);
    if (nb < H + 260) {
      TONE = 0.55; RIMK = 0.7;
      c.save();
      c.shadowColor = 'rgba(120,190,225,0.35)'; c.shadowBlur = 10;
      const ny = (x) => nb + 36 * L.noise1(x / 330, 41) + 10 * L.noise1(x / 90, 42);
      drawSphere(c, 115, ny(115) - 20, 108, 1);                         // a big propellant tank
      drawHullFrag(c, 372, ny(372) + 22, 190, 48, 0.12, 1, 55);          // a crumpled cylinder
      drawPanel(c, 650, ny(650) + 14, 270, 140, 0.1, 1);                 // a skin panel standing in the mud
      drawTruss(c, 945, ny(945) - 30, 300, -0.38, 1, 40);                // a truss fragment
      c.restore();
      TONE = 1; RIMK = 1;
      // near sediment over their bottoms
      const ng = c.createLinearGradient(0, nb - 20, 0, H);
      ng.addColorStop(0, 'rgb(22,32,42)'); ng.addColorStop(0.3, 'rgb(12,18,26)'); ng.addColorStop(1, 'rgb(5,8,13)');
      c.fillStyle = ng;
      c.beginPath(); c.moveTo(0, H + 10);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, ny(x) + 40 + 22 * L.noise1(x / 140, 43));
      c.lineTo(W, H + 10); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(120,170,195,0.18)'; c.lineWidth = 2;
      c.beginPath(); for (let x = 0; x <= W; x += 8) { const y = ny(x) + 40 + 22 * L.noise1(x / 140, 43); if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
    }
    // Mir anchors (top of each fragment) for the card's leaders
    MIR_FR.forEach((m) => anchors.push({ x: m.x - m.len * 0.1, y: my(m.x) + m.dy + 14 - m.rad - 4 }));
    anchors.push({ x: MIR_ARR.x + 20, y: my(MIR_ARR.x) + MIR_ARR.dy - 40 });
  }
  // near marine snow (soft, out of focus, in front of everything)
  for (const p of SNOW_NEAR) {
    const y = ((p.y - rush * p.d * 1.3) % H + H) % H;
    const x = p.x + 14 * Math.sin(gt * 0.5 + p.ph);
    c.fillStyle = `rgba(190,220,235,${0.08 * p.d})`;
    c.beginPath(); c.arc(x, y, p.s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  return { anchors, base };
}

export default {
  beat: 5,
  chapter: null,
  captions: true,
  layer: 10,
  cues(d, tl) {
    const st = tl.scenes[5].start, w = (j, k) => tl.lines[5].phrases[j].words[k][0] - st;
    return [
      { t: w(0, 1) + 0.1, name: 'whoosh', gain: 0.1, pitch: 1.4 },     // first re-entries
      { t: w(1, 0) - 1.0, name: 'count', gain: 0.1, pitch: 0.9 },      // the count
      { t: w(1, 0) - 0.4, name: 'dive', gain: 0.22, pitch: 0.8 },      // plunge, in the gap
      { t: w(1, 0) + 0.2, name: 'bubbles', gain: 0.1, pitch: 0.8 },
      { t: w(2, 0) - 0.32, name: 'creak', gain: 0.12, pitch: 0.7 },    // in the gap before "including"
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl;
    const k = uwK(gt, tl);
    // ---- phase A on the globe: the zone + re-entry streaks
    const a0 = B(5, -0.1)(tl), aEnd = PH(5, 1, 'start', 0.1)(tl);
    // (and only while the globe is small: no huge sawtooth ring during the dive)
    const zk = L.smoothstep(L.prog(gt, a0 + 0.3, 0.7)) * (1 - L.smoothstep(L.prog(gt, PH(5, 1, 'start', -0.5)(tl), 0.35))) *
      L.smoothstep(L.invLerp(1500, 1100, globe(v).r));
    if (zk > 0 && k < 1) {
      const pts = smallCircle(NEMO.lat, NEMO.lon, ZONE_DEG, 120);
      c.save();
      c.globalAlpha = zk;
      c.beginPath(); geoTrace(c, v, pts, true, 1.0);
      c.fillStyle = L.rgba(FIRE, 0.07); c.fill();
      c.strokeStyle = L.rgba(FIRE, 0.75); c.lineWidth = 2.5; c.setLineDash([12, 9]); c.stroke();
      c.restore();
    }
    const s0 = WD(5, 0, 1, -0.15)(tl), s1 = PH(5, 1, 'start', -0.6)(tl);
    if (gt > s0 && gt < aEnd + 1 && k < 1) {
      const g = globe(v);
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const st of STREAKS) {
        const ts = L.lerp(s0, s1 - 0.6, st.t);
        const u = (gt - ts) / st.dur;
        if (u <= 0 || u > 1.35) continue;
        const head = L.clamp(u);
        const fade = 1 - L.smoothstep(L.prog(u, 1.0, 0.35));
        // tail: 12 segments back from the head
        const tail = 0.35;
        const N = 14;
        let prev = null;
        for (let j = 0; j <= N; j++) {
          const s = L.clamp(head - tail * (1 - j / N));
          const p = streakPt(g, st, s);
          if (prev && p.z > -0.05) {
            const a = (j / N) ** 1.6 * fade;
            c.strokeStyle = L.rgba(L.mix([255, 90, 40], [255, 230, 170], j / N), 0.85 * a);
            c.lineWidth = 1 + 3.5 * (j / N);
            c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(p.x, p.y); c.stroke();
          }
          prev = p;
        }
        const hp = streakPt(g, st, head);
        L.lightBlob(c, hp.x, hp.y, 26, [255, 190, 110], 0.7 * fade);
        // break-up: fragments fan out over the last third
        if (head > 0.62) {
          const r = L.rng(st.seed);
          for (let f = 0; f < st.frag; f++) {
            const off = (r() - 0.5) * 0.5, lag = 0.04 + r() * 0.08;
            const q = streakPt(g, st, L.clamp(head - lag));
            const sp = (head - 0.62) * 70;
            const fx = q.x + off * sp * 2.2, fy = q.y + Math.abs(off) * sp;
            c.fillStyle = L.rgba([255, 200, 140], 0.7 * fade);
            c.fillRect(fx - 1.5, fy - 1.5, 3, 3);
          }
        }
      }
      c.restore();
    }
    // ---- the seabed scene
    if (k > 0.001) drawSeabed(c, v, k);
    // the counter, depth chip and Mir card live in drawWorld: their exits run past the beat end (the engine's overlay
    // fade would make the plates see-through), each fades contents first, then collapses its opaque plate
    if (v.t > 0 && gt < B(6, 0.3)(tl)) drawCards(c, v);
  },
  drawOverlay(c, v) {
    const t = v.t, gt = v.gt, tl = v.tl;
    c.save();
    c.globalAlpha = v.k;
    // ---- zone label on "graveyard" (leaves before the dive)
    const lk = L.ease.outCubic(L.prog(t, word(v, 0, 7, -0.05), 0.4)) * (1 - L.smoothstep(L.prog(gt, PH(5, 1, 'start', -0.85)(tl), 0.25)));
    if (lk > 0) {
      const q = geo(v, NEMO.lat - ZONE_DEG - 2.5, NEMO.lon);
      mapLabel(c, 'SPACECRAFT CEMETERY', q.x, q.y + 6, { alpha: lk, size: 30, color: [255, 205, 160], weight: 700 });
    }
    c.restore();
  },
};

function drawCards(c, v) {
    const t = v.t, gt = v.gt, tl = v.tl;
    c.save();
    // ---- counter: 260+ SPACECRAFT, counts up, lands on "Hundreds"
    const tH = word(v, 1, 0, 0), tC0 = tH - 1.0;
    // cards leave as the seabed fades (it starts at B(6) − 0.12): contents first, then the plates (fast)
    // (the plate starts collapsing while its text is still fading: gone ≤ 0.06 s after the text, never empty)
    const exC = 1 - L.ease.inCubic(L.prog(gt, B(6, -0.16)(tl), 0.1));
    const exP = 1 - L.ease.inOutCubic(L.prog(gt, B(6, -0.12)(tl), 0.12));
    const ck = L.ease.outCubic(L.prog(t, tC0 - 0.05, 0.25)) * exC;   // the digits fade in as the count starts (from 10)
    if (ck > 0) {
      const y = 500;
      const n = 10 + countAt(gq(gt) - tl.scenes[5].start, tC0, tH, FACTS.wrecks - 10);
      const str = `${String(n).padStart(3, ' ')}+`;
      c.save();
      c.globalAlpha *= ck;
      scrim(c, W / 2, y - 50, 420, 140, 0.55);
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 16;
      const w1 = cellText(c, str, 0, 0, 150, { dry: true });
      c.font = L.font(64, 800, L.FONT.display);
      const w2 = c.measureText('SPACECRAFT').width;
      const x0 = W / 2 - (w1 + 26 + w2) / 2, yy = y + (1 - ck) * 14;
      cellText(c, str, x0, yy, 150, { color: ACCENT });
      c.font = L.font(64, 800, L.FONT.display);
      c.fillStyle = L.rgba(INKW);
      c.fillText('SPACECRAFT', x0 + w1 + 26, yy);
      c.font = L.font(24, 600, L.FONT.body);
      c.fillStyle = L.rgba(GREYT);
      L.trackedText(c, 'RE-ENTERED HERE SINCE 1971', W / 2, yy + 52, 4, 'center');
      c.restore();
    }
    // ---- depth chip on "seabed"
    const dk = L.ease.outCubic(L.prog(t, word(v, 1, 7, -0.05), 0.4)) * (exP > 0 ? 1 : 0);
    if (dk > 0) {
      const x = 80, y = 610, w = 300 * L.lerp(0.4, 1, dk), h = 96 * exP;
      c.save();
      plate(c, x, y, w, h, { r: 16, border: 0.45 });
      c.beginPath(); c.rect(x, y, w, h); c.clip();
      c.globalAlpha *= L.clamp((dk - 0.8) / 0.2) * exC;
      c.textBaseline = 'alphabetic';
      c.font = L.font(20, 600, L.FONT.body);
      c.fillStyle = L.rgba(GREYT);
      L.trackedText(c, 'SEABED DEPTH', x + 26, y + 34, 4, 'left');
      c.font = L.font(40, 700, L.FONT.din);
      c.fillStyle = L.rgba(INKW);
      L.trackedText(c, `≈ ${FACTS.depthKm} KM DOWN`, x + 26, y + 78, 1, 'left');
      c.restore();
    }
    // ---- Mir card: opens on "Russian" (RUSSIAN STATION / MOSTLY BURNED UP ON RE-ENTRY), the name lands ON "Mir"
    // (MIR · 2001 / FRAGMENTS OF A ≈ 130-TONNE STATION) with leaders out to three of its scattered fragments
    const tR = word(v, 2, 2, -0.12), tM = word(v, 2, 5, -0.06);
    const mo = L.ease.outCubic(L.prog(t, tR, 0.3)) * (exP > 0 ? 1 : 0);
    if (mo > 0) {
      const base = seabedBase(gt, tl);
      const lx = 470, ly = 800, ph0 = 116;
      // stage 1 out just before "Mir", stage 2 in ON "Mir" (never both at once)
      const a1 = 1 - L.ease.inCubic(L.prog(t, tM - 0.12, 0.12)), a2 = L.ease.outCubic(L.prog(t, tM, 0.16));
      const T1 = 'RUSSIAN STATION', S1 = 'MOSTLY BURNED UP ON RE-ENTRY';
      const T2 = `MIR · ${FACTS.mirYear}`, S2 = 'FRAGMENTS OF A ≈ 130-TONNE STATION';
      const wT = Math.max(tw(c, T1, 50, 800, L.FONT.display, 2), tw(c, T2, 50, 800, L.FONT.display, 2));
      const wS = Math.max(tw(c, S1, 21, 600, L.FONT.body, 3), tw(c, S2, 21, 600, L.FONT.body, 3));
      const PW = Math.max(wT, wS) + 72;
      const pw = PW * L.lerp(0.4, 1, mo), ph = ph0 * exP, px = lx - pw / 2, py = ly + (ph0 - ph) / 2;
      c.save();
      // leaders to the fragments, on "Mir"
      const lk = L.ease.outCubic(L.prog(t, tM, 0.4)) * exC;
      if (lk > 0) {
        c.strokeStyle = L.rgba(ACCENT, 0.9 * exC); c.lineWidth = 2.5;
        mirAnchors(base).sort((a, b) => a.x - b.x).forEach((q, i) => {   // left → right: leaders never cross
          const sx = L.lerp(lx - PW * 0.3, lx + PW * 0.3, i / 2), sy = ly + ph0;
          const e = L.clamp(lk * 1.15 - i * 0.07);
          c.beginPath(); c.moveTo(sx, sy); c.lineTo(L.lerp(sx, q.x, e), L.lerp(sy, q.y, e)); c.stroke();
          if (e >= 0.98) { c.fillStyle = L.rgba(ACCENT, exC); c.beginPath(); c.arc(q.x, q.y, 6, 0, Math.PI * 2); c.fill(); }
        });
      }
      plate(c, px, py, pw, ph, { r: 16 });
      c.beginPath(); c.rect(px, py, pw, ph); c.clip();
      const ca = L.clamp((mo - 0.8) / 0.2) * exC;
      c.textBaseline = 'alphabetic';
      const stage = (T, S, a, dy) => {
        if (a <= 0) return;
        c.save();
        c.globalAlpha *= a;
        c.font = L.font(50, 800, L.FONT.display);
        c.fillStyle = L.rgba(T === T2 ? INKW : [205, 220, 238]);
        L.trackedText(c, T, lx, ly + 62 + dy, 2, 'center');
        c.font = L.font(21, 600, L.FONT.body);
        c.fillStyle = L.rgba(T === T2 ? ACCENT : GREYT);
        L.trackedText(c, S, lx, ly + 96 + dy, 3, 'center');
        c.restore();
      };
      c.globalAlpha *= ca;
      stage(T1, S1, a1, -8 * (1 - a1));
      stage(T2, S2, a2, 8 * (1 - a2));
      c.restore();
    }
    c.restore();
}
