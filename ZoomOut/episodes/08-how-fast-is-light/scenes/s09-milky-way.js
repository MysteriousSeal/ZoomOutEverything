// Beat 9 — the Milky Way: from the far side, light has been travelling for tens of thousands of years.
// The pull-out continues until our whole galaxy resolves around us: a barred spiral (log-spiral arms,
// dust lanes on their inner edges, pink star-forming knots, a warm bar and bulge). "YOU ARE HERE" marks
// the Sun 26,000 ly from the centre. The far rim, ~74,000 light-years away, gets a reticle; a photon
// leaves it, passes beside the bar (not through the dusty core) and reaches us as the clock locks at 75,000 YEARS.
//
// The spiral is rendered once into an offscreen sprite (deterministic) with a mip chain, so frames stay
// cheap; it stays in the world afterwards and shrinks to a small smudge in the deep field (beat 10+).
import * as L from '../../../../engine/runtime/lib.js';
import { GALAXY, LY } from '../camera.js';
import { drawClock, PHOTON_GOLD } from './s01-one-second.js';
import { cruise, drawHit, drawReticle, drawRun, drawTag, frameT } from './s06-neptune.js';

const YR = 31557600;                                      // the clock reads world light-years as years
const R = GALAXY.r;                                       // 50,000 ly disc radius
const DG = Math.hypot(GALAXY.x, GALAXY.y);                // Sun → centre (26,000 ly)
const DIR = { x: GALAXY.x / DG, y: GALAXY.y / DG };       // from us toward the centre
// the far rim, rotated off the Sun-centre axis so its reticle sits clear of the clock
const FAR_ROT = -0.8;   // far enough off-axis that the straight path to us passes beside the bar, not through the dusty core
const FAR = {
  x: GALAXY.x + (DIR.x * Math.cos(FAR_ROT) - DIR.y * Math.sin(FAR_ROT)) * 49000 * LY,
  y: GALAXY.y + (DIR.x * Math.sin(FAR_ROT) + DIR.y * Math.cos(FAR_ROT)) * 49000 * LY,
};
const D_FAR = Math.hypot(FAR.x, FAR.y);
const FAR_LY = Math.round(D_FAR / LY / 1000) * 1000;     // label and lock value
const T0 = 2.25, TA = 4.3;                                // photon leaves the far side / reaches us (beat time)
const SUN_ANG = Math.atan2(-GALAXY.y, -GALAXY.x);         // direction of the Sun seen from the centre
const SUN_U = DG / R;                                     // 0.52

// ------------------------------------------------------------------ the sprite (built once, lazily)
const SP = 1600, SR = 600;                                // sprite size / disc radius in sprite px
const PITCH = 1 / Math.tan(15.5 * Math.PI / 180);           // log-spiral winding
const U0 = 0.26;                                          // bar half-length (disc radii): the two major arms start at its ends
// the bar lies ~30 deg off the Sun-centre line (as in the NASA/JPL-Caltech Milky Way illustration); the Sun then sits
// between Scutum-Centaurus/Perseus and the minor Sagittarius arm, on the Orion spur
const TH0 = SUN_ANG + Math.PI + 0.52;
const armAng = (u, ph) => ph + PITCH * Math.log(u / U0);
let MIPS = null;

function gauss(r) { return (r() + r() + r() + r() - 2) / 1.15; }

function buildSprite() {
  const cv = new OffscreenCanvas(SP, SP), c = cv.getContext('2d');
  const cx = SP / 2, cy = SP / 2;
  const P = (u, a) => [cx + Math.cos(a) * u * SR, cy + Math.sin(a) * u * SR];
  const blob = (x, y, r, col, a) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, L.rgba(col, a)); g.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  // clumpiness along an arm: star clouds and gaps (0.35..1)
  const clump = (u, ph) => 0.35 + 0.65 * L.clamp(0.55 + 0.5 * L.noise1(u * 14 + ph * 3.1, 7) + 0.25 * L.noise1(u * 37 + ph, 8));
  // disc haze
  c.globalCompositeOperation = 'lighter';
  const hz = c.createRadialGradient(cx, cy, 0, cx, cy, SR * 1.12);
  hz.addColorStop(0, 'rgba(255,210,155,0.26)');
  hz.addColorStop(0.1, 'rgba(240,196,150,0.2)');
  hz.addColorStop(0.4, 'rgba(150,160,205,0.085)');
  hz.addColorStop(1, 'rgba(110,130,200,0)');
  c.fillStyle = hz; c.fillRect(0, 0, SP, SP);
  const arms = [
    // Scutum-Centaurus and Perseus (major, from the bar ends); Norma and Sagittarius (minor, from the inner ring)
    { ph: TH0, w: 1, u0: U0 }, { ph: TH0 + Math.PI, w: 1, u0: U0 },
    { ph: TH0 + Math.PI / 2 + 0.25, w: 0.62, u0: 0.3 }, { ph: TH0 + Math.PI * 1.5 + 0.25, w: 0.62, u0: 0.3 },
  ];
  const r = L.rng(909);
  // arm haze: soft clouds along each arm, warm near the bar, bluer and fainter outward
  for (const arm of arms) {
    for (let i = 0; i < 220; i++) {
      const u = L.lerp(arm.u0, 1.02, Math.pow(i / 220, 0.85));
      const a = armAng(u, arm.ph) + gauss(r) * 0.07;
      const [x, y] = P(u * (1 + gauss(r) * 0.03), a);
      const col = L.mix([255, 214, 170], [140, 170, 255], L.clamp((u - 0.15) / 0.45));
      blob(x, y, SR * (0.05 + 0.08 * u) * (0.6 + 0.4 * arm.w), col, 0.06 * arm.w * (1.15 - u * 0.8) * clump(u, arm.ph));
    }
  }
  // the Orion spur: a short faint arm segment through the Sun, wound like the others
  for (let i = 0; i < 46; i++) {
    const u = L.lerp(0.43, 0.64, i / 46);
    const [x, y] = P(u, SUN_ANG + PITCH * Math.log(u / SUN_U) * 0.9 + gauss(r) * 0.02);
    blob(x, y, SR * 0.028, [160, 185, 255], 0.035);
  }
  // field stars (old disc population, warm) + a few inter-arm young stars
  for (let i = 0; i < 11000; i++) {
    const u = Math.min(1.1, -Math.log(1 - r() * 0.985) * 0.24);
    const [x, y] = P(u, r() * Math.PI * 2);
    c.fillStyle = `rgba(255,226,196,${0.08 + 0.22 * r()})`;
    c.fillRect(x, y, 1.2, 1.2);
  }
  // dust lanes on the inner (concave) edge of the arms
  c.globalCompositeOperation = 'source-over';
  for (const arm of arms) {
    for (let i = 0; i < 1500 * arm.w; i++) {
      const u = L.lerp(arm.u0 + 0.01, 0.82, Math.pow(r(), 0.9));
      const a = armAng(u, arm.ph) - (0.1 + 0.04 * u) - Math.abs(gauss(r)) * 0.04;
      const [x, y] = P(u * (1 + gauss(r) * 0.01), a);
      const rr = SR * (0.006 + 0.012 * r());
      const g = c.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(12,7,5,${0.5 * Math.min(1, arm.w * 1.2) * clump(u, arm.ph + 2)})`); g.addColorStop(1, 'rgba(12,7,5,0)');
      c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }
  // dust across the bar
  for (let i = 0; i < 260; i++) {
    const side = r() < 0.5 ? 1 : -1, along = L.lerp(0.06, U0 * 0.9, r());
    // offset to the leading side of the bar (perpendicular), lanes curl into the arm roots
    const off = 0.05 + 0.03 * along / U0;
    const bx = side * along, by = side * off * (along > 0.06 ? 1 : 0.5);
    const x = cx + (Math.cos(TH0) * bx - Math.sin(TH0) * by) * SR, y = cy + (Math.sin(TH0) * bx + Math.cos(TH0) * by) * SR;
    blob(x, y, SR * L.lerp(0.006, 0.012, r()), [12, 7, 5], 0.1);
  }
  // young arm stars (density follows the clumps)
  c.globalCompositeOperation = 'lighter';
  for (const arm of arms) {
    for (let i = 0; i < 12000 * arm.w; i++) {
      const u = L.lerp(arm.u0, 1.05, Math.pow(r(), 0.8));
      if (r() > clump(u, arm.ph)) continue;
      const a = armAng(u, arm.ph) + gauss(r) * (0.07 + 0.07 * u) * (r() < 0.25 ? 2.2 : 1);
      const [x, y] = P(u * (1 + gauss(r) * 0.035), a);
      const b = r();
      c.fillStyle = b > 0.975 ? 'rgba(236,242,255,0.85)' : `rgba(180,202,255,${0.1 + 0.28 * b})`;
      const s = b > 0.975 ? 1.7 : 1.1;
      c.fillRect(x, y, s, s);
    }
    // a few pink star-forming nebulae, clustered on the arm crests
    for (let i = 0; i < 12 * arm.w; i++) {
      const u = L.lerp(0.25, 0.85, r());
      const a0 = armAng(u, arm.ph) + gauss(r) * 0.025;
      const n = 1 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) {
        const [x, y] = P(u + gauss(r) * 0.008, a0 + gauss(r) * 0.012);
        blob(x, y, SR * L.lerp(0.004, 0.009, r()), [255, 120, 170], 0.32);
      }
    }
  }
  // the inner ring (where the minor arms root) and the central bar: old warm stars, clearly elongated
  for (let i = 0; i < 5000; i++) {
    const a = r() * Math.PI * 2, rr = 0.3 * (1 + gauss(r) * 0.06);
    const bx = Math.cos(a) * rr, by = Math.sin(a) * rr * 0.82;
    const x = cx + (Math.cos(TH0) * bx - Math.sin(TH0) * by) * SR, y = cy + (Math.sin(TH0) * bx + Math.cos(TH0) * by) * SR;
    c.fillStyle = `rgba(255,${200 + 30 * r() | 0},170,${0.08 + 0.22 * r()})`;
    c.fillRect(x, y, 1.2, 1.2);
  }
  for (let i = 0; i < 9000; i++) {
    const bx = gauss(r) * U0 * 0.5, by = gauss(r) * U0 * 0.12;
    const x = cx + (Math.cos(TH0) * bx - Math.sin(TH0) * by) * SR, y = cy + (Math.sin(TH0) * bx + Math.cos(TH0) * by) * SR;
    c.fillStyle = `rgba(255,${205 + 35 * r() | 0},${150 + 50 * r() | 0},${0.12 + 0.3 * r()})`;
    c.fillRect(x, y, 1.3, 1.3);
  }
  c.save();
  c.translate(cx, cy);
  c.rotate(TH0);
  c.scale(1, 0.3);
  blob(0, 0, SR * U0 * 1.3, [255, 196, 135], 0.5);
  blob(0, 0, SR * U0 * 0.85, [255, 214, 160], 0.42);
  c.restore();
  c.save();
  c.translate(cx, cy);
  c.rotate(TH0);
  c.scale(1, 0.55);
  blob(0, 0, SR * 0.09, [255, 226, 180], 0.4);
  c.restore();
  blob(cx, cy, SR * 0.028, [255, 240, 215], 0.5);
  // mip chain (successive halving keeps the far zoom-out smooth)
  const mips = [cv];
  let src = cv, s = SP;
  while (s > 24) {
    s = Math.round(s / 2);
    const m = new OffscreenCanvas(s, s), mc = m.getContext('2d');
    mc.imageSmoothingQuality = 'high';
    mc.drawImage(src, 0, 0, s, s);
    mips.push(m);
    src = m;
  }
  return mips;
}

/** Draws the galaxy at its world position. Visible once it fits the frame; shrinks into the deep field. */
function drawGalaxy(ctx, v, t) {
  const rpx = R / v.cam.mpp;
  const k = L.clamp((2600 - rpx) / 1500);
  if (k <= 0.005) return;
  const gx = v.wx(GALAXY.x), gy = v.wy(GALAXY.y);
  const half = rpx * (SP / 2) / SR;
  if (gx + half < -50 || gx - half > L.W + 50 || gy + half < -50 || gy - half > L.H + 50) return;
  if (!MIPS) MIPS = buildSprite();
  const size = half * 2;
  let m = MIPS[0];
  for (const mm of MIPS) if (mm.width >= size) m = mm;
  const spin = -0.03 * L.clamp((t + 1) / 9);              // a slow, barely-there rotation
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(gx, gy);
  ctx.rotate(spin);
  ctx.drawImage(m, -half, -half, size, size);
  ctx.restore();
  // live core: a slow breathing glow
  if (rpx > 40) {
    const br = 1 + 0.05 * Math.sin(v.gt * 1.4);
    L.lightBlob(ctx, gx, gy, rpx * 0.22 * br, [255, 215, 160], 0.22 * k);
  } else {
    L.lightBlob(ctx, gx, gy, Math.max(3, rpx * 1.4), [255, 225, 190], 0.35 * k);
  }
}

const traveled = (t) => D_FAR * cruise(L.prog(t, T0, TA - T0), 0.15);

export default {
  beat: 9,
  chapter: { num: '09', title: 'The Milky Way', sub: 'Our galaxy, 100,000 light-years across' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.15, name: 'dive', gain: 0.22, pitch: 0.7 },
      { t: 1.3, name: 'swell', gain: 0.18, pitch: 0.8 },
      { t: 1.9, name: 'blip', gain: 0.2, pitch: 0.8 },
      { t: T0 - 0.05, name: 'swish', gain: 0.24, pitch: 0.85 },
      { t: T0 + 0.5, name: 'count', gain: 0.14, pitch: 0.9 },
      { t: (T0 + TA) / 2 - 0.1, name: 'shimmer', gain: 0.14, pitch: 0.9 },
      { t: TA, name: 'impact', gain: 0.3, pitch: 1.0 },
      { t: TA + 0.02, name: 'tick', gain: 0.42, pitch: 1.0 },
      { t: TA + 0.08, name: 'bloom', gain: 0.18, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < -0.2) return;
    drawGalaxy(ctx, v, t);
    if (t < T0 || t > v.d + 1.4) return;
    const fx = v.wx(FAR.x), fy = v.wy(FAR.y), ex = v.wx(0), ey = v.wy(0);
    // departure: a gold flash on the far rim as the light leaves it (this run comes inward, to us)
    drawHit(ctx, fx, fy, t - T0, { size: 0.5 });
    const r = traveled(t);
    const ux = -FAR.x / D_FAR, uy = -FAR.y / D_FAR;
    const hx = fx + ux * r / v.cam.mpp, hy = fy + uy * r / v.cam.mpp;
    const after = t - TA;
    drawRun(ctx, fx, fy, hx, hy, {
      after, t0k: L.ease.outCubic(L.prog(t, T0, 0.25)), fade: 1 - L.ease.inCubic(L.prog(t, v.d - 0.2, 0.9)), gt: v.gt,
    });
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const fx = v.wx(FAR.x), fy = v.wy(FAR.y), ex = v.wx(0), ey = v.wy(0);
    // you are here
    const kh = L.prog(t, 1.75, 0.6) * v.k;
    drawReticle(ctx, ex, ey, 20, kh, [235, 230, 222], 0.8, v.gt);
    drawTag(ctx, ex + 16, ey - 14, ex + 76, ey - 70, 'YOU ARE HERE', L.prog(t, 1.9, 0.6) * v.k, { col: [240, 236, 228] });
    // the far side
    const kf = L.prog(t, 1.55, 0.5) * v.k;
    drawReticle(ctx, fx, fy, 18, kf, PHOTON_GOLD, 0.9, -v.gt);
    // tag up and to the right of the reticle: clear of the photon's route (which runs down-right) and of the clock
    drawTag(ctx, fx + 15, fy - 15, fx + 50, fy - 66, 'FAR SIDE', L.prog(t, 1.7, 0.6) * v.k,
      { col: [255, 232, 190], sub: `${L.fmt(FAR_LY)} light-years` });
    const tq = frameT(v);
    drawClock(ctx, v, { sec: FAR_LY * YR * (tq >= TA ? 1 : traveled(tq) / D_FAR), lockAt: TA, lockLabel: 'FAR SIDE TO EARTH' });
  },
};
