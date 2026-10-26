// Beat 3 — the Burj Khalifa at true height (828 m) at X.burj: the stepped, spiralling Y-plan setbacks
// seen in elevation (asymmetric left/right), the slender spire, glass-and-steel shading with window
// bands, vertical fins and a blinking aviation beacon. It builds with the shared blueprint scan while the
// camera pulls back; the Eiffel Tower and the Statue of Liberty stay beside it, now small.
import * as L from '../../../../engine/runtime/lib.js';
import { ALT, X } from '../camera.js';
import { drawGlint, drawLandmark, heightLabel, labelTimes } from './s01-liberty.js';

const H_ALL = ALT.burj;   // 828 m
const CX = X.burj;
const GLASS_L = [178, 198, 218], GLASS = [112, 134, 160], GLASS_D = [52, 68, 94];

// half-width steps (h from base → half-width, m); the wings step back alternately on each side
const RIGHT = [[0, 55], [30, 49], [95, 46], [160, 40], [222, 37], [288, 31], [345, 28], [405, 22], [455, 19], [505, 13], [548, 10], [572, 7.5]];
const LEFT = [[0, 55], [30, 52], [68, 46], [128, 43], [192, 37], [252, 34], [318, 28], [375, 25], [432, 19], [482, 16], [528, 10], [560, 8]];
const SPIRE0 = 585;
const CROWN = [[SPIRE0, 6], [630, 4.6], [690, 3.3], [750, 2], [800, 1], [H_ALL, 0.35]];

const OUTLINE = (() => {
  const sideOf = (edge, sign) => {
    const out = [];
    for (let i = 0; i < edge.length; i++) {
      const [h, w] = edge[i];
      const hn = i + 1 < edge.length ? edge[i + 1][0] : SPIRE0;
      out.push([sign * w, -h], [sign * w, -(hn - 1.5)]);
    }
    for (const [h, w] of CROWN) out.push([sign * w, -h]);
    return out;
  };
  return [...sideOf(LEFT, -1), ...sideOf(RIGHT, 1).reverse()];
})();

function path(c) {
  c.beginPath();
  OUTLINE.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}

function paint(c, v, mpp) {
  const px = (n) => n * mpp;
  path(c);
  // sky-lit glass: brighter towards the top, which catches more open sky
  const g = c.createLinearGradient(0, -H_ALL, 0, 0);
  g.addColorStop(0, L.rgba(GLASS_L));
  g.addColorStop(0.35, L.rgba(L.mix(GLASS_L, GLASS, 0.5)));
  g.addColorStop(1, L.rgba(GLASS));
  c.fillStyle = g;
  c.fill();
  c.save();
  path(c);
  c.clip();
  // form shading: sunlit left wing, a bright central core, the right wing in shade
  const sg = c.createLinearGradient(-55, 0, 55, 0);
  sg.addColorStop(0, 'rgba(255,252,240,0.30)');
  sg.addColorStop(0.4, 'rgba(255,252,240,0.0)');
  sg.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  sg.addColorStop(0.56, L.rgba(GLASS_D, 0.25));
  sg.addColorStop(1, L.rgba(GLASS_D, 0.7));
  c.fillStyle = sg;
  c.fillRect(-60, -H_ALL, 120, H_ALL);
  // setback ledges: a thin light cap on each step
  if (mpp < 2.5) {
    c.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [h, w] of LEFT.slice(1)) c.fillRect(-w - 1, -h - px(1), w * 0.7, px(1.5));
    for (const [h, w] of RIGHT.slice(1)) c.fillRect(w * 0.3, -h - px(1), w * 0.7 + 1, px(1.5));
  }
  // vertical fins on the wing faces
  if (mpp < 1.6) {
    c.strokeStyle = L.rgba(GLASS_D, 0.28);
    c.lineWidth = px(1);
    for (const fx of [-34, -20, -7, 7, 20, 34]) {
      c.beginPath(); c.moveTo(fx, 0); c.lineTo(fx * 0.18, -SPIRE0); c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    for (const fx of [-27, -13.5, 0]) {
      c.beginPath(); c.moveTo(fx, 0); c.lineTo(fx * 0.18, -SPIRE0); c.stroke();
    }
  }
  // window bands
  if (14 / mpp > 6) {
    c.lineWidth = px(1);
    c.strokeStyle = L.rgba(GLASS_D, 0.22);
    for (let h = 18; h < SPIRE0; h += 14) { c.beginPath(); c.moveTo(-60, -h); c.lineTo(60, -h); c.stroke(); }
  }
  // mechanical floors: darker bands every ~30 storeys
  c.fillStyle = L.rgba(GLASS_D, 0.35);
  for (const h of [72, 170, 280, 390, 492]) c.fillRect(-60, -h, 120, 6);
  c.restore();
  // rim light on the left edge
  c.beginPath();
  const l = OUTLINE.slice(0, Math.floor(OUTLINE.length / 2));
  l.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = 'rgba(255,253,245,0.75)';
  c.lineWidth = px(1.6);
  c.stroke();
  // podium at the foot
  c.fillStyle = L.rgba([120, 132, 146]);
  c.fillRect(-80, -9, 160, 9);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(-80, -9, 160, px(1.2));
}

function drawBeacon(c, v) {
  const r = L.prog(v.t, REV1 - 0.05, 0.3);
  if (r <= 0 || H_ALL / v.cam.mpp < 20) return;
  const blink = Math.pow(Math.max(0, Math.sin((v.gt - 0.3) * Math.PI * 1.1)), 6);
  const x = v.wx(CX), y = v.wy(-H_ALL + 1);
  L.lightBlob(c, x, y, 26, [255, 80, 60], 0.75 * blink * r);
  L.lightBlob(c, x, y, 6, [255, 210, 200], 0.9 * blink * r);
}

// beat-relative timing: the tower enters the frame at t ≈ 0.6 as the camera pulls back
const REV0 = 0.42, REVD = 1.12, REV1 = REV0 + REVD, LAB = 1.42;

export default {
  beat: 3,
  chapter: { num: '03', title: 'Burj Khalifa', sub: 'Dubai · 2010' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: REV0 + 0.05, name: 'riser', gain: 0.24, pitch: 0.85 },
      { t: REV0 + 0.2, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: REV1 - 0.05, name: 'shimmer', gain: 0.36, pitch: 0.9 },
      { t: REV1 + 0.1, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: REV1 + 0.45, name: 'ping', gain: 0.14, pitch: 1.3 },
    ];
  },

  drawWorld(ctx, v) {
    drawLandmark(ctx, v, {
      cx: CX, height: H_ALL, w: 80, rev0: REV0, revDur: REVD,
      path, paint, flat: [128, 146, 166],
    });
    drawBeacon(ctx, v);
    drawGlint(ctx, v, CX, -H_ALL + 0.5, REV1 + 0.02, 1.1);
  },

  drawOverlay(ctx, v) {
    const { k, lk } = labelTimes(v, REV1, LAB);
    heightLabel(ctx, v, {
      tipX: v.wx(CX), tipY: v.wy(-H_ALL),
      big: '828 m', small: '2,717 ft · Burj Khalifa', k, lk,
    });
  },
};
