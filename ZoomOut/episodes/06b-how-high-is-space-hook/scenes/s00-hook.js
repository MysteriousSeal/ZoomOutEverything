// Beat 0 — the hook. A person (1.75 m, true scale) stands on the ground at x = 0, facing the landmarks
// (+x). On "how far up" the head tilts back and a hand comes up to shade the eyes. Grass sways, pollen
// drifts through the light. Masked headline: HOW FAR UP / IS SPACE? ("SPACE?" on an accent bar).
// The figure stays in the world for the whole climb (a tiny mark at the foot of the statue, then gone).
import * as L from '../../../../engine/runtime/lib.js';
import { X } from '../camera.js';

const { W } = L;
const INK = [12, 22, 50];
const BODY = [21, 29, 46];
const RIM = [250, 248, 238];
const PX = X.person;

// ------------------------------------------------------------------ pose (metres, x forward, h up)
function ik(A, B, a, b, sign) {
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const d = L.clamp(Math.hypot(dx, dy), Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const ang = Math.atan2(dy, dx);
  const off = Math.acos(L.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)) * sign;
  return [A[0] + Math.cos(ang + off) * a, A[1] + Math.sin(ang + off) * a];
}
const rot = (P, C, a) => {
  const x = P[0] - C[0], y = P[1] - C[1], c = Math.cos(a), s = Math.sin(a);
  return [C[0] + x * c - y * s, C[1] + x * s + y * c];
};
// head profile around its centre (x forward, y up): crown, forehead, brow, nose, lips, chin, jaw, nape, back, hair
const HEAD = [[-0.03, 0.125], [0.05, 0.112], [0.092, 0.07], [0.1, 0.035], [0.13, -0.005], [0.104, -0.03], [0.11, -0.055],
  [0.1, -0.075], [0.075, -0.112], [0.02, -0.115], [-0.04, -0.08], [-0.075, -0.07], [-0.115, -0.02], [-0.118, 0.05], [-0.09, 0.105]];
// jacket + trousers torso (x forward, y up), relative to the hip centre
const TORSO = [[-0.135, -0.05], [-0.15, 0.08], [-0.13, 0.17], [-0.1, 0.3], [-0.125, 0.47], [-0.105, 0.53], [-0.04, 0.565], [0.05, 0.56],
  [0.105, 0.48], [0.13, 0.36], [0.115, 0.2], [0.135, 0.06], [0.13, -0.06]];

const TILT = [0.2, 1.15];   // head goes back on "how far up"
const HAND = [0.8, 0.95];   // the near arm rises to point up

function pose(t) {
  const look = L.ease.inOutCubic(L.prog(t, TILT[0], TILT[1]));
  const breathe = Math.sin(t * 2.1) * 0.006;
  const tilt = L.lerp(0.02, 0.62, look) + 0.025 * L.noise1(t * 0.6, 3) * look;
  const lean = -0.035 * look;                          // the body leans back a touch
  const hip = [0.0, 0.93];
  const R = (p) => rot([hip[0] + p[0], hip[1] + p[1]], [0, 0.05], lean);
  const torso = TORSO.map(([x, y]) => R([x, y * (1 + breathe)]));
  const shoulder = R([0.0, 0.48 + breathe * 0.5]);
  const neck = R([0.015, 0.565]);
  const pivot = [neck[0], neck[1] + 0.04];
  const hc0 = [neck[0] + 0.025, neck[1] + 0.13];
  const hc = rot(hc0, pivot, tilt);
  const head = HEAD.map(([x, y]) => rot([hc0[0] + x, hc0[1] + y], pivot, tilt));
  const brow = rot([hc0[0] + 0.115, hc0[1] + 0.06], pivot, tilt);
  // near arm: swings up from the side to point at the sky (the camera follows that line up)
  const hk = L.ease.inOutCubic(L.prog(t, HAND[0], HAND[1]));
  const ang = L.lerp(-1.62, 1.02, hk) + 0.03 * Math.sin(t * 1.1) * hk;
  const reach = 0.56 - 0.13 * Math.sin(Math.PI * hk);           // the elbow bends mid-swing
  const wrist = [shoulder[0] + Math.cos(ang) * reach, shoulder[1] + Math.sin(ang) * reach];
  const elbow = ik(shoulder, wrist, 0.3, 0.27, -1);
  const fa = Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]);
  const hand = [wrist[0] + Math.cos(fa) * 0.1, wrist[1] + Math.sin(fa) * 0.1];
  const finger = [wrist[0] + Math.cos(fa) * (0.1 + 0.09 * hk), wrist[1] + Math.sin(fa) * (0.1 + 0.09 * hk)];
  // far arm hangs and sways a little
  const sw = 0.03 * Math.sin(t * 1.3);
  const fEl = R([-0.04 + sw * 0.5, 0.2]), fWr = R([-0.02 + sw, -0.06]), fHa = R([0.0 + sw, -0.15]);
  return {
    torso, head, hc, neck, shoulder, elbow, wrist, hand, finger, fEl, fWr, fHa,
    legs: [
      { hip: [-0.03, 0.92], knee: [-0.02, 0.5], ankle: [-0.08, 0.085], toe: [0.13, 0.03] },
      { hip: [0.03, 0.92], knee: [0.11, 0.51], ankle: [0.1, 0.085], toe: [0.31, 0.03] },
    ],
  };
}

// ------------------------------------------------------------------ drawing
function capsule(c, A, ra, B, rb) {
  const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
  c.moveTo(A[0] + ra, -A[1]); c.arc(A[0], -A[1], Math.max(0, ra), 0, Math.PI * 2);
  c.moveTo(B[0] + rb, -B[1]); c.arc(B[0], -B[1], Math.max(0, rb), 0, Math.PI * 2);
  if (d <= Math.abs(ra - rb)) return;
  const ang = Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
  const off = Math.acos(L.clamp((ra - rb) / d, -1, 1));
  let q = [[A[0] + Math.cos(ang + off) * ra, -A[1] + Math.sin(ang + off) * ra], [B[0] + Math.cos(ang + off) * rb, -B[1] + Math.sin(ang + off) * rb],
    [B[0] + Math.cos(ang - off) * rb, -B[1] + Math.sin(ang - off) * rb], [A[0] + Math.cos(ang - off) * ra, -A[1] + Math.sin(ang - off) * ra]];
  if (area(q) < 0) q = q.reverse();   // same winding as the arcs, so the nonzero fill unions everything
  q.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}
function area(q) { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], r = q[(i + 1) % q.length]; a += p[0] * r[1] - r[0] * p[1]; } return a; }
function smooth(c, pts) {
  if (area(pts.map(([x, h]) => [x, -h])) < 0) pts = pts.slice().reverse();
  const n = pts.length;
  const m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2]; };
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], e = m(i); c.quadraticCurveTo(p[0], -p[1], e[0], e[1]); }
  c.closePath();
}
function figurePath(c, q, near) {
  c.beginPath();
  const lg = q.legs[near ? 1 : 0];
  capsule(c, lg.hip, 0.085, lg.knee, 0.062);
  capsule(c, lg.knee, 0.058, lg.ankle, 0.04);
  capsule(c, [lg.ankle[0] - 0.05, 0.05], 0.045, lg.toe, 0.03);
  if (near) {
    smooth(c, q.torso);
    capsule(c, q.neck, 0.052, [q.hc[0] - 0.02, q.hc[1] - 0.05], 0.05);
    smooth(c, q.head);
    capsule(c, q.shoulder, 0.058, q.elbow, 0.045);
    capsule(c, q.elbow, 0.043, q.wrist, 0.032);
    capsule(c, q.wrist, 0.035, q.hand, 0.03);
    capsule(c, q.hand, 0.022, q.finger, 0.011);
  } else {
    capsule(c, [q.shoulder[0] - 0.03, q.shoulder[1]], 0.055, q.fEl, 0.043);
    capsule(c, q.fEl, 0.041, q.fWr, 0.03);
    capsule(c, q.fWr, 0.032, q.fHa, 0.022);
  }
}

function drawPerson(c, v) {
  const mpp = v.cam.mpp;
  const q = pose(v.gt);
  const rim = 1.6 * mpp;
  // contact shadow
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(0.08, 0, 0.42, 0.035, 0, 0, Math.PI * 2); c.fill();
  // far limbs a shade lighter (atmosphere), then the near body; each with a sky rim on the lit edge
  for (const near of [false, true]) {
    c.save();
    c.translate(-rim, -rim * 0.7);
    figurePath(c, q, near);
    c.fillStyle = L.rgba(RIM, near ? 0.85 : 0.5);
    c.fill();
    c.restore();
    figurePath(c, q, near);
    c.fillStyle = L.rgba(near ? BODY : L.mix(BODY, [70, 90, 120], 0.3));
    c.fill();
  }
  // soft bounce light from the sky on the face once it turns up
  if (mpp < 0.02) {
    const look = L.ease.inOutCubic(L.prog(v.gt, TILT[0], TILT[1]));
    c.save();
    figurePath(c, q, true);
    c.clip();
    const fx = q.hc[0] + 0.08, fy = -(q.hc[1] + 0.06);
    const g = c.createRadialGradient(fx, fy, 0, fx, fy, 0.22);
    g.addColorStop(0, `rgba(170,200,240,${0.35 * look})`);
    g.addColorStop(1, 'rgba(170,200,240,0)');
    c.fillStyle = g;
    c.fillRect(fx - 0.25, fy - 0.25, 0.5, 0.5);
    c.restore();
  }
}

const GRASS = (() => {
  const r = L.rng(611);
  const far = Array.from({ length: 120 }, () => [(r() - 0.5) * 9, 0.03 + r() * 0.08, r() * 6.3, r(), r(), 1]);
  const near = Array.from({ length: 170 }, () => [(r() - 0.5) * 9, 0.04 + r() * 0.12, r() * 6.3, r(), r(), 0]);
  return far.concat(near);
})();
function drawGrass(c, v) {
  const mpp = v.cam.mpp;
  const k = L.clamp((0.03 - mpp) / 0.015);
  if (k <= 0) return;
  c.save();
  c.globalAlpha = k;
  c.lineCap = 'round';
  for (const [x, hgt, ph, tone, lean, far] of GRASS) {
    const sway = 0.02 * Math.sin(v.gt * 1.7 + ph + x * 0.8) + (lean - 0.5) * 0.05;
    const col = far ? L.mix([70, 98, 62], [150, 178, 120], 0.3 + tone * 0.5) : L.mix([20, 34, 26], [86, 116, 72], tone * 0.8);
    c.strokeStyle = L.rgba(col, far ? 0.55 : 1);
    c.lineWidth = Math.max(1.2 * mpp, far ? 0.004 + 0.003 * (1 - tone) : 0.006 + 0.006 * (1 - tone));
    c.beginPath();
    c.moveTo(x, 0.01);
    c.quadraticCurveTo(x + sway * 0.3, -hgt * 0.6, x + sway, -hgt);
    c.stroke();
  }
  c.restore();
}

// a sunlit grass band along the top of the ground, only in the close-up
function drawHorizon(c, v) {
  const mpp = v.cam.mpp;
  const k = L.clamp((0.03 - mpp) / 0.015);
  if (k <= 0) return;
  const half = (W / 2 + 40) * mpp;
  const g = c.createLinearGradient(0, 0, 0, 0.9);
  g.addColorStop(0, `rgba(118,150,96,${0.55 * k})`);
  g.addColorStop(0.25, `rgba(70,98,62,${0.3 * k})`);
  g.addColorStop(1, 'rgba(40,60,40,0)');
  c.fillStyle = g;
  c.fillRect(v.cam.x - PX - half, 0, 2 * half, 0.9);
  c.fillStyle = `rgba(200,230,170,${0.35 * k})`;
  c.fillRect(v.cam.x - PX - half, 0, 2 * half, Math.max(0.004, 1.2 * mpp));
}

// pollen / dust drifting through the light: foreground depth
const MOTES = (() => { const r = L.rng(612); return Array.from({ length: 16 }, () => [r() * 6 - 3, 0.2 + r() * 2.2, r() * 6.3, 0.5 + r()]); })();
function drawMotes(c, v) {
  const mpp = v.cam.mpp;
  const k = L.clamp((0.016 - mpp) / 0.006);
  if (k <= 0) return;
  for (const [x0, h0, ph, s] of MOTES) {
    const x = x0 + 0.25 * L.noise1(v.gt * 0.25 + ph, 7) + v.gt * 0.05 * s;
    const h = h0 + 0.18 * Math.sin(v.gt * 0.5 * s + ph) + v.gt * 0.03;
    const sx = v.wx(PX + x), sy = v.wy(-h);
    if (sx < -20 || sx > W + 20) continue;
    const tw = 0.5 + 0.5 * Math.sin(v.gt * 2.3 * s + ph * 3);
    L.lightBlob(c, sx, sy, 3 + 4 * s, [255, 246, 220], 0.22 * k * (0.4 + 0.6 * tw));
  }
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 3,
  cues(d) {
    return [
      { t: 0.12, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: 0.22, name: 'blip', gain: 0.24, pitch: 1.0 },
      { t: 0.48, name: 'blip', gain: 0.24, pitch: 1.12 },
      { t: 0.9, name: 'swish', gain: 0.3, pitch: 1.0 },
      { t: 0.58, name: 'tick', gain: 0.3, pitch: 1.25 },
      { t: d - 0.32, name: 'riser', gain: 0.28, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    const mpp = v.cam.mpp;
    const hp = 1.75 / mpp;
    if (hp < 1 || !v.visibleY(-2, 0.2, 40)) return;
    const sx = v.wx(PX);
    if (sx < -40 || sx > W + 40) return;
    ctx.save();
    ctx.translate(sx, v.wy(0));
    ctx.scale(1 / mpp, 1 / mpp);
    drawHorizon(ctx, v);
    drawGrass(ctx, v);
    if (hp < 6) {
      ctx.fillStyle = L.rgba(BODY);
      ctx.fillRect(-0.15, -1.75, 0.3, 1.75);
    } else {
      drawPerson(ctx, v);
    }
    ctx.restore();
    drawMotes(ctx, v);
  },

  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    const lines = [
      { parts: [['HOW FAR UP', false]], y: 520, size: 158, t0: 0.16 },
      { parts: [['IS ', false], ['SPACE?', true]], y: 712, size: 172, t0: 0.42 },
    ];
    // a thin accent rule draws in above the headline
    const rk = L.enter(t, 0.05, 0.6, L.ease.outExpo) * (1 - L.enter(t, d - 0.52, 0.26, L.ease.inCubic));
    if (rk > 0) {
      ctx.fillStyle = L.rgba(INK, 0.9);
      ctx.fillRect(W / 2 - 60 * rk, 352, 120 * rk, 5);
    }
    lines.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.65, L.ease.outExpo);
      const kout = L.enter(t, d - 0.52 + i * 0.05, 0.28, L.ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      ctx.save();
      ctx.font = L.font(ln.size, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const widths = ln.parts.map(([s]) => ctx.measureText(s).width);
      ctx.letterSpacing = '0px';
      const total = widths.reduce((a, b) => a + b, 0);
      let x = W / 2 - total / 2;
      const top = ln.y - ln.size * 0.8, bot = ln.y + ln.size * 0.1;
      const dy = (1 - kin) * ln.size * 1.05 - kout * ln.size * 1.1;
      const by = -kout * (ln.size * 0.9 + 80);   // on exit the accent bar rises out of its own window with the word
      ln.parts.forEach(([s, acc], j) => {
        const w = widths[j];
        ctx.save();
        if (acc) {
          // accent bar wipes in from the left; the word rises inside it
          const bk = L.enter(t, ln.t0 + 0.12, 0.55, L.ease.outExpo);
          const bx0 = x - 26, bw = w + 44;
          const bL = bx0, bR = bx0 + bw * bk;
          // fixed window = the bar's resting rect; the bar (and the word in it) rise out of it together
          ctx.beginPath(); ctx.rect(bx0 - 60, top - 18, bw + 120, bot - top + 36 + 40); ctx.clip();
          ctx.translate(0, by);
          if (bR > bL) {
            ctx.shadowColor = 'rgba(20,30,80,0.3)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
            ctx.fillStyle = L.rgba(v.accent);
            ctx.fillRect(bL, top - 18, bR - bL, bot - top + 36);
            ctx.shadowColor = 'transparent';
            // a soft light sweep across the bar once it lands
            const sw = L.prog(t, ln.t0 + 0.8, 0.9);
            if (sw > 0 && sw < 1) {
              const gx = L.lerp(bL - 120, bR + 120, L.ease.inOutCubic(sw));
              const g = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
              g.addColorStop(0, 'rgba(255,255,255,0)');
              g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
              g.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = g;
              ctx.fillRect(bL, top - 18, bR - bL, bot - top + 36);
            }
          }
          ctx.beginPath(); ctx.rect(Math.max(0, bL), top - 18, Math.max(0, bR - bL), bot - top + 36); ctx.clip();
          ctx.fillStyle = L.rgba([8, 14, 40]);
        } else {
          ctx.beginPath(); ctx.rect(0, top - 12, W, bot - top + 28); ctx.clip();
          ctx.fillStyle = L.rgba(INK);
        }
        ctx.textBaseline = 'alphabetic';
        L.trackedText(ctx, s, x, ln.y + (acc ? (1 - kin) * ln.size * 1.05 : dy), -1, 'left');
        ctx.restore();
        x += w;
      });
      ctx.restore();
    });
  },
};
