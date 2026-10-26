// Beat 5 — "for months, almost nothing but microbes". The camera opens onto Oct–Dec; the wash front
// (drawn in s03) runs on from first life through to Christmas Eve, and every day it passes is
// quietly colonised by a few tiny microbes that keep drifting. Then everything fades as the
// dinosaurs' beat takes over.
//
// Also here (drawn last among beats 1–5): a gentle "spotlight" that dims the months around the
// focal block (January for beats 1–2, September for 3–4, Oct–Dec for 5).
import * as L from '../../../../engine/runtime/lib.js';
import { monthRect } from '../camera.js';
import { ALL_DAYS, LIFE, eventLabel, toScreen } from './s00-hook.js';
import { LIFE_DOY, MICROBE_END, MICROBE_RUN, washFade, washFront } from './s03-sun.js';
import { microbe } from './s04-first-life.js';

const { W, H } = L;
const FIRST = Math.floor(LIFE_DOY) + 1;
const LAST = Math.floor(MICROBE_END);
// one larger microbe per cell (an occasional second), placed once (deterministic)
const COLONY = Array.from({ length: 365 }, (_, i) => {
  const r = L.rng(5000 + i);
  const two = r() < 0.22;
  const first = { x: two ? 0.38 : 0.45 + r() * 0.1, y: two ? 0.5 : 0.56 + r() * 0.08, s: 0.58 + r() * 0.08, seed: r() * 50, lag: r() * 0.4 };
  return two ? [first, { x: 0.66, y: 0.74, s: 0.4 + r() * 0.06, seed: r() * 50, lag: 0.3 + r() * 0.4 }] : [first];
});

// ------------------------------------------------------------------ spotlight (beats 1–5)
const pad = (r, p = 0.4, top = 1.05) => ({ x: r.x - p, y: r.y - top, w: r.w + 2 * p, h: r.h + top + p });
const JAN = pad(monthRect(0));
const SEP = pad(monthRect(8));
const OND = pad({ x: monthRect(9).x, y: monthRect(9).y, w: monthRect(11).x + 7 - monthRect(9).x, h: 5 });
const SPOT = [null, [JAN, 2.3, false], [JAN, 0, true], [SEP, 1.95, false], [SEP, 0, true], [OND, 1.6, true]];
const DIM = 0.45;

function spotlight(c, v) {
  const b = v.beat;
  if (b < 1 || b > 5) return;
  const [rect, delay, out] = SPOT[b];
  const t = v.gt - v.tl.scenes[b].start, d = v.tl.scenes[b].end - v.tl.scenes[b].start;
  const kin = delay > 0 ? L.ease.inOutCubic(L.prog(t, delay, 0.9)) : 1;
  const kout = out ? 1 - L.ease.inCubic(L.prog(t, d - 0.55, 0.45)) : 1;
  const k = kin * kout;
  // the top band runs continuously through beats 3-5 (in with beat 3's spotlight, out at beat 5's end)
  const bk = b >= 3 ? (b === 3 ? kin : 1) * (b === 5 ? kout : 1) : 0;
  if (k <= 0.001 && bk <= 0.001) return;
  const s = toScreen(v, rect);
  c.save();
  c.fillStyle = `rgba(5,3,8,${DIM * k})`;
  c.beginPath();
  c.rect(0, 0, W, H);
  c.rect(s.x, s.y, s.w, s.h);                       // the hole (even-odd)
  c.fill('evenodd');
  // a calm field under the HUD / chapter card for the lower-framed beats
  if (bk > 0.001) {
    const tg = c.createLinearGradient(0, 0, 0, 430);
    tg.addColorStop(0, `rgba(5,3,8,${0.75 * bk})`);
    tg.addColorStop(0.75, `rgba(5,3,8,${0.75 * bk})`);
    tg.addColorStop(1, 'rgba(5,3,8,0)');
    c.fillStyle = tg;
    c.fillRect(0, 0, W, 430);
  }
  c.restore();
}

// ------------------------------------------------------------------ the microbe months
function colonies(c, v) {
  const f = washFront(v), fade = washFade(v);
  if (f <= FIRST || fade <= 0) return;
  const n = Math.min(LAST + 1, Math.ceil(f));
  for (let i = FIRST; i < n; i++) {
    const s = toScreen(v, ALL_DAYS[i]);
    if (s.x > W || s.y > H || s.x + s.w < 0 || s.y + s.h < 0 || s.w < 4) continue;
    const behind = f - i;
    // a soft organic tint: the colonised day becomes a living culture
    const tk = L.ease.outCubic(L.clamp((behind - 0.1) / 1.0)) * fade;
    if (tk > 0) {
      const tg = c.createRadialGradient(s.x + s.w * 0.5, s.y + s.h * 0.6, 0, s.x + s.w * 0.5, s.y + s.h * 0.6, s.w * 0.7);
      tg.addColorStop(0, L.rgba(LIFE, 0.2 * tk));
      tg.addColorStop(1, L.rgba(LIFE, 0.05 * tk));
      c.fillStyle = tg;
      c.fillRect(s.x + s.w * 0.04, s.y + s.h * 0.04, s.w * 0.92, s.h * 0.92);
    }
    for (const m of COLONY[i]) {
      const k = L.ease.outBack(L.clamp((behind - m.lag) / 1.2), 2) * fade;
      if (k <= 0) continue;
      const mx = s.x + s.w * m.x, my = s.y + s.h * m.y, ms = s.w * m.s * 1.35;
      L.lightBlob(c, mx, my, ms * 0.55, LIFE, 0.12 * L.clamp(k));
      microbe(c, mx, my, ms, Math.min(1, k) * 0.9, v.gt, m.seed, ms > 24);
    }
  }
}

/** Beat-time at which the wash front crosses a given day (for sound cues). */
function frontTime(day, d) {
  const lo = Math.floor(LIFE_DOY) + 1;
  const u = L.invLerp(lo, MICROBE_END, day);
  let a = 0, b = 1;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; L.ease.inOutCubic(m) < u ? (a = m) : (b = m); }
  return Math.min(d - 0.2, MICROBE_RUN[0] + MICROBE_RUN[1] * a);
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'Microbes', sub: '' },
  captions: true,
  layer: 5,
  cues(d) {
    return [
      { t: MICROBE_RUN[0], name: 'count', gain: 0.2, pitch: 0.9 },
      { t: frontTime(273, d), name: 'tick', gain: 0.24, pitch: 1.0 },   // Oct 1
      { t: frontTime(304, d), name: 'tick', gain: 0.24, pitch: 1.1 },   // Nov 1
      { t: frontTime(334, d), name: 'tick', gain: 0.24, pitch: 1.2 },   // Dec 1
      { t: 0.95, name: 'bubbles', gain: 0.2, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    colonies(c, v);
    spotlight(c, v);
  },
  drawOverlay(c, v) {
    eventLabel(c, v, { big: '3 MONTHS', small: 'of almost nothing but microbes', t0: 1.0, y: 1176, size: 104, scrim: [1040, 1260] });
  },
};
