// Beat 24: The Local Group: | the Milky Way, Andromeda, | and dozens of smaller galaxies.
// Builder D. The Milky Way shrinks into its group (layers/galaxy.js): Andromeda (with M32 and M110), Triangulum, the
// Magellanic Clouds and ~40 dwarfs, which blink in as small rings on "dozens of smaller galaxies".
import * as L from '../../../../engine/runtime/lib.js';
import { ANDROMEDA } from '../camera.js';
import { ACCENT } from '../world.js';
import { M33, LMC, SMC, DWARFS } from '../layers/galaxy.js';
import { ph, phc, tag, ring, haloText, SUBC, INKD } from '../layers/d-ui.js';

const B = 24;
export const LG_TITLE = { x: 1610, y: 150 };

export default {
  beat: B,
  chapter: { num: '13', title: 'The Local Group', sub: 'More than 80 galaxies, mostly dwarfs' },
  cues() {
    return [
      { t: 0.05, name: 'swell', gain: 0.26, pitch: 0.6 },
      { t: phc(B, 1, 1.8) + 0.1, name: 'ping', gain: 0.16, pitch: 0.8 },
      { t: phc(B, 2, 4.1), name: 'shimmer', gain: 0.18, pitch: 1.1 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    const p0 = ph(v, B, 0), p1 = ph(v, B, 1), p2 = ph(v, B, 2);
    if (v.cam.lf < 22.2) return;
    const zk = L.smoothstep(L.clamp((v.cam.lf - 22.45) / 0.25));     // labels wait for the zoom to settle
    // title (top right)
    const kt = L.prog(t, p0 + 0.6, 0.7) * k * zk;
    if (kt > 0) {
      c.save();
      c.globalAlpha *= L.clamp(kt * 1.4);
      haloText(c, 'THE LOCAL GROUP', LG_TITLE.x, LG_TITLE.y, 3, 'right', INKD, 1, 22, 700);
      haloText(c, '~10 MILLION LIGHT-YEARS ACROSS', LG_TITLE.x, LG_TITLE.y + 28, 1.6, 'right', SUBC, 0.92, 16, 600);
      c.restore();
    }
    const mx = v.wx(0), my = v.wy(0), ax = v.wx(ANDROMEDA.x), ay = v.wy(ANDROMEDA.y);
    tag(c, mx, my, mx + 70, my - 52, 'MILKY WAY', L.prog(t, p1, 0.7) * k * zk, { sub: 'YOU ARE HERE', gap: 22 });
    tag(c, ax, ay, ax + 66, ay - 46, 'ANDROMEDA (M31)', L.prog(t, p1 + 0.6, 0.7) * k * zk,
      { sub: '~220,000 LY ACROSS · ~1 TRILLION STARS', gap: 30 });
    const tx = v.wx(M33.x), ty = v.wy(M33.y);
    tag(c, tx, ty, tx - 50, ty + 46, 'TRIANGULUM (M33)', L.prog(t, p2, 0.7) * k * zk, { align: 'right', gap: 14, size: 17 });
    const lx = (v.wx(LMC.x) + v.wx(SMC.x)) / 2, ly = (v.wy(LMC.y) + v.wy(SMC.y)) / 2;
    tag(c, lx + 8, ly + 4, lx + 64, ly + 44, 'LARGE & SMALL MAGELLANIC CLOUDS', L.prog(t, p2 + 0.3, 0.7) * k * zk, { gap: 10, size: 16 });
    // the dwarfs blink in
    DWARFS.forEach((d, i) => {
      const x = v.wx(d.x), y = v.wy(d.y);
      if (x < 140 || x > 1620 || y < 110 || y > 900 || (x < 900 && y > 860)) return;
      const kd = L.prog(t, p2 + 0.1 + (i % 17) * 0.06, 0.4) * k * zk;
      ring(c, x, y, 7, kd * (1 - 0.6 * L.prog(t, p2 + 2.2, 0.8)), ACCENT, 0.4);
    });
  },
};
