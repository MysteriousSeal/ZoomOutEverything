// Beat 4 — "So does the air: winds of more than a thousand kilometers an hour."
// The whole atmosphere keeps its eastward speed. Over s01's district (3.2 m/px, frame ≈ 3.5 km) dense
// streamlines and long dust sheets tear east; trees in the parks and streets are bent flat (s01 reads windK).
// The air starts as a dusty breeze right after the stop (beat 3) and builds to the full gale on "So does the
// air". Streamlines are world-space octaves (each octave peaks at ~120 px on screen), so they stay coherent
// through the pull-out and fade with the city on the way back up to the globe.
import * as L from '../../../../engine/runtime/lib.js';
import { WIND_V, drawVector, scrim, windK } from './s01-equator.js';
import { wordTime } from '../env.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const OCT = [6, 18, 54, 162, 486, 1458];     // streamline row spacing (m)
const FLOW = 1.8;                            // streamlines read as gusts: drawn faster than the air itself
function hh(a, b, s = 0) { const h = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }

function bounds(v) {
  const m = v.cam.mpp;
  return { x0: v.cam.x - (W / 2) * m, x1: v.cam.x + (W / 2) * m, y0: v.cam.y - H * v.cam.anchor * m, y1: v.cam.y + H * (1 - v.cam.anchor) * m };
}

function streamlines(c, v, wk, boost = 1) {
  const m = v.cam.mpp, B = bounds(v), gt = v.gt;
  c.save();
  c.lineCap = 'round';
  OCT.forEach((s, oi) => {
    const px = s / m;
    const w = Math.exp(-Math.pow(Math.log(px / 90) / 0.8, 2));
    if (w < 0.05) return;
    const P = s * 2.3;
    for (let j = Math.floor(B.y0 / s) - 1; j <= Math.ceil(B.y1 / s); j++) {
      const sp = FLOW * WIND_V * (0.8 + 0.4 * hh(j, oi, 3));
      const y = (j + 0.8 * hh(j, oi)) * s;
      const sy = v.wy(y);
      if (sy < -20 || sy > H + 20) continue;
      const ph = hh(j, oi, 2) * P + sp * gt;
      for (let k = Math.floor((B.x0 - s * 6 - ph) / P); k <= Math.ceil((B.x1 - ph) / P); k++) {
        const r = hh(j, k, oi + 11);
        if (r < 0.07) continue;
        const len = s * (1.8 + 3.6 * hh(k, j, oi + 5));
        const x0 = k * P + ph + r * s, x1 = x0 + len;
        const sx0 = v.wx(x0), sx1 = v.wx(x1);
        if (sx1 < 0 || sx0 > W) continue;
        const wob = (hh(k, j, 2) - 0.5) * s * 0.35;
        // keep the HUD band and the label block (y 440–640, left) legible: lines pass behind them quietly
        const quiet = v.windClock != null ? 1 : sy < 380 ? 0.4 : sy > 430 && sy < 650 && sx0 < 780 ? 0.35 : 1;   // 13b cold open: no HUD/label there
        const a = Math.min(0.35 * boost, 0.5 * boost * wk * Math.min(1, w * 1.6) * (0.62 + 0.45 * r)) * quiet;
        const dark = r > 0.94;
        const col = dark ? [70, 56, 40] : [244, 244, 238];
        const lw = Math.max(1.4, Math.min(5, 1.8 + px * 0.03)) * (0.6 + 0.4 * wk) * (dark ? 1.2 : 1);
        const path = () => {
          c.beginPath();
          c.moveTo(sx0, sy);
          c.bezierCurveTo(sx0 + (sx1 - sx0) * 0.33, sy + v.ws(wob), sx0 + (sx1 - sx0) * 0.66, sy - v.ws(wob), sx1, sy + v.ws(wob * 0.3));
        };
        if (!dark) {                                     // soft additive glow under the line
          const gg = c.createLinearGradient(sx0, 0, sx1, 0);
          gg.addColorStop(0, 'rgba(255,248,230,0)');
          gg.addColorStop(0.8, `rgba(255,248,230,${a * 0.12})`);
          gg.addColorStop(1, `rgba(255,248,230,${a * 0.04})`);
          c.globalCompositeOperation = 'lighter';
          c.strokeStyle = gg;
          c.lineWidth = lw * 2.2;
          path(); c.stroke();
          c.globalCompositeOperation = 'source-over';
        }
        const g = c.createLinearGradient(sx0, 0, sx1, 0);
        g.addColorStop(0, L.rgba(col, 0));
        g.addColorStop(0.8, L.rgba(col, a));
        g.addColorStop(1, L.rgba(col, a * 0.35));
        c.strokeStyle = g;
        c.lineWidth = lw;
        path(); c.stroke();
      }
    }
  });
  c.restore();
}

/** long translucent dust sheets drifting east */
function dustSheets(c, v, wk) {
  const m = v.cam.mpp, B = bounds(v), gt = v.gt;
  const S = Math.max(60, m * 260);                // sheet row spacing scales with the view (stays a few sheets)
  const lv = Math.log10(S);
  const s = Math.pow(10, Math.round(lv * 2) / 2);
  const P = s * 4;
  c.save();
  for (let j = Math.floor(B.y0 / s) - 1; j <= Math.ceil(B.y1 / s) + 1; j++) {
    const y = (j + hh(j, 5)) * s;
    const ph = hh(j, 6) * P + WIND_V * 0.85 * gt;
    for (let k = Math.floor((B.x0 - s * 2 - ph) / P); k <= Math.ceil((B.x1 + s * 2 - ph) / P); k++) {
      const r = hh(j, k, 9);
      if (r < 0.22) continue;
      const cx = k * P + ph + r * s, rx = s * (1.8 + 1.8 * r), ry = s * (0.26 + 0.2 * hh(k, j, 4));
      const sx = v.wx(cx), sy = v.wy(y), prx = rx / m, pry = ry / m;
      if (sx + prx < 0 || sx - prx > W || sy + pry * 3 < 0 || sy - pry * 3 > H) continue;
      c.save();
      c.translate(sx, sy);
      c.scale(1, Math.max(0.01, pry / prx));
      const g = c.createRadialGradient(-prx * 0.25, 0, 0, 0, 0, prx);
      const a = Math.min(0.5, 0.5 * wk * (0.5 + 0.5 * r));
      g.addColorStop(0, `rgba(168,136,98,${a})`);
      g.addColorStop(0.55, `rgba(156,126,92,${a * 0.55})`);
      g.addColorStop(1, 'rgba(150,122,90,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, Math.max(0, prx), 0, TAU); c.fill();
      c.restore();
    }
  }
  c.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'The wind' },
  captions: true,
  layer: 3,
  // beat 4 starts at 18.90: "So does the air" 19.05, "winds" 20.15, "thousand" 21.39
  cues(d) {
    return [
      { t: 0.1, name: 'swell', gain: 0.32, pitch: 0.7 },
      { t: 0.2, name: 'whoosh', gain: 0.4, pitch: 0.6 },
      { t: 0.9, name: 'deep', gain: 0.3, pitch: 0.55 },
      { t: 1.25, name: 'whoosh', gain: 0.36, pitch: 0.8 },
      { t: 1.7, name: 'ping', gain: 0.24, pitch: 0.85 },     // label
      { t: 2.4, name: 'swish', gain: 0.22, pitch: 0.7 },
      { t: 3.4, name: 'whoosh', gain: 0.26, pitch: 0.65 },
    ];
  },
  drawWorld(ctx, v) {
    const wk = windK(v.gt, v.tl);
    if (wk <= 0) return;
    // the gale ends with its beat: ease out over the last ~0.45 s so the beat-5 pull-back starts clean,
    // and never draw the screen-filling streaks once the view is past ~20 m/px
    const end = v.tl.scenes[4].end;
    const ko = 1 - L.ease.inOutCubic(L.prog(v.gt, end - 0.95, 0.85));   // 13b: a slow, even clear-out (it popped in ~2 frames)
    const km = L.clamp(L.invLerp(20, 8, v.cam.mpp));
    if (km <= 0 || ko <= 0) return;
    const k = wk * km * ko;
    // a light haze of lifted dust over the district
    ctx.save();
    ctx.fillStyle = `rgba(118,104,84,${0.4 * k * L.clamp(L.invLerp(0.3, 2.5, v.cam.mpp))})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // 13b: the cold open (p-cold) redraws this beat with the wind on a real-time clock (v.windClock) and a little
    // stronger (v.windBoost), so the gale visibly tears east while the replay runs in slow motion. Film: unchanged.
    const wv = v.windClock != null ? { ...v, gt: v.windClock } : v;
    dustSheets(ctx, wv, k);
    streamlines(ctx, wv, k, v.windBoost ?? 1);
  },
  drawOverlay(ctx, v) {
    // a soft scrim behind the caption line while the streaks are on screen (captions sit at y ≈ 1335)
    const ks = windK(v.gt, v.tl) * v.k * L.clamp(L.invLerp(20, 8, v.cam.mpp));
    if (ks > 0.01) {   // 13b: a caption-sized soft ellipse at the caption line (y ≈ 1450), never a full-width band
      const end = v.tl.scenes[4].end;
      const kc = ks * (1 - L.ease.inOutCubic(L.prog(v.gt, end - 0.95, 0.85)));
      ctx.save();
      ctx.translate(W / 2, 1446);
      ctx.scale(1, 0.17);
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 500);
      g.addColorStop(0, `rgba(4,8,14,${0.5 * kc})`);
      g.addColorStop(0.6, `rgba(4,8,14,${0.3 * kc})`);
      g.addColorStop(1, 'rgba(4,8,14,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-500, -500, 1000, 1000);
      ctx.restore();
    }
    // the air's vector: one long east arrow under the label, on "So does the air"
    const kv = L.prog(v.gt, wordTime(v.tl, 4, /^air/i) - 0.25, 0.9) * v.k;
    if (kv > 0) drawVector(ctx, 96, 700, 800, kv, { w: 10, flow: v.gt * 1.6, alpha: 1 });
    const kl = L.prog(v.gt, wordTime(v.tl, 4, /^thousand$/i) - 0.2, 0.6) * v.k;   // 13b: on the voiced "1,000"
    if (kl <= 0) return;
    scrim(ctx, 64, 430, 640, 230, kl);
    L.bigLabel(ctx, { x: 96, y: 560, big: '> 1,000 km/h', small: '620+ mph winds', k: kl, accent: v.accent, size: 112 });
  },
};
