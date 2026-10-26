// Beat 12 — "Fossil corals recorded it, | in their daily growth rings."
// The dive: a target reticle locks on the coral site (New York) on the Earth glyph and rides the 13-order zoom
// down; the land opens onto a pale limestone exposure, its pavement of jointed blocks, then the slab surface
// (grain, crinoid ossicles, brachiopods) and finally a Devonian horn coral (Heliophyllum-like, ~8 cm) lying on the
// slab: annual constrictions, fine daily growth ridges, a septate calyx. On "daily growth rings" a loupe opens over
// one yearly band (highlighted on the coral): a scan runs across its fine ridges while the count climbs to 400.
import * as L from '../../../../engine/runtime/lib.js';
import { CORAL } from '../env.js';
import { at as cameraAt } from '../camera.js';

const { W, H, ease, clamp, prog, rgba } = L;
const TAU = Math.PI * 2;
const ROCK = [120, 114, 102], ROCK_D = [86, 82, 74], ROCK_L = [146, 140, 126];
const CO = [174, 154, 124], CO_L = [222, 208, 182], CO_D = [96, 82, 64];

const ph = (tl, i) => tl.lines[i].phrases ?? [tl.lines[i]];
function times(tl) {
  const s = tl.scenes[12].start;
  const land = s + 2.7;                                       // the camera lands (travel 2.7 s)
  return { s, end: tl.scenes[12].end, land, loupe: land - 0.05, count0: land + 0.2, countDur: 1.1, label: land + 0.4, tag0: s + 0.25, tag1: ph(tl, 12)[0].end + 0.15 };
}

// ------------------------------------------------------------------ the coral (world metres, relative to CORAL)
const A = [-0.042, 0.014], C = [-0.010, 0.031], B = [0.034, 0.004];   // a real horn coral's curve (Heliophyllum)
const spine = (s) => {
  const u = 1 - s;
  return [u * u * A[0] + 2 * u * s * C[0] + s * s * B[0], u * u * A[1] + 2 * u * s * C[1] + s * s * B[1]];
};
const tangent = (s) => {
  const x = 2 * (1 - s) * (C[0] - A[0]) + 2 * s * (B[0] - C[0]), y = 2 * (1 - s) * (C[1] - A[1]) + 2 * s * (B[1] - C[1]);
  const m = Math.hypot(x, y); return [x / m, y / m];
};
const BANDS = Array.from({ length: 10 }, (_, k) => 0.11 + k * 0.097 + 0.016 * Math.sin(k * 2.3 + 0.4));   // annual constrictions (s)
const HB = 5;                                                          // the highlighted yearly band: [BANDS[5], BANDS[6]]
function halfW(s) {
  let w = 0.0011 + 0.0146 * Math.pow(s, 0.8);
  BANDS.forEach((b, k) => { w *= 1 - (0.03 + 0.03 * (0.5 + 0.5 * L.noise1(k * 1.7, 61))) * Math.exp(-Math.pow((s - b) / 0.011, 2)); });
  // irregular rugose wrinkles (not a machined cone): two octaves of noise along the horn
  return w * (1 + 0.012 * Math.sin(s * 140) + 0.018 * L.noise1(s * 38, 62) + 0.008 * L.noise1(s * 110, 63));
}
/** Edge points at s: [top, bottom] (top = the side facing screen-up). */
function edges(s) {
  const p = spine(s), t = tangent(s), w = halfW(s), n = [t[1], -t[0]];
  return [[p[0] + n[0] * w, p[1] + n[1] * w], [p[0] - n[0] * w, p[1] - n[1] * w], t, n, w, p];
}

function drawCoral(ctx, v, k, hk) {
  const X = (x) => v.wx(CORAL.x + x), Y = (y) => v.wy(CORAL.y + y), mpp = v.cam.mpp;
  const NS = 90;
  const E = Array.from({ length: NS + 1 }, (_, i) => edges(i / NS));
  ctx.save();
  ctx.globalAlpha *= k;
  // outline path (top edge out, bottom edge back)
  const outline = () => {
    ctx.beginPath();
    E.forEach((e, i) => ctx[i ? 'lineTo' : 'moveTo'](X(e[0][0]), Y(e[0][1])));
    for (let i = NS; i >= 0; i--) ctx.lineTo(X(E[i][1][0]), Y(E[i][1][1]));
    ctx.closePath();
  };
  // soft contact shadow on the slab (light from the upper left)
  ctx.save();
  ctx.shadowColor = 'rgba(20,16,10,0.55)';
  ctx.shadowBlur = Math.min(60, 0.003 / mpp);
  ctx.shadowOffsetX = Math.min(30, 0.0012 / mpp);
  ctx.shadowOffsetY = Math.min(40, 0.0018 / mpp);
  outline();
  ctx.fillStyle = rgba(CO_D);
  ctx.fill();
  ctx.restore();
  // body: strips shaded across the horn like a cylinder (highlight on the upper side)
  for (let i = 0; i < NS; i++) {
    const e0 = E[i], e1 = E[Math.min(NS, i + 1)];
    const g = ctx.createLinearGradient(X(e0[0][0]), Y(e0[0][1]), X(e0[1][0]), Y(e0[1][1]));
    const tone = 0.5 + 0.5 * L.noise1(i * 0.35, 3);
    g.addColorStop(0, rgba(L.mix(CO, CO_D, 0.35)));
    g.addColorStop(0.22, rgba(L.mix(CO_L, CO, 0.25 * tone)));
    g.addColorStop(0.55, rgba(CO));
    g.addColorStop(1, rgba(CO_D));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(e0[0][0]), Y(e0[0][1])); ctx.lineTo(X(e1[0][0]), Y(e1[0][1]));
    ctx.lineTo(X(e1[1][0]), Y(e1[1][1])); ctx.lineTo(X(e0[1][0]), Y(e0[1][1]));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.stroke();      // hides the strip seams
  }
  ctx.save();
  outline(); ctx.clip();
  // longitudinal septal ribs (faint)
  ctx.lineWidth = Math.max(0.6, 0.00012 / mpp);
  for (let f = -0.8; f <= 0.81; f += 0.2) {
    ctx.strokeStyle = `rgba(80,64,46,${0.18 * (1 - Math.abs(f) * 0.6)})`;
    ctx.beginPath();
    for (let i = 4; i <= NS; i++) { const e = E[i], x = e[5][0] + e[3][0] * e[4] * f, y = e[5][1] + e[3][1] * e[4] * f; ctx[i > 4 ? 'lineTo' : 'moveTo'](X(x), Y(y)); }
    ctx.stroke();
  }
  // growth ridges: fine daily ridges (LOD: >= 3 px apart) + darker annual grooves
  const ridge = (s, dark, light, lw) => {
    const [tp, bt, t, , w] = edges(s), bow = w * (0.32 + 0.12 * L.noise1(s * 60, 7));
    const mx = (tp[0] + bt[0]) / 2 + t[0] * bow, my = (tp[1] + bt[1]) / 2 + t[1] * bow;
    ctx.lineWidth = lw;
    ctx.strokeStyle = dark;
    ctx.beginPath(); ctx.moveTo(X(tp[0]), Y(tp[1])); ctx.quadraticCurveTo(X(mx), Y(my), X(bt[0]), Y(bt[1])); ctx.stroke();
    if (light) {
      const o = lw * mpp * 0.9;
      ctx.strokeStyle = light;
      ctx.beginPath(); ctx.moveTo(X(tp[0] - t[0] * o), Y(tp[1] - t[1] * o)); ctx.quadraticCurveTo(X(mx - t[0] * o), Y(my - t[1] * o), X(bt[0] - t[0] * o), Y(bt[1] - t[1] * o)); ctx.stroke();
    }
  };
  const segLenPx = (s0, s1) => { const a = spine(s0), b = spine(s1); return Math.hypot(b[0] - a[0], b[1] - a[1]) / mpp; };
  const stops = [0.02, ...BANDS, 0.995];
  for (let b = 0; b < stops.length - 1; b++) {
    const s0 = stops[b], s1 = stops[b + 1];
    const n = Math.min(400, Math.floor(segLenPx(s0, s1) / 3.2));
    for (let j = 1; j < n; j++) ridge(s0 + ((s1 - s0) * j) / n, 'rgba(70,54,38,0.32)', 'rgba(246,232,200,0.22)', 1);
  }
  for (const s of BANDS) ridge(s, 'rgba(60,44,30,0.48)', 'rgba(250,236,206,0.3)', Math.max(1.2, 0.0003 / mpp));
  // weathered surface: fine pits and grains (only close up)
  if (mpp < 4e-4) {
    const g = 0.0007;
    for (let i = Math.floor(-0.045 / g); i < 0.04 / g; i++) {
      for (let j = Math.floor(-0.016 / g); j < 0.04 / g; j++) {
        const h = h2(i, j, 51);
        if (h > 0.22) continue;
        ctx.fillStyle = h < 0.1 ? 'rgba(70,58,42,0.35)' : 'rgba(250,240,220,0.3)';
        ctx.fillRect(X((i + h2(j, i, 52)) * g), Y((j + h2(i, j, 53)) * g), 1.5, 1.5);
      }
    }
  }
  // highlighted yearly band
  if (hk > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(v.accent, 0.07 * hk);
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const e = edges(L.lerp(BANDS[HB], BANDS[HB + 1], i / 20)); ctx[i ? 'lineTo' : 'moveTo'](X(e[0][0]), Y(e[0][1])); }
    for (let i = 20; i >= 0; i--) { const e = edges(L.lerp(BANDS[HB], BANDS[HB + 1], i / 20)); ctx.lineTo(X(e[1][0]), Y(e[1][1])); }
    ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  if (hk > 0) {
    ctx.strokeStyle = rgba(v.accent, 0.9 * hk);
    ctx.lineWidth = 2;
    for (const s of [BANDS[HB], BANDS[HB + 1]]) {
      const [tp, bt] = edges(s), ext = 0.0015;
      const d = [bt[0] - tp[0], bt[1] - tp[1]], m = Math.hypot(...d);
      ctx.beginPath();
      ctx.moveTo(X(tp[0] - (d[0] / m) * ext), Y(tp[1] - (d[1] / m) * ext));
      ctx.lineTo(X(bt[0] + (d[0] / m) * ext * 0.3), Y(bt[1] + (d[1] / m) * ext * 0.3));
      ctx.stroke();
    }
  }
  // calyx (the cup at the wide end): an oblique ellipse with radiating septa
  const [, , tB, nB, wB, pB] = edges(1);
  const ang = Math.atan2(nB[1], nB[0]);
  const ex = X(pB[0]), ey = Y(pB[1]), ra = wB / mpp, rb = (wB * 0.34) / mpp;
  ctx.save();
  ctx.translate(ex, ey); ctx.rotate(ang);
  const cg = ctx.createRadialGradient(0, rb * 0.3, 0, 0, 0, ra);
  cg.addColorStop(0, 'rgb(70,58,44)'); cg.addColorStop(1, 'rgb(128,108,82)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0, ra), Math.max(0, rb), 0, 0, TAU); ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(226,206,168,0.32)';
  ctx.lineWidth = Math.max(0.8, 0.00012 / mpp);
  ctx.beginPath();
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * TAU, f = i % 2 ? 0.55 : 0.12;
    ctx.moveTo(Math.cos(a) * ra * f, Math.sin(a) * rb * f); ctx.lineTo(Math.cos(a) * ra, Math.sin(a) * rb);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(240,224,190,0.85)';
  ctx.lineWidth = Math.max(1.2, 0.0003 / mpp);
  ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0, ra), Math.max(0, rb), 0, Math.PI * 0.55, Math.PI * 1.55); ctx.stroke();
  ctx.strokeStyle = 'rgba(70,56,40,0.7)';
  ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0, ra), Math.max(0, rb), 0, -Math.PI * 0.45, Math.PI * 0.55); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ rock: exposure → pavement → slab
function h2(i, j, s) { const h = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
const EXPO_R = 40;
function drawRock(ctx, v, k) {
  const mpp = v.cam.mpp, X = (x) => v.wx(CORAL.x + x), Y = (y) => v.wy(CORAL.y + y);
  ctx.save();
  ctx.globalAlpha *= k;
  // the exposure: an irregular pale limestone outcrop in the fields
  if (mpp > 0.02) {
    ctx.beginPath();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU, r = EXPO_R * (1 + 0.22 * L.noise1(i * 0.31, 11) + 0.1 * L.noise1(i * 1.1, 12));
      ctx[i ? 'lineTo' : 'moveTo'](X(Math.cos(a) * r * 1.3), Y(Math.sin(a) * r));
    }
    ctx.closePath();
    ctx.fillStyle = rgba(ROCK);
    ctx.shadowColor = 'rgba(30,34,20,0.6)'; ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save(); ctx.clip();
  } else {
    ctx.save();
    ctx.fillStyle = rgba(ROCK);
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }
  // world bounds (relative to CORAL)
  const x0 = (0 - W / 2) * mpp + v.cam.x - CORAL.x, x1 = (W / 2) * mpp + v.cam.x - CORAL.x;
  const y0 = -H * v.cam.anchor * mpp + v.cam.y - CORAL.y, y1 = H * (1 - v.cam.anchor) * mpp + v.cam.y - CORAL.y;
  // mottling octaves (soft tone patches), each peaking when its cells are ~140 px
  for (const [s, oi] of [[3, 1], [0.8, 2], [0.2, 3], [0.06, 4], [0.02, 5], [0.006, 6], [0.002, 7]]) {
    const px = s / mpp;
    if (px < 70 || px > 1400) continue;
    const w = Math.exp(-Math.pow(Math.log10(px / 260) / 0.45, 2));
    for (let i = Math.floor(x0 / s); i <= Math.floor(x1 / s); i++) {
      for (let j = Math.floor(y0 / s); j <= Math.floor(y1 / s); j++) {
        const h = h2(i, j, oi);
        if (h > 0.55) continue;
        const cx = X((i + h2(i + 1, j, oi)) * s), cy = Y((j + h2(i, j + 1, oi)) * s), r = px * (0.35 + 0.6 * h2(i - 3, j, oi));
        const col = h < 0.28 ? ROCK_D : ROCK_L, gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r * 1.6));
        gg.addColorStop(0, rgba(col, 0.2 * w)); gg.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gg;
        ctx.fillRect(cx - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);
      }
    }
  }
  // pavement: jointed blocks (clints) split by dark fissures (grikes); the coral sits mid-block
  const S = 2.2, bpx = S / mpp;
  const pk = clamp((bpx - 30) / 50) * clamp((9000 - bpx) / 4000);
  if (pk > 0) {
    const vx = (i, j) => (i - 0.5) * S + (h2(i, j, 21) - 0.5) * 0.5 * S, vy = (i, j) => (j - 0.5) * S + (h2(i, j, 22) - 0.5) * 0.5 * S;
    const i0 = Math.floor(x0 / S) - 1, i1 = Math.floor(x1 / S) + 2, j0 = Math.floor(y0 / S) - 1, j1 = Math.floor(y1 / S) + 2;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        if (h2(i, j, 23) > 0.32) { ctx.moveTo(X(vx(i, j)), Y(vy(i, j))); ctx.lineTo(X(vx(i, j + 1)), Y(vy(i, j + 1))); }
        if (h2(i, j, 24) > 0.25) { ctx.moveTo(X(vx(i, j)), Y(vy(i, j))); ctx.lineTo(X(vx(i + 1, j)), Y(vy(i + 1, j))); }
      }
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba([58, 56, 50], 0.85 * pk);
    ctx.lineWidth = clamp(0.05 / mpp, 1, 7);
    ctx.stroke();
  }
  // grain speckles at hand-lens scale
  const gs = 0.0016, gpx = gs / mpp;
  if (gpx > 9 && gpx < 120) {
    const gk = clamp((gpx - 9) / 6);
    for (let i = Math.floor(x0 / gs); i <= Math.floor(x1 / gs); i++) {
      for (let j = Math.floor(y0 / gs); j <= Math.floor(y1 / gs); j++) {
        const h = h2(i, j, 31);
        if (h > 0.3) continue;
        ctx.fillStyle = h < 0.12 ? `rgba(90,86,76,${0.45 * gk})` : `rgba(214,208,192,${0.4 * gk})`;
        const sz = 1 + 1.6 * h2(j, i, 32);
        ctx.fillRect(X((i + h2(i, j, 33)) * gs), Y((j + h2(i, j, 34)) * gs), sz, sz);
      }
    }
  }
  drawFossils(ctx, v, X, Y);
  // a warm key light from the upper left across the slab, darker towards the frame edges
  if (mpp < 0.003) {
    const kx = X(-0.03), ky = Y(-0.04), kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, 1300);
    kg.addColorStop(0, 'rgba(255,236,200,0.08)'); kg.addColorStop(0.5, 'rgba(255,236,200,0.03)'); kg.addColorStop(1, 'rgba(20,16,10,0.22)');
    ctx.fillStyle = kg;
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }
  ctx.restore();
  ctx.restore();
  // soft dark scrims so the HUD band and the captions keep their contrast over the pale rock
  if (k > 0) {
    ctx.save();
    // smooth (cosine) profiles, so neither scrim reads as a hard stripe
    const scrim = (y0, y1, prof) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      for (let i = 0; i <= 16; i++) g.addColorStop(i / 16, `rgba(10,10,8,${(prof(i / 16) * k).toFixed(4)})`);
      ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
    };
    scrim(0, 420, (u) => 0.45 * (u < 0.55 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (u - 0.55) / 0.45)));
    scrim(1100, 1560, (u) => 0.32 * (0.5 - 0.5 * Math.cos(TAU * u)));
    ctx.restore();
  }
}

// scattered small fossils on the slab (world-anchored; skipped where the coral and the loupe sit)
const FOSSILS = (() => {
  const r = L.rng(1213), out = [];
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 0.5, y = (r() - 0.5) * 0.5, s = 0.0025 + r() * 0.006, type = r() < 0.55 ? 'crinoid' : 'brach', a = r() * TAU;
    if (Math.abs(x) < 0.052 && y > -0.05 && y < 0.05) continue;
    if (Math.abs(x) < 0.08 && y < -0.05) continue;            // keep the chapter card / HUD clean
    out.push({ x, y, s, type, a });
  }
  out.push({ x: 0.047, y: -0.04, s: 0.0068, type: 'brach', a: 0.6 }, { x: 0.05, y: 0.058, s: 0.004, type: 'stem', a: -0.5 }, { x: -0.05, y: 0.052, s: 0.0035, type: 'crinoid', a: 0 });
  return out;
})();
function drawFossils(ctx, v, X, Y) {
  const mpp = v.cam.mpp;
  for (const f of FOSSILS) {
    const px = f.s / mpp;
    if (px < 3) continue;
    const x = X(f.x), y = Y(f.y);
    if (x < -px * 3 || x > W + px * 3 || y < -px * 3 || y > H + px * 3) continue;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(f.a);
    const a = clamp((px - 3) / 6);
    ctx.globalAlpha *= a;
    if (f.type === 'brach') {           // a ribbed brachiopod shell
      const shell = (o) => { ctx.beginPath(); ctx.moveTo(o, px * 0.55 + o); ctx.bezierCurveTo(-px * 1.15 + o, px * 0.2 + o, -px * 0.9 + o, -px * 0.85 + o, o, -px * 0.8 + o); ctx.bezierCurveTo(px * 0.9 + o, -px * 0.85 + o, px * 1.15 + o, px * 0.2 + o, o, px * 0.55 + o); };
      ctx.fillStyle = 'rgba(40,34,24,0.22)'; shell(px * 0.1); ctx.fill();      // contact shadow
      ctx.fillStyle = 'rgb(176,164,140)'; shell(0); ctx.fill();
      ctx.strokeStyle = 'rgba(96,84,64,0.5)'; ctx.lineWidth = Math.max(0.6, px * 0.03);
      ctx.beginPath();
      for (let i = -6; i <= 6; i++) { ctx.moveTo(0, px * 0.5); ctx.lineTo(Math.sin(i * 0.2) * px * 0.95, -Math.cos(i * 0.2) * px * 0.7); }
      ctx.stroke();
    } else {                            // crinoid ossicles: discs with a central canal (a short stem for 'stem')
      const n = f.type === 'stem' ? 5 : 1;
      for (let i = 0; i < n; i++) {
        const ox = (i - (n - 1) / 2) * px * 0.55;
        ctx.fillStyle = 'rgb(170,160,140)';
        ctx.beginPath(); ctx.ellipse(ox, 0, Math.max(0, n > 1 ? px * 0.26 : px * 0.5), Math.max(0, px * 0.5), 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(92,82,64,0.55)'; ctx.lineWidth = Math.max(0.6, px * 0.05); ctx.stroke();
        if (n === 1) {
          ctx.fillStyle = 'rgba(80,70,56,0.7)';
          ctx.beginPath(); ctx.arc(0, 0, Math.max(0, px * 0.1), 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(92,82,64,0.35)';
          ctx.beginPath(); for (let k = 0; k < 10; k++) { const b = (k / 10) * TAU; ctx.moveTo(Math.cos(b) * px * 0.16, Math.sin(b) * px * 0.16); ctx.lineTo(Math.cos(b) * px * 0.46, Math.sin(b) * px * 0.46); } ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ the loupe over the yearly band
const LC = [0.0, -0.0255], LR = 0.0165;
function drawLoupe(ctx, v, T) {
  const gt = v.gt, mpp = v.cam.mpp;
  const kL = ease.outCubic(prog(gt, T.loupe, 0.6));
  if (kL <= 0 || mpp > 6e-4) return;
  const X = (x) => v.wx(CORAL.x + x), Y = (y) => v.wy(CORAL.y + y);
  const cx = X(LC[0]), cy = Y(LC[1]), R = (LR / mpp) * (0.7 + 0.3 * kL);
  // connectors: from the band's top edge to the lens
  const [tA] = edges(BANDS[HB]), [tB] = edges(BANDS[HB + 1]);
  const ck = ease.outCubic(prog(gt, T.loupe - 0.1, 0.5));
  ctx.save();
  ctx.strokeStyle = rgba(v.accent, 0.55 * ck);
  ctx.lineWidth = 1.5;
  for (const [p, a] of [[tA, Math.PI * 0.8], [tB, Math.PI * 0.2]]) {
    const ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R, sx = X(p[0]), sy = Y(p[1]);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(L.lerp(sx, ex, ck), L.lerp(sy, ey, ck)); ctx.stroke();
  }
  ctx.globalAlpha *= kL;
  // drop shadow + lens body
  ctx.save();
  ctx.shadowColor = 'rgba(10,8,4,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 18;
  ctx.fillStyle = 'rgb(40,36,30)';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R + 7), 0, TAU); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R), 0, TAU); ctx.clip();
  // the lens shows the band at the same angle as on the horn: rotate its ridges to the band's growth lines
  const tm = tangent((BANDS[HB] + BANDS[HB + 1]) / 2);
  const tilt = Math.atan2(tm[1], tm[0]);       // horn axis on screen (0 = horizontal); ridges run across it
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(tilt); ctx.translate(-cx, -cy);
  // magnified band: the horn's surface fills the lens (cylinder shading across the horn)
  const bg = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
  bg.addColorStop(0, rgba(L.mix(CO, CO_D, 0.2))); bg.addColorStop(0.3, rgba(CO_L)); bg.addColorStop(0.65, rgba(CO)); bg.addColorStop(1, rgba(CO_D));
  ctx.fillStyle = bg;
  ctx.fillRect(cx - 1.5 * R, cy - 1.5 * R, 3 * R, 3 * R);
  const gx0 = cx - R * 0.7, gx1 = cx + R * 0.7, bow = R * 0.16;
  const line = (x, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, cy - 1.4 * R); ctx.quadraticCurveTo(x + bow, cy, x, cy + 1.4 * R); ctx.stroke(); };
  // daily ridges (fine, slightly irregular)
  const M = 48, scan = ease.inOutCubic(prog(gt, T.count0, T.countDur)), cur = L.lerp(gx0, gx1, scan);
  for (let i = 1; i < M; i++) {
    const x = L.lerp(gx0, gx1, (i + 0.3 * L.noise1(i * 0.7, 41)) / M);
    const on = x < cur && scan > 0;
    line(x + 1.5, 'rgba(252,240,214,0.38)', 1.2);
    line(x, on ? rgba(L.mix([50, 38, 26], v.accent, 0.28), 0.88) : 'rgba(58,44,30,0.72)', 2);
  }
  // outside the year: ridges continue faintly beyond the annual grooves
  for (let i = 1; i < 15; i++) {
    for (const x of [gx0 - (i * (gx1 - gx0)) / M, gx1 + (i * (gx1 - gx0)) / M]) line(x, 'rgba(70,54,38,0.35)', 1);
  }
  for (const x of [gx0, gx1]) { line(x + 2, 'rgba(250,236,206,0.5)', 2); line(x, 'rgba(52,38,26,0.85)', 4); }
  // scanned part tinted + cursor
  if (scan > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(v.accent, 0.05);
    ctx.fillRect(gx0, cy - 1.4 * R, cur - gx0, 2.8 * R);
    if (scan < 1) {
      ctx.strokeStyle = rgba(v.accent, 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cur, cy - 1.4 * R); ctx.quadraticCurveTo(cur + bow, cy, cur, cy + 1.4 * R); ctx.stroke();
      L.lightBlob(ctx, cur + bow / 2, cy, 60, v.accent, 0.35);
    }
    ctx.restore();
  }
  ctx.restore();   // end of the band's rotation: the bracket and its text stay upright
  // the lens tags leave before the question card (they must not ghost through its dimmed backdrop)
  const tagOut = 1 - ease.inCubic(prog(gt, T.end - 0.45, 0.35));
  // "1 YEAR" bracket across the band
  const by = cy - R * 0.5, bk = ease.outCubic(prog(gt, T.loupe + 0.35, 0.5)) * tagOut;
  if (bk > 0) {
    ctx.save();
    ctx.globalAlpha *= bk;
    ctx.fillStyle = 'rgba(16,14,10,0.88)';
    L.roundRect(ctx, cx - 74, by - 55, 148, 40, 7); ctx.fill();
    ctx.strokeStyle = rgba(v.accent); ctx.lineWidth = 2.5;
    const hw = (gx1 - gx0) / 2 * ease.outCubic(bk);
    ctx.beginPath(); ctx.moveTo(cx - hw, by + 10); ctx.lineTo(cx - hw, by); ctx.lineTo(cx + hw, by); ctx.lineTo(cx + hw, by + 10); ctx.stroke();
    ctx.font = L.font(26, 700, L.FONT.body);   // 13b: ≥ 26 px
    ctx.fillStyle = rgba(v.accent);
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, '1 YEAR', cx, by - 34, 3, 'center');
    ctx.restore();
  }
  // glass: a soft reflection
  const rg = ctx.createLinearGradient(cx - R, cy - R, cx, cy);
  rg.addColorStop(0, 'rgba(255,255,255,0.16)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.ellipse(cx - R * 0.35, cy - R * 0.45, Math.max(0, R * 0.55), Math.max(0, R * 0.3), -0.6, 0, TAU); ctx.fill();
  const vg = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,8,4,0.35)');
  ctx.fillStyle = vg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.restore();
  // a small honesty note under the lens
  const nk = ease.outCubic(prog(gt, T.loupe + 0.5, 0.5)) * tagOut;
  if (nk > 0) {
    ctx.save();
    ctx.globalAlpha *= nk;
    ctx.font = L.font(26, 600, L.FONT.body);   // 13b: ≥ 26 px
    ctx.fillStyle = 'rgba(12,12,10,0.88)';
    ctx.letterSpacing = '2px';
    const nw = ctx.measureText('RIDGES SIMPLIFIED').width;
    ctx.letterSpacing = '0px';
    L.roundRect(ctx, cx - nw / 2 - 14, cy + R + 20, nw + 28, 40, 7); ctx.fill();
    ctx.fillStyle = 'rgba(226,230,236,0.92)';
    ctx.textBaseline = 'middle';
    L.trackedText(ctx, 'RIDGES SIMPLIFIED', cx, cy + R + 40, 2, 'center');
    ctx.restore();
  }
  // metal rim
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgb(58,54,48)';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R + 3.5), 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(230,226,214,0.7)';
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R + 6), Math.PI * 0.95, Math.PI * 1.7); ctx.stroke();
  ctx.strokeStyle = rgba(v.accent, 0.7);
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R + 0.5), 0, TAU); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ the dive reticle (screen-space, world-anchored)
function drawReticle(ctx, v, T) {
  const k = ease.outCubic(prog(v.gt, T.tag0, 0.5)) * (1 - ease.inCubic(prog(v.gt, T.tag1, 0.4)));
  if (k <= 0) return;
  // placed with the camera of the OUTPUT frame (not the motion-blur sub-frame): the lock-on stays crisp while the
  // world streaks under it, and its tag never smears
  const gq = Math.round(v.gt * 30) / 30, cq = cameraAt(gq, v.tl);
  const x = W / 2 + (CORAL.x - cq.x) / cq.mpp, y = H * (cq.anchor ?? 0.5) + (CORAL.y - cq.y) / cq.mpp;
  if (x < -100 || x > W + 100) return;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.strokeStyle = rgba(v.accent, 0.9);
  ctx.lineWidth = 2;
  const r = 44 + 16 * (1 - k), rot = (v.gt - T.s) * 0.6;
  for (let q = 0; q < 4; q++) {
    const a = rot + (q * Math.PI) / 2;
    ctx.beginPath(); ctx.arc(x, y, r, a + 0.2, a + Math.PI / 2 - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a + Math.PI / 4) * (r + 4), y + Math.sin(a + Math.PI / 4) * (r + 4));
    ctx.lineTo(x + Math.cos(a + Math.PI / 4) * (r + 14), y + Math.sin(a + Math.PI / 4) * (r + 14)); ctx.stroke();
  }
  ctx.fillStyle = rgba(v.accent);
  ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
  // tag to the left (the target sits near the right edge during most of the dive)
  const tx = Math.min(x - r - 30, W - 200), ty = y - 6;
  const label = 'DEVONIAN REEF · NEW YORK';
  // the tag waits until the Sun has left the frame (it ran through the Sun's glow at the start of the dive)
  ctx.globalAlpha *= ease.outCubic(prog(v.gt, T.s + 0.55, 0.35));
  ctx.font = L.font(26, 700, L.FONT.body);   // 13b: ≥ 26 px, on an opaque plate
  ctx.letterSpacing = '2px';
  const tw = ctx.measureText(label).width - 2;
  ctx.letterSpacing = '0px';
  ctx.fillStyle = 'rgba(12,12,10,0.88)';
  L.roundRect(ctx, tx - tw - 16, ty - 25, tw + 30, 46, 8); ctx.fill();
  ctx.fillStyle = 'rgba(236,240,248,0.96)';
  ctx.textBaseline = 'middle';
  L.trackedText(ctx, label, tx, ty - 2, 2, 'right');
  ctx.restore();
}

export default {
  beat: 12,
  chapter: { num: '12', title: 'Fossil corals', sub: 'Devonian, New York' },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: 0.05, name: 'dive', gain: 0.4, pitch: 0.8 },           // the 13-order dive
      { t: 0.3, name: 'sonar', gain: 0.16, pitch: 1.2 },          // reticle locks on New York
      { t: 1.4, name: 'whoosh', gain: 0.26, pitch: 0.7 },         // through the atmosphere
      { t: 2.65, name: 'impact', gain: 0.3, pitch: 0.7 },         // lands on the coral
      { t: 2.75, name: 'shimmer', gain: 0.22, pitch: 1.0 },       // the loupe opens
      { t: 2.9, name: 'count', gain: 0.22, pitch: 1.1 },          // the scan counts the ridges
      { t: 4.0, name: 'ping', gain: 0.32, pitch: 0.85 },          // 400
      { t: 4.15, name: 'swell', gain: 0.2, pitch: 0.6 },           // final hold
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt < v.tl.scenes[12].start - 0.05) return;
    const T = times(v.tl), mpp = v.cam.mpp;
    if (mpp > 10) return;
    const rk = clamp(L.invLerp(Math.log(9), Math.log(3), Math.log(mpp)));
    drawRock(ctx, v, rk);
    if (mpp < 0.004) {
      const hk = ease.outCubic(prog(v.gt, T.loupe - 0.15, 0.5));
      drawCoral(ctx, v, clamp(L.invLerp(0.004, 0.0015, mpp)), hk);
    }
    drawLoupe(ctx, v, T);
  },
  drawOverlay(ctx, v) {
    const T = times(v.tl);
    drawReticle(ctx, v, T);
    const k = v.k * prog(v.gt, T.label, 0.55);
    if (k <= 0) return;
    const n = Math.round(400 * ease.inOutCubic(prog(Math.round(v.gt * 30) / 30, T.count0, T.countDur)));   // frame-stable count
    L.bigLabel(ctx, { x: 96, y: 1196, big: `${Math.max(1, n)} ${n > 1 ? 'rings' : 'ring'}`, small: 'in one year, ~400 million years ago', k, accent: v.accent, size: 96 });
  },
};
