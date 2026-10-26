// Beat 23: The Sun takes about two hundred thirty million years to go around once. | The last time we were here, | the
// first dinosaurs were just appearing.
// Builder D. The Sun's orbit (radius 26,000 ly) traced once around the centre, clockwise (the real sense of rotation
// seen from the north), while a counter climbs to 230 million years; then a callout: the first dinosaurs.
import * as L from '../../../../engine/runtime/lib.js';
import { GC, LY, SUN } from '../camera.js';
import { ph, phc, tag, figure, haloText, GOLD, SUBC, INKD } from '../layers/d-ui.js';
import { sunMarker } from './s22-we-are-here.js';
import { drawEoraptor } from '../layers/d-dino.js';

const B = 23;
const TAU = Math.PI * 2;

export default {
  beat: B,
  chapter: null,
  cues() {
    const a = phc(B, 0, 0.15);
    return [
      { t: a + 0.2, name: 'riser', gain: 0.16, pitch: 0.8 },
      { t: phc(B, 0, 4.2, 'end') - 0.2, name: 'ping', gain: 0.22, pitch: 1.0 },
      { t: phc(B, 2, 6.8) + 0.1, name: 'bloom', gain: 0.16, pitch: 1.1 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    const p0 = ph(v, B, 0), p0e = ph(v, B, 0, 'end'), p1 = ph(v, B, 1), p2 = ph(v, B, 2);
    const gx = v.wx(GC.x), gy = v.wy(GC.y), sx = v.wx(SUN.x), sy = v.wy(SUN.y);
    const R = Math.hypot(sx - gx, sy - gy);
    if (R > 2000) return;
    const a0 = Math.atan2(sy - gy, sx - gx);
    // one lap, clockwise on screen (screen angle increasing), eased in and out
    const p = L.ease.inOutCubic(L.prog(t, p0 + 0.35, Math.max(1, p0e - p0 - 0.6)));
    const ko = L.prog(t, p0 + 0.15, 0.4) * k;
    c.save();
    c.globalAlpha *= ko;
    c.lineCap = 'round';
    // the whole orbit, faint and dashed; the travelled part brighter
    c.setLineDash([6, 8]);
    c.strokeStyle = L.rgba(GOLD, 0.32); c.lineWidth = 1.4;
    c.beginPath(); c.arc(gx, gy, R, 0, TAU); c.stroke();
    if (p > 0) {
      c.setLineDash([]);
      c.strokeStyle = 'rgba(2,4,9,0.5)'; c.lineWidth = 4;
      c.beginPath(); c.arc(gx, gy, R, a0, a0 + TAU * p); c.stroke();
      c.strokeStyle = L.rgba(GOLD, 0.85); c.lineWidth = 1.8;
      c.beginPath(); c.arc(gx, gy, R, a0, a0 + TAU * p); c.stroke();
      // the travelling marker (a past/future Sun) while the lap runs
      if (p < 1) {
        const a = a0 + TAU * p, x = gx + Math.cos(a) * R, y = gy + Math.sin(a) * R;
        L.lightBlob(c, x, y, 22, GOLD, 0.6);
        c.fillStyle = 'rgba(255,248,230,1)';
        c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
      }
    }
    c.restore();
    sunMarker(c, v, k);
    // the counter, then the result
    const n = Math.round(230 * p);
    figure(c, gx + R + 44, gy - R + 10, p >= 1 ? '≈ 230 MILLION YEARS' : `${n} MILLION YEARS`, 'ONE ORBIT · AT 230 KM/S',
      L.prog(t, p0 + 0.3, 0.5) * k, { size: 40, accent: GOLD });
    // the last time we were here: the first dinosaurs
    const kd = L.prog(t, p1, 0.7) * k;
    const lx = sx - 70, ly = sy + 150;
    tag(c, sx, sy, lx, ly, 'LAST TIME WE WERE HERE', kd, { align: 'right', gap: 14 });
    const k2 = L.prog(t, p2, 0.7) * k;
    if (k2 > 0) {
      const e = L.ease.outCubic(k2);
      c.save();
      c.globalAlpha *= L.clamp(k2 * 1.4);
      haloText(c, 'THE FIRST DINOSAURS', lx - 30, ly + 34, 2.4, 'right', GOLD, 1, 22, 700);
      drawEoraptor(c, lx - 30 - 150 + (1 - e) * 16, ly + 56, 1.25, 'rgba(236,226,206,A)', 1);
      haloText(c, 'EORAPTOR · LATE TRIASSIC', lx - 30, ly + 150, 1.4, 'right', SUBC, 0.9, 16, 600);
      c.restore();
    }
  },
};
