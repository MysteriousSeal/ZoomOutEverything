// Beat 1 — "At first, the lights would stay on, | for no one." The camera pulls back over a few blocks (0.75 m/px):
// the stopped cars from the hook (headlights on, s00), the lit window spill (env), and every traffic signal still
// cycling for nobody: green waves ripple up the avenues, the cross streets answer, over and over. The signals
// persist (cycling) until the blackout wave reaches them (env litAt), and fade out with the zoom (LOD).
import * as L from '../../../../engine/runtime/lib.js';
import { GRID } from '../camera.js';
import { worldRect, litAt, cityState, glowDot, onLand } from '../env.js';
import { inPark, aveDir, stDir } from './s00-hook.js';

const RED = [255, 52, 40], AMBER = [255, 168, 40], GREEN = [70, 255, 175];
const PERIOD = 2.6;          // a full signal cycle (s): time is already running fast

/** Signal states at intersection (i, j): {ave, st} each 'G' | 'Y' | 'R'. Before the cycling starts: avenue green. */
function phases(v, i, j) {
  const b1 = v.tl.scenes[1].start;
  // the green wave starts as the camera settles and sweeps across the city one whole avenue at a time
  // (every signal on an avenue switches together, so each flip reads as one event)
  const off = (i + 1) * 0.42;
  const u = v.gt - (b1 + 1.15) - off;
  if (u < 0) return { ave: 'G', st: 'R' };
  const p = ((u % PERIOD) + PERIOD) % PERIOD;
  const ave = p < 0.32 ? 'Y' : p < 1.5 ? 'R' : 'G';
  const st = p < 0.42 ? 'R' : p < 1.18 ? 'G' : p < 1.45 ? 'Y' : 'R';
  return { ave, st };
}
const colOf = (s) => (s === 'G' ? GREEN : s === 'Y' ? AMBER : RED);

/** One signal head per approach at every visible intersection (one-way avenues and streets: one avenue head over the
 *  upstream stop line, one street head), each with a modest pool of coloured light on the asphalt in front of it.
 *  Pools keep a small, fixed world size (they never grow into avenue-long bands), and the whole layer fades out just
 *  before the beat-2 camera move so motion blur can never smear it into stripes. */
function drawSignals(c, v) {
  const m = v.cam.mpp;
  const kT = 1 - L.ease.inCubic(L.prog(v.gt, v.tl.scenes[2].start - 0.25, 0.3));
  const k = (1 - L.clamp(L.invLerp(1.0, 1.5, m))) * kT;
  if (k <= 0) return;
  const st0 = cityState(v);
  const night = 1 - st0.day;
  const R = worldRect(v, 30);
  const i0 = Math.floor(R.x0 / GRID.ave), i1 = Math.ceil(R.x1 / GRID.ave);
  const j0 = Math.floor(R.y0 / GRID.st), j1 = Math.ceil(R.y1 / GRID.st);
  const hx = GRID.aveW / 2, hy = GRID.stW / 2;
  const close = m < 0.6;
  const pool = Math.max(9, 7 / m), core = Math.max(3, 0.9 / m);
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const x = i * GRID.ave, y = j * GRID.st;
      if (!onLand(x, y) || inPark(x, y, 6)) continue;
      const lk = litAt(v, x, y, st0);
      const ph = phases(v, i, j);
      const ad = aveDir(i), sd = stDir(j);
      // [pole x, pole y, head x, head y, which, pool dx, pool dy]: the pool lies on the approach, behind the stop line
      const sl = hy + 4.8;
      const heads = [
        [x + ad * (hx + 1.2), y - ad * sl, x, y - ad * sl, 'ave', 0, -ad * 4],
        [x - sd * (hx + 4.6), y + sd * (hy + 1.2), x - sd * (hx + 4.6), y, 'st', -sd * 4, 0],
      ];
      // pedestrian signals at both ends of the two crosswalks over the avenue (hand / walking figure lamps)
      if (close && lk > 0.01) {
        const walk = ph.ave === 'R';
        const pc = walk ? [235, 242, 255] : [255, 130, 40];
        for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
          const px = x + sx * (hx + 1.6), py = y + sy * (hy + 3);
          c.fillStyle = 'rgba(10,12,16,1)';
          c.fillRect(v.wx(px) - 0.35 / m, v.wy(py) - 0.35 / m, 0.7 / m, 0.7 / m);
          glowDot(c, v.wx(px), v.wy(py), Math.max(2, 1.4 / m), pc, 0.7 * k * lk);
        }
      }
      for (const [px, py, qx, qy, w, pdx, pdy] of heads) {
        const s = ph[w];
        // pole + mast arm + head housing
        c.globalAlpha = k * (close ? 1 : 0.8);
        c.strokeStyle = 'rgba(14,16,20,0.95)';
        c.lineWidth = Math.max(1, 0.28 / m);
        c.beginPath(); c.moveTo(v.wx(px), v.wy(py)); c.lineTo(v.wx(qx), v.wy(qy)); c.stroke();
        c.fillStyle = 'rgba(10,12,16,1)';
        c.beginPath(); c.arc(v.wx(px), v.wy(py), Math.max(0.8, 0.32 / m), 0, Math.PI * 2); c.fill();
        const hw = w === 'ave' ? 1.3 : 0.5, hh = w === 'ave' ? 0.5 : 1.3;
        c.fillRect(v.wx(qx) - Math.max(1.5, hw / m) / 2, v.wy(qy) - Math.max(1.5, hh / m) / 2, Math.max(1.5, hw / m), Math.max(1.5, hh / m));
        c.globalAlpha = 1;
        if (lk <= 0.01) continue;
        const col = colOf(s);
        const a = k * lk;
        glowDot(c, v.wx(qx), v.wy(qy), core, L.mix(col, [255, 255, 255], 0.45), 0.95 * a);
        glowDot(c, v.wx(qx + pdx), v.wy(qy + pdy), pool, col, 0.8 * a * (0.6 + 0.4 * night));
      }
    }
  }
  c.globalAlpha = 1;
}

/** House label with its small line arriving on its own phrase. */
function label(ctx, v, big, small, tBig, tSmall) {
  const kout = 1 - L.clamp((v.t - (v.d - 0.1)) / 0.35);
  const kb = L.clamp((v.t - tBig) / 0.45) * kout;
  if (kb <= 0) return;
  const x = 64, y = 560;
  L.bigLabel(ctx, { x, y, big, small: '', k: kb, accent: v.accent, size: 104 });
  const ks = L.ease.outCubic(L.clamp((v.t - tSmall) / 0.45)) * kout;
  if (ks <= 0) return;
  ctx.save();
  ctx.globalAlpha *= L.clamp(ks * 1.4);
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10;
  ctx.font = L.font(30, 600, L.FONT.body);
  ctx.fillStyle = L.rgba([205, 215, 230], 0.95);
  L.trackedText(ctx, small.toUpperCase(), x, y + 52 + (1 - ks) * 18, 3, 'left');
  ctx.restore();
}
export { label };

export default {
  beat: 1,
  chapter: { num: '01', title: 'The first hour', sub: 'Everything still running' },
  captions: true,
  layer: 2,
  cues(d) {
    // the signals switching (soft ticks), and a ping on "for no one"
    return [
      { t: 0.3, name: 'swish', gain: 0.16, pitch: 1.1 },
      { t: 1.18, name: 'tick', gain: 0.16, pitch: 1.3 },
      { t: 1.5, name: 'tick', gain: 0.12, pitch: 1.1 },
      { t: 2.6, name: 'ping', gain: 0.2, pitch: 0.8 },
      { t: 3.78, name: 'tick', gain: 0.12, pitch: 1.3 },
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    drawSignals(ctx, v);
  },
  drawOverlay(ctx, v) {
    const ph2 = v.tl.lines[1].phrases?.[1]?.start ?? v.tl.scenes[1].start + 2.6;
    label(ctx, v, 'LIGHTS ON', 'for no one', 0.35, ph2 - v.tl.scenes[1].start - 0.05);
  },
};
