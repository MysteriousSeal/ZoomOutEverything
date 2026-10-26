// Beat 5 — The last dinosaurs. An anatomically accurate T. rex (horizontal back, tail held out straight as the
// counterweight, deep skull, tiny two-fingered arms, mid-stride) slides in as the camera lands at 66 million
// years. On "sixty-six million" the K–Pg asteroid streaks in behind it and strikes the ruler at −66 Ma: the
// T. rex is back-lit by the flash. The T. rex STAYS for beat 6 (smaller, at the same 32 px/m scale as the
// Stegosaurus), then collapses to a ruler landmark during beat 7's zoom-out.
// Also exports the shared silhouette helpers used by beats 6–9 (smooth paths, rim-lit fills, collapse timing).
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, landmark, timelineK, ACCENT } from '../env.js';

// ------------------------------------------------------------------ shared helpers (beats 5–9)
export const GROUND = 22;                       // subjects stand this many px above the ruler line
export const RIM = [200, 236, 246];             // cool rim light
export const BODY_TOP = [64, 90, 104], BODY_BOT = [24, 38, 48];
export const WARM = [255, 168, 92];

/** Closed (or open) smooth path through points; a point [x, y, 1] is a sharp corner. */
export function smoothPath(ctx, pts, closed = true) {
  const n = pts.length;
  const mid = (i) => { const a = pts[(i + n) % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  ctx.beginPath();
  if (!closed) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) { const m = mid(i); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    return;
  }
  const m0 = mid(n - 1);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(i), p = pts[i];
    if (p[2]) { ctx.lineTo(p[0], p[1]); ctx.lineTo(m[0], m[1]); } else ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

/** Outline of a limb: polyline joints [[x, y, width], ...] → closed point list (rounded by smoothPath). */
export function limb(j) {
  const L1 = [], R1 = [];
  for (let i = 0; i < j.length; i++) {
    const a = j[Math.max(0, i - 1)], b = j[Math.min(j.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const w = j[i][2] / 2;
    L1.push([j[i][0] - dy * w, j[i][1] + dx * w]);
    R1.push([j[i][0] + dy * w, j[i][1] - dx * w]);
  }
  return [...L1, ...R1.reverse()];
}

/**
 * Rim-lit silhouette: `path()` builds the shape (local coords). Fill = vertical gradient body colour; a thin
 * crescent of rim light on the upper/right edges (the shape is refilled shifted down-left inside a clip).
 */
export function litShape(ctx, path, { top = BODY_TOP, bot = BODY_BOT, rim = RIM, rimA = 0.85, off = 2.6, y0 = -160, y1 = 0, dark = 0 } = {}) {
  ctx.save();
  path();
  ctx.fillStyle = L.rgba(rim, rimA);
  ctx.fill();
  ctx.clip();
  ctx.translate(-off * 0.8, off);
  path();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, L.rgba(L.mix(top, [8, 14, 20], dark)));
  g.addColorStop(1, L.rgba(L.mix(bot, [4, 8, 12], dark)));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** 1 → 0 as the camera leaves for beat `b` (the subject collapses into a landmark during that zoom). */
export function bigK(v, b, dur = 1.0, lead = 0.05) {
  const s = v.tl.scenes[b];
  return s ? 1 - L.ease.inOutCubic(L.prog(v.gt, s.start - lead, dur)) : 1;
}
/** Fades a landmark out as it merges into NOW. */
export const nearNow = (v, x, a = 30, b = 60) => L.clamp((v.wx(0) - x - a) / b);

/** House big label, fitted to the 900 px column (big line and the small caps line). */
export function label(ctx, v, big, small, k) {
  if (k <= 0) return;
  const size = L.fitSize(ctx, big, 860, 120, 800, L.FONT.display, 60);
  ctx.save();
  ctx.font = L.font(30, 600, L.FONT.body);
  ctx.letterSpacing = '3px';
  const sw = ctx.measureText(small.toUpperCase()).width;
  ctx.letterSpacing = '0px';
  ctx.restore();
  if (sw > 860) small = small.split(' · ')[0];
  L.bigLabel(ctx, { x: 80, y: 560, big, small, k, accent: v.accent, size });
}

/** Small tracked name tag (world-attached). Fitted to `maxW`. */
export function tag(ctx, text, x, y, k, { color = [226, 234, 240], size = 22, maxW = 360, align = 'center', weight = 700 } = {}) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= L.clamp(k);
  const s = L.fitSize(ctx, text, maxW, size, weight, L.FONT.body, 14);
  ctx.font = L.font(s, weight, L.FONT.body);
  ctx.fillStyle = L.rgba(color, 0.95);
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(2,6,12,0.85)';
  ctx.shadowBlur = 10;
  L.trackedText(ctx, text, x, y, 2.5, align);
  ctx.restore();
}

/** Ground contact: soft shadow ellipse + the pin dot on the ruler. */
export function footing(ctx, x, ry, w, k, color = ACCENT) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= k;
  const g = ctx.createRadialGradient(x, ry - GROUND, 0, x, ry - GROUND, Math.max(1, w));
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.save(); ctx.translate(x, ry - GROUND); ctx.scale(1, 0.12); ctx.translate(-x, -(ry - GROUND));
  ctx.fillRect(x - w, ry - GROUND - w, w * 2, w * 2);
  ctx.restore();
  ctx.strokeStyle = L.rgba(color, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry - GROUND + 2); ctx.stroke();
  ctx.fillStyle = L.rgba(color);
  ctx.beginPath(); ctx.arc(x, ry, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ the T. rex (local px; origin = ground under the hip, facing +x)
// 1 m ≈ 32.5 px: 12.3 m nose-to-tail, hip joint 3.1 m, skull 1.5 m.
const TREX_BODY = [
  [-226, -112, 1],                                                  // tail tip
  [-190, -121], [-140, -128], [-90, -135], [-45, -142],            // tail, top edge (held straight out)
  [0, -146], [36, -143], [66, -136],                               // over the hips, the back
  [88, -131], [102, -136],                                         // shoulders → neck
  [114, -146], [126, -156],                                        // S-curved neck
  [138, -160], [147, -164], [157, -160], [173, -153],                           // skull roof
  [180, -146], [180, -138, 1],                                      // blunt snout
  [167, -133], [150, -126], [132, -120],                           // lower jaw → deep jaw angle
  [120, -112], [110, -100], [100, -86], [88, -72],                 // throat, chest
  [66, -62], [42, -58], [18, -62],                                 // belly
  [-12, -74], [-34, -88],                                          // behind the thigh
  [-64, -100], [-110, -106], [-170, -107],                         // tail, underside
];
const HEAD_PIVOT = [96, -122];

function trexBody(gt) {
  const sway = Math.sin(gt * 1.15), breathe = Math.sin(gt * 1.9);
  const a = 0.035 * Math.sin(gt * 0.85 + 0.6) + 0.012 * breathe;
  const ca = Math.cos(a), sa = Math.sin(a);
  return TREX_BODY.map(([x, y, s]) => {
    let X = x, Y = y;
    if (x < -30) { const u = (-30 - x) / 194; Y += sway * 5 * Math.pow(u, 1.6); X += Math.cos(gt * 1.15) * 1.2 * u; }   // tail sway
    if (x > 95) { const dx = x - HEAD_PIVOT[0], dy = y - HEAD_PIVOT[1]; X = HEAD_PIVOT[0] + dx * ca - dy * sa; Y = HEAD_PIVOT[1] + dx * sa + dy * ca; }
    if (x > 20 && x < 102 && y > -90) Y += breathe * 1.6 * Math.sin(((x - 20) / 82) * Math.PI);   // the chest breathes
    return [X, Y, s];
  });
}
// legs mid-stride: [x, y, width] from hip joint to toe tip
const LEG_NEAR = [[2, -120, 58], [15, -84, 46], [25, -57, 24], [19, -42, 17], [9, -22, 11], [19, -5, 10], [39, -1, 5]];
const LEG_FAR = [[-6, -118, 50], [1, -82, 40], [6, -57, 22], [-4, -42, 15], [-20, -24, 10], [-15, -5, 9], [4, -1, 5]];
const ARM = [[94, -90, 9], [100, -77, 6], [107, -73, 4], [112, -71, 2.5]];
const FINGER2 = [[106, -73, 3], [110, -68, 1.8]];

/** Draw the T. rex at (x, groundY), scale s, with optional warm back-light `warm` (0..1). */
export function drawTrex(ctx, x, gy, s, { gt = 0, warm = 0, alpha = 1 } = {}) {
  if (s <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, gy);
  ctx.scale(s, s);
  const rim = L.mix(RIM, WARM, warm);
  const off = 1.7 / Math.max(0.5, s);
  // far leg first (darker), then body, then near leg + arm
  litShape(ctx, () => smoothPath(ctx, limb(LEG_FAR)), { rim, rimA: 0.2, dark: 0.4, off, y0: -120, y1: 0 });
  const body = trexBody(gt);
  litShape(ctx, () => smoothPath(ctx, body), { rim, off, y0: -165, y1: -70 });
  litShape(ctx, () => smoothPath(ctx, limb(LEG_NEAR)), { top: [72, 100, 114], bot: [22, 36, 46], rim, rimA: 0.14, off, y0: -130, y1: 0 });
  litShape(ctx, () => smoothPath(ctx, limb(ARM)), { rim, rimA: 0.5, off: off * 0.6, y0: -100, y1: -60 });
  litShape(ctx, () => smoothPath(ctx, limb(FINGER2)), { rim, rimA: 0.6, off: off * 0.5, y0: -90, y1: -75 });
  // a whisper of texture: the eye ridge line and jaw line, no face
  ctx.strokeStyle = L.rgba(rim, 0.22);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(177, -137); ctx.quadraticCurveTo(156, -132, 138, -126); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ beat timing (beat-local seconds)
const STREAK0 = 1.72, IMPACT = 2.14;

export default {
  beat: 5,
  chapter: { num: '05', title: 'The last dinosaurs', sub: 'the K–Pg extinction' },
  layer: 5,
  cues(d) {
    return [
      { t: STREAK0 - 0.05, name: 'whoosh', gain: 0.26, pitch: 1.5 },
      { t: IMPACT, name: 'impact', gain: 0.5, pitch: 0.65 },
      { t: IMPACT + 0.04, name: 'deep', gain: 0.32, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    const lk = timelineK(v);
    if (lk <= 0 || v.t < 0.5) return;
    const ry = rulerY(v), gy = ry - GROUND;
    const x = tx(v, AGE.trex), xk = tx(v, AGE.kpg);
    const s6 = v.tl.scenes[6];
    const big = bigK(v, 7, 1.0);                                              // collapses during beat 7's zoom
    const scale = L.lerp(1.0, 0.9, L.ease.inOutCubic(L.prog(v.gt, s6.start, 1.2))) * L.lerp(0.18, 1, big);
    const rise = L.ease.outCubic(L.prog(v.t, 1.3, 0.7));
    const dt = v.t - IMPACT;

    // --- the asteroid: streak behind the T. rex, then the flash on the ruler at −66 Ma
    const flash = dt >= 0 ? Math.exp(-dt * 1.6) : 0;
    const ember = (dt >= 0 ? L.ease.outCubic(L.clamp(dt / 0.4)) : 0) * (1 - L.ease.inCubic(L.prog(v.gt, s6.start, 0.9)));
    if (xk > -300 && xk < L.W + 300) {
      ctx.save();
      ctx.globalAlpha = lk;
      const sp = L.prog(v.t, STREAK0, IMPACT - STREAK0);
      if (sp > 0 && sp < 1) {
        const x0 = xk + 470, y0 = ry - 700, x1 = xk + 6, y1 = ry - 4;
        const e = L.ease.inCubic(sp);
        const hx = L.lerp(x0, x1, e), hy = L.lerp(y0, y1, e);
        const tl = 0.28;                                                    // trail length (fraction of path)
        const tx0 = L.lerp(x0, x1, Math.max(0, e - tl)), ty0 = L.lerp(y0, y1, Math.max(0, e - tl));
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(tx0, ty0, hx, hy);
        g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(1, 'rgba(255,224,180,0.95)');
        ctx.strokeStyle = g; ctx.lineCap = 'round';
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,250,235,0.9)'; ctx.beginPath(); ctx.moveTo(L.lerp(tx0, hx, 0.6), L.lerp(ty0, hy, 0.6)); ctx.lineTo(hx, hy); ctx.stroke();
        L.lightBlob(ctx, hx, hy, 46, [255, 200, 140], 0.8);
      }
      if (flash > 0.002) {
        L.lightBlob(ctx, xk, ry, 120 + 520 * (1 - flash), [255, 150, 70], 0.75 * flash);
        L.lightBlob(ctx, xk, ry, 60 + 120 * (1 - flash), [255, 245, 225], 0.9 * flash);
        // anamorphic streak along the ruler
        ctx.globalCompositeOperation = 'lighter';
        const hw = 120 + 520 * L.ease.outCubic(L.clamp(dt / 0.5));
        const g = ctx.createLinearGradient(xk - hw, 0, xk + hw, 0);
        g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(0.5, `rgba(255,236,210,${0.8 * flash})`); g.addColorStop(1, 'rgba(255,170,90,0)');
        ctx.fillStyle = g; ctx.fillRect(xk - hw, ry - 2.5, hw * 2, 5);
        // shock ring
        const rr = 20 + 260 * L.ease.outCubic(L.clamp(dt / 1.2));
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(255,190,130,${0.5 * (1 - L.clamp(dt / 1.2))})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(xk, ry, Math.max(0, rr), Math.max(0, rr * 0.32), 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (ember > 0) {
        // the K–Pg boundary below the ruler: a thin warm line + tag
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = lk * ember;
        L.lightBlob(ctx, xk, ry, 70, [255, 140, 60], 0.35);
        ctx.strokeStyle = 'rgba(255,170,100,0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 6]);
        ctx.beginPath(); ctx.moveTo(xk, ry + 74); ctx.lineTo(xk, ry + L.lerp(74, 230, ember)); ctx.stroke();
        ctx.setLineDash([]);
        tag(ctx, 'ASTEROID IMPACT', Math.max(150, xk), ry + 268, ember, { color: [255, 196, 140], size: 22, maxW: 300 });
      }
      ctx.restore();
    }

    // --- the T. rex
    if (x < -260 || x > L.W + 260) return;
    const nk = nearNow(v, x, 24, 50);
    const a = lk * rise * nk;
    if (a <= 0) return;
    const gt = v.gt;
    ctx.save();
    ctx.globalAlpha = a;
    if (big > 0.01) {
      L.lightBlob(ctx, x + 10 * scale, gy - 110 * scale, 260 * scale, ACCENT, 0.10 * big);
      footing(ctx, x, ry, 150 * scale, big);
      drawTrex(ctx, x, gy + (1 - rise) * 26, scale, { gt, warm: Math.max(flash, 0.35 * ember), alpha: L.clamp(big * 1.6 - 0.3) });
      tag(ctx, 'T. REX', x + 30 * scale, gy - 185 * scale, L.clamp(big * 2 - 1) * L.ease.outCubic(L.prog(v.t, 1.7, 0.5)));
    }
    ctx.restore();
    landmark(ctx, v, AGE.trex, { k: lk * (1 - big) * nearNow(v, x, 55, 45) * rise * bigK(v, 8, 0.6, 0.1), label: 'T. rex', r: 5 });
  },
  drawOverlay(ctx, v) {
    label(ctx, v, '66 MILLION', 'years ago · the last dinosaurs', v.k * L.ease.outCubic(L.prog(v.t, 1.95, 0.5)));
  },
};
