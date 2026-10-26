// Beat 3 — Earth: a peppercorn too, 25.8 m from the basketball Sun.
// Uses the shared planet-beat kit from s01-mercury.js. The Earth in the lens is the real Earth (earth.js) and slowly turns.
import * as L from '../../../../engine/runtime/lib.js';
import { planetScene, sphere, peppercorn, ruler, tag } from './s01-mercury.js';
import { drawEarth, project } from '../../../../engine/runtime/earth.js';

const MM = 51;
// a few soft cloud bands [lon, lat, length, seed]; they drift a little faster than the ground turns
const CLOUDS = (() => { const r = L.rng(303); return Array.from({ length: 12 }, () => [r() * 360 - 180, (r() - 0.5) * 120, 0.18 + r() * 0.3, r()]); })();

/** The real Earth (ETOPO1 coastlines, Blue-Marble day style), lit from the Sun's direction `la` (screen angle). */
function earthDetail(gt, la) {
  const lon0 = 5 - (gt - 12) * 9, lat0 = 18;   // Africa / Europe / the Atlantic, turning eastward (real spin)
  return (c, x, y, r) => {
    const sun = [Math.cos(la), -Math.sin(la), 0.45];
    drawEarth(c, { cx: x, cy: y, r, lon0, lat0, style: 'day', sun, atmosphere: 0.7, relief: 1.2 });
    // cloud wisps on the lit side
    const view = { cx: x, cy: y, r, lon0: lon0 + gt * 3, lat0 };
    c.save();
    c.lineCap = 'round';
    for (const [lo, la2, len, s] of CLOUDS) {
      const p = project(la2, lo, view);
      if (p.z < 0.2) continue;
      const lit = L.clamp(((p.x - x) * Math.cos(la) + (p.y - y) * Math.sin(la)) / r + 0.6);
      if (lit <= 0) continue;
      c.strokeStyle = `rgba(255,255,255,${0.2 * p.z * lit})`;
      c.lineWidth = Math.max(0.6, r * (0.035 + 0.03 * s));
      c.beginPath();
      c.ellipse(p.x, p.y, Math.max(0, r * len * p.z), Math.max(0, r * 0.05), -0.25 + s * 0.5, 0, Math.PI * 0.9);
      c.stroke();
    }
    c.restore();
  };
}

export default planetScene({
  beat: 4,
  name: 'earth',
  chapter: { num: '03', title: 'Earth', sub: 'Home' },
  pitch: 0.95,
  T: { arm: -0.2, armDur: 0.5, sweep: 0.45, sweepDur: 1.15, lens: 0.75, label: 1.75 },
  lens: { x: 776, y: 820, R: 176 },
  label: { x: 96, y: 1200, big: '2.2 mm', small: '26 m · 85 ft from the Sun' },
  dot: [190, 225, 255],
  glow: [120, 180, 255],
  contents(c, cx, cy, R, light, t, v, ck) {
    const y = cy - 40;
    const k1 = L.ease.outBack(L.prog(t, 1.05, 0.55), 1.4), k2 = L.ease.outBack(L.prog(t, 1.2, 0.55), 1.4);
    c.save();
    c.globalAlpha *= L.clamp(k1 * 1.5);
    sphere(c, cx - 68 - (1 - k1) * 30, y, 2.2 / 2 * MM, light, [[110, 170, 230], [40, 92, 170], [10, 28, 70]], earthDetail(v.gt, light), { night: 0.3, atmo: [120, 180, 255], spec: 0 });
    c.restore();
    c.save();
    c.globalAlpha *= L.clamp(k2 * 1.5);
    peppercorn(c, cx + 64 + (1 - k2) * 30, y + 2, 2.3 / 2 * MM, light, 33);
    c.restore();
    tag(c, 'EARTH', cx - 68, y + 70, k1, [cx, cy, R]);
    tag(c, 'PEPPERCORN', cx + 64, y + 70, k2, [cx, cy, R]);
    ruler(c, cx, cy + 108, 2, MM, ck, 0.5, '2 MM');
  },
});
