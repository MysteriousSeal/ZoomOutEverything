// Beat 22: We're out here, in a quiet arm, twenty-six thousand light-years from the center. | There, a black hole four
// million times heavier than the Sun sits waiting.
// Builder D. "You are here" on the Orion Spur, the neighbouring arms named, the 26,000 ly to the centre measured, and
// Sagittarius A* marked.
import * as L from '../../../../engine/runtime/lib.js';
import { GC, LY, SUN } from '../camera.js';
import { ACCENT } from '../world.js';
import { ARMS, armPt } from '../layers/d-galaxy-model.js';
import { ph, phc, tag, ring, measure, haloText, GOLD, SUBC } from '../layers/d-ui.js';

const B = 22;
const arm = (id) => ARMS.find((a) => a.id === id);
/** G (ly, GC-relative) -> screen. */
export const gScr = (v, p) => [v.wx(GC.x + p.x * LY), v.wy(GC.y + p.y * LY)];

/** The Sun's marker at galaxy scales: a gold point with a soft halo and a thin ring. */
export function sunMarker(c, v, k) {
  if (k <= 0.002) return;
  const x = v.wx(SUN.x), y = v.wy(SUN.y);
  const pulse = 0.5 + 0.5 * Math.sin(v.gt * 2.2);
  c.save();
  c.globalAlpha *= k;
  L.lightBlob(c, x, y, 20, GOLD, 0.5);
  c.fillStyle = 'rgba(255,250,236,1)';
  c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(GOLD, 0.5 + 0.25 * pulse);
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(x, y, 9 + 1.5 * pulse, 0, Math.PI * 2); c.stroke();
  c.restore();
}

export default {
  beat: B,
  chapter: null,
  cues() {
    return [
      { t: phc(B, 0, 0.15) + 0.25, name: 'ping', gain: 0.2, pitch: 1.0 },
      { t: phc(B, 1, 5.3) + 0.4, name: 'deep', gain: 0.22, pitch: 0.6 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    const p0 = ph(v, B, 0), p0e = ph(v, B, 0, 'end'), p1 = ph(v, B, 1);
    const sx = v.wx(SUN.x), sy = v.wy(SUN.y), gx = v.wx(GC.x), gy = v.wy(GC.y);
    if (Math.abs(gx - sx) > 2000) return;
    // you are here
    sunMarker(c, v, L.prog(t, p0 + 0.1, 0.5) * k);
    tag(c, sx, sy, sx - 54, sy + 66, 'YOU ARE HERE', L.prog(t, p0 + 0.25, 0.7) * k, { align: 'right', col: GOLD, sub: 'THE SUN', gap: 12 });
    // our arm and its neighbours
    const [ox, oy] = gScr(v, armPt(arm('ORI'), 21));
    tag(c, ox, oy, ox - 48, oy - 54, 'ORION SPUR', L.prog(t, p0 + 1.3, 0.7) * k, { align: 'right', sub: 'OUR LOCAL ARM', gap: 6 });
    const [qx, qy] = gScr(v, armPt(arm('PER'), -42));
    tag(c, qx, qy, qx - 40, qy + 44, 'PERSEUS ARM', L.prog(t, p0 + 1.9, 0.7) * k, { align: 'right', size: 16, gap: 6, col: [200, 210, 228] });
    const [ax, ay] = gScr(v, armPt(arm('SAG'), 44));
    tag(c, ax, ay, ax + 26, ay - 52, 'SAGITTARIUS ARM', L.prog(t, p0 + 2.1, 0.7) * k, { size: 16, gap: 6, col: [200, 210, 228] });
    // 26,000 light-years to the centre
    const km = L.prog(t, p0e - 1.9, 1.1);
    c.save();
    c.globalAlpha *= k;
    measure(c, sx + 13, sy, gx - 20, gy, km, ACCENT, 0.85, 6);
    c.restore();
    const kl = L.prog(t, p0e - 1.4, 0.6) * k;
    if (kl > 0) {
      c.save();
      c.globalAlpha *= L.clamp(kl * 1.4);
      haloText(c, '26,000 LIGHT-YEARS', (sx + gx) / 2, sy + 30, 2, 'center', ACCENT, 1, 18, 700);
      c.restore();
    }
    // Sagittarius A*
    ring(c, gx, gy, 14, L.prog(t, p1 + 0.3, 0.5) * k, [255, 236, 210], 0.85);
    tag(c, gx, gy, gx + 90, gy + 110, 'SAGITTARIUS A*', L.prog(t, p1 + 0.45, 0.7) * k,
      { sub: 'BLACK HOLE · 4 MILLION SUNS', gap: 16 });
  },
};
