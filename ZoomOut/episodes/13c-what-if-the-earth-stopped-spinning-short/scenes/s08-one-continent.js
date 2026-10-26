// 13c beat 5 (BEAT.continent; 13b's beat 8) — "Two polar oceans, and one giant continent around the middle."
// The end state lands (drawn by s05 from real elevation): two polar oceans over Canada, northern Eurasia and the
// Southern Ocean, and one ring of land (old continents plus exposed sea floor) all the way round the middle.
// On "polar oceans" the oceans take a slow cyan swell; on "continent" a warm light sweeps east along the ring.
// Label (top left, colour-coded like the map): "2 oceans" in the accent, "1 continent" in sand.
// The whole effect fades out during the day beat's pull-out (s05's state.fade). 13c: beat 5 (BEAT.continent).
import * as L from '../../../../engine/runtime/lib.js';
import { labelBacking } from './s06-bulge.js';
import { W8 } from './s05-oceans-move.js';
import { BEAT } from '../env.js';

const SAND = [226, 196, 140];

export default {
  beat: BEAT.continent,
  chapter: { num: '05', title: 'One continent', sub: 'and two polar oceans' },
  captions: true,
  layer: 3,
  cues() {
    return [
      { t: W8.polar, name: 'deep', gain: 0.34, pitch: 0.8 },
      { t: W8.oceans, name: 'tick', gain: 0.28, pitch: 1.1 },
      { t: W8.continent - 0.1, name: 'shimmer', gain: 0.26, pitch: 0.75 },
      { t: W8.continent, name: 'tick', gain: 0.26, pitch: 0.95 },
    ];
  },
  // the polar-ocean glow and the warm sweep along the continent are baked into s05's per-pixel surface
  drawOverlay(ctx, v) {
    const t = v.t;
    const k1 = v.k * L.prog(t, W8.oceans - 0.2, 0.55);
    if (k1 <= 0) return;
    // one line, high: '2 oceans' then a smaller '1 continent' beside it, so the north cap's shoreline stays clear
    const x = 64, y = 424;            // above the globe (camera holds it low in beat 8)
    labelBacking(ctx, x, y - 30, k1, { sx: 2.3, sy: 0.55, dx: 330, a: 0.62 });
    L.bigLabel(ctx, { x, y, big: '2 oceans', k: k1, accent: v.accent, size: 84 });
    const k2 = v.k * L.prog(t, W8.continent - 0.15, 0.55);
    if (k2 > 0) {
      const e = L.ease.outCubic(L.clamp(k2));
      ctx.save();
      ctx.font = L.font(84, 800, L.FONT.display);
      const x2 = x + ctx.measureText('2 oceans').width + 30;
      ctx.globalAlpha *= L.clamp(k2 * 1.4);
      ctx.font = L.font(66, 800, L.FONT.display);
      ctx.fillStyle = L.rgba(SAND);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 18;
      L.trackedText(ctx, '1 continent', x2, y + (1 - e) * 24, -1);
      ctx.restore();
    }
  },
};
