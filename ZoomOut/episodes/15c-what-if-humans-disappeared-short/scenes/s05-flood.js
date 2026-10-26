// Beat 5 — "Without them, | the tunnels would flood in about two days."
// The last pumps die on "Without them". Then water (deep blue-teal with a moving sheen and a bright foam head)
// pushes in from the low tip and the river tubes and fills the network line by line, driven by the same clock
// that counts 1 DAY to 2 DAYS, so the last line fills as the clock locks on 2 DAYS (~+3.2 s, "two days").
// A pulse runs through the whole flooded network on the lock. Label: 2 DAYS / to flood the subway.
// Persists: the flooded lines stay blue-dark under the forest in beat 6 and fade out early in beat 7.
import * as L from '../../../../engine/runtime/lib.js';
import { B, LINES, linePath, pointAt, WATER, FOAM, xrayK, PUMPS, labelScrim } from './s04-pumps.js';
import { adapt } from '../legacy.js';

// 15c: beat 5 runs from "pumps" to the end of the merged line (legacy.js). The lock is on "two days" and the label
// arrives on "flood" (legacy marks, word-relative); the constants are the fallbacks and the cue times (they match the
// current voice to ~0.05 s: lock ≈ 2.84, label ≈ 1.85)
const T_FLOOD0 = 0.55;
const T_LOCK0 = 2.84, T_LABEL0 = 1.85;
const tLock = (v) => v.tl.marks?.lock5 ?? T_LOCK0;
const tLabel = (v) => v.tl.marks?.label5 ?? T_LABEL0;
const tFlood = (v) => [T_FLOOD0, tLock(v) - T_FLOOD0];   // the flood clock ends with the HUD clock lock

/** Flood fraction 0..1 of the whole network at global time. */
export function floodClock(v) {
  const F = tFlood(v);
  return L.ease.inOutCubic(L.prog(v.gt - B(v, 5), F[0], F[1]));
}
const lineFill = (ln, c) => L.ease.inOutCubic(L.clamp((c - ln.fl[0]) / (ln.fl[1] - ln.fl[0])));

export const SCENE = {
  beat: 5,
  chapter: { num: '05', title: 'Flooded', sub: 'The subway fills' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      // the last pumps die on "Without them" (s04 draws them; their stop times are beat-5 relative)
      ...PUMPS.map((p) => ({ t: p.stop5, name: 'tick', gain: 0.22, pitch: 1.1 - p.i * 0.06 })),
      { t: 0.35, name: 'deep', gain: 0.32, pitch: 0.7 },
      { t: T_FLOOD0, name: 'bubbles', gain: 0.32, pitch: 0.8 },
      { t: T_FLOOD0 + 0.15, name: 'riser', gain: 0.2, pitch: 0.9 },
      { t: 1.5, name: 'bubbles', gain: 0.24, pitch: 1.0 },
      { t: T_LABEL0, name: 'swish', gain: 0.22, pitch: 1.0 },
      { t: T_LOCK0 - 0.02, name: 'impact', gain: 0.42, pitch: 0.8 },
      { t: T_LOCK0, name: 'splash', gain: 0.28, pitch: 0.8 },
    ];
  },

  drawWorld(ctx, v) {
    const t5 = v.gt - B(v, 5), T_FLOOD = tFlood(v), T_LOCK = tLock(v);
    if (t5 < T_FLOOD[0] - 0.05) return;
    const m = v.cam.mpp;
    if (m > 40) return;
    const t6 = v.gt - B(v, 6), t7 = v.gt - B(v, 7);
    // after beat 5 the flooded network dims under the forest, then leaves early in beat 7
    const keep = L.lerp(1, 0.22, L.ease.inOutCubic(L.prog(t6, 0.1, 1.1))) * (1 - L.ease.inCubic(L.prog(t7, 0.0, 1.1)));
    if (keep <= 0.003) return;
    const c = floodClock(v);
    const lock = t5 > T_LOCK ? Math.exp(-(t5 - T_LOCK) / 0.45) : 0;
    const lw = L.clamp(8.5 / m, 0.6, 1.6);
    const fresh = xrayK(v) > 0.5 ? 1 : 0.6;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [i, ln] of LINES.entries()) {
      const f = lineFill(ln, c);
      if (f <= 0) continue;
      const s1 = f * ln.len;
      linePath(ctx, v, ln, 0, s1);
      // glow, body, then a moving sheen (flows away from the source)
      ctx.strokeStyle = L.rgba(WATER, (0.16 + 0.25 * lock) * keep);
      ctx.lineWidth = 13 * lw;
      ctx.stroke();
      ctx.strokeStyle = L.rgba(L.mix([18, 86, 122], [60, 170, 205], lock), 0.95 * keep);
      ctx.lineWidth = 5 * lw;
      ctx.stroke();
      ctx.strokeStyle = L.rgba(FOAM, (0.55 + 0.4 * lock) * keep * fresh);
      ctx.lineWidth = 1.5 * lw;
      ctx.setLineDash([5 * lw, 16 * lw]);
      ctx.lineDashOffset = -v.gt * 34 - i * 7;
      ctx.stroke();
      ctx.setLineDash([]);
      // stations go under: each gets a small ring as the water reaches it
      for (const [x, y, s] of ln.stations) {
        if (s > s1) break;
        const X = v.wx(x), Y = v.wy(y);
        if (X < -20 || X > L.W + 20 || Y < -20 || Y > L.H + 20) continue;
        ctx.fillStyle = L.rgba([40, 150, 190], 0.95 * keep);
        ctx.beginPath(); ctx.arc(X, Y, 3.8 * lw, 0, Math.PI * 2); ctx.fill();
        // arrival time of the front at this station (invert the line fill by sampling)
        const u = s / ln.len;
        const ca = ln.fl[0] + (ln.fl[1] - ln.fl[0]) * invEase(u);
        const ta = T_FLOOD[0] + T_FLOOD[1] * invEase(ca);
        const r = L.prog(t5, ta, 0.7);
        if (r > 0 && r < 1) {
          ctx.strokeStyle = L.rgba(FOAM, 0.7 * (1 - r) * keep);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(X, Y, Math.max(0, 4 + 16 * L.ease.outCubic(r)), 0, Math.PI * 2); ctx.stroke();
        }
      }
      // the foam head while the line is still filling
      if (f < 1) {
        const [hx, hy] = pointAt(ln, s1);
        const X = v.wx(hx), Y = v.wy(hy);
        L.lightBlob(ctx, X, Y, 26 * lw, [120, 215, 255], 0.55 * keep);
        ctx.fillStyle = L.rgba([235, 250, 255], 0.95 * keep);
        ctx.beginPath(); ctx.arc(X, Y, 2.8 * lw, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const T_LOCK = tLock(v);
    const k = L.enter(v.t, tLabel(v), 0.5) * v.k * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.4, 0.35)));   // out by the beat end
    if (k <= 0) return;
    labelScrim(ctx, 300, 570, k);
    // v15fx: the flooded lines run bright cyan right behind "DAYS" / the sub-line: a wider, deeper soft backing (no
    // edge) under the whole label block, so the type never sits on a full-strength line
    {
      ctx.save();
      ctx.translate(330, 585); ctx.scale(1, 0.46);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 470);
      g.addColorStop(0, `rgba(3,8,20,${0.72 * k})`); g.addColorStop(0.55, `rgba(3,8,20,${0.6 * k})`);
      g.addColorStop(0.8, `rgba(3,8,20,${0.3 * k})`); g.addColorStop(1, 'rgba(3,8,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 470, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    L.bigLabel(ctx, { x: 64, y: 560, big: '2 DAYS', small: 'to flood the subway', k, accent: v.accent, size: 150 });
    // a thin fill gauge under the label tracks the flood (locks full with the clock)
    const c = floodClock(v);
    const lock = v.t > T_LOCK ? Math.exp(-(v.t - T_LOCK) / 0.5) : 0;
    ctx.save();
    ctx.globalAlpha = k;
    const x = 64, y = 668, w = 300;
    ctx.fillStyle = 'rgba(205,215,230,0.18)';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = L.rgba(L.mix([60, 170, 210], [170, 236, 255], lock), 0.95);
    ctx.fillRect(x, y, w * c, 4);
    if (lock > 0.01) L.lightBlob(ctx, x + w, y + 2, 40, [140, 220, 255], 0.6 * lock);
    ctx.restore();
  },
};

/** Inverse of inOutCubic (for station arrival times). */
function invEase(y) {
  y = L.clamp(y);
  return y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2;
}
// 15c: played inside a merged 15c beat (see s02-grid.js / s04-subway.js); this default is not in the scene list
export default adapt(SCENE, 5);
