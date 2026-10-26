// Beat 0 — the hook: "Could every human on Earth fit in one place?"
// One person seen from directly above, standing on a glowing 1 × 1 m tile at the origin (true scale, ~250 px/m).
// Idle life: breathing, a slow head turn, a soft body sway. The tile's rim glows, a light sweep crosses it.
// A masked two-line headline rises above: COULD EVERY HUMAN / FIT IN ONE PLACE? ("FIT" in coral).
// Exports the top-down person + tile renderers so s01 (tiles multiplying) and s03 (density lens) reuse them,
// and keeps drawing the hero tile + person (the coral "you") through the carpet until it becomes sub-pixel.
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, lerp, prog, rgba, mix } = L;

export const CORAL = [255, 130, 110];
export const TILE = [74, 46, 46];          // tile face
export const TILE_EDGE = [150, 92, 84];    // tile rim (non-hero)
export const SKIN = [214, 160, 128];
// crowd palettes (shirts, hair): warm, muted, never clip-art bright
export const SHIRTS = [[206, 128, 108], [226, 170, 140], [176, 104, 96], [236, 196, 160], [190, 140, 120], [214, 112, 98]];
export const HAIRS = [[38, 26, 24], [66, 42, 32], [96, 62, 44], [28, 22, 22], [120, 84, 58]];

/** Integer hash → [0, 1). Deterministic per tile. */
export function hash2(i, j, s = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ the person, seen from above (facing −y)
const ell = (ctx, x, y, rx, ry, rot = 0) => { ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2); };

/** Direction of the cast shadows on the floor (screen radians; the light is low in the upper left). */
const SHADOW_DIR = 0.42;
/**
 * The long shadow a standing person casts on the floor: a front-view silhouette (legs, hips, torso, hanging arms,
 * neck, head) stretched along SHADOW_DIR. It is what makes a figure seen from straight above read as a person.
 * Drawn in metres; len = shadow length of the whole 1.75 m body.
 */
let SHCV = null;
function castShadow(ctx, s, len, a, sway = 0) {
  const k = len / 1.75;
  // the silhouette is drawn opaque into a scratch canvas (overlapping limbs merge into one solid shape), then laid
  // on the floor once with the shadow's alpha
  const R = Math.ceil((len + 0.35) * s) + 8;
  if (R > 900) return;
  if (!SHCV) SHCV = new OffscreenCanvas(2 * 900, 2 * 900);
  const g = SHCV.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 2 * R + 2, 2 * R + 2);
  // carry the caller's transform (translation + scale s) over, re-centred on the scratch canvas
  g.translate(R, R);
  g.scale(s, s);
  g.rotate(SHADOW_DIR);
  g.fillStyle = '#000';
  const rr = (u0, u1, w0, w1) => {
    const r = Math.min(Math.abs(w1 - w0), Math.abs(u1 - u0) * k) * 0.45;
    g.beginPath(); g.roundRect(u0 * k, w0, (u1 - u0) * k, w1 - w0, r); g.fill();
  };
  const el = (u, w, ru, rw) => { g.beginPath(); g.ellipse(u, w, Math.max(0, ru), Math.max(0, rw), 0, 0, Math.PI * 2); g.fill(); };
  rr(0.0, 0.88, -0.12, 0.12);              // legs (one solid stance, a slim gap drawn below)
  el(0.02 * k, 0.085, 0.05, 0.06); el(0.02 * k, -0.085, 0.05, 0.06);   // shoes
  rr(0.8, 1.47, -0.18, 0.18);              // hips + torso
  rr(0.76, 1.44, 0.165, 0.25);             // hanging arms
  rr(0.76, 1.44, -0.25, -0.165);
  el(0.75 * k, 0.215, 0.05, 0.045); el(0.75 * k, -0.215, 0.05, 0.045);  // hands
  rr(1.4, 1.56, -0.055, 0.055);            // neck
  el((1.645 + sway * 0.01) * k, sway * 0.012, 0.115 * k, 0.088);         // head
  g.globalCompositeOperation = 'destination-out';
  g.fillRect(0.12 * k, -0.012, 0.66 * k, 0.024);                       // between the legs
  g.globalCompositeOperation = 'source-over';
  // lay it on the floor in screen pixels (undo the caller's scale)
  ctx.save();
  ctx.scale(1 / s, 1 / s);
  ctx.globalAlpha *= a * 0.42;
  if (s > 40) ctx.filter = `blur(${Math.min(4, 0.008 * s).toFixed(1)}px)`;
  ctx.drawImage(SHCV, 0, 0, 2 * R, 2 * R, -R, -R, 2 * R, 2 * R);
  ctx.restore();
}

/**
 * A standing person on the floor at screen (x, y) (the middle of their square metre), seen from a high 3/4 view:
 * feet, legs, torso, hanging arms, head, all upright, with a long shadow cast on the floor. s = px per metre.
 * rot = a little body turn/sway (radians, for variety). o: shirt, hair, a (alpha), breathe (−1..1), head (head
 * turn), shadow (bool), cast (shadow length, m), lean [dx, dy] metres, pants.
 * The figure spans ≈ 0.9 m of screen height: feet 0.37 m below (x, y), crown 0.53 m above, inside a 1 m tile.
 */
export function drawPerson(ctx, x, y, s, rot, o = {}) {
  const a = o.a ?? 1;
  if (a <= 0.003 || s < 2) return;
  const shirt = o.shirt ?? CORAL, hair = o.hair ?? HAIRS[0];
  const pants = o.pants ?? [58, 50, 62];
  const br = 1 + (o.breathe ?? 0) * 0.02;
  const lean = o.lean ?? [0, 0];
  const turn = clamp(rot, -0.6, 0.6);            // body turn: shifts the far shoulder and the face a touch
  const hd = (o.head ?? 0);
  const FEET = 0.4, FIG = 0.92;   // the figure fits inside its 1 m tile (feet 0.4 m below the centre, crown 0.45 above)
  ctx.save();
  ctx.translate(x + lean[0] * s, y + lean[1] * s);
  ctx.scale(s, s);
  ctx.globalAlpha *= a;
  const dk = (c, k) => rgba(mix(c, [16, 8, 10], k));
  const lt = (c, k) => rgba(mix(c, [255, 240, 230], k));
  ctx.translate(0, FEET);                         // origin at the feet
  // shadows on the floor: the long cast shadow (light low in the upper left), then a soft contact pool
  if (o.shadow !== false) {
    if ((o.cast ?? 0.6) > 0 && s > 12) castShadow(ctx, s, o.cast ?? 0.6, clamp((s - 12) / 20), hd);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ell(ctx, 0.03, 0.01, 0.19, 0.06); ctx.fill();
  }
  ctx.scale(FIG, FIG);
  if (s < 30) {
    // far away: a simple upright pictogram
    ctx.fillStyle = rgba(pants);
    ctx.fillRect(-0.085, -0.4, 0.17, 0.4);
    ctx.fillStyle = rgba(shirt);
    L.roundRect(ctx, -0.15 * br, -0.74, 0.3 * br, 0.38, 0.07); ctx.fill();
    ctx.fillStyle = rgba(SKIN);
    ctx.beginPath(); ell(ctx, 0, -0.83, 0.075, 0.085); ctx.fill();
    ctx.fillStyle = rgba(hair);
    ctx.beginPath(); ell(ctx, 0, -0.865, 0.078, 0.06); ctx.fill();
    ctx.restore();
    return;
  }
  const ink = 'rgba(20,10,12,0.55)', lw = 0.008;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  // legs + shoes
  for (const sd of [-1, 1]) {
    const lx = sd * 0.055;
    const g = ctx.createLinearGradient(lx - 0.05, 0, lx + 0.05, 0);
    g.addColorStop(0, lt(pants, sd < 0 ? 0.14 : 0.04));
    g.addColorStop(1, dk(pants, sd < 0 ? 0.1 : 0.32));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lx - 0.05 * sd * 0 - 0.052, -0.42);
    ctx.lineTo(lx + 0.052, -0.42);
    ctx.lineTo(lx + 0.04, -0.03);
    ctx.lineTo(lx - 0.04, -0.03);
    ctx.closePath();
    ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
    ctx.fillStyle = 'rgb(40,32,34)';
    ctx.beginPath(); ell(ctx, lx + sd * 0.008, -0.018, 0.052, 0.028); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,230,0.18)';
    ctx.beginPath(); ell(ctx, lx + sd * 0.004, -0.03, 0.03, 0.01); ctx.fill();
  }
  // torso: shoulders → waist, lit from the upper left
  const sh = 0.165 * br, wa = 0.12;
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(-wa, -0.4);
    ctx.lineTo(-sh + 0.012, -0.64);
    ctx.quadraticCurveTo(-sh, -0.71, -sh + 0.05, -0.715);
    ctx.lineTo(sh - 0.05, -0.715);
    ctx.quadraticCurveTo(sh, -0.71, sh - 0.012, -0.64);
    ctx.lineTo(wa, -0.4);
    ctx.quadraticCurveTo(0, -0.385, -wa, -0.4);
    ctx.closePath();
  };
  torso();
  const tg = ctx.createLinearGradient(-0.17, -0.72, 0.17, -0.4);
  tg.addColorStop(0, lt(shirt, 0.22));
  tg.addColorStop(0.55, rgba(shirt));
  tg.addColorStop(1, dk(shirt, 0.3));
  ctx.fillStyle = tg;
  ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
  // collar
  ctx.fillStyle = rgba(mix(SKIN, [40, 20, 20], 0.15));
  ctx.beginPath(); ctx.moveTo(-0.04, -0.715); ctx.quadraticCurveTo(0, -0.66, 0.04, -0.715); ctx.closePath(); ctx.fill();
  // arms hanging at the sides (sleeve, forearm, hand)
  for (const sd of [-1, 1]) {
    const ax = sd * (sh + 0.012 + turn * 0.01 * sd);
    ctx.fillStyle = sd < 0 ? lt(shirt, 0.08) : dk(shirt, 0.22);
    ctx.beginPath();
    ctx.moveTo(ax - sd * 0.03, -0.70);
    ctx.quadraticCurveTo(ax + sd * 0.035, -0.69, ax + sd * 0.04, -0.6);
    ctx.lineTo(ax + sd * 0.036, -0.56);
    ctx.lineTo(ax - sd * 0.022, -0.56);
    ctx.closePath();
    ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
    ctx.fillStyle = sd < 0 ? rgba(SKIN) : rgba(mix(SKIN, [40, 18, 18], 0.22));
    ctx.beginPath();
    ctx.moveTo(ax - sd * 0.016, -0.565);
    ctx.lineTo(ax + sd * 0.032, -0.565);
    ctx.lineTo(ax + sd * 0.03, -0.43);
    ctx.lineTo(ax - sd * 0.006, -0.43);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ell(ctx, ax + sd * 0.012, -0.405, 0.028, 0.034); ctx.fill();
  }
  // neck + head (the face turns a little with `head`)
  ctx.fillStyle = rgba(mix(SKIN, [40, 18, 18], 0.18));
  ctx.fillRect(-0.03, -0.77, 0.06, 0.07);
  const hx = hd * 0.03 + turn * 0.01;
  const fg = ctx.createLinearGradient(-0.08, -0.9, 0.08, -0.74);
  fg.addColorStop(0, lt(SKIN, 0.16));
  fg.addColorStop(1, rgba(mix(SKIN, [40, 18, 18], 0.2)));
  ctx.fillStyle = fg;
  ctx.beginPath(); ell(ctx, hx * 0.4, -0.82, 0.068, 0.082); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
  // ears
  ctx.fillStyle = rgba(mix(SKIN, [40, 18, 18], 0.12));
  ctx.beginPath(); ell(ctx, hx * 0.4 - 0.068, -0.815, 0.013, 0.022); ell(ctx, hx * 0.4 + 0.068, -0.815, 0.013, 0.022); ctx.fill();
  // hair: a cap over the crown (seen a little from above, so it covers the top of the head)
  const hg = ctx.createLinearGradient(-0.06, -0.92, 0.06, -0.8);
  hg.addColorStop(0, rgba(mix(hair, [255, 232, 214], 0.3)));
  hg.addColorStop(1, rgba(mix(hair, [0, 0, 0], 0.25)));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(hx * 0.4, -0.836, 0.072, 0.074, 0, Math.PI * 0.98, Math.PI * 2.02);
  ctx.quadraticCurveTo(hx * 0.4 + 0.03 + hx, -0.83, hx * 0.4 - 0.02 + hx, -0.845);
  ctx.quadraticCurveTo(hx * 0.4 - 0.05, -0.84, hx * 0.4 - 0.072, -0.83);
  ctx.closePath();
  ctx.fill();
  if (s > 60) {
    // eyes: two small dark marks, so the head reads as a face at a glance
    ctx.fillStyle = 'rgba(30,16,16,0.7)';
    ctx.beginPath(); ell(ctx, hx - 0.024, -0.81, 0.007, 0.009); ell(ctx, hx + 0.024, -0.81, 0.007, 0.009); ctx.fill();
  }
  ctx.restore();
}

/** A 1 m tile centred at world (cx, cy). o: a, rim (0..1 glow), face colour, edge colour, pop scale. */
export function drawTile(ctx, v, cx, cy, o = {}) {
  const s = 1 / v.cam.mpp, sc = o.scale ?? 1;
  const a = o.a ?? 1;
  if (a <= 0.003) return;
  const half = 0.47 * sc;
  const x = v.wx(cx - half), y = v.wy(cy - half), w = 2 * half * s;
  ctx.save();
  ctx.globalAlpha *= a;
  L.roundRect(ctx, x, y, w, w, Math.max(1, 0.05 * s * sc));
  if (s > 30) {
    const g = ctx.createLinearGradient(x, y, x + w, y + w);
    g.addColorStop(0, rgba(mix(o.face ?? TILE, [255, 220, 210], 0.1)));
    g.addColorStop(1, rgba(mix(o.face ?? TILE, [0, 0, 0], 0.2)));
    ctx.fillStyle = g;
  } else ctx.fillStyle = rgba(o.face ?? TILE);
  ctx.fill();
  const rim = o.rim ?? 0;
  if (s > 8) {
    ctx.strokeStyle = rgba(mix(o.edge ?? TILE_EDGE, CORAL, rim), 0.55 + 0.45 * rim);
    ctx.lineWidth = Math.max(1, Math.min(3, s * 0.008));
    if (rim > 0.05 && s > 20) { ctx.shadowColor = rgba(CORAL, 0.9 * rim); ctx.shadowBlur = Math.min(40, s * 0.12) * rim; }
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ hero animation (pure function of global time)
/** Hero idle pose at global time gt. */
export function heroPose(gt) {
  return {
    breathe: Math.sin(gt * 2 * Math.PI / 3.6),
    head: 0.22 * L.noise1(gt * 0.45, 11) + 0.1 * Math.sin(gt * 0.9),
    rot: 0.035 * L.noise1(gt * 0.3, 12),
    lean: [0.008 * L.noise1(gt * 0.5, 13), 0.006 * L.noise1(gt * 0.4, 14)],
  };
}

/** Hero tile rim glow at gt (lights up at the start, pulses gently, then settles into the carpet). */
export function heroRim(gt) {
  const on = ease.outCubic(prog(gt, 0.15, 0.7));
  return on * (0.75 + 0.25 * Math.sin(gt * 2.4));
}

function drawHero(ctx, v) {
  const gt = v.gt, s = 1 / v.cam.mpp;
  if (s < 1.2) return;
  const ox = v.wx(0), oy = v.wy(0);
  if (ox < -200 || ox > W + 200 || oy < -200 || oy > L.H + 200) return;
  // floor bloom under the tile (big when close, a soft coral spark when the carpet is far away)
  const near = clamp(L.invLerp(8, 60, s));
  const intro = ease.outCubic(prog(gt, 0.05, 1.0));
  L.lightBlob(ctx, ox, oy, Math.max(30, 1.5 * s), CORAL, (0.16 + 0.08 * Math.sin(gt * 2.4)) * intro * lerp(0.6, 1, near));
  const pop = ease.outBack(prog(gt, 0.0, 0.6), 1.4);
  drawTile(ctx, v, 0, 0, { rim: heroRim(gt), face: [70, 40, 42], edge: CORAL, scale: lerp(0.9, 1, pop), a: clamp(pop * 1.6) });
  // corner crop-marks: a precise "1 m" frame just outside the tile, beat 0 only
  const ck = ease.outCubic(prog(gt, 0.5, 0.6)) * (1 - ease.inCubic(prog(gt, 3.6, 0.5)));
  if (ck > 0 && s > 60) {
    ctx.save();
    ctx.strokeStyle = rgba([255, 225, 215], 0.55 * ck);
    ctx.lineWidth = 2;
    const e = 0.56, len = 0.09 * ck;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const cx = v.wx(sx * e), cy = v.wy(sy * e);
      ctx.moveTo(cx, cy - sy * len * s); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * len * s, cy);
    }
    ctx.stroke();
    ctx.restore();
  }
  // a quiet "1 m" dimension under the tile: it draws out from the centre, sets up "one square metre"
  const dk = ease.outCubic(prog(gt, 1.0, 0.7)) * (1 - ease.inCubic(prog(gt, 3.55, 0.4)));
  if (dk > 0 && s > 60) {
    const y = v.wy(0.47) + 54, xa = v.wx(-0.47), xb = v.wx(0.47), w = (xb - xa) / 2 * dk;
    ctx.save();
    ctx.strokeStyle = 'rgba(240,228,225,0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ox - w, y - 14); ctx.lineTo(ox - w, y); ctx.lineTo(ox + w, y); ctx.lineTo(ox + w, y - 14);
    ctx.stroke();
    ctx.globalAlpha *= clamp(dk * 2 - 1);
    ctx.font = L.font(36, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(240,228,225,0.9)';
    ctx.textBaseline = 'top';
    L.trackedText(ctx, '1 m', ox, y + 16, 2, 'center');
    ctx.restore();
  }
  // a light sweep across the tile face
  const sw = prog(gt, 1.0, 1.1);
  if (sw > 0 && sw < 1 && s > 40) {
    ctx.save();
    const half = 0.47 * s;
    L.roundRect(ctx, ox - half, oy - half, 2 * half, 2 * half, 0.05 * s);
    ctx.clip();
    const u = lerp(-1.4, 1.4, ease.inOutCubic(sw)) * s;
    const g = ctx.createLinearGradient(ox + u - 0.35 * s, oy - 0.35 * s, ox + u + 0.35 * s, oy + 0.35 * s);
    const al = 0.2 * Math.sin(Math.PI * sw);
    g.addColorStop(0, 'rgba(255,220,210,0)');
    g.addColorStop(0.5, `rgba(255,220,210,${al})`);
    g.addColorStop(1, 'rgba(255,220,210,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(ox - half, oy - half, 2 * half, 2 * half);
    ctx.restore();
  }
  const p = heroPose(gt);
  const pin = ease.outCubic(prog(gt, 0.15, 0.55));
  drawPerson(ctx, ox, oy, s * lerp(0.94, 1, pin), p.rot, {
    shirt: CORAL, hair: HAIRS[0], a: clamp(pin * 1.5) * clamp(L.invLerp(1.2, 3, s)), breathe: p.breathe, head: p.head, lean: p.lean,
  });
}

// ------------------------------------------------------------------ headline
const LINES = [
  { words: [['COULD EVERY HUMAN', false]], y: 470, t0: 0.3 },
  { words: [['FIT', true], [' IN ONE PLACE?', false]], y: 618, t0: 0.58 },
];
const HEAD_SIZE = 128;

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 2,
  cues(d) {
    return [
      { t: 0.12, name: 'bloom', gain: 0.32, pitch: 0.9 },
      { t: 0.3, name: 'swish', gain: 0.2, pitch: 1.0 },
      { t: 0.58, name: 'swish', gain: 0.18, pitch: 1.15 },
      { t: 0.95, name: 'ping', gain: 0.22, pitch: 1.2 },
      { t: 1.05, name: 'shimmer', gain: 0.14, pitch: 1.0 },
      { t: d - 0.3, name: 'swish', gain: 0.16, pitch: 0.8 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt > v.tl.scenes[2].end) return;
    drawHero(ctx, v);
  },
  drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    ctx.save();
    ctx.font = L.font(HEAD_SIZE, 800, L.FONT.display);
    const size = L.fitSize(ctx, 'COULD EVERY HUMAN', 880, HEAD_SIZE, 800, L.FONT.display);
    // a soft dark plate behind the headline: keeps it crisp over the floor glow
    const pk = ease.outCubic(prog(t, 0.1, 0.6)) * (1 - ease.inCubic(prog(t, d - 0.3, 0.3)));
    if (pk > 0) {
      const g = ctx.createRadialGradient(W / 2, 545, 40, W / 2, 545, 560);
      g.addColorStop(0, `rgba(8,5,7,${0.5 * pk})`);
      g.addColorStop(1, 'rgba(8,5,7,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 545 - 560, W, 2 * 560);   // the full radius: no hard edge where the rect would end
    }
    // accent rule draws in above the headline
    const rk = L.enter(t, 0.15, 0.6, ease.outExpo) * (1 - L.enter(t, d - 0.32, 0.28, ease.inCubic));
    if (rk > 0) {
      ctx.fillStyle = rgba(v.accent, 0.95);
      ctx.fillRect(W / 2 - 70 * rk, 330, 140 * rk, 5);
    }
    LINES.forEach((ln, i) => {
      const kin = L.enter(t, ln.t0, 0.65, ease.outExpo);
      const kout = L.enter(t, d - 0.34 + i * 0.05, 0.3, ease.inCubic);
      if (kin <= 0 || kout >= 1) return;
      ctx.save();
      ctx.font = L.font(size, 800, L.FONT.display);
      ctx.letterSpacing = '-1px';
      const widths = ln.words.map(([w]) => ctx.measureText(w).width);
      ctx.letterSpacing = '0px';
      const total = widths.reduce((s, w) => s + w, 0);
      const top = ln.y - size * 0.82, bot = ln.y + size * 0.14;
      ctx.beginPath(); ctx.rect(0, top - 8, W, bot - top + 18); ctx.clip();
      const dy = (1 - kin) * size * 1.05 - kout * size * 1.1;
      let x = W / 2 - total / 2;
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 18;
      ln.words.forEach(([w, acc], j) => {
        ctx.fillStyle = acc ? rgba(v.accent) : rgba([250, 240, 236]);
        L.trackedText(ctx, w, x, ln.y + dy, -1, 'left');
        if (acc) {
          // a coral underline wipes in under FIT
          const uk = L.enter(t, ln.t0 + 0.35, 0.5, ease.outExpo) * (1 - kout);
          ctx.shadowBlur = 0;
          ctx.fillRect(x + 4, ln.y + dy + 14, (widths[j] - 10) * uk, 7);
          ctx.shadowBlur = 18;
        }
        x += widths[j];
      });
      ctx.restore();
    });
    ctx.restore();
  },
};
