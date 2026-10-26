// Beat 11 — "Light is the fastest thing in the universe."
// Light from every galaxy in the field streams in towards us at one shared speed (thin gold streaks
// converging on "you are here"), a light sweep runs down the photon's 13-billion-year trail, and the
// clock hands over to the speed readout, a fixed 299,792 km/s that flashes and locks on "fastest" (~51.55 s): 299,792 km/s.
import * as L from '../../../../engine/runtime/lib.js';
import { FIELD, HORIZON, HERO, T11, beatStart } from './s10-deep-field.js';
import { drawClock, PHOTON_GOLD } from './s01-one-second.js';

const { W, H, ease, clamp, lerp, prog, rgba } = L;
const TAU = Math.PI * 2;
const GOLD = PHOTON_GOLD;
const HOT = [255, 246, 222];

// streaks: a deterministic subset of the field, each with its own departure time
const SPEED = HORIZON / 1.7;        // world metres per film second (shared by every streak: one speed of light)
const TAIL = 0.17 * HORIZON;
const STREAKS = [];
{
  const r = L.rng(611);
  for (const g of FIELD) {
    if (g.d < 0.22 || g.d > 0.97 || r() > 0.085) continue;
    // start so that heads are spread through the beat; far ones leave earlier
    STREAKS.push({ x: g.x, y: g.y, dist: Math.hypot(g.x, g.y), t0: lerp(-0.6, 1.5, r()) - g.d * 0.6, w: lerp(0.9, 1.8, r()), a: lerp(0.45, 1, r()) });
  }
}

function drawStreaks(ctx, v, t) {
  const k12 = v.tl.scenes[12] ? 1 - ease.inCubic(prog(v.gt, beatStart(v, 12) + 0.2, 1.2)) : 1;
  const kin = ease.outCubic(prog(t, T11.streak0, 0.4));
  const gk = kin * k12;
  if (gk <= 0) return;
  const mpp = v.cam.mpp;
  const ox = v.wx(0), oy = v.wy(0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const s of STREAKS) {
    const run = (t - s.t0) * SPEED;
    if (run <= 0 || run > s.dist + TAIL) continue;
    const ux = -s.x / s.dist, uy = -s.y / s.dist;          // unit vector towards us
    const hd = Math.min(run, s.dist), td = Math.max(0, run - TAIL);
    const hx = ox + (s.x + ux * hd) / mpp, hy = oy + (s.y + uy * hd) / mpp;
    const tx = ox + (s.x + ux * td) / mpp, ty = oy + (s.y + uy * td) / mpp;
    if (Math.max(hx, tx) < -20 || Math.min(hx, tx) > W + 20 || Math.max(hy, ty) < -20 || Math.min(hy, ty) > H + 20) continue;
    const near = clamp((s.dist - hd) / (0.12 * HORIZON));    // fades as it reaches us
    const a = s.a * gk * clamp(run / (0.05 * HORIZON)) * (0.25 + 0.75 * near);
    const g = ctx.createLinearGradient(tx, ty, hx, hy);
    g.addColorStop(0, rgba(GOLD, 0));
    g.addColorStop(1, rgba(HOT, 0.85 * a));
    ctx.strokeStyle = g;
    ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    if (hd < s.dist) {
      ctx.fillStyle = rgba(HOT, 0.9 * a);
      ctx.beginPath(); ctx.arc(hx, hy, Math.max(0, s.w * 1.1), 0, TAU); ctx.fill();
    }
  }
  // gentle glow building on "you are here" as light pours in
  L.lightBlob(ctx, ox, oy, 70, GOLD, 0.35 * gk * (0.8 + 0.2 * Math.sin(v.gt * 5)));
  ctx.restore();
}

/** A light sweep running down the hero photon's trail (hero -> us). */
function drawSweep(ctx, v, t) {
  const k = prog(t, 0.15, 1.1);
  if (k <= 0 || k >= 1) return;
  const e = ease.inOutCubic(k);
  const hx = v.wx(HERO.x), hy = v.wy(HERO.y), ex = v.wx(0), ey = v.wy(0);
  const x = lerp(hx, ex, e), y = lerp(hy, ey, e);
  const a = Math.sin(Math.PI * k);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const back = 0.22;
  const bx = lerp(hx, ex, Math.max(0, e - back)), by = lerp(hy, ey, Math.max(0, e - back));
  const g = ctx.createLinearGradient(bx, by, x, y);
  g.addColorStop(0, rgba(GOLD, 0));
  g.addColorStop(1, rgba(HOT, 0.9 * a));
  ctx.strokeStyle = g;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y); ctx.stroke();
  L.lightBlob(ctx, x, y, 34, HOT, 0.7 * a);
  ctx.restore();
}

function drawWorld(ctx, v) {
  if (v.gt < beatStart(v, 11) - 0.05 || v.gt > (v.tl.scenes[12] ? beatStart(v, 12) + 2 : 1e9)) return;
  drawStreaks(ctx, v, v.t);
  drawSweep(ctx, v, v.t);
}

function drawOverlay(ctx, v) {
  // the clock becomes the speed readout: a fixed 299,792 km/s (light never speeds up), which flashes and locks on
  // "fastest". It eases out over ~0.3 s before beat 12 starts (rolling up, like every other hand-off).
  const out = v.tl.scenes[12] ? ease.inOutCubic(prog(v.gt, beatStart(v, 12) - 0.32, 0.3)) : 0;
  const k = out > 0 ? 0.85 + 0.15 * (1 - out) : v.k;
  drawClock(ctx, out > 0 ? { ...v, k } : v, {
    segs: [{ n: '299,792', u: 'KM/S' }],
    label: 'THE SPEED OF LIGHT', lockAt: T11.speed, k,     // one label for the whole beat (readable, no swap)
  });
}

export default {
  beat: 11,
  chapter: { num: '11', title: 'The fastest thing', sub: 'Nothing in the universe outruns light' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.08, name: 'shimmer', gain: 0.3, pitch: 1.2 },     // light streams in from everywhere
      { t: 0.15, name: 'swish', gain: 0.22, pitch: 1.1 },      // sweep down the trail
      { t: T11.speed, name: 'tick', gain: 0.35, pitch: 1.1 },  // 299,792 km/s lands on "fastest"
      { t: T11.speed + 0.02, name: 'ping', gain: 0.22, pitch: 1.3 },
    ];
  },
  drawWorld,
  drawOverlay,
};
