// Environment for "If the Sun Were a Basketball". Owned by the orchestrator — builders: read, don't edit.
// Top-down ground that changes with zoom (plaza tiles → park → town blocks), orbit-ring helper, globe projection, HUD.
import * as L from '../../../engine/runtime/lib.js';

const { W, H } = L;
export const ACCENT = [255, 160, 70];
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ globe (orthographic, metres; New York = origin)
export const R_EARTH = 6.371e6;
const LAT0 = 45 * DEG, LON0 = -30 * DEG;
function ortho(lat, lon) {
  const p = lat * DEG, l = lon * DEG - LON0;
  const x = R_EARTH * Math.cos(p) * Math.sin(l);
  const yUp = R_EARTH * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l));
  const front = Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l) > 0;
  return { x, y: -yUp, front };
}
const NY0 = ortho(40.71, -74.0);
/** World position (metres, NY = origin) of a lat/lon on the globe; `front` = on the visible hemisphere. */
export function globeXY(lat, lon) { const o = ortho(lat, lon); return { x: o.x - NY0.x, y: o.y - NY0.y, front: o.front }; }
/** Centre of the globe disc in world metres. */
export const GLOBE_C = { x: -NY0.x, y: -NY0.y };
export const NEW_YORK = globeXY(40.71, -74.0);   // = {0, 0}
export const ROME = globeXY(41.9, 12.5);

/** Globe visibility 0..1 by zoom: the ground hands over to the globe between ~60 and ~600 m/px. */
export const globeK = (v) => L.ease.inOutCubic(L.invLerp(Math.log(25), Math.log(1500), Math.log(v.cam.mpp)));

/** Draw an orbit ring of radius r metres around the Sun, drawn on from angle a0 with progress k (0..1). */
export function orbitRing(ctx, v, r, k = 1, a0 = -90, alpha = 0.55, color = [255, 225, 190]) {
  const rr = v.ws(r);
  if (rr < 1 || k <= 0) return;
  ctx.save();
  ctx.strokeStyle = L.rgba(color, alpha);
  ctx.lineWidth = 1.6;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(v.wx(0), v.wy(0), rr, a0 * DEG, (a0 + 360 * L.clamp(k)) * DEG);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ ground
export function drawBackground(c, v) {
  const gk = 1 - globeK(v);
  // deep space behind everything (visible once the ground fades)
  const sg = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.8);
  sg.addColorStop(0, '#0d0f16'); sg.addColorStop(1, '#03040a');
  c.fillStyle = sg;
  c.fillRect(0, 0, W, H);
  starfield(c, v, 1 - gk);
  if (gk <= 0) return;
  c.save();
  c.globalAlpha = gk;
  // ground tone
  c.fillStyle = '#121310';
  c.fillRect(0, 0, W, H);
  const mpp = v.cam.mpp;
  // plaza paving (≤ 0.05 m/px): 0.5 m stone tiles
  // (faded out in the mm-scale macro, where a 0.5 m joint would read as a stray line across the frame)
  tiles(c, v, 0.5, L.clamp(1 - mpp / 0.06) * L.clamp(L.invLerp(0.00035, 0.0006, mpp)), 'rgba(220,200,170,0.06)');
  // park (0.05 … 2 m/px): an irregular, soft-edged ~320 m lawn around the Sun + paths
  const pk = L.clamp(L.invLerp(0.02, 0.08, mpp)) * L.clamp(1 - L.invLerp(1.2, 4, mpp));
  const tk = L.clamp(L.invLerp(0.3, 1.0, mpp)) * L.clamp(1 - L.invLerp(15, 40, mpp));
  // town blocks (≥ 0.4 m/px): 90 m blocks with 14 m streets, clipped around the park by a ring road.
  // Streets are the ground colour, so every gap reads as street. Blocks fade out by 40 m/px (< 3 px).
  if (tk > 0) {
    c.globalAlpha = gk * tk;
    c.save();
    c.beginPath();
    c.rect(-10, -10, W + 20, H + 20);
    parkPath(c, v, 1.075);
    c.clip('evenodd');
    const step = 104, span = Math.min(mpp * 1100, 104 * 120);
    const r = (i, j, s0 = 0) => { const s = Math.sin(i * 127.1 + j * 311.7 + s0 * 74.7) * 43758.5453; return s - Math.floor(s); };
    const fine = v.ws(90) > 24;   // close enough to see lots inside the blocks
    for (let i = Math.floor((v.cam.x - span) / step); i <= (v.cam.x + span) / step; i++) {
      for (let j = Math.floor((v.cam.y - span) / step); j <= (v.cam.y + span) / step; j++) {
        const x0 = i * step + 7, y0 = j * step + 7;
        const shade = 0.035 + r(i, j) * 0.04;
        c.fillStyle = `rgba(200,195,185,${shade})`;
        c.fillRect(v.wx(x0), v.wy(y0), v.ws(90), v.ws(90));
        if (fine) {   // a few darker lots / courtyards inside the block
          const n = 1 + Math.floor(r(i, j, 1) * 3);
          c.fillStyle = 'rgba(0,0,0,0.12)';
          for (let q = 0; q < n; q++) {
            const lx = 8 + r(i, j, 2 + q) * 50, ly = 8 + r(i, j, 5 + q) * 50, lw = 14 + r(i, j, 8 + q) * 22;
            c.fillRect(v.wx(x0 + lx), v.wy(y0 + ly), v.ws(lw), v.ws(lw * (0.6 + r(i, j, 11 + q) * 0.6)));
          }
        }
      }
    }
    c.restore();
    // the ring road around the park: a slightly lighter band
    c.strokeStyle = 'rgba(200,195,185,0.025)';
    c.lineWidth = Math.max(1, v.ws(12));
    c.beginPath(); parkPath(c, v, 1.04); c.stroke();
  }
  if (pk > 0) {
    c.globalAlpha = gk * pk;
    c.save();
    c.fillStyle = 'rgba(40,60,38,0.55)';
    c.shadowColor = 'rgba(40,60,38,0.55)';
    c.shadowBlur = Math.min(24, Math.max(2, v.ws(8)));
    c.beginPath(); parkPath(c, v, 1); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(210,200,170,0.04)';
    c.lineWidth = Math.min(10, Math.max(1, v.ws(3)));
    for (const a of [20, 110, 200, 290]) {   // paths start 15 m out so they never cross the Sun's glow
      const re = 0.96 * parkR(a * DEG);
      c.beginPath(); c.moveTo(v.wx(15 * Math.cos(a * DEG)), v.wy(15 * Math.sin(a * DEG)));
      c.lineTo(v.wx(re * Math.cos(a * DEG)), v.wy(re * Math.sin(a * DEG))); c.stroke();
    }
  }
  c.restore();
}

/** park outline radius (m) at angle a: ~320 m, gently irregular */
const parkR = (a) => 320 * (1 + 0.016 * Math.sin(3 * a + 1.1) + 0.01 * Math.sin(5 * a + 2.3) + 0.005 * Math.sin(9 * a + 0.4));
function parkPath(c, v, scale) {
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2, rr = parkR(a) * scale;
    const x = v.wx(rr * Math.cos(a)), y = v.wy(rr * Math.sin(a));
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}

function tiles(c, v, size, k, color) {
  if (k <= 0) return;
  const span = v.cam.mpp * 1100;
  c.save();
  c.globalAlpha *= k;
  c.strokeStyle = color;
  c.lineWidth = 1;
  c.beginPath();
  const x0 = Math.floor((v.cam.x - span) / size) * size, y0 = Math.floor((v.cam.y - span) / size) * size;
  const n = Math.min(120, Math.ceil(2 * span / size));
  for (let i = 0; i <= n; i++) {
    c.moveTo(v.wx(x0 + i * size), v.wy(y0)); c.lineTo(v.wx(x0 + i * size), v.wy(y0 + n * size));
    c.moveTo(v.wx(x0), v.wy(y0 + i * size)); c.lineTo(v.wx(x0 + n * size), v.wy(y0 + i * size));
  }
  c.stroke();
  c.restore();
}

function starfield(c, v, k) {
  if (k <= 0) return;
  const r = L.rng(21);
  c.save();
  for (let i = 0; i < 160; i++) {
    const x = r() * W, y = r() * H, s = 0.6 + r() * 1.6, ph = r() * 6.28;
    c.fillStyle = `rgba(255,255,255,${k * (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(v.gt * 1.5 + ph)))})`;
    c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

export function drawForeground() {}

// ------------------------------------------------------------------ HUD
const NICE = [1, 2, 5];
function niceLen(m) { const p = Math.pow(10, Math.floor(Math.log10(m))); for (const n of NICE) if (n * p >= m) return n * p; return 10 * p; }
const fmtLen = (m) => (m < 0.01 ? `${L.fmt(m * 1000)} mm` : m < 1 ? `${L.fmt(m * 100)} cm` : m < 1000 ? `${L.fmt(m)} m` : `${L.fmt(m / 1000)} km`);

export function drawHud(c, v) {
  c.save();
  c.font = L.font(20, 600, L.FONT.body);
  c.fillStyle = 'rgba(235,228,220,0.75)';
  c.textBaseline = 'middle';
  L.trackedText(c, `${v.ep.channel}  ·  ${v.ep.episodeLabel}`, 64, 160, 4);
  const s = Math.floor(v.gt), f = Math.floor((v.gt - s) * 30);
  c.font = L.font(20, 400, L.FONT.mono);
  c.textAlign = 'right';
  c.fillText(`00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`, W - 64, 160);
  c.fillStyle = 'rgba(235,228,220,0.18)';
  c.fillRect(64, 182, W - 128, 2);
  c.fillStyle = L.rgba(ACCENT, 0.9);
  c.fillRect(64, 182, (W - 128) * L.clamp(v.gt / v.tl.total), 2);
  c.restore();
  const k = L.ease.outCubic(L.prog(v.gt, 3.5, 0.6));   // after the side-on hook card
  if (k > 0) {
    const len = niceLen(v.cam.mpp * 150), px = len / v.cam.mpp;
    const x1 = W - 64, x0 = x1 - px, y = 238;
    c.save();
    c.globalAlpha = k;
    c.strokeStyle = 'rgba(235,228,220,0.85)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(x0, y - 8); c.lineTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y - 8); c.stroke();
    c.font = L.font(22, 600, L.FONT.body);
    c.fillStyle = 'rgba(235,228,220,0.85)';
    c.textAlign = 'right';
    c.fillText(fmtLen(len), x1, y - 14);
    c.font = L.font(18, 600, L.FONT.body);
    c.fillStyle = 'rgba(235,228,220,0.55)';
    L.trackedText(c, 'SCALE 1 : 5.8 BILLION', x1, y + 26, 2, 'right');
    c.restore();
  }
}

export function cues(tl) {
  return tl.scenes.slice(1).map((s, i) => ({ t: s.start - 0.05, name: i >= 9 ? 'whoosh' : 'swish', gain: 0.2, pitch: i >= 9 ? 0.7 : 1.1 }));
}
