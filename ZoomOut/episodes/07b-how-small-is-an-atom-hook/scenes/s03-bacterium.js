// Beat 3 — the camera dives from the hair to cell #5; beside it lies a rod bacterium (1 µm × 2 µm)
// at P.bact, already faintly there in beat 2. It is drawn as a translucent capsule: double membrane,
// a tangled nucleoid and ribosome specks inside, fine pili and a beating flagellum outside.
// During the hold it brightens, a measure line spans its 1 µm width, and seven 1 µm segments tick
// across the neighbouring cell ("seven times wider").
import * as L from '../../../../engine/runtime/lib.js';
import { P } from '../camera.js';
import { focusRing } from './s04-virus.js';
import { cellScreen } from './s02-blood-cells.js';

const { W, H } = L;
const RR = 0.5e-6;            // body radius (1 µm wide)
const HL = 0.5e-6;            // half length of the straight part (2 µm long overall)
export const BACT_ANG = -0.2; // axis points at the virus
const COL0 = [176, 222, 120];
const MEM0 = [226, 246, 190];
const CELL_R = 3.5e-6;
const SEG_T0 = 1.9, SEG_STAG = 0.12; // the 7 x 1 µm ruler lands with the measure line, before 'seven times'
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// pili roots: perimeter parameter + length; none on the front cap (it faces the virus)
const PILI = Array.from({ length: 96 }, (_, i) => ({ p: (i + hash(i, 1) * 0.8) / 96, len: 0.06e-6 + hash(i, 2) * 0.12e-6, bend: hash(i, 3) - 0.5, ph: hash(i, 4) * 9 }));
const RIBO = Array.from({ length: 220 }, (_, i) => {
  // ribosomes crowd the cytoplasm, sparser in the nucleoid region
  let x = (hash(i, 5) * 2 - 1) * (HL + RR * 0.62), y = (hash(i, 6) * 2 - 1) * RR * 0.8;
  if (Math.abs(x) < HL * 0.8 && Math.abs(y) < RR * 0.35 && hash(i, 8) > 0.3) y = Math.sign(y || 1) * (RR * 0.4 + hash(i, 9) * RR * 0.4);
  return { x, y, r: 0.6 + hash(i, 7) * 0.8 };
});

/** point + outward normal on the capsule perimeter, p in [0,1) (local metres) */
function perim(p) {
  const capLen = Math.PI * RR, side = 2 * HL, tot = 2 * capLen + 2 * side;
  let d = ((p % 1) + 1) % 1 * tot;
  if (d < side) return { x: -HL + d, y: -RR, nx: 0, ny: -1, front: false };                // top side →
  d -= side;
  if (d < capLen) { const a = -Math.PI / 2 + d / RR; return { x: HL + Math.cos(a) * RR, y: Math.sin(a) * RR, nx: Math.cos(a), ny: Math.sin(a), front: Math.abs(a) < 0.75 }; }
  d -= capLen;
  if (d < side) return { x: HL - d, y: RR, nx: 0, ny: 1, front: false };                    // bottom side ←
  d -= side;
  const a = Math.PI / 2 + d / RR;
  return { x: -HL + Math.cos(a) * RR, y: Math.sin(a) * RR, nx: Math.cos(a), ny: Math.sin(a), front: false };
}

function capsule(ctx, s, inset = 0) {
  const r = Math.max(0, (RR - inset) * s), h = HL * s;
  ctx.beginPath();
  ctx.arc(h, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.arc(-h, 0, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
}

/** visibility: faint from late beat 2, full during beat 3, steps back for the virus in beat 4 */
export function bactVis(v) {
  const sc = v.tl.scenes;
  const a = 0.6 * L.ease.inOutCubic(L.prog(v.gt, sc[2].start + 2.6, 1.0));
  const b = 0.4 * L.ease.inOutCubic(L.prog(v.gt, sc[3].start + 1.25, 0.7));
  // beat 4: a strong step back (dimmer, greyer, membrane + streak muted) so the tiny virus leads;
  // it recovers once the camera has dived on to the DNA (it is off-screen by then)
  const cIn = L.ease.inOutCubic(L.prog(v.gt, sc[4].start + 0.6, 0.8));
  const dim = cIn * (1 - L.ease.inOutCubic(L.prog(v.gt, sc[6].start, 1.0)));
  const d = 0.35 * L.ease.inOutCubic(L.prog(v.gt, sc[7].start + 1.2, 0.8)) * (1 - L.ease.inOutCubic(L.prog(v.gt, sc[7].end - 0.2, 0.6)));
  return { a: a + b - 0.3 * cIn - 0.25 * dim - d, lit: b / 0.4 - cIn * 0.5, dim };
}

export function bactPose(v) {
  return {
    x: P.bact.x + L.noise1(v.gt * 0.25, 21) * 0.012e-6,
    y: P.bact.y + L.noise1(v.gt * 0.22, 22) * 0.012e-6,
    ang: BACT_ANG + L.noise1(v.gt * 0.2, 23) * 0.025,
  };
}

function drawBacterium(ctx, v, alpha, lit, dim = 0) {
  const COL = L.mix(COL0, [150, 158, 150], 0.55 * dim), MEM = L.mix(MEM0, [170, 178, 170], 0.5 * dim);
  const memA = 1 - 0.6 * dim;
  const s = 1 / v.cam.mpp;
  const lenPx = (2 * HL + 2 * RR) * s;
  if (lenPx < 1.2) return;
  const pose = bactPose(v);
  const cx = v.wx(pose.x), cy = v.wy(pose.y);
  const reach = lenPx * 0.5 + 0.4e-6 * s + 1.6e-6 * s;
  if (cx + reach < 0 || cx - reach > W || cy + reach < 0 || cy - reach > H) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.rotate(pose.ang);
  if (lenPx < 10) {
    ctx.fillStyle = L.rgba(COL, 0.85);
    capsule(ctx, s); ctx.fill();
    ctx.restore();
    return;
  }
  const r = RR * s, h = HL * s;
  const t = v.gt;
  // soft contact shadow + glycocalyx halo
  ctx.save();
  ctx.translate(0.1 * r, 0.22 * r);
  ctx.scale(2, 1);
  let g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.35);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
  ctx.restore();
  ctx.save();
  ctx.scale(2, 1);
  L.lightBlob(ctx, 0, 0, r * 1.6, COL, (0.1 + 0.12 * lit) * (1 - 0.7 * dim));
  ctx.restore();

  // flagellum: a helical whip from the back cap, wave travelling outward
  if (r > 12) {
    ctx.strokeStyle = L.rgba(MEM, 0.5 * memA);
    ctx.lineWidth = Math.max(1, 0.022e-6 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const n = 60, len = 1.5e-6 * s;
    for (let j = 0; j <= n; j++) {
      const f = j / n;
      const x = -h - r * 0.96 - f * len;
      const y = Math.sin(f * 11 - t * 7) * (0.02 + 0.07 * f) * 1e-6 * s + f * f * 0.35e-6 * s;
      j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // pili
  if (r > 18) {
    ctx.strokeStyle = L.rgba(MEM, 0.34 * memA);
    ctx.lineWidth = Math.max(0.7, 0.0055e-6 * s);
    ctx.beginPath();
    for (const pl of PILI) {
      const q = perim(pl.p);
      if (q.front) continue;
      const x0 = q.x * s, y0 = q.y * s, L1 = pl.len * s;
      const w = L.noise1(t * 0.6 + pl.ph, 31) * 0.5 + pl.bend;
      const tx = -q.ny, ty = q.nx;
      const ex = x0 + (q.nx + tx * w * 0.6) * L1, ey = y0 + (q.ny + ty * w * 0.6) * L1;
      const mx = x0 + (q.nx + tx * w * 0.15) * L1 * 0.55, my = y0 + (q.ny + ty * w * 0.15) * L1 * 0.55;
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(mx, my, ex, ey);
    }
    ctx.stroke();
  }
  // translucent body: denser at the walls (seen edge-on), clearer in the middle
  capsule(ctx, s);
  g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, L.rgba(COL, 0.62));
  g.addColorStop(0.18, L.rgba(COL, 0.3));
  g.addColorStop(0.5, L.rgba(COL, 0.17));
  g.addColorStop(0.82, L.rgba(COL, 0.3));
  g.addColorStop(1, L.rgba(COL, 0.66));
  ctx.fillStyle = g;
  ctx.fill();
  if (r > 20) {
    ctx.save();
    capsule(ctx, s, 0.04e-6);
    ctx.clip();
    // cytoplasm: a soft inner glow
    let cg = ctx.createRadialGradient(0, 0, 0, 0, 0, h + r);
    cg.addColorStop(0, L.rgba([200, 235, 150], 0.12));
    cg.addColorStop(1, L.rgba([200, 235, 150], 0));
    ctx.fillStyle = cg;
    ctx.fillRect(-h - r, -r, 2 * (h + r), 2 * r);
    // nucleoid: fine coiled DNA strands in a loose cloud in the middle
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.8, 0.0065e-6 * s);
    const n = r > 120 ? 260 : 90;
    for (let pass = 0; pass < 3; pass++) {
      ctx.strokeStyle = L.rgba([235, 250, 205], 0.2 * memA);
      ctx.beginPath();
      for (let j = 0; j <= n; j++) {
        const f = j / n, a = f * Math.PI * 2 + pass * 2.1;
        const coil = 0.03 * Math.sin(f * 46 + pass);
        const x = (Math.cos(a) * 0.55 + L.noise1(f * 9 + pass * 4 + t * 0.12, 41) * 0.3 + coil) * h * 1.15;
        const y = (Math.sin(a * 2 + pass) * 0.22 + L.noise1(f * 11 + pass * 7 + t * 0.1, 42) * 0.18 + coil * 2) * r;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    // ribosomes
    ctx.fillStyle = L.rgba([240, 250, 220], 0.26 * memA);
    const rs = Math.max(0.7, 0.0085e-6 * s);
    ctx.beginPath();
    for (const rb of RIBO) {
      const x = rb.x * s + L.noise1(t * 0.5 + rb.r * 9, 43) * 0.01e-6 * s, y = rb.y * s;
      ctx.moveTo(x + rs * rb.r, y);
      ctx.arc(x, y, Math.max(0, rs * rb.r), 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
  // double membrane
  ctx.strokeStyle = L.rgba(MEM, 0.9 * memA);
  ctx.lineWidth = Math.max(1.2, 0.028e-6 * s);
  capsule(ctx, s); ctx.stroke();
  if (r > 20) {
    ctx.strokeStyle = L.rgba(MEM, 0.3 * memA);
    ctx.lineWidth = Math.max(1, 0.012e-6 * s);
    capsule(ctx, s, 0.045e-6); ctx.stroke();
  }
  // specular streak along the upper wall, cool rim along the lower one
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  g = ctx.createLinearGradient(-h - r * 0.5, 0, h + r * 0.5, 0);
  g.addColorStop(0, 'rgba(255,255,240,0)');
  g.addColorStop(0.35, `rgba(255,255,240,${(0.22 + 0.2 * lit) * (1 - 0.8 * dim)})`);
  g.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.5, 0.07e-6 * s);
  ctx.beginPath(); ctx.moveTo(-h - r * 0.2, -r * 0.66); ctx.lineTo(h + r * 0.1, -r * 0.66); ctx.stroke();
  ctx.strokeStyle = `rgba(150,215,255,${(0.25 + 0.2 * lit) * (1 - 0.6 * dim)})`;
  ctx.lineWidth = Math.max(1, 0.02e-6 * s);
  ctx.beginPath(); ctx.arc(h, 0, Math.max(0, r * 0.98), 0.2, Math.PI / 2); ctx.lineTo(-h, r * 0.98); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** measure-line ends across the body (screen px) */
function widthEnds(v) {
  const p = bactPose(v);
  const nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
  return [[v.wx(p.x - nx * RR), v.wy(p.y - ny * RR)], [v.wx(p.x + nx * RR), v.wy(p.y + ny * RR)], { ax: Math.cos(p.ang), ay: Math.sin(p.ang) }];
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'A bacterium', sub: 'One cell, all on its own' },
  chapterUntil() { return 1.85; },
  captions: true,
  layer: -2,
  cues(d) {
    const out = [
      { t: 0.05, name: 'dive', gain: 0.32, pitch: 1.0 },
      { t: 1.3, name: 'shimmer', gain: 0.22, pitch: 1.05 },
      { t: 1.95, name: 'tick', gain: 0.3, pitch: 1.2 },
      { t: 2.15, name: 'blip', gain: 0.28, pitch: 1.0 },
    ];
    for (let j = 0; j < 7; j++) out.push({ t: SEG_T0 + 0.22 + j * SEG_STAG, name: 'tick', gain: 0.14 + j * 0.01, pitch: 1.1 + j * 0.06 });
    return out;
  },
  drawWorld(ctx, v) {
    const vis = bactVis(v);
    if (vis.a <= 0.002) return;
    drawBacterium(ctx, v, vis.a, L.clamp(vis.lit), vis.dim);
  },
  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    const kout = 1 - L.ease.inCubic(L.prog(t, d - 0.36, 0.3));
    focusRing(ctx, v.wx(P.bact.x), v.wy(P.bact.y), v.ws(HL + RR), L.prog(t, 1.25, 1.1), v.accent);
    // 1 µm measure line across the body
    const mk = Math.min(v.k, L.prog(t, 1.9, 0.55)) * kout;
    if (mk > 0) {
      const [a, b, ax] = widthEnds(v);
      measure(ctx, a, b, ax, mk, v.accent);
    }
    // seven 1 µm segments across the neighbouring cell
    // the ruler spans the cell's drawn disc exactly, rim to rim (it rides the cell's idle drift)
    const cs = cellScreen(v, 5) ?? { x: v.wx(P.cell.x), y: v.wy(P.cell.y), r: v.ws(CELL_R) };
    const y = cs.y, seg = (2 * cs.r) / 7;
    if (kout > 0 && seg > 20) {
      ctx.save();
      ctx.lineCap = 'butt';   // the outer ends stop exactly on the rim
      for (let j = 0; j < 7; j++) {
        const sk = L.ease.outCubic(L.prog(t, SEG_T0 + j * SEG_STAG, 0.3)) * Math.min(v.k, kout);
        if (sk <= 0) continue;
        const x0 = cs.x - cs.r + j * seg + (j ? 3 : 0), x1 = x0 + (seg - (j ? 3 : 0) - (j < 6 ? 3 : 0)) * sk;
        ctx.strokeStyle = 'rgba(2,8,10,0.55)'; ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.strokeStyle = L.rgba(v.accent, j % 2 ? 0.75 : 0.98); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      }
      ctx.restore();
    }
    const k = Math.min(v.k, L.prog(t, 2.1, 0.55)) * kout;
    L.bigLabel(ctx, { x: 1000, y: 600, big: '≈ 1 µm', small: '7× smaller than the cell', k, accent: v.accent, align: 'right', size: 108 });
  },
};

/** measure line between two screen points, drawing out from the middle, caps along `ax` */
export function measure(ctx, a, b, ax, k, color) {
  const e = L.ease.outCubic(L.clamp(k));
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const p = [L.lerp(mx, a[0], e), L.lerp(my, a[1], e)], q = [L.lerp(mx, b[0], e), L.lerp(my, b[1], e)];
  const cap = 13 * L.ease.outCubic(L.prog(k, 0.5, 0.5));
  const stroke = () => {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    if (cap > 0) for (const c of [a, b]) { ctx.moveTo(c[0] - ax.ax * cap, c[1] - ax.ay * cap); ctx.lineTo(c[0] + ax.ax * cap, c[1] + ax.ay * cap); }
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(2,8,10,0.55)'; ctx.lineWidth = 8; stroke();
  ctx.shadowColor = L.rgba(color, 0.6); ctx.shadowBlur = 10;
  ctx.strokeStyle = L.rgba(color, 0.98); ctx.lineWidth = 3.5; stroke();
  ctx.restore();
}
