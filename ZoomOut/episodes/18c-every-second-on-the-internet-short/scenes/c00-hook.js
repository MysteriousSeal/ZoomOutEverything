// 18c beat 0 = 18 beat 0, the hook ("What happens on the internet in one single second?"): s00 on the legacy timeline
// (legacy.js). It also draws s03's bed (18 beat 3 is cut, but the bed is a world prop of the room, seen on the pull-out
// in 18c beat 3), under s00's darkness: this 18c scene sits on layer -1, where s03 was.
import S from './s00-hook.js';
import { drawBed } from './s03-eight-billion.js';
import { wrap, oview, cuesOf } from '../legacy.js';

const W = wrap([{ o: 0, S }]);
export default {
  ...W,
  layer: -1,
  cues: () => cuesOf(S, 0, 0),
  drawWorld(c, v) {
    c.save(); drawBed(c, oview(v, 3)); c.restore();
    W.drawWorld(c, v);
  },
};
