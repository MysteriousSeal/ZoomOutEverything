// Beat 4 — "A year is one trip around the Sun."
// As the camera pulls back to the Sun, a comet-like light leaves the Earth and runs one lap of the Earth's orbit,
// drawing it as a hairline (12 faint month ticks appear as it passes), and arrives home with a soft bloom on the
// Earth. Counter (centred under the Sun, inside the orbit) counts with the lap and locks on "365¼ DAYS".
// The orbit stays as a quiet hairline for the orrery hold of beat 5 and leaves as beat 6 flies back to the Moon.
import * as L from '../../../../engine/runtime/lib.js';
import { EARTH, SUN, EARTH_ORBIT } from '../env.js';
import { countLabel } from './s03-month.js';

const { W } = L;
const TAU = Math.PI * 2;
const EARTH_COL = [150, 200, 240];
const LAP = { t0: 0.5, dur: 1.2 };    // beat-local: starts once the pull-back has mostly landed (head stays in frame)
const T_COUNT = 0.95;                 // the counter enters after the Sun has passed its band
const A0 = Math.atan2(EARTH.y - SUN.y, EARTH.x - SUN.x);   // the Earth's angle round the Sun

const lapE = (gt, tl) => L.ease.inOutCubic(L.prog(gt, tl.scenes[4].start + LAP.t0, LAP.dur));

function drawOrbit(c, v) {
  const tl = v.tl, t4 = tl.scenes[4].start, t6 = tl.scenes[6].start;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y), r = v.ws(EARTH_ORBIT);
  if (r < 3 || r > 60000) return;
  const kOut = 1 - L.ease.inOutCubic(L.prog(v.gt, t6 - 0.05, 0.8));
  if (kOut <= 0) return;
  const lap = lapE(v.gt, tl);
  const lapping = v.gt < t4 + LAP.t0 + LAP.dur + 0.05;
  const aH = A0 + TAU * lap;
  c.save();
  c.globalAlpha *= kOut;
  c.lineCap = 'round';
  // the drawn orbit (full once the lap is done)
  c.strokeStyle = L.rgba([225, 215, 195], lapping ? 0.42 : 0.3);
  c.lineWidth = 1.5;
  if (lap > 0) { c.beginPath(); c.arc(cx, cy, r, A0, lapping ? aH : A0 + TAU); c.stroke(); }
  // month ticks (12), appearing as the light passes
  const swept = lapping ? TAU * lap : TAU;
  const kTick = 1 - L.ease.inOutCubic(L.prog(v.gt, tl.scenes[5].start + 0.2, 0.6));
  if (kTick > 0 && r > 80) {
    for (let i = 1; i < 12; i++) {
      const ai = (i * TAU) / 12;
      if (ai > swept) break;
      const kk = L.clamp((swept - ai) / 0.4) * kTick;
      const a = A0 + ai;
      c.strokeStyle = L.rgba([225, 215, 195], 0.45 * kk);
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      c.lineTo(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6));
      c.stroke();
    }
  }
  // the comet: a tapered bright tail behind a hot head
  if (lap > 0 && lapping) {
    const tail = Math.min(0.9, TAU * lap);
    const n = 18;
    c.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      c.strokeStyle = L.rgba(EARTH_COL, 0.55 * u1 * u1);
      c.lineWidth = 1.5 + 6 * u1 * u1;
      c.beginPath(); c.arc(cx, cy, r, aH - tail * (1 - u0), aH - tail * (1 - u1)); c.stroke();
    }
    const hx = cx + Math.cos(aH) * r, hy = cy + Math.sin(aH) * r;
    const hk = Math.sin(Math.PI * Math.min(1, lap * 1.02));
    L.lightBlob(c, hx, hy, 70, EARTH_COL, 0.45 * (0.4 + 0.6 * hk));
    L.lightBlob(c, hx, hy, 16, [235, 245, 255], 0.9);
  }
  // homecoming: a bloom on the Earth
  const done = L.prog(v.gt, t4 + LAP.t0 + LAP.dur - 0.05, 0.9);
  if (done > 0 && done < 1) {
    const ex = v.wx(EARTH.x), ey = v.wy(EARTH.y);
    L.lightBlob(c, ex, ey, 90, EARTH_COL, 0.5 * (1 - done));
    c.strokeStyle = L.rgba(EARTH_COL, 0.6 * (1 - done));
    c.lineWidth = 2;
    c.beginPath(); c.arc(ex, ey, Math.max(0, 12 + 40 * L.ease.outCubic(done)), 0, TAU); c.stroke();
  }
  c.restore();
}

const CARRY = { out: 0.15, len: 0.25 };  // fade starts at beat end + out, lasts len (gone as s05's "7 DAYS?" lands)

function drawCount(ctx, v) {
  const gq = Math.round(v.gt * 30) / 30;
  const lap = lapE(gq, v.tl);
  const done = lap >= 0.999;
  const num = done ? '365¼' : String(Math.min(365, Math.floor(365.25 * lap)));
  const kin = L.ease.outCubic(L.prog(v.t, 0, 0.45));
  const kout = 1 - L.ease.inCubic(L.prog(v.t, v.d + CARRY.out, CARRY.len));
  countLabel(ctx, {
    x: W / 2, y: 1072, num, final: '365¼', unit: 'DAYS', small: 'one orbit of the Sun',
    k: Math.min(kin, kout) * L.enter(v.t, T_COUNT, 0.45), accent: v.accent, size: 96, lock: L.prog(v.t, LAP.t0 + LAP.dur, 0.8),
  });
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'One year', sub: 'One orbit of the Sun' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: LAP.t0, name: 'whoosh', gain: 0.18, pitch: 1.1 },
      { t: T_COUNT + 0.05, name: 'count', gain: 0.1, pitch: 1.15 },
      { t: LAP.t0 + LAP.dur, name: 'bloom', gain: 0.22, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    drawOrbit(ctx, v);
    // the locked "365¼ DAYS" carries ~0.5 s into beat 5 (overlays stop at the beat end, so this tail is drawn here)
    if (v.t >= v.d - 0.1 && v.t < v.d + CARRY.out + CARRY.len) { ctx.save(); drawCount(ctx, v); ctx.restore(); }
  },
  drawOverlay(ctx, v) {
    if (v.t < v.d - 0.1) drawCount(ctx, v);
  },
};
