// Beat 18 — "In about five billion years, | it will begin to swell into a red giant, | then shrink to a white dwarf
// about the size of Earth."
// Orbit view (env: future clock, the star at SUN). Mercury's and Venus's orbits appear as thin rings with their
// planets; the red giant (env radius) gets a mottled, convective surface and a soft extended limb, swallowing
// Mercury, then Venus, and reaching toward Earth's orbit (which brightens). As it collapses into the white dwarf it
// sheds a planetary nebula: nested shells at many scales, so the long push-in flies THROUGH the nebula. The push lands
// on a fierce little white dwarf beside an Earth-sized disc (EARTH_GHOST). "≈ Earth-sized" holds to the end.
import * as L from '../../../../engine/runtime/lib.js';
import { AU, EARTH_GHOST, R_EARTH, SUN, filmScene } from '../camera.js';
import { T, starState } from '../env.js';
import { surface } from './s16-twist.js';
import { drawEarth } from '../../../../engine/runtime/earth.js';

const { W, H } = L;
const TAU = Math.PI * 2;
const start = (v, b) => v.tl.scenes[b].start;

// ------------------------------------------------------------------ inner planets (orbits swallowed by the giant)
const PLANETS = [
  { name: 'Mercury', a: 0.387 * AU, ang: 3.75, col: [190, 180, 170], size: 3.2 },
  { name: 'Venus', a: 0.723 * AU, ang: 5.55, col: [240, 220, 180], size: 4.2 },
];
function giantR(gt) {
  const s = starState(gt);
  return s.mode === 'giant' || s.mode === 'wd' ? s.r : 0;
}
function drawPlanets(c, v) {
  const mpp = v.cam.mpp;
  if (mpp < 2.5e7) return;
  const b = start(v, 18);
  const inK = L.ease.outCubic(L.prog(v.gt, b + 0.7, 0.7)) * L.clamp(L.invLerp(Math.log(3e7), Math.log(1.2e8), Math.log(mpp)));   // 16b: in earlier (86.0-87.0 read empty)
  if (inK <= 0.01) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  const gr = giantR(v.gt);
  c.save();
  for (const p of PLANETS) {
    // swallowed when the giant's surface passes the orbit (eased over a short window)
    const over = gr > 0 ? L.clamp((gr - p.a * 0.92) / (p.a * 0.12)) : 0;
    const k = inK * (1 - L.ease.inCubic(over));
    const rr = v.ws(p.a);
    if (k > 0.01) {
      c.strokeStyle = `rgba(215,205,235,${0.28 * k})`;
      c.lineWidth = 1.3;
      c.beginPath(); c.arc(cx, cy, Math.max(0, rr), 0, TAU); c.stroke();
    }
    // the planet: a dot that glows hot as the surface reaches it, then is gone
    const pa = p.ang + (v.gt - b) * (p.name === 'Mercury' ? 0.05 : 0.03);
    const px = cx + Math.cos(pa) * rr, py = cy + Math.sin(pa) * rr;
    const hot = Math.sin(Math.PI * L.clamp(over * 1.2));
    const dk = inK * (1 - L.clamp((over - 0.6) / 0.35));
    if (dk > 0.01) {
      L.lightBlob(c, px, py, 16 + 30 * hot, L.mix(p.col, [255, 160, 90], hot), 0.3 * dk + 0.5 * hot * inK);
      c.fillStyle = L.rgba(L.mix(p.col, [255, 200, 150], hot), dk);
      c.beginPath(); c.arc(px, py, Math.max(0, p.size * (1 - 0.5 * over)), 0, TAU); c.fill();
    }
  }
  // Earth's orbit brightens as the giant reaches toward it
  const ek = inK * L.clamp(L.invLerp(0.3 * AU, 0.85 * AU, gr)) * (1 - L.ease.inCubic(L.prog(v.gt, T.wd0, 0.6)));
  if (ek > 0.01) {
    c.strokeStyle = `rgba(150,195,255,${0.4 * ek})`;
    c.lineWidth = 1.6;
    c.beginPath(); c.arc(cx, cy, Math.max(0, v.ws(AU)), 0, TAU); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ the red giant: convection + a soft extended limb
function drawGiant(c, v) {
  const s = starState(v.gt);
  if (s.mode !== 'giant' && !(s.mode === 'wd' && s.k < 0.6)) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y), r = v.ws(s.r);
  if (r < 8) return;
  const gk = s.mode === 'giant' ? L.clamp(L.invLerp(Math.log(3e9), Math.log(3e10), Math.log(s.r))) : 1 - L.clamp(s.k / 0.6);
  if (gk <= 0.01) return;
  // soft extended atmosphere (outside the disc)
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(cx, cy, r * 0.98, cx, cy, r * 1.25);
  g.addColorStop(0, L.rgba([255, 120, 70], 0.16 * gk));
  g.addColorStop(0.35, L.rgba([230, 80, 50], 0.07 * gk));
  g.addColorStop(1, L.rgba([200, 60, 40], 0));
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r * 1.25), 0, TAU); c.arc(cx, cy, Math.max(0, r * 0.98), 0, TAU, true); c.fill();
  c.restore();
  // big convection cells, deep mottling
  surface(c, cx, cy, r, { col: [255, 140, 80], dark: [175, 55, 35], gt: v.gt, seed: 18, n: 44, cell: 0.3, mottle: 0.7, darkK: 0.45, spin: 0.012, limb: 1, alpha: gk });
  // a slow ruddy limb wobble: a few soft lobes past the edge
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + L.noise1(v.gt * 0.2 + i, 9) * 0.6;
    const lr = r * (0.18 + 0.08 * L.noise1(v.gt * 0.4 + i * 3, 4));
    L.lightBlob(c, cx + Math.cos(a) * r * 1.0, cy + Math.sin(a) * r * 1.0, lr, [255, 110, 60], 0.12 * gk);
  }
  c.restore();
}

// ------------------------------------------------------------------ the planetary nebula: nested shells at many scales
const SHELLS = (() => {
  const r = L.rng(1818), out = [];
  let R = 2.6e11;
  for (let i = 0; i < 10; i++) {
    const knots = [];
    for (let k = 0; k < 34; k++) knots.push({ a: r() * TAU, f: 0.86 + r() * 0.16, s: 0.06 + r() * 0.1, b: 0.5 + r() * 0.5 });
    out.push({ R, rot: r() * TAU, asp: 0.74 + r() * 0.2, p: [r() * TAU, r() * TAU, r() * TAU], hue: r(), lag: i === 0 ? 0 : 0.15 + r() * 0.3, knots });
    R *= 0.34 + r() * 0.06;
  }
  return out;
})();
const TEAL = [110, 215, 210], ROSE = [255, 105, 125], GOLD = [255, 190, 120];
// periodic wobble (no seam): a few harmonics with per-shell phases
const wob = (sh, a, gt) => 1 + 0.05 * Math.sin(3 * a + sh.p[0]) + 0.03 * Math.sin(5 * a + sh.p[1] + gt * 0.05) + 0.018 * Math.sin(9 * a + sh.p[2]);
function ellPt(cx, cy, Rpx, sh, a, f, gt) {
  const w = wob(sh, a, gt) * f;
  const x = Math.cos(a) * Rpx * w, y = Math.sin(a) * Rpx * w * sh.asp;
  return [cx + x * Math.cos(sh.rot) - y * Math.sin(sh.rot), cy + x * Math.sin(sh.rot) + y * Math.cos(sh.rot)];
}
function drawNebula(c, v) {
  const gt = v.gt;
  if (gt < T.wd0 - 0.05) return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y);
  const age = gt - T.wd0;
  c.save();
  c.globalCompositeOperation = 'lighter';
  SHELLS.forEach((sh, i) => {
    // the outer shell is pushed off the shrinking giant; inner shells are already out there when the camera arrives
    const grow = i === 0 ? 0.6 + 0.4 * L.ease.outCubic(L.clamp(age / 2.2)) : 1;
    const R = sh.R * grow * (1 + 0.02 * age);
    const Rpx = v.ws(R);
    if (Rpx < 60 || Rpx > 4200) return;
    const vis = L.clamp(L.invLerp(90, 280, Rpx)) * (1 - L.clamp(L.invLerp(1500, 3800, Rpx)));
    const tk = L.ease.outCubic(L.clamp((age - sh.lag) / 0.9));
    const a = vis * tk * (i === 0 ? 1 : 0.85);
    if (a <= 0.01) return;
    const inner = L.mix(TEAL, GOLD, sh.hue * 0.35), rim = L.mix(ROSE, [255, 150, 120], sh.hue);
    // soft annular glow (teal inside, rose at the rim)
    const g = c.createRadialGradient(cx, cy, Rpx * 0.25, cx, cy, Rpx * 1.12);
    g.addColorStop(0, L.rgba(inner, 0));
    g.addColorStop(0.6, L.rgba(inner, 0.08 * a));
    g.addColorStop(0.86, L.rgba(L.mix(inner, rim, 0.5), 0.13 * a));
    g.addColorStop(1, L.rgba(rim, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, Math.max(0, Rpx * 1.12), 0, TAU); c.fill();
    // clumpy knots along the shell (soft blobs), brighter on one side
    for (const k of sh.knots) {
      const [x, y] = ellPt(cx, cy, Rpx, sh, k.a, k.f, gt);
      const rr = Rpx * k.s;
      if (x + rr < 0 || x - rr > W || y + rr < 0 || y - rr > H) continue;
      const side = 0.55 + 0.45 * Math.cos(k.a - sh.rot - 0.6);
      L.lightBlob(c, x, y, rr, k.f > 0.97 ? rim : inner, 0.2 * a * side * k.b);
    }
    // two fine filaments
    c.lineWidth = Math.max(1, Rpx * 0.0025);
    for (const [f, al] of [[1.0, 0.16], [0.93, 0.08]]) {
      c.strokeStyle = L.rgba(rim, al * a);
      c.beginPath();
      for (let j = 0; j <= 96; j++) {
        const [x, y] = ellPt(cx, cy, Rpx, sh, (j / 96) * TAU, f, gt);
        if (j) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
    }
  });
  c.restore();
}

// ------------------------------------------------------------------ the white dwarf (fierce) + the Earth-sized disc
function drawWhiteDwarf(c, v) {
  const s = starState(v.gt);
  if (s.mode !== 'wd') return;
  const cx = v.wx(SUN.x), cy = v.wy(SUN.y), r = v.ws(s.r);
  const k = L.clamp((s.k - 0.5) / 0.4);
  if (k <= 0.01 || cx < -400 || cx > W + 400 || cy < -400 || cy > H + 400) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const rr = Math.max(r, 3);
  // a hard, cold-white corona and a thin crisp rim
  L.lightBlob(c, cx, cy, Math.max(rr * 2.4, 50), [200, 220, 255], 0.35 * k);
  if (r > 20) {
    // shape the (saturated) disc: a cool limb, a hot core, then a crisp rim
    c.globalCompositeOperation = 'source-over';
    const g = c.createRadialGradient(cx - r * 0.18, cy - r * 0.2, r * 0.05, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, L.rgba([215, 228, 252], 0.18 * k));
    g.addColorStop(0.88, L.rgba([170, 192, 240], 0.42 * k));
    g.addColorStop(1, L.rgba([140, 165, 230], 0.6 * k));
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
    // very fine, cool surface shimmer with gentle limb darkening
    surface(c, cx, cy, r, { col: [222, 232, 255], dark: [120, 145, 205], gt: v.gt, seed: 19, n: 240, cell: 0.045, mottle: 0.12, darkK: 0.9, spin: 0.01, limb: 0.6, alpha: k });
    c.globalCompositeOperation = 'lighter';
    L.lightBlob(c, cx - r * 0.15, cy - r * 0.18, r * 0.6, [255, 255, 255], 0.18 * k);
    c.strokeStyle = L.rgba([245, 250, 255], 0.55 * k);
    c.lineWidth = Math.max(1.5, r * 0.008);
    c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.stroke();
  }
  // faint 4-point glint while it is small and fierce
  const gl = k * (1 - L.clamp(L.invLerp(20, 120, r)));
  if (gl > 0.01) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const len = 70 + 30 * Math.sin(v.gt * 3);
      const g = c.createLinearGradient(cx - dx * len, cy - dy * len, cx + dx * len, cy + dy * len);
      g.addColorStop(0, 'rgba(230,240,255,0)'); g.addColorStop(0.5, `rgba(230,240,255,${0.7 * gl})`); g.addColorStop(1, 'rgba(230,240,255,0)');
      c.strokeStyle = g; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx - dx * len, cy - dy * len); c.lineTo(cx + dx * len, cy + dy * len); c.stroke();
    }
  }
  c.restore();
}

function earthK(v) { return L.ease.outCubic(L.prog(v.gt, start(v, 18) + 6.55, 0.9)); }
function drawEarthGhost(c, v) {
  const k = earthK(v);
  if (k <= 0.01) return;
  const cx = v.wx(EARTH_GHOST.x), cy = v.wy(EARTH_GHOST.y), r = v.ws(R_EARTH);
  if (r < 2 || cx + r < 0 || cx - r > W || cy + r < 0 || cy - r > H) return;
  // the real Earth (earth.js), Africa and Europe facing us, lit by the white dwarf (toward SUN, upper-left)
  const sx = v.wx(SUN.x), sy = v.wy(SUN.y);
  const dl = Math.hypot(sx - cx, sy - cy) || 1, ux = (sx - cx) / dl, uy = (sy - cy) / dl;
  c.save();
  c.globalAlpha = k;
  L.lightBlob(c, cx, cy, r * 1.25, [90, 150, 255], 0.1);
  drawEarth(c, { cx, cy, r, lon0: 18, lat0: 18, rot: (v.gt - 86) * 1.5, tilt: 0, style: 'day', sun: [ux * 0.9, -uy * 0.9, 0.45], lights: 0.6 });
  c.restore();
}

export default filmScene({
  beat: 18,
  chapter: { num: '18', title: 'The real ending', sub: 'red giant, then white dwarf' },
  captions: true,
  layer: 2,
  cues() {
    // beat starts 79.64: P1 0.15–1.82, P2 2.42–4.65 (giant 82.1–84.3 = rel 2.46–4.66), P3 5.25–8.0, "Earth" ≈ rel 7.5
    return [
      { t: 0.1, name: 'whoosh', gain: 0.22, pitch: 0.7 },      // out to the orbit
      { t: 0.9, name: 'shimmer', gain: 0.14, pitch: 0.8 },     // inner orbits appear (16b: earlier)
      { t: 2.45, name: 'swell', gain: 0.4, pitch: 0.6 },       // the red giant swells
      { t: 2.6, name: 'deep', gain: 0.32, pitch: 0.7 },
      { t: 3.95, name: 'tick', gain: 0.22, pitch: 0.7 },       // Mercury swallowed
      { t: 4.3, name: 'tick', gain: 0.22, pitch: 0.6 },        // Venus swallowed
      { t: 5.15, name: 'dive', gain: 0.3, pitch: 0.8 },        // the long push-in
      { t: 5.3, name: 'bloom', gain: 0.32, pitch: 0.7 },       // the nebula is shed
      { t: 6.9, name: 'shimmer', gain: 0.3, pitch: 1.4 },      // the white dwarf lands
      { t: 7.4, name: 'impact', gain: 0.3, pitch: 1.0 },       // "≈ Earth-sized"
      { t: 9.5, name: 'swell', gain: 0.16, pitch: 1.2 },       // calm final hold
    ];
  },
  drawWorld(c, v) {
    if (v.gt < start(v, 18) - 0.5) return;
    drawPlanets(c, v);
    drawGiant(c, v);
    drawNebula(c, v);
    drawWhiteDwarf(c, v);
    drawEarthGhost(c, v);
  },
  drawOverlay(c, v) {
    const t = v.t;
    // "Red giant" during the swell (out before the push)
    const gk = L.enter(t, 3.85, 0.55) * (1 - L.ease.inCubic(L.prog(t, 5.35, 0.3))) * v.k;
    if (gk > 0.01) {
      c.save();
      c.globalAlpha = L.clamp(gk * 1.4);
      c.translate(290, 470); c.scale(4.2, 1);
      const bg = c.createRadialGradient(0, 0, 0, 0, 0, 62);
      bg.addColorStop(0, 'rgba(8,4,10,0.42)'); bg.addColorStop(0.6, 'rgba(8,4,10,0.26)'); bg.addColorStop(1, 'rgba(8,4,10,0)');
      c.fillStyle = bg; c.fillRect(-62, -62, 124, 124);
      c.restore();
    }
    L.bigLabel(c, { x: 80, y: 430, big: 'Red giant', small: 'about 200 times wider', k: gk, accent: v.accent, size: 84 });
    // the Earth tag + the final label
    const ek = earthK(v) * L.enter(t, 7.0, 0.5) * v.k;
    if (ek > 0.01) {
      const cx = v.wx(EARTH_GHOST.x), cy = v.wy(EARTH_GHOST.y), r = v.ws(R_EARTH);
      c.save();
      c.globalAlpha = ek;
      c.font = L.font(24, 700, L.FONT.body);
      c.fillStyle = 'rgba(205,220,240,0.9)';
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
      L.trackedText(c, 'EARTH', cx, cy - r - 22, 4, 'center');
      c.restore();
    }
    const lk = L.enter(t, 7.3, 0.6) * v.k;
    L.bigLabel(c, { x: 70, y: 1165, big: '≈ Earth-sized', small: 'the Sun as a white dwarf', k: lk, accent: v.accent, size: 84 });
  },
});
