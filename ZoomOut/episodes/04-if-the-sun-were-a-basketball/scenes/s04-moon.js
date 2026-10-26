// Beat 4 — the Moon: a speck of dust, a hand's width from Earth (macro, 0.28 mm per pixel).
// The camera dives from the Earth ring down onto the plaza stone. Earth is a 2.2 mm blue bead, the Moon a 0.6 mm
// grey speck 6.6 cm away. The Moon's own little orbit sweeps open around Earth, then a real hand slides in under
// them, palm down: the four fingertips span exactly Earth to Moon. Everything is at true scale.
import * as L from '../../../../engine/runtime/lib.js';
import { pos, moonPos, MOON } from '../camera.js';
import { groundK, shadeSphere } from './s05-mars.js';
import { drawEarth as realEarth } from '../../../../engine/runtime/earth.js';

const { W, H } = L;
const E = pos('earth');
const M = moonPos();
const DIST = MOON.dist;
const UX = (M.x - E.x) / DIST, UY = (M.y - E.y) / DIST;      // Earth → Moon
const PX = -UY, PY = UX;                                    // perpendicular, toward the palm (down the screen)
const ROT = Math.atan2(UY, UX);
const MID = { x: (E.x + M.x) / 2, y: (E.y + M.y) / 2 };
const TIP_GAP = 0.005;                                      // the middle fingertip sits 5 mm below the Earth–Moon line

const T_EARTH = 0.55;     // "Moon?"
const T_MOON = 1.1;       // "a speck of dust"
const T_HAND = 1.85;      // "a hand's width"
const T_DIM = 2.3;        // "width from Earth"

const SKIN_LIT = [204, 156, 128], SKIN_MID = [140, 100, 82], SKIN_DARK = [70, 48, 40];
const RIM = [255, 196, 150];

/** 0..1: how "macro" the camera is (detail fades in only near the 0.28 mm/px close-up). */
const macroK = (v) => L.clamp(L.invLerp(Math.log(0.004), Math.log(0.0011), Math.log(v.cam.mpp)));

// ------------------------------------------------------------------ the plaza stone around Earth (world metres)
const GRAIN = (() => {
  const r = L.rng(4404), out = [];
  for (let i = 0; i < 900; i++) {
    out.push([E.x + (r() * 2 - 1) * 0.2, E.y + (r() * 2 - 1) * 0.36, 0.00012 + Math.pow(r(), 3) * 0.0011, r(), 0.25 + r() * 0.75]);
  }
  return out;
})();
const PEBBLES = (() => {
  const r = L.rng(4405);
  return Array.from({ length: 26 }, () => [E.x + (r() * 2 - 1) * 0.2, E.y + (r() * 2 - 1) * 0.36, 0.002 + r() * 0.005, r() * 3, 0.5 + r() * 0.5]);
})();

function drawStone(ctx, v, k) {
  const s = v.ws(1);
  ctx.save();
  ctx.globalAlpha *= k;
  // large, very soft mottling of the stone
  for (const [x, y, r, , a] of PEBBLES) {
    const sx = v.wx(x), sy = v.wy(y);
    if (sx < -200 || sx > W + 200 || sy < -200 || sy > H + 200) continue;
    ctx.fillStyle = `rgba(190,180,160,${0.025 * a})`;
    ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(0, r * s * 1.4), Math.max(0, r * s), r * 300, 0, Math.PI * 2); ctx.fill();
  }
  // fine grain: light quartz flecks and dark pits
  for (const [x, y, r, c, a] of GRAIN) {
    const sx = v.wx(x), sy = v.wy(y);
    if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
    ctx.fillStyle = c < 0.55 ? `rgba(0,0,0,${0.22 * a})` : `rgba(225,215,195,${0.07 * a})`;
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.5, r * s), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Earth + Moon at true size
function sunAng(v, x, y) { return Math.atan2(v.wy(0) - y, v.wx(0) - x); }

function drawEarth(ctx, v, k) {
  const x = v.wx(E.x), y = v.wy(E.y), r = v.ws(0.0011);
  if (r < 0.8) return;
  const la = sunAng(v, x, y);
  ctx.save();
  ctx.globalAlpha *= k;
  L.lightBlob(ctx, x, y, Math.max(0, r * 6 + 10), [70, 140, 255], 0.4);
  realEarth(ctx, { cx: x, cy: y, r, lon0: -20 + v.gt * 9, lat0: 18, style: 'day', sun: [Math.cos(la), -Math.sin(la), 0.45], atmosphere: 0.6 });
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  shadeSphere(ctx, x, y, r, la, { night: 0.35, sheen: 0.12 });
  ctx.restore();
}

function drawMoon(ctx, v, k) {
  const x = v.wx(M.x), y = v.wy(M.y), r = v.ws(MOON.diam / 2);
  if (r < 0.3) return;
  const la = sunAng(v, x, y);
  ctx.save();
  ctx.globalAlpha *= k;
  L.lightBlob(ctx, x, y, 12, [220, 225, 240], 0.32);
  ctx.fillStyle = '#c9cbd2';
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.9, r), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.arc(x - Math.cos(la) * r * 0.6, y - Math.sin(la) * r * 0.6, Math.max(0.6, r * 0.8), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// the Moon's little orbit around Earth, swept open from the Moon
function drawMoonOrbit(ctx, v, k) {
  const ko = L.ease.inOutCubic(L.prog(v.t, T_MOON, 1.1));
  if (ko <= 0) return;
  const x = v.wx(E.x), y = v.wy(E.y), rr = v.ws(DIST);
  const a = MOON.angle * Math.PI / 180;
  const n = Math.max(12, Math.round((2 * Math.PI * rr) / 10));     // a dot every ~10 px
  ctx.save();
  ctx.globalAlpha *= k * (1 - 0.7 * L.ease.inOutCubic(L.prog(v.t, T_DIM, 0.5)));   // recede while the guides draw
  ctx.fillStyle = L.rgba(L.mix([255, 225, 190], v.accent, 0.5), 0.5);
  ctx.beginPath();
  for (let i = 1; i < n / 2 * ko; i++) {
    for (const sgn of [-1, 1]) {
      const b = a + sgn * (i / n) * Math.PI * 2;
      const px = x + rr * Math.cos(b), py = y + rr * Math.sin(b);
      ctx.moveTo(px + 1.3, py); ctx.arc(px, py, 1.3, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ the hand (right hand, palm down; local metres)
// local frame: origin on the fingertip line under the Earth–Moon midpoint, +x toward the Moon, +y toward the wrist.
// [base centre x, tip y, base y, tip width, base width, splay]: the four fingertips span 6.6 cm, edge to edge,
// so the index finger's outer edge sits right under Earth and the little finger's under the Moon.
const FINGERS = [
  [-0.0243, 0.0068, 0.086, 0.0152, 0.0186, -0.015],   // index
  [-0.0078, 0.0, 0.089, 0.0164, 0.0194, -0.005],      // middle
  [0.0088, 0.0046, 0.088, 0.0154, 0.0184, 0.008],     // ring
  [0.0252, 0.0205, 0.084, 0.0134, 0.0164, 0.02],      // little
];
const THUMB = { bx: -0.04, by: 0.12, tx: -0.061, ty: 0.068, wt: 0.0195, wb: 0.025 };
// the hand is solid all the way down: the wrist leaves the frame edge (the mask only trims far off-screen)
const FADE_0 = 0.5, FADE_1 = 0.6;
const gauss = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));

/** finger outline in finger-local coords (base at the origin, tip at y = -len), with joint bulges. */
function fingerOutline(ctx, len, wt, wb, thumb = false) {
  const hw = (f) => (L.lerp(wb, wt, f) / 2) * (1 + (thumb ? 0.06 * gauss(f, 0.5, 0.12) : 0.045 * gauss(f, 0.45, 0.08) + 0.035 * gauss(f, 0.74, 0.06)));
  const fTop = 1 - (wt * 0.62) / len;
  const N = 10;
  ctx.moveTo(-hw(-0.15), 0.15 * len);
  for (let i = 0; i <= N; i++) { const f = -0.15 + (fTop + 0.15) * (i / N); ctx.lineTo(-hw(f), -f * len); }
  const h = hw(fTop), y0 = -fTop * len;
  ctx.bezierCurveTo(-h, y0 - wt * 0.42, -h * 0.55, -len, 0, -len);
  ctx.bezierCurveTo(h * 0.55, -len, h, y0 - wt * 0.42, h, y0);
  for (let i = N; i >= 0; i--) { const f = -0.15 + (fTop + 0.15) * (i / N); ctx.lineTo(hw(f), -f * len); }
  ctx.closePath();
}

// iterate fingers in their own frames
function eachFinger(ctx, fn) {
  for (const [cx, ty, by, wt, wb, sp] of FINGERS) {
    ctx.save(); ctx.translate(cx, by); ctx.rotate(sp); fn(by - ty, wt, wb, false); ctx.restore();
  }
}
function thumbFrame(ctx, fn) {
  const { bx, by, tx, ty, wt, wb } = THUMB;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.atan2(tx - bx, by - ty)); fn(Math.hypot(tx - bx, ty - by), wt, wb, true); ctx.restore();
}
/** build a finger/thumb outline into the current path, in hand-local coords (path points keep the frame). */
function fingerPath(ctx, i) {
  ctx.beginPath();
  if (i < 0) thumbFrame(ctx, (len, wt, wb) => fingerOutline(ctx, len, wt, wb, true));
  else {
    const [cx, ty, by, wt, wb, sp] = FINGERS[i];
    ctx.save(); ctx.translate(cx, by); ctx.rotate(sp); fingerOutline(ctx, by - ty, wt, wb); ctx.restore();
  }
}
/** back of the hand: from just above the knuckles (feathered in by its gradient) down to the wrist. */
function palmPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.034, 0.058);
  ctx.lineTo(0.033, 0.058);
  ctx.bezierCurveTo(0.036, 0.09, 0.04, 0.12, 0.037, 0.15);
  ctx.bezierCurveTo(0.035, 0.18, 0.032, 0.2, 0.031, 0.22);
  ctx.lineTo(0.03, 0.5);
  ctx.lineTo(-0.036, 0.5);
  ctx.lineTo(-0.037, 0.24);
  // thenar side: the palm swells out under the thumb root, then the web runs up to the index knuckle
  ctx.bezierCurveTo(-0.042, 0.2, -0.05, 0.165, -0.052, 0.135);
  ctx.bezierCurveTo(-0.053, 0.115, -0.046, 0.1, -0.04, 0.094);
  ctx.bezierCurveTo(-0.036, 0.085, -0.034, 0.07, -0.034, 0.058);
  ctx.closePath();
}

/** soft inner shadow along a closed path (current path is rebuilt by `build`), limited by an optional clip rect. */
function innerShade(ctx, build, color, width, blur, clipRect) {
  ctx.save();
  build(); ctx.clip();
  if (clipRect) { ctx.beginPath(); ctx.rect(...clipRect); ctx.clip(); }
  ctx.filter = `blur(${blur}px)`;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  build(); ctx.stroke();
  ctx.restore();
}

function fingerDetail(ctx, len, wt, wb, px, thumb) {
  // joint creases (on the back of the finger: soft horizontal wrinkles)
  ctx.strokeStyle = 'rgba(48,28,22,0.3)';
  ctx.lineWidth = 1.1 * px;
  ctx.lineCap = 'round';
  const joints = thumb ? [0.034] : [0.022, 0.047];
  for (const j of joints) {
    for (let i = 0; i < 3; i++) {
      const y = -len + j + (i - 1) * 0.0012, w = wt * (0.3 - Math.abs(i - 1) * 0.06);
      ctx.beginPath(); ctx.moveTo(-w, y + 0.0004); ctx.quadraticCurveTo(0, y - 0.001, w, y + 0.0004); ctx.stroke();
    }
  }
  // nail
  const nw = wt * (thumb ? 0.56 : 0.68), nx = thumb ? wt * 0.1 : 0;
  const n0 = -len + 0.0017, n1 = -len + (thumb ? 0.0155 : 0.0128);
  const ng = ctx.createLinearGradient(0, n0, 0, n1);
  ng.addColorStop(0, 'rgba(236,220,210,0.95)');
  ng.addColorStop(0.16, 'rgba(204,166,152,0.95)');
  ng.addColorStop(1, 'rgba(172,124,110,0.95)');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.moveTo(nx - nw / 2, n1);
  ctx.lineTo(nx - nw / 2, n0 + nw * 0.38);
  ctx.quadraticCurveTo(nx - nw / 2, n0, nx, n0);
  ctx.quadraticCurveTo(nx + nw / 2, n0, nx + nw / 2, n0 + nw * 0.38);
  ctx.lineTo(nx + nw / 2, n1);
  ctx.quadraticCurveTo(nx, n1 + 0.0016, nx - nw / 2, n1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,40,32,0.35)';
  ctx.lineWidth = 1 * px;
  ctx.stroke();
  // lunula-side cuticle shadow + gloss streak
  ctx.strokeStyle = 'rgba(255,246,236,0.4)';
  ctx.lineWidth = 2 * px;
  ctx.beginPath(); ctx.moveTo(nx - nw * 0.2, n0 + 0.0026); ctx.lineTo(nx - nw * 0.22, n1 - 0.0028); ctx.stroke();
}

function handPose(v) {
  const t = v.t;
  const kin = L.ease.outBack(L.prog(t, T_HAND, 1.0), 0.8);
  const kout = L.ease.inCubic(L.prog(t, v.d - 0.3, 0.5));
  const off = (1 - kin) * 0.065 + kout * 0.05 + L.noise1(v.gt * 0.7, 31) * 0.0005;
  const side = L.noise1(v.gt * 0.55, 32) * 0.0005;
  const rot = (1 - kin) * 0.04 + L.noise1(v.gt * 0.5, 33) * 0.005;
  return { x: MID.x + PX * (TIP_GAP + off) + UX * side, y: MID.y + PY * (TIP_GAP + off) + UY * side, rot, a: L.clamp(kin * 1.5) * (1 - kout) };
}

// scratch layer: the hand is composed opaque first (overlapping parts never show seams), then masked so the
// back of the hand and the wrist fade into darkness, then laid over the scene at the hand's alpha
let scratch = null;
function drawHand(ctx, v, k) {
  if (v.t < T_HAND) return;
  const p = handPose(v);
  const a = k * p.a * ctx.globalAlpha;
  if (a <= 0.003) return;
  scratch = scratch || new OffscreenCanvas(W, H);
  const sc = scratch.getContext('2d');
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.globalAlpha = 1;
  sc.globalCompositeOperation = 'source-over';
  sc.filter = 'none';
  sc.clearRect(0, 0, W, H);
  handBody(sc, v, p);
  // fade mask in hand-local coords: fingers and knuckles read, the rest dissolves before the caption band
  const s = v.ws(1);
  sc.save();
  sc.translate(v.wx(p.x), v.wy(p.y));
  sc.rotate(ROT + p.rot);
  sc.scale(s, s);
  sc.globalCompositeOperation = 'destination-in';
  const mg = sc.createLinearGradient(0, FADE_0, 0, FADE_1);
  mg.addColorStop(0, 'rgba(0,0,0,1)');
  mg.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  mg.addColorStop(1, 'rgba(0,0,0,0)');
  sc.fillStyle = mg;
  sc.fillRect(-1, -1, 2, 2);
  sc.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = a;
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}

function handBody(ctx, v, p) {
  const s = v.ws(1), px = 1 / s;
  ctx.save();
  ctx.translate(v.wx(p.x), v.wy(p.y));
  ctx.rotate(ROT + p.rot);
  ctx.scale(s, s);
  const parts = [-1, 0, 1, 2, 3];
  // contact shadow on the stone
  ctx.save();
  ctx.filter = `blur(${Math.round(0.004 * s)}px)`;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.translate(0.002, 0.005);
  for (const i of parts) { fingerPath(ctx, i); ctx.fill(); }
  palmPath(ctx); ctx.fill();
  ctx.restore();
  // one continuous skin gradient for every part (the light is beyond the fingertips)
  const g = ctx.createLinearGradient(0, -0.004, 0.012, 0.3);
  g.addColorStop(0, L.rgba(SKIN_LIT));
  g.addColorStop(0.3, L.rgba(L.mix(SKIN_LIT, SKIN_MID, 0.75)));
  g.addColorStop(1, L.rgba(SKIN_DARK));
  ctx.fillStyle = g;
  // thumb first (it lies lowest), then the fingers, then the back of the hand feathered over their roots
  const blur = Math.max(2, Math.round(0.0018 * s));
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = g;
    fingerPath(ctx, i); ctx.fill();
    innerShade(ctx, () => fingerPath(ctx, i), L.rgba(SKIN_DARK, 0.85), 0.0055, blur);
  }
  eachFinger(ctx, (len, wt, wb) => fingerDetail(ctx, len, wt, wb, px, false));
  const knuck = L.mix(SKIN_LIT, SKIN_MID, 0.72);
  const pg = ctx.createLinearGradient(0, 0.066, 0.01, 0.3);
  pg.addColorStop(0, L.rgba(knuck, 0));
  pg.addColorStop(0.13, L.rgba(knuck, 1));
  pg.addColorStop(1, L.rgba(SKIN_DARK));
  ctx.fillStyle = pg;
  palmPath(ctx); ctx.fill();
  // side shading on the back of the hand (open strokes along the two edges only, so the feathered top stays clean)
  ctx.save();
  palmPath(ctx); ctx.clip();
  ctx.filter = `blur(${blur * 2}px)`;
  ctx.strokeStyle = L.rgba(SKIN_DARK, 0.75);
  ctx.lineWidth = 0.01;
  ctx.beginPath();
  ctx.moveTo(0.035, 0.085); ctx.bezierCurveTo(0.04, 0.12, 0.037, 0.15, 0.035, 0.18); ctx.lineTo(0.031, 0.5);
  ctx.moveTo(-0.036, 0.085); ctx.bezierCurveTo(-0.042, 0.13, -0.041, 0.18, -0.038, 0.22); ctx.lineTo(-0.036, 0.5);
  ctx.stroke();
  ctx.restore();
  // the thumb lies over the side of the hand, its root sunk into the thenar swell
  ctx.save();
  ctx.fillStyle = g;
  fingerPath(ctx, -1); ctx.fill();
  innerShade(ctx, () => fingerPath(ctx, -1), L.rgba(SKIN_DARK, 0.85), 0.005, blur, [-0.1, -0.1, 0.2, 0.205]);
  thumbFrame(ctx, (len, wt, wb) => fingerDetail(ctx, len, wt, wb, px, true));
  // blend the root back into the palm
  const tg = ctx.createRadialGradient(THUMB.bx + 0.004, THUMB.by + 0.01, 0, THUMB.bx + 0.004, THUMB.by + 0.01, 0.026);
  const tc = L.mix(L.mix(SKIN_LIT, SKIN_MID, 0.72), SKIN_DARK, 0.25);
  tg.addColorStop(0, L.rgba(tc, 1)); tg.addColorStop(0.55, L.rgba(tc, 0.8)); tg.addColorStop(1, L.rgba(tc, 0));
  palmPath(ctx); ctx.clip();
  ctx.fillStyle = tg;
  ctx.fillRect(THUMB.bx - 0.03, THUMB.by - 0.02, 0.06, 0.06);
  ctx.restore();
  // knuckle sheen + extensor tendons fanning toward the wrist
  ctx.save();
  for (const [cx, , by] of FINGERS) {
    const kg = ctx.createRadialGradient(cx, by - 0.003, 0, cx, by - 0.003, 0.0085);
    kg.addColorStop(0, 'rgba(255,226,206,0.13)'); kg.addColorStop(1, 'rgba(255,226,206,0)');
    ctx.fillStyle = kg;
    ctx.fillRect(cx - 0.01, by - 0.013, 0.02, 0.02);
  }
  ctx.filter = `blur(${blur}px)`;
  ctx.strokeStyle = 'rgba(235,195,170,0.045)';
  ctx.lineWidth = 0.004;
  ctx.lineCap = 'round';
  for (const [cx, , by] of FINGERS) { ctx.beginPath(); ctx.moveTo(cx, by + 0.004); ctx.quadraticCurveTo(cx * 0.8, 0.15, cx * 0.35, 0.25); ctx.stroke(); }
  ctx.restore();
  // warm rim light where the Sun's glow catches the fingertips
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.rect(-0.08, -0.02, 0.16, 0.05); ctx.clip();
  const rg = ctx.createLinearGradient(0, -0.001, 0, 0.03);
  rg.addColorStop(0, L.rgba(RIM, 0.5)); rg.addColorStop(1, L.rgba(RIM, 0));
  ctx.strokeStyle = rg;
  ctx.lineWidth = 1.8 * px;
  for (let i = 0; i < 4; i++) { fingerPath(ctx, i); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

// ------------------------------------------------------------------ dust motes drifting in the foreground light
const MOTES = (() => { const r = L.rng(4406); return Array.from({ length: 7 }, () => ({ x: (r() * 2 - 1) * 0.06, y: (r() * 2 - 1) * 0.12, r: 18 + r() * 40, ph: r() * 10, a: 0.03 + r() * 0.04 })); })();
function drawMotes(ctx, v, k) {
  const s = v.ws(1);
  for (const m of MOTES) {
    const wx = E.x + m.x + L.noise1(v.gt * 0.15 + m.ph, 41) * 0.004, wy = E.y + m.y + L.noise1(v.gt * 0.12 + m.ph, 42) * 0.004;
    const sx = W / 2 + (wx - v.cam.x) * s * 1.35, sy = H * 0.47 + (wy - v.cam.y) * s * 1.35;
    if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;
    L.lightBlob(ctx, sx, sy, m.r, [255, 220, 180], m.a * k);
  }
}

// ------------------------------------------------------------------ overlay helpers
function reticle(ctx, x, y, r, k, accent) {
  if (k <= 0) return;
  const rr = r * L.ease.outBack(L.clamp(k), 2.0);
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 2);
  ctx.strokeStyle = L.rgba(accent, 0.95);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, rr), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function tag(ctx, txt, x, y, k, align) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= L.ease.outCubic(k);
  ctx.font = L.font(22, 700, L.FONT.body);
  ctx.fillStyle = 'rgba(232,236,244,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  ctx.textBaseline = 'middle';
  L.trackedText(ctx, txt, x + (align === 'left' ? -1 : 1) * (1 - L.ease.outCubic(k)) * -10, y, 4, align);
  ctx.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'The Moon', sub: '0.6 mm · 6.6 cm from Earth' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.05, name: 'whoosh', gain: 0.22, pitch: 0.85 },
      { t: T_EARTH, name: 'tick', gain: 0.2, pitch: 1.3 },
      { t: T_MOON, name: 'blip', gain: 0.24, pitch: 1.8 },
      { t: T_MOON + 0.05, name: 'shimmer', gain: 0.12, pitch: 1.4 },
      { t: T_HAND, name: 'swish', gain: 0.2, pitch: 0.7 },
      { t: T_DIM, name: 'ping', gain: 0.22, pitch: 1.5 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < -0.5) return;
    const k = macroK(v) * groundK(v);
    if (k <= 0) return;
    drawStone(ctx, v, k);
    drawMoonOrbit(ctx, v, k);
    drawEarth(ctx, v, k);
    drawMoon(ctx, v, k);
    drawHand(ctx, v, k);
    drawMotes(ctx, v, k);
  },
  drawOverlay(ctx, v) {
    const ex = v.wx(E.x), ey = v.wy(E.y), mx = v.wx(M.x), my = v.wy(M.y);
    ctx.globalAlpha = v.k;
    reticle(ctx, ex, ey, 20, L.prog(v.t, T_EARTH, 0.45), v.accent);
    tag(ctx, 'EARTH', ex - 34, ey, L.prog(v.t, T_EARTH + 0.1, 0.5), 'right');
    reticle(ctx, mx, my, 13, L.prog(v.t, T_MOON, 0.45), v.accent);
    tag(ctx, 'MOON', mx + 28, my, L.prog(v.t, T_MOON + 0.1, 0.5), 'left');
    // the 6.6 cm radius: Earth reticle → Moon reticle, with end bars
    const kd = L.ease.inOutCubic(L.prog(v.t, T_DIM, 0.6));
    if (kd > 0) {
      const len = Math.hypot(mx - ex, my - ey), ux = (mx - ex) / len, uy = (my - ey) / len;
      const ax = ex + ux * 26, ay = ey + uy * 26, bx = mx - ux * 19, by = my - uy * 19;
      const cx = L.lerp(ax, bx, kd), cy = L.lerp(ay, by, kd);
      ctx.save();
      ctx.strokeStyle = L.rgba(v.accent, 0.95);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(cx, cy); ctx.stroke();
      for (const [px, py, on] of [[ax, ay, 1], [bx, by, kd >= 1 ? 1 : 0]]) {
        if (!on) continue;
        ctx.beginPath(); ctx.moveTo(px - uy * 8, py + ux * 8); ctx.lineTo(px + uy * 8, py - ux * 8); ctx.stroke();
      }
      ctx.restore();
      // extension guides: Earth and the Moon dropped onto the outer edges of the index and little fingers
      const kg = L.ease.outCubic(L.prog(v.t, T_DIM + 0.25, 0.6));
      if (kg > 0) {
        ctx.save();
        ctx.strokeStyle = L.rgba(v.accent, 0.7);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        for (const [x0, y0, r0] of [[ex, ey, 24], [mx, my, 17]]) {
          ctx.beginPath();
          ctx.moveTo(x0 + PX * r0, y0 + PY * r0);
          ctx.lineTo(x0 + PX * (r0 + 120 * kg), y0 + PY * (r0 + 120 * kg));
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    const k = Math.min(v.k, L.prog(v.t, T_DIM, 0.55));
    L.bigLabel(ctx, { x: 80, y: 480, big: '6.6 cm', small: '2.6 in · Earth to Moon', k, accent: v.accent });
  },
};
