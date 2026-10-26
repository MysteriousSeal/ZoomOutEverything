// Beat 0 — the hook. A swimmer at the surface at true scale (1.75 m), slow breaststroke,
// light caustics and bubbles; a masked, staggered headline over the bright sky.
import * as L from '../../../../engine/runtime/lib.js';

const { W, H } = L;
const INK = [10, 30, 52];
const T = 2.1;                // stroke period (s)
const HIP_Y = 0.15;           // hips 15 cm under the surface

// ------------------------------------------------------------------ treading water (profile, facing right)
// Upright swimmer, head above the surface, slow sculling arms and an alternating
// breaststroke ("eggbeater") kick. All lengths in metres; 1.75 m tall.

/** two-bone IK: from root A to target B, segment lengths a,b; sign picks the bend side. Returns joint. */
function ik(A, B, a, b, sign) {
  const dx = B[0] - A[0], dy = B[1] - A[1];
  let d = Math.hypot(dx, dy);
  d = L.clamp(d, Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const ang = Math.atan2(dy, dx);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const off = Math.acos(L.clamp(cosA, -1, 1)) * sign;
  return [A[0] + Math.cos(ang + off) * a, A[1] + Math.sin(ang + off) * a];
}
const ext = (A, B, len, rot = 0) => {
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) + rot;
  return [B[0] + Math.cos(ang) * len, B[1] + Math.sin(ang) * len];
};

// torso outline relative to the neck base (x forward, y down)
const TORSO = [[-0.06, 0.0], [-0.12, 0.10], [-0.135, 0.28], [-0.105, 0.44], [-0.14, 0.58], [-0.11, 0.70],
  [0.06, 0.72], [0.10, 0.58], [0.085, 0.46], [0.125, 0.30], [0.12, 0.15], [0.07, 0.04], [0.03, -0.02]];
// head profile relative to the head centre (x forward, y down): crown, brow, nose, lips, chin, jaw, nape
const HEAD = [[-0.02, -0.125], [0.07, -0.10], [0.105, -0.03], [0.128, 0.01], [0.102, 0.04], [0.108, 0.07],
  [0.07, 0.115], [0.0, 0.10], [-0.08, 0.06], [-0.11, -0.03], [-0.085, -0.10]];

/** Full pose at global time t. side 0 = near limbs, 1 = far limbs (opposite phase). World metres. */
function pose(t, side = 0) {
  const w = (Math.PI * 2) / 1.9;                       // kick period 1.9 s
  const bob = 0.022 * Math.sin(t * w * 2 + 0.6);       // two kicks per cycle lift the body
  const lean = 0.16 + 0.03 * Math.sin(t * 0.9);
  // the swimmer glances down into the deep as the dive is about to start
  const look = L.ease.inOutCubic(L.prog(t, 1.75, 0.9));
  const nod = L.lerp(-0.05 + 0.04 * Math.sin(t * 1.3), 0.38, look);
  // neck ~12 cm above the mean surface: waterline at the collarbone, chin clears the wave crests
  const neck = [0.02 + 0.015 * Math.sin(t * 0.8), -0.115 + bob + 0.02 * look];
  const c = Math.cos(lean), s = Math.sin(lean);
  // rotate around the neck: positive lean tips the head forward
  const R = ([x, y]) => [neck[0] + x * c - y * s, neck[1] + x * s + y * c];
  const ph = t * w + (side ? Math.PI : 0);
  const shoulder = [-0.01, 0.11], hip = [-0.02, 0.63];
  // hands scull forward/back at chest depth
  const hand = [0.46 + 0.1 * Math.sin(ph * 0.5 + 0.4), 0.33 + 0.04 * Math.cos(ph + 0.4)];
  const elbow = ik(shoulder, hand, 0.30, 0.27, 1);
  const palm = ext(elbow, hand, 0.16, 0.25 * Math.cos(ph * 0.5));
  // eggbeater: each ankle traces an ellipse, knees forward
  // legs hang fairly vertical below the hips (knees ~45-60 deg), so it reads as treading, not kneeling
  const ankle = [-0.02 + 0.15 * Math.cos(ph), 1.27 + 0.07 * Math.sin(ph)];
  const knee = ik(hip, ankle, 0.45, 0.43, -1);
  const toe = ext(knee, ankle, 0.19, -1.05 + 0.35 * Math.sin(ph + 0.9));
  // head rotates around the neck by `nod`
  const hc = [0.03, -0.12];
  const cn = Math.cos(nod), sn = Math.sin(nod);
  const headPts = HEAD.map(([x, y]) => { const px = hc[0] + x, py = hc[1] + y; return R([px * cn - py * sn, px * sn + py * cn]); });
  return {
    headPts, neck: R([0, 0]), shoulder: R(shoulder), hip: R(hip),
    elbow: R(elbow), wrist: R(hand), hand: R(palm),
    knee: R(knee), ankle: R(ankle), toe: R(toe),
    torso: TORSO.map(R),
    face: R([hc[0] * cn - hc[1] * sn + 0.09, hc[0] * sn + hc[1] * cn]),
  };
}

// ------------------------------------------------------------------ drawing helpers
function capsule(ctx, v, A, ra, B, rb) {
  const x1 = v.wx(A[0]), y1 = v.wy(A[1]), x2 = v.wx(B[0]), y2 = v.wy(B[1]);
  const r1 = Math.max(0, v.ws(ra)), r2 = Math.max(0, v.ws(rb));
  const d = Math.hypot(x2 - x1, y2 - y1);
  ctx.beginPath();
  ctx.arc(x1, y1, r1, 0, Math.PI * 2);
  ctx.moveTo(x2 + r2, y2);
  ctx.arc(x2, y2, r2, 0, Math.PI * 2);
  ctx.fill();
  if (d <= Math.abs(r1 - r2)) return;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const off = Math.acos(L.clamp((r1 - r2) / d, -1, 1));
  ctx.beginPath();
  ctx.moveTo(x1 + Math.cos(ang + off) * r1, y1 + Math.sin(ang + off) * r1);
  ctx.lineTo(x2 + Math.cos(ang + off) * r2, y2 + Math.sin(ang + off) * r2);
  ctx.lineTo(x2 + Math.cos(ang - off) * r2, y2 + Math.sin(ang - off) * r2);
  ctx.lineTo(x1 + Math.cos(ang - off) * r1, y1 + Math.sin(ang - off) * r1);
  ctx.closePath();
  ctx.fill();
}

function smoothPoly(ctx, v, pts) {
  const sp = pts.map(([x, y]) => [v.wx(x), v.wy(y)]);
  const n = sp.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = sp[i], b = sp[(i + 1) % n];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (i === 0) ctx.moveTo(m[0], m[1]);
    else ctx.quadraticCurveTo(a[0], a[1], m[0], m[1]);
  }
  const a = sp[0], b = sp[1];
  ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  ctx.closePath();
  ctx.fill();
}

function ellipseW(ctx, v, C, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(v.wx(C[0]), v.wy(C[1]), Math.max(0, v.ws(rx)), Math.max(0, v.ws(ry)), rot, 0, Math.PI * 2);
  ctx.fill();
}

function drawFigure(ctx, v, q, near = true) {
  // leg first (behind the torso), then torso, head, arm
  capsule(ctx, v, q.hip, 0.092, q.knee, 0.06);
  capsule(ctx, v, q.knee, 0.057, q.ankle, 0.034);
  capsule(ctx, v, q.ankle, 0.032, q.toe, 0.014);
  if (near) {
    smoothPoly(ctx, v, q.torso);
    capsule(ctx, v, q.neck, 0.05, [q.neck[0], q.neck[1] - 0.06], 0.05);
    smoothPoly(ctx, v, q.headPts);
  }
  capsule(ctx, v, q.shoulder, 0.055, q.elbow, 0.04);
  capsule(ctx, v, q.elbow, 0.04, q.wrist, 0.028);
  capsule(ctx, v, q.wrist, 0.028, q.hand, 0.016);
}

// Same wave as env's surface line, so the water-line clip matches exactly.
function surfacePath(ctx, v, below) {
  const sy = v.wy(0);
  const amp = L.clamp(0.25 / v.cam.mpp, 0, 22);
  ctx.beginPath();
  for (let x = -20; x <= W + 20; x += 8) {
    const y = sy + Math.sin(x * 0.012 + v.gt * 2.2) * amp + Math.sin(x * 0.031 - v.gt * 1.4) * amp * 0.4;
    x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 20, below ? H + 20 : -20);
  ctx.lineTo(-20, below ? H + 20 : -20);
  ctx.closePath();
}
function surfaceAt(v, sx) {
  const amp = L.clamp(0.25 / v.cam.mpp, 0, 22);
  return v.wy(0) + Math.sin(sx * 0.012 + v.gt * 2.2) * amp + Math.sin(sx * 0.031 - v.gt * 1.4) * amp * 0.4;
}

// deterministic bubbles: shed by the sculling hands and the kicking feet, rising to the surface
const BUB = (() => {
  const r = L.rng(707), out = [];
  for (let i = 0; i < 70; i++) out.push({ birth: -2.5 + i * 0.085 + r() * 0.06, src: i % 2, side: (i >> 1) % 2, r: 0.003 + r() * r() * 0.016, ph: r() * 10, dx: r() - 0.5 });
  return out;
})();

function drawBubbles(ctx, v) {
  ctx.save();
  for (const b of BUB) {
    const age = v.gt - b.birth;
    if (age < 0 || age > 3.2) continue;
    const q = pose(b.birth, b.side);
    const o = b.src === 0 ? q.hand : q.toe;
    const rise = 0.06 * age + 0.11 * age * age;
    const x = o[0] + 0.12 * age * b.dx + 0.025 * Math.sin(age * 6 + b.ph);
    const y = o[1] - rise;
    if (y < 0.02) continue;
    const a = L.clamp(age / 0.2) * (1 - L.clamp((age - 2.4) / 0.8)) * L.clamp((y - 0.02) / 0.08);
    const sx = v.wx(x), sy = v.wy(y), rr = Math.max(0, v.ws(b.r * (1 + age * 0.3)));
    if (rr < 0.5 || a <= 0) continue;
    ctx.strokeStyle = `rgba(225,248,255,${0.6 * a})`;
    ctx.lineWidth = Math.max(0.8, rr * 0.2);
    ctx.beginPath(); ctx.arc(sx, sy, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.7 * a})`;
    ctx.beginPath(); ctx.arc(sx - rr * 0.35, sy - rr * 0.35, Math.max(0, rr * 0.3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Caustic net: two families of broken, wandering light strands just under the surface. */
function drawCaustics(ctx, v, k) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const x0 = v.cam.x - (W / 2 + 40) * v.cam.mpp, x1 = v.cam.x + (W / 2 + 40) * v.cam.mpp;
  for (let j = 0; j < 16; j++) {
    const depth = 0.3 + j * 0.34;
    if (!v.visibleY(depth - 0.4, depth + 0.4, 50)) continue;
    const fade = Math.exp(-depth / 2.6) * k;
    const slope = (j % 2 ? 0.22 : -0.18);
    ctx.strokeStyle = `rgba(200,248,255,${0.085 * fade})`;
    ctx.lineWidth = Math.max(1, v.ws(0.014 * (1 + depth * 0.5)));
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= 80; i++) {
      const x = L.lerp(x0, x1, i / 80);
      const n = L.noise1(x * 1.5 + v.gt * 0.5 + j * 3.1, j) + 0.45 * L.noise1(x * 3.7 - v.gt * 0.8, j + 40);
      const y = depth + 0.2 * n + slope * (x - v.cam.x) * 0.3;
      const on = L.noise1(x * 1.9 + j * 7 + v.gt * 0.35, 90 + j) > 0.05;
      if (on) { pen ? ctx.lineTo(v.wx(x), v.wy(y)) : ctx.moveTo(v.wx(x), v.wy(y)); pen = true; } else pen = false;
    }
    ctx.stroke();
  }
  ctx.restore();
}

// the swimmer is composed on its own layer so skin effects (source-atop) only touch the body
let LAYER = null;
function layer() {
  if (!LAYER) LAYER = new OffscreenCanvas(W, H);
  const c = LAYER.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  return c;
}

function drawSwimmer(ctx, v) {
  const far = pose(v.gt, 1), q = pose(v.gt, 0);
  const rimOff = Math.max(1, v.ws(0.011));
  const c = layer();
  // ---- underwater: seen through water (tinted), rim-lit from the surface
  c.save();
  surfacePath(c, v, true); c.clip();
  c.fillStyle = 'rgb(30,100,136)';
  drawFigure(c, v, far, false);
  c.save(); c.translate(-rimOff * 0.6, -rimOff); c.fillStyle = 'rgba(175,238,252,0.9)'; drawFigure(c, v, q); c.restore();
  c.fillStyle = 'rgb(12,52,82)';
  drawFigure(c, v, q);
  c.globalCompositeOperation = 'source-atop';
  // the body fades into the water with depth
  const g = c.createLinearGradient(0, v.wy(0), 0, v.wy(1.7));
  g.addColorStop(0, 'rgba(20,80,115,0)');
  g.addColorStop(1, 'rgba(20,80,115,0.5)');
  c.fillStyle = g;
  c.fillRect(0, v.wy(0), W, v.ws(1.8));
  // moving caustic dapples on the skin
  for (let i = 0; i < 7; i++) {
    const yy = 0.1 + i * 0.22 + 0.05 * L.noise1(v.gt * 0.8 + i, 30);
    const xx = 0.2 * L.noise1(v.gt * 0.6 + i * 1.7, 20 + i);
    const r = v.ws(0.13);
    const rg = c.createRadialGradient(v.wx(xx), v.wy(yy), 0, v.wx(xx), v.wy(yy), r);
    rg.addColorStop(0, `rgba(120,220,245,${0.28 * Math.exp(-yy / 1.2)})`);
    rg.addColorStop(1, 'rgba(120,220,245,0)');
    c.fillStyle = rg;
    c.fillRect(v.wx(xx) - r, v.wy(yy) - r, r * 2, r * 2);
  }
  c.restore();
  // ---- above the water: crisp dark silhouette with a sky rim
  c.save();
  surfacePath(c, v, false); c.clip();
  c.save(); c.translate(-rimOff * 0.6, -rimOff); c.fillStyle = 'rgba(255,255,255,0.95)'; drawFigure(c, v, q); c.restore();
  c.fillStyle = 'rgb(9,22,36)';
  drawFigure(c, v, q);
  // wet sheen on the cap
  c.globalCompositeOperation = 'source-atop';
  const h = q.headPts[0], hr = v.ws(0.08);
  const hg = c.createRadialGradient(v.wx(h[0] - 0.03), v.wy(h[1] + 0.04), 0, v.wx(h[0] - 0.03), v.wy(h[1] + 0.04), hr);
  hg.addColorStop(0, 'rgba(170,205,230,0.55)');
  hg.addColorStop(1, 'rgba(170,205,230,0)');
  c.fillStyle = hg;
  c.fillRect(v.wx(h[0] - 0.03) - hr, v.wy(h[1] + 0.04) - hr, hr * 2, hr * 2);
  c.restore();
  ctx.drawImage(LAYER, 0, 0);
  return q;
}

function drawWaterline(ctx, v, q) {
  ctx.save();
  const nx = v.wx(q.neck[0] + 0.01);
  // meniscus collar where the neck breaks the surface
  const sy = surfaceAt(v, nx);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1.5, v.ws(0.01));
  ctx.beginPath();
  ctx.ellipse(nx, sy, Math.max(0, v.ws(0.11)), Math.max(0, v.ws(0.022)), 0, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // glints travelling away from the swimmer along the surface
  for (let i = 0; i < 8; i++) {
    const dir = i % 2 ? 1 : -1;
    const age = ((v.gt * 0.55 + i * 0.27) % 1);
    const gx = nx + dir * v.ws(0.14 + age * 1.3);
    const gy = surfaceAt(v, gx);
    const a = 0.75 * Math.sin(Math.PI * age);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = Math.max(1.2, v.ws(0.008));
    ctx.beginPath();
    ctx.moveTo(gx - v.ws(0.05 * (1 - age * 0.5)), gy + 2);
    ctx.lineTo(gx + v.ws(0.05 * (1 - age * 0.5)), gy + 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ scene
export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 2,
  cues(d) {
    return [
      { t: 0.2, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 0.44, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 1.1, name: 'swish', gain: 0.32, pitch: 1.0 },
      { t: 1.24, name: 'tick', gain: 0.3, pitch: 1.2 },
      { t: d - 0.14, name: 'swish', gain: 0.2, pitch: 0.8 },
    ];
  },

  drawWorld(ctx, v) {
    const len = v.ws(1.75);
    if (len < 1.2 || !v.visibleY(-0.5, 2, 50)) return;
    const near = v.cam.mpp < 0.03;
    if (near) drawCaustics(ctx, v, L.clamp((0.03 - v.cam.mpp) / 0.015));
    if (len < 18) {
      // far away: a tiny upright mark hanging from the waterline (findable on pull-outs)
      const sx = v.wx(0), sy = v.wy(0);
      // after the close-up dissolves, the mark settles in once the camera has slowed down
      const mk = v.t > v.d ? L.prog(v.t, v.d + 0.7, 0.6) : 1;
      if (mk <= 0) return;
      ctx.fillStyle = `rgba(8,26,44,${0.9 * mk})`;
      ctx.fillRect(sx - Math.max(0.6, len * 0.09), sy - len * 0.1, Math.max(1.2, len * 0.18), Math.max(1.5, len * 0.95));
      return;
    }
    // once the dive starts the close-up swimmer dissolves instead of streaking through the travel
    const fade = 1 - L.ease.outCubic(L.prog(v.t, v.d, 0.3));
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha *= fade;
    const q = drawSwimmer(ctx, v);
    drawWaterline(ctx, v, q);
    if (near) drawBubbles(ctx, v);
    ctx.restore();
  },

  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    const lines = [
      { txt: 'HOW DEEP IS', y: 436, size: 150, t0: 0.18 },
      { txt: 'THE OCEAN,', y: 582, size: 150, t0: 0.42 },
      { txt: 'REALLY?', y: 772, size: 184, t0: 1.1, accent: true },
    ];
    // a thin accent rule draws in above the headline
    const rk = L.enter(t, 0.05, 0.6, L.ease.outExpo) * (1 - L.enter(t, d - 0.28, 0.28, L.ease.inCubic));
    if (rk > 0) {
      ctx.fillStyle = L.rgba(v.accent, 0.95);
      ctx.fillRect(W / 2 - 70 * rk, 292, 140 * rk, 5);
    }
    lines.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.62, L.ease.outExpo);
      const kout = L.enter(t, d - 0.25 + i * 0.04, 0.28, L.ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      ctx.save();
      ctx.font = L.font(ln.size, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const m = ctx.measureText(ln.txt);
      ctx.letterSpacing = '0px';
      // same origin trackedText uses; the bar is centred on the actual glyph ink, not the advance box
      const tw = m.width + 1, x0 = W / 2 - tw / 2;
      const inkL = x0 - m.actualBoundingBoxLeft, inkR = x0 + m.actualBoundingBoxRight;
      const top = ln.y - ln.size * 0.8, bot = ln.y + ln.size * 0.12;
      if (ln.accent) {
        // accent bar wipes in, word rises inside it in ink
        const bk = L.enter(t, ln.t0 - 0.06, 0.5, L.ease.outExpo);
        const bx0 = inkL - 38, bw = inkR - inkL + 76;
        const outW = 1 - kout;
        ctx.fillStyle = L.rgba(v.accent);
        const bL = bx0 + bw * (1 - outW) , bR = bx0 + bw * bk;
        if (bR > bL) {
          ctx.shadowColor = 'rgba(0,40,60,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
          ctx.fillRect(bL, top - 16, bR - bL, bot - top + 32);
          ctx.shadowColor = 'transparent';
        }
        ctx.beginPath(); ctx.rect(Math.max(bL, 0), top - 16, Math.max(0, bR - bL), bot - top + 32); ctx.clip();
        ctx.fillStyle = L.rgba([4, 22, 34]);
      } else {
        ctx.beginPath(); ctx.rect(0, top - 10, W, bot - top + 24); ctx.clip();
        ctx.fillStyle = L.rgba(INK);
      }
      const dy = (1 - kin) * ln.size * 1.05 - kout * ln.size * 1.1;
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, ln.txt, W / 2, ln.y + dy, -1, 'center');
      ctx.restore();
    });
  },
};
