// Beat 4 — "Then the tides. | The Moon does most of the pulling on our oceans."
// The big pull-back settles on the globe. On "The Moon" a ghost Moon (illustrative, not to scale) fades in toward
// MOON_DIR; on "most of the pulling" the ocean swells into an exaggerated, translucent tidal bulge stretched along
// the Earth–Moon line, with dashes streaming from the bulge toward the Moon (the pull) and a small Sun arrow on the
// other side. Label: "≈ 2/3" · "of the pull is the Moon's".
// Exports the bulge / ghost Moon / Sun arrow / tag helpers for s05 and s06 (same group).
import * as L from '../../../../engine/runtime/lib.js';
import { globePx, MOON_DIR, SUN_DIR } from '../env.js';

const TAU = Math.PI * 2;
export const WATER = [120, 190, 255];
export const SUNC = [255, 206, 140];
/** Today's (spring) bulge elongation, exaggerated: semi-major = r (1 + E0). Sun-only ≈ 0.32 × that. */
export const E0 = 0.2;
export const E_SUN = E0 * 0.32;
const GHOST = { d: 2.1, r: 0.11 };      // ghost Moon: distance and radius in Earth radii (illustrative, off-scale: the
                                        // real Moon is 60 Earth radii away; the pull line carries a break mark)
const SUNA = { a: 1.3, b: 1.62 };       // Sun arrow, from/to in Earth radii along SUN_DIR

/** Time (s, global) of the first word matching `re` in line `li` (proportional to word length, per phrase). */
export function wordAt(tl, li, re) {
  const ln = tl.lines[li];
  for (const ph of ln.phrases ?? [ln]) {
    const words = ph.text.split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (re.test(words[i])) return ph.start + (ph.end - ph.start) * acc / tot;
      acc += wts[i];
    }
  }
  return ln.start;
}
/** Same, as seconds into the beat of view v (line index = beat index). */
export const wordT = (v, li, re) => wordAt(v.tl, li, re) - v.tl.scenes[li].start;

/** Is the globe a sensible size to draw on? */
export const globeOk = (g) => g.r > 20 && g.r < 4000;

/** Small dark pill tag with tracked caps (screen space). align: 'left' | 'center' | 'right'. */
export function tag(c, x, y, str, a = 1, { align = 'center', color = [225, 232, 255], size = 20, bg = 0.62 } = {}) {
  if (a <= 0.001) return;
  c.save();
  c.globalAlpha *= L.clamp(a);
  c.font = L.font(size, 700, L.FONT.body);
  c.letterSpacing = '3px';
  const w = c.measureText(str).width - 3 + size * 1.1, h = size * 1.7;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.fillStyle = `rgba(4,7,18,${bg})`;
  L.roundRect(c, x0, y - h / 2, w, h, h / 2); c.fill();
  c.fillStyle = L.rgba(color, 0.95);
  c.textBaseline = 'middle';
  c.letterSpacing = '0px';
  L.trackedText(c, str, x0 + w / 2, y + 1, 3, 'center');
  c.restore();
}

// ------------------------------------------------------------------ the tidal bulge
const PHI = Math.atan2(MOON_DIR.y, MOON_DIR.x);
/** Point on the bulge outline at polar angle th (relative to the Earth–Moon axis), radius in px. */
function bulgeR(r, e, th, gt, wob) {
  const a = r * (1 + e), b = r * (1 - 0.45 * e);
  const ct = Math.cos(th), st = Math.sin(th);
  const base = (a * b) / Math.sqrt((b * ct) ** 2 + (a * st) ** 2);
  // a slow travelling swell on the water surface (secondary motion)
  return base + r * wob * (0.55 * Math.sin(3 * th - gt * 1.3) + 0.45 * L.noise1(th * 2.2 + gt * 0.4, 4));
}
function tracePath(c, cx, cy, r, e, gt, wob, n = 120) {
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * TAU, rr = bulgeR(r, e, th, gt, wob);
    const x = cx + Math.cos(th + PHI) * rr, y = cy + Math.sin(th + PHI) * rr;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}

/**
 * The exaggerated tidal bulge around the globe (world-anchored via globePx).
 *   e     elongation (0 = none, E0 = today's spring tide, exaggerated)
 *   k     visibility 0..1
 *   flow  -1..1 surface flow toward (+) or away from (−) the bulge tips
 *   ref   optional dashed outline of another elongation (e.g. today's, in s05) with alpha refK
 */
export function drawBulge(c, v, { e = E0, k = 1, flow = 0, ref = 0, refK = 0 } = {}) {
  const g = globePx(v);
  if (k <= 0.001 || !globeOk(g)) return;
  const { cx, cy, r } = g, gt = v.gt, wob = 0.006 * Math.min(1, e / 0.05);
  c.save();
  c.globalAlpha *= k;
  // outside the disc: the piled-up WATER, deep ocean blue against the planet, shallower and lighter toward the tips
  // (no bright rim: it must read as water heaped on the globe, not as a second outline of the Earth)
  c.save();
  c.beginPath(); c.rect(-50, -50, L.W + 100, L.H + 100); c.arc(cx, cy, Math.max(0, r - 0.5), 0, TAU, true);
  c.clip('evenodd');
  tracePath(c, cx, cy, r, e, gt, wob);
  const reach = r * (1 + Math.max(e, 0.02) * 1.02);
  const wg = c.createRadialGradient(cx, cy, r * 0.995, cx, cy, reach);
  // feathered outward (no crisp outer edge), so the heap reads as water, not as a misregistered second globe
  wg.addColorStop(0, 'rgba(14,52,112,0.9)'); wg.addColorStop(0.4, 'rgba(26,84,158,0.72)');
  wg.addColorStop(0.8, 'rgba(48,122,196,0.32)'); wg.addColorStop(1, 'rgba(78,150,214,0.0)');
  c.fillStyle = wg;
  c.filter = `blur(${Math.max(1, r * 0.03).toFixed(1)}px)`;   // soft outer edge: water, not a hard second outline
  c.fill();
  c.filter = 'none';
  // a soft surface sheen along the water's edge (inside the fill, faint)
  c.clip();
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(150,200,245,0.1)';
  c.lineWidth = 6;
  tracePath(c, cx, cy, r, e, gt, wob);
  c.stroke();
  c.restore();
  // inside the disc: the flanks the water was drawn away from (a soft darkening outside the ellipse)
  c.save();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r + 2), 0, TAU);
  tracePath(c, cx, cy, r, e, gt, wob);
  c.fillStyle = 'rgba(2,6,18,0.2)';
  c.fill('evenodd');
  c.restore();
  // two symmetric lobes: a small outward arrow just beyond each tip (water pulled out along the Earth–Moon line)
  const ak = L.clamp(e / (E0 * 0.5));
  for (const s of [0, Math.PI]) {
    const ang = s + PHI, ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const rr = bulgeR(r, e, s, gt, wob), bob = 3 * Math.sin(gt * 2.4 + s);
    const a0 = rr + 10 + bob, a1 = rr + 34 + bob, h = 7;
    c.strokeStyle = `rgba(170,215,255,${0.85 * ak})`;
    c.fillStyle = `rgba(170,215,255,${0.85 * ak})`;
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + ux * a0, cy + uy * a0); c.lineTo(cx + ux * (a1 - h), cy + uy * (a1 - h)); c.stroke();
    c.beginPath();
    c.moveTo(cx + ux * a1, cy + uy * a1);
    c.lineTo(cx + ux * (a1 - h * 1.6) + nx * h * 0.75, cy + uy * (a1 - h * 1.6) + ny * h * 0.75);
    c.lineTo(cx + ux * (a1 - h * 1.6) - nx * h * 0.75, cy + uy * (a1 - h * 1.6) - ny * h * 0.75);
    c.closePath(); c.fill();
  }
  // surface flow: short streaks gliding along the water's edge toward (or away from) the tips
  if (Math.abs(flow) > 0.01) {
    const rnd = L.rng(31);
    c.lineCap = 'round';
    for (let i = 0; i < 28; i++) {
      const side = i % 2 ? 1 : -1, quad = i % 4 < 2 ? 0 : Math.PI;
      const ph = rnd(), sp = 0.28 + 0.2 * rnd();
      // u: 0 at the flank (±90°), 1 at the tip
      let u = (ph + gt * sp) % 1;
      if (flow < 0) u = 1 - u;
      const th = quad + side * (Math.PI / 2) * (1 - u);
      const a = Math.abs(flow) * Math.sin(Math.PI * u) * 0.4;
      const len = 0.16 * side * (flow > 0 ? -1 : 1);
      c.strokeStyle = `rgba(225,240,255,${a})`;
      c.lineWidth = 2;
      c.beginPath();
      for (let j = 0; j <= 6; j++) {
        const tt = th + len * (j / 6);
        const rr = bulgeR(r, e, tt, gt, wob) - 3;
        const x = cx + Math.cos(tt + PHI) * rr, y = cy + Math.sin(tt + PHI) * rr;
        j ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
  }
  // dashed reference outline (today's bulge)
  if (refK > 0.001) {
    c.save();
    c.globalAlpha *= refK;
    c.setLineDash([7, 9]);
    c.strokeStyle = 'rgba(215,228,255,0.7)';
    c.lineWidth = 1.8;
    c.beginPath();
    c.rect(-50, -50, L.W + 100, L.H + 100); c.arc(cx, cy, Math.max(0, r), 0, TAU, true);
    c.clip('evenodd');
    tracePath(c, cx, cy, r, ref, gt, 0.003);
    c.stroke();
    c.restore();
  }
  c.restore();
}
/** Screen position of the bulge tip toward the Moon (s = 1) or the Sun (s = −1). */
export function bulgeTip(v, e, s = 1) {
  const { cx, cy, r } = globePx(v), rr = bulgeR(r, e, s > 0 ? 0 : Math.PI, v.gt, 0);
  const d = s > 0 ? MOON_DIR : SUN_DIR;
  return { x: cx + d.x * rr, y: cy + d.y * rr };
}

// ------------------------------------------------------------------ ghost Moon + pull line
export function ghostMoonPos(v) {
  const { cx, cy, r } = globePx(v);
  // keep the whole dashed ring below the HUD band (y < 300): slide toward the globe along MOON_DIR if needed
  const minY = 300 + r * GHOST.r + 30;
  const d = Math.max(1.3, Math.min(GHOST.d, (cy - minY) / Math.max(1, -MOON_DIR.y * r)));
  return { x: cx + MOON_DIR.x * r * d, y: cy + MOON_DIR.y * r * d, r: r * GHOST.r };
}
/** Ghost Moon toward MOON_DIR (lit from SUN_DIR), with a dashed ring. grow 0..1 = dissolve (scale + fade). */
export function drawGhostMoon(c, v, k = 1, { dissolve = 0 } = {}) {
  const g = globePx(v);
  if (k <= 0.001 || !globeOk(g)) return;
  const m = ghostMoonPos(v);
  const R = m.r * (1 + 0.35 * dissolve);
  c.save();
  c.globalAlpha *= k * (1 - dissolve);
  L.lightBlob(c, m.x, m.y, R * 3.2, [160, 180, 230], 0.12);
  // body: lit hemisphere faces the Sun (lower-left), which is the Earth side at full Moon
  const lg = c.createLinearGradient(m.x + SUN_DIR.x * R, m.y + SUN_DIR.y * R, m.x - SUN_DIR.x * R, m.y - SUN_DIR.y * R);
  lg.addColorStop(0, 'rgba(225,228,236,0.62)'); lg.addColorStop(0.5, 'rgba(150,158,176,0.38)'); lg.addColorStop(0.75, 'rgba(40,46,62,0.3)'); lg.addColorStop(1, 'rgba(20,24,36,0.25)');
  c.fillStyle = lg;
  c.beginPath(); c.arc(m.x, m.y, Math.max(0, R), 0, TAU); c.fill();
  // faint maria
  c.save();
  c.beginPath(); c.arc(m.x, m.y, Math.max(0, R), 0, TAU); c.clip();
  c.fillStyle = 'rgba(70,78,96,0.22)';
  for (const [mx, my, mr] of [[-0.3, -0.2, 0.36], [0.22, -0.3, 0.26], [0.05, 0.12, 0.3]]) {
    c.beginPath(); c.arc(m.x + mx * R, m.y + my * R, Math.max(0, mr * R), 0, TAU); c.fill();
  }
  c.restore();
  // dashed ring (it's a ghost: illustrative position and size)
  c.setLineDash([5, 6]);
  c.lineDashOffset = -v.gt * 6;
  c.strokeStyle = 'rgba(210,222,255,0.75)';
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(m.x, m.y, Math.max(0, R + 7 + 10 * dissolve), 0, TAU); c.stroke();
  c.restore();
}
/** Dashes streaming from the bulge tip toward the ghost Moon: the pull. */
export function drawPull(c, v, e, k = 1) {
  const g = globePx(v);
  if (k <= 0.001 || !globeOk(g)) return;
  const tip = bulgeTip(v, e, 1), m = ghostMoonPos(v);
  const x0 = tip.x + MOON_DIR.x * 14, y0 = tip.y + MOON_DIR.y * 14;
  const x1 = m.x - MOON_DIR.x * (m.r + 16), y1 = m.y - MOON_DIR.y * (m.r + 16);
  // signed gap along MOON_DIR: when the grown bulge reaches the ghost Moon there is no room, so fade the pull out
  const gap = (x1 - x0) * MOON_DIR.x + (y1 - y0) * MOON_DIR.y;
  const room = Math.max(0, Math.min(1, (gap - 12) / 40));
  if (room <= 0.001) return;
  c.save();
  c.globalAlpha *= k * room;
  c.lineCap = 'round';
  // chevrons travelling toward the Moon, fading at both ends
  c.setLineDash([2, 7]);
  c.strokeStyle = 'rgba(200,220,255,0.35)';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.setLineDash([]);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const u = ((i / n) + v.gt * 0.42) % 1;
    const a = Math.sin(Math.PI * u) ** 0.7 * 0.95;
    const px = L.lerp(x0, x1, u), py = L.lerp(y0, y1, u), s = 11;
    const nx = -MOON_DIR.y, ny = MOON_DIR.x;
    c.strokeStyle = L.rgba([200, 220, 255], a);
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(px - MOON_DIR.x * s + nx * s, py - MOON_DIR.y * s + ny * s);
    c.lineTo(px, py);
    c.lineTo(px - MOON_DIR.x * s - nx * s, py - MOON_DIR.y * s - ny * s);
    c.stroke();
  }
  // off-scale break mark: two slanted ticks across the line, just short of the Moon (the real gap is ~30x longer)
  const bx = L.lerp(x0, x1, 0.78), by = L.lerp(y0, y1, 0.78), nx = -MOON_DIR.y, ny = MOON_DIR.x;
  c.strokeStyle = 'rgba(225,235,255,0.9)';
  c.lineWidth = 2;
  for (const o of [-4, 4]) {
    const qx = bx + MOON_DIR.x * o, qy = by + MOON_DIR.y * o;
    c.beginPath();
    c.moveTo(qx + nx * 10 - MOON_DIR.x * 5, qy + ny * 10 - MOON_DIR.y * 5);
    c.lineTo(qx - nx * 10 + MOON_DIR.x * 5, qy - ny * 10 + MOON_DIR.y * 5);
    c.stroke();
  }
  c.restore();
}
/** Small warm Sun arrow on the far side (toward SUN_DIR), with a "SUN" tag. emph 0..1 brightens it. */
export function drawSunArrow(c, v, k = 1, emph = 0) {
  const g = globePx(v);
  if (k <= 0.001 || !globeOk(g)) return;
  const { cx, cy, r } = g, d = SUN_DIR;
  const ax = cx + d.x * r * SUNA.a, ay = cy + d.y * r * SUNA.a;
  const bx = cx + d.x * r * SUNA.b, by = cy + d.y * r * SUNA.b;
  const nx = -d.y, ny = d.x, h = 11 + 3 * emph;
  c.save();
  c.globalAlpha *= k;
  L.lightBlob(c, bx + d.x * 20, by + d.y * 20, 70 + 40 * emph, SUNC, 0.12 + 0.2 * emph);
  c.strokeStyle = L.rgba(SUNC, 0.75 + 0.2 * emph);
  c.fillStyle = L.rgba(SUNC, 0.75 + 0.2 * emph);
  c.lineWidth = 2.2 + emph;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx - d.x * h, by - d.y * h); c.stroke();
  c.beginPath();
  c.moveTo(bx, by); c.lineTo(bx - d.x * h * 1.6 + nx * h * 0.7, by - d.y * h * 1.6 + ny * h * 0.7);
  c.lineTo(bx - d.x * h * 1.6 - nx * h * 0.7, by - d.y * h * 1.6 - ny * h * 0.7); c.closePath(); c.fill();
  c.restore();
  tag(c, bx + d.x * 8 - 62, by + d.y * 8 + 6, 'SUN', k, { color: SUNC, size: 19 });
}

// ------------------------------------------------------------------ beat-4 choreography
export function tidesTimes(v) {
  const tl = v.tl;
  return {
    moon: wordAt(tl, 2, /^Moon/) - tl.scenes[2].start - 0.15,      // ghost Moon fades in
    land: wordAt(tl, 2, /^most/) - tl.scenes[2].start - 0.35,      // bulge swells (lands on "most")
    label: wordAt(tl, 2, /^pulling/) - tl.scenes[2].start,          // "≈ 2/3"
  };
}
/** Bulge elongation during beat 4 (t = seconds into beat 4). */
export function bulgeE4(v, t) {
  const T = tidesTimes(v);
  const p = L.prog(t, T.land, 0.95);
  return E0 * L.ease.outBack(p, 1.4);
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'The tides', sub: 'the Moon does most of the pulling' },
  captions: true,
  layer: 2,
  cues(d) {
    // phrase-relative (timeline not passed here): "The Moon" ≈ 2.1 s, "most" ≈ 2.5 s, "pulling" ≈ 3.3 s
    return [
      { t: 0.15, name: 'swell', gain: 0.32, pitch: 0.7 },
      { t: 1.85, name: 'shimmer', gain: 0.16, pitch: 0.9 },
      { t: 2.2, name: 'bloom', gain: 0.42, pitch: 0.75 },
      { t: 2.28, name: 'splash', gain: 0.18, pitch: 0.65 },
      { t: 3.3, name: 'ping', gain: 0.26, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < 0 || v.t >= v.d) return;            // s05 takes the bulge over at its beat start
    const T = tidesTimes(v), t = v.t;
    const e = bulgeE4(v, t);
    const mk = L.ease.outCubic(L.prog(t, T.moon, 0.7));
    drawGhostMoon(ctx, v, mk);
    drawBulge(ctx, v, { e, k: L.clamp(L.prog(t, T.land - 0.1, 0.3)), flow: L.prog(t, T.land, 0.4) * (1 - 0.5 * L.prog(t, T.land + 1.4, 1)) });
    drawPull(ctx, v, e, L.prog(t, T.land + 0.2, 0.6));
    drawSunArrow(ctx, v, L.ease.outCubic(L.prog(t, T.land + 0.6, 0.6)));
  },
  drawOverlay(ctx, v) {
    const T = tidesTimes(v), t = v.t;
    const g = globePx(v);
    if (globeOk(g)) {
      const m = ghostMoonPos(v);
      moonTag(ctx, m, v.k * L.ease.outCubic(L.prog(t, T.moon + 0.3, 0.5)));
      exaggeratedTag(ctx, v, bulgeE4(v, t), v.k * L.ease.outCubic(L.prog(t, T.land + 0.9, 0.5)));
    }
    L.bigLabel(ctx, { x: 920, y: 1212, big: '≈ 2/3', small: 'of the pull is the Moon’s', k: L.enter(t, T.label, 0.55) * v.k, accent: v.accent, align: 'right', size: 100 });
  },
};

/** "MOON · 384,400 KM" beside the ghost Moon, with a dim "NOT TO SCALE" under it (the globe's scale bar would
 *  otherwise contradict a Moon drawn ~2 Earth radii away). */
export function moonTag(c, m, a) {
  tag(c, m.x - m.r - 22, m.y - 4, 'MOON · 384,400 KM', a, { align: 'right', size: 19 });
  tag(c, m.x - m.r - 22, m.y + 30, 'NOT TO SCALE', a * 0.85, { align: 'right', size: 15, bg: 0.5, color: [185, 198, 225] });
}

/** "TIDAL BULGE · EXAGGERATED" tag above-left of the globe, with a hairline to the outline. */
export function exaggeratedTag(c, v, e, a) {
  if (a <= 0.001) return;
  const { cx, cy, r } = globePx(v);
  // anchor on the outline ~55° from the Moon-side tip, toward the top of the frame
  const th = -0.95, rr = bulgeR(r, e, th, v.gt, 0);
  const ax = cx + Math.cos(th + PHI) * rr, ay = cy + Math.sin(th + PHI) * rr;
  const tx = 300, ty = Math.max(330, cy - r - 70);
  c.save();
  c.globalAlpha *= a;
  c.strokeStyle = 'rgba(210,225,255,0.5)';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(tx + 140, ty + 16); c.lineTo(ax, ay); c.stroke();
  c.fillStyle = 'rgba(225,235,255,0.9)';
  c.beginPath(); c.arc(ax, ay, 3.5, 0, TAU); c.fill();
  c.restore();
  tag(c, tx, ty, 'TIDAL BULGE · EXAGGERATED', a, { size: 18 });
}
