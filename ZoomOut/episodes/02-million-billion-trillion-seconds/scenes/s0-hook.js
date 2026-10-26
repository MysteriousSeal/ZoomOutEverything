// Beat 0 — the hook. "HOW LONG IS / A MILLION / SECONDS?" rises out of masks, left-aligned beside the timeline.
// Above it, at NOW, the first seconds tick by in real time: a gold span grows 1 s = 1 s (drawn by s1, which owns
// the continuous million span), ruled every second, with a soft pulse ring per second and a rolling counter.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { LANE_X } from './s1-million.js';

const GOLD = ACCENT;
const HOT = [255, 238, 190];
const X = 300;
const LINES = [
  { txt: 'HOW LONG IS', y: 815, size: 112, t0: 0.12 },
  { txt: 'A MILLION', y: 1005, size: 168, t0: 0.4, accent: true },
  { txt: 'SECONDS?', y: 1170, size: 138, t0: 0.7 },
];

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 2,
  cues(d) {
    return [
      { t: 0.1, name: 'swish', gain: 0.2, pitch: 1.2 },
      { t: 0.36, name: 'shimmer', gain: 0.18, pitch: 1.1 },
      { t: 1.0, name: 'tick', gain: 0.3, pitch: 1.6 },
      { t: 2.0, name: 'tick', gain: 0.3, pitch: 1.6 },
      { t: d - 0.3, name: 'swish', gain: 0.14, pitch: 0.9 },
    ];
  },

  // ruler marks on the span + one pulse ring per elapsed second (fades as the camera zooms out)
  drawWorld(ctx, v) {
    const pxPerS = 1 / v.cam.mpp;
    const vis = L.clamp((pxPerS - 3) / 6);
    if (vis <= 0) return;
    ctx.save();
    const nMax = Math.min(60, Math.floor(v.gt));
    for (let n = 1; n <= nMax; n++) {
      const y = v.wy(n);
      const age = v.gt - n;
      ctx.fillStyle = L.rgba([30, 22, 10], 0.75 * vis);
      ctx.fillRect(LANE_X - 6, y - 1, 12, 2);
      if (age < 1.1) {
        // one beat per elapsed second: a hot flash on the span head + a bright ring that opens out
        const e = L.ease.outCubic(L.clamp(age / 1.1));
        const fl = Math.exp(-age * 7);
        L.lightBlob(ctx, LANE_X, y, 70, GOLD, 0.55 * fl * vis);
        L.lightBlob(ctx, LANE_X, y, 26, HOT, 0.95 * fl * vis);
        ctx.fillStyle = L.rgba(HOT, fl * vis);
        ctx.fillRect(LANE_X - 24, y - 2, 48, 4);
        ctx.strokeStyle = L.rgba(HOT, 0.8 * (1 - e) * vis);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(LANE_X, y, Math.max(0, 10 + 56 * e), 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = L.rgba(GOLD, 0.35 * (1 - e) * vis);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(LANE_X, y, Math.max(0, 10 + 30 * e), 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    LINES.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.62, L.ease.outExpo);
      const kout = L.enter(t, d - 0.42 + i * 0.05, 0.3, L.ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      ctx.save();
      const size = L.fitSize(ctx, ln.txt, 640, ln.size, 800, L.FONT.display);
      ctx.font = L.font(size, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const m = ctx.measureText(ln.txt);
      ctx.letterSpacing = '0px';
      const inkR = X + m.actualBoundingBoxRight;
      const top = ln.y - size * 0.8, bot = ln.y + size * 0.1;
      if (ln.accent) {
        // gold bar wipes in from the left, the word rises inside it in ink; it wipes out to the right
        const bk = L.enter(t, ln.t0 - 0.08, 0.55, L.ease.outExpo);
        const x0 = X - 26, bw = inkR - X + 52;
        const bL = x0 + bw * kout, bR = x0 + bw * bk;
        if (bR > bL) {
          ctx.save();
          L.lightBlob(ctx, (bL + bR) / 2, (top + bot) / 2, (bR - bL) * 0.7, GOLD, 0.12);
          ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
          ctx.fillStyle = L.rgba(GOLD);
          ctx.fillRect(bL, top - 16, bR - bL, bot - top + 32);
          ctx.restore();
          // a light sweep across the bar once it lands
          const sw = L.prog(t, 1.05, 0.7);
          if (sw > 0 && sw < 1) {
            ctx.save();
            ctx.beginPath(); ctx.rect(bL, top - 16, bR - bL, bot - top + 32); ctx.clip();
            const sx = L.lerp(bL - 120, bR + 120, L.ease.inOutCubic(sw));
            const g = ctx.createLinearGradient(sx - 90, 0, sx + 90, 0);
            g.addColorStop(0, 'rgba(255,250,230,0)');
            g.addColorStop(0.5, 'rgba(255,250,230,0.35)');
            g.addColorStop(1, 'rgba(255,250,230,0)');
            ctx.fillStyle = g;
            ctx.fillRect(bL, top - 16, bR - bL, bot - top + 32);
            ctx.restore();
          }
        }
        ctx.beginPath(); ctx.rect(Math.max(bL, 0), top - 16, Math.max(0, bR - bL), bot - top + 32); ctx.clip();
        ctx.fillStyle = '#1a1308';
      } else {
        ctx.beginPath(); ctx.rect(0, top - 10, 1080, bot - top + 24); ctx.clip();
        ctx.fillStyle = 'rgba(246,238,222,1)';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16;
      }
      const dy = (1 - kin) * size * 1.05 - kout * size * 1.1;
      ctx.font = L.font(size, 800, L.FONT.display);
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, ln.txt, X, ln.y + dy, -1, 'left');
      ctx.restore();
    });
  },
};
