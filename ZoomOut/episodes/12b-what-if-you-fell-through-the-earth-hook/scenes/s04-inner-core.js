// Beat 4 — the inner core. The faller crosses the inner-core boundary (ICB) at 18.55 s: the boundary rings with
// light. Inside, the solid iron ball glows white-hot with soft, slowly churning mottling. On "hot" a dark plate lands right of
// the faller: "≈ 5,200 °C" / "9,400 °F", then a small Sun chip "AS HOT AS THE SUN'S SURFACE" on "the Sun".
// Exports the plate + crossing-time helpers used by s05-s08.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, RADIUS, fallerDepth, OFF } from '../camera.js';

const { W, H } = L;
export const HOT = [255, 236, 200];
const ICB_IN = 18.55 + OFF;          // global: the faller enters the inner core (camera.js waypoint)
const LAND = 1.35;             // beat-local: "≈ 5,200 °C" lands just before "hot"
const SUN_LINE = 2.3;          // "...surface of the Sun"

/** Global time at which the faller crosses depth `d` between gt a and b (bisection; pure, cached by the caller). */
export function crossTime(d, a, b) {
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (fallerDepth(m) < d) a = m; else b = m; }
  return (a + b) / 2;
}

/** 12b f12a: group opacity. Draws `fn` at full strength into an offscreen layer and composites it at alpha `a`, so a
 *  fading card (plate, glow, text) fades as ONE image: no translucent plate with a lingering bright dial, no pill left
 *  behind by its text. a >= 1 draws straight. */
let GROUP = null;
export function group(ctx, a, fn) {
  if (a <= 0.002) return;
  if (a >= 0.998 || typeof OffscreenCanvas === 'undefined') { ctx.save(); fn(ctx); ctx.restore(); return; }
  GROUP ??= new OffscreenCanvas(W, H);
  const g = GROUP.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0;
  g.clearRect(0, 0, W, H);
  g.setTransform(ctx.getTransform());
  g.save(); fn(g); g.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= a;
  ctx.drawImage(GROUP, 0, 0);
  ctx.restore();
}
/** Beat-local time quantised to the OUTPUT frame (motion-blur sub-frames share it), for entrances that must be fully
 *  on from their first visible frame. */
export const qT = (v) => Math.round(v.gt * 30) / 30 - (v.gt - v.t);
/** Card lifecycle: 0 before `start` (output-frame gated), then entrance progress 0..1 over `dur` (scale/lift only). */
export const cardIn = (v, start, dur = 0.45) => (qT(v) < start - 1e-6 ? -1 : L.ease.outCubic(L.prog(v.t, start, dur)));
/** Card exit: 1 → 0 over the last moments of the beat, finished before the next beat starts. */
export const cardOut = (v, lead = 0.42, dur = 0.3) => 1 - L.ease.inOutCubic(L.prog(v.t, v.d - lead, dur));

/** Soft dark plate for labels over the bright core. */
export function plate(ctx, x, y, w, h, k, r = 20, fill = 0.8) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= L.clamp(k);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 48;
  ctx.fillStyle = `rgba(16,9,7,${fill})`;
  L.roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,214,180,0.13)';
  ctx.lineWidth = 1;
  L.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.stroke();
  ctx.restore();
}

/** A ring of light on a boundary circle of radius `rad` (m) around the centre: flash e (0..1) + an outward ripple. */
export function boundaryFlash(ctx, v, rad, age, col = HOT) {
  if (age < -0.1 || age > 1.6) return;
  const rp = v.ws(rad), cx = v.wx(0), cy = v.wy(R_EARTH);
  const e = Math.exp(-Math.max(0, age) * 2.6) * L.clamp((age + 0.1) / 0.1);
  if (e < 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  L.glow(ctx, col, 26, () => {
    ctx.strokeStyle = L.rgba(col, 0.85 * e);
    ctx.lineWidth = 3 + 3 * e;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rp), 0, Math.PI * 2); ctx.stroke();
  });
  const ra = L.ease.outCubic(L.clamp(age / 1.3));
  ctx.strokeStyle = L.rgba(col, 0.35 * (1 - ra));
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rp + 140 * ra), 0, Math.PI * 2); ctx.stroke();
  // the hot spot where the faller pierces the boundary
  const fy = v.wy(fallerDepth(v.gt - Math.max(0, age)));
  L.lightBlob(ctx, cx, fy, 160, [255, 210, 150], 0.5 * e);
  ctx.restore();
}

/** Incandescent solid iron (world space): a white-hot heart, soft slowly churning mottling and a faint rim. a = 0..1. */
const MOTTLE = (() => { const r = L.rng(4404); return Array.from({ length: 26 }, () => ({ a: r() * 6.283, d: Math.sqrt(r()) * 0.82, s: 0.18 + r() * 0.22, hot: r() > 0.45, ph: r() * 9 })); })();
export function drawCrystal(ctx, v, a = 1) {
  const rp = v.ws(RADIUS.icb);
  const lod = L.clamp((rp - 140) / 220);       // gone at globe scale (rp ≈ 80 px)
  a *= lod;
  if (a <= 0.01) return;
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  if (cx + rp < 0 || cx - rp > W || cy + rp < 0 || cy - rp > H) return;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rp - 1), 0, Math.PI * 2); ctx.clip();
  // the white-yellow heart, breathing very slowly
  const br = 0.92 + 0.08 * Math.sin(v.gt * 0.9);
  const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rp);
  hg.addColorStop(0, `rgba(255,248,226,${0.3 * a * br})`);
  hg.addColorStop(0.45, `rgba(255,224,160,${0.12 * a})`);
  hg.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(cx - rp, cy - rp, rp * 2, rp * 2);
  // soft mottling: hot and cooler patches drifting on slow, noisy paths (no lines, no grid)
  for (const m of MOTTLE) {
    const an = m.a + 0.05 * v.gt + 0.25 * L.noise1(v.gt * 0.12 + m.ph, 3);
    const dd = m.d + 0.06 * L.noise1(v.gt * 0.15 + m.ph * 2, 5);
    const x = cx + Math.cos(an) * dd * rp, y = cy + Math.sin(an) * dd * rp;
    const rr = m.s * rp * (1 + 0.15 * Math.sin(v.gt * 0.5 + m.ph));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    if (m.hot) { g.addColorStop(0, `rgba(255,226,176,${0.16 * a})`); g.addColorStop(1, 'rgba(255,226,176,0)'); ctx.globalCompositeOperation = 'source-over'; }   // 12b f12a: not additive (lime cast)
    else { g.addColorStop(0, `rgba(150,60,20,${0.16 * a})`); g.addColorStop(1, 'rgba(150,60,20,0)'); ctx.globalCompositeOperation = 'multiply'; }
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  // a faint rim highlight: the solid ball has an edge
  const rg = ctx.createRadialGradient(cx, cy, rp * 0.86, cx, cy, rp);
  rg.addColorStop(0, 'rgba(255,240,210,0)');
  rg.addColorStop(1, `rgba(255,240,210,${0.12 * a})`);
  ctx.fillStyle = rg;
  ctx.fillRect(cx - rp, cy - rp, rp * 2, rp * 2);
  ctx.restore();
}

/** A small Sun glyph (disc + rays). */
function sunGlyph(ctx, x, y, r, k, gt) {
  ctx.save();
  ctx.globalAlpha *= k;
  L.lightBlob(ctx, x, y, r * 3.2, [255, 190, 100], 0.5);
  ctx.strokeStyle = 'rgba(255,214,150,0.9)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const an = (i * Math.PI) / 4 + gt * 0.25;
    const r0 = r + 3, r1 = r + 6 + 2 * Math.sin(gt * 3 + i);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.stroke();
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#ffc070');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r * L.ease.outBack(L.clamp(k))), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'Inner core', sub: 'A solid ball of iron' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: ICB_IN - (18.171 + OFF) - 0.04, name: 'deep', gain: 0.4, pitch: 0.9 },
      { t: ICB_IN - (18.171 + OFF), name: 'shimmer', gain: 0.26, pitch: 1.1 },
      { t: LAND, name: 'bloom', gain: 0.32, pitch: 1.0 },
      { t: LAND + 0.02, name: 'tick', gain: 0.24, pitch: 1.2 },
      { t: SUN_LINE, name: 'ping', gain: 0.2, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    const s3 = v.tl.scenes[3].start, s8 = v.tl.scenes[8].start;
    if (v.gt < s3 + 1.5 || v.gt > s8 + 1) return;
    // the grain shows as the core rises into view, strongest while we're inside it
    const a = L.ease.inOutCubic(L.prog(v.gt, s3 + 1.5, 2.2)) * (1 - L.prog(v.gt, v.tl.scenes[7].start, 1.2));
    drawCrystal(ctx, v, a);
    boundaryFlash(ctx, v, RADIUS.icb, v.gt - ICB_IN);
  },

  drawOverlay(ctx, v) {
    // 12b f12a: an opaque card from its first frame (scale + lift only), faded as one image before the beat ends;
    // the Sun line is two 28 px lines (it was 19 px)
    const kin = cardIn(v, LAND, 0.45);
    if (kin < 0) return;
    const x = 560, y = 712, w = 470, h = 360;
    group(ctx, cardOut(v), (c) => {
      const sc = 0.96 + 0.04 * kin, cx = x + w / 2, cy = y + h / 2 + (1 - kin) * 24;
      c.translate(cx, cy); c.scale(sc, sc); c.translate(-(x + w / 2), -(y + h / 2));
      plate(c, x, y, w, h, 1);
      L.bigLabel(c, { x: x + 38, y: y + 148, big: '≈ 5,200 °C', small: '9,400 °F', k: L.prog(v.t, LAND + 0.05, 0.5), accent: v.accent, size: 84 });
      // Sun line on "the Sun"
      const sk = L.enter(v.t, SUN_LINE, 0.5);
      if (sk > 0) {
        c.save();
        c.globalAlpha *= L.clamp(sk * 1.4);
        c.fillStyle = 'rgba(255,214,170,0.22)';
        c.fillRect(x + 38, y + 236, (w - 76) * L.ease.outCubic(sk), 1);
        const lines = ['AS HOT AS THE', "SUN'S SURFACE"];
        const tx = x + 92;
        let fs = 30;
        for (const ln of lines) fs = Math.min(fs, L.fitSize(c, ln, x + w - 38 - tx - 20, 30, 700, L.FONT.body, 26));
        c.font = L.font(fs, 700, L.FONT.body);
        c.fillStyle = 'rgba(255,228,196,0.97)';
        c.textBaseline = 'alphabetic';
        lines.forEach((ln, i) => L.trackedText(c, ln, tx + (1 - L.ease.outCubic(sk)) * 12, y + 288 + i * (fs + 10), 1.5));
        c.restore();
        sunGlyph(c, x + 56, y + 296, 11, sk, v.gt);
      }
    });
  },
};
