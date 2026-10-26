// Camera for "How to Survive a Plane Crash" (EP 29, How to Survive #3).
//
// WORLD: a side elevation. Units: metres. x = right (the aircraft's nose points RIGHT), y = DOWN (screen convention);
//   the ground / runway surface is y = 0, so heights are negative y.
//   THE AIRCRAFT (env.js PLANE): a modern narrow-body airliner, 39 m long, drawn as a clean side cross-section (cutaway
//     cabin). Local coordinates: origin = the ground point under the fuselage centre. Cabin floor y −2.45, ceiling −4.75.
//     Exits on this side: FRONT door x 12.55 · OVERWING exit x 2.40 · REAR door x −6.90. Seat rows (seat-back x):
//     rows 1–10 at 10.2 … 3.0 (pitch 0.8), rows 11–20 at 1.55 … −5.65. YOU = row 15 (x −1.65): 4 rows to the overwing
//     exit ahead, 5 rows to the rear door behind.
//   THE FLIGHT PROFILE (beat 1): drawn in the same world as a diagram: x 0 … D (= 3600) is flight TIME (0 … 100 %),
//     height = altitude (cruise = A = 1300 world-m). The aircraft starts on the departure runway at x 0 (hook) and flies
//     the curve (constant time rate: it really does spend 94 % of the flight in the dim middle), then rolls out and
//     stops at XD = D + 120 (the destination runway), where it stays for the rest of the film.
//
// SHOTS (anchor 0.47 → the camera point lands at screen (540, 902)):
//   hook   B0  plane at x 0 fills the width (mpp 0.042), ground at screen y 1010; slow pull-out (from 0.92 ×)
//   chart  B1  pull out ×100 to the whole profile: x 0…D spans screen x 90…930 (clear of the Shorts UI column), ground at y 990 (mpp 4.29), travel 1.7
//   cabin  B2  zoom in ×370 onto the parked aircraft's cabin (overwing exit … rear door), mpp 0.0111, travel 1.9
//   card   B3  push in on YOU's seat (under the dimmed safety card), mpp 0.0072
//   brace  B4  (same frame, slower push)
//   evac   B5  pull out to the whole aircraft on the runway (mpp 0.042, ground at y 1090), travel 1.6
//   question B6 wider, under the opaque question card
import * as L from '../../../engine/runtime/lib.js';

export const ANCHOR = 0.47;
export const AY = L.H * ANCHOR;
/** cam.y that puts world y `wy` at screen row `sy` for a given mpp */
export const rowAt = (wy, sy, mpp) => wy + (AY - sy) * mpp;
/** cam.x that puts world x `wx` at screen column `sx` */
export const colAt = (wx, sx, mpp) => wx + (L.W / 2 - sx) * mpp;

// ------------------------------------------------------------------ the world's fixed numbers
export const D = 3600, A = 1460;            // the flight-profile diagram: time span and cruise height (world-m)
export const ROLL = 120;                    // roll-out after touchdown
export const XD = D + ROLL;                 // where the aircraft rests (destination)
export const YOU_X = -1.65;                 // YOU's seat back (local x)
export const CHART = { x0: 90, x1: 930, ground: 1040 };   // right edge ≤ 940: the Shorts UI column below y 1100
export const MC = D / (CHART.x1 - CHART.x0);

const B = (i) => (tl) => tl.scenes[i].start;
const PH = (i, j, dt = 0) => (tl) => tl.lines[i].phrases[j].start + dt;
export { B, PH };

// ------------------------------------------------------------------ story times (from the timeline)
const tCache = new WeakMap();
export function timesFor(tl) {
  let T = tCache.get(tl);
  if (T) return T;
  const b = (i) => tl.scenes[i].start, ph = (i, j) => tl.lines[i].phrases[j];
  const wd = (i, j, w) => { const p = ph(i, j); return p.words?.[w]?.[0] ?? p.start; };
  T = {
    flight0: b(1) + 1.75,                 // ≈ 9.5   brakes off: the aircraft starts its take-off roll on the profile
    flight1: ph(1, 0).end + 0.2,          // ≈ 14.2  touchdown at x = D
    smoke0: ph(2, 1).start - 0.05,        // ≈ 21.8  "In smoke…": smoke fills the cabin
    smoke1: b(3) + 0.6,                   //         smoke clears under the safety card
    evac0: ph(5, 1).start,
    // cabin shot pans (beat 2): view A (YOU + overwing exit) → view B (YOU + rear door) for the count behind → back to A
    panB: wd(2, 0, 5) + 0.95,             // "count" + 0.95: after the forward exit's ring
    backCount: wd(2, 0, 5) + 1.5,         // the count behind starts once view B has settled
    panA: ph(2, 1).start,                 // "In smoke": back to the overwing exit for the touch path                // ≈ 39.05 "Planes are built so everyone can get out in ninety seconds"
    evac1: ph(5, 1).end + 0.1,            // ≈ 42.8  the 90 s ring completes (everyone is out)
    end: tl.total,
  };
  tCache.set(tl, T);
  return T;
}

// ------------------------------------------------------------------ the aircraft's path
// altitude profile (fraction of cruise) vs flight-time fraction u: Boeing's phase split for a 1.5 h flight
// (takeoff 1 %, initial climb 1 %, climb 14 %, cruise 57 %, descent 11 %, initial approach 12 %, final approach 3 %, landing 1 %)
export const PHASES = [
  { name: 'TAKEOFF', u0: 0, u1: 0.01, lit: true },
  { name: 'INITIAL CLIMB', u0: 0.01, u1: 0.02, lit: true },
  { name: 'CLIMB', u0: 0.02, u1: 0.16 },
  { name: 'CRUISE', u0: 0.16, u1: 0.73 },
  { name: 'DESCENT', u0: 0.73, u1: 0.84 },
  { name: 'INITIAL APPROACH', u0: 0.84, u1: 0.96 },
  { name: 'FINAL APPROACH', u0: 0.96, u1: 0.99, lit: true },
  { name: 'LANDING', u0: 0.99, u1: 1, lit: true },
];
const KP = [[0, 0], [0.006, 0], [0.01, 0.004], [0.02, 0.03], [0.16, 1], [0.73, 1], [0.84, 0.32], [0.96, 0.045], [0.99, 0.002], [1, 0]];
// monotone cubic (Fritsch–Carlson) through KP
const MT = (() => {
  const n = KP.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((KP[i + 1][1] - KP[i][1]) / (KP[i + 1][0] - KP[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], bb = m[i + 1] / d[i], s = a * a + bb * bb;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * bb * d[i]; }
  }
  return m;
})();
/** altitude fraction (0…1) at flight-time fraction u */
export function altAt(u) {
  u = L.clamp(u);
  let i = 0;
  while (i < KP.length - 2 && u > KP[i + 1][0]) i++;
  const [x0, y0] = KP[i], [x1, y1] = KP[i + 1], h = x1 - x0, t = (u - x0) / h;
  const t2 = t * t, t3 = t2 * t;
  return Math.max(0, (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * MT[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * MT[i + 1]);
}
/** world point of the profile at u */
export const profilePt = (u) => ({ x: u * D, y: -altAt(u) * A });

/** the aircraft at film time gt: {x, y (wheels' ground point), rot (rad, + = nose up), u (flight fraction or −1/2), flying} */
export function planeAt(gt, tl) {
  const T = timesFor(tl);
  if (gt <= T.flight0) return { x: 0, y: 0, rot: 0, u: -1, flying: false };
  if (gt < T.flight1) {
    const u = (gt - T.flight0) / (T.flight1 - T.flight0);
    const p = profilePt(u), q = profilePt(Math.min(1, u + 0.004)), r0 = profilePt(Math.max(0, u - 0.004));
    const rot = L.clamp(Math.atan2(-(q.y - r0.y), q.x - r0.x), -0.5, 0.5);
    return { x: p.x, y: p.y, rot, u, flying: true };
  }
  // roll-out: decelerate from the flight speed to a stop over ROLL metres
  const v0 = D / (T.flight1 - T.flight0), tau = ROLL / v0, dt = gt - T.flight1;
  return { x: D + ROLL * (1 - Math.exp(-dt / tau)), y: 0, rot: 0, u: 2, flying: false };
}

// ------------------------------------------------------------------ shots
// cabin views (local x of the camera): A frames YOU + the overwing exit, B frames YOU + the rear door
export const CAB_A = 2.88 - (1000 - 540) * 0.0085, CAB_B = -7.53 + (540 - 60) * 0.0085;
export const MPP = { hook: 0.042, chart: MC, cabin: 0.0085, card: 0.0072, evac: 0.042, question: 0.062 };
export const SHOTS = [
  { name: 'hook', at: B(0), x: 0, y: rowAt(0, 1250, MPP.hook), mpp: MPP.hook, travel: 0 },
  { name: 'chart', at: B(1), x: colAt(D / 2, (CHART.x0 + CHART.x1) / 2, MC), y: rowAt(0, CHART.ground, MC), mpp: MC, travel: 1.3, push: 1 },
  { name: 'cabin', at: B(2), x: XD + CAB_A, y: rowAt(-5.25, 740, MPP.cabin), mpp: MPP.cabin, travel: 1.15, push: 0.985, ease: 'fast' },
  { name: 'card', at: B(3), x: XD + YOU_X + 0.3, y: -3.35, mpp: MPP.card, travel: 1.1, push: 0.97 },
  { name: 'brace', at: B(4), x: XD + YOU_X + 0.3, y: -3.35, mpp: MPP.card * 0.97, travel: 0.4, push: 0.97 },
  { name: 'evac', at: B(5), x: XD + 0.5, y: rowAt(0, 1250, MPP.evac), mpp: MPP.evac, travel: 1.6, push: 0.975 },
  { name: 'question', at: B(6), x: XD - 1, y: rowAt(0, 1580, MPP.question), mpp: MPP.question, travel: 2.0, push: 0.98 },
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
export function shotIndex(gt, tl) {
  const st = starts(tl).at;
  let i = 0;
  st.forEach((s, j) => { if (s <= gt) i = j; });
  return i;
}
export function shotAt(gt, tl) {
  const st = starts(tl).at, i = shotIndex(gt, tl);
  return { index: i, name: SHOTS[i].name, start: st[i], end: st[i + 1] ?? tl.total, p: L.prog(gt - st[i], -0.05, SHOTS[i].travel) };
}

/** camera of shot i at gt (no drift) */
function shotEval(i, gt, tl) {
  const S = starts(tl), s = SHOTS[i], st = S.at[i], end = S.at[i + 1] ?? tl.total;
  if (i === 0) return { x: s.x, y: s.y, mpp: s.mpp * L.lerp(HOOK_FROM, 1, L.ease.inOutCubic(L.prog(gt, 0, end))) };
  let from = S.from[i];
  if (!from) from = S.from[i] = shotEval(i - 1, st, tl);
  const k = L.prog(gt - st, -0.05, s.travel);
  // 'fast': the zoom gets going at once (no near-empty frames while a tiny aircraft creeps up), still landing softly
  const e = s.ease === 'fast' ? 1 - (1 - k) ** 5 : L.ease.inOutCubic(k);
  const la = Math.log(from.mpp), lb = Math.log(s.mpp);
  const plain = Math.exp(L.lerp(la, lb, e));
  // big zooms: the pan is tied to the zoom (linear in mpp) so both ends stay on screen; small ones ease plainly
  const ep = Math.abs(lb - la) > 1 ? L.clamp((plain - from.mpp) / (s.mpp - from.mpp)) : e;
  const mpp = plain * L.lerp(1, s.push ?? 0.97, L.ease.inOutCubic(L.prog(gt - st, s.travel, end - st - s.travel)));
  let x = L.lerp(from.x, s.x, ep);
  if (s.name === 'cabin') {
    const T = timesFor(tl);
    x += (CAB_B - CAB_A) * (L.ease.inOutCubic(L.prog(gt, T.panB, 0.5)) - L.ease.inOutCubic(L.prog(gt, T.panA, 0.6)));
  }
  return { x, y: L.lerp(from.y, s.y, ep), mpp };
}

/** Camera at film time gt: {x, y, mpp, anchor}. Pure. */
export function at(gt, tl) {
  const c = shotEval(shotIndex(gt, tl), gt, tl);
  // no drift on the chart (its bars are screen-space and must stay aligned with the world curve)
  const st = starts(tl).at, dw = 1 - L.smoothstep(L.prog(gt, st[1], 0.9)) * (1 - L.smoothstep(L.prog(gt, st[2], 0.9)));
  c.x += L.noise1(gt * 0.3, 1) * DRIFT * c.mpp * dw;
  c.y += L.noise1(gt * 0.27, 2) * DRIFT * c.mpp * dw;
  c.anchor = ANCHOR;
  return c;
}
