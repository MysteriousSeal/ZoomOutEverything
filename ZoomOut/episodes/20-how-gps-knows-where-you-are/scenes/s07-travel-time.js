// Beat 7 — "Those signals reach you in about seven hundredths of a second."
// The broadcast clears and ONE pulse is followed: a guide line draws itself from B to the phone (20,437 km, the
// true straight path), the pulse leaves B and slides down it with a hot trail, slowed about 21× so it can be seen. A gold
// timer runs 0.000 → 0.068 s in step with it and locks on arrival (ping, receive ripple, bracket snap); its label
// then turns into the distance.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CLOCK, DOT, SAT_B } from '../env.js';
import { drawReadout, wordT } from './s04-atomic-clocks.js';

const DELAY = SAT_B.range / 299792458;          // 0.068 s
const RUN = 1.45;                               // on-screen travel (s): lands on "hundredths"; slowed ≈ 21×
const SLOW = Math.round(RUN / DELAY);
const hot = [215, 255, 220];

function times(v) {
  const t0 = wordT(v.tl, 7, 0, 2) - 0.05;       // launch on "reach"
  return { t0, t1: t0 + RUN };
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Travel time', sub: 'at the speed of light' },
  captions: true,
  layer: 5,
  cues(d) {
    // times are fixed relative to the word timing at render time; mirror them with the default timeline values
    const t0 = 0.85, t1 = t0 + RUN;
    return [
      { t: 0.3, name: 'tick', gain: 0.12, pitch: 1.4 },
      { t: t0 - 0.02, name: 'whoosh', gain: 0.32, pitch: 1.5 },
      { t: t0, name: 'count', gain: 0.16, pitch: 1.2 },
      { t: t1, name: 'ping', gain: 0.38, pitch: 1.15 },
      { t: t1 + 0.02, name: 'impact', gain: 0.2, pitch: 1.4 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < 0 || t > v.d + 0.8) return;
    const { t0, t1 } = times(v);
    const bx = v.wx(SAT_B.x), by = v.wy(SAT_B.y), px = v.wx(0), py = v.wy(0);
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.1, 0.5));
    if (out <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // the guide: a fine dashed line that draws itself down, then turns solid green behind the pulse
    const gk = L.ease.inOutCubic(L.prog(t, 0.15, 0.6));
    if (gk > 0) {
      ctx.strokeStyle = `rgba(220,230,245,${0.32 * out})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(L.lerp(bx, px, gk), L.lerp(by, py, gk)); ctx.stroke();
      ctx.setLineDash([]);
    }
    // B charges just before launch
    const charge = L.ease.inOutCubic(L.prog(t, t0 - 0.55, 0.55)) * (1 - L.prog(t, t0, 0.15));
    if (charge > 0) {
      L.lightBlob(ctx, bx, by, 60, ACCENT, 0.6 * charge * out);
      ctx.strokeStyle = L.rgba(ACCENT, 0.7 * charge * out); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, Math.max(0, 8 + 46 * (1 - charge)), 0, Math.PI * 2); ctx.stroke();
    }
    const p = L.prog(t, t0, RUN);                 // linear: light doesn't ease
    if (p > 0) {
      const hx = L.lerp(bx, px, p), hy = L.lerp(by, py, p);
      // the travelled path stays lit (faint green)
      ctx.strokeStyle = L.rgba(ACCENT, 0.35 * out); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(hx, hy); ctx.stroke();
      if (p < 1) {
        // trail: 240 px of fading light behind the head
        const len = Math.hypot(px - bx, py - by), tl = Math.min(240, p * len) / len;
        const tx = L.lerp(bx, px, p - tl), ty = L.lerp(by, py, p - tl);
        for (const [lw, col, al] of [[16, ACCENT, 0.16], [6, ACCENT, 0.5], [2.4, hot, 1]]) {
          const g = ctx.createLinearGradient(tx, ty, hx, hy);
          g.addColorStop(0, L.rgba(col, 0)); g.addColorStop(1, L.rgba(col, al * out));
          ctx.strokeStyle = g; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        }
        L.lightBlob(ctx, hx, hy, 70, ACCENT, 0.55 * out);
        L.lightBlob(ctx, hx, hy, 22, hot, 1 * out);
      }
    }
    // arrival: a ripple + bloom on the phone dot
    const ar = L.prog(t, t1, 1.1);
    if (ar > 0 && ar < 1) {
      const e = L.ease.outCubic(ar);
      L.lightBlob(ctx, px, py, 50 + 90 * e, DOT, 0.7 * (1 - ar) * out);
      for (const [dl, s] of [[0, 1], [0.12, 0.6]]) {
        const a2 = L.clamp((ar - dl) / (1 - dl));
        if (a2 <= 0) continue;
        ctx.strokeStyle = L.rgba(ACCENT, 0.8 * (1 - a2) * s * out); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(px, py, Math.max(0, 10 + 80 * L.ease.outCubic(a2)), 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const { t0, t1 } = times(v);
    const p = L.prog(t, t0, RUN);
    const k = v.k * L.enter(t, 0.3, 0.5);
    drawReadout(ctx, {
      x: 1000, y: 640, align: 'right', size: 112, k,
      text: `${(DELAY * p).toFixed(3)} s`,
      label: `travel time · slowed ${SLOW}×`, label2: '20,000 km · 12,500 mi',
      swap: L.ease.inOutCubic(L.prog(t, t1 + 0.05, 0.35)),
      lock: t - t1,
    });
  },
};
