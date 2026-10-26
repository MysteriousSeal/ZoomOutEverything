// Beat 11 — For about a century, our radio and TV signals have raced outward at light speed.
// "For about a century": one pulse per decade bursts off the planet in quick succession (drawn by s10).
// Then a TRUE-SCALE pull-back (camera.js dwells at each landmark): the Moon at its real distance, the Sun with
// Earth's orbit, each tagged where it really is and shrinking into the centre as we pass; the decade shells (fixed
// in metres, s10) run in from beyond the frame once the scale reaches light-years, with Alpha Centauri inside the
// innermost ones. We are inside the signal the whole way (a faint amber haze), until its edge comes into view.
import * as L from '../../../../engine/runtime/lib.js';
import { AU, SUN_DIR, LY, at as camAt } from '../camera.js';
import { glowDot } from '../env.js';
import { leadR } from './s10-last-trace.js';
import { adapt } from '../legacy.js';

const { W, H } = L;
const R_MOON = 1.7374e6, D_MOON = 3.844e8;
const MOON = { x: -0.6 * D_MOON, y: 0.8 * D_MOON };       // lower left of the planet
const SUN = { x: SUN_DIR.x * AU, y: SUN_DIR.y * AU };      // upper right (the planet's lit crescent faces it)
const R_SUN = 6.957e8;

const on = (x, y, pad = 60) => x > -pad && x < W + pad && y > -pad && y < H + pad;

/** {flare, inside}: is a body at distance d (m) inside the signal bubble? (No flares: all are inside today.) */
export function crossing(v, d) {
  // every body out to ~100 ly is already inside the signal today (no front sweeps past them during the race)
  const R = leadR(v);
  return { flare: 0, inside: R > d ? 1 : 0 };
}

function orbit(ctx, x, y, r, a) {
  if (a <= 0.01 || r < 40 || r > 6000) return;
  ctx.save();
  ctx.strokeStyle = `rgba(200,212,232,${a * L.clamp((r - 40) / 80)})`;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([2, 7]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawMoon(ctx, v) {
  const ex = v.wx(0), ey = v.wy(0);
  const sep = v.ws(D_MOON);
  const vis = L.clamp((sep - 12) / 40);
  orbit(ctx, ex, ey, sep, 0.2 * vis);
  if (vis <= 0) return;
  const x = v.wx(MOON.x), y = v.wy(MOON.y);
  if (!on(x, y, 120)) return;
  const { flare, inside } = crossing(v, D_MOON);
  // 15b: a small sunlit grey disc at its true scale (a quarter of the Earth's diameter, never under ~1.6 px), no flare
  const r = Math.max(1.6, v.ws(R_MOON));
  glowDot(ctx, x, y, r * 2.5 + 4, [200, 205, 220], 0.12 * vis);
  if (flare > 0.02) glowDot(ctx, x, y, r * 6 + 40, v.accent, 0.8 * flare * vis);
  const g = ctx.createRadialGradient(x + SUN_DIR.x * r * 0.4, y + SUN_DIR.y * r * 0.4, 0, x, y, r);
  g.addColorStop(0, `rgba(236,234,228,${vis})`); g.addColorStop(0.7, `rgba(160,160,158,${vis})`); g.addColorStop(1, `rgba(60,62,70,${vis})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function drawSun(ctx, v) {
  const ex = v.wx(0), ey = v.wy(0);
  const sep = v.ws(AU);
  const vis = L.clamp((sep - 10) / 50);                   // merges into the Earth's pale dot far out
  const x = v.wx(SUN.x), y = v.wy(SUN.y);
  // 15b: once Earth's orbit is too small to see, the Sun stays as the brightest point at the centre (a warm star)
  if (vis < 1 && on(x, y)) {
    const mk = 1 - vis;
    glowDot(ctx, x, y, 22, [255, 214, 150], 0.55 * mk);
    ctx.fillStyle = `rgba(255,246,226,${0.95 * mk})`;
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  if (vis <= 0) return;
  orbit(ctx, x, y, sep, 0.18 * vis);                       // Earth's orbit (passes through the planet)
  if (!on(x, y, 400)) {                                    // still off-frame: its light leaks in from the edge
    const dx = x - W / 2, dy = y - H / 2, s = Math.min((W / 2) / Math.abs(dx || 1e-6), (H / 2) / Math.abs(dy || 1e-6));
    if (s < 1) {
      const near = Math.exp(-Math.hypot(dx, dy) * (1 - s) / 1600);
      L.lightBlob(ctx, W / 2 + dx * s, H / 2 + dy * s, 520, [255, 196, 120], 0.22 * near * vis);
    }
    return;
  }
  const rt = v.ws(R_SUN);
  const rd = Math.max(9, rt);                               // a readable disc (true size when it is larger)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  L.lightBlob(ctx, x, y, rd * 9, [255, 150, 60], 0.12 * vis);
  L.lightBlob(ctx, x, y, rd * 4, [255, 200, 120], 0.35 * vis);
  // corona: fine streamers radiating from the limb (slowly turning)
  ctx.lineCap = 'round';
  const cr = L.rng(77);
  for (let q = 0; q < 28; q++) {
    const a = (q / 28) * Math.PI * 2 + v.gt * 0.05 + cr() * 0.2, len = rd * (0.8 + 1.8 * cr() * cr());
    const g = ctx.createLinearGradient(x + Math.cos(a) * rd, y + Math.sin(a) * rd, x + Math.cos(a) * (rd + len), y + Math.sin(a) * (rd + len));
    g.addColorStop(0, `rgba(255,236,200,${0.5 * vis})`); g.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, rd * 0.12);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rd * 0.95, y + Math.sin(a) * rd * 0.95); ctx.lineTo(x + Math.cos(a) * (rd + len), y + Math.sin(a) * (rd + len)); ctx.stroke();
  }
  ctx.restore();
  // the photosphere: a crisp disc with limb darkening
  const g = ctx.createRadialGradient(x, y, 0, x, y, rd);
  g.addColorStop(0, `rgba(255,252,240,${vis})`); g.addColorStop(0.7, `rgba(255,232,180,${vis})`); g.addColorStop(1, `rgba(255,170,80,${vis})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rd, 0, Math.PI * 2); ctx.fill();
}

// outward light streaks inside the shells while the camera races (they speed up with the pull-back)
const STREAKS = (() => { const r = L.rng(1111); return Array.from({ length: 150 }, () => ({ a: r() * Math.PI * 2, u: r(), sp: 0.7 + r() * 0.6, l: r() })); })();
/** 15b: inside the signal. Soft wavefronts keep sweeping outward across the frame from the centre while the camera
 *  pulls back past the Moon and the Sun, so "raced outward at light speed" always has a visible subject. Stylised:
 *  screen-space rings, faint, fading toward the frame edge; they hand over to the true decade shells in beat 12. */
function drawWaves(ctx, v) {
  const t = v.t;
  const k = L.ease.outCubic(L.prog(t, 1.1, 0.6)) * (1 - L.ease.inCubic(L.prog(t, 5.0, 0.8)));
  if (k <= 0.01) return;
  const cx = v.wx(0), cy = v.wy(0), span = 1250, gap = span / 5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 6; q++) {
    const r = ((t * 260 + q * gap) % span) + 40;
    const a = k * L.clamp((r - 40) / 120) * Math.pow(1 - r / (span + 40), 1.4);
    if (a < 0.01) continue;
    ctx.strokeStyle = L.rgba(v.accent, 0.05 * a); ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 236, 200], 0.3), 0.32 * a); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawStreaks(ctx, v) {
  const t = v.t;
  const k = L.ease.outCubic(L.prog(t, 0.7, 0.8)) * (1 - L.ease.inCubic(L.prog(t, 4.3, 0.9)));
  if (k <= 0.01) return;
  const R = Math.min(950, leadR(v) / v.cam.mpp);
  if (R < 60) return;
  const phase = 4.2 * L.ease.inOutCubic(L.prog(t, 0.6, 4.3)) + 0.12 * t;
  const cx = v.wx(0), cy = v.wy(0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.2;
  for (const s of STREAKS) {
    const f = (s.u + phase * s.sp) % 1;
    const r1 = R * (0.06 + 0.92 * f), len = (8 + 34 * s.l) * (0.4 + f);
    const a = k * Math.sin(Math.PI * f) * (0.26 + 0.4 * s.l);   // 15b: brighter (they read as the signal racing out)
    if (a < 0.01) continue;
    const ux = Math.cos(s.a), uy = Math.sin(s.a);
    const g = ctx.createLinearGradient(cx + ux * (r1 - len), cy + uy * (r1 - len), cx + ux * r1, cy + uy * r1);
    g.addColorStop(0, L.rgba(v.accent, 0)); g.addColorStop(1, L.rgba([255, 230, 190], a));
    ctx.strokeStyle = g;
    ctx.beginPath(); ctx.moveTo(cx + ux * Math.max(0, r1 - len), cy + uy * Math.max(0, r1 - len)); ctx.lineTo(cx + ux * r1, cy + uy * r1); ctx.stroke();
  }
  ctx.restore();
}

// the outer planets' orbits around the Sun stream inward through the shells (Jupiter to Neptune)
const PLANETS = [[5.2, 2.1], [9.54, 4.0], [19.2, 0.9], [30.1, 5.3]];
function drawPlanets(ctx, v) {
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  for (const [au, ph] of PLANETS) {
    const r = v.ws(au * AU);
    if (r < 30 || r > 5000) continue;
    const vis = L.clamp((r - 30) / 90);
    orbit(ctx, sx, sy, r, 0.13 * vis);
    const a = ph + v.gt * 0.02;
    const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r;
    if (!on(x, y)) continue;
    const { flare } = crossing(v, Math.hypot(SUN.x + Math.cos(a) * au * AU, SUN.y + Math.sin(a) * au * AU));
    glowDot(ctx, x, y, 10 + 30 * flare, flare > 0.05 ? v.accent : [200, 210, 230], (0.35 + 0.5 * flare) * vis);
    ctx.fillStyle = `rgba(225,230,240,${0.85 * vis})`;
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}

// name tags for the landmarks the pull-back passes, at their true distances
const AC = { d: 4.37 * LY, a: (150 * Math.PI) / 180 };      // Alpha Centauri (as placed in s12's star field)
const TAGS = [
  { name: 'MOON', d: D_MOON, ux: MOON.x / D_MOON, uy: MOON.y / D_MOON, side: 1 },
  { name: 'SUN', d: AU, ux: SUN_DIR.x, uy: SUN_DIR.y, side: -1 },
  { name: 'ALPHA CENTAURI', d: AC.d, ux: Math.cos(AC.a), uy: Math.sin(AC.a), side: 1 },
];
/** Tags ride on each body at its TRUE position while it is on screen and away from the pale dot. */
function drawTags(ctx, v) {
  // 15b: every motion-blur sub-frame draws the tag at the OUTPUT frame's camera, so the text is crisp (the body it
  // points at is still blurred by the move, centred on the same spot)
  const gq = Math.round(v.gt * 30) / 30, cq = camAt(gq, v.tl), tq = v.t + (gq - v.gt);
  const ex = W / 2 + (0 - cq.x) / cq.mpp, ey = H * (cq.anchor ?? 0.5) + (0 - cq.y) / cq.mpp;
  for (const tg of TAGS) {
    const rr = tg.d / cq.mpp;                                // true on-screen distance from Earth
    // v15fx: x v.k, the beat's overlay strength (the Alpha Centauri tag used to hold full and pop off at the beat cut)
    const k = L.clamp((rr - 34) / 40) * L.clamp((700 - rr) / 120) * L.clamp((tq - 0.6) / 0.3) * (v.k ?? 1);
    if (k <= 0.01) continue;
    const x = ex + tg.ux * rr, y = ey + tg.uy * rr;
    if (x < 20 || x > L.W - 20 || y < 380 || y > 1250) continue;
    const tx = x + tg.side * 26, ty = y - 18;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.strokeStyle = 'rgba(235,230,222,0.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x + tg.side * 8, y - 5); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.font = L.font(26, 700, L.FONT.body);   // 15b: ≥ 26 px house rule
    ctx.letterSpacing = '2px';
    const w = ctx.measureText(tg.name).width;
    ctx.letterSpacing = '0px';
    const bx = tg.side > 0 ? tx + 4 : tx - 4 - w - 24;
    ctx.fillStyle = 'rgba(6,8,14,0.96)';
    L.roundRect(ctx, bx, ty - 21, w + 24, 42, 8); ctx.fill();
    ctx.fillStyle = 'rgba(240,234,224,0.95)';
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, tg.name, bx + 12, ty + 1, 2, 'left');
    ctx.restore();
  }
}

export const SCENE = {
  beat: 11,
  chapter: { num: '11', title: 'Broadcasts', sub: 'At the speed of light' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.15, name: 'blip', gain: 0.14, pitch: 0.9 },
      { t: 0.45, name: 'blip', gain: 0.14, pitch: 1.05 },
      { t: 0.75, name: 'blip', gain: 0.14, pitch: 1.2 },
      { t: 1.05, name: 'blip', gain: 0.14, pitch: 1.35 },
      { t: 1.0, name: 'whoosh', gain: 0.3, pitch: 0.75 },
      { t: 1.5, name: 'swish', gain: 0.18, pitch: 1.2 },
      { t: 2.1, name: 'shimmer', gain: 0.22, pitch: 0.9 },
      { t: 3.55, name: 'ping', gain: 0.16, pitch: 1.3 },
      { t: 4.05, name: 'ping', gain: 0.14, pitch: 1.1 },
      { t: 4.6, name: 'deep', gain: 0.2, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    const gt = v.gt;
    if (gt < v.tl.scenes[10].start + 1) return;
    drawWaves(ctx, v);
    drawStreaks(ctx, v);
    if (v.cam.mpp > 3e13) { drawSun(ctx, v); return; }    // all merged: only the Sun's star remains at the centre
    ctx.save();
    drawMoon(ctx, v);
    drawPlanets(ctx, v);
    drawSun(ctx, v);
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    drawTags(ctx, v);
    L.bigLabel(ctx, { x: 64, y: 430, big: '≈ 100 YEARS', small: 'of radio and TV', k: v.k * L.enter(v.t, 0.35, 0.6), accent: v.accent, size: 88 });
  },
};
// 15c: 15b beat 11 plays as a 15c beat on the legacy timeline (legacy.js); chapter renumbered
// v15fx: the pull-back's dwells come earlier in 15c (camera.js B11), so the landmark cues move with them
const CUE_SHIFT = (t) => (t >= 3 ? t - 0.5 : t >= 1.4 ? t - 0.25 : t);
export default adapt(SCENE, 11, {
  chapter: { num: '07', title: 'Broadcasts', sub: 'At the speed of light' },
  cues: (d) => SCENE.cues(d).map((c) => ({ ...c, t: CUE_SHIFT(c.t) })),
});
