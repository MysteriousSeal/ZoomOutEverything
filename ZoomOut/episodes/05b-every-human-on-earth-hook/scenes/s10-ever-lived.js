// Beat 10 — "About a hundred and seventeen billion humans have ever lived."
// The view pulls back from the coral block (everyone alive) while a dim field of dots ripples outward around it:
// everyone who has ever lived. The field is 81 × 81 dots around the 21 × 21 coral block, the true ≈ 7 % ratio.
// The counter rolls from 8,200,000,000 to ≈ 117,000,000,000 and cools from coral to cream.
// Drawn by the shared finale system in s09-one-more.js (this beat owns its time slice).
import { drawFinale, owns } from './s09-one-more.js';

export default {
  beat: 10,
  chapter: { num: '10', title: 'Everyone who ever lived', sub: 'Since the first modern humans' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.15, name: 'riser', gain: 0.22, pitch: 0.7 },     // the field starts to ripple out
      { t: 0.4, name: 'shimmer', gain: 0.28, pitch: 0.9 },
      { t: 0.4, name: 'count', gain: 0.22, pitch: 1.0 },      // the counter rolls …
      { t: 1.3, name: 'count', gain: 0.18, pitch: 1.1 },
      { t: 2.75, name: 'impact', gain: 0.32, pitch: 0.8 },    // … and lands on 117 billion
      { t: 2.77, name: 'bloom', gain: 0.3, pitch: 0.75 },
    ].filter((c) => c.t < d);
  },
  drawOverlay(ctx, v) {
    if (owns(v, 10)) drawFinale(ctx, v);
  },
};
