// Beat 4 — Mount Everest, 8,849 m, true scale.
// A massif (≈ 18 km across) centred on X.everest rises out of the haze while the camera pulls back from the Burj.
// Faceted ridge shading (sun from the right), a ragged snow cap with gullies, a rim light along the skyline and a
// light sweep over the snow once it settles. The towers are left as specks at its foot (drawn in front of it:
// layer −1), with a small "Burj Khalifa" tag. The summit gets a dashed altitude marker that carries the label.
// Stays in the world for the rest of the climb (it shrinks to a bump on the horizon).
import * as L from '../../../../engine/runtime/lib.js';
import { ALT, X } from '../camera.js';
import { skyColor } from '../env.js';

const { W } = L;
const SUMMIT = ALT.everest;           // 8,849 m
const SX = X.everest;                 // summit x (world)
const XS = 0.7;                       // horizontal squeeze of the profile: the toe ends ~1.5 km short of the towers
const ROCK = [52, 64, 88];
const ROCK_LIT = [92, 106, 132];
const HAZE = [128, 166, 210];
const SNOW = [238, 244, 252];
const SNOW_SH = [150, 172, 210];
const RIM = [255, 246, 230];

// ------------------------------------------------------------------ profile (x relative to the summit, height in m)
// Everest from the side: the west shoulder and a lesser peak to the left, the south summit, the South Col and
// a steep south-east flank to the right whose toe ends just past the towers.
const KEYS = [
  [-16500, 0], [-15200, 380], [-13900, 1300], [-12700, 2500], [-11500, 3900], [-10400, 5200], [-9400, 6200],
  [-8600, 6900], [-8050, 7160], [-7500, 6650], [-6900, 6150], [-6200, 6300], [-5200, 6900], [-4200, 7300],
  [-3200, 7520], [-2200, 7820], [-1300, 8180], [-500, 8560], [-180, 8760], [0, SUMMIT], [220, 8770], [520, 8690], [950, 8460], [1500, 8080],
  [2100, 7780], [2700, 7470], [3300, 6700], [3900, 5500], [4500, 4150], [5100, 2850], [5700, 1700], [6300, 850],
  [6800, 330], [7200, 90], [7550, 0],
];
function catmull(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil((p2[0] - p1[0]) / step));
    for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// jagged rock: two octaves of noise, stronger up high, none at the summit point itself and at the feet
const PROFILE = catmull(KEYS.map(([x, h]) => [x * XS, h]), 40).map(([x, h]) => {
  const up = L.clamp(h / 4000);
  const pin = L.clamp(Math.abs(x) / 500);
  const j = (L.noise1(x / 420, 3) * 95 + L.noise1(x / 130, 4) * 32 + L.noise1(x / 48, 5) * 10) * up * pin;
  return [x, Math.max(0, h + j)];
});
const X0 = PROFILE[0][0], X1 = PROFILE[PROFILE.length - 1][0];
function heightAt(xr) {
  if (xr <= X0 || xr >= X1) return 0;
  let lo = 0, hi = PROFILE.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; PROFILE[m][0] <= xr ? (lo = m) : (hi = m); }
  return L.lerp(PROFILE[lo][1], PROFILE[hi][1], L.invLerp(PROFILE[lo][0], PROFILE[hi][0], xr));
}

// snowline: ragged, lower on the shaded flank; gullies carry snow further down
const snowLine = (xr) => 5800 + (xr > 0 ? 300 : 0) + L.noise1(xr / 1400, 11) * 650 + L.noise1(xr / 380, 12) * 230 + L.noise1(xr / 110, 13) * 110 + L.noise1(xr / 37, 14) * 45;
const GULLIES = (() => {
  const r = L.rng(4401), out = [];
  for (let i = 0; i < 9; i++) {
    const xr = L.lerp(-12500, 6200, r());
    out.push({ xr: xr * XS, len: L.lerp(250, 1100, r() * r()), w: L.lerp(25, 60, r()) * XS, lean: (xr < 0 ? -1 : 1) * L.lerp(0.3, 0.7, r()) * XS });
  }
  return out;
})();

// spurs: ridges that fall from the skyline; the face on their left is in shadow (sun from the right)
const SPURS = (() => {
  const r = L.rng(4402), out = [];
  const starts = [-15000, -13600, -12100, -10600, -9300, -8050, -6800, -5200, -3700, -2300, -1000, 0, 900, 2100, 3000, 3900, 4800, 5800];
  for (const s0 of starts) {
    const xr = (s0 + (r() - 0.5) * 300) * XS;
    const h0 = heightAt(xr);
    const pts = [[xr, h0]];
    let x = xr, h = h0;
    const drift = (xr < 0 ? -1 : 1) * L.lerp(0.18, 0.5, r()) * XS;
    const seed = r() * 100;
    while (h > 0) {
      const dh = L.lerp(260, 420, r());
      h -= dh;
      x += dh * (drift + L.noise1(h / 700 + seed, 21) * 0.32 * XS);
      pts.push([x, Math.max(-200, h)]);
    }
    out.push({ pts, w: L.lerp(0.32, 0.62, r()) * XS, a: L.lerp(0.22, 0.4, r()) });
  }
  return out;
})();

// ------------------------------------------------------------------ timing
const RISE = [-0.1, 2.1];                 // the massif rises out of the haze while the camera pulls back
const SWEEP = [1.85, 1.5];                 // light sweep over the snow
const T_MARK = 2.05;                       // dashed summit marker draws (label lands on "almost nine")
const T_LABEL = 2.3;
const T_TAG = 0.95;                        // "Burj Khalifa" tag

const riseK = (t) => L.lerp(0.08, 1, L.ease.inOutCubic(L.prog(t, RISE[0], RISE[1])));
const emergeK = (t) => L.ease.outCubic(L.prog(t, RISE[0], RISE[1] * 0.6));   // fades up out of the haze as it rises

function outline(c, v, hk, step = 1) {
  c.beginPath();
  c.moveTo(v.wx(SX + X0), v.wy(0));
  for (let i = 0; i < PROFILE.length; i += step) c.lineTo(v.wx(SX + PROFILE[i][0]), v.wy(-PROFILE[i][1] * hk));
  c.lineTo(v.wx(SX + X1), v.wy(0));
  c.closePath();
}

/** The fully risen massif's outline as a path (for other beats to keep air/haze off the mountain). */
export function massifPath(c, v) { outline(c, v, 1, 2); }

function drawMassif(c, v, t, emerge = 1) {
  const hk = riseK(t);
  const s = 1 / v.cam.mpp;
  const hpx = SUMMIT * hk * s;
  if (hpx < 1.5) return;
  const gy = v.wy(0), ty = v.wy(-SUMMIT * hk);
  const detail = L.clamp((hpx - 40) / 120);     // facets/snow detail only when the mountain is big on screen
  const step = hpx > 300 ? 1 : hpx > 80 ? 2 : 4;
  const lit = L.ease.inOutCubic(L.prog(t, 0.6, 1.6));

  // base fill: rock darkening upwards out of a hazy base (aerial perspective)
  const g = c.createLinearGradient(0, ty, 0, gy);
  g.addColorStop(0, L.rgba(L.mix(ROCK, ROCK_LIT, 0.25)));
  g.addColorStop(0.55, L.rgba(L.mix(ROCK, HAZE, 0.22)));
  g.addColorStop(1, L.rgba(L.mix(ROCK, HAZE, 0.72)));
  outline(c, v, hk, step);
  c.fillStyle = g;
  c.fill();

  c.save();
  outline(c, v, hk, step);
  c.clip();
  // the sun-facing (right) half is lighter
  const sxp = v.wx(SX);
  const lg = c.createLinearGradient(sxp - 600 * s * 10, 0, sxp + 7000 * s, 0);
  lg.addColorStop(0, 'rgba(0,0,0,0.18)');
  lg.addColorStop(0.62, 'rgba(255,255,255,0)');
  lg.addColorStop(1, `rgba(200,220,255,${0.1 + 0.06 * lit})`);
  c.fillStyle = lg;
  c.fillRect(v.wx(SX + X0), ty, (X1 - X0) * s, gy - ty);

  if (detail > 0) {
    // spur facets
    c.globalAlpha = detail;
    for (const sp of SPURS) {
      c.beginPath();
      sp.pts.forEach(([x, h], i) => { const X_ = v.wx(SX + x), Y_ = v.wy(-h * hk); i ? c.lineTo(X_, Y_) : c.moveTo(X_, Y_); });
      for (let i = sp.pts.length - 1; i >= 0; i--) {
        const [x, h] = sp.pts[i];
        const drop = sp.pts[0][1] - h;
        c.lineTo(v.wx(SX + x - drop * sp.w), v.wy(-h * hk));
      }
      c.closePath();
      c.fillStyle = `rgba(14,20,38,${sp.a})`;
      c.fill();
    }
    // snow cap + gullies
    c.beginPath();
    const xs0 = -12800 * XS, xs1 = 6400 * XS;
    c.moveTo(v.wx(SX + xs0), v.wy(-snowLine(xs0) * hk));
    for (let x = xs0; x <= xs1; x += step * 70) c.lineTo(v.wx(SX + x), v.wy(-snowLine(x) * hk));
    c.lineTo(v.wx(SX + xs1), v.wy(-SUMMIT * 1.1));
    c.lineTo(v.wx(SX + xs0), v.wy(-SUMMIT * 1.1));
    c.closePath();
    for (const gu of GULLIES) {
      const y0 = snowLine(gu.xr) + 60;
      const x0 = SX + gu.xr, y1 = y0 - gu.len;
      c.moveTo(v.wx(x0 - gu.w), v.wy(-y0 * hk));
      c.quadraticCurveTo(v.wx(x0 + gu.lean * gu.len * 0.5), v.wy(-(y0 + y1) / 2 * hk), v.wx(x0 + gu.lean * gu.len), v.wy(-y1 * hk));
      c.quadraticCurveTo(v.wx(x0 + gu.lean * gu.len * 0.5 + gu.w * 0.3), v.wy(-(y0 + y1) / 2 * hk), v.wx(x0 + gu.w), v.wy(-y0 * hk));
      c.closePath();
    }
    const sg = c.createLinearGradient(sxp - 6000 * s, 0, sxp + 3000 * s, 0);
    sg.addColorStop(0, L.rgba(L.mix(SNOW_SH, ROCK, 0.2), 0.95));
    sg.addColorStop(0.55, L.rgba(L.mix(SNOW_SH, SNOW, 0.55), 0.97));
    sg.addColorStop(0.75, L.rgba(SNOW, 0.99));
    sg.addColorStop(1, L.rgba(SNOW, 0.99));
    c.fillStyle = sg;
    c.fill();
    // shadowed facets darken the snow too (re-applied over it, softer)
    for (const sp of SPURS) {
      if (sp.pts[0][1] < 5200) continue;
      c.beginPath();
      sp.pts.forEach(([x, h], i) => { const X_ = v.wx(SX + x), Y_ = v.wy(-h * hk); i ? c.lineTo(X_, Y_) : c.moveTo(X_, Y_); });
      for (let i = sp.pts.length - 1; i >= 0; i--) {
        const [x, h] = sp.pts[i];
        c.lineTo(v.wx(SX + x - (sp.pts[0][1] - h) * sp.w), v.wy(-h * hk));
      }
      c.closePath();
      c.fillStyle = `rgba(40,60,110,${sp.a * 1.05})`;
      c.fill();
    }
    // light sweep across the snow once it has risen
    const sw = L.prog(t, SWEEP[0], SWEEP[1]);
    if (sw > 0 && sw < 1) {
      const cx = L.lerp(sxp - 4500 * s, sxp + 6000 * s, L.ease.inOutCubic(sw));
      const wv = 1600 * s;
      const swg = c.createLinearGradient(cx - wv, 0, cx + wv, 0);
      swg.addColorStop(0, 'rgba(255,250,235,0)');
      swg.addColorStop(0.5, `rgba(255,250,235,${0.3 * Math.sin(Math.PI * sw)})`);
      swg.addColorStop(1, 'rgba(255,250,235,0)');
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = swg;
      c.fillRect(cx - wv, ty, wv * 2, gy - ty);
      c.globalCompositeOperation = 'source-over';
    }
    c.globalAlpha = 1;
  }
  // haze band at the foot (drawn last so the base melts into the air)
  const hz = c.createLinearGradient(0, gy - 2600 * s, 0, gy);
  hz.addColorStop(0, L.rgba(HAZE, 0));
  hz.addColorStop(1, L.rgba(HAZE, 0.55));
  c.fillStyle = hz;
  c.fillRect(v.wx(SX + X0), gy - 2600 * s, (X1 - X0) * s, 2600 * s);
  // emerging out of the haze: the (opaque) massif starts sky-coloured and gains its colours
  if (emerge < 1) {
    c.fillStyle = L.rgba(skyColor(3000), 1 - emerge);
    c.fillRect(v.wx(SX + X0), ty - 10, (X1 - X0) * s, gy - ty + 20);
  }
  c.restore();

  // rim light along the skyline: bright on faces turned to the sun (descending to the right)
  if (hpx > 25) {
    c.save();
    c.globalAlpha *= emerge;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.lineWidth = hpx > 300 ? 2 : 1.2;
    c.strokeStyle = L.rgba(RIM, 0.55 * (0.5 + 0.5 * lit));
    c.beginPath();
    let pen = false;
    for (let i = 1; i < PROFILE.length; i += step) {
      const [x0, h0] = PROFILE[Math.max(0, i - step)], [x1, h1] = PROFILE[i];
      const faces = h1 < h0 && h1 > 2500;
      if (faces) {
        if (!pen) c.moveTo(v.wx(SX + x0), v.wy(-h0 * hk));
        c.lineTo(v.wx(SX + x1), v.wy(-h1 * hk));
      }
      pen = faces;
    }
    c.stroke();
    // a fainter, cooler line on the shaded faces
    c.strokeStyle = L.rgba([200, 220, 255], 0.22);
    c.lineWidth = 1;
    c.beginPath();
    pen = false;
    for (let i = 1; i < PROFILE.length; i += step) {
      const [x0, h0] = PROFILE[Math.max(0, i - step)], [x1, h1] = PROFILE[i];
      const faces = h1 >= h0 && h1 > 2500;
      if (faces) {
        if (!pen) c.moveTo(v.wx(SX + x0), v.wy(-h0 * hk));
        c.lineTo(v.wx(SX + x1), v.wy(-h1 * hk));
      }
      pen = faces;
    }
    c.stroke();
    c.restore();
  }
  // summit glint
  const gl = Math.sin(Math.PI * L.prog(t, SWEEP[0] + 0.5, 0.9));
  if (gl > 0) {
    const px = v.wx(SX), py = v.wy(-SUMMIT * hk);
    L.lightBlob(c, px, py, 70, [255, 245, 225], 0.55 * gl);
    L.lightBlob(c, px, py, 14, [255, 255, 255], 0.9 * gl);
  }
}

// a far, paler range behind (aerial perspective), only to the left of the massif
const BACK = catmull([[-40000, 0], [-36000, 1800], [-33000, 4200], [-30500, 5600], [-28000, 4900], [-25500, 6300],
  [-23000, 5400], [-20500, 6100], [-18200, 4800], [-16000, 3900], [-13500, 2600], [-11000, 1200], [-8500, 0]], 200)
  .map(([x, h]) => [x, Math.max(0, h + L.noise1(x / 300, 31) * 120 * L.clamp(h / 2000))]);
function drawBackRange(c, v, t, emerge = 1) {
  const hk = riseK(t - 0.15);
  const s = 1 / v.cam.mpp;
  if (6300 * hk * s < 2) return;
  const gy = v.wy(0);
  c.save();
  c.beginPath();
  c.moveTo(v.wx(SX + BACK[0][0]), gy);
  for (const [x, h] of BACK) c.lineTo(v.wx(SX + x), v.wy(-h * hk));
  c.closePath();
  const g = c.createLinearGradient(0, v.wy(-6300 * hk), 0, gy);
  g.addColorStop(0, L.rgba(L.mix(L.mix(ROCK, HAZE, 0.62), skyColor(3000), 1 - emerge)));
  g.addColorStop(1, L.rgba(L.mix(L.mix(ROCK, HAZE, 0.86), skyColor(3000), 1 - emerge)));
  c.fillStyle = g;
  c.fill();
  c.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'Mount Everest', sub: 'The highest point on Earth' },
  captions: true,
  layer: -1,                       // behind the towers, so they read as specks at its foot
  cues(d) {
    return [
      { t: 0.05, name: 'deep', gain: 0.4, pitch: 0.6 },
      { t: 0.15, name: 'swell', gain: 0.3, pitch: 0.7 },
      { t: T_TAG, name: 'tick', gain: 0.18, pitch: 1.3 },
      { t: SWEEP[0] + 0.1, name: 'shimmer', gain: 0.2, pitch: 1.1 },
      { t: T_LABEL - 0.05, name: 'ping', gain: 0.24, pitch: 0.9 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < -1.2) return;                  // not in frame before the pull-back from the Burj
    if (v.cam.mpp > 3000) return;            // sub-pixel in the globe view
    // fully opaque (it is far behind the towers); it fades up out of the haze by colour, not by alpha
    const em = emergeK(v.t);
    drawBackRange(ctx, v, v.t, em);
    drawMassif(ctx, v, v.t, em);
  },
  drawOverlay(ctx, v) {
    const out = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.35, 0.3));
    // dashed altitude marker from the summit, carrying the label
    const mk = L.enter(v.t, T_MARK, 0.7) * out * v.k;
    const px = v.wx(SX), py = v.wy(-SUMMIT);
    if (mk > 0) {
      // like beats 1-3: the height line runs from the summit back to the altitude gauge (left column)
      const x1 = L.lerp(px - 18, 56, L.ease.outCubic(L.clamp(mk)));
      ctx.save();
      ctx.globalAlpha = mk;
      ctx.strokeStyle = L.rgba(v.accent, 0.9);
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = v.t * 12;
      ctx.beginPath(); ctx.moveTo(px - 18, py); ctx.lineTo(x1, py); ctx.stroke();
      ctx.fillStyle = L.rgba(v.accent);
      ctx.fillRect(40, py - 2, 26 * L.clamp(mk * 2 - 1), 4);
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(px, py, Math.max(0, 7 + 10 * (1 - mk)), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = L.rgba(v.accent);
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const k = L.enter(v.t, T_LABEL, 0.5) * out * v.k;
    // left column, sitting just above the height line (same y logic as heightLabel in s01)
    L.bigLabel(ctx, { x: 160, y: L.clamp(py - 100, 440, 1040), big: '8,849 m', small: '29,032 ft · the summit', k, accent: v.accent, size: 110 });

    // "Burj Khalifa" tag on the tower at the foot (towers are drawn by s03; we only point at the tip)
    const tk = L.enter(v.t, T_TAG, 0.5) * out * v.k * L.clamp((v.cam.mpp - 4) / 3);
    if (tk > 0) {
      const tx = v.wx(X.burj), ty = v.wy(-ALT.burj) - 8;
      const ex = tx - 46, ey = ty - 92;
      ctx.save();
      ctx.strokeStyle = 'rgba(240,245,255,0.8)';
      ctx.lineWidth = 2;
      ctx.globalAlpha = tk;
      const e = L.ease.outCubic(L.clamp(tk));
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(L.lerp(tx, ex, e), L.lerp(ty, ey, e)); ctx.stroke();
      ctx.globalAlpha = L.clamp(tk * 1.6 - 0.6);
      ctx.font = L.font(23, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(240,245,255,0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, 'BURJ KHALIFA', ex + 4, ey - 10, 2.5, 'right');
      ctx.restore();
    }
  },
};
