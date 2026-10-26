// Beat 8 — "So Pope Gregory the Thirteenth simply deleted them."
// OWNS THE OCTOBER 1582 PAGE in every beat it appears: the hook (beats 0–2, end state), this beat (intact → stamp →
// tear → reflow), and the question (beat 13, end state). The preroll replays this beat's tear (episode.json
// preroll.from = 43.3 → film 48.09–49.29 = beat-relative 3.08–4.28: the strip docking, the reflow, the landing).
//
// Page states (film time):
//   before B3 + 2 s : END STATE — Gregorian layout (1–4 | 15–31, 15 under FRIDAY), a red inked seam between Thursday 4
//                     and Friday 15, the torn strip of 5–14 resting askew in the empty last row, struck through in red,
//                     "−10 DAYS" in rubric beside it, and the papal seal in the header's right corner.
//   B3 + 2 … B8     : INTACT Julian page (all 31 days, no seal) — the camera is away, so the swap is never seen.
//   beat 8 (TEAR, beat-relative s):
//     stamp  1.25  the papal seal (triple tiara over crossed keys, gold + silver, in a red-ink legend ring) strikes
//                  the header's right corner (the title is set left of it, so they never overlap)
//     rip    2.00  a tear runs around the three blocks of deleted days (5–6 · 7–13 · 14)
//     lift   2.15  the three torn pieces lift off the page (growing soft shadows, white fibrous torn edges); the page
//                  underneath shows the rough, delaminated scar
//     dock   2.50  the pieces fly and dock end to end into ONE strip 5 … 14 (5–6 and 14 pass over 7–13), shrinking
//                  to the width of the grid and hovering askew over the last row
//     reflow 3.00  15–31 glide back ten places (staggered, on soft arcs): 15 lands under FRIDAY; the scar heals
//     land   3.50  the strip settles into the empty last row (shadow tightens); the seam inks in
//     strike 3.80  a red rule strikes the ten days through; "−10 DAYS" inks in beside 31
//   after           : END STATE again
//
// The preroll replays this beat WITH overlays under p-cold's headline (y ≈ 220–550): everything here is drawn on the
// page (world space, page top ≈ y 570 in beat 8), nothing above it.
import * as L from '../../../../engine/runtime/lib.js';
import {
  P_OCT, PAGE_W, PAGE_H, ACCENT, RUBRIC, INKC, PARCH, PARCH_DK, SERIF, drawMonthPage, pageLayout, dayNumeral, deskK,
  OCT_JULIAN, OCT_GREGORIAN, serif,
} from '../env.js';

/** beat-8-relative times (s). (stamp, tear0/tear1 = whole tear, reflow0/reflow1 kept for callers.) */
export const TEAR = {
  stamp: 1.25, rip: 2.0, lift: 2.15, dock: 2.5, reflow0: 2.85, land: 3.5, strike: 3.8, note: 3.75,
  tear0: 2.0, tear1: 3.9, reflow1: 3.85,
};
const JUL = new Map(OCT_JULIAN.map((d) => [d.d, d]));
const GRE = new Map(OCT_GREGORIAN.map((d) => [d.d, d]));
const GONE = (d) => d >= 5 && d <= 14;
const E = L.ease;

const DONE = { stamp: 1, rip: 1, lift: 1, dock: 1, land: 1, reflowT: 9, reflow: 1, seam: 1, strike: 1, note: 1, tear: 1, shock: 1 };
const NONE = { stamp: 0, rip: 0, lift: 0, dock: 0, land: 0, reflowT: -9, reflow: 0, seam: 0, strike: 0, note: 0, tear: 0, shock: 0 };
/**
 * Page state at film time gt. All fields 0..1 except reflowT (seconds into the reflow, per-day stagger applied by
 * the drawer). `tear` = the whole tear (0 intact … 1 landed); `reflow` = the reflow as a whole.
 */
export function octState(gt, tl) {
  const b3 = tl.scenes[3].start, b8 = tl.scenes[8].start;
  if (gt < b3 + 2 || gt >= b8 + 4.3) return DONE;
  if (gt < b8) return NONE;
  const t = gt - b8;
  return {
    stamp: L.prog(t, TEAR.stamp, 0.32),
    shock: L.prog(t, TEAR.stamp + 0.3, 0.55),
    rip: E.inOutCubic(L.prog(t, TEAR.rip, 0.32)),
    lift: E.outCubic(L.prog(t, TEAR.lift, 0.42)),
    dock: E.inOutCubic(L.prog(t, TEAR.dock, 0.68)),
    land: E.inOutCubic(L.prog(t, TEAR.land, 0.42)),
    reflowT: t - TEAR.reflow0,
    reflow: E.inOutCubic(L.prog(t, TEAR.reflow0, TEAR.reflow1 - TEAR.reflow0)),
    seam: E.outCubic(L.prog(t, TEAR.land + 0.05, 0.35)),
    strike: E.inOutCubic(L.prog(t, TEAR.strike, 0.3)),
    note: E.outCubic(L.prog(t, TEAR.note, 0.45)),
    tear: E.inOutCubic(L.prog(t, TEAR.tear0, TEAR.tear1 - TEAR.tear0)),
  };
}
export const OCT_LAYOUT = pageLayout(P_OCT, PAGE_W, PAGE_H, 5);

// ------------------------------------------------------------------ page-local geometry (u, origin = page centre)
const LY = OCT_LAYOUT;
const CW = LY.cw, CH = LY.ch;
const GX0 = LY.gx0 - P_OCT.x, GY0 = LY.gy0 - P_OCT.y;
const cellL = (r, col) => ({ x: GX0 + CW * (col + 0.5), y: GY0 + CH * (r + 0.5) });
const X0 = -PAGE_W / 2, Y0 = -PAGE_H / 2;
// header: title set LEFT of the seal so the two never overlap
const SEAL = { x: PAGE_W / 2 - 112, y: Y0 + 116, r: 80 };   // stays above y0 + 200 (builder A's tags live at y0 + 205…300)
const TITLE_BOX = { x0: X0 + 40, x1: SEAL.x - SEAL.r - 18 };
// the strip (5 … 14) at rest: askew over the empty last row, the grid's width
const STRIP = { x: GX0 + 3.5 * CW, y: GY0 + 4.47 * CH, rot: -0.034, sc: 0.69 };
// the three torn pieces, in strip order. X = centre along the strip (unscaled u); cells = Julian (r, col)
const PIECES = [
  { days: [7, 8, 9, 10, 11, 12, 13], from: 2, sep: { x: 0, y: -4 }, bump: { x: 0, y: 30 }, wob: 0.0, seed: 31 },
  { days: [5, 6], from: 0, sep: { x: 10, y: -10 }, bump: { x: 0, y: -150 }, wob: 0.09, seed: 17 },
  { days: [14], from: 9, sep: { x: -10, y: 8 }, bump: { x: 0, y: 70 }, wob: -0.12, seed: 53 },
].map((p) => {
  const n = p.days.length;
  const X = (p.from + n / 2 - 5) * CW;
  const cs = p.days.map((d) => { const j = JUL.get(d); return cellL(j.r, j.col); });
  const O = { x: cs.reduce((s, q) => s + q.x, 0) / n, y: cs[0].y };
  return { ...p, n, X, O, w: n * CW, start: p.from === 0, end: p.from + n === 10 };
});

// ------------------------------------------------------------------ torn paper
/** jitter of a torn long edge, as a function of the position along the strip (continuous across pieces) */
const tornY = (sx, seed) => 2.6 * L.noise1(sx * 0.07, seed) + 1.1 * L.noise1(sx * 0.41, seed + 7) + 0.5 * L.noise1(sx * 1.7, seed + 3);
/** outline of a piece in its own frame (centre origin, unscaled u): ragged top/bottom; ragged ends only at the strip's ends */
function piecePath(c, p) {
  const hw = p.w / 2, hh = CH / 2, step = 4;
  const n = Math.ceil(p.w / step);
  c.beginPath();
  for (let i = 0; i <= n; i++) { const x = -hw + (p.w * i) / n; c.lineTo(x, -hh + tornY(p.X + x, 101)); }
  const m = Math.ceil(CH / step);
  for (let i = 0; i <= m; i++) { const y = -hh + (CH * i) / m; c.lineTo(hw + (p.end ? tornY(y + 900, 202) : 0), y); }
  for (let i = n; i >= 0; i--) { const x = -hw + (p.w * i) / n; c.lineTo(x, hh + tornY(p.X + x + 500, 303)); }
  for (let i = m; i >= 0; i--) { const y = -hh + (CH * i) / m; c.lineTo(-hw + (p.start ? tornY(y + 1300, 404) : 0), y); }
  c.closePath();
}
/** loose paper fibres along the torn edges of a piece (deterministic) */
function pieceFibres(c, p, alpha) {
  if (alpha <= 0) return;
  const hw = p.w / 2, hh = CH / 2;
  const r = L.rng(p.seed);
  c.save();
  c.strokeStyle = `rgba(255,251,240,${0.9 * alpha})`;
  c.lineWidth = 0.7;
  c.lineCap = 'round';
  c.beginPath();
  const n = Math.floor(p.w / 6);
  for (let i = 0; i < n; i++) {
    for (const side of [-1, 1]) {
      const x = -hw + (i + r()) * 6;
      const y = side * hh + tornY(p.X + x + (side > 0 ? 500 : 0), side > 0 ? 303 : 101);
      const len = 1.5 + r() * 4.5, ang = (r() - 0.5) * 1.2;
      c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.sin(ang) * len * 0.6, y + side * len * 0.6, x + Math.sin(ang) * len, y + side * len);
    }
  }
  for (const [on, sx, seed] of [[p.start, -1, 404], [p.end, 1, 202]]) {
    if (!on) continue;
    for (let i = 0; i < CH / 6; i++) {
      const y = -hh + (i + r()) * 6, x = sx * hw + tornY(y + (sx > 0 ? 900 : 1300), seed);
      const len = 1.5 + r() * 4.5, ang = (r() - 0.5) * 1.2;
      c.moveTo(x, y);
      c.lineTo(x + sx * len, y + Math.sin(ang) * len);
    }
  }
  c.stroke();
  c.restore();
}
/** one torn piece in its own frame: paper, white torn rim, fibres, printed grid lines and numerals, red strike */
function drawPiece(c, p, { lit = 0, strike = 0, paperK = 1 } = {}) {
  const hw = p.w / 2, hh = CH / 2;
  c.save();
  piecePath(c, p);
  const g = c.createLinearGradient(0, -hh, 0, hh);
  g.addColorStop(0, L.rgba(L.mix(PARCH, [250, 243, 224], 0.55 + 0.25 * lit), paperK));
  g.addColorStop(1, L.rgba(L.mix(PARCH, PARCH_DK, 0.12), paperK));
  c.fillStyle = g;
  c.fill();
  // torn rim: the exposed paper core is whiter than the printed surface
  c.strokeStyle = `rgba(255,252,242,${0.85 * paperK})`;
  c.lineWidth = 2.2;
  c.stroke();
  c.restore();
  pieceFibres(c, p, paperK);
  c.save();
  // printed cell rules (the original grid lines that came away with the paper)
  c.strokeStyle = L.rgba(INKC, 0.45 * paperK);
  c.lineWidth = 1.4;
  c.beginPath();
  for (let i = 1; i < p.n; i++) { const x = -hw + i * CW; c.moveTo(x, -hh + 3); c.lineTo(x, hh - 3); }
  c.stroke();
  for (let i = 0; i < p.n; i++) {
    const d = p.days[i];
    dayNumeral(c, -hw + (i + 0.5) * CW, 0, CH, d, { color: L.mix(INKC, RUBRIC, 0.15 * lit) });
  }
  c.restore();
  // the red strike (drawn per piece, but as one continuous rule along the strip)
  if (strike > 0) {
    const s0 = -5 * CW + 14, s1 = 5 * CW - 14;
    const xe = L.lerp(s0, s1, strike);
    const a = Math.max(-hw, s0 - p.X), b = Math.min(hw, xe - p.X);
    if (b > a) {
      c.save();
      c.strokeStyle = L.rgba(RUBRIC, 0.9);
      c.lineCap = 'round';
      c.lineWidth = 6;
      c.beginPath();
      for (let x = a; x <= b; x += 6) c.lineTo(x, 4 + 1.5 * L.noise1((x + p.X) * 0.05, 9));
      c.lineTo(b, 4 + 1.5 * L.noise1((b + p.X) * 0.05, 9));
      c.stroke();
      c.restore();
    }
  }
}

/** pose of a piece (page-local) */
function piecePose(p, st) {
  const sep = st.lift * (1 - st.dock);
  const ax = p.O.x + p.sep.x * sep, ay = p.O.y + p.sep.y * sep;
  const cr = Math.cos(STRIP.rot), sr = Math.sin(STRIP.rot);
  const tx = STRIP.x + cr * p.X * STRIP.sc, ty = STRIP.y + sr * p.X * STRIP.sc;
  const e = st.dock, arc = Math.sin(Math.PI * e);
  const h = L.lerp(st.lift, 0.07, st.land);       // height above the page (1 = fully lifted)
  return {
    x: L.lerp(ax, tx, e) + p.bump.x * arc,
    y: L.lerp(ay, ty, e) + p.bump.y * arc - 10 * h * (1 - st.land),
    rot: L.lerp(0, STRIP.rot, e) + p.wob * arc + 0.012 * st.lift * (1 - e),
    sc: L.lerp(1, STRIP.sc, e) * (1 + 0.045 * h),
    h,
  };
}

/** the scar left on the page where the pieces came away (rough, darker, fibrous) */
function drawScar(c, k) {
  if (k <= 0) return;
  for (const p of PIECES) {
    c.save();
    c.translate(p.O.x, p.O.y);
    piecePath(c, p);
    c.fillStyle = L.rgba(L.mix(PARCH, PARCH_DK, 0.75), 0.92 * k);
    c.fill();
    c.save();
    c.clip();
    // rough delaminated texture: soft blotches + a darker inner rim
    const r = L.rng(p.seed + 5);
    c.fillStyle = L.rgba([150, 118, 74], 0.12 * k);
    for (let i = 0; i < p.n * 7; i++) {
      const x = -p.w / 2 + r() * p.w, y = -CH / 2 + r() * CH;
      c.beginPath(); c.ellipse(x, y, 4 + r() * 10, 2 + r() * 5, r() * 3, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = L.rgba([110, 80, 44], 0.35 * k);
    c.lineWidth = 5;
    piecePath(c, p);
    c.stroke();
    c.restore();
    pieceFibres(c, p, 0.7 * k);
    c.restore();
  }
}

// ------------------------------------------------------------------ the papal seal
function keyShape(c, len, metal) {
  // a key along +x: bow (ring) at 0, shaft to len, bit (wards) at the far end pointing "up" (−y)
  const g = c.createLinearGradient(0, -6, 0, 6);
  if (metal === 'gold') { g.addColorStop(0, 'rgb(255,234,160)'); g.addColorStop(0.5, 'rgb(222,174,78)'); g.addColorStop(1, 'rgb(150,100,34)'); }
  else { g.addColorStop(0, 'rgb(250,251,255)'); g.addColorStop(0.5, 'rgb(196,202,214)'); g.addColorStop(1, 'rgb(118,126,140)'); }
  c.fillStyle = g;
  c.strokeStyle = L.rgba(INKC, 0.85);
  c.lineWidth = 1.1;
  // bow: a quatrefoil-ish ring
  c.beginPath();
  c.arc(0, 0, 8.5, 0, Math.PI * 2);
  c.moveTo(4, 0); c.arc(0, 0, 4, 0, Math.PI * 2, true);
  c.fill('evenodd'); c.stroke();
  // collar + shaft
  c.beginPath();
  c.rect(8, -2.6, len - 8, 5.2);
  c.rect(10, -4.2, 3.5, 8.4);
  c.fill(); c.stroke();
  // bit with two notches (wards), pointing up
  c.beginPath();
  const bx = len - 15;
  c.moveTo(bx, -2.6); c.lineTo(bx, -15); c.lineTo(bx + 4, -15); c.lineTo(bx + 4, -10); c.lineTo(bx + 7, -10);
  c.lineTo(bx + 7, -15); c.lineTo(bx + 13, -15); c.lineTo(bx + 13, -2.6); c.closePath();
  c.fill(); c.stroke();
}
function tiara(c) {
  // the papal triple tiara, base at y = 0, ≈ 42 u tall; centred on x = 0
  const body = new Path2D();
  body.moveTo(-15, 0);
  body.bezierCurveTo(-17, -12, -15, -24, -10, -32);
  body.quadraticCurveTo(0, -42, 10, -32);
  body.bezierCurveTo(15, -24, 17, -12, 15, 0);
  body.closePath();
  const g = c.createLinearGradient(-15, 0, 15, 0);
  g.addColorStop(0, 'rgb(205,206,212)'); g.addColorStop(0.45, 'rgb(252,252,250)'); g.addColorStop(1, 'rgb(180,182,190)');
  c.fillStyle = g;
  c.fill(body);
  c.strokeStyle = L.rgba(INKC, 0.85);
  c.lineWidth = 1.1;
  c.stroke(body);
  // three crowns: gold bands with small fleurons
  const gold = 'rgb(226,180,84)';
  for (const [y, hw] of [[-2, 15.4], [-13.5, 16], [-25, 13.6]]) {
    c.fillStyle = gold;
    c.beginPath(); c.rect(-hw, y - 2.6, 2 * hw, 3.6); c.fill(); c.stroke();
    c.beginPath();
    for (let i = -2; i <= 2; i++) { const x = i * hw * 0.42; c.moveTo(x - 2.4, y - 2.6); c.lineTo(x, y - 7); c.lineTo(x + 2.4, y - 2.6); }
    c.fill(); c.stroke();
  }
  // orb + cross
  c.fillStyle = gold;
  c.beginPath(); c.arc(0, -40, 3.4, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.rect(-1.1, -50, 2.2, 8); c.rect(-3.6, -47.5, 7.2, 2.1); c.fill(); c.stroke();
}
/** the seal in seal-local units (radius 82), ink k = 0..1 */
function seal(c, k) {
  const R = SEAL.r;
  c.save();
  // red legend ring, slightly uneven ink
  c.strokeStyle = L.rgba(RUBRIC, 0.95);
  c.lineCap = 'butt';
  const segs = 48;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1.04) / segs) * Math.PI * 2;
    c.globalAlpha = k * (0.78 + 0.22 * L.noise1(i * 0.7, 5));
    c.lineWidth = 5.2;
    c.beginPath(); c.arc(0, 0, R - 3, a0, a1); c.stroke();
  }
  c.globalAlpha = k;
  c.lineWidth = 1.3;
  c.beginPath(); c.arc(0, 0, R - 11, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, R - 33, 0, Math.PI * 2); c.stroke();
  // legend around the ring
  const legend = 'GREGORIVS · XIII · PONT · MAX · MDLXXXII · ';
  c.fillStyle = L.rgba(RUBRIC, 0.95);
  c.font = `600 13px ${SERIF}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const rr = R - 22;
  const total = legend.split('').reduce((s, ch) => s + c.measureText(ch).width + 1.6, 0);
  let a = -Math.PI / 2 - (total / rr) / 2;
  for (const ch of legend) {
    const w = c.measureText(ch).width + 1.6;
    a += w / rr / 2;
    c.save(); c.rotate(a + Math.PI / 2); c.fillText(ch, 0, -rr); c.restore();
    a += w / rr / 2;
  }
  // field: a faint red wash
  c.fillStyle = L.rgba(RUBRIC, 0.07);
  c.beginPath(); c.arc(0, 0, R - 33, 0, Math.PI * 2); c.fill();
  // crossed keys (saltire): gold bend, silver bend sinister; bows low, bits high
  c.save();
  c.translate(0, 15);
  c.save(); c.scale(-1, 1); c.rotate(-Math.PI / 4); c.translate(-29, 0); keyShape(c, 58, 'silver'); c.restore();
  c.save(); c.rotate(-Math.PI / 4); c.translate(-29, 0); keyShape(c, 58, 'gold'); c.restore();
  // the red cord tying the bows
  c.strokeStyle = L.rgba(RUBRIC, 0.95);
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(-19, 21); c.quadraticCurveTo(0, 33, 19, 21);
  c.stroke();
  c.restore();
  // the tiara over the keys
  c.save();
  c.translate(0, -4);
  // lappets (infulae)
  c.fillStyle = L.rgba(RUBRIC, 0.95);
  c.beginPath(); c.moveTo(-13, -1); c.lineTo(-19, 14); c.lineTo(-14, 15); c.lineTo(-9, 0); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(13, -1); c.lineTo(19, 14); c.lineTo(14, 15); c.lineTo(9, 0); c.closePath(); c.fill();
  tiara(c);
  c.restore();
  c.restore();
}

// ------------------------------------------------------------------ the page
function withPage(c, v, fn) {
  const s = 1 / v.cam.mpp;
  c.save();
  c.translate(v.wx(P_OCT.x), v.wy(P_OCT.y));
  c.scale(s, s);
  fn(s);
  c.restore();
}

function header(c) {
  const cx = (TITLE_BOX.x0 + TITLE_BOX.x1) / 2, w = TITLE_BOX.x1 - TITLE_BOX.x0;
  c.save();
  c.textBaseline = 'alphabetic';
  c.fillStyle = L.rgba(INKC);
  const tr = 9;
  const size = L.fitSize(c, 'OCTOBER', w - tr * 7, 88, 600, SERIF, 40);
  c.font = serif(size, 600);
  L.trackedText(c, 'OCTOBER', cx, Y0 + 140, tr, 'center');
  c.fillStyle = L.rgba(RUBRIC);
  const ss = L.fitSize(c, 'Anno Domini MDLXXXII · 1582', w - 40, 32, 600, SERIF, 16);
  c.font = serif(ss, 600, 'italic');
  L.trackedText(c, 'Anno Domini MDLXXXII · 1582', cx, Y0 + 190, 3, 'center');
  c.restore();
}

function seam(c, k) {
  if (k <= 0) return;
  const xs = GX0 + 5 * CW, ya = GY0 - 8, yb = GY0 + CH + 8;
  const yk = L.lerp(ya, yb, k);
  c.save();
  c.strokeStyle = L.rgba(RUBRIC, 0.9);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = 3.2;
  c.beginPath();
  for (let y = ya, i = 0; y <= yk; y += 9, i++) c.lineTo(xs + (i % 2 ? 5 : -5) + L.noise1(i * 0.9, 4) * 1.5, y);
  c.stroke();
  c.lineWidth = 1;
  c.globalAlpha = 0.6;
  c.beginPath(); c.moveTo(xs - 10, ya); c.lineTo(xs - 10, yk); c.moveTo(xs + 10, ya); c.lineTo(xs + 10, yk); c.stroke();
  c.restore();
}

function note(c, k) {
  if (k <= 0) return;
  // "−10 DAYS" in rubric, centred in the empty cells beside 31 (row 3, columns 1–6)
  const x = GX0 + 4 * CW, y = GY0 + 3.5 * CH;
  c.save();
  c.globalAlpha *= k;
  c.fillStyle = L.rgba(RUBRIC);
  c.textBaseline = 'middle';
  const txt = '−10 DAYS';
  const size = L.fitSize(c, txt, 5 * CW - 70, 66, 700, SERIF, 30);
  c.font = serif(size, 700);
  c.translate(x, y + (1 - k) * 8);
  c.rotate(-0.03);
  c.scale(1 + 0.15 * (1 - k), 1 + 0.15 * (1 - k));
  L.trackedText(c, txt, 0, 0, 6, 'center');
  c.restore();
}

export default {
  beat: 8,
  chapter: { num: '07', title: 'Gregory XIII', sub: 'Inter gravissimas, February 1582' },
  layer: 1,
  cues() {
    return [
      { t: TEAR.stamp + 0.28, name: 'impact', gain: 0.4, pitch: 0.75 },
      { t: TEAR.stamp + 0.3, name: 'deep', gain: 0.22, pitch: 0.9 },
      { t: TEAR.rip, name: 'creak', gain: 0.3, pitch: 1.6 },
      { t: TEAR.dock, name: 'swish', gain: 0.26, pitch: 0.8 },
      { t: TEAR.reflow0 + 0.1, name: 'tick', gain: 0.16, pitch: 1.2 },
      { t: TEAR.land + 0.35, name: 'tick', gain: 0.22, pitch: 0.8 },
      { t: TEAR.strike, name: 'swish', gain: 0.18, pitch: 1.5 },
    ];
  },
  drawWorld(c, v) {
    // beat 12's swoop drags the page across the HUD: fade it out, back in for the home shot
    const b12 = v.tl.scenes[12].start, b13 = v.tl.scenes[13].start;
    const dk = deskK(v) * (1 - L.ease.inOutCubic(L.prog(v.gt, b12, 0.4)) * (1 - L.ease.inOutCubic(L.prog(v.gt, b13 - 0.45, 0.45))));
    if (dk <= 0) return;
    const lay = OCT_LAYOUT;
    if (v.wx(lay.x0) > L.W + 80 || v.wx(lay.x1) < -80 || v.wy(lay.y0) > L.H + 80 || v.wy(lay.y1) < -80) return;
    const st = octState(v.gt, v.tl);
    drawMonthPage(c, v, { P: P_OCT, days: [], alpha: dk, seed: 7 });
    withPage(c, v, () => {
      c.globalAlpha *= dk;
      header(c);
      // the scar where the pieces came away (heals as 15–24 slide in)
      const scarK = L.clamp(st.rip * 1.5) * (1 - E.inOutCubic(L.prog(st.reflowT, 0.25, 0.55)));
      if (st.rip > 0) drawScar(c, scarK);
      // the days that stay: 1–4 in place; 15–31 flow back TEN places in reading order, like reflowed text: every
      // numeral slides left along its row, slips out of the Sunday column and re-enters the row above from the
      // Saturday side (clipped to the grid), so spacing is kept and nothing ever crosses: 15 arrives under FRIDAY.
      const flow = E.inOutCubic(L.prog(st.reflowT, 0, TEAR.reflow1 - TEAR.reflow0));
      c.save();
      c.beginPath(); c.rect(GX0, GY0, 7 * CW, 5 * CH); c.clip();
      for (const [d, j] of JUL) {
        if (GONE(d)) continue;
        const hl = (d === 4 || d === 15) ? st.seam : 0;
        if (d < 15) { const q = cellL(j.r, j.col); dayNumeral(c, q.x, q.y, CH, d, { color: L.mix(j.col === 0 ? RUBRIC : INKC, RUBRIC, hl) }); continue; }
        const q = (j.r * 7 + j.col) - 10 * flow;          // continuous slot index
        const r = Math.floor(q / 7), fc = q - 7 * r;     // row, fractional column (0..7)
        const sunday = L.clamp(1.5 - 2 * Math.abs(fc));
        const col = L.mix(L.mix(INKC, RUBRIC, sunday), RUBRIC, hl);
        const y = GY0 + CH * (r + 0.5);
        dayNumeral(c, GX0 + CW * (fc + 0.5), y, CH, d, { color: col });
        if (fc < 1) dayNumeral(c, GX0 + CW * (fc + 7.5), y - CH, CH, d, { color: L.mix(INKC, RUBRIC, hl) });   // entering the row above
      }
      c.restore();
      // before the rip, the ten days are ordinary printed numerals
      if (st.rip <= 0) for (let d = 5; d <= 14; d++) { const j = JUL.get(d); const q = cellL(j.r, j.col); dayNumeral(c, q.x, q.y, CH, d, { color: j.col === 0 ? RUBRIC : INKC }); }
      seam(c, st.seam);
      note(c, st.note);
      // the papal seal strikes the header's right corner
      if (st.stamp > 0) {
        const k = st.stamp, e = E.outCubic(k);
        c.save();
        c.translate(SEAL.x, SEAL.y);
        // descending shadow, then the impact ring
        if (k < 1) { c.fillStyle = `rgba(40,20,10,${0.18 * e})`; c.beginPath(); c.arc(8 * (1 - e), 12 * (1 - e), SEAL.r * (1.1 - 0.1 * e), 0, Math.PI * 2); c.fill(); }
        if (st.shock > 0 && st.shock < 1) {
          const q = E.outCubic(st.shock);
          c.strokeStyle = L.rgba(RUBRIC, 0.45 * (1 - q));
          c.lineWidth = 2.5 * (1 - q) + 0.5;
          c.beginPath(); c.arc(0, 0, SEAL.r + 8 + 46 * q, 0, Math.PI * 2); c.stroke();
        }
        const sc = 1 + 0.55 * Math.pow(1 - e, 2);
        c.rotate(-0.16 + 0.1 * e);
        c.scale(sc, sc);
        seal(c, L.clamp(k * 2.2) * (k < 1 ? 0.92 : 1));
        c.restore();
      }
      // the three torn pieces → one strip
      if (st.rip > 0) {
        const lit = st.lift * (1 - st.land);
        const order = [PIECES[0], PIECES[1], PIECES[2]];
        // shadows first (one soft layer), then the paper
        for (const p of order) {
          const q = piecePose(p, st);
          const off = { x: 3 + 12 * q.h, y: 4 + 24 * q.h };
          c.save();
          c.translate(q.x + off.x, q.y + off.y);
          c.rotate(q.rot);
          c.scale(q.sc, q.sc);
          c.filter = `blur(${(1.5 + 10 * q.h).toFixed(2)}px)`;
          piecePath(c, p);
          c.fillStyle = `rgba(30,18,8,${(0.12 + 0.22 * q.h) * L.clamp(st.rip * 2)})`;
          c.fill();
          c.restore();
        }
        for (const p of order) {
          const q = piecePose(p, st);
          c.save();
          c.translate(q.x, q.y);
          c.rotate(q.rot);
          c.scale(q.sc, q.sc);
          drawPiece(c, p, { lit, strike: st.strike, paperK: 1 });
          // the running tear: a dark crack drawn round the outline as it rips
          if (st.rip < 1) {
            piecePath(c, p);
            const per = 2 * (p.w + CH);
            c.setLineDash([per * st.rip, per]);
            c.strokeStyle = L.rgba([60, 38, 18], 0.75);
            c.lineWidth = 1.8;
            c.stroke();
            c.setLineDash([]);
          }
          c.restore();
        }
      }
    });
  },
  drawOverlay() {},
};
