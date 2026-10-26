// Environment for "What If the Oceans Drained?". Owned by the orchestrator — builders: read, don't edit.
//
// The planet is REAL: engine/assets/etopo6.bin is NOAA ETOPO1 (ice surface) averaged to a 0.1° grid (3600 × 1800
// Int16, row 0 = 90°N, column 0 = 180°W, metres). Every frame the globe is ray-cast per pixel (orthographic, the view
// from camera.js), so the sea level is just a threshold (the "bathtub" model): lowering it exposes the real sea floor.
//
// What the globe raster shows:
//   * land: muted hypsometric tints + hillshade; today's ice caps (Antarctica, Greenland) white;
//   * EXPOSED SEA FLOOR (elevation below 0 m but above the current sea level): sediment tones by depth, the way the
//     real ocean floor is coloured — sandy continental shelf (< 200 m), grey-brown terrigenous mud on the slopes,
//     pale calcareous ooze on the ridges (shallower than the carbonate compensation depth, ≈ 4.5 km), rust-brown
//     abyssal red clay in the deep basins, dark trenches. Multi-scale hillshade (light from the north-west) brings out
//     the ridge fabric, fracture zones and seamounts straight from the bathymetry;
//   * the water that is left: coloured by its depth below the CURRENT surface (shallow pools are translucent turquoise
//     over the sediment, deep basins navy);
//   * optional lines: today's coastline as a thin white "ghost" (ghostK) and the current shoreline glow (coastK).
// The dry-colour + hillshade field is baked once per page (≈ 1 s) into mip levels; per-pixel work is then a lookup.
// Rasters are cached across frames and sub-frames while the orientation and sea level are unchanged (holds), and
// re-projected with a tiny scale/translate for the push and drift.
//
// SEA LEVEL: `seaLevel(v)` is the DISPLAY sea level in metres (0 → −10,935), the number on the HUD gauge. The 0.1°
// grid averages away the narrowest trench floors (its deepest cell, in the Challenger Deep, is −10,460 m), so below
// −6,000 m the threshold applied to the data is compressed linearly (`dataSea`): the display reaches −10,935 m exactly
// when the last data cell in the Mariana Trench runs dry. Above −6,000 m display = data.
//
// Layers:   drawBackground  space + stars, the globe raster, atmosphere halo
//           drawHud         top bar + the SEA LEVEL gauge (top right readout y 236–346 and a slim log-scale bar
//                           at x ≈ 1012, y 380–1000). Keep labels out of x > 900 for y < 1000.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, stars, topBar } from '../../../engine/runtime/kit.js';
import { isIce } from '../../../engine/runtime/earth.js';
import { R_EARTH, PLACES, VIEWS, CLASSROOM_TILT, GLOBE_MPP, view as camView, worldOf, shotAt, shotStart } from './camera.js';
import { RIDGE_BRANCHES } from './data/ridge.js';

const { W, H } = L;
export const ACCENT = [70, 180, 255];
export { R_EARTH, PLACES, VIEWS, CLASSROOM_TILT, GLOBE_MPP, worldOf, shotAt, shotStart, isIce };
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ elevation data
const GW = 3600, GH = 1800;
const E16 = new Int16Array(await (await fetch(new URL('../../../engine/assets/etopo6.bin', import.meta.url))).arrayBuffer());
/** Elevation (m, bilinear) at lat/lon degrees. Negative = sea floor. */
export function elevation(lat, lon) {
  let fi = (90 - lat) * 10 - 0.5, fj = (lon + 180) * 10 - 0.5;
  fi = L.clamp(fi, 0, GH - 1.001);
  const i = Math.floor(fi), u = fi - i;
  fj = ((fj % GW) + GW) % GW;
  const j = Math.floor(fj), w = fj - j, j1 = (j + 1) % GW;
  const a = E16[i * GW + j], b = E16[i * GW + j1], c = E16[(i + 1) * GW + j], d = E16[(i + 1) * GW + j1];
  return (a * (1 - w) + b * w) * (1 - u) + (c * (1 - w) + d * w) * u;
}
export const DATA_MIN = -10460;                 // deepest cell in the grid (Challenger Deep, 11.35 N 142.45 E)

// ------------------------------------------------------------------ story state (pure functions of time)
/** Display sea levels (m) the story stops at. */
export const SEA = { bering: -50, dogger: -60, lgm: -120, ridge: -2500, ridgeLow: -3000, abyss: -5000, hawaii: -6000,
  last: -10800, mariana: -10935, gone: -11000 };
const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[Math.min(j, tl.lines[i].phrases.length - 1)][edge];
/** Sea-level keyframes [time, display metres] (eased in log-depth between neighbours). */
export function seaKeys(tl) {
  const sc = tl.scenes;
  const k = [[0, 0]];
  const add = (t0, t1, s) => { k.push([t0, k[k.length - 1][1]], [t1, s]); };
  add(ph(tl, 1, 0) + 0.9, ph(tl, 1, 1) + 0.15, SEA.bering);            // "Drop the sea by just fifty meters"
  add(ph(tl, 2, 0) + 1.0, ph(tl, 2, 0, 'end') + 0.2, SEA.dogger);       // "By sixty, Britain has rejoined Europe"
  add(ph(tl, 3, 1) - 0.1, ph(tl, 3, 1) + 2.6, SEA.lgm);                 // "the seas really were about 120 m lower"
  add(sc[5].start + 0.45, ph(tl, 5, 1, 'end') - 0.25, SEA.ridge);       // "Keep draining. At two and a half km, | a hidden
                                                                         //  mountain range appears": crests surface on it
  add(sc[6].start + 0.3, sc[7].start - 0.3, SEA.ridgeLow);               // slow: the ridge flanks broaden while it is traced
  add(ph(tl, 7, 0) + 0.3, ph(tl, 7, 0, 'end') + 0.1, SEA.abyss);         // "At five kilometers, most of the seafloor is dry"
  add(sc[8].start + 1.0, ph(tl, 8, 0, 'end'), SEA.hawaii);               // Hawaii: the moat round the island drains
  add(sc[9].start + 0.55, ph(tl, 9, 1) + 0.55, SEA.last);                // "The last water pools in the Mariana Trench"
  add(ph(tl, 9, 1) + 0.55, ph(tl, 9, 1, 'end') + 0.3, SEA.mariana);      // one last glint
  add(sc[10].start + 0.15, sc[10].start + 0.85, SEA.gone);               // "Then it's gone."
  add(sc[12].start + 0.1, ph(tl, 12, 0, 'end') + 0.6, 0);                // "A thin blue skin": the oceans flow back
  return k;
}
const keyCache = new WeakMap();
function keysOf(tl) { let k = keyCache.get(tl); if (!k) { k = seaKeys(tl); keyCache.set(tl, k); } return k; }
const lgD = (s) => Math.log(20 - s);           // log-depth (s ≤ 0)
/** Display sea level (m, ≤ 0) at global time gt. */
export function seaAt(gt, tl) {
  const K = keysOf(tl);
  for (let i = 1; i < K.length; i++) {
    if (gt <= K[i][0]) {
      const a = K[i - 1][1], b = K[i][1];
      if (a === b) return a;
      const e = L.ease.inOutCubic(L.invLerp(K[i - 1][0], K[i][0], gt));
      return 20 - Math.exp(L.lerp(lgD(a), lgD(b), e));
    }
  }
  return K[K.length - 1][1];
}
export const seaLevel = (v) => seaAt(v.gt, v.tl);
/** The threshold actually applied to the 0.1° data for a display sea level (see the header). */
export function dataSea(s) {
  if (s >= -6000) return s;
  return -6000 + (s + 6000) * (DATA_MIN + 6000) / (SEA.mariana + 6000);
}
/** Fraction (0..1) of today's ocean AREA still under water at display sea level s (from the grid's hypsometry). */
export function wetFraction(s) { return wetOf(dataSea(s)); }
/** Today's coastline as a thin white line (0..1): on while the sea is below today's level, off as the oceans return. */
export function ghostK(v) {
  const s = seaLevel(v);
  const back = v.gt > v.tl.scenes[12].start ? L.clamp(-s / 400) : 1;
  return L.smoothstep(L.clamp(-s / 6)) * back * 0.8;
}
/** The CURRENT shoreline glow (0..1): close-ups only (land bridges, Hawaii, the Mariana pools). */
export function coastK(v) {
  const s = seaLevel(v);
  const close = 1 - L.smoothstep(L.clamp(L.invLerp(Math.log(3000), Math.log(7000), Math.log(v.cam.mpp))));
  return close * L.smoothstep(L.clamp(-s / 8)) * (s > SEA.mariana + 1 ? 1 : 0) * 0.6;
}
/** HUD era tag. */
function era(v) {
  const s = seaLevel(v), sc = v.tl.scenes;
  if (s > -0.5) return 'TODAY';
  if (v.gt >= ph(v.tl, 3, 0) && v.gt < sc[5].start + 0.4) return '20,000 YEARS AGO';
  if (s <= SEA.mariana + 0.5) return v.gt > sc[12].start ? 'REFILLING' : 'NO OCEAN LEFT';
  if (v.gt > sc[12].start) return 'REFILLING';
  return `${s < 0 ? '−' : ''}${L.fmt(Math.round(L.mToFt(-s) / 10) * 10)} FT`;
}

// ------------------------------------------------------------------ colour tables
// land: muted hypsometric tints
const LAND = [[0, [86, 104, 72]], [150, [98, 110, 76]], [500, [116, 114, 84]], [1200, [130, 118, 94]], [2400, [142, 132, 114]],
  [3800, [162, 156, 146]], [6000, [200, 198, 194]]];
// exposed sea floor by depth (m below today's sea level)
const FLOOR = [[0, [196, 178, 136]], [40, [184, 166, 126]], [90, [172, 154, 118]], [220, [160, 144, 112]], [700, [140, 126, 104]],
  [1600, [136, 124, 106]], [2300, [168, 160, 142]], [3000, [184, 174, 156]], [3700, [168, 150, 128]], [4300, [148, 118, 96]],
  [5000, [132, 102, 84]], [5800, [116, 90, 76]], [7000, [92, 72, 64]], [9000, [66, 52, 50]], [11000, [50, 40, 40]]];
const ICE = [228, 236, 244];
// water by depth below the CURRENT surface
const WATER = [[0, [78, 168, 178]], [60, [50, 140, 166]], [250, [32, 104, 148]], [700, [20, 72, 122]], [1500, [13, 48, 94]],
  [3000, [9, 33, 74]], [6000, [6, 21, 52]], [11000, [4, 13, 36]]];
function lut(stops, n, scale) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = L.ramp(stops, i * scale); a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  return a;
}
const WATER_L = lut(WATER, 1101, 10);    // index = depth / 10
export const SEDIMENT = { shelf: FLOOR[0][1], ooze: FLOOR[6][1], clay: FLOOR[10][1], trench: FLOOR[12][1] };

// ------------------------------------------------------------------ the baked dry-colour field (+ mips)
const pack = (r, g, b) => (255 << 24) | ((b < 0 ? 0 : b > 255 ? 255 : b) << 16) | ((g < 0 ? 0 : g > 255 ? 255 : g) << 8) | (r < 0 ? 0 : r > 255 ? 255 : r);
function hash2(i, j, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** periodic 2D value noise on the cell grid (period divides 3600 × 1800) in [0, 1] */
function vn(i, j, cell, s) {
  const fi = i / cell, fj = j / cell, i0 = Math.floor(fi), j0 = Math.floor(fj), u = fi - i0, w = fj - j0;
  const nj = GW / cell, ja = j0 % nj, jb = (j0 + 1) % nj;
  const su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w);
  const a = hash2(i0, ja, s), b = hash2(i0, jb, s), c = hash2(i0 + 1, ja, s), d = hash2(i0 + 1, jb, s);
  return (a + (b - a) * sw) * (1 - su) + (c + (d - c) * sw) * su;
}
const LEV = [];   // {e: Float32Array, col: Uint32Array, w, h, inv}
let SOFT = null;  // level-0 colours, softened (close-ups)
let wetOf = () => 1;
(function bake() {
  const e0 = new Float32Array(GW * GH);
  for (let k = 0; k < e0.length; k++) e0[k] = E16[k];
  const col = new Uint32Array(GW * GH);
  const landL = lut(LAND, 701, 10), floorL = lut(FLOOR, 1101, 10);
  const cell = 11119.5;
  const at = (i, j) => e0[(i < 0 ? 0 : i >= GH ? GH - 1 : i) * GW + ((j + GW) % GW)];
  // hypsometry for wetFraction: ocean area by depth (10 m bins)
  const hyp = new Float64Array(1201);
  for (let i = 0; i < GH; i++) {
    const lat = 90 - (i + 0.5) * 0.1, cl = Math.max(0.03, Math.cos(lat * DEG));
    const polar = lat < -60 || lat > 59.5;
    for (let j = 0; j < GW; j++) {
      const o = i * GW + j, e = e0[o];
      // fine (±1 cell) and broad (±4 cells) gradients: the broad term carries ridge flanks and basins at globe scale
      const g1E = (at(i, j + 1) - at(i, j - 1)) / (2 * cell * cl), g1N = (at(i - 1, j) - at(i + 1, j)) / (2 * cell);
      const g4E = (at(i, j + 4) - at(i, j - 4)) / (8 * cell * cl), g4N = (at(i - 4, j) - at(i + 4, j)) / (8 * cell);
      const r1 = 0.55 * g1E - 0.45 * g1N, r4 = 0.55 * g4E - 0.45 * g4N;
      let r, g, b, hs;
      if (e > 0) {
        if (polar && isIce(lat, -180 + (j + 0.5) * 0.1)) {
          r = ICE[0]; g = ICE[1]; b = ICE[2];
          hs = 1 + 0.25 * Math.tanh(r1 * 40);
        } else {
          const q = Math.min(700, (e / 10) | 0) * 3;
          r = landL[q]; g = landL[q + 1]; b = landL[q + 2];
          hs = 1 + 0.4 * Math.tanh(r1 * 22 + r4 * 30);
        }
      } else {
        const D = -e, q = Math.min(1100, (D / 10) | 0) * 3;
        r = floorL[q]; g = floorL[q + 1]; b = floorL[q + 2];
        // sea floor: stronger exaggeration (its slopes are gentle; the shelves are nearly flat, so they get the most:
        // drowned river valleys, banks and moraines), the broad term keeps the ridges' shoulders lit
        const ex = 1 + 7 * Math.exp(-D / 160);
        hs = 1 + 0.46 * Math.tanh(ex * (r1 * 70 + r4 * 120));
        hyp[Math.min(1200, (D / 10) | 0)] += cl;
      }
      // sediment / ground texture: value noise (±7 %; stronger and patchier on the exposed shelves: sand vs mud)
      const n = 0.93 + 0.1 * vn(i, j, 9, 3) + 0.04 * vn(i, j, 3, 5);
      const m = hs * n;
      if (e <= 0 && e > -400) {
        const p = (vn(i, j, 15, 7) - 0.5) * 2 * Math.exp(e / 200);   // patches: + sandier, − muddier/greyer
        r *= 1 + 0.07 * p; g *= 1 + 0.05 * p; b *= 1 - 0.02 * p;
      }
      col[o] = pack(r * m, g * m, b * m);
    }
  }
  LEV.push({ e: e0, col, w: GW, h: GH, inv: 10 });
  // a [1 2 1]² blurred copy of the level-0 colours for magnified close-ups (the 0.1° cells must not read as tiles)
  const tmp = new Uint32Array(GW * GH);
  const ch = (x, k) => (x >> k) & 255;
  for (let i = 0; i < GH; i++) {
    for (let j = 0; j < GW; j++) {
      const o = i * GW + j, a = col[i * GW + (j + GW - 1) % GW], b = col[o], c = col[i * GW + (j + 1) % GW];
      tmp[o] = pack((ch(a, 0) + 2 * ch(b, 0) + ch(c, 0)) >> 2, (ch(a, 8) + 2 * ch(b, 8) + ch(c, 8)) >> 2, (ch(a, 16) + 2 * ch(b, 16) + ch(c, 16)) >> 2);
    }
  }
  SOFT = new Uint32Array(GW * GH);
  for (let i = 0; i < GH; i++) {
    const ia = Math.max(0, i - 1) * GW, ib = i * GW, ic = Math.min(GH - 1, i + 1) * GW;
    for (let j = 0; j < GW; j++) {
      const a = tmp[ia + j], b = tmp[ib + j], c = tmp[ic + j];
      SOFT[ib + j] = pack((ch(a, 0) + 2 * ch(b, 0) + ch(c, 0)) >> 2, (ch(a, 8) + 2 * ch(b, 8) + ch(c, 8)) >> 2, (ch(a, 16) + 2 * ch(b, 16) + ch(c, 16)) >> 2);
    }
  }
  for (let l = 1; l <= 3; l++) {
    const s = LEV[l - 1], w = s.w >> 1, h = s.h >> 1, e = new Float32Array(w * h), c = new Uint32Array(w * h);
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        const o = 2 * i * s.w + 2 * j, o2 = o + s.w;
        e[i * w + j] = (s.e[o] + s.e[o + 1] + s.e[o2] + s.e[o2 + 1]) * 0.25;
        const a = s.col[o], b = s.col[o + 1], cc = s.col[o2], d = s.col[o2 + 1];
        const R = ((a & 255) + (b & 255) + (cc & 255) + (d & 255)) >> 2;
        const G = (((a >> 8) & 255) + ((b >> 8) & 255) + ((cc >> 8) & 255) + ((d >> 8) & 255)) >> 2;
        const Bc = (((a >> 16) & 255) + ((b >> 16) & 255) + ((cc >> 16) & 255) + ((d >> 16) & 255)) >> 2;
        c[i * w + j] = pack(R, G, Bc);
      }
    }
    LEV.push({ e, col: c, w, h, inv: s.inv / 2 });
  }
  // cumulative: area deeper than each bin
  let tot = 0; for (let k = 0; k < hyp.length; k++) tot += hyp[k];
  const deeper = new Float64Array(hyp.length + 1);
  for (let k = hyp.length - 1; k >= 0; k--) deeper[k] = deeper[k + 1] + hyp[k];
  wetOf = (ds) => (ds >= 0 ? 1 : L.clamp(deeper[Math.min(hyp.length, Math.ceil(-ds / 10))] / tot));
})();

// ------------------------------------------------------------------ projection helpers (for scenes)
/** The globe orientation now ({r, u, c}). */
export const viewOf = (v) => camView(v.gt, v.tl);
/** Screen position of (lat, lon[, elevation m]) right now: {x, y, z}; z > 0 = facing us (z < 0 = far side). */
export function project(v, lat, lon, elev = 0) {
  const p = worldOf(viewOf(v), lat, lon, elev);
  return { x: v.wx(p.x), y: v.wy(p.y), z: p.z };
}
/** The globe disc on screen: centre and radius (px). */
export const globeDisc = (v) => ({ x: v.wx(0), y: v.wy(R_EARTH), r: v.ws(R_EARTH) });
/** Trace a lat/lon polygon on the globe (pts = [[lat, lon], ...]); far-side points are pulled onto the limb, so filled
 *  shapes wrap cleanly over the edge. For OPEN lines that may cross the limb use strokeGeo instead. */
export function geoPath(c, v, pts, close = true, step = 1.5) {
  const vw = viewOf(v);
  const cx = v.wx(0), cy = v.wy(R_EARTH), r = v.ws(R_EARTH);
  let first = true;
  const put = (lat, lon) => {
    const p = worldOf(vw, lat, lon);
    let X = p.x / R_EARTH, Y = (R_EARTH - p.y) / R_EARTH;
    if (p.z < 0) { const n = Math.hypot(X, Y) || 1; X /= n; Y /= n; }
    const sx = cx + X * r, sy = cy - Y * r;
    if (first) { c.moveTo(sx, sy); first = false; } else c.lineTo(sx, sy);
  };
  const n = pts.length, last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [a0, b0] = pts[i], [a1, b1] = pts[(i + 1) % n];
    let db = b1 - b0; if (db > 180) db -= 360; if (db < -180) db += 360;
    const k = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(db)) / step));
    for (let s = 0; s < k; s++) put(a0 + (a1 - a0) * (s / k), b0 + db * (s / k));
  }
  if (!close) put(pts[n - 1][0], pts[n - 1][1]);
  if (close) c.closePath();
}
/** Add an OPEN lat/lon polyline to the current path, broken where it passes behind the globe (z < zMin). */
export function strokeGeo(c, v, pts, step = 1, zMin = 0.02) {
  const vw = viewOf(v);
  let pen = false;
  const put = (lat, lon) => {
    const p = worldOf(vw, lat, lon);
    if (p.z < zMin) { pen = false; return; }
    const sx = v.wx(p.x), sy = v.wy(p.y);
    if (!pen) { c.moveTo(sx, sy); pen = true; } else c.lineTo(sx, sy);
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const [a0, b0] = pts[i], [a1, b1] = pts[i + 1];
    let db = b1 - b0; if (db > 180) db -= 360; if (db < -180) db += 360;
    const k = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(db)) / step));
    for (let s = 0; s < k; s++) put(a0 + (a1 - a0) * (s / k), b0 + db * (s / k));
  }
  if (pts.length) put(...pts[pts.length - 1]);
}

// ------------------------------------------------------------------ the mid-ocean ridge (data/ridge.js)
const R_KM = 6371;
function gkm(a, b) {
  const p1 = a[0] * DEG, p2 = b[0] * DEG, dl = (b[1] - a[1]) * DEG;
  return R_KM * Math.acos(L.clamp(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl), -1, 1));
}
function withLen(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gkm(pts[i - 1], pts[i])); return { pts, cum, len: cum[cum.length - 1] }; }
const B_ = Object.fromEntries(Object.entries(RIDGE_BRANCHES).map(([k, p]) => [k, withLen(p)]));
const rev = (b) => withLen(b.pts.slice().reverse());
// The TRUNK is one continuous path: Mid-Atlantic Ridge (from Iceland south) → Southwest Indian → Southeast Indian →
// Pacific-Antarctic → East Pacific Rise (to the Gulf of California). Side branches sprout as the trunk passes their
// junction and grow at the same speed. `sprout` = trunk distance (km) where a branch starts.
const T0 = B_['mid-atlantic'].len, T1 = T0 + B_['southwest-indian'].len, T2 = T1 + B_['southeast-indian'].len,
  T3 = T2 + B_['pacific-antarctic'].len, T4 = T3 + B_['east-pacific'].len;
function trunkAt(pt) {   // trunk distance of the trunk point nearest to pt
  const segs = [['mid-atlantic', 0], ['southwest-indian', T0], ['southeast-indian', T1], ['pacific-antarctic', T2], ['east-pacific', T3]];
  let best = 0, bd = 1e9;
  for (const [k, off] of segs) B_[k].pts.forEach((p, i) => { const d = gkm(p, pt); if (d < bd) { bd = d; best = off + B_[k].cum[i]; } });
  return best;
}
const arcticUp = rev(B_['arctic-atlantic']), gakkelUp = rev(B_.gakkel);
/** Ridge branches in trace order: {name, pts, cum, len, sprout}. */
export const RIDGE = [
  { name: 'mid-atlantic', ...B_['mid-atlantic'], sprout: 0 },
  { name: 'southwest-indian', ...B_['southwest-indian'], sprout: T0 },
  { name: 'southeast-indian', ...B_['southeast-indian'], sprout: T1 },
  { name: 'pacific-antarctic', ...B_['pacific-antarctic'], sprout: T2 },
  { name: 'east-pacific', ...B_['east-pacific'], sprout: T3 },
  { name: 'arctic-atlantic', ...arcticUp, sprout: 0 },
  { name: 'gakkel', ...gakkelUp, sprout: arcticUp.len },
  { name: 'american-antarctic', ...B_['american-antarctic'], sprout: T0 },
  { name: 'central-indian', ...B_['central-indian'], sprout: T1 },
  { name: 'chile-rise', ...B_['chile-rise'], sprout: trunkAt(B_['chile-rise'].pts[0]) },
  { name: 'galapagos', ...B_.galapagos, sprout: trunkAt(B_.galapagos.pts[0]) },
  { name: 'juan-de-fuca', ...B_['juan-de-fuca'], sprout: T4 },
];
/** Trunk distance (km) at which the whole system is revealed. */
export const RIDGE_TRACE_END = Math.max(...RIDGE.map((b) => b.sprout + b.len));
/** Total length of the drawn system (km, ≈ 68,000; the published figure is ≈ 65,000 km). */
export const RIDGE_TOTAL_KM = RIDGE.reduce((a, b) => a + b.len, 0);
/** Revealed length (km) when the trace front is at trunk distance D. */
export const ridgeRevealedKm = (D) => RIDGE.reduce((a, b) => a + L.clamp(D - b.sprout, 0, b.len), 0);
/** The part of branch b revealed at trunk distance D, as a lat/lon polyline (null if none); its last point is the head. */
export function ridgePart(b, D) {
  const s = D - b.sprout;
  if (s <= 0) return null;
  if (s >= b.len) return b.pts;
  let i = 1; while (i < b.cum.length && b.cum[i] < s) i++;
  const f = (s - b.cum[i - 1]) / (b.cum[i] - b.cum[i - 1] || 1);
  const a = b.pts[i - 1], c = b.pts[i];
  let db = c[1] - a[1]; if (db > 180) db -= 360; if (db < -180) db += 360;
  return [...b.pts.slice(0, i), [a[0] + (c[0] - a[0]) * f, a[1] + db * f]];
}
/**
 * Draw the ridge as a glowing seam, revealed up to trunk distance D (km; Infinity = all), on the visible hemisphere.
 * o: {alpha = 1, color = ACCENT, width = 2.2 (core, px), glow = 1 (halo strength), heads = true (bright fronts)}
 */
export function drawRidge(c, v, D = Infinity, o = {}) {
  const alpha = o.alpha ?? 1, col = o.color ?? ACCENT, w = o.width ?? 2.2, glow = o.glow ?? 1;
  if (alpha <= 0) return;
  const parts = RIDGE.map((b) => ridgePart(b, D)).filter(Boolean);
  if (!parts.length) return;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.globalCompositeOperation = 'lighter';
  const pass = (lw, a, cc) => {
    c.beginPath();
    for (const p of parts) strokeGeo(c, v, p, 0.8);
    c.lineWidth = lw; c.strokeStyle = L.rgba(cc, a * alpha); c.stroke();
  };
  if (glow > 0) { pass(w * 9, 0.06 * glow, col); pass(w * 4.5, 0.12 * glow, col); }
  pass(w * 1.8, 0.45, col);
  pass(w * 0.7, 0.9, L.mix(col, [255, 255, 255], 0.6));
  c.globalCompositeOperation = 'source-over';
  if (o.heads !== false && D < RIDGE_TRACE_END) {
    for (const p of parts) {
      const b = RIDGE.find((r) => ridgePart(r, D) === p);
      if (b && D - b.sprout >= b.len) continue;   // finished branches have no moving front
      const h = p[p.length - 1], q = project(v, h[0], h[1]);
      if (q.z < 0.05) continue;
      L.lightBlob(c, q.x, q.y, 22, L.mix(col, [255, 255, 255], 0.5), 0.8 * alpha);
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ the globe raster
const ATM = 110000;      // atmosphere rim thickness (m, drawn exaggerated)
const MARGIN = 28;       // cached raster margin (px) for drift / push re-projection
const RW = W + 2 * MARGIN, RH = H + 2 * MARGIN;
let img = null, u32 = null, bg = null, rowPrev = null;
function setup() {
  img = new ImageData(RW, RH);
  u32 = new Uint32Array(img.data.buffer);
  bg = new Uint32Array(RW * RH);
  rowPrev = new Float32Array(RW);
  for (let y = 0; y < RH; y++) {
    for (let x = 0; x < RW; x++) {
      const d = Math.hypot((x - RW / 2) / W, (y - RH * 0.45) / H) * 1.6;
      const k = L.clamp(1 - d);
      bg[y * RW + x] = pack(3 + 7 * k, 5 + 10 * k, 11 + 19 * k);
    }
  }
}
function fatan2(y, x) {
  const ax = x < 0 ? -x : x, ay = y < 0 ? -y : y;
  const a = (ax < ay ? ax : ay) / ((ax > ay ? ax : ay) || 1e-30), s = a * a;
  let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
  if (ay > ax) r = 1.57079637 - r;
  if (x < 0) r = 3.14159274 - r;
  return y < 0 ? -r : r;
}
const RAD = 180 / Math.PI;
const cacheR = { key: '', cam: null, cv: null };
export const stats = { renders: 0, hits: 0 };

function renderGlobe(cam, vw, sea, ghost, coast) {
  if (!img) setup();
  const mpp = cam.mpp, ay = H * cam.anchor + MARGIN, ax = W / 2 + MARGIN;
  const R = R_EARTH;
  // mip level: the coarsest whose cell is still smaller than ~a pixel
  const degPx = mpp / 111195;
  let lev = 0; while (lev < 3 && 0.1 * 2 ** (lev + 1) <= degPx * 1.15) lev++;
  const M = LEV[lev], EA = M.e, MW = M.w, MH = M.h, inv = M.inv;
  const cellPx = (1 / inv) / degPx;
  const CA = lev === 0 && cellPx > 2.2 ? SOFT : M.col;
  const smooth = cellPx > 2.5;                                  // magnified: smoothstep weights (no diamond steps)
  const dAmp = cellPx > 3 && sea >= 0 ? 6 * L.clamp((cellPx - 3) / 6) : 0;  // magnified, today's coasts only: detail noise (m)
  const [r0, r1, r2] = vw.r, [u0, u1, u2] = vw.u, [c0, c1, c2] = vw.c;
  const [ar, ag, ab] = [120, 178, 240];
  const [gr_, gg_, gb_] = [236, 242, 250];
  const [kr, kg, kb] = [150, 225, 255];
  u32.set(bg);
  const Ra = R + ATM;
  for (let sy = 0; sy < RH; sy++) {
    const dy = cam.y + (sy - ay) * mpp - R;
    if (dy > Ra || dy < -Ra) { rowPrev.fill(NaN); continue; }
    const half = Math.sqrt(Ra * Ra - dy * dy);
    const x0 = Math.max(0, Math.floor(ax + (-half - cam.x) / mpp)), x1 = Math.min(RW - 1, Math.ceil(ax + (half - cam.x) / mpp));
    const Y = -dy / R, Y2 = Y * Y;
    let left = NaN;
    for (let sx = 0; sx < RW; sx++) {
      if (sx < x0 || sx > x1) { rowPrev[sx] = NaN; continue; }
      const X = (cam.x + (sx - ax) * mpp) / R, rho2 = X * X + Y2;
      const o = sy * RW + sx;
      if (rho2 >= 1) {
        // atmosphere rim
        const alt = R * (Math.sqrt(rho2) - 1);
        rowPrev[sx] = NaN; left = NaN;
        if (alt >= ATM) continue;
        const a = Math.pow(1 - alt / ATM, 3) * 0.75 * (0.8 + 0.2 * L.clamp(-X * 0.6 + Y * 0.6 + 0.5));
        const b0 = bg[o];
        const br = b0 & 255, bgc = (b0 >> 8) & 255, bb = (b0 >> 16) & 255;
        u32[o] = pack(br + (ar - br) * a, bgc + (ag - bgc) * a, bb + (ab - bb) * a);
        continue;
      }
      const Z = Math.sqrt(1 - rho2);
      const px = X * r0 + Y * u0 + Z * c0, py = X * r1 + Y * u1 + Z * c1, pz = X * r2 + Y * u2 + Z * c2;
      const lat = fatan2(pz, Math.sqrt(px * px + py * py)) * RAD, lon = fatan2(py, px) * RAD;
      let fi = (90 - lat) * inv - 0.5; fi = fi < 0 ? 0 : fi > MH - 1.001 ? MH - 1.001 : fi;
      let fj = (lon + 180) * inv - 0.5; if (fj < 0) fj += MW; if (fj >= MW) fj -= MW;
      const i = fi | 0, j = fj | 0, j1 = j + 1 === MW ? 0 : j + 1;
      const u = fi - i, w = fj - j;
      const oa = i * MW + j, ob = i * MW + j1, oc = oa + MW, od = ob + MW;
      const w00 = (1 - u) * (1 - w), w01 = (1 - u) * w, w10 = u * (1 - w), w11 = u * w;
      let e;
      if (smooth) {   // magnified: smoothstep weights for the elevation only (rounded coasts, no diamond steps)
        const us = u * u * (3 - 2 * u), ws = w * w * (3 - 2 * w);
        e = (EA[oa] * (1 - ws) + EA[ob] * ws) * (1 - us) + (EA[oc] * (1 - ws) + EA[od] * ws) * us;
      } else e = EA[oa] * w00 + EA[ob] * w01 + EA[oc] * w10 + EA[od] * w11;
      let d = e - sea;
      if (dAmp > 0 && d < dAmp * 3 && d > -dAmp * 3) {
        const n = Math.sin(lat * 431.7 + Math.sin(lon * 377.3) * 2.1) * Math.sin(lon * 403.1 + Math.sin(lat * 359.9) * 2.3);
        d += n * dAmp; e += n * dAmp;
      }
      // dry colour (bilinear of the baked field)
      const ca = CA[oa], cb = CA[ob], cc = CA[oc], cd = CA[od];
      const lr = (ca & 255) * w00 + (cb & 255) * w01 + (cc & 255) * w10 + (cd & 255) * w11;
      const lg = ((ca >> 8) & 255) * w00 + ((cb >> 8) & 255) * w01 + ((cc >> 8) & 255) * w10 + ((cd >> 8) & 255) * w11;
      const lb = ((ca >> 16) & 255) * w00 + ((cb >> 16) & 255) * w01 + ((cc >> 16) & 255) * w10 + ((cd >> 16) & 255) * w11;
      // anti-aliased shoreline from the screen-space change of (elevation − sea)
      const du = rowPrev[sx], gr = (left === left ? (d > left ? d - left : left - d) : 0) + (du === du ? (d > du ? d - du : du - d) : 0) + 1e-3;
      rowPrev[sx] = d; left = d;
      const cov = d / gr + 0.5, land = cov < 0 ? 0 : cov > 1 ? 1 : cov;
      let r = lr, g = lg, b = lb;
      if (land < 1) {
        const dd = d < 0 ? -d : 0;
        const k2 = Math.min(1100, (dd / 10) | 0) * 3;
        // shallow water is translucent over the sediment
        const t = dd > 320 ? 1 : 0.3 + 0.7 * dd / 320;
        const wr = lr * 0.42 + (WATER_L[k2] - lr * 0.42) * t, wg = lg * 0.66 + (WATER_L[k2 + 1] - lg * 0.66) * t, wb = lb * 0.8 + (WATER_L[k2 + 2] - lb * 0.8) * t;
        r = wr + (lr - wr) * land; g = wg + (lg - wg) * land; b = wb + (lb - wb) * land;
      }
      if (coast > 0) {
        const ln = 1 - (d < 0 ? -d : d) / (gr * 1.1);
        if (ln > 0) { const a = ln * coast; r += (kr - r) * a; g += (kg - g) * a; b += (kb - b) * a; }
      }
      if (ghost > 0) {
        const ln = 1 - (e < 0 ? -e : e) / (gr * 1.5);
        if (ln > 0) { const a = ln * ghost; r += (gr_ - r) * a; g += (gg_ - g) * a; b += (gb_ - b) * a; }
      }
      // sphere shading: limb darkening + soft key light from the upper left; haze toward the limb
      const sh = (0.6 + 0.4 * Math.sqrt(Z)) * (0.95 + 0.1 * (-X * 0.55 + Y * 0.45));
      const zz = 1 - Z, hz = zz * zz * zz * 0.5;
      r = r * sh; g = g * sh; b = b * sh;
      r += (ar - r) * hz; g += (ag - g) * hz; b += (ab - b) * hz;
      u32[o] = pack(r, g, b);
    }
  }
  if (!cacheR.cv) cacheR.cv = new OffscreenCanvas(RW, RH);
  cacheR.cv.getContext('2d').putImageData(img, 0, 0);
  stats.renders++;
}

function drawGlobe(c, v) {
  const cam = v.cam;
  const vw = viewOf(v);
  const sea = dataSea(seaLevel(v));
  const ghost = ghostK(v), coast = coastK(v);
  const q = (x, s) => Math.round(x / s);
  const key = [vw.r, vw.u, vw.c].flat().map((x) => q(x, 2e-7)).join(',') + `|${q(sea, 0.05)}|${q(ghost, 0.01)}|${q(coast, 0.01)}`;
  const C = cacheR.cam;
  let ok = cacheR.key === key && C;
  let s = 1, dx = 0, dy = 0;
  if (ok) {
    s = C.mpp / cam.mpp;
    if (Math.abs(Math.log(s)) > 0.012) ok = false;
    else {
      // where the cached raster's (0, 0) lands on screen now
      dx = W / 2 + (C.x - cam.x) / cam.mpp - (W / 2 + MARGIN) * s;
      dy = H * cam.anchor + (C.y - cam.y) / cam.mpp - (H * C.anchor + MARGIN) * s;
      if (dx > 0 || dy > 0 || dx + RW * s < W || dy + RH * s < H) ok = false;
    }
  }
  if (!ok) {
    renderGlobe(cam, vw, sea, ghost, coast);
    cacheR.key = key; cacheR.cam = { x: cam.x, y: cam.y, mpp: cam.mpp, anchor: cam.anchor };
    s = 1; dx = -MARGIN; dy = -MARGIN;
  } else stats.hits++;
  c.save();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  if (Math.abs(s - 1) < 1e-6) c.drawImage(cacheR.cv, Math.round(dx), Math.round(dy));
  else c.drawImage(cacheR.cv, dx, dy, RW * s, RH * s);
  c.restore();
}

export function drawBackground(c, v) {
  drawGlobe(c, v);
  const disc = globeDisc(v);
  // stars, only off the disc
  if (disc.r < 5000) {
    c.save();
    c.beginPath();
    c.rect(0, 0, W, H);
    c.arc(disc.x, disc.y, Math.max(0, disc.r * 1.03), 0, Math.PI * 2, true);
    c.clip('evenodd');
    stars(c, v, 0.8, 170, 23);
    c.restore();
  }
  // soft atmospheric halo around the whole globe
  if (disc.r < 3000) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(disc.x, disc.y, disc.r * 0.97, disc.x, disc.y, disc.r * 1.16);
    g.addColorStop(0, 'rgba(90,160,240,0)');
    g.addColorStop(0.2, 'rgba(90,160,240,0.14)');
    g.addColorStop(1, 'rgba(90,160,240,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(disc.x, disc.y, Math.max(0, disc.r * 1.16), 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

// ------------------------------------------------------------------ HUD
export const fmtDepth = (m) => (Math.abs(m) < 0.5 ? '0 m' : `−${L.fmt(Math.abs(Math.round(m)))} m`);
/** 0..1: the frame is a face-on map (the globe fills the screen): a dark scrim helps the HUD read. */
function mapK(v) {
  return L.smoothstep(L.clamp(L.invLerp(Math.log(5000), Math.log(2500), Math.log(v.cam.mpp))));
}
const GAUGE = { x: 1012, y0: 384, y1: 1000, max: 11000 };
const gaugeY = (D) => GAUGE.y0 + (GAUGE.y1 - GAUGE.y0) * Math.log(1 + D / 10) / Math.log(1 + GAUGE.max / 10);
/** Screen y of a depth (m, positive) on the HUD gauge bar (for scenes that want to point at it). */
export { gaugeY, GAUGE };
export function drawHud(c, v) {
  const mk = mapK(v);
  if (mk > 0.01) {
    c.save();
    c.globalAlpha = mk;
    const g = c.createLinearGradient(0, 0, 0, 420);
    g.addColorStop(0, 'rgba(4,8,16,0.62)');
    g.addColorStop(0.6, 'rgba(4,8,16,0.32)');
    g.addColorStop(1, 'rgba(4,8,16,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, 420);
    const rg = c.createRadialGradient(W - 170, 300, 0, W - 170, 300, 300);
    rg.addColorStop(0, 'rgba(4,8,16,0.45)');
    rg.addColorStop(1, 'rgba(4,8,16,0)');
    c.fillStyle = rg;
    c.fillRect(W - 470, 0, 470, 640);
    c.restore();
  }
  topBar(c, v, ACCENT);
  const sc = v.tl.scenes;
  const kIn = L.ease.outCubic(L.prog(v.gt, sc[1].start + 0.1, 0.6));
  const kOut = 1 - L.ease.inOutCubic(L.prog(v.gt, sc[13].start + 0.1, 0.5));   // the question card owns the frame
  const k = kIn * kOut;
  if (k <= 0) return;
  const s = Math.max(SEA.mariana, seaLevel(v));
  const D = -s;
  c.save();
  c.globalAlpha = k;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(2,6,14,0.8)';
  c.shadowBlur = 14;
  c.font = L.font(20, 700, L.FONT.body);
  c.fillStyle = 'rgba(220,228,238,0.85)';
  L.trackedText(c, 'SEA LEVEL', W - 64, 252, 4, 'right');
  c.font = L.font(66, 700, L.FONT.din);
  c.fillStyle = D < 0.5 ? '#fff' : L.rgba(ACCENT);
  c.fillText(fmtDepth(s), W - 64, 318);
  c.fillText(fmtDepth(s), W - 64, 318);
  c.shadowBlur = 8;
  c.font = L.font(19, 600, L.FONT.body);
  c.fillStyle = 'rgba(220,228,238,0.8)';
  L.trackedText(c, era(v), W - 64, 350, 2, 'right');
  // the gauge: a slim log-scale column; the water fill drains from the top
  const { x, y0, y1 } = GAUGE;
  c.shadowBlur = 0;
  c.fillStyle = 'rgba(255,255,255,0.10)';
  L.roundRect(c, x - 4, y0, 8, y1 - y0, 4); c.fill();
  const yS = gaugeY(D);
  const wg = c.createLinearGradient(0, y0, 0, y1);
  wg.addColorStop(0, L.rgba([90, 190, 255], 0.9));
  wg.addColorStop(1, L.rgba([20, 70, 160], 0.9));
  c.fillStyle = wg;
  if (y1 - yS > 1) { L.roundRect(c, x - 4, yS, 8, y1 - yS, 4); c.fill(); }
  // ticks (depths the film visits)
  c.font = L.font(15, 600, L.FONT.body);
  for (const [m, lab] of [[0, '0'], [50, '50 m'], [120, '120 m'], [2500, '2.5 km'], [5000, '5 km'], [10935, '11 km']]) {
    const ty = gaugeY(m);
    c.fillStyle = 'rgba(230,236,244,0.55)';
    c.fillRect(x - 12, ty - 1, 6, 2);
    c.fillStyle = 'rgba(230,236,244,0.5)';
    c.fillText(lab, x - 16, ty + 5);
  }
  // the current level marker
  c.fillStyle = '#fff';
  c.shadowColor = L.rgba(ACCENT, 0.9); c.shadowBlur = 12;
  L.roundRect(c, x - 9, yS - 2, 18, 4, 2); c.fill();
  c.restore();
}

/** Default cues: a soft whoosh at every camera shot; a low drain sound under each drop; a swell as the oceans return. */
export function cues(tl) {
  const out = beatCues(tl, { gain: 0.16, pitch: 0.95 });
  const K = seaKeys(tl);
  for (let i = 2; i < K.length; i += 2) {
    const [t0, s0] = K[i - 1], [, s1] = K[i];
    if (s1 < s0) out.push({ t: t0, name: 'deep', gain: 0.18, pitch: 0.75 });
    else out.push({ t: t0, name: 'swell', gain: 0.32, pitch: 0.85 });
  }
  return out;
}
