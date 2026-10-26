// Camera for "If the Sun Were a Basketball" (60 s): one continuous TOP-DOWN pull-back. Owned by the orchestrator.
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
  { x: 0, y: 0, mpp: 0.00075, travel: 0 },                     // 0 the basketball (24 cm ≈ 320 px)
  { ...ring('mercury', 1.06, 0.25), travel: 1.6 },            // 1 (whole ring in frame)
  { ...ring('venus'), travel: 1.4 },                           // 2
  { ...ring('earth'), travel: 1.4 },                           // 3
  { x: E.x, y: E.y, mpp: 0.00028, travel: 1.6 },               // 4 macro: Earth + Moon, 6.6 cm apart
  { ...ring('mars'), travel: 1.7 },                            // 5
  { ...ring('jupiter'), travel: 1.6 },                         // 6
  { ...ring('saturn'), travel: 1.5 },                          // 7
  { x: 0, y: 0, mpp: (2 * 776) / 900, travel: 2.2 },          // 8 Uranus + Neptune (whole system)
  { x: 0, y: 0, mpp: (2 * 776) / 760, travel: 1.0 },           // 9 the whole solar system, breathing room
  { x: 3.28e6, y: 0, mpp: 13000, travel: 3.4 },                // 10 lift off to the globe (New York ↔ Rome midpoint), calm
  { x: 3.28e6, y: 0, mpp: 12300, travel: 0.6 },                // 11 the flight arc
  { x: 3.357e6, y: 4.84e5, mpp: 17500, travel: 2.0 },          // 12 the whole globe, dim and empty
];

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

function base(gt, tl) {
  const sc = tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= gt) b = i; });
  const t = gt - sc[b].start, d = sc[b].end - sc[b].start;
  if (b === 0) {
    const k = ease.inOutCubic(prog(t, 0, d));
    return { x: 0, y: 0, mpp: KEYS[0].mpp * lerp(0.85, 1.0, k) };
  }
  const key = KEYS[b];
  const cam = travelTo(KEYS[b - 1], key, prog(t, -0.05, key.travel));
  cam.mpp *= lerp(1, 0.96, ease.inOutCubic(prog(t, key.travel, d - key.travel)));   // hold: slow push
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
