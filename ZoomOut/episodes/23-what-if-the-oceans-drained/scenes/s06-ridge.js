// Beat 6 — "The mid-ocean ridge winds sixty-five thousand kilometers around the planet, the longest on Earth."
// The camera swings from the Atlantic face to the oblique south view (arrives ≈ 36.8, then spins −9°/s). A glowing seam
// traces the whole ridge system from Iceland: down the Mid-Atlantic Ridge, round Antarctica and up the East Pacific Rise,
// side branches sprouting as the trunk passes their junctions. Each moving front carries a hot comet tail. A km counter
// runs with the revealed length (scaled to the published 65,000 km) and LANDS on "sixty-five thousand kilometers"
// (≈ 38.3). On "the longest on Earth" one bright pulse sweeps the finished network.
//
// This file OWNS the ridge seam for all later time: it stays on, dimmer, through beats 7–9 and fades out early in
// beat 10. The preroll replays beats 5–6 time (33.33–34.76: s05's under-glow, before this trace starts).
//
// Shared helpers for beats 5–9 (s05, s07, s08, s09 import them): ridgeSeg / strokeSeg (partial ridge strokes),
// drawPin, labelBlock (a bigLabel with both lines fitted, and a soft legibility backing).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, RIDGE, RIDGE_TRACE_END, drawRidge, ridgeRevealedKm, strokeGeo } from '../env.js';

const RIDGE_KM = 65000;                    // the published figure (script.md FACT-CHECK); the drawn system is ≈ 68,000
const T_TRACE0 = 0.28;                     // s into the beat: the trace starts (just after "The")
const LAND_DT = 0.1;                       // the counter lands this long after "kilometers" ends (word estimate ≈ 38.23)

// ================================================================== shared helpers
/** Branch-local slice [s0, s1] (km) of ridge branch b as a lat/lon polyline (null if empty). */
export function ridgeSeg(b, s0, s1) {
  s0 = L.clamp(s0, 0, b.len); s1 = L.clamp(s1, 0, b.len);
  if (s1 - s0 < 1) return null;
  const at = (s) => {
    let i = 1; while (i < b.cum.length - 1 && b.cum[i] < s) i++;
    const f = (s - b.cum[i - 1]) / (b.cum[i] - b.cum[i - 1] || 1);
    const a = b.pts[i - 1], c = b.pts[i];
    let db = c[1] - a[1]; if (db > 180) db -= 360; if (db < -180) db += 360;
    return { i, p: [a[0] + (c[0] - a[0]) * f, a[1] + db * f] };
  };
  const A = at(s0), B = at(s1);
  const out = [A.p];
  for (let i = A.i; i < B.i; i++) out.push(b.pts[i]);
  out.push(B.p);
  return out;
}
/** Additive stroke passes over several lat/lon polylines: passes = [[width, alpha, colour], ...]. */
export function strokeSeg(c, v, polys, passes, alpha = 1) {
  if (alpha <= 0.002 || !polys.length) return;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.globalCompositeOperation = 'lighter';
  c.beginPath();
  for (const p of polys) strokeGeo(c, v, p, 0.8, 0.04);
  for (const [w, a, col] of passes) { c.lineWidth = w; c.strokeStyle = L.rgba(col, a * alpha); c.stroke(); }
  c.restore();
}
/** Pin: soft dark halo, a white ring and an accent dot; one pulse ring on arrival (pulse 0..1). */
export function drawPin(c, x, y, k, pulse = 1, a = 1, color = ACCENT) {
  if (k <= 0 || a <= 0.01) return;
  const e = L.ease.outBack(L.clamp(k), 2.2);
  c.save();
  c.globalAlpha *= a * L.clamp(k * 2);
  const halo = c.createRadialGradient(x, y, 0, x, y, 34);
  halo.addColorStop(0, 'rgba(2,8,16,0.55)');
  halo.addColorStop(1, 'rgba(2,8,16,0)');
  c.fillStyle = halo;
  c.fillRect(x - 34, y - 34, 68, 68);
  if (pulse > 0 && pulse < 1) {
    c.strokeStyle = L.rgba(color, 0.75 * (1 - pulse));
    c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, Math.max(0, 10 + 46 * L.ease.outCubic(pulse)), 0, Math.PI * 2); c.stroke();
  }
  c.strokeStyle = 'rgba(245,250,252,0.95)';
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(x, y, Math.max(0, 10 * e), 0, Math.PI * 2); c.stroke();
  c.fillStyle = L.rgba(color);
  c.beginPath(); c.arc(x, y, Math.max(0, 4 * e), 0, Math.PI * 2); c.fill();
  c.restore();
}
/**
 * The house big-number label (bigLabel look) with BOTH lines fitted to maxW, plus a soft dark backing so it reads over
 * the globe. Returns {w, top, bottom}. k: 0..1 entrance; small may be '' ; flash 0..1 brightens the number.
 */
export function labelBlock(c, { x = 80, y = 560, big, small = '', k = 1, size = 110, maxW = 820, smallSize = 30, flash = 0, accent = ACCENT, backing = 0.5 }) {
  if (k <= 0) return null;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  const bs = L.fitSize(c, big, maxW, size, 800, L.FONT.display, 40);
  c.font = L.font(bs, 800, L.FONT.display);
  const bw = c.measureText(big).width;
  let ss = smallSize, sw = 0;
  if (small) {
    c.letterSpacing = '3px';
    ss = L.fitSize(c, small.toUpperCase(), maxW, smallSize, 600, L.FONT.body, 16);
    c.font = L.font(ss, 600, L.FONT.body);
    sw = c.measureText(small.toUpperCase()).width;
    c.letterSpacing = '0px';
  }
  const top = y - bs * 0.92 - 30, bottom = y + (small ? 52 + ss * 0.3 : 12);
  // backing: a soft elliptical shade behind the block (no hard card)
  if (backing > 0) {
    const w = Math.max(bw, sw) + 80, cx = x + w / 2 - 40, cy = (top + bottom) / 2, rx = w * 0.62, ry = (bottom - top) * 0.9;
    c.save();
    c.globalAlpha *= backing * L.clamp(k * 1.4);
    c.translate(cx, cy); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(3,7,15,0.75)'); g.addColorStop(0.55, 'rgba(3,7,15,0.45)'); g.addColorStop(1, 'rgba(3,7,15,0)');
    c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2);
    c.restore();
  }
  c.globalAlpha *= L.clamp(k * 1.4);
  c.textBaseline = 'alphabetic';
  c.fillStyle = L.rgba(accent, 0.9);
  c.fillRect(x, y - bs * 0.92 - 26, 90 * e, 4);
  c.font = L.font(bs, 800, L.FONT.display);
  c.fillStyle = L.rgba(L.mix(accent, [255, 255, 255], 0.55 * flash));
  c.shadowColor = flash > 0 ? L.rgba(accent, 0.9 * flash) : 'rgba(0,0,0,0.55)';
  c.shadowBlur = 18 + 22 * flash;
  L.trackedText(c, big, x, y + (1 - e) * 30, -1, 'left');
  if (small) {
    c.shadowColor = 'rgba(0,0,0,0.55)';
    c.shadowBlur = 8;
    c.font = L.font(ss, 600, L.FONT.body);
    c.fillStyle = 'rgba(205,215,230,0.95)';
    L.trackedText(c, small.toUpperCase(), x, y + 52 + (1 - e) * 18, 3, 'left');
  }
  c.restore();
  return { w: Math.max(bw, sw), top, bottom };
}
/** Word start (global s) in line li, estimated the way the captions time words. */
export function wordAt(tl, li, word) {
  for (const ph of tl.lines[li].phrases ?? [tl.lines[li]]) {
    const words = ph.text.toUpperCase().split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (words[i].replace(/[^A-Z'-]/g, '') === word.toUpperCase()) return { start: ph.start + (ph.end - ph.start) * acc / tot, end: ph.start + (ph.end - ph.start) * (acc + wts[i]) / tot };
      acc += wts[i];
    }
  }
  return null;
}

// ================================================================== the trace
/** Timing of the trace for this timeline (global s): trace start, landing. */
function traceTimes(tl) {
  const b = tl.scenes[6].start;
  const km = wordAt(tl, 6, 'kilometers');
  return { t0: b + T_TRACE0, t1: (km ? km.end : b + 3.4) + LAND_DT };
}
/** steady, decelerating into the landing (the count climbs through "sixty-five thousand kilometers") */
const traceEase = (x) => 0.5 * x + 0.5 * L.ease.outCubic(x);
/** Trunk distance D (km) revealed at global time gt. */
export function traceD(gt, tl) {
  const { t0, t1 } = traceTimes(tl);
  return RIDGE_TRACE_END * traceEase(L.prog(gt, t0, t1 - t0));
}
const HOT = [210, 240, 255];

export default {
  beat: 6,
  chapter: { num: '05', title: 'The mid-ocean ridge' },
  layer: 6,
  cues(d) {
    // beat starts 34.88: trace from +0.28; the counter lands at "kilometers" end + 0.1 (≈ 38.33 → +3.45);
    // the sweep on "longest" (39.71 → +4.83)
    return [
      { t: 0.25, name: 'riser', gain: 0.28, pitch: 0.9 },
      { t: 0.3, name: 'count', gain: 0.22, pitch: 1.0 },
      { t: 3.45, name: 'impact', gain: 0.42, pitch: 0.85 },
      { t: 3.47, name: 'shimmer', gain: 0.3, pitch: 1.1 },
      { t: 4.8, name: 'shimmer', gain: 0.26, pitch: 1.35 },
    ];
  },
  drawWorld(c, v) {
    const { t0, t1 } = traceTimes(v.tl);
    if (v.gt < t0) return;
    const sc = v.tl.scenes;
    // the seam: full strength through beat 6, dimmer through 7–9, gone early in beat 10
    const dim = L.lerp(1, 0.55, L.ease.inOutCubic(L.prog(v.gt, sc[7].start - 0.2, 1.4)));
    const out = 1 - L.ease.inOutCubic(L.prog(v.gt, sc[10].start, 1.0));
    const alpha = dim * out;
    if (alpha <= 0.002) return;
    const D = traceD(v.gt, v.tl);
    const landFlash = Math.exp(-Math.pow((v.gt - t1) / 0.35, 2)) * (v.gt > t1 - 0.4 ? 1 : 0);
    drawRidge(c, v, D, { alpha, glow: 1 + 0.6 * landFlash, width: 2.2 });
    // hot comet tails behind every moving front (≈ 2,200 km), fading as each branch completes
    if (D < RIDGE_TRACE_END) {
      const tails = [];
      for (const b of RIDGE) {
        const s = D - b.sprout;
        if (s <= 0 || s >= b.len + 1) continue;
        const p = ridgeSeg(b, s - 2200, s);
        if (p) tails.push(p);
      }
      strokeSeg(c, v, tails, [[16, 0.08, ACCENT], [6, 0.32, ACCENT], [2.6, 0.7, HOT]], alpha);
    }
    // the sweep: one bright pulse runs the finished network on "the longest on Earth"
    const lw = wordAt(v.tl, 6, 'longest');
    if (lw) {
      const ps = L.prog(v.gt, lw.start - 0.25, 1.7);
      if (ps > 0 && ps < 1) {
        const P = L.ease.inOutCubic(ps) * (RIDGE_TRACE_END + 3000);
        const seg = [];
        for (const b of RIDGE) { const p = ridgeSeg(b, P - b.sprout - 3000, P - b.sprout); if (p) seg.push(p); }
        strokeSeg(c, v, seg, [[14, 0.07, ACCENT], [5, 0.3, ACCENT], [2.2, 0.75, HOT]], alpha * Math.sin(Math.PI * ps));
      }
    }
  },
  drawOverlay(c, v) {
    const { t0, t1 } = traceTimes(v.tl);
    const D = traceD(v.gt, v.tl);
    const shown = ridgeRevealedKm(D) * RIDGE_KM / ridgeRevealedKm(RIDGE_TRACE_END);
    const landed = v.gt >= t1 - 1e-3;
    const big = landed ? `${L.fmt(RIDGE_KM)} km` : `${L.fmt(Math.round(shown / 100) * 100)} km`;
    const k = v.k * L.ease.outCubic(L.prog(v.gt, t0 - 0.1, 0.45));
    const flash = Math.exp(-Math.pow((v.gt - t1) / 0.3, 2)) * (v.gt > t1 - 0.3 ? 1 : 0);
    // the small line: what is being measured, then the superlative on "the longest"
    const lw = wordAt(v.tl, 6, 'longest');
    const sw = lw ? L.prog(v.gt, lw.start - 0.2, 0.5) : 0;   // sequential swap: A out (first half), B in (second half)
    const smallA = 'the mid-ocean ridge', smallB = 'the longest mountain range on Earth';
    c.save();
    labelBlock(c, { x: 80, y: 568, big, small: '', k, flash, size: 112 });
    // crossfading small line (one text element: same slot)
    const yS = 568 + 52;
    for (const [txt, a, dy] of [[smallA, L.clamp(1 - sw * 2), -10 * sw], [smallB, L.clamp(sw * 2 - 1), 10 * (1 - sw)]]) {
      if (a <= 0.01) continue;
      c.save();
      c.globalAlpha *= L.clamp(k * 1.4) * a;
      c.letterSpacing = '3px';
      const s = L.fitSize(c, txt.toUpperCase(), 820, 30, 600, L.FONT.body, 16);
      c.letterSpacing = '0px';
      c.font = L.font(s, 600, L.FONT.body);
      c.fillStyle = 'rgba(205,215,230,0.95)';
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 10;
      L.trackedText(c, txt.toUpperCase(), 80, yS + dy + (1 - L.ease.outCubic(L.clamp(k))) * 18, 3, 'left');
      c.restore();
    }
    c.restore();
  },
};
