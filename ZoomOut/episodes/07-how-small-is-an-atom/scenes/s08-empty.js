// Beat 8 — "But here's the strange part: | an atom is almost entirely empty."
// The camera dives back in to the same hero atom. Its neighbours fade away (s05), and the solid-looking sphere
// dissolves into what an atom really is: a faint, flickering electron haze around a tiny bright nucleus, with a
// whisper-thin ring marking its edge. Almost everything inside that ring is visibly empty.
// The haze and nucleus stay in place through beats 9–11 (the stadium analogy overlays them) and turn back into
// a solid sphere as the final pull-out starts (beat 12).
import * as L from '../../../../engine/runtime/lib.js';
import { heroScreen, emptiness, hazeVis } from './s05-dna.js';
import { drawLoupe, LOUPE } from './s07-half-million.js';
import { DIVE } from '../camera.js';

const T_NUC = 2.75;              // nucleus ignites (beat time)
const T_CALL = 3.1;             // "nucleus" callout
const HAZE = [140, 205, 255];
const DOTS = 380;

const ST = (v, b) => v.tl.scenes[b].start;
const nucleusK = (v) => L.ease.outCubic(L.prog(v.gt, ST(v, 8) + T_NUC, 0.45)) * (1 - L.ease.inOutCubic(L.prog(v.gt, ST(v, 12) + 0.15, 0.6))) * hazeVis(v);

/** One "exposure" of the electron cloud: deterministic random positions for a time slot. */
function dotSlot(ctx, cx, cy, Ra, slot, alpha, spread) {
  if (alpha <= 0.003) return;
  const r = L.rng(9000 + slot * 7919);
  ctx.fillStyle = L.rgba([200, 235, 255], 1);
  for (let i = 0; i < DOTS; i++) {
    // a thin haze filling the whole sphere, thickest in the outer half, thinning past the edge
    const u = r(), a = r() * Math.PI * 2, sz = 0.8 + r() * 1.3, b = r();
    const d = (0.18 + 0.97 * Math.pow(u, 0.55)) * Ra * spread;
    ctx.globalAlpha = alpha * (0.25 + 0.6 * b) * (1 - 0.7 * L.clamp((d / Ra - 0.95) / 0.25));
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(0, sz), 0, Math.PI * 2); ctx.fill();
  }
}

function drawEmptyAtom(ctx, v, E) {
  const h = heroScreen(v);
  const Ra = h.r;
  if (Ra < 3 || h.x < -Ra * 2 || h.x > L.W + Ra * 2 || h.y < -Ra * 2 || h.y > L.H + Ra * 2) return;
  const spread = L.lerp(0.75, 1, L.ease.outCubic(E));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the faint cloud body
  const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, Ra * 1.3);
  g.addColorStop(0, L.rgba(HAZE, 0.02 * E));
  g.addColorStop(0.35, L.rgba(HAZE, 0.03 * E));
  g.addColorStop(0.68, L.rgba(HAZE, 0.09 * E));
  g.addColorStop(1, L.rgba(HAZE, 0));
  ctx.fillStyle = g;
  ctx.fillRect(h.x - Ra * 1.3, h.y - Ra * 1.3, Ra * 2.6, Ra * 2.6);
  // flickering probability dots: two crossfaded exposures (12 per second)
  const f = v.gt * 12, s0 = Math.floor(f), w = f - s0;
  dotSlot(ctx, h.x, h.y, Ra, s0, 0.6 * E * (1 - w), spread);
  dotSlot(ctx, h.x, h.y, Ra, s0 + 1, 0.6 * E * w, spread);
  ctx.restore();
  // whisper-thin edge ring
  ctx.save();
  ctx.globalAlpha = 0.34 * L.clamp(E * 1.4 - 0.4);
  ctx.strokeStyle = L.rgba(HAZE);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 7]);
  ctx.lineDashOffset = -v.gt * 6;
  ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(0, Ra), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawNucleus(ctx, v, k) {
  if (k <= 0.002) return;
  const h = heroScreen(v);
  if (h.x < -50 || h.x > L.W + 50 || h.y < -50 || h.y > L.H + 50) return;
  // while the stadium analogy is up (beats 9–11) the atom's own nucleus glow steps aside: s09 draws it to scale
  const st9 = L.ease.inOutCubic(L.prog(v.gt, ST(v, 9) + 0.2, 0.9)) * (1 - L.ease.inOutCubic(L.prog(v.gt, ST(v, 12) - 0.5, 0.5)));
  k *= 1 - 0.97 * st9;
  if (k <= 0.002) return;
  const pulse = 1 + 0.12 * Math.sin(v.gt * 3.2);
  const ig = v.gt - (ST(v, 8) + T_NUC);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  L.lightBlob(ctx, h.x, h.y, 70 * k * pulse, v.accent, 0.14 * k);
  L.lightBlob(ctx, h.x, h.y, 20 * k * pulse, [220, 255, 245], 0.75 * k);
  // fine star flare
  ctx.strokeStyle = L.rgba([220, 255, 245], 0.5 * k);
  ctx.lineWidth = 1;
  const fl = 26 * k * pulse;
  ctx.beginPath(); ctx.moveTo(h.x - fl, h.y); ctx.lineTo(h.x + fl, h.y); ctx.moveTo(h.x, h.y - fl); ctx.lineTo(h.x, h.y + fl); ctx.stroke();
  ctx.fillStyle = L.rgba([255, 255, 255], k);
  ctx.beginPath(); ctx.arc(h.x, h.y, 2.4, 0, Math.PI * 2); ctx.fill();
  // ignition ring
  if (ig > 0 && ig < 1.2) {
    const u = ig / 1.2;
    ctx.strokeStyle = L.rgba(v.accent, 0.5 * (1 - u) ** 2);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(0, 6 + 120 * L.ease.outCubic(u)), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/**
 * The dive back in is a match-cut through beat 7's loupe: the lens slides to the centre and grows until it IS the
 * frame, its chain of atoms swelling to the hero's size, while the camera makes the trip down behind it
 * (camera.js, DIVE). Then the glass dissolves and the real hero atom is under it.
 */
function drawMatchCut(ctx, v) {
  const t = v.gt - ST(v, 8);
  if (t < -0.01 || t > DIVE.reveal + DIVE.revealDur + 0.05) return;
  const u = L.ease.inOutCubic(L.prog(t, 0, DIVE.grow));
  const rv = L.ease.inOutCubic(L.prog(t, DIVE.reveal, DIVE.revealDur));
  if (rv >= 0.999) return;
  const h = heroScreen(v);
  const camIn = L.prog(t, DIVE.reveal - 0.3, 0.3);          // camera has landed: lock onto the real hero
  const tx = L.lerp(540, h.x, camIn), ty = L.lerp(0.47 * L.H, h.y, camIn);
  const x = L.lerp(LOUPE.x, tx, u), y = L.lerp(LOUPE.y, ty, u);
  const R = L.lerp(LOUPE.R, 1320, u) * (1 + 0.25 * rv);
  const arEnd = L.lerp(175, h.r, camIn);
  const ar = L.lerp(LOUPE.ar, arEnd, L.ease.inOutCubic(L.prog(t, 0.1, DIVE.grow + 0.5)));
  // the chain decelerates, then settles with one atom exactly in the centre
  const t0 = ST(v, 8), sp = LOUPE.speed;
  const p0 = ((t0 * sp) % 1 + 1) % 1;
  const tau = 0.4, run = sp * tau * (1 - Math.exp(-Math.max(0, t) / tau));
  const pInf = p0 + sp * tau;
  const phase = L.lerp(p0 + run, Math.round(pInf), L.ease.inOutCubic(L.prog(t, 0.05, 1.3)));
  ctx.save();
  ctx.globalAlpha *= 1 - rv;
  drawLoupe(ctx, v, 1, x, y, {
    R, ar, phase, heroN: -Math.round(pInf),
    leader: 1 - L.prog(t, 0, 0.25),
    body: L.lerp(0.92, 1, u),
    hero: L.ease.inOutCubic(L.prog(t, 0.6, 0.8)),
    vignette: 1 - 0.6 * u,
    rim: 1 - u * 0.5,
  });
  ctx.restore();
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'Almost empty', sub: 'Inside one atom' },
  captions: true,
  layer: 1,
  cues() {
    return [
      { t: 0.05, name: 'dive', gain: 0.3, pitch: 0.9 },
      { t: 1.9, name: 'swell', gain: 0.18, pitch: 0.9 },
      { t: 2.35, name: 'shimmer', gain: 0.22, pitch: 0.85 },
      { t: T_NUC, name: 'ping', gain: 0.32, pitch: 1.6 },
      { t: T_CALL, name: 'tick', gain: 0.16, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const E = emptiness(v) * hazeVis(v);
    if (E > 0.002) drawEmptyAtom(ctx, v, E);
    drawNucleus(ctx, v, nucleusK(v));
  },
  drawOverlay(ctx, v) {
    drawMatchCut(ctx, v);
    const k = Math.min(v.k, L.prog(v.t, T_CALL, 0.5)) * (1 - L.ease.inCubic(L.prog(v.t, v.d - 0.25, 0.25)));
    if (k <= 0) return;
    const h = heroScreen(v);
    // leader: a diagonal from the nucleus up to an elbow, then a short underline carrying the text
    const ang = -1.08, x1 = h.x + Math.cos(ang) * 16, y1 = h.y + Math.sin(ang) * 16;
    const ex = h.x + 150, ey = h.y - 290, uw = 270;
    ctx.save();
    ctx.globalAlpha *= L.clamp(k * 1.5);
    const e = L.ease.outCubic(L.clamp(k));
    const p = L.clamp(e / 0.6), q = L.clamp((e - 0.6) / 0.4);
    ctx.strokeStyle = L.rgba(v.accent, 0.85);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(L.lerp(x1, ex, p), L.lerp(y1, ey, p));
    if (q > 0) ctx.lineTo(ex + uw * q, ey);
    ctx.stroke();
    ctx.globalAlpha *= L.clamp(e * 1.6 - 0.3);
    ctx.font = L.font(30, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(235,245,250,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.textBaseline = 'alphabetic';
    L.trackedText(ctx, 'THE NUCLEUS', ex + 6, ey - 16, 3, 'left');
    ctx.font = L.font(24, 500, L.FONT.body);
    ctx.fillStyle = 'rgba(175,195,210,0.9)';
    L.trackedText(ctx, 'almost all of its mass', ex + 6, ey + 34, 0.5, 'left');
    ctx.restore();
  },
};
