// Beat 12 — 19: "Meanwhile, Roman astrologers gave each day to one of those lights. | The names survive."
// 19c (beat 8): "Rome gave each day to one of them." (2.1 s): faster move (env MOVE), no glint, no French / Norse rows.
//
// The camera flies back from the globe into the sky while env moves the seven lights from their arc into the
// weekday column (Sunday at the top). Here:
//   * comet trails follow each light along its bowed path into the column;
//   * as each light lands, its planet name slides out of it (masked reveal) with a hairline tick;
//   * label "one day each" / "Roman astrology" (top right) once the column has settled;
//   * "The names survive": a glint runs down the names, top to bottom.
//
// THE NAMES SYSTEM (shared by s13, s14 and, by import, s15): this file draws every row's name in drawWorld from the
// moment it appears (beat 12) until the column swings into the calendar (beat 16). Each row is a function of
// time: planet name → (morph) weekday name. The morph is the film's typographic signature: the shared prefix
// stays put (SATUR·N → SATUR·DAY, MO·ON → MO·NDAY, MAR·S → MAR·DI), the old suffix slides up out of a mask and
// the new one rises in from below, letter by letter, then a glint sweeps the word.
//   beat 13: SATURN → SATURDAY, SUN → SUNDAY, MOON → MONDAY (one per phrase)
//   beat 14: MARS → MARDI, MERCURY → MERCREDI, JUPITER → JEUDI, VENUS → VENDREDI (on each spoken word)
//   beat 15: the four French names (and their Latin roots) EXIT upward on each god's name (frenchOut); s15 brings
//            the English weekday in at the same anchor (nameAnchor) with drawMorph.
//   beat 16: the remaining rows ride s16's swing (headerLightPos), tuck toward their light and fade (as s15's do).
// Colour: planet names in their light's tint; weekday names cream (DAY_COL) with the shared root in the accent.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, LIGHTS, lightPos, lightEmphasis, skyK, MOVE } from '../env.js';
import { headerLightPos } from './s16-ten-day-week.js';
import { carry, kIn, isCut, LT } from '../legacy.js';

const T = (tl, b) => tl.scenes[b].start;
/** The timeline, loaded once (cues(d) gets no timeline: cue times come from here). 19c: the LEGACY (19-shaped) timeline
 *  of legacy.js (preroll line dropped), so the 19 beat indices below hold. */
export const TL = LT;
const DAY_TO_I = []; LIGHTS.forEach((Lt, i) => { DAY_TO_I[Lt.day] = i; });

// ------------------------------------------------------------------ timing helpers
/** Start time of word n in a phrase (same word weighting as the caption engine). */
export function wordStart(ph, n) {
  const words = ph.text.split(/\s+/);
  const w = words.map((x) => x.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(x) ? 3 : 0));
  const tot = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < n && i < w.length; i++) acc += w[i];
  return ph.start + (ph.end - ph.start) * acc / tot;
}
const phr = (tl, line, p) => tl.lines[line].phrases?.[p] ?? tl.lines[line];

/** Global time the planet name of light i starts to slide out (as the light lands in the column). */
// 19c: on env's (faster) MOVE: 0.4 s before the light lands (19: 0.35 + 0.07 · day + 1.3 with a 1.7 s move)
export const nameIn = (i, tl) => T(tl, 12) + MOVE.t0 + MOVE.st * LIGHTS[i].day + MOVE.dur - 0.4;
/** Global time light i lands in the column (its ripple). */
const landT = (i, tl) => T(tl, 12) + MOVE.t0 + MOVE.st * LIGHTS[i].day + MOVE.dur - 0.15;

/**
 * Measured word onsets (s, from build/vo.wav's energy envelope) for the morph words, keyed to the phrase start they
 * were measured against. Used only while that phrase still starts there (a re-voiced line falls back to the
 * character-weighted estimate).
 */
const ONSETS = {
  '14.1': { start: 61.528, words: { 0: 61.55, 2: 62.76 } },          // mardi, Mercredi
  '14.2': { start: 64.206, words: { 0: 64.22, 2: 65.55 } },          // Jeudi, Vendredi
  '15.1': { start: 69.073, words: { 0: 69.08, 1: 69.55, 2: 70.19, 4: 70.57 } },   // Tyr, Woden, Thor, Frigg
};
function spoken(tl, line, p, n) {
  const ph = phr(tl, line, p), m = ONSETS[`${line}.${p}`];
  if (m && Math.abs(ph.start - m.start) < 0.02 && m.words[n] != null) return m.words[n];
  return wordStart(ph, n);
}

/** Morph start times (global s) keyed by light key. Beat 13 = English, beat 14 = French (≈ 0.12-0.18 s before each word). */
export function morphTimes(tl) {
  const p13 = (p) => phr(tl, 13, p).start + 0.02;
  // 19c: the French line (19 beat 14) is cut: Mars, Mercury, Jupiter and Venus keep their planet names
  if (isCut(14)) return { saturn: p13(0), sun: p13(1), moon: p13(2), mars: Infinity, mercury: Infinity, jupiter: Infinity, venus: Infinity };
  return {
    saturn: p13(0), sun: p13(1), moon: p13(2),
    mars: spoken(tl, 14, 1, 0) - 0.12, mercury: spoken(tl, 14, 1, 2) - 0.18,
    jupiter: spoken(tl, 14, 2, 0) - 0.12, venus: spoken(tl, 14, 2, 2) - 0.18,
  };
}
/** Beat 15: when the French name of light i starts its exit (≈ 0.22 s before its god's name: Tyr, Woden, Thor, Frigg). */
export function frenchOut(i, tl) {
  const idx = { mars: 0, mercury: 1, jupiter: 2, venus: 4 }[LIGHTS[i].key];
  return idx == null || isCut(15) ? Infinity   /* 19c: no Norse line, no French exits */ : spoken(tl, 15, 1, idx) - 0.22;
}

// ------------------------------------------------------------------ the rows
const TARGET = { saturn: 'SATURDAY', sun: 'SUNDAY', moon: 'MONDAY', mars: 'MARDI', mercury: 'MERCREDI', jupiter: 'JEUDI', venus: 'VENDREDI' };
const LATIN = { saturn: 'dies Saturni', sun: 'dies Solis', moon: 'dies Lunae', mars: 'dies Martis', mercury: 'dies Mercurii', jupiter: 'dies Iovis', venus: 'dies Veneris' };
// In world units, so the rows scale with the camera (≈ 58 px in beats 12-13, ≈ 64 px in beats 14-15). s15 uses the
// same metrics (NAME_U 0.72, NAME_DX 0.95, baseline + 0.36 × size, tracking 0.04 × size): keep them in sync.
const NAME_U = 0.72;        // name font size (u)
const NAME_DX = 0.95;       // name left edge, right of the light centre (u)
const NAME_DY = 0.36;       // baseline below the light centre, × size
export const NAME_COL = (i) => L.mix(LIGHTS[i].col, [255, 255, 255], 0.45);   // planet-name colour
export const DAY_COL = [244, 239, 230];                                         // weekday-name colour (s15's CREAM)
export const ROOT_COL = ACCENT;                                                 // the shared root (SATUR-, SUN-, MAR-…)
const LATIN_COL = [214, 204, 186];

/**
 * Screen anchor of light i's name at view v: {x (left edge), y (baseline), size (px), lx, ly (light centre)}.
 * s15: draw the English weekday here (same baseline and size) so the hand-off is seamless.
 */
export function nameAnchor(v, i) {
  const t16 = T(v.tl, 16);
  let p, tuck = 0;
  if (v.gt < t16) p = lightPos(i, v.gt, v.tl);
  else { p = headerLightPos(i, v.gt, v.tl); tuck = L.ease.inCubic(L.prog(v.gt, t16 + 0.1, 0.6)); }   // as s15
  const size = NAME_U / v.cam.mpp;
  const lx = v.wx(p.x), ly = v.wy(p.y);
  return { x: lx + NAME_DX / v.cam.mpp - tuck * size * 0.9, y: ly + size * NAME_DY, size, lx, ly };
}
/** Width in px of a name at a px size (for layout beside the column). */
export function nameWidth(c, str, size) { c.save(); c.font = nameFont(size); c.letterSpacing = '0px'; const w = c.measureText(str).width + str.length * TRACK * size; c.restore(); return w; }
/** The name font at a pixel size. */
export const nameFont = (size) => L.font(size, 800, L.FONT.display);
const TRACK = 0.04;   // letter-spacing, × size
/** x offset of char n of str (font must be set). */
function charX(c, str, n, size) { return n <= 0 ? 0 : c.measureText(str.slice(0, n)).width + n * TRACK * size; }

function commonPrefix(a, b) { let n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; }

/**
 * The morph (also exported for s15). Draws `from` turning into `to` at screen (x, baseline y), px size.
 * ts = seconds since the morph started (< 0: plain `from`; large: plain `to`). colFrom / colTo: [r,g,b].
 * The suffix letters move inside a mask band (cap height), so they slide out of / into a slit.
 */
export function drawMorph(c, from, to, ts, x, y, size, colFrom, colTo, alpha = 1, colRoot = colTo, fromRoot = 0) {
  if (alpha <= 0.002) return;
  c.save();
  c.font = nameFont(size);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  c.letterSpacing = '0px';
  const p = ts < 0 ? from.length : commonPrefix(from, to);
  const kc = L.ease.inOutCubic(L.prog(ts, 0.2, 0.6));
  const prefCol = L.mix(colFrom, colRoot, kc);
  c.shadowColor = 'rgba(2,4,12,0.75)';
  c.shadowBlur = size * 0.22;
  // shared prefix (stays put)
  c.fillStyle = L.rgba(prefCol, alpha);
  for (let n = 0; n < p; n++) c.fillText(from[n], x + charX(c, from, n, size), y);
  // suffixes, inside the mask band
  c.save();
  c.beginPath();
  c.rect(x - size, y - size * 0.98, size * 12, size * 1.16);
  c.clip();
  if (ts >= 0) {
    for (let j = 0; p + j < from.length; j++) {
      const ko = L.ease.inCubic(L.prog(ts, 0.03 * j, 0.32));
      if (ko >= 1) continue;
      c.fillStyle = L.rgba(p + j < fromRoot ? colRoot : colFrom, alpha * (1 - ko));
      c.fillText(from[p + j], x + charX(c, from, p + j, size), y - ko * size * 0.62);
    }
    for (let j = 0; p + j < to.length; j++) {
      const kn = L.ease.outCubic(L.prog(ts, 0.16 + 0.055 * j, 0.42));
      if (kn <= 0) continue;
      const hot = 1 - L.ease.outCubic(L.prog(ts, 0.3 + 0.055 * j, 0.6));
      c.fillStyle = L.rgba(L.mix(colTo, [255, 248, 230], 0.6 * hot), alpha * L.clamp(kn * 1.6));
      c.fillText(to[p + j], x + charX(c, to, p + j, size) - (1 - kn) * size * 0.08, y + (1 - kn) * size * 0.75);
    }
  }
  c.restore();
  // glint: a bright band sweeps across the finished word
  const word = ts < 0.5 ? from : to;
  const kg = L.prog(ts, 0.55, 0.55);
  if (ts >= 0 && kg > 0 && kg < 1) drawGlint(c, word, x, y, size, kg, alpha);
  c.restore();
}

/** Plain name (no morph). */
export function drawName(c, str, x, y, size, col, alpha = 1) { drawMorph(c, str, str, -1, x, y, size, col, col, alpha); }

/** A light band sweeping across a word (g 0..1), additive. Font must be the name font. */
export function drawGlint(c, word, x, y, size, g, alpha = 1) {
  c.save();
  c.font = nameFont(size);
  c.textBaseline = 'alphabetic';
  c.shadowBlur = 0;
  c.shadowColor = 'transparent';
  const w = charX(c, word, word.length, size);
  const gx = x - w * 0.3 + g * w * 1.6;
  const gr = c.createLinearGradient(gx - size * 1.2, y - size, gx + size * 1.2, y);
  gr.addColorStop(0, 'rgba(255,248,230,0)');
  gr.addColorStop(0.5, `rgba(255,248,230,${0.75 * alpha})`);
  gr.addColorStop(1, 'rgba(255,248,230,0)');
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = gr;
  for (let n = 0; n < word.length; n++) c.fillText(word[n], x + charX(c, word, n, size), y);
  c.restore();
}

/** Latin root line under a name ("dies Martis"), italic, wiping in from the left. */
function drawLatin(c, str, x, y, size, k, alpha) {
  if (k <= 0 || alpha <= 0) return;
  c.save();
  const fs = Math.max(10, size * 0.4);
  c.font = `italic 500 ${fs}px ${L.FONT.body}`;
  c.textBaseline = 'alphabetic';
  const w = c.measureText(str).width;
  const e = L.ease.outCubic(k);
  c.beginPath(); c.rect(x - 4, y - fs * 1.2, (w + fs * 2.2) * e + 4, fs * 1.6); c.clip();
  c.shadowColor = 'rgba(2,4,12,0.8)';
  c.shadowBlur = fs * 0.5;
  // a short accent dash, then the root
  c.fillStyle = L.rgba(DAY_COL, 0.85 * alpha);
  c.fillRect(x + 2, y - fs * 0.34, fs * 0.9, Math.max(1.2, fs * 0.08));
  c.fillStyle = L.rgba(LATIN_COL, 0.9 * alpha);
  c.fillText(str, x + fs * 1.3, y);
  c.restore();
}

/** Visibility 0..1 of the names as a whole (sky zoom, and the beat-16 fade). */
function rowsK(v) {
  return skyK(v) * (1 - L.ease.inCubic(L.prog(v.gt, T(v.tl, 16) + 0.05, 0.6)));   // same fade as s15's names
}
/** Emphasis alpha of row i: follows env's dimming (0.35..1), lifted a little so dim names stay legible. */
const rowEmph = (i, v) => L.lerp(0.5, 1, (lightEmphasis(i, v.gt, v.tl) - 0.35) / 0.65);
/** Dim rows also lose colour (toward a cool grey), so the featured rows own the warmth. */
const DIM_GREY = [150, 154, 168];
const dimCol = (col, i, v) => L.mix(col, DIM_GREY, 0.6 * (1 - (lightEmphasis(i, v.gt, v.tl) - 0.35) / 0.65));

function drawRows(c, v) {
  const tl = v.tl, gt = v.gt;
  const kAll = rowsK(v);
  if (kAll <= 0.002) return;
  const MT = morphTimes(tl);
  for (let i = 0; i < LIGHTS.length; i++) {
    const t0 = nameIn(i, tl);
    if (gt < t0) continue;
    const Lt = LIGHTS[i];
    const a = nameAnchor(v, i);
    if (a.y < -100 || a.y > L.H + 100) continue;
    const kin = L.prog(gt, t0, 0.55);
    let alpha = kAll * rowEmph(i, v);
    const tm = MT[Lt.key];
    const ts = gt - tm;
    const fo = frenchOut(i, tl);
    const kfo = L.ease.inCubic(L.prog(gt, fo, 0.4));        // French exit (beat 15)
    const rootCol = ROOT_COL;
    // the hairline tick from the light to its name
    const tx0 = a.lx + Math.max(LIGHTS[i].r / v.cam.mpp, 3) + a.size * 0.2, tx1 = a.x - a.size * 0.14;
    if (tx1 > tx0 + 4) {
      c.save();
      c.globalAlpha = alpha * L.ease.outCubic(L.prog(gt, t0 - 0.05, 0.4)) * 0.5;
      c.strokeStyle = L.rgba(NAME_COL(i));
      c.lineWidth = Math.max(1, a.size * 0.025);
      c.beginPath(); c.moveTo(tx0, a.ly); c.lineTo(L.lerp(tx0, tx1, L.ease.outCubic(L.prog(gt, t0 - 0.05, 0.4))), a.ly); c.stroke();
      c.restore();
    }
    // the name: slides out of the light (masked by its left edge) in beat 12
    c.save();
    const e = L.ease.outCubic(kin);
    c.beginPath(); c.rect(a.x - a.size * 0.1, a.y - a.size * 1.2, a.size * 12, a.size * 1.6); c.clip();
    const sx = a.x - (1 - e) * a.size * 1.6;
    const pulse = 1 + 0.06 * Math.sin(Math.PI * L.prog(ts, 0.1, 0.7));   // a small swell while it morphs
    const size = a.size * pulse;
    const yy = a.y + (size - a.size) * 0.36;
    if (kfo > 0) {
      // French → out: the whole word slides up out of the mask (s15 brings the English weekday in beneath)
      drawMorph(c, TARGET[Lt.key], '', (gt - fo) * 0.95, sx, yy, size, dimCol(DAY_COL, i, v), DAY_COL, alpha * e, dimCol(rootCol, i, v), commonPrefix(Lt.name, TARGET[Lt.key]));
    } else {
      drawMorph(c, Lt.name, TARGET[Lt.key], ts, sx, yy, size, dimCol(NAME_COL(i), i, v), dimCol(DAY_COL, i, v), alpha * L.clamp(e * 1.4), dimCol(rootCol, i, v));
    }
    c.restore();
    // beat 12 "The names survive": a glint runs down the column
    // (19c: "The names survive" is cut, so beat 12's line has one phrase: no glint)
    const gs = phr(tl, 12, 1).start + 0.05 + 0.09 * Lt.day;
    const kg = (tl.lines[12].phrases?.length ?? 1) > 1 ? L.prog(gt, gs, 0.6) : 0;
    if (kg > 0 && kg < 1 && ts < 0) drawGlint(c, Lt.name, a.x, a.y, a.size, kg, alpha * 0.9);
    // Latin root under a morphed name
    if (ts > 0) drawLatin(c, LATIN[Lt.key], a.x + a.size * 0.02, a.y + a.size * 0.56, a.size, L.prog(ts, 0.5, 0.6), alpha * (1 - kfo));
    // a bloom on the light as its name changes
    const kb = L.prog(ts, 0, 0.9);
    if (kb > 0 && kb < 1) L.lightBlob(c, a.lx, a.ly, a.size * (1.6 + 1.2 * kb), Lt.col, 0.4 * Math.sin(Math.PI * kb) * kAll);
  }
}

// ------------------------------------------------------------------ comet trails along the arc → column move
function drawTrails(c, v) {
  const t12 = T(v.tl, 12);
  if (v.gt < t12 + MOVE.t0 - 0.05 || v.gt > t12 + MOVE.t0 + 6 * MOVE.st + MOVE.dur + 0.2) return;
  const k = skyK(v);
  if (k <= 0.01) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (let i = 0; i < LIGHTS.length; i++) {
    const pts = [];
    for (let j = 0; j <= 14; j++) {
      const p = lightPos(i, v.gt - j * 0.035, v.tl);
      pts.push([v.wx(p.x), v.wy(p.y), p.move]);
    }
    const mv = pts[0][2];
    const amt = Math.sin(Math.PI * L.clamp(mv)) * k;
    if (amt <= 0.01) continue;
    const w = Math.max(1.5, LIGHTS[i].r / v.cam.mpp * 0.9);
    // one filled tapered ribbon per trail (no per-segment caps to pile up under 'lighter')
    const n = pts.length;
    const L0 = [], R0 = [];
    for (let j = 0; j < n; j++) {
      const a = pts[Math.max(0, j - 1)], b = pts[Math.min(n - 1, j + 1)];
      let dx = a[0] - b[0], dy = a[1] - b[1];
      const dl = Math.hypot(dx, dy);
      if (dl < 1e-6) { dx = 0; dy = 0; } else { dx /= dl; dy /= dl; }
      const f = 1 - j / (n - 1);
      const hw = 0.5 * w * (0.25 + 0.75 * f);
      L0.push([pts[j][0] - dy * hw, pts[j][1] + dx * hw]);
      R0.push([pts[j][0] + dy * hw, pts[j][1] - dx * hw]);
    }
    const hx = pts[0][0], hy = pts[0][1], tx = pts[n - 1][0], ty = pts[n - 1][1];
    if (Math.hypot(hx - tx, hy - ty) < 1) continue;
    const g = c.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, L.rgba(LIGHTS[i].col, 0.45 * amt));
    g.addColorStop(0.5, L.rgba(LIGHTS[i].col, 0.2 * amt));
    g.addColorStop(1, L.rgba(LIGHTS[i].col, 0));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(L0[0][0], L0[0][1]);
    for (let j = 1; j < n; j++) c.lineTo(L0[j][0], L0[j][1]);
    for (let j = n - 1; j >= 0; j--) c.lineTo(R0[j][0], R0[j][1]);
    c.closePath(); c.fill();
    // rounded head
    c.fillStyle = L.rgba(LIGHTS[i].col, 0.45 * amt);
    c.beginPath(); c.arc(hx, hy, Math.max(0, w * 0.5), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ landing ripples
function drawLandings(c, v) {
  const k = skyK(v);
  if (k <= 0.01) return;
  for (let i = 0; i < LIGHTS.length; i++) {
    const tl0 = landT(i, v.tl);
    const kr = L.prog(v.gt, tl0, 0.8);
    if (kr <= 0 || kr >= 1) continue;
    const p = lightPos(i, v.gt, v.tl);
    const x = v.wx(p.x), y = v.wy(p.y);
    const r = (0.3 + 0.9 * L.ease.outCubic(kr)) / v.cam.mpp;
    c.save();
    c.strokeStyle = L.rgba(LIGHTS[i].col, 0.5 * (1 - kr) * k);
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.stroke();
    c.restore();
  }
}

const SCENE = {
  beat: 12,
  chapter: { num: '08', title: 'Planet days', sub: 'Rome, c. AD 100' },
  captions: true,
  layer: 2,
  cues(d) {
    const t12 = T(TL, 12);
    const out = [{ t: MOVE.t0 + 0.05, name: 'swish', gain: 0.22, pitch: 0.8 }];
    // the lights land one by one (weekday order): a rising run of soft ticks
    for (let day = 0; day < 7; day++) out.push({ t: landT(LIGHTS.findIndex((Lt) => Lt.day === day), TL) - t12, name: 'tick', gain: 0.12, pitch: 1.0 + day * 0.08 });
    out.push({ t: 0.4, name: 'ping', gain: 0.18, pitch: 1.0 });   // ONE DAY EACH (lands from 0.35)
    return out;
  },
  drawWorld(c, v) {
    if (v.gt < T(v.tl, 12) - 0.2 || v.gt > T(v.tl, 16) + 0.5) return;
    drawTrails(c, v);
    drawLandings(c, v);
    drawRows(c, v);
  },
  drawOverlay(c, v) {
    const t = v.t;
    const k = v.k * L.enter(t, 0.35, 0.5);   // 19c: from 0.35 s, held to the beat end (see the default export)
    if (k <= 0) return;
    L.bigLabel(c, { x: 940, y: 470, big: 'ONE DAY EACH', small: 'Roman astrology', k, accent: v.accent, size: 72, align: 'right' });
  },
};

/**
 * Row cursor (s13, s14): a small accent bar left of the column that glides from row to row on each morph.
 * keys: light keys in order; times: their morph start (global s); kVis: 0..1 visibility.
 */
export function drawCursor(c, v, keys, times, kVis) {
  if (kVis <= 0.002) return;
  const idx = keys.map((k) => LIGHTS.findIndex((Lt) => Lt.key === k));
  // which row, and where between rows
  let y = null, x = null, size = 0;
  for (let n = 0; n < idx.length; n++) {
    const a = nameAnchor(v, idx[n]);
    const kk = n === 0 ? 1 : L.ease.inOutCubic(L.prog(v.gt, times[n] - 0.35, 0.45));
    if (y == null) { y = a.ly; x = a.lx; size = a.size; } else { y = L.lerp(y, a.ly, kk); x = L.lerp(x, a.lx, kk); }
  }
  const k = kVis * L.ease.outCubic(L.prog(v.gt, times[0] - 0.55, 0.4));
  if (k <= 0) return;
  const bx = x - size * 1.25, h = size * 0.78;
  c.save();
  c.globalAlpha = k;
  L.lightBlob(c, bx + 3, y, size * 0.9, ACCENT, 0.25);
  c.fillStyle = L.rgba(ACCENT, 0.95);
  L.roundRect(c, bx, y - h / 2, Math.max(3, size * 0.07), h, 2);
  c.fill();
  c.restore();
}

// 19c: 19 beat 12 plays as a 19c beat on the legacy timeline (legacy.js). Its 2.1 s beat is too short for the label, so
// ONE DAY EACH / Roman astrology holds into beat 13 and bows out 0.2-0.5 s into it (drawn from drawWorld there:
// legacy.js carry), as SATURN starts to turn into SATURDAY
// (visual audit: it no longer lingers into "Saturday is Saturn's day": it bows out over the last 0.32 s of beat 12)
export default carry(SCENE, 12, (ov) => kIn(ov) * (1 - L.ease.inOutCubic(L.prog(ov.gt, ov.tl.scenes[13].start - 0.34, 0.32))));
