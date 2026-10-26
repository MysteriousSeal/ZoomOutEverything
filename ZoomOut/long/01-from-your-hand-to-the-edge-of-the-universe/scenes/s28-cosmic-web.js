// Beat 28: Zoom out again, | and the galaxies line up into filaments and walls, | around enormous empty voids. | The cosmic web.
// Builder E. The web is drawn by layers/cosmos.js; this scene tags a filament (a long wall), a void and a cluster.
import * as L from '../../../../engine/runtime/lib.js';
import { WEB_VOID, WEB_WALL, WEB_NODE, MLY } from '../layers/e-model.js';
import { toScreen } from '../layers/e-laniakea.js';
import { ph, kin, callout, text, boxK, INK, SUB } from '../layers/e-ui.js';

const out = (t, t1, d = 0.4) => 1 - L.ease.inCubic(L.prog(t, t1, d));
const bez = (a, c, b, t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];

function drawOverlay(c, v) {
  const t = v.t, p = [0, 1, 2, 3].map((i) => ph(v, 28, i));
  const settle = 4.0;   // the zoom has (nearly) settled at ~18 billion light-years
  const m = v.cam.mpp / MLY;
  // FILAMENT: the long wall
  {
    const k = kin(t, Math.max(p[1] + 1.2, settle - 0.4), 0.6) * v.k;
    if (k > 0) {
      const [x, y] = toScreen(v, bez(WEB_WALL.a, WEB_WALL.c, WEB_WALL.b, 0.55));
      // a soft bracket along the wall
      c.save();
      c.globalAlpha = k * 0.7;
      c.setLineDash([2, 6]);
      c.strokeStyle = L.rgba(INK, 0.8); c.lineWidth = 1.6;
      c.beginPath();
      for (let i = 0; i <= 30; i++) {
        const q = bez(WEB_WALL.a, WEB_WALL.c, WEB_WALL.b, i / 30 * L.ease.outCubic(k));
        const [sx, sy] = toScreen(v, q);
        if (i) c.lineTo(sx, sy - 16); else c.moveTo(sx, sy - 16);
      }
      c.stroke();
      c.restore();
      callout(c, x, y - 18, x + 40, y - 92, [{ s: 'FILAMENT' }, { s: 'GALAXIES STRUNG ALONG A WALL', size: 16 }], k * boxK(x, y), { ring: 0 });
    }
  }
  // VOID
  {
    const k = kin(t, p[2] + 0.1, 0.6) * v.k;
    if (k > 0) {
      const [x, y] = toScreen(v, WEB_VOID.p);
      const r = Math.max(24, WEB_VOID.r * 1.1 / m);
      c.save();
      c.globalAlpha = k * 0.85;
      c.setLineDash([6, 5]);
      c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 4.5;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2 * L.ease.outCubic(k)); c.stroke();
      c.strokeStyle = L.rgba(INK, 1); c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2 * L.ease.outCubic(k)); c.stroke();
      c.restore();
      callout(c, x - r * 0.72, y + r * 0.72, x - r - 60, y + r + 64, [{ s: 'VOID' }, { s: 'VOIDS SPAN 30–300 MILLION LIGHT-YEARS', size: 16 }], k * boxK(x, y), { side: 'left', ring: 0 });
    }
  }
  // CLUSTER at a node
  {
    const k = kin(t, p[3] - 0.5, 0.6) * v.k;
    if (k > 0) {
      const [x, y] = toScreen(v, WEB_NODE.p);
      callout(c, x, y, x + 84, y + 70, [{ s: 'CLUSTER' }, { s: 'WHERE FILAMENTS MEET', size: 16 }], k * boxK(x, y), { ring: 13 });
    }
  }
}

export default {
  beat: 28,
  chapter: { num: '15', title: "The Cosmic Web", sub: "Filaments, walls and voids" },
  cues() {
    return [
      { t: 0.35, name: 'swell', gain: 0.22, pitch: 0.6 },
      { t: 3.7, name: 'ping', gain: 0.12, pitch: 0.9 },
      { t: 5.3, name: 'tick', gain: 0.1, pitch: 0.75 },
      { t: 7.1, name: 'tick', gain: 0.1, pitch: 0.85 },
    ];
  },
  drawOverlay,
};
