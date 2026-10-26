// Builder C — drawing helpers for the solar layer and scenes 13–17 (labels, safe huge circles, dots, point clouds).
import * as L from '../../../../engine/runtime/lib.js';
import { INK } from '../world.js';

const { W, H } = L;
export const HALO = 'rgba(3,5,10,0.88)';
export const SUBCOL = [168, 184, 206];

/** Tracked text with a dark halo (stroke + soft shadow). align: left | right | center. Returns width. */
export function textH(c, str, x, y, { size = 19, weight = 700, family = L.FONT.body, track = 3, align = 'left', col = INK, a = 1 } = {}) {
  c.save();
  c.font = L.font(size, weight, family);
  c.letterSpacing = `${track}px`;
  const w = c.measureText(str).width - track;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.globalAlpha *= a;
  c.lineJoin = 'round';
  c.shadowColor = 'rgba(0,0,0,0.75)';
  c.shadowBlur = 10;
  c.strokeStyle = HALO;
  c.lineWidth = Math.max(3, size * 0.26);
  c.strokeText(str, x0, y);
  c.shadowBlur = 0;
  c.fillStyle = L.rgba(col);
  c.fillText(str, x0, y);
  c.restore();
  return w;
}

/**
 * Name tag with a thin elbow leader. Object at (ox, oy); elbow at (ox+dx, oy+dy); text beyond it on `side`
 * ('r' text to the right, 'l' to the left, 'c' centred above/below the end of a vertical leader).
 */
export function tag(c, ox, oy, { text, sub = '', dx = 40, dy = -40, side = 'r', k = 1, gap = 7, col = INK, size = 19, subSize = 16 }) {
  if (k <= 0.004) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.3);
  const ex = ox + dx, ey = oy + dy;
  const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  const g = Math.min(gap, len * 0.4);
  c.strokeStyle = 'rgba(214,224,238,0.55)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(ox + ux * g, oy + uy * g);
  const e1 = L.clamp(e * 1.5), e2 = L.clamp(e * 1.5 - 0.5);
  c.lineTo(L.lerp(ox + ux * g, ex, e1), L.lerp(oy + uy * g, ey, e1));
  const dir = side === 'r' ? 1 : -1;
  if (side !== 'c' && e2 > 0) c.lineTo(ex + dir * 14 * e2, ey);
  c.stroke();
  const ta = L.clamp(k * 1.6 - 0.4);
  if (ta > 0) {
    if (side === 'c') {
      const s = Math.sign(dy) || 1;
      const y1 = ey + s * 16;
      textH(c, text, ex, y1, { size, align: 'center', col, a: ta });
      if (sub) textH(c, sub, ex, y1 + s * 0 + 23, { size: subSize, weight: 600, track: 1.5, align: 'center', col: SUBCOL, a: ta });
    } else {
      const tx = ex + dir * 22, al = side === 'r' ? 'left' : 'right';
      textH(c, text, tx, ey, { size, align: al, col, a: ta });
      if (sub) textH(c, sub, tx, ey + 22, { size: subSize, weight: 600, track: 1.5, align: al, col: SUBCOL, a: ta });
    }
  }
  c.restore();
}

/**
 * Add a circle (screen centre sx, sy, radius R px) to the current path, but only the part that can be seen:
 * full arc when modest, otherwise a polyline over the visible angular span (never a giant arc()).
 * Returns false when nothing of it is on screen.
 */
export function circlePath(c, sx, sy, R, pad = 8) {
  if (!(R > 0.5) || !isFinite(R)) return false;
  const x0 = -pad, x1 = W + pad, y0 = -pad, y1 = H + pad;
  const nx = Math.max(x0 - sx, 0, sx - x1), ny = Math.max(y0 - sy, 0, sy - y1);
  const dn = Math.hypot(nx, ny);
  const fx = Math.max(Math.abs(sx - x0), Math.abs(sx - x1)), fy = Math.max(Math.abs(sy - y0), Math.abs(sy - y1));
  const df = Math.hypot(fx, fy);
  if (R < dn || R > df) return false;
  if (R < 3000) { c.moveTo(sx + R, sy); c.arc(sx, sy, R, 0, Math.PI * 2); return true; }
  const base = Math.atan2((y0 + y1) / 2 - sy, (x0 + x1) / 2 - sx);
  let a0 = Infinity, a1 = -Infinity;
  for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
    let d = Math.atan2(y - sy, x - sx) - base;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    a0 = Math.min(a0, d); a1 = Math.max(a1, d);
  }
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const a = base + L.lerp(a0, a1, i / n);
    const x = sx + Math.cos(a) * R, y = sy + Math.sin(a) * R;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  return true;
}

/** Small planet: soft glow + disc shaded toward the Sun (lx, ly = unit vector from planet toward the Sun, screen). */
export function dot(c, x, y, r, col, a, lx = -0.6, ly = 0.8, glow = 1) {
  if (a <= 0.004 || x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
  if (glow > 0) L.lightBlob(c, x, y, r * 4.2, col, 0.32 * a * glow);
  c.save();
  c.globalAlpha *= a;
  if (r >= 2.2) {
    const g = c.createRadialGradient(x + lx * r * 0.45, y + ly * r * 0.45, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, L.rgba(L.mix(col, [255, 255, 255], 0.35)));
    g.addColorStop(0.55, L.rgba(col));
    g.addColorStop(1, L.rgba(L.mix(col, [8, 10, 18], 0.6)));
    c.fillStyle = g;
  } else c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.2));
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fill();
  c.restore();
}

/** Batched point cloud: buckets of [dx, dy] metre offsets from a centre (screen ox, oy), one fill per bucket. */
export function cloud(c, ox, oy, inv, B, col, alphas, size, k, pad = 4) {
  if (k <= 0.003) return;
  const h = size / 2;
  for (let b = 0; b < B.length; b++) {
    const a = alphas[b] * k;
    if (a <= 0.003) continue;
    const P = B[b];
    c.fillStyle = L.rgba(col, Math.min(1, a));
    c.beginPath();
    for (let i = 0; i < P.length; i += 2) {
      const x = ox + P[i] * inv, y = oy + P[i + 1] * inv;
      if (x < -pad || x > W + pad || y < -pad || y > H + pad) continue;
      c.rect(x - h, y - h, size, size);
    }
    c.fill();
  }
}
