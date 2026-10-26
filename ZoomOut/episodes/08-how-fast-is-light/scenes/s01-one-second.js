// Beat 1 — 299,792 km/s. The refined Earth globe (drawn every frame for the whole film, true size,
// LOD down to a marker), the photon parked at its limb, and the speed readout counting up.
//
// SHARED COMPONENTS (import these from other scenes; do not copy):
//   drawClock(ctx, v, opts)    the travel-time clock: the hero readout at the top of the frame
//   clockSegs(sec)             seconds -> [{n, u}] segments ('1.28' S · '8' MIN '20' S · '4.24' YEARS ...)
//   clockRun(t, t0, t1, total, mode)   running clock value (seconds) between beat-local times t0..t1
//   drawPhoton(ctx, x, y, opts)        the photon head (screen px, additive)
//   drawBeam(ctx, x0, y0, x1, y1, opts) a straight fading trail from tail (x0,y0) to head (x1,y1)
//   PHOTON_GOLD, CLOCK_Y
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH } from '../camera.js';
import { drawEarth } from '../../../../engine/runtime/earth.js';

const { W } = L;
const DEG = Math.PI / 180;
export const PHOTON_GOLD = [255, 214, 130];
const HOT = [255, 247, 228];
/** radius (m) where the photon parks above Earth (beat 1) and starts its laps (beat 2) */
export const R_PARK = R_EARTH * 1.05;

// ====================================================================== shared: photon
/** The photon head: hot white core, gold bloom, faint diffraction spikes. Screen px, additive. */
export function drawPhoton(ctx, x, y, { s = 1, a = 1, spikes = true, rot = 0.35 } = {}) {
  if (a <= 0 || s <= 0) return;
  L.lightBlob(ctx, x, y, 120 * s, [255, 190, 100], 0.32 * a);
  L.lightBlob(ctx, x, y, 38 * s, [255, 232, 180], 0.95 * a);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (spikes) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const an = rot + i * Math.PI / 2, len = (i ? 46 : 70) * s;
      const dx = Math.cos(an) * len, dy = Math.sin(an) * len;
      const g = ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
      g.addColorStop(0, 'rgba(255,230,180,0)');
      g.addColorStop(0.5, `rgba(255,240,210,${0.55 * a})`);
      g.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(0.8, 1.6 * s);
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    }
  }
  ctx.fillStyle = `rgba(255,253,245,${a})`;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, 4.4 * s), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** A straight light trail, transparent at the tail (x0,y0), hot at the head (x1,y1). Additive. */
export function drawBeam(ctx, x0, y0, x1, y1, { a = 1, w = 1 } = {}) {
  if (a <= 0 || Math.hypot(x1 - x0, y1 - y0) < 0.5) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const passes = [[18 * w, [255, 180, 80], 0.10], [6.5 * w, [255, 210, 130], 0.30], [2.2 * w, HOT, 0.95]];
  for (const [lw, col, al] of passes) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, L.rgba(col, 0));
    g.addColorStop(0.55, L.rgba(col, al * a * 0.35));
    g.addColorStop(1, L.rgba(col, al * a));
    ctx.strokeStyle = g;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.restore();
}

/**
 * A photon travelling a straight world path A -> B ({x, y} metres) with progress p (0..1).
 *   trail: trail length as a fraction of the path · route: alpha of the thin route line left behind
 *   head: alpha of the photon head (fade it on arrival) · s: head size · a: overall alpha
 */
export function drawTravel(ctx, v, A, B, p, { trail = 0.25, route = 0.35, head = 1, s = 1, a = 1 } = {}) {
  if (p <= 0 || a <= 0) return;
  p = Math.min(1, p);
  const hx = L.lerp(A.x, B.x, p), hy = L.lerp(A.y, B.y, p);
  const tq = Math.max(0, p - trail);
  const ax = v.wx(A.x), ay = v.wy(A.y), sx = v.wx(hx), sy = v.wy(hy);
  if (route > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = L.rgba(PHOTON_GOLD, route * a);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.restore();
  }
  drawBeam(ctx, v.wx(L.lerp(A.x, B.x, tq)), v.wy(L.lerp(A.y, B.y, tq)), sx, sy, { a: a * head, w: s });
  if (head > 0) drawPhoton(ctx, sx, sy, { s: 0.8 * s, a: a * head, rot: 0.35 + v.gt * 0.2 });
}

// ====================================================================== shared: travel-time clock
export const CLOCK_Y = 452;          // numeral baseline (screen px); the label line sits ~105 px above
const YR = 31557600;

/** Seconds -> readout segments. Numbers are drawn big (tabular DIN), units small. */
export function clockSegs(sec) {
  sec = Math.max(0, sec);
  if (sec < 60) return [{ n: sec.toFixed(2), u: 'S' }];
  if (sec < 3600) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return [{ n: String(m), u: 'MIN' }, { n: String(s).padStart(2, '0'), u: 'S' }];
  }
  if (sec < 3 * 86400) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return [{ n: String(h), u: 'H' }, { n: String(m).padStart(2, '0'), u: 'MIN' }];
  }
  const y = sec / YR;
  if (y < 100) return [{ n: y.toFixed(2), u: 'YEARS' }];
  if (y < 1e9) return [{ n: L.fmt(Math.floor(y)), u: 'YEARS' }];
  return [{ n: (y / 1e9).toFixed(1), u: 'BILLION YEARS' }];
}

/**
 * Running clock value (seconds): 0 before t0, `total` after t1.
 * mode 'lin' = constant rate (true light speed feel), 'ease' = inOut, 'exp' = exponential (huge ranges).
 */
export function clockRun(t, t0, t1, total, mode = 'lin') {
  const p = L.prog(t, t0, t1 - t0);
  if (mode === 'ease') return total * L.ease.inOutCubic(p);
  if (mode === 'exp') return p <= 0 ? 0 : Math.min(total, Math.pow(total + 1, p) - 1);
  return total * p;
}

// The overlay pass is motion-blurred (sub-frames spread over the shutter). A running readout whose
// digits change between sub-frames renders as ghosted mush, so the digits are frozen per output
// frame: the first sub-frame of a frame decides the segments, the others reuse them.
const FRAME_SEGS = new Map();
let FRAME_IDX = -1;
function frameSegs(v, key, segs) {
  const f = Math.round(v.gt * 30);
  if (f !== FRAME_IDX) { FRAME_IDX = f; FRAME_SEGS.clear(); }
  const hit = FRAME_SEGS.get(key);
  if (hit) return hit;
  FRAME_SEGS.set(key, segs);
  return segs;
}

/**
 * The travel-time clock (screen space, centred at x=540). Draw it from drawOverlay.
 *   sec        value in seconds (formatted by clockSegs), or pass `segs` [{n, u}] directly
 *   label      small line above the numerals while running (default 'LIGHT TRAVEL TIME')
 *   lockAt     beat-local time when the clock locks (flash, brackets snap, digits turn accent)
 *   lockLabel  label shown once locked (e.g. 'EARTH TO MOON')
 *   k          visibility (default v.k); entering digits rise in, leaving digits rise out
 *   segs[i].lead  optional: number of leading characters drawn dimmed (e.g. '000,512' with lead 4)
 */
export function drawClock(ctx, v, { sec = 0, segs, label = 'LIGHT TRAVEL TIME', lockAt = null, lockLabel = null,
  k = v.k, y = CLOCK_Y, x = W / 2, size = 124 } = {}) {
  if (k <= 0.001) return;
  segs = frameSegs(v, `${label}|${lockLabel}|${x}|${y}`, segs ?? clockSegs(sec));
  const acc = v.accent;
  const lp = lockAt == null ? -1 : v.t - lockAt;           // seconds since lock (<0 = running)
  const locked = lp >= 0;
  const leaving = v.t > v.d * 0.5 && v.k < 1;
  // hand-offs between beats are sequential: the old readout is gone before the new one starts to rise
  const kk = leaving ? L.clamp((k - 0.85) / 0.15) : L.clamp((k - 0.6) / 0.4);
  if (kk <= 0.001) return;
  const ke = L.ease.outCubic(kk);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // ---- measure (tabular digits so a running clock never jitters)
  ctx.font = L.font(size, 700, L.FONT.din);
  const cell = ctx.measureText('0').width;
  const cw = (ch) => (/[0-9]/.test(ch) ? cell : ctx.measureText(ch).width);
  const nW = (s) => [...s].reduce((a, ch) => a + cw(ch), 0);
  const uSize = Math.round(size * 0.3);
  ctx.font = L.font(uSize, 600, L.FONT.body);
  ctx.letterSpacing = '3px';
  const uW = segs.map((s) => ctx.measureText(s.u).width);
  ctx.letterSpacing = '0px';
  ctx.font = L.font(size, 700, L.FONT.din);
  const parts = segs.map((s, i) => ({ n: s.n, w: nW(s.n), uw: uW[i], u: s.u, lead: s.lead ?? 0 }));
  const gapU = 12, gapS = 22;
  const total = parts.reduce((a, p) => a + p.w + gapU + p.uw, 0) + gapS * (parts.length - 1);
  const x0 = x - total / 2, x1 = x + total / 2;
  const top = y - size * 0.74, bot = y + 10;

  // ---- dark backing so the readout holds over busy visuals
  ctx.globalAlpha = ke;
  // (filled as the full gradient disc, so it never ends on a hard edge over bright content)
  const bgR = Math.max(200, total * 0.75), bgY = y - size * 0.35;
  const bg = ctx.createRadialGradient(x, bgY, 10, x, bgY, bgR);
  bg.addColorStop(0, 'rgba(2,3,8,0.55)');
  bg.addColorStop(0.6, 'rgba(2,3,8,0.3)');
  bg.addColorStop(1, 'rgba(2,3,8,0)');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(x, bgY, bgR, 0, Math.PI * 2); ctx.fill();

  // ---- lock flash: a soft bloom and a light sweep across the digits
  if (locked && lp < 1.2) {
    const f = Math.exp(-lp * 3.2);
    L.lightBlob(ctx, x, y - size * 0.35, total * 0.7 + 60, acc, 0.22 * f * ke);
  }

  // ---- corner brackets: loose while running, snap tight on lock
  const snap = locked ? L.ease.outBack(L.prog(lp, 0, 0.4), 2.4) : 0;
  const pad = L.lerp(30, 18, snap) + (1 - ke) * 20;
  const bx0 = x0 - pad, bx1 = x1 + pad, by0 = top - pad * 0.7, by1 = bot + pad * 0.5;
  const bl = 22;
  ctx.strokeStyle = locked ? L.rgba(L.mix([235, 235, 235], acc, Math.min(1, lp * 5)), 0.9) : 'rgba(225,230,240,0.42)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]]) {
    ctx.moveTo(cx + sx * bl, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * bl);
  }
  ctx.stroke();

  // ---- label line (crossfades to lockLabel once locked) with a status dot
  const ly = by0 - 26;
  // sequential swap: the old label slides up and out first, then the new one rises in (never stacked)
  const sOut = lockLabel && locked ? L.ease.inCubic(L.prog(lp, 0.0, 0.14)) : 0;
  const sIn = lockLabel && locked ? L.ease.outCubic(L.prog(lp, 0.16, 0.26)) : 0;
  ctx.font = L.font(22, 600, L.FONT.body);
  const drawLabel = (txt, a, dy) => {
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = ke * a;
    ctx.fillStyle = 'rgba(205,213,226,0.92)';
    ctx.letterSpacing = '5px';
    const lw = ctx.measureText(txt).width - 5;
    ctx.letterSpacing = '0px';
    const lx = x - lw / 2 + 13;
    L.trackedText(ctx, txt, lx, ly + dy, 5, 'left');
    // status dot: pulses while running, solid accent once locked
    const pulse = locked ? 1 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(v.gt * 9));
    ctx.fillStyle = L.rgba(locked ? acc : [255, 120, 90], pulse);
    ctx.beginPath(); ctx.arc(lx - 20, ly + dy - 8, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  drawLabel(label, 1 - sOut, -sOut * 14);
  if (lockLabel) drawLabel(lockLabel, sIn, (1 - sIn) * 14);

  // ---- numerals + units: roll in from below on entry, out upwards on exit (clipped band)
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - 40, top - 12, total + 80, bot - top + 30); ctx.clip();
  const roll = (1 - ke) * size * 0.9 * (leaving ? -1 : 1);
  const digitCol = locked ? L.mix([255, 255, 255], acc, Math.min(1, lp * 4)) : [246, 246, 244];
  let cx = x0;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 16;
  parts.forEach((p, i) => {
    ctx.font = L.font(size, 700, L.FONT.din);
    [...p.n].forEach((ch, j) => {
      const w = cw(ch);
      const dim = j < p.lead;
      // stagger the roll per character for a mechanical feel
      const st = roll * (1 + j * 0.06);
      ctx.fillStyle = dim ? 'rgba(150,160,180,0.22)' : L.rgba(digitCol);
      ctx.fillText(ch, cx + (w - ctx.measureText(ch).width) / 2, y + st);
      cx += w;
    });
    cx += gapU;
    ctx.font = L.font(uSize, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(190,200,216,0.95)';
    L.trackedText(ctx, p.u, cx, y + roll * 1.1, 3, 'left');
    cx += p.uw + gapS;
  });
  ctx.restore();
  ctx.restore();
}

// ====================================================================== the Earth globe
// The real Earth (engine/runtime/earth.js: NOAA ETOPO1 coastlines + relief, Blue-Marble biomes, real city lights on
// the night side), lit by earthLight() and spun by earthRot(). Orientation matches the original framing: Africa and
// Europe facing us, north pole pitched 16 deg toward the viewer.
const GLOBE_LAT0 = 16, GLOBE_TILT = 18;
/**
 * Draw the Earth globe at screen (sx, sy) with radius r (px).
 * light: 3D unit vector toward the Sun in screen coords (x right, y down, z toward viewer). rot: spin (rad).
 */
export function drawGlobe(ctx, sx, sy, r, light, rot = 0, alpha = 1) {
  if (alpha <= 0) return;
  if (r < 5) {
    // marker: a small blue world with a lit side
    const rr = Math.max(3.4, r);
    L.lightBlob(ctx, sx, sy, rr * 7, [90, 150, 255], 0.45 * alpha);
    const g = ctx.createRadialGradient(sx + light[0] * rr * 0.5, sy + light[1] * rr * 0.5, 0, sx, sy, rr);
    g.addColorStop(0, `rgba(170,215,255,${alpha})`);
    g.addColorStop(1, `rgba(30,80,170,${alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, rr, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const [Lx, Ly, Lz] = light;
  drawEarth(ctx, {
    cx: sx, cy: sy, r, lon0: rot / DEG, lat0: GLOBE_LAT0, rot: 0, tilt: GLOBE_TILT,
    style: 'day', sun: [Lx, -Ly, Lz], lights: 0.9, alpha,
  });
  // atmosphere: a thin glowing shell, brighter toward the Sun (forward-scatters when backlit)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const back = L.clamp(-Lz);
  const ox = Lx * r * 0.035, oy = Ly * r * 0.035;
  const g = ctx.createRadialGradient(sx + ox, sy + oy, r * 0.98, sx + ox, sy + oy, r * 1.11);
  g.addColorStop(0, 'rgba(80,150,255,0)');
  g.addColorStop(0.12, `rgba(120,185,255,${(0.35 + 0.35 * back) * alpha})`);
  g.addColorStop(0.4, `rgba(70,130,255,${(0.14 + 0.15 * back) * alpha})`);
  g.addColorStop(1, 'rgba(40,90,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx + ox, sy + oy, Math.max(0, r * 1.11), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // wide soft halo
  L.lightBlob(ctx, sx + Lx * r * 0.2, sy + Ly * r * 0.2, r * 1.9, [40, 90, 200], 0.16 * alpha);
}

/** Light direction toward the Sun (screen coords). The hook sweeps it from behind Earth (a sunrise). */
export function earthLight(gt) {
  const phi = L.lerp(-62, 38, L.ease.inOutCubic(L.prog(gt, 1.15, 1.75))) * DEG;
  const dx = Math.cos(-20 * DEG), dy = Math.sin(-20 * DEG);
  return [dx * Math.cos(phi), dy * Math.cos(phi), Math.sin(phi)];
}
const earthRot = (gt) => 0.3 - gt * 0.035;

// ====================================================================== scene
export default {
  beat: 1,
  chapter: { num: '01', title: 'The speed of light', sub: 'In empty space' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.47, name: 'count', gain: 0.32, pitch: 1.0 },
      { t: 2.0, name: 'tick', gain: 0.4, pitch: 1.1 },
      { t: 2.02, name: 'ping', gain: 0.22, pitch: 1.3 },
      { t: 2.18, name: 'shimmer', gain: 0.18, pitch: 1.0 },
    ];
  },

  drawWorld(ctx, v) {
    const sx = v.wx(0), sy = v.wy(0), r = v.ws(R_EARTH);
    // on the big pull-outs Earth becomes a marker, then hands over to the Sun's point of light
    const far = 1 - L.clamp((Math.log10(v.cam.mpp) - 9.9) / 0.6);
    // the hook: the globe resolves out of black as the light sweeps across it
    const show = L.ease.inOutCubic(L.prog(v.gt, 0.8, 1.0));
    const a = far * show;
    if (a <= 0 || sx < -r * 1.3 - 40 || sx > W + r * 1.3 + 40 || !v.visibleY(-R_EARTH * 1.3 - 40 * v.cam.mpp, R_EARTH * 1.3 + 40 * v.cam.mpp, 0)) return;
    drawGlobe(ctx, sx, sy, r, earthLight(v.gt), earthRot(v.gt), a);

    // the photon parked above the limb for this beat (s02 takes it over at the start of beat 2)
    if (v.t >= 0 && v.t < v.d) {
      const px = v.wx(0), py = v.wy(-R_PARK);
      const breathe = 1 + 0.08 * Math.sin(v.gt * 3.2);
      drawPhoton(ctx, px, py, { s: 0.62 * breathe, a: 1, rot: 0.35 + v.gt * 0.15 });
      // a gentle ripple once the speed locks
      const rp = L.prog(v.t, 2.0, 1.1);
      if (rp > 0 && rp < 1) {
        ctx.save();
        ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.5 * (1 - rp));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, Math.max(0, 8 + 70 * L.ease.outCubic(rp)), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  },

  drawOverlay(ctx, v) {
    const c = Math.round(299792 * L.ease.outExpo(L.prog(v.t, 0.45, 1.55)));
    // zero-padded so the width never changes; the leading zeros sit dimmed
    const raw = String(c).padStart(6, '0'), n = raw.slice(0, 3) + ',' + raw.slice(3);
    const nz = raw.search(/[1-9]/), lead = nz < 0 ? 6 : nz;
    drawClock(ctx, v, {
      segs: [{ n, u: 'KM/S', lead: lead + (lead >= 3 ? 1 : 0) }],
      label: 'THE SPEED OF LIGHT', lockAt: 2.0, lockLabel: 'EVERY SINGLE SECOND',
    });
  },
};
