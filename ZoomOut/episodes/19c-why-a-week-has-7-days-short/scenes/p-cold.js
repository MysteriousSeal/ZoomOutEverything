// Preroll (19c) — cold-open hook: "In 1793, France tried to replace the week with ten days."
// Ported from 19b's p-cold.js (same line, headline FRANCE ONCE TRIED / A 10-DAY WEEK, reframe and rate, for a fair A/B).
// The engine replays the film's décade payoff (episode.json preroll.from 30.15 = film 34.92 s, 19c beat 10 just after
// the re-flow to ten columns has landed at 34.86: the calendar page VENDÉMIAIRE 1793 in the night sky, ten columns, the
// seven header lights plus three dashed ghost slots for days 8-10, the décadi column tinted) at 0.25x, so the replay
// runs film 34.92 -> ~36.11 s, ending before the Soviet re-flow starts (36.21). Scene overlays are off
// (preroll.overlays = false), so s16's "10 DAYS / FRANCE, 1793–1805" label and its twelve year ticks ("lasted twelve
// years") never show: the cold open states only what the hook says.
// The replay is reframed (drawWorld below: lowered, not enlarged). This layer draws the two-line headline, fully on screen from frame 1
// (no fade-in), in the clear band of night sky ABOVE the page (page top ≈ y 630; the HUD is off during the preroll), on
// a soft dark backing. The headline holds to the cut (engine: v.k drops only at the cut).
import * as L from '../../../../engine/runtime/lib.js';
import { PAGE } from './s16-ten-day-week.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 360;     // first baseline: the block spans y ≈ 285-510, above the reframed page (top ≈ 625)
const Z = 1.0, GY = 990;    // preroll reframe (visual audit, as 19b): the page at film scale (x1.0: its right edge stays at
                            // x ≈ 932, clear of the Shorts buttons column x > 940), its centre lowered to (540, 990)
const LINES = [[['FRANCE ONCE TRIED', 'w']], [['A ', 'w'], ['10-DAY WEEK', 'a']]];

/** centred line at size `s`, parts = [[text, colour], ...] */
function line(ctx, parts, y, s) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.3, pitch: 0.8 },
      { t: 0.05, name: 'shimmer', gain: 0.2, pitch: 1.0 },
      { t: 1.9, name: 'blip', gain: 0.12, pitch: 0.9 },     // "France tried..."
      { t: Math.min(d - 0.6, 3.75), name: 'tick', gain: 0.1, pitch: 1.3 },   // "ten days"
      { t: d - 0.15, name: 'whoosh', gain: 0.32, pitch: 1.2 },
    ];
  },
  // The film frames the page high (y ≈ 560-1240) over the dark limb, which left the lower third of the frame empty
  // here. Reframe the replay (as 18b's preroll does): the page centre lowered to (540, 990) at film scale, so the page
  // spans y ≈ 645-1335 (x ≈ 148-932: nothing in the Shorts buttons column x > 940) under the headline. The world layers are already drawn: re-draw them
  // enlarged in place.
  drawWorld(ctx, v) {
    const cv = ctx.canvas, f = cv.width / W;
    const cx = v.wx(PAGE.x), cy = v.wy(PAGE.y);
    const SX = cx - W / 2 / Z, SY = cy - GY / Z;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cv, SX * f, SY * f, (W / Z) * f, (L.H / Z) * f, 0, 0, cv.width, cv.height);
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    const s = Math.min(...LINES.map((ln) => L.fitSize(ctx, ln.map((p) => p[0]).join(''), MAXW, 104, 800, L.FONT.display, 40)));
    const lh = Math.round(s * 1.14);
    const yEnd = Y1 + lh * (LINES.length - 1);
    // soft backing so the type never sits on a bright star (no hard band)
    const top = Y1 - s * 1.6, bot = yEnd + s * 0.9;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(0.25, 'rgba(2,4,10,0.55)');
    g.addColorStop(0.75, 'rgba(2,4,10,0.55)'); g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, bot - top);
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    const white = 'rgb(246,242,236)', acc = L.rgba(v.accent);
    LINES.forEach((ln, i) => line(ctx, ln.map(([t, c]) => [t, c === 'a' ? acc : white]), Y1 + i * lh, s));
    ctx.restore();
  },
};
