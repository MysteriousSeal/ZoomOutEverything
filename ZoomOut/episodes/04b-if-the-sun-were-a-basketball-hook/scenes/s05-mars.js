// Beat 5 — Mars: a mustard seed, 39 m from the basketball Sun.
// The camera pulls back out of the Earth/Moon macro. Mars's orbit ring sweeps open from the planet in both
// directions (two glowing tips meeting on the far side), a dashed radius ties it to the Sun, and a magnifier
// inset opens on "mustard seed" with the planet beside a real seed at the same scale.
//
// This file also exports the small "planet kit" shared by beats 5–7 (s06-jupiter.js, s07-saturn.js):
// orbit sweep, body marker, magnifier inset, sphere shading and the comparison objects.
import * as L from '../../../../engine/runtime/lib.js';
import { PLANETS, pos, moveLead } from '../camera.js';
import { orbitRing, globeK } from '../env.js';

const { W, H } = L;
const DEG = Math.PI / 180;
const WARM = [255, 225, 190];

// ================================================================== planet kit (shared by s05–s07)

/** World layer visibility: everything on the ground fades out as the globe takes over. */
export const groundK = (v) => 1 - globeK(v);

/** Does a circle of radius r (m) around the Sun cross the screen? (cheap cull for huge or tiny rings) */
export function ringVisible(v, r) {
  const rr = v.ws(r);
  if (rr < 2) return false;
  const sx = v.wx(0), sy = v.wy(0);
  const nx = L.clamp(sx, 0, W), ny = L.clamp(sy, 0, H);
  const near = Math.hypot(sx - nx, sy - ny);
  const far = Math.max(Math.hypot(sx, sy), Math.hypot(sx - W, sy), Math.hypot(sx, sy - H), Math.hypot(sx - W, sy - H));
  return rr > near - 4 && rr < far + 4;
}

/**
 * Orbit ring of planet `name`, swept open from the planet in both directions (t0 … t0+dur, beat time),
 * accent while its beat is active, settling to a faint warm line afterwards. Includes the dashed Sun→planet radius.
 */
export function drawOrbit(ctx, v, name, t0 = 0.15, dur = 1.4) {
  const t = v.t;
  if (t < t0) return;
  const fade = groundK(v);
  if (fade <= 0) return;
  const [r, ang] = PLANETS[name];
  const k = L.ease.inOutCubic(L.prog(t, t0, dur));
  const act = 1 - L.ease.inOutCubic(L.prog(t, v.d - 0.15, 1.3));      // accent → faint after the beat
  const col = L.mix(WARM, v.accent, act);
  const alpha = L.lerp(0.2, 0.85, act) * fade;
  if (ringVisible(v, r)) {
    const sx = v.wx(0), sy = v.wy(0), rr = v.ws(r);
    if (act > 0.01) {
      // soft glow underlay on the active ring
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = L.rgba(v.accent, 0.1 * act * fade);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(sx, sy, rr, (ang - 180 * k) * DEG, (ang + 180 * k) * DEG);
      ctx.stroke();
      ctx.restore();
    }
    orbitRing(ctx, v, r, k, ang - 180 * k, alpha, col);
    // the two sweeping tips: bright comet heads that meet on the far side
    if (k > 0 && k < 1) {
      const tipA = Math.sin(Math.PI * k);
      for (const s of [-1, 1]) {
        const a = (ang + s * 180 * k) * DEG;
        const x = sx + rr * Math.cos(a), y = sy + rr * Math.sin(a);
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        L.lightBlob(ctx, x, y, 26, v.accent, 0.7 * tipA * fade);
        ctx.fillStyle = L.rgba([255, 240, 220], 0.9 * tipA * fade);
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // dashed radius Sun → planet (drawn on with the ring, gone with the accent)
  const kr = L.ease.outCubic(L.prog(t, t0 - 0.05, 0.9)) * act;
  if (kr > 0.01) {
    const p = pos(name);
    const x0 = v.wx(0), y0 = v.wy(0), x1 = v.wx(p.x), y1 = v.wy(p.y);
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len > 30 && len < 6000) {
      const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      const a = 16, b = len * L.ease.outCubic(L.prog(t, t0, 1.1)) - 14;   // leave room around the Sun and the body
      if (b > a) {
        ctx.save();
        ctx.strokeStyle = L.rgba(v.accent, 0.5 * kr * fade);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 9]);
        ctx.lineDashOffset = -v.gt * 14;                                // dashes drift outward
        ctx.beginPath(); ctx.moveTo(x0 + ux * a, y0 + uy * a); ctx.lineTo(x0 + ux * b, y0 + uy * b); ctx.stroke();
        ctx.restore();
      }
    }
  }
}

/** The body on the ground: true size is sub-pixel, so a min-size glowing marker in its colour. */
export function drawBody(ctx, v, name, col, tIn = 0.6) {
  const t = v.t;
  if (t < tIn) return;
  const fade = groundK(v);
  if (fade <= 0) return;
  const p = pos(name);
  const x = v.wx(p.x), y = v.wy(p.y);
  if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
  const kin = L.ease.outBack(L.prog(t, tIn, 0.5), 2.2);
  const act = 1 - L.ease.inOutCubic(L.prog(t, v.d - 0.15, 1.3));
  const r = Math.max(v.ws(PLANETS[name][2] / 2), 2.4) * Math.max(0, kin);
  L.lightBlob(ctx, x, y, L.lerp(14, 24, act) * L.clamp(kin), col, L.lerp(0.35, 0.6, act) * fade);
  ctx.save();
  ctx.globalAlpha *= fade;
  ctx.fillStyle = L.rgba(L.mix(col, [255, 255, 255], 0.35));
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  // arrival ping: a single ring that expands and fades
  const pk = L.prog(t, tIn + 0.1, 1.0);
  if (pk > 0 && pk < 1) {
    ctx.strokeStyle = L.rgba(col, 0.6 * (1 - pk));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 6 + 40 * L.ease.outCubic(pk), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Screen angle from a screen point toward the Sun (the light direction inside insets). */
export const sunAngle = (v, x, y) => Math.atan2(v.wy(0) - y, v.wx(0) - x);

/**
 * Magnifier inset (screen space, call from drawOverlay).
 *   body: [x, y] screen position of the body (leader start) · c: [x, y] inset centre · R radius px
 *   tOpen: beat time it pops open · tLead: beat time the body reticle + leader start (default tOpen - 0.55;
 *   may be later than tOpen when the inset should land on the word before the body has arrived)
 *   content(ctx, cx, cy, R, la, kc) draws inside the clipped disc
 *   tags: [[text, dx, dy]] small tracked caps inside the disc (text may contain \n)
 */
/** Ruler with ticks + a small unit tag below it (matches the Mercury–Earth lens rulers): len units of px each. */
export function scaleBar(ctx, x, y, len, px, minor, tag, k) {
  if (k <= 0) return;
  const w = len * px, x0 = x - w / 2, e = L.ease.outCubic(k);
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.strokeStyle = 'rgba(235,228,220,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y); ctx.lineTo(x0 + w * e, y);
  const n = Math.round(len / minor);
  for (let i = 0; i <= n; i++) {
    const tx = x0 + i * minor * px;
    if (tx > x0 + w * e + 0.5) break;
    const major = i === 0 || i === n;
    ctx.moveTo(tx, y); ctx.lineTo(tx, y - (major ? 11 : 6));
  }
  ctx.stroke();
  ctx.globalAlpha *= L.clamp(k * 2 - 1);
  ctx.font = L.font(20, 600, L.FONT.body);
  ctx.fillStyle = 'rgba(235,228,220,0.8)';
  ctx.textBaseline = 'top';
  L.trackedText(ctx, tag, x, y + 8, 2, 'center');
  ctx.restore();
}

export function drawInset(ctx, v, { body, c, R = 125, tOpen, tLead = tOpen - 0.55, content, tags = [], scale = null }) {
  const t = v.t;
  const vis = v.k;
  if (vis <= 0) return;
  const [bx, by] = body;
  const [cx, cy] = c;
  const la = sunAngle(v, bx, by);
  const close = L.ease.outCubic(vis);
  // marks pinned to the moving body (reticle, leader) are gone before the next shot's camera move begins
  const pin = 1 - L.ease.inOutCubic(L.prog(t, v.d - moveLead(v.index + 1) - 0.35, 0.3));

  ctx.save();
  // reticle on the body
  const kr = L.prog(t, tLead, 0.45);
  if (kr > 0) {
    const rr = 13 * L.ease.outBack(kr, 2.0);
    ctx.globalAlpha = L.clamp(kr * 2) * vis * pin;
    ctx.strokeStyle = L.rgba(v.accent, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, Math.max(0, rr), 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5;
    const spin = t * 0.6;
    for (let i = 0; i < 4; i++) {
      const a = spin + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * (rr + 4), by + Math.sin(a) * (rr + 4));
      ctx.lineTo(bx + Math.cos(a) * (rr + 10), by + Math.sin(a) * (rr + 10));
      ctx.stroke();
    }
  }
  // leader: draws from the body toward the inset rim
  const kl = L.prog(t, tLead + 0.15, 0.5);
  const dx = bx - cx, dy = by - cy, dl = Math.hypot(dx, dy) || 1;
  const ex = cx + (dx / dl) * (R + 12), ey = cy + (dy / dl) * (R + 12);
  const sx = bx - (dx / dl) * 17, sy = by - (dy / dl) * 17;
  if (kl > 0 && dl > R + 40) {
    const e = L.ease.outCubic(kl);
    ctx.globalAlpha = vis * pin;
    ctx.strokeStyle = L.rgba(WARM, 0.75);
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(L.lerp(sx, ex, e), L.lerp(sy, ey, e)); ctx.stroke();
  }
  ctx.restore();

  // the inset itself: pops open with overshoot, shrinks a little as it fades
  const ko = L.prog(t, tOpen, 0.6);
  if (ko <= 0) return;
  const s = L.ease.outBack(ko, 1.5) * L.lerp(0.88, 1, close);
  if (s <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = L.clamp(ko * 3) * vis;
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  // drop shadow + glass disc
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 10;
  const bg = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R);
  bg.addColorStop(0, '#1d1f25');
  bg.addColorStop(1, '#0a0b0e');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // glass glint (under the content, so it never clips a planet's limb)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, R - 7, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
  ctx.restore();
  // content, clipped
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.clip();
  // pool of warm light from the Sun's side
  L.lightBlob(ctx, cx + Math.cos(la) * R * 0.6, cy + Math.sin(la) * R * 0.6, R * 1.3, [255, 170, 100], 0.07);
  const kc = L.prog(t, tOpen + 0.12, 0.55);
  content(ctx, cx, cy, R, la, kc);
  // tags
  const kt = L.ease.outCubic(L.prog(t, tOpen + 0.35, 0.5));
  if (kt > 0) {
    ctx.globalAlpha *= kt;
    ctx.fillStyle = 'rgba(222,228,238,0.92)';
    ctx.textBaseline = 'middle';
    // Layout: one text size for the whole inset. Lines that share a row (same index in each tag) are placed at their
    // tx, clamped inside the disc's chord at that height (14 px margin) and pushed apart to keep a 16 px gap; the
    // size steps down only if a row still doesn't fit. Nothing can leave the lens or touch its neighbour.
    const tw = (ln, size) => { ctx.font = L.font(size, 700, L.FONT.body); return ctx.measureText(ln).width + 2.5 * (ln.length - 1); };
    const rows = [];
    for (const [txt, tx, ty] of tags) txt.split('\n').forEach((ln, i) => {
      const y = cy + ty + i * 24;
      (rows[i] ??= { y, items: [] }).items.push({ ln, tx });
    });
    const place = (row, size) => {
      const dy = Math.abs(row.y - cy) + 10;
      const half = Math.sqrt(Math.max(0, R * R - dy * dy)) - 14;
      const it = row.items.map((o) => ({ ...o, w: tw(o.ln, size) })).sort((a, b) => a.tx - b.tx);
      it.forEach((o) => { o.x = L.clamp(o.tx, -half + o.w / 2, half - o.w / 2); });
      for (let i = 1; i < it.length; i++) {          // push overlapping neighbours apart, then re-clamp
        const a = it[i - 1], b = it[i], need = (a.x + a.w / 2 + GAP) - (b.x - b.w / 2);
        if (need > 0) { a.x -= need / 2; b.x += need / 2; }
      }
      it.forEach((o) => { o.x = L.clamp(o.x, -half + o.w / 2, half - o.w / 2); });
      const ok = it.every((o) => o.w <= 2 * half) && it.every((o, i) => !i || it[i - 1].x + it[i - 1].w / 2 + GAP - 1 <= o.x - o.w / 2);
      return { ok, it };
    };
    const GAP = 30;   // clear separation between neighbouring tags (they must never read as one phrase)
    let size = 20;
    while (size > 13 && !rows.every((r) => place(r, size).ok)) size -= 0.5;
    ctx.font = L.font(size, 700, L.FONT.body);
    for (const r of rows) for (const o of place(r, size).it) {
      ctx.font = L.font(size, 700, L.FONT.body);
      L.trackedText(ctx, o.ln, cx + o.x, r.y + (1 - kt) * 6, 2.5, 'center');
    }
  }
  if (scale) scaleBar(ctx, cx, cy + scale.dy, scale.len, scale.px, scale.minor, scale.tag, L.ease.outCubic(L.prog(t, tOpen + 0.45, 0.6)));
  ctx.restore();
  // rims
  ctx.strokeStyle = L.rgba(WARM, 0.9);
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  // slowly turning tick bezel
  ctx.strokeStyle = L.rgba(WARM, 0.32);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const rot = v.gt * 0.07;
  for (let i = 0; i < 72; i++) {
    const a = rot + (i / 72) * Math.PI * 2, l = i % 6 === 0 ? 9 : 4;
    ctx.moveTo(cx + Math.cos(a) * (R + 7), cy + Math.sin(a) * (R + 7));
    ctx.lineTo(cx + Math.cos(a) * (R + 7 + l), cy + Math.sin(a) * (R + 7 + l));
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Dark scrim behind the house bigLabel block (x 80, baseline y 480, size 120): a wide soft falloff plus a feathered
 * plate fitted to the measured readout, dense enough that orbit strokes never cut through the numbers or the small line.
 */
export function labelScrim(ctx, k, big = '0.0 mm', small = '') {
  if (k <= 0) return;
  ctx.save();
  ctx.font = L.font(120, 800, L.FONT.display);
  const wb = ctx.measureText(big).width - big.length;
  ctx.font = L.font(30, 600, L.FONT.body);
  const ws = small ? ctx.measureText(small.toUpperCase()).width + small.length * 3 : 0;
  const x1 = 80 + Math.max(wb, ws) + 34;
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = `rgba(2,4,6,${0.8 * L.clamp(k)})`;
  ctx.beginPath(); ctx.roundRect(46, 334, x1 - 46, 236, 40); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(330, 458);
  ctx.scale(1, 0.4);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 360);
  g.addColorStop(0, `rgba(0,0,0,${0.45 * L.clamp(k)})`);
  g.addColorStop(0.6, `rgba(0,0,0,${0.3 * L.clamp(k)})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-360, -360, 720, 720);
  ctx.restore();
}

/** House readout outro: a 0.4 s fade that ends exactly at the beat's end (no pop, no ghost under the next card). */
export const labelOut = (v) => 1 - L.ease.inOutCubic(L.prog(v.t, v.d - 0.42, 0.4));

/** Content entrance helper: element i of a staggered group (alpha + small rise). */
export function stagger(ctx, kc, i, fn) {
  const k = L.ease.outCubic(L.clamp(kc * 1.6 - i * 0.35));
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.translate(0, (1 - k) * 14);
  fn();
  ctx.restore();
}

/** Sphere shading over an already-filled, clipped disc: terminator toward la, limb darkening, soft sheen. */
export function shadeSphere(ctx, x, y, r, la, { night = 0.88, sheen = 0.16 } = {}) {
  const lx = Math.cos(la), ly = Math.sin(la);
  const g = ctx.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.42, 'rgba(0,0,0,0.12)');
  g.addColorStop(0.7, `rgba(0,0,0,${night * 0.75})`);
  g.addColorStop(1, `rgba(0,0,0,${night})`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  const lg = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
  lg.addColorStop(0, 'rgba(0,0,0,0)');
  lg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = lg;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  if (sheen > 0) {
    const hx = x + lx * r * 0.42, hy = y + ly * r * 0.42;
    const sg = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.75);
    sg.addColorStop(0, `rgba(255,250,240,${sheen})`);
    sg.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

/** Thin lit rim on the sunward limb (call outside the clip). */
export function rimLight(ctx, x, y, r, la, col, a = 0.55, w = 1.6) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = L.rgba(col, a);
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r - w / 2), la - 1.1, la + 1.1); ctx.stroke();
  ctx.restore();
}

/** Soft contact shadow under an object resting on the inset "table". */
export function contactShadow(ctx, x, y, rx, ry, a = 0.55) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** A grape seen side-on, stem up. pal: { base, dark, light, bloom } */
export function grape(ctx, x, y, rx, ry, la, pal) {
  const lx = Math.cos(la), ly = Math.sin(la);
  contactShadow(ctx, x - lx * rx * 0.25, y + ry * 0.95, rx * 1.05, rx * 0.22, 0.6);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();
  const g = ctx.createRadialGradient(x + lx * rx * 0.35, y + ly * ry * 0.35, rx * 0.1, x, y, ry * 1.05);
  g.addColorStop(0, L.rgba(pal.light));
  g.addColorStop(0.55, L.rgba(pal.base));
  g.addColorStop(1, L.rgba(pal.dark));
  ctx.fillStyle = g;
  ctx.fillRect(x - rx, y - ry, 2 * rx, 2 * ry);
  // subsurface glow on the shadow side (light passing through the flesh)
  const sx = x - lx * rx * 0.38, sy = y - ly * ry * 0.38 + ry * 0.1;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, rx * 0.7);
  sg.addColorStop(0, L.rgba(pal.light, 0.28));
  sg.addColorStop(1, L.rgba(pal.light, 0));
  ctx.fillStyle = sg;
  ctx.fillRect(x - rx, y - ry, 2 * rx, 2 * ry);
  // faint meridian veins
  ctx.strokeStyle = L.rgba(pal.dark, 0.08);
  ctx.lineWidth = 1;
  for (const f of [-0.45, 0, 0.45]) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx * f) + 0.5, ry, 0, -Math.PI / 2, Math.PI / 2, f < 0); ctx.stroke();
  }
  // bloom: the dusty wax film
  ctx.fillStyle = L.rgba(pal.bloom[0], pal.bloom[1]);
  ctx.fillRect(x - rx, y - ry, 2 * rx, 2 * ry);
  // limb darkening
  const lg = ctx.createRadialGradient(x, y, ry * 0.6, x, y, ry * 1.02);
  lg.addColorStop(0, 'rgba(0,0,0,0)');
  lg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = lg;
  ctx.fillRect(x - rx, y - ry, 2 * rx, 2 * ry);
  ctx.restore();
  // specular: soft lobe + crisp window highlight
  const hx = x + lx * rx * 0.42, hy = y + ly * ry * 0.42;
  const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, rx * 0.32);
  hg.addColorStop(0, 'rgba(255,255,255,0.55)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(hx, hy, rx * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(hx, hy, rx * 0.08, rx * 0.05, la, 0, Math.PI * 2); ctx.fill();
  // stem: pedicel cap + short woody stalk
  const top = y - ry;
  ctx.fillStyle = 'rgba(70,60,40,1)';
  ctx.beginPath(); ctx.ellipse(x, top + 1.5, rx * 0.16, rx * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(105,88,58,1)';
  ctx.lineWidth = Math.max(1.5, rx * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, top + 1); ctx.quadraticCurveTo(x + rx * 0.05, top - ry * 0.18, x + rx * 0.2, top - ry * 0.3); ctx.stroke();
  ctx.strokeStyle = 'rgba(190,170,120,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 1, top); ctx.quadraticCurveTo(x + rx * 0.03, top - ry * 0.17, x + rx * 0.18, top - ry * 0.29); ctx.stroke();
  ctx.restore();
}

// ================================================================== Mars

const NAME = 'mars';
const COL = [215, 110, 70];
const T_IN = -0.25;          // Mars is marked as soon as the pull-out brings it into frame (before its name)
const T_OPEN = 0.65;         // "a mustard seed" (the inset is screen space: it lands on the word)
const T_LEAD = 1.1;          // reticle + leader tie it back to Mars once the body has arrived
const T_LABEL = 1.8;         // "thirty-nine meters out"
const INSET = [312, 744];
const R_IN = 160;          // wide enough for MARS + MUSTARD SEED on one row at full tag size

// dark albedo features (lon, lat in rad; size as fraction of the radius)
const MARKS = [
  [0.2, 0.15, 0.32, 0.16, 0.55],   // Syrtis Major-like wedge
  [1.4, -0.3, 0.45, 0.14, 0.45],
  [2.6, 0.05, 0.3, 0.2, 0.4],
  [3.9, -0.15, 0.5, 0.13, 0.5],
  [5.0, 0.3, 0.28, 0.12, 0.35],
  [0.9, -0.6, 0.55, 0.1, 0.3],
];

export function drawMars(ctx, x, y, r, la, t) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
  g.addColorStop(0, '#d9824f');
  g.addColorStop(1, '#a8532f');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  const rot = t * 0.22;
  for (const [lon, lat, sx, sy, a] of MARKS) {
    const l = lon + rot;
    const c = Math.cos(l);
    if (c < -0.1) continue;
    const px = x + r * Math.cos(lat) * Math.sin(l), py = y - r * Math.sin(lat);
    ctx.fillStyle = `rgba(95,42,26,${a * L.clamp(c * 3)})`;
    ctx.beginPath(); ctx.ellipse(px, py, Math.max(0, r * sx * Math.max(0.15, c)), Math.max(0, r * sy), 0.25, 0, Math.PI * 2); ctx.fill();
  }
  // polar cap: a soft frosty patch on the north limb (shaded with the globe below)
  ctx.save();
  ctx.translate(x, y - r * 0.9); ctx.scale(1, 0.42);
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
  cg.addColorStop(0, 'rgba(248,242,234,0.7)');
  cg.addColorStop(0.55, 'rgba(248,242,234,0.45)');
  cg.addColorStop(1, 'rgba(248,242,234,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // thin dust haze
  ctx.fillStyle = 'rgba(240,180,140,0.08)';
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  shadeSphere(ctx, x, y, r, la, { night: 0.85, sheen: 0.12 });
  ctx.restore();
  rimLight(ctx, x, y, r, la, [255, 190, 150], 0.4);
}

const SEED_DOTS = (() => { const r = L.rng(505); return Array.from({ length: 70 }, () => [r() * 2 - 1, r() * 2 - 1, 0.6 + r() * 1.2, r()]); })();

function mustardSeed(ctx, x, y, r, la) {
  const lx = Math.cos(la), ly = Math.sin(la);
  contactShadow(ctx, x - lx * r * 0.2, y + r * 0.92, r * 1.05, r * 0.24, 0.65);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.94, -0.3, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(x + lx * r * 0.3, y + ly * r * 0.3, 0, x, y, r);
  g.addColorStop(0, '#e9c47a');
  g.addColorStop(0.6, '#c99a4c');
  g.addColorStop(1, '#8a6128');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  // fine reticulate seed coat
  for (const [u, w, s, b] of SEED_DOTS) {
    if (u * u + w * w > 1) continue;
    ctx.fillStyle = b < 0.5 ? 'rgba(90,60,20,0.16)' : 'rgba(255,235,190,0.10)';
    ctx.beginPath(); ctx.arc(x + u * r, y + w * r, s, 0, Math.PI * 2); ctx.fill();
  }
  // hilum: the little scar where it attached to the pod
  ctx.fillStyle = 'rgba(80,50,20,0.55)';
  ctx.beginPath(); ctx.ellipse(x - lx * r * 0.55, y - ly * r * 0.55, r * 0.1, r * 0.06, la, 0, Math.PI * 2); ctx.fill();
  shadeSphere(ctx, x, y, r, la, { night: 0.7, sheen: 0.28 });
  ctx.restore();
}

export default {
  beat: 6,
  chapter: { num: '05', title: 'Mars', sub: 'The red planet' },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.1, name: 'riser', gain: 0.14, pitch: 1.1 },
      { t: T_IN + 0.1, name: 'ping', gain: 0.22, pitch: 1.25 },
      { t: T_OPEN, name: 'bloom', gain: 0.26, pitch: 1.15 },
      { t: T_LABEL, name: 'tick', gain: 0.24, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    drawOrbit(ctx, v, NAME, 0.05, 1.45);
    drawBody(ctx, v, NAME, COL, T_IN);
  },
  drawOverlay(ctx, v) {
    const p = pos(NAME);
    drawInset(ctx, v, {
      body: [v.wx(p.x), v.wy(p.y)], c: INSET, R: R_IN, tOpen: T_OPEN, tLead: T_LEAD,
      tags: [['MARS', -70, 56], ['MUSTARD SEED', 52, 56]],
      scale: { dy: 94, len: 1, px: 68, minor: 0.1, tag: '1 MM' },   // Mars 82 px = 1.2 mm → 68 px per mm
      content(c, cx, cy, R, la, kc) {
        stagger(c, kc, 0, () => drawMars(c, cx - 70, cy - 22, 41, la, v.gt));
        stagger(c, kc, 1, () => mustardSeed(c, cx + 52, cy - 22, 45, la));
      },
    });
    const k = Math.min(v.k, L.prog(v.t, T_LABEL, 0.55)) * labelOut(v);
    labelScrim(ctx, k, '1.2 mm', '39 m · 129 ft from the Sun');
    L.bigLabel(ctx, { x: 80, y: 480, big: '1.2 mm', small: '39 m · 129 ft from the Sun', k, accent: v.accent });
  },
};
