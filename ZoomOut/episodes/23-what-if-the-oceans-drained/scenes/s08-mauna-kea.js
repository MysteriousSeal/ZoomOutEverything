// Beat 8 — "Hawaii's Mauna Kea now stands over ten kilometers tall, | taller than Everest."
// The camera dives to Hawaii (mpp 1500, the island at ≈ (540, 694)); the sea drops to −6,000 m and the moat round the
// island runs dry (env). This scene adds:
//   * a pin on Mauna Kea's summit with a small MAUNA KEA tag (on "Mauna Kea");
//   * a TO-SCALE side-profile inset (opaque card x 80–900, y 892–1340, above the caption band): Mauna Kea rises from its
//     base on the sea floor (≈ 6.0 km below sea level) to 4.2 km above it — 10.2 km BASE TO PEAK — with today's sea
//     level drawn across it at 6.0 km up; beside it Everest, 8.85 km ABOVE SEA LEVEL. Both share one vertical scale
//     (20 px/km) and one horizontal scale; heights are exaggerated ×7 for both (noted on the card), because at 1:1
//     a 200 km-wide shield 10 km high would be a 40 px sliver. Shapes are honest: Mauna Kea a broad shield (true
//     flank slopes 5–8°, half-width ≈ 98 km to the moat), Everest a steep pyramid with the Nuptse and Lhotse
//     shoulders. Mauna Kea rises with a counter on "over ten kilometers tall", Everest on "taller than Everest", then
//     a dashed line from Mauna Kea's peak shows it clears Everest.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PLACES, project } from '../env.js';
import { drawPin, wordAt } from './s06-ridge.js';

const CARD = { x: 80, y: 892, w: 820, h: 448, r: 20 };
const BASE_Y = 1262;                       // the common baseline: Mauna Kea's sea-floor base / Everest's sea level
const V = 20;                              // px per km (vertical)
const EXAG = 7;
const HZ = V / EXAG;                       // px per km (horizontal)
const MK = { x: 410, h: 10.2, sea: 6.0 };  // summit x; height base→peak; today's sea level above its base (km)
const EV = { x: 775, h: 8.85 };

// Mauna Kea half-profile [km from summit, km above base]: shield flanks 5–8°, little cinder cones near the top
const MK_HALF = [[0, 10.2], [1.2, 10.16], [2.4, 10.02], [3.0, 10.1], [3.6, 10.0], [5.5, 9.85], [6.2, 9.93], [7, 9.74], [11, 9.3],
  [16, 8.6], [22, 7.8], [29, 6.85], [36, 6.0], [44, 4.95], [52, 3.85], [60, 2.85], [68, 1.95], [76, 1.2], [84, 0.6], [91, 0.22], [99, 0]];
// Everest from the south [km from summit, km above sea level]: the Nuptse shoulder (W), the summit pyramid, the South
// Col and Lhotse (E), the massif falling away to the foothills
const EV_PROF = [[-22, 0], [-19, 0.6], [-16, 1.5], [-13.5, 2.5], [-11, 3.6], [-9.2, 4.6], [-7.6, 5.5], [-6.3, 6.4], [-5.2, 7.2],
  [-4.4, 7.86], [-3.6, 7.3], [-2.7, 7.45], [-1.7, 7.95], [-0.8, 8.5], [0, 8.85], [0.7, 8.35], [1.4, 7.95], [2.1, 8.1],
  [2.9, 8.52], [3.6, 8.2], [4.6, 7.4], [5.8, 6.5], [7.4, 5.5], [9.2, 4.5], [11.4, 3.4], [14, 2.3], [17, 1.3], [20, 0.5], [22, 0]];

const mkPts = () => {
  const left = MK_HALF.slice().reverse().map(([d, h]) => [MK.x - d * 1.04 * HZ, h]);
  const right = MK_HALF.slice(1).map(([d, h]) => [MK.x + d * HZ, h]);
  return [...left, ...right];
};
const MK_PTS = mkPts();
const EV_PTS = EV_PROF.map(([d, h]) => [EV.x + d * HZ, h]);
const yOf = (h, k = 1) => BASE_Y - h * V * k;

function smoothPath(c, pts, k) {
  c.moveTo(pts[0][0], yOf(pts[0][1], k));
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, h0] = pts[i], [x1, h1] = pts[i + 1];
    c.quadraticCurveTo(x0, yOf(h0, k), (x0 + x1) / 2, yOf((h0 + h1) / 2, k));
  }
  const l = pts[pts.length - 1];
  c.lineTo(l[0], yOf(l[1], k));
}
function polyPath(c, pts, k) { pts.forEach(([x, h], i) => (i ? c.lineTo(x, yOf(h, k)) : c.moveTo(x, yOf(h, k)))); }

/** fitted, tracked caps line; returns its width */
function caps(c, txt, x, y, size, maxW, align, color, weight = 700, track = 3) {
  c.letterSpacing = `${track}px`;
  const s = L.fitSize(c, txt, maxW, size, weight, L.FONT.body, 11);
  c.letterSpacing = '0px';
  c.font = L.font(s, weight, L.FONT.body);
  c.fillStyle = color;
  return L.trackedText(c, txt, x, y, track, align);
}
function bigNum(c, txt, x, y, size, maxW, align, flash = 0) {
  const s = L.fitSize(c, txt, maxW, size, 800, L.FONT.display, 24);
  c.font = L.font(s, 800, L.FONT.display);
  c.fillStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.5 * flash));
  c.save();
  c.shadowColor = L.rgba(ACCENT, 0.8 * flash); c.shadowBlur = 20 * flash;
  L.trackedText(c, txt, x, y, -0.5, align);
  c.restore();
}
/** vertical measuring bracket with end ticks; tick points toward the mountain (dir = +1 right, −1 left) */
function bracket(c, x, yTop, yBot, k, dir, alpha) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= alpha;
  c.strokeStyle = 'rgba(235,242,248,0.85)';
  c.lineWidth = 2;
  const y1 = L.lerp(yBot, yTop, e);
  c.beginPath();
  c.moveTo(x + dir * 9, yBot); c.lineTo(x, yBot); c.lineTo(x, y1);
  if (e > 0.98) c.lineTo(x + dir * 9, yTop);
  c.stroke();
  c.restore();
}
function dashed(c, x0, x1, y, k, color, alpha, dash = [7, 6]) {
  if (k <= 0) return;
  c.save();
  c.strokeStyle = L.rgba(color, alpha);
  c.lineWidth = 1.6;
  c.setLineDash(dash);
  c.beginPath(); c.moveTo(x0, y); c.lineTo(L.lerp(x0, x1, L.ease.outCubic(L.clamp(k))), y); c.stroke();
  c.restore();
}

/** beat-local timing (global s) from the voice */
function times(v) {
  const b = v.tl.scenes[8].start;
  const mauna = wordAt(v.tl, 8, 'mauna'), over = wordAt(v.tl, 8, 'over'), tall = wordAt(v.tl, 8, 'tall'), taller = wordAt(v.tl, 8, 'taller');
  const pin = (mauna?.start ?? b + 0.7) - 0.1;
  const mk0 = (over?.start ?? b + 2.1) - 0.45, mk1 = (tall?.start ?? b + 3.5) - 0.05;
  const ev0 = (taller?.start ?? b + 4.5) - 0.55, ev1 = ev0 + 0.95;
  return { pin, card: mk0 - 0.2, mk0, mk1, ev0, ev1, cmp: ev1 + 0.1 };   // the card arrives with the rise
}

export default {
  beat: 8,
  chapter: { num: '07', title: 'Mauna Kea', sub: 'base to peak' },
  layer: 8,
  cues(d) {
    // beat starts 47.29: pin on "Mauna" (47.98 → +0.6), card +1.5 (with the rise), Mauna Kea rises 49.0–50.76 (lands +3.45),
    // Everest 51.26–52.21 (lands +4.9), the compare line +5.0
    return [
      { t: 0.6, name: 'ping', gain: 0.26, pitch: 1.0 },
      { t: 1.5, name: 'swish', gain: 0.24, pitch: 1.0 },
      { t: 1.75, name: 'riser', gain: 0.22, pitch: 0.8 },
      { t: 3.45, name: 'impact', gain: 0.34, pitch: 0.9 },
      { t: 4.0, name: 'blip', gain: 0.22, pitch: 0.9 },
      { t: 4.9, name: 'tick', gain: 0.3, pitch: 1.1 },
      { t: 5.05, name: 'shimmer', gain: 0.2, pitch: 1.2 },
    ];
  },
  drawOverlay(c, v) {
    const T = times(v);
    // ---- the pin on the map
    const pk = L.prog(v.gt, T.pin, 0.5);
    if (pk > 0) {
      const p = project(v, PLACES.maunaKea.lat, PLACES.maunaKea.lon);
      const a = v.k * L.smoothstep(L.clamp((p.z - 0.2) / 0.2));
      drawPin(c, p.x, p.y, pk, L.prog(v.gt, T.pin + 0.1, 0.9), a);
      const tk = L.ease.outCubic(L.prog(v.gt, T.pin + 0.15, 0.45));
      if (tk > 0 && a > 0.01) {
        c.save();
        c.globalAlpha *= a * tk;
        c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10;
        c.textBaseline = 'middle';
        caps(c, 'MAUNA KEA', p.x + 24 + (1 - tk) * 10, p.y, 24, 900 - p.x - 30, 'left', 'rgba(242,246,250,0.97)', 700, 3);
        c.restore();
      }
    }
    // ---- the inset card
    const ck = v.k * L.ease.outCubic(L.prog(v.gt, T.card, 0.5));
    if (ck <= 0) return;
    const lift = (1 - ck) * 36;
    c.save();
    c.globalAlpha *= ck;
    c.translate(0, lift);
    // card
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30;
    L.roundRect(c, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
    c.fillStyle = 'rgba(6,10,19,0.9)';
    c.fill();
    c.restore();
    L.roundRect(c, CARD.x + 0.5, CARD.y + 0.5, CARD.w - 1, CARD.h - 1, CARD.r);
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.stroke();
    // plot clip (inside the card)
    c.save();
    L.roundRect(c, CARD.x + 1, CARD.y + 1, CARD.w - 2, CARD.h - 2, CARD.r - 1);
    c.clip();
    // faint 2 km grid
    c.fillStyle = 'rgba(255,255,255,0.045)';
    for (let km = 2; km <= 10; km += 2) c.fillRect(CARD.x + 16, yOf(km) - 0.5, CARD.w - 32, 1);
    const kMK = L.ease.inOutCubic(L.prog(v.gt, T.mk0, T.mk1 - T.mk0));
    const kEV = L.ease.inOutCubic(L.prog(v.gt, T.ev0, T.ev1 - T.ev0));
    const mkRight = MK_PTS[MK_PTS.length - 1][0];
    // today's ocean round Mauna Kea (behind it): rises with the mountain to 6.0 km
    if (kMK > 0) {
      const ys = yOf(MK.sea, kMK);
      const g = c.createLinearGradient(0, ys, 0, BASE_Y);
      g.addColorStop(0, 'rgba(40,120,200,0.30)'); g.addColorStop(1, 'rgba(10,40,90,0.40)');
      c.fillStyle = g;
      c.fillRect(CARD.x, ys, mkRight + 18 - CARD.x, BASE_Y - ys);
    }
    // Mauna Kea
    if (kMK > 0) {
      c.beginPath(); smoothPath(c, MK_PTS, kMK); c.closePath();
      const g = c.createLinearGradient(0, yOf(MK.h), 0, BASE_Y);
      g.addColorStop(0, '#8a7a6a'); g.addColorStop(0.42, '#5d5149'); g.addColorStop(1, '#2f2a29');
      c.fillStyle = g; c.fill();
      // the drowned part reads as under the (former) ocean: a cool tint below the sea line
      c.save(); c.clip();
      const ys = yOf(MK.sea, kMK);
      c.fillStyle = 'rgba(30,90,160,0.28)';
      c.fillRect(CARD.x, ys, mkRight - CARD.x, BASE_Y - ys);
      c.restore();
      // rim light from the upper left
      c.save();
      c.beginPath(); smoothPath(c, MK_PTS.slice(0, MK_HALF.length + 2), kMK);
      c.strokeStyle = 'rgba(240,220,190,0.55)'; c.lineWidth = 1.6; c.stroke();
      c.restore();
    }
    // Everest
    if (kEV > 0) {
      c.beginPath(); polyPath(c, EV_PTS, kEV); c.closePath();
      const g = c.createLinearGradient(EV.x - 60, 0, EV.x + 60, 0);
      g.addColorStop(0, '#7d8794'); g.addColorStop(0.5, '#5a6370'); g.addColorStop(1, '#373d47');
      c.fillStyle = g; c.fill();
      // snow above ≈ 6 km
      c.save(); c.clip();
      const ysn = yOf(6.0, kEV);
      const sg = c.createLinearGradient(0, yOf(EV.h, kEV), 0, ysn + 14);
      sg.addColorStop(0, 'rgba(240,244,250,0.95)'); sg.addColorStop(0.75, 'rgba(225,232,242,0.75)'); sg.addColorStop(1, 'rgba(225,232,242,0)');
      c.fillStyle = sg;
      c.fillRect(EV.x - 120, yOf(EV.h, kEV) - 4, 240, ysn - yOf(EV.h, kEV) + 18);
      c.restore();
      c.beginPath(); polyPath(c, EV_PTS.slice(0, 15), kEV);
      c.strokeStyle = 'rgba(250,250,255,0.6)'; c.lineWidth = 1.4; c.stroke();
    }
    c.restore(); // plot clip
    // baselines
    c.fillStyle = 'rgba(235,240,246,0.55)';
    c.fillRect(CARD.x + 14, BASE_Y, mkRight + 20 - CARD.x - 14, 2);
    c.fillRect(EV_PTS[0][0] - 12, BASE_Y, EV_PTS[EV_PTS.length - 1][0] + 12 - (EV_PTS[0][0] - 12), 2);
    // today's sea level on Mauna Kea
    if (kMK > 0.98) {
      const sk = L.prog(v.gt, T.mk1 - 0.05, 0.6);
      dashed(c, CARD.x + 14, mkRight + 18, yOf(MK.sea), sk, [140, 205, 255], 0.85);
      if (sk > 0.3) {
        c.save(); c.globalAlpha *= L.clamp((sk - 0.3) * 2);
        caps(c, "TODAY'S SEA LEVEL", mkRight + 14, yOf(MK.sea) - 9, 14, 220, 'right', 'rgba(150,210,255,0.9)', 700, 2);
        c.restore();
      }
    }
    // measuring brackets + numbers
    const fMK = Math.exp(-Math.pow((v.gt - T.mk1) / 0.3, 2)) * (v.gt > T.mk1 - 0.3 ? 1 : 0);
    const fEV = Math.exp(-Math.pow((v.gt - T.ev1) / 0.3, 2)) * (v.gt > T.ev1 - 0.3 ? 1 : 0);
    if (kMK > 0) {
      bracket(c, CARD.x + 22, yOf(MK.h, kMK), BASE_Y, 1, 1, 1);
      dashed(c, CARD.x + 22, MK.x, yOf(MK.h, kMK), L.prog(v.gt, T.mk0 + 0.2, 0.4), [235, 242, 248], 0.45, [3, 5]);
      c.save();
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
      bigNum(c, `${(MK.h * kMK).toFixed(1)} km`, CARD.x + 38, 984, 56, 230, 'left', fMK);
      c.globalAlpha *= L.clamp(L.prog(v.gt, T.mk1 - 0.2, 0.4));
      caps(c, 'BASE TO PEAK', CARD.x + 40, 1014, 19, 230, 'left', 'rgba(220,228,238,0.95)', 700, 3);
      c.restore();
    }
    if (kEV > 0) {
      bracket(c, CARD.x + CARD.w - 22, yOf(EV.h, kEV), BASE_Y, 1, -1, 1);
      dashed(c, CARD.x + CARD.w - 22, EV.x, yOf(EV.h, kEV), 1, [235, 242, 248], 0.4, [3, 5]);
      c.save();
      c.textBaseline = 'alphabetic';
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
      bigNum(c, `${(EV.h * kEV).toFixed(2)} km`, EV.x - 12, 1004, 50, 220, 'center', fEV);
      c.globalAlpha *= L.clamp(L.prog(v.gt, T.ev1 - 0.25, 0.4));
      caps(c, 'ABOVE SEA LEVEL', EV.x - 12, 1032, 17, 200, 'center', 'rgba(220,228,238,0.95)', 700, 2.5);
      c.restore();
    }
    // Mauna Kea's peak clears Everest: an accent dashed line across at 10.2 km
    const ck2 = L.prog(v.gt, T.cmp, 0.6);
    if (ck2 > 0) {
      dashed(c, MK.x + 8, EV.x + 70, yOf(MK.h), ck2, ACCENT, 0.95, [8, 6]);
      c.save();
      c.globalAlpha *= L.clamp(ck2 * 2 - 1);
      // a small up-chevron over Everest's peak: Mauna Kea's top is higher
      const x = EV.x, y = (yOf(MK.h) + yOf(EV.h)) / 2;
      c.strokeStyle = L.rgba(ACCENT, 0.95); c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 7, y + 4); c.lineTo(x, y - 4); c.lineTo(x + 7, y + 4); c.stroke();
      c.restore();
    }
    // names under the baselines + the scale note
    c.save();
    c.textBaseline = 'alphabetic';
    const nk = L.clamp(L.prog(v.gt, T.card + 0.2, 0.4));
    c.globalAlpha *= nk;
    caps(c, 'MAUNA KEA', MK.x, BASE_Y + 34, 20, 300, 'center', 'rgba(236,240,246,0.95)', 700, 3);
    caps(c, 'EVEREST', EV.x, BASE_Y + 34, 20, 200, 'center', 'rgba(236,240,246,0.95)', 700, 3);
    caps(c, `SAME SCALE · HEIGHTS ×${EXAG}`, CARD.x + 22, CARD.y + 32, 13, 360, 'left', 'rgba(200,210,224,0.55)', 600, 2);
    c.restore();
    c.restore();
  },
};
