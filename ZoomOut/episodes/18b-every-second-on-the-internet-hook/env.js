// Environment for "Every Second on the Internet". Owned by the orchestrator — builders: read, don't edit.
//
// One continuous top-down world at night (see camera.js for units and frames):
//   ROOM      (mpp < ~0.8)   the bedroom floor plan around the phone: dark oak floor, walls, window spill, the
//                            walnut nightstand the phone lies on; the apartment building as a cut-away plan.
//   CITY      (mpp < ~12)    Manhattan-style blocks (rotated 29 deg) with rooftops, a glowing dot per lit screen /
//                            window, moving traffic on the avenues, the Hudson and East River, the harbour.
//   LIGHTS    (mpp 1 - 900)  a world-anchored field of city lights (density = the New York metro, on land only,
//                            snapped to the street grid), so the city dissolves into a regional glow as we climb.
//   PLANET    (mpp > ~25)    a night globe ray-cast from real elevation data (data/etopo6.bin, NOAA ETOPO1 at 0.1 deg):
//                            dark land, deep-blue ocean, faint coastlines, an atmosphere rim; CITIES as light clusters.
//   CABLES    (beats 12-17)  ~36 undersea cable routes (geo.js) that draw themselves on with travelling data pulses.
//   HUD                      topBar + a live counter: "Google searches since you pressed play" (switches to hours of
//                            YouTube video uploaded in beat 17).
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, stars, topBar } from '../../../engine/runtime/kit.js';
import { R_EARTH, DEG, HOME, DC, DC_PLAN, GRID_ROT, toWorld, toPlan, face as camFace, KEYS, at as camAt } from './camera.js';
import { CITIES, CABLES } from './geo.js';
import { drawEarth } from '../../../engine/runtime/earth.js';

const { W, H } = L;
export const ACCENT = [80, 170, 255];
export const SCREEN = [170, 210, 255];   // the cool light of a screen
export const WARM = [255, 190, 120];     // windows / sodium street light
export { R_EARTH, DEG, HOME, DC, DC_PLAN, GRID_ROT, toWorld, toPlan, CITIES, CABLES };

// ------------------------------------------------------------------ fixed plan geometry (PLAN metres, phone at 0,0)
/** The phone lies at the world origin, screen up, axis-aligned to the SCREEN (it sits askew on the nightstand). */
export const PHONE = { w: 0.0716, h: 0.1476, r: 0.011 };
/** Walnut nightstand top (plan). */
export const NIGHTSTAND = { x0: -0.24, y0: -0.21, x1: 0.24, y1: 0.21 };
/** Bedroom interior (plan): 4 x 4.5 m. North wall just behind the nightstand; window in the east wall. */
export const ROOM = { x0: -0.42, y0: -0.3, x1: 3.58, y1: 4.2, wall: 0.16, window: { y0: 1.5, y1: 2.9 } };
/** Where the bed goes (plan; drawn by the scenes): queen, headboard on the north wall, right of the nightstand. */
export const BED = { x0: 0.34, y0: -0.3, x1: 1.96, y1: 1.78 };
/** The apartment building (plan), drawn as a cut-away plan; the room is inside it. */
export const BLDG = { x0: -14, y0: -31, x1: 26, y1: 9 };
/** City grid (plan): avenues every 260 m (30 m wide) along y, streets every 80 m (18 m wide) along x. */
export const GRID = { ave: 260, aveW: 30, st: 80, stW: 18 };
/** Rivers in plan metres: the Hudson (west), the East River (east). They end at the Battery (plan y 6600), where the
 *  harbour (BAYS) takes over. */
export const WATER = [
  { x0: -2950, x1: -1550, y0: -17000, y1: 6600 },
  { x0: 1850, x1: 2350, y0: -9000, y1: 6600 },
];
/** The harbour as soft ellipses [lat, lon, rx km (E-W), ry km (N-S)]: Upper Bay, Lower Bay, Raritan, Jamaica and
 *  Newark Bays, the Kill van Kull. Real shapes are too fine for the 0.1-degree elevation grid. */
const BAYS = [
  [40.665, -74.05, 2.4, 4.6], [40.528, -74.03, 6.5, 4.6], [40.49, -74.2, 6.5, 2.6], [40.612, -73.83, 4.2, 2.4],
  [40.685, -74.135, 1.1, 3.0], [40.643, -74.1, 2.6, 0.45], [40.605, -74.04, 1.0, 2.2], [40.5, -73.93, 5.5, 3.8],
  [40.57, -73.9, 2.2, 1.2], [40.45, -73.98, 3.5, 2.0],
].map(([lat, lon, rx, ry]) => ({
  x: (lon - (-73.985)) * Math.cos(40.758 * Math.PI / 180) * 111195, y: -(lat - 40.758) * 111195, rx: rx * 1000, ry: ry * 1000,
}));
/** Parks (plan metres): Central Park (5th Ave to Central Park West, 59th to 110th St) and its reservoir, Bryant Park. */
export const PARKS = [
  { x0: -245, x1: 505, y0: -5040, y1: -965, water: { x0: 20, x1: 430, y0: -3900, y1: -3150 } },
  { x0: 275, x1: 505, y0: 405, y1: 555 },
];
/** Is a PLAN point in a park? 0..1. */
export function parkAt(px, py, soft = 0) {
  let k = 0;
  for (const w of PARKS) {
    const d = Math.min(px - w.x0, w.x1 - px, py - w.y0, w.y1 - py);
    k = Math.max(k, soft > 0 ? L.clamp(0.5 + d / soft) : d > 0 ? 1 : 0);
  }
  return k;
}

// ------------------------------------------------------------------ elevation data
const GW = 3600, GH = 1800;
const ELEV = new Int16Array(await (await fetch(new URL('./data/etopo6.bin', import.meta.url))).arrayBuffer());
/** Elevation (m, bilinear) at lat/lon degrees. Negative = sea floor. */
export function elevation(lat, lon) {
  let fi = (90 - lat) * 10 - 0.5, fj = (lon + 180) * 10 - 0.5;
  fi = fi < 0 ? 0 : fi > GH - 1.001 ? GH - 1.001 : fi;
  const i = fi | 0, u = fi - i;
  fj = ((fj % GW) + GW) % GW;
  const j = fj | 0, w = fj - j, j1 = j + 1 === GW ? 0 : j + 1;
  const a = ELEV[i * GW + j], b = ELEV[i * GW + j1], c = ELEV[(i + 1) * GW + j], d = ELEV[(i + 1) * GW + j1];
  return (a * (1 - w) + b * w) * (1 - u) + (c * (1 - w) + d * w) * u;
}

// ------------------------------------------------------------------ globe projection
const unit = (lat, lon) => { const p = lat * DEG, l = lon * DEG, cp = Math.cos(p); return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)]; };
function basis([lat, lon]) {
  const p = lat * DEG, l = lon * DEG, sp = Math.sin(p), cp = Math.cos(p), sl = Math.sin(l), cl = Math.cos(l);
  return { c: [cp * cl, cp * sl, sp], e: [-sl, cl, 0], n: [-sp * cl, -sp * sl, cp], lat, lon };
}
let bKey = NaN, bVal = null;
/** The globe orientation now: {c (toward camera), e (screen right), n (screen up), lat, lon} of the face point. */
export function viewOf(v) {
  if (v.gt !== bKey) { bKey = v.gt; bVal = basis(camFace(v.gt, v.tl)); }
  return bVal;
}
/** World position (metres) of (lat, lon, elevation m) under orientation B; z > 0 = on the visible hemisphere. */
export function worldOf(B, lat, lon, elev = 0) {
  const p = unit(lat, lon), s = R_EARTH + elev;
  return { x: s * (p[0] * B.e[0] + p[1] * B.e[1]), y: -s * (p[0] * B.n[0] + p[1] * B.n[1] + p[2] * B.n[2]), z: p[0] * B.c[0] + p[1] * B.c[1] + p[2] * B.c[2] };
}
/** Screen position of (lat, lon[, elev]) now: {x, y, z}; z > 0 faces us. */
export function project(v, lat, lon, elev = 0) {
  const p = worldOf(viewOf(v), lat, lon, elev);
  return { x: v.wx(p.x), y: v.wy(p.y), z: p.z };
}
/** The globe disc on screen: {x, y, r} px. */
export const globeDisc = (v) => ({ x: v.wx(0), y: v.wy(0), r: v.ws(R_EARTH) });
/** World position of HOME now ({x: 0, y: 0} whenever the face is HOME). */
export const homeAt = (v) => worldOf(viewOf(v), HOME.lat, HOME.lon);
/** Local metres east/south of HOME -> lat/lon (tangent plane; fine within a few hundred km). */
export function localToLatLon(x, y) {
  return { lat: HOME.lat - y / R_EARTH / DEG, lon: HOME.lon + x / (R_EARTH * Math.cos(HOME.lat * DEG)) / DEG };
}
/** Is the local HOME plan usable now (face ~ HOME, on the near side)? 0..1 fade. */
export function planK(v) {
  const h = homeAt(v);
  return h.z > 0.999 ? 1 : L.clamp((h.z - 0.99) / 0.009);
}
/**
 * Draw in PLAN metres around the phone: fn(c, mpp) runs with the origin at the phone, 1 unit = 1 m, rotated so the
 * plan's +x runs across the avenues. Lines need widths in metres: use `px * mpp` for an n-pixel line.
 */
export function withPlan(c, v, fn) {
  const h = homeAt(v);
  c.save();
  c.translate(v.wx(h.x), v.wy(h.y));
  c.scale(1 / v.cam.mpp, 1 / v.cam.mpp);
  c.rotate(GRID_ROT);
  fn(c, v.cam.mpp);
  c.restore();
}
/** Screen position of a PLAN point (px, py). */
export function planToScreen(v, px, py) {
  const h = homeAt(v), w = toWorld(px, py);
  return { x: v.wx(h.x + w.x), y: v.wy(h.y + w.y) };
}
/** Trace a lat/lon polyline on the globe into the current path (pts [[lat, lon], ...]); far-side runs are skipped. */
export function geoPath(c, v, pts, close = false, step = 1.0) {
  const B = viewOf(v);
  let pen = false;
  const put = (p) => {
    const w = { x: R_EARTH * (p[0] * B.e[0] + p[1] * B.e[1]), y: -R_EARTH * (p[0] * B.n[0] + p[1] * B.n[1] + p[2] * B.n[2]) };
    const z = p[0] * B.c[0] + p[1] * B.c[1] + p[2] * B.c[2];
    if (z < 0) { pen = false; return; }
    const sx = v.wx(w.x), sy = v.wy(w.y);
    if (pen) c.lineTo(sx, sy); else { c.moveTo(sx, sy); pen = true; }
  };
  const seq = close ? [...pts, pts[0]] : pts;
  for (let i = 0; i < seq.length - 1; i++) {
    const a = unit(...seq[i]), b = unit(...seq[i + 1]);
    const ang = Math.acos(L.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    const n = Math.max(1, Math.ceil(ang / (step * DEG)));
    for (let k = i ? 1 : 0; k <= n; k++) put(slerp(a, b, ang, k / n));
  }
}
function slerp(a, b, ang, t) {
  if (ang < 1e-9) return a;
  const s = Math.sin(ang), fa = Math.sin((1 - t) * ang) / s, fb = Math.sin(t * ang) / s;
  return [a[0] * fa + b[0] * fb, a[1] * fa + b[1] * fb, a[2] * fa + b[2] * fb];
}

// ------------------------------------------------------------------ hashing / city density
const hash = (a, b = 0, c = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Is a PLAN point on water (rivers, harbour, the park reservoir)? 0..1 with a soft edge (m). */
export function waterAt(px, py, soft = 0) {
  let k = 0;
  for (const w of WATER) {
    const d = Math.min(px - w.x0, w.x1 - px, py - w.y0, w.y1 - py);
    k = Math.max(k, soft > 0 ? L.clamp(0.5 + d / soft) : d > 0 ? 1 : 0);
  }
  const rw = PARKS[0].water;
  if (px > rw.x0 && px < rw.x1 && py > rw.y0 && py < rw.y1) k = 1;
  if (py > 5000) {   // the harbour, south of the Battery
    const w = toWorld(px, py);
    for (const b of BAYS) {
      const e = Math.hypot((w.x - b.x) / b.rx, (w.y - b.y) / b.ry);
      if (e > 1.6) continue;
      // a wobbly shore (not a geometric ellipse)
      const wob = 0.1 * L.noise1(Math.atan2(w.y - b.y, w.x - b.x) * 2.2 + b.x * 1e-4, 5);
      const d = (1 + wob - e) * Math.min(b.rx, b.ry);
      k = Math.max(k, soft > 0 ? L.clamp(0.5 + d / Math.max(soft, 250)) : d > 0 ? 1 : 0);
    }
  }
  return k;
}
/** City-light density 0..1 at local WORLD metres from HOME: the New York metro, on land, not on rivers or in parks. */
export function cityDensity(x, y) {
  const rk = Math.hypot(x * 0.75, y) / 1000;
  if (rk > 160) return 0;
  let d = 0.95 * Math.exp(-Math.pow(rk / 15, 1.4)) + 0.4 * Math.exp(-rk / 42);
  // patchiness: neighbourhoods, rail yards, suburbs, highways (two octaves so it never reads as one radial blob)
  d *= 0.72 + 0.28 * L.noise1(x / 2300 + 0.5 * L.noise1(y / 3100, 3), 7) * L.noise1(y / 2700, 9);
  d *= 0.6 + 0.4 * L.clamp(0.5 + 0.9 * L.noise1(x / 640 + 0.7 * L.noise1(y / 900, 13), 11) * L.noise1(y / 560 + x / 4000, 17));
  if (d < 0.02) return 0;
  const p = toPlan(x, y);
  d *= 1 - waterAt(p.x, p.y, 120);
  d *= 1 - 0.92 * parkAt(p.x, p.y, 60);
  if (rk > 8) { const g = localToLatLon(x, y); d *= L.clamp((elevation(g.lat, g.lon) + 4) / 5); }
  return d;
}

// ------------------------------------------------------------------ timing helpers
const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];
/** Cables 0..1 overall reveal (starts on "It goes under the sea"). */
export function cablesStart(tl) { return tl.scenes[12].start + 0.15; }
const lmpp = (v) => Math.log(v.cam.mpp);
const band = (v, a, b) => L.clamp(L.invLerp(Math.log(a), Math.log(b), lmpp(v)));

// ------------------------------------------------------------------ PLANET: night-globe raster (half resolution)
const RW = W / 2, RH = H / 2;
let rCan = null, rCtx = null, rImg = null;
const OCEAN_T = new Float32Array(3 * 601), LAND_T = new Float32Array(3 * 401);
(function tables() {
  const oc = [[0, [10, 22, 40]], [150, [8, 18, 34]], [1500, [6, 13, 27]], [4000, [4, 9, 20]], [6000, [3, 6, 14]]];
  for (let i = 0; i <= 600; i++) { const c = L.ramp(oc, i * 10); OCEAN_T.set(c, i * 3); }
  const ld = [[0, [17, 21, 28]], [500, [19, 22, 29]], [2000, [24, 26, 33]], [4000, [32, 34, 40]]];
  for (let i = 0; i <= 400; i++) { const c = L.ramp(ld, i * 10); LAND_T.set(c, i * 3); }
})();
function drawGlobe(c, v, alpha) {
  if (!rCan) { rCan = new OffscreenCanvas(RW, RH); rCtx = rCan.getContext('2d'); rImg = rCtx.createImageData(RW, RH); }
  const B = viewOf(v), mpp = v.cam.mpp * 2;   // half-res pixel size
  const d = rImg.data;
  d.fill(0);
  const cx = v.cam.x, cy = v.cam.y, ay = H * v.cam.anchor;
  const disc = globeDisc(v);
  const x0 = Math.max(0, Math.floor((disc.x - disc.r) / 2) - 1), x1 = Math.min(RW, Math.ceil((disc.x + disc.r) / 2) + 1);
  const y0 = Math.max(0, Math.floor((disc.y - disc.r) / 2) - 1), y1 = Math.min(RH, Math.ceil((disc.y + disc.r) / 2) + 1);
  const cell = (R_EARTH * Math.PI) / 1800;   // metres per 0.1 deg
  const prev = new Float32Array(RW).fill(NaN);
  for (let sy = y0; sy < y1; sy++) {
    const wy = cy + (sy * 2 + 1 - ay) * v.cam.mpp;
    const Y = -wy / R_EARTH;
    let left = NaN;
    for (let sx = x0; sx < x1; sx++) {
      const wx = cx + (sx * 2 + 1 - W / 2) * v.cam.mpp;
      const X = wx / R_EARTH;
      const rho2 = X * X + Y * Y;
      if (rho2 >= 1) { prev[sx] = NaN; left = NaN; continue; }
      const Z = Math.sqrt(1 - rho2);
      const px = X * B.e[0] + Y * B.n[0] + Z * B.c[0];
      const py = X * B.e[1] + Y * B.n[1] + Z * B.c[1];
      const pz = Y * B.n[2] + Z * B.c[2];
      const lat = Math.asin(pz > 1 ? 1 : pz < -1 ? -1 : pz) / DEG, lon = Math.atan2(py, px) / DEG;
      let fi = (90 - lat) * 10 - 0.5; fi = fi < 0 ? 0 : fi > GH - 1.001 ? GH - 1.001 : fi;
      const i = fi | 0, u = fi - i;
      let fj = (lon + 180) * 10 - 0.5; if (fj < 0) fj += GW; if (fj >= GW) fj -= GW;
      const j = fj | 0, w = fj - j, j1 = j + 1 === GW ? 0 : j + 1;
      const ea = ELEV[i * GW + j], eb = ELEV[i * GW + j1], ec = ELEV[(i + 1) * GW + j], ed = ELEV[(i + 1) * GW + j1];
      const top = ea + (eb - ea) * w, bot = ec + (ed - ec) * w;
      let e = top + (bot - top) * u;
      // New York harbour: the 0.1-degree grid turns the bays into a diamond-shaped sea cell, so near HOME the rivers
      // and bays come from the hand-made shapes (waterAt) and the inner harbour is otherwise land
      if (lat > 40.35 && lat < 41.1 && lon > -74.45 && lon < -73.55) {
        const lx = (lon - HOME.lon) * DEG * R_EARTH * Math.cos(HOME.lat * DEG), ly = -(lat - HOME.lat) * DEG * R_EARTH;
        const pl = toPlan(lx, ly);
        const wk = waterAt(pl.x, pl.y, mpp * 4);
        const inner = L.clamp(1 - (Math.hypot(lx + 3000, (ly - 9000) * 0.8) - 7000) / 3000);
        if (inner > 0 && e < 8) e = L.lerp(e, 8, inner);
        e = L.lerp(e, Math.min(e, -25), wk);
      }
      const gE = ((eb - ea) * (1 - u) + (ed - ec) * u) / (cell * Math.max(0.05, Math.cos(lat * DEG)));
      const gN = -(bot - top) / cell;
      const relief = 1 + L.clamp((0.5 * gE - 0.5 * gN) * 18, -0.35, 0.35);
      let r, g, b;
      if (e > 0) { const k = Math.min(400, (e / 10) | 0) * 3; r = LAND_T[k] * relief; g = LAND_T[k + 1] * relief; b = LAND_T[k + 2] * relief; }
      else { const k = Math.min(600, (-e / 10) | 0) * 3; r = OCEAN_T[k]; g = OCEAN_T[k + 1]; b = OCEAN_T[k + 2]; }
      // faint coastline (anti-aliased from the screen-space change of elevation)
      const du = prev[sx], gr = (left === left ? Math.abs(e - left) : 0) + (du === du ? Math.abs(e - du) : 0) + 1e-3;
      prev[sx] = e; left = e;
      const line = L.clamp(1 - Math.abs(e) / (gr * 1.1)) * 0.55;
      r += (52 - r) * line; g += (72 - g) * line; b += (96 - b) * line;
      // limb darkening + a cool rim light from the upper left
      const sh = 0.5 + 0.5 * Math.sqrt(Z);
      const rim = Math.pow(1 - Z, 3) * L.clamp(0.4 - X * 0.6 + Y * 0.4);
      const o = (sy * RW + sx) * 4;
      d[o] = r * sh + 40 * rim; d[o + 1] = g * sh + 90 * rim; d[o + 2] = b * sh + 150 * rim;
      // soft anti-aliased disc edge
      const edge = L.clamp((1 - Math.sqrt(rho2)) * R_EARTH / mpp * 1.2);
      d[o + 3] = 255 * edge;
    }
  }
  rCtx.putImageData(rImg, 0, 0);
  c.save();
  c.globalAlpha = alpha;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(rCan, 0, 0, W, H);
  c.restore();
}

/** Screen-space sun for the whole-planet shots: a key light from the upper left and slightly in front, so most of the
 *  visible face is in daylight (continents read) and a night side with city lights wraps the lower right limb. */
export const SUN = [-0.62, 0.42, 0.66];
const SUN_N = (() => { const n = Math.hypot(...SUN); return SUN.map((x) => x / n); })();
/** 0..1: how much the real-Earth day globe has taken over from the regional night raster. */
export const dayK = (v) => band(v, 650, 2600);
/** Daylight (0 night .. 1 day) at a world point on the globe (worldOf result), for the day globe's sun. */
export function litAt(p) {
  const X = p.x / R_EARTH, Y = -p.y / R_EARTH;
  return L.clamp((X * SUN_N[0] + Y * SUN_N[1] + p.z * SUN_N[2] + 0.08) / 0.3);
}
function drawDayEarth(c, v, alpha) {
  const g = globeDisc(v), B = viewOf(v);
  drawEarth(c, { cx: g.x, cy: g.y, r: g.r, lat0: B.lat, lon0: B.lon, style: 'day', sun: SUN, lights: 1, atmosphere: true, alpha });
}

function drawAtmosphere(c, v, k) {
  const g0 = globeDisc(v);
  if (k <= 0 || g0.r > 4000) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(g0.x, g0.y, g0.r * 0.97, g0.x, g0.y, g0.r * 1.12);
  g.addColorStop(0, L.rgba(ACCENT, 0));
  g.addColorStop(0.18, L.rgba([90, 160, 255], 0.22 * k));
  g.addColorStop(1, L.rgba(ACCENT, 0));
  c.fillStyle = g;
  c.beginPath(); c.arc(g0.x, g0.y, Math.max(0, g0.r * 1.12), 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba([120, 190, 255], 0.35 * k);
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(g0.x, g0.y, Math.max(0, g0.r + 0.5), 0, Math.PI * 2); c.stroke();
  c.restore();
}

/** Does the globe disc cover the whole screen? */
function discCovers(v) {
  const g = globeDisc(v);
  return [[0, 0], [W, 0], [0, H], [W, H]].every(([x, y]) => Math.hypot(x - g.x, y - g.y) < g.r - 2);
}

// ------------------------------------------------------------------ BLOOM: lights are also drawn here, then added back blurred
let gCan = null, gCtx = null, gUsed = false;
function glowCtx() {
  if (!gCan) { gCan = new OffscreenCanvas(W / 2, H / 2); gCtx = gCan.getContext('2d'); }
  if (!gUsed) { gCtx.setTransform(1, 0, 0, 1, 0, 0); gCtx.clearRect(0, 0, W / 2, H / 2); gUsed = true; }
  return gCtx;
}
function flushGlow(c, k = 1) {
  if (!gUsed) return;
  gUsed = false;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = k;
  c.filter = 'blur(7px)';
  c.drawImage(gCan, 0, 0, W, H);
  c.globalAlpha = k * 0.6;
  c.filter = 'blur(22px)';
  c.drawImage(gCan, 0, 0, W, H);
  c.restore();
}

// ------------------------------------------------------------------ CITY: blocks, rooftops, screens, traffic
const ROOF = [[20, 23, 30], [24, 27, 35], [18, 21, 27], [27, 30, 38], [22, 24, 31]];
function planBounds(v, pad = 0) {
  const h = homeAt(v);
  const pts = [[0, 0], [W, 0], [0, H], [W, H]].map(([sx, sy]) => {
    const wx = v.cam.x + (sx - W / 2) * v.cam.mpp - h.x, wy = v.cam.y + (sy - H * v.cam.anchor) * v.cam.mpp - h.y;
    return toPlan(wx, wy);
  });
  return {
    x0: Math.min(...pts.map((p) => p.x)) - pad, x1: Math.max(...pts.map((p) => p.x)) + pad,
    y0: Math.min(...pts.map((p) => p.y)) - pad, y1: Math.max(...pts.map((p) => p.y)) + pad,
  };
}
const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** Lots of block (i, j): [{x0, y0, x1, y1, h}] in plan metres (deterministic). */
function blockLots(i, j) {
  const bx0 = i * GRID.ave - GRID.ave / 2 + GRID.aveW / 2, bx1 = i * GRID.ave + GRID.ave / 2 - GRID.aveW / 2;
  const by0 = j * GRID.st - GRID.st / 2 + GRID.stW / 2, by1 = j * GRID.st + GRID.st / 2 - GRID.stW / 2;
  const mid = (by0 + by1) / 2;
  const lots = [];
  for (let row = 0; row < 2; row++) {
    const y0 = row ? mid + 0.6 : by0, y1 = row ? by1 : mid - 0.6;
    let x = bx0, k = 0;
    while (x < bx1 - 4) {
      const hh = hash(i, j, row * 97 + k);
      let w = 12 + hh * 34;
      if (bx1 - (x + w) < 10) w = bx1 - x;
      lots.push({ x0: x, y0, x1: x + w, y1, h: hh, k: row * 97 + k });
      x += w + 0.5; k++;
    }
  }
  return lots;
}

function drawCity(c, v, k) {
  if (k <= 0) return;
  const mpp = v.cam.mpp;
  const b = planBounds(v, 40);
  const i0 = Math.floor((b.x0 + GRID.ave / 2) / GRID.ave), i1 = Math.floor((b.x1 + GRID.ave / 2) / GRID.ave);
  const j0 = Math.floor((b.y0 + GRID.st / 2) / GRID.st), j1 = Math.floor((b.y1 + GRID.st / 2) / GRID.st);
  const lotK = 1 - band(v, 3.5, 7);          // individual lots -> whole blocks
  const dotK = 1 - band(v, 1.0, 1.9);        // per-lot screen dots
  const detK = 1 - band(v, 0.25, 0.6);       // rooftop detail
  const twk = v.gt;
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > 16000) return;
  withPlan(c, v, (c) => {
    c.globalAlpha = k;
    // water: rivers and the bay
    for (const w of WATER) {
      const r = { x0: Math.max(w.x0, b.x0), x1: Math.min(w.x1, b.x1), y0: Math.max(w.y0, b.y0), y1: Math.min(w.y1, b.y1) };
      if (r.x0 >= r.x1 || r.y0 >= r.y1) continue;
      c.fillStyle = '#060c17';
      c.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      // a faint embankment line
      c.strokeStyle = 'rgba(70,95,130,0.35)';
      c.lineWidth = 1.2 * mpp;
      c.strokeRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
    }
    // parks: Central Park (dark lawn, the reservoir, a few path lamps), Bryant Park
    for (const pk of PARKS) {
      if (!overlaps(b, pk)) continue;
      c.fillStyle = '#0a110d';
      c.fillRect(pk.x0, pk.y0, pk.x1 - pk.x0, pk.y1 - pk.y0);
      c.strokeStyle = 'rgba(60,80,70,0.35)';
      c.lineWidth = 1.2 * mpp;
      c.strokeRect(pk.x0, pk.y0, pk.x1 - pk.x0, pk.y1 - pk.y0);
      if (pk.water) { const w = pk.water; c.fillStyle = '#050a14'; c.beginPath(); c.ellipse((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, (w.x1 - w.x0) / 2, (w.y1 - w.y0) / 2, 0, 0, Math.PI * 2); c.fill(); }
      // path lamps: sparse warm dots along winding paths
      const r = L.rng(4242 + pk.x0 | 0);
      const n = Math.round((pk.x1 - pk.x0) * (pk.y1 - pk.y0) / 9000);
      c.globalCompositeOperation = 'lighter';
      for (let q = 0; q < n; q++) {
        const x = L.lerp(pk.x0 + 10, pk.x1 - 10, r()), y = L.lerp(pk.y0 + 10, pk.y1 - 10, r());
        if (waterAt(x, y) > 0) continue;
        c.fillStyle = L.rgba(WARM, 0.35 * r());
        const z = Math.max(0.8, 1.3 * mpp);
        c.fillRect(x - z / 2, y - z / 2, z, z);
      }
      c.globalCompositeOperation = 'source-over';
    }
    // DC pad (the campus itself is drawn by s08)
    if (overlaps(b, DC_PLAN)) {
      c.fillStyle = '#15181e';
      c.fillRect(DC_PLAN.x0, DC_PLAN.y0, DC_PLAN.x1 - DC_PLAN.x0, DC_PLAN.y1 - DC_PLAN.y0);
    }
    const dots = [];
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const cxp = i * GRID.ave, cyp = j * GRID.st;
        if (waterAt(cxp, cyp) > 0 || parkAt(cxp, cyp) > 0) continue;
        const blk = { x0: cxp - 115, x1: cxp + 115, y0: cyp - 31, y1: cyp + 31 };
        if (overlaps(blk, DC_PLAN)) continue;
        const w = toWorld(cxp, cyp);
        const dens = cityDensity(w.x, w.y);
        if (dens < 0.08 || hash(i, j, 5) > dens * 1.6) continue;
        if (lotK <= 0.01) {
          c.fillStyle = L.rgba(ROOF[(hash(i, j, 1) * 5) | 0]);
          c.fillRect(blk.x0, blk.y0, 230, 62);
          continue;
        }
        if (lotK < 1) { c.globalAlpha = k * (1 - lotK); c.fillStyle = L.rgba(ROOF[(hash(i, j, 1) * 5) | 0]); c.fillRect(blk.x0, blk.y0, 230, 62); c.globalAlpha = k * lotK; }
        for (const lot of blockLots(i, j)) {
          if (i === 0 && j === 0 && overlaps(lot, BLDG)) continue;
          if (lot.h > 0.93 && dens < 0.6) continue;   // an empty lot / parking now and then
          const col = ROOF[(lot.h * 5) | 0];
          c.fillStyle = L.rgba(col);
          c.fillRect(lot.x0, lot.y0, lot.x1 - lot.x0, lot.y1 - lot.y0);
          if (detK > 0) {
            // parapet + rooftop units + the odd water tower
            c.strokeStyle = L.rgba(L.mix(col, [70, 78, 92], 0.5), 0.8 * detK);
            c.lineWidth = 0.5;
            c.strokeRect(lot.x0 + 0.6, lot.y0 + 0.6, lot.x1 - lot.x0 - 1.2, lot.y1 - lot.y0 - 1.2);
            const r = L.rng((i * 7919 + j * 104729 + lot.k * 31) >>> 0);
            const n = 1 + ((r() * 3) | 0);
            c.fillStyle = L.rgba(L.mix(col, [60, 66, 78], 0.6), detK);
            for (let q = 0; q < n; q++) {
              const ux = L.lerp(lot.x0 + 2, lot.x1 - 6, r()), uy = L.lerp(lot.y0 + 2, lot.y1 - 6, r());
              c.fillRect(ux, uy, 2 + r() * 3, 2 + r() * 3);
            }
            if (r() < 0.25) {
              const tx = L.lerp(lot.x0 + 4, lot.x1 - 4, r()), ty = L.lerp(lot.y0 + 4, lot.y1 - 4, r());
              c.beginPath(); c.arc(tx, ty, 1.8, 0, Math.PI * 2);
              c.fillStyle = L.rgba([58, 46, 40], detK); c.fill();
            }
          }
          if (dotK > 0) {
            const area = (lot.x1 - lot.x0) * (lot.y1 - lot.y0);
            const r = L.rng((i * 15485863 + j * 32452843 + lot.k * 977) >>> 0);
            // per-block variety: some blocks are offices lit late, some are dark (warehouses, closed shops, sleepers)
            const bf = 0.25 + 0.95 * hash(i, j, 77) * (0.6 + 0.4 * L.noise1(i * 0.37 + j * 0.11, 21));
            const n = Math.round((area / 160) * (0.35 + dens * 0.6) * bf);
            for (let q = 0; q < n; q++) {
              const dx = L.lerp(lot.x0 + 1, lot.x1 - 1, r()), dy = L.lerp(lot.y0 + 1, lot.y1 - 1, r());
              const cool = r() < 0.62, ph0 = r() * 50, sp = 0.15 + r() * 0.5;
              const on = L.clamp((L.noise1(twk * sp + ph0, 4) + 0.35) * 3);
              if (on > 0.02) dots.push(dx, dy, cool ? 1 : 0, on * (0.55 + 0.45 * r()));
            }
          }
        }
        c.globalAlpha = k;
      }
    }
    // the lit screens / windows: additive, at least ~1.2 px
    if (dots.length) {
      c.globalCompositeOperation = 'lighter';
      const s = Math.max(0.7, 1.6 * mpp);
      const g = glowCtx();
      const m = c.getTransform();
      g.setTransform(m.a / 2, m.b / 2, m.c / 2, m.d / 2, m.e / 2, m.f / 2);
      for (let q = 0; q < dots.length; q += 4) {
        c.fillStyle = L.rgba(dots[q + 2] ? SCREEN : WARM, k * dotK * dots[q + 3]);
        c.fillRect(dots[q] - s / 2, dots[q + 1] - s / 2, s, s);
        g.fillStyle = c.fillStyle;
        g.fillRect(dots[q] - s, dots[q + 1] - s, s * 2, s * 2);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
    }
    // traffic on the avenues (along plan y): headlights one way, tail lights the other
    const trafK = (1 - band(v, 3, 7)) * band(v, 0.03, 0.08);
    if (trafK > 0) {
      c.globalCompositeOperation = 'lighter';
      const thin = Math.max(1, Math.pow(2, Math.floor(Math.log2(Math.max(1, mpp / 1.2)))));
      const len = Math.max(4, 6 * mpp);
      for (let i = i0 - 1; i <= i1; i++) {
        const ax = i * GRID.ave + GRID.ave / 2;   // avenue centreline
        for (const dir of [-1, 1]) {
          const lane = ax + dir * 6;
          const sp = 9 + hash(i, dir + 3) * 6, gap = 55 * thin;
          const off = (v.gt * sp * dir) % gap;
          for (let y = Math.floor((b.y0 - off) / gap) * gap + off; y < b.y1; y += gap) {
            const jit = (hash(i, Math.round((y - off) / gap), dir + 11) - 0.5) * gap * 0.8;
            const yy = y + jit;
            if (waterAt(lane, yy) > 0 || parkAt(lane, yy) > 0) continue;
            if (hash(i, Math.round((y - off) / gap), dir + 23) < 0.3) continue;   // gaps in the traffic
            const w = toWorld(lane, yy);
            if (cityDensity(w.x, w.y) < 0.15) continue;
            c.fillStyle = dir > 0 ? `rgba(255,236,210,${0.6 * trafK * k})` : `rgba(255,70,60,${0.6 * trafK * k})`;
            c.fillRect(lane - Math.max(0.9, 1.1 * mpp), yy - (dir > 0 ? 0 : len), Math.max(1.8, 2.2 * mpp), len);
          }
        }
      }
      c.globalCompositeOperation = 'source-over';
    }
  });
}

// ------------------------------------------------------------------ LIGHTS: world-anchored regional light field
function drawLights(c, v, k) {
  if (k <= 0) return;
  const mpp = v.cam.mpp;
  const lv = Math.log2(mpp * 11);
  const l0 = Math.floor(lv), f = lv - l0;
  const b = planBounds(v, 0);
  const g = glowCtx();
  const regB = L.lerp(1, 2.4, band(v, 12, 110));   // the metro reads as a bright web of light from the regional view
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const [lev, a] of [[l0, 1 - f], [l0 + 1, f]]) {
    if (a <= 0.01) continue;
    const s = Math.pow(2, lev);
    const i0 = Math.floor(b.x0 / s), i1 = Math.floor(b.x1 / s), j0 = Math.floor(b.y0 / s), j1 = Math.floor(b.y1 / s);
    if ((i1 - i0) * (j1 - j0) > 160000) continue;   // the finer level can reach ~137k cells (rotated bounds, s = 5.5 mpp): a lower cap dropped it mid-crossfade and the light field pulsed dark on every level change
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const h1 = hash(i, j, lev);
        if (h1 > 0.9) continue;
        let px = (i + hash(i, j, lev + 50)) * s, py = (j + hash(i, j, lev + 90)) * s;
        // a few snap to the street grid as separate streetlights (sidewalk either side, jittered); most are windows
        const h3 = hash(i, j, lev + 130);
        let street = 0;
        const side = (hash(i, j, lev + 150) < 0.5 ? -1 : 1);
        if (h3 < 0.13) { px = Math.round((px - GRID.ave / 2) / GRID.ave) * GRID.ave + GRID.ave / 2 + side * (11 + 4 * hash(i, j, lev + 160)); street = 1; }
        else if (h3 < 0.24) { py = Math.round((py - GRID.st / 2) / GRID.st) * GRID.st + GRID.st / 2 + side * (7 + 3 * hash(i, j, lev + 160)); street = 1; }
        const w = toWorld(px, py);
        const dens = cityDensity(w.x, w.y);
        if (h1 > dens * 0.9) continue;
        const h = homeAt(v);
        const sx = v.wx(h.x + w.x), sy = v.wy(h.y + w.y);
        if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
        const cool = !street && hash(i, j, lev + 170) < 0.4;
        // per-block dimming (dark blocks next to bright ones) and an overall level that keeps the HUD readable
        const blkK = 0.35 + 0.65 * hash(Math.floor(px / GRID.ave), Math.floor(py / GRID.st), 91);
        const br = Math.min(1, a * k * (0.38 + 0.62 * hash(i, j, lev + 210)) * (0.6 + 0.6 * dens) * (street ? 0.55 : blkK) * regB);
        c.fillStyle = L.rgba(cool ? SCREEN : WARM, br);
        const z = 1.3 + 1.3 * dens;
        c.fillRect(sx - z / 2, sy - z / 2, z, z);
        g.fillStyle = c.fillStyle;
        g.fillRect(sx / 2 - z / 2, sy / 2 - z / 2, z, z);
      }
    }
  }
  c.restore();
  // sky glow over the metro
  const h = homeAt(v);
  const gk = k * band(v, 8, 60);
  if (gk > 0) L.lightBlob(c, v.wx(h.x), v.wy(h.y), v.ws(40000), [255, 170, 100], 0.2 * gk);
}

// ------------------------------------------------------------------ PLANET: city light clusters
const CITY_PTS = CITIES.map(([, lat, lon, pop], ci) => {
  const r = L.rng(1000 + ci), n = Math.round(10 + 7 * Math.sqrt(pop)), sig = (12 + 9 * Math.sqrt(pop)) * 1000;
  const pts = [];
  for (let q = 0; q < n; q++) {
    // gaussian offsets in metres -> degrees
    const g1 = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * sig * 0.6, a = r() * Math.PI * 2;
    pts.push([lat + (g1 * Math.sin(a)) / R_EARTH / DEG, lon + (g1 * Math.cos(a)) / (R_EARTH * Math.cos(lat * DEG)) / DEG, r()]);
  }
  return { lat, lon, pop, pts, sig };
});
function drawCityClusters(c, v, k, nyK) {
  if (k <= 0) return;
  const B = viewOf(v), dk = dayK(v);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let ci = 0; ci < CITY_PTS.length; ci++) {
    const cty = CITY_PTS[ci];
    const kk = CITIES[ci][0] === 'New York' ? k * nyK : k;
    if (kk <= 0) continue;
    const p0 = worldOf(B, cty.lat, cty.lon);
    if (p0.z < 0.02) continue;
    const sx = v.wx(p0.x), sy = v.wy(p0.y), rr = v.ws(cty.sig * 3);
    if (sx < -rr - 20 || sx > W + rr + 20 || sy < -rr - 20 || sy > H + rr + 20) continue;
    const lim = L.clamp(p0.z * 3) * L.lerp(1, 0.12 + 0.88 * (1 - litAt(p0)), dk);
    if (lim <= 0.01) continue;
    L.lightBlob(c, sx, sy, Math.max(4, rr), WARM, kk * lim * 0.16 * Math.min(1.4, Math.sqrt(cty.pop / 8)));
    for (const [la, lo, h] of cty.pts) {
      const p = worldOf(B, la, lo);
      if (p.z < 0) continue;
      c.fillStyle = L.rgba(h < 0.3 ? SCREEN : WARM, kk * lim * (0.45 + 0.5 * h));
      c.fillRect(v.wx(p.x) - 0.8, v.wy(p.y) - 0.8, 1.6, 1.6);
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ CABLES
const CABLE_GEOM = CABLES.map((cb) => {
  const P = [], acc = [0];
  for (let i = 0; i < cb.pts.length - 1; i++) {
    const a = unit(...cb.pts[i]), b = unit(...cb.pts[i + 1]);
    const ang = Math.acos(L.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    const n = Math.max(1, Math.ceil(ang / (0.8 * DEG)));
    for (let k = i ? 1 : 0; k <= n; k++) {
      const p = slerp(a, b, ang, k / n);
      if (P.length) acc.push(acc[acc.length - 1] + ang / n);
      P.push(p);
    }
  }
  return { P, acc, len: acc[acc.length - 1] };
});
/** Reveal of cable i (0..1) at time gt: they draw on, staggered, from "It goes under the sea". */
export function cableReveal(i, gt, tl) {
  const s = cablesStart(tl) + (i % 12) * 0.11 + Math.floor(i / 12) * 0.35;
  return L.ease.inOutCubic(L.prog(gt, s, 1.5));
}
/** 1 when the planet is still, easing to 0.4 while it whips round fast (the turn home), so the glowing lines stay thin
 *  and fixed to the surface instead of smearing into motion-blurred bands. */
export function spinFade(v) {
  const a = camFace(v.gt, v.tl), b = camFace(v.gt - 0.05, v.tl);
  const d = Math.acos(L.clamp(unit(a[0], a[1]).reduce((s, x, i) => s + x * unit(b[0], b[1])[i], 0), -1, 1)) / DEG / 0.05;
  return L.lerp(1, 0.4, L.clamp((d - 30) / 60));
}
/** Overall visibility of the cable layer from zoom (fades out on the dive home). */
export const cableZoomK = (v) => band(v, 250, 1200);
function drawCables(c, v) {
  if (v.gt < cablesStart(v.tl)) return;
  const zk = cableZoomK(v) * spinFade(v);
  if (zk <= 0) return;
  const B = viewOf(v);
  const scr = (p) => {
    const z = p[0] * B.c[0] + p[1] * B.c[1] + p[2] * B.c[2];
    return [v.wx(R_EARTH * (p[0] * B.e[0] + p[1] * B.e[1])), v.wy(-R_EARTH * (p[0] * B.n[0] + p[1] * B.n[1] + p[2] * B.n[2])), z];
  };
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineJoin = 'round'; c.lineCap = 'round';
  CABLE_GEOM.forEach((g, ci) => {
    const rv = cableReveal(ci, v.gt, v.tl);
    if (rv <= 0) return;
    const until = rv * g.len;
    const S = g.P.map(scr);
    const path = () => {
      c.beginPath();
      let pen = false;
      for (let q = 0; q < S.length; q++) {
        if (g.acc[q] > until + 1e-9) {
          if (pen && q > 0) {
            const f = (until - g.acc[q - 1]) / (g.acc[q] - g.acc[q - 1]);
            c.lineTo(L.lerp(S[q - 1][0], S[q][0], f), L.lerp(S[q - 1][1], S[q][1], f));
          }
          break;
        }
        const [x, y, z] = S[q];
        if (z < 0.01) { pen = false; continue; }
        if (pen) c.lineTo(x, y); else { c.moveTo(x, y); pen = true; }
      }
    };
    path();
    c.strokeStyle = L.rgba(ACCENT, 0.22 * zk);
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = L.rgba([150, 205, 255], 0.9 * zk);
    c.lineWidth = 1.4;
    c.stroke();
    // landing stations
    for (const [q, on] of [[0, rv > 0], [S.length - 1, rv >= 1]]) {
      if (!on || S[q][2] < 0.05) continue;
      c.fillStyle = L.rgba([200, 230, 255], 0.9 * zk);
      c.beginPath(); c.arc(S[q][0], S[q][1], 2.4, 0, Math.PI * 2); c.fill();
    }
    // data pulses once the cable is drawn
    const pk = zk * L.clamp((rv - 0.85) / 0.15);
    if (pk > 0) {
      const n = Math.max(1, Math.round(g.len * 5));
      for (let m = 0; m < n; m++) {
        const dir = (ci + m) % 2 ? 1 : -1;
        let s = ((m / n + dir * v.gt * 0.045 / Math.max(0.3, g.len)) % 1 + 1) % 1;
        const a = s * g.len;
        let q = 1; while (q < g.acc.length - 1 && g.acc[q] < a) q++;
        const f = (a - g.acc[q - 1]) / Math.max(1e-9, g.acc[q] - g.acc[q - 1]);
        const z = L.lerp(S[q - 1][2], S[q][2], f);
        if (z < 0.05) continue;
        const x = L.lerp(S[q - 1][0], S[q][0], f), y = L.lerp(S[q - 1][1], S[q][1], f);
        c.fillStyle = L.rgba([235, 245, 255], pk * 0.95);
        c.beginPath(); c.arc(x, y, 2.0, 0, Math.PI * 2); c.fill();
        L.lightBlob(c, x, y, 9, ACCENT, pk * 0.5);
      }
    }
  });
  c.restore();
}

// ------------------------------------------------------------------ ROOM / building plan (near the phone)
function drawHomePlan(c, v, k) {
  if (k <= 0) return;
  const mpp = v.cam.mpp;
  withPlan(c, v, (c) => {
    c.globalAlpha = k;
    // the building: a cut-away plan (dark interior, apartment walls), the bedroom left open
    const BW = BLDG.x1 - BLDG.x0, BH = BLDG.y1 - BLDG.y0;
    // drop shadow of the block on the street, then a slightly lifted interior tone
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.65)';
    c.shadowBlur = Math.min(80, 2.5 / mpp);
    c.shadowOffsetY = Math.min(30, 0.8 / mpp);
    c.fillStyle = '#121419';
    c.fillRect(BLDG.x0, BLDG.y0, BW, BH);
    c.restore();
    const ig = c.createLinearGradient(BLDG.x0, BLDG.y0, BLDG.x1, BLDG.y1);
    ig.addColorStop(0, '#161921'); ig.addColorStop(1, '#0f1116');
    c.fillStyle = ig;
    c.fillRect(BLDG.x0, BLDG.y0, BW, BH);
    // a few other lit rooms in the cut-away: window light pooling in from the facade, furniture blocks, soft wall shadow
    const r = L.rng(77);
    for (let q = 0; q < 9; q++) {
      const x = BLDG.x0 + 6 + Math.floor(r() * 4) * 8 + 0.6, y = r() < 0.5 ? BLDG.y0 + 1 + r() * 14 : -3.6 + r() * 9;
      const on = L.clamp((L.noise1(v.gt * 0.3 + q * 7, 12) + 0.4) * 3);
      const warm = r() < 0.5, f1 = r(), f2 = r(), f3 = r();
      if (x > ROOM.x0 - 2 && x < ROOM.x1 + 1 && y > ROOM.y0 - 2 && y < ROOM.y1 + 1) continue;
      const col = warm ? '255,190,120' : '150,200,255';
      const north = y < -8;                       // the window is on the nearer facade
      const lg = c.createLinearGradient(0, north ? y : y + 4, 0, north ? y + 4 : y);
      lg.addColorStop(0, `rgba(${col},${0.2 + 0.2 * on})`);
      lg.addColorStop(1, `rgba(${col},${0.03 + 0.03 * on})`);
      c.fillStyle = lg;
      c.fillRect(x, y, 6.6, 4);
      // furniture: a bed / sofa block and a table, with a lit edge toward the window
      c.fillStyle = 'rgba(10,11,15,0.55)';
      const bx = x + 0.5 + f1 * 3, by = north ? y + 1.6 : y + 0.4;
      c.fillRect(bx, by, 2 + f2 * 0.8, 1.6 + f3 * 0.6);
      c.fillRect(x + 6.6 - 1.6 - f3, y + 1.2 + f2, 1.0, 1.0);
      c.fillStyle = `rgba(${col},${0.12 + 0.12 * on})`;
      c.fillRect(bx, north ? by : by + 1.5 + f3 * 0.6, 2 + f2 * 0.8, 0.12);
    }
    // interior walls with a soft shadow line beside each
    const walls = new Path2D();
    for (let x = BLDG.x0 + 6; x < BLDG.x1; x += 8) { walls.moveTo(x, BLDG.y0); walls.lineTo(x, -8); walls.moveTo(x, -4.6); walls.lineTo(x, BLDG.y1); }
    walls.moveTo(BLDG.x0, -8); walls.lineTo(BLDG.x1, -8); walls.moveTo(BLDG.x0, -4.6); walls.lineTo(BLDG.x1, -4.6);
    c.save();
    c.translate(0.18, 0.18);
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.lineWidth = Math.max(0.35, 3 * mpp);
    c.stroke(walls);
    c.restore();
    c.strokeStyle = 'rgba(92,100,118,0.6)';
    c.lineWidth = Math.max(0.16, 1.4 * mpp);
    c.stroke(walls);
    // roof parapet: a thick lit rim with a dark inner edge
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = Math.max(0.5, 3 * mpp);
    c.strokeRect(BLDG.x0 + 0.55, BLDG.y0 + 0.55, BW - 1.1, BH - 1.1);
    c.strokeStyle = 'rgba(132,142,162,0.62)';
    c.lineWidth = Math.max(0.6, 2 * mpp);
    c.strokeRect(BLDG.x0 + 0.15, BLDG.y0 + 0.15, BW - 0.3, BH - 0.3);
    // bedroom floor: dark oak planks
    const R = ROOM;
    c.fillStyle = '#1d1714';
    c.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    if (mpp < 0.03) {
      const pk = 1 - band(v, 0.008, 0.03);
      c.strokeStyle = `rgba(8,6,5,${0.55 * pk})`;
      c.lineWidth = Math.max(0.003, 1 * mpp);
      c.beginPath();
      for (let x = R.x0; x <= R.x1; x += 0.19) {
        c.moveTo(x, R.y0); c.lineTo(x, R.y1);
        const col = Math.round((x - R.x0) / 0.19);
        for (let y = R.y0 + hash(col, 3) * 1.4; y < R.y1; y += 1.4) { c.moveTo(x, y); c.lineTo(x + 0.19, y); }
      }
      c.stroke();
      // faint grain
      c.strokeStyle = `rgba(60,46,38,${0.25 * pk})`;
      c.beginPath();
      const gr = L.rng(31);
      for (let q = 0; q < 160; q++) { const x = R.x0 + gr() * 4, y = R.y0 + gr() * 4.5; c.moveTo(x, y); c.lineTo(x + 0.002, y + 0.25 + gr() * 0.5); }
      c.stroke();
    }
    // window spill: cool city light across the floor from the east wall
    const sp = c.createLinearGradient(R.x1, 0, R.x1 - 2.2, 0);
    sp.addColorStop(0, 'rgba(120,150,200,0.13)'); sp.addColorStop(1, 'rgba(120,150,200,0)');
    c.fillStyle = sp;
    c.beginPath();
    c.moveTo(R.x1, R.window.y0); c.lineTo(R.x1 - 2.4, R.window.y0 + 0.5); c.lineTo(R.x1 - 2.4, R.window.y1 + 0.9); c.lineTo(R.x1, R.window.y1);
    c.fill();
    // walls
    const t = R.wall;
    c.fillStyle = '#2b2f38';
    c.fillRect(R.x0 - t, R.y0 - t, R.x1 - R.x0 + 2 * t, t);
    c.fillRect(R.x0 - t, R.y1, R.x1 - R.x0 + 2 * t, t);
    c.fillRect(R.x0 - t, R.y0, t, R.y1 - R.y0);
    c.fillRect(R.x1, R.y0, t, R.window.y0 - R.y0);
    c.fillRect(R.x1, R.window.y1, t, R.y1 - R.window.y1);
    // window: glass + mullion
    c.fillStyle = '#3a5272';
    c.fillRect(R.x1 + t * 0.35, R.window.y0, t * 0.3, R.window.y1 - R.window.y0);
    // door gap on the south wall
    c.fillStyle = '#1d1714';
    c.fillRect(R.x0 + 0.5, R.y1 - 0.01, 0.9, t + 0.02);
    // nightstand: walnut, soft contact shadow
    const N = NIGHTSTAND;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.6)';
    c.shadowBlur = Math.min(60, 0.05 / mpp);
    c.fillStyle = '#3b2a20';
    c.beginPath(); L.roundRect(c, N.x0, N.y0, N.x1 - N.x0, N.y1 - N.y0, 0.012); c.fill();
    c.restore();
    if (mpp < 0.004) {
      const gr = L.rng(9);
      c.strokeStyle = 'rgba(25,16,11,0.45)';
      c.lineWidth = Math.max(0.0006, 1.2 * mpp);
      c.beginPath();
      for (let q = 0; q < 26; q++) {
        const y = L.lerp(N.y0 + 0.01, N.y1 - 0.01, (q + gr() * 0.6) / 26);
        c.moveTo(N.x0 + 0.01, y);
        for (let x = N.x0 + 0.01; x <= N.x1 - 0.01; x += 0.02) c.lineTo(x, y + 0.004 * Math.sin(x * 37 + q * 1.7) + 0.002 * Math.sin(x * 91 + q));
      }
      c.stroke();
      c.strokeStyle = 'rgba(120,90,66,0.35)';
      c.lineWidth = Math.max(0.0006, 1.5 * mpp);
      c.beginPath(); L.roundRect(c, N.x0 + 0.004, N.y0 + 0.004, N.x1 - N.x0 - 0.008, N.y1 - N.y0 - 0.008, 0.01); c.stroke();
    }
  });
}

// ------------------------------------------------------------------ layers
export function drawBackground(c, v) {
  const mpp = v.cam.mpp;
  const pk = planK(v);
  // 1. space
  c.fillStyle = '#030509';
  c.fillRect(0, 0, W, H);
  const globeK = band(v, 18, 40);                 // the ray-cast planet takes over from the flat ground
  if (globeK > 0 && !discCovers(v)) {
    const g = globeDisc(v);
    c.save();
    c.beginPath(); c.rect(0, 0, W, H); c.arc(g.x, g.y, Math.max(0, g.r * 1.02), 0, Math.PI * 2, true); c.clip('evenodd');
    stars(c, v, 0.75 * band(v, 1500, 5000), 190, 18);
    c.restore();
  }
  // 2. flat night ground (city scale)
  if (globeK < 1) { c.fillStyle = L.rgba([11, 13, 18], 1 - globeK); c.fillRect(0, 0, W, H); }
  // 3. the planet
  if (globeK > 0) {
    const dk = dayK(v);
    if (dk < 1) drawGlobe(c, v, globeK);
    if (dk > 0) drawDayEarth(c, v, globeK * dk);
    drawAtmosphere(c, v, band(v, 800, 3000) * (1 - 0.6 * dk));
  }
  // 4. city plan, regional light field, city clusters. During a very fast dive (the zoom home) the city is dimmed so the
  // motion blur reads as a clean dark streak and not a muddy grey-brown smear.
  const zs = Math.abs(Math.log(camAt(v.gt + 0.02, v.tl).mpp / camAt(v.gt - 0.02, v.tl).mpp)) / 0.04;
  const fastK = L.lerp(1, 0.55, L.clamp((zs - 4) / 3.5));
  const cityK = pk * (1 - band(v, 9, 16)) * fastK;
  drawCity(c, v, cityK);
  const lightK = pk * band(v, 0.9, 2.0) * (1 - band(v, 500, 1100)) * fastK;
  drawLights(c, v, lightK);
  flushGlow(c, 1);
  // the city fades into darkness toward the frame edges (one focal area, never a wall-to-wall pattern)
  const edgeK = pk * band(v, 0.5, 1.2) * (1 - band(v, 40, 200));
  if (edgeK > 0) {
    const eg = c.createRadialGradient(W / 2, H * 0.47, 380, W / 2, H * 0.5, 1150);
    eg.addColorStop(0, 'rgba(4,6,10,0)'); eg.addColorStop(1, `rgba(4,6,10,${0.6 * edgeK})`);
    c.fillStyle = eg;
    c.fillRect(0, 0, W, H);
  }
  drawCityClusters(c, v, band(v, 250, 700), band(v, 600, 1100));
  // 5. the undersea cables
  drawCables(c, v);
  // 6. the bedroom / building plan around the phone
  drawHomePlan(c, v, pk * (1 - band(v, 0.6, 1.2)));
}
export function drawForeground(c, v) {
  // a soft dark scrim under the top bar, chapter card and counter (invisible over space, keeps them legible over the
  // bright city and the daylit planet)
  // stronger and deeper when the daylit planet fills the top of the frame (it also backs the scene labels there)
  const gd = globeDisc(v);
  const bright = dayK(v) * band(v, 18, 40) * L.clamp((gd.r - Math.hypot(W / 2 - gd.x, 420 - gd.y)) / 200 + 0.5);
  const sh = L.lerp(380, 720, bright);
  const sg = c.createLinearGradient(0, 0, 0, sh);
  sg.addColorStop(0, `rgba(2,4,9,${L.lerp(0.5, 0.62, bright)})`); sg.addColorStop(0.6, `rgba(2,4,9,${L.lerp(0.32, 0.45, bright)})`); sg.addColorStop(1, 'rgba(2,4,9,0)');
  c.fillStyle = sg;
  c.fillRect(0, 0, W, sh);
}

// ------------------------------------------------------------------ HUD: top bar + live counter
/** The live counter's state: which stat, its value, and visibility. */
export function counterState(v) {
  const sc = v.tl.scenes;
  const inK = L.ease.outCubic(L.prog(v.gt, ph(v.tl, 2, 1) + 0.4, 0.6));
  // the swap to hours runs one after the other (old exits, then new enters), after the dive's fastest travel
  const t0 = ph(v.tl, 17, 1) + 0.7;
  const outK = L.ease.inCubic(L.prog(v.gt, t0, 0.2));
  const newK = L.ease.outCubic(L.prog(v.gt, t0 + 0.22, 0.32));
  return { inK, outK, newK, sw: newK, searches: Math.floor(v.gt * 100000 + 1e-6), hours: v.gt * (500 / 60), start: sc[0].start };
}
export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  const s = counterState(v);
  if (s.inK <= 0) return;
  c.save();
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(2,6,14,0.8)';
  c.shadowBlur = 12;
  const block = (k, big, small, dy) => {
    if (k <= 0) return;
    c.globalAlpha = k;
    c.font = L.font(50, 700, L.FONT.din);
    c.fillStyle = '#fff';
    c.textAlign = 'right';
    c.fillText(big, W - 64, 254 + dy);
    c.font = L.font(17, 600, L.FONT.body);
    c.fillStyle = L.rgba([200, 212, 228], 0.85);
    const tw = L.trackedText(c, small, W - 64, 282 + dy, 2, 'right');
    c.fillStyle = L.rgba(ACCENT, 0.95);
    c.beginPath(); c.arc(W - 64 - tw - 14, 276 + dy, 4, 0, Math.PI * 2);
    c.globalAlpha = k * (0.55 + 0.45 * Math.sin(v.gt * 5));
    c.fill();
  };
  block(s.inK * (1 - s.outK), L.fmt(s.searches), 'GOOGLE SEARCHES SINCE YOU PRESSED PLAY', -12 * s.outK);
  block(s.inK * s.newK, `${L.fmt(s.hours, 0)} HOURS`, 'OF VIDEO UPLOADED SINCE YOU PRESSED PLAY', 12 * (1 - s.newK));
  c.restore();
}
export const cues = (tl) => beatCues(tl, { gain: 0.16, pitch: 1.0 });
