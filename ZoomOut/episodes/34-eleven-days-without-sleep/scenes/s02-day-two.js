// Beat 2 — "Day two: his eyes can't focus. | He can't tell objects apart by touch."
// DAY flips 01 → 02 on "two" (env). Phrase 0, stage right: an honest optics icon — an eye in cross-section, three
// parallel rays through the lens. Sharp: they meet ON the retina; on "focus" the focal point slides in front of the
// retina and the rays spread into a blur spot (violet bracket on the retina), while the inset "WHAT HE SEES" chart goes
// soft. Tag BLURRED VISION (on "eyes"). Phrase 1: a pictogram hand feels three objects on a table (key, block, ball);
// a violet "?" pops over each after it is touched. Tag CAN'T IDENTIFY OBJECTS BY TOUCH replaces the first.
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, PAPER, PAPER2, INKP, FIG_INK, BG, GROUND, B, BE, PH, Wd, inWorld, tag, win, tfont, exitK, collapse } from '../env.js';

const TAU = Math.PI * 2;
const EYE = { x: 730, y: 790, r: 128 };

function eyeDiagram(c, gt, tl, ka, ex) {
  if (ka <= 0 || ex.u >= 1) return;
  const { x, y, r } = EYE;
  const blur = L.ease.inOutCubic(L.prog(gt, Wd(tl, 'focus', -0.15), 0.7));
  c.save();
  // in: opaque from its first frame, a quick scale-up; out: rays first, then the eyeball collapses
  const si = L.lerp(0.9, 1, L.ease.outBack(L.clamp(ka), 1.6));
  c.translate(x, y); c.scale(si, si); c.translate(-x, -y);
  collapse(c, x, y, ex.pk);
  // eyeball
  c.fillStyle = 'rgba(30,36,70,0.9)';
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = L.rgba(PAPER, 0.9); c.lineWidth = 5;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  // cornea bulge (front = left)
  c.beginPath(); c.arc(x - r * 0.62, y, r * 0.52, Math.PI * 0.62, Math.PI * 1.38); c.stroke();
  // retina (back wall) in violet
  c.strokeStyle = L.rgba(VIOLET, 0.85); c.lineWidth = 7;
  c.beginPath(); c.arc(x, y, r - 6, -0.62, 0.62); c.stroke();
  // lens
  const lx = x - r * 0.62;
  c.fillStyle = L.rgba(PAPER, 0.85);
  c.beginPath(); c.ellipse(lx, y, 17, r * 0.42, 0, 0, TAU); c.fill();
  // optic nerve
  c.fillStyle = 'rgba(30,36,70,0.9)'; c.strokeStyle = L.rgba(PAPER, 0.9); c.lineWidth = 5;
  {
    const a0 = 0.64, a1 = 0.9, dir = 0.77, len = 52;
    c.beginPath();
    for (const a of [a0, a1]) {
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      c.moveTo(px, py); c.lineTo(px + Math.cos(dir) * len, py + Math.sin(dir) * len);
    }
    c.stroke();
  }
  c.globalAlpha *= ex.ca;   // (rays and markers fade first on the way out; the eyeball then collapses)
  // rays: parallel from the left, refracted at the lens toward F
  const retX = x + r - 8;
  const fx = L.lerp(retX, x + r * 0.08, blur);
  const rays = [-52, 0, 52];
  const rk = L.prog(gt, Wd(tl, 'eyes', -0.1), 0.6);
  c.strokeStyle = 'rgba(255,236,190,0.95)'; c.lineWidth = 3.5; c.lineCap = 'round';
  c.save();
  c.beginPath(); c.rect(0, 0, lx, 2000); c.arc(x, y, r - 9, 0, TAU); c.clip();
  for (const dy of rays) {
    const x0 = x - r - 150;
    // segment 1: to the lens
    const e1 = L.clamp(rk * 2);
    c.beginPath(); c.moveTo(x0, y + dy); c.lineTo(L.lerp(x0, lx, e1), y + dy);
    if (rk > 0.5) {
      const e2 = L.clamp(rk * 2 - 1);
      // to F, then on to the retina (spreading once F is in front of it)
      const ex = L.lerp(lx, retX, e2);
      const sl = (y - (y + dy)) / (fx - lx);
      c.lineTo(ex, y + dy + sl * (ex - lx));
    }
    c.stroke();
  }
  c.restore();
  // focal point marker + the blur spot on the retina
  if (rk >= 1) {
    const spread = 52 * (retX - fx) / (fx - lx);
    c.fillStyle = 'rgba(255,236,190,1)';
    c.beginPath(); c.arc(fx, y, 6, 0, TAU); c.fill();
    if (spread > 4) {
      c.strokeStyle = L.rgba(VIOLET); c.lineWidth = 4;
      const sp = Math.min(spread, 58);
      c.beginPath(); c.moveTo(retX + 18, y - sp); c.lineTo(retX + 27, y - sp); c.lineTo(retX + 27, y + sp); c.lineTo(retX + 18, y + sp); c.stroke();
      L.lightBlob(c, retX, y, 30 + spread, [255, 220, 160], 0.25 * blur);
    } else L.lightBlob(c, retX, y, 34, [255, 230, 180], 0.35);
  }
  c.restore();
}
/** inset: what he sees — a little eye chart, sharp, then soft */
function inset(c, gt, tl, k, ex) {
  if (k <= 0 || ex.u >= 1) return;
  const blur = L.ease.inOutCubic(L.prog(gt, Wd(tl, 'focus', -0.15), 0.7));
  const x = 724, y = 462, w = 268, h = 172;
  c.save();
  const e = L.ease.outBack(L.clamp(k), 1.5);
  c.translate(x + w / 2, y + h / 2); c.scale(L.lerp(0.9, 1, e), L.lerp(0.9, 1, e)); c.translate(-(x + w / 2), -(y + h / 2));
  collapse(c, x + w / 2, y + h / 2, ex.pk);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
  c.fillStyle = L.rgba(PAPER); c.fillRect(x, y, w, h);
  c.shadowColor = 'transparent';
  c.globalAlpha *= L.clamp(k * 2.5) * ex.ca;
  c.font = L.font(21, 700, L.FONT.body);
  c.fillStyle = L.rgba(VIOLET.map((q) => q * 0.6));
  L.trackedText(c, 'WHAT HE SEES', x + 18, y + 32, 2.5);
  c.save();
  c.beginPath(); c.rect(x + 6, y + 42, w - 12, h - 48); c.clip();
  if (blur > 0.01) c.filter = `blur(${(blur * 5).toFixed(2)}px)`;
  c.fillStyle = L.rgba(INKP);
  c.textAlign = 'center';
  c.font = L.font(58, 800, L.FONT.display); c.fillText('E', x + w / 2, y + 104);
  c.font = L.font(30, 800, L.FONT.display); c.fillText('F  P', x + w / 2, y + 140);
  c.font = L.font(20, 800, L.FONT.display); c.fillText('T  O  Z', x + w / 2, y + 163);
  c.restore();
  c.restore();
}
/** ISO-style hand, pointing down, fingertips at (x, y); s ≈ hand length */
function hand(c, x, y, s) {
  c.save();
  c.translate(x, y);
  c.fillStyle = L.rgba(FIG_INK);
  c.strokeStyle = L.rgba(FIG_INK); c.lineCap = 'round';
  // forearm / sleeve up off the top
  const sg = c.createLinearGradient(0, -1.7 * s, 0, -0.8 * s);
  sg.addColorStop(0, 'rgba(196,192,214,0)'); sg.addColorStop(0.5, 'rgba(196,192,214,1)');
  c.fillStyle = sg;
  L.roundRect(c, -0.2 * s, -1.7 * s, 0.4 * s, 0.95 * s, 0.12 * s); c.fill();
  c.fillStyle = L.rgba(FIG_INK);
  // palm
  L.roundRect(c, -0.24 * s, -0.86 * s, 0.48 * s, 0.46 * s, 0.13 * s); c.fill();
  // four fingers (capsules), small knock-out gaps between them
  const fw = 0.1 * s;
  [[-0.18, 0.4], [-0.06, 0.46], [0.06, 0.44], [0.18, 0.36]].forEach(([fx, len]) => {
    c.lineWidth = fw;
    c.beginPath(); c.moveTo(fx * s, -0.48 * s); c.lineTo(fx * s, (-0.48 + len) * s - fw / 2); c.stroke();
  });
  // thumb (angled out)
  c.lineWidth = fw * 1.05;
  c.beginPath(); c.moveTo(0.2 * s, -0.68 * s); c.lineTo(0.34 * s, -0.36 * s); c.stroke();
  c.restore();
}
function objects(c, gt, tl, k, touches) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  const top = 930;
  // table
  c.fillStyle = 'rgb(52,58,92)'; c.fillRect(540, top, 440, 16);
  c.fillStyle = 'rgb(40,45,74)'; c.fillRect(560, top + 16, 14, GROUND - top - 16); c.fillRect(946, top + 16, 14, GROUND - top - 16);
  const col = L.rgba([150, 160, 205]);
  c.fillStyle = col; c.strokeStyle = col;
  // key
  c.save(); c.translate(620, top - 22);
  c.lineWidth = 9; c.beginPath(); c.arc(-30, 0, 16, 0, TAU); c.stroke();
  c.fillRect(-14, -5, 62, 10); c.fillRect(30, 5, 8, 12); c.fillRect(42, 5, 6, 9);
  c.restore();
  // wooden block (an isometric cube)
  c.save(); c.translate(765, top);
  c.fillStyle = L.rgba([150, 160, 205]); c.beginPath(); c.moveTo(-36, 0); c.lineTo(-36, -50); c.lineTo(0, -64); c.lineTo(0, -14); c.closePath(); c.fill();
  c.fillStyle = L.rgba([120, 130, 178]); c.beginPath(); c.moveTo(0, -14); c.lineTo(0, -64); c.lineTo(36, -50); c.lineTo(36, 0); c.closePath(); c.fill();
  c.fillStyle = L.rgba([182, 190, 228]); c.beginPath(); c.moveTo(-36, -50); c.lineTo(0, -64); c.lineTo(36, -50); c.lineTo(0, -36); c.closePath(); c.fill();
  c.restore();
  // ball
  c.fillStyle = col; c.beginPath(); c.arc(905, top - 34, 34, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(895, top - 46, 11, 0, TAU); c.fill();
  // "?" over each object once touched
  const xs = [620, 765, 905];
  touches.forEach((tt, i) => {
    const q = L.prog(gt, tt + 0.18, 0.35);
    if (q <= 0) return;
    const e = L.ease.outBack(L.clamp(q), 2.2);
    c.save();
    c.translate(xs[i] - 66, top - 130 - 10 * e);
    c.scale(e, e);
    c.font = tfont(64, 700);
    c.textAlign = 'center';
    c.fillStyle = L.rgba(VIOLET);
    c.shadowColor = L.rgba(VIOLET, 0.6); c.shadowBlur = 16;
    c.fillText('?', 0, 0);
    c.restore();
  });
  c.restore();
}

export default {
  beat: 2,
  chapter: null,
  captions: true,
  layer: 2,
  drawWorld(c, v) {
    const tl = v.tl, gt = v.gt;
    const p1 = PH(tl, 2, 1);
    // the eye comes in right as the trifold has gone (B2 − 0.05), leaves before the table arrives (no shared pixels)
    const ek = L.prog(gt, B(tl, 2, -0.03), 0.4), eex = exitK(gt, p1 - 0.2, 0.3);
    const ok = win(gt, p1 - 0.18, 0.4, BE(tl, 2, -0.42), 0.22);
    const touches = [Wd(tl, 'objects'), Wd(tl, 'apart'), Wd(tl, 'touch', -0.05)];
    inWorld(c, v, (g) => {
      eyeDiagram(g, gt, tl, ek, eex);
      objects(g, gt, tl, ok, touches);
      if (ok > 0) {
        // the hand: descends onto the key, lifts and hops to the block, then the ball, then rises away
        const xs = [620, 765, 905], tops = [930 - 30, 930 - 66, 930 - 70];
        const K = [[p1 - 0.2, xs[0], 700]];
        touches.forEach((tt, i) => {
          if (i) K.push([(touches[i - 1] + 0.16 + tt - 0.12) / 2, (xs[i - 1] + xs[i]) / 2, Math.min(tops[i - 1], tops[i]) - 70]);
          K.push([tt - 0.12, xs[i], tops[i] - 2], [tt + 0.16, xs[i], tops[i] - 2]);
        });
        K.push([touches[2] + 0.75, xs[2], 760]);
        let hx = K[0][1], yTip = K[0][2];
        for (let i = 1; i < K.length; i++) {
          if (gt >= K[i - 1][0]) {
            const e = L.ease.inOutCubic(L.prog(gt, K[i - 1][0], K[i][0] - K[i - 1][0]));
            hx = L.lerp(K[i - 1][1], K[i][1], e); yTip = L.lerp(K[i - 1][2], K[i][2], e);
          }
        }
        g.save();
        g.globalAlpha *= ok;
        hand(g, hx, yTip, 120);
        g.restore();
      }
    });
  },
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    const p1 = PH(tl, 2, 1);
    const ik = L.prog(gt, Wd(tl, 'eyes', -0.35), 0.45);
    inset(c, gt, tl, ik, exitK(gt, p1 - 0.2, 0.3));
    const t1 = L.prog(gt, Wd(tl, 'eyes', -0.1), 0.4);
    tag(c, 'BLURRED VISION', 540, 1215, { k: t1, out: exitK(gt, p1 - 0.15, 0.3), size: 46, rot: -0.015, kicker: 'DAY 2 · EYES', seed: 3 });
    const t2 = L.prog(gt, Wd(tl, 'objects', -0.15), 0.4);
    // exits with the table (both gone by BE2 − 0.2)
    tag(c, 'CAN’T IDENTIFY OBJECTS BY TOUCH', 540, 1215, { k: t2, out: exitK(gt, BE(tl, 2, -0.2), 0.3), size: 40, rot: 0.012, kicker: 'DAY 2 · TOUCH', seed: 5 });
  },
};
