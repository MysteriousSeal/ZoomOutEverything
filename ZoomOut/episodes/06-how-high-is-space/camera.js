// Camera for "How High Is Space, Really?" (60 s): one continuous ascent. Owned by the orchestrator.
//
// WORLD: SIDE VIEW in metres. x horizontal, y = −altitude (up is negative). The ground is the top of a circle of
// radius R_EARTH centred at (0, +R_EARTH), so at small scales it looks flat and the final pull-back reveals the globe.
//   person (1.75 m) at x = 0 · Statue of Liberty (93 m) at x ≈ +60 · Eiffel Tower (330 m) at x ≈ +260
//   Burj Khalifa (828 m) at x ≈ +620 · Everest (8,849 m) massif centred at x ≈ −6,800, its foot ending ~1.5 km left of the person (no overlap with the towers)
//   jet at ~11 km · 30 km "99% of the air" line · balloon jump 39 km · Kármán line 100 km · ISS orbit 400 km
import { makeCamera } from '../../../engine/runtime/kit.js';

export const R_EARTH = 6.371e6;
export const ALT = { liberty: 93, eiffel: 330, burj: 828, everest: 8849, jets: 11000, air99: 30000, balloon: 39000, karman: 100000, iss: 400000 };
export const X = { person: 0, liberty: 60, eiffel: 260, burj: 620, everest: -6800 };

const cam = makeCamera([
  { x: 0, y: -1.2, mpp: 0.0055, travel: 0 },          // 0 a person looking up
  // beats 1-3: ground held at y ~1245-1255 (bases clear of the caption band), tips at ~555-570 (under the label plate)
  { x: 40, y: -39, mpp: 0.138, travel: 1.0 },          // 1 Statue of Liberty
  { x: 170, y: -139, mpp: 0.49, travel: 1.5 },         // 2 Eiffel Tower (right leg stays x <= 960)
  { x: 330, y: -348, mpp: 1.23, travel: 1.4 },         // 3 Burj Khalifa
  { x: -3550, y: -4700, mpp: 10.5, travel: 1.8 },      // 4 Everest (summit x ~230, Burj x ~930 on screen)
  { x: -2000, y: -8200, mpp: 13, travel: 1.4 },        // 5 jets above the summit
  { x: 0, y: -16500, mpp: 33, travel: 1.6 },           // 6 30 km: 99% of the air below
  { x: 0, y: -22000, mpp: 44, travel: 1.4 },           // 7 the balloon jump at 39 km
  { x: 0, y: -54000, mpp: 105, travel: 1.4 },          // 8 the Kármán line (in frame by ~35.4, on "one hundred kilometers")
  { x: 0, y: -54000, mpp: 100, travel: 0.6 },          // 9 "an hour's drive"
  { x: 0, y: -215000, mpp: 420, travel: 1.3 },         // 10 the ISS at 400 km (in frame on "Space Station")
  { x: 0, y: R_EARTH - 1.2e6, mpp: 15500, travel: 1.9 }, // 11 pull back to the globe (sits ~80 px low: room above the limb)
  { x: 0, y: R_EARTH - 1.2e6, mpp: 16500, travel: 1.0 }, // 12 hold
], { anchor: 0.5 });
export const at = cam.at;
export const KEYS = cam.KEYS;
// the altitude of each beat's SUBJECT: the HUD readout counts up to it over the beat's travel
export const SUBJECT = [1.75, ALT.liberty, ALT.eiffel, ALT.burj, ALT.everest, ALT.jets, ALT.air99, ALT.balloon,
  ALT.karman, ALT.karman, ALT.iss, ALT.iss, ALT.iss];
