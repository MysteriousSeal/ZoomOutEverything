// Beat 3 — "That's how long sunlight takes to reach us."
// FLY OUT from the street to the Earth and the Sun at true scale (camera, 12.87-15.37 s). Where the Sun was: a black
// hole (env), and s00's sky Sun settles there as a fading ghost of the old disc. env draws the LAST SUNLIGHT as a
// warm ring racing outward; this scene dresses it with photon streaks in the bright shell just outside the ring
// (all moving outward), marks Earth (ring + "EARTH") and draws the Sun-Earth distance as a dimension line along the
// axis. Label "150 million km" lower-left (clear of the Sun, the axis and the captions); it holds into beat 4 and
// hands over to s04's label on "only travel at the speed of light".
import * as L from '../../../../engine/runtime/lib.js';
import { EARTH, frontK, lightR, SUN } from '../env.js';
import { label2 } from './s00-hook.js';

const { W, H } = L;
const TAU = Math.PI * 2;
export const LABEL = { x: 84, y: 1192, size: 92 };
export const T3 = { dim0: 14.55, big: 14.85, small: 15.2, out: 18.05, end: 20.25 };

/** 0..1: the camera is at system scale (fades through the push-in of beat 5). */
export const sysK = (mpp) => L.smoothstep(L.clamp(L.invLerp(Math.log(3e7), Math.log(1.2e8), Math.log(mpp))));
/** Screen geometry of the Sun-Earth axis. */
export function axis(v) {
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y), ex = v.wx(EARTH.x), ey = v.wy(EARTH.y);
  const len = Math.hypot(ex - sx, ey - sy) || 1;
  const ux = (ex - sx) / len, uy = (ey - sy) / len;
  return { sx, sy, ex, ey, len, ux, uy, nx: -uy, ny: ux };
}
/** Visibility of the system-view annotations (in after the fly-out, out as beat 5 pushes in). */
const annK = (v) => sysK(v.cam.mpp) * (1 - L.ease.inCubic(L.prog(v.gt, T3.end, 0.35)));

const PH = (() => { const r = L.rng(3303); return Array.from({ length: 220 }, () => ({ a: r() * TAU, o: r(), len: 8 + r() * 26, w: 0.8 + r() * 1.4, sp: 0.25 + r() * 0.25, b: 0.5 + r() * 0.5 })); })();

function drawPhotons(c, v) {
  const k = frontK(v.gt) * sysK(v.cam.mpp);
  const R = lightR(v.gt);
  if (k <= 0.01 || R <= 0) return;
  const rpx = v.ws(R);
  if (rpx > 6000) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  const band = L.clamp(rpx * 0.16, 30, 120);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (const p of PH) {
    const o = (p.o + v.gt * p.sp) % 1;                 // drift outward through the shell, fade at its outer edge
    const r0 = rpx + 4 + o * band;
    const x0 = cx + Math.cos(p.a) * r0, y0 = cy + Math.sin(p.a) * r0;
    if (x0 < -40 || x0 > W + 40 || y0 < -40 || y0 > H + 40) continue;
    const a = k * p.b * Math.pow(1 - o, 1.4) * L.clamp(o * 6);
    const l = p.len * (0.6 + 0.4 * (1 - o));
    const g = c.createLinearGradient(x0 - Math.cos(p.a) * l, y0 - Math.sin(p.a) * l, x0, y0);
    g.addColorStop(0, 'rgba(255,220,160,0)');
    g.addColorStop(1, `rgba(255,240,215,${0.7 * a})`);
    c.strokeStyle = g;
    c.lineWidth = p.w;
    c.beginPath(); c.moveTo(x0 - Math.cos(p.a) * l, y0 - Math.sin(p.a) * l); c.lineTo(x0, y0); c.stroke();
  }
  c.restore();
}

function drawDimension(c, v, k) {
  const A = axis(v);
  const kd = L.ease.inOutCubic(L.prog(v.gt, T3.dim0, 0.9)) * k;
  if (kd <= 0.003) return;
  // on the axis itself, from the Sun's marker to Earth's ring, so it reads as Sun-to-Earth at a glance
  const ax = A.sx + A.ux * 18, ay = A.sy + A.uy * 18;
  const L1 = A.len - 18 - 30;
  const bx = ax + A.ux * L1 * kd, by = ay + A.uy * L1 * kd;
  c.save();
  // recedes during s04's race (the racers cross it at the front; its number has been replaced by s04's label)
  const race = L.smoothstep(L.prog(v.gt, 18.2, 0.45));
  c.globalAlpha *= k * (1 - 0.72 * race);
  c.strokeStyle = 'rgba(236,232,246,0.85)';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
  const tick = (x, y, s) => { c.beginPath(); c.moveTo(x - A.nx * s, y - A.ny * s); c.lineTo(x + A.nx * s, y + A.ny * s); c.stroke(); };
  tick(ax, ay, 11);
  if (kd > 0.98) tick(bx, by, 11 * L.prog(v.gt, T3.dim0 + 0.85, 0.2));
  c.restore();
}

function drawEarthMark(c, v, k) {
  const ke = L.ease.outBack(L.prog(v.gt, 14.75, 0.55)) * k;
  if (ke <= 0.003) return;
  const A = axis(v);
  c.save();
  c.globalAlpha *= L.clamp(ke);
  c.strokeStyle = 'rgba(170,205,255,0.85)';
  c.lineWidth = 2;
  const r = 22 * ke + 2 * Math.sin(v.gt * 2.2);
  c.beginPath(); c.arc(A.ex, A.ey, Math.max(0, r), 0, TAU); c.stroke();
  c.font = L.font(22, 600, L.FONT.body);
  c.fillStyle = 'rgba(205,222,245,0.95)';
  c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
  L.trackedText(c, 'EARTH', A.ex, A.ey + 62, 4, 'center');
  c.restore();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Light in flight', sub: 'the last sunlight is still on its way' },
  layer: 2,
  cues() {
    const b = 12.924;
    return [
      { t: 0.0, name: 'whoosh', gain: 0.38, pitch: 0.75 },
      { t: 0.25, name: 'riser', gain: 0.16, pitch: 0.8 },
      { t: T3.dim0 - b, name: 'swell', gain: 0.26, pitch: 0.9 },
      { t: 14.8 - b, name: 'blip', gain: 0.14, pitch: 1.3 },
      { t: T3.big - b, name: 'tick', gain: 0.18, pitch: 1.0 },
      { t: T3.dim0 + 0.9 - b, name: 'tick', gain: 0.16, pitch: 1.4 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt < 13.3 || v.gt > 21.2) return;
    drawPhotons(c, v);
    const k = annK(v);
    if (k <= 0.003) return;
    drawDimension(c, v, k);
    drawEarthMark(c, v, k);
    c.save();
    c.globalAlpha *= sysK(v.cam.mpp);
    label2(c, {
      x: LABEL.x, y: LABEL.y, big: '150 million km', small: '93 million mi · 8 min 20 s at light speed',
      kb: L.prog(v.gt, T3.big, 0.6), ks: L.prog(v.gt, T3.small, 0.5), ko: L.prog(v.gt, T3.out, 0.3), size: LABEL.size, accent: v.accent, backing: 0.55,
    });
    c.restore();
  },
};
