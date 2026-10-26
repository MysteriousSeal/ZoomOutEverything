// Beat 14 — "Within weeks, | experts estimate the land would drop below minus eighteen degrees."
// The same street as the opening, now at night and frozen (env: facades, lit windows, roof frost, lamps). This scene
// adds the cold itself: icicles growing under every cornice and lamp arm, feathery frost ferns creeping across the
// road from both kerbs, and ice crystals drifting in the air that glint near the lamps (three parallax depths).
// The focal device is a slim thermometer beside the label: the column drops and the number counts from 12 °C to
// −18 °C, landing on "minus eighteen". The small line ("0 °F · within weeks (estimate)") arrives with the landing.
// Everything here is world-space and stays while the street is frozen (beat 15 glides out over it).
import * as L from '../../../../engine/runtime/lib.js';
import { COAST } from '../camera.js';
import { ACCENT, BUILDINGS, LAMPS, freezeK } from '../env.js';
import { labelBacking } from './s11-six-km.js';

const TAU = Math.PI * 2;
const FROST = [225, 238, 255];
// beat-relative timing (beat 14 starts 56.16; the camera lands on the street ≈ 58.1; "minus eighteen" ≈ 60.2-61.0)
const T_IN = 2.05;                 // label + thermometer enter
const T_DROP = 2.35, D_DROP = 2.15;   // the column falls and the number counts down
const T0 = 12, T1 = -18;
// world growth of the frost / icicles (global time), melting back if the Sun returns (freezeK falls)
const growK = (gt) => Math.min(L.ease.inOutCubic(L.prog(gt, 57.4, 3.6)), L.clamp(freezeK(gt) / 0.75));

// ------------------------------------------------------------------ icicles (precomputed per building, metres)
const ICICLES = (() => {
  const r = L.rng(1414), out = [];
  for (const b of BUILDINGS) {
    for (let x = b.x0 + 0.15; x < b.x1 - 0.1; x += 0.22 + r() * 0.3) {
      out.push({ x, y: -b.h, l: 0.12 + Math.pow(r(), 2.2) * 0.85, w: 0.05 + r() * 0.06, d: r() * 0.5 });
    }
  }
  for (const lx of LAMPS) for (let i = 0; i < 4; i++) out.push({ x: lx + 0.1 + i * 0.22 + r() * 0.08, y: -6.2 + 0.12, l: 0.08 + r() * 0.22, w: 0.03, d: r() * 0.4, lamp: true });
  return out;
})();

// ------------------------------------------------------------------ frost ferns on the road (metres)
// each fern: a stem from a kerb with paired side branches; seg = [x0, y0, x1, y1, startFrac]
const FERNS = (() => {
  const r = L.rng(4141), out = [];
  const grow = (segs, x, y, a, len, depth, s0) => {
    const n = 5;
    let px = x, py = y;
    for (let i = 0; i < n; i++) {
      const l = len / n, nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l;
      const f0 = s0 + (i / n) * (1 - s0) * (depth ? 0.7 : 1);
      segs.push([px, py, nx, ny, f0]);
      if (depth < 2 && i > 0) {
        const bl = len * (0.42 - depth * 0.12) * (1 - i / n * 0.5);
        grow(segs, px, py, a + 1.0 + (r() - 0.5) * 0.3, bl, depth + 1, f0);
        grow(segs, px, py, a - 1.0 + (r() - 0.5) * 0.3, bl, depth + 1, f0);
      }
      a += (r() - 0.5) * 0.25;
      px = nx; py = ny;
    }
  };
  for (let x = -60; x < COAST - 4; x += 0.35 + r() * 0.55) {
    const near = r() < 0.62;                        // from the near kerb (y 0.5 m) down, or the far kerb (8 m) up
    const segs = [];
    const a = (near ? Math.PI / 2 : -Math.PI / 2) + (r() - 0.5) * 1.1;
    grow(segs, x, near ? 0.55 : 7.95, a, 0.8 + r() * r() * 2.8, 0, 0);
    out.push({ x, segs, lag: r() * 0.35 });
  }
  return out;
})();

// ------------------------------------------------------------------ ice crystals in the air (screen space, 3 depths)
const MOTES = (() => { const r = L.rng(1441); return Array.from({ length: 170 }, (_, i) => ({ x: r(), y: r(), z: i % 3, ph: r() * TAU, s: r() })); })();

// ferns + rime are drawn into a scratch layer (fully redrawn every frame), so the caption band can be thinned
let SCR = null;
function scratch() {
  if (!SCR) SCR = new OffscreenCanvas(L.W, L.H);
  const sc = SCR.getContext('2d');
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.globalAlpha = 1; sc.globalCompositeOperation = 'source-over';
  sc.clearRect(0, 0, L.W, L.H);
  return sc;
}
/** Vertical band behind the captions (screen y 1270-1400) with soft edges: alpha profile 0..1. */
function captionBand(c, y0, y1, a, op) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(3,6,14,0)');
  g.addColorStop(0.25, `rgba(3,6,14,${a})`);
  g.addColorStop(0.8, `rgba(3,6,14,${a})`);
  g.addColorStop(1, 'rgba(3,6,14,0)');
  c.save();
  if (op) c.globalCompositeOperation = op;
  c.fillStyle = g; c.fillRect(0, y0, L.W, y1 - y0);
  c.restore();
}

function streetK(v) {
  return 1 - L.smoothstep(L.invLerp(0.25, 0.9, v.cam.mpp));
}

function drawIcicles(c, v, g) {
  const mpp = v.cam.mpp;
  const xL = v.cam.x - (L.W / 2 + 20) * mpp, xR = v.cam.x + (L.W / 2 + 20) * mpp;
  const fr = freezeK(v.gt);
  c.save();
  for (const ic of ICICLES) {
    if (ic.x < xL || ic.x > xR) continue;
    const kk = L.clamp((g - ic.d) / (1 - ic.d));
    if (kk <= 0.01) continue;
    const top = ic.lamp ? ic.y : ic.y + 0.1 + 0.4 * fr;           // under env's frosted cornice
    const len = ic.l * L.ease.outCubic(kk);
    const X = v.wx(ic.x), Y0 = v.wy(top), Y1 = v.wy(top + len), hw = Math.max(0.6, (ic.w / mpp) / 2);
    if (Y1 - Y0 < 1) continue;
    const gr = c.createLinearGradient(0, Y0, 0, Y1);
    gr.addColorStop(0, L.rgba(FROST, 0.9)); gr.addColorStop(1, L.rgba([190, 220, 255], 0.25));
    c.fillStyle = gr;
    c.beginPath(); c.moveTo(X - hw, Y0); c.lineTo(X + hw, Y0); c.lineTo(X + hw * 0.1, Y1); c.closePath(); c.fill();
  }
  c.restore();
}

function drawFerns(c, v, g) {
  const mpp = v.cam.mpp;
  const xL = v.cam.x - (L.W / 2 + 60) * mpp, xR = v.cam.x + (L.W / 2 + 60) * mpp;
  c.save();
  c.strokeStyle = L.rgba(FROST, 0.3);
  c.lineWidth = Math.max(0.8, 0.02 / mpp);
  c.lineCap = 'round';
  c.beginPath();
  for (const f of FERNS) {
    if (f.x < xL || f.x > xR) continue;
    const gg = L.clamp((g - f.lag) / (1 - f.lag));
    if (gg <= 0) continue;
    for (const [x0, y0, x1, y1, s] of f.segs) {
      if (gg <= s) continue;
      const k = L.clamp((gg - s) / 0.18);
      c.moveTo(v.wx(x0), v.wy(y0));
      c.lineTo(v.wx(L.lerp(x0, x1, k)), v.wy(L.lerp(y0, y1, k)));
    }
  }
  c.stroke();
  // a pale rime along both kerbs
  const y0 = v.wy(0.5), y1 = v.wy(8);
  const rg = c.createLinearGradient(0, y0, 0, y0 + 0.9 / mpp);
  rg.addColorStop(0, L.rgba(FROST, 0.3 * g)); rg.addColorStop(1, L.rgba(FROST, 0));
  c.fillStyle = rg; c.fillRect(0, y0, L.W, 0.9 / mpp);
  const rg2 = c.createLinearGradient(0, y1, 0, y1 - 0.7 / mpp);
  rg2.addColorStop(0, L.rgba(FROST, 0.24 * g)); rg2.addColorStop(1, L.rgba(FROST, 0));
  c.fillStyle = rg2; c.fillRect(0, y1 - 0.7 / mpp, L.W, 0.7 / mpp);
  c.restore();
}

function drawMotes(c, v, k) {
  const mpp = v.cam.mpp;
  const lampsS = LAMPS.map((lx) => [v.wx(lx + 0.8), v.wy(-6.0)]).filter(([x]) => x > -200 && x < L.W + 200);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const m of MOTES) {
    const par = [0.35, 0.7, 1.15][m.z];                          // parallax depth
    const size = [0.9, 1.4, 2.3][m.z];
    let x = m.x * (L.W + 200) - 100 - ((v.cam.x / mpp) * par * 0.02) + v.gt * (6 + 10 * m.z) + 26 * L.noise1(v.gt * 0.4 + m.ph, 5);
    let y = m.y * (L.H + 200) - 100 + v.gt * (10 + 14 * m.z) - (v.cam.y / mpp) * par * 0.02;
    x = ((x % (L.W + 200)) + L.W + 200) % (L.W + 200) - 100;
    y = ((y % (L.H + 200)) + L.H + 200) % (L.H + 200) - 100;
    // glint near the lamps
    let lit = 0;
    for (const [lx, ly] of lampsS) lit = Math.max(lit, 1 - L.clamp(Math.hypot(x - lx, y - ly) / 260));
    const tw = 0.5 + 0.5 * Math.sin(v.gt * (2 + m.s * 3) + m.ph);
    const a = k * (0.22 + 0.5 * lit) * (0.4 + 0.6 * tw);
    if (a < 0.02) continue;
    c.fillStyle = L.rgba(L.mix(FROST, [255, 220, 170], lit * 0.5), a);
    c.beginPath(); c.arc(x, y, Math.max(0, size * (0.8 + 0.4 * tw)), 0, TAU); c.fill();
    if (lit > 0.4 && m.z === 2 && tw > 0.8) {                    // a tiny cross glint
      c.strokeStyle = L.rgba([255, 245, 230], a * 0.8);
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + 6, y); c.moveTo(x, y - 6); c.lineTo(x, y + 6); c.stroke();
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ the thermometer (screen space)
const tempAt = (t) => L.lerp(T0, T1, L.ease.inOutCubic(L.prog(t, T_DROP, D_DROP)));
function thermometer(c, x, yTop, yBot, temp, k) {
  const tw = 16, br = 19;
  const yOf = (T) => L.lerp(yBot - br - 8, yTop + 10, L.invLerp(-30, 20, T));
  const col = L.mix([150, 210, 255], [255, 160, 110], L.clamp(L.invLerp(-18, 12, temp)));
  c.save();
  c.globalAlpha = k;
  // glass
  c.fillStyle = 'rgba(10,14,26,0.65)';
  L.roundRect(c, x - tw / 2, yTop, tw, yBot - yTop - br, tw / 2); c.fill();
  c.beginPath(); c.arc(x, yBot - br + 4, br, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(220,230,250,0.6)';
  c.lineWidth = 1.5;
  L.roundRect(c, x - tw / 2, yTop, tw, yBot - yTop - br, tw / 2); c.stroke();
  c.beginPath(); c.arc(x, yBot - br + 4, br, 0, TAU); c.stroke();
  // column + bulb
  c.fillStyle = L.rgba(col);
  const yc = yOf(temp);
  L.roundRect(c, x - 4, yc, 8, yBot - br - yc + 4, 4); c.fill();
  c.beginPath(); c.arc(x, yBot - br + 4, br - 5, 0, TAU); c.fill();
  L.lightBlob(c, x, yBot - br + 4, 40, col, 0.35);
  L.lightBlob(c, x, yc, 22, col, 0.4);
  // ticks every 10 °C, the freezing point longer and brighter
  for (let T = -30; T <= 20; T += 10) {
    const y = yOf(T), z = T === 0;
    c.strokeStyle = z ? 'rgba(240,246,255,0.95)' : 'rgba(200,210,230,0.55)';
    c.lineWidth = z ? 2.5 : 1.5;
    c.beginPath(); c.moveTo(x + tw / 2 + 4, y); c.lineTo(x + tw / 2 + (z ? 22 : 12), y); c.stroke();
  }
  // the −18 mark: an accent notch that lights up when the column reaches it
  const y18 = yOf(T1), hit = L.clamp((T0 - temp) / (T0 - T1) * 1.02 - 0.02);
  c.strokeStyle = L.rgba(ACCENT, 0.4 + 0.6 * Math.pow(hit, 6));
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(x - tw / 2 - 16, y18); c.lineTo(x - tw / 2 - 4, y18); c.stroke();
  c.restore();
}

export default {
  beat: 14,
  chapter: { num: '14', title: 'Frozen', sub: 'land temperatures, expert estimate' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: 1.5, name: 'creak', gain: 0.2, pitch: 0.9 },
      { t: T_IN, name: 'blip', gain: 0.14, pitch: 1.2 },
      { t: T_DROP, name: 'count', gain: 0.16, pitch: 0.8 },
      { t: T_DROP + D_DROP - 0.03, name: 'impact', gain: 0.32, pitch: 0.7 },
      { t: T_DROP + D_DROP + 0.05, name: 'shimmer', gain: 0.16, pitch: 1.3 },
    ];
  },
  drawWorld(c, v) {
    if (v.gt < 56.5 || v.gt > 74) return;
    const sk = streetK(v);
    if (sk <= 0.002) return;
    const g = growK(v.gt);
    if (g <= 0.002) return;
    // ferns + kerb rime: thinned to ~40 % behind the caption line
    const sc = scratch();
    drawFerns(sc, v, g);
    captionBand(sc, 1225, 1440, 0.6, 'destination-out');
    c.save();
    c.globalAlpha = sk;
    c.drawImage(SCR, 0, 0);
    drawIcicles(c, v, g);
    c.restore();
    // a soft dark band on the street behind the captions
    captionBand(c, 1240, 1430, 0.5 * sk * L.smoothstep(L.clamp(g * 3)));
    drawMotes(c, v, sk * g * (v.cam.mpp < 0.2 ? 1 : 0.6));
  },
  drawOverlay(c, v) {
    const t = v.t;
    const kl = v.k * L.enter(t, T_IN, 0.6);
    if (kl <= 0.002) return;
    const temp = tempAt(t);
    const n = Math.round(temp);
    const big = `${n < 0 ? '−' : ''}${Math.abs(n)} °C`;
    labelBacking(c, 50, 330, 780, 330, 0.5 * kl);
    thermometer(c, 112, 372, 640, temp, kl);
    L.bigLabel(c, { x: 176, y: 500, big, small: '', k: kl, accent: ACCENT, size: 116 });
    // the small line lands with the number
    const ks = v.k * L.enter(t, T_DROP + D_DROP - 0.1, 0.5);
    if (ks > 0.002) {
      c.save();
      c.globalAlpha = ks;
      c.shadowColor = 'rgba(0,0,0,0.55)';
      c.shadowBlur = 8;
      c.font = L.font(30, 600, L.FONT.body);
      c.fillStyle = 'rgba(205,215,230,0.95)';
      c.textBaseline = 'alphabetic';
      L.trackedText(c, '0 °F · WITHIN WEEKS (ESTIMATE)', 176, 552 + (1 - L.ease.outCubic(ks)) * 18, 3);
      c.restore();
    }
    // a frost bloom on the number when it lands
    const pf = L.prog(t, T_DROP + D_DROP, 0.9);
    if (pf > 0 && pf < 1) L.lightBlob(c, 300, 460, 260, [200, 225, 255], 0.22 * (1 - pf));
  },
};
