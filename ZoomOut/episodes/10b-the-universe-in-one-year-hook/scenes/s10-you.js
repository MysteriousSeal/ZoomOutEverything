// Beat 10 — "And your whole life?"
// The camera dives into the very last second of the year (23:59:59). The second's cell becomes the frame:
// its edge lights up, a fine tenths-of-a-second ruler draws itself across it, then the final 0.18 s
// (an 80-year life) ignites as a narrow pillar of light pressed against midnight, a light sweep filling
// it from birth (left edge) to now (right edge). A standing figure rises inside it.
//
// This file owns the sliver for the rest of the film (beats 11 and 12 too): in the pull-back it shrinks
// into a glowing pinpoint at the bottom-right corner of Dec 31. Exports the geometry + helpers for s11/s12.
import * as L from '../../../../engine/runtime/lib.js';
import { stars } from '../../../../engine/runtime/kit.js';
import { at as camAt, secondRect } from '../camera.js';

/** f10cb: 1 while the camera holds, -> 0 while it zooms fast (> ~0.5 log-units/s), so fine ticks and cell numbers fade
 *  instead of smearing into multi-copy streaks under the motion blur */
function stillK(v) {
  const a = camAt(v.gt - 0.02, v.tl), b = camAt(v.gt + 0.02, v.tl);
  const z = Math.abs(Math.log(b.mpp / a.mpp)) / 0.04;
  return 1 - L.smoothstep(L.clamp((z - 0.15) / 0.5));
}

const { W, H } = L;
export const ACCENT = [240, 120, 220];
export const HOT = [255, 236, 250];
const INK = [235, 228, 240];

// ------------------------------------------------------------------ geometry (world units)
const SEC_RAW = secondRect(59);                                      // 23:59:59 → midnight
/** The second as env draws it (cells are inset 3% per side): everything here is measured inside it. */
export const SEC = { x: SEC_RAW.x + SEC_RAW.w * 0.03, y: SEC_RAW.y + SEC_RAW.h * 0.03, w: SEC_RAW.w * 0.94, h: SEC_RAW.h * 0.94 };
export const LIFE_S = 80 / 13.8e9 * 365 * 86400;                   // an 80-year life in calendar seconds ≈ 0.183
export const SLIVER = { x: SEC.x + SEC.w * (1 - LIFE_S), y: SEC.y, w: SEC.w * LIFE_S, h: SEC.h };
export const RULER_F = 0.2;                                          // ruler height inside the second (fraction)
export const RULER_Y = SEC.y + SEC.h * RULER_F;
const FIG_FOOT = 0.665, FIG_H = 0.235;                               // figure: feet + height as fractions of SEC.h

// ------------------------------------------------------------------ timing (beat-10 seconds)
const T_EDGE = 0.2, T_RULER = 0.7, T_IGN = 1.62;
const T_GHOST = 0.3;                           // a faint figure outline waits at midnight while the question is asked
const T_SCAN = T_RULER + 0.3;                  // a scan line counts across the second to where the life begins
const BEAT = 10;
/** Beat-10 time of the figure + fill reaching full. */
export const T_FIG = T_IGN + 0.35;

const sx = (v, f) => v.wx(SEC.x + SEC.w * f);

// Right half of a standing figure, neck (top centre) to crotch: [x, y] anchor points with an optional
// quadratic control [cx, cy] for the segment arriving at that point. Feet at y = 0, head top at y = -1.
const FIG = [
  [[0, -0.835]],
  [[0.034, -0.835]],
  [[0.1, -0.785], [0.036, -0.795]],      // neck into shoulder
  [[0.162, -0.715], [0.158, -0.775]],    // shoulder cap
  [[0.164, -0.445], [0.174, -0.58]],     // outer arm
  [[0.138, -0.432], [0.158, -0.41]],     // hand
  [[0.118, -0.62], [0.128, -0.53]],      // inner arm
  [[0.104, -0.47], [0.112, -0.54]],      // waist to hip
  [[0.088, -0.03], [0.106, -0.24]],      // outer leg
  [[0.062, 0], [0.092, 0]],              // foot
  [[0.03, 0]],
  [[0.014, -0.43], [0.022, -0.22]],      // inner leg
  [[0, -0.448], [0.006, -0.447]],        // crotch
];

/** A standing human silhouette path (feet centre at x,y; height h px). */
export function figurePath(c, x, y, h) {
  const P = ([px, py], s = 1) => [x + px * h * s, y + py * h];
  c.beginPath();
  c.moveTo(...P(FIG[0][0]));
  for (let i = 1; i < FIG.length; i++) {
    const [pt, ctl] = FIG[i];
    if (ctl) c.quadraticCurveTo(...P(ctl), ...P(pt)); else c.lineTo(...P(pt));
  }
  for (let i = FIG.length - 1; i > 0; i--) {             // mirrored left half, walked back up
    const [, ctl] = FIG[i];
    const prev = FIG[i - 1][0];
    if (ctl) c.quadraticCurveTo(...P(ctl, -1), ...P(prev, -1)); else c.lineTo(...P(prev, -1));
  }
  c.closePath();
  const [hx, hy] = P([0, -0.915]);
  c.moveTo(hx + 0.077 * h, hy);
  c.arc(hx, hy, Math.max(0, 0.077 * h), 0, Math.PI * 2);
}

/** Sliver intensity over the whole film (0 before ignition). */
export function sliverK(v10t) { return L.ease.outCubic(L.prog(v10t, T_IGN, 0.5)); }

/** Ruler of tenths across the last second (drawn in world space, sizes in px). */
function ruler(c, v, k) {
  if (k <= 0) return;
  const y = v.wy(RULER_Y), w = v.ws(SEC.w);
  if (w < 60 || y < -40 || y > H + 40) return;
  const x0 = sx(v, 0), x1 = sx(v, 1);
  const sk = stillK(v);
  if (sk <= 0.01) return;
  c.save();
  c.globalAlpha *= sk;
  c.lineCap = 'round';
  // base line wipes in left → right
  c.strokeStyle = L.rgba(INK, 0.4 * Math.min(1, k * 2));
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x0, y); c.lineTo(L.lerp(x0, x1, L.ease.inOutCubic(L.clamp(k * 1.3))), y); c.stroke();
  // ticks: 10 majors (0.1 s), 4 minors between, staggered
  const big = L.clamp(w / 700) * 20 + 6;
  for (let i = 0; i <= 50; i++) {
    const f = i / 50, major = i % 5 === 0;
    const tk = L.ease.outBack(L.clamp((k * 1.3 - f * 0.55) / 0.45));
    if (tk <= 0) continue;
    const len = (major ? big : big * 0.42) * tk;
    const x = L.lerp(x0, x1, f);
    c.strokeStyle = L.rgba(INK, (major ? 0.75 : 0.35) * L.clamp(tk));
    c.lineWidth = major ? 2 : 1.2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - len); c.stroke();
  }
  c.restore();
}

/** Rising motes inside the pillar (secondary motion). */
function motes(c, v, s, a) {
  if (a <= 0 || s.w < 20) return;
  const r = L.rng(1010);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const fx = r(), sp = 0.035 + r() * 0.05, ph = r(), sz = 0.8 + r() * 1.8, tw = r() * 6.28;
    const fy = 1 - ((ph + v.gt * sp) % 1);
    const x = s.x + s.w * (0.08 + fx * 0.84) + Math.sin(v.gt * 0.9 + tw) * s.w * 0.04;
    const y = s.y + s.h * fy;
    if (y < -10 || y > H + 10) continue;
    const edge = Math.sin(Math.PI * fy);
    c.fillStyle = L.rgba(L.mix(ACCENT, HOT, 0.6), a * 0.75 * edge * (0.5 + 0.5 * Math.sin(v.gt * 3 + tw)));
    c.beginPath(); c.arc(x, y, Math.max(0, sz), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ clean plate (deep zoom only)
// At this zoom env's 23:59 minute cell is drawn with its 3% inset measured on the *minute*, so its edge lands
// ~0.3 seconds-widths inside the frame: a stray translucent rectangle that belongs to nothing. Once the second
// fills the frame we repaint the background cleanly (gradient + stars + the correctly registered second cells).
const BG = (c) => {
  const g = c.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.85);
  g.addColorStop(0, '#120c16'); g.addColorStop(1, '#040306');
  return g;
};
const S0 = 48;                                       // recorded history's lit seconds (beat 8), kept consistent
function cleanPlate(c, v, k) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha = k;
  c.fillStyle = BG(c); c.fillRect(0, 0, W, H);
  // one soft tint standing in for the nested day / hour / minute cells, which all fill the frame at this zoom
  c.fillStyle = 'rgba(240,120,220,0.045)'; c.fillRect(0, 0, W, H);
  stars(c, v, 0.35, 120, 5);
  const lod = L.clamp(L.invLerp(0.0000055, 0.000014, v.cam.mpp));
  const ta = 0.6 * stillK(v);                        // f10cb: the cell numbers fade during fast zooms (no smeared multi-copy ':59')
  for (let i = 0; i < 60; i++) {
    const r = secondRect(i);
    const x = v.wx(r.x + r.w * 0.03), y = v.wy(r.y + r.h * 0.03), w = v.ws(r.w * 0.94), h = v.ws(r.h * 0.94);
    if (x > W || y > H || x + w < 0 || y + h < 0) continue;
    c.fillStyle = 'rgba(240,120,220,0.06)'; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(235,228,240,0.16)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (i >= S0 && lod > 0) {                        // beat 8's lit seconds, same look as s08 at this size
      const q = { x: v.wx(r.x + r.w * 0.05), y: v.wy(r.y + r.h * 0.05), w: v.ws(r.w * 0.9), h: v.ws(r.h * 0.9) };
      const g = c.createLinearGradient(0, q.y, 0, q.y + q.h);
      g.addColorStop(0, L.rgba(ACCENT, 0.34 * lod)); g.addColorStop(1, L.rgba(ACCENT, 0.34 * lod * 0.55));
      c.fillStyle = g; c.fillRect(q.x, q.y, q.w, q.h);
    }
    if (w > 50 && ta > 0.01) {
      c.font = L.font(L.clamp(w * 0.2, 10, 30), 600, L.FONT.body);
      c.fillStyle = L.rgba(INK, ta); c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText(`:${String(i).padStart(2, '0')}`, x + 4, y + 4);
    }
  }
  c.restore();
}

/** Anticipation while "And your whole life?" is spoken: a ghost figure + dashed slot wait at midnight,
 *  and a scan line counts across the second to the point where the life begins. t = beat-10 time. */
function anticipation(c, v, t) {
  const s = { x: v.wx(SLIVER.x), y: v.wy(SLIVER.y), w: v.ws(SLIVER.w), h: v.ws(SLIVER.h) };
  const S = { x: v.wx(SEC.x), y: v.wy(SEC.y), w: v.ws(SEC.w), h: v.ws(SEC.h) };
  if (S.x > W || S.y > H || S.x + S.w < 0 || S.y + S.h < 0) return;
  const size = L.clamp(L.invLerp(45, 120, S.w));
  const out = 1 - L.ease.inCubic(L.prog(t, T_IGN + 0.15, 0.45));
  const gk = L.ease.outCubic(L.prog(t, T_GHOST, 0.7)) * size * out;
  if (gk > 0) {
    const pulse = 0.75 + 0.25 * Math.sin((t - T_GHOST) * 4.2);
    c.save();
    // the empty slot: a dashed outline of where the life will be, pressed against midnight
    c.strokeStyle = L.rgba(ACCENT, 0.5 * gk * pulse);
    c.lineWidth = 1.5;
    c.setLineDash([6, 7]);
    c.lineDashOffset = -t * 18;
    c.strokeRect(s.x + 0.75, s.y + 0.75, Math.max(1, s.w - 1.5), s.h - 1.5);
    c.setLineDash([]);
    // midnight: a bright hairline on the right edge of the year
    c.fillStyle = L.rgba(HOT, 0.75 * gk);
    c.fillRect(S.x + S.w - 1.5, S.y, 2, S.h);
    // the ghost figure, outline only
    const fh = v.ws(SEC.h * FIG_H), fx = s.x + s.w / 2, fy = v.wy(SEC.y + SEC.h * FIG_FOOT);
    c.shadowColor = L.rgba(ACCENT, 0.7); c.shadowBlur = 12;
    c.strokeStyle = L.rgba(L.mix(ACCENT, HOT, 0.4), 0.8 * gk * pulse);
    c.lineWidth = Math.max(1.2, fh * 0.012);
    figurePath(c, fx, fy, fh);
    c.stroke();
    c.fillStyle = L.rgba(ACCENT, 0.1 * gk);
    c.fill();
    c.restore();
  }
  // the scan: sweeps from the start of the second (23:59:59.0) to the start of the life
  const sp = L.prog(t, T_SCAN, T_IGN - T_SCAN);
  const sa = Math.min(L.clamp(sp * 8), 1 - L.clamp((sp - 0.97) / 0.03)) * L.clamp(L.invLerp(80, 160, S.w));
  if (sp > 0 && sa > 0) {
    const x = L.lerp(S.x, s.x, L.ease.inOutCubic(sp));
    c.save();
    c.globalCompositeOperation = 'lighter';
    const tw = Math.min(220, Math.max(20, x - S.x));
    const g = c.createLinearGradient(x - tw, 0, x, 0);
    g.addColorStop(0, L.rgba(ACCENT, 0)); g.addColorStop(1, L.rgba(ACCENT, 0.13 * sa));
    c.fillStyle = g;
    c.fillRect(x - tw, S.y, tw, S.h);
    c.fillStyle = L.rgba(L.mix(ACCENT, HOT, 0.6), 0.75 * sa);
    c.fillRect(x - 1, S.y, 2, S.h);
    L.lightBlob(c, x, v.wy(RULER_Y), 40, HOT, 0.6 * sa);
    c.restore();
  }
}

/** The life sliver at any zoom: pillar → thin line → pinpoint. t = beat-10 time. */
export function drawSliver(c, v, t, { pin = 1 } = {}) {
  const k = sliverK(t);
  if (k <= 0) return;
  const s = { x: v.wx(SLIVER.x), y: v.wy(SLIVER.y), w: v.ws(SLIVER.w), h: v.ws(SLIVER.h) };
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  if (cx < -300 || cx > W + 300 || cy < -s.h - 300 || cy > H + s.h + 300) return;
  const sweep = L.ease.inOutCubic(L.prog(t, T_IGN, 0.55));          // birth → now
  const flash = Math.exp(-Math.max(0, t - T_IGN - 0.5) / 0.35) * L.clamp((t - T_IGN) / 0.2);
  const breathe = 0.92 + 0.08 * Math.sin(v.gt * 2.1);
  c.save();
  c.globalCompositeOperation = 'lighter';
  if (s.w > 2.5) {
    const top = Math.max(-20, s.y), bot = Math.min(H + 20, s.y + s.h);
    const fw = s.w * sweep;
    // outer halo (horizontal falloff)
    const hw = Math.min(140, s.w * 0.9 + 10);
    const hg = c.createLinearGradient(s.x - hw, 0, s.x + fw + hw, 0);
    hg.addColorStop(0, L.rgba(ACCENT, 0));
    hg.addColorStop(hw / (fw + 2 * hw), L.rgba(ACCENT, 0.16 * k * breathe));
    hg.addColorStop(1 - hw / (fw + 2 * hw), L.rgba(ACCENT, 0.16 * k * breathe));
    hg.addColorStop(1, L.rgba(ACCENT, 0));
    c.fillStyle = hg;
    c.fillRect(s.x - hw, top, fw + 2 * hw, bot - top);
    // body: vertical gradient, brighter around the figure
    const g = c.createLinearGradient(0, s.y, 0, s.y + s.h);
    g.addColorStop(0, L.rgba(ACCENT, 0.16 * k));
    g.addColorStop(0.5, L.rgba(ACCENT, (0.34 + 0.25 * flash) * k * breathe));
    g.addColorStop(1, L.rgba(ACCENT, 0.16 * k));
    c.fillStyle = g;
    c.fillRect(s.x, top, fw, bot - top);
    // edge lines: birth (left) and now (right, midnight)
    c.fillStyle = L.rgba(L.mix(ACCENT, HOT, 0.5), 0.85 * k);
    c.fillRect(s.x, top, Math.max(1, Math.min(2.5, s.w * 0.02)), bot - top);
    if (sweep < 1) {   // bright leading edge while the life plays
      c.fillStyle = L.rgba(HOT, 0.9);
      c.fillRect(s.x + fw - 2, top, 4, bot - top);
      L.lightBlob(c, s.x + fw, (top + bot) / 2, Math.min(260, s.w * 1.6), HOT, 0.35);
    } else {
      c.fillStyle = L.rgba(HOT, 0.95 * k);
      c.fillRect(s.x + s.w - Math.max(1.5, Math.min(3, s.w * 0.02)), top, Math.max(1.5, Math.min(3, s.w * 0.02)), bot - top);
    }
    // slow glint travelling down the pillar (secondary motion during the holds)
    if (sweep >= 1 && s.h > 300) {
      const ph = ((t - T_IGN - 0.6) / 2.6) % 1;
      if (ph > 0) {
        const gy = s.y + s.h * L.lerp(-0.1, 1.1, L.ease.inOutCubic(ph)), gh = s.h * 0.16;
        const gg = c.createLinearGradient(0, gy - gh, 0, gy + gh);
        gg.addColorStop(0, L.rgba(HOT, 0)); gg.addColorStop(0.5, L.rgba(HOT, 0.16 * k)); gg.addColorStop(1, L.rgba(HOT, 0));
        c.fillStyle = gg;
        c.fillRect(s.x, Math.max(top, gy - gh), s.w, Math.min(bot, gy + gh) - Math.max(top, gy - gh));
      }
    }
    // ignition bloom
    if (flash > 0.01) L.lightBlob(c, cx, v.wy(SEC.y + SEC.h * 0.55), Math.min(900, s.w * 4), ACCENT, 0.55 * flash);
  }
  c.restore();
  // motes + figure while the pillar is big
  const big = L.clamp(L.invLerp(30, 90, s.w));
  if (big > 0) {
    motes(c, v, s, k * big);
    const fk = L.ease.outCubic(L.prog(t, T_IGN + 0.25, 0.75)) * big;
    if (fk > 0) {
      const fh = v.ws(SEC.h * FIG_H), fx = cx, fy = v.wy(SEC.y + SEC.h * FIG_FOOT) + (1 - fk) * 26;
      c.save();
      c.globalAlpha = fk;
      L.lightBlob(c, fx, fy - fh * 0.55, fh * 0.75, ACCENT, 0.35);
      const g = c.createLinearGradient(0, fy - fh, 0, fy);
      g.addColorStop(0, L.rgba(HOT));
      g.addColorStop(1, L.rgba(L.mix(ACCENT, HOT, 0.55)));
      c.fillStyle = g;
      c.shadowColor = L.rgba(ACCENT, 0.9);
      c.shadowBlur = 24;
      figurePath(c, fx, fy, fh);
      c.fill();
      c.shadowBlur = 0;
      // soft floor reflection
      const rg = c.createRadialGradient(fx, fy + 4, 0, fx, fy + 4, fh * 0.22);
      rg.addColorStop(0, L.rgba(HOT, 0.45)); rg.addColorStop(1, L.rgba(HOT, 0));
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = rg;
      c.save(); c.translate(fx, fy + 4); c.scale(1, 0.18); c.translate(-fx, -(fy + 4));
      c.fillRect(fx - fh * 0.22, fy + 4 - fh * 0.22, fh * 0.44, fh * 0.44);
      c.restore();
      c.restore();
    }
  }
  // pinpoint once the sliver is too small to read as a shape
  const small = L.clamp(L.invLerp(14, 3, s.w)) * pin;
  if (small > 0) {
    const px = s.x + s.w, py = s.y + s.h;       // the very end of the year: bottom-right corner
    const tw = 0.85 + 0.15 * Math.sin(v.gt * 3.1);
    L.lightBlob(c, px, py, 46 * tw, ACCENT, 0.75 * small * k);
    L.lightBlob(c, px, py, 14, HOT, 0.9 * small * k);
    c.save();
    c.fillStyle = L.rgba(HOT, small * k);
    c.beginPath(); c.arc(px, py, 3.2, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

/** Screen position of the pinpoint (the last instant of the year). */
export const pinAt = (v) => ({ x: v.wx(SLIVER.x + SLIVER.w), y: v.wy(SLIVER.y + SLIVER.h) });

export default {
  beat: BEAT,
  chapter: { num: '10', title: 'Your life', sub: 'Inside the very last second' },
  captions: true,
  layer: 6,
  cues(d) {
    return [
      { t: T_EDGE + 0.1, name: 'shimmer', gain: 0.18, pitch: 1.2 },
      { t: T_RULER, name: 'tick', gain: 0.2, pitch: 1.3 },
      { t: T_RULER + 0.25, name: 'tick', gain: 0.14, pitch: 1.5 },
      { t: T_IGN - 0.9, name: 'riser', gain: 0.22, pitch: 1.1 },
      { t: T_IGN, name: 'bloom', gain: 0.42, pitch: 1.0 },
      { t: T_IGN + 0.05, name: 'swish', gain: 0.2, pitch: 1.4 },
      { t: T_IGN + 0.35, name: 'shimmer', gain: 0.26, pitch: 1.3 },
    ];
  },
  drawWorld(c, v) {
    const t = v.t;
    if (t < -0.2) return;
    const s = { x: v.wx(SEC.x), y: v.wy(SEC.y), w: v.ws(SEC.w), h: v.ws(SEC.h) };
    // 0) clean plate once the second is big (hides env's misregistered 23:59 minute cell)
    cleanPlate(c, v, L.clamp(L.invLerp(110, 240, s.w)));
    // fade the ruler + edge out as the pull-back shrinks the second
    const scale = L.clamp(L.invLerp(120, 360, s.w));
    // 1) the second's edge lights up as it becomes the frame
    const ek = L.ease.outCubic(L.prog(t, T_EDGE, 0.8)) * L.clamp(L.invLerp(20, 80, s.w));
    if (ek > 0 && !(s.x > W || s.y > H || s.x + s.w < 0 || s.y + s.h < 0)) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = L.rgba(ACCENT, 0.05 * ek);
      c.fillRect(s.x, s.y, s.w, s.h);
      c.strokeStyle = L.rgba(ACCENT, 0.55 * ek);
      c.lineWidth = 2;
      c.shadowColor = L.rgba(ACCENT, 0.8); c.shadowBlur = 16 * ek;
      c.strokeRect(s.x, s.y, s.w, s.h);
      c.restore();
    }
    // 2) tenths-of-a-second ruler
    ruler(c, v, L.prog(t, T_RULER, 0.8) * scale);
    // 2b) anticipation: ghost figure + scan line while the question is asked
    if (t < T_IGN + 0.7) anticipation(c, v, t);
    // 3) the life sliver (all the way to the end of the film)
    drawSliver(c, v, t);
  },
  drawOverlay() {},
};
