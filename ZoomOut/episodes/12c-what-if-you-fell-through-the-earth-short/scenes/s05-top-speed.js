// Beat 4 (12c) — "You'd pass the center | at about eight kilometers a second." The faller plunges through the white-hot
// inner core (drawn here since 12c has no inner-core beat: crystal + boundary flash at camera.js ICB_IN, just before
// this beat). A precise reticle marks the Earth's exact centre below the faller and rises to meet them; at CENTRE_T
// (on "center") they cross it: a white-hot flash and a ring burst. Speed streaks stream past (driven by
// the real on-screen scroll speed, peaking at the centre). Then an instrument plate lands right of the faller: a
// speed gauge whose needle swings to 7.9 and, on "eight kilometers", "≈ 8 km/s" / "17,700 mph".
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, RADIUS, fallerDepth, fallerSpeed, BS, PH, CENTRE_T, ICB_IN } from '../camera.js';
import { plate, group, cardIn, cardOut, drawCrystal, boundaryFlash } from './lib-core.js';

const { W, H } = L;
const BEAT = 4;
const C_LOC = CENTRE_T - BS[BEAT];              // beat-local: the pass (on "center")
const RET_IN = C_LOC - 1.3;   // f12cv: the reticle starts late in beat 3 (drawWorld runs every frame) so its tag reads ≥ 1 s before the pass
const GAUGE_IN = PH(BEAT, 1).start - BS[BEAT] - 0.1;              // gauge lands with "at about..."
const NUM_IN = PH(BEAT, 1).start - BS[BEAT] + 0.38;               // "≈ 8 km/s" on "eight kilometers a second"
const COOL = [215, 232, 255];

const STREAKS = (() => { const r = L.rng(505); return Array.from({ length: 56 }, () => ({ x: r(), y: r(), z: r(), w: r() })); })();

/** 0..1 streak envelope (global time): builds toward the centre, fades through the bullet beat. */
export function streakK(gt) {
  return L.smoothstep(L.prog(gt, CENTRE_T - 2.0, 1.9)) * (1 - L.smoothstep(L.prog(gt, CENTRE_T + 1.8, 3.6)));
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
function drawReticle(ctx, v, k, flashAge, tagK = 1) {
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
  ctx.restore();
  // tag, on a small dark plate (the center is white-hot). 12b f12a: 26 px, "center" (US spelling, as the captions),
  // and plate + text fade as one image, early and fast (the plate used to outlive its text as an empty pill)
  const tk = L.clamp((k - 0.15) / 0.3) * tagK;   // lands early: readable for ≥ 1 s before the pass
  if (tk > 0) {
    group(ctx, tk, (c) => {
      c.font = L.font(26, 700, L.FONT.body);
      c.letterSpacing = '2px';
      const tw = c.measureText('EARTH’S CENTER').width;
      c.letterSpacing = '0px';
      const px = cx + 117 + (1 - tk) * 10;
      plate(c, px, cy - 27, tw + 30, 54, 1, 12, 0.94);   // near-opaque: the core behind is white-hot
      c.textBaseline = 'middle';
      c.fillStyle = 'rgba(255,246,236,0.97)';
      L.trackedText(c, 'EARTH’S CENTER', px + 15, cy + 1, 2);
      c.fillStyle = 'rgba(255,246,236,0.6)';
      c.fillRect(cx + 86, cy - 0.5, 30, 1);
    });
  }
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
  // no fade: the dial is there from the card's first frame (an empty plate never shows); only the arc sweeps in
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
  ctx.font = L.font(26, 700, L.FONT.din);
  ctx.fillStyle = 'rgba(240,230,220,0.8)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const n of [0, 5, 10]) {
    const an = angOf(n);
    ctx.fillText(String(n), cx + Math.cos(an) * (r - 50), cy + Math.sin(an) * (r - 50) + 1);
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
  ctx.font = L.font(26, 700, L.FONT.body);
  ctx.fillStyle = 'rgba(240,230,220,0.75)';
  L.trackedText(ctx, 'KM/S', cx, cy + 48, 2, 'center');
  ctx.restore();
}

export default {
  beat: BEAT,
  chapter: { num: '04', title: 'Top speed', sub: 'Passing the center' },
  captions: true,
  layer: 1,
  cues(d) {
    const c = C_LOC;
    const icb = ICB_IN - BS[BEAT];   // just before this beat: entering the inner core (12b's s04 cues)
    return [
      { t: icb - 0.04, name: 'deep', gain: 0.4, pitch: 0.9 },
      { t: icb, name: 'shimmer', gain: 0.26, pitch: 1.1 },
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
    // the solid inner core (12b's s04): the grain shows as the ball rises into view, strongest while we're inside it
    const s3 = v.tl.scenes[3].start;
    if (v.gt > s3 + 1.5 && v.gt < v.tl.scenes[7].start + 1) {
      const a = L.ease.inOutCubic(L.prog(v.gt, s3 + 1.5, 2.2)) * (1 - L.prog(v.gt, v.tl.scenes[6].start, 1.2));
      drawCrystal(ctx, v, a);
      boundaryFlash(ctx, v, RADIUS.icb, v.gt - ICB_IN);
    }
    const s5 = v.tl.scenes[BEAT].start;
    if (v.gt < s5 + RET_IN - 0.2 || v.gt > v.tl.scenes[6].start + 1) return;
    // soft dark vignette around the reticle + faller: gives the flat, white-hot core frame some depth
    const vk = L.smoothstep(L.prog(v.gt, s5 + RET_IN - 0.1, 0.7)) * (1 - L.smoothstep(L.prog(v.gt, v.tl.scenes[5].start - 0.3, 0.9)));
    if (vk > 0) {
      const fy = v.wy(fallerDepth(v.gt)), ry = L.clamp(v.wy(R_EARTH), -200, H + 200);
      const vx = v.wx(0), vy = (fy + ry) / 2;
      const g = ctx.createRadialGradient(vx, vy, 240 + Math.abs(fy - ry) * 0.5, vx, vy, 1150);
      g.addColorStop(0, 'rgba(96,32,6,0)');
      g.addColorStop(1, `rgba(90,30,6,${0.32 * vk})`);   // 12b f12a: ember brown (near-black read olive on the core)
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    drawStreaks(ctx, v, streakK(v.gt));
    // leaves after the pass, and never rides up into the HUD band
    // 12b f12a: fully gone before its outer ring (r 98) can reach the HUD band; the tag leaves first, quickly
    const k = L.prog(v.t, RET_IN, 0.9) * (1 - L.ease.inCubic(L.prog(v.t, C_LOC + 0.5, 0.6))) * L.clamp((v.wy(R_EARTH) - 520) / 140);
    const tagK = (1 - L.ease.inOutCubic(L.prog(v.t, C_LOC + 0.3, 0.25))) * L.clamp((v.wy(R_EARTH) - 400) / 60);
    drawReticle(ctx, v, k, v.gt - CENTRE_T, tagK);
  },

  drawOverlay(ctx, v) {
    // 12b f12a: the instrument card is opaque from its first frame (scale + lift only) and fades as one image
    const t = v.t;
    const kin = cardIn(v, GAUGE_IN, 0.5);
    if (kin < 0) return;
    const x = 586, y = 660, w = 370, h = 430, cx = x + w / 2, cy = y + 168;
    group(ctx, cardOut(v), (c) => {
      const sc = 0.96 + 0.04 * kin;
      c.translate(x + w / 2, y + h / 2 + (1 - kin) * 24); c.scale(sc, sc); c.translate(-(x + w / 2), -(y + h / 2));
      plate(c, x, y, w, h, 1);
      const sweep = L.ease.outBack(L.prog(t, GAUGE_IN + 0.1, 0.9), 1.4);
      drawGauge(c, cx, cy, 118, Math.max(0.02, L.prog(t, GAUGE_IN, 0.4)), (fallerSpeed(v.gt) / 1000) * sweep, v.accent, v.gt);
      L.bigLabel(c, { x: cx, y: y + 368, big: '≈ 8 km/s', small: '17,700 mph', k: L.enter(t, NUM_IN, 0.55), accent: v.accent, size: 88, align: 'center' });
    });
  },
};
