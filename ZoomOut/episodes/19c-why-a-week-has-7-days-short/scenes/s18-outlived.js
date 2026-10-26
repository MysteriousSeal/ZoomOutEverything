// Beat 18 — 19: "Empires fell. Calendars changed. | The seven-day week outlived them all."
// 19c (beat 12): "The seven-day week outlived them all." (2.3 s): the same pieces, compressed on s16's TIMES — the ghost
// pages fall away under "outlived", the year rolls 1940 → 2026, the header lights glow Sun → Saturn 0.1 s apart and the
// hero 7 · DAYS / SINCE BABYLON lands on "outlived" and flashes on "them all". Its overlay does NOT fade at the beat end:
// s19 draws it under the closing card's dim, so the final image never empties before the card (the end card line never
// shows in 19c).
// Phrase 1: the three failed weeks (the 10-column décade page, the 5- and 6-column Soviet pages) slide out from behind
//           the 7-day page as ghosts and fall away, turning and fading ("Empires fell"); the page's year rolls
//           1940 → 2026 ("Calendars changed": s16 draws the page).
// Phrase 2: the header lights glow in sequence, Sun → Saturn, each sending a soft light down its column (s16), then
//           together on "them all"; today (20 October) gets an accent ring. The left "7 DAYS" label (continued from
//           s17) bows out as the glow starts; seven fine light lines rise from the header lights and converge into a
//           centred hero lockup: a big accent 7 + DAYS / SINCE BABYLON (it flashes on "them all"). After the captions
//           clear, a quiet end card.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, LIGHTS, drawCalendarPage } from '../env.js';
import { PAGE, TIMES, daysLabel, headerLightPos } from './s16-ten-day-week.js';
import { adapt, kIn, LT } from '../legacy.js';

const { W } = L;

// the three ghosts: page state, where they peek out from behind the page, and their fall
const GHOSTS = [
  { cols: 10, rows: 3, first: 0, days: 30, month: 'VENDÉMIAIRE', year: '1793', dx: -2.6, dy: -0.5, rot: -0.12, spin: -0.5, drift: -2.2 },
  { cols: 5, rows: 6, first: 0, days: 31, month: 'OCTOBER', year: '1929', dx: 2.7, dy: -0.2, rot: 0.1, spin: 0.55, drift: 2.0 },
  { cols: 6, rows: 5, first: 0, days: 31, month: 'OCTOBER', year: '1932', dx: -0.7, dy: 1.0, rot: 0.03, spin: 0.35, drift: 0.6 },
];

function drawGhosts(ctx, v) {
  const T = TIMES(v.tl);
  const t = v.gt - T.t18;
  if (t < -0.1 || t > 3.6) return;
  const s = v.ws(1);
  GHOSTS.forEach((g, i) => {
    const out = L.ease.outCubic(L.prog(t, 0.05 + 0.1 * i, 0.55));          // slide out from behind the page
    const fall = L.ease.inCubic(L.prog(t, 0.62 + 0.22 * i, 1.5));            // then fall away
    const a = out * (1 - L.ease.inOutCubic(L.prog(t, 0.85 + 0.22 * i, 0.95)));
    if (a <= 0.01) return;
    const scale = 0.8 - 0.1 * fall;
    const cx = PAGE.x + g.dx * out + g.drift * fall, cy = PAGE.y + g.dy * out + 6 * fall;
    const rot = g.rot * out + g.spin * fall;
    const sx = v.wx(cx), sy = v.wy(cy);
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-sx, -sy);
    // slightly cooler, aged paper; dimmed
    drawCalendarPage(ctx, v, {
      x: cx, y: cy, w: PAGE.w, h: PAGE.h, cols: g.cols, rows: g.rows, first: g.first, days: g.days,
      month: g.month, year: g.year, headK: 0, k: a * 0.85, paper: [214, 206, 192],
    });
    // a dark veil (they are history now)
    ctx.globalAlpha = a * (0.35 + 0.4 * fall);
    ctx.fillStyle = 'rgb(10,10,18)';
    L.roundRect(ctx, v.wx(cx - PAGE.w / 2), v.wy(cy - PAGE.h / 2), PAGE.w * s, PAGE.h * s, Math.max(1, 0.012 * PAGE.w * s));
    ctx.fill();
    ctx.restore();
  });
}

// ------------------------------------------------------------------ the finale hero: 7 · DAYS / SINCE BABYLON
const HERO = { x: 540, base: 540, size: 250 };
function drawHero(ctx, v, T) {
  const gt = v.gt;
  if (gt < T.glow - 0.05) return;
  ctx.save();
  ctx.globalAlpha *= v.k;
  ctx.textBaseline = 'alphabetic';
  // lockup metrics (centred as a group)
  ctx.font = L.font(HERO.size, 800, L.FONT.display);
  const w7 = ctx.measureText('7').width;
  ctx.font = L.font(84, 800, L.FONT.display);
  const wD = ctx.measureText('DAYS').width;
  ctx.font = L.font(24, 600, L.FONT.body);
  const wS = ctx.measureText('SINCE BABYLON').width + 13 * 4;
  const gap = 26, tw = Math.max(wD, wS);
  const x7 = HERO.x - (w7 + gap + tw) / 2, xt = x7 + w7 + gap;
  const fx = x7 + w7 * 0.52, fy = HERO.base - 6;       // where the light lines converge (the 7's foot)
  // seven light lines: each rises from its header light as it glows (Sun → Saturn) and feeds the 7
  const T_IN = T.glow + T.glowSt * 6 + 0.35;          // the 7 ignites once the last line lands
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let day = 0; day < 7; day++) {
    const i = LIGHTS.findIndex((Lt) => Lt.day === day);
    const g = L.prog(gt, T.glow + T.glowSt * day, 0.5);
    if (g <= 0) continue;
    const fade = 1 - L.ease.inOutCubic(L.prog(gt, T_IN + 0.3 + 0.05 * day, 0.7));
    if (fade <= 0) continue;
    const hp = headerLightPos(i, gt, v.tl);
    const lx = v.wx(hp.x), ly = v.wy(hp.y) - 10;
    const e = L.ease.outCubic(g);
    const ex = L.lerp(lx, fx, e), ey = L.lerp(ly, fy, e);
    const gr = ctx.createLinearGradient(lx, ly, ex, ey);
    gr.addColorStop(0, L.rgba(LIGHTS[i].col, 0));
    gr.addColorStop(1, L.rgba(L.mix(LIGHTS[i].col, ACCENT, 0.5), 0.75 * fade));
    ctx.strokeStyle = gr;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ex, ey); ctx.stroke();
    L.lightBlob(ctx, ex, ey, 26, LIGHTS[i].col, 0.45 * fade * (1 - 0.6 * L.prog(gt, T_IN, 0.4)));
  }
  ctx.restore();
  // the hero 7: rises in with a small overshoot, flashes on "them all", then holds
  const k7 = L.prog(gt, T_IN - 0.15, 0.55);
  if (k7 > 0) {
    const e = L.ease.outBack(k7, 1.4);
    const flash = Math.max(0, Math.sin(Math.PI * L.prog(gt, T_IN + 0.05, 1.1)));
    ctx.save();
    ctx.globalAlpha *= L.clamp(k7 * 2);
    L.lightBlob(ctx, x7 + w7 / 2, HERO.base - HERO.size * 0.36, HERO.size * (0.9 + 0.5 * flash), ACCENT, 0.16 + 0.22 * flash);
    ctx.translate(x7 + w7 / 2, HERO.base);
    const sc = 0.7 + 0.3 * e;
    ctx.scale(sc, sc);
    ctx.font = L.font(HERO.size, 800, L.FONT.display);
    ctx.shadowColor = L.rgba(ACCENT, 0.5 + 0.4 * flash);
    ctx.shadowBlur = 24 + 36 * flash;
    ctx.fillStyle = L.rgba(L.mix(ACCENT, [255, 246, 226], 0.15 + 0.5 * flash));
    ctx.textAlign = 'center';
    ctx.fillText('7', 0, (1 - e) * 40);
    ctx.restore();
    // DAYS / SINCE BABYLON wipe in to the right of the 7
    const kt = L.ease.outCubic(L.prog(gt, T_IN + 0.25, 0.55));
    const ks = L.ease.outCubic(L.prog(gt, T_IN + 0.55, 0.55));
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
    if (kt > 0) {
      ctx.globalAlpha *= kt;
      ctx.font = L.font(84, 800, L.FONT.display);
      ctx.fillStyle = L.rgba([244, 239, 230]);
      ctx.fillText('DAYS', xt + (1 - kt) * 24, HERO.base - 82);
      ctx.fillStyle = L.rgba(ACCENT, 0.9);
      ctx.fillRect(xt, HERO.base - 58, tw * kt, 3);
    }
    ctx.restore();
    if (ks > 0) {
      ctx.save();
      ctx.globalAlpha *= ks;
      ctx.font = L.font(24, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(214,220,232,0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8;
      L.trackedText(ctx, 'SINCE BABYLON', xt + (1 - ks) * 18, HERO.base - 16, 4);
      ctx.restore();
    }
  }
  ctx.restore();
}

export const SCENE = {
  beat: 18,
  chapter: { num: '12', title: 'Seven', sub: 'The week that stayed' },
  captions: true,
  layer: 1,    // the ghosts sit behind s16's page (layer 2)
  chapterUntil(d) { return d - 2.2; },
  cues(d) {
    void d;
    // 19c: on the 19c act-III times (beat-relative)
    const T = TIMES(LT), r = (t) => t - T.t18;
    const glow = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ t: r(T.glow) + T.glowSt * i, name: 'ping', gain: 0.1, pitch: 0.9 + 0.08 * i }));
    return [
      { t: 0.1, name: 'swish', gain: 0.16, pitch: 0.8 },       // ghost pages slide out
      { t: 0.65, name: 'deep', gain: 0.3, pitch: 0.8 },        // they fall away
      { t: r(T.roll) + 0.1, name: 'tick', gain: 0.07, pitch: 1.5 },   // the year rolls 1940 → 2026
      { t: r(T.roll) + 0.35, name: 'tick', gain: 0.07, pitch: 1.6 },
      ...glow,                                                   // Sun → Saturn
      { t: r(T.all), name: 'swell', gain: 0.3, pitch: 1.0 },   // "them all"
      { t: r(T.all) + 0.1, name: 'bloom', gain: 0.32, pitch: 1.0 },
    ];
  },
  drawWorld(ctx, v) {
    if (v.t < -0.1) return;
    drawGhosts(ctx, v);
  },
  drawOverlay(ctx, v) {
    const T = TIMES(v.tl);
    // the s17 label carries over, then bows out (faster than it came) as the header lights start to glow
    const kOut = 1 - L.ease.inCubic(L.prog(v.gt, T.glow - 0.1, 0.4));
    daysLabel(ctx, v, { seq: [[0, '7']], small: [[0, 'Back by 1940']], k: kOut, enter: 1 });   // 19c: continues s17's label at full strength (no dip)
    drawHero(ctx, v, T);
    // end card (after the captions clear): a hairline + the series line
    const ek = L.ease.outCubic(L.prog(v.t, 5.95, 0.8));
    if (ek > 0) {
      ctx.save();
      ctx.globalAlpha = ek * v.k;
      const y = 1338;
      // a soft dark backing (the lit rooftop sits behind this line)
      ctx.save();
      ctx.translate(W / 2, y - 18); ctx.scale(1, 0.16);
      const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, 440);
      bg.addColorStop(0, 'rgba(4,5,10,0.72)'); bg.addColorStop(0.7, 'rgba(4,5,10,0.4)'); bg.addColorStop(1, 'rgba(4,5,10,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(-440, -440, 880, 880);
      ctx.restore();
      ctx.fillStyle = L.rgba(ACCENT, 0.85);
      const rw = 120 * ek;
      ctx.fillRect(W / 2 - rw / 2, y - 46, rw, 2);
      ctx.font = L.font(26, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(232,226,214,0.92)';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
      L.trackedText(ctx, 'ZOOM OUT  ·  HIDDEN HISTORY', W / 2, y, 6, 'center');
      ctx.restore();
    }
  },
};

// 19c: 19 beat 18 plays as a 19c beat on the legacy timeline. Its overlay fades IN with the engine curve but never out:
// from the question beat on, s19 draws it (under the card's dim) instead, so it is not drawn twice
export default adapt(SCENE, 18, {}, (ov) => (ov.gt >= ov.tl.scenes[19].start ? 0 : kIn(ov)));
