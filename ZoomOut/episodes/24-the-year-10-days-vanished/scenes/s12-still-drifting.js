// Beat 12 — "Even today, the calendar drifts about a day every three thousand years."
// The camera pulls out to the whole orrery (Sun at y 840, month ring; ≈ 66.3–67.0 s; nothing of ours covers it), then
// dives to the equinox at mpp 0.42 (beat +2.35 → +3.85). env drifts the Gregorian calendar Earth 0 → 1 day (beat +2.75 → +4.55 s) while
// the HUD readout spins the year 1582 → ≈ 4,800. Ours: once the camera has landed, a gold engraved bracket along the
// orbit (just inside it, toward the Sun) that grows with the drift to "1 DAY", tick marks every 6 hours, and
// 1 DAY ≈ 3,000 YEARS / 26 SECONDS A YEAR in the lower band (y ≈ 1180–1290, clear of the captions).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, U_PER_DAY, drift, arcScreen } from '../env.js';

const T = { bracket: 3.3, label: 3.35 };   // after the orrery view, once the dive (beat +2.35 → +3.85) is under way
const OUT = -48;                                            // px: inside the orbit (toward the Sun = down here)

export default {
  beat: 12,
  chapter: { num: '11', title: 'Still drifting', sub: 'Gregorian year: 365.2425 days' },
  layer: 2,
  cues(d) {
    return [
      { t: T.bracket, name: 'tick', gain: 0.18, pitch: 1.2 },
      { t: T.label, name: 'impact', gain: 0.24, pitch: 1.05 },
      { t: 4.55, name: 'ping', gain: 0.2, pitch: 1.2 },
    ];
  },
  drawOverlay(c, v) {
    if (v.k <= 0) return;
    const b13 = v.tl.scenes[13].start;
    const leave = 1 - L.ease.inCubic(L.prog(v.gt, b13 - 0.05, 0.3));   // gone as the home move (beat 13 start) pulls the camera away
    const dr = drift(v);
    // ---- the drift bracket along the orbit
    const bk = v.k * L.enter(v.t, T.bracket, 0.4) * leave;
    if (bk > 0 && dr.mode === 'gregorian' && v.cam.mpp < 1.5) {
      const u = Math.max(0, dr.u);
      c.save();
      c.globalAlpha = bk;
      c.strokeStyle = L.rgba(ACCENT, 0.95);
      c.lineCap = 'round';
      c.lineWidth = 2.5;
      const N = 40;
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = arcScreen(v, (u * i) / N, OUT);
        if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y);
      }
      c.stroke();
      // end caps: the true equinox (right) and the calendar's March 21 (left)
      for (const uu of [0, u]) {
        const a = arcScreen(v, uu, OUT + 14), b = arcScreen(v, uu, OUT - 14);
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
      // 6-hour graduations under the bracket
      c.lineWidth = 1.4;
      c.beginPath();
      for (let h = 6; h * U_PER_DAY / 24 < u - 1; h += 6) {
        const uu = (h * U_PER_DAY) / 24;
        const a = arcScreen(v, uu, OUT), b = arcScreen(v, uu, OUT - 8);
        c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
      }
      c.stroke();
      // the running amount, centred under the bracket
      const mid = arcScreen(v, u / 2, OUT - 44);
      const days = dr.days;
      const txt = days >= 0.985 ? '1 DAY' : days * 24 >= 1 ? `${Math.round(days * 24)} HOURS` : `${Math.max(1, Math.round(days * 1440))} MIN`;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(2,6,14,0.9)';
      c.shadowBlur = 10;
      c.fillStyle = L.rgba(ACCENT);
      c.font = L.font(40, 700, L.FONT.din);
      c.fillText(txt, Math.max(150, mid.x), mid.y);
      c.restore();
    }
    // ---- the rate
    const k = v.k * L.enter(v.t, T.label, 0.5) * leave;
    if (k > 0) {
      c.save();
      const big = '1 DAY ≈ 3,000 YEARS';
      const size = L.fitSize(c, big, 860, 92, 800, L.FONT.display, 50);
      L.bigLabel(c, { x: 540, y: 1238, align: 'center', big, small: 'the calendar slips 26 seconds a year', k, accent: ACCENT, size });
      c.restore();
    }
  },
};
