// Builder A: overlay helpers in the house style (small tracked uppercase, dark halo, thin crisp lines).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { Hd, P } from './a-hero.js';

export { Hd, P };
const HALO = 'rgba(2,6,14,0.85)';

/** Global start/end of phrase `i` of beat `beat` (falls back to the whole line). */
export function phrase(v, beat, i = 0) {
  const ln = v.tl.lines[beat];
  if (!ln) return { start: v.tl.scenes[beat].start, end: v.tl.scenes[beat].end };
  const ph = ln.phrases?.[Math.min(i, ln.phrases.length - 1)] ?? ln;
  return { start: ph.start, end: ph.end };
}
/** World point -> screen. */
export const scr = (v, [x, y]) => [v.wx(x), v.wy(y)];

/** Small tracked uppercase label with a dark halo. align: left|center|right. */
export function label(c, text, x, y, { size = 18, weight = 700, color = INK, alpha = 1, align = 'left', track = 2.4, family = L.FONT.body } = {}) {
  if (alpha <= 0) return 0;
  c.save();
  c.globalAlpha *= alpha;
  c.font = L.font(size, weight, family);
  c.textBaseline = 'middle';
  c.shadowColor = HALO; c.shadowBlur = 10;
  c.fillStyle = L.rgba(color);
  const w = L.trackedText(c, text, x, y, track, align);
  c.shadowBlur = 4;
  L.trackedText(c, text, x, y, track, align);
  c.restore();
  return w;
}

/** Dimension line between two screen points, drawn in from the middle; end ticks perpendicular. k: 0..1. */
export function dimLine(c, a, b, k, { color = INK, alpha = 1, tick = 12, width = 2 } = {}) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const ax = L.lerp(mx, a[0], e), ay = L.lerp(my, a[1], e), bx = L.lerp(mx, b[0], e), by = L.lerp(my, b[1], e);
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  c.save();
  c.globalAlpha *= alpha;
  c.lineCap = 'round';
  // halo pass then the line
  for (const [col, w] of [[HALO, width + 3], [L.rgba(color, 0.95), width]]) {
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath();
    c.moveTo(ax, ay); c.lineTo(bx, by);
    const tk = tick * L.clamp(k * 1.5 - 0.5);
    if (tk > 0) {
      c.moveTo(a[0] + nx * tk, a[1] + ny * tk); c.lineTo(a[0] - nx * tk, a[1] - ny * tk);
      c.moveTo(b[0] + nx * tk, b[1] + ny * tk); c.lineTo(b[0] - nx * tk, b[1] - ny * tk);
    }
    c.stroke();
  }
  c.restore();
}

/** A leader from an object (dot) to a label anchor. */
export function leaderTo(c, from, to, k, { color = INK, alpha = 1 } = {}) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= alpha;
  c.lineCap = 'round';
  for (const [col, w] of [[HALO, 4], [L.rgba(color, 0.9), 1.6]]) {
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath(); c.moveTo(from[0], from[1]); c.lineTo(L.lerp(from[0], to[0], e), L.lerp(from[1], to[1], e)); c.stroke();
  }
  c.fillStyle = L.rgba(color, 0.95);
  c.shadowColor = HALO; c.shadowBlur = 6;
  c.beginPath(); c.arc(from[0], from[1], 4, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** Big number in the display face (accent), with a halo. */
export function bigNum(c, text, x, y, { size = 72, color = ACCENT, alpha = 1, align = 'left' } = {}) {
  if (alpha <= 0) return 0;
  c.save();
  c.globalAlpha *= alpha;
  c.font = L.font(size, 800, L.FONT.display);
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(2,6,14,0.7)'; c.shadowBlur = 18;
  c.fillStyle = L.rgba(color);
  const w = L.trackedText(c, text, x, y, 0, align);
  c.restore();
  return w;
}

/** The hand's breadth (thumb edge -> little-finger edge across the palm), as world points. ~10.3 cm. */
export const HAND_SPAN = [Hd(-3.5, -5.6), Hd(-3.5, 4.58)];

/** Fade helper: 0 -> 1 over [t0, t0 + d], then 1 -> 0 over [t1, t1 + d2]. */
export function inOut(gt, t0, d, t1 = Infinity, d2 = 0.4) {
  return L.ease.outCubic(L.prog(gt, t0, d)) * (1 - L.ease.inCubic(L.prog(gt, t1, d2)));
}
