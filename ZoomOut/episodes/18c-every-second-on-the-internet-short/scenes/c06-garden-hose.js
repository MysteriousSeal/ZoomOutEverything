// 18c beat 6 = 18 beat 15, "In the deep sea, | many are as thick as a garden hose," (s15: the pin, the lens, the
// cable beside a garden hose). The lens folds back during the next beat (c07 draws s15's lensTail).
import S, { times } from './s15-garden-hose.js';
import { wrap, cuesOf, LT } from '../legacy.js';

export default {
  ...wrap([{ o: 15, S }]),
  chapter: { num: '06', title: 'The deep sea', sub: 'How thick is a cable?' },
  cues() {
    const T = times(LT), s = LT.scenes[15].start;
    const map = { 0.99: T.pin, 1.45: T.open - 0.24, 1.69: T.open, 1.72: T.open + 0.03, 2.3: T.thick - 0.35, 2.45: T.thick - 0.2, 2.65: T.thick, 2.99: T.garden };
    return cuesOf(S, 15, 6, (q) => (map[q.t] != null ? map[q.t] - s : T.close - s));
  },
};
