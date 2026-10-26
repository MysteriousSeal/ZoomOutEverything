// Beat 7 — "Which animal scares you the most? | Tell me in the comments."
// The board slides down FIRST (env chartDy, done as the card arrives) and stays readable as the final leaderboard. Opaque card from its
// FIRST frame (overlayIn: false; it only settles 14 px / scale 0.985 → 1), x 80–1000 … ≤ 1090: kicker YOUR TURN; headline
// WHICH ANIMAL SCARES / YOU THE MOST? (one fitted size, MOST? in red); three pills A) SHARK B) SNAKE C) MOSQUITO, each
// with its silhouette (light steel, ≈ 0.7 alpha), slide in from the card's first frame and light in turn; TELL ME IN THE COMMENTS + a drawn arrow on phrase 1. Captions off.
import * as L from '../../../../engine/runtime/lib.js';
import { drawAnimal } from '../animals.js';
import { RED, PH, B } from '../env.js';

const { ease, clamp, prog } = L;
const CARD = { x: 80, w: 920, pad: 56, top: 352 };
const INNER = CARD.w - 2 * CARD.pad;
const PILL = { h: 78, gap: 16, disc: 26, textX: 88 };
const CHOICES = [
  { key: 'A', name: 'SHARK', kind: 'shark' },
  { key: 'B', name: 'SNAKE', kind: 'snake' },
  { key: 'C', name: 'MOSQUITO', kind: 'mosquito' },
];
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
  drawOverlay(ctx, v) {
    const t = v.t, tl = v.tl;
    const p0 = PH(tl, 7, 0) - B(tl, 7), p1 = PH(tl, 7, 1) - B(tl, 7);
    const settle = ease.outCubic(prog(t, 0, 0.5));
    const { x, w, pad } = CARD;
    const white = '#fff', acc = L.rgba(RED);
    ctx.save();
    const y0 = CARD.top + (1 - settle) * 14;
    const kickY = y0 + 72;
    const h1Y = kickY + 108;
    const h2Y = h1Y + 98;
    const pillsY = h2Y + 46;
    const promptY = pillsY + CHOICES.length * PILL.h + (CHOICES.length - 1) * PILL.gap + 66;
    const bottom = promptY + 40;
    const sc = L.lerp(0.985, 1, settle), cx = x + w / 2, cy = (y0 + bottom) / 2;
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    ctx.fillStyle = 'rgb(14,15,20)';
    L.roundRect(ctx, x, y0, w, bottom - y0, 30); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    const wash = ctx.createRadialGradient(x, y0, 0, x, y0, 640);
    wash.addColorStop(0, L.rgba(RED, 0.09)); wash.addColorStop(1, L.rgba(RED, 0));
    ctx.fillStyle = wash; L.roundRect(ctx, x, y0, w, bottom - y0, 30); ctx.fill();
    ctx.strokeStyle = L.rgba(RED, 0.5); ctx.lineWidth = 2;
    L.roundRect(ctx, x, y0, w, bottom - y0, 30); ctx.stroke();
    ctx.strokeStyle = 'rgba(170,184,206,0.12)'; ctx.lineWidth = 1;
    L.roundRect(ctx, x + 12, y0 + 12, w - 24, bottom - y0 - 24, 20); ctx.stroke();
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    // kicker
    ctx.fillStyle = acc;
    ctx.fillRect(x + pad, kickY - 10, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(225,230,238,0.9)';
    L.trackedText(ctx, 'YOUR TURN', x + pad + 66, kickY, 5);
    // headline
    const hs = Math.min(L.fitSize(ctx, 'WHICH ANIMAL SCARES', INNER, 100, 800, L.FONT.display, 50),
      L.fitSize(ctx, 'YOU THE MOST?', INNER, 100, 800, L.FONT.display, 50));
    parts(ctx, [['WHICH ANIMAL SCARES', white]], x + pad, h1Y, hs);
    parts(ctx, [['YOU THE ', white], ['MOST?', acc]], x + pad, h2Y, hs);
    // pills
    const nameMax = INNER + 16 - PILL.textX - 150;
    const ns = Math.min(...CHOICES.map((c) => L.fitSize(ctx, c.name, nameMax, 42, 800, L.FONT.display, 26)));
    const span = Math.max(1.2, p1 - 0.5);
    CHOICES.forEach((ch, i) => {
      const tin = i * 0.2;   // the first option arrives with the plate: the card is never empty
      const k = L.enter(t, tin - 0.06, 0.4, ease.outBack);
      if (k <= 0) return;
      const litAt = 0.75 + i * span / 3;
      const lit = ease.outCubic(prog(t, litAt, 0.22)) * (1 - ease.inOutCubic(prog(t, litAt + span / 3 - 0.15, 0.3)));
      const ry = pillsY + i * (PILL.h + PILL.gap);
      const px = x + pad - 8, pw = INNER + 16;
      ctx.save();
      ctx.globalAlpha = clamp(k * 3);   // near-opaque from its first frames: it slides, it doesn't ghost
      ctx.translate((1 - clamp(k)) * -30, 0);
      ctx.fillStyle = 'rgb(26,27,33)';
      L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2); ctx.fill();
      if (lit > 0.01) { ctx.fillStyle = L.rgba(RED, 0.14 * lit); L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2); ctx.fill(); }
      ctx.strokeStyle = lit > 0.01 ? L.rgba(L.mix([255, 255, 255], RED, lit), 0.16 + 0.74 * lit) : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1.5 + 1.5 * lit;
      L.roundRect(ctx, px, ry, pw, PILL.h, PILL.h / 2); ctx.stroke();
      const dcx = px + PILL.h / 2, dcy = ry + PILL.h / 2;
      if (lit > 0.01) L.lightBlob(ctx, dcx, dcy, 70, RED, 0.32 * lit);
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(dcx, dcy, Math.max(0, PILL.disc * (1 + 0.08 * lit)), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgb(18,8,10)';
      ctx.font = L.font(30, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillText(ch.key, dcx, dcy + 11);
      ctx.textAlign = 'left';
      ctx.fillStyle = white;
      ctx.font = L.font(ns, 800, L.FONT.display);
      ctx.fillText(ch.name, px + PILL.textX, dcy + ns * 0.36);
      // the animal, right-aligned in the pill
      drawAnimal(ctx, ch.kind, { x: px + pw - 100, y: dcy, w: ch.kind === 'mosquito' ? 90 : 130, h: ch.kind === 'mosquito' ? 56 : 54, t: v.gt, tint: [176, 186, 202, 0.7] });
      ctx.restore();
    });
    // prompt
    const fk = L.enter(t, p1 - 0.25, 0.45);
    if (fk > 0) {
      ctx.save();
      ctx.globalAlpha = fk;
      const ps = L.fitSize(ctx, 'TELL ME IN THE COMMENTS', INNER - 90, 38, 800, L.FONT.display, 24);
      ctx.font = L.font(ps, 800, L.FONT.display);
      ctx.fillStyle = acc;
      L.trackedText(ctx, 'TELL ME IN THE COMMENTS', x + pad, promptY + (1 - fk) * 10, 3);
      const bob = Math.sin(t * 6) * 4;
      const ax = x + w - pad - 14, ay = promptY - 14 + bob;
      ctx.strokeStyle = acc; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay + 14); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax, ay + 14); ctx.lineTo(ax + 14, ay); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    void p0;
  },
};
