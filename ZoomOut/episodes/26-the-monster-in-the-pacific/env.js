// Environment for "The Monster in the Pacific" (Zoom Out 26). Owned by the setup agent, then the orchestrator.
// Builders: read, don't edit (put needs in "sharedRequests").
//
// WHAT ENV DRAWS (every frame, under all scenes):
//   1. deep-navy space + twinkling stars (screen space)
//   2. the REAL Earth (earth.js 'day': ETOPO1 coastlines, relief, Blue-Marble land, depth-shaded ocean, atmosphere),
//      framed by camera.js (`globe(v)`). The sun is a screen-space light: in the hook it is front-lit from above
//      (bright horizon at the top, the whole close-up lit; the mood comes from grading in s00); during the beat-1 pull-out
//      it swings to nearly frontal (a touch upper-left) and stays there (whole disc lit, the S. American coast too).
//      The earth.js ocean sun glint is painted out for the whole film (glintDamper, under the anomaly field).
//   3. the SEA-SURFACE-TEMPERATURE ANOMALY FIELD (°C vs normal), ray-cast per pixel onto the ocean only (land masked
//      from ETOPO1), at ~0.35–0.5× resolution then smoothed up. Its shape is a real strong El Niño (1997 / 2015 style):
//        • the equatorial warm tongue from ~160°E to the South American coast, strongest in the east (≈ +4.3 °C near
//          90°W), core slightly south of the equator in the east, half-width ≈ 4° in the west → ≈ 9–11° off Peru, with
//          tropical-instability-wave cusps on its northern edge and gentle multi-scale texture;
//        • a coastal band along Ecuador / Peru (Niño 1+2);
//        • the cool "horseshoe" in the west Pacific (−0.5 … −1 °C, NW and SW of the warm pool);
//        • weak global background anomalies (mostly slightly warm: ≈ −0.4 … +0.9 °C).
//      CALIBRATED: at full strength (beat 2 onward) the cos-lat-weighted ocean mean of the Niño 3.4 box (5°N–5°S,
//      170°W–120°W) is exactly +3.3 °C and of the Niño 1+2 box (0–10°S, 90°W–80°W) exactly +3.9 °C (script.md
//      FACT-CHECK: IRI week of 14 Oct 2026 / NOAA CPC). So `anomalyAt()` / `boxMean()` may be quoted on screen.
//      Colour: amber → orange (ACCENT) → red → crimson → magenta-white (> +4.5); cool anomalies in muted blue; |a| <
//      0.25 °C transparent. Thin isotherm contours every 1 °C (≥ +1) make it read as data.
//      Story of the field (fieldState): beat 0 = the real field in the central Pacific (amp 0.9, ±5 % breath, front
//      ≈ 125°W; the leading edge is irregular and tongue-shaped: frontLon(lat, front), equator leading, ≈ 30° soft) ·
//      beat 1 = it spreads east to the coast and strengthens to 1 (phrase 1 + 0.2 s → line end − 0.4 s, ≈ 8.4 → 14.0 s)
//      · beat 2 → end = full (Niño 3.4 = +3.3 °C) · beat 4 → end: the field outside the tropical Pacific fades to
//      ≤ 0.3 opacity (st.mask; anomalyAt() itself is unchanged).
//   4. a faint lat/lon graticule (every 30° / 15°; the equator a little brighter), off in the hook.
// HUD: topBar only ("ZOOM OUT · THE MONSTER IN THE PACIFIC", automatic).
//
// SCREEN RULES (BRIEF): HUD band y < 340 (chapter card at (64, 238)); caption band y 1380–1520 (captionY 1450); nothing
// important at x > 940 below y 1100; bottom y > 1580 clear. Everything on the planet: place with geo(v, lat, lon).
//
// EXPORTS (see each one's comment):
//   colours  ACCENT, COOL, DROUGHT, FLOOD, NAVY, INKW
//   camera   R_EARTH, SHOTS, B, PH, globe(v), geo(v, lat, lon, alt), geoTrace(c, v, pts, close), shotAt, shotStart,
//            phrase(v, j, edge) (beat-relative phrase times of the scene's own line), phraseGt(tl, line, j, edge)
//   data     FACTS (every on-screen number from script.md), NINO34, NINO12 (boxes), boxPts(box), boxPath(c, v, box),
//            IMPACTS (Australia, Amazon, Peru/Ecuador, southern US, East Africa anchors), GLOBAL_T (yearly series)
//   field    anomalyAt(lat, lon, gt, tl), boxMean(box, gt, tl), nino34At(gt, tl), fieldState(gt, tl), glowK(gt, tl)
//   scale    anomColor(a), anomAlpha(a), SCALE (stops), drawLegend(c, opts), fmtC(a)
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, stars, topBar } from '../../../engine/runtime/kit.js';
import { drawEarth, project, unproject, geoPath, basis, elevation, warm } from '../../../engine/runtime/earth.js';
import { R_EARTH, SHOTS, B, PH, globeAt, shotAt, shotStart } from './camera.js';
warm();

export { R_EARTH, SHOTS, B, PH, shotAt, shotStart };
const { W, H } = L;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ colours
export const ACCENT = [255, 120, 40];        // the heat accent (= episode.json accent)
export const COOL = [90, 200, 255];          // rain / floods / cool
export const FLOOD = COOL;
export const DROUGHT = [222, 160, 80];       // dry, dusty amber-brown (drought markers)
export const NAVY = [5, 10, 24];
export const INKW = [240, 244, 250];         // text white

// ------------------------------------------------------------------ facts (script.md FACT-CHECK; on-screen numbers)
export const FACTS = {
  nino34: 3.3,           // °C, IRI traditional Niño-3.4 weekly value centred on 14 Oct 2026 → "+3.3 °C · NIÑO 3.4 · WEEK OF 14 OCT 2026"
  nino12: 3.9,           // °C, NOAA CPC 8 Oct 2026 Niño-1+2 weekly → "+3.9 °C OFF PERU"
  record1516: 2.75,      // °C, the 2015–16 peak ("2015–16 RECORD ≈ 2.75 °C")
  forecast26: 3.6,       // °C, median forecast peak ("2026 FORECAST ≈ 3.6 °C")
  runsPct: 91,           // % ("91% OF MODEL RUNS: STRONGEST EVER"; source says "more than 91%" of 667 runs)
  rec2024: 1.55,         // °C above pre-industrial, 2024 (WMO)
  f2027: 1.76,           // °C, 2027 central estimate (Hausfather), range 1.67–1.85
  f2027lo: 1.67, f2027hi: 1.85,
  chance2027: 95,        // % ("≈ 95% CHANCE OF A NEW RECORD")
};
/** "+3.3 °C" (one decimal, typographic minus). */
export const fmtC = (a, d = 1) => `${a < 0 ? '−' : '+'}${Math.abs(a).toFixed(d)} °C`;

/** Yearly global mean surface temperature, °C above 1850–1900 (approximate WMO-consolidated / HadCRUT5-style values,
 *  for the SHAPE of the s05 line only). Only 2024 = 1.55 is a FACT-CHECK number; do not label any other year. */
export const GLOBAL_T = [
  [1970, 0.29], [1971, 0.2], [1972, 0.3], [1973, 0.42], [1974, 0.2], [1975, 0.26], [1976, 0.17], [1977, 0.43], [1978, 0.32],
  [1979, 0.4], [1980, 0.47], [1981, 0.55], [1982, 0.39], [1983, 0.58], [1984, 0.39], [1985, 0.37], [1986, 0.45], [1987, 0.6],
  [1988, 0.63], [1989, 0.53], [1990, 0.7], [1991, 0.66], [1992, 0.47], [1993, 0.5], [1994, 0.57], [1995, 0.69], [1996, 0.6],
  [1997, 0.77], [1998, 0.95], [1999, 0.72], [2000, 0.72], [2001, 0.86], [2002, 0.92], [2003, 0.92], [2004, 0.87],
  [2005, 0.97], [2006, 0.92], [2007, 0.95], [2008, 0.82], [2009, 0.95], [2010, 1.03], [2011, 0.89], [2012, 0.93],
  [2013, 0.96], [2014, 1.02], [2015, 1.18], [2016, 1.29], [2017, 1.2], [2018, 1.13], [2019, 1.25], [2020, 1.29],
  [2021, 1.11], [2022, 1.16], [2023, 1.45], [2024, 1.55], [2025, 1.44],
];

// ------------------------------------------------------------------ places
/** Niño boxes (deg; west/east as signed longitudes). */
export const NINO34 = { n: 5, s: -5, w: -170, e: -120, name: 'NIÑO 3.4' };
export const NINO12 = { n: 0, s: -10, w: -90, e: -80, name: 'NIÑO 1+2' };
/** Box outline as lat/lon points (edges densified so they follow the globe). Corners: [n,w] [n,e] [s,e] [s,w]. */
export function boxPts(box, step = 2) {
  const pts = [];
  const nx = Math.max(1, Math.ceil((box.e - box.w) / step)), ny = Math.max(1, Math.ceil((box.n - box.s) / step));
  for (let i = 0; i < nx; i++) pts.push([box.n, box.w + (box.e - box.w) * i / nx]);
  for (let i = 0; i < ny; i++) pts.push([box.n - (box.n - box.s) * i / ny, box.e]);
  for (let i = 0; i < nx; i++) pts.push([box.s, box.e - (box.e - box.w) * i / nx]);
  for (let i = 0; i < ny; i++) pts.push([box.s + (box.n - box.s) * i / ny, box.w]);
  return pts;
}
/** Trace a box on the current globe (call c.beginPath() first, then stroke/fill). */
export function boxPath(c, v, box) { geoPath(c, globe(v), boxPts(box), true, 1.0); }

/** El Niño's typical rain shifts (script.md: "can bring" / "typically"). lat/lon = where the marker sits (on land). */
export const IMPACTS = {
  australia: { lat: -24, lon: 146, kind: 'drought', label: 'AUSTRALIA' },            // eastern Australia (Queensland)
  amazon: { lat: -5, lon: -64, kind: 'drought', label: 'AMAZON' },                   // central Amazon basin
  peru: { lat: -4, lon: -79.8, kind: 'flood', label: 'PERU & ECUADOR' },             // Piura / Tumbes / Guayas coast
  usSouth: { lat: 31.5, lon: -92, kind: 'flood', label: 'SOUTHERN US' },              // Gulf-coast states
  eastAfrica: { lat: -1, lon: 38, kind: 'flood', label: 'EAST AFRICA' },             // Kenya (Oct–Dec short rains)
};

// ------------------------------------------------------------------ camera wrappers
/** Current globe view {cx, cy, r, lon0, lat0, tilt, rot} (cached per gt). */
let gCacheT = NaN, gCache = null, gCacheTl = null;
export function globe(v) {
  if (v.gt !== gCacheT || v.tl !== gCacheTl) { gCache = globeAt(v.gt, v.tl); gCacheT = v.gt; gCacheTl = v.tl; }
  return gCache;
}
/** Screen position of (lat, lon) on the current globe: {x, y, z, visible} (z > 0 = facing us; fade with z near the limb).
 *  alt = height above the surface as a fraction of r (e.g. 0.02 for a marker floating just above). */
export const geo = (v, lat, lon, alt = 0) => project(lat, lon, globe(v), alt);
/** Trace a lat/lon polyline / polygon on the current globe (c.beginPath() first). */
export const geoTrace = (c, v, pts, close = true, step = 1.5) => geoPath(c, globe(v), pts, close, step);
/** Phrase j of the scene's own line in BEAT-RELATIVE seconds ('start' | 'end'). v = the scene's view. */
export function phrase(v, j, edge = 'start') {
  const i = v.index ?? v.beat;
  return PH(i, j, edge)(v.tl) - v.tl.scenes[i].start;
}
/** Phrase j of line i in global seconds. */
export const phraseGt = (tl, i, j, edge = 'start') => PH(i, j, edge)(tl);

// ------------------------------------------------------------------ deterministic noise (3D value noise on the sphere)
function hash3(i, j, k, seed) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise3(x, y, z, seed) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = x - i, v = y - j, w = z - k;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash3(i, j, k, seed), hash3(i + 1, j, k, seed), su), l(hash3(i, j + 1, k, seed), hash3(i + 1, j + 1, k, seed), su), sv),
    l(l(hash3(i, j, k + 1, seed), hash3(i + 1, j, k + 1, seed), su), l(hash3(i, j + 1, k + 1, seed), hash3(i + 1, j + 1, k + 1, seed), su), sv), sw);
}
const fbm = (lat, lon, f, seed) => {
  const x = Math.cos(lat * DEG) * Math.cos(lon * DEG), y = Math.cos(lat * DEG) * Math.sin(lon * DEG), z = Math.sin(lat * DEG);
  return 0.55 * vnoise3(x * f, y * f, z * f, seed) + 0.3 * vnoise3(x * f * 2.1, y * f * 2.1, z * f * 2.1, seed + 1)
    + 0.15 * vnoise3(x * f * 4.3, y * f * 4.3, z * f * 4.3, seed + 2);
};
const gauss = (d, s) => Math.exp(-0.5 * (d / s) * (d / s));
const wrap = (d) => ((d + 540) % 360) - 180;
const east = (lon) => (lon < 0 ? lon + 360 : lon);   // 0..360, so the Pacific is continuous

// ------------------------------------------------------------------ the anomaly field (baked on a 0.5° grid)
const F0 = -50, FSTEP = 0.5, NR = 201, NC = 720;      // lat −50…+50, lon −180…179.5
const EQ = new Float32Array(NR * NC), CO = new Float32Array(NR * NC), HS = new Float32Array(NR * NC), GW = new Float32Array(NR * NC);
const EQ_AMP = [[150, 0], [158, 0.1], [166, 0.3], [175, 0.52], [185, 0.7], [195, 0.82], [210, 0.92], [230, 0.98], [250, 1.03],
  [265, 1.1], [275, 1.16], [284, 1.18], [292, 1.1]];
const COAST_LON = [[9, -79.5], [6, -77.4], [3, -77.6], [1, -79.6], [-1, -80.6], [-3, -80.6], [-5, -81.2], [-8, -79.4], [-11, -77.6],
  [-14, -76.3], [-16, -74], [-18, -71], [-22, -70.3], [-28, -71.2]];
const COAST_AMP = [[11, 0.15], [5, 0.6], [1, 0.95], [-4, 1], [-9, 0.9], [-13, 0.6], [-18, 0.3], [-24, 0.1], [-30, 0]];
const ramp1 = (stops, x) => {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) return L.lerp(stops[i - 1][1], stops[i][1], L.invLerp(stops[i - 1][0], stops[i][0], x));
  return stops[stops.length - 1][1];
};
const rampDesc = (stops, x) => ramp1(stops.slice().reverse(), x);   // stops sorted by descending key
(function bake() {
  for (let i = 0; i < NR; i++) {
    const lat = F0 + i * FSTEP;
    for (let j = 0; j < NC; j++) {
      const lon = -180 + j * FSTEP, x = east(lon), o = i * NC + j;
      // equatorial tongue
      let eq = 0;
      if (x > 145 && x < 296) {
        const a = ramp1(EQ_AMP, x);
        const f = L.smoothstep(L.clamp((x - 160) / 120));
        // tropical-instability-wave cusps: weak, irregular (wavelength and amplitude modulated), east-central Pacific only
        // (phase noise varies the local wavelength ≈ ±40 %; the cusps only deform the 2–8°N band, the south edge is smooth)
        const ph = (x - 180) * 2 * Math.PI / 11 + 7 * (fbm(0, lon, 3, 51) - 0.5);
        const tiw = 0.25 * (0.6 + 0.8 * fbm(5, lon, 4, 53)) * Math.sin(ph) * L.smoothstep(L.clamp((x - 200) / 25)) * (1 - L.smoothstep(L.clamp((x - 255) / 15)));
        const band = L.smoothstep(L.clamp((lat - 2) / 2)) * (1 - L.smoothstep(L.clamp((lat - 8) / 2)));
        const c0 = L.lerp(0.6, -2.2, f) + tiw * band;
        const sN = L.lerp(3.6, 6.8, f) + tiw * 0.6 * band, sS = L.lerp(4.2, 10.5, f);
        const d = lat - c0, s = d > 0 ? sN : sS;
        const q = Math.abs(d) / s;
        eq = a * Math.exp(-0.5 * Math.pow(q, 2.0));
        eq *= 0.8 + 0.4 * fbm(lat, lon, 8, 3) * (0.7 + 0.3 * fbm(lat, lon, 20, 5));
        eq *= 1 - 0.25 * L.smoothstep(L.clamp((x - 289) / 7));   // fades into the coastal band
      }
      EQ[o] = eq;
      // coastal band (Ecuador / Peru), measured west from the coastline
      let co = 0;
      if (lat < 12 && lat > -32 && x > 255 && x < 300) {
        const cl = rampDesc(COAST_LON, lat);
        const dOff = cl - lon;             // degrees offshore (west of the coast)
        if (dOff > -3) co = rampDesc(COAST_AMP, lat) * gauss(Math.max(0, dOff), 4.5 + 2 * L.clamp(-lat / 10));
        co *= 0.88 + 0.24 * fbm(lat, lon, 14, 9);
      }
      CO[o] = co;
      // west-Pacific cool horseshoe (scales with El Niño)
      let hs = 0;
      hs -= 0.95 * gauss(lat - 13, 6.5) * gauss(wrap(lon - 142), 16);
      hs -= 0.85 * gauss(lat + 15, 6.5) * gauss(wrap(lon - 168), 17);
      hs -= 0.55 * gauss(lat - 26, 6) * gauss(wrap(lon + 172), 20);
      hs -= 0.45 * gauss(lat + 27, 6) * gauss(wrap(lon + 150), 20);
      hs -= 0.4 * gauss(lat - 2, 4) * gauss(wrap(lon - 130), 9);
      hs *= 0.8 + 0.4 * fbm(lat, lon, 7, 17);
      HS[o] = hs;
      // global background: broad, mostly slightly warm, textured (plus a warm Indian Ocean and N Pacific / N Atlantic)
      let gw = (fbm(lat, lon, 3.2, 31) - 0.42) * 1.6 + (fbm(lat, lon, 11, 41) - 0.5) * 0.5;
      gw += 0.45 * gauss(lat + 5, 14) * gauss(wrap(lon - 75), 22);
      gw += 0.5 * gauss(lat - 40, 7) * gauss(wrap(lon + 150), 22);
      gw += 0.4 * gauss(lat - 35, 9) * gauss(wrap(lon + 40), 25);
      gw *= 1 - 0.7 * eq;                  // don't double up inside the tongue
      GW[o] = gw;
    }
  }
})();
function grid(A, lat, lon) {
  let fi = (lat - F0) / FSTEP; if (fi < 0 || fi > NR - 1.001) return 0;
  let fj = (lon + 180) / FSTEP; fj = ((fj % NC) + NC) % NC;
  const i = fi | 0, u = fi - i, j = fj | 0, w = fj - j, j1 = j + 1 === NC ? 0 : j + 1;
  const a = A[i * NC + j], b = A[i * NC + j1], c = A[(i + 1) * NC + j], d = A[(i + 1) * NC + j1];
  return (a + (b - a) * w) * (1 - u) + (c + (d - c) * w) * u;
}
// The tongue's leading edge: irregular and tongue-shaped (the equator leads, higher latitudes lag), soft over ≈ 30°.
// frontLon(lat, front) = east-longitude where the mask is 0.5.
const FR_N = new Float32Array(201);
for (let i = 0; i < 201; i++) FR_N[i] = 0.6 * fbm(-50 + i * 0.5, -120, 9, 71) + 0.4 * fbm(-50 + i * 0.5, -120, 22, 73);
export function frontLon(lat, front) {
  let fi = (L.clamp(lat, -50, 50) + 50) * 2; const i = Math.min(199, fi | 0), u = fi - i;
  const n = FR_N[i] + (FR_N[i + 1] - FR_N[i]) * u;
  const al = Math.sqrt(lat * lat + 16) - 4;            // |lat|, rounded at the equator (no chevron tip)
  return L.lerp(178, 318, front) + 6 * (2 * n - 1) - 4 * al / 8;
}
const FR_FALL = 30;
const frontMask = (lat, lon, front) => L.smoothstep(L.clamp((frontLon(lat, front) - east(lon)) / FR_FALL + 0.5));
// calibration: solve K1, K2 so that (at amp = gw = front = 1) mean(Niño 3.4) = +3.3 and mean(Niño 1+2) = +3.9
function rawMeans(box) {
  let se = 0, sc = 0, so = 0, sw = 0;
  for (let lat = box.s + 0.25; lat < box.n; lat += 0.5) {
    for (let lon = box.w + 0.25; lon < box.e; lon += 0.5) {
      if (elevation(lat, lon) > 0) continue;
      const wgt = Math.cos(lat * DEG), fm = frontMask(lat, lon, 1);
      se += wgt * fm * grid(EQ, lat, lon); sc += wgt * fm * grid(CO, lat, lon);
      so += wgt * (grid(HS, lat, lon) + grid(GW, lat, lon)); sw += wgt;
    }
  }
  return [se / sw, sc / sw, so / sw];
}
const [e34, c34, o34] = rawMeans(NINO34), [e12, c12, o12] = rawMeans(NINO12);
const det = e34 * c12 - c34 * e12;
const K1 = ((FACTS.nino34 - o34) * c12 - c34 * (FACTS.nino12 - o12)) / det;
const K2 = (e34 * (FACTS.nino12 - o12) - (FACTS.nino34 - o34) * e12) / det;

// ------------------------------------------------------------------ field story (pure functions of time)
/** {amp, front, gw, k, breath}: amp scales the El Niño pattern (1 = calibrated "now"), front 0→1 = how far east the
 *  tongue reaches (1 = to the coast), gw = background weight, k = field opacity. */
export function fieldState(gt, tl) {
  // spreads over "when the trade winds weaken, | a giant pool of warm water spreads east across the ocean"
  const s1 = phraseGt(tl, 1, 1) + 0.2, s2 = tl.lines[1].end - 0.4;
  const g = L.ease.inOutCubic(L.prog(gt, s1, s2 - s1));
  // hook: the real field (amp ≈ 0.9) with a ±5 % breath (crest on frame 1), the breath fading over the pull-out
  const breath = 0.5 + 0.5 * Math.cos(gt * 2 * Math.PI / 1.7);
  const bk = 1 - L.smoothstep(L.prog(gt, tl.scenes[1].start, 1.5));
  const amp = L.lerp(0.9, 1, g) * (1 + 0.05 * (breath - 0.5) * 2 * bk);
  // beats 4+: the field outside the tropical Pacific fades to ≤ 0.3 (no ochre smudges over the Atlantic / Americas)
  const mask = L.ease.inOutCubic(L.prog(gt, tl.scenes[4].start, 1.2));
  return { amp, front: L.lerp(0.4, 1, g), gw: L.lerp(0.6, 1, g), k: 1, breath, mask };
}
/** Sea-surface-temperature anomaly (°C above normal) at (lat, lon) at film time gt. Ocean or not (mask yourself). */
export function anomalyAt(lat, lon, gt, tl) {
  const st = fieldState(gt, tl);
  return combine(grid(EQ, lat, lon), grid(CO, lat, lon), grid(HS, lat, lon), grid(GW, lat, lon), lat, lon, st);
}
function combine(eq, co, hs, gw, lat, lon, st) {
  return st.amp * (frontMask(lat, lon, st.front) * (K1 * eq + K2 * co) + hs) + st.gw * gw;
}
/** cos-lat-weighted ocean mean of the anomaly over a box ({n, s, w, e}) at gt. At full strength: NINO34 → 3.30. */
export function boxMean(box, gt, tl) {
  let s = 0, sw = 0;
  for (let lat = box.s + 0.25; lat < box.n; lat += 0.5) {
    for (let lon = box.w + 0.25; lon < box.e; lon += 0.5) {
      if (elevation(lat, lon) > 0) continue;
      const wgt = Math.cos(lat * DEG);
      s += wgt * anomalyAt(lat, lon, gt, tl); sw += wgt;
    }
  }
  return s / sw;
}
/** Niño 3.4 index at gt (°C). Full strength from beat 2: 3.3. For counters: Math.round(gt * 30) / 30 first. */
const n34Cache = new Map();
export function nino34At(gt, tl) {
  const key = Math.round(gt * 120);
  let v = n34Cache.get(key);
  if (v == null) { v = boxMean(NINO34, key / 120, tl); if (n34Cache.size > 4000) n34Cache.clear(); n34Cache.set(key, v); }
  return v;
}
/** Hook "glow beneath the surface": 0..1 pulse (breath) during beat 0, fading out during beat 1's spread. */
export function glowK(gt, tl) {
  const st = fieldState(gt, tl);
  return (0.55 + 0.45 * st.breath) * (1 - L.smoothstep(L.prog(gt, tl.scenes[1].start, 2.5)));
}

// ------------------------------------------------------------------ colour scale
/** Anomaly colour stops (°C → rgb). */
export const SCALE = [
  [-3, [40, 80, 170]], [-2, [52, 110, 200]], [-1, [86, 150, 218]], [-0.3, [130, 180, 225]], [0, [170, 190, 200]],
  [0.3, [255, 222, 140]], [1, [255, 186, 72]], [2, [255, 124, 40]], [3, [232, 56, 40]], [4, [196, 26, 88]],
  [4.6, [236, 90, 170]], [5.4, [255, 210, 240]], [6, [255, 245, 252]],
];
/** rgb for an anomaly (°C). */
export const anomColor = (a) => L.ramp(SCALE, a);
/** opacity the field uses for an anomaly (°C): 0 under ±0.25, ramps to ≈ 0.8 at +1, 0.92 from +2; cool max 0.6. */
export function anomAlpha(a) {
  if (a >= 0) return a < 0.25 ? 0 : a < 1 ? L.smoothstep((a - 0.25) / 0.75) * 0.8 : Math.min(0.92, 0.8 + (a - 1) * 0.12);
  const b = -a;
  return b < 0.25 ? 0 : Math.min(0.6, L.smoothstep(L.clamp((b - 0.25) / 1)) * 0.6);
}
const LUT_MIN = -3, LUT_STEP = 0.01, LUT_N = 901;
const LUT = new Float32Array(LUT_N * 4);
for (let i = 0; i < LUT_N; i++) {
  const a = LUT_MIN + i * LUT_STEP, c = anomColor(a);
  LUT[i * 4] = c[0]; LUT[i * 4 + 1] = c[1]; LUT[i * 4 + 2] = c[2]; LUT[i * 4 + 3] = anomAlpha(a);
}

/**
 * Colour-scale legend (screen space). opts: {x, y (top of the title), w = 420, k = 1 (0..1 visibility; wipes in),
 * min = 0, max = 4, title = 'SEA SURFACE · °C ABOVE NORMAL', ticks = integer step}. Returns the total height (px).
 * Keep it out of the caption band (y 1380–1520) and the HUD band; ≈ 84 px tall.
 */
export function drawLegend(c, { x, y, w = 420, k = 1, min = 0, max = 4, title = 'SEA SURFACE · °C ABOVE NORMAL', step = 1 } = {}) {
  if (k <= 0) return 0;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.textBaseline = 'alphabetic';
  c.font = L.font(22, 600, L.FONT.body);
  c.fillStyle = L.rgba(INKW, 0.85);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
  L.trackedText(c, title, x, y + 20, 2.5);
  c.shadowBlur = 0;
  const by = y + 34, bh = 14, bw = w * e;
  const gr = c.createLinearGradient(x, 0, x + w, 0);
  for (let i = 0; i <= 24; i++) { const a = min + (max - min) * i / 24; gr.addColorStop(i / 24, L.rgba(anomColor(a))); }
  c.fillStyle = 'rgba(2,6,14,0.55)';
  L.roundRect(c, x - 3, by - 3, bw + 6, bh + 6, 5); c.fill();
  c.fillStyle = gr;
  c.save(); c.beginPath(); c.rect(x, by, bw, bh); c.clip();
  L.roundRect(c, x, by, w, bh, 3); c.fill();
  c.restore();
  c.font = L.font(24, 700, L.FONT.din);
  c.fillStyle = L.rgba(INKW, 0.9);
  c.textAlign = 'center';
  for (let v = min; v <= max + 1e-6; v += step) {
    const tx = x + w * (v - min) / (max - min);
    if (tx > x + bw + 1) break;
    c.fillRect(tx - 1, by + bh, 2, 6);
    const last = v + step > max + 1e-6;
    c.fillText(v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v)}${last && v > 0 ? '+' : ''}`, tx, by + bh + 30);
  }
  c.restore();
  return 84;
}

// ------------------------------------------------------------------ the field raster
const FIELD_MAXPX = 300000;
const FCACHE = new Map();
let fScratch = null;
const qz = (x, s) => Math.round(x / s) * s;
/** 1 inside the tropical Pacific (≈ 120°E – the Americas, |lat| < 30), soft 8° edges; xe = east-longitude 0..360 */
function pacificK(lat, xe) {
  const eLim = lat > 12 ? 262 : lat > 6 ? L.lerp(282, 262, (lat - 6) / 6) : 284;   // Central America / Gulf of Mexico
  const sw = (x) => { x = L.clamp(x); return x * x * (3 - 2 * x); };
  return sw((xe - 112) / 8) * sw((eLim + 4 - xe) / 8) * sw((34 - Math.abs(lat)) / 8);
}
function renderField(g, st, sun) {
  const x0 = Math.max(0, Math.floor(g.cx - g.r)), y0 = Math.max(0, Math.floor(g.cy - g.r));
  const x1 = Math.min(W, Math.ceil(g.cx + g.r)), y1 = Math.min(H, Math.ceil(g.cy + g.r));
  if (x1 <= x0 || y1 <= y0) return null;
  const rw = x1 - x0, rh = y1 - y0;
  const s = Math.min(0.5, Math.sqrt(FIELD_MAXPX / (rw * rh)));
  const RW = Math.max(1, Math.round(rw * s)), RH = Math.max(1, Math.round(rh * s));
  const b = basis(g);
  const [rx, ry, rz] = b.r, [ux, uy, uz] = b.u, [vx, vy, vz] = b.c;
  if (!fScratch || fScratch.width !== RW || fScratch.height !== RH) fScratch = new ImageData(RW, RH);
  const u32 = new Uint32Array(fScratch.data.buffer);
  u32.fill(0);
  const prev = new Float32Array(RW).fill(NaN);
  const [sx, sy, sz] = sun;
  const front = st.front, amp = st.amp, gwk = st.gw, msk = st.mask ?? 0;
  for (let py = 0; py < RH; py++) {
    const Y = (g.cy - (y0 + (py + 0.5) / s)) / g.r;
    if (Y * Y >= 1) { prev.fill(NaN); continue; }
    let left = NaN;
    for (let px = 0; px < RW; px++) {
      const X = (x0 + (px + 0.5) / s - g.cx) / g.r;
      const rho2 = X * X + Y * Y;
      if (rho2 >= 1) { prev[px] = NaN; left = NaN; continue; }
      const Z = Math.sqrt(1 - rho2);
      const ez = X * rz + Y * uz + Z * vz;
      const lat = Math.asin(ez < -1 ? -1 : ez > 1 ? 1 : ez) / DEG;
      if (lat < -49 || lat > 49) { prev[px] = NaN; left = NaN; continue; }
      const ex = X * rx + Y * ux + Z * vx, ey = X * ry + Y * uy + Z * vy;
      const lon = Math.atan2(ey, ex) / DEG;
      // grid lookups (inline bilinear on the four layers)
      const fi = (lat - F0) / FSTEP, i = fi | 0, u = fi - i;
      let fj = (lon + 180) / FSTEP; if (fj >= NC) fj -= NC; if (fj < 0) fj += NC;
      const j = fj | 0, w = fj - j, j1 = j + 1 === NC ? 0 : j + 1;
      const o00 = i * NC + j, o01 = i * NC + j1, o10 = o00 + NC, o11 = o01 + NC;
      const w00 = (1 - u) * (1 - w), w01 = (1 - u) * w, w10 = u * (1 - w), w11 = u * w;
      const eq = EQ[o00] * w00 + EQ[o01] * w01 + EQ[o10] * w10 + EQ[o11] * w11;
      const co = CO[o00] * w00 + CO[o01] * w01 + CO[o10] * w10 + CO[o11] * w11;
      const hs = HS[o00] * w00 + HS[o01] * w01 + HS[o10] * w10 + HS[o11] * w11;
      const gw = GW[o00] * w00 + GW[o01] * w01 + GW[o10] * w10 + GW[o11] * w11;
      const xe = lon < 0 ? lon + 360 : lon;
      let fm = (frontLon(lat, front) - xe) / FR_FALL + 0.5; fm = fm < 0 ? 0 : fm > 1 ? 1 : fm; fm = fm * fm * (3 - 2 * fm);
      const a = amp * (fm * (K1 * eq + K2 * co) + hs) + gwk * gw;
      // contour test needs the neighbours even where this pixel is land / transparent
      const up = prev[px];
      prev[px] = a;
      const lft = left; left = a;
      const el = elevation(lat, lon);
      const water = el < -40 ? 1 : el > 0 ? 0 : -el / 40;
      if (water <= 0) continue;
      let li = Math.round((a - LUT_MIN) / LUT_STEP); li = li < 0 ? 0 : li >= LUT_N ? LUT_N - 1 : li;
      let al = LUT[li * 4 + 3];
      if (al <= 0.003) continue;
      let r = LUT[li * 4], gg = LUT[li * 4 + 1], bb = LUT[li * 4 + 2];
      // isotherms every 1 °C (≥ +1), anti-aliased from the local screen gradient
      if (a > 0.7) {
        const gr = (lft === lft ? Math.abs(a - lft) : 0) + (up === up ? Math.abs(a - up) : 0) + 1e-3;
        const f = Math.abs(a - Math.round(a));
        const ln = L.clamp(1 - f / (gr * 0.9)) * 0.5;
        if (ln > 0) { r += (255 - r) * ln; gg += (244 - gg) * ln; bb += (236 - bb) * ln; al = Math.min(1, al + ln * 0.3); }
      }
      // mostly emissive (it is data), lightly shaded so it sits on the sphere
      const ndl = X * sx + Y * sy + Z * sz;
      const m = (0.72 + 0.28 * L.clamp((ndl + 0.3) / 0.8)) * (0.8 + 0.2 * Math.sqrt(Z));
      al *= water * L.clamp(Z * 5);
      if (msk > 0) al *= 1 - msk * 0.75 * (1 - pacificK(lat, xe));
      const A8 = (al * 255 + 0.5) | 0;
      const R8 = Math.min(255, r * m) | 0, G8 = Math.min(255, gg * m) | 0, B8 = Math.min(255, bb * m) | 0;
      u32[py * RW + px] = (A8 << 24) | (B8 << 16) | (G8 << 8) | R8;
    }
  }
  const cv = new OffscreenCanvas(RW, RH);
  cv.getContext('2d').putImageData(fScratch, 0, 0);
  return { cv, x0, y0, rw, rh, RW, RH };
}
function drawField(c, g, st, sun) {
  if (st.k <= 0) return;
  const key = [qz(g.cx, 0.25), qz(g.cy, 0.25), qz(g.r, 0.25), qz(g.lon0, 0.01), qz(g.lat0, 0.01), qz(g.tilt, 0.01),
    qz(st.amp, 0.002), qz(st.front, 0.002), qz(st.gw, 0.005), qz(st.mask ?? 0, 0.01), sun.map((x) => qz(x, 0.01)).join(',')].join('|');
  let ent = FCACHE.get(key);
  if (ent) { FCACHE.delete(key); FCACHE.set(key, ent); }
  else {
    ent = renderField(g, st, sun);
    FCACHE.set(key, ent);
    while (FCACHE.size > 4) FCACHE.delete(FCACHE.keys().next().value);
  }
  if (!ent) return;
  c.save();
  c.globalAlpha *= st.k;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(ent.cv, 0, 0, ent.RW, ent.RH, ent.x0, ent.y0, ent.rw, ent.rh);
  c.restore();
}

// ------------------------------------------------------------------ light, graticule
const SUN_HOOK = [0.05, 0.55, 0.83];  // front-lit from above: bright horizon at the top, the whole close-up lit
const SUN_MAIN = [-0.13, 0.3, 0.95];   // nearly frontal, a little upper-left: the whole disc lit, the S. American coast too
/** screen-space light vector for earth.js at gt (swings during the beat-1 pull-out) */
export function sunAt(gt, tl) {
  const k = L.ease.inOutCubic(L.prog(gt, tl.scenes[1].start, 2.4));
  const s = SUN_HOOK.map((a, i) => L.lerp(a, SUN_MAIN[i], k));
  const n = Math.hypot(...s);
  return s.map((a) => a / n);
}
/** Graticule strength (0 in the hook, eases in with the pull-out). */
export const gratK = (gt, tl) => L.ease.inOutCubic(L.prog(gt, tl.scenes[1].start + 0.6, 1.6));
function drawGraticule(c, g, k) {
  if (k <= 0 || g.r < 20) return;
  c.save();
  c.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 15) {
    const pts = []; for (let lon = -180; lon < 180; lon += 3) pts.push([lat, lon]);
    c.strokeStyle = lat === 0 ? `rgba(220,235,255,${0.22 * k})` : `rgba(200,220,255,${0.07 * k})`;
    c.beginPath(); geoPathVisible(c, g, pts); c.stroke();
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = []; for (let lat = -75; lat <= 75; lat += 3) pts.push([lat, lon]);
    c.strokeStyle = `rgba(200,220,255,${0.07 * k})`;
    c.beginPath(); geoPathVisible(c, g, pts, false); c.stroke();
  }
  c.restore();
}
/** polyline on the visible hemisphere only (breaks at the limb; no limb-hugging segments) */
function geoPathVisible(c, g, pts, close = true) {
  let pen = false;
  const n = pts.length, last = close ? n + 1 : n;
  for (let i = 0; i < last; i++) {
    const [la, lo] = pts[i % n];
    const p = project(la, lo, g);
    if (p.z > 0.02) { if (pen) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); pen = true; } else pen = false;
  }
}

// ------------------------------------------------------------------ sun-glint damper (whole film)
/** earth.js adds a specular ocean glint at the half-vector point; it reads as a bright blotch on the data. Paint the
 *  open-ocean colour back over it with a soft plateau (σ ≈ 0.08 r; the glint's own σ ≈ 0.067 r), drawn under
 *  the anomaly field. Weighted by the water fraction around the point so it never stains land. */
function glintDamper(c, g, sun) {
  let hx = sun[0], hy = sun[1], hz = sun[2] + 1; const hn = Math.hypot(hx, hy, hz) || 1; hx /= hn; hy /= hn; hz /= hn;
  const sg = 0.08 * g.r, rr = Math.max(0, 3.4 * sg);
  const gx = g.cx + hx * g.r, gy = g.cy - hy * g.r;
  if (rr < 1 || gx + rr < 0 || gx - rr > W || gy + rr < 0 || gy - rr > H) return;
  let ws = 0, ww = 0;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const ll = unproject(gx + i * 0.5 * sg, gy + j * 0.5 * sg, g);
    if (!ll) continue;
    const wgt = Math.exp(-0.125 * (i * i + j * j));
    ww += wgt; if (elevation(ll.lat, ll.lon) < 0) ws += wgt;
  }
  const pk = (ww > 0 ? ws / ww : 0);
  if (pk < 0.005) return;
  const gr = c.createRadialGradient(gx, gy, 0, gx, gy, rr);
  // a plateau, not a plain Gaussian: the glint (≈ exp(-110 θ²)) still adds ~40 % of its peak at 1 σ, so the cover stays
  // solid out to ≈ 1.2 σ and then falls off a little slower than the glint does
  for (let i = 0; i <= 16; i++) { const f = i / 16, d = 3.4 * f; gr.addColorStop(f, `rgba(9,27,63,${pk * Math.min(1, 2.2 * Math.exp(-0.5 * d * d)) * (1 - f ** 4)})`); }
  c.save();
  c.beginPath(); c.arc(g.cx, g.cy, Math.max(0, g.r - 1), 0, Math.PI * 2); c.clip();
  c.fillStyle = gr; c.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
  c.restore();
}

// ------------------------------------------------------------------ layers
const bgCache = { g: null };
export function drawBackground(c, v) {
  if (!bgCache.g) {
    bgCache.g = c.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.8);
    bgCache.g.addColorStop(0, 'rgb(10,20,42)');
    bgCache.g.addColorStop(1, 'rgb(3,6,14)');
  }
  c.fillStyle = bgCache.g;
  c.fillRect(0, 0, W, H);
  stars(c, v, 0.85, 170, 26);
  const g = globe(v);
  const sun = sunAt(v.gt, v.tl);
  drawEarth(c, { ...g, style: 'day', sun, atmosphere: true });
  glintDamper(c, g, sun);
  drawField(c, g, fieldState(v.gt, v.tl), sun);
  drawGraticule(c, g, gratK(v.gt, v.tl));
}

export function drawHud(c, v) {
  topBar(c, v, ACCENT);
}

export const cues = (tl) => beatCues(tl, { gain: 0.16, pitch: 0.9 });
