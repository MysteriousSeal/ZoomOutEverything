// Camera for "The Loneliest Place on Earth" (Zoom Out 33, True Scale, ≈ 56.7 s).
//
// ONE CONTINUOUS CAMERA AROUND ONE REAL EARTH (earth.js, true coastlines). Every shot is a GLOBE VIEW
// g = {cx, cy, r, lon0, lat0, tilt}: disc centre on screen (px), radius (px), lat/lon at the disc centre, clockwise roll.
// The engine's world camera is derived from it (world = metres, Earth's centre at the origin, mpp = R_EARTH / r).
// All times come from build/timeline.json (beat starts, phrases, REAL word starts), never hard-coded seconds.
//
// SHOTS
//   hook     beat 0 → beat 1 + 2.7 s   one continuous log pull-up from r 30,000 px (≈ 220 km of ocean on screen) to the
//                                        whole South Pacific (r 540), Point Nemo held near the frame centre
//   islands  beat 2 − 0.2 s             Nemo + Ducie + Motu Nui + Maher Island all on screen (r 880)
//   orbit    beat 3                     pull out (r 400): the ISS orbit around the globe, the station passes over Nemo
//   limb     phrase 3.0 end (2.2 s)       side-on: the great circle Nemo → Ducie lies ON the limb (Nemo at the top), so the
//                                        400 km altitude and the 2,700 km arc are both true to scale in the screen plane
//   gyre     beat 4 − 0.2 s             back down over the South Pacific gyre (r 620)
//   cemetery beat 5 − 0.1 s             the spacecraft cemetery around Nemo (r 900)
//   dive     phrase 5.1 − 0.55 s        plunge into the water at Nemo (r → 60,000; the seabed scene covers it)
//   rise     beat 6 − 0.1 s             short climb straight up over Nemo (r 8,000 → 1,000), then 'riseb' pans to r 640
//   question beat 7                     globe low under the question card
import * as L from '../../../engine/runtime/lib.js';
import { project } from '../../../engine/runtime/earth.js';

export const R_EARTH = 6.371e6;
export const ANCHOR = 0.47;
const AY = L.H * ANCHOR;

// ------------------------------------------------------------------ places (script.md FACT-CHECK)
export const NEMO = { lat: -48.877, lon: -123.393 };
export const DUCIE = { lat: -24.67, lon: -124.78 };
export const MOTU = { lat: -27.2, lon: -109.45 };
export const MAHER = { lat: -72.97, lon: -126.37 };

// ------------------------------------------------------------------ timing helpers
export const B = (i, dt = 0) => (tl) => tl.scenes[i].start + dt;
export const PH = (i, j, edge = 'start', dt = 0) => (tl) => {
  const ln = tl.lines[i], ph = ln.phrases ?? [ln];
  return ph[Math.min(j, ph.length - 1)][edge] + dt;
};
/** real start of word k of phrase j of line i (voice alignment) */
export const WD = (i, j, k, dt = 0) => (tl) => {
  const ln = tl.lines[i], ph = (ln.phrases ?? [ln])[j];
  return (ph.words?.[k]?.[0] ?? ph.start) + dt;
};

// ------------------------------------------------------------------ limb view (computed once, pure maths)
const DEG = Math.PI / 180;
const vec = (la, lo) => [Math.cos(la * DEG) * Math.cos(lo * DEG), Math.cos(la * DEG) * Math.sin(lo * DEG), Math.sin(la * DEG)];
const LIMB = (() => {
  const a = vec(NEMO.lat, NEMO.lon), b = vec(DUCIE.lat, DUCIE.lon);
  let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const l = Math.hypot(...n); n = n.map((x) => x / l);
  let best = null;
  for (const s of [1, -1]) {
    const lat0 = Math.asin(s * n[2]) / DEG, lon0 = Math.atan2(s * n[1], s * n[0]) / DEG;
    const v0 = { cx: 0, cy: 0, r: 1, lon0, lat0, tilt: 0 };
    const p = project(NEMO.lat, NEMO.lon, v0);
    // clockwise roll that puts Nemo straight up (screen y up = −y)
    const angNow = Math.atan2(p.x, -p.y) / DEG;           // 0 = straight up, + = to the right
    const tilt = -angNow;
    const v1 = { ...v0, tilt };
    const d = project(DUCIE.lat, DUCIE.lon, v1);
    const tw = ((tilt + 540) % 360) - 180;
    if (!best || Math.abs(tw) < Math.abs(best.tilt)) best = { lat0, lon0, tilt: tw, side: Math.sign(d.x) };
  }
  return best;
})();
export const LIMB_R = 1250;
export const LIMB_SIDE = LIMB.side;              // +1: Ducie lies to the right of Nemo along the limb
export const LIMB_NEMO = { x: LIMB.side > 0 ? 380 : 700, y: 900 };   // where Nemo sits on screen in the limb shot
// keep the tilt unwrapped near the orbit shot's 0
const limbTilt = ((LIMB.tilt + 540) % 360) - 180;

// ------------------------------------------------------------------ shots
export const SHOTS = [
  { name: 'hook', at: B(0), travel: 0 },
  { name: 'islands', at: B(2, -0.2), g: { cx: 540, cy: 900, r: 880, lon0: -119, lat0: -43, tilt: 0 }, travel: 1.6, push: 1.03 },
  { name: 'orbit', at: B(3, -0.15), g: { cx: 540, cy: 1010, r: 400, lon0: -128, lat0: -34, tilt: -40 }, travel: 1.7, push: 1.03 },
  // the roll starts in the silence after phrase 0 and takes 2.2 s (no whip)
  { name: 'limb', at: PH(3, 0, 'end', 0), g: { cx: LIMB_NEMO.x, cy: LIMB_NEMO.y + LIMB_R, r: LIMB_R, lon0: LIMB.lon0, lat0: LIMB.lat0, tilt: limbTilt }, travel: 2.2, push: 1.015, anchor: true },
  { name: 'gyre', at: B(4, -0.2), g: { cx: 540, cy: 980, r: 620, lon0: -118, lat0: -30, tilt: 0 }, travel: 1.9, push: 1.03, peak: 0.25, anchor: true },
  { name: 'cemetery', at: B(5, -0.1), g: { cx: 540, cy: 1000, r: 900, lon0: -124, lat0: -40, tilt: 0 }, travel: 1.4, push: 1.04 },
  { name: 'dive', at: PH(5, 1, 'start', -0.55), g: { cx: 540, cy: 1000 + 0.1, r: 60000, lon0: NEMO.lon, lat0: NEMO.lat, tilt: 0 }, travel: 1.0, push: 1 },
  // the rise: a short climb straight up over Nemo (from r 8,000, hidden under the seabed scene at the cut), THEN the pan
  { name: 'rise', at: B(6, -0.1), fromR: 8000, g: { cx: 540, cy: 1050, r: 1000, lon0: NEMO.lon, lat0: NEMO.lat, tilt: 0 }, travel: 1.05, push: 1, ease: 'out' },
  { name: 'riseb', at: B(6, 0.95), g: { cx: 540, cy: 980, r: 760, lon0: -128, lat0: -27, tilt: 0 }, travel: 1.7, push: 1.03 },
  { name: 'question', at: B(7), g: { cx: 540, cy: 1440, r: 560, lon0: -128, lat0: -43, tilt: 0 }, travel: 1.5, push: 1.025, spin: 1.5 },
];
export const KEYS = SHOTS;

// the hook: a continuous log pull-up (fast from frame 1, settling on the South Pacific)
const HOOK = { r0: 30000, r1: 540, lat1: -38, lon1: -128, cy0: 1060, cy1: 1130 };
const hookEnd = (tl) => tl.scenes[1].start + 2.7;
function hookView(gt, tl) {
  const u = L.prog(gt, 0, hookEnd(tl));
  const f = 1 - Math.pow(1 - u, 2.2);   // ease-out: already pulling on frame 1
  const r = Math.exp(L.lerp(Math.log(HOOK.r0), Math.log(HOOK.r1), f));
  // re-centre only once the globe is small enough to read as a planet
  const k = L.smoothstep(L.invLerp(4000, HOOK.r1, r));
  const push = L.lerp(1, 1.03, L.ease.inOutCubic(L.prog(gt, hookEnd(tl), 3)));
  return {
    cx: 540, cy: L.lerp(HOOK.cy0, HOOK.cy1, k), r: r * push,
    lon0: L.lerp(NEMO.lon, HOOK.lon1, k), lat0: L.lerp(NEMO.lat, HOOK.lat1, k), tilt: 0,
  };
}

// ------------------------------------------------------------------ evaluation
function lerpG(a, b, e, le) {
  return {
    cx: L.lerp(a.cx, b.cx, e), cy: L.lerp(a.cy, b.cy, e),
    r: Math.exp(L.lerp(Math.log(a.r), Math.log(b.r), le)),
    lon0: L.lerp(a.lon0, b.lon0, e), lat0: L.lerp(a.lat0, b.lat0, e), tilt: L.lerp(a.tilt ?? 0, b.tilt ?? 0, e),
  };
}
function evalShot(s, gt, tl) {
  if (s.name === 'hook') return hookView(gt, tl);
  const t = gt - s.start, d = s.end - s.start;
  const k = L.prog(t, 0, s.travel);
  const e = s.ease === 'out' ? L.ease.outCubic(k) : L.ease.inOutCubic(k);   // 'out': fast start (hidden under a cross-fade)
  let dl = s.g.lon0 - s.from.lon0; dl = ((dl + 540) % 360) - 180;
  const tgt = { ...s.g, lon0: s.from.lon0 + dl + (s.spin ?? 0) * Math.max(0, t - s.travel) };
  // big zooms: tie the pan to the zoom so the target stays put while the radius changes by orders of magnitude
  const big = Math.abs(Math.log(tgt.r / s.from.r)) > 2.5;
  let g = lerpG(s.from, tgt, e, e);
  if (big) {   // pan fraction linear in metres-per-pixel: the target point's screen offset shrinks/grows smoothly
    const ep = L.clamp((1 / g.r - 1 / s.from.r) / (1 / tgt.r - 1 / s.from.r));
    g = { ...lerpG(s.from, tgt, ep, e) };
  }
  // anchored roll: Point Nemo travels a straight line on screen from where it was to where it lands while the globe
  // rolls around it (no whip: Nemo and the station above it never swing out of the frame)
  if (s.anchor && k > 0 && k < 1) {
    const a0 = project(NEMO.lat, NEMO.lon, s.from), a1 = project(NEMO.lat, NEMO.lon, tgt), now = project(NEMO.lat, NEMO.lon, g);
    g = { ...g, cx: g.cx + L.lerp(a0.x, a1.x, e) - now.x, cy: g.cy + L.lerp(a0.y, a1.y, e) - now.y };
  }
  if (s.peak) g.r *= 1 - s.peak * Math.sin(Math.PI * e);
  g.r *= L.lerp(1, s.push ?? 1.03, L.ease.inOutCubic(L.prog(t, s.travel, Math.max(0.01, d - s.travel))));
  return g;
}
let cacheTl = null, cache = null;
function prepared(tl) {
  if (cacheTl === tl) return cache;
  const starts = SHOTS.map((s) => s.at(tl));
  // the hook runs until its own end (into beat 1); the next shot starts after it
  const out = [];
  SHOTS.forEach((src, i) => {
    const s = { ...src, start: starts[i], end: i + 1 < SHOTS.length ? starts[i + 1] : tl.total, from: null };
    if (i > 0) s.from = evalShot(out[i - 1], s.start, tl);
    if (src.fromR) s.from = { ...s.from, r: src.fromR };
    out.push(s);
  });
  cacheTl = tl; cache = out;
  return out;
}
function shotIndex(sh, gt) { let i = 0; sh.forEach((s, j) => { if (s.start <= gt) i = j; }); return i; }

/** The globe view at film time gt (drift included). Pass straight to earth.js. */
export function globeAt(gt, tl) {
  const sh = prepared(tl);
  const g = evalShot(sh[shotIndex(sh, gt)], gt, tl);
  return {
    cx: g.cx + L.noise1(gt * 0.3, 1) * 3, cy: g.cy + L.noise1(gt * 0.27, 2) * 3,
    r: g.r, lon0: g.lon0, lat0: g.lat0, tilt: g.tilt, rot: 0,
  };
}
export function at(gt, tl) {
  const g = globeAt(gt, tl);
  const mpp = R_EARTH / g.r;
  return { x: -(g.cx - L.W / 2) * mpp, y: -(g.cy - AY) * mpp, mpp, anchor: ANCHOR };
}
export function shotAt(gt, tl) {
  const sh = prepared(tl), i = shotIndex(sh, gt), s = sh[i];
  return { index: i, name: s.name, start: s.start, end: s.end, p: s.from ? L.ease.inOutCubic(L.prog(gt - s.start, 0, s.travel)) : 1 };
}
export const shotStart = (name, tl) => prepared(tl).find((s) => s.name === name).start;
