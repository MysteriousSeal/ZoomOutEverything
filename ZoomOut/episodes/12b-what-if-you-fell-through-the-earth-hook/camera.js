// Camera for "What If You Fell Through the Earth?" (60 s): one continuous dive, then a pull-back. Owned by the orchestrator.
//
// WORLD: a SIDE CUT-AWAY of the Earth in metres. x horizontal, y = DEPTH below the entry hole (down is positive).
//   The entry hole is at (0, 0) on top of the planet; the Earth's centre is at (0, R_EARTH); the antipode at (0, 2R).
//   The tunnel is the vertical line x = 0, y in [0, 2R]. Layer boundaries are circles around CENTRE (see RADIUS).
//   The faller (the film's focal point) is at (0, fallerDepth(gt)) for the whole film.
//   London / New York sit on the surface circle either side of the top; their chord tunnel is horizontal.
//
// Beats 0 (hook) and 8-12 (globe) are plain makeCamera keys. Beats 1-6 (the dive) FOLLOW the faller: mpp comes from
// the keys, but x/y are computed so the faller sits at a fixed screen point (DIVE_X per beat, DIVE_Y) while the layers
// stream past. Beat 7 blends the follow into the globe key.
import * as L from '../../../engine/runtime/lib.js';
import { makeCamera } from '../../../engine/runtime/kit.js';
import { project } from '../../../engine/runtime/earth.js';

export const R_EARTH = 6.371e6;
export const CENTRE = { x: 0, y: R_EARTH };
/** Boundary radii from the centre (m). Crust 35 km (continental average), mantle to 2,891 km depth, inner core 1,221 km. */
export const RADIUS = { surface: R_EARTH, moho: R_EARTH - 35e3, cmb: 3.48e6, icb: 1.221e6 };
/** Depths below the entry hole (m). */
export const DEPTH = { moho: 35e3, cmb: R_EARTH - RADIUS.cmb, icb: R_EARTH - RADIUS.icb, centre: R_EARTH, antipode: 2 * R_EARTH };
export const G = 9.81;
/**
 * 12b hook version: the cold-open preroll plays first, so the film starts later. Every absolute (global-second) time
 * below and in the scenes was tuned on the original 60 s timeline; OFF shifts them onto this one. It is the constant
 * shift of beats 1-13 (build/timeline.json scenes[i+1].start - the original scenes[i].start = 5.629 s for every beat;
 * beat 0 starts at 5.829 = original 0.2 s, i.e. the film opens 0.2 s into its original hook). Checked in at().
 */
export const OFF = 5.629;
export const ORIG_BEAT1 = 3.867;   // the original beat-1 start (global s)
/** Uniform-density model: top speed at the centre sqrt(gR) ≈ 7.9 km/s; one-way trip pi*sqrt(R/g) ≈ 42.2 min. */
export const V_MAX = Math.sqrt(G * R_EARTH);
export const T_HALF = Math.PI * Math.sqrt(R_EARTH / G);
/** Physical speed (m/s) at a given depth in the uniform-density model (0 at both ends, V_MAX at the centre). */
export const speedAt = (depth) => { const r = Math.abs(R_EARTH - depth) / R_EARTH; return V_MAX * Math.sqrt(Math.max(0, 1 - r * r)); };

/** A point on the surface at angle a (degrees) from the top (positive = right / east). */
export const surfacePoint = (a, r = R_EARTH) => ({ x: r * Math.sin(a * Math.PI / 180), y: R_EARTH - r * Math.cos(a * Math.PI / 180) });
// London-New York great circle ≈ 5,570 km → central angle ≈ 50.1°. New York on the left (west), London on the right.
export const CITY_HALF_ANGLE = 25.05;
export const NEW_YORK = surfacePoint(-CITY_HALF_ANGLE);
export const LONDON = surfacePoint(CITY_HALF_ANGLE);
/**
 * Gravity train between two surface points A and B: position at trip fraction s (0..1).
 * Simple harmonic motion along the chord, so the trip time is the same ~42 min for ANY chord.
 */
export function gravityTrain(A, B, s) {
  const f = 0.5 - 0.5 * Math.cos(Math.PI * L.clamp(s));
  return { x: L.lerp(A.x, B.x, f), y: L.lerp(A.y, B.y, f), f };
}

// ------------------------------------------------------------------ the faller: depth as a pure function of time
// Waypoints (global seconds, depth m), synced to the VO in build/timeline.json. Monotone cubic (Fritsch-Carlson), so the
// fall never stalls or reverses between waypoints. Zero speed at the start and at the antipode.
const R = R_EARTH;
const FALL = [
  [3.95, 0],                 // beat 1 starts: steps into the hole
  [6.0, 20300],              // the drop (see dropDepth) hands over to the spline here
  [9.95, DEPTH.moho],        // Moho on "Then the mantle"
  [14.8, DEPTH.cmb],         // core-mantle boundary on "the outer core"
  [18.55, DEPTH.icb],        // inner core on "The inner core"
  [24.4, R],                 // the centre, inside "you'd pass the center"
  [27.7, R + 1.2e6],
  [31.4, R + 2.6e6],         // "Then gravity flips"
  [35.0, R + 4.9e6],
  [38.0, 2 * R],             // "reach the surface" on the far side (velocity 0)
].map(([t, d]) => [t + OFF, d]);   // onto the hook timeline
export const FALL_BACK = { start: 43.5 + OFF, half: 3.39 };   // "you fall straight back in": antipode → entry hole in 3.39 s (SHM); f12cc: lands (the trip-clock lock) at 52.52 s, ~0.3 s after the spoken "42" (STT 52.22; was 53.13)
export const ARRIVE = FALL[FALL.length - 1][0];
const SLOPES = (() => {
  const n = FALL.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((FALL[i + 1][1] - FALL[i][1]) / (FALL[i + 1][0] - FALL[i][0]));
  for (let i = 1; i < n - 1; i++) {
    const h0 = FALL[i][0] - FALL[i - 1][0], h1 = FALL[i + 1][0] - FALL[i][0];
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (h0 + h1)) / ((2 * h1 + h0) / d[i - 1] + (h1 + 2 * h0) / d[i]);
  }
  return m;   // m[0] = m[n-1] = 0: starts and ends at rest
})();

// The drop (3.95-6.0 s): depth = (px below the lip) x (the beat-1 zoom-out mpp), so the lip rises smoothly (<= ~500 px)
// while the camera pulls back, instead of the walls streaming at 1,000-2,000 px/frame (which read as a hard cut).
// zoom1 mirrors makeCamera's beat-1 travel (hook key 0.0065 -> 55 m/px over 2.2 s from the beat-1 start, 3.867 s).
const B1 = ORIG_BEAT1 + OFF, DROP_END = 6.0 + OFF;
const zoom1 = (gt) => Math.exp(L.lerp(Math.log(0.0065), Math.log(55), L.ease.inOutCubic(L.prog(gt - B1, -0.05, 2.2))));
function dropDepth(gt) {
  const s = gt - FALL[0][0];
  const px = 500 * L.smoothstep(L.clamp(s / 1.05)) - 130 * L.smoothstep(L.clamp((s - 1.05) / 0.95));
  return px * zoom1(gt);
}

/** Depth of the faller (m below the entry hole) at global time gt. 0 before the jump; oscillates after FALL_BACK.start. */
export function fallerDepth(gt) {
  if (gt <= FALL[0][0]) return 0;
  if (gt < DROP_END) {
    const w = L.smoothstep(L.clamp((gt - (5.5 + OFF)) / (DROP_END - (5.5 + OFF))));
    return w > 0 ? L.lerp(dropDepth(gt), splineDepth(gt), w) : dropDepth(gt);
  }
  return splineDepth(gt);
}
function splineDepth(gt) {
  if (gt >= FALL_BACK.start) {
    // simple harmonic motion: antipode → hole in FALL_BACK.half seconds, and back again, forever
    return R + R * Math.cos(Math.PI * (gt - FALL_BACK.start) / FALL_BACK.half);
  }
  if (gt >= ARRIVE) return 2 * R;
  let i = 0;
  while (gt > FALL[i + 1][0]) i++;
  const [t0, y0] = FALL[i], [t1, y1] = FALL[i + 1];
  const h = t1 - t0, s = (gt - t0) / h;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
  return h00 * y0 + h10 * h * SLOPES[i] + h01 * y1 + h11 * h * SLOPES[i + 1];
}
/** Physical speed (m/s) to show for the faller at gt (from its position, uniform-density model). */
export const fallerSpeed = (gt) => (gt <= FALL[0][0] ? 0 : speedAt(fallerDepth(gt)));
/** Fraction of the one-way trip (0..1) in physical time, from the faller's depth (useful for a 0 → 42 min clock). */
export const tripFraction = (depth) => Math.acos(L.clamp(1 - depth / R, -1, 1)) / Math.PI;

// ------------------------------------------------------------------ keys
// Dive framing: faller at screen (DIVE_X[b], DIVE_Y). DIVE_X moves the tunnel left early (labels sit to its right),
// then centres it for the core beats. x/y of keys 1-6 are only used by makeCamera's lift maths.
export const DIVE_Y = 620;
const HOOK_Y = 1052;                         // where the person's feet are in the hook (ground line)
export const DIVE_X = [540, 330, 330, 400, 540, 540, 540];
// globe: Earth Ø 850 px, top at ~322, antipode at ~1171 (above the captions)
export const GLOBE = { x: 0, y: R + 3.2e6, mpp: 15000 };
// London-New York close-up: the chord high in the frame (y ≈ 570 px), the Atlantic arc spanning x ≈ 140-940
// (real Earth: the globe turns to the North Atlantic, see geoView; New York left, London right, chord at y ≈ 660 px)
export const CHORD_VIEW = { x: 0, y: R_EARTH, mpp: 7400 };

// ------------------------------------------------------------------ the real Earth (globe beats 7-12)
// The globe is drawn with engine/runtime/earth.js in WORLD units: centre (0, R_EARTH), radius R_EARTH, so the camera,
// zoom and motion blur apply. Beats 7-10: the Americas face us (the right half is cut away to show the layers);
// beat 11: the cut closes over the whole face; beat 12: the globe turns to the North Atlantic.
const GEO_A = { lon0: -40, lat0: 12, tilt: 0 };
const GEO_B = { lon0: -34, lat0: 30, tilt: 11 };
export const T_GEO_TURN = [54.05 + OFF, 2.0];   // beat 12: turn to the Atlantic while the camera pushes in
/** Orientation of the real Earth at gt: {lon0, lat0, rot, tilt} (a slow real spin, 0.4°/s, for life). */
export function geoView(gt) {
  const e = L.ease.inOutCubic(L.prog(gt, T_GEO_TURN[0], T_GEO_TURN[1]));
  return { lon0: L.lerp(GEO_A.lon0, GEO_B.lon0, e), lat0: L.lerp(GEO_A.lat0, GEO_B.lat0, e), tilt: L.lerp(GEO_A.tilt, GEO_B.tilt, e), rot: 0.4 * (gt - OFF - 44) };
}
/** World position (m; y = depth below the hole) of a real place on the globe face at gt: {x, y, z, visible}. */
export function geoWorld(lat, lon, gt) {
  return project(lat, lon, { cx: 0, cy: R_EARTH, r: R_EARTH, ...geoView(gt) });
}
export const CITY = {
  newYork: [40.71, -74.01], london: [51.51, -0.13], mexico: [19.43, -99.13], cairo: [30.04, 31.24],
  lima: [-12.05, -77.04], lagos: [6.52, 3.38], reykjavik: [64.15, -21.94], nuuk: [64.18, -51.69],
};

const cam = makeCamera([
  { x: 0, y: -(HOOK_Y - 960) * 0.0065, mpp: 0.0065, travel: 0 },   // 0 hook: a person beside the hole
  { x: 0, y: 20e3, mpp: 55, travel: 2.2, push: 0.97 },               // 1 crust (35 km ≈ 640 px)
  { x: 0, y: 2.0e6, mpp: 3200, travel: 1.6, push: 0.97 },            // 2 mantle (2,855 km ≈ 890 px)
  { x: 0, y: 4.2e6, mpp: 3600, travel: 1.0, push: 0.97 },            // 3 outer core
  { x: 0, y: 5.6e6, mpp: 2600, travel: 1.2, push: 0.96 },            // 4 inner core (Ø 940 px)
  { x: 0, y: R, mpp: 1300, travel: 1.6, push: 0.95 },                // 5 through the centre, fastest
  { x: 0, y: R + 1.5e6, mpp: 1700, travel: 1.0, push: 0.97 },        // 6 8x a rifle bullet
  { ...GLOBE, travel: 2.4, push: 0.985 },                            // 7 gravity flips: pull back to the globe
  { ...GLOBE, mpp: 14800, travel: 0.6, push: 0.97 },                 // 8 the far side, 12,742 km
  { ...GLOBE, mpp: 14600, travel: 0.6, push: 0.98 },                 // 9 falls back in
  { ...GLOBE, mpp: 14300, travel: 0.6, push: 0.98 },                 // 10 42 minutes
  { ...GLOBE, mpp: 15000, travel: 1.0, push: 0.985 },                // 11 any two cities
  { ...CHORD_VIEW, travel: 2.0, push: 0.97 },                        // 12 London - New York
], { anchor: 0.5, hookFrom: 0.9, drift: 3 });
export const KEYS = cam.KEYS;

const beatOf = (gt, tl) => { let b = 0; tl.scenes.forEach((s, i) => { if (s.start <= gt) b = i; }); return Math.min(b, KEYS.length - 1); };

function diveXY(gt, tl, mpp) {
  const b = beatOf(gt, tl);
  const t = gt - tl.scenes[b].start;
  const e = L.ease.inOutCubic(L.prog(t, -0.05, KEYS[b].travel));
  const sx = b === 0 ? DIVE_X[0] : L.lerp(DIVE_X[Math.min(b - 1, 6)], DIVE_X[Math.min(b, 6)], e);
  const sy = b === 1 ? L.lerp(HOOK_Y, DIVE_Y, e) : DIVE_Y;
  const depth = fallerDepth(gt);
  return { x: (540 - sx) * mpp, y: depth + (960 - sy) * mpp };
}

/** Camera at global time gt: {x, y, mpp, anchor, scroll}. Pure function of gt. */
let offChecked = false;
export function at(gt, tl) {
  if (!offChecked) {
    offChecked = true;
    if (Math.abs(tl.scenes[1].start - (ORIG_BEAT1 + OFF)) > 0.01) console.warn(`camera.js: OFF ${OFF} does not match the timeline (beat 1 at ${tl.scenes[1].start})`);
  }
  const c = cam.at(gt, tl);
  const b = beatOf(gt, tl);
  const jx = L.noise1(gt * 0.3, 1) * 3 * c.mpp, jy = L.noise1(gt * 0.27, 2) * 3 * c.mpp;
  if (b >= 1 && b <= 6) {
    const f = diveXY(gt, tl, c.mpp);
    c.x = f.x + jx; c.y = f.y + jy;
  } else if (b === 7) {
    // hand the follow over to the globe key while zooming out
    const t = gt - tl.scenes[7].start;
    const w = L.ease.inOutCubic(L.prog(t, 0, KEYS[7].travel));
    const f = diveXY(gt, tl, c.mpp);
    c.x = L.lerp(f.x, GLOBE.x, w) + jx; c.y = L.lerp(f.y, GLOBE.y, w) + jy;
  }
  c.scroll = scrollPx(gt, tl);
  return c;
}

/** Integrated on-screen scroll of the layers past the faller (px), for parallax particles during the dive. */
export function scrollPx(gt, tl) {
  const t0 = FALL[0][0], t1 = Math.min(gt, tl.scenes[8]?.start ?? ARRIVE);
  if (t1 <= t0) return 0;
  const step = 1 / 30;
  let acc = 0, prev = fallerDepth(t0);
  for (let t = t0 + step; t <= t1 + 1e-9; t += step) {
    const d = fallerDepth(t);
    acc += L.clamp((d - prev) / cam.at(t, tl).mpp, -300, 300);
    prev = d;
  }
  return acc;
}
