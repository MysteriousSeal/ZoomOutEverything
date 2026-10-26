// Preroll (16c) — cold-open hook: "Crush the whole Sun into a black hole, and it would be just six kilometers wide."
// The engine replays the film's payoff (episode.json preroll.from: 16c beat 6, the 6 km event horizon at true scale,
// already settled with its diameter dimension drawn, as the city-sized street map starts to open out UNDER it) in slow
// motion, with scene overlays off (preroll.overlays = false: the film's "6 km" label would repeat the headline).
// This layer adds the two-line headline, fully on screen from frame 1 (no fade-in), in the clear band of space ABOVE the
// hole and the city plate (plate top ≈ y 480; the HUD is off during the preroll), on a soft dark backing.
// The headline holds to the cut (engine: v.k drops only in the last 0.12 s).
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 300;     // first baseline: the block spans y ≈ 225-410, above the plate (≈ 480) and the photon ring (≈ 500)

const L1 = 'THE WHOLE SUN', L2A = 'CRUSHED TO ', L2B = '6 KM';

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
      { t: 0.0, name: 'deep', gain: 0.4, pitch: 0.8 },
      { t: 0.05, name: 'shimmer', gain: 0.2, pitch: 0.85 },
      { t: 3.3, name: 'ping', gain: 0.22, pitch: 0.9 },   // "…six kilometers wide"
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // one shared size for both lines, fitted to the wider one (≤ 940 px)
    const s = Math.min(
      L.fitSize(ctx, L1, MAXW, 104, 800, L.FONT.display, 40),
      L.fitSize(ctx, L2A + L2B, MAXW, 104, 800, L.FONT.display, 40));
    const y2 = Y1 + Math.round(s * 1.15);
    // soft backing so the type never sits on a bright lensed star (no hard band)
    const top = Y1 - s * 1.5, bot = y2 + s * 0.7;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(0.3, 'rgba(2,4,10,0.6)');
    g.addColorStop(0.75, 'rgba(2,4,10,0.6)'); g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, bot - top);
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    line(ctx, [[L1, 'rgb(246,242,236)']], Y1, s);
    line(ctx, [[L2A, 'rgb(246,242,236)'], [L2B, L.rgba(v.accent)]], y2, s);
    ctx.restore();
  },
};
