// Beat 7 — "It would take half a million atoms, side by side, | to cross that one hair."
// A reticle locks onto the hero atom and rides it all the way back out to the hair. There, the atom's point
// grows into a dense glowing line of atoms that spans the hair edge to edge while a counter climbs to 500,000.
// A loupe shows that the line is atoms side by side; a bracket marks the full 70 µm. In beat 8 the line
// retracts into the atom and the reticle leads the dive back in.
import * as L from '../../../../engine/runtime/lib.js';
import { P } from '../camera.js';
import { heroScreen, atomSprite, ATOM_SPRITE_SCALE, C_O, C_HERO } from './s05-dna.js';
import { N_CELLS, cellY } from './s02-blood-cells.js';

const HAIR = 35e-6;                         // hair half-width (edges at y = ±35 µm)
const T_GROW = 1.5, D_GROW = 1.5;          // line growth (beat time): starts on "half a million" (camera lands ≈ 1.8)
const T_LOUPE = 1.75, T_BRACKET = 2.95;    // T_BRACKET: the line's end caps snap on
const T_COUNT = 0.85;                      // the counter starts climbing as "half a million" is spoken (≈ 34.9 s)
const COUNT = 500000;

const ST = (v, b) => v.tl.scenes[b].start;
/** Line extent 0..1 as a function of global time (grows in beat 7, retracts at the start of beat 8). */
function lineK(v) {
  const g = L.ease.inOutCubic(L.prog(v.gt, ST(v, 7) + T_GROW, D_GROW));
  return g * (1 - L.ease.inCubic(L.prog(v.gt, ST(v, 8), 0.55)));
}
function reticleK(v) {
  const a = ST(v, 7), b = ST(v, 8);
  const k7 = L.ease.outCubic(L.prog(v.gt, a + 0.05, 0.4)) * (1 - L.ease.inCubic(L.prog(v.gt, a + T_GROW + 0.1, 0.5)));
  const k8 = L.ease.outCubic(L.prog(v.gt, b + 0.45, 0.4)) * (1 - L.ease.inCubic(L.prog(v.gt, b + 1.55, 0.45)));
  void k8;   // (the dive back in now goes through the loupe: no second reticle)
  return v.gt < b ? k7 : 0;
}

/** Mutes the red cell column (s02, drawn below) so the atom line is the one focal point: desaturate + darken,
 *  clipped to the landed cell discs so the hair around them is untouched. */
function muteCells(ctx, v) {
  const a = ST(v, 7), b = ST(v, 8);
  const k = L.ease.inOutCubic(L.prog(v.gt, a + 0.3, 0.6)) * (1 - L.ease.inOutCubic(L.prog(v.gt, b + 1.0, 0.5)));
  const r = v.ws(3.5e-6);
  if (k <= 0.002 || r < 1) return;
  const x = v.wx(0);
  if (x < -r * 2 || x > L.W + r * 2) return;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < N_CELLS; i++) {
    const y = v.wy(cellY(i));
    if (y < -r * 2 || y > L.H + r * 2) continue;
    ctx.moveTo(x + r * 1.04, y); ctx.arc(x, y, r * 1.04, 0, Math.PI * 2);
  }
  ctx.clip();
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = L.rgba([128, 128, 128], 0.6 * k);
  ctx.fillRect(x - r * 1.1, 0, r * 2.2, L.H);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = L.rgba([178, 182, 186], k);
  ctx.fillRect(x - r * 1.1, 0, r * 2.2, L.H);
  ctx.restore();
}

function drawReticle(ctx, v, k) {
  if (k <= 0.002) return;
  const h = heroScreen(v);
  if (h.x < -100 || h.x > L.W + 100 || h.y < -100 || h.y > L.H + 100) return;
  const r = Math.max(h.r * 1.45, 26) + 2 * Math.sin(v.gt * 4);
  const rot = v.gt * 0.6;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.lineCap = 'round';
  ctx.strokeStyle = L.rgba(v.accent, 0.9);
  ctx.shadowColor = L.rgba(v.accent, 0.8);
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  // four arcs with gaps + outer ticks: a calm "tracking" reticle
  for (let i = 0; i < 4; i++) {
    const a0 = rot + i * Math.PI / 2 + 0.22, a1 = rot + (i + 1) * Math.PI / 2 - 0.22;
    ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(0, r), a0, a1); ctx.stroke();
    const at = rot + i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(h.x + Math.cos(at) * (r + 5), h.y + Math.sin(at) * (r + 5));
    ctx.lineTo(h.x + Math.cos(at) * (r + 14), h.y + Math.sin(at) * (r + 14));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  if (h.r < 6) {                             // the atom itself is sub-pixel: show it as a bright point
    ctx.fillStyle = L.rgba([230, 255, 248], 0.95);
    ctx.beginPath(); ctx.arc(h.x, h.y, 2.6, 0, Math.PI * 2); ctx.fill();
    L.lightBlob(ctx, h.x, h.y, 24, v.accent, 0.7);
  }
  ctx.restore();
}

function drawLine(ctx, v, g) {
  if (g <= 0.001) return;
  const x = v.wx(P.atom.x);
  const y0 = v.wy(L.lerp(P.atom.y, -HAIR, g)), y1 = v.wy(L.lerp(P.atom.y, HAIR, g));
  if (y1 - y0 < 1 || x < -50 || x > L.W + 50) return;
  const landed = L.prog(v.gt, ST(v, 7) + T_GROW + D_GROW - 0.05, 0.9);
  const flash = landed > 0 && landed < 1 ? Math.sin(Math.PI * landed) : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // glow
  ctx.strokeStyle = L.rgba(v.accent, 0.07 + 0.1 * flash);
  ctx.lineWidth = 46;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  ctx.strokeStyle = L.rgba(v.accent, 0.16 + 0.14 * flash);
  ctx.lineWidth = 20;
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  ctx.strokeStyle = L.rgba(v.accent, 0.28 + 0.2 * flash);
  ctx.lineWidth = 7;
  ctx.stroke();
  // beaded core: a dense chain of points, a shimmer wave travelling along it
  const step = 4.5;
  const n = Math.floor((y1 - y0) / step);
  const wave = v.gt * 420;
  ctx.fillStyle = L.rgba([225, 255, 245], 0.9);
  for (let i = 0; i <= n; i++) {
    const y = y0 + i * step;
    const w = 0.55 + 0.45 * Math.sin((y - wave) * 0.025) + 0.25 * L.noise1(i * 0.7 + v.gt * 3, 9);
    const r = 1.2 + 0.7 * L.clamp(w);
    ctx.globalAlpha = L.clamp(0.45 + 0.5 * w);
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // end caps: once it lands the line becomes a measuring bar, edge to edge
  const cap = L.ease.outBack(L.prog(v.gt, ST(v, 7) + T_BRACKET, 0.45), 2);
  if (cap > 0) {
    ctx.fillStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.4), 0.95);
    for (const y of [y0, y1]) ctx.fillRect(x - 16 * cap, y - 1.5, 32 * cap, 3);
  }
  // growing heads
  if (g < 0.999) {
    for (const y of [y0, y1]) {
      L.lightBlob(ctx, x, y, 34, v.accent, 0.7);
      ctx.fillStyle = 'rgba(240,255,250,0.95)';
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Loupe chain phase (in atom spacings) during beat 7: the chain scrolls slowly (there are 500,000 of them). */
export const LOUPE = { x: 845, y: 830, R: 112, ar: 27, speed: 26 / (27 * 1.9) };

/**
 * Loupe: a circular magnified view of the line, showing atoms stacked side by side.
 * o: { R, ar, phase, leader (0..1), body (lens fill alpha), hero (0..1: tint the centre atom as the hero) }.
 * s08 reuses it as the match-cut: the lens grows to fill the frame and its centre atom becomes the hero atom.
 */
export function drawLoupe(ctx, v, k, x, y, o = {}) {
  if (k <= 0.002) return;
  const e = L.ease.outBack(L.clamp(k), 1.3);
  const R = (o.R ?? LOUPE.R) * e;
  if (R < 2) return;
  const ar = (o.ar ?? LOUPE.ar) * e, gap = ar * 1.9;
  const phase = o.phase ?? (((v.gt * LOUPE.speed) % 1) + 1) % 1;
  const leader = o.leader ?? 1, body = o.body ?? 0.92, hero = o.hero ?? 0;
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.5);
  // leader from the line to the loupe
  if (leader > 0.01) {
    const lx = v.wx(P.atom.x), ly = LOUPE.y + 40;
    ctx.save();
    ctx.globalAlpha *= leader;
    ctx.strokeStyle = L.rgba(v.accent, 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx + 8, ly); ctx.lineTo(x - R * Math.cos(0.32), y + R * Math.sin(0.32)); ctx.stroke();
    ctx.fillStyle = L.rgba(v.accent, 0.9);
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // lens body
  ctx.save();
  ctx.globalAlpha *= body;
  ctx.fillStyle = 'rgb(3,10,14)';
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, 'rgba(40,110,120,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
  // a vertical chain of atoms (atom n sits at y + (n + phase) * gap)
  const spr = atomSprite(C_O, 0, ar > 40), sz = ar * ATOM_SPRITE_SCALE;
  const n0 = Math.floor((-R - gap) / gap - phase), n1 = Math.ceil((R + gap) / gap - phase);
  for (let n = n0; n <= n1; n++) {
    const yy = y + (n + phase) * gap;
    ctx.drawImage(spr, x - sz / 2, yy - sz / 2, sz, sz);
    if (n === (o.heroN ?? 0) && hero > 0.003) {
      ctx.save();
      ctx.globalAlpha *= hero;
      ctx.drawImage(atomSprite(C_HERO, 0, ar > 40), x - sz / 2, yy - sz / 2, sz, sz);
      ctx.restore();
    }
  }
  // inner vignette for a glass feel (fades as the lens becomes the whole frame)
  const vg = ctx.createRadialGradient(x, y, R * 0.55, x, y, R);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${0.65 * (o.vignette ?? 1)})`);
  ctx.fillStyle = vg;
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
  ctx.restore();
  // rim + glint
  const rimA = o.rim ?? 1;
  ctx.strokeStyle = L.rgba(v.accent, 0.85 * rimA);
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.35 * rimA})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, R - 7), -2.6, -1.9); ctx.stroke();
  ctx.restore();
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Half a million', sub: 'Back out to the hair' },
  captions: true,
  layer: 1,
  cues() {
    return [
      { t: 0.15, name: 'riser', gain: 0.18, pitch: 0.8 },
      { t: 0.55, name: 'whoosh', gain: 0.26, pitch: 0.7 },
      { t: T_GROW - 0.05, name: 'swell', gain: 0.16, pitch: 1.1 },
      { t: T_COUNT + 0.05, name: 'count', gain: 0.24, pitch: 0.95 },
      { t: T_GROW + 0.95, name: 'count', gain: 0.22, pitch: 1.1 },
      { t: T_LOUPE + 0.1, name: 'blip', gain: 0.15, pitch: 1.3 },
      { t: T_GROW + D_GROW, name: 'impact', gain: 0.3, pitch: 1.15 },
      { t: T_BRACKET, name: 'tick', gain: 0.2, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.gt < ST(v, 7) - 0.1 || v.gt > ST(v, 8) + 2.3) return;
    muteCells(ctx, v);
    drawLine(ctx, v, lineK(v));
    drawReticle(ctx, v, reticleK(v));
  },
  drawOverlay(ctx, v) {
    const out = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.2, 0.25));
    const g = L.ease.inOutCubic(L.prog(v.t, T_GROW, D_GROW));
    const kl = Math.min(v.k, L.prog(v.t, T_COUNT, 0.45)) * out;
    // the loupe stays up to the cut: at beat 8's start s08 takes it over and grows it into the frame
    if (v.gt < ST(v, 8)) drawLoupe(ctx, v, L.prog(v.t, T_LOUPE, 0.55), LOUPE.x, LOUPE.y);
    // the counter is evaluated at the frame's own time (every motion-blur sub-frame shows the same integer),
    // climbs in whole thousands and eases into exactly 500,000
    const tf = Math.round(v.gt * 30) / 30 - ST(v, 7);
    // (it starts on the words, before the row grows, and lands with the row)
    const gq = L.smoothstep(L.prog(tf, T_COUNT, T_GROW + D_GROW + 0.1 - T_COUNT));
    const n = gq >= 0.999 ? COUNT : Math.max(1000, Math.min(COUNT - 1000, Math.round(COUNT * gq / 1000) * 1000));
    L.bigLabel(ctx, { x: 110, y: 430, big: `≈ ${L.fmt(n)}`, small: 'atoms across one hair', k: kl, accent: v.accent, size: 112 });
  },
};
