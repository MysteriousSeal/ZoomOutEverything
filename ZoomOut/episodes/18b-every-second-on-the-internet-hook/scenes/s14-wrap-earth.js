// Beat 14 — "That's enough to wrap around the Earth thirty-five times."
// Over the Indian Ocean, one cable (Aden - Colombo - Singapore) is picked out, then a line peels off it and winds
// round the planet like thread on a ball: 35 great-circle loops, one continuous curve whose loop plane precesses a
// little each turn. The curve lives in Earth-fixed coordinates (so it turns with the planet), lifted just off the
// surface; the near side is bright, the far side is hidden behind the disc (a faint ghost where it crosses it), and
// older loops settle dimmer so the newest loop always leads. A loop counter rides the label: "35×" / "around the
// Earth", landing on "thirty-five times".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CABLES, R_EARTH, DEG, viewOf, globeDisc } from '../env.js';
import { cableGeom, cableScreen, strokeSpan, alongAt } from './s13-cable-length.js';
import { labelScrim } from './s12-under-the-sea.js';

const TAU = Math.PI * 2;
const LOOPS = 35;
const SEG = 64;                                   // segments per loop

const IDX = CABLES.findIndex((c) => c.name.startsWith('Aden - Colombo'));
const G = cableGeom(CABLES[IDX].pts);
const F0 = 0.36;                                  // where on the cable the thread peels off (arc fraction)

// ------------------------------------------------------------------ the thread (Earth-fixed unit vectors, built once)
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
let THREAD = null;
function thread() {
  if (THREAD) return THREAD;
  // anchor: the peel-off point, and the cable's local direction there
  const a = G.len * F0;
  let q = 1; while (q < G.acc.length - 1 && G.acc[q] < a) q++;
  const a1 = norm(G.P[q]);
  const dir = norm(G.P[Math.min(G.P.length - 1, q + 2)].map((x, i) => x - G.P[Math.max(0, q - 2)][i]));
  const tang = norm(dir.map((x, i) => x - dot(dir, a1) * a1[i]));
  const a3 = norm(cross(a1, tang));            // loop 0 runs along the cable: its plane normal is a1 x tangent
  const a2 = cross(a3, a1);
  const pts = [];
  for (let k = 0; k <= LOOPS * SEG; k++) {
    const s = k / SEG;
    const gam = 0.72 * (1 - Math.cos(0.52 * s));   // tilt of the loop plane away from the anchor
    const phi = 0.41 * s;                          // precession
    const m = [0, 1, 2].map((i) => a3[i] * Math.cos(phi) + a2[i] * Math.sin(phi));
    const n = norm([0, 1, 2].map((i) => Math.cos(gam) * m[i] + Math.sin(gam) * a1[i]));
    const u = norm([0, 1, 2].map((i) => a1[i] - dot(a1, n) * n[i]));
    const w = cross(n, u);
    const c = Math.cos(TAU * s), sn = Math.sin(TAU * s);
    const lift = 1 + 0.012 * L.smoothstep(L.clamp(s / 0.6)) + 0.0005 * s;   // peels off, then stacks outward (~1.01-1.03 r)
    pts.push([0, 1, 2].map((i) => (c * u[i] + sn * w[i]) * lift));
  }
  THREAD = pts;
  return pts;
}

// beat-relative timing (line 14: 0.15-2.99 s; "thirty-five times" ≈ 2.2-2.9 s)
const T_PICK = 0.12, T_WIND = 0.6, D_WIND = 1.75, T_LAND = T_WIND + D_WIND;
/** Loops wound by t (0..35): slow first turn, a steady run, a soft landing on 35. */
function wound(t) {
  const f = L.prog(t, T_WIND, D_WIND);
  return LOOPS * (0.6 * L.ease.inOutCubic(f) + 0.4 * f);   // eased in and out, never stalling mid-run
}

export default {
  beat: 14,
  chapter: { num: '14', title: '35 times around', sub: 'The Earth' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T_PICK, name: 'blip', gain: 0.15, pitch: 1.1 },
      { t: T_WIND, name: 'swish', gain: 0.2, pitch: 0.9 },
      { t: T_WIND + 0.3, name: 'riser', gain: 0.2, pitch: 1.0 },
      { t: T_LAND, name: 'impact', gain: 0.4, pitch: 1.0 },
      { t: T_LAND + 0.03, name: 'shimmer', gain: 0.2, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    const s14 = v.tl.scenes[14];
    if (v.gt < s14.start || v.gt > s14.end + 0.6) return;
    const t = v.t;
    const out = 1 - L.ease.inCubic(L.prog(v.gt, s14.end - 0.2, 0.55));
    if (out <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // ---- 1. the source cable, picked out
    const pick = L.ease.outCubic(L.prog(t, T_PICK, 0.45)) * out * (1 - 0.6 * L.prog(t, T_LAND, 0.8));
    if (pick > 0) {
      const S = cableScreen(v, G);
      strokeSpan(ctx, G, S, 0, 1);
      ctx.strokeStyle = L.rgba(ACCENT, 0.42 * pick); ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = L.rgba([225, 240, 255], 0.95 * pick); ctx.lineWidth = 2.6; ctx.stroke();
      // a bright bead runs along the cable and arrives at the peel-off point as the winding starts
      const run = L.ease.inOutCubic(L.prog(t, T_PICK + 0.05, T_WIND - T_PICK - 0.05));
      const bead = alongAt(G, S, F0 * run);
      const bk = pick * (1 - L.prog(t, T_WIND + 0.35, 0.4));
      if (bead[2] > 0.02 && bk > 0) {
        L.lightBlob(ctx, bead[0], bead[1], 34, ACCENT, 0.8 * bk);
        ctx.fillStyle = L.rgba([245, 250, 255], bk);
        ctx.beginPath(); ctx.arc(bead[0], bead[1], 3.4, 0, TAU); ctx.fill();
      }
    }

    // ---- 2. the thread
    const W_ = wound(t);
    if (W_ > 0) {
      const P = thread(), B = viewOf(v), g = globeDisc(v);
      const n = Math.min(P.length - 1, Math.floor(W_ * SEG));
      const sx = (p) => v.wx(R_EARTH * dot(p, B.e)), sy = (p) => v.wy(-R_EARTH * dot(p, B.n));
      const S = new Array(n + 2);
      for (let k = 0; k <= n; k++) { const p = P[k]; S[k] = [sx(p), sy(p), dot(p, B.c)]; }
      // the partial last segment
      const fr = W_ * SEG - n;
      if (n < P.length - 1) {
        const a = P[n], b = P[n + 1], p = [0, 1, 2].map((i) => L.lerp(a[i], b[i], fr));
        S[n + 1] = [sx(p), sy(p), dot(p, B.c)];
      } else S.length = n + 1;
      const occluded = (q) => q[2] < 0 && Math.hypot(q[0] - g.x, q[1] - g.y) < g.r;
      // stroke loop by loop: age dims older loops; front / far side in two passes
      const cur = Math.floor(W_);
      for (let L0 = 0; L0 <= cur && L0 < LOOPS; L0++) {
        const age = W_ - (L0 + 1);
        const ak = age <= 0 ? 1 : L.lerp(1, 0.26, L.clamp(age / 3));
        const k0 = L0 * SEG, k1 = Math.min(S.length - 1, (L0 + 1) * SEG);
        if (k1 <= k0) continue;
        // three passes: the near face (full), toward the limb (dimmer, so the ball reads round), and the far side
        // behind the disc (a whisper, no glow) so the planet never looks transparent
        const cls = (q) => (occluded(q) ? 2 : q[2] < 0.32 ? 1 : 0);
        for (const pass of [0, 1, 2]) {
          ctx.beginPath();
          let pen = false, last = null;
          for (let k = k0; k <= k1; k++) {
            const q = S[k];
            if (cls(q) !== pass) { if (pen) ctx.lineTo(q[0], q[1]); pen = false; last = q; continue; }
            if (pen) ctx.lineTo(q[0], q[1]); else { if (last && pass !== 2 && cls(last) !== 2) ctx.moveTo(last[0], last[1]), ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); pen = true; }
            last = q;
          }
          if (pass === 0) {
            ctx.strokeStyle = L.rgba(ACCENT, 0.22 * ak * out); ctx.lineWidth = 4; ctx.stroke();
            ctx.strokeStyle = L.rgba([235, 244, 255], 0.85 * ak * out); ctx.lineWidth = 1.25; ctx.stroke();
          } else if (pass === 1) {
            ctx.strokeStyle = L.rgba(ACCENT, 0.1 * ak * out); ctx.lineWidth = 3; ctx.stroke();
            ctx.strokeStyle = L.rgba([215, 232, 255], 0.42 * ak * out); ctx.lineWidth = 1.1; ctx.stroke();
          } else {
            ctx.strokeStyle = L.rgba(ACCENT, 0.035 * ak * out); ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      // the head
      const h = S[S.length - 1];
      if (W_ < LOOPS && !occluded(h)) {
        L.lightBlob(ctx, h[0], h[1], 28, ACCENT, 0.85 * out);
        ctx.fillStyle = L.rgba([245, 250, 255], out);
        ctx.beginPath(); ctx.arc(h[0], h[1], 3, 0, TAU); ctx.fill();
      }
      // landing: a soft flash of the whole ball's rim
      const lf = L.prog(t, T_LAND, 0.9);
      if (lf > 0 && lf < 1) {
        ctx.strokeStyle = L.rgba(ACCENT, 0.5 * Math.sin(Math.PI * lf) * out);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(g.x, g.y, Math.max(0, g.r * (1.03 + 0.05 * L.ease.outCubic(lf))), 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const k = v.k * L.ease.outCubic(L.prog(t, T_WIND + 0.2, 0.45));
    if (k <= 0.001) return;
    // the count is read on the OUTPUT frame (not the motion-blur sub-frame), so no frame blends two numbers ("13" over "14")
    const tq = Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;
    const n = Math.max(1, Math.min(LOOPS, Math.ceil(wound(tq))));
    const land = L.prog(t, T_LAND, 0.5);
    const pop = land > 0 && land < 1 ? Math.sin(Math.PI * land) * 0.05 : 0;
    labelScrim(ctx, k);
    ctx.save();
    ctx.translate(96, 450); ctx.scale(1 + pop, 1 + pop); ctx.translate(-96, -450);
    L.bigLabel(ctx, { x: 96, y: 450, big: `${n}×`, small: 'around the Earth', k, accent: ACCENT, size: 116 });
    ctx.restore();
  },
};
