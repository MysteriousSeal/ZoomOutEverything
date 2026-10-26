// Beat 12 — "For every one of us, | about thirteen people have already come and gone."
// The seven coral cells pour into one bright figure ("one of us"). Then the 93 dim cells stream, strip by strip,
// into 13 faint figures standing in a row behind it, left to right; each lands with a soft flash and settles to a
// ghost, while the label counts 1 : 1 … 1 : 13. A quiet final hold: slow push, breathing light.
// Drawn by the shared finale system in s09-one-more.js (this beat owns its time slice).
import { drawFinale, owns, ghostLand, GHOST } from './s09-one-more.js';

export default {
  beat: 12,
  chapter: { num: '12', title: 'Thirteen before you', sub: 'Most humans are in the past' },
  captions: true,
  layer: 0,
  cues(d) {
    // ghost g lands at 1.9 + 0.14·g + 0.95 s into the beat (see ghostLand in s09)
    const T0 = { s12: 0 };
    const ghosts = Array.from({ length: GHOST.n }, (_, g) => ({ t: ghostLand(T0, g) - 0.1, name: 'tick', gain: 0.16 + 0.006 * g, pitch: 0.9 + g * 0.05 }));
    return [
      { t: 0.15, name: 'whoosh', gain: 0.24, pitch: 0.75 },   // coral cells pour into one figure
      { t: 1.05, name: 'bloom', gain: 0.4, pitch: 1.0 },      // the figure lights up: "one of us"
      { t: 1.9, name: 'shimmer', gain: 0.22, pitch: 0.8 },    // the dim cloud starts streaming
      ...ghosts,
      { t: ghostLand(T0, GHOST.n - 1) + 0.1, name: 'swell', gain: 0.25, pitch: 0.6 },   // 1 : 13 — the quiet hold
    ].filter((c) => c.t < d);
  },
  drawOverlay(ctx, v) {
    if (owns(v, 12)) drawFinale(ctx, v);
  },
};
