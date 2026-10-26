// Beat 11 — "And to cross from one continent to another, | the data doesn't fly through space."
// The whole night globe over the Atlantic.
//   * Phrase 1: a single data packet leaves New York and arcs over the ocean to Western Europe: a thin accent arc
//     that bulges off the surface (great circle, lifted by a sine), so the eye reads "crossing between continents".
//   * Phrase 2: the obvious guess, space. A low-Earth-orbit shell appears: three tilted orbital planes at
//     R + 550 km trace themselves round the planet, each carrying a string of tiny satellites (back halves hidden by
//     the globe). On "space" the arc and the shell dim right down, leaving a sliver: "< 1%" / "goes by satellite".
// Everything here is a pure function of time; orbits live in the camera frame (they do not spin with the planet).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, R_EARTH, DEG, project, globeDisc } from '../env.js';
import { franceLabel } from './s10-france.js';

const TAU = Math.PI * 2;
const ph = (tl, i, j, e = 'start') => tl.lines[i].phrases[j][e];

// orbital planes: tilt toward the camera (i) and screen rotation (phi); dots per plane; angular speed (rad/s)
const PLANES = [
  { i: 0.36, phi: -0.42, n: 22, w: 0.16, off: 0.0 },
  { i: 0.30, phi: 0.5, n: 20, w: -0.13, off: 1.7 },
  { i: 0.55, phi: 0.06, n: 18, w: 0.11, off: 3.1 },
];
const ALT = 550e3;

/** 3-D position (camera frame: x right, y down, z toward the camera; units of the orbit radius) on plane P. */
function orbitPt(P, th) {
  const ci = Math.cos(P.i), si = Math.sin(P.i), cp = Math.cos(P.phi), sp = Math.sin(P.phi);
  const ux = Math.cos(th), wy = si * Math.sin(th), wz = ci * Math.sin(th);
  return { x: ux * cp - wy * sp, y: ux * sp + wy * cp, z: wz };
}

/** Timing in beat-relative seconds, from the phrase times. */
function times(v) {
  const s = v.tl.scenes[11].start;
  return {
    arc0: ph(v.tl, 11, 0) - s + 0.35,          // the packet leaves NY
    sat0: ph(v.tl, 11, 0, 'end') - s - 0.05,   // end of phrase 1: the obvious guess, the shell traces on
    dim: ph(v.tl, 11, 1) - s + 0.4,            // "...doesn't fly through space": dim to a sliver (done before the label lands)
  };
}

// the hop: New York -> Cornwall
const A = [40.7, -74.0], B = [50.1, -5.5];
function slerpLL(a, b, f) {
  const u = (la, lo) => [Math.cos(la * DEG) * Math.cos(lo * DEG), Math.cos(la * DEG) * Math.sin(lo * DEG), Math.sin(la * DEG)];
  const p = u(...a), q = u(...b);
  const ang = Math.acos(L.clamp(p[0] * q[0] + p[1] * q[1] + p[2] * q[2], -1, 1));
  const s = Math.sin(ang), fa = Math.sin((1 - f) * ang) / s, fb = Math.sin(f * ang) / s;
  const r = [p[0] * fa + q[0] * fb, p[1] * fa + q[1] * fb, p[2] * fa + q[2] * fb];
  return [Math.asin(L.clamp(r[2], -1, 1)) / DEG, Math.atan2(r[1], r[0]) / DEG];
}

export default {
  beat: 11,
  chapter: { num: '11', title: 'Not through space', sub: 'Satellites carry a sliver' },
  captions: true,
  layer: 2,
  cues(d) {
    // offsets from build/timeline.json (phrase 1 starts 0.15 s in, ends 2.36 s; phrase 2 starts 2.96 s)
    return [
      { t: 0.5, name: 'swish', gain: 0.16, pitch: 1.2 },
      { t: 2.0, name: 'blip', gain: 0.14, pitch: 1.3 },
      { t: 2.32, name: 'shimmer', gain: 0.2, pitch: 1.2 },
      { t: 3.36, name: 'deep', gain: 0.24, pitch: 0.8 },
      { t: 3.52, name: 'tick', gain: 0.16, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    const s = v.tl.scenes[11];
    if (v.gt < s.start - 0.1 || v.gt > s.end + 0.5) return;
    const T = times(v), t = v.t;
    const out = 1 - L.ease.inCubic(L.prog(v.gt, s.end - 0.15, 0.45));   // exit, faster than the entrance
    const dim = L.ease.inOutCubic(L.prog(t, T.dim, 0.5));
    const g = globeDisc(v);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';

    // ---- 1. the hop between continents (rises off the surface by a sine bulge)
    const fa = L.ease.inOutCubic(L.prog(t, T.arc0, 1.5));
    const arcK = out * L.lerp(1, 0.18, dim) * L.ease.outCubic(L.prog(t, T.arc0 - 0.1, 0.3));
    if (fa > 0 && arcK > 0.001) {
      const N = 60, pts = [];
      for (let q = 0; q <= N * fa; q++) {
        const f = q / N;
        const [la, lo] = slerpLL(A, B, f);
        pts.push(project(v, la, lo, 900e3 * Math.sin(Math.PI * f)));
      }
      ctx.beginPath(); pts.forEach((p, q) => (q ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = L.rgba(ACCENT, 0.25 * arcK); ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = L.rgba([190, 225, 255], 0.9 * arcK); ctx.lineWidth = 1.6; ctx.stroke();
      // end points (two continents) and the packet head
      const a0 = project(v, ...A);
      ctx.fillStyle = L.rgba([220, 238, 255], arcK);
      ctx.beginPath(); ctx.arc(a0.x, a0.y, 3, 0, TAU); ctx.fill();
      const h = pts[pts.length - 1];
      if (fa < 1) { L.lightBlob(ctx, h.x, h.y, 26, ACCENT, 0.8 * arcK); ctx.beginPath(); ctx.arc(h.x, h.y, 3.2, 0, TAU); ctx.fill(); }
      else {
        const b0 = project(v, ...B), pk = L.prog(t, T.arc0 + 1.5, 0.7);
        ctx.beginPath(); ctx.arc(b0.x, b0.y, 3, 0, TAU); ctx.fill();
        if (pk > 0 && pk < 1) {
          ctx.strokeStyle = L.rgba(ACCENT, (1 - pk) * 0.8 * arcK); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(b0.x, b0.y, Math.max(0, 4 + 22 * L.ease.outCubic(pk)), 0, TAU); ctx.stroke();
        }
      }
    }

    // ---- 2. the LEO shell
    const ro = v.ws(R_EARTH + ALT);
    const shellK = out * L.lerp(1, 0.16, dim);
    PLANES.forEach((P, pi) => {
      const tr = L.ease.inOutCubic(L.prog(t, T.sat0 + pi * 0.18, 1.35));
      if (tr <= 0 || shellK <= 0.001) return;
      const th0 = P.off - 0.5 * Math.PI;            // trace starts at the front
      const N = 140, M = Math.ceil(N * tr);
      // orbit line: front segments brighter, the far side hidden behind the disc
      let prev = null;
      for (let q = 0; q <= M; q++) {
        const th = th0 + TAU * Math.min(tr, q / N);
        const o = orbitPt(P, th);
        const x = g.x + o.x * ro, y = g.y + o.y * ro;
        const hidden = o.z < 0 && Math.hypot(x - g.x, y - g.y) < g.r;
        if (prev && !(hidden || prev.hidden)) {
          ctx.strokeStyle = L.rgba([120, 190, 255], (o.z > 0 ? 0.62 : 0.3) * shellK);
          ctx.lineWidth = o.z > 0 ? 1.3 : 1;
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke();
        }
        prev = { x, y, hidden };
      }
      // satellites: born behind the trace head, drifting along the orbit
      const head = TAU * tr;
      for (let m = 0; m < P.n; m++) {
        const base = (m / P.n) * TAU;
        if (base > head - 0.05) continue;
        const th = th0 + base + P.w * Math.max(0, t - T.sat0);
        const o = orbitPt(P, th);
        const x = g.x + o.x * ro, y = g.y + o.y * ro;
        if (o.z < 0 && Math.hypot(x - g.x, y - g.y) < g.r) continue;
        const born = L.clamp((head - base) / 0.6);
        const a = shellK * born * (o.z > 0 ? 1 : 0.6);
        // the sliver that survives the dim: one satellite per plane stays bright
        const keep = m === 3 ? L.lerp(1, 1 / 0.16, dim) : 1;
        ctx.fillStyle = L.rgba([225, 240, 255], Math.min(1, 0.95 * a * keep));
        ctx.fillRect(x - 1.8, y - 1.8, 3.6, 3.6);
        L.lightBlob(ctx, x, y, 10, ACCENT, 0.5 * a * keep);
      }
      // trace head
      if (tr < 1) {
        const o = orbitPt(P, th0 + head);
        const x = g.x + o.x * ro, y = g.y + o.y * ro;
        if (!(o.z < 0 && Math.hypot(x - g.x, y - g.y) < g.r)) L.lightBlob(ctx, x, y, 18, ACCENT, 0.7 * shellK);
      }
    });
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    // beat 10's France label holds across the cut, fading with France itself
    if (v.gt >= v.tl.scenes[11].start + 0.05) franceLabel(ctx, v);
    const T = times(v);
    const k = v.k * L.ease.outCubic(L.prog(v.t, T.dim + 0.15, 0.5));
    if (k <= 0.001) return;
    L.bigLabel(ctx, { x: 96, y: 450, big: '< 1%', small: 'goes by satellite', k, accent: ACCENT, size: 116 });
  },
};
