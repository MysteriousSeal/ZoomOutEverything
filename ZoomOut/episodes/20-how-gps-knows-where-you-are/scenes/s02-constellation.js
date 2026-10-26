// Beat 2 — "About thirty-one GPS satellites orbit the Earth, | some twenty thousand kilometers up."
// The climb is the camera's job and env reveals the 31 glints in a sweep around the planet. This scene lands the
// count IN SYNC with that sweep: a big "31" that counts up with satsShown(), over a row of 31 pips that fill with
// the (continuous) reveal, then settles with a hit. On the second phrase a dimension line rises from the Earth's
// surface to the orbital shell (a dashed ring at GPS_A that draws itself around the planet): "20,200 km · 12,550 mi up".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, GPS_A, GPS_ALT, R_EARTH, SAT_COUNT, phrase, satReveal, satsShown } from '../env.js';

const TAU = Math.PI * 2;
// beat-relative times (timeline: phrase 2.0 starts 9.235; phrase 2.1 at 12.982). env's reveal sweep runs while the
// camera is still climbing out of the street (glints off screen), so the counter waits for the orbits to be in frame
// (≈ 11.0 s) and counts over 1.3 s, landing "31" on "…orbit the Earth" (≈ 12.3 s). It never runs AHEAD of env's
// sweep: if the sweep is moved later, the count follows the sweep instead.
const T_IN = 1.85;              // the counter fades in (≈ 10.94 s): the planet is coming into frame
const T_COUNT = 2.05;           // the count starts (≈ 11.14 s)
const T_FULL = 3.2;             // lands on 31 (≈ 12.29 s)
const T_DIM = 3.95;             // "some twenty thousand…" (13.03 s)
const DIM_TH = -20 * Math.PI / 180;   // the dimension line is radial, 20° left of the zenith: its arrow stays below the HUD band

/** Continuous reveal total (0..31): env's sweep, capped by the on-screen count ramp. */
const revealSum = (gt, tl) => { let s = 0; for (let i = 0; i < SAT_COUNT; i++) s += L.clamp(satReveal(i, gt, tl)); return s; };
const countSum = (v) => Math.min(revealSum(v.gt, v.tl), SAT_COUNT * L.smoothstep(L.prog(v.t, T_COUNT, T_FULL - T_COUNT)));

function backing(c, x, y, w, h, a) {
  if (a <= 0) return;
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.scale(w / 2, h / 2);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(3,5,12,${0.55 * a})`); g.addColorStop(0.6, `rgba(3,5,12,${0.35 * a})`); g.addColorStop(1, 'rgba(3,5,12,0)');
  c.fillStyle = g;
  c.fillRect(-1, -1, 2, 2);
  c.restore();
}

function drawCount(c, v) {
  const gt = v.gt, tl = v.tl;
  const k = v.k * L.enter(v.t, T_IN, 0.5) * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.3, 0.3)));   // clear before s03's counter
  if (k <= 0) return;
  const sum = countSum(v), n = Math.min(satsShown(gt, tl), Math.floor(sum + 0.5));
  const full = L.prog(v.t, T_FULL, 0.5);
  const bump = Math.sin(Math.PI * L.clamp(full)) * 0.06;
  const x = 72, y = 566;
  const e = L.ease.outCubic(k);
  c.save();
  c.globalAlpha = k;
  backing(c, x - 90, y - 200, 660, 350, 1.25);
  // accent rule
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(x, y - 168, 90 * e, 4);
  // the number (counts with the sweep; a small hit when it lands on 31)
  c.save();
  c.translate(x, y + (1 - e) * 26);
  c.scale(1 + bump, 1 + bump);
  c.font = L.font(156, 800, L.FONT.display);
  c.fillStyle = L.rgba(ACCENT);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
  L.trackedText(c, String(n), 0, 0, -1, 'left');
  c.restore();
  // unit line
  c.font = L.font(30, 600, L.FONT.body);
  c.fillStyle = 'rgba(205,215,230,0.95)';
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
  L.trackedText(c, 'GPS SATELLITES', x, y + 52 + (1 - e) * 16, 3, 'left');
  c.shadowBlur = 0;
  // 31 pips filling with the reveal
  const pw = 8, gap = 4.5, py = y + 84;
  for (let j = 0; j < SAT_COUNT; j++) {
    const f = L.clamp(sum - j);
    const px = x + j * (pw + gap);
    c.fillStyle = 'rgba(205,215,230,0.16)';
    L.roundRect(c, px, py, pw, pw, 2); c.fill();
    if (f > 0) {
      const s = L.ease.outBack(f, 2.2);
      c.fillStyle = L.rgba(L.mix([255, 255, 255], ACCENT, L.clamp(f * 1.4 - 0.2)), 0.95);
      L.roundRect(c, px + pw / 2 - (pw / 2) * s, py + pw / 2 - (pw / 2) * s, pw * s, pw * s, 2); c.fill();
    }
  }
  // the completion flash sweeps along the pips
  if (full > 0 && full < 1) {
    const fx = x + full * SAT_COUNT * (pw + gap);
    L.lightBlob(c, fx, py + pw / 2, 40, ACCENT, 0.6 * (1 - full));
  }
  c.restore();
  void n;
}

function drawAltitude(c, v) {
  const k = v.k * L.enter(v.t, T_DIM - 0.1, 0.4) * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.3, 0.3)));
  if (k <= 0) return;
  const grow = L.ease.inOutCubic(L.prog(v.t, T_DIM, 0.85));
  const cx = v.wx(0), cy = v.wy(R_EARTH), rs = GPS_A / v.cam.mpp, re = R_EARTH / v.cam.mpp;
  const ux = Math.sin(DIM_TH), uy = -Math.cos(DIM_TH), tx = -uy, ty = ux;   // radial unit + its tangent
  const x0 = cx + ux * re, y0 = cy + uy * re, x1 = cx + ux * rs, y1 = cy + uy * rs;
  c.save();
  c.globalAlpha = k;
  // the orbital shell: a dashed ring that draws itself both ways from the measured point
  const sk = L.ease.inOutCubic(L.prog(v.t, T_DIM + 0.35, 1.2));
  if (sk > 0) {
    const a0 = Math.atan2(uy, ux);
    c.strokeStyle = L.rgba(ACCENT, 0.45);
    c.lineWidth = 1.6;
    c.setLineDash([3, 9]);
    c.lineDashOffset = -v.gt * 6;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rs), a0 - Math.PI * sk, a0 + Math.PI * sk); c.stroke();
    c.setLineDash([]);
  }
  // the dimension line from the surface up to the shell
  const xt = L.lerp(x0, x1, grow), yt = L.lerp(y0, y1, grow);
  if (grow > 0) {
    c.strokeStyle = L.rgba(ACCENT, 0.95);
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(xt, yt); c.stroke();
    c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x0 - tx * 14, y0 - ty * 14); c.lineTo(x0 + tx * 14, y0 + ty * 14); c.stroke();
    // arrow head drawn as a shape at the moving end
    c.fillStyle = L.rgba(ACCENT);
    c.beginPath();
    c.moveTo(xt + ux * 4, yt + uy * 4);
    c.lineTo(xt - ux * 13 + tx * 9, yt - uy * 13 + ty * 9);
    c.lineTo(xt - ux * 13 - tx * 9, yt - uy * 13 - ty * 9);
    c.closePath(); c.fill();
    if (grow >= 1) {
      c.strokeStyle = L.rgba(ACCENT, 0.95);
      c.beginPath(); c.moveTo(x1 - tx * 14, y1 - ty * 14); c.lineTo(x1 + tx * 14, y1 + ty * 14); c.stroke();
    }
    L.lightBlob(c, xt, yt, 34, ACCENT, 0.5 * (1 - L.prog(v.t, T_DIM + 0.85, 0.5)) + 0.12);
  }
  const lx = cx;
  // label, right of the line, mid-height
  const lk = L.prog(v.t, T_DIM + 0.45, 0.6);
  if (lk > 0) {
    const ly = (cy - re + cy - rs) / 2 + 30;
    backing(c, lx + 10, ly - 150, 470, 250, L.clamp(lk * 1.5));
    L.bigLabel(c, { x: lx + 34, y: ly, big: '20,200 km', small: '12,550 mi up', k: lk, accent: ACCENT, size: 92 });
  }
  c.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'The constellation', sub: 'medium Earth orbit' },
  captions: true,
  layer: 0,
  cues(d) {
    void d;
    return [
      { t: T_COUNT, name: 'count', gain: 0.24, pitch: 1.1 },
      { t: T_FULL, name: 'impact', gain: 0.3, pitch: 1.1 },
      { t: T_FULL + 0.02, name: 'ping', gain: 0.16, pitch: 1.3 },
      { t: T_DIM, name: 'swish', gain: 0.22, pitch: 0.9 },
      { t: T_DIM + 0.85, name: 'blip', gain: 0.26, pitch: 1.2 },
      { t: T_DIM + 0.5, name: 'shimmer', gain: 0.12, pitch: 0.9 },
    ];
  },
  drawOverlay(ctx, v) {
    void phrase;
    drawCount(ctx, v);
    drawAltitude(ctx, v);
  },
};
