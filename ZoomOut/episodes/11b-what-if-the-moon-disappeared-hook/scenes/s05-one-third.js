// Beat 5 — "With only the Sun left, | tides would shrink to about a third of today's biggest."
// "With only the Sun left": the ghost Moon dissolves (its ring widens and fades, the pull chevrons stop) and the
// Sun arrow warms up. "Tides would shrink": the bulge relaxes, with a soft overshoot and the surface flow running
// back from the tips, to the Sun-only bulge (≈ 0.32 of today's), leaving a dashed outline of today's bulge for
// comparison. Label "≈ 1/3" · "of today's spring tides" lands on "third". The bulge fades early in beat 6.
import * as L from '../../../../engine/runtime/lib.js';
import { globePx } from '../env.js';
import {
  E0, E_SUN, wordAt, globeOk, tag, drawBulge, drawGhostMoon, drawPull, drawSunArrow, ghostMoonPos, exaggeratedTag, bulgeTip, moonTag,
} from './s04-tides.js';

export function thirdTimes(v) {
  const tl = v.tl, s = tl.scenes[5].start;
  return {
    sun: wordAt(tl, 5, /^Sun/) - s,              // ghost Moon dissolves, Sun arrow brightens
    shrink: wordAt(tl, 5, /^shrink/) - s - 0.2,  // bulge relaxes
    label: wordAt(tl, 5, /^third/) - s - 0.05,   // "≈ 1/3"
  };
}
/** Bulge elongation in beat 5 (t = seconds into beat 5): today's → the Sun's third, settling with a small wobble. */
export function bulgeE5(v, t) {
  const T = thirdTimes(v);
  const p = L.prog(t, T.shrink, 1.3);
  const dt = Math.max(0, t - T.shrink - 1.3);           // a damped slosh after it lands
  const settle = 0.014 * Math.exp(-dt / 0.45) * Math.sin(dt * 7.5);
  return L.lerp(E0, E_SUN, L.ease.inOutCubic(p)) - settle;
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'A third', sub: 'only the Sun’s pull is left' },
  captions: true,
  layer: 2,
  cues(d) {
    // "Sun" ≈ 0.9 s, "shrink" ≈ 2.7 s, "third" ≈ 3.7 s
    return [
      { t: 0.75, name: 'swish', gain: 0.22, pitch: 0.7 },
      { t: 1.0, name: 'shimmer', gain: 0.14, pitch: 1.3 },
      { t: 2.5, name: 'swell', gain: 0.22, pitch: 0.55 },
      { t: 2.75, name: 'bubbles', gain: 0.12, pitch: 0.8 },
      { t: 3.65, name: 'ping', gain: 0.3, pitch: 0.95 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < 0 || t > v.d + 0.6) return;
    const T = thirdTimes(v);
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.05, 0.3));    // gone before s06's ghost Moon reads
    const e = bulgeE5(v, t);
    const dis = L.ease.inOutCubic(L.prog(t, T.sun - 0.15, 1.1));
    drawGhostMoon(ctx, v, out, { dissolve: dis });
    // a last breath of moonlight scattering from the dissolving ghost
    if (dis > 0 && dis < 1) {
      const m = ghostMoonPos(v), rnd = L.rng(55);
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2, sp = 0.6 + rnd() * 1.4, d = m.r * (0.4 + dis * sp * 1.6);
        ctx.fillStyle = `rgba(220,230,255,${0.7 * Math.sin(Math.PI * dis) * (0.4 + 0.6 * rnd())})`;
        const s = 1.2 + rnd() * 1.8;
        ctx.fillRect(m.x + Math.cos(a) * d - s / 2, m.y + Math.sin(a) * d - s / 2, s, s);
      }
    }
    const shrinkP = L.prog(t, T.shrink, 1.3);
    drawBulge(ctx, v, {
      e, k: out,
      flow: -Math.sin(Math.PI * shrinkP) * 0.9,
      ref: E0, refK: out * L.ease.outCubic(L.prog(t, T.shrink + 0.1, 0.6)) * 0.85,
    });
    drawPull(ctx, v, e, 1 - L.prog(t, T.sun - 0.3, 0.6));
    const pulse = Math.exp(-(((t - T.sun - 0.45) / 0.5) ** 2));
    drawSunArrow(ctx, v, out, L.ease.outCubic(L.prog(t, T.sun, 0.8)) * 0.6 + 0.4 * pulse);
  },
  drawOverlay(ctx, v) {
    const T = thirdTimes(v), t = v.t;
    const g = globePx(v);
    if (globeOk(g)) {
      const m = ghostMoonPos(v);
      moonTag(ctx, m, v.k * (1 - L.prog(t, T.sun - 0.2, 0.5)));
      exaggeratedTag(ctx, v, bulgeE5(v, t), v.k);
      // "TODAY" on the dashed outline's Moon-side tip, once the bulge has pulled away from it
      const tip = bulgeTip(v, E0, 1);
      tag(ctx, tip.x + 52, tip.y + 34, 'TODAY', v.k * L.ease.outCubic(L.prog(t, T.shrink + 0.9, 0.5)), { size: 17, bg: 0.5, color: [200, 212, 235] });
    }
    L.bigLabel(ctx, { x: 920, y: 1212, big: '≈ 1/3', small: 'of today’s spring tides', k: L.enter(t, T.label, 0.55) * v.k, accent: v.accent, align: 'right', size: 100 });
  },
};
