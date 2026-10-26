// Beat 10 — "The strange part? | Earth really is slowing down."
// The orbit becomes a CALENDAR: 365 day ticks draw themselves round the ring from Earth (a tag counts them up
// to "365 DAYS IN A YEAR"). The real Earth spins again (continents and the city turn, a spin arrow), and on
// "slowing down" the spin visibly eases off while "+ ~2 ms / per century" lands.
//
// Exports the tick ring for beat 11 (this file draws it for beats 10–12): tickCount() re-divides the same ring
// from 365 to ~400 ticks in beat 11, and rewindHead() is beat 11's rewind sweep (ticks flare as it passes).
import * as L from '../../../../engine/runtime/lib.js';
import { AU, SUN, wordTime } from '../env.js';
import { arcText, times } from './s09-day-is-a-year.js';

const { W, ease, clamp, prog, rgba } = L;
const TAU = Math.PI * 2;
const TICK = [214, 224, 240];

const ph = (tl, i) => tl.lines[i].phrases ?? [tl.lines[i]];
/** Beat 10–11 ring timing (global s). */
export function ringTimes(tl) {
  const T = times(tl);
  return {
    ...T,
    draw0: T.s10 + 0.25, drawDur: 1.45,                    // the 365 ticks draw on "The strange part?"
    label: ph(tl, 10)[1].start + 0.05,                      // "+ ~2 ms" on "Earth really is slowing down"
    div0: ph(tl, 11)[1].start - 0.05, divDur: 1.3,         // beat 11: re-divide to 400 on "a year had..."
    four: wordTime(tl, 11, /^four$/i) > ph(tl, 11)[1].start ? wordTime(tl, 11, /^four$/i) : ph(tl, 11)[1].start + 1.0,
  };
}
/** Number of day ticks on the ring at global gt (365, then 400 for 400 million years ago). */
export function tickCount(R, gt) {
  return L.lerp(365, 400, ease.inOutCubic(prog(gt, R.div0, R.divDur)));
}
/** Beat 11's rewind sweep: head angle (rad, screen; clockwise = back in time) and its speed 0..1, or null. */
export function rewindHead(R, gt) {
  const p = prog(gt, R.rew0, R.rew1 - R.rew0);
  if (p <= 0 || p >= 1) return null;
  const a = 4 * TAU * ease.inOutCubic(p);
  const sp = p < 0.5 ? 12 * p * p : 12 * (1 - p) * (1 - p);   // derivative of inOutCubic / 1.5
  return { a, speed: clamp(sp / 1.5), p };
}

/** Draws the calendar ring of day ticks around the Sun (beats 10–12). */
function drawTicks(ctx, v, R) {
  const gt = v.gt, Rp = v.ws(AU);
  if (Rp < 150 || Rp > 4000) return;
  const vis = ease.outCubic(prog(gt, R.s10 - 0.05, 0.4)) * (1 - ease.inCubic(prog(gt, R.s12 - 0.25, 0.3)));
  if (vis <= 0) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  const N = tickCount(R, gt), n = Math.floor(N), frac = N - n;
  const drawn = ease.inOutCubic(prog(gt, R.draw0, R.drawDur));      // 0..1 of the ring drawn
  const head = rewindHead(R, gt);
  const maj = new Set(Array.from({ length: 12 }, (_, m) => Math.round((m * N) / 12)));
  ctx.save();
  ctx.lineCap = 'round';
  // base line of the calendar ring
  ctx.strokeStyle = `rgba(200,214,236,${0.22 * vis})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, Rp), 0, -TAU * Math.max(drawn, gt > R.s11 ? 1 : 0) + 1e-4, true); ctx.stroke();
  // ticks, in two passes (minor, month)
  for (const major of [false, true]) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      if (maj.has(i) !== major) continue;
      const u = i / N;
      if (i === n && frac <= 0.001) continue;
      const grow = clamp((drawn - u) * 30);                     // the leading ticks grow in
      if (grow <= 0) continue;
      const lenFull = major ? 20 : 10;
      const len = lenFull * ease.outCubic(grow) * (i === n ? frac : 1);
      const a = -TAU * u, c = Math.cos(a), s = Math.sin(a);
      ctx.moveTo(cx + c * (Rp - 2), cy + s * (Rp - 2));
      ctx.lineTo(cx + c * (Rp - 2 - len), cy + s * (Rp - 2 - len));
    }
    ctx.strokeStyle = major ? rgba(v.accent, 0.85 * vis) : rgba(TICK, 0.55 * vis);
    ctx.lineWidth = major ? 2.2 : 1.4;
    ctx.stroke();
  }
  // drawing head
  if (drawn > 0 && drawn < 1) {
    const a = -TAU * drawn;
    L.lightBlob(ctx, cx + Rp * Math.cos(a), cy + Rp * Math.sin(a), 34, [220, 240, 255], 0.7 * Math.sin(Math.PI * drawn) * vis);
  }
  // beat 11's rewind: a comet sweeping clockwise (back in time), the ticks it passes flare
  if (head) {
    ctx.globalCompositeOperation = 'lighter';
    const trail = 0.25 + 1.4 * head.speed, NS = 28;
    for (let j = 0; j < NS; j++) {
      const b0 = head.a - trail * (j + 1) / NS, b1 = head.a - trail * j / NS;
      const al = Math.pow(1 - j / NS, 1.6) * 0.9 * vis;
      ctx.strokeStyle = rgba(v.accent, al);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, Rp), b0, b1); ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = -TAU * i / N;
      let da = ((head.a - a) % TAU + TAU) % TAU;               // how far behind the head (clockwise)
      if (da > trail) continue;
      const c = Math.cos(a), s = Math.sin(a), len = 14 * (1 - da / trail);
      ctx.moveTo(cx + c * (Rp - 2), cy + s * (Rp - 2));
      ctx.lineTo(cx + c * (Rp - 4 - len), cy + s * (Rp - 4 - len));
    }
    ctx.strokeStyle = rgba(v.accent, 0.8 * vis);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    L.lightBlob(ctx, cx + Rp * Math.cos(head.a), cy + Rp * Math.sin(head.a), 46, [210, 250, 255], 0.85 * vis);
  }
  ctx.restore();
  // the count, set along the top of the ring
  const tk = ease.outCubic(prog(gt, R.draw0 + 0.35, 0.4)) * vis * (1 - ease.inCubic(prog(gt, R.s12 - 0.4, 0.3)));
  if (tk > 0) {
    const count = gt < R.s11 ? Math.round(365 * drawn) : Math.round(N);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 8;
    ctx.font = L.font(23, 700, L.FONT.body);
    ctx.fillStyle = rgba([226, 234, 246], 0.95 * tk);
    arcText(ctx, `${count} DAYS IN A YEAR`, cx, cy, Rp - 40, -Math.PI / 2, 4);
    ctx.restore();
  }
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'Slowing down', sub: 'The real Earth' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.25, name: 'count', gain: 0.24, pitch: 1.2 },        // the 365 day ticks draw
      { t: 1.65, name: 'tick', gain: 0.26, pitch: 1.0 },         // calendar complete
      { t: 0.35, name: 'swish', gain: 0.14, pitch: 0.8 },        // the Earth spins again
      { t: 1.85, name: 'creak', gain: 0.22, pitch: 0.6 },        // "slowing down": the spin eases off
      { t: 1.9, name: 'ping', gain: 0.3, pitch: 0.8 },           // "+ ~2 ms" lands
    ];
  },
  drawWorld(ctx, v) {
    const s = v.tl.scenes;
    if (v.gt < s[10].start - 0.1 || v.gt > s[12].start + 0.6) return;
    drawTicks(ctx, v, ringTimes(v.tl));
  },
  drawOverlay(ctx, v) {
    const R = ringTimes(v.tl);
    const k = v.k * prog(v.gt, R.label, 0.55);
    L.bigLabel(ctx, { x: W / 2, y: 632, big: '+ ~2 ms', small: 'per century, the day gets longer', k, accent: v.accent, align: 'center', size: 80 });
  },
};
