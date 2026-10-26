// Beat 2 — "Antarctica holds about ninety percent of the world's ice."
// The ice sheet gets a cool rim glow along its real coastline (s01's mask), then ONE device: a hairline gauge ring
// around the continent (the 64°S circle, so it rides the globe) with ten tick marks, filling clockwise to 90% on
// "ninety". The 10% gap is left open in the upper left, where the label sits: "≈ 90%" / "of the world's ice".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, project, geoPath } from '../env.js';
import { antarcticaMask, drawMaskImage } from './s01-zoom-out.js';

const TAU = Math.PI * 2;
const RING_LAT = -64;
const START = -4;                          // lon at 12 o'clock-ish (pole view: 0° up, east clockwise)
const SPAN = 324;                          // 90% of the circle
const ICY = [170, 225, 255];

// timing (beat-relative): rim glow on "Antarctica", the fill on "ninety"
const T_GLOW = 0.12, T_TICKS = 0.85, T_FILL = 1.15, D_FILL = 1.35, T_LABEL = 1.38;

let tinted = null;
function glowImage() {
  if (tinted) return tinted;
  const { glow, n } = antarcticaMask();
  tinted = new OffscreenCanvas(n, n);
  const c = tinted.getContext('2d');
  c.drawImage(glow, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = L.rgba(ICY);
  c.fillRect(0, 0, n, n);
  return tinted;
}

const fillK = (t) => L.ease.inOutCubic(L.prog(t, T_FILL, D_FILL));

function arcPts(f) {
  const pts = [];
  const n = Math.max(2, Math.ceil(SPAN * f / 2));
  for (let i = 0; i <= n; i++) pts.push([RING_LAT, START + SPAN * f * (i / n)]);
  return pts;
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Antarctica', sub: 'the biggest block of ice' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: T_GLOW + 0.05, name: 'bloom', gain: 0.26, pitch: 0.9 },
      { t: T_TICKS, name: 'tick', gain: 0.12, pitch: 1.3 },
      { t: T_FILL, name: 'riser', gain: 0.12, pitch: 1.4 },
      { t: T_FILL + D_FILL - 0.05, name: 'ping', gain: 0.3, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    // exit before the next camera move (faster than the entrance)
    const k = v.k * (1 - L.ease.inCubic(L.prog(t, v.d - 0.3, 0.3)));
    if (k <= 0.001) return;
    // ---- rim glow along the real coastline (breathes gently)
    const kg = L.ease.outCubic(L.prog(t, T_GLOW, 0.8)) * k;
    if (kg > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = kg * (0.75 + 0.15 * Math.sin(v.gt * 2.2));
      drawMaskImage(ctx, v, glowImage());
      ctx.restore();
    }
    // ---- the gauge
    const kt = L.ease.outCubic(L.prog(t, T_TICKS, 0.6)) * k;
    const f = fillK(t);
    if (kt > 0.001) {
      ctx.save();
      ctx.lineCap = 'round';
      // the full circle as a faint guide, then ten ticks (outside the ring), staggered in
      ctx.globalAlpha = kt;
      ctx.strokeStyle = 'rgba(200,225,240,0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      geoPath(ctx, v, arcPts(1).concat([[RING_LAT, START + 360]]), false);
      ctx.stroke();
      for (let i = 0; i <= 10; i++) {
        const ki = L.ease.outCubic(L.prog(t, T_TICKS + i * 0.04, 0.35));
        if (ki <= 0) continue;
        const lon = START + 36 * i;
        const a = project(v, RING_LAT, lon), b = project(v, RING_LAT + (i % 5 === 0 ? 1.6 : 0.9) * ki, lon);
        const lit = SPAN * f >= 36 * i - 0.5 && i < 10;
        ctx.strokeStyle = lit ? L.rgba(ACCENT, 0.95 * kt) : `rgba(200,225,240,${0.4 * kt})`;
        ctx.lineWidth = i % 5 === 0 ? 2.5 : 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    }
    if (f > 0.001) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // a soft glow under the filled arc, then the crisp line
      ctx.globalAlpha = k;
      ctx.strokeStyle = L.rgba(ACCENT, 0.22);
      ctx.lineWidth = 9;
      ctx.beginPath(); geoPath(ctx, v, arcPts(f), false); ctx.stroke();
      ctx.strokeStyle = L.rgba(ACCENT, 0.95);
      ctx.lineWidth = 3;
      ctx.beginPath(); geoPath(ctx, v, arcPts(f), false); ctx.stroke();
      // the head of the arc: a bright bead while filling, a small end cap once full
      const head = project(v, RING_LAT, START + SPAN * f);
      const moving = 1 - L.prog(t, T_FILL + D_FILL - 0.1, 0.5);
      L.lightBlob(ctx, head.x, head.y, 26, ACCENT, 0.55 * moving * k);
      ctx.fillStyle = L.rgba([240, 255, 250], k);
      ctx.beginPath(); ctx.arc(head.x, head.y, Math.max(0, 4 + 1.5 * moving), 0, TAU); ctx.fill();
      // landing flash: one ring pulse around the whole gauge at 90%
      const pl = L.prog(t, T_FILL + D_FILL - 0.05, 0.9);
      if (pl > 0 && pl < 1) {
        ctx.strokeStyle = L.rgba(ACCENT, 0.5 * (1 - pl) * k);
        ctx.lineWidth = 2;
        ctx.beginPath(); geoPath(ctx, v, arcPts(1).map(([la, lo]) => [la + 2.2 * L.ease.outCubic(pl), lo]), false); ctx.stroke();
      }
      ctx.restore();
    }
    // ---- label in the gauge's open 10%
    const kl = L.enter(t, T_LABEL, 0.6) * k;
    if (kl > 0.001) {
      L.bigLabel(ctx, { x: 96, y: 452, big: '≈ 90%', small: "of the world's ice", k: kl, accent: ACCENT, size: 112 });
    }
  },
};
