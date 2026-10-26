// Beat 4 — "Zoom out, | and that second also sends about four million emails."
// The camera climbs from the bedroom to the block (camera.js). On "and that second" a first envelope lifts off our
// phone (the glowing point at the centre); then a wave of envelopes spreads out from it across the lit roofs of the
// cut-away building and the blocks around it. Each envelope RISES toward the lens: it grows and slides away from the
// screen centre (a cheap top-down perspective), with a faint light trail back to its roof, then streams off-frame.
// The stream keeps flowing through beat 5 (s05: spam) and every envelope carries a deterministic `spam` flag
// (~45%) so s05 can import `envelopes(v)` / `drawEnvelope` and recolour or filter them. Label "4 million".
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, BLDG, GRID, toWorld, cityDensity, waterAt, planToScreen, planK } from '../env.js';
import { wordTime } from './s01-one-phone.js';
import { drawLoopTag, loopTimes } from './s03-eight-billion.js';

const { W, H } = L;

// ------------------------------------------------------------------ envelope sprites (built once)
const SPR_W = 72, SPR_H = 56;
const sprites = {};
/** Envelope sprite: 'mail' (white line art with a cool glow) or 'spam' (flat grey). */
function sprite(kind) {
  if (sprites[kind]) return sprites[kind];
  const cv = new OffscreenCanvas(SPR_W, SPR_H), c = cv.getContext('2d');
  const w = 40, h = 27, x = (SPR_W - w) / 2, y = (SPR_H - h) / 2;
  const line = kind === 'spam' ? 'rgba(150,156,166,0.95)' : 'rgba(240,247,255,1)';
  if (kind !== 'spam') {
    c.shadowColor = 'rgba(80,170,255,0.9)';
    c.shadowBlur = 10;
  }
  c.fillStyle = kind === 'spam' ? 'rgba(40,43,50,0.85)' : 'rgba(12,26,52,0.85)';
  L.roundRect(c, x, y, w, h, 3); c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = line;
  c.lineWidth = 2.2;
  c.lineJoin = 'round';
  L.roundRect(c, x, y, w, h, 3); c.stroke();
  c.beginPath(); c.moveTo(x + 2, y + 2); c.lineTo(x + w / 2, y + h * 0.6); c.lineTo(x + w - 2, y + 2); c.stroke();
  sprites[kind] = cv;
  return cv;
}

// ------------------------------------------------------------------ sources: lit roofs (plan metres around the phone)
const SOURCES = (() => {
  const r = L.rng(404), out = [];
  // the cut-away building: a dozen lit apartments
  for (let q = 0; q < 14; q++) out.push({ x: L.lerp(BLDG.x0 + 3, BLDG.x1 - 3, r()), y: L.lerp(BLDG.y0 + 3, BLDG.y1 - 3, r()) });
  // the blocks around: points inside the lots (never on the avenues or streets)
  for (let i = -2; i <= 2; i++) {
    for (let j = -9; j <= 9; j++) {
      const n = 95;
      for (let q = 0; q < n; q++) {
        const x = i * GRID.ave + (r() - 0.5) * (GRID.ave - GRID.aveW - 8);
        const y = j * GRID.st + (r() - 0.5) * (GRID.st - GRID.stW - 6);
        if (x > BLDG.x0 - 2 && x < BLDG.x1 + 2 && y > BLDG.y0 - 2 && y < BLDG.y1 + 2) continue;
        out.push({ x, y });
      }
    }
  }
  return out
    .filter((s) => waterAt(s.x, s.y) <= 0 && cityDensity(toWorld(s.x, s.y).x, toWorld(s.x, s.y).y) > 0.1)
    .map((s, i) => ({ ...s, d: Math.hypot(s.x, s.y), P: 1.4 + 2.2 * r(), ph: r(), sz: 0.7 + 0.55 * r(), id: i }));
})();

const LIFE = 2.2;
const T_FIRST = (tl) => wordTime(tl, 4, 'and') + 0.05;      // our phone sends the first one
const T_WAVE = (tl) => wordTime(tl, 4, 'that') + 0.2;       // then the wave leaves home
const WAVE_SPEED = 85;                                       // m/s across the roofs
const T_STOP = (tl) => tl.scenes[5].end - 0.6;               // last emissions (the stream ends with beat 5)
/** 0 inside the rect, easing up to 1 at `f` px outside it. */
const softOut = (x, y, x0, y0, x1, y1, f) => {
  const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1);
  return L.smoothstep(L.clamp(Math.hypot(dx, dy) / f));
};
const hash01 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * Every envelope in flight now: [{x, y, size, a, u, spam, sx, sy}] (screen px; sx/sy = its roof). Pure function of v.
 * spam: deterministic, ~45% of envelopes.
 */
export function envelopes(v) {
  const tl = v.tl, gt = v.gt, out = [];
  // the stream belongs to the block: it thins out as the camera climbs to the city (beat 6)
  const zk = 1 - L.smoothstep(L.clamp(L.invLerp(Math.log(0.16), Math.log(0.4), Math.log(v.cam.mpp))));
  const pk = planK(v) * zk;
  if (pk <= 0.01 || v.cam.mpp < 0.012 || gt < T_FIRST(tl) || gt > T_STOP(tl) + LIFE) return out;
  const cx = W / 2, cy = H * (v.cam.anchor ?? 0.47);
  const base = L.clamp(v.ws(9), 12, 22);
  const tw = T_WAVE(tl), stop = T_STOP(tl);
  const labK = L.ease.inOutCubic(L.prog(gt, wordTime(tl, 4, 'four') - 0.35, 0.4)) * (1 - L.prog(gt, tl.scenes[4].end - 0.1, 0.35));
  const push = (sx, sy, u, sz, spam) => {
    const e = L.ease.inCubic(u) * 0.7 + 0.3 * u;
    const f = 1 / (1 - 0.68 * e);
    const x = cx + (sx - cx) * f, y = cy + (sy - cy) * f;
    const size = base * sz * f;
    if (x < -size * 2 || x > W + size * 2 || y < -size * 2 || y > H + size * 2) return;
    let a = L.clamp(u / 0.1) * (1 - L.ease.inCubic(L.prog(u, 0.62, 0.38))) * pk;
    // keep the reading zones clean: the HUD band, the label (once it lands) and the caption band
    const m = size * 0.9 + 24;   // soft edge, grows with the envelope so it never pokes into a zone
    a *= L.smoothstep(L.clamp((y - 300) / m));                           // HUD: gone above y 300
    a *= 1 - labK * (1 - softOut(x, y, 60, 380, 620, 600, m));            // the label rect
    a *= softOut(x, y, -1e4, 1250, 1e4, 1420, m);                         // the caption band
    out.push({ x, y, size, a, u, spam, sx, sy, f });
  };
  // the very first envelope: from our phone
  {
    const u = (gt - T_FIRST(tl)) / (LIFE * 1.3);
    if (u > 0 && u < 1) { const p = planToScreen(v, 0, 0); push(p.x, p.y, u, 1.5, false); }
  }
  for (const s of SOURCES) {
    const on = tw + s.d / WAVE_SPEED;
    if (gt < on) continue;
    const p = planToScreen(v, s.x, s.y);
    if (p.x < -300 || p.x > W + 300 || p.y < -300 || p.y > H + 300) continue;
    // emissions at on + (n + ph) * P; the ones still in flight now
    const n1 = Math.floor((gt - on) / s.P - s.ph);
    for (let n = Math.max(-1, n1 - 2); n <= n1; n++) {
      const te = on + (n + s.ph) * s.P;
      if (te < on - 0.001 || te > stop) continue;
      const u = (gt - te) / LIFE;
      if (u <= 0 || u >= 1) continue;
      push(p.x, p.y, u, s.sz, hash01(s.id, n) < 0.45);
    }
  }
  return out;
}

/** Draw one envelope e from envelopes(v). opts: {kind 'mail'|'spam', alpha, trail, rot}. */
export function drawEnvelope(c, e, opts = {}) {
  const kind = opts.kind ?? 'mail';
  const a = e.a * (opts.alpha ?? 1);
  if (a <= 0.01) return;
  if (opts.trail !== false && kind === 'mail') {
    // a faint light trail back down toward the roof
    const tx = L.lerp(e.x, e.sx, 0.35), ty = L.lerp(e.y, e.sy, 0.35);
    const g = c.createLinearGradient(tx, ty, e.x, e.y);
    g.addColorStop(0, L.rgba(ACCENT, 0));
    g.addColorStop(1, L.rgba(ACCENT, 0.4 * a));
    c.strokeStyle = g;
    c.lineWidth = Math.max(1, e.size * 0.08);
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(e.x, e.y); c.stroke();
  }
  const s = sprite(kind);
  const w = e.size * (SPR_W / 40), h = e.size * (SPR_H / 40);
  c.globalAlpha = a;
  c.drawImage(s, e.x - w / 2, e.y - h / 2, w, h);
  c.globalAlpha = 1;
}

function drawStream(c, v) {
  const list = envelopes(v);
  if (!list.length) return;
  // far ones first (smaller), near ones on top
  list.sort((a, b) => a.f - b.f);
  c.save();
  // roof flashes where an envelope just left
  c.globalCompositeOperation = 'lighter';
  for (const e of list) {
    if (e.u < 0.25) L.lightBlob(c, e.sx, e.sy, 16, [150, 200, 255], 0.35 * (1 - e.u / 0.25) * e.a);
  }
  c.globalCompositeOperation = 'source-over';
  for (const e of list) drawEnvelope(c, e);
  c.restore();
}

/** The wave front leaving home: one thin ring across the roofs. */
function drawWave(c, v) {
  const tl = v.tl;
  const q = L.prog(v.gt, T_WAVE(tl), 2.6);
  if (q <= 0 || q >= 1) return;
  const p = planToScreen(v, 0, 0);
  const r = v.ws(WAVE_SPEED * 2.6 * q);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = L.rgba(ACCENT, 0.35 * (1 - q) * planK(v));
  c.lineWidth = 2;
  c.beginPath(); c.arc(p.x, p.y, Math.max(0, r), 0, Math.PI * 2); c.stroke();
  c.restore();
}

export default {
  beat: 4,
  chapter: { num: '04', title: 'Emails', sub: 'Sent every second' },
  captions: true,
  layer: 3,
  cues(d) {
    return [
      { t: 0.1, name: 'whoosh', gain: 0.3, pitch: 0.75 },          // "Zoom out": the climb
      { t: 0.2, name: 'riser', gain: 0.14, pitch: 0.8 },
      { t: 1.55, name: 'swish', gain: 0.22, pitch: 1.3 },          // the first envelope leaves the phone
      { t: 2.0, name: 'sonar', gain: 0.18, pitch: 1.1 },           // the wave spreads over the roofs
      { t: 3.48, name: 'impact', gain: 0.38, pitch: 0.95 },        // "four million"
      { t: 3.52, name: 'shimmer', gain: 0.18, pitch: 1.25 },
    ];
  },
  drawWorld(ctx, v) {
    drawWave(ctx, v);
    drawStream(ctx, v);
  },
  drawOverlay(ctx, v) {
    const tl = v.tl;
    const tk = L.prog(v.gt, wordTime(tl, 4, 'four') - 0.05, 0.5);
    // the parked open-loop tag stays until the number lands, then bows out
    const T = loopTimes(tl);
    // (not scaled by v.k: it continues s03's tag at full strength across the cut)
    if (v.gt >= tl.scenes[4].start) drawLoopTag(ctx, (1 - L.ease.inCubic(L.prog(v.gt, wordTime(tl, 4, 'four') - 0.3, 0.4))), L.prog(v.gt, T.park, 0.7), v.gt);
    const k = v.k * tk;
    if (k <= 0) return;
    const g = ctx.createRadialGradient(250, 480, 20, 250, 480, 420);
    g.addColorStop(0, `rgba(2,4,9,${0.5 * k})`);
    g.addColorStop(1, 'rgba(2,4,9,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 200, 700, 600);
    L.bigLabel(ctx, { x: 96, y: 520, big: '4 million', small: 'emails every second', k, accent: ACCENT });
  },
};
