// Beat 3 — "A month is roughly one lunar cycle, about twenty-nine and a half days."
// env laps the Moon once (beat 3 + 0.35 s, 3.6 s). This scene draws the Moon's orbit as a hairline that follows it,
// with a short comet glow behind the Moon and 29.5 fine day ticks that appear as the Moon passes them. A centred
// counter (inside the orbit, under the Earth) counts the days with the lap and locks on "29.5 DAYS".
// After the beat the orbit stays as a quiet full hairline for the orrery (beats 4-6; s06 splits it into quarters)
// and is gone during the dive of beat 7. The day ticks bow out at beat 4.
//
// Shared (imported by s04): countLabel().
import * as L from '../../../../engine/runtime/lib.js';
import { EARTH, MOON_ORBIT, moonPos, MOON_LAP } from '../env.js';
import { adapt } from '../legacy.js';

const { W } = L;
const TAU = Math.PI * 2;
const MOON_COL = [215, 225, 242];
const LAP = MOON_LAP;   // env's lap (beat-local; 19c: 1.8 s from 0.15 s)

/**
 * The house big-number label, built so a counting number never jitters: the number is right-aligned to a fixed
 * point and the unit left-aligned after it; the pair is centred on x by its final width.
 * num: shown number string; final: the final number (layout width); unit; small; k entrance; lock 0..1 (flash).
 */
export function countLabel(c, { x, y, num, final, unit, small, k, accent, size = 96, lock = 0 }) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.textBaseline = 'alphabetic';
  c.font = L.font(size, 800, L.FONT.display);
  const gap = size * 0.22;
  const fw = c.measureText(final).width, uw = c.measureText(unit).width;
  const total = fw + gap + uw;
  const xn = x - total / 2 + fw;                           // right edge of the number
  const dy = (1 - e) * 30;
  // backing so it reads over stars and glows
  const bR = total * 0.75, bY = y - size * 0.15;
  const bg = c.createRadialGradient(x, bY, 10, x, bY, bR);
  bg.addColorStop(0, 'rgba(2,4,10,0.42)'); bg.addColorStop(0.6, 'rgba(2,4,10,0.22)'); bg.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = bg; c.beginPath(); c.arc(x, bY, bR, 0, Math.PI * 2); c.fill();
  // rule
  const ruleW = 90 * e;
  c.fillStyle = L.rgba(accent, 0.9);
  c.fillRect(x - ruleW / 2, y - size * 0.92 - 26, ruleW, 4);
  if (lock > 0 && lock < 1) L.lightBlob(c, x, y - size * 0.35, total * 0.7, accent, 0.25 * (1 - lock));
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
  c.fillStyle = L.rgba(accent);
  c.textAlign = 'right';
  c.fillText(num, xn, y + dy);
  c.textAlign = 'left';
  c.fillStyle = L.rgba(L.mix(accent, [255, 255, 255], 0.15));
  c.fillText(unit, xn + gap, y + dy);
  if (small) {
    c.shadowBlur = 8;
    c.font = L.font(30, 600, L.FONT.body);
    c.fillStyle = L.rgba([205, 215, 230], 0.95);
    L.trackedText(c, small.toUpperCase(), x, y + 52 + (1 - e) * 18, 3, 'center');
  }
  c.restore();
}

/** Lap progress 0..1, identical to env's moonAngle lap. */
const lapE = (gt, tl) => L.ease.inOutCubic(L.prog(gt, tl.scenes[3].start + LAP.t0, LAP.dur));

function drawOrbit(c, v) {
  const tl = v.tl, t3 = tl.scenes[3].start, t4 = tl.scenes[4].start, t7 = tl.scenes[7].start;
  const cx = v.wx(EARTH.x), cy = v.wy(EARTH.y), r = v.ws(MOON_ORBIT);
  if (r < 3 || r > 30000) return;
  const kOut = 1 - L.ease.inOutCubic(L.prog(v.gt, t7 - 0.05, 0.7));      // gone during the dive
  if (kOut <= 0) return;
  const kIn = L.ease.outCubic(L.prog(v.gt, t3 + 0.2, 0.4));
  const a0 = moonPos(t3 + LAP.t0, tl).a;                                 // where the lap starts
  const lap = lapE(v.gt, tl);
  const lapping = v.gt < t3 + LAP.t0 + LAP.dur + 0.05;
  const m = moonPos(v.gt, tl);
  c.save();
  c.globalAlpha *= kIn * kOut;
  c.lineCap = 'round';
  // the faint full track, so the shape of the orbit reads from the start
  c.strokeStyle = L.rgba(MOON_COL, 0.08 + 0.22 * lap);
  c.lineWidth = 1.2;
  c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
  // the hairline drawn behind the Moon
  if (lap > 0 && lapping) {
    const aH = a0 + TAU * lap;
    c.strokeStyle = L.rgba(MOON_COL, 0.55);
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(cx, cy, r, a0, aH); c.stroke();
    // comet glow: the last ~40° brighten toward the Moon
    const tail = Math.min(0.7, TAU * lap);
    const n = 14;
    c.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      c.strokeStyle = L.rgba([235, 240, 250], 0.5 * u1 * u1);
      c.lineWidth = 1.5 + 4 * u1;
      c.beginPath(); c.arc(cx, cy, r, aH - tail * (1 - u0), aH - tail * (1 - u1)); c.stroke();
    }
  }
  // the 29.5 day ticks: each appears as the Moon passes it, then they bow out at beat 4
  const kTick = 1 - L.ease.inOutCubic(L.prog(v.gt, t4 + 0.3, 0.6));
  if (kTick > 0 && r > 60) {
    const swept = lapping ? TAU * lap : TAU;
    for (let i = 0; i < 30; i++) {
      const ai = (i * TAU) / 29.5;
      if (ai > swept + 1e-6) break;
      const age = (swept - ai) / 0.5;
      const kk = L.clamp(age) * kTick;
      const a = a0 + ai;
      const len = (i === 0 ? 14 : 8) * (0.6 + 0.4 * L.clamp(age));
      c.strokeStyle = L.rgba(MOON_COL, 0.55 * kk);
      c.lineWidth = i === 0 ? 2 : 1.4;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4));
      c.lineTo(cx + Math.cos(a) * (r + 4 + len), cy + Math.sin(a) * (r + 4 + len));
      c.stroke();
    }
  }
  // completion: a soft pulse on the closed loop
  const done = L.prog(v.gt, t3 + LAP.t0 + LAP.dur - 0.1, 0.8);
  if (done > 0 && done < 1) {
    c.strokeStyle = L.rgba(MOON_COL, 0.35 * (1 - done));
    c.lineWidth = 2 + 6 * (1 - done);
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
  }
  c.restore();
  void m;
}

const CARRY = { out: -0.3, len: 0.28 };  // 19c visual audit: the locked "29.5 DAYS" fades out by the beat end (no linger into the year beat)

function drawCount(ctx, v) {
  // digits frozen per output frame (the overlay pass is motion-blurred)
  const gq = Math.round(v.gt * 30) / 30;
  const lap = lapE(gq, v.tl);
  const done = lap >= 0.999;
  const num = done ? '29.5' : String(Math.min(29, Math.floor(29.5 * lap)));
  const lock = L.prog(v.t, LAP.t0 + LAP.dur, 0.8);
  const kin = L.ease.outCubic(L.prog(v.t, 0, 0.45));
  const kout = 1 - L.ease.inOutCubic(L.prog(v.t, v.d + CARRY.out, CARRY.len));
  countLabel(ctx, {
    x: W / 2, y: 1052, num, final: '29.5', unit: num === '1' ? 'DAY' : 'DAYS', small: 'one lunar cycle',
    k: Math.min(kin, kout) * L.enter(v.t, 0.55, 0.45), accent: v.accent, size: 96, lock,
  });
}

const SCENE = {
  beat: 3,
  chapter: { num: '03', title: 'One month', sub: 'One lunar cycle' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: LAP.t0, name: 'swish', gain: 0.16, pitch: 0.75 },
      { t: 0.5, name: 'count', gain: 0.12, pitch: 1.0 },
      { t: LAP.t0 + LAP.dur - 0.05, name: 'ping', gain: 0.2, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    drawOrbit(ctx, v);
    // 19c: the locked count carries ~0.45 s into beat 4 (overlays stop at the beat end, so this tail is drawn here)
    if (v.t >= v.d - 0.1 && v.t < v.d + CARRY.out + CARRY.len) { ctx.save(); drawCount(ctx, v); ctx.restore(); }
  },
  drawOverlay(ctx, v) {
    if (v.t < v.d - 0.1) drawCount(ctx, v);
  },
};

// 19c: 19 beat 3 plays as a 19c beat on the legacy timeline (legacy.js)
export default adapt(SCENE, 3);
