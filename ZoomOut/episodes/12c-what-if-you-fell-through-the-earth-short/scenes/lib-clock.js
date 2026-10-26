// The shared TRIP CLOCK (12c; it lived in 12b's s09-fall-back.js, a beat this cut drops). s10 and s12 import it: one
// persistent readout, lower centre of the frame, that runs 00:00 -> 42:00 twice (the one-way trip replayed hole -> far
// side in beat 8, then London - New York in beat 9) and locks into "42 min". Every time comes from the timeline.
// f12cc: no fall back in 12c; run A is camera.js TRIP (a ghost replay of the trip, start to finish), it waits on "00:00"
// before it runs, and both runs lock on the spoken "42" (+ ~0.3 s).
import * as L from '../../../../engine/runtime/lib.js';
import { TRIP, tripS, BS, PH, wordT } from '../camera.js';

const { W } = L;
export const BEAT_TRIP = 8, BEAT_CITIES = 9;
export const COOL = [215, 232, 255];

// ------------------------------------------------------------------ shared timing (global seconds, from build/timeline.json)
export const RUN_A = { t0: TRIP.t0, t1: TRIP.t1, sub: 'ONE WAY' };   // the one-way trip replay (hole -> far side)
// the London - New York run starts with a swap: the locked "42 min" slides up out of a mask while "00:00" rises in
// (no rewinding digits). It runs under "Also about forty-two minutes" and locks just before the line ends.
const P_ALSO = PH(BEAT_CITIES, 1);
export const RUN_C = { t0: P_ALSO.start - 0.18, t1: wordT(BEAT_CITIES, 1, '42') + 0.1, sub: null, subAt: P_ALSO.start - 0.78, swapAt: P_ALSO.start - 0.78 };
const SWAP = 0.5;            // duration of the "42 min" -> "00:00" swap
/** Elapsed fraction (0..1) of run A: linear in time (equal minutes per second); "00:00" until it starts. */
export const fallFrac = (gt) => tripS(gt);

const runAt = (gt) => (gt < RUN_C.swapAt ? RUN_A : RUN_C);

/** Trip-clock state at gt: frac 0..1 of 42 min, lock 0..1 (":00" -> " min" morph), flash 0..1, swap 0..1 (1 = settled),
 *  sub text + crossfade. During a swap the outgoing readout is the previous run, locked at "42 min". */
export function clockState(gt) {
  const run = runAt(gt);
  const frac = run === RUN_A ? fallFrac(gt) : L.prog(gt, run.t0, run.t1 - run.t0);
  const swap = run === RUN_A ? 1 : L.ease.inOutCubic(L.prog(gt, run.swapAt, SWAP));
  let sub = RUN_A.sub, prevSub = null, subK = 1;
  if (gt >= RUN_C.subAt) { sub = RUN_C.sub; prevSub = RUN_A.sub; subK = L.prog(gt, RUN_C.subAt, SWAP); }
  const lock = L.ease.inOutCubic(L.prog(gt, run.t1 + 0.12, 0.45));
  const age = gt - run.t1;
  const flash = age < 0 ? 0 : Math.exp(-age * 3.2);
  return { frac: L.clamp(frac), lock, flash, swap, sub, prevSub, subK, running: frac > 0 && frac < 1 };
}

/** Visibility of the clock (0..1): in with beat 8, then stays (s12's overlay fades it as the question beat starts). */
export const clockK = (gt) => L.ease.outCubic(L.prog(gt, BS[BEAT_TRIP] + 0.18, 0.28));   // fully in on "00:00" before run A starts
/** Which scene draws the clock at gt (hand-off just after each beat start, when the new overlay is live). */
export const clockOwner = (gt) => (gt < BS[BEAT_CITIES] + 0.03 ? BEAT_TRIP : BEAT_CITIES);
export const CLOCK_X = 540, CLOCK_Y = 1068;   // digit baseline
/** Beat 9's push puts the chord high in the frame: the clock rises with it so the ending is not bottom-heavy. */
export const clockY = (gt) => CLOCK_Y - 125 * L.ease.inOutCubic(L.prog(gt, BS[BEAT_CITIES] + 0.2, 1.7));

const pad2 = (n) => String(n).padStart(2, '0');
const SIZE = 168;

/** One readout ("MM:SS" morphing to "MM min") centred on x, baseline y. */
function drawReadout(ctx, v, x, y, frac, lock, flash, running) {
  const size = SIZE;
  const secs = Math.min(42 * 60, Math.floor(frac * 42 * 60 + 1e-6));
  const mm = pad2(Math.floor(secs / 60)), ss = pad2(secs % 60);
  // digits on a fixed grid so they never jitter while running
  ctx.font = L.font(size, 700, L.FONT.din);
  ctx.textBaseline = 'alphabetic';
  const cw = Math.max(...'0123456789'.split('').map((d) => ctx.measureText(d).width));
  const colW = ctx.measureText(':').width + 6;
  ctx.font = L.font(Math.round(size * 0.5), 700, L.FONT.display);
  const minW = ctx.measureText('min').width;
  const wDigits = cw * 4 + colW, wMin = cw * 2 + 22 + minW;
  const x0 = x - L.lerp(wDigits, wMin, lock) / 2;
  const col = L.mix(L.mix([255, 255, 255], v.accent, 0.25 + 0.75 * Math.min(1, lock + (running ? 1 : 0.6))), [255, 255, 255], flash * 0.7);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = L.rgba(col);
  ctx.textAlign = 'center';
  ctx.font = L.font(size, 700, L.FONT.din);
  const cell = (ch, i) => ctx.fillText(ch, x0 + cw * (i + 0.5), y);
  cell(mm[0], 0); cell(mm[1], 1);
  // ":SS" slides down and fades as " min" rises in
  const lkA = L.ease.inCubic(L.prog(lock, 0, 0.5)), lkB = L.ease.outCubic(L.prog(lock, 0.45, 0.55));
  if (lkA < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - lkA;
    const dy = lkA * 22;
    ctx.fillText(':', x0 + cw * 2 + colW / 2, y - 8 + dy);
    ctx.fillText(ss[0], x0 + cw * 2 + colW + cw * 0.5, y + dy);
    ctx.fillText(ss[1], x0 + cw * 2 + colW + cw * 1.5, y + dy);
    ctx.restore();
  }
  if (lkB > 0) {
    ctx.save();
    ctx.globalAlpha *= lkB;
    ctx.textAlign = 'left';
    ctx.font = L.font(Math.round(size * 0.5), 700, L.FONT.display);
    ctx.fillText('min', x0 + cw * 2 + 22, y - 6 + (1 - lkB) * 22);
    ctx.restore();
  }
  ctx.restore();
}

/** The trip clock (screen space). Draw it from exactly one scene at a time (the active one). */
export function drawTripClock(ctx, v, kExtra = 1) {
  const k = clockK(v.gt) * kExtra;
  if (k <= 0.002) return;
  const st = clockState(v.gt);
  // digits use the frame's own time, so the motion-blur sub-frames all agree (a crisp readout, not a ghosted stack)
  const fq = clockState(Math.round(v.gt * 30) / 30).frac;
  const x = CLOCK_X, y = clockY(v.gt) + (1 - k) * 16;
  const size = SIZE;
  ctx.save();
  ctx.globalAlpha *= k;
  // a soft plate sized to the digits (no hard box): the planet behind it is bright and warm.
  // Dense under the glyphs, gone within ~70 px of them.
  ctx.save();
  ctx.translate(x, y - 48);
  ctx.scale(1, 0.42);
  const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 290);
  pg.addColorStop(0, 'rgba(10,6,5,0.7)'); pg.addColorStop(0.5, 'rgba(10,6,5,0.6)'); pg.addColorStop(0.78, 'rgba(10,6,5,0.3)'); pg.addColorStop(1, 'rgba(10,6,5,0)');
  ctx.fillStyle = pg;
  ctx.fillRect(-290, -290, 580, 580);
  ctx.restore();

  if (st.swap >= 1) {
    drawReadout(ctx, v, x, y, fq, st.lock, st.flash, st.running);
  } else {
    // the swap: a masked slide, the locked "42 min" leaves upward, "00:00" rises in from below
    const e = st.swap, H = size * 0.9;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 360, y - size * 0.75, 720, size * 0.75 + 10);   // the digit band only
    ctx.clip();
    // sequential: the old readout is fully gone before the new one starts (no stacked half-faded digits)
    const eo = L.clamp(e / 0.45), en = L.clamp((e - 0.55) / 0.45);
    if (eo < 1) { ctx.save(); ctx.globalAlpha *= 1 - L.ease.inCubic(eo); drawReadout(ctx, v, x, y - L.ease.inCubic(eo) * H * 0.5, 1, 1, 0, false); ctx.restore(); }
    if (en > 0) { ctx.save(); ctx.globalAlpha *= L.ease.outCubic(en); drawReadout(ctx, v, x, y + (1 - L.ease.outCubic(en)) * H * 0.5, 0, 0, 0, false); ctx.restore(); }
    ctx.restore();
  }
  // the lock flash: a short accent bloom behind the digits
  if (st.flash > 0.01) L.lightBlob(ctx, x, y - 60, 260, v.accent, 0.35 * st.flash);
  // rule above, sub line below (crossfades between runs)
  ctx.fillStyle = L.rgba(v.accent, 0.9);
  const rw = 90 * L.ease.outCubic(L.prog(v.gt, BS[BEAT_TRIP] + 0.25, 0.5));
  ctx.fillRect(x - rw / 2, y - size * 0.86 - 20, rw, 4);
  ctx.font = L.font(26, 600, L.FONT.body);
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 10;
  const subLine = (txt, a, dy) => {
    if (a <= 0.01 || !txt) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(222,226,236,0.95)';
    L.trackedText(ctx, txt, x, y + 50 + dy, 4, 'center'); ctx.restore();
  };
  // sequential swap: the old line leaves first, then the new one rises in
  const kNew = st.prevSub ? L.ease.outCubic(L.prog(st.subK, 0.45, 0.55)) : 1;
  const kOld = st.prevSub ? 1 - L.ease.inCubic(L.prog(st.subK, 0, 0.45)) : 0;
  subLine(st.sub, kNew, (1 - kNew) * 10);
  if (st.prevSub) subLine(st.prevSub, kOld, -(1 - kOld) * 8);
  ctx.restore();
}
