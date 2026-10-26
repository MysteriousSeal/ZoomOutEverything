// Beat 7 — "By 1582 it had slipped ten days, | and Easter was drifting away from the real equinox."
// The gap grows to 9.82 days (AD 1582). The gap meter (s04) now counts DAYS: each day of the gap gets its numeral,
// 1 … 10, as the calendar Earth passes it; 10 DAYS lands with the gap.
// Phrase 1: the two equinoxes. At the real Earth, the REAL EQUINOX, ≈ MARCH 11 (Julian date); at the calendar's
// Earth, the CHURCH'S EQUINOX, MARCH 21 (the computus date). An engraved Easter cross slides from the real equinox
// to the church's one along the orbit, leaving a dotted wake: the calendar is late against the sky.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, U_PER_DAY, arcScreen } from '../env.js';
import { S, envK, meterGeom, capsLine, bigBlock, landTime, BLUE, SOFT } from './s04-eleven-minutes.js';

const ph = (v, i, j) => v.tl.lines[i].phrases[j].start;
const WHITE = [242, 236, 224];

/** Day numerals 1 … 10 under the meter (one per day of gap, centred in its day). */
function drawDayNumbers(c, v) {
  const gt = v.gt;
  const k = envK(gt, S(v, 7) + 0.2, 0.4, S(v, 8) + 0.05, 0.3);
  if (k <= 0) return;
  const { d, ry } = meterGeom(v);
  if (d.mode !== 'julian') return;
  const n = Math.ceil(d.days - 0.25);
  const px = U_PER_DAY / v.cam.mpp;
  const sizeK = L.clamp((px - 18) / 12);
  if (sizeK <= 0) return;
  c.save();
  c.globalAlpha *= k * sizeK;
  c.font = L.font(Math.min(26, Math.max(18, px * 0.62)), 700, L.FONT.din);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(4,8,18,0.9)';
  c.shadowBlur = 8;
  for (let i = 1; i <= Math.min(10, n); i++) {
    const u0 = (i - 1) * U_PER_DAY, u1 = Math.min(i, d.days) * U_PER_DAY;
    const p = arcScreen(v, (u0 + u1) / 2);
    const pk = L.ease.outBack(L.clamp((d.days - (i - 1) - 0.25) / 0.5));
    c.save();
    c.globalAlpha *= L.clamp(pk);
    c.fillStyle = L.rgba(i === 10 ? ACCENT : WHITE, 0.92);
    c.translate(p.x, ry + 46);
    c.scale(0.6 + 0.4 * pk, 0.6 + 0.4 * pk);
    c.fillText(String(i), 0, 0);
    c.restore();
  }
  c.restore();
}

/** Small engraved Easter glyph: a gold roundel with a Latin cross. */
function easterGlyph(c, x, y, r, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  L.lightBlob(c, x, y, r * 3, ACCENT, 0.3);
  c.fillStyle = 'rgba(10,16,34,0.92)';
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fill();
  c.strokeStyle = L.rgba(ACCENT);
  c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1;
  c.beginPath(); c.arc(x, y, Math.max(0, r - 4), 0, Math.PI * 2); c.stroke();
  c.fillStyle = L.rgba(ACCENT);
  const a = r * 0.13;
  c.fillRect(x - a, y - r * 0.62, 2 * a, r * 1.24);          // upright
  c.fillRect(x - r * 0.42, y - r * 0.3 - a, r * 0.84, 2 * a);  // cross-bar (high: a Latin cross)
  c.restore();
}

/** Phrase 1: the two equinox markers and the sliding Easter glyph. */
function drawEquinoxes(c, v) {
  const gt = v.gt, p1 = ph(v, 7, 1);
  const k = envK(gt, p1 - 0.05, 0.5, S(v, 8) + 0.05, 0.3);
  if (k <= 0) return;
  const { d, a, b, ry, r } = meterGeom(v);
  const maxW = Math.min(360, Math.abs(a.x - b.x) - 16);
  const kr = k, kc = k * L.ease.outCubic(L.prog(gt, p1 + 0.25, 0.5));
  // tags under each end of the meter
  capsLine(c, 'REAL EQUINOX', a.x, ry + 92 + (1 - kr) * 10, { color: BLUE, alpha: kr, maxW, size: 24 });
  capsLine(c, '≈ MARCH 11', a.x, ry + 128 + (1 - kr) * 10, { color: BLUE, alpha: kr, maxW, size: 30, weight: 700, family: L.FONT.body });
  capsLine(c, "CHURCH'S EQUINOX", b.x, ry + 92 + (1 - kc) * 10, { color: ACCENT, alpha: kc, maxW, size: 24 });
  capsLine(c, 'MARCH 21', b.x, ry + 128 + (1 - kc) * 10, { color: ACCENT, alpha: kc, maxW, size: 30, weight: 700, family: L.FONT.body });
  // Easter: slides from the real equinox to the church's equinox along the orbit (just inside the ring)
  const s = L.ease.inOutCubic(L.prog(gt, p1 + 0.45, 1.6));
  const u = s * d.u;
  const ge = envK(gt, p1 + 0.3, 0.4, S(v, 8) + 0.05, 0.3);
  const off = -(Math.max(12, r) + 34);
  // dotted wake from the real equinox to the glyph
  c.save();
  c.globalAlpha *= ge;
  c.fillStyle = L.rgba(ACCENT, 0.75);
  const nDots = Math.floor((u / d.u) * 26);
  for (let i = 1; i <= nDots; i++) {
    const q = arcScreen(v, (i / 26) * d.u, -off);
    c.beginPath(); c.arc(q.x, q.y, 2, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  const g = arcScreen(v, u, -off);
  // arcScreen pushes OUTWARD for positive out; the glyph rides just outside the ring (above it on screen)
  easterGlyph(c, g.x, g.y, 15, ge);
  capsLine(c, 'EASTER', g.x - 26, g.y + 7, { color: ACCENT, alpha: ge, size: 20, weight: 700, maxW: 200, track: 3, align: 'right' });
}

export default {
  beat: 7,
  chapter: { num: '06', title: 'Ten days', sub: 'by 1582' },
  layer: 2,
  cues(d) {
    return [
      { t: 0.3, name: 'count', gain: 0.14, pitch: 1.1 },
      { t: 1.95, name: 'impact', gain: 0.22, pitch: 1.0 },
      { t: 3.1, name: 'blip', gain: 0.18, pitch: 1.0 },
      { t: 3.4, name: 'blip', gain: 0.18, pitch: 1.2 },
      { t: 3.6, name: 'swish', gain: 0.16, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt < S(v, 7) || v.gt > S(v, 8) + 0.5) return;
    drawDayNumbers(c, v);
    drawEquinoxes(c, v);
  },
  drawOverlay(c, v) {
    const lt = landTime(v, 7) - S(v, 7);
    const k = v.k * L.enter(v.t, Math.min(lt, 2.1) - 0.1, 0.5);
    bigBlock(c, { y: 1290, parts: [['10 DAYS', ACCENT]], small: 'by AD 1582', k, size: 110 });
  },
};
