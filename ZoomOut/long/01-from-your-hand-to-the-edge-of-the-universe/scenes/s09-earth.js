// Beat 9: The Earth. | Twelve thousand seven hundred kilometers across.
// Builder B. The whole planet (layers/earth.js, real Earth, 15 July 2026 19:30 UTC): its diameter as a bracket, and
// a pin on New York, where the hand is.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH } from '../camera.js';
import { ll } from '../layers/b-geo.js';
import { phrase, enter, bracket, pin, text } from '../layers/b-label.js';

const B = 9;
const NYC = ll(40.7128, -74.006);

export default {
  beat: 9,
  chapter: { num: '05', title: "The Earth", sub: "12,742 km across" },
  cues() {
    return [
      { t: 0.15, name: 'deep', gain: 0.22, pitch: 0.8 },
      { t: phrase(B, 1) + 0.3, name: 'ping', gain: 0.15, pitch: 0.95 },
    ];
  },
  drawOverlay(c, v) {
    const cx = v.wx(0), cy = v.wy(0), r = v.ws(R_EARTH);
    // the diameter: a vertical bracket just right of the disc
    const k = enter(v, phrase(B, 1) + 0.1, 1.0);
    const x = cx + r + 46;
    bracket(c, x, cy - r, x, cy + r, k, '12,742 KM', { labelSide: -1, size: 24, sub: '7,918 MILES', upright: true });
    // New York (the hand), small
    const kn = enter(v, 0.9, 0.6);
    const nx = v.wx(NYC.x), ny = v.wy(NYC.y);
    pin(c, nx, ny, kn, { r: 4 });
    text(c, 'NEW YORK', nx - 14, ny + 2, { size: 16, alpha: kn * 0.95, align: 'right', track: 3 });
  },
};
