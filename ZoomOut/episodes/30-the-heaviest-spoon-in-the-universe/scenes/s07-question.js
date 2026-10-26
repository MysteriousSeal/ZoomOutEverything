// Beat 7 — "What's the wildest space fact you know? | Tell me in the comments."
// The star sits low under the card, beams sweeping slowly. Opaque card from its FIRST frame (overlayIn: false): it
// grows out of the beat-6 fact plate in 0.35 s to x 80–940, y 380–≈ 826, its contents fading in after: kicker YOUR TURN; headline WHAT’S THE WILDEST / SPACE
// FACT YOU KNOW? (one shared fitted size, SPACE FACT in the accent); TELL ME IN THE COMMENTS + a bobbing drawn arrow
// on phrase 1. Holds to the end. Captions off.
import * as L from '../../../../engine/runtime/lib.js';
import { phrase } from '../env.js';
import { PLATE } from './s06-marshmallow.js';

const { W, H, ease, prog } = L;
const CARD = { x: 80, w: 860, pad: 56, top: 380 };
const INNER = CARD.w - 2 * CARD.pad;

function parts(ctx, ps, x, y, s) {
  ctx.font = L.font(s, 800, L.FONT.display);
  for (const [t, col] of ps) { ctx.fillStyle = col; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  beat: 7,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 12,
  cues(d) {
    void d;
    return [
      { t: -0.05, name: 'bloom', gain: 0.17, pitch: 1.1 },
      { t: 2.82, name: 'ping', gain: 0.2, pitch: 1.0 },   // in the gap before "Tell" (set in env-independent time; checked against the timeline)
    ];
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const p1 = phrase(v, 1);
    // the card grows out of the beat-6 fact plate (same rectangle on the first frame: a continuous hand-over, opaque
    // throughout), then its contents fade in
    const m = ease.inOutCubic(prog(t, 0, 0.35));
    const ck = ease.outCubic(prog(t, 0.15, 0.22));
    const { x: x1, w: w1, pad } = CARD;
    const white = '#fff', acc = L.rgba(v.accent);
    ctx.save();
    const bg = ctx.createLinearGradient(0, 1500, 0, H);
    bg.addColorStop(0, 'rgba(3,6,14,0)'); bg.addColorStop(0.5, 'rgba(3,6,14,0.35)'); bg.addColorStop(1, 'rgba(3,6,14,0.7)');
    ctx.save(); ctx.globalAlpha = ease.outCubic(prog(t, 0, 0.5));
    ctx.fillStyle = bg; ctx.fillRect(0, 1500, W, H - 1500);
    ctx.restore();
    const y1 = CARD.top;
    const kickY = y1 + 74;
    const h1Y = kickY + 116;
    const h2Y = h1Y + 104;
    const promptY = h2Y + 96;
    const bottom1 = promptY + 56;
    const x = L.lerp(PLATE.x, x1, m), w = L.lerp(PLATE.w, w1, m);
    const y0 = L.lerp(PLATE.y, y1, m), bottom = L.lerp(PLATE.y + PLATE.h, bottom1, m);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    ctx.fillStyle = 'rgb(7,12,28)';
    L.roundRect(ctx, x, y0, w, bottom - y0, 30);
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    const wash = ctx.createRadialGradient(x, y0, 0, x, y0, 620);
    wash.addColorStop(0, L.rgba(v.accent, 0.12)); wash.addColorStop(1, L.rgba(v.accent, 0));
    ctx.fillStyle = wash;
    L.roundRect(ctx, x, y0, w, bottom - y0, 30); ctx.fill();
    ctx.strokeStyle = L.rgba(v.accent, 0.55); ctx.lineWidth = 2;
    L.roundRect(ctx, x, y0, w, bottom - y0, 30); ctx.stroke();
    ctx.strokeStyle = L.rgba(v.accent, 0.18); ctx.lineWidth = 1;
    L.roundRect(ctx, x + 12, y0 + 12, w - 24, bottom - y0 - 24, 20); ctx.stroke();
    ctx.globalAlpha = ck;
    // contents never spill past the growing plate
    L.roundRect(ctx, x, y0, w, bottom - y0, 30); ctx.clip();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = acc; ctx.fillRect(x1 + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body); ctx.fillStyle = 'rgba(225,230,238,0.9)';
    L.trackedText(ctx, 'YOUR TURN', x1 + pad + 66, kickY, 5);
    const H1 = [['WHAT’S THE WILDEST', white]];
    const H2 = [['SPACE FACT', acc], [' YOU KNOW?', white]];
    const hs = Math.min(
      L.fitSize(ctx, 'WHAT’S THE WILDEST', INNER, 104, 800, L.FONT.display, 50),
      L.fitSize(ctx, 'SPACE FACT YOU KNOW?', INNER, 104, 800, L.FONT.display, 50));
    parts(ctx, H1, x1 + pad, h1Y, hs);
    parts(ctx, H2, x1 + pad, h2Y, hs);
    const fk = L.enter(t, p1 - 0.25, 0.45) * ck;
    if (fk > 0) {
      ctx.save();
      ctx.globalAlpha = fk;
      const ps = L.fitSize(ctx, 'TELL ME IN THE COMMENTS', INNER - 80, 40, 800, L.FONT.display, 24);
      ctx.font = L.font(ps, 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'TELL ME IN THE COMMENTS', x1 + pad, promptY + (1 - fk) * 10, 3);
      const bob = Math.sin(t * 6) * 4;
      const ax = x1 + w1 - pad - 14, ay = promptY - 14 + bob;
      ctx.strokeStyle = acc; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay + 14); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax, ay + 14); ctx.lineTo(ax + 14, ay); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
};
