// Beat 2 — "By sixty, Britain has rejoined Europe, | across a lost land called Doggerland."
// The North Sea close-up while the sea falls −50 → −60 m (15.19–16.93). Small BRITAIN and EUROPE tags land as the
// camera arrives; bigLabel "−60 m" / "Britain joins Europe". On "across a lost land called Doggerland" a dashed accent
// outline of the land that is dry at −60 m (today's sea floor between Britain and the continent) draws itself around
// the plain with a soft inner accent glow, then the tag DOGGERLAND / FLOODED ≈ 8,000 YEARS AGO settles on it.
// The outline was traced offline from the same 0.1° grid (elevation() between −60 m and 0 m, the component around
// Dogger Bank, cut at 57.6 N / the Skagerrak and off the narrow Scottish coastal strip), smoothed and simplified.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, project } from '../env.js';
import { tag } from './s01-bering.js';

const ph = (tl, i, j, edge = 'start') => tl.lines[i].phrases[j][edge];

/** The southern North Sea dry at −60 m (lat, lon), clockwise from the Dover Strait. */
export const DOGGER_POLY = [[50.9, 0.87], [50.91, 2.2], [51.03, 2.55], [51.02, 2.8], [51.26, 3.2], [51.2, 3.8], [51.27, 4.23],
  [51.57, 4.35], [51.67, 4.99], [51.77, 5.14], [52.31, 5.16], [52.26, 5.45], [52.51, 5.95], [52.48, 6.21], [52.73, 6.25],
  [52.85, 6.01], [53.17, 6.16], [53.24, 6.45], [53.02, 7.16], [53.18, 7.4], [53.4, 7.4], [53.55, 7.39], [53.64, 7.55],
  [53.41, 8.15], [53.18, 8.4], [53.4, 8.56], [53.87, 8.61], [53.72, 8.92], [53.8, 9.17], [53.95, 9.09], [54.41, 9.06],
  [54.94, 8.75], [55.05, 8.46], [55.13, 8.6], [55.32, 8.6], [55.56, 8.14], [55.91, 8.27], [56.2, 8.22], [56.57, 8.15],
  [56.7, 7.96], [57.27, 7.92], [57.25, 7.35], [57.1, 6.9], [57.2, 5.35], [57.35, 4.8], [57.31, 4.4], [57.42, 4.11],
  [57.07, 3.61], [56.78, 3.81], [56.54, 4.46], [56.08, 4.39], [55.56, 2.7], [55.36, 1.35], [55.38, 0.91], [55.29, 0.85],
  [54.8, 1.01], [54.55, 0.8], [54.49, 0.25], [54.14, -0.13], [53.53, 0.08], [53.25, 0.33], [52.87, 0.23], [52.85, 0.39],
  [53.03, 0.65], [52.95, 1.3], [52.6, 1.75], [52.4, 1.77], [52.1, 1.6], [51.73, 1.24], [51.46, 0.77], [51.41, 1.39],
  [51.3, 1.47], [51.11, 1.42], [50.98, 1.25]];

/** Densified closed loop (≤ 0.12° steps) with cumulative fraction, for a draw-on stroke. */
const LOOP = (() => {
  const out = [];
  const n = DOGGER_POLY.length;
  for (let i = 0; i < n; i++) {
    const a = DOGGER_POLY[i], b = DOGGER_POLY[(i + 1) % n];
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.12));
    for (let s = 0; s < k; s++) out.push([L.lerp(a[0], b[0], s / k), L.lerp(a[1], b[1], s / k)]);
  }
  out.push(DOGGER_POLY[0]);
  return out;
})();

function times(tl) {
  const p1 = ph(tl, 2, 1);
  return {
    label: ph(tl, 2, 0) + 1.15,   // with the drop to −60
    lands: ph(tl, 2, 0) + 1.5,    // BRITAIN / EUROPE
    draw0: p1 - 0.15, draw: 1.5,  // "across a lost land …"
    name: p1 + 1.1,               // "… called Doggerland"
  };
}
const away = (v) => 1 - L.ease.inCubic(L.prog(v.gt, v.tl.scenes[3].start - 0.1, 0.5));

/** Draw the outline (and wash) of a lat/lon loop: k = draw-on progress 0..1, wash = fill alpha factor. */
export function drawDoggerOutline(c, v, k, wash, alpha = 1, dash = true) {
  if (alpha <= 0 || (k <= 0 && wash <= 0)) return;
  const P = LOOP.map(([la, lo]) => project(v, la, lo));
  if (P.every((p) => p.z < 0.05)) return;
  c.save();
  c.globalAlpha *= alpha;
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (wash > 0) {
    // inner glow: a wide soft accent band along the edge, clipped to the inside (the plain itself stays readable)
    c.save();
    c.beginPath();
    P.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.clip();
    c.strokeStyle = L.rgba(ACCENT, 0.13 * wash);
    c.lineWidth = 36;
    c.stroke();
    c.strokeStyle = L.rgba(ACCENT, 0.22 * wash);
    c.lineWidth = 14;
    c.stroke();
    c.restore();
  }
  if (k > 0) {
    const m = Math.max(2, Math.round(P.length * L.clamp(k)));
    c.beginPath();
    for (let i = 0; i < m; i++) (i ? c.lineTo(P[i].x, P[i].y) : c.moveTo(P[i].x, P[i].y));
    c.strokeStyle = 'rgba(2,10,20,0.5)';
    c.lineWidth = 6.5;
    c.stroke();
    if (dash) c.setLineDash([11, 7]);
    c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.12), 1);
    c.lineWidth = 3.2;
    c.stroke();
    c.setLineDash([]);
    if (k < 1) L.lightBlob(c, P[m - 1].x, P[m - 1].y, 26, ACCENT, 0.8);
  }
  c.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Doggerland', sub: 'Britain rejoins Europe' },
  layer: 2,
  // beat 14.04: label 15.34, tags 15.69, outline 17.04–18.54, name 18.29
  cues(d) {
    return [
      { t: 1.3, name: 'blip', gain: 0.18, pitch: 1.05 },
      { t: 1.65, name: 'tick', gain: 0.12, pitch: 1.3 },
      { t: 3.0, name: 'shimmer', gain: 0.16, pitch: 1.1 },        // outline draws
      { t: 4.25, name: 'ping', gain: 0.24, pitch: 0.95 },         // DOGGERLAND
    ];
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    if (v.gt < tm.draw0 || v.gt > v.tl.scenes[3].start + 0.6) return;
    const k = L.ease.inOutCubic(L.prog(v.gt, tm.draw0, tm.draw));
    const wash = L.ease.outCubic(L.prog(v.gt, tm.draw0 + tm.draw * 0.6, 0.8));
    drawDoggerOutline(ctx, v, k, wash, away(v));
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    L.bigLabel(ctx, { x: 80, y: 560, big: '−60 m', small: 'Britain joins Europe', k: Math.min(v.k, L.prog(v.gt, tm.label, 0.6)), accent: v.accent, size: 110 });
    const kl = Math.min(v.k, L.prog(v.gt, tm.lands, 0.5));
    const br = project(v, 52.7, -1.5), eu = project(v, 50.75, 4.6);
    tag(ctx, 'BRITAIN', br.x, br.y, kl * L.clamp(br.z * 5), { size: 22, maxW: 200, align: 'center', plate: 0.8 });
    tag(ctx, 'EUROPE', Math.min(eu.x, 940 - 70), eu.y, Math.min(v.k, L.prog(v.gt, tm.lands + 0.08, 0.5)) * L.clamp(eu.z * 5), { size: 22, maxW: 200, align: 'center', plate: 0.8 });
    const dg = project(v, 54.4, 5.0);
    tag(ctx, 'DOGGERLAND', dg.x, dg.y, Math.min(v.k, L.prog(v.gt, tm.name, 0.55)) * L.clamp(dg.z * 5),
      { size: 36, track: 6, maxW: 560, align: 'center', sub: 'FLOODED ≈ 8,000 YEARS AGO', col: [236, 246, 255] });
  },
};
