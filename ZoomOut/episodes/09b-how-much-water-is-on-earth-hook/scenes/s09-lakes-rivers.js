// Beat 9 — "And the fresh water in every lake and river on the planet?"
// A small drop buds off the right side of the fresh-water ball (273 km), stretches on a liquid neck, snaps free
// (leaving a satellite droplet that catches up and merges) and glides to LAKES, where it settles with a damped
// wobble. This file owns the LAKES sphere for the rest of the film (beats 9-12): a glassy 56 km water ball with
// caustics, a fresnel rim and a specular highlight, which degrades to a glowing bead when the camera pulls back.
import * as L from '../../../../engine/runtime/lib.js';
import { FRESH, LAKES } from '../camera.js';
import { FRESHC, waterBall } from './s04-1385-km.js';

const { W, H } = L;
const BEAT = 9;
const R_F = FRESH.d / 2, R_L = LAKES.d / 2;
const DX = LAKES.x - FRESH.x, DY = LAKES.y - FRESH.y, DIST = Math.hypot(DX, DY);
const U = { x: DX / DIST, y: DY / DIST };             // direction FRESH -> LAKES
const N = { x: -U.y, y: U.x };
export const LAKEC = L.mix(FRESHC, [110, 215, 255], 0.25);   // lakes and rivers: fresh water, a touch brighter
const BASE = LAKEC;
const DEEP = [10, 46, 110];


// ------------------------------------------------------------------ timing (seconds into beat 9)
const T_BUD = 0.55, T_SNAP = 1.3, T_ARRIVE = 2.15;

/** Bud state at time t (beat-9 seconds): centre (world), radius, stretch, neck width, wobble. */
export function budState(t) {
  if (t < T_BUD) return null;
  const grow = L.ease.outCubic(L.prog(t, T_BUD, 0.9));
  const r = R_L * L.lerp(0.35, 1, grow);
  // phase A: pushes out of the surface; phase B: glides to LAKES
  const outA = L.ease.inOutCubic(L.prog(t, T_BUD, T_SNAP - T_BUD + 0.15));
  const s0 = L.lerp(R_F - R_L * 0.5, R_F + R_L * 1.75, outA);
  const fly = L.ease.inOutCubic(L.prog(t, T_SNAP - 0.05, T_ARRIVE - T_SNAP + 0.05));
  const s = L.lerp(s0, DIST, fly);
  const arc = Math.sin(Math.PI * fly) * R_L * -1.4;    // a gentle upward arc on the way
  const x = FRESH.x + U.x * s + N.x * arc, y = FRESH.y + U.y * s + N.y * arc;
  // neck: thick while the bud is close, pinches to nothing just before the snap
  const neck = R_L * 0.7 * L.ease.outCubic(L.prog(t, T_BUD, 0.3)) * (1 - L.ease.inCubic(L.prog(t, T_SNAP - 0.55, 0.55)));
  // squash and stretch from velocity, then a damped wobble after landing
  const vel = Math.abs(L.ease.inOutCubic(L.prog(t + 0.02, T_SNAP - 0.05, T_ARRIVE - T_SNAP + 0.05)) - fly) / 0.02;
  const stretch = 1 + Math.min(0.1, vel * 0.06);
  const tau = t - T_ARRIVE + 0.1;
  const wob = tau > 0 ? 0.11 * Math.exp(-2.6 * tau) * Math.sin(10.5 * tau) : 0;
  return { x, y, r, s, stretch, neck, wob, fly };
}

// ------------------------------------------------------------------ the ball itself: the shared glassy renderer (s04)
function drawLakes(c, v, x, y, d, { stretch = null, wob = 0.006, glow = 0, alpha = 1 } = {}) {
  const pr = v.ws(d / 2);
  if (pr < 5) {
    // far away: keep it findable as a luminous bead (the shared renderer's dot alone is too faint at ~1 px)
    const cx = v.wx(x), cy = v.wy(y);
    L.lightBlob(c, cx, cy, 18 + pr * 6, [110, 200, 255], (0.38 + glow * 0.25) * alpha);
  }
  waterBall(c, v, x, y, d, { base: LAKEC, wob, seed: 5.6, glow: 0.3 + glow * 0.35, stretch, alpha });
}

/** Liquid neck between the fresh-water ball and the bud: an hourglass bridge that thins and snaps. */
function drawNeck(c, v, b) {
  const w = b.neck;
  if (w <= 0.5 * v.cam.mpp) return;
  const ax = FRESH.x + U.x * (R_F - R_L * 0.15), ay = FRESH.y + U.y * (R_F - R_L * 0.15);
  const len = Math.hypot(b.x - ax, b.y - ay);
  if (len <= 0) return;
  const ux = (b.x - ax) / len, uy = (b.y - ay) / len, nx = -uy, ny = ux;
  const pinch = Math.min(1, w / (R_L * 0.7));             // 1 = fat bridge, 0 = snapped
  const wa = R_L * (0.3 + 0.45 * pinch), wb = b.r * (0.45 + 0.4 * pinch), wm = R_L * 0.02 + w * 0.32;
  const half = (f) => {                                     // smooth hourglass profile, f = 0 root .. 1 bud
    const base = L.lerp(wa, wb, f);
    const dip = Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.05)), 0.8);
    return L.lerp(base, wm, dip);
  };
  const n = 18, pts = [];
  for (let i = 0; i <= n; i++) { const f = i / n, h = half(f); pts.push([ax + ux * len * f + nx * h, ay + uy * len * f + ny * h]); }
  for (let i = n; i >= 0; i--) { const f = i / n, h = half(f); pts.push([ax + ux * len * f - nx * h, ay + uy * len * f - ny * h]); }
  c.save();
  const g = c.createLinearGradient(v.wx(ax), v.wy(ay), v.wx(b.x), v.wy(b.y));
  const col = L.mix(BASE, [190, 230, 255], 0.3);
  g.addColorStop(0, L.rgba(col, 0));
  g.addColorStop(0.3, L.rgba(col, 0.75));
  g.addColorStop(1, L.rgba(col, 0.95));
  c.fillStyle = g;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(v.wx(x), v.wy(y)) : c.moveTo(v.wx(x), v.wy(y))));
  c.closePath();
  c.fill();
  // a bright filament along the bridge's lit edge
  c.strokeStyle = `rgba(210,240,255,${0.45 * pinch})`;
  c.lineWidth = 1.2;
  c.beginPath();
  for (let i = 3; i <= n; i++) { const [x, y] = pts[i]; i > 3 ? c.lineTo(v.wx(x), v.wy(y)) : c.moveTo(v.wx(x), v.wy(y)); }
  c.stroke();
  c.restore();
}

/** Where the LAKES ball is at global time gt, and how it looks. Used by s09 (all beats from 9 on). */
function lakesNow(v) {
  const t9 = v.gt - v.tl.scenes[BEAT].start;
  const b = budState(t9);
  if (!b) return null;
  // beat 11: a gentle inner glow ("so much of life depends on it")
  const s11 = v.tl.scenes[11];
  const g = L.ease.inOutCubic(L.prog(v.gt, s11.start + 0.1, 1.0)) * (1 - 0.6 * L.ease.inOutCubic(L.prog(v.gt, s11.end + 0.4, 1.6)));
  const breathe = 0.85 + 0.15 * Math.sin((v.gt - s11.start) * 2.6);
  return { ...b, glow: g * breathe };
}

export default {
  beat: BEAT,
  chapter: { num: '09', title: 'Lakes and rivers', sub: 'Fresh water in lakes and rivers' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T_BUD + 0.05, name: 'bubbles', gain: 0.3, pitch: 1.3 },
      { t: T_SNAP, name: 'blip', gain: 0.32, pitch: 1.5 },
      { t: T_SNAP + 0.1, name: 'swish', gain: 0.22, pitch: 1.2 },
      { t: T_ARRIVE - 0.05, name: 'splash', gain: 0.22, pitch: 1.6 },
      { t: T_ARRIVE + 0.15, name: 'tick', gain: 0.14, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const b = lakesNow(v);
    if (!b) return;
    const cx = v.wx(b.x), cy = v.wy(b.y), pr = v.ws(b.r);
    if (cx + pr * 2 < -100 || cx - pr * 2 > W + 100 || cy + pr * 2 < -100 || cy - pr * 2 > H + 100) return;
    // the bridge and a flash where it snaps
    drawNeck(ctx, v, b);
    const t9 = v.gt - v.tl.scenes[BEAT].start;
    const snapK = L.prog(t9, T_SNAP, 0.5);
    if (snapK > 0 && snapK < 1) {
      const sx = FRESH.x + U.x * (R_F + R_L * 0.55), sy = FRESH.y + U.y * (R_F + R_L * 0.55);
      L.lightBlob(ctx, v.wx(sx), v.wy(sy), v.ws(R_L * (0.8 + snapK)), [150, 220, 255], 0.35 * Math.sin(Math.PI * snapK));
      // satellite droplet left behind by the neck, chasing the main drop
      const ck = L.ease.inCubic(L.prog(t9, T_SNAP, 0.55));
      const dx = L.lerp(sx, b.x, ck), dy = L.lerp(sy, b.y, ck);
      drawLakes(ctx, v, dx, dy, 2 * R_L * 0.16 * (1 - ck * 0.5), { alpha: 1 - L.prog(t9, T_SNAP + 0.42, 0.13) });
    }
    // squash/stretch along the motion direction, wobble on landing
    const ang = Math.atan2(U.y, U.x);
    const stretch = { ang, s: b.stretch + b.wob };
    // a soft arrival ring on the "surface of space" (very subtle)
    const ringK = L.prog(t9, T_ARRIVE - 0.05, 1.1);
    if (ringK > 0 && ringK < 1 && pr > 6) {
      ctx.save();
      ctx.strokeStyle = `rgba(140,210,255,${0.35 * (1 - ringK)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, pr * (1.05 + ringK * 0.9)), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    drawLakes(ctx, v, b.x, b.y, 2 * b.r, { stretch, wob: 0.006 + Math.abs(b.wob) * 0.25, glow: b.glow });
    drawTag(ctx, v);
  },
};

/** The LAKES + RIVERS tag. Drawn from drawWorld on its own clock so it can hold through the cut into beat 10. */
function drawTag(ctx, v) {
  if (v.t < T_ARRIVE - 0.2) return;
  const kin = L.ease.outCubic(L.prog(v.t, T_ARRIVE - 0.2, 0.5));
  const kout = 1 - L.ease.inCubic(L.prog(v.t, v.d + 0.3, 0.4));
  const k = Math.min(kin, kout);
  if (k <= 0) return;
  const cx = v.wx(LAKES.x), cy = v.wy(LAKES.y), pr = v.ws(R_L);
  const x1 = cx + pr * 0.75, y1 = cy - pr * 0.75;
  const x2 = x1 + 70, y2 = y1 - 110;
  L.leader(ctx, x1, y1, x2, y2, kin, [190, 225, 255], 0.8 * kout);
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.5 - 0.3);
  ctx.font = L.font(30, 700, L.FONT.body);
  ctx.fillStyle = 'rgba(235,242,250,0.96)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
  ctx.textBaseline = 'alphabetic';
  const tx = Math.min(x2 - 10, W - 140 - 260);
  L.trackedText(ctx, 'LAKES + RIVERS', tx, y2 - 16 + (1 - kin) * 10, 3, 'left');
  ctx.restore();
}
