// Preroll (18c) — cold-open hook: "More than ninety-nine percent of the internet between continents runs under the sea."
// Same line, headline, reframe and ring as 18b's cold open (ported, for a fair A/B). The engine replays the film's
// backbone payoff (episode.json preroll.from: 18c beat 7 = 18 beat 16 just after "ninety-nine": the whole night globe
// over Asia-Pacific wrapped in the undersea cable network, every route lit and pulsing) at 0.3x, ending before the turn
// home starts (see episode.json / the report for the exact film window).
// Scene overlays are off (preroll.overlays = false), so s16's "99%+" side label does not clash with the headline; this
// layer draws:
//  - s16's own ring gauge round the planet (its drawOverlay is off in the replay), on film time: already ~10% round on
//    frame 1, it fills to 99% about 2.7 s in (with the soft completion pulse) and then the open 1% notch and its tiny
//    satellite appear. It states exactly what the hook says (99%), nothing more;
//  - the three-line headline 99% OF THE INTERNET / BETWEEN CONTINENTS / RUNS UNDER THE SEA, fully on screen from frame 1
//    (no fade-in), in the clear band of space ABOVE the ring (ring top ≈ y 555 after the x1.3 reframe below; the HUD is off during the preroll),
//    on a soft dark backing. "Between continents" keeps it true to the source (>99% of INTERCONTINENTAL traffic).
// The headline holds to the cut (engine: v.k drops only in the last 0.12 s).
import * as L from '../../../../engine/runtime/lib.js';
import { drawGauge, times } from './s16-ninety-nine.js';
import { globeDisc } from '../env.js';
import { legacy } from '../legacy.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 250;     // first baseline: the block spans y ≈ 185-470, above the ring (≈ 555 after the reframe)
const Z = 1.3, GY = 1020;   // preroll reframe: the globe enlarged x1.3 about its centre, the centre placed at y 1020
const LINES = [[['99%', 'a'], [' OF THE INTERNET', 'w']], [['BETWEEN CONTINENTS', 'w']], [['RUNS UNDER THE SEA', 'w']]];

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
    // the ring completes ≈ 2.7 s into the preroll (from is chosen as in 18b: 0.95 s of film before "full"); the notch ≈ 4.0 s
    return [
      { t: 0.0, name: 'swell', gain: 0.3, pitch: 0.8 },
      { t: 0.05, name: 'shimmer', gain: 0.2, pitch: 1.0 },
      { t: 2.65, name: 'bloom', gain: 0.3, pitch: 1.0 },
      { t: 2.7, name: 'ping', gain: 0.2, pitch: 1.2 },
      { t: Math.min(d - 0.5, 4.0), name: 'blip', gain: 0.12, pitch: 0.8 },
      { t: d - 0.15, name: 'whoosh', gain: 0.32, pitch: 1.2 },
    ];
  },
  // The film frames the globe small (ring ≈ y 570-1270) under its top-left label stack, which left the lower half of the
  // frame empty here. Reframe the replay x1.3 about the disc centre (as 17b's preroll does), the centre at y 1020: the
  // ring now spans y ≈ 555-1485, right under the headline. The world layers are already drawn: re-draw them enlarged in
  // place, then draw the ring in the same enlarged frame.
  drawWorld(ctx, v) {
    const cv = ctx.canvas, f = cv.width / W;
    const d = globeDisc(v);
    const SX = d.x - W / 2 / Z, SY = d.y - GY / Z;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cv, SX * f, SY * f, (W / Z) * f, (L.H / Z) * f, 0, 0, cv.width, cv.height);
    ctx.restore();
    // the 99% ring round the planet, on FILM time (v.filmGt) at full strength from frame 1, in the enlarged frame
    ctx.save();
    ctx.scale(Z, Z);
    ctx.translate(-SX, -SY);
    drawGauge(ctx, { ...v, gt: v.filmGt, k: 1 }, times(legacy(v.tl)));   // 18c: on the legacy timeline
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    const s = Math.min(...LINES.map((ln) => L.fitSize(ctx, ln.map((p) => p[0]).join(''), MAXW, 96, 800, L.FONT.display, 40)));
    const lh = Math.round(s * 1.14);
    const yEnd = Y1 + lh * (LINES.length - 1);
    // soft backing so the type never sits on a bright star or the atmosphere glow (no hard band)
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
