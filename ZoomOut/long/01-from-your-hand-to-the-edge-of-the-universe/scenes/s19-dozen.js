// Beat 19: Within ten light-years, | there are only about a dozen stars.
// Builder D. A 10-light-year circle around the Sun; the stars inside light up one by one (layers/stars.js brightens
// them, dims the rest) while a small tally counts them: the Sun, Proxima, α Cen A, α Cen B, Barnard's Star, Wolf 359,
// Lalande 21185, Sirius A, Sirius B, Luyten 726-8 A, Luyten 726-8 B, Ross 154 = 12.
import * as L from '../../../../engine/runtime/lib.js';
import { SUN, LY } from '../camera.js';
import { ACCENT } from '../world.js';
import { starById } from '../layers/stars.js';
import { ph, phc, tag, ring, measure, figure, haloText, SUBC } from '../layers/d-ui.js';

const B = 19;
// order of the tally, the label elbow offset (px) and alignment for each star
const ORDER = [
  ['sun', 1, [44, -56], 'left', 'THE SUN', ''],
  ['prox', 1, [-6, 96], 'right', 'PROXIMA CENTAURI', '4.24 LY'],
  ['acen', 2, [58, 46], 'left', 'ALPHA CENTAURI A & B', '4.37 LY'],
  ['barn', 1, [48, -40], 'left', "BARNARD'S STAR", '5.96 LY'],
  ['wolf', 1, [-58, 22], 'right', 'WOLF 359', '7.86 LY'],
  ['lal', 1, [-46, 52], 'right', 'LALANDE 21185', '8.31 LY'],
  ['sir', 2, [52, 46], 'left', 'SIRIUS A & B', '8.60 LY'],
  ['luy', 2, [-40, -62], 'right', 'LUYTEN 726-8 A & B', '8.73 LY'],
  ['ross', 1, [34, -44], 'left', 'ROSS 154', '9.70 LY'],
];
const STEP = 0.16;

export default {
  beat: B,
  chapter: null,
  cues() {
    const out = [{ t: phc(B, 0, 0.15) + 0.15, name: 'ping', gain: 0.18, pitch: 0.75 }];
    const t1 = phc(B, 1, 2.1);
    ORDER.forEach((_, i) => out.push({ t: t1 + i * STEP, name: 'tick', gain: 0.1, pitch: 1.0 + i * 0.05 }));
    return out;
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    const p0 = ph(v, B, 0), p1 = ph(v, B, 1);
    const sx = v.wx(SUN.x), sy = v.wy(SUN.y), R = 10 * LY / v.cam.mpp;
    // the 10-light-year circle (sweeps in clockwise from the right)
    const kc = L.ease.inOutCubic(L.prog(t, p0 + 0.05, 1.1));
    if (kc > 0 && R < 1e5) {
      c.save();
      c.globalAlpha *= k;
      const g = c.createRadialGradient(sx, sy, R * 0.6, sx, sy, R);
      g.addColorStop(0, L.rgba(ACCENT, 0));
      g.addColorStop(1, L.rgba(ACCENT, 0.06 * kc));
      c.fillStyle = g;
      c.beginPath(); c.arc(sx, sy, R, 0, Math.PI * 2); c.fill();
      c.lineCap = 'round';
      for (const [w, s] of [[3.6, 'rgba(2,4,9,0.5)'], [1.6, L.rgba(ACCENT, 0.8)]]) {
        c.strokeStyle = s; c.lineWidth = w;
        c.beginPath(); c.arc(sx, sy, R, -0.02, -0.02 + Math.PI * 2 * kc); c.stroke();
      }
      c.restore();
      // the radius, measured, with its label above
      c.save();
      c.globalAlpha *= k;
      measure(c, sx + 12, sy, sx + R, sy, L.prog(t, p0 + 0.5, 0.8), ACCENT, 0.75, 6);
      c.restore();
      const kl = L.prog(t, p0 + 0.9, 0.6) * k;
      if (kl > 0) {
        c.save();
        c.globalAlpha *= L.clamp(kl * 1.4);
        c.textBaseline = 'alphabetic';
        haloText(c, '10 LIGHT-YEARS', sx + R * 0.55, sy - 12, 2.4, 'center', ACCENT, 1, 20, 700);
        c.restore();
      }
    }
    // the tally: each star gets a ring and a name, the count climbs to 12
    let n = 0;
    ORDER.forEach(([id, cnt, [ox, oy], align, name, sub], i) => {
      const kt = L.prog(t, p1 + i * STEP, 0.5) * k;
      if (L.prog(t, p1 + i * STEP, 0.5) > 0.5) n += cnt;
      const s = id === 'sun' ? { p: SUN } : starById(id);
      const x = v.wx(s.p.x), y = v.wy(s.p.y);
      ring(c, x, y, id === 'sir' ? 16 : 12, kt, [255, 236, 210], 0.7);
      tag(c, x, y, x + ox, y + oy, name, L.prog(t, p1 + i * STEP + 0.1, 0.6) * k, { align, sub, size: 17, subSize: 16, gap: 15 });
    });
    const kn = L.prog(t, p1, 0.4) * k;
    figure(c, 150, 330, n >= 12 ? '≈ 12 STARS' : `${n} STAR${n === 1 ? '' : 'S'}`, 'WITHIN 10 LIGHT-YEARS', kn, { size: 56, accent: [255, 214, 150] });
    if (kn > 0) {
      c.save();
      c.globalAlpha *= L.clamp(kn * 1.2);
      haloText(c, 'INCLUDING THE SUN', 150, 382, 2, 'left', [236, 233, 226], 0.92, 17, 700);
      haloText(c, 'SEEN FROM ABOVE', 150, 418, 1.4, 'left', SUBC, 0.8, 16, 600);
      haloText(c, 'THE GALACTIC PLANE', 150, 440, 1.4, 'left', SUBC, 0.8, 16, 600);
      c.restore();
    }
  },
};
