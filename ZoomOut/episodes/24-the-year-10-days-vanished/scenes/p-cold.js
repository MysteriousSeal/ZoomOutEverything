// Preroll — cold-open hook: "Ten days in 1582 never happened. | Not one."  (SETUP STUB — builder: refine)
// The engine replays film time ≈ 48.1 → 49.3 at 0.25× (episode.json preroll.from = 43.3): the papal bull's tear in
// beat 8 — days 5–14 lifting out of the October 1582 page. This layer adds the 2-line headline, fully drawn from frame 1
// (no fade-in), on a dark band y ≈ 230–540, above the page (page top ≈ 570). HUD is off during the preroll.
import * as L from '../../../../engine/runtime/lib.js';

const { W } = L;
const MAXW = 940;
const BAND = { y0: 220, y1: 550 };
const L1 = [['10 DAYS IN ', 'rgb(242,236,224)'], ['1582', null]];
const L2 = [['NEVER HAPPENED', 'rgb(242,236,224)']];
function line(c, parts, y, size, acc) {
  c.font = L.font(size, 800, L.FONT.display);
  const text = parts.map((p) => p[0]).join('');
  let x = W / 2 - c.measureText(text).width / 2;
  c.textAlign = 'left';
  for (const [t, col] of parts) { c.fillStyle = col ?? L.rgba(acc); c.fillText(t, x, y); x += c.measureText(t).width; }
}

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.85 },
      { t: 0.05, name: 'creak', gain: 0.25, pitch: 0.9 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawOverlay(c, v) {
    if (v.k <= 0) return;
    c.save();
    c.globalAlpha = v.k;
    const g = c.createLinearGradient(0, BAND.y0, 0, BAND.y1);
    g.addColorStop(0, 'rgba(6,10,22,0)'); g.addColorStop(0.18, 'rgba(6,10,22,0.86)'); g.addColorStop(0.82, 'rgba(6,10,22,0.86)'); g.addColorStop(1, 'rgba(6,10,22,0)');
    c.fillStyle = g;
    c.fillRect(0, BAND.y0, W, BAND.y1 - BAND.y0);
    const size = Math.min(
      L.fitSize(c, L1.map((p) => p[0]).join(''), MAXW, 124, 800, L.FONT.display, 50),
      L.fitSize(c, L2.map((p) => p[0]).join(''), MAXW, 124, 800, L.FONT.display, 50));
    const cap = size * 0.72, gap = size * 0.3, mid = (BAND.y0 + BAND.y1) / 2;
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.6)';
    c.shadowBlur = 16;
    // fine engraved double rules framing the headline (static: everything is on frame 1)
    c.shadowBlur = 0;
    c.fillStyle = L.rgba(v.accent, 0.45);
    const top = mid - gap / 2 - cap - 34, bot = mid + gap / 2 + cap + 30;
    for (const y of [top, bot]) { c.fillRect(W / 2 - 300, y, 600, 1.5); c.fillRect(W / 2 - 220, y + 5, 440, 1); }
    c.shadowBlur = 16;
    line(c, L1, mid - gap / 2, size, v.accent);
    line(c, L2, mid + gap / 2 + cap, size, v.accent);
    c.restore();
  },
};
