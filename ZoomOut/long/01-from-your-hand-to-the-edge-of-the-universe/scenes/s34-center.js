// Beat 34: And since light reaches us from every direction at the same speed, | the center of the observable universe | is right where you are.
// Builder E. Light converges on the centre from every direction along the radii; then "YOU ARE HERE" at the exact centre.
import * as L from '../../../../engine/runtime/lib.js';
import { ph, kin, decoK, callout, GOLD } from '../layers/e-ui.js';
import { uni } from './s30-observable.js';

const N = 36;

function drawWorld(c, v) {
  const s = v.gt - v.tl.scenes[34].start;
  if (s < 0) return;
  const k = kin(s, 0.3, 1.2) * decoK(v);
  if (k <= 0) return;
  const { x, y, r } = uni(v);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * Math.PI * 2 + 0.09;
    const ux = Math.cos(a), uy = Math.sin(a);
    // the ray's faint track
    c.strokeStyle = L.rgba(GOLD, 0.07 * k); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x + ux * r * 0.97, y + uy * r * 0.97); c.lineTo(x + ux * 14, y + uy * 14); c.stroke();
    // pulses travelling inward at the same speed from every direction (they all arrive together)
    for (let j = 0; j < 3; j++) {
      const ph = ((s * 0.24 + j / 3) % 1);
      const f0 = 0.97 * (1 - ph), f1 = Math.min(0.97, f0 + 0.09);
      if (f0 * r < 12) continue;
      const g = c.createLinearGradient(x + ux * r * f1, y + uy * r * f1, x + ux * r * f0, y + uy * r * f0);
      g.addColorStop(0, L.rgba(GOLD, 0));
      g.addColorStop(1, L.rgba([255, 240, 205], 0.75 * k * Math.min(1, ph * 6)));
      c.strokeStyle = g; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(x + ux * r * f1, y + uy * r * f1); c.lineTo(x + ux * r * f0, y + uy * r * f0); c.stroke();
    }
  }
  // a steady glow at the centre where it all arrives
  L.lightBlob(c, x, y, 34, GOLD, 0.35 * k);
  c.restore();
}

function drawOverlay(c, v) {
  const t = v.t, p = [0, 1, 2].map((i) => ph(v, 34, i));
  const { x, y } = uni(v);
  // a pulse ring on "the center of the observable universe"
  const pr = L.prog(t, p[1] + 0.3, 1.6);
  if (pr > 0 && pr < 1) {
    c.save();
    c.globalAlpha = (1 - pr) * 0.8 * v.k;
    c.strokeStyle = L.rgba(GOLD, 1); c.lineWidth = 1.8;
    c.beginPath(); c.arc(x, y, 12 + 70 * L.ease.outCubic(pr), 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  const k = kin(t, p[2] + 0.05, 0.6) * v.k;
  if (k > 0) callout(c, x, y, x + 62, y - 70, [{ s: 'YOU ARE HERE', color: GOLD, size: 24 }], k, { ring: 15, color: GOLD });
}

export default {
  beat: 34,
  chapter: null,
  layer: 2,
  cues(d) {
    return [
      { t: 0.4, name: 'shimmer', gain: 0.2, pitch: 0.7 },
      { t: 7.15, name: 'ping', gain: 0.22, pitch: 0.75 },
      { t: Math.max(7.9, d - 1.3), name: 'riser', gain: 0.4, pitch: 0.8 },
    ];
  },
  drawWorld,
  drawOverlay,
};
