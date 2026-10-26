// Beat 10 — "And the nearest star? | Another ball, a ping-pong ball this time…"
// The camera lifts off the town map onto a night globe: the Sun was in New York all along. A red ping-pong ball
// (Proxima Centauri, 3.7 cm at this scale) lights up in Rome, with a magnifier inset.
// This file also owns the GLOBE itself (drawn whenever globeK > 0, beats 10–12) and exports the helpers that
// s11 (flight arc) and s12 (the empty ending) share.
import * as L from '../../../../engine/runtime/lib.js';
import { globeK, globeXY, GLOBE_C, R_EARTH, NEW_YORK, ROME } from '../env.js';
import { drawEarth } from '../../../../engine/runtime/earth.js';
import { at as camAt } from '../camera.js';

const { ease, clamp, lerp, prog, rgba } = L;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export const ACC = [255, 160, 70];
export const SUN_C = [255, 214, 150];        // the Sun as a point of light
export const STAR_C = [255, 92, 64];         // Proxima: a red dwarf
const COAST = [150, 188, 214];
const LAND_C = [52, 60, 70];

// ------------------------------------------------------------------ the globe: real Earth (engine/runtime/earth.js, ETOPO1)
// Same orthographic view as env.js globeXY (centre 45°N 30°W), so NEW_YORK / ROME land exactly on their coastlines.
const RAW = (lat, lon) => { const p = globeXY(lat, lon); return { x: p.x - GLOBE_C.x, y: p.y - GLOBE_C.y, front: p.front }; };
// graticule: 15° grid, front segments only
const GRAT = (() => {
  const lines = [];
  const add = (pts) => {
    let cur = [];
    for (const [la, lo] of pts) {
      const p = RAW(la, lo);
      if (p.front) cur.push(p.x + GLOBE_C.x, p.y + GLOBE_C.y);
      else if (cur.length) { if (cur.length > 2) lines.push(cur); cur = []; }
    }
    if (cur.length > 2) lines.push(cur);
  };
  for (let la = -75; la <= 75; la += 15) add(Array.from({ length: 121 }, (_, i) => [la, -180 + i * 3]));
  for (let lo = -180; lo < 180; lo += 15) add(Array.from({ length: 53 }, (_, i) => [-78 + i * 3, lo]));
  return lines;
})();

// ------------------------------------------------------------------ shared timing (global seconds)
export const T = (v) => {
  const sc = v.tl.scenes;
  return { b10: sc[11].start, b11: sc[12].start, b12: sc[13].start, end: sc[13].end };   // 04b: beats shifted +1 (cold open)
};
/** 0..1 how far the ending has dimmed the globe (beat 12) */
export function dimK(v) { return ease.inOutCubic(prog(v.gt, T(v).b12 + 0.4, 3.0)); }
/** Proxima lights up in Rome (s from beat 10 start: on "Another ball", once the globe has settled) */
export const STAR_T = 2.15;
export function starK(v) { return ease.outCubic(prog(v.gt, T(v).b10 + STAR_T, 0.5)); }

// ------------------------------------------------------------------ the globe
function drawGlobe(ctx, v, k) {
  const cx = v.wx(GLOBE_C.x), cy = v.wy(GLOBE_C.y), R = v.ws(R_EARTH);
  const huge = R > 5000;                                  // still in the "ground" regime: limb far off-screen
  ctx.save();
  ctx.globalAlpha *= k;
  // atmosphere halo (behind the sphere)
  if (!huge) {
    const g = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.12);
    g.addColorStop(0, 'rgba(80,150,255,0)');
    g.addColorStop(0.27, 'rgba(90,160,255,0.30)');
    g.addColorStop(0.45, 'rgba(70,130,240,0.12)');
    g.addColorStop(1, 'rgba(40,80,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R * 1.15, cy - R * 1.15, R * 2.3, R * 2.3);
  }
  // the real Earth at night: true coastlines, relief, city lights (they fade as the ending dims).
  // The map raster uses the camera at the FRAME time, not the motion-blur sub-frame time: during the fast lift-off
  // the four sub-frames would otherwise stack four copies of every coastline (a smeared, brush-stroke look).
  const fc = camAt(Math.round(v.gt * 30) / 30, v.tl);
  const fx = L.W / 2 + (GLOBE_C.x - fc.x) / fc.mpp, fy = L.H * (fc.anchor ?? 0.5) + (GLOBE_C.y - fc.y) / fc.mpp;
  // city lights live on a 0.25° grid: keep them off until a cell is a few px (no glowing blobs at town scale)
  const lk = (1 - dimK(v)) * clamp(1 - L.invLerp(13000, 20000, fc.mpp) * 0.4) * ease.inOutCubic(L.invLerp(2500, 7500, fc.mpp));
  drawEarth(ctx, {
    cx: fx, cy: fy, r: R_EARTH / fc.mpp, lon0: -30, lat0: 45, style: 'night', land: LAND_C, coast: COAST,
    relief: 1.2 * ease.inOutCubic(L.invLerp(2500, 8000, fc.mpp)),   // the 0.1° hillshade turns blocky once a cell is > 2 px
    lights: 0.9 * lk, atmosphere: huge ? false : 0.8, maxPixels: 2.2e6,
  });
  ctx.save();
  ctx.beginPath();
  if (huge) ctx.rect(-10, -10, L.W + 20, L.H + 20); else ctx.arc(cx, cy, Math.max(0, R), 0, TAU);
  ctx.clip();
  // graticule
  ctx.strokeStyle = 'rgba(140,180,230,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const ln of GRAT) {
    for (let i = 0; i < ln.length; i += 2) { const x = v.wx(ln[i]), y = v.wy(ln[i + 1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  }
  ctx.stroke();
  // limb: darken the edge, then a light sweep across the sphere as it settles
  if (!huge) {
    const lim = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    lim.addColorStop(0, 'rgba(0,0,0,0)');
    lim.addColorStop(1, 'rgba(0,4,12,0.4)');
    ctx.fillStyle = lim;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    const sw = prog(v.gt, T(v).b10 + 1.6, 1.6);
    if (sw > 0 && sw < 1) {
      const sx = cx + lerp(-1.6, 1.6, ease.inOutCubic(sw)) * R;
      const sg = ctx.createLinearGradient(sx - R * 0.35, cy - R * 0.2, sx + R * 0.35, cy + R * 0.2);
      sg.addColorStop(0, 'rgba(160,200,255,0)');
      sg.addColorStop(0.5, `rgba(160,200,255,${0.07 * Math.sin(Math.PI * sw)})`);
      sg.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = sg;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
  if (!huge) {
    ctx.strokeStyle = 'rgba(150,200,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, R), 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ points of light (also used by s12)
/** a star-like point: hot core, soft halo, faint horizontal streak */
export function pointLight(ctx, x, y, col, k, size = 1, streak = 0) {
  if (k <= 0) return;
  L.lightBlob(ctx, x, y, 70 * size, col, 0.32 * k);
  L.lightBlob(ctx, x, y, 22 * size, col, 0.75 * k);
  if (streak > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 160 * size, 0, x + 160 * size, 0);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, 0.35 * k * streak));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 160 * size, y - 1, 320 * size, 2);
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = rgba(L.mix(col, [255, 255, 255], 0.7), k);
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 3.2 * size), 0, TAU); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ magnifier inset (screen space)
/** circular lens at (x, y) radius r, scaled by k (0..1, overshoot allowed); `fn(cx, cy, r)` draws the content */
export function lens(ctx, x, y, r, k, fn, gt = 0) {
  if (k <= 0.001) return;
  const rr = r * k;
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.5);
  // drop shadow + backing
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 30;
  const bg = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.35, 0, x, y, rr);
  bg.addColorStop(0, '#1b1a22');
  bg.addColorStop(1, '#08080d');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, rr), 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, rr - 1), 0, TAU); ctx.clip();
  fn(x, y, rr);
  ctx.restore();
  // rim: thin warm ring + tick marks, slowly turning
  ctx.strokeStyle = rgba(ACC, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, rr), 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba([255, 230, 200], 0.28);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * TAU + gt * 0.05, l = i % 4 === 0 ? 9 : 5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (rr + 6), y + Math.sin(a) * (rr + 6));
    ctx.lineTo(x + Math.cos(a) * (rr + 6 + l), y + Math.sin(a) * (rr + 6 + l));
    ctx.stroke();
  }
  ctx.restore();
}

/** the red ping-pong ball (Proxima) drawn at (x, y) radius r */
function pingPong(ctx, x, y, r, gt) {
  L.lightBlob(ctx, x, y, r * 2.6, STAR_C, 0.35);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, '#ffd2b0');
  g.addColorStop(0.35, '#ff7a4e');
  g.addColorStop(0.8, '#d9362a');
  g.addColorStop(1, '#7a1414');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill();
  // granulation shimmer + a small flare (Proxima is a flare star)
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const rr = L.rng(77);
  for (let i = 0; i < 40; i++) {
    const a = rr() * TAU, d = Math.sqrt(rr()) * r * 0.92, s = r * (0.1 + rr() * 0.16);
    const tw = 0.5 + 0.5 * Math.sin(gt * (1.2 + rr()) + i);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    const gg = ctx.createRadialGradient(px, py, 0, px, py, s);
    gg.addColorStop(0, `rgba(255,190,130,${0.09 * tw})`);
    gg.addColorStop(1, 'rgba(255,190,130,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(px - s, py - s, 2 * s, 2 * s);
  }
  // a flare on the limb (Proxima is a flare star), breathing
  const fa = -0.6, fx = x + Math.cos(fa) * r * 0.86, fy = y + Math.sin(fa) * r * 0.86;
  const fk = 0.5 + 0.5 * Math.sin(gt * 1.3);
  const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 0.35);
  fg.addColorStop(0, `rgba(255,230,190,${0.35 * fk})`);
  fg.addColorStop(1, 'rgba(255,230,190,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(fx - r, fy - r, 2 * r, 2 * r);
  // the ping-pong seam: a thin equator ellipse
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,225,200,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.08, Math.max(0, r * 0.99), Math.max(0, r * 0.26), -0.18, 0, Math.PI); ctx.stroke();
  // limb darkening
  const lg = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
  lg.addColorStop(0, 'rgba(60,0,0,0)');
  lg.addColorStop(1, 'rgba(60,0,0,0.45)');
  ctx.fillStyle = lg;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  // specular
  const sp = ctx.createRadialGradient(x - r * 0.42, y - r * 0.45, 0, x - r * 0.42, y - r * 0.45, r * 0.4);
  sp.addColorStop(0, 'rgba(255,245,235,0.55)');
  sp.addColorStop(1, 'rgba(255,245,235,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}

// ------------------------------------------------------------------ beat timeline (seconds from beat start)
const B = {
  star: STAR_T,     // Proxima lights up in Rome
  leader: 2.4,      // leader draws up from Rome
  lens: 2.55,       // inset pops open ("ping-pong ball")
  label: 2.85,      // 3.7 cm label
};
/** inset placement relative to Rome on screen */
const LENS_DY = -310, LENS_DX = -10, LENS_R = 122;

export default {
  beat: 11,
  chapter: { num: '10', title: 'The nearest star', sub: 'Proxima Centauri' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.05, name: 'riser', gain: 0.22, pitch: 0.8 },
      { t: 1.5, name: 'swell', gain: 0.22, pitch: 0.9 },
      { t: B.star, name: 'ping', gain: 0.32, pitch: 1.5 },
      { t: B.lens, name: 'swish', gain: 0.22, pitch: 1.3 },
      { t: B.label + 0.05, name: 'tick', gain: 0.25, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    const k = globeK(v);
    if (k <= 0.001) return;
    drawGlobe(ctx, v, k);
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const rx = v.wx(ROME.x), ry = v.wy(ROME.y);
    ctx.save();
    ctx.globalAlpha *= v.k * endFade(v);
    // leader from Rome up to the lens
    const lx = rx + LENS_DX, ly = ry + LENS_DY;
    const lk = prog(t, B.leader, 0.45);
    if (lk > 0) {
      const ang = Math.atan2(ly - ry, lx - rx);
      const ex = lx - Math.cos(ang) * (LENS_R + 4), ey = ly - Math.sin(ang) * (LENS_R + 4);
      L.leader(ctx, rx + Math.cos(ang) * 14, ry + Math.sin(ang) * 14, ex, ey, lk, [255, 220, 200], 0.7);
      ctx.strokeStyle = rgba(STAR_C, 0.8 * ease.outCubic(lk));
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(rx, ry, Math.max(0, 14 + 6 * (1 - ease.outCubic(lk))), 0, TAU); ctx.stroke();
    }
    const ek = prog(t, B.lens, 0.55);
    if (ek > 0) {
      const s = ease.outBack(ek, 1.6);
      lens(ctx, lx, ly, LENS_R, s, (cx, cy, r) => {
        // gentle drift inside the lens (secondary motion)
        const dx = L.noise1(v.gt * 0.4, 3) * 3, dy = L.noise1(v.gt * 0.4, 4) * 3;
        pingPong(ctx, cx + dx, cy + dy, r * 0.56, v.gt);
      }, v.gt);   // 04b: the 15 px in-lens caption was unreadable; "A PING-PONG BALL" now sits in the side label
    }
    // label to the left of the lens
    const bk = prog(t, B.label, 0.6);
    if (bk > 0) {
      const bx = lx - LENS_R - 44, by = ly + 30;
      // soft dark backing so the label reads over coastlines and graticule
      const gcx = bx - 175, gcy = by - 30;
      const bg = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, 260);
      bg.addColorStop(0, `rgba(2,6,14,${0.55 * clamp(bk * 2)})`);
      bg.addColorStop(1, 'rgba(2,6,14,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(gcx - 270, gcy - 270, 540, 540);
      numLabel(ctx, { x: bx, y: by, big: '3.7 cm', small: ['A PING-PONG BALL', 'PROXIMA CENTAURI'], k: bk, accent: STAR_C.map((c, i) => lerp(c, ACC[i], 0.35)), align: 'right', size: 112 });
    }
    ctx.restore();
  },
};

/** a soft ~0.35 s exit that starts just before the beat ends (instead of the overlay's last-frames cut) */
export const endFade = (v) => 1 - L.smoothstep(prog(v.t, v.d - 0.25, 0.35));

/** big number + 1–2 small caps lines, like L.bigLabel but without the floating accent rule (04b review) */
export function numLabel(ctx, { x, y, big, small = [], k = 1, accent = ACC, align = 'left', size = 112 }) {
  if (k <= 0) return;
  const e = ease.outCubic(clamp(k));
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.4);
  ctx.textBaseline = 'alphabetic';
  ctx.font = L.font(size, 800, L.FONT.display);
  ctx.fillStyle = rgba(accent);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  L.trackedText(ctx, big, x, y + (1 - e) * 30, -1, align);
  ctx.shadowBlur = 8;
  (Array.isArray(small) ? small : [small]).forEach((ln, i) => {
    ctx.font = L.font(i ? 24 : 30, 600, L.FONT.body);
    ctx.fillStyle = rgba([205, 215, 230], i ? 0.75 : 0.95);
    L.trackedText(ctx, ln, x, y + 52 + i * 38 + (1 - e) * 18, 3, align);
  });
  ctx.restore();
}

/** small two-part tag under a point: NAME (white) · ROLE (colour) */
export function cityTag(ctx, x, y, name, role, k, col) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(k);
  ctx.textBaseline = 'middle';
  ctx.font = L.font(22, 700, L.FONT.body);
  const y0 = y + (1 - ease.outCubic(k)) * 10;
  // dark backing pill so the tag never sinks into a glow or a coastline
  const w1 = ctx.measureText(name).width + name.length * 3;
  ctx.font = L.font(18, 600, L.FONT.body);
  const w2 = role ? ctx.measureText(role).width + role.length * 3 : 0;
  ctx.font = L.font(22, 700, L.FONT.body);
  const pw = Math.max(w1, w2) + 34, ph = role ? 66 : 40;
  ctx.fillStyle = 'rgba(3,6,14,0.72)';
  ctx.beginPath(); ctx.roundRect(x - pw / 2, y0 - 20, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = rgba(col, 0.28);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(240,236,230,0.95)';
  L.trackedText(ctx, name, x, y0, 3, 'center');
  if (role) {
    ctx.font = L.font(18, 600, L.FONT.body);
    ctx.fillStyle = rgba(L.mix(col, [255, 255, 255], 0.3), 0.95);
    L.trackedText(ctx, role, x, y0 + 26, 3, 'center');
  }
  ctx.restore();
}
