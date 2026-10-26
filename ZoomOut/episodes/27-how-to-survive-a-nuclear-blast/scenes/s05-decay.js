// Beat 5 — "After seven hours, it's ten times weaker. | After two days, a hundred times."
// Camera 'decay' tilts up into the night sky (sky y 380–1300). THE 7-10 RULE as an opaque glass panel over the cloud:
//   three bars on a LINEAR dose-rate axis at 1 H / 7 H / 2 DAYS (log-spaced time, so they sit evenly), heights from
//   env doseRate(h) = h^−1.2 (honest: 7 h ≈ 10 %, 49 h ≈ 1 %); a decay curve draws itself through the bar tops with a
//   glowing dot riding it (own hours clock, landing on the words; env chartHours drives the dust density only).
//   phrase 0  the dot slides 1 H → 7 H, bar 2 rises, label 10× WEAKER (≈ "ten times weaker")
//   phrase 1  the dot slides 7 H → 2 DAYS, bar 3 (a 1 % sliver) rises, label 100× WEAKER (≈ "after two days")
// Tick labels read with the bar labels: "7 H · 10× WEAKER", "2 DAYS · 100× WEAKER".
import * as L from '../../../../engine/runtime/lib.js';
import { doseRate, TEXT, DANGER, AMBER, CD } from '../env.js';

const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const TAU = Math.PI * 2;

const PANEL = { x: 70, y: 400, w: 940, h: 860 };
const YB = 1128, HT = 540;                         // baseline, full-height (1 h = 100 %)
const BARS = [
  { h: 1, cx: 250, tick: '1 H AFTER', col: DANGER, pct: '100 %' },
  { h: 7, cx: 530, tick: '7 H', col: AMBER, big: '10×', pct: '10 %' },
  { h: 49, cx: 810, tick: '2 DAYS', col: [214, 222, 96], big: '100×', pct: '1 %' },
];
const BW = 150;
const LOG7 = Math.log(7);
const hx = (h) => 250 + (Math.log(h) / LOG7) * 280;
const hy = (h) => YB - HT * doseRate(h) / doseRate(1);
const LABEL_Y = 760;                               // label row (big number baseline)
const MIN_BAR = 16;                                // the 1 % bar stays visible
const FIRST_FULL = 0.85;                           // bar 1 is full (beat-local s): the curve + its dot start here

/** hours shown (beat-local t): 1 → 7 h on phrase 0, 7 → 49 h on phrase 1 */
function hoursAt(v) {
  const p0 = ph(v, 0), p1 = ph(v, 1);
  const e1 = L.ease.inOutCubic(L.prog(v.t, p0 + 0.2, 1.55));
  const e2 = L.ease.inOutCubic(L.prog(v.t, p1 - 0.05, 0.8));
  return Math.exp(LOG7 * (e1 + e2));
}

export default {
  beat: 5,
  chapter: null,
  captions: true,
  overlayIn: false,   // the panel has its own entrance (opaque early): no cross-fade ghosting of beat 4's world
  layer: 5,
  cues() { return []; },
  drawOverlay(c, v) {
    const p0 = ph(v, 0), p1 = ph(v, 1);
    const hNow = hoursAt(v);
    const pk = L.enter(v.t, 0.0, 0.6);
    // exit overlaps the STEP 4 badge coming in (no dead stretch at the cut)
    const ex = L.smoothstep(L.prog(v.t, v.d - 0.28, 0.28));
    c.save();
    c.globalAlpha = v.k * (1 - ex);
    c.translate(0, (1 - pk) * 30);
    // ---- panel
    c.save();
    c.globalAlpha *= L.clamp(pk * 1.7);   // the panel goes opaque early; its content follows (no world ghosting through)
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 10;
    c.fillStyle = 'rgb(9,11,24)';
    L.roundRect(c, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 22); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1.5;
    L.roundRect(c, PANEL.x + 0.75, PANEL.y + 0.75, PANEL.w - 1.5, PANEL.h - 1.5, 22); c.stroke();
    // header: THE 7-10 RULE chip + what is plotted
    c.textBaseline = 'middle';
    c.font = L.font(30, 800, L.FONT.display);
    c.letterSpacing = '2px';
    const chip = 'THE 7-10 RULE', cw = c.measureText(chip).width + 32;
    c.fillStyle = L.rgba(CD.yellow);
    L.roundRect(c, PANEL.x + 40, PANEL.y + 34, cw, 48, 8); c.fill();
    c.fillStyle = L.rgba(CD.ink);
    c.fillText(chip, PANEL.x + 56, PANEL.y + 60);
    c.font = L.font(24, 600, L.FONT.body);
    c.letterSpacing = '3px';
    c.fillStyle = 'rgba(205,212,228,0.85)';
    c.fillText('RADIATION FROM FALLOUT', PANEL.x + 40 + cw + 22, PANEL.y + 59);
    c.letterSpacing = '0px';
    // 100 % / 10 % guides
    c.setLineDash([6, 10]);
    c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1.5;
    for (const h of [1, 7]) { c.beginPath(); c.moveTo(160, hy(h)); c.lineTo(900, hy(h)); c.stroke(); }
    c.setLineDash([]);
    // baseline
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(150, YB, 760, 2);
    c.restore();

    // ---- bars (rise when the dot reaches them)
    for (let i = 0; i < BARS.length; i++) {
      const b = BARS[i];
      const reach = i === 0 ? L.prog(v.t, 0.25, 0.6) : L.prog(Math.log(hNow) / LOG7, i - 0.25, 0.25);
      const bk = L.ease.outCubic(reach) * pk;
      const full = Math.max(MIN_BAR, YB - hy(b.h));
      // tick labels: dim until reached
      c.save();
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.font = L.font(42, 800, L.FONT.display);
      c.letterSpacing = '1px';
      const lit = i === 0 ? pk : L.clamp(reach * 1.5);
      c.fillStyle = L.rgba(L.mix([120, 128, 150], TEXT, lit), pk * pk);
      c.fillText(b.tick, b.cx, YB + 66);
      c.letterSpacing = '0px';
      c.restore();
      if (bk <= 0) continue;
      const h = full * bk;
      c.save();
      c.shadowColor = L.rgba(b.col, 0.7); c.shadowBlur = 18;
      const g = c.createLinearGradient(0, YB - full, 0, YB);
      g.addColorStop(0, L.rgba(b.col, 0.95)); g.addColorStop(1, L.rgba(L.mix(b.col, [20, 10, 20], 0.35), 0.95));
      c.fillStyle = g;
      L.roundRect(c, b.cx - BW / 2, YB - h, BW, h, Math.min(8, h / 2)); c.fill();
      c.restore();
      // the share of the first hour's radiation at the bar top (100 % / 10 % / 1 %)
      const qk = L.clamp((bk - 0.6) / 0.4);
      if (qk > 0) {
        c.save();
        c.globalAlpha *= qk;
        c.textAlign = i === 0 ? 'center' : 'left'; c.textBaseline = 'alphabetic';
        c.font = L.font(30, 800, L.FONT.display);
        c.fillStyle = L.rgba(L.mix(b.col, [255, 255, 255], 0.35));
        c.shadowColor = 'rgba(9,11,24,0.9)'; c.shadowBlur = 8;
        // above the bar top; right of the curve's pass-through for bars 2 + 3 (the curve falls to the right)
        c.fillText(b.pct, i === 0 ? b.cx : b.cx + 12, YB - h - (i === 0 ? 16 : 12));
        c.restore();
      }
    }
    // axis note: what the ticks measure
    c.save();
    c.globalAlpha *= pk;
    c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    c.font = L.font(20, 700, L.FONT.body);
    c.fillStyle = 'rgba(170,178,198,0.85)';
    L.trackedText(c, 'TIME AFTER THE BLAST', 860, YB + 112, 3, 'right');
    c.strokeStyle = 'rgba(170,178,198,0.85)'; c.fillStyle = 'rgba(170,178,198,0.85)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(868, YB + 105); c.lineTo(896, YB + 105); c.stroke();
    c.beginPath(); c.moveTo(906, YB + 105); c.lineTo(895, YB + 99); c.lineTo(895, YB + 111); c.closePath(); c.fill();
    c.restore();

    // ---- the decay curve through the bar tops + the dot riding it
    const curveK = L.smoothstep(L.prog(v.t, FIRST_FULL, 0.2)) * pk;
    if (curveK > 0) {
      const h1 = Math.max(1, hNow);
      c.save();
      c.globalAlpha *= curveK;
      c.strokeStyle = 'rgba(255,246,226,0.92)'; c.lineWidth = 4; c.lineJoin = 'round'; c.lineCap = 'round';
      c.shadowColor = 'rgba(255,220,160,0.6)'; c.shadowBlur = 10;
      c.beginPath();
      const n = 90;
      for (let i = 0; i <= n; i++) {
        const h = Math.exp((Math.log(h1) * i) / n);
        const x = hx(h), y = hy(h);
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
      c.shadowColor = 'transparent';
      const dx = hx(h1), dy = hy(h1);
      L.lightBlob(c, dx, dy, 34, [255, 236, 190], 0.6 * pk);
      c.fillStyle = 'rgb(255,250,240)';
      c.beginPath(); c.arc(dx, dy, 9, 0, TAU); c.fill();
      c.restore();
    }

    // ---- labels: 10× WEAKER (phrase 0), 100× WEAKER (phrase 1), with a dashed drop to the bar
    const label = (b, at) => {
      const k = L.prog(v.t, at, 0.55);
      if (k <= 0) return;
      const e = L.ease.outBack(L.clamp(k), 1.5);
      c.save();
      c.globalAlpha *= L.clamp(k * 2);
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const y = LABEL_Y + (1 - e) * 22;
      c.font = L.font(100, 800, L.FONT.display);
      c.fillStyle = L.rgba(b.col);
      c.shadowColor = L.rgba(b.col, 0.45); c.shadowBlur = 24;
      c.fillText(b.big, b.cx, y);
      c.shadowColor = 'transparent';
      c.font = L.font(30, 700, L.FONT.body);
      c.fillStyle = L.rgba(TEXT, 0.95);
      L.trackedText(c, 'WEAKER', b.cx, y + 48, 4, 'center');
      // dashed drop line to the bar top
      const top = YB - Math.max(MIN_BAR, YB - hy(b.h)) - 48, y0 = y + 72;
      const dk = L.ease.outCubic(L.clamp((k - 0.3) / 0.7));
      if (dk > 0 && top > y0) {
        c.setLineDash([4, 8]);
        c.strokeStyle = L.rgba(b.col, 0.7); c.lineWidth = 2;
        c.beginPath(); c.moveTo(b.cx, y0); c.lineTo(b.cx, L.lerp(y0, top, dk)); c.stroke();
        c.setLineDash([]);
      }
      c.restore();
    };
    label(BARS[1], p0 + 1.55);
    label(BARS[2], p1 + 0.55);
    c.restore();
  },
};
