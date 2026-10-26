// Beat 7 (ep 21) — "Together, they outweigh all the wild birds and wild mammals on Earth, | combined."
// Area-honest squares in dry carbon mass (megatonnes of carbon): ants 12 (Schultheiss 2022), wild mammals ~7 (land ~3 +
// marine ~4; Greenspoon 2023), wild birds ~2 (Bar-On 2018). Side ∝ √mass, so AREA is the quantity. Ants grow first,
// then birds, then mammals; on "combined" the two grey squares slide together into ONE square of area 9, and a
// greater-than sign lands between 12 and 9.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { drawAnt } from '../ant.js';

const { W, ease, clamp, prog, lerp, rgba, mix } = L;
const MASS = { ants: 12, mammals: 7, birds: 2 };
const U = 88;                                          // px per √(Mt C): ant square = 305 px
const side = (m) => Math.sqrt(m) * U;
const BASE = 1218;                                     // squares stand on this line
const GAP = 96, GAP2 = 40;
const S = { a: side(12), m: side(7), b: side(2), c: side(9) };
const X0 = Math.round((W - (S.a + GAP + S.m + GAP2 + S.b)) / 2) - 24;   // nudged left: the WILD BIRDS label stays inside x ≤ 940
const POS = { a: X0, m: X0 + S.a + GAP, b: X0 + S.a + GAP + S.m + GAP2 };
const RIGHT = { x0: POS.m, x1: POS.b + S.b };
const POS_C = (RIGHT.x0 + RIGHT.x1) / 2 - S.c / 2;
const GREY = [138, 154, 176], GREY_B = [118, 136, 160];
// beat-relative timing (beat 36.52; "wild birds" ≈ +2.1 s, "wild mammals" ≈ +2.9 s, "combined." +4.86 s)
const T7 = { head: 0.2, ants: 0.35, birds: 2.05, mammals: 2.75, merge: 4.45, mergeD: 0.6, gt: 5.0 };

// ------------------------------------------------------------------ silhouettes (unit box, drawn into a square)
function elephant(ctx, x, y, s, col) {   // African elephant, side view facing left; (x, y) = feet line centre, s = height
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath();
  // back line → rump → tail
  ctx.moveTo(-0.62, -0.62);
  ctx.bezierCurveTo(-0.45, -1.0, 0.25, -1.02, 0.5, -0.78);   // back (high shoulders at left, sloping to rump)
  ctx.bezierCurveTo(0.62, -0.66, 0.64, -0.5, 0.6, -0.4);       // rump
  ctx.lineTo(0.66, -0.32); ctx.lineTo(0.63, -0.3); ctx.lineTo(0.57, -0.42);   // tail
  // hind leg
  ctx.lineTo(0.55, -0.2); ctx.lineTo(0.56, 0); ctx.lineTo(0.36, 0); ctx.lineTo(0.35, -0.3);
  // belly
  ctx.quadraticCurveTo(0.05, -0.36, -0.22, -0.32);
  // front leg
  ctx.lineTo(-0.24, 0); ctx.lineTo(-0.44, 0); ctx.lineTo(-0.47, -0.36);
  // chest → trunk
  ctx.quadraticCurveTo(-0.58, -0.42, -0.66, -0.4);
  ctx.quadraticCurveTo(-0.76, -0.25, -0.8, -0.04);   // trunk front edge down
  ctx.lineTo(-0.86, -0.02); ctx.lineTo(-0.84, -0.06);
  ctx.quadraticCurveTo(-0.84, -0.36, -0.9, -0.58);   // trunk back edge up to the face
  ctx.quadraticCurveTo(-0.9, -0.8, -0.72, -0.86);    // forehead
  ctx.quadraticCurveTo(-0.66, -0.78, -0.62, -0.62);
  ctx.closePath();
  ctx.fill();
  // far legs (darker), ear and tusk
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0.4, -0.3, 0.1, 0.3); ctx.fillRect(-0.36, -0.32, 0.08, 0.32);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.moveTo(-0.6, -0.84); ctx.quadraticCurveTo(-0.3, -0.86, -0.32, -0.6); ctx.quadraticCurveTo(-0.36, -0.42, -0.52, -0.46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(245,240,228,0.85)';
  ctx.beginPath(); ctx.moveTo(-0.74, -0.44); ctx.quadraticCurveTo(-0.84, -0.36, -0.94, -0.42); ctx.quadraticCurveTo(-0.84, -0.4, -0.76, -0.48); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function bird(ctx, x, y, s, col) {   // a soaring bird (raptor-like), wings spread, seen from below-side; centre (x, y)
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, -0.08);                                         // head
  ctx.quadraticCurveTo(0.05, -0.1, 0.06, -0.04);
  ctx.quadraticCurveTo(0.2, -0.1, 0.42, -0.2);                  // right wing leading edge
  ctx.lineTo(0.5, -0.17); ctx.lineTo(0.46, -0.12); ctx.lineTo(0.5, -0.1); ctx.lineTo(0.44, -0.06);   // primaries
  ctx.quadraticCurveTo(0.22, 0.0, 0.07, 0.04);                  // trailing edge
  ctx.lineTo(0.1, 0.18); ctx.lineTo(-0.1, 0.18); ctx.lineTo(-0.07, 0.04);   // tail
  ctx.quadraticCurveTo(-0.22, 0.0, -0.44, -0.06);
  ctx.lineTo(-0.5, -0.1); ctx.lineTo(-0.46, -0.12); ctx.lineTo(-0.5, -0.17); ctx.lineTo(-0.42, -0.2);
  ctx.quadraticCurveTo(-0.2, -0.1, -0.06, -0.04);
  ctx.quadraticCurveTo(-0.05, -0.1, 0, -0.08);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ one square with its label
function square(ctx, { x, s, k, col, num, name, icon, glow = 0, labelK = 1 }) {
  if (k <= 0) return;
  const e = ease.outBack(clamp(k), 1.2), sz = s * e;
  const y0 = BASE - sz;
  ctx.save();
  if (glow > 0) L.lightBlob(ctx, x + sz / 2, BASE - sz / 2, sz * 1.1, ACCENT, 0.35 * glow);
  // body
  const g = ctx.createLinearGradient(x, y0, x + sz, BASE);
  g.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.16))); g.addColorStop(1, rgba(mix(col, [0, 0, 0], 0.18)));
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  L.roundRect(ctx, x, y0, sz, sz, 6); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = rgba(mix(col, [255, 255, 255], 0.45), 0.6); ctx.lineWidth = 1.5;
  L.roundRect(ctx, x + 0.75, y0 + 0.75, sz - 1.5, sz - 1.5, 6); ctx.stroke();
  // icon inside
  ctx.save();
  L.roundRect(ctx, x, y0, sz, sz, 6); ctx.clip();
  icon?.(ctx, x, y0, sz);
  ctx.restore();
  // value inside, top-left
  const ka = clamp((k - 0.5) * 2) * labelK;
  if (ka > 0) {
    ctx.globalAlpha *= ka;
    ctx.textBaseline = 'alphabetic';
    const ns = L.fitSize(ctx, num, sz - 24, Math.min(92, sz * 0.42), 800, L.FONT.display, 24);
    ctx.font = L.font(ns, 800, L.FONT.display);
    ctx.fillStyle = 'rgba(12,10,8,0.88)';
    ctx.fillText(num, x + 14, y0 + 12 + ns * 0.74);
    if (sz > 180) {   // unit after the number
      const nw = ctx.measureText(num).width;
      ctx.font = L.font(Math.round(ns * 0.34), 700, L.FONT.body);
      ctx.fillStyle = 'rgba(12,10,8,0.7)';
      ctx.fillText('Mt C', x + 14 + nw + 8, y0 + 12 + ns * 0.74);
    }
    // name under the square, fitted to its column
    ctx.font = L.font(22, 700, L.FONT.body);
    const ts = L.fitSize(ctx, name, Math.max(s + 36, 150), 22, 700, L.FONT.body, 14);
    ctx.font = L.font(ts, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(232,236,244,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
    L.trackedText(ctx, name, x + s / 2, BASE + 40, 2.5, 'center');
  }
  ctx.restore();
}

const antIcon = (t) => (ctx, x, y0, sz) => drawAnt(ctx, { x: x + sz * 0.58, y: y0 + sz * 0.86, len: sz * 0.62, dir: -1, phase: t * 1.4, walk: 0.5, t, col: [70, 40, 14], detail: 0.6 });
const elephantIcon = (ctx, x, y0, sz) => elephant(ctx, x + sz * 0.6, y0 + sz * 0.9, sz * 0.5, 'rgba(40,50,66,0.55)');
const birdIcon = (ctx, x, y0, sz) => bird(ctx, x + sz * 0.6, y0 + sz * 0.62, sz * 0.62, 'rgba(40,50,66,0.55)');

export default {
  beat: 7,
  chapter: { num: '06', title: 'Biomass', sub: 'Dry carbon, megatonnes' },
  layer: 7,
  cues(d) {
    return [
      { t: T7.ants, name: 'bloom', gain: 0.28, pitch: 1.0 },
      { t: T7.birds, name: 'blip', gain: 0.22, pitch: 1.2 },
      { t: T7.mammals, name: 'blip', gain: 0.24, pitch: 0.9 },
      { t: T7.merge, name: 'swish', gain: 0.25, pitch: 1.0 },
      { t: T7.gt, name: 'impact', gain: 0.4, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {},
  drawOverlay(ctx, v) {
    const t = v.t, k = v.k * (1 - ease.inCubic(prog(t, v.d - 0.3, 0.25)));   // clear out before the dive
    if (t < 0 || k <= 0) return;
    ctx.save();
    ctx.globalAlpha *= k;
    // header: the unit, so the areas mean something
    const kh = ease.outCubic(prog(t, T7.head, 0.5));
    if (kh > 0) {
      ctx.save();
      ctx.globalAlpha *= kh;
      ctx.font = L.font(24, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(200,208,222,0.9)';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, 'MASS OF DRY CARBON  ·  MEGATONNES', W / 2, 850, 3, 'center');
      ctx.restore();
    }
    const m = ease.inOutCubic(prog(t, T7.merge, T7.mergeD));
    const kg = ease.outCubic(prog(t, T7.gt, 0.4));
    // ants
    square(ctx, { x: POS.a, s: S.a, k: prog(t, T7.ants, 0.6), col: ACCENT, num: '12', name: 'ANTS', icon: antIcon(v.gt), glow: kg * (0.6 + 0.4 * Math.sin(v.gt * 3)) });
    // birds + mammals: slide together and fade into one combined square (area 9)
    if (m < 1) {
      const lk = 1 - clamp(m * 3);
      ctx.save();
      ctx.globalAlpha *= 1 - ease.inCubic(clamp((m - 0.55) / 0.45));
      square(ctx, { x: lerp(POS.m, POS_C - 10, m), s: S.m, k: prog(t, T7.mammals, 0.6), col: GREY, num: '~7', name: 'WILD MAMMALS', icon: elephantIcon, labelK: lk });
      square(ctx, { x: lerp(POS.b, POS_C + S.c - S.b + 10, m), s: S.b, k: prog(t, T7.birds, 0.6), col: GREY_B, num: '~2', name: 'WILD BIRDS', icon: birdIcon, labelK: lk });
      ctx.restore();
    }
    if (m > 0.35) {
      const kc = clamp((m - 0.35) / 0.65);
      ctx.save();
      ctx.globalAlpha *= ease.outCubic(kc);
      square(ctx, {
        x: POS_C, s: S.c, k: 1, col: GREY, num: '~9', name: 'BIRDS + MAMMALS', labelK: kc,
        icon: (c, x, y0, sz) => { elephant(c, x + sz * 0.5, y0 + sz * 0.95, sz * 0.46, 'rgba(40,50,66,0.55)'); bird(c, x + sz * 0.8, y0 + sz * 0.45, sz * 0.24, 'rgba(40,50,66,0.55)'); },
      });
      ctx.restore();
    }
    // 12 > 9
    if (kg > 0) {
      const cx = (POS.a + S.a + POS_C) / 2, cy = BASE - S.c * 0.5;
      ctx.save();
      ctx.globalAlpha *= kg;
      ctx.translate(cx, cy);
      const sc = 0.6 + 0.4 * ease.outBack(kg, 2);
      ctx.scale(sc, sc);
      ctx.strokeStyle = rgba(ACCENT);
      ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = rgba(ACCENT, 0.7); ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(-18, -30); ctx.lineTo(18, 0); ctx.lineTo(-18, 30); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
};
