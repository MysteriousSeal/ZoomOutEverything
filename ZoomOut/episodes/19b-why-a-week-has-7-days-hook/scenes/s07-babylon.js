// Beat 7 — "But historians trace the seven back to Babylon, where sky-watchers tracked seven moving lights."
// The camera dives into the Earth's top limb and lands on a Babylonian rooftop at night (ROOF, on the horizon).
// drawWorld (every frame, while the camera is near the limb): a refined silhouette set in world units —
//   far: a hazy low city line with a few warm windows, the stepped ziggurat (Etemenanki-like) with a temple fire;
//   mid: date palms swaying slightly;
//   near: a mud-brick house with stepped merlons, niched pilasters, a lit doorway, an outside stair, a brazier on the
//         roof, and a robed sky-watcher holding a clay tablet, rim-lit by the brazier.
// On "sky-watchers … tracked" a fine dashed gaze line rises from the watcher into the empty sky (the lights rise
// in beat 8). Label "Babylon" / "sky-watchers, c. 600 BC" lands as the camera settles.
// The set stays for beats 8-10 (fades with zoom; skipped when sub-pixel). Beats 12-13 swap in a ROMAN skyline
// (temple, aqueduct, cypresses) for "Roman astrologers"; it fades out early in beat 14 to a plain night horizon.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, EARTH, ROOF } from '../env.js';

const TL = ((t) => (t.preroll ? { ...t, scenes: t.scenes.slice(1), lines: t.lines.slice(1) } : t))(await (await fetch(new URL('../build/timeline.json', import.meta.url))).json());   // 19b: the MAIN timeline (preroll line dropped, as main.js does)
const B = 7;
const T0 = TL.scenes[B].start;
const ln = TL.lines[B];
const wordT = (w) => { const i = ln.text.toLowerCase().indexOf(w); return ln.start + (i / ln.text.length) * (ln.end - ln.start) - T0; };
const T_LABEL = Math.max(2.45, wordT('babylon') + 0.1);
const T_GAZE = wordT('tracked') - 0.25;
const TAU = Math.PI * 2;
const R = EARTH.r;
/** Drop (u, positive = down) of the surface below the horizon tangent at local x. */
const drop = (x) => R - Math.sqrt(R * R - x * x);

// ------------------------------------------------------------------ deterministic set dressing
const CITY = (() => {
  const r = L.rng(707);
  const out = [];
  let x = -10.5;
  while (x < 10.5) {
    const w = 0.35 + r() * 0.9, h = 0.1 + r() * 0.42;
    const wins = [];
    if (r() < 0.55) wins.push([x + w * (0.2 + r() * 0.6), h * (0.35 + r() * 0.3), r() * 6.3]);
    if (r() < 0.25) wins.push([x + w * (0.2 + r() * 0.6), h * (0.3 + r() * 0.4), r() * 6.3]);
    out.push({ x, w, h, wins, crenel: r() < 0.3 });
    x += w + (r() < 0.25 ? 0.15 + r() * 0.4 : 0);
  }
  return out;
})();
const PALMS = [
  { x: -3.15, h: 1.55, lean: -0.18, seed: 1, far: 0.35 },
  { x: 3.25, h: 2.05, lean: 0.22, seed: 2, far: 0.15 },
  { x: 3.9, h: 1.55, lean: -0.12, seed: 3, far: 0.3 },
  { x: 6.35, h: 2.3, lean: 0.16, seed: 4, far: 0.25 },
  { x: -8.2, h: 1.7, lean: 0.12, seed: 5, far: 0.4 },
];
const HOUSE = { x0: -2.3, x1: 2.3, h: 1.45 };
const WATCH = { x: -0.7 };
const BRAZIER = { x: 1.45 };

// ------------------------------------------------------------------ pieces (local units: x right, y DOWN, 0 = horizon tangent)
function ziggurat(c, gt, s) {
  const x0 = -5.6;
  const tiers = [[3.8, 0.52], [2.95, 0.5], [2.15, 0.46], [1.4, 0.42], [0.72, 0.36]];
  const base = drop(x0);
  let y = base;
  const far = [26, 28, 42];
  for (let i = 0; i < tiers.length; i++) {
    const [w, h] = tiers[i];
    const g = c.createLinearGradient(0, y - h, 0, y);
    g.addColorStop(0, L.rgba(L.mix(far, [60, 66, 96], 0.25)));
    g.addColorStop(1, L.rgba(far));
    c.fillStyle = g;
    // slight batter (sloped walls)
    c.beginPath();
    c.moveTo(x0 - w / 2, y); c.lineTo(x0 - w / 2 + 0.06, y - h); c.lineTo(x0 + w / 2 - 0.06, y - h); c.lineTo(x0 + w / 2, y);
    c.closePath(); c.fill();
    // cool sky rim on each terrace edge
    c.strokeStyle = 'rgba(130,150,200,0.22)'; c.lineWidth = 1.2 / s;
    c.beginPath(); c.moveTo(x0 - w / 2 + 0.06, y - h); c.lineTo(x0 + w / 2 - 0.06, y - h); c.stroke();
    // pilaster rhythm
    if (s > 25 && i < 4) {
      c.fillStyle = 'rgba(0,0,0,0.08)';
      const n = Math.floor(w / 0.32);
      for (let j = 1; j < n; j++) c.fillRect(x0 - w / 2 + j * (w / n) - 0.03, y - h + 0.06, 0.06, h - 0.06);
    }
    y -= h;
  }
  // the grand central stair (lighter band) up the first three tiers
  c.fillStyle = 'rgba(70,74,100,0.35)';
  c.beginPath(); c.moveTo(x0 - 0.22, base); c.lineTo(x0 - 0.1, base - 1.48); c.lineTo(x0 + 0.1, base - 1.48); c.lineTo(x0 + 0.22, base); c.closePath(); c.fill();
  if (s > 25) {
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1 / s;
    c.beginPath();
    for (let j = 1; j < 14; j++) { const yy = base - j * 0.105, hw = L.lerp(0.22, 0.1, j / 14); c.moveTo(x0 - hw, yy); c.lineTo(x0 + hw, yy); }
    c.stroke();
  }
  // temple fire on the summit shrine
  const fl = 0.85 + 0.15 * L.noise1(gt * 3.1, 11);
  L.lightBlob(c, x0, y + 0.08, 0.55 * fl, [255, 170, 90], 0.42);
  L.lightBlob(c, x0, y + 0.18, 1.6, [255, 150, 80], 0.08);
  c.fillStyle = L.rgba([255, 205, 140], 0.9);
  c.fillRect(x0 - 0.06, y + 0.12, 0.12, 0.13);
}

function city(c, gt, s) {
  for (const b of CITY) {
    if (b.x > HOUSE.x0 - 0.2 && b.x + b.w < HOUSE.x1 + 0.2) continue;
    const by = drop(b.x + b.w / 2);
    c.fillStyle = '#14151f';
    c.fillRect(b.x, by - b.h, b.w + 0.01, b.h + 0.3);
    if (b.crenel && s > 20) {
      for (let x = b.x + 0.04; x < b.x + b.w - 0.08; x += 0.16) c.fillRect(x, by - b.h - 0.06, 0.08, 0.07);
    }
    for (const [wx, wy, ph] of b.wins) {
      const f = 0.55 + 0.45 * L.smoothstep(L.clamp(0.5 + 0.5 * L.noise1(gt * 0.7 + ph, 3)));
      c.fillStyle = L.rgba([255, 190, 120], 0.75 * f);
      c.fillRect(wx, by - wy, 0.05, 0.065);
      if (s > 30) L.lightBlob(c, wx + 0.025, by - wy + 0.03, 0.22, [255, 170, 100], 0.12 * f);
    }
  }
}

function palm(c, p, gt, s) {
  const by = drop(p.x);
  const sway = 0.04 * L.noise1(gt * 0.35 + p.seed * 7, p.seed) + 0.02 * Math.sin(gt * 0.9 + p.seed);
  const tx = p.x + p.lean + sway, ty = by - p.h;
  const cxp = p.x + p.lean * 0.15, cyp = by - p.h * 0.5;
  const col = L.mix([9, 9, 12], [26, 28, 42], p.far);
  c.strokeStyle = L.rgba(col); c.fillStyle = L.rgba(col);
  // trunk: tapered (two strokes) with ring notches
  c.lineCap = 'round';
  c.lineWidth = 0.1; c.beginPath(); c.moveTo(p.x, by + 0.05); c.quadraticCurveTo(cxp, cyp, L.lerp(cxp, tx, 0.5), L.lerp(cyp, ty, 0.5)); c.stroke();
  c.lineWidth = 0.065; c.beginPath(); c.moveTo(L.lerp(cxp, tx, 0.45), L.lerp(cyp, ty, 0.45)); c.quadraticCurveTo(L.lerp(cxp, tx, 0.75), L.lerp(cyp, ty, 0.75), tx, ty); c.stroke();
  // fronds: a curved rib with drooping leaflets
  const r = L.rng(p.seed * 31);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (1.08 - 1.16 * i / (n - 1)) + (r() - 0.5) * 0.2;
    const len = 0.62 + r() * 0.32;
    const wob = 0.05 * Math.sin(gt * 1.3 + i * 1.7 + p.seed);
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + 0.32 * len + wob;
    const mx = tx + Math.cos(a) * len * 0.55, my = ty + Math.sin(a) * len * 0.6 - 0.05;
    c.lineWidth = 0.035;
    c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
    if (s > 18) {
      c.lineWidth = Math.max(0.012, 1.1 / s);
      c.beginPath();
      for (let j = 2; j <= 12; j++) {
        const u = j / 12;
        const qx = (1 - u) * (1 - u) * tx + 2 * u * (1 - u) * mx + u * u * ex;
        const qy = (1 - u) * (1 - u) * ty + 2 * u * (1 - u) * my + u * u * ey;
        const ll = 0.2 * (1 - u * 0.7);
        const dir = Math.cos(a) >= 0 ? 1 : -1;
        c.moveTo(qx, qy); c.lineTo(qx + dir * ll * 0.35, qy + ll);
        c.moveTo(qx, qy); c.lineTo(qx - dir * ll * 0.15, qy + ll * 0.9);
      }
      c.stroke();
    }
  }
  // date clusters
  c.beginPath(); c.arc(tx + 0.04, ty + 0.1, 0.06, 0, TAU); c.fill();
}

function house(c, gt, s, lampF) {
  const { x0, x1, h } = HOUSE;
  const by = drop(0) + 0.02;
  const top = by - h;
  // outside stair on the left (down from the roof)
  c.fillStyle = '#100e0d';
  c.beginPath();
  c.moveTo(x0, top + 0.25);
  const steps = 8;
  for (let i = 0; i < steps; i++) { const x = x0 - (i + 1) * 0.11, y = top + 0.25 + i * (h - 0.25) / steps; c.lineTo(x + 0.11, y); c.lineTo(x, y); c.lineTo(x, y + (h - 0.25) / steps); }
  c.lineTo(x0 - steps * 0.11, by + 0.2); c.lineTo(x0, by + 0.2); c.closePath(); c.fill();
  // body
  const g = c.createLinearGradient(0, top, 0, by);
  g.addColorStop(0, '#231c16'); g.addColorStop(0.5, '#16120f'); g.addColorStop(1, '#0b0a0a');
  c.fillStyle = g;
  c.fillRect(x0, top, x1 - x0, h + 0.3);
  // warm light falling from the brazier onto the wall top (right side)
  const wl = c.createRadialGradient(BRAZIER.x, top, 0, BRAZIER.x, top, 1.8);
  wl.addColorStop(0, `rgba(255,170,90,${0.22 * lampF})`); wl.addColorStop(1, 'rgba(255,170,90,0)');
  c.fillStyle = wl; c.fillRect(x0, top - 0.3, x1 - x0, 1.6);
  // niched pilasters (Babylonian facade rhythm)
  if (s > 12) {
    for (let x = x0 + 0.28; x < x1 - 0.2; x += 0.52) {
      c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x, top + 0.2, 0.09, h - 0.2);
      c.fillStyle = 'rgba(255,200,150,0.035)'; c.fillRect(x + 0.09, top + 0.2, 0.03, h - 0.2);
    }
  }
  // brick coursing (only when large)
  if (s > 40) {
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1 / s;
    c.beginPath();
    for (let y = top + 0.12; y < by; y += 0.105) { c.moveTo(x0, y); c.lineTo(x1, y); }
    c.stroke();
  }
  // parapet: stepped merlons
  c.fillStyle = '#231c16';
  for (let x = x0; x < x1 - 0.1; x += 0.42) {
    c.fillRect(x, top - 0.1, 0.3, 0.1);
    c.fillRect(x + 0.07, top - 0.19, 0.16, 0.1);
  }
  // rim: a fine warm edge on the parapet near the brazier, cool elsewhere
  c.lineWidth = 1.2 / s;
  c.strokeStyle = 'rgba(140,150,190,0.18)';
  c.beginPath(); c.moveTo(x0, top); c.lineTo(x1, top); c.stroke();
  // doorway: an arched opening with a lamp-lit interior
  const dx0 = 0.75, dw = 0.36, dh = 0.62;
  const dg = c.createLinearGradient(0, by - dh, 0, by);
  const fl = 0.8 + 0.2 * L.noise1(gt * 2.3, 21);
  dg.addColorStop(0, `rgba(120,70,35,${0.85 * fl})`); dg.addColorStop(1, `rgba(200,120,55,${0.95 * fl})`);
  c.fillStyle = dg;
  c.beginPath(); c.moveTo(dx0, by); c.lineTo(dx0, by - dh + dw / 2); c.arc(dx0 + dw / 2, by - dh + dw / 2, dw / 2, Math.PI, 0); c.lineTo(dx0 + dw, by); c.closePath(); c.fill();
  L.lightBlob(c, dx0 + dw / 2, by - 0.2, 0.9, [255, 160, 80], 0.16 * fl);
  // a small window slit
  c.fillStyle = `rgba(230,150,80,${0.65 * fl})`;
  c.fillRect(-1.55, top + 0.45, 0.09, 0.2);
  return top;
}

function brazier(c, gt, roofY, s) {
  const x = BRAZIER.x;
  const f = 0.82 + 0.18 * L.noise1(gt * 4.2, 33) + 0.05 * Math.sin(gt * 17);
  // glow
  L.lightBlob(c, x, roofY - 0.36, 1.5 * f, [255, 160, 80], 0.32);
  L.lightBlob(c, x, roofY - 0.33, 0.45 * f, [255, 200, 120], 0.6);
  // tripod + bowl
  c.fillStyle = '#0d0b0a';
  c.beginPath(); c.moveTo(x - 0.1, roofY); c.lineTo(x - 0.035, roofY - 0.06); c.lineTo(x - 0.03, roofY - 0.2); c.lineTo(x + 0.03, roofY - 0.2); c.lineTo(x + 0.035, roofY - 0.06); c.lineTo(x + 0.1, roofY); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x - 0.13, roofY - 0.24); c.quadraticCurveTo(x, roofY - 0.1, x + 0.13, roofY - 0.24); c.closePath(); c.fill();
  // flame: two teardrops
  for (const [w, hh, col, a] of [[0.075, 0.2, [255, 170, 70], 0.9], [0.04, 0.12, [255, 235, 180], 1]]) {
    const fh = hh * f, sway = 0.02 * L.noise1(gt * 5, 44);
    c.fillStyle = L.rgba(col, a);
    c.beginPath();
    c.moveTo(x - w, roofY - 0.25);
    c.quadraticCurveTo(x - w, roofY - 0.25 - fh * 0.6, x + sway, roofY - 0.25 - fh);
    c.quadraticCurveTo(x + w, roofY - 0.25 - fh * 0.6, x + w, roofY - 0.25);
    c.closePath(); c.fill();
  }
  return f;
}

/** The sky-watcher: robed, bearded, cap, head tilted up-left, a clay tablet held at the chest. Feet at (x, y). */
function watcher(c, gt, x, y, s, lampF) {
  const sw = 0.012 * Math.sin(gt * 0.8);           // the robe stirs
  const breath = 0.006 * Math.sin(gt * 1.7);
  c.save();
  c.translate(x, y);
  c.scale(1.25, 1.25);
  s *= 1.25;
  const body = new Path2D();
  body.moveTo(-0.21 + sw, 0);
  body.quadraticCurveTo(-0.17, -0.3, -0.135, -0.56);
  body.quadraticCurveTo(-0.125, -0.67 - breath, -0.07, -0.715 - breath);
  body.lineTo(0.05, -0.712 - breath);
  body.quadraticCurveTo(0.12, -0.68 - breath, 0.13, -0.6);
  body.quadraticCurveTo(0.15, -0.3, 0.215 + sw, 0);
  body.closePath();
  // head (tilted back, face up-left), cap, beard
  body.moveTo(0.06, -0.8);
  body.ellipse(-0.005, -0.79 - breath, 0.07, 0.078, -0.35, 0, TAU);
  const cap = new Path2D();
  cap.ellipse(0.02, -0.845 - breath, 0.072, 0.042, -0.45, Math.PI, TAU);
  cap.closePath();
  const beard = new Path2D();
  beard.moveTo(-0.07, -0.775 - breath); beard.lineTo(-0.1, -0.7 - breath); beard.lineTo(-0.035, -0.68 - breath); beard.lineTo(-0.01, -0.735 - breath); beard.closePath();
  // arm + tablet
  const arm = new Path2D();
  arm.moveTo(-0.05, -0.66); arm.quadraticCurveTo(-0.17, -0.62, -0.25, -0.58); arm.lineTo(-0.24, -0.54); arm.quadraticCurveTo(-0.15, -0.56, -0.04, -0.58); arm.closePath();
  c.fillStyle = '#0a0909';
  c.fill(body); c.fill(cap); c.fill(beard); c.fill(arm);
  // the tablet (tilted up), lamp-lit clay face with cuneiform scratches
  c.save();
  c.translate(-0.29, -0.6); c.rotate(-0.55);
  c.fillStyle = '#0c0a09';
  L.roundRect(c, -0.075, -0.1, 0.15, 0.2, 0.025); c.fill();
  c.fillStyle = L.rgba([170, 122, 78], 0.5 * lampF);
  L.roundRect(c, -0.062, -0.088, 0.124, 0.176, 0.02); c.fill();
  if (s > 35) {
    c.strokeStyle = 'rgba(40,24,12,0.55)'; c.lineWidth = 0.9 / s;
    c.beginPath();
    for (let i = 0; i < 6; i++) { const yy = -0.065 + i * 0.027; for (let j = 0; j < 4; j++) { const xx = -0.048 + j * 0.026; c.moveTo(xx, yy); c.lineTo(xx + 0.014, yy + 0.006); } }
    c.stroke();
  }
  c.restore();
  // warm rim light on the right contour (from the brazier)
  c.strokeStyle = L.rgba([255, 180, 100], 0.45 * lampF);
  c.lineWidth = 1.6 / s;
  c.beginPath();
  c.moveTo(0.05, -0.712 - breath); c.quadraticCurveTo(0.12, -0.68 - breath, 0.13, -0.6); c.quadraticCurveTo(0.15, -0.3, 0.215 + sw, 0);
  c.stroke();
  c.beginPath(); c.ellipse(-0.005, -0.79 - breath, 0.07, 0.078, -0.35, -1.2, 0.6); c.stroke();
  // robe fold (a fine shawl line)
  if (s > 30) {
    c.strokeStyle = 'rgba(255,190,120,0.12)'; c.lineWidth = 1 / s;
    c.beginPath(); c.moveTo(0.1, -0.66); c.quadraticCurveTo(0.02, -0.4, -0.12, -0.3); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ the ROMAN set (beats 12-13: "Roman astrologers")
// Same horizon, same night, different city: an aqueduct line far left, a classical temple (stepped stylobate,
// columns, entablature, pediment) with a lamp-lit cella and two torches, and dark cypresses. Under SET_TOP (2.45 u).
const ROMAN_FAR = [24, 26, 38], ROMAN_MID = [17, 17, 24];
function aqueduct(c, s) {
  const xa = -10.5, xb = -3.0, top = 1.3, band = 0.22, span = 0.62;
  c.fillStyle = L.rgba(ROMAN_FAR);
  c.beginPath();
  for (let x = xa; x < xb; x += span) {
    const by = drop(x + span / 2) + 0.05;
    // one bay: pier + arch, cut out as an arched opening
    c.moveTo(x, by); c.lineTo(x, by - top); c.lineTo(x + span, by - top); c.lineTo(x + span, by);
    const ix0 = x + 0.12, ix1 = x + span - 0.12, ar = (ix1 - ix0) / 2, iy = by - top + band + ar;
    c.lineTo(ix1, by); c.lineTo(ix1, iy); c.arc(ix0 + ar, iy, ar, 0, Math.PI, true); c.lineTo(ix0, by); c.closePath();
  }
  c.fill();
  c.strokeStyle = 'rgba(130,150,200,0.2)'; c.lineWidth = 1.2 / s;
  c.beginPath(); c.moveTo(xa, drop(xa) + 0.05 - top); c.lineTo(xb, drop(xb) + 0.05 - top); c.stroke();
}
function cypress(c, x, h, w, col) {
  const by = drop(x) + 0.05;
  c.fillStyle = L.rgba(col);
  c.beginPath();
  c.moveTo(x - w * 0.18, by);
  c.bezierCurveTo(x - w * 0.62, by - h * 0.35, x - w * 0.42, by - h * 0.8, x, by - h);
  c.bezierCurveTo(x + w * 0.42, by - h * 0.8, x + w * 0.62, by - h * 0.35, x + w * 0.18, by);
  c.closePath(); c.fill();
}
function temple(c, gt, s) {
  const cx = 2.4, w = 3.7, by = drop(cx) + 0.04;
  const stepH = 0.08, colH = 1.12, entH = 0.2, pedH = 0.44;
  // stylobate: three steps
  c.fillStyle = L.rgba(ROMAN_MID);
  for (let i = 0; i < 3; i++) { const ww = w + 0.36 - i * 0.12; c.fillRect(cx - ww / 2, by - (i + 1) * stepH, ww, stepH + 0.3 * (i === 0)); }
  const base = by - 3 * stepH;
  // the lamp-lit cella behind the columns
  const fl = 0.8 + 0.2 * L.noise1(gt * 2.1, 41);
  const cg = c.createLinearGradient(0, base - colH, 0, base);
  cg.addColorStop(0, `rgba(70,40,22,${0.9})`); cg.addColorStop(1, `rgba(170,100,48,${0.9 * fl})`);
  c.fillStyle = cg;
  c.fillRect(cx - w / 2 + 0.25, base - colH, w - 0.5, colH);
  L.lightBlob(c, cx, base - 0.3, 1.3, [255, 160, 80], 0.16 * fl);
  // columns with capitals and bases
  const n = 6, cw = 0.17;
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + 0.2 + (i * (w - 0.4 - cw)) / (n - 1);
    c.fillStyle = L.rgba(ROMAN_MID);
    c.fillRect(x, base - colH, cw, colH);
    c.fillRect(x - 0.035, base - 0.05, cw + 0.07, 0.05);
    c.fillRect(x - 0.045, base - colH, cw + 0.09, 0.06);
    // cool rim on the left edge of each column
    c.fillStyle = 'rgba(130,150,200,0.12)'; c.fillRect(x, base - colH + 0.06, 0.025, colH - 0.11);
  }
  // entablature + pediment
  const et = base - colH - entH;
  c.fillStyle = L.rgba(ROMAN_MID);
  c.fillRect(cx - w / 2 - 0.05, et, w + 0.1, entH);
  c.beginPath(); c.moveTo(cx - w / 2 - 0.12, et + 0.01); c.lineTo(cx, et - pedH); c.lineTo(cx + w / 2 + 0.12, et + 0.01); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(140,155,200,0.26)'; c.lineWidth = 1.3 / s;
  c.beginPath(); c.moveTo(cx - w / 2 - 0.12, et); c.lineTo(cx, et - pedH); c.lineTo(cx + w / 2 + 0.12, et); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1 / s;
  c.beginPath(); c.moveTo(cx - w / 2 - 0.05, et + entH * 0.45); c.lineTo(cx + w / 2 + 0.05, et + entH * 0.45); c.stroke();
  // two torches at the steps
  for (const tx of [cx - w / 2 - 0.35, cx + w / 2 + 0.35]) {
    const ty = drop(tx) - 0.62;
    c.fillStyle = '#0c0b0c'; c.fillRect(tx - 0.025, ty, 0.05, 0.66);
    const f = 0.85 + 0.15 * L.noise1(gt * 5 + tx, 7);
    L.lightBlob(c, tx, ty - 0.04, 0.7 * f, [255, 160, 80], 0.3);
    c.fillStyle = L.rgba([255, 205, 140], 0.95);
    c.beginPath(); c.ellipse(tx, ty - 0.05, 0.04, 0.08 * f, 0, 0, TAU); c.fill();
  }
}
function romanSet(c, gt, s) {
  c.save(); c.globalAlpha *= 0.85; city(c, gt, s); c.restore();
  aqueduct(c, s);
  cypress(c, -2.2, 1.85, 0.42, [12, 12, 16]);
  cypress(c, -1.75, 1.35, 0.36, [14, 14, 19]);
  temple(c, gt, s);
  cypress(c, 5.15, 2.15, 0.46, [10, 10, 13]);
  cypress(c, 5.65, 1.6, 0.38, [13, 13, 18]);
  cypress(c, 7.4, 1.9, 0.42, [16, 17, 24]);
}

/** World → local transform; returns the scale (px per u) or 0 when the set is invisible. */
export function rooftopFrame(v) {
  const s = v.ws(1);
  if (s < 1.2) return 0;
  const hx = v.wx(ROOF.x), hy = v.wy(ROOF.y);
  if (hy < -40 || hy - 3 * s > L.H + 40 || hx + 11 * s < -40 || hx - 11 * s > L.W + 40) return 0;
  return s;
}
/** Visibility 0..1 of the set: only close to the limb (and while Babylon is on top of the globe). */
export const rooftopK = (v) => 1 - L.clamp(L.invLerp(0.05, 0.12, v.cam.mpp));
/** Screen position of the watcher's eye (for other scenes). */
export function watcherEye(v) {
  const roofY = drop(0) + 0.02 - HOUSE.h;
  return { x: v.wx(ROOF.x + WATCH.x - 0.05), y: v.wy(ROOF.y + roofY - 1.0) };
}

export default {
  beat: B,
  chapter: { num: '07', title: 'Babylon', sub: 'Sky-watchers' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.05, name: 'dive', gain: 0.32, pitch: 0.9 },
      { t: 2.3, name: 'deep', gain: 0.3, pitch: 0.8 },
      { t: T_LABEL + 0.05, name: 'ping', gain: 0.2, pitch: 0.9 },
      { t: T_GAZE + 0.1, name: 'shimmer', gain: 0.14, pitch: 1.2 },
    ];
  },
  drawWorld(c, v) {
    // act III (the calendar in the sky; the ERA readout says Paris / Moscow): the set bows out with the swing
    const t16 = v.tl.scenes[16].start;
    const kz = rooftopK(v) * (1 - L.ease.inOutCubic(L.prog(v.gt, t16 + 0.2, 1.3)));
    if (kz <= 0) return;
    const s = rooftopFrame(v);
    if (!s) return;
    c.save();
    c.globalAlpha = kz;
    c.translate(v.wx(ROOF.x), v.wy(ROOF.y));
    c.scale(s, s);
    const gt = v.gt;
    // which city stands on the horizon: Babylon (beats 7-10; it leaves while beat 11 is out at the globe), Rome
    // (beats 12-13, "Roman astrologers"), then a plain night horizon for today's languages (beats 14-15)
    const t11 = v.tl.scenes[11].start, t14 = v.tl.scenes[14].start;
    if (gt < t11 + 0.8) {
      // far → near
      c.save(); c.globalAlpha *= 0.92; city(c, gt, s); c.restore();
      ziggurat(c, gt, s);
      for (const p of PALMS) palm(c, p, gt, s);
      const lampF = 0.82 + 0.18 * L.noise1(gt * 4.2, 33);
      const roofY = house(c, gt, s, lampF);
      brazier(c, gt, roofY, s);
      watcher(c, gt, WATCH.x, roofY, s, lampF);
    } else {
      const kr = 1 - L.ease.inOutCubic(L.prog(gt, t14 - 0.1, 0.9));
      if (kr > 0) { c.globalAlpha *= kr; romanSet(c, gt, s); }
    }
    c.restore();
    // beats 12-13: the temple's pediment reaches into the caption band (y ≈ 1410-1490). A soft elliptical shade
    // (feathered on every side, no hard band) sits under the caption so the type reads off a dark ground, not the roof.
    const kRome = L.ease.inOutCubic(L.prog(gt, v.tl.scenes[12].start - 0.2, 0.6)) * (1 - L.ease.inOutCubic(L.prog(gt, t14 - 0.1, 0.9)));
    if (kRome > 0) {
      c.save();
      c.globalAlpha = kz * kRome;
      c.translate(540, 1448);
      c.scale(1, 0.2);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 470);
      g.addColorStop(0, 'rgba(3,4,9,0.62)'); g.addColorStop(0.55, 'rgba(3,4,9,0.45)'); g.addColorStop(1, 'rgba(3,4,9,0)');
      c.fillStyle = g;
      c.fillRect(-470, -470, 940, 940);
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    if (k <= 0.001) return;
    // gaze: a fine dashed hairline from the watcher's eye up into the empty sky (fades into beat 8)
    const kg = L.ease.inOutCubic(L.prog(t, T_GAZE, 0.9));
    if (kg > 0 && rooftopFrame(v)) {
      const e = watcherEye(v);
      const tx = v.wx(ROOF.x + 1.6), ty = v.wy(ROOF.y - 8.5);
      const x2 = L.lerp(e.x, tx, kg), y2 = L.lerp(e.y, ty, kg);
      c.save();
      const g = c.createLinearGradient(e.x, e.y, tx, ty);
      g.addColorStop(0, L.rgba(ACCENT, 0.85 * k)); g.addColorStop(0.7, L.rgba(ACCENT, 0.3 * k)); g.addColorStop(1, L.rgba(ACCENT, 0));
      c.strokeStyle = g; c.lineWidth = 2;
      c.setLineDash([3, 8]); c.lineDashOffset = -v.gt * 20;
      c.beginPath(); c.moveTo(e.x, e.y - 6); c.lineTo(x2, y2); c.stroke();
      c.restore();
    }
    L.bigLabel(c, { x: 96, y: 640, big: 'BABYLON', small: 'sky-watchers, c. 600 BC', k: k * L.enter(t, T_LABEL, 0.55), accent: ACCENT, size: 110 });
  },
};
