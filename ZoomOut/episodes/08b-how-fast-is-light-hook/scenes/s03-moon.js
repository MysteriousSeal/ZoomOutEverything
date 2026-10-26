// Beat 3 — the Moon in 1.28 s. A pulse leaves Earth's Moon-facing limb as the camera pulls back and
// crosses 384,400 km in true real time while the clock runs; it lands on the Moon exactly when the
// clock locks at 1.28 s. The Moon (true size and distance) and its orbit stay in the world.
import * as L from '../../../../engine/runtime/lib.js';
import { C, MOON, moveStart, R_EARTH } from '../camera.js';
import { drawClock, clockRun, drawTravel, PHOTON_GOLD } from './s01-one-second.js';

export const R_MOON = 1.7374e6;
const DIST = Math.hypot(MOON.x, MOON.y);
const U = { x: MOON.x / DIST, y: MOON.y / DIST };
const A = { x: U.x * R_EARTH, y: U.y * R_EARTH };
const B = { x: MOON.x - U.x * R_MOON, y: MOON.y - U.y * R_MOON };
const TRIP = (DIST - R_EARTH - R_MOON) / C;      // 1.255 s limb to limb (the clock shows centre to centre)
const DEP = 0.32, ARR = DEP + TRIP;               // beat-local: departs on "reaches", lands on "just over a second"
const SUNDIR = [Math.cos(-20 * Math.PI / 180), Math.sin(-20 * Math.PI / 180)];

/** The Moon: true-size grey disc lit from the Sun's side, with a soft glow so a few-pixel disc still reads. */
function drawMoon(ctx, v, flash) {
  const sx = v.wx(MOON.x), sy = v.wy(MOON.y);
  const rt = v.ws(R_MOON);
  // fades as it merges into Earth on the pull-out to the Sun
  const sep = v.ws(DIST);
  const vis = L.clamp((sep - 10) / 30);
  if (vis <= 0 || sx < -100 || sx > L.W + 100 || sy < -100 || sy > L.H + 100) return;
  const r = Math.max(4.2, rt);   // never a white point: a ≥ 4 px grey disc in a soft grey halo
  L.lightBlob(ctx, sx, sy, r * 9 + 22, [170, 175, 185], (0.14 + 0.5 * flash) * vis);
  L.lightBlob(ctx, sx, sy, r * 3 + 6, [200, 202, 208], 0.18 * vis);
  const g = ctx.createRadialGradient(sx + SUNDIR[0] * r * 0.45, sy + SUNDIR[1] * r * 0.45, 0, sx, sy, r);
  g.addColorStop(0, `rgba(214,212,206,${vis})`);
  g.addColorStop(0.6, `rgba(150,148,145,${vis})`);
  g.addColorStop(1, `rgba(78,78,82,${vis})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  if (flash > 0) L.lightBlob(ctx, sx, sy, 20 + r * 3, [255, 235, 190], 0.9 * flash * vis);
}

function drawOrbit(ctx, v, a) {
  const R = v.ws(DIST);
  if (a <= 0 || R < 30 || R > 30000) return;
  ctx.save();
  ctx.strokeStyle = `rgba(200,210,230,${0.16 * a * L.clamp((R - 30) / 60)})`;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 7]);
  ctx.beginPath(); ctx.arc(v.wx(0), v.wy(0), Math.max(0, R), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** A small centred name tag with a short leader under (dir 1) or above (dir -1) a speck at (sx, sy). */
function nameTag(ctx, sx, sy, text, k, gap, dir = 1) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.strokeStyle = 'rgba(220,228,240,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(sx, sy + dir * gap); ctx.lineTo(sx, sy + dir * (gap + 26 * L.ease.outCubic(k))); ctx.stroke();
  ctx.font = L.font(24, 600, L.FONT.body);
  ctx.fillStyle = 'rgba(225,232,242,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
  ctx.textBaseline = dir > 0 ? 'top' : 'alphabetic';
  // keep the text inside the frame (the Moon sits near the right edge)
  ctx.letterSpacing = '4px';
  const hw = ctx.measureText(text).width / 2;
  ctx.letterSpacing = '0px';
  const tx = Math.min(L.W - 60 - hw, Math.max(60 + hw, sx));
  L.trackedText(ctx, text, tx, sy + dir * (gap + 34 + (1 - k) * 10), 4, 'center');
  ctx.restore();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'The Moon', sub: '384,400 km away' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: DEP - 0.04, name: 'whoosh', gain: 0.36, pitch: 1.3 },
      { t: DEP + 0.05, name: 'count', gain: 0.18, pitch: 1.4 },
      { t: ARR, name: 'ping', gain: 0.42, pitch: 1.0 },
      { t: ARR + 0.02, name: 'tick', gain: 0.36, pitch: 1.15 },
      { t: ARR + 0.18, name: 'shimmer', gain: 0.18, pitch: 0.9 },
    ];
  },

  drawWorld(ctx, v) {
    const t = v.t;
    // the Moon is only near frame from this beat until the pull-out to the Sun
    if (v.cam.mpp > 3e8 || v.gt < v.tl.scenes[2].end - 0.2) return;
    drawOrbit(ctx, v, L.prog(t, 0.6, 0.9));
    const flash = t > ARR ? Math.exp(-(t - ARR) * 3) : 0;
    drawMoon(ctx, v, flash);
    // the journey: route line stays (fading) while the next beat pulls out
    const p = L.prog(t, DEP, TRIP);
    const routeFade = 1 - L.ease.inCubic(L.prog(t, v.d + 0.2, 0.8));
    const head = 1 - L.prog(t, ARR, 0.12);
    drawTravel(ctx, v, A, B, p, { trail: 0.3, route: 0.32 * routeFade, head, s: 0.9 });
    // departure flash at Earth's limb
    const df = L.prog(t, DEP - 0.05, 0.5);
    if (df > 0 && df < 1) L.lightBlob(ctx, v.wx(A.x), v.wy(A.y), 30 + 60 * df, PHOTON_GOLD, 0.7 * (1 - df));
    // arrival ring on the Moon
    const ar = L.prog(t, ARR, 0.8);
    if (ar > 0 && ar < 1) {
      ctx.save();
      ctx.strokeStyle = L.rgba(PHOTON_GOLD, 0.75 * (1 - ar));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(v.wx(MOON.x), v.wy(MOON.y), Math.max(0, 6 + 60 * L.ease.outCubic(ar)), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  },

  drawOverlay(ctx, v) {
    const t = v.t;
    drawClock(ctx, v, { sec: clockRun(t, DEP, ARR, 1.28), lockAt: ARR, lockLabel: 'EARTH TO MOON' });
    // name tags under Earth (from the departure) and the Moon (on arrival): at true scale both are specks
    // both tags are gone before the camera leaves for the Sun (beat 4 has a lead), so they never smear in the zoom
    const out = 1 - L.ease.inCubic(L.prog(v.gt, moveStart(v.tl, 4) - 0.25, 0.25));
    const rE = v.ws(R_EARTH);   // only once the globe has shrunk toward a speck (keeps the tag clear of the captions)
    nameTag(ctx, v.wx(0), v.wy(0), 'EARTH', out * v.k * L.enter(t, DEP + 0.05, 0.5) * L.clamp((110 - rE) / 40), Math.max(16, rE + 10));
    // the Moon is named as soon as the camera has it framed ('...the Moon' ≈ 0.8 s in); the tag sits ABOVE it,
    // outside the orbit, so the dashed orbit never runs through the letters
    nameTag(ctx, v.wx(MOON.x), v.wy(MOON.y), 'THE MOON', out * v.k * L.enter(t, 0.55, 0.5), 18, -1);
  },
};
