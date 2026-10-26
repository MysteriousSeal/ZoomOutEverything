// Beat 1 — the Statue of Liberty at true height (93 m, ground to torch tip) at X.liberty.
// Star-fort walls, the stepped foundation, the granite pedestal (plinth, arched bay, loggia,
// cornice) and the copper statue (robe, raised torch arm, crown rays, tablet).
// It is built by a blueprint scan that rises from the ground while the camera pulls out, a glint
// lands on the torch, then a height line runs from the altitude gauge to the tip under the label.
// Also exports the shared landmark helpers used by s02 (Eiffel) and s03 (Burj).
import * as L from '../../../../engine/runtime/lib.js';
import { ALT, X } from '../camera.js';

const { W } = L;
const ACC = [150, 170, 255];
const INKACC = [52, 72, 178];   // the accent, deepened to read on the bright low-altitude sky

// ================================================================== shared landmark helpers
/** Polyline / polygon in local metres (x right, h up) → path (y = -h). */
export function poly(c, pts, close = true) {
  if (close) {
    // normalise the winding so overlapping sub-paths union under the nonzero rule
    let a = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * -q[1] - q[0] * -p[1]; }
    if (a < 0) pts = pts.slice().reverse();
  }
  pts.forEach(([x, h], i) => (i ? c.lineTo(x, -h) : c.moveTo(x, -h)));
  if (close) c.closePath();
}
/** Linear interpolation in a [[h, value], …] table sorted by h. */
export function tab(T, h) {
  if (h <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (h <= T[i][0]) return L.lerp(T[i - 1][1], T[i][1], (h - T[i - 1][0]) / (T[i][0] - T[i - 1][0]));
  return T[T.length - 1][1];
}

/**
 * A landmark that builds itself with a rising blueprint scan, then lives in the world for the rest of the film.
 * o = { cx, height, w (half-width, m), rev0, revDur, path(c), paint(c, v, mpp), flat (colour for tiny LOD), sweep }
 * Drawn in local metres: origin at the base centre, y = -h.
 */
export function drawLandmark(ctx, v, o) {
  const r = L.ease.inOutCubic(L.prog(v.t, o.rev0, o.revDur));
  // optional: the dashed blueprint ghost fades in at full height from o.ghostIn, before the scan starts
  const gk = o.ghostIn != null ? L.enter(v.t, o.ghostIn, 0.45) : 1;
  if (r <= 0 && (o.ghostIn == null || gk <= 0)) return;
  const mpp = v.cam.mpp;
  const hp = o.height / mpp;
  if (hp < 0.8) return;
  const sx0 = v.wx(o.cx - o.w * 1.3), sx1 = v.wx(o.cx + o.w * 1.3);
  if (sx1 < -60 || sx0 > W + 60 || !v.visibleY(-o.height * 1.05, 0, 60)) return;
  ctx.save();
  ctx.translate(v.wx(o.cx), v.wy(0));
  ctx.scale(1 / mpp, 1 / mpp);
  if (hp < 7) {
    // far away: a flat silhouette (or a hairline) — stays findable at the foot of everything that follows
    if (r <= 0) { ctx.restore(); return; }
    ctx.fillStyle = L.rgba(o.flat);
    if (o.w / mpp < 1.2) ctx.fillRect(-0.6 * mpp, -o.height * r, 1.2 * mpp, o.height * r);
    else { o.path(ctx); ctx.fill(); }
    ctx.restore();
    return;
  }
  const top = o.height * L.lerp(-0.02, 1.02, r);   // scan height (m)
  if (r < 1) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-o.w * 2, -top, o.w * 4, top + 2 * mpp); ctx.clip();
    o.paint(ctx, v, mpp);
    ctx.restore();
    // blueprint ghost of what is still to come
    ctx.save();
    ctx.beginPath(); ctx.rect(-o.w * 2, -o.height * 1.1, o.w * 4, o.height * 1.1 - top); ctx.clip();
    o.path(ctx);
    ctx.fillStyle = L.rgba(ACC, 0.16 * gk);
    ctx.fill();
    ctx.strokeStyle = L.rgba(INKACC, 0.8 * gk);
    ctx.lineWidth = 1.6 * mpp;
    ctx.setLineDash([7 * mpp, 5 * mpp]);
    ctx.stroke();
    ctx.restore();
  } else {
    o.paint(ctx, v, mpp);
  }
  // one light sweep across the finished form (secondary motion during the hold)
  const s = L.prog(v.t, o.rev0 + o.revDur + 0.15, 1.5);
  if (s > 0 && s < 1 && o.sweep !== false) {
    ctx.save();
    o.path(ctx);
    ctx.clip();
    const bx = L.lerp(-o.w * 2.2, o.w * 2.2, L.ease.inOutCubic(s));
    const span = o.height * 0.5;
    const g = ctx.createLinearGradient(bx - span * 0.35, -o.height * 0.6, bx + span * 0.35, -o.height * 0.3);
    g.addColorStop(0, 'rgba(255,250,235,0)');
    g.addColorStop(0.5, `rgba(255,250,235,${0.32 * Math.sin(Math.PI * s)})`);
    g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(-o.w * 1.5, -o.height * 1.05, o.w * 3, o.height * 1.05);
    ctx.restore();
  }
  ctx.restore();
  // the scan line itself (screen space)
  if (r > 0 && r < 1) {
    const y = v.wy(-top);
    const xa = v.wx(o.cx - o.w * 1.25 - 6), xb = v.wx(o.cx + o.w * 1.25 + 6);
    const a = Math.min(1, Math.sin(Math.PI * r) * 3);
    ctx.save();
    const hg = ctx.createLinearGradient(0, y - 26, 0, y + 4);
    hg.addColorStop(0, L.rgba(ACC, 0));
    hg.addColorStop(1, L.rgba(ACC, 0.35 * a));
    ctx.fillStyle = hg;
    ctx.fillRect(xa, y - 26, xb - xa, 28);
    const lg = ctx.createLinearGradient(xa, 0, xb, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.2, `rgba(255,255,255,${0.95 * a})`);
    lg.addColorStop(0.8, `rgba(255,255,255,${0.95 * a})`);
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(xa, y - 1.5, xb - xa, 3);
    ctx.restore();
  }
}

/** Star glint (screen space) at a world tip, peaking at time tp (beat-relative). */
export function drawGlint(ctx, v, x, y, tp, size = 1, color = [255, 246, 225]) {
  const g = L.prog(v.t, tp - 0.1, 0.75);
  if (g <= 0 || g >= 1) return;
  const a = Math.pow(Math.sin(Math.PI * Math.pow(g, 0.6)), 1.5);
  const sx = v.wx(x), sy = v.wy(y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(sx, sy);
  ctx.rotate(0.25 * g);
  for (const [len, wid, rot] of [[150, 3, 0], [95, 2.5, Math.PI / 2], [40, 1.5, Math.PI / 4], [40, 1.5, -Math.PI / 4]]) {
    ctx.save();
    ctx.rotate(rot);
    const lgr = ctx.createLinearGradient(-len * size, 0, len * size, 0);
    lgr.addColorStop(0, L.rgba(color, 0));
    lgr.addColorStop(0.5, L.rgba(color, 0.95 * a));
    lgr.addColorStop(1, L.rgba(color, 0));
    ctx.fillStyle = lgr;
    ctx.fillRect(-len * size, -wid / 2, 2 * len * size, wid);
    ctx.restore();
  }
  ctx.restore();
  L.lightBlob(ctx, sx, sy, 46 * size, color, 0.55 * a);
  L.lightBlob(ctx, sx, sy, 10 * size, [255, 255, 255], 0.9 * a);
}

/**
 * Overlay: a dashed height line from the altitude gauge to the landmark's tip, and the big label on a
 * dark glass plate sitting on that line. k = label visibility, lk = line draw-in.
 */
export function heightLabel(ctx, v, { tipX, tipY, big, small, k, lk }) {
  const gx = 56;
  // exit: the plate, text and leader fade together at full size (no reverse wipe leaving an empty plate)
  const exiting = v.t > v.d * 0.5 && v.k < 1;
  const xa = exiting ? L.ease.inOutCubic(L.clamp(v.k)) : 1;
  if (exiting) { lk = lk > 0 ? 1 : 0; k = k > 0 ? 1 : 0; }
  if (lk > 0 && xa > 0) {
    const e = L.ease.outCubic(L.clamp(lk));
    const x1 = L.lerp(gx, tipX - 16, e);
    ctx.save();
    ctx.globalAlpha = xa;
    ctx.strokeStyle = L.rgba(INKACC, 0.9);
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -v.gt * 14;
    ctx.beginPath(); ctx.moveTo(gx, tipY); ctx.lineTo(x1, tipY); ctx.stroke();
    ctx.setLineDash([]);
    // tip marker: a ring that settles onto the tip, and the gauge-side tick
    const rk = L.clamp(lk * 1.6 - 0.6);
    if (rk > 0) {
      ctx.globalAlpha = rk * xa;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.arc(tipX, tipY, Math.max(0, 9 + 16 * (1 - L.ease.outCubic(rk))), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = L.rgba(INKACC);
      ctx.beginPath(); ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = xa;
    ctx.fillStyle = L.rgba(INKACC);
    ctx.fillRect(gx - 16, tipY - 2, 26 * e, 4);
    ctx.restore();
  }
  if (k <= 0 || xa <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const size = 112;
  // the plate sits just above the height line, left-aligned, clear of the chapter card
  const x = 168, y = L.clamp(tipY - 108, 460, 1040);
  ctx.save();
  ctx.font = L.font(30, 600, L.FONT.body);
  ctx.letterSpacing = '3px';
  const sw = ctx.measureText(small.toUpperCase()).width;
  ctx.letterSpacing = '0px';
  const pw = Math.max(sw, 300) + 64;
  const top = y - size * 0.92 - 52, bot = y + 74;
  // glass plate wipes open from the left
  ctx.globalAlpha = L.clamp(k * 1.5) * xa;
  ctx.shadowColor = 'rgba(5,12,35,0.35)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(9,16,38,0.78)';
  L.roundRect(ctx, x - 34, top, pw * e, bot - top, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = L.rgba(ACC, 0.35);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = xa;
  ctx.beginPath(); ctx.rect(x - 34, top, pw * e, bot - top); ctx.clip();
  L.bigLabel(ctx, { x, y, big, small, k, accent: ACC, size });
  ctx.restore();
}

/** Beat-relative timing of a landmark's tip marker + label. */
export function labelTimes(v, rev1, lab) {
  return {
    lk: L.prog(v.t, rev1 + 0.05, 0.7) * v.k,
    k: L.prog(v.t, lab, 0.55) * v.k,
  };
}

// ================================================================== the Statue of Liberty
const H_ALL = ALT.liberty;     // 93 m
const PED = 47;                // pedestal top (statue heel)
const CX = X.liberty;

const PATINA = [92, 160, 140], PATINA_D = [40, 92, 88], PATINA_L = [165, 222, 200];
const GRANITE = [176, 166, 148], GRANITE_D = [112, 106, 98];
const FORT = [138, 132, 118];

// statue silhouette (local s = height above the pedestal top), sun from the left
const BODY = [[-6.0, 0], [-6.3, 0.8], [-5.8, 4], [-5.5, 9], [-5.3, 14], [-5.2, 18], [-5.4, 21], [-5.7, 23.6], [-5.1, 25.6],
  [-4.0, 26.8], [-2.5, 27.6], [-1.1, 28.0], [-1.0, 29.2], [1.0, 29.2], [1.1, 28.0], [2.6, 27.4], [4.2, 26.3], [4.9, 24.5],
  [5.1, 21], [5.3, 16], [5.6, 10], [5.9, 4], [6.4, 0.8], [6.1, 0]];
const ARM = [[-5.1, 25.4], [-6.1, 27.4], [-5.9, 30.5], [-5.5, 34.5], [-5.2, 38.4], [-5.5, 38.9], [-5.1, 39.9], [-4.0, 40.0],
  [-3.8, 39.2], [-4.0, 35], [-4.15, 31], [-3.9, 28.4], [-3.0, 27.3]];
const TABLET = [[3.4, 25.2], [5.9, 25.9], [6.95, 18.6], [4.4, 17.9]];
const TORCH_X = -4.55;
const PEDESTAL = [[-35, 0], [-32, 6.5], [-17, 6.5], [-17, 8.6], [-15.4, 8.6], [-13.2, 19.2], [-13.4, 19.2], [-13.4, 20.6],
  [-10.4, 20.6], [-10.0, 24], [-9.0, 24], [-8.5, 36], [-9.3, 36], [-9.3, 37], [-8.3, 37], [-8.3, 42.4], [-9.6, 42.4], [-9.6, 44.6],
  [-7.3, 44.6], [-7.3, 47], [7.3, 47], [7.3, 44.6], [9.6, 44.6], [9.6, 42.4], [8.3, 42.4], [8.3, 37], [9.3, 37], [9.3, 36],
  [8.5, 36], [9.0, 24], [10.0, 24], [10.4, 20.6], [13.4, 20.6], [13.4, 19.2], [13.2, 19.2], [15.4, 8.6], [17, 8.6], [17, 6.5],
  [32, 6.5], [35, 0]];

function statueOutline(c) {
  c.beginPath();
  // pedestal + foundation + fort as one path, statue parts as sub-paths (nonzero fill unions them)
  const p = PED;
  poly(c, PEDESTAL);
  poly(c, BODY.map(([x, s]) => [x, p + s]));
  poly(c, ARM.map(([x, s]) => [x, p + s]));
  poly(c, TABLET.map(([x, s]) => [x, p + s]));
  c.moveTo(1.75, -(p + 31.3));
  c.ellipse(0, -(p + 31.3), 1.75, 2.65, 0, 0, Math.PI * 2);
  // torch: handle, balcony, flame
  poly(c, [[TORCH_X - 0.45, p + 39.6], [TORCH_X + 0.45, p + 39.6], [TORCH_X + 0.55, p + 41.6], [TORCH_X - 0.55, p + 41.6]]);
  poly(c, [[TORCH_X - 1.3, p + 41.5], [TORCH_X + 1.3, p + 41.5], [TORCH_X + 1.55, p + 42.5], [TORCH_X - 1.55, p + 42.5]]);
  c.moveTo(TORCH_X - 1.05, -(p + 42.4));
  c.bezierCurveTo(TORCH_X - 1.15, -(p + 44.2), TORCH_X - 0.3, -(p + 45.2), TORCH_X, -H_ALL);
  c.bezierCurveTo(TORCH_X + 0.3, -(p + 45.2), TORCH_X + 1.15, -(p + 44.2), TORCH_X + 1.05, -(p + 42.4));
  c.closePath();
  // crown rays
  for (let i = 0; i < 7; i++) {
    const a = (-1 + i / 3) * 1.25;
    const bx = Math.sin(a) * 1.7, by = p + 32.6 + Math.cos(a) * 1.2;
    const len = 3.1 * (0.75 + 0.25 * Math.cos(a));
    const tx = bx + Math.sin(a) * len, ty = by + Math.cos(a) * len * 0.92;
    const nx = Math.cos(a) * 0.32, ny = -Math.sin(a) * 0.32;
    poly(c, [[bx - nx, by - ny], [tx, ty], [bx + nx, by + ny]]);
  }
}

function paintStatue(c, v, mpp) {
  const p = PED;
  const fine = mpp < 0.35;
  // ---- fort + foundation + pedestal: granite, lit from the left
  c.save();
  c.beginPath();
  poly(c, PEDESTAL);
  const gg = c.createLinearGradient(-14, 0, 14, 0);
  gg.addColorStop(0, L.rgba(L.mix(GRANITE, [255, 245, 225], 0.25)));
  gg.addColorStop(0.55, L.rgba(GRANITE));
  gg.addColorStop(1, L.rgba(GRANITE_D));
  c.fillStyle = gg;
  c.fill();
  c.clip();
  // fort: star-point facets read as alternating lit / shaded wall faces
  c.fillStyle = L.rgba(FORT);
  c.fillRect(-36, -6.5, 72, 6.5);
  for (const [a, b, sh] of [[-35, -24, 0.18], [-24, -17, -0.12], [17, 24, 0.22], [24, 35, 0.4]]) {
    c.fillStyle = sh > 0 ? `rgba(30,30,40,${sh})` : `rgba(255,250,235,${-sh})`;
    c.fillRect(a, -6.5, b - a, 6.5);
  }
  c.fillStyle = 'rgba(255,250,235,0.35)';
  c.fillRect(-33, -6.6, 66, 0.5);
  // ledges and the cornice shadow lines
  c.fillStyle = 'rgba(40,36,34,0.35)';
  for (const h of [8.6, 20.6, 24, 37, 42.4, 44.6]) c.fillRect(-14, -h, 28, 0.55);
  c.fillStyle = 'rgba(255,250,235,0.3)';
  for (const h of [9.0, 21.0, 36.0, 44.6]) c.fillRect(-14, -h - 0.4, 28, 0.35);
  // central bay with the tall arched window, and the loggia openings
  c.fillStyle = 'rgba(255,248,230,0.12)';
  c.fillRect(-4.4, -36, 8.8, 12);
  c.fillStyle = L.rgba([58, 56, 60], 0.85);
  c.beginPath();
  c.moveTo(-1.5, -26); c.lineTo(-1.5, -31.5); c.arc(0, -31.5, 1.5, Math.PI, 0); c.lineTo(1.5, -26); c.closePath(); c.fill();
  for (const ox of [-6.2, -3.6, -1.0, 1.6, 4.2]) {
    c.fillRect(ox, -41.6, 1.6, 3.6);
  }
  if (fine) {
    // granite courses
    c.strokeStyle = 'rgba(60,56,52,0.18)';
    c.lineWidth = 0.18;
    for (let h = 25.5; h < 35.5; h += 1.6) { c.beginPath(); c.moveTo(-9.2, -h); c.lineTo(9.2, -h); c.stroke(); }
    for (let h = 9.8; h < 19; h += 1.8) { c.beginPath(); c.moveTo(-16, -h); c.lineTo(16, -h); c.stroke(); }
  }
  c.restore();

  // ---- the copper statue
  c.save();
  c.beginPath();
  poly(c, BODY.map(([x, s]) => [x, p + s]));
  poly(c, ARM.map(([x, s]) => [x, p + s]));
  poly(c, TABLET.map(([x, s]) => [x, p + s]));
  c.moveTo(1.75, -(p + 31.3));
  c.ellipse(0, -(p + 31.3), 1.75, 2.65, 0, 0, Math.PI * 2);
  poly(c, [[TORCH_X - 0.45, p + 39.6], [TORCH_X + 0.45, p + 39.6], [TORCH_X + 0.55, p + 41.6], [TORCH_X - 0.55, p + 41.6]]);
  poly(c, [[TORCH_X - 1.3, p + 41.5], [TORCH_X + 1.3, p + 41.5], [TORCH_X + 1.55, p + 42.5], [TORCH_X - 1.55, p + 42.5]]);
  for (let i = 0; i < 7; i++) {
    const a = (-1 + i / 3) * 1.25;
    const bx = Math.sin(a) * 1.7, by = p + 32.6 + Math.cos(a) * 1.2;
    const len = 3.1 * (0.75 + 0.25 * Math.cos(a));
    const tx = bx + Math.sin(a) * len, ty = by + Math.cos(a) * len * 0.92;
    const nx = Math.cos(a) * 0.32, ny = -Math.sin(a) * 0.32;
    poly(c, [[bx - nx, by - ny], [tx, ty], [bx + nx, by + ny]]);
  }
  const pg = c.createLinearGradient(-6.5, 0, 6.8, 0);
  pg.addColorStop(0, L.rgba(PATINA_L));
  pg.addColorStop(0.42, L.rgba(PATINA));
  pg.addColorStop(1, L.rgba(PATINA_D));
  c.fillStyle = pg;
  c.fill();
  c.clip();
  // robe folds: long soft vertical drapes from the shoulders to the hem
  c.lineCap = 'round';
  const folds = [[-4.2, 25, -4.8, 1], [-2.4, 26.5, -3.0, 0.5], [-0.6, 27, -1.2, 0.3], [1.2, 26.5, 1.6, 0.4], [3.0, 25.5, 3.9, 0.6], [4.3, 22, 5.1, 1]];
  for (const [x0, s0, x1, s1] of folds) {
    c.strokeStyle = L.rgba(PATINA_D, 0.32);
    c.lineWidth = fine ? 0.4 : 0.7;
    c.beginPath();
    c.moveTo(x0, -(p + s0));
    c.bezierCurveTo(x0 - 0.5, -(p + s0 * 0.66), x1 + 0.6, -(p + s0 * 0.33), x1, -(p + s1));
    c.stroke();
    c.strokeStyle = L.rgba(PATINA_L, 0.28);
    c.lineWidth = fine ? 0.25 : 0.4;
    c.beginPath();
    c.moveTo(x0 - 0.5, -(p + s0 - 0.6));
    c.bezierCurveTo(x0 - 1.0, -(p + s0 * 0.66), x1 + 0.1, -(p + s0 * 0.33), x1 - 0.5, -(p + s1));
    c.stroke();
  }
  // the diagonal mantle across the chest
  c.strokeStyle = L.rgba(PATINA_D, 0.5);
  c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(-4.6, -(p + 25)); c.quadraticCurveTo(0, -(p + 20.5), 4.6, -(p + 17.5)); c.stroke();
  // tablet edge + face shadow + diadem band
  c.fillStyle = L.rgba(PATINA_D, 0.55);
  c.beginPath(); poly(c, [[5.9, p + 25.9], [6.95, p + 18.6], [6.4, p + 18.45], [5.4, p + 25.75]]); c.fill();
  c.fillStyle = L.rgba(PATINA_D, 0.45);
  c.fillRect(0.4, -(p + 33.0), 1.4, 4.4);
  c.fillStyle = L.rgba(PATINA_L, 0.5);
  c.fillRect(-1.9, -(p + 33.25), 3.8, 0.55);
  c.restore();

  // ---- the gilded flame catches the sun
  c.save();
  c.beginPath();
  c.moveTo(TORCH_X - 1.05, -(p + 42.4));
  c.bezierCurveTo(TORCH_X - 1.15, -(p + 44.2), TORCH_X - 0.3, -(p + 45.2), TORCH_X, -H_ALL);
  c.bezierCurveTo(TORCH_X + 0.3, -(p + 45.2), TORCH_X + 1.15, -(p + 44.2), TORCH_X + 1.05, -(p + 42.4));
  c.closePath();
  const fg = c.createLinearGradient(TORCH_X - 1.2, 0, TORCH_X + 1.2, 0);
  fg.addColorStop(0, '#fff3c4');
  fg.addColorStop(0.5, '#f4c15a');
  fg.addColorStop(1, '#b07a26');
  c.fillStyle = fg;
  c.fill();
  c.restore();

  // rim light on the sunlit (left) edges
  c.save();
  c.strokeStyle = 'rgba(255,252,240,0.55)';
  c.lineWidth = 1.3 * mpp;
  c.beginPath();
  poly(c, [[-6.3, p + 0.8], [-5.8, p + 4], [-5.5, p + 9], [-5.3, p + 14], [-5.2, p + 18], [-5.4, p + 21], [-5.7, p + 23.6]], false);
  poly(c, [[-6.1, p + 27.4], [-5.9, p + 30.5], [-5.5, p + 34.5], [-5.2, p + 38.4]], false);
  poly(c, [[-35, 0], [-32, 6.5]], false);
  poly(c, [[-15.4, 8.6], [-13.2, 19.2]], false);
  poly(c, [[-10.4, 20.6], [-10.0, 24]], false);
  poly(c, [[-9.0, 24], [-8.5, 36]], false);
  c.stroke();
  c.restore();
}

// beat-relative timing: the camera brings the statue into frame at t ≈ 1.0 and settles at ≈ 1.6
// Liberty Island: a low lawn + seawall from behind the person to past the fort, so the person stands on land,
// not on the harbour water. Seen edge-on: a thin band from the horizon line down toward the viewer.
// Fades in with the meadow -> water crossfade (same mpp range as env.drawLowGround) and out as Earth takes over.
const ISLE0 = -22, ISLE1 = CX + 48;
function drawIsland(c, v) {
  const lm = Math.log(v.cam.mpp);
  const kWater = L.smoothstep(L.invLerp(Math.log(0.012), Math.log(0.06), lm));
  const kOut = 1 - L.smoothstep(L.invLerp(Math.log(2.5), Math.log(9), lm));
  const a = kWater * kOut;
  if (a <= 0) return;
  const x0 = v.wx(ISLE0), x1 = v.wx(ISLE1), y = v.wy(0);
  if (x1 < -20 || x0 > W + 20) return;
  const hb = L.clamp(v.ws(3.2), 3, 16);          // near-shore band depth in px
  const lip = 0;                                   // nothing above the waterline: never overlaps the person's feet
  c.save();
  c.globalAlpha *= a;
  // lawn top (a sliver above the waterline) + seawall face below it
  const g = c.createLinearGradient(0, y - lip, 0, y + hb);
  g.addColorStop(0, 'rgb(122,146,104)');
  g.addColorStop(0.3, 'rgb(96,118,86)');
  g.addColorStop(0.45, 'rgb(150,144,128)');
  g.addColorStop(1, 'rgb(92,90,84)');
  c.fillStyle = g;
  const sl = Math.min(10, hb * 0.8);              // sloped ends
  c.beginPath();
  c.moveTo(x0, y - lip); c.lineTo(x1, y - lip); c.lineTo(x1 + sl, y + hb); c.lineTo(x0 - sl, y + hb); c.closePath();
  c.fill();
  // a soft reflection / shadow on the water just below the wall
  c.fillStyle = 'rgba(20,34,52,0.25)';
  c.fillRect(x0 - sl, y + hb, x1 - x0 + 2 * sl, Math.max(2, hb * 0.5));
  c.restore();
}

const REV0 = 0.42, REVD = 1.1, REV1 = REV0 + REVD, LAB = 1.85;

export default {
  beat: 1,
  chapter: { num: '01', title: 'Statue of Liberty', sub: 'New York · 1886' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: REV0 + 0.05, name: 'riser', gain: 0.22, pitch: 1.1 },
      { t: REV1 - 0.05, name: 'shimmer', gain: 0.34, pitch: 1.15 },
      { t: REV1 + 0.1, name: 'tick', gain: 0.3, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    drawIsland(ctx, v);
    drawLandmark(ctx, v, {
      cx: CX, height: H_ALL, w: 35, rev0: REV0, revDur: REVD, ghostIn: 0.0,
      path: statueOutline, paint: paintStatue, flat: [86, 126, 116],
    });
    drawGlint(ctx, v, CX + TORCH_X, -H_ALL + 0.4, REV1 + 0.02, 0.9);
  },

  drawOverlay(ctx, v) {
    // keep the human anchor: a "YOU · 1.8 m" tag on the person at the statue's foot while the camera pulls back
    const yk = L.enter(v.t, 0.25, 0.5) * v.k;
    if (yk > 0) {
      const px = v.wx(0), py = v.wy(-1.75), gy = v.wy(0);
      const tx = px - 10, ty = Math.min(py, gy - 14) - 74;
      const e = L.ease.outCubic(yk);
      ctx.save();
      ctx.globalAlpha = L.clamp(yk);
      ctx.strokeStyle = 'rgba(255,240,214,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, (py + gy) / 2, Math.max(9, (gy - py) / 2 + 6), 0, Math.PI * 2); ctx.stroke();
      const top = (py + gy) / 2 - Math.max(9, (gy - py) / 2 + 6);
      ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, L.lerp(top, ty + 18, e)); ctx.stroke();
      ctx.font = L.font(24, 700, L.FONT.body);
      const str = 'YOU · 1.8 m';
      ctx.letterSpacing = '2px';
      const tw = ctx.measureText(str).width + 28;
      ctx.letterSpacing = '0px';
      ctx.globalAlpha = L.clamp(yk * 2 - 0.4);
      ctx.fillStyle = 'rgba(6,10,24,0.82)';
      L.roundRect(ctx, tx - tw / 2 + 10, ty - 18 + (1 - e) * 8, tw, 38, 19); ctx.fill();
      ctx.fillStyle = 'rgb(255,240,214)';
      ctx.textBaseline = 'middle';
      L.trackedText(ctx, str, tx + 10, ty + 2 + (1 - e) * 8, 2, 'center');
      ctx.restore();
    }
    const { k, lk } = labelTimes(v, REV1, LAB);
    heightLabel(ctx, v, {
      tipX: v.wx(CX + TORCH_X), tipY: v.wy(-H_ALL),
      big: '93 m', small: '305 ft · Statue of Liberty', k, lk,
    });
  },
};
