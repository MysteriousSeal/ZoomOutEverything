// Beat 30: The observable universe. | Ninety-three billion light-years across, | holding hundreds of billions of galaxies.
// Builder E. The sphere itself (web + CMB edge) is drawn by layers/cosmos.js; this scene adds the diameter and numbers.
import * as L from '../../../../engine/runtime/lib.js';
import { R_OBS } from '../camera.js';
import { ph, kin, text, INK, SUB, ACCENT } from '../layers/e-ui.js';

export const uni = (v) => ({ x: v.wx(0), y: v.wy(0), r: R_OBS / v.cam.mpp });
const REVEAL = 2.75;   // seconds into the beat: the whole sphere is in frame

function drawOverlay(c, v) {
  const t = v.t, p = [0, 1, 2].map((i) => ph(v, 30, i));
  const { x, y, r } = uni(v);
  // diameter: a thin dimension line through the centre, ticks on the CMB ring
  const kd = kin(t, Math.max(REVEAL, p[1]) - 0.1, 1.0) * v.k;
  if (kd > 0) {
    const e = L.ease.inOutCubic(kd), half = r * e;
    c.save();
    c.globalAlpha = Math.min(1, kd * 1.5) * 0.85;
    c.lineCap = 'butt';
    for (const [lw, col] of [[4, 'rgba(0,0,0,0.5)'], [1.6, L.rgba(INK, 0.8)]]) {
      c.strokeStyle = col; c.lineWidth = lw;
      c.beginPath();
      c.moveTo(x - half, y); c.lineTo(x - 22, y);
      c.moveTo(x + 22, y); c.lineTo(x + half, y);
      c.moveTo(x - half, y - 12); c.lineTo(x - half, y + 12);
      c.moveTo(x + half, y - 12); c.lineTo(x + half, y + 12);
      c.stroke();
    }
    c.restore();
  }
  // the numbers, on the black outside the sphere (left)
  const xr = Math.min(x - r - 40, 470);
  const k1 = kin(t, Math.max(REVEAL, p[1]) + 0.15, 0.6) * v.k;
  if (k1 > 0) {
    text(c, 'OBSERVABLE UNIVERSE', xr, y - 78, { size: 19, color: ACCENT, track: 3, align: 'right', alpha: k1 });
    text(c, '93 BILLION', xr, y - 6 + (1 - k1) * 10, { size: 64, weight: 800, family: L.FONT.display, track: 0, align: 'right', alpha: k1 });
    text(c, 'LIGHT-YEARS ACROSS', xr, y + 26, { size: 19, weight: 600, color: SUB, track: 2.5, align: 'right', alpha: k1 });
  }
  const k2 = kin(t, p[2] + 0.1, 0.6) * v.k;
  if (k2 > 0) {
    c.save(); c.globalAlpha = k2 * 0.6; c.fillStyle = L.rgba(INK, 0.5); c.fillRect(xr - 60, y + 54, 60, 1.5); c.restore();
    text(c, 'HUNDREDS OF BILLIONS', xr, y + 92 + (1 - k2) * 6, { size: 19, weight: 700, color: INK, track: 2.5, align: 'right', alpha: k2 });
    text(c, 'OF GALAXIES', xr, y + 118 + (1 - k2) * 6, { size: 19, weight: 700, color: INK, track: 2.5, align: 'right', alpha: k2 });
  }
}

export default {
  beat: 30,
  chapter: { num: '16', title: "The Observable Universe", sub: "93 billion light-years across" },
  cues() {
    return [
      { t: 1.2, name: 'swell', gain: 0.28, pitch: 0.5 },
      { t: REVEAL, name: 'deep', gain: 0.62, pitch: 0.7 },
      { t: REVEAL + 0.02, name: 'impact', gain: 0.22, pitch: 0.55 },
      { t: REVEAL + 0.3, name: 'shimmer', gain: 0.2, pitch: 0.6 },
      { t: 5.1, name: 'tick', gain: 0.1, pitch: 0.8 },
    ];
  },
  drawOverlay,
};
