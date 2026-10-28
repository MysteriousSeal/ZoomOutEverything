// Beat 4 — "The water here is some of the emptiest on the planet: | almost no nutrients, almost no life."
// Shot 'gyre' (roll back to north-up, r 620 over the South Pacific). A STYLISED, honest life-density map: one dot ≈ a
// patch of plankton-rich water, dots kept with a probability from a simple model of where ocean life is (dense along
// coasts and shelves, the equatorial upwelling and the Southern Ocean; almost none in the South Pacific Gyre, whose
// empty core is centred near 26° S 118° W; Point Nemo sits in its sparse southern half). Dots fade in on "water", the
// zone label SOUTH PACIFIC GYRE on "emptiest"; legend plate (one colour = one meaning). Phrase 1: headline lines
// information instead of the caption: LOWEST CHLOROPHYLL (on the first "almost") / OF ANY OCEAN (on the second; the
// South Pacific Gyre has the lowest surface chlorophyll of the world ocean), gone before the beat-5 streaks.
import * as L from '../../../../engine/runtime/lib.js';
import { basis, elevation } from '../../../../engine/runtime/earth.js';
import { ACCENT, INKW, GREYT, globe, geo, word, mapLabel, plate, scrim, B, PH, WD } from '../env.js';

const { W, H } = L;
const DEG = Math.PI / 180;
export const LIFE = [130, 226, 150];   // the one dot colour (a faint chlorophyll green)

// a round, soft-edged dot sprite (no square pixels)
let DOT = null;
function dotSprite() {
  if (DOT) return DOT;
  const n = 32, cv = new OffscreenCanvas(n, n), x = cv.getContext('2d');
  const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, `rgba(${LIFE[0]},${LIFE[1]},${LIFE[2]},1)`);
  g.addColorStop(0.45, `rgba(${LIFE[0]},${LIFE[1]},${LIFE[2]},0.85)`);
  g.addColorStop(1, `rgba(${LIFE[0]},${LIFE[1]},${LIFE[2]},0)`);
  x.fillStyle = g; x.fillRect(0, 0, n, n);
  DOT = cv;
  return cv;
}

// ------------------------------------------------------------------ the dot field (built once, deterministic)
const DOTS = (() => {
  const N = 150000, ga = Math.PI * (3 - Math.sqrt(5)), r = L.rng(4242);
  const xs = [], ys = [], zs = [], th = [], ph = [], sz = [];
  const near = (la, lo, d) => {
    for (let a = 0; a < 360; a += 45) {
      const lat = la + d * Math.cos(a * DEG), lon = lo + d * Math.sin(a * DEG) / Math.max(0.2, Math.cos(la * DEG));
      if (elevation(lat, lon) > -400) return true;
    }
    return false;
  };
  for (let i = 0; i < N; i++) {
    const jx = r() - 0.5, jy = r() - 0.5;   // jitter: no visible lattice
    const z = 1 - (2 * (i + 0.5 + jy * 0.9)) / N, lat = Math.asin(L.clamp(z, -1, 1)) / DEG;
    let lon = ((i * ga) / DEG + jx * 0.8) % 360; if (lon > 180) lon -= 360;
    if (lat > 22 || lat < -78) continue;
    const le = ((lon + 360) % 360);          // 0..360
    if (le < 135 || le > 300) continue;     // 135°E … 60°W
    if (elevation(lat, lon) > -30) continue;   // ocean only
    // life model (0 = almost none, 1 = rich)
    const dlat = lat + 26, dlon = ((lon + 118 + 540) % 360) - 180;
    const sl = dlat > 0 ? 13 : 24;
    const D = Math.exp(-((dlat / sl) ** 2) - (dlon / 40) ** 2);
    let life = 0.44;
    if (near(lat, lon, 2.2)) life += 0.55; else if (near(lat, lon, 5)) life += 0.22;
    if (lon > -165 && lon < -78) life += 0.4 * Math.exp(-(((lat + 1) / 4.5) ** 2));    // equatorial upwelling
    if (lat < -52) life += 0.22;                                                     // Southern Ocean
    life -= 0.95 * D;
    life = L.clamp(life);
    const keep = Math.pow(life, 1.6) * 0.7;   // ≈ 30 % sparser than a dot per patch
    if (r() > keep) continue;
    const cl = Math.cos(lat * DEG);
    xs.push(cl * Math.cos(lon * DEG)); ys.push(cl * Math.sin(lon * DEG)); zs.push(Math.sin(lat * DEG));
    th.push(r()); ph.push(r() * 6.283); sz.push(0.7 + 0.8 * r() * r());
  }
  return { x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), th: Float32Array.from(th), ph: Float32Array.from(ph), sz: Float32Array.from(sz), n: xs.length };
})();

const fieldK = (gt, tl) => {
  const a = WD(4, 0, 1, -0.2)(tl);   // "water"
  return L.prog(gt, a, 1.5) * (1 - L.smoothstep(L.prog(gt, B(5, 0.25)(tl), 0.9)));
};

export default {
  beat: 4,
  chapter: null,
  captions: true,
  layer: 4,
  cues(d, tl) {
    const st = tl.scenes[4].start, w = (j, k) => tl.lines[4].phrases[j].words[k][0] - st;
    return [
      { t: w(0, 1) + 0.1, name: 'sonar', gain: 0.14, pitch: 0.7 },
      { t: w(1, 0) - 0.3, name: 'hush', gain: 0.14, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl;
    const fk = fieldK(gt, tl);
    if (fk > 0) {
      const g = globe(v), b = basis(g);
      const [rx, ry, rz] = b.r, [ux, uy, uz] = b.u, [cx_, cy_, cz_] = b.c;
      const R = g.r, s = Math.max(2.6, Math.min(5, R / 140)), spr = dotSprite();
      const ga = c.globalAlpha;
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < DOTS.n; i++) {
        if (DOTS.th[i] > fk * 1.05) continue;
        const x = DOTS.x[i], y = DOTS.y[i], z = DOTS.z[i];
        const Z = x * cx_ + y * cy_ + z * cz_;
        if (Z < 0.08) continue;
        const X = x * rx + y * ry + z * rz, Y = x * ux + y * uy + z * uz;
        const sx = g.cx + X * R, sy = g.cy - Y * R;
        if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
        const tw = 0.65 + 0.35 * Math.sin(gt * 1.7 + DOTS.ph[i]);
        const a = 0.9 * tw * L.smoothstep(L.invLerp(0.08, 0.3, Z)) * L.clamp((fk * 1.05 - DOTS.th[i]) * 6);
        const d = s * DOTS.sz[i];
        c.globalAlpha = ga * a;
        c.drawImage(spr, sx - d / 2, sy - d / 2, d, d);
      }
      c.restore();
    }
    // ---- headline (phrase 1), held a moment into beat 5
    const t1 = WD(4, 1, 0, -0.05)(tl), t2 = WD(4, 1, 3, -0.05)(tl);
    const hk1 = L.ease.outCubic(L.prog(gt, t1, 0.4)), hk2 = L.ease.outCubic(L.prog(gt, t2, 0.4));
    const out = 1 - L.ease.inCubic(L.prog(gt, PH(4, 1, 'end', 0.12)(tl), 0.28));   // gone before the re-entry streaks
    if (hk1 > 0 && out > 0) {
      c.save();
      c.globalAlpha = out;
      scrim(c, W / 2, 470, 520, 150, 0.55 * hk1);
      c.textBaseline = 'alphabetic';
      const fs = Math.min(L.fitSize(c, 'LOWEST CHLOROPHYLL', 880, 84, 800, L.FONT.display, 40), L.fitSize(c, 'OF ANY OCEAN', 880, 84, 800, L.FONT.display, 40));
      c.font = L.font(fs, 800, L.FONT.display);
      c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 16;
      const line = (str, y, k, acc) => {
        if (k <= 0) return;
        c.globalAlpha = out * k;
        c.fillStyle = acc ? L.rgba(ACCENT) : L.rgba(INKW);
        L.trackedText(c, str, W / 2, y + (1 - k) * 12, 1, 'center');
      };
      line('LOWEST CHLOROPHYLL', 450, hk1, false);
      line('OF ANY OCEAN', 450 + fs + 6, hk2, true);
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const t = v.t;
    c.save();
    c.globalAlpha = v.k;
    // zone label on "emptiest"
    const zk = L.ease.outCubic(L.prog(t, word(v, 0, 7, -0.05), 0.45));
    if (zk > 0) {
      const q = geo(v, -25, -118);
      c.save();
      c.globalAlpha *= zk;
      scrim(c, q.x, q.y, 230, 60, 0.45);
      c.textBaseline = 'middle';
      c.font = L.font(36, 800, L.FONT.display);
      c.fillStyle = L.rgba(INKW);
      c.shadowColor = 'rgba(2,6,14,0.95)'; c.shadowBlur = 12;
      L.trackedText(c, 'SOUTH PACIFIC GYRE', q.x, q.y + (1 - zk) * 8, 4, 'center');
      c.restore();
    }
    // legend plate (with the dots, bottom of the map, clear of the caption band)
    const lk = L.ease.outCubic(L.prog(t, word(v, 0, 1, 0.1), 0.45));
    if (lk > 0) {
      const str = 'PLANKTON-RICH WATER (STYLISED)';
      c.save();
      c.font = L.font(22, 600, L.FONT.body);
      c.letterSpacing = '3px';
      const tw_ = c.measureText(str).width;
      c.letterSpacing = '0px';
      // opaque plate with its own exit (contents, then plate), never the engine's see-through overlay fade
      const exC = 1 - L.ease.inCubic(L.prog(t, v.d - 0.44, 0.14)), exP = 1 - L.ease.inOutCubic(L.prog(t, v.d - 0.38, 0.12));
      const pw = (tw_ + 110) * L.lerp(0.4, 1, lk), ph = 58 * exP, px = W / 2 - pw / 2, py = 1270 + (58 - ph) / 2;
      c.globalAlpha = 1;
      if (ph > 0.5) plate(c, px, py, pw, ph, { r: Math.min(29, ph / 2), border: 0.35 });
      c.beginPath(); c.rect(px, py, pw, ph); c.clip();
      c.globalAlpha = L.clamp((lk - 0.8) / 0.2) * exC;
      // a sample cluster of dots
      const r = L.rng(9);
      c.fillStyle = L.rgba(LIFE, 0.9);
      const spr = dotSprite();
      for (let i = 0; i < 9; i++) { const d = 4 + 3 * r(); c.drawImage(spr, px + 30 + r() * 30 - d / 2, py + 18 + r() * 24 - d / 2, d, d); }
      c.fillStyle = L.rgba(GREYT);
      c.textBaseline = 'middle';
      L.trackedText(c, str, px + 82, py + ph / 2 + 1, 3, 'left');
      c.restore();
    }
    c.restore();
    void PH;
  },
};
