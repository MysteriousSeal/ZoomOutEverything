// Beat 15 — "Every day, you replace roughly three hundred thirty billion of your own cells."
// The trickle of sparks from beat 14 spreads through the whole glass body (s14 draws them; densest in the blood and the
// gut). On "three hundred thirty billion" the number counts up above the head and locks on "billion" with the reveal's
// biggest hit. A faint warm bloom breathes inside the body as the sparks peak.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, bodyPath } from '../env.js';
import { TT, frameTime } from './s14-strangest.js';

const C0 = TT.three - 0.05;       // the count starts on "three"
const C1 = TT.billion + 0.05;     // ...and locks on "billion"

export default {
  beat: 15,
  chapter: { num: '15', title: 'Renewal', sub: 'cells replaced every day' },
  captions: true,
  layer: 1,
  cues() {
    const b = TT.b15;
    return [
      { t: TT.replace - b - 0.3, name: 'shimmer', gain: 0.22, pitch: 1.0 },
      { t: C0 - b - 0.1, name: 'count', gain: 0.24, pitch: 1.2 },
      { t: C1 - b - 0.5, name: 'riser', gain: 0.16, pitch: 1.1 },
      { t: C1 - b, name: 'impact', gain: 0.5, pitch: 0.85 },
      { t: C1 - b + 0.02, name: 'bloom', gain: 0.4, pitch: 0.9 },
    ];
  },
  drawWorld(c, v) {
    // an inner warmth that swells as the sparks peak, then settles (kept low: the sparks stay the subject)
    const k = L.ease.inOutCubic(L.prog(v.gt, TT.replace, 1.8)) * (1 - 0.5 * L.ease.inOutCubic(L.prog(v.gt, C1 + 0.4, 1.5)))
      * (1 - L.ease.inOutCubic(L.prog(v.gt, TT.b17, 1.0)));
    // the lock: the body visibly "lights" with the number, then settles back over about a second
    const flash = v.gt >= C1 ? Math.exp(-(v.gt - C1) / 0.45) * L.smoothstep(L.clamp((v.gt - C1) / 0.06)) : 0;
    if ((k <= 0.002 && flash <= 0.002) || v.cam.mpp < 3e-4) return;
    const breathe = 0.85 + 0.15 * Math.sin(v.gt * 1.7);
    c.save();
    c.beginPath(); bodyPath(c, v); c.clip();
    c.globalCompositeOperation = 'lighter';
    const x = v.wx(0), y = v.wy(-1.1), r = v.ws(0.75);
    const g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
    g.addColorStop(0, L.rgba(ACCENT, 0.13 * k * breathe)); g.addColorStop(0.6, L.rgba(ACCENT, 0.05 * k)); g.addColorStop(1, L.rgba(ACCENT, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    if (flash > 0.002) {
      const fy = v.wy(-1.05), fr = v.ws(1.1);
      const f = c.createRadialGradient(x, fy, 0, x, fy, Math.max(1, fr));
      f.addColorStop(0, L.rgba(ACCENT, 0.24 * flash)); f.addColorStop(0.5, L.rgba(ACCENT, 0.16 * flash)); f.addColorStop(1, L.rgba(ACCENT, 0.05 * flash));
      c.fillStyle = f; c.fillRect(0, 0, L.W, L.H);
    }
    c.restore();
  },
  drawOverlay(c, v) {
    const gt = v.gt;
    const ck = L.prog(gt, C0, 0.5);
    if (ck <= 0) return;
    const p = L.ease.outQuint(L.prog(frameTime(gt), C0, C1 - C0));
    const n = Math.round(330 * p);
    // the lock: a short flash of the number on "billion"
    const lock = Math.exp(-Math.max(0, gt - C1) * 5) * (gt >= C1 ? 1 : 0);
    L.bigLabel(c, { x: 540, y: 470, big: `${n} BILLION`, small: 'cells replaced every day', k: v.k * ck, accent: ACCENT, align: 'center', size: 122 });
    if (lock > 0.02) L.lightBlob(c, 540, 420, 320, ACCENT, 0.16 * lock * v.k);
  },
};
