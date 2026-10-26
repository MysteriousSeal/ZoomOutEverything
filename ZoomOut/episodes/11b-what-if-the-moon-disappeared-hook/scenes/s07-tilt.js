// Beat 7 — "The Moon also steadies Earth's tilt, | the reason we have seasons."
// Earth's axis draws in through the poles at 23.4° from the vertical (the orbit normal, a dashed reference line),
// with polar ticks, a faint tilted equator and a thin arc between the vertical and the axis. Today's range
// (22.1°–24.5°) opens as a narrow accent wedge around the axis, and the axis breathes gently inside it: steadied.
// Label "23.4°" · "today: 22.1°–24.5°".
// Exports drawAxis() (also used by s08, and importable by s09) and steadyTilt().
import * as L from '../../../../engine/runtime/lib.js';
import { globePx, globeView } from '../env.js';
import { project } from '../../../../engine/runtime/earth.js';
import { wordAt, globeOk } from './s04-tides.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
export const TILT = 23.4;
export const TODAY = [22.1, 24.5];

/** Today's tilt with a gentle, steadied breathing inside today's range (degrees), at global time gt. */
export const steadyTilt = (gt) => TILT + 0.75 * Math.sin(gt * 1.4) + 0.2 * Math.sin(gt * 3.1 + 1);

/** Screen angle (radians) of the north axis for a tilt in degrees (positive = north pole leans right, like s09). */
const northAng = (deg) => -Math.PI / 2 + deg * DEG;

function sector(c, cx, cy, r0, r1, a0, a1) {
  c.beginPath();
  c.arc(cx, cy, Math.max(0, r1), a0, a1, a1 < a0);
  c.arc(cx, cy, Math.max(0, r0), a1, a0, !(a1 < a0));
  c.closePath();
}

/**
 * Earth's spin axis on the globe (world-anchored via globePx), all in screen space.
 *   tilt    degrees from the vertical (positive: north pole leans right, south end to the lower left)
 *   k       overall visibility · grow 0..1 draws the axis out from the centre to both ends
 *   ref     0..1 the dashed vertical reference · arc 0..1 the arc from the vertical to the axis
 *   wedge   [lo, hi] degrees (range swept), wedgeK 0..1 · todayK 0..1 dashed outline of today's 22.1–24.5° wedge
 *   equator 0..1 faint tilted equator · ext axis length beyond the centre, in Earth radii
 */
export function drawAxis(c, v, { tilt = TILT, k = 1, grow = 1, ref = 1, arc = 1, wedge = null, wedgeK = 0, todayK = 0, equator = 1, ext = 1.34, accent = v.accent } = {}) {
  const g = globePx(v);
  if (k <= 0.001 || !globeOk(g)) return;
  const { cx, cy, r } = g;
  const a = northAng(tilt), nx = Math.cos(a), ny = Math.sin(a);
  const R1 = r * ext, R0 = r * 1.03;
  c.save();
  c.globalAlpha *= k;
  c.lineCap = 'round';
  // wedge: the range of tilts, north and south
  if (wedge && wedgeK > 0.001) {
    const [lo, hi] = wedge;
    for (const flip of [0, Math.PI]) {
      const a0 = northAng(lo) + flip, a1 = northAng(hi) + flip;
      const wg = c.createRadialGradient(cx, cy, R0, cx, cy, R1 * 1.04);
      // a light swept range that fades outward; the bright accent lives on the two edge lines
      wg.addColorStop(0, L.rgba(accent, 0.17 * wedgeK)); wg.addColorStop(0.6, L.rgba(accent, 0.06 * wedgeK)); wg.addColorStop(1, L.rgba(accent, 0.015 * wedgeK));
      c.fillStyle = wg;
      sector(c, cx, cy, R0, R1 * 1.04, a0, a1); c.fill();
      c.strokeStyle = L.rgba(accent, 0.75 * wedgeK);
      c.lineWidth = 1.4;
      for (const aa of [a0, a1]) {
        c.beginPath(); c.moveTo(cx + Math.cos(aa) * R0, cy + Math.sin(aa) * R0); c.lineTo(cx + Math.cos(aa) * R1 * 1.04, cy + Math.sin(aa) * R1 * 1.04); c.stroke();
      }
      c.strokeStyle = L.rgba(accent, 0.3 * wedgeK);
      c.beginPath(); c.arc(cx, cy, Math.max(0, R1 * 1.04), a0, a1, a1 < a0); c.stroke();
    }
  }
  if (todayK > 0.001) {
    c.save();
    c.setLineDash([4, 5]);
    c.strokeStyle = `rgba(235,240,255,${0.7 * todayK})`;
    c.lineWidth = 1.4;
    for (const flip of [0, Math.PI]) {
      const a0 = northAng(TODAY[0]) + flip, a1 = northAng(TODAY[1]) + flip;
      sector(c, cx, cy, R0, R1 * 1.04, a0, a1); c.stroke();
    }
    c.restore();
  }
  // vertical reference (the orbit's normal) through the poles
  if (ref > 0.001) {
    c.save();
    c.setLineDash([3, 7]);
    c.strokeStyle = `rgba(215,225,250,${0.5 * ref})`;
    c.lineWidth = 1.4;
    const e = L.ease.outCubic(ref);
    c.beginPath(); c.moveTo(cx, cy - R0); c.lineTo(cx, cy - L.lerp(R0, R1 * 1.06, e)); c.stroke();
    c.beginPath(); c.moveTo(cx, cy + R0); c.lineTo(cx, cy + L.lerp(R0, R1 * 1.06, e)); c.stroke();
    c.restore();
  }
  // the arc from the vertical to the axis (north), with end ticks
  if (arc > 0.001) {
    const ra = r * 1.2, a0 = -Math.PI / 2, a1 = L.lerp(a0, a, L.ease.inOutCubic(arc));
    L.glow(c, accent, 10, () => {
      c.strokeStyle = L.rgba(accent, 0.9); c.lineWidth = 2.4;
      c.beginPath(); c.arc(cx, cy, ra, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
    }, 0.8);
    c.strokeStyle = L.rgba(accent, 0.95);
    c.lineWidth = 2;
    for (const aa of [a0, a1]) {
      c.beginPath(); c.moveTo(cx + Math.cos(aa) * (ra - 8), cy + Math.sin(aa) * (ra - 8)); c.lineTo(cx + Math.cos(aa) * (ra + 8), cy + Math.sin(aa) * (ra + 8)); c.stroke();
    }
  }
  // the REAL equator (lat 0 projected on the rolled globe, front side only), so it runs through Kenya and Sumatra,
  // not a straight line through the disc centre (the view is centred at 5°N, so it sits a little below the centre)
  if (equator > 0.001 && grow > 0) {
    const view = globeView(v), pts = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const p = project(0, lon, view);
      if (p.z > 0.02) pts.push(p);
    }
    if (pts.length > 1) {
      // order along the visible arc (left to right on screen across the roll), then grow out from its middle
      const ex = -ny, ey = nx;
      pts.sort((a, b) => ((a.x - cx) * ex + (a.y - cy) * ey) - ((b.x - cx) * ex + (b.y - cy) * ey));
      const g = L.ease.outCubic(grow), m = (pts.length - 1) / 2, hw = m * g;
      const i0 = Math.max(0, Math.floor(m - hw)), i1 = Math.min(pts.length - 1, Math.ceil(m + hw));
      c.save();
      c.beginPath(); c.arc(cx, cy, Math.max(0, r - 1), 0, TAU); c.clip();
      c.setLineDash([6, 8]);
      c.lineDashOffset = -v.gt * 10;
      c.strokeStyle = `rgba(225,235,255,${0.32 * equator * L.clamp(grow * 2 - 1)})`;
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(pts[i0].x, pts[i0].y);
      for (let i = i0 + 1; i <= i1; i++) c.lineTo(pts[i].x, pts[i].y);
      c.stroke();
      c.restore();
    }
  }
  // the axis: dashed and quiet inside the planet, bright outside, grows out from the centre
  if (grow > 0.001) {
    const e = L.ease.inOutCubic(L.clamp(grow)), len = R1 * e;
    const inner = Math.min(len, r);
    c.save();
    c.setLineDash([5, 6]);
    c.strokeStyle = 'rgba(235,240,255,0.42)';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(cx - nx * inner, cy - ny * inner); c.lineTo(cx + nx * inner, cy + ny * inner); c.stroke();
    c.restore();
    if (len > r) {
      L.glow(c, [200, 215, 255], 14, () => {
        c.strokeStyle = 'rgba(200,215,255,0.6)'; c.lineWidth = 3;
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * nx * r, cy + s * ny * r); c.lineTo(cx + s * nx * len, cy + s * ny * len); c.stroke(); }
      }, 0.7);
      c.strokeStyle = 'rgba(245,248,255,0.95)';
      c.lineWidth = 2.6;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * nx * r, cy + s * ny * r); c.lineTo(cx + s * nx * len, cy + s * ny * len); c.stroke(); }
      // end caps: an open ring on the north end, a dot on the south end
      const pe = L.clamp((len - r) / (R1 - r));
      c.fillStyle = 'rgba(245,248,255,0.95)';
      c.beginPath(); c.arc(cx - nx * len, cy - ny * len, Math.max(0, 3.5 * pe), 0, TAU); c.fill();
      c.strokeStyle = 'rgba(245,248,255,0.95)'; c.lineWidth = 2;
      c.beginPath(); c.arc(cx + nx * (len + 7 * pe), cy + ny * (len + 7 * pe), Math.max(0, 6 * pe), 0, TAU); c.stroke();
    }
    // polar ticks and pole glints
    const pk = L.clamp(e * 2 - 0.9);
    if (pk > 0) {
      const tx = -ny, ty = nx;
      for (const s of [-1, 1]) {
        const px = cx + s * nx * r, py = cy + s * ny * r;
        L.lightBlob(c, px, py, 26, [210, 225, 255], 0.35 * pk);
        c.strokeStyle = `rgba(245,248,255,${0.9 * pk})`;
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(px - tx * 14, py - ty * 14); c.lineTo(px + tx * 14, py + ty * 14); c.stroke();
      }
    }
  }
  c.restore();
}

export function tiltTimes(v) {
  const tl = v.tl, s = tl.scenes[7].start;
  const tilt = wordAt(tl, 7, /^tilt/) - s;
  return { axis: 0.45, ref: tilt - 0.6, label: tilt + 0.1, wedge: wordAt(tl, 7, /^reason/) - s - 0.1 };
}
export function axis7(v, t) {
  const T = tiltTimes(v);
  const wk = L.ease.outCubic(L.prog(t, T.wedge, 0.7));
  return {
    tilt: L.lerp(TILT, steadyTilt(v.gt), wk),
    grow: L.prog(t, T.axis, 1.1),
    ref: L.prog(t, T.ref, 0.6),
    arc: L.prog(t, T.ref + 0.2, 0.7),
    wedge: [TODAY[0], L.lerp(TODAY[0], TODAY[1], wk)],
    wedgeK: wk,
  };
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'The tilt', sub: '23.4°, steadied by the Moon' },
  captions: true,
  layer: 2,
  cues(d) {
    // "tilt" ≈ 1.8 s, "reason" ≈ 2.9 s
    return [
      { t: 0.45, name: 'swish', gain: 0.24, pitch: 0.75 },
      { t: 1.3, name: 'tick', gain: 0.22, pitch: 1.1 },
      { t: 1.9, name: 'ping', gain: 0.28, pitch: 1.0 },
      { t: 2.85, name: 'shimmer', gain: 0.14, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0 || v.t >= v.d) return;           // s08 holds the axis from its beat start
    drawAxis(ctx, v, axis7(v, v.t));
  },
  drawOverlay(ctx, v) {
    const T = tiltTimes(v);
    const k = L.enter(v.t, T.label, 0.55) * v.k, size = 100, x = 80, y = 1212;
    L.bigLabel(ctx, { x, y, big: '23.4', small: 'today: 22.1°–24.5°', k, accent: v.accent, align: 'left', size });
    if (k <= 0) return;
    // a true degree ring (the condensed face draws ° as a raised 'o'), placed after the measured number
    const e = L.ease.outCubic(L.clamp(k));
    ctx.save();
    ctx.globalAlpha *= L.clamp(k * 1.4);
    ctx.font = L.font(size, 800, L.FONT.display);
    ctx.letterSpacing = '-1px';
    const w = ctx.measureText('23.4').width + 1;
    ctx.letterSpacing = '0px';
    const rr = size * 0.09, yy = y + (1 - e) * 30;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = L.rgba(v.accent);
    ctx.lineWidth = size * 0.035;
    ctx.beginPath(); ctx.arc(x + w + size * 0.05 + rr, yy - size * 0.71 + rr, Math.max(0, rr), 0, TAU); ctx.stroke();
    ctx.restore();
  },
};
