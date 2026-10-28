// Beat 6 — "After two hundred and sixty-four hours, he finally sleeps: | about fourteen hours."
// THE SIGNATURE MOVE (env): the HOURS clock lifts out of the log strip and flies to centre stage (×1.75), counts
// 240 → 264 and lands ON "sixty-four"; the line 264 HOURS · 11 DAYS appears under it; on "finally" it flies home.
// On "sleeps" the lights go down (env nightK): a window with a crescent moon and slow stars fades in on the stage's
// right, the bed appears and Randy is in it under a blanket that rises and falls. Phrase 1: a sleep readout (same
// 7-segment HUD, moonlit blue) counts 0 → 14 and lands on "fourteen": ≈ 14 HOURS, FIRST NIGHT.
import * as L from '../../../../engine/runtime/lib.js';
import { VIOLET, PAPER, TEXT, GREYT, B, BE, PH, Wd, inWorld, win, drawClock, counter, gq, tag, exitK, collapse, nightK } from '../env.js';

const TAU = Math.PI * 2;
const WIN = { x: 676, y: 520, w: 280, h: 330 };
const STARS = (() => { const r = L.rng(3406), o = []; for (let i = 0; i < 16; i++) o.push({ x: r(), y: r() * 0.7, s: 1 + r() * 2, ph: r() * TAU }); return o; })();

function windowNight(c, k, gt) {
  if (k <= 0) return;
  const { x, y, w, h } = WIN;
  c.save();
  c.globalAlpha *= k;
  // frame + night sky
  c.fillStyle = 'rgb(58,64,100)';
  L.roundRect(c, x - 14, y - 14, w + 28, h + 28, 8); c.fill();
  const sky = c.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, 'rgb(14,18,46)'); sky.addColorStop(1, 'rgb(34,34,78)');
  c.fillStyle = sky; c.fillRect(x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  for (const s of STARS) {
    c.fillStyle = `rgba(230,228,255,${0.35 + 0.45 * (0.5 + 0.5 * Math.sin(gt * 1.2 + s.ph))})`;
    c.beginPath(); c.arc(x + s.x * w, y + s.y * h, s.s, 0, TAU); c.fill();
  }
  // crescent moon (a disc minus an offset disc), soft glow
  const mx = x + w * 0.64, my = y + h * 0.3, mr = 44;
  L.lightBlob(c, mx, my, 160, [200, 190, 255], 0.22);
  // crescent: the lit disc, then the shadowed part cut away (only inside the lit disc)
  c.save();
  c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.clip();
  c.fillStyle = L.rgba(PAPER); c.fillRect(mx - mr, my - mr, 2 * mr, 2 * mr);
  c.fillStyle = 'rgb(17,21,50)';
  c.beginPath(); c.arc(mx + 24, my - 14, mr * 0.92, 0, TAU); c.fill();
  c.restore();
  c.restore();
  // mullions + sill
  c.fillStyle = 'rgb(58,64,100)';
  c.fillRect(x + w / 2 - 5, y, 10, h); c.fillRect(x, y + h * 0.48 - 5, w, 10);
  c.fillStyle = 'rgb(70,76,116)'; c.fillRect(x - 26, y + h + 12, w + 52, 12);
  // moonlight falling into the room
  c.globalCompositeOperation = 'lighter';
  const ml = c.createLinearGradient(x, y + h, x - 200, y + h + 220);
  ml.addColorStop(0, 'rgba(120,110,220,0.10)'); ml.addColorStop(1, 'rgba(120,110,220,0)');
  c.fillStyle = ml;
  c.beginPath(); c.moveTo(x, y + h + 24); c.lineTo(x + w, y + h + 24); c.lineTo(x + w - 260, 1040); c.lineTo(x - 320, 1040); c.closePath(); c.fill();
  c.restore();
}

export default {
  beat: 6,
  chapter: null,
  captions: true,
  layer: 2,
  drawWorld(c, v) {
    const tl = v.tl, gt = v.gt;
    // the window leaves as the Guinness card arrives (it would peek out past the card's right edge under the push)
    const k = nightK(tl, gt) * (1 - L.ease.inCubic(L.prog(gt, Wd(tl, 'guinness', -0.45), 0.3)));
    inWorld(c, v, (g) => windowNight(g, k, gt));
  },
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    const p1 = PH(tl, 6, 1);
    // the lower zone while the clock is out on stage: the duration as a paper tag (fact-check: "264 HOURS · 11 DAYS"),
    // landing on "sixty-four"; it collapses before the sleep readout takes its place
    tag(c, '264 HOURS  ·  11 DAYS', 540, 1215, { k: L.prog(gt, Wd(tl, 'sixtyFour', 0.05), 0.4), out: exitK(gt, p1 - 0.32, 0.3), size: 50, rot: -0.012, kicker: 'TOTAL TIME AWAKE', seed: 14 });
    // phrase 1: the sleep readout — opaque panel from its first frame (p1 − 0.3), it settles, THEN the count runs
    // (env: from p1 − 0.04) 00 → 14 in fixed two-digit cells and lands on "fourteen"; it collapses before the cut
    const sk = L.prog(gt, p1 - 0.3, 0.3);
    const ex = exitK(gt, BE(tl, 6, -0.02), 0.3);
    if (sk > 0 && ex.u < 1) {
      c.save();
      collapse(c, 540, 1222, ex.pk);
      const sc = L.lerp(1.12, 1.25, L.ease.outBack(L.clamp(sk), 1.6));
      drawClock(c, 540, 1222, sc, counter(tl, 'sleep', gq(gt)).cur, { gt, label: 'SLEPT · FIRST NIGHT', color: [150, 170, 255], approx: true, unit: 'HOURS', pad: 2, labelSize: 18 });
      c.restore();
    }
  },
};
