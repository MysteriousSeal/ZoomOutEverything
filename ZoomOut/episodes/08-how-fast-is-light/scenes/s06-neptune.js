// Beat 6 — Neptune: light needs about four hours.
// The camera pulls out from the Sun to the whole planetary system. The outer orbits sweep in, a Kuiper-belt
// haze settles beyond, Neptune is marked, then a photon leaves Neptune and flies in to Earth (light FROM
// Neptune); the clock counts distance / c and locks at 4 H 01 MIN as it lands on Earth.
//
// Also exports the small helpers shared by beats 6–9 (hit ring, reticle, name tag, cruise easing) and the
// solar-system layer (orbits, planets, Kuiper belt) that stays in the world until it collapses in beat 8.
// The clock, photon head and beam come from s01 (the film-wide components).
import * as L from '../../../../engine/runtime/lib.js';
import { C, NEPTUNE, SUN } from '../camera.js';
import { drawBeam, drawClock, drawPhoton, PHOTON_GOLD } from './s01-one-second.js';

const { W, H } = L;
const DEG = Math.PI / 180;
const AU = 1.496e11;
const D_NEP = Math.hypot(NEPTUNE.x, NEPTUNE.y);        // Earth → Neptune, m (≈ 4.35 billion km, 4 h 01 min)
const NEP_COL = [110, 160, 255];

// ------------------------------------------------------------------ shared helpers (beats 6–9)
/** Ease-in then constant speed (light does not brake): x 0..1 → 0..1. */
export function cruise(x, a = 0.18) {
  x = L.clamp(x);
  return (x < a ? (x * x) / (2 * a) : x - a / 2) / (1 - a / 2);
}

/** Is a screen point near the frame? */
export const onScreen = (x, y, pad = 120) => x > -pad && x < W + pad && y > -pad && y < H + pad;

/** Beat time snapped to the output frame, so a running clock shows the same digits in every
 *  motion-blur sub-frame (sub-frames are spread within +-0.25 frame of the frame time). */
export const frameT = (v) => v.t + Math.round(v.gt * 30) / 30 - v.gt;

/** Arrival hit: a flash and two expanding rings (age in seconds since arrival). Additive. */
export function drawHit(ctx, x, y, age, { col = PHOTON_GOLD, size = 1 } = {}) {
  if (age < 0 || age > 1.6) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  L.lightBlob(ctx, x, y, 130 * size, col, 0.6 * Math.exp(-age * 4));
  for (let i = 0; i < 2; i++) {
    const a = age - i * 0.16;
    if (a < 0) continue;
    const k = L.ease.outCubic(L.clamp(a / 1.2));
    ctx.strokeStyle = L.rgba(col, 0.7 * (1 - k) * (1 - i * 0.35));
    ctx.lineWidth = 2.2 - i * 0.6;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, (14 + 110 * k) * size), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Thin four-arc reticle around a target; draws itself in with k and turns slowly. */
export function drawReticle(ctx, x, y, r, k, col = [235, 230, 222], alpha = 0.7, gt = 0) {
  if (k <= 0.001) return;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.strokeStyle = L.rgba(col, alpha * L.clamp(k * 1.5));
  ctx.lineWidth = 1.6;
  const rr = Math.max(0, r * (1.6 - 0.6 * e));
  const spin = gt * 0.25;
  for (let i = 0; i < 4; i++) {
    const a0 = spin + i * Math.PI / 2 + 0.25, a1 = a0 + (Math.PI / 2 - 0.5) * e;
    ctx.beginPath(); ctx.arc(x, y, rr, a0, a1); ctx.stroke();
  }
  ctx.restore();
}

/** Small name tag with an elbow leader: object at (x,y), elbow at (lx,ly), text beyond it. */
export function drawTag(ctx, x, y, lx, ly, text, k, { align = 'left', col = [235, 230, 222], sub = '' } = {}) {
  if (k <= 0.001) return;
  const e = L.ease.outCubic(L.clamp(k));
  const dir = align === 'left' ? 1 : -1;
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.4);
  ctx.strokeStyle = L.rgba(col, 0.5);
  ctx.lineWidth = 1.5;
  const e1 = L.clamp(e * 1.6), e2 = L.clamp(e * 1.6 - 0.6);
  const ex = L.lerp(x, lx, e1), ey = L.lerp(y, ly, e1);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
  if (e2 > 0) ctx.lineTo(lx + dir * 24 * e2, ly);
  ctx.stroke();
  const tx = lx + dir * 34;
  ctx.save();
  ctx.beginPath();
  const cw = 520 * e2;
  ctx.rect(align === 'left' ? tx - 6 : tx - cw, ly - 40, cw + 6, 90);
  ctx.clip();
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.font = L.font(25, 700, L.FONT.body);
  ctx.fillStyle = L.rgba(col, 0.96);
  L.trackedText(ctx, text, tx, ly, 3.5, align);
  if (sub) {
    ctx.font = L.font(20, 500, L.FONT.body);
    ctx.fillStyle = 'rgba(178,190,208,0.88)';
    L.trackedText(ctx, sub, tx, ly + 29, 1, align);
  }
  ctx.restore();
  ctx.restore();
}

/**
 * One photon run in screen space, in the film's travel style (s01 drawTravel): a faint gold route line
 * from the start (ax,ay) to the head (hx,hy), a fading beam behind the head, and the head itself.
 * After arrival (after > 0) the trail drains into the target, a hit ring fires, and the route lingers
 * faintly until `fade` drops. t0k: 0..1 entrance of the head at departure.
 */
export function drawRun(ctx, ax, ay, hx, hy, { after = -1, t0k = 1, fade = 1, trailPx = 380, gt = 0 } = {}) {
  const sLen = Math.hypot(hx - ax, hy - ay);
  const route = (after > 0 ? 0.16 + 0.2 * Math.exp(-after * 1.5) : 0.34) * fade * t0k;
  if (route > 0.005 && sLen > 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = L.rgba(PHOTON_GOLD, route);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.restore();
  }
  if (after > 0) drawHit(ctx, hx, hy, after);
  const drain = after > 0 ? L.ease.outCubic(L.clamp(after / 0.4)) : 0;
  const I = (after > 0 ? Math.max(0, 1 - after / 0.55) : t0k) * fade;
  if (I <= 0.001) return;
  const len = Math.min(sLen, trailPx) * (1 - drain);
  const dx = (hx - ax) / Math.max(1e-6, sLen), dy = (hy - ay) / Math.max(1e-6, sLen);
  drawBeam(ctx, hx - dx * len, hy - dy * len, hx, hy, { a: I });
  drawPhoton(ctx, hx, hy, { s: 0.75 * (1 - 0.45 * drain), a: I, rot: 0.35 + gt * 0.2 });
}

// ------------------------------------------------------------------ solar system (world layer, beats 6–8)
const PLANETS = [
  { a: 1.52 * AU, ang: 205, col: [230, 140, 100], r: 1.6 },        // Mars
  { a: 5.2 * AU, ang: 38, col: [230, 200, 160], r: 3.0 },          // Jupiter
  { a: 9.54 * AU, ang: 252, col: [228, 212, 168], r: 2.6 },        // Saturn
  { a: 19.2 * AU, ang: 96, col: [165, 222, 228], r: 2.2 },         // Uranus
];
const NEP_ANG = Math.atan2(NEPTUNE.y - SUN.y, NEPTUNE.x - SUN.x);
const R_NEP_ORBIT = Math.hypot(NEPTUNE.x - SUN.x, NEPTUNE.y - SUN.y);
// Kuiper belt: a sparse ring of icy bodies 30–50 AU out (deterministic)
const KUIPER = (() => {
  const r = L.rng(608), out = [];
  for (let i = 0; i < 520; i++) {
    const a = L.lerp(39, 48, Math.pow(r(), 0.8)) * AU * (1 + 0.05 * (r() + r() - 1));
    out.push([a, r() * Math.PI * 2, L.lerp(0.8, 1.8, r()), r()]);
  }
  return out;
})();

/** Draws orbits, planets and the Kuiper belt around the Sun; collapses away on the beat-8 pull-out. */
function drawSystem(ctx, v) {
  const t = v.t;                       // seconds since beat 6 start
  if (t < -0.05) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  const rN = R_NEP_ORBIT / v.cam.mpp;
  if (rN < 2.5) return;                // collapsed into the Sun's point (beat 8)
  const fadeSmall = L.clamp((rN - 2.5) / 30);
  const kIn = L.ease.outCubic(L.prog(t, 0.0, 0.9));
  ctx.save();
  ctx.globalAlpha *= fadeSmall;
  ctx.lineWidth = 1.3;
  for (const p of PLANETS) {
    const r = p.a / v.cam.mpp;
    if (r > 3000 || r < 2) continue;
    ctx.strokeStyle = `rgba(200,210,235,${0.12 * kIn * L.clamp(r / 20)})`;
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
    const px = sx + Math.cos(p.ang * DEG) * r, py = sy + Math.sin(p.ang * DEG) * r;
    ctx.fillStyle = L.rgba(p.col, 0.75 * kIn * L.clamp(r / 25));
    ctx.beginPath(); ctx.arc(px, py, Math.max(0, p.r * Math.min(1, r / 70)), 0, Math.PI * 2); ctx.fill();
  }
  const rE = AU / v.cam.mpp;
  if (rE > 4 && rE < 3000) {
    ctx.strokeStyle = `rgba(120,170,255,${0.18 * kIn})`;
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, rE), 0, Math.PI * 2); ctx.stroke();
  }
  // Kuiper belt: icy specks that settle in as the frame widens
  if (rN < 4000) {
    const kb = kIn * L.clamp((1400 - rN) / 600) * L.ease.outCubic(L.prog(t, 0.9, 1.2));
    if (kb > 0.01) {
      const rot = v.gt * 0.006;
      ctx.fillStyle = 'rgba(190,205,230,1)';
      for (const [a, ang, s, tw] of KUIPER) {
        const rr = a / v.cam.mpp, an = ang + rot;
        const x = sx + Math.cos(an) * rr, y = sy + Math.sin(an) * rr;
        if (!onScreen(x, y, 4)) continue;
        ctx.globalAlpha = fadeSmall * kb * (0.2 + 0.35 * tw) * (0.75 + 0.25 * Math.sin(v.gt * 1.7 + tw * 30));
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = fadeSmall;
    }
  }
  // Neptune's orbit: faint base, then a bright stroke draws itself around the Sun from Neptune
  if (rN < 6000) {
    const draw = L.ease.inOutCubic(L.prog(t, 1.0, 1.4));
    ctx.strokeStyle = L.rgba(NEP_COL, 0.12 * kIn);
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, rN), 0, Math.PI * 2); ctx.stroke();
    if (draw > 0) {
      const hl = 1 - 0.6 * L.ease.inOutCubic(L.prog(t, 3.2, 1.6));
      ctx.strokeStyle = L.rgba(NEP_COL, 0.45 * hl);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0, rN), NEP_ANG, NEP_ANG + Math.PI * 2 * draw);
      ctx.stroke();
      if (draw < 1) {
        const a = NEP_ANG + Math.PI * 2 * draw;
        L.lightBlob(ctx, sx + Math.cos(a) * rN, sy + Math.sin(a) * rN, 18, NEP_COL, 0.55 * Math.sin(Math.PI * draw));
      }
    }
  }
  ctx.restore();
}

function drawNeptune(ctx, v, ta) {
  const t = v.t;
  if (t < 0) return;
  const x = v.wx(NEPTUNE.x), y = v.wy(NEPTUNE.y);
  if (!onScreen(x, y)) return;
  const rN = R_NEP_ORBIT / v.cam.mpp;
  if (rN < 3) return;
  const small = L.clamp((rN - 3) / 160);           // shrinks to a dot as the system collapses
  const lit = 0.6 + 0.4 * L.ease.outCubic(L.prog(t, ta, 0.6));
  const R = L.lerp(1.4, 8, small);
  L.lightBlob(ctx, x, y, R * 6, NEP_COL, 0.3 * lit * L.clamp(rN / 40));
  const ang = Math.atan2(v.wy(SUN.y) - y, v.wx(SUN.x) - x);      // lit from the Sun
  const g = ctx.createRadialGradient(x + Math.cos(ang) * R * 0.45, y + Math.sin(ang) * R * 0.45, 0, x, y, Math.max(0.1, R));
  g.addColorStop(0, L.rgba([210, 230, 255], lit));
  g.addColorStop(0.55, L.rgba([80, 130, 235], lit));
  g.addColorStop(1, L.rgba([22, 40, 105], lit));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, R), 0, Math.PI * 2); ctx.fill();
}

// ------------------------------------------------------------------ photon schedule (beat time)
// "Light FROM Neptune": the camera first pulls out until Neptune is in frame (orbit draws 1.0-1.4), then a
// photon leaves Neptune and flies in to Earth (next to the Sun) at a constant rate; the clock counts the
// true travel time (distance covered / c) and locks on arrival at Earth.
const T0 = 1.25, TA = 2.2;
const prog = (t) => cruise(L.prog(t, T0, TA - T0), 0.12);   // fraction of the Neptune -> Earth path covered

export default {
  beat: 6,
  chapter: { num: '06', title: 'Neptune', sub: '4.5 billion km from Earth' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.25, name: 'riser', gain: 0.2, pitch: 1.1 },
      { t: T0, name: 'count', gain: 0.18, pitch: 1.25 },
      { t: TA - 0.02, name: 'impact', gain: 0.26, pitch: 1.3 },
      { t: TA, name: 'tick', gain: 0.42, pitch: 1.0 },
      { t: TA + 0.04, name: 'ping', gain: 0.2, pitch: 0.85 },
    ];
  },
  drawWorld(ctx, v) {
    drawSystem(ctx, v);
    drawNeptune(ctx, v, T0);
    const t = v.t;
    if (t < T0 - 0.05 || t > v.d + 1.4) return;
    const ex = v.wx(0), ey = v.wy(0);
    const nx = v.wx(NEPTUNE.x), ny = v.wy(NEPTUNE.y);
    // departure: a small cold flash on Neptune as the light sets off
    drawHit(ctx, nx, ny, t - T0, { col: NEP_COL, size: 0.55 });
    const pr = prog(t);
    const hx = L.lerp(nx, ex, pr), hy = L.lerp(ny, ey, pr);
    drawRun(ctx, nx, ny, hx, hy, {
      after: t - TA, t0k: L.ease.outCubic(L.prog(t, T0, 0.2)), fade: 1 - L.ease.inCubic(L.prog(t, v.d, 1.2)), gt: v.gt,
    });
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const nx = v.wx(NEPTUNE.x), ny = v.wy(NEPTUNE.y);
    drawReticle(ctx, nx, ny, 22, L.prog(t, T0 - 0.25, 0.45) * v.k, [185, 210, 255], 0.8, v.gt);
    drawTag(ctx, nx + 15, ny - 15, nx + 62, ny - 84, 'NEPTUNE', L.prog(t, T0 - 0.1, 0.6) * v.k, { col: [215, 228, 255] });
    const tq = frameT(v);
    drawClock(ctx, v, { sec: prog(tq) * D_NEP / C, lockAt: TA, lockLabel: 'NEPTUNE TO EARTH' });
  },
};
