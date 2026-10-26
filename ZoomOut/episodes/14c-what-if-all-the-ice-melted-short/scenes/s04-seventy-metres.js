// 14c beat 2 (rise; 14b beat 4) — "If all the ice on land melted, | the oceans would rise about seventy meters."
// Phrase 1: the globe turns away from the pole toward the Americas while env melts the ice caps (iceK): the white
// fades and the ice surface sinks to the real bedrock, so Antarctica breaks into an archipelago and Greenland's
// centre sags; a short mint meltwater sheen runs along Antarctica's shore. A pulsing NEW YORK pin marks the target.
// Phrase 2: the camera dives onto New York (it stays locked on it as the globe rolls it up to the limb); the "+70 m" measurement layer (tide gauge, dashed target
// line, label) lands as the water starts to climb. That layer lives in s05 (riseOverlay) so it carries through
// the cut into beat 5 without a blink.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, BEAT, PLACES, elevation, iceK, viewOf, worldOf, R_EARTH, shotStart } from '../env.js';
import { drawPin } from './s08-shanghai-coastlines.js';
import { riseOverlay } from './s05-liberty.js';

const { W, H } = L;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ Antarctica's coast, found once from the real data
// For each longitude, walk south from 55°S to the first land/ice cell: that is the coast (ice shelves included).
const COAST = [];
for (let lon = -180; lon < 180; lon += 3) {
  let found = null;
  for (let lat = -58; lat > -86; lat -= 0.25) {
    if (elevation(lat, lon) > 0) { found = lat; break; }
  }
  if (found != null) COAST.push([found, lon]);
}
// the coast, smoothed (moving average) so the glow traced along it is a clean curve
const SMOOTH = COAST.map((_, i) => {
  let sum = 0;
  for (let k = -2; k <= 2; k++) sum += COAST[(i + k + COAST.length) % COAST.length][0];
  return [sum / 5, COAST[i][1]];
});
/** Screen position of lat/lon under view vw (no per-call view evaluation). */
function proj(v, vw, lat, lon) {
  const p = worldOf(vw, lat, lon);
  return [v.wx(p.x), v.wy(p.y), p.z];
}

function drawMelt(ctx, v) {
  const gt = v.gt, b4 = v.tl.scenes[BEAT.rise].start;
  const melt = 1 - L.clamp(iceK(v));                       // 0 → 1 as the caps fade
  const env = L.ease.outCubic(L.prog(gt, b4 + 0.05, 0.5)) * (1 - L.ease.inCubic(L.prog(gt, b4 + 1.9, 0.5)));
  if (env <= 0.001) return;
  const rpx = v.ws(R_EARTH);
  if (rpx < 200) return;
  const vw = viewOf(v);
  const sc = rpx / 700;                                     // stroke scale with the globe size
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // ---- a short meltwater sheen hugging the shore while the ice goes (peaks mid-melt, gone once it has melted)
  const glow = env * Math.sin(Math.PI * L.clamp(melt)) * 0.9;
  if (glow > 0.01) {
    ctx.beginPath();
    let open = false;
    for (const [lat, lon] of SMOOTH) {
      const [x, y, z] = proj(v, vw, lat + 1.0, lon);
      if (z < 0.02) { open = false; continue; }
      if (open) ctx.lineTo(x, y); else { ctx.moveTo(x, y); open = true; }
    }
    if (open && SMOOTH.length) { const [x, y, z] = proj(v, vw, SMOOTH[0][0] + 1.0, SMOOTH[0][1]); if (z >= 0.02) ctx.lineTo(x, y); }
    for (const [w, a] of [[30, 0.05], [14, 0.08], [5, 0.1]]) {
      ctx.lineWidth = w * sc;
      ctx.strokeStyle = L.rgba(ACCENT, a * glow);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** "NEW YORK": a pulsing pin + label on the globe once it has turned, held into the first half of the dive. */
function drawNewYork(ctx, v) {
  const gt = v.gt, b4 = v.tl.scenes[BEAT.rise].start, dive = shotStart('dive', v.tl);
  const kin = L.ease.outCubic(L.prog(gt, b4 + 1.25, 0.5));
  const kout = 1 - L.smoothstep(L.clamp(L.invLerp(Math.log(400), Math.log(90), Math.log(v.cam.mpp))));   // held until the side view takes over
  const k = Math.min(v.k, kin) * (gt < dive ? 1 : kout);
  if (k <= 0.001) return;
  const vw = viewOf(v), P = PLACES.liberty;
  const p = worldOf(vw, P.lat, P.lon);
  const zk = L.clamp((p.z + 0.03) * 12);              // New York ends ON the limb (z → 0): keep it
  if (zk <= 0) return;
  const x = v.wx(p.x), y = v.wy(p.y);
  const pulse = ((gt - (b4 + 1.4)) / 0.9) % 1;
  drawPin(ctx, x, y, k * zk, gt > b4 + 1.4 ? pulse : -1);
  // label to the right of the pin, on a soft dark backing
  ctx.save();
  ctx.globalAlpha *= L.clamp(k * 1.3) * zk;
  const e = L.ease.outCubic(L.clamp(k));
  ctx.font = L.font(30, 700, L.FONT.body);
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,6,14,0.85)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(240,248,250,0.98)';
  L.trackedText(ctx, 'NEW YORK', x + 26 + (1 - e) * 12, y, 3, 'left');
  ctx.restore();
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'All the ice melts', sub: 'every glacier and ice sheet on land' },
  captions: true,
  layer: 1,
  cues(d) {
    void d;
    return [
      { t: 0.25, name: 'shimmer', gain: 0.26, pitch: 1.2 },     // the ice starts to glitter
      { t: 0.6, name: 'bubbles', gain: 0.2, pitch: 1.1 },       // meltwater runs off the coast
      { t: 1.3, name: 'shimmer', gain: 0.16, pitch: 1.45 },
  // 14c: phrase-2 cues moved with the shorter phrase gap (phrase 2 starts 2.34 s into the beat; 14b 2.64)
      { t: 3.6, name: 'shimmer', gain: 0.22, pitch: 1.6 },      // glint on the torch as the dive lands
      { t: 3.8, name: 'swish', gain: 0.16, pitch: 1.3 },        // the +70 m line draws across (riseTimes)
      { t: 4.0, name: 'impact', gain: 0.32, pitch: 1.0 },       // "+70 m" lands on "seventy"
    ];
  },
  drawWorld(ctx, v) {
    drawMelt(ctx, v);
  },
  drawOverlay(ctx, v) {
    drawNewYork(ctx, v);
    // the rise layer (s05) — this scene draws it until just after the cut into beat 5
    if (v.gt >= v.tl.scenes[BEAT.liberty].start + 0.02) return;
    riseOverlay(ctx, v, 1);
  },
};
