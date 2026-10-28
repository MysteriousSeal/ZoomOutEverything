// Environment for "The Man Who Survived Two Atomic Bombs" (Zoom Out 32, Hidden History).
//
// DRAWS (every frame):
//   drawBackground  the real-coastline map of western Japan (earth.js, dusk-navy sea, slate land, ivory coast), a
//                   faint 1° graticule, the night tint of beat 3.
//   drawForeground  the persistent world: the two cities (pins, English + kanji names), the railway between them,
//                   the scorched 3 km marks after each flash, Yamaguchi's marker (business trip, train home).
//   drawHud         top bar + the date chip (top left: 6 AUG 1945 → 7 AUG → 9 AUG; hidden in the hook and from beat 6).
// Shared components for the scenes: card plates, the clock card, the flash bloom, the 3 KM lens.
// FACTS (script.md): Hiroshima 6 Aug 1945 8:15 a.m. · Nagasaki 9 Aug 1945 11:02 a.m. · ≈ 3 km both times ·
// train home on 7 Aug · officially recognised 2009, the only "nijū hibakusha" · 1916–2010, 93.
import * as L from '../../../engine/runtime/lib.js';
import { topBar, beatCues } from '../../../engine/runtime/kit.js';
import { drawEarth, project, elevation } from '../../../engine/runtime/earth.js';
import { toLL, toW, HIRO, NAGA, AY, B, BE, PH, PE, W } from './camera.js';

export { B, BE, PH, PE, W, HIRO, NAGA };
const { W: SW, H } = L;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ palette
export const ACC = [235, 150, 70];          // restrained amber-red accent
export const EMBER = [214, 92, 58];         // deeper red-amber (flash core edge, injuries)
export const IVORY = [242, 234, 216];       // paper
export const PAPER = [236, 226, 204];
export const INKP = [30, 28, 34];           // ink on paper
export const NAVY = [12, 20, 36];           // dusk navy
export const PLATE = [14, 22, 38];          // opaque card plate
export const MUTED = [168, 176, 192];
export const KANJI = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Hiragino Mincho ProN", sans-serif';
export const kfont = (s, w = 600) => `${w} ${s}px ${KANJI}`;

/** frame-quantised time (frame-stable digits) */
export const gq = (gt) => Math.round(gt * 30) / 30;

// ------------------------------------------------------------------ the map
export function mapView(v) {
  const ll = toLL(v.cam.x, v.cam.y);
  return { cx: SW / 2, cy: AY, r: 6371 / v.cam.mpp, lon0: ll.lon, lat0: ll.lat };
}
/** screen position of a lat/lon on this frame's map */
export function geo(v, lat, lon) { const p = project(lat, lon, mapView(v)); return { x: p.x, y: p.y }; }
/** pixels per km on this frame's map */
export const pxkm = (v) => 1 / v.cam.mpp;
/** point at `km` from p along compass bearing `brg` (deg) */
export function offset(p, km, brg) {
  return { lat: p.lat + (km * Math.cos(brg * DEG)) / 110.9, lon: p.lon + (km * Math.sin(brg * DEG)) / (111.32 * Math.cos(p.lat * DEG)) };
}
// Yamaguchi's position ≈ 3 km from each ground zero (the Mitsubishi works lay south-west / south of each centre)
export const HIM_H = offset(HIRO, 3, 215);
export const HIM_N = offset(NAGA, 3, 190);

// The railway (approximate 1945 route): San'yō line west from Hiroshima along the Inland Sea coast to Shimonoseki,
// the Kanmon tunnel to Moji, the Kagoshima line Kokura → Hakata → Tosu, the Nagasaki line Tosu → Saga → Isahaya →
// Nagasaki.
export const RAIL = [
  [34.397, 132.475], [34.37, 132.40], [34.335, 132.33], [34.30, 132.30], [34.23, 132.24], [34.17, 132.22],
  [34.08, 132.16], [33.96, 132.10], [33.98, 131.98], [34.05, 131.81], [34.05, 131.67], [34.05, 131.56],
  [34.09, 131.40], [34.07, 131.27], [34.05, 131.16], [34.00, 131.02], [33.95, 130.93], [33.90, 130.93],
  [33.886, 130.882], [33.86, 130.80], [33.86, 130.71], [33.80, 130.60], [33.69, 130.48], [33.59, 130.42],
  [33.48, 130.48], [33.38, 130.52], [33.30, 130.40], [33.264, 130.297], [33.21, 130.13], [33.11, 130.10],
  [33.02, 130.17], [32.93, 130.12], [32.86, 130.07], [32.844, 130.053], [32.80, 129.95], [32.752, 129.870],
];
/** cumulative length (in degrees-ish, lon scaled) along RAIL, for travel-at-fraction */
const RAIL_CUM = (() => {
  const c = [0];
  for (let i = 1; i < RAIL.length; i++) {
    const [a, b] = RAIL[i - 1], [p, q] = RAIL[i];
    c.push(c[i - 1] + Math.hypot(p - a, (q - b) * 0.833));
  }
  return c;
})();
/** lat/lon at fraction f (0 = Hiroshima, 1 = Nagasaki) along the railway, plus heading */
export function railAt(f) {
  const tot = RAIL_CUM[RAIL_CUM.length - 1], d = L.clamp(f) * tot;
  let i = 1;
  while (i < RAIL_CUM.length - 1 && RAIL_CUM[i] < d) i++;
  const k = L.invLerp(RAIL_CUM[i - 1], RAIL_CUM[i], d);
  const [a, b] = RAIL[i - 1], [p, q] = RAIL[i];
  return { lat: L.lerp(a, p, k), lon: L.lerp(b, q, k), i, k };
}
/** trace the railway between fractions f0..f1 on screen (path only; caller strokes) */
export function railPath(c, v, f0, f1) {
  const tot = RAIL_CUM[RAIL_CUM.length - 1];
  const a = railAt(f0), b = railAt(f1);
  c.beginPath();
  let p = geo(v, a.lat, a.lon);
  c.moveTo(p.x, p.y);
  for (let i = a.i; i < RAIL.length && RAIL_CUM[i] < f1 * tot; i++) { p = geo(v, RAIL[i][0], RAIL[i][1]); c.lineTo(p.x, p.y); }
  p = geo(v, b.lat, b.lon);
  c.lineTo(p.x, p.y);
}

// ------------------------------------------------------------------ moments (every word-locked instant, from the timeline)
export function moments(tl) {
  return {
    hookCity2: PH(tl, 0, 1),                // THEN NAGASAKI. + Nagasaki pin lights
    august6: W(tl, 1, 0, 0), sixth: W(tl, 1, 0, 1), y1945: W(tl, 1, 0, 2),
    name: W(tl, 1, 1, 0), engineer: W(tl, 1, 1, 3),
    tripGo: W(tl, 1, 1, 7, -0.25), tripAt: W(tl, 1, 1, 10, 0.25),          // marker Nagasaki → Hiroshima, lands on "Hiroshima"
    eightFifteen: W(tl, 2, 0, 2), explodes: W(tl, 2, 0, 5), threeKm: W(tl, 2, 0, 7),
    eardrums: W(tl, 2, 1, 1), skin: W(tl, 2, 1, 4), burned: W(tl, 2, 1, 6), survives1: W(tl, 2, 2, 2),
    nextDay: W(tl, 3, 0, 1), wounded: W(tl, 3, 0, 3), train: W(tl, 3, 0, 5), trainGo: W(tl, 3, 0, 5, -0.1), homeWord: W(tl, 3, 1, 0), nagasakiWord: W(tl, 3, 1, 2),
    august9: W(tl, 4, 0, 0), bandaged: W(tl, 4, 1, 0), tells: W(tl, 4, 2, 1), flashWord1: W(tl, 4, 2, 7),
    happens: W(tl, 5, 0, 3), flash2: W(tl, 5, 1, 1), threeKm2: W(tl, 5, 1, 3),
    survives2: W(tl, 6, 0, 1), officially: W(tl, 6, 1, 2), both: W(tl, 6, 1, 9), y2009: W(tl, 6, 1, 12),
    lived: W(tl, 6, 2, 1), ninety: W(tl, 6, 2, 3),
    choices: [W(tl, 7, 0, 0), W(tl, 7, 0, 2)], comments: PH(tl, 7, 1),
    dock1: PE(tl, 1, 0, -0.1), dock2: W(tl, 4, 1, 0, -0.3),   // the calendars shrink into the date chip
  };
}

// ------------------------------------------------------------------ flashes (one bloom each, no strobe)
export const flashTimes = (tl) => [moments(tl).explodes, moments(tl).flash2];
/** 0..1 bloom envelope t seconds after the flash: fast rise (0.12 s), slow smooth decay (≈ 2.2 s) */
export function bloomEnv(t) {
  if (t < -0.05) return 0;
  const up = L.smoothstep(L.prog(t, -0.05, 0.17));
  const down = 1 - L.smoothstep(L.prog(t, 0.12, 2.2));
  return up * down;
}

// ------------------------------------------------------------------ background: the map
export function drawBackground(c, v) {
  const tl = v.tl, gt = v.gt;
  c.fillStyle = L.rgba(NAVY);
  c.fillRect(0, 0, SW, H);
  const view = mapView(v);
  // the globe as a backdrop only (flat, no raster coastline) ...
  drawEarth(c, {
    ...view, style: 'night', lights: false, atmosphere: false,
    ocean: [20, 36, 62], land: [76, 79, 88], coast: null, relief: 0,
  });
  // ... covered, over the whole region, by the map baked from the real elevation (see buildMap) + its contour line
  drawMap(c, view);
  coastline(c, view, v.cam.mpp);
  // night tint over the train ride (beat 3), dawn back by beat 4
  const night = L.smoothstep(L.prog(gt, B(tl, 3, 0.1), 1.2)) * (1 - L.smoothstep(L.prog(gt, B(tl, 4, -0.2), 1.2)));
  if (night > 0) { c.fillStyle = `rgba(4,8,22,${0.38 * night})`; c.fillRect(0, 0, SW, H); }
  // graticule: 0.5° lines, very faint
  graticule(c, v);
}

// ------------------------------------------------------------------ the map, baked from the real elevation data
// The engine's raster globe takes its relief slope per 0.1° data cell (square blocks when magnified) and its coast
// follows the bilinear 0.1° grid (stair-steps / scallops at close range). So the map of the region is baked ONCE here:
// the 0.1° elevation grid (earth.js elevation(), exact at the nodes) is upsampled ×8 with Catmull-Rom bicubic
// interpolation (C1-smooth: real ridges and valleys, a smooth shoreline), land = an even slate with gentle north-west
// hillshade, sea = the same depth ramp as the globe, an antialiased shore. The coastline is the 0 m contour of the SAME
// fine grid (marching squares, one Chaikin pass), so line and land always agree. Drawn per frame in 1° blocks, each
// placed with the affine map through its projected corners (orthographic ≈ affine over 1°).
const RG = { lat0: 24.05, lat1: 43.95, lon0: 118.05, lon1: 145.95, up: 8 };
const RN = { h: Math.round((RG.lat1 - RG.lat0) / 0.1) + 1, w: Math.round((RG.lon1 - RG.lon0) / 0.1) + 1 };
const FW = (RN.w - 1) * RG.up, FH = (RN.h - 1) * RG.up, TPD = 10 * RG.up;   // fine grid size, texels per degree
let fineE = null, mapTex = null, coastChains = null;
function fineElevation() {
  if (fineE) return fineE;
  const g = new Float32Array(RN.h * RN.w);
  for (let i = 0; i < RN.h; i++) for (let j = 0; j < RN.w; j++) g[i * RN.w + j] = elevation(RG.lat1 - i * 0.1, RG.lon0 + j * 0.1);
  const up = RG.up, at = (i, j) => g[L.clamp(i, 0, RN.h - 1) * RN.w + L.clamp(j, 0, RN.w - 1)];
  const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const rowUp = new Float32Array(RN.h * FW);
  for (let i = 0; i < RN.h; i++) for (let x = 0; x < FW; x++) {
    const fj = x / up, j = Math.floor(fj), t = fj - j;
    rowUp[i * FW + x] = cr(at(i, j - 1), at(i, j), at(i, j + 1), at(i, j + 2), t);
  }
  const ra = (i, x) => rowUp[L.clamp(i, 0, RN.h - 1) * FW + x];
  fineE = new Float32Array(FW * FH);
  for (let y = 0; y < FH; y++) {
    const fi = y / up, i = Math.floor(fi), t = fi - i;
    for (let x = 0; x < FW; x++) fineE[y * FW + x] = cr(ra(i - 1, x), ra(i, x), ra(i + 1, x), ra(i + 2, x), t);
  }
  return fineE;
}
const MAP_LAND = [76, 79, 88], MAP_SEA = [20, 36, 62];
const seaCol = (dep) => {   // the globe's ocean ramp for an override colour: shelf lighter, deep darker
  const st = [[0, L.mix(MAP_SEA, [255, 255, 255], 0.16)], [200, MAP_SEA], [3000, MAP_SEA.map((v) => v * 0.72)], [8000, MAP_SEA.map((v) => v * 0.5)]];
  return L.ramp(st, dep);
};
function buildMap() {
  const E = fineElevation();
  const cv = new OffscreenCanvas(FW, FH), cx = cv.getContext('2d'), im = cx.createImageData(FW, FH), d = im.data;
  const dyM = 110900 / TPD, lx = -0.5, ly = 0.5, lz = Math.SQRT1_2, EX = 5;
  for (let y = 0; y < FH; y++) {
    const lat = RG.lat1 - y / TPD, dxM = (111320 / TPD) * Math.cos(lat * DEG);
    for (let x = 0; x < FW; x++) {
      const o = y * FW + x, e = E[o];
      const ex1 = E[y * FW + Math.min(FW - 1, x + 1)], ex0 = E[y * FW + Math.max(0, x - 1)];
      const ey1 = E[Math.max(0, y - 1) * FW + x], ey0 = E[Math.min(FH - 1, y + 1) * FW + x];   // ey1 = north
      const zx = (ex1 - ex0) / (2 * dxM) * EX, zy = (ey1 - ey0) / (2 * dyM) * EX;
      const sh = (-zx * lx - zy * ly + lz) / Math.sqrt(zx * zx + zy * zy + 1);
      const hs = 1 + L.clamp((sh - lz) * 0.55, -0.2, 0.14) * L.smoothstep(L.clamp(e / 80));   // gentle, none at the shore
      const sea = seaCol(Math.max(0, -e));
      // antialiased shore: land fraction from the elevation's change across one texel
      const gr = Math.abs(ex1 - ex0) / 2 + Math.abs(ey1 - ey0) / 2 + 1e-3;
      const lk = L.clamp(0.5 + e / gr);
      for (let ch = 0; ch < 3; ch++) d[o * 4 + ch] = L.lerp(sea[ch], MAP_LAND[ch] * hs, lk) * 1.02;
      d[o * 4 + 3] = 255;
    }
  }
  cx.putImageData(im, 0, 0);
  return cv;
}
function drawMap(c, view) {
  if (!mapTex) mapTex = buildMap();
  c.save();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  for (let la = Math.floor(RG.lat0); la < RG.lat1; la++) for (let lo = Math.floor(RG.lon0); lo < RG.lon1; lo++) {
    const a0 = Math.max(la, RG.lat0), a1 = Math.min(la + 1, RG.lat1), o0 = Math.max(lo, RG.lon0), o1 = Math.min(lo + 1, RG.lon1);
    const pc = project((a0 + a1) / 2, (o0 + o1) / 2, view);
    if (pc.x < -700 || pc.x > SW + 700 || pc.y < -700 || pc.y > H + 700) continue;
    const pTL = project(a1, o0, view), pTR = project(a1, o1, view), pBL = project(a0, o0, view);
    const sx = (o0 - RG.lon0) * TPD, sy = (RG.lat1 - a1) * TPD, sw = (o1 - o0) * TPD, sh = (a1 - a0) * TPD;
    c.setTransform((pTR.x - pTL.x) / sw, (pTR.y - pTL.y) / sw, (pBL.x - pTL.x) / sh, (pBL.y - pTL.y) / sh, pTL.x, pTL.y);
    const x0 = Math.max(0, sx - 1), y0 = Math.max(0, sy - 1), x1 = Math.min(FW, sx + sw + 1), y1 = Math.min(FH, sy + sh + 1);
    c.drawImage(mapTex, x0, y0, x1 - x0, y1 - y0, x0 - sx, y0 - sy, x1 - x0, y1 - y0);
  }
  c.restore();
}

/** the 0 m contour of the fine grid as lat/lon polylines (marching squares + one Chaikin pass), in chunks with bboxes */
function buildCoast() {
  const E = fineElevation();
  const v = (y, x) => E[y * FW + x];
  const LL = (y, x) => [RG.lat1 - y / TPD, RG.lon0 + x / TPD];
  const segs = new Map(), pts = new Map();
  const ep = (y0, x0, y1, x1) => {
    const k = (y0 * FW + x0) * 2 + (y1 === y0 ? 0 : 1);   // edge id: from its first node, horizontal (0) or vertical (1)
    if (!pts.has(k)) {
      const a = v(y0, x0), b = v(y1, x1), t = a / (a - b), A = LL(y0, x0), Bp = LL(y1, x1);
      pts.set(k, [L.lerp(A[0], Bp[0], t), L.lerp(A[1], Bp[1], t)]);
    }
    return k;
  };
  const link = (p, q) => { if (!segs.has(p)) segs.set(p, []); if (!segs.has(q)) segs.set(q, []); segs.get(p).push(q); segs.get(q).push(p); };
  for (let y = 0; y < FH - 1; y++) for (let x = 0; x < FW - 1; x++) {
    const a = v(y, x) > 0, b = v(y, x + 1) > 0, cc = v(y + 1, x + 1) > 0, dd = v(y + 1, x) > 0;
    if (a === b && b === cc && cc === dd) continue;
    const code = (a ? 8 : 0) | (b ? 4 : 0) | (cc ? 2 : 0) | (dd ? 1 : 0);
    const T = () => ep(y, x, y, x + 1), R = () => ep(y, x + 1, y + 1, x + 1), Bt = () => ep(y + 1, x, y + 1, x + 1), Lf = () => ep(y, x, y + 1, x);
    const ctr = v(y, x) + v(y, x + 1) + v(y + 1, x) + v(y + 1, x + 1) > 0;
    switch (code) {
      case 1: case 14: link(Lf(), Bt()); break;
      case 2: case 13: link(Bt(), R()); break;
      case 3: case 12: link(Lf(), R()); break;
      case 4: case 11: link(T(), R()); break;
      case 6: case 9: link(T(), Bt()); break;
      case 7: case 8: link(Lf(), T()); break;
      case 5: if (ctr) { link(Lf(), T()); link(Bt(), R()); } else { link(Lf(), Bt()); link(T(), R()); } break;
      case 10: if (ctr) { link(Lf(), Bt()); link(T(), R()); } else { link(Lf(), T()); link(Bt(), R()); } break;
    }
  }
  const used = new Set(), chains = [];
  const walk = (start) => {
    const ch = [start]; used.add(start);
    let prev = null, cur = start;
    for (;;) {
      const nb = segs.get(cur).filter((q) => q !== prev && !used.has(q));
      if (!nb.length) { if (ch.length > 2 && segs.get(cur).includes(start)) ch.push(start); return ch; }
      prev = cur; cur = nb[0]; used.add(cur); ch.push(cur);
    }
  };
  const order = [...segs.keys()].sort((p, q) => segs.get(p).length - segs.get(q).length);   // open ends first
  for (const k of order) {
    if (used.has(k)) continue;
    const ch = walk(k);
    let P = ch.map((q) => pts.get(q));
    if (P.length > 2) {   // one Chaikin pass (rounds the marching-squares corners)
      const Q = [P[0]];
      for (let i = 0; i < P.length - 1; i++) {
        const [a1, b1] = P[i], [a2, b2] = P[i + 1];
        Q.push([0.75 * a1 + 0.25 * a2, 0.75 * b1 + 0.25 * b2], [0.25 * a1 + 0.75 * a2, 0.25 * b1 + 0.75 * b2]);
      }
      Q.push(P[P.length - 1]);
      P = Q;
    }
    for (let k0 = 0; k0 < P.length - 1; k0 += 96) {
      const C = P.slice(k0, Math.min(P.length, k0 + 97));
      let la0 = 90, la1 = -90, lo0 = 360, lo1 = -360;
      for (const [la, lo] of C) { la0 = Math.min(la0, la); la1 = Math.max(la1, la); lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); }
      chains.push({ P: C, box: [la0, la1, lo0, lo1] });
    }
  }
  return chains;
}
function coastline(c, view, mpp) {
  if (!coastChains) coastChains = buildCoast();
  const halfLat = (H * mpp) / 111 / 2 + 0.2, halfLon = (SW * mpp) / (111 * Math.cos(view.lat0 * DEG)) / 2 + 0.2;
  const step = Math.max(1, Math.round(mpp / 0.5));   // fewer points at wide zoom (a texel is ≈ 1.2 km)
  const path = new Path2D();
  for (const { P, box } of coastChains) {
    if (box[1] < view.lat0 - halfLat || box[0] > view.lat0 + halfLat || box[3] < view.lon0 - halfLon || box[2] > view.lon0 + halfLon) continue;
    let p = project(P[0][0], P[0][1], view);
    path.moveTo(p.x, p.y);
    for (let k = step; k < P.length - 1; k += step) { p = project(P[k][0], P[k][1], view); path.lineTo(p.x, p.y); }
    p = project(P[P.length - 1][0], P[P.length - 1][1], view);
    path.lineTo(p.x, p.y);
  }
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = 'rgba(226,214,188,0.14)'; c.lineWidth = 4.5; c.stroke(path);
  c.strokeStyle = 'rgba(226,214,188,0.6)'; c.lineWidth = 1.6; c.stroke(path);
  c.restore();
}

function graticule(c, v) {
  // 28–40°N × 124–138°E: well beyond every shot, faded toward its border so it never ends in a visible rectangle
  const view = mapView(v);
  c.save();
  c.lineWidth = 1;
  const LA0 = 28, LA1 = 40, LO0 = 124, LO1 = 138;
  const edge = (lat, lon) => L.clamp(Math.min(lat - LA0, LA1 - lat, lon - LO0, LO1 - lon) / 2);
  const paths = new Map();   // alpha level (tenths) -> Path2D
  const seg = (pts) => {
    for (let i = 1; i < pts.length; i++) {
      const [la, lo] = pts[i - 1], [lb, lb2] = pts[i];
      const k = Math.round(10 * Math.min(edge(la, lo), edge(lb, lb2)));
      if (k <= 0) continue;
      const p = project(la, lo, view), q = project(lb, lb2, view);
      if (Math.max(p.x, q.x) < -10 || Math.min(p.x, q.x) > SW + 10 || Math.max(p.y, q.y) < -10 || Math.min(p.y, q.y) > H + 10) continue;
      if (!paths.has(k)) paths.set(k, new Path2D());
      const pa = paths.get(k); pa.moveTo(p.x, p.y); pa.lineTo(q.x, q.y);
    }
  };
  for (let lat = LA0; lat <= LA1; lat += 0.5) { const pts = []; for (let lon = LO0; lon <= LO1 + 1e-6; lon += 0.25) pts.push([lat, lon]); seg(pts); }
  for (let lon = LO0; lon <= LO1; lon += 0.5) { const pts = []; for (let lat = LA0; lat <= LA1 + 1e-6; lat += 0.25) pts.push([lat, lon]); seg(pts); }
  paths.forEach((pa, k) => { c.strokeStyle = `rgba(230,220,200,${(0.007 * k).toFixed(4)})`; c.stroke(pa); });
  c.restore();
}

// ------------------------------------------------------------------ foreground: the persistent world
export const CITIES = [
  { id: 'hiro', ll: HIRO, en: 'HIROSHIMA', kj: '広島', side: 'right' },
  { id: 'naga', ll: NAGA, en: 'NAGASAKI', kj: '長崎', side: 'left' },
];

/** a city pin + its name; hot 0..1 brightens it (accent), k = alpha */
export function cityPin(c, v, city, { k = 1, hot = 0, label = 1, side = city.side, scale = 1, labelOnly = false } = {}) {
  if (k <= 0) return;
  const p = geo(v, city.ll.lat, city.ll.lon);
  c.save();
  c.globalAlpha *= k;
  const col = L.mix(IVORY, ACC, hot);
  if (!labelOnly) {
    if (hot > 0) L.lightBlob(c, p.x, p.y, 70 * scale, ACC, 0.35 * hot);
    c.fillStyle = 'rgba(6,10,20,0.6)';
    c.beginPath(); c.arc(p.x, p.y, 13 * scale, 0, Math.PI * 2); c.fill();
    c.strokeStyle = L.rgba(col); c.lineWidth = 3 * scale;
    c.beginPath(); c.arc(p.x, p.y, 11 * scale, 0, Math.PI * 2); c.stroke();
    c.fillStyle = L.rgba(col);
    c.beginPath(); c.arc(p.x, p.y, 4.5 * scale, 0, Math.PI * 2); c.fill();
  }
  // a label that would cross the frame edge fades out instead of being cropped
  const lw = tw(c, city.en, L.font(Math.round(38 * scale), 700, L.FONT.display), 3);
  const above = side === 'above';
  const room = above ? Math.min(p.x - lw / 2 - 20, SW - 20 - p.x - lw / 2)
    : side === 'right' ? SW - 20 - (p.x + 26 * scale + lw) : p.x - 26 * scale - lw - 20;
  label *= L.clamp(room / 40) * L.clamp(Math.min(p.y - (above ? 380 : 300), 1560 - p.y) / 40);
  if (label > 0) {
    c.globalAlpha *= label;
    const dx = above ? 0 : side === 'right' ? 26 * scale : -26 * scale;
    const align = above ? 'center' : side === 'right' ? 'left' : 'right';
    // above the pin: kanji on top, the English name under it, both clear of the pin ring
    const yEn = above ? p.y - 26 * scale : p.y + 4 * scale, yKj = above ? p.y - 64 * scale : p.y + 38 * scale;
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(2,6,14,0.9)'; c.shadowBlur = 12;
    c.font = L.font(Math.round(38 * scale), 700, L.FONT.display);
    c.fillStyle = L.rgba(col);
    L.trackedText(c, city.en, p.x + dx, yEn, 3, align);
    c.font = kfont(Math.round(26 * scale), 600);
    c.fillStyle = L.rgba(IVORY, 0.8);
    c.textAlign = align;
    c.fillText(city.kj, p.x + dx, yKj);
  }
  c.restore();
}

/** Yamaguchi's marker: ivory dot, amber ring, slow breathing halo; label optional */
export function himMarker(c, v, x, y, { k = 1, label = 'YAMAGUCHI', side = 'right', lk = 1, scale = 1 } = {}) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  const br = 0.5 + 0.5 * Math.sin(v.gt * 2.4);
  L.lightBlob(c, x, y, 46 * scale, ACC, 0.28 + 0.12 * br);
  c.strokeStyle = L.rgba(ACC, 0.35 + 0.25 * br); c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, (15 + 5 * br) * scale, 0, Math.PI * 2); c.stroke();
  c.fillStyle = L.rgba(IVORY);
  c.beginPath(); c.arc(x, y, 8 * scale, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(ACC); c.lineWidth = 3;
  c.beginPath(); c.arc(x, y, 8 * scale, 0, Math.PI * 2); c.stroke();
  if (label && lk > 0) {
    c.globalAlpha *= lk;
    c.shadowColor = 'rgba(2,6,14,0.95)'; c.shadowBlur = 10;
    c.font = L.font(Math.round(24 * scale), 700, L.FONT.body);
    c.fillStyle = L.rgba(IVORY);
    c.textBaseline = 'middle';
    L.trackedText(c, label, x + (side === 'right' ? 26 : -26) * scale, y, 3, side === 'right' ? 'left' : 'right');
  }
  c.restore();
}

/** where Yamaguchi is at gt (lat/lon) and how visible his marker is */
export function himAt(gt, tl) {
  const m = moments(tl);
  if (gt < B(tl, 3)) {
    // business trip: Nagasaki → Hiroshima along the railway, then the works 3 km from ground zero
    const f = 1 - L.ease.inOutCubic(L.prog(gt, m.tripGo, m.tripAt - m.tripGo));
    const r = railAt(f);
    const s = L.ease.inOutCubic(L.prog(gt, B(tl, 2, 0.2), 1.0));
    return { lat: L.lerp(r.lat, HIM_H.lat, s), lon: L.lerp(r.lon, HIM_H.lon, s), k: L.ease.outCubic(L.prog(gt, m.name + 0.1, 0.4)), f };
  }
  // the train home: Hiroshima → Nagasaki, then the office 3 km from Nagasaki's ground zero
  const f = trainF(gt, tl);
  const r = railAt(f);
  const s = L.ease.inOutCubic(L.prog(gt, B(tl, 4, 0.2), 1.0));
  return { lat: L.lerp(r.lat, HIM_N.lat, s), lon: L.lerp(r.lon, HIM_N.lon, s), k: 1, f };
}
/** 0..1 progress of the train (lands in Nagasaki on the word "Nagasaki") */
export function trainF(gt, tl) {
  const m = moments(tl);
  return L.ease.inOutCubic(L.prog(gt, m.trainGo, m.nagasakiWord + 0.1 - m.trainGo));
}

/** the 3 km ring left on the map after each flash (dim ember ring + scorched glow) */
function scar(c, v, ll, t) {
  if (t < 0) return;
  const p = geo(v, ll.lat, ll.lon), r = 3 * pxkm(v);
  const k = L.ease.outCubic(L.prog(t, 0.2, 1.2));
  c.save();
  const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, r));
  g.addColorStop(0, `rgba(235,150,70,${0.32 * k})`); g.addColorStop(0.7, `rgba(214,92,58,${0.16 * k})`); g.addColorStop(1, 'rgba(214,92,58,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(p.x, p.y, Math.max(0, r), 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(ACC, 0.7 * k); c.lineWidth = 2;
  c.setLineDash([6, 5]);
  c.beginPath(); c.arc(p.x, p.y, Math.max(0, r), 0, Math.PI * 2); c.stroke();
  c.restore();
}

/** a city's pin options this frame (shared by the map and the label redraw over the flash bloom) */
export function cityOpts(v, city) {
  const tl = v.tl, gt = v.gt, m = moments(tl), bi = v.beat;
  const nHot = L.ease.outCubic(L.prog(gt, m.hookCity2, 0.5));
  const hHot = 1 - 0.6 * L.prog(gt, B(tl, 1), 1);
  let label = 1, side = city.side, hot = city.id === 'hiro' ? hHot : 0.4 * nHot * (1 - L.prog(gt, B(tl, 1), 1));
  // close-ups: the lens owns the right side, the label sits left
  if ((bi === 2 && city.id === 'hiro') || (bi === 5 && city.id === 'naga')) { label = 1; side = 'left'; }
  // the route shot: Hiroshima sits near the right edge, so its name goes above the pin
  if (bi === 3 && city.id === 'hiro') side = 'above';
  // Hiroshima's label changes side at the beat 2→3 and 3→4 cuts: fade out before, fade in after (no jump)
  if (city.id === 'hiro' && (bi === 2 || bi === 3)) label *= 1 - L.prog(gt, BE(tl, bi, -0.24), 0.2);
  // (beat 3: only once the pull-back has settled, so the name never smears across the move)
  if (city.id === 'hiro' && (bi === 3 || bi === 4)) label *= L.prog(gt, B(tl, bi, bi === 3 ? 0.9 : 0.05), 0.3);
  if (city.id === 'naga' && bi === 3) hot = L.ease.outCubic(L.prog(gt, m.homeWord, 0.5));
  if (city.id === 'naga' && bi === 4) hot = 1 - L.prog(gt, B(tl, 4), 1);
  return { hot, label, side };
}

export function drawForeground(c, v) {
  const tl = v.tl, gt = v.gt, m = moments(tl);
  const [t1, t2] = flashTimes(tl);
  // the railway: drawn in faintly as he travels out (beat 1), lit by the train (beat 3), faint after
  const out = L.prog(gt, m.tripGo, m.tripAt - m.tripGo);
  if (out > 0) {
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    const f1 = 1 - L.ease.inOutCubic(out);
    railPath(c, v, f1, 1);
    c.strokeStyle = 'rgba(242,234,216,0.22)'; c.lineWidth = 2.5; c.setLineDash([2, 7]); c.stroke();
    c.restore();
  }
  // beat 3: the route home draws itself Hiroshima → Nagasaki across "The next day, wounded, he takes the train"
  const rd = L.ease.inOutCubic(L.prog(gt, m.nextDay, m.trainGo - m.nextDay));
  if (gt > B(tl, 3) && rd > 0) {
    const fade = 1 - 0.6 * L.smoothstep(L.prog(gt, B(tl, 4), 1.5));
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    railPath(c, v, 0, rd);
    c.strokeStyle = L.rgba(IVORY, 0.62 * fade); c.lineWidth = 3; c.setLineDash([3, 9]); c.stroke();
    c.setLineDash([]);
    if (rd < 1) {   // the drawing head
      const hp = railAt(rd), q = geo(v, hp.lat, hp.lon);
      L.lightBlob(c, q.x, q.y, 22, IVORY, 0.5);
      c.fillStyle = L.rgba(IVORY, 0.95); c.beginPath(); c.arc(q.x, q.y, 4.5, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  const tr = trainF(gt, tl);
  if (gt > B(tl, 3) && tr > 0) {
    const fade = 1 - 0.65 * L.smoothstep(L.prog(gt, B(tl, 4), 1.5));
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    railPath(c, v, 0, tr);
    c.strokeStyle = L.rgba(ACC, 0.28 * fade); c.lineWidth = 12; c.stroke();
    c.strokeStyle = L.rgba(ACC, 0.95 * fade); c.lineWidth = 3.5; c.stroke();
    c.restore();
  }
  // scars (after each flash)
  scar(c, v, HIRO, gt - t1);
  scar(c, v, NAGA, gt - t2);
  // the cities
  const bi = v.beat;
  CITIES.forEach((city) => cityPin(c, v, city, cityOpts(v, city)));
  // Yamaguchi
  const h = himAt(gt, tl);
  if (h.k > 0 && bi !== 2 && bi !== 5) {
    const p = geo(v, h.lat, h.lon);
    // beat 3: the label leaves BEFORE the marker sets off (a moving label smears and would meet the HOME tag)
    const lk = bi === 1 ? 1 - L.prog(gt, m.tripAt - 0.25, 0.25) : bi === 3 ? L.prog(gt, B(tl, 3, 0.9), 0.3) * (1 - L.prog(gt, m.trainGo - 0.3, 0.25)) : 0;
    const pop = bi === 3 ? L.prog(gt, B(tl, 3), 0.35) : bi === 6 ? L.prog(gt, B(tl, 6), 0.35) : 1;
    himMarker(c, v, p.x, p.y, { k: h.k * pop, lk, side: bi === 3 ? 'left' : 'right', label: bi === 3 ? 'YAMAGUCHI' : 'YAMAGUCHI' });
  }
}

// ------------------------------------------------------------------ HUD: top bar + date chip
const CHIP = { x: 64, y: 214, h: 54 };
export const DOCK = 0.45;   // seconds a calendar takes to shrink into the chip
function chipText(gt, tl) {
  const m = moments(tl);
  if (gt < m.dock1 + DOCK) return null;
  if (gt < B(tl, 3, 0.2)) return '6 AUG 1945';
  if (gt < m.august9 - 0.1) return '7 AUG 1945';   // turns to 9 on "August" (the calendar page 9 is coming up)
  return '9 AUG 1945';
}
export function chipK(gt, tl) {
  const m = moments(tl);
  return L.ease.outCubic(L.prog(gt, m.dock1 + DOCK - 0.08, 0.3)) * (1 - L.ease.inCubic(L.prog(gt, B(tl, 6, -0.1), 0.3)));
}
export const CHIP_RECT = CHIP;
/** a soft dark scrim under the caption band (y ≈ 1450) while a caption is on screen: the captions sit over flat grey
 *  land in the close-ups. Beats 0 and 7 have no captions. */
function captionScrim(c, v) {
  const tl = v.tl, gt = v.gt;
  if (v.beat === 0 || v.beat === 7) return;
  let k = 0;
  tl.lines.forEach((ln, i) => {
    if (i === 0 || i === 7) return;
    k = Math.max(k, L.smoothstep(L.prog(gt, ln.start - 0.15, 0.25)) * (1 - L.smoothstep(L.prog(gt, ln.end + 0.3, 0.35))));
  });
  if (k <= 0) return;
  const y = 1450;
  c.save();
  c.translate(540, y);
  c.scale(1, 0.2);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 520);
  g.addColorStop(0, `rgba(4,8,18,${0.5 * k})`); g.addColorStop(0.55, `rgba(4,8,18,${0.36 * k})`); g.addColorStop(1, 'rgba(4,8,18,0)');
  c.fillStyle = g;
  c.fillRect(-540, -520, 1080, 1040);
  c.restore();
}

export function drawHud(c, v) {
  captionScrim(c, v);
  topBar(c, v, ACC, [236, 232, 222]);
  const tl = v.tl, gt = v.gt;
  const k = chipK(gt, tl);
  if (k <= 0) return;
  // the chip is opaque from its first frame: it scales in (it is where the calendar docks)
  const txt = chipText(gt, tl) ?? '6 AUG 1945';
  const prevTxt = chipText(gt - 0.4, tl) ?? txt;
  const sw = L.prog(gt, (() => { const m = moments(tl); return txt === '7 AUG 1945' ? B(tl, 3, 0.2) : txt === '9 AUG 1945' ? m.august9 - 0.1 : 0; })(), 0.4);
  c.save();
  c.font = L.font(28, 700, L.FONT.display);
  c.letterSpacing = '3px';
  const tw = c.measureText('6 AUG 1945').width;
  c.letterSpacing = '0px';
  const w = tw + 34 + 46;
  const s = L.lerp(0.6, 1, L.ease.outBack(L.clamp(k), 1.6));
  c.translate(CHIP.x, CHIP.y + CHIP.h / 2);
  c.scale(s, s);
  c.globalAlpha = L.clamp(k * 3);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16;
  c.fillStyle = L.rgba(PAPER);
  L.roundRect(c, 0, -CHIP.h / 2, w, CHIP.h, 8); c.fill();
  c.shadowBlur = 0;
  // calendar glyph
  c.fillStyle = L.rgba(EMBER);
  L.roundRect(c, 16, -15, 26, 8, 2); c.fill();
  c.strokeStyle = L.rgba(INKP, 0.75); c.lineWidth = 2;
  L.roundRect(c, 16, -15, 26, 28, 3); c.stroke();
  c.fillStyle = L.rgba(INKP);
  c.textBaseline = 'middle';
  c.font = L.font(28, 700, L.FONT.display);
  const draw = (t, a, dy) => { c.globalAlpha = L.clamp(k * 3) * a; L.trackedText(c, t, 58, 2 + dy, 3); };
  if (sw > 0 && sw < 1 && prevTxt !== txt) {
    draw(prevTxt, 1 - L.ease.inCubic(L.clamp(sw * 2)), -10 * L.clamp(sw * 2));
    draw(txt, L.ease.outCubic(L.clamp(sw * 2 - 1)), 10 * (1 - L.clamp(sw * 2 - 1)));
  } else draw(txt, 1, 0);
  c.restore();
}

// ------------------------------------------------------------------ shared card components
/** card life: opaque plate from its first frame (scale/slide in), contents fade in after; exit = contents first,
 *  then the plate fast. Returns {on, s (scale), dy, a (plate alpha), ck (content alpha)}. */
export function life(gt, tIn, tOut, { slide = 24, s0 = 0.94, dur = 0.42, cLead = 0.06, cDur = 0.28 } = {}) {
  if (gt < tIn - 0.02 || gt > tOut) return { on: false };
  const e = L.prog(gt, tIn, dur);
  const s = L.lerp(s0, 1, L.ease.outBack(e, 1.3));
  const dy = (1 - L.ease.outCubic(e)) * slide;
  const ck = L.ease.outCubic(L.prog(gt, tIn + cLead, cDur)) * (1 - L.ease.inCubic(L.prog(gt, tOut - 0.26, 0.14)));
  const out = L.prog(gt, tOut - 0.12, 0.1);
  return { on: true, s: s * L.lerp(1, 0.96, out), dy, a: 1 - L.ease.inCubic(out), ck };
}
/** apply a life's transform about (cx, cy) */
export function lifeXf(c, lf, cx, cy) {
  c.translate(cx, cy + lf.dy); c.scale(lf.s, lf.s); c.translate(-cx, -cy);
  c.globalAlpha *= lf.a;
}

/** The tear-off calendar page (beats 1 and 4): AUGUST strip, big day number, a 1945 ink stamp. Docks into the chip.
 *  tIn = plate in, tStamp = 1945 stamp lands, tDock = starts shrinking into the date chip. */
export const CAL = { cx: 540, top: 372, w: 400, h: 420 };
export function calendar(c, v, { day, tIn, tStamp, tDock }) {
  const gt = v.gt;
  if (gt < tIn - 0.02 || gt > tDock + DOCK + 0.12) return;   // +0.12 s: gone only once the chip above it is opaque
  const lf = life(gt, tIn, 1e9, { cLead: -1, cDur: 0.01 });   // the page carries its text from its first frame
  const dk = L.ease.inOutCubic(L.prog(gt, tDock, DOCK));
  const { cx, top, w, h } = CAL;
  const cy = top + h / 2;
  // dock target: the chip's centre and scale
  const tx = CHIP.x + 105, ty = CHIP.y + CHIP.h / 2, ts = CHIP.h / h;
  c.save();
  c.translate(L.lerp(cx, tx, dk), L.lerp(cy + lf.dy, ty, dk));
  const sc = lf.s * L.lerp(1, ts, dk);
  c.scale(sc, sc);
  const x = -w / 2, y = -h / 2;
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 10;
  c.fillStyle = L.rgba(PAPER);
  L.roundRect(c, x, y, w, h, 18); c.fill();
  c.shadowColor = 'transparent';
  // the strip
  c.save();
  L.roundRect(c, x, y, w, h, 18); c.clip();
  c.fillStyle = L.rgba(EMBER);
  c.fillRect(x, y, w, 104);
  // a faint paper grain: horizontal fibres (deterministic)
  const r = L.rng(5);
  c.fillStyle = 'rgba(80,60,40,0.05)';
  for (let i = 0; i < 40; i++) c.fillRect(x + r() * w, y + 104 + r() * (h - 104), 30 + r() * 80, 1);
  c.restore();
  // binding rings
  for (const bx of [-110, 110]) {
    c.fillStyle = 'rgba(20,14,12,0.55)';
    c.beginPath(); c.arc(bx, y + 22, 8, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(210,210,214,0.95)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(bx, y + 22); c.lineTo(bx, y - 14); c.stroke();
  }
  const ca = 1;   // the day stays on the page while it shrinks into the chip (no blank page flying)
  c.globalAlpha *= ca;
  c.textBaseline = 'alphabetic';
  txt(c, 'AUGUST', 0, y + 82, L.font(54, 800, L.FONT.display), IVORY, { track: 10, align: 'center' });
  const ds = L.fitSize(c, day, w - 120, 250, 800, L.FONT.display, 80);
  txt(c, day, 0, y + 104 + (h - 104) / 2 + ds * 0.36, L.font(ds, 800, L.FONT.display), INKP, { align: 'center' });
  // 1945 stamp
  const sk = L.prog(gt, tStamp - 0.08, 0.3);
  if (sk > 0) {
    const e = L.ease.outBack(sk, 2);
    c.save();
    c.translate(w / 2 - 92, h / 2 - 62);
    c.rotate(-0.12);
    const s2 = L.lerp(1.6, 1, L.clamp(e));
    c.scale(s2, s2);
    c.globalAlpha *= L.clamp(sk * 3) * 0.92;
    c.strokeStyle = L.rgba(EMBER); c.lineWidth = 4;
    L.roundRect(c, -70, -30, 140, 60, 8); c.stroke();
    txt(c, '1945', 0, 2, L.font(44, 800, L.FONT.display), EMBER, { track: 3, align: 'center', base: 'middle' });
    c.restore();
  }
  c.restore();
}

/** opaque plate (dark) with hairline accent border */
export function plate(c, x, y, w, h, { r = 22, fill = PLATE, border = 0.45, shadow = true } = {}) {
  c.save();
  if (shadow) { c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 36; c.shadowOffsetY = 8; }
  c.fillStyle = L.rgba(fill);
  L.roundRect(c, x, y, w, h, r); c.fill();
  c.shadowColor = 'transparent';
  if (border > 0) { c.strokeStyle = L.rgba(ACC, border); c.lineWidth = 2; L.roundRect(c, x, y, w, h, r); c.stroke(); }
  c.restore();
}

/** analogue clock face at (x, y) radius r showing hh:mm (mm may be fractional) */
export function clockFace(c, x, y, r, hh, mm, { face = PAPER, ink = INKP, hand = INKP, accent = EMBER, glowK = 0 } = {}) {
  c.save();
  c.fillStyle = L.rgba(face);
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(ink, 0.85); c.lineWidth = Math.max(2, r * 0.045);
  c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    const r0 = r * (big ? 0.76 : 0.84), r1 = r * 0.9;
    c.strokeStyle = L.rgba(ink, big ? 0.9 : 0.4); c.lineWidth = big ? Math.max(2, r * 0.04) : 1;
    c.beginPath(); c.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0); c.lineTo(x + Math.sin(a) * r1, y - Math.cos(a) * r1); c.stroke();
  }
  const ha = ((hh % 12) + mm / 60) / 12 * Math.PI * 2, ma = (mm / 60) * Math.PI * 2;
  c.lineCap = 'round';
  c.strokeStyle = L.rgba(hand); c.lineWidth = r * 0.075;
  c.beginPath(); c.moveTo(x - Math.sin(ha) * r * 0.1, y + Math.cos(ha) * r * 0.1); c.lineTo(x + Math.sin(ha) * r * 0.5, y - Math.cos(ha) * r * 0.5); c.stroke();
  c.strokeStyle = L.rgba(L.mix(hand, accent, glowK)); c.lineWidth = r * 0.045;
  c.beginPath(); c.moveTo(x - Math.sin(ma) * r * 0.14, y + Math.cos(ma) * r * 0.14); c.lineTo(x + Math.sin(ma) * r * 0.78, y - Math.cos(ma) * r * 0.78); c.stroke();
  c.fillStyle = L.rgba(accent);
  c.beginPath(); c.arc(x, y, r * 0.06, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** text helper: left/centre/right, tracked, with a font */
export function txt(c, s, x, y, f, col, { track = 0, align = 'left', base = 'alphabetic', alpha = 1 } = {}) {
  c.save();
  c.font = f; c.fillStyle = typeof col === 'string' ? col : L.rgba(col, alpha); c.textBaseline = base;
  const w = L.trackedText(c, s, x, y, track, align);
  c.restore();
  return w;
}
/** width of a tracked string in a font */
export function tw(c, s, f, track = 0) {
  c.save(); c.font = f; c.letterSpacing = `${track}px`; const w = c.measureText(s).width - track; c.letterSpacing = '0px'; c.restore();
  return w;
}

// ------------------------------------------------------------------ sound
// Every word-locked cue is built here from moments(tl). Cues sit in the gaps between words (or mid-word, never on an
// onset); the flashes get a music dip, a low rumble (below the speech band) and an airy hush — no bang.
/** nudge a cue off any word onset (±0.09 s) into the moment just before it */
function offOnset(tl, t) {
  for (const ln of tl.lines) for (const ph of ln.phrases ?? []) for (const [w] of ph.words ?? []) if (t > w - 0.09 && t < w + 0.09) return w - 0.1;
  return t;
}
// the flash rumble + hush play THROUGH the music dip (nodip): a felt low rumble and an airy hush under the silence
const DEEP_G = 0.6, DEEP_P = 0.8, HUSH_G = 0.14;    // pitch 0.8: a 24–48 Hz sub + rumble (0.5 sat under 30 Hz)
export function cues(tl) {
  const m = moments(tl);
  const q = (t, name, gain, pitch = 1) => ({ t: offOnset(tl, t), name, gain, pitch });
  return [
    ...beatCues(tl, { gain: 0.14, pitch: 0.85 }),
    q(0.02, 'swell', 0.16, 0.7),
    q(m.hookCity2 - 0.14, 'swish', 0.12, 0.9),
    // beat 1: the calendar, its stamp, the dock; the seal
    q(m.sixth - 0.32, 'tick', 0.12, 0.9),
    q(m.y1945 - 0.16, 'impact', 0.12, 1.1),
    q(m.dock1 + 0.15, 'swish', 0.1, 1.1),
    q(m.engineer + 0.6, 'impact', 0.1, 1.2),
    // beat 2: the clock, the flash (dip + rumble + hush), the lens, the stamp
    q(B(tl, 2, 0.08), 'tick', 0.14, 0.8),
    { t: m.explodes - 0.35, name: 'dip', d: 2.6, gain: 0.8 },
    { ...q(m.explodes + 0.04, 'deep', DEEP_G, DEEP_P), nodip: true },
    { ...q(m.explodes + 0.3, 'hush', HUSH_G, 0.8), nodip: true },
    q(m.threeKm - 0.22, 'swish', 0.09, 1.0),
    q(m.survives1 - 0.16, 'impact', 0.2, 0.8),
    // beat 3: the train, home
    q(m.trainGo - 0.05, 'riser', 0.1, 0.8),
    q(m.homeWord - 0.12, 'tick', 0.12, 1.1),
    q(m.nagasakiWord + 0.4, 'chime', 0.1, 0.9),
    // beat 4: the calendar, the dock, the bandage
    q(m.august9 + 0.12, 'tick', 0.12, 0.9),
    q(m.dock2 + 0.1, 'swish', 0.1, 1.1),
    // beat 5: the clock lifts off the wall, lands; the second flash
    q(B(tl, 5, -0.06), 'whoosh', 0.12, 1.1),
    q(m.happens + 0.14, 'tick', 0.12, 0.8),
    { t: m.flash2 - 0.4, name: 'dip', d: 2.6, gain: 0.8 },
    { ...q(m.flash2 + 0.04, 'deep', DEEP_G, DEEP_P), nodip: true },
    { ...q(m.flash2 + 0.3, 'hush', HUSH_G, 0.8), nodip: true },
    q(m.threeKm2 - 0.22, 'swish', 0.09, 1.0),
    // beat 6: SURVIVES AGAIN, the card, 2009, the count
    q(m.survives2 - 0.14, 'impact', 0.24, 0.75),
    q(m.officially - 0.2, 'swish', 0.09, 1.0),
    q(m.y2009 - 0.14, 'impact', 0.14, 1.0),
    q(m.lived - 0.32, 'count', 0.06, 1.0),   // under "lived to ninety": keep the voice ≥ 8 dB clear
    q(m.ninety + 0.3, 'ping', 0.1, 1.1),
    // beat 7: the choices, the comments line
    ...m.choices.map((t, i) => q(t + 0.18, 'blip', 0.16, 1.0 + 0.12 * i)),
    q(m.comments + 0.2, 'blip', 0.14, 1.25),
  ].sort((a2, b2) => a2.t - b2.t);
}

// ------------------------------------------------------------------ the clock card (beats 2 and 5)
export const CLK = { y: 372, h: 260, dr: 106 };
const CLK_BIG = 150;
/** the card's x and width for a place name (fitted to its content, centred) */
export function clkBox(c, place, kj) {
  const kw = tw(c, place, L.font(30, 700, L.FONT.body), 6) + 16 + tw(c, kj, kfont(28, 600));
  const bw = tw(c, '88:88', L.font(CLK_BIG, 700, L.FONT.din)) + 14 + tw(c, 'A.M.', L.font(Math.round(CLK_BIG * 0.38), 700, L.FONT.din), 2);
  const w = 30 + 2 * CLK.dr + 52 + Math.max(kw, bw) + 56;
  return { x: Math.round(540 - w / 2), w };
}
/** tIn/tOut card life · from/to = [h, m] the hands sweep between (landing at tLand) · place/kj = city
 *  dialFrom = optional {x, y, r, t0, t1}: the dial flies in from there (the office wall clock) */
export function clockCard(c, v, { tIn, tOut, from, to, tLand, place, kj, dialFrom = null, lifeOpt = {} }) {
  const gt = v.gt;
  const lf = life(gt, tIn, tOut, lifeOpt);
  const early = dialFrom && !lf.on && gt >= dialFrom.t0 && gt < tIn;
  if (!lf.on && !early) return;
  const { y, h, dr } = CLK;
  const { x, w } = clkBox(c, place, kj);
  const dcx = x + 30 + dr, dcy = y + h / 2;
  // the hands: sweep from `from` to `to`, minute by minute on the readout
  const m0 = from[0] * 60 + from[1], m1 = to[0] * 60 + to[1];
  const sw = L.ease.inOutCubic(L.prog(gq(gt), tLand - 0.9, 0.9));
  const mins = L.lerp(m0, m1, sw);
  const shownMin = Math.floor(mins + 1e-6);
  const landed = gq(gt) >= tLand - 1e-6;
  if (lf.on) {
    c.save();
    lifeXf(c, lf, x + w / 2, y + h / 2);
    plate(c, x, y, w, h);
    c.globalAlpha *= lf.ck;
    const tx = dcx + dr + 52;
    txt(c, place, tx, y + 66, L.font(30, 700, L.FONT.body), MUTED, { track: 6 });
    const pw = tw(c, place, L.font(30, 700, L.FONT.body), 6);
    txt(c, kj, tx + pw + 16, y + 64, kfont(28, 600), IVORY, { alpha: 0.75 });
    const hh = Math.floor(shownMin / 60), mm = shownMin % 60;
    const big = `${hh}:${String(mm).padStart(2, '0')}`;
    const col = landed ? ACC : IVORY;
    const bw = txt(c, big, tx, y + h - 50, L.font(CLK_BIG, 700, L.FONT.din), col);
    txt(c, 'A.M.', tx + bw + 14, y + h - 50, L.font(Math.round(CLK_BIG * 0.38), 700, L.FONT.din), MUTED, { track: 2 });
    if (landed) L.lightBlob(c, tx + bw / 2, y + h - 50 - CLK_BIG * 0.35, 160, ACC, 0.12 * (1 - L.prog(gt, tLand, 1.2)));
    c.restore();
  }
  // the dial (outside the content fade, so it can fly in from the office wall)
  c.save();
  let px = dcx, py = dcy, pr = dr;
  if (dialFrom) {
    const f = L.ease.inOutCubic(L.prog(gt, dialFrom.t0, dialFrom.t1 - dialFrom.t0));
    px = L.lerp(dialFrom.x, dcx, f); py = L.lerp(dialFrom.y, dcy, f); pr = L.lerp(dialFrom.r, dr, f);
    if (lf.on) { c.translate(x + w / 2, y + h / 2 + lf.dy * f); c.scale(L.lerp(1, lf.s, f), L.lerp(1, lf.s, f)); c.translate(-(x + w / 2), -(y + h / 2)); c.globalAlpha *= lf.a; }
  } else {
    lifeXf(c, lf, x + w / 2, y + h / 2);
    c.globalAlpha *= gt < tOut - 1 ? 1 : lf.ck;
  }
  clockFace(c, px, py, pr, Math.floor(mins / 60), mins % 60, { glowK: landed ? 1 : 0 });
  c.restore();
}

// ------------------------------------------------------------------ the flash: one bloom, a slow shock ring
export function flash(c, v, ll, t0) {
  const t = v.gt - t0;
  if (t < -0.06 || t > 3) return;
  const e = bloomEnv(t);
  const p = geo(v, ll.lat, ll.lon);
  c.save();
  // the frame lifts (warm, additive, no strobe)
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(255,226,190,${0.2 * e})`;
  c.fillRect(0, 0, SW, H);
  c.restore();
  L.lightBlob(c, p.x, p.y, 120 + 520 * L.ease.outCubic(L.clamp(t / 0.5)), [255, 236, 210], 0.95 * e);
  L.lightBlob(c, p.x, p.y, 60 + 160 * L.ease.outCubic(L.clamp(t / 0.3)), [255, 250, 240], 0.9 * e);
  // the shock ring
  const rp = L.prog(t, 0.05, 1.8);
  if (rp > 0 && rp < 1) {
    c.save();
    c.strokeStyle = `rgba(255,232,200,${0.55 * (1 - rp)})`;
    c.lineWidth = 3 + 6 * (1 - rp);
    c.beginPath(); c.arc(p.x, p.y, Math.max(0, 20 + 820 * L.ease.outCubic(rp)), 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  // the burning core afterglow (stays a while, ember)
  L.lightBlob(c, p.x, p.y, 70, EMBER, 0.5 * L.smoothstep(L.prog(t, 0.1, 0.5)) * (1 - L.prog(t, 1.5, 1.5)));
  // the city's name stays whole: redrawn ABOVE the bloom (ivory, dark shadow) while the bloom is up
  const city = CITIES.find((q) => q.ll === ll);
  const lk = L.clamp(e * 4) * (1 - L.prog(t, 2.2, 0.6));
  if (city && lk > 0) for (let i = 0; i < 2; i++) cityPin(c, v, city, { ...cityOpts(v, city), hot: 0, labelOnly: true, k: lk });   // 2 passes: a denser shadow
}

// ------------------------------------------------------------------ the 3 KM lens (beats 2 and 5)
export const LENS = { x: 735, y: 1040, r: 168 };
/** a magnifier that grows out of ground zero: rings 1–2–3 km, GROUND ZERO, Yamaguchi's dot on the 3 km ring.
 *  tIn = opens · tRing = the 3 km ring draws · tHim = his dot · tSafe = (optional) his dot turns accent (survives) */
export function lens(c, v, { ll, brg, tIn, tRing, tHim, tOut, tSafe = 1e9 }) {
  const gt = v.gt;
  if (gt < tIn - 0.02 || gt > tOut) return;
  const gz = geo(v, ll.lat, ll.lon), rs = 3 * pxkm(v);
  const op = L.ease.inOutCubic(L.prog(gt, tIn, 0.6));
  const ex = 1 - L.ease.inCubic(L.prog(gt, tOut - 0.3, 0.28));   // exit: shrinks back into ground zero
  const k = op * ex;
  const cx = L.lerp(gz.x, LENS.x, k), cy = L.lerp(gz.y, LENS.y, k), R = Math.max(rs, L.lerp(rs, LENS.r, k));
  const sc = R / LENS.r;                         // everything inside scales with the lens
  const ring3 = LENS.r * 0.78;                   // 3 km ring radius (at full size)
  c.save();
  // leaders: the small 3 km circle on the map to the lens
  const dx = cx - gz.x, dy = cy - gz.y, dl = Math.hypot(dx, dy);
  if (dl > R + rs + 4) {
    const nx = -dy / dl, ny = dx / dl;
    c.strokeStyle = L.rgba(IVORY, 0.55 * k); c.lineWidth = 1.5;
    for (const s of [1, -1]) {
      c.beginPath(); c.moveTo(gz.x + nx * rs * s, gz.y + ny * rs * s); c.lineTo(cx + nx * R * s, cy + ny * R * s); c.stroke();
    }
  }
  // the disc: it is born as its accent rim (no dark dot in the middle of the bloom); the plate and its contents
  // only fill in once the lens is past 60 px
  const pk = L.smoothstep(L.prog(R, 60, 70));
  c.save();
  c.globalAlpha *= pk;
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30 * k;
  c.fillStyle = L.rgba(PLATE);
  c.beginPath(); c.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2); c.fill();
  c.shadowColor = 'transparent';
  c.beginPath(); c.arc(cx, cy, Math.max(0, R - 1), 0, Math.PI * 2); c.clip();
  // fine grid
  c.strokeStyle = 'rgba(230,220,200,0.07)'; c.lineWidth = 1;
  const gs = 26 * sc;
  for (let i = -8; i <= 8; i++) {
    c.beginPath(); c.moveTo(cx + i * gs, cy - R); c.lineTo(cx + i * gs, cy + R); c.stroke();
    c.beginPath(); c.moveTo(cx - R, cy + i * gs); c.lineTo(cx + R, cy + i * gs); c.stroke();
  }
  // scorched centre
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, ring3 * sc);
  g.addColorStop(0, 'rgba(235,150,70,0.42)'); g.addColorStop(0.45, 'rgba(214,92,58,0.18)'); g.addColorStop(1, 'rgba(214,92,58,0.04)');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, ring3 * sc, 0, Math.PI * 2); c.fill();
  // 1 and 2 km rings (dim)
  c.strokeStyle = 'rgba(242,234,216,0.22)'; c.lineWidth = 1.5;
  for (const kmr of [1, 2]) { c.beginPath(); c.arc(cx, cy, (ring3 * kmr / 3) * sc, 0, Math.PI * 2); c.stroke(); }
  // the 3 km ring draws itself
  const rk = L.ease.inOutCubic(L.prog(gt, tRing - 0.05, 0.55));
  if (rk > 0) {
    c.strokeStyle = L.rgba(ACC); c.lineWidth = 3.5 * Math.max(0.5, sc);
    c.beginPath(); c.arc(cx, cy, ring3 * sc, -Math.PI / 2, -Math.PI / 2 + rk * Math.PI * 2); c.stroke();
  }
  // ground zero cross
  c.strokeStyle = L.rgba(IVORY, 0.9); c.lineWidth = 2;
  const cr = 11 * sc;
  c.beginPath(); c.moveTo(cx - cr, cy); c.lineTo(cx + cr, cy); c.moveTo(cx, cy - cr); c.lineTo(cx, cy + cr); c.stroke();
  c.restore();
  // rim (drawn from the first frame: the lens grows out of the 3 km circle as a ring)
  c.strokeStyle = L.rgba(ACC, L.lerp(0.95, 0.7, pk)); c.lineWidth = L.lerp(3.5, 2.5, pk);
  c.beginPath(); c.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2); c.stroke();
  // labels (only once the lens is open), and they leave with the ring on exit
  const lk = L.clamp((k - 0.85) / 0.15) * pk;
  if (lk > 0) {
    c.globalAlpha *= lk;
    c.shadowColor = 'rgba(2,6,14,0.95)'; c.shadowBlur = 8;
    txt(c, 'GROUND ZERO', cx, cy + 34, L.font(19, 700, L.FONT.body), IVORY, { track: 3, align: 'center', alpha: 0.9 });
    c.shadowBlur = 0;
    // 3 KM tag on the ring top
    const tk = L.ease.outBack(L.prog(gt, tRing + 0.3, 0.35), 1.5);
    if (tk > 0) {
      const f = L.font(30, 800, L.FONT.display), w2 = tw(c, '3 KM', f, 2) + 30, h2 = 42;
      c.save();
      c.translate(cx, cy - ring3);
      c.scale(L.lerp(0.6, 1, L.clamp(tk)), L.lerp(0.6, 1, L.clamp(tk)));
      c.fillStyle = L.rgba(ACC);
      L.roundRect(c, -w2 / 2, -h2 / 2, w2, h2, h2 / 2); c.fill();
      txt(c, '3 KM', 0, 2, f, NAVY, { track: 2, align: 'center', base: 'middle' });
      c.restore();
    }
    // Yamaguchi on the ring
    const hk = L.ease.outBack(L.prog(gt, tHim, 0.4), 1.6);
    if (hk > 0) {
      const a = brg * Math.PI / 180;
      const hx = cx + Math.sin(a) * ring3, hy = cy - Math.cos(a) * ring3;
      const safe = L.ease.outCubic(L.prog(gt, tSafe, 0.5));
      c.save();
      c.globalAlpha *= L.clamp(hk * 3);
      L.lightBlob(c, hx, hy, 40 + 30 * safe, ACC, 0.35 + 0.3 * safe);
      c.fillStyle = L.rgba(IVORY);
      c.beginPath(); c.arc(hx, hy, Math.max(0, 9 * hk), 0, Math.PI * 2); c.fill();
      c.strokeStyle = L.rgba(ACC); c.lineWidth = 3;
      c.beginPath(); c.arc(hx, hy, Math.max(0, 9 * hk), 0, Math.PI * 2); c.stroke();
      if (safe > 0) {
        c.strokeStyle = L.rgba(ACC, 0.8 * (1 - L.prog(gt, tSafe, 1.4)));
        c.lineWidth = 2;
        c.beginPath(); c.arc(hx, hy, 12 + 30 * L.ease.outCubic(L.prog(gt, tSafe, 1.4)), 0, Math.PI * 2); c.stroke();
      }
      c.shadowColor = 'rgba(2,6,14,0.95)'; c.shadowBlur = 8;
      // the label sits on the inward side of his dot (toward the centre), so it never crosses the lens rim
      const up = Math.cos(a) < 0;
      txt(c, 'YAMAGUCHI', hx, hy + (up ? -28 : 30), L.font(21, 700, L.FONT.body), IVORY, { track: 2, align: 'center', base: 'middle' });
      c.restore();
    }
  }
  c.restore();
}
