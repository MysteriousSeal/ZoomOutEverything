// Beat 9 — "If you could drive straight up, you'd get there in about an hour."
// World: a highway turns 90° and runs straight up from the ground to the Kármán line (lane edges +
// scrolling dashes, true 100 km tall). A car's headlights climb it at a constant 100 km/h.
// Overlay: a refined two-dial instrument cluster (speedometer settles on 100 km/h, then a trip clock
// sweeps 0–60 min in sync with the car's climb). Label "1 hour" / "at 100 km/h, straight up".
import * as L from '../../../../engine/runtime/lib.js';
import { ALT } from '../camera.js';

const { W, H } = L;
const ACC = [150, 170, 255];
const ROAD_SX = 790;                // road screen x at the hold (world x derived from the camera at mpp 100)
const ROAD_X = (ROAD_SX - W / 2) * 100;
const ROAD_IN = [0.15, 1.1];        // road draws upward
const NEEDLE = [0.45, 1.0];         // speedometer needle to 100 km/h
const CLIMB = [1.15, 2.05];         // car climb == the clock's hour (beat time)
const LABEL = 2.55;
const ARRIVE = CLIMB[0] + CLIMB[1];

const climbK = (t) => {   // constant speed in the middle, eased ends
  const p = L.prog(t, CLIMB[0], CLIMB[1]);
  return L.ease.inOutCubic(p) * 0.25 + p * 0.75;
};

function drawRoad(c, v) {
  const t = v.t;
  const fadeOut = 1 - L.ease.inCubic(L.prog(t, v.d + 0.05, 1.0));  // fades as the camera leaves for the ISS (gone before the ISS label)
  const k = L.ease.inOutCubic(L.prog(t, ROAD_IN[0], ROAD_IN[1]));
  if (k <= 0 || fadeOut <= 0) return;
  const x = v.wx(ROAD_X);
  const yG = v.wy(0), yK = v.wy(-ALT.karman);
  const yTop = L.lerp(yG, yK, k);
  const hw = 27;                     // half-width in px (stylised: a real road is sub-pixel here)
  c.save();
  c.globalAlpha *= fadeOut;
  // asphalt ribbon fading upward
  const g = c.createLinearGradient(0, yG, 0, yTop);
  g.addColorStop(0, 'rgba(38,44,60,0.95)');
  g.addColorStop(1, 'rgba(38,44,60,0.45)');
  c.fillStyle = g;
  c.fillRect(x - hw, yTop, hw * 2, yG - yTop);
  // edge lines
  c.fillStyle = 'rgba(235,240,252,0.8)';
  c.fillRect(x - hw + 2, yTop, 2, yG - yTop);
  c.fillRect(x + hw - 4, yTop, 2, yG - yTop);
  // centre dashes scroll down while the car drives (the world moves past it)
  const scroll = climbK(t) * 900 + Math.max(0, t - ARRIVE) * 0;
  c.fillStyle = 'rgba(255,214,120,0.75)';
  const period = 40;
  for (let y = yG - ((scroll % period) + period) % period; y > yTop; y -= period) {
    const y1 = Math.max(yTop, y - 16);
    if (y < -20 || y1 > H + 20) continue;
    c.fillRect(x - 1.5, y1, 3, y - y1);
  }
  // the bend at the bottom: the road arrives from the horizontal ground and turns up
  const rB = 60;
  c.strokeStyle = 'rgba(225,232,250,0.45)';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x - hw - 260, yG); c.lineTo(x - hw - rB, yG); c.arcTo(x - hw, yG, x - hw, yG - rB, rB); c.stroke();
  c.beginPath(); c.moveTo(x + hw + 260, yG); c.lineTo(x + hw + rB, yG); c.arcTo(x + hw, yG, x + hw, yG - rB, rB); c.stroke();
  // destination marker where the road meets the line
  if (k >= 1) {
    const pk = L.clamp(1 - Math.abs(t - ARRIVE) / 0.6);
    L.lightBlob(c, x, yK, 50 + 60 * pk, ACC, 0.25 + 0.5 * pk);
  }
  c.restore();
}

function drawCar(c, v) {
  const t = v.t;
  const vis = L.prog(t, CLIMB[0] - 0.3, 0.3) * (1 - L.prog(t, v.d + 0.2, 0.8));
  if (vis <= 0) return;
  const p = climbK(t);
  const x = v.wx(ROAD_X) + 13;        // right-hand lane of the vertical road, nose pointing up
  const y = v.wy(-ALT.karman * p);
  c.save();
  c.globalAlpha *= vis;
  // tail-light trail below the car
  const trail = Math.min(220, (y - v.wy(0)) * -1);
  if (trail > 2) {
    const g = c.createLinearGradient(0, y + 16, 0, y + 16 + trail);
    g.addColorStop(0, 'rgba(255,80,70,0.6)');
    g.addColorStop(1, 'rgba(255,80,70,0)');
    c.fillStyle = g;
    c.fillRect(x - 6, y + 16, 3, trail); c.fillRect(x + 3, y + 16, 3, trail);
  }
  // headlight beams up the road
  const cone = c.createLinearGradient(0, y - 16, 0, y - 150);
  cone.addColorStop(0, 'rgba(255,245,220,0.5)');
  cone.addColorStop(1, 'rgba(255,245,220,0)');
  c.fillStyle = cone;
  c.beginPath(); c.moveTo(x - 6, y - 16); c.lineTo(x - 20, y - 150); c.lineTo(x + 20, y - 150); c.lineTo(x + 6, y - 16); c.fill();
  // the car, seen from above: body, windscreen, roof, rear window, mirrors
  const bw = 10, bh = 21;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  L.roundRect(c, x - bw - 1, y - bh + 2, bw * 2 + 2, bh * 2, 5); c.fill();
  const bg = c.createLinearGradient(x - bw, 0, x + bw, 0);
  bg.addColorStop(0, '#c8302e'); bg.addColorStop(0.5, '#ff5a4a'); bg.addColorStop(1, '#a8231f');
  c.fillStyle = bg;
  L.roundRect(c, x - bw, y - bh, bw * 2, bh * 2, 5); c.fill();
  c.fillRect(x - bw - 2, y - 6, 2, 3); c.fillRect(x + bw, y - 6, 2, 3);
  c.fillStyle = 'rgba(20,28,48,0.95)';
  L.roundRect(c, x - bw + 2, y - 9, bw * 2 - 4, 6, 2); c.fill();        // windscreen
  L.roundRect(c, x - bw + 2, y + 8, bw * 2 - 4, 4, 2); c.fill();        // rear window
  c.fillStyle = 'rgba(255,255,255,0.22)';
  L.roundRect(c, x - bw + 2, y - 3, bw * 2 - 4, 11, 2); c.fill();       // roof sheen
  // headlights + tail lights
  L.lightBlob(c, x - 5, y - bh, 14, [255, 240, 210], 0.8);
  L.lightBlob(c, x + 5, y - bh, 14, [255, 240, 210], 0.8);
  c.fillStyle = '#fffbe8';
  c.fillRect(x - 7, y - bh, 4, 2); c.fillRect(x + 3, y - bh, 4, 2);
  c.fillStyle = '#ff3b30';
  c.fillRect(x - 7, y + bh - 2, 4, 2); c.fillRect(x + 3, y + bh - 2, 4, 2);
  c.restore();
}

// ------------------------------------------------------------------ instrument cluster (screen space)
function dialBase(c, x, y, r, k) {
  c.save();
  // glass backing
  const g = c.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(26,32,58,0.92)');
  g.addColorStop(1, 'rgba(8,10,22,0.92)');
  c.fillStyle = g;
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 30;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fill();
  c.shadowBlur = 0;
  // bezel: thin metallic ring with a top highlight
  const b = c.createLinearGradient(x, y - r, x, y + r);
  b.addColorStop(0, 'rgba(230,236,255,0.75)');
  b.addColorStop(0.5, 'rgba(120,132,170,0.35)');
  b.addColorStop(1, 'rgba(200,210,240,0.5)');
  c.strokeStyle = b;
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.stroke();
  // glass reflection
  c.save();
  c.beginPath(); c.arc(x, y, Math.max(0, r - 2), 0, Math.PI * 2); c.clip();
  const rf = c.createLinearGradient(x - r, y - r, x + r * 0.2, y + r * 0.2);
  rf.addColorStop(0, 'rgba(255,255,255,0.07)');
  rf.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  c.fillStyle = rf;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  c.restore();
}

function speedo(c, x, y, r, t) {
  const A0 = Math.PI * 0.75, SPAN = Math.PI * 1.5, VMAX = 160;
  const ang = (kmh) => A0 + SPAN * (kmh / VMAX);
  const nk = L.ease.outBack(L.prog(t, NEEDLE[0], NEEDLE[1]), 1.4);
  const wob = L.prog(t, NEEDLE[0] + NEEDLE[1], 2) > 0 && t < ARRIVE ? Math.sin(t * 9) * 0.6 : 0;
  const kmh = 100 * nk + wob;
  c.save();
  // ticks
  for (let s = 0; s <= VMAX; s += 10) {
    const a = ang(s), major = s % 20 === 0;
    const r0 = r - (major ? 22 : 14), r1 = r - 8;
    c.strokeStyle = s === 100 ? L.rgba(ACC, 1) : `rgba(220,228,245,${major ? 0.8 : 0.4})`;
    c.lineWidth = major ? 3 : 1.5;
    c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke();
    if (major && s % 40 === 0) {
      c.font = L.font(18, 700, L.FONT.din);
      c.fillStyle = 'rgba(220,228,245,0.7)';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(s), x + Math.cos(a) * (r - 40), y + Math.sin(a) * (r - 40) + 1);
    }
  }
  // accent arc up to the needle
  c.strokeStyle = L.rgba(ACC, 0.85);
  c.lineWidth = 4;
  c.beginPath(); c.arc(x, y, Math.max(0, r - 4), A0, ang(Math.max(0, kmh))); c.stroke();
  // needle
  const a = ang(kmh);
  L.glow(c, ACC, 12, () => {
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - Math.cos(a) * 12, y - Math.sin(a) * 12); c.lineTo(x + Math.cos(a) * (r - 18), y + Math.sin(a) * (r - 18)); c.stroke();
  }, 0.9);
  c.fillStyle = '#dfe6ff';
  c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
  // readout
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = L.font(40, 700, L.FONT.din);
  c.fillStyle = '#fff';
  // readout: the needle may overshoot/wobble, but the printed speed never exceeds the claim (100)
  const shown = t > NEEDLE[0] + NEEDLE[1] * 0.6 ? 100 : Math.round(L.clamp(kmh, 0, 100));
  c.fillText(String(shown), x, y + r * 0.62);
  c.font = L.font(15, 700, L.FONT.body);
  c.fillStyle = 'rgba(200,210,235,0.75)';
  L.trackedText(c, 'KM/H', x, y + r * 0.62 + 22, 2, 'center');
  c.restore();
}

function clock(c, x, y, r, t) {
  const p = L.prog(t, CLIMB[0], CLIMB[1]);
  const pk = climbK(t);
  const top = -Math.PI / 2;
  c.save();
  for (let m = 0; m < 60; m++) {
    const a = top + (m / 60) * Math.PI * 2, major = m % 5 === 0;
    const r0 = r - (major ? 20 : 12), r1 = r - 8;
    const lit = m / 60 <= pk && p > 0;
    c.strokeStyle = lit ? L.rgba(ACC, major ? 1 : 0.8) : `rgba(220,228,245,${major ? 0.7 : 0.3})`;
    c.lineWidth = major ? 3 : 1.5;
    c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke();
  }
  // filled sweep wedge (soft)
  if (pk > 0) {
    const a1 = top + pk * Math.PI * 2;
    const wg = c.createRadialGradient(x, y, 0, x, y, r - 24);
    wg.addColorStop(0, L.rgba(ACC, 0.0));
    wg.addColorStop(1, L.rgba(ACC, 0.22));
    c.fillStyle = wg;
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, Math.max(0, r - 24), top, a1); c.closePath(); c.fill();
    c.strokeStyle = L.rgba(ACC, 0.95);
    c.lineWidth = 4;
    c.beginPath(); c.arc(x, y, Math.max(0, r - 4), top, a1); c.stroke();
  }
  // hand
  const a = top + pk * Math.PI * 2;
  L.glow(c, ACC, 12, () => {
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * (r - 26), y + Math.sin(a) * (r - 26)); c.stroke();
  }, 0.9);
  c.fillStyle = '#dfe6ff';
  c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
  // arrival flash
  const fl = Math.exp(-Math.pow((t - ARRIVE - 0.1) / 0.25, 2));
  if (fl > 0.01) L.lightBlob(c, x, y, r * 1.4, ACC, 0.35 * fl);
  // readout: elapsed minutes
  const mins = Math.round(60 * pk);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = L.font(40, 700, L.FONT.din);
  c.fillStyle = '#fff';
  c.fillText(mins >= 60 ? '1:00' : `0:${String(mins).padStart(2, '0')}`, x, y + r * 0.62);
  c.font = L.font(15, 700, L.FONT.body);
  c.fillStyle = 'rgba(200,210,235,0.75)';
  L.trackedText(c, 'TRIP TIME', x, y + r * 0.62 + 22, 2, 'center');
  c.restore();
}

export default {
  beat: 9,
  chapter: { num: '09', title: 'One hour', sub: 'A road trip, straight up' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.2, name: 'swish', gain: 0.25, pitch: 1.1 },
      { t: NEEDLE[0] + 0.05, name: 'tick', gain: 0.3, pitch: 1.0 },
      { t: NEEDLE[0] + 0.35, name: 'blip', gain: 0.2, pitch: 1.2 },
      { t: CLIMB[0], name: 'riser', gain: 0.3, pitch: 0.9 },
      { t: ARRIVE - 0.05, name: 'ping', gain: 0.32, pitch: 1.1 },
      { t: LABEL, name: 'blip', gain: 0.22, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0 || v.t > v.d + 3) return;
    drawRoad(ctx, v);
    drawCar(ctx, v);
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    // cluster: two dials side by side, lower left
    const cy = 1080, rS = 112, rC = 132;
    const xs = 250, xc = 520;
    const kS = L.ease.outBack(L.prog(t, 0.1, 0.55), 1.2), kC = L.ease.outBack(L.prog(t, 0.18, 0.55), 1.2);
    const fadeIn = L.clamp(L.prog(t, 0.1, 0.35));
    ctx.save();
    ctx.globalAlpha = v.k * fadeIn;
    // speedometer
    ctx.save();
    ctx.translate(xs, cy); ctx.scale(0.85 + 0.15 * kS, 0.85 + 0.15 * kS); ctx.translate(-xs, -cy);
    dialBase(ctx, xs, cy, rS, kS);
    speedo(ctx, xs, cy, rS, t);
    ctx.restore();
    // clock
    ctx.save();
    ctx.globalAlpha *= L.clamp(L.prog(t, 0.18, 0.35));
    ctx.translate(xc, cy); ctx.scale(0.85 + 0.15 * kC, 0.85 + 0.15 * kC); ctx.translate(-xc, -cy);
    dialBase(ctx, xc, cy, rC, kC);
    clock(ctx, xc, cy, rC, t);
    ctx.restore();
    ctx.restore();
    const k = L.enter(t, LABEL, 0.55) * v.k;
    L.bigLabel(ctx, { x: 150, y: 790, big: '1 hour', small: 'at 100 km/h, straight up', k, accent: v.accent });
  },
};
