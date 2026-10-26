// Beat 6 — "But it adds up to a whole day every hundred and twenty-eight years."
// The camera pulls out while the gap grows to 1 DAY (env driftAt: AD 325 → 453). The gap meter (s04) follows the drift,
// its graduations handing over from minutes to hours. This file owns the YEAR COUNTER under the meter (beats 6–7,
// "N YEARS · COUNTING FROM AD 325", racing 1 → 128 → 1,257) and lands 1 DAY = 128 YEARS as the gap reaches a day.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, drift } from '../env.js';
import { S, envK, meterGeom, capsLine, bigBlock, landTime, SOFT } from './s04-eleven-minutes.js';

const ph = (v, i, j) => v.tl.lines[i].phrases[j].start;

/** The year counter under the gap meter (beats 6 → 7, until Easter enters in beat 7's phrase 1). */
function drawCounter(c, v) {
  const gt = v.gt;
  const k = envK(gt, S(v, 6) + 0.55, 0.5, ph(v, 7, 1) - 0.25, 0.35);
  if (k <= 0) return;
  const { d, a, b, ry } = meterGeom(v);
  if (d.mode !== 'julian') return;
  const years = Math.max(1, d.year - 325);
  const x = (a.x + b.x) / 2;
  // a beat-7 nudge down to make room for the day numerals on the meter
  const dy = 100 + 26 * L.ease.inOutCubic(L.prog(gt, S(v, 7), 0.6));
  c.save();
  c.globalAlpha *= k;
  c.textBaseline = 'alphabetic';
  const big = `${L.fmt(years)} ${years === 1 ? 'YEAR' : 'YEARS'}`;
  c.font = L.font(88, 700, L.FONT.din);
  c.fillStyle = 'rgb(242,236,224)';
  c.shadowColor = 'rgba(4,8,18,0.92)';
  c.shadowBlur = 12;
  // tabular-ish: keep the centre steady while digits change by centring on a fixed-width template
  const wT = c.measureText(`${L.fmt(Math.max(10, years)).replace(/\d/g, '0')} YEARS`).width;
  c.textAlign = 'left';
  c.fillText(big, x - wT / 2, ry + dy);
  c.restore();
  capsLine(c, 'COUNTING FROM AD 325', x, ry + dy + 42, { size: 24, weight: 600, color: SOFT, alpha: k * 0.9, maxW: 460, track: 2.5 });
}

export default {
  beat: 6,
  chapter: { num: '05', title: '128 years', sub: 'counting from AD 325, Council of Nicaea' },
  layer: 2,
  cues(d) {
    return [
      { t: 0.5, name: 'riser', gain: 0.16, pitch: 1.0 },
      { t: 0.6, name: 'count', gain: 0.14, pitch: 1.0 },
      { t: 2.7, name: 'ping', gain: 0.26, pitch: 0.95 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt < S(v, 6) || v.gt > S(v, 8)) return;
    drawCounter(c, v);
  },
  drawOverlay(c, v) {
    const lt = landTime(v, 6) - S(v, 6);
    const k = v.k * L.enter(v.t, lt - 0.15, 0.5);
    bigBlock(c, { y: 1290, parts: [['1 DAY', ACCENT], [' = 128 YEARS', [242, 236, 224]]], small: 'of Julian calendar drift', k, size: 100 });
  },
};
