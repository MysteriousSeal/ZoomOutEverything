// Shared motion-graphics library (browser + node safe: no DOM access at import time).
// Scene files import from here. Owned by the orchestrator — scene builders: do not edit.

// Format comes from the page URL (?fmt=landscape, set by node/common.mjs from episode.json "format").
// portrait = 1080x1920 Shorts (default) · landscape = 1920x1080 regular videos
const FMT = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('fmt')) || 'portrait';
export const LANDSCAPE = FMT === 'landscape';
export const W = LANDSCAPE ? 1920 : 1080, H = LANDSCAPE ? 1080 : 1920, FPS = 30;

// ------------------------------------------------------------------ fonts
export const FONT = {
  display: '"Avenir Next Condensed"',   // headlines, big numbers (weights 600/700/800)
  body: '"Avenir Next"',                // labels, captions
  din: '"DIN Condensed"',               // HUD numerals
  mono: 'Menlo',
};
export const font = (size, weight = 700, family = FONT.body) => `${weight} ${size}px ${family}`;

// ------------------------------------------------------------------ math
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => (b === a ? 0 : clamp((x - a) / (b - a)));
export const prog = (t, start, dur) => (dur <= 0 ? +(t >= start) : clamp((t - start) / dur));
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const ease = {
  linear: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
};
/** 0→1 entrance over `dur` starting at `start`, eased. */
export const enter = (t, start = 0, dur = 0.5, fn = ease.outCubic) => fn(prog(t, start, dur));

/** Deterministic PRNG (mulberry32). Never use Math.random in scenes: frames render out of order. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x, seed = 0) {
  const h = (n) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i;
  return lerp(h(i), h(i + 1), smoothstep(f)) * 2 - 1;
}

// ------------------------------------------------------------------ colour
export const rgba = ([r, g, b], a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export const mix = (c1, c2, t) => c1.map((v, i) => lerp(v, c2[i], t));
/** Sample a colour ramp: stops = [[pos, [r,g,b]], ...] sorted by pos. */
export function ramp(stops, x) {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], invLerp(stops[i - 1][0], stops[i][0], x));
  }
  return stops[stops.length - 1][1];
}
export const INK = [6, 10, 20];
export const WHITE = [255, 255, 255];
export const GREY = [150, 165, 185];

// ------------------------------------------------------------------ number formatting
export const fmt = (n, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const mToFt = (m) => m * 3.28084;

// ------------------------------------------------------------------ drawing helpers
export function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));   // eased sizes can undershoot below 0 on motion-blur sub-frames
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Text with letter-spacing; align: 'left' | 'center' | 'right'. Returns drawn width. */
export function trackedText(ctx, str, x, y, tracking = 0, align = 'left') {
  ctx.letterSpacing = `${tracking}px`;
  const w = ctx.measureText(str).width - tracking;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  ctx.fillText(str, x0, y);
  ctx.textAlign = prev;
  ctx.letterSpacing = '0px';
  return w;
}

/** Shrink font size until `str` fits in maxW. Returns the size. */
export function fitSize(ctx, str, maxW, size, weight = 800, family = FONT.display, min = 20) {
  while (size > min) {
    ctx.font = font(size, weight, family);
    if (ctx.measureText(str).width <= maxW) break;
    size -= 2;
  }
  return size;
}

/** Soft glow: draws `fn` with a coloured shadow blur, additive. */
export function glow(ctx, color, blur, fn, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= alpha;
  ctx.shadowColor = rgba(color, 1);
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

/** Radial light blob (additive). */
export function lightBlob(ctx, x, y, r, color, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.4, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/**
 * Standard "big number" label used for every landmark (keeps typography consistent).
 *   big:   e.g. '332 m'      (accent colour, condensed heavy)
 *   small: e.g. '1,090 ft · deepest scuba dive'  (grey, tracked caps)
 * k: 0..1 visibility (animate entrances with it). align: 'left' | 'right' | 'center'.
 */
export function bigLabel(ctx, { x, y, big, small, k = 1, accent = [70, 200, 210], align = 'left', size = 120 }) {
  if (k <= 0) return;
  const e = ease.outCubic(clamp(k));
  ctx.save();
  ctx.globalAlpha *= clamp(k * 1.4);
  ctx.textBaseline = 'alphabetic';
  // rule line that wipes in
  const ruleW = 90 * e;
  ctx.fillStyle = rgba(accent, 0.9);
  const rx = align === 'right' ? x - ruleW : align === 'center' ? x - ruleW / 2 : x;
  ctx.fillRect(rx, y - size * 0.92 - 26, ruleW, 4);
  ctx.font = font(size, 800, FONT.display);
  ctx.fillStyle = rgba(accent);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  trackedText(ctx, big, x, y + (1 - e) * 30, -1, align);
  if (small) {
    ctx.shadowBlur = 8;
    ctx.font = font(30, 600, FONT.body);
    ctx.fillStyle = rgba([205, 215, 230], 0.95);
    // caps style, but keep unit symbols honest: "M²" would read as square megametres
    const caps = small.toUpperCase().replace(/KM([²³])/g, 'km$1').replace(/M([²³])/g, 'm$1');
    trackedText(ctx, caps, x, y + 52 + (1 - e) * 18, 3, align);
  }
  ctx.restore();
}

/** Thin callout leader line from (x1,y1) to (x2,y2) drawn progressively (k 0..1) with an end dot. */
export function leader(ctx, x1, y1, x2, y2, k = 1, color = WHITE, alpha = 0.75) {
  if (k <= 0) return;
  const e = ease.outCubic(clamp(k));
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(lerp(x1, x2, e), lerp(y1, y2, e));
  ctx.stroke();
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.arc(x1, y1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Bracket spanning a vertical screen range (for "2 km of water" style dimensions). */
export function dimension(ctx, x, y1, y2, k = 1, color = WHITE, label = '', side = 'right') {
  if (k <= 0) return;
  const e = ease.outCubic(clamp(k));
  const mid = (y1 + y2) / 2;
  const a = lerp(mid, y1, e), b = lerp(mid, y2, e);
  const dx = side === 'right' ? 18 : -18;
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - dx, a); ctx.lineTo(x, a); ctx.lineTo(x, b); ctx.lineTo(x - dx, b);
  ctx.stroke();
  if (label) {
    ctx.globalAlpha *= clamp(k * 2 - 1);
    ctx.font = font(34, 700, FONT.body);
    ctx.fillStyle = rgba(color);
    ctx.textBaseline = 'middle';
    trackedText(ctx, label, x + dx * 1.2, mid, 1, side === 'right' ? 'left' : 'right');
  }
  ctx.restore();
}
