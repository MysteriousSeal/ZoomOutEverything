// Beat 3 — "The next day, wounded, he takes the train home. | Home is Nagasaki."
// Camera 'route': the whole railway in frame, the map dimmed to night (env). The date chip turns to 7 AUG 1945. His
// marker (env) rides the railway from Hiroshima to Nagasaki, leaving a lit amber trail: it sets off on "takes" and
// arrives on "Nagasaki". The route draws itself Hiroshima → Nagasaki from "next day" (env); a WOUNDED tag pins to his
// departure point on "wounded" and stays put while he leaves (a moving label smears). Phrase 1: a paper HOME tag
// (drawn house glyph) drops onto Nagasaki on "Home", after the YAMAGUCHI label and the WOUNDED tag have gone.
import * as L from '../../../../engine/runtime/lib.js';
import { ACC, EMBER, IVORY, PAPER, INKP, PLATE, NAGA, geo, moments, txt, tw, BE, railAt } from '../env.js';

function house(c, x, y, s, col) {
  c.save();
  c.translate(x, y);
  c.fillStyle = L.rgba(col);
  c.beginPath();
  c.moveTo(-s * 0.5, -s * 0.02); c.lineTo(0, -s * 0.48); c.lineTo(s * 0.5, -s * 0.02);
  c.lineTo(s * 0.36, -s * 0.02); c.lineTo(s * 0.36, s * 0.42); c.lineTo(-s * 0.36, s * 0.42); c.lineTo(-s * 0.36, -s * 0.02);
  c.closePath(); c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.fillRect(-s * 0.1, s * 0.1, s * 0.2, s * 0.32);
  c.restore();
}

/** WOUNDED: a small opaque tag under-right of his departure point (Hiroshima), on "wounded"; gone before HOME */
function wounded(c, v) {
  const tl = v.tl, m = moments(tl), gt = v.gt;
  const t0 = m.wounded - 0.05, tOut = m.homeWord - 0.4;
  if (gt < t0 - 0.02 || gt > tOut) return;
  const r0 = railAt(0), p = geo(v, r0.lat, r0.lon);
  const f = L.font(24, 800, L.FONT.display);
  const w = 22 + 14 + 14 + tw(c, 'WOUNDED', f, 4) + 22, h = 46;
  const x = p.x - 14, y = p.y + 28;
  const e = L.ease.outBack(L.prog(gt, t0, 0.3), 1.6);
  const ck = L.ease.outCubic(L.prog(gt, t0, 0.2)) * (1 - L.prog(gt, tOut - 0.2, 0.1));
  const out = L.prog(gt, tOut - 0.1, 0.1);   // the plate goes right after its text (no empty tag)
  c.save();
  c.translate(x, y);
  const s = L.lerp(0.86, 1, L.clamp(e)) * L.lerp(1, 0.94, out);
  c.scale(s, s);
  c.globalAlpha *= 1 - L.ease.inCubic(out);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
  c.fillStyle = L.rgba(PLATE);
  L.roundRect(c, 0, 0, w, h, 10); c.fill();
  c.beginPath(); c.moveTo(10, 1); c.lineTo(14, -9); c.lineTo(24, 1); c.closePath(); c.fill();   // pointer up to him
  c.shadowColor = 'transparent';
  c.strokeStyle = L.rgba(EMBER, 0.7); c.lineWidth = 2;
  L.roundRect(c, 0, 0, w, h, 10); c.stroke();
  c.globalAlpha *= ck;
  c.fillStyle = L.rgba(EMBER);
  c.beginPath(); c.arc(22 + 7, h / 2, 7, 0, Math.PI * 2); c.fill();
  txt(c, 'WOUNDED', 22 + 14 + 14, h / 2 + 2, f, IVORY, { track: 4, base: 'middle' });
  c.restore();
}

export default {
  beat: 3,
  chapter: null,
  captions: true,
  overlayIn: false,
  layer: 5,
  drawOverlay(c, v) {
    wounded(c, v);
    const tl = v.tl, m = moments(tl), gt = v.gt;
    const t0 = m.homeWord - 0.06, tOut = BE(tl, 3, -0.02);
    if (gt < t0 - 0.02 || gt > tOut) return;
    const p = geo(v, NAGA.lat, NAGA.lon);
    const e = L.ease.outBack(L.prog(gt, t0, 0.42), 1.5);
    const ex = L.prog(gt, tOut - 0.22, 0.2);
    const f = L.font(40, 800, L.FONT.display);
    const w = 44 + 14 + tw(c, 'HOME', f, 6) + 40, h = 64;
    const bx = p.x + 10, by = p.y - 78;   // tag sits above-right of the pin, pointer down to it
    c.save();
    c.translate(bx, by + (1 - L.clamp(e)) * -30);
    const s = L.lerp(0.8, 1, L.clamp(e)) * L.lerp(1, 0.9, ex);
    c.scale(s, s);
    c.globalAlpha *= 1 - L.ease.inCubic(ex);   // opaque from its first frame (it scales/drops in)
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 22;
    c.fillStyle = L.rgba(PAPER);
    L.roundRect(c, -24, -h / 2, w, h, 12); c.fill();
    c.beginPath(); c.moveTo(-12, h / 2 - 2); c.lineTo(-10, h / 2 + 22); c.lineTo(8, h / 2 - 2); c.closePath(); c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = L.rgba(ACC); c.fillRect(-24, -h / 2, 8, h);
    house(c, 14, 2, 38, INKP);
    txt(c, 'HOME', 46, 3, f, INKP, { track: 6, base: 'middle' });
    c.restore();
    void IVORY;
  },
};
