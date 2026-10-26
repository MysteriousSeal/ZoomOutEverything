// Beat 20: Nearly every star you can see at night | lies within a few thousand light-years.
// Builder D. The zoom pulls out to ~10,000 light-years: the local star field (layers/stars.js) over the Orion Spur and
// the Sagittarius arm (layers/galaxy.js tile). The bright naked-eye stars are named at their true positions, and a soft
// bubble (radius ~2,600 ly, Deneb at its edge) holds the stars you can see with the naked eye.
import * as L from '../../../../engine/runtime/lib.js';
import { SUN, LY } from '../camera.js';
import { ACCENT } from '../world.js';
import { starById } from '../layers/stars.js';
import { ph, phc, tag, haloText } from '../layers/d-ui.js';

const B = 20;
const BUBBLE = 2600 * LY;
// [id, elbow offset px, align, label]
const TAGS = [
  ['pola', [-34, -58], 'right', 'POLARIS · 433 LY'],
  ['betl', [-58, -22], 'right', 'BETELGEUSE · ~550 LY'],
  ['rigl', [-46, 44], 'right', 'RIGEL · ~860 LY'],
  ['anta', [52, -34], 'left', 'ANTARES · ~550 LY'],
  ['dene', [54, 58], 'left', 'DENEB · ~2,600 LY'],
];

export default {
  beat: B,
  chapter: null,
  cues() {
    return [{ t: phc(B, 1, 2.9) + 0.1, name: 'shimmer', gain: 0.2, pitch: 0.7 }];
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    const p1 = ph(v, B, 1);
    const sx = v.wx(SUN.x), sy = v.wy(SUN.y), R = BUBBLE / v.cam.mpp;
    // the naked-eye bubble: a soft glowing rim and a faint dashed edge
    const kb = L.ease.inOutCubic(L.prog(t, p1 - 0.3, 1.0)) * k;
    if (kb > 0 && R < 5e4) {
      c.save();
      const g = c.createRadialGradient(sx, sy, R * 0.55, sx, sy, R * 1.04);
      g.addColorStop(0, L.rgba(ACCENT, 0));
      g.addColorStop(0.85, L.rgba(ACCENT, 0.05 * kb));
      g.addColorStop(0.97, L.rgba(ACCENT, 0.11 * kb));
      g.addColorStop(1, L.rgba(ACCENT, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(sx, sy, R * 1.04, 0, Math.PI * 2); c.fill();
      c.setLineDash([10, 9]);
      c.lineWidth = 1.5;
      c.strokeStyle = L.rgba(ACCENT, 0.55 * kb);
      c.beginPath(); c.arc(sx, sy, R, 0, Math.PI * 2); c.stroke();
      c.restore();
      // its label, off the rim to the right
      // lower-left, outside the bubble (clear of the ladder, the HUD box and the chapter-card zone)
      const a = 0.78 * Math.PI, rx = sx + Math.cos(a) * R, ry = sy + Math.sin(a) * R;
      tag(c, rx, ry, rx - 50, Math.min(ry + 34, 830), 'STARS YOU CAN SEE WITH THE NAKED EYE', L.prog(t, p1 + 0.4, 0.8) * k,
        { align: 'right', col: ACCENT, sub: 'NEARLY ALL INSIDE THIS BUBBLE', gap: 2, size: 19 });
    }
    // the Sun and its close bright neighbours (within ~12 px of it at this scale)
    tag(c, sx, sy, sx + 40, sy + 92, 'THE SUN', L.prog(t, p1 + 0.1, 0.6) * k,
      { sub: 'VEGA · ARCTURUS · ALDEBARAN: ALL WITHIN 65 LY', gap: 16, size: 18 });
    TAGS.forEach(([id, [ox, oy], align, name], i) => {
      const s = starById(id);
      const x = v.wx(s.p.x), y = v.wy(s.p.y);
      tag(c, x, y, x + ox, y + oy, name, L.prog(t, p1 + 0.25 + i * 0.14, 0.6) * k, { align, size: 17, gap: 12 });
    });
  },
};
