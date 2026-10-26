// Camera for "What If You Fell Through the Earth?" (12c, ~53 s cut): one continuous dive, then a pull-back. Owned by the orchestrator.
//
// WORLD: a SIDE CUT-AWAY of the Earth in metres. x horizontal, y = DEPTH below the entry hole (down is positive).
//   The entry hole is at (0, 0) on top of the planet; the Earth's centre is at (0, R_EARTH); the antipode at (0, 2R).
//   The tunnel is the vertical line x = 0, y in [0, 2R]. Layer boundaries are circles around CENTRE (see RADIUS).
//   The faller (the film's focal point) is at (0, fallerDepth(gt)) for the whole film.
//   London / New York sit on the surface circle either side of the top; their chord tunnel is horizontal.
//
// Beats 0 (hook) and 7-10 (globe) are plain makeCamera keys. Beats 1-5 (the dive) FOLLOW the faller: mpp comes from
// the keys (plus coreZoom through the inner core), but x/y are computed so the faller sits at a fixed screen point
// (DIVE_X per beat, DIVE_Y) while the layers stream past. Beat 6 blends the follow into the globe key.
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
 * 12c (the ~50 s cut): every time in this file and in the scenes is derived from build/timeline.json (beat starts and
 * phrase times), never hard-coded, so a new voice pass can never leave the choreography out of sync.
 * Main-film beats: 0 hook, 1 crust, 2 mantle, 3 outer core, 4 top speed, 5 bullet, 6 gravity flips, 7 the other side,
 * 8 the 42-minute trip, 9 London - New York, 10 question.
 */
const RAW = await (await fetch(new URL('./build/timeline.json', import.meta.url))).json();
/** The MAIN timeline, exactly as main.js hands it to scenes (the preroll line/scene removed, absolute times kept). */
export const TLM = RAW.preroll ? { ...RAW, scenes: RAW.scenes.slice(1), lines: RAW.lines.slice(1) } : RAW;
/** Beat start (global s). */
export const BS = TLM.scenes.map((s) => s.start);
/** Phrase i of beat b's line: {text, start, end} in global seconds. */
export const PH = (b, i = 0) => { const ln = TLM.lines[b]; return (ln.phrases ?? [ln])[i]; };
/** Estimated global time a word starts (character-proportional inside its phrase; no word timings in the timeline). */
export function wordT(b, i, word) {
  const p = PH(b, i), at = p.text.indexOf(word);
  return p.start + (p.end - p.start) * Math.max(0, at) / p.text.length;
}
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
// Waypoints (global seconds, depth m), all anchored to the VO. Monotone cubic (Fritsch-Carlson) down to the centre:
// the descent speeds up layer by layer (Moho -> CMB ~640 km/s, CMB -> ICB ~790, ICB -> centre ~860 of film depth per
// second). From the centre the ascent is a quarter sine (simple harmonic motion, exactly as physics says: fastest at
// the centre, slowing to zero at the far surface), its start speed matched to the descent's end slope (C1).
const R = R_EARTH;
export const T_JUMP = BS[1] + 0.083;                  // steps into the hole (just after the beat-1 cut)
export const T_MOHO = BS[2] + 0.476;                  // Moho just after "Then the mantle" begins
export const T_CMB = BS[3] + 0.661;                   // core-mantle boundary just after "Next, the outer core"
export const CENTRE_T = wordT(4, 0, 'center') - 0.1;  // the centre, on "cen-" (f12cc: was the phrase end, ~0.5 s late)
export const ICB_IN = T_CMB + 0.663 * (CENTRE_T - T_CMB);   // inner core (no line of its own any more)
export const ARRIVE = PH(7, 1).start + 0.93;          // far surface, on "...reach the surface"
const T_OUT = ARRIVE - CENTRE_T;                      // the quarter-sine ascent
const V_OUT = (R * Math.PI) / (2 * T_OUT);            // film depth rate of a plain quarter sine (m per film second)
// f12cc: the earlier centre makes the core descent quicker than a plain quarter-sine ascent can leave it, so the ascent's
// time is warped (w = 1 - (1 - u)^ASC_K) to leave the centre at the descent's arrival rate: still fastest at the centre,
// slowing monotonically to zero at the far surface (no kink, no slow-down before the centre).
const V_IN = Math.max(V_OUT, 1.03 * RADIUS.icb / (CENTRE_T - ICB_IN));
const ASC_K = V_IN / V_OUT;
const FALL = [
  [T_JUMP, 0],
  [BS[1] + 2.133, 20300],      // the drop (see dropDepth) hands over to the spline here
  [T_MOHO, DEPTH.moho],
  [T_CMB, DEPTH.cmb],
  [ICB_IN, DEPTH.icb],
  [CENTRE_T, R],
];
/** f12cc: 12c has no fall back any more. The faller stays at rest at the far surface from ARRIVE on; the 42-minute beat
 *  replays the one-way trip with a GHOST faller (scenes/s10), hole -> far side, in SHM. FALL_BACK is kept only as the
 *  end-of-line-7 time other scenes key on (s08's inset close). */
const FB_START = PH(7, 1).end - 0.28;   // s08's inset closes FB_START + 0.42..0.77: gone before the trip clock lands
export const FALL_BACK = { start: FB_START, half: 0 };
/** The trip replay (beat 8): starts once the clock has shown "00:00", locks on "...42" (+ ~0.3 s). */
export const TRIP = { t0: BS[8] + 0.55, t1: wordT(8, 0, '42') - 0.1 };
/** Depth of the replay ghost at gt: 0 (the hole) -> 2R (the far side) in simple harmonic motion; linear clock fraction s. */
export const tripS = (gt) => L.clamp((gt - TRIP.t0) / (TRIP.t1 - TRIP.t0));
export const tripDepth = (gt) => R * (1 - Math.cos(Math.PI * tripS(gt)));
/** 0..1: how hidden the RESTING faller marker is (env drawFaller): it hands over to the replay ghost as the replay starts
 *  (gone once s08's inset has closed) and is back, cross-fading with the ghost on the same spot, as the ghost lands. */
export const restHideK = (gt) => L.ease.inOutCubic(L.prog(gt, TRIP.t0 - 0.1, 0.2)) * (1 - L.ease.inOutCubic(L.prog(gt, TRIP.t1 - 0.02, 0.2)));
const SLOPES = (() => {
  const n = FALL.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((FALL[i + 1][1] - FALL[i][1]) / (FALL[i + 1][0] - FALL[i][0]));
  for (let i = 1; i < n - 1; i++) {
    const h0 = FALL[i][0] - FALL[i - 1][0], h1 = FALL[i + 1][0] - FALL[i][0];
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (h0 + h1)) / ((2 * h1 + h0) / d[i - 1] + (h1 + 2 * h0) / d[i]);
  }
  m[n - 1] = V_IN;    // C1 into the (warped) quarter-sine ascent
  // through the core, pin the node slopes so the speed only ever rises toward the centre (Fritsch-Carlson alone dips at
  // the CMB): CMB just under the outer-core secant, ICB between it and the centre speed
  m[n - 3] = d[n - 3] - 25e3;
  m[n - 2] = (d[n - 3] + V_IN) / 2;
  return m;   // m[0] = 0: starts at rest
})();

// The drop (T_JUMP to BS[1] + 2.133): depth = (px below the lip) x (the beat-1 zoom-out mpp), so the lip rises smoothly (<= ~500 px)
// while the camera pulls back, instead of the walls streaming at 1,000-2,000 px/frame (which read as a hard cut).
// zoom1 mirrors makeCamera's beat-1 travel (hook key 0.0065 -> 55 m/px over 2.2 s from the beat-1 start).
const B1 = BS[1], DROP_END = FALL[1][0];
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
    const w = L.smoothstep(L.clamp((gt - (DROP_END - 0.5)) / 0.5));
    return w > 0 ? L.lerp(dropDepth(gt), splineDepth(gt), w) : dropDepth(gt);
  }
  return splineDepth(gt);
}
function splineDepth(gt) {
  if (gt >= ARRIVE) return 2 * R;   // at rest on the far side for the rest of the film (f12cc: no fall back)
  if (gt >= CENTRE_T) return R + R * Math.sin((Math.PI / 2) * (1 - (1 - (gt - CENTRE_T) / T_OUT) ** ASC_K));
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
export const DIVE_X = [540, 330, 330, 400, 540, 540];   // beats 0-5
// globe: Earth Ø 850 px, top at ~322, antipode at ~1171 (above the captions)
export const GLOBE = { x: 0, y: R + 3.2e6, mpp: 15000 };
// London-New York close-up: the chord high in the frame (y ≈ 570 px), the Atlantic arc spanning x ≈ 140-940
// (real Earth: the globe turns to the North Atlantic, see geoView; New York left, London right, chord at y ≈ 660 px)
export const CHORD_VIEW = { x: 0, y: R_EARTH, mpp: 7400 };

// ------------------------------------------------------------------ the real Earth (globe beats 6-9)
// The globe is drawn with engine/runtime/earth.js in WORLD units: centre (0, R_EARTH), radius R_EARTH, so the camera,
// zoom and motion blur apply. Beats 6-8: the Americas face us (the right half is cut away to show the layers);
// beat 9: the cut closes over the whole face while the globe turns to the North Atlantic.
const GEO_A = { lon0: -40, lat0: 12, tilt: 0 };
const GEO_B = { lon0: -34, lat0: 30, tilt: 11 };
export const T_GEO_TURN = [BS[9] + 0.05, 2.0];   // beat 9: turn to the Atlantic while the camera pushes in
/** Orientation of the real Earth at gt: {lon0, lat0, rot, tilt} (a slow real spin, 0.4°/s, for life). */
export function geoView(gt) {
  const e = L.ease.inOutCubic(L.prog(gt, T_GEO_TURN[0], T_GEO_TURN[1]));
  return { lon0: L.lerp(GEO_A.lon0, GEO_B.lon0, e), lat0: L.lerp(GEO_A.lat0, GEO_B.lat0, e), tilt: L.lerp(GEO_A.tilt, GEO_B.tilt, e), rot: 0.4 * (gt - BS[9] + 10.0) };   // same spin phase at London - New York as 12b
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
  { x: 0, y: R, mpp: 1300, travel: 1.6, push: 0.95 },                // 4 through the centre, fastest (mpp: see coreZoom)
  { x: 0, y: R + 1.5e6, mpp: 1700, travel: 1.0, push: 0.97 },        // 5 8x a rifle bullet
  { ...GLOBE, travel: 2.4, push: 0.985 },                            // 6 gravity flips: pull back to the globe
  { ...GLOBE, mpp: 14800, travel: 0.6, push: 0.97 },                 // 7 the far side, 12,742 km
  { ...GLOBE, mpp: 14300, travel: 0.6, push: 0.98 },                 // 8 42 minutes
  { ...CHORD_VIEW, travel: 2.0, push: 0.97 },                        // 9 London - New York (10, the question, holds it)
], { anchor: 0.5, hookFrom: 0.9, drift: 3 });
export const KEYS = cam.KEYS;

const beatOf = (gt, tl) => { let b = 0; tl.scenes.forEach((s, i) => { if (s.start <= gt) b = i; }); return Math.min(b, KEYS.length - 1); };

function diveXY(gt, tl, mpp) {
  const b = beatOf(gt, tl);
  const t = gt - tl.scenes[b].start;
  const e = L.ease.inOutCubic(L.prog(t, -0.05, KEYS[b].travel));
  const sx = b === 0 ? DIVE_X[0] : L.lerp(DIVE_X[Math.min(b - 1, 5)], DIVE_X[Math.min(b, 5)], e);
  const sy = b === 1 ? L.lerp(HOOK_Y, DIVE_Y, e) : DIVE_Y;
  const depth = fallerDepth(gt);
  return { x: (540 - sx) * mpp, y: depth + (960 - sy) * mpp };
}

/** The zoom through the inner core (it no longer has a beat of its own): from the outer-core framing at ICB_IN it
 *  eases in to the beat-4 key (1300 m/px) at the centre, then the beat-4 push takes it to KEYS[4].mpp * push by the
 *  bullet beat, exactly where makeCamera's beat 5 starts. Passing ~2,600 m/px just after ICB_IN reproduces 12b's
 *  cold-open framing (the whole white-hot ball on screen). */
let MPP_ICB = null;
function coreZoom(gt) {
  if (MPP_ICB == null) MPP_ICB = cam.at(ICB_IN, TLM).mpp;
  const e = L.ease.inOutCubic(L.prog(gt, ICB_IN, CENTRE_T - ICB_IN));
  const push = L.lerp(1, KEYS[4].push, L.ease.inOutCubic(L.prog(gt, CENTRE_T, BS[5] - CENTRE_T)));
  return Math.exp(L.lerp(Math.log(MPP_ICB), Math.log(KEYS[4].mpp), e)) * push;
}
function camBase(gt, tl) {
  const c = cam.at(gt, tl);
  if (gt >= ICB_IN && gt < BS[5]) c.mpp = coreZoom(gt);
  return c;
}

/** Camera at global time gt: {x, y, mpp, anchor, scroll}. Pure function of gt. */
export function at(gt, tl) {
  const c = camBase(gt, tl);
  const b = beatOf(gt, tl);
  const jx = L.noise1(gt * 0.3, 1) * 3 * c.mpp, jy = L.noise1(gt * 0.27, 2) * 3 * c.mpp;
  if (b >= 1 && b <= 5) {
    const f = diveXY(gt, tl, c.mpp);
    c.x = f.x + jx; c.y = f.y + jy;
  } else if (b === 6) {
    // hand the follow over to the globe key while zooming out
    const t = gt - tl.scenes[6].start;
    const w = L.ease.inOutCubic(L.prog(t, 0, KEYS[6].travel));
    const f = diveXY(gt, tl, c.mpp);
    c.x = L.lerp(f.x, GLOBE.x, w) + jx; c.y = L.lerp(f.y, GLOBE.y, w) + jy;
  }
  c.scroll = scrollPx(gt, tl);
  return c;
}

/** Integrated on-screen scroll of the layers past the faller (px), for parallax particles during the dive. */
export function scrollPx(gt, tl) {
  const t0 = FALL[0][0], t1 = Math.min(gt, tl.scenes[7]?.start ?? ARRIVE);
  if (t1 <= t0) return 0;
  const step = 1 / 30;
  let acc = 0, prev = fallerDepth(t0);
  for (let t = t0 + step; t <= t1 + 1e-9; t += step) {
    const d = fallerDepth(t);
    acc += L.clamp((d - prev) / camBase(t, tl).mpp, -300, 300);
    prev = d;
  }
  return acc;
}
