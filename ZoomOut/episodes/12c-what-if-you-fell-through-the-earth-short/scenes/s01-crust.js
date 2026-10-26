// Beat 1 — the crust. The person drops into the shaft and the camera falls with them, zooming out to 55 m/px: the
// lamps streak, the surface (with the lit mouth of the hole) recedes above, grey crust with mineral grain streams
// past. On "about thirty-five kilometers" a world-anchored bracket spans surface → Moho beside the tunnel and the label
// lands right of it (fixed on screen, a leader ties it to the bracket). At 9.95 s the faller crosses the Moho: a light
// wave runs out along the boundary from the crossing point.
// Exports the shared boundary/label helpers used by s02 (mantle) and s03 (outer core).
import * as L from '../../../../engine/runtime/lib.js';
import { R_EARTH, RADIUS, CENTRE, BS, PH, T_MOHO } from '../camera.js';
import { group, cardOut, qT } from './lib-core.js';

const { W, H } = L;
export { T_MOHO };                   // global s: faller crosses the Moho (camera.js FALL waypoint)
const P2 = PH(1, 1).start - BS[1];   // beat time: "about thirty-five kilometers of solid rock"
const LAND = P2 + 0.13;              // "thirty-five" → label lands
const BRACKET = P2 - 0.19;           // bracket draws in just before

// ------------------------------------------------------------------ boundary helpers (shared)
/** Screen y of the top half of a circle (radius r m around CENTRE) at screen x; null when outside. Stable for huge radii. */
export function boundaryY(v, r, sx) {
  const dx = (sx - v.wx(0)) * v.cam.mpp;
  if (Math.abs(dx) >= r) return null;
  const sag = (dx * dx) / (r + Math.sqrt(r * r - dx * dx));   // r - sqrt(r² - dx²), without cancellation
  return v.wy(CENTRE.y - r + sag);
}
/** Polyline along the top half of the boundary across the screen. Returns false if nothing is on screen. */
export function boundaryPath(c, v, r, step = 14) {
  let started = false, any = false;
  c.beginPath();
  for (let x = -30; x <= W + 30; x += step) {
    const y = boundaryY(v, r, x);
    if (y == null) { started = false; continue; }
    if (y > -60 && y < H + 60) any = true;
    started ? c.lineTo(x, y) : c.moveTo(x, y);
    started = true;
  }
  return any;
}

/**
 * Light flash where the faller crosses a layer boundary (radius r). dt = gt - crossing time.
 * Anticipation glow before, then a bright bloom + ring at the crossing and two light pulses that run out along the
 * boundary. col = light colour.
 */
export function boundaryFlash(c, v, r, dt, col = [255, 226, 196], strength = 1) {
  if (dt < -0.6 || dt > 1.9) return;
  const mpp = v.cam.mpp, rp = r / mpp;
  const cx = v.wx(0), cy = v.wy(CENTRE.y);
  const px = cx, py = boundaryY(v, r, cx);
  if (py == null || py < -300 || py > H + 300) return;
  const pre = L.smoothstep(L.prog(dt, -0.6, 0.6)) * (dt < 0 ? 1 : 0);
  const after = dt >= 0 ? 1 : 0;
  const decay = after * (1 - L.ease.inCubic(L.prog(dt, 0.15, 1.6)));
  const run = L.ease.outCubic(L.prog(dt, 0, 1.5)) * 1150;           // px each pulse has travelled along the boundary
  const halfW = 70 + 160 * L.prog(dt, 0, 1.5);                       // pulse width (px)
  c.save();
  c.globalCompositeOperation = 'lighter';
  // the boundary line, lit by a conic gradient centred on the planet: bumps at ±run around the crossing (top = 0.5)
  if (boundaryPath(c, v, r, 12)) {
    const g = c.createConicGradient(Math.PI / 2, cx, cy);
    const turn = (px_) => px_ / Math.max(1, rp) / (2 * Math.PI);
    const stops = [];
    const floor = 0.18 * decay;
    const add = (f, a) => { if (f > 0 && f < 1) stops.push([f, a]); };
    add(0.5 - turn(run + halfW * 2.5), floor);
    add(0.5 - turn(run + halfW), floor);
    add(0.5 - turn(run), floor + 0.9 * decay);
    add(0.5 - turn(Math.max(0, run - halfW)), floor + 0.2 * decay);
    add(0.5 - turn(Math.max(0, run * 0.5)), floor);
    add(0.5, floor + 0.65 * decay + 0.55 * pre);
    add(0.5 + turn(Math.max(0, run * 0.5)), floor);
    add(0.5 + turn(Math.max(0, run - halfW)), floor + 0.2 * decay);
    add(0.5 + turn(run), floor + 0.9 * decay);
    add(0.5 + turn(run + halfW), floor);
    add(0.5 + turn(run + halfW * 2.5), floor);
    stops.sort((a, b) => a[0] - b[0]);
    // dedupe equal offsets (run = 0)
    let last = -1;
    for (const [f, a] of stops) { const ff = Math.max(f, last + 1e-9); g.addColorStop(L.clamp(ff), L.rgba(col, L.clamp(a))); last = ff; }
    g.addColorStop(0, L.rgba(col, 0)); g.addColorStop(1, L.rgba(col, 0));
    c.strokeStyle = g;
    c.globalAlpha = 0.55 * strength;
    c.lineWidth = 16;
    c.stroke();
    c.globalAlpha = 1 * strength;
    c.lineWidth = 3;
    c.stroke();
  }
  // bloom at the crossing point and a flattened ring that spreads along the boundary
  const bloom = Math.max(pre * 0.35, decay * (dt < 0.25 ? L.lerp(1.4, 1, dt / 0.25) : 1));
  if (bloom > 0) {
    L.lightBlob(c, px, py, 210, col, 0.5 * bloom * strength);
    L.lightBlob(c, px, py, 46, [255, 255, 255], 0.75 * bloom * strength);
  }
  const rk = L.prog(dt, 0, 0.8);
  if (rk > 0 && rk < 1) {
    const e = L.ease.outCubic(rk);
    c.strokeStyle = L.rgba(col, 0.6 * Math.pow(1 - rk, 2) * strength);
    c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(px, py, Math.max(0, 20 + 340 * e), Math.max(0, 6 + 70 * e), 0, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ label helpers (shared)
/**
 * A world-anchored thickness bracket between two boundaries (radii rTop > rBot) at `dx` px right of the tunnel, plus a
 * fixed big label on screen tied to it by a short leader. k = visibility (0..1), kb = bracket draw-in (0..1).
 * plate: 0..1 strength of a dark backing plate (needed over the bright core).
 */
export function depthLabel(c, v, { rTop, rBot, dx = 62, x, y = 800, big, small, k, kb = k, plate = 0, size = 96, accent = v.accent }) {
  if (k <= 0 && kb <= 0) return;
  const bx = v.wx(0) + dx;
  let y0 = boundaryY(v, rTop, bx), y1 = boundaryY(v, rBot, bx);
  if (y0 == null) y0 = -2000;
  if (y1 == null) y1 = v.wy(CENTRE.y);
  const lx = x ?? bx + 44;
  const CLIP0 = 330, CLIP1 = 1250;
  // 12b f12a: the whole label (bracket, leader, plate, text) fades as one image and is gone before the beat ends
  group(c, cardOut(v, 0.45, 0.3), (c) => {
  // bracket: draws from the middle outwards inside the clean band of the frame. An end inside the band gets a crisp
  // cap tick; an end beyond the band (e.g. the surface, up under the HUD) gets a small arrowhead: "continues"
  if (kb > 0) {
    const e = L.ease.outCubic(L.clamp(kb));
    const mid = L.clamp(y, y0, y1);
    const a = Math.max(L.lerp(mid, y0, e), CLIP0), b = Math.min(L.lerp(mid, y1, e), CLIP1);
    c.save();
    c.globalAlpha = Math.min(1, kb * 1.5);
    c.strokeStyle = 'rgba(255,240,226,0.85)';
    c.fillStyle = 'rgba(255,240,226,0.85)';
    c.lineWidth = 2;
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6;
    c.beginPath(); c.moveTo(bx, a); c.lineTo(bx, b); c.stroke();
    if (e > 0.98) {
      const end = (yy, clipped, dir) => {
        if (clipped) {   // arrowhead pointing out of the band
          c.beginPath(); c.moveTo(bx, yy + dir * 2); c.lineTo(bx - 8, yy - dir * 12); c.lineTo(bx + 8, yy - dir * 12); c.closePath(); c.fill();
        } else {
          c.beginPath(); c.moveTo(bx - 10, yy); c.lineTo(bx + 10, yy); c.stroke();
        }
      };
      end(a, y0 < CLIP0, -1);
      end(b, y1 > CLIP1, 1);
    }
    c.restore();
  }
  if (k > 0) {
    const e = L.ease.outCubic(L.clamp(k));
    // dark plate behind the text
    c.font = L.font(size, 800, L.FONT.display);
    c.letterSpacing = '-1px';
    const wBig = c.measureText(big).width;
    c.font = L.font(30, 600, L.FONT.body);
    c.letterSpacing = '3px';
    const wSmall = small ? c.measureText(small.toUpperCase()).width : 0;
    c.letterSpacing = '0px';
    const wMax = Math.max(wBig, wSmall);
    if (plate > 0) {
      // 12b f12a: opaque from its first frame (only its width eases out); it used to sit at 28% over the boundary line
      c.save();
      c.fillStyle = `rgba(14,8,6,${0.82 * plate})`;
      c.shadowColor = 'rgba(10,4,2,0.6)'; c.shadowBlur = 30;
      L.roundRect(c, lx - 30, y - size * 0.92 - 52, (wMax + 60) * L.lerp(0.9, 1, e), size + 132, 18);
      c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = 'rgba(255,214,180,0.13)';
      c.lineWidth = 1;
      L.roundRect(c, lx - 29.5, y - size * 0.92 - 51.5, (wMax + 60) * L.lerp(0.9, 1, e) - 1, size + 131, 18);
      c.stroke();
      c.restore();
    }
    // leader from the label to the bracket (at the label's cap height, clamped to the bracket)
    const ly = y - size * 0.36;
    const ty = L.clamp(ly, Math.max(y0, CLIP0) + 4, Math.min(y1, CLIP1) - 4);
    const lk = L.prog(k, 0.15, 0.6);
    if (lk > 0 && kb > 0.9) {
      c.save();
      c.strokeStyle = 'rgba(255,240,226,0.75)';
      c.lineWidth = 1.5;
      const x2 = L.lerp(bx, lx - 12, L.ease.outCubic(lk));
      c.beginPath(); c.moveTo(bx, ty); c.lineTo(x2, L.lerp(ty, ly, L.ease.outCubic(lk))); c.stroke();
      c.fillStyle = L.rgba(accent);
      c.beginPath(); c.arc(bx, ty, 4, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    L.bigLabel(c, { x: lx, y, big, small, k, accent, size });
  }
  });
}

// ------------------------------------------------------------------ crust detail
/** Mineral grain in the crust: world-anchored specks on two cross-fading octaves (bounded by the screen). */
function drawGrain(c, v) {
  const mpp = v.cam.mpp;
  const zk = L.clamp(L.invLerp(0.015, 0.04, mpp)) * (1 - L.clamp(L.invLerp(250, 600, mpp)));
  if (zk <= 0) return;
  const yS = v.wy(0), yM = v.wy(RADIUS.surface - RADIUS.moho);
  if (yM < -20 || yS > H + 20) return;
  const lv = Math.log2(mpp * 46), l0 = Math.floor(lv), frac = lv - l0;
  c.save();
  for (const [lev, wgt] of [[l0, 1 - frac], [l0 + 1, frac]]) {
    if (wgt < 0.03) continue;
    const s = Math.pow(2, lev);
    const x0 = v.cam.x - (W / 2) * mpp, x1 = v.cam.x + (W / 2) * mpp;
    const ya = Math.max(0, v.cam.y - H * v.cam.anchor * mpp), yb = Math.min(R_EARTH - RADIUS.moho, v.cam.y + H * (1 - v.cam.anchor) * mpp);
    if (yb <= ya) continue;
    const i0 = Math.floor(x0 / s), i1 = Math.ceil(x1 / s), j0 = Math.floor(ya / s), j1 = Math.ceil(yb / s);
    if ((i1 - i0) * (j1 - j0) > 3000) continue;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const h = Math.sin(i * 91.7 + j * 47.3 + lev * 13.1) * 43758.5453, f = h - Math.floor(h);
        const h2 = Math.sin(i * 17.9 + j * 133.7 + lev * 7.7) * 24634.6345, f2 = h2 - Math.floor(h2);
        const sx = v.wx((i + f) * s), sy = v.wy((j + f2) * s);
        if (Math.abs(sx - v.wx(0)) < 6) continue;      // keep the shaft clean
        const sz = 1 + 1.8 * f2;
        const light = f > 0.55;
        c.fillStyle = light ? `rgba(236,224,206,${0.32 * wgt * zk})` : `rgba(10,8,8,${0.38 * wgt * zk})`;
        c.fillRect(sx - sz / 2, sy - sz / 2, sz, sz * (1 + 0.6 * f));
      }
    }
  }
  c.restore();
}

/** The mouth of the hole on the surface once we're zoomed out: a small warm light where the shaft begins. */
function drawMouth(c, v) {
  const mpp = v.cam.mpp;
  const k = L.clamp(L.invLerp(0.25, 1.2, mpp)) * (1 - L.clamp(L.invLerp(400, 1500, mpp)));
  if (k <= 0) return;
  const x = v.wx(0), y = v.wy(0);
  if (y < -100 || y > H + 100) return;
  L.lightBlob(c, x, y, 60, [255, 170, 100], 0.45 * k);
  L.lightBlob(c, x, y, 14, [255, 236, 210], 0.9 * k);
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'The crust', sub: 'Solid rock under your feet' },
  captions: true,
  layer: 1,
  cues(d) {
    return [
      { t: 0.06, name: 'dive', gain: 0.4, pitch: 0.9 },
      { t: 0.32, name: 'whoosh', gain: 0.3, pitch: 1.3 },
      { t: 0.75, name: 'whoosh', gain: 0.32, pitch: 0.7 },
      { t: 1.25, name: 'deep', gain: 0.24, pitch: 0.8 },
      { t: BRACKET, name: 'swish', gain: 0.2, pitch: 1.2 },
      { t: LAND, name: 'tick', gain: 0.3, pitch: 1.1 },
      { t: LAND + 0.08, name: 'blip', gain: 0.18, pitch: 0.9 },
      { t: T_MOHO - BS[1] - 0.45, name: 'riser', gain: 0.2, pitch: 1.1 },
    ];
  },

  drawWorld(ctx, v) {
    drawGrain(ctx, v);
    drawMouth(ctx, v);
    boundaryFlash(ctx, v, RADIUS.moho, v.gt - T_MOHO, [255, 228, 200], 0.9);
  },

  drawOverlay(ctx, v) {
    const k = L.enter(qT(v), LAND, 0.55);   // output-frame time: the plate is fully on from its first frame
    const kb = L.enter(v.t, BRACKET, 0.6, L.ease.inOutCubic);
    depthLabel(ctx, v, {
      rTop: R_EARTH, rBot: RADIUS.moho, k, kb,
      big: '≈ 35 km', small: '22 mi · continental crust', plate: 1,
    });
  },
};
