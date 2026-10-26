// Environment for "What If Humans Disappeared Tomorrow?". Owned by the orchestrator — builders: read, don't edit.
//
// Top-down night city (stylised New York: Manhattan + both banks + the harbour), drawn by level of detail:
//   mpp < 3     blocks subdivided into building lots (roof tones, tower shadows, rooftop water tanks), street lamps
//   mpp 3-40    street lines (amber when lit, faint when dark) clipped to the land
//   mpp > 40    flat land / water; light-pollution glow while the city is lit
//   mpp > 250   the planet: a dark night-side disc with a thin sunlit crescent, clouds, the atmosphere rim
//   mpp > 800   stars (screen space, parallax with zoom); Earth shrinks to a "pale dot" marker
// City state is a pure function of time: lit (blackout wave from PLANT in beat 3), day (time-lapse day/night),
// green (forest takes the grid in beat 6), ruin (buildings fall in beat 7). Scenes add the focal subjects.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, topBar, stars } from '../../../engine/runtime/kit.js';
import { drawEarth, basis } from '../../../engine/runtime/earth.js';
import { R_EARTH, C, LY, GRID, PLAZA, PLANT, CENTRAL_PARK, SUN_DIR, ELAPSED, GEO_ORIGIN, GEO_TILT } from './camera.js';
import { FINE as GEO_FINE, MED as GEO_MED, COARSE as GEO_COARSE, CITY as GEO_CITY } from './geo-nyc.js';

const { W, H } = L;
export const ACCENT = [255, 190, 95];
export { R_EARTH, C, LY };
export const LAMP = [255, 176, 88];          // sodium street light (close to the accent)
export const MOON = [150, 175, 215];         // cool moonlight

// ------------------------------------------------------------------ geography (metres, see camera.js)
// REAL coastlines (geo-nyc.js: NYC DCP borough shorelines + US Census 500k counties), projected into the world frame.
// Three levels of detail; each ring is a flat [x0, y0, x1, y1, ...] array with its bbox for culling.
const prep = (rings) => rings.map((r) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
  return { r, x0, y0, x1, y1 };
});
const LOD = { fine: prep(GEO_FINE), med: prep(GEO_MED), coarse: prep(GEO_COARSE) };
const CITY = prep(GEO_CITY);
const lodFor = (m) => (m < 14 ? LOD.fine : m < 110 ? LOD.med : LOD.coarse);
/** Land rings (as [[x, y], ...] point lists, medium detail) for scenes that need raw geometry. */
export const LANDS = GEO_MED.map((r) => { const out = []; for (let i = 0; i < r.length; i += 2) out.push([r[i], r[i + 1]]); return out; });
export const MANHATTAN = LANDS.find((p) => inPoly(p, -500, -5000)) || LANDS[0];
export const EAST = [], WEST = [];
export const GOVERNORS = { x: 542, y: 1654, rx: 0, ry: 0 };   // Governors Island is in the real data now
export function govPath() {}
/** Append every visible land ring to the current path (call c.beginPath() first; fill with 'nonzero'). */
export function addLand(c, v, rings = lodFor(v.cam.mpp), pad = 60) {
  const R = worldRect(v, pad);
  for (const q of rings) {
    if (q.x1 < R.x0 || q.x0 > R.x1 || q.y1 < R.y0 || q.y0 > R.y1) continue;
    const r = q.r;
    c.moveTo(v.wx(r[0]), v.wy(r[1]));
    for (let i = 2; i < r.length; i += 2) c.lineTo(v.wx(r[i]), v.wy(r[i + 1]));
    c.closePath();
  }
}
/** The New York City boroughs (for the overgrown-city tint at region scale). */
export function addCity(c, v) { addLand(c, v, CITY); }
// unlit green spaces (rects, metres)
const PARKS = [CENTRAL_PARK, { x0: 4950, y0: 1850, x1: 6350, y1: 3250 } /* Prospect Park */,
  { x0: -260 + 15, y0: -80 + 9, x1: -15, y1: -9 } /* the plaza block */, { x0: -420, y0: 300, x1: 120, y1: 640 } /* the Battery */];

function inPoly(p, x, y) {
  let ins = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function inRing(r, x, y) {
  let ins = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
// land mask (12 m cells) over the city, rasterised once from the fine rings; outside it, point-in-polygon on MED
const MASK = { x0: -9000, y0: -24000, x1: 11000, y1: 14000, s: 12 };
MASK.w = Math.ceil((MASK.x1 - MASK.x0) / MASK.s); MASK.h = Math.ceil((MASK.y1 - MASK.y0) / MASK.s);
MASK.a = (() => {
  const cv = new OffscreenCanvas(MASK.w, MASK.h), g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath();
  for (const { r } of LOD.fine) {
    g.moveTo((r[0] - MASK.x0) / MASK.s, (r[1] - MASK.y0) / MASK.s);
    for (let i = 2; i < r.length; i += 2) g.lineTo((r[i] - MASK.x0) / MASK.s, (r[i + 1] - MASK.y0) / MASK.s);
    g.closePath();
  }
  g.fill('nonzero');
  const d = g.getImageData(0, 0, MASK.w, MASK.h).data, a = new Uint8Array(MASK.w * MASK.h);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4] > 127 ? 1 : 0;
  return a;
})();
/** Is the world point on land? */
export function onLand(x, y) {
  if (x >= MASK.x0 && x < MASK.x1 && y >= MASK.y0 && y < MASK.y1) return MASK.a[((y - MASK.y0) / MASK.s | 0) * MASK.w + ((x - MASK.x0) / MASK.s | 0)] === 1;
  let n = 0;
  for (const q of LOD.med) if (x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1 && inRing(q.r, x, y)) n++;
  return n % 2 === 1;
}
const inPark = (x, y) => PARKS.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);

/** Visible world rectangle {x0, y0, x1, y1} (+ pad in pixels). */
export function worldRect(v, pad = 0) {
  const m = v.cam.mpp, ay = H * v.cam.anchor;
  return { x0: v.cam.x - (W / 2 + pad) * m, x1: v.cam.x + (W / 2 + pad) * m, y0: v.cam.y - (ay + pad) * m, y1: v.cam.y + (H - ay + pad) * m };
}
export function landPath(c, v) {
  c.beginPath();
  addLand(c, v);
}

// ------------------------------------------------------------------ time-lapse clock + city state
const beatOf = (v) => { let b = 0; v.tl.scenes.forEach((s, i) => { if (s.start <= v.gt) b = i; }); return b; };
const startOf = (v, b) => v.tl.scenes[Math.min(b, v.tl.scenes.length - 1)].start;
const lastH = (b) => { for (let i = b; i >= 0; i--) if (ELAPSED[i]) return ELAPSED[i].h; return 0; };

/** Hours elapsed since everyone vanished (counts in log space between beats). */
export function elapsedHours(v, gt = v.gt) {
  let b = 0;
  v.tl.scenes.forEach((s, i) => { if (s.start <= gt) b = i; });
  const e = ELAPSED[b];
  if (!e || b === 0) return lastH(b);
  const a = lastH(b - 1), z = e.h;
  const k = L.ease.inOutCubic(L.prog(gt - v.tl.scenes[b].start, e.at, e.dur));
  if (a <= 0) return z * k;
  return Math.exp(L.lerp(Math.log(a), Math.log(z), k));
}
/** "45 MINUTES", "8 HOURS", "1.5 DAYS", "20 YEARS", "1,000,000 YEARS". */
export function fmtElapsed(h) {
  // never "0 MINUTES" (the clock fades in at the start of beat 1) and never "1 MINUTES"
  if (h < 0.98) { const n = Math.max(1, Math.round(h * 60)); return `${n} MINUTE${n === 1 ? '' : 'S'}`; }
  if (h < 23.5) { const n = Math.round(h); return `${n} HOUR${n === 1 ? '' : 'S'}`; }
  const d = h / 24;
  if (d < 364.5) { const n = d < 9.95 ? Math.round(d * 10) / 10 : Math.round(d); return `${L.fmt(n, n % 1 ? 1 : 0)} DAY${n === 1 ? '' : 'S'}`; }
  const y = Math.max(1, Math.round(h / 8766));
  return `${L.fmt(y)} YEAR${y === 1 ? '' : 'S'}`;
}

/** Sunlight 0..1 for a clock that starts at 20:00. Real day/night for the first days, then a time-lapse average. */
function daylight(h) {
  const hour = (20 + h) % 24;
  const s = Math.cos((2 * Math.PI * (hour - 13)) / 24);
  const cyc = L.smoothstep(L.clamp((s + 0.1) / 0.55));
  const avg = L.smoothstep(L.clamp(L.invLerp(Math.log(56), Math.log(500), Math.log(Math.max(1, h)))));
  return L.lerp(cyc, 0.3, avg);
}

// ------------------------------------------------------------------ the blackout: district by district
// The grid fails in feeder order, not as a circle: the city is cut into districts (3 avenues x 6 streets, aligned with
// the street grid), and each district switches off at its own moment of beat 3, ordered by its distance from the plant
// ALONG the grid (|dx| + |dy|, with a penalty for every river the feeders cross) plus jitter, so the front is ragged
// and follows the streets. Each district flickers just before it dies; ~7% are holdouts that hang on and go out late.
export const DIST = { w: 3 * GRID.ave, h: 6 * GRID.st };
const B3 = { t0: 0.15, t1: 2.45, end: 3.05 };     // beat-3 seconds: first district off, the main front done, last holdout
/** Seconds after the beat-3 start when district (i, j) goes dark. */
export function districtOff(i, j) {
  const x = (i + 0.5) * DIST.w, y = (j + 0.5) * DIST.h;
  let d = Math.abs(x - PLANT.x) * 1.0 + Math.abs(y - PLANT.y) * 0.75;
  // crossing the East River (Queens -> Manhattan / Brooklyn far side) costs extra feeder length
  if (x < 1500 && PLANT.x > 1500) d += 1600;
  if (x < -2900) d += 2600;                                   // the Hudson: New Jersey is on its own grid
  d += (hash(i, j, 61) - 0.5) * 2600;
  const u = L.clamp(d / 21000);
  let t = B3.t0 + (B3.t1 - B3.t0) * Math.pow(u, 0.75);
  if (hash(i, j, 62) < 0.07) t = Math.min(B3.end, t + 0.45 + 0.6 * hash(i, j, 63));   // holdouts
  return t;
}
/** 0..1 lit level of district (i, j) at beat-3 time t3 (flicker just before it dies). */
function districtLit(i, j, t3, gt) {
  const off = districtOff(i, j);
  if (t3 >= off + 0.06) return 0;
  if (t3 >= off) return 1 - (t3 - off) / 0.06;
  const fl = off - t3;
  if (fl < 0.32) return L.noise1(gt * 23 + i * 3.1 + j * 1.7, 64) > -0.15 + fl ? 0.95 : 0.12;
  return 1;
}

/**
 * City state at this moment: { h, day, green, ruin, blackR, t3 } (all pure functions of time).
 * blackR: 0 = all lit, Infinity = all dark, otherwise (finite > 0) the district-by-district blackout is running.
 */
export function cityState(v, gt = v.gt) {
  const sc = v.tl.scenes, t = (b) => gt - sc[b].start;
  const h = elapsedHours(v, gt);
  const t3 = t(3);
  const blackR = gt < sc[3].start + B3.t0 - 0.35 ? 0 : t3 >= B3.end + 0.08 ? Infinity : 1;
  const green = L.ease.inOutCubic(L.prog(t(6), 0.2, 2.6));
  const ruin = L.ease.inOutCubic(L.prog(t(7), 0.4, 2.8));
  // far out (planet, space) it is always night: the crescent carries the sunlight
  const far = L.clamp(L.invLerp(Math.log(300), Math.log(3000), Math.log(v.cam.mpp)));
  return { h, day: daylight(h) * (1 - far), green, ruin, blackR, t3, gt };
}
/** 0..1: is the world point still lit (street lights / windows) at this moment? (Its district's state.) */
export function litAt(v, x, y, st = cityState(v)) {
  if (st.blackR === Infinity) return 0;
  if (st.blackR === 0) return 1;
  // ragged front: every city block (260 x 80 m) dies a little before/after its district, and blocks near a district
  // edge may follow the neighbouring district, so the dark area never reads as square tiles
  const bi = Math.floor(x / GRID.ave), bj = Math.floor(y / GRID.st);
  const jx = (hash(bi, bj, 65) - 0.5) * DIST.w * 0.7, jy = (hash(bi, bj, 66) - 0.5) * DIST.h * 0.7;
  const dt = (hash(bi, bj, 67) - 0.5) * 0.22;
  return districtLit(Math.floor((x + jx) / DIST.w), Math.floor((y + jy) / DIST.h), st.t3 + dt, st.gt ?? v.gt);
}
/** Overall share of the city still lit (for the regional sky-glow). */
function litShare(st) {
  if (st.blackR === 0) return 1;
  if (st.blackR === Infinity) return 0;
  return 1 - L.smoothstep(L.clamp((st.t3 - B3.t0) / (B3.t1 - B3.t0)));
}

// ------------------------------------------------------------------ glow sprite (cached, deterministic)
let SPRITE = null;
function sprite() {
  if (SPRITE) return SPRITE;
  const s = new OffscreenCanvas(64, 64), g = s.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  SPRITE = s;
  return s;
}
const TINTED = new Map();
/** Additive soft glow at screen (x, y), radius r px, colour rgb (cached per colour). Cheap: use for many lights. */
export function glowDot(c, x, y, r, rgb, a = 1) {
  if (r <= 0.3 || a <= 0.003) return;
  const key = rgb.join(',');
  let s = TINTED.get(key);
  if (!s) {
    s = new OffscreenCanvas(64, 64);
    const g = s.getContext('2d');
    g.drawImage(sprite(), 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = L.rgba(rgb); g.fillRect(0, 0, 64, 64);
    TINTED.set(key, s);
  }
  const prevA = c.globalAlpha, prevOp = c.globalCompositeOperation;
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = prevA * Math.min(1, a);
  c.drawImage(s, x - r, y - r, 2 * r, 2 * r);
  c.globalAlpha = prevA;
  c.globalCompositeOperation = prevOp;
}

// deterministic hash for blocks / lots
const hash = (a, b, s = 0) => { const n = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };

// ------------------------------------------------------------------ palette
function palette(st) {
  const d = st.day, g = st.green;
  const water = L.mix([5, 10, 20], [46, 70, 86], d);
  const asphalt = L.mix([17, 19, 26], [70, 72, 74], d);
  const roofA = L.mix([24, 27, 36], [104, 104, 102], d), roofB = L.mix([34, 36, 46], [132, 128, 120], d);
  const forest = L.mix([14, 30, 22], [58, 92, 54], d), forestHi = L.mix([22, 44, 30], [92, 128, 76], d);
  const land = L.mix(L.mix([22, 25, 33], [78, 78, 74], d), forest, g);
  const park = L.mix([12, 24, 18], [56, 84, 52], d);
  return { water, asphalt, roofA, roofB, forest, forestHi, land, park };
}

// ------------------------------------------------------------------ the city
function drawRegion(c, v, st, P) {
  const m = v.cam.mpp;
  c.fillStyle = L.rgba(P.water);
  c.fillRect(0, 0, W, H);
  // moon sheen on the water (soft diagonal band, night only)
  if (st.day < 0.9) {
    const g = c.createLinearGradient(0, 0, W, H);
    const mo = (0.06 + (st.blackR === Infinity ? 0.08 : 0)) * (1 - st.day);   // once the city is dark the moon takes over
    g.addColorStop(0.2, 'rgba(120,150,200,0)'); g.addColorStop(0.45, `rgba(120,150,200,${mo})`); g.addColorStop(0.7, 'rgba(120,150,200,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  c.save();
  landPath(c, v);
  // shallow water along every shore (a wide soft stroke under the land): rivers and bays read as water, not void
  const shelfW = Math.min(46, Math.max(6, v.ws(m < 3 ? 40 : 600)));
  c.lineJoin = 'round';
  c.strokeStyle = L.rgba(L.mix([40, 66, 96], [90, 120, 130], st.day), 0.22);
  c.lineWidth = shelfW; c.stroke();
  c.strokeStyle = L.rgba(L.mix([40, 66, 96], [90, 120, 130], st.day), 0.22);
  c.lineWidth = shelfW * 0.45; c.stroke();
  c.fillStyle = L.rgba(m < 3 ? L.mix(P.asphalt, P.forest, st.green) : P.land);
  c.fill('nonzero');
  // shoreline: a concrete bulkhead / beach edge
  c.strokeStyle = L.rgba(L.mix(L.mix([70, 92, 120], [150, 160, 160], st.day), [120, 140, 110], 0.4 * st.green), 0.5 * L.clamp(1.6 - Math.log10(m) / 2.4));
  c.lineWidth = m < 3 ? Math.max(1.2, v.ws(2.5)) : 1.3;
  c.stroke();
  c.clip('nonzero');
  if (m < 3) {
    drawBlocks(c, v, st, P);
    // the lit street lines already glow under the blocks as we pull out, so the lights never drop out
    const kl = L.clamp(L.invLerp(1.1, 3, m));
    if (kl > 0) drawStreetLines(c, v, st, P, { litOnly: true, kmul: kl });
  } else if (m < 40) drawStreetLines(c, v, st, P);
  drawParks(c, v, st, P);
  if (m > 12) drawWilds(c, v, st, P);
  drawCityGlow(c, v, st);
  c.restore();
  if (m < 4) drawWaterGlints(c, v, st);
}

// region scale: the land is not one flat field. A world-anchored canopy texture (two octaves), the five boroughs as
// an overgrown, greyer patch where the city was, and the shore picked out.
let WILD = null;
function wildTile() {
  if (WILD) return WILD;
  const n = 256, cv = new OffscreenCanvas(n, n), g = cv.getContext('2d');
  const r = L.rng(919);
  for (let i = 0; i < 1400; i++) {
    const x = r() * n, y = r() * n, rr = 3 + r() * 14, a = 0.05 + r() * 0.1, lite = r() > 0.5;
    for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) {
      g.fillStyle = lite ? `rgba(170,210,150,${a})` : `rgba(0,8,4,${a * 1.3})`;
      g.beginPath(); g.arc(x + dx, y + dy, rr, 0, Math.PI * 2); g.fill();
    }
  }
  WILD = cv;
  return cv;
}
function drawWilds(c, v, st, P) {
  const m = v.cam.mpp, k = L.clamp(L.invLerp(12, 34, m));
  if (k <= 0) return;
  const tile = wildTile();
  // two octaves, each anchored to the world (tile = 6 km and 40 km); the finer one fades out as we pull back
  for (const [size, a] of [[6000, 0.4 * (1 - L.clamp(L.invLerp(60, 220, m)))], [40000, 0.3]]) {
    if (a <= 0.01) continue;
    const px = size / m;
    if (px < 24) continue;
    const pat = c.createPattern(tile, 'repeat');
    pat.setTransform(new DOMMatrix([px / 256, 0, 0, px / 256, v.wx(0), v.wy(0)]));
    c.globalAlpha = k * a;
    c.fillStyle = pat; c.fillRect(0, 0, W, H);
  }
  c.globalAlpha = 1;
  // the overgrown city: a greyer, paler patch over the five boroughs (rubble and young woods)
  c.beginPath(); addCity(c, v);
  c.fillStyle = L.rgba(L.mix(P.land, [104, 112, 98], 0.35 + 0.25 * st.ruin), 0.55 * k);
  c.fill('nonzero');
  c.strokeStyle = L.rgba([150, 160, 140], 0.12 * k); c.lineWidth = 1; c.stroke();
}
// moonlit glints on open water at street/block scale (the rivers read as water, never as a missing tile)
function drawWaterGlints(c, v, st) {
  const m = v.cam.mpp, k = 1 - L.clamp(L.invLerp(2, 4, m));
  if (k <= 0) return;
  const R = worldRect(v, 10), sp = Math.max(6, m * 26);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let gx = Math.floor(R.x0 / sp); gx * sp < R.x1; gx++) {
    for (let gy = Math.floor(R.y0 / sp); gy * sp < R.y1; gy++) {
      const h1 = hash(gx, gy, 41), h2 = hash(gx, gy, 42), h3 = hash(gx, gy, 43);
      const x = (gx + h1) * sp, y = (gy + h2) * sp;
      if (onLand(x, y) || onLand(x, y - sp * 0.4) || onLand(x, y + sp * 0.4)) continue;
      const tw = 0.5 + 0.5 * Math.sin(v.gt * (1.3 + h3 * 2) + h3 * 40);
      const a = (0.05 + 0.1 * tw) * k * (0.6 + 0.4 * (1 - st.day));
      const len = v.ws(sp * (0.25 + 0.4 * h3));
      c.fillStyle = L.rgba(L.mix(MOON, LAMP, h3 > 0.75 ? 0.6 : 0), a);
      c.fillRect(v.wx(x) - len / 2, v.wy(y), len, Math.max(1, v.ws(0.5)));
    }
  }
  c.restore();
}

function drawParks(c, v, st, P) {
  const m = v.cam.mpp, R = worldRect(v, 20);
  const base = L.mix(L.mix(P.park, [14, 20, 20], 0.25 * (1 - st.day)), P.forest, st.green);
  for (const r of PARKS) {
    const x0 = v.wx(r.x0), x1 = v.wx(r.x1), y0 = v.wy(r.y0), y1 = v.wy(r.y1);
    if (x1 < 0 || x0 > W || y1 < 0 || y0 > H || x1 - x0 < 0.5) continue;
    const big = r.x1 - r.x0 > 300;
    if (!big) { c.fillStyle = L.rgba(base); c.fillRect(x0, y0, x1 - x0, y1 - y0); continue; }   // the plaza block
    // a feathered tint (no hard border): nested insets build the opacity up toward the middle
    const f = Math.min(v.ws(70), 0.22 * Math.min(x1 - x0, y1 - y0));
    const n = 6;
    c.fillStyle = L.rgba(base, 0.2);
    for (let q = 0; q < n; q++) { const e = (f * q) / (n - 1); c.fillRect(x0 + e, y0 + e, x1 - x0 - 2 * e, y1 - y0 - 2 * e); }
    // tree crowns (deterministic, spacing grows with the zoom so the count stays bounded)
    const sp = Math.max(14, 7 * m);
    const ix0 = Math.max(r.x0, R.x0), ix1 = Math.min(r.x1, R.x1), iy0 = Math.max(r.y0, R.y0), iy1 = Math.min(r.y1, R.y1);
    if (ix1 <= ix0 || iy1 <= iy0 || v.ws(sp) < 2.5) continue;
    const hi = L.mix(base, [70, 96, 70], 0.35 + 0.3 * st.day), lo = L.mix(base, [4, 8, 6], 0.5);
    for (let gx = Math.floor(ix0 / sp); gx * sp < ix1; gx++) {
      for (let gy = Math.floor(iy0 / sp); gy * sp < iy1; gy++) {
        const h1 = hash(gx, gy, 21), h2 = hash(gx, gy, 22);
        const x = (gx + h1) * sp, y = (gy + h2) * sp;
        const edge = Math.min(x - r.x0, r.x1 - x, y - r.y0, r.y1 - y);
        if (edge < 0) continue;
        const a = L.smoothstep(L.clamp(edge / Math.max(40, 6 * sp))) * (0.55 + 0.45 * hash(gx, gy, 23));
        const rr = v.ws(sp * (0.45 + 0.3 * hash(gx, gy, 24)));
        const px = v.wx(x), py = v.wy(y);
        c.fillStyle = L.rgba(lo, 0.5 * a);
        c.beginPath(); c.arc(px - rr * 0.25, py + rr * 0.3, Math.max(0, rr), 0, Math.PI * 2); c.fill();
        c.fillStyle = L.rgba(hi, 0.42 * a);
        c.beginPath(); c.arc(px + rr * 0.15, py - rr * 0.2, Math.max(0, rr * 0.7), 0, Math.PI * 2); c.fill();
      }
    }
  }
}

// streets as lines (mid zoom): lit amber outside the blackout disc, faint asphalt inside
function streetLinesPath(c, v, R, axis) {
  const step = axis === 'x' ? GRID.ave : GRID.st;
  const [a0, a1] = axis === 'x' ? [R.x0, R.x1] : [R.y0, R.y1];
  c.beginPath();
  for (let k = Math.ceil(a0 / step); k * step <= a1; k++) {
    const p = k * step;
    if (axis === 'x') { const x = v.wx(p); c.moveTo(x, 0); c.lineTo(x, H); } else { const y = v.wy(p); c.moveTo(0, y); c.lineTo(W, y); }
  }
}
function drawStreetLines(c, v, st, P, { litOnly = false, kmul = 1 } = {}) {
  const m = v.cam.mpp, R = worldRect(v, 4);
  const fade = (1 - L.clamp(L.invLerp(14, 40, m))) * kmul;   // street lines dissolve into the land tone far out
  const stA = L.clamp(L.invLerp(1.6, 4, GRID.st / m));        // streets (80 m apart) thin out before the avenues
  const g = 1 - st.green;
  // dark pass first (everywhere a light may be out), then the lit pass segment by segment (each segment's district)
  const passes = [];
  if (!litOnly && st.blackR !== 0) passes.push(['dark', 1]);
  if (st.blackR !== Infinity) passes.push(['lit', 1]);
  if (!passes.length) return;
  for (const [mode] of passes) {
    c.save();
    const lit = mode === 'lit';
    for (const axis of ['x', 'y']) {
      const wpx = (axis === 'x' ? GRID.aveW : GRID.stW) / m;
      const a = (axis === 'x' ? 1 : stA) * fade;
      if (a <= 0.01) continue;
      streetLinesPath(c, v, R, axis);
      if (lit) {
        // per-segment sodium light with block-to-block variation (no uniform lattice)
        c.globalCompositeOperation = 'lighter';
        const segs = axis === 'x' ? [GRID.ave, GRID.st, R.x0, R.x1, R.y0, R.y1] : [GRID.st, GRID.ave, R.y0, R.y1, R.x0, R.x1];
        const [step, seg, a0, a1, b0, b1] = segs;
        const core = Math.max(0.7, wpx * 0.7), halo = Math.max(2.5, wpx * 2.6);
        for (let k = Math.ceil(a0 / step); k * step <= a1; k++) {
          const p = k * step;
          for (let q = Math.floor(b0 / seg); q * seg < b1; q++) {
            const mx = axis === 'x' ? p : (q + 0.5) * seg, my = axis === 'x' ? (q + 0.5) * seg : p;
            const hv = hash(k * (axis === 'x' ? 3 : 5), q, axis === 'x' ? 7 : 9);
            const dens = L.clamp(1.25 - Math.hypot(mx + 500, (my + 6000) * 0.55) / 16000, 0.25, 1);
            const br = a * (0.35 + 0.65 * hv * hv) * dens * litAt(v, mx, my, st);
            if (br < 0.03) continue;
            if (axis === 'x') {
              const x = v.wx(p), y0 = v.wy(q * seg), y1 = v.wy((q + 1) * seg);
              c.fillStyle = L.rgba(LAMP, 0.07 * br); c.fillRect(x - halo / 2, y0, halo, y1 - y0);
              c.fillStyle = L.rgba(L.mix(LAMP, [255, 228, 185], hv * 0.5), 0.5 * br); c.fillRect(x - core / 2, y0, core, y1 - y0);
            } else {
              const y = v.wy(p), x0 = v.wx(q * seg), x1 = v.wx((q + 1) * seg);
              c.fillStyle = L.rgba(LAMP, 0.06 * br); c.fillRect(x0, y - halo / 2, x1 - x0, halo);
              c.fillStyle = L.rgba(L.mix(LAMP, [255, 228, 185], hv * 0.5), 0.36 * br); c.fillRect(x0, y - core / 2, x1 - x0, core);
            }
          }
        }
        c.globalCompositeOperation = 'source-over';
        if (axis === 'y') blockGlow(c, v, st, R, fade);
      } else {
        c.strokeStyle = L.rgba(L.mix(L.mix(P.asphalt, MOON, 0.42), P.forest, st.green), (0.36 * g + 0.12) * a);
        c.lineWidth = Math.max(0.7, wpx * 0.9); c.stroke();
      }
    }
    c.restore();
  }
}

// lit windows at mid zoom: every block glows a little differently (offices, homes, dark lots), per its district
function blockGlow(c, v, st, R, fade) {
  const m = v.cam.mpp, k = fade * L.clamp(L.invLerp(2.2, 4, m)) * (1 - st.day);
  if (k <= 0.02) return;
  const i0 = Math.floor(R.x0 / GRID.ave), i1 = Math.ceil(R.x1 / GRID.ave), j0 = Math.floor(R.y0 / GRID.st), j1 = Math.ceil(R.y1 / GRID.st);
  const hx = GRID.aveW / 2 + 4, hy = GRID.stW / 2 + 3;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = i0; i < i1; i++) {
    for (let j = j0; j < j1; j++) {
      const h = hash(i, j, 71);
      if (h < 0.18) continue;                                   // dark lots
      const cx = (i + 0.5) * GRID.ave, cy = (j + 0.5) * GRID.st;
      if (!onLand(cx, cy) || inPark(cx, cy)) continue;
      const lk = litAt(v, cx, cy, st);
      if (lk <= 0) continue;
      const dens = L.clamp(1.25 - Math.hypot(cx + 500, (cy + 6000) * 0.55) / 16000, 0.25, 1);
      const a = k * lk * dens * (0.04 + 0.16 * h * h);
      c.fillStyle = L.rgba(L.mix(LAMP, [255, 236, 200], hash(i, j, 72)), a);
      c.fillRect(v.wx(i * GRID.ave + hx), v.wy(j * GRID.st + hy), (GRID.ave - 2 * hx) / m, (GRID.st - 2 * hy) / m);
    }
  }
  c.restore();
}

// blocks + lots (close zoom)
function drawBlocks(c, v, st, P) {
  const m = v.cam.mpp, R = worldRect(v, 10);
  const lotK = L.clamp(L.invLerp(1.6, 0.9, m));          // lot detail fades in below ~1.6 m/px
  const lampK = L.clamp(L.invLerp(2.4, 1.3, m));
  const i0 = Math.floor(R.x0 / GRID.ave), i1 = Math.ceil(R.x1 / GRID.ave);
  const j0 = Math.floor(R.y0 / GRID.st), j1 = Math.ceil(R.y1 / GRID.st);
  const hx = GRID.aveW / 2, hy = GRID.stW / 2;
  for (let i = i0; i < i1; i++) {
    for (let j = j0; j < j1; j++) {
      const bx0 = i * GRID.ave + hx, bx1 = (i + 1) * GRID.ave - hx, by0 = j * GRID.st + hy, by1 = (j + 1) * GRID.st - hy;
      const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
      if (inPark(cx, cy)) continue;
      if (!onLand(cx, cy) && !onLand(bx0, by0) && !onLand(bx1, by1)) continue;
      // per-block green / ruin thresholds: forest spreads from the parks and the waterfront first
      const hb = hash(i, j);
      const gk = L.smoothstep(L.clamp((st.green - hb * 0.75) / 0.25));
      const rk = L.smoothstep(L.clamp((st.ruin - hash(i, j, 3) * 0.7) / 0.3));
      const X0 = v.wx(bx0), X1 = v.wx(bx1), Y0 = v.wy(by0), Y1 = v.wy(by1);
      // sidewalk / block base
      c.fillStyle = L.rgba(L.mix(L.mix(P.roofA, [70, 74, 84], 0.25), P.forest, gk));
      c.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      if (lotK <= 0) continue;
      // lots along x (two rows: north + south half of the block)
      const inset = 3;
      for (const [ly0, ly1, row] of [[by0 + inset, cy - 1, 0], [cy + 1, by1 - inset, 1]]) {
        let x = bx0 + inset, n = 0;
        while (x < bx1 - inset - 4 && n < 14) {
          const hl = hash(i * 31 + n, j * 7 + row, 1);
          const w = Math.min(bx1 - inset - x, 14 + hl * 26);
          const tall = hash(i, j * 3 + n, 2) > 0.86 ? 1 : 0;
          const tone = L.mix(P.roofA, P.roofB, hash(i + n, j + row, 4));
          const keep = 1 - rk;
          const lx0 = v.wx(x + 0.8), lx1 = v.wx(x + w - 0.8), lyy0 = v.wy(ly0), lyy1 = v.wy(ly1);
          c.globalAlpha = lotK * keep * (1 - gk * 0.85);
          if (c.globalAlpha > 0.01) {
            if (tall) {   // a tower casts a long soft shadow toward the lower left
              c.fillStyle = 'rgba(0,0,0,0.35)';
              const o = v.ws(9 + 10 * hl);
              c.fillRect(lx0 - o, lyy0 + o * 0.6, lx1 - lx0, lyy1 - lyy0);
            }
            c.fillStyle = L.rgba(tall ? L.mix(tone, [70, 80, 100], 0.25) : tone);
            c.fillRect(lx0, lyy0, lx1 - lx0, lyy1 - lyy0);
            // lit edge (window spill) on the street side
            const lit = litAt(v, x + w / 2, row ? by1 : by0, st) * (1 - st.day);
            if (lit > 0.02) {
              c.fillStyle = L.rgba(LAMP, 0.32 * lit);
              c.fillRect(lx0, row ? lyy1 - Math.max(1, v.ws(1.2)) : lyy0, lx1 - lx0, Math.max(1, v.ws(1.2)));
            }
            // rooftop water tank (NYC) on some lots
            if (hl > 0.72 && m < 0.6) {
              c.fillStyle = L.rgba(L.mix(tone, [120, 96, 70], 0.5));
              c.beginPath(); c.arc(v.wx(x + w * 0.6), v.wy((ly0 + ly1) / 2), Math.max(0, v.ws(2.4)), 0, Math.PI * 2); c.fill();
            }
          }
          x += w; n++;
        }
      }
      c.globalAlpha = 1;
      // forest canopy blobs over green blocks
      if (gk > 0.02 && m < 2) {
        const r = L.rng(Math.floor(hb * 1e6));
        for (let q = 0; q < 6; q++) {
          const tx = L.lerp(bx0, bx1, r()), ty = L.lerp(by0, by1, r()), tr = (5 + r() * 7) * L.ease.outCubic(gk);
          c.fillStyle = L.rgba(q % 2 ? P.forestHi : P.forest, 0.9);
          c.beginPath(); c.arc(v.wx(tx), v.wy(ty), Math.max(0, v.ws(tr)), 0, Math.PI * 2); c.fill();
        }
      }
    }
  }
  // street lamps: soft pools along both sides of every street and avenue (lit only)
  if (lampK > 0 && st.blackR !== Infinity && st.day < 0.95) {
    const spacing = 32;
    for (let i = i0; i <= i1; i++) {
      for (const side of [-1, 1]) {
        const x = i * GRID.ave + side * (GRID.aveW / 2 - 1.5);
        for (let y = Math.ceil(R.y0 / spacing) * spacing; y < R.y1; y += spacing) {
          const lk = litAt(v, x, y, st);
          if (lk > 0 && onLand(x, y)) glowDot(c, v.wx(x), v.wy(y + side * 8), v.ws(16), LAMP, 0.55 * lampK * lk * (1 - st.day));
        }
      }
    }
    for (let j = j0; j <= j1; j++) {
      for (const side of [-1, 1]) {
        const y = j * GRID.st + side * (GRID.stW / 2 - 1);
        for (let x = Math.ceil(R.x0 / spacing) * spacing + 16; x < R.x1; x += spacing) {
          if (Math.abs(((x % GRID.ave) + GRID.ave) % GRID.ave - 0) < 20) continue;
          const lk = litAt(v, x, y, st);
          if (lk > 0 && onLand(x, y)) glowDot(c, v.wx(x), v.wy(y), v.ws(12), LAMP, 0.4 * lampK * lk * (1 - st.day));
        }
      }
    }
  }
  // lane markings on the avenues at street level
  const laneK = L.clamp(L.invLerp(0.45, 0.25, m)) * (1 - st.green);
  if (laneK > 0) {
    c.fillStyle = `rgba(230,225,210,${0.45 * laneK})`;
    for (let i = i0; i <= i1; i++) {
      for (const off of [-7.5, 0, 7.5]) {
        const x = v.wx(i * GRID.ave + off);
        for (let y = Math.ceil(R.y0 / 12) * 12; y < R.y1; y += 12) {
          const yy = ((y % GRID.st) + GRID.st) % GRID.st;
          if (yy < 16 || yy > GRID.st - 16) continue;            // no dashes through the crossings
          c.fillRect(x - Math.max(0.5, v.ws(0.12)), v.wy(y), Math.max(1, v.ws(0.24)), v.ws(3));   // one-way avenue: identical lane dashes
        }
      }
    }
    // zebra crossings
    c.fillStyle = `rgba(230,225,210,${0.35 * laneK})`;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const x = i * GRID.ave, y = j * GRID.st;
        for (let s = -12; s <= 12; s += 1.6) {
          c.fillRect(v.wx(x + s), v.wy(y - GRID.stW / 2 - 4), v.ws(0.8), v.ws(3.2));
          c.fillRect(v.wx(x + s), v.wy(y + GRID.stW / 2 + 0.8), v.ws(0.8), v.ws(3.2));
        }
      }
    }
  }
}

// light pollution while the city is lit: a warm haze over the land (strongest in Manhattan), dying with the districts
function drawCityGlow(c, v, st) {
  if (st.blackR === Infinity) return;
  const m = v.cam.mpp;
  const k = L.clamp(L.invLerp(1.5, 8, m)) * (1 - st.day);
  if (k <= 0) return;
  const share = litShare(st);
  c.save();
  c.globalCompositeOperation = 'lighter';
  if (share > 0) {
    for (const [x, y, r, a] of [[-500, -5000, 9000, 0.12], [-1200, -12000, 8000, 0.09], [6000, -1000, 14000, 0.06], [-7000, -4000, 12000, 0.05]]) {
      const cx = v.wx(x), cy = v.wy(y), rr = v.ws(r);
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rr));
      g.addColorStop(0, L.rgba(LAMP, a * k * share)); g.addColorStop(1, L.rgba(LAMP, 0));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
  }
  // district glows (the blackout reads district by district)
  if (m < 60) {
    const R = worldRect(v, 60);
    const i0 = Math.floor(R.x0 / DIST.w), i1 = Math.ceil(R.x1 / DIST.w), j0 = Math.floor(R.y0 / DIST.h), j1 = Math.ceil(R.y1 / DIST.h);
    if ((i1 - i0) * (j1 - j0) < 3000) {
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const x = (i + 0.5) * DIST.w, y = (j + 0.5) * DIST.h;
          if (!onLand(x, y)) continue;
          const lk = litAt(v, x, y, st);
          if (lk <= 0) continue;
          const dens = L.clamp(1.25 - Math.hypot(x + 500, (y + 6000) * 0.55) / 16000, 0.25, 1);
          glowDot(c, v.wx(x), v.wy(y), v.ws(900), LAMP, 0.16 * k * lk * dens);
        }
      }
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ the planet (real Earth, engine/runtime/earth.js)
// The same orthographic frame as the region (centre GEO_ORIGIN = Lower Manhattan, roll GEO_TILT), so the coastlines
// of the regional map continue seamlessly into the globe. 15b (f15v2): the real-colour day globe (biomes: deserts, tundra,
// forest; sea ice; no painted coast line), lit from the upper right (SUN_DIR) with a true night side at the lower left,
// city lights OFF (we are gone), and a cached cloud deck (the view orientation never changes, so it is built once).
export const PLANET_LOOK = { style: 'day', lights: false, relief: 1.2, atmosphere: 1 };
export const SUN_SCREEN = [SUN_DIR.x, -SUN_DIR.y, 0.55];   // screen-space light: x right, y up, z toward the viewer

// cloud deck: fbm value noise on the sphere, banded by latitude (ITCZ, storm tracks; clear subtropics), lit by the sun
const hashC = (i, j, k) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vn3(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = x - i, v = y - j, w = z - k;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w), l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hashC(i, j, k), hashC(i + 1, j, k), su), l(hashC(i, j + 1, k), hashC(i + 1, j + 1, k), su), sv),
    l(l(hashC(i, j, k + 1), hashC(i + 1, j, k + 1), su), l(hashC(i, j + 1, k + 1), hashC(i + 1, j + 1, k + 1), su), sv), sw);
}
let CLOUDS = null;
function cloudDeck() {
  if (CLOUDS) return CLOUDS;
  const R0 = 1000, N = 2 * R0 + 4, cv = new OffscreenCanvas(N, N), g = cv.getContext('2d'), img = g.createImageData(N, N), D = img.data;
  const b = basis({ lat0: GEO_ORIGIN.lat, lon0: GEO_ORIGIN.lon, rot: 0, tilt: GEO_TILT });
  const sl = Math.hypot(...SUN_SCREEN), sx = SUN_SCREEN[0] / sl, sy = SUN_SCREEN[1] / sl, sz = SUN_SCREEN[2] / sl;
  for (let py = 0; py < N; py++) {
    const Y = (N / 2 - (py + 0.5)) / R0;
    for (let px = 0; px < N; px++) {
      const X = ((px + 0.5) - N / 2) / R0, rho2 = X * X + Y * Y;
      if (rho2 >= 1) continue;
      const Z = Math.sqrt(1 - rho2);
      const ex = X * b.r[0] + Y * b.u[0] + Z * b.c[0], ey = X * b.r[1] + Y * b.u[1] + Z * b.c[1], ez = X * b.r[2] + Y * b.u[2] + Z * b.c[2];
      const lat = Math.asin(Math.max(-1, Math.min(1, ez))) * 57.2958, al = Math.abs(lat);
      // warp, then stretch east-west (fronts and trade cumulus lie along the latitude lines)
      const wx = ex + 0.35 * (vn3(ex * 3, ey * 3, ez * 3) - 0.5), wy = ey + 0.35 * (vn3(ex * 3 + 9, ey * 3, ez * 3) - 0.5);
      let n = 0, a = 0.5, f = 5.5;
      for (let o = 0; o < 6; o++) { n += a * vn3(wx * f, wy * f, ez * f * 1.6); a *= 0.52; f *= 2.1; }
      const band = 0.42 * Math.exp(-(((lat - 4) / 8) ** 2)) + 0.5 * Math.exp(-(((al - 55) / 14) ** 2)) - 0.22 * Math.exp(-(((al - 25) / 7) ** 2));
      let d = (n + band * 0.4 - 0.6) / 0.17;
      d = d < 0 ? 0 : d > 1 ? 1 : d * d * (3 - 2 * d);
      if (d <= 0.01) continue;
      const ndl = X * sx + Y * sy + Z * sz, day = Math.max(0, Math.min(1, (ndl + 0.08) / 0.2)), dayS = day * day * (3 - 2 * day);
      const lit = (0.45 + 0.6 * Math.sqrt(Math.max(0, ndl))) * (0.72 + 0.28 * Math.sqrt(Z));
      const c = 238 * (0.03 + (lit - 0.03) * dayS);
      const o4 = (py * N + px) * 4;
      D[o4] = c; D[o4 + 1] = c * 1.01; D[o4 + 2] = c * 1.04; D[o4 + 3] = 255 * d * 0.8 * (0.6 + 0.4 * Z);
    }
  }
  g.putImageData(img, 0, 0);
  CLOUDS = { cv, R0, N };
  return CLOUDS;
}
/** The view of the planet disc this frame (for project()/geoPath() overlays). */
export const planetView = (v) => ({ cx: v.wx(0), cy: v.wy(0), r: v.ws(R_EARTH), lat0: GEO_ORIGIN.lat, lon0: GEO_ORIGIN.lon, rot: 0, tilt: GEO_TILT });
function drawPlanet(c, v, k) {
  const cx = v.wx(0), cy = v.wy(0), r = v.ws(R_EARTH);
  if (k <= 0) return;
  if (cx + r * 1.1 < -50 || cx - r * 1.1 > W + 50 || cy + r * 1.1 < -50 || cy - r * 1.1 > H + 50) return;
  c.save();
  c.globalAlpha = k;
  if (r < 3) {   // a pale dot at the centre of everything
    glowDot(c, cx, cy, 14, [140, 180, 255], 0.55);
    c.fillStyle = 'rgba(190,215,255,0.95)';
    c.beginPath(); c.arc(cx, cy, Math.max(1.6, r), 0, Math.PI * 2); c.fill();
    c.restore();
    return;
  }
  // a soft blue halo on the sunlit side once the whole disc is in view
  if (r < 2000) glowDot(c, cx + SUN_DIR.x * r * 0.35, cy + SUN_DIR.y * r * 0.35, r * 1.45, [70, 130, 255], 0.12);
  drawEarth(c, { ...PLANET_LOOK, ...planetView(v), sun: SUN_SCREEN });
  // the cloud deck (soft: it fades in once the disc is small enough for the cached raster to stay sharp)
  // while the globe is still close (under the dusk-dark regional map) it is dimmed to the map's exposure, then brightens
  const dim = 0.5 * L.clamp((r - 700) / 2600);
  if (dim > 0) {
    c.fillStyle = `rgba(4,8,14,${dim})`;
    c.beginPath(); c.arc(cx, cy, Math.max(0, r * 1.02), 0, Math.PI * 2); c.fill();
  }
  const ck = L.clamp((2000 - r) / 800);
  if (ck > 0) {
    const CL = cloudDeck(), s2 = r / CL.R0;
    c.globalAlpha = k * ck;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(CL.cv, cx - (CL.N / 2) * s2, cy - (CL.N / 2) * s2, CL.N * s2, CL.N * s2);
  }
  c.restore();
}

// ------------------------------------------------------------------ background / foreground
export function drawBackground(c, v) {
  const m = v.cam.mpp;
  const st = cityState(v);
  const P = palette(st);
  // space
  const g = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#0a0c14'); g.addColorStop(1, '#020206');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const starK = L.clamp(L.invLerp(Math.log(800), Math.log(8000), Math.log(m)));
  if (starK > 0) {
    const lz = Math.log10(m);
    c.save();
    c.translate(0, ((lz * 90) % H + H) % H - H);
    stars(c, v, 0.55 * starK, 140, 31);
    c.translate(0, H);
    stars(c, v, 0.55 * starK, 140, 31);
    c.restore();
    stars(c, v, 0.35 * starK, 90, 47);
  }
  // the planet under the region (it fills the screen until ~2,000 m/px)
  // (fully opaque under the region before the region starts to fade, so the frame is never empty)
  const planetK = L.clamp(L.invLerp(Math.log(100), Math.log(160), Math.log(m)));
  drawPlanet(c, v, planetK);
  // the region crossfades into the planet's surface (continents, cloud decks) in log-scale
  const regionK = 1 - L.ease.inOutCubic(L.clamp(L.invLerp(Math.log(190), Math.log(750), Math.log(m))));
  if (regionK > 0) {
    c.save();
    c.globalAlpha = regionK;
    if (planetK > 0) { c.beginPath(); c.arc(v.wx(0), v.wy(0), Math.max(0, v.ws(R_EARTH)), 0, Math.PI * 2); c.clip(); }
    drawRegion(c, v, st, P);
    c.restore();
  }
}

// a few soft high clouds drifting over the city (parallax: they sit "above" the map and slide faster)
const HAZE = (() => { const r = L.rng(77); return Array.from({ length: 10 }, () => [r() * 2 - 1, r() * 2 - 1, 0.3 + r() * 0.5, r() * 6]); })();
export function drawForeground(c, v) {
  const m = v.cam.mpp;
  const k = L.clamp(L.invLerp(Math.log(1.5), Math.log(4), Math.log(m))) * (1 - L.clamp(L.invLerp(Math.log(60), Math.log(300), Math.log(m))));
  if (k <= 0) return;
  const st = cityState(v);
  const col = L.mix([90, 105, 135], [210, 210, 205], st.day);
  // positions in a screen-sized tile that slides with the camera ×1.4 (parallax), wrapping
  const px = (v.cam.x / m) * 1.4, py = (v.cam.y / m) * 1.4, lz = Math.log(m) * 420;
  for (const [x0, y0, s, ph] of HAZE) {
    const x = ((((x0 * 0.5 + 0.5) * (W + 800) - px - lz * 0.3 + v.gt * 18) % (W + 800)) + (W + 800)) % (W + 800) - 400;
    const y = ((((y0 * 0.5 + 0.5) * (H + 800) - py + lz) % (H + 800)) + (H + 800)) % (H + 800) - 400;
    const rr = s * 520;
    const g = c.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, L.rgba(col, 0.07 * k)); g.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = g;
    c.beginPath(); c.ellipse(x, y, rr * 1.6, rr * 0.6, 0.4 + ph * 0.05, 0, Math.PI * 2); c.fill();
  }
}

// ------------------------------------------------------------------ HUD
/** Light-travel scale label (km below one light-second). */
export function fmtLight(m) {
  const s = m / C, YR = 31557600;
  if (m < 1000) return `${L.fmt(m)} m`;
  if (s < 1) return `${L.fmt(m / 1000)} km`;
  if (s < 90) return `${L.fmt(s, s < 10 ? 1 : 0)} light-seconds`;
  if (s < 5400) return `${L.fmt(s / 60)} light-minutes`;
  if (s < 2 * 86400) return `${L.fmt(s / 3600)} light-hours`;
  if (s < 2 * YR) return `${L.fmt(s / 86400)} light-days`;
  return `${L.fmt(s / YR)} light-years`;
}

export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  const sc = v.tl.scenes;
  // the time-lapse clock: in on beat 1, out early in beat 10
  const ck = L.ease.outCubic(L.prog(v.gt, sc[1].start + 0.1, 0.6)) * (1 - L.ease.inOutCubic(L.prog(v.gt, sc[10].start + 0.2, 0.55)));
  if (ck > 0) {
    const h = elapsedHours(v);
    c.save();
    c.globalAlpha = ck;
    c.shadowColor = 'rgba(2,4,10,0.7)';
    c.shadowBlur = 14;
    c.textAlign = 'right';
    c.font = L.font(64, 700, L.FONT.din);
    c.fillStyle = '#fff';
    c.fillText(fmtElapsed(h), W - 64, 300);
    c.font = L.font(26, 600, L.FONT.body);   // 15b: ≥ 26 px house rule
    c.fillStyle = 'rgba(225,220,210,0.85)';
    L.trackedText(c, 'TIME WITHOUT US', W - 64, 338, 3, 'right');
    // a small accent tick that pulses each time the clock locks on a beat's value
    const b = beatOf(v), e = ELAPSED[b];
    if (e && e.dur) {
      const lock = L.clamp(1 - Math.abs(v.gt - (startOf(v, b) + e.at + e.dur)) / 0.5);
      c.shadowBlur = 0;
      c.fillStyle = L.rgba(ACCENT, 0.5 + 0.5 * lock);
      c.fillRect(W - 64 - 40 - 30 * lock, 354, 40 + 30 * lock, 3);
    }
    c.restore();
  }
  // the scale bar takes over for the reveal (light-travel units)
  // 15b: and fades with everything else behind the closing question card (beat 13: 0.1-0.35 s)
  const sk = L.ease.outCubic(L.prog(v.gt, sc[10].start + 1.0, 0.6)) * (1 - L.ease.inOutCubic(L.prog(v.gt, sc[Math.min(13, sc.length - 1)].start + 0.1, 0.25)));
  scaleBar(c, v, { k: sk, fmt: fmtLight, note: 'SCALE' });
}
export const cues = (tl) => beatCues(tl, { gain: 0.16, pitch: 0.85 });
