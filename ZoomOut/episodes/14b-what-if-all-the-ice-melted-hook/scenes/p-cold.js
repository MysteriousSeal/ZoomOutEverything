// Preroll (14b) — cold-open hook: "Melt all the ice on Earth, | and the sea rises about 70 meters."
// The engine replays the film's Liberty payoff (episode.json preroll.from: the end of beat 4 into beat 5) at
// preroll.rate: frame 1 already shows the sea high up the pedestal, and it keeps rising to her chest (the film's
// +70 m) while the camera settles in on the statue. Scene overlays are off (preroll.overlays = false), so the
// film's gauge and "+70 m" label don't clash with the headline. This layer adds the two-line headline, fully on
// screen from frame 1 (v.k only drops at the cut, engine), in the clear sky band ABOVE the torch.
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 940;   // 70 px side margins
const Y1 = 300;     // first baseline (the block spans y ≈ 210-400; the torch tip sits at y ≈ 530 or lower)

/** centred line at size `s`, parts = [[text, colour], ...] */
function line(ctx, parts, y, s) {
  const text = parts.map((p) => p[0]).join('');
  ctx.font = L.font(s, 800, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

const L1 = 'MELT ALL THE ICE', L2A = 'THE SEA RISES ABOUT ', L2B = '70 METERS';

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.3, pitch: 0.8 },
      { t: 0.5, name: 'whoosh', gain: 0.26, pitch: 0.8 },
      { t: 3.7, name: 'ping', gain: 0.26, pitch: 1.25 },   // "seventy meters"
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  // f14v1: frame the replay tighter (×1.4 about the statue): the film's statue framing leaves her small with 40% of the
  // frame as empty water under the island; here she is centred and ≈ 1000 px tall, torch tip ≈ 470 (under the
  // headline), the island ground ≈ 1480-1630. The world layers are already drawn: re-draw them enlarged in place.
  drawWorld(ctx, v) {
    void v;
    const cv = ctx.canvas, f = cv.width / W, Z = 1.4;
    const sw = W / Z, sh = L.H / Z, sx = 433 - sw / 2, sy = 200;   // statue axis at x ≈ 433 in the film's framing
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cv, sx * f, sy * f, sw * f, sh * f, 0, 0, cv.width, cv.height);
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    // two tiers, each fitted to MAXW: the action big, the payoff line smaller (accent on the number)
    const s2 = L.fitSize(ctx, L2A + L2B, MAXW, 84, 800, L.FONT.display, 40);
    const s1 = Math.min(L.fitSize(ctx, L1, MAXW, 120, 800, L.FONT.display, 40), Math.round(s2 * 1.45));
    const y2 = Y1 + Math.round(s2 * 1.3);
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    line(ctx, [[L1, 'rgb(246,242,236)']], Y1, s1);
    line(ctx, [[L2A, 'rgb(232,228,222)'], [L2B, L.rgba(v.accent)]], y2, s2);
    ctx.restore();
  },
};
