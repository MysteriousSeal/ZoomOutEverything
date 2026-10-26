// Beat 8 (10c; beat 12 in 10b) — "We only just arrived."
// The pull-back: from inside the last second all the way out to the whole year. The life sliver (s10)
// shrinks into a glowing pinpoint that the eye rides into the bottom-right corner of Dec 31 while the
// line plays. As the year settles, the story's cells relight in order — Jan 1, the Sun, the dinosaurs
// (10c: first life and the microbe era were cut from the narration, so they are not relit) — and the pinpoint pulses. A fine leader climbs the right margin
// to a final tag: YOU ARE HERE. Long still hold.
import * as L from '../../../../engine/runtime/lib.js';
const { W } = L;
import { YEAR_RECT, dayRect, hourRect, minuteRect } from '../camera.js';
import { ACCENT, HOT, pinAt } from './s06-you.js';
import { SUNC, glowCell } from './s00-hook.js';

const BEAT = 8;
// the relights start once the year is on screen (the pull-back settles at ~1.5 s; f10cb: was 3.35, the beat is now 3.67 s),
// so nothing lands half off-frame; the tag lands at 1.35 s and holds > 2 s before the question card
const T_LIT = 1.2, T_PIN = 1.45, T_LEAD = 1.2, T_TAG = 1.35;
const DINO = [178, 92, 166];                  // muted plum (the accent family, as in s06), dimmer than the pinpoint
const T_DINO = T_LIT + 0.42;

// story cells, in chronological order, with their light colour and beat time of relighting
const EVENTS = [
  { r: dayRect(0, 0), color: ACCENT, a: 1.0, t: T_LIT, lit: true },        // (s01 keeps it lit)                 // Big Bang, Jan 1
  { r: dayRect(8, 1), color: SUNC, a: 0.95, t: T_LIT + 0.14, lit: true },   // lit: s03 keeps this cell glowing, only flash it           // the Sun, Sept 2
  { r: dayRect(11, 30), color: ACCENT, a: 1.0, t: T_PIN - 0.08 },        // Dec 31: us
];
// the dinosaurs: one continuous band per calendar row (Dec 25–28, Dec 29–30), drawn as a whole
const DINO_RUNS = [[24, 27], [28, 29]].map(([a, b]) => { const r0 = dayRect(11, a), r1 = dayRect(11, b); return { x: r0.x, y: r0.y, w: r1.x + r1.w - r0.x, h: 1 }; });
/** Small sauropod silhouette centred at (x, y), body length L px (facing right). */
function sauropod(c, x, y, Lp) {
  const u = Lp / 10;
  c.beginPath();
  c.moveTo(x - 5 * u, y + 0.2 * u);                                         // tail tip
  c.quadraticCurveTo(x - 3 * u, y - 0.6 * u, x - 1.6 * u, y - 1.3 * u);
  c.quadraticCurveTo(x, y - 2.3 * u, x + 1.6 * u, y - 1.4 * u);            // back
  c.quadraticCurveTo(x + 2.6 * u, y - 2.6 * u, x + 3.4 * u, y - 4.2 * u);  // neck
  c.quadraticCurveTo(x + 4.2 * u, y - 4.9 * u, x + 4.8 * u, y - 4.2 * u);  // head
  c.lineTo(x + 4.6 * u, y - 3.8 * u);
  c.quadraticCurveTo(x + 3.6 * u, y - 3.4 * u, x + 2.6 * u, y - 0.6 * u);  // throat
  c.lineTo(x + 2.4 * u, y + 1.6 * u); c.lineTo(x + 1.6 * u, y + 1.6 * u); c.lineTo(x + 1.5 * u, y + 0.2 * u);   // front leg
  c.lineTo(x - 0.9 * u, y + 0.2 * u);
  c.lineTo(x - 1.0 * u, y + 1.6 * u); c.lineTo(x - 1.8 * u, y + 1.6 * u); c.lineTo(x - 1.9 * u, y - 0.1 * u);    // hind leg
  c.quadraticCurveTo(x - 3.2 * u, y + 0.1 * u, x - 5 * u, y + 0.2 * u);
  c.closePath();
}

/** The dinosaur run relit as solid rounded bands: wipes left to right, flashes, settles. Covers beat 6's leftovers. */
function drawDinoRun(c, v, t) {
  const dt = t - T_DINO;
  if (dt < 0) return;
  const wipe = L.ease.inOutCubic(L.clamp(dt / 0.5));
  const flash = Math.exp(-Math.max(0, dt - 0.3) / 0.4) * L.clamp(dt / 0.2);
  const total = DINO_RUNS.reduce((n, r) => n + r.w, 0);
  let acc = 0;
  for (const r of DINO_RUNS) {
    const f = L.clamp((wipe * total - acc) / r.w); acc += r.w;
    if (f <= 0) continue;
    const pad = 0.05;
    const x = v.wx(r.x + pad), y = v.wy(r.y + pad), w = v.ws(r.w - 2 * pad), h = v.ws(r.h - 2 * pad), rad = h * 0.28;
    c.save();
    c.beginPath(); c.rect(x - 4, y - 4, (w + 8) * f, h + 8); c.clip();
    // opaque base: hides beat 6's fills, seam and fossil outline underneath
    c.fillStyle = 'rgb(18, 11, 18)';
    c.fillRect(v.wx(r.x + 0.03), v.wy(r.y + 0.03), v.ws(r.w - 0.06), v.ws(r.h - 0.06));
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, L.rgba(L.mix(DINO, [255, 255, 255], 0.3 * flash), 0.62));
    g.addColorStop(1, L.rgba(DINO, 0.38));
    c.fillStyle = g;
    L.roundRect(c, x, y, w, h, rad); c.fill();
    c.strokeStyle = L.rgba(L.mix(DINO, [255, 255, 255], 0.3), 0.75);
    c.lineWidth = Math.max(1.5, h * 0.05);
    L.roundRect(c, x, y, w, h, rad); c.stroke();
    c.restore();
    L.lightBlob(c, x + w * f / 2, y + h / 2, Math.max(w, h) * 0.75, DINO, (0.1 + 0.25 * flash) * f);
  }
  // the sauropod glyph on the long band
  const gk = L.ease.outBack(L.clamp((dt - 0.35) / 0.4));
  if (gk > 0) {
    const r = DINO_RUNS[0];
    const Lp = v.ws(1.12) * gk, u = Lp / 10;                           // glyph spans -4.9u..+1.6u vertically
    const cx = v.wx(r.x + r.w / 2) + 0.3 * u, cy = v.wy(r.y + 0.5) + 1.65 * u;
    c.save();
    c.globalAlpha *= L.clamp(gk);
    c.fillStyle = 'rgb(30, 12, 30)';
    sauropod(c, cx, cy, Lp); c.fill();
    c.restore();
  }
}

/** While the camera rushes back out, a soft dark band under the caption keeps "We only just arrived."
 *  clean over the busy minute / month grids. Fades once the year has settled. */
function captionBand(c, t) {
  const k = L.ease.inOutCubic(L.prog(t, 0.0, 0.3)) * (1 - L.ease.inOutCubic(L.prog(t, 2.0, 0.6)));   // from the first frame of the pull
  if (k <= 0) return;
  const y0 = 1340, y1 = 1565;   // 10b: centred on the lowered captions (captionY 1450)
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(6,3,8,0)');
  g.addColorStop(0.25, `rgba(6,3,8,${0.8 * k})`);
  g.addColorStop(0.75, `rgba(6,3,8,${0.8 * k})`);
  g.addColorStop(1, 'rgba(6,3,8,0)');
  c.fillStyle = g;
  c.fillRect(0, y0, W, y1 - y0);
}

/** The pull-back's breadcrumbs: 23:59, 23:00 and Dec 31 light up as glowing frames while each one passes through
 *  a readable size, and the pinpoint glows, so the long zoom never reads as an empty dark frame. */
function crumbs(c, v, t) {
  const k = L.clamp(t / 0.3) * (1 - L.ease.inOutCubic(L.prog(t, 1.0, 0.45)));
  if (k <= 0) return;
  for (const r of [minuteRect(59), hourRect(23), dayRect(11, 30)]) {
    const w = v.ws(r.w), h = v.ws(r.h);
    const a = L.clamp(L.invLerp(24, 90, w)) * L.clamp(L.invLerp(1100, 560, w)) * k;
    if (a <= 0.01) continue;
    const x = v.wx(r.x), y = v.wy(r.y);
    c.save();
    c.fillStyle = L.rgba(ACCENT, 0.12 * a);
    c.fillRect(x, y, w, h);
    L.glow(c, ACCENT, 18, () => {
      c.strokeStyle = L.rgba(L.mix(ACCENT, [255, 255, 255], 0.45), a);
      c.lineWidth = 3;
      c.strokeRect(x + 1, y + 1, w - 2, h - 2);
    });
    c.restore();
  }
  const pk = k * L.clamp(t / 0.6) * (1 - L.clamp((t - T_PIN) / 0.4));
  if (pk > 0) { const p = pinAt(v); L.lightBlob(c, p.x, p.y, 40, ACCENT, 0.55 * pk); }
}

export default {
  beat: BEAT,
  chapter: { num: '08', title: 'Just arrived', sub: '' },
  captions: true,
  layer: 8,
  cues(d) {
    return [
      { t: 0.02, name: 'whoosh', gain: 0.34, pitch: 0.62 },
      { t: 0.25, name: 'swell', gain: 0.3, pitch: 0.75 },
      ...EVENTS.map((e, i) => ({ t: e.t, name: 'blip', gain: 0.14, pitch: 0.9 + i * 0.15 })),
      { t: T_DINO, name: 'swish', gain: 0.14, pitch: 1.1 },
      { t: T_PIN, name: 'deep', gain: 0.34, pitch: 0.85 },
      { t: T_PIN + 0.02, name: 'bloom', gain: 0.24, pitch: 1.2 },
      { t: T_TAG, name: 'ping', gain: 0.2, pitch: 1.0 },
    ];
  },
  drawWorld(c, v) {
    const t = v.t;
    if (t < 0) return;
    captionBand(c, t);
    crumbs(c, v, t);
    if (t < T_LIT - 0.2) return;
    // event cells: ignite (overshoot) then settle to a soft glow
    for (const e of EVENTS) {
      const dt = t - e.t;
      if (dt < 0) continue;
      const flash = 0.6 * Math.exp(-dt / 0.4) * L.clamp(dt / 0.1);
      const a = e.a * ((e.lit ? 0 : L.ease.outCubic(L.clamp(dt / 0.35)) * 0.7) + flash);
      glowCell(c, v, e.r, a, e.color, 1.2);
    }
    drawDinoRun(c, v, t);
    // pulse rings from the pinpoint
    const p = pinAt(v);
    for (let i = 0; i < 3; i++) {
      const dt = t - T_PIN - i * 1.25;
      if (dt < 0 || dt > 1.6) continue;
      const e = L.ease.outCubic(dt / 1.6);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = L.rgba(ACCENT, 0.6 * (1 - e));
      c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y, Math.max(0, 6 + 60 * e), 0, Math.PI * 2); c.stroke();
      c.restore();
    }
  },
  drawOverlay(c, v) {
    const p = pinAt(v);
    const xg = Math.min(v.wx(YEAR_RECT.x + YEAR_RECT.w) + 20, 880);   // right gutter, outside the grid and left of the Shorts buttons
    const yTag = 400;
    // f10cb: the leader + tag hold through the beat end and hand over to the question card's dim (out by d + 0.3),
    // instead of the generic overlay fade at d - 0.1: YOU ARE HERE stays fully readable for > 2 s
    const out = 1 - L.ease.inCubic(L.prog(v.t, v.d + 0.05, 0.25));
    // leader: from the pinpoint right to the gutter, then up to the tag
    const lp = L.prog(v.t, T_LEAD, 0.6);
    const lk = Math.min(out, lp);
    if (lk > 0) {
      const e = L.ease.inOutCubic(lp);
      const seg1 = xg - p.x, seg2 = p.y - (yTag + 40), tot = seg1 + seg2;
      const run = tot * e;
      c.save();
      c.strokeStyle = L.rgba(ACCENT, 0.7 * out);
      c.lineWidth = 2;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(p.x + 8, p.y);
      let hx, hy;
      if (run <= seg1) { hx = p.x + Math.max(8, run); hy = p.y; c.lineTo(hx, hy); } else { c.lineTo(xg, p.y); hx = xg; hy = p.y - (run - seg1); c.lineTo(hx, hy); }
      c.stroke();
      if (lp < 1) L.lightBlob(c, hx, hy, 22, HOT, 0.7 * out);
      c.restore();
    }
    // the tag
    const tk = Math.min(out, L.prog(v.t, T_TAG, 0.45));
    L.bigLabel(c, { x: xg, y: yTag - 20, big: 'YOU ARE HERE', small: 'the last fifth of a second', k: tk, accent: v.accent, align: 'right', size: 76 });
  },
};
