// Camera for "How Old Is Everything?" (EP 22): one continuous zoom OUT along a timeline, then back IN along a
// running track. Owned by the orchestrator — builders: read, don't edit.
//
// WORLD UNITS: YEARS. x = −(years ago): the past is to the LEFT, "now" is x = 0, the future is x > 0.
//   mpp = years per pixel. It runs from 0.025 (the hook) to ~2e7 (the whole universe) and back down to ~40 (the hair).
//   Doubles are exact enough everywhere (13.8e9 needs ~34 bits; we never subtract to below ~1e-3 of a pixel).
// y: the timeline RULER is world y = 0, drawn at screen y RULER_Y (the camera anchor). In the timeline beats (0–9) y is
//   just "the ruler row": scenes draw their subjects at fixed PIXEL sizes pinned to tx(v, years) on that row.
// THE TRACK (beats 10–12) lives in the SAME world: 100 m of track = 13.8 billion years, so 1 m = YR_PER_M years
//   (≈ 1.38e8). x stays "years ago" = "distance before the finish line" × YR_PER_M; y is metres across the track × YR_PER_M.
//   The finish line's leading edge is x = 0 ("now"); its 5 cm white paint covers x ∈ [0, +0.05 m]. The 100 m start
//   line is at x = −100 m (= −13.8 Gyr). Lanes: 8 × 1.22 m, lane 1 (inner, infield side) on TOP (y < 0):
//   y ∈ [−4.88 m, +4.88 m]; the ruler (y = 0) becomes the line between lanes 4 and 5. The camera dives into LANE 5
//   (centre y = +0.61 m).
//
// The camera is kit.js makeCamera driven by a "camera timeline": the voice timeline with beat 11 split in two at its
// second phrase ("Our species: the last two millimeters"), so beat 11 has two moves (to the dinosaur marker, then the
// dive to the last 2 mm). x is not keyed directly: every key carries `now` = the screen x of "now" (x = 0), and x is
// solved from it, so "now" stays pinned to the right side through every zoom.
import * as L from '../../../engine/runtime/lib.js';
import { makeCamera } from '../../../engine/runtime/kit.js';

const { W, H } = L;
export const RULER_Y = 1040;                      // screen y of the ruler / world y = 0
export const ANCHOR = RULER_Y / H;

// ------------------------------------------------------------------ the facts (years before 2026)
export const NOW_YEAR = 2026;
export const AGE = {
  life: 80,                 // a long human life
  moon: 57,                 // Apollo 11, July 1969
  cleopatra: 2055,          // died 30 BC (2026 + 30 − 1: there is no year 0)
  pyramid: 4580,            // Great Pyramid of Giza, completed c. 2560 BC
  writing: 5200,            // earliest writing, Sumer c. 3200 BC
  sapiens: 300e3,           // Homo sapiens, Jebel Irhoud
  trex: 66.5e6,             // T. rex lived c. 68–66 Ma; marker at 66.5 Ma
  kpg: 66e6,                // the K–Pg extinction: the last (non-bird) dinosaurs
  stego: 150e6,             // Stegosaurus c. 155–150 Ma
  tree: 385e6,              // earliest trees (Wattieza / Archaeopteris) c. 385–390 Ma
  shark: 450e6,             // earliest sharks (scales) c. 450 Ma
  earth: 4.54e9,            // Earth forms
  universe: 13.8e9,         // the Big Bang (Planck 2018)
};

// ------------------------------------------------------------------ the track (metres ↔ years)
export const TRACK_M = 100;                        // 100 m = the whole age of the universe
export const YR_PER_M = AGE.universe / TRACK_M;    // 1.38e8 years per metre
export const M_PER_YR = 1 / YR_PER_M;              // 7.25e-9 m per year
export const LANE_W = 1.22;                        // m (line included)
export const LANES = 8;
export const LINE_W = 0.05;                        // painted lines (lane lines, finish line, start line), m
export const TRACK_Y0 = -LANES * LANE_W / 2;       // −4.88 m: inner edge of lane 1 (top)
export const TRACK_Y1 = +LANES * LANE_W / 2;       // +4.88 m: outer edge of lane 8 (bottom)
export const laneCentre = (n) => TRACK_Y0 + (n - 0.5) * LANE_W;   // m, lane n = 1..8
export const LANE5 = laneCentre(5);                // +0.61 m
export const BEND = { r: 36.5, straight: 84.39 };  // IAAF 400 m track: inner bend radius, straight length (m)
// track lengths on the 100 m scale (m before the finish): 0.478 · 2.17e-3 · 3.77e-5
export const TRACK_AT = Object.fromEntries(Object.entries(AGE).map(([k, y]) => [k, y * M_PER_YR]));
export const HAIR_M = 70e-6;                       // a human hair, ~0.07 mm (typical 0.05–0.1 mm)

// ------------------------------------------------------------------ camera keys (one per CAMERA beat)
// mpp in years / px · now = screen x of "now" · y in world units · travel s · push = hold push factor
// camera row: 0.16 m below lane 5's centre so the lane 4/5 line clears the HUD band at the 0.5 m view (mpp 1e5)
export const CAM_W = LANE5 + 0.16;
const Y5 = CAM_W * YR_PER_M;
const K = [
  { key: 'hook',      mpp: 0.025,  now: 880, y: 0, travel: 0 },          // 0 "How old is everything?" ~25 years in view
  { key: 'life',      mpp: 0.129,  now: 880, y: 0, travel: 1.2 },        // 1 80 years: x 880 → 260
  { key: 'pyramid',   mpp: 7.39,   now: 880, y: 0, travel: 1.8 },        // 2 pyramid at x ≈ 260
  { key: 'cleopatra', mpp: 7.9,    now: 880, y: 0, travel: 1.0 },        // 3 pyramid ≈ 300, Cleopatra ≈ 620, Moon ≈ 873
  { key: 'sapiens',   mpp: 484,    now: 880, y: 0, travel: 1.8 },        // 4 300 kyr at x ≈ 260
  { key: 'dinos',     mpp: 1.065e5, now: 880, y: 0, travel: 2.0 },       // 5 66 Myr at x ≈ 260
  { key: 'stego',     mpp: 2.2e5,  now: 880, y: 0, travel: 1.3 },        // 6 Stego ≈ 198, T. rex ≈ 578
  { key: 'sharks',    mpp: 6.43e5, now: 890, y: 0, travel: 1.3 },        // 7 shark ≈ 190, tree ≈ 291
  { key: 'earth',     mpp: 7.1e6,  now: 880, y: 0, travel: 1.6 },        // 8 Earth ≈ 240
  { key: 'universe',  mpp: 1.97e7, now: 880, y: 0, travel: 1.5 },        // 9 Big Bang ≈ 180
  { key: 'track',     mpp: 1.77e7, now: 900, y: 0, travel: 1.2, push: 0.975 },   // 10 start line ≈ 120, finish 900
  { key: 'finish',    mpp: 1.0e5,  now: 860, y: Y5, travel: 1.8, push: 0.97 },   // 11a 0.478 m marker ≈ 200, lane 5
  { key: 'twoMm',     mpp: 500,    now: 860, y: Y5, travel: 1.3, push: 0.97 },   // 11b last 2.17 mm ≈ 260
  { key: 'hair',      mpp: 40,     now: 800, y: Y5, travel: 1.6, push: 0.96 },   // 12 hair 0.07 mm ≈ 240 px wide
  { key: 'question',  mpp: 40 * 0.96, now: 800, y: Y5, travel: 0, push: 0.985 }, // 13 holds the hair frame
];
const KEYS = K.map((k) => ({ ...k, x: (W / 2 - k.now) * k.mpp }));
export const CAM_KEYS = KEYS;
export const SPLIT = { beat: 11, phrase: 1, lead: 0.4 };   // beat 11's second move starts 0.4 s before phrase 2

const cam = makeCamera(KEYS, { anchor: ANCHOR, hookFrom: 0.8, drift: 0 });

/** The camera timeline: the voice timeline with beat 11 split at its second phrase. Cached per tl object. */
const camTl = new WeakMap();
export function cameraTimeline(tl) {
  let c = camTl.get(tl);
  if (c) return c;
  const sc = tl.scenes, ln = tl.lines[SPLIT.beat];
  const ph = ln.phrases ?? [ln];
  const split = ph[Math.min(SPLIT.phrase, ph.length - 1)].start - SPLIT.lead;
  const scenes = [...sc.slice(0, SPLIT.beat), { start: sc[SPLIT.beat].start, end: split }, { start: split, end: sc[SPLIT.beat].end }, ...sc.slice(SPLIT.beat + 1)];
  c = { ...tl, scenes, split };
  camTl.set(tl, c);
  return c;
}
/** Start time (global s) of beat 11's dive to the last 2 mm. */
export const diveStart = (tl) => cameraTimeline(tl).split;

/** Camera-beat index and progress (for `now` interpolation and the HUD). */
function camBeat(gt, ctl) {
  let b = 0;
  ctl.scenes.forEach((s, i) => { if (s.start <= gt) b = i; });
  return Math.min(b, KEYS.length - 1);
}

export function at(gt, tl) {
  const ctl = cameraTimeline(tl);
  const c = cam.at(gt, ctl);
  // "now" stays pinned: its screen x eases between keys with the same curve makeCamera uses for the travel
  const b = camBeat(gt, ctl);
  let nowX = KEYS[b].now;
  if (b > 0) {
    const t = gt - ctl.scenes[b].start;
    nowX = L.lerp(KEYS[b - 1].now, KEYS[b].now, L.ease.inOutCubic(L.prog(t, -0.05, KEYS[b].travel)));
  }
  nowX += L.noise1(gt * 0.3, 1) * 3;                           // a breath of drift (screen px)
  c.x = (W / 2 - nowX) * c.mpp;
  c.y += L.noise1(gt * 0.27, 2) * 3 * c.mpp;
  c.nowX = nowX;
  return c;
}
