// Beat 1 — a single human hair, 70 µm wide, lying along y = 0.
// This file owns the HAIR world object for the whole film (the hook in s00 only animates its pose):
// a lit cylinder (warm cortex, specular band, cool rim light) wrapped in overlapping cuticle scales.
// The hair racks into focus during the hook, then goes soft and dark as the camera dives below it
// (beats 3–4), and is gone at molecular scale so the DNA / atom shots stay clean.
// A caliper bracket on the left measures it (drawn in world space so it rides with the camera).
import * as L from '../../../../engine/runtime/lib.js';

const { W, H } = L;
export const R = 35e-6;                       // hair radius (m)
export const BRACKET_X = -36e-6;              // world x of the 70 µm caliper
const SCALE_STEP = 7e-6;                     // cuticle scale spacing along the fibre
const ALBEDO = [92, 58, 38];
const SPEC = [255, 238, 220];
const SPEC2 = [230, 150, 90];      // secondary, coloured highlight (light through the cortex)
const RIM = [150, 225, 255];

// ------------------------------------------------------------------ pose (hook → settled)
/** Hair pose at global time: angle (rad), world y offset of its axis at x = 0, focus 0..1. */
export function hairPose(v) {
  // beat-relative (07b: the film starts after the preroll, so beat 0 no longer starts at gt = 0)
  const s0 = v.tl.scenes[0], g = v.gt - s0.start, end0 = s0.end - s0.start;
  const p = L.ease.inOutCubic(L.prog(g, -0.2, end0 + 0.55));
  const q = L.ease.inOutCubic(L.prog(g, 1.75, end0 + 0.55 - 1.75));
  return {
    ang: L.lerp(-0.34, 0, p),
    off: L.lerp(37e-6, 0, q),
    focus: L.ease.inOutCubic(L.prog(g, 0.15, 1.9)),
  };
}

/** 0 at hair scale, 1 once we are well below it (cell / bacterium close-ups). */
const deepK = (mpp) => L.clamp(L.invLerp(Math.log(5e-8), Math.log(1.3e-8), Math.log(mpp)));
/** overall visibility: fades out at nanometre scale so later shots are clean. */
const visK = (mpp) => 1 - L.clamp(L.invLerp(Math.log(4e-9), Math.log(6e-10), Math.log(mpp)));

// cylinder shading across the fibre, u = -1 (top edge) … 1 (bottom edge); precomputed once
const STOPS = (() => {
  const out = [];
  const ly = -0.55, lz = 0.835;
  const hy = ly, hz = lz + 1, hn = Math.hypot(hy, hz);
  for (let j = 0; j <= 28; j++) {
    const u = -1 + (2 * j) / 28;
    const nz = Math.sqrt(Math.max(0, 1 - u * u)), ny = u;
    const dif = Math.max(0, ny * ly + nz * lz);
    const sp = Math.pow(Math.max(0, (ny * hy + nz * hz) / hn), 60);
    // the secondary highlight sits lower on the fibre (shifted lobe), broad and warm
    const u2 = u - 0.42, sp2 = Math.exp(-u2 * u2 / 0.03);
    const rim = Math.pow(1 - nz, 2.2) * (u > 0 ? 1 : 0.3);
    const c = [0, 1, 2].map((i) => Math.min(255, ALBEDO[i] * (0.16 + 0.9 * dif) + SPEC[i] * sp * 0.42 + SPEC2[i] * sp2 * 0.22 + RIM[i] * rim * 0.5));
    out.push([j / 28, L.rgba(c)]);
  }
  return out;
})();

// deterministic per-scale jitter
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

/** local-x range of the screen in the hair frame (translate cx,cy, rotate ang). */
function localRange(cx, cy, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [sx, sy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const dx = sx - cx, dy = sy - cy;
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    x0 = Math.min(x0, lx); x1 = Math.max(x1, lx); y0 = Math.min(y0, ly); y1 = Math.max(y1, ly);
  }
  return { x0: x0 - 40, x1: x1 + 40, y0: y0 - 40, y1: y1 + 40 };
}

/** The hair, drawn every frame by s01.drawWorld. */
export function drawHair(ctx, v) {
  if (v.gt > v.tl.scenes[12].start + 0.2) return;   // on the final pull-out s12 draws the hair (attached to the head)
  const mpp = v.cam.mpp;
  const vis = visK(mpp);
  const Rp = R / mpp;
  if (vis <= 0 || Rp < 0.4) return;
  const pose = hairPose(v);
  const cx = v.wx(0), cy = v.wy(pose.off);
  const deep = deepK(mpp);
  const rg = localRange(cx, cy, pose.ang);
  if (rg.y1 < -Rp - 80 || rg.y0 > Rp + 80) return;          // hair entirely off screen

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(pose.ang);
  const thin = L.clamp((Rp - 0.4) / 4);                      // sub-pixel → hairline fade
  // the hair steps back (a touch darker, softer detail) once the cells arrive on it
  const back = 0.22 * L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[2].start + 0.1, 1.0));
  ctx.globalAlpha *= vis * thin * (1 - 0.6 * deep) * (1 - back * (1 - deep));
  const x0 = rg.x0, x1 = rg.x1;

  // far away: a plain warm line (keeps the pull-outs cheap and correct)
  if (Rp < 6) {
    ctx.fillStyle = L.rgba([150, 100, 70], 0.9);
    ctx.fillRect(x0, -Math.max(0.5, Rp), x1 - x0, Math.max(1, Rp * 2));
    ctx.restore();
    return;
  }

  const blur = (1 - pose.focus) * 11;
  if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;

  // separation halo: a soft dark shadow around the fibre, then the body
  const hw = Math.min(Rp * 0.5, 140);
  for (const sgn of [-1, 1]) {
    const g = ctx.createLinearGradient(0, sgn * Rp, 0, sgn * (Rp + hw));
    g.addColorStop(0, `rgba(0,0,0,${0.45 * (1 - deep)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, sgn > 0 ? Rp : -Rp - hw, x1 - x0, hw);
  }
  const yA = Math.max(-Rp, rg.y0), yB = Math.min(Rp, rg.y1);
  const body = ctx.createLinearGradient(0, -Rp, 0, Rp);
  for (const [p, c] of STOPS) body.addColorStop(p, c);
  ctx.fillStyle = body;
  ctx.fillRect(x0, yA, x1 - x0, yB - yA);

  // cortex: faint darker medulla core + fine longitudinal striations
  const det = pose.focus * (1 - 0.7 * deep) * (1 - back);
  if (Rp > 30 && det > 0.01) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, -Rp, x1 - x0, 2 * Rp); ctx.clip();
    const med = ctx.createLinearGradient(0, -Rp * 0.22, 0, Rp * 0.22);
    med.addColorStop(0, 'rgba(30,14,6,0)');
    med.addColorStop(0.5, `rgba(30,14,6,${0.22 * det})`);
    med.addColorStop(1, 'rgba(30,14,6,0)');
    ctx.fillStyle = med;
    ctx.fillRect(x0, -Rp * 0.22, x1 - x0, Rp * 0.44);
    if (Rp < 2600) {
      ctx.lineWidth = 1;
      for (let j = 0; j < 16; j++) {
        const u = -0.9 + (1.8 * j) / 15 + (hash(j, 4) - 0.5) * 0.08;
        ctx.strokeStyle = j % 2 ? `rgba(255,220,180,${0.05 * det})` : `rgba(20,8,2,${0.08 * det})`;
        ctx.beginPath();
        const steps = 10;
        for (let s = 0; s <= steps; s++) {
          const x = L.lerp(x0, x1, s / steps);
          const y = u * Rp + L.noise1(x * mpp / 30e-6 + j * 5.1, 7) * Rp * 0.02;
          s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }
    drawMottle(ctx, Rp, x0, x1, mpp, det);
    drawCuticle(ctx, v, Rp, x0, x1, mpp, det);
    ctx.restore();
  }

  // rim light on the lower edge (cool) and a faint warm kiss on the top edge
  ctx.globalCompositeOperation = 'lighter';
  const rw = Math.min(Rp * 0.12, 40);
  let g = ctx.createLinearGradient(0, Rp - rw, 0, Rp + rw * 0.8);
  g.addColorStop(0, 'rgba(150,225,255,0)');
  g.addColorStop(0.55, `rgba(150,225,255,${0.32 * (1 - deep)})`);
  g.addColorStop(1, 'rgba(150,225,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, Rp - rw, x1 - x0, rw * 1.8);
  g = ctx.createLinearGradient(0, -Rp - rw * 0.5, 0, -Rp + rw);
  g.addColorStop(0, 'rgba(255,200,150,0)');
  g.addColorStop(0.4, `rgba(255,200,150,${0.12 * (1 - deep)})`);
  g.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, -Rp - rw * 0.5, x1 - x0, rw * 1.5);

  // light sweeps travelling along the fibre: one as it racks into focus, a gentler one in beat 1
  for (const [st, dur, amp] of [[v.tl.scenes[0].start + 1.25, 1.5, 0.16], [v.tl.scenes[1].start + 0.35, 2.2, 0.09]]) {
    const sw = L.prog(v.gt, st, dur);
    if (sw <= 0 || sw >= 1) continue;
    const sx = L.lerp(x0 - 300, x1 + 300, L.ease.inOutCubic(sw));
    const gs = ctx.createLinearGradient(sx - 260, 0, sx + 260, 0);
    gs.addColorStop(0, 'rgba(255,235,210,0)');
    gs.addColorStop(0.5, `rgba(255,235,210,${amp * Math.sin(Math.PI * sw)})`);
    gs.addColorStop(1, 'rgba(255,235,210,0)');
    ctx.fillStyle = gs;
    ctx.fillRect(sx - 260, -Rp, 520, 2 * Rp);
  }
  ctx.restore();
}

/** Overlapping cuticle scales, like roof shingles: one continuous, irregular free edge per scale across the fibre
 *  (no segment joints), each a lighter lip with a soft shadow smeared downstream (+x) onto the scale beneath. */
function drawCuticle(ctx, v, Rp, x0, x1, mpp, det) {
  const S = SCALE_STEP / mpp;
  if (S < 10) return;
  const i0 = Math.floor(x0 / S) - 2, i1 = Math.ceil(x1 / S) + 1;
  if (i1 - i0 > 80) return;
  const N = 44;
  const prof = (a, col) => {
    const g = ctx.createLinearGradient(0, -Rp, 0, Rp);
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.12, `rgba(${col},${a * 0.7})`);
    g.addColorStop(0.38, `rgba(${col},${a})`);
    g.addColorStop(0.8, `rgba(${col},${a * 0.6})`);
    g.addColorStop(1, `rgba(${col},0)`);
    return g;
  };
  const edges = [];
  for (let i = i0; i <= i1; i++) {
    const xe = (i + (hash(i, 1) - 0.5) * 0.4) * S;
    const bow = (0.2 + 0.14 * hash(i, 15)) * S, tilt = (hash(i, 16) - 0.5) * 0.25 * S;
    const pts = [];
    for (let j = 0; j <= N; j++) {
      const u = -1 + (2 * j) / N;
      // gently bowed toward the tip, with a slow irregular wave and a finer ragged one (smooth: no kinks)
      const x = xe + bow * (1 - u * u) + tilt * u + S * (0.24 * L.noise1(u * 1.8 + i * 1.73, 9) + 0.05 * L.noise1(u * 6.5 + i * 5.1, 11));
      pts.push([x, u * Rp * 0.998]);
    }
    edges.push(pts);
  }
  const path = (pts, dx) => {
    ctx.beginPath();
    pts.forEach(([x, y], j) => (j ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y)));
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  // the plate brightens toward its free edge (upstream, -x): a soft lit wash following the edge's own curve
  ctx.globalCompositeOperation = 'lighter';
  for (let s = 1; s <= 8; s++) {
    ctx.strokeStyle = prof(0.05 * det * Math.pow(1 - s / 9, 1.3), '255,210,165');
    ctx.lineWidth = S * 0.075;
    for (const pts of edges) { path(pts, -S * 0.06 * (s - 0.5)); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'source-over';
  // soft shadow the lip casts on the scale beneath (downstream, +x), smeared in steps that fade out
  for (let s = 1; s <= 12; s++) {
    ctx.strokeStyle = prof(0.26 * det * Math.pow(1 - s / 13, 1.5), '24,10,3');
    ctx.lineWidth = S * 0.045;
    for (const pts of edges) { path(pts, S * 0.026 * s); ctx.stroke(); }
  }
  // the free edge itself: a thin dark seam, then the lighter lip on top
  ctx.strokeStyle = prof(0.45 * det, '20,8,2');
  ctx.lineWidth = Math.max(1, S * 0.014);
  for (const pts of edges) { path(pts, S * 0.02); ctx.stroke(); }
  ctx.strokeStyle = prof(0.75 * det, '255,232,202');
  ctx.lineWidth = Math.max(1.5, S * 0.03);
  for (const pts of edges) { path(pts, 0); ctx.stroke(); }
  ctx.restore();
}

/** Slow mottling along the fibre so it reads as organic, not machined. */
function drawMottle(ctx, Rp, x0, x1, mpp, det) {
  const S = 22e-6 / mpp;
  if (S < 20) return;
  const i0 = Math.floor(x0 / S) - 1, i1 = Math.ceil(x1 / S) + 1;
  if (i1 - i0 > 40) return;
  for (let i = i0; i <= i1; i++) {
    const x = (i + hash(i, 6)) * S, y = (hash(i, 7) - 0.5) * 1.2 * Rp, r = (0.5 + hash(i, 8)) * S * 0.9;
    const dark = hash(i, 9) > 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, dark ? `rgba(25,10,4,${0.22 * det})` : `rgba(255,200,150,${0.07 * det})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

// ------------------------------------------------------------------ caliper (shared with s02)
/**
 * Vertical caliper in screen px: line from y1 to y2 drawing out from the middle, end caps,
 * short extension dashes along the measured edges. ticks: [{y, k}] subdivisions.
 */
export function caliper(ctx, x, y1, y2, k, color, { ticks = [], ext = 70, alpha = 1 } = {}) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const mid = (y1 + y2) / 2;
  const a = L.lerp(mid, y1, e), b = L.lerp(mid, y2, e);
  ctx.save();
  ctx.globalAlpha *= alpha;
  const cap = 20 * L.ease.outCubic(L.prog(k, 0.55, 0.45));
  const stroke = () => {
    ctx.beginPath();
    ctx.moveTo(x, a); ctx.lineTo(x, b);
    if (cap > 0) {
      ctx.moveTo(x - cap, y1); ctx.lineTo(x + cap, y1);
      ctx.moveTo(x - cap, y2); ctx.lineTo(x + cap, y2);
    }
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(2,8,10,0.55)';     // dark under-stroke: readable over the bright fibre
  ctx.lineWidth = 9;
  stroke();
  ctx.shadowColor = L.rgba(color, 0.6);
  ctx.shadowBlur = 12;
  ctx.strokeStyle = L.rgba(color, 0.98);
  ctx.lineWidth = 4;
  stroke();
  ctx.shadowBlur = 0;
  // extension dashes along the measured edges
  const ek = L.ease.outCubic(L.prog(k, 0.6, 0.4));
  if (ek > 0 && ext > 0) {
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = L.rgba(color, 0.55);
    ctx.beginPath();
    ctx.moveTo(x + 22, y1); ctx.lineTo(x + 22 + ext * ek, y1);
    ctx.moveTo(x + 22, y2); ctx.lineTo(x + 22 + ext * ek, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const tk of ticks) {
    if (tk.k <= 0) continue;
    const w = 10 * L.ease.outBack(L.clamp(tk.k));
    ctx.lineWidth = 2;
    ctx.strokeStyle = L.rgba(color, 0.8 * L.clamp(tk.k * 2));
    ctx.beginPath(); ctx.moveTo(x - w, tk.y); ctx.lineTo(x + w, tk.y); ctx.stroke();
  }
  ctx.restore();
}

/** caliper visibility: draws in during beat 1, persists (subdivided by s02) through beat 2. */
export function hairCaliperK(v) {
  const s1 = v.tl.scenes[1], s2 = v.tl.scenes[2];
  const kin = L.prog(v.gt, s1.start + 1.55, 0.7);
  const kout = L.ease.inCubic(L.prog(v.gt, s2.end - 0.45, 0.35));
  return kin * (1 - kout);
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'A human hair', sub: 'Where the zoom begins' },
  chapterUntil() { return 1.5; },   // card gone (1.9 s) before the size label lands (2.15 s)
  captions: true,
  layer: -4,
  cues(d) {
    return [
      { t: 1.55, name: 'tick', gain: 0.3, pitch: 1.1 },
      { t: 1.85, name: 'tick', gain: 0.22, pitch: 1.35 },
      { t: 2.2, name: 'blip', gain: 0.28, pitch: 1.0 },
      { t: 2.25, name: 'shimmer', gain: 0.12, pitch: 1.3 },
    ];
  },
  drawWorld(ctx, v) {
    drawHair(ctx, v);
    // the 70 µm caliper rides with the hair (beats 1–2); s02 adds the ten subdivisions
    const k = hairCaliperK(v);
    if (k > 0 && v.ws(2 * R) > 200) {
      const dim = L.lerp(1, 0.6, L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[2].start + 0.1, 0.6)));
      caliper(ctx, v.wx(BRACKET_X), v.wy(-R), v.wy(R), k, v.accent, { alpha: dim, ext: 0 });
    }
  },
  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    const k = Math.min(v.k, L.prog(t, 2.15, 0.55)) * (1 - L.ease.inCubic(L.prog(t, d - 0.34, 0.3)));
    L.bigLabel(ctx, { x: 120, y: 380, big: '≈ 70 µm', small: 'a human hair', k, accent: v.accent, size: 108 });
  },
};
