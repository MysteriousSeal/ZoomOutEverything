// Beat 0 — the hook. The hair (drawn by s01) lies diagonally low in frame, out of focus; it racks
// into focus under a light sweep while the masked headline rises line by line, then the hair swings
// up into the horizontal as the headline leaves. Warm macro dust drifts in front (foreground layer).
import * as L from '../../../../engine/runtime/lib.js';

const { W, H } = L;
const INK = [236, 240, 244];

// out-of-focus foreground motes (screen space with a little parallax)
const MOTES = (() => {
  const r = L.rng(707);
  return Array.from({ length: 9 }, () => ({ x: r() * W, y: 380 + r() * 1300, s: 30 + r() * 70, a: 0.03 + r() * 0.05, sp: 6 + r() * 14, ph: r() * 9 }));
})();

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 6,
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: 0.22, name: 'swish', gain: 0.24, pitch: 1.1 },
      { t: 0.5, name: 'swish', gain: 0.2, pitch: 1.25 },
      { t: 0.86, name: 'impact', gain: 0.42, pitch: 0.85 },
      { t: 1.35, name: 'shimmer', gain: 0.2, pitch: 1.1 },
      { t: d - 0.55, name: 'whoosh', gain: 0.26, pitch: 0.8 },
    ];
  },

  drawWorld(ctx, v) {
    // the engine skips overlays while v.k ≈ 0 (gt < ~0.0002, i.e. frame 0 and its early motion-blur
    // sub-frames), so draw the headline here for those instants: the very first frame already reads.
    if (v.gt <= 0.00016) headline(ctx, v);
    // foreground motes: present in the hook, gone once the zoom gets going
    const k = 1 - L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[1].end - 1.2, 1.2));
    if (k <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    MOTES.forEach((m, i) => {
      const x = m.x + L.noise1(v.gt * 0.15 + m.ph, 3) * 40 - v.gt * m.sp * 0.6;
      const y = m.y - v.gt * m.sp + L.noise1(v.gt * 0.12 + i, 8) * 30;
      L.lightBlob(ctx, ((x % W) + W) % W, y, m.s, [255, 214, 170], m.a * k);
    });
    ctx.restore();
  },

  drawOverlay(ctx, v) { headline(ctx, v); },
};

function headline(ctx, v) {
    const t = v.t, d = v.d;
    const lines = [
      { txt: 'HOW SMALL IS', y: 452, size: 138, t0: -0.22 },   // already mostly in at frame 0
      { txt: 'AN ATOM?', y: 640, size: 196, t0: 0.08, accentFrom: 3 },
    ];
    // thin accent rule above the headline
    const rk = L.enter(t, -0.3, 0.6, L.ease.outExpo) * (1 - L.enter(t, d - 0.62, 0.3, L.ease.inCubic));
    if (rk > 0) {
      ctx.fillStyle = L.rgba(v.accent, 0.95);
      ctx.fillRect(W / 2 - 64 * rk, 300, 128 * rk, 5);
    }
    lines.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.66, L.ease.outExpo);
      const kout = L.enter(t, d - 0.62 + i * 0.06, 0.34, L.ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      ctx.save();
      const size = L.fitSize(ctx, ln.txt, 900, ln.size, 800, L.FONT.display);
      ctx.font = L.font(size, 800, L.FONT.display);
      const top = ln.y - size * 0.8, bot = ln.y + size * 0.14;
      ctx.beginPath(); ctx.rect(0, top - 12, W, bot - top + 24); ctx.clip();
      const dy = (1 - kin) * size * 1.05 - kout * size * 1.1;
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 24;
      if (ln.accentFrom == null) {
        ctx.fillStyle = L.rgba(INK);
        L.trackedText(ctx, ln.txt, W / 2, ln.y + dy, -1, 'center');
      } else {
        // "AN " in ink, "ATOM?" in the accent with a soft glow, landing a beat later
        const a = ln.txt.slice(0, ln.accentFrom), b = ln.txt.slice(ln.accentFrom);
        ctx.letterSpacing = '-1px';
        const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
        ctx.letterSpacing = '0px';
        const x0 = W / 2 - (wa + wb) / 2;
        ctx.fillStyle = L.rgba(INK);
        L.trackedText(ctx, a, x0, ln.y + dy, -1, 'left');
        const kb = L.enter(t, ln.t0 + 0.12, 0.55, L.ease.outExpo);
        const dyb = (1 - kb) * size * 1.05 - kout * size * 1.1;
        ctx.fillStyle = L.rgba(v.accent);
        ctx.shadowColor = L.rgba(v.accent, 0.45 * (1 - kout));
        ctx.shadowBlur = 40;
        L.trackedText(ctx, b, x0 + wa, ln.y + dyb, -1, 'left');
      }
      ctx.restore();
    });
}
