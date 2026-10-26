// Camera for "The Monster in the Pacific" (Zoom Out 26, news, 36.49 s). Owned by the setup agent, then the orchestrator.
// Builders: read, don't edit (put needs in "sharedRequests").
//
// ONE CONTINUOUS CAMERA AROUND ONE REAL EARTH (earth.js, true coastlines). The camera IS the globe framing: every shot
// is a GLOBE VIEW g = {cx, cy, r, lon0, lat0, tilt}: the disc centre on screen (px), its radius (px), the lat/lon at
// the disc centre (deg) and a clockwise screen roll. Place things with env.js `geo(v, lat, lon)` (= earth.js project
// with the current view), never with fixed screen coordinates for things that sit ON the planet.
//
// The engine's world camera is derived from it so v.wx / v.wy / v.ws stay consistent: world = metres, the Earth's
// centre at the world origin, R_EARTH = 6,371 km, mpp = R_EARTH / r. So v.wx(0), v.wy(0) = the disc centre and
// v.ws(R_EARTH) = r (v.ws(m) converts metres on the ground at the disc centre to px).
//
// SHOTS (start = voice timeline; each travel starts from wherever the previous shot is at that instant). Times are for
// the 63.59 s timeline of 26 Oct 10:58 (they follow the timeline automatically if it changes):
//   name      beat  start            disc centre       r      lon0   lat0   notes
//   hook      0     0.00             (540, 1350)    1240→1300  -140   -18   lit, data-led close-up: the limb at the top
//                                                                          (y ≈ 50–110, behind the HUD), the equator at
//                                                                          y ≈ 950, deep-blue ocean fills y 1100–1920;
//                                                                          headline band 360–680 over the N. Pacific
//   pacific   1     6.23 (2.2 s)     (540, 880)     430→447    -150    -6   the whole Pacific: Australia on the left
//                                                                          limb, the Americas on the right; globe
//                                                                          y ≈ 450–1310, x ≈ 110–970
//   nino34    2     14.51 (1.4 s)    (540, 880)     1000→1040  -145     0   the Niño 3.4 box centred: x ≈ 118–962,
//                                                                          y ≈ 793–967 (±5° = ±87 px)
//   stripe    2     18.82 (1.4 s)    (540, 880)     560→577    -140    -2   phrase "A warm stripe more than ten thousand
//                                                                          kilometres long": 160°E (x ≈ 55) to the
//                                                                          coast of Ecuador (x ≈ 1025) fits the width
//   record    3     23.42 (1.3 s)    (540, 1200)    760→775    -135     0   globe drops low (top y ≈ 440, equator at
//                                                                          y ≈ 1200, tongue ≈ 1080–1330): the chart
//                                                                          card lives in y ≈ 360–1000 over the North Pacific
//   rain-a    4     33.03 (1.7 s)    (540, 870)     400→408     165   -15   pull out over the west/central Pacific:
//                                                                          Australia clearly on the disc (droughts, 36.01)
//   rain-a2   4     36.81 (1.0 s)    (540, 870)     400→404     -95   -10   short turn east for "and the Amazon": the
//                                                                          Amazon pin well inside the disc (x ≈ 740)
//   rain-b    4     38.34 (1.3 s)    (540, 870)     400→408     -20     4   rotate EAST 75° (small pull-out) for the
//                                                                          floods phrase (38.84): Peru/Ecuador, the
//                                                                          southern US and East Africa all visible
//   crops     4     41.87 (1.6 s)    (540, 880)     350→357     -10    10   "Crops can fail, and food prices can climb"
//                                                                          (42.17): ease back + keep turning east
//                                                                          (3°/s): Americas → Atlantic → Africa/Europe
//   y2027     5     45.24 (1.6 s)    (540, 1080)    300→309    -150    -6   starts 0.5 s before beat 5 so the globe is
//                                                                          already below the chart card when it lands; back to the Pacific (turns WEST), small &
//                                                                          low: globe y ≈ 780–1380; chart y ≈ 360–760
//   question  6     57.16 (1.6 s)    (540, 1480)    400→410    -150     4   globe under the card (top y ≈ 1080),
//                                                                          slow eastward spin (2°/s)
// Hold push: r grows by `push` over the hold (2–4 %). Drift: ±3 px of screen noise on the disc centre.
// Exact shot keys: SHOTS below. globeAt(gt, tl) is the truth (env.js `globe(v)` wraps it).
import * as L from '../../../engine/runtime/lib.js';

export const R_EARTH = 6.371e6;
export const ANCHOR = 0.47;
const AY = L.H * ANCHOR;

// ------------------------------------------------------------------ timing helpers (functions of the timeline)
/** beat i start (+dt) */
export const B = (i, dt = 0) => (tl) => tl.scenes[i].start + dt;
/** phrase j of line i, 'start' | 'end' (+dt) */
export const PH = (i, j, edge = 'start', dt = 0) => (tl) => {
  const ln = tl.lines[i], ph = ln.phrases ?? [ln];
  return ph[Math.min(j, ph.length - 1)][edge] + dt;
};

// ------------------------------------------------------------------ shots
// g: globe view at the end of the travel. travel (s) · push (r factor over the hold, default 1.03) · peak (extra
// mid-travel pull-out, fraction of r, e.g. 0.12) · spin (deg/s of lon0 drift while held; + = the globe turns west→east
// under the camera, i.e. the view centre moves EAST).
export const SHOTS = [
  { name: 'hook', beat: 0, at: B(0), g: { cx: 540, cy: 1350, r: 1300, lon0: -140, lat0: -18, tilt: 0 }, travel: 0 },
  { name: 'pacific', beat: 1, at: B(1), g: { cx: 540, cy: 880, r: 430, lon0: -150, lat0: -6, tilt: 0 }, travel: 2.2, push: 1.04 },
  { name: 'nino34', beat: 2, at: B(2, -0.1), g: { cx: 540, cy: 880, r: 1000, lon0: -145, lat0: 0, tilt: 0 }, travel: 1.4, push: 1.04 },
  { name: 'stripe', beat: 2, at: PH(2, 1, 'start', -0.3), g: { cx: 540, cy: 880, r: 560, lon0: -140, lat0: -2, tilt: 0 }, travel: 1.4, push: 1.03 },
  { name: 'record', beat: 3, at: B(3), g: { cx: 540, cy: 1200, r: 760, lon0: -135, lat0: 0, tilt: 0 }, travel: 1.3, push: 1.02 },
  { name: 'rain-a', beat: 4, at: B(4), g: { cx: 540, cy: 870, r: 400, lon0: 165, lat0: -15, tilt: 0 }, travel: 1.7, push: 1.02 },
  { name: 'rain-a2', beat: 4, at: PH(4, 1, 'start', 0.8), g: { cx: 540, cy: 870, r: 400, lon0: -95, lat0: -10, tilt: 0 }, travel: 1.0, peak: 0.08, push: 1.01 },
  { name: 'rain-b', beat: 4, at: PH(4, 2, 'start', -0.5), g: { cx: 540, cy: 870, r: 400, lon0: -20, lat0: 4, tilt: 0 }, travel: 1.3, peak: 0.08, push: 1.02 },
  { name: 'crops', beat: 4, at: PH(4, 3, 'start', -0.3), g: { cx: 540, cy: 880, r: 350, lon0: -10, lat0: 10, tilt: 0 }, travel: 1.6, push: 1.02, spin: 3 },
  { name: 'y2027', beat: 5, at: B(5, -0.5), g: { cx: 540, cy: 1175, r: 290, lon0: -150, lat0: -6, tilt: 0 }, travel: 1.6, peak: 0.1, push: 1.03 },
  { name: 'question', beat: 6, at: B(6), g: { cx: 540, cy: 1400, r: 390, lon0: -150, lat0: 4, tilt: 0 }, travel: 1.6, push: 1.025, spin: 2 },
];
export const KEYS = SHOTS;
const HOOK_FROM = 1240 / 1300;   // the hook pushes in from r 1500 to 1600 over beat 0

// ------------------------------------------------------------------ evaluation
function lerpG(a, b, e, le) {
  return {
    cx: L.lerp(a.cx, b.cx, e), cy: L.lerp(a.cy, b.cy, e),
    r: Math.exp(L.lerp(Math.log(a.r), Math.log(b.r), le)),
    lon0: L.lerp(a.lon0, b.lon0, e), lat0: L.lerp(a.lat0, b.lat0, e), tilt: L.lerp(a.tilt ?? 0, b.tilt ?? 0, e),
  };
}
/** shot s at gt (no drift) */
function evalShot(s, gt) {
  const t = gt - s.start, d = s.end - s.start;
  if (!s.from) return { ...s.g, r: s.g.r * L.lerp(HOOK_FROM, 1, L.ease.inOutCubic(L.prog(t, 0, d))), p: 1 };
  const k = L.prog(t, 0, s.travel);
  const e = L.ease.inOutCubic(k);
  // unwrap the target longitude so the turn takes the short way from where we are
  let dl = s.g.lon0 - s.from.lon0; dl = ((dl + 540) % 360) - 180;
  const tgt = { ...s.g, lon0: s.from.lon0 + dl + (s.spin ?? 0) * Math.max(0, t - s.travel) };
  const g = lerpG(s.from, tgt, e, e);
  if (s.peak) g.r *= 1 - s.peak * Math.sin(Math.PI * e);
  g.r *= L.lerp(1, s.push ?? 1.03, L.ease.inOutCubic(L.prog(t, s.travel, Math.max(0.01, d - s.travel))));
  g.p = e;
  return g;
}
let cacheTl = null, cache = null;
function prepared(tl) {
  if (cacheTl === tl) return cache;
  const starts = SHOTS.map((s) => s.at(tl));
  const out = [];
  SHOTS.forEach((src, i) => {
    const s = { ...src, start: starts[i], end: i + 1 < SHOTS.length ? starts[i + 1] : tl.total, from: null };
    if (i > 0) s.from = evalShot(out[i - 1], s.start);
    out.push(s);
  });
  cacheTl = tl; cache = out;
  return out;
}
function shotIndex(sh, gt) { let i = 0; sh.forEach((s, j) => { if (s.start <= gt) i = j; }); return i; }

/** The globe view at film time gt: {cx, cy, r, lon0, lat0, tilt, rot: 0} (drift included). Pass straight to earth.js. */
export function globeAt(gt, tl) {
  const sh = prepared(tl);
  const g = evalShot(sh[shotIndex(sh, gt)], gt);
  return {
    cx: g.cx + L.noise1(gt * 0.3, 1) * 3, cy: g.cy + L.noise1(gt * 0.27, 2) * 3,
    r: g.r, lon0: g.lon0, lat0: g.lat0, tilt: g.tilt, rot: 0,
  };
}
/** Engine camera: world metres, Earth's centre at the origin, so v.wx(0), v.wy(0) = the disc centre. */
export function at(gt, tl) {
  const g = globeAt(gt, tl);
  const mpp = R_EARTH / g.r;
  return { x: -(g.cx - L.W / 2) * mpp, y: -(g.cy - AY) * mpp, mpp, anchor: ANCHOR };
}
/** The shot playing at gt: {index, name, start, end, p (0→1 eased travel progress)}. */
export function shotAt(gt, tl) {
  const sh = prepared(tl), i = shotIndex(sh, gt), s = sh[i];
  return { index: i, name: s.name, start: s.start, end: s.end, p: s.from ? L.ease.inOutCubic(L.prog(gt - s.start, 0, s.travel)) : 1 };
}
export const shotStart = (name, tl) => prepared(tl).find((s) => s.name === name).start;
