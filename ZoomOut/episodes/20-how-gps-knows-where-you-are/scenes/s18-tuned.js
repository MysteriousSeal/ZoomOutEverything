// Beat 18 — "So engineers tune the clocks to tick slower before launch, | and the dot stays on you."
// The blue dot snaps back to you (s17's pins carry it, landing ≈ 0.77 s in, before the zoom accelerates) as the camera dives home through the street onto the
// phone. A gold readout names the fix: the satellite clock's 10.23 MHz is re-tuned on "tune" — its digits roll down
// to 10.229 999 995 43 MHz and lock on "slower", and the label turns into "set before launch". Then the readout
// leaves and the film ends on the hook frame: the blue dot on the phone's map, steady, breathing with a soft pulse,
// a ring closing on it on "the dot stays on you". A calm ~3 s hold.
import * as L from '../../../../engine/runtime/lib.js';
import { DOT, beatStart } from '../env.js';
import { drawReadout, wordT } from './s04-atomic-clocks.js';
import { phoneDotScreen } from './s00-hook.js';

const TAU = Math.PI * 2;
const F0 = 10.23, F1 = 10.22999999543;   // MHz: the GPS fundamental, and the factory offset (−4.465e-10)

function times(tl) {
  const b = beatStart(tl, 18);
  return {
    b,
    tune: b + wordT(tl, 18, 0, 2),          // "tune"
    slower: b + wordT(tl, 18, 0, 7),        // "slower"
    before: b + wordT(tl, 18, 0, 8),        // "before launch"
    stays: b + wordT(tl, 18, 1, 3),         // "stays"
    p2: beatStart(tl, 18) + (tl.lines[18].phrases ? tl.lines[18].phrases[1].start - beatStart(tl, 18) : 4),
  };
}

/** "10.229 999 995 43 MHz" style grouping of a frequency in MHz (11 decimals). */
function fmtMHz(f) {
  const s = f.toFixed(11);
  const [a, b] = s.split('.');
  return `${a}.${b.slice(0, 3)} ${b.slice(3, 6)} ${b.slice(6, 9)} ${b.slice(9)}`;
}

export default {
  beat: 18,
  chapter: { num: '18', title: 'Tuned before launch', sub: 'built to tick slower' },
  chapterUntil() { return 4.4; },          // a clean hook frame for the final hold
  captions: true,
  layer: 6,
  cues(d) {
    void d;
    // "tune" ≈ 0.85 s, "slower" ≈ 2.07 s, "before launch" ≈ 2.42 s, "stays" ≈ 4.4 s
    return [
      { t: 0.05, name: 'whoosh', gain: 0.34, pitch: 1.35 },       // the dot snaps back west (s17 shownDrift)
      { t: 0.74, name: 'ping', gain: 0.3, pitch: 1.2 },           // the dot lands back on you
      { t: 0.76, name: 'blip', gain: 0.18, pitch: 1.2 },
      { t: 0.85, name: 'dive', gain: 0.36, pitch: 1.1 },          // the dive home accelerates
      { t: 0.9, name: 'tick', gain: 0.16, pitch: 1.2 },           // readout in
      { t: 1.0, name: 'count', gain: 0.14, pitch: 0.8 },          // digits roll down
      { t: 2.07, name: 'tick', gain: 0.26, pitch: 0.9 },          // locked, slower
      { t: 2.1, name: 'shimmer', gain: 0.16, pitch: 0.8 },
      { t: 3.7, name: 'swell', gain: 0.16, pitch: 0.85 },         // arrival on the phone
      { t: 4.4, name: 'ping', gain: 0.26, pitch: 1.0 },           // "stays on you"
      { t: 4.42, name: 'bloom', gain: 0.22, pitch: 1.1 },
    ];
  },
  drawWorld(ctx, v) {
    const k = times(v.tl);
    if (v.gt < k.b + 2.5) return;
    // the hook frame again: the dot on the phone's map, breathing, with slow sonar rings and one closing lock ring
    const p = phoneDotScreen(v, 0);
    if (p.r < 2.5) return;
    const vis = L.ease.outCubic(L.prog(v.gt, k.b + 3.0, 0.8));
    if (vis <= 0) return;
    const r = p.r;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // sonar rings every 1.8 s (calm), starting on "and the dot…"
    for (let i = 0; i < 3; i++) {
      const t0 = k.p2 + 0.1 + i * 0.6;
      const ph = ((v.gt - t0) / 1.8);
      if (ph < 0) continue;
      const f = ph - Math.floor(ph);
      const e = L.ease.outCubic(f);
      ctx.strokeStyle = L.rgba(DOT, 0.45 * (1 - f) * vis * (i === 0 ? 1 : 0.6));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, r * (1.6 + 6.5 * e)), 0, TAU); ctx.stroke();
    }
    // the lock: a ring that closes onto the dot on "stays"
    const lk = L.prog(v.gt, k.stays - 0.35, 0.6);
    if (lk > 0 && lk < 1) {
      const e = L.ease.outCubic(lk);
      ctx.strokeStyle = `rgba(235,242,255,${0.85 * (1 - L.ease.inCubic(lk)) * vis})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, r * L.lerp(9, 1.7, e)), 0, TAU); ctx.stroke();
    }
    const fl = v.gt > k.stays ? Math.exp(-(v.gt - k.stays) * 2.2) : 0;
    L.lightBlob(ctx, p.x, p.y, r * (5 + 2 * fl), DOT, (0.25 + 0.45 * fl) * vis);
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const k = times(v.tl);
    const kin = L.enter(v.gt, k.b + 0.35, 0.45);   // as the dot lands back on you (s17): 10.23 MHz reads ~1 s first
    const kout = L.enter(v.gt, k.p2 + 0.9, 0.45, L.ease.inCubic);
    const vis = kin * (1 - kout);
    if (vis <= 0.002) return;
    // "tune": the factory 10.23 MHz is struck through, then the new value flips in digit by digit (left to right)
    // and locks on "slower"
    const s0 = `${fmtMHz(F0)} MHz`, s1 = `${fmtMHz(F1)} MHz`;
    const strike = L.ease.outCubic(L.prog(v.gt, k.tune, 0.3));
    const flip = L.prog(v.gt, k.tune + 0.4, k.slower - k.tune - 0.45);
    const n = s0.length;
    const text = [...s0].map((ch, i) => (flip * (n + 2) > i + 1 ? s1[i] : ch)).join('');
    const strikeA = strike * (1 - L.ease.inCubic(L.prog(flip, 0.0, 0.5)));
    drawReadout(ctx, {
      x: 76, y: 452, align: 'left', size: 64, k: vis,
      text,
      label: 'satellite clock', label2: 'tuned slower · set before launch',
      swap: L.ease.inOutCubic(L.prog(v.gt, k.before - 0.1, 0.5)),
      lock: v.gt - k.slower,
    });
    // the strike sits on top of the old digits
    if (strikeA > 0) {
      ctx.save();
      ctx.font = L.font(64, 700, L.FONT.din);
      const cell = ctx.measureText('0').width;
      const tw = [...s0].reduce((a2, ch) => a2 + (/[0-9]/.test(ch) ? cell : ctx.measureText(ch).width), 0);
      ctx.globalAlpha = vis * strikeA;
      ctx.strokeStyle = 'rgba(255,128,104,0.95)';
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      const sy = 452 - 64 * 0.33;
      ctx.beginPath(); ctx.moveTo(70, sy); ctx.lineTo(70 + (tw + 12) * strike, sy); ctx.stroke();
      ctx.restore();
    }
  },
};
