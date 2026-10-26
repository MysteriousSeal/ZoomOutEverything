// Beat 1 — "Almost everything on your calendar comes from the sky. | Except the week."
// Three ink tags land on the page in turn, each with an accent mark on its target and a tiny drawn sky glyph:
//   DAY   ring drawn round today's cell (a half-lit globe + spin arrow glyph)
//   MONTH underline under OCTOBER (a crescent-Moon glyph)
//   YEAR  underline under 2026 (a Sun-and-dotted-orbit glyph; compact tag under 2026)
// On "Except the week" the tags dim, the week row washes accent left to right (painted by s00's cellTint) and a big
// accent "?" lands on it. Near the end a cool glow blooms from above: the sky invites the tilt-up of beat 2.
// Everything is world space on the page, so it rides the camera's tilt in beat 2 and dissolves with the page.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PAPER, INKC, MONTH } from '../env.js';
import { pageLayout, weekRowK, WEEK_ROW, TODAY } from './s00-hook.js';

const { W } = L;
const TAU = Math.PI * 2;
const INK_ACC = L.mix(ACCENT, [150, 96, 30], 0.5);   // accent deepened for paper

// tag landing times (beat-local), spread over phrase 1 "Almost everything on your calendar comes from the sky."
const T_TAG = { day: 0.95, month: 1.55, year: 2.15 };

/** Phrase-2 ("Except the week.") start, beat-local. */
const tWeek = (v) => (v.tl.lines[1].phrases?.[1]?.start ?? v.tl.scenes[1].start + 3.3) - v.tl.scenes[1].start;

// ------------------------------------------------------------------ glyphs (screen px, centred at x, y, size s)
function glyphDay(c, x, y, s, t, bg) {
  // a globe, half lit (terminator), with a short curved spin arrow BESIDE it (never a ring round it: that reads Saturn)
  const gx = x - s * 0.18, r = Math.max(0, s * 0.32);
  c.fillStyle = L.rgba(ACCENT, 0.35);
  c.beginPath(); c.arc(gx, y, r, 0, TAU); c.fill();
  c.fillStyle = L.rgba(ACCENT);
  c.beginPath(); c.arc(gx, y, r, -Math.PI / 2, Math.PI / 2, true); c.closePath(); c.fill();   // lit left half
  // the arrow: an arc on the right of the globe, running downward, with a drawn chevron head
  const ar = s * 0.56, a0 = -0.95, a1 = 0.75;
  c.strokeStyle = L.rgba(ACCENT); c.lineWidth = Math.max(1, s * 0.085); c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.arc(gx, y, ar, a0, a1); c.stroke();
  const hx = gx + Math.cos(a1) * ar, hy = y + Math.sin(a1) * ar;
  const tx = -Math.sin(a1), ty = Math.cos(a1), h = s * 0.2;     // tangent (direction of travel)
  c.beginPath();
  c.moveTo(hx - tx * h + ty * h * 0.75, hy - ty * h - tx * h * 0.75);
  c.lineTo(hx, hy);
  c.lineTo(hx - tx * h - ty * h * 0.75, hy - ty * h + tx * h * 0.75);
  c.stroke();
}
function glyphMonth(c, x, y, s, bg) {
  c.fillStyle = L.rgba(ACCENT);
  c.beginPath(); c.arc(x, y, Math.max(0, s * 0.45), 0, TAU); c.fill();
  c.fillStyle = bg;
  c.beginPath(); c.arc(x + s * 0.2, y - s * 0.1, Math.max(0, s * 0.4), 0, TAU); c.fill();
}
function glyphYear(c, x, y, s, t) {
  // a small rayed Sun inside a dotted orbit, with the Earth as a dot on it (wide, not eye-shaped)
  const rx = s * 0.66, ry = s * 0.42;
  c.fillStyle = L.rgba(ACCENT, 0.75);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    c.beginPath(); c.arc(x + Math.cos(a) * rx, y + Math.sin(a) * ry, Math.max(0, s * 0.045), 0, TAU); c.fill();
  }
  c.fillStyle = L.rgba(ACCENT);
  c.beginPath(); c.arc(x, y, Math.max(0, s * 0.13), 0, TAU); c.fill();
  c.strokeStyle = L.rgba(ACCENT); c.lineWidth = Math.max(1, s * 0.05); c.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * s * 0.19, y + Math.sin(a) * s * 0.19);
    c.lineTo(x + Math.cos(a) * s * 0.26, y + Math.sin(a) * s * 0.26);
    c.stroke();
  }
  const a = -2.3 + t * 1.2;
  c.fillStyle = L.rgba([150, 200, 240]);
  c.beginPath(); c.arc(x + Math.cos(a) * rx, y + Math.sin(a) * ry, Math.max(0, s * 0.1), 0, TAU); c.fill();
}

/** An ink pill tag at screen (x, y) (centre), with a pointer notch toward `dir` (+1 down, -1 up). k 0..1 entrance. */
function tag(c, x, y, label, glyph, k, s, dir, gt, anchor = 'center') {
  if (k <= 0) return;
  const e = L.ease.outBack(L.clamp(k), 1.6);
  const fs = 30 * s;
  c.save();
  c.font = L.font(fs, 700, L.FONT.body);
  c.letterSpacing = `${3 * s}px`;
  const tw = c.measureText(label).width - 3 * s;
  c.letterSpacing = '0px';
  const gs = 30 * s, padX = 18 * s, gap = 12 * s, hgt = 50 * s;
  const w = padX * 2 + gs + gap + tw;
  const yy = y + (1 - e) * 14 * s * (dir ? -dir : 1);
  c.globalAlpha *= L.clamp(k * 2);
  c.translate(anchor === 'left' ? x + w / 2 - (1 - e) * 16 * s : x, yy);
  c.scale(L.lerp(0.85, 1, e), L.lerp(0.85, 1, e));
  const bg = L.rgba(INKC, 0.94);
  c.shadowColor = 'rgba(30,20,10,0.35)'; c.shadowBlur = 14 * s; c.shadowOffsetY = 4 * s;
  c.fillStyle = bg;
  L.roundRect(c, -w / 2, -hgt / 2, w, hgt, hgt / 2);
  c.fill();
  // pointer notch
  if (dir) {
    c.beginPath();
    const ny = dir * hgt / 2;
    c.moveTo(-9 * s, ny); c.lineTo(0, ny + dir * 10 * s); c.lineTo(9 * s, ny); c.closePath(); c.fill();
  }
  c.shadowColor = 'transparent';
  glyph(c, -w / 2 + padX + gs / 2, 0, gs, gt, bg);
  c.fillStyle = L.rgba(PAPER);
  c.textBaseline = 'middle';
  c.font = L.font(fs, 700, L.FONT.body);
  L.trackedText(c, label, -w / 2 + padX + gs + gap, 1.5 * s, 3 * s);
  c.restore();
}

/** A pen stroke: underline (x0..x1 at y) drawn left to right, k 0..1. */
function underline(c, x0, x1, y, k, s) {
  if (k <= 0) return;
  const e = L.ease.inOutCubic(L.clamp(k));
  c.save();
  c.strokeStyle = L.rgba(INK_ACC, 0.95);
  c.lineWidth = 5 * s; c.lineCap = 'round';
  c.beginPath();
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * e;
    const x = L.lerp(x0, x1, u), yy = y + Math.sin(u * 5.2 + 0.7) * 1.6 * s - u * 3 * s;
    i ? c.lineTo(x, yy) : c.moveTo(x, yy);
  }
  c.stroke();
  c.restore();
}

/** A hand-drawn ring round a cell (slightly open, overshooting), k 0..1. */
function ring(c, x, y, rx, ry, k, s) {
  if (k <= 0) return;
  const e = L.ease.inOutCubic(L.clamp(k));
  c.save();
  c.strokeStyle = L.rgba(INK_ACC, 0.95);
  c.lineWidth = 4.5 * s; c.lineCap = 'round';
  c.beginPath();
  const a0 = -2.2, span = TAU * 1.08 * e, n = 48;
  for (let i = 0; i <= n; i++) {
    const a = a0 + span * (i / n);
    const wob = 1 + 0.035 * Math.sin(a * 3 + 1) + 0.04 * (i / n);
    const px = x + Math.cos(a) * rx * wob, py = y + Math.sin(a) * ry * wob;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.stroke();
  c.restore();
}

function draw(c, v) {
  const lay = pageLayout();
  const s = v.ws(1);                     // px per u
  const t = v.t;
  // the page (and everything on it) dissolves with s00's page; the tags leave a little earlier
  const t3 = v.tl.scenes[3].start;
  const kAll = (1 - L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[2].start - 0.22, 0.4))) * (1 - L.ease.inOutCubic(L.prog(v.gt, t3 - 0.35, 0.5))) * (1 - L.clamp(L.invLerp(1.3, 2.0, v.cam.mpp)));
  if (kAll <= 0 || t < 0.5) return;
  const tw = tWeek(v);
  const kw = L.ease.inOutCubic(L.prog(t, tw - 0.1, 0.4));
  const dim = 1 - 0.6 * kw, pillK = 1 - kw;
  c.save();
  c.globalAlpha *= kAll;
  c.font = L.font(Math.max(6, lay.h * 0.1 * s), 800, L.FONT.display);
  c.letterSpacing = `${Math.max(0, 0.004 * lay.w * s)}px`;
  const monthW = c.measureText(MONTH.name).width;
  c.letterSpacing = '0px';
  c.font = L.font(Math.max(5, lay.h * 0.05 * s), 700, L.FONT.din);
  const yearW = c.measureText(MONTH.year).width;
  const ty = v.wy(lay.titleY);

  // ---- DAY: a ring round today's cell, tag above it
  const idx = MONTH.first + TODAY - 1, cell = lay.cell(idx % 7, Math.floor(idx / 7));
  const kd = L.prog(t, T_TAG.day, 0.5);
  c.save(); c.globalAlpha *= dim;
  ring(c, v.wx(cell.cx), v.wy(cell.cy), cell.w * s * 0.52, cell.h * s * 0.48, L.prog(t, T_TAG.day - 0.15, 0.55), s);
  // ---- MONTH: underline OCTOBER, tag below it
  const mx0 = v.wx(lay.gx0), mx1 = mx0 + monthW;
  underline(c, mx0, mx1, ty + 10 * s, L.prog(t, T_TAG.month - 0.15, 0.5), s);
  // ---- YEAR: underline 2026, tag below it
  const yx1 = v.wx(lay.gx1), yx0 = yx1 - yearW;
  underline(c, yx0, yx1, ty + 10 * s, L.prog(t, T_TAG.year - 0.15, 0.4), s);
  c.restore();
  c.save(); c.globalAlpha *= pillK;
  tag(c, mx1 + 22 * s, ty - 27 * s, 'MONTH', (cc, x, y, gs, _gt, bg) => glyphMonth(cc, x, y, gs, bg), L.prog(t, T_TAG.month, 0.45), s, 0, v.gt, 'left');
  // YEAR: no room beside 2026 (the MONTH tag owns the title band), so a compact tag tucks under 2026, between its
  // underline and the weekday headers (it never covers FRI / SAT)
  const ys = s * 0.8;
  tag(c, yx1 - 78 * ys, ty + 38 * s, 'YEAR', (cc, x, y, gs, gt) => glyphYear(cc, x, y, gs, gt), L.prog(t, T_TAG.year, 0.45), ys, -1, v.gt);
  tag(c, v.wx(cell.cx), v.wy(cell.y) - 34 * s, 'DAY', (cc, x, y, gs, gt) => glyphDay(cc, x, y, gs, gt), kd, s, 1, v.gt);
  c.restore();

  // ---- "Except the week": a big accent "?" lands on the washed row
  const kq = L.prog(t, tw + 0.3, 0.55);
  if (kq > 0) {
    const row = lay.cell(0, WEEK_ROW);
    const cy = v.wy(row.cy), cx = v.wx((lay.gx0 + lay.gx1) / 2);
    const e = L.ease.outBack(L.clamp(kq), 2.2);
    const size = 190 * s;
    c.save();
    c.globalAlpha *= L.clamp(kq * 2.5);
    c.font = L.font(size, 800, L.FONT.display);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    // optical centre: the glyph's measured ink box centred on the row centre (the dot no longer hangs a row lower)
    const m = c.measureText('?');
    const yc = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    c.translate(cx, cy + yc);
    c.scale(L.lerp(0.6, 1, e), L.lerp(0.6, 1, e));
    c.lineJoin = 'round';
    // a soft drop shadow, the accent fill, then a fine ink edge (no heavy cartoon outline)
    c.shadowColor = 'rgba(40,26,10,0.38)'; c.shadowBlur = 18 * s; c.shadowOffsetY = 5 * s;
    c.fillStyle = L.rgba(ACCENT);
    c.fillText('?', 0, 0);
    c.shadowColor = 'transparent';
    c.lineWidth = 3.5 * s;
    c.strokeStyle = L.rgba(INKC, 0.7);
    c.strokeText('?', 0, 0);
    c.restore();
  }
  c.restore();
  return kAll;
}

/** Cool light from above (screen space): the sky calling, before beat 2 tilts up to the Earth. */
function drawSkyGlow(c, v) {
  const t2 = v.tl.scenes[2].start;
  const k = L.ease.inOutCubic(L.prog(v.gt, t2 - 1.3, 1.3)) * (1 - L.ease.inOutCubic(L.prog(v.gt, t2 + 0.5, 0.9)));
  if (k <= 0) return;
  L.lightBlob(c, W / 2, -260, 1100, [120, 160, 220], 0.3 * k);
  L.lightBlob(c, W / 2, -120, 520, [200, 220, 255], 0.2 * k);
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'From the sky', sub: 'Day, month, year' },
  captions: true,
  layer: 1,
  cues(d) {
    const tw = 3.336;   // "Except the week." (beat-local; matches timeline phrase 2)
    return [
      { t: T_TAG.day, name: 'tick', gain: 0.16, pitch: 1.2 },
      { t: T_TAG.month, name: 'tick', gain: 0.16, pitch: 1.35 },
      { t: T_TAG.year, name: 'tick', gain: 0.16, pitch: 1.5 },
      ...Array.from({ length: 7 }, (_, i) => ({ t: tw - 0.05 + i * 0.075, name: 'blip', gain: 0.06, pitch: 1.1 + i * 0.06 })),
      { t: tw + 0.32, name: 'impact', gain: 0.22, pitch: 0.9 },
      { t: d - 1.2, name: 'swell', gain: 0.14, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt > v.tl.scenes[3].start + 0.5 || v.t < 0) return;
    draw(ctx, v);
    drawSkyGlow(ctx, v);
  },
};
