// Beat 1 — "Randy Gardner was a high-school student in San Diego. | It was a science-fair project."
// The log strip wipes in (env). Stage right: a science-fair trifold board on a table (world space) unfolds as the beat
// opens; its title band lights violet on "science-fair". Lower zone: a cream notebook card (the subject sheet), three
// typed rows landing on their words: SUBJECT RANDY GARDNER, 17 ("Randy") · PLACE SAN DIEGO ("San Diego") · PROJECT
// HIGH-SCHOOL SCIENCE FAIR ("science-fair"). No portrait: Randy stays the pictogram.
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, PAPER, PAPER2, INKP, GROUND, B, BE, Wd, inWorld, paperCard, tfont, exitK, collapse } from '../env.js';

const CARD = { x: 90, y: 1096, w: 900, h: 268 };
const ROWS = [
  { k: 'SUBJECT', v: 'RANDY GARDNER, 17', w: 'randy' },
  { k: 'PLACE', v: 'SAN DIEGO', w: 'san' },
  { k: 'PROJECT', v: 'HIGH-SCHOOL SCIENCE FAIR', w: 'science' },
];

/** trifold board on a small table; unfold 0..1, lit 0..1 (title band); ka = entry 0..1 (quick pop-in), ex = exitK */
export function trifold(c, unfold, lit, ka = 1, ex = { u: 0, ca: 1, pk: 0 }) {
  if (ka <= 0 || ex.u >= 1) return;
  c.save();
  const g = GROUND, tx0 = 548, tx1 = 968, top = 900;
  // in: opaque from its first frame, a quick scale-up from the table's foot; out: contents first, then the board
  const si = L.lerp(0.92, 1, L.ease.outCubic(ka));
  c.translate(758, g); c.scale(si, si); c.translate(-758, -g);
  collapse(c, 758, 800, ex.pk);
  // table
  c.fillStyle = 'rgb(52,58,92)';
  c.fillRect(tx0, top, tx1 - tx0, 18);
  c.fillStyle = 'rgb(40,45,74)';
  c.fillRect(tx0 + 20, top + 18, 14, g - top - 18); c.fillRect(tx1 - 34, top + 18, 14, g - top - 18);
  // board: centre panel + two angled wings (they swing open with `unfold`)
  const cx0 = 668, cx1 = 848, by0 = 612, by1 = top;
  const wing = 112 * L.ease.outCubic(unfold), skew = 26 * L.ease.outCubic(unfold);
  c.fillStyle = L.rgba(PAPER2);
  c.beginPath(); c.moveTo(cx0, by0); c.lineTo(cx0 - wing, by0 + skew); c.lineTo(cx0 - wing, by1); c.lineTo(cx0, by1); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(cx1, by0); c.lineTo(cx1 + wing, by0 + skew); c.lineTo(cx1 + wing, by1); c.lineTo(cx1, by1); c.closePath(); c.fill();
  c.fillStyle = L.rgba(PAPER);
  c.fillRect(cx0, by0, cx1 - cx0, by1 - by0);
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(cx0 - 2, by0, 3, by1 - by0); c.fillRect(cx1 - 1, by0, 3, by1 - by0);
  c.globalAlpha *= ex.ca;
  // title band, with its title in tiny paper type
  c.fillStyle = L.rgba(L.mix(INKP, VIOLET, 0.75 * lit));
  c.fillRect(cx0 + 12, by0 + 14, cx1 - cx0 - 24, 46);
  if (lit > 0.01) L.lightBlob(c, (cx0 + cx1) / 2, by0 + 37, 160, VIOLET, 0.18 * lit);
  c.save();
  c.fillStyle = L.rgba(PAPER);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const bt = ['HOW LONG CAN WE', 'STAY AWAKE?'];
  const bs = Math.min(...bt.map((t) => L.fitSize(c, t, cx1 - cx0 - 40, 16, 800, L.FONT.display, 9)));
  c.font = L.font(bs, 800, L.FONT.display);
  c.fillText(bt[0], (cx0 + cx1) / 2, by0 + 35);
  c.fillText(bt[1], (cx0 + cx1) / 2, by0 + 35 + bs * 1.05);
  c.restore();
  // centre: a little line chart (falling) on axes
  c.strokeStyle = L.rgba(INKP); c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(cx0 + 26, by0 + 84); c.lineTo(cx0 + 26, by0 + 200); c.lineTo(cx1 - 22, by0 + 200); c.stroke();
  c.strokeStyle = L.rgba(VIOLET.map((q) => q * 0.75)); c.lineWidth = 4;
  c.beginPath();
  [[0, 0.1], [0.2, 0.18], [0.4, 0.34], [0.6, 0.5], [0.8, 0.72], [1, 0.86]].forEach(([u, w], i) => {
    const x = cx0 + 40 + u * (cx1 - cx0 - 74), y = by0 + 92 + w * 96;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  c.stroke();
  // centre bottom: typed lines
  c.fillStyle = L.rgba(INKP, 0.55);
  for (let i = 0; i < 3; i++) c.fillRect(cx0 + 26, by0 + 226 + i * 18, (cx1 - cx0 - 52) * (i === 2 ? 0.6 : 1), 5);
  // wings: a clock doodle (left), a crescent moon (right) — only once open
  if (unfold > 0.6) {
    const a = L.clamp((unfold - 0.6) / 0.4);
    c.globalAlpha *= a;
    const lx = cx0 - wing / 2, rx = cx1 + wing / 2;
    c.strokeStyle = L.rgba(INKP); c.lineWidth = 3;
    c.beginPath(); c.arc(lx, by0 + 110, 30, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(lx, by0 + 110); c.lineTo(lx, by0 + 90); c.moveTo(lx, by0 + 110); c.lineTo(lx + 14, by0 + 118); c.stroke();
    c.fillStyle = L.rgba(INKP);
    c.beginPath(); c.arc(rx, by0 + 110, 28, 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba(PAPER2);
    c.beginPath(); c.arc(rx + 12, by0 + 100, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba(INKP, 0.5);
    for (const x of [lx, rx]) for (let i = 0; i < 4; i++) c.fillRect(x - 32, by0 + 170 + i * 20, 64 * (i === 3 ? 0.6 : 1), 4);
  }
  c.restore();
}

export default {
  beat: 1,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 2,
  drawWorld(c, v) {
    const tl = v.tl, gt = v.gt;
    // in at B1 (the hook's clock has finished its exit by B1 − 0.05); out by B2 − 0.05, just before the eye comes in
    const ka = L.prog(gt, B(tl, 1), 0.35);
    const ex = exitK(gt, B(tl, 2, -0.05), 0.3);
    if (ka <= 0 || ex.u >= 1) return;
    const unfold = L.prog(gt, B(tl, 1, 0.0), 0.75);
    const lit = L.ease.outCubic(L.prog(gt, Wd(tl, 'science', -0.1), 0.35));
    inWorld(c, v, (g) => trifold(g, unfold, lit, ka, ex));
  },
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    const k = L.prog(gt, B(tl, 1, -0.05), 0.3);
    paperCard(c, CARD, k, (g) => {
      ROWS.forEach((r, i) => {
        const rk = L.ease.outCubic(L.prog(gt, Wd(tl, r.w, -0.12), 0.35));
        if (rk <= 0) return;
        const y = CARD.y + 84 + i * 66;
        g.save();
        g.globalAlpha *= rk;
        g.textBaseline = 'alphabetic';
        g.font = L.font(22, 700, L.FONT.body);
        g.fillStyle = L.rgba(VIOLET.map((q) => q * 0.6));
        L.trackedText(g, r.k, CARD.x + 92, y - 4, 3);
        const vs = L.fitSize(g, r.v, CARD.w - 330, 40, 700, '"American Typewriter"', 22);
        g.font = tfont(vs, 700);
        g.fillStyle = L.rgba(INKP);
        // typed on: characters appear left to right
        const n = Math.round(r.v.length * L.clamp(L.prog(gt, Wd(tl, r.w, -0.12), 0.45)));
        g.fillText(r.v.slice(0, Math.max(1, n)), CARD.x + 280 + (1 - rk) * 8, y);
        g.restore();
      });
    }, { out: exitK(gt, BE(tl, 1, -0.02), 0.3) });
  },
};
