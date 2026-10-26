// Beat 17: A light-year is nearly ten trillion kilometers. | Around the Sun, the Oort cloud may hold trillions of icy comets, | stretching more than a light-year out.
// Builder C. The Oort cloud, the 1-light-year ring and the labels are drawn by layers/solar.js.
import { cueT } from '../layers/c-data.js';

export default {
  beat: 17,
  chapter: { num: '10', title: "The Oort Cloud", sub: "The Sun's outermost realm" },
  cues() {
    return [
      { t: cueT(17, 1, 0, 3.6) - 0.2, name: 'swell', gain: 0.26, pitch: 0.8 },
      { t: cueT(17, 2, 0, 8.1), name: 'shimmer', gain: 0.12, pitch: 0.9 },
    ];
  },
  drawOverlay() {},
};
