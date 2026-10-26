// Beat 5 — passing the centre at top speed. A precise reticle marks the Earth's exact centre below the faller and
// rises to meet them; at 24.4 s they cross it: a white-hot flash and a ring burst. Speed streaks stream past (driven by
// the real on-screen scroll speed, peaking at the centre). Then an instrument plate lands right of the faller: a
// speed gauge whose needle swings to 7.9 and, on "eight kilometers", "≈ 8 km/s" / "17,700 mph".
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, fallerDepth, fallerSpeed } from '../camera.js';
import { plate } from './s04-inner-core.js';

const { W, H } = L;
const CENTRE_T = 24.4;            // global: the faller passes the exact centre (camera.js waypoint)
const RET_IN = 0.55;              // beat-local: reticle draws in ("With no air to slow you")
const GAUGE_IN = 2.95;            // gauge lands just after the pass
const NUM_IN = 3.8;               // "≈ 8 km/s" on "eight kilometers a second"
const COOL = [215, 232, 255];

const STREAKS = (() => { const r = L.rng(505); return Array.from({ length: 56 }, () => ({ x: r(), y: r(), z: r(), w: r() })); })();

/** 0..1 streak envelope (global time): builds toward the centre, fades through beat 6. */
export function streakK(gt) {
  return L.smoothstep(L.prog(gt, 22.4, 1.9)) * (1 - L.smoothstep(L.prog(gt, 26.2, 3.6)));
}

/** Vertical speed streaks (screen space, drawn inside drawWorld so they get motion blur). */
export function drawStreaks(ctx, v, k) {
  if (k <= 0.01) return;
  const pxs = (fallerDepth(v.gt + 0.02) - fallerDepth(v.gt - 0.02)) / 0.04 / v.cam.mpp;   // screen px/s
  if (pxs < 30) return;
  const sc = v.cam.scroll ?? 0;
  const H2 = H + 600;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of STREAKS) {
    const par = 0.8 + s.z * 2.4;
    const len = L.clamp(pxs * par * 0.09, 20, 520);
    const y = ((((s.y * H2 - sc * par * 1.15) % H2) + H2) % H2) - 300;
    // keep a calm lane around the tunnel (the faller is the focal point)
    let x = s.x * W;
    if (Math.abs(x - v.wx(0)) < 70) x += (x < v.wx(0) ? -70 : 70);
    const a = k * (0.08 + 0.3 * s.z) * L.clamp(pxs / 400);
    // most streaks are light; every third one is a dark sliver, so they read over the white-hot core too
    const dark = s.w > 0.66;
    ctx.globalCompositeOperation = dark ? 'source-over' : 'lighter';
    const col = dark ? '70,26,8' : '255,246,228';
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.7, `rgba(${col},${dark ? a * 0.7 : a})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - (0.6 + s.w), y, 1.2 + 2 * s.w * s.z, len);
  }
  ctx.restore();
}

/** Reticle on the Earth's centre. k = draw-in 0..1, e = flash 0..1. */
function drawReticle(ctx, v, k, flashAge) {
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  if (cy < -200 || cy > H + 200 || k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.5);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = 'rgba(255,248,236,0.85)';
  ctx.lineWidth = 1.6;
  // main ring draws itself around (a dark under-stroke keeps it crisp on the white-hot core)
  ctx.strokeStyle = 'rgba(50,18,6,0.6)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,236,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e); ctx.stroke();
  // four ticks slide in
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const an = (i * Math.PI) / 2;
    const r0 = 62 + (1 - e) * 30, r1 = r0 + 22;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); ctx.stroke();
  }
  // slow dashed outer ring (rotates)
  ctx.setLineDash([3, 9]);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,240,220,0.5)';
  ctx.lineDashOffset = -v.gt * 12;
  ctx.beginPath(); ctx.arc(cx, cy, 98 * e, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,250,240,0.95)';
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  // tag, on a small dark plate (the centre is white-hot)
  const tk = L.clamp(k * 2 - 1) * L.clamp((cy - 400) / 120);
  ctx.font = L.font(20, 700, L.FONT.body);
  ctx.letterSpacing = '3px';
  const tw = ctx.measureText('EARTH’S CENTRE').width;
  ctx.letterSpacing = '0px';
  plate(ctx, cx + 117 + (1 - tk) * 10, cy - 22, tw + 26, 44, tk, 10);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,246,236,${0.95 * tk})`;
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10;
  L.trackedText(ctx, 'EARTH’S CENTRE', cx + 130 + (1 - tk) * 10, cy, 3);
  ctx.fillStyle = `rgba(255,246,236,${0.6 * tk})`;
  ctx.fillRect(cx + 86, cy - 0.5, 30 * tk, 1);
  ctx.restore();
  // the pass: flash + ring burst
  if (flashAge > -0.05 && flashAge < 1.8) {
    const a = Math.max(0, flashAge);
    const f = Math.exp(-a * 2.4) * L.clamp((flashAge + 0.05) / 0.05);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    L.lightBlob(ctx, cx, cy, 300, [255, 226, 180], 0.3 * f);
    L.lightBlob(ctx, cx, cy, 70, [255, 255, 255], 0.8 * f);
    for (let i = 0; i < 2; i++) {
      const p = L.ease.outCubic(L.clamp((a - i * 0.12) / 1.4));
      if (p <= 0) continue;
      ctx.strokeStyle = `rgba(255,240,215,${0.6 * (1 - p)})`;
      ctx.lineWidth = 2.5 - i;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, 52 + p * (420 + 160 * i)), 0, Math.PI * 2); ctx.stroke();
    }
    // horizontal anamorphic streak
    const sw = 520 * f;
    const g = ctx.createLinearGradient(cx - sw, 0, cx + sw, 0);
    g.addColorStop(0, 'rgba(255,230,200,0)'); g.addColorStop(0.5, `rgba(255,240,220,${0.35 * f})`); g.addColorStop(1, 'rgba(255,230,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - sw, cy - 1.5, sw * 2, 3);
    ctx.restore();
  }
}

/** Speed gauge: 0..10 km/s over a 252° arc; value in km/s. */
function drawGauge(ctx, cx, cy, r, k, val, accent, gt) {
  if (k <= 0) return;
  const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  const angOf = (x) => L.lerp(a0, a1, L.clamp(x / 10, -0.05, 1.05));
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.4);
  ctx.lineCap = 'round';
  // track
  ctx.strokeStyle = 'rgba(255,236,220,0.16)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, L.lerp(a0, a1, e)); ctx.stroke();
  // ticks
  for (let i = 0; i <= 20; i++) {
    const an = angOf(i / 2);
    if (an > L.lerp(a0, a1, e) + 1e-6) break;
    const major = i % 2 === 0;
    const r0 = r - 14, r1 = r - (major ? 28 : 21);
    ctx.strokeStyle = major ? 'rgba(255,240,226,0.7)' : 'rgba(255,240,226,0.32)';
    ctx.lineWidth = major ? 2 : 1.2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); ctx.stroke();
  }
  // filled value arc
  const av = angOf(val);
  if (val > 0.02) {
    L.glow(ctx, accent, 16, () => {
      ctx.strokeStyle = L.rgba(accent, 0.95);
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, av); ctx.stroke();
    }, 0.9);
  }
  // scale numerals
  ctx.font = L.font(20, 700, L.FONT.din);
  ctx.fillStyle = 'rgba(235,225,215,0.6)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const n of [0, 5, 10]) {
    const an = angOf(n);
    ctx.fillText(String(n), cx + Math.cos(an) * (r - 46), cy + Math.sin(an) * (r - 46) + 1);
  }
  // needle (with a little shake at speed)
  const jit = 0.006 * Math.sin(gt * 37) + 0.004 * Math.sin(gt * 53);
  const an = av + jit;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(255,200,150,0.8)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(cx - Math.cos(an) * 14, cy - Math.sin(an) * 14); ctx.lineTo(cx + Math.cos(an) * (r - 8), cy + Math.sin(an) * (r - 8)); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,12,10,1)';
  ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.font = L.font(17, 700, L.FONT.body);
  ctx.fillStyle = 'rgba(235,225,215,0.55)';
  L.trackedText(ctx, 'KM/S', cx, cy + 40, 3, 'center');
  ctx.restore();
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'Top speed', sub: 'Passing the centre' },
  captions: true,
  layer: 1,
  cues(d) {
    const c = CENTRE_T - 21.994;
    return [
      { t: RET_IN, name: 'blip', gain: 0.2, pitch: 0.9 },
      { t: c - 1.3, name: 'riser', gain: 0.3, pitch: 1.0 },
      { t: c - 0.12, name: 'whoosh', gain: 0.42, pitch: 0.8 },
      { t: c, name: 'impact', gain: 0.5, pitch: 0.9 },
      { t: c + 0.05, name: 'shimmer', gain: 0.24, pitch: 1.2 },
      { t: GAUGE_IN, name: 'tick', gain: 0.26, pitch: 1.1 },
      { t: GAUGE_IN + 0.2, name: 'swish', gain: 0.22, pitch: 1.3 },
      { t: NUM_IN, name: 'ping', gain: 0.3, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    const s5 = v.tl.scenes[5].start;
    if (v.gt < s5 - 0.2 || v.gt > v.tl.scenes[7].start + 1) return;
    // soft dark vignette around the reticle + faller: gives the flat, white-hot core frame some depth
    const vk = L.smoothstep(L.prog(v.gt, s5 - 0.1, 0.7)) * (1 - L.smoothstep(L.prog(v.gt, v.tl.scenes[6].start - 0.3, 0.9)));
    if (vk > 0) {
      const fy = v.wy(fallerDepth(v.gt)), ry = L.clamp(v.wy(R_EARTH), -200, H + 200);
      const vx = v.wx(0), vy = (fy + ry) / 2;
      const g = ctx.createRadialGradient(vx, vy, 240 + Math.abs(fy - ry) * 0.5, vx, vy, 1150);
      g.addColorStop(0, 'rgba(26,10,4,0)');
      g.addColorStop(1, `rgba(26,10,4,${0.26 * vk})`);
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    drawStreaks(ctx, v, streakK(v.gt));
    // leaves after the pass, and never rides up into the HUD band
    const k = L.prog(v.t, RET_IN, 0.9) * (1 - L.ease.inCubic(L.prog(v.t, 2.9, 0.6))) * L.clamp((v.wy(R_EARTH) - 330) / 160);
    drawReticle(ctx, v, k, v.gt - CENTRE_T);
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const gk = L.enter(t, GAUGE_IN, 0.6) * v.k;
    if (gk <= 0) return;
    const x = 586, y = 760, w = 370, h = 430, cx = x + w / 2, cy = y + 168;
    plate(ctx, x + (1 - L.ease.outCubic(gk)) * 24, y, w, h, gk);
    const sweep = L.ease.outBack(L.prog(t, GAUGE_IN + 0.1, 0.9), 1.4);
    drawGauge(ctx, cx, cy, 118, L.prog(t, GAUGE_IN, 0.55), (fallerSpeed(v.gt) / 1000) * sweep, v.accent, v.gt);
    const nk = L.enter(t, NUM_IN, 0.55) * v.k;
    L.bigLabel(ctx, { x: cx, y: y + 368, big: '≈ 8 km/s', small: '17,700 mph', k: nk, accent: v.accent, size: 88, align: 'center' });
  },
};
