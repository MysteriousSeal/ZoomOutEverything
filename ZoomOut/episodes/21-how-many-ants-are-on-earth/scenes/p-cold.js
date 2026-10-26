// Preroll (ep 21) — cold-open hook: "Line up every ant on Earth, and the line reaches far past Pluto."
// Headline fitted ≤ 940 px, on from frame 1 (baselines 250/368, clear of the line tip at y ≈ 550 and the orbit labels). The engine replays beat 10 (episode.json preroll.from):
// the line of ants shooting up past Neptune's and Pluto's orbits. Builder: refine (see ../BRIEF.md).
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 940;
function line(ctx, parts, y, size) {
  const text = parts.map((p) => p[0]).join('');
  const s = L.fitSize(ctx, text, MAXW, size, 800, L.FONT.display, 40);
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: 2.26, name: 'ping', gain: 0.3, pitch: 1.4 },     // the line's head crosses Pluto's orbit (film 56.97)
      { t: 2.28, name: 'shimmer', gain: 0.2, pitch: 1.2 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    line(ctx, [['EVERY ANT ON EARTH,', 'rgb(240,236,226)']], 250, 104);
    line(ctx, [['IN ONE LINE: ', 'rgb(240,236,226)'], ['PAST PLUTO', L.rgba(v.accent)]], 368, 104);
    ctx.restore();
  },
};
