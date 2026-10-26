// Beat 11 — "About six kilometers wide. | Smaller than a city."
// The dive lands on the true-size horizon (RS = 2,953 m, ≈ 422 px at 14 m/px). One device per phrase:
//   "About six kilometers wide": the black disc with a thin photon ring, a deterministic background starfield bent
//     around it (each star has two images, stretched into arcs near the Einstein ring and flowing as the sources
//     drift), and a diameter dimension that draws itself across the horizon. Label "6 km".
//   "Smaller than a city": a refined street-map plate of an ~11 km city (a river, a ring road, radial avenues,
//     districts of street grids, parks) is revealed outward from the hole, UNDER it.
// Exports the shared render (hole, lensed stars, city plate, diameter / road line) for s12, which keeps them until
// the fly-out in beat 13.
import * as L from '../../../../engine/runtime/lib.js';
import { CITY, RS, SUN, filmScene } from '../camera.js';
import { ACCENT } from '../env.js';

const TAU = Math.PI * 2;
const THETA_E = 1.75 * RS;          // Einstein radius of the drawn lens (artistic; arcs hug the photon ring)
const PHOTON = 1.5 * RS;            // photon-ring radius (matches env's violet marker ring)

// beat-relative timing (beat 11 starts 43.40; phrases 43.55-45.26 / 45.86-47.06)
const T_DIM = 1.25, D_DIM = 0.7;    // the diameter dimension draws on "kilometers wide"
const T_LABEL = 0.5;                // "6 km" lands on "six kilometers" (43.9), as the dive settles
const T_CITY = 2.42, D_CITY = 1.5;  // the city plate is revealed on "Smaller than a city"
// global gates
const G_END = 54.2;                 // the flight back to Earth has left the hole by now
const WD = 0.9;                     // world-layer fade-out duration at the flight

/** 0..1 of the black-hole set (stars, plate, hole) by the hole's size on screen, and gated in time. */
export function holeK(v) {
  const rpx = v.ws(RS);
  const kSize = L.smoothstep(L.invLerp(10, 48, rpx));
  const kTime = v.gt > 39 && v.gt < G_END ? 1 : 0;
  return kSize * kTime;
}

// ------------------------------------------------------------------ lensed background stars
// Sources in the plane behind the hole (metres from SUN), drifting slowly to the right so their images slide
// around the ring and brighten as they cross it. Pure function of time.
const STARS = (() => {
  const r = L.rng(1111), out = [];
  const BOX = 4.6 * THETA_E;
  for (let i = 0; i < 560; i++) {
    const a = r() * TAU, d = BOX * (i % 2 ? Math.sqrt(r()) : Math.pow(r(), 1.3));   // half crowd toward the axis
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 1.6, s: 0.8 + r() * r() * 2.0, ph: r() * TAU,
      warm: r() < 0.25, spd: 0.75 + r() * 0.5 });
  }
  // a few bright sources that pass almost directly behind the hole: they smear into long arcs, near-rings
  for (let i = 0; i < 7; i++) {
    out.push({ x: (r() * 2 - 1) * BOX, y: (r() * 2 - 1) * 0.3 * THETA_E, s: 1.8 + r() * 0.8, ph: r() * TAU, warm: i % 3 === 0, spd: 0.8 + r() * 0.3 });
  }
  return { list: out, box: BOX };
})();

export function drawLensedStars(c, v, k) {
  if (k <= 0.002) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y), mpp = v.cam.mpp;
  const rH = RS / mpp;
  const BOX = STARS.box, VX = 380;            // drift (m/s of source plane)
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (const s of STARS.list) {
    // wrap the source position inside the box (x), keep y
    let bx = s.x + VX * s.spd * (v.gt - 40);
    bx = ((bx + BOX) % (2 * BOX) + 2 * BOX) % (2 * BOX) - BOX;
    const by = s.y;
    const b = Math.hypot(bx, by);
    if (b < 1) continue;
    const edge = 1 - L.smoothstep(L.invLerp(0.8 * BOX, BOX, Math.abs(bx)));   // soft wrap
    const phi = Math.atan2(by, bx);
    const root = Math.sqrt(b * b + 4 * THETA_E * THETA_E);
    const tw = 0.75 + 0.25 * Math.sin(v.gt * 1.7 + s.ph);
    const col = s.warm ? [255, 226, 196] : [214, 220, 255];
    for (const sgn of [1, -1]) {
      const th = (b + sgn * root) / 2;           // signed image radius
      const at = Math.abs(th);
      if (at < RS * 1.04) continue;              // swallowed by the horizon
      const tang = at / b;                       // tangential stretch
      const rad = Math.abs((1 + sgn * b / root) / 2);
      let mu = tang * rad;
      if (sgn < 0) mu *= 0.9;
      const a = phi + (sgn < 0 ? Math.PI : 0);
      const rho = at / mpp;
      const sx = cx + Math.cos(a) * rho, sy = cy + Math.sin(a) * rho;
      if (sx < -40 || sx > L.W + 40 || sy < -40 || sy > L.H + 40) continue;
      // inner (secondary) images dim toward the horizon edge
      const inner = sgn < 0 ? L.smoothstep(L.invLerp(rH * 1.04, rH * 1.35, rho)) : 1;
      const alpha = k * edge * inner * tw * L.clamp(0.6 * Math.min(2.6, mu) + 0.1);
      if (alpha < 0.01) continue;
      const len = s.s * 1.5 * tang;                    // arc length (px)
      if (len < 2.2) {
        c.fillStyle = L.rgba(col, alpha);
        c.beginPath(); c.arc(sx, sy, Math.max(0, s.s * Math.min(1.6, Math.sqrt(rad + 0.2))), 0, TAU); c.fill();
      } else {
        const half = Math.min(0.55, (len * 0.5) / rho);
        c.strokeStyle = L.rgba(col, alpha);
        c.lineWidth = Math.max(0.9, s.s * Math.min(1.4, rad * 1.6));
        c.beginPath(); c.arc(cx, cy, Math.max(0, rho), a - half, a + half); c.stroke();
      }
    }
  }
  // the faint Einstein ring: the lensed glow of everything behind the hole
  const rE = THETA_E / mpp;
  const g = c.createRadialGradient(cx, cy, Math.max(0, rE * 0.82), cx, cy, rE * 1.3);
  g.addColorStop(0, 'rgba(190,170,255,0)');
  g.addColorStop(0.32, `rgba(200,186,255,${0.16 * k})`);
  g.addColorStop(1, 'rgba(190,170,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, rE * 1.3, 0, TAU); c.arc(cx, cy, Math.max(0, rE * 0.82), 0, TAU, true); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ the city plate (≈ 10 × 8.5 km inside its ring road)
// Drawn as a clean street map in natural map colours: cream land with a yellow ring road, beige block grids with
// white streets, green parks, a light-blue river, pale-yellow main avenues. Legible at 14 m/px in the band around the hole.
const TM = 6.25;                                  // metres per texel
const RX = 5500, RY = 4500;                       // the ring road (périphérique) semi-axes: 11 × 9 km, central Paris
const RING_ROT = -0.06;
let plate = null;
function ringPts(k, rot = RING_ROT) {
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * TAU;
    const w = 1 + 0.035 * L.noise1(a * 2.2, 3) + 0.02 * L.noise1(a * 7, 4);
    const ex = Math.cos(a) * RX * k * w, ey = Math.sin(a) * RY * k * w;
    pts.push([ex * Math.cos(rot) - ey * Math.sin(rot), ex * Math.sin(rot) + ey * Math.cos(rot)]);
  }
  return pts;
}
function cityPlate() {
  if (plate) return plate;
  const TW = Math.round(CITY.w * 1.25 / TM), TH = Math.round(CITY.h * 1.25 / TM);
  const cv = new OffscreenCanvas(TW, TH);
  const c = cv.getContext('2d');
  const X = (m) => TW / 2 + m / TM, Y = (m) => TH / 2 + m / TM, S = (m) => m / TM;
  const r = L.rng(7531);
  const path = (pts, close) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))));
    if (close) c.closePath();
  };
  const LAND = 'rgb(222,216,202)';        // natural street-map colours: cream land, white streets, green parks
  // suburbs: a faint fringe of blocks just outside the ring, fading out
  c.save();
  path(ringPts(1.16), true); c.clip();
  c.fillStyle = 'rgba(70,74,68,0.5)'; c.fillRect(0, 0, TW, TH);
  c.fillStyle = 'rgba(150,146,134,0.22)';
  for (let i = 0; i < 900; i++) {
    const a = r() * TAU, d = 1.0 + r() * 0.16;
    const x = Math.cos(a) * RX * d, y = Math.sin(a) * RY * d;
    c.fillRect(X(x), Y(y), S(120 + r() * 160), S(90 + r() * 120));
  }
  c.restore();
  // the city proper: a solid land patch inside the ring road
  c.save();
  path(ringPts(1), true); c.clip();
  c.fillStyle = LAND; c.fillRect(0, 0, TW, TH);
  // districts: patches of rotated block grids (later ones overwrite earlier ones, so edges stay clean)
  for (let i = 0; i < 46; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    const dx = Math.cos(a) * d * RX, dy = Math.sin(a) * d * RY;
    const rad = 700 + r() * 650, ang = r() * Math.PI;
    const bw = 190 + r() * 110, bh = 140 + r() * 90, gap = 46;
    const lum = 0.85 + r() * 0.15;
    c.save();
    c.beginPath(); c.arc(X(dx), Y(dy), S(rad), 0, TAU); c.clip();
    c.fillStyle = LAND; c.fillRect(X(dx - rad), Y(dy - rad), S(2 * rad), S(2 * rad));
    c.translate(X(dx), Y(dy)); c.rotate(ang);
    c.fillStyle = `rgba(${188 + ((lum * 40) | 0) - 34},${178 + ((lum * 40) | 0) - 34},${160 + ((lum * 40) | 0) - 34},1)`;
    for (let u = -rad; u < rad; u += bw + gap) {
      for (let w = -rad; w < rad; w += bh + gap) c.fillRect(S(u), S(w), S(bw), S(bh));
    }
    c.restore();
  }
  // parks
  const park = (x, y, rx, ry, rot) => {
    c.fillStyle = 'rgb(176,212,150)';
    c.beginPath(); c.ellipse(X(x), Y(y), S(rx), S(ry), rot, 0, TAU); c.fill();
  };
  park(-4300, -450, 520, 1100, 0.15);
  park(4250, 1450, 700, 480, -0.3);
  park(-1700, -3300, 420, 280, 0.2);
  park(1900, 3150, 460, 320, -0.4);
  park(-3200, 2400, 360, 340, 0);
  park(2950, -2350, 400, 260, 0.5);
  // grand boulevards (inner ring) and radial avenues from étoiles
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgb(255,255,255)';
  c.lineWidth = S(48);
  path(ringPts(0.6, 0.1), true); c.stroke();
  const etoile = (x, y, n, l0, l1, rot) => {
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU + 0.12 * L.noise1(i * 1.7, 9), l = l0 + (l1 - l0) * ((i * 0.618) % 1);
      c.moveTo(X(x + Math.cos(a) * 130), Y(y + Math.sin(a) * 130));
      c.lineTo(X(x + Math.cos(a) * l), Y(y + Math.sin(a) * l));
    }
    c.stroke();
    c.beginPath(); c.arc(X(x), Y(y), S(130), 0, TAU); c.stroke();
  };
  c.strokeStyle = 'rgb(255,255,255)';
  c.lineWidth = S(40);
  etoile(-3250, -1650, 10, 1300, 2500, 0.1);
  etoile(2650, -2550, 7, 1100, 2100, 0.4);
  etoile(2350, 2450, 6, 1100, 2000, 0.2);
  etoile(-2500, 2700, 6, 900, 1700, 0.6);
  // long axes
  c.strokeStyle = 'rgb(252,232,170)';
  c.lineWidth = S(56);
  c.beginPath();
  c.moveTo(X(-5400), Y(-1000)); c.lineTo(X(5300), Y(-2350));
  c.moveTo(X(-800), Y(-4300)); c.lineTo(X(200), Y(4300));
  c.moveTo(X(-5200), Y(3100)); c.lineTo(X(5200), Y(300));
  c.stroke();
  c.restore();
  // the river: a broad arc through the middle and out past the ring (west-south-west to east-south-east)
  const RIVER = [[-7000, 1800], [-4600, 2350], [-3100, 1500], [-1700, -250], [0, -900], [1600, -450], [3000, 700], [4400, 1900], [7000, 2800]];
  const riverPath = () => {
    c.beginPath();
    c.moveTo(X(RIVER[0][0]), Y(RIVER[0][1]));
    for (let i = 1; i < RIVER.length - 1; i++) {
      const mx = (RIVER[i][0] + RIVER[i + 1][0]) / 2, my = (RIVER[i][1] + RIVER[i + 1][1]) / 2;
      c.quadraticCurveTo(X(RIVER[i][0]), Y(RIVER[i][1]), X(mx), Y(my));
    }
    c.lineTo(X(RIVER[RIVER.length - 1][0]), Y(RIVER[RIVER.length - 1][1]));
  };
  riverPath(); c.strokeStyle = 'rgb(120,160,200)'; c.lineWidth = S(250); c.stroke();
  riverPath(); c.strokeStyle = 'rgb(160,200,236)'; c.lineWidth = S(200); c.stroke();
  // ring road last: the crispest line, it IS the plate edge
  c.strokeStyle = 'rgb(196,150,70)';
  c.lineWidth = S(84);
  path(ringPts(1), true); c.stroke();
  c.strokeStyle = 'rgb(250,200,100)';
  c.lineWidth = S(56);
  path(ringPts(1), true); c.stroke();
  // fade the river and suburbs out beyond the ring
  c.globalCompositeOperation = 'destination-in';
  const fg = c.createRadialGradient(TW / 2, TH / 2, S(RX * 1.03), TW / 2, TH / 2, S(RX * 1.2));
  fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
  c.save(); c.translate(TW / 2, TH / 2); c.scale(1, RY / RX); c.translate(-TW / 2, -TH / 2);
  c.fillStyle = fg; c.fillRect(-TW, -TH * 2, TW * 3, TH * 5);
  c.restore();
  plate = { cv, TW, TH };
  return plate;
}

/** The city plate, revealed outward from the hole (reveal 0..1), at alpha k. */
export function drawCity(c, v, k, reveal) {
  if (k <= 0.002 || reveal <= 0) return;
  const p = cityPlate();
  const cx = v.wx(CITY.x), cy = v.wy(CITY.y), sc = TM / v.cam.mpp;
  if (p.TW * sc < 6) return;
  const R = L.lerp(RS * 0.9, 8200, reveal) / v.cam.mpp;
  // a soft pool of shadow under the plate, so the violet halo behind the hole does not wash it out
  const rd = (RX * 1.35) / v.cam.mpp;
  const dk = k * L.smoothstep(L.clamp(reveal * 2));
  const dg = c.createRadialGradient(cx, cy, 0, cx, cy, rd);
  dg.addColorStop(0, `rgba(4,4,10,${0.8 * dk})`); dg.addColorStop(0.7, `rgba(4,4,10,${0.62 * dk})`); dg.addColorStop(1, 'rgba(4,4,10,0)');
  c.save();
  c.fillStyle = dg;
  c.beginPath(); c.arc(cx, cy, rd, 0, TAU); c.fill();
  c.globalAlpha = k;
  c.beginPath(); c.arc(cx, cy, Math.max(0, R), 0, TAU); c.clip();
  c.imageSmoothingQuality = 'high';
  c.drawImage(p.cv, cx - (p.TW * sc) / 2, cy - (p.TH * sc) / 2, p.TW * sc, p.TH * sc);
  c.restore();
  // the leading edge of the reveal: a thin cool ring that fades as it opens
  if (reveal < 1) {
    const a = k * Math.sin(Math.PI * reveal) * 0.55;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = L.rgba([200, 190, 255], a);
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(cx, cy, Math.max(0, R), 0, TAU); c.stroke();
    c.restore();
  }
}

/** Width dimension under the city: "A CITY · 11 KM ACROSS" (screen space, k 0..1 draws it). */
export function cityDimension(c, v, k) {   // 16b: exported for the cold open (p-cold.js)
  if (k <= 0.002) return;
  const cx = v.wx(CITY.x), cy = v.wy(CITY.y), hw = RX / v.cam.mpp;
  const y = cy + (RY * 1.04) / v.cam.mpp + 34;
  const e = L.ease.outCubic(L.clamp(k * 1.3));
  const col = [214, 220, 245];
  c.save();
  c.globalAlpha = L.clamp(k * 1.5);
  c.strokeStyle = L.rgba(col, 0.8);
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - hw * e, y); c.lineTo(cx + hw * e, y); c.stroke();
  const kt = L.clamp((k - 0.5) * 3);
  if (kt > 0) {
    c.beginPath();
    c.moveTo(cx - hw, y - 12 * kt); c.lineTo(cx - hw, y + 12 * kt);
    c.moveTo(cx + hw, y - 12 * kt); c.lineTo(cx + hw, y + 12 * kt);
    c.stroke();
  }
  c.globalAlpha = L.clamp((k - 0.35) * 2.5);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10;
  c.font = L.font(28, 600, L.FONT.body);
  c.fillStyle = L.rgba([226, 232, 248], 0.95);
  L.trackedText(c, 'A CITY · 11 KM ACROSS', cx, y + 44, 3, 'center');
  c.restore();
}

// ------------------------------------------------------------------ the hole: black disc, inner falloff, photon ring
export function drawHole(c, v, k, flash = 0, flashOnly = false) {
  // over the (bright) city map the additive glows would wash it pink: keep only a thin lensing rim there
  const over = cityReveal(v);
  const gk = 1 - 0.8 * over;
  if (k <= 0.002) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y), mpp = v.cam.mpp;
  const r = Math.max(4, RS / mpp), rp = Math.max(6, PHOTON / mpp);
  // 16b audit: flashOnly = ONLY the extra light of a flare, added over the hole s11 already drew (s12's swallow
  // pulse). No soak, no black disc (it blanked s11's diameter for 1.1 s: the line popped off at 54.52 and back at
  // 55.62), no rim; the added light scales with `flash`, so it ends at exactly zero (no pop when the pulse ends).
  if (flashOnly) {
    if (flash <= 0.002) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    const N = 72;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
      const n = 0.62 + 0.38 * L.noise1(i * 0.37 + v.gt * 0.9, 12);
      c.strokeStyle = L.rgba(L.mix([226, 214, 255], [255, 255, 255], 0.3 + flash * 0.6), k * (0.28 + 0.3 * n) * 2 * flash * (1 - 0.5 * over));
      c.lineWidth = 1.4 + flash * 1.6;
      c.beginPath(); c.arc(cx, cy, Math.max(0, rp), a0, a1 + 0.002); c.stroke();
    }
    const gw = Math.max(8, rp * 0.09);
    const g = c.createRadialGradient(cx, cy, Math.max(0, rp - gw), cx, cy, rp + gw * 2.2);
    g.addColorStop(0, 'rgba(180,150,255,0)');
    g.addColorStop(0.3, L.rgba(ACCENT, 0.5 * flash * gk * k));
    g.addColorStop(1, 'rgba(180,150,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, rp + gw * 2.2, 0, TAU); c.arc(cx, cy, Math.max(0, rp - gw), 0, TAU, true); c.fill();
    c.restore();
    return;
  }
  c.save();
  c.globalAlpha = k;
  // soak: everything near the horizon darkens toward it (depth)
  const sg = c.createRadialGradient(cx, cy, r, cx, cy, r * 1.22);
  sg.addColorStop(0, 'rgba(0,0,0,0.7)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sg;
  c.beginPath(); c.arc(cx, cy, r * 1.22, 0, TAU); c.fill();
  c.fillStyle = '#000';
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
  c.globalAlpha = 1;
  // the photon ring: a fine, slightly uneven line of light that shimmers (Doppler-free, a lone hole)
  c.globalCompositeOperation = 'lighter';
  const N = 72;
  c.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    const n = 0.62 + 0.38 * L.noise1(i * 0.37 + v.gt * 0.9, 12);
    c.strokeStyle = L.rgba(L.mix([226, 214, 255], [255, 255, 255], 0.3 + flash * 0.6), k * (0.28 + 0.3 * n) * (1 + 2 * flash) * (1 - 0.5 * over));
    c.lineWidth = 1.4 + flash * 1.6;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rp), a0, a1 + 0.002); c.stroke();
  }
  // a soft glow hugging it
  const gw = Math.max(8, rp * 0.09);
  const g = c.createRadialGradient(cx, cy, Math.max(0, rp - gw), cx, cy, rp + gw * 2.2);
  g.addColorStop(0, 'rgba(180,150,255,0)');
  g.addColorStop(0.3, L.rgba(ACCENT, (0.22 + 0.5 * flash) * gk * k));
  g.addColorStop(1, 'rgba(180,150,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, rp + gw * 2.2, 0, TAU); c.arc(cx, cy, Math.max(0, rp - gw), 0, TAU, true); c.fill();
  // the edge of the ball itself: a crisp violet rim with a soft inner glow (what the 6 km refers to)
  const eg = c.createRadialGradient(cx, cy, Math.max(0, r - 14), cx, cy, r + 3);
  eg.addColorStop(0, 'rgba(160,120,255,0)'); eg.addColorStop(1, L.rgba(ACCENT, 0.3 * k * gk));
  c.fillStyle = eg;
  c.beginPath(); c.arc(cx, cy, r + 3, 0, TAU); c.arc(cx, cy, Math.max(0, r - 14), 0, TAU, true); c.fill();
  c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.35), 0.85 * k);
  c.lineWidth = 1.6;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r + 0.5), 0, TAU); c.stroke();
  c.restore();
}

/** The horizontal diameter across the horizon (k 0..1 draws it out from the centre). */
export function drawDiameter(c, v, k, alpha = 1) {
  if (k <= 0.001 || alpha <= 0.002) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y), r = RS / v.cam.mpp;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.35));
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - r * e, cy); c.lineTo(cx + r * e, cy); c.stroke();
  // end ticks grow once the line reaches the rim
  const kt = L.ease.outBack(L.clamp((k - 0.75) / 0.25));
  if (kt > 0) {
    const h = 20 * kt;
    c.beginPath();
    c.moveTo(cx - r, cy - h); c.lineTo(cx - r, cy + h);
    c.moveTo(cx + r, cy - h); c.lineTo(cx + r, cy + h);
    c.stroke();
    L.lightBlob(c, cx - r, cy, 26, ACCENT, 0.5 * kt * (1 - L.clamp((k - 1) * 2)));
    L.lightBlob(c, cx + r, cy, 26, ACCENT, 0.5 * kt * (1 - L.clamp((k - 1) * 2)));
  }
  c.restore();
}

/** Diameter progress (0..2: drawn by 1, end flashes settled by 2), kept through beat 12 as the road. */
const diameterK = (v) => L.prog(v.t, T_DIM, D_DIM) + L.prog(v.t, T_DIM + D_DIM, 0.5);

/** Soft dark backing behind upper-left labels over busy art. */
export function labelBacking(c, x, y, w, h, a) {
  if (a <= 0.002) return;
  // an elliptical, feathered pool of shadow (no visible box edge)
  const cx = x + w / 2, cy = y + h / 2;
  c.save();
  c.translate(cx, cy);
  c.scale(1, h / w);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, w * 0.62);
  g.addColorStop(0, `rgba(3,5,12,${a})`);
  g.addColorStop(0.6, `rgba(3,5,12,${a * 0.75})`);
  g.addColorStop(1, 'rgba(3,5,12,0)');
  c.fillStyle = g;
  c.fillRect(-w * 0.62, -w * 0.62, w * 1.24, w * 1.24);
  c.restore();
}

/** 0..1 reveal of the city plate (global time, so s12 sees the same value). */
export function cityReveal(v) { return L.ease.inOutCubic(L.prog(v.gt, v.tl.scenes[11].start + T_CITY, D_CITY)); }

/** Visibility of the whole set, fading as the beat-13 flight pulls away (global time). */
export function setK(v) {
  const leave = 1 - L.ease.inCubic(L.prog(v.gt, 52.5, WD));
  return holeK(v) * leave;
}

export default filmScene({
  beat: 11,
  chapter: { num: '11', title: 'Six kilometers', sub: 'the event horizon, true scale' },
  captions: true,
  layer: 1,
  cues() {
    return [
      { t: 1.25, name: 'deep', gain: 0.42, pitch: 0.85 },
      { t: T_DIM + 0.05, name: 'tick', gain: 0.16, pitch: 1.2 },
      { t: T_DIM + D_DIM - 0.08, name: 'tick', gain: 0.16, pitch: 1.5 },
      { t: T_CITY, name: 'bloom', gain: 0.26, pitch: 0.75 },
      { t: T_CITY + 0.1, name: 'shimmer', gain: 0.12, pitch: 0.8 },
    ];
  },
  drawWorld(c, v) {
    const k = setK(v);
    if (k <= 0.002) return;
    drawLensedStars(c, v, k);
    drawCity(c, v, k, cityReveal(v));
    drawHole(c, v, k, 0);
    // the diameter: drawn in beat 11, it stays (becomes s12's road) until the fly-out
    drawDiameter(c, v, diameterK(v), k);
  },
  drawOverlay(c, v) {
    cityDimension(c, v, v.k * setK(v) * L.prog(v.t, T_CITY + 0.4, 0.7));
    const kl = v.k * L.enter(v.t, T_LABEL, 0.6);
    if (kl <= 0.002) return;
    labelBacking(c, 60, 360, 460, 210, 0.42 * kl);
    // rule at y ≈ 382 (house position), the short unit line clears the city's ring road
    L.bigLabel(c, { x: 96, y: 500, big: '6 km', small: '3.7 miles', k: kl, accent: ACCENT, size: 100 });
  },
});
