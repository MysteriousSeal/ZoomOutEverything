// Beat 9 — "Unless someone grabs you, | you fall straight back in."
// A slim round-trip loop hugs the tunnel inside the planet (dashes flowing, arrowheads up one side and down the
// other): back and forth, forever. It draws in on "unless someone grabs you"; at 43.5 s the faller drops.
//
// Also home of the shared TRIP CLOCK (s10, s11, s12 import it): one persistent readout, lower centre of the frame,
// that runs 00:00 -> 42:00 three times (the fall back, the city chords, London - New York) and locks into "42 min".
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, FALL_BACK, fallerDepth, tripFraction } from '../camera.js';

const { W } = L;
const BEAT = 9;
export const COOL = [215, 232, 255];

// ------------------------------------------------------------------ shared timing (global seconds, from build/timeline.json)
export const BEAT_START = { 9: 41.497, 10: 45.304, 11: 48.123, 12: 54.002 };
export const RUN_A = { t0: FALL_BACK.start, t1: FALL_BACK.start + FALL_BACK.half, sub: 'ONE WAY' };   // the fall back
// each later run starts with a swap: the locked "42 min" slides up out of a mask while "00:00" rises in (no rewinding digits)
export const RUN_B = { t0: 51.40, t1: 53.40, sub: 'ANY TWO CITIES', subAt: 50.2, swapAt: 50.95 };   // the city chords
export const RUN_C = { t0: 55.70, t1: 57.55, sub: null, subAt: 55.1, swapAt: 55.1 };                 // the Atlantic chord (the city tags name it)
const SWAP = 0.5;            // duration of the "42 min" -> "00:00" swap
const CATCH = [BEAT_START[10] + 0.1, 0.8];   // the clock appears mid-fall: digits + ring catch up to the real value

/** Elapsed fraction (0..1) of the fall back (run A), with the entrance catch-up. */
export function fallFrac(gt) {
  if (gt <= RUN_A.t0) return 0;
  const s = gt >= RUN_A.t1 ? 1 : 1 - tripFraction(fallerDepth(gt));
  return s * L.ease.outCubic(L.prog(gt, CATCH[0], CATCH[1]));
}

const runAt = (gt) => (gt < RUN_B.swapAt ? RUN_A : gt < RUN_C.swapAt ? RUN_B : RUN_C);

/** Trip-clock state at gt: frac 0..1 of 42 min, lock 0..1 (":00" -> " min" morph), flash 0..1, swap 0..1 (1 = settled),
 *  sub text + crossfade. During a swap the outgoing readout is the previous run, locked at "42 min". */
export function clockState(gt) {
  const run = runAt(gt);
  const frac = run === RUN_A ? fallFrac(gt) : L.prog(gt, run.t0, run.t1 - run.t0);
  const swap = run === RUN_A ? 1 : L.ease.inOutCubic(L.prog(gt, run.swapAt, SWAP));
  let sub = RUN_A.sub, prevSub = null, subK = 1;
  if (gt >= RUN_C.subAt) { sub = RUN_C.sub; prevSub = RUN_B.sub; subK = L.prog(gt, RUN_C.subAt, SWAP); }
  else if (gt >= RUN_B.subAt) { sub = RUN_B.sub; prevSub = RUN_A.sub; subK = L.prog(gt, RUN_B.subAt, 0.7); }
  const lock = L.ease.inOutCubic(L.prog(gt, run.t1 + 0.12, 0.45));
  const age = gt - run.t1;
  const flash = age < 0 ? 0 : Math.exp(-age * 3.2);
  return { frac: L.clamp(frac), lock, flash, swap, sub, prevSub, subK, running: frac > 0 && frac < 1 };
}

/** Visibility of the clock (0..1): in with beat 10, then stays to the end of the film. */
export const clockK = (gt) => L.ease.outCubic(L.prog(gt, BEAT_START[10] + 0.12, 0.5));
/** Which scene draws the clock at gt (hand-off just after each beat start, when the new overlay is live). */
export const clockOwner = (gt) => (gt < BEAT_START[11] + 0.03 ? 10 : gt < BEAT_START[12] + 0.03 ? 11 : 12);
export const CLOCK_X = 540, CLOCK_Y = 1068;   // digit baseline
/** Beat 12's push puts the chord high in the frame: the clock rises with it so the ending is not bottom-heavy. */
export const clockY = (gt) => CLOCK_Y - 125 * L.ease.inOutCubic(L.prog(gt, BEAT_START[12] + 0.2, 1.7));

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
  const rw = 90 * L.ease.outCubic(L.prog(v.gt, BEAT_START[10] + 0.25, 0.5));
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

// ------------------------------------------------------------------ the round trip
// A slim loop hugging the tunnel, inside the planet: down one side, up the other, with arrowheads and dashes that
// keep flowing — back and forth, forever. It draws itself in from the far side on "Unless someone grabs you".
const T_TRACE = BEAT_START[BEAT] + 0.25;   // the loop starts drawing

/** 0..1 visibility of the loop. */
function traceK(gt) {
  return L.ease.outCubic(L.prog(gt, T_TRACE, 0.6)) * (1 - L.ease.inCubic(L.prog(gt, BEAT_START[10] - 0.45, 0.4)));   // gone before the clock arrives
}

function drawTrace(ctx, v, k) {
  const gt = v.gt, cx = v.wx(0), cy = v.wy(R_EARTH), rp = v.ws(R_EARTH);
  const rx = 34, ry = rp - 34;
  const draw = L.ease.inOutCubic(L.prog(gt, T_TRACE + 0.1, 1.1));   // 0..1: the loop grows from the bottom
  if (draw <= 0) return;
  // the loop as a polyline starting at the bottom, going up the right side and down the left, both halves growing
  const N = 120, pts = [];
  for (let i = 0; i <= N; i++) { const a = Math.PI / 2 - (i / N) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  const half = Math.round((N / 2) * draw);
  const path = () => {
    ctx.beginPath();
    for (let i = 0; i <= half; i++) { const p = pts[i]; i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    for (let i = 0; i <= half; i++) { const p = pts[N - i]; i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
  };
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(6,4,6,0.45)'; ctx.lineWidth = 6; path(); ctx.stroke();
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = -gt * 34;
  ctx.shadowColor = 'rgba(170,205,255,0.8)'; ctx.shadowBlur = 8;
  ctx.strokeStyle = L.rgba(COOL, 0.9); ctx.lineWidth = 2.6; path(); ctx.stroke();
  ctx.setLineDash([]);
  // arrowheads at mid-height: up on the right (the way you come back), down on the left (the way you fall again)
  const ak = L.ease.outBack(L.prog(gt, T_TRACE + 0.9, 0.4), 1.6);
  if (ak > 0) {
    for (const [sx, dir] of [[1, -1], [-1, 1]]) {
      const ax = cx + sx * rx, ay = cy;
      const s = 11 * ak;
      ctx.fillStyle = L.rgba(COOL, 0.95);
      ctx.beginPath(); ctx.moveTo(ax, ay + dir * s); ctx.lineTo(ax - s * 0.75, ay - dir * s * 0.6); ctx.lineTo(ax + s * 0.75, ay - dir * s * 0.6); ctx.closePath(); ctx.fill();
    }
  }
  // the pen: a small ring riding on the faller
  ctx.shadowBlur = 0;
  const yp = v.wy(fallerDepth(gt));
  ctx.strokeStyle = L.rgba(COOL, 0.7);
  ctx.lineWidth = 1.6;
  const pr = 15 + 2 * Math.sin(gt * 3.2);
  ctx.beginPath(); ctx.arc(cx, yp, Math.max(0, pr), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export default {
  beat: BEAT,
  chapter: { num: '09', title: 'Back again', sub: 'An endless round trip' },
  captions: true,
  layer: 3,
  cues(d) {
    const b = BEAT_START[BEAT];
    return [
      { t: 0.3, name: 'tick', gain: 0.22, pitch: 1.1 },
      { t: 0.45, name: 'shimmer', gain: 0.2, pitch: 0.9 },
      { t: FALL_BACK.start - b - 0.35, name: 'riser', gain: 0.18, pitch: 0.9 },
      { t: FALL_BACK.start - b, name: 'whoosh', gain: 0.38, pitch: 0.8 },
      { t: FALL_BACK.start - b + 0.05, name: 'deep', gain: 0.22, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const k = traceK(v.gt);
    if (k <= 0.002) return;
    drawTrace(ctx, v, k);
  },
  drawOverlay() {},
};
