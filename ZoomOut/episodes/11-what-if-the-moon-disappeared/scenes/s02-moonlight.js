// Beat 2 — "Today, a full Moon lights the land with reflected sunlight."
// Flashback: the Moon swells back into the sky ("Today, a full Moon"). On "lights the land" a cool beam of
// moonlight draws from the Moon down to the sand and pools there. On "reflected sunlight" the source is revealed:
// a warm beam of sunlight rises from beyond the dune (the Sun is below the horizon, behind us) to the Moon, which
// flares as it arrives; then photons stream sun → Moon → sand, warm turning silver at the bounce.
// Label "≈ 0.2 lux" / "full Moon · reflected sunlight" sits exactly where s03's lux meter reads 0.2 (hand-off).
// The beams persist into beat 3 and fade with moonlight(). Exports the lux-meter layout + drawLux for s03.
import * as L from '../../../../engine/runtime/lib.js';
import { drawSkyMoon, moonlight, beatAt, terrain, skyK, SKY_MOON } from '../env.js';
import { wordTime } from './s00-hook.js';

const { W } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ lux meter layout (shared with s03)
export const LUX = { gx: 140, y1: 340, dec: 160, lx: 186 };   // track x, y of 1 lux, px per decade, readout x
export const luxY = (lux) => LUX.y1 - Math.log10(lux) * LUX.dec;
export const fmtLux = (l) => String(parseFloat(l.toPrecision(l > 0.15 || l < 0.0095 ? 1 : 2)));

/** The readout: "≈ 0.2 lux", vertically centred on the meter mark at yMark. */
export function drawLux(c, { x, yMark, size, value, k = 1, accent, approx = true }) {
  if (k <= 0) return;
  c.save();
  c.globalAlpha *= L.clamp(k);
  c.textBaseline = 'alphabetic';
  const base = yMark + size * 0.36;
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 18;
  let xx = x;
  if (approx) {
    c.font = L.font(size * 0.62, 700, L.FONT.display);
    c.fillStyle = L.rgba(accent, 0.8);
    c.fillText('≈', xx, base - size * 0.04);
    xx += c.measureText('≈ ').width;
  }
  c.font = L.font(size, 800, L.FONT.display);
  c.fillStyle = L.rgba(accent);
  xx += L.trackedText(c, value, xx, base, -1, 'left') + size * 0.12;
  c.font = L.font(size * 0.42, 600, L.FONT.body);
  c.fillStyle = 'rgba(215,225,240,0.9)';
  L.trackedText(c, 'lux', xx, base, 1, 'left');
  c.restore();
}

/** "FULL MOON / REFLECTED SUNLIGHT" under the readout (two short lines keep clear of the sunbeam). */
export function subLines(c, yMark, dy = 0) {
  c.font = L.font(25, 600, L.FONT.body);
  c.fillStyle = 'rgba(205,215,232,0.95)';
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 10;
  L.trackedText(c, 'FULL MOON', LUX.lx + 4, yMark + 90 + dy, 2.5, 'left');
  L.trackedText(c, 'REFLECTED SUNLIGHT', LUX.lx + 4, yMark + 124 + dy * 1.3, 2.5, 'left');
}

// ------------------------------------------------------------------ timing (beat-relative, from the VO)
function times(v) {
  const s = v.tl.scenes[2].start;
  const lights = wordTime(v.tl, 2, /^lights/i) - s, land = wordTime(v.tl, 2, /^land/i) - s;
  const refl = wordTime(v.tl, 2, /^reflected/i) - s;
  return { b0: lights - 0.05, b1: land + 0.1, s0: refl - 0.15, s1: refl + 0.5 };
}

// ------------------------------------------------------------------ geometry
const SUN0 = { x: -60, y: 1000 };          // the sunbeam rises from beyond the dune (lower-left)
function sandTarget(v) {
  const x = -2.6;
  return { x: v.wx(x), y: v.wy(-terrain(x)) };
}
function horizonY(v, sx) {
  const wx = v.cam.x + (sx - W / 2) * v.cam.mpp;
  return v.wy(-Math.max(0, terrain(wx)));
}
/** Clip to the sky above the ground/sea line, so the beams pass behind the dune. */
function clipSky(c, v) {
  c.beginPath();
  c.moveTo(-80, -80); c.lineTo(W + 80, -80);
  for (let sx = W + 80; sx >= -80; sx -= 24) c.lineTo(sx, horizonY(v, sx) + 2);
  c.closePath();
  c.clip();
}

function beam(c, ax, ay, bx, by, p, col, a) {
  if (p <= 0 || a <= 0) return;
  const ex = L.lerp(ax, bx, p), ey = L.lerp(ay, by, p);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  const g = (al) => {
    const gr = c.createLinearGradient(ax, ay, ex, ey);
    gr.addColorStop(0, L.rgba(col, al * 0.15));
    gr.addColorStop(0.25, L.rgba(col, al));
    gr.addColorStop(1, L.rgba(col, al));
    return gr;
  };
  for (const [w, al] of [[26, 0.05], [9, 0.11], [2, 0.75]]) {
    c.strokeStyle = g(al * a);
    c.lineWidth = w;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke();
  }
  c.restore();
  if (p < 1) {
    L.lightBlob(c, ex, ey, 34, col, 0.7 * a);
    L.lightBlob(c, ex, ey, 7, [255, 255, 255], 0.9 * a);
  }
}

const WARM = [255, 206, 140], COOL = [190, 210, 255];

function drawBeams(c, v) {
  const b = beatAt(v.tl, v.gt);
  if (b < 2 || b > 3 || skyK(v) <= 0) return;
  const f = b === 2 ? 1 : Math.pow(moonlight(v), 1.3);
  if (f <= 0.003) return;
  const t = v.t;   // beat-2 relative (keeps counting through beat 3)
  const T = times(v);
  const M = { x: SKY_MOON.x, y: SKY_MOON.y };
  const S = sandTarget(v);
  // the beams start at the Moon's limb, not its centre
  const ux = S.x - M.x, uy = S.y - M.y, ul = Math.hypot(ux, uy);
  const Mo = { x: M.x + (ux / ul) * SKY_MOON.r * 0.9, y: M.y + (uy / ul) * SKY_MOON.r * 0.9 };
  const vx = SUN0.x - M.x, vy = SUN0.y - M.y, vl = Math.hypot(vx, vy);
  const Mi = { x: M.x + (vx / vl) * SKY_MOON.r * 0.9, y: M.y + (vy / vl) * SKY_MOON.r * 0.9 };
  const pb = L.ease.inOutCubic(L.prog(t, T.b0, T.b1 - T.b0));
  const ps = L.ease.inOutCubic(L.prog(t, T.s0, T.s1 - T.s0));
  c.save();
  c.globalAlpha *= f * skyK(v);
  clipSky(c, v);
  // the cone of moonlight spreading onto the land (behind the beam)
  if (pb > 0) {
    const spread = 210;
    const e = L.ease.outCubic(L.prog(t, T.b0 + 0.2, 0.8));
    const gx0 = S.x - spread * e, gx1 = S.x + spread * 0.7 * e;
    const cg = c.createLinearGradient(M.x, M.y, S.x, S.y);
    cg.addColorStop(0, 'rgba(190,210,255,0.0)');
    cg.addColorStop(0.35, `rgba(190,210,255,${0.06 * e})`);
    cg.addColorStop(1, `rgba(190,210,255,${0.12 * e})`);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = cg;
    c.beginPath(); c.moveTo(Mo.x, Mo.y); c.lineTo(gx0, horizonY(v, gx0) + 2); c.lineTo(gx1, horizonY(v, gx1) + 2); c.closePath(); c.fill();
    c.restore();
    beam(c, Mo.x, Mo.y, S.x, S.y, pb, COOL, 0.9);
  }
  if (ps > 0) beam(c, SUN0.x, SUN0.y, Mi.x, Mi.y, ps, WARM, 0.95);
  // photons stream along the whole path once it is connected: warm until the bounce, silver after
  const st = L.ease.outCubic(L.prog(t, T.s1, 0.6));
  if (st > 0) {
    const l1 = Math.hypot(Mi.x - SUN0.x, Mi.y - SUN0.y), l2 = Math.hypot(S.x - Mo.x, S.y - Mo.y), lt = l1 + l2;
    const N = 9;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const u = (v.gt * 0.34 + i / N) % 1;
      const dd = u * lt;
      let x, y, dx, dy, col;
      if (dd < l1) {
        const q = dd / l1; x = L.lerp(SUN0.x, Mi.x, q); y = L.lerp(SUN0.y, Mi.y, q); dx = (Mi.x - SUN0.x) / l1; dy = (Mi.y - SUN0.y) / l1; col = WARM;
      } else {
        const q = (dd - l1) / l2; x = L.lerp(Mo.x, S.x, q); y = L.lerp(Mo.y, S.y, q); dx = (S.x - Mo.x) / l2; dy = (S.y - Mo.y) / l2; col = COOL;
      }
      const fade = Math.min(1, u * 12, (1 - u) * 10) * st;
      const len = 16;
      c.strokeStyle = L.rgba(col, 0.9 * fade);
      c.lineWidth = 2.2;
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - dx * len, y - dy * len); c.lineTo(x, y); c.stroke();
      L.lightBlob(c, x, y, 14, col, 0.45 * fade);
    }
    c.restore();
  }
  c.restore();
  // pool of moonlight on the sand (blooms as the beam lands, breathes after)
  const pool = L.ease.outCubic(L.prog(t, T.b1 - 0.1, 0.7));
  if (pool > 0) {
    const a = f * skyK(v) * pool * (0.85 + 0.15 * Math.sin(v.gt * 1.3));
    const flash = 1 + 0.8 * Math.max(0, 1 - L.prog(t, T.b1 - 0.1, 0.6) * 1.6);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.translate(S.x, S.y);
    c.scale(1, 0.14);
    const pg = c.createRadialGradient(0, 0, 0, 0, 0, 200);
    pg.addColorStop(0, `rgba(200,215,255,${0.38 * a * flash})`);
    pg.addColorStop(0.5, `rgba(200,215,255,${0.12 * a})`);
    pg.addColorStop(1, 'rgba(200,215,255,0)');
    c.fillStyle = pg;
    c.fillRect(-200, -200, 400, 400);
    c.restore();
  }
  // the Moon flares as the sunlight arrives
  const fl = L.prog(t, T.s1 - 0.05, 0.8);
  if (fl > 0 && fl < 1) L.lightBlob(c, M.x, M.y, SKY_MOON.r * 3.2, [255, 238, 210], 0.45 * f * skyK(v) * Math.sin(Math.PI * Math.pow(fl, 0.4)));
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Moonlight', sub: 'sunlight, bounced off the Moon' },
  captions: true,
  layer: 2,
  cues(d) {
    // beat-relative times at the current timeline (lights ≈ 1.22, land ≈ 1.79, reflected ≈ 2.32)
    return [
      { t: 0.22, name: 'swell', gain: 0.26, pitch: 1.0 },
      { t: 0.45, name: 'bloom', gain: 0.26, pitch: 1.1 },
      { t: 1.18, name: 'shimmer', gain: 0.18, pitch: 1.1 },
      { t: 1.86, name: 'bloom', gain: 0.22, pitch: 0.8 },
      { t: 2.0, name: 'tick', gain: 0.24, pitch: 1.2 },
      { t: 2.2, name: 'riser', gain: 0.14, pitch: 1.3 },
      { t: 2.8, name: 'ping', gain: 0.3, pitch: 1.1 },
      { t: 3.0, name: 'shimmer', gain: 0.14, pitch: 1.4 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.active) {
      const m = moonlight(v);
      const e = L.ease.outBack(L.prog(v.t, 0.25, 1.1), 1.4);
      drawSkyMoon(ctx, v, { k: m, s: L.lerp(0.82, 1, e) });
    }
    drawBeams(ctx, v);
  },
  drawOverlay(ctx, v) {
    if (v.t >= v.d) return;   // s03 takes over the readout at exactly the same spot
    const T = times(v);
    const kin = L.enter(v.t, T.b1 + 0.05, 0.55, L.ease.outCubic);
    const ksub = L.enter(v.t, T.s1 - 0.1, 0.5);
    const y = luxY(0.2);
    // the meter's first mark: a dot on the (not yet drawn) lux track
    const dk = L.enter(v.t, T.b1 - 0.05, 0.4, L.ease.outBack);
    if (dk > 0) {
      ctx.save();
      ctx.fillStyle = L.rgba(v.accent, 0.95);
      ctx.beginPath(); ctx.arc(LUX.gx, y, Math.max(0, 6 * dk), 0, TAU); ctx.fill();
      ctx.fillRect(LUX.gx + 12, y - 1.5, 22 * dk, 3);
      ctx.restore();
      L.lightBlob(ctx, LUX.gx, y, 30, v.accent, 0.35 * dk);
    }
    drawLux(ctx, { x: LUX.lx, yMark: y + (1 - kin) * 26, size: 110, value: '0.2', k: kin, accent: v.accent });
    if (ksub > 0) {
      ctx.save();
      ctx.globalAlpha *= ksub;
      subLines(ctx, y, (1 - ksub) * 14);
      ctx.restore();
    }
  },
};
