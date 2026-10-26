// Beat 12 — "Including the atoms that make up you."
// The stadium folds back into the atom, and the camera pulls all the way out: past the DNA, the virus, the
// bacterium, the blood cells and the hair, to a 1.75 m person whose crown sits at the origin. The atom stays a
// bright point the whole way (it ends up on the crown of the head: that's where we started). The person is a
// dark silhouette with a cool rim light, faintly textured with a fine lattice of "atoms". Then the closing
// number lands: ≈ 7 × 10^27 atoms in one human body.
import * as L from '../../../../engine/runtime/lib.js';
import { P, at as camAt } from '../camera.js';
import { drawBackground } from '../env.js';

const { ease, clamp, prog, lerp, rgba } = L;
const HEIGHT = 1.75;
/** The person stands with the crown 12 mm below the origin: the hair we started on grows out of the crown and
 *  arcs up through the origin (where the zoom began), horizontal there exactly like the 70 µm hair of beat 1. */
const OFF = 0.012;
const HAIR_W = 70e-6;
// the anchor hair: root in the scalp → up and over → through the origin heading +x → falls away to the right
const STRAND = [
  [[-0.017, OFF + 0.004], [-0.019, -0.007], [-0.011, 0], [0, 0]],
  [[0, 0], [0.014, 0], [0.036, 0.001], [0.062, 0.021]],
];
const bez = (q, t) => {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * q[0][i] + 3 * u * u * t * q[1][i] + 3 * u * t * t * q[2][i] + t * t * t * q[3][i]);
};
const STRAND_PTS = (() => {
  const out = [];
  STRAND.forEach((q, si) => { for (let j = si ? 1 : 0; j <= 600; j++) out.push(bez(q, j / 600)); });
  return out;
})();
// the hair mass on the head (world metres, crown at (0, OFF)): outer contour a little outside the skull,
// inner edge a soft hairline at the forehead and temples
const CAP = [
  [-0.083, 0.128], [-0.088, 0.085], [-0.085, 0.045], [-0.071, 0.014], [-0.046, -0.004], [-0.02, -0.009], [0, -0.01],
  [0.02, -0.009], [0.046, -0.004], [0.071, 0.014], [0.085, 0.045], [0.088, 0.085], [0.083, 0.128],
  [0.077, 0.13], [0.073, 0.092], [0.06, 0.066], [0.032, 0.053], [0.006, 0.058], [-0.004, 0.052],
  [-0.032, 0.053], [-0.06, 0.066], [-0.073, 0.092], [-0.077, 0.13],
].map(([x, y]) => [x, y + OFF]);
// fine strands combed out from the crown whorl over the cap (deterministic)
const LOCKS = (() => {
  const r = L.rng(1207), out = [];
  for (let i = 0; i < 90; i++) {
    const side = r() < 0.5 ? -1 : 1, a = r();
    const x0 = side * (0.004 + 0.02 * r()), y0 = OFF + 0.002 + 0.004 * r();
    const x1 = side * (0.035 + 0.05 * a), y1 = OFF + 0.05 + 0.07 * a + 0.01 * r();
    const cx = side * (0.055 + 0.03 * a), cy = OFF + 0.004 + 0.012 * r();
    out.push({ x0, y0, cx, cy, x1, y1, c: r() });
  }
  return out;
})();

// right half of a standing figure, crown (0, 0) → crotch (0, 0.93), metres; mirrored for the left half
const HALF = [
  [0, 0], [0.046, 0.008], [0.072, 0.042], [0.08, 0.1], [0.075, 0.152], [0.063, 0.196], [0.046, 0.226],
  [0.042, 0.25], [0.048, 0.272], [0.095, 0.292], [0.16, 0.306], [0.2, 0.326], [0.217, 0.372],
  [0.224, 0.46], [0.232, 0.58], [0.244, 0.7], [0.254, 0.8], [0.262, 0.862], [0.254, 0.918], [0.234, 0.926],
  [0.222, 0.864], [0.212, 0.8], [0.2, 0.7], [0.19, 0.6], [0.184, 0.5], [0.172, 0.425],
  [0.164, 0.5], [0.15, 0.62], [0.152, 0.74], [0.168, 0.86], [0.166, 0.95], [0.152, 1.1], [0.128, 1.25],
  [0.118, 1.33], [0.122, 1.42], [0.1, 1.56], [0.078, 1.665], [0.092, 1.725], [0.082, 1.75], [0.03, 1.75],
  [0.027, 1.7], [0.04, 1.6], [0.046, 1.42], [0.04, 1.3], [0.03, 1.1], [0.012, 0.945], [0, 0.93],
];
const OUTLINE = [...HALF, ...HALF.slice(1, -1).reverse().map(([x, y]) => [-x, y])];

function bodyPath(ctx, v) {
  const n = OUTLINE.length;
  const pt = (i) => { const [x, y] = OUTLINE[(i + n) % n]; return [v.wx(x), v.wy(y + OFF)]; };
  ctx.beginPath();
  const m0 = pt(0), m1 = pt(1);
  ctx.moveTo((m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2);
  for (let i = 1; i <= n; i++) {
    const a = pt(i), b = pt(i + 1);
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  ctx.closePath();
}

/** Visibility of the person by camera scale: appears as the pull-out nears human scale. */
const personK = (v) => clamp(L.invLerp(Math.log(2.5e-5), Math.log(6e-4), Math.log(v.cam.mpp)));

function drawPerson(ctx, v, k, calm = 1) {
  const hpx = v.ws(HEIGHT);
  if (hpx < 2 || hpx > 3e5 || k <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= k;
  // halo behind the figure + floor shadow
  const cx = v.wx(0), my = v.wy(0.85 + OFF);
  L.lightBlob(ctx, cx, my, hpx * 0.75, [60, 120, 130], 0.18);
  ctx.save();
  ctx.translate(cx, v.wy(HEIGHT + OFF));
  ctx.scale(1, 0.16);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, v.ws(0.42)));
  sg.addColorStop(0, 'rgba(0,0,0,0.6)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(0, 0, Math.max(0, v.ws(0.42)), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // floor line glint
  const fl = ctx.createLinearGradient(cx - v.ws(0.9), 0, cx + v.ws(0.9), 0);
  fl.addColorStop(0, 'rgba(110,240,200,0)');
  fl.addColorStop(0.5, 'rgba(110,240,200,0.22)');
  fl.addColorStop(1, 'rgba(110,240,200,0)');
  ctx.fillStyle = fl;
  ctx.fillRect(cx - v.ws(0.9), v.wy(HEIGHT + OFF) - 0.5, v.ws(1.8), 1.5);

  // body: dark, with a soft top light
  bodyPath(ctx, v);
  const bg = ctx.createLinearGradient(0, v.wy(OFF), 0, v.wy(HEIGHT + OFF));
  bg.addColorStop(0, 'rgb(36,58,62)');
  bg.addColorStop(0.45, 'rgb(22,36,40)');
  bg.addColorStop(1, 'rgb(12,18,21)');
  ctx.fillStyle = bg;
  ctx.fill();
  // fine lattice of atoms inside the silhouette (screen-scaled dot grid, shimmering)
  ctx.save();
  ctx.clip();
  const step = 9;
  const x0 = Math.max(0, v.wx(-0.3)), x1 = Math.min(L.W, v.wx(0.3)), y0 = Math.max(0, v.wy(OFF)), y1 = Math.min(L.H, v.wy(HEIGHT + OFF));
  if (calm > 0.02 && (x1 - x0) * (y1 - y0) / (step * step) < 9000) {
    ctx.globalAlpha *= calm;
    for (let y = y0 - (y0 % step); y < y1; y += step) {
      for (let x = x0 - (x0 % step); x < x1; x += step) {
        const n = L.noise1(x * 0.05 + y * 0.031 + v.gt * 0.9, 5);
        const a = 0.08 + 0.26 * Math.max(0, n);
        ctx.fillStyle = `rgba(150,230,215,${a})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }
  }
  ctx.restore();
  // rim light (cool, from upper right) + soft glow
  ctx.lineJoin = 'round';
  L.glow(ctx, [110, 240, 200], 14, () => {
    bodyPath(ctx, v);
    ctx.strokeStyle = `rgba(170,245,225,${(0.55 * calm).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, 0.9);
  drawHairCap(ctx, v, calm);
  ctx.restore();
}

function capPath(ctx, v) {
  const n = CAP.length;
  const pt = (i) => { const [x, y] = CAP[(i + n) % n]; return [v.wx(x), v.wy(y)]; };
  ctx.beginPath();
  const m0 = pt(0), m1 = pt(1);
  ctx.moveTo((m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2);
  for (let i = 1; i <= n; i++) {
    const a = pt(i), b = pt(i + 1);
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  ctx.closePath();
}

/** Hair on the head: a dark mass with a sheen, combed strands from the crown when close, a rim on top. */
function drawHairCap(ctx, v, calm = 1) {
  const hp = v.ws(0.2);                       // head-ish size in px
  if (hp < 3) return;
  ctx.save();
  capPath(ctx, v);
  const g = ctx.createLinearGradient(v.wx(-0.06), v.wy(OFF - 0.01), v.wx(0.06), v.wy(OFF + 0.09));
  g.addColorStop(0, 'rgb(58,40,30)');
  g.addColorStop(0.45, 'rgb(34,23,18)');
  g.addColorStop(1, 'rgb(18,13,11)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // broad sheen band across the crown
  const sh = ctx.createRadialGradient(v.wx(-0.025), v.wy(OFF + 0.012), 0, v.wx(-0.025), v.wy(OFF + 0.012), Math.max(1, v.ws(0.05)));
  sh.addColorStop(0, 'rgba(170,120,90,0.32)');
  sh.addColorStop(1, 'rgba(170,120,90,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(v.wx(-0.09), v.wy(OFF - 0.02), v.ws(0.18), v.ws(0.12));
  // strands, once a strand is a few pixels long
  const lk = clamp((hp - 120) / 200) * calm;
  if (lk > 0) {
    ctx.lineWidth = Math.max(0.8, Math.min(3, v.ws(HAIR_W)));
    ctx.lineCap = 'round';
    for (const s of LOCKS) {
      ctx.strokeStyle = s.c < 0.5 ? `rgba(120,84,60,${0.5 * lk})` : `rgba(14,9,7,${0.55 * lk})`;
      ctx.beginPath();
      ctx.moveTo(v.wx(s.x0), v.wy(s.y0));
      ctx.quadraticCurveTo(v.wx(s.cx), v.wy(s.cy), v.wx(s.x1), v.wy(s.y1));
      ctx.stroke();
    }
  }
  ctx.restore();
  // cool rim along the top of the hair, matching the body's rim light
  L.glow(ctx, [110, 240, 200], 10, () => {
    capPath(ctx, v);
    ctx.strokeStyle = `rgba(170,245,225,${(0.35 * calm).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, 0.7);
  ctx.restore();
}

/** Camera zoom speed: |Δ ln(mpp)| per frame, measured from the camera itself (pure function of time). */
function zoomSpeed(v) {
  const a = camAt(v.gt - 1 / 60, v.tl), b = camAt(v.gt + 1 / 60, v.tl);
  return Math.abs(Math.log(b.mpp / a.mpp));
}

/** The anchor hair, drawn at every scale through the pull-out so it never leaves us: a 70 µm strand that is
 *  straight and horizontal through the origin (as in beat 1) and, further out, grows from the crown. */
function drawStrand(ctx, v, veil) {
  const mpp = v.cam.mpp;
  const vis = clamp(L.invLerp(Math.log(6e-10), Math.log(4e-9), Math.log(mpp)));
  if (vis <= 0) return;
  const w = HAIR_W / mpp;
  if (w > 4000) return;
  // wide (close-up) hair is veiled with everything else while we fly; once it is a thin line it stays crisp
  const a = vis * lerp(1, 1 - 0.55 * veil, clamp((w - 4) / 40));
  if (a <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    let first = true;
    for (const [x, y] of STRAND_PTS) {
      const sx = v.wx(x), sy = v.wy(y);
      if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
    }
  };
  const lw = Math.max(1.4, w);
  // soft body (no hard outline, so motion-blur sub-frames blend instead of stacking rings)
  if (lw > 6) {
    ctx.strokeStyle = 'rgba(70,44,30,0.55)';
    ctx.lineWidth = lw * 1.06;
    path(); ctx.stroke();
  }
  ctx.strokeStyle = 'rgb(122,80,54)';
  ctx.lineWidth = lw * (lw > 6 ? 0.9 : 1);
  path(); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,180,140,0.45)';
  ctx.lineWidth = Math.max(0.6, lw * 0.28);
  ctx.save();
  ctx.translate(0, -lw * 0.18);
  path(); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** Radial speed streaks while the levels rush past (screen space, deterministic). */
function drawStreaks(ctx, v, k) {
  if (k <= 0.01) return;
  const r = L.rng(4401);
  const cx = v.wx(P.atom.x), cy = v.wy(P.atom.y);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const ang = r() * Math.PI * 2, sp = 0.6 + r() * 0.8, ph = r();
    const q = ((v.gt * sp * 0.9 + ph) % 1);
    const d0 = 60 + q * q * 1100, len = 30 + q * 160;
    const a = k * 0.22 * Math.sin(Math.PI * q);
    ctx.strokeStyle = `rgba(170,240,220,${a.toFixed(3)})`;
    ctx.lineWidth = 1 + q * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * d0, cy + Math.sin(ang) * d0);
    ctx.lineTo(cx + Math.cos(ang) * (d0 + len), cy + Math.sin(ang) * (d0 + len));
    ctx.stroke();
  }
  ctx.restore();
}

/** The atom we zoomed out of: a fixed-size bright point that rides out to the crown of the head. */
function drawAtomPoint(ctx, v, t) {
  const a = ease.outCubic(prog(t, 0.2, 0.4));
  if (a <= 0) return;
  const x = v.wx(P.atom.x), y = v.wy(P.atom.y);
  const settle = ease.inOutCubic(prog(t, 3.0, 0.8));
  ctx.save();
  L.lightBlob(ctx, x, y, lerp(46, 26, settle), [190, 255, 235], 0.55 * a);
  ctx.fillStyle = `rgba(255,255,255,${0.95 * a})`;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, lerp(3.2, 2.6, settle)), 0, Math.PI * 2); ctx.fill();
  // once we are out: a slow "you are here" ring around the crown
  const rk = prog(t, 3.4, 1.4);
  if (rk > 0 && rk < 1) {
    ctx.strokeStyle = rgba(v.accent, 0.6 * (1 - rk));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, 6 + 40 * ease.outCubic(rk)), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** House big label with a hand-set superscript: "≈ 7 × 10^27". */
function powerLabel(ctx, { x, y, k, accent, small }) {
  if (k <= 0) return;
  const e = ease.outCubic(clamp(k)), size = 120;
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.4);
  ctx.fillStyle = rgba(accent, 0.9);
  ctx.fillRect(x, y - size * 0.92 - 26, 90 * e, 4);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = rgba(accent);
  ctx.font = L.font(size, 800, L.FONT.display);
  const yy = y + (1 - e) * 30;
  const w = L.trackedText(ctx, '≈ 7 × 10', x, yy, -1, 'left');
  ctx.font = L.font(size * 0.5, 800, L.FONT.display);
  L.trackedText(ctx, '27', x + w + 6, yy - size * 0.5, 0, 'left');
  ctx.shadowBlur = 8;
  ctx.font = L.font(30, 600, L.FONT.body);
  ctx.fillStyle = rgba([205, 215, 230], 0.95);
  L.trackedText(ctx, small.toUpperCase(), x, y + 52 + (1 - e) * 18, 3, 'left');
  ctx.restore();
}

const T = { settle: 3.15, label: 2.9 };

export default {
  beat: 12,
  chapter: { num: '12', title: 'You', sub: 'Built from the same empty atoms' },
  captions: true,
  layer: 5,
  cues(d) {
    return [
      { t: 0.05, name: 'whoosh', gain: 0.35, pitch: 0.6 },    // the stadium folds back into the atom
      { t: 0.35, name: 'riser', gain: 0.3, pitch: 0.8 },      // pulling out through every level
      { t: T.settle, name: 'impact', gain: 0.5, pitch: 0.7 }, // human scale: you
      { t: T.settle + 0.02, name: 'bloom', gain: 0.4, pitch: 0.85 },
      { t: T.label, name: 'blip', gain: 0.25, pitch: 1.0 },
    ].filter((c) => c.t < d);
  },
  drawWorld(ctx, v) {
    if (v.t < -0.1) return;
    // the pull-out covers ~23 e-folds of scale in ~3 s: anything changing size by more than ~10% a frame is
    // veiled behind the background (it would only smear into stacked rings) and only the anchors stay crisp:
    // the atom point, the hair strand and then the person.
    const spd = v.t > 0 ? zoomSpeed(v) : 0;
    const veil = 0.9 * L.smoothstep(clamp((spd - 0.05) / 0.09));
    const calm = 1 - L.smoothstep(clamp((spd - 0.015) / 0.05));   // thin outlines wait until the camera settles
    if (veil > 0.003) {
      ctx.save();
      ctx.globalAlpha = veil;
      drawBackground(ctx, v);
      ctx.restore();
      drawStreaks(ctx, v, veil);
    }
    drawPerson(ctx, v, personK(v), calm);
    drawStrand(ctx, v, veil);
    drawAtomPoint(ctx, v, v.t);
  },
  drawOverlay(ctx, v) {
    // (the "1.75 m" height bracket was dropped: one number, one line, beside the caption)
    powerLabel(ctx, { x: 100, y: 470, k: Math.min(v.k, prog(v.t, T.label, 0.55)), accent: v.accent, small: 'atoms in one human body' });
  },
};
