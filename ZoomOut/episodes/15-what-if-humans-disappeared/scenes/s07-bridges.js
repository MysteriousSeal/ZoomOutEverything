// Beat 7 — "Within a few centuries, | steel bridges and towers would rust and fall."
// The three East River suspension bridges, top-down: deck, two towers, the main cables along the deck edges, and
// a low-sun shadow on the water that reveals their profile (the cable sag between the towers). They exist for the
// whole film (deck lamps lit until the blackout reaches them). In beat 7 they rust (colour shift + spreading rust
// patches); then, staggered, the cables snap (spark), the main span breaks into three pieces that drop into the
// river (shadow converges onto the piece as it falls, it shrinks away from the camera), splash, ripple and sink.
// A few Lower Manhattan towers (long shadows standing in the young forest) slump into dust on "towers".
// Persists: towers and side spans of the bridges (stubs), sunken deck pieces, tower rubble.
import * as L from '../../../../engine/runtime/lib.js';
import { onLand, litAt, cityState, glowDot, LAMP } from '../env.js';
import { BRIDGES, SUN_DIR } from '../camera.js';

const B = (v, b) => v.tl.scenes[b].start;
const SH = { x: -SUN_DIR.x * 0.95, y: -SUN_DIR.y * 0.95 };   // shadow offset per metre of height (low sun)
// real decks, only a touch wider than life (they read at the beat-7 framing, 1.9 m/px); long low-sun shadows show
// the towers and the cable sag on the water
const WM = 1.2;                                  // deck width multiplier
const SHB = { x: SH.x * 2.3, y: SH.y * 2.3 };     // bridge shadow offset per metre of height
const T_RUST = [0.3, 2.0];
const T_LABEL = 0.8;

const STEEL = [112, 122, 136], RUST = [150, 74, 38], STONE = [150, 140, 122], STONE_OLD = [118, 104, 86];
const ASPHALT = [40, 43, 50], ASPHALT_OLD = [52, 42, 38];

// ------------------------------------------------------------------ bridges
// real dimensions: deck width (m), side spans (tower to anchorage, m), deck / tower heights above the water (m)
const SPEC = [
  { key: 'williamsburg', w: 36, side: 182, hDeck: 41, hTower: 91, stone: false, fall: 2.35 },
  { key: 'manhattan', w: 37, side: 221, hDeck: 41, hTower: 102, stone: false, fall: 2.75 },
  { key: 'brooklyn', w: 26, side: 283, hDeck: 41, hTower: 84, stone: true, fall: 3.2 },
];
const BR = SPEC.map((s, bi) => {
  const T = BRIDGES[s.key];                        // the two main-span towers (real positions)
  const ml = Math.hypot(T.x1 - T.x0, T.y1 - T.y0);
  const d = { x: (T.x1 - T.x0) / ml, y: (T.y1 - T.y0) / ml }, n = { x: -d.y, y: d.x };
  // the deck runs from anchorage to anchorage: towers ± the side spans
  const g = { x0: T.x0 - d.x * s.side, y0: T.y0 - d.y * s.side, x1: T.x1 + d.x * s.side, y1: T.y1 + d.y * s.side };
  const len = ml + 2 * s.side;
  const at = (u) => ({ x: g.x0 + (g.x1 - g.x0) * u, y: g.y0 + (g.y1 - g.y0) * u });
  const t1 = s.side / len, t2 = 1 - s.side / len;
  const r = L.rng(700 + bi);
  const b1 = L.lerp(t1, t2, 0.34 + (r() - 0.5) * 0.08), b2 = L.lerp(t1, t2, 0.67 + (r() - 0.5) * 0.08);
  // the middle piece drops first; the outer pieces tear off the towers a beat later and twist as they go
  const pieces = [[t1 + 6 / len, b1, 1], [b1, b2, 0], [b2, t2 - 6 / len, 2]].map(([u0, u1, order], i) => ({
    u0, u1, delay: order * 0.16, spin: (i - 1 || (r() - 0.5)) * (0.22 + r() * 0.12), drift: (i - 1) * (14 + r() * 10), i,
  }));
  const patches = Array.from({ length: 26 }, () => ({ u: r(), off: (r() - 0.5) * 0.9, s: 6 + r() * 14, th: r() * 0.9 }));
  return { ...s, w: s.w * WM, ...g, len, d, n, at, t1, t2, b1, b2, pieces, patches, ml };
});

/** Cable height (m) along the deck. */
function cableH(b, u) {
  if (u <= b.t1) return b.hDeck + (b.hTower - b.hDeck) * L.clamp(u / b.t1) ** 1.3;
  if (u >= b.t2) return b.hDeck + (b.hTower - b.hDeck) * L.clamp((1 - u) / (1 - b.t2)) ** 1.3;
  const m = (b.t1 + b.t2) / 2, h = (b.t2 - b.t1) / 2;
  return b.hDeck + 4 + (b.hTower - b.hDeck - 4) * ((u - m) / h) ** 2;
}

// world point on the deck at u, side offset s (m), height h (m) projected as a shadow
const P = (b, u, s = 0) => { const p = b.at(u); return { x: p.x + b.n.x * s, y: p.y + b.n.y * s }; };

function quad(c, v, pts) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(v.wx(p.x), v.wy(p.y)) : c.moveTo(v.wx(p.x), v.wy(p.y))));
  c.closePath();
}

/** State of one main-span piece at beat-7 time t: fall progress, height, sink. */
function pieceState(b, pc, t) {
  const tf = b.fall + pc.delay;
  const p = L.ease.inCubic(L.prog(t, tf, 0.62));
  const hit = t - (tf + 0.62);
  return { p, h: b.hDeck * (1 - p), hit, sink: L.ease.outCubic(L.clamp(hit / 0.9)), sc: 1 - 0.18 * p };
}

function deckSegment(c, v, b, u0, u1, col, shadowH, opts = {}) {
  const w = b.w / 2;
  const { scale = 1, rot = 0, dx = 0, dy = 0, alpha = 1, rails = true } = opts;
  const um = (u0 + u1) / 2, cm = b.at(um);
  const tf = (p) => {
    // transform about the piece centre: scale (falling away), small rotation, drift
    const x = (p.x - cm.x) * scale, y = (p.y - cm.y) * scale;
    return { x: cm.x + x * Math.cos(rot) - y * Math.sin(rot) + dx, y: cm.y + x * Math.sin(rot) + y * Math.cos(rot) + dy };
  };
  const pts = [P(b, u0, -w), P(b, u1, -w), P(b, u1, w), P(b, u0, w)].map(tf);
  if (shadowH != null) {
    c.fillStyle = `rgba(0,0,0,${0.55 * alpha})`;
    quad(c, v, pts.map((p) => ({ x: p.x + SHB.x * shadowH, y: p.y + SHB.y * shadowH })));
    c.fill();
    return;
  }
  c.fillStyle = L.rgba(col, alpha);
  quad(c, v, pts);
  c.fill();
  if (rails) {
    c.strokeStyle = L.rgba(L.mix(col, [0, 0, 0], 0.4), 0.8 * alpha);
    c.lineWidth = Math.max(0.6, v.ws(1.2));
    c.beginPath();
    c.moveTo(v.wx(pts[0].x), v.wy(pts[0].y)); c.lineTo(v.wx(pts[1].x), v.wy(pts[1].y));
    c.moveTo(v.wx(pts[3].x), v.wy(pts[3].y)); c.lineTo(v.wx(pts[2].x), v.wy(pts[2].y));
    c.stroke();
    // centre divider
    const a = tf(P(b, u0, 0)), z = tf(P(b, u1, 0));
    c.strokeStyle = L.rgba([0, 0, 0], 0.35 * alpha);
    c.lineWidth = Math.max(0.6, v.ws(2.5));
    c.beginPath(); c.moveTo(v.wx(a.x), v.wy(a.y)); c.lineTo(v.wx(z.x), v.wy(z.y)); c.stroke();
  }
}

function cablePath(c, v, b, u0, u1, side, shadow, wob = null) {
  c.beginPath();
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const u = L.lerp(u0, u1, i / n);
    const p = P(b, u, side);
    let x = p.x, y = p.y;
    if (shadow) { const h = cableH(b, u); x += SHB.x * h; y += SHB.y * h; }
    if (wob) { const f = wob(i / n); x += b.n.x * f; y += b.n.y * f; }
    i ? c.lineTo(v.wx(x), v.wy(y)) : c.moveTo(v.wx(x), v.wy(y));
  }
}

function drawBridge(c, v, b, t, st) {
  // outside its own beat, a bridge that crosses the caption band (y 1250-1420) steps back so text stays clean
  const ys = v.wy((b.y0 + b.y1) / 2);
  const own = t < v.d + 0.6 ? L.smoothstep(L.clamp((t - 0.7) / 0.6)) : 0;   // fully itself once the beat-7 camera lands
  const band = 1 - 0.75 * (1 - own) * L.clamp(1 - Math.max(0, Math.abs(ys - 1335) - 70) / 60);
  if (band < 1) { c.save(); c.globalAlpha *= band; drawBridgeBody(c, v, b, t, st); c.restore(); } else drawBridgeBody(c, v, b, t, st);
}
function drawBridgeBody(c, v, b, t, st) {
  const cx = v.wx((b.x0 + b.x1) / 2), cy = v.wy((b.y0 + b.y1) / 2), half = v.ws(b.len / 2) + 80;
  if (cx + half < 0 || cx - half > L.W || cy + half < 0 || cy - half > L.H) return;
  if (v.ws(b.w) < 0.6) return;
  const rk = L.smoothstep(L.prog(t, T_RUST[0], T_RUST[1]));
  const steel = L.mix(b.stone ? STONE : STEEL, b.stone ? STONE_OLD : RUST, rk);
  const cableCol = L.mix([214, 222, 232], [204, 132, 88], rk);   // cables stay lighter than the rusted deck
  const deckCol = L.mix(ASPHALT, ASPHALT_OLD, rk);
  const dayK = 0.75 + 0.25 * st.day;
  const w = b.w / 2;
  const snap = b.fall - 0.32;
  const snapped = t > snap;
  const recoil = L.ease.outCubic(L.prog(t, snap, 0.5));
  const mid = (b.t1 + b.t2) / 2;
  const PS = b.pieces.map((pc) => pieceState(b, pc, t));

  // ---- a soft sheen on the water around the bridge (makes its shadow read, and leads the eye)
  {
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, half);
    g.addColorStop(0, `rgba(80,110,140,${0.16 * (1 - 0.5 * st.day)})`); g.addColorStop(1, 'rgba(80,110,140,0)');
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.translate(cx, cy); c.rotate(Math.atan2(b.d.y, b.d.x)); c.scale(1, 0.4); c.translate(-cx, -cy);
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, half, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // ---- shadows on the water
  c.save();
  deckSegment(c, v, b, 0, b.t1, null, b.hDeck * 0.6);
  deckSegment(c, v, b, b.t2, 1, null, b.hDeck * 0.6);
  b.pieces.forEach((pc, i) => {
    const s = PS[i];
    if (s.hit > 0) return;
    deckSegment(c, v, b, pc.u0, pc.u1, null, s.h, { scale: s.sc, rot: pc.spin * s.p, dx: b.d.x * pc.drift * s.p, dy: b.d.y * pc.drift * s.p });
  });
  // the cable shadows: a strong dark catenary on the water, clearly offset from the deck (shows the sag)
  c.strokeStyle = 'rgba(0,0,0,0.74)';
  c.lineWidth = Math.max(2.6, v.ws(10));
  c.lineCap = 'round';
  for (const side of [-w, w]) {
    if (!snapped) { cablePath(c, v, b, 0, 1, side, true); c.stroke(); } else {
      cablePath(c, v, b, 0, b.t1, side, true); c.stroke();
      cablePath(c, v, b, b.t2, 1, side, true); c.stroke();
    }
  }
  // tower shadows: the footprint swept up to the top
  for (const u of [b.t1, b.t2]) {
    const a = P(b, u, 0), z = { x: a.x + SHB.x * b.hTower, y: a.y + SHB.y * b.hTower };
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.lineWidth = v.ws(w * (b.stone ? 2.5 : 2.3));
    c.lineCap = 'butt';
    c.beginPath(); c.moveTo(v.wx(a.x), v.wy(a.y)); c.lineTo(v.wx(z.x), v.wy(z.y)); c.stroke();
  }
  c.restore();

  // ---- sunken pieces (under the surface: dark, water-tinted, fading)
  b.pieces.forEach((pc, i) => {
    const s = PS[i];
    if (s.hit <= 0) return;
    deckSegment(c, v, b, pc.u0, pc.u1, L.mix(deckCol, [10, 24, 34], 0.55 + 0.4 * s.sink), null,
      { scale: 0.82, rot: pc.spin, dx: b.d.x * pc.drift, dy: b.d.y * pc.drift, alpha: L.lerp(0.75, 0, s.sink), rails: false });
  });

  // ---- deck: side spans (stubs) + main pieces in the air
  deckSegment(c, v, b, -0.02, b.t1 + 0.002, L.mix(deckCol, [0, 0, 0], 0.1 * (1 - dayK)));
  deckSegment(c, v, b, b.t2 - 0.002, 1.02, deckCol);
  b.pieces.forEach((pc, i) => {
    const s = PS[i];
    if (s.hit > 0) return;
    const col = L.mix(deckCol, [14, 22, 30], 0.6 * s.p);
    deckSegment(c, v, b, pc.u0, pc.u1, col, null, { scale: s.sc, rot: pc.spin * s.p, dx: b.d.x * pc.drift * s.p, dy: b.d.y * pc.drift * s.p });
  });
  // anchorages: the massive masonry blocks where the cables are tied down (at both deck ends), with their shadows
  for (const u of [0, 1]) {
    const A = b.at(u), al = 22, ac = w * 1.7;
    const corners = [[-al, -ac], [al, -ac], [al, ac], [-al, ac]].map(([a2, c2]) => ({ x: A.x + b.d.x * a2 + b.n.x * c2, y: A.y + b.d.y * a2 + b.n.y * c2 }));
    c.fillStyle = 'rgba(0,0,0,0.4)';
    quad(c, v, corners.map((p) => ({ x: p.x + SH.x * 30, y: p.y + SH.y * 30 }))); c.fill();
    c.fillStyle = L.rgba(L.mix(b.stone ? STONE : [120, 116, 110], STONE_OLD, rk * 0.6));
    quad(c, v, corners); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1; c.stroke();
  }
  // rust patches spreading on the deck
  if (rk > 0.02) {
    for (const pt of b.patches) {
      const a = L.clamp((rk - pt.th) / 0.2);
      if (a <= 0) continue;
      if (pt.u > b.t1 && pt.u < b.t2 && snapped) continue;   // the falling span carries its rust with it (kept simple)
      const p = P(b, pt.u, pt.off * w * 2);
      c.fillStyle = L.rgba([168, 82, 36], 0.45 * a);
      c.beginPath(); c.ellipse(v.wx(p.x), v.wy(p.y), Math.max(0, v.ws(pt.s)), Math.max(0, v.ws(pt.s * 0.35)), Math.atan2(b.d.y, b.d.x), 0, Math.PI * 2); c.fill();
    }
  }

  // ---- cables (over the deck edges); after the snap the main-span halves whip back to the towers
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = L.rgba(cableCol, 0.95);
  c.lineWidth = Math.max(2, v.ws(4));
  for (const side of [-w, w]) {
    cablePath(c, v, b, -0.01, b.t1, side, false); c.stroke();
    cablePath(c, v, b, b.t2, 1.01, side, false); c.stroke();
    if (!snapped) { cablePath(c, v, b, b.t1, b.t2, side, false); c.stroke(); } else if (recoil < 1) {
      const wob = (q) => Math.sin(q * Math.PI * 3 + t * 30) * 9 * (1 - recoil) * q;
      const e1 = L.lerp(mid, b.t1, recoil), e2 = L.lerp(mid, b.t2, recoil);
      c.globalAlpha = 1 - recoil * 0.6;
      cablePath(c, v, b, b.t1, e1, side, false, wob); c.stroke();
      cablePath(c, v, b, b.t2, e2, side, false, wob); c.stroke();
      c.globalAlpha = 1;
    }
  }
  c.restore();
  // snap spark
  const sk = t > snap ? Math.exp(-(t - snap) / 0.18) : 0;
  if (sk > 0.01) {
    for (const side of [-w, w]) {
      const p = P(b, mid, side);
      glowDot(c, v.wx(p.x), v.wy(p.y), 40 * sk + 8, [255, 210, 150], sk);
      glowDot(c, v.wx(p.x), v.wy(p.y), 10, [255, 255, 255], sk);
    }
  }

  // ---- towers (stay standing): wide masonry/steel piers, lit edge toward the sun, dark edge away from it
  for (const u of [b.t1, b.t2]) {
    const tw = w * (b.stone ? 1.35 : 1.22), td = b.stone ? 15 : 8;
    const pts = [
      { x: P(b, u, -tw).x - b.d.x * td, y: P(b, u, -tw).y - b.d.y * td }, { x: P(b, u, -tw).x + b.d.x * td, y: P(b, u, -tw).y + b.d.y * td },
      { x: P(b, u, tw).x + b.d.x * td, y: P(b, u, tw).y + b.d.y * td }, { x: P(b, u, tw).x - b.d.x * td, y: P(b, u, tw).y - b.d.y * td },
    ];
    c.fillStyle = L.rgba(L.mix(steel, [255, 255, 255], 0.32));
    quad(c, v, pts); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = Math.max(1, v.ws(2.5));
    c.stroke();
    // bright lit edges: the two edges whose outward normal faces the sun (screen space)
    const S = pts.map((p) => [v.wx(p.x), v.wy(p.y)]);
    const cxT = S.reduce((q, p) => q + p[0], 0) / 4, cyT = S.reduce((q, p) => q + p[1], 0) / 4;
    c.strokeStyle = L.rgba(L.mix(steel, [255, 244, 222], 0.75), 0.95);
    c.lineWidth = Math.max(1.6, v.ws(5));
    c.lineCap = 'round';
    c.beginPath();
    for (let e = 0; e < 4; e++) {
      const [ax, ay] = S[e], [zx, zy] = S[(e + 1) % 4];
      const mx = (ax + zx) / 2 - cxT, my = (ay + zy) / 2 - cyT;
      if (mx * SUN_DIR.x + my * SUN_DIR.y > 0) { c.moveTo(ax, ay); c.lineTo(zx, zy); }
    }
    c.stroke();
    if (b.stone) {   // the two gothic arches, seen from above as two dark slots
      c.fillStyle = 'rgba(0,0,0,0.45)';
      for (const s of [-w * 0.5, w * 0.5]) {
        const p = P(b, u, s);
        c.beginPath(); c.ellipse(v.wx(p.x), v.wy(p.y), Math.max(0, v.ws(5)), Math.max(0, v.ws(9)), Math.atan2(b.d.y, b.d.x), 0, Math.PI * 2); c.fill();
      }
    }
  }

  // ---- deck lamps while the city is lit
  if (st.blackR !== Infinity && st.day < 0.95) {
    const step = 70 / b.len;
    for (let u = 0.02; u < 0.99; u += step) {
      if (u > b.t1 && u < b.t2 && snapped) continue;
      const lk = litAt(v, b.at(u).x, b.at(u).y, st) * (1 - st.day);
      if (lk <= 0.01) continue;
      for (const side of [-w, w]) { const p = P(b, u, side); glowDot(c, v.wx(p.x), v.wy(p.y), Math.max(4, v.ws(22)), LAMP, 0.7 * lk); }
    }
  }

  // ---- splashes + ripples where the pieces hit
  b.pieces.forEach((pc, i) => {
    const s = PS[i];
    if (s.hit <= 0 || s.hit > 2.4) return;
    const p = b.at((pc.u0 + pc.u1) / 2);
    const X = v.wx(p.x + b.d.x * pc.drift), Y = v.wy(p.y + b.d.y * pc.drift);
    const L0 = v.ws((pc.u1 - pc.u0) * b.len);
    const foam = Math.exp(-s.hit / 0.6);
    // foam: irregular white water along the piece, boiling out and fading
    {
      const r = L.rng(900 + i * 13 + Math.floor(b.len));
      const ang = Math.atan2(b.d.y, b.d.x) + pc.spin;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (let k = 0; k < 16; k++) {
        const along = (r() - 0.5) * L0 * 1.05, across = (r() - 0.5) * v.ws(b.w) * 2.2;
        const grow = L.ease.outCubic(L.clamp(s.hit / 0.7));
        const rr = (3 + r() * 9) * (0.6 + 1.2 * grow) * Math.max(0.6, v.ws(b.w) / 14);
        const a = 0.7 * foam * (0.5 + r() * 0.5);
        const fx = X + ca * along - sa * across * (1 + grow), fy = Y + sa * along + ca * across * (1 + grow);
        glowDot(c, fx, fy, rr * 2.0, [190, 212, 228], a * 0.55);
      }
    }
    for (let k = 0; k < 3; k++) {
      const u = L.prog(s.hit, k * 0.25, 1.8);
      if (u <= 0 || u >= 1) continue;
      const rr = L0 * 0.45 + v.ws(260) * L.ease.outCubic(u);
      c.strokeStyle = `rgba(200,225,240,${0.35 * (1 - u)})`;
      c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(X, Y, Math.max(0, rr), Math.max(0, rr * 0.55), Math.atan2(b.d.y, b.d.x), 0, Math.PI * 2); c.stroke();
    }
    // impact flash: a brief white burst along the piece
    const fl = Math.exp(-s.hit / 0.14);
    if (fl > 0.02) {
      glowDot(c, X, Y, L0 * 0.75 + 30, [235, 245, 255], 0.9 * fl);
      glowDot(c, X, Y, L0 * 0.35 + 12, [255, 255, 255], fl);
    }
    // spray: droplets thrown out along and across the piece, arcing back down
    const r = L.rng(300 + i * 7 + b.len);
    const u = L.clamp(s.hit / 1.1);
    if (u < 1) {
      const ang = Math.atan2(b.d.y, b.d.x), ca = Math.cos(ang), sa = Math.sin(ang);
      for (let k = 0; k < 40; k++) {
        const along = (r() - 0.5) * L0 * 0.95, a = r() * Math.PI * 2, sp = (25 + r() * 70) * Math.max(1, v.ws(b.w) / 14);
        const e = L.ease.outCubic(u);
        const px = X + ca * along + Math.cos(a) * sp * e, py = Y + sa * along + Math.sin(a) * sp * 0.6 * e;
        c.fillStyle = `rgba(235,244,250,${0.9 * (1 - u) * (0.5 + 0.5 * r())})`;
        c.beginPath(); c.arc(px, py, Math.max(0, (1.4 + r() * 2.2) * (1 - 0.5 * u)), 0, Math.PI * 2); c.fill();
      }
    }
  });
}

// ------------------------------------------------------------------ Lower Manhattan towers
// Steel-framed high-rises between the Civic Center and the Two Bridges waterfront, seen from a high oblique satellite:
// each one is an extruded block (lit and shaded facades leaning away from the frame centre, a roof with its plant
// box) with a long sheared shadow on the forest. On "towers… fall" they tilt, sag and pancake into a rubble patch
// under a billowing grey dust cloud. [x, y, w, d, height m, collapse time (beat-7 s), fall direction (rad)]
const TOWERS = [
  [230, -1170, 84, 72, 210, 3.15, 2.4], [470, -1060, 74, 74, 250, 3.5, -0.6], [330, -700, 92, 76, 300, 3.75, 2.9],
  [600, -520, 78, 70, 240, 4.05, 0.4], [140, -900, 84, 84, 280, 4.3, 1.9],
].filter(([x, y]) => onLand(x, y));
const DUST = [150, 146, 138];

function drawTower(c, v, tw, t7, vis, rk) {
  const [x, y, w, d, H, tc, fdir] = tw;
  const X = v.wx(x), Y = v.wy(y);
  if (X < -300 || X > L.W + 300 || Y < -300 || Y > L.H + 300) return;
  const fall = L.ease.inCubic(L.prog(t7, tc, 1.0));
  const tilt = Math.sin(Math.min(1, fall * 1.3) * Math.PI / 2) * 0.32;      // up to ~18°
  const h = H * (1 - fall) * Math.cos(tilt);
  const hw = w / 2, hd = d / 2;
  const roof = L.mix([150, 156, 164], [132, 118, 104], rk);
  const facade = L.mix([126, 134, 146], [128, 112, 98], rk);
  c.save();
  c.globalAlpha = vis;
  // the sheared shadow on the ground: hull of the footprint and the roof's shadow
  const lx = Math.cos(fdir) * H * Math.sin(tilt) * (1 - fall * 0.5), ly = Math.sin(fdir) * H * Math.sin(tilt) * (1 - fall * 0.5);
  const ox = SH.x * h + lx, oy = SH.y * h + ly;
  const foot = [[x - hw, y - hd], [x + hw, y - hd], [x + hw, y + hd], [x - hw, y + hd]];
  const hull = (pts) => {   // convex hull (monotone chain) of a few points, screen space
    pts.sort((a2, b2) => a2[0] - b2[0] || a2[1] - b2[1]);
    const cr = (o, a2, b2) => (a2[0] - o[0]) * (b2[1] - o[1]) - (a2[1] - o[1]) * (b2[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  if (h > 2) {
    const sh = hull([...foot, ...foot.map(([a2, b2]) => [a2 + ox, b2 + oy])].map(([a2, b2]) => [v.wx(a2), v.wy(b2)]));
    c.fillStyle = 'rgba(0,0,0,0.46)';
    c.beginPath(); sh.forEach(([a2, b2], i) => (i ? c.lineTo(a2, b2) : c.moveTo(a2, b2))); c.closePath(); c.fill();
  }
  if (fall < 1) {
    // oblique view: the roof leans away from the frame centre in proportion to the height (plus the topple)
    const ex = X - L.W / 2, ey = Y - L.H * v.cam.anchor, en = Math.hypot(ex, ey) || 1;
    const lean = v.ws(h) * 0.2;
    const rx = (ex / en) * lean + v.ws(lx), ry = (ey / en) * lean + v.ws(ly);
    const bx0 = X - v.ws(hw), bx1 = X + v.ws(hw), by0 = Y - v.ws(hd), by1 = Y + v.ws(hd);
    const corners = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]];
    for (let e = 0; e < 4; e++) {
      const [ax, ay] = corners[e], [zx, zy] = corners[(e + 1) % 4];
      const nx = zy - ay, ny = -(zx - ax);
      if (nx * rx + ny * ry >= 0) continue;               // only the faces turned toward the nadir (the viewer) show
      const lit = L.clamp(0.5 + 0.5 * (nx * SUN_DIR.x + ny * SUN_DIR.y) / Math.hypot(nx, ny));
      const g = c.createLinearGradient(ax, ay, ax + rx, ay + ry);
      g.addColorStop(0, L.rgba(L.mix(facade, [0, 0, 0], 0.45 - 0.25 * lit)));
      g.addColorStop(1, L.rgba(L.mix(L.mix(facade, [0, 0, 0], 0.25 * (1 - lit)), [240, 232, 216], 0.4 * lit)));
      c.fillStyle = g;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(zx, zy); c.lineTo(zx + rx, zy + ry); c.lineTo(ax + rx, ay + ry); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(10,14,20,0.35)';          // floor lines + window mullions
      c.lineWidth = 1;
      c.beginPath();
      for (let f = 0.08; f < 1; f += 0.08) { c.moveTo(ax + rx * f, ay + ry * f); c.lineTo(zx + rx * f, zy + ry * f); }
      for (let f = 0.2; f < 1; f += 0.2) { const qx = L.lerp(ax, zx, f), qy = L.lerp(ay, zy, f); c.moveTo(qx, qy); c.lineTo(qx + rx, qy + ry); }
      c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.5)';
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + rx, ay + ry); c.moveTo(zx, zy); c.lineTo(zx + rx, zy + ry); c.stroke();
    }
    c.fillStyle = L.rgba(L.mix(roof, [50, 46, 42], fall));
    c.fillRect(bx0 + rx, by0 + ry, bx1 - bx0, by1 - by0);
    c.strokeStyle = L.rgba([240, 232, 218], 0.55 * (1 - fall));
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(bx0 + rx, by1 + ry); c.lineTo(bx0 + rx, by0 + ry); c.lineTo(bx1 + rx, by0 + ry); c.stroke();
    c.fillStyle = L.rgba(L.mix(roof, [0, 0, 0], 0.3));
    const cw2 = (bx1 - bx0) * 0.4, ch2 = (by1 - by0) * 0.34;
    c.fillRect(X + rx - cw2 / 2, Y + ry - ch2 / 2, cw2, ch2);
  }
  if (fall > 0.2) {   // the rubble patch: a heap spread past the footprint toward the fall direction
    const k = L.clamp((fall - 0.2) / 0.6);
    const r = L.rng(Math.floor(x * 3 + y));
    for (let q = 0; q < 26; q++) {
      const s2 = r();
      const rx = (r() - 0.5) * w * 1.5 + Math.cos(fdir) * w * 0.5 * s2, ry = (r() - 0.5) * d * 1.5 + Math.sin(fdir) * d * 0.5 * s2, rs = 6 + r() * 14;
      c.fillStyle = L.rgba(L.mix([70, 66, 62], [128, 118, 104], r()), 0.95 * k);
      c.save(); c.translate(v.wx(x + rx), v.wy(y + ry)); c.rotate(r() * 3);
      c.fillRect(-v.ws(rs) / 2, -v.ws(rs * 0.7) / 2, v.ws(rs), v.ws(rs * 0.7)); c.restore();
    }
  }
  // dust: billows out from the base as it pancakes, then drifts with the wind (toward the upper left)
  const du = L.prog(t7, tc + 0.2, 2.6);
  if (du > 0 && du < 1) {
    const r = L.rng(Math.floor(x + y * 7));
    for (let k = 0; k < 14; k++) {
      const a = r() * Math.PI * 2, dd = (20 + r() * 120) * L.ease.outCubic(du);
      const px = x + Math.cos(a) * dd - 60 * du, py = y + Math.sin(a) * dd * 0.8 - 40 * du;
      const rr = v.ws((40 + r() * 50) * (0.6 + 1.1 * L.ease.outCubic(du)));
      const g = c.createRadialGradient(v.wx(px), v.wy(py), 0, v.wx(px), v.wy(py), Math.max(1, rr));
      const a0 = 0.5 * Math.sin(Math.PI * Math.min(1, du * 2.0)) * (1 - du * 0.5);
      g.addColorStop(0, L.rgba(DUST, a0)); g.addColorStop(0.6, L.rgba(DUST, a0 * 0.45)); g.addColorStop(1, L.rgba(DUST, 0));
      c.fillStyle = g;
      c.fillRect(v.wx(px) - rr, v.wy(py) - rr, rr * 2, rr * 2);
    }
  }
  c.restore();
}

export default {
  beat: 7,
  chapter: { num: '07', title: 'Rust', sub: 'a few centuries' },
  captions: true,
  layer: 4,
  cues(d) {
    const out = [
      { t: T_RUST[0] + 0.2, name: 'creak', gain: 0.3, pitch: 0.7 },
      { t: T_LABEL, name: 'swish', gain: 0.18, pitch: 1.0 },
    ];
    for (const b of BR) {
      out.push({ t: b.fall - 0.32, name: 'ping', gain: 0.24, pitch: 1.7 });
      out.push({ t: b.fall + 0.05, name: 'creak', gain: 0.26, pitch: 0.9 });
      out.push({ t: b.fall + 0.62, name: 'splash', gain: 0.36, pitch: 0.8 });
    }
    out.push({ t: BR[0].fall + 0.62, name: 'impact', gain: 0.34, pitch: 0.7 });
    for (const tw of TOWERS.slice(0, 3)) out.push({ t: tw[5] + 0.3, name: 'deep', gain: 0.22, pitch: 0.8 });
    return out;
  },

  drawWorld(ctx, v) {
    if (v.cam.mpp > 60) return;
    const t7 = v.gt - B(v, 7);
    const st = cityState(v);
    // towers rise out of the forest as beat 7 starts (fading in with the camera's lean-in)
    const tvis = L.ease.inOutCubic(L.prog(t7, -0.6, 0.9)) * (1 - L.clamp(L.invLerp(2.6, 4.2, v.cam.mpp)));   // only once they read as buildings
    const rk = L.smoothstep(L.prog(t7, T_RUST[0], T_RUST[1]));
    if (tvis > 0.01) for (const tw of TOWERS) drawTower(ctx, v, tw, t7, tvis, rk);
    for (const b of BR) drawBridge(ctx, v, b, t7, st);
  },

  drawOverlay(ctx, v) {
    const k = L.enter(v.t, T_LABEL, 0.55) * v.k;
    L.bigLabel(ctx, { x: 64, y: 560, big: 'A FEW CENTURIES', small: 'steel rusts and falls', k, accent: v.accent, size: 84 });
  },
};
