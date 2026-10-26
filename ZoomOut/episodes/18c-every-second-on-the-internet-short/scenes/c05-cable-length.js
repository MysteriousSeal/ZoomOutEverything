// 18c beat 5 = 18 beats 13 + 14: "About 1.4 million kilometers of cable, | enough to wrap the Earth 35 times."
// s13 (one cable runs end to end, the km counter) then s14 (the thread winds 35 loops), split at the phrase break.
import S13 from './s13-cable-length.js';
import S14 from './s14-wrap-earth.js';
import { wrap, cuesOf } from '../legacy.js';

export default {
  ...wrap([{ o: 13, S: S13 }, { o: 14, S: S14 }]),
  chapter: { num: '05', title: '1.4 million km', sub: 'Of undersea cable' },
  cues: () => [...cuesOf(S13, 13, 5), ...cuesOf(S14, 14, 5)],
};
