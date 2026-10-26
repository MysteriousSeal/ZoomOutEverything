// Layer "city" (lf 1.4 → 6.4), builder B: the Sheep Meadow, Central Park, Manhattan, the boroughs and the harbour,
// top-down, satellite style, summer afternoon (sun from the lower left; shadows toward the upper right).
//   ground   b-tiles.js / b-paint.js: one world-anchored tile pyramid from 8 mm/px to 2 km/px (real coastlines)
//   people   park-data.js PEOPLE (sunbathers on blankets) and moversAt(gt) (walkers, runners, cyclists), per frame
//   the hero camera.js PERSON on their blanket (tiny), from lf 2.0, so they never vanish when the hand layer fades
// Hand-offs: hand → city [1.6, 2.4] (builder A fades out over 2.0–2.4 on top of this layer); city → earth [5.3, 6.4]
// (this map dissolves over 5.85–6.35 into earth.js's globe, drawn underneath by layers/earth.js in the same projection).
import * as L from '../../../../engine/runtime/lib.js';
import { band } from '../world.js';
import { PERSON, HEAD_DIR } from '../camera.js';
import { PEOPLE, moversAt, PAL } from './park-data.js';
import { drawGround } from './b-tiles.js';
import { P as BODY, BLANKET, BLANKET_WORLD } from './a-hero.js';

const { W, H } = L;
const SHX = 0.6, SHY = -0.8;
export const MAP_FADE = [5.85, 6.35];

// the hero's look (tiny, top-down): matches builder A's hero at the hand-off (blanket, shirt, shorts, skin, hair)
// (builder A's a-hero.js: the same blanket outline and plaid colours, the same body frame; shirt/shorts/hair as A's)
export const HERO = { shirt: [236, 235, 228], shorts: [52, 62, 86], skin: [226, 178, 150], hair: [56, 38, 28] };

let buf = null;
export default {
  draw(c, v) {
    const lf = v.cam.lf;
    const k = band(lf, 1.4, 1.6, MAP_FADE[0], MAP_FADE[1]);
    if (k <= 0) return;
    // far out the map is feathered where the coastline data ends (east of ~Cape Cod, beyond ±500 km)
    const feather = lf > 5.55;
    let g = c;
    if (feather) {
      if (!buf) buf = new OffscreenCanvas(W, H);
      g = buf.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
    }
    g.save();
    g.globalAlpha = feather ? 1 : k;
    drawGround(g, v);
    g.restore();
    if (feather) {
      g.save();
      g.globalCompositeOperation = 'destination-in';
      const edge = (x0, y0, x1, y1) => {
        const gr = g.createLinearGradient(v.wx(x0), v.wy(y0), v.wx(x1), v.wy(y1));
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      };
      edge(250e3, 0, 325e3, 0); edge(-470e3, 0, -550e3, 0); edge(0, -420e3, 0, -500e3); edge(0, 240e3, 0, 310e3);
      g.restore();
      c.save(); c.globalAlpha = k; c.drawImage(buf, 0, 0); c.restore();
    }
    if (lf < 3.6) drawPeople(c, v, k);
  },
};

// ------------------------------------------------------------------ people
function cull(v, x, y, r) {
  const sx = v.wx(x), sy = v.wy(y), sr = r / v.cam.mpp;
  return sx + sr < -20 || sx - sr > W + 20 || sy + sr < -20 || sy - sr > H + 20;
}
function drawPeople(c, v, k) {
  const mpp = v.cam.mpp, s = 1 / mpp;            // px per metre
  const lf = v.cam.lf;
  const detail = L.clamp(L.invLerp(3.1, 2.8, lf));   // blankets and bodies below ~1 km field; dots above
  const fadeAll = L.clamp(L.invLerp(3.6, 3.15, lf)) * k;
  if (fadeAll <= 0) return;
  c.save();
  c.globalAlpha = fadeAll;
  // sunbathers and their blankets (static)
  for (const p of PEOPLE) {
    if (cull(v, p.x, p.y, 2)) continue;
    const sx = v.wx(p.x), sy = v.wy(p.y);
    if (detail <= 0.02) {
      const col = p.blanket || p.shirt;
      c.fillStyle = L.rgba(col, 0.85);
      const d = Math.max(1.1, 1.6 * s);
      c.fillRect(sx - d / 2, sy - d / 2, d, d);
      continue;
    }
    c.save();
    c.translate(sx, sy); c.scale(s, s); c.rotate(p.ang);
    c.globalAlpha = fadeAll * detail;
    if (p.blanket) {
      c.fillStyle = 'rgba(10,24,8,0.25)'; c.fillRect(-p.bw / 2 + 0.05, -p.bh / 2 + 0.05, p.bw, p.bh);
      c.fillStyle = L.rgba(p.blanket); c.fillRect(-p.bw / 2, -p.bh / 2, p.bw, p.bh);
    }
    c.restore();
    figure(c, v, p.x, p.y, p.ang, p.pose, p.shirt, fadeAll * detail, s);
    if (detail < 1) {
      c.globalAlpha = fadeAll * (1 - detail);
      c.fillStyle = L.rgba(p.blanket || p.shirt, 0.85);
      const d = Math.max(1.1, 1.6 * s);
      c.fillRect(sx - d / 2, sy - d / 2, d, d);
      c.globalAlpha = fadeAll;
    }
  }
  // walkers, runners, cyclists
  const ms = moversAt(v.gt);
  for (const p of ms) {
    if (cull(v, p.x, p.y, 3)) continue;
    const sx = v.wx(p.x), sy = v.wy(p.y);
    if (detail <= 0.02) { c.fillStyle = L.rgba(p.shirt, 0.8); c.fillRect(sx - 0.6, sy - 0.6, 1.2, 1.2); continue; }
    c.globalAlpha = fadeAll * detail;
    standing(c, sx, sy, p.ang, p.kind, p.shirt, s);
    c.globalAlpha = fadeAll;
  }
  // the hero, on their blanket, from lf 2.0 (builder A draws them in detail below that and fades out over 2.0-2.4)
  const hk = L.clamp(L.invLerp(1.95, 2.05, lf));
  if (hk > 0) {
    c.globalAlpha = fadeAll * hk;
    const sx = v.wx(PERSON.x), sy = v.wy(PERSON.y);
    if (s * 1.7 < 2.2) {
      c.fillStyle = L.rgba(BLANKET.base); const d = Math.max(1.4, 2 * s); c.fillRect(sx - d / 2, sy - d / 2, d, d);
    } else drawHero(c, v, s);
  }
  c.restore();
}

/** A person lying or sitting, top-down, body axis along ang (head at +ang). */
function figure(c, v, x, y, ang, pose, shirt, a, s) {
  const sx = v.wx(x), sy = v.wy(y);
  c.save();
  c.translate(sx, sy); c.scale(s, s); c.rotate(ang);
  if (pose === 'lying') {
    c.fillStyle = 'rgba(10,24,8,0.3)';
    c.beginPath(); c.ellipse(0.06, -0.06, 0.86, 0.22, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba([60, 66, 84]); c.beginPath(); c.ellipse(-0.4, 0, 0.42, 0.15, 0, 0, Math.PI * 2); c.fill();     // legs
    c.fillStyle = L.rgba(shirt); c.beginPath(); c.ellipse(0.22, 0, 0.32, 0.2, 0, 0, Math.PI * 2); c.fill();             // torso
    c.fillStyle = L.rgba([206, 164, 128]); c.beginPath(); c.arc(0.66, 0, 0.11, 0, Math.PI * 2); c.fill();               // head
  } else {
    c.fillStyle = 'rgba(10,24,8,0.32)';
    c.beginPath(); c.ellipse(0.35, 0, 0.55, 0.2, 0, 0, Math.PI * 2); c.restore(); c.save();
    // sitting: shadow toward the upper right (screen), body as a compact blob
    c.translate(sx, sy); c.scale(s, s);
    c.fillStyle = 'rgba(10,24,8,0.3)';
    c.beginPath(); c.ellipse(SHX * 0.45, SHY * 0.45, 0.4, 0.22, Math.atan2(SHY, SHX), 0, Math.PI * 2); c.fill();
    c.rotate(ang);
    c.fillStyle = L.rgba([60, 66, 84]); c.beginPath(); c.ellipse(-0.28, 0, 0.3, 0.17, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba(shirt); c.beginPath(); c.arc(0.05, 0, 0.21, 0, Math.PI * 2); c.fill();
    c.fillStyle = L.rgba([206, 164, 128]); c.beginPath(); c.arc(0.1, 0, 0.11, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function drawHero(c, v, s) {
  const W2 = (p) => [v.wx(p[0]), v.wy(p[1])];
  c.save();
  // blanket (A's outline) with its shadow and a simple plaid
  const poly = BLANKET_WORLD.map(W2);
  c.fillStyle = 'rgba(10,24,8,0.25)';
  c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(x + SHX * 0.04 * s, y + SHY * 0.04 * s) : c.moveTo(x + SHX * 0.04 * s, y + SHY * 0.04 * s))); c.closePath(); c.fill();
  c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
  c.fillStyle = L.rgba(BLANKET.base); c.fill();
  c.save(); c.clip();
  c.strokeStyle = L.rgba(BLANKET.navy, 0.75); c.lineWidth = Math.max(0.6, 0.12 * s);
  c.beginPath();
  for (let k = -1.2; k <= 1.2; k += 0.3) {
    const a0 = W2(BODY(k, -1.4)), a1 = W2(BODY(k, 0.8)), b0 = W2(BODY(-1.2, k - 0.33)), b1 = W2(BODY(1.2, k - 0.33));
    c.moveTo(a0[0], a0[1]); c.lineTo(a1[0], a1[1]); c.moveTo(b0[0], b0[1]); c.lineTo(b1[0], b1[1]);
  }
  c.stroke();
  c.restore();
  // the body (lying face up, head toward HEAD_DIR), the left arm out to the hand at the origin
  const seg = (a, b, w, col) => { const p = W2(a), q = W2(b); c.strokeStyle = L.rgba(col); c.lineWidth = Math.max(0.8, w * s); c.lineCap = 'round'; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); };
  c.globalAlpha *= 1;
  seg(BODY(-0.25, -0.1), BODY(-0.82, -0.12), 0.13, HERO.skin);
  seg(BODY(-0.25, 0.1), BODY(-0.82, 0.13), 0.13, HERO.skin);
  seg(BODY(-0.05, 0), BODY(-0.22, 0), 0.36, HERO.shorts);
  seg(BODY(0.0, 0), BODY(0.52, 0), 0.4, HERO.shirt);
  seg(BODY(0.52, 0.17), [0, 0], 0.09, HERO.skin);
  seg(BODY(0.5, -0.17), BODY(0.15, -0.26), 0.09, HERO.skin);
  const hd = W2(BODY(0.72, 0));
  c.fillStyle = L.rgba(HERO.skin); c.beginPath(); c.arc(hd[0], hd[1], Math.max(0.6, 0.11 * s), 0, Math.PI * 2); c.fill();
  const hr = W2(BODY(0.77, 0));
  c.fillStyle = L.rgba(HERO.hair); c.beginPath(); c.arc(hr[0], hr[1], Math.max(0.5, 0.09 * s), 0, Math.PI * 2); c.fill();
  c.restore();
}
/** A standing walker / runner / cyclist, top-down, with the long afternoon shadow (1.7 m tall -> 1.5 m shadow). */
function standing(c, sx, sy, ang, kind, shirt, s) {
  c.save();
  c.translate(sx, sy); c.scale(s, s);
  // shadow
  c.strokeStyle = 'rgba(10,22,8,0.35)'; c.lineCap = 'round'; c.lineWidth = 0.32;
  const len = kind === 'bike' ? 1.4 : 1.5;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(SHX * len, SHY * len); c.stroke();
  c.rotate(ang);
  if (kind === 'bike') {
    c.strokeStyle = L.rgba([40, 40, 44]); c.lineWidth = 0.08;
    c.beginPath(); c.moveTo(-0.85, 0); c.lineTo(0.85, 0); c.stroke();
  }
  c.fillStyle = L.rgba(shirt); c.beginPath(); c.ellipse(0, 0, 0.17, 0.25, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = L.rgba([60, 44, 34]); c.beginPath(); c.arc(0.03, 0, 0.1, 0, Math.PI * 2); c.fill();
  c.restore();
}
void PAL;
