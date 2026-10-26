// Beat 4 — "Our species appeared about three hundred thousand years ago."
// An early Homo sapiens skull, lateral view, after the Jebel Irhoud (Morocco, ≈315 ka) reconstructions: a small, flat,
// modern face tucked under the braincase, a marked (but not ape-like) brow ridge, and a LONG, LOW braincase with an
// elongated occiput (not yet the globular modern vault). Mandible with a weak chin. Ivory bone lit from NOW (the
// face side), with orbit, nasal aperture, zygomatic arch, ear canal, sutures and teeth as relief details. Faces
// toward NOW. It is revealed by a scanning line of light as the camera settles; beat 5's zoom-out folds it into a
// landmark dot that slides into NOW.
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, pin, landmark, ACCENT } from '../env.js';
import { label, sizeK, dotK, live, beatStart } from './s00-hook.js';

const PXMM = 1.28;          // px per mm at full size
const LIFT = 22;            // menton above the ruler
const CX = 86;              // skull x-centre (mm) pinned to the date

// ------------------------------------------------------------------ the skull (mm, y up, face to the LEFT; mirrored when drawn)
const OUTLINE = [
  [0, 0], [-5, 8], [-4, 17], [3, 30], [13, 47], [27, 63], [46, 74], [68, 83], [92, 86], [118, 85], [140, 80], [160, 70],
  [175, 56], [185, 40], [190, 24], [188, 8], [177, -6], [166, -18], [150, -29], [134, -37], [125, -43], [121, -57],
  [113, -50], [102, -42], [93, -37], [90, -52], [88, -72], [84, -89], [66, -100], [40, -106], [18, -110], [6, -112],
  [-1, -104], [-4, -93], [-6, -82], [-8, -76], [-9, -70], [-8, -62], [-5, -53], [-12, -46], [-7, -36], [-14, -22], [-8, -10],
];
const ORBIT = [[1, -3], [13, -1], [23, -7], [26, -21], [20, -32], [8, -33], [1, -21]];
const NASAL = [[-12, -23], [-7, -35], [-10, -45], [-2, -46], [1, -33], [-4, -25]];

function poly(c, pts, smooth = true) {
  const n = pts.length;
  c.beginPath();
  if (!smooth) { pts.forEach(([x, y], i) => (i ? c.lineTo(x, -y) : c.moveTo(x, -y))); c.closePath(); return; }
  const m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2]; };
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], e = m(i); c.quadraticCurveTo(p[0], -p[1], e[0], e[1]); }
  c.closePath();
}
const line = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, -y) : c.moveTo(x, -y))); c.stroke(); };
const curve = (c, a, q, b) => { c.beginPath(); c.moveTo(a[0], -a[1]); c.quadraticCurveTo(q[0], -q[1], b[0], -b[1]); c.stroke(); };

/** skull in mm space (caller sets the transform). Light comes from the face side (−x, up). */
function drawSkull(c, mm) {
  const hair = 1 / mm;                                   // 1 screen px in mm
  // rim: the outline shifted toward the light
  c.save(); c.translate(-1.6 * hair, -1.0 * hair); poly(c, OUTLINE); c.fillStyle = 'rgba(255,250,236,0.95)'; c.fill(); c.restore();
  // bone body
  poly(c, OUTLINE);
  const g = c.createLinearGradient(-10, -60, 180, 40);
  g.addColorStop(0, 'rgb(238,228,206)');
  g.addColorStop(0.45, 'rgb(212,198,172)');
  g.addColorStop(1, 'rgb(132,120,104)');
  c.fillStyle = g;
  c.fill();
  c.save();
  poly(c, OUTLINE); c.clip();
  // underside / jaw in shade (light from above)
  const gv = c.createLinearGradient(0, 110, 0, -95);
  gv.addColorStop(0, 'rgba(40,30,24,0.42)'); gv.addColorStop(0.5, 'rgba(40,30,24,0)'); gv.addColorStop(1, 'rgba(255,250,236,0.12)');
  c.fillStyle = gv;
  c.fillRect(-20, -100, 220, 220);
  // temporal fossa: a soft hollow above the arch
  const tf = c.createRadialGradient(58, 6, 4, 58, 6, 42);
  tf.addColorStop(0, 'rgba(70,54,40,0.32)'); tf.addColorStop(1, 'rgba(70,54,40,0)');
  c.fillStyle = tf;
  c.fillRect(10, -40, 100, 90);
  // brow ridge highlight (a marked supraorbital torus)
  c.strokeStyle = 'rgba(255,248,230,0.55)'; c.lineWidth = 2.2;
  curve(c, [-4, 12], [8, 18], [24, 8]);
  // orbit (deep shadow with a lit lateral rim)
  poly(c, ORBIT);
  const go = c.createRadialGradient(16, 18, 2, 14, 17, 20);
  go.addColorStop(0, 'rgb(22,18,18)'); go.addColorStop(1, 'rgb(64,50,42)');
  c.fillStyle = go; c.fill();
  c.strokeStyle = 'rgba(250,240,220,0.5)'; c.lineWidth = 1.4;
  curve(c, [23, -6], [29, -18], [21, -33]);
  // nasal aperture
  poly(c, NASAL); c.fillStyle = 'rgb(36,28,26)'; c.fill();
  // zygomatic bone + arch, with its shadow below
  c.fillStyle = 'rgba(60,44,34,0.35)';
  poly(c, [[16, -44], [40, -48], [86, -42], [96, -38], [92, -45], [60, -52], [30, -54]], true); c.fill();
  c.fillStyle = 'rgba(248,240,222,0.55)';
  poly(c, [[14, -34], [30, -36], [58, -32], [92, -33], [96, -37], [62, -40], [36, -44], [18, -42]], true); c.fill();
  // ear canal + mastoid shading
  c.fillStyle = 'rgb(30,24,22)';
  c.beginPath(); c.ellipse(103, 30, 4.6, 5.6, 0.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(60,46,36,0.3)';
  poly(c, [[110, -40], [122, -42], [122, -56], [114, -50]]); c.fill();
  // sutures and the temporal line (fine, faint)
  c.strokeStyle = 'rgba(90,70,52,0.45)'; c.lineWidth = 1; c.lineJoin = 'round';
  line(c, [[64, 82], [62, 76], [65, 70], [60, 60], [62, 50], [57, 40], [58, 28], [53, 18], [54, 8]]);          // coronal
  line(c, [[158, 71], [150, 62], [154, 52], [148, 42], [151, 30], [144, 20], [146, 8], [139, -4]]);             // lambdoid
  curve(c, [54, 6], [90, 30], [128, 0]);                                                                       // squamosal
  c.strokeStyle = 'rgba(255,248,232,0.22)'; c.lineWidth = 1.4;
  curve(c, [22, 42], [90, 86], [150, 30]);                                                                     // temporal line
  // the mandible: ramus front edge, the bite line, mental foramen
  c.strokeStyle = 'rgba(70,52,40,0.55)'; c.lineWidth = 1.3;
  line(c, [[90, -40], [80, -46], [68, -48], [56, -62], [46, -72]]);
  line(c, [[-9, -71], [10, -72], [30, -72], [46, -72]]);
  c.fillStyle = 'rgba(40,30,26,0.6)';
  c.beginPath(); c.arc(16, 90, 1.6, 0, Math.PI * 2); c.fill();
  // teeth: crowns above and below the bite line
  c.strokeStyle = 'rgba(80,62,48,0.5)'; c.lineWidth = 0.8;
  const tx0 = [-7, -3, 1, 6, 12, 19, 27, 35, 43];
  for (const x of tx0) { line(c, [[x, -63], [x, -71]]); line(c, [[x + 1, -73], [x + 1, -80]]); }
  c.fillStyle = 'rgba(255,252,240,0.25)';
  c.fillRect(-8, 63, 50, 7);
  c.restore();
  // a fine outline to finish
  poly(c, OUTLINE);
  c.strokeStyle = 'rgba(60,46,36,0.5)'; c.lineWidth = 1.2 * hair;
  c.stroke();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'Our species', sub: 'Homo sapiens' },
  layer: 4,
  cues(d) {
    return [
      { t: 1.3, name: 'riser', gain: 0.18, pitch: 1.1 },
      { t: 1.65, name: 'bloom', gain: 0.3, pitch: 0.9 },
      { t: 1.7, name: 'shimmer', gain: 0.16, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    const lk = live(v);
    const b4 = beatStart(v, 4), b5 = beatStart(v, 5);
    if (lk <= 0 || v.gt < b4 + 0.8 || v.gt > b5 + 2.2) return;
    const x = tx(v, AGE.sapiens), y = rulerY(v);
    if (x < -300 || x > L.W + 40) return;
    const rev = L.prog(v.gt, b4 + 1.6, 0.75);                    // the scan reveal
    if (rev <= 0) return;
    const sk = sizeK(v, AGE.sapiens, 40, 260) * (1 - L.ease.inOutCubic(L.prog(v.gt, b5 + 0.25, 0.6)));
    const fadeAll = lk * (1 - L.enter(v.gt, b5 + 1.4, 0.4));
    if (sk > 0.02) {
      const s = L.lerp(0.06, 1, sk), mm = PXMM * s;
      const by = y - LIFT * s;                                       // menton level
      // screen extents (mirrored: face on the right)
      const left = x - (190 - CX) * mm, right = x + (CX + 14) * mm;
      const ex = L.lerp(left - 10, right + 10, L.ease.inOutCubic(rev));
      ctx.save();
      ctx.globalAlpha *= fadeAll * L.clamp(sk * 2);
      L.lightBlob(ctx, x, by - 100 * mm, 230 * mm, [255, 236, 200], 0.08);
      pin(ctx, x, y, by, 1, ACCENT);
      // contact shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(x - 10 * mm, by + 2, Math.max(0, 70 * mm), Math.max(0, 4 * s), 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.rect(left - 30, by - 230 * mm, ex - left + 30, 260 * mm + 30); ctx.clip();
      ctx.translate(x, by);
      ctx.scale(-mm, mm);                                            // mirror: face toward NOW
      ctx.translate(-CX, -112);
      drawSkull(ctx, mm);
      ctx.restore();
      // the scanning line of light
      if (rev > 0 && rev < 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(ex - 40, 0, ex + 6, 0);
        g.addColorStop(0, L.rgba(ACCENT, 0)); g.addColorStop(1, L.rgba(ACCENT, 0.5));
        ctx.fillStyle = g;
        ctx.fillRect(ex - 40, by - 220 * mm, 46, 225 * mm);
        ctx.fillStyle = L.rgba(ACCENT, 0.9);
        ctx.fillRect(ex - 1, by - 225 * mm, 2, 232 * mm);
        ctx.restore();
      }
      ctx.restore();
    }
    landmark(ctx, v, AGE.sapiens, { k: dotK(v, AGE.sapiens) * fadeAll, color: [236, 226, 204], r: 5 });
  },

  drawOverlay(ctx, v) {
    const k = v.k * L.enter(v.t, 1.6, 0.55);
    label(ctx, { x: 80, y: 560, big: '300,000 YEARS', small: 'our species appears · Jebel Irhoud, Morocco', k, accent: v.accent });
  },
};
