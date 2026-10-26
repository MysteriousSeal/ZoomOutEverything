// Beat 18 — "By the end of this video, | you're not quite the same person who started it."
// The camera pulls back to the whole person. The counter returns above the head, still rolling with the stopwatch
// (≈ 300 million and climbing), the ring pulses on the watch again. On "you're not quite the same person" a slow glint
// of light sweeps up through the body and a last flush of sparks follows it; the body keeps a faint new warmth.
// The counter is back from the beat start (≈ 300 million, "new cells since the clock started"); once the voice is done
// a closing line settles under it, "NOT QUITE THE SAME YOU" (≈ 320 million by then), with a quiet sign-off.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, bodyPath, cellsReplaced } from '../env.js';
import { TT, drawCounter, watchRing, secondBeat, drawSparks, frameTime } from './s14-strangest.js';

const C_IN = TT.b18 + 0.2;        // the counter returns right at the beat start (the tie to the clock never breaks)
const L1 = C_IN + 0.35;
const G0 = TT.youre + 0.1;        // the glint sweeps up the body
const G_DUR = 1.9;
const SIGN = TT.voEnd + 0.6;      // sign-off
const SWAP = TT.voEnd + 0.05;     // a closing statement lands under the counter's line

export default {
  beat: 18,
  chapter: null,
  captions: true,
  layer: 4,
  cues() {
    const b = TT.b18;
    return [
      { t: 0.03, name: 'whoosh', gain: 0.22, pitch: 0.75 },
      { t: C_IN - b, name: 'count', gain: 0.22, pitch: 1.0 },
      { t: G0 - b, name: 'shimmer', gain: 0.3, pitch: 0.9 },
      { t: G0 - b + 0.1, name: 'swell', gain: 0.32, pitch: 0.8 },
      { t: G0 - b + G_DUR - 0.3, name: 'bloom', gain: 0.38, pitch: 0.8 },
      { t: SIGN - b, name: 'deep', gain: 0.25, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt;
    if (gt < TT.b18 || v.cam.mpp < 3e-4) return;
    watchRing(c, v, L.ease.outCubic(L.prog(gt, C_IN + 0.3, 0.6)));
    const gp = L.prog(gt, G0, G_DUR);
    const warm = L.ease.inOutCubic(L.prog(gt, G0 + 0.6, 1.6));
    if (gp <= 0 && warm <= 0) return;
    c.save();
    c.beginPath(); bodyPath(c, v); c.clip();
    c.globalCompositeOperation = 'lighter';
    // a lasting faint warmth: the "new you"
    if (warm > 0) {
      const x = v.wx(0), y = v.wy(-1.0), r = v.ws(0.95);
      const g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
      g.addColorStop(0, L.rgba(ACCENT, 0.09 * warm)); g.addColorStop(1, L.rgba(ACCENT, 0.02 * warm));
      c.fillStyle = g; c.fillRect(0, 0, L.W, L.H);
    }
    // the glint: a soft diagonal band of light rising from the feet to the head
    if (gp > 0 && gp < 1) {
      const e = L.ease.inOutCubic(gp);
      const yh = L.lerp(0.15, -1.95, e);                   // band centre (world y)
      const y0 = v.wy(yh), half = v.ws(0.22), tilt = v.ws(0.12);
      const g = c.createLinearGradient(0, y0 - half + tilt, 0, y0 + half + tilt);
      const a = Math.sin(Math.PI * gp);
      g.addColorStop(0, 'rgba(255,220,220,0)'); g.addColorStop(0.5, `rgba(255,232,228,${0.32 * a})`); g.addColorStop(1, 'rgba(255,220,220,0)');
      c.fillStyle = g;
      c.save(); c.translate(L.W / 2, y0); c.rotate(-0.18); c.translate(-L.W / 2, -y0);
      c.fillRect(-200, y0 - half - 400, L.W + 400, 2 * half + 800);
      c.restore();
    }
    c.restore();
    // a last flush of sparks riding the glint
    if (gp > 0 && gp < 1) drawSparks(c, v, 0.9 * Math.sin(Math.PI * gp));
  },
  drawOverlay(c, v) {
    const gt = v.gt;
    // the counter waits until the pull-back has put the head below its text block (top of the head under y ≈ 560)
    const headTop = 960 + (-1.78 - v.cam.y) / v.cam.mpp;
    const ck = L.prog(gt, C_IN, 0.6) * L.ease.inOutCubic(L.prog(headTop, 505, 55));
    if (ck > 0) {
      drawCounter(c, {
        x: 540, y: 480, n: cellsReplaced(frameTime(gt), v.tl), size: 116, k: ck, beat: secondBeat(gt, v.tl),
        lines: [{ text: 'new cells since the clock started', k: L.prog(gt, L1, 0.5), size: 27 }],
      });
      // once the voice is done, the closing statement settles under it (accent)
      const sk2 = L.prog(gt, SWAP + 0.3, 0.5);
      if (sk2 > 0) {
        const le = L.ease.outCubic(sk2);
        c.save();
        c.globalAlpha = L.clamp(sk2 * 1.4) * L.clamp(ck * 1.4);
        c.textBaseline = 'alphabetic';
        c.font = L.font(30, 700, L.FONT.body);
        c.fillStyle = L.rgba([255, 170, 176], 0.97);
        c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
        L.trackedText(c, 'NOT QUITE THE SAME YOU', 540, 480 + 52 + 41 + 4 + (1 - le) * 18, 4, 'center');
        c.restore();
      }
    }
    // sign-off, once the voice is done (where the captions were)
    const sk = L.ease.outCubic(L.prog(gt, SIGN, 0.8));
    if (sk > 0) {
      c.save();
      c.globalAlpha = sk * 0.85;
      c.font = L.font(24, 600, L.FONT.body);
      c.fillStyle = 'rgba(215,222,235,0.9)';
      c.textBaseline = 'alphabetic';
      L.trackedText(c, 'ZOOM OUT  ·  INSIDE YOU', 540, 1352 + (1 - sk) * 10, 6, 'center');
      c.fillStyle = L.rgba(ACCENT, 0.9);
      c.fillRect(540 - 22 * sk, 1312, 44 * sk, 3);
      c.restore();
    }
  },
};
