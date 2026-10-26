// Beat 3 — "Cleopatra lived closer to the Moon landing | than to the building of that pyramid."
// Cleopatra VII (died 30 BC, −2,055 y) as a Ptolemaic coin portrait: a dark profile silhouette (melon coiffure, bun at
// the nape, broad diadem with trailing ribbons) on a warm gold medallion with a beaded rim. The Apollo 11
// lunar module (1969) stands on a sliver of lunar ground, on a leader above NOW. Date tags on one row above all three
// subjects (2560 BC · 30 BC · 1969). Two measured brackets grow OUT of Cleopatra along one row below the ruler:
// on "the Moon landing" → her to the Moon, 2,000 YEARS (accent); on "than to the building of that pyramid" → her back
// to the pyramid, 2,530 YEARS (ink). Then a ">" chevron lands between the two numbers: 2,530 > 2,000 reads at a glance.
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, pin, hBracket, landmark, ACCENT } from '../env.js';
import { tag, fit, sizeK, dotK, live, beatStart, phraseAt, GOLD, GREYTXT } from './s00-hook.js';

const TAG_Y = 770;
const BRK_Y = 1160;
const MED_R = 84;           // medallion radius (px)
const MED_LIFT = 160;       // medallion centre above the ruler
const LM_LIFT = 74;         // lunar-module ground above the ruler
const INKW = [214, 224, 234];

// ------------------------------------------------------------------ Cleopatra (medallion units: radius 100, y down, facing right)
const PROFILE = [
  [24, -68], [32, -56], [37, -44], [40, -31], [39, -23], [42, -16], [48, -7], [55, 1], [52, 5], [46, 7], [46, 10],
  [49, 13], [46, 16], [48, 20], [44, 24], [42, 27], [45, 33], [42, 40], [34, 44], [24, 45], [18, 52], [19, 66],
  [26, 80], [40, 96], [46, 130], [-80, 130], [-66, 96], [-40, 76], [-30, 58], [-34, 44],
  [-52, 42], [-66, 28], [-66, 10], [-58, -2], [-56, -24], [-46, -48], [-28, -70], [-4, -80],
];
function profilePath(c) {
  const n = PROFILE.length, P = PROFILE;
  const m = (i) => { const a = P[i % n], b = P[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  c.beginPath();
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) { const p = P[i % n], e = m(i); c.quadraticCurveTo(p[0], p[1], e[0], e[1]); }
  c.closePath();
}

/** the medallion, centre (x, y), radius r, alpha a, reveal e (0..1) */
function drawMedallion(c, x, y, r, a, e, gt) {
  if (a <= 0 || r <= 0.5) return;
  const s = r / 100;
  c.save();
  c.globalAlpha *= a;
  c.translate(x, y);
  // soft warm glow behind
  L.lightBlob(c, 0, 0, r * 2.1, [255, 200, 120], 0.12 * e);
  // the disc: warm gold, lit from the right
  c.save();
  c.scale(s, s);
  const g = c.createRadialGradient(28, -30, 10, 0, 0, 104);
  g.addColorStop(0, 'rgb(246,220,160)');
  g.addColorStop(0.6, 'rgb(206,164,96)');
  g.addColorStop(1, 'rgb(128,92,52)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, 100, 0, Math.PI * 2); c.fill();
  // inner field slightly recessed
  c.fillStyle = 'rgba(70,44,20,0.18)';
  c.beginPath(); c.arc(0, 0, 88, 0, Math.PI * 2); c.fill();
  // beaded rim
  for (let i = 0; i < 64; i++) {
    const an = (i / 64) * Math.PI * 2;
    c.fillStyle = 'rgba(255,238,196,0.75)';
    c.beginPath(); c.arc(Math.cos(an) * 94, Math.sin(an) * 94, 2.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(80,52,24,0.5)';
    c.beginPath(); c.arc(Math.cos(an) * 94 + 0.8, Math.sin(an) * 94 + 0.9, 1.4, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = 'rgba(255,236,190,0.8)';
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(0, 0, 99, 0, Math.PI * 2); c.stroke();
  // portrait, clipped to the field
  c.beginPath(); c.arc(0, 0, 88, 0, Math.PI * 2); c.clip();
  c.translate(-2, 2 + (1 - e) * 16);
  // rim light: the profile shifted toward the light, in bright gold, then the dark silhouette (head + bun)
  const head = () => { profilePath(c); c.moveTo(-40, 18); c.arc(-58, 18, 19, 0, Math.PI * 2); };
  c.save(); c.translate(1.8, -1.2); head(); c.fillStyle = 'rgba(255,244,214,0.95)'; c.fill(); c.restore();
  head();
  const pg = c.createLinearGradient(-60, -80, 50, 60);
  pg.addColorStop(0, 'rgb(22,30,40)'); pg.addColorStop(1, 'rgb(34,40,48)');
  c.fillStyle = pg;
  c.fill();
  // relief details in muted gold: melon coiffure ribs, the bun's coil
  c.save();
  head(); c.clip();
  c.strokeStyle = 'rgba(214,170,104,0.4)';
  c.lineWidth = 1.4;
  c.lineCap = 'round';
  for (let i = 0; i < 5; i++) {           // melon ribs: from the hairline back to the bun
    const f = i / 4;
    c.beginPath();
    c.moveTo(L.lerp(22, 10, f), L.lerp(-66, -28, f));
    c.quadraticCurveTo(L.lerp(-14, -16, f), L.lerp(-56, -14, f), L.lerp(-42, -44, f), L.lerp(4, 18, f));
    c.stroke();
  }
  c.beginPath(); c.arc(-58, 18, 12, 0, Math.PI * 2); c.stroke();
  c.restore();
  // the diadem: a broad band over the crown from the brow to a knot above the bun; ribbons trail down behind the neck
  c.strokeStyle = 'rgba(244,212,146,0.95)';
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(27, -63); c.quadraticCurveTo(-18, -54, -52, -6); c.stroke();
  c.lineWidth = 2.6;
  c.strokeStyle = 'rgba(70,46,20,0.85)';
  const sway = Math.sin(gt * 1.4) * 1.5;
  c.beginPath(); c.moveTo(-54, -4); c.bezierCurveTo(-74, 10, -70 + sway, 40, -80 + sway, 66); c.stroke();
  c.beginPath(); c.moveTo(-52, -2); c.bezierCurveTo(-66, 16, -60 + sway, 46, -68 + sway, 74); c.stroke();
  c.restore();
  c.restore();
}

// ------------------------------------------------------------------ the Apollo lunar module (metres, y up, ground 0)
/** LM side view, footpads on (x, gy), ppm px per metre, alpha a */
function drawLM(c, x, gy, ppm, a) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.translate(x, gy);
  c.scale(ppm, -ppm);
  c.lineJoin = 'round';
  // a sliver of lunar ground
  const gr = c.createLinearGradient(0, 0, 0, -0.9);
  gr.addColorStop(0, 'rgb(150,150,148)'); gr.addColorStop(1, 'rgb(60,62,66)');
  c.fillStyle = gr;
  c.beginPath(); c.moveTo(-6.2, -0.05); c.quadraticCurveTo(0, 0.35, 6.2, -0.05); c.lineTo(5.6, -0.7); c.quadraticCurveTo(0, -0.95, -5.6, -0.7); c.closePath(); c.fill();
  // legs: primary struts, secondary struts, footpads
  c.strokeStyle = 'rgb(176,180,186)';
  c.lineWidth = 0.22;
  for (const sx of [-1, 1]) {
    c.beginPath(); c.moveTo(sx * 2.0, 3.0); c.lineTo(sx * 4.1, 0.35); c.stroke();
    c.lineWidth = 0.14;
    c.beginPath(); c.moveTo(sx * 2.0, 1.7); c.lineTo(sx * 3.5, 1.1); c.stroke();
    c.beginPath(); c.moveTo(sx * 2.0, 2.3); c.lineTo(sx * 3.5, 1.1); c.stroke();
    c.lineWidth = 0.22;
    c.fillStyle = 'rgb(196,198,202)';
    c.beginPath(); c.ellipse(sx * 4.1, 0.18, 0.5, 0.17, 0, 0, Math.PI * 2); c.fill();
  }
  // front leg with the ladder
  c.beginPath(); c.moveTo(0.15, 1.7); c.lineTo(0.15, 0.35); c.stroke();
  c.fillStyle = 'rgb(196,198,202)';
  c.beginPath(); c.ellipse(0.15, 0.18, 0.5, 0.17, 0, 0, Math.PI * 2); c.fill();
  // descent stage: gold foil box with a black band
  const gd = c.createLinearGradient(-2.1, 0, 2.1, 0);
  gd.addColorStop(0, 'rgb(120,86,34)'); gd.addColorStop(0.55, 'rgb(214,170,84)'); gd.addColorStop(1, 'rgb(250,214,130)');
  c.fillStyle = gd;
  c.fillRect(-2.1, 1.65, 4.2, 1.65);
  c.fillStyle = 'rgba(70,46,14,0.35)';
  for (const fx of [-1.3, -0.2, 0.9]) c.fillRect(fx, 1.7, 0.08, 1.55);   // foil crinkle seams
  c.fillStyle = 'rgb(28,28,32)';
  c.fillRect(-2.1, 3.1, 4.2, 0.22);
  // ascent stage: faceted cabin
  const ga = c.createLinearGradient(-2.2, 0, 2.3, 0);
  ga.addColorStop(0, 'rgb(110,114,122)'); ga.addColorStop(0.6, 'rgb(196,200,206)'); ga.addColorStop(1, 'rgb(238,240,242)');
  c.fillStyle = ga;
  c.beginPath();
  c.moveTo(-2.0, 3.32); c.lineTo(2.2, 3.32); c.lineTo(2.35, 4.4); c.lineTo(1.6, 5.6); c.lineTo(0.4, 6.0);
  c.lineTo(-1.2, 6.0); c.lineTo(-2.1, 5.2); c.lineTo(-2.3, 4.2); c.closePath(); c.fill();
  c.fillStyle = 'rgba(40,44,52,0.45)';
  c.beginPath(); c.moveTo(-2.0, 3.32); c.lineTo(-0.6, 3.32); c.lineTo(-0.9, 6.0); c.lineTo(-1.2, 6.0); c.lineTo(-2.1, 5.2); c.lineTo(-2.3, 4.2); c.closePath(); c.fill();
  // the forward window (triangular) and the hatch
  c.fillStyle = 'rgb(20,24,32)';
  c.beginPath(); c.moveTo(1.05, 5.25); c.lineTo(1.75, 4.6); c.lineTo(1.2, 4.55); c.closePath(); c.fill();
  c.fillRect(1.55, 3.6, 0.5, 0.75);
  // docking tunnel, radar dish, RCS quads
  c.fillStyle = 'rgb(206,208,212)';
  c.fillRect(-0.5, 6.0, 1.0, 0.4);
  c.strokeStyle = 'rgb(200,202,206)'; c.lineWidth = 0.12;
  c.beginPath(); c.moveTo(-1.5, 5.9); c.lineTo(-1.9, 6.6); c.stroke();
  c.fillStyle = 'rgb(226,228,232)';
  c.beginPath(); c.ellipse(-1.95, 6.7, 0.45, 0.16, -0.5, 0, Math.PI * 2); c.fill();
  for (const sx of [-1, 1]) {
    const qx = sx * 2.45, qy = 5.0;
    c.fillStyle = 'rgb(180,184,190)';
    c.fillRect(qx - 0.06, qy - 0.35, 0.12, 0.7);
    c.fillRect(qx - 0.3, qy - 0.06, 0.6, 0.12);
  }
  c.restore();
}

// ------------------------------------------------------------------ timing (beat-relative helpers)
function times(v) {
  const b3 = beatStart(v, 3), p2 = phraseAt(v, 3, 1);
  return {
    cleo: b3 + 0.15,             // medallion rises in as the camera settles
    tags: b3 + 0.7,
    moon: b3 + 1.85,             // "…the Moon landing"
    brMoon: b3 + 2.25,
    brPyr: p2 - 0.02,            // "than to the building of that pyramid"
    cmp: p2 + 0.95,              // the ">" lands
    out: beatStart(v, 4),
  };
}

/** a bracket's number label: big number + small "YEARS" under it, centred at x */
function bracketLabel(c, x, y, num, k, color) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 1.5);
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(2,6,12,0.85)'; c.shadowBlur = 12;
  const s = fit(c, num, 230, 60, 700, L.FONT.din, 1);
  c.font = L.font(s, 700, L.FONT.din);
  c.fillStyle = L.rgba(color);
  L.trackedText(c, num, x, y + s * 0.72 + (1 - e) * 12, 1, 'center');
  c.font = L.font(fit(c, 'YEARS', 200, 20, 600, L.FONT.body, 4), 600, L.FONT.body);
  c.fillStyle = L.rgba(GREYTXT, 0.9);
  L.trackedText(c, 'YEARS', x, y + s * 0.72 + 30 + (1 - e) * 12, 4, 'center');
  c.restore();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Cleopatra', sub: 'the last pharaoh, died 30 BC' },
  layer: 3,
  cues(d) {
    const p2 = 3.27;
    return [
      { t: 0.2, name: 'shimmer', gain: 0.2, pitch: 0.9 },
      { t: 1.85, name: 'ping', gain: 0.24, pitch: 1.1 },
      { t: 2.25, name: 'swish', gain: 0.26, pitch: 1.15 },
      { t: p2, name: 'swish', gain: 0.3, pitch: 0.8 },
      { t: p2 + 0.95, name: 'tick', gain: 0.36, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    const lk = live(v);
    const T = times(v);
    if (lk <= 0 || v.gt < T.cleo - 0.1 || v.gt > beatStart(v, 5)) return;
    const y = rulerY(v);
    const xc = tx(v, AGE.cleopatra), xp = tx(v, AGE.pyramid), xm = tx(v, AGE.moon);
    const outK = 1 - L.enter(v.gt, T.out, 0.4, L.ease.inCubic);        // brackets, LM, tags leave as beat 4 zooms out
    const fadeAll = lk * (1 - L.enter(v.gt, beatStart(v, 4) + 1.4, 0.4));

    // ---- brackets (drawn first: under the subjects' pins)
    const kb2 = L.prog(v.gt, T.brMoon, 0.7), kb1 = L.prog(v.gt, T.brPyr, 0.8);
    if (outK > 0) {
      ctx.save();
      ctx.globalAlpha *= outK * lk;
      if (kb2 > 0) {
        const e = L.ease.inOutCubic(kb2);
        // the near span also glows on the ruler: "closer"
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = L.rgba(ACCENT, 0.7 * e); ctx.lineWidth = 4;
        ctx.shadowColor = L.rgba(ACCENT); ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(xc, y); ctx.lineTo(L.lerp(xc, xm, e), y); ctx.stroke();
        ctx.restore();
        hBracket(ctx, xc, L.lerp(xc, xm, e), BRK_Y, 1, ACCENT, '', 'below');
        bracketLabel(ctx, (xc + xm) / 2, BRK_Y + 18, '2,000', L.prog(v.gt, T.brMoon + 0.35, 0.5), ACCENT);
      }
      if (kb1 > 0) {
        const e = L.ease.inOutCubic(kb1);
        hBracket(ctx, L.lerp(xc, xp, e), xc, BRK_Y, 1, INKW, '', 'below');
        bracketLabel(ctx, (xp + xc) / 2, BRK_Y + 18, '2,530', L.prog(v.gt, T.brPyr + 0.4, 0.5), INKW);
      }
      // the verdict: a ">" chevron between the two numbers, under Cleopatra
      const kc = L.prog(v.gt, T.cmp, 0.45);
      if (kc > 0) {
        const e = L.ease.outBack(kc, 2);
        const cx = xc, cy = BRK_Y + 50;
        ctx.save();
        ctx.globalAlpha *= L.clamp(kc * 2);
        ctx.fillStyle = 'rgba(4,10,16,0.9)';
        ctx.strokeStyle = L.rgba(ACCENT, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, 24 * e), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = L.rgba(ACCENT);
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 6 * e, cy - 11 * e); ctx.lineTo(cx + 7 * e, cy); ctx.lineTo(cx - 6 * e, cy + 11 * e); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // ---- the lunar module on a leader above NOW-ish (1969)
    const km = L.ease.outCubic(L.prog(v.gt, T.moon, 0.6)) * outK * lk;
    if (km > 0) {
      const gy = y - LM_LIFT;
      ctx.save();
      ctx.globalAlpha *= L.clamp(km * 1.5);
      ctx.strokeStyle = L.rgba(ACCENT, 0.75); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xm, y); ctx.lineTo(xm, L.lerp(y, gy + 6, km)); ctx.stroke();
      ctx.fillStyle = L.rgba(ACCENT);
      ctx.beginPath(); ctx.arc(xm, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      drawLM(ctx, xm, gy + (1 - km) * 20, 11.5, km);
      tag(ctx, xm, TAG_Y, '1969', { k: km, color: ACCENT, size: 30, family: L.FONT.din, tr: 2, maxW: 160 });
      tag(ctx, xm, TAG_Y + 28, 'APOLLO 11', { k: km, color: GREYTXT, size: 17, weight: 600, tr: 2, maxW: 150 });
    }

    // ---- Cleopatra
    const sk = sizeK(v, AGE.cleopatra, 40, 230);
    const ke = L.ease.outCubic(L.prog(v.gt, T.cleo, 0.65));
    if (sk > 0.02 && ke > 0) {
      const r = MED_R * L.lerp(0.06, 1, sk) * L.lerp(0.92, 1, ke);
      const cy = y - L.lerp(10, MED_LIFT, L.ease.outCubic(sk)) + (1 - ke) * 24;
      ctx.save();
      ctx.globalAlpha *= fadeAll * L.clamp(sk * 2);
      pin(ctx, xc, y, cy + r, ke, ACCENT);
      drawMedallion(ctx, xc, cy, r, L.clamp(ke * 1.4), ke, v.gt);
      ctx.restore();
      tag(ctx, xc, TAG_Y, '30 BC', { k: L.prog(v.gt, T.tags, 0.5) * outK * fadeAll, color: GOLD, size: 30, family: L.FONT.din, tr: 2, maxW: 160 });
    }
    landmark(ctx, v, AGE.cleopatra, { k: dotK(v, AGE.cleopatra) * fadeAll, color: GOLD, r: 5 });
  },
};
