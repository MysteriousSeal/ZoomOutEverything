// Beat 3 — "Dogs: about sixty thousand, | almost all from rabies."
// Phrase 0: the dog hero (env, standing, relaxed — no aggression); the value lands ON "thousand" (≈ 59,000 human rabies
// deaths, WHO); dogs enter the board at #2. The dog stays in the hero zone until "rabies".
// Phrase 1: the big number + source line drop away; ON "rabies" the dog docks into its row while the cause cross-fades in at macro: a bullet-shaped rabies
// virion (lyssavirus) in the hero zone, labelled, with the WHO fact under it (dogs cause up to 99 % of human cases).
import * as L from '../../../../engine/runtime/lib.js';
import { drawAnimal } from '../animals.js';
import { statBlock, subLine, RED, INKW, BE, W8 } from '../env.js';

export default {
  beat: 3,
  chapter: null,
  captions: true,
  layer: 5,
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    // the number + source line drop away before the virion arrives (the value stays on the board row): the virus group
    // (label 470 · virion 490–760 · fact 830) then owns the space between the HUD and the board
    statBlock(c, v, 'dog', 'HUMAN RABIES DEATHS PER YEAR · WHO', { exit: [W8(tl, 'rabies', -0.75), 0.3] });
    const t0 = W8(tl, 'rabies', -0.3);   // lands (≈ full) on the word, as the dog leaves for its row
    const e = L.ease.outCubic(L.prog(gt, t0, 0.5));
    if (e <= 0) return;
    const out = 1 - L.ease.inCubic(L.prog(gt, BE(tl, 3, -0.45), 0.35));
    const a = L.clamp(e * 1.6) * out;
    if (a <= 0) return;
    c.save();
    // the virion drifts in from depth, slowly turning
    c.save();
    c.translate(540 + (1 - e) * 170, 625 + (1 - e) * 20);   // drifts in from the right as the dog leaves down-left
    c.rotate(-0.12 + 0.05 * Math.sin(gt * 0.7));
    L.lightBlob(c, 0, 0, 300, [120, 30, 34], 0.16 * a);
    drawAnimal(c, 'virus', { x: 0, y: 0, w: 560 * L.lerp(0.9, 1, e), h: 270, t: gt, alpha: a });
    c.restore();
    // label above, fact below
    c.globalAlpha = a;
    c.textBaseline = 'alphabetic';
    c.font = L.font(30, 800, L.FONT.display);
    c.fillStyle = L.rgba(RED);
    L.trackedText(c, 'RABIES VIRUS', 540, 470, 6, 'center');
    c.restore();
    subLine(c, 'DOGS CAUSE UP TO 99% OF HUMAN RABIES CASES', 830, { k: a * L.ease.outCubic(L.prog(gt, W8(tl, 'rabies', 0.05), 0.4)), color: INKW, size: 28, maxW: 900 });
  },
};
