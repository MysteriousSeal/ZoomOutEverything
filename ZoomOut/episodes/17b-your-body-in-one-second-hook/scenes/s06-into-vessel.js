// Beat 6 — "Now dive into a blood vessel. | It's crowded with red blood cells."
// OWNS the VENULE INTERIOR for beats 4-8 and the pull-out of beat 9:
//   * at section scale (beats 4-5) a strip of tiny cells drifts through the venule band, so the dive target is alive;
//   * on the dive (log-zoom dissolve) a periodic wall tile takes over: dermis with collagen and fibroblasts,
//     adventitia, pericytes, basement membrane, endothelium with flattened nuclei bulging into the lumen, plasma;
//   * the red-cell stream: true biconcave discs (pale centre, deep rim, subsurface edge, crest glint) tumbling in a
//     Poiseuille flow (fast in the middle, slow at the walls), in depth: hazy far cells, a crisp focal plane, soft
//     near cells and a few huge out-of-focus cells drifting across the lens; platelets and one rolling white cell.
//   * the HERO cell (picked out in beat 7, followed in beat 8) is a slow near-wall cell; s07/s08 import heroView().
import * as L from '../../../../engine/runtime/lib.js';
import { BLOOD, P, SIZE, VESSEL, clockTime, microK, phrase } from '../env.js';
import { at as camAt } from '../camera.js';
import { drawTile, nearSkin } from './s04-nerve.js';

const { W, H } = L;
const R = VESSEL.r;
const CR = SIZE.rbc / 2;
const hsh = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// ------------------------------------------------------------------ the flow
const VC = 13e-6;                         // centre-line speed on screen (time-compressed; real ≈ 1 mm/s)
/** Centre-line displacement (m) at gt: steady drift, a gentle surge with each heartbeat, and a push that carries
 *  the hero along with the camera in beats 7 and 8. Lane displacement = lane.f × flowD. */
export function flowD(gt, tl) {
  const sc = tl.scenes;
  const s7 = L.ease.inOutCubic(L.prog(gt, sc[7].start - 0.05, 2.0));
  const s8 = L.ease.inOutCubic(L.prog(gt, sc[8].start - 0.05, 3.0));
  const hb = clockTime(gt, tl) * 63 / 60;
  const beat = Math.floor(hb) + L.smoothstep(L.clamp((hb % 1) / 0.3));
  return VC * gt + 14e-6 * s7 + 70e-6 * s8 + 1.2e-6 * beat;
}
const laneF = (y, z) => 1 - 0.85 * ((y / R) ** 2 + z * z);
/** depth (z = −1 far … +1 near, in units of R) → perspective scale about the screen centre */
const depthS = (z) => 1 / (1 - 0.2 * z);

const LANES = (() => {
  const r = L.rng(606), out = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const z = -0.95 + 1.9 * (i + r()) / N;
    const ymax = Math.sqrt(Math.max(0, 1 - z * z)) * 0.86;
    const y = (r() * 2 - 1) * ymax * R;
    out.push({ y, z, f: laneF(y, z), sp: (11 + r() * 6) * 1e-6 * (z > 0.4 ? 1.9 : z < -0.6 ? 1.3 : 1), ph: r() * 1e-4, seed: i * 977 + 13 });
  }
  // two foreground lanes: huge, soft cells drifting across the lens
  out.push({ y: -0.2 * R, z: 2.6, f: 0.9, sp: 70e-6, ph: 31e-6, seed: 9001, fg: true });
  out.push({ y: 0.35 * R, z: 3.1, f: 0.85, sp: 95e-6, ph: 77e-6, seed: 9002, fg: true });
  return out.sort((a, b) => a.z - b.z);
})();

// ------------------------------------------------------------------ red-cell sprites (baked once)
const RS = 64, PAD = 44, SZ = 2 * (RS + PAD);
const BINS = [
  { blur: 5, haze: 0.55, dark: 0 },       // far
  { blur: 2, haze: 0.25, dark: 0 },
  { blur: 0, haze: 0, dark: 0 },          // focal
  { blur: 3, haze: 0, dark: 0.06 },
  { blur: 12, haze: 0, dark: 0.25 },      // near
  { blur: 26, haze: 0, dark: 0.35 },      // foreground
];
const binOf = (z) => (z > 1.5 ? 5 : z < -0.6 ? 0 : z < -0.25 ? 1 : z < 0.3 ? 2 : z < 0.65 ? 3 : 4);
const LIGHT = -0.75 * Math.PI;           // light from the upper left (screen)

function bakeFace(g, r, la) {
  const lx = Math.cos(la), ly = Math.sin(la);
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
  const b = g.createRadialGradient(0, 0, 0, 0, 0, r);
  b.addColorStop(0, 'rgb(228,118,112)'); b.addColorStop(0.3, 'rgb(214,86,86)'); b.addColorStop(0.52, 'rgb(194,48,56)');
  b.addColorStop(0.72, 'rgb(178,32,44)'); b.addColorStop(0.86, 'rgb(150,22,36)'); b.addColorStop(0.95, 'rgb(108,12,26)'); b.addColorStop(1, 'rgb(70,6,18)');
  g.fillStyle = b; g.fill();
  g.save(); g.clip();
  // torus crest lit on the light side
  g.globalCompositeOperation = 'lighter';
  let lg = g.createLinearGradient(lx * r, ly * r, -lx * r, -ly * r);
  lg.addColorStop(0, 'rgba(255,170,160,0.34)'); lg.addColorStop(0.4, 'rgba(255,170,160,0.05)'); lg.addColorStop(1, 'rgba(255,170,160,0)');
  g.fillStyle = lg;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.arc(0, 0, r * 0.5, 0, Math.PI * 2, true); g.fill();
  // the dimple: shaded slope on the lit side, a lit lip on the far side
  g.globalCompositeOperation = 'source-over';
  const ir = r * 0.58;
  lg = g.createLinearGradient(lx * ir, ly * ir, -lx * ir, -ly * ir);
  lg.addColorStop(0, 'rgba(70,0,14,0.38)'); lg.addColorStop(0.5, 'rgba(70,0,14,0)'); lg.addColorStop(1, 'rgba(255,170,160,0.2)');
  g.fillStyle = lg; g.beginPath(); g.arc(0, 0, ir, 0, Math.PI * 2); g.fill();
  // subsurface: light passing through the thin rim on the shadow side
  g.globalCompositeOperation = 'lighter';
  lg = g.createLinearGradient(lx * r, ly * r, -lx * r, -ly * r);
  lg.addColorStop(0.45, 'rgba(255,110,70,0)'); lg.addColorStop(1, 'rgba(255,120,80,0.42)');
  g.strokeStyle = lg; g.lineWidth = r * 0.1;
  g.beginPath(); g.arc(0, 0, r * 0.92, 0, Math.PI * 2); g.stroke();
  // glint on the crest
  g.save();
  g.translate(lx * r * 0.7, ly * r * 0.7); g.rotate(la + Math.PI / 2); g.scale(1, 0.3);
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.26);
  gl.addColorStop(0, 'rgba(255,232,222,0.6)'); gl.addColorStop(1, 'rgba(255,232,222,0)');
  g.fillStyle = gl; g.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
  g.restore();
  g.restore();
  g.strokeStyle = 'rgba(46,0,10,0.55)'; g.lineWidth = 1.6;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
}
function bakeEdge(g, r, la) {
  const lx = Math.cos(la), ly = Math.sin(la);
  // a rounded peanut: two lobes (the thick rim) joined by a thinner waist (the dimpled centre)
  const lc = 0.69 * r, lr = 0.31 * r, wst = 0.14 * r;
  const path = () => {
    g.beginPath();
    g.moveTo(-lc, -lr);
    g.bezierCurveTo(-lc * 0.45, -lr, -lc * 0.3, -wst, 0, -wst);
    g.bezierCurveTo(lc * 0.3, -wst, lc * 0.45, -lr, lc, -lr);
    g.arc(lc, 0, lr, -Math.PI / 2, Math.PI / 2);
    g.bezierCurveTo(lc * 0.45, lr, lc * 0.3, wst, 0, wst);
    g.bezierCurveTo(-lc * 0.3, wst, -lc * 0.45, lr, -lc, lr);
    g.arc(-lc, 0, lr, Math.PI / 2, Math.PI * 1.5);
    g.closePath();
  };
  path();
  const b = g.createLinearGradient(-r, 0, r, 0);
  b.addColorStop(0, 'rgb(90,10,24)'); b.addColorStop(0.14, 'rgb(172,30,42)'); b.addColorStop(0.5, 'rgb(186,52,58)');
  b.addColorStop(0.86, 'rgb(172,30,42)'); b.addColorStop(1, 'rgb(90,10,24)');
  g.fillStyle = b; g.fill();
  g.save(); g.clip();
  const lg = g.createLinearGradient(lx * r * 0.35, ly * r * 0.35, -lx * r * 0.35, -ly * r * 0.35);
  lg.addColorStop(0, 'rgba(255,180,170,0.4)'); lg.addColorStop(0.5, 'rgba(255,180,170,0)'); lg.addColorStop(1, 'rgba(40,0,10,0.4)');
  g.fillStyle = lg; g.fillRect(-r, -r, 2 * r, 2 * r);
  g.restore();
  g.strokeStyle = 'rgba(46,0,10,0.5)'; g.lineWidth = 1.4; path(); g.stroke();
}
let SPR = null;
function sprites() {
  if (SPR) return SPR;
  const mk = () => { const cv = new OffscreenCanvas(SZ, SZ); const g = cv.getContext('2d'); g.translate(SZ / 2, SZ / 2); return [cv, g]; };
  SPR = [0, 1].map((o) => {
    const la = LIGHT - o * Math.PI / 2;
    const [fc, fg] = mk(); bakeFace(fg, RS, la);
    const [ec, eg] = mk(); bakeEdge(eg, RS, la);
    return BINS.map((bn) => [fc, ec].map((src) => {
      if (!bn.blur && !bn.haze && !bn.dark) return src;
      const [cv, g] = mk();
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (bn.blur) g.filter = `blur(${bn.blur}px)`;
      g.drawImage(src, 0, 0);
      g.filter = 'none';
      g.globalCompositeOperation = 'source-atop';
      if (bn.haze) { g.fillStyle = `rgba(92,20,30,${bn.haze})`; g.fillRect(0, 0, SZ, SZ); }
      if (bn.dark) { g.fillStyle = `rgba(22,2,8,${bn.dark})`; g.fillRect(0, 0, SZ, SZ); }
      return cv;
    }));
  });
  return SPR;
}
/** One red cell at screen (x, y), radius r px. theta = tumble (0 = face-on), phi = in-screen axis, o = 0|1 sprite set. */
export function drawRBC(c, x, y, r, theta, phi, bin = 2, alpha = 1, o = 0, faceOnly = false) {
  if (r < 0.6 || alpha <= 0.01) return;
  const spr = sprites()[o][bin];
  const cs = Math.abs(Math.cos(theta));
  const fa = L.smoothstep(L.clamp((cs - 0.08) / 0.3)), ea = faceOnly ? 0 : 1 - L.smoothstep(L.clamp((cs - 0.06) / 0.42));
  const S = r / RS, A = c.globalAlpha;
  c.save();
  c.translate(x, y); c.rotate(phi - o * Math.PI / 2);
  if (ea > 0.01) {
    c.globalAlpha = A * alpha * ea;
    const sy = 1 + cs * 1.2;
    c.drawImage(spr[1], -SZ / 2 * S, -SZ / 2 * S * sy, SZ * S, SZ * S * sy);
  }
  if (fa > 0.01) {
    c.globalAlpha = A * alpha * (faceOnly ? 1 : fa);
    const sy = Math.max(0.1, cs);
    c.drawImage(spr[0], -SZ / 2 * S, -SZ / 2 * S * sy, SZ * S, SZ * S * sy);
  }
  c.restore();
}

// ------------------------------------------------------------------ white cell + platelets
let WBC = null;
function wbcSprites() {
  if (WBC) return WBC;
  const r0 = 64, s = 2 * (r0 + 20);
  const base = new OffscreenCanvas(s, s), g = base.getContext('2d');
  g.translate(s / 2, s / 2);
  let gr = g.createRadialGradient(-r0 * 0.3, -r0 * 0.35, r0 * 0.1, 0, 0, r0);
  gr.addColorStop(0, 'rgba(250,236,236,0.95)'); gr.addColorStop(0.7, 'rgba(220,190,200,0.9)'); gr.addColorStop(1, 'rgba(150,100,130,0.85)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,240,245,0.6)'; g.lineWidth = 2; g.stroke();
  const det = new OffscreenCanvas(s, s), d = det.getContext('2d');
  d.translate(s / 2, s / 2);
  const rr = L.rng(77);
  for (let i = 0; i < 3; i++) {   // lobed nucleus
    const a = i * 2.1 + 0.4, x = Math.cos(a) * r0 * 0.28, y = Math.sin(a) * r0 * 0.22;
    gr = d.createRadialGradient(x, y, 0, x, y, r0 * 0.32);
    gr.addColorStop(0, 'rgba(120,80,160,0.55)'); gr.addColorStop(1, 'rgba(120,80,160,0)');
    d.fillStyle = gr; d.beginPath(); d.arc(x, y, r0 * 0.32, 0, Math.PI * 2); d.fill();
  }
  for (let i = 0; i < 90; i++) {  // granules
    const a = rr() * Math.PI * 2, q = Math.sqrt(rr()) * r0 * 0.9;
    d.fillStyle = `rgba(${rr() < 0.5 ? '170,120,150' : '255,250,250'},${0.25 + 0.3 * rr()})`;
    d.beginPath(); d.arc(Math.cos(a) * q, Math.sin(a) * q, 1.5 + rr() * 2, 0, Math.PI * 2); d.fill();
  }
  WBC = { base, det, r0, s };
  return WBC;
}

// ------------------------------------------------------------------ the wall tile (periodic, baked once)
const PW = 150e-6, VM = 0.15e-6, HY = 170e-6;
let WALL = null;
function buildWall() {
  const cw = Math.round(PW / VM), ch = Math.round(2 * HY / VM);
  const cv = new OffscreenCanvas(cw, ch), g = cv.getContext('2d');
  const TY = (y) => (y + HY) / VM, TX = (x) => x / VM;
  const r = L.rng(66);
  const wrap3 = (fn) => { for (const o of [-cw, 0, cw]) { g.save(); g.translate(o, 0); fn(); g.restore(); } };
  // dermis around the vessel
  let gr = g.createLinearGradient(0, 0, 0, ch);
  gr.addColorStop(0, 'rgb(30,7,14)'); gr.addColorStop(0.3, 'rgb(62,18,30)'); gr.addColorStop(0.5, 'rgb(84,26,40)');
  gr.addColorStop(0.7, 'rgb(62,18,30)'); gr.addColorStop(1, 'rgb(28,6,13)');
  g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
  // collagen bundles: soft, out of the focal plane
  g.filter = 'blur(6px)';
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const top = r() < 0.5, y = (top ? -1 : 1) * (R + 14e-6 + r() * 140e-6);
    const x = r() * PW, len = (40 + 90 * r()) * 1e-6, a = (r() - 0.5) * 0.5, wav = (2 + 4 * r()) * 1e-6;
    g.strokeStyle = r() < 0.6 ? `rgba(210,120,134,${0.05 + 0.08 * r()})` : `rgba(20,2,8,${0.12 + 0.18 * r()})`;
    g.lineWidth = (2 + 5 * r()) * 1e-6 / VM;
    wrap3(() => {
      g.beginPath();
      for (let k = 0; k <= 16; k++) { const s = k / 16; const px = x + Math.cos(a) * len * s, py = y + Math.sin(a) * len * s + Math.sin(s * 9 + i) * wav; k ? g.lineTo(TX(px), TY(py)) : g.moveTo(TX(px), TY(py)); }
      g.stroke();
    });
  }
  // out of the focal plane below the venule: its companion arteriole and a small nerve fibre, soft
  g.filter = 'blur(10px)';
  { const ay = 112e-6, ar = 11e-6;
    g.fillStyle = 'rgba(150,56,74,0.75)'; g.fillRect(-20, TY(ay - ar - 9e-6), cw + 40, (2 * ar + 18e-6) / VM);
    g.fillStyle = 'rgba(120,20,34,0.9)'; g.fillRect(-20, TY(ay - ar), cw + 40, 2 * ar / VM);
    g.fillStyle = 'rgba(255,170,170,0.25)'; g.fillRect(-20, TY(ay - ar - 9e-6), cw + 40, 3e-6 / VM);
    g.strokeStyle = 'rgba(232,206,190,0.18)'; g.lineWidth = 7e-6 / VM;
    g.beginPath(); for (let k = 0; k <= 40; k++) { const x = (k / 40) * PW, y = -100e-6 + 6e-6 * Math.sin((k / 40) * Math.PI * 2); k ? g.lineTo(TX(x), TY(y)) : g.moveTo(TX(x), TY(y)); } g.stroke(); }
  // fibroblast nuclei
  g.filter = 'blur(2px)';
  for (let i = 0; i < 9; i++) {
    const top = i % 2 === 0, y = (top ? -1 : 1) * (R + 20e-6 + r() * 100e-6), x = r() * PW;
    wrap3(() => { g.save(); g.translate(TX(x), TY(y)); g.rotate((r() - 0.5) * 0.4); g.scale(1, 0.3); g.beginPath(); g.arc(0, 0, 7e-6 / VM, 0, Math.PI * 2); g.restore(); g.fillStyle = 'rgba(70,26,76,0.6)'; g.fill(); });
  }
  g.filter = 'none';
  // the wall, both sides: adventitia, pericytes, basement membrane, endothelium (+ nuclei bulging into the lumen)
  for (const side of [-1, 1]) {
    const band = (r0, r1, col) => { const a = TY(side * r0), b = TY(side * r1); g.fillStyle = col; g.fillRect(0, Math.min(a, b), cw, Math.abs(b - a)); };
    { const a = TY(side * (R + 2e-6)), b = TY(side * (R + 11e-6)); const ag = g.createLinearGradient(0, a, 0, b); ag.addColorStop(0, 'rgba(150,62,82,0.7)'); ag.addColorStop(1, 'rgba(150,62,82,0)'); g.fillStyle = ag; g.fillRect(0, Math.min(a, b), cw, Math.abs(b - a)); }
    band(R + 1.2e-6, R + 2.6e-6, 'rgb(128,48,70)');
    band(R, R + 1.2e-6, 'rgb(178,100,116)');
    g.fillStyle = 'rgba(255,214,220,0.4)'; g.fillRect(0, TY(side * (R + 1.25e-6)) - 1, cw, 2);
    g.fillStyle = 'rgba(255,200,205,0.55)'; g.fillRect(0, TY(side * R) - 1.2, cw, 2.4);
    for (let i = 0; i < 4; i++) {   // pericytes (outside) + endothelial nuclei (inside)
      const x = ((i + 0.3 * hsh(i, side + 5)) / 4) * PW + (side > 0 ? PW / 8 : 0);
      wrap3(() => {
        g.save(); g.translate(TX(x + 12e-6), TY(side * (R + 3.4e-6))); g.scale(1, 0.24);
        g.beginPath(); g.arc(0, 0, 8e-6 / VM, 0, Math.PI * 2); g.restore();
        g.fillStyle = 'rgba(70,26,66,0.6)'; g.fill();
        g.save(); g.translate(TX(x), TY(side * (R - 0.2e-6))); g.scale(1, 0.26);
        g.beginPath(); g.arc(0, 0, 7e-6 / VM, 0, Math.PI * 2); g.restore();
        const ng = g.createLinearGradient(0, TY(side * (R - 2e-6)), 0, TY(side * (R + 1.6e-6)));
        ng.addColorStop(0, 'rgb(150,90,140)'); ng.addColorStop(1, 'rgb(90,40,90)');
        g.fillStyle = ng; g.fill();
        g.strokeStyle = 'rgba(255,210,225,0.35)'; g.lineWidth = 1.6; g.stroke();
      });
    }
  }
  // the lumen: warm plasma, brighter in the middle (a lit cylinder)
  gr = g.createLinearGradient(0, TY(-R), 0, TY(R));
  gr.addColorStop(0, 'rgb(64,10,20)'); gr.addColorStop(0.18, 'rgb(112,26,34)'); gr.addColorStop(0.42, 'rgb(150,44,46)');
  gr.addColorStop(0.6, 'rgb(140,40,44)'); gr.addColorStop(0.85, 'rgb(98,20,30)'); gr.addColorStop(1, 'rgb(56,8,18)');
  g.fillStyle = gr; g.fillRect(0, TY(-R), cw, 2 * R / VM);
  // feather the tile's top/bottom so it dissolves into the section underneath
  g.globalCompositeOperation = 'destination-out';
  for (const [y0, y1] of [[0, 40e-6 / VM], [ch, ch - 40e-6 / VM]]) {
    const fg = g.createLinearGradient(0, y0, 0, y1);
    fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fg; g.fillRect(0, Math.min(y0, y1), cw, Math.abs(y1 - y0));
  }
  g.globalCompositeOperation = 'source-over';
  WALL = cv;
  return cv;
}

// ------------------------------------------------------------------ the section-scale strip of tiny cells
const SL = 240e-6, SM = 0.6e-6;
let STRIP = null;
function buildStrip() {
  const cw = Math.round(SL / SM), ch = Math.round(2 * R / SM);
  const cv = new OffscreenCanvas(cw, ch), g = cv.getContext('2d');
  const r = L.rng(808);
  g.fillStyle = 'rgb(120,28,38)'; g.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 150; i++) {
    const x = r() * SL, y = (r() * 2 - 1) * (R - CR);
    const z = r() * 2 - 1;
    for (const o of [-cw, 0, cw]) drawRBC(g, x / SM + o, (y + R) / SM, CR / SM * depthS(z), r() * Math.PI, (r() - 0.5) * 0.8, z < -0.3 ? 1 : 2, 1, 0);
  }
  const gr = g.createLinearGradient(0, 0, 0, ch);
  gr.addColorStop(0, 'rgba(40,4,12,0.7)'); gr.addColorStop(0.3, 'rgba(40,4,12,0)'); gr.addColorStop(0.7, 'rgba(40,4,12,0)'); gr.addColorStop(1, 'rgba(40,4,12,0.7)');
  g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
  STRIP = cv;
  return cv;
}

// ------------------------------------------------------------------ the hero (picked out in beat 7)
const HERO = { y: -0.5 * R, z: 0.04 };
HERO.f = laneF(HERO.y, HERO.z);
let HX = null, HXT = null;
/** Beat-7 pick time (global). */
export const pickT = (tl) => phrase(tl, 7, 0, 'start') + 0.85;
function heroX0(tl) {
  if (HX !== null && HXT === tl) return HX;
  const T = pickT(tl), cam = camAt(T, tl);
  HX = cam.x + (420 - W / 2) * cam.mpp / depthS(HERO.z) - HERO.f * flowD(T, tl);
  HXT = tl;
  return HX;
}
const heroWX = (gt, tl) => heroX0(tl) + HERO.f * flowD(gt, tl);
function heroTheta(gt, tl) {
  const T = phrase(tl, 6, 1, 'start') + 0.2;
  const free = 0.85 * gt + 1.3;
  const rest = Math.round((0.85 * T + 1.3) / Math.PI) * Math.PI + 0.22 * Math.sin(0.8 * (gt - T));
  return L.lerp(free, rest, L.ease.inOutCubic(L.prog(gt, T - 1.0, 1.0)));
}
/** The hero on screen: {x, y, r, theta, phi}. */
export function heroView(v) {
  const s = depthS(HERO.z);
  const x = W / 2 + (v.wx(heroWX(v.gt, v.tl)) - W / 2) * s, y = H / 2 + (v.wy(VESSEL.y + HERO.y) - H / 2) * s;
  return { x, y, r: v.ws(CR) * s, theta: heroTheta(v.gt, v.tl), phi: 0.12 * Math.sin(v.gt * 0.5) };
}

// ------------------------------------------------------------------ drawing
function drawStream(c, v, kCells) {
  const mpp = v.cam.mpp, rpx = v.ws(CR);
  const D = flowD(v.gt, v.tl);
  const lite = rpx < 14;
  const hv = heroView(v);
  const ly0 = v.wy(VESSEL.y - R), ly1 = v.wy(VESSEL.y + R);
  const sc = v.tl.scenes;
  const heroShow = v.gt > sc[6].start - 0.5;
  const protect = L.smoothstep(L.prog(v.gt, phrase(v.tl, 6, 1, 'start') - 0.6, 0.6));   // keep the hero clear from the tag on
  let clipped = false, heroDone = false;
  const clipOn = () => { if (clipped) return; c.save(); c.beginPath(); c.rect(0, ly0, W, ly1 - ly0); c.clip(); clipped = true; };
  const clipOff = () => { if (!clipped) return; c.restore(); clipped = false; };
  for (const ln of LANES) {
    if (ln.fg && (lite || kCells < 1)) continue;
    if (lite && Math.abs(ln.z) > 0.6) continue;
    if (ln.fg) clipOff(); else clipOn();
    const s = depthS(ln.z), bin = binOf(ln.z);
    const rr = rpx * s;
    const margin = rr * 3;
    const xa = v.cam.x + ((-margin - W / 2) / s) * mpp, xb = v.cam.x + ((W + margin - W / 2) / s) * mpp;
    const off = ln.ph + ln.f * D;
    const i0 = Math.floor((xa - off) / ln.sp), i1 = Math.ceil((xb - off) / ln.sp);
    const ys = VESSEL.y + ln.y;
    for (let i = i0; i <= i1; i++) {
      const h1 = hsh(i, ln.seed), h2 = hsh(i, ln.seed + 1), h3 = hsh(i, ln.seed + 2), h4 = hsh(i, ln.seed + 3);
      if (!ln.fg && h4 < 0.08) continue;   // a few gaps in the crowd
      const x = off + i * ln.sp + (h1 - 0.5) * ln.sp * 0.35;
      const y = ys + (h2 - 0.5) * 3e-6 + Math.sin(v.gt * 0.7 + h3 * 9) * 0.5e-6;
      const sx = W / 2 + (v.wx(x) - W / 2) * s, sy = H / 2 + (v.wy(y) - H / 2) * s;
      if (sx < -margin || sx > W + margin) continue;
      let fade = 1;
      if (heroShow && protect > 0 && Math.abs(ln.z) < 1.5) {
        const d = Math.hypot(sx - hv.x, sy - hv.y);
        fade = 1 - protect * (1 - L.smoothstep(L.clamp((d - (rr + hv.r) * 0.9) / (rr * 0.6))));
        if (fade <= 0.01) continue;
      }
      const om = h3 < 0.5 ? 0 : 1;
      const theta = h1 * 6.28 + (0.25 + 0.8 * h2) * (0.5 + (1 - ln.f) * 1.5) * v.gt * (h4 < 0.5 ? 1 : -1);
      const phi = om * Math.PI / 2 + (h4 - 0.5) * 0.8 + 0.15 * Math.sin(v.gt * 0.4 + h1 * 7);
      const a = (ln.fg ? 0.55 : 1) * fade;
      drawRBC(c, sx, sy, rr, theta, phi, bin, a * kCells, om, lite);
    }
    // the hero sits in the focal plane
    if (heroShow && !ln.fg && ln.z >= HERO.z && !heroDone) {
      heroDone = true;
      if (hv.x > -hv.r * 2 && hv.x < W + hv.r * 2) drawRBC(c, hv.x, hv.y, hv.r, hv.theta, hv.phi, 2, kCells, 0, lite);
    }
  }
  clipOff();
}

function drawPlatelets(c, v, k) {
  const D = flowD(v.gt, v.tl), mpp = v.cam.mpp;
  const ly0 = v.wy(VESSEL.y - R), ly1 = v.wy(VESSEL.y + R);
  c.save();
  c.beginPath(); c.rect(0, ly0, W, ly1 - ly0); c.clip();
  for (let j = 0; j < 3; j++) {
    const y = VESSEL.y + (j - 1) * 0.55 * R + 2e-6 * Math.sin(j * 4), f = laneF(y - VESSEL.y, 0.2), sp = 45e-6;
    const off = j * 13e-6 + f * D;
    const xa = v.cam.x - (W / 2 + 40) * mpp, xb = v.cam.x + (W / 2 + 40) * mpp;
    for (let i = Math.floor((xa - off) / sp); i <= Math.ceil((xb - off) / sp); i++) {
      const x = off + i * sp + hsh(i, 40 + j) * 12e-6;
      const sx = v.wx(x), sy = v.wy(y + (hsh(i, 50 + j) - 0.5) * 6e-6), r = v.ws(1.3e-6);
      c.save(); c.translate(sx, sy); c.rotate(hsh(i, 60) * 3 + v.gt * 0.6); c.scale(1, 0.55);
      const gr = c.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, Math.max(0.1, r));
      gr.addColorStop(0, `rgba(255,226,200,${0.9 * k})`); gr.addColorStop(1, `rgba(200,130,120,${0.75 * k})`);
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, Math.max(0, r), 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }
  c.restore();
}

function drawWhiteCell(c, v, k) {
  const sc = v.tl.scenes;
  if (v.gt < sc[6].start || v.gt > sc[9].start + 0.5) return;
  const ws = wbcSprites();
  const r = 6.2e-6, y = VESSEL.y + R - r - 0.6e-6;
  const x = VESSEL.x - 40e-6 + 0.12 * flowD(v.gt, v.tl) - 0.12 * flowD(sc[6].start, v.tl) + 3.2e-6 * (v.gt - sc[6].start);
  const sx = v.wx(x), sy = v.wy(y), rp = v.ws(r);
  if (sx < -rp * 2 || sx > W + rp * 2) return;
  const S = rp / ws.r0;
  // from beat 7 the hero is the only crisp highlight: the white cell slips out of the focal plane (soft, dimmer)
  const dk = L.smoothstep(L.prog(v.gt, phrase(v.tl, 7, 0, 'start') - 0.4, 1.0));
  c.save();
  c.globalAlpha *= k * 0.95 * (1 - 0.6 * dk);
  if (dk > 0.01) c.filter = `blur(${(dk * rp * 0.28).toFixed(1)}px)`;
  c.translate(sx, sy);
  c.drawImage(ws.base, -ws.s / 2 * S, -ws.s / 2 * S, ws.s * S, ws.s * S);
  c.rotate((x - VESSEL.x) / r);                                            // rolling along the wall
  c.drawImage(ws.det, -ws.s / 2 * S, -ws.s / 2 * S, ws.s * S, ws.s * S);
  c.restore();
}

function drawInterior(c, v) {
  const sc = v.tl.scenes;
  if (v.gt < sc[4].start - 0.3 || v.gt > sc[10].start + 0.3 || !nearSkin(v)) return;
  const rpx = v.ws(CR);
  if (!v.visibleY(VESSEL.y - R - 200e-6, VESSEL.y + R + 200e-6)) return;
  const kT = microK(v, 2.6e-6, 9e-7);                  // the wall tile
  const kS = microK(v, 9e-6, 5.5e-6) * (1 - L.smoothstep(L.clamp((rpx - 4.5) / 3)));   // the strip of tiny cells
  const kC = L.smoothstep(L.clamp((rpx - 4.5) / 3));   // the sprite stream
  c.save();
  if (kT > 0) { c.globalAlpha = kT; drawTile(c, v, WALL || buildWall(), VESSEL.x - PW / 2, VESSEL.y - HY, VM, true); c.globalAlpha = 1; }
  const ly0 = v.wy(VESSEL.y - R), ly1 = v.wy(VESSEL.y + R);
  if (kS > 0) {
    c.save();
    c.beginPath(); c.rect(0, ly0, W, ly1 - ly0); c.clip();
    c.globalAlpha = kS;
    drawTile(c, v, STRIP || buildStrip(), VESSEL.x + 0.72 * flowD(v.gt, v.tl), VESSEL.y - R, SM, true);
    c.restore();
  }
  if (kC > 0) {
    if (rpx > 9) drawPlatelets(c, v, kC);
    drawWhiteCell(c, v, kC);
    drawStream(c, v, kC);
    // the tube's curvature: cells darken as they slip behind the wall
    for (const [a, b] of [[ly0, ly0 + v.ws(9e-6)], [ly1, ly1 - v.ws(9e-6)]]) {
      const gr = c.createLinearGradient(0, a, 0, b);
      gr.addColorStop(0, `rgba(40,4,12,${0.75 * kC})`); gr.addColorStop(1, 'rgba(40,4,12,0)');
      c.fillStyle = gr; c.fillRect(0, Math.min(a, b), W, Math.abs(b - a));
    }
    // a slow light sweep through the plasma
    c.globalCompositeOperation = 'lighter';
    const sw = ((v.gt * 0.09) % 1.5) - 0.25, lx = L.lerp(-500, W + 500, sw);
    const lg = c.createLinearGradient(lx - 300, ly0, lx + 300, ly1);
    lg.addColorStop(0, 'rgba(255,150,120,0)'); lg.addColorStop(0.5, `rgba(255,150,120,${0.07 * kC})`); lg.addColorStop(1, 'rgba(255,150,120,0)');
    c.fillStyle = lg; c.fillRect(0, ly0, W, ly1 - ly0);
  }
  c.restore();
}

export default {
  beat: 6,
  chapter: { num: '06', title: 'Into the blood', sub: 'a tiny vein under the skin' },
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: 0.05, name: 'dive', gain: 0.36, pitch: 0.9 },
      { t: 1.25, name: 'bubbles', gain: 0.24, pitch: 1.0 },
      { t: 2.0, name: 'swell', gain: 0.16, pitch: 0.8 },
      { t: 2.95, name: 'tick', gain: 0.2, pitch: 1.3 },
    ];
  },
  drawWorld(c, v) { drawInterior(c, v); },
  drawOverlay(c, v) {
    // phrase 2: a quiet tag on the crowd, pointing at the cell we will follow
    const t0 = phrase(v.tl, 6, 1, 'start') - v.tl.scenes[6].start + 0.35;
    const k = Math.min(v.k, L.prog(v.t, t0, 0.5));
    if (k <= 0) return;
    const hv = heroView(v);
    const tx = 96, ty = 470;
    const ax = L.clamp(hv.x, 80, W - 80), ay = hv.y - hv.r * 1.15;
    c.save();
    c.globalAlpha = k;
    const bg = c.createRadialGradient(320, 450, 30, 320, 450, 380);
    bg.addColorStop(0, 'rgba(10,2,6,0.42)'); bg.addColorStop(1, 'rgba(10,2,6,0)');
    c.fillStyle = bg; c.fillRect(0, 200, W, 560);
    c.restore();
    L.leader(c, ax, ay, tx + 20, ty + 26, Math.min(v.k, L.prog(v.t, t0 + 0.1, 0.5)), [255, 236, 230], 0.7);
    c.save();
    c.globalAlpha = k;
    c.font = L.font(34, 600, L.FONT.body);
    c.fillStyle = 'rgba(245,236,232,0.96)';
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 10;
    L.trackedText(c, 'A RED BLOOD CELL', tx, ty + (1 - L.ease.outCubic(k)) * 14, 5);
    c.restore();
  },
};
