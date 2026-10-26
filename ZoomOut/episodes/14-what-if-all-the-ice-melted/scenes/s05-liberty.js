// Beat 5 — "That's almost up to the chest of the Statue of Liberty."
// The Statue of Liberty, side-on on Liberty Island at the New York limb (x = 0, island ground y = −3, torch tip
// y = −96, scaled from LIBERTY): the star-fort walls of Fort Wood, the granite pedestal and the patina-green copper
// statue (robe, raised torch arm, crown rays, tablet), lit from the left. It is drawn from beat 4 on so it is there
// when the dive lands. env.drawForeground puts the risen sea in FRONT of it; this file adds soft caustic light on
// whatever is under the surface.
//
// This file also owns the measurement layer of the rise (beats 4-5, screen-space, above env's water):
//   * a slim tide gauge on the left that fills with the sea level,
//   * a dashed +70 m target line across the frame, and the "+70 m" label that lands with "seventy meters",
//   * on "the chest": a ring settles on her chest where the line meets her, and the label's line turns to
//     "almost to her chest".
// s04's overlay calls riseOverlay() for beat 4 and this scene's overlay continues it, so it never blinks at the cut.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, LIBERTY, PLACES, SEA, seaKeys, seaLevel, shotStart, viewOf, worldOf } from '../env.js';

const { W, H } = L;

// ================================================================== geometry (local metres: x right, h up from the island ground)
const G = LIBERTY.ground;                 // island ground, metres above today's sea
const PED = LIBERTY.pedestalTop - G;      // 46.9: pedestal top above the ground
const TOP = LIBERTY.torch - G;            // 93: torch tip above the ground
const CHEST = LIBERTY.chest;              // 71 m above sea level

function poly(c, pts, close = true) {
  if (close) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * -q[1] - q[0] * -p[1]; }
    if (a < 0) pts = pts.slice().reverse();
  }
  pts.forEach(([x, h], i) => (i ? c.lineTo(x, -h) : c.moveTo(x, -h)));
  if (close) c.closePath();
}

const PATINA = [96, 166, 146], PATINA_D = [36, 86, 84], PATINA_L = [172, 226, 204];
const GRANITE = [170, 160, 146], GRANITE_D = [96, 92, 90];
const FORT = [132, 126, 114];

// statue (s = height above the pedestal top)
const BODY = [[-6.0, 0], [-6.3, 0.8], [-5.8, 4], [-5.5, 9], [-5.3, 14], [-5.2, 18], [-5.4, 21], [-5.7, 23.6], [-5.1, 25.6],
  [-4.0, 26.8], [-2.5, 27.6], [-1.1, 28.0], [-1.0, 29.2], [1.0, 29.2], [1.1, 28.0], [2.6, 27.4], [4.2, 26.3], [4.9, 24.5],
  [5.1, 21], [5.3, 16], [5.6, 10], [5.9, 4], [6.4, 0.8], [6.1, 0]];
const ARM = [[-5.1, 25.4], [-6.1, 27.4], [-5.9, 30.5], [-5.5, 34.5], [-5.2, 38.4], [-5.5, 38.9], [-5.1, 39.9], [-4.0, 40.0],
  [-3.8, 39.2], [-4.0, 35], [-4.15, 31], [-3.9, 28.4], [-3.0, 27.3]];
const TABLET = [[3.4, 25.2], [5.9, 25.9], [6.95, 18.6], [4.4, 17.9]];
const TORCH_X = -4.55;
const PEDESTAL = [[-35, 0], [-32, 6.5], [-17, 6.5], [-17, 8.6], [-15.4, 8.6], [-13.2, 19.2], [-13.4, 19.2], [-13.4, 20.6],
  [-10.4, 20.6], [-10.0, 24], [-9.0, 24], [-8.5, 36], [-9.3, 36], [-9.3, 37], [-8.3, 37], [-8.3, 42.4], [-9.6, 42.4], [-9.6, 44.6],
  [-7.3, 44.6], [-7.3, PED], [7.3, PED], [7.3, 44.6], [9.6, 44.6], [9.6, 42.4], [8.3, 42.4], [8.3, 37], [9.3, 37], [9.3, 36],
  [8.5, 36], [9.0, 24], [10.0, 24], [10.4, 20.6], [13.4, 20.6], [13.4, 19.2], [13.2, 19.2], [15.4, 8.6], [17, 8.6], [17, 6.5],
  [32, 6.5], [35, 0]];
// Liberty Island in profile (h = 0 is the lawn, h = −G is today's sea level); it continues below the sea as rock
const ISLAND = [[-215, -30], [-178, -9], [-158, -4.2], [-152, -1.2], [-149, 0], [134, 0], [137, -1.2], [141, -4.2], [162, -9], [205, -30]];
const TREES = [[-128, 7.5, 5.5], [-114, 9, 6], [-99, 6.5, 4.5], [-60, 7.5, 5], [56, 6.5, 4.5], [70, 8.5, 5.5], [86, 7, 4.8], [118, 8, 5.5]];

function crownRays(c, p) {
  for (let i = 0; i < 7; i++) {
    const a = (-1 + i / 3) * 1.25;
    const bx = Math.sin(a) * 1.7, by = p + 32.6 + Math.cos(a) * 1.2;
    const len = 3.1 * (0.75 + 0.25 * Math.cos(a));
    const tx = bx + Math.sin(a) * len, ty = by + Math.cos(a) * len * 0.92;
    const nx = Math.cos(a) * 0.32, ny = -Math.sin(a) * 0.32;
    poly(c, [[bx - nx, by - ny], [tx, ty], [bx + nx, by + ny]]);
  }
}
function flamePath(c, p) {
  c.moveTo(TORCH_X - 1.05, -(p + 42.4));
  c.bezierCurveTo(TORCH_X - 1.15, -(p + 44.2), TORCH_X - 0.3, -(p + 45.2), TORCH_X, -TOP);
  c.bezierCurveTo(TORCH_X + 0.3, -(p + 45.2), TORCH_X + 1.15, -(p + 44.2), TORCH_X + 1.05, -(p + 42.4));
  c.closePath();
}
function copperPath(c) {
  const p = PED;
  poly(c, BODY.map(([x, s]) => [x, p + s]));
  poly(c, ARM.map(([x, s]) => [x, p + s]));
  poly(c, TABLET.map(([x, s]) => [x, p + s]));
  c.moveTo(1.75, -(p + 31.3));
  c.ellipse(0, -(p + 31.3), 1.75, 2.65, 0, 0, Math.PI * 2);
  poly(c, [[TORCH_X - 0.45, p + 39.6], [TORCH_X + 0.45, p + 39.6], [TORCH_X + 0.55, p + 41.6], [TORCH_X - 0.55, p + 41.6]]);
  poly(c, [[TORCH_X - 1.3, p + 41.5], [TORCH_X + 1.3, p + 41.5], [TORCH_X + 1.55, p + 42.5], [TORCH_X - 1.55, p + 42.5]]);
  crownRays(c, p);
}
function statueOutline(c) {
  c.beginPath();
  poly(c, PEDESTAL);
  copperPath(c);
  flamePath(c, PED);
}

function paintIsland(c, mpp) {
  // rock + lawn as one body: lawn at the top, wet rock at today's waterline, fading into the sea's cross-section
  c.beginPath();
  poly(c, ISLAND);
  const g = c.createLinearGradient(0, 0, 0, 30);
  g.addColorStop(0, '#4d5a46');
  g.addColorStop(0.03, '#3b4639');
  g.addColorStop(0.1, '#2c3434');
  g.addColorStop(0.35, 'rgba(26,58,72,0.95)');
  g.addColorStop(1, 'rgba(14,38,58,0)');
  c.fillStyle = g;
  c.fill();
  // the lawn edge catches the low sun
  c.strokeStyle = 'rgba(214,226,190,0.4)';
  c.lineWidth = 1.2 * mpp;
  c.beginPath(); c.moveTo(-149, 0); c.lineTo(134, 0); c.stroke();
  // seawall faces
  c.fillStyle = 'rgba(150,150,140,0.35)';
  c.fillRect(-152, 0, 3, G);
  c.fillStyle = 'rgba(20,24,30,0.5)';
  c.fillRect(134, 0, 3, G);
  // trees: soft rounded crowns, back-lit
  for (const [x, h, r] of TREES) {
    c.fillStyle = '#3a5150';
    c.beginPath();
    c.ellipse(x, -(h - r * 0.45), r, r * 0.75, 0, 0, Math.PI * 2);
    c.ellipse(x - r * 0.55, -(h - r * 0.8), r * 0.7, r * 0.55, 0, 0, Math.PI * 2);
    c.ellipse(x + r * 0.6, -(h - r * 0.85), r * 0.65, r * 0.5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillRect(x - 0.4, -(h - r), 0.8, h - r);
    c.strokeStyle = 'rgba(200,225,215,0.22)';
    c.lineWidth = 1.1 * mpp;
    c.beginPath(); c.ellipse(x, -(h - r * 0.45), r, r * 0.75, 0, Math.PI * 1.05, Math.PI * 1.55); c.stroke();
  }
}

function paintStatue(c, mpp) {
  const p = PED;
  const fine = mpp < 0.35;
  // ---- fort + pedestal: granite, lit from the left
  c.save();
  c.beginPath();
  poly(c, PEDESTAL);
  const gg = c.createLinearGradient(-14, 0, 14, 0);
  gg.addColorStop(0, L.rgba(L.mix(GRANITE, [255, 236, 214], 0.28)));
  gg.addColorStop(0.55, L.rgba(GRANITE));
  gg.addColorStop(1, L.rgba(GRANITE_D));
  c.fillStyle = gg;
  c.fill();
  c.clip();
  c.fillStyle = L.rgba(FORT);
  c.fillRect(-36, -6.5, 72, 6.5);
  for (const [a, b, sh] of [[-35, -24, 0.16], [-24, -17, -0.12], [17, 24, 0.24], [24, 35, 0.42]]) {
    c.fillStyle = sh > 0 ? `rgba(24,26,36,${sh})` : `rgba(255,240,220,${-sh})`;
    c.fillRect(a, -6.5, b - a, 6.5);
  }
  c.fillStyle = 'rgba(255,240,220,0.35)';
  c.fillRect(-33, -6.6, 66, 0.5);
  c.fillStyle = 'rgba(36,34,36,0.38)';
  for (const h of [8.6, 20.6, 24, 37, 42.4, 44.6]) c.fillRect(-14, -h, 28, 0.55);
  c.fillStyle = 'rgba(255,240,220,0.3)';
  for (const h of [9.0, 21.0, 36.0, 44.6]) c.fillRect(-14, -h - 0.4, 28, 0.35);
  c.fillStyle = 'rgba(255,240,220,0.1)';
  c.fillRect(-4.4, -36, 8.8, 12);
  c.fillStyle = L.rgba([52, 52, 60], 0.85);
  c.beginPath();
  c.moveTo(-1.5, -26); c.lineTo(-1.5, -31.5); c.arc(0, -31.5, 1.5, Math.PI, 0); c.lineTo(1.5, -26); c.closePath(); c.fill();
  for (const ox of [-6.2, -3.6, -1.0, 1.6, 4.2]) c.fillRect(ox, -41.6, 1.6, 3.6);
  if (fine) {
    c.strokeStyle = 'rgba(56,52,50,0.2)';
    c.lineWidth = 0.18;
    for (let h = 25.5; h < 35.5; h += 1.6) { c.beginPath(); c.moveTo(-9.2, -h); c.lineTo(9.2, -h); c.stroke(); }
    for (let h = 9.8; h < 19; h += 1.8) { c.beginPath(); c.moveTo(-16, -h); c.lineTo(16, -h); c.stroke(); }
  }
  // dusk: the shaded right side cools towards the sky colour
  const sg = c.createLinearGradient(-2, 0, 16, 0);
  sg.addColorStop(0, 'rgba(40,70,100,0)');
  sg.addColorStop(1, 'rgba(40,70,100,0.28)');
  c.fillStyle = sg;
  c.fillRect(-2, -PED, 40, PED);
  c.restore();

  // ---- the copper statue
  c.save();
  c.beginPath();
  copperPath(c);
  const pg = c.createLinearGradient(-6.5, 0, 6.8, 0);
  pg.addColorStop(0, L.rgba(PATINA_L));
  pg.addColorStop(0.42, L.rgba(PATINA));
  pg.addColorStop(1, L.rgba(PATINA_D));
  c.fillStyle = pg;
  c.fill();
  c.clip();
  c.lineCap = 'round';
  const folds = [[-4.2, 25, -4.8, 1], [-2.4, 26.5, -3.0, 0.5], [-0.6, 27, -1.2, 0.3], [1.2, 26.5, 1.6, 0.4], [3.0, 25.5, 3.9, 0.6], [4.3, 22, 5.1, 1]];
  for (const [x0, s0, x1, s1] of folds) {
    c.strokeStyle = L.rgba(PATINA_D, 0.34);
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
  c.strokeStyle = L.rgba(PATINA_D, 0.5);
  c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(-4.6, -(p + 25)); c.quadraticCurveTo(0, -(p + 20.5), 4.6, -(p + 17.5)); c.stroke();
  c.fillStyle = L.rgba(PATINA_D, 0.55);
  c.beginPath(); poly(c, [[5.9, p + 25.9], [6.95, p + 18.6], [6.4, p + 18.45], [5.4, p + 25.75]]); c.fill();
  c.fillStyle = L.rgba(PATINA_D, 0.45);
  c.fillRect(0.4, -(p + 33.0), 1.4, 4.4);
  c.fillStyle = L.rgba(PATINA_L, 0.5);
  c.fillRect(-1.9, -(p + 33.25), 3.8, 0.55);
  c.restore();

  // ---- the gilded flame
  c.save();
  c.beginPath();
  flamePath(c, p);
  const fg = c.createLinearGradient(TORCH_X - 1.2, 0, TORCH_X + 1.2, 0);
  fg.addColorStop(0, '#fff3c4');
  fg.addColorStop(0.5, '#f4c15a');
  fg.addColorStop(1, '#b07a26');
  c.fillStyle = fg;
  c.fill();
  c.restore();

  // rim light on the sunlit (left) edges
  c.save();
  c.strokeStyle = 'rgba(255,236,214,0.5)';
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

/** Caustic light on the submerged part (local h below `wl`): drifting bright filaments, clipped to the statue. */
function paintCaustics(c, v, mpp, wl, a) {
  if (a <= 0.01 || wl <= 0.5) return;
  c.save();
  statueOutline(c);
  c.clip();
  c.beginPath();
  c.rect(-40, -wl, 80, wl + 1);
  c.clip();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  const t = v.gt;
  for (let i = 0; i < 16; i++) {
    const h0 = wl - 2 - i * 4.4;
    if (h0 < -2) break;
    const fade = L.clamp(1 - (wl - h0) / 60);
    c.strokeStyle = `rgba(170,240,225,${0.16 * a * fade})`;
    c.lineWidth = (0.35 + 0.25 * Math.sin(i * 1.7 + t)) * Math.max(1, mpp / 0.15);
    c.beginPath();
    for (let x = -36; x <= 36; x += 1.5) {
      const y = h0 + 1.1 * Math.sin(x * 0.42 + t * 1.9 + i * 2.1) + 0.7 * L.noise1(x * 0.18 + t * 0.8, i);
      if (x === -36) c.moveTo(x, -y); else c.lineTo(x, -y);
    }
    c.stroke();
  }
  c.restore();
}

/** How strongly New York sits on the top limb right now (the statue only exists at the limb). */
function limbK(v) {
  const P = PLACES.liberty;
  const p = worldOf(viewOf(v), P.lat, P.lon);
  return L.clamp(1 - Math.hypot(p.x, p.y) / 4000) * (p.z > -0.05 ? 1 : 0);
}

function drawStatue(ctx, v) {
  const mpp = v.cam.mpp;
  const hp = TOP / mpp;
  if (hp < 0.7) return;
  const sx = v.wx(0), sy = v.wy(-G);
  if (sx + 230 / mpp < -40 || sx - 230 / mpp > W + 40 || !v.visibleY(-LIBERTY.torch - 5, 30, 40)) return;
  const lk = limbK(v);
  if (lk <= 0) return;
  ctx.save();
  ctx.globalAlpha *= lk;
  ctx.translate(sx, sy);
  ctx.scale(1 / mpp, 1 / mpp);
  if (hp < 9) {
    // far away: a flat silhouette on its island
    ctx.fillStyle = '#34413c';
    ctx.beginPath(); poly(ctx, ISLAND); ctx.fill();
    ctx.fillStyle = 'rgba(120,150,140,0.95)';
    statueOutline(ctx); ctx.fill();
    ctx.restore();
    return;
  }
  paintIsland(ctx, mpp);
  paintStatue(ctx, mpp);
  // caustics on the drowned part (sea level relative to the island ground)
  const sea = seaLevel(v);
  paintCaustics(ctx, v, mpp, sea - G, L.clamp((sea - G) / 10));
  ctx.restore();
  // a glint on the gilded flame as the dive lands
  const b4 = v.tl.scenes[4].start;
  drawGlint(ctx, v, TORCH_X, -LIBERTY.torch + 0.6, v.gt - b4, 3.9);
}

function drawGlint(ctx, v, x, y, t, tp) {
  const g = L.prog(t, tp - 0.1, 0.8);
  if (g <= 0 || g >= 1) return;
  const a = Math.pow(Math.sin(Math.PI * Math.pow(g, 0.6)), 1.5);
  const sx = v.wx(x), sy = v.wy(y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(sx, sy);
  ctx.rotate(0.25 * g);
  for (const [len, wid, rot] of [[120, 2.5, 0], [80, 2, Math.PI / 2], [34, 1.4, Math.PI / 4], [34, 1.4, -Math.PI / 4]]) {
    ctx.save();
    ctx.rotate(rot);
    const lg = ctx.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, 'rgba(255,240,210,0)');
    lg.addColorStop(0.5, `rgba(255,240,210,${0.9 * a})`);
    lg.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-len, -wid / 2, 2 * len, wid);
    ctx.restore();
  }
  ctx.restore();
  L.lightBlob(ctx, sx, sy, 40, [255, 230, 190], 0.5 * a);
}

// ================================================================== the measurement layer (beats 4-5, overlay)
/** Global times of the rise story, from the voice timeline. */
export function riseTimes(tl) {
  const b4 = tl.scenes[4].start, b5 = tl.scenes[5].start;
  return {
    gauge: b4 + 3.95,          // the gauge fades in as the dive settles
    line: b4 + 4.1,          // the +70 m target line draws across
    label: b4 + 4.3,         // "+70 m" lands on "seventy meters"
    chest: b5 + 1.15,         // "...up to the chest": ring on her chest, label line changes
    out: shotStart('to-florida', tl) - 0.05,   // the climb out
  };
}

/** Big display label with a small tracked line under it; `sub2` crossfades in over `sub` with `s2`. */
function label(ctx, x, y, { big, sub, sub2, s2 = 0, k }) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.4);
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(2,10,20,0.6)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = L.rgba(ACCENT, 0.9);
  ctx.fillRect(x, y - 124, 84 * e, 4);
  // masked rise of the number
  // on "chest" the focus moves to the ring on her chest: the number eases back (smaller, a touch dimmer)
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 10, y - 112, 600, 132); ctx.clip();
  ctx.font = L.font(Math.round(L.lerp(112, 94, s2)), 800, L.FONT.display);
  ctx.fillStyle = L.rgba(ACCENT, L.lerp(1, 0.82, s2));
  L.trackedText(ctx, big, x, y + (1 - e) * 70, -1, 'left');
  ctx.restore();
  ctx.shadowBlur = 8;
  ctx.font = L.font(28, 600, L.FONT.body);
  const sy = y + 46 + (1 - e) * 14;
  if (s2 < 1) {
    ctx.fillStyle = `rgba(214,224,236,${0.95 * (1 - s2)})`;
    L.trackedText(ctx, sub.toUpperCase(), x, sy - s2 * 10, 3, 'left');
  }
  if (s2 > 0) {
    ctx.fillStyle = L.rgba(L.mix([214, 224, 236], ACCENT, 0.35), 0.98 * s2);
    L.trackedText(ctx, sub2.toUpperCase(), x, sy + (1 - s2) * 10, 3, 'left');
  }
  ctx.restore();
}

/**
 * The rise overlay (screen space, above the water). Called by s04 (beat 4) and s05 (beat 5) with the same clock.
 * `vis` = an extra visibility factor from the caller.
 */
export function riseOverlay(ctx, v, vis = 1) {
  const T = riseTimes(v.tl);
  const gt = v.gt;
  const kOut = 1 - L.ease.inCubic(L.prog(gt, T.out, 0.45));
  const kv = vis * kOut;
  if (kv <= 0.001 || gt < T.gauge - 0.05) return;
  const sea = seaLevel(v);
  const y0 = v.wy(0), yT = v.wy(-SEA.rise), yS = v.wy(-Math.max(0, sea));
  // ---- tide gauge (left of the statue)
  const gk = L.ease.outCubic(L.prog(gt, T.gauge, 0.5)) * kv;
  const gx = Math.max(64, v.wx(-46));
  if (gk > 0) {
    ctx.save();
    ctx.globalAlpha *= gk;
    ctx.lineCap = 'butt';
    // keep the gauge out of the caption band (y 1280-1390): clip at GY and fade the last stretch above it
    const GY = 1260, fa = (y) => L.clamp((GY - y) / 70);
    ctx.beginPath(); ctx.rect(0, 0, W, GY); ctx.clip();
    const yB = Math.min(y0, GY);
    // rail
    const fadeGrad = (rgb, a) => {
      if (y0 <= GY - 70) return L.rgba(rgb, a);
      const g = ctx.createLinearGradient(0, GY - 70, 0, GY);
      g.addColorStop(0, L.rgba(rgb, a)); g.addColorStop(1, L.rgba(rgb, 0));
      return g;
    };
    ctx.fillStyle = fadeGrad([6, 16, 28], 0.35);
    ctx.fillRect(gx - 5, yT - 6, 10, Math.max(0, yB - yT + 12));
    ctx.strokeStyle = fadeGrad([225, 235, 245], 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, yB); ctx.lineTo(gx, yT); ctx.stroke();
    // ticks every 10 m (long at 0 and 70)
    for (let m = 0; m <= SEA.rise; m += 10) {
      const y = v.wy(-m), long = m === 0 || m === SEA.rise;
      const on = sea >= m - 0.5, f = fa(y);
      if (f <= 0) continue;
      ctx.strokeStyle = on ? L.rgba(ACCENT, 0.95 * f) : `rgba(225,235,245,${0.55 * f})`;
      ctx.lineWidth = long ? 2 : 1.5;
      ctx.beginPath(); ctx.moveTo(gx - (long ? 14 : 8), y); ctx.lineTo(gx, y); ctx.stroke();
    }
    // fill rises with the sea
    if (sea > 0.2) {
      const fg = ctx.createLinearGradient(0, yS, 0, yB);
      fg.addColorStop(0, L.rgba(ACCENT, 0.95));
      fg.addColorStop(1, L.rgba(ACCENT, y0 > GY - 70 ? 0 : 0.35));
      ctx.fillStyle = fg;
      ctx.fillRect(gx - 2.5, yS, 5, Math.max(0, yB - yS));
      L.lightBlob(ctx, gx, yS, 26, ACCENT, 0.5);
    }
    ctx.font = L.font(20, 600, L.FONT.body);
    // "TODAY" sits just above the 0 m tick, right of the rail; it fades with the tick near the caption band
    const ft = fa(y0 - 12);
    if (ft > 0) {
      ctx.fillStyle = `rgba(225,235,245,${0.75 * ft})`;
      ctx.textBaseline = 'middle';
      L.trackedText(ctx, 'TODAY', gx + 14, y0 - 14, 2, 'left');
    }
    ctx.restore();
  }
  // ---- +70 m target line: draws from the gauge across the frame; brightens when the sea reaches it
  const lk = L.prog(gt, T.line, 0.9) * kv;
  if (lk > 0) {
    const e = L.ease.inOutCubic(L.clamp(lk / Math.max(kv, 1e-3)));
    const x1 = L.lerp(gx, W - 40, e);
    const hit = L.clamp((sea - (SEA.rise - 2)) / 2);
    ctx.save();
    ctx.globalAlpha *= kv;
    ctx.strokeStyle = L.rgba(L.mix([235, 242, 248], ACCENT, hit), 0.8);
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -gt * 12;
    ctx.beginPath(); ctx.moveTo(gx, yT); ctx.lineTo(x1, yT); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = L.rgba(ACCENT);
    ctx.fillRect(gx - 14, yT - 1.5, 14, 3);
    // the moment the water meets the line: a flash travels along it
    const fl = L.prog(gt, riseFull(v.tl) - 0.1, 0.9);
    if (fl > 0 && fl < 1) {
      const fx = L.lerp(gx, W, L.ease.outCubic(fl));
      const a = Math.sin(Math.PI * fl);
      const g = ctx.createLinearGradient(fx - 220, 0, fx, 0);
      g.addColorStop(0, L.rgba(ACCENT, 0));
      g.addColorStop(1, L.rgba(ACCENT, 0.9 * a));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(fx - 220, yT - 2, 220, 4);
      L.lightBlob(ctx, fx, yT, 40, ACCENT, 0.5 * a);
    }
    ctx.restore();
  }
  // ---- chest ring (beat 5): where the line meets her
  const ck = L.prog(gt, T.chest, 0.7) * kv;
  if (ck > 0) {
    const cx = v.wx(0.6), cy = v.wy(-CHEST);
    const e = L.ease.outCubic(L.clamp(ck / Math.max(kv, 1e-3)));
    ctx.save();
    ctx.globalAlpha *= kv;
    const pulse = L.prog(gt, T.chest, 1.1);
    if (pulse < 1) {
      ctx.strokeStyle = L.rgba(ACCENT, 0.6 * (1 - pulse));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, 22 + 70 * L.ease.outCubic(pulse)), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(245,250,252,0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, 20 + 18 * (1 - e)), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = L.rgba(ACCENT);
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, 4.5 * e), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // ---- the label, right of the statue, sitting on the line
  const kl = L.prog(gt, T.label, 0.6) * kv;
  const s2 = L.ease.inOutCubic(L.prog(gt, T.chest + 0.1, 0.5));
  label(ctx, v.wx(14), yT - 74, { big: '+70 m', sub: '230 ft higher seas', sub2: 'almost to her chest', s2, k: kl });
}
/** When the sea reaches +70 m (global seconds). */
const riseFull = (tl) => seaKeys(tl)[2][0];

export default {
  beat: 5,
  chapter: { num: '05', title: 'Statue of Liberty', sub: 'New York, 93 m to the torch' },
  captions: true,
  layer: 2,
  cues(d) {
    void d;
    return [
      { t: 0.68, name: 'ping', gain: 0.3, pitch: 1.25 },        // the water meets the +70 m line (sea keys: 22.76 s)
      { t: 1.15, name: 'tick', gain: 0.3, pitch: 1.1 },         // ring on her chest (riseTimes().chest)
      { t: 1.25, name: 'shimmer', gain: 0.18, pitch: 1.3 },
    ];
  },
  drawWorld(ctx, v) {
    // from the dive (beat 4) until the climb out of beat 6
    if (v.gt < v.tl.scenes[4].start + 1.5 || v.gt > v.tl.scenes[6].start + 3) return;
    drawStatue(ctx, v);
  },
  drawOverlay(ctx, v) {
    if (v.t < 0.02) return;   // s04's overlay draws it up to here
    riseOverlay(ctx, v, 1);
  },
};
