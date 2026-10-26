// Beat 4 — "Your fastest nerve signals travel at up to a hundred and twenty meters per second."
// OWNS the FINGERTIP SECTION for beats 4-8 and the pull-out of beat 9 (any frame the camera is this deep at the thumb).
//   * Bridge: on the dive, fingerprint ridges (a face-on whorl) surface on the thumb pad, then the section opens
//     out of the pad as a feathered iris (log-zoom driven, so the pull-out of beat 9 closes it again).
//   * The section is a pre-rendered, x-periodic tile (3 µm/px, 8 mm = 16 ridges): air, a ridged epidermis
//     (stratum corneum layers, granular band, spinous cells, basal row, corkscrew sweat ducts and pores), the
//     dermis (papillae, capillary loops, Meissner corpuscles, collagen, sweat coils), the nerve bundle at
//     SKIN.nerve (myelinated fibres, perineurium, nodes, branches up to the corpuscles), the venule at VESSEL
//     with its arteriole, and fat lobules with a Pacinian corpuscle, fading into darkness below.
//   * Live: touch → a Meissner corpuscle fires → the signal drops down its branch and races along the nerve
//     (electric white, long trail, node flashes). Label "120 m/s" with a hairline leader to the nerve.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, P, SKIN, VESSEL, SIZE, microK } from '../env.js';
import { at as camAt } from '../camera.js';
import { thumbOutline } from './s00-hook.js';

const { W, H } = L;

// ------------------------------------------------------------------ geometry (world metres, x-periodic)
export const RIDGE = SIZE.ridge;
const NR = 16, TW = NR * RIDGE;                 // tile period: 8 mm
export const X0 = P.skin.x - 3.25e-3;           // tile origin
const Y0 = SKIN.surface - 0.3e-3;               // tile top (air)
const Y1 = SKIN.fat + 2.4e-3;                   // tile bottom (fades into darkness)
const TM = 3e-6;                                // tile metres per pixel
const NH = SIZE.nerve / 2;                      // nerve half-thickness
export const PULSE_V = 14e-3;                   // on-screen pulse speed (m/s of world): ≈ 3000 px/s at the hold
export const PULSE_CORE = [236, 248, 255], PULSE_GLOW = [120, 190, 255];

const hsh = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
/** Periodic value noise over the tile period, in [-1, 1]. */
function pn(u, cell, seed) {
  const n = Math.max(1, Math.round(TW / cell));
  const x = ((((u / TW) % 1) + 1) % 1) * n, i = Math.floor(x), f = x - i;
  return L.lerp(hsh(i % n, seed), hsh((i + 1) % n, seed), L.smoothstep(f)) * 2 - 1;
}
const wrapU = (x) => ((((x - X0) % TW) + TW) % TW);
// organic ridges: each ridge a little wider/narrower (phase warp) and taller/lower (amplitude), all periodic
const ridgeU = (u) => u + 0.1 * RIDGE * pn(u, RIDGE * 2, 13);
const ridgeA = (u) => 1 + 0.45 * pn(u, RIDGE, 14) + 0.15 * pn(u, RIDGE / 3, 15);
export const surfY = (u) => SKIN.surface - 42e-6 * ridgeA(u) * (2 * Math.pow(Math.abs(Math.sin(Math.PI * ridgeU(u) / RIDGE)), 0.55) - 1) + 5e-6 * pn(u, 0.25e-3, 1) + 16e-6 * pn(u, RIDGE * 1.5, 19);
export const juncY = (u) => {
  const w = ridgeU(u);
  const g = (1 + Math.cos(4 * Math.PI * w / RIDGE)) / 2;
  const deep = L.lerp(50e-6, 105e-6, (1 - Math.cos(2 * Math.PI * w / RIDGE)) / 2) * (1 + 0.28 * pn(u, RIDGE / 2, 16));
  return SKIN.dermis - 80e-6 + (80e-6 + deep) * Math.pow(g, 0.62) + 9e-6 * pn(u, 0.2e-3, 2) + 5e-6 * pn(u, 0.07e-3, 17);
};
const fatY = (u) => SKIN.fat + 70e-6 * pn(u, 0.4e-3, 3) + 25e-6 * pn(u, 0.125e-3, 4);
export const nerveY = (u) => SKIN.nerve + 14e-6 * pn(u, 1.0e-3, 5);
const plexY = (u) => SKIN.dermis + 230e-6 + 30e-6 * pn(u, 0.5e-3, 6) + 14e-6 * pn(u, 0.16e-3, 18);
const ART = { y: VESSEL.y + 95e-6, r: 11e-6 };

// one Meissner corpuscle per ridge (alternating papillae), each wired to the nerve by a branch
export const CORP = Array.from({ length: NR }, (_, i) => {
  const u = (i + (i % 2 ? 0.75 : 0.25)) * RIDGE + 12e-6 * (hsh(i, 9) - 0.5);
  const cy = juncY(u) + 62e-6;
  const ub = u + (60 + 220 * hsh(i, 10)) * 1e-6;
  return { u, cy, rx: 21e-6, ry: 50e-6, ub, j: hsh(i, 11) };
});
/** Point on corpuscle i's branch (s = 0 at the corpuscle, 1 at the nerve), in tile-local u / world y. */
export function branchPt(cp, s) {
  const ax = cp.u, ay = cp.cy + cp.ry, bx = cp.ub, by = nerveY(cp.ub) - NH + 10e-6;
  const j = cp.j, c1x = ax - 40e-6 + 80e-6 * j, c1y = ay + (140 + 120 * j) * 1e-6, c2x = bx - (20 + 70 * j) * 1e-6, c2y = by - (120 + 160 * (1 - j)) * 1e-6;
  const m = 1 - s;
  return [m * m * m * ax + 3 * m * m * s * c1x + 3 * m * s * s * c2x + s * s * s * bx,
    m * m * m * ay + 3 * m * m * s * c1y + 3 * m * s * s * c2y + s * s * s * by];
}
const FIBRES = [-0.66, -0.44, -0.22, 0.0, 0.22, 0.44, 0.66].map((k, i) => ({ k, w: 19e-6 + 6e-6 * hsh(i, 21), ph: hsh(i, 22) * 1e-3 }));
const PULSE_FIBRE = 2;                         // the fibre the signal travels in
const fibreY = (f, u) => nerveY(u) + f.k * NH + 4e-6 * Math.sin((u + f.ph) / 70e-6 * Math.PI);
const NODE = 0.6e-3;                            // node-of-Ranvier spacing (drawn), periodic over the tile

// ------------------------------------------------------------------ tile (built once per page)
let TILE = null;
function buildTile() {
  const tw = Math.round(TW / TM), th = Math.round((Y1 - Y0) / TM);
  const cv = new OffscreenCanvas(tw, th), g = cv.getContext('2d');
  const TX = (u) => u / TM, TY = (y) => (y - Y0) / TM;
  const r = L.rng(4404);
  const STEP = 4;                                // px between curve samples
  const curve = (fn, x0 = -12, x1 = tw + 12, off = 0) => { for (let x = x0; x <= x1; x += STEP) { const y = TY(fn(x * TM) + off); x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); } };
  const wrap3 = (fn) => { for (const o of [-tw, 0, tw]) { g.save(); g.translate(o, 0); fn(); g.restore(); } };
  const blob = (x, y, rx, ry, col, a, rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx); g.beginPath(); g.arc(0, 0, Math.max(0, rx), 0, Math.PI * 2); g.restore(); g.fillStyle = L.rgba(col, a); g.fill(); };

  // --- dermis base (everything below the junction)
  g.beginPath(); curve(juncY); g.lineTo(tw + 12, th); g.lineTo(-12, th); g.closePath();
  let gr = g.createLinearGradient(0, TY(SKIN.dermis - 0.1e-3), 0, TY(SKIN.fat));
  gr.addColorStop(0, 'rgb(168,70,80)'); gr.addColorStop(0.25, 'rgb(146,52,66)'); gr.addColorStop(1, 'rgb(112,34,50)');
  g.fillStyle = gr; g.fill();
  // --- collagen: fine and random in the papillary dermis, thick wavy bundles below
  g.save();
  g.beginPath(); curve(juncY); g.lineTo(tw + 12, th); g.lineTo(-12, th); g.closePath(); g.clip();
  g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const u = r() * TW, deep = r();
    const y = L.lerp(SKIN.dermis - 40e-6, SKIN.fat + 40e-6, Math.pow(deep, 0.8));
    const papillary = y < SKIN.dermis + 0.28e-3;
    const len = (papillary ? 25 + 50 * r() : 80 + 220 * r()) * 1e-6;
    const ang = papillary ? (r() - 0.5) * 2.4 : (r() - 0.5) * 0.5;
    const wav = (4 + 8 * r()) * 1e-6;
    const lw = papillary ? 1 + r() * 1.4 : 2 + r() * 6;
    const light = r() < 0.55;
    g.strokeStyle = light ? `rgba(222,140,148,${0.05 + 0.1 * r()})` : `rgba(78,18,36,${0.06 + 0.12 * r()})`;
    g.lineWidth = lw;
    wrap3(() => {
      g.beginPath();
      const n = 10;
      for (let k = 0; k <= n; k++) {
        const s = k / n, px = u + Math.cos(ang) * len * s, py = y + Math.sin(ang) * len * s + Math.sin(s * Math.PI * 3 + i) * wav;
        k ? g.lineTo(TX(px), TY(py)) : g.moveTo(TX(px), TY(py));
      }
      g.stroke();
    });
  }
  // fibroblast nuclei
  for (let i = 0; i < 900; i++) {
    const u = r() * TW, y = L.lerp(SKIN.dermis - 30e-6, SKIN.fat, r());
    wrap3(() => blob(TX(u), TY(y), 2.2 + r() * 1.6, 0.9 + r() * 0.5, [70, 24, 72], 0.45 + 0.3 * r(), (r() - 0.5) * 0.6));
  }
  g.restore();

  // --- sweat glands: a coil in the deep dermis + a wavy duct up to the rete peg under every ridge crest
  for (let i = 0; i < NR; i++) {
    const u = (i + 0.5) * RIDGE + 20e-6 * (hsh(i, 31) - 0.5), top = juncY(u) - 10e-6;
    const coil = i % 2 === 0;
    const cy = SKIN.fat - 0.15e-3 + 0.12e-3 * hsh(i, 32), cx = u + 0.12e-3 * (hsh(i, 33) - 0.5);
    wrap3(() => {
      const duct = () => { g.beginPath(); const n = 40; for (let k = 0; k <= n; k++) { const s = k / n; const y = L.lerp(coil ? cy - 50e-6 : SKIN.fat - 0.3e-3, top, s); const x = L.lerp(coil ? cx : u, u, s) + Math.sin(s * 9 + i) * 16e-6 + Math.sin(s * 3.1 + i * 2.3) * 14e-6 * s * (1 - s) * 4; k ? g.lineTo(TX(x), TY(y)) : g.moveTo(TX(x), TY(y)); } g.stroke(); };
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(206,150,176,0.32)'; g.lineWidth = 6; duct();
      g.strokeStyle = 'rgba(250,215,225,0.35)'; g.lineWidth = 1.4; duct();
      if (coil) {
        // a tangled tube: a smoothed random walk held inside a small ellipse
        const rw = L.rng(700 + i), pts = [];
        let px = cx, py = cy, a = rw() * 6.28;
        for (let k = 0; k < 46; k++) {
          a += (rw() - 0.5) * 1.9;
          px += Math.cos(a) * 26e-6; py += Math.sin(a) * 18e-6;
          const ex = (px - cx) / 110e-6, ey = (py - cy) / 70e-6;
          if (ex * ex + ey * ey > 1) { a += Math.PI * 0.8; px = cx + (px - cx) * 0.8; py = cy + (py - cy) * 0.8; }
          pts.push([px, py]);
        }
        const tube = (lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(TX(pts[0][0]), TY(pts[0][1])); for (let k = 1; k < pts.length - 1; k++) g.quadraticCurveTo(TX(pts[k][0]), TY(pts[k][1]), TX((pts[k][0] + pts[k + 1][0]) / 2), TY((pts[k][1] + pts[k + 1][1]) / 2)); g.stroke(); };
        tube(11, 'rgba(120,60,110,0.35)'); tube(7, 'rgba(214,160,190,0.45)'); tube(2, 'rgba(255,230,236,0.45)');
      }
    });
  }

  // --- blood supply: subpapillary plexus + capillary loops up into each papilla, connectors, venule + arteriole
  g.lineCap = 'round'; g.lineJoin = 'round';
  const vesselStroke = (draw, lw, glow = 0.12) => {
    g.strokeStyle = `rgba(214,60,70,${glow})`; g.lineWidth = lw * 3.2 + 6; draw();
    g.strokeStyle = 'rgba(70,6,18,0.45)'; g.lineWidth = lw + 2.5; draw();
    g.strokeStyle = 'rgb(168,34,48)'; g.lineWidth = lw; draw();
    g.strokeStyle = 'rgba(255,150,150,0.3)'; g.lineWidth = Math.max(0.8, lw * 0.3); draw();
  };
  vesselStroke(() => { g.beginPath(); curve(plexY); g.stroke(); }, 3.4, 0.08);
  for (let i = 0; i < NR * 2; i++) {
    // one loop per papilla, at the papilla's actual (warped) position, with its own lean, width and bow
    const u = i * RIDGE / 2 + 0.25 * RIDGE + 0.05 * RIDGE * (hsh(i, 71) - 0.5);
    const tip = juncY(u) + (14 + 10 * hsh(i, 72)) * 1e-6, base = plexY(u);
    const hw = (11 + 9 * hsh(i, 73)) * 1e-6, lean = (hsh(i, 74) - 0.5) * 50e-6, bow = (hsh(i, 75) - 0.5) * 30e-6;
    const lw = 1.6 + 1.4 * hsh(i, 76);
    const mid = L.lerp(base, tip, 0.5);
    wrap3(() => vesselStroke(() => {
      g.beginPath();
      g.moveTo(TX(u - hw * 1.4), TY(base));
      g.bezierCurveTo(TX(u - hw * 0.6 + bow), TY(mid), TX(u + lean - hw * 1.3), TY(tip + 10e-6), TX(u + lean), TY(tip - 5e-6));
      g.bezierCurveTo(TX(u + lean + hw * 1.3), TY(tip + 10e-6), TX(u + hw * 0.7 + bow), TY(mid), TX(u + hw * 1.6), TY(base));
      g.stroke();
    }, lw));
  }
  for (let i = 0; i < 5; i++) {   // connectors from the venule up to the plexus
    const u = (i + 0.3 + 0.4 * hsh(i, 41)) * TW / 5;
    wrap3(() => vesselStroke(() => { g.beginPath(); g.moveTo(TX(u), TY(VESSEL.y)); g.bezierCurveTo(TX(u + 60e-6), TY(VESSEL.y - 0.2e-3), TX(u - 50e-6), TY(plexY(u) + 0.15e-3), TX(u + 20e-6), TY(plexY(u))); g.stroke(); }, 3));
  }
  // arteriole (thick wall, narrow lumen)
  g.beginPath(); curve((x) => ART.y + 6e-6 * pn(x, 0.8e-3, 7)); g.strokeStyle = 'rgba(70,10,26,0.6)'; g.lineWidth = (ART.r * 2 + 22e-6) / TM + 3; g.stroke();
  g.strokeStyle = 'rgb(196,104,122)'; g.lineWidth = (ART.r * 2 + 22e-6) / TM; g.stroke();
  g.strokeStyle = 'rgb(150,24,40)'; g.lineWidth = ART.r * 2 / TM; g.stroke();
  // venule (exact: s06 dives into it): wall, lumen, highlight
  const vy = TY(VESSEL.y), vr = VESSEL.r / TM;
  g.fillStyle = 'rgba(60,6,16,0.6)'; g.fillRect(0, vy - vr - 4, tw, 2 * vr + 8);
  g.fillStyle = 'rgb(206,128,138)'; g.fillRect(0, vy - vr - 2.2, tw, 2 * vr + 4.4);
  gr = g.createLinearGradient(0, vy - vr, 0, vy + vr);
  gr.addColorStop(0, 'rgb(84,12,24)'); gr.addColorStop(0.5, 'rgb(138,26,38)'); gr.addColorStop(1, 'rgb(76,10,22)');
  g.fillStyle = gr; g.fillRect(0, vy - vr, tw, 2 * vr);

  // --- the nerve bundle: perineurium, endoneurium, myelinated fibres with nodes, branches to the corpuscles
  const nTop = (x) => nerveY(x) - NH, nBot = (x) => nerveY(x) + NH;
  g.beginPath(); curve(nTop, -12, tw + 12, -14e-6); for (let x = tw + 12; x >= -12; x -= STEP) g.lineTo(x, TY(nBot(x * TM) + 22e-6)); g.closePath();
  g.fillStyle = 'rgba(60,14,34,0.5)'; g.fill();
  const bundle = () => { g.beginPath(); curve(nTop); for (let x = tw + 12; x >= -12; x -= STEP) g.lineTo(x, TY(nBot(x * TM))); g.closePath(); };
  bundle();
  gr = g.createLinearGradient(0, TY(SKIN.nerve - NH), 0, TY(SKIN.nerve + NH));
  gr.addColorStop(0, 'rgb(196,150,158)'); gr.addColorStop(0.5, 'rgb(170,120,134)'); gr.addColorStop(1, 'rgb(120,74,94)');
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  for (const f of FIBRES) {
    const lw = f.w / TM;
    const fpath = (dy = 0) => { g.beginPath(); for (let x = -12; x <= tw + 12; x += STEP) { const y = TY(fibreY(f, x * TM)) + dy; x === -12 ? g.moveTo(x, y) : g.lineTo(x, y); } };
    fpath(); g.strokeStyle = 'rgba(96,46,70,0.75)'; g.lineWidth = lw + 3.5; g.stroke();
    fpath(); g.strokeStyle = 'rgb(240,222,204)'; g.lineWidth = lw; g.stroke();
    fpath(-lw * 0.22); g.strokeStyle = 'rgba(255,250,240,0.7)'; g.lineWidth = lw * 0.28; g.stroke();
    fpath(lw * 0.3); g.strokeStyle = 'rgba(170,120,120,0.45)'; g.lineWidth = lw * 0.3; g.stroke();
    fpath(); g.strokeStyle = 'rgba(176,120,134,0.9)'; g.lineWidth = Math.max(1, lw * 0.2); g.stroke();
    // nodes of Ranvier: short constrictions
    for (let n = 0; n < Math.round(TW / NODE); n++) {
      const u = n * NODE + f.ph % NODE, y = TY(fibreY(f, u));
      g.fillStyle = 'rgba(110,56,80,0.95)'; g.fillRect(TX(u) - 1.5, y - lw * 0.6, 3, lw * 1.2);
    }
  }
  // bands of Fontana (the wavy fibres catch the light in diagonal stripes)
  g.strokeStyle = 'rgba(255,240,230,0.07)'; g.lineWidth = 5;
  for (let x = -40; x < tw + 40; x += 14) { g.beginPath(); g.moveTo(x, TY(SKIN.nerve - NH - 20e-6)); g.lineTo(x + 22, TY(SKIN.nerve + NH + 20e-6)); g.stroke(); }
  // cylinder shading: lit from above, a soft specular line, shadow underneath
  gr = g.createLinearGradient(0, TY(SKIN.nerve - NH), 0, TY(SKIN.nerve + NH));
  gr.addColorStop(0, 'rgba(255,240,230,0.28)'); gr.addColorStop(0.22, 'rgba(255,240,230,0.06)'); gr.addColorStop(0.55, 'rgba(40,6,20,0)'); gr.addColorStop(1, 'rgba(40,6,20,0.5)');
  g.fillStyle = gr; g.fillRect(0, 0, tw, th);
  g.restore();
  for (const [off, a, lw] of [[0, 0.8, 2.6], [7e-6, 0.3, 1.2], [14e-6, 0.16, 1]]) {
    g.strokeStyle = `rgba(255,226,214,${a})`; g.lineWidth = lw;
    g.beginPath(); curve(nTop, -12, tw + 12, off); g.stroke();
    g.strokeStyle = `rgba(90,30,56,${a})`;
    g.beginPath(); curve(nBot, -12, tw + 12, -off); g.stroke();
  }
  // branches + corpuscles
  for (const cp of CORP) {
    wrap3(() => {
      const path = () => { g.beginPath(); for (let k = 0; k <= 30; k++) { const [x, y] = branchPt(cp, k / 30); k ? g.lineTo(TX(x), TY(y)) : g.moveTo(TX(x), TY(y)); } };
      path(); g.strokeStyle = 'rgba(90,40,60,0.55)'; g.lineWidth = 5; g.stroke();
      path(); g.strokeStyle = 'rgba(244,222,206,0.9)'; g.lineWidth = 2.6; g.stroke();
      // Meissner corpuscle: capsule + stacked lamellae ("pile of coins")
      const cx = TX(cp.u), cy = TY(cp.cy), rx = cp.rx / TM, ry = cp.ry / TM;
      g.save(); g.translate(cx, cy);
      g.beginPath(); g.ellipse(0, 0, rx + 2, ry + 2, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(80,30,60,0.5)'; g.fill();
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      const cg = g.createRadialGradient(-rx * 0.3, -ry * 0.3, 0, 0, 0, ry);
      cg.addColorStop(0, 'rgb(248,226,232)'); cg.addColorStop(1, 'rgb(196,150,176)');
      g.fillStyle = cg; g.fill();
      g.save(); g.clip();
      g.strokeStyle = 'rgba(140,90,130,0.6)'; g.lineWidth = 1;
      for (let k = -6; k <= 6; k++) { const y = k * ry / 6.5; g.beginPath(); g.moveTo(-rx, y + 1.5); g.quadraticCurveTo(0, y - 2.5, rx, y + 1.5); g.stroke(); }
      g.restore();
      g.restore();
    });
  }

  // --- fat: packed adipocytes with lobule septa, a Pacinian corpuscle
  g.save();
  g.beginPath(); curve(fatY); g.lineTo(tw + 12, th); g.lineTo(-12, th); g.closePath();
  g.fillStyle = 'rgb(104,48,48)'; g.fill();
  g.clip();
  const sp = 84e-6, rows = Math.ceil((Y1 - SKIN.fat + 0.2e-3) / (sp * 0.866)), cols = Math.round(TW / sp);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = (i + (j % 2) * 0.5) * sp + 22e-6 * (hsh(i * 7 + j, 51) - 0.5);
      const y = SKIN.fat - 0.12e-3 + j * sp * 0.866 + 20e-6 * (hsh(i + j * 13, 52) - 0.5);
      const rr = sp * (0.4 + 0.22 * hsh(i * 3 + j * 5, 53)) / TM, tone = 0.75 + 0.25 * (0.5 + 0.5 * pn(u, 0.5e-3, 54 + (j >> 3)));
      wrap3(() => {
        const x = TX(u), yy = TY(y);
        if (x < -rr - 2 || x > tw + rr + 2) return;
        const cg = g.createRadialGradient(x - rr * 0.3, yy - rr * 0.35, rr * 0.1, x, yy, rr);
        cg.addColorStop(0, L.rgba(L.mix([118, 80, 56], [176, 146, 110], tone))); cg.addColorStop(0.7, L.rgba(L.mix([106, 70, 50], [160, 124, 84], tone))); cg.addColorStop(1, 'rgb(122,80,56)');
        g.fillStyle = cg;
        g.beginPath(); g.arc(x, yy, Math.max(0, rr), 0, Math.PI * 2); g.fill();
      });
    }
  }
  // septa between lobules
  g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    let u = hsh(i, 61) * TW, y = SKIN.fat;
    const pts = [];
    for (let k = 0; k < 14; k++) { pts.push([u, y]); u += (hsh(i * 20 + k, 62) - 0.5) * 0.22e-3; y += 0.14e-3 + 0.05e-3 * hsh(i * 20 + k, 63); }
    wrap3(() => {
      const path = () => { g.beginPath(); g.moveTo(TX(pts[0][0]), TY(pts[0][1])); for (let k = 1; k < pts.length - 1; k++) { const mx = (pts[k][0] + pts[k + 1][0]) / 2, my = (pts[k][1] + pts[k + 1][1]) / 2; g.quadraticCurveTo(TX(pts[k][0]), TY(pts[k][1]), TX(mx), TY(my)); } };
      path(); g.strokeStyle = 'rgba(110,36,52,0.6)'; g.lineWidth = 7; g.stroke();
      path(); g.strokeStyle = 'rgba(206,120,128,0.3)'; g.lineWidth = 2; g.stroke();
    });
  }
  // Pacinian corpuscle (an onion of lamellae) in the upper fat, right of the dive point
  {
    const u = wrapU(P.skin.x + 2.75e-3), y = SKIN.fat + 1.45e-3, rx = 0.33e-3 / TM, ry = 0.17e-3 / TM;
    wrap3(() => {
      g.save(); g.translate(TX(u), TY(y)); g.rotate(-0.12);
      g.beginPath(); g.ellipse(0, 0, rx + 5, ry + 5, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(70,24,40,0.6)'; g.fill();
      for (let k = 14; k >= 1; k--) {
        const s = k / 14;
        g.beginPath(); g.ellipse(rx * 0.06 * (1 - s), 0, rx * s, ry * (0.25 + 0.75 * s), 0, 0, Math.PI * 2);
        g.fillStyle = L.rgba(L.mix([250, 228, 230], [206, 160, 184], s), 1); g.fill();
        g.strokeStyle = `rgba(150,96,130,${0.55})`; g.lineWidth = 1.2; g.stroke();
      }
      g.beginPath(); g.moveTo(-rx * 0.6, 0); g.lineTo(rx * 0.55, 0); g.strokeStyle = 'rgba(160,110,120,0.9)'; g.lineWidth = 3; g.stroke();
      g.restore();
      // its nerve fibre leaving to the left
      g.beginPath(); g.moveTo(TX(u) - rx, TY(y) + 6); g.bezierCurveTo(TX(u) - rx - 60, TY(y) + 30, TX(u) - rx - 140, TY(y) - 10, TX(u) - rx - 260, TY(y) + 40);
      g.strokeStyle = 'rgba(244,222,206,0.7)'; g.lineWidth = 3.5; g.stroke();
    });
  }
  g.restore();

  // --- epidermis (over everything above the junction)
  g.save();
  g.beginPath(); curve(surfY); for (let x = tw + 12; x >= -12; x -= STEP) g.lineTo(x, TY(juncY(x * TM))); g.closePath();
  gr = g.createLinearGradient(0, TY(SKIN.surface - 60e-6), 0, TY(SKIN.dermis + 100e-6));
  gr.addColorStop(0, 'rgb(234,196,170)'); gr.addColorStop(0.4, 'rgb(220,172,156)'); gr.addColorStop(0.5, 'rgb(170,98,122)');
  gr.addColorStop(0.56, 'rgb(206,144,148)'); gr.addColorStop(1, 'rgb(186,116,128)');
  g.fillStyle = gr; g.fill();
  g.clip();
  // stratum corneum: thin layers following the surface
  for (let k = 1; k <= 22; k++) {
    g.strokeStyle = k % 2 ? `rgba(255,236,214,${0.22 - k * 0.006})` : `rgba(150,96,90,${0.16 - k * 0.004})`;
    g.lineWidth = 1.2;
    const w = Math.min(1, k / 14);
    g.beginPath(); curve((u) => L.lerp(surfY(u), SKIN.surface + 30e-6, w * 0.85), -12, tw + 12, k * 12.5e-6); g.stroke();
  }
  // granular layer: a darker, grainy band
  g.strokeStyle = 'rgba(120,50,96,0.38)'; g.lineWidth = 9;
  g.beginPath(); curve(surfY, -12, tw + 12, 300e-6); g.stroke();
  // spinous cells: nuclei in a loose lattice, down to the basal row
  for (let i = 0; i < 16000; i++) {
    const u = r() * TW, s = r();
    const top = surfY(u) + 300e-6, bot = juncY(u);
    if (bot <= top) continue;
    const y = L.lerp(top, bot, s);
    const x = TX(u), yy = TY(y);
    g.fillStyle = `rgba(${L.lerp(150, 110, s) | 0},60,${L.lerp(110, 90, s) | 0},${0.28 + 0.25 * s})`;
    g.fillRect(x - 1.1, yy - 1.1, 2.2, 2.2);
  }
  // basal row: dark nuclei hugging the junction
  for (let x = -12; x <= tw + 12; x += 3) {
    const u = x * TM, a = Math.atan2(TY(juncY(u + TM)) - TY(juncY(u)), 1);
    blob(x, TY(juncY(u)) - 3.2, 1.9, 1.2, [100, 44, 88], 0.5, a + Math.PI / 2);
  }
  // sweat ducts: corkscrews through the epidermis to a pore on each crest
  for (let i = 0; i < NR; i++) {
    const u = (i + 0.5) * RIDGE + 20e-6 * (hsh(i, 31) - 0.5);
    const y0 = juncY(u), y1 = surfY(u);
    wrap3(() => {
      const helix = (front) => {
        g.beginPath();
        const n = 70;
        for (let k = 0; k <= n; k++) {
          const s = k / n, a = s * Math.PI * 2 * 5.5;
          if ((Math.cos(a) > 0) !== front) { g.moveTo(TX(u + Math.sin(a) * 16e-6), TY(L.lerp(y0, y1, s))); continue; }
          g.lineTo(TX(u + Math.sin(a) * 16e-6), TY(L.lerp(y0, y1, s)));
        }
        g.stroke();
      };
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(120,64,90,0.35)'; g.lineWidth = 3; helix(false);
      g.strokeStyle = 'rgba(255,236,236,0.55)'; g.lineWidth = 2.2; helix(true);
    });
  }
  g.restore();
  // pores: a small dark dimple on each crest
  for (let i = 0; i < NR; i++) {
    const u = (i + 0.5) * RIDGE + 20e-6 * (hsh(i, 31) - 0.5);
    wrap3(() => blob(TX(u), TY(surfY(u)) + 1.5, 5, 2.5, [70, 30, 30], 0.7));
  }
  // surface rim: a fine bright edge (light grazing the ridges)
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,236,220,0.75)'; g.lineWidth = 1.8;
  g.beginPath(); curve(surfY); g.stroke();
  g.strokeStyle = 'rgba(255,200,170,0.18)'; g.lineWidth = 7;
  g.beginPath(); curve(surfY, -12, tw + 12, 3e-6); g.stroke();

  // --- lighting: darker with depth, then dissolve into the dark below the fat
  g.globalCompositeOperation = 'source-atop';
  gr = g.createLinearGradient(0, TY(SKIN.surface), 0, th);
  gr.addColorStop(0, 'rgba(10,2,6,0)'); gr.addColorStop(0.35, 'rgba(10,2,6,0.12)');
  gr.addColorStop(0.62, 'rgba(36,8,16,0.3)'); gr.addColorStop(0.85, 'rgba(36,8,16,0.75)'); gr.addColorStop(1, 'rgba(36,8,16,1)');
  g.fillStyle = gr; g.fillRect(0, 0, tw, th);
  g.globalCompositeOperation = 'source-over';
  TILE = cv;
  return cv;
}

/** Draws an image tile placed at world (x0, y0) with `tm` metres per tile pixel; x-periodic if `periodic`. */
export function drawTile(c, v, img, x0, y0, tm, periodic = true) {
  const mpp = v.cam.mpp, anc = v.cam.anchor ?? 0.5;
  const xa = v.cam.x - (W / 2 + 4) * mpp, xb = v.cam.x + (W / 2 + 4) * mpp;
  const ya = v.cam.y - (H * anc + 4) * mpp, yb = v.cam.y + (H * (1 - anc) + 4) * mpp;
  const tw = img.width * tm, th = img.height * tm;
  const y0c = Math.max(ya, y0), y1c = Math.min(yb, y0 + th);
  if (y1c <= y0c) return;
  const sy = (y0c - y0) / tm, sh = Math.min(img.height - sy, (y1c - y0c) / tm);
  const nA = periodic ? Math.floor((xa - x0) / tw) : 0, nB = periodic ? Math.floor((xb - x0) / tw) : 0;
  for (let n = nA; n <= nB; n++) {
    const bx = x0 + n * tw;
    const x0c = Math.max(xa, bx), x1c = Math.min(xb, bx + tw);
    if (x1c <= x0c) continue;
    const sx = (x0c - bx) / tm, sw = Math.min(img.width - sx, (x1c - x0c) / tm);
    if (sw <= 0 || sh <= 0) continue;
    c.drawImage(img, sx, sy, sw, sh, v.wx(x0c) - 0.3, v.wy(y0c), (x1c - x0c) / mpp + 0.6, (y1c - y0c) / mpp);
  }
}

// ------------------------------------------------------------------ timing
/** Is the camera in the thumb's part of the film (beats 4-9)? Also gated by screen distance. */
export function nearSkin(v) {
  const sc = v.tl.scenes;
  if (v.gt < sc[4].start - 0.3 || v.gt > sc[10].start + 0.3) return false;
  if (Math.hypot(v.cam.x - P.skin.x, v.cam.y - P.skin.y) < 6e-3) return true;
  const dx = v.wx(P.skin.x) - W / 2, dy = v.wy(P.skin.y) - H / 2;
  return Math.abs(dx) < 2600 && Math.abs(dy) < 3200;
}
/** The iris that opens the section out of the thumb pad (0 closed … 1 fully open). */
export const irisK = (v) => microK(v, 2.2e-5, 6.5e-6);

/** Pulse schedule (global seconds) + the corpuscle that fires each one (chosen by where the camera will be). */
let PULSES = null, PT = null;
export function pulses(tl) {
  if (PULSES && PT === tl) return PULSES;
  const s4 = tl.scenes[4].start, s5 = tl.scenes[5].start;
    const plan = [[s4 + 1.85, 250], [s4 + 3.2, 330], [s4 + 4.45, 190], [s5 + 0.55, 300], [s5 + 1.7, 230]];
  PULSES = plan.map(([T, sxWant]) => {
    const cam = camAt(T + 0.3, tl);
    const xw = cam.x + (sxWant - W / 2) * cam.mpp;
    // nearest corpuscle in world x
    let best = null, bd = 1e9;
    const n = Math.floor((xw - X0) / TW);
    for (const k of [n - 1, n, n + 1]) for (const cp of CORP) { const x = X0 + k * TW + cp.u; const d = Math.abs(x - xw); if (d < bd) { bd = d; best = { cp, ox: X0 + k * TW }; } }
    return { T, cp: best.cp, ox: best.ox, main: T < s5 };
  });
  PT = tl;
  return PULSES;
}
const FIRE = 0.16, DROP = 0.24;                 // corpuscle glow, then the descent down the branch

function drawPulse(c, v, p, gain) {
  const tt = v.gt - p.T;
  if (tt < -0.05) return;
  const { cp, ox } = p;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // 1. the corpuscle fires (a pressure ripple at the surface above it, then the corpuscle glows)
  const fk = L.clamp(tt / FIRE) * Math.exp(-Math.max(0, tt - FIRE) * 3.2);
  if (fk > 0.01) {
    const cx = v.wx(ox + cp.u), cy = v.wy(cp.cy);
    L.lightBlob(c, cx, cy, v.ws(150e-6), PULSE_GLOW, 0.55 * fk * gain);
    L.lightBlob(c, cx, cy, v.ws(50e-6), PULSE_CORE, 0.7 * fk * gain);
    const rp = L.clamp(tt / 0.6);
    if (rp < 1) {
      const sy = v.wy(surfY(cp.u) - 10e-6);
      c.strokeStyle = L.rgba(PULSE_CORE, 0.35 * (1 - rp) * gain); c.lineWidth = 2;
      c.beginPath(); c.ellipse(cx, sy, Math.max(0, v.ws(60e-6 + 260e-6 * rp)), Math.max(0, v.ws(20e-6 + 60e-6 * rp)), 0, 0, Math.PI); c.stroke();
    }
  }
  // 2. the signal drops down the branch
  const dk = L.prog(tt, FIRE * 0.6, DROP);
  if (dk > 0 && tt < FIRE * 0.6 + DROP + 0.25) {
    const s1 = L.ease.inCubic(dk), s0 = Math.max(0, s1 - 0.45);
    const fade = 1 - L.prog(tt, FIRE * 0.6 + DROP, 0.25);
    c.lineCap = 'round';
    c.beginPath();
    for (let k = 0; k <= 16; k++) { const [x, y] = branchPt(cp, L.lerp(s0, s1, k / 16)); k ? c.lineTo(v.wx(ox + x), v.wy(y)) : c.moveTo(v.wx(ox + x), v.wy(y)); }
    c.strokeStyle = L.rgba(PULSE_GLOW, 0.45 * fade * gain); c.lineWidth = 10; c.stroke();
    c.strokeStyle = L.rgba(PULSE_CORE, 0.9 * fade * gain); c.lineWidth = 3; c.stroke();
    const [hx, hy] = branchPt(cp, s1);
    L.lightBlob(c, v.wx(ox + hx), v.wy(hy), 34, PULSE_CORE, 0.6 * fade * gain);
  }
  // 3. the race along the nerve fibre (+x): bright head, long fading trail, node flashes
  const rt = tt - FIRE * 0.6 - DROP;
  if (rt > 0) {
    const xs = ox + cp.ub, xh = xs + PULSE_V * rt;
    const trail = Math.min(xh - xs, 2.4e-3);
    const xr = v.cam.x + (W / 2 + 200) * v.cam.mpp;
    if (xh - trail < xr) {
      const f = FIBRES[PULSE_FIBRE];
      const yOf = (x) => v.wy(fibreY(f, wrapU(x)));
      const hx = v.wx(xh), hy = yOf(xh);
      const n = 40;
      const pts = [];
      for (let k = 0; k <= n; k++) { const x = xh - trail * (k / n); pts.push([v.wx(x), yOf(x)]); }
      // trail: three passes, glow → core
      for (const [lw, col, a] of [[26, PULSE_GLOW, 0.16], [9, PULSE_GLOW, 0.45], [3.2, PULSE_CORE, 0.95]]) {
        for (let k = 0; k < n; k++) {
          const fall = Math.pow(1 - k / n, 2.2);
          c.strokeStyle = L.rgba(col, a * fall * gain);
          c.lineWidth = lw * (0.5 + 0.5 * (1 - k / n));
          c.beginPath(); c.moveTo(pts[k][0], pts[k][1]); c.lineTo(pts[k + 1][0], pts[k + 1][1]); c.stroke();
        }
      }
      // the whole bundle glows around the head
      c.save(); c.translate(hx, v.wy(nerveY(wrapU(xh)))); c.scale(1, 0.32);
      const bg = c.createRadialGradient(0, 0, 0, 0, 0, 340);
      bg.addColorStop(0, L.rgba(PULSE_GLOW, 0.32 * gain)); bg.addColorStop(1, L.rgba(PULSE_GLOW, 0));
      c.fillStyle = bg; c.fillRect(-340, -340, 680, 680);
      c.restore();
      L.lightBlob(c, hx, hy, 120, PULSE_GLOW, 0.55 * gain);
      L.lightBlob(c, hx, hy, 34, PULSE_CORE, 1.0 * gain);
      // nodes of Ranvier flash as the head jumps past
      const n0 = Math.ceil((xh - trail - (X0 + f.ph % NODE)) / NODE), n1 = Math.floor((xh - (X0 + f.ph % NODE)) / NODE);
      for (let m = n0; m <= n1; m++) {
        const xn = X0 + f.ph % NODE + m * NODE;
        const since = (xh - xn) / PULSE_V;
        const a = Math.exp(-since * 9);
        if (a < 0.02) continue;
        L.lightBlob(c, v.wx(xn), yOf(xn), 46, PULSE_CORE, 0.8 * a * gain);
      }
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ the fingerprint bridge (face-on, on the thumb pad)
function drawPrint(c, v, k) {
  if (k <= 0) return;
  const cx = P.skin.x + 1.0e-3, cy = P.skin.y + 3.2e-3;
  const lw = Math.max(0.7, v.ws(0.17e-3));
  c.save();
  // clipped to the thumb (s00's outline), so the whorl covers the whole pad and never spills off it
  c.beginPath(); thumbOutline(c, v); c.clip();
  // a warm subsurface glow in the pad: the target lights up as the camera dives
  L.lightBlob(c, v.wx(cx), v.wy(cy), v.ws(7e-3), [235, 120, 120], 0.16 * k);
  c.lineCap = 'round';
  for (let i = 1; i <= 22; i++) {
    const rk = i * RIDGE * 0.94;
    const a = k * (1 - L.smoothstep(L.clamp((rk - 6.5e-3) / 4e-3)));
    if (a <= 0.01) continue;
    const n = 40 + i * 8;
    c.beginPath();
    for (let j = 0; j <= n; j++) {
      const th = (j / n) * Math.PI * 2;
      const rr = rk * (1 + 0.05 * L.noise1(th * 1.6 + i * 0.7, 7)) + (i < 3 ? 0.15e-3 * Math.sin(th) : 0);
      const x = v.wx(cx + Math.cos(th) * rr * 1.15), y = v.wy(cy + Math.sin(th) * rr * 0.72 - (i < 4 ? 0 : 0.12e-3 * Math.cos(th * 2)));
      j ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = `rgba(14,8,14,${0.35 * a})`; c.lineWidth = lw * 1.8; c.stroke();
    c.strokeStyle = `rgba(255,214,200,${0.3 * a})`; c.lineWidth = lw; c.stroke();
  }
  // a soft sheen over the pad
  L.lightBlob(c, v.wx(cx - 1.2e-3), v.wy(cy - 1.6e-3), v.ws(3.5e-3), [255, 200, 190], 0.12 * k);
  c.restore();
}

// ------------------------------------------------------------------ the section (air, tile, live layer)
function drawSection(c, v) {
  const tile = TILE || buildTile();
  // air: near-black, a warm glow just above the surface (light leaking out of the skin)
  const ag = c.createLinearGradient(0, v.wy(SKIN.surface - 2.4e-3), 0, v.wy(SKIN.surface));
  ag.addColorStop(0, 'rgb(12,6,10)'); ag.addColorStop(1, 'rgb(30,10,16)');
  c.fillStyle = ag; c.fillRect(0, 0, W, H);
  const sy = v.wy(SKIN.surface);
  if (sy > -40) {
    const gl = c.createLinearGradient(0, sy - v.ws(0.9e-3), 0, sy + 4);
    gl.addColorStop(0, 'rgba(120,36,46,0)'); gl.addColorStop(1, 'rgba(150,52,58,0.38)');
    c.fillStyle = gl; c.fillRect(0, Math.max(0, sy - v.ws(0.9e-3)), W, Math.min(H, v.ws(0.9e-3) + 4));
  }
  drawTile(c, v, tile, X0, Y0, TM, true);
  // below the tile: darkness
  const by = v.wy(Y1);
  if (by < H) { c.fillStyle = 'rgb(36,8,16)'; c.fillRect(0, Math.max(0, by - 1), W, H - by + 1); }
  // a slow light sweep across the section (secondary motion while the camera holds)
  const sw = ((v.gt * 0.11) % 1.6) - 0.3;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const lx = L.lerp(-400, W + 400, sw);
  const lg = c.createLinearGradient(lx - 260, 0, lx + 260, 300);
  lg.addColorStop(0, 'rgba(255,200,180,0)'); lg.addColorStop(0.5, 'rgba(255,200,180,0.035)'); lg.addColorStop(1, 'rgba(255,200,180,0)');
  c.fillStyle = lg; c.fillRect(0, 0, W, H);
  c.restore();
  // a soft dark band at caption height, so the fat texture never competes with the words
  const cb = c.createLinearGradient(0, 1150, 0, 1520);
  cb.addColorStop(0, 'rgba(16,4,8,0)'); cb.addColorStop(0.35, 'rgba(16,4,8,0.34)'); cb.addColorStop(0.65, 'rgba(16,4,8,0.34)'); cb.addColorStop(1, 'rgba(16,4,8,0)');
  c.fillStyle = cb; c.fillRect(0, 1150, W, 370);
  // signals (during s05's timed pitch run they dim, so the pitch pulse is the only bright mover)
  const sc = v.tl.scenes;
  if (v.gt > sc[4].start && v.gt < sc[6].start + 0.6) {
    const run = v.tl.lines[5].phrases[1].start + 0.08;
    const dim = 1 - 0.65 * L.smoothstep(L.prog(v.gt, run - 0.75, 0.4)) * (1 - L.smoothstep(L.prog(v.gt, run + 1.3, 0.6)));
    for (const p of pulses(v.tl)) drawPulse(c, v, p, (p.main ? 1 : 0.8) * dim);
  }
}

let BUF = null, BC = null;
export default {
  beat: 4,
  chapter: { num: '04', title: 'Nerve signals', sub: 'the fastest wiring in your body' },
  captions: true,
  layer: 3,
  cues(d) {
    const out = [{ t: 0.05, name: 'dive', gain: 0.34, pitch: 1.0 }, { t: 1.15, name: 'shimmer', gain: 0.16, pitch: 1.2 }];
    // pulse hits (beat-relative to beat 4; the beat-5 pulses are cued here too, they belong to this nerve)
    [1.85, 3.2, 4.45].forEach((t, i) => {
      out.push({ t, name: 'blip', gain: 0.12, pitch: 1.7 });
      out.push({ t: t + 0.4, name: 'swish', gain: 0.2 - i * 0.02, pitch: 1.8 });
    });
    out.push({ t: 2.45, name: 'ping', gain: 0.26, pitch: 1.15 });
    return out;
  },
  drawWorld(c, v) {
    if (!nearSkin(v)) return;
    const kp = microK(v, 2.4e-4, 9e-5), ki = irisK(v);
    if (kp <= 0) return;
    if (ki < 1) drawPrint(c, v, kp * (1 - L.smoothstep(L.clamp(ki * 1.3))));
    if (ki <= 0) return;
    const R = L.lerp(150, 2500, Math.pow(ki, 1.7));
    const cx = v.wx(P.skin.x), cy = v.wy(P.skin.y);
    if (ki >= 0.999) { drawSection(c, v); return; }
    // the iris: render the section offscreen, feather it with a radial mask
    if (!BUF) { BUF = new OffscreenCanvas(W, H); BC = BUF.getContext('2d'); }
    BC.setTransform(1, 0, 0, 1, 0, 0);
    BC.globalCompositeOperation = 'source-over';
    BC.globalAlpha = 1;
    BC.clearRect(0, 0, W, H);
    drawSection(BC, v);
    // while the lens is small its inside is lit with the warm dermis tone (never a dark hole)
    {
      const wk = 1 - L.smoothstep(L.clamp(ki / 0.97));
      if (wk > 0.01) {
        const wg = BC.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R));
        wg.addColorStop(0, `rgba(176,78,88,${0.6 * wk})`); wg.addColorStop(0.7, `rgba(150,56,70,${0.45 * wk})`); wg.addColorStop(1, `rgba(120,40,56,${0.3 * wk})`);
        BC.fillStyle = wg; BC.fillRect(0, 0, W, H);
      }
    }
    BC.globalCompositeOperation = 'destination-in';
    const mg = BC.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R));
    mg.addColorStop(0, 'rgba(0,0,0,1)'); mg.addColorStop(0.62, 'rgba(0,0,0,1)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
    BC.fillStyle = mg; BC.fillRect(0, 0, W, H);
    BC.globalCompositeOperation = 'source-over';
    c.drawImage(BUF, 0, 0);
    // a faint lens rim on the opening
    c.save();
    c.globalCompositeOperation = 'lighter';
    const rk = 1 - ki;
    const rg = c.createRadialGradient(cx, cy, Math.max(0, R * 0.62), cx, cy, Math.max(1, R * 1.02));
    rg.addColorStop(0, 'rgba(255,150,120,0)'); rg.addColorStop(0.55, `rgba(255,150,120,${0.16 * rk})`); rg.addColorStop(1, 'rgba(255,150,120,0)');
    c.fillStyle = rg; c.fillRect(cx - R * 1.05, cy - R * 1.05, R * 2.1, R * 2.1);
    c.strokeStyle = `rgba(255,200,176,${0.3 * rk})`; c.lineWidth = 1.5;
    c.beginPath(); c.arc(cx, cy, Math.max(0, R * 0.8), 0, Math.PI * 2); c.stroke();
    c.restore();
  },
  drawOverlay(c, v) {
    const t = v.t;
    const k = Math.min(v.k, L.prog(t, 2.4, 0.55));
    if (k <= 0) return;
    // soft dark backing behind the label (it sits in the air above the skin)
    c.save();
    c.globalAlpha = k;
    const bg = c.createRadialGradient(330, 440, 40, 330, 440, 420);
    bg.addColorStop(0, 'rgba(6,2,4,0.5)'); bg.addColorStop(1, 'rgba(6,2,4,0)');
    c.fillStyle = bg; c.fillRect(0, 160, W, 620);
    c.restore();
    // hairline leader: from the nerve up to the label
    const lx = 112, ny = v.wy(nerveY(wrapU(v.cam.x + (lx - W / 2) * v.cam.mpp)) + FIBRES[PULSE_FIBRE].k * NH);
    L.leader(c, lx, ny, lx, 556, Math.min(v.k, L.prog(t, 2.55, 0.6)), [236, 248, 255], 0.7);
    L.bigLabel(c, { x: 96, y: 468, big: '120 m/s', small: '≈ 270 mph · fastest nerve fibres', k, accent: ACCENT, size: 124 });
  },
};
