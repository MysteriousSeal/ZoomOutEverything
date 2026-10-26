// Beat 21: The Milky Way. | A hundred thousand light-years across, | with hundreds of billions of stars.
// Builder D. The pull-out reveals the whole galaxy (layers/galaxy.js, with a soft bloom); a diameter dimension
// (100,000 light-years) is drawn across the disc, skipping the bright core.
import * as L from '../../../../engine/runtime/lib.js';
import { GC, LY } from '../camera.js';
import { ACCENT } from '../world.js';
import { ph, phc, haloText, SUBC } from '../layers/d-ui.js';

const B = 21;
const ANG = 35 * Math.PI / 180;     // the dimension runs from lower-left to upper-right

export default {
  beat: B,
  chapter: { num: '12', title: 'The Milky Way', sub: 'Our galaxy, a barred spiral' },
  cues() {
    return [
      { t: 0.05, name: 'swell', gain: 0.32, pitch: 0.7 },
      { t: 0.35, name: 'deep', gain: 0.4, pitch: 0.8 },
      { t: 1.35, name: 'bloom', gain: 0.24, pitch: 0.9 },
      { t: phc(B, 1, 1.66) + 0.2, name: 'shimmer', gain: 0.14, pitch: 0.9 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    const p1 = ph(v, B, 1);
    const gx = v.wx(GC.x), gy = v.wy(GC.y), R = 50000 * LY / v.cam.mpp;
    if (R > 1200) return;
    const ux = Math.cos(ANG), uy = -Math.sin(ANG);
    const zk = L.smoothstep(L.clamp((v.cam.lf - 21.15) / 0.12));
    const kd = L.ease.inOutCubic(L.prog(t, p1 + 0.05, 1.0)) * k * zk;
    if (kd <= 0) return;
    c.save();
    c.globalAlpha *= L.clamp(kd * 1.5);
    c.lineCap = 'round';
    // two halves growing out from the centre (gap around the core), end ticks at the disc edge
    const g0 = 62, e = L.lerp(g0, R, kd);
    for (const sgn of [1, -1]) {
      for (const [w, s] of [[3.6, 'rgba(2,4,9,0.45)'], [1.5, L.rgba(ACCENT, 0.8)]]) {
        c.strokeStyle = s; c.lineWidth = w;
        c.beginPath(); c.moveTo(gx + sgn * ux * g0, gy + sgn * uy * g0); c.lineTo(gx + sgn * ux * e, gy + sgn * uy * e); c.stroke();
        if (kd > 0.97) {
          const ex = gx + sgn * ux * R, ey = gy + sgn * uy * R;
          c.beginPath(); c.moveTo(ex - uy * 9, ey + ux * 9); c.lineTo(ex + uy * 9, ey - ux * 9); c.stroke();
        }
      }
    }
    c.restore();
    const kl = L.prog(t, p1 + 0.7, 0.6) * k * L.smoothstep(L.clamp((v.cam.lf - 21.272) / 0.012));
    if (kl > 0) {
      const ex = gx + ux * R + 16, ey = gy + uy * R - 8;
      c.save();
      c.globalAlpha *= L.clamp(kl * 1.4);
      haloText(c, '100,000 LIGHT-YEARS', ex, ey, 2.4, 'left', ACCENT, 1, 21, 700);
      haloText(c, '100–400 BILLION STARS', ex, ey + 26, 1.6, 'left', SUBC, 0.92, 16, 600);
      c.restore();
    }
  },
};
