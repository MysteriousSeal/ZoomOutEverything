// Beat 16 — "That's about one percent of you, | almost four million cells every second."
// Phrase 1: the daily number becomes a share: "≈ 1%" of you, every day (the sparks keep blinking through the body).
// Phrase 2: the label rolls over into the counter of cells replaced SINCE THE CLOCK STARTED (env.cellsReplaced): an
// odometer reading ≈ 263 million and climbing ≈ 3.8 million a second, thumping on each stopwatch second. A ring pulses
// around the stopwatch in the hand on the same seconds, so the number is visibly the clock's.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, cellsReplaced } from '../env.js';
import { adapt } from '../legacy.js';
import { TT, drawCounter, watchRing, secondBeat, frameTime } from './s14-strangest.js';

const P1 = TT.onePct - 0.25;      // "≈ 1%" lands on "one percent"
const P1_OUT = TT.almost - 0.4;   // ...and steps aside for the counter
const C_IN = TT.almost + 0.02;    // the counter rolls in on "almost"
const L1 = TT.almost + 0.3;       // "cells replaced since the clock started"
const L2 = Math.max(TT.four + 0.1, L1 + 0.2);   // "≈ 4 million every second" (17c: "four" opens phrase 2)

export const SCENE = {
  beat: 16,
  chapter: { num: '16', title: 'Every second', sub: 'about 1% of you, every day' },
  captions: true,
  layer: 3,
  cues() {
    const b = TT.b16;
    return [
      { t: P1 - b + 0.05, name: 'ping', gain: 0.28, pitch: 1.1 },
      { t: P1_OUT - b + 0.05, name: 'swish', gain: 0.16, pitch: 1.2 },
      { t: C_IN - b, name: 'count', gain: 0.3, pitch: 1.0 },
      { t: L2 - b, name: 'tick', gain: 0.22, pitch: 1.3 },
    ];
  },
  drawWorld(c, v) {
    // the stopwatch ring: from the counter's arrival to the push into the belly
    // 17c: no push into the belly (beat 17 cut): the ring hands over to s18's ring (in from b18 + 0.5) instead
    const k = L.ease.outCubic(L.prog(v.gt, C_IN + 0.2, 0.5)) * (1 - L.ease.inCubic(L.prog(v.gt, TT.b18 + 0.5, 0.5)));
    watchRing(c, v, k);
  },
  drawOverlay(c, v) {
    const gt = v.gt;
    // phrase 1: ≈ 1%
    const pk = L.prog(gt, P1, 0.5) * (1 - L.ease.inCubic(L.prog(gt, P1_OUT, 0.35)));
    if (pk > 0) L.bigLabel(c, { x: 540, y: 470, big: '≈ 1%', small: 'of your cells, every day', k: v.k * pk, accent: ACCENT, align: 'center', size: 140 });
    // phrase 2: the counter
    const ck = L.prog(gt, C_IN, 0.6);
    if (ck > 0) {
      drawCounter(c, {
        x: 540, y: 470, n: cellsReplaced(frameTime(gt), v.tl), size: 116, k: ck, fade: 1, beat: secondBeat(gt, v.tl),   // 17c: the digits stay to the cut: s18 continues them in place (no exit + re-entry)
        lines: [
          { text: 'cells replaced since the clock started', k: v.k * L.prog(gt, L1, 0.5), size: 27 },
          { text: '≈ 4 million every second', k: v.k * L.prog(gt, L2, 0.5), size: 27, color: [255, 160, 168] },
        ],
      });
    }
  },
};

// 17c: 17 beat 16 plays as a 17c beat on the legacy timeline (legacy.js); chapter renumbered
export default adapt(SCENE, 16, { chapter: { num: '10', title: 'Every second', sub: 'about 1% of you, every day' } });
