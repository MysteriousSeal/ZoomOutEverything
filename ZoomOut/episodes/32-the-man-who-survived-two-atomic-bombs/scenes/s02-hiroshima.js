// Beat 2 — "At eight fifteen, the bomb explodes about three kilometres away. | His eardrums burst, his skin is burned, |
// but he survives."
// Camera 'hiro': ground zero at screen (300, 1010). Phrase 0: the clock card (hands sweep 8:12 → 8:15, landing on
// "fifteen"), ONE bloom on "explodes" (env.flash), the 3 KM lens grows out of ground zero on "three": the ring draws,
// his dot lands on "kilometres". Phrase 1: the clock card retires; the injury card grows a row per injury —
// EARDRUMS (on "eardrums"), BURNS (on "burned"), TEMPORARILY BLINDED (just after); phrase 2: the SURVIVES stamp lands
// on "survives" and his dot in the lens flares.
import * as L from '../../../../engine/runtime/lib.js';
import { ACC, EMBER, IVORY, MUTED, NAVY, HIRO, moments, clockCard, flash, lens, life, lifeXf, plate, txt, tw, PH, BE, CLK } from '../env.js';

/** line icons (ivory, stroke) centred at (x, y), size s */
export function icon(c, kind, x, y, s, col = IVORY) {
  c.save();
  c.translate(x, y);
  c.strokeStyle = L.rgba(col); c.fillStyle = L.rgba(col);
  c.lineWidth = s * 0.09; c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'ear') {
    c.beginPath();
    c.moveTo(-s * 0.18, s * 0.34);
    c.bezierCurveTo(-s * 0.05, s * 0.48, s * 0.18, s * 0.38, s * 0.16, s * 0.18);
    c.bezierCurveTo(s * 0.14, s * 0.02, s * 0.32, -s * 0.04, s * 0.3, -s * 0.2);
    c.bezierCurveTo(s * 0.28, -s * 0.46, -s * 0.24, -s * 0.5, -s * 0.28, -s * 0.16);
    c.stroke();
    c.beginPath();
    c.moveTo(-s * 0.1, -s * 0.12);
    c.bezierCurveTo(-s * 0.08, -s * 0.3, s * 0.16, -s * 0.28, s * 0.12, -s * 0.1);
    c.bezierCurveTo(s * 0.1, 0, -s * 0.02, s * 0.02, 0, s * 0.12);
    c.stroke();
    // burst marks
    c.lineWidth = s * 0.07;
    for (const [x0, y0, x1, y1] of [[-0.38, -0.2, -0.52, -0.3], [-0.4, 0.02, -0.56, 0.02], [-0.38, 0.24, -0.52, 0.34]]) {
      c.beginPath(); c.moveTo(s * x0, s * y0); c.lineTo(s * x1, s * y1); c.stroke();
    }
  } else if (kind === 'flame') {
    c.beginPath();
    c.moveTo(0, s * 0.42);
    c.bezierCurveTo(-s * 0.36, s * 0.42, -s * 0.38, s * 0.02, -s * 0.16, -s * 0.18);
    c.bezierCurveTo(-s * 0.1, -s * 0.06, -s * 0.04, -s * 0.06, -s * 0.04, -s * 0.06);
    c.bezierCurveTo(-s * 0.08, -s * 0.26, 0, -s * 0.4, s * 0.06, -s * 0.46);
    c.bezierCurveTo(s * 0.1, -s * 0.24, s * 0.38, -s * 0.1, s * 0.34, s * 0.12);
    c.bezierCurveTo(s * 0.32, s * 0.34, s * 0.18, s * 0.42, 0, s * 0.42);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(0, s * 0.34);
    c.bezierCurveTo(-s * 0.14, s * 0.34, -s * 0.14, s * 0.16, -s * 0.02, s * 0.06);
    c.bezierCurveTo(s * 0.04, s * 0.14, s * 0.16, s * 0.18, s * 0.12, s * 0.28);
    c.stroke();
  } else if (kind === 'eye') {
    c.beginPath();
    c.moveTo(-s * 0.42, 0);
    c.quadraticCurveTo(0, -s * 0.36, s * 0.42, 0);
    c.quadraticCurveTo(0, s * 0.36, -s * 0.42, 0);
    c.closePath(); c.stroke();
    c.beginPath(); c.arc(0, 0, s * 0.12, 0, Math.PI * 2); c.fill();
    c.lineWidth = s * 0.09;
    c.beginPath(); c.moveTo(-s * 0.36, -s * 0.36); c.lineTo(s * 0.36, s * 0.36); c.stroke();
  }
  c.restore();
}

const TALLY = { x: 80, y: 372, w: 920, head: 74, row: 104, pad: 22 };
const ROWS = [
  { icon: 'ear', big: 'EARDRUMS', sub: 'RUPTURED', at: (m) => m.eardrums - 0.05 },
  { icon: 'flame', big: 'BURNS', sub: 'UPPER LEFT SIDE OF HIS BODY', at: (m) => m.burned - 0.05 },
  { icon: 'eye', big: 'BLINDED', sub: 'TEMPORARILY', at: (m) => m.burned + 0.75 },
];

/** the injury card: grows a row per injury; the SURVIVES stamp lands in the empty right column of the last row */
export function tally(c, v, { tIn, tOut, rows, stampAt, stamp = 'SURVIVES' }) {
  const gt = v.gt, m = moments(v.tl);
  const lf = life(gt, tIn, tOut);
  if (!lf.on) return;
  const { x, y, w, head, row, pad } = TALLY;
  // plate height eases to fit the rows that have landed
  let n = 0;
  rows.forEach((r, i) => { n += L.ease.inOutCubic(L.prog(gt, r.at(m) - 0.28, 0.28)); void i; });
  const h = head + n * row + pad;
  c.save();
  lifeXf(c, lf, x + w / 2, y + 200);
  plate(c, x, y, w, h);
  c.save();
  L.roundRect(c, x, y, w, h, 22); c.clip();
  c.globalAlpha *= lf.ck;
  c.fillStyle = L.rgba(EMBER); c.fillRect(x + 40, y + 36, 44, 6);
  txt(c, 'HIS INJURIES', x + 100, y + 48, L.font(26, 700, L.FONT.body), MUTED, { track: 6 });
  let textR = 0;   // right edge of the last row's text (the stamp keeps ≥ 20 px clear of it)
  rows.forEach((r, i) => {
    const t0 = r.at(m);
    const k = L.ease.outCubic(L.prog(gt, t0, 0.4));
    if (k <= 0) return;
    const ry = y + head + i * row;
    c.save();
    c.globalAlpha *= k;
    c.translate((1 - k) * -24, 0);
    // icon disc
    const icx = x + 40 + 34, icy = ry + row / 2;
    c.fillStyle = 'rgba(214,92,58,0.18)';
    c.beginPath(); c.arc(icx, icy, 34, 0, Math.PI * 2); c.fill();
    c.strokeStyle = L.rgba(EMBER, 0.9); c.lineWidth = 2;
    c.beginPath(); c.arc(icx, icy, 34, 0, Math.PI * 2); c.stroke();
    icon(c, r.icon, icx, icy, 48, IVORY);
    const tx = x + 40 + 68 + 30, maxW = x + w - 40 - tx;
    const bs = L.fitSize(c, r.big, maxW, 54, 800, L.FONT.display, 30);
    if (i === rows.length - 1) textR = tx + Math.max(tw(c, r.big, L.font(bs, 800, L.FONT.display)), r.sub ? tw(c, r.sub, L.font(L.fitSize(c, r.sub, maxW, 22, 600, L.FONT.body, 14), 600, L.FONT.body), 2) : 0);
    if (r.sub) {
      txt(c, r.big, tx, icy + 6, L.font(bs, 800, L.FONT.display), IVORY);
      const ss = L.fitSize(c, r.sub, maxW, 22, 600, L.FONT.body, 14);
      txt(c, r.sub, tx, icy + 38, L.font(ss, 600, L.FONT.body), MUTED, { track: 2 });
    } else txt(c, r.big, tx, icy + bs * 0.36, L.font(bs, 800, L.FONT.display), IVORY);
    // hairline between rows
    if (i > 0) { c.fillStyle = 'rgba(242,234,216,0.08)'; c.fillRect(x + 40, ry, w - 80, 1.5); }
    c.restore();
  });
  c.restore();
  // the stamp: inside the card, in the empty right column of the last row
  const sk = L.prog(gt, stampAt - 0.12, 0.32);
  if (sk > 0) {
    const e = L.ease.outBack(sk, 2.2);
    let fsz = 48;
    const room = x + w - 40 - (textR + 20);
    while (fsz > 30 && tw(c, stamp, L.font(fsz, 800, L.FONT.display), 5) + 48 > room) fsz -= 2;
    const f = L.font(fsz, 800, L.FONT.display);
    const sw = tw(c, stamp, f, 5) + 48, sh = Math.round(fsz * 1.45);
    const scx = x + w - sw / 2 - 40, scy = y + head + (rows.length - 1) * row + row / 2;
    c.save();
    c.translate(scx, scy);
    c.rotate(-0.045);
    const s2 = L.lerp(1.55, 1, L.clamp(e));
    c.scale(s2, s2);
    c.globalAlpha *= lf.ck > 0 ? 1 : 0;
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 24;
    c.fillStyle = L.rgba(ACC);
    L.roundRect(c, -sw / 2, -sh / 2, sw, sh, 12); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(12,20,36,0.5)'; c.lineWidth = 2;
    L.roundRect(c, -sw / 2 + 6, -sh / 2 + 6, sw - 12, sh - 12, 7); c.stroke();
    txt(c, stamp, 0, 3, f, NAVY, { track: 5, align: 'center', base: 'middle' });
    c.restore();
    const fl = L.prog(gt, stampAt - 0.02, 0.7);
    if (fl > 0 && fl < 1) L.lightBlob(c, scx, scy, 160 + 120 * fl, ACC, 0.2 * (1 - fl));
  }
  c.restore();
}

export default {
  beat: 2,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl, m = moments(tl), end = BE(tl, 2, -0.02);
    flash(c, v, HIRO, m.explodes);
    lens(c, v, { ll: HIRO, brg: 215, tIn: m.threeKm - 0.2, tRing: m.threeKm, tHim: W8(m), tOut: end, tSafe: m.survives1 });
    clockCard(c, v, { tIn: v.tl.scenes[2].start + 0.1, tOut: PH(tl, 2, 1, -0.12), from: [8, 12], to: [8, 15], tLand: m.eightFifteen + 0.05, place: 'HIROSHIMA', kj: '広島' });
    tally(c, v, { tIn: m.eardrums - 0.33, tOut: end, rows: ROWS, stampAt: m.survives1 });
    void CLK;
  },
};
/** his dot lands on "kilometres" */
function W8(m) { return m.threeKm + 0.3; }
