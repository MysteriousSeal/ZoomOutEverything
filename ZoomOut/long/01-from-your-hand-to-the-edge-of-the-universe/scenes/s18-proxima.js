// Beat 18: Four light-years away: | Proxima Centauri, the nearest star. | Voyager would need more than seventy thousand years to get there.
// Builder D. The stars themselves are drawn by layers/stars.js (true projected positions); this beat measures the
// Sun → Proxima gap, names Proxima and Alpha Centauri, and gives Voyager 1's travel time.
import * as L from '../../../../engine/runtime/lib.js';
import { SUN } from '../camera.js';
import { ACCENT } from '../world.js';
import { starById } from '../layers/stars.js';
import { ph, phc, tag, ring, measure, figure, haloText, INKD } from '../layers/d-ui.js';

const B = 18;
const RED = [255, 170, 140];

export default {
  beat: B,
  chapter: { num: '11', title: 'The Nearest Stars', sub: 'Proxima Centauri, 4.24 light-years' },
  cues() {
    return [
      { t: phc(B, 0, 0.15) + 0.2, name: 'shimmer', gain: 0.16, pitch: 0.8 },
      { t: phc(B, 1, 2.1) + 0.05, name: 'ping', gain: 0.2, pitch: 0.9 },
      { t: phc(B, 2, 4.8) + 0.4, name: 'tick', gain: 0.22, pitch: 0.8 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    const p0 = ph(v, B, 0), p1 = ph(v, B, 1), p2 = ph(v, B, 2);
    const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
    const P = starById('prox'), A = starById('acen');
    const px = v.wx(P.p.x), py = v.wy(P.p.y), ax = v.wx(A.p.x), ay = v.wy(A.p.y);
    // the Sun
    tag(c, sx, sy, sx - 44, sy - 52, 'THE SUN', L.prog(t, p0 + 0.1, 0.6) * k, { align: 'right', gap: 12 });
    // Sun → Proxima, measured (stops short of both glows)
    const dx = px - sx, dy = py - sy, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
    const km = L.prog(t, p0 + 0.35, 1.2);
    c.save();
    c.globalAlpha *= k;
    measure(c, sx + ux * 14, sy + uy * 14, px - ux * 13, py - uy * 13, km, ACCENT, 0.85, 6);
    c.restore();
    // distance label beside the line's middle (on its upper-right side)
    const mx = (sx + px) / 2 + uy * 26, my = (sy + py) / 2 - ux * 26;
    const kl = L.prog(t, p0 + 1.0, 0.6) * k;
    if (kl > 0) {
      c.save();
      c.globalAlpha *= L.clamp(kl * 1.4);
      c.textBaseline = 'middle';
      haloText(c, '4.24 LIGHT-YEARS', mx + 10, my, 2.4, 'left', ACCENT, 1, 20, 700);
      haloText(c, '40 TRILLION KM', mx + 10, my + 24, 1.6, 'left', [178, 192, 210], 0.9, 16, 600);
      c.restore();
    }
    // Proxima: ring + name (left of it, under the line)
    ring(c, px, py, 13, L.prog(t, p1, 0.5) * k, RED, 0.8);
    tag(c, px, py, px - 30, py + 34, 'PROXIMA CENTAURI', L.prog(t, p1 + 0.1, 0.7) * k,
      { align: 'right', col: [255, 214, 200], sub: 'RED DWARF · 4.24 LY', gap: 14 });
    // Alpha Centauri A & B, its two bright companions
    tag(c, ax, ay, ax + 44, ay - 58, 'ALPHA CENTAURI A & B', L.prog(t, p1 + 0.8, 0.7) * k,
      { sub: '4.37 LY', gap: 14 });
    // Voyager 1's travel time
    const kv = L.prog(t, p2 + 0.15, 0.7) * k;
    const fx = Math.min(1150, sx + 190), fy = Math.max(300, sy + 50);
    figure(c, fx, fy, 'MORE THAN 70,000 YEARS', "TO GET THERE AT VOYAGER 1'S SPEED · 17 KM/S", kv, { size: 40, accent: [255, 214, 150] });
  },
};
