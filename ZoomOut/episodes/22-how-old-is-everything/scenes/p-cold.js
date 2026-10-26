// Preroll — cold-open hook: "All of written history | is thinner than a human hair."
// The engine replays film time ≈ 59.75 → 60.86 at 0.25× (episode.json preroll.from): the hair lies on the track,
// the glowing written-history sliver ends at the finish edge, and both measured tags (0.04 mm / 0.07 mm) are already
// on screen. This layer adds the 2-line headline, fully drawn from frame 1 (no fade-in), on a dark band in the upper
// third (y ≈ 300–610) — clear of the tags (y ≥ 880) and of the HUD band (the HUD is off during the preroll).
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 940;
const BAND = { y0: 286, y1: 626 };
const L1 = [['WRITTEN HISTORY IS', 'rgb(240,242,246)']];
const L2 = [['THINNER THAN A ', 'rgb(240,242,246)'], ['HAIR', null]];

function line(ctx, parts, y, size, accent) {
  ctx.font = L.font(size, 800, L.FONT.display);
  const text = parts.map((p) => p[0]).join('');
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, c] of parts) { ctx.fillStyle = c ?? L.rgba(accent); ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: 0.05, name: 'shimmer', gain: 0.22, pitch: 1.1 },
      { t: 3.2, name: 'bloom', gain: 0.26, pitch: 1.0 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    // dark band (soft top/bottom edges) so the headline owns the upper third
    const g = ctx.createLinearGradient(0, BAND.y0, 0, BAND.y1);
    g.addColorStop(0, 'rgba(4,8,14,0)'); g.addColorStop(0.18, 'rgba(4,8,14,0.86)'); g.addColorStop(0.82, 'rgba(4,8,14,0.86)'); g.addColorStop(1, 'rgba(4,8,14,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, BAND.y0, W, BAND.y1 - BAND.y0);
    // one shared size for both lines, fitted to 940 px
    const size = Math.min(
      L.fitSize(ctx, L1.map((p) => p[0]).join(''), MAXW, 124, 800, L.FONT.display, 50),
      L.fitSize(ctx, L2.map((p) => p[0]).join(''), MAXW, 124, 800, L.FONT.display, 50));
    const cap = size * 0.72, gap = size * 0.3, mid = (BAND.y0 + BAND.y1) / 2;
    const b1 = mid - gap / 2, b2 = b1 + cap + gap;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    line(ctx, L1, b1 - cap / 2 + cap / 2, size, v.accent);
    line(ctx, L2, b2, size, v.accent);
    // a thin accent rule under HAIR
    ctx.shadowBlur = 0;
    ctx.font = L.font(size, 800, L.FONT.display);
    const full = ctx.measureText('THINNER THAN A HAIR').width, hw = ctx.measureText('HAIR').width;
    const hx = W / 2 + full / 2 - hw;
    ctx.fillStyle = L.rgba(v.accent, 0.9);
    ctx.fillRect(hx, b2 + 16, hw, 5);
    ctx.restore();
  },
};
