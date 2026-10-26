// Beat 1 — "Step one: leave early. | The moment it turns, walk away. Don't stop to film."
// Camera 'leave' follows YOU (mpp 0.05, YOU ≈ (500, 860)). env: YOU ring + chip at T.youOn (8.22), the mood turns at
// T.mood0 (10.69: hotspots, agitation, heat), YOU walks west-south-west from T.walk0 (11.19).
//   phrase 0 (8.17)   STEP 1 badge LEAVE EARLY (env stepBadge, series placement).
//   phrase 1 (10.69)  "the moment it turns": thin red sonar rings ripple out of the three HOTSPOTS (world space, fade in
//                     0.6 s); on "walk away" (≈ 11.9) a green dashed heading (≤ 8.5 m, arrowhead) points from YOU toward
//                     the plaza's west exit, and a fading white trail grows behind YOU as it walks.
//                     sub WALK AWAY · DON'T STOP TO FILM (stepSub) at phrase 1 + 0.3.
//   "Don't stop to film" (≈ 13.2)  an ISO prohibition sign with a phone pops at (190, 690) over the dark park edge
//                     (clear of YOU, its heading and the HUD legend); the slash wipes 0.35 s later. Holds ≥ 1.5 s.
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, prohibition, glyphPhone, HOTSPOTS, EXIT, SAFE, DANGER, youAt, youTrail, timesFor } from '../env.js';

const TAU = Math.PI * 2;
/** STEP 1 badge entry (film time): starts 0.15 s before beat 1 (s00 draws its first frames) */
export const step1K = (v) => L.enter(v.gt, v.tl.scenes[1].start - 0.15, 0.75);
const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
/** start (beat-relative s) of word n of phrase j, weighted like the captions */
function wordT(v, j, n) {
  const p = v.tl.lines[v.index].phrases[j], ws = p.text.split(/\s+/);
  const wt = ws.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w.replace(/\/$/, '')) ? 3 : 0));
  const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += wt[i];
  return p.start + ((p.end - p.start) * acc) / tot - v.tl.scenes[v.index].start;
}

export default {
  beat: 1,
  chapter: null,
  captions: true,
  layer: 5,
  cues(d) { return [{ t: -0.13, name: 'blip', gain: 0.16, pitch: 1 }]; },   // with the STEP 1 tile pop (b1 − 0.15), before "Step"
  drawOverlay(c, v) {
    const T = timesFor(v.tl);
    c.save();
    c.globalAlpha = v.k;

    // ---- the mood turns: sonar rings out of the hotspots
    const hk = L.ease.outCubic(L.prog(v.gt, T.mood0, 0.6));
    if (hk > 0) {
      for (const h of HOTSPOTS) {
        const x = v.wx(h.x), y = v.wy(h.y);
        if (x < -150 || x > 1230 || y < 300 || y > 1700) continue;
        const beat = 0.65 + 0.35 * Math.sin(v.gt * 1.9 + h.ph);   // in step with env's hotspot pulse
        c.lineWidth = 3;
        for (let q = 0; q < 2; q++) {
          const u = ((v.gt - T.mood0) * 0.75 + h.ph * 0.13 + q * 0.5) % 1;
          const r = 30 + u * 105;
          c.strokeStyle = `rgba(255,96,80,${0.85 * hk * beat * (1 - u) * L.clamp(u * 6)})`;
          c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.stroke();
        }
        c.strokeStyle = `rgba(255,110,92,${0.8 * hk})`; c.lineWidth = 2.5;
        c.setLineDash([7, 7]);
        c.beginPath(); c.arc(x, y, 46, 0, TAU); c.stroke();
        c.setLineDash([]);
      }
    }

    // ---- the walk: a trail behind YOU + a green heading toward the exit
    const p = { ...youAt(v.gt, v.tl) }, sx = v.wx(p.x), sy = v.wy(p.y);
    if (v.gt > T.walk0 + 0.05) {
      const pts = youTrail(T.walk0, v.gt, v.tl, 30).map(([x, y]) => [v.wx(x), v.wy(y)]);
      c.lineCap = 'round'; c.lineWidth = 5;
      for (let i = 1; i < pts.length; i++) {
        const a = i / (pts.length - 1);
        if (Math.hypot(pts[i][0] - sx, pts[i][1] - sy) < 24) continue;   // not inside the ring
        c.strokeStyle = `rgba(255,255,255,${0.1 + 0.75 * a})`;
        c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
      }
    }
    const gk = L.ease.outCubic(L.prog(v.t, wordT(v, 1, 4) - 0.1, 0.6));   // "walk away"
    if (gk > 0) {
      const dx = EXIT.x - p.x, dy = EXIT.y - p.y, d = Math.hypot(dx, dy);
      const len = Math.min(8.5, d - 0.5) / v.cam.mpp;
      if (len > 50) {
        const ux = dx / d, uy = dy / d;
        const x0 = sx + ux * 34, y0 = sy + uy * 34, x1 = sx + ux * (34 + len * gk), y1 = sy + uy * (34 + len * gk);
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 8;
        c.strokeStyle = L.rgba(SAFE, 0.95); c.fillStyle = L.rgba(SAFE, 0.95);
        c.lineWidth = 5; c.lineCap = 'round';
        c.setLineDash([14, 11]); c.lineDashOffset = -v.gt * 40;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - ux * 14, y1 - uy * 14); c.stroke();
        c.setLineDash([]);
        const a = Math.atan2(uy, ux), hd = 26;
        c.beginPath();
        c.moveTo(x1 + ux * 4, y1 + uy * 4);
        c.lineTo(x1 - Math.cos(a - 0.5) * hd, y1 - Math.sin(a - 0.5) * hd);
        c.lineTo(x1 - Math.cos(a + 0.5) * hd, y1 - Math.sin(a + 0.5) * hd);
        c.closePath(); c.fill();
        c.restore();
      }
    }

    // ---- badge + sub
    // the badge entry is a function of film time shared with s00 (which starts it 0.15 s before the cut, over the fading
    // hook title: no text-free gap); here it ignores the overlay fade-in, keeps the fade-out
    c.save();
    c.globalAlpha = v.t < v.d / 2 ? 1 : v.k;
    stepBadge(c, v, 1, 'LEAVE EARLY', { k: step1K(v) });
    c.restore();
    stepSub(c, "WALK AWAY · DON'T STOP TO FILM", L.enter(v.t, ph(v, 1) + 0.3, 0.45));

    // ---- don't stop to film
    const tf = wordT(v, 1, 6);   // "Don't"
    prohibition(c, 190, 700, 96, L.prog(v.t, tf - 0.25, 0.5), L.prog(v.t, tf + 0.25, 0.35), glyphPhone);
    c.restore();
  },
};
