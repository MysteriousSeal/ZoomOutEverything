// Beat 17 — "Left uncorrected, | GPS would drift about ten kilometers every day."
// The camera dives out of orbit onto the night city at TRUE scale (18 m/px): Manhattan's skyline is a thin
// glittering band, the Hudson and the East River are dark gaps with shimmering reflections, Queens runs low and wide
// to the east. A white ring marks where you really are; the blue dot (the GPS fix) glides east along a 10 km ruler
// that draws itself over the city, with a soft trail. "10 km" lands on "ten". Thumbnail frame ≈ 80.5 s.
//
// PERSISTENT: the city beyond s01's street (STREET.x0 … x1) draws whenever the street is on screen at city scale
// (the climbs of beats 1-2 and 9-10, beat 17, the dive of beat 18), with s01's drawSkyline and its own seeds.
// The pins + ruler also carry the snap back at the start of beat 18 (shownDrift: back on YOU by b18 + 0.77 s, at city scale).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, DOT, DRIFT_M, beatStart, driftAt } from '../env.js';
import { STREET, drawSkyline } from './s01-from-space.js';
import { wordT } from './s04-atomic-clocks.js';
import { actK } from './s14-einstein.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const KM10 = 10000;

// ====================================================================== the city beyond the street
// x in metres east of the phone (Times Square). Heights scale per district (Queens and New Jersey run low).
const LAND = [
  { x0: -7600, x1: -2300, s: 0.3, seed: 6100 },      // New Jersey shore (Weehawken, Union City)
  { x0: -1300, x1: STREET.x0, s: 1, seed: 6200 },    // Midtown west
  { x0: STREET.x1, x1: 1900, s: 1, seed: 6300 },     // Midtown east
  { x0: 2500, x1: 3700, s: 0.62, seed: 6400 },       // Long Island City
  { x0: 3700, x1: 17000, s: 0.2, seed: 6500 },       // Queens: Sunnyside, Woodside, Jackson Heights …
];
// city lights at regional scale: a glittering band of sub-pixel windows and street lights over every district
const GLITTER = [...LAND, { x0: STREET.x0, x1: STREET.x1, s: 1, seed: 6600 }].map((seg) => {
  const r = L.rng(seg.seed + 99), out = [];
  for (let x = seg.x0; x < seg.x1; x += 9 + r() * 26) {
    const u = r();
    out.push({ x, h: (u * u * 0.85 + 0.03) * 230 * seg.s, warm: r() < 0.72, a: 0.3 + 0.55 * r(), ph: r() * TAU, sz: r() < 0.15 ? 2 : 1.3 });
  }
  return out;
}).flat();
const WATER = [{ x0: -2300, x1: -1300, seed: 71 }, { x0: 1900, x1: 2500, seed: 72 }];
const REFL = WATER.map((w) => {
  const r = L.rng(w.seed), out = [];
  for (let x = w.x0 + 20; x < w.x1 - 20; x += 22 + r() * 30) out.push({ x, len: 0.3 + r() * 0.7, ph: r() * TAU, warm: r() < 0.75 });
  return out;
});

// the snap home (beat 18) is drawn faster than env's driftAt so the dot lands on YOU while the camera is still at
// city scale (the dive is anchored on YOU: its screen position holds at x ≈ 257 while the zoom accelerates)
const SNAP0 = 0.02, SNAP_D = 0.75;   // seconds after beat 18 starts, duration
/** The drift the pins show (m): env's driftAt, but the return in beat 18 completes by b18 + 0.77 s. */
function shownDrift(gt, tl) {
  const d = driftAt(gt, tl), b18 = beatStart(tl, 18);
  if (gt < b18) return d;
  return Math.min(d, DRIFT_M * (1 - L.ease.inOutCubic(L.prog(gt, b18 + SNAP0, SNAP_D))));
}

// the ground plane in perspective: rows of street lights converging to the horizon (beats 17-18 only)
const ROWS = 18;
const RIVERS = [[-2300, -1300], [1900, 2500]];
const onWater = (x) => RIVERS.some(([a, b]) => x > a && x < b);
const districtS = (x) => { for (const seg of LAND) if (x >= seg.x0 && x < seg.x1) return seg.s; return 1; };
const CARPET = Array.from({ length: ROWS }, (_, i) => {
  const r = L.rng(7100 + i * 13), out = [];
  for (let x = -7600; x < 17000; x += 38 + r() * 46) {
    if (onWater(x)) continue;
    const s = districtS(x);
    if (r() > 0.45 + 0.55 * s) continue;            // sparser in Queens and New Jersey
    const cl = 0.3 + 0.9 * (0.5 + 0.5 * L.noise1(x / 900 + i * 0.37, 7));   // neighbourhood clustering
    out.push({ x, a: Math.min(1, (0.35 + 0.65 * r()) * (0.4 + 0.6 * s) * cl), warm: r() < 0.7, ph: r() * TAU });
  }
  return out;
});
const AVENUES = [];
for (let x = -1200; x <= 1800; x += 260) AVENUES.push(x);
for (let x = 2600; x <= 9000; x += 700) AVENUES.push(x);

function drawCarpet(c, v, hz, gy) {
  const b17 = beatStart(v.tl, 17), b18 = beatStart(v.tl, 18);
  const win = L.prog(v.gt, b17 + 0.6, 1.0) * (1 - L.prog(v.gt, b18 + 2.0, 0.5));
  const k = win * hz;
  if (k <= 0.002) return;
  const VX = W / 2, DEPTH = 330;
  const rowY = (u) => gy + 3 + DEPTH * Math.pow(u, 1.7);
  const rowS = (u) => 1 + 3.2 * Math.pow(u, 1.7);
  const proj = (sx, u) => VX + (sx - VX) * rowS(u);
  c.save();
  // the land: a faint warm ground glow, rivers cut as dark wedges converging to the horizon
  const lg = c.createLinearGradient(0, gy, 0, gy + DEPTH + 10);
  lg.addColorStop(0, `rgba(255,170,110,${0.1 * k})`); lg.addColorStop(1, 'rgba(255,170,110,0)');
  c.fillStyle = lg; c.fillRect(0, gy, W, DEPTH + 10);
  const wedge = (x0, x1) => {
    const a = v.wx(x0), b = v.wx(x1);
    c.beginPath();
    c.moveTo(a, gy); c.lineTo(b, gy); c.lineTo(proj(b, 1), rowY(1)); c.lineTo(proj(a, 1), rowY(1)); c.closePath();
  };
  const riverFill = c.createLinearGradient(0, gy, 0, rowY(1));
  riverFill.addColorStop(0, `rgba(6,10,22,${0.8 * k})`); riverFill.addColorStop(0.6, `rgba(6,10,22,${0.45 * k})`); riverFill.addColorStop(1, 'rgba(6,10,22,0)');
  const dX = v.wx(shownDrift(v.gt, v.tl));
  const dotK = pinsK(v);
  for (const [x0, x1] of RIVERS) {
    wedge(x0, x1);
    c.fillStyle = riverFill; c.fill();
    // the blue fix shimmers in the water when it passes over the river
    const mid = v.wx((x0 + x1) / 2), half = Math.abs(v.wx(x1) - v.wx(x0)) / 2 + 40;
    const near = L.clamp(1 - Math.abs(dX - mid) / (half + 80));
    if (near > 0 && dotK > 0) {
      c.save();
      wedge(x0, x1); c.clip();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const u = (i + 0.5) / 9, y = rowY(u), x = proj(dX, u);
        const fl = 0.6 + 0.4 * Math.sin(v.gt * 4.1 + i * 1.7);
        c.fillStyle = L.rgba(DOT, 0.5 * near * fl * dotK * k);
        c.fillRect(x - 10 * rowS(u), y - 1, 20 * rowS(u), 2);
      }
      c.restore();
    }
  }
  c.globalCompositeOperation = 'lighter';
  // avenues: faint warm streaks running to the vanishing point
  c.lineWidth = 1.2;
  for (const x of AVENUES) {
    const sx = v.wx(x);
    if (sx < -400 || sx > W + 400) continue;
    const g = c.createLinearGradient(0, gy, 0, rowY(1));
    g.addColorStop(0, `rgba(255,190,130,${0.16 * k})`); g.addColorStop(1, `rgba(255,190,130,${0.04 * k})`);
    c.strokeStyle = g;
    c.beginPath(); c.moveTo(sx, gy + 2); c.lineTo(proj(sx, 1), rowY(1)); c.stroke();
  }
  // the light rows (streets across): twinkling warm sodium and cool LED points
  for (let i = 0; i < ROWS; i++) {
    const u = (i + 1) / ROWS, y = rowY(u), sz = 1.1 + 1.5 * u;
    const fade = (1 - L.clamp((u - 0.8) / 0.25)) * (0.55 + 0.45 * (1 - u));
    for (const p of CARPET[i]) {
      const x = proj(v.wx(p.x), u);
      if (x < -3 || x > W + 3) continue;
      const tw = 0.65 + 0.35 * Math.sin(v.gt * 1.9 + p.ph);
      c.fillStyle = p.warm ? `rgba(255,196,135,${p.a * tw * fade * k})` : `rgba(175,205,255,${p.a * tw * fade * k})`;
      c.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
  }
  // the fix's blue glow on the city below it
  if (dotK > 0) {
    c.save();
    c.translate(proj(dX, 0.35), gy + 30); c.scale(1, 0.32);
    const bg = c.createRadialGradient(0, 0, 0, 0, 0, 150);
    bg.addColorStop(0, L.rgba(DOT, 0.32 * dotK * k)); bg.addColorStop(1, L.rgba(DOT, 0));
    c.fillStyle = bg; c.fillRect(-150, -150, 300, 300);
    c.restore();
  }
  c.restore();
}

/** City presence (0..1): the street is on screen and the camera is between street and regional scale. */
function cityK(v) {
  const mpp = v.cam.mpp, gy = v.wy(0);
  if (mpp >= 320 || gy < -40 || gy > H + 200) return 0;
  return 1 - L.clamp(L.invLerp(Math.log(90), Math.log(320), Math.log(mpp)));
}

const exaggeration = (mpp) => 1 + 4.6 * L.clamp(L.invLerp(Math.log(3), Math.log(12), Math.log(mpp)));
/** Lit windows at sub-window scale: a deterministic speckle of warm/cool points up each tower's (exaggerated) face. */
const FACADES = new Map();
function facadePts(seg) {
  if (FACADES.has(seg.seed)) return FACADES.get(seg.seed);
  const r = L.rng(seg.seed * 7 + 3), out = [];
  for (let x = seg.x0; x < seg.x1; x += 6 + r() * 14) {
    const u = r();
    const h = (u * u * u * 0.9 + 0.08) * 330 * seg.s;
    for (let y = 8 + r() * 10; y < h; y += 9 + r() * 16) if (r() < 0.55) out.push({ x: x + r() * 4, y, warm: r() < 0.75, a: 0.35 + 0.6 * r(), ph: r() * TAU });
  }
  FACADES.set(seg.seed, out);
  return out;
}
function drawFacadeLights(c, v, seg, sc, hz) {
  const pts = facadePts(seg);
  const dim = seg.s >= 1 ? 1 : 0.45 + 0.55 * seg.s;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    const x = v.wx(p.x);
    if (x < -2 || x > W + 2) continue;
    const tw = 0.75 + 0.25 * Math.sin(v.gt * 1.3 + p.ph);
    c.fillStyle = p.warm ? `rgba(255,196,130,${p.a * tw * hz * dim * 0.75})` : `rgba(170,200,255,${p.a * tw * hz * dim * 0.6})`;
    c.fillRect(x - 0.6, v.wy(-p.y * sc) - 0.6, 1.2, 1.2);
  }
  c.restore();
}
function drawCity(c, v) {
  const k = cityK(v);
  if (k <= 0) return;
  const mpp = v.cam.mpp, gy = v.wy(0);
  const vx0 = v.cam.x - (W / 2 + 60) * mpp, vx1 = v.cam.x + (W / 2 + 60) * mpp;
  if (vx1 < -7600 || vx0 > 17000) return;
  const hz = L.clamp(L.invLerp(Math.log(2), Math.log(8), Math.log(mpp)));   // horizon effects at city scale only
  c.save();
  c.globalAlpha = k;
  // sodium haze over the whole horizon, stronger over Midtown (the city's light dome)
  if (hz > 0) {
    const hg = c.createLinearGradient(0, gy, 0, gy - 260);
    hg.addColorStop(0, `rgba(255,170,105,${0.16 * hz})`); hg.addColorStop(0.4, `rgba(255,170,105,${0.05 * hz})`); hg.addColorStop(1, 'rgba(255,170,105,0)');
    c.fillStyle = hg; c.fillRect(0, gy - 260, W, 260);
    const mx = v.wx(300), mr = 7000 / mpp;
    c.save();
    c.translate(mx, gy); c.scale(1, Math.min(1, 290 / mr));
    const dg = c.createRadialGradient(0, 0, 0, 0, 0, mr);
    dg.addColorStop(0, `rgba(255,182,120,${0.3 * hz})`); dg.addColorStop(0.35, `rgba(255,182,120,${0.12 * hz})`); dg.addColorStop(1, 'rgba(255,182,120,0)');
    c.fillStyle = dg; c.fillRect(-mr, -mr, mr * 2, mr);
    c.restore();
  }
  // at city scale (≈ 12 m/px) true heights are only ~30 px: the skyline is drawn with a vertical exaggeration
  // (up to 5.6×) so Midtown reads as a lit Manhattan profile, with dimmer, lower boroughs out to +15 km
  const EX = exaggeration(mpp);
  if (hz > 0) {
    // the city's light dome: a tall soft glow behind the towers (fills the sky above the horizon)
    const dh = 620;
    const hg2 = c.createLinearGradient(0, gy, 0, gy - dh);
    hg2.addColorStop(0, `rgba(120,96,110,${0.22 * hz})`); hg2.addColorStop(0.35, `rgba(60,58,92,${0.12 * hz})`); hg2.addColorStop(1, 'rgba(30,36,70,0)');
    c.fillStyle = hg2; c.fillRect(0, gy - dh, W, dh);
  }
  for (const seg of [...LAND, { x0: STREET.x0, x1: STREET.x1, s: 1.08, seed: 6700, core: true }]) {
    if (seg.x1 < vx0 || seg.x0 > vx1) continue;
    if (seg.core && EX < 1.05) continue;                 // s01 draws the street itself at true height
    const lift = L.clamp((EX - 1) / 1.6);                // low boroughs lift a little at city scale so they read
    const sEff = seg.s < 0.55 ? L.lerp(seg.s, 0.55, lift) : seg.s;
    const sc = sEff * EX;
    const sv = sc === 1 ? v : { ...v, wy: (y) => v.wy(y * sc) };
    drawSkyline(c, sv, seg.x0, seg.x1, { seed: seg.seed, far: true });
    if (hz > 0 && sc > 1.05) drawFacadeLights(c, v, seg, EX, hz);
  }
  if (EX > 1.05) drawLandmarks(c, v, EX, hz);
  // rivers: a dark band at the waterline + shimmering reflections of the far shore's lights
  WATER.forEach((w, i) => {
    const sx0 = v.wx(w.x0), sx1 = v.wx(w.x1);
    if (sx1 < 0 || sx0 > W) return;
    c.fillStyle = 'rgba(14,22,40,0.9)';
    c.fillRect(sx0, gy - 1, sx1 - sx0, Math.max(2, 3 * hz));
    if (hz <= 0) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const r of REFL[i]) {
      const x = v.wx(r.x);
      if (x < -4 || x > W + 4) continue;
      const fl = 0.55 + 0.45 * Math.sin(v.gt * 2.3 + r.ph);
      const len = Math.min(16, (5 + 9 * r.len) * hz);
      const g = c.createLinearGradient(0, gy, 0, gy + len);
      const col = r.warm ? [255, 196, 130] : [170, 195, 240];
      g.addColorStop(0, L.rgba(col, 0.28 * fl * hz)); g.addColorStop(1, L.rgba(col, 0));
      c.fillStyle = g;
      c.fillRect(x - 0.6, gy + 1, 1.4, len);
    }
    c.restore();
  });
  // glitter: the city's lights read as a band of tiny points (real windows take over below ~3 m/px)
  const gk = hz * (1 - L.clamp(L.invLerp(Math.log(7), Math.log(3), Math.log(mpp))));
  if (gk > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const p of GLITTER) {
      const x = v.wx(p.x);
      if (x < -2 || x > W + 2) continue;
      const tw = 0.7 + 0.3 * Math.sin(v.gt * 1.7 + p.ph);
      c.fillStyle = p.warm ? `rgba(255,200,140,${p.a * tw * gk})` : `rgba(175,200,255,${p.a * tw * gk})`;
      c.fillRect(x - p.sz / 2, v.wy(-p.h * EX) - p.sz / 2, p.sz, p.sz);
    }
    c.restore();
  }
  drawCarpet(c, v, hz, gy);
  // warm light spilling onto the ground under the whole city
  if (hz > 0) {
    const sg = c.createLinearGradient(0, gy, 0, gy + 46);
    sg.addColorStop(0, `rgba(255,170,105,${0.12 * hz})`); sg.addColorStop(1, 'rgba(255,170,105,0)');
    c.fillStyle = sg; c.fillRect(0, gy, W, 46);
  }
  c.restore();
}

// ====================================================================== Midtown landmarks
// Silhouettes at their true east-west offsets from Times Square (the side view looks north across Manhattan) and true
// heights (× the same exaggeration): the Empire State Building, the Chrysler Building, 432 Park Avenue.
// Each: x (m east of the phone), tiers [height to (m), half-width (m)] bottom-up, spire [top (m), half-width (m)].
const LANDMARKS = [
  { x: -15, tiers: [[86, 62], [262, 42], [320, 26], [373, 13]], spire: [443, 2.5], top: [205, 225, 255] },   // Empire State
  { x: 840, tiers: [[60, 44], [230, 28], [250, 21], [262, 17], [274, 13], [284, 9]], spire: [319, 1.6], top: [255, 236, 200] }, // Chrysler
  { x: 1150, tiers: [[426, 15]], top: [255, 214, 170] },                                                         // 432 Park Ave
];
function drawLandmarks(c, v, EX, hz) {
  const mpp = v.cam.mpp;
  const WID = 1 + 1.3 * L.clamp((EX - 1) / 4.6);       // widened with the height exaggeration so the profiles stay recognisable
  const minW = 1.2 * mpp;                              // never thinner than ~1 px
  for (const lm of LANDMARKS) {
    const sx = v.wx(lm.x);
    if (sx < -80 || sx > W + 80) continue;
    const path = () => {
      c.beginPath();
      let h0 = 0;
      const left = [], right = [];
      for (const [h, hw] of lm.tiers) { const w = Math.max(minW, hw * WID); left.push([lm.x - w, h0], [lm.x - w, h]); right.push([lm.x + w, h0], [lm.x + w, h]); h0 = h; }
      if (lm.spire) { const w = Math.max(minW * 0.6, lm.spire[1] * WID); left.push([lm.x - w, h0], [lm.x, lm.spire[0]]); right.push([lm.x + w, h0]); }
      const pts = [...left, ...right.reverse()];
      pts.forEach(([x, h], i) => { const X = v.wx(x), Y = v.wy(-h * EX); if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
      c.closePath();
    };
    c.save();
    // a cool rim (sky glow) then the dark body
    path(); c.strokeStyle = `rgba(150,160,200,${0.35 * hz})`; c.lineWidth = 2; c.stroke();
    const g = c.createLinearGradient(0, v.wy(0), 0, v.wy(-lm.tiers[lm.tiers.length - 1][0] * EX));
    g.addColorStop(0, 'rgb(10,12,20)'); g.addColorStop(1, 'rgb(22,24,38)');
    path(); c.fillStyle = g; c.fill();
    // lit windows: a regular grid of warm points up the body
    path(); c.clip();
    c.globalCompositeOperation = 'lighter';
    const r = L.rng(Math.round(lm.x) + 9000);
    const top = lm.tiers[lm.tiers.length - 1][0];
    for (let h = 10; h < top; h += 3.2 * mpp / EX) {
      const hw = (lm.tiers.find(([th]) => th >= h) || lm.tiers[0])[1] * WID;
      for (let x = -hw + 4; x < hw - 2; x += Math.max(4, 3 * mpp)) {
        if (r() > 0.45) continue;
        c.fillStyle = r() < 0.75 ? `rgba(255,200,140,${(0.35 + 0.5 * r()) * hz})` : `rgba(175,205,255,${0.5 * hz})`;
        c.fillRect(v.wx(lm.x + x) - 0.6, v.wy(-h * EX) - 0.6, 1.3, 1.3);
      }
    }
    c.restore();
    // the floodlit crown
    const crownH = lm.tiers[lm.tiers.length - 1][0];
    const cy = v.wy(-crownH * EX);
    L.lightBlob(c, sx, cy, 26, lm.top, 0.5 * hz);
    if (lm.spire) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = L.rgba(lm.top, 0.75 * hz); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(sx, cy); c.lineTo(sx, v.wy(-lm.spire[0] * EX)); c.stroke();
      c.restore();
      // aircraft warning light
      const blink = 0.5 + 0.5 * Math.sin(v.gt * 3.2 + lm.x);
      L.lightBlob(c, sx, v.wy(-lm.spire[0] * EX), 10, [255, 70, 60], 0.8 * blink * hz);
    }
  }
}

// ====================================================================== you, the drifting dot, the 10 km ruler
const PIN_PX = 250;     // pins float this high over the street (screen px), clear of the tallest towers
const RULE_PX = 310;    // the ruler, above the pins

function times(tl) {
  const b17 = beatStart(tl, 17), b18 = beatStart(tl, 18);
  return { b17, b18, ten: b17 + wordT(tl, 17, 1, 4), every: b17 + wordT(tl, 17, 1, 6) };
}
/** Pins + ruler presence: city scale (≈ 1.5 – 250 m/px), from the arrival over the city to the dive home. */
function pinsK(v) {
  const { b17, b18 } = times(v.tl);
  const mpp = v.cam.mpp;
  const sc = L.clamp(L.invLerp(Math.log(1.1), Math.log(2.6), Math.log(mpp))) * (1 - L.clamp(L.invLerp(Math.log(120), Math.log(420), Math.log(mpp))));
  const win = L.prog(v.gt, b17 + 1.2, 0.5) * (1 - L.prog(v.gt, b18 + 2.2, 0.3));
  return sc * win;
}

function youPin(c, x, gy, k) {
  const y = gy - PIN_PX;
  c.save();
  c.globalAlpha *= k;
  c.strokeStyle = 'rgba(235,240,250,0.45)'; c.lineWidth = 1.5;
  c.setLineDash([3, 5]);
  c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x, gy - 2); c.stroke();
  c.setLineDash([]);
  c.fillStyle = 'rgba(235,240,250,0.35)';
  c.beginPath(); c.ellipse(x, gy, 9, 2.5, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(245,248,255,0.95)'; c.lineWidth = 3;
  c.beginPath(); c.arc(x, y, 14, 0, TAU); c.stroke();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill();
  c.font = L.font(19, 700, L.FONT.body);
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 6;
  c.fillStyle = 'rgba(235,242,255,0.9)';
  L.trackedText(c, 'YOU', x, gy + 40, 3, 'center');
  c.restore();
}

function dotPin(c, v, x, gy, k, tx) {
  const y = gy - PIN_PX;
  c.save();
  c.globalAlpha *= k;
  // trail: where the dot was a moment ago
  if (Math.abs(tx - x) > 3) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(tx, 0, x, 0);
    g.addColorStop(0, L.rgba(DOT, 0)); g.addColorStop(1, L.rgba(DOT, 0.7));
    c.strokeStyle = g; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx, y); c.lineTo(x, y); c.stroke();
    c.restore();
  }
  c.strokeStyle = L.rgba(DOT, 0.55); c.lineWidth = 1.5;
  c.setLineDash([3, 5]);
  c.beginPath(); c.moveTo(x, y + 20); c.lineTo(x, gy - 2); c.stroke();
  c.setLineDash([]);
  c.fillStyle = L.rgba(DOT, 0.45);
  c.beginPath(); c.ellipse(x, gy, 10, 3, 0, 0, TAU); c.fill();
  const br = 1 + 0.07 * Math.sin(v.gt * 3.1);
  L.lightBlob(c, x, y, 78 * br, DOT, 0.75);
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(x, y, 17, 0, TAU); c.fill();
  c.fillStyle = L.rgba(DOT);
  c.beginPath(); c.arc(x, y, 12.5, 0, TAU); c.fill();
  c.restore();
}

function drawRuler(c, v, k, gy) {
  const { b17, b18 } = times(v.tl);
  const draw = L.ease.inOutCubic(L.prog(v.gt, b17 + 1.75, 0.9));
  const out = 1 - L.ease.inCubic(L.prog(v.gt, b18 + SNAP0 + SNAP_D, 0.4));
  const kk = k * out;
  if (draw <= 0 || kk <= 0.002) return;
  const x0 = v.wx(0), x1 = v.wx(KM10), y = gy - RULE_PX;
  const xe = L.lerp(x0, x1, draw);
  const dx = v.wx(Math.max(0, shownDrift(v.gt, v.tl)));
  c.save();
  c.globalAlpha *= kk;
  // backing so the ruler holds over stars
  c.strokeStyle = 'rgba(235,240,250,0.5)'; c.lineWidth = 2;
  c.setLineDash([2, 6]);
  c.beginPath(); c.moveTo(x0, y); c.lineTo(xe, y); c.stroke();
  c.setLineDash([]);
  // km ticks
  c.beginPath();
  for (let km = 0; km <= 10; km++) {
    const x = v.wx(km * 1000);
    if (x > xe + 0.5) break;
    const h = km === 0 || km === 10 ? 16 : km === 5 ? 10 : 6;
    c.moveTo(x, y - h); c.lineTo(x, y + (km === 0 || km === 10 ? 6 : 0));
  }
  c.strokeStyle = 'rgba(235,240,250,0.85)'; c.lineWidth = 2;
  c.stroke();
  // the distance covered so far: solid, lit
  if (dx > x0 + 1) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = L.rgba(DOT, 0.95); c.lineWidth = 3;
    c.beginPath(); c.moveTo(x0, y); c.lineTo(Math.min(dx, xe), y); c.stroke();
    c.strokeStyle = L.rgba(DOT, 0.18); c.lineWidth = 12;
    c.beginPath(); c.moveTo(x0, y); c.lineTo(Math.min(dx, xe), y); c.stroke();
    c.restore();
  }
  c.restore();
}

/** Seconds since the dot reached 10 km (−1 before). */
function arrivedT(v) {
  const { b17 } = times(v.tl);
  const tEnd = b17 + (wordT(v.tl, 17, 1, 0) - 0.1) + 2.8;   // mirrors driftAt: starts on "GPS…", 2.8 s glide
  return v.gt >= tEnd ? v.gt - tEnd : -1;
}

function drawPins(c, v) {
  const k = pinsK(v);
  if (k <= 0.002) return;
  const gy = v.wy(0);
  if (gy < 0 || gy > H) return;
  drawRuler(c, v, k, gy);
  const drift = shownDrift(v.gt, v.tl);
  const x = v.wx(drift), tx = v.wx(shownDrift(v.gt - 0.18, v.tl));
  const { b18 } = times(v.tl);
  // the snap home: a bright streak from where the dot had drifted back to the dot as it returns to YOU
  const sr = L.prog(v.gt, b18 + SNAP0, SNAP_D), sOut = 1 - L.ease.inCubic(L.prog(v.gt, b18 + SNAP0 + SNAP_D, 0.35));
  if (sr > 0 && sOut > 0) {
    const x10 = Math.min(W + 40, v.wx(KM10)), y = gy - PIN_PX;
    c.save();
    c.globalAlpha *= k * sOut;
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(x10, 0, x, 0);
    g.addColorStop(0, L.rgba(DOT, 0)); g.addColorStop(0.7, L.rgba(DOT, 0.35)); g.addColorStop(1, L.rgba(DOT, 0.95));
    c.strokeStyle = g; c.lineCap = 'round';
    c.lineWidth = 14; c.globalAlpha *= 0.45; c.beginPath(); c.moveTo(x10, y); c.lineTo(x, y); c.stroke();
    c.globalAlpha /= 0.45;
    c.lineWidth = 4; c.beginPath(); c.moveTo(x10, y); c.lineTo(x, y); c.stroke();
    c.restore();
  }
  youPin(c, v.wx(0), gy, k * L.ease.outBack(L.clamp(L.prog(v.gt, times(v.tl).b17 + 1.2, 0.5)), 1.6));
  // arrival at 10 km: a ring + a flash on the end of the ruler
  const at = arrivedT(v);
  if (at >= 0 && at < 1.2) {
    const e = L.ease.outCubic(at / 1.2);
    c.save();
    c.globalAlpha *= k;
    c.strokeStyle = L.rgba(DOT, 0.8 * (1 - e)); c.lineWidth = 2.5;
    c.beginPath(); c.arc(x, gy - PIN_PX, Math.max(0, 18 + 70 * e), 0, TAU); c.stroke();
    c.restore();
    L.lightBlob(c, v.wx(KM10), gy - RULE_PX, 60 + 80 * e, DOT, 0.6 * (1 - e) * k);
  }
  dotPin(c, v, x, gy, k, tx);
  // the snap home (beat 18): a ping on YOU as the dot lands back
  const home = L.prog(v.gt, b18 + SNAP0 + SNAP_D - 0.04, 0.9);
  if (home > 0 && home < 1) {
    const e = L.ease.outCubic(home);
    L.lightBlob(c, v.wx(0), gy - PIN_PX, 60 + 110 * e, DOT, 0.9 * (1 - home) * k);
    c.save();
    c.globalAlpha *= k;
    c.strokeStyle = `rgba(235,242,255,${0.85 * (1 - e)})`; c.lineWidth = 3;
    c.beginPath(); c.arc(v.wx(0), gy - PIN_PX, Math.max(0, 18 + 80 * e), 0, TAU); c.stroke();
    c.restore();
  }
}

/** The dive (beat 17 travel): the blue dot stays on screen at a constant size so the camera visibly dives onto it,
 *  rising from the limb to the pin height as the city comes in, and handing over to the pin as it fades in. */
function drawTravelDot(c, v) {
  const { b17, b18 } = times(v.tl);
  if (v.gt < b17 - 0.2 || v.gt > b18) return;
  const k = (1 - actK(v)) * (1 - L.clamp(pinsK(v) * 1.3));
  if (k <= 0.002) return;
  const mpp = v.cam.mpp;
  const s = L.ease.inOutCubic(L.clamp(L.invLerp(Math.log(3000), Math.log(300), Math.log(mpp))));
  const x = v.wx(shownDrift(v.gt, v.tl)), y = v.wy(0) - PIN_PX * s;
  if (x < -100 || x > W + 100 || y < -100 || y > H + 100) return;
  const r = L.lerp(10.5, 17, s), br = 1 + 0.06 * Math.sin(v.gt * 3.1);
  L.lightBlob(c, x, y, L.lerp(56, 78, s) * br, DOT, 0.8 * k);
  c.save();
  c.globalAlpha *= k;
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();
  c.fillStyle = L.rgba(DOT);
  c.beginPath(); c.arc(x, y, Math.max(0, r * 0.73), 0, TAU); c.fill();
  c.restore();
}

export default {
  beat: 17,
  chapter: { num: '17', title: 'Uncorrected', sub: 'the error adds up' },
  captions: true,
  layer: 4,
  cues(d) {
    void d;
    // "GPS…" ≈ 1.80 s (drift starts 1.70, 2.8 s glide), "ten" ≈ 3.17 s, arrival ≈ 4.50 s
    return [
      { t: 0.05, name: 'dive', gain: 0.42, pitch: 0.9 },          // out of orbit, down to the city
      { t: 1.25, name: 'blip', gain: 0.2, pitch: 1.0 },           // you + the dot appear
      { t: 1.75, name: 'swish', gain: 0.22, pitch: 0.9 },         // the ruler draws itself
      { t: 1.8, name: 'riser', gain: 0.22, pitch: 0.95 },         // the dot starts to drift
      { t: 3.1, name: 'tick', gain: 0.22, pitch: 1.1 },           // "10 km" lands
      { t: 4.5, name: 'impact', gain: 0.38, pitch: 1.05 },        // the dot reaches 10 km
      { t: 4.52, name: 'ping', gain: 0.3, pitch: 0.85 },
    ];
  },
  drawWorld(ctx, v) {
    drawCity(ctx, v);
    drawPins(ctx, v);
    drawTravelDot(ctx, v);
  },
  drawOverlay(ctx, v) {
    const { ten } = times(v.tl);
    const k = v.k * L.enter(v.gt, ten - 0.12, 0.55) * pinsK(v);
    if (k <= 0) return;
    const gy = v.wy(0);
    const cx = (v.wx(0) + v.wx(KM10)) / 2, by = gy - RULE_PX - 92;
    // scrim
    ctx.save();
    ctx.globalAlpha = L.clamp(k);
    ctx.translate(cx, by - 40); ctx.scale(1, 0.45);
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 360);
    g.addColorStop(0, 'rgba(3,6,14,0.6)'); g.addColorStop(0.6, 'rgba(3,6,14,0.35)'); g.addColorStop(1, 'rgba(3,6,14,0)');
    ctx.fillStyle = g; ctx.fillRect(-360, -360, 720, 720);
    ctx.restore();
    L.bigLabel(ctx, { x: cx, y: by, big: '10 km', small: 'about 6 mi · every day', k, accent: ACCENT, align: 'center', size: 132 });
  },
};
