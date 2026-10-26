// Beat 14 — "Now the strangest part: | Einstein is in your pocket."
// The two-clocks frame: satellite B high on the left, you (the blue dot) on the Earth's top limb. A faint spacetime
// grid fades in around the planet and SINKS into its gravity well (the lines bow toward the Earth and dive under its
// limb; far up, near B, they stay almost straight). On "Einstein" the title lands with the big hit and a ripple runs
// out through the grid. Two refined clock dials then open: one beside B (up there), one beside you (down here).
//
// ACT III shared state lives here (s15/s16 import it):
//   drawWell(ctx, v)       the warped grid + B's ring + the blue dot + both dials (drawn every frame in beats 14-16)
//   leadAt(gt, tl)          the satellite clock's lead in µs/day: 0 → +45 (beat 15) → +38 (beat 16)
//   T(tl)                   the act's key times (global seconds), from the VO phrases
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CLOCK, DOT, R_EARTH, SAT_B, SAT_INK, beatStart, heroAt, phrase } from '../env.js';
import { drawPhoneDot } from './s06-only-listens.js';
import { wordT } from './s04-atomic-clocks.js';

const { W, H } = L;
const TAU = Math.PI * 2;

// ====================================================================== act timing (global seconds)
let tCache = null, tVal = null;
export function T(tl) {
  if (tCache === tl) return tVal;
  const b14 = beatStart(tl, 14), b15 = beatStart(tl, 15), b16 = beatStart(tl, 16), b17 = beatStart(tl, 17);
  tVal = {
    b14, b15, b16, b17,
    ein: b14 + wordT(tl, 14, 1, 0),                       // "Einstein"
    up: b15 + wordT(tl, 15, 0, 0),                        // "Up there"
    gainA: b15 + wordT(tl, 15, 0, 3) - 0.2,               // the lead starts to open on "gravity"
    g45: b15 + wordT(tl, 15, 1, 3) - 0.05,                // end of "forty-five": the counter locks
    speed: b16 + wordT(tl, 16, 0, 1),                     // "speed"
    seven: b16 + wordT(tl, 16, 0, 6),                     // "seven"
    so: phrase(tl, 16, 1, 'start'),                       // "So they gain…"
    t38: b16 + wordT(tl, 16, 1, 4) - 0.05,                // end of "thirty-eight": the tally locks
  };
  tCache = tl;
  return tVal;
}

/** The satellite clock's lead (µs per day) at gt. */
export function leadAt(gt, tl) {
  const k = T(tl);
  const g = L.ease.inOutCubic(L.prog(gt, k.gainA, k.g45 - k.gainA));
  const s = L.ease.inOutCubic(L.prog(gt, k.so - 0.05, k.t38 - k.so + 0.05));
  return 45 * g - 7 * s;
}

/** Act III presence (0..1): from the start of beat 14 until the dive to the city in beat 17. */
export function actK(v) {
  const k = T(v.tl);
  return L.ease.outCubic(L.prog(v.gt, k.b14 - 0.1, 1.0)) * (1 - L.ease.inCubic(L.prog(v.gt, k.b17 - 0.05, 0.55)));
}

// ====================================================================== the gravity well grid
const S = R_EARTH / 3;               // grid pitch (m): ≈ 70 px at 30 km/px
const WARP = 0.5;                    // r' = r − WARP·A·R²/r  (bows lines toward the Earth, swallows them at the limb)

/** Depth of the well (0..1+): sinks with a little overshoot on "the strangest part", rings on "Einstein". */
function warpA(gt, tl) {
  const k = T(tl);
  const sink = L.ease.outBack(L.prog(gt, k.b14 + 0.45, 1.65), 1.3);
  const ring = gt > k.ein ? 0.09 * Math.sin((gt - k.ein) * 9) * Math.exp(-(gt - k.ein) * 2.6) : 0;
  return sink + ring;
}

function drawGrid(c, v, k) {
  const tl = v.tl, gt = v.gt, kk = T(tl);
  const A = warpA(gt, tl);
  const cx = v.wx(0), cy = v.wy(R_EARTH), rpx = v.ws(R_EARTH);
  const mpp = v.cam.mpp;
  // visible world rectangle (+ margin), snapped to the grid
  const wx0 = v.cam.x - (W / 2 + 120) * mpp, wx1 = v.cam.x + (W / 2 + 120) * mpp;
  const wy0 = v.cam.y - (H * v.cam.anchor + 120) * mpp, wy1 = v.cam.y + (H * (1 - v.cam.anchor) + 120) * mpp;
  const i0 = Math.floor(wx0 / S), i1 = Math.ceil(wx1 / S);
  const j0 = Math.floor((wy0 - R_EARTH) / S), j1 = Math.ceil((wy1 - R_EARTH) / S);
  if (i1 - i0 > 60 || j1 - j0 > 80) return;   // too fine to read: skip (only while the camera dives away)
  const R2 = R_EARTH * R_EARTH * WARP * A;
  // the "Einstein" ripple: a band that runs out from the limb and pulls the lines toward the Earth as it passes
  const rp = L.prog(gt, kk.ein - 0.05, 1.6);
  const rippling = rp > 0 && rp < 1;
  const rrW = R_EARTH * L.lerp(1.0, 7.5, L.ease.outCubic(rp)), bwW = R_EARTH * 0.6;
  const ampW = R_EARTH * 0.16 * (1 - rp);
  const map = (x, y) => {
    const dx = x, dy = y - R_EARTH, r = Math.hypot(dx, dy) || 1;
    let f = 1 - R2 / (r * r);
    if (rippling) {
      const u = (r * f - rrW) / bwW;
      if (u > -3 && u < 3) f -= (ampW * Math.exp(-u * u) * Math.sin(u * 2.2 + 1.2) * L.clamp((r - R_EARTH) / R_EARTH)) / r;
    }
    return [v.wx(dx * f), v.wy(R_EARTH + dy * f)];
  };
  // adaptive sampling: fine near the planet where the lines bend hard, coarse far out
  const step = (x, y) => S * L.lerp(1 / 28, 1 / 5, L.clamp((Math.hypot(x, y - R_EARTH) / R_EARTH - 1) / 2));
  const path = () => {
    c.beginPath();
    for (let i = i0; i <= i1; i++) {
      const x = i * S;
      for (let y = wy0, n = 0; y <= wy1 + S; y += step(x, y), n++) { const p = map(x, y); if (n) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
    }
    for (let j = j0; j <= j1; j++) {
      const y = R_EARTH + j * S;
      for (let x = wx0, n = 0; x <= wx1 + S; x += step(x, y), n++) { const p = map(x, y); if (n) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
    }
  };
  c.save();
  // the grid lives OUTSIDE the planet: clip the Earth's disc out (lines dive under the limb)
  c.beginPath();
  c.rect(-20, -20, W + 40, H + 40);
  c.arc(cx, cy, Math.max(0, rpx * 1.005), 0, TAU, true);
  c.clip('evenodd');
  // well shading: space darkens a little toward the planet (depth)
  const sh = c.createRadialGradient(cx, cy, rpx, cx, cy, rpx * 3.2);
  sh.addColorStop(0, `rgba(0,2,8,${0.5 * k * Math.min(1, A)})`); sh.addColorStop(1, 'rgba(0,2,8,0)');
  c.fillStyle = sh; c.fillRect(0, 0, W, H);
  path();
  c.lineWidth = 1.4;
  // the lines fade out just above the limb, so their dive under the horizon reads as depth, not as a cusp
  const base = c.createRadialGradient(cx, cy, rpx, cx, cy, rpx * 1.22);
  base.addColorStop(0, L.rgba(SAT_INK, 0)); base.addColorStop(1, L.rgba(SAT_INK, 0.12 * k));
  c.strokeStyle = base;
  c.stroke();
  // light: the well's throat glows cool, B's flat neighbourhood lights up on "Up there", the "Einstein" ripple
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(cx, cy, rpx, cx, cy, rpx * 2.6);
  g.addColorStop(0, 'rgba(130,180,255,0)'); g.addColorStop(0.07, `rgba(130,180,255,${0.5 * k})`); g.addColorStop(0.45, `rgba(130,180,255,${0.16 * k})`); g.addColorStop(1, 'rgba(130,180,255,0)');
  c.strokeStyle = g;
  c.lineWidth = 1.6;
  c.stroke();
  if (rippling) {
    // soft, narrow-peaked gold band; brightest near the well's throat, dimming as it runs out into flat space
    const rr = rpx * L.lerp(1.0, 7.5, L.ease.outCubic(rp)), bw = rpx * 0.7;
    const rg = c.createRadialGradient(cx, cy, Math.max(0, rr - bw), cx, cy, rr + bw * 0.5);
    const near = Math.exp(-Math.max(0, rr / rpx - 1) * 0.55);
    const a = 0.35 * (1 - L.ease.inCubic(rp)) * near * k;
    rg.addColorStop(0, 'rgba(255,214,140,0)'); rg.addColorStop(0.45, `rgba(255,214,140,${a * 0.3})`);
    rg.addColorStop(0.67, `rgba(255,214,140,${a})`); rg.addColorStop(0.85, `rgba(255,214,140,${a * 0.3})`); rg.addColorStop(1, 'rgba(255,214,140,0)');
    c.strokeStyle = rg; c.lineWidth = 1.8;
    c.stroke();
  }
  const sp = L.ease.inOutCubic(L.prog(gt, kk.up - 0.2, 1.0)) * (1 - L.ease.inOutCubic(L.prog(gt, kk.so, 1.2)));
  if (sp > 0) {
    const b = heroAt(1, gt, tl), bx = v.wx(b.x), by = v.wy(b.y);
    const bg = c.createRadialGradient(bx, by, 0, bx, by, 260);
    bg.addColorStop(0, `rgba(255,224,170,${0.42 * sp * k})`); bg.addColorStop(1, 'rgba(255,224,170,0)');
    c.strokeStyle = bg; c.lineWidth = 1.6;
    c.stroke();
  }
  c.restore();
}

// ====================================================================== clock dials
const DIAL_R = 54;
/** Dial centres (screen px), anchored to B and to the phone. */
export function dialPos(v) {
  const b = heroAt(1, v.gt, v.tl);
  return {
    sat: { x: v.wx(b.x) - 205, y: v.wy(b.y) + 125, ox: v.wx(b.x), oy: v.wy(b.y) },
    gnd: { x: v.wx(0) + 186, y: v.wy(0) - 122, ox: v.wx(0), oy: v.wy(0) },
  };
}
/** Hand angle (rad, 0 = 12 o'clock): a steady sweep, one turn every 6 s. */
const handA = (gt) => (gt / 6) * TAU;

function drawDial(c, p, { k, gt, lead = 0, label, hot = 0, tag = 1 }) {
  if (k <= 0.002) return;
  const e = L.ease.outBack(L.clamp(k), 1.6), r = DIAL_R * L.lerp(0.55, 1, e);
  const { x, y } = p;
  c.save();
  c.globalAlpha *= L.clamp(k * 1.6);
  // leader to its owner (draws itself out of the dial)
  const ang = Math.atan2(p.oy - y, p.ox - x), dist = Math.hypot(p.ox - x, p.oy - y);
  const lk = L.ease.outCubic(L.prog(k, 0.25, 0.75));
  if (lk > 0 && dist > r + 30) {
    const sx = x + Math.cos(ang) * (r + 8), sy = y + Math.sin(ang) * (r + 8);
    const ex = L.lerp(sx, p.ox - Math.cos(ang) * 20, lk), ey = L.lerp(sy, p.oy - Math.sin(ang) * 20, lk);
    c.strokeStyle = 'rgba(225,232,245,0.45)'; c.lineWidth = 1.5;
    c.setLineDash([3, 5]);
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    c.setLineDash([]);
  }
  // backing + face
  const bg = c.createRadialGradient(x, y, r * 0.6, x, y, r * 1.9);
  bg.addColorStop(0, 'rgba(2,4,10,0.7)'); bg.addColorStop(1, 'rgba(2,4,10,0)');
  c.fillStyle = bg; c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  const fg = c.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r);
  fg.addColorStop(0, 'rgba(26,32,48,0.96)'); fg.addColorStop(1, 'rgba(8,11,20,0.96)');
  c.fillStyle = fg;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();
  // bezel: draws itself round
  const ring = L.ease.outCubic(L.prog(k, 0, 0.8));
  c.strokeStyle = L.rgba(CLOCK, 0.9); c.lineWidth = 2.5;
  c.beginPath(); c.arc(x, y, Math.max(0, r), -Math.PI / 2, -Math.PI / 2 + TAU * ring); c.stroke();
  c.strokeStyle = 'rgba(255,214,140,0.18)'; c.lineWidth = 1;
  c.beginPath(); c.arc(x, y, Math.max(0, r - 7), 0, TAU); c.stroke();
  // ticks
  c.strokeStyle = 'rgba(235,238,245,0.7)';
  c.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, maj = i % 3 === 0;
    const r0 = r - (maj ? 17 : 12), r1 = r - 7;
    c.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0); c.lineTo(x + Math.sin(a) * r1, y - Math.cos(a) * r1);
  }
  c.lineWidth = 1.6; c.stroke();
  // the lead: a glowing wedge between ground time (ghost hand) and this clock's hand
  const a0 = handA(gt), wedge = (lead / 45) * 1.15;   // 45 µs ≈ 66° (symbolic, hugely magnified)
  const a1 = a0 + wedge;
  if (Math.abs(wedge) > 0.005) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const wg = c.createRadialGradient(x, y, 0, x, y, r - 8);
    wg.addColorStop(0, 'rgba(255,214,140,0.05)'); wg.addColorStop(1, `rgba(255,214,140,${0.42 + 0.25 * hot})`);
    c.fillStyle = wg;
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, Math.max(0, r - 8), a0 - Math.PI / 2, a1 - Math.PI / 2, wedge < 0); c.closePath(); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(235,240,250,0.42)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a0) * (r - 12), y - Math.cos(a0) * (r - 12)); c.stroke();
  }
  // hand + counterweight + pin
  c.lineCap = 'round';
  c.strokeStyle = L.rgba(CLOCK); c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x - Math.sin(a1) * 10, y + Math.cos(a1) * 10);
  c.lineTo(x + Math.sin(a1) * (r - 10), y - Math.cos(a1) * (r - 10));
  c.stroke();
  c.fillStyle = L.rgba(CLOCK);
  c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill();
  c.fillStyle = 'rgb(10,12,20)';
  c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill();
  // tag (leaves once read, before beat 16's arrow and chip arrive)
  c.globalAlpha *= L.clamp(tag);
  c.font = L.font(18, 700, L.FONT.body);
  c.fillStyle = 'rgba(220,228,240,0.88)';
  c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 6;
  c.textBaseline = 'alphabetic';
  L.trackedText(c, label, x, y + r + 32, 3, 'center');
  c.restore();
}

// ====================================================================== the act III frame
/** Everything persistent in beats 14-16: grid, B's ring, the phone dot, the two clocks. */
export function drawWell(c, v) {
  const k = actK(v);
  if (k <= 0.002) return;
  const kk = T(v.tl), gt = v.gt;
  drawGrid(c, v, L.ease.outCubic(L.prog(gt, kk.b14 - 0.05, 0.75)) * k);
  // satellite B: a crisp ring around env's glint, gold once its clock is the subject
  const b = heroAt(1, gt, v.tl), bx = v.wx(b.x), by = v.wy(b.y);
  const rk = L.ease.outBack(L.prog(gt, kk.b14 + 0.6, 0.6)) * k;
  const gold = L.ease.inOutCubic(L.prog(gt, kk.up - 0.2, 0.6));
  if (rk > 0) {
    c.save();
    L.lightBlob(c, bx, by, 46, L.mix(SAT_INK, CLOCK, gold), (0.35 + 0.2 * gold) * k);
    c.strokeStyle = L.rgba(L.mix(SAT_INK, CLOCK, gold), 0.8 * k); c.lineWidth = 2;
    c.beginPath(); c.arc(bx, by, Math.max(0, 15 * rk), 0, TAU); c.stroke();
    c.restore();
  }
  // you: the blue dot on the limb
  drawPhoneDot(c, v, L.ease.outCubic(L.prog(gt, kk.b14 + 0.3, 0.6)) * k);
  // the two clocks: ground first, then the satellite; they leave as the camera dives to the city
  const p = dialPos(v);
  const lead = leadAt(gt, v.tl);
  const hot = Math.exp(-Math.max(0, gt - kk.g45) * 2.5) * (gt > kk.g45 ? 1 : 0) + Math.exp(-Math.max(0, gt - kk.t38) * 2.5) * (gt > kk.t38 ? 1 : 0);
  const out = 1 - L.ease.inCubic(L.prog(gt, kk.b17 - 0.05, 0.4));
  const tag = 1 - L.ease.inCubic(L.prog(gt, kk.b16 - 0.3, 0.4));
  drawDial(c, p.gnd, { k: L.prog(gt, kk.b15 - 0.62, 0.55) * out, gt, label: 'GROUND', tag });
  drawDial(c, p.sat, { k: L.prog(gt, kk.up - 0.12, 0.55) * out, gt, lead, hot, label: 'SATELLITE', tag });
}

// ====================================================================== title
function drawTitle(c, v) {
  const kk = T(v.tl);
  const t = v.gt - kk.ein;               // seconds since "Einstein"
  const kin1 = L.enter(t, -0.12, 0.65, L.ease.outExpo), kin2 = L.enter(t, 0.12, 0.7, L.ease.outExpo);
  const kout = L.enter(v.gt, kk.b15 - 0.45, 0.35, L.ease.inCubic);
  if (kin1 <= 0 || kout >= 1) return;
  const cy = 820;
  // scrim
  c.save();
  c.globalAlpha = L.clamp(kin1 * 1.5) * (1 - kout);
  c.translate(W / 2, cy - 30); c.scale(1, 0.36);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 620);
  g.addColorStop(0, 'rgba(3,5,12,0.7)'); g.addColorStop(0.55, 'rgba(3,5,12,0.45)'); g.addColorStop(1, 'rgba(3,5,12,0)');
  c.fillStyle = g; c.fillRect(-620, -620, 1240, 1240);
  c.restore();
  // gold hairline
  const rk = L.enter(t, -0.05, 0.6, L.ease.outExpo) * (1 - kout);
  if (rk > 0) { c.fillStyle = L.rgba(CLOCK, 0.9); c.fillRect(W / 2 - 50 * rk, cy - 178, 100 * rk, 4); }
  const lines = [
    { s: 'EINSTEIN', y: cy, size: 176, col: [255, 255, 255], kin: kin1, track: 6, i: 0 },
    { s: 'IS IN YOUR POCKET', y: cy + 82, size: 62, col: CLOCK, kin: kin2, track: 8, i: 1 },
  ];
  for (const ln of lines) {
    if (ln.kin <= 0) continue;
    const ko = L.enter(v.gt, kk.b15 - 0.45 + ln.i * 0.05, 0.3, L.ease.inCubic);
    c.save();
    c.beginPath(); c.rect(0, ln.y - ln.size * 0.86, W, ln.size * 1.0); c.clip();
    c.font = L.font(ln.size, 800, L.FONT.display);
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 24;
    c.fillStyle = L.rgba(ln.col);
    L.trackedText(c, ln.s, W / 2, ln.y + (1 - ln.kin) * ln.size * 0.95 - ko * ln.size * 0.95, ln.track, 'center');
    if (ln.i === 0) {
      // a warm light sweep across the name once it lands
      const sw = L.prog(t, 0.35, 1.0);
      if (sw > 0 && sw < 1) {
        c.globalCompositeOperation = 'source-atop';
        const gx = L.lerp(150, 930, L.ease.inOutCubic(sw));
        const lg = c.createLinearGradient(gx - 120, 0, gx + 120, 0);
        lg.addColorStop(0, 'rgba(255,236,200,0)'); lg.addColorStop(0.5, 'rgba(255,236,200,0.6)'); lg.addColorStop(1, 'rgba(255,236,200,0)');
        c.shadowColor = 'transparent';
        c.fillStyle = lg; c.fillRect(gx - 120, ln.y - ln.size, 240, ln.size * 1.2);
      }
    }
    c.restore();
  }
}

export default {
  beat: 14,
  chapter: { num: '14', title: 'Relativity', sub: 'the strangest part' },
  captions: true,
  layer: 3,
  cues(d) {
    void d;
    // mirrors T(): "Einstein" ≈ 2.12 s into the beat
    return [
      { t: 0.5, name: 'deep', gain: 0.32, pitch: 0.8 },         // the grid sinks into the well
      { t: 0.25, name: 'swell', gain: 0.16, pitch: 0.9 },
      { t: 0.65, name: 'blip', gain: 0.12, pitch: 1.3 },        // B's ring
      { t: 2.0, name: 'impact', gain: 0.55, pitch: 0.85 },      // EINSTEIN
      { t: 2.05, name: 'bloom', gain: 0.32, pitch: 0.9 },
      { t: 2.1, name: 'shimmer', gain: 0.16, pitch: 1.2 },      // the ripple through the grid
      { t: 3.48, name: 'tick', gain: 0.16, pitch: 1.3 },        // ground clock
    ];
  },
  drawWorld(ctx, v) {
    drawWell(ctx, v);
  },
  drawOverlay(ctx, v) {
    drawTitle(ctx, v);
  },
};
