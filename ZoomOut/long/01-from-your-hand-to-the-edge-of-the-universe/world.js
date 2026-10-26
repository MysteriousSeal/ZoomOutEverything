// Shared helpers + palette for every layer and scene (no layer imports here, so anything may import it).
// Owned by the orchestrator — builders: read, don't edit.
import * as L from '../../../engine/runtime/lib.js';
import { LY } from './camera.js';

const { W, H } = L;
export const ACCENT = [90, 220, 235];
export const INK = [235, 232, 225];
export const SPACE = [3, 5, 10];   // the colour of empty space

// Handoffs (log10 F): both layers draw across the window and must match there.
export const HANDOFF = {
  handCity: [1.6, 2.4],        // grass and meadow: identical grass colour (GRASS) and light
  cityEarth: [5.3, 6.4],       // the vector coast map dissolves into the real globe (same projection: lat0/lon0 = HAND)
  earthSolar: [9.4, 10.2],     // the Earth-Moon pair shrinks into the solar system's Earth dot
  solarStars: [15.8, 17.0],    // the Sun becomes one star among its neighbours
  starsGalaxy: [19.2, 20.4],   // the star field resolves into the Milky Way's disc
  galaxyCosmos: [23.2, 24.4],  // the Local Group shrinks into the field of galaxies
};
export const GRASS = { base: [74, 118, 52], light: [104, 150, 66], dark: [48, 82, 36] };   // sunlit summer lawn

/** 0..1 trapezoid in log10 F: rises a→b, holds, falls c→d (smooth). */
export function band(lf, a, b, c = Infinity, d = Infinity) {
  const up = b <= a ? +(lf >= a) : L.smoothstep(L.clamp((lf - a) / (b - a)));
  const down = d <= c ? +(lf <= c) : 1 - L.smoothstep(L.clamp((lf - c) / (d - c)));
  return Math.min(up, down);
}

/** Visible world rectangle (metres) with a pixel pad. */
export function worldRect(v, pad = 0) {
  const m = v.cam.mpp;
  return { x0: v.cam.x - (W / 2 + pad) * m, x1: v.cam.x + (W / 2 + pad) * m, y0: v.cam.y - (H / 2 + pad) * m, y1: v.cam.y + (H / 2 + pad) * m };
}
/** Is a world circle (x, y, r metres) on screen (with a pixel pad)? */
export function onScreen(v, x, y, r = 0, pad = 40) {
  const sx = v.wx(x), sy = v.wy(y), sr = r / v.cam.mpp;
  return sx + sr > -pad && sx - sr < W + pad && sy + sr > -pad && sy - sr < H + pad;
}

// ------------------------------------------------------------------ formatters
const n0 = (x) => L.fmt(x, x < 10 ? 1 : 0).replace(/\.0$/, '');
/** Field-of-view text, e.g. "34 cm", "8.2 km", "1.6 million km", "100,000 light-years". */
export function fmtField(F) {
  if (F < 1) return `${n0(F * 100)} cm`;
  if (F < 1000) return `${n0(F)} m`;
  if (F < 1e9) return `${L.fmt(Math.round(F / 1000 / (F < 1e4 ? 0.1 : F < 1e7 ? 1 : 100)) * (F < 1e4 ? 0.1 : F < 1e7 ? 1 : 100), F < 1e4 ? 1 : 0)} km`;
  const km = F / 1000;
  if (F < LY) {
    for (const [u, s] of [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']]) if (km >= u) return `${n0(km / u)} ${s} km`;
  }
  const ly = F / LY;
  if (ly < 1e6) return `${L.fmt(ly < 10 ? Math.round(ly * 10) / 10 : Math.round(ly / (ly < 1000 ? 1 : 1000)) * (ly < 1000 ? 1 : 1000), ly < 10 ? 1 : 0)} light-years`;
  for (const [u, s] of [[1e9, 'billion'], [1e6, 'million']]) if (ly >= u) return `${n0(ly / u)} ${s} light-years`;
  return `${n0(ly)} light-years`;
}
/** Imperial companion for human/Earth scales (null beyond ~Earth). */
export function fmtImperial(F) {
  if (F < 0.3048 * 3) return `${n0(F / 0.0254)} in`;
  if (F < 1609) return `${L.fmt(Math.round(F / 0.3048))} ft`;
  if (F < 2e8) return `${L.fmt(F / 1609.34 < 100 ? Math.round(F / 1609.34 * 10) / 10 : Math.round(F / 1609.34), F / 1609.34 < 100 ? 1 : 0)} mi`;
  return null;
}

