// Camera for "If the Sun Were a Basketball" (04b: cold-open hook + closing question). Owned by the orchestrator.
// 04b beats: 0 cold open on the night globe (New York → Rome) · 1–13 the original film (original beats 0–12)
// · 14 closing question (holds the final frame).
//
// WORLD: metres on the ground plane, seen from above (x right, y down). The basketball Sun sits at the origin.
// Scale 1 : 5.8 billion. Each body sits on its orbit at a fixed angle (PLANETS below) so the camera can swoop.
// Beyond the town scale the ground hands over to a globe (scene s10): the origin = New York; env.js exports the
// globe projection (globeXY) so Rome lands ~6,900 km away at its true great-circle position.
import { ease, lerp, noise1, prog } from '../../../engine/runtime/lib.js';

const DEG = Math.PI / 180;
// name: [orbit radius m (scaled semi-major axis), angle deg, scaled diameter m]
export const PLANETS = {
  mercury: [10.0, -35, 0.00084],
  venus: [18.7, 205, 0.0021],
  earth: [25.8, 62, 0.0022],
  mars: [39.3, 148, 0.00117],
  jupiter: [134, -58, 0.024],
  saturn: [247, 112, 0.020],
  uranus: [495, 18, 0.0087],
  neptune: [776, 238, 0.0085],
};
export const MOON = { dist: 0.066, angle: -20, diam: 0.0006 };   // from Earth
export const SUN_DIAM = 0.24;
export const pos = (name) => { const [r, a] = PLANETS[name]; return { x: r * Math.cos(a * DEG), y: r * Math.sin(a * DEG) }; };
export const moonPos = () => { const e = pos('earth'); return { x: e.x + MOON.dist * Math.cos(MOON.angle * DEG), y: e.y + MOON.dist * Math.sin(MOON.angle * DEG) }; };

// keys: centre (x, y) + metres per pixel. Orbit keys frame the whole ring with the Sun in view.
const ring = (name, f = 1.0, pan = 0.35) => { const r = PLANETS[name][0]; const p = pos(name); return { x: p.x * pan, y: p.y * pan, mpp: (2 * r * f) / 860 }; };
const E = pos('earth');
const KEYS = [
  { x: 3.28e6, y: -3.39e6, mpp: 15500, travel: 0 },            // 0 cold open: the globe, smaller and lower so the headline sits above it
  { x: 0, y: 0, mpp: 0.00075, travel: 0 },                     // 1 the basketball (24 cm ≈ 320 px)
  { ...ring('mercury', 1.06, 0.25), travel: 1.5, lead: 1.1 },            // 2 (whole ring in frame)
  { x: -0.98, y: -5.8, mpp: 18.7 / 380, travel: 1.3, lead: 0.9 },   // the ring sits low, clear of the label and the lens                           // 3
  { ...ring('earth'), travel: 1.3, lead: 0.8 },                           // 4
  { x: E.x, y: E.y, mpp: 0.00028, travel: 1.25, lead: 0.85 },               // 5 macro: Earth + Moon, 6.6 cm apart
  { ...ring('mars'), travel: 1.1, lead: 1.0 },                            // 6
  { ...ring('jupiter'), travel: 1.5, lead: 0.9 },                         // 7
  { ...ring('saturn'), travel: 1.4, lead: 0.9 },                          // 8
  { x: 0, y: 0, mpp: (2 * 776) / 900, travel: 2.2 },          // 9 Uranus + Neptune (whole system)
  { x: 0, y: 0, mpp: (2 * 776) / 760, travel: 1.0 },           // 10 the whole solar system, breathing room
  { x: 3.28e6, y: 1.10e6, mpp: 13000, travel: 2.8 },           // 11 lift off to the globe (New York ↔ Rome midpoint), calm; globe bottom ≈ y 1345, clear of the captions
  { x: 3.28e6, y: 1.15e6, mpp: 12800, travel: 0.6 },           // 12 the flight arc
  { x: 3.357e6, y: 4.84e5, mpp: 17500, travel: 2.0 },          // 13 the whole globe, dim and empty
];

/** seconds before beat i starts that the camera begins its move there (scenes fade world-pinned marks before it) */
export const moveLead = (i) => KEYS[i]?.lead ?? 0;

function travelTo(a, b, k, bump = 0) {
  const e = ease.inOutCubic(k);
  const la = Math.log(a.mpp), lb = Math.log(b.mpp);
  // when panning far at a tight zoom, zoom out a little mid-flight so the move stays readable
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const need = Math.log(dist / 900);
  const lift = Math.max(0, need - Math.max(la, lb)) * Math.sin(Math.PI * e) * 0.9 + bump * Math.sin(Math.PI * e);
  const mpp = Math.exp(lerp(la, lb, e) + lift);
  // big zooms: tie the pan to the zoom (linear in mpp) so both endpoints stay on screen the whole way
  const ep = Math.abs(lb - la) > 1 ? Math.min(1, Math.max(0, (Math.exp(lerp(la, lb, e)) - a.mpp) / (b.mpp - a.mpp))) : e;
  return { x: lerp(a.x, b.x, ep), y: lerp(a.y, b.y, ep), mpp };
}

/** global time at which beat i's camera move begins (keys with `lead` start their move before the beat, so the
 *  subject is already on screen when its name is spoken) */
const moveStart = (sc, i) => sc[i].start - (KEYS[i]?.lead ?? 0);
const PUSH = 0.96;   // the slow push-in while a shot holds; the next move starts from the pushed framing (no jump)

function base(gt, tl) {
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (moveStart(sc, i) <= gt) b = i; });
  if (b === 0) { const d = sc[0].end - sc[0].start; return { ...KEYS[0], mpp: KEYS[0].mpp * lerp(1.0, 0.95, ease.inOutCubic(prog(gt - sc[0].start, 0, d))) }; }   // cold open: slow push
  if (b === 1) {
    const t = gt - sc[1].start, d = moveStart(sc, 2) - sc[1].start;
    return { x: 0, y: 0, mpp: KEYS[1].mpp * lerp(0.85, 1.0, ease.inOutCubic(prog(t, 0, d))) };
  }
  if (b === 14) {   // closing question: hold the ending's last frame
    const cam = base(sc[13].end - 1e-3, tl);
    cam.mpp *= lerp(1, 0.97, ease.inOutCubic(prog(gt - sc[14].start, 0, sc[14].end - sc[14].start)));
    return cam;
  }
  const key = KEYS[b];
  const t = gt - moveStart(sc, b), d = (b + 1 < sc.length && b + 1 < 14 ? moveStart(sc, b + 1) : sc[b].end) - moveStart(sc, b);
  const from = b === 2 ? KEYS[1] : { ...KEYS[b - 1], mpp: KEYS[b - 1].mpp * PUSH };
  const cam = travelTo(from, key, prog(t, 0, key.travel));
  cam.mpp *= lerp(1, PUSH, ease.inOutCubic(prog(t, key.travel, d - key.travel)));   // hold: slow push
  return cam;
}

/** Camera at global time gt: {x, y, mpp, anchor}. Pure function of gt. */
export function at(gt, tl) {
  const cam = base(gt, tl);
  cam.x += noise1(gt * 0.3, 1) * 4 * cam.mpp;
  cam.y += noise1(gt * 0.27, 2) * 4 * cam.mpp;
  cam.anchor = 0.47;
  return cam;
}
