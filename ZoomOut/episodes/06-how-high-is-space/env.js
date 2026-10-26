// Environment for "How High Is Space, Really?". Owned by the orchestrator — builders: read, don't edit.
// Sky that darkens with altitude, stars above ~40 km, the curved ground (a circle of radius R), altitude gauge + HUD.
import * as L from '../../../engine/runtime/lib.js';
import { beatCues, scaleBar, stars, topBar } from '../../../engine/runtime/kit.js';
import { R_EARTH, KEYS, SUBJECT } from './camera.js';
import { drawPlanet } from './planet.js';

const { W, H } = L;
export const ACCENT = [150, 170, 255];
export { R_EARTH };

// sky colour by altitude (m)
const SKY = [[0, [150, 200, 240]], [2000, [110, 170, 235]], [10000, [55, 105, 200]], [20000, [25, 50, 125]],
  [35000, [10, 18, 55]], [60000, [4, 6, 20]], [100000, [2, 3, 10]]];
export const skyColor = (alt) => L.ramp(SKY, alt);
export const starK = (alt) => L.clamp(L.invLerp(35000, 90000, alt));

export function drawBackground(c, v) {
  const altAt = (sy) => -(v.cam.y + (sy - H * v.cam.anchor) * v.cam.mpp);
  // far out (globe view) the background is space, not sky
  const farBg = L.clamp(L.invLerp(Math.log(600), Math.log(4000), Math.log(v.cam.mpp)));
  c.fillStyle = '#020309';
  c.fillRect(0, 0, W, H);
  if (farBg < 1) {
    const g = c.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, L.rgba(skyColor(Math.max(0, altAt((H * i) / 12)))));
    c.save(); c.globalAlpha = 1 - farBg; c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  stars(c, v, Math.max(starK(altAt(H * 0.3)), farBg));
  // the ground. Low down: a meadow (beat 0), then New York harbour water with a hazy far shore (beats 1-3); from
  // Everest up: the real Earth (earth.js) seen edge-on under the horizon, with clouds, haze and the limb glow
  const cy = v.wy(R_EARTH), r = v.ws(R_EARTH), y0 = cy - r;
  if (y0 < H + 50) {
    const lm = Math.log(v.cam.mpp);
    const kEarth = L.smoothstep(L.invLerp(Math.log(2.5), Math.log(9), lm));
    if (kEarth < 1) drawLowGround(c, v, y0, 1 - L.smoothstep(L.invLerp(Math.log(0.012), Math.log(0.06), lm)));
    if (kEarth > 0) {
      const glow = L.clamp(L.invLerp(Math.log(25), Math.log(160), lm)) * (1 - L.clamp(L.invLerp(Math.log(1100), Math.log(1750), lm)));
      drawPlanet(c, v, { alpha: kEarth, glow });
    }
  }
}

// ------------------------------------------------------------------ low-altitude ground (screen space, flat horizon)
const SKYLINE = (() => {
  const r = L.rng(6611), out = [];
  for (let x = -60; x < W + 160;) {
    const w = L.lerp(5, 22, r()), cluster = 0.5 + 0.5 * Math.sin(x * 0.011 + 1.3);
    out.push([x, w, L.lerp(3, 10, r()) + cluster * cluster * L.lerp(6, 34, r() * r())]);
    x += w + (r() < 0.25 ? L.lerp(8, 40, r()) : 0.5);
  }
  return out;
})();
const GLINTS = (() => { const r = L.rng(6612); return Array.from({ length: 46 }, () => [r(), r(), r()]); })();
const BLADES = (() => { const r = L.rng(6613); return Array.from({ length: 70 }, () => [r() * (W + 80) - 40, r(), r(), r()]); })();

function drawLowGround(c, v, y0, kGrass) {
  const yh = Math.max(-10, y0);
  if (yh > H) return;
  const depth = H - yh;
  c.save();
  // distant far shore + skyline on the horizon (hazy, behind every landmark), drifting a little with the camera
  const drift = -v.cam.x * 0.02;
  c.fillStyle = L.rgba(L.mix([120, 146, 176], [96, 128, 120], kGrass), 0.55);
  c.beginPath();
  c.moveTo(-20, y0 + 1);
  for (const [x, w, h] of SKYLINE) { const xx = x + drift; c.lineTo(xx, y0 - h * (1 - 0.6 * kGrass)); c.lineTo(xx + w, y0 - h * (1 - 0.6 * kGrass)); }
  c.lineTo(W + 20, y0 + 1);
  c.closePath();
  c.fill();
  // water (harbour) and meadow, cross-faded
  const wg = c.createLinearGradient(0, yh, 0, H);
  wg.addColorStop(0, 'rgb(150,176,198)');
  wg.addColorStop(Math.min(1, 26 / depth), 'rgb(98,132,160)');
  wg.addColorStop(Math.min(1, 220 / depth), 'rgb(46,80,110)');
  wg.addColorStop(1, 'rgb(14,30,48)');
  const gg = c.createLinearGradient(0, yh, 0, H);
  gg.addColorStop(0, 'rgb(150,170,120)');
  gg.addColorStop(Math.min(1, 30 / depth), 'rgb(92,120,70)');
  gg.addColorStop(Math.min(1, 260 / depth), 'rgb(48,72,40)');
  gg.addColorStop(1, 'rgb(18,30,20)');
  if (kGrass < 1) { c.fillStyle = wg; c.fillRect(-10, yh, W + 20, H - yh + 10); }
  if (kGrass > 0) { c.globalAlpha = kGrass; c.fillStyle = gg; c.fillRect(-10, yh, W + 20, H - yh + 10); c.globalAlpha = 1; }
  // water: perspective ripple glints (rows get wider and further apart toward the viewer) + a soft sun glitter path
  if (kGrass < 1) {
    c.globalAlpha = 1 - kGrass;
    const sunX = 300;
    for (let j = 0; j < GLINTS.length; j++) {
      const [a, b, s] = GLINTS[j];
      const y = y0 + 4 + 1.4 * Math.pow(j, 1.62);
      if (y > H) break;
      if (y < -4) continue;
      const pz = (y - y0) / 600;                   // nearer = bigger
      const len = 6 + 120 * pz * (0.5 + b);
      const span = W + 300;
      const x = (((a * span + v.gt * (8 + 30 * pz) * (s > 0.5 ? 1 : -0.6) + drift * (1 + 8 * pz)) % span) + span) % span - 150;
      const near = Math.abs(x - sunX) < 60 + 160 * pz;
      c.fillStyle = `rgba(235,245,255,${(near ? 0.5 : 0.16) * (0.6 + 0.4 * Math.sin(v.gt * 2 + j))})`;
      c.fillRect(x, y, len, Math.max(1, 1 + 2.5 * pz));
      c.fillRect(x + len * 1.6 + 30 * b, y + 1, len * 0.5, Math.max(1, 1 + 2 * pz));
    }
    c.globalAlpha = 1;
  }
  // meadow: soft perspective bands + a few dark foreground blades (depth)
  if (kGrass > 0) {
    c.globalAlpha = kGrass;
    for (let j = 0; j < 22; j++) {
      const y = y0 + 3 + 1.3 * Math.pow(j, 1.75);
      if (y > H) break;
      c.fillStyle = j % 2 ? 'rgba(170,200,130,0.07)' : 'rgba(10,20,10,0.08)';
      c.fillRect(-10, y, W + 20, 1 + 0.9 * j);
    }
    c.lineCap = 'round';
    for (const [x, ph, tone, hh] of BLADES) {
      const base = H + 10, len = 90 + 220 * hh;
      const sway = 18 * Math.sin(v.gt * 1.3 + ph * 6.3) + (ph - 0.5) * 60;
      c.strokeStyle = L.rgba(L.mix([12, 22, 14], [40, 62, 36], tone), 0.9);
      c.lineWidth = 4 + 6 * (1 - tone);
      c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + sway * 0.3, base - len * 0.6, x + sway, base - len); c.stroke();
    }
    c.globalAlpha = 1;
  }
  // a crisp horizon line with a little haze above it
  const hz = c.createLinearGradient(0, y0 - 40, 0, y0 + 2);
  hz.addColorStop(0, 'rgba(220,232,245,0)');
  hz.addColorStop(1, 'rgba(220,232,245,0.35)');
  c.fillStyle = hz;
  c.fillRect(-10, y0 - 40, W + 20, 42);
  c.restore();
}
export function drawForeground() {}

// ------------------------------------------------------------------ HUD: altitude gauge + readout
const NICE = [1, 2, 5];
function tickStep(mpp) { const t = mpp * 220, p = Math.pow(10, Math.floor(Math.log10(t))); for (const n of NICE) if (n * p >= t) return n * p; return 10 * p; }
const fmtAlt = (m) => (m < 1000 ? `${L.fmt(m)} m` : `${L.fmt(m / 1000, m < 10000 ? 1 : 0)} km`);
// the big readout: metres up to 10 km (so Everest reads 8,849 m like its label), whole km above
const fmtRead = (m) => (m < 10 ? `${L.fmt(m, 1)} m` : m < 10000 ? `${L.fmt(m)} m` : `${L.fmt(m / 1000)} km`);

/** The current beat SUBJECT's altitude: counts up from the previous subject over the camera travel, then holds. */
export function subjectAlt(v) {
  const sc = v.tl.scenes;
  let b = 0;
  sc.forEach((s, i) => { if (s.start <= v.gt) b = i; });
  b = Math.min(b, SUBJECT.length - 1);
  if (b === 0) return SUBJECT[0];
  const k = L.ease.inOutCubic(L.prog(v.gt - sc[b].start, -0.05, Math.max(0.3, KEYS[b].travel)));
  const a = SUBJECT[b - 1], z = SUBJECT[b];
  // count in log space for the big jumps so the digits climb at an even pace
  return z / a > 3 ? Math.exp(L.lerp(Math.log(a), Math.log(z), k)) : L.lerp(a, z, k);
}

export function drawHud(c, v) {
  topBar(c, v, ACCENT);
  const globe = L.clamp(L.invLerp(Math.log(800), Math.log(5000), Math.log(v.cam.mpp)));
  // gauge + readout leave on the globe pull-back before the centre drops below ground (mpp ~1000) and before the
  // scale bar arrives (mpp 800): the two never share a frame
  const out = L.clamp(L.invLerp(Math.log(460), Math.log(720), Math.log(v.cam.mpp)));
  const gk = L.ease.outCubic(L.prog(v.gt, 1.6, 0.8)) * (1 - L.ease.inOutCubic(out));
  if (gk > 0) {
    const gx = 40, top = 330, bot = 1200;
    const altAt = (sy) => -(v.cam.y + (sy - H * v.cam.anchor) * v.cam.mpp);
    c.save();
    c.globalAlpha = gk;
    c.strokeStyle = 'rgba(240,245,255,0.5)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(gx, top); c.lineTo(gx, bot); c.stroke();
    const step = tickStep(v.cam.mpp);
    c.font = L.font(22, 600, L.FONT.body);
    c.textBaseline = 'middle';
    // soft dark halo so tick labels stay legible over the mountains / bright sky
    c.shadowColor = 'rgba(4,10,28,0.75)';
    c.shadowBlur = 8;
    for (let a = Math.ceil(altAt(bot) / step) * step; a <= altAt(top); a += step) {
      if (a < 0) continue;
      const y = v.wy(-a);
      c.globalAlpha = gk * L.clamp(Math.min(y - top, bot - y) / 60);
      c.fillStyle = 'rgba(240,245,255,0.85)';
      c.fillRect(gx, y - 1, 16, 2);
      c.fillText(fmtAlt(a), gx + 24, y);
    }
    c.restore();
    const cur = subjectAlt(v);
    c.save();
    c.globalAlpha = gk;
    c.shadowColor = 'rgba(4,10,28,0.55)';
    c.shadowBlur = 14;
    c.textAlign = 'right';
    c.font = L.font(64, 700, L.FONT.din);
    c.fillStyle = '#fff';
    c.fillText(fmtRead(cur < 10 ? cur : Math.round(cur)), W - 64, 300);
    c.font = L.font(22, 600, L.FONT.body);
    c.fillStyle = 'rgba(220,228,240,0.85)';
    L.trackedText(c, `${L.fmt(Math.round(L.mToFt(cur)))} FT  ·  ALTITUDE`, W - 64, 334, 2, 'right');
    c.restore();
  }
  scaleBar(c, v, { k: globe });
}
export const cues = (tl) => beatCues(tl, { gain: 0.18, pitch: 1.1 });
