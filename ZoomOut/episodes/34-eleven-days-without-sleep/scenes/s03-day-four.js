// Beat 3 — "Day four: he's irritable and forgetful, | and he starts to see things that aren't there."
// DAY counts 02 → 04 on "four" (env), the figure sags further. Stage right: a night street — a lamp post with a soft
// pool of light and a street-name sign on a pole. Phrase 0: paper tags IRRITABLE (on "irritable") and FORGETFUL (on
// "forgetful"). Phrase 1: the hallucination, done gently: on "see" the sign ripples and resolves into a person-shaped
// silhouette (the series pictogram, in a pale violet haze, no face), holds through "things that", and on "there" it
// ripples back into the sign. Tag: MISTAKES A STREET SIGN FOR A PERSON (fact: Gulevich/Dement/Johnson 1966).
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, PAPER, INKP, GROUND, BG, B, BE, PH, Wd, inWorld, tag, win, drawPicto, picLayer, exitK } from '../env.js';

const TAU = Math.PI * 2;
const SIGN = { x: 690 };
const LAMP = { x: 930 };

function street(c, k, gt) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= k;
  // lamp: pole, arm, head, light cone and ground pool
  const lx = LAMP.x, hy = 500;
  const cone = c.createLinearGradient(0, hy, 0, GROUND);
  cone.addColorStop(0, 'rgba(255,226,170,0.22)'); cone.addColorStop(1, 'rgba(255,226,170,0.02)');
  c.fillStyle = cone;
  c.beginPath(); c.moveTo(lx - 72, hy + 14); c.lineTo(lx - 52, hy + 14); c.lineTo(lx + 60, GROUND); c.lineTo(lx - 250, GROUND); c.closePath(); c.fill();
  c.save(); c.translate(lx - 92, GROUND); c.scale(1, 0.12);
  const pg = c.createRadialGradient(0, 0, 0, 0, 0, 200); pg.addColorStop(0, 'rgba(255,226,170,0.35)'); pg.addColorStop(1, 'rgba(255,226,170,0)');
  c.fillStyle = pg; c.beginPath(); c.arc(0, 0, 200, 0, TAU); c.fill(); c.restore();
  c.fillStyle = 'rgb(58,64,100)';
  c.fillRect(lx - 7, hy - 10, 14, GROUND - hy + 10);
  c.strokeStyle = 'rgb(58,64,100)'; c.lineWidth = 10; c.lineCap = 'round';
  c.beginPath(); c.moveTo(lx, hy - 6); c.quadraticCurveTo(lx, hy - 30, lx - 40, hy - 26); c.lineTo(lx - 56, hy - 18); c.stroke();
  c.fillStyle = 'rgb(70,76,116)';
  c.beginPath(); c.moveTo(lx - 86, hy + 12); c.lineTo(lx - 40, hy + 12); c.lineTo(lx - 50, hy - 12); c.lineTo(lx - 76, hy - 12); c.closePath(); c.fill();
  L.lightBlob(c, lx - 62, hy + 14, 90, [255, 226, 170], 0.5);
  c.fillStyle = 'rgb(46,52,86)'; c.fillRect(lx - 20, GROUND - 12, 40, 12);
  c.restore();
}
function sign(c, a) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  const x = SIGN.x;
  c.fillStyle = 'rgb(120,128,160)';
  c.fillRect(x - 6, 640, 12, GROUND - 640);
  // the street-name blade (and the cross blade seen edge-on above it)
  c.fillStyle = 'rgb(46,112,90)';
  L.roundRect(c, x - 104, 628, 208, 54, 6); c.fill();
  c.strokeStyle = 'rgba(236,240,230,0.9)'; c.lineWidth = 3;
  L.roundRect(c, x - 98, 634, 196, 42, 4); c.stroke();
  c.fillStyle = 'rgba(236,240,230,0.9)';
  c.fillRect(x - 70, 650, 96, 9); c.fillRect(x + 36, 650, 30, 9);
  c.fillStyle = 'rgb(38,96,76)';
  L.roundRect(c, x - 16, 600, 32, 30, 4); c.fill();
  c.restore();
}

export default {
  beat: 3,
  chapter: null,
  captions: true,
  layer: 2,
  drawWorld(c, v) {
    const tl = v.tl, gt = v.gt;
    // in just after beat 2's table has gone; out (quick) before the thought bubble starts (no shared pixels)
    const k = win(gt, B(tl, 3, -0.1), 0.4, BE(tl, 3, -0.45), 0.22);
    if (k <= 0) return;
    // m: 0 sign … 1 person (in on "see", back on "there")
    const m = L.ease.inOutCubic(L.prog(gt, Wd(tl, 'see', -0.15), 0.6)) * (1 - L.ease.inOutCubic(L.prog(gt, Wd(tl, 'there', -0.15), 0.6)));
    const rip = Math.sin(Math.PI * L.clamp(m * 1.0)) ;   // strongest mid-morph
    inWorld(c, v, (g) => {
      street(g, k, gt);
      // ripple: the morph region is drawn in horizontal slices with a sine offset (a heat-haze shimmer)
      const draw = (h) => {
        sign(h, k * (1 - m));
        if (m > 0.001) {
          const haze = L.mix([200, 180, 255], [150, 130, 220], 0.5);
          picLayer(h, k * m * 0.92, (q) => {
            q.translate(SIGN.x, GROUND); q.scale(-1, 1);
            drawPicto(q, 0, 0, 370, 'stand', { ink: haze, ground: 0, shadow: 0.6 });
          }, true);
          L.lightBlob(h, SIGN.x, 760, 220, VIOLET, 0.12 * m * k);
        }
      };
      const amp = 9 * Math.sin(Math.PI * L.clamp(m)) + 0;
      if (amp < 0.3) { draw(g); return; }
      for (let y0 = 560; y0 < GROUND + 4; y0 += 8) {
        g.save();
        g.beginPath(); g.rect(SIGN.x - 220, y0, 440, 8); g.clip();
        g.translate(Math.sin(y0 * 0.06 + gt * 9) * amp, 0);
        draw(g);
        g.restore();
      }
      void rip;
    });
  },
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    const p1 = PH(tl, 3, 1);
    const out1 = p1 + 0.3;
    tag(c, 'IRRITABLE', 320, 1215, { k: L.prog(gt, Wd(tl, 'irritable', -0.12), 0.4), out: exitK(gt, out1 + 0.25, 0.3), size: 46, rot: -0.025, kicker: 'DAY 4 · MOOD', seed: 7 });
    tag(c, 'FORGETFUL', 720, 1215, { k: L.prog(gt, Wd(tl, 'forgetful', -0.12), 0.4), out: exitK(gt, out1 + 0.25, 0.3), size: 46, rot: 0.02, kicker: 'DAY 4 · MEMORY', seed: 8 });
    tag(c, 'MISTAKES A STREET SIGN FOR A PERSON', 540, 1215, { k: L.prog(gt, out1 + 0.21, 0.4), out: exitK(gt, BE(tl, 3, -0.02), 0.3), size: 38, rot: -0.01, kicker: 'DAY 4 · HALLUCINATION', seed: 9 });
  },
};
