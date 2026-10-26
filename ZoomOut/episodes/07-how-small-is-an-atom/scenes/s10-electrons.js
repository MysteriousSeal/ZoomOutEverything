// Beat 10 — "The electrons? | Just a faint haze, out in the stands."
// The magnifier folds back into the centre spot and the stadium comes back up. The atom's electron cloud, which
// was pushed out to the stands by the morph, rises as a soft cold-blue haze over the seating bowl: big slow
// veils drifting around the ring, with a fine shimmer of "probability" sparks that blink in and out (no orbits,
// no little planets). The pitch in between stays clear. Label: "ELECTRONS" / "a faint haze in the stands".
// The haze then lingers (dimmer) through beat 11 and folds away with the stadium in beat 12.
import * as L from '../../../../engine/runtime/lib.js';
import { stadiumState, frame, ringPt, LABEL } from './s09-stadium.js';

const { ease, clamp, prog, lerp } = L;
const HAZE = [150, 222, 255];

// haze veils (big soft sprites) and sparks, deterministic
const VEILS = (() => {
  const r = L.rng(1010);
  return Array.from({ length: 54 }, (_, i) => ({
    th: (i / 54) * Math.PI * 2 + r() * 0.2, s: lerp(0.12, 0.95, r()), size: lerp(0.13, 0.24, r()),
    w: (r() < 0.5 ? -1 : 1) * lerp(0.02, 0.07, r()), a: lerp(0.5, 1, r()), ph: r() * 20,
  }));
})();
const SPARKS = (() => {
  const r = L.rng(2020);
  return Array.from({ length: 560 }, () => {
    // denser in the middle of the bowl, thinning toward the pitch and the outside
    const g = (r() + r() + r()) / 3;
    return { th: r() * Math.PI * 2, s: lerp(-0.15, 1.15, g), w: (r() < 0.5 ? -1 : 1) * lerp(0.03, 0.14, r()), ph: r() * 40, z: r() };
  });
})();

let sprite = null;
function getSprite() {
  if (sprite) return sprite;
  sprite = new OffscreenCanvas(128, 128);
  const c = sprite.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, L.rgba(HAZE, 1));
  g.addColorStop(0.35, L.rgba(HAZE, 0.45));
  g.addColorStop(0.7, L.rgba(HAZE, 0.12));
  g.addColorStop(1, L.rgba(HAZE, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  return sprite;
}

/** Haze intensity over time: a whisper after the morph, full in beat 10, lingering in beat 11. */
export function hazeK(st) {
  return st.alpha * st.m * (0.16 * (1 - st.focus * 0.6) + 0.84 * st.stands + 0.3 * st.empty * (1 - st.stands));
}

export function drawHaze(ctx, v, st, k) {
  if (k <= 0.004) return;
  const F = frame(v);
  const gt = v.gt;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const spr = getSprite();
  // breathing: the cloud swells a little on "just a faint haze"
  const breathe = 1 + 0.12 * Math.sin(gt * 1.3);
  for (const p of VEILS) {
    const th = p.th + p.w * gt + 0.05 * L.noise1(gt * 0.3 + p.ph, 3);
    const s = p.s + 0.04 * L.noise1(gt * 0.25 + p.ph, 4);
    const [x, y] = ringPt(s, th, st.m);
    const R = p.size * F.U * breathe;
    ctx.globalAlpha = clamp(0.2 * k * p.a);
    ctx.drawImage(spr, F.cx + x * F.U - R, F.cy + y * F.U - R, 2 * R, 2 * R);
  }
  // sparks: each one fades in and out on its own clock (a probability cloud, not orbits)
  ctx.globalAlpha = 1;
  ctx.fillStyle = L.rgba([210, 240, 255]);
  for (const p of SPARKS) {
    const blink = L.noise1(gt * 1.6 + p.ph, 9);
    if (blink < 0.15) continue;
    const a = (blink - 0.15) / 0.85 * k * (0.5 + 0.5 * p.z);
    const th = p.th + p.w * gt;
    const [x, y] = ringPt(p.s, th, st.m);
    const r = 1 + 1.8 * p.z;
    ctx.globalAlpha = clamp(a * 0.9);
    ctx.beginPath(); ctx.arc(F.cx + x * F.U, F.cy + y * F.U, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'Electrons', sub: 'No orbits: a cloud of probability' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.15, name: 'shimmer', gain: 0.3, pitch: 0.8 },    // the haze rises over the stands
      { t: 0.35, name: 'swell', gain: 0.24, pitch: 0.7 },
      { t: 0.65, name: 'blip', gain: 0.22, pitch: 1.1 },      // label
      { t: 1.8, name: 'shimmer', gain: 0.18, pitch: 1.25 },   // "just a faint haze"
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    const st = stadiumState(v.gt, v.tl);
    if (!st.on) return;
    drawHaze(ctx, v, st, hazeK(st));
  },
  drawOverlay(ctx, v) {
    L.bigLabel(ctx, { ...LABEL, big: 'ELECTRONS', small: 'a faint haze in the stands', k: Math.min(v.k, prog(v.t, 0.6, 0.5)), accent: v.accent, size: 110 });
  },
};
