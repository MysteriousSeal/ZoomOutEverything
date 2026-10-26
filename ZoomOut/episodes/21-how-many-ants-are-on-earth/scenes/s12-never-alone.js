// Beat 12 (ep 21) — "Look down. | You're never really alone."
// The camera falls all the way back to the ground (mpp 1.2e-4: 13 cm of frame). On the soil, the toe of a real
// sneaker (side view, toe pointing right) rests at x ≤ −0.015 m: gum-rubber outsole with tread lugs and toe spring,
// off-white foam midsole, rubber toe bumper, a knit upper with a stitched toe overlay and flex creases, lit by the warm
// macro key from the upper right, with a contact shadow. One worker ant (ant.js) walks in from the right toward the toe
// and stops at x ≈ +0.007 (camera mpp ≈ 4e-5: the ant ≈ 120–130 px), antennae tapping: the focal point, at ground y ≈ 1120–1170 (above the caption band).
// All dimensions in metres (real sneaker proportions): shoe height at 5 cm behind the toe ≈ 5.5 cm, midsole ≈ 2 cm.
import * as L from '../../../../engine/runtime/lib.js';
import { drawAnt, gaitPhase } from '../ant.js';
import { X, band } from '../env.js';

const { W, H, ease, clamp, prog } = L;
const TOE = X.shoeToe;                       // −0.015
const ANT = X.lastAnt;                       // +0.007
const WALK = [64.9, 2.2, 0.024];             // start (film s), duration, distance walked (m)

// ---- shoe profile, in (u, h): u = metres BEHIND the toe tip (toward −x), h = metres above the ground
const SPRING = (u) => (u < 0.03 ? 0.009 * (1 - u / 0.03) ** 2 : 0);     // toe spring: the sole lifts toward the tip
const OUT_T = 0.0042;                                                     // gum outsole thickness
const MID_T = (u) => 0.0095 + 0.0095 * L.smoothstep(clamp(u / 0.05));     // foam midsole, thinner at the toe
const B = (u) => SPRING(u);                                               // sole bottom
const O = (u) => B(u) + OUT_T;                                            // outsole top
const M = (u) => O(u) + MID_T(u);                                         // midsole top = upper's bottom edge
const UP_H = (u) => {                                                     // upper height above the midsole
  const a = clamp((u - 0.002) / 0.03);
  return 0.034 * Math.sqrt(Math.max(0, 1 - (1 - a) ** 2)) + 0.28 * Math.max(0, u - 0.03) ** 1.1;
};
const T = (u) => M(u) + UP_H(u);                                          // top line of the upper
const U_MAX = 0.16;

export default {
  beat: 12,
  chapter: null,
  layer: 12,
  cues(d) {
    // relative to 63.936: the fall back down, touchdown ≈ 66.4, a soft blip as the ant stops
    return [
      { t: 0.1, name: 'dive', gain: 0.38, pitch: 0.9 },
      { t: 0.35, name: 'whoosh', gain: 0.3, pitch: 0.7 },
      { t: 2.45, name: 'swish', gain: 0.18, pitch: 0.8 },
      { t: 3.0, name: 'blip', gain: 0.14, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    const mpp = v.cam.mpp;
    if (mpp > 2.5e-3 || v.gt < v.tl.scenes[12].start) return;
    const k = 1 - band(mpp, 8e-4, 2.5e-3);
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = k;
    drawShoe(ctx, v);
    // ---- the ant: walks left toward the toe, then stands, antennae tapping
    const p = ease.outCubic(prog(v.gt, WALK[0], WALK[1]));
    const dist = p * WALK[2];
    const x = ANT + WALK[2] - dist;
    const len = 0.005 / mpp;
    const speed = (1 - p) * 1.0;
    const sx = v.wx(x), sy = v.wy(0);
    if (sx > -80 && sx < W + 80) {
      // a soft warm pool of light finds the ant (the focal point of the frame)
      L.lightBlob(ctx, sx, sy - len * 0.2, len * 2.6, [255, 226, 170], 0.22 * clamp(prog(v.gt, 65.6, 0.8)));
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, len * 0.6);
      g.addColorStop(0, 'rgba(12,7,3,0.4)'); g.addColorStop(1, 'rgba(12,7,3,0)');
      ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.16); ctx.translate(-sx, -sy);
      ctx.fillStyle = g; ctx.fillRect(sx - len * 0.6, sy - len * 0.6, len * 1.2, len * 1.2);
      ctx.restore();
      drawAnt(ctx, { x: sx, y: sy, len, dir: -1, phase: gaitPhase(dist) * 0.5, walk: clamp(speed * 2.2), t: v.gt * 1.4 });
    }
    ctx.restore();
  },
  drawOverlay() {},
};

/** the sneaker toe, side view (toe pointing +x), resting on the soil; key light from the upper right */
function drawShoe(c, v) {
  const mpp = v.cam.mpp;
  if (v.wx(TOE) < -40) return;
  const sx = (u) => v.wx(TOE - u), sy = (h) => v.wy(-h);
  const uEdge = Math.min(U_MAX, (v.wx(TOE) + 80) * mpp);
  const n = 80, us = [];
  for (let i = 0; i <= n; i++) us.push(uEdge * (i / n) ** 1.5);
  const trace = (f, from = 0, rev = false) => {
    const list = us.filter((u) => u >= from);
    if (rev) list.reverse();
    for (const u of list) c.lineTo(sx(u), sy(f(u)));
  };
  const px = (m) => Math.max(1, m / mpp);
  const gy = sy(0);
  // ---- contact shadow: dense under the flat sole, opening up under the toe spring
  c.save();
  const sh = c.createLinearGradient(sx(0), 0, sx(0.035), 0);
  sh.addColorStop(0, 'rgba(14,9,5,0)'); sh.addColorStop(1, 'rgba(14,9,5,0.6)');
  c.fillStyle = sh;
  c.beginPath();
  c.ellipse((sx(0) + sx(uEdge)) / 2, gy + 1, Math.max(0, (sx(0) - sx(uEdge)) / 2 + 20), px(0.0018), 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // ---- upper: charcoal knit
  const upper = () => {
    c.beginPath();
    c.moveTo(sx(uEdge) - 40, sy(M(uEdge) - 0.003));
    c.lineTo(sx(uEdge), sy(M(uEdge) - 0.003));
    trace((u) => M(u) - 0.003, 0.002, true);
    trace(T, 0.002);
    c.lineTo(sx(uEdge) - 40, sy(T(uEdge)));
    c.closePath();
  };
  c.save();
  upper();
  const ug = c.createLinearGradient(sx(0.01), sy(T(0.02)), sx(0.04), sy(M(0.03)));
  ug.addColorStop(0, 'rgb(104,108,116)'); ug.addColorStop(0.45, 'rgb(70,74,82)'); ug.addColorStop(1, 'rgb(38,40,46)');
  c.fillStyle = ug;
  c.fill();
  c.clip();
  // knit rows following the toe-box contour
  c.strokeStyle = 'rgba(18,20,24,0.32)';
  c.lineWidth = px(0.00016);
  for (let f = 0.04; f < 1; f += 0.035) {
    c.beginPath();
    us.forEach((u, i) => { const h = M(u) + f * UP_H(u); if (i === 0) c.moveTo(sx(u) + 8, sy(h)); else c.lineTo(sx(u), sy(h)); });
    c.stroke();
  }
  // suede toe cap overlay, a stitch line just inside its edge
  const cap = (u) => M(u) + L.lerp(0.027, 0.003, L.smoothstep(clamp(u / 0.056)));
  c.beginPath();
  c.moveTo(sx(-0.01), sy(M(0) - 0.01));
  c.lineTo(sx(-0.01), sy(cap(0)));
  trace(cap, 0);
  c.lineTo(sx(uEdge), sy(M(uEdge) - 0.01));
  c.closePath();
  const cg = c.createLinearGradient(0, sy(cap(0)), 0, sy(M(0)));
  cg.addColorStop(0, 'rgb(150,144,134)'); cg.addColorStop(1, 'rgb(96,92,86)');
  c.fillStyle = cg;
  c.fill();
  c.strokeStyle = 'rgba(30,28,26,0.55)';
  c.lineWidth = px(0.0003);
  c.beginPath(); c.moveTo(sx(-0.01), sy(cap(0))); trace(cap, 0); c.stroke();
  c.setLineDash([px(0.0011), px(0.0008)]);
  c.strokeStyle = 'rgba(232,226,212,0.75)';
  c.lineWidth = px(0.00032);
  c.beginPath(); c.moveTo(sx(0.002), sy(cap(0.002) - 0.0017)); trace((u) => cap(u) - 0.0017, 0.002); c.stroke();
  c.setLineDash([]);
  // flex creases across the vamp
  c.strokeStyle = 'rgba(16,16,20,0.45)';
  c.lineWidth = px(0.0005);
  for (const [u, s] of [[0.042, 1], [0.049, 0.75]]) {
    c.beginPath();
    c.moveTo(sx(u - 0.006), sy(T(u - 0.006) - 0.001));
    c.quadraticCurveTo(sx(u + 0.002), sy(T(u) - 0.01 * s), sx(u - 0.001), sy(cap(u) + 0.004));
    c.stroke();
  }
  // warm key light on the toe box, and a darker underside
  const kl = c.createRadialGradient(sx(0.012), sy(T(0.012)), 0, sx(0.012), sy(T(0.012)), 0.032 / mpp);
  kl.addColorStop(0, 'rgba(255,228,188,0.34)'); kl.addColorStop(1, 'rgba(255,228,188,0)');
  c.fillStyle = kl;
  c.fillRect(sx(0.06), sy(0.09), 0.08 / mpp, 0.1 / mpp);
  c.restore();
  // rim light along the top line
  c.save();
  c.strokeStyle = 'rgba(255,236,205,0.4)';
  c.lineWidth = px(0.0004);
  c.beginPath(); c.moveTo(sx(0.003), sy(T(0.003))); trace(T, 0.003); c.stroke();
  c.restore();

  // ---- rubber toe bumper wrapping the front of the upper
  const softMin = (a, b) => (a <= 0 || b <= 0 ? 0 : (a ** -3 + b ** -3) ** (-1 / 3));
  const bump = (u) => M(u) + softMin(UP_H(u) * 0.85, 0.0075 * (1 - clamp(u / 0.03)) ** 0.8);
  c.save();
  c.beginPath();
  c.moveTo(sx(0.03), sy(M(0.03) - 0.001));
  trace((u) => M(u) - 0.001, 0.006, true);
  trace(bump, 0.006);
  c.closePath();
  const bg = c.createLinearGradient(0, sy(bump(0)), 0, sy(M(0)));
  bg.addColorStop(0, 'rgb(236,230,218)'); bg.addColorStop(1, 'rgb(196,188,174)');
  c.fillStyle = bg;
  c.fill();
  c.restore();

  // ---- midsole: off-white foam with a moulded groove, rounded nose
  c.save();
  c.beginPath();
  c.moveTo(sx(uEdge) - 40, sy(O(uEdge)));
  c.lineTo(sx(uEdge), sy(O(uEdge)));
  trace(O, 0, true);
  c.bezierCurveTo(sx(-0.0038), sy(O(0) + 0.0015), sx(-0.0036), sy(M(0) - 0.0012), sx(0.0008), sy(M(0) + 0.0002));
  trace(M, 0.001);
  c.lineTo(sx(uEdge) - 40, sy(M(uEdge)));
  c.closePath();
  const mg = c.createLinearGradient(0, sy(M(0.03)), 0, sy(O(0.03)));
  mg.addColorStop(0, 'rgb(242,236,224)'); mg.addColorStop(0.55, 'rgb(222,214,200)'); mg.addColorStop(1, 'rgb(172,162,146)');
  c.fillStyle = mg;
  c.fill();
  c.clip();
  c.strokeStyle = 'rgba(140,128,110,0.55)';
  c.lineWidth = px(0.0006);
  c.beginPath(); c.moveTo(sx(-0.004), sy(O(0) + MID_T(0) * 0.45)); trace((u) => O(u) + MID_T(u) * 0.45, 0); c.stroke();
  const hl = c.createRadialGradient(sx(0.002), sy(M(0) - 0.004), 0, sx(0.002), sy(M(0) - 0.004), 0.018 / mpp);
  hl.addColorStop(0, 'rgba(255,250,236,0.5)'); hl.addColorStop(1, 'rgba(255,250,236,0)');
  c.fillStyle = hl;
  c.fillRect(sx(0.03), sy(0.04), 0.04 / mpp, 0.05 / mpp);
  c.restore();

  // ---- outsole: gum rubber, tread lugs on the side wall, wrapping up the toe
  c.save();
  c.beginPath();
  c.moveTo(sx(uEdge) - 40, sy(B(uEdge)));
  c.lineTo(sx(uEdge), sy(B(uEdge)));
  trace(B, 0, true);
  c.quadraticCurveTo(sx(-0.0022), sy(B(0) + OUT_T * 0.4), sx(-0.0012), sy(O(0) + 0.0012));
  trace(O, 0.0005);
  c.lineTo(sx(uEdge) - 40, sy(O(uEdge)));
  c.closePath();
  const og = c.createLinearGradient(0, sy(O(0.04)), 0, sy(B(0.04)));
  og.addColorStop(0, 'rgb(156,108,64)'); og.addColorStop(1, 'rgb(92,58,30)');
  c.fillStyle = og;
  c.fill();
  c.clip();
  c.fillStyle = 'rgba(46,28,14,0.5)';
  const lug = 0.0038;
  for (let u = 0.004; u < uEdge; u += lug) {
    const xa = sx(u), xb = sx(u + lug * 0.42);
    c.beginPath();
    c.moveTo(xa, sy(B(u) - 0.001)); c.lineTo(xa, sy(B(u) + OUT_T * 0.5));
    c.lineTo(xb, sy(B(u + lug * 0.42) + OUT_T * 0.5)); c.lineTo(xb, sy(B(u + lug * 0.42) - 0.001));
    c.closePath(); c.fill();
  }
  c.restore();
}
