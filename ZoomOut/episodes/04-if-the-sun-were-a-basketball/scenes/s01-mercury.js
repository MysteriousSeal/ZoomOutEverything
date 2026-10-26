// Beat 1 — Mercury: a grain of sand, 10 m from the basketball Sun.
// Also exports the shared "planet beat" kit used by s02-venus.js and s03-earth.js:
//   planetScene(cfg) → a scene object (orbit ring + radial arm + body marker + magnifier lens + label)
//   sphere(), sandGrain(), peppercorn(), ruler() → lens content renderers (screen px).
// World: top-down metres, the Sun at the origin (camera.js). Lens + label are screen-space overlays.
import * as L from '../../../../engine/runtime/lib.js';
import { PLANETS, pos } from '../camera.js';
import { orbitRing, globeK, ACCENT } from '../env.js';
import { labelScrim } from './s05-mars.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const WARM = [255, 225, 190];
const HOT = [255, 236, 200];

// ------------------------------------------------------------------ lens content renderers (screen px)

/** Soft contact shadow under an object lit from angle `la` (radians, screen). */
function contactShadow(c, x, y, r, la, a = 0.55) {
  const sx = x - Math.cos(la) * r * 0.32, sy = y - Math.sin(la) * r * 0.32 + r * 0.18;
  const g = c.createRadialGradient(sx, sy, 0, sx, sy, r * 1.35);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(0.55, `rgba(0,0,0,${a * 0.45})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(sx, sy, r * 1.35, r * 1.05, 0, 0, TAU); c.fill();
}

/**
 * Shaded sphere lit from screen angle `la`.
 * base: [lit colour, mid colour, dark colour]; detail(c, x, y, r) draws surface features (already clipped).
 * night: how dark the unlit side gets (0..1). atmo: optional rim colour.
 */
export function sphere(c, x, y, r, la, base, detail, { night = 0.82, atmo = null, spec = 0 } = {}) {
  if (r <= 0.5) return;
  const lx = Math.cos(la), ly = Math.sin(la);
  contactShadow(c, x, y, r, la, 0.5);
  c.save();
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.clip();
  const g = c.createRadialGradient(x + lx * r * 0.45, y + ly * r * 0.45, r * 0.05, x, y, r * 1.08);
  g.addColorStop(0, L.rgba(base[0]));
  g.addColorStop(0.55, L.rgba(base[1]));
  g.addColorStop(1, L.rgba(base[2]));
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  detail?.(c, x, y, r);
  // terminator: a soft day/night line across the disc, plus a rounder falloff toward the night limb
  const t = c.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
  t.addColorStop(0, 'rgba(2,3,8,0)');
  t.addColorStop(0.44, 'rgba(2,3,8,0)');
  t.addColorStop(0.62, `rgba(2,3,8,${night * 0.7})`);
  t.addColorStop(0.84, `rgba(2,3,8,${night})`);
  t.addColorStop(1, `rgba(2,3,8,${night})`);
  c.fillStyle = t;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  if (spec > 0) {
    const sx = x + lx * r * 0.42 - ly * r * 0.1, sy = y + ly * r * 0.42 + lx * r * 0.1;
    const s = c.createRadialGradient(sx, sy, 0, sx, sy, r * 0.28);
    s.addColorStop(0, `rgba(255,250,240,${spec})`);
    s.addColorStop(1, 'rgba(255,250,240,0)');
    c.fillStyle = s;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.restore();
  // lit rim
  c.save();
  c.lineWidth = Math.max(1, r * 0.045);
  c.strokeStyle = atmo ? L.rgba(atmo, 0.5) : 'rgba(255,240,220,0.3)';
  c.beginPath(); c.arc(x, y, Math.max(0, r - c.lineWidth * 0.5), la - 1.0, la + 1.0); c.stroke();
  if (atmo) {
    const a = c.createRadialGradient(x, y, r * 0.92, x, y, r * 1.18);
    a.addColorStop(0, L.rgba(atmo, 0.0));
    a.addColorStop(0.35, L.rgba(atmo, 0.35));
    a.addColorStop(1, L.rgba(atmo, 0));
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = a;
    c.beginPath(); c.arc(x, y, r * 1.18, 0, TAU); c.fill();
  }
  c.restore();
}

/** Mercury-style craters (deterministic). */
export function craters(seed, n, col = [40, 38, 36]) {
  const r0 = L.rng(seed);
  const list = Array.from({ length: n }, () => {
    const a = r0() * TAU, d = Math.sqrt(r0()) * 0.95;
    return [Math.cos(a) * d, Math.sin(a) * d, 0.04 + r0() * r0() * 0.2];
  });
  return (c, x, y, r) => {
    for (const [u, w, s] of list) {
      const fz = Math.sqrt(Math.max(0, 1 - u * u - w * w));     // foreshortening toward the limb
      const ang = Math.atan2(w, u);
      c.save();
      c.translate(x + u * r, y + w * r);
      c.rotate(ang);
      c.fillStyle = L.rgba(col, 0.38);
      c.beginPath(); c.ellipse(0, 0, Math.max(0, s * r * (0.35 + 0.65 * fz)), Math.max(0, s * r), 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(235,228,215,0.22)';
      c.lineWidth = Math.max(0.6, s * r * 0.18);
      c.beginPath(); c.ellipse(0, 0, Math.max(0, s * r * (0.35 + 0.65 * fz)), Math.max(0, s * r), 0, 0.2, 2.6); c.stroke();
      c.restore();
    }
  };
}

/** A grain of quartz sand ~ `r` px radius: irregular, translucent, faceted. */
export function sandGrain(c, x, y, r, la, seed = 5) {
  const rr = L.rng(seed);
  const n = 11, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (rr() - 0.5) * 0.35;
    const d = r * (0.78 + rr() * 0.3);
    pts.push([Math.cos(a) * d * 1.18, Math.sin(a) * d * 0.9]);
  }
  const rot = 0.5;
  const P = ([u, w]) => [x + u * Math.cos(rot) - w * Math.sin(rot), y + u * Math.sin(rot) + w * Math.cos(rot)];
  contactShadow(c, x, y, r, la, 0.45);
  const lx = Math.cos(la), ly = Math.sin(la);
  c.save();
  c.beginPath();
  pts.map(P).forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.closePath();
  const g = c.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
  g.addColorStop(0, 'rgb(246,230,196)');
  g.addColorStop(0.45, 'rgb(205,176,128)');
  g.addColorStop(1, 'rgb(96,74,48)');
  c.fillStyle = g;
  c.fill();
  c.clip();
  // facets: a few lighter planes catching the light
  for (let f = 0; f < 4; f++) {
    const i = (f * 3) % n;
    const a = P(pts[i]), b = P(pts[(i + 2) % n]);
    c.fillStyle = `rgba(255,248,230,${0.1 + 0.06 * f})`;
    c.beginPath(); c.moveTo(x + lx * r * 0.15, y + ly * r * 0.15); c.lineTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.closePath(); c.fill();
  }
  // inner translucency glow
  const tg = c.createRadialGradient(x - lx * r * 0.2, y - ly * r * 0.2, 0, x, y, r);
  tg.addColorStop(0, 'rgba(255,220,170,0.25)');
  tg.addColorStop(1, 'rgba(255,220,170,0)');
  c.fillStyle = tg;
  c.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
  c.restore();
  c.save();
  c.strokeStyle = 'rgba(255,245,225,0.35)';
  c.lineWidth = 1.2;
  c.lineJoin = 'round';
  c.beginPath();
  pts.map(P).forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.closePath();
  c.stroke();
  // specular glint
  const sx = x + lx * r * 0.4, sy = y + ly * r * 0.35;
  const s = c.createRadialGradient(sx, sy, 0, sx, sy, r * 0.22);
  s.addColorStop(0, 'rgba(255,255,255,0.9)');
  s.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = s;
  c.fillRect(sx - r * 0.3, sy - r * 0.3, r * 0.6, r * 0.6);
  c.restore();
}

/** A black peppercorn ~ `r` px radius: dark, wrinkled (elongated ridges of mixed size + thin creases), soft sheen. */
export function peppercorn(c, x, y, r, la, seed = 9) {
  const rr = L.rng(seed);
  const bumps = Array.from({ length: 70 }, () => [rr() * TAU, Math.sqrt(rr()) * 0.98, 0.04 + rr() * rr() * 0.12, rr() * TAU]);
  const creases = Array.from({ length: 22 }, () => {
    const a = rr() * TAU, d = Math.sqrt(rr()) * 0.85, dir = rr() * TAU, len = 0.1 + rr() * 0.16, bend = (rr() - 0.5) * 0.6;
    return [a, d, dir, len, bend];
  });
  sphere(c, x, y, r, la, [[128, 98, 72], [72, 53, 38], [26, 19, 13]], (cc) => {
    for (const [a, d, s, rot] of bumps) {
      const px = x + Math.cos(a) * d * r, py = y + Math.sin(a) * d * r;
      const fz = Math.sqrt(Math.max(0.06, 1 - d * d));
      // elongate along a random direction, then squash toward the limb (foreshortening)
      const rx = Math.max(0, s * r * 1.6), ry = Math.max(0, s * r * (0.45 + 0.55 * fz));
      const o = s * r * 0.3;
      cc.save();
      cc.translate(px, py);
      cc.rotate(rot);
      const llx = Math.cos(la - rot), lly = Math.sin(la - rot);
      cc.fillStyle = 'rgba(8,5,3,0.24)';                         // shadow side of the ridge
      cc.beginPath(); cc.ellipse(-llx * o, -lly * o, rx, ry, 0, 0, TAU); cc.fill();
      cc.fillStyle = 'rgba(190,150,112,0.1)';                   // lit crest
      cc.beginPath(); cc.ellipse(llx * o * 0.6, lly * o * 0.6, rx * 0.8, ry * 0.75, 0, 0, TAU); cc.fill();
      cc.fillStyle = 'rgba(66,48,34,0.16)';                      // ridge body
      cc.beginPath(); cc.ellipse(0, 0, rx * 0.7, ry * 0.65, 0, 0, TAU); cc.fill();
      cc.restore();
    }
    // thin dark creases between the ridges
    cc.lineCap = 'round';
    const lx = Math.cos(la), ly = Math.sin(la);
    for (const [a, d, dir, len, bend] of creases) {
      const px = x + Math.cos(a) * d * r, py = y + Math.sin(a) * d * r;
      const hx = Math.cos(dir) * len * r * 0.5, hy = Math.sin(dir) * len * r * 0.5;
      // embossed groove: a soft dark trough with a faint lit lip on the far (light-facing) side
      for (const [off, col, w] of [[0, 'rgba(12,8,5,0.3)', 0.05], [0.03, 'rgba(200,160,120,0.08)', 0.025]]) {
        const ox = lx * off * r, oy = ly * off * r;
        cc.strokeStyle = col;
        cc.lineWidth = Math.max(1, r * w);
        cc.beginPath();
        cc.moveTo(px - hx + ox, py - hy + oy);
        cc.quadraticCurveTo(px - hy * bend * 2 + ox, py + hx * bend * 2 + oy, px + hx + ox, py + hy + oy);
        cc.stroke();
      }
    }
  }, { night: 0.62, spec: 0.3 });
}

/** Tiny caption under a lens object. */
export function tag(c, text, x, y, k = 1, lensC = null) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.font = L.font(22, 700, L.FONT.body);
  c.fillStyle = 'rgba(232,226,216,0.92)';
  c.shadowColor = 'rgba(0,0,0,0.7)';
  c.shadowBlur = 6;
  c.textBaseline = 'top';
  if (lensC) {
    // keep the tag inside the lens: clamp x to the chord at the tag's lower edge, with a margin
    const [lx, ly, R] = lensC;
    const hw = (c.measureText(text).width + text.length * 1.5) / 2;
    const dy = Math.max(Math.abs(y - ly), Math.abs(y + 24 - ly));
    const half = Math.sqrt(Math.max(0, R * R - dy * dy)) - 14;
    x = L.clamp(x, lx - half + hw, lx + half - hw);
  }
  L.trackedText(c, text, x, y + (1 - L.clamp(k)) * 6, 1.5, 'center');
  c.restore();
}

/** Millimetre ruler (no text): `mm` mm long at `pxPerMm`, centred at x, baseline y. */
export function ruler(c, x, y, mm, pxPerMm, k = 1, minor = 0.5, tag = '') {
  const w = mm * pxPerMm;
  const x0 = x - w / 2;
  c.save();
  c.globalAlpha *= k;
  c.strokeStyle = 'rgba(235,228,220,0.7)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(x0, y); c.lineTo(x0 + w * L.ease.outCubic(k), y);
  const n = Math.round(mm / minor);
  for (let i = 0; i <= n; i++) {
    const tx = x0 + i * minor * pxPerMm;
    if (tx > x0 + w * L.ease.outCubic(k) + 0.5) break;
    const major = Math.abs((i * minor) % 1) < 1e-6;
    c.moveTo(tx, y); c.lineTo(tx, y - (major ? 11 : 6));
  }
  c.moveTo(x0 + w, y); c.lineTo(x0 + w, y - 11 * (k >= 1 ? 1 : 0));
  c.stroke();
  if (tag) {
    c.globalAlpha *= L.clamp(k * 2 - 1);
    c.font = L.font(22, 600, L.FONT.body);
    c.fillStyle = 'rgba(235,228,220,0.8)';
    c.textBaseline = 'top';
    L.trackedText(c, tag, x, y + 8, 2, 'center');
  }
  c.restore();
}

// ------------------------------------------------------------------ lens

/** Magnifier lens frame + clipped content. s = open scale (0..1+), contents(c, cx, cy, R). */
function lens(c, cx, cy, R, s, contents, alpha = 1) {
  if (s <= 0.01 || alpha <= 0) return;
  const r = R * s;
  c.save();
  c.globalAlpha *= alpha;
  // drop shadow + warm outer halo
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 40;
  c.shadowOffsetY = 10;
  c.fillStyle = '#0b0c10';
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.fill();
  c.restore();
  // backdrop: a spot-lit dark surface with a faint millimetre grid
  c.save();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
  const bg = c.createRadialGradient(cx - R * 0.2, cy - R * 0.35, R * 0.1, cx, cy, R * 1.15);
  bg.addColorStop(0, '#2a2622');
  bg.addColorStop(0.6, '#16151a');
  bg.addColorStop(1, '#08090d');
  c.fillStyle = bg;
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.translate(cx, cy);
  c.scale(s, s);
  c.translate(-cx, -cy);
  contents(c, cx, cy, R);
  c.restore();
  // inner vignette (lens depth)
  c.save();
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.clip();
  const vg = c.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = vg;
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
  // glass glare
  const gg = c.createLinearGradient(cx - r, cy - r, cx + r * 0.2, cy + r * 0.2);
  gg.addColorStop(0, 'rgba(255,255,255,0.10)');
  gg.addColorStop(0.45, 'rgba(255,255,255,0.0)');
  c.fillStyle = gg;
  c.beginPath(); c.ellipse(cx - r * 0.25, cy - r * 0.45, r * 0.75, r * 0.38, -0.5, 0, TAU); c.fill();
  c.restore();
  // rims
  c.lineWidth = 3;
  c.strokeStyle = L.rgba(ACCENT, 0.95);
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, TAU); c.stroke();
  c.lineWidth = 1;
  c.strokeStyle = 'rgba(255,240,225,0.25)';
  c.beginPath(); c.arc(cx, cy, Math.max(0, r - 7), 0, TAU); c.stroke();
  c.strokeStyle = L.rgba(ACCENT, 0.3);
  c.beginPath(); c.arc(cx, cy, Math.max(0, r + 8), -2.2, -0.6); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the planet beat

/** Screen position of a world point. */
const scr = (v, p) => [v.wx(p.x), v.wy(p.y)];

/**
 * cfg: { beat, name, chapter, cuesExtra?, T: {arm, armDur, sweep, sweepDur, lens, label},
 *        lens: {x, y, R}, label: {x, y, align, big, small},
 *        contents(c, cx, cy, R, light, t, v) }
 */
// House label position shared with beats 4–7 (top-left block under the chapter header).
const HOUSE_LABEL = { x: 80, y: 480 };
// Screen box the house label + its scrim occupy; a lens must stay clear of it.
const LABEL_BOX = { x0: 40, x1: 640, y0: 300, y1: 560 };

export function planetScene(cfg) {
  // every planet beat uses the house label position (callers may still set big/small/size)
  cfg = { ...cfg, label: { ...cfg.label, ...HOUSE_LABEL, align: 'left' } };
  {
    const { x, y, R } = cfg.lens;
    const hits = x - R < LABEL_BOX.x1 && x + R > LABEL_BOX.x0 && y - R < LABEL_BOX.y1 && y + R > LABEL_BOX.y0;
    if (hits) cfg = { ...cfg, lens: { ...cfg.lens, x: L.W - 260, y: Math.max(y, 540) } };
  }
  const [orbitR, angDeg, diam] = PLANETS[cfg.name];
  const P = pos(cfg.name);
  const T = cfg.T;
  const ringK = (t) => L.ease.inOutCubic(L.prog(t, T.sweep, T.sweepDur));
  const armK = (t) => L.ease.inOutCubic(L.prog(t, T.arm, T.armDur));
  // planet "arrives": ping when the arm reaches it
  const pingT = T.arm + T.armDur;

  /** active-ness of this ring: 1 during the beat, eases to 0 just after. */
  const hot = (t, d) => L.clamp(L.prog(t, -0.2, 0.3)) * (1 - L.ease.inOutCubic(L.prog(t, d - 0.1, 0.8)));

  function drawWorld(ctx, v) {
    const t = v.t, d = v.d;
    if (t < T.arm - 0.05) return;
    const fade = 1 - globeK(v);
    if (fade <= 0) return;
    const mpp = v.cam.mpp;
    // hand the body over to a macro scene (e.g. the Moon beat) when we're zoomed far in
    const macro = L.clamp(L.invLerp(0.0025, 0.006, mpp));
    const rr = orbitR / mpp;
    const sx = v.wx(0), sy = v.wy(0);
    const [px, py] = scr(v, P);
    const h = hot(t, d);
    const rk = ringK(t);
    const a0 = angDeg;
    ctx.save();
    ctx.globalAlpha = fade * macro;
    // ---- orbit ring: soft glow underlay + crisp line (accent while hot, faint warm after)
    if (rk > 0 && rr > 1 && rr < 40000) {
      const col = L.mix(WARM, ACCENT, h);
      const alpha = L.lerp(0.2, 0.85, h);
      ctx.save();
      ctx.strokeStyle = L.rgba(col, 0.1 * h);
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(sx, sy, rr, a0 * DEG, (a0 + 360 * rk) * DEG); ctx.stroke();
      ctx.restore();
      orbitRing(ctx, v, orbitR, rk, a0, alpha, col);
      // the sweep head: a comet of light with a fading tail
      if (rk < 1 && rk > 0) {
        const ah = (a0 + 360 * rk) * DEG;
        for (let i = 0; i < 14; i++) {
          const a1 = ah - (i + 1) * 0.035, a2 = ah - i * 0.035;
          ctx.strokeStyle = L.rgba(HOT, 0.75 * (1 - i / 14) * h);
          ctx.lineWidth = 3.2 - i * 0.15;
          ctx.beginPath(); ctx.arc(sx, sy, rr, a1, a2); ctx.stroke();
        }
        const hx = sx + Math.cos(ah) * rr, hy = sy + Math.sin(ah) * rr;
        L.lightBlob(ctx, hx, hy, 26, ACCENT, 0.7 * h);
        L.lightBlob(ctx, hx, hy, 8, HOT, 0.9 * h);
      }
    }
    // ---- radial arm: Sun → planet, dashed, the distance itself
    const ak = armK(t);
    const armA = ak * (1 - L.ease.inCubic(L.prog(t, d - 0.25, 0.5)));
    if (ak > 0 && armA > 0 && rr > 4) {
      const ex = L.lerp(sx, px, L.ease.outCubic(ak)), ey = L.lerp(sy, py, L.ease.outCubic(ak));
      const len = Math.hypot(px - sx, py - sy);
      const ux = (px - sx) / len, uy = (py - sy) / len;
      const st = Math.min(len * 0.3, Math.max(12, 0.2 / mpp));   // start just outside the Sun's glow
      ctx.save();
      ctx.strokeStyle = L.rgba(ACCENT, 0.6 * armA);
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 9]);
      ctx.lineDashOffset = -v.gt * 14;
      ctx.beginPath(); ctx.moveTo(sx + ux * st, sy + uy * st); ctx.lineTo(ex - ux * Math.min(16, len * ak), ey - uy * Math.min(16, len * ak)); ctx.stroke();
      ctx.setLineDash([]);
      if (ak < 1) L.lightBlob(ctx, ex, ey, 22, ACCENT, 0.8 * armA);
      ctx.restore();
    }
    // ---- the body: true size, never smaller than a visible glint
    const onScreen = px > -60 && px < L.W + 60 && py > -60 && py < L.H + 60;
    if (onScreen) {
      const trueR = (diam / 2) / mpp;
      const pk = L.clamp((t - pingT) / 0.12);
      const ping = L.prog(t, pingT, 0.9);
      const lit = Math.max(pk, L.clamp(1 - Math.abs(t - pingT + 0.1) * 3));
      if (lit > 0) {
        const a = lit * L.lerp(0.55, 1, h);
        L.lightBlob(ctx, px, py, 18 + 10 * h, cfg.glow ?? WARM, 0.45 * a);
        ctx.fillStyle = L.rgba(cfg.dot ?? [255, 245, 230], a);
        ctx.beginPath(); ctx.arc(px, py, Math.max(trueR, L.lerp(1.6, 2.6, h)), 0, TAU); ctx.fill();
        // reticle (only while this beat is hot)
        if (h > 0.01) {
          const rs = 15 + 6 * (1 - L.ease.outBack(L.clamp(ping * 2.2), 2.5));
          ctx.strokeStyle = L.rgba(ACCENT, 0.9 * h * pk);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px, py, Math.max(0, rs), 0, TAU); ctx.stroke();
          // expanding ping wave
          if (ping > 0 && ping < 1) {
            ctx.strokeStyle = L.rgba(ACCENT, 0.6 * (1 - ping) * h);
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(px, py, Math.max(0, 15 + 60 * L.ease.outCubic(ping)), 0, TAU); ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  function lensOpen(t, d) {
    const o = L.ease.outBack(L.prog(t, T.lens + 0.22, 0.6), 1.6);
    const cl = L.ease.inCubic(L.prog(t, d - 0.18, 0.3));
    return Math.max(0, o * (1 - cl));
  }

  function drawOverlay(ctx, v) {
    const t = v.t, d = v.d;
    const [px, py] = scr(v, P);
    const [sx, sy] = [v.wx(0), v.wy(0)];
    const { R } = cfg.lens;
    // the lens floats very gently
    const cx = cfg.lens.x + L.noise1(v.gt * 0.4, 31) * 3, cy = cfg.lens.y + L.noise1(v.gt * 0.35, 32) * 3;
    // leader: planet → lens edge
    const lk = L.prog(t, T.lens, 0.35) * (1 - L.prog(t, d - 0.2, 0.25));
    const dx = px - cx, dy = py - cy, dl = Math.hypot(dx, dy) || 1;
    const s = lensOpen(t, d);
    const ex = cx + (dx / dl) * R * Math.max(0.25, Math.min(1, s)), ey = cy + (dy / dl) * R * Math.max(0.25, Math.min(1, s));
    const bx = px - (dx / dl) * 17, by = py - (dy / dl) * 17;    // start on the reticle
    if (lk > 0) {
      ctx.save();
      ctx.globalAlpha *= v.k;
      ctx.strokeStyle = L.rgba(ACCENT, 0.85);
      ctx.lineWidth = 2;
      const e = L.ease.outCubic(lk);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(L.lerp(bx, ex, e), L.lerp(by, ey, e)); ctx.stroke();
      ctx.restore();
    }
    // lens: light comes from the Sun's on-screen direction
    const light = Math.atan2(sy - py, sx - px);
    lens(ctx, cx, cy, R, s, (c, x, y, rad) => {
      const ck = L.ease.outCubic(L.prog(t, T.lens + 0.35, 0.7));
      cfg.contents(c, x, y, rad, light, t, v, ck);
    }, v.k);
    // label: house position, on the same soft dark scrim as beats 5–7 so ring lines don't fight the type
    const lab = cfg.label;
    const k = L.enter(t, T.label, 0.7) * v.k * (1 - L.ease.inCubic(L.prog(t, d - 0.15, 0.3)));
    labelScrim(ctx, k);
    // beats 1–3 sit on busy orbit rings (Earth's active ring crosses the number), so add a tighter core
    if (k > 0) {
      ctx.save();
      ctx.translate(300, 450);
      ctx.scale(1, 0.36);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 330);
      g.addColorStop(0, `rgba(0,0,0,${0.5 * L.clamp(k)})`);
      g.addColorStop(0.65, `rgba(0,0,0,${0.32 * L.clamp(k)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-330, -330, 660, 660);
      ctx.restore();
    }
    L.bigLabel(ctx, { x: lab.x, y: lab.y, big: lab.big, small: lab.small, k, accent: v.accent, align: lab.align ?? 'left', size: lab.size ?? 120 });
  }

  return {
    beat: cfg.beat,
    chapter: cfg.chapter,
    captions: true,
    layer: 1,
    cues(d) {
      return [
        { t: T.arm + 0.02, name: 'swish', gain: 0.16, pitch: 1.5 },
        { t: pingT, name: 'ping', gain: 0.3, pitch: cfg.pitch ?? 1 },
        { t: T.sweep + 0.05, name: 'shimmer', gain: 0.14, pitch: 0.9 },
        { t: T.lens + 0.22, name: 'bloom', gain: 0.28, pitch: 1.1 },
        { t: T.label + 0.05, name: 'tick', gain: 0.22, pitch: 1.2 },
        ...(cfg.cuesExtra ?? []),
      ];
    },
    drawWorld,
    drawOverlay,
  };
}

// ------------------------------------------------------------------ Mercury
const MM = 136;                       // lens scale: px per millimetre
const merc = craters(101, 26);

export default planetScene({
  beat: 1,
  name: 'mercury',
  chapter: { num: '01', title: 'Mercury', sub: 'The closest planet' },
  pitch: 1.25,
  T: { arm: 0.25, armDur: 0.6, sweep: 0.75, sweepDur: 1.2, lens: 1.2, label: 2.15 },
  lens: { x: 820, y: 500, R: 170 },
  label: { x: 80, y: 480, big: '0.84 mm', small: '10 m · 33 ft from the Sun' },
  dot: [215, 210, 205],
  contents(c, cx, cy, R, light, t, v, ck) {
    const y = cy - 27;
    const mR = 0.84 / 2 * MM;
    const gx = cx + 70, px = cx - 63;
    // planet slides in first, the grain a beat later (overlapping action)
    const k1 = L.ease.outBack(L.prog(t, 1.5, 0.55), 1.4), k2 = L.ease.outBack(L.prog(t, 1.65, 0.55), 1.4);
    c.save();
    c.globalAlpha *= L.clamp(k1 * 1.5);
    sphere(c, px - (1 - k1) * 30, y, mR, light, [[205, 198, 190], [128, 122, 116], [52, 50, 48]], merc);
    c.restore();
    c.save();
    c.globalAlpha *= L.clamp(k2 * 1.5);
    sandGrain(c, gx + (1 - k2) * 30, y + 4, 0.36 * MM, light, 12);
    c.restore();
    tag(c, 'MERCURY', px, y + 75, k1, [cx, cy, R]);
    tag(c, 'SAND', gx, y + 75, k2, [cx, cy, R]);
    ruler(c, cx, cy + 117, 1, MM, ck, 0.1, '1 MM');
  },
});
