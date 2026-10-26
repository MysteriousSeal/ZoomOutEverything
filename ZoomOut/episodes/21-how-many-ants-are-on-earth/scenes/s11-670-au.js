// Beat 11 (ep 21) — "It would stretch about six hundred and seventy times the distance from Earth to the Sun."
// The camera pulls out until the whole 668 AU line fits (Earth at y ≈ 1300, the tip at y ≈ 400); the Sun is a dot
// (env). s10 still draws the line itself; this scene only labels it, as a quiet ruler on the right of the line:
//   · PLUTO 38 AU tick (where the line crossed Pluto's orbit) — continuity from beat 10's orbit label
//   · VOYAGER 1 170 AU tick (the farthest spacecraft) — appears as the head passes it
//   · the END MARKER at the tip: a cap + flash when the line completes, and the reveal "≈ 670 ×" / "EARTH–SUN DISTANCE"
//     (left of the line, clear of the HUD readout at x > 600, y 250–345).
import * as L from '../../../../engine/runtime/lib.js';
import { tip, lineK, CROSS, LINE_LEN } from '../env.js';
import { crossTimes } from './s10-past-pluto.js';

const { ease, clamp, prog } = L;

/** a tick on the right of the line at altitude alt: short bar across the line + "NAME  dist" */
function tick(ctx, v, alt, name, dist, k, flashT) {
  if (k <= 0) return;
  const x = v.wx(0), y = v.wy(-alt);
  const e = ease.outCubic(clamp(k));
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.5);
  ctx.strokeStyle = 'rgba(240,232,215,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10 + 18 * e, y); ctx.stroke();
  if (flashT > 0 && flashT < 1) {
    ctx.strokeStyle = L.rgba([255, 225, 170], 0.8 * (1 - flashT));
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 6 + 34 * ease.outCubic(flashT)), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  const tx = x + 40 + (1 - e) * 14;
  ctx.font = L.font(30, 700, L.FONT.display);
  ctx.fillStyle = 'rgb(240,236,226)';
  const wName = L.trackedText(ctx, name, tx, y + 1, 2.5);
  ctx.font = L.font(24, 600, L.FONT.body);
  ctx.fillStyle = 'rgba(190,198,212,0.95)';
  L.trackedText(ctx, dist, tx + wName + 16, y + 1, 1.5);
  ctx.restore();
}

export default {
  beat: 11,
  chapter: { num: '09', title: '668 AU', sub: '≈ 100 billion km of ants' },
  layer: 11,
  cues(d) {
    // relative to the beat start (57.885): Voyager passed ≈ 59.14, the line completes ≈ 60.3
    return [
      { t: 0.25, name: 'swell', gain: 0.3, pitch: 1.0 },
      { t: 1.26, name: 'tick', gain: 0.3, pitch: 1.3 },
      { t: 2.42, name: 'impact', gain: 0.42, pitch: 0.9 },
      { t: 2.45, name: 'bloom', gain: 0.3, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    // the end cap: a short bar across the tip once the line is complete (persists until the line dissolves)
    const ct = crossTimes(v.tl);
    const ck = L.enter(v.gt, ct.end - 0.05, 0.45) * lineK(v);
    if (ck <= 0 || tip(v) < 0.99 * LINE_LEN) return;
    const x = v.wx(0), y = v.wy(-tip(v));
    if (y < -50 || y > L.H + 50) return;
    ctx.save();
    ctx.globalAlpha = lineK(v);
    const fl = prog(v.gt, ct.end - 0.05, 1.3);
    if (fl < 1) {
      ctx.strokeStyle = L.rgba([255, 225, 170], 0.85 * (1 - fl));
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, 10 + 110 * ease.outCubic(fl)), 0, Math.PI * 2); ctx.stroke();
      L.lightBlob(ctx, x, y, 160, [255, 200, 120], 0.6 * (1 - fl));
    }
    L.glow(ctx, v.accent, 12, () => {
      ctx.strokeStyle = L.rgba([255, 230, 190], 0.95);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const hw = 22 * ease.outBack(clamp(ck));
      ctx.beginPath(); ctx.moveTo(x - hw, y); ctx.lineTo(x + hw, y); ctx.stroke();
    });
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    const ct = crossTimes(v.tl);
    ctx.save();
    ctx.globalAlpha = v.k;
    // ruler ticks: Pluto once the orbit label has gone (tick sits 50 px above Earth at the full view)
    const plK = L.enter(v.gt, 58.75, 0.5);
    tick(ctx, v, CROSS.pluto, 'PLUTO', '38 AU', plK, -1);
    const vk = L.enter(v.gt, ct.voyager - 0.05, 0.5);
    tick(ctx, v, CROSS.voyager, 'VOYAGER 1', '170 AU', vk, prog(v.gt, ct.voyager - 0.05, 1.0));
    // the reveal at the end marker
    const ek = L.enter(v.gt, ct.end + 0.05, 0.55);
    if (ek > 0) {
      const y = v.wy(-tip(v));
      const xr = v.wx(0) - 42;              // right edge of the label block
      const maxW = xr - 84;
      const e = ease.outCubic(ek);
      ctx.globalAlpha = v.k * clamp(ek * 1.4);
      ctx.textBaseline = 'alphabetic';
      // rule that wipes in toward the line
      ctx.fillStyle = L.rgba(v.accent, 0.9);
      ctx.fillRect(xr - 90 * e, y - 3, 90 * e, 4);
      const big = '≈ 670 ×';
      const bs = L.fitSize(ctx, big, maxW, 128, 800, L.FONT.display, 60);
      ctx.font = L.font(bs, 800, L.FONT.display);
      ctx.fillStyle = L.rgba(v.accent);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 18;
      const bY = y + 24 + bs * 0.74 + (1 - e) * 24;
      L.trackedText(ctx, big, xr, bY, -1, 'right');
      const small = 'EARTH–SUN DISTANCE';
      const ss = L.fitSize(ctx, small, maxW, 34, 600, L.FONT.body, 20);
      ctx.font = L.font(ss, 600, L.FONT.body);
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(232,228,218,0.95)';
      // tracked text needs room for its tracking: refit including it
      let s2 = ss;
      ctx.letterSpacing = '3px';
      while (s2 > 20 && ctx.measureText(small).width > maxW) { s2 -= 1; ctx.font = L.font(s2, 600, L.FONT.body); }
      ctx.letterSpacing = '0px';
      L.trackedText(ctx, small, xr, bY + 22 + s2 * 1.1, 3, 'right');
    }
    ctx.restore();
  },
};
