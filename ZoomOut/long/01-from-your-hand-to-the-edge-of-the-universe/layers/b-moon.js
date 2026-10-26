// Builder B — the Moon as a lit sphere sprite: the near side (maria at their real selenographic positions), lit by the
// same sunlight as the Earth (the view-space light vector of camera.js SUBSOLAR as seen from above New York), so the
// phase matches the Earth's (lit toward the lower left, dark limb toward the upper right). Rendered once per size.
import * as L from '../../../../engine/runtime/lib.js';

const DEG = Math.PI / 180;
// maria: [lat, lon, radius deg, darkness 0..1] (approximate outlines as soft discs, several per irregular mare)
const MARIA = [
  [32.8, -15.6, 11, 1], [38, -20, 6, 0.9], [27, -5, 5, 0.8],                       // Imbrium
  [28, 17.5, 8.5, 1],                                                                 // Serenitatis
  [8.5, 31.4, 9.5, 1], [3, 25, 5, 0.9], [14, 34, 5, 0.9],                            // Tranquillitatis
  [17, 59, 6, 1.05],                                                                  // Crisium
  [-7.8, 51.3, 7.5, 0.9], [-2, 54, 4, 0.8],                                           // Fecunditatis
  [-15.2, 35.5, 5, 0.9],                                                              // Nectaris
  [-21, -16.6, 7.5, 0.85], [-15, -10, 4, 0.7],                                        // Nubium
  [18, -57, 12, 0.95], [5, -50, 10, 0.95], [30, -50, 9, 0.9], [-5, -40, 8, 0.85], [40, -45, 7, 0.8],   // Oceanus Procellarum
  [-24.4, -38.6, 5, 0.9],                                                             // Humorum
  [56, 1.4, 5, 0.8], [57, -15, 4.5, 0.75], [55, 20, 4.5, 0.75],                       // Frigoris
  [13.3, 3.6, 4, 0.85], [7.5, -30.9, 5, 0.8], [-10, -23, 5, 0.75],                    // Vaporum, Insularum, Cognitum
  [-13, -4, 3.5, 0.6], [20, 8, 3, 0.6],
  [18, 25, 5, 0.85], [24, -33, 8, 0.85], [12, -40, 8, 0.85], [-3, 42, 5, 0.75], [-14, -28, 5, 0.7], [35, 5, 5, 0.75],
];
const CRATERS = [[-43.3, -11.2, 1.0], [9.6, -20.1, 0.8], [8.1, -38, 0.5], [23.7, -47.4, 0.7], [-9, 15, 0.35], [24, 40, 0.35]];   // Tycho, Copernicus, Kepler, Aristarchus...

function h3(i, j, s) { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = h3(i, j, s), b = h3(i + 1, j, s), c = h3(i, j + 1, s), d = h3(i + 1, j + 1, s);
  return (a + (b - a) * su) * (1 - sv) + (c + (d - c) * su) * sv;
}

const CACHE = new Map();
/** Sprite (canvas, size n px, the disc fills it) of the Moon lit by screen light [lx, ly (up), lz (toward viewer)]. */
export function moonSprite(n, light) {
  const key = `${n}|${light.map((x) => x.toFixed(3)).join(',')}`;
  let cv = CACHE.get(key);
  if (cv) return cv;
  cv = new OffscreenCanvas(n, n);
  const g = cv.getContext('2d'), im = g.createImageData(n, n), d = im.data;
  const [lx, ly, lz] = light;
  const R = n / 2 - 0.5;
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const X = (px + 0.5 - n / 2) / R, Y = (n / 2 - py - 0.5) / R, rho2 = X * X + Y * Y;
      if (rho2 > 1) continue;
      const Z = Math.sqrt(1 - rho2);
      const lat = Math.asin(Y) / DEG, lon = Math.atan2(X, Z) / DEG;
      // albedo: bright highlands, dark maria, crater speckle
      let alb = 0.78 + 0.1 * (vn(lon / 9, lat / 9, 3) - 0.5) + 0.08 * (vn(lon / 2.5, lat / 2.5, 4) - 0.5);
      let msum = 0;
      const wob = 0.8 + 0.4 * vn(lon / 7 + 3, lat / 7 - 1, 7) + 0.2 * vn(lon / 2.2, lat / 2.2, 8);
      for (const [a, b, r, k] of MARIA) {
        const dl = (lat - a) / (r * 1.28), db = ((lon - b) * Math.cos(lat * DEG)) / (r * 1.28), q = Math.sqrt(dl * dl + db * db) * wob;
        if (q < 2) msum += k * L.smoothstep(L.clamp((1.3 - q) / 0.6));
      }
      let mare = 1 - Math.exp(-2.0 * msum);
      mare *= 0.85 + 0.3 * vn(lon / 2.5, lat / 2.5, 5);
      alb -= 0.42 * Math.min(1, mare);
      for (const [a, b, k] of CRATERS) {
        const dd = Math.hypot(lat - a, (lon - b) * Math.cos(lat * DEG));
        alb += k * 0.25 * Math.exp(-dd * dd / 2);                                // bright young craters (Tycho, Copernicus)
        if (k >= 0.8) alb += k * 0.06 * Math.exp(-dd / 14) * (0.5 + 0.5 * Math.sin(Math.atan2(lat - a, lon - b) * 9));   // rays
      }
      alb += 0.06 * (vn(lon * 1.3, lat * 1.3, 6) - 0.5);
      // lighting (Lommel-Seeliger-ish: the full Moon is flat, the terminator soft)
      const mu = X * lx + Y * ly + Z * lz;
      const lit = mu > 0 ? (mu / (mu + Z * 0.6 + 0.05)) * 1.55 : 0;
      const term = L.smoothstep(L.clamp((mu + 0.03) / 0.1));
      const v = Math.min(1.1, alb * lit) * term;
      const edge = L.clamp((1 - Math.sqrt(rho2)) * R + 0.5);
      const o = (py * n + px) * 4;
      d[o] = 238 * v + 4; d[o + 1] = 232 * v + 4; d[o + 2] = 222 * v + 6; d[o + 3] = 255 * edge;
    }
  }
  g.putImageData(im, 0, 0);
  CACHE.set(key, cv);
  return cv;
}
