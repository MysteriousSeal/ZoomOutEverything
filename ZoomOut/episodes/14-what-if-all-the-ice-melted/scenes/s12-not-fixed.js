// Beat 12 — "Coastlines aren't fixed. | The ice decides where they are."
// The final pull-back to the North Atlantic globe. As the sea returns to today (env) and the ice-age sheets melt
// back (s10), the two other coastlines stay behind as faint outlines on the globe:
//   * the ice-age coast (−120 m contour) in dashed sand with a soft underglow, lit first, left behind as the water
//     climbs off the shelves;
//   * the melted-world coast (+70 m contour) as an ice-white line that draws itself on along the contour on
//     "The ice decides where they are", while the sand line steps back (one line leads at a time).
// The contours are extracted ONCE (marching squares on a 0.5° grid of env.elevation, then chained into polylines),
// never per frame; per frame they are only projected, culled to the visible hemisphere and stroked.
// A small legend names the two lines; after the voice ends a closing tag "ZOOM OUT · WHAT IF" sits in the caption slot.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, SAND, elevation, viewOf, worldOf } from '../env.js';

const { W } = L;
const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];
const HIGH = L.mix(ACCENT, [255, 255, 255], 0.25);   // the +70 m line: a mint hairline (the film's +70 m colour)
const LOWC = L.mix(SAND, [255, 236, 200], 0.2);   // the −120 m line: sand

// ------------------------------------------------------------------ contours (computed once, lazily)
const STEP = 0.5, LAT0 = -60, LAT1 = 84;   // Antarctica is far side in the final view; skip it
let GRID = null;
function grid() {
  if (GRID) return GRID;
  const nx = Math.round(360 / STEP), ny = Math.round((LAT1 - LAT0) / STEP);
  const g = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) g[j * (nx + 1) + i] = elevation(LAT0 + j * STEP, -180 + i * STEP);
  GRID = { g, nx, ny };
  return GRID;
}
const CONTOURS = {};
function contour(level) {
  if (CONTOURS[level]) return CONTOURS[level];
  const { g, nx, ny } = grid();
  const at = (i, j) => g[j * (nx + 1) + i] - level;
  // edge ids: horizontal edge (i,j)-(i+1,j) = 2*(j*(nx+1)+i), vertical (i,j)-(i,j+1) = +1
  const pt = new Map();
  const edgePt = (id) => {
    if (pt.has(id)) return pt.get(id);
    const k = id >> 1, i = k % (nx + 1), j = (k / (nx + 1)) | 0;
    const a = at(i, j), b = (id & 1) ? at(i, j + 1) : at(i + 1, j);
    const f = a / (a - b);
    const p = (id & 1) ? [LAT0 + (j + f) * STEP, -180 + i * STEP] : [LAT0 + j * STEP, -180 + (i + f) * STEP];
    pt.set(id, p);
    return p;
  };
  const adj = new Map();
  const link = (e1, e2) => {
    if (!adj.has(e1)) adj.set(e1, []); if (!adj.has(e2)) adj.set(e2, []);
    adj.get(e1).push(e2); adj.get(e2).push(e1);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const idx = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const eB = 2 * (j * (nx + 1) + i), eT = 2 * ((j + 1) * (nx + 1) + i), eL = 2 * (j * (nx + 1) + i) + 1, eR = 2 * (j * (nx + 1) + i + 1) + 1;
      const cross = [];
      if ((a > 0) !== (b > 0)) cross.push(eB);
      if ((b > 0) !== (c > 0)) cross.push(eR);
      if ((c > 0) !== (d > 0)) cross.push(eT);
      if ((d > 0) !== (a > 0)) cross.push(eL);
      if (cross.length === 2) link(cross[0], cross[1]);
      else if (cross.length === 4) { link(cross[0], cross[1]); link(cross[2], cross[3]); }
    }
  }
  // chain into polylines
  const used = new Set(), lines = [];
  const walk = (start) => {
    const line = [start];
    used.add(start);
    let cur = start;
    for (;;) {
      const nb = (adj.get(cur) || []).find((e) => !used.has(e));
      if (nb === undefined) break;
      used.add(nb); line.push(nb); cur = nb;
    }
    return line;
  };
  for (const [e, nbs] of adj) if (!used.has(e) && nbs.length === 1) { const l = walk(e); if (l.length > 1) lines.push(l); }
  for (const e of adj.keys()) if (!used.has(e)) { const l = walk(e); if (l.length > 1) lines.push(l); }
  // keep meaningful lines only (drop tiny islands / specks), store flat lat/lon arrays + their 3D unit vectors
  const out = [];
  const D = Math.PI / 180;
  for (const l of lines) {
    if (l.length < 6) continue;
    const xyz = new Float32Array(l.length * 3);
    l.forEach((e, n) => {
      const [la, lo] = edgePt(e);
      xyz[n * 3] = Math.cos(la * D) * Math.cos(lo * D);
      xyz[n * 3 + 1] = Math.cos(la * D) * Math.sin(lo * D);
      xyz[n * 3 + 2] = Math.sin(la * D);
    });
    out.push(xyz);
  }
  CONTOURS[level] = out;
  return out;
}

/** Trace the contour polylines on the visible hemisphere (z culled), decimated by screen size. */
function traceContour(c, v, lines, frac = 1) {
  const vw = viewOf(v);
  const R = 6.371e6, cx = v.wx(0), cy = v.wy(R), r = v.ws(R);
  const [r0, r1, r2] = vw.r, [u0, u1, u2] = vw.u, [c0, c1, c2] = vw.c;
  // LOD: skip points closer than ~1.5 px (0.5° ≈ 55 km)
  const pxPer = r * (STEP * Math.PI / 180);
  const stride = Math.max(1, Math.floor(1.5 / Math.max(0.01, pxPer)));
  for (const xyz of lines) {
    let pen = false;
    const n = Math.floor((xyz.length / 3) * frac);
    if (n < 2) continue;
    for (let k = 0; k < n; k = (k === n - 1) ? n : Math.min(n - 1, k + stride)) {
      const X = xyz[k * 3], Y = xyz[k * 3 + 1], Z = xyz[k * 3 + 2];
      const z = X * c0 + Y * c1 + Z * c2;
      if (z < 0.04) { pen = false; continue; }
      const sx = cx + (X * r0 + Y * r1 + Z * r2) * r, sy = cy - (X * u0 + Y * u1 + Z * u2) * r;
      if (pen) c.lineTo(sx, sy); else { c.moveTo(sx, sy); pen = true; }
    }
  }
}

// ------------------------------------------------------------------ timing
function times(tl) {
  const s = tl.scenes[12].start;
  return {
    low: s + 1.35,                       // the ice-age coast, left behind once the ghost ice has dissolved (~55.5)
    high: ph(tl, 12, 1) + 0.05,          // "The ice decides where they are": the +70 m coast draws itself on
    lowLegend: s + 1.85,
    legend: ph(tl, 12, 1) + 0.55,
    close: tl.lines[12].end + 0.95,      // last caption gone: closing tag
  };
}

export default {
  beat: 12,
  chapter: { num: '12', title: 'Not fixed', sub: 'the ice decides' },
  captions: true,
  layer: 4,
  chapterUntil(d) { return 2.4; },
  // beat starts 53.92: sea returns 54.12-56.92; phrase 2 at 56.20; VO ends 57.86
  cues(d) {
    return [
      { t: 0.15, name: 'swell', gain: 0.26, pitch: 0.7 },
      { t: 1.1, name: 'shimmer', gain: 0.18, pitch: 0.75 },
      { t: 2.3, name: 'bloom', gain: 0.24, pitch: 0.8 },
      { t: 2.35, name: 'shimmer', gain: 0.22, pitch: 1.1 },
      { t: 4.9, name: 'deep', gain: 0.22, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    if (v.gt < tm.low - 0.1) return;
    const r = v.ws(6.371e6);
    if (r < 40) return;
    const kLow = L.ease.inOutCubic(L.prog(v.gt, tm.low, 1.2));
    const kHigh = L.prog(v.gt, tm.high, 1.8);                 // draw-on progress of the +70 m coast
    const kHighA = L.ease.outCubic(L.prog(v.gt, tm.high, 0.5));
    // one line leads at a time: the sand line steps back as the white one draws on
    const lowDim = 1 - 0.32 * L.ease.inOutCubic(L.prog(v.gt, tm.high, 1.0));
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (kLow > 0) {
      // the ice-age coast: dashed sand with a soft sand underglow, left behind as the water climbs off the shelves
      const lines = contour(-120);
      ctx.lineWidth = 7;
      ctx.strokeStyle = L.rgba(SAND, 0.16 * kLow * lowDim);
      ctx.beginPath(); traceContour(ctx, v, lines); ctx.stroke();
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = L.rgba(LOWC, 0.88 * kLow * lowDim);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (kHigh > 0) {
      // the melted-world coast: an ice-white line drawing itself along the contour, with a soft glow
      const lines = contour(70), f = L.ease.inOutCubic(kHigh);
      ctx.beginPath(); traceContour(ctx, v, lines, f);
      ctx.lineWidth = 5;
      ctx.strokeStyle = L.rgba(HIGH, 0.08 * kHighA);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = L.rgba(HIGH, 0.55 * kHighA);
      ctx.stroke();
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    // legend: two line swatches, top left above the globe
    const kl = L.prog(v.gt, tm.lowLegend, 0.6);
    if (kl > 0) {
      const rows = [
        { lbl: '−120 M  ·  20,000 YEARS AGO', col: LOWC, dash: [6, 5], t: tm.lowLegend },
        { lbl: '+70 M  ·  ALL LAND ICE MELTED', col: HIGH, dash: [], t: tm.legend },
      ];
      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.font = L.font(23, 600, L.FONT.body);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8;
      rows.forEach((row, i) => {
        const k = L.ease.outCubic(L.prog(v.gt, row.t, 0.6));
        if (k <= 0) return;
        const x = 70, y = 330 + i * 40;
        ctx.globalAlpha = k;
        ctx.setLineDash(row.dash);
        ctx.strokeStyle = L.rgba(row.col, row.dash.length ? 0.95 : 0.8);
        ctx.lineWidth = row.dash.length ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 46 * k, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(220,228,238,0.92)';
        L.trackedText(ctx, row.lbl, x + 62 + (1 - k) * 10, y + 1, 2, 'left');
      });
      ctx.restore();
    }
    // closing tag in the caption slot after the voice ends
    const ck = L.enter(v.gt, tm.close, 0.8);
    if (ck > 0) {
      ctx.save();
      ctx.globalAlpha = ck;
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 12;
      ctx.font = L.font(44, 800, L.FONT.display);
      const a = 'ZOOM OUT', b = '  ·  WHAT IF';
      const wa = L.trackedText(ctx, a, -9999, -9999, 6, 'left');
      ctx.font = L.font(44, 600, L.FONT.display);
      const wb = L.trackedText(ctx, b, -9999, -9999, 6, 'left');
      const x0 = W / 2 - (wa + wb) / 2, y = 1335 + (1 - ck) * 12;
      ctx.font = L.font(44, 800, L.FONT.display);
      ctx.fillStyle = 'rgba(240,245,252,0.96)';
      L.trackedText(ctx, a, x0, y, 6, 'left');
      ctx.font = L.font(44, 600, L.FONT.display);
      ctx.fillStyle = L.rgba(ACCENT);
      L.trackedText(ctx, b, x0 + wa, y, 6, 'left');
      ctx.restore();
    }
  },
};
