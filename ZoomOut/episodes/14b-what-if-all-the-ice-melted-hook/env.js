// Environment for "What If All the Ice Melted?". Owned by the orchestrator — builders: read, don't edit.
//
// The planet is REAL: data/etopo6.bin is NOAA ETOPO1 (ice surface) averaged to a 0.1° grid (3600 × 1800 Int16,
// row 0 = 90°N, column 0 = 180°W, metres). Every frame the globe is ray-cast per pixel (orthographic, the view from
// camera.js), so the sea level is just a threshold: raising or lowering it redraws every coastline on Earth honestly
// (the simple "bathtub" model). Newly flooded land glows in the accent; newly exposed sea floor turns to sand.
//
// Layers:   drawBackground  space + stars, the globe raster (land relief, ice caps, ocean depth), the atmosphere
//                           rim; near the New York limb (beats 4-6) the side view: sky above, the sea's cross-section.
//           drawForeground  side view only: the risen sea (sea level 0 → seaLevel) as translucent water IN FRONT of
//                           the statue, with a bright surface line.
//           drawHud         top bar, a scale bar during the zoom-out (beats 0-3), then the SEA LEVEL readout.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, fmtMetres, scaleBar, stars, topBar } from '../../../engine/runtime/kit.js';
import { R_EARTH, PLACES, LIBERTY, VIEWS, view as camView, worldOf, shotAt, shotStart } from './camera.js';
import { SHEETS as LGM_SHEETS, iceAt as lgmIceAt } from './lgm.js';

const { W, H } = L;
export const ACCENT = [150, 235, 215];
export const SAND = [196, 168, 118];   // exposed sea floor (ice-age land)
export { R_EARTH, PLACES, LIBERTY, VIEWS, worldOf, shotAt, shotStart };
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ elevation data
const GW = 3600, GH = 1800;
const ELEV = new Int16Array(await (await fetch(new URL('./data/etopo6.bin', import.meta.url))).arrayBuffer());
// Bedrock under today's ice (NOAA ETOPO 2022 60" bedrock, sampled to the same 0.1° cell centres), for the melted
// state: Antarctica (rows 1500-1799 = 60°S to the pole, all longitudes) and Greenland (rows 0-309 = the pole to
// 59°N, columns 1050-1799 = 75°W to 0°). Without its ice, West Antarctica is sea floor: the continent becomes an
// archipelago, and Greenland's centre sags below sea level.
const BED_A = new Int16Array(await (await fetch(new URL('./data/bed_ant.bin', import.meta.url))).arrayBuffer());
const BED_G = new Int16Array(await (await fetch(new URL('./data/bed_grl.bin', import.meta.url))).arrayBuffer());
const BA_R0 = 1500, BG_R1 = 309, BG_C0 = 1050, BG_NC = 750;
/** Elevation (m, bilinear) at lat/lon degrees. Negative = sea floor. */
export function elevation(lat, lon) {
  let fi = (90 - lat) * 10 - 0.5, fj = (lon + 180) * 10 - 0.5;
  fi = L.clamp(fi, 0, GH - 1.001);
  const i = Math.floor(fi), u = fi - i;
  fj = ((fj % GW) + GW) % GW;
  const j = Math.floor(fj), w = fj - j, j1 = (j + 1) % GW;
  const a = ELEV[i * GW + j], b = ELEV[i * GW + j1], c = ELEV[(i + 1) * GW + j], d = ELEV[(i + 1) * GW + j1];
  return (a * (1 - w) + b * w) * (1 - u) + (c * (1 - w) + d * w) * u;
}
/** Present-day ice caps (Antarctica, Greenland), as a rule on lat/lon for land points. */
const greenlandWest = (lat) => (lat < 72 ? -58 : lat < 76 ? -67 : lat < 79 ? -74 : lat < 80.5 ? -68.5 : lat < 81.5 ? -66 : -61.5);
/** Present-day ice caps: Antarctica, and Greenland (its western limit follows Baffin Bay and Nares Strait, so Baffin
 *  and Ellesmere islands stay bare rock; Iceland is excluded). */
export const isIce = (lat, lon) => lat < -60 || (lat > 59.5 && lon > greenlandWest(lat) && lon < -10 && !(lon > -25.5 && lat < 66.8));

// ------------------------------------------------------------------ story state (all pure functions of time)
export const SEA = { rise: 70, lgm: -120 };
const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];
/** Sea-level keyframes [time, metres] (eased between). */
export function seaKeys(tl) {
  const sc = tl.scenes;
  const r0 = ph(tl, 4, 1) + 0.95;                     // the rise starts as the camera reaches the statue
  const d0 = sc[9].start + 0.3;                       // "the sea has moved the other way": drain back to today
  const l0 = ph(tl, 10, 1) - 0.25;                    // "the sea was about 120 m lower"
  const f0 = sc[12].start + 0.2;                      // "Coastlines aren't fixed": back to today
  return [[0, 0], [r0, 0], [r0 + 2.9, SEA.rise], [d0, SEA.rise], [d0 + 2.1, 0], [l0, 0], [l0 + 2.5, SEA.lgm],
    [f0, SEA.lgm], [f0 + 2.8, 0]];
}
const keyCache = new WeakMap();
function keysOf(tl) { let k = keyCache.get(tl); if (!k) { k = seaKeys(tl); keyCache.set(tl, k); } return k; }
/** Sea level relative to today (m) at global time gt. */
export function seaAt(gt, tl) {
  const K = keysOf(tl);
  for (let i = 1; i < K.length; i++) {
    if (gt <= K[i][0]) return L.lerp(K[i - 1][1], K[i][1], L.ease.inOutCubic(L.invLerp(K[i - 1][0], K[i][0], gt)));
  }
  return K[K.length - 1][1];
}
export const seaLevel = (v) => seaAt(v.gt, v.tl);
/** Sea level at the OUTPUT frame's time (not the motion-blur sub-frame's): use it for every number printed on
 *  screen, so blurred sub-frames never blend two different digits (e.g. "−119" over "−120"). */
export const seaShown = (v) => seaAt(Math.round(v.gt * 30) / 30, v.tl);
/** Present-day ice caps 0..1: they melt away in beat 4 (as the globe turns) and return in beat 9 — in step with the
 *  sea draining back (the ice returns as the water leaves the oceans, over the whole drain from +70 m: none at
 *  +70 m, all of it by the time the sea is back to 0 m, so it grows back gradually instead of popping in). */
export function iceK(v) {
  const sc = v.tl.scenes;
  const melt = ph(v.tl, 4, 0) + 0.1;
  const gone = 1 - L.ease.inOutCubic(L.prog(v.gt, melt, 2.0));
  if (v.gt < sc[9].start) return gone;
  return gone + L.smoothstep(L.clamp(1 - seaLevel(v) / SEA.rise));
}
/** Last-glacial ice sheets, per sheet 0..1 (lgm.js): they spread from their domes on "Twenty thousand years ago" and
 *  retreat back toward the domes in beat 12 in step with the sea's return (sheet extent follows −seaLevel/120). */
export function lgmG(v) {
  const g0 = ph(v.tl, 10, 0) + 0.05;
  const back = v.gt > v.tl.scenes[12].start ? L.clamp(-seaLevel(v) / 118) : 1;
  return LGM_SHEETS.map((S) => L.ease.inOutCubic(L.prog(v.gt, g0 + S.delay, 2.4)) * L.smoothstep(back));
}
/** Accent glow on the coastline itself (0..1): beat 8 "every coastline" and the final beat. */
export function coastK(v) {
  const sc = v.tl.scenes;
  const a = L.prog(v.gt, ph(v.tl, 8, 1) - 0.1, 0.8) * (1 - L.prog(v.gt, sc[9].start + 0.2, 0.8));
  const b = L.prog(v.gt, sc[12].start + 0.5, 1.0);
  // final phrase: today's coast steps back so s12's +70 m and −120 m outlines lead
  const dimEnd = 1 - 0.6 * L.ease.inOutCubic(L.prog(v.gt, ph(v.tl, 12, 1) - 0.1, 0.9));
  return 0.85 * L.ease.inOutCubic(Math.max(a, b)) * dimEnd;
}
/** Era tag for the readout. It never contradicts the number shown: the era names only appear once the sea has
 *  reached that era's level (to the displayed metre); while it moves, the tag says which way. */
function era(v) {
  const s = seaShown(v), m = Math.round(s), gf = Math.round(v.gt * 30) / 30;
  if (m === 0) return 'TODAY';
  if (m >= SEA.rise) return 'ALL LAND ICE MELTED';
  if (m <= SEA.lgm) return '20,000 YEARS AGO';
  const ds = seaAt(gf + 0.05, v.tl) - s;
  return ds > 0 ? 'SEA RISING' : 'SEA FALLING';
}
/** Feet for the readout: whole feet under 100 ft, tens above (never "0 FT" next to a non-zero metre value). */
function feet(m) {
  const f = L.mToFt(Math.abs(m));
  return f < 100 ? Math.max(1, Math.round(f)) : Math.round(f / 10) * 10;
}

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
/**
 * Trace a lat/lon polyline/polygon on the globe (pts = [[lat, lon], ...]). Long edges are subdivided so they follow
 * the curve; far-side points are pulled onto the limb so shapes wrap cleanly over the edge.
 */
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
/** How much the frame is in the New York SIDE view (1 = statue scale, 0 = globe). */
export function sideK(v) {
  const cam = v.cam;
  const dc = Math.hypot(cam.x, cam.y - R_EARTH) - R_EARTH;          // camera centre's height above the sphere
  const near = Math.abs(dc) < 2600 * cam.mpp ? 1 : 0;
  // f14v1: a wider, eased hand-over (mpp 12 → 300): the side view's sky and sea blend over ~8 frames on the dive and
  // the climb instead of switching in 4-5
  return near * (1 - L.smoothstep(L.clamp(L.invLerp(Math.log(12), Math.log(300), Math.log(cam.mpp)))));
}

// ------------------------------------------------------------------ colour tables
const LAND = [[0, [84, 101, 77]], [120, [95, 108, 80]], [450, [111, 113, 86]], [1100, [126, 117, 96]], [2200, [140, 130, 113]],
  [3800, [154, 147, 136]], [6000, [178, 172, 162]]];
const OCEAN = [[0, [44, 104, 118]], [50, [33, 86, 108]], [180, [21, 60, 90]], [900, [13, 41, 71]], [3000, [9, 28, 54]],
  [6000, [6, 18, 38]], [11000, [4, 10, 24]]];
const ICE = [226, 234, 240];
const LGM_MARGIN = [158, 176, 196], LGM_DOME = [222, 229, 236];   // ice-age sheets: matte snow; slightly bluer, greyer margin zone
const SKY = [[0, [86, 132, 156]], [400, [66, 108, 138]], [3000, [38, 66, 108]], [12000, [17, 31, 66]], [40000, [7, 11, 29]],
  [120000, [3, 5, 13]]];
const ATM = 120000;
function lut(stops, n, scale) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = L.ramp(stops, i * scale); a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  return a;
}
const LAND_L = lut(LAND, 901, 10);      // index = elevation / 10
const OCEAN_L = lut(OCEAN, 1201, 10);   // index = depth / 10
const SKY_L = lut(SKY, 1201, 100);      // index = altitude / 100

// ------------------------------------------------------------------ the globe raster
let img = null, u32 = null, bg = null, rowPrev = null;
function setup() {
  img = new ImageData(W, H);
  u32 = new Uint32Array(img.data.buffer);
  bg = new Uint32Array(W * H);
  rowPrev = new Float32Array(W);
  // deep-space backdrop: a soft radial falloff, a hint of blue at the centre
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - W / 2) / W, (y - H * 0.45) / H) * 1.6;
      const k = L.clamp(1 - d);
      const r = 3 + 8 * k, g = 5 + 11 * k, b = 11 + 20 * k;
      bg[y * W + x] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }
}
// f14v1: a lightly smoothed copy of the grid (one [1 2 1]² binomial pass, ≈ 0.07° σ) for close face-on maps: there a
// 0.1° cell is 5-10 px wide and bilinear contours of the raw cells read as grid-aligned stair steps along every
// coast and shelf edge. Used only when the cells are big on screen (smoothG); the globe-scale views keep the raw grid.
const ELEV_S = (() => {
  const t = new Float32Array(GW * GH), o = new Int16Array(GW * GH);
  for (let i = 0; i < GH; i++) {
    const r = i * GW;
    for (let j = 0; j < GW; j++) t[r + j] = (ELEV[r + (j ? j - 1 : GW - 1)] + 2 * ELEV[r + j] + ELEV[r + (j + 1 < GW ? j + 1 : 0)]) * 0.25;
  }
  for (let i = 0; i < GH; i++) {
    const a = (i ? i - 1 : 0) * GW, b = i * GW, c = (i + 1 < GH ? i + 1 : GH - 1) * GW;
    for (let j = 0; j < GW; j++) o[b + j] = Math.round((t[a + j] + 2 * t[b + j] + t[c + j]) * 0.25);
  }
  return o;
})();
/** Bilinear ELEV (or the grid A) at fractional grid indices (row fi, col fj), wrapping in longitude. */
function bil(fi, fj, A = ELEV) {
  fi = fi < 0 ? 0 : fi > GH - 1.001 ? GH - 1.001 : fi;
  if (fj < 0) fj += GW; if (fj >= GW) fj -= GW;
  const i = fi | 0, u = fi - i, j = fj | 0, w = fj - j, j1 = j + 1 === GW ? 0 : j + 1;
  const a = A[i * GW + j], b = A[i * GW + j1], c = A[(i + 1) * GW + j], d = A[(i + 1) * GW + j1];
  return (a + (b - a) * w) * (1 - u) + (c + (d - c) * w) * u;
}
const pack = (r, g, b) => (255 << 24) | ((b < 0 ? 0 : b > 255 ? 255 : b) << 16) | ((g < 0 ? 0 : g > 255 ? 255 : g) << 8) | (r < 0 ? 0 : r > 255 ? 255 : r);

function drawGlobe(c, v) {
  if (!img) setup();
  const cam = v.cam, mpp = cam.mpp, ay = H * cam.anchor;
  const R = R_EARTH;
  const vw = viewOf(v);
  const sea = seaLevel(v), ice = iceK(v), coast = coastK(v), side = sideK(v);
  const lgmg = lgmG(v), lgmOn = lgmg.some((g) => g > 0.001);
  const bedK = 1 - L.clamp(ice);   // 0 = today's ice surface, 1 = bare bedrock
  const smoothG = mpp < 2600;     // grid cells ≥ ~4 px: use the continuous gradient
  const EL = smoothG ? ELEV_S : ELEV;   // f14v1: smoothed cells when they are big on screen
  const [ar, ag, ab] = ACCENT;
  const hzY = v.wy(0);   // the New York horizon on screen (side view)
  u32.set(bg);
  const Ra = R + ATM;
  const cell = 11119.5;  // metres per 0.1° of latitude
  for (let sy = 0; sy < H; sy++) {
    const dy = cam.y + (sy - ay) * mpp - R;            // world y relative to the globe centre
    if (Math.abs(dy) > Ra) { rowPrev.fill(NaN); continue; }
    const half = Math.sqrt(Ra * Ra - dy * dy);
    const x0 = Math.max(0, Math.floor(W / 2 + (-half - cam.x) / mpp)), x1 = Math.min(W - 1, Math.ceil(W / 2 + (half - cam.x) / mpp));
    const Y = -dy / R, Y2 = Y * Y;
    // side view: the sky darkens towards the top of the frame
    const skyMul = 0.5 + 0.5 * L.clamp(1 - (hzY - sy) / 1300);
    let left = NaN;
    for (let sx = 0; sx < W; sx++) {
      if (sx < x0 || sx > x1) { rowPrev[sx] = NaN; continue; }
      const wx = cam.x + (sx - W / 2) * mpp;
      const X = wx / R, rho2 = X * X + Y2;
      const o = sy * W + sx;
      if (rho2 > 1) {
        // atmosphere / sky
        const alt = R * (Math.sqrt(rho2) - 1);
        if (alt >= ATM) { rowPrev[sx] = NaN; left = NaN; continue; }
        // interpolate between the 100 m steps of the table (no bands in the side view) + a ±0.5 LSB ordered dither
        const fa = alt / 100, i0 = fa < 1199 ? fa | 0 : 1199, fr = fa - i0 < 1 ? fa - i0 : 1, li = i0 * 3;
        const s0 = SKY_L[li] + (SKY_L[li + 3] - SKY_L[li]) * fr;
        const s1 = SKY_L[li + 1] + (SKY_L[li + 4] - SKY_L[li + 1]) * fr;
        const s2 = SKY_L[li + 2] + (SKY_L[li + 5] - SKY_L[li + 2]) * fr;
        const dth = 0.5 + (((sx & 1) << 1 | ((sx ^ sy) & 1)) - 1.5) * 0.33;
        const a = Math.pow(1 - alt / ATM, 2.2) * (1 - side) + side;
        const m = side > 0 ? L.lerp(1, skyMul, side) : 1;
        const b0 = bg[o];
        const br = b0 & 255, bgc = (b0 >> 8) & 255, bb = (b0 >> 16) & 255;
        u32[o] = pack(br + (s0 * m - br) * a + dth, bgc + (s1 * m - bgc) * a + dth, bb + (s2 * m - bb) * a + dth);
        rowPrev[sx] = NaN; left = NaN;
        continue;
      }
      // on the sphere: inverse orthographic → lat/lon
      const Z = Math.sqrt(1 - rho2);
      const px = X * vw.r[0] + Y * vw.u[0] + Z * vw.c[0];
      const py = X * vw.r[1] + Y * vw.u[1] + Z * vw.c[1];
      const pz = X * vw.r[2] + Y * vw.u[2] + Z * vw.c[2];
      const lat = Math.asin(pz > 1 ? 1 : pz < -1 ? -1 : pz) / DEG, lon = Math.atan2(py, px) / DEG;
      // bilinear elevation + its gradient
      let fi = (90 - lat) * 10 - 0.5; fi = fi < 0 ? 0 : fi > GH - 1.001 ? GH - 1.001 : fi;
      const i = fi | 0, u = fi - i;
      let fj = (lon + 180) * 10 - 0.5; if (fj < 0) fj += GW; if (fj >= GW) fj -= GW;
      const j = fj | 0, w = fj - j, j1 = j + 1 === GW ? 0 : j + 1;
      let ea = EL[i * GW + j], eb = EL[i * GW + j1], ec = EL[(i + 1) * GW + j], ed = EL[(i + 1) * GW + j1];
      if (bedK > 0 && isIce(lat, lon)) {
        // melting: the ice surface sinks to the bedrock beneath it
        let ba, bb, bc, bd;
        if (lat < 0) {
          const r0 = Math.max(0, i - BA_R0) * GW, r1 = Math.min(299, i + 1 - BA_R0) * GW;
          ba = BED_A[r0 + j]; bb = BED_A[r0 + j1]; bc = BED_A[r1 + j]; bd = BED_A[r1 + j1];
        } else {
          const r0 = i * BG_NC, r1 = Math.min(BG_R1, i + 1) * BG_NC, c0 = j - BG_C0, c1 = j1 - BG_C0;
          ba = BED_G[r0 + c0]; bb = BED_G[r0 + c1]; bc = BED_G[r1 + c0]; bd = BED_G[r1 + c1];
        }
        ea += (ba - ea) * bedK; eb += (bb - eb) * bedK; ec += (bc - ec) * bedK; ed += (bd - ed) * bedK;
      }
      const top = ea + (eb - ea) * w, bot = ec + (ed - ec) * w;
      const e = top + (bot - top) * u;
      let gE = ((eb - ea) * (1 - u) + (ed - ec) * u) / (cell * Math.max(0.05, Math.cos(lat * DEG)));   // d(elev)/d(east)
      let gN = -(bot - top) / cell;                                                                    // d(elev)/d(north)
      if (smoothG && (bedK === 0 || lat > -60 && lat < 59)) {
        // close in, the grid cells are many pixels wide and the per-cell gradient shows as stair-step streaks:
        // central differences of the bilinear surface one cell apart give a continuous gradient instead
        gE = (bil(fi, fj + 0.5, EL) - bil(fi, fj - 0.5, EL)) / (cell * Math.max(0.05, Math.cos(lat * DEG)));
        gN = -(bil(fi + 0.5, fj, EL) - bil(fi - 0.5, fj, EL)) / cell;
      } else if (!smoothG && e > -300 && (bedK === 0 || lat > -60 && lat < 59)) {
        // far out, one pixel spans several grid cells (more still towards the limb, where the surface is
        // foreshortened): a per-cell gradient point-sampled once per pixel aliases into streaks and grain (the
        // Tibetan Plateau, the limb). Difference the surface over the pixel's own footprint instead.
        const kc = Math.min(12, mpp / (cell * (Z > 0.12 ? Z : 0.12)));
        if (kc > 1) {
          const cl = Math.max(0.05, Math.cos(lat * DEG)), kl = Math.min(60, kc / cl);
          gE = (bil(fi, fj + kl * 0.5) - bil(fi, fj - kl * 0.5)) / (kl * cell * cl);
          gN = -(bil(fi + kc * 0.5, fj) - bil(fi - kc * 0.5, fj)) / (kc * cell);
        }
      }
      const d = e - sea;
      // relief: light from the north-west
      const relief = 0.5 * gE - 0.5 * gN;
      // sphere shading: limb darkening + light from the upper left of the screen
      const sh = (0.58 + 0.42 * Math.sqrt(Z)) * (0.94 + 0.1 * (-X * 0.55 + Y * 0.45));
      // land colour
      let lr, lg, lb;
      if (e > 0) {
        const k = Math.min(900, (e / 10) | 0) * 3;
        lr = LAND_L[k]; lg = LAND_L[k + 1]; lb = LAND_L[k + 2];
        if (ice > 0 && isIce(lat, lon)) { lr += (ICE[0] - lr) * ice; lg += (ICE[1] - lg) * ice; lb += (ICE[2] - lb) * ice; }
      } else {
        const s = L.clamp(-e / 180);
        lr = SAND[0] - 40 * s; lg = SAND[1] - 38 * s; lb = SAND[2] - 30 * s;
      }
      // close in, steep relief would saturate into hard black/white combs: compress it softly instead
      const hs = smoothG ? 1 + 0.42 * Math.tanh(relief * 26 / 0.7) : 1 + L.clamp(relief * 26, -0.45, 0.45);
      lr *= hs; lg *= hs; lb *= hs;
      // water colour (depth below the CURRENT sea surface)
      const dep = d < 0 ? -d : 0;
      const k2 = Math.min(1200, (dep / 10) | 0) * 3;
      let wr = OCEAN_L[k2], wg = OCEAN_L[k2 + 1], wb = OCEAN_L[k2 + 2];
      const ws = 1 + L.clamp(relief * 6, -0.25, 0.25);
      wr *= ws; wg *= ws; wb *= ws;
      if (e > 0 && sea > 0) {
        // newly flooded land: luminous mint shallows
        const f = 0.55 * L.clamp(sea / 12);
        wr += (ar * 0.62 - wr) * f; wg += (ag * 0.62 - wg) * f; wb += (ab * 0.62 - wb) * f;
      }
      // anti-aliased shoreline from the screen-space change of (elevation − sea)
      const du = rowPrev[sx], g = (left === left ? Math.abs(d - left) : 0) + (du === du ? Math.abs(d - du) : 0) + 1e-3;
      rowPrev[sx] = d; left = d;
      const cov = L.clamp(0.5 + d / g);
      let r = wr + (lr - wr) * cov, gg = wg + (lg - wg) * cov, b = wb + (lb - wb) * cov;
      if (coast > 0) {
        const line = L.clamp(1 - Math.abs(d) / (g * 1.2)) * coast;
        r += (ar - r) * line; gg += (ag - gg) * line; b += (ab - b) * line;
      }
      if (lgmOn && lat > 34) {
        // ice-age sheets: flat, matte snow over land and shelf alike (km-thick ice hides the relief below and reads
        // flat at globe scale), a thin bluer margin zone, subtle surface texture, and an edge about one pixel wide so
        // it stays crisp close in. Where today's caps (Greenland) are already back, they show through unchanged.
        const I = lgmIceAt(lat, lon, lgmg, 1.1 * mpp / 1000 / (Z > 0.2 ? Z : 0.2));
        if (I) {
          let a = I.a;
          // over today's Greenland cap (land only) the ice-age sheet cross-fades with its extent instead of eroding
          // across it, so its retreat never uncovers the cap's own edge as a second, crinkly margin
          if (e > 0 && isIce(lat, lon)) a *= L.smoothstep(L.clamp((I.gs - 0.35) / 0.5));
          if (a > 0) {
            // brightness: margin zone a touch greyer, broad brightening towards the domes, a faint darker rim at the
            // edge (the ice cliff), and a subtle snow texture
            const m = (1 - I.t) * 0.4, tx = (0.86 + 0.14 * I.dome) * (1 + (mpp < 4000 ? 0.07 - 0.04 * mpp / 4000 : 0.03) * I.tex) * (1 - 0.16 * I.rim);
            const ir = (LGM_DOME[0] + (LGM_MARGIN[0] - LGM_DOME[0]) * m) * tx;
            const ig = (LGM_DOME[1] + (LGM_MARGIN[1] - LGM_DOME[1]) * m) * tx;
            const ib = (LGM_DOME[2] + (LGM_MARGIN[2] - LGM_DOME[2]) * m) * tx;
            r += (ir - r) * a; gg += (ig - gg) * a; b += (ib - b) * a;
          }
        }
      }
      r *= sh; gg *= sh; b *= sh;
      if (side > 0) {
        // side view: below sea level at the limb is the sea's cross-section
        const depth = R * (1 - Math.sqrt(rho2));
        const t = L.clamp(depth / 140);
        const sr = L.lerp(30, 6, t), sg = L.lerp(78, 20, t), sb = L.lerp(98, 40, t);
        r += (sr - r) * side; gg += (sg - gg) * side; b += (sb - b) * side;
      }
      u32[o] = pack(r, gg, b);
    }
  }
  c.putImageData(img, 0, 0);
}

export function drawBackground(c, v) {
  // beats 0-1: while s00's opaque slate table still overfills the frame (before it starts to feather into the snow),
  // the per-pixel globe underneath is never seen; skip the raster
  if (v.cam.mpp < 2.8e-4 && v.gt < v.tl.scenes[2].start) { c.fillStyle = '#05080e'; c.fillRect(0, 0, W, H); return; }
  drawGlobe(c, v);
  const disc = globeDisc(v);
  const side = sideK(v);
  // stars, only off the disc and only where the sky is dark
  const altTop = Math.hypot(v.cam.x, v.cam.y - (H * v.cam.anchor) * v.cam.mpp - R_EARTH) - R_EARTH;
  const sk = disc.r < 2e5 ? 1 - side : L.clamp(L.invLerp(30000, 90000, altTop));
  if (sk > 0) {
    c.save();
    c.beginPath();
    c.rect(0, 0, W, H);
    if (disc.r < 2e5) c.arc(disc.x, disc.y, Math.max(0, disc.r + v.ws(ATM) * 0.35), 0, Math.PI * 2, true);
    else c.rect(0, disc.y - disc.r, W, H);
    c.clip('evenodd');
    stars(c, v, sk * 0.85, 170, 14);
    c.restore();
  }
  // soft atmospheric halo around the whole globe
  if (disc.r < 3000) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(disc.x, disc.y, disc.r * 0.96, disc.x, disc.y, disc.r * 1.16);
    g.addColorStop(0, 'rgba(110,190,220,0)');
    g.addColorStop(0.2, 'rgba(110,190,220,0.16)');
    g.addColorStop(1, 'rgba(110,190,220,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(disc.x, disc.y, disc.r * 1.16, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

/** Side view only: the risen sea in front of everything at the New York limb (translucent, with a bright surface). */
export function drawForeground(c, v) {
  const side = sideK(v);
  const sea = seaLevel(v);
  if (side <= 0.01) return;
  const disc = globeDisc(v);
  if (disc.r < 1e5) return;
  // f14v1: fades in/out with the zoom (mpp 64 → 8) instead of switching on at full strength in one frame
  const dk = L.smoothstep(L.clamp(L.invLerp(1e5, 8e5, disc.r)));
  // ... and turns more opaque as the camera pulls away from the statue (distant water hides what is under it), so
  // on the climb out only the part above the surface recedes: the statue never seems to sink
  const far = L.smoothstep(L.clamp(L.invLerp(Math.log(0.16), Math.log(1.2), Math.log(v.cam.mpp))));
  // at statue scale the sea surface is flat: y = −sea, with a gentle swell
  const ys = v.wy(-sea);
  if (ys > H + 20) return;
  c.save();
  c.globalAlpha = side * dk;
  const amp = Math.min(6, v.ws(0.6));
  c.beginPath();
  c.moveTo(-10, H + 10);
  for (let x = -10; x <= W + 10; x += 12) {
    const y = ys + amp * Math.sin(x * 0.012 + v.gt * 1.6) + amp * 0.5 * Math.sin(x * 0.031 - v.gt * 2.3);
    c.lineTo(x, y);
  }
  c.lineTo(W + 10, H + 10);
  c.closePath();
  const g = c.createLinearGradient(0, ys, 0, Math.min(H, ys + 900));
  g.addColorStop(0, `rgba(60,140,150,${L.lerp(0.62, 0.97, far)})`);
  g.addColorStop(1, `rgba(8,30,48,${L.lerp(0.88, 0.99, far)})`);
  c.fillStyle = g;
  c.fill();
  // surface line
  c.strokeStyle = L.rgba(ACCENT, 0.75);
  c.lineWidth = 2.5;
  c.beginPath();
  for (let x = -10; x <= W + 10; x += 12) {
    const y = ys + amp * Math.sin(x * 0.012 + v.gt * 1.6) + amp * 0.5 * Math.sin(x * 0.031 - v.gt * 2.3);
    if (x < 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ HUD
const fmtSigned = (m) => (Math.abs(m) < 0.5 ? '0 m' : `${m > 0 ? '+' : '−'}${L.fmt(Math.abs(m))} m`);
/** 0..1: the frame is a face-on map (the globe fills the screen, bright land behind the HUD band). */
function mapK(v) {
  const r = v.ws(R_EARTH);
  return L.smoothstep(L.clamp(L.invLerp(Math.log(150), Math.log(500), Math.log(v.cam.mpp)))) *
    L.smoothstep(L.clamp(L.invLerp(1100, 1800, r)));
}
export function drawHud(c, v) {
  // a soft dark scrim behind the HUD band over face-on maps (France, Beringia, Florida, Europe…)
  // f14v1: also over the polar globe of beats 2-3 (other continents sit under the HUD band there)
  const sc = v.tl.scenes;
  const k23 = 0.85 * L.smoothstep(L.prog(v.gt, sc[1].start + 3.0, 0.6)) * (1 - L.smoothstep(L.prog(v.gt, sc[4].start + 0.6, 0.6)));
  const mk = Math.max(mapK(v), k23);
  if (mk > 0.01) {
    c.save();
    c.globalAlpha = mk;
    const g = c.createLinearGradient(0, 0, 0, 400);
    g.addColorStop(0, 'rgba(5,10,18,0.64)');
    g.addColorStop(0.55, 'rgba(5,10,18,0.4)');
    g.addColorStop(0.8, 'rgba(5,10,18,0.12)');
    g.addColorStop(1, 'rgba(5,10,18,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, 400);
    // a little extra behind the sea-level readout (top right)
    const rg = c.createRadialGradient(W - 200, 300, 0, W - 200, 300, 260);
    rg.addColorStop(0, 'rgba(5,10,18,0.42)');
    rg.addColorStop(1, 'rgba(5,10,18,0)');
    c.fillStyle = rg;
    c.fillRect(W - 460, 40, 460, 520);
    c.restore();
  }
  // beats 1-2 over bright snow / white ice: a soft dark backing for the HUD band and the caption band
  const lm = Math.log10(v.cam.mpp);
  const snow = L.smoothstep(L.clamp(L.invLerp(-3.55, -3.0, lm))) * (1 - L.smoothstep(L.clamp(L.invLerp(Math.log10(2500), Math.log10(6200), lm)))) *
    (1 - L.prog(v.gt, v.tl.scenes[2].start, 0.4));
  if (snow > 0.01) {
    c.save();
    c.globalAlpha = snow;
    const tg = c.createLinearGradient(0, 0, 0, 420);
    tg.addColorStop(0, 'rgba(6,14,24,0.34)');
    tg.addColorStop(0.6, 'rgba(6,14,24,0.16)');
    tg.addColorStop(1, 'rgba(6,14,24,0)');
    c.fillStyle = tg;
    c.fillRect(0, 0, W, 420);
    // the caption: a soft elliptical shadow, not a band
    c.save();
    // f14v1: centred ON the caption (captionY 1450 → text centre ≈ 1446) and strong enough to carry white type on snow
    c.translate(W / 2, 1446);
    c.scale(1, 0.26);
    const cg = c.createRadialGradient(0, 0, 0, 0, 0, 500);
    cg.addColorStop(0, 'rgba(6,14,24,0.52)');
    cg.addColorStop(0.55, 'rgba(6,14,24,0.32)');
    cg.addColorStop(1, 'rgba(6,14,24,0)');
    c.fillStyle = cg;
    c.fillRect(-500, -500, 1000, 1000);
    c.restore();
    c.restore();
  }
  topBar(c, v, ACCENT);
  const b4 = v.tl.scenes[4].start;
  // the scale bar carries the zoom-out (beats 0-3); the sea-level readout takes over from beat 4
  const kScale = L.ease.outCubic(L.prog(v.gt, v.tl.scenes[0].start + 1.0, 0.6)) * (1 - L.ease.inOutCubic(L.prog(v.gt, b4 - 0.2, 0.5)));
  scaleBar(c, v, { k: kScale, fmt: fmtMetres });
  // 14b: the readout clears with the rest of the frame by the end of beat 12, before the closing question card (beat 13) lands
  const qb = v.tl.scenes[13]?.start ?? Infinity;
  const kRead = L.ease.outCubic(L.prog(v.gt, b4 + 0.2, 0.6)) * (1 - L.ease.inOutCubic(L.prog(v.gt, qb - 0.4, 0.4)));
  if (kRead > 0) {
    const s = seaShown(v);   // frame-stable: the digits never blend across motion-blur sub-frames
    // a soft local scrim whenever the planet sits behind the readout (bright ice / snow can sit right under it)
    const disc = globeDisc(v), cov = L.clamp((disc.r - Math.hypot(W - 190 - disc.x, 300 - disc.y)) / 160 + 0.5);
    if (cov > 0.01) {
      c.save();
      c.globalAlpha = kRead * cov;
      c.translate(W - 190, 296);
      c.scale(1, 0.42);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 330);
      sg.addColorStop(0, 'rgba(4,10,18,0.5)');
      sg.addColorStop(0.6, 'rgba(4,10,18,0.28)');
      sg.addColorStop(1, 'rgba(4,10,18,0)');
      c.fillStyle = sg;
      c.fillRect(-330, -330, 660, 660);
      c.restore();
    }
    c.save();
    c.globalAlpha = kRead;
    c.shadowColor = 'rgba(2,8,18,0.75)';
    c.shadowBlur = 22;
    c.textAlign = 'right';
    c.textBaseline = 'alphabetic';
    c.font = L.font(64, 700, L.FONT.din);
    c.fillStyle = Math.abs(s) < 0.5 ? '#fff' : L.rgba(s > 0 ? ACCENT : SAND);
    c.fillText(fmtSigned(Math.round(s)), W - 64, 300);
    c.shadowBlur = 8;
    c.fillText(fmtSigned(Math.round(s)), W - 64, 300);
    c.font = L.font(26, 600, L.FONT.body);
    c.fillStyle = 'rgba(220,228,236,0.85)';
    const sm = Math.round(s);
    const small = sm === 0 ? `SEA LEVEL  ·  ${era(v)}` : `${sm > 0 ? '+' : '−'}${L.fmt(feet(sm))} FT  ·  ${era(v)}`;
    L.trackedText(c, small, W - 64, 334, 2, 'right');
    c.restore();
  }
}

/** Default cues: a soft whoosh at every camera shot, a low swell under the rise and the ice-age drop. */
export function cues(tl) {
  const out = beatCues(tl, { gain: 0.16, pitch: 0.95 });
  const K = seaKeys(tl);
  out.push({ t: shotStart('dive', tl), name: 'whoosh', gain: 0.22, pitch: 0.7 });
  out.push({ t: shotStart('to-florida', tl), name: 'whoosh', gain: 0.2, pitch: 0.8 });
  out.push({ t: K[1][0], name: 'swell', gain: 0.3, pitch: 0.8 });
  out.push({ t: K[5][0], name: 'deep', gain: 0.3, pitch: 0.7 });
  return out;
}

// ------------------------------------------------------------------ 14b: labels on plates
/** Opaque dark plate (≈0.9) sized to a text block, faded with the label (k as L.bigLabel uses it). */
export function plate(c, x, y, w, h, k, r = 18) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.fillStyle = 'rgba(4,10,20,0.9)';
  L.roundRect(c, x, y, w, h, r);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 1.5;
  c.stroke();
  c.restore();
}
/** L.bigLabel (left-aligned) on an opaque plate sized from its text metrics (over busy map content). */
export function platedLabel(c, o) {
  if (!(o.k > 0)) return;
  const size = o.size ?? 120;
  c.save();
  c.font = L.font(size, 800, L.FONT.display);
  let w = c.measureText(o.big).width - Math.max(0, o.big.length - 1);
  if (o.small) {
    c.font = L.font(30, 600, L.FONT.body);
    w = Math.max(w, c.measureText(o.small.toUpperCase()).width + 3 * o.small.length);
  }
  c.restore();
  const top = o.y - size * 0.92 - 26 - 22, bot = o.y + (o.small ? 52 + 10 : Math.round(size * 0.22)) + 22;
  plate(c, o.x - 28, top, w + 56, bot - top, o.k);
  L.bigLabel(c, o);
}
