// Beat 11 — "About four hundred million years ago, | a year had roughly four hundred days."
// Rewind: a comet sweeps backwards round the calendar ring four times (the ticks flare as it passes) while a
// counter runs to "400 million / years ago" and the Earth glyph spins faster (shorter days). Then the same ring
// re-divides: its ticks slide closer and new ones grow in until there are 400 (the count on the ring follows),
// and "≈ 400 days / in a year · each day ≈ 22 h" lands. The ring itself lives in s10 (tickCount / rewindHead).
import * as L from '../../../../engine/runtime/lib.js';
import { ringTimes } from './s10-slowing-down.js';

const { W, ease, prog } = L;

export default {
  beat: 11,
  chapter: { num: '11', title: '400 days', sub: '400 million years ago' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.1, name: 'riser', gain: 0.22, pitch: 0.7 },         // the rewind starts
      { t: 0.15, name: 'whoosh', gain: 0.26, pitch: 0.75 },      // comet sweeps
      { t: 0.75, name: 'whoosh', gain: 0.22, pitch: 0.9 },
      { t: 1.35, name: 'whoosh', gain: 0.18, pitch: 1.05 },
      { t: 0.2, name: 'count', gain: 0.18, pitch: 0.9 },         // the counter
      { t: 2.3, name: 'tick', gain: 0.26, pitch: 0.9 },          // 400 million: lock
      { t: 2.6, name: 'shimmer', gain: 0.24, pitch: 1.1 },       // the ring re-divides
      { t: 3.6, name: 'bloom', gain: 0.3, pitch: 0.8 },          // "≈ 400 days"
    ];
  },
  drawOverlay(ctx, v) {
    const R = ringTimes(v.tl), gt = v.gt;
    // phrase 1: the rewind counter
    // the count finishes early; "400 million" holds through the ring re-division and hands off to "≈ 400 days" (no empty centre)
    const dur = Math.max(0.6, Math.min(R.rew1 - R.rew0 - 0.15, R.div0 - 0.05 - (R.rew0 + 0.05) - 0.3));
    const run = ease.inOutCubic(prog(Math.round(gt * 30) / 30, R.rew0 + 0.05, dur));   // frame-stable count
    const cnt = 400 * run;
    // nothing until the counter passes ~10 (a "0 million" frame reads as a mistake)
    const k1 = v.k * prog(gt, R.rew0 + 0.05, 0.4) * L.clamp((cnt - 6) / 10) * (1 - ease.inCubic(prog(gt, Math.max(R.div0 - 0.05, R.four - 0.45), 0.25)));
    if (k1 > 0) {
      const n = Math.max(10, Math.round(cnt / 10) * 10);
      L.bigLabel(ctx, { x: W / 2, y: 632, big: `${n} million`, small: 'years ago', k: k1, accent: [236, 240, 248], align: 'center', size: 80 });
    }
    // phrase 2: the answer
    const k2 = v.k * prog(gt, R.four - 0.25, 0.5) * (1 - ease.inCubic(prog(gt, R.s12 - 0.4, 0.3)));   // off before the dive starts   // hands off with no empty frame (k1 is gone at four − 0.2)
    L.bigLabel(ctx, { x: W / 2, y: 632, big: '≈ 400 days', small: 'in a year · each day ≈ 22 h', k: k2, accent: v.accent, align: 'center', size: 80 });
  },
};
