// 18c beat 7 = 18 beat 16, "yet they carry over 99% of the traffic between continents." (s16: the network
// brightens, the 99% ring gauge, "99%+"). It also draws the fold-back of s15's lens in its first 0.5 s. 18 beat 17
// (the turn home and the dive) starts 0.05 s after this line's last word, inside the 1.4 s voice hold (legacy.js).
import S, { times } from './s16-ninety-nine.js';
import { lensTail } from './s15-garden-hose.js';
import { wrap, oview, cuesOf, LT } from '../legacy.js';

const W = wrap([{ o: 16, S }]);
export default {
  ...W,
  chapter: { num: '07', title: 'The backbone', sub: 'Cables vs satellites' },
  chapterUntil() { return 1.15; },
  cues: () => { const off = times(LT).n - LT.scenes[16].start - 1.44; return cuesOf(S, 16, 7, (q) => q.t + off); },
  drawOverlay(c, v) {
    c.save(); lensTail(c, oview(v, 15, { k: 1 })); c.restore();
    W.drawOverlay(c, v);
  },
};
