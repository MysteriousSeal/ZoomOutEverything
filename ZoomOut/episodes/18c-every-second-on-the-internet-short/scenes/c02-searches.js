// 18c beat 2 = 18 beat 2, "In that second, | Google gets over 100,000 searches." (s02: the stream, "100,000+").
import S, { T0, T_HIT } from './s02-searches.js';
import { wrap, cuesOf, LT } from '../legacy.js';

const s2 = () => LT.scenes[2].start;
export default {
  ...wrap([{ o: 2, S }]),
  chapter: { num: '02', title: 'Searches', sub: 'Typed into Google' },
  cues: () => cuesOf(S, 2, 2, (q) => {
    if (q.t > 1.5 && q.t < 2.5) return T0(LT) - s2() + (q.t - 1.85);      // "Google gets…": the stream starts
    if (q.t > 3) return T_HIT(LT) - s2() + (q.t - 3.18);                    // "hundred thousand"
    return q.t;
  }),
};
