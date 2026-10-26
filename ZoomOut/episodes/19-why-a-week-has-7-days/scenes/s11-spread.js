// Beat 11 — "Christianity and Islam later carried it across the world."
// The camera pulls back to the real globe, turning to the Old World. On it (pinned with env's project(), so it rides
// the rotation), the seven-day week spreads as light:
//   * "Christianity": a warm hub flares at Jerusalem; arcs fly out to Rome, Antioch, Alexandria, then on to
//     Carthage, Gaul, Hispania, Britain, Constantinople, Armenia, Axum, Kyiv, Scandinavia;
//   * "and Islam": a jade hub flares at Mecca; arcs fly to Medina, Damascus, Cairo, Baghdad, Kairouan, Córdoba,
//     Isfahan, Samarkand, Delhi, Timbuktu, Zanzibar, Malacca;
//   * "across the world": a gold ring sweeps round the globe's limb.
// Each arrival leaves a glowing dot and a ring pulse. Label "worldwide" with a colour legend.
// The arcs are a stylised diffusion (no dates claimed), the cities are real.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, EARTH, project } from '../env.js';
import { TL } from './s12-roman-days.js';

const DEG = Math.PI / 180;
const C_COL = [255, 232, 176], I_COL = [140, 222, 192];
const P = {
  jerusalem: [31.78, 35.22], rome: [41.9, 12.5], antioch: [36.2, 36.15], alexandria: [31.2, 29.9], carthage: [36.85, 10.3],
  lyon: [45.76, 4.84], toledo: [39.86, -4.03], london: [51.5, -0.12], constantinople: [41.0, 28.98], armenia: [40.2, 44.5],
  axum: [14.13, 38.72], kyiv: [50.45, 30.52], uppsala: [59.86, 17.64], moscow: [55.75, 37.6],
  mecca: [21.42, 39.83], medina: [24.47, 39.61], damascus: [33.51, 36.29], cairo: [30.04, 31.24], baghdad: [33.31, 44.36],
  kairouan: [35.68, 10.1], cordoba: [37.88, -4.78], isfahan: [32.65, 51.67], samarkand: [39.65, 66.96], delhi: [28.6, 77.2],
  timbuktu: [16.77, -3.0], zanzibar: [-6.16, 39.2], malacca: [2.2, 102.2],
};
// [from, to, start (beat s)]
const C_EDGES = [
  ['jerusalem', 'rome', 0.95], ['jerusalem', 'antioch', 1.02], ['jerusalem', 'alexandria', 1.08],
  ['antioch', 'constantinople', 1.25], ['rome', 'carthage', 1.3], ['rome', 'lyon', 1.35], ['antioch', 'armenia', 1.4],
  ['alexandria', 'axum', 1.45], ['rome', 'toledo', 1.55], ['lyon', 'london', 1.65], ['constantinople', 'kyiv', 1.7],
  ['lyon', 'uppsala', 1.85], ['kyiv', 'moscow', 2.0],
];
const I_EDGES = [
  ['mecca', 'medina', 1.25], ['mecca', 'damascus', 1.3], ['mecca', 'cairo', 1.36], ['damascus', 'baghdad', 1.55],
  ['cairo', 'kairouan', 1.6], ['mecca', 'zanzibar', 1.7], ['baghdad', 'isfahan', 1.75], ['kairouan', 'cordoba', 1.85],
  ['isfahan', 'samarkand', 1.95], ['kairouan', 'timbuktu', 2.0], ['isfahan', 'delhi', 2.05], ['delhi', 'malacca', 2.3],
];
const HUBS = [['jerusalem', 0.8, C_COL], ['mecca', 1.08, I_COL]];
const T_LABEL = 1.95, T_RING = 2.38;

const unit = ([lat, lon]) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
function slerpLL(a, b, u) {
  const A = unit(a), B = unit(b);
  const dot = L.clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1), om = Math.acos(dot);
  if (om < 1e-6) return { lat: a[0], lon: a[1], om };
  const sa = Math.sin((1 - u) * om) / Math.sin(om), sb = Math.sin(u * om) / Math.sin(om);
  const x = sa * A[0] + sb * B[0], y = sa * A[1] + sb * B[1], z = sa * A[2] + sb * B[2];
  return { lat: Math.asin(L.clamp(z, -1, 1)) / DEG, lon: Math.atan2(y, x) / DEG, om };
}
const edgeDur = (om) => 0.38 + 0.35 * om;
// depth fade: hidden behind the limb, already half-solid at the limb (z -0.05), fully solid from z 0
const vis = (z) => L.clamp((z + 0.1) * 10);

function arcPts(v, a, b, f) {
  const om = slerpLL(a, b, 0).om;
  const n = Math.max(6, Math.round(28 * om)) ;
  const out = [];
  const lift = EARTH.r * 0.16 * om;
  for (let j = 0; j <= n; j++) {
    const u = (j / n) * f;
    const q = slerpLL(a, b, u);
    const p = project(v, q.lat, q.lon, lift * Math.sin(Math.PI * u));
    out.push(p);
  }
  return out;
}

// Stroke a polyline as a few contiguous runs, one path each, so joints never double up (no beading).
// alphas[j] is segment j's opacity; runs split only where the quantised opacity changes.
function strokeRuns(c, pts, alphas, rgb, mul, width) {
  c.lineWidth = width;
  let j = 0;
  while (j < alphas.length) {
    const q = Math.round(alphas[j] * 20) / 20;
    if (q <= 0.01) { j++; continue; }
    let e = j;
    while (e + 1 < alphas.length && Math.round(alphas[e + 1] * 20) / 20 === q) e++;
    c.strokeStyle = L.rgba(rgb, mul * q);
    c.beginPath(); c.moveTo(pts[j].x, pts[j].y);
    for (let m = j + 1; m <= e + 1; m++) c.lineTo(pts[m].x, pts[m].y);
    c.stroke();
    j = e + 1;
  }
}

// All arcs of all faiths: every dark under-stroke first, then every coloured stroke on top, then the heads.
function drawEdges(c, v, groups, k) {
  const t = v.t;
  const arcs = [];
  for (const [edges, col] of groups) {
    for (const [fa, tb, st] of edges) {
      const a = P[fa], b = P[tb];
      const om = slerpLL(a, b, 0).om;
      const dur = edgeDur(om);
      const f = L.ease.inOutCubic(L.prog(t, st, dur));
      if (f <= 0) continue;
      const pts = arcPts(v, a, b, f);
      // the arc fades back to a faint trace once it has landed
      const settle = 1 - 0.4 * L.ease.inOutCubic(L.prog(t, st + dur, 0.8));
      const al = [];
      for (let j = 0; j < pts.length - 1; j++) al.push(k * vis(Math.min(pts[j].z, pts[j + 1].z)) * settle);
      arcs.push({ pts, al, col, f });
    }
  }
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'butt';
  for (const A of arcs) strokeRuns(c, A.pts, A.al, [6, 8, 16], 0.55, 6);
  c.lineCap = 'round';
  for (const A of arcs) strokeRuns(c, A.pts, A.al, A.col, 0.95, 2.8);
  c.restore();
  for (const A of arcs) {
    if (A.f >= 1) continue;
    const h = A.pts[A.pts.length - 1];
    L.lightBlob(c, h.x, h.y, 20, A.col, 0.8 * k * vis(h.z));
  }
}

function dot(c, v, ll, t0, col, k, big = false) {
  const t = v.t;
  const ka = L.prog(t, t0, 0.35);
  if (ka <= 0) return;
  const p = project(v, ll[0], ll[1]);
  const a = k * vis(p.z);
  if (a <= 0.01) return;
  const e = L.ease.outBack(ka, 2);
  const tw = 1 + 0.15 * Math.sin(v.gt * 3 + ll[1]);
  L.lightBlob(c, p.x, p.y, (big ? 34 : 18) * tw, col, (big ? 0.7 : 0.55) * a);
  c.save();
  c.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.6), a);
  c.beginPath(); c.arc(p.x, p.y, Math.max(0, (big ? 5.5 : 3.6) * e), 0, Math.PI * 2); c.fill();
  // ring pulse on arrival (hubs pulse twice)
  for (let r = 0; r < (big ? 2 : 1); r++) {
    const kr = L.prog(t, t0 + r * 0.35, big ? 1.1 : 0.75);
    if (kr <= 0 || kr >= 1) continue;
    c.strokeStyle = L.rgba(col, 0.75 * (1 - kr) * a);
    c.lineWidth = big ? 2.5 : 1.6;
    c.beginPath(); c.arc(p.x, p.y, Math.max(0, (big ? 70 : 26) * L.ease.outCubic(kr)), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

function legendLabel(c, v, k) {
  if (k <= 0) return;
  L.bigLabel(c, { x: 100, y: 420, big: 'WORLDWIDE', small: '', k, accent: v.accent, size: 92 });
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.font = L.font(28, 600, L.FONT.body);
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
  const y = 470 + (1 - e) * 18;
  let x = 100;
  for (const [txt, col] of [['CHRISTIANITY', C_COL], ['ISLAM', I_COL]]) {
    c.fillStyle = L.rgba(col);
    c.beginPath(); c.arc(x + 8, y - 10, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(214,220,232,0.95)';
    x += 26 + L.trackedText(c, txt, x + 26, y, 3) + 40;
  }
  c.restore();
}

export default {
  beat: 11,
  chapter: { num: '11', title: 'The spread', sub: 'Christianity and Islam' },
  captions: true,
  layer: 0,
  cues(d) {
    const out = [
      { t: HUBS[0][1], name: 'bloom', gain: 0.28, pitch: 0.85 },
      { t: 0.98, name: 'swish', gain: 0.16, pitch: 1.0 },
      { t: HUBS[1][1], name: 'bloom', gain: 0.26, pitch: 1.12 },
      { t: 1.3, name: 'swish', gain: 0.14, pitch: 1.2 },
      { t: T_LABEL + 0.05, name: 'ping', gain: 0.18, pitch: 1.0 },
      { t: T_RING, name: 'shimmer', gain: 0.24, pitch: 0.95 },
    ];
    for (const [i, tt] of [[0, 1.3], [1, 1.6], [2, 1.9], [3, 2.2]]) out.push({ t: tt, name: 'blip', gain: 0.08, pitch: 1.3 + 0.1 * i });
    return out;
  },
  drawOverlay(c, v) {
    const t = v.t;
    // leave fast as the camera dives back into the sky (beat 12)
    const k = v.k * (1 - L.ease.inCubic(L.prog(t, v.d - 0.1, 0.3)));
    if (k <= 0.002) return;
    c.save();
    drawEdges(c, v, [[C_EDGES, C_COL], [I_EDGES, I_COL]], k);
    for (const [fa, tb, st, col] of [...C_EDGES.map((e) => [...e, C_COL]), ...I_EDGES.map((e) => [...e, I_COL])]) {
      dot(c, v, P[tb], st + edgeDur(slerpLL(P[fa], P[tb], 0).om), col, k);
    }
    for (const [h, t0, col] of HUBS) dot(c, v, P[h], t0, col, k, true);
    // "across the world": a gold ring sweeps round the limb
    const kr = L.prog(t, T_RING, 0.9);
    if (kr > 0) {
      const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(EARTH.r) + 6;
      const e = L.ease.inOutCubic(kr);
      // the ring starts from the Jerusalem hub's direction (where the spread began), not from the north pole
      const hp = project(v, P.jerusalem[0], P.jerusalem[1]);
      const a0 = Math.atan2(hp.y - cy, hp.x - cx);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = L.rgba(ACCENT, 0.7 * k);
      c.lineWidth = 3;
      c.shadowColor = L.rgba(ACCENT, 0.9); c.shadowBlur = 18;
      c.beginPath(); c.arc(cx, cy, Math.max(0, r), a0, a0 + Math.PI * 2 * e); c.stroke();
      if (e < 1) {
        const ha = a0 + Math.PI * 2 * e;
        L.lightBlob(c, cx + Math.cos(ha) * r, cy + Math.sin(ha) * r, 40, ACCENT, 0.8 * k);
      }
      c.restore();
    }
    c.restore();
    legendLabel(c, v, k * L.enter(t, T_LABEL, 0.55));
  },
};
