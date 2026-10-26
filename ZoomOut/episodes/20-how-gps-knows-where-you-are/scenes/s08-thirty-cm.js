// Beat 8 — "But light covers about thirty centimeters in a billionth of a second."
// The dive from the planet to the phone. Above it, a smoked-glass 30 cm ruler hangs on the true signal line (it
// points at satellite B, 18° off vertical) and builds itself tick by tick on "thirty centimeters". Then one light
// pulse comes down the line from off-screen and crosses the ruler once, slowed a billion times, while a gold
// readout runs 0.00 → 1.00 ns and locks as the pulse lands on the phone.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, DOT, PHONE, SAT_B } from '../env.js';
import { drawReadout, wordT } from './s04-atomic-clocks.js';

const C = 299792458;
const YCUT = 380;                                    // screen y: nothing of the signal draws above it (chapter card)
const LEN = 0.30, WID = 0.034;                     // metres
const S = { x: PHONE.x, y: PHONE.y - PHONE.h / 2 - 0.028 };   // the ruler's near end (just above the phone)
const U = (() => { const dx = SAT_B.x - S.x, dy = SAT_B.y - S.y, l = Math.hypot(dx, dy); return { x: dx / l, y: dy / l }; })();
const N = { x: -U.y, y: U.x };                     // across the ruler (points right/up)
const hot = [215, 255, 220];
const P = (s, o = 0) => ({ x: S.x + U.x * s + N.x * o, y: S.y + U.y * s + N.y * o });

function times(v) {
  const tBuild = wordT(v.tl, 8, 0, 4) + 0.05;       // "thirty"
  const tRun = wordT(v.tl, 8, 0, 6) + 0.2;          // "in" (a billionth…)
  return { tBuild, tRun, tLand: tRun + 1.25 };
}

export default {
  beat: 8,
  chapter: { num: '08', title: 'One nanosecond', sub: 'a billionth of a second' },
  captions: true,
  layer: 6,
  cues(d) {
    const tb = 1.49, tr = 2.68, tl = tr + 1.25;
    return [
      { t: 0.05, name: 'dive', gain: 0.3, pitch: 1.0 },
      { t: tb, name: 'tick', gain: 0.14, pitch: 1.5 },
      { t: tb + 0.3, name: 'tick', gain: 0.14, pitch: 1.7 },
      { t: tb + 0.6, name: 'tick', gain: 0.16, pitch: 1.9 },
      { t: tr - 0.05, name: 'swish', gain: 0.28, pitch: 1.6 },
      { t: tl, name: 'ping', gain: 0.36, pitch: 1.3 },
    ];
  },
  drawWorld(ctx, v) {
    const t = v.t;
    if (t < 0.8 || t > v.d + 1.0) return;
    const px1 = v.ws(LEN);
    if (px1 < 6) return;
    const { tBuild, tRun, tLand } = times(v);
    const out = 1 - L.ease.inCubic(L.prog(t, v.d - 0.15, 0.55));
    const body = L.ease.outCubic(L.prog(t, tBuild - 0.25, 0.5)) * out;
    if (body <= 0) return;
    const sp = (p) => ({ x: v.wx(p.x), y: v.wy(p.y) });
    const ang = Math.atan2(U.y, U.x);
    ctx.save();
    // the signal line: from the satellite (off-screen) down to the phone
    const near = sp(P(0));
    let far = sp(P(LEN * 6));
    // stop (and fade to 0) at screen y 380 so it never crosses the chapter card / HUD band
    if (far.y < YCUT && near.y > YCUT) {
      const f = (near.y - YCUT) / (near.y - far.y);
      far = { x: L.lerp(near.x, far.x, f), y: YCUT };
    }
    const lg = ctx.createLinearGradient(far.x, far.y, near.x, near.y);
    lg.addColorStop(0, L.rgba(ACCENT, 0)); lg.addColorStop(0.6, L.rgba(ACCENT, 0.28 * body)); lg.addColorStop(1, L.rgba(ACCENT, 0.4 * body));
    ctx.strokeStyle = lg; ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath(); ctx.moveTo(far.x, far.y); ctx.lineTo(near.x, near.y); ctx.stroke();
    ctx.setLineDash([]);
    // ---- the ruler (local frame: x along the line toward B, y across; metres → px via scale)
    const o = sp(S), sc = 1 / v.cam.mpp;
    ctx.translate(o.x, o.y);
    ctx.rotate(ang);
    ctx.scale(sc, sc);
    // it settles into place: a small slide along the line + fade
    ctx.translate((1 - body) * 0.04, 0);
    ctx.globalAlpha = body;
    // drop shadow-ish glow
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24;
    const g = ctx.createLinearGradient(0, -WID / 2, 0, WID / 2);
    g.addColorStop(0, 'rgba(70,86,112,0.62)'); g.addColorStop(0.5, 'rgba(30,40,58,0.58)'); g.addColorStop(1, 'rgba(18,24,36,0.66)');
    ctx.fillStyle = g;
    L.roundRect(ctx, -0.008, -WID / 2, LEN + 0.016, WID, 0.003); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(200,215,235,0.55)'; ctx.lineWidth = 1.4 * v.cam.mpp;
    L.roundRect(ctx, -0.008, -WID / 2, LEN + 0.016, WID, 0.003); ctx.stroke();
    // bevel highlight on the upper edge
    ctx.strokeStyle = 'rgba(235,242,255,0.35)'; ctx.lineWidth = 2.5 * v.cam.mpp;
    ctx.beginPath(); ctx.moveTo(0, -WID / 2 + 0.0015); ctx.lineTo(LEN, -WID / 2 + 0.0015); ctx.stroke();
    // ticks build from 0 to 30 cm (mm ticks only when they resolve)
    const bk = L.ease.inOutCubic(L.prog(t, tBuild, 0.9));
    const mmOK = v.ws(0.001) > 2.2;
    const edge = WID / 2;                             // ticks hang from the +y edge (screen right of the line)
    ctx.strokeStyle = 'rgba(235,240,250,0.9)';
    for (let mm = 0; mm <= 300; mm++) {
      const s = mm / 1000;
      if (s > LEN * bk + 1e-9) break;
      const cm = mm % 10 === 0, half = mm % 5 === 0;
      if (!cm && !mmOK) continue;
      const tl = cm ? 0.012 : half ? 0.008 : 0.005;
      ctx.lineWidth = (cm ? 2.2 : 1.1) * v.cam.mpp;
      ctx.beginPath(); ctx.moveTo(s, edge); ctx.lineTo(s, edge - tl); ctx.stroke();
    }
    // the light: the crossed part of the ruler glows; a hot head with a short trail
    const pr = L.prog(t, tRun, tLand - tRun);
    ctx.globalCompositeOperation = 'lighter';
    if (pr > 0 && pr < 1) {
      const head = LEN * (1 - pr) + 0.0;
      const tail = Math.min(LEN * 1.6, head + 0.12);
      const tg = ctx.createLinearGradient(tail, 0, head, 0);
      tg.addColorStop(0, L.rgba(ACCENT, 0)); tg.addColorStop(1, L.rgba(hot, 0.95));
      ctx.strokeStyle = tg; ctx.lineWidth = 0.004; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tail, -edge * 0.1); ctx.lineTo(head, -edge * 0.1); ctx.stroke();
    }
    if (pr > 0) {
      const head = LEN * (1 - Math.min(1, pr));
      const lit = 1 - 0.55 * L.prog(t, tLand + 0.2, 0.6);
      ctx.fillStyle = L.rgba(ACCENT, 0.22 * lit);
      ctx.fillRect(head, -WID / 2, LEN - head, WID);
      ctx.strokeStyle = L.rgba(ACCENT, 0.9 * lit); ctx.lineWidth = 2.5 * v.cam.mpp;
      ctx.beginPath(); ctx.moveTo(head, -WID / 2); ctx.lineTo(LEN, -WID / 2); ctx.stroke();
    }
    ctx.restore();
    // pulse head + phone flash (screen space, additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const raw = (t - tRun) / (tLand - tRun);      // unclamped: < 0 while the pulse is still above the ruler
    if (raw > -0.6 && raw < 1) {
      // before it reaches the ruler, the pulse comes down the line from off-screen
      const pr = raw;
      const sHead = LEN * (1 - pr);
      const hp = sp(P(sHead, -WID * 0.05));
      // fades out above screen y ≈ 380 so the incoming pulse never crosses the chapter card / HUD band
      const a = L.clamp((pr + 0.6) * 3) * out * L.smoothstep(L.clamp((hp.y - YCUT) / 120));
      if (pr < 0 && a > 0) {
        let tp = sp(P(sHead + 0.18));
        if (tp.y < YCUT && hp.y > YCUT) { const f = (hp.y - YCUT) / (hp.y - tp.y); tp = { x: L.lerp(hp.x, tp.x, f), y: YCUT }; }
        const g2 = ctx.createLinearGradient(tp.x, tp.y, hp.x, hp.y);
        g2.addColorStop(0, L.rgba(ACCENT, 0)); g2.addColorStop(1, L.rgba(hot, 0.9 * a));
        ctx.strokeStyle = g2; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(hp.x, hp.y); ctx.stroke();
      }
      L.lightBlob(ctx, hp.x, hp.y, 110, ACCENT, 0.5 * a);
      L.lightBlob(ctx, hp.x, hp.y, 30, hot, a);
    }
    const ar = L.prog(t, tLand, 1.0);
    if (ar > 0 && ar < 1) {
      const ph = sp(PHONE);
      const e = L.ease.outCubic(ar);
      L.lightBlob(ctx, ph.x, ph.y - v.ws(PHONE.h) * 0.2, v.ws(PHONE.w) * (0.8 + 0.8 * e), DOT, 0.55 * (1 - ar) * out);
      const top = sp(S);
      ctx.strokeStyle = L.rgba(ACCENT, 0.8 * (1 - ar) * out); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(top.x, top.y, Math.max(0, 8 + 70 * e), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  },
  drawOverlay(ctx, v) {
    const t = v.t;
    const { tBuild, tRun, tLand } = times(v);
    // the cm numerals, upright, beside the ruler (screen space so they stay crisp)
    const bk = L.ease.inOutCubic(L.prog(t, tBuild, 0.9));
    if (bk > 0 && v.ws(LEN) > 200) {
      ctx.save();
      ctx.globalAlpha = v.k * L.clamp(L.invLerp(200, 380, v.ws(LEN)));
      ctx.font = L.font(22, 600, L.FONT.din);
      ctx.fillStyle = 'rgba(225,232,245,0.85)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
      for (let cm = 0; cm <= 30; cm += 5) {
        if (cm / 100 > LEN * bk + 1e-9) break;
        const q = P(cm / 100, WID / 2 - 0.021);
        ctx.fillText(String(cm), v.wx(q.x), v.wy(q.y));
      }
      ctx.restore();
    }
    const k = v.k * L.enter(t, tBuild + 0.1, 0.55);
    L.bigLabel(ctx, { x: 1000, y: 560, big: '30 cm', small: '', k, accent: ACCENT, align: 'right', size: 120 });
    // the unit line lands with its demonstration ("in a billionth…", as the pulse enters the ruler); kept short so
    // it clears the tilted ruler (which reaches x ≈ 450 at this height)
    const sk = v.k * L.enter(t, tRun - 0.1, 0.5);
    if (sk > 0) {
      ctx.save();
      ctx.globalAlpha = sk;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 8;
      ctx.font = L.font(30, 600, L.FONT.body);
      ctx.fillStyle = 'rgba(205,215,230,0.95)';
      ctx.textBaseline = 'alphabetic';
      L.trackedText(ctx, 'IN ONE NANOSECOND', 1000, 612 + (1 - L.ease.outCubic(sk)) * 18, 3, 'right');
      ctx.restore();
    }
    const pr = L.prog(t, tRun, tLand - tRun);
    const rk = v.k * L.enter(t, tRun - 0.4, 0.45);
    drawReadout(ctx, {
      x: 1000, y: 820, align: 'right', size: 88, k: rk,
      text: `${(pr * LEN / C * 1e9).toFixed(2)} ns`,
      label: 'slowed a billion times',
      lock: t - tLand,
    });
  },
};
