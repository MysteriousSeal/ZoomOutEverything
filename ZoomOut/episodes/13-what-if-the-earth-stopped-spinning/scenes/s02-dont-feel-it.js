// Beat 2 — "You don't feel it, because everything moves with you."
// Life goes on in s01's city (cars drive, people walk). The frame-of-reference device: your long east vector
// from beat 1 shrinks to a common length, then the SAME vector appears on everything — a car going east, a car
// going west, a walker, a tree, a rooftop, the fountain — staggered, riding with each object. On "everything"
// a faint field of identical vectors covers the whole ground, and on "with you" they all pulse together.
import * as L from '../../../../engine/runtime/lib.js';
import { YOU, FOUNTAIN, drawVector, looseAt, scrim } from './s01-equator.js';
import { wordTime } from '../env.js';

const { W, H } = L;
const VLEN = 112;                    // the common vector length on screen (px)

// pick the tagged objects once (deterministic): the car / walker nearest a target spot at mid-beat
let PICK = null;
function picks(tl) {
  if (PICK) return PICK;
  const mid = tl.scenes[2].start + 1.4;
  const items = looseAt(mid);
  const near = (f, x, y) => items.filter(f).reduce((a, o) => (!a || Math.hypot(o.x - x, o.y - y) < Math.hypot(a.x - x, a.y - y) ? o : a), null);
  PICK = [
    near((o) => o.kind === 'car' && o.vx > 1, -18, 6),
    near((o) => o.kind === 'car' && o.vx < -1, 34, -6),
    near((o) => o.kind === 'person' && !o.you && Math.abs(o.y) > 17 && o.y > 0 && o.vx !== 0, 30, 19),
    near((o) => o.kind === 'car' && o.vx === 0 && o.y < 0, -26, -13.6),
  ].filter(Boolean).map((o) => o.id);
  return PICK;
}
// fixed things that also carry the vector: a tree, a rooftop, the fountain
const FIXED = [{ x: 31, y: -46 }, { x: -18, y: 26.8 }];

export default {
  beat: 2,
  chapter: { num: '02', title: 'Along for the ride' },
  captions: true,
  layer: 1,
  // beat 2 starts at 9.43: "You" 9.58, "everything" 10.82, "with you" 11.54
  cues(d) {
    return [
      { t: 0.15, name: 'swish', gain: 0.18, pitch: 1.2 },
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ t: 0.5 + i * 0.09, name: 'tick', gain: 0.14, pitch: 1.1 + i * 0.06 })),
      { t: 1.38, name: 'shimmer', gain: 0.24, pitch: 1 },
      { t: 2.1, name: 'bloom', gain: 0.18, pitch: 1.1 },
    ];
  },
  drawWorld() {},
  drawOverlay(ctx, v) {
    const gt = v.gt, t = v.t, acc = v.accent;
    const tEvery = wordTime(v.tl, 2, /everything/i), tWith = wordTime(v.tl, 2, /^with$/i);
    const pulse = Math.exp(-Math.max(0, gt - tWith) * 3) * L.smoothstep(L.clamp((gt - tWith + 0.1) / 0.1));
    const style = (a) => ({ w: 6, alpha: a, glowA: 0.45 + 0.4 * pulse, flow: gt });
    // 1) the field: every ~120 px of ground carries the same vector (very faint), on "everything"
    const kf = L.ease.inOutCubic(L.prog(gt, tEvery - 0.15, 0.7)) * v.k;
    if (kf > 0) {
      ctx.save();
      const sp = 150, ox = ((v.wx(0) % sp) + sp) % sp, oy = ((v.wy(0) % sp) + sp) % sp;
      for (let y = oy - sp + 75; y < 1240; y += sp) {
        if (y < 330) continue;
        for (let x = ox - sp; x < W - 140; x += sp) {
          const dd = Math.hypot(x - W / 2, y - 806) / 900;
          drawVector(ctx, x, y, 46, 1, { w: 3, alpha: kf * (0.3 + 0.25 * pulse) * (1 - dd * 0.5), glowA: 0.2 });
        }
      }
      ctx.restore();
    }
    // 2) you: the long beat-1 vector shrinks to the common length
    const ky = v.k;
    const shrink = L.ease.inOutCubic(L.prog(t, 0.0, 0.7));
    const yx = v.wx(YOU.x), yy = v.wy(YOU.y);
    const long = Math.min(900, W - 150) - (yx + 30);
    drawVector(ctx, yx + 14, yy, L.lerp(long + 16, VLEN, shrink), 1, { ...style(ky), w: L.lerp(9, 6, shrink) });
    ctx.save();
    ctx.globalAlpha = ky;
    ctx.strokeStyle = L.rgba(acc, 0.95);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(yx, yy, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // 3) the same vector on everything else, staggered
    const items = looseAt(gt);
    const ids = picks(v.tl);
    const anchors = [
      ...ids.map((id) => items.find((o) => o.id === id)).filter(Boolean).map((o) => ({ x: o.x, y: o.y })),
      ...FIXED,
    ];
    anchors.forEach((p, i) => {
      const k = L.prog(t, 0.5 + i * 0.09, 0.55) * v.k;
      if (k <= 0) return;
      const sx = v.wx(p.x), sy = v.wy(p.y);
      if (sx < -50 || sx > W - 150 || sy < 320 || sy > 1500) return;
      ctx.save();
      ctx.globalAlpha = L.clamp(k * 2);
      ctx.fillStyle = L.rgba(acc);
      ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      drawVector(ctx, sx + 8, sy, VLEN, k, style(1));
    });
    // 4) the idea in words (two text elements: big + small)
    const kl = L.prog(t, 0.95, 0.6) * v.k;
    if (kl > 0) {
      scrim(ctx, 64, 430, 640, 230, kl);
      L.bigLabel(ctx, { x: 96, y: 560, big: 'Same speed', small: 'everything moves with you', k: kl, accent: acc, size: 104 });
    }
  },
};
