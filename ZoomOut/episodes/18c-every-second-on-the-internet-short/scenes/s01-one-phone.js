// Beat 1 — "It starts with one phone, | lighting up in the dark."
// OWNS THE PHONE for the whole film: a refined modern phone lying screen-up at the world origin (axis-aligned to the
// screen, askew on the walnut nightstand). drawWorld draws it at EVERY time (LOD: full detail -> a lit slab -> a glowing
// point while it is a few px -> culled), plus the cool light pool its screen casts on the wood.
//   screen states (pure function of gt): dark glass before WAKE -> a dim lock screen (hook) -> full brightness with a
//   notification on "lighting up" -> the search UI in beats 2-4 -> wallpaper only from beat 17 (s17/s18 draw on top).
// Beat 1 also draws a thin one-second sweep ring that completes around the phone ("00:01").
// Exports for other scenes (import only): drawPhone, screenRect, phoneLight, wordTime, phraseAt.
import * as L from '../../../../engine/runtime/lib.js';
import { PHONE, ACCENT, SCREEN } from '../env.js';

const { W } = L;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ timing helpers (shared with s00-s04)
/** Start time of phrase j of line i. */
export const phraseAt = (tl, i, j = 0, edge = 'start') => (tl.lines[i].phrases ?? [tl.lines[i]])[j][edge];
/** Estimated start of the first word beginning with `needle` in line li (same weighting as the captions). */
export function wordTime(tl, li, needle) {
  const phrases = tl.lines[li].phrases ?? [tl.lines[li]];
  for (const ph of phrases) {
    const words = ph.text.split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const total = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase().replace(/[^a-z0-9-]/g, '').startsWith(needle)) return ph.start + (ph.end - ph.start) * acc / total;
      acc += wts[i];
    }
  }
  return tl.lines[li].start;
}

// ------------------------------------------------------------------ phone geometry (metres)
const FRAME = 0.0011;          // titanium band seen from above
const BEZEL = 0.0023;          // black glass border
const INSET = FRAME + BEZEL;
const SW = PHONE.w - 2 * INSET, SH = PHONE.h - 2 * INSET, SR = PHONE.r - INSET * 0.8;
export const WAKE = 0.6;       // the screen wakes in the dark (hook)

/** Screen brightness 0..1 (also drives the light pool and the room veil in s00). */
export function phoneLight(v) {
  const gt = v.gt, tl = v.tl;
  const a = 0.5 * L.ease.outCubic(L.prog(gt - tl.scenes[0].start, WAKE, 1.1));   // 18c: beat-relative (the film starts after the cold open)
  const b = 0.5 * L.ease.outCubic(L.prog(gt, phraseAt(tl, 1, 1) - 0.05, 0.55));
  return a + b;
}
/** The phone's screen in px: {x, y, w, h, r, s (px per metre), cx, cy}. Axis-aligned on screen. */
export function screenRect(v) {
  const s = 1 / v.cam.mpp, cx = v.wx(0), cy = v.wy(0);
  return { x: cx - SW / 2 * s, y: cy - SH / 2 * s, w: SW * s, h: SH * s, r: SR * s, s, cx, cy };
}

// ------------------------------------------------------------------ screen content
const QUERY = 'how many searches per second';
function wallpaper(c, R, gt, k) {
  const { x, y, w, h } = R;
  const g = c.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, L.rgba([8, 18, 40], k));
  g.addColorStop(0.55, L.rgba([12, 40, 92], k));
  g.addColorStop(1, L.rgba([20, 70, 150], k));
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  // soft aurora orbs that drift very slowly
  const orb = (fx, fy, fr, col, a) => {
    const ox = x + w * (fx + 0.05 * Math.sin(gt * 0.23 + fy * 9)), oy = y + h * (fy + 0.03 * Math.cos(gt * 0.19 + fx * 7));
    const rr = Math.max(1, w * fr);
    const og = c.createRadialGradient(ox, oy, 0, ox, oy, rr);
    og.addColorStop(0, L.rgba(col, a * k));
    og.addColorStop(1, L.rgba(col, 0));
    c.fillStyle = og;
    c.fillRect(ox - rr, oy - rr, rr * 2, rr * 2);
  };
  orb(0.85, 0.72, 0.9, [70, 160, 255], 0.55);
  orb(0.15, 0.95, 0.75, [40, 110, 230], 0.5);
  orb(0.3, 0.45, 0.6, [110, 90, 230], 0.22);
  // a fine diagonal ribbon of light
  c.save();
  c.globalCompositeOperation = 'lighter';
  const rg = c.createLinearGradient(x, y + h * 0.55, x + w, y + h * 0.75);
  rg.addColorStop(0, L.rgba([120, 190, 255], 0));
  rg.addColorStop(0.5, L.rgba([140, 200, 255], 0.16 * k));
  rg.addColorStop(1, L.rgba([120, 190, 255], 0));
  c.strokeStyle = rg;
  c.lineWidth = Math.max(0.5, w * 0.012);
  c.beginPath();
  c.moveTo(x - w * 0.1, y + h * 0.9);
  c.bezierCurveTo(x + w * 0.3, y + h * 0.55, x + w * 0.65, y + h * 0.95, x + w * 1.1, y + h * 0.58);
  c.stroke();
  c.restore();
}

function lockContent(c, R, v, k, opts) {
  const { x, y, w, h, s } = R;
  if (k <= 0.01 || h < 90) return;
  const tl = v.tl, gt = v.gt;
  const big = h > 260;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  const cx = x + w / 2;
  // date + time
  c.fillStyle = `rgba(225,235,250,${0.8 * k})`;
  c.font = L.font(Math.max(5, 0.0031 * s), 600, L.FONT.body);
  if (big) L.trackedText(c, 'TUESDAY, OCTOBER 20', cx, y + 0.0205 * s, 0.0004 * s, 'center');
  c.fillStyle = `rgba(240,246,255,${0.95 * k})`;
  c.font = L.font(Math.max(8, 0.0185 * s), 600, L.FONT.display);
  c.fillText('11:47', cx, y + 0.0405 * s);
  // notification: slides down from under the clock on "lighting up"
  const tn = phraseAt(tl, 1, 1) - 0.02;
  const nk = opts.notif ?? (L.ease.outBack(L.prog(gt, tn, 0.55), 1.3));
  if (nk > 0 && big) {
    const ny = y + 0.049 * s - (1 - nk) * 0.012 * s, nx = x + 0.0035 * s, nw = w - 0.007 * s, nh = 0.0145 * s;
    const na = k * L.clamp(L.prog(gt, tn, 0.25));
    c.globalAlpha = na;
    c.fillStyle = 'rgba(14,22,40,0.62)';
    L.roundRect(c, nx, ny, nw, nh, 0.0042 * s); c.fill();
    c.strokeStyle = 'rgba(160,200,255,0.18)';
    c.lineWidth = Math.max(0.5, 0.00025 * s);
    c.stroke();
    // app tile: an accent rounded square with an envelope glyph
    const ix = nx + 0.0026 * s, iy = ny + 0.0029 * s, iw = 0.0088 * s;
    const ig = c.createLinearGradient(ix, iy, ix, iy + iw);
    ig.addColorStop(0, 'rgb(100,185,255)'); ig.addColorStop(1, 'rgb(40,120,235)');
    c.fillStyle = ig;
    L.roundRect(c, ix, iy, iw, iw, 0.0022 * s); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = Math.max(0.6, 0.0004 * s);
    const ex0 = ix + iw * 0.22, ey0 = iy + iw * 0.3, ew = iw * 0.56, eh = iw * 0.4;
    c.strokeRect(ex0, ey0, ew, eh);
    c.beginPath(); c.moveTo(ex0, ey0); c.lineTo(ex0 + ew / 2, ey0 + eh * 0.58); c.lineTo(ex0 + ew, ey0); c.stroke();
    // two text lines
    c.textAlign = 'left';
    c.fillStyle = 'rgba(240,246,255,0.96)';
    c.font = L.font(Math.max(5, 0.0026 * s), 700, L.FONT.body);
    c.fillText('New message', ix + iw + 0.0024 * s, ny + 0.0061 * s);
    c.fillStyle = 'rgba(200,214,235,0.85)';
    c.font = L.font(Math.max(5, 0.0025 * s), 500, L.FONT.body);
    c.fillText('Are you still up?', ix + iw + 0.0024 * s, ny + 0.0108 * s);
    c.textAlign = 'right';
    c.fillStyle = 'rgba(180,195,220,0.7)';
    c.font = L.font(Math.max(4, 0.0021 * s), 500, L.FONT.body);
    c.fillText('now', nx + nw - 0.0026 * s, ny + 0.0061 * s);
    c.globalAlpha = 1;
  }
  // bottom: torch + camera buttons, home bar
  if (big) {
    c.globalAlpha = k;
    for (const sx of [x + 0.0105 * s, x + w - 0.0105 * s]) {
      c.fillStyle = 'rgba(10,18,34,0.45)';
      c.beginPath(); c.arc(sx, y + h - 0.0145 * s, Math.max(0, 0.0052 * s), 0, TAU); c.fill();
      c.fillStyle = 'rgba(230,240,255,0.8)';
      c.beginPath(); c.arc(sx, y + h - 0.0145 * s, Math.max(0, 0.0011 * s), 0, TAU); c.fill();
    }
  }
  c.globalAlpha = k;
  c.fillStyle = 'rgba(240,246,255,0.85)';
  L.roundRect(c, cx - 0.0068 * s, y + h - 0.0034 * s, 0.0136 * s, Math.max(1, 0.0007 * s), 0.0004 * s); c.fill();
  c.restore();
}

/** Beats 2-4: a clean search page; the query types itself on "In that same second". */
function searchContent(c, R, v, k) {
  const { x, y, w, h, s } = R;
  if (k <= 0.01 || h < 40) return;
  const tl = v.tl, gt = v.gt;
  const t0 = phraseAt(tl, 2, 0);
  c.save();
  c.globalAlpha = k;
  // darker page over the wallpaper
  c.fillStyle = 'rgba(6,12,26,0.78)';
  c.fillRect(x, y, w, h);
  const cx = x + w / 2, by = y + h * 0.36;
  // a soft glow behind the bar
  L.lightBlob(c, cx, by, w * 0.7, ACCENT, 0.25 * k);
  // the search bar (generic pill)
  const bw = w * 0.86, bh = Math.max(4, 0.0085 * s);
  c.fillStyle = 'rgba(235,242,252,0.96)';
  L.roundRect(c, cx - bw / 2, by - bh / 2, bw, bh, bh / 2); c.fill();
  // magnifier glyph
  const mx = cx - bw / 2 + bh * 0.62, mr = bh * 0.2;
  c.strokeStyle = 'rgba(40,70,120,0.9)';
  c.lineWidth = Math.max(0.6, bh * 0.08);
  c.beginPath(); c.arc(mx, by - mr * 0.2, Math.max(0, mr), 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(mx + mr * 0.7, by + mr * 0.5); c.lineTo(mx + mr * 1.5, by + mr * 1.3); c.stroke();
  // typed query + caret
  if (h > 110) {
    const n = Math.floor(QUERY.length * L.prog(gt, t0 + 0.15, 1.1));
    c.fillStyle = 'rgba(20,30,50,0.95)';
    c.font = L.font(Math.max(4, bh * 0.4), 500, L.FONT.body);
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    const tx = mx + mr * 2.4;
    const str = QUERY.slice(0, n);
    c.fillText(str, tx, by + bh * 0.03);
    if (Math.floor(gt * 2.4) % 2 === 0 || n < QUERY.length) {
      const tw = c.measureText(str).width;
      c.fillStyle = L.rgba(ACCENT);
      c.fillRect(tx + tw + 1, by - bh * 0.24, Math.max(1, bh * 0.05), bh * 0.48);
    }
  }
  // results: faint skeleton rows appearing under the bar once the stream starts
  const rk = L.ease.outCubic(L.prog(gt, phraseAt(tl, 2, 1) - 0.2, 0.8));
  for (let i = 0; i < 5; i++) {
    const a = rk * L.clamp(rk * 5 - i);
    if (a <= 0) continue;
    const ry = by + bh * 1.3 + i * bh * 1.25;
    c.fillStyle = `rgba(160,200,255,${0.35 * a})`;
    L.roundRect(c, cx - bw / 2, ry, bw * (0.55 + 0.1 * (i % 3)), bh * 0.22, bh * 0.1); c.fill();
    c.fillStyle = `rgba(200,215,235,${0.16 * a})`;
    L.roundRect(c, cx - bw / 2, ry + bh * 0.42, bw * (0.85 - 0.08 * (i % 2)), bh * 0.16, bh * 0.08); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ the phone
/**
 * Draw the phone (screen px, at the world origin). opts: {content: 'auto' | 'none' | 'lock' | 'search', light}
 * 'none' leaves just the lit wallpaper (for scenes drawing their own UI on top via screenRect).
 */
export function drawPhone(c, v, opts = {}) {
  const s = 1 / v.cam.mpp, cx = v.wx(0), cy = v.wy(0);
  const pw = PHONE.w * s, phh = PHONE.h * s, pr = PHONE.r * s;
  const x0 = cx - pw / 2, y0 = cy - phh / 2;
  const light = opts.light ?? phoneLight(v);
  const gt = v.gt, tl = v.tl;
  c.save();
  // contact shadow on the wood (light from the room's window, upper right)
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.75)';
  c.shadowBlur = Math.min(80, 0.007 * s);
  c.shadowOffsetX = -0.0025 * s;
  c.shadowOffsetY = 0.0035 * s;
  c.fillStyle = '#07080a';
  L.roundRect(c, x0, y0, pw, phh, pr); c.fill();
  c.restore();
  // frame band: brushed titanium, lit from the upper left, catching the screen's own glow
  const fg = c.createLinearGradient(x0, y0, x0 + pw, y0 + phh);
  fg.addColorStop(0, 'rgb(118,124,134)');
  fg.addColorStop(0.3, 'rgb(58,62,70)');
  fg.addColorStop(0.7, 'rgb(40,43,50)');
  fg.addColorStop(1, 'rgb(86,92,104)');
  c.fillStyle = fg;
  L.roundRect(c, x0, y0, pw, phh, pr); c.fill();
  // side buttons (seen from above: slim nubs on the edges)
  if (pw > 40) {
    c.fillStyle = 'rgb(70,75,84)';
    const nub = Math.max(1, 0.0007 * s);
    L.roundRect(c, x0 - nub, y0 + 0.028 * s, nub * 1.5, 0.006 * s, nub * 0.6); c.fill();
    L.roundRect(c, x0 - nub, y0 + 0.038 * s, nub * 1.5, 0.011 * s, nub * 0.6); c.fill();
    L.roundRect(c, x0 - nub, y0 + 0.052 * s, nub * 1.5, 0.011 * s, nub * 0.6); c.fill();
    L.roundRect(c, x0 + pw - nub * 0.5, y0 + 0.043 * s, nub * 1.5, 0.017 * s, nub * 0.6); c.fill();
  }
  // black glass
  const gi = FRAME * s;
  c.fillStyle = '#030406';
  L.roundRect(c, x0 + gi, y0 + gi, pw - 2 * gi, phh - 2 * gi, pr - gi); c.fill();
  // screen
  const R = { x: cx - SW / 2 * s, y: cy - SH / 2 * s, w: SW * s, h: SH * s, r: SR * s, s };
  c.save();
  L.roundRect(c, R.x, R.y, R.w, R.h, R.r);
  c.clip();
  if (light > 0.001) {
    wallpaper(c, R, gt, light);
    if (R.h > 24) {
      const mode = opts.content ?? 'auto';
      const b2 = tl.scenes[2].start, b17 = tl.scenes[17].start;
      let lockK = 1, searchK = 0;
      if (mode === 'auto') {
        searchK = L.ease.inOutCubic(L.prog(gt, b2 + 0.12, 0.45)) * (gt < b17 - 1 ? 1 : 0);
        lockK = gt >= b17 - 1 ? 0.55 : 1 - searchK;
      } else if (mode === 'none') { lockK = 0; } else if (mode === 'search') { lockK = 0; searchK = 1; }
      // lock content slides up as the search page takes over
      c.save();
      c.translate(0, -searchK * 0.02 * s);
      lockContent(c, R, v, lockK * light, { notif: gt >= b17 - 1 ? 0 : undefined });
      c.restore();
      searchContent(c, R, v, searchK * light);
    }
  }
  // glass reflection: a faint diagonal sheen from the window, drifting with the camera
  c.globalCompositeOperation = 'lighter';
  const sh = 0.5 + 0.5 * Math.sin(gt * 0.35 + 0.8);
  const gx = R.x + R.w * (0.1 + 0.25 * sh);
  const sg = c.createLinearGradient(gx, R.y, gx + R.w * 0.8, R.y + R.w * 0.9);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.42, 'rgba(200,220,255,0.055)');
  sg.addColorStop(0.5, 'rgba(200,220,255,0.015)');
  sg.addColorStop(0.6, 'rgba(200,220,255,0.04)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sg;
  c.fillRect(R.x, R.y, R.w, R.h);
  c.restore();
  // camera pill (sits on top of the screen content)
  if (pw > 26) {
    const iw = 0.0124 * s, ih = Math.max(1.2, 0.0036 * s), iy = R.y + 0.0033 * s;
    c.fillStyle = '#010102';
    L.roundRect(c, cx - iw / 2, iy, iw, ih, ih / 2); c.fill();
    if (pw > 120) {
      c.fillStyle = 'rgba(40,60,110,0.8)';
      c.beginPath(); c.arc(cx + iw * 0.3, iy + ih / 2, Math.max(0, ih * 0.22), 0, TAU); c.fill();
    }
  }
  // edge highlights: a crisp specular line along the lit top-left edge of the frame, a cool rim from the screen
  if (pw > 12) {
    c.lineWidth = Math.max(0.6, 0.00045 * s);
    const eg = c.createLinearGradient(x0, y0, x0 + pw * 0.9, y0 + phh * 0.5);
    eg.addColorStop(0, 'rgba(235,240,250,0.75)');
    eg.addColorStop(1, 'rgba(235,240,250,0)');
    c.strokeStyle = eg;
    L.roundRect(c, x0 + c.lineWidth / 2, y0 + c.lineWidth / 2, pw - c.lineWidth, phh - c.lineWidth, pr); c.stroke();
    c.strokeStyle = `rgba(150,200,255,${0.25 * light})`;
    L.roundRect(c, x0 + gi, y0 + gi, pw - 2 * gi, phh - 2 * gi, pr - gi); c.stroke();
  }
  c.restore();
}

/** The cool light the screen casts on the nightstand and floor (additive, under the phone). */
function drawLightPool(c, v, light) {
  if (light <= 0.005) return;
  const x = v.wx(0), y = v.wy(0);
  const flick = 1 + 0.03 * L.noise1(v.gt * 1.7, 5);
  L.lightBlob(c, x, y, v.ws(0.42), [50, 110, 230], 0.2 * light * flick);
  L.lightBlob(c, x, y, v.ws(0.17), [90, 150, 245], 0.24 * light * flick);
  L.lightBlob(c, x, y, v.ws(0.095), SCREEN, 0.16 * light);
}

/** Far away: the phone is one lit screen among millions, a small cool point with a halo. */
function drawPoint(c, v, light, size) {
  const k = L.clamp(L.invLerp(0.8, 2.5, size)) * L.clamp(L.invLerp(30, 10, size));
  const far = L.clamp(L.invLerp(0.012, 0.05, v.cam.mpp));   // our phone keeps a gentle halo over the block
  const x = v.wx(0), y = v.wy(0);
  const a = light * Math.max(k, 0.8 * far * (1 - L.clamp(L.invLerp(0.4, 2.5, v.cam.mpp))));
  if (a <= 0.01) return;
  c.save();
  L.lightBlob(c, x, y, 26, [120, 185, 255], 0.55 * a);
  L.lightBlob(c, x, y, 9, [220, 238, 255], 0.9 * a);
  c.fillStyle = `rgba(235,244,255,${a})`;
  c.fillRect(x - 1.2, y - 1.8, 2.4, 3.6);
  c.restore();
}

// ------------------------------------------------------------------ the one-second ring (beat 1)
const RING = 0.0895;                  // m: hugs the phone's corners
export const ringT = (tl) => phraseAt(tl, 1, 1) + 0.05;
function drawRing(c, v) {
  const t0 = ringT(v.tl);
  const gt = v.gt;
  const inK = L.ease.outCubic(L.prog(gt, t0 - 0.5, 0.5));
  const outK = 1 - L.ease.inCubic(L.prog(gt, v.tl.scenes[2].start + 0.1, 0.5));
  const k = inK * outK;
  if (k <= 0.005) return;
  const x = v.wx(0), y = v.wy(0), r = v.ws(RING);
  if (r < 20 || r > 3000) return;
  const p = L.clamp((gt - t0) / 1.0);                       // exactly one second
  const a0 = -Math.PI / 2;
  c.save();
  // track + 60 fine ticks
  c.strokeStyle = `rgba(150,190,240,${0.16 * k})`;
  c.lineWidth = 1.2;
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.stroke();
  c.beginPath();
  for (let i = 0; i < 60; i++) {
    const a = a0 + (i / 60) * TAU, l = i % 5 === 0 ? 12 : 6;
    c.moveTo(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6));
    c.lineTo(x + Math.cos(a) * (r + 6 + l), y + Math.sin(a) * (r + 6 + l));
  }
  c.strokeStyle = `rgba(170,200,240,${0.22 * k})`;
  c.lineWidth = 1.5;
  c.stroke();
  if (p > 0) {
    // the sweep: a bright accent arc with a soft trailing glow and a hot head
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    c.strokeStyle = L.rgba(ACCENT, 0.3 * k);
    c.lineWidth = 9;
    c.beginPath(); c.arc(x, y, Math.max(0, r), a0, a0 + p * TAU); c.stroke();
    c.strokeStyle = L.rgba([170, 215, 255], 0.95 * k);
    c.lineWidth = 2.6;
    c.beginPath(); c.arc(x, y, Math.max(0, r), a0, a0 + p * TAU); c.stroke();
    const ha = a0 + p * TAU, hx = x + Math.cos(ha) * r, hy = y + Math.sin(ha) * r;
    const hk = k * (1 - L.prog(gt, t0 + 1.0, 0.35));
    L.lightBlob(c, hx, hy, 36, ACCENT, 0.7 * hk);
    L.lightBlob(c, hx, hy, 10, [235, 245, 255], 0.9 * hk);
    // completion: one soft pulse ring outward
    const q = L.prog(gt, t0 + 1.0, 0.9);
    if (q > 0 && q < 1) {
      const e = L.ease.outCubic(q);
      c.strokeStyle = L.rgba(ACCENT, 0.5 * (1 - e) * k);
      c.lineWidth = 2 + 6 * (1 - e);
      c.beginPath(); c.arc(x, y, Math.max(0, r * (1 + 0.35 * e)), 0, TAU); c.stroke();
    }
  }
  c.restore();
}

export default {
  beat: 1,
  chapter: { num: '01', title: 'One phone', sub: 'Lighting up in the dark' },
  captions: true,
  layer: 1,
  cues(d) {
    // times relative to this beat; the ring starts on "lighting up"
    return [
      { t: 0.15, name: 'swish', gain: 0.14, pitch: 0.8 },
      { t: 2.12, name: 'ping', gain: 0.3, pitch: 1.25 },          // notification + screen flares
      { t: 2.17, name: 'shimmer', gain: 0.16, pitch: 1.3 },
      { t: 3.17, name: 'tick', gain: 0.3, pitch: 1.4 },           // the second completes
      { t: 3.2, name: 'bloom', gain: 0.16, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    const size = v.ws(PHONE.h);
    if (v.cam.mpp > 8) return;
    const light = phoneLight(v);
    if (size >= 2 && size < 5000) drawLightPool(ctx, v, light * L.clamp(L.invLerp(4, 30, size)));
    if (size >= 9) drawPhone(ctx, v, { light });
    else if (size >= 2.5) {
      // a lit slab, a few px wide
      const x = v.wx(0), y = v.wy(0), w = v.ws(PHONE.w);
      ctx.fillStyle = `rgba(150,195,255,${0.4 + 0.6 * light})`;
      ctx.fillRect(x - w / 2, y - size / 2, w, size);
    }
    drawPoint(ctx, v, light, size);
    drawRing(ctx, v);
  },
  drawOverlay(ctx, v) {
    // a tiny stopwatch readout above the ring: 00:00.00 -> 00:01.00
    const t0 = ringT(v.tl);
    const k = v.k * L.ease.outCubic(L.prog(v.gt, t0 - 0.4, 0.4));
    if (k <= 0) return;
    const r = v.ws(RING), x = v.wx(0), y = v.wy(0) - r - 62;
    const p = L.clamp((Math.round(v.gt * 30) / 30 - t0) / 1.0);   // 18c: frame-stable digits (motion-blur sub-frames share the frame's value)
    const cs = Math.floor(p * 100 + 1e-6);
    const str = `00:0${p >= 1 ? 1 : 0}.${p >= 1 ? '00' : String(cs).padStart(2, '0')}`;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 10;
    ctx.font = L.font(40, 700, L.FONT.din);
    ctx.fillStyle = p >= 1 ? L.rgba([170, 215, 255]) : 'rgba(235,242,252,0.92)';
    L.trackedText(ctx, str, x, y, 2, 'center');
    ctx.font = L.font(17, 600, L.FONT.body);
    ctx.fillStyle = 'rgba(190,205,225,0.8)';
    L.trackedText(ctx, 'ONE SECOND', x, y + 26, 4, 'center');
    ctx.restore();
  },
};
