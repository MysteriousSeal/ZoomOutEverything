// Beat 13 — "Saturday is Saturn's day. | Sunday, the Sun's. | Monday, the Moon's."
// The film's typographic signature, one morph per phrase (drawn by the names system in s12-roman-days.js):
//   SATUR·N → SATUR·DAY,  SUN → SUN·DAY,  MO·ON → MO·NDAY   (the shared prefix stays put; the suffix swaps
//   through a mask; a glint sweeps the new word; the Latin root "dies Saturni" wipes in beneath).
// env dims the other four lights (lightEmphasis); the names follow. Here: a small accent cursor glides from row
// to row (Saturday at the bottom, then up to Sunday and Monday) so the eye always knows where to look.
import * as L from '../../../../engine/runtime/lib.js';
import { TL, morphTimes, drawCursor } from './s12-roman-days.js';

const KEYS = ['saturn', 'sun', 'moon'];

export default {
  beat: 13,
  chapter: { num: '13', title: 'The names', sub: 'Saturn, Sun, Moon' },
  captions: true,
  layer: 0,
  cues(d) {
    const t0 = TL.scenes[13].start, MT = morphTimes(TL);
    const out = [];
    KEYS.forEach((key, n) => {
      const t = MT[key] - t0;
      if (n > 0) out.push({ t: t - 0.35, name: 'swish', gain: 0.12, pitch: 1.3 });
      out.push({ t: t + 0.12, name: 'swish', gain: 0.2, pitch: 0.9 + 0.1 * n });
      out.push({ t: t + 0.5, name: 'ping', gain: 0.22, pitch: [0.9, 1.06, 1.19][n] });
    });
    return out;
  },
  drawOverlay(c, v) {
    const MT = morphTimes(v.tl);
    drawCursor(c, v, KEYS, KEYS.map((k) => MT[k]), v.k);
  },
};
