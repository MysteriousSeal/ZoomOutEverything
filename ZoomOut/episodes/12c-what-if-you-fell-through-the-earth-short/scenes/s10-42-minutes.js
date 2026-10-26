// Beat 8 (12c) — "The whole trip takes about forty-two minutes."
// f12cc: the faller stays at rest on the far side (no fall back in 12c). The trip is REPLAYED start to finish: a ghost
// faller leaves the hole and falls to the far side in simple harmonic motion (camera.js TRIP / tripDepth) while the
// planet's limb becomes the dial of a 42-minute clock. Two accent arcs sweep down both sides of the globe from the
// hole at a steady pace (equal angles = equal minutes) and a level line ties their tips to the ghost: the fall is
// exactly the shadow of that steady sweep. The arcs meet at the far side at RUN_A.t1, the instant the ghost reaches
// the resting faller, and the trip clock below locks at 42:00, then settles into "42 min / one way".
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, TRIP, tripDepth } from '../camera.js';
import { RUN_A, COOL, fallFrac, drawTripClock, clockOwner, BEAT_TRIP, BEAT_CITIES } from './lib-clock.js';
import { BS } from '../camera.js';

const BEAT = BEAT_TRIP;
const LOCK = RUN_A.t1;   // the arcs meet at the far side, on "...forty-two"

/** 0..1 visibility of the dial (in with the beat, out as London - New York takes over). */
function dialK(gt) {
  return L.ease.outCubic(L.prog(gt, BS[BEAT_TRIP] + 0.22, 0.5)) * (1 - L.ease.inCubic(L.prog(gt, BS[BEAT_CITIES] + 0.25, 0.8)));
}

function drawDial(ctx, v, k) {
  const gt = v.gt;
  const cx = v.wx(0), cy = v.wy(R_EARTH), rp = v.ws(R_EARTH);
  const rr = rp + 7;                      // the arc rides just outside the limb
  const s = fallFrac(gt);                 // 0..1 of the trip (with the entrance catch-up)
  const th = Math.PI * s;
  const TOP = -Math.PI / 2;   // the sweep starts at the hole
  ctx.save();
  ctx.globalAlpha *= k;
  const a0 = ctx.globalAlpha;
  ctx.lineCap = 'round';
  // minute ticks: 42 per side, longer every 10 min; lit once the sweep has passed them
  for (let m = 0; m <= 42; m++) {
    const a = (Math.PI * m) / 42;
    const major = m % 10 === 0 || m === 42;
    const lit = a <= th + 1e-6;
    const r0 = rr + 9, r1 = rr + (major ? 27 : 16);
    ctx.strokeStyle = lit ? L.rgba(v.accent, major ? 0.95 : 0.7) : `rgba(225,230,240,${major ? 0.35 : 0.18})`;
    ctx.lineWidth = major ? 2.4 : 1.4;
    for (const sg of [1, -1]) {
      const ang = TOP + sg * a;
      // keep the HUD band (y < 300) clear: ticks fade out as they climb into it
      const hy = L.smoothstep(L.clamp(L.invLerp(292, 340, cy + Math.sin(ang) * r1)));
      if (hy <= 0.01) continue;
      ctx.globalAlpha = a0 * hy;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = a0;
  // faint full track
  ctx.strokeStyle = 'rgba(225,230,240,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), 0, Math.PI * 2); ctx.stroke();
  if (th > 0.001) {
    // the two sweeping arcs (glow + core)
    ctx.save();
    ctx.shadowColor = L.rgba(v.accent, 0.9);
    ctx.shadowBlur = 16;
    ctx.strokeStyle = L.rgba(v.accent, 0.95);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), TOP - th, TOP); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), TOP, TOP + th); ctx.stroke();
    ctx.restore();
    // tips + the level line to the faller (only once the catch-up has settled, so it truly lines up)
    const ty = cy + Math.sin(TOP + th) * rr;
    const txR = cx + Math.cos(TOP + th) * rr, txL = cx - Math.cos(TOP + th) * rr;
    const lv = L.prog(gt, TRIP.t0, 0.2) * (1 - L.prog(gt, LOCK - 0.2, 0.2));
    if (lv > 0) {
      const fy = v.wy(tripDepth(gt));
      ctx.save();
      ctx.globalAlpha *= lv;
      ctx.setLineDash([3, 8]);
      ctx.strokeStyle = L.rgba(COOL, 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(txL, ty); ctx.lineTo(cx - 14, fy); ctx.moveTo(cx + 14, fy); ctx.lineTo(txR, ty); ctx.stroke();
      ctx.restore();
    }
    if (s < 0.999) {
      for (const tx of [txL, txR]) {
        L.lightBlob(ctx, tx, ty, 40, v.accent, 0.7);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // the meeting at the far side: a flash and a ripple where the ghost reaches the resting faller
  const age = gt - LOCK;
  if (age > -0.05) {
    const a = Math.max(0, age);
    const f = Math.exp(-a * 2.4) * L.clamp((age + 0.05) / 0.05);
    const tx = cx, ty = cy + rr;
    // the flash + ripple spread inside the planet only (the limb is a natural edge)
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr - 1), 0, Math.PI * 2); ctx.clip();
    L.lightBlob(ctx, tx, ty - 20, 90, [255, 200, 150], 0.8 * f);
    const p = L.ease.outCubic(L.clamp(a / 1.2));
    ctx.strokeStyle = L.rgba(v.accent, 0.8 * (1 - p));
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(tx, ty, Math.max(0, 10 + 60 * p), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // after the lock the whole ring breathes once
    ctx.strokeStyle = L.rgba(v.accent, 0.45 * f);
    ctx.lineWidth = 10 * f;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** The replay ghost: a cool point with a short trail, waiting at the hole on "00:00", falling to the far side with the
 *  clock and merging into the resting faller there (it fades as the lock flash blooms). */
function drawGhost(ctx, v, k) {
  const gt = v.gt;
  const a = k * L.ease.outCubic(L.prog(gt, TRIP.t0 - 0.3, 0.25)) * (1 - L.ease.inCubic(L.prog(gt, TRIP.t1 - 0.02, 0.2)));
  if (a <= 0.002) return;
  const x = v.wx(0), y = v.wy(tripDepth(gt)), yb = v.wy(tripDepth(gt - 0.12));
  ctx.save();
  ctx.globalAlpha *= a;
  if (yb < y - 2) {
    const g = ctx.createLinearGradient(x, y, x, yb);
    g.addColorStop(0, L.rgba(COOL, 0.8)); g.addColorStop(1, L.rgba(COOL, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 2.5, yb, 5, y - yb);
  }
  L.lightBlob(ctx, x, y, 40, [170, 200, 255], 0.45);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(190,215,255,0.9)';
  ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export default {
  beat: BEAT,
  chapter: { num: '08', title: '42 minutes', sub: 'One way, start to finish' },
  captions: true,
  layer: 3,
  cues(d) {
    const b = BS[BEAT];
    return [
      { t: 0.1, name: 'shimmer', gain: 0.25, pitch: 1.0 },
      { t: 0.15, name: 'count', gain: 0.22, pitch: 1.2 },
      { t: LOCK - b - 0.5, name: 'riser', gain: 0.22, pitch: 1.1 },
      { t: LOCK - b, name: 'impact', gain: 0.55, pitch: 1.0 },
      { t: LOCK - b + 0.02, name: 'bloom', gain: 0.4, pitch: 1.0 },
      { t: LOCK - b + 0.2, name: 'tick', gain: 0.25, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const k = dialK(v.gt);
    if (k <= 0.002) return;
    drawDial(ctx, v, k);
    drawGhost(ctx, v, k);
  },
  drawOverlay(ctx, v) {
    if (clockOwner(v.gt) === BEAT) drawTripClock(ctx, v);
  },
};
