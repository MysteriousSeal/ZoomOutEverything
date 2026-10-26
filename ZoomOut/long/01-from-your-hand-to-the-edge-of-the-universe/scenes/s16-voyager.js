// Beat 16: Voyager 1, launched in nineteen seventy-seven, | is the farthest object humans have ever built. | It's nearly a full light-day away.
// Builder C. Voyager's path, the heliopause, the 1-light-day ring and their labels are drawn by layers/solar.js.
import { cueT } from '../layers/c-data.js';

export default {
  beat: 16,
  chapter: { num: '09', title: "Voyager 1", sub: "Our farthest spacecraft" },
  cues() {
    return [
      { t: cueT(16, 0, 0, 0.15) + 2.6, name: 'blip', gain: 0.2, pitch: 1.2 },
      { t: cueT(16, 2, 0, 7.0), name: 'shimmer', gain: 0.16, pitch: 1.2 },
    ];
  },
  drawOverlay() {},
};
