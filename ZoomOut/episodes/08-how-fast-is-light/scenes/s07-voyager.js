// Beat 7 — Voyager 1: almost a full light-day away.
// The frame widens past Neptune. The heliopause (the edge of the Sun's wind bubble, ~121 AU) glows in
// faintly, Voyager's escape trajectory draws itself out beyond it, and the probe (a tiny silhouette,
// its dish turned home) appears at the end: "our most distant spacecraft". Then the photon leaves Earth
// and crosses the whole gap at a constant rate (the clock runs linearly), touching the probe just as the
// narrator says "almost a full day"; the clock locks at 22 H 53 MIN, and a one-light-day ring draws itself
// just beyond the probe.
import * as L from '../../../../engine/runtime/lib.js';
import { C, SUN, VOYAGER } from '../camera.js';
import { drawClock, PHOTON_GOLD } from './s01-one-second.js';
import { cruise, drawReticle, drawRun, drawTag, frameT, onScreen } from './s06-neptune.js';

const AU = 1.496e11;
const D_VOY = Math.hypot(VOYAGER.x, VOYAGER.y);          // Earth → Voyager 1 (≈ 24.7 billion km, 22 h 53 min)
const LIGHT_DAY = C * 86400;
const HELIO = 121 * AU;
const T0 = 1.5, TA = 4.1;                                // photon departs Earth / touches the probe (beat time)
const HELIO_COL = [120, 170, 255];

// escape trajectory: Sun → Voyager, bent by the giant-planet flybys (a gentle quadratic in world space)
const TRAJ = (() => {
  const dx = VOYAGER.x - SUN.x, dy = VOYAGER.y - SUN.y, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const c = { x: SUN.x + dx * 0.45 + nx * len * 0.2, y: SUN.y + dy * 0.45 + ny * len * 0.2 };
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u;
    pts.push([a * SUN.x + b * c.x + d * VOYAGER.x, a * SUN.y + b * c.y + d * VOYAGER.y]);
  }
  return pts;
})();

/** Voyager 1 silhouette (screen px): dish facing home, bus, RTG boom, science boom, 13 m magnetometer boom. */
function drawProbe(ctx, x, y, s, a, home, gt, glint) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= a;
  ctx.rotate(home + Math.PI / 2 + 0.25);                  // dish (local −y) turned toward Earth
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  // booms
  ctx.strokeStyle = 'rgba(200,205,215,0.75)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(-40, 24); ctx.stroke();            // magnetometer
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(21, 15); ctx.stroke();             // RTG boom
  ctx.beginPath(); ctx.moveTo(-2, 5); ctx.lineTo(-15, 15); ctx.stroke();           // science boom
  ctx.fillStyle = 'rgba(150,140,130,1)';
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(13 + i * 3.6, 10.8 + i * 1.9); ctx.rotate(0.48); ctx.fillRect(-1.5, -2.4, 3, 4.8); ctx.restore(); }
  ctx.fillStyle = 'rgba(175,175,185,1)';
  ctx.fillRect(-18, 13.5, 6, 4);                                                    // scan platform
  // bus (ten-sided)
  ctx.fillStyle = 'rgba(120,118,112,1)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const an = i * Math.PI / 5; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * 5, 6 + Math.sin(an) * 3); }
  ctx.closePath(); ctx.fill();
  // high-gain dish (3.7 m), seen slightly from the side
  const g = ctx.createLinearGradient(-12, -8, 12, 4);
  g.addColorStop(0, 'rgba(250,250,250,1)');
  g.addColorStop(0.6, 'rgba(200,204,212,1)');
  g.addColorStop(1, 'rgba(120,125,135,1)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -2, 12.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(90,95,105,0.9)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.ellipse(0, -2, 7, 3.3, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(0, -9); ctx.lineTo(6, -1); ctx.stroke();   // feed struts
  ctx.fillStyle = 'rgba(235,235,240,1)';
  ctx.beginPath(); ctx.arc(0, -9, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // dish glint (when the photon touches it) and a slow beacon pulse
  const beacon = 0.5 + 0.5 * Math.sin(gt * 2.6);
  L.lightBlob(ctx, x, y, 26 * s, [190, 215, 255], 0.16 * a * (0.6 + 0.4 * beacon));
  if (glint > 0) L.lightBlob(ctx, x, y, 60 * s, [255, 245, 225], 0.7 * glint * a);
}

function drawHeliopause(ctx, v, k) {
  if (k <= 0.01) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y), r = HELIO / v.cam.mpp;
  if (r < 4 || r > 5000) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sx, sy, r * 0.82, sx, sy, r * 1.03);
  g.addColorStop(0, L.rgba(HELIO_COL, 0));
  g.addColorStop(0.85, L.rgba(HELIO_COL, 0.045 * k));
  g.addColorStop(1, L.rgba(HELIO_COL, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, r * 1.03), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = L.rgba(HELIO_COL, 0.16 * k);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([1.5, 5]);
  ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, r * 0.985), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function photonR(t) {
  return D_VOY * cruise(L.prog(t, T0, TA - T0), 0.12);
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Voyager 1', sub: 'Our most distant spacecraft' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 1.05, name: 'shimmer', gain: 0.14, pitch: 1.1 },
      { t: 1.15, name: 'blip', gain: 0.22, pitch: 1.2 },
      { t: T0 - 0.05, name: 'swish', gain: 0.24, pitch: 1.1 },
      { t: T0 + 0.6, name: 'count', gain: 0.14, pitch: 1.1 },
      { t: TA, name: 'impact', gain: 0.24, pitch: 1.4 },
      { t: TA + 0.02, name: 'tick', gain: 0.42, pitch: 1.0 },
      { t: TA + 0.06, name: 'ping', gain: 0.22, pitch: 1.0 },
      { t: TA + 0.45, name: 'swell', gain: 0.1, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < 0) return;
    const ex = v.wx(0), ey = v.wy(0);
    const vx = v.wx(VOYAGER.x), vy = v.wy(VOYAGER.y);
    const span = D_VOY / v.cam.mpp;
    if (span < 2) return;                                   // collapsed into the Sun's point (beat 8)
    const small = L.clamp((span - 2) / 60);
    ctx.save();
    ctx.globalAlpha *= small;
    drawHeliopause(ctx, v, L.ease.inOutCubic(L.prog(t, 0.5, 1.2)));
    // trajectory draws itself outward from the Sun
    const tr = L.ease.inOutCubic(L.prog(t, 0.55, 1.0));
    if (tr > 0) {
      const n = Math.max(1, Math.round(tr * (TRAJ.length - 1)));
      ctx.save();
      ctx.strokeStyle = 'rgba(215,222,235,0.32)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const [x, y] = TRAJ[i]; i ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y)); }
      ctx.stroke();
      ctx.restore();
    }
    // light-day ring: just beyond the probe, drawn after the lock
    const kr = L.ease.inOutCubic(L.prog(t, TA + 0.35, 1.1)) * (1 - L.ease.inCubic(L.prog(t, v.d - 0.1, 0.5)));
    if (kr > 0) {
      const rr = LIGHT_DAY / v.cam.mpp, a0 = Math.atan2(VOYAGER.y, VOYAGER.x);
      ctx.save();
      ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.5);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(ex, ey, Math.max(0, rr), a0 - 1.6 * kr, a0 + 1.6 * kr); ctx.stroke();
      ctx.restore();
    }
    // the probe
    const kp = L.ease.outCubic(L.prog(t, 1.0, 0.6));
    const glint = Math.exp(-Math.max(0, t - TA) * 2.5) * (t >= TA ? 1 : 0);
    if (onScreen(vx, vy)) drawProbe(ctx, vx, vy, L.lerp(0.35, 1.45, L.clamp((span - 40) / 500)), kp, Math.atan2(ey - vy, ex - vx), v.gt, glint);
    ctx.restore();

    // the photon
    if (t < T0 || t > v.d + 1.4) return;
    const r = photonR(t);
    const ux = VOYAGER.x / D_VOY, uy = VOYAGER.y / D_VOY;
    const hx = ex + ux * r / v.cam.mpp, hy = ey + uy * r / v.cam.mpp;
    const after = t - TA;
    drawRun(ctx, ex, ey, hx, hy, {
      after, t0k: L.ease.outCubic(L.prog(t, T0, 0.25)), fade: 1 - L.ease.inCubic(L.prog(t, v.d, 0.9)), gt: v.gt,
    });
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const vx = v.wx(VOYAGER.x), vy = v.wy(VOYAGER.y);
    drawReticle(ctx, vx, vy, 40, L.prog(t, 1.1, 0.5) * v.k, [215, 225, 240], 0.75, v.gt);
    // tag up and to the left of the probe (clear of the photon's path and the captions)
    drawTag(ctx, vx - 20, vy - 22, vx - 92, vy - 112, 'VOYAGER 1', L.prog(t, 1.25, 0.6) * v.k,
      { align: 'right', sub: '24.7 billion km' });
    // light-day ring label
    const kr = L.prog(t, TA + 0.9, 0.5) * v.k;
    if (kr > 0) {
      const rr = (C * 86400) / v.cam.mpp, a = Math.atan2(VOYAGER.y, VOYAGER.x) - 0.28;
      const lx = v.wx(0) + Math.cos(a) * (rr - 12), ly = v.wy(0) + Math.sin(a) * (rr - 12);
      ctx.save();
      ctx.globalAlpha *= L.clamp(kr);
      ctx.translate(lx, ly);
      ctx.rotate(a - Math.PI / 2);
      ctx.font = L.font(20, 700, L.FONT.body);
      ctx.fillStyle = L.rgba(PHOTON_GOLD, 0.95);
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      ctx.textBaseline = 'bottom';
      L.trackedText(ctx, '1 LIGHT-DAY', 0, 0, 3, 'center');
      ctx.restore();
    }
    const tq = frameT(v);
    const r = tq < T0 ? 0 : photonR(Math.min(tq, TA));
    drawClock(ctx, v, { sec: r / C, lockAt: TA, lockLabel: 'EARTH TO VOYAGER 1' });
  },
};
