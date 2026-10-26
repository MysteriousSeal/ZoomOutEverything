// Preroll (06b) — cold-open hook: "Space is only an hour's drive away. Straight up."
// The engine replays the film's drive-straight-up moment (episode.json preroll.from): the car reaches the Kármán line
// as the trip clock hits 1:00. This layer adds the headline, fully on screen from frame 1, in the dark sky above the
// line (which sits at y ≈ 485), so nothing overlaps.
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins

/** centred line, fitted to MAXW, parts = [[text, colour], ...] */
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
      { t: 1.15, name: 'ping', gain: 0.3, pitch: 1.4 },
      { t: 1.2, name: 'bloom', gain: 0.25, pitch: 1.0 },
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
    // headline in the dark sky (the HUD is off during the preroll); baseline 2 at 380, ≥ 100 px above the line
    line(ctx, [['SPACE IS A ', 'rgb(236,238,250)'], ['1-HOUR DRIVE', L.rgba(v.accent)]], 262, 108);
    line(ctx, [['STRAIGHT UP', 'rgb(236,238,250)']], 380, 108);
    ctx.restore();
  },
};
