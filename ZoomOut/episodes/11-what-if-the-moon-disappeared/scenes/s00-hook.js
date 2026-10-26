// Beat 0 — the hook. "What if the Moon suddenly disappeared?"
// A calm night beach under a full Moon. The headline rises in. On "disappeared" (BLINK) the Moon takes a last
// breath (a slight swell and flare), then implodes to a point: a pinpoint glint, one thin shock ring and a faint
// after-image ring that lingers like a retinal ghost. The beach light drop itself is env's (moonlight()).
// Exports wordTime() for the other beach scenes (s01–s03).
import * as L from '../../../../engine/runtime/lib.js';
import { drawSkyMoon, BLINK, SKY_MOON, skyK } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;

/** Estimated start time (global s) of the first word matching `re` in line `li` (same weights as the captions). */
export function wordTime(tl, li, re) {
  const ln = tl.lines[li];
  for (const ph of ln.phrases ?? [ln]) {
    const words = ph.text.split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (re.test(words[i])) return ph.start + (ph.end - ph.start) * acc / tot;
      acc += wts[i];
    }
  }
  return ln.start;
}

// ------------------------------------------------------------------ the vanishing Moon (screen space, sky layer)
function moonState(t) {
  const breath = L.ease.inOutCubic(L.prog(t, BLINK - 0.55, 0.5));          // a last swell before it goes
  const implode = L.ease.inCubic(L.prog(t, BLINK, 0.16));
  return { s: (1 + 0.035 * breath) * (1 - implode), flare: breath * (1 - implode), k: 1 - L.prog(t, BLINK + 0.1, 0.06) };
}

function drawVanish(c, v) {
  const t = v.t, sk = skyK(v);
  if (sk <= 0) return;
  const { x, y, r } = SKY_MOON;
  c.save();
  c.globalAlpha *= sk;
  // pinpoint glint as the disc collapses
  const g = L.prog(t, BLINK + 0.06, 0.5);
  if (g > 0 && g < 1) {
    const a = Math.pow(Math.sin(Math.PI * Math.pow(g, 0.45)), 1.6);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.translate(x, y);
    c.rotate(0.35 + 0.2 * g);
    for (const [len, wid, rot] of [[170, 2.5, 0], [110, 2, Math.PI / 2], [46, 1.4, Math.PI / 4], [46, 1.4, -Math.PI / 4]]) {
      c.save();
      c.rotate(rot);
      const lg = c.createLinearGradient(-len, 0, len, 0);
      lg.addColorStop(0, 'rgba(220,230,255,0)');
      lg.addColorStop(0.5, `rgba(235,240,255,${0.9 * a})`);
      lg.addColorStop(1, 'rgba(220,230,255,0)');
      c.fillStyle = lg;
      c.fillRect(-len, -wid / 2, 2 * len, wid);
      c.restore();
    }
    c.restore();
    L.lightBlob(c, x, y, 70, [200, 215, 255], 0.6 * a);
    L.lightBlob(c, x, y, 12, [255, 255, 255], 0.95 * a);
  }
  // one thin shock ring travels out and thins away
  const s = L.prog(t, BLINK + 0.08, 1.3);
  if (s > 0 && s < 1) {
    const e = L.ease.outCubic(s);
    c.strokeStyle = `rgba(190,205,255,${0.42 * Math.pow(1 - s, 1.6)})`;
    c.lineWidth = L.lerp(2.5, 0.8, s);
    c.beginPath(); c.arc(x, y, Math.max(0, L.lerp(r * 0.5, r * 4.6, e)), 0, TAU); c.stroke();
  }
  // after-image: a faint cool ring where the Moon was, fading like a ghost on the retina
  const ai = L.prog(t, BLINK + 0.05, 2.1);
  if (ai > 0 && ai < 1) {
    const a = 0.3 * Math.sin(Math.PI * Math.min(1, ai * 6)) ** 0.5 * Math.pow(1 - ai, 1.4);
    const rr = r * (1 + 0.06 * L.ease.outCubic(ai));
    const rg = c.createRadialGradient(x, y, rr * 0.7, x, y, rr * 1.05);
    rg.addColorStop(0, 'rgba(120,150,200,0)');
    rg.addColorStop(0.85, `rgba(140,170,220,${a * 0.5})`);
    rg.addColorStop(1, 'rgba(140,170,220,0)');
    c.fillStyle = rg;
    c.beginPath(); c.arc(x, y, Math.max(0, rr * 1.05), 0, TAU); c.fill();
    c.strokeStyle = `rgba(170,190,235,${a})`;
    c.lineWidth = 1.2;
    c.beginPath(); c.arc(x, y, Math.max(0, rr), 0, TAU); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ headline (masked rise, accent word)
function headline(c, v) {
  const t = v.t, d = v.d;
  const lines = [
    { s: 'WHAT IF THE MOON', y: 800, size: 112, t0: 0.18, acc: false },
    { s: 'DISAPPEARED?', y: 948, size: 156, t0: 0.42, acc: true },
  ];
  // a thin accent rule above the headline
  const rk = L.enter(t, 0.08, 0.7, L.ease.outExpo) * (1 - L.enter(t, d - 0.6, 0.3, L.ease.inCubic));
  if (rk > 0) {
    c.fillStyle = L.rgba(v.accent, 0.85 * rk);
    c.fillRect(W / 2 - 50 * rk, 664, 100 * rk, 4);
  }
  for (const [i, ln] of lines.entries()) {
    const kin = L.enter(t, ln.t0, 0.7, L.ease.outExpo);
    const kout = L.enter(t, d - 0.58 + i * 0.06, 0.32, L.ease.inCubic);
    if (kin <= 0 || kout >= 1) continue;
    c.save();
    c.font = L.font(ln.size, 800, L.FONT.display);
    const top = ln.y - ln.size * 0.82, bot = ln.y + ln.size * 0.12;
    c.beginPath(); c.rect(0, top - 10, W, bot - top + 20); c.clip();
    const dy = (1 - kin) * ln.size * 1.05 - kout * ln.size * 1.1;
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(2,6,16,0.7)';
    c.shadowBlur = 24;
    c.fillStyle = ln.acc ? L.rgba(v.accent) : 'rgb(244,246,252)';
    L.trackedText(c, ln.s, W / 2, ln.y + dy, ln.acc ? 1 : 3, 'center');
    // when the Moon goes, its last light sweeps once across the accent word, then the word cools a touch
    if (ln.acc) {
      c.shadowColor = 'transparent';
      const sw = L.prog(t, BLINK - 0.05, 0.75);
      if (sw > 0 && sw < 1) {
        // the same word filled again with a moving white band: the sweep only ever touches the letters
        const gx = L.lerp(W / 2 + 480, W / 2 - 480, L.ease.inOutCubic(sw));
        const g = c.createLinearGradient(gx - 110, 0, gx + 110, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, `rgba(255,255,255,${0.75 * Math.sin(Math.PI * sw)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        L.trackedText(c, ln.s, W / 2, ln.y + dy, 1, 'center');
      }
    }
    c.restore();
  }
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  layer: 5,
  cues(d) {
    return [
      { t: 0.05, name: 'swell', gain: 0.2, pitch: 0.8 },
      { t: 0.2, name: 'swish', gain: 0.2, pitch: 0.9 },
      { t: 0.46, name: 'blip', gain: 0.18, pitch: 0.85 },
      { t: BLINK - 0.55, name: 'riser', gain: 0.16, pitch: 0.9 },
      { t: BLINK + 0.02, name: 'deep', gain: 0.55, pitch: 0.75 },
      { t: BLINK + 0.04, name: 'impact', gain: 0.3, pitch: 0.6 },
      { t: BLINK + 0.12, name: 'shimmer', gain: 0.1, pitch: 0.6 },
      { t: d - 0.55, name: 'swish', gain: 0.14, pitch: 0.75 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.beat !== 0) return;
    const m = moonState(v.t);
    if (m.k > 0 && m.s > 0) {
      drawSkyMoon(ctx, v, { k: m.k, s: m.s });
      if (m.flare > 0) L.lightBlob(ctx, SKY_MOON.x, SKY_MOON.y, SKY_MOON.r * 2.6, [225, 232, 255], 0.28 * m.flare * skyK(v));
    }
    drawVanish(ctx, v);
  },
  drawOverlay(ctx, v) {
    if (v.t > v.d) return;
    headline(ctx, v);
  },
};
