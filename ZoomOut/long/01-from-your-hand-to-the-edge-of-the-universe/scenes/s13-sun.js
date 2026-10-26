// Beat 13: The Sun. | A hundred and fifty million kilometers away. | Its light takes about eight minutes to reach us.
// Builder C. The layer brings the Sun in; this scene adds the Sun–Earth distance and a light pulse (a true-scale
// spherical wavefront leaving the Sun) that reaches Earth as the clock locks at 8 min 20 s (sped up, labelled).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK } from '../world.js';
import { AU, SUN } from '../camera.js';
import { ph, cueT } from '../layers/c-data.js';
import { textH, SUBCOL } from '../layers/c-draw.js';

const GOLD = [255, 214, 150];
const pulseT = (v) => { const p = ph(v, 13, 2); return [p.start + 0.15, p.end - 0.05]; };

export default {
  beat: 13,
  chapter: { num: '07', title: "The Sun", sub: "150 million km away" },
  cues(d) {
    // times relative to the beat start; the pulse is placed from the phrases in build/timeline.json at cue time
    return [
      { t: cueT(13, 1, 0.25, 2.0), name: 'bloom', gain: 0.26, pitch: 0.9 },
      { t: cueT(13, 2, 0, 4.6) + 0.15, name: 'shimmer', gain: 0.18, pitch: 1.1 },
      { t: cueT(13, 2, 1, 7.0) - 0.05, name: 'ping', gain: 0.22, pitch: 1.2 },
    ];
  },
  drawWorld(c, v) {
    const [t0, t1] = pulseT(v);
    const gt = v.gt;
    if (gt < t0 || gt > t1 + 1.6 || gt > v.tl.scenes[14].start + 1) return;
    const p = (gt - t0) / (t1 - t0);                 // 1 = reached Earth (1 AU)
    const sx = v.wx(SUN.x), sy = v.wy(SUN.y), ex = v.wx(0), ey = v.wy(0);
    const R = p * AU / v.cam.mpp;
    const fade = 1 - L.smoothstep(L.clamp((p - 1) / 0.35));
    c.save();
    c.globalCompositeOperation = 'lighter';
    if (fade > 0 && R > 1 && R < 3000) {
      const kin = L.clamp(p * 8);
      c.strokeStyle = L.rgba(GOLD, 0.07 * fade * kin); c.lineWidth = 14;
      c.beginPath(); c.arc(sx, sy, R, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = L.rgba(GOLD, 0.55 * fade * kin); c.lineWidth = 1.8;
      c.beginPath(); c.arc(sx, sy, R, 0, Math.PI * 2); c.stroke();
      // the ray toward Earth, filling behind the wavefront
      const q = Math.min(1, p);
      const g = c.createLinearGradient(sx, sy, L.lerp(sx, ex, q), L.lerp(sy, ey, q));
      g.addColorStop(0, L.rgba(GOLD, 0.05 * fade));
      g.addColorStop(1, L.rgba(GOLD, 0.6 * fade));
      c.strokeStyle = g; c.lineWidth = 2;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(L.lerp(sx, ex, q), L.lerp(sy, ey, q)); c.stroke();
    }
    // arrival at Earth
    const age = gt - t1;
    if (age > 0 && age < 1.5) {
      L.lightBlob(c, ex, ey, 34 + 90 * age, [190, 220, 255], 0.6 * Math.exp(-age * 3.5));
      L.lightBlob(c, ex, ey, 24, GOLD, 0.9 * Math.exp(-age * 5));
      c.strokeStyle = L.rgba(GOLD, 0.7 * (1 - age / 1.5));
      c.lineWidth = 1.8;
      c.beginPath(); c.arc(ex, ey, 8 + 60 * L.ease.outCubic(age / 1.5), 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const gt = v.gt;
    const sx = v.wx(SUN.x), sy = v.wy(SUN.y), ex = v.wx(0), ey = v.wy(0);
    // ---- 150 MILLION KM: a dimension line parallel to the Sun–Earth line (below it)
    const kd = v.k * L.enter(gt, ph(v, 13, 1).start + 1.0, 0.8);
    const len = Math.hypot(ex - sx, ey - sy);
    if (kd > 0.004 && len > 120) {
      const ux = (ex - sx) / len, uy = (ey - sy) / len, nx = -uy, ny = ux;
      const off = 30, a0 = 34, a1 = len - 12;
      const e = L.ease.inOutCubic(L.clamp(kd * 1.3));
      const mid = (a0 + a1) / 2, h = (a1 - a0) / 2 * e;
      const p0 = { x: sx + ux * (mid - h) + nx * off, y: sy + uy * (mid - h) + ny * off };
      const p1 = { x: sx + ux * (mid + h) + nx * off, y: sy + uy * (mid + h) + ny * off };
      c.save();
      c.globalAlpha *= kd;
      c.strokeStyle = 'rgba(225,232,245,0.7)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y);
      for (const q of [p0, p1]) { c.moveTo(q.x - nx * 7, q.y - ny * 7); c.lineTo(q.x + nx * 7, q.y + ny * 7); }
      c.stroke();
      c.translate(sx + ux * mid + nx * (off + 26), sy + uy * mid + ny * (off + 26));
      c.rotate(Math.atan2(uy, ux));
      const ta = L.clamp(kd * 1.6 - 0.6);
      textH(c, '150 MILLION KM', 0, 0, { size: 24, align: 'center', col: INK, a: ta });
      textH(c, '= 1 ASTRONOMICAL UNIT (AU)', 0, 25, { size: 16, weight: 600, track: 1.5, align: 'center', col: SUBCOL, a: ta });
      c.restore();
    }
    // ---- light-travel clock (sped up), locks at 8 min 20 s when the wavefront reaches Earth
    const [t0, t1] = pulseT(v);
    const kc = v.k * L.enter(gt, t0 - 0.5, 0.5);
    if (kc > 0.004) {
      const tq = Math.round(gt * 30) / 30;            // same digits in every motion-blur sub-frame
      const sec = Math.floor(500 * L.clamp((tq - t0) / (t1 - t0)) + 1e-6);
      const done = tq >= t1;
      const txt = `${Math.floor(sec / 60)} MIN ${String(sec % 60).padStart(2, '0')} S`;
      const x = 150, y = 540;
      textH(c, 'LIGHT TRAVEL TIME', x, y - 62, { size: 18, track: 4, col: ACCENT, a: kc });
      const lock = done ? Math.exp(-(tq - t1) * 4) : 0;
      textH(c, txt, x, y, { size: 76, weight: 800, family: L.FONT.display, track: 1, col: L.mix(INK, GOLD, 0.35 + 0.5 * lock), a: kc });
      textH(c, 'SUN → EARTH · SPED UP', x, y + 52, { size: 16, weight: 600, track: 2, col: SUBCOL, a: kc });
    }
  },
};
