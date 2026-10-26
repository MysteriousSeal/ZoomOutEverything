// Beat 2 — ten red blood cells (7 µm biconcave discs) glide in and settle ACROSS the hair, one after
// another, each landing ticking a subdivision onto the 70 µm caliper. Cell #5 (P.cell) — the one the
// camera dives into next — warms up at the end of the beat. The cells stay in the world for the rest
// of the film (seen again on the pull-outs), drawn with a cheap LOD when small.
import * as L from '../../../../engine/runtime/lib.js';
import { P } from '../camera.js';
import { BRACKET_X, R as HAIR_R, hairCaliperK } from './s01-hair.js';

const D = 7e-6, CR = D / 2;
export const N_CELLS = 10;
const STAGGER = 0.12, FLY = 0.85, T0 = 0.22;
export const cellY = (i) => (i - 4.5) * D;
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

/** landing time of cell i (global seconds) */
export const landAt = (tl, i) => tl.scenes[2].start + T0 + i * STAGGER + FLY;

/** state of cell i at global time: position, squash (tumbling disc), tilt axis, alpha */
function cellState(v, i) {
  const s0 = v.tl.scenes[2].start + T0 + i * STAGGER;
  const p = L.prog(v.gt, s0, FLY);
  const y = cellY(i);
  if (p <= 0) return null;
  // glide in from the lower right along a gentle arc, overshoot a touch, settle
  const e = L.ease.outBack(p, 1.15), ec = L.ease.outCubic(p);
  const sx = 34e-6 + hash(i, 1) * 10e-6, sy = y + 12e-6 + hash(i, 2) * 8e-6;
  const arc = Math.sin(Math.PI * ec) * -4e-6;
  const idle = L.clamp((v.gt - s0 - FLY) / 1.2);
  const fx = L.noise1(v.gt * 0.35 + i * 7.1, 3) * 0.12e-6 * idle;
  const fy = L.noise1(v.gt * 0.3 + i * 3.3, 4) * 0.1e-6 * idle;
  return {
    x: L.lerp(sx, 0, e) + fx,
    y: L.lerp(sy, y, ec) + arc + fy,
    sq: L.lerp(0.22, 1, L.ease.outCubic(L.prog(p, 0.05, 0.9))),
    tilt: L.lerp(0.9 + hash(i, 3) * 0.6, 0, ec),
    a: L.clamp(p * 4),
    blur: 1 - ec,
  };
}

// ------------------------------------------------------------------ one biconcave disc (screen px)
/** Screen centre + drawn radius of landed cell i (for rulers that must end exactly at its rim). */
export function cellScreen(v, i) {
  const st = cellState(v, i);
  return st && { x: v.wx(st.x), y: v.wy(st.y), r: v.ws(CR) * 0.985 };
}

export function drawCell(ctx, x, y, r, { sq = 1, tilt = 0, alpha = 1, warm = 0, shade = 0 } = {}) {
  if (r < 0.5 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (r < 7) {
    ctx.fillStyle = 'rgb(160,28,38)';
    ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  // contact shadow on the hair beneath
  const sh = ctx.createRadialGradient(r * 0.1, r * 0.16, r * 0.6, r * 0.1, r * 0.16, r * 1.3);
  sh.addColorStop(0, 'rgba(0,0,0,0.5)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.8, r * 2.8);

  ctx.rotate(tilt);
  ctx.scale(1, sq);
  ctx.rotate(-tilt);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  // radial profile: dimpled centre, bright thick torus, edge rolling away
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, L.rgba(L.mix([136, 24, 32], [160, 40, 42], warm)));
  g.addColorStop(0.28, L.rgba(L.mix([140, 24, 32], [166, 42, 44], warm)));
  g.addColorStop(0.52, L.rgba(L.mix([166, 30, 38], [196, 50, 50], warm)));
  g.addColorStop(0.7, L.rgba(L.mix([184, 40, 44], [214, 62, 58], warm)));
  g.addColorStop(0.85, 'rgb(150,26,34)');
  g.addColorStop(0.95, 'rgb(98,12,22)');
  g.addColorStop(1, 'rgb(66,6,14)');
  ctx.fillStyle = g;
  ctx.fill();
  if (r >= 14) {
    ctx.save();
    ctx.clip();
    // small cells need a much stronger dimple to read as discs, not beads
    const ks = L.lerp(2.1, 1, L.clamp((r - 40) / 60));
    // key light from the upper left: lit torus crest there, shaded dimple on the same side
    ctx.globalCompositeOperation = 'lighter';
    let lg = ctx.createLinearGradient(-r, -r, r, r);
    lg.addColorStop(0, `rgba(255,150,140,${0.3 / Math.sqrt(ks)})`);
    lg.addColorStop(0.45, 'rgba(255,150,140,0.04)');
    lg.addColorStop(1, 'rgba(255,150,140,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.globalCompositeOperation = 'source-over';
    const ir = r * 0.5;
    // central pallor: a darker, thinner inner disc (~0.45 r) with a soft edge
    let pg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.56);
    pg.addColorStop(0, `rgba(48,0,10,${0.2 * ks})`);
    pg.addColorStop(0.7, `rgba(48,0,10,${0.16 * ks})`);
    pg.addColorStop(1, 'rgba(48,0,10,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.56, 0, Math.PI * 2); ctx.fill();
    // the dish slope: shaded on the lit (upper-left) side, a lit inner lip lower right
    lg = ctx.createLinearGradient(-ir, -ir, ir, ir);
    lg.addColorStop(0, `rgba(40,0,8,${0.26 * ks})`);
    lg.addColorStop(0.5, 'rgba(40,0,8,0.0)');
    lg.addColorStop(1, `rgba(255,140,130,${0.14 * ks})`);
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(0, 0, ir * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const lip = ctx.createLinearGradient(-ir, -ir, ir, ir);
    lip.addColorStop(0.55, 'rgba(255,150,140,0)');
    lip.addColorStop(1, `rgba(255,150,140,${0.16 * ks})`);
    ctx.strokeStyle = lip;
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath(); ctx.arc(0, 0, ir * 0.98, 0, Math.PI * 2); ctx.stroke();
    // glint on the crest
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.translate(-r * 0.5, -r * 0.47);
    ctx.rotate(-Math.PI / 4);
    ctx.scale(1, ks > 1.3 ? 0.3 : 0.42);
    const glr = r * 0.32 / Math.sqrt(ks);
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, glr);
    gl.addColorStop(0, `rgba(255,225,215,${0.42 / Math.sqrt(ks)})`);
    gl.addColorStop(1, 'rgba(255,225,215,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(-glr, -glr, glr * 2, glr * 2);
    ctx.restore();
    // cool rim on the far (lower right) edge, ties to the hair's rim light
    const rg = ctx.createLinearGradient(-r, -r, r, r);
    rg.addColorStop(0.55, 'rgba(150,215,255,0)');
    rg.addColorStop(1, 'rgba(150,215,255,0.5)');
    ctx.strokeStyle = rg;
    ctx.lineWidth = Math.max(1.2, r * 0.035);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.975, 0, Math.PI * 2); ctx.stroke();
    // faint membrane mottling on big close-ups
    if (r > 120) {
      ctx.globalCompositeOperation = 'source-over';
      for (let j = 0; j < 14; j++) {
        const a = hash(j, 11) * Math.PI * 2, rr = r * (0.2 + 0.7 * hash(j, 12)), br = r * (0.12 + 0.18 * hash(j, 13));
        const mx = Math.cos(a) * rr, my = Math.sin(a) * rr;
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, br);
        mg.addColorStop(0, j % 2 ? 'rgba(60,0,10,0.12)' : 'rgba(255,140,130,0.06)');
        mg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mg;
        ctx.fillRect(mx - br, my - br, br * 2, br * 2);
      }
    }
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(40,0,8,0.35)';
  ctx.lineWidth = Math.max(1, r * 0.01);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  if (shade > 0) {   // step back into shadow (another subject has the focus)
    ctx.fillStyle = `rgba(10,6,10,${shade})`;
    ctx.fill();
  }
  ctx.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Red blood cells', sub: 'Side by side' },
  chapterUntil() { return 1.5; },   // card gone (1.9 s) before the size label lands (2.15 s)
  captions: true,
  layer: -3,
  cues(d) {
    const out = [];
    for (let i = 0; i < N_CELLS; i++) out.push({ t: T0 + i * STAGGER + FLY * 0.62, name: 'tick', gain: 0.16 + i * 0.008, pitch: 1.0 + i * 0.055 });
    out.push({ t: T0 + 0.05, name: 'swish', gain: 0.22, pitch: 1.15 });
    out.push({ t: 2.0, name: 'blip', gain: 0.28, pitch: 1.05 });
    out.push({ t: 2.05, name: 'tick', gain: 0.22, pitch: 1.5 });
    out.push({ t: d - 0.7, name: 'bloom', gain: 0.18, pitch: 1.0 });
    return out;
  },

  drawWorld(ctx, v) {
    const r = v.ws(CR);
    if (r < 0.5 || v.gt < v.tl.scenes[2].start) return;
    if (!v.visibleY(-40e-6, 40e-6)) return;
    // on the half-million pull-out (beat 7) the cells step back so the atom line leads
    const s7 = v.tl.scenes[7];
    const dim = 1 - 0.5 * L.ease.inOutCubic(L.prog(v.gt, s7.start + 1.2, 0.8)) * (1 - L.ease.inOutCubic(L.prog(v.gt, s7.end - 0.2, 0.6)));
    const warmT = L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[2].end - 0.9, 0.9));
    // in the bacterium hold the cells step into shadow (cell #5 less: it carries the 7× ruler)
    const sc = v.tl.scenes;
    const shade = 0.5 * L.ease.inOutCubic(L.prog(v.gt, sc[3].start + 1.15, 0.8)) * (1 - L.ease.inOutCubic(L.prog(v.gt, sc[4].end, 1.5)));
    for (let i = 0; i < N_CELLS; i++) {
      const st = cellState(v, i);
      if (!st) continue;
      const sx = v.wx(st.x), sy = v.wy(st.y);
      if (sx < -r * 1.5 || sx > L.W + r * 1.5 || sy < -r * 1.5 || sy > L.H + r * 1.5) continue;
      drawCell(ctx, sx, sy, r * 0.985, { sq: st.sq, tilt: st.tilt, alpha: st.a * dim, warm: i === 5 ? warmT : 0, shade: shade * (i === 5 ? 0.55 : 1) });
    }
    // the caliper ticks: one subdivision per landed cell
    const ck = hairCaliperK(v);
    if (ck > 0 && v.ws(2 * HAIR_R) > 200) {
      const x = v.wx(BRACKET_X);
      ctx.save();
      ctx.lineCap = 'round';
      for (let j = 1; j < N_CELLS; j++) {
        const tk = L.prog(v.gt, landAt(v.tl, j - 1) - 0.25, 0.3) * ck;
        if (tk <= 0) continue;
        const y = v.wy(-HAIR_R + j * D), w = 11 * L.ease.outBack(tk, 2);
        ctx.strokeStyle = 'rgba(2,8,10,0.5)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.stroke();
        ctx.strokeStyle = L.rgba(v.accent, 0.95 * tk); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.stroke();
      }
      ctx.restore();
    }
  },

  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    const kout = 1 - L.ease.inCubic(L.prog(t, d - 0.34, 0.3));
    // (the small 7 µm caliper on cell #5 read as a stray mark next to the label; the caption backing is in env.drawHud)
    const k = Math.min(v.k, L.prog(t, 2.15, 0.55)) * kout;
    L.bigLabel(ctx, { x: 120, y: 368, big: '≈ 7 µm', small: 'ten span the hair', k, accent: v.accent, size: 104 });
  },
};

export function caliperSmall(ctx, x, y1, y2, k, color) {
  const e = L.ease.outCubic(L.clamp(k));
  const mid = (y1 + y2) / 2, a = L.lerp(mid, y1, e), b = L.lerp(mid, y2, e);
  const cap = 12 * L.ease.outCubic(L.prog(k, 0.5, 0.5));
  const stroke = () => {
    ctx.beginPath();
    ctx.moveTo(x, a); ctx.lineTo(x, b);
    if (cap > 0) { ctx.moveTo(x - cap, y1); ctx.lineTo(x + cap * 0.6, y1); ctx.moveTo(x - cap, y2); ctx.lineTo(x + cap * 0.6, y2); }
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(2,8,10,0.55)'; ctx.lineWidth = 8; stroke();
  ctx.shadowColor = L.rgba(color, 0.6); ctx.shadowBlur = 10;
  ctx.strokeStyle = L.rgba(color, 0.98); ctx.lineWidth = 3.5; stroke();
  ctx.restore();
}
