// Beat 8 (03b) — the closing question, over the held final reveal: "How deep would you go? Scuba, the Titanic, or the
// very bottom? Tell me in the comments." A glass card with three choices (each with its real depth, matching the
// dive), entering on the words, then the comment prompt. A choice question is easy to answer, which drives comments.
import * as L from '../../../../engine/runtime/lib.js';

const { W, ease, clamp, prog } = L;
const CHOICES = [
  { key: 'A', name: 'SCUBA', depth: '332 m', at: 0 },            // "Scuba,"
  { key: 'B', name: 'THE TITANIC', depth: '3,800 m', at: 0.28 }, // "the Titanic,"
  { key: 'C', name: 'THE VERY BOTTOM', depth: '10,935 m', at: 0.62 },   // "or the very bottom?"
];
const CARD = { x: 80, y: 520, w: 860, h: 770 };   // inside the Shorts-safe area (x ≤ 960, y ≤ 1500)

/** phrase i of this beat's line, in beat-relative seconds */
function phrase(v, i) {
  const ln = v.tl.lines[v.index], s = v.tl.scenes[v.index].start;
  const p = (ln.phrases ?? [ln])[Math.min(i, (ln.phrases ?? [ln]).length - 1)];
  return { start: p.start - s, end: p.end - s };
}

export default {
  beat: 8,
  chapter: null,
  captions: false,
  layer: 3,
  cues(d) {
    return [
      { t: 0.05, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: 1.9, name: 'blip', gain: 0.22, pitch: 1.0 },
      { t: 2.6, name: 'blip', gain: 0.22, pitch: 1.12 },
      { t: 3.4, name: 'blip', gain: 0.22, pitch: 1.25 },
      { t: 4.6, name: 'ping', gain: 0.25, pitch: 1.0 },
    ];
  },
  drawOverlay(ctx, v) {
    const p0 = phrase(v, 0), p1 = phrase(v, 1), p2 = phrase(v, 2);
    const ck = ease.outCubic(prog(v.t, 0.0, 0.45)) * v.k;
    if (ck <= 0) return;
    const { x, y, w, h } = CARD;
    ctx.save();
    // dim the scene a touch so the card owns the frame
    ctx.globalAlpha = ck * 0.45;
    ctx.fillStyle = '#02060c';
    ctx.fillRect(0, 0, W, L.H);
    // glass card
    ctx.globalAlpha = ck;
    const lift = (1 - ck) * 30;
    ctx.fillStyle = 'rgba(4,12,22,0.86)';
    L.roundRect(ctx, x, y + lift, w, h, 30);
    ctx.fill();
    ctx.strokeStyle = L.rgba(v.accent, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
    // kicker
    ctx.fillStyle = L.rgba(v.accent);
    ctx.fillRect(x + 56, y + lift + 64, 48, 6);
    ctx.font = L.font(26, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(220,232,242,0.9)';
    ctx.textBaseline = 'alphabetic';
    L.trackedText(ctx, 'YOUR TURN', x + 122, y + lift + 74, 5);
    // headline: HOW DEEP WOULD / YOU GO?
    const hk = L.enter(v.t, Math.max(0, p0.start - 0.1), 0.45);
    ctx.globalAlpha = ck * hk;
    // fit inside the card's inner width (56 px margins), never past its border
    const hs = L.fitSize(ctx, 'HOW DEEP WOULD', w - 112, 104, 800, L.FONT.display, 60);
    ctx.font = L.font(hs, 800, L.FONT.display);
    ctx.fillStyle = '#fff';
    ctx.fillText('HOW DEEP WOULD', x + 56, y + lift + 196 + (1 - hk) * 14);
    const wy = ctx.measureText('YOU').width;
    ctx.fillStyle = L.rgba(v.accent);
    ctx.fillText('YOU', x + 56, y + lift + 296 + (1 - hk) * 14);
    ctx.fillStyle = '#fff';
    ctx.fillText(' GO?', x + 56 + wy, y + lift + 296 + (1 - hk) * 14);
    // choices, entering on their words
    CHOICES.forEach((c, i) => {
      const t0 = p1.start + c.at * (p1.end - p1.start) - 0.05;
      const k = L.enter(v.t, t0, 0.4, ease.outBack);
      if (k <= 0) return;
      const ry = y + lift + 352 + i * 92;
      ctx.globalAlpha = ck * clamp(k);
      ctx.save();
      ctx.translate((1 - clamp(k)) * -30, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      L.roundRect(ctx, x + 48, ry, w - 96, 74, 37);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // letter disc
      ctx.fillStyle = L.rgba(v.accent);
      ctx.beginPath(); ctx.arc(x + 48 + 37, ry + 37, 25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#04121c';
      ctx.font = L.font(30, 800, L.FONT.display);
      ctx.textAlign = 'center';
      ctx.fillText(c.key, x + 48 + 37, ry + 48);
      // name + depth
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = L.font(40, 800, L.FONT.display);
      ctx.fillText(c.name, x + 48 + 84, ry + 51);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(205,220,232,0.9)';
      ctx.font = L.font(34, 700, L.FONT.din);
      ctx.fillText(c.depth, x + w - 48 - 30, ry + 50);
      ctx.restore();
    });
    // comment prompt
    const fk = L.enter(v.t, p2.start - 0.05, 0.45);
    if (fk > 0) {
      ctx.globalAlpha = ck * fk;
      ctx.textAlign = 'left';
      ctx.font = L.font(34, 800, L.FONT.display);
      ctx.fillStyle = L.rgba(v.accent);
      const msg = 'TELL ME IN THE COMMENTS';
      L.trackedText(ctx, msg, x + 56, y + lift + h - 48 + (1 - fk) * 10, 3);
      // a small down arrow, pointing at the comment button area below
      const bob = Math.sin(v.t * 6) * 4;
      const ax = x + w - 80, ay = y + lift + h - 70 + bob;
      ctx.strokeStyle = L.rgba(v.accent);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay + 14); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax, ay + 14); ctx.lineTo(ax + 14, ay); ctx.stroke();
    }
    ctx.restore();
  },
};
