// 15c beat 2 — "Without its pumps, | New York's subway would flood in about two days."
// One merged line for 15b's beats 4 (s04: the x-ray scan and the pumps) and 5 (s05: the flood, 2 DAYS). On the legacy
// timeline (legacy.js) beat 4 is the "Without its" (~0.75 s: the scan runs, the pumps spin up) and beat 5 runs from
// "pumps" to the end of the line (the pumps die on "pumps,", the water fills the network, the clock and the flood lock
// on "two days"). Layers: s04 (1) then s05 (2) — nothing else draws between them in 15c's order. Only s05's label
// (2 DAYS / TO FLOOD THE SUBWAY) is shown: s04's ≈ 50 MILLION LITRES plate has no line of its own any more.
import { SCENE as S4 } from './s04-pumps.js';
import { SCENE as S5 } from './s05-flood.js';
import { oview } from '../legacy.js';

const B5 = 0.75;   // beat-relative start of 15b beat 5 for the cues (current voice: "pumps" at ~0.75 s)

export default {
  chapter: { num: '02', title: 'Flooded', sub: 'Beneath New York' },
  captions: true,
  layer: S4.layer,
  cues(d) {
    return [
      ...S4.cues(B5).filter((c) => c.t < B5 + 0.2),
      ...S5.cues(d - B5).map((c) => ({ ...c, t: c.t + B5 })),
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    ctx.save(); S4.drawWorld(ctx, oview(v, 4)); ctx.restore();
    S5.drawWorld(ctx, oview(v, 5));
  },
  drawOverlay(ctx, v) {
    const o = oview(v, 5);
    if (o.t < -0.01) return;
    S5.drawOverlay(ctx, o);   // k: the engine's (the beat's end is 15b beat 5's end)
  },
};
