// 18c beat 1 = 18 beat 1, "It starts with one phone." (s01: the phone for the whole film, its light, the one-second
// ring). Its "lighting up" moment is 0.1 s into the line (legacy.js); cue times follow it.
import S, { ringT, phraseAt } from './s01-one-phone.js';
import { wrap, cuesOf, LT } from '../legacy.js';

const s1 = () => LT.scenes[1].start;
export default {
  ...wrap([{ o: 1, S }]),
  cues: () => cuesOf(S, 1, 1, (q) => {
    if (q.t > 2 && q.t < 2.5) return phraseAt(LT, 1, 1) - 0.02 - s1() + (q.t - 2.12);   // notification + screen flare
    if (q.t > 3) return ringT(LT) + 1.0 - s1() + (q.t - 3.17);                            // the second completes
    return q.t;
  }),
};
