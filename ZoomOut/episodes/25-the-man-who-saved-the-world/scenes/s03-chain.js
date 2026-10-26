// Beat 3 — "Stanislav Petrov has minutes to report it. | A report could trigger a counterstrike, | and a full nuclear
//          war."   (30.09–38.36 with the v4 voice; every time below is derived from the timeline / env.moments)
// Camera 'chain': globe r 380 at y 720 (spans y 340–1100); everything this beat adds lives in the band y 1120–1330
// (clear of the caption band 1380–1520) or on the globe itself. Camera 'war' pushes in a touch on phrase 2.
//   · The name card IS the chapter card: 03 STANISLAV PETROV / Duty officer · Soviet Air Defence Forces. No portrait.
//   · On the globe: an amber pin at Serpukhov-15 (≈ 55.0 N 37.4 E, near Moscow): where he sits. No label (one focus).
//   · Phrase 0: MINUTES TO REPORT — a segmented LED timer bar that drains one segment every 6 frames (no number: the
//     facts only say "minutes"). Frame-stable (integer segments from the frame index).
//   · Phrase 1 (moments.chain): the timer lifts to the top of the band and the chain draws itself in, left to right:
//     OFFICER → COMMAND → KREMLIN ⇢ COUNTERSTRIKE (last box red; the last arrow is DASHED = "could trigger": the
//     decision was the leadership's, never Petrov's). Arrows are drawn (Avenir has no arrow glyph).
//   · Phrase 2 (moments.war): the last box flips over (a fast vertical roll) and comes up NUCLEAR WAR, brighter, with
//     a heavier red glow and a red wash over the whole frame edge.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, AMBER, COLD, globeView, geo, moments } from '../env.js';

const BOXES = ['OFFICER', 'COMMAND', 'KREMLIN', 'COUNTERSTRIKE'];
const X0 = 80, X1 = 940;                 // Shorts-safe width (860 px)
const ARROW = 46;                         // horizontal room for each drawn arrow
const BOX_H = 78, PADX = 18;
const SEGS = 30;                          // timer segments
const SERPUKHOV = { lat: 54.9, lon: 37.4 };

/** phrase j of line 3, beat-relative seconds */
const ph = (v, j) => v.tl.lines[3].phrases[j].start - v.tl.scenes[3].start;

/** a drawn arrow from (x0, y) to (x1, y), revealed by k (0..1) */
function arrow(c, x0, x1, y, k, col, dashed = false) {
  if (k <= 0) return;
  const xe = L.lerp(x0, x1, L.ease.outCubic(L.clamp(k)));
  c.save();
  c.strokeStyle = col; c.fillStyle = col;
  c.lineWidth = 3.5; c.lineCap = 'round';
  if (dashed) c.setLineDash([7, 7]);
  c.beginPath(); c.moveTo(x0, y); c.lineTo(xe - 6, y); c.stroke();
  c.setLineDash([]);
  c.beginPath(); c.moveTo(xe + 2, y); c.lineTo(xe - 11, y - 8); c.lineTo(xe - 11, y + 8); c.closePath(); c.fill();
  c.restore();
}

export default {
  beat: 3,
  chapter: { num: '03', title: 'Stanislav Petrov', sub: 'Duty officer · Soviet Air Defence Forces' },
  layer: 4,
  cues(d) {
    // the timer ticks (soft, beat-relative) through the beat; the chain + NUCLEAR WAR cues are tied to words: env.cues(tl)
    const out = [];
    for (let t = 0.75; t < d - 0.4; t += 0.7) out.push({ t, name: 'tick', gain: 0.1, pitch: 1.1 });
    return out;
  },
  drawWorld(c, v) {
    // Petrov's post: a pin on the globe (beat 3 only)
    const k = L.enter(v.t, 0.5, 0.5) * (1 - L.prog(v.t, v.d - 0.35, 0.35));
    if (k <= 0) return;
    const view = globeView(v);
    const p = geo(view, SERPUKHOV.lat, SERPUKHOV.lon);
    if (p.hidden) return;
    c.save();
    c.globalAlpha = k;
    const pulse = L.prog((v.t % 1.6) / 1.6, 0, 1);   // slow sonar ring, 0.6 Hz
    c.strokeStyle = L.rgba(AMBER, 0.7 * (1 - pulse));
    c.lineWidth = 2;
    c.beginPath(); c.arc(p.x, p.y, Math.max(0, 8 + pulse * 34), 0, Math.PI * 2); c.stroke();
    L.lightBlob(c, p.x, p.y, 30, AMBER, 0.55);
    c.fillStyle = L.rgba([255, 226, 170]);
    c.beginPath(); c.arc(p.x, p.y, 5.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(10,8,4,0.9)'; c.lineWidth = 1.5; c.stroke();
    c.restore();
  },
  drawOverlay(c, v) {
    const p1 = ph(v, 1);
    c.save();
    c.textBaseline = 'alphabetic';
    // ---------------------------------------------------------------- the timer
    const tk = v.k * L.enter(v.t, 0.55, 0.5);
    if (tk > 0) {
      const lift = L.ease.inOutCubic(L.prog(v.t, p1 - 0.35, 0.5));       // moves up for the chain
      const labY = L.lerp(1196, 1150, lift) + (1 - tk) * 16;
      const barY = labY + 18, barH = L.lerp(30, 18, lift);
      // label + a small amber rule
      c.globalAlpha = tk;
      c.fillStyle = L.rgba(AMBER);
      c.fillRect(X0, labY - 12, 30, 5);
      c.font = L.font(26, 700, L.FONT.body);
      c.fillStyle = L.rgba(COLD, 0.95);
      c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 10;
      L.trackedText(c, 'MINUTES TO REPORT', X0 + 44, labY, 5, 'left');
      c.shadowBlur = 0;
      // segments: frame-stable drain (one segment per 6 frames after it starts)
      const f = Math.round(v.gt * 30) - Math.round((v.tl.scenes[3].start + 0.9) * 30);
      const lit = Math.max(4, SEGS - Math.max(0, Math.floor(f / 6)));
      const gap = 6, sw = (X1 - X0 - (SEGS - 1) * gap) / SEGS;
      c.fillStyle = 'rgba(4,7,9,0.85)';
      L.roundRect(c, X0 - 6, barY - 6, X1 - X0 + 12, barH + 12, 6); c.fill();
      // the bar turns red as time runs out: blended over 12 frames (0.4 s) from the frame it reaches 14 segments
      const fWarn = (SEGS - 14) * 6;
      const warn = L.ease.inOutCubic(L.clamp((f - fWarn) / 12));
      const hot = L.mix(AMBER, L.mix(AMBER, ACCENT, 0.85), warn);
      for (let i = 0; i < SEGS; i++) {
        const x = X0 + i * (sw + gap);
        const on = i < lit;
        const col = on ? hot : [70, 60, 44];
        const edge = on && i === lit - 1;
        c.fillStyle = L.rgba(col, on ? (edge ? 0.65 + 0.35 * Math.cos(v.t * Math.PI * 2 * 1.2) : 0.95) : 0.22);
        c.fillRect(x, barY, sw, barH);
      }
      c.globalAlpha = tk * 0.5;
      L.lightBlob(c, X0 + (lit / SEGS) * (X1 - X0), barY + barH / 2, 60, L.mix(AMBER, ACCENT, warn), 0.35);
    }
    // ---------------------------------------------------------------- the chain
    const ck = v.k;
    if (ck > 0 && v.t > p1 - 0.2) {
      c.globalAlpha = 1;
      // shared font size: every label at the size the widest layout allows
      const fs = 34;
      c.font = L.font(fs, 800, L.FONT.display);
      const tw = BOXES.map((b) => c.measureText(b).width);
      const sum = tw.reduce((a, b) => a + b, 0) + BOXES.length * 2 * PADX + (BOXES.length - 1) * ARROW;
      const sc = Math.min(1, (X1 - X0) / sum);
      const size = Math.floor(fs * sc);
      c.font = L.font(size, 800, L.FONT.display);
      const widths = BOXES.map((b) => c.measureText(b).width + 2 * PADX * sc);
      const arrowW = (X1 - X0 - widths.reduce((a, b) => a + b, 0)) / (BOXES.length - 1);
      const y = 1222, cy = y + BOX_H / 2;
      const b0 = v.tl.scenes[3].start, m = moments(v.tl);
      const T = m.chain.map((t) => t - b0);                                // box entrances (beat-relative)
      const war = m.war - b0;
      let x = X0;
      BOXES.forEach((b, i) => {
        const bw = widths[i];
        const k = ck * L.clamp(L.enter(v.t, T[i], 0.4, L.ease.outBack));
        const last = i === BOXES.length - 1;
        if (k > 0) {
          c.save();
          c.globalAlpha = ck * L.clamp(L.prog(v.t, T[i], 0.25));
          const sy = (1 - k) * 18;
          c.translate(0, sy);
          // phrase 2: the last box rolls over to NUCLEAR WAR (first half: squash away; second half: open on the new word)
          const roll = last ? L.prog(v.t, war - 0.12, 0.3) : 0;
          const flipped = roll >= 0.5;
          const esc = last ? L.ease.outCubic(L.prog(v.t, war + 0.03, 0.4)) : 0;
          if (last) {
            const pulse = 0.75 + 0.25 * Math.sin(v.t * Math.PI * 2 * 0.8);
            L.lightBlob(c, x + bw / 2, cy, bw * (0.9 + 0.5 * esc), ACCENT, (0.35 + 0.35 * esc) * pulse);
            const sy2 = Math.max(0.04, Math.abs(Math.cos(Math.PI * roll)));
            const sc2 = 1 + 0.12 * esc;
            c.translate(x + bw / 2, cy); c.scale(sc2, sy2 * sc2); c.translate(-(x + bw / 2), -cy);
          }
          c.fillStyle = last ? L.rgba(flipped ? [206, 30, 22] : [176, 34, 28]) : 'rgb(10,17,19)';
          L.roundRect(c, x, y, bw, BOX_H, 8); c.fill();
          c.strokeStyle = last ? L.rgba(flipped ? [255, 200, 180] : [255, 120, 100], 0.9) : i === 0 ? L.rgba(AMBER, 0.9) : L.rgba(COLD, 0.45);
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = L.rgba(i === 0 ? [255, 214, 150] : COLD);
          c.font = L.font(size, 800, L.FONT.display);
          c.textAlign = 'center';
          c.fillText(last && flipped ? 'NUCLEAR WAR' : b, x + bw / 2, cy + size * 0.36);
          c.restore();
        }
        if (!last) {
          const ak = ck * L.prog(v.t, T[i] + 0.12, i === BOXES.length - 2 ? 0.45 : 0.3);
          c.save();
          c.globalAlpha = ck;
          arrow(c, x + bw + 7, x + bw + arrowW - 7, cy, ak, i === BOXES.length - 2 ? L.rgba([255, 110, 92]) : L.rgba(COLD, 0.85), i === BOXES.length - 2);
          c.restore();
        }
        x += bw + arrowW;
      });
      // the frame edges flush red on NUCLEAR WAR, then settle to a low throb
      const wk = ck * L.prog(v.t, war, 0.15) * (0.55 + 0.45 * Math.exp(-Math.max(0, v.t - war) * 2.5));
      if (wk > 0) {
        const g = c.createRadialGradient(L.W / 2, L.H * 0.45, L.H * 0.28, L.W / 2, L.H * 0.45, L.H * 0.7);
        g.addColorStop(0, 'rgba(200,30,20,0)'); g.addColorStop(1, `rgba(200,30,20,${0.3 * wk})`);
        c.globalAlpha = 1;
        c.fillStyle = g; c.fillRect(0, 0, L.W, L.H);
      }
    }
    c.restore();
  },
};
