// Beat 5 — passenger jets cruise at ~11 km.
// True scale an airliner is a 5 px glint at this zoom, so the jet is a bright speck drawing a long contrail across
// the frame (the contrail is what you actually see from the ground), with a loupe that tracks it and shows the
// airliner up close. Two older, spreading contrails sit above and below for depth. The contrail stays in the
// world for the rest of the climb, fading as it spreads.
// Exports `loupe()` (the magnifier callout) for reuse by s07.
import * as L from '../../../../engine/runtime/lib.js';
import { ALT } from '../camera.js';
import { skyColor } from '../env.js';

const { W, H } = L;
const ALT_J = ALT.jets;                 // 11,000 m
const X_START = -8300;                  // jet x at beat t = 0
const SPEED = 2450;                     // m/s (time-compressed ~10x so the trail draws across the frame)
const T_LOUPE = 0.85;
const T_LABEL = 2.55;                   // lands on "around eleven kilometres"
const jetX = (t) => X_START + SPEED * t;
const passT = (x) => (x - X_START) / SPEED;

// ------------------------------------------------------------------ loupe (shared)
/**
 * Magnifier callout. (x, y) loupe centre, r radius, (tx, ty) the speck it points at, k 0..1 visibility.
 * draw(ctx) paints the magnified content in local coords centred on (0, 0) (already clipped).
 */
export function loupe(ctx, { x, y, r, tx, ty, k, t, accent, sky = [80, 120, 200], draw }) {
  if (k <= 0) return;
  const lk = L.clamp(k * 1.8);                                  // leader + target ring first
  const sk = L.ease.outBack(L.prog(k, 0.25, 0.75), 1.4);         // then the lens pops open
  ctx.save();
  // target ring + leader
  ctx.globalAlpha *= lk;
  ctx.strokeStyle = 'rgba(240,246,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(tx, ty, Math.max(0, 11 + 10 * (1 - lk)), 0, Math.PI * 2); ctx.stroke();
  const ang = Math.atan2(y - ty, x - tx);
  const ax = tx + Math.cos(ang) * 13, ay = ty + Math.sin(ang) * 13;
  const bx = x - Math.cos(ang) * (r + 10) * Math.max(0.01, sk), by = y - Math.sin(ang) * (r + 10) * Math.max(0.01, sk);
  const e = L.ease.outCubic(lk);
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(L.lerp(ax, bx, e), L.lerp(ay, by, e)); ctx.stroke();
  ctx.restore();
  if (sk <= 0.01) return;
  const R = r * sk;
  ctx.save();
  // drop shadow
  const sh = ctx.createRadialGradient(x, y + 10, R * 0.7, x, y + 10, R * 1.35);
  sh.addColorStop(0, 'rgba(0,4,16,0.35)');
  sh.addColorStop(1, 'rgba(0,4,16,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(x - R * 1.4, y - R * 1.3, R * 2.8, R * 2.8);
  // lens content
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, R), 0, Math.PI * 2); ctx.clip();
  const bg = ctx.createRadialGradient(x - R * 0.3, y - R * 0.4, 0, x, y, R * 1.1);
  bg.addColorStop(0, L.rgba(L.mix(sky, [255, 255, 255], 0.18)));
  bg.addColorStop(1, L.rgba(L.mix(sky, [0, 0, 20], 0.25)));
  ctx.fillStyle = bg;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.translate(x, y);
  ctx.scale(sk, sk);
  draw(ctx);
  ctx.restore();
  // glass: inner vignette + a soft specular arc
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, R), 0, Math.PI * 2); ctx.clip();
  const vg = ctx.createRadialGradient(x, y, R * 0.65, x, y, R);
  vg.addColorStop(0, 'rgba(0,6,24,0)');
  vg.addColorStop(1, 'rgba(0,6,24,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = R * 0.06;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, R * 0.86), Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
  ctx.restore();
  // bezel: crisp white ring + a slowly turning accent tick ring
  ctx.strokeStyle = 'rgba(245,248,255,0.92)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = L.rgba(accent, 0.75);
  ctx.lineWidth = 2;
  const rot = t * 0.25;
  for (let i = 0; i < 48; i++) {
    const a = rot + (i / 48) * Math.PI * 2;
    const l = i % 4 === 0 ? 9 : 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (R + 6), y + Math.sin(a) * (R + 6));
    ctx.lineTo(x + Math.cos(a) * (R + 6 + l), y + Math.sin(a) * (R + 6 + l));
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ airliner (side view, local metres, nose +x, y down)
function airliner(c, t, z) {
  const px = 1 / z;
  c.save();
  c.scale(z, z);
  c.lineJoin = 'round';
  // wing (far side, darker, peeks above the fuselage line)
  c.fillStyle = 'rgb(150,160,178)';
  c.beginPath(); c.moveTo(4, -1.2); c.lineTo(-9, -3.6); c.lineTo(-10.6, -3.5); c.lineTo(-5, -1.0); c.closePath(); c.fill();
  // fin
  const finG = c.createLinearGradient(-24, -14, -32, -2);
  finG.addColorStop(0, 'rgb(120,140,235)');
  finG.addColorStop(1, 'rgb(70,88,190)');
  c.fillStyle = finG;
  c.beginPath(); c.moveTo(-19.5, -2.8); c.lineTo(-28.6, -14.6); c.lineTo(-32.4, -14.6); c.lineTo(-31.6, -2.2); c.closePath(); c.fill();
  // fuselage
  const fg = c.createLinearGradient(0, -3, 0, 3);
  fg.addColorStop(0, 'rgb(255,253,248)');
  fg.addColorStop(0.45, 'rgb(236,239,245)');
  fg.addColorStop(1, 'rgb(150,160,178)');
  c.fillStyle = fg;
  c.beginPath();
  c.moveTo(32.6, 0.7);
  c.bezierCurveTo(32.4, -1.6, 29.6, -2.9, 25.5, -2.95);
  c.lineTo(-17, -2.95);
  c.bezierCurveTo(-24, -2.9, -29, -2.4, -32.6, -1.7);
  c.lineTo(-32.8, -1.1);
  c.bezierCurveTo(-27, 0.2, -20, 2.6, -13, 2.95);
  c.lineTo(25.5, 2.95);
  c.bezierCurveTo(29.8, 2.9, 32.5, 2.2, 32.6, 0.7);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(40,50,70,0.35)';
  c.lineWidth = 0.8 * px;
  c.stroke();
  // cheat line in the accent tone
  c.fillStyle = 'rgba(95,112,215,0.85)';
  c.fillRect(-16, 0.7, 41, 0.45);
  // windows
  c.fillStyle = 'rgba(30,40,60,0.75)';
  for (let x = 22; x > -15; x -= 0.95) { if (Math.abs(x - 13.5) < 0.5 || Math.abs(x + 4) < 0.5) continue; c.fillRect(x, -0.85, 0.42, 0.55); }
  // cockpit
  c.beginPath(); c.moveTo(30.2, -1.75); c.lineTo(31.4, -1.15); c.lineTo(30.0, -1.0); c.lineTo(28.8, -1.55); c.closePath(); c.fill();
  // doors
  c.strokeStyle = 'rgba(60,70,90,0.4)';
  c.lineWidth = 0.7 * px;
  for (const dx of [26.4, 13.5, -4, -15]) { c.strokeRect(dx - 0.5, -1.7, 1.0, 3.1); }
  // tailplane (edge-on sliver)
  c.fillStyle = 'rgb(175,185,200)';
  c.beginPath(); c.moveTo(-25, -1.0); c.lineTo(-33.8, -2.2); c.lineTo(-34.2, -1.6); c.lineTo(-27, -0.3); c.closePath(); c.fill();
  // near wing (edge-on, swept, slight dihedral) + winglet
  const wg = c.createLinearGradient(0, 0, 0, 3);
  wg.addColorStop(0, 'rgb(225,230,240)');
  wg.addColorStop(1, 'rgb(150,160,180)');
  c.fillStyle = wg;
  c.beginPath(); c.moveTo(7.5, 1.6); c.lineTo(-11.2, -0.6); c.lineTo(-13.4, -3.6); c.lineTo(-13.6, -0.1); c.lineTo(-5.5, 2.9); c.closePath(); c.fill();
  // engine: pylon + nacelle with intake
  c.fillStyle = 'rgb(170,178,195)';
  c.beginPath(); c.moveTo(6.2, 2.6); c.lineTo(1.5, 2.8); c.lineTo(2.5, 4.0); c.lineTo(5.6, 4.0); c.closePath(); c.fill();
  const ng = c.createLinearGradient(0, 3.2, 0, 6.6);
  ng.addColorStop(0, 'rgb(245,246,250)');
  ng.addColorStop(1, 'rgb(140,150,170)');
  c.fillStyle = ng;
  c.beginPath();
  c.moveTo(10.0, 3.1); c.lineTo(3.2, 3.4); c.quadraticCurveTo(1.6, 4.9, 3.2, 6.3); c.lineTo(10.0, 6.6);
  c.quadraticCurveTo(10.5, 4.85, 10.0, 3.1); c.closePath(); c.fill();
  c.fillStyle = 'rgb(40,46,60)';
  c.beginPath(); c.ellipse(10.05, 4.85, 0.45, 1.7, 0, 0, Math.PI * 2); c.fill();
  // lights: red beacon (top) + white strobe (tail), blinking
  const bk = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.3)), 8);
  const sb = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.3 + 1.6)), 14);
  c.restore();
  if (bk > 0.02) L.lightBlob(c, 4 * z, -3.1 * z, 10, [255, 70, 60], 0.9 * bk);
  if (sb > 0.02) L.lightBlob(c, -33 * z, -1.4 * z, 12, [255, 255, 255], 0.9 * sb);
  // sun glint on the crown of the fuselage
  L.lightBlob(c, 10 * z, -2.7 * z, 30, [255, 250, 235], 0.18);
}

// streaks of thin cirrus racing past inside the loupe (sense of speed)
const STREAKS = (() => { const r = L.rng(5502); return Array.from({ length: 9 }, () => [r(), r(), r(), r()]); })();

function loupeContent(c, t, R) {
  const z = 3.2;                                      // px per metre inside the lens (before the lens scale)
  // speed streaks
  c.save();
  c.lineCap = 'round';
  for (const [a, b, cc, d] of STREAKS) {
    const y = (a - 0.5) * R * 2;
    const len = 30 + b * 90;
    const x = R + 120 - (((t * (380 + d * 200) + cc * 600) % (2 * R + 300)));
    c.strokeStyle = `rgba(255,255,255,${0.08 + 0.1 * d})`;
    c.lineWidth = 1.5 + d * 2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
  }
  // twin engine contrails, starting a little behind the engines and spreading
  const ex = 1.5 * z, ey = 4.85 * z;
  for (const [oy, al] of [[-5, 0.55], [0, 0.85]]) {
    const g = c.createLinearGradient(ex - 40, 0, -R - 10, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.18, `rgba(255,255,255,${al})`);
    g.addColorStop(1, `rgba(255,255,255,${al * 0.75})`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(ex - 18, ey + oy - 1);
    c.lineTo(-R - 10, ey + oy - 7);
    c.lineTo(-R - 10, ey + oy + 7);
    c.lineTo(ex - 18, ey + oy + 1);
    c.closePath();
    c.fill();
  }
  c.restore();
  // the jet, with a gentle bob
  c.save();
  c.translate(3 + L.noise1(t * 0.7, 51) * 2, L.noise1(t * 0.6, 52) * 3);
  c.rotate(L.noise1(t * 0.5, 53) * 0.015);
  airliner(c, t, z);
  c.restore();
}

// ------------------------------------------------------------------ world: contrails
const OLD = [   // older contrails above/below (alt, x0, x1, age offset, tilt m per m)
  { alt: 12150, x0: -26000, x1: 18000, w: 520, a: 0.16, tilt: 0.012, seed: 1 },
  { alt: 9650, x0: -30000, x1: 14000, w: 700, a: 0.12, tilt: -0.008, seed: 2 },
];

function contrailWidth(age) { return 24 + 150 * Math.sqrt(Math.max(0, age)) + 40 * age; }

function drawContrail(c, v, t, fade) {
  const jx = jetX(t);
  const xa = Math.max(X_START - 6000, v.cam.x - W * 0.6 * v.cam.mpp);
  const xb = Math.min(jx - 40, v.cam.x + W * 0.6 * v.cam.mpp);
  if (xb <= xa) return;
  const s = 1 / v.cam.mpp;
  const n = 48;
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const x = L.lerp(xa, xb, i / n);
    const age = t - passT(x);
    const w = contrailWidth(age) * L.clamp((jx - x) / 900);   // pinches to a point at the jet
    const sag = 60 * age + L.noise1(x / 2600 + 3, 61) * 90 * Math.min(1, age / 3);
    top.push([v.wx(x), v.wy(-ALT_J + sag - w / 2)]);
    bot.push([v.wx(x), v.wy(-ALT_J + sag + w / 2)]);
  }
  // opacity along the trail: dense near the jet, thinning and breaking into puffs with age
  const g = c.createLinearGradient(v.wx(xa), 0, v.wx(xb), 0);
  for (let i = 0; i <= 10; i++) {
    const x = L.lerp(xa, xb, i / 10);
    const age = t - passT(x);
    const puff = 0.75 + 0.25 * L.noise1(x / 900, 62);
    g.addColorStop(i / 10, `rgba(255,255,255,${fade * puff * L.clamp(0.95 * Math.exp(-age / 9))})`);
  }
  for (const [grow, a] of [[2.2, 0.22], [1.3, 0.45], [0.55, 1]]) {
    c.save();
    c.globalAlpha *= a;
    c.fillStyle = g;
    c.beginPath();
    top.forEach(([x, y], i) => { const yb = bot[i][1], m = (y + yb) / 2; const yy = m + (y - m) * grow - (grow > 1 ? 1.5 : 0); i ? c.lineTo(x, yy) : c.moveTo(x, yy); });
    for (let i = n; i >= 0; i--) { const [x, yb] = bot[i]; const y = top[i][1], m = (y + yb) / 2; c.lineTo(x, m + (yb - m) * grow + (grow > 1 ? 1.5 : 0)); }
    c.closePath();
    c.fill();
    c.restore();
  }
}

function drawOld(c, v, t, fade) {
  const s = 1 / v.cam.mpp;
  for (const o of OLD) {
    const y0 = v.wy(-o.alt);
    if (y0 < -200 || y0 > H + 200) continue;
    const xa = Math.max(o.x0, v.cam.x - W * 0.6 * v.cam.mpp), xb = Math.min(o.x1, v.cam.x + W * 0.6 * v.cam.mpp);
    if (xb <= xa) continue;
    const g = c.createLinearGradient(v.wx(xa), 0, v.wx(xb), 0);
    for (let i = 0; i <= 8; i++) {
      const x = L.lerp(xa, xb, i / 8);
      const ends = L.clamp((x - o.x0) / 5000) * L.clamp((o.x1 - x) / 5000);
      g.addColorStop(i / 8, `rgba(255,255,255,${fade * o.a * ends * (0.6 + 0.4 * L.noise1(x / 2000, 70 + o.seed))})`);
    }
    c.fillStyle = g;
    c.beginPath();
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const x = L.lerp(xa, xb, i / n);
      const w = o.w * (0.7 + 0.3 * L.noise1(x / 1500 + t * 0.05, 80 + o.seed));
      const y = -o.alt + (x * o.tilt) + L.noise1(x / 4000, 90 + o.seed) * 150;
      i ? c.lineTo(v.wx(x), v.wy(y - w / 2)) : c.moveTo(v.wx(x), v.wy(y - w / 2));
    }
    for (let i = n; i >= 0; i--) {
      const x = L.lerp(xa, xb, i / n);
      const w = o.w * (0.7 + 0.3 * L.noise1(x / 1500 + t * 0.05, 80 + o.seed));
      const y = -o.alt + (x * o.tilt) + L.noise1(x / 4000, 90 + o.seed) * 150;
      c.lineTo(v.wx(x), v.wy(y + w / 2));
    }
    c.closePath();
    c.fill();
  }
}

export default {
  beat: 5,
  chapter: { num: '05', title: 'Cruising altitude', sub: 'Where passenger jets fly' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.35, name: 'whoosh', gain: 0.3, pitch: 0.6 },
      { t: T_LOUPE + 0.15, name: 'blip', gain: 0.22, pitch: 1.2 },
      { t: T_LOUPE + 0.3, name: 'shimmer', gain: 0.12, pitch: 1.4 },
      { t: T_LABEL - 0.05, name: 'ping', gain: 0.24, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < -0.6 || v.cam.mpp > 900) return;
    if (!v.visibleY(-ALT_J - 2500, -ALT_J + 2500, 100)) return;
    // after this beat the contrails thin out and stay as faint streaks
    const fade = L.lerp(1, 0.28, L.ease.inOutCubic(L.prog(t, v.d - 0.2, 1.8))) * L.clamp((900 - v.cam.mpp) / 500);
    const born = L.ease.outCubic(L.prog(t, -0.6, 1.2));
    drawOld(ctx, v, t, fade * born);
    drawContrail(ctx, v, t, fade);
    // the jet itself: a bright glint with a blinking beacon
    const jx = v.wx(jetX(t)), jy = v.wy(-ALT_J);
    if (jx > -40 && jx < W + 40) {
      const a = fade;
      L.lightBlob(ctx, jx, jy, 26, [255, 248, 230], 0.35 * a);
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.ellipse(jx, jy, Math.max(0.5, 65 / v.cam.mpp / 2) + 1.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const bk = Math.pow(Math.max(0, Math.sin(v.gt * Math.PI * 1.3)), 8);
      if (bk > 0.02) L.lightBlob(ctx, jx, jy - 2, 9, [255, 70, 60], 0.8 * bk * a);
    }
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.4, 0.3));
    const jx = v.wx(jetX(t)), jy = v.wy(-ALT_J);
    const lk = L.prog(t, T_LOUPE, 0.6) * out * v.k;
    const lx = L.clamp(jx + 150, 400, 840), ly = jy + 225;
    loupe(ctx, {
      x: lx, y: ly, r: 118, tx: jx, ty: jy, k: lk, t, accent: v.accent, sky: skyColor(ALT_J),
      draw: (c) => loupeContent(c, t, 118),
    });
    const k = L.enter(t, T_LABEL, 0.5) * out * v.k;
    // anchored just above the 11 km contrail (not floating at a fixed screen height)
    L.bigLabel(ctx, { x: 150, y: Math.max(470, jy - 110), big: '≈ 11 km', small: '36,000 ft · cruising altitude', k, accent: v.accent });
  },
};
