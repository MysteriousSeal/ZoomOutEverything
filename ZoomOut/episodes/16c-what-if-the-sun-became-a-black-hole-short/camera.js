// Camera for "What If the Sun Became a Black Hole?" (16c: the ~50 s cut of 16). Owned by the orchestrator.
// 16c: the camera flies its OWN keys (KEYS below, one per 16c beat) on the 16c timeline; the scenes and env still run on
// 16 time (remap.js), and a 16-time query (at(og, ORIG), e.g. s10's zoom rate) is converted back with fromOrig().
//
// WORLD: a SIDE VIEW of the plane of Earth's orbit, in metres. x right, y DOWN (screen convention).
//   EARTH's centre is at (0, R_EARTH), so the street at (0, 0) stands on the TOP of the planet: at street scale the
//   ground is flat, and pulling back turns it into the globe (as in episodes 06 / 11).
//   The ground (street level) is y = 0 for x < COAST; the harbour wall drops to the sea at SEA_Y; the seabed profile
//   is seabedDepth(x) (env.js). The sea is to the RIGHT of the street.
//   SUN: true distance 1 AU from Earth's centre, toward the UPPER-LEFT (SUN_DIR), so from the street the Sun hangs
//   in the upper-left sky, and the system shots put Earth lower-right, the Sun upper-left / centre.
//   Scale comparisons that are not "really there" (a city map under the black hole, a 20-solar-mass star beside the
//   Sun, an Earth-sized ghost beside the white dwarf) sit at fixed world points next to SUN (CITY, STAR20, EARTH_GHOST).
//
// The camera: one waypoint per beat (KEYS[b], reached `travel` s after the beat starts), optional extra waypoints
// inside a beat (`then: [{t, x, y, mpp, travel}]`, t in seconds from the beat start), a slow push between moves.
// Every move is a van Wijk–Nuij "smooth zoom-pan" flight: it zooms out just enough to keep start and goal in one
// continuous view, pans, and zooms back in (a pure zoom when the centre does not move). So the street, the orbit,
// the 6 km black hole, the frozen ocean and the white dwarf are ONE unbroken journey with no cuts.
import * as L from '../../../engine/runtime/lib.js';
import { makeCamera } from '../../../engine/runtime/kit.js';
import { fromOrig, TL } from './remap.js';

const { W, H } = L;
export const C = 299792458;
export const AU = 1.496e11;                    // AU / c = 499.0 s = 8 min 19 s ("eight minutes and twenty seconds")
export const R_EARTH = 6.371e6;
export const R_SUN = 6.957e8;
export const M_SUN = 1.989e30;
export const RS = 2953;                        // Schwarzschild radius of one solar mass, 2GM/c^2 (m)
export const BH_D = 2 * RS;                    // ≈ 5.9 km: "about six kilometres wide"
export const R_GIANT = 1.3e11;                 // red-giant radius drawn at the tip (≈ 0.87 AU, ~190 R_sun; models: 170-256)
export const R_WD = 8.5e6;                     // the Sun's white dwarf (~0.54 M_sun): ≈ 1.3 Earth radii, "about Earth's size"
export const R_STAR20 = 6 * R_SUN;             // a ~20 M_sun main-sequence star (radius ≈ 6 R_sun)

export const EARTH = { x: 0, y: R_EARTH };
const sd = { x: -0.643, y: -0.766 };
const sl = Math.hypot(sd.x, sd.y);
/** Unit vector from Earth toward the Sun (upper-left). */
export const SUN_DIR = { x: sd.x / sl, y: sd.y / sl };
export const SUN = { x: EARTH.x + AU * SUN_DIR.x, y: EARTH.y + AU * SUN_DIR.y };
/** Street / coast (metres). The street runs along x at ground level y = 0; the quay is at COAST. */
export const COAST = 180;
export const SEA_Y = 4;                        // sea surface 4 m below street level (harbour wall)
/** The ocean cross-section framed in beat 15 (centre of the slice, metres). Seabed reaches ~4 km by x ≈ 9 km. */
export const OCEAN = { x: 9000, y: 1700 };

// helper: camera centre that puts world point p at screen (sx, sy) for a given mpp (anchor 0.5)
export const place = (p, sx, sy, mpp) => ({ x: p.x - (sx - W / 2) * mpp, y: p.y - (sy - H / 2) * mpp, mpp });
/** World point that the given framing puts at screen (sx, sy). */
const pointAt = (f, sx, sy) => ({ x: f.x + (sx - W / 2) * f.mpp, y: f.y + (sy - H / 2) * f.mpp });

// ------------------------------------------------------------------ framings (shared with env/scenes)
const ORBIT_MPP = 3.74e8;                      // 1 AU ≈ 400 px
export const FRAME = {
  street: place({ x: 0, y: 0 }, 540, 1200, 0.04),                // ground line at y ≈ 1200, frame ≈ 43 m wide
  system: place(EARTH, 800, 1080, 1.9e8),                         // Earth (800, 1080), Sun ≈ (294, 477)
  globe: place(EARTH, 540, 900, 2.0e4),                           // Earth r ≈ 318 px, the street at the top (y ≈ 582)
  orbit: place(SUN, 540, 800, ORBIT_MPP),                         // Sun (540, 800), Earth ≈ (797, 1106), orbit r 400 px
  bh: place(SUN, 540, 820, 14),                                   // the 6 km horizon ≈ 422 px wide
  ocean: place(OCEAN, 540, 860, 6.2),                             // ≈ 6.7 km of ocean wide, surface y ≈ 586, 4 km seabed ≈ 1230
};
/** Comparison props (not physically there; scale references placed beside the subject). */
export const CITY = { x: SUN.x, y: SUN.y, w: 11000, h: 9500 };    // a city-sized street map (≈ central Paris), centred under the hole
export const STAR20 = pointAt(place(SUN, 300, 560, 1.4e7), 640, 940); // a 20 M_sun star (r ≈ 300 px at 1.4e7 m/px)
export const EARTH_GHOST = pointAt(place(SUN, 400, 740, 4.0e4), 735, 1065); // an Earth-sized disc beside the white dwarf

/** 16's keys, one per 16 beat (reference; 16c flies KEYS below). */
const KEYS16 = [
  { ...FRAME.street, travel: 0 },                                                   // 0 hook: the sunny street
  { ...place({ x: 9, y: 0 }, 540, 1215, 0.042), travel: 3.5, push: 0.985 },         // 1 slow dolly along the street
  { ...place({ x: 17, y: 0 }, 540, 1225, 0.044), travel: 4.0, push: 0.985 },        // 2 keep dollying: nothing changes
  { ...FRAME.system, travel: 2.5, push: 0.97 },                                     // 3 FLY OUT: street -> Earth and Sun (true scale)
  { ...place(EARTH, 790, 1070, 1.8e8), travel: 1.0, push: 0.97 },                   // 4 gravity: same view, slight push
  { ...place(EARTH, 560, 860, 3.4e4), at: -0.5, travel: 1.4, push: 0.97 },          // 5 PUSH IN to the globe: the front sweeps it dark
  { ...FRAME.orbit, travel: 2.0, push: 0.97 },                                      // 6 pull back out to the orbit
  { ...place(SUN, 540, 790, 3.6e8), travel: 1.2, push: 0.97 },                      // 7 same orbit: hold
  { ...place(SUN, 470, 760, 2.7e8), travel: 1.6, push: 0.97 },                     // 8 lean toward Earth (lower-right) for the pull
  { ...place(SUN, 540, 800, 3.3e8), travel: 1.4, push: 0.97 },                      // 9 back to the whole orbit
  { ...place(SUN, 540, 820, 7.0e6), at: -0.1, travel: 0.65, push: 0.6,             // 10 THE DIVE, stepped: hold at the Sun's scale,
    then: [{ t: 1.45, ...place(SUN, 540, 820, 6.0e4), travel: 0.65, push: 0.6 },    //    then at Earth's scale,
      { t: 2.8, ...place(SUN, 540, 820, 15), travel: 1.2, push: 1.0 }] },             //    then the final dive onto the 6 km horizon
  { ...FRAME.bh, at: 0.6, travel: 1.0, push: 0.97 },                                // 11 settle: 6 km, a city underneath
  { ...place(SUN, 540, 860, 16), travel: 1.2, push: 0.97 },                         // 12 drive across: slight pull-back
  { ...FRAME.globe, travel: 3.0, push: 0.97 },                                      // 13 FLY BACK to Earth (1 AU)
  { ...place({ x: 0, y: 0 }, 540, 1190, 0.05), travel: 2.2, push: 0.975 },          // 14 dive to the frozen street
  { ...FRAME.ocean, travel: 2.4, push: 0.98,                                        // 15 glide out over the quay, down into the sea
    then: [{ t: 4.2, ...place({ x: 9300, y: 2100 }, 540, 860, 5.2), travel: 3.0 }] },//    sink toward the deep, liquid water
  { ...place(SUN, 540, 820, 3.0e6), travel: 2.3, push: 0.97 },                      // 16 FLY to the Sun: it un-collapses (r ≈ 232 px)
  { ...place(SUN, 300, 560, 1.4e7), travel: 1.5, push: 0.98 },                      // 17 pull out: the 20x-heavier star beside it
  { ...place(SUN, 540, 820, 4.0e8), travel: 2.3, push: 1.0,                          // 18 orbit view: five billion years, the red giant swells
    then: [{ t: 5.15, ...place(SUN, 400, 740, 4.0e4), travel: 3.1, push: 0.97 }] }, //    then the long push into the white dwarf
];

// 16c: one key per 16c beat (at / travel / then.t in 16c seconds from the 16c beat start). The cut beats' moves are
// gone, so each handover is ONE flight from the previous kept framing (the bridges are noted).
const KEYS = [
  { ...FRAME.street, travel: 0 },                                                   // 0 hook: the sunny street (16 key 0)
  { ...KEYS16[2], at: 0.12, travel: 3.6 },                                          // 1 dolly along the street, straight from the hook (16's keys 1+2)
  { ...KEYS16[3], at: -0.05, travel: 2.35 },                                        // 2 FLY OUT to the Earth and the Sun (16 key 3)
  { ...KEYS16[5], at: -0.35, travel: 1.3 },                                         // 3 push in to the globe from the system view (16 key 5; 16 key 4 cut)
  { ...KEYS16[7], at: -0.05, travel: 1.6,                                           // 4 BRIDGE: globe -> the whole orbit in one pull-back (16 keys 6+7),
    then: [{ t: 2.2, ...KEYS16[9], travel: 1.2 }] },                                //    then 16 key 9 for "only mass and distance" (16 key 8 cut)
  { ...KEYS16[10] },                                                                // 5 THE DIVE (16 key 10, same timing)
  { ...KEYS16[11] },                                                                // 6 settle on the 6 km horizon (16 key 11)
  { ...place(EARTH, 540, 1000, 2.2e4), at: -0.4, travel: 2.0, push: 0.97 },    // 16c audit: leaves 0.4 s early, 2.7 -> 2.0 s (globe in on "Back on Earth")        // 7 BRIDGE: the hole -> the frozen globe (1 AU, one flight; 16 keys
                                                                                    //   13+14 dived on to the street, 16c holds the globe under the −18 °C label)
  { ...KEYS16[16], at: -0.05, travel: 1.9 },                                        // 8 (audit: 2.3 -> 1.9, fewer empty frames) FLY to the Sun: it un-collapses (16 key 16, from the globe)
  { ...KEYS16[17] },                                                                // 9 pull out: the 20x-heavier star (16 key 17), held under the question
];

// ------------------------------------------------------------------ van Wijk–Nuij smooth zoom-pan
const RHO = 1.3;
function flight(a, b) {
  const wa = a.mpp * W, wb = b.mpp * W;
  const dx = b.x - a.x, dy = b.y - a.y, u1 = Math.hypot(dx, dy);
  if (u1 < 1e-9 * Math.max(wa, wb) || u1 < 1e-6) {
    const S = Math.abs(Math.log(wb / wa)) / RHO;
    return { S, at: (s) => ({ x: L.lerp(a.x, b.x, S ? s / S : 1), y: L.lerp(a.y, b.y, S ? s / S : 1), mpp: S ? a.mpp * Math.exp(Math.sign(Math.log(wb / wa)) * RHO * s) : b.mpp }) };
  }
  const r2 = RHO * RHO, r4 = r2 * r2;
  const bi = (wi, sgn) => (wb * wb - wa * wa + sgn * r4 * u1 * u1) / (2 * wi * r2 * u1);
  const r0 = -Math.asinh(bi(wa, 1)), r1 = -Math.asinh(bi(wb, -1));
  const S = (r1 - r0) / RHO;
  const ch0 = Math.cosh(r0), sh0 = Math.sinh(r0);
  return {
    S,
    at(s) {
      const u = (wa / r2) * (ch0 * Math.tanh(RHO * s + r0) - sh0);
      const w = (wa * ch0) / Math.cosh(RHO * s + r0);
      return { x: a.x + (dx / u1) * u, y: a.y + (dy / u1) * u, mpp: w / W };
    },
  };
}

// ------------------------------------------------------------------ evaluation (a pure function of time)
let cacheTl = null, SEGS = null;
function segments(tl) {
  if (cacheTl === tl) return SEGS;
  const out = [];
  KEYS.forEach((k, b) => {
    if (b === 0 || !tl.scenes[b]) return;
    const st = tl.scenes[b].start;
    out.push({ t0: st + (k.at ?? -0.05), dur: k.travel, to: k, push: k.push ?? 0.96 });
    for (const m of k.then ?? []) out.push({ t0: st + m.t, dur: m.travel, to: m, push: m.push ?? k.push ?? 0.96 });
  });
  out.sort((p, q) => p.t0 - q.t0);
  out.forEach((s, i) => { s.holdEnd = i + 1 < out.length ? out[i + 1].t0 : tl.total; });
  cacheTl = tl; SEGS = out;
  return out;
}

function base(gt, tl) {
  const segs = segments(tl);
  const k0 = KEYS[0];
  const hookEnd = segs[0].t0;
  // hook: a slow pull-back
  let state = { x: k0.x, y: k0.y, mpp: k0.mpp * 0.9 };
  // 16c: beat-relative (the film starts after the cold open)
  const h0 = tl.scenes[0].start;
  const hk = L.ease.inOutCubic(L.prog(gt, h0, hookEnd - h0));
  if (gt < hookEnd) return { x: k0.x, y: k0.y, mpp: k0.mpp * L.lerp(0.9, 1, hk) };
  state = { x: k0.x, y: k0.y, mpp: k0.mpp };
  for (const sg of segs) {
    if (gt < sg.t0) break;
    const k = L.prog(gt, sg.t0, sg.dur);
    let cam;
    if (k < 1) {
      const f = flight(state, sg.to);
      cam = f.at(L.ease.inOutCubic(k) * f.S);
      return cam;
    }
    // arrived: hold with a slow push until the next move starts
    const hold = sg.holdEnd - (sg.t0 + sg.dur);
    const pk = L.ease.inOutCubic(L.prog(gt, sg.t0 + sg.dur, Math.max(0.01, hold)));
    const endMpp = sg.to.mpp * sg.push;
    state = { x: sg.to.x, y: sg.to.y, mpp: L.lerp(sg.to.mpp, endMpp, pk) };
    if (gt < sg.holdEnd) return state;
    state = { x: sg.to.x, y: sg.to.y, mpp: endMpp };
  }
  return state;
}

export function at(gt, tl) {
  // 16c: a query on 16 time (a scene sampling the camera with its 16 view) is answered at the matching 16c time
  if (tl?.__orig) { gt = fromOrig(gt); tl = TL; }
  const cam = base(gt, tl);
  const drift = 3.5;
  cam.x += L.noise1(gt * 0.3, 1) * drift * cam.mpp;
  cam.y += L.noise1(gt * 0.27, 2) * drift * cam.mpp;
  cam.anchor = 0.5;
  return cam;
}
export { KEYS, KEYS16 };
// makeCamera (kit) is the house default; this film needs multi-waypoint beats and long flights, so it uses the
// smooth zoom-pan above instead. Kept importable for scenes that want a local camera helper.
export { makeCamera };
