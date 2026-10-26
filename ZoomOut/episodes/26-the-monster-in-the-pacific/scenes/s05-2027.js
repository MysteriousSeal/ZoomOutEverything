// Beat 5 — "And on top of global warming, | it could make 2027 the hottest year ever recorded. | One leading
// climate scientist puts the odds at 95%."  (45.74–57.16, d 11.41; phrases at +0.15 / +2.43 / +7.04)
// Shot 'y2027': the globe small and low (y ≈ 880–1470); this chart card lives in y 330–850.
//
// Builder B. Yearly global temperature, °C above pre-industrial (env GLOBAL_T, 1980–2025, SHAPE only: no year but 2024
// is labelled with a value), on a faint 0.5 / 1.0 / 1.5 grid:
//   +0.25        card rises in WITH its grid + axis caption "°C ABOVE PRE-INDUSTRIAL" (phone-size type >= 24 px)
//   +0.45 → 2.35 the line draws left → right, cool steel → hot amber (global warming), soft area under it
//   +2.2         the 2024 point + a dashed RECORD line; right column "2024 RECORD / ≈ 1.55 °C"
//   +2.95        (phrase 1, "2027") a dashed forecast segment 2025 → 2027 draws; the 2027 point lands glowing with its
//                1.67–1.85 whisker; right column "2027 FORECAST / ≈ 1.76 °C" (accent) above the record line
//   +7.3         (phrase 2) stat block upper-left: the ring sweeps and the number lands on "ninety-five" (≈ 55.7 s),
//                (ring first; the whole text fades in on "ninety-five") "≈ 95% CHANCE / OF A RECORD" + "ZEKE HAUSFATHER, AUG 2026" (one scientist's estimate; never "will")
// Facts: env FACTS (rec2024 1.55, f2027 1.76, f2027lo/hi 1.67/1.85, chance2027 95) = script.md FACT-CHECK.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, FACTS, GLOBAL_T, INKW, phrase } from '../env.js';

const { ease, clamp, prog } = L;
const CARD = { x: 64, y: 330, w: 952, h: 520 };
const PX0 = 140, PX1 = 750, PY0 = 784, PY1 = 432;     // plot box: x for 1980 → 2027, y for YMIN → YMAX
const Y0 = 1980, Y1 = 2027;
const X = (yr) => PX0 + (yr - Y0) / (Y1 - Y0) * (PX1 - PX0);
const YMIN = 0.2, YMAX = 2.0;                          // anomaly charts needn't start at 0: more room for the climb
const Y = (c) => PY0 - (c - YMIN) / (YMAX - YMIN) * (PY0 - PY1);
const SERIES = GLOBAL_T.filter(([yr]) => yr >= Y0);
const COOLC = [120, 160, 210], HOT = [255, 170, 80];
const COL = 778;                                       // right label column x

export default {
  beat: 5,
  chapter: { num: '05', title: 'Hottest year?', sub: 'Global temperature above pre-industrial' },
  captions: true,
  layer: 5,
  cues(d) {
    return [
      // times for the 62.49 s timeline (beat 45.26; "2027" 48.22–49.18, "ninety-five" from ≈ 54.36)
      { t: 0.45, name: 'swish', gain: 0.13, pitch: 1 },
      { t: 2.2, name: 'tick', gain: 0.22, pitch: 1 },      // in the 47.33 → 47.68 s gap
      { t: 3.35, name: 'bloom', gain: 0.08, pitch: 1.1 },  // the 2027 point (under "twenty twenty-seven": kept low)
      { t: 7.3, name: 'riser', gain: 0.13, pitch: 1.1 },
      { t: 9.08, name: 'tick', gain: 0.2, pitch: 1.1 },   // the 95 % lands (TN): a dry click (no ringing tail) in the dip just before "ninety-five"
    ];
  },
  drawOverlay(c, v) {
    const t = v.t;
    const ce = ease.outCubic(prog(t, 0.25, 0.5)), ck = v.k * ce;
    if (ck <= 0) return;
    const cardA = v.k * clamp(ce * 3);            // the card body turns solid fast (no see-through ghost of the moving globe)
    const p1 = phrase(v, 1), p2 = phrase(v, 2);
    const TF = p1 + 0.52;            // forecast segment starts (≈ "2027")
    const TP = TF + 0.4;             // 2027 point lands
    const TS = phrase(v, 2, 'end') - 1.65 - 0.7;   // stat block appears 0.7 s before its text (no long-empty badge); ring sweeps from here
    const TN = phrase(v, 2, 'end') - 1.65;  // the 95 % text lands on "ninety-five" (≈ 54.36 s)
    c.save();
    c.translate(0, (1 - ck) * 24);
    c.globalAlpha = ck;
    // ---- card
    c.save(); c.globalAlpha = cardA;
    c.fillStyle = 'rgba(5,9,22,0.94)';
    L.roundRect(c, CARD.x, CARD.y, CARD.w, CARD.h, 26); c.fill();
    c.restore();
    c.strokeStyle = L.rgba(INKW, 0.08); c.lineWidth = 1.5;
    L.roundRect(c, CARD.x + 0.5, CARD.y + 0.5, CARD.w - 1, CARD.h - 1, 26); c.stroke();

    // ---- axis title + grid
    const gk = 1;   // axes + grid fade with the card itself (ck): never an empty opaque card
    c.font = L.font(24, 700, L.FONT.body);
    c.fillStyle = L.rgba(INKW, 0.6 * gk);
    L.trackedText(c, '°C ABOVE PRE-INDUSTRIAL', CARD.x + 40, CARD.y + 54, 2);
    c.font = L.font(28, 400, L.FONT.din);
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (const g of [0.5, 1.0, 1.5]) {
      c.fillStyle = L.rgba(INKW, 0.1 * gk);
      c.fillRect(PX0, Y(g) - 0.5, (PX1 - PX0) * gk, 1);
      c.fillStyle = L.rgba(INKW, 0.55 * gk);
      c.fillText(g.toFixed(1), PX0 - 14, Y(g) + 1);
    }
    c.fillStyle = L.rgba(INKW, 0.3 * gk);
    c.fillRect(PX0, PY0, (PX1 - PX0) * gk, 1.5);
    c.textBaseline = 'alphabetic'; c.textAlign = 'center';
    c.font = L.font(28, 400, L.FONT.din);
    for (const yr of [1980, 2000, 2020]) { c.fillStyle = L.rgba(INKW, 0.55 * gk); c.fillText(String(yr), X(yr), PY0 + 40); }
    const yk = ease.outCubic(prog(t, phrase(v, 1) + 0.9, 0.4));
    if (yk > 0) { c.fillStyle = L.rgba(ACCENT, yk); c.fillText('2027', X(2027), PY0 + 40); c.fillRect(X(2027) - 1, PY0 - 6 * yk, 2, 6 * yk); }

    // ---- the observed line
    const lk = ease.inOutCubic(prog(t, 0.45, 1.9));
    const n = SERIES.length - 1, upto = lk * n;
    const pts = [];
    for (let i = 0; i <= Math.min(n, Math.floor(upto)); i++) pts.push([X(SERIES[i][0]), Y(SERIES[i][1])]);
    if (upto < n) {
      const i = Math.floor(upto), f = upto - i;
      pts.push([L.lerp(X(SERIES[i][0]), X(SERIES[i + 1][0]), f), L.lerp(Y(SERIES[i][1]), Y(SERIES[i + 1][1]), f)]);
    }
    if (pts.length >= 2) {
      const ag = c.createLinearGradient(0, Y(1.6), 0, PY0);
      ag.addColorStop(0, L.rgba(HOT, 0.22)); ag.addColorStop(1, L.rgba(COOLC, 0));
      c.fillStyle = ag;
      c.beginPath(); c.moveTo(pts[0][0], PY0); pts.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(pts[pts.length - 1][0], PY0); c.closePath(); c.fill();
      const lg = c.createLinearGradient(PX0, 0, X(2025), 0);
      lg.addColorStop(0, L.rgba(COOLC)); lg.addColorStop(0.6, L.rgba([230, 220, 210])); lg.addColorStop(1, L.rgba(HOT));
      c.strokeStyle = lg; c.lineWidth = 3.5; c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
      if (lk < 1) { const e = pts[pts.length - 1]; L.lightBlob(c, e[0], e[1], 30, HOT, 0.6); }
    }

    // ---- 2024 record: point, dashed line, label
    const rk = ease.outCubic(prog(t, 2.2, 0.5));
    const ry = Y(FACTS.rec2024), rx = X(2024);
    if (rk > 0) {
      c.save();
      c.globalAlpha *= rk;
      c.setLineDash([8, 7]);
      c.strokeStyle = L.rgba(INKW, 0.6); c.lineWidth = 2;
      c.beginPath(); c.moveTo(rx, ry); c.lineTo(L.lerp(rx, CARD.x + CARD.w - 36, rk), ry); c.stroke();
      c.setLineDash([]);
      c.fillStyle = L.rgba(INKW);
      c.beginPath(); c.arc(rx, ry, Math.max(0, 6.5 * rk), 0, Math.PI * 2); c.fill();
      c.textAlign = 'left';
      c.font = L.font(24, 700, L.FONT.body);
      c.fillStyle = L.rgba(INKW, 0.7);
      L.trackedText(c, '2024 RECORD', COL, ry + 36, 1.5);
      c.font = L.font(40, 800, L.FONT.display);
      c.fillStyle = L.rgba(INKW, 0.92);
      c.fillText(`≈ ${FACTS.rec2024.toFixed(2)} °C`, COL, ry + 76);
      c.restore();
    }

    // ---- 2027 forecast: dashed segment, glowing point, whisker, label
    const fk = ease.inOutCubic(prog(t, TF, 0.45));
    if (fk > 0) {
      const last = SERIES[SERIES.length - 1];
      const ax = X(last[0]), ay = Y(last[1]), bx = X(2027), by = Y(FACTS.f2027);
      c.save();
      c.setLineDash([6, 6]);
      c.strokeStyle = L.rgba(ACCENT, 0.9); c.lineWidth = 3;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(L.lerp(ax, bx, fk), L.lerp(ay, by, fk)); c.stroke();
      c.setLineDash([]);
      c.restore();
    }
    const pk = ease.outBack(prog(t, TP, 0.5), 2.4);
    if (pk > 0) {
      const bx = X(2027), by = Y(FACTS.f2027);
      const breathe = 0.8 + 0.2 * Math.sin((t - TP) * 3.4);
      L.lightBlob(c, bx, by, Math.max(0, 90 * clamp(pk) * breathe), ACCENT, 0.75);
      L.lightBlob(c, bx, by, Math.max(0, 34 * clamp(pk)), [255, 220, 170], 0.9);
      // whisker 1.67–1.85
      const wk = ease.outCubic(prog(t, TP + 0.25, 0.4));
      if (wk > 0) {
        const ylo = L.lerp(by, Y(FACTS.f2027lo), wk), yhi = L.lerp(by, Y(FACTS.f2027hi), wk);
        c.strokeStyle = L.rgba([255, 236, 220], 0.95); c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(bx, ylo); c.lineTo(bx, yhi);
        c.moveTo(bx - 11, ylo); c.lineTo(bx + 11, ylo); c.moveTo(bx - 11, yhi); c.lineTo(bx + 11, yhi); c.stroke();
        c.lineCap = 'butt';
      }
      c.fillStyle = L.rgba(ACCENT);
      c.beginPath(); c.arc(bx, by, Math.max(0, 8.5 * pk), 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 2;
      c.beginPath(); c.arc(bx, by, Math.max(0, 8.5 * pk), 0, Math.PI * 2); c.stroke();
      // label (right column, above the record line)
      const lk2 = ease.outCubic(prog(t, TP + 0.1, 0.45));
      c.save();
      c.globalAlpha *= lk2;
      c.textAlign = 'left';
      const dy = (1 - lk2) * 10;
      c.font = L.font(21, 800, L.FONT.body);   // −12 %: ends ≈ 975, clear of the card edge (1016)
      c.fillStyle = L.rgba(ACCENT);
      L.trackedText(c, '2027 FORECAST', COL, by - 34 + dy, 1.5);
      c.font = L.font(46, 800, L.FONT.display);
      c.fillStyle = L.rgba(ACCENT);
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 10;
      c.fillText(`≈ ${FACTS.f2027.toFixed(2)} °C`, COL, by + 16 + dy);
      c.restore();
    }

    // ---- 95 % stat block (upper-left of the plot, empty sky above the early years): the ring sweeps from TS and
    //      lands with the number on "ninety-five" (TN)
    const sk = ease.outCubic(prog(t, TS, 0.5));
    if (sk > 0) {
      c.save();
      c.globalAlpha *= sk;
      const bx = PX0 + 4, by = PY1 + 2 + (1 - sk) * 10, bw = 520, bh = 132;
      c.fillStyle = 'rgba(10,16,34,0.96)';
      L.roundRect(c, bx, by, bw, bh, 16); c.fill();
      c.strokeStyle = L.rgba(ACCENT, 0.45); c.lineWidth = 1.5;
      L.roundRect(c, bx + 0.75, by + 0.75, bw - 1.5, bh - 1.5, 16); c.stroke();
      // ring gauge
      const gx = bx + 60, gy = by + bh / 2, gr = 38;
      const sweep = ease.inOutCubic(prog(t, TS + 0.15, Math.max(0.5, TN - TS - 0.15))) * FACTS.chance2027 / 100;
      c.lineWidth = 9; c.lineCap = 'round';
      c.strokeStyle = L.rgba(INKW, 0.14);
      c.beginPath(); c.arc(gx, gy, gr, 0, Math.PI * 2); c.stroke();
      if (sweep > 0.002) {
        c.strokeStyle = L.rgba(ACCENT);
        c.beginPath(); c.arc(gx, gy, gr, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI * 2); c.stroke();
      }
      c.lineCap = 'butt';
      // text: "≈ 95% CHANCE" / "OF A RECORD" / source
      const tx = gx + gr + 24, tw = bx + bw - 20 - tx;
      const a = `≈ ${FACTS.chance2027}%`, b = ' CHANCE';
      const s1 = L.fitSize(c, a + b, tw, 50, 800, L.FONT.display, 30);
      c.font = L.font(s1, 800, L.FONT.display);
      c.textAlign = 'left';
      const wa = c.measureText(a).width;
      // the whole text block fades in together on "ninety-five" (the ring sweeps first): "CHANCE" always sits right
      // after the number, and no placeholder value is ever shown
      const nk = ease.outCubic(prog(t, TN, 0.3));
      if (nk > 0) {
        c.globalAlpha *= nk;
        const dyn = (1 - nk) * 8;
        c.fillStyle = L.rgba(ACCENT); c.fillText(a, tx, by + 52 + dyn);
        c.fillStyle = L.rgba(INKW); c.fillText(b, tx + wa, by + 52 + dyn);
        c.font = L.font(Math.round(s1 * 0.62), 800, L.FONT.display);
        c.fillText('OF A RECORD', tx, by + 88 + dyn);
        const src = 'ZEKE HAUSFATHER, AUG 2026';
        let fs = 22;
        for (; fs > 20; fs--) { c.font = L.font(fs, 600, L.FONT.body); c.letterSpacing = '1.5px'; const w = c.measureText(src).width; c.letterSpacing = '0px'; if (w <= tw) break; }
        c.font = L.font(fs, 600, L.FONT.body);
        c.fillStyle = L.rgba(INKW, 0.66);
        L.trackedText(c, src, tx, by + 118 + dyn, 1.5);
      }
      c.restore();
    }
    c.restore();
  },
};
