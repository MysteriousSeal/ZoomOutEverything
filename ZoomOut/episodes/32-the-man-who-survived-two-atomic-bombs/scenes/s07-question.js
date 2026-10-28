// Beat 7 — "Luckiest or unluckiest man in history? | Tell me in the comments."
// Adapted from ep 25's s07-question.js. The card is OPAQUE and fully drawn from the beat's first frame (overlayIn:
// false), with only a 0.35 s settle. Kicker YOUR CALL · headline LUCKIEST OR UNLUCKIEST / MAN IN HISTORY? · two
// choices, dim from the first frame and LIT in turn on "Luckiest" and "unluckiest" (env.moments.choices); phrase 1:
// a drawn speech bubble + TELL ME IN THE COMMENTS in the reserved footer. Camera 'ask': both cities under the card.
import * as L from '../../../../engine/runtime/lib.js';
import { moments, ACC, PLATE } from '../env.js';

const { W, ease, clamp, prog } = L;
const CARD = { x: 80, w: 920, pad: 56, top: 372 };
const INNER = CARD.w - 2 * CARD.pad;
const PILL = { h: 76, gap: 16, disc: 26, textX: 86, right: 30 };
const CHOICES = [
  { key: 'A', name: 'LUCKIEST' },
  { key: 'B', name: 'UNLUCKIEST' },
];

/** draw `parts` ([[text, colour], ...]) left-aligned from (x, y) at font size s */
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
  cues() {
    // beat-relative only; the choice + comments blips are tied to words: env.cues(tl) from env.moments
    return [{ t: 0.02, name: 'bloom', gain: 0.3, pitch: 1.0 }];
  },
  drawOverlay(ctx, v) {
    // never on a frame before the beat (the engine reaches 0.05 s early for motion-blur sub-frames: one of eight
    // sub-frames drew a 1/8-opacity card over the fading SECRET card on the frame before the beat)
    if (v.t < 0 || v.k <= 0) return;
    const st = ease.outCubic(prog(v.t, 0, 0.35));          // settle only; the card is opaque from frame 1
    const { x, w, pad } = CARD;
    const white = '#fff', acc = L.rgba(v.accent);
    const y0 = CARD.top + (1 - st) * 12;
    const kickY = y0 + 74, h1Y = kickY + 114, h2Y = h1Y + 102, pillsY = h2Y + 54;
    const footY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 40;
    const bottom = footY + 92;
    const m = moments(v.tl), b0 = v.tl.scenes[7].start;
    void ACC;
    const at = m.choices.map((t) => t - b0), tc = m.comments - b0;
    ctx.save();
    // a light dim so the card owns the frame; the globe below stays readable
    ctx.globalAlpha = 0.28 * v.k;          // v.k only on the background dim: the card + its text are always at alpha 1
    ctx.fillStyle = '#02060a';
    ctx.fillRect(0, 0, W, L.H);
    ctx.globalAlpha = 1;
    // settle: scale about the card centre
    const sc = L.lerp(0.97, 1, st), cxm = x + w / 2, cym = (y0 + bottom) / 2;
    ctx.translate(cxm, cym); ctx.scale(sc, sc); ctx.translate(-cxm, -cym);
    // card (opaque)
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40;
    ctx.fillStyle = L.rgba(PLATE);
    L.roundRect(ctx, x, y0, w, bottom - y0, 28); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = L.rgba(v.accent, 0.6); ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = L.rgba(v.accent, 0.18); ctx.lineWidth = 1;
    L.roundRect(ctx, x + 12, y0 + 12, w - 24, bottom - y0 - 24, 18); ctx.stroke();
    // kicker
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = acc;
    ctx.fillRect(x + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,230,238,0.9)';
    L.trackedText(ctx, 'YOUR CALL', x + pad + 66, kickY, 5);
    // headline (one shared size)
    const H1 = [['LUCKIEST OR UNLUCKIEST', white]], H2 = [['MAN IN ', white], ['HISTORY?', acc]];
    const hs = Math.min(
      L.fitSize(ctx, 'LUCKIEST OR UNLUCKIEST', INNER, 100, 800, L.FONT.display, 50),
      L.fitSize(ctx, 'MAN IN HISTORY?', INNER, 100, 800, L.FONT.display, 50));
    parts(ctx, H1, x + pad, h1Y, hs);
    parts(ctx, H2, x + pad, h2Y, hs);
    // choices: dim from the first frame, lit in turn, both stay lit
    const nameMax = INNER - PILL.textX - PILL.right + 8;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    CHOICES.forEach((c, i) => {
      const lit = clamp(L.enter(v.t, at[i], 0.35));
      const pop = ease.outBack(clamp(prog(v.t, at[i], 0.4)));
      const ry = pillsY + i * (PILL.h + PILL.gap);
      const px = x + pad - 8, pw = INNER + 16;
      ctx.save();
      // pill
      ctx.fillStyle = `rgba(255,255,255,${0.035 + 0.05 * lit})`;
      L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2); ctx.fill();
      ctx.strokeStyle = lit > 0 ? L.rgba(L.mix([90, 98, 104], [255, 196, 140], lit), 0.35 + 0.4 * lit) : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5 + lit;
      ctx.stroke();
      // a light sweep across the pill as it lights
      const sw = prog(v.t, at[i], 0.5);
      if (sw > 0 && sw < 1) {
        ctx.save();
        L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2); ctx.clip();
        const gx = px + pw * sw;
        const g = ctx.createLinearGradient(gx - 120, 0, gx + 40, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(gx - 120, ry, 160, PILL.h);
        ctx.restore();
      }
      // key disc
      const dcx = px + PILL.h / 2, dcy = ry + PILL.h / 2;
      if (lit > 0) L.lightBlob(ctx, dcx, dcy, 46 * lit, [255, 170, 90], 0.35 * lit);
      ctx.fillStyle = L.rgba(L.mix([70, 52, 38], v.accent, lit));
      ctx.beginPath(); ctx.arc(dcx, dcy, Math.max(0, PILL.disc * (1 + 0.16 * Math.sin(Math.PI * pop))), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lit > 0.5 ? '#0a0f12' : 'rgba(230,220,220,0.6)';
      ctx.font = L.font(30, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillText(c.key, dcx, dcy + 11);
      // name
      ctx.textAlign = 'left';
      ctx.fillStyle = L.rgba(L.mix([120, 128, 134], [255, 255, 255], lit));
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(c.name, px + PILL.textX, dcy + ns * 0.36);
      ctx.restore();
    });
    // footer: TELL ME IN THE COMMENTS (phrase 1)
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + pad, footY, INNER, 1.5);
    const fk = ease.outCubic(prog(v.t, tc, 0.45));
    if (fk > 0) {
      ctx.save();
      ctx.globalAlpha = fk;
      const fy = footY + 54, ix = x + pad + (1 - fk) * -18;
      // drawn speech bubble (Avenir has no icon glyphs)
      ctx.fillStyle = acc;
      L.roundRect(ctx, ix, fy - 34, 52, 38, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ix + 12, fy + 2); ctx.lineTo(ix + 10, fy + 14); ctx.lineTo(ix + 24, fy + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0a0f12';
      for (let d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(ix + 14 + d * 12, fy - 15, 3.2, 0, Math.PI * 2); ctx.fill(); }
      const T1 = 'TELL ME IN THE ', T2 = 'COMMENTS';
      const fs = L.fitSize(ctx, T1 + T2, INNER - 76, 44, 800, L.FONT.display, 26);
      ctx.font = L.font(fs, 800, L.FONT.display);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = white;
      ctx.fillText(T1, ix + 76, fy + fs * 0.0);
      ctx.fillStyle = acc;
      ctx.fillText(T2, ix + 76 + ctx.measureText(T1).width, fy);
      ctx.restore();
    }
    ctx.restore();
  },
};
