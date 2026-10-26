// Beat 7 — "It would keep the same orbit, | a hundred fifty million kilometers out."
// Orbit hold. Earth stays fixed in the world, so the year is shown as a TIME-LAPSE TRACE: a bright head sweeps once
// around the 1 AU circle from Earth (env draws the faint dashed ring), leaving a solid violet orbit behind it and
// dropping twelve month ticks as it passes; it closes back at Earth with a soft bloom. On "a hundred fifty million
// kilometers" a radius dimension draws out from the black hole to Earth (offset to the lower-left of the radius).
// The trace (s06's drawTrace) and the radius bracket (exported here) persist through beats 8–9.
import * as L from '../../../../engine/runtime/lib.js';
import { ACC, drawLabels } from './s05-dark.js';
import { DIR, drawOrbitTags, drawTrace, orbitAlpha, orbitGeom, sweep, masked, closeT } from './s06-no-fly-off.js';

// ------------------------------------------------------------------ the radius bracket (shared with s09's "d")
/** Visibility of the radius bracket: draws out on "a hundred fifty million", recedes in beat 8, returns as "d". */
export function radiusK(gt) {
  // 16c: "a hundred fifty million kilometers" is not spoken: the bracket draws on only as s09's "d", on "distance"
  // (16: on at 29.3, recede at 32.5, back at 38.3)
  const on = L.prog(gt, 38.15, 0.5);
  const out = 1 - L.ease.inCubic(L.prog(gt, 39.6, 0.4));
  return { draw: L.ease.outCubic(on), a: out };
}
/** Screen endpoints of the bracket (offset from the radius toward the lower-left). */
export function radiusGeom(v, off = 36) {
  const g = orbitGeom(v);
  const o = { x: -g.n.y, y: g.n.x };                              // perpendicular to the radius, lower-left side
  const A = { x: g.cx + g.n.x * 16 + o.x * off, y: g.cy + g.n.y * 16 + o.y * off };
  const B = { x: g.ex - g.n.x * 18 + o.x * off, y: g.ey - g.n.y * 18 + o.y * off };
  return { A, B, o, g };
}
export function drawRadius(c, v) {
  const { draw, a } = radiusK(v.gt);
  if (draw <= 0 || a <= 0) return;
  const { A, B, o, g } = radiusGeom(v);
  if (g.R < 60 || g.R > 4000) return;
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  const p = { x: L.lerp(mx, A.x, draw), y: L.lerp(my, A.y, draw) }, q = { x: L.lerp(mx, B.x, draw), y: L.lerp(my, B.y, draw) };
  c.save();
  c.lineCap = 'round';
  // faint guides from the bracket ends back to the real centre / Earth
  c.strokeStyle = L.rgba(ACC, 0.35 * a * draw);
  c.lineWidth = 1.2;
  c.setLineDash([2, 5]);
  c.beginPath();
  c.moveTo(A.x - o.x * 30, A.y - o.y * 30); c.lineTo(A.x + o.x * 8, A.y + o.y * 8);
  c.moveTo(B.x - o.x * 30, B.y - o.y * 30); c.lineTo(B.x + o.x * 8, B.y + o.y * 8);
  c.stroke();
  c.setLineDash([]);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
  c.strokeStyle = L.rgba(L.mix(ACC, [255, 255, 255], 0.2), 0.95 * a);
  c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
  const tk = 11 * L.clamp(draw * 1.2 - 0.2);
  if (tk > 0) {
    c.beginPath();
    c.moveTo(A.x - o.x * tk, A.y - o.y * tk); c.lineTo(A.x + o.x * tk, A.y + o.y * tk);
    c.moveTo(B.x - o.x * tk, B.y - o.y * tk); c.lineTo(B.x + o.x * tk, B.y + o.y * tk);
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ month ticks dropped by the sweeping head
function drawMonths(c, v) {
  const gt = v.gt;
  if (gt < 27.3 || gt > 40.05) return;
  const g = orbitGeom(v);
  if (g.R < 60 || g.R > 4000) return;
  const A = orbitAlpha(gt);
  const sw = sweep(gt);
  c.save();
  c.strokeStyle = 'rgba(225,215,255,1)';
  c.lineCap = 'round';
  for (let m = 1; m < 12; m++) {
    const am = (m / 12) * Math.PI * 2;
    if (sw < am) break;
    const k = L.clamp((sw - am) / 0.35);
    const th = g.th + DIR * am;
    const nx = Math.cos(th), ny = Math.sin(th);
    const r0 = g.R - 7 * k, r1 = g.R + 7 * k;
    c.globalAlpha = 0.5 * A * (0.4 + 0.6 * k);
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(g.cx + nx * r0, g.cy + ny * r0); c.lineTo(g.cx + nx * r1, g.cy + ny * r1); c.stroke();
  }
  c.restore();
}

/** The year closes back at Earth. */
function drawClose(c, v) {
  const p = closeT(v.gt);   // 16c: the year closes at 28.75 s; continuous across the ramp (16: v.gt - 30.95)
  if (p < 0 || p > 1.4) return;
  const g = orbitGeom(v);
  c.save();
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, g.ex, g.ey, 50 + 90 * p, ACC, 0.5 * Math.exp(-p * 2.6));
  c.strokeStyle = L.rgba(ACC, 0.7 * (1 - p / 1.4));
  c.lineWidth = 2;
  c.beginPath(); c.arc(g.ex, g.ey, Math.max(0, 16 + 60 * L.ease.outCubic(p / 1.4)), 0, Math.PI * 2); c.stroke();
  c.restore();
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Same orbit', sub: 'around a black hole now' },
  captions: true,
  layer: 1,
  cues() {
    // beat starts 27.055 s; 16c: the sweep runs 27.55-28.55 (relative to 16's beat 7; remap.js moves them)
    return [
      { t: 0.45, name: 'swell', gain: 0.24, pitch: 0.9 },
      { t: 0.5, name: 'whoosh', gain: 0.22, pitch: 0.7 },
      { t: 28.55 - 27.055, name: 'bloom', gain: 0.3, pitch: 1.0 },
      { t: 28.55 - 27.055 + 0.02, name: 'ping', gain: 0.2, pitch: 1.4 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt > 26.1 && v.gt < 40.05) masked(c, v, (o) => { drawTrace(o, v); drawMonths(o, v); });
    drawRadius(c, v);
    drawClose(c, v);
  },
  drawOverlay(c, v) {
    drawLabels(c, v);
    drawOrbitTags(c, v);
  },
};
