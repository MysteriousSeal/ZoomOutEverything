// Preroll (16b) — cold-open hook: "Crush the whole Sun into a black hole, | and it would be just 6 kilometers wide."
// The engine replays the film's city-scale payoff (episode.json preroll.from 46.8 = film 47.0 s, the end of beat 11:
// the true-size 6 km horizon settled over the ~11 km city plate, the diameter dimension drawn across it) at 0.33x,
// so the replay runs film 47.0 -> 48.95 s: beat 12's warm ghost of the Sun's surface closes in from beyond the frame
// and is swallowed by the photon ring just before the cut ("the whole Sun", crushed into this ball). Nothing later
// (the road, the car, the trip timer, "≈ 4 min") is reached. Scene overlays are off (preroll.overlays = false), so
// s11's "6 km" label and city dimension do not fade out mid-replay; this layer draws:
//  - the city dimension ("A CITY · 11 KM ACROSS", s11's own device, fully on from frame 1) under the plate, so the
//    city-scale comparison reads on frame 1;
//  - the two-line headline "THE WHOLE SUN / CRUSHED TO 6 KM", fully on screen from frame 1 (no fade-in), in the clear
//    band of space ABOVE the city plate (plate ≈ y 480-1160; the HUD is off during the preroll), on a soft backing.
// The headline holds to the cut (engine: v.k drops only in the last 0.12 s).
import * as L from '../../../../engine/runtime/lib.js';
import { cityDimension } from './s11-six-km.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 318;     // first baseline: the block spans y ≈ 245-440, above the city plate (≈ 480)
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
    // the Sun's ghost is swallowed at film 48.81 s = (48.81 - 47.0) / 0.33 ≈ 5.5 s into the preroll
    return [
      { t: 0.0, name: 'deep', gain: 0.4, pitch: 0.8 },
      { t: 0.05, name: 'shimmer', gain: 0.16, pitch: 0.8 },
      { t: 2.9, name: 'swell', gain: 0.22, pitch: 0.75 },
      { t: Math.min(d - 0.4, 5.45), name: 'impact', gain: 0.28, pitch: 0.7 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    // the city-scale comparison, on from frame 1 (same geometry as s11's own, which the replay leaves off)
    cityDimension(ctx, v, 1);   // uses only the camera (v.wx / v.cam)
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    const s = Math.min(
      L.fitSize(ctx, L1, MAXW, 104, 800, L.FONT.display, 40),
      L.fitSize(ctx, L2A + L2B, MAXW, 104, 800, L.FONT.display, 40));
    const y2 = Y1 + Math.round(s * 1.16);
    // soft backing so the type never sits on a bright star (no hard band)
    const g = ctx.createLinearGradient(0, Y1 - s * 1.6, 0, y2 + s * 0.9);
    g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(0.3, 'rgba(2,4,10,0.55)');
    g.addColorStop(0.7, 'rgba(2,4,10,0.55)'); g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Y1 - s * 1.6, W, y2 - Y1 + s * 2.5);
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    line(ctx, [[L1, 'rgb(246,242,236)']], Y1, s);
    line(ctx, [[L2A, 'rgb(246,242,236)'], [L2B, L.rgba(v.accent)]], y2, s);
    ctx.restore();
  },
};
