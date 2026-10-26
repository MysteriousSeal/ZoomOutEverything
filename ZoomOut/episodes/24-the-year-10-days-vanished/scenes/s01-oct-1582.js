// Beat 1 — "In 1582, much of Catholic Europe went to bed on Thursday, October fourth, | and woke up on Friday the
// fifteenth."
// The camera pushes in on the page's first week row (s08 draws the page, END STATE). This beat inks the jump:
//   phrase 0, on "Thursday" : an engraved gold double ring draws itself round the 4 (THU column), and the tag
//                             "went to bed · THURSDAY 4" writes in above the weekday row, right-aligned to the seam;
//   phrase 1, "and woke up" : an engraved arc hops OVER the red seam from the 4 to the 15 and lands with a drawn
//                             arrowhead on "Friday"; the 15 gets its ring and the tag "woke up · FRIDAY 15" (left of
//                             the seam, mirroring the first);
//   "the fifteenth"         : a soft light passes along the torn strip of 5–14 (the days that never happened).
// Every mark is in world space (v.wx/v.wy), so it rides the camera's push and motion blur.
import * as L from '../../../../engine/runtime/lib.js';
import { OCT_LAYOUT } from './s08-gregory.js';
import { ACCENT, INKC, RUBRIC, deskK, serif } from '../env.js';

const GOLD_INK = [168, 116, 36];      // engraved gold that holds its contrast on parchment
const TAU = Math.PI * 2;

/** beat-relative start of phrase j, and its duration */
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const phd = (v, j) => v.tl.lines[v.index].phrases[j].end - v.tl.lines[v.index].phrases[j].start;
/** beat-relative key times (word positions estimated like the captions: "Thursday" ≈ 57 % into phrase 0) */
function times(v) {
  const p0 = ph(v, 0), d0 = phd(v, 0), p1 = ph(v, 1), d1 = phd(v, 1);
  return {
    thu: p0 + d0 * 0.56,            // "Thursday"
    arc: p1 + 0.1,                  // "and woke up"
    fri: p1 + d1 * 0.38,            // "Friday"
    strip: p1 + d1 * 0.66,          // "the fifteenth"
  };
}

/** engraved double ring drawn on by e (0..1), clockwise from the top */
function ring(c, x, y, r, e, a) {
  if (e <= 0) return;
  const a0 = -Math.PI / 2 - 0.25, sweep = TAU * L.ease.inOutCubic(e);
  c.save();
  c.globalAlpha *= a;
  c.lineCap = 'round';
  // soft gold wash inside (paper tint, not a glow)
  c.fillStyle = L.rgba(ACCENT, 0.2 * L.clamp(e * 1.5 - 0.3));
  c.beginPath(); c.arc(x, y, Math.max(0, r * 0.9), 0, TAU); c.fill();
  c.strokeStyle = L.rgba(GOLD_INK, 0.95);
  c.lineWidth = Math.max(1, r * 0.055);
  c.beginPath(); c.arc(x, y, Math.max(0, r), a0, a0 + sweep); c.stroke();
  c.strokeStyle = L.rgba(GOLD_INK, 0.6);
  c.lineWidth = Math.max(0.6, r * 0.018);
  c.beginPath(); c.arc(x, y, Math.max(0, r * 1.1), a0 + 0.5, a0 + 0.5 + sweep * 0.97); c.stroke();
  // engraved graduations on the outer ring (every 15°)
  c.lineWidth = Math.max(0.6, r * 0.016);
  c.beginPath();
  for (let i = 0; i < 24; i++) {
    const an = a0 + (i / 24) * TAU;
    if (an - a0 > sweep) break;
    const l = i % 6 === 0 ? r * 0.1 : r * 0.05;
    c.moveTo(x + Math.cos(an) * r * 1.1, y + Math.sin(an) * r * 1.1);
    c.lineTo(x + Math.cos(an) * (r * 1.1 + l), y + Math.sin(an) * (r * 1.1 + l));
  }
  c.stroke();
  c.restore();
}

/** period tag: small italic rubric line over tracked serif caps. align 'right' | 'left' at x. */
function tag(c, x, yBase, small, big, k, align, s) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.4);
  c.textBaseline = 'alphabetic';
  const maxW = 330 * s;
  const bs = L.fitSize(c, big, maxW, 31 * s, 700, '"Baskerville", Georgia, serif', 12);
  const ss = L.fitSize(c, small, maxW, 25 * s, 400, '"Baskerville", Georgia, serif', 10);
  const dx = (align === 'right' ? 1 : -1) * (1 - e) * 14 * s;
  c.font = serif(ss, 400, 'italic');
  c.fillStyle = L.rgba(RUBRIC, 0.95);
  L.trackedText(c, small, x + dx, yBase - bs * 1.02, 0.5 * s, align);
  c.font = serif(bs, 700);
  c.fillStyle = L.rgba(INKC);
  L.trackedText(c, big, x + dx, yBase, 2.4 * s, align);
  c.restore();
}

/** the engraved hop from (ax, ay) over the seam to (bx, by): a quadratic arc drawn on by e, with a drawn arrowhead */
function hop(c, ax, ay, bx, by, lift, e, a, s) {
  if (e <= 0) return;
  const mx = (ax + bx) / 2, my = Math.min(ay, by) - lift;
  const q = (t) => ({ x: (1 - t) ** 2 * ax + 2 * (1 - t) * t * mx + t * t * bx, y: (1 - t) ** 2 * ay + 2 * (1 - t) * t * my + t * t * by });
  const n = 40, te = L.ease.inOutCubic(e);
  c.save();
  c.globalAlpha *= a;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // parchment-coloured underlay so the line reads cleanly where it crosses rules and lettering
  for (const [col, w] of [['rgba(244,234,208,0.95)', 9 * s], [L.rgba(GOLD_INK, 0.98), 4.2 * s]]) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = q((i / n) * te);
      if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y);
    }
    c.stroke();
  }
  // fine companion hairline (engraving double stroke)
  c.strokeStyle = L.rgba(GOLD_INK, 0.55);
  c.lineWidth = Math.max(0.6, 1.1 * s);
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const p = q((i / n) * te);
    const t2 = (i / n) * te, d = { x: 2 * (1 - t2) * (mx - ax) + 2 * t2 * (bx - mx), y: 2 * (1 - t2) * (my - ay) + 2 * t2 * (by - my) };
    const dl = Math.hypot(d.x, d.y) || 1;
    const ox = (d.y / dl) * 6 * s, oy = (-d.x / dl) * 6 * s;
    if (i) c.lineTo(p.x + ox, p.y + oy); else c.moveTo(p.x + ox, p.y + oy);
  }
  c.stroke();
  // arrowhead at the tip, along the tangent
  const tip = q(te), t2 = te;
  const d = { x: 2 * (1 - t2) * (mx - ax) + 2 * t2 * (bx - mx), y: 2 * (1 - t2) * (my - ay) + 2 * t2 * (by - my) };
  const an = Math.atan2(d.y, d.x), hl = 19 * s * L.clamp(e * 4);
  c.fillStyle = L.rgba(GOLD_INK);
  c.beginPath();
  c.moveTo(tip.x + Math.cos(an) * hl * 0.5, tip.y + Math.sin(an) * hl * 0.5);
  c.lineTo(tip.x + Math.cos(an + 2.6) * hl, tip.y + Math.sin(an + 2.6) * hl);
  c.lineTo(tip.x + Math.cos(an + Math.PI) * hl * 0.35, tip.y + Math.sin(an + Math.PI) * hl * 0.35);
  c.lineTo(tip.x + Math.cos(an - 2.6) * hl, tip.y + Math.sin(an - 2.6) * hl);
  c.closePath();
  c.fill();
  // a dot where it took off
  c.beginPath(); c.arc(ax, ay, Math.max(0, 4 * s), 0, TAU); c.fill();
  c.restore();
}

/** a soft light passing along the torn strip of 5–14 (s08 rests it across the empty rows 3–4) */
function stripGlint(c, v, g, a) {
  if (g <= 0 || g >= 1 || a <= 0) return;
  const lay = OCT_LAYOUT;
  // s08's STRIP: centred on the grid, row 4.47, tilted -0.034 rad, ≈ 0.69 × the grid's width
  const mx = lay.gx0 + 3.5 * lay.cw, my = lay.gy0 + lay.ch * 4.47, half = 3.5 * lay.cw * 0.69, rot = -0.034;
  const lx = L.lerp(-half - 60, half + 60, L.ease.inOutCubic(g));
  const x = v.wx(mx + lx * Math.cos(rot)), y = v.wy(my + lx * Math.sin(rot));
  L.lightBlob(c, x, y, 120 / v.cam.mpp * 0.8, [255, 220, 150], 0.35 * Math.sin(Math.PI * g) * a);
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'October 1582', sub: 'Spain, Portugal, Italy, Poland–Lithuania' },
  layer: 6,
  cues() {
    // beat-relative, matching times() on the current timeline (phrase 0 at +0.15 s, phrase 1 at +5.72 s)
    return [
      { t: 3.05, name: 'tick', gain: 0.26, pitch: 0.9 },
      { t: 5.8, name: 'swish', gain: 0.24, pitch: 1.1 },
      { t: 6.45, name: 'ping', gain: 0.26, pitch: 1.2 },
      { t: 6.95, name: 'shimmer', gain: 0.14, pitch: 1.0 },
    ];
  },
  drawOverlay(c, v) {
    const dk = deskK(v);
    const a = v.k * dk;
    if (a <= 0) return;
    const T = times(v);
    const lay = OCT_LAYOUT, s = 1 / v.cam.mpp;
    const p4 = lay.cell(0, 4), p15 = lay.cell(0, 5);
    const x4 = v.wx(p4.x), y4 = v.wy(p4.y), x15 = v.wx(p15.x), y15 = v.wy(p15.y);
    const r = lay.ch * 0.37 * s;
    const seamX = v.wx(lay.gx0 + 5 * lay.cw);
    const tagY = v.wy(lay.wdY - 22);   // caps baseline in the clear band between the year line and the weekday row
    c.save();
    // Thursday 4
    ring(c, x4, y4, r, L.prog(v.t, T.thu - 0.1, 0.6), a);
    tag(c, seamX - 16 * s, tagY, 'went to bed', 'THURSDAY 4', L.prog(v.t, T.thu, 0.55) * a, 'right', s);
    // the hop over the seam: from the top of ring 4 to the top of ring 15
    const an = 0.5;   // rad off vertical where the arc leaves / meets the rings
    hop(c, x4 + Math.sin(an) * r * 1.12, y4 - Math.cos(an) * r * 1.12, x15 - Math.sin(an) * r * 1.12, y15 - Math.cos(an) * r * 1.12,
      r * 0.95, L.prog(v.t, T.arc, T.fri - T.arc), a, s);
    // Friday 15
    ring(c, x15, y15, r, L.prog(v.t, T.fri - 0.08, 0.6), a);
    tag(c, seamX + 16 * s, tagY, 'woke up', 'FRIDAY 15', L.prog(v.t, T.fri, 0.55) * a, 'left', s);
    stripGlint(c, v, L.prog(v.t, T.strip, 1.4), a);
    c.restore();
  },
};
