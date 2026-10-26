// Layer "solar" (lf 9.4 → 17.4) — builder C.
// The Sun, the eight planets at their true heliocentric longitudes (15 July 2026), true-radius orbits, the asteroid belt
// (Kirkwood gaps + Jupiter's Trojans), the Kuiper belt, the heliopause, Voyager 1 and its path, and the Oort cloud.
// Distances are true to scale; planet dots are enlarged (labelled). Labels live in c-labels.js (forward pass only).
import * as L from '../../../../engine/runtime/lib.js';
import { band, ACCENT } from '../world.js';
import { AU, LY, SUN, MOON_POS, R_EARTH, VOYAGER, eclDir } from '../camera.js';
import {
  PLANETS, R_SUN, R_MOON, BELT, TROJANS, KUIPER, OORT, VOY_PATH, LIGHT_DAY_AU, HELIOPAUSE_AU, NOSE_LON,
  ph, wordT, reveal, backStart, sceneStart, voyProgress,
} from './c-data.js';
import { circlePath, dot, cloud } from './c-draw.js';
import { drawLabels } from './c-labels.js';

const { W, H } = L;

// ------------------------------------------------------------------ the Sun
let sunSprite = null;
function sunDisc() {
  // limb-darkened photosphere, 512 px (I(μ) ≈ 1 − 0.6(1−μ) − 0.15(1−μ)², warmer toward the limb)
  if (sunSprite) return sunSprite;
  const S = 512, c = new OffscreenCanvas(S, S), g = c.getContext('2d');
  const img = g.createImageData(S, S), d = img.data, R = S / 2 - 1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const rx = (x + 0.5 - S / 2) / R, ry = (y + 0.5 - S / 2) / R, rr = rx * rx + ry * ry;
    const i = (y * S + x) * 4;
    if (rr > 1) { d[i + 3] = 0; continue; }
    const mu = Math.sqrt(1 - rr), m = 1 - mu;
    const I = 1 - 0.35 * m - 0.15 * m * m;
    const col = L.ramp([[0, [255, 250, 232]], [0.5, [255, 230, 170]], [0.82, [255, 186, 96]], [1, [240, 130, 46]]], m);
    const edge = L.clamp((1 - Math.sqrt(rr)) * R * 1.2);                  // 1-px antialiased limb
    d[i] = col[0] * (0.8 + 0.2 * I); d[i + 1] = col[1] * (0.6 + 0.4 * I); d[i + 2] = col[2] * (0.4 + 0.6 * I);
    d[i + 3] = 255 * edge;
  }
  g.putImageData(img, 0, 0);
  sunSprite = c;
  return c;
}

/** Sun visibility for the handoff to builder D's star (gone by lf 17.0). */
export const sunK = (lf) => 1 - L.smoothstep(L.clamp((lf - 15.8) / 1.2));

function drawSun(c, v) {
  const lf = v.cam.lf, a = sunK(lf);
  if (a <= 0) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y), rt = R_SUN / v.cam.mpp;
  const s = L.lerp(1, 0.55, L.invLerp(12.5, 16.2, lf));
  const big = (330 + rt * 7) * s, mid = (115 + rt * 4) * s, core = (26 + rt * 2) * s;
  // off-screen: the Sun's light leaking in from the frame edge (pulls the eye before the Sun arrives)
  const nx = Math.max(-sx, 0, sx - W), ny = Math.max(-sy, 0, sy - H), off = Math.hypot(nx, ny);
  const leakK = band(lf, 9.35, 9.9, 10.9, 11.3);
  if (off > 0 && leakK > 0) {
    const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
    const t = Math.min((W / 2) / Math.max(1e-6, Math.abs(dx)), (H / 2) / Math.max(1e-6, Math.abs(dy)));
    const ex = cx + dx * t, ey = cy + dy * t;
    const near = 0.35 + 0.65 * Math.exp(-off / 2500);
    L.lightBlob(c, ex, ey, 620, [255, 140, 50], 0.26 * leakK * near);
    L.lightBlob(c, ex, ey, 260, [255, 200, 120], 0.34 * leakK * near);
  }
  if (off > big * 1.1) return;
  L.lightBlob(c, sx, sy, big, [255, 128, 40], 0.15 * a);
  L.lightBlob(c, sx, sy, mid, [255, 186, 96], 0.42 * a);
  L.lightBlob(c, sx, sy, core, [255, 236, 200], 0.9 * a);
  // a faint anamorphic streak (house look)
  const sw = mid * 1.6;
  const g = c.createLinearGradient(sx - sw, 0, sx + sw, 0);
  g.addColorStop(0, 'rgba(255,190,110,0)');
  g.addColorStop(0.5, `rgba(255,222,170,${0.28 * a})`);
  g.addColorStop(1, 'rgba(255,190,110,0)');
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = g;
  c.fillRect(sx - sw, sy - 1.1, sw * 2, 2.2);
  c.restore();
  // the photosphere at true size (a bright point when smaller than ~1 px)
  c.save();
  c.globalAlpha *= a;
  if (rt >= 1.3) {
    c.drawImage(sunDisc(), sx - rt, sy - rt, rt * 2, rt * 2);
    c.restore();
    L.lightBlob(c, sx, sy, rt * 1.5, [255, 240, 210], 0.35 * a);
    return;
  } else {
    c.fillStyle = 'rgba(255,248,232,1)';
    c.beginPath(); c.arc(sx, sy, 1.7, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ orbits + planets
function drawOrbits(c, v) {
  const lf = v.cam.lf, sx = v.wx(SUN.x), sy = v.wy(SUN.y), inv = 1 / v.cam.mpp;
  c.lineWidth = 1.4;
  for (const p of PLANETS) {
    const R = p.a * AU * inv;
    const kin = p.name === 'EARTH' ? band(lf, 9.42, 9.95) : band(lf, 10.5, 11.2);
    const k = kin * L.clamp((R - 6) / 26);
    if (k <= 0.004) continue;
    c.strokeStyle = p.name === 'EARTH' ? `rgba(120,170,255,${0.36 * k})` : `rgba(160,178,215,${0.24 * k})`;
    c.beginPath();
    if (circlePath(c, sx, sy, R)) c.stroke();
  }
}

function drawPlanets(c, v) {
  const lf = v.cam.lf, sx = v.wx(SUN.x), sy = v.wy(SUN.y), inv = 1 / v.cam.mpp;
  for (const p of PLANETS) {
    const R = p.a * AU * inv;
    const x = v.wx(p.x), y = v.wy(p.y);
    let r = p.px, k = L.clamp((R - 5) / 16);
    if (p.name === 'EARTH') r = Math.max(R_EARTH * inv, p.px);
    r = Math.min(r, Math.max(1.2, R * 0.3));
    if (k <= 0.004) continue;
    const lx = (sx - x) / Math.max(1, R), ly = (sy - y) / Math.max(1, R);
    const glow = p.name === 'EARTH' ? band(lf, 9.5, 10.0) : 1;
    dot(c, x, y, r, p.col, k, lx, ly, glow);
    if (p.ring && R > 30) {
      c.save();
      c.globalAlpha *= k * 0.75;
      c.strokeStyle = L.rgba([235, 220, 180]);
      c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(x, y, r * 2.3, r * 2.0, 0.3, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
  }
  // the Moon beside Earth, only while the Earth–Moon pair is resolvable
  const mk = 1 - L.smoothstep(L.clamp((lf - 10.2) / 0.5));
  if (mk > 0 && lf > 9.3) {
    const mx = v.wx(MOON_POS.x), my = v.wy(MOON_POS.y);
    dot(c, mx, my, Math.max(R_MOON * inv, 1.6), [205, 202, 194], mk, -0.6, 0.8, band(lf, 9.5, 10.0) * 0.6);
  }
}

// ------------------------------------------------------------------ belts and clouds
function drawBelts(c, v) {
  const lf = v.cam.lf, sx = v.wx(SUN.x), sy = v.wy(SUN.y), inv = 1 / v.cam.mpp;
  const rb = 2.75 * AU * inv;
  const tBelt = wordT(v, 14, 2, 'asteroid');
  const kb = reveal(v, tBelt - 0.2, 1.1) * L.clamp((rb - 14) / 30) * Math.pow(L.clamp(rb / 480, 0.08, 1), 0.7);
  cloud(c, sx, sy, inv, BELT, [214, 200, 176], [0.62, 0.45, 0.32, 0.22], rb > 200 ? 1.5 : 1.25, kb);
  const kt = kb * band(lf, 12.0, 12.4);
  cloud(c, sx, sy, inv, TROJANS, [214, 196, 168], [0.4, 0.3, 0.2], 1.25, kt);
  const rk = 42 * AU * inv;
  const tK = wordT(v, 15, 2, 'Neptune') + 1.0;
  const kk = reveal(v, tK, 1.4) * band(lf, 12.5, 12.9) * L.clamp((rk - 12) / 40) * Math.pow(L.clamp(rk / 600, 0.1, 1), 0.6);
  cloud(c, sx, sy, inv, KUIPER, [176, 200, 240], [0.8, 0.6, 0.42], 1.4, kk);
}

function drawOort(c, v) {
  const lf = v.cam.lf;
  const k = reveal(v, ph(v, 17, 1).start - 0.4, 1.6) * band(lf, 14.7, 15.6, 17.0, 17.4);
  if (k <= 0.003) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y), inv = 1 / v.cam.mpp;
  // soft haze: the shell seen through its whole depth
  const R = 105000 * AU * inv;
  if (R < 6000) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, R * 1.12);
    g.addColorStop(0, `rgba(120,150,200,${0.10 * k})`);
    g.addColorStop(0.25, `rgba(110,140,190,${0.07 * k})`);
    g.addColorStop(0.7, `rgba(90,120,170,${0.035 * k})`);
    g.addColorStop(1, 'rgba(90,120,170,0)');
    c.fillStyle = g;
    c.fillRect(sx - R * 1.12, sy - R * 1.12, R * 2.24, R * 2.24);
    c.restore();
  }
  const dens = Math.pow(L.clamp(R / 520, 0.2, 1), 0.5);
  cloud(c, sx, sy, inv, OORT, [196, 212, 238], [0.5, 0.36, 0.25, 0.16].map((x) => x * dens), R > 2000 ? 1.5 : 1.2, k);
}

// ------------------------------------------------------------------ heliopause, Voyager 1
function drawHeliopause(c, v) {
  const lf = v.cam.lf;
  const k = reveal(v, ph(v, 16, 1).start, 1.4) * band(lf, 12.8, 13.25, 14.3, 14.9);
  if (k <= 0.003) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y), inv = 1 / v.cam.mpp;
  const R0 = HELIOPAUSE_AU * AU * inv;
  if (R0 > 2e5 || R0 < 5) return;
  const nose = eclDir(NOSE_LON), na = Math.atan2(nose.y, nose.x);
  c.save();
  c.beginPath();
  for (let i = 0; i <= 180; i++) {
    const a = (i / 180) * Math.PI * 2, ph = a - na;
    const r = R0 * (1 + 0.9 * Math.pow((1 - Math.cos(ph)) / 2, 1.5));
    const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = `rgba(70,110,190,${0.05 * k})`;
  c.fill();
  c.strokeStyle = `rgba(120,170,255,${0.07 * k})`;
  c.lineWidth = 9;
  c.stroke();
  c.strokeStyle = `rgba(150,195,255,${0.34 * k})`;
  c.lineWidth = 1.5;
  c.stroke();
  c.restore();
}

// path length table for the draw-in
const VOY_LEN = (() => {
  const out = [0];
  for (let i = 1; i < VOY_PATH.length; i++) out.push(out[i - 1] + Math.hypot(VOY_PATH[i].x - VOY_PATH[i - 1].x, VOY_PATH[i].y - VOY_PATH[i - 1].y));
  return out;
})();
function drawVoyager(c, v) {
  const lf = v.cam.lf;
  const p = voyProgress(v);
  const k = band(lf, 12.4, 12.9, 14.3, 14.8);
  if (p <= 0 || k <= 0.003) return;
  const total = VOY_LEN[VOY_LEN.length - 1], target = total * Math.pow(p, 0.6);   // log-ish: fast near the Sun
  c.save();
  c.globalAlpha *= k;
  c.lineCap = 'round';
  c.strokeStyle = L.rgba(ACCENT, 0.6);
  c.lineWidth = 1.5;
  c.beginPath();
  let hx = 0, hy = 0;
  for (let i = 0; i < VOY_PATH.length; i++) {
    let q = VOY_PATH[i];
    if (VOY_LEN[i] > target) {
      const a = VOY_PATH[i - 1], u = (target - VOY_LEN[i - 1]) / (VOY_LEN[i] - VOY_LEN[i - 1]);
      q = { x: L.lerp(a.x, q.x, u), y: L.lerp(a.y, q.y, u) };
    }
    hx = v.wx(q.x); hy = v.wy(q.y);
    if (i === 0) c.moveTo(hx, hy); else c.lineTo(hx, hy);
    if (VOY_LEN[i] > target) break;
  }
  c.stroke();
  c.restore();
  // the spacecraft: travelling head during the draw-in, then a marker with a slow ping
  const done = p >= 1;
  const x = done ? v.wx(VOYAGER.x) : hx, y = done ? v.wy(VOYAGER.y) : hy;
  if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
  L.lightBlob(c, x, y, 26, ACCENT, 0.55 * k);
  c.save();
  c.globalAlpha *= k;
  c.fillStyle = 'rgba(235,252,255,1)';
  c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
  if (done && v.gt < backStart(v) - 1) {
    const ph2 = ((v.gt - ph(v, 16, 0).start) * 0.6) % 1;
    c.strokeStyle = L.rgba(ACCENT, 0.6 * (1 - ph2));
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, 6 + 22 * L.ease.outCubic(ph2), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

/** "1 light-day" dashed ring (173 AU), drawn in on its phrase; forward pass only. */
function drawLightDay(c, v) {
  const lf = v.cam.lf;
  if (v.gt >= backStart(v) - 1) return;
  const t0 = ph(v, 16, 2).start;
  const p = L.ease.inOutCubic(L.clamp((v.gt - t0) / 1.3));
  const k = p > 0 ? band(lf, 13.0, 13.3, 14.1, 14.5) : 0;
  if (k <= 0.003) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y), R = LIGHT_DAY_AU * AU / v.cam.mpp;
  if (R < 4 || R > 2900) return;
  const va = Math.atan2(v.wy(VOYAGER.y) - sy, v.wx(VOYAGER.x) - sx);
  c.save();
  c.globalAlpha *= k;
  c.strokeStyle = 'rgba(255,214,150,0.62)';
  c.lineWidth = 1.6;
  c.setLineDash([10, 9]);
  c.lineDashOffset = -v.gt * 6;
  c.beginPath(); c.arc(sx, sy, R, va - Math.PI * p, va + Math.PI * p); c.stroke();
  c.restore();
}

export default {
  draw(c, v) {
    const lf = v.cam.lf;
    if (lf < 9.3 || lf > 17.45) return;
    drawOort(c, v);
    drawHeliopause(c, v);
    drawOrbits(c, v);
    drawBelts(c, v);
    drawLightDay(c, v);
    drawVoyager(c, v);
    drawSun(c, v);
    drawPlanets(c, v);
    if (v.gt < backStart(v) - 1) drawLabels(c, v);
  },
};
