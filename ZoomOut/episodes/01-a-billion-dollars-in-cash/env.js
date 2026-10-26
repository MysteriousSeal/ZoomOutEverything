// Environment for "What $1 Billion Actually Looks Like". Owned by the orchestrator — builders: read, don't edit.
// Exports iso helpers (isoPt, isoBox, isoQuad), the human-for-scale figure and the HUD.
import * as L from '../../../engine/runtime/lib.js';
import { iso } from './camera.js';

const { W, H } = L;
export const ACCENT = [110, 220, 140];
export { iso };

/** World point → screen [sx, sy]. */
export const isoPt = (v, x, y, z) => { const [px, py] = iso(x, y, z); return [v.wx(px), v.wy(py)]; };

/** Shade a base colour for the three visible faces (light from top-left). */
export const faces = (c) => ({ top: L.mix(c, [255, 255, 255], 0.18), left: c, right: L.mix(c, [0, 0, 0], 0.32) });

/**
 * Axis-aligned box in world metres: corner (x, y, z), size (w along x, h up, d along z).
 * colors: base [r,g,b] or {top, left, right}. Draws the three faces visible in this iso view
 * (top, front-left = +z face, front-right = +x face). Optional stroke for edges.
 */
export function isoBox(ctx, v, x, y, z, w, h, d, colors, { alpha = 1, stroke = null, lw = 1 } = {}) {
  const f = Array.isArray(colors) ? faces(colors) : colors;
  const P = (a, b, c) => isoPt(v, a, b, c);
  const quad = (pts, col) => {
    ctx.beginPath();
    pts.forEach(([sx, sy], i) => (i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)));
    ctx.closePath();
    ctx.fillStyle = L.rgba(col, alpha);
    ctx.fill();
    if (stroke) { ctx.strokeStyle = L.rgba(stroke, alpha * 0.6); ctx.lineWidth = lw; ctx.stroke(); }
  };
  quad([P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x, y + h, z + d)], f.top);
  quad([P(x, y, z + d), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x, y + h, z + d)], f.left);
  quad([P(x + w, y, z), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x + w, y + h, z)], f.right);
}

/** Flat quad on the ground (y = 0 by default), e.g. shadows, markings. */
export function isoQuad(ctx, v, x, z, w, d, rgbaStr, y = 0) {
  const P = (a, c) => isoPt(v, a, y, c);
  ctx.beginPath();
  [P(x, z), P(x + w, z), P(x + w, z + d), P(x, z + d)].forEach(([sx, sy], i) => (i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)));
  ctx.closePath();
  ctx.fillStyle = rgbaStr;
  ctx.fill();
}

/** 1.75 m person silhouette standing at (x, z) on the ground, facing the viewer. k = 0..1 visibility. */
export function drawHuman(ctx, v, x, z, k = 1, col = [205, 214, 224]) {
  if (k <= 0) return;
  const s = v.ws(1);                 // px per metre
  if (1.75 * s < 3) return;
  const [fx, fy] = isoPt(v, x, 0, z);
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.fillStyle = L.rgba(col, 0.78);
  const u = s;  // metres → px
  // legs
  ctx.beginPath();
  ctx.moveTo(fx - 0.17 * u, fy); ctx.lineTo(fx - 0.06 * u, fy - 0.92 * u); ctx.lineTo(fx + 0.06 * u, fy - 0.92 * u);
  ctx.lineTo(fx + 0.17 * u, fy); ctx.lineTo(fx + 0.08 * u, fy); ctx.lineTo(fx, fy - 0.6 * u); ctx.lineTo(fx - 0.08 * u, fy);
  ctx.closePath(); ctx.fill();
  // torso + arms
  L.roundRect(ctx, fx - 0.21 * u, fy - 1.48 * u, 0.42 * u, 0.62 * u, 0.09 * u); ctx.fill();
  L.roundRect(ctx, fx - 0.29 * u, fy - 1.44 * u, 0.09 * u, 0.62 * u, 0.045 * u); ctx.fill();
  L.roundRect(ctx, fx + 0.2 * u, fy - 1.44 * u, 0.09 * u, 0.62 * u, 0.045 * u); ctx.fill();
  // head
  ctx.beginPath(); ctx.ellipse(fx, fy - 1.62 * u, 0.1 * u, 0.12 * u, 0, 0, Math.PI * 2); ctx.fill();
  // soft contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(fx, fy, 0.3 * u, 0.09 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ background: studio + ground grid
export function drawBackground(c, v) {
  const g = c.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#16201c');
  g.addColorStop(0.55, '#0c1210');
  g.addColorStop(1, '#050807');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  drawGrid(c, v);
}

/** Ground grid in iso; spacing adapts to zoom (1 cm … 10 m) with cross-fade so it never pops. */
function drawGrid(c, v) {
  const mpp = v.cam.mpp;
  const target = mpp * 70;                               // ~70 px between lines
  const lg = Math.log10(target), base = Math.floor(lg), frac = lg - base;
  const levels = [[Math.pow(10, base), 1 - frac], [Math.pow(10, base + 1), 1]];
  // visible ground extent around the camera (generous)
  const span = mpp * 1400;
  const cx = v.cam.y + v.cam.x / (2 * Math.cos(Math.PI / 6));      // invert iso at ground for the screen centre
  const cz = v.cam.y - v.cam.x / (2 * Math.cos(Math.PI / 6));
  c.save();
  c.lineWidth = 1;
  for (const [step, a] of levels) {
    if (a <= 0.02) continue;
    const x0 = Math.floor((cx - span) / step) * step, z0 = Math.floor((cz - span) / step) * step;
    const n = Math.min(80, Math.ceil((2 * span) / step));
    c.strokeStyle = `rgba(150,190,170,${0.07 * a})`;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * step;
      let [ax, ay] = isoPt(v, x, 0, z0), [bx, by] = isoPt(v, x, 0, z0 + n * step);
      c.moveTo(ax, ay); c.lineTo(bx, by);
      const z = z0 + i * step;
      [ax, ay] = isoPt(v, x0, 0, z); [bx, by] = isoPt(v, x0 + n * step, 0, z);
      c.moveTo(ax, ay); c.lineTo(bx, by);
    }
    c.stroke();
  }
  c.restore();
}

export function drawForeground(c, v) {
  // a few soft dust motes for depth
  const r = L.rng(5);
  c.save();
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y0 = r() * H, sp = 6 + r() * 14;
    const y = ((y0 - v.gt * sp) % H + H) % H;
    c.fillStyle = `rgba(210,235,220,${0.05 + r() * 0.08})`;
    c.beginPath(); c.arc(x + L.noise1(v.gt * 0.3 + i, 3) * 12, y, 1 + r() * 2.5, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ HUD
const NICE = [1, 2, 5];
function niceLen(m) {
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  for (const n of NICE) if (n * p >= m) return n * p;
  return 10 * p;
}
const fmtLen = (m) => (m < 0.01 ? `${L.fmt(m * 1000)} mm` : m < 1 ? `${L.fmt(m * 100)} cm` : `${L.fmt(m)} m`);

export function drawHud(c, v) {
  // top bar
  c.save();
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(225,235,230,0.75)';
  c.textBaseline = 'middle';
  L.trackedText(c, `${v.ep.channel}  ·  ${v.ep.episodeLabel}`, 64, 160, 4);
  const s = Math.floor(v.gt), f = Math.floor((v.gt - s) * 30);
  c.font = L.font(20, 400, L.FONT.mono);
  c.textAlign = 'right';
  c.fillText(`00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`, W - 64, 160);
  c.fillStyle = 'rgba(225,235,230,0.18)';
  c.fillRect(64, 182, W - 128, 2);
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(64, 182, (W - 128) * L.clamp(v.gt / v.tl.total), 2);
  c.restore();
  // scale bar (top right, under the bar): adaptive length ~160 px
  const k = L.ease.outCubic(L.prog(v.gt, 1.0, 0.6));
  if (k > 0) {
    const len = niceLen(v.cam.mpp * 150), px = len / v.cam.mpp;
    const x1 = W - 64, x0 = x1 - px, y = 238;
    c.save();
    c.globalAlpha = k;
    c.strokeStyle = 'rgba(225,235,230,0.85)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(x0, y - 8); c.lineTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y - 8); c.stroke();
    c.font = L.font(22, 600, L.FONT.body);
    c.fillStyle = 'rgba(225,235,230,0.85)';
    c.textAlign = 'right';
    c.textBaseline = 'alphabetic';
    c.fillText(fmtLen(len), x1, y - 14);
    c.restore();
  }
}

// ------------------------------------------------------------------ shared cues
export function cues(tl) {
  return tl.scenes.slice(1).map((s) => ({ t: s.start - 0.05, name: 'whoosh', gain: 0.22, pitch: 0.8 }));
}
