// Beat 6 — "Malaria alone killed six hundred and ten thousand people in 2024, | most of them children under five."
// The camera pulls back out of the macro shot: the mosquito shrinks into the #1 slot of the board (camera.js). Once it
// is small and docked low-left, a real Earth (earth.js) scales in (opaque) in the hero zone, Africa facing us. The
// globe fills with dots while the mosquito's bar grows — 1 dot ≈ 1,000 deaths, placed by approximate country shares
// (≈ 95 % in the WHO African Region); the value ≈ 610,000 (WHO World Malaria Report 2025) is revealed ON "thousand".
// Then "≈ 95% · WHO AFRICAN REGION" with a leader to Africa; phrase 1 ("under five"): the sub line becomes the pill
// ≈ 3 IN 4 WERE CHILDREN UNDER 5.
import * as L from '../../../../engine/runtime/lib.js';
import { drawEarth, project, isLand } from '../../../../engine/runtime/earth.js';
import { RED, INKW, GREYT, B, BE, PH, W8, countE, statBlock, rowT } from '../env.js';

const { W } = L;
// vertical budget: globe 355–695 · number cells 737–859 · source line 918 · board from 960. On "under five" the number
// + source line drop away and the pill takes their place (centred at PILL_Y), so never more than three blocks.
const G = { cx: 540, cy: 525, r: 170, lat0: 4, lon0: 22 };
const PILL_Y = 826;

// approximate shares of 2024 malaria deaths (WHO World Malaria Report 2025: ≈ 95 % in the WHO African Region; Nigeria
// ≈ 3 in 10, DR Congo ≈ 1 in 9 ...). Used only to PLACE the 610 dots (1 dot ≈ 1,000 deaths); no country is labelled.
const AFR = [
  [9.2, 7.8, 3.6, 30.5], [-3.5, 23.5, 4.5, 11.5], [13.8, 7.5, 2.0, 5.5], [-6.5, 34.5, 3, 4.3], [-16, 36, 3, 3.8],
  [12.3, -1.5, 1.8, 3.2], [1.3, 32.5, 1.5, 3.0], [13, -6, 2.5, 2.6], [-11.5, 17.5, 3, 2.5], [5.5, 12.5, 2, 2.6],
  [7.5, -5.5, 1.5, 2.0], [7.5, -1.2, 1.3, 1.9], [11, 18, 2.5, 1.8], [10.5, -11, 1.5, 1.6], [9.5, 2.3, 0.8, 1.2],
  [-13.5, 34, 1, 1.2], [0.5, 35.5, 1.5, 1.2], [-19, 46.8, 2, 1.0], [-13.5, 27.5, 2.5, 1.0], [7, 30.5, 2, 1.0],
  [-3.3, 29.9, 0.5, 0.9], [8.5, -11.8, 0.8, 1.0], [9, 38.5, 3, 0.9], [6.5, 20.5, 2, 0.8], [8.5, 1.0, 0.6, 0.6],
  [14, -14.5, 1.2, 0.5], [6.5, -9.5, 0.8, 0.5], [-1, 15, 1.5, 0.6], [-19, 29.8, 1.5, 0.3], [-2, 30, 0.4, 0.2], [0, 11.5, 1, 0.3],
];
// outside the African Region (≈ 5 %): only regions on the globe's VISIBLE side, so every one of the 610 dots can be
// seen and counted (the far-side shares — Papua New Guinea, Indonesia, the Amazon, ≈ 1 % of deaths — are spread over
// these; see youtube.md). Checked: all 610 dots project with z > 0.05 for the whole beat.
const OTHER = [
  [13.5, 30, 2.5, 1.5], [21, 82, 4, 1.0], [27, 68, 2.5, 0.4], [15, 45, 1.5, 0.3], [5, 45.5, 2, 0.4],
  [21, 96, 2, 0.1], [34, 66, 2, 0.1],
];
const DOTS = (() => {
  const N = 610, r = L.rng(3161);
  const sa = AFR.reduce((a, q) => a + q[3], 0), so = OTHER.reduce((a, q) => a + q[3], 0);
  const list = [...AFR.map((q) => [...q, (q[3] / sa) * 0.95]), ...OTHER.map((q) => [...q, (q[3] / so) * 0.05])];
  // largest-remainder allocation of the 610 dots
  const raw = list.map((q) => q[4] * N), n = raw.map(Math.floor);
  let left = N - n.reduce((a, b) => a + b, 0);
  raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => n[i]++);
  const out = [];
  list.forEach((q, i) => {
    for (let k = 0; k < n[i]; k++) {
      let lat, lon, tries = 0;
      do {
        const a = r() * Math.PI * 2, d = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * q[2] * 0.6;
        lat = q[0] + Math.sin(a) * d; lon = q[1] + Math.cos(a) * d / Math.cos(q[0] * Math.PI / 180);
      } while (!isLand(lat, lon) && ++tries < 40);
      out.push({ lat, lon, key: r(), afr: i < AFR.length });
    }
  });
  return out.sort((a, b) => a.key - b.key);
})();

// the globe arrives once the pulled-back mosquito is small and low-left (no see-through overlap): opaque, scaled in
const globeIn = (tl, gt) => L.ease.outCubic(L.prog(gt, B(tl, 6, 0.55), 0.5));

export default {
  beat: 6,
  chapter: null,
  captions: true,
  layer: 2,
  drawWorld(c, v) {
    const tl = v.tl, gt = v.gt;
    const k = globeIn(tl, gt) * (1 - L.ease.inCubic(L.prog(gt, BE(tl, 6, -0.4), 0.35)));
    if (k <= 0.002) return;
    const kin = globeIn(tl, gt), kout = 1 - L.ease.inCubic(L.prog(gt, BE(tl, 6, -0.4), 0.35));
    const g = { ...G, r: G.r * L.lerp(0.55, 1, kin) * L.lerp(0.9, 1, kout), rot: 0, tilt: 0, lon0: G.lon0 + (gt - B(tl, 6)) * 0.9 };
    c.save();
    c.globalAlpha = kout;   // opaque from its first frame (scale-in); only the exit fades
    drawEarth(c, { ...g, style: 'night', lights: 0.35, sun: [-0.35, 0.45, 0.82], atmosphere: 0.7 });
    // dots: as many as the counter's thousands
    const n = Math.min(DOTS.length, Math.round(DOTS.length * countE(tl, 'mosq', gt)));
    c.fillStyle = L.rgba(RED, 0.9);
    for (let i = 0; i < n; i++) {
      const d = DOTS[i];
      const p = project(d.lat, d.lon, g);
      if (!p.visible || p.z < 0.05) continue;
      c.globalAlpha = kout * L.clamp(p.z * 4 + 0.35) * 0.95;
      c.beginPath(); c.arc(p.x, p.y, 2.3, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    v._g = g;
  },
  drawOverlay(c, v) {
    const tl = v.tl, gt = v.gt;
    // ---- stat: count lands ON "thousand"; on "under five" the number + source drop away and the pill takes their place
    const t0 = rowT(tl, 'mosq').pre;
    const uk = L.ease.outCubic(L.prog(gt, W8(tl, 'under', -0.15), 0.4));
    statBlock(c, v, 'mosq', 'MALARIA DEATHS IN 2024 · WHO WORLD MALARIA REPORT 2025', { color: RED, exit: [W8(tl, 'under', -0.45), 0.3] });
    if (uk > 0) {
      // pill: opaque plate scaled in, text fades
      const txt = '≈ 3 IN 4 WERE CHILDREN UNDER 5';
      c.save();
      c.globalAlpha *= v.k;
      c.font = L.font(34, 800, L.FONT.display);
      c.letterSpacing = '3px';
      const tw = c.measureText(txt).width - 3;
      c.letterSpacing = '0px';
      const pw = tw + 64, ph = 64, s = L.lerp(0.75, 1, L.ease.outBack(L.clamp(uk), 2));
      c.translate(W / 2, PILL_Y);
      c.scale(s, s);
      c.fillStyle = L.rgba(RED);
      L.roundRect(c, -pw / 2, -ph / 2, pw, ph, ph / 2); c.fill();
      c.globalAlpha *= L.clamp(uk * 2);
      c.fillStyle = 'rgb(18,8,10)';
      c.textBaseline = 'middle';
      c.letterSpacing = '3px';
      c.fillText(txt, -tw / 2, 2);
      c.letterSpacing = '0px';
      c.restore();
    }
    // ---- ≈ 95 % WHO African Region (after the number lands) + the dot key
    const g = { ...G, rot: 0, tilt: 0, lon0: G.lon0 + (gt - B(tl, 6)) * 0.9 };
    const lk = L.ease.outCubic(L.prog(gt, W8(tl, 'malThousand', 0.55), 0.5)) * v.k;
    if (lk > 0) {
      const p = project(6, 20, g);
      const lx = 790, ly = 420;
      c.save();
      c.globalAlpha = lk;
      L.leader(c, p.x, p.y, lx - 14, ly + 12, L.prog(gt, W8(tl, 'malThousand', 0.55), 0.45), INKW, 0.8);
      c.textBaseline = 'alphabetic';
      c.font = L.font(64, 800, L.FONT.display);
      c.fillStyle = L.rgba(RED);
      c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 14;
      c.textAlign = 'left';
      c.fillText('≈ 95%', lx, ly);
      c.font = L.font(19, 700, L.FONT.body);
      c.fillStyle = L.rgba(INKW, 0.92);
      L.trackedText(c, 'WHO AFRICAN', lx + 2, ly + 34, 2.5);
      L.trackedText(c, 'REGION', lx + 2, ly + 58, 2.5);
      c.restore();
    }
    const dk = L.ease.outCubic(L.prog(gt, t0 + 0.2, 0.4)) * v.k * globeIn(tl, gt);
    if (dk > 0) {
      c.save();
      c.globalAlpha = dk;
      c.fillStyle = L.rgba(RED, 0.9);
      // the dot key, upper left of the globe (mirrors the ≈ 95 % label): no extra block between globe and number
      c.font = L.font(19, 700, L.FONT.body);
      const x0 = 96, ky = 404;
      c.beginPath(); c.arc(x0 + 5, ky, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = L.rgba(GREYT, 0.95);
      c.textBaseline = 'middle';
      L.trackedText(c, '1 DOT ≈', x0 + 18, ky + 1, 2);
      L.trackedText(c, '1,000 DEATHS', x0, ky + 27, 2);
      c.restore();
    }
    void PH;
  },
};
