// Beat 11 — "Everything in between is empty space."
// The stadium steps back into a ghost of itself and the haze thins; a slow ring of light travels out from the
// nucleus to the stands, sweeping across nothing at all. What is left: one bright point and a faint cloud far
// away. Label: "99.9999…%" / "empty space".
import * as L from '../../../../engine/runtime/lib.js';
import { stadiumState, frame, ringPt, drawNucleus, LABEL } from './s09-stadium.js';

const { ease, clamp, prog, lerp, rgba } = L;

/** The sweep front at q ∈ [0, 1.4]: a near-circle leaving the nucleus that conforms to the pitch-side ring at
 *  q = 1, then carries on out across the lower tier (q - 1 = ring s), into the stands where the haze is. */
function sweepPath(ctx, F, q, m) {
  const SEG = 120, w = ease.inOutCubic(clamp((q - 0.35) / 0.75));
  ctx.beginPath();
  for (let i = 0; i <= SEG; i++) {
    const th = (i / SEG) * Math.PI * 2;
    let x, y;
    if (q <= 1) {
      const [sx, sy] = ringPt(0, th, m);
      const rc = q * 0.5;
      x = lerp(Math.cos(th) * rc, sx * q, w); y = lerp(Math.sin(th) * rc, sy * q, w);
    } else [x, y] = ringPt(Math.min(q - 1, 1), th, m);
    const px = F.cx + x * F.U, py = F.cy + y * F.U;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export default {
  beat: 11,
  chapter: { num: '11', title: 'Empty space', sub: "The nucleus: ~1/100,000 of the atom's width" },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: 0.12, name: 'deep', gain: 0.4, pitch: 0.7 },       // the stadium steps back
      { t: 0.3, name: 'sonar', gain: 0.22, pitch: 0.9 },      // the ring sweeps out across nothing
      { t: 0.75, name: 'tick', gain: 0.28, pitch: 0.9 },      // 99.9999…%
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    const st = stadiumState(v.gt, v.tl);
    if (!st.on || st.empty <= 0.003) return;
    const F = frame(v);
    // a dark well over the space between nucleus and stands
    ctx.save();
    const g = ctx.createRadialGradient(F.cx, F.cy, 0, F.cx, F.cy, 0.7 * F.U);
    g.addColorStop(0, `rgba(2,5,7,${0.55 * st.empty})`);
    g.addColorStop(0.75, `rgba(2,5,7,${0.4 * st.empty})`);
    g.addColorStop(1, 'rgba(2,5,7,0)');
    ctx.fillStyle = g;
    ctx.fillRect(F.cx - F.U, F.cy - F.U, 2 * F.U, 2 * F.U);
    // the sweep: a soft wave of light expanding from the nucleus, across the empty pitch, into the stands, twice
    ctx.lineJoin = 'round';
    for (const [o, g] of [[0.3, 1], [1.0, 0.6]]) {
      const q = prog(v.t, o, 1.75);
      if (q <= 0 || q >= 1) continue;
      const s = 1.4 * ease.outCubic(q);
      const fade = Math.sin(Math.PI * Math.pow(q, 0.7)) * g * st.alpha * (1 - st.fold);
      if (fade <= 0.01) continue;
      sweepPath(ctx, F, s, st.m);
      ctx.strokeStyle = rgba(v.accent, 0.08 * fade);
      ctx.lineWidth = 22; ctx.stroke();
      ctx.strokeStyle = rgba(v.accent, 0.14 * fade);
      ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = rgba(v.accent, 0.5 * fade);
      ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    // the one bright point, on top of the well, a touch brighter as everything else dims
    drawNucleus(ctx, F, st, v.gt, 0.9 * st.empty);
  },
  drawOverlay(ctx, v) {
    const st = stadiumState(v.gt, v.tl);
    // leave just before the stadium folds back into the atom
    // (a real 0.3 s fade, finished as the fold starts, not a 1-frame cut)
    const out = 1 - ease.inOutCubic(prog(v.gt, st.b12 - 0.55, 0.3));
    const k = prog(v.t, 0.7, 0.5);
    if (k <= 0 || out <= 0) return;
    ctx.save();
    ctx.globalAlpha *= out;
    L.bigLabel(ctx, { ...LABEL, big: '99.9999…%', small: 'empty space', k, accent: v.accent, size: 120 });
    ctx.restore();
  },
};
