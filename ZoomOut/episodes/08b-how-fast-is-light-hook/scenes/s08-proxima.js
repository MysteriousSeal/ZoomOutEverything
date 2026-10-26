// Beat 8 — Proxima Centauri: its light travels 4.24 years to reach us.
// The big pull-out: orbits, Voyager and the Kuiper belt collapse into the Sun's single point, while
// nearby stars stream in from the edges (world-space parallax). "The nearest star?" — a small red dwarf
// warms up out of the dark with a reticle and its name. Then a photon leaves Proxima and crosses the gap
// to the Sun at a constant rate; it lands on "four years… to reach us" and the clock locks at 4.24 YEARS.
// Proxima is a flare star: it flickers with small flares (secondary motion).
import * as L from '../../../../engine/runtime/lib.js';
import * as CAM from '../camera.js';
import { LY, PROXIMA } from '../camera.js';
import { clockSegs, drawClock } from './s01-one-second.js';
import { cruise, drawHit, drawReticle, drawRun, drawTag, frameT, onScreen } from './s06-neptune.js';

const D_PRX = Math.hypot(PROXIMA.x, PROXIMA.y);           // 4.24 light-years
const T0 = 1.95, TA = 3.45;                               // photon leaves Proxima / reaches the Sun (beat time)
const RED = [255, 96, 64];

// nearby stars within ~25 ly (deterministic), none closer than Proxima; they stream in during the pull-out
const LOCAL = (() => {
  const r = L.rng(808), out = [];
  while (out.length < 260) {
    const d = L.lerp(5.6, 26, Math.pow(r(), 0.75)) * LY, a = r() * Math.PI * 2;
    const tint = r();
    const col = tint < 0.55 ? [255, 180, 140] : tint < 0.85 ? [255, 236, 210] : [190, 210, 255];
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, b: Math.pow(r(), 2.2), col, ph: r() * 20 });
  }
  return out;
})();

/** Proxima's flare activity: small irregular brightenings (0..1). */
function flare(gt) {
  let f = 0;
  for (const [t0, a] of [[33.9, 0.6], [35.2, 0.35], [36.6, 0.8], [38.4, 0.4]]) {
    const u = gt - t0;
    if (u > 0) f += a * (1 - Math.exp(-u * 30)) * Math.exp(-u * 3);
  }
  return Math.min(1, f + 0.08 * L.noise1(gt * 3, 9));
}

function drawProxima(ctx, x, y, k, gt, mpp) {
  if (k <= 0.01 || !onScreen(x, y, 200)) return;
  const far = L.clamp((D_PRX / mpp - 20) / 60);             // gone before it reaches the Sun's glow on the pull-out
  const a = k * far;
  if (a <= 0.01) return;
  const fl = flare(gt);
  const tw = 1 + 0.06 * Math.sin(gt * 5.3);
  L.lightBlob(ctx, x, y, 150 * tw, RED, 0.16 * a * (1 + 0.6 * fl));
  L.lightBlob(ctx, x, y, 46, [255, 120, 80], 0.6 * a * (1 + 0.4 * fl));
  L.lightBlob(ctx, x, y, 14, [255, 215, 190], 0.9 * a);
  // faint diffraction spikes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) {
    const an = 0.4 + i * Math.PI / 2, len = (i ? 34 : 52) * (1 + 0.5 * fl);
    const dx = Math.cos(an) * len, dy = Math.sin(an) * len;
    const g = ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
    g.addColorStop(0, 'rgba(255,140,110,0)');
    g.addColorStop(0.5, `rgba(255,170,140,${0.45 * a})`);
    g.addColorStop(1, 'rgba(255,140,110,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,236,225,${a})`;
  ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLocal(ctx, v) {
  const lm = Math.log10(v.cam.mpp);
  const k = L.clamp((lm - 11.6) / 0.8) * L.clamp((16.0 - lm) / 0.6);
  if (k <= 0.01) return;
  const ex = v.wx(0), ey = v.wy(0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of LOCAL) {
    const x = v.wx(s.x), y = v.wy(s.y);
    if (!onScreen(x, y, 30)) continue;
    // stars fade as the pull-out drags them into the Sun's point (no additive pile-up there)
    const near = L.clamp((Math.hypot(x - ex, y - ey) - 20) / 90);
    if (near <= 0.01) continue;
    const tw = 0.8 + 0.2 * Math.sin(v.gt * 1.3 + s.ph);
    const a = k * near * (0.4 + 0.6 * s.b) * tw;
    if (s.b > 0.35) L.lightBlob(ctx, x, y, 8 + 22 * s.b, s.col, 0.25 * a);
    ctx.fillStyle = L.rgba(L.mix(s.col, [255, 255, 255], 0.5), Math.min(1, a));
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 0.8 + 1.3 * s.b), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** On the galaxy pull-out the whole neighbourhood shrinks into one small warm point: home. */
function drawHome(ctx, v) {
  const lm = Math.log10(v.cam.mpp);
  // stays through beat 9 as the solar neighbourhood's dot on the galaxy disc; gone once the galaxy itself is a dot
  const k = L.clamp((lm - 15.2) / 0.5) * L.clamp((19.2 - lm) / 0.6);
  if (k <= 0.01) return;
  const x = v.wx(0), y = v.wy(0);
  L.lightBlob(ctx, x, y, 30, [255, 222, 180], 0.45 * k);
  ctx.save();
  ctx.fillStyle = `rgba(255,246,232,${0.95 * k})`;
  ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

const traveled = (t) => D_PRX * cruise(L.prog(t, T0, TA - T0), 0.15);

// ------------------------------------------------------------------ shared travel-clock helpers (beats 8–10)
const YR = 31557600, DAY = 86400;
/** Seconds -> clock segments that pass through S, MIN, H, DAYS, YEARS, MILLION YEARS, BILLION YEARS. */
export function travelSegs(sec) {
  sec = Math.max(0, sec);
  if (sec < 3 * DAY) return clockSegs(sec);
  const y = sec / YR;
  if (y < 1) return [{ n: String(Math.floor(sec / DAY)), u: 'DAYS' }];
  if (y >= 1e6 && y < 1e9) return [{ n: L.fmt(Math.floor(y / 1e6)), u: 'MILLION YEARS' }];
  return clockSegs(sec);
}
/**
 * Clock value (seconds) for a run of `total` seconds at time-progress x (0..1) whose photon has covered the fraction
 * `lin`: an exponential lead-in (seconds, minutes, hours, days roll past) that hands over to the true linear
 * travel time once it catches up (about halfway), so the clock matches the photon at arrival.
 */
export function travelClock(x, lin, total) {
  if (x <= 0) return 0;
  if (x >= 1) return total;
  const ex = Math.pow(total + 1, Math.min(1, x / 0.5)) - 1;
  return Math.min(total * lin, ex);
}
/** Clock visibility: fades in only as the photon departs (beat-relative t, departure t0). */
export const clockIn = (v, t0) => v.k * L.ease.outCubic(L.prog(v.t, t0 - 0.08, 0.3));

export default {
  beat: 8,
  chapter: { num: '08', title: 'Proxima Centauri', sub: 'The nearest star' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.1, name: 'dive', gain: 0.2, pitch: 0.8 },
      { t: 0.85, name: 'shimmer', gain: 0.15, pitch: 0.8 },
      { t: 0.95, name: 'blip', gain: 0.2, pitch: 0.9 },
      { t: T0 - 0.05, name: 'swish', gain: 0.24, pitch: 0.95 },
      { t: T0 + 0.5, name: 'count', gain: 0.14, pitch: 1.0 },
      { t: TA, name: 'impact', gain: 0.28, pitch: 1.1 },
      { t: TA + 0.02, name: 'tick', gain: 0.42, pitch: 1.0 },
      { t: TA + 0.06, name: 'ping', gain: 0.22, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < -0.1) return;
    drawLocal(ctx, v);
    drawHome(ctx, v);
    const px = v.wx(PROXIMA.x), py = v.wy(PROXIMA.y);
    drawProxima(ctx, px, py, L.ease.outCubic(L.prog(t, 0.35, 0.7)), v.gt, v.cam.mpp);
    if (t < T0 || t > v.d + 1.4) return;
    // departure: a red flash on Proxima as the light leaves it (this run comes inward, to us)
    if (D_PRX / v.cam.mpp > 80) drawHit(ctx, px, py, t - T0, { col: [255, 140, 110], size: 0.55 });
    const r = traveled(t);
    const ux = -PROXIMA.x / D_PRX, uy = -PROXIMA.y / D_PRX;   // Proxima → Earth
    const hx = px + ux * r / v.cam.mpp, hy = py + uy * r / v.cam.mpp;
    const after = t - TA;
    drawRun(ctx, px, py, hx, hy, {
      after, t0k: L.ease.outCubic(L.prog(t, T0, 0.25)), fade: 1 - L.ease.inCubic(L.prog(t, v.d - 0.2, 0.9)), gt: v.gt,
    });
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    // world-pinned labels are gone before the galaxy pull-out starts (it would drag them into the Sun's point)
    const ms = CAM.moveStart ? CAM.moveStart(v.tl, 9) : v.tl.scenes[9]?.start ?? 1e9;
    const lk = v.k * (1 - L.ease.inOutCubic(L.prog(v.gt, ms - 0.3, 0.28)));
    if (lk <= 0.001) return;
    v = { ...v, k: lk };
    const px = v.wx(PROXIMA.x), py = v.wy(PROXIMA.y);
    const ex = v.wx(0), ey = v.wy(0);
    drawReticle(ctx, px, py, 34, L.prog(t, 0.8, 0.5) * v.k, [255, 175, 150], 0.8, v.gt);
    drawTag(ctx, px + 24, py - 24, px + 84, py - 104, 'PROXIMA CENTAURI', L.prog(t, 0.95, 0.6) * v.k,
      { col: [255, 215, 200], sub: '40 trillion km' });
    // home: the whole solar system is now this one point
    drawReticle(ctx, ex, ey, 26, L.prog(t, 1.15, 0.5) * v.k, [235, 230, 222], 0.55, -v.gt);
    drawTag(ctx, ex - 18, ey + 18, ex - 70, ey + 76, 'THE SUN', L.prog(t, 1.3, 0.6) * v.k * (1 - L.prog(t, TA - 0.2, 0.4)),
      { align: 'right', sub: 'and every planet' });
    const tq = Math.min(frameT(v), TA);
    const sec = travelClock(L.prog(tq, T0, TA - T0), traveled(tq) / D_PRX, (D_PRX / LY) * YR);
    drawClock(ctx, v, { segs: travelSegs(sec), lockAt: TA, lockLabel: 'PROXIMA TO EARTH', k: clockIn(v, T0) });
  },
};
