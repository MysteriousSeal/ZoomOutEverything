// Beat 2 — one day ≈ 38 million years. The centre cell of January (Jan 18) lifts off the page
// like a card, casts a shadow, and a sweep of light runs across its 24 hour ticks while the
// big number lands above it. The card settles back into the grid before the next beat.
import * as L from '../../../../engine/runtime/lib.js';
import { dayRect, centre } from '../camera.js';
import { ACCENT, HOT, eventLabel, toScreen } from './s00-hook.js';

const CELL = dayRect(0, 17);                 // Jan 18: the centre of the January block
const C = centre(CELL);
const T_LIFT = 0.32, T_NUM = 1.42, SWEEP = [1.0, 2.4];

const liftK = (t, d) => L.ease.outBack(L.prog(t, T_LIFT, 0.75), 1.2) * (1 - L.ease.inOutCubic(L.prog(t, d - 0.75, 0.6)));

function card(c, v, k) {
  const t = v.t;
  const sc = 1 + 1.05 * k;
  const s = toScreen(v, CELL);
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2 - s.w * 0.12 * k;
  const w = s.w * 0.94 * sc, h = s.h * 0.94 * sc, x = cx - w / 2, y = cy - h / 2;
  const R = w * 0.06;
  const a = L.clamp(k / 0.2);                // dissolve into the env cell instead of cutting out
  c.save();
  c.globalAlpha = a;
  // shadow on the page
  c.shadowColor = `rgba(0,0,0,${0.75 * L.clamp(k)})`;
  c.shadowBlur = 50 * k;
  c.shadowOffsetY = 26 * k;
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#2a1d31');
  g.addColorStop(1, '#170f1c');
  c.fillStyle = g;
  L.roundRect(c, x, y, w, h, R);
  c.fill();
  c.restore();

  c.save();
  c.globalAlpha = a;
  L.roundRect(c, x, y, w, h, R);
  c.clip();
  // the day's light sweeps across the card
  const sw = L.ease.inOutCubic(L.prog(t, SWEEP[0], SWEEP[1]));
  if (sw > 0) {
    const fx = x + w * sw;
    const fg = c.createLinearGradient(x, 0, fx, 0);
    fg.addColorStop(0, L.rgba(ACCENT, 0.08));
    fg.addColorStop(1, L.rgba(ACCENT, 0.34));
    c.fillStyle = fg;
    c.fillRect(x, y, fx - x, h);
    if (sw < 1) {
      c.globalCompositeOperation = 'lighter';
      const lg = c.createLinearGradient(fx - w * 0.12, 0, fx + 2, 0);
      lg.addColorStop(0, L.rgba(HOT, 0));
      lg.addColorStop(1, L.rgba(HOT, 0.28));
      c.fillStyle = lg;
      c.fillRect(fx - w * 0.12, y, w * 0.12 + 2, h);
      c.globalCompositeOperation = 'source-over';
    }
  }
  // 24 hour ticks along the bottom edge
  const tk = L.clamp(k * 1.4 - 0.3);
  if (tk > 0) {
    for (let i = 0; i <= 24; i++) {
      const tx = x + w * (0.1 + 0.8 * i / 24);
      const lit = (tx - x) / w <= sw;
      const th = h * (i % 6 === 0 ? 0.1 : 0.05);
      c.fillStyle = lit ? L.rgba(HOT, 0.9 * tk) : `rgba(235,228,240,${0.35 * tk})`;
      c.fillRect(tx - 1, y + h * 0.86 - th, 2, th);
    }
  }
  // the title of the card
  if (tk > 0) {
    c.globalAlpha = tk * a;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = L.font(Math.round(w * 0.27), 800, L.FONT.display);
    c.fillStyle = '#f6f0f8';
    L.trackedText(c, '1 DAY', cx, cy - h * 0.06, 1, 'center');
    c.font = L.font(Math.round(w * 0.075), 600, L.FONT.body);
    c.fillStyle = 'rgba(214,204,224,0.8)';
    L.trackedText(c, 'JAN 18', cx, y + h * 0.15, 2, 'center');
  }
  c.restore();
  // rim
  c.save();
  L.roundRect(c, x + 0.5, y + 0.5, w - 1, h - 1, R);
  c.strokeStyle = L.rgba(ACCENT, (0.35 + 0.5 * L.clamp(k)) * a);
  c.lineWidth = 2;
  c.stroke();
  c.restore();
  return { cx, top: y, k };
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'One day', sub: 'About 38 million years' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: T_LIFT, name: 'swish', gain: 0.3, pitch: 1.2 },
      { t: SWEEP[0], name: 'shimmer', gain: 0.18, pitch: 1.3 },
      { t: T_NUM, name: 'blip', gain: 0.32, pitch: 0.9 },
      { t: d - 0.7, name: 'swish', gain: 0.16, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    const k = liftK(v.t, v.d);
    if (k <= 0.001) return;
    card(c, v, k);
  },
  drawOverlay(c, v) {
    const t = v.t;
    eventLabel(c, v, { big: '38 MILLION', small: 'years in every single day', t0: T_NUM, y: 468 });   // raised: clear air above JANUARY
    // a hairline ties the card to the number
    const k = liftK(t, v.d);
    const lk = Math.min(L.prog(t, T_NUM + 0.15, 0.6), v.k) * L.clamp(k / 0.2);
    if (lk > 0) {
      const s = toScreen(v, CELL);
      const cx = s.x + s.w / 2;
      const top = s.y + s.h / 2 - s.w * 0.12 * k - s.h * 0.94 * (1 + 1.05 * k) / 2;
      L.leader(c, cx, top - 10, cx, 556, lk, ACCENT, 0.7);   // stops under the (raised) small line
    }
  },
};
