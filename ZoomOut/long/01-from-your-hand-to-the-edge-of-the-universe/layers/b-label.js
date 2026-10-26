// Builder B — label kit for beats 4–12 (house style: small tracked uppercase, dark halo, thin leader lines) and the
// voice timeline (read at runtime from build/timeline.json, so labels and cues follow the words even if the voice moves).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';

export const TL = await (await fetch(new URL('../build/timeline.json', import.meta.url))).json();
/** start of phrase i of beat b, in seconds since the beat's start (v.t / cue time base) */
export function phrase(b, i = 0, tl = TL) {
  const line = tl.lines[b], s = tl.scenes[b];
  const p = line.phrases?.[Math.min(i, (line.phrases?.length ?? 1) - 1)] ?? line;
  return p.start - s.start;
}
export function phraseEnd(b, i = 0, tl = TL) {
  const line = tl.lines[b], s = tl.scenes[b];
  const p = line.phrases?.[Math.min(i, (line.phrases?.length ?? 1) - 1)] ?? line;
  return p.end - s.start;
}
/** 0..1 entrance from time a (beat-relative) over dur, times the overlay visibility */
export const enter = (v, a, dur = 0.6) => L.ease.outCubic(L.prog(v.t, a, dur)) * v.k;

/** Tracked uppercase text with a dark halo. align 'left'|'center'|'right'. Returns the width. */
export function text(c, str, x, y, { size = 18, weight = 700, color = INK, alpha = 1, track = 3, align = 'left', family = L.FONT.body, halo = 0.8 } = {}) {
  if (alpha <= 0.003) return 0;
  c.save();
  c.globalAlpha *= alpha;
  c.font = L.font(size, weight, family);
  c.textBaseline = 'middle';
  c.shadowColor = `rgba(2,6,12,${halo})`;
  c.shadowBlur = size * 0.6;
  c.fillStyle = L.rgba(color);
  const w = L.trackedText(c, str, x, y, track, align);
  c.shadowBlur = size * 0.25;
  L.trackedText(c, str, x, y, track, align);
  c.restore();
  return w;
}
/** A place label: NAME (and an optional smaller second line) centred on a point, no leader. */
export function place(c, name, x, y, k, { size = 18, sub = null, color = INK, track = 4 } = {}) {
  if (k <= 0) return;
  const dy = (1 - k) * 6;
  text(c, name, x, y + dy, { size, alpha: k, color, track, align: 'center' });
  if (sub) text(c, sub, x, y + size * 1.05 + dy, { size: Math.max(16, size * 0.78), weight: 600, alpha: k * 0.85, color: [190, 205, 220], track: 2, align: 'center' });
}
/** Callout: a ring on the anchor, a leader to (lx, ly), then the label beside it. side: 'right' | 'left'. */
export function callout(c, ax, ay, lx, ly, k, title, { sub = null, side = 'right', size = 20, color = INK, ring = 7, accent = ACCENT } = {}) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.5);
  c.strokeStyle = 'rgba(2,6,12,0.55)'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(L.lerp(ax, lx, e), L.lerp(ay, ly, e)); c.stroke();
  c.strokeStyle = L.rgba(INK, 0.85); c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(L.lerp(ax, lx, e), L.lerp(ay, ly, e)); c.stroke();
  if (ring > 0) {
    c.strokeStyle = 'rgba(2,6,12,0.55)'; c.lineWidth = 4.5;
    c.beginPath(); c.arc(ax, ay, ring, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = L.rgba(accent); c.lineWidth = 2;
    c.beginPath(); c.arc(ax, ay, ring, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
  const tx = lx + (side === 'right' ? 10 : -10);
  const ka = L.clamp((k - 0.35) / 0.65);
  text(c, title, tx, ly - (sub ? size * 0.45 : 0), { size, alpha: ka, color, align: side === 'right' ? 'left' : 'right' });
  if (sub) text(c, sub, tx, ly + size * 0.75, { size: Math.max(16, size * 0.8), weight: 600, alpha: ka * 0.9, color: [190, 205, 220], track: 2, align: side === 'right' ? 'left' : 'right' });
}
/** A dimension bracket between two screen points (ticks at the ends), label at the middle, offset along the normal. */
export function bracket(c, x0, y0, x1, y1, k, label, { tick = 10, size = 22, color = INK, accent = ACCENT, labelSide = 1, sub = null, upright = false } = {}) {
  if (k <= 0) return;
  const e = L.ease.inOutCubic(L.clamp(k));
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy * labelSide, ny = ux * labelSide;
  const a = { x: mx - ux * len / 2 * e, y: my - uy * len / 2 * e }, b = { x: mx + ux * len / 2 * e, y: my + uy * len / 2 * e };
  c.save();
  c.lineCap = 'round';
  for (const [w, col] of [[4.5, 'rgba(2,6,12,0.55)'], [2, L.rgba(accent)]]) {
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath();
    c.moveTo(a.x - nx * tick, a.y - ny * tick); c.lineTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(b.x - nx * tick, b.y - ny * tick);
    c.stroke();
  }
  c.restore();
  const ka = L.clamp((k - 0.5) / 0.5);
  if (ka <= 0) return;
  if (upright) {   // horizontal label beside the bracket's middle
    const al = nx >= 0 ? 'left' : 'right', lx = mx + nx * 16;
    text(c, label, lx, my - (sub ? size * 0.45 : 0), { size, alpha: ka, color, align: al });
    if (sub) text(c, sub, lx, my + size * 0.75, { size: Math.max(16, size * 0.75), weight: 600, alpha: ka * 0.9, color: [190, 205, 220], track: 2, align: al });
    return;
  }
  const off = size * 0.9 + 6;
  const lx = mx + nx * off, ly = my + ny * off;
  c.save();
  c.translate(lx, ly);
  let ang = Math.atan2(uy, ux), flip = 1;
  if (ang > Math.PI / 2) { ang -= Math.PI; flip = -1; } else if (ang < -Math.PI / 2) { ang += Math.PI; flip = -1; }
  c.rotate(ang);
  text(c, label, 0, 0, { size, alpha: ka, color, align: 'center', family: L.FONT.body, weight: 700 });
  if (sub) text(c, sub, 0, size * 1.05 * labelSide * flip, { size: Math.max(16, size * 0.75), weight: 600, alpha: ka * 0.9, color: [190, 205, 220], track: 2, align: 'center' });
  c.restore();
}
/** A tiny pin (dot + ring) at a screen point. */
export function pin(c, x, y, k, { r = 5, accent = ACCENT } = {}) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  c.fillStyle = 'rgba(2,6,12,0.6)'; c.beginPath(); c.arc(x, y, r + 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = L.rgba(accent); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = L.rgba([255, 255, 255]); c.beginPath(); c.arc(x, y, r * 0.4, 0, Math.PI * 2); c.fill();
  c.restore();
}
/** Is a screen point in the safe content box (HUD / ladder / top bar / chapter card excluded)? */
export function safe(x, y, card = true) {
  if (y < 110 || y > 1000 || x < 40 || x > 1630) return false;
  if (x < 610 && y < 215) return false;
  if (card && x < 900 && y > 870) return false;
  return true;
}
/** Smooth version of safe(): 1 well inside the content box, fading to 0 over `pad` px at its edges (no pops). */
export function safeK(x, y, pad = 50, card = true) {
  const d = Math.min(y - 110, 1000 - y, x - 40, 1630 - x);
  let k = L.clamp(d / pad);
  k *= L.clamp(1 - Math.min(610 - x, 215 - y) / pad);                 // the HUD box (depth inside it)
  if (card) k *= L.clamp(1 - Math.min(900 - x, y - 870) / pad);        // the chapter card zone
  return k;
}
