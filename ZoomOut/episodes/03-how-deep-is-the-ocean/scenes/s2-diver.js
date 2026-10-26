// Beat 2 — the deepest scuba dive ever: a diver at 332 m, true scale (≈1.8 m + fins).
// World space in metres. The diver hangs beside a descent line, torch on, fins kicking slowly,
// exhaling bursts of bubbles. When the camera pulls out later, the diver collapses to a tiny lit dot.
import * as L from '../../../../engine/runtime/lib.js';

const DX = -0.35, DY = 332;            // diver centre (chest) in world metres
const ROPE_X = 1.55;                   // descent line
const SUIT = [13, 22, 34];
const SUIT_FAR = [8, 14, 24];
const RIM = [110, 190, 215];
const BEAM = [190, 230, 255];
const TORCH_ON = 0.55;                 // beat-relative time the torch flicks on
const BURSTS = [-3.3, -0.2, 1.55, 4.9, 8.2];   // exhale bursts (beat-relative)

// beam-lit particles (world offsets from the diver, metres)
const SPECKS = (() => { const r = L.rng(2201); return Array.from({ length: 220 }, () => [r() * 11 - 1, r() * 9 - 3, r(), r()]); })();
// bubbles per burst
const BUB = (() => { const r = L.rng(2202); return Array.from({ length: 18 }, () => [r(), r(), r(), r()]); })();

function torchK(t) {
  if (t < TORCH_ON) return 0;
  const a = t - TORCH_ON;
  if (a > 0.32) return 1;
  // two quick flickers, then steady
  return a < 0.06 ? 0.7 : a < 0.12 ? 0.08 : a < 0.17 ? 0.9 : a < 0.22 ? 0.3 : 1;
}

/** Diver pose at global time: tilt (rad), bob (m), kick phase, beam angle (local). */
function pose(gt) {
  return {
    tilt: 0.16 + L.noise1(gt * 0.22, 21) * 0.04,
    bob: L.noise1(gt * 0.3, 22) * 0.05,
    kick: gt * 2.1,
    beam: 0.32 + L.noise1(gt * 0.35, 23) * 0.1,    // beam angle below the body axis (kept shallow: core stays above the label)
  };
}

// local (diver frame, +x = head direction, +y = down) → world
function toWorld(p, x, y) {
  const c = Math.cos(p.tilt), s = Math.sin(p.tilt);
  return [DX + x * c - y * s, DY + p.bob + x * s + y * c];
}

function capsule(c, pts, w) {
  c.lineWidth = w;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}

/** Tapered limb from a (radius ra) to b (radius rb), round ends. */
function limb(c, a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / len, ny = dx / len;
  c.beginPath();
  c.moveTo(a[0] + nx * ra, a[1] + ny * ra);
  c.lineTo(b[0] + nx * rb, b[1] + ny * rb);
  c.lineTo(b[0] - nx * rb, b[1] - ny * rb);
  c.lineTo(a[0] - nx * ra, a[1] - ny * ra);
  c.closePath();
  c.fill();
  c.beginPath(); c.arc(a[0], a[1], Math.max(0, ra), 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(b[0], b[1], Math.max(0, rb), 0, Math.PI * 2); c.fill();
}

function leg(p, side) {
  const ph = p.kick + (side ? Math.PI : 0);
  const s1 = Math.sin(ph), s2 = Math.sin(ph - 0.9);
  const hip = [-0.34, 0.04];
  const knee = [-0.78, 0.07 + 0.05 * s1];
  const ankle = [-1.18, 0.05 + 0.11 * s2];
  const fa = Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]) - 0.12 + 0.2 * Math.sin(ph - 1.8);
  return { hip, knee, ankle, fa, flex: Math.sin(ph - 2.2) };
}

function fin(c, l, rim) {
  const [ax, ay] = l.ankle;
  const len = 0.64, ca = Math.cos(l.fa), sa = Math.sin(l.fa);
  const P = (u, v) => [ax + ca * u - sa * v, ay + sa * u + ca * v];
  const bend = 0.1 * l.flex;
  c.beginPath();
  let q = P(-0.06, -0.06); c.moveTo(q[0], q[1]);                         // heel of the foot pocket
  q = P(0.12, -0.05); c.lineTo(q[0], q[1]);
  q = P(len * 0.6, -0.06 + bend * 0.35); let q2 = P(len, -0.09 + bend); c.quadraticCurveTo(q[0], q[1], q2[0], q2[1]);
  q = P(len + 0.035, 0.0 + bend); q2 = P(len - 0.01, 0.09 + bend); c.quadraticCurveTo(q[0], q[1], q2[0], q2[1]);
  q = P(len * 0.55, 0.045 + bend * 0.3); q2 = P(0.06, 0.055); c.quadraticCurveTo(q[0], q[1], q2[0], q2[1]);
  q = P(-0.05, 0.05); c.lineTo(q[0], q[1]);
  c.closePath();
  c.fill();
  if (rim) {   // light rim so the blade separates from the leg and from the far fin
    c.save();
    c.strokeStyle = rim;
    c.lineWidth = 0.014;
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
  }
}

function drawLeg(c, l, k = 1, rim) {
  limb(c, l.hip, l.knee, 0.1 * k, 0.065 * k);
  limb(c, l.knee, [L.lerp(l.knee[0], l.ankle[0], 0.45), L.lerp(l.knee[1], l.ankle[1], 0.45)], 0.065 * k, 0.068 * k); // calf
  limb(c, l.knee, l.ankle, 0.06 * k, 0.042 * k);
  fin(c, l, rim);
}

function drawBody(c, p) {
  // torso: hips → chest → shoulders, with a little belly to back curve
  c.beginPath();
  c.moveTo(-0.44, 0.0);
  c.bezierCurveTo(-0.44, -0.12, -0.25, -0.14, 0.0, -0.15);      // lower back
  c.bezierCurveTo(0.2, -0.16, 0.36, -0.14, 0.4, -0.06);          // shoulders
  c.bezierCurveTo(0.43, 0.02, 0.36, 0.14, 0.18, 0.16);           // chest
  c.bezierCurveTo(0.0, 0.18, -0.2, 0.14, -0.32, 0.13);           // belly
  c.bezierCurveTo(-0.42, 0.12, -0.46, 0.08, -0.44, 0.0);         // seat
  c.closePath();
  c.fill();
  limb(c, [0.36, -0.04], [0.47, -0.05], 0.07, 0.07);             // neck
  c.beginPath(); c.ellipse(0.53, -0.05, 0.125, 0.11, -0.15, 0, Math.PI * 2); c.fill();   // hooded head
  // mask frame + regulator second stage
  c.beginPath(); c.ellipse(0.645, -0.07, 0.03, 0.058, 0.15, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(0.63, 0.04, 0.042, 0, Math.PI * 2); c.fill();
  limb(c, [0.6, 0.03], [0.66, 0.06], 0.025, 0.03);              // exhaust tee
}

function drawTanks(c) {
  limb(c, [-0.4, -0.235], [0.24, -0.245], 0.095, 0.095);         // twin set on the back
  limb(c, [0.24, -0.245], [0.33, -0.25], 0.04, 0.035);           // manifold / valves
  limb(c, [-0.22, 0.19], [0.16, 0.2], 0.05, 0.05);               // stage bottle under the chest
}

function drawArms(c, p, near) {
  if (!near) { limb(c, [0.24, -0.02], [0.05, 0.16], 0.055, 0.045); limb(c, [0.05, 0.16], [-0.2, 0.15], 0.045, 0.04); return; }
  const hand = [0.84, 0.13];
  const elbow = [0.55, 0.15];
  limb(c, [0.26, -0.01], elbow, 0.062, 0.048);
  limb(c, elbow, hand, 0.046, 0.038);
  const a = p.beam - 0.1;
  limb(c, hand, [hand[0] + Math.cos(a) * 0.19, hand[1] + Math.sin(a) * 0.19], 0.034, 0.042);   // torch
}

function drawFigure(c, p, col, far, near, rim) {
  c.fillStyle = col;
  if (far) {
    drawLeg(c, leg(p, 1), 0.95, rim && L.rgba(RIM, 0.28));
    drawArms(c, p, false);
  }
  if (near) {
    drawTanks(c);
    drawBody(c, p);
    drawLeg(c, leg(p, 0), 1, rim && L.rgba(RIM, 0.4));
    drawArms(c, p, true);
  }
}

function torchHead(p) {
  const a = p.beam - 0.1;
  return [0.84 + Math.cos(a) * 0.23, 0.13 + Math.sin(a) * 0.23];
}

function drawBeam(c, v, p, tk) {
  if (tk <= 0) return;
  const [hx, hy] = torchHead(p);
  const ang = p.beam;
  const len = 9;
  const layers = [[0.34, 0.08], [0.26, 0.12], [0.19, 0.16], [0.12, 0.2], [0.06, 0.2]];
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.filter = `blur(${Math.round(L.clamp(0.07 / v.cam.mpp, 2, 7))}px)`;
  for (const [spread, a] of layers) {
    const g = c.createRadialGradient(hx, hy, 0, hx, hy, len);
    g.addColorStop(0, L.rgba(BEAM, a * tk));
    g.addColorStop(0.25, L.rgba(BEAM, a * 0.55 * tk));
    g.addColorStop(0.45, L.rgba(BEAM, a * 0.22 * tk));   // ~4 m: fall off fast so the label / caption keep contrast
    g.addColorStop(1, L.rgba(BEAM, 0));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(hx + Math.cos(ang - Math.PI / 2) * 0.03, hy + Math.sin(ang - Math.PI / 2) * 0.03);
    c.lineTo(hx + Math.cos(ang - spread) * len, hy + Math.sin(ang - spread) * len);
    c.lineTo(hx + Math.cos(ang + spread) * len, hy + Math.sin(ang + spread) * len);
    c.lineTo(hx + Math.cos(ang + Math.PI / 2) * 0.03, hy + Math.sin(ang + Math.PI / 2) * 0.03);
    c.closePath();
    c.fill();
  }
  c.restore();
  return [hx, hy, ang];
}

function drawSpecks(c, v, p, tk) {
  // particulate caught in the beam (computed in the diver frame)
  if (tk <= 0) return;
  const [hx, hy] = torchHead(p);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const [x0, y0, s, ph] of SPECKS) {
    // slow drift (world), converted into the diver frame approximately (tilt is small)
    const x = x0 + L.noise1(v.gt * 0.15 + ph * 20, 24) * 0.25;
    const y = ((y0 + v.gt * (0.05 + s * 0.08) + 3) % 9) - 3;
    const dx = x - hx, dy = y - hy, dist = Math.hypot(dx, dy);
    if (dist < 0.15 || dist > 9) continue;
    const off = Math.abs(Math.atan2(dy, dx) - p.beam);
    const inCone = L.clamp(1 - off / 0.3);
    const a = 1.8 * inCone * inCone * (1 - dist / 9) * tk * (0.4 + 0.6 * s);
    if (a < 0.02) continue;
    c.fillStyle = L.rgba([220, 240, 255], Math.min(0.9, a));
    c.beginPath();
    c.arc(x, y, Math.max(0, (0.006 + 0.012 * s)), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

const ROPE = [DY - 90, DY + 40];      // descent line extent (world m): leads the eye down during the zoom-in

function drawRope(c, v, p, tk) {
  const [y0, y1] = ROPE;
  const mpp = v.cam.mpp;
  const far = L.clamp((0.12 - mpp) / 0.06);         // gone before the Burj pull-out
  if (far <= 0) return;
  const toScreenY = (y) => v.wy(y);
  // alpha along the line: soft 10 m ends, dimmed behind the label small line + caption (screen y 1150-1400)
  const alphaAt = (y) => {
    const ends = L.smoothstep(L.clamp((y - y0) / 10)) * L.smoothstep(L.clamp((y1 - y) / 10));
    const sy = toScreenY(y);
    const band = L.clamp((sy - 1110) / 40) * L.clamp((1440 - sy) / 40);
    return ends * L.lerp(1, 0.25 / 0.55, band) * far;
  };
  const g = c.createLinearGradient(0, y0, 0, y1);
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const y = L.lerp(y0, y1, i / N);
    g.addColorStop(i / N, L.rgba([150, 175, 190], 0.55 * alphaAt(y)));
  }
  // only stroke the on-screen part (with margin)
  const ya = Math.max(y0, v.cam.y - 1100 * mpp), yb = Math.min(y1, v.cam.y + 1100 * mpp);
  if (yb <= ya) return;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = g;
  c.lineWidth = Math.max(0.014, 1.4 * mpp);
  c.beginPath();
  const steps = Math.max(8, Math.min(240, Math.ceil((yb - ya) / 0.5)));
  for (let i = 0; i <= steps; i++) {
    const y = L.lerp(ya, yb, i / steps);
    const x = ROPE_X + L.noise1(y * 0.12 + v.gt * 0.25, 25) * 0.12;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke();
  // depth tags every 2 m
  for (let y = Math.ceil(ya / 2) * 2; y <= yb; y += 2) {
    const a = alphaAt(y);
    if (a < 0.02) continue;
    const x = ROPE_X + L.noise1(y * 0.12 + v.gt * 0.25, 25) * 0.12;
    c.fillStyle = L.rgba([200, 215, 225], 0.5 * a);
    c.fillRect(x - 0.035, y - 0.06, 0.07, 0.12);
  }
  c.restore();
}

function drawBubbles(c, v, p) {
  const tb = v.t;  // beat-relative
  const [ex, ey] = toWorld(p, 0.48, -0.17);    // exhaust plume rises behind the hood, not over the mask
  c.save();
  for (let bi = 0; bi < BURSTS.length; bi++) {
    const t0 = BURSTS[bi];
    for (const [r1, r2, r3, r4] of BUB) {
      const te = t0 + r1 * 0.55;
      const a = tb - te;
      if (a <= 0 || a > 9) continue;
      const rise = 0.25 * a + 0.22 * a * a;
      const x = ex + 0.08 * (r2 - 0.5) + a * 0.06 * (r3 - 0.5) + L.noise1(a * 2.2 + r4 * 9, 26) * 0.05 * Math.min(1, a);
      const y = ey - 0.05 - rise;
      const rad = (0.014 + 0.032 * r3 * r3) * (1 + rise * 0.03);
      const fade = L.clamp(a / 0.15) * L.clamp((9 - a) / 2) * L.clamp((v.wy(y) - 300) / 60);   // clear of the HUD band
      if (fade <= 0.005) continue;
      const wob = 1 + 0.12 * Math.sin(a * 14 + r4 * 6);
      c.fillStyle = L.rgba([170, 220, 240], 0.12 * fade);
      c.strokeStyle = L.rgba([200, 235, 250], 0.75 * fade);
      c.lineWidth = Math.max(0.003, v.cam.mpp * 1.1);
      c.beginPath();
      c.ellipse(x, y, Math.max(0, rad * wob), Math.max(0, rad / wob), 0, 0, Math.PI * 2);
      c.fill(); c.stroke();
      c.fillStyle = L.rgba([255, 255, 255], 0.8 * fade);
      c.beginPath();
      c.arc(x - rad * 0.35, y - rad * 0.35, Math.max(0, rad * 0.28), 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Scuba record', sub: 'Ahmed Gabr, 2014' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: TORCH_ON, name: 'tick', gain: 0.3, pitch: 1.3 },
      { t: TORCH_ON + 0.05, name: 'shimmer', gain: 0.18, pitch: 1 },
      { t: 1.25, name: 'blip', gain: 0.28, pitch: 1 },
      { t: BURSTS[2] + 0.05, name: 'bubbles', gain: 0.32, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    if (!v.visibleY(ROPE[0], ROPE[1], 100)) return;
    const mpp = v.cam.mpp;
    const p = pose(v.gt);
    const tk = torchK(v.t);
    const sizePx = 2.4 / mpp;

    if (sizePx < 14) {
      // far away: the diver is a speck, kept alive by its torch
      const x = v.wx(DX), y = v.wy(DY);
      const a = L.clamp((sizePx - 0.2) / 2, 0.55, 1);
      L.lightBlob(ctx, x, y, 7 + 10 * tk, BEAM, 0.35 * tk);
      ctx.fillStyle = L.rgba([235, 248, 255], a);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.4, Math.min(3, sizePx / 4)), 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.save();
    ctx.translate(v.wx(0), v.wy(0));
    ctx.scale(1 / mpp, 1 / mpp);

    // ambient halo around the diver (torch spill on the water)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const [cx, cy] = toWorld(p, 0.4, 0.1);
    L.lightBlob(ctx, v.wx(cx), v.wy(cy), 3.2 / mpp, [60, 140, 180], 0.16 * (0.35 + 0.65 * tk));
    ctx.restore();

    drawRope(ctx, v, p, tk);

    // diver frame
    ctx.save();
    ctx.translate(DX, DY + p.bob);
    ctx.rotate(p.tilt);
    // far-side limbs (darker), then rim pass + body
    drawFigure(ctx, p, L.rgba(SUIT_FAR), true, false, true);
    ctx.save();
    ctx.translate(-0.012, -0.022);
    drawFigure(ctx, p, L.rgba(RIM, 0.55 + 0.25 * tk), false, true);
    ctx.restore();
    ctx.save();
    ctx.translate(0.01, 0.018);
    drawFigure(ctx, p, L.rgba([30, 60, 80], 0.6), false, true);
    ctx.restore();
    drawFigure(ctx, p, L.rgba(SUIT), false, true, true);
    // tanks in brushed metal, lit from above
    const tg = ctx.createLinearGradient(0, -0.34, 0, -0.14);
    tg.addColorStop(0, L.rgba([95, 130, 150]));
    tg.addColorStop(0.35, L.rgba([38, 56, 72]));
    tg.addColorStop(1, L.rgba([16, 26, 38]));
    ctx.fillStyle = tg;
    limb(ctx, [-0.4, -0.235], [0.24, -0.245], 0.088, 0.088);
    ctx.fillStyle = L.rgba([28, 40, 54]);
    limb(ctx, [-0.22, 0.19], [0.16, 0.2], 0.044, 0.044);
    // details: tank bands, harness, belt, hose
    ctx.lineCap = 'round';
    ctx.strokeStyle = L.rgba([12, 20, 30], 0.95);
    ctx.lineWidth = 0.022;
    for (const x of [-0.24, 0.1]) { ctx.beginPath(); ctx.moveTo(x, -0.33); ctx.lineTo(x + 0.01, -0.14); ctx.stroke(); }
    ctx.strokeStyle = L.rgba([60, 84, 102], 0.9);
    ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(-0.3, -0.13); ctx.quadraticCurveTo(-0.27, 0.02, -0.25, 0.15); ctx.stroke();   // weight belt
    ctx.fillStyle = L.rgba([120, 140, 155], 0.9);
    ctx.fillRect(-0.29, 0.0, 0.05, 0.04);                                                                // buckle
    ctx.strokeStyle = L.rgba([50, 70, 88], 0.95);
    ctx.lineWidth = 0.016;
    ctx.beginPath(); ctx.moveTo(0.33, -0.26); ctx.bezierCurveTo(0.55, -0.36, 0.78, -0.16, 0.64, 0.03); ctx.stroke(); // reg hose
    ctx.beginPath(); ctx.moveTo(0.3, -0.2); ctx.bezierCurveTo(0.4, -0.05, 0.3, 0.1, 0.18, 0.12); ctx.stroke();     // gauge hose
    // mask glass glint
    ctx.fillStyle = L.rgba([140, 215, 240], 0.55 + 0.35 * tk);
    ctx.beginPath(); ctx.ellipse(0.655, -0.075, 0.016, 0.042, 0.15, 0, Math.PI * 2); ctx.fill();
    // torch bezel
    const a = p.beam - 0.1;
    ctx.strokeStyle = L.rgba([170, 185, 195], 0.95);
    ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.moveTo(0.84 + Math.cos(a) * 0.08, 0.13 + Math.sin(a) * 0.08); ctx.lineTo(0.84 + Math.cos(a) * 0.2, 0.13 + Math.sin(a) * 0.2); ctx.stroke();

    // light: beam + particulate + torch flare (diver frame)
    drawBeam(ctx, v, p, tk);
    drawSpecks(ctx, v, p, tk);
    const [hx, hy] = torchHead(p);
    if (tk > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const [wx, wy] = toWorld(p, hx, hy);
      L.lightBlob(ctx, v.wx(wx), v.wy(wy), 0.55 / mpp, [230, 245, 255], 0.9 * tk);
      L.lightBlob(ctx, v.wx(wx), v.wy(wy), 0.12 / mpp, [255, 255, 255], 1 * tk);
      ctx.restore();
    }
    ctx.restore();

    drawBubbles(ctx, v, p);
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const k = L.enter(v.t, 1.15, 0.7) * v.k;
    L.bigLabel(ctx, { x: 150, y: 1185, big: '332 m', small: '1,089 ft · deepest scuba dive ever', k, accent: v.accent });
  },
};
