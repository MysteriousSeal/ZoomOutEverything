// Beat 14: Mercury, Venus, Earth, Mars: | the rocky inner planets, | and past them, the asteroid belt.
// Builder C. Planets, orbits, the belt and their labels are drawn by layers/solar.js (labels timed to these words).
import { cueT } from '../layers/c-data.js';

export default {
  beat: 14,
  chapter: { num: '08', title: "The Solar System", sub: "Eight planets" },
  cues() {
    return [
      { t: cueT(14, 0, 'Mercury', 0.2), name: 'ping', gain: 0.14, pitch: 1.3 },
      { t: cueT(14, 0, 'Mars', 1.6), name: 'ping', gain: 0.12, pitch: 1.1 },
      { t: cueT(14, 2, 'asteroid', 5.4), name: 'shimmer', gain: 0.18, pitch: 1.0 },
    ];
  },
  drawOverlay() {},
};
