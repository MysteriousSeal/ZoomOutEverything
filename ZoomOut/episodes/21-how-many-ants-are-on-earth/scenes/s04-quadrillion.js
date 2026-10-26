// Beat 4 (ep 21) — "Their conservative estimate: | twenty quadrillion ants."
// Under the turning globe (r ≈ 300, centre y 690) a 17-digit odometer rolls up, in log space, from 1 to
// 20,000,000,000,000,000. The unused leading places sit as dim zeros, so the layout never jumps; each place lights up
// as the count reaches it and the low places spin until the count lands, on "twenty quadrillion", with an impact.
// Meanwhile a fine amber dusting (ants) settles over every continent except Antarctica, thickening with the count.
// The line below swaps from "ANTS ON EARTH · CONSERVATIVE ESTIMATE" to "20 QUADRILLION ANTS".
//
// Exports (used by s05 and s06 within group 21B):
//   CTR, drawCounter(ctx, o)   the odometer (screen space)
//   drawAntDust(ctx, v, k)     the amber land dusting on the globe (world layer)
//   subLine(ctx, text, y, o)   the house sub-line under the counter
import * as L from '../../../../engine/runtime/lib.js';
import { project, isLand } from '../../../../engine/runtime/earth.js';
import { globeView, ACCENT } from '../env.js';

const { W, ease, clamp, prog, lerp, rgba } = L;
export const L10_END = Math.log10(2e16);   // 16.30103
export const CTR = { cx: W / 2, base: 1150, maxW: 800, places: 17 };   // right edge ≤ 940 (Shorts UI)
// beat-relative timing (voice: phrase 2 "twenty quadrillion ants." starts at +2.28 s)
export const T4 = { start: 0.5, land: 2.34, sub: 2.36 };   // the counter waits for the camera to lift the globe clear

// ------------------------------------------------------------------ odometer
let LAY = null;
/** digit advance, comma advance and font size so all 17 places + 5 commas fit CTR.maxW */
function layout(ctx) {
  if (LAY) return LAY;
  let size = 170;
  for (; size > 40; size -= 2) {
    ctx.font = L.font(size, 700, L.FONT.din);
    let dw = 0;
    for (let d = 0; d < 10; d++) dw = Math.max(dw, ctx.measureText(String(d)).width);
    const cw = ctx.measureText(',').width * 1.25;
    const total = CTR.places * dw + 5 * cw;
    if (total <= CTR.maxW) { LAY = { size, dw, cw, total, capH: size * 0.72 }; break; }
  }
  // slot x (left) for each place p (16 … 0), and comma x after places 15, 12, 9, 6, 3
  const xs = {}, commas = [];
  let x = CTR.cx - LAY.total / 2;
  for (let p = CTR.places - 1; p >= 0; p--) {
    xs[p] = x; x += LAY.dw;
    if (p > 0 && p % 3 === 0) { commas.push({ x, p }); x += LAY.cw; }
  }
  LAY.xs = xs; LAY.commas = commas;
  return LAY;
}
export const counterBox = (ctx) => { const l = layout(ctx); return { x0: CTR.cx - l.total / 2, x1: CTR.cx + l.total / 2, top: CTR.base - l.capH, base: CTR.base, l }; };

/**
 * o: { l10 (log10 of the count; ≥ L10_END = landed), t (s, spin), k (alpha), flash 0..1,
 *      lit(p) → 0..1 accent highlight for place p (s05), pop(p) → extra scale for place p }
 */
export function drawCounter(ctx, o) {
  const k = o.k ?? 1;
  if (k <= 0) return;
  const lay = layout(ctx);
  const l10 = o.l10, landed = l10 >= L10_END - 1e-9;
  const top = Math.floor(l10 + 1e-9);
  const lineH = lay.size * 0.95;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = L.font(lay.size, 700, L.FONT.din);
  // soft dark halo slab so the digits sit on something even over stars / atmosphere glow
  const g = ctx.createLinearGradient(0, CTR.base - lay.capH - 60, 0, CTR.base + 50);
  g.addColorStop(0, 'rgba(2,3,9,0)'); g.addColorStop(0.35, 'rgba(2,3,9,0.55)'); g.addColorStop(0.75, 'rgba(2,3,9,0.55)'); g.addColorStop(1, 'rgba(2,3,9,0)');
  ctx.fillStyle = g;
  ctx.fillRect(CTR.cx - lay.total / 2 - 60, CTR.base - lay.capH - 60, lay.total + 120, lay.capH + 110);
  const win = { y0: CTR.base - lay.capH - 14, y1: CTR.base + 14 };
  for (let p = CTR.places - 1; p >= 0; p--) {
    const x = lay.xs[p] + lay.dw / 2;
    const active = landed ? p <= 16 : p <= top;
    let d = 0, r = 0, spin = false;
    if (landed) d = p === 16 ? 2 : 0;
    else if (active) {
      const xp = Math.pow(10, l10 - p);
      if (xp > 3e4) { spin = true; const s = (o.t * (31 + 7.3 * p) + p * 3.7) % 10; d = Math.floor(s); r = s - d; }
      else { d = Math.floor(xp) % 10; const fr = xp - Math.floor(xp); r = p === 0 || xp < 10 ? ease.inOutCubic(fr) : clamp((fr - 0.88) / 0.12); r = ease.inOutCubic(r); }
    }
    const lit = o.lit ? o.lit(p) : 0;
    const pop = o.pop ? o.pop(p) : 0;
    let col, al;  // eslint-disable-line prefer-const
    if (!active) { col = [150, 160, 180]; al = 0.22; }
    else { col = L.mix([246, 242, 234], ACCENT, landed && p === 16 ? 1 : lit); al = 1; }
    ctx.save();
    ctx.beginPath(); ctx.rect(x - lay.dw, win.y0 - 40 * pop, lay.dw * 2, win.y1 - win.y0 + 50 * pop); ctx.clip();
    ctx.translate(x, CTR.base - lay.capH / 2);
    ctx.scale(1 + pop * 0.22, 1 + pop * 0.22);
    ctx.translate(0, lay.capH / 2);
    const fl = o.flash ?? 0;
    if (lit > 0.01 || fl > 0.01) { ctx.shadowColor = rgba(lit > fl ? ACCENT : [255, 226, 170], 0.9 * Math.max(lit, fl)); ctx.shadowBlur = 30 * Math.max(lit, fl); }
    if (fl > 0.01 && active) col = L.mix(col, [255, 236, 200], 0.5 * fl);
    if (spin) {   // a wheel spinning too fast to read: one digit per frame, slightly smeared (motion blur does the rest)
      ctx.fillStyle = rgba(col, al * 0.9);
      ctx.fillText(String(d), 0, -r * lineH * 0.25);
    } else {
      ctx.fillStyle = rgba(col, al);
      ctx.fillText(String(d), 0, -r * lineH);
      if (r > 0.001) ctx.fillText(String((d + 1) % 10), 0, (1 - r) * lineH);
    }
    ctx.restore();
  }
  // commas: lit once a place to their left is active
  for (const { x, p } of lay.commas) {
    const on = landed || p <= top;
    ctx.fillStyle = on ? 'rgba(246,242,234,0.9)' : 'rgba(150,160,180,0.22)';
    ctx.fillText(',', x + lay.cw / 2, CTR.base);
  }
  ctx.restore();
}

/** log10 of the count at beat-4 time t */
export function countL10(t) {
  const u = prog(t, T4.start, T4.land - T4.start);
  if (u >= 1) return L10_END;
  return L10_END * (1 - Math.pow(1 - u, 1.8)) * 0.999 + 0.0 * u;
}

/** one centred line of text under the counter; o: {size, weight, family, col, track, k, rise, maxW} */
export function subLine(ctx, text, y, o = {}) {
  const k = o.k ?? 1;
  if (k <= 0) return;
  const family = o.family ?? L.FONT.body, weight = o.weight ?? 600, track = o.track ?? 3;
  ctx.save();
  ctx.globalAlpha *= clamp(k);
  ctx.font = L.font(o.size ?? 28, weight, family);
  ctx.letterSpacing = `${track}px`;
  let size = o.size ?? 28;
  while (size > 14 && ctx.measureText(text).width > (o.maxW ?? 900)) { size -= 1; ctx.font = L.font(size, weight, family); }
  ctx.letterSpacing = '0px';
  ctx.fillStyle = rgba(o.col ?? [205, 212, 226], o.alpha ?? 0.95);
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 12;
  ctx.textBaseline = 'alphabetic';
  L.trackedText(ctx, text, W / 2, y + (1 - ease.outCubic(clamp(k))) * (o.rise ?? 16), track, 'center');
  ctx.restore();
}

// ------------------------------------------------------------------ the amber dusting of ants over the land
let DUST = null;
function dustPoints() {
  if (DUST) return DUST;
  const N = 16000, out = [], r = L.rng(2140);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const z = 1 - (2 * (i + 0.5)) / N, lat = Math.asin(z) * 180 / Math.PI;
    const lon = ((((i * ga) * 180 / Math.PI) % 360) + 540) % 360 - 180;
    const jl = lat + (r() - 0.5) * 1.2, jo = lon + (r() - 0.5) * 1.2;
    if (jl < -56) continue;                         // Antarctica: no native ants
    if (!isLand(jl, jo) || elevationIce(jl, jo)) continue;
    // ants are densest in the warm tropics and thin out toward the poles
    let w = clamp(1.15 - Math.abs(jl) / 75);
    if (DESERTS.some(([a, b, c, d]) => jl > a && jl < b && jo > c && jo < d)) w *= 0.3;
    out.push({ lat: jl, lon: jo, w, ph: r(), th: r() });
  }
  DUST = out;
  return out;
}
// hot and cold deserts hold far fewer ants (Sahara, Arabia, Gobi/Taklamakan, inner Australia, Atacama): rough boxes
const DESERTS = [[16, 31, -14, 32], [16, 30, 36, 56], [36, 46, 78, 112], [-30, -19, 120, 140], [-27, -18, -71, -68]];
// Greenland's ice sheet has no ants either
const elevationIce = (lat, lon) => lat > 59.5 && lon > -73 && lon < -12 && !(lon > -25.5 && lat < 66.8);

/** k: 0..1 overall; grow: 0..1 how much of the dusting is visible (thresholds per point) */
export function drawAntDust(ctx, v, k, grow = 1) {
  if (k <= 0.003) return;
  const view = globeView(v);
  if (view.r < 20) return;
  const pts = dustPoints();
  const s = clamp(view.r / 300);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    if (p.th > grow) continue;
    const q = project(p.lat, p.lon, view);
    if (q.z < 0.08) continue;
    const limb = clamp((q.z - 0.08) / 0.35);
    const tw = 0.75 + 0.25 * Math.sin(v.gt * 2.1 + p.ph * 40);
    const a = k * limb * (0.15 + 0.5 * p.w) * tw * clamp((grow - p.th) * 8);
    ctx.fillStyle = rgba([255, 196, 96], a);
    const rr = (0.9 + 0.7 * p.w) * s;
    ctx.fillRect(q.x - rr, q.y - rr, rr * 2, rr * 2);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ scene
export default {
  beat: 4,
  chapter: { num: '04', title: 'The estimate', sub: 'Schultheiss et al., PNAS 2022' },
  layer: 4,
  cues(d) {
    return [
      { t: T4.start, name: 'riser', gain: 0.22, pitch: 1.0 },
      { t: 0.9, name: 'count', gain: 0.18, pitch: 1.0 },
      { t: T4.land, name: 'impact', gain: 0.55, pitch: 0.9 },
      { t: T4.land + 0.04, name: 'shimmer', gain: 0.25, pitch: 1.1 },
    ];
  },
  // the amber dusting lives on the globe from this beat until the biomass panel takes the screen (fades in beat 7)
  drawWorld(ctx, v) {
    if (v.t < 0) return;
    const tl = v.tl, s7 = tl.scenes[7].start, s8 = tl.scenes[8].start;
    const kin = ease.outCubic(prog(v.t, T4.start, 0.8));
    const kout = 1 - ease.inCubic(prog(v.gt, s7 + 0.2, 1.0));
    const s6 = tl.scenes[6].start;
    const k = kin * kout * (1 - 0.45 * ease.inOutCubic(prog(v.gt, s6, 0.8))) * (v.gt < s8 ? 1 : 0);
    if (k <= 0) return;
    const grow = clamp(countL10(v.t) / L10_END);
    drawAntDust(ctx, v, k, 0.15 + 0.85 * grow * grow);
  },
  drawOverlay(ctx, v) {
    if (v.t >= v.d) return;   // s05 continues the counter from its first frame
    const t = v.t;
    const kin = ease.outCubic(prog(t, 0.45, 0.45));
    const l10 = countL10(t);
    const flash = t >= T4.land ? 1 - prog(t, T4.land, 0.7) : 0;
    // landing kick: the whole counter punches in slightly
    const kick = t >= T4.land ? Math.sin(Math.PI * prog(t, T4.land, 0.35)) * 0.035 : 0;
    ctx.save();
    ctx.translate(CTR.cx, CTR.base - 40); ctx.scale(1 + kick, 1 + kick); ctx.translate(-CTR.cx, -(CTR.base - 40));
    drawCounter(ctx, { l10, t: v.gt, k: kin, flash });
    ctx.restore();
    // shockwave ring on the globe at the landing
    if (t >= T4.land && t < T4.land + 1.2) {
      const view = globeView(v), u = prog(t, T4.land, 1.1);
      ctx.save();
      ctx.strokeStyle = rgba(ACCENT, 0.55 * (1 - u));
      ctx.lineWidth = 3 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(view.cx, view.cy, Math.max(0, view.r * (1.0 + 0.18 * ease.outCubic(u))), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // sub line: what is being counted → the landed value in words
    const a = kin * (1 - ease.inCubic(prog(t, T4.sub - 0.25, 0.25)));
    subLine(ctx, 'ANTS ON EARTH  ·  CONSERVATIVE ESTIMATE', CTR.base + 66, { k: a, size: 26 });
    const b = ease.outCubic(prog(t, T4.sub, 0.45));
    if (b > 0) {
      subLine(ctx, '20 QUADRILLION ANTS', CTR.base + 112, { k: b, size: 76, weight: 800, family: L.FONT.display, col: ACCENT, alpha: 1, track: 2, rise: 22, maxW: 900 });
    }
  },
};
