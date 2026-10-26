// Camera for "The Man Who Saved the World" (Zoom Out 25, Hidden History). Owned by the setup agent, then the
// orchestrator — builders: read, don't edit (put needs in "sharedRequests").
//
// ONE CONTINUOUS WORLD, two phases joined by a match-cut (the signature move):
//
// PHASE A — THE BUNKER (beats 0–2a). Units: METRES. A front elevation of the Serpukhov-15 control-room wall, seen by a
//   PINHOLE camera looking straight at it (perspective, not orthographic):
//     x → right, y → DOWN (screen convention): the floor is y = 0, the ceiling y = CEIL_Y = −6.0 (up is negative).
//     dz = distance IN FRONT of the wall, toward the camera (wall plane dz = 0).
//   makeCamera's (x, y) is the EYE position (it looks straight at the wall) and mpp the metres-per-pixel ON THE WALL.
//   The eye stands Z = mpp × FOCAL metres from the wall; a point at depth dz is drawn with mppAt(dz) = mpp − dz / FOCAL
//   (closer = bigger, faster parallax; the floor converges to the vanishing point at screen (540, 902)).
//   Use env.js proj()/plane() — never v.wx/v.wy — for anything that is not ON the wall (dz ≠ 0).
//     BOARD  the СТАРТ launch-warning board (wall, above the map)       centre (0, −4.35), 2.3 × 1.1 m
//     MAP    the backlit polar wall map (wall), disc r = 0.9 m          centre (0, −2.75), panel 2.0 × 2.0 m
//     CLOCK  amber digital wall clock (wall), left of the board         centre (−2.0, −4.55), 0.9 × 0.4 m
//     DATE   amber date panel (wall), right of the board                centre (2.0, −4.55), 0.9 × 0.4 m
//     CONSOLES operator console row, dz = 1.6 · DESK duty desk + red phone, dz = 3.2 · CHAIR the empty chair, dz = 3.9
//
// PHASE B — THE GLOBE (beats 2b–7). After the cut the room is gone (env roomK = 0, time-gated, never comes back) and
//   the wall map IS the Earth: a real-coastline globe (earth.js) drawn at the MAP centre with radius MAP.r world units,
//   seen from straight above the NORTH POLE (lat0 = 90, lon0 = −98: the central US at the BOTTOM, Siberia at the TOP,
//   Moscow upper right, Europe right, Alaska lower left). 1 world unit = R_EARTH / MAP.r = 7,079 km in this phase.
//   Here v.wx / v.wy / v.ws are fine (everything sits at dz = 0). Space, the Sun's glow, the Molniya orbit and the
//   satellite live in this same plane (env.js globeView / earth3 / orbitPt).
//
// SHOTS (makeCamera keys). EVERY start is derived from the voice timeline (B = beat start, PH = phrase start): no
// absolute seconds anywhere, so a re-recorded voice re-times the whole film. Times below are for the 67.39 s v4 voice.
//   hook      B(0)          0.00  tight on the СТАРТ board (centre y 1000, 920 px wide), slow pull-out over the beat
//   room      B(1)          7.40  crane back + down to the whole room (2.4 s); eye 1.55 m, mpp 0.0060: chair base
//                                 ≈ y 1300 (clear of the caption band 1380–1520), then a slow push
//   wall      PH(1,2)−0.25 13.14  second move of beat 1: push in onto the wall map (2.4 s, disc r 270 at y 1020: board top ≈ y 360; the desk
//                                 + chair pass out of frame under the camera): the KAL 007 mark on the map, the
//                                 teleprinter card over the (dark) board above it (s01)
//   map       PH(2,0)+0.6 20.67  HOLD while СТАРТ lights on "The alarm goes off", then push into the wall map (1.25 s) → disc r 430 at y 860; the match-cut (env CUT) runs
//                                 shotStart('map') + 0.64 → + 1.29; then a slow push through the five launches
//   rely      PH(2,3)−0.25 26.75  globe up + smaller (r 300 at y 640) for the big ВЫСОКАЯ / RELIABILITY HIGH panel
//   chain     B(3)        30.09  push back in on the globe (r 380 at y 720), chain-of-command band under it
//   war       PH(3,2)−0.15 35.92  a short tense push (r 405 at y 700) on "and a full nuclear war"
//   hundreds  B(4)        38.36  wider: r 330 at y 830 (room around the limb for the ghost arcs)
//   radar     PH(4,1)−0.25 42.56  push toward the radar fans (r 370 at y 800)
//   false     B(5)        45.18  r 390 at y 840 (the stamp)
//   wait      PH(5,1)−0.1  47.67  slow pull back (2.6 s) to r 330 at y 770: room for the minute dial + NO MISSILES ARRIVED
//   orbit     B(6)        52.50  zoom out to orbit (2.2 s): globe r 150 at (420, 1130)
//   secret    PH(6,2)−0.3  57.31  drift down/right (r 135 at (470, 1190)): room for the SECRET UNTIL 1998 card on top
//   question  B(7)        61.18  globe r 200 at y 1270 under the question card (card y 360–≈1000)
import { makeCamera } from '../../../engine/runtime/kit.js';
import * as L from '../../../engine/runtime/lib.js';

// ------------------------------------------------------------------ the bunker (metres; y down, floor y = 0)
export const FOCAL = 2000;                 // px: Z (eye-to-wall, m) = mpp × FOCAL (≈ 30° horizontal field of view)
export const CEIL_Y = -6.0;
export const BOARD = { x: 0, y: -4.35, w: 2.3, h: 1.1 };
export const MAP = { x: 0, y: -2.75, r: 0.9, panel: 2.0 };
export const CLOCK = { x: -2.0, y: -4.55, w: 0.9, h: 0.4 };
export const DATE = { x: 2.0, y: -4.55, w: 0.9, h: 0.4 };
export const CONSOLES = { x0: -4.2, x1: 4.2, top: -1.0, dz: 1.6 };
export const DESK = { x0: -1.75, x1: 0.35, top: -0.78, dz: 3.2 };
export const PHONE = { x: -1.15, y: -0.78, dz: 3.2 };   // base centre, sitting on the desk top
export const CHAIR = { x: -0.6, seat: -0.48, top: -1.32, w: 0.56, dz: 3.9 };

// ------------------------------------------------------------------ the globe (phase B)
export const R_EARTH_KM = 6371;
export const KM_PER_U = R_EARTH_KM / MAP.r;              // 7,079 km per world unit after the cut
export const GLOBE = { lat0: 90, lon0: -98 };             // straight down on the North Pole; central US at the bottom

// ------------------------------------------------------------------ shots
const ANCHOR = 0.47, AY = L.H * ANCHOR;                    // the camera centre lands at screen (540, 902.4)
/** cam.y that puts world y `wy` (on the wall plane) at screen row `sy` for a given mpp */
const rowAt = (wy, sy, mpp) => wy + (AY - sy) * mpp;
/** cam.x that puts world x `wx` at screen column `sx` */
const colAt = (wx, sx, mpp) => wx + (L.W / 2 - sx) * mpp;
const B = (i, dt = 0) => (tl) => tl.scenes[i].start + dt;
const PH = (i, j, dt = 0) => (tl) => tl.lines[i].phrases[j].start + dt;
const END = (i, dt = 0) => (tl) => tl.lines[i].end + dt;

/** Globe framing per shot: screen centre (sx, sy) and radius (px). */
export const GLOBE_AT = {
  wall: { sx: 540, sy: 1020, r: 270 },   // board top ≈ y 360: the СТАРТ board stays below the HUD + chapter card
  map: { sx: 540, sy: 860, r: 430 },
  rely: { sx: 540, sy: 640, r: 300 },
  war: { sx: 540, sy: 700, r: 405 },
  radar: { sx: 540, sy: 800, r: 370 },
  wait: { sx: 540, sy: 770, r: 330 },   // dial bottom ≈ y 1150: room for the 00:38 / NO MISSILES ARRIVED block
  secret: { sx: 470, sy: 1190, r: 135 },
  chain: { sx: 540, sy: 720, r: 380 },
  hundreds: { sx: 540, sy: 830, r: 330 },
  false: { sx: 540, sy: 840, r: 390 },
  orbit: { sx: 420, sy: 1130, r: 150 },
  question: { sx: 540, sy: 1270, r: 200 },
};
const globeShot = (name, at, travel, push = 0.97, extra = {}) => {
  const g = GLOBE_AT[name], mpp = MAP.r / g.r;
  return { name, at, x: colAt(MAP.x, g.sx, mpp), y: rowAt(MAP.y, g.sy, mpp), mpp, travel, push, ...extra };
};

export const MPP = { hook: 0.0025, room: 0.0060, wall: MAP.r / GLOBE_AT.wall.r, map: MAP.r / GLOBE_AT.map.r };
export const ROOM_EYE = -1.55;                            // eye height in the room shot (1.55 m above the floor)

export const SHOTS = [
  // beat 0: the board fills the frame under the headline band (y 260–520)
  { name: 'hook', at: B(0), x: BOARD.x, y: rowAt(BOARD.y, 1000, MPP.hook), mpp: MPP.hook, travel: 0 },
  // beat 1: crane back and down to the whole room, then (KAL 007 phrase) push in onto the wall map
  { name: 'room', at: B(1), x: 0, y: ROOM_EYE, mpp: MPP.room, travel: 2.4, push: 0.985 },
  globeShot('wall', PH(1, 2, -0.25), 2.4, 0.975),
  // beat 2: HOLD on the wall while СТАРТ lights ("The alarm goes off"), then push into the wall map 0.6 s after the
  // phrase starts; the map becomes the Earth
  globeShot('map', PH(2, 0, 0.6), 1.25, 0.94),
  globeShot('rely', PH(2, 3, -0.25), 0.9, 0.98),
  globeShot('chain', B(3), 1.2, 0.985),
  globeShot('war', PH(3, 2, -0.15), 0.7, 0.985),
  globeShot('hundreds', B(4), 1.3, 0.975),
  globeShot('radar', PH(4, 1, -0.25), 1.0, 0.98),
  globeShot('false', B(5), 1.1, 0.985),
  globeShot('wait', PH(5, 1, -0.1), 2.6, 0.985),
  globeShot('orbit', B(6), 2.2, 0.975),
  globeShot('secret', PH(6, 2, -0.3), 1.6, 0.985),
  globeShot('question', B(7), 1.6, 0.985),
];
export const KEYS = SHOTS;

const cam = makeCamera(SHOTS, { anchor: ANCHOR, hookFrom: 0.93, drift: 3 });
const shotCache = new WeakMap();
/** The voice timeline re-cut into one "scene" per SHOT (what makeCamera walks). */
export function shotTl(tl) {
  let s = shotCache.get(tl);
  if (!s) {
    const st = SHOTS.map((k) => k.at(tl));
    s = { ...tl, scenes: st.map((a, i) => ({ start: a, end: i + 1 < st.length ? st[i + 1] : tl.total })) };
    shotCache.set(tl, s);
  }
  return s;
}
/** Camera at film time gt: {x, y, mpp, anchor}. */
export const at = (gt, tl) => cam.at(gt, shotTl(tl));
/** The shot playing at gt: {index, name, start, end, p (0→1 over its travel)}. */
export function shotAt(gt, tl) {
  const st = shotTl(tl).scenes;
  let i = 0;
  st.forEach((s, j) => { if (s.start <= gt) i = j; });
  return { index: i, name: SHOTS[i].name, start: st[i].start, end: st[i].end, p: L.prog(gt - st[i].start, -0.05, SHOTS[i].travel) };
}
export const shotStart = (name, tl) => shotTl(tl).scenes[SHOTS.findIndex((s) => s.name === name)].start;
export { B, PH, END, ANCHOR, AY, rowAt, colAt };
