// Beat 2 — "Right now, parts of the Pacific are three degrees hotter than normal. | A warm stripe more than ten
// thousand kilometres long."  (14.61–23.42; phrase 1 at 19.12; all times read from the timeline)
// Shot 'nino34' (from 14.51, arrives ≈ 15.9): the Niño 3.4 box (5°N–5°S, 170°W–120°W) centred, x ≈ 100–980, y ≈ 793–967.
// Shot 'stripe' (from 18.82, arrives ≈ 20.2): pull out, 160°E (x ≈ 45) to the coast of Ecuador (x ≈ 1050).
//
//   t ≈ 0.45–1.15 the box traces itself on the globe (geo path, follows the push-in)
//   t ≈ 1.0–1.95  a sampling scan sweeps the box west → east while the readout counts 0 → +3.3 °C (frame-stable,
//                 lands exactly on FACTS.nino34); label above the box: big +3.3 °C, source line
//                 "NIÑO 3.4 · WEEKLY · 14 OCT 2026" (bigLabel, centred, baseline y ≈ 650, soft scrim behind it)
//   stripe move   the readout exits (fast) as the camera pulls out; the box leaves with it
//   phrase 1      a measuring bracket ON the globe (lat 13°N, 160°E → 80°W) grows out from its centre, end ticks
//                 drop to the stripe; label "> 10,000 KM" above it (y ≈ 690); ≈ 1.2 s later "+3.9 °C / OFF PERU"
//                 (FACTS.nino12) right-aligned at x 875, y ≈ 1150–1270 with a leader to the Peruvian coast.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, FACTS, NINO34, boxPts, geo, fmtC, phrase, shotStart } from '../env.js';

const { W } = L;
const BR_LAT = 13, BR_W = 160, BR_E = -80;   // bracket: latitude, west end (160°E), east end (80°W)
const signedLon = (x) => (x > 180 ? x - 360 : x);

/** project a list of [lat, lon] and return screen points (front side only) */
const proj = (v, pts, alt = 0) => pts.map(([la, lo]) => geo(v, la, lo, alt));
/** stroke the first fraction k (0..1) of a polyline */
function partial(c, pts, k) {
  if (k <= 0 || pts.length < 2) return;
  let tot = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); tot += d; }
  let left = tot * L.clamp(k);
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const d = seg[i - 1], f = Math.min(1, left / Math.max(1e-6, d));
    c.lineTo(L.lerp(pts[i - 1].x, pts[i].x, f), L.lerp(pts[i - 1].y, pts[i].y, f));
    left -= d;
  }
  c.stroke();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Right now', sub: 'Niño 3.4 region, central Pacific' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      // times for the 62.49 s timeline (beat 14.31): "three" starts ≈ 16.30, "degrees" ≈ 16.62
      { t: 0.45, name: 'blip', gain: 0.2, pitch: 0.9 },     // box traces
      { t: 0.95, name: 'count', gain: 0.07, pitch: 1.0 },   // scan + counter (quiet: under "parts of the Pacific")
      { t: 1.93, name: 'impact', gain: 0.2, pitch: 0.9 },   // +3.3 lands in the dip before "three" (≈ 16.24), −5 dB
      { t: 4.55, name: 'swish', gain: 0.25, pitch: 0.8 },   // bracket
      { t: 5.81, name: 'ping', gain: 0.12, pitch: 1.1 },    // +3.9 off Peru (mid-"than", soft)
    ];
  },
  drawOverlay(c, v) {
    const t = v.t;
    const p1 = phrase(v, 1);
    const tStripe = shotStart('stripe', v.tl) - v.tl.scenes[2].start;   // ≈ 4.21
    c.save();
    c.globalAlpha = v.k;
    c.textBaseline = 'alphabetic';

    // ---------------------------------------------------------------- the Niño 3.4 box
    const traceK = L.ease.inOutCubic(L.prog(t, 0.45, 0.7));
    const dim = 1 - L.ease.inCubic(L.prog(t, tStripe - 0.1, 0.3));   // leaves with the readout
    const bp = proj(v, [...boxPts(NINO34, 1), [NINO34.n, NINO34.w]]);
    if (traceK > 0 && dim > 0.001 && bp.every((p) => p.z > 0.05)) {
      c.save();
      c.globalAlpha = v.k * dim;
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
      partial(c, bp, traceK);
      c.restore();
      // the sampling scan: a bright meridian sweeping west → east with a fading wake
      const sk = L.prog(t, 1.0, 0.95);
      if (sk > 0 && sk < 1) {
        const lonS = L.lerp(NINO34.w, NINO34.e, L.ease.inOutCubic(sk));
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
          const lo = lonS - i * 1.2;
          if (lo < NINO34.w) break;
          const a = (1 - i / 14) ** 2 * 0.35 * Math.sin(Math.PI * sk);
          const q = proj(v, [[NINO34.n, lo], [NINO34.s, lo]]);
          c.strokeStyle = `rgba(255,236,210,${a * v.k})`;
          c.lineWidth = i === 0 ? 4 : 6;
          c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[1].x, q[1].y); c.stroke();
        }
        c.restore();
      }
    }

    // ---------------------------------------------------------------- readout: +3.3 °C (counts during the scan)
    const rk = L.enter(t, 0.95, 0.5) * (1 - L.ease.inCubic(L.prog(t, tStripe - 0.1, 0.3)));
    if (rk > 0.001) {
      const tq = Math.round(v.gt * 30) / 30 - v.tl.scenes[2].start;     // frame-stable
      const val = FACTS.nino34 * L.ease.outCubic(L.prog(tq, 1.0, 0.95));   // lands ≈ 16.26 s, on "three"
      const y = 650;
      // soft elliptical scrim so the type sits cleanly over the field's northern edge
      c.save();
      c.globalAlpha = v.k * rk * 0.8;
      c.translate(W / 2, y - 40); c.scale(1, 0.36);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, 470);
      sg.addColorStop(0, 'rgba(3,7,18,0.7)'); sg.addColorStop(0.6, 'rgba(3,7,18,0.45)'); sg.addColorStop(1, 'rgba(3,7,18,0)');
      c.fillStyle = sg; c.fillRect(-470, -470, 940, 940);
      c.restore();
      L.bigLabel(c, { x: W / 2, y, big: fmtC(Math.round(val * 10) / 10), small: 'NIÑO 3.4 · WEEKLY · 14 OCT 2026', k: v.k * rk, accent: ACCENT, align: 'center', size: 150 });
    }

    // ---------------------------------------------------------------- the stripe: > 10,000 KM bracket
    const bk = L.ease.inOutCubic(L.prog(t, p1 + 0.05, 1.0));
    if (bk > 0) {
      const mid = (BR_W + (BR_E + 360)) / 2;            // east-longitude midpoint (≈ 140°W)
      const half = ((BR_E + 360) - BR_W) / 2 * bk;
      const line = [];
      for (let x = mid - half; x <= mid + half + 1e-6; x += Math.max(0.5, half / 30)) line.push([BR_LAT, signedLon(x)]);
      const lp = proj(v, line, 0.01).filter((p) => p.z > 0.05);
      c.save();
      c.globalAlpha = v.k;
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 10;
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.lineWidth = 3.5; c.lineCap = 'round'; c.lineJoin = 'round';
      if (lp.length > 1) { c.beginPath(); lp.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke(); }
      // end ticks drop to the stripe once the bracket is fully out
      const tk = L.ease.outCubic(L.prog(t, p1 + 0.85, 0.35));
      if (tk > 0) {
        for (const lo of [BR_W, BR_E]) {
          const q = proj(v, [[BR_LAT, signedLon(lo)], [BR_LAT - 5 * tk, signedLon(lo)]], 0.01);
          if (q[0].z > 0.05) { c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[1].x, q[1].y); c.stroke(); }
        }
      }
      // label above the middle
      const lk = L.enter(t, p1 + 0.45, 0.5);
      if (lk > 0) {
        const pm = geo(v, BR_LAT, signedLon(mid), 0.01);
        const label = '> 10,000 KM';
        const fs = L.fitSize(c, label, 600, 70, 800, L.FONT.display, 40);
        c.globalAlpha = v.k * L.clamp(lk * 1.4);
        c.font = L.font(fs, 800, L.FONT.display);
        c.fillStyle = '#fff';
        c.shadowBlur = 16;
        L.trackedText(c, label, pm.x, pm.y - 22 + (1 - lk) * 14, 2, 'center');
      }
      c.restore();
    }

    // ---------------------------------------------------------------- +3.9 °C OFF PERU
    const pk = L.enter(t, p1 + 1.35, 0.5);
    if (pk > 0) {
      const coast = geo(v, -6, -81.6, 0.005);
      const lx = 875, ly = 1215;
      const SZ = 84, barY = ly - SZ * 0.92 - 26;          // bigLabel's accent rule (top edge), right-aligned at lx
      if (coast.z > 0.05) L.leader(c, coast.x - 6, coast.y + 4, lx - 3, barY + 1, pk * v.k, [255, 255, 255], 0.8);   // touches the bar
      L.bigLabel(c, { x: lx, y: ly, big: fmtC(FACTS.nino12), small: 'OFF PERU', k: v.k * pk, accent: ACCENT, align: 'right', size: SZ });
    }
    c.restore();
  },
};
