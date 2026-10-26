// Beat 13 — "About one point four million kilometers of cable lie on the ocean floor."
// The planet turns east to Europe / Africa. One cable (the West Africa system, Lisbon to Cape Town, ~16,000 km in
// this stylised route) is picked out: a bright accent comet runs it end to end, leaving it lit thicker than the
// rest, while a km counter races up and lands on "1,400,000 km" with the spoken number ("…million kilometers").
// After the landing, slow pulses keep running down the highlighted cable (secondary motion), and it hands over to
// beat 14, where a cable unspools into rings.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CABLES, DEG, viewOf, worldOf } from '../env.js';
import { labelScrim } from './s12-under-the-sea.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ a cable as a dense unit-vector polyline
const unit = (lat, lon) => { const p = lat * DEG, l = lon * DEG, cp = Math.cos(p); return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)]; };
function slerp(a, b, ang, t) {
  if (ang < 1e-9) return a;
  const s = Math.sin(ang), fa = Math.sin((1 - t) * ang) / s, fb = Math.sin(t * ang) / s;
  return [a[0] * fa + b[0] * fb, a[1] * fa + b[1] * fb, a[2] * fa + b[2] * fb];
}
/** {P: unit vectors, acc: cumulative angle, len} of a [lat, lon] route, sampled every ~0.5 deg. */
export function cableGeom(pts) {
  const P = [], acc = [0];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = unit(...pts[i]), b = unit(...pts[i + 1]);
    const ang = Math.acos(L.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
    const n = Math.max(1, Math.ceil(ang / (0.5 * DEG)));
    for (let k = i ? 1 : 0; k <= n; k++) {
      if (P.length) acc.push(acc[acc.length - 1] + ang / n);
      P.push(slerp(a, b, ang, k / n));
    }
  }
  return { P, acc, len: acc[acc.length - 1] };
}
/** Screen points [x, y, z] of a geometry now. */
export function cableScreen(v, G) {
  const B = viewOf(v);
  return G.P.map((p) => {
    const z = p[0] * B.c[0] + p[1] * B.c[1] + p[2] * B.c[2];
    const R = 6.371e6;
    return [v.wx(R * (p[0] * B.e[0] + p[1] * B.e[1])), v.wy(-R * (p[0] * B.n[0] + p[1] * B.n[1] + p[2] * B.n[2])), z];
  });
}
/** Point at arc fraction f (0..1) along a geometry's screen points. */
export function alongAt(G, S, f) {
  const a = L.clamp(f) * G.len;
  let q = 1; while (q < G.acc.length - 1 && G.acc[q] < a) q++;
  const u = (a - G.acc[q - 1]) / Math.max(1e-9, G.acc[q] - G.acc[q - 1]);
  return [L.lerp(S[q - 1][0], S[q][0], u), L.lerp(S[q - 1][1], S[q][1], u), L.lerp(S[q - 1][2], S[q][2], u)];
}
/** Stroke the part of the screen polyline between arc fractions f0..f1 (front side only). */
export function strokeSpan(c, G, S, f0, f1) {
  const a0 = f0 * G.len, a1 = f1 * G.len;
  c.beginPath();
  let pen = false;
  for (let q = 0; q < S.length; q++) {
    if (G.acc[q] < a0) continue;
    if (G.acc[q] > a1) {
      if (pen) { const p = alongAt(G, S, f1); c.lineTo(p[0], p[1]); }
      break;
    }
    const [x, y, z] = S[q];
    if (z < 0.02) { pen = false; continue; }
    if (!pen) { const p = q > 0 && G.acc[q - 1] < a0 ? alongAt(G, S, f0) : S[q]; c.moveTo(p[0], p[1]); pen = true; if (p !== S[q]) c.lineTo(x, y); }
    else c.lineTo(x, y);
  }
}

const IDX = CABLES.findIndex((c) => c.name.startsWith('West Africa'));
const G = cableGeom(CABLES[IDX].pts);

// beat-relative timing (line 13 starts 0.15 s in; "...million kilometers" ≈ 1.6-2.3 s)
const T_PICK = 0.35, T_RUN = 0.55, D_RUN = 1.85, T_COUNT = 0.5, D_COUNT = 1.75;

export default {
  beat: 13,
  chapter: { num: '13', title: '1.4 million km', sub: 'Of undersea cable' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: T_PICK, name: 'blip', gain: 0.16, pitch: 1.2 },
      { t: T_RUN, name: 'riser', gain: 0.18, pitch: 1.0 },
      { t: T_COUNT + 0.05, name: 'count', gain: 0.2, pitch: 1.0 },
      { t: T_COUNT + D_COUNT, name: 'impact', gain: 0.4, pitch: 0.9 },
      { t: T_COUNT + D_COUNT + 0.04, name: 'ping', gain: 0.2, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    const s = v.tl.scenes[13];
    if (v.gt < s.start || v.gt > s.end + 0.35) return;
    const t = v.t;
    const out = 1 - L.ease.inCubic(L.prog(v.gt, s.end - 0.15, 0.45));   // gone before beat 14 picks its own cable
    const pick = L.ease.outCubic(L.prog(t, T_PICK, 0.5)) * out;
    if (pick <= 0.001) return;
    const S = cableScreen(v, G);
    const run = L.ease.inOutCubic(L.prog(t, T_RUN, D_RUN));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // whole cable: picked out with a faint wide halo
    strokeSpan(ctx, G, S, 0, 1);
    ctx.strokeStyle = L.rgba(ACCENT, 0.16 * pick);
    ctx.lineWidth = 9;
    ctx.stroke();
    // the run: lit behind the comet head, thicker than every other cable
    if (run > 0) {
      strokeSpan(ctx, G, S, 0, run);
      ctx.strokeStyle = L.rgba(ACCENT, 0.4 * out);
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = L.rgba([215, 236, 255], 0.95 * out);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // comet tail + head
      if (run < 1) {
        const tail = Math.max(0, run - 0.12);
        for (let q = 0; q < 6; q++) {
          const f0 = L.lerp(tail, run, q / 6), f1 = L.lerp(tail, run, (q + 1) / 6);
          strokeSpan(ctx, G, S, f0, f1);
          ctx.strokeStyle = L.rgba([235, 246, 255], 0.5 * ((q + 1) / 6) * out);
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        const h = alongAt(G, S, run);
        if (h[2] > 0.02) {
          L.lightBlob(ctx, h[0], h[1], 46, ACCENT, 0.85 * out);
          ctx.fillStyle = L.rgba([245, 250, 255], out);
          ctx.beginPath(); ctx.arc(h[0], h[1], 4, 0, TAU); ctx.fill();
        }
      }
    }
    // end caps: the two landing stations, the far one flashes when the comet arrives
    const a = alongAt(G, S, 0), b = alongAt(G, S, 1);
    ctx.fillStyle = L.rgba([235, 246, 255], pick);
    if (a[2] > 0.02) { ctx.beginPath(); ctx.arc(a[0], a[1], 3.6, 0, TAU); ctx.fill(); }
    const land = L.prog(t, T_RUN + D_RUN, 0.9);
    if (land > 0 && b[2] > 0.02) {
      ctx.beginPath(); ctx.arc(b[0], b[1], 3.6, 0, TAU); ctx.fill();
      if (land < 1) {
        ctx.strokeStyle = L.rgba(ACCENT, 0.85 * (1 - land) * out);
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(b[0], b[1], Math.max(0, 4 + 30 * L.ease.outCubic(land)), 0, TAU); ctx.stroke();
      }
    }
    // after the landing: slow pulses down the cable
    const pk = L.ease.outCubic(L.prog(t, T_RUN + D_RUN + 0.2, 0.6)) * out;
    if (pk > 0) {
      for (let m = 0; m < 4; m++) {
        const f = ((t - (T_RUN + D_RUN)) * 0.11 + m / 4) % 1;
        const p = alongAt(G, S, f);
        if (p[2] < 0.03) continue;
        L.lightBlob(ctx, p[0], p[1], 16, ACCENT, 0.55 * pk);
        ctx.fillStyle = L.rgba([235, 246, 255], 0.9 * pk);
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const k = v.k * L.ease.outCubic(L.prog(t, T_COUNT - 0.15, 0.45));
    if (k <= 0.001) return;
    // 18b: the count runs on output-frame time, so motion-blur sub-frames never blend two values
    const f = L.ease.outQuint(L.prog(t + (Math.round(v.gt * 30) / 30 - v.gt), T_COUNT, D_COUNT));
    const val = f >= 1 ? 1.4e6 : Math.round((1.4e6 * f) / 1000) * 1000;
    const land = L.prog(t, T_COUNT + D_COUNT, 0.5);
    const pop = land > 0 && land < 1 ? Math.sin(Math.PI * land) * 0.035 : 0;
    labelScrim(ctx, k);
    ctx.save();
    // a tiny scale "pop" on the landing, anchored at the label's left edge
    ctx.translate(96, 450); ctx.scale(1 + pop, 1 + pop); ctx.translate(-96, -450);
    L.bigLabel(ctx, { x: 96, y: 450, big: `${L.fmt(val)} km`, small: '870,000 mi of cable on the seabed', k, accent: ACCENT, size: 104 });
    ctx.restore();
  },
};
