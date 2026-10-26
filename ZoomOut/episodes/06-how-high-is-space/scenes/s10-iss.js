// Beat 10 — the International Space Station at ~400 km.
// World: the orbit (a circle at R + 400 km) draws across as the camera climbs; the ISS is a bright point
// moving along it at its TRUE speed (7.66 km/s, ~18 px/s here) with a fading orbital streak. A plumb
// line drops from the station to the ground ("straight up").
// Overlay: a magnifier lens (×~1,000) shows the station's real silhouette — truss, eight solar wings,
// radiators, the pressurised modules — lit by the Earth glow below. Label "≈ 400 km" / "250 mi · Space Station".
// Exports: drawOrbit / issPos / drawISS so s11 can reuse them in the globe view and its magnifier.
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, ALT } from '../camera.js';

const { W, H } = L;
const ACC = [150, 170, 255];
const ORBIT_R = R_EARTH + ALT.iss;
const V_ISS = 7660;                  // m/s
const DRAW = [0.3, 1.3];             // orbit draws across (beat time): starts during the travel so the line is there as it enters the frame
const LENS = 1.2;                    // lens opens
const LABEL = 1.85;
const T0_FALLBACK = 44.529;          // beat-10 start (gt) if the timeline is unavailable
/** Beat-10 start (gt) from the timeline: phases the station so it is above the beacon whatever the VO timing. */
export const t10Of = (v) => v?.tl?.scenes?.[10]?.start ?? T0_FALLBACK;
const HIDE_AT = 0.25;                // s12 beacon time: the world station dot fades out so the beacon is the only point up there

/** Station angle on its orbit (radians from straight up, + = to the right) at global time gt (t0 = beat-10 start). */
export const issAngle = (gt, t0 = T0_FALLBACK) => (-26000 + V_ISS * (gt - t0)) / ORBIT_R;
export const issPos = (gt, t0 = T0_FALLBACK) => { const a = issAngle(gt, t0); return [Math.sin(a) * ORBIT_R, R_EARTH - Math.cos(a) * ORBIT_R]; };

/** The orbit ring/line in world space. k = draw progress (0..1, left to right in side view). */
export function drawOrbit(c, v, k = 1, a = 1, opts = {}) {
  if (k <= 0 || a <= 0) return;
  const rr = v.ws(ORBIT_R);
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  c.save();
  c.globalAlpha *= a;
  const topY = cy - rr;
  if (rr > 2e5 || topY > H + 200 || (topY < -200 && rr > 3000)) {
    if (rr > 2e5) {
      const y0 = v.wy(-ALT.iss);
      if (y0 > -50 && y0 < H + 50) {
        c.strokeStyle = L.rgba(ACC, 0.6);
        c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(-10, y0); c.lineTo(L.lerp(-10, W + 10, k), y0); c.stroke();
      }
    }
    c.restore();
    return;
  }
  // angular span visible: in side view, wipe from the left edge to the right edge
  const half = rr < 1500 ? Math.PI : Math.asin(Math.min(1, (W * 0.6) / rr)) + 0.02;
  const a0 = -Math.PI / 2 - half, a1 = L.lerp(a0, -Math.PI / 2 + half, k);
  // soft glow + dashed core
  L.glow(c, ACC, 10, () => {
    c.strokeStyle = L.rgba(ACC, 0.35);
    c.lineWidth = opts.width ? opts.width * 2 : 3;
    c.beginPath(); c.arc(cx, cy, Math.max(0, rr), a0, a1); c.stroke();
  }, 0.6);
  c.strokeStyle = L.rgba([205, 215, 255], 0.8);
  c.lineWidth = opts.width ?? 1.6;
  c.setLineDash(opts.dash ?? [10, 7]);
  c.lineDashOffset = -v.gt * 6;
  c.beginPath(); c.arc(cx, cy, Math.max(0, rr), a0, a1); c.stroke();
  c.setLineDash([]);
  // the drawing head: a bright spark while the wipe travels
  if (k < 1 && !opts.noHead) {
    const hx = cx + Math.cos(a1) * rr, hy = cy + Math.sin(a1) * rr;
    L.lightBlob(c, hx, hy, 80, [170, 190, 255], 0.5);
    L.lightBlob(c, hx, hy, 16, [255, 255, 255], 0.95);
  }
  c.restore();
}

/** The bright moving point + its orbital streak (any view). */
export function drawStation(c, v, a = 1, scale = 1) {
  if (a <= 0) return;
  const rr = v.ws(ORBIT_R);
  const cx = v.wx(0), cy = v.wy(R_EARTH);
  const ang = issAngle(v.gt, t10Of(v));
  const pos = (an) => [cx + Math.sin(an) * rr, cy - Math.cos(an) * rr];
  const [x, y] = pos(ang);
  if (x < -100 || x > W + 100 || y < -100 || y > H + 100) return;
  c.save();
  c.globalAlpha *= a;
  // streak: ~140 px (or 0.5 rad in globe view) of fading trail behind it along the orbit
  const span = Math.min(0.5, 140 / Math.max(1, rr));
  const N = 24;
  c.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const [x0, y0] = pos(ang - span * (i / N)), [x1, y1] = pos(ang - span * ((i + 1) / N));
    c.strokeStyle = `rgba(215,225,255,${0.7 * Math.pow(1 - i / N, 1.6)})`;
    c.lineWidth = 3.2 * scale * (1 - i / N) + 0.5;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  }
  const tw = 0.85 + 0.15 * Math.sin(v.gt * 7);
  L.lightBlob(c, x, y, 40 * scale, [190, 205, 255], 0.55 * tw);
  L.lightBlob(c, x, y, 10 * scale, [255, 255, 255], 0.95);
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(x, y, Math.max(0, 2.6 * scale), 0, Math.PI * 2); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ the station silhouette (local metres, x along truss)
const GOLD = [150, 112, 64], GOLD_D = [52, 38, 30];   // dark bronze-gold arrays (as photographed)
function wing(c, x, y, len, w, dir, shade) {
  // a solar array wing: two blankets with a mast between them, extending up (dir -1) or down (dir +1)
  const y0 = y + dir * 4, y1 = y + dir * (4 + len);
  const top = Math.min(y0, y1), h = Math.abs(y1 - y0);
  for (const s of [-1, 1]) {
    const bx = x + s * 0.9 + (s < 0 ? -w : 0);
    const g = c.createLinearGradient(bx, top, bx + w, top + h);
    g.addColorStop(0, L.rgba(L.mix(GOLD, [255, 220, 160], 0.25 * shade)));
    g.addColorStop(1, L.rgba(L.mix(GOLD_D, GOLD, 0.35 * shade)));
    c.fillStyle = g;
    c.fillRect(bx, top, w, h);
    // cell grid
    c.strokeStyle = 'rgba(40,24,8,0.55)';
    c.lineWidth = 0.18;
    c.beginPath();
    for (let yy = top + 1.6; yy < top + h; yy += 1.6) { c.moveTo(bx, yy); c.lineTo(bx + w, yy); }
    c.moveTo(bx + w / 2, top); c.lineTo(bx + w / 2, top + h);
    c.stroke();
  }
  c.strokeStyle = 'rgba(230,230,235,0.9)';
  c.lineWidth = 0.35;
  c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke();
}
function module(c, x, y, len, r, vertical = true) {
  const g = vertical ? c.createLinearGradient(x - r, 0, x + r, 0) : c.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#f2f4f8'); g.addColorStop(0.45, '#c9cfdb'); g.addColorStop(1, '#5d6474');
  c.fillStyle = g;
  if (vertical) L.roundRect(c, x - r, y, r * 2, len, r * 0.5); else L.roundRect(c, x, y - r, len, r * 2, r * 0.5);
  c.fill();
  c.strokeStyle = 'rgba(40,46,60,0.5)';
  c.lineWidth = 0.15;
  c.beginPath();
  if (vertical) for (let yy = y + 2; yy < y + len - 1; yy += 2.2) { c.moveTo(x - r, yy); c.lineTo(x + r, yy); }
  else for (let xx = x + 2; xx < x + len - 1; xx += 2.2) { c.moveTo(xx, y - r); c.lineTo(xx, y + r); }
  c.stroke();
}
/** Draw the ISS centred at (x, y) screen px, `s` px per metre, rotation `rot`. */
export function drawISS(c, x, y, s, rot = 0, shade = 1) {
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(s, s);
  // radiators: pale panels hanging off the truss near the centre (thermal control)
  for (const sx of [-24, -19, 19, 24]) {
    const g = c.createLinearGradient(sx - 2, 0, sx + 2, 0);
    g.addColorStop(0, '#f4f6fa'); g.addColorStop(1, '#a7aebd');
    c.fillStyle = g;
    c.fillRect(sx - 1.9, 1.3, 3.8, 15);
    c.strokeStyle = 'rgba(60,66,80,0.5)';
    c.lineWidth = 0.15;
    c.beginPath();
    for (let yy = 3.5; yy < 16; yy += 2.5) { c.moveTo(sx - 1.9, yy); c.lineTo(sx + 1.9, yy); }
    c.stroke();
  }
  // pressurised modules: a stack crossing the truss (Destiny/Unity/Zvezda line) + side labs
  module(c, 0, -26, 58, 2.1, true);
  module(c, -2.1, -8, 16, 1.9, false);
  module(c, -18.1, -8, 16, 1.9, false);
  module(c, 0, 18, 12, 1.5, true);
  // small Russian arrays near the bottom of the stack
  c.fillStyle = L.rgba([70, 90, 150]);
  c.fillRect(-14, 25.5, 11, 3); c.fillRect(3, 25.5, 11, 3);
  // integrated truss: long lattice beam
  c.fillStyle = '#a9afbd';
  c.fillRect(-54.5, -1.3, 109, 2.6);
  c.strokeStyle = 'rgba(40,46,60,0.7)';
  c.lineWidth = 0.22;
  c.beginPath();
  for (let xx = -54; xx < 54; xx += 2.6) { c.moveTo(xx, -1.3); c.lineTo(xx + 1.3, 1.3); c.lineTo(xx + 2.6, -1.3); }
  c.stroke();
  // eight solar wings: two at each end, up and down
  for (const sx of [-48, -37, 37, 48]) {
    wing(c, sx, -1.3, 33, 4.6, -1, shade);
    wing(c, sx, 1.3, 33, 4.6, 1, shade * 0.7);
  }
  // rim light along the top edge of everything (sun from above-left)
  c.restore();
}

export default {
  beat: 10,
  chapter: { num: '10', title: 'Space Station', sub: 'Orbiting at 28,000 km/h' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: DRAW[0], name: 'swish', gain: 0.28, pitch: 0.9 },
      { t: DRAW[0] + DRAW[1] - 0.1, name: 'shimmer', gain: 0.3, pitch: 1.2 },
      { t: LENS, name: 'blip', gain: 0.25, pitch: 1.0 },
      { t: LENS + 0.1, name: 'bloom', gain: 0.3, pitch: 1.1 },
      { t: LABEL + 0.05, name: 'ping', gain: 0.25, pitch: 1.25 },
    ];
  },

  drawWorld(ctx, v) {
    if (v.t < 0) return;
    const k = L.ease.inOutCubic(L.prog(v.t, DRAW[0], DRAW[1]));
    drawOrbit(ctx, v, k);
    // plumb line from the station straight down to the ground (side view only)
    const sv = L.clamp(L.prog(v.t, DRAW[0] + 0.8, 0.8)) * (1 - L.clamp(L.invLerp(900, 2000, v.cam.mpp))) * (1 - L.ease.inOutCubic(L.prog(v.t, LABEL - 0.2, 0.5)));
    const [ix, iy] = issPos(v.gt, t10Of(v));
    if (sv > 0) {
      const x = v.wx(ix), y0 = v.wy(iy), y1 = v.wy(0);
      ctx.save();
      ctx.globalAlpha *= sv * 0.7;
      ctx.strokeStyle = L.rgba(ACC, 0.7);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(x, y0 + 12); ctx.lineTo(x, L.lerp(y0 + 12, y1, L.ease.outCubic(L.prog(v.t, DRAW[0] + 0.8, 1.0)))); ctx.stroke();
      ctx.restore();
    }
    const ak = L.ease.outCubic(L.prog(v.t, 0.5, 0.6));
    const t12 = v.tl?.scenes?.[12]?.start;
    const hide = t12 == null ? 0 : L.ease.inOutCubic(L.prog(v.gt, t12 + HIDE_AT, 0.5));
    drawStation(ctx, v, ak * (1 - hide));
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    // magnifier lens tied to the station
    const lk = L.ease.outBack(L.prog(t, LENS, 0.7), 1.1) * v.k;
    const [ix, iy] = issPos(v.gt, t10Of(v));
    const sx = v.wx(ix), sy = v.wy(iy);
    if (lk > 0) {
      const R = 165 * lk, lx = 770, ly = 790;
      // connector lines from the station to the lens (tangents of a small source ring)
      const r0 = 16;
      const dx = lx - sx, dy = ly - sy, dist = Math.hypot(dx, dy);
      const base = Math.atan2(dy, dx), off = Math.asin(L.clamp((R - r0) / dist, -1, 1));
      ctx.save();
      ctx.globalAlpha = L.clamp(lk);
      ctx.strokeStyle = 'rgba(215,225,255,0.35)';
      ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        const a = base + s * (Math.PI / 2 + off);
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0);
        ctx.lineTo(lx + Math.cos(a) * R, ly + Math.sin(a) * R);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(215,225,255,0.7)';
      ctx.beginPath(); ctx.arc(sx, sy, r0, 0, Math.PI * 2); ctx.stroke();
      // lens body
      ctx.save();
      ctx.beginPath(); ctx.arc(lx, ly, Math.max(0, R), 0, Math.PI * 2); ctx.clip();
      const bg = ctx.createLinearGradient(0, ly - R, 0, ly + R);
      bg.addColorStop(0, '#03050d'); bg.addColorStop(0.7, '#060b1c'); bg.addColorStop(1, '#1b3566');
      ctx.fillStyle = bg;
      ctx.fillRect(lx - R, ly - R, R * 2, R * 2);
      // earth glow from below (the planet 400 km down)
      L.lightBlob(ctx, lx, ly + R * 1.25, R * 1.3, [70, 130, 230], 0.6);
      // station, slowly turning, with a sun glint sweeping across
      const drift = Math.sin(v.gt * 0.25) * 0.05;
      drawISS(ctx, lx, ly + 4, (R * 1.62) / 109, -0.08 + drift, 1);
      const gl = L.prog(t, LENS + 0.35, 1.3);
      if (gl > 0 && gl < 1) {
        const gx = L.lerp(lx - R * 1.3, lx + R * 1.3, L.ease.inOutCubic(gl));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const sg = ctx.createLinearGradient(gx - 60, 0, gx + 60, 0);
        sg.addColorStop(0, 'rgba(255,240,210,0)'); sg.addColorStop(0.5, 'rgba(255,240,210,0.28)'); sg.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(lx - R, ly - R, R * 2, R * 2);
        ctx.restore();
      }
      ctx.restore();
      // bezel
      ctx.strokeStyle = 'rgba(225,232,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(lx, ly, Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = L.rgba(ACC, 0.35);
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(lx, ly, Math.max(0, R + 6), 0, Math.PI * 2); ctx.stroke();
      // tiny scale tag under the lens: 109 m truss
      ctx.globalAlpha = L.clamp(lk) * L.clamp(L.prog(t, LENS + 0.5, 0.4));
      ctx.font = L.font(20, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(205,215,235,0.85)';
      L.trackedText(ctx, '109 M ACROSS', lx, ly + R + 40, 3, 'center');
      ctx.restore();
    }
    const k = L.enter(t, LABEL, 0.55) * v.k;
    L.bigLabel(ctx, { x: 120, y: 1095, big: '≈ 400 km', small: '250 mi · Space Station', k, accent: v.accent });
  },
};
