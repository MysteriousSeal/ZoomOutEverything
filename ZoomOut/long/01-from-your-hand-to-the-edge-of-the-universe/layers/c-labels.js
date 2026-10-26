// Builder C — labels for beats 13–17, drawn by the solar layer on the forward pass only (so they can carry across
// beat boundaries without the overlay dip). Every time comes from the live timeline (v.tl).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, INK, band } from '../world.js';
import { AU, LY, SUN, VOYAGER, eclDir } from '../camera.js';
import { PLANETS, planet, ph, wordT, sceneStart, win, voyProgress, LIGHT_DAY_AU, HELIOPAUSE_AU, NOSE_LON } from './c-data.js';
import { tag, textH, SUBCOL } from './c-draw.js';

const { W, H } = L;
// elbow offsets (px) and text side per planet, chosen against the true layout on the date
const PLACE = {
  MERCURY: [-30, -62, 'l'], VENUS: [44, 50, 'r'], EARTH: [46, -46, 'r'], MARS: [-46, -40, 'l'],
  JUPITER: [-42, 48, 'l'], SATURN: [40, -40, 'r'], URANUS: [-42, -40, 'l'], NEPTUNE: [48, 46, 'r'],
};

function sunRelPoint(v, angDeg, rMetres) {
  const a = angDeg * Math.PI / 180, r = rMetres / v.cam.mpp;
  return { x: v.wx(SUN.x) + Math.cos(a) * r, y: v.wy(SUN.y) - Math.sin(a) * r, r };
}

export function drawLabels(c, v) {
  const gt = v.gt, lf = v.cam.lf;
  if (gt < sceneStart(v, 13) || gt > sceneStart(v, 18) + 1) return;
  const S15 = sceneStart(v, 15), S16 = sceneStart(v, 16), S17 = sceneStart(v, 17), S18 = sceneStart(v, 18);
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);

  // ---- beat 13–14: the Sun, then the inner planets
  const inner = band(lf, 0, 0, 12.3, 12.55);
  const tSun = ph(v, 13, 1).start + 0.9;
  const sunK = win(gt, tSun, S15 + 0.3) * inner;
  tag(c, sx, sy, { text: 'THE SUN', sub: '1.39 MILLION KM ACROSS · 109 EARTHS', dx: -34, dy: 62, side: 'l', gap: 26, k: sunK, col: [255, 226, 180] });

  const on = {
    EARTH: ph(v, 13, 1).start + 1.5,
    MERCURY: wordT(v, 14, 0, 'Mercury'), VENUS: wordT(v, 14, 0, 'Venus'), MARS: wordT(v, 14, 0, 'Mars'),
    JUPITER: wordT(v, 15, 1, 'Jupiter'), SATURN: wordT(v, 15, 1, 'Saturn'), URANUS: wordT(v, 15, 1, 'Uranus'),
    NEPTUNE: wordT(v, 15, 2, 'Neptune'),
  };
  for (const p of PLANETS) {
    const giant = p.a > 4;
    const k = win(gt, on[p.name], giant ? S16 + 0.6 : S15 + 0.3) * (giant ? band(lf, 0, 0, 13.45, 13.65) : inner);
    if (k <= 0.004) continue;
    const [dx, dy, side] = PLACE[p.name];
    tag(c, v.wx(p.x), v.wy(p.y), { text: p.name, sub: p.sub, dx, dy, side, k, col: L.mix(INK, p.col, 0.25) });
  }

  // asteroid belt: lettered on the belt itself, lower right
  const kb = win(gt, wordT(v, 14, 2, 'asteroid') + 0.3, S15 + 0.5) * band(lf, 0, 0, 12.35, 12.6);
  if (kb > 0.004) {
    const q = sunRelPoint(v, -16, 2.75 * AU);
    textH(c, 'ASTEROID BELT', q.x, q.y - 11, { size: 19, align: 'center', col: [236, 222, 196], a: kb });
    textH(c, '2.2–3.3 AU', q.x, q.y + 12, { size: 16, weight: 600, track: 1.5, align: 'center', col: SUBCOL, a: kb });
  }
  // Kuiper belt: lettered on the belt, left of the Sun
  const kk = win(gt, wordT(v, 15, 2, 'Neptune') + 1.8, S16 + 0.6) * band(lf, 12.9, 13.1, 13.45, 13.65);
  if (kk > 0.004) {
    const q = sunRelPoint(v, 180, 44 * AU);
    textH(c, 'KUIPER BELT', q.x, q.y - 11, { size: 18, align: 'center', col: [200, 216, 245], a: kk });
    textH(c, '30–50 AU', q.x, q.y + 12, { size: 16, weight: 600, track: 1.5, align: 'center', col: SUBCOL, a: kk });
  }
  // honesty note for the enlarged planet dots
  const kn = win(gt, ph(v, 13, 1).start + 1.8, S16 + 0.8, 0.6, 0.6);
  if (kn > 0.004) textH(c, 'PLANET SIZES ENLARGED · DISTANCES TO SCALE', 1600, 858, { size: 16, weight: 600, track: 2, align: 'right', col: [150, 165, 190], a: kn * 0.9 });

  // ---- beat 16: Voyager 1, the heliopause, one light-day
  const outer = band(lf, 0, 0, 14.0, 14.3);
  const kv = win(gt, ph(v, 16, 0).start + 2.5, S17 - 0.35) * outer * (voyProgress(v) >= 1 ? 1 : 0);
  tag(c, v.wx(VOYAGER.x), v.wy(VOYAGER.y), { text: 'VOYAGER 1', sub: 'LAUNCHED 1977 · 25 BILLION KM', dx: -30, dy: 64, side: 'l', gap: 10, k: kv, col: L.mix(INK, ACCENT, 0.45) });

  const kh = win(gt, ph(v, 16, 1).start + 0.4, S17 - 0.35) * outer;
  if (kh > 0.004) {
    const nose = eclDir(NOSE_LON), na = Math.atan2(-nose.y, nose.x) * 180 / Math.PI;   // screen angle (ccw, y up)
    const a = 22, phi = (a - na) * Math.PI / 180;
    const q = sunRelPoint(v, a, HELIOPAUSE_AU * AU * (1 + 0.9 * Math.pow((1 - Math.cos(phi)) / 2, 1.5)));
    tag(c, q.x, q.y, { text: 'HELIOPAUSE', sub: '~120 AU · VOYAGER 1 CROSSED IT IN 2012', dx: -26, dy: 30, side: 'l', gap: 4, k: kh, col: [190, 214, 255] });
  }
  const kd = win(gt, ph(v, 16, 2).start + 0.6, S17 - 0.35) * outer;
  if (kd > 0.004) {
    const q = sunRelPoint(v, 26, LIGHT_DAY_AU * AU);
    textH(c, '1 LIGHT-DAY', q.x - 18, q.y, { size: 19, align: 'right', col: [255, 222, 168], a: kd });
    textH(c, '25.9 BILLION KM · 173 AU', q.x - 18, q.y + 22, { size: 16, weight: 600, track: 1.5, align: 'right', col: SUBCOL, a: kd });
  }

  // ---- beat 17: one light-year, the Oort cloud
  const kHead = win(gt, ph(v, 17, 0).start + 0.1, ph(v, 17, 1).start + 0.1, 0.5, 0.5);
  if (kHead > 0.004) {
    const e = L.ease.outCubic(L.clamp(kHead));
    textH(c, 'ONE LIGHT-YEAR', 960, 146, { size: 18, track: 4, align: 'center', col: ACCENT, a: kHead });
    textH(c, '9.46 TRILLION KM', 960, 200 + (1 - e) * 10, { size: 66, weight: 800, family: L.FONT.display, track: 1, align: 'center', col: INK, a: kHead });
    textH(c, '= 63,241 AU', 960, 252, { size: 17, weight: 600, track: 2, align: 'center', col: SUBCOL, a: kHead });
  }
  const R1 = LY / v.cam.mpp;
  const kr = win(gt, ph(v, 17, 0).start, S18 + 0.2, 0.5, 0.6) * L.clamp((1500 - R1) / 500) * L.clamp((R1 - 30) / 40);
  if (kr > 0.004) {
    c.save();
    c.globalAlpha *= kr;
    c.strokeStyle = L.rgba(ACCENT, 0.55);
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(sx, sy, R1, 0, Math.PI * 2); c.stroke();
    c.restore();
    const kt = kr * win(gt, ph(v, 17, 1).start, S18 + 0.2) * L.clamp((620 - R1) / 160);
    textH(c, '1 LIGHT-YEAR', sx + R1 + 16, sy - 11, { size: 19, col: L.mix(INK, ACCENT, 0.5), a: kt });
    textH(c, '9.46 TRILLION KM', sx + R1 + 16, sy + 12, { size: 16, weight: 600, track: 1.5, col: SUBCOL, a: kt });
  }
  const ko = win(gt, ph(v, 17, 1).start + 0.9, S18 + 0.3) * band(lf, 16.3, 16.5);
  if (ko > 0.004) {
    const q = sunRelPoint(v, 38, 1.25 * LY);
    tag(c, q.x, q.y, { text: 'OORT CLOUD (THEORISED)', sub: 'A SPHERICAL SHELL OF ICY BODIES · NEVER SEEN DIRECTLY', dx: -40, dy: -112, side: 'l', gap: 3, k: ko, col: [214, 226, 248] });
  }
  const kl = win(gt, ph(v, 17, 2).start, S18 + 0.3) * band(lf, 16.3, 16.5);
  if (kl > 0.004) {
    const R16 = 1.6 * LY / v.cam.mpp, e = L.ease.inOutCubic(L.clamp(kl * 1.2));
    const x1 = sx - R16 * e, y = sy;
    c.save();
    c.globalAlpha *= kl;
    c.strokeStyle = 'rgba(225,232,245,0.8)';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(sx - 30, y); c.lineTo(x1, y); c.moveTo(x1, y - 9); c.lineTo(x1, y + 9); c.stroke();
    c.restore();
    const mx = sx - R16 * 0.52;
    textH(c, '1.6 LIGHT-YEARS', mx, y - 20, { size: 22, align: 'center', col: INK, a: L.clamp(kl * 1.5 - 0.5) });
    textH(c, '~100,000 AU', mx, y + 21, { size: 16, weight: 600, track: 1.5, align: 'center', col: SUBCOL, a: L.clamp(kl * 1.5 - 0.5) });
  }
}
