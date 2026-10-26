// Beat 26: Galaxies gather in groups, | groups into clusters, | and clusters into superclusters.
// Builder E. The galaxies themselves come from layers/cosmos.js; this scene tags a group, the Virgo Cluster, and a
// supercluster complex, each on its phrase (phrase times read from the live timeline).
import * as L from '../../../../engine/runtime/lib.js';
import { GROUP_TAG, VIRGO } from '../layers/e-model.js';
import { toScreen } from '../layers/e-laniakea.js';
import { ph, kin, callout, text, boxK, INK, SUB } from '../layers/e-ui.js';

const { W, H } = L;
// the Local Supercluster outline (Mly): centred between us and Virgo, ~110 Mly across
const LSC = { c: [1.5, 4.5], rx: 54, ry: 29, rot: 0.12 };
const out = (t, t1, d = 0.4) => 1 - L.ease.inCubic(L.prog(t, t1, d));


function drawOverlay(c, v) {
  const t = v.t, p = [0, 1, 2].map((i) => ph(v, 26, i));
  // GROUP: a small group of galaxies just beyond the Local Group (the camera is still pulling out fast)
  {
    const [x, y] = toScreen(v, GROUP_TAG);
    const k = kin(t, p[0] + 1.25, 0.45) * out(t, p[1] + 0.35) * v.k * boxK(x, y);
    if (k > 0) callout(c, x, y, x + 64, y + 52, [{ s: 'GROUP' }], k, { ring: 26 });
  }
  // CLUSTER: Virgo at its true projected position
  {
    const [x, y] = toScreen(v, VIRGO);
    const k = kin(t, p[1] + 0.05, 0.5) * out(t, p[2] + 0.1) * v.k;
    if (k > 0) {
      const lx = L.clamp(x + 120, 640, 1300), ly = L.clamp(y + 74, 200, 820);
      const rr = Math.max(26, Math.min(70, 4.2 * 1e6 * 9.4607e15 / v.cam.mpp));
      callout(c, x, y, lx, ly, [{ s: 'VIRGO CLUSTER' }, { s: '~1,500 GALAXIES', size: 17 }, { s: '54 MILLION LIGHT-YEARS AWAY', size: 16, alpha: 0.85 }], k, { ring: rr });
    }
  }
  // SUPERCLUSTER: the Local (Virgo) Supercluster — the Virgo Cluster, the Local Group and the groups around them
  {
    const k = kin(t, p[2] + 0.55, 0.7) * v.k;
    if (k > 0) {
      const [x, y] = toScreen(v, LSC.c);
      const m = v.cam.mpp / (1e6 * 9.4607e15);
      const rx = LSC.rx / m, ry = LSC.ry / m;
      c.save();
      c.globalAlpha = k * 0.85;
      c.setLineDash([7, 9]);
      c.lineDashOffset = -t * 6;
      const e = L.ease.outCubic(k);
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3.5;
      c.beginPath(); c.ellipse(x, y, rx, ry, LSC.rot, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e); c.stroke();
      c.strokeStyle = L.rgba(INK, 0.75); c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(x, y, rx, ry, LSC.rot, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e); c.stroke();
      c.restore();
      const lx = x + rx * 0.2, ly = Math.max(y - ry * 0.66, 190);
      text(c, 'SUPERCLUSTER', lx, ly, { size: 21, align: 'left', alpha: L.clamp((k - 0.3) / 0.5) });
      text(c, 'CLUSTERS AND GROUPS LINKED BY FILAMENTS', lx, ly + 26, { size: 16, weight: 600, color: SUB, track: 2, align: 'left', alpha: L.clamp((k - 0.45) / 0.5) });
    }
  }
}

export default {
  beat: 26,
  chapter: null,
  cues() {
    return [
      { t: 1.5, name: 'shimmer', gain: 0.16, pitch: 0.9 },
      { t: 2.5, name: 'ping', gain: 0.14, pitch: 0.8 },
      { t: 4.95, name: 'bloom', gain: 0.2, pitch: 0.7 },
    ];
  },
  drawOverlay,
};
