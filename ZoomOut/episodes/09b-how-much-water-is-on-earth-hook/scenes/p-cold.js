// Preroll (09b) — cold-open hook: "All of Earth's water | would fit in a ball smaller than the Moon."
// The engine replays the film's Moon comparison (episode.json preroll.from, beat 5): the water ball sits beside the
// real Moon and its dashed ghost glides into the Moon's left half. Scene overlays are off (preroll.overlays = false), so
// the film's "< ½ the Moon" label does not clash; this layer adds the headline, fully on screen from frame 1, in the
// dark sky above the Moon (whose top edge sits at y ≈ 600), on a soft dark backing (Earth's limb arc runs behind it).
// The film's dashed half-way line means nothing without its label, so a thin strip of the Moon is repainted over it:
// the cold open shows just the ball, the Moon and the ghost.
import * as L from '../../../../engine/runtime/lib.js';
import { drawMoon, fadeOut, moonDraw } from './s05-moon.js';
import { MOON_CMP } from '../camera.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 330;     // first baseline

/** centred line, fitted to MAXW, parts = [[text, colour], ...]; one shared size `s` */
function line(ctx, parts, y, s) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

const L1 = 'ALL OF EARTH’S WATER', L2A = 'SMALLER THAN ', L2B = 'THE MOON';

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: 1.2, name: 'bloom', gain: 0.25, pitch: 1.0 },
      { t: 4.55, name: 'ping', gain: 0.26, pitch: 1.3 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    // repaint the Moon over the film's (unlabelled) half-way line, in s05's own view of the replayed moment
    const s5 = v.tl.scenes[5];
    const sv = { ...v, gt: v.filmGt, t: v.filmGt - s5.start, d: s5.end - s5.start };
    const a = fadeOut(sv);
    if (a <= 0) return;
    // only a thin strip down the Moon's centre is repainted (the ghost never reaches it: it stops ~30 px short)
    const cx = v.wx(MOON_CMP.x);
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - 6, 0, 12, L.H); ctx.clip();
    drawMoon(ctx, sv, a, moonDraw(sv), false);
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // one shared size so the two lines read as a block; both fitted to MAXW
    const s = Math.min(
      L.fitSize(ctx, L1, MAXW, 104, 800, L.FONT.display, 40),
      L.fitSize(ctx, L2A + L2B, MAXW, 104, 800, L.FONT.display, 40));
    const y2 = Y1 + Math.round(s * 1.08);
    // soft dark backing: an ellipse that covers both lines and fades out well before the Moon
    const my = (Y1 - s * 0.72 + y2) / 2 + 4;
    ctx.save();
    ctx.translate(W / 2, my);
    ctx.scale(1, 0.42);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 600);
    g.addColorStop(0, 'rgba(2,4,10,0.86)');
    g.addColorStop(0.62, 'rgba(2,4,10,0.72)');
    g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 600, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    line(ctx, [[L1, 'rgb(236,238,250)']], Y1, s);
    line(ctx, [[L2A, 'rgb(236,238,250)'], [L2B, L.rgba(v.accent)]], y2, s);
    ctx.restore();
  },
};
