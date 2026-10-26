// 18c beat 4 = 18 beat 12, "And between continents, | it goes under the sea." (18 beats 8-11 are cut: the camera
// climbs from the city straight to the whole planet during "And between continents,"). s12's ripple, pings and label
// run from its second phrase (s12 tU()), as do the cables (env.cablesStart).
import S, { tU } from './s12-under-the-sea.js';
import { wrap, cuesOf, LT } from '../legacy.js';

export default {
  ...wrap([{ o: 12, S }]),
  chapter: { num: '04', title: 'Under the sea', sub: 'Submarine cables' },
  cues: () => { const off = -tU({ gt: LT.scenes[12].start, tl: LT }); return cuesOf(S, 12, 4, (q) => q.t + off); },
};
