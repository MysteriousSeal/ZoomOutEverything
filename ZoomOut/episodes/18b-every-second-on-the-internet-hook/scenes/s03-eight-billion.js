// Beat 3 — "That's over eight billion questions a day. | And the strangest number comes last."
// The camera pulls back over the nightstand: the BED (drawn here for the whole film, plan frame at env's BED) comes in
// beside it. A thin 24-hour dial lies on the floor around the nightstand; its sweep runs a full day while the searches
// from s02 are caught in its band as fine points of light, so the ring fills with a day of questions. Label 8 billion+.
// On "And the strangest number comes last" the dial calms and a small locked "?" tag appears, then parks top-left
// (s04 keeps it parked through "Zoom out") as the open loop.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, BED, withPlan, planK } from '../env.js';
import { phraseAt, wordTime } from './s01-one-phone.js';

const { W, H } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ the bed (plan metres)
const THROW = (() => {
  // a wool throw draped across the foot of the bed, a little askew and rumpled: a wavy band + soft ridges along it
  const x0 = BED.x0 - 0.06, x1 = BED.x1 + 0.07, ya = 1.2, yb = 1.62, n = 24;
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = L.lerp(x0, x1, u);
    top.push([x, ya - 0.06 * u + 0.025 * Math.sin(u * 9 + 1) + 0.012 * Math.sin(u * 23)]);
    bot.push([x, yb + 0.05 * u + 0.03 * Math.sin(u * 7 + 2) + 0.01 * Math.sin(u * 19 + 1)]);
  }
  const ridges = [0.3, 0.52, 0.74].map((f, k) => Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return [L.lerp(x0 + 0.08, x1 - 0.08, u), L.lerp(top[i][1], bot[i][1], f) + 0.018 * Math.sin(u * (11 + k * 3) + k)];
  }));
  return { pts: [...top, ...bot.reverse()], ridges };
})();
const DUVET_FOLDS = (() => {
  const r = L.rng(311);
  return Array.from({ length: 9 }, () => {
    const y = 0.55 + r() * 1.1, x0 = BED.x0 + 0.05 + r() * 0.5, x1 = x0 + 0.4 + r() * 0.7;
    return [x0, y, x1, y + (r() - 0.5) * 0.2, (r() - 0.5) * 0.1, r()];
  });
})();

function drawBed(c, v) {
  const k = planK(v) * (1 - L.smoothstep(L.clamp(L.invLerp(Math.log(0.6), Math.log(1.2), Math.log(v.cam.mpp)))));
  if (k <= 0.01) return;
  // cull when the bed is off screen (the bed is within ~2.2 m of the phone)
  const rpx = v.ws(2.4);
  const ox = v.wx(0), oy = v.wy(0);
  if (ox + rpx < 0 || ox - rpx > W || oy + rpx < 0 || oy - rpx > H) return;
  const detail = v.ws(BED.x1 - BED.x0) > 120;
  withPlan(c, v, (c, mpp) => {
    c.globalAlpha = k;
    const B = BED;
    // the frame's shadow on the floor
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.65)';
    c.shadowBlur = Math.min(90, 0.12 / mpp);
    c.fillStyle = '#16171b';
    L.roundRect(c, B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, 0.04); c.fill();
    c.restore();
    // headboard (upholstered) on the north wall
    c.fillStyle = '#23252c';
    L.roundRect(c, B.x0 - 0.03, B.y0 - 0.02, B.x1 - B.x0 + 0.06, 0.1, 0.03); c.fill();
    if (detail) {
      c.strokeStyle = 'rgba(70,74,86,0.5)';
      c.lineWidth = Math.max(0.004, 1 * mpp);
      c.beginPath();
      for (let x = B.x0 + 0.12; x < B.x1; x += 0.16) { c.moveTo(x, B.y0 - 0.01); c.lineTo(x, B.y0 + 0.07); }
      c.stroke();
    }
    // mattress / fitted sheet
    const mx0 = B.x0 + 0.03, mx1 = B.x1 - 0.03, my0 = B.y0 + 0.09, my1 = B.y1 - 0.02;
    c.fillStyle = '#54595f';
    L.roundRect(c, mx0, my0, mx1 - mx0, my1 - my0, 0.05); c.fill();
    // pillows
    for (const [px, rot] of [[mx0 + 0.04, -0.04], [mx0 + 0.78, 0.05]]) {
      c.save();
      c.translate(px + 0.35, my0 + 0.2);
      c.rotate(rot);
      const pg = c.createRadialGradient(-0.05, -0.04, 0.02, 0, 0, 0.4);
      pg.addColorStop(0, '#9da2ab');
      pg.addColorStop(1, '#60656e');
      c.fillStyle = pg;
      L.roundRect(c, -0.35, -0.16, 0.7, 0.32, 0.1); c.fill();
      // a soft highlight along the top of the pillow, and a warm rim on the edge toward the lamp-lit phone side
      const hg = c.createLinearGradient(0, -0.16, 0, 0.05);
      hg.addColorStop(0, 'rgba(225,230,238,0.32)');
      hg.addColorStop(1, 'rgba(225,230,238,0)');
      c.fillStyle = hg;
      L.roundRect(c, -0.33, -0.15, 0.66, 0.2, 0.09); c.fill();
      const rg = c.createLinearGradient(-0.35, 0, 0.35, 0);
      rg.addColorStop(0, 'rgba(255,205,150,0.55)');
      rg.addColorStop(0.45, 'rgba(255,205,150,0.12)');
      rg.addColorStop(1, 'rgba(160,190,230,0.22)');
      c.strokeStyle = rg;
      c.lineWidth = Math.max(0.008, 1.6 * mpp);
      L.roundRect(c, -0.35, -0.16, 0.7, 0.32, 0.1); c.stroke();
      if (detail) {
        c.strokeStyle = 'rgba(40,43,50,0.35)';
        c.lineWidth = Math.max(0.004, 1.2 * mpp);
        c.beginPath(); c.moveTo(-0.2, 0.02); c.quadraticCurveTo(0, -0.04, 0.22, 0.03); c.stroke();
      }
      c.restore();
    }
    // duvet, folded back below the pillows
    const dy0 = my0 + 0.46;
    const dg = c.createLinearGradient(mx0, dy0, mx1, my1);
    dg.addColorStop(0, '#3b4455');
    dg.addColorStop(1, '#2b3240');
    c.fillStyle = dg;
    c.beginPath();
    c.moveTo(mx0 - 0.02, dy0);
    c.bezierCurveTo(mx0 + 0.5, dy0 + 0.05, mx1 - 0.5, dy0 - 0.04, mx1 + 0.02, dy0 + 0.02);
    c.lineTo(mx1 + 0.04, my1 + 0.03);
    c.lineTo(mx0 - 0.04, my1 + 0.03);
    c.closePath();
    c.fill();
    // the folded-back sheet edge
    c.fillStyle = '#6d727b';
    c.beginPath();
    c.moveTo(mx0 - 0.02, dy0);
    c.bezierCurveTo(mx0 + 0.5, dy0 + 0.05, mx1 - 0.5, dy0 - 0.04, mx1 + 0.02, dy0 + 0.02);
    c.lineTo(mx1 + 0.02, dy0 + 0.1);
    c.bezierCurveTo(mx1 - 0.5, dy0 + 0.06, mx0 + 0.5, dy0 + 0.15, mx0 - 0.02, dy0 + 0.1);
    c.closePath();
    c.fill();
    // the duvet's quilted seam (inset from its edge) and one clear fold across it
    {
      const sx0 = mx0 + 0.09, sx1 = mx1 - 0.09, sy0 = dy0 + 0.2, sy1 = my1 - 0.08;
      c.strokeStyle = 'rgba(150,162,184,0.3)';
      c.lineWidth = Math.max(0.006, 1.1 * mpp);
      c.setLineDash([0.035, 0.025]);
      c.beginPath();
      c.moveTo(sx0, sy0); c.lineTo(sx0, sy1); c.lineTo(sx1, sy1); c.lineTo(sx1, sy0);
      c.moveTo((sx0 + sx1) / 2, sy0); c.lineTo((sx0 + sx1) / 2, sy1);
      c.stroke();
      c.setLineDash([]);
      const fy = dy0 + 0.62;
      for (const [col, wd, off] of [['rgba(4,6,12,0.55)', 0.035, 0.016], ['rgba(160,172,196,0.32)', 0.014, -0.012]]) {
        c.strokeStyle = col;
        c.lineWidth = wd;
        c.beginPath();
        c.moveTo(mx0 - 0.03, fy + off);
        c.bezierCurveTo(mx0 + 0.45, fy - 0.05 + off, mx1 - 0.55, fy + 0.07 + off, mx1 + 0.03, fy + 0.02 + off);
        c.stroke();
      }
    }
    if (detail) {
      // soft folds in the duvet
      for (const [x0, y0, x1, y1, bend, h] of DUVET_FOLDS) {
        c.strokeStyle = h > 0.5 ? 'rgba(90,100,120,0.18)' : 'rgba(5,7,12,0.3)';
        c.lineWidth = 0.025;
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + bend, x1, y1); c.stroke();
      }
    }
    // the throw: muted oatmeal wool draped across the foot
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)';
    c.shadowBlur = Math.min(40, 0.04 / mpp);
    c.fillStyle = '#5a4a3b';
    c.beginPath();
    THROW.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
    c.restore();
    if (detail) {
      c.lineCap = 'round';
      for (const rd of THROW.ridges) {
        for (const [col, wd, dy] of [['rgba(20,13,8,0.4)', 0.03, 0.012], ['rgba(190,160,125,0.22)', 0.014, -0.008]]) {
          c.strokeStyle = col;
          c.lineWidth = wd;
          c.beginPath();
          rd.forEach(([x, y], i) => (i ? c.lineTo(x, y + dy) : c.moveTo(x, y + dy)));
          c.stroke();
        }
      }
    }
    // night shading: the far side of the bed falls into darkness; the phone's cool light grazes the near corner
    const sh = c.createLinearGradient(B.x0, 0, B.x1, 0);
    sh.addColorStop(0, 'rgba(4,6,12,0.15)');
    sh.addColorStop(1, 'rgba(4,6,12,0.55)');
    c.fillStyle = sh;
    L.roundRect(c, B.x0 - 0.04, B.y0 - 0.03, B.x1 - B.x0 + 0.08, B.y1 - B.y0 + 0.06, 0.04); c.fill();
  });
}

// ------------------------------------------------------------------ the 24-hour dial (world metres around the phone)
const DIAL = 0.47;
const SWEEP0 = (tl) => tl.scenes[3].start + 0.35;
const SWEEP1 = (tl) => wordTime(tl, 3, 'day') + 0.3;
const sweepAt = (v) => L.ease.inOutCubic(L.prog(v.gt, SWEEP0(v.tl), SWEEP1(v.tl) - SWEEP0(v.tl)));
const DOTS = (() => {
  const r = L.rng(333), out = [];
  for (let i = 0; i < 900; i++) out.push({ a: (i + r()) / 900, d: (r() + r() - 1) * 0.03, b: r(), ph: r() * 50 });
  return out;
})();

function dialK(v) {
  const tl = v.tl, gt = v.gt;
  const inK = L.ease.outCubic(L.prog(gt, tl.scenes[3].start + 0.1, 0.7));
  const calm = 1 - 0.55 * L.ease.inOutCubic(L.prog(gt, phraseAt(tl, 3, 1) - 0.1, 0.8));
  const out = 1 - L.ease.inCubic(L.prog(gt, tl.scenes[4].start + 0.1, 0.8));
  return inK * calm * out;
}

function drawDial(c, v) {
  const k = dialK(v);
  if (k <= 0.005) return;
  const x = v.wx(0), y = v.wy(0), r = v.ws(DIAL);
  if (r < 30 || r > 4000) return;
  const p = sweepAt(v);
  const a0 = -Math.PI / 2, ah = a0 + p * TAU;
  c.save();
  // faint disc so the dial reads as one object on the floor
  const dg = c.createRadialGradient(x, y, r * 0.6, x, y, r * 1.15);
  dg.addColorStop(0, 'rgba(10,20,40,0)');
  dg.addColorStop(0.75, `rgba(10,24,52,${0.22 * k})`);
  dg.addColorStop(1, 'rgba(10,20,40,0)');
  c.fillStyle = dg;
  c.beginPath(); c.arc(x, y, Math.max(0, r * 1.15), 0, TAU); c.fill();
  // track
  c.strokeStyle = `rgba(150,190,240,${0.22 * k})`;
  c.lineWidth = 1.2;
  c.beginPath(); c.arc(x, y, Math.max(0, r - v.ws(0.04)), 0, TAU); c.stroke();
  c.beginPath(); c.arc(x, y, Math.max(0, r + v.ws(0.04)), 0, TAU); c.stroke();
  // 96 quarter-hour ticks, 24 hour ticks, staggered draw-on clockwise
  c.beginPath();
  for (let i = 0; i < 96; i++) {
    const ik = L.clamp(L.prog(v.gt, v.tl.scenes[3].start + 0.15 + i * 0.006, 0.3));
    if (ik <= 0) continue;
    const a = a0 + (i / 96) * TAU, major = i % 4 === 0, six = i % 24 === 0;
    const r0 = r + v.ws(0.05), r1 = r0 + (six ? 16 : major ? 10 : 4) * ik;
    c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
  }
  c.strokeStyle = `rgba(185,210,240,${0.5 * k})`;
  c.lineWidth = 1.4;
  c.stroke();
  // hour labels at 00 / 06 / 12 / 18
  c.font = L.font(17, 600, L.FONT.body);
  c.fillStyle = `rgba(190,208,232,${0.7 * k})`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  ['', '06:00', '12:00', '18:00'].forEach((s, i) => {
    if (!s) return;   // the sweep itself marks midnight at the top
    const a = a0 + (i / 4) * TAU, rr = r - v.ws(0.05) - 30;
    const lx = x + Math.cos(a) * rr, ly = y + Math.sin(a) * rr;
    if (lx > 40 && lx < W - 40) L.trackedText(c, s, lx, ly, 1, 'center');
  });
  // the day of searches: points of light caught in the band behind the sweep
  c.globalCompositeOperation = 'lighter';
  // clear space around the open-loop tag while it sits over the dial's top arc (before it parks)
  const LT = loopTimes(v.tl);
  const tagK = L.ease.outCubic(L.prog(v.gt, LT.in - 0.1, 0.5)) * (1 - L.ease.inOutCubic(L.prog(v.gt, LT.park, 0.5)));
  for (const d of DOTS) {
    const lag = p - d.a;
    if (lag <= 0) continue;
    const a = a0 + d.a * TAU, rr = r + v.ws(d.d);
    let tm = 1;
    if (tagK > 0) {
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      const dx = Math.max(TAG_RECT.x0 - px, 0, px - TAG_RECT.x1), dy = Math.max(TAG_RECT.y0 - py, 0, py - TAG_RECT.y1);
      tm = 1 - tagK * (1 - L.smoothstep(L.clamp(Math.hypot(dx, dy) / 40)));
      if (tm <= 0.01) continue;
    }
    const fresh = Math.exp(-lag * 9);
    const tw = 0.6 + 0.4 * Math.sin(v.gt * 3 + d.ph);
    const al = tm * k * (0.5 + 0.5 * d.b * tw + 0.6 * fresh);
    const sz = 1.7 + 1.4 * d.b + 2 * fresh;
    c.fillStyle = L.rgba(L.mix([90, 165, 255], [230, 242, 255], d.b * 0.6 + fresh * 0.4), Math.min(1, al));
    c.fillRect(x + Math.cos(a) * rr - sz / 2, y + Math.sin(a) * rr - sz / 2, sz, sz);
  }
  // swept arc glow
  if (p > 0) {
    c.lineCap = 'round';
    c.strokeStyle = L.rgba(ACCENT, 0.16 * k);
    c.lineWidth = v.ws(0.07);
    c.beginPath(); c.arc(x, y, Math.max(0, r), a0, ah); c.stroke();
    // feeder streaks: searches flying from the phone to the head
    const hk = k * (1 - L.prog(v.gt, SWEEP1(v.tl), 0.4));
    if (hk > 0.01) {
      for (let i = 0; i < 14; i++) {
        const ph = ((v.gt * 1.9 + i / 14) % 1);
        const aa = ah - 0.05 - 0.22 * ((i * 0.618) % 1);
        const d0 = v.ws(0.06) + (r - v.ws(0.06)) * L.ease.inCubic(Math.max(0, ph - 0.25) / 0.75), d1 = v.ws(0.06) + (r - v.ws(0.06)) * L.ease.inCubic(ph);
        c.strokeStyle = L.rgba([150, 205, 255], 0.55 * hk * Math.sin(Math.PI * ph));
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(x + Math.cos(aa) * d0, y + Math.sin(aa) * d0);
        c.lineTo(x + Math.cos(aa) * d1, y + Math.sin(aa) * d1);
        c.stroke();
      }
      const hx = x + Math.cos(ah) * r, hy = y + Math.sin(ah) * r;
      L.lightBlob(c, hx, hy, 46, ACCENT, 0.7 * hk);
      L.lightBlob(c, hx, hy, 12, [240, 248, 255], 0.95 * hk);
      // the hand
      c.strokeStyle = L.rgba([170, 210, 255], 0.35 * hk);
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x + Math.cos(ah) * v.ws(0.09), y + Math.sin(ah) * v.ws(0.09)); c.lineTo(hx, hy); c.stroke();
    }
    // the day completes: one pulse round the whole ring
    const q = L.prog(v.gt, SWEEP1(v.tl), 1.0);
    if (q > 0 && q < 1) {
      const e = L.ease.outCubic(q);
      c.strokeStyle = L.rgba(ACCENT, 0.6 * (1 - e) * k);
      c.lineWidth = 3 + 8 * (1 - e);
      c.beginPath(); c.arc(x, y, Math.max(0, r * (1 + 0.18 * e)), 0, TAU); c.stroke();
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ the open-loop tag
/** Screen rect of the tag before it parks (x 96, centred on y 628, ~430 px wide, 52 px tall). */
const TAG_RECT = { x0: 96, y0: 602, x1: 530, y1: 654 };
/** A small locked "?" tag. park 0 = under the label, 1 = parked top-left under the chapter card. */
export function drawLoopTag(c, k, park, gt) {
  if (k <= 0) return;
  const e = L.ease.inOutCubic(L.clamp(park));
  const x = L.lerp(96, 64, e), y = L.lerp(628, 330, e), sc = L.lerp(1, 0.78, e);
  c.save();
  c.translate(x, y);
  c.scale(sc, sc);
  c.globalAlpha = k;
  const h = 52;
  c.font = L.font(21, 600, L.FONT.body);
  c.letterSpacing = '4px';
  const label = 'THE STRANGEST NUMBER';
  const tw = c.measureText(label).width - 4;
  c.letterSpacing = '0px';
  const w = h + 18 + tw + 22;
  // a soft dark backing: whatever lies under the tag (the dial's top arc) falls away around its edges
  c.save();
  c.shadowColor = 'rgba(2,4,9,0.95)';
  c.shadowBlur = 26;
  c.fillStyle = 'rgba(3,6,12,0.9)';
  L.roundRect(c, 0, -h / 2, w, h, h / 2); c.fill();
  c.restore();
  c.fillStyle = 'rgba(6,12,24,0.78)';
  L.roundRect(c, 0, -h / 2, w, h, h / 2); c.fill();
  c.strokeStyle = L.rgba(ACCENT, 0.55);
  c.lineWidth = 1.5;
  c.stroke();
  // accent disc with a "?" and a small padlock shackle on top
  const cx = h / 2, cy = 0;
  c.fillStyle = L.rgba(ACCENT, 0.95);
  c.beginPath(); c.arc(cx, cy, Math.max(0, h / 2 - 7), 0, TAU); c.fill();
  c.fillStyle = 'rgb(6,12,24)';
  c.font = L.font(28, 800, L.FONT.display);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('?', cx, cy + 2);
  // a breathing glow
  const br = 0.5 + 0.5 * Math.sin(gt * 3.2);
  L.lightBlob(c, cx, cy, 34, ACCENT, 0.18 + 0.12 * br);
  c.textAlign = 'left';
  c.fillStyle = 'rgba(214,224,238,0.92)';
  c.font = L.font(21, 600, L.FONT.body);
  L.trackedText(c, label, h + 14, 1, 4, 'left');
  c.restore();
}

export const loopTimes = (tl) => ({ in: wordTime(tl, 3, 'strangest') - 0.1, park: phraseAt(tl, 3, 1, 'end') - 0.05 });

export default {
  beat: 3,
  chapter: { num: '03', title: 'One day', sub: 'Every question, every day' },
  captions: true,
  layer: -1,     // the bed and the dial lie on the floor: under s00's darkness and the phone
  cues(d) {
    return [
      { t: 0.3, name: 'swell', gain: 0.16, pitch: 0.9 },          // the dial sweeps a day
      { t: 0.68, name: 'impact', gain: 0.32, pitch: 0.85 },        // "eight billion"
      { t: 0.72, name: 'count', gain: 0.18, pitch: 1.0 },
      { t: 2.3, name: 'bloom', gain: 0.2, pitch: 1.0 },            // the day completes
      { t: 3.28, name: 'sonar', gain: 0.2, pitch: 0.8 },           // "strangest number": the tag
      { t: 4.55, name: 'blip', gain: 0.16, pitch: 1.2 },           // it parks
    ];
  },
  drawWorld(ctx, v) {
    drawBed(ctx, v);
    if (v.gt > v.tl.scenes[3].start - 0.2 && v.gt < v.tl.scenes[4].end) drawDial(ctx, v);
  },
  drawOverlay(ctx, v) {
    const tl = v.tl;
    const T = loopTimes(tl);
    // the number lands on "eight billion"; when the tag arrives it clears in one clean 0.5 s fade (no half-dimmed
    // label sitting on screen for a second), well before the tag's park move carries it up through the label
    const lk = v.k * L.prog(v.gt, wordTime(tl, 3, 'eight') - 0.05, 0.5);
    const dim = 1 - L.ease.inOutCubic(L.prog(v.gt, T.in, 0.5));
    if (lk > 0 && dim > 0.001) {
      const g = ctx.createRadialGradient(250, 480, 20, 250, 480, 420);
      g.addColorStop(0, `rgba(2,4,9,${0.45 * lk * Math.min(1, dim * 2)})`);
      g.addColorStop(1, 'rgba(2,4,9,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 200, 700, 600);
      ctx.save();
      ctx.globalAlpha = dim;
      L.bigLabel(ctx, { x: 96, y: 520, big: '8 billion+', small: 'searches a day', k: lk, accent: ACCENT });
      ctx.restore();
    }
    // NOT scaled by v.k: the parked tag crosses the cut into beat 4 (s04 draws it on), and v.k's fade-out here plus
    // s04's fade-in there made it dip to half strength for ~0.5 s around the cut
    const tk = L.ease.outCubic(L.prog(v.gt, T.in, 0.5));
    if (v.gt < tl.scenes[4].start) drawLoopTag(ctx, tk, L.prog(v.gt, T.park, 0.7), v.gt);
  },
};
