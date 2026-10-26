// Beat 5 — "Fast enough to cross a soccer field | in under one second."
// The camera pans along the nerve (s04 keeps firing signals underneath). A glass inset card holds a top-down
// soccer pitch (105 × 68 m): on phrase 1 the card rises and the pitch lines wipe on, a hairline "nerve" stretched
// down its long axis. On phrase 2 a signal crosses the full 105 m in 0.875 s at 120 m/s, in real time, while the
// label above counts 0.00 → 0.88 s and stops with a hit; the far goal flashes.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, FACTS, phrase } from '../env.js';
import { adapt, LT, rel } from '../legacy.js';
import { PULSE_CORE, PULSE_GLOW } from './s04-nerve.js';

const { W } = L;
const PITCH = { L: 105, W: 68 };
const RUN = PITCH.L / FACTS.nerveMs;           // 0.875 s
// card + pitch layout (screen px)
const PW = 580, PH = PW * PITCH.W / PITCH.L, PX = (W - PW) / 2, PY = 548;
const CARD = { x: PX - 26, y: PY - 26, w: PW + 52, h: PH + 52 };

const runStart = (tl) => phrase(tl, 5, 1, 'start') + 0.08;
const RS = rel(5, runStart(LT));   // 17c: beat-relative run start (cues)

function pitchLines(c, m) {
  // m: metres → px (top-left origin of the pitch)
  const X = (x) => PX + x * m, Y = (y) => PY + y * m;
  c.beginPath();
  c.rect(X(0), Y(0), PITCH.L * m, PITCH.W * m);
  c.moveTo(X(52.5), Y(0)); c.lineTo(X(52.5), Y(68));
  c.moveTo(X(52.5) + 9.15 * m, Y(34)); c.arc(X(52.5), Y(34), 9.15 * m, 0, Math.PI * 2);
  for (const side of [0, 1]) {
    const x0 = side ? 105 : 0, dir = side ? -1 : 1;
    c.moveTo(X(x0), Y(34 - 20.16)); c.lineTo(X(x0 + dir * 16.5), Y(34 - 20.16)); c.lineTo(X(x0 + dir * 16.5), Y(34 + 20.16)); c.lineTo(X(x0), Y(34 + 20.16));
    c.moveTo(X(x0), Y(34 - 9.16)); c.lineTo(X(x0 + dir * 5.5), Y(34 - 9.16)); c.lineTo(X(x0 + dir * 5.5), Y(34 + 9.16)); c.lineTo(X(x0), Y(34 + 9.16));
    // penalty arc (outside the box)
    const a = Math.acos(5.5 / 9.15);
    const cx = X(x0 + dir * 11), cy = Y(34);
    c.moveTo(cx + Math.cos(side ? Math.PI - a : a) * 9.15 * m * (side ? 1 : 1), cy + Math.sin(side ? Math.PI - a : a) * 9.15 * m);
    if (side) c.arc(cx, cy, 9.15 * m, Math.PI - a, Math.PI + a, true);
    else c.arc(cx, cy, 9.15 * m, a, -a, true);
  }
  c.stroke();
  // spots + goals
  c.fillStyle = c.strokeStyle;
  for (const [x, y] of [[52.5, 34], [11, 34], [94, 34]]) { c.beginPath(); c.arc(X(x), Y(y), Math.max(0, 0.45 * m), 0, Math.PI * 2); c.fill(); }
  c.strokeRect(X(-2), Y(34 - 3.66), 2 * m, 7.32 * m);
  c.strokeRect(X(105), Y(34 - 3.66), 2 * m, 7.32 * m);
}

export const SCENE = {
  beat: 5,
  chapter: { num: '05', title: 'Across a soccer field', sub: 'one second of nerve signal' },
  chapterUntil(d) { return 2.2; },
  captions: true,
  layer: 0,
  cues(d) {
    return [
      { t: 0.35, name: 'swish', gain: 0.16, pitch: 0.9 },
      { t: 0.55, name: 'tick', gain: 0.14, pitch: 1.2 },
      { t: 0.95, name: 'tick', gain: 0.12, pitch: 1.35 },
      // the pulse beneath the card (s04) at 0.55 and 1.7
      { t: 0.95, name: 'swish', gain: 0.12, pitch: 1.9 },
      { t: 2.1, name: 'swish', gain: 0.12, pitch: 1.9 },
      // the run (17c: on phrase 2, from the legacy timeline)
      { t: RS - 0.63, name: 'riser', gain: 0.14, pitch: 1.6 },
      { t: RS, name: 'whoosh', gain: 0.38, pitch: 1.5 },
      { t: RS + RUN, name: 'impact', gain: 0.32, pitch: 1.25 },
      { t: RS + RUN + 0.06, name: 'ping', gain: 0.26, pitch: 1.2 },
    ].filter((q) => q.t < d);
  },
  drawWorld() {},
  drawOverlay(c, v) {
    const t = v.t, s5 = v.tl.scenes[5].start;
    const tIn = phrase(v.tl, 5, 0, 'start') - s5 + 0.1;
    const kCard = Math.min(v.k, L.ease.outCubic(L.prog(t, tIn, 0.6)));
    if (kCard <= 0) return;
    const rs = runStart(v.tl) - s5;
    const p = L.clamp((t - rs) / RUN);                              // linear: the signal doesn't ease
    const done = t >= rs + RUN;
    const m = PW / PITCH.L;
    c.save();
    // --- card: dark glass, rises 24 px
    const lift = (1 - kCard) * 24;
    c.translate(0, lift);
    c.globalAlpha = kCard;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 12;
    L.roundRect(c, CARD.x, CARD.y, CARD.w, CARD.h, 22);
    // the glass starts translucent and firms up as the pitch wipes on (never an empty dark slab)
    const wipe = L.ease.outCubic(L.prog(t, tIn + 0.12, 0.45));
    c.fillStyle = `rgba(10,6,10,${0.82 * (0.45 + 0.55 * wipe)})`; c.fill();
    c.restore();
    L.roundRect(c, CARD.x, CARD.y, CARD.w, CARD.h, 22);
    c.strokeStyle = 'rgba(255,220,210,0.16)'; c.lineWidth = 1.5; c.stroke();
    // --- the pitch: turf with mowing stripes, wiped on left → right
    c.save();
    c.beginPath(); c.rect(PX - 30, PY - 30, (PW + 60) * wipe, PH + 60); c.clip();
    for (let i = 0; i < 12; i++) {
      c.fillStyle = i % 2 ? 'rgb(30,58,44)' : 'rgb(36,68,51)';
      c.fillRect(PX + (i / 12) * PW, PY, PW / 12 + 0.5, PH);
    }
    const sheen = c.createLinearGradient(PX, PY, PX + PW * 0.6, PY + PH);
    sheen.addColorStop(0, 'rgba(255,255,255,0.08)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sheen; c.fillRect(PX, PY, PW, PH);
    c.strokeStyle = 'rgba(240,244,236,0.82)'; c.lineWidth = 2;
    pitchLines(c, m);
    // the "nerve" stretched along the pitch: a hairline down the long axis
    const ny = PY + PH / 2;
    c.strokeStyle = 'rgba(240,226,206,0.5)'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(PX, ny); c.lineTo(PX + PW, ny); c.stroke();
    c.restore();
    // --- the run: a signal crossing all 105 m
    if (t > rs - 0.05) {
      const ny = PY + PH / 2;
      const hx = PX + PW * p;
      const fade = done ? 1 - L.prog(t, rs + RUN, 0.7) : 1;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const trail = Math.min(hx - PX, 260);
      for (const [lw, col, a] of [[22, PULSE_GLOW, 0.18], [8, PULSE_GLOW, 0.5], [3, PULSE_CORE, 0.95]]) {
        const g = c.createLinearGradient(hx - trail, 0, hx, 0);
        g.addColorStop(0, L.rgba(col, 0)); g.addColorStop(1, L.rgba(col, a * fade));
        c.strokeStyle = g; c.lineWidth = lw; c.lineCap = 'round';
        c.beginPath(); c.moveTo(hx - trail, ny); c.lineTo(hx, ny); c.stroke();
      }
      // the travelled part of the line stays lit
      c.strokeStyle = L.rgba(PULSE_GLOW, 0.28 * fade); c.lineWidth = 3;
      c.beginPath(); c.moveTo(PX, ny); c.lineTo(hx, ny); c.stroke();
      if (!done) { L.lightBlob(c, hx, ny, 70, PULSE_GLOW, 0.7); L.lightBlob(c, hx, ny, 20, PULSE_CORE, 1); }
      // far goal flashes on arrival
      const fl = done ? Math.exp(-(t - rs - RUN) * 3) : 0;
      if (fl > 0.01) { L.lightBlob(c, PX + PW, ny, 150, PULSE_GLOW, 0.6 * fl); L.lightBlob(c, PX + PW, ny, 40, PULSE_CORE, 0.9 * fl); }
      c.restore();
    }
    c.restore();
    // --- the timer label: counts to 0.88 s during the run, then holds
    const kL = Math.min(v.k, L.ease.outCubic(L.prog(t, tIn + 0.1, 0.5)));
    if (kL > 0) {
      const secs = Math.min(RUN, Math.max(0, t - rs));
      const live = t >= rs;
      const str = `${secs.toFixed(2)} s`;
      const y = 452;
      c.save();
      c.globalAlpha = kL;
      c.textBaseline = 'alphabetic';
      c.font = L.font(118, 800, L.FONT.display);
      const wRef = c.measureText('0.88 s').width;
      const x0 = W / 2 - wRef / 2;
      // rule
      c.fillStyle = L.rgba(ACCENT, 0.9);
      c.fillRect(W / 2 - 45 * kL, y - 118 * 0.92 - 26, 90 * kL, 4);
      const pop = done ? 1 + 0.06 * Math.exp(-(t - rs - RUN) * 6) * Math.sin(Math.min(Math.PI, (t - rs - RUN) * 14)) : 1;
      c.save();
      c.translate(W / 2, y - 40); c.scale(pop, pop); c.translate(-W / 2, -(y - 40));
      c.fillStyle = live ? L.rgba(ACCENT) : 'rgba(205,200,210,0.55)';
      c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18;
      // fixed-width digits so the number doesn't jitter
      let x = x0;
      for (const ch of str) {
        const cw = /[0-9]/.test(ch) ? c.measureText('0').width : c.measureText(ch).width;
        c.fillText(ch, x + (cw - c.measureText(ch).width) / 2, y + (1 - kL) * 30);
        x += cw;
      }
      c.restore();
      c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 8;
      c.font = L.font(30, 600, L.FONT.body);
      c.fillStyle = 'rgba(205,215,230,0.95)';
      L.trackedText(c, 'ACROSS A SOCCER FIELD', W / 2, y + 50 + (1 - kL) * 18, 3, 'center');
      c.restore();
    }
  },
};

// 17c: 17 beat 5 plays as a 17c beat on the legacy timeline (legacy.js); chapter renumbered
export default adapt(SCENE, 5, { chapter: { num: '04', title: 'Across a soccer field', sub: 'one second of nerve signal' } });
