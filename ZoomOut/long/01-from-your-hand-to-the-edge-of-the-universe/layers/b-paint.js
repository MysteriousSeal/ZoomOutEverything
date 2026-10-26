// Builder B — the city ground painter: paints one world-anchored tile at a given resolution (m = metres per pixel),
// satellite style, summer afternoon, light from the lower left (shadows to the upper right). Used by b-tiles.js.
//   land / water from the REAL coastlines (geo.js FINE inside its window, MED, COARSE), urban land cover, parks
//   Manhattan: blocks, lots, rooftops, tower shadows (m < 24); generic urban fabric elsewhere (m < 24)
//   Central Park: lawns, woods (every tree), water, drives, ballfields; the meadow area from park-data.js
//   bridges (real places), airport runways (real thresholds)
import * as L from '../../../../engine/runtime/lib.js';
import { unll, RINGS, FINE_WIN, inFineWin, CENTRAL_PARK, fromGrid, toGrid, GU, GW, GRID_O, streetU, PARK_LEN, PARK_WID, ll, BRIDGES, RUNWAYS,
  PARKS_LL, BROADWAY, AVENUES, inSet } from './b-geo.js';
import { elevation } from '../../../../engine/runtime/earth.js';
import { LAKES } from './b-lakes.js';
import { WATERS, LAWNS, STRUCTURES, DRIVES, TRANSVERSES, treesIn, PATHS, MEADOW_POLY, toWorld, PAL, parkToGrid } from './b-park.js';
import { BLOCK_ROWS, TALL, AVE_W, ST_W, inManhattan } from './b-manhattan.js';

const SHX = 0.6, SHY = -0.8;                   // shadow direction (world/screen: x right, y down)
const SHADOW_K = 0.9;                          // shadow length / height (sun ~48 deg)
const hsh = (a, b, s = 0) => { const n = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const lg = (m) => Math.log2(m);
function h2(i, j, s) { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/** smooth 2D value noise in [0, 1] */
export function vn2(x, y, s = 0) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = h2(i, j, s), b = h2(i + 1, j, s), c = h2(i, j + 1, s), d = h2(i + 1, j + 1, s);
  return (a + (b - a) * su) * (1 - sv) + (c + (d - c) * su) * sv;
}
export const fbm2 = (x, y, s = 0) => 0.5 * vn2(x, y, s) + 0.3 * vn2(x * 2.03, y * 2.03, s + 1) + 0.2 * vn2(x * 4.1, y * 4.1, s + 2);

// ------------------------------------------------------------------ palette (satellite, summer)
export const COL = {
  waterNear: [26, 60, 80],        // Hudson / East River / the harbour, close up
  waterFar: [28, 84, 128],        // matches earth.js 'day' shelf water near New York (blended in at large scales)
  shore: [150, 150, 140],
  urban: [124, 120, 112],         // the boroughs' mean rooftop / street tone
  suburb: [98, 110, 84],         // tree-lined suburbs
  wild: [60, 92, 47],             // forest / open land (≈ earth.js day land near 41°N)
  street: [74, 76, 80], avenue: [80, 82, 86], sidewalk: [140, 136, 128],
  park: [70, 104, 52], parkWood: [56, 86, 46],
  runway: [164, 162, 154], apron: [150, 148, 140],
  bridge: [214, 210, 198],
};
// open water far out: the SAME colours earth.js's 'day' globe uses (ocean depth from ETOPO1, lit as at New York), so
// the map's sea and the globe's sea are identical at the hand-off
const OCEAN = [[0, [38, 104, 150]], [60, [28, 88, 140]], [200, [19, 66, 120]], [1000, [14, 48, 100]], [3000, [10, 36, 82]], [5000, [7, 27, 66]], [8000, [5, 18, 48]]];
const WR = { x0: -620000, y0: -580000, s: 1000, w: 1240, h: 1160 };
let WRV = null;
function waterRaster() {
  if (WRV) return WRV;
  const cv = new OffscreenCanvas(WR.w, WR.h), g = cv.getContext('2d'), im = g.createImageData(WR.w, WR.h), d = im.data;
  for (let j = 0; j < WR.h; j++) for (let i = 0; i < WR.w; i++) {
    const p = unll(WR.x0 + (i + 0.5) * WR.s, WR.y0 + (j + 0.5) * WR.s);
    const dep = Math.max(0, -elevation(p.lat, p.lon));
    const c = L.ramp(OCEAN, dep), o = (j * WR.w + i) * 4, k = 0.98;
    d[o] = c[0] * k; d[o + 1] = c[1] * k; d[o + 2] = c[2] * k; d[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  WRV = cv;
  return cv;
}
/** water colour for a tile resolution (deep blue-teal close up -> earth.js shelf blue far out) */
export const waterCol = (m) => L.mix(COL.waterNear, COL.waterFar, L.smoothstep(L.clamp(L.invLerp(6, 9, lg(m)))));

// ------------------------------------------------------------------ land-cover field (low frequency, cached raster)
// urbanness: New York City (the five boroughs) is fully built up; around it the built-up area thins with distance from
// Midtown (Jersey City, Newark, Yonkers, Nassau are urban/suburban; the Palisades and the far suburbs are wooded).
const LC = { x0: -90000, y0: -90000, s: 112.5, n: 1600 };
let LCV = null;
export function landCover() {
  if (LCV) return LCV;
  const n = LC.n, cv = new OffscreenCanvas(n, n), g = cv.getContext('2d');
  // borough mask (blurred)
  const mk = new OffscreenCanvas(n, n), mg = mk.getContext('2d');
  mg.filter = 'blur(4px)';
  mg.fillStyle = '#fff';
  mg.beginPath();
  for (const q of RINGS.city) { const r = q.r; mg.moveTo((r[0] - LC.x0) / LC.s, (r[1] - LC.y0) / LC.s); for (let i = 2; i < r.length; i += 2) mg.lineTo((r[i] - LC.x0) / LC.s, (r[i + 1] - LC.y0) / LC.s); mg.closePath(); }
  mg.fill('nonzero');
  const md = mg.getImageData(0, 0, n, n).data;
  const im = g.createImageData(n, n), d = im.data;
  const mid = { x: -900, y: 2200 };   // Midtown
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = LC.x0 + (i + 0.5) * LC.s, y = LC.y0 + (j + 0.5) * LC.s;
      const dist = Math.hypot(x - mid.x, (y - mid.y) * 1.05);
      const nz = (fbm2(x / 9000, y / 9000, 11) - 0.5) * 2.2 + (vn2(x / 2500, y / 2500, 13) - 0.5) * 0.6;
      let urb = L.clamp(1.3 - dist / 34000 + nz * 0.4);
      const city = md[(j * n + i) * 4] / 255;
      urb = Math.max(urb, city);
      const edgeK = L.clamp(Math.min(i, j, n - 1 - i, n - 1 - j) / 175);
      let sub = L.clamp(1.4 - dist / 70000 + nz * 0.4) * edgeK;
      urb *= edgeK;
      // outside the city: green and mottled (woods and leafy suburbs), never flat
      const woods = L.clamp(fbm2(x / 4200, y / 4200, 17) * 2.2 - 0.6);
      const subTone = L.mix([94, 110, 78], [56, 86, 45], woods);
      let c = L.mix(COL.wild, subTone, sub);
      // the built-up land: warm grey-brown rooftops with street-tree speckle; leafy residential greener; light
      // industrial patches paler; the dense core (Manhattan, LIC, downtown Brooklyn, Jersey City) cool and grey
      const leafy = L.clamp(fbm2(x / 2600, y / 2600, 15) * 1.9 - 0.6), ind = L.clamp((vn2(x / 1100, y / 1100, 16) - 0.8) * 6);
      const speck = vn2(x / 420, y / 420, 18);
      let uc = L.mix([130, 128, 123], [96, 112, 84], leafy * 0.6 + (speck - 0.5) * 0.3);
      uc = L.mix(uc, [148, 144, 136], ind * 0.35);
      const core = L.clamp(1.25 - dist / 8500);
      uc = L.mix(uc, [124, 126, 131], core * 0.85);
      c = L.mix(c, uc, L.smoothstep(urb));
      const t = L.lerp(1, 0.93 + 0.14 * fbm2(x / 1400, y / 1400, 14), edgeK);
      const o = (j * n + i) * 4;
      d[o] = c[0] * t; d[o + 1] = c[1] * t; d[o + 2] = c[2] * t; d[o + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  // Manhattan: the densest, greyest land of all
  { const rr = RINGS.city[2].r; g.filter = 'blur(0.8px)'; g.fillStyle = L.rgba([110, 112, 118], 0.65); g.beginPath(); g.moveTo((rr[0] - LC.x0) / LC.s, (rr[1] - LC.y0) / LC.s); for (let i = 2; i < rr.length; i += 2) g.lineTo((rr[i] - LC.x0) / LC.s, (rr[i + 1] - LC.y0) / LC.s); g.closePath(); g.fill(); }
  // parks (green) on top, slightly feathered
  g.filter = 'blur(1.2px)';
  g.fillStyle = L.rgba([54, 88, 46], 0.95);
  const P = (lat, lon) => { const p = ll(lat, lon); return [(p.x - LC.x0) / LC.s, (p.y - LC.y0) / LC.s]; };
  for (const pk of PARKS_LL) { g.beginPath(); pk.pts.forEach(([a, b], k) => { const [x, y] = P(a, b); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); }
  // Randalls and Wards Island: parkland and sports fields
  { const rr = RINGS.city[1].r; g.fillStyle = L.rgba([82, 108, 66], 0.9); g.beginPath(); g.moveTo((rr[0] - LC.x0) / LC.s, (rr[1] - LC.y0) / LC.s); for (let i = 2; i < rr.length; i += 2) g.lineTo((rr[i] - LC.x0) / LC.s, (rr[i + 1] - LC.y0) / LC.s); g.closePath(); g.fill(); g.fillStyle = L.rgba([54, 88, 46], 0.95); }
  g.beginPath(); CENTRAL_PARK.forEach(([x, y], k) => { const X = (x - LC.x0) / LC.s, Y = (y - LC.y0) / LC.s; k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.fill();
  g.filter = 'none';
  LCV = cv;
  return cv;
}
export const urbanAt = (() => {
  let data = null;
  return (x, y) => {
    if (!data) { const cv = landCover(); data = cv.getContext('2d').getImageData(0, 0, LC.n, LC.n).data; }
    const i = Math.floor((x - LC.x0) / LC.s), j = Math.floor((y - LC.y0) / LC.s);
    if (i < 0 || j < 0 || i >= LC.n || j >= LC.n) return 0;
    const o = (j * LC.n + i) * 4;
    // distance of the colour from 'wild' toward 'urban' (grey): use saturation proxy
    const r = data[o], gg = data[o + 1], b = data[o + 2];
    return L.clamp(((r + b) / 2 - gg + 30) / 30 * 0.5 + (r - 66) / 70 * 0.5);
  };
})();

// ------------------------------------------------------------------ textures (cached)
let TX = null;
function textures() {
  if (TX) return TX;
  const mk = (n) => { const c = new OffscreenCanvas(n, n); return [c, c.getContext('2d')]; };
  // roof speckle: dense little roofs + shadow dots (for generic urban fabric at mid scales), 256 px
  const [sp, sg] = mk(256), r = L.rng(71);
  sg.fillStyle = 'rgb(128,128,128)'; sg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const x = r() * 256, y = r() * 256, w = 1 + r() * 4, h = 1 + r() * 4, v = 90 + r() * 90;
    sg.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; sg.fillRect(x, y, w, h);
  }
  for (let i = 0; i < 420; i++) {   // street trees / yards
    const x = r() * 256, y = r() * 256;
    sg.fillStyle = 'rgba(40,90,30,0.55)'; sg.beginPath(); sg.arc(x, y, 0.8 + r() * 1.8, 0, Math.PI * 2); sg.fill();
  }
  // lawn mottling (soft blotches), 256 px, tileable
  const [lw, lg2] = mk(256), r2 = L.rng(72);
  lg2.fillStyle = 'rgb(128,128,128)'; lg2.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const x = r2() * 256, y = r2() * 256, rr = 3 + r2() * 22, lite = r2() > 0.5, a = 0.03 + r2() * 0.06;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      lg2.fillStyle = lite ? `rgba(255,255,230,${a})` : `rgba(0,10,0,${a})`;
      lg2.beginPath(); lg2.arc(x + ox, y + oy, rr, 0, Math.PI * 2); lg2.fill();
    }
  }
  for (let i = 0; i < 9000; i++) {   // grain
    const x = r2() * 256, y = r2() * 256, v = r2();
    lg2.fillStyle = v > 0.5 ? 'rgba(255,255,220,0.07)' : 'rgba(0,0,0,0.07)'; lg2.fillRect(x, y, 1, 1);
  }
  // tree crown sprites: 4 tones x 4 shapes, 128 px, irregular clumped crowns lit from the lower left (+ matching
  // silhouettes for the shadows)
  const crowns = [], sils = [];
  for (let tone = 0; tone < 4; tone++) {
    for (let s2 = 0; s2 < 4; s2++) {
      const N = 128, C = 64, [cc, cg] = mk(N), rr = L.rng(100 + tone * 7 + s2 * 31);
      const base = PAL.canopy[tone], lite = L.mix(base, PAL.canopyLight, 0.7), dark = L.mix(base, [12, 26, 10], 0.55);
      // clumps: a ring of lumps around a core, radius jittered (no perfect circles)
      const lobes = [[C, C, 30 + rr() * 6]];
      const nl = 9 + ((rr() * 5) | 0);
      for (let i = 0; i < nl; i++) {
        const a = (i / nl) * Math.PI * 2 + rr() * 0.5, d = 22 + rr() * 16;
        lobes.push([C + Math.cos(a) * d, C + Math.sin(a) * d, 11 + rr() * 11]);
      }
      for (const [x, y, q] of lobes) { cg.fillStyle = L.rgba(dark); cg.beginPath(); cg.arc(x, y, q, 0, Math.PI * 2); cg.fill(); }
      // each clump lit on its lower-left, dark on its upper-right
      const sorted = lobes.slice().sort((A, B) => (A[1] - A[0]) - (B[1] - B[0]));
      for (const [x, y, q] of sorted) {
        const gr = cg.createRadialGradient(x - q * 0.45, y + q * 0.45, q * 0.05, x, y, q * 1.05);
        gr.addColorStop(0, L.rgba(lite)); gr.addColorStop(0.5, L.rgba(base)); gr.addColorStop(1, L.rgba(dark, 0.0));
        cg.fillStyle = gr; cg.beginPath(); cg.arc(x, y, q * 0.95, 0, Math.PI * 2); cg.fill();
      }
      // leaf texture: small light and dark specks
      for (let i = 0; i < 700; i++) {
        const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * 50, x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
        const litk = L.clamp(0.5 + (-(x - C) * 0.6 + (y - C) * 0.8) / 70);
        cg.fillStyle = L.rgba(L.mix(dark, lite, L.clamp(litk + (rr() - 0.5) * 0.5)), 0.4);
        cg.beginPath(); cg.arc(x, y, 0.8 + rr() * 2.0, 0, Math.PI * 2); cg.fill();
      }
      // overall self-shadow toward the upper right
      cg.globalCompositeOperation = 'source-atop';
      const sg = cg.createLinearGradient(C - 50, C + 50, C + 50, C - 50);
      sg.addColorStop(0, 'rgba(255,255,220,0.08)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,12,0,0.35)');
      cg.fillStyle = sg; cg.fillRect(0, 0, N, N);
      cg.globalCompositeOperation = 'source-over';
      crowns.push(cc);
      const [sc, sg2] = mk(N);
      sg2.drawImage(cc, 0, 0); sg2.globalCompositeOperation = 'source-in'; sg2.fillStyle = '#000'; sg2.fillRect(0, 0, N, N);
      sils.push(sc);
    }
  }
  const shc = null;
  TX = { speckle: sp, lawn: lw, crowns, sils, shadow: shc };
  return TX;
}
export const tex = () => textures();

// ------------------------------------------------------------------ path helpers (all in world metres)
function ringPath(g, set, R) {
  for (const q of set) {
    if (q.x1 < R.x0 || q.x0 > R.x1 || q.y1 < R.y0 || q.y0 > R.y1) continue;
    const r = q.r;
    g.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
    g.closePath();
  }
}
function flatPath(g, r) { g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); g.closePath(); }
const gp = (g, pts, close = true) => { pts.forEach(([w, u], i) => { const p = fromGrid(u, w); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }); if (close) g.closePath(); };
const wp = (g, pts, close = true) => { pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); if (close) g.closePath(); };

/** the land rings to use for a tile (and how): returns a list of {set, clip: 'in' | 'out' | null} */
function landSets(m, R) {
  if (m >= 160) return [{ set: RINGS.coarse, clip: null }];
  const inMed = R.x0 > -185000 && R.x1 < 180000 && R.y0 > -195000 && R.y1 < 168000;
  if (m >= 24) return [{ set: inMed ? RINGS.med : RINGS.coarse, clip: null }];
  const corners = [[R.x0, R.y0], [R.x1, R.y0], [R.x0, R.y1], [R.x1, R.y1]].map(([x, y]) => inFineWin(x, y));
  if (corners.every(Boolean)) return [{ set: RINGS.fine, clip: null }];
  return [{ set: RINGS.fine, clip: 'in' }, { set: RINGS.med, clip: 'out' }];
}

// ------------------------------------------------------------------ the painter
/** Paint world rect R = {x0, y0, x1, y1} at m metres/px into g (whose transform maps world metres to tile pixels). */
export function paint(g, R, m) {
  const T = textures();
  const W = waterCol(m);
  const kw = L.smoothstep(L.clamp(L.invLerp(6, 9, lg(m))));
  if (kw > 0) { g.imageSmoothingEnabled = true; g.drawImage(waterRaster(), WR.x0, WR.y0, WR.w * WR.s, WR.h * WR.s); }
  if (kw < 1) { g.fillStyle = L.rgba(COL.waterNear, 1 - kw); g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); }
  // shallow water / sandbars: a soft lighter rim along every shore (reads as a real waterline)
  for (const { set, clip } of landSets(m, R)) {
    g.save();
    if (clip) { g.beginPath(); if (clip === 'out') g.rect(R.x0 - 10, R.y0 - 10, R.x1 - R.x0 + 20, R.y1 - R.y0 + 20); flatPath(g, FINE_WIN); g.clip(clip === 'out' ? 'evenodd' : 'nonzero'); }
    g.beginPath(); ringPath(g, set, R);
    g.lineJoin = 'round';
    g.strokeStyle = L.rgba(L.mix(W, [120, 140, 130], 0.25), 0.5);
    g.lineWidth = Math.max(3 * m, Math.min(60, 10 * m)); g.stroke();
    g.fillStyle = L.rgba(COL.urban);
    g.fill('nonzero');
    g.clip('nonzero');
    paintLand(g, R, m, T);
    g.restore();
  }
  // bridges over the water (real places)
  if (m < 400) paintBridges(g, R, m);
}

function paintLand(g, R, m, T) {
  // 1. land cover (urban / suburban / wild + parks), low frequency
  const lc = landCover();
  g.imageSmoothingEnabled = true;
  g.drawImage(lc, LC.x0, LC.y0, LC.n * LC.s, LC.n * LC.s);
  if (R.x0 < LC.x0 || R.y0 < LC.y0 || R.x1 > LC.x0 + LC.n * LC.s || R.y1 > LC.y0 + LC.n * LC.s) {
    // beyond the land-cover raster: open land (punch the raster's area out with evenodd)
    g.beginPath(); g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); g.rect(LC.x0, LC.y0, LC.n * LC.s, LC.n * LC.s);
    g.fillStyle = L.rgba(COL.wild); g.fill('evenodd');
  }
  // 2. urban fabric: a street-grid texture per borough at its local grid angle (overlay: it shades the land-cover
  //    colour, so leafy suburbs read as tree-lined streets and the city as rooftops), then fine grain at every scale
  if (m < 60) paintFabric(g, R, m, T);
  paintGrain(g, R, m, T);
  // parks (real outlines, approximate) and airfields over the fabric
  paintParksLL(g, R, m, T);
  if (m < 64) paintManhattan(g, R, m);
  // inland lakes (Natural Earth) at regional scales, matching the globe's lakes at the hand-off
  if (m >= 32) paintLakes(g, R, m);
  // 3. airports
  if (m > 2 && m < 300) paintRunways(g, R, m);
  // 4. Central Park
  const cpR = parkBBox();
  if (!(cpR.x1 < R.x0 || cpR.x0 > R.x1 || cpR.y1 < R.y0 || cpR.y0 > R.y1)) paintCentralPark(g, R, m, T);
  // 5. tall towers and their shadows (Midtown, downtown, Hudson Yards)
  if (m < 40) paintTowers(g, R, m);
}

let LAKEW = null;
function paintLakes(g, R, m) {
  if (!LAKEW) LAKEW = LAKES.map(([, rings]) => {
    const rr = rings.map((r) => r.map(([a, b]) => ll(a, b)));
    const xs = rr[0].map((p) => p.x), ys = rr[0].map((p) => p.y);
    return { rr, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), z: rr[0][0].z };
  });
  g.save();
  g.fillStyle = L.rgba([24 * 0.98, 78 * 0.98, 132 * 0.98]);
  for (const lk of LAKEW) {
    if (lk.z < 0 || lk.x1 < R.x0 || lk.x0 > R.x1 || lk.y1 < R.y0 || lk.y0 > R.y1) continue;
    g.beginPath();
    for (const r of lk.rr) wp(g, r);
    g.fill('evenodd');
  }
  g.restore();
}
let CPB = null;
function parkBBox() {
  if (CPB) return CPB;
  const xs = CENTRAL_PARK.map((p) => p[0]), ys = CENTRAL_PARK.map((p) => p[1]);
  CPB = { x0: Math.min(...xs) - 50, x1: Math.max(...xs) + 50, y0: Math.min(...ys) - 50, y1: Math.max(...ys) + 50 };
  return CPB;
}

// grid-frame transform: (gw, gu) -> world
const toGridFrame = (g) => g.transform(GW.x, GW.y, GU.x, GU.y, GRID_O.x, GRID_O.y);
function gridBBox(R) {
  const cs = [[R.x0, R.y0], [R.x1, R.y0], [R.x0, R.y1], [R.x1, R.y1]].map(([x, y]) => toGrid(x, y));
  return { u0: Math.min(...cs.map((c) => c.u)), u1: Math.max(...cs.map((c) => c.u)), w0: Math.min(...cs.map((c) => c.w)), w1: Math.max(...cs.map((c) => c.w)) };
}

// hull of a box (in grid coords) extruded along the shadow vector (sw, su): six-point polygon
function shadowPoly(g, w0, u0, w1, u1, sw, su) {
  // corners in order; for a convex rect + translation, the hull = rect corners + translated, picked by direction
  const P = [[w0, u0], [w1, u0], [w1, u1], [w0, u1]];
  const Q = P.map(([w, u]) => [w + sw, u + su]);
  const pts = [...P, ...Q];
  // monotone chain hull
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const h = lo.slice(0, -1).concat(hi.slice(0, -1));
  g.moveTo(h[0][0], h[0][1]);
  for (let i = 1; i < h.length; i++) g.lineTo(h[i][0], h[i][1]);
  g.closePath();
}
// the shadow direction in the grid frame (per metre of height)
const SH_W = (SHX * GW.x + SHY * GW.y) * SHADOW_K, SH_U = (SHX * GU.x + SHY * GU.y) * SHADOW_K;

// ------------------------------------------------------------------ Manhattan (the grid, 14th St and north)
function paintManhattan(g, R, m) {
  const B = gridBBox(R);
  const pad = 600;   // tall shadows reach into the tile from outside
  const n0 = Math.max(14, Math.floor(59 + (B.u0 - pad) / (PARK_LEN / 51)) - 1), n1 = Math.min(222, Math.ceil(59 + (B.u1 + 60) / (PARK_LEN / 51)) + 1);
  if (n1 < n0) return;
  g.save();
  toGridFrame(g);
  // beyond ~20 m/px the grid fades to a hint and is gone by 64 m/px (the land-cover's grey takes over)
  const MA = L.clamp(L.invLerp(6, 4.4, lg(m)));
  g.globalAlpha = MA;
  const lotK = L.clamp(L.invLerp(4.6, 2.2, lg(m)));       // individual buildings from ~ 12 m/px down
  const blocks = [];
  for (let n = n0; n <= n1; n++) {
    const row = BLOCK_ROWS.get(n); if (!row) continue;
    for (const b of row) if (b.w1 > B.w0 - pad && b.w0 < B.w1 + pad) blocks.push(b);
  }
  // street surface across the whole grid area of these rows (asphalt), then blocks over it
  g.fillStyle = L.rgba(COL.street);
  for (const b of blocks) g.fillRect(b.w0 - AVE_W / 2, b.u0 - ST_W / 2, b.w1 - b.w0 + AVE_W, b.u1 - b.u0 + ST_W);
  // blocks: sidewalk / courtyard base
  for (const b of blocks) {
    g.fillStyle = b.green ? L.rgba(COL.parkWood) : L.rgba(L.mix(COL.sidewalk, COL.urban, 0.5));
    g.fillRect(b.w0, b.u0, b.w1 - b.w0, b.u1 - b.u0);
  }
  if (lotK > 0) {
    // shadows of ordinary buildings on the ground (opaque-ish dark), then roofs
    g.globalAlpha = lotK * MA;
    // (opaque, one small fill per building: the roofs cover them, and many tiny fills rasterise far faster than one
    // huge overlapping path)
    g.fillStyle = 'rgb(40,44,50)';
    for (const b of blocks) for (const t of b.lots) if (t[4] < 140) { g.beginPath(); shadowPoly(g, t[0], t[1], t[2], t[3], t[4] * SH_W, t[4] * SH_U); g.fill(); }
    // street trees along the side streets (UWS / UES / Harlem), before the roofs so they tuck under the eaves
    if (m < 3) {
      const tk = L.clamp(L.invLerp(1.6, 0.6, lg(m)));
      if (tk > 0) {
        g.fillStyle = L.rgba([60, 96, 48], 0.9 * tk);
        g.beginPath();
        for (const b of blocks) {
          if (b.n < 60 || b.green) continue;
          for (const uu of [b.u0 - 2.5, b.u1 + 2.5]) {
            for (let w = b.w0 + 6, k = 0; w < b.w1 - 6; w += 8.5, k++) {
              if (hsh(b.n * 13 + (uu > b.u0 ? 1 : 0), k, 7) < 0.3) continue;
              const rr = 2.6 + 1.6 * hsh(k, b.n, 8);
              g.moveTo(w + rr, uu); g.arc(w, uu, rr, 0, Math.PI * 2);
            }
          }
        }
        g.fill();
      }
    }
    for (const b of blocks) {
      for (const t of b.lots) {
        if (t[4] >= 140) continue;
        g.fillStyle = `rgb(${t[5] | 0},${t[6] | 0},${t[7] | 0})`;
        g.fillRect(t[0], t[1], t[2] - t[0], t[3] - t[1]);
      }
    }
    // rooftop structures (bulkheads, AC plant, skylights) with their little shadows
    if (m < 2.6) {
      const rk = L.clamp(L.invLerp(1.4, 0.6, lg(m)));
      for (const b of blocks) b.lots.forEach((t, k) => {
        if (t[4] >= 140) return;
        const h = hsh(b.n * 5 + k, b.ci, 13);
        if (h > 0.6) return;
        const lw = t[2] - t[0], lu = t[3] - t[1], w = Math.min(lw * 0.45, 3 + h * 8), u = Math.min(lu * 0.4, 3 + h * 6);
        const x = t[0] + (lw - w) * (0.2 + 0.6 * hsh(k, b.n, 14)), y = t[1] + (lu - u) * (0.2 + 0.6 * hsh(b.n, k, 15));
        g.fillStyle = `rgba(20,24,30,${0.45 * rk})`; g.fillRect(x + 3 * SH_W, y + 3 * SH_U, w, u);
        g.fillStyle = h < 0.2 ? `rgba(205,205,200,${rk})` : `rgba(${t[5] * 0.8 | 0},${t[6] * 0.8 | 0},${t[7] * 0.8 | 0},${rk})`;
        g.fillRect(x, y, w, u);
      });
    }
    // rooftop detail close up: a lit edge toward the sun (lower left = -w, -u), water tanks
    if (m < 1.2) {
      const dk = L.clamp(L.invLerp(0.2, -0.6, lg(m)));
      g.fillStyle = `rgba(255,250,235,${0.16 * dk})`;
      for (const b of blocks) for (const t of b.lots) if (t[4] < 140) { g.fillRect(t[0], t[1], 1.0, t[3] - t[1]); g.fillRect(t[0], t[1], t[2] - t[0], 1.0); }
      g.fillStyle = `rgba(110,86,64,${0.9 * dk})`;
      for (const b of blocks) b.lots.forEach((t, k) => {
        if (hsh(b.n, k, 11) > 0.22 || t[4] < 20 || t[4] >= 140) return;
        g.beginPath(); g.arc(t[0] + (t[2] - t[0]) * 0.6, t[1] + (t[3] - t[1]) * 0.5, 2.2, 0, Math.PI * 2); g.fill();
      });
    }
    // tall ordinary buildings: translucent shadows over the lower roofs, then their roofs
    g.fillStyle = 'rgba(12,16,26,0.42)';
    g.beginPath();
    for (const b of blocks) for (const t of b.lots) if (t[4] >= 140) shadowPoly(g, t[0], t[1], t[2], t[3], t[4] * SH_W, t[4] * SH_U);
    g.fill();
    for (const b of blocks) for (const t of b.lots) {
      if (t[4] < 140) continue;
      g.fillStyle = `rgb(${t[5] * 1.05 | 0},${t[6] * 1.07 | 0},${t[7] * 1.12 | 0})`;
      g.fillRect(t[0], t[1], t[2] - t[0], t[3] - t[1]);
    }
    g.globalAlpha = MA;
  }
  // mid scale (no lots): the blocks read as rooftop texture
  if (lotK < 1) {
    g.globalAlpha = (1 - lotK) * MA;
    for (const b of blocks) {
      if (b.green) continue;
      const h = b.lots.length ? b.lots.reduce((a, t) => a + t[4], 0) / b.lots.length : 20;
      const v = 0.86 + 0.22 * b.tree;
      g.fillStyle = L.rgba(L.mix([122, 123, 127], [150, 148, 142], b.tree * 0.6).map((x) => x * v));
      g.fillRect(b.w0, b.u0, b.w1 - b.w0, b.u1 - b.u0);
      // block shadow (toward the upper right) scaled with the mean height
      g.fillStyle = 'rgba(30,34,44,0.45)';
      g.fillRect(b.w0 + h * SH_W * 0.5, b.u1, b.w1 - b.w0, Math.min(ST_W, h * SH_U * 0.5));
    }
    g.globalAlpha = MA;
  }
  // Broadway (the diagonal), a slightly wider, lighter line
  if (m < 20) {
    g.strokeStyle = L.rgba([92, 92, 94], L.clamp(L.invLerp(4.3, 2, lg(m))));
    g.lineWidth = Math.max(24, 1.2 * m); g.lineJoin = 'round';
    g.beginPath(); BROADWAY.forEach(([u, w], i) => (i ? g.lineTo(w, u) : g.moveTo(w, u))); g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------------ generic urban fabric (elsewhere in the city)
// Street-grid textures at each area's local grid angle: the Bronx ~N-S, Brooklyn/Queens ~ the Manhattan angle, Staten
// Island and New Jersey ~10 deg, Lower Manhattan and the Village irregular (two crossing grids).
let REG = null;
function regions() {
  if (REG) return REG;
  const path = (rings) => { const p = new Path2D(); for (const r of rings) flatPath(p, r); return p; };
  const C = RINGS.city.map((q) => q.r);
  // Manhattan south of 14th St: the island clipped by a half-plane across the grid at 14th St
  const a = fromGrid(streetU(14), -5000), b = fromGrid(streetU(14), 5000), c2 = fromGrid(streetU(14) - 9000, 5000), d = fromGrid(streetU(14) - 9000, -5000);
  const down = new Path2D(); down.moveTo(a.x, a.y); down.lineTo(b.x, b.y); down.lineTo(c2.x, c2.y); down.lineTo(d.x, d.y); down.closePath();
  const nyc = path(C);
  REG = [
    { clip: path([C[0]]), ang: 2, seed: 1 },                                  // the Bronx
    { clip: path([C[3]]), ang: 27, seed: 2 },                                 // Brooklyn + Queens
    { clip: path([C[9]]), ang: 12, seed: 3 },                                 // Staten Island
    { clip: path([C[2]]), clip2: down, ang: 48, seed: 4, small: true },       // Lower Manhattan / the Village
    { clipOut: nyc, ang: 9, seed: 5 },                                        // New Jersey, Westchester, Nassau
  ];
  return REG;
}
function fabricTex() {
  if (TX.fabric) return TX.fabric;
  const n = 512, cv = new OffscreenCanvas(n, n), g = cv.getContext('2d'), r = L.rng(808);
  // 1 texel = 2 m: blocks 204.8 x 85.3 m (5 x 12 per tile), streets ~14 m
  g.fillStyle = 'rgb(84,84,84)'; g.fillRect(0, 0, n, n);
  const bw = n / 5, bh = n / 12, st = 7;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 12; j++) {
    const x = i * bw + st / 2, y = j * bh + st / 2, w = bw - st, h = bh - st;
    g.fillStyle = 'rgb(132,132,132)'; g.fillRect(x, y, w, h);
    // two rows of houses / buildings along the long sides, a yard strip between them
    for (const [ry, rh] of [[y + 1, h * 0.38], [y + h * 0.62 - 1, h * 0.38]]) {
      let xx = x + 1;
      while (xx < x + w - 2) {
        const ww = Math.min(x + w - 1 - xx, 3 + r() * 9), v = 105 + r() * 75;
        g.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; g.fillRect(xx, ry, ww - 0.6, rh);
        xx += ww;
      }
    }
    g.fillStyle = 'rgba(70,70,70,0.6)'; g.fillRect(x, y + h * 0.38 + 1, w, h * 0.24 - 2);   // yards / trees (darker)
    // shadow of the south row on the street to its north... (sun from the lower left)
    g.fillStyle = 'rgba(40,40,40,0.35)'; g.fillRect(x + 1.5, y - 2, w, 2);
  }
  TX.fabric = cv;
  return cv;
}
function paintFabric(g, R, m, T) {
  // fades in below ~30 m/px; neighbourhoods (2.4 km cells) each keep their own grid angle around the borough's mean,
  // so the grids meet at angles the way real neighbourhood grids do (never one uniform wallpaper)
  const k = L.clamp(L.invLerp(5.9, 3.2, lg(m)));
  if (k <= 0) return;
  const tex = fabricTex(), C = 2400;
  const i0 = Math.floor(R.x0 / C), i1 = Math.floor(R.x1 / C), j0 = Math.floor(R.y0 / C), j1 = Math.floor(R.y1 / C);
  for (const rg of regions()) {
    g.save();
    if (rg.clipOut) { const p = new Path2D(); p.rect(R.x0 - 10, R.y0 - 10, R.x1 - R.x0 + 20, R.y1 - R.y0 + 20); p.addPath(rg.clipOut); g.clip(p, 'evenodd'); }
    else { g.clip(rg.clip, 'nonzero'); if (rg.clip2) g.clip(rg.clip2); }
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = (rg.clipOut ? 0.45 : 0.6) * k;
    const sc = rg.small ? 1.1 : 2;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const h = hsh(i, j, 40 + rg.seed), ang = rg.ang + (h - 0.5) * (rg.small ? 50 : 34);
      const pat = g.createPattern(tex, 'repeat');
      pat.setTransform(new DOMMatrix().translate(i * C + h * 300, j * C + h * 170).rotate(-ang).scale(sc * (0.85 + 0.3 * hsh(j, i, 41))));
      g.fillStyle = pat;
      g.fillRect(Math.max(R.x0, i * C), Math.max(R.y0, j * C), Math.min(R.x1, (i + 1) * C) - Math.max(R.x0, i * C), Math.min(R.y1, (j + 1) * C) - Math.max(R.y0, j * C));
    }
    g.restore();
  }
}
function grainTex() {
  if (TX.grain) return TX.grain;
  const n = 256, cv = new OffscreenCanvas(n, n), g = cv.getContext('2d'), r = L.rng(909);
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 5000; i++) {
    const x = r() * n, y = r() * n, s2 = 0.6 + r() * r() * 3.5, v = 128 + (r() - 0.5) * 90;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      g.fillStyle = `rgba(${v | 0},${v | 0},${v | 0},0.7)`; g.fillRect(x + ox, y + oy, s2, s2);
    }
  }
  TX.grain = cv;
  return cv;
}
function paintGrain(g, R, m) {
  if (m < 3) return;
  const pat = g.createPattern(grainTex(), 'repeat');
  const t = m * 1.6;   // texel = 1.6 screen px at this tile's own resolution
  pat.setTransform(new DOMMatrix([t, 0, 0, t, 0, 0]));
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = 0.7 * L.clamp(L.invLerp(1.6, 3.5, lg(m))) * (1 - 0.6 * L.clamp(L.invLerp(8, 10, lg(m))));
  g.fillStyle = pat; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
  // a coarser octave: neighbourhood-scale mottling (rooftop and tree-cover patches ~10 px across)
  const pat2 = g.createPattern(textures().lawn, 'repeat');
  const t2 = m * 0.7;
  pat2.setTransform(new DOMMatrix([t2, 0, 0, t2, t2 * 37, t2 * 91]));
  g.globalAlpha = 0.25 * L.clamp(L.invLerp(2.3, 3.6, lg(m))) * (1 - 0.7 * L.clamp(L.invLerp(8, 10, lg(m))));
  g.fillStyle = pat2; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
  g.restore();
}
function paintParksLL(g, R, m, T) {
  if (!PARK_POLYS) PARK_POLYS = PARKS_LL.map((p) => p.pts.map(([a, b]) => ll(a, b)));
  g.save();
  // airfields: grass and aprons around the runways
  for (const a of AIRPORTS()) {
    if (a.x + a.r < R.x0 || a.x - a.r > R.x1 || a.y + a.r < R.y0 || a.y - a.r > R.y1) continue;
    g.fillStyle = L.rgba([126, 132, 112], 0.55);
    g.strokeStyle = L.rgba([126, 132, 112], 0.55); g.lineJoin = 'round'; g.lineWidth = 400;
    g.filter = `blur(${Math.max(1, 150 / m).toFixed(1)}px)`;
    g.beginPath(); wp(g, a.hull); g.fill(); g.stroke();
    g.filter = 'none';
  }
  g.restore();
}
let PARK_POLYS = null;
function inBigPark(x, y) {
  if (!PARK_POLYS) PARK_POLYS = PARKS_LL.map((p) => p.pts.map(([a, b]) => ll(a, b)));
  const gq = toGrid(x, y);
  if (gq.u > -20 && gq.u < PARK_LEN + 20 && gq.w > -20 && gq.w < PARK_WID + 20) return true;
  for (const P of PARK_POLYS) {
    let ins = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      if ((P[i].y > y) !== (P[j].y > y) && x < ((P[j].x - P[i].x) * (y - P[i].y)) / (P[j].y - P[i].y) + P[i].x) ins = !ins;
    }
    if (ins) return true;
  }
  // airports
  for (const a of AIRPORTS()) if (Math.hypot(x - a.x, y - a.y) < a.r) return true;
  return false;
}
let AP = null;
function AIRPORTS() {
  if (AP) return AP;
  AP = [];
  const groups = [RUNWAYS.slice(0, 4), RUNWAYS.slice(4, 6), RUNWAYS.slice(6)];
  for (const gq of groups) {
    const pts = gq.flatMap(([a, b]) => [ll(a[0], a[1]), ll(b[0], b[1])]);
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length, y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const r = Math.max(...pts.map((p) => Math.hypot(p.x - x, p.y - y))) * 1.1;
    // convex hull of the runway ends
    const P = pts.map((p) => [p.x, p.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    const hull = lo.slice(0, -1).concat(hi.slice(0, -1)).map(([hx, hy]) => ({ x: hx, y: hy }));
    AP.push({ x, y, r, hull });
  }
  return AP;
}

// ------------------------------------------------------------------ airports
function paintRunways(g, R, m) {
  const k = L.clamp(L.invLerp(8.3, 6.5, lg(m)));
  if (k <= 0) return;
  g.save();
  g.globalAlpha = k;
  g.lineCap = 'butt';
  for (const [a, b, w] of RUNWAYS) {
    const p = ll(a[0], a[1]), q = ll(b[0], b[1]);
    if (Math.max(p.x, q.x) < R.x0 - 100 || Math.min(p.x, q.x) > R.x1 + 100 || Math.max(p.y, q.y) < R.y0 - 100 || Math.min(p.y, q.y) > R.y1 + 100) continue;
    g.strokeStyle = L.rgba(COL.runway);
    g.lineWidth = Math.max(w, 2.2 * m);
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke();
    if (m < 6) {   // centre line
      g.strokeStyle = L.rgba([235, 235, 230], 0.6); g.lineWidth = Math.max(1, 0.6 * m); g.setLineDash([30, 20]);
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); g.setLineDash([]);
    }
  }
  g.restore();
}

// ------------------------------------------------------------------ bridges
function paintBridges(g, R, m) {
  const k = L.clamp(L.invLerp(8.6, 7.4, lg(m)));
  if (k <= 0) return;
  g.save();
  g.lineCap = 'round';
  for (const b of BRIDGES) {
    const p = ll(b.a[0], b.a[1]), q = ll(b.b[0], b.b[1]);
    if (Math.max(p.x, q.x) < R.x0 - 200 || Math.min(p.x, q.x) > R.x1 + 200 || Math.max(p.y, q.y) < R.y0 - 200 || Math.min(p.y, q.y) > R.y1 + 200) continue;
    const w = Math.max(b.w, 1.6 * m);
    // shadow on the water (upper right), then the deck
    const off = Math.min(60, 40);
    g.strokeStyle = `rgba(8,16,22,${0.35 * k})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(p.x + SHX * off, p.y + SHY * off); g.lineTo(q.x + SHX * off, q.y + SHY * off); g.stroke();
    g.strokeStyle = L.rgba(COL.bridge, k); g.lineWidth = w;
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke();
    if (m < 4) {   // towers
      const L2 = Math.hypot(q.x - p.x, q.y - p.y), ux = (q.x - p.x) / L2, uy = (q.y - p.y) / L2;
      g.fillStyle = L.rgba([170, 166, 156], k);
      for (const f of [0.3, 0.7]) { const cx = p.x + ux * L2 * f, cy = p.y + uy * L2 * f; g.beginPath(); g.arc(cx, cy, w * 0.75, 0, Math.PI * 2); g.fill(); }
    }
  }
  g.restore();
}

// ------------------------------------------------------------------ towers (real supertalls)
function paintTowers(g, R, m) {
  const k = L.clamp(L.invLerp(5.3, 3.5, lg(m)));
  if (k <= 0) return;
  g.save();
  g.globalAlpha = k;
  for (const t of TALL) {
    const sx = SHX * SHADOW_K * t.h, sy = SHY * SHADOW_K * t.h;
    if (t.x + Math.max(sx, 0) + 60 < R.x0 || t.x + Math.min(sx, 0) - 60 > R.x1 || t.y + Math.max(sy, 0) + 60 < R.y0 || t.y + Math.min(sy, 0) - 60 > R.y1) continue;
    g.save();
    if (t.grid) { toGridFrame(g); g.translate(t.gw, t.gu); } else { g.translate(t.x, t.y); g.rotate(29 * Math.PI / 180); }
    // shadow (in local frame: shadow vector rotated into the local axes)
    const lw = t.grid ? SH_W : (SHX * Math.cos(-29 * Math.PI / 180) - SHY * Math.sin(-29 * Math.PI / 180)) * SHADOW_K;
    const lu = t.grid ? SH_U : (SHX * Math.sin(-29 * Math.PI / 180) + SHY * Math.cos(-29 * Math.PI / 180)) * SHADOW_K;
    g.fillStyle = 'rgba(10,14,24,0.5)';
    g.beginPath(); shadowPoly(g, -t.hw, -t.hu, t.hw, t.hu, lw * t.h, lu * t.h); g.fill();
    // roof: lit edge (lower left) and darker crown
    g.fillStyle = 'rgb(150,156,166)'; g.fillRect(-t.hw, -t.hu, t.hw * 2, t.hu * 2);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(-t.hw, -t.hu, t.hw * 2, Math.max(1.5 * m, 3));
    g.fillRect(-t.hw, -t.hu, Math.max(1.5 * m, 3), t.hu * 2);
    g.restore();
  }
  g.restore();
}

// ------------------------------------------------------------------ Central Park
function paintCentralPark(g, R, m, T) {
  const lm = lg(m);
  // the park's base lawn
  g.save();
  g.beginPath(); CENTRAL_PARK.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = L.rgba(L.mix(PAL.grass, [74, 104, 52], L.clamp(L.invLerp(0, 3, lm))));
  g.fill();
  g.clip();
  // lawn mottling (world-anchored)
  if (m < 12) {
    const pat = g.createPattern(T.lawn, 'repeat');
    const s = m < 0.4 ? 0.12 : 0.6;   // metres per texel
    pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
    g.globalAlpha = 0.55;
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = pat; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }
  // at coarse scales the trees are not drawn one by one: the park takes its mean (mostly wooded) canopy tone
  if (m >= 12) { g.fillStyle = L.rgba([58, 90, 45], 0.75); g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); }
  // water bodies
  g.save(); toGridFrame(g);
  g.fillStyle = L.rgba(PAL.water);
  for (const q of WATERS) { g.beginPath(); gp0(g, q.pts); g.fill(); }
  // reservoir: a slightly deeper blue and its running track
  const res = WATERS[0];
  g.fillStyle = L.rgba(L.mix(PAL.water, [40, 70, 96], 0.6)); g.beginPath(); gp0(g, res.pts); g.fill();
  if (m < 6) {
    g.strokeStyle = L.rgba([176, 150, 120]); g.lineWidth = Math.max(4, 0.8 * m); g.lineJoin = 'round';
    g.beginPath(); gp0(g, res.pts.map(([w, u]) => [w + (w - 440) * 0.04, u + (u - 2600) * 0.035])); g.stroke();
  }
  // ballfields (tan infields), formal garden
  if (m < 8) {
    for (const lw of LAWNS) {
      if (lw.formal) { g.fillStyle = L.rgba([120, 140, 90]); g.beginPath(); gp0(g, lw.pts); g.fill(); continue; }
      if (!lw.fields) continue;
      const xs = lw.pts.map((p) => p[0]), us = lw.pts.map((p) => p[1]);
      const w0 = Math.min(...xs), w1 = Math.max(...xs), u0 = Math.min(...us), u1 = Math.max(...us);
      const n = lw.fields, cols = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        const cw = L.lerp(w0, w1, (i % cols + 0.5) / cols), cu = L.lerp(u0, u1, i < cols ? 0.28 : 0.72);
        if (!inPolyLocal(lw.pts, cw, cu)) continue;
        g.fillStyle = L.rgba([170, 146, 112], 0.75);
        g.beginPath(); g.moveTo(cw, cu); g.arc(cw, cu, 24, (i < cols ? 0.25 : 1.25) * Math.PI, (i < cols ? 0.75 : 1.75) * Math.PI); g.closePath(); g.fill();
      }
    }
  }
  // structures (with short shadows)
  for (const s of STRUCTURES) {
    g.fillStyle = 'rgba(20,30,16,0.45)';
    g.save(); g.translate(s.h * SH_W, s.h * SH_U); g.beginPath(); gp0(g, s.pts); g.fill(); g.restore();
    g.fillStyle = L.rgba(s.col); g.beginPath(); gp0(g, s.pts); g.fill();
  }
  // drives and transverses
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const d of [...DRIVES, ...TRANSVERSES]) {
    g.strokeStyle = L.rgba(d.w > 10 ? [96, 98, 100] : PAL.road);
    g.lineWidth = Math.max(d.w, 1.1 * m);
    g.beginPath(); gp0(g, d.pts, false); g.stroke();
  }
  g.restore();
  // park-data paths and the meadow (park frame, world coords)
  if (m < 4) paintMeadowPaths(g, m);
  // trees (individually down to 12 m/px; beyond that the park is a few pixels wide and its mean canopy tone is used)
  if (m < 12) paintTrees(g, R, m, T);
  // the park wall / perimeter: a thin stone line (Fifth Ave / CPW)
  g.restore();
}
const gp0 = (g, pts, close = true) => { pts.forEach(([w, u], i) => (i ? g.lineTo(w, u) : g.moveTo(w, u))); if (close) g.closePath(); };
function inPolyLocal(pts, w, u) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [wi, ui] = pts[i], [wj, uj] = pts[j];
    if ((ui > u) !== (uj > u) && w < ((wj - wi) * (u - ui)) / (uj - ui) + wi) ins = !ins;
  }
  return ins;
}

function paintMeadowPaths(g, m) {
  // worn grass inside the Sheep Meadow (soft), then paths
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const p of PATHS) {
    const pts = p.pts.map(([u, w]) => toWorld(u, w));
    if (p.kind === 'plaza') {
      // Bethesda Terrace: stone plaza with the fountain
      const a = toWorld(p.pts[0][0], p.pts[0][1] - 35), b = toWorld(p.pts[1][0], p.pts[0][1] - 35);
      g.strokeStyle = L.rgba(PAL.stone); g.lineWidth = p.w; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      const c = toWorld((p.pts[0][0] + p.pts[1][0]) / 2 + 8, p.pts[0][1] - 35);
      g.fillStyle = L.rgba(PAL.waterLight); g.beginPath(); g.arc(c.x, c.y, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = L.rgba([150, 140, 120]); g.beginPath(); g.arc(c.x, c.y, 2.2, 0, Math.PI * 2); g.fill();
      g.lineCap = 'round';
      continue;
    }
    if (p.kind === 'road') continue;   // drawn with the drives (same polylines in the grid set)
    g.strokeStyle = L.rgba(PAL.pathEdge); g.lineWidth = Math.max(p.w + 0.8, 1.0 * m);
    g.beginPath(); wp(g, pts, false); g.stroke();
    g.strokeStyle = L.rgba(p.kind === 'mall' ? L.mix(PAL.path, [190, 176, 150], 0.4) : PAL.path); g.lineWidth = Math.max(p.w, 0.8 * m);
    g.beginPath(); wp(g, pts, false); g.stroke();
  }
  // park-data roads too (West / East Drive near the meadow), in PAL.road
  for (const p of PATHS) {
    if (p.kind !== 'road') continue;
    g.strokeStyle = L.rgba(PAL.road); g.lineWidth = Math.max(p.w, 1.0 * m);
    g.beginPath(); wp(g, p.pts.map(([u, w]) => toWorld(u, w)), false); g.stroke();
    if (m < 0.3) {
      g.strokeStyle = L.rgba(PAL.roadLine, 0.7); g.lineWidth = 0.15; g.setLineDash([3, 6]);
      g.beginPath(); wp(g, p.pts.map(([u, w]) => toWorld(u, w)), false); g.stroke(); g.setLineDash([]);
    }
  }
  // rowboats on the Lake (static, moored-looking spread)
  if (m < 1.5) {
    const r = L.rng(31);
    for (let i = 0; i < 22; i++) {
      const u = 380 + r() * 280, w = -120 + r() * 300;
      if (!inLakeP(u, w)) continue;
      const p = toWorld(u, w), a = r() * Math.PI;
      g.save(); g.translate(p.x, p.y); g.rotate(a);
      g.fillStyle = 'rgba(10,30,30,0.35)'; g.beginPath(); g.ellipse(1.2, -1.5, 2.2, 0.75, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = L.rgba(i % 3 ? [196, 196, 186] : [150, 96, 70]); g.beginPath(); g.ellipse(0, 0, 2.1, 0.7, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  g.restore();
}
import { inLake as inLakeP } from './park-data.js';

let SHBUF = null;
function paintTrees(g, R, m, T) {
  const lm = lg(m);
  const pad = 40;
  const trees = treesIn(R.x0 - pad, R.y0 - pad, R.x1 + pad, R.y1 + pad);
  if (!trees.length) return;
  const sprite = m < 0.5;
  const pick = (t) => t.tone * 4 + (((t.x * 7.3 + t.y * 3.1) | 0) & 1023) % 4;
  // shadows (toward the upper right by the crown height), as an opaque mask composited once, so overlapping shadows
  // never stack darker than one shadow
  if (m < 10) {
    if (!SHBUF) SHBUF = new OffscreenCanvas(512, 512);
    const sb = SHBUF.getContext('2d');
    sb.setTransform(1, 0, 0, 1, 0, 0); sb.clearRect(0, 0, 512, 512);
    sb.setTransform(g.getTransform());
    if (sprite) {
      for (const t of trees) {
        const o = t.h * 0.62 * SHADOW_K, rr = t.r * 1.12;
        sb.drawImage(T.sils[pick(t)], t.x + SHX * o - rr, t.y + SHY * o - rr, rr * 2, rr * 2);
        if (m < 0.15) { sb.strokeStyle = '#000'; sb.lineWidth = 0.35; sb.beginPath(); sb.moveTo(t.x, t.y); sb.lineTo(t.x + SHX * o, t.y + SHY * o); sb.stroke(); }
      }
    } else {
      sb.fillStyle = '#000';
      sb.beginPath();
      for (const t of trees) { const o = t.h * 0.62 * SHADOW_K, cx = t.x + SHX * o, cy = t.y + SHY * o, r = Math.max(t.r, Math.min(0.7 * m, 6)); sb.moveTo(cx + r, cy); sb.arc(cx, cy, r, 0, Math.PI * 2); }
      sb.fill();
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 0.42;
    g.drawImage(SHBUF, 0, 0);
    g.restore();
  }
  // crowns
  if (sprite) {
    for (const t of trees) {
      const s = T.crowns[pick(t)], rr = t.r * 1.12;
      g.drawImage(s, t.x - rr, t.y - rr, rr * 2, rr * 2);
    }
  } else {
    // two-tone discs: dark body, lighter lit side toward the lower left
    // two-tone discs (dark body, lit side toward the lower left); at coarse scales the crowns keep at least ~0.7 px so
    // the woods still read as dense canopy rather than vanishing into the lawn
    const byTone = [[], [], [], []];
    for (const t of trees) byTone[t.tone].push(t);
    const rmin = Math.min(0.7 * m, 6);
    byTone.forEach((arr, tone) => {
      g.fillStyle = L.rgba(L.mix(PAL.canopy[tone], [20, 36, 18], 0.3));
      g.beginPath(); for (const t of arr) { const r = Math.max(t.r, rmin); g.moveTo(t.x + r, t.y); g.arc(t.x, t.y, r, 0, Math.PI * 2); } g.fill();
      if (m < 3) {
        g.fillStyle = L.rgba(L.mix(PAL.canopy[tone], PAL.canopyLight, 0.4), L.clamp(L.invLerp(1.6, 0.4, lm)));
        g.beginPath(); for (const t of arr) { const cx = t.x - 0.28 * t.r, cy = t.y + 0.22 * t.r; g.moveTo(cx + t.r * 0.62, cy); g.arc(cx, cy, t.r * 0.62, 0, Math.PI * 2); } g.fill();
      }
    });
  }
}
