// Beat 13 (05b) — closing open question, over the held final frame: "If you could meet one of those hundred and
// seventeen billion people, who would it be? Tell me in the comments."
// Layout is computed top-down from text metrics: every line is fitted to the card's inner width and every gap is
// explicit, so nothing can overflow or collide; the card is fully opaque (no world labels ghosting through).
import * as L from '../../../../engine/runtime/lib.js';
import { drawFinale } from './s09-one-more.js';

const { W, ease, prog } = L;
const CARD = { x: 80, w: 860, pad: 56, top: 780 };   // below the 1 : 13 figure; Shorts-safe: x 80–940, bottom ≈ 1265
// picture-in-picture of the finale: its label rule (y ≈ 339) lands at y 305, centred on the card (x 510), at 0.48×,
// so the hero's floor pool (y ≈ 1285 full size) ends at ≈ 759, above the card top
const PIP = { y0: 339, x1: CARD.x + CARD.w / 2, y1: 305, s: 0.48 };
const INNER = CARD.w - 2 * CARD.pad;

function phrase(v, i) {
  const ln = v.tl.lines[v.index], s0 = v.tl.scenes[v.index].start, ph = ln.phrases ?? [ln];
  const p = ph[Math.min(i, ph.length - 1)];
  return { start: p.start - s0, end: p.end - s0 };
}
/** left-aligned parts at (x, y) with a given size */
function parts(ctx, ps, x, y, size, weight = 800, family = L.FONT.display) {
  ctx.font = L.font(size, weight, family);
  for (const [t, c] of ps) { ctx.fillStyle = c; ctx.fillText(t, x, y); x += ctx.measureText(t).width; }
}

export default {
  beat: 13,
  chapter: null,
  captions: false,
  layer: 20,
  cues(d) {
    return [
      { t: 0.05, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 4.5, name: 'blip', gain: 0.22, pitch: 1.1 },
      { t: 5.9, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    // the 1 : 13 finale is drawn here from t > 0.02 on (s09's owns() hands it over then), continuously, shrinking into
    // the top band picture-in-picture so the card below never covers it; its small "for every one of us" line would be
    // ~14 px there, so it fades out as the finale shrinks
    if (v.t > 0.02) {
      const pk = ease.inOutCubic(prog(v.t, 0, 0.7)), fs = L.lerp(1, PIP.s, pk);
      ctx.save();
      ctx.translate(L.lerp(W / 2, PIP.x1, pk), L.lerp(PIP.y0, PIP.y1, pk)); ctx.scale(fs, fs); ctx.translate(-W / 2, -PIP.y0);
      drawFinale(ctx, v, { small: 1 - ease.inOutCubic(prog(v.t, 0, 0.45)) });
      ctx.restore();
    }
    const ck = ease.outCubic(prog(v.t, 0.35, 0.45)) * v.k;   // after the finale has mostly shrunk away (no overlap mid-move)
    if (ck <= 0) return;
    const { x, w, pad } = CARD;
    const lift = (1 - ck) * 30;
    const white = '#fff', acc = L.rgba(v.accent);
    const p0 = phrase(v, 0), p1 = phrase(v, 1), p2 = phrase(v, 2);
    // ---- layout
    const y0 = CARD.top + lift;
    const kickY = y0 + 74;
    const hs = Math.min(L.fitSize(ctx, 'WHO WOULD YOU', INNER, 104, 800, L.FONT.display, 50), L.fitSize(ctx, 'WANT TO MEET?', INNER, 104, 800, L.FONT.display, 50));
    const h1Y = kickY + 26 + hs * 0.86, h2Y = h1Y + hs * 1.0;
    const subS = L.fitSize(ctx, 'ANY ONE OF THE 117 BILLION PEOPLE', INNER, 32, 700, L.FONT.body, 18);
    const sub1Y = h2Y + 30 + subS, sub2Y = sub1Y + subS * 1.35;
    const promptY = sub2Y + 78, bottom = promptY + 50;   // card bottom ≈ 1299
    ctx.save();
    ctx.globalAlpha = ck * 0.2;
    ctx.fillStyle = '#05030a';
    ctx.fillRect(0, 0, W, L.H);
    ctx.globalAlpha = ck;
    ctx.fillStyle = 'rgb(12,8,12)';
    L.roundRect(ctx, x, y0, w, bottom - y0, 30);
    ctx.fill();
    ctx.strokeStyle = L.rgba(v.accent, 0.55);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = acc;
    ctx.fillRect(x + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(232,226,226,0.9)';
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    // headline on "who would it be?" … the setup line first, so it lands on the question
    const hk = L.enter(v.t, Math.max(0, p0.start - 0.1), 0.45);
    ctx.globalAlpha = ck * hk;
    parts(ctx, [['WHO WOULD YOU', white]], x + pad, h1Y + (1 - hk) * 14, hs);
    parts(ctx, [['WANT TO ', white], ['MEET', acc], ['?', white]], x + pad, h2Y + (1 - hk) * 14, hs);
    const sk = L.enter(v.t, p0.start + 0.6, 0.5);
    ctx.globalAlpha = ck * sk;
    ctx.font = L.font(subS, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,215,215,0.92)';
    ctx.fillText('ANY ONE OF THE 117 BILLION PEOPLE', x + pad, sub1Y);
    ctx.fillText('WHO HAVE EVER LIVED', x + pad, sub2Y);
    // prompt + arrow
    const fk = L.enter(v.t, p2.start - 0.05, 0.45);
    if (fk > 0) {
      ctx.globalAlpha = ck * fk;
      ctx.font = L.font(34, 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'TELL ME IN THE COMMENTS', x + pad, promptY + (1 - fk) * 10, 3);
      const bob = Math.sin(v.t * 6) * 4, ax = x + w - pad - 14, ay = promptY - 14 + bob;
      ctx.strokeStyle = acc;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay + 14); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax, ay + 14); ctx.lineTo(ax + 14, ay); ctx.stroke();
    }
    void p1;
    ctx.restore();
  },
};
