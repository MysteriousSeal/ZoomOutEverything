// Camera for "How Fast Is Light, Really?" (60 s): follow one photon outward. Owned by the orchestrator.
//
// WORLD: top-down space in metres, Earth at the origin. Positions are true distances (directions chosen for layout):
//   MOON 384,400 km · SUN 1 AU · NEPTUNE 30 AU from the Sun · VOYAGER 1 ~172 AU from the Sun (late Oct 2026: ≈ 25.87 billion km,
//   23 h 49 min of light) · PROXIMA 4.24 ly · GALAXY: Milky Way centre 26,000 ly away (disc radius 50,000 ly)
//   · deep field ~13 billion ly
//
// KEYS: centre (x, y) + metres per pixel, `travel` (s), optional `lead` (s: the move starts that long BEFORE the beat,
// so the subject is on screen before the narrator names it), `push` (slow hold push-in factor; the next move starts
// from the pushed framing, so a hand-over never jumps) and `skew` (< 1: the move covers most of its zoom early and
// settles slowly — for long pull-outs where the new subject only reads near the target scale).
import * as L from '../../../engine/runtime/lib.js';

export const C = 299792458;
export const LY = 9.4607e15;
const DEG = Math.PI / 180;
const at_ = (r, a, o = { x: 0, y: 0 }) => ({ x: o.x + r * Math.cos(a * DEG), y: o.y + r * Math.sin(a * DEG) });
export const R_EARTH = 6.371e6;
export const MOON = at_(3.844e8, -25);
export const SUN = at_(1.496e11, -20);
export const NEPTUNE = at_(4.495e12, 150, SUN);
export const VOYAGER = at_(2.587e13, 70, SUN);
export const PROXIMA = at_(4.24 * LY, 205);
export const GALAXY = { ...at_(26000 * LY, -100), r: 50000 * LY };
export const DEEP_R = 13e9 * LY;
const mid = (a, b = { x: 0, y: 0 }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const mix = (a, b, f) => ({ x: b.x + (a.x - b.x) * f, y: b.y + (a.y - b.y) * f });   // f of the way from b to a

const ANCHOR = 0.48, HOOK_FROM = 0.85, DRIFT = 4;
/** a centre that puts world point p at screen (sx, sy) for this mpp (W 1080, H 1920, anchor 0.48) */
const place = (p, sx, sy, mpp) => ({ x: p.x - (sx - 540) * mpp, y: p.y - (sy - 1920 * ANCHOR) * mpp, mpp });

// beat 4/5: the Sun–Earth line with the Sun at x ≈ 810 (its glow clear of the right edge) and the pair a little
// low in the frame (the preroll replays this framing under its headline)
const F4 = place(SUN, 810, 860, 2.1e8);

const KEYS = [
  { x: 0, y: 0, mpp: 2.6e4, travel: 0 },                         // 0 hook: Earth
  { x: 0, y: 0, mpp: 2.4e4, travel: 0.8 },                       // 1 299,792 km/s
  { x: 0, y: 0, mpp: 2.4e4, travel: 0.8, push: 0.99 },           // 2 7.5 laps around Earth (outer lap ring r ≈ 330 px)
  { ...mid(MOON), mpp: 4.7e5, travel: 1.0, lead: 0.45 },         // 3 the Moon (in frame by ~16.3 s MP4, named ~16.6)
  { ...F4, travel: 0.75, lead: 0.35, push: 0.98 },               // 4 the Sun, 8 min 19 s (in frame on 'Sunlight takes')
  { ...F4, mpp: F4.mpp * 0.98, travel: 0.6, push: 0.98 },        // 5 old light (holds the same shot)
  { ...SUN, mpp: 1.05e10, travel: 1.1, lead: 0.4 },              // 6 Neptune, 4 h (settled before 'Neptune')
  { ...mix(VOYAGER, SUN, 0.6), mpp: 4.0e10, travel: 1.0, lead: 0.5, push: 0.98 }, // 7 Voyager 1, 23 h 49 min
  { ...mid(PROXIMA), mpp: 4.8e13, travel: 0.6, lead: 0.2 },      // 8 Proxima, 4.2 years (in frame on 'The nearest star?')
  { x: GALAXY.x, y: GALAXY.y, mpp: 1.1e18, travel: 1.5, lead: 0.45, skew: 0.5 }, // 9 the Milky Way (readable by 'far side')
  // deep field at true scale: the most distant galaxy (13.4 Gly) on screen in beat 10, the 13.8 Gly horizon
  // ring (r ≈ 410-420 px) inside the frame in beat 12, with a slow pull-out (push > 1) instead of a push-in
  { x: 0, y: 0, mpp: 2.7e23, travel: 1.9, push: 0.97 },          // 10 the deep field
  { x: 0, y: 0, mpp: 2.9e23, travel: 0.6, push: 1.02 },          // 11
  { x: 0, y: 0, mpp: 3.1e23, travel: 0.6, push: 1.03 },          // 12
];

/** seconds before beat i starts that the camera begins its move there (scenes fade world-pinned labels before it) */
export const moveLead = (i) => KEYS[i]?.lead ?? 0;
/** global time at which beat i's camera move begins */
export const moveStart = (tl, i) => tl.scenes[i].start - moveLead(i);

function travelTo(a, b, k) {
  const e = L.ease.inOutCubic(Math.pow(L.clamp(k), b.skew ?? 1));
  const la = Math.log(a.mpp), lb = Math.log(b.mpp);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const need = Math.log(Math.max(1e-300, dist) / 900);
  const auto = Math.abs(lb - la) > 1 ? 0 : Math.max(0, need - Math.max(la, lb)) * 0.9;
  const lift = (auto + (b.lift ?? 0)) * Math.sin(Math.PI * e);
  const plain = Math.exp(L.lerp(la, lb, e));
  // big zooms: tie the pan to the zoom (linear in mpp) so both endpoints stay on screen the whole way
  const ep = Math.abs(lb - la) > 1 ? L.clamp((plain - a.mpp) / (b.mpp - a.mpp)) : e;
  return { x: L.lerp(a.x, b.x, ep), y: L.lerp(a.y, b.y, ep), mpp: plain * Math.exp(lift) };
}

function base(gt, tl) {
  const sc = tl.scenes, n = Math.min(sc.length, KEYS.length);
  let b = 0;
  for (let i = 0; i < n; i++) if (moveStart(tl, i) <= gt) b = i;
  if (b === 0) {
    const d = sc[0].end - sc[0].start;
    return { x: KEYS[0].x, y: KEYS[0].y, mpp: KEYS[0].mpp * L.lerp(HOOK_FROM, 1, L.ease.inOutCubic(L.prog(gt - sc[0].start, 0, d))) };
  }
  const key = KEYS[b], prev = KEYS[b - 1];
  const from = b - 1 === 0 ? prev : { ...prev, mpp: prev.mpp * (prev.push ?? 0.96) };
  const t0 = moveStart(tl, b);
  const t1 = b + 1 < n ? moveStart(tl, b + 1) : sc[Math.min(b, sc.length - 1)].end;
  const t = gt - t0, d = t1 - t0;
  const cam = travelTo(from, key, L.prog(t, -0.05, key.travel));
  cam.mpp *= L.lerp(1, key.push ?? 0.96, L.ease.inOutCubic(L.prog(t, key.travel, d - key.travel)));
  return cam;
}

/** Camera at global time gt: {x, y, mpp, anchor}. Pure function of gt. */
export function at(gt, tl) {
  const cam = base(gt, tl);
  cam.x += L.noise1(gt * 0.3, 1) * DRIFT * cam.mpp;
  cam.y += L.noise1(gt * 0.27, 2) * DRIFT * cam.mpp;
  cam.anchor = ANCHOR;
  return cam;
}
