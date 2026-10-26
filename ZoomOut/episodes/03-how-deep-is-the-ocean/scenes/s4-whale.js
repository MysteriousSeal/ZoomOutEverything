// Beat 4 — Cuvier's beaked whale at 2,992 m (the deepest recorded mammal dive).
// A 5.5 m whale glides diagonally down through near-black water. It is revealed by a cold rim light
// and a light sweep as the camera arrives, stirs bioluminescent sparks in its wake, and sends faint
// echolocation click trains ahead of its melon (synced to `sonar` cues).
import * as L from '../../../../engine/runtime/lib.js';

const { W, H } = L;
const DEPTH = 2992;
const LEN = 5.5;                       // metres, beak tip to fluke tips
const SPEED = 0.62;                    // m/s glide speed (slow, so it stays framed)
const ANG = 0.46;                      // heading, radians below horizontal (~26°)
const T_MID = 3.0;                     // beat time at which the whale centre passes (MID_X, MID_Y)
const MID_X = -0.2, MID_Y = DEPTH + 0.05;
const CLICKS = [1.75, 2.95, 3.95];     // echolocation click trains (beat time), each = 3 clicks
const RIM = [150, 215, 240];
const BIO = [90, 215, 255];

// ------------------------------------------------------------------ silhouette (local metres, +x = head, +y = belly)
// Keyframes of the lateral profile: Cuvier's beaked whale — short beak, gently sloping melon,
// robust cigar body, deep tail stock. Smoothed with Catmull-Rom into dense contours once at load.
const TOP_K = [[2.76, 0.1], [2.7, 0.05], [2.58, 0.0], [2.44, -0.08], [2.25, -0.22], [2.0, -0.35], [1.6, -0.47],
  [1.05, -0.54], [0.4, -0.565], [-0.3, -0.54], [-0.9, -0.47], [-1.4, -0.37], [-1.8, -0.265], [-2.15, -0.16], [-2.42, -0.09], [-2.56, -0.065]];
const BOT_K = [[2.76, 0.1], [2.72, 0.145], [2.55, 0.19], [2.25, 0.27], [1.8, 0.38], [1.2, 0.49], [0.5, 0.54], [-0.2, 0.52],
  [-0.8, 0.45], [-1.3, 0.34], [-1.7, 0.22], [-2.1, 0.12], [-2.4, 0.068], [-2.56, 0.048]];

function catmull(pts, steps = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const TOP = catmull(TOP_K);
const BOT = catmull(BOT_K);
const topAt = (x) => { for (let i = 1; i < TOP.length; i++) if (TOP[i][0] <= x) return L.lerp(TOP[i][1], TOP[i - 1][1], L.invLerp(TOP[i][0], TOP[i - 1][0], x)); return TOP[TOP.length - 1][1]; };
const botAt = (x) => { for (let i = 1; i < BOT.length; i++) if (BOT[i][0] <= x) return L.lerp(BOT[i][1], BOT[i - 1][1], L.invLerp(BOT[i][0], BOT[i - 1][0], x)); return BOT[BOT.length - 1][1]; };

// scars: paired linear rake marks (from other males' teeth) + small oval cookie-cutter bites
const SCARS = (() => {
  const r = L.rng(404), out = [];
  for (let i = 0; i < 15; i++) {
    const x = L.lerp(-1.7, 2.1, Math.pow(r(), 0.8));
    const half = (botAt(x) - topAt(x)) / 2, mid = (botAt(x) + topAt(x)) / 2;
    out.push({ x, y: mid + (r() * 2 - 1) * half * 0.7, len: L.lerp(0.2, 0.55, r()), a: (r() * 2 - 1) * 0.3, pair: r() < 0.7, al: L.lerp(0.1, 0.24, r()) });
  }
  return out;
})();
const BITES = (() => {
  const r = L.rng(405);
  return Array.from({ length: 12 }, () => { const x = L.lerp(-1.6, 1.6, r()); const mid = (botAt(x) + topAt(x)) / 2, half = (botAt(x) - topAt(x)) / 2; return [x, mid + (r() * 2 - 1) * half * 0.7, L.lerp(0.025, 0.05, r())]; });
})();

// ------------------------------------------------------------------ motion
function pose(t) {
  const ang = ANG + 0.035 * L.noise1(t * 0.35, 41);
  const k = SPEED * (t - T_MID);
  return { x: MID_X + Math.cos(ANG) * k, y: MID_Y + Math.sin(ANG) * k, ang };
}
// fluke stroke: slow, glide-like, with a gently varying amplitude
const STROKE_W = Math.PI * 2 * 0.36;
function bend(x, t) {
  if (x > 0.4) return 0;
  const u = (0.4 - x) / 2.96;
  const amp = 0.17 * (0.7 + 0.3 * Math.sin(t * 0.9 + 1.2));
  return amp * u * u * Math.sin(STROKE_W * t - 1.5 * u);
}
const bendSlope = (x, t) => (bend(x - 0.02, t) - bend(x + 0.02, t)) / 0.04;   // d(y)/d(-x)

// ------------------------------------------------------------------ bioluminescent sparks stirred by the whale
const SPARKS = (() => {
  const r = L.rng(4242), out = [];
  for (let i = 0; i < 64; i++) {
    const ta = L.lerp(0.5, 4.9, r());
    const tail = r() < 0.6;
    const along = tail ? L.lerp(-2.9, -1.2, r()) : L.lerp(0.6, 2.8, r());   // body station that triggers it
    const side = r() < 0.5 ? -1 : 1;
    const w = side * (tail ? L.lerp(0.25, 1.1, r()) : L.lerp(0.62, 1.05, r()));
    out.push({ ta, along, w, size: L.lerp(0.6, 1.4, r()), ph: r() * 10, hue: r(), behind: r() < 0.45 });
  }
  return out;
})();
// world position of a spark: the point where the given body station was at the trigger time
function sparkPos(sp, t) {
  const p = pose(sp.ta);
  const c = Math.cos(p.ang), s = Math.sin(p.ang);
  const lx = sp.along, ly = sp.w + bend(sp.along, sp.ta);
  let x = p.x + c * lx - s * ly, y = p.y + s * lx + c * ly;
  const age = Math.max(0, t - sp.ta);
  const push = 1 - Math.exp(-age * 1.6);
  // wake: dragged a little along the heading, curled outward from the axis, then drifts
  x += c * 0.35 * push - s * Math.sign(sp.w) * 0.25 * push + L.noise1(t * 0.5 + sp.ph, 7) * 0.12;
  y += s * 0.35 * push + c * Math.sign(sp.w) * 0.25 * push + L.noise1(t * 0.45 + sp.ph, 8) * 0.12 - age * 0.04;
  return [x, y, age];
}

// distant bioluminescence (parallax bokeh) around the whale's depth
const BOKEH = (() => {
  const r = L.rng(77);
  return Array.from({ length: 26 }, () => ({ x: L.lerp(-9, 9, r()), y: DEPTH + L.lerp(-15, 15, r()), f: L.lerp(0.45, 0.8, r()), r: L.lerp(3, 9, r()), ph: r() * 20, a: L.lerp(0.12, 0.35, r()) }));
})();
const FRONT = (() => {
  const r = L.rng(78);
  return Array.from({ length: 5 }, () => ({ x: L.lerp(-7, 7, r()), y: DEPTH + L.lerp(-11, 11, r()), f: L.lerp(1.35, 1.6, r()), r: L.lerp(22, 40, r()), ph: r() * 20 }));
})();

// ------------------------------------------------------------------ drawing
function bodyPath(ctx, t) {
  ctx.beginPath();
  TOP.forEach(([x, y], i) => { const yy = y + bend(x, t); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
  for (let i = BOT.length - 1; i >= 0; i--) { const [x, y] = BOT[i]; ctx.lineTo(x, y + bend(x, t)); }
  ctx.closePath();
}
function finPath(ctx, t, open = false) {
  const b0 = -0.72, b1 = -1.26;
  const o = open ? 0 : 0.03;                                // open (rim) path starts exactly on the back line
  const y0 = topAt(b0) + bend(b0, t) + o, y1 = topAt(b1) + bend(b1, t) + o;
  const tipX = -1.2, tipY = topAt(-1.1) + bend(-1.15, t) - 0.25;
  ctx.beginPath();
  ctx.moveTo(b0, y0);
  ctx.quadraticCurveTo(-0.95, y0 - 0.2, tipX, tipY);       // leading edge, swept back
  ctx.quadraticCurveTo(-1.17, tipY + 0.1, b1, y1);         // falcate trailing edge
  if (!open) ctx.closePath();
}
function flukePath(ctx, t, upperOnly = false) {
  const x0 = -2.52, y0 = bend(x0, t) + 0.0;
  const a = Math.atan(bendSlope(x0, t)) * 1.9;              // flukes pitch with the stroke
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(-a);
  ctx.beginPath();
  // flukes are a horizontal blade seen almost edge-on: thin, tapered, swept back, un-notched.
  // Slight oblique hint: the far lobe is a touch shorter and higher than the near lobe (not mirrored).
  ctx.moveTo(0.05, -0.04);
  ctx.bezierCurveTo(-0.2, -0.05, -0.5, -0.056, -0.7, -0.05);    // far lobe leading edge (upper)
  if (upperOnly) { ctx.restore(); return; }
  ctx.quadraticCurveTo(-0.745, -0.046, -0.735, -0.025);         // rounded far tip
  ctx.quadraticCurveTo(-0.8, 0.005, -0.765, 0.038);             // shallow convex trailing edge
  ctx.quadraticCurveTo(-0.75, 0.052, -0.69, 0.048);             // near lobe tip
  ctx.bezierCurveTo(-0.46, 0.046, -0.18, 0.045, 0.05, 0.04);    // near lobe leading edge (lower)
  ctx.closePath();
  ctx.restore();
}
function flipperPath(ctx, t) {
  ctx.beginPath();
  ctx.moveTo(1.62, 0.26);
  ctx.quadraticCurveTo(1.35, 0.42, 1.06, 0.6);
  ctx.quadraticCurveTo(1.12, 0.48, 1.3, 0.3);
  ctx.closePath();
}

function drawWhale(ctx, v, p, t, lit) {
  const s = v.ws(1);
  ctx.save();
  ctx.translate(v.wx(p.x), v.wy(p.y));
  ctx.rotate(p.ang);
  ctx.scale(s, s);
  const px = 1 / s;                                    // one screen pixel in local metres

  // base fill: dorsal-lit near-black body
  const g = ctx.createLinearGradient(0, -0.5, 0, 0.5);
  g.addColorStop(0, L.rgba(L.mix([14, 19, 26], [40, 54, 66], lit)));
  g.addColorStop(0.45, L.rgba(L.mix([8, 11, 16], [17, 23, 30], lit)));
  g.addColorStop(1, L.rgba([5, 7, 10]));
  ctx.fillStyle = g;
  flukePath(ctx, t); ctx.fill();
  finPath(ctx, t); ctx.fill();
  bodyPath(ctx, t); ctx.fill();

  // details clipped to the body
  ctx.save();
  bodyPath(ctx, t);
  ctx.clip();
  // pale, scarred head (Cuvier's whales whiten with age)
  const hg = ctx.createLinearGradient(1.0, 0, 2.6, 0);
  hg.addColorStop(0, 'rgba(150,150,140,0)');
  hg.addColorStop(1, `rgba(150,152,142,${0.42 * lit + 0.06})`);
  ctx.fillStyle = hg;
  ctx.fillRect(0.9, -0.6, 2, 1.2);
  // belly shadow (form shading)
  const bg = ctx.createLinearGradient(0, 0.05, 0, 0.5);
  bg.addColorStop(0, 'rgba(0,0,0,0)');
  bg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = bg;
  ctx.fillRect(-3, -0.6, 6, 1.2);
  // soft specular sheen along the upper flank (gives the body volume)
  const sh = ctx.createLinearGradient(0, -0.5, 0, 0.1);
  sh.addColorStop(0, 'rgba(160,205,230,0)');
  sh.addColorStop(0.35, `rgba(160,205,230,${0.13 * lit})`);
  sh.addColorStop(1, 'rgba(160,205,230,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = sh;
  ctx.fillRect(-2.2, -0.6, 4.6, 0.75);
  ctx.globalCompositeOperation = 'source-over';
  // rake scars
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.012, 1.1 * px);
  for (const sc of SCARS) {
    const b = bend(sc.x, t);
    ctx.strokeStyle = `rgba(215,220,215,${sc.al * (0.25 + 0.75 * lit)})`;
    const dx = Math.cos(sc.a) * sc.len / 2, dy = Math.sin(sc.a) * sc.len / 2;
    for (let k = 0; k < (sc.pair ? 2 : 1); k++) {
      const o = k * 0.035;
      ctx.beginPath();
      ctx.moveTo(sc.x - dx, sc.y - dy + b + o);
      ctx.quadraticCurveTo(sc.x, sc.y + b + o - 0.02, sc.x + dx, sc.y + dy + b + o);
      ctx.stroke();
    }
  }
  ctx.fillStyle = `rgba(200,205,200,${0.16 * (0.3 + 0.7 * lit)})`;
  for (const [x, y, r] of BITES) { ctx.beginPath(); ctx.ellipse(x, y + bend(x, t), r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill(); }
  // mouth line: the short upturned "smile" of the beak
  ctx.strokeStyle = `rgba(0,0,0,${0.5 + 0.3 * lit})`;
  ctx.lineWidth = Math.max(0.012, 1.3 * px);
  ctx.beginPath(); ctx.moveTo(2.77, 0.095); ctx.quadraticCurveTo(2.55, 0.11, 2.36, 0.05); ctx.stroke();
  // eye: small, dark, understated
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath(); ctx.ellipse(2.08, 0.0, 0.035, 0.025, 0.2, 0, Math.PI * 2); ctx.fill();
  // light sweep travelling head → tail as the camera arrives
  const sweep = L.prog(t, 1.25, 1.7);
  if (sweep > 0 && sweep < 1) {
    const cx = L.lerp(3.4, -3.6, L.ease.inOutCubic(sweep));
    const sg = ctx.createLinearGradient(cx - 0.7, -0.3, cx + 0.7, 0.3);
    sg.addColorStop(0, 'rgba(170,220,240,0)');
    sg.addColorStop(0.5, `rgba(170,220,240,${0.22 * Math.sin(Math.PI * sweep)})`);
    sg.addColorStop(1, 'rgba(170,220,240,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = sg;
    ctx.fillRect(-3.2, -0.7, 6.4, 1.4);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  // flipper (near side), with a faint edge light
  ctx.fillStyle = L.rgba(L.mix([8, 11, 15], [22, 30, 38], lit));
  flipperPath(ctx, t); ctx.fill();
  ctx.strokeStyle = L.rgba(RIM, 0.25 * lit);
  ctx.lineWidth = 1.2 * px;
  ctx.stroke();

  // rim light along the back, fin and flukes (cold, from above)
  const rimA = 0.25 + 0.65 * lit;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = L.rgba(RIM, 0.9);
  ctx.shadowBlur = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const rg = ctx.createLinearGradient(2.8, 0, -2.6, 0);
  rg.addColorStop(0, L.rgba(RIM, rimA * 0.55));
  rg.addColorStop(0.35, L.rgba(RIM, rimA));
  rg.addColorStop(1, L.rgba(RIM, rimA * 0.35));
  ctx.strokeStyle = rg;
  ctx.lineWidth = 2.2 * px;
  ctx.beginPath();
  // the back line, broken at the fin base so the rim flows up and over the fin as one contour
  let pen = false;
  TOP.forEach(([x, y]) => {
    if (x > 2.7 || (x < -0.72 && x > -1.26)) { pen = false; return; }
    const yy = y + bend(x, t);
    pen && x < 2.66 ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
    pen = true;
  });
  ctx.stroke();
  ctx.lineWidth = 1.9 * px;
  finPath(ctx, t, true); ctx.stroke();
  // flukes: only the upper (lit) edge catches the rim light
  ctx.strokeStyle = L.rgba(RIM, rimA * 0.5);
  ctx.lineWidth = 1.6 * px;
  flukePath(ctx, t, true); ctx.stroke();
  // faint bioluminescent bounce under the belly
  ctx.shadowColor = L.rgba(BIO, 0.8);
  ctx.strokeStyle = L.rgba(BIO, 0.16 * lit);
  ctx.lineWidth = 1.4 * px;
  ctx.beginPath();
  BOT.forEach(([x, y], i) => { if (x > 1.9 || x < -2.2) return; const yy = y + bend(x, t); ctx.lineTo(x, yy); });
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawSparks(ctx, v, t, behind) {
  for (const sp of SPARKS) {
    if (sp.behind !== behind) continue;
    const age = t - sp.ta;
    if (age < 0 || age > 3.2) continue;
    const I = L.ease.outCubic(L.clamp(age / 0.18)) * Math.exp(-age / 1.15) * (0.75 + 0.25 * L.noise1(v.gt * 9 + sp.ph, 3));
    if (I < 0.02) continue;
    const [x, y] = sparkPos(sp, t);
    const sx = v.wx(x), sy = v.wy(y);
    const col = L.mix(BIO, [120, 255, 210], sp.hue);
    const s = v.ws(1);
    L.lightBlob(ctx, sx, sy, Math.max(0, 0.22 * s * sp.size), col, 0.5 * I);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.5), Math.min(1, 1.1 * I));
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0, 0.022 * s * sp.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBokeh(ctx, v, list, t, front) {
  const s = v.ws(1);
  for (const b of list) {
    const sx = W / 2 + (b.x - v.cam.x) * s * b.f, sy = H / 2 + (b.y - v.cam.y) * s * b.f;
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
    const fl = 0.55 + 0.45 * L.noise1(v.gt * 0.8 + b.ph, 12);
    if (front) L.lightBlob(ctx, sx, sy, Math.max(0, b.r), [80, 170, 220], 0.07 * fl);
    else L.lightBlob(ctx, sx, sy, Math.max(0, b.r * 2.2), BIO, b.a * fl * 0.5);
  }
}

function drawClicks(ctx, v, t, p) {
  const s = v.ws(1);
  const c = Math.cos(p.ang), sn = Math.sin(p.ang);
  const mx = p.x + c * 2.42 - sn * -0.12, my = p.y + sn * 2.42 + c * -0.12;   // the melon
  const ex = v.wx(mx), ey = v.wy(my);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const te of CLICKS) {
    for (let k = 0; k < 3; k++) {
      const a = t - te - k * 0.16;
      if (a < 0 || a > 1.7) continue;
      const r = (0.35 + a * 2.9) * s;
      const al = 0.55 * Math.pow(1 - a / 1.7, 1.4) * (1 - k * 0.2);
      const span = 0.36 + a * 0.06;
      ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.35), al);
      ctx.shadowColor = L.rgba(v.accent, 0.8);
      ctx.shadowBlur = 12;
      ctx.lineWidth = Math.max(1.5, 3.2 * (1 - a / 1.7));
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(0, r), p.ang - span, p.ang + span);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: "Cuvier's beaked whale", sub: 'The deepest-diving mammal' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 1.35, name: 'whale', gain: 0.22, pitch: 0.8 },
      { t: 1.5, name: 'shimmer', gain: 0.14, pitch: 1.2 },
      ...CLICKS.map((t, i) => ({ t, name: 'sonar', gain: 0.3 - i * 0.04, pitch: 1.15 + i * 0.05 })),
    ];
  },
  drawWorld(ctx, v) {
    if (!v.visibleY(DEPTH - 20, DEPTH + 20)) return;
    const s = v.ws(1);
    if (s * LEN < 2) return;                          // sub-pixel at the far zoom-out: leave the column clean
    const t = v.t;
    const p = pose(t);
    const near = L.clamp((s - 15) / 30);              // close-up detail fades in as we zoom in
    const lit = L.ease.inOutCubic(L.prog(t, 0.9, 1.4));

    if (near > 0) {
      ctx.save();
      ctx.globalAlpha = near;
      drawBokeh(ctx, v, BOKEH, t, false);
      // cold volumetric halo that separates the dark body from the dark water
      L.lightBlob(ctx, v.wx(p.x), v.wy(p.y), Math.max(0, 4.2 * s), [30, 80, 120], 0.12 * (0.4 + 0.6 * lit));
      drawSparks(ctx, v, t, true);
      ctx.restore();
    }
    drawWhale(ctx, v, p, t, lit);
    if (near > 0) {
      ctx.save();
      ctx.globalAlpha = near;
      drawSparks(ctx, v, t, false);
      drawClicks(ctx, v, t, p);
      drawBokeh(ctx, v, FRONT, t, true);
      ctx.restore();
    }
  },
  drawOverlay(ctx, v) {
    const k = Math.min(v.k, L.prog(v.t, 0.9, 0.45));   // wait until the camera is nearly at depth
    const kk = k * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.3, 0.3)));   // gone before the camera leaves the whale
    L.bigLabel(ctx, { x: 200, y: 560, big: '2,992 m', small: '9,816 ft · on a single breath', k: kk, accent: v.accent });
  },
};
