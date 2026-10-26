// 18c beat 3 = 18 beats 6 + 7: "YouTube gets about 8 hours of new video. | Every second."
// s06 (the glass timeline over the city, label "8 hours / of new video every second") holds its panel and label
// through 18 beat 7 (kEnd), where s07 plays only its collapse point and the pulse across the city (no 60 s ring:
// "Not every minute" is cut). The camera's pull-out from the phone to the city runs in the first 2.3 s (camera.js).
import S6, { times as t6 } from './s06-youtube.js';
import S7, { times as t7 } from './s07-every-second.js';
import { wrap, cuesOf, LT } from '../legacy.js';

export default {
  ...wrap([{ o: 6, S: S6, kEnd: 7 }, { o: 7, S: S7 }]),
  chapter: { num: '03', title: 'New video', sub: 'Uploaded to YouTube' },
  cues() {
    const T = t6(LT), s = T.s, U = t7(LT), s7 = U.s;
    const at6 = [T.panel - 0.02, T.fill0, T.fill0 + 0.13, T.label - 0.04, T.fill1, T.fill1 + 0.04];
    return [
      ...cuesOf(S6, 6, 3, (q, d) => at6[[0.6, 0.95, 1.08, 1.44, 1.82, 1.86].indexOf(q.t)] - s),
      ...cuesOf(S7, 7, 3, (q) => (q.t < 1 ? null : U.pulse - s7 + (q.t - 2.06))),   // the ring's cues go with the ring
    ];
  },
};
