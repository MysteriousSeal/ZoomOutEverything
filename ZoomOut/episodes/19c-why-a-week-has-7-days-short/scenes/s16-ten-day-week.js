// Beat 16 — 19: "Revolutionary France tried a ten-day week in seventeen ninety-three. | It lasted twelve years."
// 19c (beat 10): "France's ten-day week lasted twelve years." — same act, compressed timing (TIMES); the Soviet 5-day
// page is plain (no worker-group colours: that is the closing question's answer).
//
// OWNS THE SEVEN LIGHTS AND THE WEEK PAGE FROM BEAT 16 TO THE END OF THE FILM (env stops drawing the lights at the
// beat-16 start). drawWorld runs every frame, so this one module draws the whole of act III:
//   beat 16  the weekday column swings (a whip: the Sun is the pivot, the others lag a little) into the dark header
//            band of a paper page that unrolls beneath it; then, on "ten-day week", the grid RE-FLOWS to 10 columns
//            (a 30-day Republican month: three décades). Three ghost header slots join the seven lights.
//   beat 17  (s17 times it) 10 → 5 columns (19c: plain, no colour groups), 5 → 6, and a snap back to 7.
//   beat 18  (s18 adds ghost pages + the hero) the year rolls 1940 → 2026, the header lights glow in sequence.
// The re-flow: every day number travels from its cell in the old layout to its cell in the new one, staggered by
// day (like text re-wrapping); grid hairlines slide (extra ones emerge from the right edge); rest-day tints ride
// with their cells; the lights hop to their new header slots (the ones without a slot are "benched" above the page).
//
// Exports used by s15 / s17 / s18: PAGE, pageLayout, headerLightPos, weekStateAt, daysLabel, TIMES.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INKC, LIGHTS, COL, colPos, calLayout, drawCalendarPage, drawLight, lightSize, lightEmphasis } from '../env.js';
import { adapt, legacy, LT as LT0 } from '../legacy.js';

const { W } = L;
const CREAM = [244, 239, 230];

// ------------------------------------------------------------------ the page (world u)
// A little shorter than CAL2 so the "N DAYS" label has the sky above it (page top ≈ y 560 at the beat-16 framing,
// bottom ≈ 1236: clear of the captions).
export const PAGE = { x: 0.5, y: -266.61, w: 11.0, h: 9.6 };

// ------------------------------------------------------------------ the week states
const WEST = { cols: 7, rows: 5, first: 4, days: 31 };
const FR = { cols: 10, rows: 3, first: 0, days: 30 };
// Soviet pages keep October's 31 days: the 31st falls outside the grid (it sat outside the week), so it is set
// small and grey in the last cell's corner (the old "30/31" printers' convention).
const SU5 = { cols: 5, rows: 6, first: 0, days: 31 };
const SU6 = { cols: 6, rows: 5, first: 0, days: 31 };
const WEST40 = { cols: 7, rows: 5, first: 2, days: 31 };   // October 1940: the 1st was a Tuesday
// rest-day / group tints (rgb, alpha) by column
const tintOf = (st, col) => {
  if (st === FR) return col === 9 ? [[196, 140, 60], 0.24] : null;              // décadi: the one rest day
  // 19c: the Soviet 5-day page is drawn PLAIN. Its five colour-coded worker groups (staggered rest days, no common day
  // off) are the answer to the closing question, so the film never shows them
  // 19c (as 19b): the 6-day page is plain too. A tinted shared rest-day column here, right after the plain 5-day page,
  // would hint at the closing question's answer by contrast
  if (st === SU6) return null;
  return null;
};
/** Header slot of weekday `day` in state st (or -1 = benched above the page). */
const slotOf = (st, day) => (day < st.cols ? day : -1);

/** Global times of act III (19c: from the 19c word marks of legacy.js; 19c's lines 10-12 are shorter than 19's 16-18).
 *  19c: "France's ten-day week lasted twelve years." (2.8 s) · "The Soviets tried five- and six-day weeks. | By 1940,
 *  seven was back." · "The seven-day week outlived them all." (2.3 s; "Empires fell. Calendars changed." is cut). */
export function TIMES(tl) {
  tl = legacy(tl);
  const t16 = tl.scenes[16].start, t17 = tl.scenes[17].start, t18 = tl.scenes[18].start, M = tl.marks;
  return {
    t16, t17, t18,
    swing: t16 + 0.0,          // column → header row, as the line starts (MONDAY / MOON has held ~1.2 s)
    mDur: 1.1, phiDur: 1.0, phiSt: 0.04,   // the swing (19: 1.5 / 1.35 / 0.055)
    unroll: t16 + 0.45,        // the page drops open beneath the arriving header row (once the column is mostly across)
    unDur: 0.7,                // (19: 1.0)
    fr: t16 + 1.0,             // the re-flow to ten columns starts on "…ten-day WEEK" and lands by "lasted"
    frDur: 0.9,                // (19: 1.2)
    ticks: M.twelve - 0.1,     // "twelve years": twelve ticks under FRANCE, 1793–1805
    su5: Math.max(t17 + 0.25, M.five - 0.75),   // lands on "five-" (19: 0.85 s before the word)
    su6: M.six + 0.35,         // "six-day weeks"
    back: M.seven - 0.1,       // "seven was back" (snap)
    roll: t18 + 0.05,          // the year odometer 1940 → 2026 (19: on "Calendars changed", cut in 19c)
    rollDur: 0.8,
    glow: t18 + 0.15,          // the header lights glow Sun → Saturn on "The seven-day week…"
    glowSt: 0.1,               // (19: 0.17 s apart)
    all: M.all - 0.35,         // all seven together on "them all"
    ring: t18 + 1.2,           // today's ring (20 October)
  };
}
const TR = (tl) => {
  const T = TIMES(tl);
  return [
    { at: T.fr, dur: T.frDur, to: FR, title: 'VENDÉMIAIRE', year: '1793' },
    { at: T.su5, dur: 1.0, to: SU5, title: 'OCTOBER', year: '1929' },
    { at: T.su6, dur: 0.85, to: SU6, title: 'OCTOBER', year: '1932' },
    { at: T.back, dur: 0.5, to: WEST40, title: 'OCTOBER', year: '1940', snap: true },
    // "Calendars changed": the year odometer runs 1940 → 2026 and the days re-wrap to October 2026 (1st = Thursday)
    { at: T.roll, dur: T.rollDur, to: WEST, title: 'OCTOBER', year: '2026', odo: true },
  ];
};
/** {from, to, p (0..1 raw), tr} at gt. Before the first change: 7 → 7 done. */
export function weekStateAt(gt, tl) {
  const trs = TR(tl);
  let from = WEST, to = WEST, p = 1, tr = { title: 'OCTOBER', year: '2026', at: -1, dur: 1 }, prev = tr;
  for (const t of trs) {
    if (gt < t.at) break;
    prev = tr; from = to; to = t.to; tr = t; p = L.prog(gt, t.at, t.dur);
  }
  return { from, to, p, tr, prev };
}

export const pageLayout = (st) => calLayout({ ...PAGE, cols: st.cols, rows: st.rows });

// ------------------------------------------------------------------ the lights
const hs = (lay) => L.clamp(lay.cw / 2.1, 0.42, 0.7);   // light size factor for a column width (u)
const ease = (st, x) => (st?.snap ? L.ease.outBack(x, 1.4) : L.ease.inOutCubic(x));

/** Header position (world) of a weekday slot for state st, or the bench above the page. */
function slotPos(st, day) {
  const lay = pageLayout(st);
  const s = slotOf(st, day);
  if (s >= 0) return { x: lay.headX(s), y: lay.headY, size: hs(lay), a: 1 };
  return { x: lay.gx1 - 0.35 - (6 - day) * 0.95, y: lay.top - 0.62, size: 0.42, a: 0.38 };
}

/**
 * World position, size factor and alpha of light i at gt (gt ≥ beat 16).
 * size is a factor of lightSize (the env core radius at the current zoom).
 */
export function headerLightPos(i, gt, tl) {
  const T = TIMES(tl);
  const day = LIGHTS[i].day;
  // 1) the swing: rotate the column about the Sun (pivot) from "down" to "right", whip-lagged per weekday
  const lay7 = pageLayout(WEST);
  const m = L.ease.inOutCubic(L.prog(gt, T.swing, T.mDur));
  const phi = L.ease.inOutCubic(L.prog(gt, T.swing + 0.05 + T.phiSt * day, T.phiDur));
  const p0 = colPos(0);
  const px = L.lerp(p0.x, lay7.headX(0), m), py = L.lerp(p0.y, lay7.headY, m);
  const r = L.lerp(day * COL.dy, day * lay7.cw, phi);
  const th = (Math.PI / 2) * (1 - phi);
  let x = px + r * Math.cos(th), y = py + r * Math.sin(th);
  let size = L.lerp(1, hs(lay7), phi), a = 1;
  // 2) the re-flows
  const { from, to, p, tr } = weekStateAt(gt, tl);
  if (tr.at >= 0) {
    const a0 = slotPos(from, day), a1 = slotPos(to, day);
    const e = ease(tr, L.prog(p * 1.25 - 0.25 * (day / 6), 0, 1));
    const ec = L.clamp(e);
    const still = a0.x === a1.x && a0.y === a1.y;
    const hop = still ? 0 : Math.sin(Math.PI * ec) * (a0.y === a1.y ? 0.32 : 0.15);
    x = L.lerp(a0.x, a1.x, e); y = L.lerp(a0.y, a1.y, e) - hop;
    size = L.lerp(a0.size, a1.size, ec); a = L.lerp(a0.a, a1.a, ec);
  }
  return { x, y, size, a, swing: phi };
}

// ------------------------------------------------------------------ the page drawing
/** Year text at gt: the transition's year, then the beat-18 odometer 1940 → 2026. */
function yearAt(gt, tl, tr) {
  const T = TIMES(tl);
  if (gt < T.roll) return tr.year;
  const k = L.ease.inOutCubic(L.prog(Math.round(gt * 30) / 30, T.roll, T.rollDur));   // frame-stable digits
  return String(Math.round(L.lerp(1940, 2026, k)));
}

/** Title band: month + year roll up when they change (clipped to the band). */
function drawTitle(ctx, v, lay, s, items, k) {
  const ty = v.wy(lay.titleY);
  const pw = lay.w * s;
  const bandTop = v.wy(lay.top + lay.bind), bandH = (lay.titleY - lay.top - lay.bind + lay.h * 0.04) * s;
  ctx.save();
  ctx.beginPath(); ctx.rect(v.wx(lay.left), bandTop, pw, bandH); ctx.clip();
  ctx.textBaseline = 'alphabetic';
  for (const { month, year, dy, a } of items) {
    if (a <= 0.001) continue;
    ctx.globalAlpha = k * a;
    ctx.fillStyle = L.rgba(INKC);
    ctx.font = L.font(Math.max(6, lay.h * 0.1 * s), 800, L.FONT.display);
    if (month) L.trackedText(ctx, month, v.wx(lay.gx0), ty + dy, Math.max(0, 0.004 * pw));
    ctx.fillStyle = L.rgba(L.mix(ACCENT, [120, 80, 30], 0.55));
    ctx.font = L.font(Math.max(5, lay.h * 0.05 * s), 700, L.FONT.din);
    ctx.textAlign = 'right';
    if (year) ctx.fillText(year, v.wx(lay.gx1), ty + dy);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawWeekPage(ctx, v) {
  const T = TIMES(v.tl), gt = v.gt;
  const s = v.ws(1);
  const { from, to, p, tr, prev } = weekStateAt(gt, v.tl);
  const LA = pageLayout(from), LB = pageLayout(to);
  const eG = ease(tr, p), eC = L.clamp(eG);
  // page unroll: alpha + a clip that drops from the binding
  const un = L.ease.inOutCubic(L.prog(gt, T.unroll, T.unDur));
  if (un <= 0) return;
  const top = v.wy(PAGE.y - PAGE.h / 2), ph = PAGE.h * s, left = v.wx(PAGE.x - PAGE.w / 2), pw = PAGE.w * s;
  if (top > L.H + 50 || top + ph < -50 || left > W + 50 || left + pw < -50) return;
  ctx.save();
  const edge = top + ph * 1.1 * un;   // the unroll's leading edge (screen y)
  ctx.beginPath(); ctx.rect(left - pw * 0.2, top - ph * 0.3, pw * 1.4, edge - top + ph * 0.3); ctx.clip();
  // the paper is opaque almost at once (the clip edge does the reveal); title, grid and numbers fade in behind it
  const ppk = L.clamp(un * 6);
  const lay = drawCalendarPage(ctx, v, { ...PAGE, cols: to.cols, rows: to.rows, month: '', year: '', numbers: 0, grid: 0, headK: 0, k: ppk });
  const pk = L.ease.inOutCubic(L.clamp((un - 0.2) * 1.8));

  // title: month + year (roll up on a change)
  // (19c visual audit) sequential, not a cross-fade: the old title lifts out over the first half, THEN the new one
  // rises in, so VENDÉMIAIRE and OCTOBER never overlap in the band
  const tr0 = L.prog(gt, tr.at, 0.7);
  const tk = tr0 >= 1 ? 1 : 0.5;
  const tOut = L.ease.inOutCubic(L.clamp(tr0 / 0.5)), tIn = L.ease.inOutCubic(L.clamp((tr0 - 0.5) / 0.5));
  const dyp = 0.9 * lay.h * 0.1 * s;
  const yNow = yearAt(gt, v.tl, tr);
  if (tr.at < 0 || tk >= 1 || tr.odo) drawTitle(ctx, v, lay, s, [{ month: tr.title, year: yNow, dy: 0, a: 1 }], pk);
  else {
    const sameM = prev.title === tr.title;
    drawTitle(ctx, v, lay, s, [
      { month: sameM ? '' : prev.title, year: prev.year, dy: -dyp * tOut, a: 1 - tOut },
      { month: sameM ? '' : tr.title, year: tr.year, dy: dyp * (1 - tIn), a: tIn },
      ...(sameM ? [{ month: tr.title, year: '', dy: 0, a: 1 }] : []),
    ], pk);
  }

  // header band: dark, so the lights glow on it
  const hb0 = v.wy(lay.gridTop - lay.h * 0.065), hb1 = v.wy(lay.gridTop);
  const hg = ctx.createLinearGradient(0, hb0, 0, hb1);
  hg.addColorStop(0, L.rgba([30, 30, 40], 0.96 * ppk)); hg.addColorStop(1, L.rgba([16, 16, 24], 0.96 * ppk));
  ctx.fillStyle = hg;
  ctx.fillRect(v.wx(lay.gx0), hb0, (lay.gx1 - lay.gx0) * s, hb1 - hb0);

  // grid hairlines: slide between layouts; lines draw in top → bottom when the page first builds
  const gk = L.ease.outCubic(L.prog(gt, T.unroll + 0.4, 0.7));
  if (gk > 0) {
    ctx.strokeStyle = L.rgba(INKC, 0.22 * pk);
    ctx.lineWidth = Math.max(0.6, 0.0016 * pw);
    ctx.beginPath();
    const nc = Math.max(from.cols, to.cols), nr = Math.max(from.rows, to.rows);
    const gTop = v.wy(L.lerp(LA.gridTop, LB.gridTop, eC)), gBot = v.wy(L.lerp(LA.gridBot, LB.gridBot, eC));
    const gx0 = v.wx(LA.gx0), gx1 = v.wx(LA.gx1);
    for (let i = 0; i <= nc; i++) {
      const xa = LA.gx0 + Math.min(i, from.cols) * LA.cw, xb = LB.gx0 + Math.min(i, to.cols) * LB.cw;
      const gx = v.wx(L.lerp(xa, xb, eG));
      const kk = L.clamp(gk * 1.6 - (i / nc) * 0.6);
      ctx.moveTo(gx, gTop); ctx.lineTo(gx, L.lerp(gTop, gBot, kk));
    }
    for (let j = 0; j <= nr; j++) {
      const ya = LA.gridTop + Math.min(j, from.rows) * LA.ch, yb = LB.gridTop + Math.min(j, to.rows) * LB.ch;
      const gy = v.wy(L.lerp(ya, yb, eG));
      const kk = L.clamp(gk * 1.6 - (j / nr) * 0.6);
      ctx.moveTo(gx0, gy); ctx.lineTo(L.lerp(gx0, gx1, kk), gy);
    }
    ctx.stroke();
  }

  // day cells: tints + numbers travel from their old cell to their new one (staggered by day)
  const nk = L.prog(gt, T.unroll + 0.45, 0.75);
  const T18 = T.t18;
  for (let d = 1; d <= 31; d++) {
    const inA = d <= from.days, inB = d <= to.days;
    const sa = inA ? from : to, sb = inB ? to : from;
    const la = sa === from ? LA : LB, lb = sb === to ? LB : LA;
    let ia = sa.first + d - 1, ib = sb.first + d - 1;
    // overflow (the Soviet 31st): park it in the last cell's lower-right corner, small and grey
    const oa = ia >= sa.cols * sa.rows ? 1 : 0, ob = ib >= sb.cols * sb.rows ? 1 : 0;
    if (oa) ia = sa.cols * sa.rows - 1;
    if (ob) ib = sb.cols * sb.rows - 1;
    const ca = la.cell(ia % sa.cols, Math.floor(ia / sa.cols)), cb = lb.cell(ib % sb.cols, Math.floor(ib / sb.cols));
    const e = ease(tr, L.prog(p * 1.45 - 0.45 * ((d - 1) / 30), 0, 1)), ec = L.clamp(e);
    const vis = L.lerp(inA ? 1 : 0, inB ? 1 : 0, ec);
    const born = L.ease.outCubic(L.clamp(nk * 1.8 - ((d - 1) / 30) * 0.8));
    const a = vis * born * pk;
    if (a <= 0.003) continue;
    const cx = L.lerp(ca.x, cb.x, e), cy = L.lerp(ca.y, cb.y, e), cw = L.lerp(ca.w, cb.w, ec), ch = L.lerp(ca.h, cb.h, ec);
    // tint
    const ta = oa ? null : tintOf(sa, ia % sa.cols), tb = ob ? null : tintOf(sb, ib % sb.cols);
    const ov = L.lerp(oa, ob, ec);
    if ((ta || tb) && from === SU5 && to !== SU5) {
      // leaving the five colour groups: the group tints fade out early instead of travelling (no pastel pile-up);
      // the new rest-day tint comes in once the days have mostly landed
      const ko = 1 - L.clamp(p / 0.4), kn = L.clamp((p - 0.6) / 0.4);
      for (const [tt, kk] of [[ta, ko], [tb, kn]]) {
        if (!tt || kk <= 0) continue;
        ctx.fillStyle = L.rgba(tt[0], tt[1] * kk * a);
        ctx.fillRect(v.wx(cx) + 1, v.wy(cy) + 1, cw * s - 2, ch * s - 2);
      }
    } else if (ta || tb) {
      const col = ta && tb ? L.mix(ta[0], tb[0], ec) : (ta || tb)[0];
      const al = L.lerp(ta ? ta[1] : 0, tb ? tb[1] : 0, ec);
      ctx.fillStyle = L.rgba(col, al * a);
      ctx.fillRect(v.wx(cx) + 1, v.wy(cy) + 1, cw * s - 2, ch * s - 2);
    }
    // number
    const fs = Math.min(cw, ch) * 0.3 * s * (1 - 0.3 * ov);
    if (fs < 3) continue;
    const hop = Math.sin(Math.PI * ec) * 0.12 * s * (tr.snap ? 0 : 1);
    ctx.font = L.font(fs, 600, L.FONT.din);
    ctx.fillStyle = L.rgba(INKC, 0.8 * a * (1 - 0.55 * ov));
    ctx.textBaseline = 'top';
    const nx = v.wx(cx + cw * L.lerp(0.1, 0.6, ov)), ny = v.wy(cy + ch * L.lerp(0.12, 0.58, ov)) - hop;
    ctx.fillText(String(d), nx, ny);
    // beat 18: today (20 October 2026) gets a hand-drawn accent ring
    if (d === 20 && gt > T18) {
      const rk = L.ease.inOutCubic(L.prog(gt, T.ring, 0.8));
      if (rk > 0) {
        ctx.strokeStyle = L.rgba(L.mix(ACCENT, [170, 110, 40], 0.5), a);
        ctx.lineWidth = Math.max(1.5, fs * 0.1);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(nx + fs * 0.42, ny + fs * 0.48, Math.max(0, fs * 0.78), -Math.PI * 0.6, -Math.PI * 0.6 + Math.PI * 2.08 * rk);
        ctx.stroke();
      }
    }
  }

  // beat 18: a soft light falls down each weekday's column as its light glows (Sun → Saturn)
  if (gt > T.glow - 0.1) {
    for (let day = 0; day < 7; day++) {
      const g = L.prog(gt, T.glow + T.glowSt * day, 0.9);
      if (g <= 0 || g >= 1) continue;
      const cx = v.wx(lay.headX(day)), y0 = v.wy(lay.gridTop), y1 = v.wy(lay.gridBot);
      const yy = L.lerp(y0, y1 + 80, L.ease.outCubic(g));
      const gr = ctx.createLinearGradient(0, yy - 220, 0, yy);
      const al = 0.16 * Math.sin(Math.PI * g) * pk;
      gr.addColorStop(0, L.rgba(ACCENT, 0)); gr.addColorStop(1, L.rgba(ACCENT, al));
      ctx.fillStyle = gr;
      ctx.fillRect(cx - lay.cw * s * 0.5 + 1, Math.max(y0, yy - 220), lay.cw * s - 2, Math.min(yy, y1) - Math.max(y0, yy - 220));
    }
  }

  // the unroll's leading edge: a soft paper curl (highlight over a shadow) while it drops
  const ck = Math.sin(Math.PI * un) * ppk;
  if (ck > 0.02 && edge < top + ph) {
    const cg = ctx.createLinearGradient(0, edge - 22, 0, edge + 12);
    cg.addColorStop(0, 'rgba(255,250,240,0)'); cg.addColorStop(0.65, `rgba(255,250,240,${0.6 * ck})`); cg.addColorStop(1, `rgba(60,50,40,${0.55 * ck})`);
    ctx.fillStyle = cg;
    ctx.fillRect(left, edge - 22, pw, 34);
  }
  ctx.restore();

  // ghost header slots (10-day week: days 8, 9, 10 have no light)
  const ghostK = (from === FR ? 1 - eC : 0) + (to === FR ? eC : 0);
  if (ghostK > 0.01) {
    const L10 = pageLayout(FR);
    for (let c = 7; c < 10; c++) {
      const gk2 = L.clamp(ghostK * 1.6 - (c - 7) * 0.25);
      if (gk2 <= 0) continue;
      const x = v.wx(L10.headX(c)), y = v.wy(L10.headY);
      ctx.save();
      ctx.strokeStyle = L.rgba(CREAM, 0.45 * gk2 * pk);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, 9 * L.ease.outBack(gk2)), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

function drawHeaderLights(ctx, v) {
  const T = TIMES(v.tl), gt = v.gt;
  for (let i = 0; i < LIGHTS.length; i++) {
    const day = LIGHTS[i].day;
    const hp = headerLightPos(i, gt, v.tl);
    const x = v.wx(hp.x), y = v.wy(hp.y);
    if (x < -120 || x > W + 120 || y < -120 || y > L.H + 120) continue;
    // beat 18: each glows in sequence, then all together on "them all"
    const g = Math.sin(Math.PI * L.prog(gt, T.glow + T.glowSt * day, 0.7));
    const all = Math.sin(Math.PI * L.prog(gt, T.all, 1.4)) * 0.6;
    const pulse = Math.max(g, all);
    // the snap back to 7: a flash as each lands
    const snap = Math.sin(Math.PI * L.prog(gt, T.back + 0.25 + 0.03 * day, 0.6)) * 0.7;
    const boost = Math.max(pulse, snap);
    const em = lightEmphasis(i, gt, v.tl);
    const size = lightSize(i, v) * hp.size * (1 + 0.3 * boost);
    if (boost > 0.02) L.lightBlob(ctx, x, y, size * 9, LIGHTS[i].col, 0.3 * boost * hp.a);
    // benched (no slot in a 5- or 6-day week): dimmer, and struck through with a hairline, inside a dashed ring
    const bk = L.clamp((1 - hp.a) / 0.62);
    drawLight(ctx, i, x, y, size, hp.a * em * (1 - 0.3 * bk), L.lerp(1, 0.7, hp.swing) * (1 - 0.6 * bk) + 0.6 * boost, gt);
    if (bk > 0.02) {
      const r = 15;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = L.rgba(CREAM, 0.42 * bk);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, r * L.ease.outCubic(bk)), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = L.rgba(CREAM, 0.8 * bk);
      ctx.lineWidth = 2;
      const sk = L.ease.inOutCubic(L.clamp(bk * 1.4 - 0.4));
      if (sk > 0) {
        ctx.beginPath();
        ctx.moveTo(x - r * 1.1, y + r * 1.1);
        ctx.lineTo(x - r * 1.1 + 2.2 * r * sk, y + r * 1.1 - 2.2 * r * sk);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ------------------------------------------------------------------ the "N DAYS" label (shared by s16-s18)
const LBL = { x: 70, y: 462, size: 104 };
/**
 * The house big label with a rolling number: "10 DAYS" → "5 DAYS" → … The number rolls (odometer) between
 * keyframes; " DAYS" slides to follow the number's width. seq: [[gt, '10'], [gt, '5', rollDur?], …].
 * scale: size multiplier (grows from the baseline-left anchor).
 * small: [[gt, 'FRANCE, 1793–1805'], …] cross-dissolves. k: visibility. flash: 0..1 accent glow.
 */
export function daysLabel(ctx, v, { seq, small, k, flash = 0, enter = 0, scale = 1 }) {
  if (k <= 0.001) return;
  const { x, y } = LBL, size = LBL.size * scale;
  let cur = seq[0][1], prv = cur, rk = 1;
  for (const [t, n, dur = 0.5] of seq) if (v.gt >= t) { prv = cur; cur = n; rk = L.ease.inOutCubic(L.prog(v.gt, t, dur)); }
  const e = L.ease.outCubic(L.clamp(enter));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k);
  ctx.textBaseline = 'alphabetic';
  // rule
  ctx.fillStyle = L.rgba(ACCENT, 0.9);
  ctx.fillRect(x, y - size * 0.92 - 26, 90 * e, 4);
  ctx.font = L.font(size, 800, L.FONT.display);
  const wA = ctx.measureText(prv).width, wB = ctx.measureText(cur).width;
  const nw = L.lerp(wA, wB, rk);
  const lift = (1 - e) * 30;
  ctx.shadowColor = flash > 0 ? L.rgba(ACCENT, 0.9) : 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18 + 30 * flash;
  ctx.fillStyle = L.rgba(L.mix(ACCENT, [255, 246, 226], flash * 0.6));
  // number roll (19c, as 19b): clipped only while it rolls, and with no shadow inside the clip (a clipped blur reads as
  // a hard-edged box); the flash glow then comes from an unclipped bloom behind the digits
  const ga = ctx.globalAlpha;
  if (flash > 0) L.lightBlob(ctx, x + nw / 2, y + lift - size * 0.36, size * 0.9, ACCENT, 0.35 * flash * ga);
  if (rk < 1) {
    ctx.save();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.rect(x - 10, y - size * 0.95, Math.max(wA, wB) + 20, size * 1.05); ctx.clip();
    ctx.globalAlpha = ga * (1 - rk);
    ctx.fillText(prv, x, y + lift - rk * size * 0.9);
    ctx.globalAlpha = ga * rk;
    ctx.fillText(cur, x, y + lift + (1 - rk) * size * 0.9);
    ctx.restore();
  } else ctx.fillText(cur, x, y + lift);
  L.trackedText(ctx, 'DAYS', x + nw + size * 0.2, y + lift, -1);
  // small line: cross-dissolve between keyframes
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.font = L.font(30, 600, L.FONT.body);
  let sc = small[0][1], sp = sc, sk = 1;
  // the old line lifts out first, then the new one rises in: never two strings on top of each other (19c, as 19b)
  for (const [t, str] of small) if (v.gt >= t) { sp = sc; sc = str; sk = L.prog(v.gt, t, 0.5); }
  const base = ctx.globalAlpha;
  const ko = L.ease.inCubic(L.clamp(sk * 2)), kn = L.ease.outCubic(L.clamp(sk * 2 - 1));
  for (const [str, a, dy] of sk < 1 ? [[sp, 1 - ko, -10 * ko], [sc, kn, 10 * (1 - kn)]] : [[sc, 1, 0]]) {
    if (a <= 0.002) continue;
    ctx.globalAlpha = base * a;
    ctx.fillStyle = 'rgba(205,215,230,0.95)';
    L.trackedText(ctx, str.toUpperCase(), x, y + 52 + (1 - e) * 18 + dy, 3);
  }
  ctx.restore();
  return { x, y, size, smallY: y + 52 };
}

const SCENE = {
  beat: 16,
  chapter: { num: '10', title: 'The décade', sub: 'France, 1793–1805' },
  captions: true,
  layer: 2,
  cues(d) {
    void d;
    // 19c: on the 19c act-III times (beat-relative)
    const T = TIMES(LT0), r = (t) => t - T.t16;
    return [
      { t: r(T.swing) + 0.02, name: 'swish', gain: 0.2, pitch: 0.9 },     // the column swings
      { t: r(T.unroll) + 0.05, name: 'creak', gain: 0.12, pitch: 1.4 },   // the paper page drops open
      { t: r(T.unroll) + 0.55, name: 'tick', gain: 0.1, pitch: 1.3 },     // grid + numbers settle
      { t: r(T.fr), name: 'whoosh', gain: 0.22, pitch: 1.15 },            // re-flow to ten columns
      { t: r(T.fr) + 0.3, name: 'blip', gain: 0.14, pitch: 0.9 },         // ghost slots 8-10
      { t: r(T.fr) + 0.5, name: 'impact', gain: 0.26, pitch: 1.1 },       // "10 DAYS" lands
      { t: r(T.ticks), name: 'tick', gain: 0.07, pitch: 1.7 },            // "twelve years": the year ticks
      { t: r(T.ticks) + 0.4, name: 'tick', gain: 0.07, pitch: 1.8 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt < v.tl.scenes[16].start) return;
    drawWeekPage(ctx, v);
    drawHeaderLights(ctx, v);
  },
  drawOverlay(ctx, v) {
    const T = TIMES(v.tl);
    const k = v.k;
    const enter = L.prog(v.gt, T.fr + 0.45, 0.55);
    if (enter <= 0) return;
    // 19c (as 19b's audited version): fades out by the beat end (v.k); s17 brings its own Soviet label in on "five-"
    const lb = daysLabel(ctx, v, { seq: [[0, '10']], small: [[0, 'France, 1793–1805']], k: k * L.clamp(enter * 1.5), enter });
    // "it lasted twelve years": twelve ticks draw in under the dates (they fade with the beat: v.k)
    const yk = L.prog(v.gt, T.ticks, 0.9);
    if (yk > 0 && lb) {
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.font = L.font(30, 600, L.FONT.body);
      ctx.letterSpacing = '3px';
      const tw = ctx.measureText('FRANCE, 1793–1805').width;
      ctx.letterSpacing = '0px';
      const x0 = lb.x, x1 = lb.x + tw, y = lb.smallY + 18;
      for (let i = 0; i < 12; i++) {
        const a = L.ease.outCubic(L.clamp(yk * 13 - i));
        if (a <= 0) continue;
        const xx = L.lerp(x0, x1, (i + 0.5) / 12);
        ctx.fillStyle = L.rgba(ACCENT, 0.9 * a);
        ctx.fillRect(xx - ((x1 - x0) / 12) * 0.42, y, ((x1 - x0) / 12) * 0.84, 4 + 2 * (1 - a));
      }
      ctx.restore();
    }
  },
};

// 19c: 19 beat 16 plays as a 19c beat on the legacy timeline (legacy.js); the overlay draws its own label k
export default adapt(SCENE, 16);
