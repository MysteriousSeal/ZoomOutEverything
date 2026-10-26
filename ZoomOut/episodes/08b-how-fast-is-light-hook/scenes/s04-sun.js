// Beat 4 — sunlight takes 8 min 19 s. The camera pulls back from the Moon to the Sun–Earth line; a
// photon leaves the Sun (timeline-compressed), its route line linking the two, and lands on Earth on
// "get here" as the clock locks at 8 min 19 s. The Sun stays in the world for the rest of the film:
// a true-size disc with a corona and soft anamorphic flare, shrinking to a point of light far out.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, SUN } from '../camera.js';
import { drawClock, clockRun, drawTravel, PHOTON_GOLD } from './s01-one-second.js';

const { W, H } = L;
export const R_SUN = 6.957e8;
const AU = Math.hypot(SUN.x, SUN.y);
const U = { x: -SUN.x / AU, y: -SUN.y / AU };                 // Sun -> Earth
export const SUN_A = { x: SUN.x + U.x * R_SUN, y: SUN.y + U.y * R_SUN };
export const SUN_B = { x: -U.x * R_EARTH, y: -U.y * R_EARTH };
// beat-local. The photon leaves only once the Sun has swung into frame on the pull-back (the clock
// holds at 0 until then, while the Sun's light leaks in from the frame edge); lands on "get here".
export const DEP = 1.26, ARR = 2.08;
const SEC = 499;                                              // 8 min 19 s (1 AU / c = 499.0 s)

/** Sun in world space at any zoom. k scales overall brightness. */
export function drawSun(ctx, v, k = 1) {
  const mpp = v.cam.mpp;
  // far out: a point of light; beyond the galaxy zoom it's gone
  const fade = 1 - L.clamp((Math.log10(mpp) - 14.3) / 0.7);
  if (fade <= 0 || k <= 0) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  const rt = v.ws(R_SUN);
  const near = L.clamp((Math.log10(mpp) - 11.5) / -1.2);       // 1 near the Sun, 0 when far
  const glowR = (60 + 140 * near) + rt * 8;
  if (sx < -glowR * 1.5 || sx > W + glowR * 1.5 || sy < -glowR * 1.5 || sy > H + glowR * 1.5) return;
  const a = fade * k;
  const pulse = 1 + 0.04 * Math.sin(v.gt * 1.7) + 0.02 * L.noise1(v.gt * 3, 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  L.lightBlob(ctx, sx, sy, glowR * 2.6 * pulse, [255, 140, 50], 0.16 * a);
  L.lightBlob(ctx, sx, sy, glowR * pulse, [255, 196, 100], 0.55 * a);
  L.lightBlob(ctx, sx, sy, (16 + rt * 2.2) * pulse, [255, 236, 190], 0.95 * a);
  // anamorphic streak + faint slow rays
  const sw = glowR * 1.7 * (0.6 + 0.4 * near);
  const g = ctx.createLinearGradient(sx - sw, 0, sx + sw, 0);
  g.addColorStop(0, 'rgba(255,190,110,0)');
  g.addColorStop(0.5, `rgba(255,220,170,${0.34 * a})`);
  g.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(sx - sw, sy - 1.2, sw * 2, 2.4);
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const an = v.gt * 0.05 + i * Math.PI / 3 + 0.2;
    const len = glowR * (0.9 + 0.35 * Math.sin(v.gt * 0.8 + i * 1.7));
    const rg = ctx.createLinearGradient(sx, sy, sx + Math.cos(an) * len, sy + Math.sin(an) * len);
    rg.addColorStop(0, `rgba(255,225,170,${0.22 * a * near})`);
    rg.addColorStop(1, 'rgba(255,225,170,0)');
    ctx.strokeStyle = rg;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(an) * len, sy + Math.sin(an) * len); ctx.stroke();
  }
  ctx.restore();
  // the disc itself (true size, never smaller than a bright 3 px core)
  const r = Math.max(3 * (0.5 + 0.5 * near), rt);
  const dg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  dg.addColorStop(0, `rgba(255,253,245,${a})`);
  dg.addColorStop(0.75, `rgba(255,236,190,${a})`);
  dg.addColorStop(1, `rgba(255,190,110,${a})`);
  ctx.fillStyle = dg;
  ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
}

/** While the Sun is still off-screen on the pull-back: its light spilling in from the frame edge,
 *  growing as the disc approaches, so the eye is already pulled toward where the photon will leave. */
function drawSunLeak(ctx, v, k) {
  if (k <= 0) return;
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  const cx = W / 2, cy = H / 2;
  const dx = sx - cx, dy = sy - cy;
  // where the centre->Sun ray leaves the frame
  const s = Math.min((W / 2) / Math.max(1e-6, Math.abs(dx)), (H / 2) / Math.max(1e-6, Math.abs(dy)));
  if (s >= 1) return;                                        // on screen: drawSun handles it
  const ex = cx + dx * s, ey = cy + dy * s;
  const off = Math.hypot(sx - ex, sy - ey);
  const near = Math.exp(-off / 1400);
  const a = k * (0.35 + 0.65 * near);
  if (a <= 0.01) return;
  const pulse = 1 + 0.05 * Math.sin(v.gt * 2.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  L.lightBlob(ctx, ex, ey, 560 * pulse, [255, 140, 50], 0.3 * a);
  L.lightBlob(ctx, ex, ey, 240 * pulse, [255, 196, 110], 0.5 * a);
  // a low streak of light reaching into the frame along the ray
  const ux = -dx / Math.hypot(dx, dy), uy = -dy / Math.hypot(dx, dy), len = 380 * (0.6 + 0.4 * near);
  const g = ctx.createLinearGradient(ex, ey, ex + ux * len, ey + uy * len);
  g.addColorStop(0, `rgba(255,220,170,${0.4 * a})`);
  g.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + ux * len, ey + uy * len); ctx.stroke();
  ctx.restore();
}

/** Earth's orbit (1 AU) around the Sun; s06 draws its own once beat 6 starts. */
function drawEarthOrbit(ctx, v, a) {
  const R = v.ws(AU);
  if (a <= 0 || R < 20 || R > 40000) return;
  ctx.save();
  ctx.strokeStyle = `rgba(130,175,255,${0.2 * a})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(v.wx(SUN.x), v.wy(SUN.y), Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function tag(ctx, x, y, text, k, dy = 30) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.strokeStyle = 'rgba(220,228,240,0.5)';
  ctx.lineWidth = 1.5;
  const d0 = Math.sign(dy) * 14;
  ctx.beginPath(); ctx.moveTo(x, y + d0); ctx.lineTo(x, y + d0 + (dy - d0) * L.ease.outCubic(k)); ctx.stroke();
  ctx.font = L.font(24, 600, L.FONT.body);
  ctx.fillStyle = 'rgba(225,232,242,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10;
  ctx.textBaseline = dy > 0 ? 'top' : 'alphabetic';
  L.trackedText(ctx, text, x, y + dy + Math.sign(dy) * (10 + (1 - k) * 8), 4, 'center');
  ctx.restore();
}

/** Clock + tags for beats 4–5 (s05 continues them seamlessly from its start). */
export function drawSunHud(ctx, v4, k = 1, tagK = k) {
  const t = v4.t;
  drawClock(ctx, v4, { sec: clockRun(t, DEP, ARR, SEC), lockAt: ARR, lockLabel: 'SUN TO EARTH', k });
  // named once the camera has settled on the Sun; 71 px below its centre, under the diffraction rays' bright part
  const tk = tagK * L.enter(t, 0.75, 0.5);
  tag(ctx, v4.wx(SUN.x), v4.wy(SUN.y), 'THE SUN', tk, 71);
  const ek = tagK * L.enter(t, ARR + 0.15, 0.5);
  tag(ctx, v4.wx(0), v4.wy(0), 'EARTH', ek, 34);
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'The Sun', sub: '150 million km away' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: DEP - 0.05, name: 'whoosh', gain: 0.3, pitch: 0.8 },
      { t: DEP, name: 'count', gain: 0.26, pitch: 1.0 },
      { t: 0.45, name: 'swell', gain: 0.24, pitch: 1.0 },
      { t: ARR, name: 'impact', gain: 0.36, pitch: 1.0 },
      { t: ARR + 0.02, name: 'tick', gain: 0.38, pitch: 1.1 },
      { t: ARR + 0.15, name: 'bloom', gain: 0.22, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    const t = v.t;
    if (v.gt < v.tl.scenes[3].start) return;                 // nothing of ours near frame before the Moon beat
    const s6 = v.tl.scenes[6].start;
    const orbitA = L.ease.inOutCubic(L.prog(t, 1.0, 1.0)) * (1 - L.prog(v.gt, s6, 0.5));
    drawEarthOrbit(ctx, v, orbitA);
    drawSun(ctx, v, 1);
    // the camera leaves for the Sun before the beat (camera.js lead): its light leaks in from the edge while it is off-frame
    if (t > -0.4 && t < DEP + 0.6) drawSunLeak(ctx, v, L.ease.inOutCubic(L.prog(t, -0.35, 0.35)) * (1 - L.prog(t, DEP, 0.6)));
    // the journey (s05 keeps the route alive with a soft stream of light)
    if (t < 0) return;
    const p = L.prog(t, DEP, ARR - DEP);
    const head = 1 - L.prog(t, ARR, 0.12);
    const route = 0.35 * (1 - L.prog(v.gt, v.tl.scenes[5].start, 0.4));
    if (head > 0 || route > 0.01) drawTravel(ctx, v, SUN_A, SUN_B, p, { trail: 0.34, route, head, s: 1 });
    const ar = t - ARR;
    if (ar > 0 && ar < 1.2) {
      const ex = v.wx(0), ey = v.wy(0);
      L.lightBlob(ctx, ex, ey, 40 + 120 * ar, [190, 220, 255], 0.65 * Math.exp(-ar * 3.5));
      L.lightBlob(ctx, ex, ey, 30, PHOTON_GOLD, 0.9 * Math.exp(-ar * 5));
      ctx.save();
      ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.7 * (1 - ar / 1.2));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ex, ey, Math.max(0, 8 + 70 * L.ease.outCubic(ar / 1.2)), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  },

  drawOverlay(ctx, v) {
    if (v.gt >= v.tl.scenes[5].start) return;               // s05 takes the HUD over without a fade
    // fade in normally; no fade-out (s05 continues the same clock)
    drawSunHud(ctx, v, L.ease.outCubic(L.prog(v.t, 0, 0.45)));
  },
};
