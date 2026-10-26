// Beat 9 — "Blow one up to the size of a football stadium, | and its nucleus would be a grain of sand on the
// center spot."
// The atom from beat 8 (a soft cloud of concentric shells around a bright point) MORPHS into a top-down
// football stadium: each shell straightens into a ring of seating rows, the core opens into a striped pitch whose
// lines draw themselves, and the roof's floodlights switch on in a sweep. A width rule reads "≈ 200 m".
// Then the stadium dims, the centre spot pulses, and a magnifier inset grows out of it: a single grain of sand
// on the painted spot — the nucleus. The stadium stays (beats 10–11 reuse it), and in the quiet just before
// beat 12 it folds back into the atom, so the camera pulls out of a plain atom again.
//
// The stadium is anchored to the atom in world space (P.atom, SW metres per unit) so the slow camera push of
// beats 9–11 also pushes into the stadium. Units: 1 unit = the stadium half-width (≈ 100 m in the analogy).
import * as L from '../../../../engine/runtime/lib.js';
import { P } from '../camera.js';

const { W, ease, clamp, lerp, prog, rgba } = L;

export const SW = 1.53e-10;          // world metres per stadium unit (half-width 1 → ~400–470 px over beats 9–11)
const R0 = 0.46;                     // atom cloud radius (0.07 nm) in stadium units: where the morph starts
const B = 0.82;                      // stadium half-height (units)
export const LABEL = { x: 100, y: 470 };   // shared label slot for beats 9–11 (top band, above the stadium)

// ------------------------------------------------------------------ shared timeline (global seconds)
/** Everything the stadium needs to know about time, from any scene (pure function of gt). */
export function stadiumState(gt, tl) {
  const s = tl.scenes;
  const b9 = s[9].start, b10 = s[10].start, b11 = s[11].start, b12 = s[12].start;
  const fold = ease.inOutCubic(prog(gt, b12 - 0.5, 0.65));         // the quiet before beat 12: back into the atom
  return {
    on: gt > b9 - 0.05 && gt < b12 + 0.3,
    b9, b10, b11, b12,
    alpha: ease.outCubic(prog(gt, b9 + 0.05, 0.6)) * (1 - ease.inOutCubic(prog(gt, b12 - 0.25, 0.5))),
    m: ease.inOutCubic(prog(gt, b9 + 0.25, 1.75)) * (1 - fold),     // circle shells → stadium
    rows: prog(gt, b9 + 0.75, 1.3),                                  // seating rows draw in (inner → outer)
    pitch: ease.outCubic(prog(gt, b9 + 1.05, 0.8)),
    lines: prog(gt, b9 + 1.45, 1.15),
    lights: prog(gt, b9 + 2.05, 0.85),
    focus: ease.inOutCubic(prog(gt, b9 + 3.0, 0.7)) * (1 - ease.inOutCubic(prog(gt, b10 + 0.1, 0.7))),
    stands: ease.inOutCubic(prog(gt, b10 + 0.3, 0.9)) * (1 - ease.inOutCubic(prog(gt, b11 + 0.1, 0.8))),
    empty: ease.inOutCubic(prog(gt, b11 + 0.1, 1.0)) * (1 - fold),
    fold,
  };
}

/** Screen frame of the stadium: centre + pixels per unit. */
export function frame(v) {
  return { cx: v.wx(P.atom.x), cy: v.wy(P.atom.y), U: v.ws(SW) };
}

// ------------------------------------------------------------------ geometry
// Ring s ∈ [0, 1]: 0 = inner edge of the lower tier (hugging the pitch), 1 = outer edge of the roof.
// Each ring is a superellipse |x/a|^n + |y/b|^n = 1, rectangular near the pitch and rounder outside.
export function ringShape(s, m = 1) {
  const a = lerp(0.62, 1, s), b = lerp(0.44, B, s), n = lerp(7.5, 2.7, Math.pow(s, 0.8));
  const r = R0 * (0.22 + 0.78 * s);                                   // as an atom: concentric circular shells
  return { a: lerp(r, a, m), b: lerp(r, b, m), n: lerp(2, n, m) };
}
/** Point on ring s at angle th (units, relative to centre). */
export function ringPt(s, th, m = 1) {
  const { a, b, n } = ringShape(s, m);
  const c = Math.cos(th), si = Math.sin(th), e = 2 / n;
  return [a * Math.sign(c) * Math.pow(Math.abs(c), e), b * Math.sign(si) * Math.pow(Math.abs(si), e)];
}
const SEG = 120;
function ringPath(ctx, F, s, m, reverse = false, move = true) {
  for (let i = 0; i <= SEG; i++) {
    const th = (reverse ? -1 : 1) * (i / SEG) * Math.PI * 2;
    const [x, y] = ringPt(s, th, m);
    const px = F.cx + x * F.U, py = F.cy + y * F.U;
    if (i === 0 && move) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
/** The pitch-side ring (s = 0) scaled by q about the centre: q = 0 is the nucleus, 1 the front row. */
export function ringPath0(ctx, F, q, m = 1) {
  for (let i = 0; i <= SEG; i++) {
    const [x, y] = ringPt(0, (i / SEG) * Math.PI * 2, m);
    const px = F.cx + x * q * F.U, py = F.cy + y * q * F.U;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
function band(ctx, F, s0, s1, m) {
  ctx.beginPath();
  ringPath(ctx, F, s1, m);
  ringPath(ctx, F, s0, m, true);
}

const TIER1 = [0.0, 0.4], TIER2 = [0.47, 0.83], ROOF = [0.76, 1.0];
const ROWS1 = 15, ROWS2 = 14;
const PL = 0.525, PW = 0.34;                       // pitch half-length / half-width (105 × 68 m)
// floodlight banks: small clusters of 2-4 lamps at irregular spots around the roof (like real light banks),
// so the lights never read as an evenly spaced "orbit" ring. Angles measured clockwise from the top.
const LIGHTS = (() => {
  const r = L.rng(3131);
  const out = [];
  const banks = [0.02, 0.1, 0.17, 0.3, 0.37, 0.46, 0.55, 0.63, 0.7, 0.8, 0.87, 0.95];
  for (const b of banks) {
    const n = 2 + Math.floor(r() * 3), c = b + (r() - 0.5) * 0.02;
    for (let j = 0; j < n; j++) out.push(c + (j - (n - 1) / 2) * 0.0085);
  }
  return out.map((u) => ((u % 1) + 1) % 1).sort((a, b) => a - b);
})();

// seat "crowd" texture: a few thousand tiny dots of coloured seats (fixed, deterministic)
const SEATS = (() => {
  const r = L.rng(907);
  const out = [];
  for (let i = 0; i < 900; i++) {
    const upper = r() < 0.5;
    const tier = upper ? TIER2 : TIER1;
    out.push({ s: lerp(tier[0] + 0.02, tier[1] - 0.02, r()), th: r() * Math.PI * 2, c: r(), a: r() });
  }
  return out;
})();

// ------------------------------------------------------------------ drawing
const GRASS = [40, 96, 66], GRASS2 = [47, 108, 74], SURROUND = [28, 70, 50];
const SEAT = [30, 60, 74], SEAT_HI = [96, 140, 156], ROOFC = [13, 17, 22];
const LIGHT = [255, 246, 226];

function drawPitch(ctx, F, st, dim) {
  const { cx, cy, U } = F;
  const m = st.m, sc = m;                                 // the pitch grows out of the core with the morph
  const k = st.pitch * st.alpha;
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= k * dim;
  // surround (grass beyond the lines), clipped to the inner stand edge
  ctx.beginPath(); ringPath(ctx, F, 0, m); ctx.fillStyle = rgba(SURROUND); ctx.fill();
  ctx.clip();
  // mowing stripes across the length
  const x0 = cx - PL * U * sc, y0 = cy - PW * U * sc, w = 2 * PL * U * sc, h = 2 * PW * U * sc;
  const N = 14;
  for (let i = 0; i < N; i++) {
    ctx.fillStyle = rgba(i % 2 ? GRASS : GRASS2);
    ctx.fillRect(x0 - (i === 0 ? 0.06 * U : 0) + (w / N) * i, y0 - 0.06 * U, w / N + (i === 0 || i === N - 1 ? 0.06 * U : 0) + 0.5, h + 0.12 * U);
  }
  // floodlit pool (cool-warm), and a soft shadow under the roof edge
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.75 * U);
  g.addColorStop(0, `rgba(255,248,225,${0.16 * st.lights})`);
  g.addColorStop(1, 'rgba(255,248,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - U, cy - U, 2 * U, 2 * U);
  const sh = ctx.createRadialGradient(cx, cy, 0.3 * U, cx, cy, 0.7 * U);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = sh;
  ctx.fillRect(cx - U, cy - U, 2 * U, 2 * U);
  ctx.restore();
}

/** Dash-drawn stroke helper: draws a path progressively (p 0..1) given its approximate length (px). */
function drawOn(ctx, len, p, build) {
  if (p <= 0) return;
  ctx.setLineDash(p >= 1 ? [] : [len * p, len + 10]);
  ctx.beginPath(); build(); ctx.stroke();
}

function drawLines(ctx, F, st, dim) {
  const { cx, cy } = F, U = F.U * st.m;
  const p = st.lines;
  const k = st.alpha * clamp(p * 3) * dim;
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.strokeStyle = 'rgba(236,244,236,0.82)';
  ctx.lineWidth = Math.max(1, 0.0045 * U);
  ctx.lineCap = 'round';
  const X = (u) => cx + u * U, Y = (u) => cy + u * U;
  const e = (a, d) => ease.outCubic(prog(p, a, d));
  // touchlines + goal lines (perimeter)
  drawOn(ctx, 4 * (PL + PW) * U, e(0, 0.65), () => ctx.rect(X(-PL), Y(-PW), 2 * PL * U, 2 * PW * U));
  // halfway line + centre circle
  drawOn(ctx, 2 * PW * U, e(0.15, 0.4), () => { ctx.moveTo(X(0), Y(-PW)); ctx.lineTo(X(0), Y(PW)); });
  drawOn(ctx, 2 * Math.PI * 0.0915 * U, e(0.25, 0.5), () => ctx.arc(X(0), Y(0), Math.max(0, 0.0915 * U), -Math.PI / 2, Math.PI * 1.5));
  for (const sd of [-1, 1]) {
    const gx = sd * PL;
    // penalty area, goal area, penalty arc
    drawOn(ctx, (0.165 * 2 + 0.403) * U, e(0.35, 0.45), () => {
      ctx.moveTo(X(gx), Y(-0.2015)); ctx.lineTo(X(gx - sd * 0.165), Y(-0.2015)); ctx.lineTo(X(gx - sd * 0.165), Y(0.2015)); ctx.lineTo(X(gx), Y(0.2015));
    });
    drawOn(ctx, (0.055 * 2 + 0.183) * U, e(0.45, 0.4), () => {
      ctx.moveTo(X(gx), Y(-0.0916)); ctx.lineTo(X(gx - sd * 0.055), Y(-0.0916)); ctx.lineTo(X(gx - sd * 0.055), Y(0.0916)); ctx.lineTo(X(gx), Y(0.0916));
    });
    const spx = gx - sd * 0.11, a0 = Math.acos(0.055 / 0.0915);
    drawOn(ctx, 0.2 * U, e(0.55, 0.35), () => {
      if (sd < 0) ctx.arc(X(spx), Y(0), Math.max(0, 0.0915 * U), -a0, a0);
      else ctx.arc(X(spx), Y(0), Math.max(0, 0.0915 * U), Math.PI - a0, Math.PI + a0);
    });
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(236,244,236,0.82)';
    const sk = e(0.6, 0.3);
    if (sk > 0) { ctx.beginPath(); ctx.arc(X(spx), Y(0), Math.max(0, 0.004 * U * sk), 0, Math.PI * 2); ctx.fill(); }
    // goals (nets just outside the line)
    if (sk > 0) {
      ctx.save();
      ctx.globalAlpha *= sk;
      ctx.strokeStyle = 'rgba(236,244,236,0.65)';
      ctx.strokeRect(Math.min(X(gx), X(gx + sd * 0.024)), Y(-0.0366), 0.024 * U, 0.0732 * U);
      ctx.restore();
    }
    // corner arcs
    for (const sy of [-1, 1]) drawOn(ctx, 0.02 * U, e(0.7, 0.2), () => ctx.arc(X(gx), Y(sy * PW), Math.max(0, 0.012 * U), sy < 0 ? (sd < 0 ? 0 : Math.PI / 2) : (sd < 0 ? -Math.PI / 2 : Math.PI), sy < 0 ? (sd < 0 ? Math.PI / 2 : Math.PI) : (sd < 0 ? 0 : Math.PI * 1.5)));
  }
  ctx.restore();
}

/** fill the band s0..s1 with a gradient running from its inner to its outer edge (an elliptical radial gradient
 *  squashed to the band's aspect, so the bands' long and short sides shade alike) */
function rakeFill(ctx, F, s0, s1, m, stops) {
  const A = ringShape(s0, m), Bo = ringShape(s1, m);
  const asp = (A.b + Bo.b) / (A.a + Bo.a);
  band(ctx, F, s0, s1, m);
  ctx.save();
  ctx.translate(F.cx, F.cy);
  ctx.scale(1, asp);
  const g = ctx.createRadialGradient(0, 0, Math.max(0, A.a * F.U * 0.98), 0, 0, Math.max(1, Bo.a * F.U));
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  ctx.restore();
}

function drawStands(ctx, F, st, dim) {
  const { cx, cy, U } = F;
  const m = st.m;
  ctx.save();
  // ambient occlusion / drop shadow outside the bowl
  const og = ctx.createRadialGradient(cx, cy, 0.7 * U, cx, cy, 1.35 * U);
  og.addColorStop(0, `rgba(0,0,0,${0.55 * st.alpha * m})`);
  og.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = og;
  ctx.fillRect(cx - 1.4 * U, cy - 1.4 * U, 2.8 * U, 2.8 * U);

  // opaque bowl base (hides the atom drawn beneath), then the two tiers
  ctx.globalAlpha *= st.alpha;
  ctx.save();
  ctx.globalAlpha *= clamp(m * 1.6);          // the atom's own cloud shows through until the shells stretch
  ctx.beginPath(); ringPath(ctx, F, 1, m);
  ctx.fillStyle = rgba(L.mix([6, 14, 18], [12, 16, 21], m));
  ctx.fill();
  ctx.restore();

  const sg = ctx.createRadialGradient(cx, cy, 0.4 * U, cx, cy, 1.0 * U);
  sg.addColorStop(0, rgba(L.mix(SEAT, [60, 84, 100], 0.6 * st.lights)));
  sg.addColorStop(1, rgba(L.mix(SEAT, [18, 26, 34], 0.6)));
  const tierK = ease.outCubic(clamp(st.rows * 1.6)) * dim;
  ctx.save();
  ctx.globalAlpha *= tierK;
  ctx.fillStyle = sg;
  band(ctx, F, TIER1[0], TIER1[1], m); ctx.fill('evenodd');
  band(ctx, F, TIER2[0], TIER2[1], m); ctx.fill('evenodd');
  // concourse between the tiers
  ctx.fillStyle = 'rgba(9,13,17,0.7)';
  band(ctx, F, TIER1[1], TIER2[0], m); ctx.fill('evenodd');
  ctx.restore();

  // seat speckle (coloured seats / crowd), only when large enough to read
  if (U > 250 && tierK > 0.05) {
    ctx.save();
    ctx.globalAlpha *= tierK * 0.55;
    for (const p of SEATS) {
      const [x, y] = ringPt(p.s, p.th, m);
      ctx.fillStyle = p.c < 0.6 ? 'rgba(120,150,170,0.45)' : p.c < 0.85 ? 'rgba(170,190,205,0.35)' : 'rgba(110,240,200,0.28)';
      const sz = 1 + p.a * 1.4;
      ctx.fillRect(cx + x * U - sz / 2, cy + y * U - sz / 2, sz, sz);
    }
    ctx.restore();
  }

  // seating rows: thin concentric strokes, staggered inner → outer (shells straightening into rows)
  ctx.lineWidth = Math.max(0.6, 0.0022 * U);
  const N = ROWS1 + ROWS2;
  for (let i = 0; i < N; i++) {
    const tier = i < ROWS1 ? TIER1 : TIER2, j = i < ROWS1 ? i : i - ROWS1, n = i < ROWS1 ? ROWS1 : ROWS2;
    const s = lerp(tier[0], tier[1], (j + 0.5) / n);
    const rk = ease.outCubic(clamp((st.rows * (N + 8) - i) / 8));
    // shells: before the morph lands, rows read as faint cloud shells
    const shell = 1 - m;
    const a = (0.06 + 0.22 * rk * (j % 2 ? 0.7 : 1)) * dim;
    if (a <= 0.01) continue;
    ctx.strokeStyle = rgba(L.mix(SEAT_HI, [150, 225, 255], shell), a);
    ctx.beginPath(); ringPath(ctx, F, s, m); ctx.stroke();
  }
  // rake: each tier climbs away from the pitch, so its front rows sit in shadow and its back rows catch the light
  const rk = tierK * m;
  if (rk > 0.01) {
    ctx.save();
    for (const tier of [TIER1, TIER2]) {
      rakeFill(ctx, F, tier[0], tier[1], m, [[0, `rgba(0,0,0,${0.3 * rk})`], [0.55, 'rgba(0,0,0,0)'], [1, `rgba(150,190,205,${0.07 * rk})`]]);
    }
    // the roof canopy's shadow falls across the back of the upper tier
    rakeFill(ctx, F, ROOF[0] - 0.07, ROOF[0], m, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${0.45 * rk})`]]);
    ctx.restore();
  }
  // aisles: radial stairways through each tier
  const ak = ease.outCubic(prog(st.rows, 0.45, 0.55)) * dim * m;
  if (ak > 0.01) {
    ctx.strokeStyle = `rgba(6,9,12,${0.7 * ak})`;
    ctx.lineWidth = Math.max(1, 0.006 * U);
    ctx.beginPath();
    for (const [tier, cnt, off] of [[TIER1, 28, 0], [TIER2, 36, 0.5]]) {
      for (let i = 0; i < cnt; i++) {
        const th = ((i + off) / cnt) * Math.PI * 2;
        const [x0, y0] = ringPt(tier[0], th, m), [x1, y1] = ringPt(tier[1], th, m);
        ctx.moveTo(cx + x0 * U, cy + y0 * U); ctx.lineTo(cx + x1 * U, cy + y1 * U);
      }
    }
    ctx.stroke();
    // vomitories: dark tunnel mouths breaking the rows of each tier, between every few aisles
    ctx.fillStyle = `rgba(3,5,8,${0.85 * ak})`;
    for (const [tier, cnt, off, a0, a1] of [[TIER1, 14, 0.5 / 28, 0.42, 0.62], [TIER2, 12, 0.5 / 36 + 0.5 / 12, 0.18, 0.36]]) {
      for (let i = 0; i < cnt; i++) {
        const th = (i / cnt + off) * Math.PI * 2, dth = 0.024;
        const sA = lerp(tier[0], tier[1], a0), sB = lerp(tier[0], tier[1], a1);
        const q = [ringPt(sA, th - dth, m), ringPt(sB, th - dth, m), ringPt(sB, th + dth, m), ringPt(sA, th + dth, m)];
        ctx.beginPath();
        q.forEach(([x, y], j) => (j ? ctx.lineTo(cx + x * U, cy + y * U) : ctx.moveTo(cx + x * U, cy + y * U)));
        ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawRoof(ctx, F, st, dim) {
  const { cx, cy, U } = F;
  const m = st.m;
  const k = st.alpha * ease.outCubic(prog(st.rows, 0.35, 0.65));
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= k;
  // translucent canopy
  ctx.fillStyle = rgba(ROOFC, 0.78 * (0.55 + 0.45 * dim));
  band(ctx, F, ROOF[0], ROOF[1], m); ctx.fill('evenodd');
  // structural ribs
  ctx.strokeStyle = `rgba(120,150,165,${0.16 * dim})`;
  ctx.lineWidth = Math.max(0.8, 0.003 * U);
  ctx.beginPath();
  for (let i = 0; i < 64; i++) {
    const th = (i / 64) * Math.PI * 2;
    const [x0, y0] = ringPt(ROOF[0], th, m), [x1, y1] = ringPt(ROOF[1], th, m);
    ctx.moveTo(cx + x0 * U, cy + y0 * U); ctx.lineTo(cx + x1 * U, cy + y1 * U);
  }
  ctx.stroke();
  // compression ring at the outer edge + catwalk inside
  ctx.lineWidth = Math.max(1, 0.006 * U);
  ctx.strokeStyle = `rgba(150,180,195,${0.35 * dim})`;
  ctx.beginPath(); ringPath(ctx, F, ROOF[1], m); ctx.stroke();
  ctx.lineWidth = Math.max(0.8, 0.003 * U);
  ctx.strokeStyle = `rgba(150,180,195,${0.22 * dim})`;
  ctx.beginPath(); ringPath(ctx, F, lerp(ROOF[0], ROOF[1], 0.45), m); ctx.stroke();
  // inner roof edge: a fine accent-tinted line that catches the floodlight
  ctx.lineWidth = Math.max(1, 0.005 * U);
  ctx.strokeStyle = rgba(L.mix([150, 180, 195], LIGHT, st.lights), (0.3 + 0.3 * st.lights) * dim);
  ctx.beginPath(); ringPath(ctx, F, ROOF[0], m); ctx.stroke();
  ctx.restore();
}

function drawLights(ctx, F, st, dim) {
  const { cx, cy, U } = F;
  if (st.lights <= 0 || st.alpha <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // in beat 10 the lamps step right down (the haze leads; bright dots must not read as electrons on an orbit),
  // and in beat 11 they all but go out (one bright point leads)
  const quiet = (1 - 0.78 * st.stands) * (1 - 0.8 * st.empty);
  const rad = 1 - 0.45 * Math.max(st.stands, st.empty);
  for (const u of LIGHTS) {
    const th = -Math.PI / 2 + u * Math.PI * 2;
    // sweep on clockwise from the top, each with a quick flicker
    const o = u * 0.7;
    const on = ease.outCubic(prog(st.lights, o, 0.25));
    if (on <= 0) continue;
    const fl = 1 - 0.5 * Math.exp(-Math.pow((st.lights - o - 0.06) / 0.03, 2));
    const [x, y] = ringPt(ROOF[0] + 0.005, th, st.m);
    const px = cx + x * U, py = cy + y * U;
    const a = on * fl * st.alpha * (0.2 + 0.8 * dim) * quiet;
    if (a <= 0.004) continue;
    L.lightBlob(ctx, px, py, Math.max(0, 0.05 * U * rad), LIGHT, 0.3 * a);
    ctx.fillStyle = rgba(LIGHT, 0.9 * a);
    ctx.beginPath(); ctx.arc(px, py, Math.max(0, 0.0055 * U * rad), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** The nucleus: a near-single-pixel point on the centre spot (≈ 2 mm on a ≈ 200 m stadium: 1/100,000), with only a small
 *  breathing ring so the eye can find it. The inset lens carries the visible grain. */
export function drawNucleus(ctx, F, st, gt, boost = 0) {
  const { cx, cy } = F;
  const a = st.alpha;
  if (a <= 0.01) return;
  const pulse = 0.5 + 0.5 * Math.sin(gt * 3.2);
  ctx.save();
  L.lightBlob(ctx, cx, cy, 5, [190, 255, 235], (0.45 + 0.25 * boost) * a);
  ctx.fillStyle = `rgba(255,255,255,${0.95 * a})`;
  ctx.beginPath(); ctx.arc(cx, cy, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba([190, 255, 235], (0.18 + 0.2 * boost) * (0.6 + 0.4 * pulse) * a);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, 9 + 3 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function drawStadium(ctx, v, st) {
  const F = frame(v);
  const dim = 1 - 0.42 * st.focus - 0.22 * st.stands - 0.74 * st.empty;
  // the atom's shells pushing out (continuity with beat 8's cloud) before the stands take over
  const cloud = st.alpha * (1 - st.m) * 0.9;
  drawStands(ctx, F, st, dim);
  drawPitch(ctx, F, st, dim);
  drawLines(ctx, F, st, dim * (1 - 0.35 * st.empty));
  drawRoof(ctx, F, st, dim);
  drawLights(ctx, F, st, dim);
  if (cloud > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = ringShape(0.7, st.m).a * F.U;
    const g = ctx.createRadialGradient(F.cx, F.cy, 0, F.cx, F.cy, Math.max(1, r * 1.5));
    g.addColorStop(0, `rgba(150,225,255,${0.16 * cloud})`);
    g.addColorStop(0.6, `rgba(150,225,255,${0.07 * cloud})`);
    g.addColorStop(1, 'rgba(150,225,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(F.cx - r * 1.6, F.cy - r * 1.6, r * 3.2, r * 3.2);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ the grain-of-sand inset
const INSET = { x: 835, y: 600, r: 148 };
const BLADES = (() => {
  const r = L.rng(4242);
  return Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * 2.4, y: (r() - 0.5) * 2.4, a: r() * Math.PI, l: 0.8 + r() * 1.1, w: 0.035 + r() * 0.04, c: r() }));
})();
const GRAIN = (() => {
  const r = L.rng(77);
  return Array.from({ length: 11 }, (_, i) => 1 + (r() - 0.5) * 0.14 + 0.07 * Math.sin(i * 2.1));
})();

function drawInsetContent(ctx, R, t) {
  // painted centre spot under floodlight: chalk-white grass blades, lit from the upper left
  const bg = ctx.createRadialGradient(-0.3 * R, -0.35 * R, 0, 0, 0, 1.2 * R);
  bg.addColorStop(0, 'rgb(176,188,180)');
  bg.addColorStop(1, 'rgb(84,98,92)');
  ctx.fillStyle = bg;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
  ctx.save();
  ctx.filter = `blur(${(0.022 * R).toFixed(1)}px)`;   // shallow depth of field: the grain is the only sharp thing
  ctx.globalAlpha *= 0.6;
  for (const b of BLADES) {
    ctx.save();
    ctx.translate(b.x * R, b.y * R);
    ctx.rotate(b.a + 0.04 * Math.sin(t * 0.8 + b.c * 6));
    const l = b.l * R, w = b.w * R;
    const g = ctx.createLinearGradient(0, -w, 0, w);
    const base = L.mix([150, 166, 156], [208, 218, 210], b.c);
    g.addColorStop(0, rgba(L.mix(base, [255, 255, 255], 0.25)));
    g.addColorStop(1, rgba(L.mix(base, [40, 50, 46], 0.4)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-l / 2, 0);
    ctx.quadraticCurveTo(0, -w * 1.1, l / 2, 0);
    ctx.quadraticCurveTo(0, w * 1.1, -l / 2, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // fine grit around the grain (sharp, tiny)
  const gr0 = L.rng(5);
  ctx.fillStyle = 'rgba(70,80,74,0.5)';
  for (let i = 0; i < 40; i++) { const a = gr0() * 6.28, d = (0.35 + gr0() * 0.6) * R; ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.5 + gr0() * 2, 1.5 + gr0() * 2); }
  // the grain: an irregular rounded quartz pebble with a cast shadow and a glint
  const gr = 0.25 * R;
  const path = (ox, oy, s) => {
    ctx.beginPath();
    const n = GRAIN.length;
    for (let i = 0; i <= n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2;
      const r0 = GRAIN[i % n] * gr * s, r1 = (GRAIN[i % n] + GRAIN[(i + 1) % n]) / 2 * gr * s;
      const x0 = ox + Math.cos(a0) * r0, y0 = oy + Math.sin(a0) * r0 * 0.86;
      if (i === 0) ctx.moveTo(x0, y0);
      else ctx.quadraticCurveTo(ox + Math.cos(a0 - Math.PI / n) * r1 * 1.08, oy + Math.sin(a0 - Math.PI / n) * r1 * 0.93, x0, y0);
      void a1;
    }
    ctx.closePath();
  };
  ctx.save();
  ctx.filter = `blur(${(0.05 * R).toFixed(1)}px)`;
  ctx.fillStyle = 'rgba(10,16,14,0.55)';
  path(0.07 * R, 0.09 * R, 1.05); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
  const gg = ctx.createRadialGradient(-0.35 * gr, -0.4 * gr, 0.1 * gr, 0, 0, 1.3 * gr);
  gg.addColorStop(0, 'rgb(250,232,196)');
  gg.addColorStop(0.55, 'rgb(212,172,116)');
  gg.addColorStop(1, 'rgb(122,88,52)');
  ctx.fillStyle = gg;
  path(0, 0, 1); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,210,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.save();
  path(0, 0, 1); ctx.clip();
  const bounce = ctx.createRadialGradient(0.5 * gr, 0.55 * gr, 0, 0.5 * gr, 0.55 * gr, 0.8 * gr);
  bounce.addColorStop(0, 'rgba(110,240,200,0.28)');
  bounce.addColorStop(1, 'rgba(110,240,200,0)');
  ctx.fillStyle = bounce;
  ctx.fillRect(-2 * gr, -2 * gr, 4 * gr, 4 * gr);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(-0.38 * gr, -0.42 * gr, 0.16 * gr, 0.09 * gr, -0.6, 0, Math.PI * 2); ctx.fill();
}

function drawInset(ctx, v, st, k, fade = 1) {
  if (k <= 0.005 || fade <= 0.003) return;
  const F = frame(v);
  const e = ease.outBack(clamp(k), 1.3);
  const x = lerp(F.cx, INSET.x, ease.outCubic(clamp(k))), y = lerp(F.cy, INSET.y, ease.outCubic(clamp(k)));
  const R = Math.max(0, INSET.r * e);
  // magnifier cone: two tangent lines from the centre spot to the lens
  const dx = x - F.cx, dy = y - F.cy, dist = Math.hypot(dx, dy);
  ctx.save();
  ctx.globalAlpha *= fade;   // leaves by fading in place (not by collapsing as a ghost)
  if (dist > R + 4) {
    const base = Math.atan2(dy, dx), off = Math.asin(clamp(R / dist, -1, 1));
    const tl = Math.sqrt(Math.max(0, dist * dist - R * R));
    const cone = ctx.createLinearGradient(F.cx, F.cy, x, y);
    cone.addColorStop(0, rgba(v.accent, 0.0));
    cone.addColorStop(1, rgba(v.accent, 0.1 * k));
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(F.cx, F.cy);
    ctx.lineTo(F.cx + Math.cos(base - off) * tl, F.cy + Math.sin(base - off) * tl);
    ctx.arc(x, y, R, base - off - Math.PI / 2, base + off + Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(v.accent, 0.55 * k);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const sg of [-1, 1]) {
      ctx.moveTo(F.cx, F.cy);
      ctx.lineTo(F.cx + Math.cos(base + sg * off) * tl, F.cy + Math.sin(base + sg * off) * tl);
    }
    ctx.stroke();
  }
  // drop shadow + lens body
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = 'rgb(10,14,16)';
  ctx.beginPath(); ctx.arc(x, y, R + 5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
  ctx.translate(x, y);
  // a slight settle-in zoom inside the lens
  const z = lerp(1.25, 1, ease.outCubic(clamp(k)));
  ctx.scale(z, z);
  drawInsetContent(ctx, INSET.r, v.gt);
  // nucleus glow on the grain
  ctx.restore();
  L.lightBlob(ctx, x, y, R * 0.55, v.accent, 0.12 * k);
  // lens rim: accent ring + glass highlight
  ctx.strokeStyle = rgba(v.accent, 0.95 * k);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, R + 1.5, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.25 * k})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, R - 7), Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  // 2 mm scale tick inside the lens (the grain ≈ 0.5 R across: 200 m × 1/100,000 = 2 mm)
  const tk = ease.outCubic(prog(k, 0.7, 0.3));
  if (tk > 0) {
    ctx.globalAlpha *= tk;
    const ly = y + R * 0.62, lw = 0.5 * INSET.r;
    ctx.strokeStyle = 'rgba(12,18,16,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - lw / 2, ly - 6); ctx.lineTo(x - lw / 2, ly); ctx.lineTo(x + lw / 2, ly); ctx.lineTo(x + lw / 2, ly - 6); ctx.stroke();
    ctx.font = L.font(22, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(12,18,16,0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('2 mm', x, ly + 24);
  }
  ctx.restore();
}

/** "≈ 200 m" width rule across the top of the stadium. */
function drawWidthRule(ctx, v, st, k) {
  if (k <= 0.01) return;
  const F = frame(v);
  const e = ease.outCubic(clamp(k));
  const y = F.cy - B * F.U - 34, hw = F.U * e;
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.5);
  ctx.strokeStyle = rgba(v.accent, 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(F.cx - hw, y - 12); ctx.lineTo(F.cx - hw, y + 12);
  ctx.moveTo(F.cx - hw, y); ctx.lineTo(F.cx + hw, y);
  ctx.moveTo(F.cx + hw, y - 12); ctx.lineTo(F.cx + hw, y + 12);
  ctx.stroke();
  // label in a dark pill on the rule
  ctx.font = L.font(50, 800, L.FONT.display);
  const txt = '≈ 200 m';
  const tw = ctx.measureText(txt).width;
  ctx.fillStyle = 'rgba(6,10,12,0.92)';
  L.roundRect(ctx, F.cx - tw / 2 - 22, y - 34, tw + 44, 68, 34);
  ctx.fill();
  ctx.fillStyle = rgba(v.accent);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(txt, F.cx, y + 3);
  ctx.restore();
}

// ------------------------------------------------------------------ timing (seconds from beat-9 start)
const T = { rule: 1.45, ruleOut: 3.1, ping: 3.2, inset: 4.15, label: 4.55 };

export default {
  beat: 9,
  chapter: { num: '09', title: 'Stadium scale', sub: 'One atom, blown up two trillion times' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.3, name: 'swell', gain: 0.32, pitch: 0.8 },        // the shells start to stretch
      { t: 0.85, name: 'whoosh', gain: 0.22, pitch: 0.7 },      // rows sweep outward
      { t: 1.5, name: 'swish', gain: 0.2, pitch: 1.2 },         // pitch lines draw themselves
      { t: T.rule, name: 'tick', gain: 0.3, pitch: 1.1 },       // ≈ 200 m
      { t: 2.1, name: 'shimmer', gain: 0.3, pitch: 1.0 },       // floodlights sweep on
      { t: 2.15, name: 'bloom', gain: 0.25, pitch: 0.9 },
      { t: T.ping, name: 'ping', gain: 0.32, pitch: 1.5 },      // the centre spot: "its nucleus"
      { t: T.inset, name: 'swish', gain: 0.25, pitch: 1.4 },    // the magnifier opens
      { t: T.label, name: 'blip', gain: 0.3, pitch: 1.2 },      // "a grain of sand"
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    const st = stadiumState(v.gt, v.tl);
    if (!st.on || st.alpha <= 0.002) return;
    drawStadium(ctx, v, st);
    const F = frame(v);
    // centre-spot pulse rings ("its nucleus") during the focus phase
    const pk = prog(v.t, T.ping, 1.2);
    if (pk > 0 && pk < 1) {
      ctx.save();
      for (const o of [0, 0.25]) {
        const q = clamp((pk - o) / (1 - o));
        if (q <= 0 || q >= 1) continue;
        ctx.strokeStyle = rgba(v.accent, 0.7 * (1 - q));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(F.cx, F.cy, Math.max(0, 8 + ease.outCubic(q) * 60), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    drawNucleus(ctx, F, st, v.gt, st.focus);
  },
  drawOverlay(ctx, v) {
    const st = stadiumState(v.gt, v.tl);
    const t = v.t;
    drawWidthRule(ctx, v, st, Math.min(prog(t, T.rule, 0.5), 1 - ease.inCubic(prog(t, T.ruleOut, 0.35))));
    // the lens and the stat fade out together over the last 0.3 s, ending at the beat change (52.2 s)
    const out = 1 - ease.inOutCubic(prog(t, v.d - 0.3, 0.3));
    drawInset(ctx, v, st, prog(t, T.inset, 0.6), out);
    if (out > 0) {
      ctx.save();
      ctx.globalAlpha *= out;
      L.bigLabel(ctx, { ...LABEL, big: '≈ 2 mm', small: 'nucleus: a grain of sand', k: prog(t, T.label, 0.5), accent: v.accent, size: 110 });
      ctx.restore();
    }
  },
};
