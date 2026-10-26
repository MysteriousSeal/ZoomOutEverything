// Camera for "How Much Water Is on Earth, Really?" (60 s). Owned by the orchestrator.
//
// WORLD: metres, a flat 2D view of space. Earth at the origin (radius 6,371 km). Water spheres float beside it:
//   ALL    every drop of water, Ø 1,385 km
//   FRESH  liquid fresh water, Ø 273 km (to the right of ALL)
//   LAKES  lakes and rivers, Ø 56 km (to the right of FRESH)
//   MOON_CMP a Moon outline (Ø 3,474 km) to the right of ALL (away from Earth, so the two never touch), only for beat 5
import { makeCamera } from '../../../engine/runtime/kit.js';

export const R_EARTH = 6.371e6;
export const ALL = { x: 4.6e6, y: 6.6e6, d: 1.385e6 };
export const FRESH = { x: ALL.x + 0.95e6, y: ALL.y + 0.2e6, d: 2.73e5 };
export const LAKES = { x: FRESH.x + 0.24e6, y: FRESH.y + 0.04e6, d: 5.6e4 };
export const MOON_CMP = { x: ALL.x + 2.75e6, y: ALL.y, d: 3.474e6 };
const PAIR = { x: 2.3e6, y: 3.3e6 };

const cam = makeCamera([
  // beats 0-1: Earth ~650 px tall, so the headline / 71% label sit above the limb and the ring clears the captions
  { x: 0, y: 0, mpp: 1.95e4, travel: 0 },                               // 0 Earth
  { x: 0, y: 0, mpp: 1.95e4, travel: 0.8, push: 0.975 },                // 1 71% ocean
  { x: 1.4e6, y: 1.9e6, mpp: 1.85e4, travel: 1.6 },                     // 2 every drop lifts off
  { ...PAIR, mpp: 1.95e4, travel: 1.4 },                                // 3 one ball forms
  { x: ALL.x, y: ALL.y, mpp: 2.7e3, travel: 1.8 },                      // 4 1,385 km
  { x: ALL.x + 1.9e6, y: ALL.y, mpp: 5.8e3, travel: 1.4 },              // 5 vs the Moon (ball + Moon centred, ~75 px margins)
  { ...PAIR, mpp: 1.95e4, travel: 1.8 },                                // 6 a small blue bead
  { x: ALL.x + 0.3e6, y: ALL.y + 0.05e6, mpp: 2.9e3, travel: 1.8 },     // 7 keep only liquid fresh water
  { x: FRESH.x, y: FRESH.y, mpp: 5.6e2, travel: 1.6 },                  // 8 273 km
  { x: FRESH.x + 0.12e6, y: FRESH.y + 0.02e6, mpp: 7.5e2, travel: 1.2 },// 9 lakes and rivers
  { x: LAKES.x, y: LAKES.y, mpp: 1.15e2, travel: 1.6 },                 // 10 56 km, London for scale
  { x: LAKES.x, y: LAKES.y, mpp: 1.1e2, travel: 0.6 },                  // 11 life depends on it
  { x: PAIR.x + 0.2e6, y: PAIR.y, mpp: 2.05e4, travel: 1.7 },          // 12 back to the blue planet (Earth in by 'A blue planet')
], { anchor: 0.47, hookFrom: 0.9 });
export const at = cam.at;
