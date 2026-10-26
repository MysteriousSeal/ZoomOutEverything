// Beat 7 — "Venice would vanish. | So would Amsterdam."
// Europe face-on at +70 m (env floods the Po plain and the Low Countries honestly). One focal point at a time:
//   phrase 1: today's northern Adriatic coastline ghosts in around Venice, the Venice pin pulses, its callout lands;
//   phrase 2: Venice dims, today's Dutch coast ghosts in, the Amsterdam pin pulses and its callout lands.
// Everything rides the rotating globe through worldOf/placeAt; it leaves with the camera's climb towards Shanghai.
import * as L from '../../../../engine/runtime/lib.js';
import { PLACES, viewOf } from '../env.js';
import { callout, contour, drawGhost, drawPin, placeAt } from './s06-florida.js';

const ADRIATIC = contour({ lat0: 44.2, lat1: 46.0, lon0: 11.2, lon1: 14.0, step: 0.1, minPts: 5 });
// the Low Countries' 0 m line is noisy at 0.1°: trace it on a 0.2°-smoothed field so it reads as one continuous coast
const DUTCH = contour({ lat0: 50.8, lat1: 54.0, lon0: 2.5, lon1: 7.5, step: 0.1, minPts: 12, smooth: 0.2 });

// seconds into beat 7 (phrase 1 "Venice would vanish." starts at 0.15; phrase 2 "So would Amsterdam." at 1.97;
// Amsterdam lands just ahead of its phrase so it is readable for >= 1.5 s before the camera leaves)
const T_VEN = 0.4, T_DIM = 1.35, T_AMS = 1.45;

function leaveK(v) {
  // the camera leaves for Shanghai at the end of phrase 2: the layer is gone before the pan can carry a label to an edge
  return 1 - L.ease.inOutCubic(L.prog(v.gt, v.tl.lines[7].phrases[1].end + 0.02, 0.35));
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Venice · Amsterdam', sub: 'Europe at +70 m' },
  captions: true,
  layer: 1,
  cues(d) {
    void d;
    return [
      { t: T_VEN - 0.05, name: 'shimmer', gain: 0.18, pitch: 1.2 },
      { t: T_VEN + 0.05, name: 'ping', gain: 0.26, pitch: 1.25 },
      { t: T_VEN + 0.3, name: 'splash', gain: 0.14, pitch: 1.3 },
      { t: T_AMS - 0.05, name: 'shimmer', gain: 0.16, pitch: 1.0 },
      { t: T_AMS + 0.05, name: 'ping', gain: 0.26, pitch: 1.05 },
      { t: T_AMS + 0.3, name: 'splash', gain: 0.14, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < T_VEN - 0.2 || v.t > v.d + 1) return;
    const lk = leaveK(v);
    if (lk <= 0.01) return;
    const vw = viewOf(v);
    const dim = 1 - 0.55 * L.ease.inOutCubic(L.prog(v.t, T_DIM, 0.5));
    drawGhost(ctx, v, vw, ADRIATIC, L.ease.inOutCubic(L.prog(v.t, T_VEN - 0.1, 0.9)), 0.85 * lk * dim);
    drawGhost(ctx, v, vw, DUTCH, L.ease.inOutCubic(L.prog(v.t, T_AMS - 0.1, 0.9)), lk, 1.35);
  },
  drawOverlay(ctx, v) {
    const lk = leaveK(v);
    if (lk <= 0.01) return;
    const vw = viewOf(v);
    const dim = 1 - 0.6 * L.ease.inOutCubic(L.prog(v.t, T_DIM, 0.5));
    // Venice: pin, then callout down-left over the Italian peninsula
    {
      const [x, y, z] = placeAt(v, vw, PLACES.venice.lat, PLACES.venice.lon);
      if (z > 0.1) {
        drawPin(ctx, x, y, L.prog(v.t, T_VEN, 0.45), L.prog(v.t, T_VEN + 0.1, 1.0), lk * L.lerp(1, 0.75, 1 - dim));
        callout(ctx, x, y, { name: 'Venice', sub: 'built at sea level', k: L.prog(v.t, T_VEN + 0.08, 0.5), a: lk * dim, dx: -50, dy: 130, align: 'right', size: 66 });
      }
    }
    // Amsterdam: pin, then callout up and to the right over the North Sea / Denmark (the side the camera moves away from)
    {
      const [x, y, z] = placeAt(v, vw, PLACES.amsterdam.lat, PLACES.amsterdam.lon);
      if (z > 0.1) {
        drawPin(ctx, x, y, L.prog(v.t, T_AMS, 0.45), L.prog(v.t, T_AMS + 0.1, 1.0), lk);
        callout(ctx, x, y, { name: 'Amsterdam', sub: 'partly below sea level', k: L.prog(v.t, T_AMS + 0.1, 0.55), a: lk, dx: 40, dy: -170, align: 'left', size: 66, subSize: 21 });
      }
    }
  },
};
