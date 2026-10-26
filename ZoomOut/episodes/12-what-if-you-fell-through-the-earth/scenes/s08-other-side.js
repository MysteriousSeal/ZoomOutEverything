// Beat 8 — the other side. On the globe, a target ring marks the far end of the tunnel while the faller coasts up to
// it. At 38.0 s they arrive with zero speed: the ring flashes and a tiny person pops out at the antipode, standing
// "upside down" on the bottom of the planet. On "twelve thousand seven hundred kilometers" a dimension bracket draws
// out along the tunnel from the centre to both ends: "12,742 km" / "7,918 mi · straight through".
// The person stays until just before the fall back (s09, 43.5 s), then slips back into the hole.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, ARRIVE, FALL_BACK } from '../camera.js';
import { plate } from './s04-inner-core.js';

const COOL = [215, 232, 255];
const TARGET = 0.45;              // beat-local: target ring on "the other side"
const BRACKET = 3.35;             // bracket draws out on "twelve thousand..."
const LABEL = 3.65;

/** Tapered capsule (one sub-path, consistent winding) from (x0,y0) radius r0 to (x1,y1) radius r1. */
function limb(ctx, x0, y0, r0, x1, y1, r1) {
  const an = Math.atan2(y1 - y0, x1 - x0);
  ctx.moveTo(x0 + Math.cos(an + Math.PI / 2) * r0, y0 + Math.sin(an + Math.PI / 2) * r0);
  ctx.arc(x0, y0, Math.max(0, r0), an + Math.PI / 2, an + Math.PI * 1.5);
  ctx.arc(x1, y1, Math.max(0, r1), an - Math.PI / 2, an + Math.PI / 2);
  ctx.closePath();
}

/** Tiny person (screen px): a filled silhouette with tapered limbs, feet at (x, y), body along `dir` (+1 = down the
 *  screen, i.e. standing upside down on the bottom of the planet). s = 0..1 pop scale; `wave` drives a subtle wave. */
function person(ctx, x, y, h, dir, s, wave) {
  if (s <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s * dir);
  const u = h / 40;
  ctx.scale(u, u);
  ctx.beginPath();
  // feet + legs (slightly apart, tapering to the ankle)
  limb(ctx, -3.4, 0.6, 1.0, -1.4, 0.9, 0.8);
  limb(ctx, 3.4, 0.6, 1.0, 5.4, 0.9, 0.8);
  limb(ctx, -3.3, 1.2, 1.1, -2.9, 10, 1.7);
  limb(ctx, -2.9, 10, 1.7, -2.1, 18.5, 2.4);
  limb(ctx, 3.3, 1.2, 1.1, 2.9, 10, 1.7);
  limb(ctx, 2.9, 10, 1.7, 2.1, 18.5, 2.4);
  // torso: hips to shoulders (traced with increasing angle, same winding as the arcs)
  ctx.moveTo(3.9, 17);
  ctx.quadraticCurveTo(4.3, 23, 5.3, 28.6);
  ctx.quadraticCurveTo(0, 30.6, -5.3, 28.6);
  ctx.quadraticCurveTo(-4.3, 23, -3.9, 17);
  ctx.quadraticCurveTo(0, 16, 3.9, 17);
  ctx.closePath();
  // neck + head
  limb(ctx, 0, 28.5, 1.5, 0, 31.5, 1.3);
  ctx.moveTo(3.5, 35);
  ctx.arc(0, 35, 3.5, 0, Math.PI * 2);
  ctx.closePath();
  // left arm hangs; right arm gives a small, slow wave
  limb(ctx, -4.9, 28, 1.6, -6.1, 21.5, 1.25);
  limb(ctx, -6.1, 21.5, 1.25, -6.3, 15.5, 0.95);
  const wa = 0.55 + 0.18 * Math.sin(wave);
  const ex = 6.6, ey = 22.2;
  limb(ctx, 4.9, 28, 1.6, ex, ey, 1.25);
  limb(ctx, ex, ey, 1.25, ex + Math.sin(wa) * 6.4, ey + Math.cos(wa) * 6.4, 0.95);
  ctx.fillStyle = 'rgb(236,242,255)';
  ctx.shadowColor = 'rgba(150,190,255,0.9)';
  ctx.shadowBlur = 5;
  ctx.fill();
  ctx.restore();
}

/** Magnifier inset (screen px) beside the antipode (ax, ay): the bottom of the planet seen up close, the hole, and
 *  the person standing upside down beside it. k = inset open 0..1, pop = person pop 0..1. */
function inset(ctx, v, ax, ay, k, pop) {
  if (k <= 0.01) return;
  const R = 104, ix = ax + 250, iy = ay - 30;
  const e = L.clamp(k);
  const cx = L.lerp(ax, ix, e), cy = L.lerp(ay, iy, e), r = R * e;
  ctx.save();
  // leader from the antipode to the lens
  ctx.globalAlpha *= L.clamp(k * 1.5);
  const an = Math.atan2(cy - ay, cx - ax);
  ctx.strokeStyle = 'rgba(225,236,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(ax, ay, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax + Math.cos(an) * 9, ay + Math.sin(an) * 9); ctx.lineTo(cx - Math.cos(an) * r, cy - Math.sin(an) * r); ctx.stroke();
  // the lens
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgb(14,18,34)';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - 1), 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, cy); ctx.scale(e, e);
  // sky (below us: we're under the planet), dusk-blue toward the ground
  const sg = ctx.createLinearGradient(0, R, 0, -40);
  sg.addColorStop(0, 'rgb(10,14,30)'); sg.addColorStop(1, 'rgb(52,62,96)');
  ctx.fillStyle = sg; ctx.fillRect(-R, -R, 2 * R, 2 * R);
  // the ground overhead: a huge planet, so a barely curved line; rock above it with a thin grass skin
  const gy = -34, BR = 900;
  ctx.beginPath(); ctx.arc(0, gy - BR, BR, 0, Math.PI * 2);
  const rg = ctx.createLinearGradient(0, -R, 0, gy);
  rg.addColorStop(0, 'rgb(70,58,48)'); rg.addColorStop(1, 'rgb(104,88,70)');
  ctx.fillStyle = rg; ctx.fill();
  ctx.strokeStyle = 'rgb(96,132,70)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, gy - BR - 2, BR, Math.PI * 0.4, Math.PI * 0.6); ctx.stroke();
  // the hole: a dark shaft up into the rock
  const hx = -30;
  ctx.fillStyle = 'rgb(8,8,12)';
  ctx.fillRect(hx - 11, -R, 22, R + gy + 1);
  ctx.fillStyle = 'rgba(255,226,200,0.35)';
  ctx.fillRect(hx - 12, -R, 1, R + gy + 1); ctx.fillRect(hx + 11, -R, 1, R + gy + 1);
  ctx.restore();
  // the person, upside down to us, feet on the ground (drawn crisp, not clipped by the scale)
  person(ctx, cx + 22 * e, cy + (gy + 1) * e, 74 * e, 1, pop, v.gt * 4);
  // lens rim
  ctx.strokeStyle = 'rgba(225,236,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** Dimension bracket along x, from y0 to y1, drawn out from the middle (k 0..1). */
function bracket(ctx, x, y0, y1, k, col) {
  if (k <= 0) return;
  const e = L.ease.inOutCubic(L.clamp(k));
  const mid = (y0 + y1) / 2, a = L.lerp(mid, y0, e), b = L.lerp(mid, y1, e);
  ctx.save();
  ctx.strokeStyle = L.rgba(col, 0.95);
  ctx.fillStyle = L.rgba(col, 0.95);
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(x, a); ctx.lineTo(x, b); ctx.stroke();
  const cap = L.clamp((k - 0.75) / 0.25);
  if (cap > 0) {
    for (const [yy, s] of [[a, -1], [b, 1]]) {
      ctx.globalAlpha = cap;
      ctx.beginPath(); ctx.moveTo(x - 12, yy); ctx.lineTo(x + 12, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - 5, yy - s * 10); ctx.lineTo(x + 5, yy - s * 10); ctx.closePath(); ctx.fill();
    }
  }
  // leading sparks while drawing
  if (k < 1) {
    ctx.globalAlpha = 1;
    L.lightBlob(ctx, x, a, 26, col, 0.6);
    L.lightBlob(ctx, x, b, 26, col, 0.6);
  }
  ctx.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'The other side', sub: 'Straight through the planet' },
  captions: true,
  layer: 2,
  cues(d) {
    const arr = ARRIVE - 35.07;
    return [
      { t: TARGET, name: 'sonar', gain: 0.18, pitch: 1.2 },
      { t: arr - 0.6, name: 'riser', gain: 0.2, pitch: 1.2 },
      { t: arr, name: 'bloom', gain: 0.4, pitch: 1.0 },
      { t: arr + 0.12, name: 'blip', gain: 0.3, pitch: 1.4 },
      { t: BRACKET, name: 'swish', gain: 0.3, pitch: 1.1 },
      { t: LABEL, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: LABEL + 0.05, name: 'shimmer', gain: 0.2, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    const s8 = v.tl.scenes[8].start;
    if (v.gt < s8 || v.gt > FALL_BACK.start + 0.2) return;
    const t = v.t;
    const x = v.wx(0), y = v.wy(2 * R_EARTH);
    const age = v.gt - ARRIVE;
    // target ring at the far end
    const tk = L.ease.outCubic(L.prog(t, TARGET, 0.6)) * (1 - L.prog(v.gt, ARRIVE + 0.6, 0.6));
    if (tk > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(225,236,255,${0.8 * tk})`;
      ctx.lineWidth = 1.5;
      const r = 20 + 10 * (1 - tk) + 2 * Math.sin(v.gt * 4);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const an = i * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * (r + 5), y + Math.sin(an) * (r + 5)); ctx.lineTo(x + Math.cos(an) * (r + 13), y + Math.sin(an) * (r + 13)); ctx.stroke();
      }
      ctx.restore();
    }
    if (age < -0.05) return;
    // arrival: flash + ring
    const a = Math.max(0, age);
    const f = Math.exp(-a * 2.2) * L.clamp((age + 0.05) / 0.05);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    L.lightBlob(ctx, x, y, 150, [190, 215, 255], 0.55 * f);
    const p = L.ease.outCubic(L.clamp(a / 1.4));
    ctx.strokeStyle = `rgba(215,232,255,${0.7 * (1 - p)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 20 + 110 * p), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // the person pops out, standing on the bottom of the planet (upside down to us), then slips back before the fall.
    // At globe scale a person is far below a pixel, so a magnifier inset grows out of the antipode to show them.
    const pop = L.ease.outBack(L.prog(age, 0.12, 0.45), 2.2) * (1 - L.ease.inCubic(L.prog(v.gt, FALL_BACK.start - 0.45, 0.4)));
    const ik = L.ease.outCubic(L.prog(age, 0.05, 0.5)) * (1 - L.ease.inCubic(L.prog(v.gt, FALL_BACK.start - 0.2, 0.35)));
    inset(ctx, v, x, y, ik, pop);
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const bk = L.prog(t, BRACKET, 0.8) * v.k;
    if (bk <= 0) return;
    // the dimension runs ON the tunnel (the tunnel is the 12,742 km); the plate sits off the core, upper left, with a
    // leader to the tunnel
    const x = v.wx(0), y0 = v.wy(0), y1 = v.wy(2 * R_EARTH);
    bracket(ctx, x, y0, y1, bk, v.accent);
    const cy = Math.max(436, y0 + 118);
    const k = L.enter(t, LABEL, 0.55) * v.k;
    if (k <= 0) return;
    const BIG = 72, SUB = ['7,918 MI', 'STRAIGHT THROUGH'];
    ctx.save();
    ctx.font = L.font(BIG, 800, L.FONT.display);
    ctx.letterSpacing = '-1px';
    const bigW = ctx.measureText('12,742 km').width;
    ctx.font = L.font(21, 700, L.FONT.body);
    ctx.letterSpacing = '2px';
    const subW = Math.max(...SUB.map((l) => ctx.measureText(l).width));
    ctx.restore();
    const pw = Math.ceil(Math.max(bigW, subW) + 60), ph = 214;
    const px = 40;
    // a short leader from the bracket's middle to the plate
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.fillStyle = L.rgba(v.accent, 0.9);
    const lw = (x - (px + pw)) * L.ease.outCubic(k);
    ctx.fillRect(x - lw, cy - 1, lw, 2);
    ctx.restore();
    const sx = px - (1 - L.ease.outCubic(k)) * 20;
    plate(ctx, sx, cy - 100, pw, ph, k);
    L.bigLabel(ctx, { x: sx + 30, y: cy + 26, big: '12,742 km', small: '', k, accent: v.accent, size: BIG });
    ctx.save();
    ctx.globalAlpha *= L.clamp(k * 1.4);
    ctx.font = L.font(21, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,230,240,0.92)';
    ctx.textBaseline = 'alphabetic';
    const dy = (1 - L.ease.outCubic(k)) * 12;
    L.trackedText(ctx, SUB[0], sx + 30, cy + 66 + dy, 2);
    ctx.fillStyle = 'rgba(225,230,240,0.7)';
    L.trackedText(ctx, SUB[1], sx + 30, cy + 96 + dy, 2);
    ctx.restore();
  },
};
