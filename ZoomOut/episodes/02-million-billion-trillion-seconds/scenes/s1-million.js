// Beat 1 — one million seconds = 11.6 days.
// A gold measuring tape draws down from NOW while the camera zooms out (minutes → hours → days). A rolling
// seconds counter rides the glowing head, races to 1,000,000 and settles as the label's small line under
// "11.6 days". On "a short vacation" a suitcase and a tear-off calendar (flipping to day 12) slide in.
// In beat 2 the whole thing is compressed into a sliver at NOW: the icons shrink into the span, and the
// label rides up with the span's end and parks as a small "11.6 DAYS · 1,000,000 S" tag above NOW.
//
// This file also exports the shared span / counter helpers used by s0 and s2 (same owner).
import * as L from '../../../../engine/runtime/lib.js';
import { at } from '../camera.js';
import { ACCENT, SPINE_X, NOW_Y } from '../env.js';

const { H } = L;
export const LANE_X = SPINE_X + 32;          // the measuring-tape lane, right of the spine
export const KEY_PX = 750;                   // a key span fills ~750 px once its zoom lands
export const MILLION = 1e6;
export const KEY1 = MILLION / KEY_PX;        // camera mpp at the end of the beat-1 zoom
export const WARM = [240, 230, 210];
export const GREYW = [190, 185, 175];
const GOLD = ACCENT;
const HOT = [255, 238, 190];
const LABEL_X = 300;

// ------------------------------------------------------------------ shared: the measuring-tape span
/**
 * A gold span from NOW down to `s` seconds ago. `head` 0..1 = glowing draw head; `done` 0..1 = settled look
 * (end cap, fuller gradient). Collapses to a glowing tick when shorter than a few pixels.
 */
export function drawSpan(c, v, s, { lane = LANE_X, w = 14, alpha = 1, head = 0, done = 0 } = {}) {
  if (s <= 0 || alpha <= 0) return;
  const y0 = v.wy(0), y1 = v.wy(s), len = y1 - y0;
  c.save();
  if (len < 4) {
    // sliver: a short bright tick that keeps glowing at NOW
    L.lightBlob(c, lane, y0 + len, 22, GOLD, 0.4 * alpha);
    c.fillStyle = L.rgba(HOT, 0.95 * alpha);
    c.fillRect(lane - w / 2 - 4, y0 + len - 1.5, w + 8, 3);
    c.restore();
    return;
  }
  const yb = Math.min(y1, H + 60);
  // trailing gradient: faint at NOW, full at the head
  const g = c.createLinearGradient(0, y0, 0, y1);
  const tail = L.lerp(0.22, 0.6, done);
  g.addColorStop(0, L.rgba(GOLD, tail * alpha));
  g.addColorStop(L.clamp(1 - 160 / len, 0.05, 0.95), L.rgba(GOLD, L.lerp(0.75, 0.88, done) * alpha));
  g.addColorStop(1, L.rgba(L.mix(GOLD, HOT, 0.5 * (1 - done)), alpha));
  // soft bloom under the bar
  L.glow(c, GOLD, 26, () => {
    c.fillStyle = g;
    L.roundRect(c, lane - w / 2, y0, w, yb - y0, Math.min(w / 2, len / 2));
    c.fill();
  }, 0.35 * alpha);
  c.fillStyle = g;
  L.roundRect(c, lane - w / 2, y0, w, yb - y0, Math.min(w / 2, len / 2));
  c.fill();
  // specular stripe for a bit of material
  c.fillStyle = L.rgba(HOT, 0.35 * alpha);
  c.fillRect(lane - w / 2 + 2, y0 + 2, 2, Math.max(0, yb - y0 - 4));
  if (y1 < H + 60) {
    // settled end cap
    if (done > 0) {
      c.fillStyle = L.rgba(GOLD, 0.9 * alpha * done);
      c.fillRect(lane - w / 2 - 8, y1 - 1.5, (w + 30) * L.ease.outCubic(done), 3);
    }
    // glowing head
    if (head > 0) {
      L.lightBlob(c, lane, y1, 90, GOLD, 0.5 * head * alpha);
      L.lightBlob(c, lane, y1, 26, HOT, 0.9 * head * alpha);
      c.fillStyle = L.rgba(HOT, head * alpha);
      c.fillRect(lane - 18, y1 - 2, 36, 4);
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ shared: rolling-digit counter
/**
 * Odometer counter, left-aligned at (x, baseline y). Digits roll upward; slow rates roll briefly between
 * values, fast rates blur continuously. Leading zeros are dimmed. Returns the drawn width (with unit).
 */
export function drawCounter(c, { x, y, value, rate = 1, digits = 7, size = 100, alpha = 1, color = WARM,
  unit = 'SECONDS', unitSize = 26, unitAlpha = 0.8, lead = 0.2, gold = 0, unitGap = null, unitInline = false }) {
  if (alpha <= 0) return 0;
  c.save();
  c.font = L.font(size, 700, L.FONT.din);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  const dw = c.measureText('0').width, cw = c.measureText(',').width;
  const step = size * 0.86;
  const lit = (i) => (i === 0 ? 1 : L.lerp(lead, 1, L.clamp((value / 10 ** i - 0.9) / 0.1)));
  const col = L.mix(color, GOLD, gold);
  let cx = x;
  const cells = [];
  for (let i = digits - 1; i >= 0; i--) {
    cells.push({ i, x: cx });
    cx += dw;
    if (i > 0 && i % 3 === 0) { cells.push({ comma: true, i, x: cx }); cx += cw; }
  }
  const total = cx - x;
  // odometer carry: digit 0 rolls on its own window; a higher digit rolls only while every lower digit is a 9
  // rolling over, so the display never reads past the true value (no '1,009,453' on the way to 1,000,000)
  const rolls = [];
  {
    const wv = Math.min(1, Math.max(0.3, Math.abs(rate) * 0.1));
    const f0 = value - Math.floor(value);
    rolls[0] = L.ease.inOutCubic(L.clamp((f0 - (1 - wv)) / wv));
    for (let i = 1; i < digits; i++) rolls[i] = Math.floor(value / 10 ** (i - 1)) % 10 === 9 ? rolls[i - 1] : 0;
  }
  if (gold > 0) L.lightBlob(c, x + total / 2, y - size * 0.35, total * 0.7, GOLD, 0.18 * gold * alpha);
  c.save();
  c.beginPath();
  c.rect(x - 6, y - size * 0.8, total + 12, size * 0.92);
  c.clip();
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = 14;
  for (const cell of cells) {
    const a = lit(cell.i) * alpha;
    if (cell.comma) { c.fillStyle = L.rgba(col, a); c.fillText(',', cell.x, y); continue; }
    const pos = (Math.floor(value / 10 ** cell.i) % 10) + rolls[cell.i];
    const d0 = Math.floor(pos) % 10, o = pos - Math.floor(pos);
    c.fillStyle = L.rgba(col, a * (1 - 0.6 * o));
    c.fillText(String(d0), cell.x, y - o * step);
    if (o > 0.001) {
      c.fillStyle = L.rgba(col, a * (0.4 + 0.6 * o));
      c.fillText(String((d0 + 1) % 10), cell.x, y + (1 - o) * step);
    }
  }
  c.restore();
  let wTot = total;
  if (unit) {
    const gap = unitGap ?? unitSize * 0.6;
    if (unitInline) {
      // same numeral face as the digits, set tight: reads as one tag ("1,000,000 s")
      c.font = L.font(unitSize, 700, L.FONT.din);
      c.fillStyle = L.rgba(col, unitAlpha * alpha);
      wTot += gap + L.trackedText(c, unit, x + total + gap, y, 0);
    } else {
      c.font = L.font(unitSize, 600, L.FONT.body);
      c.fillStyle = L.rgba(GREYW, unitAlpha * alpha);
      wTot += gap + L.trackedText(c, unit, x + total + gap, y, 3);
    }
  }
  c.restore();
  return wTot;
}

/** House big-number label (same look as L.bigLabel) with a free size, for morphing labels. */
export function drawBig(c, { x, y, text, size = 120, k = 1, alpha = 1, rule = 1, accent = GOLD }) {
  if (k <= 0 || alpha <= 0) return 0;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4) * alpha;
  c.textBaseline = 'alphabetic';
  if (rule > 0) {
    c.fillStyle = L.rgba(accent, 0.9);
    c.fillRect(x, y - size * 0.92 - 26 * size / 120, 90 * e * rule * size / 120, Math.max(2, 4 * size / 120));
  }
  c.font = L.font(size, 800, L.FONT.display);
  c.fillStyle = L.rgba(accent);
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 18;
  const w = L.trackedText(c, text, x, y + (1 - e) * 30 * size / 120, -1);
  c.restore();
  return w;
}

// ------------------------------------------------------------------ the million span
/** Head of the beat-0/1 span (seconds ago) at global time gt: real time in beat 0, then the draw to 1e6. */
export function millionHead(gt, tl) {
  const real = Math.max(0, gt);
  const t = gt - tl.scenes[1].start;
  if (t <= 0) return real;
  const e = L.smoothstep(L.prog(t, 0, 1.45));
  const r = L.clamp(at(gt, tl).mpp / KEY1 * 1.06);   // 1 just before the zoom lands: exact, monotonic landing
  return Math.max(real, MILLION * e * r);
}

// ------------------------------------------------------------------ vacation icons
// world anchors (seconds ago) chosen so the icons sit mid-span at the end of the beat-1 zoom
const SUIT = { x: 520, s: (800 - NOW_Y) * KEY1 };
const CAL = { x: 790, s: (770 - NOW_Y) * KEY1 };
const ICON_T = 2.1;   // beat-relative: "A short vacation"

function iconFrame(v, anchor, delay) {
  const sf = L.clamp(KEY1 / v.cam.mpp, 0, 1.15);
  const kin = L.enter(v.t, ICON_T + delay, 0.6, L.ease.outCubic);
  const a = Math.min(1, kin * 1.8) * L.clamp((sf - 0.04) / 0.25);
  const x = LANE_X + (anchor.x - LANE_X) * sf + (1 - kin) * 90;
  return { x, y: v.wy(anchor.s), sf, a, kin };
}

function drawSuitcase(c, v) {
  const f = iconFrame(v, SUIT, 0);
  if (f.a <= 0.01) return;
  const t = v.t - ICON_T;
  c.save();
  c.translate(f.x, f.y);
  c.scale(f.sf, f.sf);
  // settle: a little tilt that overshoots back to level as it slides in
  c.rotate((1 - f.kin) * -0.12 + Math.sin(L.clamp(t / 0.9) * Math.PI * 2) * 0.02 * (1 - L.clamp(t / 0.9)));
  c.globalAlpha = f.a;
  const w = 220, h = 150;
  // floor shadow + warm light
  L.lightBlob(c, 0, 0, 190, [120, 90, 40], 0.22);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(0, h / 2 + 8, w * 0.48, 9, 0, 0, Math.PI * 2); c.fill();
  // handle
  c.strokeStyle = L.rgba(WARM, 0.9);
  c.lineWidth = 7;
  c.lineCap = 'round';
  L.roundRect(c, -34, -h / 2 - 26, 68, 34, 12);
  c.stroke();
  // body
  const bg = c.createLinearGradient(0, -h / 2, 0, h / 2);
  bg.addColorStop(0, '#3a2c1c');
  bg.addColorStop(1, '#1d150d');
  c.fillStyle = bg;
  L.roundRect(c, -w / 2, -h / 2, w, h, 18);
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = L.rgba(WARM, 0.9);
  c.stroke();
  // lid seam
  c.strokeStyle = L.rgba(WARM, 0.35);
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(-w / 2 + 8, -h / 2 + 34); c.lineTo(w / 2 - 8, -h / 2 + 34); c.stroke();
  // straps in gold with buckles
  for (const sx of [-58, 58]) {
    c.fillStyle = L.rgba(GOLD, 0.85);
    c.fillRect(sx - 9, -h / 2 + 1, 18, h - 2);
    c.strokeStyle = L.rgba(HOT, 0.95);
    c.lineWidth = 3;
    c.strokeRect(sx - 12, -h / 2 + 24, 24, 20);
  }
  // corner guards
  c.fillStyle = L.rgba(WARM, 0.75);
  for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    c.beginPath(); c.arc(cx * (w / 2 - 12), cy * (h / 2 - 12), 5, 0, Math.PI * 2); c.fill();
  }
  // top light sweep
  const sw = L.clamp((t - 0.35) / 0.8);
  if (sw > 0 && sw < 1) {
    c.save();
    L.roundRect(c, -w / 2, -h / 2, w, h, 18);
    c.clip();
    const sx = L.lerp(-w, w, L.ease.inOutCubic(sw));
    const lg = c.createLinearGradient(sx - 60, 0, sx + 60, 0);
    lg.addColorStop(0, 'rgba(255,240,200,0)');
    lg.addColorStop(0.5, 'rgba(255,240,200,0.22)');
    lg.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = lg;
    c.fillRect(-w / 2, -h / 2, w, h);
    c.restore();
  }
  // luggage tag hanging from the handle: a damped swing (secondary motion)
  const sw2 = Math.sin(t * 7) * 0.5 * Math.exp(-Math.max(0, t) * 2.2) + L.noise1(v.gt * 0.8, 31) * 0.05;
  c.save();
  c.translate(26, -h / 2 - 12);
  c.rotate(0.35 + sw2);
  c.strokeStyle = L.rgba(WARM, 0.7);
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 30); c.stroke();
  c.fillStyle = L.rgba(WARM, 0.92);
  L.roundRect(c, -13, 30, 26, 38, 5);
  c.fill();
  c.fillStyle = '#2a2017';
  c.beginPath(); c.arc(0, 37, 3, 0, Math.PI * 2); c.fill();
  c.fillRect(-7, 48, 14, 2.5);
  c.fillRect(-7, 55, 10, 2.5);
  c.restore();
  c.restore();
}

function drawCalendar(c, v) {
  const f = iconFrame(v, CAL, 0.12);
  if (f.a <= 0.01) return;
  const t = v.t - ICON_T - 0.12;
  // pages 1 → 12, fast in the middle, settling on 12 (11.6 days)
  const pf = 1 + 11 * L.ease.inOutCubic(L.prog(t, 0.2, 0.85));
  const n = Math.floor(pf);
  c.save();
  c.translate(f.x, f.y);
  c.scale(f.sf, f.sf);
  c.rotate((1 - f.kin) * 0.1);
  c.globalAlpha = f.a;
  const w = 150, h = 170, top = -h / 2, head = 40;
  L.lightBlob(c, 0, 0, 170, [120, 90, 40], 0.2);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(0, h / 2 + 10, w * 0.46, 8, 0, 0, Math.PI * 2); c.fill();
  // back board + stacked page edges
  c.fillStyle = '#1b1712';
  L.roundRect(c, -w / 2 - 4, top - 4, w + 8, h + 12, 12);
  c.fill();
  for (let i = 3; i >= 1; i--) {
    c.fillStyle = L.rgba(L.mix([60, 55, 48], WARM, 0.25 * (4 - i)), 1);
    L.roundRect(c, -w / 2, top + i * 2.5, w, h, 10);
    c.fill();
  }
  const page = (num, dark = false) => {
    if (dark) {
      const bg = c.createLinearGradient(0, top, 0, top + h);
      bg.addColorStop(0, '#cdbfa5');
      bg.addColorStop(1, '#8a7d68');
      c.fillStyle = bg;
    } else c.fillStyle = L.rgba(WARM);
    L.roundRect(c, -w / 2, top, w, h, 10);
    c.fill();
    if (dark) return;
    c.fillStyle = L.rgba(GOLD);
    L.roundRect(c, -w / 2, top, w, head, 10);
    c.fill();
    c.fillRect(-w / 2, top + head - 10, w, 10);
    c.fillStyle = '#2a2017';
    c.font = L.font(18, 700, L.FONT.body);
    c.textBaseline = 'middle';
    L.trackedText(c, 'DAY', 0, top + head / 2 + 1, 4, 'center');
    c.font = L.font(96, 700, L.FONT.din);
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#1e1913';
    L.trackedText(c, String(num), 0, top + head + 100, 0, 'center');
  };
  // tear-off: the next page sits underneath while each torn page lifts off the binding and flies up-right
  page(pf >= 12 ? 12 : pf > 1 ? n + 1 : 1);
  const FLY = 1.8;   // flight length, in pages
  // flight is driven by time (not the clamped pf) so the last torn pages finish ~0.35 s after the flip ends
  const pfFly = pf + Math.max(0, t - 1.05) * FLY / 0.35;
  for (let j = Math.max(1, Math.floor(pfFly - FLY)); j <= Math.min(11, Math.floor(pfFly)); j++) {
    const fp = L.clamp((pfFly - j) / FLY);
    if (fp <= 0 || fp >= 1) continue;
    const e = L.ease.outCubic(fp);
    c.save();
    c.globalAlpha *= 1 - L.ease.inCubic(fp);
    c.translate(-w / 2 + e * 70, top - e * 70);
    c.rotate(e * 0.55 * (j % 2 ? 1 : 0.8));
    c.translate(w / 2, -top);
    c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
    page(j);
    c.restore();
  }
  // binding rings
  for (const rx of [-38, 38]) {
    c.strokeStyle = L.rgba([210, 200, 180]);
    c.lineWidth = 5;
    c.beginPath(); c.arc(rx, top - 2, 9, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ counter + label (beats 0–2)
function drawCounterAndLabel(c, v) {
  const tl = v.tl, gt = v.gt;
  const b1 = tl.scenes[1].start, b2 = tl.scenes[2].start, b3 = tl.scenes[3].start;
  if (gt > b3 + 0.5) return;
  const t1 = gt - b1;
  const head = millionHead(gt, tl);
  const rate = (millionHead(gt + 0.01, tl) - millionHead(gt - 0.01, tl)) / 0.02;
  const endY = v.wy(MILLION);
  // morph into the parked tag as the span compresses (beat 2)
  const m = L.ease.inOutCubic(L.clamp(1 - (endY - NOW_Y) / KEY_PX));
  const fadeOut = 1 - L.enter(gt, b3, 0.4, L.ease.inCubic);
  const kin = L.enter(gt, 0.2, 0.5);
  // counter size: big while racing, small line once it lands
  const land = L.ease.inOutCubic(L.prog(t1, 1.05, 0.6));
  const headY = v.wy(head);
  let size = L.lerp(104, 46, land), x = LABEL_X, y = headY + L.lerp(132, 58, land);
  // label
  const kLab = L.enter(t1, 1.35, 0.6);
  const bigSize = L.lerp(120, 40, m);
  const bigY = endY - 26 * m;
  let bw = 0;
  if (kLab > 0) bw = drawBig(c, { x: LABEL_X, y: bigY, text: '11.6 days', size: bigSize, k: kLab, alpha: fadeOut, rule: 1 - m });
  if (m > 0) {
    size = L.lerp(46, 28, m);
    x = L.lerp(LABEL_X, LABEL_X + bw + 16, m);
    y = L.lerp(endY + 58, bigY, m);
    // tiny leader from the NOW sliver to the parked tag
    c.save();
    c.strokeStyle = L.rgba(GOLD, 0.6 * L.clamp((m - 0.7) / 0.3) * fadeOut);
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(LANE_X + 12, NOW_Y + 1); c.lineTo(LABEL_X - 10, bigY - 12); c.stroke();
    c.restore();
  }
  const settled = L.clamp((t1 - 1.2) / 0.3);
  drawCounter(c, {
    x, y, value: head, rate, digits: 7, size, alpha: kin * fadeOut,
    ...(m > 0.5 ? { unit: 's', unitSize: size, unitGap: size * 0.22, unitInline: true } : { unit: 'SECONDS', unitSize: L.lerp(26, 20, m) }), gold: settled * (1 - L.clamp((t1 - 1.6) / 0.8)) * (1 - m),
    lead: L.lerp(0.2, 0, land),
  });
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'A million seconds', sub: '1,000,000 s' },
  captions: true,
  layer: 1,   // above the billion span so the million sliver stays visible at NOW
  cues(d) {
    return [
      { t: 0.05, name: 'riser', gain: 0.16, pitch: 0.9 },
      { t: 0.3, name: 'count', gain: 0.22, pitch: 1.1 },
      { t: 1.38, name: 'impact', gain: 0.32, pitch: 1.2 },
      { t: 1.44, name: 'shimmer', gain: 0.14, pitch: 1.2 },
      { t: ICON_T, name: 'swish', gain: 0.22, pitch: 1.1 },
      { t: ICON_T + 0.36, name: 'count', gain: 0.16, pitch: 1.6 },
      { t: ICON_T + 1.17, name: 'tick', gain: 0.22, pitch: 1.4 },
    ];
  },

  drawWorld(ctx, v) {
    const gt = v.gt, tl = v.tl;
    const t1 = gt - tl.scenes[1].start;
    const head = millionHead(gt, tl);
    const drawing = L.clamp(1 - (t1 - 1.2) / 0.5);           // head glow fades once it lands
    const done = L.ease.outCubic(L.prog(t1, 1.25, 0.6));
    // a touch wider while it is a real-time tape in the hook, so the growing seconds read at phone size
    const w = L.lerp(20, 14, L.ease.inOutCubic(L.prog(t1, 0, 0.8)));
    drawSpan(ctx, v, head, { w, head: Math.max(0.6 * (gt < tl.scenes[1].start ? 1 : 0), drawing), done });
    if (t1 > ICON_T - 0.1) { drawSuitcase(ctx, v); drawCalendar(ctx, v); }
    drawCounterAndLabel(ctx, v);
  },
};
