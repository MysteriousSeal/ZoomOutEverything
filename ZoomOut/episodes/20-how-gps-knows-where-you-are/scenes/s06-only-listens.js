// Beat 6 — "Your phone never transmits back. | It only listens."
// The pull-back from satellite B to the planet: the broadcast keeps falling (s05's rings), now a beam that washes
// over the whole visible Earth. The phone appears as the blue dot on the limb, answering each ring with a soft
// receive ripple. A dashed "send" arrow tries to rise from it toward B, is struck through on "only listens", and
// fades: receive only.
//
// Also draws the phone's blue dot on the limb (planet scale) through beats 6-7; s07 lands its pulse on it.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, DOT, SAT_B, beatStart, phrase } from '../env.js';
import { RING, ringsAt } from './s05-broadcast.js';
import { wordT } from './s04-atomic-clocks.js';

const WARN = [255, 128, 104];

/** Planet-scale presence of the phone dot (0..1): only while the camera is far out, in beats 6-8. */
export function phoneDotK(v) {
  const sc = L.clamp(L.invLerp(Math.log(400), Math.log(4000), Math.log(v.cam.mpp)));
  const win = L.prog(v.gt, beatStart(v.tl, 6) + 0.6, 0.6) * (1 - L.prog(v.gt, beatStart(v.tl, 9), 0.2));
  return sc * win;
}
/** The blue dot on the limb (screen px). */
export function drawPhoneDot(ctx, v, k, boost = 0) {
  if (k <= 0.002) return;
  const x = v.wx(0), y = v.wy(0);
  const br = 1 + 0.06 * Math.sin(v.gt * 3.1);
  L.lightBlob(ctx, x, y, (48 + 40 * boost) * br, DOT, (0.75 + 0.4 * boost) * k);
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y, 10.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = L.rgba(L.mix(DOT, [255, 255, 255], 0.15 * boost));
  ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Receive only', sub: 'the phone just listens' },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: 0.05, name: 'whoosh', gain: 0.3, pitch: 0.8 },
      { t: 1.1, name: 'swish', gain: 0.2, pitch: 1.6 },          // the send arrow rises on "transmits"
      { t: 2.0, name: 'impact', gain: 0.22, pitch: 1.5 },        // struck at the end of "…never transmits back"
      // blips on the ring fronts reaching the phone (measured from ringsAt + camera with the current timeline:
      // beat-6-local 1.97, 2.40 (under the impact), 3.04, 3.70; the next lands at beat-7 0.29, s07's tick)
      { t: 1.97, name: 'blip', gain: 0.07, pitch: 1.2 },
      { t: 3.04, name: 'blip', gain: 0.12, pitch: 1.2 },
      { t: 3.70, name: 'blip', gain: 0.1, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const k = phoneDotK(v);
    if (k <= 0) return;
    const x = v.wx(0), y = v.wy(0);
    // receive ripples: every ring front that reaches the phone (beats 6 → start of 7)
    const st = ringsAt(v);
    const d = Math.hypot(x - st.src.x, y - st.src.y);
    let boost = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of st.rings) {
      const age = (r.r - d) / RING.speed;                   // seconds since that front arrived
      if (age < 0 || age > 0.9) continue;
      const e = L.ease.outCubic(age / 0.9);
      ctx.strokeStyle = L.rgba(DOT, 0.75 * (1 - e) * k * st.g);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, 10 + 46 * e), 0, Math.PI * 2); ctx.stroke();
      boost = Math.max(boost, Math.exp(-age * 6) * st.g);
    }
    ctx.restore();
    drawPhoneDot(ctx, v, k, boost);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const x = v.wx(0), y = v.wy(0);
    const sx = v.wx(SAT_B.x), sy = v.wy(SAT_B.y);
    const tOnly = wordT(v.tl, 6, 1, 1);                 // "only"
    // the "send" arrow: rises from the phone toward B, struck through, then fades back
    const tStrike = phrase(v.tl, 6, 0, 'end') - beatStart(v.tl, 6) - 0.2;   // lands as "…never transmits back" ends
    const ak = L.ease.outCubic(L.prog(t, 1.1, 0.5));
    const strike = L.ease.outCubic(L.prog(t, tStrike, 0.3));
    const afade = 1 - 0.65 * L.ease.inOutCubic(L.prog(t, tOnly + 0.6, 0.6));
    if (ak > 0) {
      const ang = Math.atan2(sy - y, sx - x);
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const L0 = 26, L1 = 26 + 200 * ak;
      const ax0 = x + ux * L0, ay0 = y + uy * L0, ax1 = x + ux * L1, ay1 = y + uy * L1;
      ctx.save();
      ctx.globalAlpha = v.k * afade;
      ctx.strokeStyle = 'rgba(225,232,245,0.85)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([10, 9]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.lineTo(ax1 - ux * 10, ay1 - uy * 10); ctx.stroke();
      ctx.setLineDash([]);
      // drawn arrowhead
      ctx.fillStyle = 'rgba(225,232,245,0.9)';
      ctx.beginPath();
      ctx.moveTo(ax1 + ux * 6, ay1 + uy * 6);
      ctx.lineTo(ax1 - ux * 18 - uy * 13, ay1 - uy * 18 + ux * 13);
      ctx.lineTo(ax1 - ux * 18 + uy * 13, ay1 - uy * 18 - ux * 13);
      ctx.closePath(); ctx.fill();
      // the strike: a warm slash across the arrow's middle, with a small bloom when it lands
      if (strike > 0) {
        const mx = (ax0 + ax1) / 2, my = (ay0 + ay1) / 2;
        const px = -uy, py = ux;
        const half = 62;
        const sa = { x: mx - px * half - ux * 26, y: my - py * half - uy * 26 };
        const sb = { x: mx + px * half + ux * 26, y: my + py * half + uy * 26 };
        ctx.globalAlpha = v.k;
        L.lightBlob(ctx, mx, my, 70, WARN, 0.35 * Math.exp(-L.prog(t, tStrike + 0.3, 1) * 4) * strike);
        ctx.strokeStyle = L.rgba(WARN, 0.95);
        ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(L.lerp(sa.x, sb.x, strike), L.lerp(sa.y, sb.y, strike)); ctx.stroke();
      }
      ctx.restore();
    }
    // label: lands on "only listens", right side, clear of the beam's core
    const lk = v.k * L.enter(t, tOnly - 0.2, 0.55);
    L.bigLabel(ctx, { x: 1000, y: 620, big: 'Receive only', small: 'your phone never transmits', k: lk, accent: ACCENT, align: 'right', size: 96 });
  },
};
