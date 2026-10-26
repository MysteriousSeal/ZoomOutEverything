// Beat 4 — "It would be just 1,385 km across." The ALL ball (every drop of water) settles beside Earth,
// wobbling like a liquid, then a diameter line + bracket measure it.
//
// Ownership of the persistent water balls (pure functions of global time):
//   s04 draws the ALL ball from beat 4's start until beat 7's start (s03 forms it before beat 4).
//   s07 draws ALL from beat 7 on (it drains to a glass ghost, then refills a little for the beat-12 recap)
//       and the liquid-fresh-water core while it separates.
//   s08 draws the FRESH ball from beat 8 to the end of the film.
// This file also exports the shared glassy water-ball renderer and the horizontal dimension used by s05–s08.
import * as L from '../../../../engine/runtime/lib.js';
import { ALL } from '../camera.js';
import { SUN_DIR } from '../env.js';

export const DEEP = [26, 92, 196];       // the ALL ball: deep ocean blue
export const FRESHC = [46, 168, 238];    // liquid fresh water: clearer, brighter cyan
export const ICE = [215, 235, 250];
export const B = (v, i) => v.tl.scenes[i].start;   // global start of beat i

/** Liquid wobble amplitude for the ALL ball at global time gt (settles after it forms). */
export function allWobble(v) {
  const a = v.gt - B(v, 4);
  return 0.006 + 0.03 * Math.exp(-Math.max(0, a) / 0.9) * L.clamp(1 - a / 4);
}

const CAUSTIC = (() => { const q = L.rng(4404); return Array.from({ length: 9 }, () => [q(), q(), q(), q() * 6.28]); })();

function ballPath(c, cx, cy, r, wob, t, seed, n) {
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const k = 1 + wob * (0.62 * Math.sin(2 * th + t * 2.3 + seed) + 0.38 * Math.sin(3 * th - t * 3.1 + seed * 2.1));
    const x = cx + Math.cos(th) * r * k, y = cy + Math.sin(th) * r * k;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}

/**
 * Glassy water sphere in world space.
 *   base: body colour · alpha: overall · level 0..1: how full (draining) · shell: glass-shell visibility when drained
 *   wob: surface oscillation (fraction of r) · glow: outer halo · stretch: {ang, s} squash along a direction
 */
export function waterBall(c, v, x, y, d, o = {}) {
  const { base = DEEP, alpha = 1, level = 1, shell = 0.5, wob = 0.006, seed = 1, glow = 0.18, stretch = null, sx, sy } = o;
  if (alpha <= 0.002) return;
  const cx = sx ?? v.wx(x), cy = sy ?? v.wy(y), r = Math.max(0.6, v.ws(d / 2));
  if (cx + r * 1.8 < 0 || cx - r * 1.8 > L.W || cy + r * 1.8 < 0 || cy - r * 1.8 > L.H) return;
  const t = v.gt;
  c.save();
  c.globalAlpha *= alpha;
  if (glow > 0) L.lightBlob(c, cx, cy, r * 1.7 + 6, L.mix(base, [140, 210, 255], 0.4), glow);
  if (r < 3) {   // far LOD: a bright dot
    c.fillStyle = L.rgba(L.mix(base, [255, 255, 255], 0.35));
    c.beginPath(); c.arc(cx, cy, Math.max(0, r + 0.6), 0, Math.PI * 2); c.fill();
    c.restore();
    return;
  }
  if (stretch) {
    c.translate(cx, cy); c.rotate(stretch.ang); c.scale(stretch.s, 1 / stretch.s); c.rotate(-stretch.ang); c.translate(-cx, -cy);
  }
  const n = r > 120 ? 120 : r > 30 ? 64 : 28;
  const lx = cx + SUN_DIR.x * r * 0.5, ly = cy + SUN_DIR.y * r * 0.5;   // lit point
  const bx = cx - SUN_DIR.x * r * 0.42, by = cy - SUN_DIR.y * r * 0.42; // back-glow (light through the water)

  // ---- water body (optionally only below a falling surface)
  const lv = L.clamp(level);
  const surfY = cy + r - 2 * r * lv;
  if (lv > 0.001) {
    c.save();
    ballPath(c, cx, cy, r, wob, t, seed, n);
    c.clip();
    if (lv < 0.999) {
      c.beginPath();
      c.moveTo(cx - r * 1.2, cy + r * 1.2);
      for (let i = 0; i <= 24; i++) {
        const xx = cx - r * 1.2 + (i / 24) * r * 2.4;
        c.lineTo(xx, surfY + Math.sin(i * 0.9 + t * 4) * r * 0.012 * lv);
      }
      c.lineTo(cx + r * 1.2, cy + r * 1.2);
      c.closePath();
      c.clip();
    }
    const g = c.createRadialGradient(lx, ly, r * 0.04, cx, cy, r * 1.04);
    g.addColorStop(0, L.rgba(L.mix(base, [255, 255, 255], 0.42)));
    g.addColorStop(0.35, L.rgba(L.mix(base, [255, 255, 255], 0.08)));
    g.addColorStop(0.75, L.rgba(L.mix(base, [0, 8, 30], 0.45)));
    g.addColorStop(1, L.rgba(L.mix(base, [0, 4, 18], 0.78)));
    c.fillStyle = g;
    c.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
    c.globalCompositeOperation = 'lighter';
    // light transmitted through the water: a soft crescent glow on the far side
    const bg = c.createRadialGradient(bx, by, 0, bx, by, r * 0.75);
    bg.addColorStop(0, L.rgba(L.mix(base, [150, 230, 255], 0.5), 0.32));
    bg.addColorStop(1, L.rgba(base, 0));
    c.fillStyle = bg;
    c.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
    // caustic shimmer: soft dapples of refracted sunlight drifting inside, strongest on the far side
    if (r > 28) {
      for (let i = 0; i < CAUSTIC.length; i++) {
        const [u, w, s, ph] = CAUSTIC[i];
        const px = bx + (u - 0.5) * r * 1.2 + Math.sin(t * 0.35 + ph) * r * 0.06;
        const py = by + (w - 0.5) * r * 1.2 + Math.cos(t * 0.3 + ph) * r * 0.06;
        const dd = Math.hypot(px - cx, py - cy) / r;
        if (dd > 0.9) continue;
        const al = (0.07 + 0.05 * Math.sin(t * 0.9 + ph * 3)) * (1 - dd * 0.7);
        const rr = r * (0.1 + s * 0.16);
        const cg = c.createRadialGradient(px, py, 0, px, py, rr);
        cg.addColorStop(0, L.rgba([170, 230, 255], al));
        cg.addColorStop(1, L.rgba([170, 230, 255], 0));
        c.fillStyle = cg;
        c.fillRect(px - rr, py - rr, rr * 2, rr * 2);
      }
      // internal reflection: thin bright arcs hugging the far-side rim
      const ang = Math.atan2(-SUN_DIR.y, -SUN_DIR.x);
      c.lineCap = 'round';
      for (const [f, span, al] of [[0.9, 0.7, 0.22], [0.82, 0.45, 0.1]]) {
        c.strokeStyle = L.rgba([190, 240, 255], al);
        c.lineWidth = Math.max(1, r * (f > 0.85 ? 0.012 : 0.008));
        c.beginPath(); c.arc(cx, cy, Math.max(0, r * f), ang - span + Math.sin(t * 0.5) * 0.05, ang + span); c.stroke();
      }
    }
    // water surface seen slightly from above while draining
    if (lv < 0.999) {
      const hw = Math.sqrt(Math.max(0, r * r - (surfY - cy) * (surfY - cy)));
      c.fillStyle = L.rgba(L.mix(base, [200, 240, 255], 0.5), 0.35);
      c.beginPath(); c.ellipse(cx, surfY, Math.max(0, hw), Math.max(0, hw * 0.13), 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
  // ---- glass shell (visible where drained) + fresnel rim
  const shellA = lv < 0.999 ? shell : 1;
  c.save();
  ballPath(c, cx, cy, r, wob, t, seed, n);
  c.clip();
  const fr = c.createRadialGradient(cx, cy, r * 0.78, cx, cy, r * 1.02);
  fr.addColorStop(0, L.rgba([140, 210, 255], 0));
  fr.addColorStop(0.8, L.rgba([150, 215, 255], 0.16 * shellA));
  fr.addColorStop(1, L.rgba([190, 235, 255], 0.42 * shellA));
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = fr;
  c.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
  c.restore();
  c.strokeStyle = L.rgba([170, 225, 255], 0.22 * shellA);
  c.lineWidth = Math.max(1, r * 0.006);
  ballPath(c, cx, cy, r, wob, t, seed, n);
  c.stroke();
  // lit rim arc
  c.strokeStyle = L.rgba([200, 238, 255], 0.6 * shellA);
  c.lineWidth = Math.max(1.2, r * 0.012);
  c.beginPath(); c.arc(cx, cy, Math.max(0, r * (1 - wob * 0.3) - c.lineWidth / 2), Math.PI * 0.95, Math.PI * 1.55); c.stroke();
  // ---- specular highlights
  if (r > 6) {
    const hx = cx + SUN_DIR.x * r * 0.55, hy = cy + SUN_DIR.y * r * 0.55;
    L.lightBlob(c, hx, hy, r * 0.42, [255, 255, 255], 0.22 * shellA);
    c.save();
    c.translate(hx, hy);
    c.rotate(Math.atan2(SUN_DIR.y, SUN_DIR.x) + Math.PI / 2);
    const sg = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.16);
    sg.addColorStop(0, `rgba(255,255,255,${0.75 * shellA})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sg;
    c.scale(1, 0.48);
    c.beginPath(); c.arc(0, 0, r * 0.16, 0, Math.PI * 2); c.fill();
    c.restore();
    // small secondary glint, lower right
    L.lightBlob(c, cx - SUN_DIR.x * r * 0.7, cy - SUN_DIR.y * r * 0.7, r * 0.1, [200, 240, 255], 0.3 * shellA * lv);
  }
  c.restore();
}

/** Horizontal measuring bracket from x0 to x1 at y, drawn out from the middle; label under (or above) it. */
export function hDim(c, x0, x1, y, k, color, label = '', { above = false, tick = 14, size = 30 } = {}) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const m = (x0 + x1) / 2, a = L.lerp(m, x0, e), b = L.lerp(m, x1, e);
  const dir = above ? 1 : -1;   // ticks point toward the object
  c.save();
  c.strokeStyle = L.rgba(color, 0.9);
  c.lineWidth = 2.5;
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = 6;
  c.beginPath();
  c.moveTo(a, y + dir * tick); c.lineTo(a, y); c.lineTo(b, y); c.lineTo(b, y + dir * tick);
  c.stroke();
  if (label) {
    c.globalAlpha *= L.clamp(k * 2 - 0.8);
    c.font = L.font(size, 700, L.FONT.body);
    c.fillStyle = L.rgba(color);
    c.textBaseline = above ? 'alphabetic' : 'top';
    L.trackedText(c, label, m, above ? y - 12 : y + 12, 2, 'center');
  }
  c.restore();
}

/** Dashed diameter line through a sphere (screen coords), drawn out from the centre. */
export function diameter(c, cx, cy, r, k, color = [210, 235, 255], alpha = 1) {
  if (k <= 0 || alpha <= 0) return;
  const e = L.ease.inOutCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= alpha;
  c.strokeStyle = L.rgba(color, 0.7);
  c.lineWidth = 2;
  c.setLineDash([10, 8]);
  c.lineDashOffset = 0;
  c.beginPath(); c.moveTo(cx - r * e, cy); c.lineTo(cx + r * e, cy); c.stroke();
  c.setLineDash([]);
  c.fillStyle = L.rgba(color, 0.95);
  c.strokeStyle = L.rgba(color, 0.9);
  c.lineWidth = 2.5;
  for (const s of [-1, 1]) {
    c.beginPath(); c.arc(cx + s * r * e, cy, 4.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(cx + s * r * e, cy - 16 * e); c.lineTo(cx + s * r * e, cy + 16 * e); c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- beat 4
const T_DIM = 1.9;     // diameter draws while "one thousand three hundred…" is spoken
const T_LABEL = 2.2;

export default {
  beat: 4,
  chapter: { num: '04', title: 'Every drop, one ball', sub: 'All of Earth’s water' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.15, name: 'swell', gain: 0.28, pitch: 0.8 },
      { t: 0.5, name: 'bubbles', gain: 0.2, pitch: 0.7 },
      { t: T_DIM, name: 'tick', gain: 0.3, pitch: 1.1 },
      { t: T_LABEL + 0.05, name: 'impact', gain: 0.38, pitch: 0.9 },
      { t: T_LABEL + 0.15, name: 'shimmer', gain: 0.22, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.gt < B(v, 4) || v.gt >= B(v, 7)) return;   // s03 before, s07 after
    waterBall(ctx, v, ALL.x, ALL.y, ALL.d, { base: DEEP, wob: allWobble(v), seed: 1.3, glow: 0.2 });
  },

  drawOverlay(ctx, v) {
    const cx = v.wx(ALL.x), cy = v.wy(ALL.y), r = v.ws(ALL.d / 2);
    // the line fades out with the beat (endpoints and all) instead of retracting into a dot at the centre
    diameter(ctx, cx, cy, r, L.prog(v.t, T_DIM, 0.8), undefined, v.k);
    const k = L.enter(v.t, T_LABEL, 0.55) * v.k;
    L.bigLabel(ctx, { x: L.W / 2, y: L.clamp(cy - r - 92, 470, 560), big: '1,385 km', small: '860 mi · every drop of water', k, accent: v.accent, align: 'center' });
  },
};
