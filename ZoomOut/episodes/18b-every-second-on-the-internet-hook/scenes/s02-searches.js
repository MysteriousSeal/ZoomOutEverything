// Beat 2 — "In that same second, | people type more than a hundred thousand searches into Google."
// The phone's screen turns into a clean search page and a query types itself ("In that same second"). On "people type"
// searches start pouring out of the phone in every direction: thin glowing light lines, and now and then a small
// pill-shaped search bar carrying a real query. The flow builds to a flood exactly on "hundred thousand", where a soft
// shock ring leaves the phone and the label lands. Everything is world space (metres around the phone), so the
// camera's pull-back in beat 3 shrinks the flood into the 24-hour dial (s03). Deterministic: a fixed particle list.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, PHONE } from '../env.js';
import { phraseAt, wordTime } from './s01-one-phone.js';

const { W, H } = L;
const TAU = Math.PI * 2;

const QUERIES = [
  'weather tomorrow', 'how far is the moon', 'why is the sky blue', 'pizza near me', 'how to tie a tie',
  'is it going to rain', 'time in tokyo', 'easy pasta recipe', 'how tall is everest', 'translate hello',
  'flights to paris', 'how to sleep better', 'what is a black hole', 'calories in a banana', 'song that goes da da da',
  'how old is the earth', 'cheap hotels rome', 'why do cats purr', 'nearest pharmacy', 'how to boil an egg',
];

// ------------------------------------------------------------------ the particle list (relative emission times)
const DUR = 9.0;               // s of emission from the stream's start
/** Emission rate (per s) at rel time t: a trickle, then the flood peaks on "hundred thousand". */
const rate = (t, peak) => 10 + 105 * L.smoothstep(L.clamp((t - 0.15) / Math.max(0.3, peak - 0.15)));
let PARTS = null;
function parts(peak) {
  if (PARTS && PARTS.peak === peak) return PARTS.list;
  const r = L.rng(1802), list = [];
  let t = 0, i = 0;
  const kept = [];               // pills accepted so far: never more than ~2 crowding the same patch of screen
  while (t < DUR) {
    let pill = i % 13 === 5;
    const a = r() * TAU;
    const D = r(), life = r();
    if (pill) {
      // a pill travels a radial path; reject it if a pill still in flight sits on a nearby heading (they would ride
      // on top of each other), or if too many are already in the air. A rejected pill becomes a plain light line.
      const L0 = 2.6 + 0.8 * life;
      const live = kept.filter((k) => k.t + k.life > t);
      const near = live.filter((k) => {
        const da = Math.abs(Math.atan2(Math.sin(a - k.a), Math.cos(a - k.a)));
        // pills are wide: headings near the horizontal axis need more room than near-vertical ones
        return da < 0.32 + 0.3 * Math.abs(Math.cos(a));
      }).length;
      if (near >= 1 || live.length >= 7) pill = false;
      else kept.push({ t, life: L0, a });
    }
    list.push({
      t, a: pill ? a : a + 0.04 * Math.sin(i * 1.7),
      D: pill ? 0.3 + 0.45 * D : 0.22 + 0.95 * Math.pow(D, 1.5),
      life: pill ? 2.6 + 0.8 * life : 1.5 + 1.3 * life,
      w: 0.6 + 0.9 * r(), hue: r(), pill, q: QUERIES[(i * 7) % QUERIES.length], tw: r(),
    });
    t += (0.6 + 0.8 * r()) / rate(t, peak);
    i++;
  }
  PARTS = { peak, list };
  return list;
}

const T0 = (tl) => phraseAt(tl, 2, 1) - 0.12;                 // "people type"
const T_HIT = (tl) => wordTime(tl, 2, 'hundred') - 0.05;
/** Global fade of the whole stream: it calms during beat 3 (s03's dial takes over) and is gone by "strangest". */
function streamK(v) {
  const s3 = v.tl.scenes[3].start;
  return 1 - 0.7 * L.ease.inOutCubic(L.prog(v.gt, s3 - 0.1, 0.9)) - 0.3 * L.ease.inCubic(L.prog(v.gt, wordTime(v.tl, 3, 'day'), 0.9));
}

/** 0 inside the rect, easing up to 1 at `f` px outside it. */
const softOut = (x, y, x0, y0, x1, y1, f) => {
  const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1);
  return L.smoothstep(L.clamp(Math.hypot(dx, dy) / f));
};
/** Reading-zone mask (1 = clear): the HUD band (y < 320), the label rect once it lands (labK), the caption band.
 *  hw/hh: the half-size of the object, so its edge (not its centre) stays out. */
function zoneMask(x, y, hw, hh, labK) {
  const f = 34;
  let m = L.smoothstep(L.clamp((y - hh - 320) / f));
  m *= 1 - labK * (1 - softOut(x, y, 60 - hw, 360 - hh, 680 + hw, 600 + hh, f));
  m *= softOut(x, y, -1e4, 1250 - hh, 1e4, 1420 + hh, f);
  return m;
}

const dist = (p, u) => 0.04 + p.D * (1 - Math.pow(1 - u, 2.2));

function drawPill(c, v, x, y, p, a, grow, labK) {
  const s = v.ws(1) * grow;
  const fs = 0.0088 * s;
  if (fs < 9) return;          // too small to read: the light lines carry the stream
  c.font = L.font(fs, 500, L.FONT.body);
  const tw = c.measureText(p.q).width;
  const h = fs * 2.15, w = tw + h * 1.55;
  a *= zoneMask(x, y, w / 2, h / 2, labK);
  if (a <= 0.01) return;
  const x0 = x - w / 2, y0 = y - h / 2;
  c.fillStyle = `rgba(8,16,32,${0.78 * a})`;
  L.roundRect(c, x0, y0, w, h, h / 2); c.fill();
  c.strokeStyle = L.rgba([120, 185, 255], 0.75 * a);
  c.lineWidth = Math.max(1, fs * 0.09);
  c.stroke();
  // magnifier
  const mx = x0 + h * 0.52, my = y, mr = h * 0.17;
  c.strokeStyle = L.rgba([170, 210, 255], 0.9 * a);
  c.lineWidth = Math.max(1, fs * 0.11);
  c.beginPath(); c.arc(mx - mr * 0.15, my - mr * 0.15, Math.max(0, mr), 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(mx + mr * 0.55, my + mr * 0.55); c.lineTo(mx + mr * 1.3, my + mr * 1.3); c.stroke();
  c.fillStyle = `rgba(230,238,250,${0.95 * a})`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.fillText(p.q, x0 + h * 0.98, y + fs * 0.04);
}

function drawStream(c, v) {
  const tl = v.tl, gt = v.gt;
  const t0 = T0(tl), tHit = T_HIT(tl);
  const gk = streamK(v);
  if (gt < t0 || gk <= 0.01 || v.cam.mpp > 0.006 || gt > tl.scenes[4].start) return;
  const list = parts(tHit - t0);
  const ox = v.wx(0), oy = v.wy(0), s = v.ws(1);
  const rel = gt - t0;
  // the label zone (top-left) clears once the label is up
  const labK = L.ease.inOutCubic(L.prog(gt, tHit - 0.1, 0.45));
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  const pills = [];
  for (const p of list) {
    if (p.t > rel) break;
    const age = rel - p.t;
    if (age > p.life) continue;
    const u = age / p.life;
    const a0 = L.clamp(u / 0.07) * (1 - L.ease.inCubic(L.prog(u, 0.55, 0.45))) * gk;
    if (a0 <= 0.01) continue;
    const ca = Math.cos(p.a), sa = Math.sin(p.a);
    // leave the phone from its edge: the rectangle's boundary along this direction
    const edge = Math.min(Math.abs(PHONE.w / 2 / (ca || 1e-6)), Math.abs(PHONE.h / 2 / (sa || 1e-6))) * 0.92;
    const d1 = Math.max(edge, dist(p, u) + edge * 0.6), d0 = Math.max(edge, dist(p, Math.max(0, u - 0.085)) + edge * 0.6);
    const x1 = ox + ca * d1 * s, y1 = oy + sa * d1 * s, x0 = ox + ca * d0 * s, y0 = oy + sa * d0 * s;
    if ((x1 < -40 && x0 < -40) || (x1 > W + 40 && x0 > W + 40) || (y1 < -40 && y0 < -40) || (y1 > H + 40 && y0 > H + 40)) continue;
    let a = a0;
    if (p.pill) { pills.push([x1, y1, p, a, 1 + 0.18 * u]); continue; }
    a *= 0.15 + 0.85 * zoneMask(x1, y1, 4, 4, labK);   // lines stay as a faint texture in the reading zones
    const col = L.mix([90, 165, 255], [210, 235, 255], p.hue * 0.7);
    c.strokeStyle = L.rgba(col, 0.16 * a);
    c.lineWidth = 4.5 * p.w;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = L.rgba(col, 0.85 * a);
    c.lineWidth = 1.1 * p.w;
    c.stroke();
    c.fillStyle = `rgba(240,248,255,${0.9 * a})`;
    c.fillRect(x1 - 1.3 * p.w, y1 - 1.3 * p.w, 2.6 * p.w, 2.6 * p.w);
  }
  c.restore();
  // pills above the light lines (normal blending so they read as objects)
  c.save();
  for (const [x, y, p, a, g] of pills) drawPill(c, v, x, y, p, a, g, labK);
  c.restore();
  // the shock ring on "hundred thousand"
  const q = L.prog(gt, tHit, 1.3);
  if (q > 0 && q < 1) {
    const e = L.ease.outCubic(q);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = L.rgba(ACCENT, 0.55 * (1 - e));
    c.lineWidth = 2 + 10 * (1 - e);
    c.beginPath(); c.arc(ox, oy, Math.max(0, v.ws(0.09 + 0.7 * e)), 0, TAU); c.stroke();
    L.lightBlob(c, ox, oy, v.ws(0.3), ACCENT, 0.35 * (1 - q));
    c.restore();
  }
}

export default {
  beat: 2,
  chapter: { num: '02', title: 'Searches', sub: 'Typed into Google' },
  captions: true,
  layer: 2,
  cues(d) {
    return [
      { t: 0.2, name: 'tick', gain: 0.12, pitch: 1.6 },          // the query types itself
      { t: 0.45, name: 'tick', gain: 0.1, pitch: 1.75 },
      { t: 0.7, name: 'tick', gain: 0.1, pitch: 1.6 },
      { t: 1.85, name: 'whoosh', gain: 0.22, pitch: 1.1 },        // "people type": the stream starts
      { t: 2.3, name: 'riser', gain: 0.18, pitch: 1.1 },
      { t: 3.18, name: 'impact', gain: 0.42, pitch: 1.0 },        // "hundred thousand"
      { t: 3.2, name: 'shimmer', gain: 0.2, pitch: 1.35 },
      { t: 3.6, name: 'count', gain: 0.18, pitch: 1.2 },
    ];
  },
  drawWorld(ctx, v) {
    drawStream(ctx, v);
  },
  drawOverlay(ctx, v) {
    const k = v.k * L.prog(v.gt, T_HIT(v.tl), 0.5);
    if (k <= 0) return;
    // a soft dark backing so the stream never fights the number
    const g = ctx.createRadialGradient(250, 480, 20, 250, 480, 420);
    g.addColorStop(0, `rgba(2,4,9,${0.5 * k})`);
    g.addColorStop(1, 'rgba(2,4,9,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 200, 700, 600);
    L.bigLabel(ctx, { x: 96, y: 520, big: '100,000+', small: 'searches every second', k, accent: ACCENT });
  },
};
