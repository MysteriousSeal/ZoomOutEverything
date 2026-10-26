// Beat 27: Ours is called {Laniakea~Lah-nee-ah-kay-ah}, Hawaiian for immense heaven: | about a hundred thousand galaxies, | spread across five hundred million light-years.
// Builder E. Laniakea after Tully et al. 2014: an orange boundary and white flow lines streaming to the Great Attractor
// (layers/e-laniakea.js), drawn in the world from this beat on (they shrink away as the zoom continues), plus labels.
import * as L from '../../../../engine/runtime/lib.js';
import { band } from '../world.js';
import { GA } from '../layers/e-model.js';
import { drawFlows, drawBoundary, boundaryScreen, toScreen } from '../layers/e-laniakea.js';
import { ph, since, kin, decoK, callout, text, boxK, GOLD, SUB, ORANGE, INK } from '../layers/e-ui.js';

const { W, H } = L;
const T_DRAW = 2.1, T_DUR = 1.8;   // boundary draw-on (seconds into the beat)

function drawWorld(c, v) {
  const s = since(v, 27);
  if (s < 0) return;
  const lf = v.cam.lf, dk = decoK(v);
  const kb = band(lf, 24.4, 24.7, 25.7, 26.05) * dk;
  const kf = band(lf, 24.45, 24.75, 25.25, 25.6) * dk * kin(s, 2.4, 1.2);
  if (kf > 0) drawFlows(c, v, kf, s);
  if (kb > 0) drawBoundary(c, v, kb, L.ease.inOutCubic(L.prog(s, T_DRAW, T_DUR)), L.lerp(2.6, 1.8, L.clamp((lf - 25.1) / 0.6)));
}

function drawOverlay(c, v) {
  const t = v.t, p = [0, 1, 2].map((i) => ph(v, 27, i));
  // you are here (on the outskirts)
  {
    const [x, y] = toScreen(v, [0, 0]);
    const k = kin(t, 2.75, 0.6) * v.k * boxK(x, y);
    if (k > 0) callout(c, x, y, x - 80, y - 124, [{ s: 'YOU ARE HERE', color: GOLD }, { s: 'LOCAL GROUP', size: 16 }], k, { side: 'left', ring: 0, color: GOLD });
  }
  // the name, then the numbers on their phrases (inside the boundary, upper right, where the flows are sparse)
  {
    const [bx, by] = boundaryScreen(v, -0.42);
    const lx = L.clamp(bx - 86, 900, 1500), ly = L.clamp(by - 52, 150, 700);
    const k1 = kin(t, T_DRAW + T_DUR * 0.6, 0.6) * v.k;
    const k2 = kin(t, p[1] + 0.05, 0.5) * v.k, k3 = kin(t, p[2] + 0.1, 0.5) * v.k;
    if (k1 > 0) text(c, 'LANIAKEA SUPERCLUSTER', lx, ly + (1 - k1) * 6, { size: 22, color: [255, 205, 150], align: 'right', alpha: k1 });
    if (k2 > 0) text(c, '~100,000 GALAXIES', lx, ly + 30 + (1 - k2) * 6, { size: 18, weight: 600, color: SUB, track: 2, align: 'right', alpha: k2 });
    if (k3 > 0) text(c, '520 MILLION LIGHT-YEARS ACROSS', lx, ly + 56 + (1 - k3) * 6, { size: 18, weight: 600, color: SUB, track: 2, align: 'right', alpha: k3 });
  }
  // the Great Attractor
  {
    const [x, y] = toScreen(v, GA);
    const k = kin(t, T_DRAW + T_DUR + 0.6, 0.6) * v.k * boxK(x, y);
    if (k > 0) callout(c, x, y, x + 70, y - 104, [{ s: 'GREAT ATTRACTOR' }, { s: '~200 MILLION LIGHT-YEARS AWAY', size: 16 }], k, { ring: 16 });
  }
}

export default {
  beat: 27,
  chapter: { num: '14', title: "Laniakea", sub: "Our supercluster" },
  layer: 1,
  cues() {
    return [
      { t: 2.15, name: 'bloom', gain: 0.24, pitch: 0.6 },
      { t: 2.3, name: 'swell', gain: 0.18, pitch: 0.55 },
      { t: 4.4, name: 'shimmer', gain: 0.18, pitch: 0.8 },
      { t: 4.0, name: 'tick', gain: 0.1, pitch: 0.9 },
      { t: 6.6, name: 'tick', gain: 0.1, pitch: 0.8 },
    ];
  },
  drawWorld,
  drawOverlay,
};
