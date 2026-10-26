// Beat 10 — "But here's the twist: | the Moon is already slowly leaving us."
// The camera pulls out from the globe to the Earth–Moon system at true scale. A thin locator ring marks the spot and
// on "the Moon" the true-size Moon (0.27 x Earth, lit from the Sun, lower-left) fades back in over 0.4 s; its orbit ring sweeps around
// from it, then a dimension line runs Earth to Moon and "384,400 km" lands beside it.
// This scene draws the Moon, its orbit and the Earth/Moon name tags through beat 11 (they clear over the first
// 0.5 s of beat 12, see systemOut);
// s11/s12 import the geometry helpers below.
import * as L from '../../../../engine/runtime/lib.js';
import { EARTH, MOON, MOON_DIR, SUN_DIR, R_EARTH, R_MOON, D_MOON, globePx } from '../env.js';
import { bigBox } from './s11-3-8-cm.js';   // the beat-11 number's box (the distance line breaks under it)

const TAU = Math.PI * 2;
const MOON_GREY = [214, 214, 208];
/**
 * Beat-local timing (s). "twist" ~1.1 · the Moon enters the frame (upper right) ~1.45 · camera lands ~2.05 ·
 * "the Moon is already slowly leaving us" runs 1.99-4.11.
 * On "twist" a beam runs out of Earth toward the (still off-screen) Moon and the faint orbit hint fades up, so the
 * pull-out always has a destination; the Moon's beacon pulses from the moment it is in frame.
 */
export const T10 = { hint: 1.0, flare: 1.45, moon: 1.9, ring: [2.05, 1.6], line: [2.7, 0.75], label: 3.0 };
/** Label nudge (px, +x) so the big numbers sit mostly to the right of the Earth-Moon line. */
export const LABEL_DX = 40;

/** Global start of beat i. */
export const beatStart = (v, i) => v.tl.scenes[i].start;

/** Screen geometry of the system: Earth centre, Moon centre, orbit radius (px), unit Earth->Moon, its normal. */
export function sys(v) {
  const g = globePx(v);
  const mx = v.wx(MOON.x), my = v.wy(MOON.y);
  const R = v.ws(D_MOON);
  return { ex: g.cx, ey: g.cy, er: g.r, mx, my, mr: v.ws(R_MOON), R, u: MOON_DIR, n: { x: -MOON_DIR.y, y: MOON_DIR.x } };
}

/** Where label slots sit: beside the middle of the Earth-Moon line, on its lower-right side (screen px). */
export function labelSlot(v, off = 150) {
  const s = sys(v);
  const mx = (s.ex + s.mx) / 2, my = (s.ey + s.my) / 2;
  // normal pointing lower-right
  const nx = s.n.x, ny = s.n.y;
  return { x: mx + nx * off, y: my + ny * off };
}

/** The true-size Moon: a lit sphere (Sun to the lower-left) with a soft halo so a 4 px disc still reads. */
export function drawMoon(c, v, { x, y, k = 1, flare = 0 }) {
  if (k <= 0) return;
  const rt = v.ws(R_MOON);
  const r = Math.max(4, rt);
  c.save();
  c.globalAlpha *= k;
  // true size (0.27 x Earth): only a faint halo and a thin locator ring, so it never reads bigger than the Earth
  L.lightBlob(c, x, y, r * 5 + 14, [220, 228, 245], 0.16 + 0.1 * flare);
  c.strokeStyle = `rgba(200,215,255,${0.32 + 0.15 * flare})`;
  c.lineWidth = 1.2;
  c.beginPath(); c.arc(x, y, Math.max(0, r + 9), 0, TAU); c.stroke();
  // a dark backing so the night half reads as a sphere (kept faint while fading in, so it never reads as a hole)
  c.save();
  c.globalAlpha *= k * k;
  c.fillStyle = '#0b0d12';
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();
  c.restore();
  const g = c.createRadialGradient(x + SUN_DIR.x * r * 0.5, y + SUN_DIR.y * r * 0.5, 0, x, y, r * 1.05);
  g.addColorStop(0, L.rgba([250, 250, 244]));
  g.addColorStop(0.55, L.rgba(MOON_GREY));
  g.addColorStop(1, L.rgba([92, 94, 102]));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();
  c.restore();
}

/** An arc of the orbit, stroked as a soft triple line (glow, body, core), from angle a0 sweeping by `span`. */
export function orbitArc(c, x, y, R, a0, span, alpha, col = [175, 195, 255], dash = null) {
  if (alpha <= 0 || R <= 0 || Math.abs(span) < 1e-4) return;
  c.save();
  c.lineCap = 'round';
  if (dash) c.setLineDash(dash);
  const a1 = a0 + span;
  for (const [w, al] of [[7, 0.05], [3, 0.12], [1.4, 0.55]]) {
    // transparent in the HUD band (y < 290), fully in below y 370: the orbit never crosses the chapter title
    const sg = c.createLinearGradient(0, 290, 0, 370);
    sg.addColorStop(0, L.rgba(col, 0)); sg.addColorStop(1, L.rgba(col, al * alpha));
    c.strokeStyle = sg;
    c.lineWidth = w;
    c.beginPath(); c.arc(x, y, Math.max(0, R), Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
  }
  c.restore();
}

/** 0..1: how much of the beat-10 dressing (orbit, Moon) is in; persists to the end of the film. */
function moonIn(v) {
  const t = v.gt - beatStart(v, 10);
  return L.ease.outCubic(L.prog(t, T10.moon, 0.4));   // a plain 0.4 s fade-in (no flare pop)
}

/** Parameter interval [t0, t1] (0..1 along a->b) inside the rectangle, or null (Liang-Barsky). */
function clipSeg(ax, ay, bx, by, r) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  for (const [p, q] of [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dy, ay - r.y0], [dy, r.y1 - ay]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
    const u = q / p;
    if (p < 0) t0 = Math.max(t0, u); else t1 = Math.min(t1, u);
  }
  return t0 < t1 ? [t0, t1] : null;
}

/** Box (screen px) of the "384,400 km" label, with its visibility k. */
function distBox(c, v) {
  const t = v.gt - beatStart(v, 10);
  const k = L.clamp(L.enter(t, T10.label, 0.55) * (1 - L.prog(v.gt, v.tl.scenes[10].end, 0.5)));
  if (k <= 0) return null;
  const p = labelSlot(v);
  const x = p.x + LABEL_DX;
  c.save();
  c.font = L.font(104, 800, L.FONT.display);
  c.letterSpacing = '-1px';
  const w1 = c.measureText('384,400 km').width;
  c.font = L.font(30, 600, L.FONT.body);
  c.letterSpacing = '3px';
  const w2 = c.measureText('238,900 MI · EARTH TO MOON').width;
  c.restore();
  const w = Math.max(w1, w2) / 2 + 16;
  return { x0: x - w, x1: x + w, y0: p.y - 92, y1: p.y + 70, k };
}

/** The Earth-Moon distance line (limb to limb) with end ticks, drawn outward from Earth by k. It breaks (fades out)
 * where it passes under the big labels, so no number is ever struck through. */
function distLine(c, v, k, alpha) {
  if (k <= 0 || alpha <= 0) return;
  const s = sys(v);
  if (s.er > 40) return;   // only once the Earth is small: no line smeared across the pull-out
  const ax = s.ex + s.u.x * (s.er + 10), ay = s.ey + s.u.y * (s.er + 10);
  const bx = s.mx - s.u.x * 12, by = s.my - s.u.y * 12;
  const e = L.ease.inOutCubic(k);
  const hx = L.lerp(ax, bx, e), hy = L.lerp(ay, by, e);
  const len = Math.hypot(bx - ax, by - ay);
  // gaps: [t0, t1, k] for each label box crossing the line
  const gaps = [];
  for (const bx0 of [distBox(c, v), bigBox(c, v)]) {
    if (!bx0) continue;
    const g = clipSeg(ax, ay, bx, by, bx0);
    if (g) gaps.push([g[0], g[1], bx0.k]);
  }
  const cuts = [0, e];
  for (const [g0, g1] of gaps) { if (g0 < e) cuts.push(g0); if (g1 < e) cuts.push(g1); }
  cuts.sort((p, q) => p - q);
  c.save();
  c.globalAlpha *= alpha;
  c.strokeStyle = 'rgba(205,215,240,0.55)';
  c.lineWidth = 1.5;
  c.setLineDash([2, 6]);
  const base = c.globalAlpha;
  for (let i = 0; i < cuts.length - 1; i++) {
    const u0 = cuts[i], u1 = cuts[i + 1];
    if (u1 - u0 < 1e-4) continue;
    const um = (u0 + u1) / 2;
    let w = 1;
    for (const [g0, g1, gk] of gaps) if (um > g0 && um < g1) w *= 1 - L.ease.inOutCubic(gk);
    if (w <= 0.01) continue;
    c.globalAlpha = base * w;
    c.lineDashOffset = -(u0 * len) % 8;
    c.beginPath(); c.moveTo(L.lerp(ax, bx, u0), L.lerp(ay, by, u0)); c.lineTo(L.lerp(ax, bx, u1), L.lerp(ay, by, u1)); c.stroke();
  }
  c.globalAlpha = base;
  c.setLineDash([]);
  // end ticks (perpendicular)
  c.strokeStyle = 'rgba(205,215,240,0.8)';
  c.lineWidth = 2;
  const tick = (x, y, kk) => {
    if (kk <= 0) return;
    const h = 9 * L.ease.outBack(L.clamp(kk));
    c.beginPath(); c.moveTo(x - s.n.x * h, y - s.n.y * h); c.lineTo(x + s.n.x * h, y + s.n.y * h); c.stroke();
  };
  tick(ax, ay, k * 4);
  tick(bx, by, (k - 0.92) * 12);
  if (k < 1) L.lightBlob(c, hx, hy, 18, [210, 222, 255], 0.6 * Math.sin(Math.PI * k));
  c.restore();
}

/** On "twist": a beam runs out of Earth along the Earth-Moon line toward the off-screen Moon, then hands over. */
function hintBeam(c, v, t) {
  const p = L.prog(t, T10.hint, 0.9);
  const out = 1 - L.ease.inOutCubic(L.prog(t, T10.moon + 0.1, 0.6));
  if (p <= 0 || out <= 0) return;
  const s = sys(v);
  const ax = s.ex + s.u.x * (s.er + 8), ay = s.ey + s.u.y * (s.er + 8);
  // run toward the Moon, never past it (and never further than off the frame)
  const full = Math.min(Math.hypot(s.mx - ax, s.my - ay) - 14, 2600);
  if (full <= 0) return;
  const e = L.ease.outCubic(p);
  const L1 = full * e;
  const hx = ax + s.u.x * L1, hy = ay + s.u.y * L1;
  c.save();
  c.globalAlpha *= out;
  const g = c.createLinearGradient(ax, ay, hx, hy);
  g.addColorStop(0, 'rgba(205,215,240,0.12)'); g.addColorStop(1, 'rgba(220,230,255,0.85)');
  c.strokeStyle = g;
  c.lineWidth = 1.8;
  c.setLineDash([2, 6]);
  c.lineDashOffset = -v.gt * 30;
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(hx, hy); c.stroke();
  c.setLineDash([]);
  // the head: a travelling glow while it runs out
  L.lightBlob(c, hx, hy, 14, [210, 222, 255], 0.4 * (1 - 0.6 * e) + 0.1);
  c.restore();
}

/** 1 → 0 over the first 0.5 s of beat 12: the Earth-Moon dressing (orbit, Moon, tags, rings) clears for the
 *  fingernail comparison, so nothing ghosts behind it or the closing card. */
export function systemOut(v) {
  return 1 - L.ease.inOutCubic(L.prog(v.gt - beatStart(v, 12), 0.0, 0.5));
}

/** Small tracked name tag (screen space). */
export function nameTag(c, str, x, y, k, align = 'left') {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.font = L.font(19, 600, L.FONT.body);
  c.fillStyle = 'rgba(215,224,240,0.85)';
  c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 8;
  c.textBaseline = 'middle';
  L.trackedText(c, str, x + (1 - L.ease.outCubic(L.clamp(k))) * (align === 'left' ? -8 : 8), y, 4, align);
  c.restore();
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'Leaving', sub: 'the Moon is drifting away' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.12, name: 'deep', gain: 0.32, pitch: 0.7 },
      { t: 0.2, name: 'swell', gain: 0.22, pitch: 0.8 },
      { t: T10.flare - 0.05, name: 'shimmer', gain: 0.3, pitch: 1.1 },
      { t: T10.moon + 0.1, name: 'ping', gain: 0.3, pitch: 0.9 },
      { t: T10.ring[0], name: 'swish', gain: 0.22, pitch: 0.8 },
      { t: T10.line[0], name: 'tick', gain: 0.22, pitch: 1.2 },
      { t: T10.label, name: 'impact', gain: 0.36, pitch: 0.8 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0.5) return;
    const s = sys(v);
    const t = v.t;
    if (t < T10.moon + 0.8) hintBeam(ctx, v, t);
    // cull: nothing else to draw until the system is (almost) in frame
    if (s.R > 6000) return;
    const so = systemOut(v);
    if (so <= 0) return;
    ctx.save();
    ctx.globalAlpha *= so;
    const mk = moonIn(v);
    // a faint, whole orbit hint from "twist": the frame has a destination before the ring sweeps in
    const hk = 0.16 * L.ease.inOutCubic(L.prog(t, T10.hint, 0.8)) * (1 - L.prog(t, T10.ring[0] + T10.ring[1], 0.4));
    if (hk > 0) orbitArc(ctx, s.ex, s.ey, s.R, 0, TAU, hk);
    // the orbit ring sweeps both ways around from the Moon and meets on the far side
    const rk = L.ease.inOutCubic(L.prog(t, T10.ring[0], T10.ring[1]));
    if (rk > 0) {
      const am = Math.atan2(s.u.y, s.u.x);
      const a = 0.85;
      orbitArc(ctx, s.ex, s.ey, s.R, am, Math.PI * rk, a);
      orbitArc(ctx, s.ex, s.ey, s.R, am, -Math.PI * rk, a);
      if (rk < 1) {
        for (const sg of [1, -1]) {
          const ah = am + sg * Math.PI * rk;
          L.lightBlob(ctx, s.ex + s.R * Math.cos(ah), s.ey + s.R * Math.sin(ah), 26, [200, 215, 255], 0.55 * Math.sin(Math.PI * rk));
        }
      }
    }
    // distance line: in for beats 10-11 (cleared with the rest by systemOut)
    distLine(ctx, v, L.prog(t, T10.line[0], T10.line[1]), 1);
    // the Moon itself: before the disc is in, a thin locator ring marks where it will be (so the pull-out has a
    // destination); the true-size disc then simply fades in over 0.4 s, with a slow breathing of its faint halo
    const fl = L.prog(t, T10.flare, 0.5);
    const flare = 0.5 * (0.5 + 0.5 * Math.sin(v.gt * 1.3)) * mk;
    if (fl > 0 && mk < 1) {
      ctx.save();
      ctx.strokeStyle = `rgba(200,215,255,${0.4 * L.ease.outCubic(fl) * (1 - mk)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(s.mx, s.my, Math.max(0, Math.max(4, s.mr) + 9), 0, TAU); ctx.stroke();
      ctx.restore();
    }
    drawMoon(ctx, v, { x: s.mx, y: s.my, k: mk, flare });
    // name tags, here (not in the overlay) so they stay with the bodies through beat 11. "MOON" sits just INSIDE
    // the orbit, lower-left of the Moon and left of the distance line, so no orbit, ring or ghost Moon crosses it
    nameTag(ctx, 'MOON', s.mx - 36, s.my + 14, L.enter(t, T10.moon + 0.35, 0.5), 'right');
    nameTag(ctx, 'EARTH', s.ex + s.er + 16, s.ey + 30, L.enter(t, T10.moon + 0.5, 0.5));
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    // the distance
    const k = v.k * L.enter(t, T10.label, 0.55);
    if (k <= 0) return;
    const p = labelSlot(v);
    ctx.save();
    ctx.globalAlpha = L.clamp(k);
    ctx.translate(p.x + LABEL_DX, p.y - 30);
    ctx.scale(1, 0.45);
    L.lightBlob(ctx, 0, 0, 330, [2, 4, 10], 0.7);
    ctx.restore();
    L.bigLabel(ctx, { x: p.x + LABEL_DX, y: p.y, big: '384,400 km', small: '238,900 mi · Earth to Moon', k, accent: v.accent, align: 'center', size: 104 });
  },
};

export { R_EARTH, EARTH };
