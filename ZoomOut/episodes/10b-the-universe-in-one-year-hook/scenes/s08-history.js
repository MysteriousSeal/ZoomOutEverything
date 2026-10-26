// Beat 8 — all of recorded history fits in the last twelve seconds.
// The camera dives from Dec 31 into 23:00 (60 minute cells; the human minutes 48–59 still glow softly).
// 23:59, the last minute, is barely 80 px wide, so an editorial magnifier opens above it: a loupe that shows
// 23:59's sixty seconds. On "last twelve seconds" the final 12 seconds ignite (both in the loupe and in the real
// cell), and two fine ticks mark writing (−11.9 s) and the Roman Empire (−4.6 s). No pyramids tick (f10cb): the
// closing question asks when they were built, so the history beat must not give the answer away.
// The 12 lit seconds persist in world space (LOD-faded) so beat 9's dive into 23:59 finds them.
import * as L from '../../../../engine/runtime/lib.js';
import { minuteRect, secondRect } from '../camera.js';

const { W, H } = L;
const M59 = minuteRect(59);
const S0 = 48;                                      // first second of recorded history (−12 s)
const YEARS_PER_S = 13.8e9 / 365 / 86400;          // ≈ 437.6 years per calendar second
const at = (ya) => 60 - ya / YEARS_PER_S;          // position inside 23:59 (in seconds)
export const MARKS = [at(5200), at(2000)];   // writing, the Roman Empire (no pyramids: that is the closing question)
const T_LOUPE = 1.7, T_IGN = 2.3, T_LAB = 2.45;    // the loupe opens once the camera has landed in 23:00

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
  const gridK = L.ease.outCubic(L.prog(t, T_LOUPE, 0.6)) * (1 - envK) * L.clamp((mw - 20) / 40);
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

/** feathered dark backing behind a label (screen space) */
function plate(ctx, x, y, w, h, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.shadowColor = `rgba(7,4,9,${0.78 * a})`;
  ctx.shadowBlur = 60;
  ctx.shadowOffsetX = 5000;
  ctx.fillRect(x - 5000, y, w, h);
  ctx.restore();
}

// ------------------------------------------------------------------ loupe (screen space)
const LP = { x: 612, y: 318, w: 272, h: 302 };      // aspect matches a minute cell (0.025 : 0.0278)

function loupeContent(ctx, v, t, k) {
  const { x, y, w, h } = LP;
  const cw = w / 10, ch = h / 6;
  // header strip like env's cell labels
  // one readable header only: the three marks are carried by their icons (no tiny key text)
  ctx.font = L.font(22, 600, L.FONT.body);
  ctx.fillStyle = `rgba(235,228,240,${0.75 * k})`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('23:59', x + 6, y + 1);
  const age = t - T_IGN;
  for (let s = 0; s < 60; s++) {
    const cx = x + (s % 10) * cw, cy = y + 24 + Math.floor(s / 10) * ((h - 30) / 6);
    const chh = (h - 30) / 6;
    const lit = s >= S0 ? L.ease.outCubic(L.prog(age, (s - S0) * 0.035, 0.3)) : 0;
    const flash = s >= S0 ? Math.exp(-Math.max(0, age - (s - S0) * 0.035) / 0.4) : 0;
    ctx.fillStyle = lit > 0
      ? L.rgba(L.mix(v.accent, [255, 255, 255], 0.35 * flash), k * (0.25 + 0.65 * lit))
      : `rgba(235,228,240,${0.08 * k})`;
    ctx.fillRect(cx + 2, cy + 2, cw - 4, chh - 4);
  }
  // ticks + mini icons + small keys: writing and the Roman Empire; each key sits in the empty cells left of its icon,
  // fitted to the glass (ROMAN EMPIRE stacks on two lines: one line would run out of the loupe)
  const chh = (h - 30) / 6;
  const LIFT = [0, 0];
  const KEYS = [
    { text: ['WRITING'], dx: -24, dy: -0.45, align: 'right' },
    { text: ['ROMAN', 'EMPIRE'], dx: -26, dy: -0.5, align: 'right' },
  ];
  MARKS.forEach((m, i) => {
    const kk = L.prog(t, T_IGN + 0.4 + i * 0.15, 0.4);
    if (kk <= 0) return;
    const s = Math.floor(m), f = m - s;
    const tx = x + (s % 10) * cw + 2 + f * (cw - 4), ty = y + 24 + Math.floor(s / 10) * chh;
    const e = L.ease.outCubic(kk);
    const top = ty - LIFT[i] * chh - 4 - 3 * (1 - e), hh = (ty + chh - 2 - top) * e;
    const ix = Math.min(tx, x + w - 0.55 * 34);       // kept inside the glass
    ctx.save();
    ctx.shadowColor = L.rgba(v.accent, 1);
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(255,248,252,${0.95 * k})`;
    ctx.fillRect(tx - 1, ty + chh - 2 - hh, 2, hh);
    drawIcon(ctx, i, ix, top - 4 + 6 * (1 - e), 34, [255, 240, 250], k * e);
    ctx.restore();
    // key
    const kd = KEYS[i];
    const ka = k * L.clamp(kk * 2 - 0.6);
    if (ka > 0) {
      ctx.save();
      const kx = ix - 0.36 * 34 + kd.dx + 18;
      const ky = top - 4 + kd.dy * 34;
      const maxW = kx - (x + 6);
      const fs = Math.min(...kd.text.map((ln) => L.fitSize(ctx, ln, maxW - 1.5 * ln.length, 19, 700, L.FONT.body, 12)));
      ctx.font = L.font(fs, 700, L.FONT.body);
      ctx.fillStyle = `rgba(240,232,244,${0.92 * ka})`;
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      ctx.textBaseline = 'middle';
      const lh = fs * 1.1, y0 = ky - (kd.text.length - 1) * lh / 2;
      kd.text.forEach((ln, j) => L.trackedText(ctx, ln, kx, y0 + j * lh, 1.5, kd.align));
      ctx.restore();
    }
  });
}

function drawLoupe(ctx, v, t) {
  const kin = L.prog(t, T_LOUPE, 0.7);
  const k = Math.min(L.ease.outCubic(kin), v.k);
  if (k <= 0) return;
  const { x, y, w, h } = LP;
  // anchor on the real 23:59 cell
  const ax0 = v.wx(M59.x + M59.w * 0.03), ax1 = v.wx(M59.x + M59.w * 0.97), ay = v.wy(M59.y + M59.h * 0.03);
  const ay1 = v.wy(M59.y + M59.h * 0.97);
  ctx.save();
  // the source cell outline
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.4), 0.9 * k);
  ctx.lineWidth = 2;
  ctx.strokeRect(ax0, ay, ax1 - ax0, ay1 - ay);
  // connector lines draw from the cell up to the loupe
  const lk = L.ease.inOutCubic(L.clamp(kin * 1.4));
  const grad = ctx.createLinearGradient(0, ay, 0, y + h);
  const calm = 1 - 0.6 * L.ease.inOutCubic(L.prog(t, T_LOUPE + 0.9, 0.5));   // step back once the loupe is open
  grad.addColorStop(0, L.rgba(v.accent, 0.75 * k * calm));
  grad.addColorStop(1, L.rgba(v.accent, 0.25 * k * calm));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ax0, ay); ctx.lineTo(L.lerp(ax0, x, lk), L.lerp(ay, y + h, lk));
  ctx.moveTo(ax1, ay); ctx.lineTo(L.lerp(ax1, x + w, lk), L.lerp(ay, y + h, lk));
  ctx.stroke();
  // the loupe itself scales up from its bottom edge
  const sk = L.ease.outBack(L.clamp((kin - 0.25) / 0.75), 1.2);
  if (sk > 0) {
    ctx.translate(x + w / 2, y + h);
    ctx.scale(L.lerp(0.6, 1, sk), sk);
    ctx.translate(-(x + w / 2), -(y + h));
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 40;
    ctx.globalAlpha *= L.clamp(sk * 1.5);           // the collapsed panel fades in instead of reading as a dark slab
    ctx.fillStyle = 'rgba(14,8,17,0.96)';
    L.roundRect(ctx, x - 8, y - 8, w + 16, h + 16, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.3), 0.85 * k);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    loupeContent(ctx, v, t, k);
    // a light sweep across the glass as it opens
    const sw = L.prog(t, T_LOUPE + 0.4, 0.9);
    if (sw > 0 && sw < 1) {
      ctx.save();
      L.roundRect(ctx, x - 8, y - 8, w + 16, h + 16, 12);
      ctx.clip();
      const cx = L.lerp(x - 120, x + w + 120, L.ease.inOutCubic(sw));
      const g = ctx.createLinearGradient(cx - 60, y, cx + 60, y + h * 0.3);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,235,250,${0.12 * Math.sin(Math.PI * sw)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** a ring that pulls the eye to 23:59 when it ignites */
function drawPing(ctx, v, t) {
  const age = t - T_IGN;
  if (age < 0 || age > 1.2) return;
  const c = { x: M59.x + M59.w / 2, y: M59.y + M59.h / 2 };
  const R = v.ws(M59.w) * (0.6 + 2.2 * L.ease.outCubic(age / 1.2));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.4), 0.7 * (1 - age / 1.2));
  ctx.lineWidth = 2.5 * (1 - age / 1.2) + 0.5;
  ctx.beginPath(); ctx.arc(v.wx(c.x), v.wy(c.y), Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'Recorded history', sub: 'The last 12 seconds' },
  captions: true,
  layer: 3,
  cues() {
    return [
      { t: 0.05, name: 'dive', gain: 0.3, pitch: 1.0 },
      { t: T_LOUPE + 0.1, name: 'swish', gain: 0.14, pitch: 1.1 },
      { t: T_IGN, name: 'bloom', gain: 0.32, pitch: 1.12 },
      { t: T_IGN + 0.02, name: 'ping', gain: 0.16, pitch: 1.0 },
      ...MARKS.map((_, i) => ({ t: T_IGN + 0.4 + i * 0.15, name: 'tick', gain: 0.22, pitch: 1.0 + i * 0.12 })),
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    drawWorldSeconds(ctx, v, v.t);
    if (v.t < v.d + 0.5) drawPing(ctx, v, v.t);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    // loupe + label are gone by the beat's end (no ghost under beat 9's caption)
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.45, 0.35));
    if (out <= 0) return;
    ctx.save();
    ctx.globalAlpha *= out;
    drawLoupe(ctx, v, t);
    ctx.restore();
    const k = Math.min(v.k, L.prog(t, T_LAB, 0.55)) * out;
    plate(ctx, 60, 400, 540, 210, k);              // dark backing: the label never sits on bare grid lines
    L.bigLabel(ctx, { x: 96, y: 540, big: 'LAST 12 s', small: 'all of recorded history', k, accent: v.accent, size: 112 });
  },
};
