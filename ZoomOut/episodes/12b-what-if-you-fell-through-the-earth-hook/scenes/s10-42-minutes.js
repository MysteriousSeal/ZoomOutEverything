// Beat 10 — "The whole trip takes about forty-two minutes."
// The planet's limb becomes the dial of a 42-minute clock. Two accent arcs sweep up both sides of the globe from the
// far side at a steady pace (equal angles = equal minutes) and a level line ties their tips to the faller: the fall is
// exactly the shadow of that steady sweep (simple harmonic motion). The arcs meet at the hole at 47.5 s, the instant
// the faller pops out, and the trip clock below locks at 42:00, then settles into "42 min / one way".
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, fallerDepth } from '../camera.js';
import { BEAT_START, RUN_A, COOL, fallFrac, drawTripClock, clockOwner } from './s09-fall-back.js';

const BEAT = 10;
const LOCK = RUN_A.t1;   // 47.5: the arcs meet at the top

/** 0..1 visibility of the dial (in with the beat, out as the city chords take over). */
function dialK(gt) {
  return L.ease.outCubic(L.prog(gt, BEAT_START[10] + 0.22, 0.5)) * (1 - L.ease.inCubic(L.prog(gt, BEAT_START[11] + 0.25, 0.8)));
}

function drawDial(ctx, v, k) {
  const gt = v.gt;
  const cx = v.wx(0), cy = v.wy(R_EARTH), rp = v.ws(R_EARTH);
  const rr = rp + 7;                      // the arc rides just outside the limb
  const s = fallFrac(gt);                 // 0..1 of the trip (with the entrance catch-up)
  const th = Math.PI * s;
  const BOT = Math.PI / 2;
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
      const ang = BOT - sg * a;
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
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), BOT - th, BOT); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr), BOT, BOT + th); ctx.stroke();
    ctx.restore();
    // tips + the level line to the faller (only once the catch-up has settled, so it truly lines up)
    const ty = cy + Math.sin(BOT - th) * rr;
    const txR = cx + Math.cos(BOT - th) * rr, txL = cx - Math.cos(BOT - th) * rr;
    const lv = L.prog(gt, BEAT_START[10] + 0.75, 0.4) * (1 - L.prog(gt, LOCK - 0.25, 0.25));
    if (lv > 0) {
      const fy = v.wy(fallerDepth(gt));
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
  // the meeting at the top: a flash and a ripple on the hole
  const age = gt - LOCK;
  if (age > -0.05) {
    const a = Math.max(0, age);
    const f = Math.exp(-a * 2.4) * L.clamp((age + 0.05) / 0.05);
    const tx = cx, ty = cy - rr;
    // the flash + ripple spread inside the planet only (the limb is a natural edge, and the HUD band above stays clear)
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rr - 1), 0, Math.PI * 2); ctx.clip();
    L.lightBlob(ctx, tx, ty + 20, 90, [255, 200, 150], 0.8 * f);
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

export default {
  beat: BEAT,
  chapter: { num: '10', title: '42 minutes', sub: 'One way, start to finish' },
  captions: true,
  layer: 3,
  cues(d) {
    const b = BEAT_START[BEAT];
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
  },
  drawOverlay(ctx, v) {
    if (clockOwner(v.gt) === BEAT) drawTripClock(ctx, v);
  },
};
