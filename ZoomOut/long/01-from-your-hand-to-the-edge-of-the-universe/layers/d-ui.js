// Builder D: label + timing helpers for beats 18–25 (house style: small tracked uppercase, thin leaders, dark halos).
import * as L from '../../../../engine/runtime/lib.js';

export const INKD = [236, 233, 226];
export const SUBC = [178, 192, 210];
export const GOLD = [255, 214, 150];

// The timeline, for cues(d) (which only receive the beat duration). Scenes' drawing code uses v.tl.
let TL = null;
try { TL = await (await fetch(new URL('../build/timeline.json', import.meta.url))).json(); } catch { TL = null; }
/** Phrase start/end (seconds since the beat start) for sound cues; `fb` if the timeline can't be read. */
export function phc(beat, i, fb, which = 'start') {
  if (!TL) return fb;
  return ph({ tl: TL }, beat, i, which);
}

/** Phrase start (seconds since the beat start) from the live timeline, so labels follow the words. */
export function ph(v, beat, i, which = 'start') {
  const s = v.tl.scenes[beat], p = v.tl.lines[beat]?.phrases?.[i];
  if (!s) return 0;
  if (!p) return which === 'start' ? 0 : s.end - s.start;
  return p[which] - s.start;
}
/** Beat-relative time of `beat` at the current global time. */
export const bt = (v, beat) => v.gt - v.tl.scenes[beat].start;

/** Tracked text with a dark halo (stroke + soft shadow), so it reads over anything. */
export function haloText(c, str, x, y, track, align, col, a = 1, size = 18, weight = 700, family = L.FONT.body) {
  c.save();
  c.font = L.font(size, weight, family);
  c.letterSpacing = `${track}px`;
  const w = c.measureText(str).width - track;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.textAlign = 'left';
  c.lineJoin = 'round';
  c.shadowColor = `rgba(0,0,0,${0.85 * a})`;
  c.shadowBlur = 10;
  c.strokeStyle = `rgba(2,4,9,${0.72 * a})`;
  c.lineWidth = Math.max(3, size * 0.22);
  c.strokeText(str, x0, y);
  c.shadowBlur = 0;
  c.fillStyle = L.rgba(col, a);
  c.fillText(str, x0, y);
  c.letterSpacing = '0px';
  c.restore();
  return w;
}

/**
 * Name tag with an elbow leader: object at (x, y), elbow at (lx, ly), text beyond it.
 * k: 0..1 (draws itself in). opts: align, col, sub, size, gap (px kept clear around the object).
 */
export function tag(c, x, y, lx, ly, text, k, { align = 'left', col = INKD, sub = '', size = 18, subSize = 16, gap = 7, lead = 22 } = {}) {
  if (k <= 0.002) return;
  const e = L.ease.outCubic(L.clamp(k));
  const dir = align === 'left' ? 1 : -1;
  const dx = lx - x, dy = ly - y, dl = Math.hypot(dx, dy) || 1;
  const sx = x + dx / dl * gap, sy = y + dy / dl * gap;
  c.save();
  c.globalAlpha *= L.clamp(k * 1.5);
  c.lineCap = 'round';
  const e1 = L.clamp(e * 1.6), e2 = L.clamp(e * 1.6 - 0.6);
  // dark under-stroke so the leader reads over bright regions
  for (const [w, s] of [[3.4, 'rgba(2,4,9,0.55)'], [1.4, L.rgba(col, 0.62)]]) {
    c.strokeStyle = s; c.lineWidth = w;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(L.lerp(sx, lx, e1), L.lerp(sy, ly, e1));
    if (e2 > 0) c.lineTo(lx + dir * lead * e2, ly);
    c.stroke();
  }
  if (e2 > 0) {
    const tx = lx + dir * (lead + 8);
    c.save();
    c.beginPath();
    const cw = 640 * e2;
    c.rect(align === 'left' ? tx - 8 : tx - cw, ly - 40, cw + 8, 90);
    c.clip();
    c.textBaseline = 'middle';
    haloText(c, text, tx, sub ? ly - 1 : ly, 2.4, align, col, 1, size, 700);
    if (sub) haloText(c, sub, tx, ly + size * 0.62 + subSize * 0.62 + 2, 1.4, align, SUBC, 0.95, subSize, 600);
    c.restore();
  }
  c.restore();
}

/** Thin ring around an object (opens up as k grows). */
export function ring(c, x, y, r, k, col = INKD, a = 0.75) {
  if (k <= 0.002) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.strokeStyle = L.rgba(col, a);
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(x, y, Math.max(0, r * (1.5 - 0.5 * e)), 0, Math.PI * 2); c.stroke();
  c.restore();
}

/** A measured line with end ticks between two screen points, drawn in from a to b. */
export function measure(c, ax, ay, bx, by, k, col = INKD, a = 0.8, tick = 7, dash = null) {
  if (k <= 0.002) return;
  const e = L.ease.inOutCubic(L.clamp(k));
  const ex = L.lerp(ax, bx, e), ey = L.lerp(ay, by, e);
  const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len;
  c.save();
  c.lineCap = 'round';
  if (dash) c.setLineDash(dash);
  for (const [w, s] of [[3.6, 'rgba(2,4,9,0.5)'], [1.5, L.rgba(col, a)]]) {
    c.strokeStyle = s; c.lineWidth = w;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke();
    c.setLineDash([]);
    c.beginPath(); c.moveTo(ax + nx * tick, ay + ny * tick); c.lineTo(ax - nx * tick, ay - ny * tick); c.stroke();
    if (e > 0.98) { c.beginPath(); c.moveTo(bx + nx * tick, by + ny * tick); c.lineTo(bx - nx * tick, by - ny * tick); c.stroke(); }
    if (dash) c.setLineDash(dash);
  }
  c.restore();
}

/** Display-size number + small caption (hero/secondary figures). */
export function figure(c, x, y, big, small, k, { align = 'left', size = 52, col = INKD, accent = GOLD } = {}) {
  if (k <= 0.002) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.textBaseline = 'alphabetic';
  haloText(c, big, x, y + (1 - e) * 14, 0.5, align, accent, 1, size, 800, L.FONT.display);
  if (small) haloText(c, small, x, y + 28, 2, align, col, 0.92, 17, 700);
  c.restore();
}

// ------------------------------------------------------------------ in-frame motion smear
// The renderer averages 4 sub-frames over a 1/60 s shutter, so during the fastest zooms point-like things strobe into
// dotted trails. These helpers give the camera at the start/end of this sub-frame's slice (1/240 s), so a layer can
// stretch or repeat what it draws across it.
import { at as camAt } from '../camera.js';
export const SLICE = 1 / 240;
export function sliceCams(v) {
  return [camAt(v.gt - SLICE / 2, v.tl), camAt(v.gt + SLICE / 2, v.tl)];
}
/** A view-like object for an arbitrary camera (wx/wy/cam). */
export function viewFor(v, cam) {
  return {
    ...v, cam,
    wx: (x) => L.W / 2 + (x - cam.x) / cam.mpp,
    wy: (y) => L.H * (cam.anchor ?? 0.5) + (y - cam.y) / cam.mpp,
  };
}
/** Cameras spread across this sub-frame's slice: more when the frame edge moves fast. */
export function smearCams(v, maxN = 6) {
  const [a, b] = sliceCams(v);
  const d = 1100 * Math.abs(Math.log(b.mpp / a.mpp)) + Math.hypot(b.x - a.x, b.y - a.y) / v.cam.mpp;
  const n = Math.max(1, Math.min(maxN, Math.round(d / 2.5)));
  if (n === 1) return [v.cam];
  const out = [];
  for (let j = 0; j < n; j++) {
    const f = (j + 0.5) / n;
    out.push({ ...v.cam, x: L.lerp(a.x, b.x, f), y: L.lerp(a.y, b.y, f), mpp: Math.exp(L.lerp(Math.log(a.mpp), Math.log(b.mpp), f)) });
  }
  return out;
}
