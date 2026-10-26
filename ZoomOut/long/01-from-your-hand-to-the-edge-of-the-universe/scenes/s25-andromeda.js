// Beat 25: Andromeda is two and a half million light-years away. | On a dark night you can see it with your naked eye, |
// as light that set off long before our species existed.
// Builder D. The gap to Andromeda is measured; then a photon leaves M31 and crosses to the Milky Way at a steady
// pace. Where it was 300,000 light-years from us (300,000 years ago), our species appears; it arrives today.
import * as L from '../../../../engine/runtime/lib.js';
import { ANDROMEDA } from '../camera.js';
import { ACCENT } from '../world.js';
import { ph, phc, tag, measure, haloText, GOLD, SUBC } from '../layers/d-ui.js';

const B = 25;
const F_SPECIES = 1 - 0.3 / 2.5;     // along the path from M31 (0) to us (1)

function times(v) {
  const p1 = ph(v, B, 1), p2e = ph(v, B, 2, 'end');
  return { t0: p1 + 0.2, t1: p2e - 0.25 };
}

export default {
  beat: B,
  chapter: null,
  cues() {
    const t0 = phc(B, 1, 3.7) + 0.2, t1 = phc(B, 2, 10.3, 'end') - 0.25;
    return [
      { t: phc(B, 0, 0.15) + 0.3, name: 'ping', gain: 0.16, pitch: 0.7 },
      { t: t0, name: 'swish', gain: 0.18, pitch: 0.8 },
      { t: t0 + (t1 - t0) * F_SPECIES, name: 'blip', gain: 0.16, pitch: 1.2 },
      { t: t1, name: 'bloom', gain: 0.24, pitch: 0.9 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    const p0 = ph(v, B, 0);
    if (v.cam.lf < 22.2 || v.cam.lf > 23.4) return;
    const mx = v.wx(0), my = v.wy(0), ax = v.wx(ANDROMEDA.x), ay = v.wy(ANDROMEDA.y);
    const dx = mx - ax, dy = my - ay, dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
    const A0 = 34, M0 = 24;                         // keep clear of the galaxies' glows
    const sx0 = ax + ux * A0, sy0 = ay + uy * A0, sx1 = mx - ux * M0, sy1 = my - uy * M0;
    // the measured gap
    c.save();
    c.globalAlpha *= k;
    measure(c, sx0, sy0, sx1, sy1, L.prog(t, p0 + 0.1, 1.2), ACCENT, 0.7, 6, [7, 7]);
    c.restore();
    const kl = L.prog(t, p0 + 0.8, 0.6) * k;
    if (kl > 0) {
      const nx = -uy, ny = ux;                        // normal (pointing right of the M31 → us direction)
      const side = nx > 0 ? 1 : -1;
      const lx = (ax + mx) / 2 + nx * side * 30, ly = (ay + my) / 2 + ny * side * 30;
      c.save();
      c.globalAlpha *= L.clamp(kl * 1.4);
      haloText(c, '2.5 MILLION LIGHT-YEARS', lx, ly, 2.4, 'left', ACCENT, 1, 20, 700);
      c.restore();
    }
    // labels on the two galaxies
    tag(c, mx, my, mx - 54, my + 46, 'MILKY WAY', L.prog(t, 0, 0.5) * k, { align: 'right', sub: 'YOU ARE HERE', gap: 22 });
    const { t0, t1 } = times(v);
    tag(c, ax, ay, ax + 66, ay - 46, 'ANDROMEDA (M31)', L.prog(t, 0, 0.5) * k,
      { sub: t > t0 - 0.2 ? 'LIGHT LEFT 2.5 MILLION YEARS AGO' : '~220,000 LY ACROSS · ~1 TRILLION STARS', gap: 30, col: [236, 233, 226] });
    // the photon
    const p = L.clamp((t - t0) / (t1 - t0));
    if (t > t0 - 0.3) {
      const hx = L.lerp(sx0, sx1, p), hy = L.lerp(sy0, sy1, p);
      const fade = 1 - L.prog(t, t1 + 0.1, 0.6);
      c.save();
      c.globalAlpha *= k;
      c.globalCompositeOperation = 'lighter';
      // a glowing trail behind the head
      const tl = Math.min(140, Math.hypot(hx - sx0, hy - sy0));
      const g = c.createLinearGradient(hx - ux * tl, hy - uy * tl, hx, hy);
      g.addColorStop(0, L.rgba(GOLD, 0)); g.addColorStop(1, L.rgba(GOLD, 0.75 * fade));
      c.strokeStyle = g; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(hx - ux * tl, hy - uy * tl); c.lineTo(hx, hy); c.stroke();
      if (p < 1) {
        L.lightBlob(c, hx, hy, 18, GOLD, 0.7 * L.prog(t, t0 - 0.3, 0.3));
        c.fillStyle = `rgba(255,250,236,${L.prog(t, t0 - 0.3, 0.3)})`;
        c.beginPath(); c.arc(hx, hy, 2.6, 0, Math.PI * 2); c.fill();
      } else {
        const a = t - t1;
        L.lightBlob(c, mx, my, 30 + 60 * L.clamp(a / 0.8), GOLD, 0.5 * (1 - L.clamp(a / 0.8)));
      }
      c.restore();
    }
    // our species: where the light was 300,000 years ago
    const fx = L.lerp(sx0, sx1, F_SPECIES), fy = L.lerp(sy0, sy1, F_SPECIES);
    const ks = L.prog(t, t0 + (t1 - t0) * F_SPECIES - 0.15, 0.5) * k;
    if (ks > 0) {
      c.save();
      c.globalAlpha *= L.clamp(ks * 1.5);
      c.strokeStyle = L.rgba(GOLD, 0.9); c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(fx - uy * 9, fy + ux * 9); c.lineTo(fx + uy * 9, fy - ux * 9); c.stroke();
      c.restore();
    }
    tag(c, fx, fy, fx + 70, fy - 30, 'OUR SPECIES APPEARS', ks, { col: GOLD, sub: '~300,000 YEARS AGO', gap: 10, size: 17 });
  },
};
