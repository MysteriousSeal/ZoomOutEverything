// Beat 10 — "Then it's gone." The camera pulls back from the Challenger Deep to the whole dry Pacific face (shot `gone`,
// 58.52 → ≈ 60.4). No text: the HUD already reads NO OCEAN LEFT, so the image is allowed to land. The only motion
// design is one slow, low-contrast light sweep that crosses the bare planet as the pull-back settles (a "reveal" glint
// over the dry sea floor), and a faint warm dust halo that replaces the blue atmosphere read while the planet is dry.
// Both are clipped to the disc / its rim, cheap (two gradients), and gone before beat 11's stand arrives.
import * as L from '../../../../engine/runtime/lib.js';
import { globeDisc } from '../env.js';

export default {
  beat: 10,
  chapter: null,
  layer: 10,
  cues(d) {
    return [
      { t: 0.15, name: 'deep', gain: 0.3, pitch: 0.6 },      // the last water goes
      { t: 0.9, name: 'shimmer', gain: 0.14, pitch: 0.8 },   // the sweep crosses the dry planet
    ];
  },
  drawWorld(ctx, v) {
    // live from the beat start until early in beat 11 (the classroom move)
    if (v.t < 0 || v.t > v.d + 0.9) return;
    const D = globeDisc(v);
    if (D.r < 40 || D.r > 2000) return;
    const kIn = L.smoothstep(L.prog(v.t, 0.6, 0.8));
    const kOut = 1 - L.smoothstep(L.prog(v.t, v.d - 0.1, 0.9));
    const k = kIn * kOut;
    if (k <= 0) return;
    ctx.save();
    // warm dust rim: the dry planet's halo reads ochre, not blue
    ctx.globalCompositeOperation = 'lighter';
    const h = ctx.createRadialGradient(D.x, D.y, D.r * 0.96, D.x, D.y, D.r * 1.1);
    h.addColorStop(0, 'rgba(210,150,90,0)');
    h.addColorStop(0.3, `rgba(210,150,90,${0.16 * k})`);
    h.addColorStop(1, 'rgba(210,150,90,0)');
    ctx.fillStyle = h;
    ctx.beginPath(); ctx.arc(D.x, D.y, Math.max(0, D.r * 1.1), 0, Math.PI * 2); ctx.fill();
    // diagonal light sweep across the disc (upper-left → lower-right)
    const s = L.ease.inOutCubic(L.prog(v.t, 0.7, 1.6));
    if (s > 0 && s < 1) {
      ctx.beginPath(); ctx.arc(D.x, D.y, Math.max(0, D.r), 0, Math.PI * 2); ctx.clip();
      const c = L.lerp(-1.4, 1.4, s) * D.r;                   // band centre along the diagonal
      const ux = Math.SQRT1_2, uy = Math.SQRT1_2, bw = D.r * 0.45;
      const g = ctx.createLinearGradient(D.x + ux * (c - bw), D.y + uy * (c - bw), D.x + ux * (c + bw), D.y + uy * (c + bw));
      const a = 0.2 * k * Math.sin(Math.PI * s);
      g.addColorStop(0, 'rgba(255,236,210,0)');
      g.addColorStop(0.5, `rgba(255,236,210,${a})`);
      g.addColorStop(1, 'rgba(255,236,210,0)');
      ctx.fillStyle = g;
      ctx.fillRect(D.x - D.r, D.y - D.r, D.r * 2, D.r * 2);
    }
    ctx.restore();
  },
};
