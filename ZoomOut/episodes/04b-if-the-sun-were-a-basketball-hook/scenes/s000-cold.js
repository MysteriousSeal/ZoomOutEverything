// Beat 0 (04b) — cold open: the film's payoff as its first frame. The night globe (drawn by s10 whenever the
// camera is at globe scale), the Sun as a point of light in New York (drawn by s00/s12), and on frame 1 a headline
// that poses the riddle. A flight arc crosses the Atlantic, Proxima lights up red in Rome, the distance lands.
// "If the Sun were a basketball in New York, the nearest star would be in Rome."
import * as L from '../../../../engine/runtime/lib.js';
import { NEW_YORK, ROME } from '../env.js';
import { ACC, SUN_C, STAR_C, pointLight, cityTag } from './s10-star.js';
import { TRACK, TRACK_N } from './s11-nyrome.js';
import { drawSun } from './s00-sun.js';

const { W, ease, clamp, prog, rgba } = L;
const TAU = Math.PI * 2;
const B = { arc0: 0.35, arcDur: 1.7, tags: 0.25, dist: 2.3, out: 0.3 };   // s into the beat
const MAXW = 940;
const MATCH = 0.5;   // s: the match cut at the end of the beat   // every headline line is fitted to this width (frame 1080, 70 px margins)

/** a headline line fitted to MAXW, optionally with one accent word; returns nothing, draws centred at y */
function line(ctx, parts, y, size, weight = 800) {
  const text = parts.map((p) => p[0]).join('');
  const s = L.fitSize(ctx, text, MAXW, size, weight, L.FONT.display, 30);
  ctx.font = L.font(s, weight, L.FONT.display);
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  for (const [t, col] of parts) {
    ctx.fillStyle = col;
    ctx.fillText(t, x, y);
    x += ctx.measureText(t).width;
  }
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,   // the hook headline is fully readable on frame 1
  layer: 11,
  cues(d) {
    return [
      { t: 0.0, name: 'swell', gain: 0.3, pitch: 0.8 },
      { t: B.arc0, name: 'whoosh', gain: 0.3, pitch: 0.85 },
      { t: B.arc0 + B.arcDur, name: 'ping', gain: 0.36, pitch: 1.5 },
      { t: B.arc0 + B.arcDur + 0.05, name: 'bloom', gain: 0.25, pitch: 1 },
      { t: B.dist, name: 'tick', gain: 0.25, pitch: 1.1 },
      { t: d - 0.15, name: 'whoosh', gain: 0.35, pitch: 1.2 },
    ];
  },

  drawWorld(ctx, v) {
    if (!v.active) return;
    const t = v.t;
    const p = ease.inOutCubic(prog(t, B.arc0, B.arcDur));
    // the flight arc (same great circle as beat 12)
    if (p > 0) {
      const n = Math.max(1, Math.round(p * TRACK_N));
      ctx.save();
      ctx.lineCap = 'round';
      ctx.setLineDash([2, 7]);
      ctx.strokeStyle = 'rgba(255,220,190,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const q = TRACK[i]; i ? ctx.lineTo(v.wx(q.gx), v.wy(q.gy)) : ctx.moveTo(v.wx(q.gx), v.wy(q.gy)); }
      ctx.stroke();
      ctx.setLineDash([]);
      const grad = ctx.createLinearGradient(v.wx(TRACK[0].ax), 0, v.wx(TRACK[TRACK_N].ax), 0);
      grad.addColorStop(0, rgba(SUN_C, 0.95));
      grad.addColorStop(0.5, rgba(ACC, 0.95));
      grad.addColorStop(1, rgba(STAR_C, 0.95));
      const path = () => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const q = TRACK[i]; i ? ctx.lineTo(v.wx(q.ax), v.wy(q.ay)) : ctx.moveTo(v.wx(q.ax), v.wy(q.ay)); } };
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = grad; ctx.lineWidth = 9; path(); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = grad; ctx.lineWidth = 3; path(); ctx.stroke();
      if (p < 1) {
        const q = TRACK[n], hk = Math.sin(Math.PI * clamp(p * 1.15));
        L.lightBlob(ctx, v.wx(q.ax), v.wy(q.ay), 46, ACC, 0.7 * hk);
        ctx.fillStyle = `rgba(255,245,230,${hk})`;
        ctx.beginPath(); ctx.arc(v.wx(q.ax), v.wy(q.ay), 4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // Proxima lights up red in Rome as the arc lands (with a touchdown ripple)
    const pk = ease.outCubic(prog(t, B.arc0 + B.arcDur - 0.05, 0.5));
    if (pk > 0) {
      const rx = v.wx(ROME.x), ry = v.wy(ROME.y);
      L.lightBlob(ctx, rx, ry, 120, STAR_C, 0.5 * Math.exp(-Math.max(0, t - B.arc0 - B.arcDur) * 3));
      pointLight(ctx, rx, ry, STAR_C, pk, 0.75);
      const rk = prog(t, B.arc0 + B.arcDur, 0.9);
      if (rk > 0 && rk < 1) {
        ctx.strokeStyle = rgba(STAR_C, 0.7 * (1 - rk));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(rx, ry, Math.max(0, 10 + 50 * ease.outCubic(rk)), 0, TAU); ctx.stroke();
      }
    }
  },

  drawOverlay(ctx, v) {
    if (!v.active) return;
    const t = v.t;
    const k = 1 - ease.inCubic(prog(t, v.d - B.out - 0.05, B.out));   // on from frame 1, out before the cut
    const nyx = v.wx(NEW_YORK.x), nyy = v.wy(NEW_YORK.y), rx = v.wx(ROME.x), ry = v.wy(ROME.y);
    if (k > 0) {
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 18;
    // 1. the riddle, fully on screen from frame 1
    const white = 'rgb(240,236,230)', acc = rgba(v.accent);
    ctx.font = L.font(34, 700, L.FONT.body);
    ctx.fillStyle = 'rgba(235,228,220,0.9)';
    const kicker = 'IF THE SUN WERE A BASKETBALL IN NEW YORK';
    const ks = L.fitSize(ctx, kicker, MAXW, 34, 700, L.FONT.body, 18);
    ctx.font = L.font(ks, 700, L.FONT.body);
    L.trackedText(ctx, kicker, W / 2, 300, 0, 'center');
    line(ctx, [['THE NEAREST STAR', white]], 410, 120);
    line(ctx, [['WOULD BE IN ', white], ['ROME', acc]], 528, 120);
    ctx.shadowBlur = 0;
    // 2. the two places
    // the two tags share one row (same y, same 66 px height) with a ≥ 44 px gap; Rome's right edge stays left of
    // the Shorts action buttons (x ≤ 920) and inside the globe's limb
    const tagW = (name, role) => {
      ctx.font = L.font(22, 700, L.FONT.body);
      const w1 = ctx.measureText(name).width + name.length * 3;
      ctx.font = L.font(18, 600, L.FONT.body);
      return Math.max(w1, ctx.measureText(role).width + role.length * 3) + 34;
    };
    const NY_ROLE = 'THE SUN · A BASKETBALL', RO_ROLE = 'NEAREST STAR · A PING-PONG BALL';
    const wN = tagW('NEW YORK', NY_ROLE), wR = tagW('ROME', RO_ROLE);
    const rcx = Math.min(rx, 920 - wR / 2);
    const ncx = Math.min(nyx, rcx - wR / 2 - 44 - wN / 2);
    const tagY = Math.max(nyy, ry) + 46;
    const tk = ease.outCubic(prog(t, B.tags, 0.5));
    cityTag(ctx, ncx, tagY, 'NEW YORK', NY_ROLE, tk, SUN_C);
    const rk = ease.outCubic(prog(t, B.arc0 + B.arcDur + 0.1, 0.5));
    cityTag(ctx, rcx, tagY, 'ROME', RO_ROLE, rk, STAR_C);
    // 3. the distance, in the open Atlantic under the arc, on its own soft dark scrim (it sits over coastlines)
    const dk = prog(t, B.dist, 0.6);
    if (dk > 0) {
      const q = TRACK[Math.round(TRACK_N / 2)];
      const mx = (nyx + rx) / 2, my = v.wy(q.ay) - 86;
      ctx.save();
      ctx.filter = 'blur(26px)';
      ctx.fillStyle = `rgba(2,5,12,${0.72 * clamp(dk * 2)})`;
      ctx.beginPath(); ctx.roundRect(mx - 330, my - 150, 660, 230, 60); ctx.fill();
      ctx.restore();
      L.bigLabel(ctx, { x: mx, y: my, big: '≈ 6,900 km', small: 'at the scale of a basketball Sun', k: dk, accent: v.accent, align: 'center', size: 104 });
    }
    ctx.restore();
    }
    // 4. match cut into beat 1: New York's point of light swells into the full-frame Sun that beat 1 opens on
    //    (same disc, same place: r 760 px at (540, 930)), over a darkening sky that hides the globe
    const mk = prog(t, v.d - MATCH, MATCH);
    if (mk > 0) {
      const e = ease.inOutCubic(mk);
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(5,6,10,${L.smoothstep(clamp(mk * 1.6))})`;
      ctx.fillRect(0, 0, W, L.H);
      const R = Math.exp(L.lerp(Math.log(3), Math.log(760), e));
      drawSun(ctx, L.lerp(nyx, 540, e), L.lerp(nyy, 930, e), R, v.gt, {});
      ctx.restore();
    }
  },
};
