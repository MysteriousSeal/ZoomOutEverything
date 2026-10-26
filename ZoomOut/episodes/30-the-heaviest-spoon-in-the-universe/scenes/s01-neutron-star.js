// Beat 1 — "It's a neutron star: | what's left when a giant star dies and its core collapses."
// drawWorld (whole film): THE neutron star at true scale (R = 10 km) — white-blue body, thin bright crust, magnetic
//   field lines and two pulsar beams (env.drawStar); its dress (field, beams, fast spin) follows env.starState.
//   Beat 1 extras: on "core collapses" two shock rings implode onto the star and it flares once (soft, no strobe).
// drawOverlay: SUPERNOVA REMNANT label + leader to the faint shell behind (env background) on phrase 1.
import * as L from '../../../../engine/runtime/lib.js';
import { at as camAt, B } from '../camera.js';
import { R, drawStar, starState, wordGt, remnantK, remnantFilament, chapterGate } from '../env.js';

const { W, H } = L;
const CH = { num: '01', title: 'Neutron star', sub: 'The collapsed core of a giant star' };
const LBL = { x: 72, y: 420 };   // SUPERNOVA REMNANT label (baseline of the first line)
// the true-scale pull-outs (spoon → star): the star's limb sweeps into the frame within a frame or two, so the whole
// star ramps in over 0.4 s (12 frames) from the moment its limb first enters the frame: no single-frame luminance jump
let ENTER = null;
function enterTimes(tl) {
  if (ENTER) return ENTER;
  ENTER = [B(1, -0.35)(tl), B(5, -0.5)(tl)].map((t0) => {
    for (let t = t0; t < t0 + 2; t += 1 / 240) {
      const c = camAt(t, tl);
      if (H / 2 + (0 - c.y) / c.mpp - R / c.mpp < H + 40) return t;
    }
    return t0;
  });
  return ENTER;
}
function rampK(gt, tl) {
  let k = 1;
  for (const te of enterTimes(tl)) if (gt > te - 0.6 && gt < te + 0.4) k = Math.min(k, L.smoothstep(L.clamp((gt - te) / 0.4)));
  return k;
}
/** remnant label visibility (0..1) */
function labelK(v) {
  const t0 = wordGt(v.tl, 1, 1, 4) - v.tl.scenes[1].start;   // "giant"
  return L.enter(v.gt - v.tl.scenes[1].start, t0, 0.5) * L.clamp(remnantK(v.gt, v.tl) * 1.5);
}

export default {
  beat: 1,
  get chapter() { return chapterGate(1, 0.24) ? CH : null; },   // no empty tile: the card first shows with its number
  layer: 4,
  cues(d) {
    void d;
    return [];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl;
    const cx = v.wx(0), cy = v.wy(0), r = v.ws(R);
    const st = starState(gt, tl);
    // core collapse: rings implode, then one soft flare
    const tc = wordGt(tl, 1, 1, 9) - 0.1;
    const kc = L.prog(gt, tc, 0.7);
    const flare = Math.exp(-Math.max(0, gt - tc - 0.7) / 0.35) * (gt > tc + 0.62 ? L.smoothstep(L.prog(gt, tc + 0.62, 0.08)) : 0);
    // over the city (beat 2) the star turns into a see-through disc with a bright outline, so the city reads through it
    const lk = labelK(v);
    drawStar(c, cx, cy, r, {
      alpha: rampK(gt, tl),
      phase: st.phase, field: st.field, beams: st.beams, fast: st.fast, glow: (1 + 0.6 * flare) * (1 - 0.65 * st.above),
      body: 1 - 0.72 * st.above, outline: st.above,
      avoid: lk > 0 ? [{ x: LBL.x - 24, y: LBL.y - 44, w: 420, h: 100, a: 0.85 * lk }] : [],
    });
    if (kc > 0 && kc < 1 && r > 20) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const k = L.clamp(kc * 1.15 - i * 0.15);
        if (k <= 0 || k >= 1) continue;
        const rr = r * L.lerp(4.2, 1.02, L.ease.inCubic(k));
        c.strokeStyle = `rgba(170,210,255,${0.5 * Math.sin(Math.PI * k)})`;
        c.lineWidth = 3 + 6 * (1 - k);
        c.shadowColor = 'rgba(120,180,255,0.9)'; c.shadowBlur = 20;
        c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    }
    if (flare > 0.01) {
      c.save(); c.globalCompositeOperation = 'lighter';
      L.lightBlob(c, cx, cy, Math.max(0, r * 3), [200, 225, 255], 0.35 * flare);
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const k = labelK(v) * v.k;
    if (k <= 0) return;
    // leader target: a bright filament of the remnant's inner shell (found in the pre-rendered shell)
    const rx = L.lerp(W / 2, v.wx(0), 0.12), ry = L.lerp(H * 0.46, v.wy(0), 0.12);
    const f = remnantFilament();
    const px = rx + f.dx, py = ry + f.dy;
    const t0 = wordGt(v.tl, 1, 1, 4) - v.tl.scenes[1].start;
    c.save();
    c.globalAlpha *= k;
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(2,6,14,0.9)'; c.shadowBlur = 12;
    c.font = L.font(30, 700, L.FONT.body);
    c.fillStyle = 'rgba(236,240,248,0.95)';
    const lx = LBL.x, ly = LBL.y;
    L.trackedText(c, 'SUPERNOVA REMNANT', lx, ly, 3);
    c.font = L.font(24, 500, L.FONT.body);
    c.fillStyle = 'rgba(190,200,220,0.9)';
    L.trackedText(c, 'debris of the exploded star', lx, ly + 34, 0.5);
    c.shadowBlur = 0;
    // leader: from under the label to the filament
    const e = L.ease.outCubic(L.prog(v.t, t0 + 0.2, 0.5));
    const x1 = lx + 8, y1 = ly + 52;
    c.strokeStyle = 'rgba(220,228,240,0.8)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(L.lerp(x1, px, e), L.lerp(y1, py, e)); c.stroke();
    c.fillStyle = 'rgba(220,228,240,0.9)';
    c.beginPath(); c.arc(x1, y1, 4, 0, Math.PI * 2); c.fill();
    if (e > 0.98) {
      c.strokeStyle = 'rgba(230,236,246,0.9)'; c.lineWidth = 2;
      c.beginPath(); c.arc(px, py, 7, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  },
};
