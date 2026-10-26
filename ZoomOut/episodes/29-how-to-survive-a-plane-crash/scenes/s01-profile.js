// Beat 1 — "Seventy percent of fatal crashes happen during takeoff, climb-out, approach and landing: | barely six
// percent of the flight."   (Boeing Statistical Summary, fatal accidents 2016–2025, worldwide commercial jets)
// Camera 'chart': pulls out ×97 from the aircraft on the runway to the whole flight profile (x 0…D → screen x 90…930,
// ground y 990). The profile is drawn in WORLD space (it starts under the aircraft's wheels), x = flight TIME, honestly
// proportioned (takeoff 1 %, initial climb 1 %, … final approach 3 %, landing 1 %). The aircraft flies it at a constant
// time rate (env/camera planeAt): it spends almost the whole flight over the dim middle.
//   "Seventy" (+0.05)  top-left stat ≈ 70% / OF FATAL ACCIDENTS (RISK red) lands with the word.
//   chart in            the curve draws itself left→right while the camera pulls out; two bars under it, aligned to its
//                       time axis: FLIGHT TIME (0–100 % of the flight) and FATAL ACCIDENTS (same phase order).
//   "takeoff, climb-out" the takeoff + initial-climb slice lights (labelled TAKEOFF + INITIAL CLIMB: Boeing's 6 % is initial climb only): column on the curve, its 2 % sliver on the time bar,
//                       a wedge down to 22 % of the accident bar.  "approach and landing": the same on the right (4 % → 48 %).
//   "six"               top-right stat ≈ 6% / OF FLIGHT TIME lands; the two slivers pulse.
//   source line         BOEING, 2016–2025 · FATAL ACCIDENTS, WORLDWIDE COMMERCIAL JETS under the bars.
import * as L from '../../../../engine/runtime/lib.js';
import { TEXT, RISK, D, A, CHART, MC, altAt, profilePt, wordTime, PHASES } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;
const BAR = { t: 1062, th: 44, a: 1156, ah: 52 };   // time bar top + height, accident bar top + height (screen y)
const LEFT = [0, 0.02], RIGHT = [0.96, 1];          // flight-time slices (lit)
const ACC = [0.22, 0.52];                            // accident bar: 0–22 % takeoff + initial climb, 52–100 % final approach + landing
const COOL = [200, 214, 236];
const LBL = 'rgba(222,228,240,0.95)';

function times(v) {
  const b = v.tl.scenes[v.index].start, w = (pj, wi) => wordTime(v.tl, 1, pj, wi) - b;
  return { s70: -0.05, litL: w(0, 7) - 0.05, litR: w(0, 9) - 0.05, s6: w(1, 1) - 0.05 };
}
// the curve draws from t 0.5 (screen space), while the camera finishes its pull-out (travel 1.3 s)
const DRAW0 = 0.5, DRAW_T = 1.8;
const chartIn = (v) => L.smoothstep(L.prog(v.t, 0.4, 0.3));
const chartOut = (v) => 1 - L.smoothstep(L.prog(v.t, v.d - 0.2, 0.36));   // screen-space: hands over to the STEP 1 badge + cabin zoom (gone by +0.16 s)
/** a size ≤ max at which text (tracked) fits w */
function fitTracked(c, text, w, max, min, track, weight = 700, fam = L.FONT.body) {
  let fs = max;
  for (; fs > min; fs--) { c.font = L.font(fs, weight, fam); c.letterSpacing = `${track}px`; const tw = c.measureText(text).width; c.letterSpacing = '0px'; if (tw <= w) break; }
  return fs;
}

export default {
  beat: 1,
  chapter: null,
  captions: true,
  overlayIn: false,   // the ≈ 70% cross-fades with the hook headline (no text-free frames)
  layer: 2,
  cues(d) {
    return [
      { t: 1.62, name: 'riser', gain: 0.12, pitch: 0.8 },
      { t: 2.95, name: 'tick', gain: 0.16, pitch: 1.1 },
      { t: 4.45, name: 'tick', gain: 0.16, pitch: 0.95 },
      { t: 6.5, name: 'blip', gain: 0.14, pitch: 1.0 },
    ];
  },
  // the profile curve + the lit columns (world space: they ride the camera)
  drawWorld(c, v) {
    if (v.t < 0 || v.t > v.d + 1) return;
    const k = chartIn(v) * chartOut(v);
    if (k <= 0) return;
    const T = times(v);
    // drawn in SCREEN space at the chart's final mapping (= the settled camera, which has no drift here): the curve can
    // start drawing while the camera is still pulling out, without smearing
    const SX = (x) => CHART.x0 + x / MC, SY = (y) => CHART.ground + y / MC;
    const draw = L.ease.outCubic(L.prog(v.t, DRAW0, DRAW_T));   // the curve draws itself (gets going at once: no empty frames)
    const N = 400, pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N; const p = profilePt(u); pts.push([SX(p.x), SY(p.y), u]); }
    const gy = SY(0), top = SY(-A * 1.12);
    c.save();
    c.globalAlpha = k;
    // faint altitude guides
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75, 1]) { const y = SY(-A * f); c.beginPath(); c.moveTo(SX(0), y); c.lineTo(SX(D), y); c.stroke(); }
    // lit columns (full chart height), behind the curve
    for (const [r, t0] of [[LEFT, T.litL], [RIGHT, T.litR]]) {
      const lk = L.ease.outCubic(L.prog(v.t, t0, 0.5));
      if (lk <= 0) continue;
      const x0 = SX(r[0] * D) - 3, x1 = SX(r[1] * D) + 3;
      const g = c.createLinearGradient(0, top, 0, gy);
      g.addColorStop(0, L.rgba(RISK, 0)); g.addColorStop(1, L.rgba(RISK, 0.34 * lk));
      c.fillStyle = g; c.fillRect(x0, L.lerp(gy, top, lk), x1 - x0, gy - L.lerp(gy, top, lk));
      c.fillStyle = L.rgba(RISK, 0.8 * lk); c.fillRect(x0, top + (gy - top) * (1 - lk), 1.5, (gy - top) * lk); c.fillRect(x1 - 1.5, top + (gy - top) * (1 - lk), 1.5, (gy - top) * lk);
    }
    // area under the curve: the full shape, clipped to the drawn x with a soft 48 px leading edge
    const n = Math.max(1, Math.round(N * draw)), xh = pts[n][0];
    if (draw > 0) {
      const fg = c.createLinearGradient(0, top, 0, gy);
      fg.addColorStop(0, 'rgba(160,190,240,0.16)'); fg.addColorStop(1, 'rgba(160,190,240,0.02)');
      const area = () => { c.beginPath(); c.moveTo(pts[0][0], gy); for (let i = 0; i <= N; i++) c.lineTo(pts[i][0], pts[i][1]); c.lineTo(pts[N][0], gy); c.closePath(); };
      const FE = 48, S = 12;
      c.save(); c.beginPath(); c.rect(pts[0][0] - 2, top - 20, Math.max(0, xh - FE - pts[0][0] + 2), gy - top + 30); c.clip(); c.fillStyle = fg; area(); c.fill(); c.restore();
      for (let i = 0; i < S; i++) {
        const a0 = xh - FE + (i * FE) / S;
        if (a0 + FE / S < pts[0][0]) continue;
        c.save(); c.beginPath(); c.rect(Math.max(pts[0][0] - 2, a0), top - 20, FE / S + 0.5, gy - top + 30); c.clip();
        c.globalAlpha = k * (1 - (i + 0.5) / S); c.fillStyle = fg; area(); c.fill(); c.restore();
      }
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = 'rgba(214,226,246,0.8)'; c.lineWidth = 3.5;
      c.beginPath(); for (let i = 0; i <= n; i++) (i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1])); c.stroke();
    }
    // lit stretches of the curve (thick, glowing) — at least 6 px long so the 1 % slices still read
    for (const [r, t0] of [[LEFT, T.litL], [RIGHT, T.litR]]) {
      const lk = L.ease.outCubic(L.prog(v.t, t0, 0.4));
      if (lk <= 0) continue;
      const seg = pts.filter((p) => p[2] >= r[0] - 1e-9 && p[2] <= r[1] + 1e-9);
      L.glow(c, RISK, 18, () => {
        c.strokeStyle = L.rgba(RISK, lk); c.lineWidth = 7;
        c.beginPath(); seg.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
      }, 0.8);
      c.strokeStyle = L.rgba([255, 190, 160], lk); c.lineWidth = 5;
      c.beginPath(); seg.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    }
    // phase ticks on the ground line (boundaries of Boeing's phases)
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (const p of PHASES) { if (p.u1 > draw + 1e-6) continue; const x = SX(p.u1 * D); c.fillRect(x - 0.75, gy - 7, 1.5, 7); }
    // CRUISE: a quiet label well above the flat middle (clear of the flying aircraft), once the curve has passed it
    const ck = L.smoothstep(L.prog(draw, 0.5, 0.12));
    if (ck > 0) {
      const cx = SX(0.445 * D), cy = SY(-A) - 62;
      c.globalAlpha = k * ck;
      c.font = L.font(26, 700, L.FONT.body); c.fillStyle = 'rgba(214,226,246,0.92)'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      L.trackedText(c, 'CRUISE', cx, cy, 5, 'center');
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const T = times(v);
    const t = v.t;
    c.save();
    c.globalAlpha = v.k;
    // ---- top stats
    const k70 = L.prog(t, T.s70, 0.35);
    if (k70 > 0) L.bigLabel(c, { x: 64, y: 520, big: '≈ 70%', small: 'of fatal accidents', k: k70, accent: RISK, size: 116 });
    const k6 = L.prog(t, T.s6, 0.5);
    if (k6 > 0) L.bigLabel(c, { x: W - 64, y: 520, big: '≈ 6%', small: 'of flight time', k: k6, accent: COOL, size: 116, align: 'right' });
    // ---- the bars: SCREEN space at the chart's final width (they fade in while the camera pulls out; no sliding/smear)
    const bk = L.smoothstep(L.prog(t, 0.45, 0.5)) * (1 - L.smoothstep(L.prog(t, v.d - 0.45, 0.3)));
    if (bk > 0) {
      const x0 = CHART.x0, x1 = CHART.x1, bw = x1 - x0;
      const X = (u) => x0 + u * bw;
      const lkL = L.ease.outCubic(L.prog(t, T.litL, 0.55)), lkR = L.ease.outCubic(L.prog(t, T.litR, 0.55));
      const pulse = 0.5 + 0.5 * Math.sin((t - T.s6) * 7);
      const sliv = L.smoothstep(L.prog(t, T.s6, 0.3)) * (1 - L.smoothstep(L.prog(t, T.s6 + 1.6, 0.6)));
      c.save();
      c.globalAlpha *= bk;
      // wedges: a time slice → its share of fatal accidents
      for (const [r, a, lk] of [[LEFT, [0, ACC[0]], lkL], [RIGHT, [ACC[1], 1], lkR]]) {
        if (lk <= 0) continue;
        const ya = BAR.t + BAR.th, yb = BAR.a, yc = L.lerp(ya, yb, lk);
        const ax0 = X(r[0]), ax1 = X(r[1]), bx0 = X(a[0]), bx1 = X(a[1]);
        const g = c.createLinearGradient(0, ya, 0, yb);
        g.addColorStop(0, L.rgba(RISK, 0.55)); g.addColorStop(1, L.rgba(RISK, 0.22));
        c.fillStyle = g;
        c.beginPath(); c.moveTo(ax0, ya); c.lineTo(ax1, ya); c.lineTo(L.lerp(ax1, bx1, lk), yc); c.lineTo(L.lerp(ax0, bx0, lk), yc); c.closePath(); c.fill();
      }
      // time bar: FLIGHT TIME
      c.fillStyle = 'rgb(40,44,56)'; L.roundRect(c, x0, BAR.t, bw, BAR.th, 7); c.fill();
      c.save(); L.roundRect(c, x0, BAR.t, bw, BAR.th, 7); c.clip();
      const slv = (r, lk) => { if (lk > 0) { c.fillStyle = L.rgba(L.mix(RISK, [255, 255, 255], 0.25 * sliv * pulse), lk); c.fillRect(X(r[0]), BAR.t, X(r[1]) - X(r[0]), BAR.th); } };
      slv(LEFT, lkL); slv(RIGHT, lkR);
      c.restore();
      if (sliv > 0) {   // "six percent": rings centred on the two sliver rects
        c.strokeStyle = `rgba(255,255,255,${0.9 * sliv})`; c.lineWidth = 3;
        for (const r of [LEFT, RIGHT]) { const a0 = X(r[0]), a1 = X(r[1]); L.roundRect(c, a0 - 6, BAR.t - 6, a1 - a0 + 12, BAR.th + 12, 9); c.stroke(); }
      }
      c.textBaseline = 'middle'; c.textAlign = 'left';
      c.font = L.font(26, 700, L.FONT.body); c.fillStyle = LBL;
      L.trackedText(c, 'FLIGHT TIME', X(0.5), BAR.t + BAR.th / 2 + 1, 4, 'center');
      // accident bar: FATAL ACCIDENTS (its label fitted into the grey middle)
      c.fillStyle = 'rgb(40,44,56)'; L.roundRect(c, x0, BAR.a, bw, BAR.ah, 7); c.fill();
      c.save(); L.roundRect(c, x0, BAR.a, bw, BAR.ah, 7); c.clip();
      c.fillStyle = L.rgba(RISK); c.fillRect(x0, BAR.a, bw * ACC[0] * lkL, BAR.ah);
      c.fillRect(x1 - bw * (1 - ACC[1]) * lkR, BAR.a, bw * (1 - ACC[1]) * lkR, BAR.ah);
      c.restore();
      const midW = bw * (ACC[1] - ACC[0]) - 24;
      const fsA = fitTracked(c, 'FATAL ACCIDENTS', midW, 26, 21, 1);
      c.font = L.font(fsA, 700, L.FONT.body); c.fillStyle = LBL;
      L.trackedText(c, 'FATAL ACCIDENTS', X((ACC[0] + ACC[1]) / 2), BAR.a + BAR.ah / 2 + 1, 1, 'center');
      c.font = L.font(42, 700, L.FONT.din); c.fillStyle = 'rgb(24,10,8)'; c.textAlign = 'center';
      if (lkL > 0.6) { c.globalAlpha = bk * v.k * L.clamp((lkL - 0.6) / 0.4); c.fillText('22%', X(ACC[0] / 2), BAR.a + BAR.ah / 2 + 3); }
      if (lkR > 0.6) { c.globalAlpha = bk * v.k * L.clamp((lkR - 0.6) / 0.4); c.fillText('48%', X((1 + ACC[1]) / 2), BAR.a + BAR.ah / 2 + 3); }
      c.globalAlpha = bk * v.k;
      // phase names under the lit chunks (one shared fitted size, ≥ 24 px gap between them)
      const N1 = 'TAKEOFF + INITIAL CLIMB', N2 = 'APPROACH + LANDING';
      let fsN = 28;
      for (; fsN > 22; fsN--) { c.font = L.font(fsN, 700, L.FONT.body); c.letterSpacing = '2px'; const w1 = c.measureText(N1).width, w2 = c.measureText(N2).width; c.letterSpacing = '0px'; if (w1 + w2 + 24 <= bw) break; }
      c.font = L.font(fsN, 700, L.FONT.body); c.textBaseline = 'alphabetic';
      const ny = BAR.a + BAR.ah + 40;
      if (lkL > 0) { c.globalAlpha = bk * v.k * lkL; c.fillStyle = L.rgba([255, 184, 156]); L.trackedText(c, N1, x0, ny, 2, 'left'); }
      if (lkR > 0) { c.globalAlpha = bk * v.k * lkR; c.fillStyle = L.rgba([255, 184, 156]); L.trackedText(c, N2, x1, ny, 2, 'right'); }
      // source
      c.globalAlpha = bk * v.k * L.smoothstep(L.prog(t, T.litR + 0.6, 0.5));
      const SRC = 'BOEING, 2016–2025 · FATAL ACCIDENTS, WORLDWIDE JETS';
      const fsS = fitTracked(c, SRC, bw, 22, 18, 1, 600);
      c.font = L.font(fsS, 600, L.FONT.body); c.fillStyle = 'rgba(196,204,220,0.85)';
      L.trackedText(c, SRC, (x0 + x1) / 2, ny + 54, 1, 'center');
      c.restore();
    }
    c.restore();
  },
};
