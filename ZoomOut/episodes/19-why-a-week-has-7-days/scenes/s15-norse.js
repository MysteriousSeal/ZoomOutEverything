// Beat 15 — "English swapped in Norse gods: | Tyr, Woden, Thor and Frigg."
// Built on s12's names system (the film's morph signature):
//   phrase 1  s14's bracket around the Tue-Fri rows stays; its label swaps FRENCH / Latin roots → ENGLISH / Norse gods.
//   phrase 2  on each god's name, s12 sends the French name (and its Latin root) up out of its mask (frenchOut); here
//             the English weekday rises into the same anchor (drawMorph, letter by letter, glint): TUESDAY,
//             WEDNESDAY, THURSDAY, FRIDAY. Under it, where the Latin root was, the god lands in small accent caps
//             after a drawn Elder-Futhark rune (Tiwaz, Ansuz, Thurisaz, Berkanan), and a hairline underlines the
//             part of the word that comes from the god (TUES-, WEDNES-, THURS-, FRI-). The row cursor glides down.
// Drawn in drawWorld, attached to the lights, so the four rows stay readable into beat 16 and ride the start of the
// column's swing (s12's nameAnchor follows s16's headerLightPos) as they fade, in step with s12's other rows.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, LIGHTS, skyK } from '../env.js';
import { TIMES } from './s16-ten-day-week.js';
import { TL, frenchOut, nameAnchor, nameWidth, nameFont, drawMorph, drawName, drawCursor, DAY_COL, ROOT_COL } from './s12-roman-days.js';

const KEYS = ['mars', 'mercury', 'jupiter', 'venus'];
const iOf = (key) => LIGHTS.findIndex((Lt) => Lt.key === key);
const ROWS = {
  mars: { en: 'TUESDAY', root: 4, god: 'TYR', rune: 'tiwaz' },
  mercury: { en: 'WEDNESDAY', root: 6, god: 'WODEN', rune: 'ansuz' },
  jupiter: { en: 'THURSDAY', root: 5, god: 'THOR', rune: 'thurisaz' },
  venus: { en: 'FRIDAY', root: 3, god: 'FRIGG', rune: 'berkanan' },
};
const T_LABEL = 0.2;    // "English…": the bracket label swaps
const IN_DELAY = { mars: 0.1, mercury: 0.1, jupiter: 0.1, venus: 0 };   // English rises this long after the French leaves
// FRIDAY lands on the last word of the line: it morphs a little faster so the finished row reads well before the fade
const SPEED = { mars: 1, mercury: 1, jupiter: 1, venus: 1.3 };

/** A small Elder-Futhark rune as strokes (top-left x, y; h tall), drawing on with k. */
function drawRune(c, kind, x, y, h, k, alpha) {
  if (k <= 0 || alpha <= 0) return;
  const w = h * 0.5;
  const seg = {
    tiwaz: [[[w / 2, 0], [w / 2, h]], [[0, h * 0.34], [w / 2, 0], [w, h * 0.34]]],
    ansuz: [[[0, 0], [0, h]], [[0, 0], [w, h * 0.28]], [[0, h * 0.32], [w, h * 0.6]]],
    thurisaz: [[[0, 0], [0, h]], [[0, h * 0.22], [w * 0.9, h * 0.5], [0, h * 0.78]]],
    berkanan: [[[0, 0], [0, h]], [[0, 0], [w * 0.9, h * 0.25], [0, h * 0.5], [w * 0.9, h * 0.75], [0, h]]],
  }[kind];
  c.save();
  c.strokeStyle = L.rgba(ACCENT, 0.95 * alpha);
  c.lineWidth = Math.max(1.6, h * 0.08);
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.shadowColor = L.rgba(ACCENT, 0.6 * alpha); c.shadowBlur = h * 0.3;
  const n = seg.length;
  seg.forEach((pts, si) => {
    const kk = L.clamp(k * n - si);
    if (kk <= 0) return;
    const m = pts.length - 1;
    c.beginPath();
    c.moveTo(x + pts[0][0], y + pts[0][1]);
    for (let j = 1; j <= m; j++) {
      const f = L.clamp(kk * m - (j - 1));
      if (f <= 0) break;
      c.lineTo(x + L.lerp(pts[j - 1][0], pts[j][0], f), y + L.lerp(pts[j - 1][1], pts[j][1], f));
    }
    c.stroke();
  });
  c.restore();
}

function drawRows(c, v) {
  const tl = v.tl, gt = v.gt, t16 = tl.scenes[16].start;
  const sw = TIMES(tl).swing;
  if (gt < tl.scenes[15].start || gt > sw + 0.7) return;
  // the rows hold until s16's swing starts, then fade as they ride it (the payoff row FRIDAY / FRIGG stays readable)
  const kAll = skyK(v) * (1 - L.ease.inCubic(L.prog(gt, sw - 0.05, 0.6)));
  // s12's nameAnchor tucks the names toward their lights from t16 + 0.1; re-time that tuck to the swing
  const tuck12 = gt < t16 ? 0 : L.ease.inCubic(L.prog(gt, t16 + 0.1, 0.6));
  const tuck = gt < t16 ? 0 : L.ease.inCubic(L.prog(gt, sw, 0.6));
  if (kAll <= 0.002) return;
  for (const key of KEYS) {
    const i = iOf(key), R = ROWS[key];
    const ts = (gt - (frenchOut(i, tl) + IN_DELAY[key])) * SPEED[key];
    if (ts < 0) continue;
    const a = nameAnchor(v, i);   // rides s16's swing (with a tuck) from beat 16
    const size = a.size, x = a.x + (tuck12 - tuck) * size * 0.9;
    drawMorph(c, '', R.en, ts, x, a.y, size, DAY_COL, DAY_COL, kAll);
    // the god's part of the word warms to the root colour (as SATUR- / SUN- / MAR- did)
    const kr = L.ease.inOutCubic(L.prog(ts, 0.5, 0.5));
    if (kr > 0) drawName(c, R.en.slice(0, R.root), x, a.y, size, ROOT_COL, kAll * kr);
    // the god's root: a hairline under TUES- / WEDNES- / THURS- / FRI-
    c.save();
    c.font = nameFont(size);
    c.letterSpacing = '0px';
    const rootW = c.measureText(R.en.slice(0, R.root)).width + R.root * 0.04 * size - 0.04 * size;
    const ku = L.ease.inOutCubic(L.prog(ts, 0.55, 0.45));
    if (ku > 0) {
      c.globalAlpha = kAll;
      c.fillStyle = L.rgba(ACCENT, 0.9);
      c.fillRect(x, a.y + size * 0.12, rootW * ku, Math.max(1.5, size * 0.03));
    }
    c.restore();
    // the god, where the Latin root was: rune + small accent caps
    const gy = a.y + size * 0.62;
    const fs = Math.max(10, size * 0.36);
    drawRune(c, R.rune, x + 4, gy - fs * 0.98, fs * 1.02, L.prog(ts, 0.2, 0.45), kAll);
    const kg = L.ease.outCubic(L.prog(ts, 0.3, 0.45));
    if (kg > 0) {
      c.save();
      c.globalAlpha = kAll * kg;
      c.font = L.font(fs, 700, L.FONT.body);
      c.fillStyle = L.rgba(ACCENT);
      c.shadowColor = 'rgba(2,4,12,0.8)'; c.shadowBlur = fs * 0.5;
      c.textBaseline = 'alphabetic';
      L.trackedText(c, R.god, x + fs * 1.05 + (1 - kg) * 12, gy, fs * 0.22);
      c.restore();
    }
  }
}

export default {
  beat: 15,
  chapter: null,   // the bracket's ENGLISH / Norse gods label names the beat (a card would sit on the SUNDAY row)
  captions: true,
  layer: 2,
  cues(d) {
    void d;
    const t0 = TL.scenes[15].start;
    const out = [{ t: T_LABEL + 0.05, name: 'ping', gain: 0.16, pitch: 0.9 }];
    KEYS.forEach((key, n) => {
      const t = frenchOut(iOf(key), TL) - t0;
      out.push({ t: t + 0.12, name: 'swish', gain: 0.17, pitch: 0.95 + 0.06 * n });
      out.push({ t: t + 0.42, name: 'ping', gain: 0.18, pitch: [0.8, 0.9, 1.0, 1.12][n] });
    });
    return out;
  },
  drawWorld(c, v) {
    drawRows(c, v);
  },
  drawOverlay(c, v) {
    const t = v.t;
    const outs = KEYS.map((k) => frenchOut(iOf(k), v.tl));
    drawCursor(c, v, KEYS, outs, v.k);
    // the bracket (same geometry as s14's, widened for WEDNESDAY) + the label swap
    const top = nameAnchor(v, iOf('mars')), bot = nameAnchor(v, iOf('venus'));
    const size = top.size;
    const wFr = Math.max(nameWidth(c, 'MERCURY', size), nameWidth(c, 'MERCREDI', size));
    const wEn = nameWidth(c, 'WEDNESDAY', size);
    const kw = L.ease.inOutCubic(L.prog(v.gt, outs[1] - 0.3, 0.6));
    const bx = top.x + L.lerp(wFr, Math.max(wFr, wEn), kw) + size * 0.55;
    const y0 = top.ly - size * 0.55, y1 = bot.ly + size * 0.55, ym = (y0 + y1) / 2;
    c.save();
    c.strokeStyle = L.rgba(ACCENT, 0.75 * v.k);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(bx - 16, y0); c.lineTo(bx, y0); c.lineTo(bx, y1); c.lineTo(bx - 16, y1);
    c.moveTo(bx, ym); c.lineTo(bx + 18, ym);
    c.stroke();
    c.restore();
    const kl = v.k * L.enter(t, T_LABEL, 0.55);
    L.bigLabel(c, { x: bx + 40, y: ym + 26, big: 'ENGLISH', small: 'Norse gods', k: kl, accent: v.accent, size: 72 });
  },
};
