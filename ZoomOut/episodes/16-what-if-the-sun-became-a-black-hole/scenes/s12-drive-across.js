// Beat 12 — "The whole Sun, | in a ball you could drive across in minutes."
// "The whole Sun,": a warm ghost of the Sun's surface closes in from beyond the frame and is swallowed by the photon
//   ring (a single bright pulse): all of that mass, in this ball.
// "in a ball you could drive across in minutes": s11's diameter becomes a road with kilometre posts; a car (a warm
//   headlight with a light trail) crosses the horizon at 90 km/h while a small trip timer runs (5.9 km / 90 km/h
//   ≈ 3 min 56 s). On arrival the timer hands over to the label "≈ 4 min".
// The hole, lensed stars and city plate are s11's (they stay until the fly-out in beat 13).
import * as L from '../../../../engine/runtime/lib.js';
import { RS, SUN } from '../camera.js';
import { ACCENT } from '../env.js';
import { drawHole, labelBacking, setK } from './s11-six-km.js';

const TAU = Math.PI * 2;
const WARM = [255, 214, 160];
// beat-relative timing (beat 12 starts 47.76; phrases 47.91-48.75 / 49.35-51.62)
const T_SUN = 0.1, D_SUN = 0.95;             // the Sun's surface closes in, hits the photon ring at T_SUN + D_SUN
const T_ROAD = 1.25, D_ROAD = 0.5;           // road dressing (km posts) appears
const T_CAR = 1.62, D_CAR = 1.55;            // the drive
const T_LABEL = 3.0;
const TRIP_S = (2 * RS) / (90 / 3.6);        // ≈ 236 s at 90 km/h

const carK = (t) => {
  const p = L.prog(t, T_CAR, D_CAR);
  return 0.5 - 0.5 * Math.cos(Math.PI * p);  // ease in-out sine: pulls away, cruises, brakes
};

export default {
  beat: 12,
  chapter: { num: '12', title: 'A short drive', sub: 'the whole Sun, in minutes' },
  captions: true,
  layer: 2,
  cues() {
    return [
      { t: T_SUN - 0.05, name: 'swell', gain: 0.22, pitch: 0.8 },
      { t: T_SUN + D_SUN - 0.02, name: 'impact', gain: 0.3, pitch: 0.75 },
      { t: T_ROAD, name: 'tick', gain: 0.12, pitch: 1.4 },
      { t: T_CAR, name: 'swish', gain: 0.2, pitch: 0.9 },
      { t: T_CAR + 0.25, name: 'count', gain: 0.12, pitch: 1.0 },
      { t: T_CAR + D_CAR - 0.02, name: 'ping', gain: 0.24, pitch: 1.1 },
    ];
  },
  drawWorld(c, v) {
    const k = setK(v);
    if (k <= 0.002 || v.t < -0.2) return;
    const t = v.t;
    const cx = v.wx(SUN.x), cy = v.wy(SUN.y), r = RS / v.cam.mpp, rp = 1.5 * r;
    // ---- the Sun's surface closing in (screen radius from beyond the frame to the photon ring)
    const ps = L.prog(t, T_SUN, D_SUN);
    if (ps > 0 && ps < 1) {
      const e = L.ease.inCubic(ps);
      const R = L.lerp(1150, rp, e);
      const a = k * L.smoothstep(L.clamp(ps * 3)) * (0.75 + 0.25 * e);
      c.save();
      c.globalCompositeOperation = 'lighter';
      const band = L.lerp(140, 18, e);
      const g = c.createRadialGradient(cx, cy, Math.max(0, R - 2), cx, cy, R + band);
      g.addColorStop(0, L.rgba(WARM, 0.5 * a)); g.addColorStop(1, 'rgba(255,200,140,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(cx, cy, R + band, 0, TAU); c.arc(cx, cy, Math.max(0, R - 2), 0, TAU, true); c.fill();
      // the Sun's body, shrinking: a warm wash inside its surface
      const bg = c.createRadialGradient(cx, cy, rp, cx, cy, R);
      bg.addColorStop(0, L.rgba(WARM, 0.02 * a)); bg.addColorStop(1, L.rgba(WARM, 0.13 * a));
      c.fillStyle = bg;
      c.beginPath(); c.arc(cx, cy, Math.max(0, R), 0, TAU); c.arc(cx, cy, rp, 0, TAU, true); c.fill();
      c.strokeStyle = L.rgba([255, 236, 210], 0.9 * a);
      c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, Math.max(0, R), 0, TAU); c.stroke();
      c.restore();
    }
    // the pulse when it is swallowed: the photon ring flares, a soft ring breathes out and fades
    const pf = L.prog(t, T_SUN + D_SUN, 1.1);
    if (pf > 0 && pf < 1) {
      const flash = Math.pow(1 - pf, 2);
      drawHole(c, v, k, flash);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = L.rgba(L.mix(ACCENT, WARM, 0.4), 0.45 * (1 - pf) * k);
      c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, rp * (1 + 0.5 * L.ease.outCubic(pf)), 0, TAU); c.stroke();
      c.restore();
    }
    // ---- the road: kilometre posts along the diameter (s11 draws the line itself)
    const kr = k * L.ease.outCubic(L.prog(t, T_ROAD, D_ROAD));
    const p = carK(t);
    if (kr > 0.002) {
      c.save();
      // lane dashes running across the disc
      c.strokeStyle = L.rgba([235, 226, 255], 0.35 * kr);
      c.lineWidth = 1.2;
      c.setLineDash([6, 9]);
      c.beginPath(); c.moveTo(cx - r, cy - 9); c.lineTo(cx + r, cy - 9); c.moveTo(cx - r, cy + 9); c.lineTo(cx + r, cy + 9); c.stroke();
      c.setLineDash([]);
      for (let i = 1; i <= 5; i++) {
        const x = cx - r + (i * 1000) / v.cam.mpp;
        const ki = L.ease.outBack(L.prog(t, T_ROAD + i * 0.06, 0.4));
        const passed = p * 2 * RS >= i * 1000;
        const hot = passed ? 1 - L.prog(t, T_CAR + D_CAR * (i / 5.9), 0.6) : 0;   // flashes as the car passes
        c.strokeStyle = L.rgba(L.mix([200, 190, 240], [255, 240, 220], hot), (0.6 + 0.4 * hot) * kr);
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, cy - 7 * ki); c.lineTo(x, cy + 7 * ki); c.stroke();
      }
      c.restore();
    }
    // ---- the car: a headlight with a light trail
    if (t > T_CAR - 0.3) {
      // parked after arrival: the headlight and trail dim so the label is the only focal point
      const park = 1 - 0.7 * L.ease.inOutCubic(L.prog(t, T_CAR + D_CAR + 0.2, 0.6));
      const kc = k * L.ease.outCubic(L.prog(t, T_CAR - 0.3, 0.3)) * park;
      const x0 = cx - r, x = cx - r + 2 * r * p;
      c.save();
      c.globalCompositeOperation = 'lighter';
      if (x - x0 > 1) {
        const tg = c.createLinearGradient(x0, 0, x, 0);
        tg.addColorStop(0, L.rgba(ACCENT, 0.0));
        tg.addColorStop(0.6, L.rgba(ACCENT, 0.35 * kc));
        tg.addColorStop(1, L.rgba(WARM, 0.9 * kc));
        c.strokeStyle = tg;
        c.lineWidth = 4;
        c.lineCap = 'round';
        c.beginPath(); c.moveTo(x0, cy); c.lineTo(x, cy); c.stroke();
      }
      L.lightBlob(c, x, cy, 46, WARM, 0.55 * kc);
      L.lightBlob(c, x + 14, cy, 30, [255, 246, 230], 0.35 * kc);   // the beam reaching ahead
      c.fillStyle = L.rgba([255, 250, 240], kc);
      c.beginPath(); c.arc(x, cy, 5, 0, TAU); c.fill();
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const t = v.t;
    const cx = v.wx(SUN.x), cy = v.wy(SUN.y), r = RS / v.cam.mpp;
    // trip timer riding above the car; it hands over to the label on arrival
    const p = carK(t);
    const kt = v.k * L.enter(t, T_CAR - 0.2, 0.35) * (1 - L.ease.inCubic(L.prog(t, T_LABEL + 0.1, 0.35)));
    if (kt > 0.002) {
      const s = Math.round(p * TRIP_S);
      const str = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const x = cx - r + 2 * r * p;
      c.save();
      c.globalAlpha = kt;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(0,0,0,0.7)';
      c.shadowBlur = 10;
      c.font = L.font(40, 700, L.FONT.din);
      c.fillStyle = '#fff';
      c.fillText(str, x, cy - 34);
      c.restore();
    }
    const kl = v.k * L.enter(t, T_LABEL, 0.6);
    if (kl > 0.002) {
      labelBacking(c, 70, 300, 700, 180, 0.42 * kl);
      L.bigLabel(c, { x: 96, y: 410, big: '≈ 4 min', small: 'across it at 90 km/h · 55 mph', k: kl, accent: ACCENT, size: 100 });
    }
  },
};
