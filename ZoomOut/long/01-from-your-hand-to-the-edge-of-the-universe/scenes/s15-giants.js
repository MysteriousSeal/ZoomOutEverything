// Beat 15: Then the giants: | Jupiter, Saturn, Uranus, | and Neptune, four and a half billion kilometers out.
// Builder C. Drawn by layers/solar.js (giants, Kuiper belt, labels timed to these words).
import { cueT } from '../layers/c-data.js';

export default {
  beat: 15,
  chapter: null,
  cues() {
    return [
      { t: cueT(15, 1, 'Jupiter', 1.8), name: 'ping', gain: 0.14, pitch: 0.9 },
      { t: cueT(15, 2, 'Neptune', 4.3), name: 'ping', gain: 0.14, pitch: 0.75 },
    ];
  },
  drawOverlay() {},
};
