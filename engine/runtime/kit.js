// Episode kit: shared camera + HUD building blocks so each episode's camera.js / env.js stays short.
// Owned by the orchestrator. Browser + node safe (no DOM at import time).
import * as L from './lib.js';

const { W } = L;
// HUD rows: portrait sits below the Shorts UI band; landscape hugs the top edge.
const TOP = L.LANDSCAPE ? { m: 96, bar: 60, line: 80, scale: 140 } : { m: 64, bar: 160, line: 182, scale: 238 };

/**
 * Keyframed camera. KEYS[i] = {x, y, mpp, travel} for beat i (world units / metres-per-pixel).
 * Optional per-key: lift (extra mid-travel zoom-out, in log units), push (hold push factor, default 0.96).
 * Big zooms tie the pan to the zoom (linear in mpp) so both ends stay on screen.
 */
export function makeCamera(KEYS, { anchor = 0.47, hookFrom = 0.85, drift = 4 } = {}) {
  function travelTo(a, b, k) {
    const e = L.ease.inOutCubic(k);
    const la = Math.log(a.mpp), lb = Math.log(b.mpp);
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const need = Math.log(Math.max(1e-300, dist) / 900);
    const auto = Math.abs(lb - la) > 1 ? 0 : Math.max(0, need - Math.max(la, lb)) * 0.9;
    const lift = (auto + (b.lift ?? 0)) * Math.sin(Math.PI * e);
    const plain = Math.exp(L.lerp(la, lb, e));
    const ep = Math.abs(lb - la) > 1 ? L.clamp((plain - a.mpp) / (b.mpp - a.mpp)) : e;
    return { x: L.lerp(a.x, b.x, ep), y: L.lerp(a.y, b.y, ep), mpp: plain * Math.exp(lift) };
  }
  function base(gt, tl) {
    const sc = tl.scenes;
    let b = 0;
    sc.forEach((s, i) => { if (s.start <= gt) b = i; });
    b = Math.min(b, KEYS.length - 1);
    const t = gt - sc[b].start, d = sc[b].end - sc[b].start;
    if (b === 0) return { x: KEYS[0].x, y: KEYS[0].y, mpp: KEYS[0].mpp * L.lerp(hookFrom, 1, L.ease.inOutCubic(L.prog(t, 0, d))) };
    const key = KEYS[b];
    const prev = KEYS[b - 1];
    // start where the previous beat's hold push ended, so the zoom never jumps at a boundary
    const from = b - 1 === 0 ? prev : { ...prev, mpp: prev.mpp * (prev.push ?? 0.96) };
    const cam = travelTo(from, key, L.prog(t, -0.05, key.travel));
    cam.mpp *= L.lerp(1, key.push ?? 0.96, L.ease.inOutCubic(L.prog(t, key.travel, d - key.travel)));
    return cam;
  }
  return {
    KEYS,
    at(gt, tl) {
      const cam = base(gt, tl);
      cam.x += L.noise1(gt * 0.3, 1) * drift * cam.mpp;
      cam.y += L.noise1(gt * 0.27, 2) * drift * cam.mpp;
      cam.anchor = anchor;
      return cam;
    },
  };
}

/** Top bar: channel · episode label, timecode, progress line. */
export function topBar(c, v, accent, ink = [235, 230, 222]) {
  c.save();
  // label: the episode number, or the title for episodes released out of order (no episodeLabel); shrinks to clear the timecode
  const label = `${v.ep.channel}  ·  ${v.ep.episodeLabel ?? v.ep.title.toUpperCase()}`;
  let px = 20;
  for (; px > 14; px--) { c.font = L.font(px, 600, L.FONT.body); c.letterSpacing = '4px'; const w = c.measureText(label).width; c.letterSpacing = '0px'; if (w <= W - 2 * TOP.m - 170) break; }
  c.font = L.font(px, 600, L.FONT.body);
  c.fillStyle = L.rgba(ink, 0.75);
  c.textBaseline = 'middle';
  L.trackedText(c, label, TOP.m, TOP.bar, 4);
  const n30 = Math.round(v.gt * 30), s = Math.floor(n30 / 30), f = n30 % 30;   // integer frames: no float floor jitter
  c.font = L.font(20, 400, L.FONT.mono);
  c.textAlign = 'right';
  const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  c.fillText(`${mm}:${ss}:${String(f).padStart(2, '0')}`, W - TOP.m, TOP.bar);
  c.fillStyle = L.rgba(ink, 0.18);
  c.fillRect(TOP.m, TOP.line, W - 2 * TOP.m, 2);
  c.fillStyle = L.rgba(accent, 0.9);
  c.fillRect(TOP.m, TOP.line, (W - 2 * TOP.m) * L.clamp(v.gt / v.tl.total), 2);
  c.restore();
}

const NICE = [1, 2, 5];
export function niceLen(m) { const p = Math.pow(10, Math.floor(Math.log10(m))); for (const n of NICE) if (n * p >= m) return n * p; return 10 * p; }

/** Metric length formatter from nanometres to light-years-free km. */
export function fmtMetres(m) {
  if (m < 1e-9) return `${L.fmt(m * 1e12)} pm`;
  if (m < 1e-6) return `${L.fmt(m * 1e9)} nm`;
  if (m < 1e-3) return `${L.fmt(m * 1e6)} µm`;
  if (m < 0.01) return `${L.fmt(m * 1000)} mm`;
  if (m < 1) return `${L.fmt(m * 100)} cm`;
  if (m < 1000) return `${L.fmt(m)} m`;
  return `${L.fmt(m / 1000)} km`;
}

/** Adaptive scale bar (top right, y≈238; y≈140 in landscape): ~150 px of world, label via fmt, optional small note under it. */
export function scaleBar(c, v, { k = 1, fmt = fmtMetres, note = '', ink = [235, 230, 222], unitsPerMetre = 1 } = {}) {
  if (k <= 0) return;
  const len = niceLen(v.cam.mpp * 150), px = len / v.cam.mpp;
  const x1 = W - TOP.m, x0 = x1 - px, y = TOP.scale;
  c.save();
  c.globalAlpha = k;
  c.strokeStyle = L.rgba(ink, 0.85);
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(x0, y - 8); c.lineTo(x0, y); c.lineTo(x1, y); c.lineTo(x1, y - 8); c.stroke();
  c.font = L.font(22, 600, L.FONT.body);
  c.fillStyle = L.rgba(ink, 0.85);
  c.textAlign = 'right';
  c.fillText(fmt(len / unitsPerMetre), x1, y - 14);
  if (note) {
    c.font = L.font(18, 600, L.FONT.body);
    c.fillStyle = L.rgba(ink, 0.55);
    L.trackedText(c, note, x1, y + 26, 2, 'right');
  }
  c.restore();
}

/** Twinkling starfield in screen space (deterministic). */
export function stars(c, v, k = 1, n = 160, seed = 21) {
  if (k <= 0) return;
  const r = L.rng(seed);
  c.save();
  for (let i = 0; i < n; i++) {
    const x = r() * L.W, y = r() * L.H, s = 0.6 + r() * 1.6, ph = r() * 6.28;
    c.fillStyle = `rgba(255,255,255,${k * (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(v.gt * 1.5 + ph)))})`;
    c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** Default transition cues: a soft whoosh at every beat change. */
export const beatCues = (tl, { from = 1, gain = 0.2, pitch = 0.9, name = 'whoosh' } = {}) =>
  tl.scenes.slice(from).map((s, i) => ({ t: s.start - 0.05, name, gain, pitch: pitch * (i % 2 ? 0.85 : 1) }));
