// Beat 4 — "People and mammoths walked across these land bridges."
// The Beringia close-up at −120 m. A faint dotted route crosses the dry land bridge west → east (Chukotka → Alaska;
// every point is dry at −120 m, min −64 m in the grid), and a small symbolic procession walks slowly along it:
// two woolly mammoths (a cow and a calf) leading, three hunters following a little way behind.
// The silhouettes are symbolic markers (cow ≈ 56 px at the shoulder) drawn to ONE scale:
//   * woolly mammoth (shoulder ≈ 3 m): high domed head with a saddle behind it, shoulder hump, back sloping down to
//     low hindquarters, long ivory tusks curving down-forward then up and in, a trunk with a slight forward curl, a small
//     ear, a short tail, a shaggy fringe under the belly and on the legs, pillar legs in a lateral-sequence walk;
//   * people (≈ 1.65 m → 0.55 × the cow's shoulder): upright, hooded hide parkas to the knee, leggings, alternating
//     legs and counter-swinging arms, spears carried sloped forward; one carries a pack.
// Dark bodies with a thin NW rim light (the hillshade's light), soft contact shadows to the SE, and a drifting dust
// trail left on the ground behind each walker. Depth order: far-side legs/tusk behind the body; the walkers are
// spaced so nothing overlaps, and they are drawn back-to-front by screen y. A small BERINGIA tag sits below them.
// Everything fades out at the end of the beat, before the camera leaves for the Atlantic.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, project } from '../env.js';
import { makeRoute, along, tag, WALK } from './s01-bering.js';

const TAU = Math.PI * 2;
const ROUTE = makeRoute([[65.0, -179.0], [64.9, -176.0], [64.75, -173.0], [64.7, -170.5], [64.75, -168.2], [64.95, -165.5], [65.2, -162.5]]);
const DEG_M = 111195;           // metres per route unit (≈ 1° of arc)

const DARK = [24, 21, 20];
const RIM = [255, 232, 196];
const IVORY = [232, 220, 196];
const FR = (() => { const r = L.rng(7); return Array.from({ length: 27 }, () => r()); })();   // belly-fringe strand lengths

function times(tl) {
  const s = tl.scenes[4];
  return { route: s.start + 1.35, walk0: s.start + 1.45, end: s.end };   // after the camera lands (≈ 27.4)
}
/** visibility of the whole layer */
function vis(v, tm) {
  return L.ease.outCubic(L.prog(v.gt, tm.walk0, 0.6)) * (1 - L.ease.inCubic(L.prog(v.gt, tm.end - 0.45, 0.4)));
}

// ------------------------------------------------------------------ silhouettes (local units, x forward, y up)
/** Leg as a slightly tapered pillar from hip (hx, hy) swung by angle a; foot flat on y = 0 (lift ≥ 0). */
function pillar(c, hx, hy, w, a, lift, H, ox, oy) {
  const len = hy - lift;
  const fx = hx + Math.sin(a) * len, fy = lift;
  const nx = Math.cos(a), ny = -Math.sin(a);       // perpendicular (in local y-up)
  const P = (x, y) => [ox + x * H, oy - y * H];
  c.beginPath();
  c.moveTo(...P(hx - nx * w * 0.55, hy - ny * w * 0.55));
  c.lineTo(...P(hx + nx * w * 0.55, hy + ny * w * 0.55));
  c.lineTo(...P(fx + nx * w * 0.5, fy + ny * w * 0.5 + 0.02));
  c.quadraticCurveTo(...P(fx + nx * w * 0.5, fy - 0.01), ...P(fx, fy - 0.01));
  c.quadraticCurveTo(...P(fx - nx * w * 0.5, fy - 0.01), ...P(fx - nx * w * 0.5, fy + ny * w * 0.5 + 0.02));
  c.closePath();
}

/** Woolly mammoth facing +x. (x, y) = ground point under the body centre; H = shoulder height px; ph = gait phase. */
function mammoth(c, x, y, H, ph, col, rimA) {
  const P = (u, w) => [x + u * H, y - w * H];
  const bob = 0.012 * Math.sin(ph * TAU * 2);
  /** hanging hair strands between u0..u1 at height w (local units), lengths l0..l1, swaying with the gait */
  const hair = (u0, u1, w, l0, l1, n, seed) => {
    c.save();
    c.strokeStyle = c.fillStyle;
    c.lineCap = 'round';
    c.lineWidth = Math.max(0.9, H * 0.028);
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n, r = FR[(i * 7 + Math.abs(Math.round(seed)) * 3) % FR.length];
      const u = L.lerp(u0, u1, f) + (r - 0.5) * 0.02;
      const len = L.lerp(l0, l1, r);
      const sway = -0.025 - 0.012 * Math.sin(ph * TAU + i * 0.9);
      c.moveTo(...P(u, w + 0.04));
      c.quadraticCurveTo(...P(u, w - len * 0.5), ...P(u + sway, w - len));
    }
    c.stroke();
    c.restore();
  };
  const legs = (far) => {
    // lateral sequence walk: LH 0, LF .25, RH .5, RF .75 (far side = right side when facing +x)
    const set = far ? [[-0.43, 0.5], [0.40, 0.75]] : [[-0.47, 0.0], [0.36, 0.25]];
    for (const [hx, off] of set) {
      const s = Math.sin((ph + off) * TAU);
      const a = 0.24 * s;
      const lift = Math.max(0, Math.cos((ph + off) * TAU)) * 0.05;
      pillar(c, hx, 0.62 + bob, hx < 0 ? 0.17 : 0.18, a, lift, H, x, y);
      c.fill();
      // shaggy hair hanging over the upper leg
      hair(hx - 0.09 + Math.sin(a) * 0.12, hx + 0.09 + Math.sin(a) * 0.12, 0.47 + bob, 0.08, 0.15, 5, hx * 13);
    }
  };
  const tusk = (dx, dy, w0, colT) => {
    // emerges low on the face, sweeps down-forward, then up and curls back in
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, it = 1 - t;
      const p0 = [0.71, 0.60], p1 = [0.80, 0.22], p2 = [1.16, 0.26], p3 = [1.02, 0.66];
      pts.push([it ** 3 * p0[0] + 3 * it * it * t * p1[0] + 3 * it * t * t * p2[0] + t ** 3 * p3[0] + dx,
        it ** 3 * p0[1] + 3 * it * it * t * p1[1] + 3 * it * t * t * p2[1] + t ** 3 * p3[1] + dy + bob]);
    }
    c.save();
    c.strokeStyle = L.rgba(colT);
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      c.lineWidth = Math.max(0.6, H * w0 * (1 - i / 16 * 0.8));
      c.beginPath(); c.moveTo(...P(...pts[i])); c.lineTo(...P(...pts[i + 1])); c.stroke();
    }
    c.restore();
  };
  const body = () => {
    const b = bob;
    c.beginPath();
    c.moveTo(...P(-0.64, 0.74 + b));                                       // rump top
    c.bezierCurveTo(...P(-0.45, 0.90 + b), ...P(-0.10, 0.98 + b), ...P(0.18, 1.03 + b));   // sloping back up to the hump
    c.quadraticCurveTo(...P(0.30, 1.03 + b), ...P(0.36, 0.98 + b));       // neck saddle
    c.bezierCurveTo(...P(0.40, 1.10 + b), ...P(0.56, 1.16 + b), ...P(0.66, 1.04 + b));    // high domed head
    c.bezierCurveTo(...P(0.74, 0.96 + b), ...P(0.77, 0.84 + b), ...P(0.77, 0.72 + b));    // forehead → face
    // trunk: hangs, slight forward curl at the tip
    c.bezierCurveTo(...P(0.80, 0.50 + b), ...P(0.80, 0.28 + b), ...P(0.79, 0.12 + b));
    c.quadraticCurveTo(...P(0.82, 0.06 + b), ...P(0.78, 0.05 + b));
    c.quadraticCurveTo(...P(0.73, 0.06 + b), ...P(0.73, 0.14 + b));
    c.bezierCurveTo(...P(0.72, 0.32 + b), ...P(0.70, 0.48 + b), ...P(0.66, 0.58 + b));
    // jaw, throat, shaggy chest
    c.quadraticCurveTo(...P(0.60, 0.55 + b), ...P(0.56, 0.50 + b));
    c.lineTo(...P(0.52, 0.36 + b)); c.lineTo(...P(0.48, 0.44 + b)); c.lineTo(...P(0.44, 0.34 + b));
    // belly (the hair skirt is drawn as strands below)
    c.bezierCurveTo(...P(0.30, 0.37 + b), ...P(-0.30, 0.37 + b), ...P(-0.52, 0.40 + b));
    // hindquarters
    c.bezierCurveTo(...P(-0.62, 0.40 + b), ...P(-0.68, 0.56 + b), ...P(-0.66, 0.66 + b));
    c.closePath();
    c.fill();
    // shaggy coat: a long hair skirt under the belly, a ruff on the throat and chest, hair on the hindquarters
    hair(-0.54, 0.44, 0.40 + b, 0.06, 0.15, 26, 1);
    hair(0.44, 0.60, 0.50 + b, 0.07, 0.14, 6, 2);
    hair(-0.66, -0.52, 0.46 + b, 0.05, 0.1, 4, 3);
    // short tail with a tuft
    c.beginPath();
    c.moveTo(...P(-0.64, 0.70 + b));
    c.quadraticCurveTo(...P(-0.71, 0.62 + b), ...P(-0.70, 0.50 + b));
    c.lineTo(...P(-0.73, 0.45 + b)); c.lineTo(...P(-0.66, 0.48 + b));
    c.quadraticCurveTo(...P(-0.67, 0.6 + b), ...P(-0.61, 0.68 + b));
    c.fill();
  };
  // layered: far legs + far tusk (darker), body + near legs, ear, near tusk
  const draw = (fillA, colB) => {
    c.fillStyle = L.rgba(L.mix(colB, [0, 0, 0], 0.25), fillA);
    legs(true);
    c.fillStyle = L.rgba(colB, fillA);
    body();
    legs(false);
  };
  // rim pass: the same shapes, lit, nudged toward the light (NW)
  c.save();
  c.translate(-Math.max(1, H * 0.022), -Math.max(1, H * 0.026));
  draw(rimA, RIM);
  c.restore();
  tusk(0.035, 0.02, 0.05, L.mix(IVORY, [60, 50, 40], 0.45));          // far tusk, in shadow
  draw(1, col);
  // small ear (just behind the eye line) as a subtle lighter edge
  c.strokeStyle = L.rgba(RIM, 0.35 * rimA);
  c.lineWidth = Math.max(0.8, H * 0.018);
  c.beginPath();
  c.moveTo(...P(0.47, 0.90 + bob)); c.quadraticCurveTo(...P(0.43, 0.80 + bob), ...P(0.50, 0.74 + bob)); c.stroke();
  tusk(0, 0, 0.065, IVORY);
}

/** A hunter facing +x. (x, y) = ground point; h = height px; ph = gait phase; pack = carries a bundle. */
function human(c, x, y, h, ph, col, rimA, pack) {
  const P = (u, w) => [x + u * h, y - w * h];
  const s = Math.sin(ph * TAU);
  const bob = 0.012 * Math.abs(Math.cos(ph * TAU));
  const leg = (sw) => {
    // hip → knee → foot; the swinging leg bends its knee
    const hip = [0, 0.49 + bob];
    const a = 0.42 * sw;
    const thigh = 0.25, shin = 0.25;
    const knee = [hip[0] + Math.sin(a) * thigh, hip[1] - Math.cos(a) * thigh];
    const bend = Math.max(0, -sw) * 0.5 + 0.08;
    const foot = [knee[0] + Math.sin(a - bend) * shin, Math.max(0, knee[1] - Math.cos(a - bend) * shin)];
    c.lineWidth = Math.max(1.2, h * 0.075);
    c.beginPath(); c.moveTo(...P(...hip)); c.lineTo(...P(...knee)); c.lineTo(...P(...foot)); c.stroke();
    c.lineWidth = Math.max(1, h * 0.05);
    c.beginPath(); c.moveTo(...P(foot[0] - 0.02, foot[1] + 0.01)); c.lineTo(...P(foot[0] + 0.07, foot[1] + 0.01)); c.stroke();
  };
  const arm = (sw) => {
    const sh = [0.0, 0.79 + bob];
    const el = [sh[0] + 0.15 * sw * 0.6, sh[1] - 0.15];
    const hd = [el[0] + 0.06 + 0.08 * sw, el[1] - 0.13];
    c.lineWidth = Math.max(1.1, h * 0.06);
    c.beginPath(); c.moveTo(...P(...sh)); c.lineTo(...P(...el)); c.lineTo(...P(...hd)); c.stroke();
    return hd;
  };
  const figure = (colA, a) => {
    c.strokeStyle = L.rgba(colA, a); c.fillStyle = L.rgba(colA, a);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // far leg + far arm (darker)
    c.strokeStyle = L.rgba(L.mix(colA, [0, 0, 0], 0.3), a);
    leg(-s); arm(s);
    c.strokeStyle = L.rgba(colA, a);
    // pack (behind the back)
    if (pack) { c.beginPath(); c.ellipse(...P(-0.11, 0.70 + bob), h * 0.075, h * 0.12, -0.2, 0, TAU); c.fill(); }
    // hide parka: shoulders → flared ragged hem at the knee
    c.beginPath();
    c.moveTo(...P(-0.07, 0.82 + bob));
    c.quadraticCurveTo(...P(0.02, 0.86 + bob), ...P(0.08, 0.80 + bob));
    c.lineTo(...P(0.12, 0.38 + bob));
    c.lineTo(...P(0.06, 0.35 + bob)); c.lineTo(...P(0.02, 0.38 + bob)); c.lineTo(...P(-0.04, 0.34 + bob)); c.lineTo(...P(-0.11, 0.38 + bob));
    c.closePath(); c.fill();
    // head under a fur-ruffed hood
    c.beginPath(); c.arc(...P(0.025, 0.925 + bob), Math.max(0, h * 0.072), 0, TAU); c.fill();
    c.beginPath(); c.moveTo(...P(-0.05, 0.86 + bob)); c.quadraticCurveTo(...P(-0.07, 1.0 + bob), ...P(0.03, 1.005 + bob)); c.lineTo(...P(0.0, 0.88 + bob)); c.fill();
    leg(s);
    const hd = arm(-s * 0.6);
    // spear: held at the near hand, sloped forward-up, with a stone point (no rim pass: it would double the shaft)
    if (colA === RIM) return;
    const ang = 0.95, back = 0.42, fwd = 0.78;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const t0 = [hd[0] - dx * back, hd[1] - dy * back], t1 = [hd[0] + dx * fwd, hd[1] + dy * fwd];
    c.lineWidth = Math.max(0.8, h * 0.03);
    c.beginPath(); c.moveTo(...P(...t0)); c.lineTo(...P(...t1)); c.stroke();
    c.beginPath();
    c.moveTo(...P(t1[0] + dx * 0.11, t1[1] + dy * 0.11));
    c.lineTo(...P(t1[0] - dy * 0.03, t1[1] + dx * 0.03));
    c.lineTo(...P(t1[0] + dy * 0.03, t1[1] - dx * 0.03));
    c.closePath(); c.fill();
  };
  c.save();
  c.translate(-Math.max(0.7, h * 0.03), -Math.max(0.7, h * 0.035));
  figure(RIM, rimA);
  c.restore();
  figure(col, 1);
}

/** Soft contact shadow, cast to the SE (light from the NW). */
function shadow(c, x, y, w, a) {
  c.save();
  c.translate(x + w * 0.12, y + 1.5);
  c.scale(1, 0.22);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, w * 0.6);
  g.addColorStop(0, `rgba(30,20,10,${0.42 * a})`);
  g.addColorStop(1, 'rgba(30,20,10,0)');
  c.fillStyle = g;
  c.fillRect(-w * 0.6, -w * 0.6, w * 1.2, w * 1.2);
  c.restore();
}

// ------------------------------------------------------------------ the procession
// lead offset (px behind the leader along the route), kind, size factor, gait rate (cycles/s), lane (px, + = nearer)
const MEMBERS = [
  { off: 0, kind: 'm', s: 1.0, rate: 0.62, lane: -4, ph: 0.0 },
  { off: 80, kind: 'm', s: 0.62, rate: 0.85, lane: 2, ph: 0.37 },            // calf, close to its mother
  { off: 150, kind: 'h', s: 0.55, rate: 1.05, lane: 6, ph: 0.15, pack: false },
  { off: 190, kind: 'h', s: 0.53, rate: 1.08, lane: 4, ph: 0.62, pack: true },
  { off: 230, kind: 'h', s: 0.56, rate: 1.02, lane: 7, ph: 0.4, pack: false },
];
const H0 = 56;                 // the cow's shoulder height (px)
const SPEED = 24;              // px/s along the route (symbolic)
const U_LEAD = 0.42;           // route fraction of the leader at walk0

function memberAt(v, tm, m) {
  const mpp = v.cam.mpp;
  const pxToU = mpp / DEG_M / ROUTE.len;
  const t = v.gt - tm.walk0;
  const u = U_LEAD + (t * SPEED - m.off) * pxToU;
  const p = project(v, ...along(ROUTE, u));
  const q = project(v, ...along(ROUTE, u + 4 * pxToU));
  const dir = Math.sign(q.x - p.x) || 1;
  return { x: p.x, y: p.y + m.lane, z: p.z, dir, u, pxToU };
}

function drawDust(c, v, tm, m, a) {
  // puffs left on the ground behind the walker: born every 0.16 s, live 1.3 s, world-anchored (they stay put on the map)
  const period = 0.16, life = 1.3;
  const t = v.gt - tm.walk0;
  const n = Math.ceil(life / period);
  const rnd = L.rng(11 + m.off);
  const jit = Array.from({ length: 64 }, () => rnd());
  const k0 = Math.floor(t / period);
  for (let i = 0; i < n; i++) {
    const k = k0 - i;
    const tb = k * period;
    const age = t - tb;
    if (age < 0 || age > life || tb < -0.3) continue;
    const pxToU = v.cam.mpp / DEG_M / ROUTE.len;
    const u = U_LEAD + (tb * SPEED - m.off - (m.kind === 'm' ? 0.3 : 0.1) * H0 * m.s) * pxToU;
    const p = project(v, ...along(ROUTE, u));
    const j = jit[((k % 32) + 32) % 32 * 2 % 64], j2 = jit[(((k % 32) + 32) % 32 * 2 + 1) % 64];
    const f = age / life;
    const r = (m.kind === 'm' ? 7 : 4) * (0.6 + 1.6 * f) * (0.8 + 0.4 * j);
    const al = a * (m.kind === 'm' ? 0.26 : 0.16) * Math.sin(Math.PI * Math.min(1, f * 1.2)) * (1 - f);
    if (al <= 0.004) continue;
    const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(0.1, r));
    g.addColorStop(0, `rgba(236,222,190,${al})`);
    g.addColorStop(1, 'rgba(236,222,190,0)');
    c.fillStyle = g;
    const px = p.x - 8 * f + (j2 - 0.5) * 6, py = p.y + m.lane - 3 - 10 * f;   // drifts up and back
    c.fillRect(px - r, py - r, r * 2, r * 2);
  }
}

function drawRoute(c, v, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  c.lineCap = 'round';
  c.setLineDash([2, 9]);
  c.lineWidth = 2.4;
  c.strokeStyle = L.rgba(WALK, 0.55);
  c.beginPath();
  const n = 120;
  let pen = false;
  for (let i = 0; i <= n; i++) {
    const p = project(v, ...along(ROUTE, i / n));
    if (p.z < 0.05) { pen = false; continue; }
    if (pen) c.lineTo(p.x, p.y); else { c.moveTo(p.x, p.y); pen = true; }
  }
  c.stroke();
  c.setLineDash([]);
  // a small chevron at the east end: the direction of travel (drawn shape; Avenir has no arrow glyphs)
  const a = project(v, ...along(ROUTE, 0.985)), b = project(v, ...along(ROUTE, 1));
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  c.translate(b.x, b.y); c.rotate(ang);
  c.strokeStyle = L.rgba(WALK, 0.75);
  c.lineWidth = 2.6; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-9, -7); c.lineTo(0, 0); c.lineTo(-9, 7); c.stroke();
  c.restore();
}

export default {
  beat: 4,
  chapter: null,
  layer: 4,
  // beat 25.77: route 26.32, procession 26.42 →, fade 28.9
  cues(d) {
    const out = [{ t: 0.55, name: 'swish', gain: 0.14, pitch: 0.8 }, { t: 1.1, name: 'blip', gain: 0.15, pitch: 0.9 }];
    for (let i = 0; i < 5; i++) out.push({ t: 0.9 + i * 0.6, name: 'deep', gain: 0.05, pitch: 0.55 + (i % 2) * 0.05 });   // heavy footfalls
    return out;
  },
  drawWorld(ctx, v) {
    const tm = times(v.tl);
    if (v.gt < tm.route - 0.1 || v.gt > tm.end + 0.1) return;
    const a = vis(v, tm);
    drawRoute(ctx, v, L.ease.outCubic(L.prog(v.gt, tm.route, 0.6)) * (1 - L.ease.inCubic(L.prog(v.gt, tm.end - 0.45, 0.4))) * 0.9);
    if (a <= 0) return;
    const t = v.gt - tm.walk0;
    const list = MEMBERS.map((m) => ({ m, p: memberAt(v, tm, m) })).filter((o) => o.p.z > 0.05);
    ctx.save();
    ctx.globalAlpha = a;
    for (const { m } of list) drawDust(ctx, v, tm, m, 1);
    // back-to-front by screen y (farther = higher on the map); ties keep procession order
    list.sort((A, B) => A.p.y - B.p.y);
    for (const { m, p } of list) {
      const H = H0 * m.s;
      const w = m.kind === 'm' ? H * 1.5 : H * 0.35;
      shadow(ctx, p.x, p.y, w, 1);
      ctx.save();
      if (p.dir < 0) { ctx.translate(p.x, 0); ctx.scale(-1, 1); ctx.translate(-p.x, 0); }
      if (m.kind === 'm') mammoth(ctx, p.x, p.y, H, t * m.rate + m.ph, DARK, 0.85);
      else human(ctx, p.x, p.y, H, t * m.rate + m.ph, DARK, 0.45, m.pack);
      ctx.restore();
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const tm = times(v.tl);
    const a = Math.min(v.k, L.prog(v.gt, tm.walk0 + 0.5, 0.5)) * vis(v, tm);
    const p = project(v, 63.35, -171.0);
    tag(ctx, 'BERINGIA', Math.min(p.x, 940 - 200), p.y + 60, a * L.clamp(p.z * 5),
      { size: 30, track: 6, maxW: 420, align: 'center', sub: 'THE BERING LAND BRIDGE', col: [236, 246, 255] });
  },
};
void ACCENT;
