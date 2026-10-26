// Beat 11 — "On a classroom globe, that's barely a centimeter above the surface."
// The camera pulls back from the ISS to the whole Earth. On top of env's flat disc we draw a real globe
// (ocean, softly lit continents in orthographic projection, slowly rotating, a soft terminator, limb haze)
// and the atmosphere as a thin glowing skin. While the voice says "classroom globe" the planet gains a
// satin meridian ring and a stand: it *becomes* the classroom globe (30 cm across). A magnifier on the top
// of the limb shows the whole climb (air, Kármán line, ISS orbit) squeezed into a ~1 cm gap.
// Exports drawGlobe / drawLoupe for s12, which holds the same picture.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, ALT } from '../camera.js';
import { drawKarman } from './s08-karman.js';
import { drawOrbit, drawStation } from './s10-iss.js';
import { drawEarth, geoPath } from '../../../../engine/runtime/earth.js';
import { viewOf, drawPlanet, drawEarthIn, t11Of } from '../planet.js';

const { W, H } = L;
const ACC = [150, 170, 255];
const SKIN = [125, 185, 255];
export { t11Of };
const TILT = 23.4 * Math.PI / 180;  // axis lean: the north pole projects 23.4° right of up (planet.js ORIENT)
const STAND = [1.05, 0.95];         // ring + stand morph in (beat-11 time): sweeps in on the end of "globe"
const DIM = 1.85;                   // 30 cm dimension
const LOUPE = 2.1;                  // magnifier opens
const LABEL = 2.4;

/** Globe visibility vs zoom (0 at the ISS view, 1 once the planet's curve shows): drives the glowing skin. */
export const globeK = (mpp) => L.clamp(L.invLerp(Math.log(950), Math.log(1750), Math.log(mpp)));
/** The planet becomes the classroom globe while the stand sweeps in (beat-11 time). */
export const classK = (v) => L.ease.inOutCubic(L.prog(v.gt - t11Of(v), STAND[0] - 0.15, STAND[1] + 0.35));

const GLOBE_OCEAN = [52, 118, 182];
/** Classroom-globe finish on top of the real Earth: printed-map colours, graticule, varnish. a = 0..1. */
function drawClassroom(c, v, a, rect) {
  if (a <= 0) return;
  const view = viewOf(v);
  const { cx, cy, r } = view;
  const o = { ...view, style: 'day', atmosphere: false, ocean: GLOBE_OCEAN, relief: 1.5, coast: [24, 52, 84], alpha: a, maxPixels: 7e5 };
  if (rect) drawEarthIn(c, o, rect); else drawEarth(c, o);
  c.save();
  c.globalAlpha *= a;
  c.beginPath(); c.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); c.clip();
  // graticule every 15°, equator a touch stronger
  c.lineWidth = Math.max(0.8, r * 0.0024);
  for (let lat = -75; lat <= 75; lat += 15) {
    c.strokeStyle = lat === 0 ? 'rgba(255,240,200,0.5)' : 'rgba(235,242,255,0.22)';
    c.beginPath(); geoPath(c, view, Array.from({ length: 73 }, (_, i) => [lat, -180 + i * 5]), false, 3); c.stroke();
  }
  c.strokeStyle = 'rgba(235,242,255,0.22)';
  for (let lon = -180; lon < 180; lon += 15) {
    c.beginPath(); geoPath(c, view, Array.from({ length: 33 }, (_, i) => [-80 + i * 5, lon]), false, 3); c.stroke();
  }
  // sphere shading + varnish: soft falloff to the lower right, a satin highlight upper left, a dark rim
  const sh = c.createRadialGradient(cx - r * 0.35, cy - r * 0.38, r * 0.1, cx, cy, r * 1.02);
  sh.addColorStop(0, 'rgba(255,255,255,0.10)');
  sh.addColorStop(0.55, 'rgba(0,0,0,0)');
  sh.addColorStop(0.88, 'rgba(4,8,20,0.28)');
  sh.addColorStop(1, 'rgba(4,8,20,0.55)');
  c.fillStyle = sh;
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.restore();
  L.lightBlob(c, cx - r * 0.42, cy - r * 0.45, r * 0.28, [255, 255, 255], 0.22 * a);
  L.lightBlob(c, cx - r * 0.45, cy - r * 0.48, r * 0.07, [255, 255, 255], 0.35 * a);
}

/** The globe for any view (main view: env already draws the real planet; the magnifier passes `rect` and gets
 *  the planet too): classroom finish + the glowing skin (~100 km, true scale). */
export function drawGlobe(c, v, pulse = 0, rect = null) {
  const gk = globeK(v.cam.mpp * (v.loupeScale ?? 1));
  const cx = v.wx(0), cy = v.wy(R_EARTH), r = v.ws(R_EARTH);
  if (cy - r > H + 50) return;
  if (rect) drawPlanet(c, v, { rect, glow: 0, haze: 0.5 });
  if (r > 9000 || gk <= 0) return;
  drawClassroom(c, v, classK(v), rect);
  c.save();
  c.globalAlpha *= gk;
  // the skin: a thin glowing shell, ~100 km thick (true scale)
  const th = Math.max(2, v.ws(100000));
  const sg = c.createRadialGradient(cx, cy, Math.max(0, r - 1), cx, cy, r + th * 1.6 + 4);
  sg.addColorStop(0, L.rgba(SKIN, 0.95));
  sg.addColorStop(0.35, L.rgba(SKIN, 0.55 + 0.3 * pulse));
  sg.addColorStop(1, L.rgba(SKIN, 0));
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = sg;
  c.beginPath(); c.arc(cx, cy, r + th * 1.6 + 4, 0, Math.PI * 2); c.arc(cx, cy, Math.max(0, r - 1), 0, Math.PI * 2, true); c.fill();
  if (pulse > 0) L.glow(c, SKIN, 24, () => { c.strokeStyle = L.rgba(SKIN, 0.6 * pulse); c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r + th * 0.5, 0, Math.PI * 2); c.stroke(); });
  c.restore();
  c.restore();
}

/** The classroom-globe hardware: satin meridian ring + pins + stand. k = 0..1 build-in. */
function drawStand(c, v, k) {
  if (k <= 0) return;
  const cx = v.wx(0), cy = v.wy(R_EARTH), r = v.ws(R_EARTH);
  if (r > 4000) return;
  const RR = r * 1.075, w = Math.max(2, r * 0.026);
  const aN = -Math.PI / 2 + TILT, aS = Math.PI / 2 + TILT;
  const e = L.ease.inOutCubic(L.clamp(k));
  c.save();
  c.globalAlpha *= L.clamp(k * 3);
  // ring sweeps from the north pin round the left side to the south pin
  const a1 = aN - (aN - (aS - Math.PI * 2)) * e;
  const rg = c.createLinearGradient(cx - RR, cy - RR, cx + RR * 0.2, cy + RR);
  rg.addColorStop(0, '#e6eaf2'); rg.addColorStop(0.5, '#8a93a8'); rg.addColorStop(1, '#4a5163');
  c.strokeStyle = rg;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, RR, aN, a1, true); c.stroke();
  // engraved degree ticks on the ring
  c.strokeStyle = 'rgba(30,36,50,0.55)';
  c.lineWidth = 1;
  for (let i = 1; i < 18; i++) {
    const a = aN - (Math.PI * i) / 18;
    if ((aN - a) / Math.PI > e) break;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * (RR - w * 0.45), cy + Math.sin(a) * (RR - w * 0.45));
    c.lineTo(cx + Math.cos(a) * (RR + w * 0.1), cy + Math.sin(a) * (RR + w * 0.1));
    c.stroke();
  }
  // axis pins
  for (const [a, kk] of [[aN, 1], [aS, L.clamp(e * 1.2 - 0.2)]]) {
    if (kk <= 0) continue;
    const px = cx + Math.cos(a) * RR, py = cy + Math.sin(a) * RR;
    const ix = cx + Math.cos(a) * r, iy = cy + Math.sin(a) * r;
    c.globalAlpha = L.clamp(k * 3) * kk;
    c.strokeStyle = '#c7cedc'; c.lineWidth = Math.max(1.5, w * 0.35);
    c.beginPath(); c.moveTo(px, py); c.lineTo(ix, iy); c.stroke();
    c.fillStyle = '#dfe4ee';
    c.beginPath(); c.arc(px, py, Math.max(0, w * 0.75), 0, Math.PI * 2); c.fill();
  }
  // stand: stem from the south pin down to a weighted base
  const sk = L.clamp(e * 1.6 - 0.6);
  if (sk > 0) {
    c.globalAlpha = L.clamp(k * 3) * sk;
    const px = cx + Math.cos(aS) * RR, py = cy + Math.sin(aS) * RR;
    const by = cy + r * 1.42, bw = r * 0.42, bh = r * 0.07;
    c.strokeStyle = rg; c.lineWidth = w * 0.9;
    c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px - r * 0.02, by - bh * 2.4, cx, by - bh * 0.8); c.stroke();
    const bg = c.createLinearGradient(cx - bw, 0, cx + bw, 0);
    bg.addColorStop(0, '#2a3040'); bg.addColorStop(0.35, '#8890a4'); bg.addColorStop(1, '#1c2130');
    c.fillStyle = bg;
    c.beginPath(); c.ellipse(cx, by, Math.max(0, bw), Math.max(0, bh), 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.ellipse(cx, by - bh * 0.35, Math.max(0, bw * 0.8), Math.max(0, bh * 0.45), 0, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

export const standK = (v) => L.prog(v.gt - t11Of(v), STAND[0], STAND[1]);
const pulseAt = (v) => Math.exp(-Math.pow((v.gt - t11Of(v) - LOUPE - 0.3) / 0.45, 2));

// ------------------------------------------------------------------ magnifier on the top of the limb
const LP = { x: 815, y: 455, R: 140, mag: 4.6, fx: 0, fy: -200000 };
/**
 * Magnifier (screen space). a = alpha, open = 0..1 lens radius build.
 * opts.link   0..1 alpha of the source ring + connector lines (s12 fades them before its beam)
 * opts.target 0..1 bracket moves from "surface to ISS orbit" (0) to "surface to Kármán line" (1)
 * opts.issA   alpha of the ISS orbit + station inside the lens (default 1)
 */
export function drawLoupe(c, v, a = 1, open = 1, opts = {}) {
  if (a <= 0 || open <= 0) return;
  const link = opts.link ?? 1, tk = L.ease.inOutCubic(L.clamp(opts.target ?? 0)), issA = opts.issA ?? 1;
  const R = LP.R * L.ease.outBack(L.clamp(open), 1.2);
  // source ring on the limb, and tangents to the lens
  const sx = v.wx(LP.fx), sy = v.wy(LP.fy);
  const r0 = LP.R / LP.mag;
  const dx = LP.x - sx, dy = LP.y - sy, dist = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx), off = Math.asin(L.clamp((R - r0) / dist, -1, 1));
  c.save();
  c.globalAlpha *= a;
  if (link > 0) {
    c.save();
    c.globalAlpha *= link;
    c.strokeStyle = 'rgba(215,225,255,0.4)';
    c.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      const an = base + s * (Math.PI / 2 + off);
      c.beginPath(); c.moveTo(sx + Math.cos(an) * r0, sy + Math.sin(an) * r0); c.lineTo(LP.x + Math.cos(an) * R, LP.y + Math.sin(an) * R); c.stroke();
    }
    c.strokeStyle = 'rgba(225,232,255,0.8)';
    c.beginPath(); c.arc(sx, sy, Math.max(0, r0), 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  // lens contents: the same world, magnified
  const mpp = v.cam.mpp / LP.mag;
  const lv = {
    ...v, loupeScale: LP.mag,
    cam: { ...v.cam, mpp },
    wx: (x) => LP.x + (x - LP.fx) / mpp,
    wy: (y) => LP.y + (y - LP.fy) / mpp,
    ws: (m) => m / mpp,
  };
  c.save();
  c.beginPath(); c.arc(LP.x, LP.y, Math.max(0, R), 0, Math.PI * 2); c.clip();
  c.fillStyle = '#02040b';
  c.fillRect(LP.x - R, LP.y - R, R * 2, R * 2);
  drawGlobe(c, lv, pulseAt(v), [LP.x - R - 2, LP.y - R - 2, R * 2 + 4, R * 2 + 4]);
  const iA = L.lerp(1, issA, tk);
  drawOrbit(c, lv, 1, iA, { width: 1.8 });
  drawStation(c, lv, iA, 0.8);
  const ccx = lv.wx(0), ccy = lv.wy(R_EARTH), rk = lv.ws(R_EARTH + ALT.karman);
  if (tk > 0) {
    // the Kármán ring brightened on top of the skin glow, so the 100 km line reads inside the lens
    L.glow(c, ACC, 14, () => {
      c.strokeStyle = L.rgba(ACC, 0.7 * tk); c.lineWidth = 5;
      c.beginPath(); c.arc(ccx, ccy, Math.max(0, rk), 0, Math.PI * 2); c.stroke();
    }, 0.9);
    c.strokeStyle = L.rgba([235, 240, 255], 0.95 * tk);
    c.lineWidth = 2.5;
    c.beginPath(); c.arc(ccx, ccy, Math.max(0, rk), 0, Math.PI * 2); c.stroke();
  }
  drawKarman(c, lv, 1, 0.9 * (1 - tk), 0, { width: 1.5 });
  // the gap bracket: surface to orbit (or, with opts.target, surface to the Kármán line), with a small tag
  const bk = L.ease.outCubic(L.prog(v.gt - t11Of(v), LOUPE + 0.35, 0.6));
  if (bk > 0) {
    const bx = LP.x - R * 0.45;
    const sagAt = (alt) => ((bx - LP.x) ** 2) / (2 * lv.ws(R_EARTH + alt));
    const yIss = lv.wy(-ALT.iss) + sagAt(ALT.iss), yKar = lv.wy(-ALT.karman) + sagAt(ALT.karman);
    const y0 = L.lerp(yIss, yKar, tk);
    const y1 = lv.wy(0) + sagAt(0);
    L.dimension(c, bx, y0, y1, bk, [235, 240, 255], '', 'left');
    // tag: "1 cm" beside the ISS gap, crossfading to "100 km" above the Kármán bracket
    const tagK = L.clamp(bk * 2 - 1);
    const tags = [['1 cm', (y0 + y1) / 2, 1 - L.clamp(tk * 2)], ['100 km', y0 - 22, L.clamp(tk * 2 - 1)]];
    c.font = L.font(23, 700, L.FONT.body);
    c.textBaseline = 'middle';
    for (const [str, ty, ta] of tags) {
      if (ta * tagK <= 0) continue;
      c.save();
      c.globalAlpha *= ta * tagK;
      c.fillStyle = 'rgba(4,7,18,0.75)';
      c.letterSpacing = '0.5px';
      const tw = c.measureText(str).width + 22;
      L.roundRect(c, bx + 26, ty - 17, tw, 34, 17); c.fill();
      c.fillStyle = '#fff';
      L.trackedText(c, str, bx + 26 + 11, ty + 1, 0.5);
      c.restore();
    }
  }
  c.restore();
  c.strokeStyle = 'rgba(225,232,255,0.85)';
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(LP.x, LP.y, Math.max(0, R), 0, Math.PI * 2); c.stroke();
  c.strokeStyle = L.rgba(ACC, 0.3);
  c.lineWidth = 8;
  c.beginPath(); c.arc(LP.x, LP.y, Math.max(0, R + 6), 0, Math.PI * 2); c.stroke();
  c.restore();
}

export default {
  beat: 11,
  chapter: { num: '11', title: 'On a globe', sub: 'Shrink Earth to 30 cm' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.05, name: 'swell', gain: 0.35, pitch: 0.8 },
      { t: STAND[0] + 0.1, name: 'creak', gain: 0.18, pitch: 1.3 },
      { t: STAND[0] + STAND[1] - 0.1, name: 'tick', gain: 0.3, pitch: 0.9 },
      { t: DIM, name: 'blip', gain: 0.2, pitch: 1.1 },
      { t: LOUPE, name: 'bloom', gain: 0.4, pitch: 1.0 },
      { t: LABEL + 0.05, name: 'ping', gain: 0.3, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < -1 || globeK(v.cam.mpp) <= 0) return;
    drawGlobe(ctx, v, v.t > 0 ? pulseAt(v) : 0);
    drawStand(ctx, v, standK(v));
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    // 30 cm diameter dimension across the globe
    const dk = L.enter(t, DIM, 0.6) * v.k;
    if (dk > 0) {
      const cx = v.wx(0), cy = v.wy(R_EARTH), r = v.ws(R_EARTH);
      const e = L.ease.outCubic(dk);
      const y = cy + r * 0.18;
      const hw = Math.sqrt(Math.max(0, r * r - (r * 0.18) ** 2));
      ctx.save();
      ctx.globalAlpha = L.clamp(dk * 1.5);
      ctx.strokeStyle = 'rgba(240,244,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - hw * e, y); ctx.lineTo(cx + hw * e, y); ctx.stroke();
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * hw * e, y - 12); ctx.lineTo(cx + s * hw * e, y + 12); ctx.stroke(); }
      ctx.font = L.font(34, 700, L.FONT.body);
      const label = '30 cm', tw = ctx.measureText(label).width + 36;
      ctx.globalAlpha = L.clamp(dk * 2 - 0.6);
      ctx.fillStyle = 'rgba(6,10,24,0.82)';
      L.roundRect(ctx, cx - tw / 2, y - 26, tw, 52, 26); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      L.trackedText(ctx, label, cx, y + 2, 1, 'center');
      ctx.restore();
    }
    // magnifier (handed over to s12 at the beat change, so it never blinks)
    if (t < v.d) drawLoupe(ctx, v, L.clamp(L.prog(t, LOUPE, 0.25)), L.prog(t, LOUPE, 0.6));
    const k = L.enter(t, LABEL, 0.55) * v.k;
    L.bigLabel(ctx, { x: 110, y: 432, big: '≈ 1 cm', small: 'ISS on this globe', k, accent: v.accent, size: 110 });
  },
};
