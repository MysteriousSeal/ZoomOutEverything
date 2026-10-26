// Beat 3 — "Most forecasts say it will become the strongest El Niño ever measured. | Even stronger than the
// 'Godzilla' El Niño of 2015."  (23.42–33.03, d 9.61; phrase 0 at +0.15, phrase 1 at 28.57 = +5.15)
// Shot 'record': the globe drops low (top y ≈ 440, warm tongue y ≈ 1080–1330); this chart card lives in y 352–1004
// over the dark North Pacific.
//
// Builder B. Peak Niño 3.4 (°C above normal), a two-bar chart on a faint +1…+4 °C grid:
//   +0.25  card rises in with its grid
//   +0.3   2015–16 PEAK bar (steel, solid = observed) grows, its value counts up to ≈ 2.75 °C; a dashed RECORD PEAK line runs
//          from its top across the chart (+1.5)
//   +1.9   2026 bar (heat gradient, moving hatch + dashed outline = forecast) grows; it BREAKS the record line
//          (flash + impact at ≈ +2.43, on "strongest"), count-up to ≈ 3.6 °C
//   +3.9   "> 91% OF MODEL RUNS: STRONGEST ON RECORD" + a strip of 100 ticks, 91 lit in sequence
//   +5.35  (phrase 1) the 2026 bar towers: glow pulse, the 2015 bar dims, a drawn up-arrow spans record → peak
//   +6.2   the "GODZILLA" stamp lands on the 2015–16 bar (≈ the word)
// Facts: env FACTS (record1516 2.75, forecast26 3.6, runsPct 91) = script.md FACT-CHECK (Carbon Brief 2026).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, FACTS, INKW, phrase } from '../env.js';

const { ease, clamp, prog } = L;
const CARD = { x: 72, y: 352, w: 936, h: 638 };
const BASE = 812, S = 92;                        // chart baseline (y) and px per °C
const Yv = (c) => BASE - c * S;
const STEEL = [168, 182, 204];
const B15 = { x: 270, w: 210 }, B26 = { x: 600, w: 210 };
const T15 = 0.3, D15 = 0.8, T26 = 1.9, D26 = 1.5;
const T91 = 3.9;
const RED = [235, 60, 50];
// beat-relative time the 2026 bar crosses the old record (outCubic inverse)
const T_CROSS = T26 + D26 * (1 - Math.cbrt(1 - FACTS.record1516 / FACTS.forecast26));

/** frame-quantised beat time (digits never flicker between motion-blur sub-frames) */
const tq = (v) => Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index ?? v.beat].start;

function arrowHead(c, x, y, ang, s) {
  c.beginPath();
  c.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s);
  c.lineTo(x + Math.cos(ang + 2.5) * s, y + Math.sin(ang + 2.5) * s);
  c.lineTo(x + Math.cos(ang - 2.5) * s, y + Math.sin(ang - 2.5) * s);
  c.closePath(); c.fill();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Strongest ever?', sub: 'Peak strength · Carbon Brief model analysis' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: T15, name: 'tick', gain: 0.2, pitch: 0.9 },
      { t: T26, name: 'riser', gain: 0.25, pitch: 1 },
      { t: T_CROSS, name: 'impact', gain: 0.38, pitch: 1 },
      { t: T91, name: 'blip', gain: 0.22, pitch: 1.1 },
      { t: 5.35, name: 'swell', gain: 0.22, pitch: 1 },
      { t: 6.2, name: 'impact', gain: 0.3, pitch: 0.8 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t;
    const ce = ease.outCubic(prog(t, 0.05, 0.35)), ck = v.k * ce;
    if (ck <= 0) return;
    const cardA = (t < 1 ? 1 : v.k) * clamp(ce * 3);   // entry ignores the engine's scene fade so the body is never see-through            // the card body turns solid fast (no see-through ghost of the moving globe)
    const p1 = phrase(v, 1);                     // ≈ 5.15
    const tw = ease.inOutCubic(prog(t, p1 + 0.2, 0.7));   // tower emphasis
    const gk = ease.outBack(prog(t, p1 + 1.05, 0.45), 2.2); // Godzilla stamp
    const lift = (1 - ck) * 26;
    c.save();
    c.translate(0, lift);
    c.globalAlpha = t < 1 ? ce : ck;
    // ---- card
    c.save(); c.globalAlpha = cardA;
    c.fillStyle = 'rgba(5,9,22,0.94)';
    L.roundRect(c, CARD.x, CARD.y, CARD.w, CARD.h, 26); c.fill();
    c.restore();
    c.strokeStyle = L.rgba(INKW, 0.08); c.lineWidth = 1.5;
    L.roundRect(c, CARD.x + 0.5, CARD.y + 0.5, CARD.w - 1, CARD.h - 1, 26); c.stroke();

    // ---- grid (+1 … +4 °C)
    const gr = ease.outCubic(prog(t, 0.05, 0.35));   // the grid arrives with the card
    c.font = L.font(26, 400, L.FONT.din);
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let g = 0; g <= 4; g++) {
      const y = Yv(g), a = clamp(gr * 1.6 - g * 0.15);
      if (a <= 0) continue;
      c.fillStyle = L.rgba(INKW, (g ? 0.1 : 0.35) * a);
      c.fillRect(196, y - (g ? 0.5 : 1), (940 - 196) * a, g ? 1 : 2);
      if (g) { c.fillStyle = L.rgba(INKW, 0.45 * a); c.fillText(`+${g}`, 180, y); }
    }
    c.textAlign = 'left';
    c.fillStyle = L.rgba(INKW, 0.45 * gr);
    c.font = L.font(18, 600, L.FONT.body);
    L.trackedText(c, '°C', 150, Yv(4) - 34, 2);
    c.textBaseline = 'alphabetic';

    // ---- 2015–16 bar (observed: solid steel)
    const tt = tq(v);
    const e15 = ease.outCubic(prog(tt, T15, D15)), e15s = ease.outCubic(prog(t, T15, D15));
    const dim = 1 - 0.3 * tw;
    if (e15s > 0) {
      const h = FACTS.record1516 * S * e15s, top = BASE - h;
      const g = c.createLinearGradient(0, top, 0, BASE);
      g.addColorStop(0, L.rgba(STEEL, 0.95 * dim)); g.addColorStop(1, L.rgba(STEEL, 0.55 * dim));
      c.fillStyle = g;
      L.roundRect(c, B15.x, top, B15.w, h + 6, 6); c.fill();
      // value (counts up, frame-quantised)
      // value: appears as the bar lands (no count-up: in-between numbers would read as data)
      const va = ease.outCubic(prog(tt, T15 + D15 - 0.2, 0.25));
      c.font = L.font(66, 800, L.FONT.display);
      c.fillStyle = L.rgba(L.mix(STEEL, [235, 240, 248], 0.5), (0.75 + 0.25 * dim) * va);
      c.textAlign = 'center';
      if (va > 0) c.fillText(`≈ ${FACTS.record1516.toFixed(2)} °C`, B15.x + B15.w / 2, top - 22 + (1 - va) * 10);
    }
    // ---- dashed record line (behind the 2026 bar's numbers, over its body)
    const rl = ease.inOutCubic(prog(t, T15 + D15 - 0.05, 0.6));
    const ry = Yv(FACTS.record1516);

    // ---- 2026 bar (forecast: heat gradient + moving hatch + dashed outline)
    const e26 = ease.outCubic(prog(tt, T26, D26)), e26s = ease.outCubic(prog(t, T26, D26));
    if (e26s > 0) {
      const h = FACTS.forecast26 * S * e26s, top = BASE - h;
      const glowA = 0.35 + 0.4 * tw * (0.75 + 0.25 * Math.sin((t - p1) * 3.2));
      L.lightBlob(c, B26.x + B26.w / 2, top + 40, 240, ACCENT, glowA * ck * 0.55);
      const g = c.createLinearGradient(0, BASE, 0, BASE - FACTS.forecast26 * S);
      g.addColorStop(0, L.rgba([255, 168, 60], 0.9));
      g.addColorStop(0.55, L.rgba(ACCENT, 0.95));
      g.addColorStop(1, L.rgba(RED, 1));
      c.fillStyle = g;
      L.roundRect(c, B26.x, top, B26.w, h + 6, 6); c.fill();
      // hatch (diagonal, drifting upward) = forecast
      c.save();
      L.roundRect(c, B26.x, top, B26.w, h, 6); c.clip();
      c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 7;
      const off = ((t * 22) % 28 + 28) % 28;
      c.beginPath();
      for (let k = -12; k < 30; k++) {
        const y0 = BASE + 40 - k * 28 - off;
        if (y0 < top - 220) break;
        c.moveTo(B26.x - 10, y0); c.lineTo(B26.x + B26.w + 10, y0 - 220 * 0.45);
      }
      c.stroke();
      c.restore();
      c.setLineDash([10, 8]); c.lineDashOffset = -t * 18;
      c.strokeStyle = 'rgba(255,230,210,0.85)'; c.lineWidth = 2.5;
      L.roundRect(c, B26.x - 5, top - 5, B26.w + 10, h + 5, 9); c.stroke();
      c.setLineDash([]);
      // value
      const va = ease.outCubic(prog(tt, T26 + D26 - 0.25, 0.3));   // appears as the bar lands (no count-up)
      c.font = L.font(78, 800, L.FONT.display);
      c.textAlign = 'center';
      c.fillStyle = L.rgba(ACCENT, va);
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 14;
      if (va > 0) c.fillText(`≈ ${FACTS.forecast26.toFixed(1)} °C`, B26.x + B26.w / 2, top - 24 + (1 - va) * 10);
      c.shadowBlur = 0;
    }
    // record line drawn over both bars (subtle where it crosses the forecast bar)
    if (rl > 0) {
      const x0 = B15.x, x1 = L.lerp(x0, 930, rl);
      c.setLineDash([12, 9]);
      c.strokeStyle = L.rgba(INKW, 0.75); c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x0, ry); c.lineTo(x1, ry); c.stroke();
      c.setLineDash([]);
      // label right of the 2026 bar's column (x ≥ 830), so the counting value and the flash never cross it
      c.font = L.font(20, 700, L.FONT.body);
      c.fillStyle = L.rgba(INKW, 0.7 * clamp(rl * 2 - 1));
      L.trackedText(c, 'RECORD PEAK', 992, ry + 30, 2, 'right');
    }
    // the break-through flash
    const fl = prog(t, T_CROSS - 0.02, 0.7);
    if (fl > 0 && fl < 1) {
      const cx = B26.x + B26.w / 2;
      // kept within the bar's column (≈ ±115 px) so it never reaches the RECORD PEAK label
      L.lightBlob(c, cx, ry, 50 + 70 * ease.outCubic(fl), [255, 210, 150], 0.9 * (1 - fl));
      c.strokeStyle = L.rgba([255, 220, 180], 0.8 * (1 - fl)); c.lineWidth = 3;
      c.beginPath(); c.ellipse(cx, ry, Math.max(0, 30 + 80 * ease.outCubic(fl)), Math.max(0, 8 + 22 * ease.outCubic(fl)), 0, 0, Math.PI * 2); c.stroke();
    }
    // tower arrow: record → peak, right of the 2026 bar (phrase 1)
    if (tw > 0) {
      const ax = B26.x + B26.w + 34, y0 = ry, y1 = Yv(FACTS.forecast26) + 4;
      const ye = L.lerp(y0, y1, tw);
      c.strokeStyle = L.rgba(ACCENT, 0.95); c.fillStyle = L.rgba(ACCENT, 0.95); c.lineWidth = 4;
      c.beginPath(); c.moveTo(ax - 12, y0); c.lineTo(ax + 12, y0); c.stroke();
      c.beginPath(); c.moveTo(ax, y0); c.lineTo(ax, ye + 10); c.stroke();
      arrowHead(c, ax, ye, -Math.PI / 2, 15);
    }

    // ---- category labels
    const lab = (txt, sub, x, w, at, col) => {
      const a = ease.outCubic(prog(t, at, 0.5));
      if (a <= 0) return;
      c.save();
      c.globalAlpha *= a;
      c.textAlign = 'center';
      c.font = L.font(L.fitSize(c, txt, w + 60, 30, 800, L.FONT.display, 20), 800, L.FONT.display);
      c.fillStyle = L.rgba(col);
      L.trackedText(c, txt, x + w / 2, BASE + 42 + (1 - a) * 8, 1.5, 'center');
      c.font = L.font(18, 600, L.FONT.body);
      c.fillStyle = L.rgba(INKW, 0.55);
      L.trackedText(c, sub, x + w / 2, BASE + 68 + (1 - a) * 8, 2.5, 'center');
      c.restore();
    };
    lab('2015–16 PEAK', 'OBSERVED', B15.x, B15.w, T15 + 0.2, INKW);
    lab('2026 FORECAST PEAK', 'MEDIAN OF MODEL RUNS', B26.x, B26.w, T26 + 0.2, [255, 196, 150]);

    // ---- 91% of model runs
    const rk = ease.outCubic(prog(t, T91, 0.5));
    if (rk > 0) {
      c.save();
      c.globalAlpha *= rk;
      const y = 958 + (1 - rk) * 10;
      const a = `> ${FACTS.runsPct}%`, b = ' OF MODEL RUNS: STRONGEST ON RECORD';
      const size = L.fitSize(c, a + b, 840, 42, 800, L.FONT.display, 24);
      c.font = L.font(size, 800, L.FONT.display);
      const wa = c.measureText(a).width, wb = c.measureText(b).width, x0 = 540 - (wa + wb) / 2;
      c.textAlign = 'left';
      c.fillStyle = L.rgba(ACCENT); c.fillText(a, x0, y - 22);
      c.fillStyle = L.rgba(INKW); c.fillText(b, x0 + wa, y - 22);
      // 100 ticks, 91 lit in sequence
      const sx = 540 - 380, pitch = 760 / 100;
      for (let i = 0; i < 100; i++) {
        const lit = i < FACTS.runsPct && prog(t, T91 + 0.15 + i * 0.008, 0.12) > 0;
        const li = i < FACTS.runsPct ? ease.outCubic(prog(t, T91 + 0.15 + i * 0.008, 0.15)) : 0;
        c.fillStyle = lit ? L.rgba(L.mix([120, 130, 150], ACCENT, li), 0.95) : L.rgba(INKW, 0.18);
        c.fillRect(sx + i * pitch, y - 4, pitch - 3, 14);
      }
      c.restore();
    }

    // ---- "GODZILLA" stamp on the 2015–16 bar
    if (gk > 0) {
      const cx = B15.x + B15.w / 2, cy = ry + 78;
      const txt = '“GODZILLA”';
      c.save();
      c.translate(cx, cy);
      c.rotate(-0.06);
      c.scale(0.6 + 0.4 * gk, 0.6 + 0.4 * gk);
      c.globalAlpha *= clamp(gk * 1.5);
      const size = L.fitSize(c, txt, B15.w - 34, 40, 800, L.FONT.display, 22);
      c.font = L.font(size, 800, L.FONT.display);
      const w = c.measureText(txt).width + 30;
      c.fillStyle = 'rgba(8,12,26,0.92)';
      L.roundRect(c, -w / 2, -30, w, 56, 10); c.fill();
      c.strokeStyle = L.rgba(INKW, 0.9); c.lineWidth = 2;
      L.roundRect(c, -w / 2 + 4, -26, w - 8, 48, 7); c.stroke();
      c.fillStyle = L.rgba(INKW);
      c.textAlign = 'center';
      c.fillText(txt, 0, 12);
      c.restore();
    }
    c.restore();
  },
};

