// Beat 8 — "That ball is just 273 kilometers wide."
// Close on the liquid-fresh-water ball: it settles, a diameter line and bracket measure it, the label lands.
// Draws the FRESH ball from beat 8 to the end of the film (s07 draws it while it separates).
import * as L from '../../../../engine/runtime/lib.js';
import { FRESH } from '../camera.js';
import { B, FRESHC, diameter, waterBall } from './s04-1385-km.js';
import { freshWob } from './s07-fresh.js';

const T_DIM = 1.05;     // "two hundred…"
const T_LABEL = 1.35;

export default {
  beat: 8,
  chapter: { num: '08', title: 'Liquid fresh water', sub: 'Lakes, rivers, swamps, groundwater' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.2, name: 'swell', gain: 0.22, pitch: 1.1 },
      { t: T_DIM, name: 'tick', gain: 0.3, pitch: 1.25 },
      { t: T_LABEL + 0.05, name: 'impact', gain: 0.34, pitch: 1.05 },
      { t: T_LABEL + 0.15, name: 'shimmer', gain: 0.2, pitch: 1.4 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.gt < B(v, 8)) return;
    waterBall(ctx, v, FRESH.x, FRESH.y, FRESH.d, { base: FRESHC, wob: freshWob(v), seed: 4.1, glow: 0.3 });
  },

  drawOverlay(ctx, v) {
    const cx = v.wx(FRESH.x), cy = v.wy(FRESH.y), r = v.ws(FRESH.d / 2);
    diameter(ctx, cx, cy, r, L.prog(v.t, T_DIM, 0.8) * v.k);
    const k = L.enter(v.t, T_LABEL, 0.55) * v.k;
    L.bigLabel(ctx, { x: L.W / 2, y: L.clamp(cy - r - 92, 470, 560), big: '273 km', small: '170 mi · liquid fresh water', k, accent: v.accent, align: 'center' });
  },
};
