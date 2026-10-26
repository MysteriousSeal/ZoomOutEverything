// Preroll (08b) — cold-open hook: "The Sun you see right now is eight minutes old."
// The engine replays beat 4 (episode.json preroll.from): the Sun–Earth line in frame, a photon leaving the Sun and
// landing on Earth. This layer adds the headline, fully on screen from frame 1, in the dark band above the Sun–Earth line.
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
      { t: 0.2, name: 'whoosh', gain: 0.28, pitch: 0.8 },
      { t: 1.2, name: 'ping', gain: 0.3, pitch: 1.4 },
      { t: 1.25, name: 'bloom', gain: 0.25, pitch: 1.0 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawOverlay(ctx, v) {
    // own fade (not the engine's v.k, which ends 0.05 s early): fully on until the last 0.18 s, gone exactly on the
    // cut, so the hand-over to the film's first frame (the hook's rising line) never shows an empty black frame
    const k = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.18, 0.18));
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    // the HUD is off during the preroll; one shared size so the two lines read as a block
    const l1 = 'THE SUN YOU SEE', l2 = 'IS 8 MINUTES OLD';
    const s = Math.min(L.fitSize(ctx, l1, MAXW, 108, 800, L.FONT.display, 40), L.fitSize(ctx, l2, MAXW, 108, 800, L.FONT.display, 40));
    line(ctx, [[l1, 'rgb(236,238,250)']], Y1, s);
    line(ctx, [['IS ', 'rgb(236,238,250)'], ['8 MINUTES', L.rgba(v.accent)], [' OLD', 'rgb(236,238,250)']], Y1 + Math.round(s * 1.1), s);
    ctx.restore();
  },
};
const Y1 = 262;   // line-1 baseline: the dark band at the top, well above the Sun (y ≈ 800) and its glow (top ≈ 600)
