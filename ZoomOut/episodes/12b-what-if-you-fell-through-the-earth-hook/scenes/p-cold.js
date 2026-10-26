// Preroll (12b) — cold-open hook: "Jump into a hole through the Earth, | and you'd reach the other side in 42 minutes."
// The engine replays the film's whole-planet moment (episode.json preroll.from: beats 9-10, the faller going through
// the cut-away Earth from one side to the other, real coastlines on the left half, the layers on the right) at 0.54x (from just after s08's magnifier inset has gone),
// so the white-hot faller visibly travels the whole tunnel during the hook line. Scene overlays are off
// (preroll.overlays = false). This layer adds the two-line headline, fully on screen from frame 1, in the clear band of
// space BELOW the globe (globe ≈ y 300-1180; nothing else there during the preroll), on plain dark space: no backing.
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 1300;    // first baseline: the block spans y ≈ 1220-1390 (globe bottom ≈ 1180; bottom 18% starts at 1580)

/** centred line at size `s`, parts = [[text, colour], ...] */
function line(ctx, parts, y, s, tracking = 0) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  ctx.letterSpacing = `${tracking}px`;
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
  ctx.letterSpacing = '0px';
}

const L1 = 'JUMP IN ONE SIDE', L2A = 'REACH THE OTHER SIDE IN ', L2B = '42 MINUTES';

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: 0.6, name: 'whoosh', gain: 0.3, pitch: 0.8 },
      { t: 4.2, name: 'ping', gain: 0.26, pitch: 1.3 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // two tiers, each fitted to MAXW: the action big, the payoff line smaller
    const s2 = L.fitSize(ctx, L2A + L2B, MAXW, 70, 800, L.FONT.display, 40);
    const s1 = Math.min(L.fitSize(ctx, L1, MAXW, 120, 800, L.FONT.display, 40), Math.round(s2 * 1.75));
    const y2 = Y1 + Math.round(s2 * 1.35);
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    line(ctx, [[L1, 'rgb(246,242,236)']], Y1, s1);
    line(ctx, [[L2A, 'rgb(232,228,222)'], [L2B, L.rgba(v.accent)]], y2, s2);
    ctx.restore();
  },
};
