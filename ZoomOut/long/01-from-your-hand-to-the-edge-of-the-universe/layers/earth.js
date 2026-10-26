// Layer "earth" (lf 5.65 → 10.2), builder B: the real Earth (engine/runtime/earth.js, Blue-Marble 'day' style, lit by
// the 15 July 2026 19:30 UTC Sun), centred on the hand in the same orthographic projection as the city map (lat0/lon0 =
// HAND, tilt 0), the Moon at camera.js MOON_POS at its true size and distance (same sunlight, so the same phase), and
// the Moon's orbit. Under the city map until it dissolves (lf 5.85–6.35); fades into builder C's dots over 9.4–10.2.
import * as L from '../../../../engine/runtime/lib.js';
import { drawEarth, geoPath, project } from '../../../../engine/runtime/earth.js';
import { band } from '../world.js';
import { HAND, SUBSOLAR, R_EARTH, MOON_POS } from '../camera.js';
import { ll } from './b-geo.js';
import { moonSprite } from './b-moon.js';
import { LAKES } from './b-lakes.js';
import { zoomSpeed } from './b-tiles.js';

const { W, H } = L;
export const R_MOON = 1.7374e6;
export const MOON_ORBIT = 3.844e8;
const s0 = ll(SUBSOLAR.lat, SUBSOLAR.lon);
/** the sunlight in view space ([x right, y up, z toward the viewer]); used for the Moon and for any lit icon */
export const LIGHT = [s0.x / 6.371e6, -s0.y / 6.371e6, s0.z / 6.371e6];
export const globeView = (v) => ({ cx: v.wx(0), cy: v.wy(0), r: v.ws(R_EARTH), lat0: HAND.lat, lon0: HAND.lon, rot: 0, tilt: 0 });
export const earthFade = (lf) => band(lf, 5.65, 5.72, 9.4, 10.2);

export default {
  draw(c, v) {
    const lf = v.cam.lf;
    const k = earthFade(lf);
    if (k <= 0) return;
    const view = globeView(v);
    // the Moon's orbit (thin, true circle), drawn only while it is a sensible size on screen
    const orbR = v.ws(MOON_ORBIT);
    const ok = band(lf, 8.0, 8.5, 9.6, 10.2);
    if (ok > 0 && orbR < 2e5) {
      c.save();
      c.strokeStyle = L.rgba([200, 210, 230], 0.28 * ok);
      c.lineWidth = 1.4;
      c.beginPath(); c.arc(view.cx, view.cy, orbR, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    // the globe
    const onScr = view.cx + view.r * 1.05 > -10 && view.cx - view.r * 1.05 < W + 10 && view.cy + view.r * 1.05 > -10 && view.cy - view.r * 1.05 < H + 10;
    if (onScr) {
      if (view.r < 60) {   // a soft blue glow so the small Earth reads at a glance
        const gr = c.createRadialGradient(view.cx, view.cy, view.r * 0.8, view.cx, view.cy, view.r * 3 + 6);
        gr.addColorStop(0, `rgba(90,150,255,${0.22 * k})`); gr.addColorStop(1, 'rgba(90,150,255,0)');
        c.fillStyle = gr; c.fillRect(view.cx - view.r * 3 - 6, view.cy - view.r * 3 - 6, view.r * 6 + 12, view.r * 6 + 12);
      }
      // while the globe is magnified (lf < ~7), the 0.1° relief data would show its cells: soften the hillshade and
      // add a light blur; ice is drawn a natural, slightly dimmer white, with gentler pack ice
      const fast = L.clamp((zoomSpeed(v) - 2.5) / 1.5);
      const mag = L.clamp(L.invLerp(7.2, 6.4, lf)) * (1 - fast);
      const relief = L.lerp(1, 0.45, mag);
      if (mag > 0.02) c.filter = `blur(${(0.9 * mag).toFixed(2)}px)`;
      drawEarth(c, { ...view, style: 'day', sun: SUBSOLAR, alpha: k, relief: Math.round(relief * 20) / 20, ice: ICE, seaIce: 0.45,
        maxPixels: (view.r > 900 ? 7.5e5 : 1.1e6) * (fast > 0.5 ? 0.35 : 1) });
      c.filter = 'none';
      drawLakes(c, view, k);
    }
    // the Moon at its true size and place
    drawMoon(c, v, k);
  },
};

// ------------------------------------------------------------------ lakes (Natural Earth): ETOPO1 has no lake surfaces
const ICE = [188, 198, 212];
const LAKE_CUT = LAKES.map(([name, rings]) => {
  let la = 0, lo = 0; for (const [a, b] of rings[0]) { la += a; lo += b; }
  return { name, rings, lat: la / rings[0].length, lon: lo / rings[0].length };
});
const DEGR = Math.PI / 180;
function drawLakes(c, view, k) {
  if (view.r < 40) return;
  c.save();
  c.globalAlpha *= k;
  for (const lk of LAKE_CUT) {
    const p = project(lk.lat, lk.lon, view);
    if (p.z < 0.08) continue;
    if (p.x < -400 || p.x > L.W + 400 || p.y < -400 || p.y > L.H + 400) continue;
    // lit like earth.js does the sea: lake water ~ the 60-200 m shelf colour, Lambert + limb, night side dark
    const X = (p.x - view.cx) / view.r, Y = (view.cy - p.y) / view.r, Z = Math.max(0, p.z);
    const ndl = X * LIGHT[0] + Y * LIGHT[1] + Z * LIGHT[2];
    const day = L.smoothstep(L.clamp((ndl + 0.1) / 0.22));
    const dm = (0.4 + 0.66 * Math.sqrt(Math.max(0, ndl))) * (0.72 + 0.28 * Math.sqrt(Z));
    const base = [24, 78, 132], f = L.lerp(0.035, dm, day);
    c.fillStyle = L.rgba(base.map((x) => x * f));
    c.beginPath();
    for (const r of lk.rings) geoPath(c, view, r, true, 0.5);
    c.fill('evenodd');
  }
  c.restore();
  void DEGR;
}

export function drawMoon(c, v, k, scale = 1) {
  const x = v.wx(MOON_POS.x), y = v.wy(MOON_POS.y), r = v.ws(R_MOON) * scale;
  if (x + r < -20 || x - r > W + 20 || y + r < -20 || y - r > H + 20) return;
  c.save();
  c.globalAlpha *= k;
  if (r < 1.2) {
    c.fillStyle = 'rgba(225,222,214,0.95)';
    c.beginPath(); c.arc(x, y, Math.max(0.9, r), 0, Math.PI * 2); c.fill();
  } else {
    const n = r < 16 ? 64 : r < 60 ? 160 : 384;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(moonSprite(n, LIGHT), x - r, y - r, 2 * r, 2 * r);
  }
  c.restore();
}
