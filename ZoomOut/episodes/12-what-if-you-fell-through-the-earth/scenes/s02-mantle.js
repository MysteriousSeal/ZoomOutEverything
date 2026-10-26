// Beat 2 — the mantle. Just after the Moho flash (s01) the camera pulls out to 3,200 m/px and the dark-red mantle
// streams past. Slow convection cells come alive in world space: faint rounded loops between the Moho and the
// core-mantle boundary, with soft comets travelling round them (adjacent cells counter-rotate) and hot plumes rising
// where two cells meet. On "nearly three thousand kilometers" a bracket spans Moho → CMB and the label lands right of
// the tunnel. At 14.8 s the faller crosses the core-mantle boundary: a hot light wave runs along it (drawn here).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, RADIUS } from '../camera.js';
import { boundaryFlash, depthLabel } from './s01-crust.js';

const { W, H } = L;
export const T_CMB = 14.8;           // global s: faller crosses the core-mantle boundary
const BEAT = 9.474;                  // beat start (global), for the cue/visibility maths
const BRACKET = 1.55, LAND = 1.85;   // beat time: "nearly three thousand kilometers"

// ------------------------------------------------------------------ convection cells (world space, polar)
const CELL = 22 * Math.PI / 180;     // angular width of one cell; boundaries at k·CELL, rising where k is odd
const RM = (RADIUS.cmb + RADIUS.moho) / 2, DR = (RADIUS.moho - RADIUS.cmb) / 2;
const LOOPS = [0.8, 0.5];
const spow = (x, p) => Math.sign(x) * Math.pow(Math.abs(x), p);
const polar = (th, r) => ({ x: r * Math.sin(th), y: R_EARTH - r * Math.cos(th) });
/** Point on loop q of cell k at parameter a (rad): a rounded rectangle in (angle, radius). */
function loopPt(k, q, a) {
  const thc = (k + 0.5) * CELL;
  const th = thc + q * CELL * 0.43 * spow(Math.cos(a), 0.5);
  const r = RM + q * DR * 0.8 * spow(Math.sin(a), 0.5);
  return polar(th, r);
}
/** 0..1 visibility of the convection detail. */
/** Fade toward the left edge: keeps the loops off the HUD tunnel-map strip (x 20-200 with its labels). */
const edgeK = (x) => L.smoothstep(L.invLerp(170, 265, x));
const convK = (gt) => L.ease.inOutCubic(L.prog(gt, 10.6, 1.3)) * (1 - L.ease.inOutCubic(L.prog(gt, 15.3, 1.1)));

function drawConvection(c, v, k) {
  const mpp = v.cam.mpp;
  if (DR * 2 / mpp < 150) return;
  const tx = v.wx(0);
  c.save();
  // keep the shaft clean: clip out a strip around the tunnel
  c.beginPath(); c.rect(170, -10, Math.max(0, tx - 6 - 170), H + 20); c.rect(tx + 6, -10, W - tx + 4, H + 20); c.clip();
  const guide = c.createLinearGradient(170, 0, 265, 0);
  guide.addColorStop(0, 'rgba(255,190,146,0)'); guide.addColorStop(1, `rgba(255,190,146,${0.15 * k})`);
  const S = (p) => [v.wx(p.x), v.wy(p.y)];
  for (let kc = -8; kc < 8; kc++) {
    // cull: the cell's centre and corners
    const pts = [loopPt(kc, 1, 0), loopPt(kc, 1, Math.PI / 2), loopPt(kc, 1, Math.PI), loopPt(kc, 1, -Math.PI / 2)].map(S);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    if (Math.max(...xs) < -50 || Math.min(...xs) > W + 50 || Math.max(...ys) < -50 || Math.min(...ys) > H + 50) continue;
    const dir = kc % 2 === 0 ? 1 : -1;     // even cells: rising on their right edge → counter-clockwise in (angle, r)
    LOOPS.forEach((q, li) => {
      // the loop itself: a faint guide line
      c.beginPath();
      for (let i = 0; i <= 72; i++) { const [x, y] = S(loopPt(kc, q, (i / 72) * Math.PI * 2)); i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.strokeStyle = guide;
      c.lineWidth = 1.5;
      c.stroke();
      // comets: slow, tapered, with a small chevron at the head
      const speed = (0.3 - li * 0.04) * dir;      // rad/s along the loop: a lap every ~20 s (slow rock)
      for (let m = 0; m < 3; m++) {
        const a0 = v.gt * speed + m * Math.PI * 2 / 3 + kc * 1.7 + li * 0.9;
        c.save();
        c.globalCompositeOperation = 'lighter';
        const N = 14, span = 1.25 * dir;
        let prev = S(loopPt(kc, q, a0 - span));
        for (let i = 1; i <= N; i++) {
          const f = i / N;
          const p = S(loopPt(kc, q, a0 - span + span * f));
          c.strokeStyle = `rgba(255,204,156,${0.62 * f * f * k * edgeK((prev[0] + p[0]) / 2)})`;
          c.lineWidth = 0.8 + 2.2 * f;
          c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(p[0], p[1]); c.stroke();
          prev = p;
        }
        // chevron
        const h = S(loopPt(kc, q, a0)), b = S(loopPt(kc, q, a0 - 0.06 * dir));
        const ang = Math.atan2(h[1] - b[1], h[0] - b[0]);
        c.strokeStyle = `rgba(255,222,190,${0.75 * k * edgeK(h[0])})`;
        c.lineWidth = 2;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(h[0] - Math.cos(ang - 0.6) * 11, h[1] - Math.sin(ang - 0.6) * 11);
        c.lineTo(h[0], h[1]);
        c.lineTo(h[0] - Math.cos(ang + 0.6) * 11, h[1] - Math.sin(ang + 0.6) * 11);
        c.stroke();
        c.restore();
      }
    });
    // hot plume rising along this cell's rising edge (odd boundary)
    const kb = dir > 0 ? kc + 1 : kc;
    const th = kb * CELL;
    const base = S(polar(th, RADIUS.cmb + DR * 0.05)), top = S(polar(th, RADIUS.moho - DR * 0.25));
    const len = Math.hypot(top[0] - base[0], top[1] - base[1]);
    if (len > 10) {
      const breathe = (0.8 + 0.2 * Math.sin(v.gt * 0.9 + kb)) * edgeK(Math.max(base[0], top[0]));
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.translate(base[0], base[1]);
      c.rotate(Math.atan2(top[1] - base[1], top[0] - base[0]));
      c.scale(1, 0.16);
      c.beginPath(); c.rect(0, -len, len * 1.1, len * 2); c.clip();   // only the half that rises out of the CMB
      const g = c.createRadialGradient(0, 0, 0, 0, 0, len);
      g.addColorStop(0, `rgba(255,160,90,${0.24 * k * breathe})`);
      g.addColorStop(0.5, `rgba(255,120,60,${0.09 * k * breathe})`);
      g.addColorStop(1, 'rgba(255,110,50,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, len, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }
  c.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'The mantle', sub: 'Hot rock that flows, very slowly' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 9.95 - BEAT - 0.02, name: 'deep', gain: 0.4, pitch: 0.8 },
      { t: 9.95 - BEAT + 0.02, name: 'bloom', gain: 0.3, pitch: 1.0 },
      { t: 1.2, name: 'swell', gain: 0.2, pitch: 0.7 },
      { t: BRACKET, name: 'swish', gain: 0.2, pitch: 1.1 },
      { t: LAND, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: LAND + 0.08, name: 'blip', gain: 0.18, pitch: 0.85 },
      { t: Math.min(d - 0.2, T_CMB - BEAT - 0.6), name: 'riser', gain: 0.22, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    const k = convK(v.gt);
    if (k > 0) drawConvection(ctx, v, k);
    boundaryFlash(ctx, v, RADIUS.cmb, v.gt - T_CMB, [255, 196, 120], 1);
  },

  drawOverlay(ctx, v) {
    const k = L.enter(v.t, LAND, 0.55);
    const kb = L.enter(v.t, BRACKET, 0.6, L.ease.inOutCubic);
    depthLabel(ctx, v, {
      rTop: RADIUS.moho, rBot: RADIUS.cmb, k, kb,
      big: '≈ 2,900 km', small: '1,800 mi of hot rock', plate: 0.28,
    });
  },
};
