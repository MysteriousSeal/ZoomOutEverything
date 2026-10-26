// Beat 6 — "And an atom? | About a tenth of a nanometer."
// The camera dives into the helix until the ribbon resolves into space-filling atoms (drawn by s05's strand).
// On "an atom?" one outer phosphate oxygen at P.atom lights up in the accent colour with a ping ring, the
// neighbours step back, and a width bracket + label land under it on "a tenth of a nanometer".
import * as L from '../../../../engine/runtime/lib.js';
import { heroScreen } from './s05-dna.js';

const T_LIT = 0.7;          // matches s05 heroLit (beat time)
const T_BRACKET = 1.55, T_LABEL = 1.75;

/** Horizontal width bracket under the atom, drawn from the centre outwards. */
function widthBracket(ctx, v, h, k) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  const y = h.y + h.r + 30, x0 = h.x - h.r, x1 = h.x + h.r;
  const a = L.lerp(h.x, x0, e), b = L.lerp(h.x, x1, e);
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 2);
  ctx.lineCap = 'round';
  // faint drop lines from the atom's edges to the bracket
  ctx.strokeStyle = L.rgba(v.accent, 0.45 * L.clamp(k * 2 - 1));
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(x0, h.y); ctx.lineTo(x0, y); ctx.moveTo(x1, h.y); ctx.lineTo(x1, y); ctx.stroke();
  ctx.setLineDash([]);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(a, y); ctx.lineTo(b, y);
    if (e > 0.98) { ctx.moveTo(x0, y - 12); ctx.lineTo(x0, y + 12); ctx.moveTo(x1, y - 12); ctx.lineTo(x1, y + 12); }
  };
  ctx.strokeStyle = 'rgba(0,8,12,0.6)';
  ctx.lineWidth = 8;
  path(); ctx.stroke();
  ctx.strokeStyle = L.rgba(L.mix(v.accent, [255, 255, 255], 0.25));
  ctx.lineWidth = 3.5;
  path(); ctx.stroke();
  ctx.restore();
}

/** Soft dark pool behind the label so it reads over the atoms. */
function backing(ctx, x, y, w, h, k) {
  if (k <= 0) return;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, w / 2);
  g.addColorStop(0, `rgba(2,7,10,${0.72 * k})`);
  g.addColorStop(0.6, `rgba(2,7,10,${0.5 * k})`);
  g.addColorStop(1, 'rgba(2,7,10,0)');
  ctx.translate(x, y);
  ctx.scale(1, h / w);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, y - w / 2, w, w);
  ctx.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Atom', sub: 'One on the DNA backbone' },
  captions: true,
  layer: 0,
  cues() {
    return [
      { t: 0.08, name: 'dive', gain: 0.24, pitch: 1.35 },
      { t: T_LIT, name: 'ping', gain: 0.3, pitch: 1.35 },
      { t: T_LIT + 0.05, name: 'bloom', gain: 0.14, pitch: 1.2 },
      { t: T_BRACKET, name: 'tick', gain: 0.22, pitch: 1.2 },
      { t: T_LABEL + 0.05, name: 'blip', gain: 0.2, pitch: 1.1 },
    ];
  },
  drawWorld() {},           // the atoms belong to s05's strand
  drawOverlay(ctx, v) {
    const out = 1 - L.ease.inCubic(L.prog(v.t, v.d - 0.25, 0.25));   // clear before the pull-back starts
    const h = heroScreen(v);
    const kb = Math.min(v.k, L.prog(v.t, T_BRACKET, 0.5)) * out;
    const kl = Math.min(v.k, L.prog(v.t, T_LABEL, 0.55)) * out;
    const ly = h.y + h.r + 228;
    backing(ctx, 540, ly - 20, 760, 300, L.ease.outCubic(kl));
    widthBracket(ctx, v, h, kb);
    L.bigLabel(ctx, { x: 540, y: ly, big: '≈ 0.1 nm', small: 'one atom', k: kl, accent: v.accent, align: 'center', size: 112 });
  },
};
