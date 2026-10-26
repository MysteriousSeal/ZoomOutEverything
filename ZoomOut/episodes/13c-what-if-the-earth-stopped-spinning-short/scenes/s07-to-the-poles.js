// 13c: no longer a beat. 13b's beat 7 ("Without it, that water slides toward the poles.") is folded into the poles
// beat (s06, BEAT.poles), which calls drawArrows() below; its cues moved there too.
// The shell of water (s06) slides along the limb from the equator to both poles while, on the face, the sea
// drains outward from the equator (the sea floor appears behind a foamy shoreline) and strong current streaks
// run poleward (both drawn by s05). This scene adds the guide: four thin arc arrows just outside the limb,
// drawn on with the water ("slides toward the poles"), each with a bright pulse travelling poleward.
import * as L from '../../../../engine/runtime/lib.js';
import { BEAT, globeGeom, globeVisible } from '../env.js';
import { TB, W7, surfaceState } from './s05-oceans-move.js';
import { EXAG } from './s06-bulge.js';

const DEG = Math.PI / 180;
const LA0 = 10 * DEG, LA1 = 64 * DEG;

/** Screen point on the circle of radius rr at limb latitude la, on side sx (−1 west / +1 east). */
function limbPt(g, rr, la, sx) {
  return [g.cx + sx * rr * Math.cos(la), g.cy - rr * Math.sin(la)];
}

function drawArrow(c, g, sx, sy, draw, pulse, a) {
  const rr = g.r * (1 + EXAG + 0.055);
  const end = L.lerp(LA0, LA1, draw);
  const N = 40;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  // the arc
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const la = L.lerp(LA0, end, i / N);
    const [x, y] = limbPt(g, rr, sy * la, sx);
    c[i ? 'lineTo' : 'moveTo'](x, y);
  }
  c.strokeStyle = `rgba(90,220,235,${0.55 * a})`;
  c.lineWidth = 2.2;
  c.stroke();
  // a bright pulse sliding poleward along the drawn part
  if (draw > 0.2) {
    const pc = L.lerp(LA0, end, pulse), pw = 9 * DEG;
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const la = L.clamp(pc - pw + (pw * i) / 12, LA0, end);
      const [x, y] = limbPt(g, rr, sy * la, sx);
      c[i ? 'lineTo' : 'moveTo'](x, y);
    }
    c.strokeStyle = `rgba(210,250,255,${0.85 * a * Math.sin(Math.PI * pulse)})`;
    c.lineWidth = 3.2;
    c.stroke();
  }
  // arrowhead at the tip, tangent to the arc (pointing poleward)
  const [hx, hy] = limbPt(g, rr, sy * end, sx);
  const tx = -sx * Math.sin(end), ty = -sy * Math.cos(end);          // d/d(la) of the limb point, poleward
  const m = Math.hypot(tx, ty) || 1, ux = tx / m, uy = ty / m;
  const s = 13 * Math.min(1, draw * 4);
  c.fillStyle = `rgba(120,232,245,${0.9 * a})`;
  c.beginPath();
  c.moveTo(hx + ux * s, hy + uy * s);
  c.lineTo(hx - ux * s * 0.6 - uy * s * 0.62, hy - uy * s * 0.6 + ux * s * 0.62);
  c.lineTo(hx - ux * s * 0.6 + uy * s * 0.62, hy - uy * s * 0.6 - ux * s * 0.62);
  c.closePath();
  c.fill();
  c.restore();
}

/** 13c: drawn by s06 (BEAT.poles), on the slide's own clock: t from TB(v, 7) ("slides" − W7.slides), out at the beat's end. */
export function drawArrows(ctx, v) {
  const t = v.gt - TB(v, 7), d = v.tl.scenes[BEAT.poles].end - TB(v, 7);
  if (t < -0.2 || t > d + 1.5) return;
  const st = surfaceState(v);
  if (st.k <= 0.003) return;
  const g = globeGeom(v);
  if (!globeVisible(g) || g.r < 60) return;
  const draw = L.ease.inOutCubic(L.prog(t, W7.water - 0.15, 1.5));
  // 13b fix: leave with s06's shell, fully gone by the end of the poles beat
  const out = L.ease.inOutCubic(L.prog(v.gt, TB(v, 8) - 0.45, 0.4));
  const a = st.k * L.clamp(draw * 3) * (1 - out);
  if (a <= 0.003) return;
  for (const [sx, sy, ph] of [[-1, 1, 0], [1, 1, 0.25], [-1, -1, 0.5], [1, -1, 0.75]]) {
    const pulse = (((t - W7.slides) * 0.75 + ph * 0.3) % 1 + 1) % 1;
    drawArrow(ctx, g, sx, sy, draw, pulse, a);
  }
}
