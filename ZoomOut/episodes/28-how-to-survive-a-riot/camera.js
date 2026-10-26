// Camera for "How to Survive a Riot" (EP 28, How to Survive #2). Owned by the setup agent / orchestrator —
// builders: read, don't edit.
//
// WORLD: a TOP-DOWN night city block. Units: metres. x = east (right), y = SOUTH (down, screen convention). North is up.
//   PLAZA x −26…26, y −22…22 (the crowd's core is just north of its centre, ≈ (2, −4)).
//   AVENUE (the march route, crowd-filled to y ≈ −78) runs north from the plaza: carriageway x −9…9, sidewalks to ±12.
//   THE WALL: the plaza's whole east side, x = 26 (a long blank warehouse wall).
//   THE FENCE: construction-site hoarding along the plaza's south side, y = 22, x −24…−3.5.
//   THE NARROW STREET (the pinch point / funnel): leaves the plaza's south side, x −3…3, y 22 → south; it passes under
//     a rail viaduct (UNDERPASS y 62…74).
//   THE PARK: west of the plaza (x < −26), rising uphill to the west (contours, +1 m per ≈ 4 m); a footpath climbs from
//     the plaza edge (−26, 4) to THE REFUGE, a building on the hill (x −60…−46, y −12…6, door on its east face at y −3).
//   Full geometry: env.js header.
//
// "YOU" (one highlighted particle). Its BASE path is defined here (the camera follows a smoothed copy of it); env adds the
//   crowd's surge displacement to it (youAt in env.js is what scenes draw). Times for the current 59.00 s timeline:
//   0 → 11.19   standing in the core at (−4, −7) (an anonymous particle until the ring appears at B1 + 0.2)
//   11.19 → 22.6  walks away west-south-west, ≈ 1.5 m/s: (−9.5, −5.5) at B2, (−12.5, −4) at 16.7, (−16.5, −1) at B3
//   22.6 → 25.9   holds in the crowd's west band at (−17, −0.5); the surge waves carry it (env adds the displacement)
//   25.9 → 30.0   between waves it steps WEST only in the lulls (T.zig: 3 steps of ≈ 3.5 m) → (−27.5, 3): out of the crowd
//   30.0 → 41.8   on the park edge, drifting to (−29.5, 3.5)
//   41.6 → 48.2   upwind (west, into the wind) and uphill along the footpath → (−41, −2) at B7
//   48.2 → 51.0   to the refuge's door (−46, −3) at PH7.0 + 1.2 ≈ 49.6, inside to the central corridor (−53, −3.5)
//
// SHOTS (anchor 0.47 → the camera point lands at screen (540, 902)). One shot per beat; "follow" shots target the
// smoothed YOU path + an offset (screen position of YOU noted), others are fixed. Travel eased in log(mpp) with an
// automatic mid-travel lift. A slow push over the rest of each shot (push), drift noise 3 px.
//   hook      B0   0.00  fixed (0, 10), mpp 0.085 (screen ≈ 92 × 163 m): plaza y 520–1035 px, the funnel/pinch at the
//                        narrow street mouth (0, 22) → screen (540, ≈1040); headline band y 260–520 is over the avenue.
//                        Slow pull-out over the beat (starts at 0.92 × mpp).
//   leave     B1   8.02  follow YOU (offset (+2, +2) m → YOU at ≈ (500, 860) px), mpp 0.05 (54 m wide), travel 1.6
//   edges     B2  14.92  fixed (1, 4), mpp 0.088: the wall (x 26) at screen x ≈ 822, fence y 20 → ≈ 1084, street mouth
//                        ≈ (540, 1110), underpass ≈ y 1560–1700; YOU at ≈ (330, 850). travel 1.5
//   surge     B3  22.62  follow YOU (offset (+9, +4) → YOU ≈ (360, 790)), mpp 0.06: the waves arrive from the top
//   drift     drift0 − 0.55 (25.34)  fixed (−22.2, 2.4), mpp 0.04 (43 m wide; packing reads tight): the zig-zag −17 → −27.5 spans x ≈ 670 → 410
//   arms      B4  29.30  follow YOU (offset (+2, +5)), mpp 0.05 — dimmed under the pictogram card
//   fall      B5  34.83  follow YOU (offset (+2, +5)), mpp 0.046
//   gas       B6  41.47  fixed (−16, 2), mpp 0.075 (x −56…24): gas source (4, 6) at ≈ (807, 955), refuge east face
//                        ≈ x 140, YOU −29 → −41 (≈ 367 → 207 px)
//   indoors   B7  48.23  fixed (−52, −3), mpp 0.035: the refuge (14 × 18 m) fills x ≈ 311–711, y ≈ 645–1160
//   question  B8  52.23  fixed (−10, 4), mpp 0.1, travel 2.0 — under the opaque question card
import * as L from '../../../engine/runtime/lib.js';

export const ANCHOR = 0.47;
export const AY = L.H * ANCHOR;                               // 902.4
/** cam.y that puts world y `wy` at screen row `sy` for a given mpp */
export const rowAt = (wy, sy, mpp) => wy + (AY - sy) * mpp;
/** cam.x that puts world x `wx` at screen column `sx` */
export const colAt = (wx, sx, mpp) => wx + (L.W / 2 - sx) * mpp;

const B = (i) => (tl) => tl.scenes[i].start;
const PH = (i, j, dt = 0) => (tl) => tl.lines[i].phrases[j].start + dt;
export { B, PH };

// ------------------------------------------------------------------ story times (from the timeline)
const tCache = new WeakMap();
/** All story times (s, film time) for this timeline. Cached; pure. Values for the 59.00 s timeline in comments. */
export function timesFor(tl) {
  let T = tCache.get(tl);
  if (T) return T;
  const b = (i) => tl.scenes[i].start, ph = (i, j) => tl.lines[i].phrases[j];
  const surge0 = ph(3, 0).start;
  T = {
    hookWavesEnd: b(1) - 0.2,             // 7.82  converging pinch waves stop being emitted (the last ones finish)
    youOn: b(1) + 0.2,                    // 8.22  the YOU ring + label appear
    mood0: ph(1, 1).start,                // 10.69 "The moment it turns": colour shift, hotspots, agitation
    walk0: ph(1, 1).start + 0.5,          // 11.19 YOU starts walking away
    zones: ph(2, 1).start,                // 17.04 "Avoid walls, fences and narrow streets": pressure builds there
    surge0,                               // 22.77 "If the crowd surges"
    // arrival of each planar surge wave at y = 0 (YOU's row); waves travel south at WAVE.speed
    surgeHits: [surge0 + 0.65, surge0 + 2.85, surge0 + 4.45, surge0 + 5.85],   // 22.72, 24.92, 26.52, 27.92 (57.66 s timeline; each 'deep' cue at hit − 0.15 lands between word onsets)
    drift0: ph(3, 2).start,               // 25.89 "Go with it, and drift sideways between waves"
    calm0: b(4) + 0.6,                    // 29.90 crowd pressure eases (cards beats)
    gas0: ph(6, 0).start,                 // 41.62 "Tear gas?": the canister starts venting
    uphill: ph(6, 1).start,               // 42.86 "Move upwind and uphill": contours brighten, YOU climbs
    flush: ph(6, 2).start,                // 45.46 "Don't rub your eyes…"
    indoors: b(7) + 0.15,                 // 48.38 the refuge roof starts to lift (plan revealed)
    door: ph(7, 0).start + 1.2,           // 49.58 YOU at the door
    windows: ph(7, 1).start,              // 50.74 "away from windows"
    inside: ph(7, 1).start + 0.3,         // 51.04 YOU settled in the central corridor
    end: tl.total,
  };
  // YOU path keys [time, x, y] (base, before the crowd's displacement)
  const z = T.surgeHits;
  T.youKeys = [
    [0, -4, -7],
    [T.walk0, -4, -7],
    [b(2), -9.5, -5.5],
    [ph(2, 0).end, -12.5, -4],
    [b(3) - 0.4, -16.5, -1],
    [T.drift0, -17, -0.5],
  ];
  // zig-zag: step west only in the lulls between waves (each lull starts ≈ 0.45 s after a wave hits YOU)
  T.zig = [[z[1] + 0.4, z[2] - 0.3, -20.6, 0.8], [z[2] + 0.4, z[3] - 0.3, -24.1, 2], [z[3] + 0.4, z[3] + 1.4, -27.5, 3]];   // 26.02–26.82, 27.52–28.32, 29.02–30.02 (≈ 3.5 m steps)
  for (const [t0, t1, x, y] of T.zig) { T.youKeys.push([t0, T.youKeys[T.youKeys.length - 1][1], T.youKeys[T.youKeys.length - 1][2]]); T.youKeys.push([t1, x, y]); }
  T.youKeys.push([T.gas0 + 0.2, -29.5, 3.5]);
  T.youKeys.push([b(7), -41, -2]);
  T.youKeys.push([T.door, -46, -3]);
  T.youKeys.push([T.inside, -53, -3.5]);
  T.youKeys.push([tl.total + 1, -53, -3.5]);
  tCache.set(tl, T);
  return T;
}

/** YOU's base path at film time gt (metres). Eased between keys (zero velocity at each key: walks start/stop softly). */
export function youBase(gt, tl) {
  const K = timesFor(tl).youKeys;
  if (gt <= K[0][0]) return { x: K[0][1], y: K[0][2] };
  for (let i = 1; i < K.length; i++) {
    if (gt <= K[i][0]) {
      const a = K[i - 1], b = K[i];
      const e = L.ease.inOutCubic(L.invLerp(a[0], b[0], gt));
      // gentle curve: the park walk bends along the footpath (a small sideways bow), everything else is straight
      return { x: L.lerp(a[1], b[1], e), y: L.lerp(a[2], b[2], e) };
    }
  }
  const k = K[K.length - 1];
  return { x: k[1], y: k[2] };
}

/** a smoothed copy of the YOU path (triangular window ±0.9 s): what follow shots track */
export function youSmooth(gt, tl) {
  let x = 0, y = 0, w = 0;
  for (let i = -4; i <= 4; i++) {
    const wi = 5 - Math.abs(i), p = youBase(gt + i * 0.225, tl);
    x += wi * p.x; y += wi * p.y; w += wi;
  }
  return { x: x / w, y: y / w };
}

// ------------------------------------------------------------------ shots
export const MPP = { hook: 0.085, leave: 0.05, edges: 0.088, surge: 0.06, drift: 0.04, arms: 0.05, fall: 0.046, gas: 0.075, indoors: 0.035, question: 0.1 };
export const SHOTS = [
  { name: 'hook', at: B(0), x: 0, y: 10, mpp: MPP.hook, travel: 0 },
  { name: 'leave', at: B(1), follow: [2, 2], mpp: MPP.leave, travel: 1.6, push: 0.97 },
  { name: 'edges', at: B(2), x: 1, y: 4, mpp: MPP.edges, travel: 1.5, push: 0.975 },
  { name: 'surge', at: B(3), follow: [9, 4], mpp: MPP.surge, travel: 1.3, push: 0.97 },
  // drift: a closer fixed frame over the zig-zag (YOU −17 → −27.5) so the sideways steps between waves read on the map
  { name: 'drift', at: (tl) => timesFor(tl).drift0 - 0.55, x: -22.2, y: 2.4, mpp: MPP.drift, travel: 1.0, push: 0.98 },
  { name: 'arms', at: B(4), follow: [2, 5], mpp: MPP.arms, travel: 1.2, push: 0.97 },
  { name: 'fall', at: B(5), follow: [2, 5], mpp: MPP.fall, travel: 1.2, push: 0.97 },
  { name: 'gas', at: B(6), x: -16, y: 2, mpp: MPP.gas, travel: 1.4, push: 0.975 },
  { name: 'indoors', at: B(7), x: -52, y: -3, mpp: MPP.indoors, travel: 1.4, push: 0.97 },
  { name: 'question', at: B(8), x: -10, y: 4, mpp: MPP.question, travel: 2.0, push: 0.98 },
];
export const KEYS = SHOTS;
export const SHOT = Object.fromEntries(SHOTS.map((s) => [s.name, s]));
const HOOK_FROM = 0.92, DRIFT = 3;

const stCache = new WeakMap();
function starts(tl) {
  let s = stCache.get(tl);
  if (!s) { s = { at: SHOTS.map((k) => k.at(tl)), from: [] }; stCache.set(tl, s); }
  return s;
}
/** index of the shot playing at gt */
export function shotIndex(gt, tl) {
  const st = starts(tl).at;
  let i = 0;
  st.forEach((s, j) => { if (s <= gt) i = j; });
  return i;
}
/** The shot playing at gt: {index, name, start, end, p (0→1 over its travel)}. */
export function shotAt(gt, tl) {
  const st = starts(tl).at, i = shotIndex(gt, tl);
  return { index: i, name: SHOTS[i].name, start: st[i], end: st[i + 1] ?? tl.total, p: L.prog(gt - st[i], -0.05, SHOTS[i].travel) };
}

function target(s, gt, tl) {
  if (!s.follow) return { x: s.x, y: s.y };
  const p = youSmooth(gt, tl);
  return { x: p.x + s.follow[0], y: p.y + s.follow[1] };
}

/** camera of shot i at gt (no drift) */
function shotEval(i, gt, tl) {
  const S = starts(tl), s = SHOTS[i], st = S.at[i], end = S.at[i + 1] ?? tl.total;
  const tg = target(s, gt, tl);
  if (i === 0) return { x: tg.x, y: tg.y, mpp: s.mpp * L.lerp(HOOK_FROM, 1, L.ease.inOutCubic(L.prog(gt, 0, end))) };
  let from = S.from[i];
  if (!from) from = S.from[i] = shotEval(i - 1, st, tl);
  const k = L.prog(gt - st, -0.05, s.travel), e = L.ease.inOutCubic(k);
  const la = Math.log(from.mpp), lb = Math.log(s.mpp);
  const dist = Math.hypot(tg.x - from.x, tg.y - from.y);
  const need = Math.log(Math.max(1e-9, dist) / 900);
  const lift = Math.max(0, need - Math.max(la, lb)) * 0.9 * Math.sin(Math.PI * e);
  const mpp = Math.exp(L.lerp(la, lb, e) + lift) * L.lerp(1, s.push ?? 0.97, L.ease.inOutCubic(L.prog(gt - st, s.travel, end - st - s.travel)));
  return { x: L.lerp(from.x, tg.x, e), y: L.lerp(from.y, tg.y, e), mpp };
}

/** Camera at film time gt: {x, y, mpp, anchor}. Pure. */
export function at(gt, tl) {
  const c = shotEval(shotIndex(gt, tl), gt, tl);
  c.x += L.noise1(gt * 0.3, 1) * DRIFT * c.mpp;
  c.y += L.noise1(gt * 0.27, 2) * DRIFT * c.mpp;
  c.anchor = ANCHOR;
  return c;
}
