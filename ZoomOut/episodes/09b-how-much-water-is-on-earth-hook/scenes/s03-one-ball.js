// Beat 3 — "Pull it all together into one ball."
// The streams (s02) keep pouring into ALL, where a swirling mass of light has been gathering since the first
// arrivals in beat 2. Their tails let go of the planet and whip in; on "one" the light condenses into a
// glassy water sphere (s04's waterBall, same seed) with a flash, a ring of light and a liquid wobble that is
// still settling when s04 takes the ball over at beat 4's start.
import * as L from '../../../../engine/runtime/lib.js';
import { ALL, R_EARTH } from '../camera.js';
import { wordTime } from './s00-hook.js';
import { streamState, drawTags, TAG_HANDOFF } from './s02-every-drop.js';
import { waterBall, DEEP } from './s04-1385-km.js';

const TAU = Math.PI * 2;
const T = (v, i) => v.tl.scenes[i].start;
const condenseAt = (tl) => wordTime(tl, 3, /^one/i) + 0.05;

/** Ball volume fraction (0..1) and condensation (0 = light, 1 = water). */
function ballState(v) {
  const st = streamState(v.tl, v.gt);
  const tC = condenseAt(v.tl);
  const vol = L.clamp(0.5 * st.arrived + 0.5 * st.drained);
  const cond = L.ease.inOutCubic(L.prog(v.gt, tC - 0.12, 0.3));
  return { vol: Math.max(vol, cond), cond, tC };
}

/** The gathering light: a luminous, swirling liquid mass. */
function drawMass(c, v, cx, cy, r, a) {
  if (a <= 0.001 || r <= 0.2) return;
  const acc = v.accent;
  c.save();
  c.globalCompositeOperation = 'lighter';
  L.lightBlob(c, cx, cy, r * 4 + 30, acc, 0.32 * a);
  // turbulent body
  const n = 40;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * TAU;
    const k = 1 + 0.09 * L.noise1(th * 1.6 + v.gt * 2.2, 7) + 0.05 * Math.sin(3 * th - v.gt * 4);
    const x = cx + Math.cos(th) * r * k, y = cy + Math.sin(th) * r * k;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
  const g = c.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r * 1.1);
  g.addColorStop(0, `rgba(235,248,255,${0.95 * a})`);
  g.addColorStop(0.45, L.rgba([120, 200, 255], 0.75 * a));
  g.addColorStop(1, L.rgba(acc, 0.25 * a));
  c.fillStyle = g;
  c.fill();
  // swirl lines circling the mass
  c.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const rr = r * (1.15 + 0.22 * i);
    const a0 = v.gt * (2.6 - i * 0.35) + i * 1.7;
    c.strokeStyle = L.rgba([170, 225, 255], (0.5 - i * 0.09) * a);
    c.lineWidth = Math.max(1, r * 0.07);
    c.beginPath(); c.arc(cx, cy, Math.max(0, rr), a0, a0 + 1.4 - i * 0.2); c.stroke();
  }
  c.restore();
}

function drawBall(c, v) {
  const t2 = T(v, 2), t4 = T(v, 4);
  if (v.gt < t2 + 1.4 || v.gt >= t4) return;     // s04 owns the ball from beat 4's start
  const cx = v.wx(ALL.x), cy = v.wy(ALL.y), R = v.ws(ALL.d / 2);
  const { vol, cond, tC } = ballState(v);
  // "Now gather every drop": a faint beacon marks where it will all go
  const beacon = L.ease.outCubic(L.prog(v.gt, t2 + 1.5, 0.8)) * (1 - L.clamp(vol * 6));
  if (beacon > 0.001) {
    const p = 0.5 + 0.5 * Math.sin((v.gt - t2) * 4);
    L.lightBlob(c, cx, cy, 34 + 10 * p, v.accent, 0.35 * beacon);
    c.fillStyle = `rgba(230,246,255,${0.85 * beacon})`;
    c.beginPath(); c.arc(cx, cy, 2.5, 0, TAU); c.fill();
  }
  const r = R * Math.cbrt(vol);
  drawMass(c, v, cx, cy, r, 1 - cond);
  if (cond > 0) {
    const tau = Math.max(0, v.gt - tC);
    // liquid settle: a breathing pulse plus a decaying wobble that matches s04's allWobble at the hand-off
    const breathe = 1 + 0.07 * Math.exp(-tau / 0.35) * Math.sin(tau * 15);
    const wob = 0.036 + 0.08 * Math.exp(-tau / 0.4);
    waterBall(c, v, ALL.x, ALL.y, ALL.d * breathe, { base: DEEP, wob, seed: 1.3, glow: 0.2, alpha: cond });
  }
  // the condensation flash and a ring of light
  const f = L.prog(v.gt, tC - 0.05, 0.9);
  if (f > 0 && f < 1) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    // keep the hit on the ball: the flash and ring never spill onto the Earth's disc
    c.beginPath();
    c.rect(0, 0, L.W, L.H);
    c.arc(v.wx(0), v.wy(0), Math.max(0, v.ws(R_EARTH)), 0, TAU);
    c.clip('evenodd');
    L.lightBlob(c, cx, cy, R * (2.4 + 1.6 * f), [200, 235, 255], 0.55 * Math.pow(1 - f, 2));
    const rr = R * (1.05 + 1.35 * L.ease.outCubic(f));
    c.strokeStyle = L.rgba([180, 228, 255], 0.75 * (1 - f));
    c.lineWidth = Math.max(1, 3 * (1 - f));
    c.beginPath(); c.arc(cx, cy, Math.max(0, rr), 0, TAU); c.stroke();
    c.restore();
  }
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'One ball', sub: 'Every drop, pulled together' },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: 0.1, name: 'whoosh', gain: 0.3, pitch: 0.7 },
      { t: 0.3, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: 1.6, name: 'bloom', gain: 0.5, pitch: 0.9 },
      { t: 1.64, name: 'splash', gain: 0.32, pitch: 1.0 },
      { t: 1.66, name: 'impact', gain: 0.2, pitch: 0.7 },
      { t: 2.2, name: 'shimmer', gain: 0.16, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    drawBall(ctx, v);
  },
  drawOverlay(ctx, v) {
    if (v.gt >= T(v, 3) + TAG_HANDOFF) drawTags(ctx, v);     // s02's source tags finish fading here
  },
};
