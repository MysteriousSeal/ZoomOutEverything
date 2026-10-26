// Beat 6 — the payoff: count the US national debt at $1 per second.
// The camera pulls back to 3.7e13 s and the whole trillion span (with all of history) is squeezed into a glowing
// sliver near NOW. An odometer races to $37,000,000,000,000 while a gold "stack of bills" span draws down at
// $1 = 1 s; Homo sapiens and Homo erectus markers slide in as its head passes them. The counter folds into
// "$37+ TRILLION" and the payoff lands: "1,000,000+ years".
import * as L from '../../../../engine/runtime/lib.js';
import { SPINE_X, ACCENT, YEAR } from '../env.js';

const { ease, clamp, lerp, prog, rgba } = L;
const TAU = Math.PI * 2;

const DEBT = 37e12;                    // dollars = seconds
const TRILLION = 1e12;
const SAPIENS = 300000 * YEAR;
const ERECTUS = 1e6 * YEAR;
const WARM = [245, 232, 205];
const GOLD_HI = [255, 238, 190];
const SX0 = SPINE_X + 20, SX1 = SPINE_X + 46;   // debt span, screen x
const TX = 318;                                  // text column x

// seconds from beat start. Phrase A "And counting the US national debt, one dollar per second," 0.15–3.55;
// phrase B "would take over a million years." 4.15–5.83 ("million" ≈ 5.0).
const T = {
  sliver: 1.62,                 // camera lands (travel ends ~1.75): the squeezed trillion span flashes + gets its label
  cIn: 0.7,                     // dim odometer at rest appears on "counting": the anchor during the pull-back
  run0: 1.3, run: 2.25,         // the count / span run, lands at 3.55 = end of "one dollar per second" (25.1 s)
  morph: 4.2,                   // ",000,000,000,000" folds into "+ TRILLION"
  lift: 4.35,                   // counter shrinks and moves up to make room
  payoff: 4.7,                  // "1,000,000+ years" (lands just before "million")
  dimMarks: 4.5,                // markers step back for the payoff
  grow: 5.6,                    // the payoff number slowly scales up over the final hold
  recall: 5.9,                  // second glow on the sliver: "all of that is up here"
};
const runE = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** ONE shared value drives both the span head (seconds) and the odometer (dollars): $1 = 1 s. */
const debtAt = (t) => DEBT * runE(prog(t, T.run0, T.run));
/** time the head passes `s` seconds (inverse of the run easing, by bisection). */
function passT(s) {
  let a = 0, b = 1;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (DEBT * runE(m) < s) a = m; else b = m; }
  return T.run0 + a * T.run;
}
const T_SAP = passT(SAPIENS), T_ERE = passT(ERECTUS), T_LAND = T.run0 + T.run;

// ------------------------------------------------------------------ icons (unit: s = height in px, centred)
function iconHuman(ctx, x, y, s, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = rgba(WARM, 0.92 * a);
  ctx.beginPath(); ctx.arc(0.01, -0.41, 0.085, 0, TAU); ctx.fill();
  ctx.beginPath();
  // a standing figure in a calm three-quarter stance: shoulders, arms close, legs slightly apart
  ctx.moveTo(-0.02, -0.315);
  ctx.bezierCurveTo(-0.09, -0.31, -0.13, -0.29, -0.14, -0.22);
  ctx.lineTo(-0.165, -0.02); ctx.lineTo(-0.15, 0.06); ctx.lineTo(-0.125, 0.05);
  ctx.lineTo(-0.115, -0.13); ctx.lineTo(-0.1, -0.09);
  ctx.lineTo(-0.1, 0.06); ctx.lineTo(-0.09, 0.48); ctx.lineTo(-0.035, 0.49);
  ctx.lineTo(0.005, 0.12); ctx.lineTo(0.04, 0.49); ctx.lineTo(0.095, 0.48);
  ctx.lineTo(0.1, 0.06); ctx.lineTo(0.105, -0.09);
  ctx.lineTo(0.12, -0.13); ctx.lineTo(0.13, 0.05); ctx.lineTo(0.155, 0.06); ctx.lineTo(0.17, -0.02);
  ctx.lineTo(0.15, -0.22);
  ctx.bezierCurveTo(0.14, -0.29, 0.1, -0.31, 0.04, -0.315);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function iconHandAxe(ctx, x, y, s, a) {
  // Acheulean hand axe: a knapped teardrop, point up, with flake scars
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, -0.5);
  ctx.bezierCurveTo(0.12, -0.36, 0.28, -0.06, 0.27, 0.18);
  ctx.bezierCurveTo(0.26, 0.4, 0.13, 0.5, 0, 0.5);
  ctx.bezierCurveTo(-0.14, 0.5, -0.27, 0.39, -0.27, 0.16);
  ctx.bezierCurveTo(-0.27, -0.08, -0.11, -0.37, 0, -0.5);
  ctx.closePath();
  const g = ctx.createLinearGradient(-0.3, -0.5, 0.3, 0.5);
  g.addColorStop(0, rgba([226, 196, 140], a));
  g.addColorStop(1, rgba([150, 118, 74], a));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.022;
  ctx.strokeStyle = rgba(GOLD_HI, 0.7 * a);
  ctx.stroke();
  ctx.clip();
  // flake scars: arcs from the edges toward the midline
  ctx.strokeStyle = rgba([70, 50, 28], 0.45 * a);
  ctx.lineWidth = 0.018;
  const scars = [[-0.27, 0.05, 0.2], [-0.24, 0.3, 0.18], [-0.15, -0.22, 0.16], [0.27, 0.1, 0.2], [0.22, 0.34, 0.17], [0.14, -0.2, 0.15], [0, 0.5, 0.18]];
  for (const [cx, cy, r] of scars) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, TAU); ctx.stroke(); }
  ctx.strokeStyle = rgba(GOLD_HI, 0.35 * a);
  ctx.beginPath(); ctx.moveTo(0, -0.46); ctx.quadraticCurveTo(0.02, 0, -0.01, 0.46); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ a history marker that slides in from the right
function drawMarker(ctx, v, s, t0, icon, name, sub, dy = 0) {
  const k = prog(v.t, t0 - 0.05, 0.55);
  if (k <= 0) return;
  const e = ease.outCubic(k);
  const y = v.wy(s);
  const dim = lerp(1, 0.3, ease.inOutCubic(prog(v.t, T.dimMarks, 0.5)));
  const slide = (1 - e) * 70;
  ctx.save();
  // hairline from the span edge, drawing out
  ctx.strokeStyle = rgba(WARM, 0.55 * dim);
  ctx.lineWidth = 1.5;
  // (dy > 0: the label hangs a little below its notch, e.g. to stay clear of the caption band)
  ctx.beginPath(); ctx.moveTo(SX1 + 4, y); ctx.lineTo(SX1 + 4 + 20 * e, y); ctx.lineTo(SX1 + 4 + 44 * e, y + dy * e); ctx.stroke();
  ctx.fillStyle = rgba(GOLD_HI, dim);
  ctx.beginPath(); ctx.arc(SX1 + 4, y, 3.5, 0, TAU); ctx.fill();
  // icon + two-line label
  ctx.globalAlpha = clamp(k * 1.6);
  const ly = y + dy;
  icon(ctx, SX1 + 82 + slide, ly, 62, dim);
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.font = L.font(28, 700, L.FONT.body);
  ctx.fillStyle = rgba(WARM, 0.96 * dim);
  L.trackedText(ctx, name, SX1 + 124 + slide * 1.3, ly - 15, 3);
  ctx.font = L.font(23, 600, L.FONT.body);
  ctx.fillStyle = rgba(ACCENT, 0.95 * dim);
  L.trackedText(ctx, sub, SX1 + 124 + slide * 1.5, ly + 17, 2);
  ctx.restore();
}

// ------------------------------------------------------------------ the debt span: a gold stack of bills
function drawDebtSpan(ctx, v) {
  const D = debtAt(v.t);
  if (D <= 0) return;
  const y0 = v.wy(0), hy = v.wy(D);
  const h = hy - y0;
  if (h < 0.5) return;
  const running = v.t < T_LAND;
  ctx.save();
  // body: dim near NOW, bright toward the head (trailing gradient)
  const g = ctx.createLinearGradient(0, y0, 0, hy);
  g.addColorStop(0, rgba(ACCENT, 0.45));
  g.addColorStop(Math.max(0, 1 - 220 / h), rgba(ACCENT, 0.78));
  g.addColorStop(1, rgba(GOLD_HI, 0.95));
  ctx.fillStyle = g;
  ctx.fillRect(SX0, y0, SX1 - SX0, h);
  // bill edges: fine horizontal lines, a stack of notes seen from the side
  ctx.fillStyle = 'rgba(60,38,6,0.22)';
  for (let y = y0 + 4; y < hy - 2; y += 5) ctx.fillRect(SX0, y, SX1 - SX0, 1);
  // lit left edge, shaded right edge
  ctx.fillStyle = rgba(GOLD_HI, 0.5);
  ctx.fillRect(SX0, y0, 1.5, h);
  ctx.fillStyle = 'rgba(30,20,5,0.35)';
  ctx.fillRect(SX1 - 3, y0, 3, h);
  // secondary motion after landing: a glint that travels down the stack
  if (!running) {
    const gp = ((v.t - T_LAND) * 0.55) % 1.6;
    if (gp < 1) {
      const gy = lerp(y0, hy, ease.inOutCubic(gp));
      const gg = ctx.createLinearGradient(0, gy - 90, 0, gy + 90);
      gg.addColorStop(0, 'rgba(255,245,220,0)');
      gg.addColorStop(0.5, 'rgba(255,245,220,0.45)');
      gg.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(SX0, Math.max(y0, gy - 90), SX1 - SX0, 180);
    }
  }
  // caption band (y ~1290-1380): the stack passes "under" the caption, darkened so caption words crossing x≈262 stay legible
  {
    const b0 = 1262, b1 = 1408;
    const cy0 = Math.max(y0, b0), cy1 = Math.min(hy, b1);
    // only while captions are up: the last caption ("…a million years.") clears ~lineEnd+0.9 ≈ 6.7 s into the beat
    const ck = 1 - ease.inOutCubic(prog(v.t, 6.74, 0.4));
    if (cy1 > cy0 && ck > 0.001) {
      ctx.globalAlpha = ck;
      const cg = ctx.createLinearGradient(0, b0, 0, b1);
      cg.addColorStop(0, 'rgba(6,8,14,0)');
      cg.addColorStop(0.3, 'rgba(6,8,14,0.72)');
      cg.addColorStop(0.7, 'rgba(6,8,14,0.72)');
      cg.addColorStop(1, 'rgba(6,8,14,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(SX0 - 2, cy0, SX1 - SX0 + 4, cy1 - cy0);
      ctx.globalAlpha = 1;
    }
  }
  // the head: bright cap, flare streak, glow
  const land = prog(v.t, T_LAND, 1.2);
  const pulse = 1 + 0.6 * Math.exp(-land * 4) * (land > 0 ? 1 : 0);
  const breathe = running ? 1 : 0.85 + 0.15 * Math.sin((v.t - T_LAND) * 2.4);
  ctx.fillStyle = 'rgba(255,250,235,0.98)';
  ctx.fillRect(SX0 - 3, hy - 3, SX1 - SX0 + 6, 4);
  const fl = ctx.createLinearGradient(SX0 - 110, 0, SX1 + 110, 0);
  fl.addColorStop(0, rgba(ACCENT, 0));
  fl.addColorStop(0.5, rgba(GOLD_HI, 0.55 * breathe));
  fl.addColorStop(1, rgba(ACCENT, 0));
  ctx.fillStyle = fl;
  ctx.fillRect(SX0 - 110, hy - 1.5, SX1 - SX0 + 220, 2);
  ctx.restore();
  L.lightBlob(ctx, (SX0 + SX1) / 2, hy, 80 * pulse, ACCENT, 0.55 * breathe);
  // landing ripple
  if (land > 0 && land < 1) {
    ctx.save();
    ctx.strokeStyle = rgba(ACCENT, 0.75 * (1 - land));
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc((SX0 + SX1) / 2, hy, Math.max(0, 14 + ease.outCubic(land) * 80), 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

// ------------------------------------------------------------------ the squeezed trillion span: a glowing sliver
// Everything the film has built (the whole trillion-second span, all of history) is now the top ~20 px. It flashes
// as the camera lands and carries a clear gold label on the right; it glows again during the payoff hold.
function drawSliver(ctx, v) {
  const k = ease.outCubic(prog(v.t, T.sliver, 0.5));
  if (k <= 0) return;
  const y0 = v.wy(0), y = v.wy(TRILLION);
  const flash = (t0) => (v.t > t0 ? Math.exp(-3.2 * (v.t - t0)) : 0);
  const f = Math.max(flash(T.sliver), 0.8 * flash(T.recall));
  ctx.save();
  // the sliver itself: a bright gold segment on the spine, NOW -> 1 trillion s
  ctx.fillStyle = rgba(GOLD_HI, 0.95 * k);
  ctx.fillRect(SPINE_X - 4, y0, 8, Math.max(2, y - y0));
  // its end tick crosses the debt span (the trillion is the top sliver of the debt too)
  ctx.fillRect(SPINE_X - 12, y - 1.5, SX1 - SPINE_X + 18, 3);
  L.lightBlob(ctx, SPINE_X, (y0 + y) / 2, 46 + 70 * f, ACCENT, (0.4 + 0.6 * f) * k);
  // landing ring
  for (const t0 of [T.sliver, T.recall]) {
    const r = prog(v.t, t0, 0.9);
    if (r > 0 && r < 1) {
      ctx.strokeStyle = rgba(GOLD_HI, 0.8 * (1 - r));
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(SPINE_X, (y0 + y) / 2, Math.max(0, 10 + ease.outCubic(r) * 44), 0, TAU); ctx.stroke();
    }
  }
  // leader from the sliver's end, past the debt span, to the label
  const lk = prog(v.t, T.sliver + 0.1, 0.45);
  const lx0 = SX1 + 8, lx1 = TX - 12;
  L.leader(ctx, lx0, y, lx1, y, lk, GOLD_HI, 0.7);
  // label: slides in from the right, gold headline + warm sub-line
  const tk = prog(v.t, T.sliver + 0.25, 0.55);
  if (tk > 0) {
    const e = ease.outCubic(tk);
    const dx = (1 - e) * 60;
    ctx.globalAlpha = clamp(tk * 1.6);
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 12;
    ctx.font = L.font(30, 700, L.FONT.body);
    ctx.fillStyle = rgba(L.mix(ACCENT, [255, 248, 228], 0.5 * f));
    L.trackedText(ctx, 'ALL OF THE LAST 31,700 YEARS', TX + dx, y - 2, 2.5);
    ctx.font = L.font(21, 600, L.FONT.body);
    ctx.fillStyle = rgba(WARM, 0.85);
    L.trackedText(ctx, '1 TRILLION SECONDS  ·  ALL OF HISTORY', TX + dx * 1.3, y + 30, 2.5);
  }
  ctx.restore();
}

// a faint connector from the running head to the odometer: this number IS this length
function drawLink(ctx, v) {
  const a = Math.min(prog(v.t, T.run0 + 0.35, 0.4), 1 - prog(v.t, T.run0 + T.run + 0.15, 0.5));
  if (a <= 0) return;
  const hy = v.wy(debtAt(v.t));
  const cy = 872 - 38;
  ctx.save();
  ctx.globalAlpha = a * v.k;
  ctx.strokeStyle = rgba(GOLD_HI, 0.45);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 6]);
  ctx.beginPath(); ctx.moveTo(SX1 + 8, hy); ctx.lineTo(TX - 14, cy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = rgba(GOLD_HI, 0.8);
  ctx.beginPath(); ctx.arc(TX - 14, cy, 3, 0, TAU); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ the odometer
const DIGITS = 14;   // 37,000,000,000,000
function drawCounter(ctx, v) {
  const kin = ease.outCubic(prog(v.t, T.cIn, 0.5));
  if (kin <= 0) return;
  const D = debtAt(v.t);
  const rate = (debtAt(v.t + 0.02) - debtAt(v.t - 0.02)) / 0.04;   // dollars per second of film
  const fold = ease.inOutCubic(prog(v.t, T.morph, 0.45));          // zeros fold away (width) ...
  const zeroA = 1 - ease.inCubic(prog(v.t, T.morph - 0.05, 0.22));  // ... after fading out quickly
  const trA = ease.outCubic(prog(v.t, T.morph + 0.22, 0.35));       // then "+ TRILLION" arrives
  const lift = ease.inOutCubic(prog(v.t, T.lift, 0.6));            // shrink + move up for the payoff
  const size = lerp(100, 64, lift);
  const x = TX, y = lerp(872, 856, lift) + (1 - kin) * 24;
  ctx.save();
  ctx.globalAlpha = Math.min(kin, v.k);
  ctx.textBaseline = 'alphabetic';
  ctx.font = L.font(size, 700, L.FONT.din);
  const dw = ctx.measureText('0').width;
  const cw = ctx.measureText(',').width * 1.1;
  const lh = size * 0.8;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 14;
  // "$"
  ctx.fillStyle = rgba(ACCENT);
  ctx.fillText('$', x, y);
  let cx = x + ctx.measureText('$').width + size * 0.04;
  const sig = D >= 1 ? Math.floor(Math.log10(D)) : 0;               // highest significant digit position
  let foldX = cx;
  for (let i = DIGITS - 1; i >= 0; i--) {
    const isZeroTail = i < 12;                                      // the 12 digits after "37"
    const fa = isZeroTail ? zeroA : 1;
    const lit = i <= sig ? 1 : 0.16;
    const col = i <= sig ? GOLD_HI : WARM;
    if (fa > 0.001) {
      const c = D / Math.pow(10, i);
      const base = Math.floor(c) % 10;
      const frac = c - Math.floor(c);
      // roll to the next digit only while this wheel turns slowly enough to read; fast wheels just tick
      const slow = rate / Math.pow(10, i) < 9;
      // (the trillions wheels start late, so the counter never reads above the span it measures)
      const r0 = i >= 12 ? 0.9 : 0.62;
      const roll = v.t < T_LAND && slow ? L.smoothstep(clamp((frac - r0) / (1 - r0))) : 0;
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - 2, y - size * 0.76, dw + 4, size * 0.8); ctx.clip();
      ctx.fillStyle = rgba(col, lit * fa * (1 - roll * 0.6));
      ctx.fillText(String(base), cx, y - roll * lh + (isZeroTail ? fold * 30 : 0));
      if (roll > 0.001) {
        ctx.fillStyle = rgba(col, lit * fa * (0.4 + roll * 0.6));
        ctx.fillText(String((base + 1) % 10), cx, y + (1 - roll) * lh);
      }
      ctx.restore();
    }
    const adv = dw * (isZeroTail ? 1 - fold : 1);
    cx += adv;
    if (i === 12) foldX = cx;
    if (i > 0 && i % 3 === 0) {
      const ca = (i <= sig ? 1 : 0.16) * (i <= 12 ? zeroA : 1);
      if (ca > 0.001) {
        ctx.fillStyle = rgba(i <= sig ? GOLD_HI : WARM, ca);
        ctx.fillText(',', cx + cw * 0.08, y);
      }
      cx += cw * (i <= 12 ? 1 - fold : 1);
    }
  }
  // "+ TRILLION"
  if (trA > 0) {
    ctx.globalAlpha = Math.min(kin, v.k) * trA;
    ctx.fillStyle = rgba(GOLD_HI);
    const px = foldX + size * 0.05;
    ctx.fillText('+', px, y);
    ctx.fillStyle = rgba([255, 246, 228]);
    ctx.fillText('TRILLION', px + ctx.measureText('+ ').width + (1 - trA) * 40, y);
  }
  // unit line under the odometer: what we are counting (leaves when the payoff takes over)
  const uk = Math.min(kin, 1 - ease.inCubic(prog(v.t, T.lift - 0.1, 0.35)));
  if (uk > 0) {
    ctx.globalAlpha = Math.min(uk, v.k);
    ctx.shadowBlur = 8;
    ctx.font = L.font(26, 600, L.FONT.body);
    ctx.fillStyle = rgba([205, 215, 230], 0.95);
    L.trackedText(ctx, 'US NATIONAL DEBT  ·  $1 = 1 SECOND', x, y + 50, 3);
  }
  ctx.restore();
}

const PX = 300, PY = 1092;  // payoff label anchor (below the shrunk counter, above the caption)
/** dark backing so the payoff reads over the span markers (drawn BEFORE the counter, so "$37+ TRILLION" stays bright) */
function drawPayoffBacking(ctx, v) {
  const k = clamp(Math.min(v.k, prog(v.t, T.payoff, 0.6)));
  if (k <= 0) return;
  const x = PX, y = PY;
  ctx.save();
  // dark backing so the payoff reads over the span markers
  ctx.globalAlpha = clamp(k * 1.5) * 0.8;
  const bg = ctx.createRadialGradient(x + 260, y - 60, 0, x + 260, y - 60, 460);
  bg.addColorStop(0, 'rgba(6,6,10,0.7)');
  bg.addColorStop(0.6, 'rgba(6,6,10,0.35)');
  bg.addColorStop(1, 'rgba(6,6,10,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(x - 220, y - 520, 1100, 900);
  ctx.restore();
}

function drawPayoff(ctx, v) {
  const k = clamp(Math.min(v.k, prog(v.t, T.payoff, 0.6)));
  if (k <= 0) return;
  const x = PX, y = PY;
  // the label slowly settles a few px over the long hold
  const drift = 8 * ease.inOutCubic(prog(v.t, T.payoff + 0.6, v.d - T.payoff));
  // lands at the house size, then grows ~1.25x (as wide as the frame allows) for the final hold
  const s0 = L.fitSize(ctx, '1,000,000+ years', 620, 116, 800, L.FONT.display, 60);
  const s1 = L.fitSize(ctx, '1,000,000+ years', 760, 150, 800, L.FONT.display, 60);
  const size = lerp(s0, s1, ease.inOutCubic(prog(v.t, T.grow - 0.9, 1.4)));
  L.bigLabel(ctx, { x, y: y - drift, big: '1,000,000+ years', small: 'to count it, $1 per second', k, accent: v.accent, size });
  // a soft light sweep across the number once it has landed
  const sp = prog(v.t, T.payoff + 0.9, 1.1);
  if (sp > 0 && sp < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.font = L.font(size, 800, L.FONT.display);
    const w = ctx.measureText('1,000,000+ years').width;
    const sx = lerp(x - 150, x + w + 150, ease.inOutCubic(sp));
    const g = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0);
    g.addColorStop(0, 'rgba(255,240,200,0)');
    g.addColorStop(0.5, 'rgba(255,240,200,0.35)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.letterSpacing = '-1px';
    ctx.fillText('1,000,000+ years', x, y - drift);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'The US national debt', sub: 'Counted at $1 per second' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: T.cIn, name: 'blip', gain: 0.22, pitch: 1.1 },
      { t: T.sliver, name: 'shimmer', gain: 0.22, pitch: 1.2 },
      { t: T.recall, name: 'ping', gain: 0.18, pitch: 1.3 },
      { t: T.run0, name: 'count', gain: 0.26, pitch: 1.0 },
      { t: T.run0 + 0.8, name: 'count', gain: 0.28, pitch: 1.12 },
      { t: T.run0 + 1.6, name: 'count', gain: 0.26, pitch: 1.25 },
      { t: T_LAND - 1.2, name: 'riser', gain: 0.18, pitch: 1 },
      { t: T_SAP, name: 'tick', gain: 0.3, pitch: 1 },
      { t: T_ERE, name: 'tick', gain: 0.3, pitch: 0.85 },
      { t: T_LAND, name: 'ping', gain: 0.34, pitch: 0.8 },
      { t: T.morph, name: 'swish', gain: 0.16, pitch: 1.1 },
      { t: T.payoff + 0.2, name: 'impact', gain: 0.55, pitch: 0.9 },
      { t: T.payoff + 0.25, name: 'bloom', gain: 0.32, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    drawDebtSpan(ctx, v);
    drawSliver(ctx, v);
    drawMarker(ctx, v, SAPIENS, T_SAP, iconHuman, 'HOMO SAPIENS', '300,000 YEARS AGO');
    drawMarker(ctx, v, ERECTUS, T_ERE, iconHandAxe, 'HOMO ERECTUS ERA', '≈ 1 MILLION YEARS AGO', 18);
  },
  drawOverlay(ctx, v) {
    drawLink(ctx, v);
    drawPayoffBacking(ctx, v);
    drawCounter(ctx, v);
    drawPayoff(ctx, v);
  },
};
