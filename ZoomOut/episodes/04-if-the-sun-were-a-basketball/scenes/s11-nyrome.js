// Beat 11 — "as far away as New York is from Rome."
// A great-circle flight arc lifts off New York (the Sun) and lands on Rome (Proxima), its ground track traced
// on the globe beneath it, then the distance lands in the mid-Atlantic: ≈ 6,900 km.
import * as L from '../../../../engine/runtime/lib.js';
import { globeK, globeXY, GLOBE_C, R_EARTH, NEW_YORK, ROME } from '../env.js';
import { ACC, SUN_C, STAR_C, T } from './s10-star.js';

const { ease, clamp, lerp, prog, rgba } = L;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ great circle New York -> Rome (world metres)
const NY_LL = [40.71, -74.0], ROME_LL = [41.9, 12.5];
const unit = ([la, lo]) => [Math.cos(la * DEG) * Math.cos(lo * DEG), Math.cos(la * DEG) * Math.sin(lo * DEG), Math.sin(la * DEG)];
const A = unit(NY_LL), Bv = unit(ROME_LL);
const OMEGA = Math.acos(A[0] * Bv[0] + A[1] * Bv[1] + A[2] * Bv[2]);
const N = 160;
const ALT = 0.05;                        // radial lift (fraction of Earth's radius) at mid-flight
const UP = 0.21 * R_EARTH;               // plus a screen-up lift so the flight reads as an arc above the globe
function slerpLL(s) {
  const a = Math.sin((1 - s) * OMEGA) / Math.sin(OMEGA), b = Math.sin(s * OMEGA) / Math.sin(OMEGA);
  const x = a * A[0] + b * Bv[0], y = a * A[1] + b * Bv[1], z = a * A[2] + b * Bv[2];
  return [Math.atan2(z, Math.hypot(x, y)) / DEG, Math.atan2(y, x) / DEG];
}
const TRACK = Array.from({ length: N + 1 }, (_, i) => {
  const s = i / N, [la, lo] = slerpLL(s);
  const g = globeXY(la, lo);
  const sn = Math.sin(Math.PI * s), h = 1 + ALT * sn;
  return { gx: g.x, gy: g.y, ax: GLOBE_C.x + (g.x - GLOBE_C.x) * h, ay: GLOBE_C.y + (g.y - GLOBE_C.y) * h - UP * Math.pow(sn, 0.85) };
});

const B = {
  arc0: 0.25,       // the arc leaves New York...
  arcDur: 1.65,     // ...and lands on "Rome"
  label: 1.0,       // ≈ 6,900 km
};

/** arc progress 0..1 (global-time based so s12 can fade it) */
function arcP(v) { return ease.inOutCubic(prog(v.gt, T(v).b11 + B.arc0, B.arcDur)); }

export default {
  beat: 11,
  chapter: { num: '11', title: 'New York to Rome', sub: 'The Sun to its nearest star' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: B.arc0, name: 'whoosh', gain: 0.24, pitch: 0.85 },
      { t: B.label + 0.05, name: 'tick', gain: 0.25, pitch: 1.1 },
      { t: B.arc0 + B.arcDur, name: 'ping', gain: 0.3, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const p = arcP(v);
    if (p <= 0 || globeK(v) < 0.5) return;
    const fade = 1 - ease.inOutCubic(prog(v.gt, T(v).b12 + 0.2, 1.6));   // the ending lets the arc go
    if (fade <= 0) return;
    const n = Math.max(1, Math.round(p * N));
    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.lineCap = 'round';
    // ground track: dotted, on the surface
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = 'rgba(255,220,190,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const q = TRACK[i]; i ? ctx.lineTo(v.wx(q.gx), v.wy(q.gy)) : ctx.moveTo(v.wx(q.gx), v.wy(q.gy)); }
    ctx.stroke();
    ctx.setLineDash([]);
    // the arc: soft glow pass + crisp core, warm (Sun) to red (Proxima)
    const x0 = v.wx(TRACK[0].ax), x1 = v.wx(TRACK[N].ax);
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, rgba(SUN_C, 0.95));
    grad.addColorStop(0.5, rgba(ACC, 0.95));
    grad.addColorStop(1, rgba(STAR_C, 0.95));
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const q = TRACK[i]; i ? ctx.lineTo(v.wx(q.ax), v.wy(q.ay)) : ctx.moveTo(v.wx(q.ax), v.wy(q.ay)); }
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 9;
    path(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    path(); ctx.stroke();
    // altitude ticks: thin verticals from the arc to its ground track (every 16th sample)
    ctx.strokeStyle = 'rgba(255,220,190,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 10; i < n; i += 10) { const q = TRACK[i]; ctx.moveTo(v.wx(q.ax), v.wy(q.ay)); ctx.lineTo(v.wx(q.gx), v.wy(q.gy)); }
    ctx.stroke();
    // travelling head (only while flying)
    if (p < 1) {
      const q = TRACK[n];
      const hk = Math.sin(Math.PI * clamp(p * 1.15));
      L.lightBlob(ctx, v.wx(q.ax), v.wy(q.ay), 46, ACC, 0.7 * hk);
      ctx.fillStyle = `rgba(255,245,230,${hk})`;
      ctx.beginPath(); ctx.arc(v.wx(q.ax), v.wy(q.ay), 4, 0, TAU); ctx.fill();
    } else {
      // touchdown ripple on Rome
      const rk = prog(v.gt, T(v).b11 + B.arc0 + B.arcDur, 0.9);
      if (rk > 0 && rk < 1) {
        ctx.strokeStyle = rgba(STAR_C, 0.7 * (1 - rk));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(v.wx(ROME.x), v.wy(ROME.y), Math.max(0, 10 + 50 * ease.outCubic(rk)), 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    ctx.save();
    ctx.globalAlpha *= v.k;
    const nyx = v.wx(NEW_YORK.x), nyy = v.wy(NEW_YORK.y);
    const rx = v.wx(ROME.x), ry = v.wy(ROME.y);
    // distance: centred in the open Atlantic, under the arc
    const bk = prog(t, B.label, 0.6);
    if (bk > 0) {
      const mx = (nyx + rx) / 2, my = Math.min(1150, (nyy + ry) / 2 + 225);
      // soft dark backing so it reads over the globe
      const g = ctx.createRadialGradient(mx, my - 40, 0, mx, my - 40, 330);
      g.addColorStop(0, `rgba(2,6,14,${0.55 * clamp(bk * 2)})`);
      g.addColorStop(1, 'rgba(2,6,14,0)');
      ctx.fillStyle = g;
      ctx.fillRect(mx - 340, my - 380, 680, 680);
      L.bigLabel(ctx, { x: mx, y: my, big: '≈ 6,900 km', small: '4,300 mi · New York to Rome', k: bk, accent: v.accent, align: 'center', size: 116 });
    }
    ctx.restore();
  },
};
