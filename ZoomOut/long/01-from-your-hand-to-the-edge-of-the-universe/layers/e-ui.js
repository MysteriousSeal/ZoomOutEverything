// Builder E: house-style labels for beats 26–35 (small tracked uppercase, thin leaders, dark halos).
import * as L from '../../../../engine/runtime/lib.js';

export const INK = [235, 232, 225];
export const SUB = [175, 190, 210];
export const GOLD = [255, 222, 150];
export const ORANGE = [255, 160, 70];
export const ACCENT = [90, 220, 235];

/** Phrase start (seconds since the beat's start) from the live timeline. */
export function ph(v, beat, i = 0) {
  const ln = v.tl.lines[beat], s = v.tl.scenes[beat].start;
  const p = ln.phrases ? ln.phrases[Math.min(i, ln.phrases.length - 1)] : ln;
  return p.start - s;
}
/** Seconds since beat `b` started (global time). */
export const since = (v, b) => v.gt - v.tl.scenes[b].start;
/** Fade-in at t0 over dur, eased. */
export const kin = (t, t0, dur = 0.5) => L.ease.outCubic(L.prog(t, t0, dur));
/** Decorations fade out as the rush back (beat 35) starts. */
export const decoK = (v) => 1 - L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[35].start + 0.05, 0.35));

/** One line of tracked text with a dark halo. Returns its width. */
export function text(c, s, x, y, { size = 20, weight = 700, color = INK, alpha = 1, track = 3, align = 'left', family = L.FONT.body } = {}) {
  if (alpha <= 0) return 0;
  c.save();
  c.globalAlpha *= alpha;
  c.font = L.font(size, weight, family);
  c.textBaseline = 'alphabetic';
  c.fillStyle = L.rgba(color);
  c.shadowColor = 'rgba(0,0,0,0.92)';
  c.shadowBlur = Math.max(6, size * 0.45);
  const w = L.trackedText(c, s, x, y, track, align);
  c.shadowBlur = Math.max(3, size * 0.2);
  L.trackedText(c, s, x, y, track, align);
  c.restore();
  return w;
}

/**
 * A callout: a small ring on the target, a thin leader (with a dark under-stroke) to an elbow, then the label lines.
 * lines: [{ s, size, weight, color }]. side: 'right' | 'left' (text side). k: 0..1.
 */
export function callout(c, ax, ay, lx, ly, lines, k, { side = 'right', ring = 6, color = INK, ringColor = null, leader = true } = {}) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.3);
  if (leader) {
    const ex = lx + (side === 'right' ? -10 : 10);
    const mx = L.lerp(ax, ex, e), my = L.lerp(ay, ly, e);
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(mx, my); c.stroke();
    c.strokeStyle = L.rgba(color, 0.8); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(mx, my); c.stroke();
  }
  if (ring > 0) {
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3.5;
    c.beginPath(); c.arc(ax, ay, ring, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = L.rgba(ringColor ?? color, 0.9); c.lineWidth = 1.6;
    c.beginPath(); c.arc(ax, ay, ring, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
  let y = ly;
  const a = L.clamp((k - 0.25) / 0.6);
  lines.forEach((ln, i) => {
    const size = ln.size ?? (i === 0 ? 21 : 17);
    if (i > 0) y += size + 9;
    else y += size * 0.36;
    text(c, ln.s, lx, y + (1 - a) * 6, { size, weight: ln.weight ?? (i === 0 ? 700 : 600), color: ln.color ?? (i === 0 ? INK : SUB), alpha: a * (ln.alpha ?? 1), track: ln.track ?? (i === 0 ? 3 : 2), align: side === 'right' ? 'left' : 'right' });
  });
}

/** Keep a label anchor inside the content box. */
export function clampBox(x, y, x0 = 150, x1 = 1610, y0 = 120, y1 = 860) { return [L.clamp(x, x0, x1), L.clamp(y, y0, y1)]; }

/** 1 well inside the content box, fading to 0 within `m` px outside it (no pops). */
export function boxK(x, y, m = 60, x0 = 150, x1 = 1610, y0 = 115, y1 = 870) {
  const d = Math.min(x - x0, x1 - x, y - y0, y1 - y);
  return L.smoothstep(L.clamp((d + m) / m));
}
