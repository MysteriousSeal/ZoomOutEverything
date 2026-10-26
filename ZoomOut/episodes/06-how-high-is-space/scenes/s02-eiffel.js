// Beat 2 — the Eiffel Tower at true height (330 m) at X.eiffel. Wrought-iron lattice in elevation:
// four curving legs (two seen) with the decorative arch under the first floor, the openings between the
// legs at each level, three platforms, the campanile and antenna. Open lattice lets the sky through.
// It builds with the shared blueprint scan as the camera pulls back, glints at the antenna, and gets
// the height line + label. The Statue of Liberty stays at its foot for comparison.
import * as L from '../../../../engine/runtime/lib.js';
import { ALT, X } from '../camera.js';
import { drawGlint, drawLandmark, heightLabel, labelTimes, poly, tab } from './s01-liberty.js';

const H_ALL = ALT.eiffel;   // 330 m
const CX = X.eiffel;
const IRON = [104, 80, 62], IRON_D = [62, 46, 38], IRON_L = [196, 156, 116];

// outer half-width of the tower by height (m) and the inner face of each leg (0 once the legs merge)
const OUT = [[0, 62.5], [10, 56.5], [25, 49], [40, 42.5], [57, 36.8], [70, 32.2], [90, 26.8], [115, 21.2], [140, 17.4],
  [170, 14.1], [200, 11.5], [230, 9.5], [260, 7.9], [276, 7.1]];
const IN = [[0, 36.5], [57, 19.6], [66, 17.6], [115, 10.0], [121, 9.2], [190, 0]];
const P1 = [57, 66], P2 = [115, 121], P3 = [276, 284];
const ow = (h) => tab(OUT, h), iw = (h) => tab(IN, h);
const ARCH_TOP = 39.5;
// the campanile above the top platform: lantern, cornice, small dome (right half)
const CAMP = [[6.2, P3[1]], [5.6, 290], [6.2, 290.5], [6.2, 292], [4.2, 292.5], [3.9, 298], [4.6, 298.5], [4.6, 300], [2.6, 301], [1.4, 304.5], [0.8, 306]];

function side(sign, h0, h1, f, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const h = L.lerp(h0, h1, i / n); pts.push([sign * f(h), h]); }
  return pts;
}
function outerPts() {
  const r = side(1, 0, P3[0], ow, 28);
  const top = [[7.6, P3[0]], [9.3, P3[0] + 1], [9.3, P3[1]], ...CAMP, [0.8, 312], [0.45, 322], [0.22, H_ALL]];
  const right = [...r, ...top];
  const left = right.map(([x, h]) => [-x, h]).reverse();
  return [...right, ...left];
}
const OUTER = outerPts();
// openings between the legs at each level (sky shows through)
// under the first floor the opening is closed by the decorative arch; the spandrel above it is lattice
const ARCH_PTS = (() => {
  const x0 = tab([[0, 36.5], [57, 19.6]], 5), b = (t, a, b1, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b1 + 3 * (1 - t) * t * t * c + t ** 3 * d;
  const pts = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([b(t, x0, x0 - 4, 14, 0), b(t, 5, ARCH_TOP - 2, ARCH_TOP, ARCH_TOP)]); }
  return pts;
})();
const OPEN_A = [...side(1, 0, 5, (h) => tab(IN, h), 2), ...ARCH_PTS.slice(1), ...ARCH_PTS.slice(0, -1).reverse().map(([x, h]) => [-x, h]), ...side(-1, 5, 0, (h) => tab(IN, h), 2)];
const OPEN_B = [...side(1, P1[1], P2[0], iw, 8), ...side(-1, P2[0], P1[1], iw, 8)];
const OPEN_C = [...side(1, P2[1], 190, iw, 8), ...side(-1, 190, P2[1], iw, 8)];

function holes(c) {
  // reversed winding → holes under the nonzero rule (poly() normalises, so reverse after)
  for (const o of [OPEN_A, OPEN_B, OPEN_C]) {
    const pts = o.slice();
    let a = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * -q[1] - q[0] * -p[1]; }
    const rev = a > 0 ? pts.reverse() : pts;
    rev.forEach(([x, h], i) => (i ? c.lineTo(x, -h) : c.moveTo(x, -h)));
    c.closePath();
  }
}
function tower(c) {
  c.beginPath();
  poly(c, OUTER);
  holes(c);
}

// the decorative arch under the first floor, as a thick curved band
function archPath(c, inset) {
  const x0 = iw(5) - inset, h0 = 5;
  c.moveTo(x0, -h0);
  c.bezierCurveTo(x0 - 4, -(ARCH_TOP - 2), 14, -(ARCH_TOP - inset * 0.2), 0, -(ARCH_TOP - inset * 0.2));
  c.bezierCurveTo(-14, -(ARCH_TOP - inset * 0.2), -(x0 - 4), -(ARCH_TOP - 2), -x0, -h0);
}

/** X-bracing panels along one leg (between edge functions a(h) and b(h)), rows every `step` m. */
function bracing(c, h0, h1, a, b, step) {
  const n = Math.max(1, Math.round((h1 - h0) / step));
  for (let i = 0; i < n; i++) {
    const ha = L.lerp(h0, h1, i / n), hb = L.lerp(h0, h1, (i + 1) / n);
    for (const [p, q] of [[a, (h) => (a(h) + b(h)) / 2], [(h) => (a(h) + b(h)) / 2, b]]) {
      c.moveTo(p(ha), -ha); c.lineTo(q(hb), -hb);
      c.moveTo(q(ha), -ha); c.lineTo(p(hb), -hb);
    }
    c.moveTo(a(hb), -hb); c.lineTo(b(hb), -hb);
  }
}

function paint(c, v, mpp) {
  const fine = mpp < 0.75;
  // translucent body: iron lattice seen against the sky
  tower(c);
  const g = c.createLinearGradient(-63, 0, 63, 0);
  g.addColorStop(0, L.rgba(L.mix(IRON, IRON_L, 0.3), 0.7));
  g.addColorStop(0.5, L.rgba(IRON, 0.68));
  g.addColorStop(1, L.rgba(IRON_D, 0.8));
  c.fillStyle = g;
  c.fill();

  c.save();
  tower(c);
  c.clip();
  // lattice
  c.beginPath();
  const st = fine ? 1 : 1.8;
  for (const sg of [1, -1]) {
    const o = (h) => sg * ow(h), i = (h) => sg * iw(h);
    bracing(c, 0, P1[0], i, o, 8.2 * st);
    bracing(c, P1[1], P2[0], i, o, 8.2 * st);
    bracing(c, P2[1], 190, i, o, 8.6 * st);
    bracing(c, 190, P3[0], () => 0, o, 9.5 * st);
    bracing(c, ARCH_TOP - 6, P1[0], () => 0, i, 6 * st);   // the spandrel above the arch
  }
  c.strokeStyle = L.rgba(IRON_D, 0.85);
  c.lineWidth = Math.max(0.45, 1.1 * mpp);
  c.stroke();
  // shading across the form: sunlit left, shadowed right
  const sg2 = c.createLinearGradient(-63, 0, 63, 0);
  sg2.addColorStop(0, 'rgba(255,236,205,0.22)');
  sg2.addColorStop(0.45, 'rgba(255,236,205,0)');
  sg2.addColorStop(0.6, 'rgba(20,10,5,0.05)');
  sg2.addColorStop(1, 'rgba(20,10,5,0.3)');
  c.fillStyle = sg2;
  c.fillRect(-64, -H_ALL, 128, H_ALL);
  c.restore();

  // leg edges (the four great box girders), thick
  c.lineJoin = 'round';
  c.strokeStyle = L.rgba(IRON_D);
  for (const sg of [1, -1]) {
    c.lineWidth = 2.2;
    c.beginPath(); poly(c, side(sg, 0, P3[0], ow, 28), false); c.stroke();
    c.lineWidth = 1.7;
    c.beginPath(); poly(c, side(sg, 0, P1[0], iw, 8), false); c.stroke();
    c.beginPath(); poly(c, side(sg, P1[1], P2[0], iw, 8), false); c.stroke();
    c.beginPath(); poly(c, side(sg, P2[1], 190, iw, 8), false); c.stroke();
  }
  // sunlit edge
  c.strokeStyle = L.rgba(IRON_L, 0.7);
  c.lineWidth = 0.9;
  c.beginPath(); poly(c, side(-1, 0, P3[0], ow, 28).map(([x, h]) => [x + 0.8, h]), false); c.stroke();
  // the decorative arch
  c.beginPath(); archPath(c, 0); c.lineWidth = 2.4; c.strokeStyle = L.rgba(IRON_D); c.stroke();
  c.beginPath(); archPath(c, 3); c.lineWidth = 0.9; c.stroke();
  // platforms: solid decks with a gallery frieze
  for (const [h0, h1, ext] of [[P1[0], P1[1], 2.2], [P2[0], P2[1], 1.4], [P3[0], P3[1], 1.4]]) {
    const w0 = ow(h0) + ext, w1 = ow(h1) + ext * 0.6;
    c.beginPath(); poly(c, [[-w0, h0], [w0, h0], [w1, h1], [-w1, h1]]);
    const pg = c.createLinearGradient(-w0, 0, w0, 0);
    pg.addColorStop(0, L.rgba(L.mix(IRON, IRON_L, 0.45)));
    pg.addColorStop(1, L.rgba(IRON_D));
    c.fillStyle = pg;
    c.fill();
    if (fine && h1 - h0 > 5) {
      // the arched frieze of the first floor
      c.fillStyle = L.rgba([40, 30, 26], 0.55);
      const n = 14;
      for (let i = 0; i < n; i++) {
        const x = L.lerp(-w0 + 3, w0 - 3, (i + 0.5) / n), rw = (2 * w0 - 6) / n * 0.32;
        c.beginPath();
        c.moveTo(x - rw, -(h0 + 1.2)); c.lineTo(x - rw, -(h0 + 4.3)); c.arc(x, -(h0 + 4.3), rw, Math.PI, 0); c.lineTo(x + rw, -(h0 + 1.2));
        c.closePath(); c.fill();
      }
    }
    c.fillStyle = L.rgba(IRON_L, 0.5);
    c.fillRect(-w1, -h1, 2 * w1, 0.6);
  }
  // campanile + antenna
  c.beginPath(); poly(c, [...CAMP, ...CAMP.map(([x, h]) => [-x, h]).reverse()]);
  const cg = c.createLinearGradient(-6.2, 0, 6.2, 0);
  cg.addColorStop(0, L.rgba(L.mix(IRON, IRON_L, 0.5)));
  cg.addColorStop(1, L.rgba(IRON_D));
  c.fillStyle = cg; c.fill();
  c.beginPath(); poly(c, [[-0.8, 306], [0.8, 306], [0.45, 322], [0.22, H_ALL], [-0.22, H_ALL], [-0.45, 322]]);
  c.fillStyle = L.rgba([214, 214, 220]); c.fill();
  // feet: masonry piers
  c.fillStyle = L.rgba([150, 140, 126]);
  for (const sg of [1, -1]) c.fillRect(Math.min(sg * 37, sg * 63.5), -2.2, 26.5, 2.2);
}

// beat-relative timing: the tower enters the frame at t ≈ 0.7 as the camera pulls back
const REV0 = 0.5, REVD = 1.15, REV1 = REV0 + REVD, LAB = 1.4;

export default {
  beat: 2,
  chapter: { num: '02', title: 'Eiffel Tower', sub: 'Paris · 1889' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: REV0 + 0.05, name: 'riser', gain: 0.22, pitch: 0.95 },
      { t: REV0 + 0.35, name: 'creak', gain: 0.18, pitch: 1.1 },
      { t: REV1 - 0.05, name: 'shimmer', gain: 0.34, pitch: 1.0 },
      { t: REV1 + 0.1, name: 'tick', gain: 0.3, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    drawLandmark(ctx, v, {
      cx: CX, height: H_ALL, w: 64, rev0: REV0, revDur: REVD,
      path: tower, paint, flat: [92, 76, 64],
    });
    drawGlint(ctx, v, CX, -H_ALL + 0.5, REV1 + 0.02, 1);
  },

  drawOverlay(ctx, v) {
    const { k, lk } = labelTimes(v, REV1, LAB);
    heightLabel(ctx, v, {
      tipX: v.wx(CX), tipY: v.wy(-H_ALL),
      big: '330 m', small: '1,083 ft · Eiffel Tower', k, lk,
    });
  },
};
