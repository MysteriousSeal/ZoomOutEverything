// Layer "hand" (lf -1.5 → 2.4), builder A: the lawn (LOD textures), the park around the hero (paths, trees, sunbathers,
// walkers), and the hero (person, blanket, the hand at the origin). Fades out over lf 2.0–2.4 (builder B takes over).
import * as L from '../../../../engine/runtime/lib.js';
import { band } from '../world.js';
import { drawGrass } from './a-grass.js';
import { drawHero } from './a-hero.js';
import { drawPark } from './a-park.js';

let off = null;
export default {
  draw(c, v) {
    const lf = v.cam.lf;
    const k = band(lf, -1.7, -1.6, 2.0, 2.4);
    if (k <= 0) return;
    let g = c;
    if (k < 1) {   // fade the whole layer as one image (no see-through overlaps)
      off ??= new OffscreenCanvas(L.W, L.H);
      g = off.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, L.W, L.H);
    }
    drawGrass(g, v);
    const park = lf > 0.75;
    if (park) drawPark(g, v, 'ground');
    drawHero(g, v);
    if (park) drawPark(g, v, 'crowns');
    if (k < 1) { c.save(); c.globalAlpha = k; c.drawImage(off, 0, 0); c.restore(); }
  },
};
