// Beat 2 — "The nearest land is almost two thousand seven hundred kilometres away, | in every direction."
// Shot 'islands' (r 880, Nemo near the centre). On "land": three great-circle leaders draw out from the pin to the three
// nearest pieces of land (Ducie Island, Motu Nui off Easter Island, Maher Island in Antarctica), staggered 0.12 s; each
// island gets a ring marker + a label (name / where / ≈ 2,688 KM). The three distances COUNT UP together (≈ 1 s, eased,
// fixed digit cells) and land on "hundred". Phrase 1: the 2,688 km circle sweeps round from Ducie (north) and closes
// on "direction": only ocean inside it; tag NOTHING BUT OCEAN at the top on "every".
import * as L from '../../../../engine/runtime/lib.js';
import { drawCaptionGroups, plate, tw, ACCENT, INKW, GREYT, NEMO, DUCIE, MOTU, MAHER, FACTS, LAND_DEG, geo, geoTrace, gcPoints, smallCircle, word, cellText, countAt, fmtCount, gq, scrim } from '../env.js';

const { W } = L;
const ISL = [
  { p: DUCIE, name: 'DUCIE ISLAND', sub: 'PITCAIRN ISLANDS', side: 'left', dy: 0 },
  { p: MOTU, name: 'MOTU NUI', sub: 'OFF EASTER ISLAND', side: 'right', dy: 0 },
  { p: MAHER, name: 'MAHER ISLAND', sub: 'ANTARCTICA', side: 'right', dy: -96 },   // card up and right: clear of its marker and the captions
];

export default {
  beat: 2,
  chapter: null,
  captions: false,   // own caption groups (the spoken number would overflow one engine group): see drawOverlay
  layer: 6,
  cues(d, tl) {
    const st = tl.scenes[2].start, w = (j, k) => tl.lines[2].phrases[j].words[k][0] - st;
    return [
      { t: w(0, 2) + 0.12, name: 'swish', gain: 0.12, pitch: 1.2 },          // leaders shoot out (after "land" onset)
      { t: w(0, 8) - 0.8, name: 'count', gain: 0.12, pitch: 1.0 },           // the count (lands on "hundred")
      { t: w(1, 0) - 0.3, name: 'swell', gain: 0.14, pitch: 0.9 },           // circle, in the gap before "in"
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, k = v.k;
    // captions on the real word starts: THE NEAREST LAND | IS ALMOST 2,700 | KILOMETRES AWAY, | IN EVERY DIRECTION.
    {
      const ph = v.tl.lines[2].phrases, w0 = ph[0].words, w1 = ph[1].words, end = v.tl.scenes[2].end;
      const G = [
        { words: [[w0[0][0], 'THE'], [w0[1][0], 'NEAREST'], [w0[2][0], 'LAND']], end: w0[3][0], tail: false },
        { words: [[w0[3][0], 'IS'], [w0[4][0], 'ALMOST'], [w0[5][0], '2,700']], end: w0[9][0], tail: false },
        { words: [[w0[9][0], 'KILOMETRES'], [w0[10][0], 'AWAY']], end: ph[0].end + 0.35, tail: true },
        { words: [[w1[0][0], 'IN'], [w1[1][0], 'EVERY'], [w1[2][0], 'DIRECTION']], end: Math.min(end - 0.02, ph[1].end + 0.9), tail: true },
      ];
      drawCaptionGroups(c, v, G);
    }
    const nemo = geo(v, NEMO.lat, NEMO.lon);
    const tLand = word(v, 0, 2, 0);
    const tKm = word(v, 0, 8, 0.15);        // lands on "hundred" (… two thousand seven HUNDRED)
    const tCount0 = tKm - 1.0;
    c.save();
    // own exit (not the engine's overlay fade, which would make the opaque plates see-through)
    const outK = 1 - L.smoothstep(L.prog(t, v.d - 0.5, 0.25));
    void k;
    c.globalAlpha = outK;
    // ---- the 2,688 km circle (phrase 1): sweeps clockwise from north, closes on "direction"
    const cs = word(v, 1, 0, -0.05), ce = word(v, 1, 2, 0);
    const ck = L.ease.inOutCubic(L.prog(t, cs, ce - cs));
    if (ck > 0) {
      const pts = smallCircle(NEMO.lat, NEMO.lon, LAND_DEG, 180, 0, 360 * ck);
      if (ck >= 1) {
        c.beginPath(); geoTrace(c, v, pts, true, 1.0);
        c.fillStyle = L.rgba(ACCENT, 0.09 * L.smoothstep(L.prog(t, ce, 0.5)));
        c.fill();
      }
      c.beginPath(); geoTrace(c, v, pts, false, 1.0);
      c.strokeStyle = L.rgba(ACCENT, 0.9);
      c.lineWidth = 3;
      c.setLineDash([14, 10]);
      c.stroke();
      c.setLineDash([]);
    }
    // ---- leaders + markers + labels
    // The leader's tip carries a small dot; the ring marker grows from it the moment the line arrives, and the plate
    // opens on the same frame (≥ 40 % wide, text only once the plate is wide enough: never clipped).
    const exC = 1 - L.ease.inCubic(L.prog(t, v.d - 0.44, 0.14)), exP = 1 - L.ease.inOutCubic(L.prog(t, v.d - 0.38, 0.12));   // contents, then plate
    ISL.forEach((isl, i) => {
      const t0 = tLand + i * 0.12;
      const lk = L.prog(t, t0, 0.55);
      if (lk <= 0 || exP <= 0) return;
      const e = L.ease.outCubic(lk);
      const pts = gcPoints(NEMO, isl.p, e, 50);
      c.beginPath(); geoTrace(c, v, pts, false, 0.8);
      c.strokeStyle = L.rgba(INKW, 0.85 * exC);
      c.lineWidth = 2.5;
      c.stroke();
      const q = geo(v, isl.p.lat, isl.p.lon);
      const tipLL = pts[pts.length - 1], tip = geo(v, tipLL[0], tipLL[1]);
      const tArr = t0 + 0.42;               // the line is ≥ 98 % of the way there
      const mk = L.ease.outBack(L.prog(t, tArr, 0.3));
      c.save();
      c.globalAlpha *= exC;
      if (mk <= 0) {   // travelling tip
        c.fillStyle = L.rgba(INKW);
        c.beginPath(); c.arc(tip.x, tip.y, 4, 0, Math.PI * 2); c.fill();
      } else {
        c.strokeStyle = L.rgba(INKW, 0.95);
        c.lineWidth = 3;
        c.beginPath(); c.arc(q.x, q.y, Math.max(0, 4 + 7 * mk), 0, Math.PI * 2); c.stroke();
        c.fillStyle = L.rgba(INKW);
        c.beginPath(); c.arc(q.x, q.y, 4, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // label block (name / where / distance)
      const la = L.clamp(L.prog(t, tArr, 0.22));
      if (la <= 0) return;
      const right = isl.side === 'right';
      const x = right ? q.x + 40 : q.x - 40, al = right ? 'left' : 'right';
      const y0 = q.y + isl.dy;
      const nw = tw(c, isl.name, 30, 800, L.FONT.display, 2), sw = tw(c, isl.sub, 19, 600, L.FONT.body, 3);
      const dw = cellText(c, `≈ ${L.fmt(FACTS.landKm)} KM`, 0, 0, 40, { weight: 700, fam: L.FONT.din, dry: true });
      const bw = Math.max(nw, sw, dw) + 44, bh = 128, pe = L.ease.outCubic(la);
      const pw = bw * L.lerp(0.4, 1, pe), ph = bh * L.lerp(1, 0, 1 - exP);
      const bx = right ? x - 22 : x + 22 - pw, by = y0 - 60 + (bh - ph) / 2;
      // a short tick from the marker to a card that sits off the island (Maher)
      if (Math.abs(isl.dy) > 40) {
        c.save();
        c.globalAlpha *= exC * pe;
        c.strokeStyle = L.rgba(INKW, 0.7); c.lineWidth = 2;
        c.beginPath(); c.moveTo(q.x + 10, q.y - 8); c.lineTo(bx, y0 + 40); c.stroke();
        c.restore();
      }
      c.save(); c.globalAlpha = 1; plate(c, bx, by, pw, ph, { r: 12, border: 0.4 }); c.restore();
      c.save();
      c.beginPath(); c.rect(bx, by, pw, ph); c.clip();
      c.globalAlpha = L.clamp((pe - 0.8) / 0.2) * exC;   // (exC: contents leave before the plate)
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(2,6,14,0.95)'; c.shadowBlur = 10;
      c.font = L.font(30, 800, L.FONT.display);
      c.fillStyle = L.rgba(INKW);
      L.trackedText(c, isl.name, x, y0 - 22, 2, al);
      c.font = L.font(19, 600, L.FONT.body);
      c.fillStyle = L.rgba(GREYT);
      L.trackedText(c, isl.sub, x, y0 + 4, 3, al);
      // distance: "≈" from the start, digits count up in fixed cells, land on "hundred"
      const dk = L.clamp(L.prog(t, tCount0 - 0.15, 0.15));
      if (dk > 0) {
        c.globalAlpha *= dk;
        const n = countAt(gq(v.gt) - v.tl.scenes[2].start, tCount0, tKm, FACTS.landKm);
        const str = `≈ ${fmtCount(n, FACTS.landKm)} KM`;
        cellText(c, str, x, y0 + 50, 40, { weight: 700, fam: L.FONT.din, align: al, color: ACCENT });
      }
      c.restore();
    });
    // ---- tag at the top on "every"
    const tk = L.ease.outCubic(L.prog(t, word(v, 1, 1, -0.05), 0.4));
    if (tk > 0) {
      c.save();
      c.globalAlpha *= tk;
      scrim(c, W / 2, 410, 480, 80, 0.55);
      c.textBaseline = 'alphabetic';
      c.font = L.font(70, 800, L.FONT.display);
      c.fillStyle = L.rgba(INKW);
      c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 16;
      L.trackedText(c, 'NOTHING BUT OCEAN', W / 2, 436 + (1 - tk) * 12, 2, 'center');
      c.restore();
    }
    // the pin's core stays on top of the leaders (env draws the pin under the overlays)
    if (nemo.z > 0) {
      c.fillStyle = L.rgba(ACCENT); c.beginPath(); c.arc(nemo.x, nemo.y, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(nemo.x, nemo.y, 3.6, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};
