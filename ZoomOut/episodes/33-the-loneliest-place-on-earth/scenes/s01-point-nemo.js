// Beat 1 — "It's called Point Nemo, | in the middle of the South Pacific."
// The hook's pull-up settles on the whole South Pacific (r ≈ 540; New Zealand on the left limb, South America on the
// right, Antarctica below). Name card (opaque plate from its first frame, wipes open) on "Point": POINT NEMO /
// 48°52.6′ S · 123°23.6′ W / OCEANIC POLE OF INACCESSIBILITY, with a leader down to the pin. On "South" (phrase 1) two
// small map labels give the scale: NEW ZEALAND · SOUTH AMERICA (real positions; Antarctica reads by itself and sits
// in the caption band).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, FACTS, INKW, GREYT, PLATE, NEMO, geo, word, mapLabel, plate } from '../env.js';

const { W } = L;
const CARD = { x: 110, w: 860, y: 360, h: 262 };

export default {
  beat: 1,
  chapter: null,
  captions: true,
  overlayIn: false,   // the card is opaque from its first frame (no engine fade)
  layer: 5,
  cues(d, tl) {
    const st = tl.scenes[1].start, w = (j, k) => tl.lines[1].phrases[j].words[k][0] - st;
    return [
      { t: w(0, 2) - 0.17, name: 'impact', gain: 0.14, pitch: 0.9 },   // card lands, between "called" and "Point"
      { t: w(1, 0) - 0.3, name: 'blip', gain: 0.1, pitch: 1.1 },        // map labels, in the gap before "in"
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, d = v.d;
    const t0 = word(v, 0, 2, -0.3);                       // "Point" − 0.3
    const open = L.ease.outCubic(L.prog(t, t0, 0.38));
    const outC = L.ease.inCubic(L.prog(t, d - 0.44, 0.14));    // contents leave first
    const outP = L.ease.inOutCubic(L.prog(t, d - 0.38, 0.12));   // then the plate, fast (no empty plate lingering)
    if (open <= 0 || outP >= 1) return;
    const { x, w, y, h } = CARD;
    c.save();
    // ---- leader from the card to the pin (drawn after the title lands)
    const pin = geo(v, NEMO.lat, NEMO.lon);
    const lk = L.ease.outCubic(L.prog(t, word(v, 0, 3, 0), 0.5)) * (1 - outC);
    if (lk > 0 && pin.z > 0) {
      const x1 = W / 2, y1 = y + h, x2 = pin.x, y2 = pin.y - 14;
      c.strokeStyle = L.rgba(ACCENT, 0.85);
      c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(L.lerp(x1, x2, lk), L.lerp(y1, y2, lk)); c.stroke();
    }
    // ---- plate: wipes open from the centre, opaque from its first frame
    const pw = w * L.lerp(0.4, 1, open) * (1 - 0.15 * outP), ph = h * (1 - outP);
    c.save();
    c.globalAlpha = 1 - outP;
    plate(c, W / 2 - pw / 2, y + (h - ph) / 2, pw, ph, { r: 22 });
    c.restore();
    // ---- contents
    const ck = L.clamp((open - 0.8) / 0.2) * (1 - outC);   // text only once the plate is wide enough: never clipped
    if (ck > 0) {
      c.save();
      c.beginPath(); c.rect(W / 2 - pw / 2, y, pw, h); c.clip();
      c.globalAlpha = ck;
      c.textBaseline = 'alphabetic';
      const ts = L.fitSize(c, 'POINT NEMO', w - 120, 124, 800, L.FONT.display, 60);
      c.font = L.font(ts, 800, L.FONT.display);
      c.fillStyle = L.rgba(INKW);
      c.shadowColor = 'rgba(80,190,230,0.35)'; c.shadowBlur = 20;
      L.trackedText(c, 'POINT NEMO', W / 2, y + 40 + ts * 0.78 + (1 - open) * 16, 3, 'center');
      c.shadowBlur = 0;
      c.font = L.font(42, 700, L.FONT.din);
      c.fillStyle = L.rgba(ACCENT);
      L.trackedText(c, FACTS.coords, W / 2, y + 40 + ts * 0.78 + 64, 2, 'center');
      c.font = L.font(23, 600, L.FONT.body);
      c.fillStyle = L.rgba(GREYT);
      L.trackedText(c, 'OCEANIC POLE OF INACCESSIBILITY', W / 2, y + h - 30, 4, 'center');
      c.restore();
    }
    // ---- map labels on "South" (phrase 1)
    const mk = L.ease.outCubic(L.prog(t, word(v, 1, 5, -0.15), 0.45)) * (1 - outC);
    if (mk > 0) {
      const nz = geo(v, -41.5, 172.8), sa = geo(v, -36, -73.5);
      if (nz.z > 0.1) mapLabel(c, 'NEW ZEALAND', Math.max(150, nz.x + 10), nz.y + 46, { alpha: mk, size: 22 });
      if (sa.z > 0.1) mapLabel(c, 'SOUTH AMERICA', Math.min(sa.x - 22, 930), sa.y, { alpha: mk, size: 22, align: 'right' });
    }
    c.restore();
    void PLATE;
  },
};
