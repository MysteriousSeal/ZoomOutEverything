// Beat 1 — "The answer is falling from space, | and the strangest part involves Einstein."
// The pull-back from the phone: a person in profile (facing +x, east) on a night street in Midtown, holding the phone
// at PHONE, rim-lit by its screen (cool) and by the lit shop window behind (warm). Shop fronts and towers along
// x ≈ −460 … +760 m in two rows (near facades, far hazy towers), street lamps, wet-pavement reflections, steam from a
// manhole, blinking aviation lights. Faint green signal threads fall from the four hero satellites onto the phone
// on "falling from space"; on "Einstein" their pulses turn clock-gold for a moment (a light tease).
// At the hook scale (beat 0) the street is out of focus: a dark plate with soft bokeh sits behind the hands + phone.
//
// PERSISTENT: the street and the person draw whenever on screen (beat 9 at 0.6 m/px, beat 17 at 18 m/px, beat 18).
// SHARED (import, do not copy):
//   drawSkyline(ctx, v, x0, x1, { seed, far })   the same procedural Midtown blocks for any x range (s17 extends the
//                                                city beyond STREET.x0 … STREET.x1 with it; use a different seed)
//   STREET {x0, x1}                               the range this scene draws
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, CLOCK, HERO, PHONE } from '../env.js';
import { GRIP, gripInFront } from './s00-hook.js';

const { W, H } = L;
const TAU = Math.PI * 2;
export const STREET = { x0: -460, x1: 760 };

// ------------------------------------------------------------------ the procedural city
const WARM = [255, 190, 116], COOL = [168, 190, 236], DIM = [200, 146, 96];
const SIGNS = ['DELI', 'PHARMACY', 'PIZZA', 'BAR', 'NEWS', 'HOTEL', 'COFFEE', 'THEATRE', 'BAGELS', 'DINER', 'TICKETS', 'NOODLES'];
const hash = (a, b, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };

function makeRow(x0, x1, seed, far) {
  const r = L.rng(seed), out = [];
  let x = x0;
  while (x < x1) {
    const w = far ? 26 + r() * 50 : 12 + r() * 30;
    const u = r();
    const centre = Math.exp(-(((x - 120) / 420) ** 2));           // taller around Times Square / 6th Ave
    let h = u < 0.28 ? 14 + r() * 18 : u < 0.68 ? 32 + r() * 60 : u < 0.93 ? 95 + r() * 110 : 200 + r() * 140;
    h *= L.lerp(0.75, 1.15, centre);
    if (far) h = 70 + r() * 260 * L.lerp(0.6, 1, centre);
    const tone = r();
    out.push({
      x0: x, w, h, far,
      base: 4.4 + r() * 1.0,
      floor: 3.3 + r() * 0.6,
      col: 2.3 + r() * 1.1,
      ww: 0.42 + r() * 0.22, wh: 0.48 + r() * 0.18,
      lit: far ? 0.12 + r() * 0.16 : 0.16 + r() * 0.34,
      warm: r(),
      set: h > 90 ? 0.12 + r() * 0.14 : 0,                     // setback (fraction of width each side) above 40 % height
      spire: h > 170 && r() > 0.45 ? 0.08 + r() * 0.12 : 0,
      tone: far ? [34 + tone * 8, 41 + tone * 9, 64 + tone * 12] : [17 + tone * 9, 21 + tone * 10, 32 + tone * 12],
      sign: r(), seed: r() * 1000,
    });
    x += w + (far ? r() * 10 : r() < 0.15 ? 6 + r() * 8 : 0);     // the odd side street
  }
  return out;
}
const rowCache = new Map();
function row(x0, x1, seed, far) {
  const k = `${x0}|${x1}|${seed}|${far}`;
  if (!rowCache.has(k)) rowCache.set(k, makeRow(x0, x1, seed, far));
  return rowCache.get(k);
}
// the home row: the building behind the person is designed (hero storefront at x −7 … 7)
const HOME_ROW = (() => {
  const left = makeRow(STREET.x0, -7, 4101, false), right = makeRow(7, STREET.x1, 4102, false);
  const hero = { x0: -7, w: 14, h: 64, far: false, base: 4.8, floor: 3.6, col: 2.8, ww: 0.55, wh: 0.56, lit: 0.36, warm: 0.3, set: 0, spire: 0, tone: [20, 24, 36], sign: 0.5, seed: 77, hero: true };
  left[left.length - 1].w = Math.max(4, -7 - left[left.length - 1].x0);
  return [...left, hero, ...right];
})();
const FAR_ROW = makeRow(STREET.x0 - 40, STREET.x1 + 40, 4103, true);

/** One building: body, windows (LOD), storefront, rooftop. Everything in screen px from world metres. */
function drawBuilding(c, v, b, gt) {
  const mpp = v.cam.mpp;
  const sx0 = v.wx(b.x0), sx1 = v.wx(b.x0 + b.w);
  if (sx1 < -4 || sx0 > W + 4) return;
  const gy = v.wy(0), top = v.wy(-b.h);
  if (gy < -4 || top > H + 4) return;
  const wpx = sx1 - sx0;
  // massing: base block + optional setback tower
  const setH = b.set ? b.h * 0.4 : b.h;
  c.fillStyle = L.rgba(b.tone);
  c.fillRect(sx0, v.wy(-setH), wpx, gy - v.wy(-setH) + 0.5);
  if (b.set) {
    const ix = b.w * b.set;
    c.fillRect(v.wx(b.x0 + ix), top, (b.w - 2 * ix) / mpp, v.wy(-setH) - top + 0.5);
  }
  if (wpx < 0.6) return;
  // sky-lit edge + parapet line
  if (wpx > 3) {
    c.fillStyle = b.far ? 'rgba(120,140,190,0.18)' : 'rgba(120,140,190,0.22)';
    const ix = b.set ? b.w * b.set : 0;
    c.fillRect(v.wx(b.x0 + ix), top, (b.w - 2 * ix) / mpp, Math.max(1, 0.4 / mpp));
    c.fillRect(sx0, top, Math.max(1, 0.3 / mpp), gy - top);
  }
  // street uplight on the lower facade (near row)
  if (!b.far && wpx > 2) {
    const uh = Math.min(16 / mpp, gy - top);
    const g = c.createLinearGradient(0, gy, 0, gy - uh);
    g.addColorStop(0, 'rgba(255,170,100,0.14)'); g.addColorStop(1, 'rgba(255,170,100,0)');
    c.fillStyle = g; c.fillRect(sx0, gy - uh, wpx, uh);
  }
  // windows
  const fpx = b.floor / mpp;
  const y0 = b.base;
  const nf = Math.floor((b.h - y0 - 2) / b.floor);
  // window LOD: individual windows only from ~3 px per floor (below that they alias into moiré columns while the
  // camera climbs); in between they cross-fade with a per-building averaged warm fill
  const winK = L.clamp(L.invLerp(3, 5.5, fpx));
  if (winK < 1 && wpx > 1 && nf > 0) {
    c.fillStyle = L.rgba(WARM, (b.far ? 0.05 : 0.09) * b.lit * 2 * (1 - winK));
    c.fillRect(sx0, top, wpx, gy - top);
  }
  if (winK > 0 && nf > 0) {
    c.save(); c.globalAlpha *= winK;
    const fmin = Math.max(0, Math.floor((-v.cam.y - (H - v.cam.anchor * H) * mpp - y0) / b.floor) - 1);
    const fmax = Math.min(nf - 1, Math.ceil((-v.cam.y + v.cam.anchor * H * mpp - y0) / b.floor) + 1);
    const dots = fpx < 2.6;
    for (let f = fmin; f <= fmax; f++) {
      const fy = y0 + f * b.floor;
      const inSet = b.set && fy > b.h * 0.4;
      const ax0 = b.x0 + (inSet ? b.w * b.set : 0) + 0.9, ax1 = b.x0 + b.w - (inSet ? b.w * b.set : 0) - 0.9;
      const nc = Math.max(1, Math.floor((ax1 - ax0) / b.col));
      const cw = (ax1 - ax0) / nc;
      const wy = v.wy(-(fy + b.floor * (0.5 + b.wh / 2) - 0.2)), whp = Math.max(1, b.floor * b.wh / mpp);
      if (wy > H + 2 || wy + whp < -2) continue;
      for (let k = 0; k < nc; k++) {
        const hsh = hash(b.seed, f, k);
        const lit = hsh < b.lit + 0.06 * Math.sin(gt * 0.15 + b.seed + f);   // a few lights change slowly
        if (!lit && (dots || fpx < 7 || b.far)) continue;
        const wx = v.wx(ax0 + k * cw + cw * (1 - b.ww) / 2);
        if (wx > W + 2 || wx < -8) continue;
        const wwp = Math.max(1, cw * b.ww / mpp);
        const tint = hash(b.seed, k, f + 7) < b.warm ? COOL : hash(b.seed, f, k + 3) < 0.25 ? DIM : WARM;
        if (whp > 22 && !b.far) { nearWindow(c, wx, wy, wwp, whp, lit, tint, hash(b.seed, f, k + 11)); continue; }
        if (lit) c.fillStyle = L.rgba(tint, b.far ? 0.42 : 0.5 + 0.4 * hash(f, k, b.seed));
        else c.fillStyle = 'rgba(40,48,70,0.55)';
        if (dots) c.fillRect(wx, wy, 1, 1); else c.fillRect(wx, wy, wwp, whp);
      }
    }
    c.restore();
  }
  // storefront band
  if (!b.far) drawStorefront(c, v, b, gt);
  // rooftop: antenna + blinking aviation light
  if (b.spire && wpx > 1.2) {
    const sh = b.h * b.spire, ax = b.x0 + b.w / 2;
    c.strokeStyle = L.rgba(b.tone.map((x) => x + 14));
    c.lineWidth = Math.max(1, 1.4 / mpp);
    c.beginPath(); c.moveTo(v.wx(ax), top); c.lineTo(v.wx(ax), v.wy(-b.h - sh)); c.stroke();
  }
  if (b.h > 120 && wpx > 1.2) {
    const blink = Math.pow(0.5 + 0.5 * Math.sin(gt * 2.4 + b.seed), 6);
    const tx = v.wx(b.x0 + b.w / 2), ty = v.wy(-b.h - b.h * b.spire);
    L.lightBlob(c, tx, ty, (5 + 12 * blink) * L.clamp(2.5 / mpp, 0.22, 1), [255, 70, 60], 0.15 + 0.55 * blink);
  }
}

/** A window close up: a lamp-lit room (warm gradient, blinds or curtains) or dark glass with a sky reflection. */
function nearWindow(c, x, y, w, h, lit, tint, r) {
  if (lit) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, L.rgba(L.mix(tint, [30, 22, 20], 0.55)));
    g.addColorStop(1, L.rgba(L.mix(tint, [30, 22, 20], 0.12)));
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    if (r < 0.4) {                                  // blinds
      c.fillStyle = 'rgba(40,28,20,0.28)';
      const n = Math.floor(h / 7);
      for (let i = 0; i < n; i++) c.fillRect(x, y + (i + 0.5) * (h / n), w, Math.max(1, h / n * 0.3));
    } else if (r < 0.7) {                           // curtains
      c.fillStyle = 'rgba(50,30,24,0.55)';
      c.fillRect(x, y, w * 0.22, h); c.fillRect(x + w * 0.78, y, w * 0.22, h);
    }
  } else {
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(46,56,84,0.9)'); g.addColorStop(1, 'rgba(16,20,32,0.9)');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
  }
  c.strokeStyle = 'rgba(8,10,16,0.9)';
  c.lineWidth = Math.max(1, w * 0.06);
  c.strokeRect(x, y, w, h);
  c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.stroke();
}

/** A shop interior seen through the glass, close up: back-lit rear wall, depth-graded shelving, a counter and a few
 *  silhouetted objects (pendant lamps, a plant, a stool, a figure) — never a uniform grid of boxes. */
function shopInterior(c, v, b, i, x0, x1, gx0, gx1, gtop, gbot, glass) {
  const mpp = v.cam.mpp, gw = gx1 - gx0, gh = gbot - gtop;
  const h = (k) => hash(b.seed, i, k);
  const kind = h(31);                                   // 0..0.35 shelves (shop), 0.35..0.7 cafe/bar, else showroom
  // soft back-light falloff: a bright pool high on the back wall, darker toward the floor and the sides
  const bl = c.createRadialGradient(L.lerp(gx0, gx1, 0.3 + 0.4 * h(32)), gtop + gh * 0.3, 0, L.lerp(gx0, gx1, 0.5), gtop + gh * 0.35, gw * 0.75);
  bl.addColorStop(0, L.rgba(L.mix(glass, [255, 255, 255], 0.35), 0.35)); bl.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = bl; c.fillRect(gx0, gtop, gw, gh);
  const floor = c.createLinearGradient(0, gbot - gh * 0.3, 0, gbot);
  floor.addColorStop(0, 'rgba(30,18,12,0)'); floor.addColorStop(1, 'rgba(30,18,12,0.45)');
  c.fillStyle = floor; c.fillRect(gx0, gbot - gh * 0.3, gw, gh * 0.3);
  const fy = gbot;                                           // the floor line inside (≈ 0.45 m)
  const W1 = x1 - x0;
  // rear shelving along the back wall: faint, small, low contrast (far)
  const backTop = v.wy(-3.1), backBot = v.wy(-1.0);
  const nrow = 4;
  for (let r = 0; r < nrow; r++) {
    const yy = L.lerp(backTop, backBot, r / (nrow - 1));
    c.fillStyle = L.rgba(L.mix(glass, [60, 40, 30], 0.55), 0.35);
    c.fillRect(gx0, yy, gw, Math.max(1, 0.025 / mpp));
    if (kind < 0.7) {
      const n = Math.floor(W1 / 0.22);
      for (let k = 0; k < n; k++) {
        const pr = hash(b.seed + r, i, k);
        if (pr < 0.35) continue;
        const ph = (0.12 + 0.18 * pr) / mpp, pw = (0.08 + 0.06 * pr) / mpp;
        c.fillStyle = `rgba(${(70 + pr * 60) | 0},${(46 + pr * 30) | 0},${(34 + pr * 20) | 0},${0.22 + 0.12 * pr})`;
        c.fillRect(v.wx(x0 + (k + 0.2) * W1 / n), yy - ph, pw, ph);
      }
    }
  }
  const sil = 'rgba(28,17,12,0.82)', sil2 = 'rgba(40,25,18,0.6)';
  // mid ground: a gondola shelf (shop), or a counter with a coffee machine / bottles (cafe), or a display plinth
  if (kind < 0.35) {
    const ux0 = L.lerp(x0, x1, 0.18 + 0.2 * h(33)), uw = W1 * 0.35;
    c.fillStyle = sil2;
    c.fillRect(v.wx(ux0), v.wy(-1.6), uw / mpp, fy - v.wy(-1.6));
    for (let r = 0; r < 3; r++) {
      const yy = v.wy(-1.55 + r * 0.45);
      c.fillStyle = 'rgba(255,220,180,0.18)'; c.fillRect(v.wx(ux0), yy, uw / mpp, Math.max(1, 0.02 / mpp));
    }
  } else if (kind < 0.7) {
    const cx0 = L.lerp(x0, x1, 0.1), cx1 = L.lerp(x0, x1, 0.62);
    c.fillStyle = sil;
    c.fillRect(v.wx(cx0), v.wy(-1.05), (cx1 - cx0) / mpp, fy - v.wy(-1.05));
    c.fillStyle = 'rgba(255,214,170,0.22)'; c.fillRect(v.wx(cx0), v.wy(-1.05), (cx1 - cx0) / mpp, Math.max(1, 0.03 / mpp));
    // espresso machine + cups / bottles on the counter
    c.fillStyle = sil;
    L.roundRect(c, v.wx(cx0 + 0.25), v.wy(-1.5), 0.55 / mpp, 0.45 / mpp, 0.05 / mpp); c.fill();
    for (let k = 0; k < 4; k++) c.fillRect(v.wx(cx0 + 1.0 + k * 0.17), v.wy(-1.05 - 0.12 - 0.1 * hash(k, i, b.seed)), 0.07 / mpp, (0.12 + 0.1 * hash(k, i, b.seed)) / mpp);
    // stools in front
    for (let k = 0; k < 2; k++) {
      const sx = v.wx(L.lerp(cx0, cx1, 0.3 + 0.35 * k));
      c.fillRect(sx - 0.17 / mpp, v.wy(-0.78), 0.34 / mpp, Math.max(1, 0.05 / mpp));
      c.fillRect(sx - 0.02 / mpp, v.wy(-0.78), 0.04 / mpp, fy - v.wy(-0.78));
    }
  } else {
    const px0 = L.lerp(x0, x1, 0.25 + 0.2 * h(34));
    c.fillStyle = sil2;
    c.fillRect(v.wx(px0), v.wy(-0.95), 1.1 / mpp, fy - v.wy(-0.95));
    L.lightBlob(c, v.wx(px0 + 0.55), v.wy(-1.3), 0.5 / mpp, [255, 236, 210], 0.25);
  }
  // pendant lamps (warm pools), hanging from the ceiling
  const np = Math.max(1, Math.round(W1 / 2.2));
  for (let k = 0; k < np; k++) {
    if (hash(b.seed, i, 40 + k) < 0.35) continue;
    if (b.hero && Math.abs(x0 + (k + 0.5) * W1 / np - 1.35) < 1.3) continue;      // keep the OPEN sign clear
    const lx = v.wx(x0 + (k + 0.5) * W1 / np), ly = v.wy(-2.75 + 0.2 * hash(k, b.seed, i));
    c.strokeStyle = 'rgba(30,20,14,0.7)'; c.lineWidth = Math.max(1, 0.012 / mpp);
    c.beginPath(); c.moveTo(lx, gtop); c.lineTo(lx, ly); c.stroke();
    c.fillStyle = 'rgba(30,20,14,0.9)';
    c.beginPath(); c.moveTo(lx - 0.06 / mpp, ly); c.lineTo(lx + 0.06 / mpp, ly); c.lineTo(lx + 0.15 / mpp, ly + 0.14 / mpp); c.lineTo(lx - 0.15 / mpp, ly + 0.14 / mpp); c.closePath(); c.fill();
    L.lightBlob(c, lx, ly + 0.2 / mpp, 0.7 / mpp, L.mix(glass, [255, 255, 255], 0.4), 0.28);
  }
  // foreground silhouettes close to the glass: a plant or a person browsing (darkest = nearest)
  const fg = h(35);
  if (fg < 0.35) {
    const px = v.wx(L.lerp(x0, x1, 0.82)), py = v.wy(-0.5);
    c.fillStyle = 'rgba(20,14,10,0.92)';
    c.fillRect(px - 0.14 / mpp, py, 0.28 / mpp, fy - py);
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.38, rr = (0.32 + 0.12 * hash(k, i, b.seed)) / mpp;
      c.beginPath(); c.ellipse(px + Math.cos(a) * rr * 0.6, py + Math.sin(a) * rr * 0.75, rr * 0.42, rr * 0.16, a, 0, TAU); c.fill();
    }
  } else if (fg < 0.6) {
    const px = v.wx(L.lerp(x0, x1, 0.72)), base = fy;
    c.fillStyle = 'rgba(18,12,10,0.88)';
    c.beginPath(); c.ellipse(px, v.wy(-1.62), 0.11 / mpp, 0.13 / mpp, 0, 0, TAU); c.fill();
    L.roundRect(c, px - 0.2 / mpp, v.wy(-1.45), 0.4 / mpp, base - v.wy(-1.45), 0.12 / mpp); c.fill();
  }
}

/** A shop that is closed for the night: a dark recess behind a roller shutter, a dim night-light at the back. */
function closedFront(c, v, gx0, gx1, gtop, gbot, seed, near) {
  const mpp = v.cam.mpp, gw = gx1 - gx0, gh = gbot - gtop;
  const g = c.createLinearGradient(0, gtop, 0, gbot);
  g.addColorStop(0, 'rgb(14,16,24)'); g.addColorStop(1, 'rgb(22,24,34)');
  c.fillStyle = g; c.fillRect(gx0, gtop, gw, gh);
  if (!near) return;
  // a faint night-light deep inside
  L.lightBlob(c, L.lerp(gx0, gx1, 0.3 + 0.4 * hash(seed, 1, 2)), gtop + gh * 0.35, gw * 0.35, [120, 150, 210], 0.08);
  // roller shutter: slats with a soft top-down street-lamp gradient, pulled most of the way down
  const down = 0.62 + 0.3 * hash(seed, 3, 4);
  const sb = gtop + gh * down;
  const sg = c.createLinearGradient(0, gtop, 0, sb);
  sg.addColorStop(0, 'rgba(70,74,88,0.95)'); sg.addColorStop(1, 'rgba(40,43,54,0.95)');
  c.fillStyle = sg; c.fillRect(gx0, gtop, gw, sb - gtop);
  const step = Math.max(3, 0.09 / mpp);
  c.fillStyle = 'rgba(12,13,20,0.55)';
  for (let y = gtop + step; y < sb; y += step) c.fillRect(gx0, y, gw, Math.max(1, step * 0.22));
  c.fillStyle = 'rgba(160,170,190,0.18)';
  for (let y = gtop + step * 0.4; y < sb; y += step) c.fillRect(gx0, y, gw, Math.max(1, step * 0.12));
  // bottom rail + a little graffiti-free tag plate
  c.fillStyle = 'rgba(10,11,16,0.95)'; c.fillRect(gx0, sb - Math.max(2, 0.05 / mpp), gw, Math.max(2, 0.05 / mpp));
  c.fillStyle = 'rgba(200,190,170,0.18)'; c.fillRect(L.lerp(gx0, gx1, 0.45), sb - 0.25 / mpp, 0.25 / mpp, 0.08 / mpp);
}

function drawStorefront(c, v, b, gt) {
  const mpp = v.cam.mpp;
  const bpx = b.base / mpp;
  const sx0 = v.wx(b.x0), wpx = b.w / mpp, gy = v.wy(0);
  if (bpx < 0.7) {
    c.fillStyle = L.rgba(WARM, 0.5);
    c.fillRect(sx0, gy - 1, wpx, 1);
    return;
  }
  // shop windows: warm glass from 0.5 m to 3.6 m, split by piers; a sign band above
  const piers = b.hero ? 3 : Math.max(1, Math.round(b.w / 6));
  const pw = b.w / piers;
  for (let i = 0; i < piers; i++) {
    const on = b.hero || hash(b.seed, i, 5) > 0.18;
    const x0 = b.x0 + i * pw + 0.35, x1 = b.x0 + (i + 1) * pw - 0.35;
    const door = b.hero ? i === 2 : hash(b.seed, i, 9) > 0.7;
    const gx0 = v.wx(x0), gx1 = v.wx(x1), gtop = v.wy(-3.6), gbot = v.wy(-0.45);
    if (gx1 < -2 || gx0 > W + 2) continue;
    const gw = gx1 - gx0, gh = gbot - gtop;
    if (!on) { closedFront(c, v, gx0, gx1, gtop, gbot, b.seed + i, bpx > 40); continue; }
    const hue = b.hero ? [0.2, 0.3, 0.7][i] : hash(b.seed, i, 2);
    const glass = hue < 0.6 ? [255, 176, 104] : hue < 0.85 ? [255, 212, 166] : [176, 200, 240];
    const near = bpx > 40;
    const g = c.createLinearGradient(0, gtop, 0, gbot);
    g.addColorStop(0, L.rgba(L.mix(glass, [40, 26, 20], near ? 0.4 : 0.1)));
    g.addColorStop(0.2, L.rgba(L.mix(glass, [40, 26, 20], near ? 0.12 : 0.05)));
    g.addColorStop(1, L.rgba(L.mix(glass, [40, 24, 18], near ? 0.72 : 0.4)));
    c.fillStyle = g;
    c.fillRect(gx0, gtop, gw, gh);
    if (near) {
      c.save();
      c.beginPath(); c.rect(gx0, gtop, gw, gh); c.clip();
      shopInterior(c, v, b, i, x0, x1, gx0, gx1, gtop, gbot, glass);
      // ceiling light strip + pools of light
      c.fillStyle = L.rgba(L.mix(glass, [255, 255, 255], 0.6), 0.9);
      c.fillRect(gx0, gtop + 0.14 / mpp, gw, Math.max(1, 0.035 / mpp));
      for (let lx = x0 + 0.8; lx < x1; lx += 1.8) L.lightBlob(c, v.wx(lx), gtop + 0.2 / mpp, 1.2 / mpp, L.mix(glass, [255, 255, 255], 0.3), 0.32);
      // glass: a faint diagonal sheen
      const sg = c.createLinearGradient(gx0, gtop, gx0 + gw, gbot);
      sg.addColorStop(0.3, 'rgba(255,255,255,0)'); sg.addColorStop(0.42, 'rgba(255,255,255,0.07)'); sg.addColorStop(0.5, 'rgba(255,255,255,0)');
      c.fillStyle = sg; c.fillRect(gx0, gtop, gw, gh);
      c.restore();
      // frame + mullions
      c.fillStyle = 'rgba(12,14,22,0.96)';
      const mw = Math.max(1, 0.07 / mpp);
      c.fillRect(gx0, gtop, gw, mw); c.fillRect(gx0, gbot - mw, gw, mw); c.fillRect(gx0, gtop, mw, gh); c.fillRect(gx1 - mw, gtop, mw, gh);
      c.fillRect(gx0, v.wy(-2.95), gw, mw * 0.7);
      if (door) {
        const dx0 = L.lerp(gx0, gx1, 0.6), dx1 = L.lerp(gx0, gx1, 0.9);
        c.fillStyle = 'rgba(14,16,24,0.97)';
        c.fillRect(dx0, gtop, dx1 - dx0, v.wy(0) - gtop);
        const dg = c.createLinearGradient(0, gtop, 0, v.wy(-0.2));
        dg.addColorStop(0, L.rgba(L.mix(glass, [40, 26, 20], 0.45), 0.9)); dg.addColorStop(1, L.rgba(L.mix(glass, [40, 24, 18], 0.75), 0.9));
        c.fillStyle = dg;
        c.fillRect(dx0 + mw * 1.4, gtop + mw * 1.4, dx1 - dx0 - mw * 2.8, v.wy(-0.2) - gtop - mw * 2.8);
        c.fillStyle = 'rgba(210,200,190,0.7)';
        c.fillRect(dx0 + (dx1 - dx0) * 0.12, v.wy(-1.05), Math.max(1, 0.04 / mpp), 0.35 / mpp);
      }
    } else if (bpx > 6) {
      c.fillStyle = 'rgba(12,14,22,0.8)';
      c.fillRect(L.lerp(gx0, gx1, 0.5) - 0.5, gtop, 1, gh);
    }
    // sign band above the glass: a neon word close up, a coloured band from afar
    if (bpx > 6) {
      const sc = hash(b.seed, i, 4);
      const scol = sc < 0.3 ? [255, 92, 110] : sc < 0.5 ? [120, 220, 255] : [255, 210, 150];
      const sy = v.wy(-4.05), sh = 0.42 / mpp;
      c.fillStyle = 'rgba(10,12,18,0.9)';
      c.fillRect(gx0, sy, gw, sh);
      if (bpx > 30) {
        c.save();
        c.font = L.font(sh * 0.62, 700, L.FONT.body);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.letterSpacing = `${sh * 0.12}px`;
        c.shadowColor = L.rgba(scol, 0.9); c.shadowBlur = sh * 0.5;
        c.fillStyle = L.rgba(L.mix(scol, [255, 255, 255], 0.35), 0.95);
        c.fillText(SIGNS[Math.floor(hash(b.seed, i, 6) * SIGNS.length)], (gx0 + gx1) / 2, sy + sh * 0.54);
        c.restore();
      } else {
        c.fillStyle = L.rgba(scol, 0.55);
        c.fillRect(L.lerp(gx0, gx1, 0.25), sy + sh * 0.35, gw * 0.5, Math.max(1, sh * 0.3));
      }
    }
  }
  // awning on the hero storefront (near scale only)
  if (b.hero && bpx > 80) {
    const ax0 = v.wx(b.x0 + 0.2), ax1 = v.wx(b.x0 + b.w - 0.2), ay = v.wy(-3.75);
    c.fillStyle = 'rgb(28,52,48)';
    c.beginPath(); c.moveTo(ax0, ay); c.lineTo(ax1, ay); c.lineTo(ax1 + 0.5 / mpp, ay + 0.55 / mpp); c.lineTo(ax0 - 0.5 / mpp, ay + 0.55 / mpp); c.closePath(); c.fill();
    c.fillStyle = 'rgba(120,200,170,0.25)';
    c.fillRect(ax0 - 0.5 / mpp, ay + 0.5 / mpp, ax1 - ax0 + 1 / mpp, Math.max(1, 0.05 / mpp));
    // neon OPEN sign in the window behind the person's left
    const nx = v.wx(1.35), ny = v.wy(-2.3);
    const fl = 0.85 + 0.15 * Math.sin(gt * 13) * (L.noise1(gt * 2, 9) > 0.6 ? 1 : 0);
    c.save();
    c.font = L.font(0.36 / mpp, 700, L.FONT.body);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    // close up (0.2-2 mm/px) the sign is huge and out of focus: keep its glow tight and its light low
    const nk = L.clamp(L.invLerp(1.2e-3, 4e-3, mpp));
    c.shadowColor = `rgba(255,80,110,${L.lerp(0.45, 0.9, nk)})`; c.shadowBlur = Math.min(0.25 / mpp, 40);
    c.fillStyle = `rgba(255,120,140,${fl * L.lerp(0.35, 1, nk)})`;
    c.fillText('OPEN', nx, ny);
    c.restore();
  }
}

/** The same procedural Midtown for any x range: a far hazy row of towers, then the near row of shop-front buildings. */
export function drawSkyline(c, v, x0, x1, { seed = 5000, far = true } = {}) {
  const gt = v.gt;
  if (far) for (const b of row(x0, x1, seed + 1, true)) drawBuilding(c, v, b, gt);
  for (const b of row(x0, x1, seed, false)) drawBuilding(c, v, b, gt);
}

// ------------------------------------------------------------------ street furniture, reflections, steam
const LAMPS = (() => { const out = []; for (let x = -3.2 - 24 * 19; x <= STREET.x1; x += 24) out.push(x); return out; })();
function drawLamps(c, v, gt) {
  const mpp = v.cam.mpp;
  const lh = 6.4;
  for (const x of LAMPS) {
    const sx = v.wx(x);
    if (sx < -60 || sx > W + 60) continue;
    const hx = v.wx(x + 0.9), hy = v.wy(-lh + 0.1);
    if (lh / mpp > 24) {
      c.strokeStyle = 'rgb(16,18,26)';
      c.lineWidth = Math.max(1, 0.12 / mpp);
      c.beginPath(); c.moveTo(sx, v.wy(0)); c.lineTo(sx, v.wy(-lh + 0.4));
      c.quadraticCurveTo(sx, v.wy(-lh), v.wx(x + 0.5), v.wy(-lh)); c.lineTo(hx + 0.2 / mpp, v.wy(-lh)); c.stroke();
      c.fillStyle = 'rgb(22,24,32)';
      c.fillRect(hx - 0.28 / mpp, v.wy(-lh) - 0.04 / mpp, 0.56 / mpp, 0.14 / mpp);
      c.fillStyle = 'rgba(255,236,200,0.95)';
      c.fillRect(hx - 0.22 / mpp, v.wy(-lh) + 0.08 / mpp, 0.44 / mpp, Math.max(1, 0.05 / mpp));
      // light cone + pool on the pavement
      const cg = c.createLinearGradient(0, hy, 0, v.wy(0));
      cg.addColorStop(0, 'rgba(255,220,170,0.14)'); cg.addColorStop(1, 'rgba(255,220,170,0.02)');
      c.fillStyle = cg;
      c.beginPath(); c.moveTo(hx - 0.2 / mpp, hy); c.lineTo(hx + 0.2 / mpp, hy); c.lineTo(hx + 2.6 / mpp, v.wy(0)); c.lineTo(hx - 2.6 / mpp, v.wy(0)); c.closePath(); c.fill();
    }
    L.lightBlob(c, hx, hy, Math.max(3, Math.min(160, 1.6 / mpp)), [255, 214, 160], 0.55);
    L.lightBlob(c, hx, v.wy(0), Math.max(2, Math.min(400, 3.2 / mpp)), [255, 200, 140], 0.16);
  }
}
/** Wet pavement: long soft reflections of the lit storefronts and lamps below the street line. */
function drawReflections(c, v) {
  const mpp = v.cam.mpp, gy = v.wy(0);
  if (gy > H || gy < -20) return;
  const len = Math.min(H - gy + 10, 3.2 / mpp);
  if (len < 2) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const b of HOME_ROW) {
    const sx0 = v.wx(b.x0), sx1 = v.wx(b.x0 + b.w);
    if (sx1 < -4 || sx0 > W + 4) continue;
    const g = c.createLinearGradient(0, gy, 0, gy + len);
    g.addColorStop(0, 'rgba(255,175,105,0.16)'); g.addColorStop(0.4, 'rgba(255,165,100,0.05)'); g.addColorStop(1, 'rgba(255,160,100,0)');
    c.fillStyle = g;
    c.fillRect(sx0 + 0.4 / mpp, gy, Math.max(1, sx1 - sx0 - 0.8 / mpp), len);
  }
  for (const x of LAMPS) {
    const hx = v.wx(x + 0.9);
    if (hx < -60 || hx > W + 60) continue;
    const g = c.createLinearGradient(0, gy, 0, gy + len * 1.4);
    g.addColorStop(0, 'rgba(255,215,160,0.22)'); g.addColorStop(1, 'rgba(255,215,160,0)');
    c.fillStyle = g;
    const w = Math.max(1, 0.5 / mpp);
    c.fillRect(hx - w / 2, gy, w, len * 1.4);
  }
  c.restore();
  // kerb: a crisp lit edge on the pavement
  c.fillStyle = 'rgba(190,200,225,0.22)';
  c.fillRect(0, gy, W, Math.max(1, 0.03 / mpp));
}
const STEAM = (() => { const r = L.rng(4120); return Array.from({ length: 14 }, () => [r(), r(), r()]); })();
function drawSteam(c, v, gt) {
  const mpp = v.cam.mpp;
  const k = L.clamp(L.invLerp(0.06, 0.02, mpp));
  if (k <= 0) return;
  const bx = 2.6;
  for (const [a, b, s] of STEAM) {
    const life = ((gt * (0.16 + 0.05 * s) + a) % 1);
    const hgt = life * 3.6;
    const x = bx + 0.5 * L.noise1(gt * 0.4 + a * 9, 3) * life + (b - 0.5) * 0.5 + life * 0.6;
    const rr = (0.25 + 0.9 * life) / mpp;
    const al = 0.07 * Math.sin(Math.PI * life) * k;
    const sx = v.wx(x), sy = v.wy(-hgt);
    if (sx < -rr || sx > W + rr) continue;
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, rr));
    g.addColorStop(0, `rgba(200,205,220,${al})`); g.addColorStop(1, 'rgba(200,205,220,0)');
    c.fillStyle = g;
    c.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  }
}

// ------------------------------------------------------------------ defocus of the street plate (pull-back)
const SCR = 0.5, SCR_W = Math.round(W * SCR), SCR_H = Math.round(H * SCR);
let scratch = null;
function scratchCtx() {
  if (!scratch) scratch = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(SCR_W, SCR_H) : Object.assign(document.createElement('canvas'), { width: SCR_W, height: SCR_H });
  return scratch.getContext('2d');
}
/** Blur radius (px) of the street behind the person: strong at hand scale, sharp from ≈ 5 mm/px out. */
const plateBlur = (mpp) => 18 * L.smoothstep(L.clamp(L.invLerp(Math.log(5e-3), Math.log(1.3e-3), Math.log(mpp))));

// ------------------------------------------------------------------ the out-of-focus backdrop at hook scale
const BOKEH = (() => {
  const r = L.rng(4130);
  const cols = [[255, 186, 110], [255, 150, 90], [255, 214, 160], [140, 180, 255], [255, 90, 120], [120, 220, 210]];
  return Array.from({ length: 34 }, () => ({ x: r(), y: r(), rad: 30 + r() * r() * 120, col: cols[Math.floor(r() * cols.length)], a: 0.06 + r() * 0.13, ph: r() * 6.3 }));
})();
const dofK = (mpp) => 1 - L.clamp(L.invLerp(Math.log(5.5e-4), Math.log(1.9e-3), Math.log(mpp)));
function drawBokeh(c, v) {
  const k = dofK(v.cam.mpp);
  if (k <= 0) return;
  const z = Math.pow(1.9e-4 / v.cam.mpp, 0.55);           // the background zooms out slower than the phone (depth)
  c.save();
  c.globalAlpha = k;
  const g = c.createRadialGradient(W / 2, H * 0.47, 100, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, 'rgb(22,24,36)'); g.addColorStop(1, 'rgb(8,9,15)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter';
  for (const b of BOKEH) {
    const x = W / 2 + (b.x * 1.6 - 0.8) * W * z + 14 * L.noise1(v.gt * 0.2 + b.ph, 4);
    const y = H * 0.47 + (b.y * 1.5 - 0.75) * H * z;
    const rr = b.rad * Math.max(0.35, z);
    if (x < -rr || x > W + rr || y < -rr || y > H + rr) continue;
    const gg = c.createRadialGradient(x, y, 0, x, y, rr);
    const a = b.a * (0.85 + 0.15 * Math.sin(v.gt * 0.8 + b.ph));
    gg.addColorStop(0, L.rgba(b.col, a * 0.7)); gg.addColorStop(0.82, L.rgba(b.col, a)); gg.addColorStop(0.92, L.rgba(b.col, a * 0.55)); gg.addColorStop(1, L.rgba(b.col, 0));
    c.fillStyle = gg;
    c.beginPath(); c.arc(x, y, Math.max(0, rr), 0, TAU); c.fill();
  }
  c.restore();
}

// ------------------------------------------------------------------ the person (metres, x forward, h up)
const HEAD = [[-0.03, 0.125], [0.05, 0.112], [0.092, 0.07], [0.1, 0.035], [0.13, -0.005], [0.104, -0.03], [0.11, -0.055],
  [0.1, -0.075], [0.075, -0.112], [0.02, -0.115], [-0.04, -0.08], [-0.075, -0.07], [-0.115, -0.02], [-0.118, 0.05], [-0.09, 0.105]];
const TORSO = [[-0.47, 0.74], [-0.485, 0.95], [-0.49, 1.15], [-0.482, 1.33], [-0.455, 1.44], [-0.41, 1.495], [-0.35, 1.515],
  [-0.295, 1.49], [-0.262, 1.42], [-0.247, 1.28], [-0.252, 1.08], [-0.256, 0.9], [-0.27, 0.74]];
const rot = (P, C, a) => { const x = P[0] - C[0], y = P[1] - C[1], co = Math.cos(a), si = Math.sin(a); return [C[0] + x * co - y * si, C[1] + x * si + y * co]; };
const PH0 = -PHONE.y;                                           // phone height above the street (1.3 m)

function pose(t, look) {
  const br = Math.sin(t * 1.9) * 0.004;
  const torso = TORSO.map(([x, y]) => [x, y > 1 ? y + br * (y - 1) : y]);
  const neck = [-0.345, 1.51 + br * 0.5];
  // look: −1 = down at the phone, +1 = up at the sky
  const tilt = L.lerp(-0.42, 0.42, (look + 1) / 2) + 0.02 * L.noise1(t * 0.7, 2);
  const hc0 = [neck[0] + 0.03, neck[1] + 0.13];
  const head = HEAD.map(([x, y]) => rot([hc0[0] + x, hc0[1] + y], neck, tilt));
  const hc = rot(hc0, neck, tilt);
  const sway = 0.003 * Math.sin(t * 1.3);
  return {
    torso, neck, head, hc,
    arms: [
      { sh: [-0.4, 1.42 + br], el: [-0.37, 1.13 + sway], wr: [-0.075, 1.218 + sway * 0.3], ha: [-0.02, 1.235] },
      { sh: [-0.37, 1.43 + br], el: [-0.33, 1.125 + sway], wr: [-0.07, 1.238 + sway * 0.3], ha: [-0.015, 1.255] },
    ],
    legs: [
      { hip: [-0.4, 0.82], knee: [-0.41, 0.46], ankle: [-0.44, 0.085], toe: [-0.29, 0.03] },
      { hip: [-0.33, 0.82], knee: [-0.31, 0.46], ankle: [-0.335, 0.085], toe: [-0.18, 0.03] },
    ],
  };
}
function capsule(c, A, ra, B, rb) {
  c.moveTo(A[0] + ra, -A[1]); c.arc(A[0], -A[1], Math.max(0, ra), 0, TAU);
  c.moveTo(B[0] + rb, -B[1]); c.arc(B[0], -B[1], Math.max(0, rb), 0, TAU);
  const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
  if (d <= Math.abs(ra - rb)) return;
  const ang = Math.atan2(-(B[1] - A[1]), B[0] - A[0]);
  const off = Math.acos(L.clamp((ra - rb) / d, -1, 1));
  let q = [[A[0] + Math.cos(ang + off) * ra, -A[1] + Math.sin(ang + off) * ra], [B[0] + Math.cos(ang + off) * rb, -B[1] + Math.sin(ang + off) * rb],
    [B[0] + Math.cos(ang - off) * rb, -B[1] + Math.sin(ang - off) * rb], [A[0] + Math.cos(ang - off) * ra, -A[1] + Math.sin(ang - off) * ra]];
  if (area(q) < 0) q = q.reverse();
  q.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}
function area(q) { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], r = q[(i + 1) % q.length]; a += p[0] * r[1] - r[0] * p[1]; } return a; }
function smooth(c, pts) {
  if (area(pts.map(([x, h]) => [x, -h])) < 0) pts = pts.slice().reverse();
  const n = pts.length;
  const m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2]; };
  const s = m(0);
  c.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) { const p = pts[i % n], e = m(i); c.quadraticCurveTo(p[0], -p[1], e[0], e[1]); }
  c.closePath();
}
function sleevePath(c, arm) {
  capsule(c, arm.sh, 0.058, arm.el, 0.046);
  capsule(c, arm.el, 0.044, arm.wr, 0.033);
}
function figurePath(c, q, near, { arms = true, grip = true } = {}) {
  c.beginPath();
  const lg = q.legs[near ? 1 : 0], arm = q.arms[near ? 1 : 0];
  capsule(c, lg.hip, 0.078, lg.knee, 0.058);
  capsule(c, lg.knee, 0.054, lg.ankle, 0.04);
  capsule(c, [lg.ankle[0] - 0.04, 0.05], 0.046, lg.toe, 0.032);
  if (arms) {
    sleevePath(c, arm);
    capsule(c, arm.wr, 0.034, arm.ha, 0.04);
  }
  if (near) {
    smooth(c, q.torso);
    capsule(c, q.neck, 0.05, [q.hc[0] - 0.015, q.hc[1] - 0.05], 0.05);
    smooth(c, q.head);
    if (arms && grip) {
      for (const f of GRIP.fingers) capsule(c, f.a, f.r, f.b, f.r * 0.92);
      capsule(c, GRIP.thumb.a, GRIP.thumb.r, GRIP.thumb.b, GRIP.thumb.r * 0.9);
    }
  }
}
/**
 * Close up (the hook and the start of the pull-back) the arms are seen at hand scale: draw them as lit volumes, not
 * a flat silhouette with an offset rim. Sleeve: dark fabric, warm shop light on the upper-left edge, cool screen
 * spill on the edge facing the phone. Hand: dark skin, lifted by the screen. Rims are soft 1-2 px inner highlights.
 */
function drawArmVolume(c, v, arm, near) {
  const mpp = v.cam.mpp;
  const ax = arm.el[0], ay = -arm.el[1], bx = arm.wr[0], by = -arm.wr[1];
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;   // n points down-right
  const mx = (ax + bx) / 2, my = (ay + by) / 2, R = 0.05;
  const lift = near ? 1 : 0.55;
  const box = () => c.fillRect(-0.6, -1.7, 0.75, 0.8);
  // inner rims by offset: fill the shape with the rim light, then the body shifted away from that light
  const lit = (pathFn, rimCol, off, bodyFill) => {
    c.save();
    c.beginPath(); pathFn(); c.clip('nonzero');
    c.fillStyle = rimCol; box();
    c.translate(off[0] * mpp, off[1] * mpp);
    c.beginPath(); pathFn(); c.fillStyle = bodyFill; c.fill('nonzero');
    c.restore();
  };
  // the hand first (the sleeve cuff overlaps it): dark skin, lifted by the screen
  const cuff = [L.lerp(arm.el[0], arm.wr[0], 0.8), L.lerp(arm.el[1], arm.wr[1], 0.8)];
  const handPath = () => { capsule(c, cuff, 0.03, arm.wr, 0.029); capsule(c, arm.wr, 0.03, arm.ha, 0.036); };
  const hg = c.createLinearGradient(cuff[0], -cuff[1] - 0.03, arm.ha[0] + 0.02, -arm.ha[1] + 0.03);
  hg.addColorStop(0, L.rgba([26, 21, 22])); hg.addColorStop(0.55, L.rgba([16, 13, 15])); hg.addColorStop(1, L.rgba([30, 33, 46]));
  lit(handPath, `rgba(168,128,104,${near ? 0.32 : 0.2})`, [1.8, 1.4], hg);
  c.save();
  c.beginPath(); handPath(); c.clip('nonzero');
  const hs = c.createRadialGradient(PHONE.x - 0.035, PHONE.y + 0.02, 0, PHONE.x - 0.035, PHONE.y + 0.02, 0.08);
  hs.addColorStop(0, `rgba(130,165,240,${0.16 * lift})`); hs.addColorStop(1, 'rgba(130,165,240,0)');
  c.fillStyle = hs; box();
  c.restore();
  // sleeve: dark fabric, warm edge up-left (shop light behind), cool edge facing the phone
  const sleeve = () => { capsule(c, arm.sh, 0.058, arm.el, 0.046); capsule(c, arm.el, 0.044, cuff, 0.036); };
  const g = c.createLinearGradient(mx - nx * R, my - ny * R, mx + nx * R, my + ny * R);
  g.addColorStop(0, L.rgba(near ? [44, 38, 40] : [30, 28, 34]));
  g.addColorStop(0.3, L.rgba([24, 26, 36]));
  g.addColorStop(0.7, L.rgba(near ? [16, 18, 27] : [13, 15, 22]));
  g.addColorStop(1, L.rgba(L.mix([16, 18, 27], [44, 58, 92], lift)));
  // two inner rims: the shape is filled with a warm-to-cool rim gradient, then the body is filled where the sleeve
  // shifted up-left AND shifted down-right overlap, leaving a 1-2 px crescent on each side
  const rg = c.createLinearGradient(mx - nx * R, my - ny * R, mx + nx * R, my + ny * R);
  rg.addColorStop(0, `rgba(255,178,108,${near ? 0.62 : 0.4})`); rg.addColorStop(0.5, 'rgba(60,60,80,0.5)'); rg.addColorStop(1, `rgba(130,165,240,${0.55 * lift})`);
  const o1 = [1.7 * nx * mpp, 1.7 * ny * mpp], o2 = [-1.4 * nx * mpp, -1.4 * ny * mpp];
  c.save();
  c.beginPath(); sleeve(); c.clip('nonzero');
  c.fillStyle = rg; box();
  c.translate(o1[0], o1[1]);
  c.beginPath(); sleeve(); c.clip('nonzero');
  c.translate(o2[0] - o1[0], o2[1] - o1[1]);
  c.beginPath(); sleeve(); c.fillStyle = g; c.fill('nonzero');
  c.restore();
  // soft fabric shading: the screen spill on the cuff, darker toward the elbow
  c.save();
  c.beginPath(); sleeve(); c.clip('nonzero');
  const sp = c.createRadialGradient(PHONE.x - 0.02, PHONE.y + 0.03, 0, PHONE.x - 0.02, PHONE.y + 0.03, 0.17);
  sp.addColorStop(0, `rgba(120,155,230,${0.1 * lift})`); sp.addColorStop(1, 'rgba(120,155,230,0)');
  c.fillStyle = sp; box();
  c.restore();
}

const BODY = [13, 15, 23];
function drawPerson(c, v, look) {
  const mpp = v.cam.mpp;
  const hp = 1.75 / mpp;
  const X = v.wx(0), Y = v.wy(0);
  if (hp < 1 || X < -hp || X > W + hp || Y < -10 || Y - hp > H + 10) return;
  c.save();
  c.translate(X, Y);
  c.scale(1 / mpp, 1 / mpp);
  if (hp < 9) {
    c.fillStyle = L.rgba(BODY);
    c.fillRect(-0.48, -1.75, 0.24, 1.75);
    c.restore();
    return;
  }
  const q = pose(v.gt, look);
  const rim = Math.max(1.5 * mpp, 0.0006);
  // arms as lit volumes close up (cross-fades in below 2.2 mm/px); the grip is drawn in front by s00 at phone LOD
  const armK = L.clamp(L.invLerp(2.2e-3, 1.1e-3, mpp));
  const grip = !gripInFront(v);
  // contact shadow
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath(); c.ellipse(-0.33, 0.005, 0.32, 0.03, 0, 0, TAU); c.fill();
  const pg = c.createRadialGradient(0, -PH0, 0, 0, -PH0, 0.85);
  pg.addColorStop(0, 'rgba(175,205,255,1)'); pg.addColorStop(0.35, 'rgba(140,175,255,0.65)'); pg.addColorStop(1, 'rgba(140,175,255,0)');
  const arms = armK < 1;
  for (const near of [false, true]) {
    // warm back rim (the shop window behind), cool front rim (the phone)
    c.save(); c.translate(-rim, -rim * 0.4); figurePath(c, q, near, { arms, grip }); c.fillStyle = `rgba(255,178,108,${near ? 0.7 : 0.4})`; c.fill(); c.restore();
    c.save(); c.translate(rim * 1.2, -rim * 0.3); figurePath(c, q, near, { arms, grip }); c.fillStyle = pg; c.fill(); c.restore();
    figurePath(c, q, near, { arms, grip });
    c.fillStyle = L.rgba(near ? BODY : [22, 25, 36]);
    c.fill();
    if (armK > 0) {
      c.save(); c.globalAlpha *= armK;
      drawArmVolume(c, v, q.arms[near ? 1 : 0], near);
      c.restore();
    }
  }
  // the screen's light on the face, hands and chest
  c.save();
  figurePath(c, q, true);
  c.clip();
  const fg = c.createRadialGradient(-0.16, -PH0 - 0.22, 0, -0.16, -PH0 - 0.22, 0.34);
  fg.addColorStop(0, 'rgba(120,160,240,0.3)'); fg.addColorStop(1, 'rgba(120,160,240,0)');
  c.fillStyle = fg;
  c.fillRect(-0.5, -PH0 - 0.45, 0.6, 0.9);
  c.restore();
  c.restore();
}

// ------------------------------------------------------------------ signal threads from the four hero satellites
const THREADS = HERO.map((h, i) => {
  const dx = h.x - PHONE.x, dy = h.y - PHONE.y, l = Math.hypot(dx, dy);
  return { ux: dx / l, uy: dy / l, ph: [0.0, 0.55, 0.27, 0.8][i], per: [1.7, 1.45, 1.6, 1.85][i] };
});
const T_THREADS = 0.85;                                 // beat-relative: "falling from space"
const T_EIN = 4.25;                                     // "Einstein" (7.98 s)
function threadsK(v) {
  return L.ease.outCubic(L.prog(v.t, T_THREADS, 0.9)) * (1 - L.ease.inCubic(L.prog(v.t, v.d + 0.15, 0.9)));
}
function drawThreads(c, v) {
  const k = threadsK(v);
  if (k <= 0) return;
  const px = v.wx(PHONE.x), py = v.wy(PHONE.y);
  if (px < -200 || px > W + 200 || py < -200 || py > H + 400) return;
  const gold = Math.exp(-(((v.t - T_EIN - 0.5) / 0.75) ** 2));
  const col = L.mix(ACCENT, CLOCK, gold);
  const LEN = 2600;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  THREADS.forEach((th, i) => {
    const draw = L.ease.inOutCubic(L.prog(v.t, T_THREADS + i * 0.12, 1.1));
    if (draw <= 0) return;
    const ex = px + th.ux * LEN, ey = py + th.uy * LEN;
    // the thread draws DOWN from the sky to the phone
    const sx = L.lerp(ex, px, 0), sy = L.lerp(ey, py, 0);
    const hx = L.lerp(ex, px, draw), hy = L.lerp(ey, py, draw);
    const g = c.createLinearGradient(px, py, ex, ey);
    g.addColorStop(0, L.rgba(col, 0.0)); g.addColorStop(0.012, L.rgba(col, 0.32 * k)); g.addColorStop(0.5, L.rgba(col, 0.13 * k)); g.addColorStop(1, L.rgba(col, 0));
    c.strokeStyle = g;
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy); c.stroke();
    // pulses falling along it
    const tt = v.t - T_THREADS - 0.6 - th.ph;
    if (tt > 0) {
      const f = (tt / th.per) % 1;
      const s = Math.pow(1 - f, 1.6);                                // eases in toward the phone
      const qx = px + th.ux * LEN * 0.55 * s, qy = py + th.uy * LEN * 0.55 * s;
      const tail = 150;
      const pg = c.createLinearGradient(qx, qy, qx + th.ux * tail, qy + th.uy * tail);
      pg.addColorStop(0, L.rgba(col, 0.9 * k)); pg.addColorStop(1, L.rgba(col, 0));
      c.strokeStyle = pg; c.lineWidth = 3;
      c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + th.ux * tail, qy + th.uy * tail); c.stroke();
      L.lightBlob(c, qx, qy, 18 + 14 * gold, col, 0.55 * k);
    }
  });
  c.restore();
}
/** Brightness of the arrival flash at the phone (0..1). */
function arrivalFlash(v) {
  const k = threadsK(v);
  if (k <= 0) return 0;
  let f = 0;
  THREADS.forEach((th) => {
    const tt = v.t - T_THREADS - 0.6 - th.ph;
    if (tt <= 0) return;
    const age = (tt % th.per);
    f += Math.exp(-age * 7) * (tt > th.per * 0.98 ? 1 : 0);
  });
  return Math.min(1, f) * k;
}

// ------------------------------------------------------------------ scene
export default {
  beat: 1,
  chapter: { num: '01', title: 'From space', sub: 'the answer comes from above' },
  captions: true,
  layer: 0,
  cues(d) {
    void d;
    return [
      { t: T_THREADS, name: 'shimmer', gain: 0.18, pitch: 1.15 },     // "falling from space": the threads draw down
      { t: T_THREADS + 0.5, name: 'swish', gain: 0.12, pitch: 0.8 },
      { t: 2.6, name: 'blip', gain: 0.12, pitch: 1.4 },                // first pulses land on the phone
      { t: 3.05, name: 'blip', gain: 0.1, pitch: 1.55 },
      { t: T_EIN + 0.1, name: 'bloom', gain: 0.24, pitch: 0.9 },       // "Einstein"
    ];
  },
  drawWorld(ctx, v) {
    const mpp = v.cam.mpp;
    const gy = v.wy(0);
    const onStreet = mpp < 90 && gy > -40 && gy - 420 / mpp < H + 40;
    if (onStreet && dofK(mpp) < 1) {
      const plate = (c) => {
        for (const b of FAR_ROW) drawBuilding(c, v, b, v.gt);
        for (const b of HOME_ROW) drawBuilding(c, v, b, v.gt);
        drawReflections(c, v);
        drawSteam(c, v, v.gt);
        drawLamps(c, v, v.gt);
      };
      // shallow depth of field while the camera is close to the phone: the street behind is a real defocus
      const blur = plateBlur(mpp);
      if (blur > 0.6) {
        const sc = scratchCtx();
        sc.setTransform(1, 0, 0, 1, 0, 0);
        sc.clearRect(0, 0, SCR_W, SCR_H);
        sc.setTransform(SCR, 0, 0, SCR, 0, 0);
        plate(sc);
        ctx.save();
        ctx.filter = `blur(${blur.toFixed(1)}px)`;
        ctx.drawImage(scratch, 0, 0, W, H);
        ctx.restore();
      } else plate(ctx);
    }
    drawBokeh(ctx, v);
    // the person: glances up at the sky on "falling from space", back down to the phone on "Einstein"
    const up = L.ease.inOutCubic(L.prog(v.t, 1.55, 0.9)) - L.ease.inOutCubic(L.prog(v.t, 3.6, 1.0));
    drawPerson(ctx, v, L.lerp(-1, 0.55, up));
    drawThreads(ctx, v);
    const fl = arrivalFlash(v);
    if (fl > 0.01) {
      const px = v.wx(PHONE.x), py = v.wy(PHONE.y);
      L.lightBlob(ctx, px, py, Math.max(30, v.ws(0.35)), ACCENT, 0.35 * fl);
    }
  },
  drawOverlay(ctx, v) {
    // the Einstein tease: a small gold formula, light
    const k = v.k * L.enter(v.t, T_EIN - 1.5, 0.7) ;
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14;
    ctx.fillStyle = L.rgba(CLOCK, 0.9);
    ctx.fillRect(72, 452, 60 * L.ease.outCubic(k), 3);
    ctx.font = L.font(64, 600, L.FONT.display);
    ctx.fillStyle = L.rgba(CLOCK);
    L.trackedText(ctx, 'E = mc²', 72, 530 + (1 - L.ease.outCubic(k)) * 20, 2, 'left');
    ctx.restore();
  },
};
