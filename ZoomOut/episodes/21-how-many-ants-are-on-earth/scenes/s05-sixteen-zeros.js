// Beat 5 (ep 21) — "That's a two, followed by sixteen zeros."
// The same odometer (s04) holds its landed value. On "a two" the leading 2 pops; then the sixteen zeros light up one by
// one, left to right, each with a tick, while an amber bracket grows under them and the line below counts "1 ZERO" …
// "16 ZEROS". One focal element: the number itself.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { CTR, drawCounter, subLine, counterBox, L10_END } from './s04-quadrillion.js';

const { ease, clamp, prog, rgba } = L;
// beat-relative timing (voice line 28.93–31.45, beat start 28.78): "two" ≈ +0.5 s, "sixteen zeros" ≈ +1.8–2.6 s
const T5 = { two: 0.42, z0: 1.0, dz: 0.095 };
const zeroAt = (i) => T5.z0 + i * T5.dz;          // i = 0 … 15, place p = 15 − i
const Z_END = zeroAt(15);

export default {
  beat: 5,
  chapter: null,
  layer: 5,
  overlayIn: false,   // the counter carries straight on from s04
  cues(d) {
    const out = [{ t: T5.two, name: 'blip', gain: 0.3, pitch: 0.9 }];
    for (let i = 0; i < 16; i++) out.push({ t: zeroAt(i), name: 'tick', gain: 0.16, pitch: 1 + i * 0.045 });
    out.push({ t: Z_END + 0.08, name: 'ping', gain: 0.22, pitch: 1.2 });
    return out;
  },
  drawWorld(ctx, v) {},
  drawOverlay(ctx, v) {
    const t = v.t, k = v.t < 0 ? 0 : v.k;
    if (k <= 0) return;
    const lit = (p) => {
      if (p === 16) return 1;
      const i = 15 - p;
      return ease.outCubic(prog(t, zeroAt(i), 0.18));
    };
    const pop = (p) => {
      if (p === 16) return Math.sin(Math.PI * prog(t, T5.two, 0.5)) * 1.0;
      const i = 15 - p;
      return Math.sin(Math.PI * prog(t, zeroAt(i), 0.26)) * 0.55;
    };
    drawCounter(ctx, { l10: L10_END, t: v.gt, k, lit, pop });
    // bracket under the zeros, growing with each lit zero
    const box = counterBox(ctx), lay = box.l;
    const n = clamp((t - T5.z0) / T5.dz + 1, 0, 16);
    if (n > 0) {
      const x0 = lay.xs[15] + 6;
      const iLast = Math.min(15, Math.floor(n - 1e-6));
      const xEnd = lay.xs[15 - iLast] + lay.dw - 6;
      const xPrev = iLast > 0 ? lay.xs[15 - iLast + 1] + lay.dw - 6 : x0;
      const x1 = L.lerp(xPrev, xEnd, ease.outCubic(clamp((t - zeroAt(iLast)) / 0.12)));
      const y = CTR.base + 24;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.strokeStyle = rgba(ACCENT, 0.95);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y - 12); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 12 * clamp(n / 16 * 4 - 3)); ctx.stroke();
      ctx.restore();
      const count = Math.max(1, Math.min(16, Math.floor(n + 1e-6)));
      subLine(ctx, count === 1 ? '1 ZERO' : `${count} ZEROS`, CTR.base + 112, {
        k: k * ease.outCubic(prog(t, T5.z0, 0.3)), size: 76, weight: 800, family: L.FONT.display, col: ACCENT, alpha: 1, track: 2, rise: 0,
      });
    }
    // the "20 QUADRILLION ANTS" line from s04 hands over
    const a0 = 1 - ease.inCubic(prog(t, T5.z0 - 0.22, 0.22));
    subLine(ctx, '20 QUADRILLION ANTS', CTR.base + 112, { k: k * a0, size: 76, weight: 800, family: L.FONT.display, col: ACCENT, alpha: 1, track: 2, rise: 0, maxW: 900 });
  },
};
