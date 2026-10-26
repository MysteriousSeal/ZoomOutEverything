// Beat 10 — But our most lasting trace has already left the planet.
// The camera pulls back from the reclaimed region to the dark planet (real Earth, env). As it settles, on
// "already left", the first radio pulse peels off the planet's limb and moves outward.
//
// This file also OWNS the radio-shell system used by beats 10-12 (exported; s11/s12 import it), at TRUE SCALE:
// one shell per decade of broadcasting since 1920, each at its real light-travel distance today (the 1920s front
// ~100 ly out, the 2010s ~16 ly, the 2020s ~6 ly), fixed in metres. They are far larger than the frame while the
// camera passes the Moon and the Sun, run in from the frame edge as the scale reaches light-years, and settle into
// the nested 100-ly bubble in beat 12 (growing slowly: "still spreading"). The signal itself is shown leaving the
// planet as fast pulses (one per decade on "For about a century"), and as a faint amber haze filling the frame
// while we are still inside the bubble. Only this scene draws them, so they never double up.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, BUBBLE_R } from '../camera.js';
import { adapt } from '../legacy.js';

export const DECADES = Array.from({ length: 11 }, (_, i) => 1920 + 10 * i);
const SPAN = 2026 - 1920;
const FRAC = DECADES.map((y) => Math.max(0.03, (2026 - y) / SPAN));   // true radius as a fraction of the outer shell
export const RACE_PX = 340;                              // (kept for compatibility: the planet-era pulse reach)
const B10 = 1.95;                                        // beat-10 time when the first pulse leaves the limb

const sc = (v, i) => v.tl.scenes[i];
/** Global time each decade's pulse leaves the planet. */
export function birthTimes(v) {
  return DECADES.map((_, i) => (i === 0 ? sc(v, 10).start + B10 : sc(v, 11).start + 0.18 + (i - 1) * 0.15));
}

/** True radius (m) of the leading (1920s) shell; 0 before the reveal starts. */
export function leadR(v, gt = v.gt) {
  if (gt < sc(v, 10).start + B10) return 0;
  return BUBBLE_R * grow(v, gt);
}
/** "Still spreading": the bubble keeps growing at a steady rate through the final hold. */
export function grow(v, gt = v.gt) { return 1 + 0.075 * L.prog(gt, sc(v, 12).start + 1.6, 7.0); }

/** True radii (m) of the decade shells: [{i, R}] (outer first). */
export function shells(v, gt = v.gt) {
  const R0 = leadR(v, gt);
  if (R0 <= 0) return [];
  return DECADES.map((_, i) => ({ i, R: R0 * FRAC[i] }));
}

/** Pulses leaving the planet (screen space, relative to the disc): [{i, r (px), a}]. */
function pulses(v) {
  const rp = v.ws(R_EARTH);
  if (rp < 2) return [];
  const out = [];
  birthTimes(v).forEach((t0, i) => {
    const age = v.gt - t0;
    if (age < 0 || age > 1.6) return;
    // the first (beat 10) leaves gently and visibly; the decade burst in beat 11 races off-frame
    const reach = i === 0 ? L.ease.outCubic(L.prog(age, 0, 1.5)) * 220 + age * 40 : Math.pow(age / 1.2, 1.4) * 1500;
    out.push({ i, r: rp * 1.06 + 4 + reach,   // 15b: born just outside the blue atmosphere, never painted on the limb
 a: (1 - L.clamp(age / 1.6)) * Math.exp(-Math.max(0, age - 0.2) * (i === 0 ? 0.6 : 1.8)) });
  });
  return out;
}

/** Draw the shells, pulses and the in-bubble haze (world space, centred on Earth). */
export function drawShells(ctx, v, kAll = 1) {
  const R0 = leadR(v);
  if (R0 <= 0 || kAll <= 0) return;
  const cx = v.wx(0), cy = v.wy(0), m = v.cam.mpp, acc = v.accent;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // inside the bubble: a faint warm haze over the whole frame (fades as the outer shell comes into view)
  const Ro = R0 / m;
  const inK = L.clamp((Ro - 900) / 900) * L.clamp((v.gt - (sc(v, 10).start + B10)) / 1.2);
  if (inK > 0) { ctx.fillStyle = L.rgba(acc, 0.03 * inK * kAll); ctx.fillRect(0, 0, L.W, L.H); }
  // the outer shell's body: a limb-brightened fill (a sphere seen in projection). 15b: only once the shell is about
  // to fit the frame; while it is larger it lifted the whole black frame into a milky brown wash
  const bodyK = L.clamp((1150 - Ro) / 500);
  if (Ro > 6 && bodyK > 0) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Ro);
    g.addColorStop(0, L.rgba(acc, 0.018 * kAll * bodyK));
    g.addColorStop(0.72, L.rgba(acc, 0.04 * kAll * bodyK));
    g.addColorStop(0.96, L.rgba(acc, 0.11 * kAll * bodyK));
    g.addColorStop(1, L.rgba(acc, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, Ro, 0, Math.PI * 2); ctx.fill();
  }
  for (const s of shells(v)) {
    const r = s.R / m;
    if (r < 0.8 || r > 4000) continue;
    const depth = s.i / (DECADES.length - 1);             // 0 = oldest (outer), 1 = newest
    const enter = L.clamp((1500 - r) / 700);               // fade in as it runs in from beyond the frame (15b: later, no wash of wide rings)
    const a = kAll * enter * L.lerp(0.95, 0.32, depth);
    const col = L.mix(acc, [255, 236, 200], 0.25);
    if (s.i === 0) {
      ctx.strokeStyle = L.rgba(acc, 0.05 * a); ctx.lineWidth = 22;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = L.rgba(acc, 0.12 * a); ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = L.rgba(col, Math.min(1, 0.85 * a));
    ctx.lineWidth = s.i === 0 ? 2.2 : 1.3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // a light sweep travelling round each shell (secondary motion; neighbours turn opposite ways)
    if (r > 14) {
      const dir = s.i % 2 ? -1 : 1, a0 = v.gt * 0.35 * dir + s.i * 1.7;
      for (const [off, len, al] of [[0, 0.9, 0.5], [Math.PI, 0.5, 0.3]]) {
        ctx.strokeStyle = L.rgba(L.mix(acc, [255, 240, 210], 0.5), al * a * 0.6);
        ctx.lineWidth = s.i === 0 ? 2.6 : 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0 + off, a0 + off + len); ctx.stroke();
      }
    }
  }
  // pulses leaving the planet (the signal at light speed, stylised)
  for (const p of pulses(v)) {
    const a = kAll * p.a;
    if (a <= 0.01 || p.r > 3000) continue;
    ctx.strokeStyle = L.rgba(acc, 0.1 * a); ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(cx, cy, p.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = L.rgba(L.mix(acc, [255, 240, 210], 0.4), 0.85 * a); ctx.lineWidth = p.i === 0 ? 2.4 : 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, p.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export const SCENE = {
  beat: 10,
  chapter: { num: '10', title: 'Last trace', sub: 'It already left' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.35, name: 'riser', gain: 0.12, pitch: 0.8 },
      { t: B10 - 0.12, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: B10, name: 'ping', gain: 0.3, pitch: 0.85 },
      { t: B10 + 0.05, name: 'shimmer', gain: 0.16, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    // the shells for beats 10-12 (all of them live here)
    drawShells(ctx, v, 1);
    // on departure: the limb glows amber for a moment, as if the planet exhales its signal
    const t = v.t;
    const lk = Math.exp(-Math.max(0, t - B10) * 2.2) * L.ease.outCubic(L.prog(t, B10 - 0.35, 0.35));
    if (lk > 0.01 && t < v.d + 1) {
      const r = v.ws(R_EARTH);
      if (r > 20) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const [w, a] of [[30, 0.08], [10, 0.22], [3, 0.5]]) {
          ctx.strokeStyle = L.rgba(v.accent, a * lk); ctx.lineWidth = w;
          ctx.beginPath(); ctx.arc(v.wx(0), v.wy(0), Math.max(0, r * 1.04 + 3), 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
    }
  },
};
// 15c: 15b beat 10 plays as a 15c beat on the legacy timeline (legacy.js); chapter renumbered
export default adapt(SCENE, 10, { chapter: { num: '06', title: 'Last trace', sub: 'It already left' } });
