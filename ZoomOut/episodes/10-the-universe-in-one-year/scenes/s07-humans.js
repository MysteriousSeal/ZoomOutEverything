// Beat 7 — humans at 11:48 pm on New Year's Eve.
// Dec 31 pulses as the dive target, then becomes the frame: 24 hour cells. A progress fill runs through the day
// hour by hour, decelerating like a clock running down; in 23:00 a minute micro-grid fades in and the fill crawls on
// to 23:48. There, the last twelve minutes ignite and a backlit human silhouette rises in front of them, while the
// rest of the day dims. Label "11:48 PM" / "Homo sapiens · 300,000 years ago", leader to the figure.
// The lit minutes persist (LOD-faded) so beat 8's dive into 23:00 finds them.
import * as L from '../../../../engine/runtime/lib.js';
import { dayOfYear, dayRect, hourRect, minuteRect } from '../camera.js';

const { W, H } = L;
const DAY = dayRect(11, 30);
const HUMANS_H = (dayOfYear(300000) - 364) * 24;   // ≈ 23.81 h (23:48.6)
const M48 = 48;
const T_SWEEP = 2.05, T_IGN = 3.9;                 // sweep starts on "We show up…", ignition on "forty-eight"
const T_FIG = T_IGN + 0.15, T_LAB = T_IGN + 0.45;
const HR = hourRect(23);
const FIG_H = 0.92 * HR.h;                          // figure height (world)
const FIG = { x: HR.x + HR.w * 0.84, y: HR.y + HR.h * 0.985 };

const pad = (r, p = 0.06) => ({ x: r.x + r.w * p / 2, y: r.y + r.h * p / 2, w: r.w * (1 - p), h: r.h * (1 - p) });
const sweepH = (t) => HUMANS_H * L.ease.inOutCubic(L.prog(t, T_SWEEP, T_IGN - T_SWEEP));

// ------------------------------------------------------------------ human silhouette (local units: height 1, feet at y = 0)
function catmull(pts, steps = 5) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// right half, neck → hand → armpit → hip → foot → crotch (left half mirrored, with a gentle weight shift)
const HALF = [[0.032, -0.835], [0.07, -0.81], [0.118, -0.79], [0.142, -0.76], [0.152, -0.7], [0.158, -0.6], [0.163, -0.5], [0.166, -0.455],
  [0.158, -0.43], [0.146, -0.45], [0.138, -0.52], [0.128, -0.62], [0.112, -0.7], [0.103, -0.63], [0.088, -0.54], [0.098, -0.47],
  [0.102, -0.4], [0.092, -0.29], [0.078, -0.2], [0.074, -0.12], [0.06, -0.035], [0.084, -0.004], [0.03, 0.0], [0.024, -0.1],
  [0.026, -0.25], [0.018, -0.37], [0.0, -0.405]];
const BODY = (() => {
  const right = HALF.map(([x, y]) => [x + (y > -0.42 ? 0.01 * (y + 0.42) * -1 : 0), y]);
  const left = HALF.map(([x, y]) => [-x * (y > -0.42 ? 0.96 : 1), y]).reverse();
  return catmull([...right, ...left.slice(1)], 4);
})();

function drawFigure(ctx, v, t, k) {
  if (k <= 0.002) return;
  const s = v.ws(FIG_H);
  if (s < 8) return;
  const bx = v.wx(FIG.x), by = v.wy(FIG.y);
  const breathe = 1 + 0.006 * Math.sin(t * 1.7);
  const sway = 0.012 * Math.sin(t * 0.7 + 0.4);
  const rise = (1 - L.ease.outCubic(k)) * 0.12;
  ctx.save();
  ctx.translate(bx, by + rise * s);
  ctx.rotate(sway);
  ctx.scale(s, s * breathe);
  const px = 1 / s;
  ctx.globalAlpha *= L.clamp(k * 1.3);
  // backlight: the glow of the lit minutes behind the figure
  const bg = ctx.createRadialGradient(0, -0.55, 0, 0, -0.55, 0.85);
  bg.addColorStop(0, L.rgba(v.accent, 0.3));
  bg.addColorStop(1, L.rgba(v.accent, 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = bg; ctx.fillRect(-0.9, -1.45, 1.8, 1.8); ctx.restore();
  // silhouette
  const g = ctx.createLinearGradient(0, -1, 0, 0);
  g.addColorStop(0, '#2a1630');
  g.addColorStop(1, '#120914');
  ctx.fillStyle = g;
  ctx.beginPath();
  BODY.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -0.912, 0.062, 0.074, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-0.03, -0.86, 0.06, 0.04);
  // rim light, drawn on as the figure appears
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = L.rgba(v.accent, 1);
  ctx.shadowBlur = 10;
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.5), 0.95);
  ctx.lineWidth = 1.8 * px;
  ctx.lineJoin = 'round';
  const n = Math.floor(BODY.length * L.ease.inOutCubic(L.clamp(k * 1.2)));
  ctx.beginPath();
  for (let i = 0; i < n; i++) (i ? ctx.lineTo(...BODY[i]) : ctx.moveTo(...BODY[i]));
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.912, 0.062, 0.074, 0, Math.PI * 0.5, Math.PI * 0.5 + Math.PI * 2 * L.clamp(k * 1.2)); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ day sweep + minute micro-grid
function fillRect(ctx, v, r, frac, a, col) {
  const q = pad(r);
  const x = v.wx(q.x), y = v.wy(q.y), w = v.ws(q.w) * frac, h = v.ws(q.h);
  if (x > W || y > H || x + w < 0 || y + h < 0 || w <= 0) return null;
  ctx.fillStyle = L.rgba(col, a);
  ctx.fillRect(x, y, w, h);
  return { x, y, w, h };
}

function drawSweep(ctx, v, t, dim) {
  const h = sweepH(t);
  if (t < T_SWEEP) return;
  const sk = v.ws(1);                              // day cell size in px
  if (sk < 60) return;
  const out = 1 - L.ease.inOutCubic(L.prog(t, v.d - 0.1, 0.9));   // the day's fills clear as beat 8 dives in
  if (out <= 0) return;
  ctx.save();
  ctx.globalAlpha *= out;
  for (let i = 0; i < 24 && i <= h; i++) {
    const r = hourRect(i);
    const frac = L.clamp(h - i);
    const trail = Math.exp(-Math.max(0, h - i - 1) * 0.9);
    const a = (0.07 + 0.2 * trail * (i < 23 ? 1 : 0)) * (1 - 0.6 * dim);
    const rr = fillRect(ctx, v, r, i === 23 ? 1 : frac, i === 23 ? 0.05 : a, v.accent);
    if (rr && frac < 1 && i < 23) {                  // leading scan line
      L.glow(ctx, v.accent, 12, () => { ctx.fillStyle = 'rgba(255,230,250,0.9)'; ctx.fillRect(rr.x + rr.w - 1.5, rr.y, 3, rr.h); });
    }
  }
  ctx.restore();
}

/** 23:00's 60 minutes, drawn by this scene before env's own minute grid takes over (mpp < 0.0009). */
function drawMinutes(ctx, v, t, dim) {
  const envK = L.clamp(L.invLerp(0.0009, 0.0004, v.cam.mpp));
  const gridK = L.ease.outCubic(L.prog(sweepH(t), 22.3, 0.6)) * (1 - envK);
  const mw = v.ws(HR.w / 10);
  if (mw < 3) return;
  const h = sweepH(t);
  const mNow = (h - 23) * 60;                     // minutes into 23:00 reached by the sweep
  ctx.save();
  if (gridK > 0) {
    for (let mi = 0; mi < 60; mi++) {
      const q = pad(minuteRect(mi), 0.14);
      const x = v.wx(q.x), y = v.wy(q.y), w = v.ws(q.w), hh = v.ws(q.h);
      const passed = L.clamp(mNow - mi);
      ctx.fillStyle = L.rgba(L.mix([235, 228, 240], [200, 150, 200], passed), gridK * (0.07 + 0.09 * passed * (1 - 0.6 * dim)));
      ctx.fillRect(x, y, w, hh);
    }
  }
  ctx.restore();
}

/** minutes 48–59 lit: the age of Homo sapiens. Persistent after the ignition, faded out at deep zoom. */
function drawHumanMinutes(ctx, v, t) {
  const age = t - T_IGN;
  if (age < 0) return;
  const lod = L.clamp(L.invLerp(0.00005, 0.00016, v.cam.mpp));
  if (lod <= 0) return;
  // settle after the ignition, then step back in beat 8 so the last 12 seconds can lead
  // (the beat-8 fade is strong and early, and keyed to the zoom too: once the camera is inside 23:00's minute scale
  //  the twelve lit minutes must not read as "the last twelve" — that label belongs to the seconds)
  const settle = (1 - 0.35 * L.ease.inOutCubic(L.prog(t, T_IGN + 1.2, 1.5)))
    * (1 - 0.9 * L.ease.inOutCubic(L.prog(t, v.d + 0.3, 1.2)))
    * L.clamp(L.invLerp(0.00012, 0.0003, v.cam.mpp));
  if (settle <= 0.002) return;
  ctx.save();
  for (let mi = M48; mi < 60; mi++) {
    const k = L.ease.outCubic(L.prog(age, (mi - M48) * 0.035, 0.35));
    if (k <= 0) continue;
    const q = pad(minuteRect(mi), 0.1);
    const x = v.wx(q.x), y = v.wy(q.y), w = v.ws(q.w), hh = v.ws(q.h);
    if (x > W || y > H || x + w < 0 || y + hh < 0) continue;
    const flash = Math.exp(-Math.max(0, age - (mi - M48) * 0.035) / 0.35);
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, L.rgba(L.mix(v.accent, [255, 255, 255], 0.35 * flash), lod * k * (0.75 + 0.25 * flash) * settle));
    g.addColorStop(1, L.rgba(v.accent, lod * k * 0.45 * settle));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, hh);
  }
  // bloom over the lit block
  const c = { x: HR.x + HR.w * 0.62, y: HR.y + HR.h * 0.88 };   // centre of the lit block
  const I = Math.exp(-age / 0.6);
  const hw = v.ws(HR.w);
  const bk = Math.min(1, hw / 120) * L.clamp(1.5 - hw / 400);    // only while 23:00 is a small cell (beat 7)
  if (bk > 0) L.lightBlob(ctx, v.wx(c.x), v.wy(c.y), Math.max(0, hw * (0.35 + 0.5 * L.ease.outCubic(L.clamp(age / 0.8)))), v.accent, lod * (0.12 + 0.5 * I) * bk);
  ctx.restore();
}

// rising motes above the lit minutes (secondary motion while the label holds)
const MOTES = (() => { const r = L.rng(707); return Array.from({ length: 16 }, () => ({ x: r(), t0: r() * 3, sp: L.lerp(0.25, 0.6, r()), sz: L.lerp(0.8, 1.8, r()), ph: r() * 9 })); })();
function drawMotes(ctx, v, t, k) {
  if (k <= 0) return;
  const s = v.ws(HR.h);
  if (s < 40 || s > 900) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    const life = 2.6, a = ((t - T_IGN - m.t0) % life + life) % life;
    if (t < T_IGN + m.t0 * 0.3) continue;
    const u = a / life;
    const wx = HR.x + HR.w * L.lerp(0.62, 1.0, m.x) + L.noise1(t * 0.8 + m.ph, 4) * HR.w * 0.03;
    const wy = HR.y + HR.h * (0.95 - 0.9 * u * m.sp);
    ctx.fillStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.4), k * 0.7 * Math.sin(Math.PI * u));
    ctx.beginPath(); ctx.arc(v.wx(wx), v.wy(wy), Math.max(0, m.sz), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Dec 31 as the dive target: a breathing outline during the end of beat 6 and the dive. */
function drawTarget(ctx, v, t) {
  const k = L.prog(t, -1.0, 0.7) * (1 - L.ease.inOutCubic(L.prog(t, 0.6, 1.1)));
  if (k <= 0) return;
  const q = pad(DAY);
  const x = v.wx(q.x), y = v.wy(q.y), w = v.ws(q.w), h = v.ws(q.h);
  if (x > W || y > H || x + w < 0 || y + h < 0) return;
  const pulse = 0.65 + 0.35 * Math.sin((t + 1) * 5.0);
  L.glow(ctx, v.accent, 18, () => {
    ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.3), 0.9 * k * pulse);
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  });
  ctx.fillStyle = L.rgba(v.accent, 0.08 * k);
  ctx.fillRect(x, y, w, h);
}

/** feathered dark backing behind a label */
function plate(ctx, x, y, w, h, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.shadowColor = `rgba(7,4,9,${0.6 * a})`;
  ctx.shadowBlur = 70;
  ctx.shadowOffsetX = 5000;
  ctx.fillRect(x - 5000, y, w, h);
  ctx.restore();
}

/** the rest of the day steps back once humans appear (focus pull) */
function drawVeil(ctx, v, dim) {
  if (dim <= 0) return;
  const q = pad(DAY, 0.02);
  const x = v.wx(q.x), y = v.wy(q.y), w = v.ws(q.w), h = v.ws(q.h);
  if (w > 6000) return;
  const hx = v.wx(HR.x), hy = v.wy(HR.y);
  ctx.save();
  ctx.fillStyle = `rgba(8,4,10,${0.55 * dim})`;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.rect(hx + v.ws(HR.w), hy, -v.ws(HR.w), v.ws(HR.h));   // hole for 23:00 (opposite winding)
  ctx.fill('nonzero');
  ctx.restore();
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Humans', sub: 'December 31, 11:48 pm' },
  captions: true,
  layer: 2,
  cues() {
    return [
      { t: 0.05, name: 'dive', gain: 0.32, pitch: 0.9 },
      { t: T_SWEEP + 0.05, name: 'count', gain: 0.16, pitch: 0.9 },
      { t: T_SWEEP + 0.95, name: 'count', gain: 0.12, pitch: 0.8 },
      { t: T_IGN, name: 'bloom', gain: 0.38, pitch: 1.0 },
      { t: T_IGN + 0.03, name: 'shimmer', gain: 0.16, pitch: 1.1 },
      { t: T_LAB, name: 'swish', gain: 0.1, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < -1.2) return;
    drawTarget(ctx, v, t);
    if (t < 0) return;
    // the day steps back WITH the ignition, before the label lands on the hour grid
    const dim = L.ease.inOutCubic(L.prog(t, T_IGN - 0.1, 0.5)) * (1 - L.ease.inOutCubic(L.prog(t, v.d - 0.2, 1.0)));
    drawSweep(ctx, v, t, dim);
    drawVeil(ctx, v, dim);
    drawMinutes(ctx, v, t, dim);
    drawHumanMinutes(ctx, v, t);
    const fk = L.prog(t, T_FIG, 0.9) * (1 - L.ease.inCubic(L.prog(t, v.d, 0.7)));
    drawMotes(ctx, v, t, fk);
    drawFigure(ctx, v, t, fk);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const k = Math.min(v.k, L.prog(t, T_LAB, 0.55));
    // the backing leads the label in, so the text never lands on bright hour labels
    const pk = Math.min(v.k, L.ease.outCubic(L.prog(t, T_IGN - 0.05, 0.4)));
    if (k <= 0 && pk <= 0) return;
    const fx = v.wx(FIG.x), top = v.wy(FIG.y - FIG_H) - 14;
    const lx = Math.min(905, v.wx(HR.x + HR.w)), ly = top - 92;
    plate(ctx, lx - 600, ly - 150, 620, 190, pk * 1.45);
    if (k <= 0) return;
    L.leader(ctx, fx, top, fx, ly + 14, L.prog(t, T_LAB + 0.1, 0.5), [255, 225, 248], 0.7);
    L.bigLabel(ctx, { x: lx, y: ly - 18, big: '11:48 PM', small: 'Homo sapiens · 300,000 years ago', k, accent: v.accent, align: 'right', size: 112 });
  },
};
