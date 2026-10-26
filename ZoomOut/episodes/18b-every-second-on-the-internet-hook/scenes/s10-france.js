// Beat 10 — "Roughly as much as the whole of France."
// The camera lifts off New York and the planet turns east to France. As France arrives, its outline (a hand-built
// lat/lon polygon of the mainland + Corsica) traces itself in the accent from Brest, round the coast and the land
// borders, then a soft accent fill and a slow light sweep settle inside it. Paris and Lyon brighten a touch (the
// country "switches on"). The outline stays glued to the globe and fades out as beat 11 pulls back to the whole
// planet, so France shrinks into the night side instead of popping off.
// Label: "≈ France" / "data centers ≈ 415 TWh · France ≈ 450 TWh" (the TWh figure is the data centres', not France's), landing on "whole of France". During the travel New York's light
// (where s09's power lines converged) rides the turn as one point and an accent arc carries it to Brest.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, HOME, project, geoPath, viewOf, worldOf } from '../env.js';

const { W } = L;

// Metropolitan France, clockwise from Dunkirk (lat, lon). ~0.1-0.3 deg detail: coasts, Pyrenees, Alps, Rhine.
export const FRANCE = [
  [51.08, 2.53], [50.95, 1.85], [50.6, 1.58], [50.18, 1.62], [50.05, 1.42], [49.93, 1.08], [49.78, 0.5], [49.7, 0.18],
  [49.48, 0.1], [49.38, 0.0], [49.3, -0.3], [49.35, -0.9], [49.39, -1.18], [49.7, -1.27], [49.72, -1.6], [49.67, -1.94],
  [49.5, -1.86], [49.2, -1.6], [48.85, -1.58], [48.64, -1.5], [48.66, -1.95], [48.6, -2.3], [48.52, -2.68], [48.66, -2.95],
  [48.83, -3.2], [48.72, -3.6], [48.68, -4.05], [48.6, -4.55], [48.4, -4.78], [48.27, -4.45], [48.1, -4.32], [48.03, -4.72],
  [47.86, -4.32], [47.8, -3.9], [47.7, -3.45], [47.52, -3.12], [47.48, -2.6], [47.28, -2.52], [47.1, -2.2], [46.85, -2.12],
  [46.6, -1.85], [46.3, -1.4], [46.05, -1.12], [45.75, -1.22], [45.55, -1.06], [45.1, -1.17], [44.65, -1.24], [44.2, -1.3],
  [43.7, -1.42], [43.47, -1.56], [43.37, -1.78], [43.25, -1.5], [43.05, -1.3], [42.95, -0.75], [42.8, -0.3], [42.7, 0.3],
  [42.68, 0.75], [42.6, 1.4], [42.5, 1.75], [42.45, 2.2], [42.43, 2.75], [42.43, 3.17], [42.75, 3.05], [43.05, 3.05],
  [43.28, 3.45], [43.5, 3.95], [43.53, 4.3], [43.36, 4.65], [43.35, 5.05], [43.3, 5.35], [43.1, 5.75], [43.08, 6.15],
  [43.17, 6.6], [43.4, 6.85], [43.6, 7.1], [43.77, 7.5], [44.05, 7.7], [44.15, 7.3], [44.4, 6.9], [44.75, 6.95],
  [45.1, 6.65], [45.4, 7.1], [45.85, 6.95], [46.15, 6.85], [46.4, 6.75], [46.35, 6.25], [46.2, 5.98], [46.5, 6.1],
  [46.9, 6.5], [47.3, 7.0], [47.45, 6.95], [47.55, 7.5], [47.9, 7.6], [48.3, 7.75], [48.6, 7.85], [48.97, 8.2],
  [49.05, 7.7], [49.15, 7.0], [49.4, 6.5], [49.5, 5.9], [49.55, 5.45], [49.8, 4.85], [50.15, 4.75], [50.0, 4.2],
  [50.3, 3.7], [50.5, 3.3], [50.78, 3.1], [50.82, 2.6],
];
export const CORSICA = [
  [43.0, 9.42], [42.7, 9.46], [42.4, 9.55], [42.0, 9.42], [41.6, 9.3], [41.38, 9.2], [41.6, 8.78], [41.9, 8.62],
  [42.25, 8.55], [42.55, 8.7], [42.7, 9.1], [43.0, 9.42],
];
const PARIS = [48.86, 2.35], LYON = [45.76, 4.84];

const ph = (tl, i, j, e = 'start') => tl.lines[i].phrases[j][e];
// beat-relative timing
const T_TRACE = 0.9, D_TRACE = 0.95;       // outline traces on as France arrives under the camera
const T_FILL = 1.45;                       // fill + sweep
const T_LABEL = 1.0;                       // in by ~47.85, on "...the whole of France"
const BREST = [48.4, -4.78];

// ------------------------------------------------------------------ the New York -> France "power line"
// s09's converging lines collapse into New York's single glow, which rides the turn; a thin accent route
// runs from it across the Atlantic and hands over to the France outline exactly where the trace starts (Brest).
// the route follows the camera's own turn (a lat/lon lerp, like camera.face), so its head stays under the face point
const ARC = Array.from({ length: 61 }, (_, i) => [L.lerp(HOME.lat, BREST[0], i / 60), L.lerp(HOME.lon, BREST[1], i / 60)]);
function drawCrossing(ctx, v) {
  const t = v.t;
  const k = L.ease.outCubic(L.prog(t, -0.15, 0.35)) * (1 - L.ease.inCubic(L.prog(t, T_TRACE + 0.35, 0.55)));
  if (k <= 0.002) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // New York: the whole region's light, one point
  const ny = project(v, HOME.lat, HOME.lon);
  if (ny.z > 0.05) {
    const br = 0.85 + 0.15 * Math.sin(v.gt * 3.1);
    L.lightBlob(ctx, ny.x, ny.y, 70, ACCENT, 0.6 * k * br);
    L.lightBlob(ctx, ny.x, ny.y, 16, [235, 245, 255], 0.9 * k);
  }
  // the arc grows with the turn and lands on Brest as the trace begins
  // the head rides the turn: it sits where the globe's face has got to (near frame centre), trailing back to New York
  const B = viewOf(v);
  const frac = L.clamp((B.lon - HOME.lon) / (BREST[1] - HOME.lon));
  const g = t < 0 ? 0 : frac;   // Brest's longitude is passed before the face settles on France
  if (g > 0) {
    const f = g * (ARC.length - 1), n = Math.floor(f);
    const pts = ARC.slice(0, n + 1);
    if (n < ARC.length - 1) {   // interpolated head, so it glides instead of stepping
      const A = ARC[n], Bq = ARC[n + 1], w = f - n;
      pts.push([L.lerp(A[0], Bq[0], w), L.lerp(A[1], Bq[1], w)]);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); geoPath(ctx, v, pts, false, 0.5);
    ctx.strokeStyle = L.rgba(ACCENT, 0.25 * k); ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = L.rgba([170, 215, 255], 0.85 * k); ctx.lineWidth = 1.8; ctx.stroke();
    const h = pts[pts.length - 1], q = project(v, h[0], h[1]);
    if (q.z > 0.05 && g < 1) {
      L.lightBlob(ctx, q.x, q.y, 44, ACCENT, 0.85 * k);
      L.lightBlob(ctx, q.x, q.y, 8, [235, 245, 255], 0.95 * k);
    }
  }
  ctx.restore();
}

/** Cumulative arc length (deg-ish) of a closed polygon, for partial tracing. */
function lengths(P) {
  const acc = [0];
  for (let i = 1; i <= P.length; i++) {
    const a = P[i - 1], b = P[i % P.length];
    acc.push(acc[i - 1] + Math.hypot(b[0] - a[0], (b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180)));
  }
  return acc;
}
const ACC_FR = lengths(FRANCE);
// start the trace at Brest so the line runs down the Atlantic coast first (index of the Brest point)
const START = FRANCE.findIndex((p) => p[0] === 48.4 && p[1] === -4.78);

/** Screen points of the polygon (front side only, it is always on the near side while visible). */
function screenPts(v, P) {
  return P.map(([la, lo]) => project(v, la, lo));
}

/** France's on-screen footprint (centre + rough radius px) — also used for the label leader. */
function frBox(S) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of S) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: Math.max(x1 - x0, y1 - y0) / 2 };
}

/** Visibility of the France layer at beat-relative t: traces on in beat 10, fades during beat 11's pull-back. */
function layerK(v) {
  const s11 = v.tl.scenes[11];
  const out = 1 - L.ease.inOutCubic(L.prog(v.gt, s11.start + 0.6, 1.6));
  return v.t < 0 ? 0 : out;
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'As much as France', sub: 'Data centers ≈ 415 TWh' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: T_TRACE + 0.05, name: 'shimmer', gain: 0.16, pitch: 1.1 },
      { t: T_FILL, name: 'bloom', gain: 0.24, pitch: 0.9 },
      { t: T_LABEL + 0.05, name: 'ping', gain: 0.2, pitch: 1.05 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t > -0.2 && v.t < T_TRACE + 1) drawCrossing(ctx, v);
    const lk = layerK(v);
    if (lk <= 0.001 || v.t < T_TRACE - 0.1 || v.cam.mpp > 40000) return;
    const B = viewOf(v);
    const c0 = worldOf(B, 46.6, 2.4);
    if (c0.z < 0.15) return;
    const S = screenPts(v, FRANCE);
    const bx = frBox(S);
    if (bx.x1 < -50 || bx.x0 > W + 50 || bx.y1 < -50 || bx.y0 > L.H + 50) return;
    const t = v.t;
    const tr = L.ease.inOutCubic(L.prog(t, T_TRACE, D_TRACE));
    const fk = L.ease.outCubic(L.prog(t, T_FILL, 0.7)) * lk;
    const small = bx.r < 60;                     // whole-globe scale: keep it delicate
    const lw = small ? 1.2 : 2.2;

    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // ---- soft fill + a slow light sweep, clipped to the country
    if (fk > 0.001) {
      ctx.save();
      ctx.beginPath();
      geoPath(ctx, v, FRANCE, true, 0.25);
      ctx.closePath();
      geoPath(ctx, v, CORSICA, true, 0.25);
      ctx.closePath();
      ctx.fillStyle = L.rgba(ACCENT, 0.16 * fk);
      ctx.fill();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      // a diagonal band of light drifting across (secondary motion)
      const sw = L.prog(t, T_FILL, 2.2);
      const sx = L.lerp(bx.x0 - bx.r * 1.2, bx.x1 + bx.r * 1.2, L.ease.inOutCubic(sw));
      const g = ctx.createLinearGradient(sx - bx.r * 0.6, bx.cy - bx.r * 0.3, sx + bx.r * 0.6, bx.cy + bx.r * 0.3);
      g.addColorStop(0, L.rgba(ACCENT, 0));
      g.addColorStop(0.5, L.rgba([140, 200, 255], 0.2 * fk * (1 - sw * 0.5)));
      g.addColorStop(1, L.rgba(ACCENT, 0));
      ctx.fillStyle = g;
      ctx.fillRect(bx.x0 - 10, bx.y0 - 10, bx.x1 - bx.x0 + 20, bx.y1 - bx.y0 + 20);
      // the country's grid "switching on": Paris + Lyon
      for (const [p, a] of [[PARIS, 1], [LYON, 0.6]]) {
        const q = project(v, p[0], p[1]);
        L.lightBlob(ctx, q.x, q.y, bx.r * 0.45, [255, 205, 150], 0.22 * a * fk);
      }
      ctx.restore();
    }

    // ---- the outline: traced on from Brest, with a glow underlay and a bright travelling head
    if (tr > 0) {
      const n = FRANCE.length, total = ACC_FR[n];
      const until = tr * total;
      const pts = [];
      let walked = 0;
      for (let q = 0; q <= n; q++) {
        const i = (START + q) % n, j = (START + q + 1) % n;
        pts.push(S[i]);
        if (q === n) break;
        const segLen = ACC_FR[i + 1] - ACC_FR[i];
        if (walked + segLen > until) {
          const f = (until - walked) / Math.max(1e-6, segLen);
          pts.push({ x: L.lerp(S[i].x, S[j].x, f), y: L.lerp(S[i].y, S[j].y, f) });
          break;
        }
        walked += segLen;
      }
      const path = () => { ctx.beginPath(); pts.forEach((p, q) => (q ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); };
      ctx.globalCompositeOperation = 'lighter';
      path();
      ctx.strokeStyle = L.rgba(ACCENT, 0.28 * lk);
      ctx.lineWidth = lw * 4.5;
      ctx.stroke();
      ctx.strokeStyle = L.rgba([170, 215, 255], 0.95 * lk);
      ctx.lineWidth = lw;
      ctx.stroke();
      if (tr < 1) {
        const h = pts[pts.length - 1];
        L.lightBlob(ctx, h.x, h.y, small ? 14 : 34, ACCENT, 0.8 * lk);
        ctx.fillStyle = L.rgba([235, 245, 255], 0.95 * lk);
        ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(0, lw * 1.4), 0, Math.PI * 2); ctx.fill();
      }
      // Corsica draws in once the mainland closes
      const ck = L.ease.outCubic(L.prog(t, T_TRACE + D_TRACE * 0.85, 0.4)) * lk;
      if (ck > 0) {
        ctx.beginPath(); geoPath(ctx, v, CORSICA, true, 0.25);
        ctx.strokeStyle = L.rgba([170, 215, 255], 0.9 * ck);
        ctx.lineWidth = lw * 0.85;
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    // until the cut; s11 carries the same label on (franceLabel) so it outlives the beat boundary
    if (v.gt >= v.tl.scenes[11].start + 0.05) return;
    franceLabel(ctx, v);
  },
};

/** "≈ France" label as a pure function of global time: lands on "whole of France" and fades out just before the
 *  cut (s11 - 0.45 .. - 0.05), so nothing lingers into beat 11. */
export function franceLabel(ctx, v) {
  const s10 = v.tl.scenes[10], s11 = v.tl.scenes[11];
  const kin = L.ease.outCubic(L.prog(v.gt, s10.start + T_LABEL, 0.55));
  // gone by the cut (no ghost into "And to cross...", no 1-frame dip where s10's overlay hands over to s11's)
  const kout = 1 - L.ease.inOutCubic(L.prog(v.gt, s11.start - 0.45, 0.4));
  const k = Math.min(kin, kout);
  if (k <= 0.001) return;
  L.bigLabel(ctx, { x: 96, y: 500, big: '≈ France', small: 'data centers ≈ 415 TWh · France ≈ 450 TWh', k, accent: ACCENT, size: 116 });
}
