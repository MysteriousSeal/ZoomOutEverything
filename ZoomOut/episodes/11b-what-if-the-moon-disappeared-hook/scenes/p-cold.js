// Preroll (11b) — cold-open hook: "The Moon is already leaving us, | a little farther every single year."
// The engine replays the film's drift payoff (episode.json preroll.from, beat 11 ≈ 2.5 s in): Earth and the true-size
// Moon at true distance, with the ghost orbits easing outward past the Moon, one after another, and the ghost Moons
// marching out along the Earth–Moon line. Scene overlays are off (preroll.overlays = false), so the film's
// "3.8 cm / year" label does not show; this layer adds the headline, fully on screen from frame 1, in the empty space
// below Earth (inside the orbit; the rings and the Moon are top-right, Earth's tag ends at y ≈ 1165). The block is
// left-aligned at x 80 and fitted to 860 px, so it stays clear of the Shorts buttons (x > 940 below y 1100).
// The film's dashed Earth–Moon line breaks under the (hidden) "3.8 cm" label; with no label that gap would read as a
// glitch, so it is repainted here, in the same dash phase, only inside the label's box.
import * as L from '../../../../engine/runtime/lib.js';
import { sys } from './s10-leaving.js';
import { bigBox } from './s11-3-8-cm.js';

const X0 = 80;      // left edge of the block
const MAXW = 860;   // right edge 940
const Y1 = 1318;    // first baseline

const L1 = 'THE MOON IS ALREADY', L2 = 'LEAVING US';

// ------------------------------------------------------------------ phone-size markers on the two bodies
// At true scale Earth is ~30 px and the Moon a ~6 px dot, so on a phone the cold open read as empty space. This layer
// (full strength from frame 1, following v.k only) puts a soft bloom and a locator ring on each body and streams
// accent chevrons outward from the Moon along the Earth–Moon line: "leaving" reads at a glance. The name tags stay
// the film's own (s10).
const TAU = Math.PI * 2;
function markers(c, v) {
  const k = L.clamp(v.k);
  if (k <= 0) return;
  const sv = { ...v, gt: v.filmGt };
  const s = sys(sv);
  const t = v.t;
  c.save();
  c.globalAlpha *= k;
  // Earth: blue bloom + a breathing locator ring
  const er = Math.max(6, s.er);
  L.lightBlob(c, s.ex, s.ey, er * 3.2 + 40, [110, 160, 255], 0.38);
  c.strokeStyle = 'rgba(175,200,255,0.7)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(s.ex, s.ey, Math.max(0, er + 14 + 2 * Math.sin(t * 2.2)), 0, TAU); c.stroke();
  // Moon: a cool bloom + locator ring
  L.lightBlob(c, s.mx, s.my, 70, [215, 225, 255], 0.42);
  c.strokeStyle = 'rgba(220,230,255,0.8)';
  c.beginPath(); c.arc(s.mx, s.my, Math.max(0, Math.max(4, s.mr) + 13 + 2 * Math.sin(t * 2.2 + 1)), 0, TAU); c.stroke();
  // "leaving": accent chevrons streaming outward from the Moon along the Earth–Moon line
  const ux = s.u.x, uy = s.u.y, nx = -uy, ny = ux;
  const d0 = 80, d1 = 205, n = 3;   // starts beyond the marching ghost Moons
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const u = ((i / n) + t * 0.45) % 1;
    const a = Math.sin(Math.PI * u) ** 0.8;
    const d = L.lerp(d0, d1, u), px = s.mx + ux * d, py = s.my + uy * d, sz = 16;
    c.strokeStyle = L.rgba(v.accent, 0.95 * a);
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(px - ux * sz + nx * sz, py - uy * sz + ny * sz);
    c.lineTo(px, py);
    c.lineTo(px - ux * sz - nx * sz, py - uy * sz - ny * sz);
    c.stroke();
  }
  c.restore();
}

export default {
  cues(d) {
    return [
      { t: 0.0, name: 'riser', gain: 0.3, pitch: 0.85 },
      { t: 0.2, name: 'sonar', gain: 0.22, pitch: 0.8 },
      { t: 2.6, name: 'bloom', gain: 0.22, pitch: 1.0 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    markers(ctx, v);
    // fill the dashed Earth–Moon line back in where the film breaks it under the hidden "3.8 cm / year" label
    const sv = { ...v, gt: v.filmGt };
    const b = bigBox(ctx, sv);
    if (!b) return;
    const s = sys(sv);
    const ax = s.ex + s.u.x * (s.er + 10), ay = s.ey + s.u.y * (s.er + 10);
    const bx = s.mx - s.u.x * 12, by = s.my - s.u.y * 12;
    ctx.save();
    ctx.beginPath(); ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.clip();
    ctx.globalAlpha = L.ease.inOutCubic(b.k);
    ctx.strokeStyle = 'rgba(205,215,240,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 6]);
    ctx.lineDashOffset = 0;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    if (v.k <= 0) return;
    ctx.save();
    ctx.globalAlpha = v.k;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // one shared size so the two lines read as a block; both fitted to MAXW
    const s = Math.min(
      L.fitSize(ctx, L1, MAXW, 112, 800, L.FONT.display, 40),
      L.fitSize(ctx, L2, MAXW, 112, 800, L.FONT.display, 40));
    const y2 = Y1 + Math.round(s * 1.08);
    // soft dark backing (the sky here is already dark: it only keeps stars from speckling the letters)
    ctx.save();
    ctx.translate(X0 + MAXW / 2, (Y1 - s * 0.72 + y2) / 2);
    ctx.scale(1, 0.4);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 560);
    g.addColorStop(0, 'rgba(2,4,10,0.8)');
    g.addColorStop(0.6, 'rgba(2,4,10,0.6)');
    g.addColorStop(1, 'rgba(2,4,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 560, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // accent rule above the block
    ctx.fillStyle = L.rgba(v.accent, 0.9);
    ctx.fillRect(X0 + 4, Y1 - Math.round(s * 0.72) - 34, 72, 6);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    ctx.font = L.font(s, 800, L.FONT.display);
    ctx.fillStyle = 'rgb(236,238,250)';
    ctx.fillText(L1, X0, Y1);
    ctx.fillStyle = L.rgba(v.accent);
    ctx.fillText(L2, X0, y2);
    ctx.restore();
  },
};
