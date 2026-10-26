// Beat 2 — "The Great Pyramid of Giza is about four and a half thousand years old."
// The Great Pyramid (Khufu) at −4,580 y: true proportions (base 230 m : height 146 m, faces at 51.8°), seen almost
// square-on and turned 4° so a sliver of its shaded west face shows (silhouette ≈ 50°). Sunlit from the right (NOW's
// side): warm limestone gradient on the main face, the casing courses as faint horizontal lines, a crisp rim along the
// sunlit edge, a long soft shadow to the left. It is BUILT as the camera settles: courses rise from the base, the
// apex lands last. Beat 3 keeps it (scaled to 0.78, tag "2560 BC") for the Cleopatra comparison; beat 4's zoom-out
// shrinks it into a landmark dot that slides into NOW.
import * as L from '../../../../engine/runtime/lib.js';
import { AGE } from '../camera.js';
import { tx, rulerY, pin, landmark, ACCENT } from '../env.js';
import { label, tag, sizeK, dotK, live, beatStart, GREYTXT } from './s00-hook.js';

const LIFT = 18;                // the pyramid stands just above the ruler row
const BASE_Y = 1040 - LIFT;
const WPX = 330;                // silhouette width at full size
const TH = (4 * Math.PI) / 180; // view turned 4°
const B = 115, HGT = 146;       // half base, height (m): 230 : 146 → 51.8°
const XL = -B * (Math.cos(TH) + Math.sin(TH));   // left silhouette corner (the hidden back-left corner)
const XF = -B * (Math.cos(TH) - Math.sin(TH));   // the front-left corner (the ridge between the two visible faces)
const XR = B * (Math.cos(TH) + Math.sin(TH));    // right corner
const PPM = WPX / (XR - XL);                      // px per metre at full size
export const PYR_TOP = BASE_Y - HGT * PPM;       // apex y at full size

const SAND_HI = [250, 226, 178], SAND_MID = [222, 182, 122], SAND_LO = [168, 124, 80];
const SHADE_HI = [92, 74, 66], SHADE_LO = [40, 38, 44];

/** draw the pyramid with its base centre at (cx, by), scale s, build progress b (0..1: courses rising) */
export function drawPyramid(c, cx, by, s, b, gt) {
  const p = PPM * s;
  const X = (m) => cx + m * p, Y = (m) => by - m * p;
  const apex = [X(0), Y(HGT)];
  const xl = X(XL), xf = X(XF), xr = X(XR);
  c.save();
  // long soft shadow on the ground, cast away from the light (to the left)
  const sh = c.createLinearGradient(xl - 140 * s, 0, xf, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, `rgba(0,0,0,${0.45 * b})`);
  c.fillStyle = sh;
  c.beginPath(); c.moveTo(xf, by); c.lineTo(xl - 150 * s, by + 3 * s); c.lineTo(xl - 150 * s, by + 7 * s); c.lineTo(xf, by + 6 * s); c.closePath(); c.fill();
  // build clip: the courses rise from the base
  const hb = HGT * L.ease.outCubic(L.clamp(b));
  c.beginPath(); c.rect(xl - 40, Y(hb) - 0.5, xr - xl + 80, by - Y(hb) + 30); c.clip();
  // main (south) face, sunlit from the right
  const gF = c.createLinearGradient(xf, Y(HGT), xr, by);
  gF.addColorStop(0, L.rgba(SAND_HI));
  gF.addColorStop(0.55, L.rgba(SAND_MID));
  gF.addColorStop(1, L.rgba(SAND_LO));
  c.fillStyle = gF;
  c.beginPath(); c.moveTo(xf, by); c.lineTo(apex[0], apex[1]); c.lineTo(xr, by); c.closePath(); c.fill();
  // the face darkens slightly toward the ridge (it turns away from the sun)
  const gR = c.createLinearGradient(xf, 0, xf + (xr - xf) * 0.45, 0);
  gR.addColorStop(0, 'rgba(90,60,40,0.35)'); gR.addColorStop(1, 'rgba(90,60,40,0)');
  c.fillStyle = gR;
  c.fill();
  // shaded (west) sliver
  const gS = c.createLinearGradient(0, Y(HGT), 0, by);
  gS.addColorStop(0, L.rgba(SHADE_HI)); gS.addColorStop(1, L.rgba(SHADE_LO));
  c.fillStyle = gS;
  c.beginPath(); c.moveTo(xl, by); c.lineTo(apex[0], apex[1]); c.lineTo(xf, by); c.closePath(); c.fill();
  // casing courses: faint horizontal lines on the lit face (perspective-free elevation)
  c.save();
  c.beginPath(); c.moveTo(xl, by); c.lineTo(apex[0], apex[1]); c.lineTo(xr, by); c.closePath(); c.clip();
  const n = 26;
  for (let i = 1; i < n; i++) {
    const hm = (HGT * i) / n, yy = Y(hm);
    c.fillStyle = `rgba(80,52,30,${0.13 * (1 - i / n * 0.5)})`;
    c.fillRect(xl, yy, xr - xl, Math.max(0.6, 1.1 * s));
    c.fillStyle = `rgba(255,240,210,${0.07})`;
    c.fillRect(xl, yy + 1.1 * s, xr - xl, Math.max(0.5, 0.8 * s));
  }
  // a slow glint drifting up the sunlit face
  const gl = (gt * 0.12) % 1;
  const gy = Y(HGT * gl);
  const gg = c.createLinearGradient(0, gy - 30 * s, 0, gy + 30 * s);
  gg.addColorStop(0, 'rgba(255,245,220,0)'); gg.addColorStop(0.5, 'rgba(255,245,220,0.10)'); gg.addColorStop(1, 'rgba(255,245,220,0)');
  c.fillStyle = gg;
  c.fillRect(xf, gy - 30 * s, xr - xf, 60 * s);
  c.restore();
  // the ridge (the edge between the two faces): a fine highlight
  c.strokeStyle = 'rgba(255,236,200,0.35)';
  c.lineWidth = Math.max(0.8, 1.2 * s);
  c.beginPath(); c.moveTo(xf, by); c.lineTo(apex[0], apex[1]); c.stroke();
  // sunlit rim on the right silhouette edge
  c.save();
  c.shadowColor = 'rgba(255,220,160,0.9)'; c.shadowBlur = 10 * s;
  c.strokeStyle = 'rgba(255,246,222,0.95)';
  c.lineWidth = Math.max(1, 2 * s);
  c.beginPath(); c.moveTo(apex[0], apex[1]); c.lineTo(xr, by); c.stroke();
  c.restore();
  // the base line
  c.fillStyle = 'rgba(30,22,18,0.6)';
  c.fillRect(xl, by - 1, xr - xl, 2);
  c.restore();
  // the rising course line while building (a warm line of light at the build front)
  if (b > 0 && b < 1) {
    const yb = Y(hb), u = hb / HGT;
    const a0 = L.lerp(xl, apex[0], u), a1 = L.lerp(xr, apex[0], u);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(255,220,150,0.55)';
    c.fillRect(a0, yb - 1, a1 - a0, 2);
    c.restore();
  }
}

/** pyramid state: full-size factor, build progress, beat-3 shrink */
function state(v) {
  const b2 = beatStart(v, 2), b3 = beatStart(v, 3);
  const build = L.prog(v.gt, b2 + 1.3, 0.75);
  const shrink = L.lerp(1, 0.78, L.ease.inOutCubic(L.prog(v.gt, b3 + 0.05, 0.8)));
  return { build, shrink };
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'The Great Pyramid', sub: 'Giza, built c. 2560 BC' },
  layer: 2,
  cues(d) {
    return [
      { t: 1.3, name: 'deep', gain: 0.3, pitch: 0.8 },
      { t: 1.95, name: 'impact', gain: 0.26, pitch: 0.7 },
      { t: 2.05, name: 'shimmer', gain: 0.14, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    const lk = live(v);
    const b2 = beatStart(v, 2), b5 = beatStart(v, 5);
    if (lk <= 0 || v.gt < b2 || v.gt > b5) return;
    const x = tx(v, AGE.pyramid), y = rulerY(v);
    if (x < -260 || x > L.W + 40) return;
    const { build, shrink } = state(v);
    if (build <= 0) return;
    const sk = sizeK(v, AGE.pyramid, 40, 260);
    const s = shrink * L.lerp(0.06, 1, sk);
    const fadeAll = lk * (1 - L.enter(v.gt, beatStart(v, 4) + 1.4, 0.4));
    if (sk > 0.02) {
      ctx.save();
      ctx.globalAlpha *= L.clamp(sk * 2) * fadeAll * L.clamp(build * 4);
      // warm haze behind the monument
      L.lightBlob(ctx, x + 20 * s, y - LIFT - 80 * s, 260 * s, [255, 200, 130], 0.1 * build);
      pin(ctx, x, y, y - LIFT, 1, ACCENT);
      drawPyramid(ctx, x, y - LIFT, s, build, v.gt);
      ctx.restore();
      // beat 3: the date over the apex
      const tk = L.prog(v.gt, beatStart(v, 3) + 0.6, 0.5) * (1 - L.enter(v.gt, beatStart(v, 4), 0.35, L.ease.inCubic));
      if (tk > 0) tag(ctx, x, 770, '2560 BC', { k: tk * fadeAll, color: GREYTXT, size: 30, family: L.FONT.din, tr: 2, maxW: 200 });
    }
    landmark(ctx, v, AGE.pyramid, { k: dotK(v, AGE.pyramid) * fadeAll, color: [240, 214, 170], r: 5 });
  },

  drawOverlay(ctx, v) {
    const k = v.k * L.enter(v.t, 1.35, 0.55);
    label(ctx, { x: 80, y: 560, big: '4,580 YEARS', small: 'Great Pyramid of Giza · c. 2560 BC', k, accent: v.accent });
  },
};
