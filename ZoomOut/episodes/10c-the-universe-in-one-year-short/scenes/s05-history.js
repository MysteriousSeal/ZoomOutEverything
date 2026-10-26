// Beat 5 (10c; beat 8 in 10b) — all of recorded history fits in the last twelve seconds.
// 10c: the Columbus beat is cut, so the camera dives from Dec 31 straight down into 23:59 (through 23:00, where the
// human minutes 48–59 still glow) and lands on its sixty second cells. 10b's loupe is gone: the real cells are now
// big enough. On "last twelve seconds" the final 12 seconds ignite, and three fine ticks (overlay layer, so the cold
// open's overlay-free replay stays identical to 10b's) mark writing (−11.9 s) and the Roman Empire (−4.6 s). No pyramids
// tick: the closing question asks when they were built, so the history beat must not give the answer away.
// The 12 lit seconds persist in world space (LOD-faded) into beat 6's dive into :59.
import * as L from '../../../../engine/runtime/lib.js';
import { minuteRect, secondRect } from '../camera.js';

const { W, H } = L;
const M59 = minuteRect(59);
const S0 = 48;                                      // first second of recorded history (−12 s)
const YEARS_PER_S = 13.8e9 / 365 / 86400;          // ≈ 437.6 years per calendar second
const at = (ya) => 60 - ya / YEARS_PER_S;          // position inside 23:59 (in seconds)
export const MARKS = [at(5200), at(2000)];   // writing, the Roman Empire (no pyramids: that is the closing question)
const T_GRID = 1.0, T_IGN = 2.3, T_LAB = 2.45;     // 10c: the camera lands in 23:59 at ~2.1 s (travel 2.1); the seconds
// grid fades in during the dive (was 1.7: the frame read empty for ~0.6 s between the minute and second levels)

// ------------------------------------------------------------------ mini icons (unit box: x −0.5..0.5, y −1..0, baseline 0)
/** writing: a quill feather */
function quill(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.32, 0.0);
  ctx.bezierCurveTo(-0.1, -0.35, 0.12, -0.7, 0.36, -1.0);       // shaft
  ctx.bezierCurveTo(0.42, -0.72, 0.3, -0.42, 0.02, -0.22);      // vane, outer edge
  ctx.bezierCurveTo(-0.06, -0.16, -0.14, -0.1, -0.2, -0.13);
  ctx.bezierCurveTo(-0.02, -0.4, 0.12, -0.62, 0.3, -0.86);
  ctx.bezierCurveTo(0.05, -0.62, -0.08, -0.38, -0.32, 0.0);
  ctx.closePath();
  ctx.fill();
}
/** the Roman Empire: a fluted column */
function column(ctx) {
  ctx.fillRect(-0.36, -0.95, 0.72, 0.1);                         // abacus
  ctx.fillRect(-0.28, -0.85, 0.56, 0.07);                        // capital
  for (let i = 0; i < 4; i++) ctx.fillRect(-0.22 + i * 0.125, -0.76, 0.07, 0.64);   // flutes
  ctx.fillRect(-0.3, -0.12, 0.6, 0.06);
  ctx.fillRect(-0.38, -0.06, 0.76, 0.06);                        // base
}
export const ICONS = [quill, column];
/** draw icon i at screen (x, baseline y), height px, colour/alpha */
export function drawIcon(ctx, i, x, y, px, col, a) {
  if (a <= 0 || px < 3) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(px, px);
  ctx.globalAlpha *= a;
  ctx.fillStyle = L.rgba(col);
  ICONS[i](ctx);
  ctx.restore();
}

const pad = (r, p = 0.08) => ({ x: r.x + r.w * p / 2, y: r.y + r.h * p / 2, w: r.w * (1 - p), h: r.h * (1 - p) });

/** world: the seconds of 23:59 (before env's own second grid takes over) + the 12 lit seconds (persistent) */
function drawWorldSeconds(ctx, v, t) {
  const mw = v.ws(M59.w);
  if (mw < 6) return;
  const envK = L.clamp(L.invLerp(0.00009, 0.00004, v.cam.mpp));
  const gridK = L.ease.outCubic(L.prog(t, T_GRID, 0.6)) * (1 - envK) * L.clamp((mw - 20) / 40);
  const x0 = v.wx(M59.x), y0 = v.wy(M59.y);
  if (x0 > W || y0 > H || x0 + mw < 0 || y0 + v.ws(M59.h) < 0) return;
  ctx.save();
  if (gridK > 0) {
    ctx.fillStyle = `rgba(10,5,12,${0.6 * gridK})`;
    const q = pad(M59, 0.06);
    ctx.fillRect(v.wx(q.x), v.wy(q.y), v.ws(q.w), v.ws(q.h));
    for (let s = 0; s < 60; s++) {
      const r = pad(secondRect(s), 0.18);
      ctx.fillStyle = `rgba(235,228,240,${0.13 * gridK})`;
      ctx.fillRect(v.wx(r.x), v.wy(r.y), v.ws(r.w), v.ws(r.h));
    }
  }
  // the last 12 seconds: lit, persistent; faded out once a single second fills the frame (beats 10–11)
  const lod = L.clamp(L.invLerp(0.0000055, 0.000014, v.cam.mpp));
  const age = t - T_IGN;
  if (age >= 0 && lod > 0) {
    for (let s = S0; s < 60; s++) {
      const k = L.ease.outCubic(L.prog(age, (s - S0) * 0.03, 0.3));
      if (k <= 0) continue;
      const r = pad(secondRect(s), 0.1);
      const x = v.wx(r.x), y = v.wy(r.y), w = v.ws(r.w), h = v.ws(r.h);
      if (x > W || y > H || x + w < 0 || y + h < 0) continue;
      const flash = Math.exp(-Math.max(0, age - (s - S0) * 0.03) / 0.4);
      const big = L.clamp((w - 30) / 60);           // once the seconds are large, keep them calmer (beat 9 context)
      const a = lod * k * L.lerp(0.95, 0.34, big) * (0.8 + 0.2 * flash);
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, L.rgba(L.mix(v.accent, [255, 255, 255], 0.4 * flash), a));
      g.addColorStop(1, L.rgba(v.accent, a * 0.55));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    }
    const c = { x: M59.x + M59.w * 0.62, y: M59.y + M59.h * 0.88 };   // centre of the lit block
    const I = Math.exp(-age / 0.5);
    const bw = v.ws(M59.w);
    L.lightBlob(ctx, v.wx(c.x), v.wy(c.y), Math.max(0, Math.min(700, bw * (0.6 + 0.8 * L.ease.outCubic(L.clamp(age / 0.7))))), v.accent, lod * (0.1 + 0.5 * I) * L.clamp(1.6 - bw / 600));
  }
  ctx.restore();
}

/** the dive's target: 23:59 glows as a framed cell while the camera falls into it, so the frames between the minute
 *  and second levels never read as empty; it hands over to the second grid (gone by the ignition) */
function drawTarget(ctx, v, t) {
  const k = L.ease.outCubic(L.prog(t, 0.15, 0.4)) * (1 - L.ease.inOutCubic(L.prog(t, T_IGN - 0.5, 0.5)));
  if (k <= 0) return;
  const x = v.wx(M59.x), y = v.wy(M59.y), w = v.ws(M59.w), h = v.ws(M59.h);
  if (w < 8 || x > W || y > H || x + w < 0 || y + h < 0) return;
  ctx.save();
  ctx.fillStyle = L.rgba(v.accent, 0.1 * k);
  ctx.fillRect(x, y, w, h);
  L.glow(ctx, v.accent, 18, () => {
    ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.45), 0.85 * k);
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  });
  ctx.restore();
}

/** feathered dark backing behind a label (screen space) */
function plate(ctx, x, y, w, h, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.shadowColor = `rgba(7,4,9,${0.94 * a})`;
  ctx.shadowBlur = 60;
  ctx.shadowOffsetX = 5000;
  ctx.fillRect(x - 5000, y, w, h);
  ctx.restore();
}

/** a ring that pulls the eye to 23:59 when it ignites */
function drawPing(ctx, v, t) {
  const age = t - T_IGN;
  if (age < 0 || age > 0.6) return;              // 10c: short (0.6 s), so it is gone before the cold open's replay starts
  const c = { x: M59.x + M59.w * 0.62, y: M59.y + M59.h * 0.88 };   // 10c: the lit block (the minute fills the frame)
  const R = v.ws(M59.w) * (0.12 + 0.5 * L.ease.outCubic(age / 0.6));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.4), 0.7 * (1 - age / 0.6));
  ctx.lineWidth = 2.5 * (1 - age / 0.6) + 0.5;
  ctx.beginPath(); ctx.arc(v.wx(c.x), v.wy(c.y), Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** 10c: the two ticks + icons + small keys on the real second cells (replaces 10b's loupe). Overlay: fades with
 *  `out`. Each key sits in the empty cells to the left of its icon, on a small dark plate (never bare on cell numbers). */
const LIFT = [0, 0];
const KEYS = ['WRITING', 'ROMAN EMPIRE'];
function drawMarks(ctx, v, t, out) {
  MARKS.forEach((m, i) => {
    const kk = Math.min(v.k, L.prog(t, T_IGN + 0.4 + i * 0.15, 0.4)) * out;
    if (kk <= 0) return;
    const s = Math.floor(m), f = m - s, r = secondRect(s);
    const cw = v.ws(r.w), ch = v.ws(r.h);
    if (cw < 30) return;
    const tx = v.wx(r.x + r.w * (0.05 + 0.9 * f)), bot = v.wy(r.y + r.h * 0.95);
    const top = v.wy(r.y + r.h * 0.05) - LIFT[i] * ch;
    const hb = bot - top;
    const e = L.ease.outCubic(kk);
    const ip = Math.min(70, cw * 0.78);
    ctx.save();
    ctx.shadowColor = L.rgba(v.accent, 1);
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(255,248,252,${0.95 * kk})`;
    ctx.fillRect(tx - 1.5, bot - hb * e, 3, hb * e);
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    const iy = top - 6 + 8 * (1 - e);
    drawIcon(ctx, i, tx, iy, ip, [255, 240, 250], kk);   // sits on the tick's top, in the unlit row above
    // key: right-aligned just left of the icon, at mid icon height
    const ka = kk * L.clamp(kk * 2 - 0.6);
    if (ka > 0) {
      const kr = tx - 0.55 * ip - 10, ky = iy - 0.45 * ip;
      const maxW = Math.max(60, kr - v.wx(M59.x) - 24);              // fitted to the cells left of the icon
      const fs = L.fitSize(ctx, KEYS[i], maxW - 1.5 * KEYS[i].length, 22, 700, L.FONT.body, 14);
      ctx.font = L.font(fs, 700, L.FONT.body);
      const kw = ctx.measureText(KEYS[i]).width + 1.5 * (KEYS[i].length - 1);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = `rgba(8,4,10,${0.82 * ka})`;
      L.roundRect(ctx, kr - kw - 10, ky - fs * 0.5 - 7, kw + 20, fs + 14, 6);
      ctx.fill();
      ctx.fillStyle = `rgba(240,232,244,${0.95 * ka})`;
      ctx.textBaseline = 'middle';
      L.trackedText(ctx, KEYS[i], kr, ky, 1.5, 'right');
    }
    ctx.restore();
  });
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'Recorded history', sub: 'The last 12 seconds' },
  captions: true,
  layer: 3,
  cues() {
    return [
      { t: 0.05, name: 'dive', gain: 0.3, pitch: 1.0 },
      { t: T_IGN, name: 'bloom', gain: 0.32, pitch: 1.12 },
      { t: T_IGN + 0.02, name: 'ping', gain: 0.16, pitch: 1.0 },
      ...MARKS.map((_, i) => ({ t: T_IGN + 0.4 + i * 0.15, name: 'tick', gain: 0.22, pitch: 1.0 + i * 0.12 })),
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    drawTarget(ctx, v, v.t);
    drawWorldSeconds(ctx, v, v.t);
    if (v.t < v.d + 0.5) drawPing(ctx, v, v.t);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    // ticks + label are gone by the beat's end (no ghost under beat 6's caption; 10b fix)
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.45, 0.35));
    if (out <= 0) return;
    drawMarks(ctx, v, t, out);
    const k = Math.min(v.k, L.prog(t, T_LAB, 0.55)) * out;
    plate(ctx, 60, 400, 540, 210, k);              // dark backing: the label never sits on bare grid lines
    L.bigLabel(ctx, { x: 96, y: 540, big: 'LAST 12 s', small: 'all of recorded history', k, accent: v.accent, size: 112 });
  },
};
