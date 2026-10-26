// Beat 2 — Venus: a peppercorn, 18.7 m from the basketball Sun.
// Uses the shared planet-beat kit from s01-mercury.js (ring, arm, marker, magnifier lens, label).
import * as L from '../../../../engine/runtime/lib.js';
import { planetScene, sphere, peppercorn, ruler, tag } from './s01-mercury.js';

const MM = 51;                         // lens scale: px per millimetre
const BANDS = (() => { const r = L.rng(202); return Array.from({ length: 6 }, (_, i) => [(i / 6 - 0.5) * 1.6, 0.08 + r() * 0.1, r() * 6.28, r()]); })();

/** Venus: pale butterscotch cloud deck with soft, slowly drifting chevron bands. */
function venusDetail(gt) {
  return (c, x, y, r) => {
    c.save();
    c.translate(x, y);
    c.rotate(-0.35);
    for (const [v0, w, ph, s] of BANDS) {
      const yy = v0 * r;
      const drift = Math.sin(gt * 0.4 + ph) * r * 0.05;
      c.strokeStyle = s > 0.5 ? 'rgba(255,250,232,0.13)' : 'rgba(170,130,70,0.10)';
      c.lineWidth = w * r * 1.8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-r * 1.1, yy + drift);
      c.quadraticCurveTo(0, yy + r * 0.28 * (s - 0.3) + drift, r * 1.1, yy - drift);
      c.stroke();
    }
    c.restore();
  };
}

export default planetScene({
  beat: 3,
  name: 'venus',
  chapter: { num: '02', title: 'Venus', sub: 'The hottest planet' },
  pitch: 1.1,
  T: { arm: -0.2, armDur: 0.5, sweep: 0.45, sweepDur: 1.15, lens: 0.7, label: 1.6 },
  lens: { x: 828, y: 500, R: 176 },   // top right, clear of the label and of Venus's (low-framed) ring
  label: { x: 96, y: 1200, big: '2.1 mm', small: '19 m · 61 ft from the Sun' },
  dot: [255, 236, 200],
  contents(c, cx, cy, R, light, t, v, ck) {
    const y = cy - 40;
    const k1 = L.ease.outBack(L.prog(t, 1.0, 0.55), 1.4), k2 = L.ease.outBack(L.prog(t, 1.15, 0.55), 1.4);
    c.save();
    c.globalAlpha *= L.clamp(k1 * 1.5);
    sphere(c, cx - 68 - (1 - k1) * 30, y, 2.1 / 2 * MM, light, [[255, 240, 200], [222, 182, 112], [120, 82, 40]], venusDetail(v.gt), { night: 0.74, atmo: [255, 225, 170] });
    c.restore();
    c.save();
    c.globalAlpha *= L.clamp(k2 * 1.5);
    peppercorn(c, cx + 64 + (1 - k2) * 30, y + 2, 2.3 / 2 * MM, light, 21);
    c.restore();
    tag(c, 'VENUS', cx - 68, y + 70, k1, [cx, cy, R]);
    tag(c, 'PEPPERCORN', cx + 64, y + 70, k2, [cx, cy, R]);
    ruler(c, cx, cy + 108, 2, MM, ck, 0.5, '2 MM');
  },
});
