// Beat 0 — the hook. "Why does a week have seven days?"
// A premium paper calendar page (CAL) floats in the dark. SEPTEMBER curls up and away over its binding (a strip-built
// page curl with perspective, a back side, a cast shadow) to reveal OCTOBER; a light sweep runs across the fresh page.
// The masked headline "WHY DOES A WEEK / HAVE 7 DAYS?" rises word by word ("7 DAYS?" set in ink on an accent bar).
//
// This scene OWNS THE PAGE in drawWorld for beats 0-2 (it rides the camera's tilt-up in beat 2 and is gone by beat 3).
// It also paints s01's "Except the week" row highlight (cellTint), so the tint rides the page with no seams.
// The headline is drawn in drawWorld (screen space): overlays are gated by the beat fade-in and frame 0 must read.
//
// Exports (for s01): pageLayout(), weekRowK(gt, tl), WEEK_ROW, TODAY.
import * as L from '../../../../engine/runtime/lib.js';
import { CAL, MONTH, ACCENT, PAPER, INKC, drawCalendarPage, calLayout } from '../env.js';

const { W, H } = L;
export const TODAY = 20;                                         // 20 October 2026 (column 2, row 3)
export const WEEK_ROW = Math.floor((MONTH.first + TODAY - 1) / 7); // the week row that lights up on "Except the week"
const SEPT = { month: 'SEPTEMBER', first: 2, days: 30 };         // 1 Sept 2026 is a Tuesday
const FLIP = { t0: 0.08, dur: 0.8 };                             // the curl (beat-local seconds)

export const pageLayout = () => calLayout(CAL);

/** 0..1 per column: the week row's accent wash, wiping left to right on "Except the week" (s01's phrase 2). */
export function weekRowK(gt, tl, col) {
  const ph = tl.lines[1].phrases?.[1];
  const t0 = (ph ? ph.start : tl.scenes[1].start + 3.3) - 0.05;
  return L.ease.outCubic(L.prog(gt, t0 + col * 0.075, 0.35));
}

// ------------------------------------------------------------------ the page curl
let offC = null;
/** SEPTEMBER, rendered flat into an offscreen layer, then laid back down as horizontal strips that curl up around the
 *  binding (theta grows along the page = a curl), with a perspective widening as the strips come toward the viewer. */
function drawFlip(c, v, kPage) {
  const p = L.prog(v.t, FLIP.t0, FLIP.dur);
  if (p >= 1 || kPage <= 0) return;
  const lay = pageLayout();
  const s = v.ws(1);
  const px = v.wx(lay.left), pw = lay.w * s;
  const hinge = v.wy(lay.top + lay.bind);                        // the strips hang from the binding's lower edge
  const bot = v.wy(lay.top + lay.h);
  const ph = bot - hinge;
  if (ph < 4) return;
  if (!offC) offC = new OffscreenCanvas(W, H);
  const oc = offC.getContext('2d');
  oc.setTransform(1, 0, 0, 1, 0, 0);
  oc.globalAlpha = 1;
  oc.globalCompositeOperation = 'source-over';
  oc.clearRect(0, 0, W, H);
  drawCalendarPage(oc, v, { ...CAL, ...SEPT, k: 1, shadow: 0, today: 0 });

  const e = L.ease.inOutCubic(p);
  const th = Math.PI * 0.8 * e;                                 // hinge angle (0 = hanging, π = flipped over the top)
  const curl = 0.75 * Math.sin(Math.PI * Math.min(1, p * 1.15)); // extra bend toward the free edge (radians)
  const fade = 1 - L.ease.inOutCubic(L.prog(p, 0.4, 0.3));
  const N = Math.max(24, Math.min(110, Math.round(ph / 6)));
  const ds = ph / N;
  const cx = px + pw / 2;

  // cast shadow on OCTOBER: strongest just below the lifted edge, fading as the page leaves
  let y = hinge, z = 0;
  const strips = [];
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    const a = th + curl * u * u;
    const dy = Math.cos(a) * ds, dz = Math.sin(a) * ds;
    strips.push({ i, y0: y, y1: y + dy, z0: z, z1: z + dz, a });
    y += dy; z += dz;
  }
  const edgeY = y;
  c.save();
  c.globalAlpha *= kPage;
  {
    const sh = Math.sin(Math.min(Math.PI / 2, th + curl)) * fade;
    const yb = Math.max(hinge, edgeY);
    const g = c.createLinearGradient(0, yb, 0, yb + 160);
    g.addColorStop(0, `rgba(10,8,6,${0.32 * sh})`);
    g.addColorStop(1, 'rgba(10,8,6,0)');
    c.save();
    c.beginPath(); c.rect(px, hinge, pw, bot - hinge); c.clip();
    c.fillStyle = g; c.fillRect(px, yb, pw, 160);
    // the whole page under a lifted sheet is a touch darker (occlusion)
    c.fillStyle = `rgba(10,8,6,${0.12 * sh})`;
    c.fillRect(px, yb, pw, bot - yb);
    c.restore();
  }
  // strips: back side first is not needed (one sheet); draw in order from hinge to edge
  c.globalAlpha *= fade;
  const persp = 0.0006;                                          // x widening per px of depth toward the viewer
  for (const st of strips) {
    const zm = (st.z0 + st.z1) / 2;
    const sx = 1 + persp * zm;
    const front = Math.cos(st.a) > 0;
    const yTop = Math.floor(Math.min(st.y0, st.y1)), hh = Math.ceil(Math.max(st.y0, st.y1)) - yTop + 1;
    const dw = pw * sx, dx = cx - dw / 2;
    if (front) {
      c.drawImage(offC, px, hinge + st.i * ds, pw, ds, dx, yTop, dw, hh);
      // light: the sheet catches the light as it tilts toward the viewer, darkens near edge-on
      const lit = Math.sin(st.a);
      const shade = Math.abs(Math.cos(st.a));
      if (lit > 0.02) {
        c.fillStyle = `rgba(255,252,240,${0.22 * lit * shade})`;
        c.fillRect(dx, yTop, dw, hh);
      }
      if (shade < 0.5) { c.fillStyle = `rgba(30,24,18,${0.5 * (0.5 - shade)})`; c.fillRect(dx, yTop, dw, hh); }
    } else {
      // the back of the sheet: warm paper, a faint grey show-through, darker toward edge-on
      const shade = Math.abs(Math.cos(st.a));
      const col = L.mix([150, 138, 120], PAPER, 0.35 + 0.5 * shade);
      c.fillStyle = L.rgba(col);
      c.fillRect(dx, yTop, dw, hh);
    }
  }
  // the free edge: a crisp highlight line
  {
    const zm = z, sx = 1 + persp * zm, dw = pw * sx;
    c.strokeStyle = 'rgba(255,250,236,0.55)';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(cx - dw / 2, edgeY); c.lineTo(cx + dw / 2, edgeY); c.stroke();
  }
  c.restore();
}

/** A soft diagonal sheen that crosses the fresh OCTOBER page once the curl has cleared it. */
function drawSweep(c, v, kPage) {
  const p = L.prog(v.t, 0.85, 1.25);
  if (p <= 0 || p >= 1) return;
  const lay = pageLayout();
  const s = v.ws(1);
  const px = v.wx(lay.left), py = v.wy(lay.top), pw = lay.w * s, ph = lay.h * s;
  const e = L.ease.inOutCubic(p);
  const span = pw + ph;
  const d = -0.3 * span + e * 1.6 * span;                        // band position along the diagonal
  c.save();
  L.roundRect(c, px, py, pw, ph, Math.max(1, 0.012 * pw));
  c.clip();
  const g = c.createLinearGradient(px + d - 160, py, px + d + 160, py + ph * 0.35);
  const a = 0.28 * Math.sin(Math.PI * p) * kPage;
  g.addColorStop(0, 'rgba(255,255,250,0)');
  g.addColorStop(0.5, `rgba(255,253,244,${a})`);
  g.addColorStop(1, 'rgba(255,255,250,0)');
  c.fillStyle = g;
  c.fillRect(px, py, pw, ph);
  c.restore();
}

// ------------------------------------------------------------------ headline
function drawHeadline(c, v) {
  const t = v.t;
  const kout = L.ease.inCubic(L.prog(t, v.d - 0.5, 0.45));
  if (kout >= 1) return;
  // exit: each word rises out through its mask (staggered), the bar wipes away to the right
  // (exit = the whole title + its accent bar leave together as one group: a fade with a short rise; the bar never
  //  collapses around the '?' on its own)
  const wout = () => 0;
  const size = 104, lh = 116;
  const yb2 = 566, yb1 = yb2 - lh;                               // baselines (band y 380-620)
  c.save();
  c.globalAlpha *= 1 - kout;
  c.translate(0, -70 * kout);
  c.textBaseline = 'alphabetic';
  // soft dark backing keeps the type off the page's paper glow
  const bg = c.createRadialGradient(W / 2, yb2 - 70, 30, W / 2, yb2 - 70, 560);
  bg.addColorStop(0, `rgba(2,4,10,${0.5 * (1 - kout)})`);
  bg.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = bg;
  c.fillRect(0, yb2 - 640, W, 1140);
  c.font = L.font(size, 800, L.FONT.display);
  const sp = 24;
  const lines = [[['WHY', 0], ['DOES', 0], ['A', 0], ['WEEK', 0]], [['HAVE', 0], ['7 DAYS?', 1]]];
  lines.forEach((words, li) => {
    const ws = words.map(([w]) => c.measureText(w).width);
    const padBar = 22;
    const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1) + (li === 1 ? padBar * 2 : 0);
    let x = W / 2 - total / 2;
    const yb = li ? yb2 : yb1;
    words.forEach(([w, acc], wi) => {
      // negative starts: line 1 is already rising on frame 0 (first-frame / thumbnail test); the accent word lands last
      const st = acc ? 0.3 : -0.3 + li * 0.34 + wi * 0.07;
      const e = L.ease.outQuint(L.prog(t, st, 0.7));
      if (acc) x += padBar;
      if (e > 0 || (acc && t > st - 0.08)) {
        if (acc) {
          // the accent bar wipes in from the left, then the ink type rises inside it
          const be = L.ease.outCubic(L.prog(t, st - 0.08, 0.5));
          const bo = 0;
          const full = ws[wi] + padBar * 2;
          const bx = x - padBar + full * bo, bw = Math.max(0, full * be - full * bo);
          c.save();
          if (bw <= 1) c.globalAlpha = 0;            // no hairline (or its shadow) once the bar has wiped away
          c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 24; c.shadowOffsetY = 6;
          c.fillStyle = L.rgba(ACCENT);
          L.roundRect(c, bx, yb - size * 0.86, bw, size * 1.02, 8);
          c.fill();
          c.restore();
        }
        c.save();
        c.beginPath();
        if (acc) {
          // the ink type lives inside the bar: it is revealed by the wipe-in and leaves with the wipe-out
          const full = ws[wi] + padBar * 2;
          const be = L.ease.outCubic(L.prog(t, st - 0.08, 0.5));
          const bo = 0;
          const bx = x - padBar + full * bo, bw = Math.max(0, full * be - full * bo);
          c.rect(bx, yb - size * 0.9, bw, size * 1.08);
        } else c.rect(x - 12, yb - size * 0.9, ws[wi] + 24, size * 1.08);
        c.clip();
        const wo = wout(li, wi);
        c.globalAlpha = L.clamp(e * 1.6) * (1 - wo * wo);
        const dy = (1 - e) * size * 0.95 - wo * size * 1.0;
        if (acc) {
          c.fillStyle = L.rgba(INKC);
          c.fillText(w, x, yb + dy);
          // one warm glint across the bar once it has landed
          const gp = L.prog(t, 1.25, 0.8);
          if (gp > 0 && gp < 1) {
            const gx = x - 120 + (ws[wi] + 240) * L.ease.inOutCubic(gp);
            const gg = c.createLinearGradient(gx - 80, 0, gx + 80, 0);
            gg.addColorStop(0, 'rgba(255,248,225,0)');
            gg.addColorStop(0.5, 'rgba(255,250,232,0.55)');
            gg.addColorStop(1, 'rgba(255,248,225,0)');
            c.globalCompositeOperation = 'lighter';
            c.fillStyle = gg;
            c.fillRect(x - padBar, yb - size * 0.86, ws[wi] + padBar * 2, size * 1.02);
          }
        } else {
          c.fillStyle = 'rgb(244,240,232)';
          c.shadowColor = 'rgba(0,0,0,0.6)';
          c.shadowBlur = 22;
          c.fillText(w, x, yb + dy);
        }
        c.restore();
      }
      x += ws[wi] + sp + (acc ? padBar : 0);
    });
  });
  c.restore();
}

// ------------------------------------------------------------------ scene
/** Page visibility: whole through beats 0-2, dissolving as the camera pulls back to the Moon's orbit (beat 3). */
function pageK(v) {
  const t3 = v.tl.scenes[3].start;
  if (v.gt > t3 + 1.2) return 0;
  // beat 2: the page clears out fast as the camera tilts up (before the caption band / the motion-blur streak)
  const t2 = v.tl.scenes[2].start;
  return (1 - L.ease.inOutCubic(L.prog(v.gt, t2 - 0.22, 0.4))) * (1 - L.ease.inOutCubic(L.prog(v.gt, t3 - 0.05, 0.7))) * (1 - L.clamp(L.invLerp(1.3, 2.2, v.cam.mpp)));
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 0,
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.24, pitch: 0.75 },
      { t: 0.12, name: 'swish', gain: 0.26, pitch: 0.8 },        // the page curls away
      { t: 0.5, name: 'creak', gain: 0.07, pitch: 1.8 },          // paper
      { t: 0.05, name: 'tick', gain: 0.1, pitch: 1.3 },           // line 1 lands
      { t: 0.36, name: 'impact', gain: 0.16, pitch: 1.2 },        // "7 DAYS?" bar
      { t: 0.95, name: 'shimmer', gain: 0.12, pitch: 1.3 },       // light sweep
      { t: d - 0.6, name: 'riser', gain: 0.12, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt > v.tl.scenes[3].start + 1.2) return;             // never again (the dive in beat 7 passes similar zooms)
    const k = pageK(v);
    if (k > 0) {
      const t1 = v.tl.scenes[1].start;
      const tint = (col, row) => {
        if (row !== WEEK_ROW || v.gt < t1) return null;
        const w = weekRowK(v.gt, v.tl, col);
        return w > 0 ? [ACCENT, 0.42 * w] : null;
      };
      drawCalendarPage(ctx, v, { ...CAL, k, today: v.gt < t1 + 0.6 ? TODAY : 0, cellTint: tint });
      if (v.t < FLIP.t0 + FLIP.dur) drawFlip(ctx, v, k);
      drawSweep(ctx, v, k);
      // before the curl starts the page in front is SEPTEMBER (drawn by drawFlip at p = 0)
      if (v.t < FLIP.t0 && v.t > -0.5) drawFlipStill(ctx, v, k);
    }
    if (v.t < v.d + 0.1) { ctx.save(); drawHeadline(ctx, v); ctx.restore(); }
  },
};

/** Before the curl begins (frame 0 to FLIP.t0): SEPTEMBER lies flat over OCTOBER. */
function drawFlipStill(c, v, k) {
  drawCalendarPage(c, v, { ...CAL, ...SEPT, k, shadow: 0, today: 0 });
}
