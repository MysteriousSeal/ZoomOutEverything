// Beat 9 — "Over millions of years, | seasons could go haywire."
// A geological time-lapse on the globe. It picks up s08's wobbling axis exactly where it left it (axis8 continued,
// drawn with s07's drawAxis) and lets it go further: the swings widen and a faster tremor joins in, while the accent
// wedge keeps recording every tilt visited. The new element is the ICE: polar caps that shrink when the tilt is large
// (hot polar summers), grow when it is small, and trade size between the hemispheres. A "million years" counter runs
// under the globe and a small readout rides the north tip of the axis. Everything clears on the beat-10 pull-out.
import * as L from '../../../../engine/runtime/lib.js';
import { globePx, SUN_LIGHT, setGlobeTilt, beatAt, GLOBE0 } from '../env.js';
import { drawAxis, axis7 } from './s07-tilt.js';
import { axis8 } from './s08-wobble.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const ICE = [236, 242, 252];
/** Beat-local timing (s). "Over millions of years" 0.15-1.56 · "seasons could go haywire" 2.16-3.74 ("haywire" ~3.1). */
const T = { in: 0.05, count: [0.25, 3.9], wild: [0.3, 2.9] };
const EXT = 1.34;   // axis length in Earth radii (s07's default)

/** Seconds into beat 8 for a beat-9-local time t (s08's swing, continued). */
const t8 = (v, t) => v.tl.scenes[9].start + t - v.tl.scenes[8].start;

/** Tilt (degrees) at beat-9 time t: s08's swing (~20..58°) continued, then widened with a faster tremor (~5..75°). */
export function tiltAt(v, t) {
  const base = axis8(v, t8(v, t)).tilt;
  const a = L.ease.inOutCubic(L.prog(t, T.wild[0], T.wild[1]));
  const tremor = Math.sin(Math.max(0, t - T.wild[0]) * 4.6 + 0.4) * 9 + Math.sin(Math.max(0, t - T.wild[0]) * 7.9) * 3;
  return 39 + (base - 39) * L.lerp(1, 1.45, a) + tremor * a;
}

// The REAL globe (env) rolls with the axis these beats draw, so the axis always runs through its true poles:
// beat 7 the steadied tilt, beat 8 the wobble, beat 9 the haywire swings, then back to rest on the beat-10 pull-out.
setGlobeTilt((v) => {
  const tl = v.tl, b = beatAt(tl, v.gt), t = v.gt - tl.scenes[b].start;
  if (b === 7) return axis7(v, t).tilt + (GLOBE0.tilt - 23.4) * (1 - L.prog(t, 0, 0.5));
  if (b === 8) return axis8(v, t).tilt;
  if (b === 9) return tiltAt(v, L.clamp(t, 0, tl.scenes[9].end - tl.scenes[9].start));
  if (b === 10) {
    const d9 = tl.scenes[9].end - tl.scenes[9].start;
    return L.lerp(tiltAt({ ...v, gt: tl.scenes[9].end }, d9), GLOBE0.tilt, L.ease.inOutCubic(L.prog(t, 0.2, 1.4)));
  }
  return null;
});

/** Wedge: everything visited in beat 8 plus beat 9 up to t (sampled; pure function of time). */
function sweptRange(v, t) {
  const w8 = axis8(v, v.tl.scenes[9].start - v.tl.scenes[8].start).wedge;
  let [lo, hi] = w8;
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const s = tiltAt(v, (t * i) / n);
    lo = Math.min(lo, s); hi = Math.max(hi, s);
  }
  return [lo, hi];
}

/**
 * Cap path for one pole: the globe's cap beyond a ragged snow line at angular radius ~`a`, the rim seen slightly
 * from the side. The edge wanders with L.noise1 (fixed per pole), so the cap reads as ice and snow, not a disc.
 */
function capPath(c, cx, cy, R, axisAng, pole, a) {
  const seed = pole > 0 ? 3 : 11, N = 36;
  c.save();
  c.translate(cx, cy);
  c.rotate(axisAng + (pole < 0 ? Math.PI : 0));
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI;
    const ends = Math.sin(th);   // keep the two ends on the limb
    const aa = a * (1 + ends * (0.1 * L.noise1(th * 3.1, seed) + 0.05 * L.noise1(th * 8.3, seed + 4)));
    const w = R * Math.sin(aa), d = R * Math.cos(aa);
    const x = w * Math.cos(th), y = -d + w * 0.22 * Math.sin(th);
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.lineTo(-R * 1.2, -R * 1.2);
  c.lineTo(R * 1.2, -R * 1.2);
  c.closePath();
  c.restore();
}

// Shading mask for the caps, in unit-disc space: the same Sun (SUN_LIGHT, screen space) and limb darkening as the
// globe (engine/runtime/earth.js), so the ice dims into the night side exactly like the planet under it and never
// shows past a dark limb. Screen-fixed light => one constant 256² mask, built lazily (deterministic).
let MASK = null;
function capShade() {
  if (MASK || typeof OffscreenCanvas === 'undefined') return MASK;
  const N = 256, oc = new OffscreenCanvas(N, N), o = oc.getContext('2d'), img = o.createImageData(N, N);
  const [lx, ly, lz] = SUN_LIGHT, ln = Math.hypot(lx, ly, lz);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const X = (i + 0.5) / N * 2 - 1, Y = 1 - (j + 0.5) / N * 2, rr = X * X + Y * Y;
      if (rr >= 1) continue;
      const Z = Math.sqrt(1 - rr), ndl = (X * lx + Y * ly + Z * lz) / ln;
      const d = L.clamp((ndl + 0.1) / 0.22), day = d * d * (3 - 2 * d);
      const limb = 0.72 + 0.28 * Math.sqrt(Z);
      const b = (day * (0.45 + 0.6 * Math.sqrt(Math.max(0, ndl))) + (1 - day) * 0.42) * limb;
      const q = (j * N + i) * 4;
      img.data[q] = 14; img.data[q + 1] = 22; img.data[q + 2] = 44;
      img.data[q + 3] = Math.round(255 * L.clamp(1 - b));
    }
  }
  o.putImageData(img, 0, 0);
  MASK = oc;
  return MASK;
}

function drawCap(c, cx, cy, R, axisAng, pole, a, k) {
  if (a <= 0.01 || k <= 0) return;
  const px = cx + Math.sin(axisAng) * R * pole, py = cy - Math.cos(axisAng) * R * pole;   // the pole on screen
  c.save();
  // strictly inside the planet's disc: the caps are ice ON the globe, never past its limb
  c.beginPath(); c.arc(cx, cy, Math.max(0, R - 1), 0, TAU); c.clip();
  c.globalAlpha *= k;
  // soft snow line: faint, ever-larger ragged rims under the main cap (no hard edge anywhere)
  for (const [s, al] of [[1.22, 0.04], [1.18, 0.05], [1.14, 0.06], [1.1, 0.07], [1.06, 0.08], [1.03, 0.09]]) {
    capPath(c, cx, cy, R, axisAng, pole, a * s);
    c.fillStyle = L.rgba(ICE, al);
    c.fill();
  }
  capPath(c, cx, cy, R, axisAng, pole, a);
  c.fillStyle = L.rgba(ICE, 0.86);
  c.fill();
  // shading over the whole cap (rims included): a touch brighter at the pole, then the globe's own day/night + limb
  capPath(c, cx, cy, R, axisAng, pole, a * 1.2);
  c.clip();
  L.lightBlob(c, px, py, R * Math.sin(a) * 1.2 + 6, [255, 255, 255], 0.18);
  const m = capShade();
  if (m) c.drawImage(m, cx - R, cy - R, 2 * R, 2 * R);
  c.restore();
}

/** Cap angular radii (rad) for tilt `deg` at time t: big caps for small tilt, small caps for large tilt, traded N/S. */
function caps(deg, t) {
  const base = L.lerp(25, 7, L.clamp((deg - 8) / 60)) * DEG;
  const trade = 0.34 * Math.sin(t * 2.6 - 0.6) * L.ease.inOutCubic(L.prog(t, 0.2, 1.6));
  return [base * (1 + trade), base * (1 - trade)];
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'Seasons', sub: 'over millions of years' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.18, name: 'riser', gain: 0.18, pitch: 0.7 },
      { t: T.count[0], name: 'count', gain: 0.2, pitch: 0.9 },
      { t: 1.55, name: 'swish', gain: 0.18, pitch: 0.8 },
      { t: 2.2, name: 'creak', gain: 0.22, pitch: 0.8 },
      { t: 3.05, name: 'swish', gain: 0.26, pitch: 0.7 },
      { t: 3.15, name: 'swell', gain: 0.22, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < -0.05 || v.t > v.d + 0.7) return;
    const t = L.clamp(v.t, 0, v.d);
    const out = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.05, 0.5));   // clears on the pull-out
    if (out <= 0) return;
    const { cx, cy, r } = globePx(v);
    if (r < 20) return;
    const deg = tiltAt(v, t), ang = deg * DEG;
    const [aN, aS] = caps(deg, t);
    // ice caps: they grow in from nothing at the beat start
    const ck = out * L.ease.outCubic(L.prog(v.t, 0.05, 0.7));
    drawCap(ctx, cx, cy, r, ang, 1, aN, ck);
    drawCap(ctx, cx, cy, r, ang, -1, aS, ck);
    // motion echo: ghost axes trailing the swing
    ctx.save();
    ctx.globalAlpha *= out;
    ctx.lineCap = 'round';
    const ext = r * EXT;
    for (let i = 6; i >= 1; i--) {
      const gd = tiltAt(v, Math.max(0, t - i * 0.06)) * DEG;
      const gx = Math.sin(gd), gy = -Math.cos(gd);
      ctx.strokeStyle = L.rgba(v.accent, 0.12 * (1 - i / 7) * L.prog(t, 0.3, 1));
      ctx.lineWidth = 2.4;
      for (const sg of [1, -1]) { ctx.beginPath(); ctx.moveTo(cx + sg * gx * r * 1.04, cy + sg * gy * r * 1.04); ctx.lineTo(cx + sg * gx * ext, cy + sg * gy * ext); ctx.stroke(); }
    }
    ctx.restore();
    // the axis itself, exactly as s07/s08 draw it, with the ever-wider envelope wedge
    drawAxis(ctx, v, { tilt: deg, k: out, grow: 1, ref: 1, arc: 1, wedge: sweptRange(v, t), wedgeK: 1, todayK: 1, ext: EXT });
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    const k = v.k;
    const { cx, cy, r } = globePx(v);
    // (no tilt readout: chaotic-tilt values are illustrative and are never shown as numbers)
    // the time-lapse counter under the globe
    const ck = k * L.enter(t, T.count[0] - 0.1, 0.5);
    if (ck <= 0) return;
    const my = L.ease.inOutCubic(L.prog(t, T.count[0], T.count[1])) * 10;   // 0 → 10 million years
    const y = Math.min(cy + r * 0.78 + 160, 1220);
    ctx.save();
    ctx.globalAlpha = ck;
    ctx.translate(0, (1 - L.ease.outCubic(L.clamp(ck))) * 16);
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 12;
    ctx.textBaseline = 'alphabetic';
    ctx.font = L.font(62, 700, L.FONT.din);
    const num = my.toFixed(1);
    const nw = ctx.measureText('10.0').width;
    ctx.font = L.font(25, 600, L.FONT.body);
    ctx.letterSpacing = '4px';
    const uw = ctx.measureText('MILLION YEARS').width;
    ctx.letterSpacing = '0px';
    const x0 = 940 - (nw + 18 + uw);   // lower right: clear of the south end of the axis (lower left)
    ctx.font = L.font(62, 700, L.FONT.din);
    ctx.fillStyle = L.rgba(v.accent);
    ctx.textAlign = 'right';
    ctx.fillText(num, x0 + nw, y);
    ctx.font = L.font(25, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(205,215,232,0.9)';
    L.trackedText(ctx, 'MILLION YEARS', x0 + nw + 18, y - 4, 4, 'left');
    // progress hairline
    ctx.shadowBlur = 0;
    const bw = nw + 18 + uw;
    ctx.fillStyle = 'rgba(205,215,232,0.2)';
    ctx.fillRect(x0, y + 18, bw, 2);
    ctx.fillStyle = L.rgba(v.accent, 0.9);
    ctx.fillRect(x0, y + 18, bw * (my / 10), 2);
    ctx.restore();
  },
};
