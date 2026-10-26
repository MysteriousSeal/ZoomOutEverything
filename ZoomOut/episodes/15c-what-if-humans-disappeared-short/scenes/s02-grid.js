// 15c beat 1 — "Within hours, | power plants would shut down, and the lights would go out."
// One merged line for 15b's beats 2 (s02: the Ravenswood plant shuts down) and 3 (s03: the city goes dark district by
// district). On the legacy timeline (legacy.js) beat 2 runs to just before "and the lights…" and beat 3 from there to
// the end of the line, so both scenes keep their own 15b code and timing. This beat draws s02's world (layer 0);
// s03's world (layer 3 in 15b) is drawn by s06-forest.js, the 15c layer-3 scene, so the layer order is 15b's.
// Two labels (v15fx): s02's WITHIN HOURS / POWER PLANTS SHUT DOWN to just before "and the lights…", then s03's
// LIGHTS OUT / THE GRID FAILS (entering faster than in 15b, so it reads ~1.6 s) to the end of the merged beat.
import { SCENE as S2 } from './s02-power-plants.js';
import { oview } from '../legacy.js';
import { label } from './s01-lights-on.js';

export default {
  chapter: { num: '01', title: 'The grid', sub: 'Within hours' },
  captions: true,
  layer: S2.layer,
  cues(d) {
    // beat-relative (current voice): "power plants" ~1.47 s, the plant dies on "shut down" ~2.42 s, the blackout
    // (15b beat 3) starts at ~2.8 s and its front is done by ~4.55 s
    const B3 = 2.8;
    return [
      { t: 0.35, name: 'swish', gain: 0.16, pitch: 0.9 },
      { t: 1.4, name: 'sonar', gain: 0.14, pitch: 0.6 },
      { t: 2.38, name: 'creak', gain: 0.2, pitch: 0.7 },
      { t: B3 + 0.1, name: 'deep', gain: 0.45, pitch: 0.6 },
      { t: B3 + 0.18, name: 'impact', gain: 0.28, pitch: 0.7 },
      { t: B3 + 0.5, name: 'tick', gain: 0.14, pitch: 1.6 },
      { t: B3 + 0.75, name: 'tick', gain: 0.13, pitch: 1.3 },
      { t: B3 + 1.05, name: 'tick', gain: 0.12, pitch: 1.8 },
      { t: B3 + 1.3, name: 'swish', gain: 0.2, pitch: 0.7 },
      { t: B3 + 1.75, name: 'impact', gain: 0.3, pitch: 0.5 },
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    S2.drawWorld(ctx, oview(v, 2));
  },
  drawOverlay(ctx, v) {
    // v15fx: two labels, one per half of the line. s02's WITHIN HOURS / POWER PLANTS SHUT DOWN leaves by the end of
    // its legacy window (just before "and the lights…"); s03's LIGHTS OUT / THE GRID FAILS then takes the same spot
    // for the blackout (~1.6 s, out by the beat end), so "the lights would go out" has its own label
    S2.drawOverlay(ctx, oview(v, 2));
    const o3 = oview(v, 3);
    if (o3.t > 0) label(ctx, o3, 'LIGHTS OUT', 'the grid fails', 0.12, 0.45);
  },
};
