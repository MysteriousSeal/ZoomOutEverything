// Camera for "How Fast Is Light, Really?" (60 s): follow one photon outward. Owned by the orchestrator.
//
// WORLD: top-down space in metres, Earth at the origin. Positions are true distances (directions chosen for layout):
//   MOON 384,400 km · SUN 1 AU · NEPTUNE 30 AU from the Sun · VOYAGER 1 ~165 AU from the Sun
//   PROXIMA 4.24 ly · GALAXY: Milky Way centre 26,000 ly away (disc radius 50,000 ly) · deep field ~13 billion ly
import { makeCamera } from '../../../engine/runtime/kit.js';

export const C = 299792458;
export const LY = 9.4607e15;
const DEG = Math.PI / 180;
const at_ = (r, a, o = { x: 0, y: 0 }) => ({ x: o.x + r * Math.cos(a * DEG), y: o.y + r * Math.sin(a * DEG) });
export const R_EARTH = 6.371e6;
export const MOON = at_(3.844e8, -25);
export const SUN = at_(1.496e11, -20);
export const NEPTUNE = at_(4.495e12, 150, SUN);
export const VOYAGER = at_(2.47e13, 70, SUN);
export const PROXIMA = at_(4.24 * LY, 205);
export const GALAXY = { ...at_(26000 * LY, -100), r: 50000 * LY };
export const DEEP_R = 13e9 * LY;
const mid = (a, b = { x: 0, y: 0 }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const mix = (a, b, f) => ({ x: b.x + (a.x - b.x) * f, y: b.y + (a.y - b.y) * f });   // f of the way from b to a

const cam = makeCamera([
  { x: 0, y: 0, mpp: 2.6e4, travel: 0 },                         // 0 hook: Earth
  { x: 0, y: 0, mpp: 2.4e4, travel: 0.8 },                       // 1 299,792 km/s
  { x: 0, y: 0, mpp: 2.25e4, travel: 0.8 },                      // 2 7.5 laps around Earth
  { ...mid(MOON), mpp: 4.7e5, travel: 1.6 },                     // 3 the Moon, 1.3 s
  { ...mid(SUN), mpp: 1.9e8, travel: 1.1 },                      // 4 the Sun, 8 min 20 s (Sun in frame on 'Sunlight takes')
  { ...mid(SUN), mpp: 1.8e8, travel: 0.6 },                      // 5 old light
  { ...SUN, mpp: 1.05e10, travel: 1.8 },                         // 6 Neptune, 4 h
  { ...mix(VOYAGER, SUN, 0.6), mpp: 4.0e10, travel: 1.6, push: 0.98 }, // 7 Voyager 1, ~23 h (probe at y ~1160, above the captions)
  { ...mid(PROXIMA), mpp: 4.8e13, travel: 1.0 },                // 8 Proxima, 4.2 years (in frame on 'The nearest star?')
  { x: GALAXY.x, y: GALAXY.y, mpp: 1.1e18, travel: 2.2 },        // 9 the Milky Way
  // deep field at true scale: the most distant galaxy (13.4 Gly) on screen in beat 10, the 13.8 Gly horizon
  // ring (r ≈ 410-420 px) inside the frame in beat 12, with a slow pull-out (push > 1) instead of a push-in
  { x: 0, y: 0, mpp: 2.7e23, travel: 1.9, push: 0.97 },          // 10 the deep field
  { x: 0, y: 0, mpp: 2.9e23, travel: 0.6, push: 1.02 },          // 11
  { x: 0, y: 0, mpp: 3.1e23, travel: 0.6, push: 1.03 },          // 12
], { anchor: 0.48 });
export const at = cam.at;
