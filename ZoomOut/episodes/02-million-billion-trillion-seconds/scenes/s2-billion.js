// Beat 2 — one billion seconds = 31.7 years.
// The million span (s1) is compressed into a sliver at NOW while the camera zooms out; then a new gold span
// draws down to 1e9 s. A scan cursor rides its head with a rolling counter (1,000,000 → 1,000,000,000) and,
// as it passes each age on the timeline, a person appears standing on it: adult near NOW, then teen, kid,
// child, toddler at the bottom (31.7 years ago you were born). Label "31.7 years" lands at the span end.
// The span and the figures persist (they compress toward NOW in later zooms).
import * as L from '../../../../engine/runtime/lib.js';
import { at } from '../camera.js';
import { ACCENT, NOW_Y, YEAR } from '../env.js';
import { drawSpan, drawCounter, drawBig, LANE_X, KEY_PX, WARM, MILLION } from './s1-million.js';

const GOLD = ACCENT;
export const BILLION = 1e9;
export const KEY2 = BILLION / KEY_PX;
const LABEL_X = 470;
const DRAW_T0 = 0.6, DRAW_DUR = 1.15;

/** Head of the billion span (seconds ago) at global time gt; 0 before it starts. */
export function billionHead(gt, tl) {
  const t = gt - tl.scenes[2].start;
  if (t <= DRAW_T0) return 0;
  const e = L.smoothstep(L.prog(t, DRAW_T0, DRAW_DUR));
  // r reaches 1 just before the zoom lands, so the head ends exactly on 1e9 and never moves back
  const r = L.clamp(at(gt, tl).mpp / KEY2 * 1.06);
  return Math.max(MILLION, BILLION * e * r);
}

// ------------------------------------------------------------------ the person growing up
// Proportions per age (fractions of standing height h): head height, half-shoulder, half-hip, crotch height,
// limb thickness, belly bulge, arm lift. x = screen x at KEY2 (a rising diagonal: older = further right).
const STAGES = [
  { age: 24, h: 168, x: 640, hh: 0.132, sh: 0.128, hip: 0.088, cr: 0.47, lw: 0.04, belly: 0, lift: 0 },
  { age: 16, h: 150, x: 575, hh: 0.142, sh: 0.115, hip: 0.083, cr: 0.47, lw: 0.037, belly: 0, lift: 0 },
  { age: 10, h: 120, x: 510, hh: 0.162, sh: 0.112, hip: 0.083, cr: 0.44, lw: 0.04, belly: 0, lift: 0.05 },
  { age: 6, h: 98, x: 445, hh: 0.19, sh: 0.115, hip: 0.09, cr: 0.4, lw: 0.046, belly: 0.01, lift: 0.1 },
  { age: 1.3, h: 58, x: 382, hh: 0.245, sh: 0.125, hip: 0.112, cr: 0.32, lw: 0.058, belly: 0.03, lift: 0.35 },
].map((s, i) => ({ ...s, i, ys: BILLION - s.age * YEAR }));

function capsule(c, x1, y1, r1, x2, y2, r2) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  c.beginPath();
  c.arc(x1, y1, Math.max(0, r1), 0, Math.PI * 2);
  c.moveTo(x2 + r2, y2);
  c.arc(x2, y2, Math.max(0, r2), 0, Math.PI * 2);
  c.fill();
  if (d <= Math.abs(r1 - r2)) return;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const off = Math.acos(L.clamp((r1 - r2) / d, -1, 1));
  c.beginPath();
  c.moveTo(x1 + Math.cos(ang + off) * r1, y1 + Math.sin(ang + off) * r1);
  c.lineTo(x2 + Math.cos(ang + off) * r2, y2 + Math.sin(ang + off) * r2);
  c.lineTo(x2 + Math.cos(ang - off) * r2, y2 + Math.sin(ang - off) * r2);
  c.lineTo(x1 + Math.cos(ang - off) * r1, y1 + Math.sin(ang - off) * r1);
  c.closePath();
  c.fill();
}

/** Front-facing silhouette standing with feet at (0,0), height h (px). */
function figure(c, st, h, gt) {
  const H = (f) => f * h;
  const headH = H(st.hh), headW = headH * 0.8;
  const headCY = -h + headH / 2;
  const neckY = -h + headH * 0.98;
  const shY = neckY + H(0.03);
  const crY = -H(st.cr);
  const shW = H(st.sh), hipW = H(st.hip), lw = H(st.lw);
  const br = Math.sin(gt * 2.0 + st.i * 1.3) * 0.004 * h;      // breathing
  // legs + feet
  for (const sd of [-1, 1]) {
    const hx = sd * hipW * 0.5, ax = sd * (hipW * 0.5 + H(0.008) + st.belly * h * 0.6);
    capsule(c, hx, crY + lw * 0.2, lw * 1.25, ax, -lw * 0.9, lw * 0.75);
    c.beginPath(); c.ellipse(ax + sd * lw * 0.45, -lw * 0.45, lw * 1.15, lw * 0.5, 0, 0, Math.PI * 2); c.fill();
  }
  // torso: rounded shoulders, waist, hips (a belly for the little ones)
  const wY = L.lerp(shY, crY, 0.62), waist = Math.max(hipW, shW * 0.78) + st.belly * h;
  c.beginPath();
  c.moveTo(0, neckY - br);
  c.bezierCurveTo(shW * 0.55, neckY - br, shW, shY - br - H(0.005), shW, shY + H(0.045) - br);
  c.bezierCurveTo(shW * 0.98, wY - H(0.06), waist, wY - H(0.02), hipW * 1.05, crY);
  c.quadraticCurveTo(0, crY + lw * 1.4, -hipW * 1.05, crY);
  c.bezierCurveTo(-waist, wY - H(0.02), -shW * 0.98, wY - H(0.06), -shW, shY + H(0.045) - br);
  c.bezierCurveTo(-shW, shY - br - H(0.005), -shW * 0.55, neckY - br, 0, neckY - br);
  c.closePath();
  c.fill();
  // arms: hang beside the body; toddlers hold them out a little for balance
  const sway = Math.sin(gt * 1.3 + st.i * 1.7) * 0.012 * h;
  for (const sd of [-1, 1]) {
    const sx = sd * (shW - lw * 0.7), sy = shY + lw * 0.9;
    const ex = sd * (shW + H(0.02) + st.lift * H(0.08)), ey = L.lerp(sy, crY, 0.5) - st.lift * H(0.04);
    const hx = sd * (shW + H(0.035) + st.lift * H(0.16)) + sway * sd, hy = crY + H(0.05) - st.lift * H(0.14);
    capsule(c, sx, sy, lw * 0.95, ex, ey, lw * 0.75);
    capsule(c, ex, ey, lw * 0.75, hx, hy, lw * 0.62);
  }
  // neck + head
  c.fillRect(-headW * 0.2, neckY - headH * 0.25, headW * 0.4, headH * 0.32);
  c.beginPath(); c.ellipse(0, headCY, Math.max(0, headW / 2), Math.max(0, headH / 2), 0, 0, Math.PI * 2); c.fill();
}

// The figure is many overlapping fills (capsules, torso, head); composited one by one at alpha < 1 every joint
// would show as a blotch and the rim copy would bleed through. So rim + body are drawn opaque into one buffer
// and the buffer is composited once with the caller's globalAlpha.
let buf = null;
function drawFigureLayer(c, st, h, gt) {
  const pad = 8;
  const bw = Math.ceil(h * 0.8 + pad * 2), bh = Math.ceil(h + pad * 2);
  if (!buf) buf = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bw, bh) : document.createElement('canvas');
  if (buf.width < bw || buf.height < bh) { buf.width = Math.max(buf.width, bw); buf.height = Math.max(buf.height, bh); }
  const b = buf.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.clearRect(0, 0, bw, bh);
  const ox = bw / 2, oy = bh - pad;   // feet
  // gold rim on the side facing the span
  b.setTransform(1, 0, 0, 1, ox - Math.max(1, h * 0.012), oy - Math.max(0.6, h * 0.008));
  b.fillStyle = L.rgba(GOLD);
  figure(b, st, h, gt);
  // warm top-lit body
  b.setTransform(1, 0, 0, 1, ox, oy);
  const fg = b.createLinearGradient(0, -h, 0, 0);
  fg.addColorStop(0, L.rgba([245, 236, 218]));
  fg.addColorStop(0.55, L.rgba([196, 186, 168]));
  fg.addColorStop(1, L.rgba([120, 112, 100]));
  b.fillStyle = fg;
  figure(b, st, h, gt);
  c.drawImage(buf, 0, 0, bw, bh, -ox, -oy, bw, bh);
}

// "grows up": once the span has landed, a gold pulse runs up the growth line from the toddler to the adult
const PULSE_T0 = 1.95, PULSE_DUR = 1.0;
const pulsePos = (t) => L.smoothstep(L.prog(t, PULSE_T0, PULSE_DUR));
/** 0..1 flash on figure i (0 = adult) as the pulse passes it. */
function pulseAt(v, i) {
  const p = pulsePos(v.t) * (STAGES.length - 1);          // 0 = toddler … 4 = adult
  if (v.t < PULSE_T0 || v.t > PULSE_T0 + PULSE_DUR + 0.6) return 0;
  const d = p - (STAGES.length - 1 - i);
  return d < 0 ? Math.exp(-(d * d) * 30) : Math.exp(-d * 3.5);
}

function revealK(head, st) {
  // appears as the cursor passes the age on the timeline
  return L.ease.outCubic(L.clamp((head - st.ys + 0.015 * BILLION) / (0.09 * BILLION)));
}

function drawPeople(c, v, head) {
  const sf = L.clamp(KEY2 / v.cam.mpp, 0, 1.15);
  // step back during the beat-3 comparison (the loupe and "x1,000" lead there), then compress with the zoom
  const fade = L.clamp((sf - 0.03) / 0.2) * (1 - 0.5 * L.enter(v.gt, v.tl.scenes[3].start + 0.1, 0.6));
  if (fade <= 0) return;
  const lane = LANE_X;
  // growth line through the tops of the heads, drawn from the youngest up as each figure appears
  const tops = STAGES.map((st) => [lane + (st.x - lane) * sf, v.wy(st.ys) - st.h * sf * 1.0 - 10 * sf, revealK(head, st)]).reverse();
  const shown = tops.filter((p) => p[2] > 0);
  if (shown.length > 1) {
    c.save();
    c.strokeStyle = L.rgba(GOLD, 0.4 * fade);
    c.lineWidth = 2;
    c.setLineDash([3, 7]);
    c.lineDashOffset = -v.gt * 12;
    c.beginPath();
    c.moveTo(shown[0][0], shown[0][1]);
    for (let i = 1; i < shown.length; i++) {
      const [x0, y0] = shown[i - 1], [x1, y1, k] = shown[i];
      const xe = L.lerp(x0, x1, k), ye = L.lerp(y0, y1, k);
      c.quadraticCurveTo(L.lerp(x0, xe, 0.5) + 14 * sf, L.lerp(y0, ye, 0.5) + 6 * sf, xe, ye);
    }
    c.stroke();
    // the pulse travelling up the line (toddler → adult)
    const pt = v.t - PULSE_T0;
    if (shown.length === STAGES.length && pt > 0 && pt < PULSE_DUR + 0.3) {
      const p = pulsePos(v.t) * (shown.length - 1);
      const i = Math.min(shown.length - 2, Math.floor(p)), u = p - i;
      const [x0, y0] = shown[i], [x1, y1] = shown[i + 1];
      const qx = L.lerp(x0, x1, 0.5) + 14 * sf, qy = L.lerp(y0, y1, 0.5) + 6 * sf;
      const px = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * qx + u * u * x1;
      const py = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * qy + u * u * y1;
      const pa = fade * L.clamp(pt / 0.15) * (1 - L.clamp((pt - PULSE_DUR) / 0.3));
      L.lightBlob(c, px, py, 46, GOLD, 0.6 * pa);
      L.lightBlob(c, px, py, 14, [255, 238, 190], 0.95 * pa);
    }
    c.restore();
  }
  for (const st of STAGES) {
    const k = revealK(head, st);
    if (k <= 0) continue;
    const y = v.wy(st.ys);
    const x = lane + (st.x - lane) * sf + (1 - k) * 40;
    const h = st.h * sf;
    if (h < 2) continue;
    const a = k * fade;
    // ground hairline: the age on the timeline
    c.save();
    c.globalAlpha = a;
    const gx0 = lane + 10, gx1 = x + st.h * sf * 0.22;
    const lg = c.createLinearGradient(gx0, 0, gx1, 0);
    lg.addColorStop(0, L.rgba(GOLD, 0.75));
    lg.addColorStop(1, L.rgba(GOLD, 0.12));
    c.fillStyle = lg;
    c.fillRect(gx0, y - 1, Math.max(0, (gx1 - gx0) * k), 2);
    c.fillStyle = L.rgba(GOLD, 0.95);
    c.beginPath(); c.arc(lane, y, Math.max(0, 3.5 * Math.min(1, sf)), 0, Math.PI * 2); c.fill();
    // figure: warm top light, gold rim on the side facing the span
    c.translate(x, y);
    const lift = (1 - k) * 0.12;
    c.scale(1 - lift, 1 - lift);
    c.rotate(L.noise1(v.gt * 0.4 + st.i * 3, 40) * 0.015);
    L.lightBlob(c, 0, -h * 0.5, h * 0.9, [140, 105, 50], 0.18 + 0.5 * pulseAt(v, st.i));
    drawFigureLayer(c, st, h, v.gt);
    // contact shadow
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.ellipse(0, 1, Math.max(0, h * 0.16), Math.max(0, h * 0.025), 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'A billion seconds', sub: '1,000,000,000 s' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.35, name: 'riser', gain: 0.16, pitch: 0.75 },
      { t: DRAW_T0 + 0.1, name: 'count', gain: 0.2, pitch: 0.9 },
      ...[1.05, 1.19, 1.33, 1.48, 1.62].map((t, i) => ({ t, name: 'blip', gain: 0.12, pitch: 0.9 + i * 0.12 })),
      { t: 1.68, name: 'impact', gain: 0.36, pitch: 0.95 },
      { t: 1.72, name: 'shimmer', gain: 0.14, pitch: 1 },
      ...[0, 1, 2, 3, 4].map((i) => ({ t: PULSE_T0 + 0.05 + PULSE_DUR * i / 4, name: 'blip', gain: 0.06, pitch: 1.1 + i * 0.1 })),
    ];
  },

  drawWorld(ctx, v) {
    const head = billionHead(v.gt, v.tl);
    if (head <= 0) return;
    const t = v.t;
    const drawing = L.clamp(1 - (t - (DRAW_T0 + DRAW_DUR) + 0.1) / 0.5);
    const done = L.ease.outCubic(L.prog(t, DRAW_T0 + DRAW_DUR - 0.1, 0.6));
    drawSpan(ctx, v, head, { head: drawing, done });
    drawPeople(ctx, v, head);
  },

  drawOverlay(ctx, v) {
    const head = billionHead(v.gt, v.tl);
    if (head <= 0) return;
    const t = v.t;
    const headY = v.wy(head);
    const rate = (billionHead(v.gt + 0.01, v.tl) - billionHead(v.gt - 0.01, v.tl)) / 0.02;
    const endY = v.wy(BILLION);
    // cursor + counter riding the head (appear once clear of the parked million tag)
    const show = L.clamp((headY - 520) / 60) * v.k;
    const land = L.ease.inOutCubic(L.prog(t, DRAW_T0 + DRAW_DUR - 0.35, 0.5));
    if (show > 0) {
      ctx.save();
      const cur = L.clamp(1 - land * 1.4);
      const lg = ctx.createLinearGradient(LANE_X, 0, LABEL_X - 10, 0);
      lg.addColorStop(0, L.rgba(GOLD, 0.85 * show * cur));
      lg.addColorStop(1, L.rgba(GOLD, 0.15 * show * cur));
      ctx.fillStyle = lg;
      ctx.fillRect(LANE_X + 16, headY - 1, LABEL_X - 26 - LANE_X, 2);
      ctx.restore();
    }
    const size = L.lerp(64, 44, land);
    const y = L.lerp(headY + 70, endY + 58, land);
    drawCounter(ctx, {
      x: LABEL_X, y, value: head, rate, digits: 10, size, alpha: show,
      unit: 'SECONDS', unitSize: 24, lead: L.lerp(0.22, 0, land),
      gold: L.clamp((t - 1.6) / 0.2) * (1 - L.clamp((t - 2.1) / 0.8)),
    });
    const kLab = L.enter(t, 1.62, 0.55) * v.k;
    ctx.font = L.font(120, 800, L.FONT.display);
    const bs = L.fitSize(ctx, '31.7 years', 470, 120, 800, L.FONT.display);
    drawBig(ctx, { x: LABEL_X, y: endY, text: '31.7 years', size: bs, k: kLab });
  },
};
