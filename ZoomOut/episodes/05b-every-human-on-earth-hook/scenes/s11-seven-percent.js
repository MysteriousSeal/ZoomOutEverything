// Beat 11 — "Everyone alive today is just seven percent of them."
// The field sorts itself into a 10 × 10 waffle in a diagonal wave; the coral dots stream up into the first seven
// cells of the top row. On "seven percent" a light sweep runs along the coral cells and the label lands: ≈ 7 %.
// Drawn by the shared finale system in s09-one-more.js (this beat owns its time slice).
import { drawFinale, owns } from './s09-one-more.js';

export default {
  beat: 11,
  chapter: { num: '11', title: 'Seven percent', sub: 'Alive right now' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.15, name: 'whoosh', gain: 0.26, pitch: 0.9 },    // dots fly into the grid
      { t: 0.45, name: 'shimmer', gain: 0.22, pitch: 1.2 },
      { t: 1.2, name: 'tick', gain: 0.18, pitch: 1.0 },       // cells settle
      { t: 1.95, name: 'ping', gain: 0.4, pitch: 1.1 },       // "seven percent"
      { t: 1.97, name: 'bloom', gain: 0.25, pitch: 1.0 },
    ].filter((c) => c.t < d);
  },
  drawOverlay(ctx, v) {
    if (owns(v, 11)) drawFinale(ctx, v);
  },
};
