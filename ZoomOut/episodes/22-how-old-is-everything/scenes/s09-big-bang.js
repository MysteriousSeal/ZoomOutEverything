// Beat 9 — The universe began 13.8 billion years ago. The ruler's end cap arrives at the left; nothing exists
// before it (a soft veil darkens everything left of the cap). On "began" a white point ignites on the cap and
// blooms: a hot core, an anamorphic streak along the ruler, one thin shock ring, then a pulse of light runs
// the whole ruler from the Big Bang to NOW — all of time, lit once. A calm afterglow holds on the cap.
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, timelineK, ACCENT } from '../env.js';
import { label } from './s05-dinosaurs.js';

const IGNITE = 1.55, RUN0 = 1.95, RUN1 = 3.55, LBL = 1.8;   // beat-local seconds
const WHITE = [255, 252, 246], GOLD = [255, 214, 160];

export default {
  beat: 9,
  chapter: { num: '09', title: 'The Big Bang', sub: 'where the ruler begins' },
  layer: 9,
  cues(d) {
    return [
      { t: IGNITE - 0.7, name: 'riser', gain: 0.2, pitch: 1.0 },
      { t: IGNITE, name: 'bloom', gain: 0.5, pitch: 0.9 },
      { t: IGNITE + 0.02, name: 'impact', gain: 0.3, pitch: 0.55 },
      { t: RUN0, name: 'shimmer', gain: 0.24, pitch: 1.2 },
      { t: RUN1, name: 'blip', gain: 0.16, pitch: 1.3 },
    ];
  },
  drawWorld(ctx, v) {
    const lk = timelineK(v);
    if (lk <= 0 || v.t < 0.2) return;
    const ry = rulerY(v), cx = tx(v, AGE.universe), nowX = v.wx(0);
    if (cx < -400 || cx > L.W) return;
    const dt = v.t - IGNITE;
    ctx.save();
    ctx.globalAlpha = lk;
    // before the beginning: a veil over everything left of the cap
    if (cx > 0) {
      const g = ctx.createLinearGradient(cx - 90, 0, cx - 4, 0);
      g.addColorStop(0, 'rgba(2,4,9,0.72)'); g.addColorStop(1, 'rgba(2,4,9,0)');
      ctx.fillStyle = 'rgba(2,4,9,0.72)';
      ctx.fillRect(0, 300, Math.max(0, cx - 90), 1280);
      ctx.fillStyle = g;
      ctx.fillRect(cx - 90, 300, 86, 1280);
    }
    if (dt > -0.5) {
      // pre-ignition: a faint flicker gathers on the cap
      const pre = L.ease.inCubic(L.prog(dt, -0.5, 0.5)) * (dt < 0 ? 1 : 0);
      if (pre > 0) L.lightBlob(ctx, cx, ry, 30 + 30 * pre, GOLD, 0.5 * pre);
    }
    if (dt >= 0) {
      const f = Math.exp(-dt * 2.4);                     // the flash decays
      const after = 0.28 + 0.06 * Math.sin(v.gt * 2.2);  // the afterglow that remains
      const grow = L.ease.outExpo(L.clamp(dt / 0.6));
      // bloom: three nested lights (gold halo, white core)
      L.lightBlob(ctx, cx, ry, 90 + 620 * grow, GOLD, 0.55 * f + 0.05);
      L.lightBlob(ctx, cx, ry, 50 + 160 * grow, WHITE, 0.95 * f + after * 0.6);
      L.lightBlob(ctx, cx, ry, 18 + 22 * f, WHITE, 1);
      ctx.globalCompositeOperation = 'lighter';
      // anamorphic streak: wide and thin, along the ruler (and a fainter vertical one)
      const hw = 160 + 760 * grow;
      const hs = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
      hs.addColorStop(0, 'rgba(255,214,160,0)'); hs.addColorStop(0.5, `rgba(255,250,240,${0.9 * f + 0.25})`); hs.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = hs;
      ctx.fillRect(cx - hw, ry - 2, hw * 2, 4);
      const vh = 60 + 260 * grow;
      const vs = ctx.createLinearGradient(0, ry - vh, 0, ry + vh);
      vs.addColorStop(0, 'rgba(255,214,160,0)'); vs.addColorStop(0.5, `rgba(255,250,240,${0.55 * f})`); vs.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = vs;
      ctx.fillRect(cx - 1.5, ry - vh, 3, vh * 2);
      // one thin shock ring, then a fainter echo
      ctx.globalCompositeOperation = 'source-over';
      for (const [d0, a0] of [[0, 0.7], [0.22, 0.3]]) {
        const p = L.clamp((dt - d0) / 1.3);
        if (p <= 0 || p >= 1) continue;
        ctx.strokeStyle = L.rgba(GOLD, a0 * (1 - p) * (1 - p));
        ctx.lineWidth = 2.5 * (1 - p) + 0.8;
        ctx.beginPath(); ctx.arc(cx, ry, Math.max(0, 14 + 330 * L.ease.outCubic(p)), 0, Math.PI * 2); ctx.stroke();
      }
      // the light runs the whole ruler: Big Bang → NOW
      const rp = L.prog(v.t, RUN0, RUN1 - RUN0);
      if (rp > 0 && rp < 1.15) {
        const e = L.ease.inOutCubic(L.clamp(rp));
        const hx = L.lerp(cx, nowX, e);
        const fade = 1 - L.clamp((rp - 1) / 0.15);
        ctx.globalCompositeOperation = 'lighter';
        const tlen = 260;
        const tg = ctx.createLinearGradient(hx - tlen, 0, hx, 0);
        tg.addColorStop(0, 'rgba(255,240,220,0)'); tg.addColorStop(1, `rgba(255,248,236,${0.9 * fade})`);
        ctx.fillStyle = tg;
        ctx.fillRect(Math.max(cx, hx - tlen), ry - 2, Math.min(tlen, hx - cx), 4);
        L.lightBlob(ctx, hx, ry, 46, WHITE, 0.8 * fade);
        // a lit wake: the ruler stays faintly warmer where the light has passed
        ctx.fillStyle = `rgba(255,220,180,${0.16 * fade})`;
        ctx.fillRect(cx, ry - 1.5, Math.max(0, hx - cx), 3);
      }
      if (rp >= 1) {
        const arr = Math.exp(-(v.t - RUN1) * 2.5);        // it reaches NOW: a soft accent answer
        L.lightBlob(ctx, nowX, ry, 70 + 50 * (1 - arr), ACCENT, 0.5 * arr);
      }
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    label(ctx, v, '13.8 BILLION', 'years ago · the universe begins', v.k * L.ease.outCubic(L.prog(v.t, LBL, 0.5)));
  },
};
