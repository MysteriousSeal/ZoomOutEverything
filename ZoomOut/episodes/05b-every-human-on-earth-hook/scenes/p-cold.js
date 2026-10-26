// Preroll (05b) — cold-open hook: "All eight billion of us would fit in a single cube, shorter than the Burj Khalifa."
// The engine replays the film's cube moment (episode.json preroll.from/rate) in slow motion: the cube is on screen
// with its "≈ 800 m" label from frame 1, and the Burj Khalifa rises beside it as the voice says "shorter than the
// Burj Khalifa". This layer pushes slowly in on the replayed shot (so the cold open never sits still and the empty
// ground below the cube shrinks), then adds the headline, fully on screen from frame 1, in the clear band above the
// scene's "≈ 800 m" label (y > 470).
import * as L from '../../../../engine/runtime/lib.js';

const { W, H } = L;
const FOCUS = [W / 2, 470];   // push-in anchor: the label/cube band stays put, the ground slides down and out
let SCR = null;
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
      { t: 0.0, name: 'impact', gain: 0.45, pitch: 0.7 },
      { t: 0.02, name: 'deep', gain: 0.35, pitch: 0.8 },
      { t: 0.3, name: 'creak', gain: 0.22, pitch: 0.6 },      // the Burj starts to rise (film 31.5 s at rate 0.4)
      { t: 0.35, name: 'swell', gain: 0.24, pitch: 0.8 },
      { t: 3.35, name: 'shimmer', gain: 0.2, pitch: 1.0 },     // it tops out beside the cube
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    // slow push-in on the composed replay (scale 1.04 → 1.11 around FOCUS); the headline is drawn after, crisp
    const u = L.clamp(v.t / Math.max(0.1, v.d)), z = 1.04 + 0.07 * (1 - (1 - u) * (1 - u));   // moving from frame 1, easing out
    const cv = ctx.canvas;
    if (!SCR || SCR.width !== cv.width || SCR.height !== cv.height) SCR = new OffscreenCanvas(cv.width, cv.height);
    const g = SCR.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(cv, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingQuality = 'high';
    const kx = cv.width / W, ky = cv.height / H;
    ctx.drawImage(SCR, FOCUS[0] * kx * (1 - z), FOCUS[1] * ky * (1 - z), cv.width * z, cv.height * z);
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    // headline in the top band (the HUD is off during the preroll); ≥ 70 px clear of the scene's accent rule at y ≈ 446
    line(ctx, [['ALL 8 BILLION OF US', 'rgb(240,232,228)']], 248, 108);
    line(ctx, [['IN ONE ', 'rgb(240,232,228)'], ['CUBE', L.rgba(v.accent)]], 360, 108);
    ctx.restore();
  },
};
