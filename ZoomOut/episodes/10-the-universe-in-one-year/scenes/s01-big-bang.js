// Beat 1 — the Big Bang, Jan 1, midnight. A spark that woke up at the end of the hook charges in
// the first cell and detonates on "Bang": white-hot bloom, a spark burst with drag, two shock
// rings, and a ripple that lights every day cell of the year as it passes. The cell keeps a
// soft starburst for the rest of the film (it is lit again in the final pull-back).
import * as L from '../../../../engine/runtime/lib.js';
import { dayRect, centre } from '../camera.js';
import { ACCENT, ALL_DAYS, HOT, eventLabel, glowCell, ring, sparks, toScreen } from './s00-hook.js';

const { W, H } = L;
const CELL = dayRect(0, 0);                 // Jan 1
const C = centre(CELL);
export const T_BANG = 0.62;                 // beat time of the detonation ("…Big BANG")
const RIPPLE = { reach: 30, dur: 3.4, width: 1.5 };
const CELL_D = ALL_DAYS.map((r) => Math.hypot(r.x + 0.5 - C.x, r.y + 0.5 - C.y));

/** A refined four + four point starburst, centred at (x, y), cell size s px. */
export function starburst(c, x, y, s, k, rot = 0, tw = 1) {
  if (k <= 0 || s < 2) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, x, y, s * 0.55 * tw, ACCENT, 0.55 * k);
  L.lightBlob(c, x, y, s * 0.2, HOT, 0.75 * k);
  c.translate(x, y);
  c.rotate(rot);
  for (let i = 0; i < 8; i++) {
    const len = s * (i % 2 ? 0.2 : 0.42) * tw * k, hw = s * (i % 2 ? 0.016 : 0.026);
    const g = c.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, L.rgba(HOT, 0.95 * k));
    g.addColorStop(0.35, L.rgba(ACCENT, 0.7 * k));
    g.addColorStop(1, L.rgba(ACCENT, 0));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -hw); c.lineTo(len, 0); c.lineTo(0, hw); c.closePath(); c.fill();
    c.rotate(Math.PI / 4);
  }
  c.fillStyle = L.rgba(HOT, k);
  c.beginPath(); c.arc(0, 0, Math.max(0, s * 0.045), 0, Math.PI * 2); c.fill();
  c.restore();
}

/** Persistent presence of the Big Bang cell after the detonation (dims gently over the film). */
function settle(v) {
  const dt = v.t - T_BANG;
  if (dt < 0) return 0;
  const up = L.ease.outCubic(L.clamp(dt / 0.5));
  const down = L.lerp(1, 0.62, L.ease.inOutCubic(L.prog(dt, 2.5, 6)));
  return up * down;
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'Big Bang', sub: '' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: T_BANG - 0.02, name: 'impact', gain: 0.62, pitch: 0.62 },
      { t: T_BANG, name: 'deep', gain: 0.5, pitch: 0.8 },
      { t: T_BANG + 0.06, name: 'bloom', gain: 0.38, pitch: 1.0 },
      { t: T_BANG + 0.5, name: 'shimmer', gain: 0.24, pitch: 1.15 },
      { t: 1.45, name: 'tick', gain: 0.26, pitch: 1.1 },
    ];
  },
  drawWorld(c, v) {
    const t = v.t, dt = t - T_BANG;
    const s = toScreen(v, CELL);
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    const near = cx > -s.w * 6 && cx < W + s.w * 6 && cy > -s.w * 6 && cy < H + s.w * 6;

    // 1) the charge: a spark wakes up at the end of the hook and swells until the bang
    if (t > -1.4 && dt < 0 && near) {
      const k = L.ease.inCubic(L.prog(t, -1.4, 1.4 + T_BANG));
      const fl = 0.85 + 0.15 * L.noise1(v.gt * 9, 3);
      L.lightBlob(c, cx, cy, s.w * (0.35 + 1.1 * k) * fl, ACCENT, (0.25 + 0.6 * k) * fl);
      L.lightBlob(c, cx, cy, s.w * (0.08 + 0.25 * k), HOT, 0.6 + 0.4 * k);
      c.fillStyle = L.rgba(HOT, 0.9);
      c.beginPath(); c.arc(cx, cy, Math.max(0, s.w * (0.02 + 0.03 * k)), 0, Math.PI * 2); c.fill();
    }
    if (dt < 0) return;

    // 2) the ripple lights every cell as it passes (fast, then eases out across the year)
    if (dt < RIPPLE.dur) {
      const e = L.ease.outCubic(dt / RIPPLE.dur);
      const R = RIPPLE.reach * e, fade = 1 - e;
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 1; i < 365; i++) {
        const f = Math.exp(-(((CELL_D[i] - R) / RIPPLE.width) ** 2)) * fade;
        if (f < 0.02) continue;
        const r = toScreen(v, ALL_DAYS[i]);
        if (r.x > W || r.y > H || r.x + r.w < 0 || r.y + r.h < 0) continue;
        const p = r.w * 0.03;
        c.fillStyle = L.rgba(ACCENT, 0.3 * f);
        c.fillRect(r.x + p, r.y + p, r.w - 2 * p, r.h - 2 * p);
        c.strokeStyle = L.rgba(ACCENT, 0.75 * f);
        c.lineWidth = 1.2;
        c.strokeRect(r.x + p, r.y + p, r.w - 2 * p, r.h - 2 * p);
      }
      c.restore();
      ring(c, v, C.x, C.y, dt, { reach: RIPPLE.reach, dur: RIPPLE.dur, width: 2.5, alpha: 0.55 });
      ring(c, v, C.x, C.y, dt - 0.08, { reach: 7, dur: 1.5, width: 2, alpha: 0.7 });
    }
    if (!near && dt > 1.8) return;

    // 3) the detonation: bloom, screen flash, sparks
    if (dt < 2.2) {
      const fb = Math.exp(-dt / 0.32);
      L.lightBlob(c, cx, cy, s.w * (1.5 + 6 * L.ease.outCubic(L.clamp(dt / 1.2))), ACCENT, 0.95 * fb);
      L.lightBlob(c, cx, cy, s.w * 1.2, HOT, Math.exp(-dt / 0.2));
      const fl = 0.18 * Math.exp(-dt / 0.14);
      if (fl > 0.005) {
        c.save(); c.globalCompositeOperation = 'lighter';
        c.fillStyle = L.rgba(L.mix(ACCENT, HOT, 0.5), fl); c.fillRect(0, 0, W, H);
        c.restore();
      }
      sparks(c, v, C.x, C.y, dt, { n: 170, seed: 101, speed: 9, life: 1.7, width: 2.2 });
      sparks(c, v, C.x, C.y, dt, { n: 60, seed: 102, speed: 3, life: 2.0, width: 3, color: HOT });
    }

    // 4) the cell itself keeps its light
    const k = settle(v);
    glowCell(c, v, CELL, k);
    const tw = 1 + 0.08 * Math.sin(v.gt * 2.3) + 0.6 * Math.exp(-dt / 0.4);
    starburst(c, cx, cy, s.w, k, v.gt * 0.12, tw);
  },
  drawOverlay(c, v) {
    eventLabel(c, v, { big: 'JAN 1', small: 'Midnight  ·  13.8 billion years ago', t0: 1.45 });
  },
};
