// Beat 2 — "So when you sit down, count the rows to your nearest exit. | In smoke, you'll find it by touch."
// Camera 'cabin': zooms ×370 from the profile onto the parked aircraft's cut-away cabin (overwing exit … rear door),
// mpp 0.0111. YOU = row 15 (seat back x −1.65 local): 4 rows to the overwing exit ahead, 5 to the rear door behind.
//   "sit down" (≈ 18.5)   YOU's seat lights yellow + a YOU chip above the fuselage with a leader to it.
//   badge                 STEP 1 COUNT THE ROWS (with the beat; the sub FRONT AND BACK follows on "count").
//   "count" (19.05)       discs 1–4 pop on the seat backs ahead (0.22 s apart; 1–5 behind 0.17 s apart) → the overwing EXIT gets a green ring;
//                         then 1–5 behind → the rear EXIT ring. A dashed guide runs along the headrests as they count.
//   "In smoke" (21.8)     env fills the cabin with smoke from the ceiling down; floor-path lights + EXIT signs glow
//                         through. The counting discs dim away; sub → IN SMOKE: FEEL THE SEAT BACKS.
//   "find it by touch"    a dashed yellow touch path runs along the seat backs from YOU to the overwing exit; each seat
//                         back pulses as it is reached (1 2 3 4 again, small), the exit lights green at the end.
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, CD, EXITG, EXITS, rowX, YOU_ROW, lpt, smokeK, wordTime, TEXT, timesFor, SHOT } from '../env.js';

const TAU = Math.PI * 2;
const FWD = [14, 13, 12, 11], BACK = [16, 17, 18, 19, 20];
const EX_F = EXITS[1], EX_B = EXITS[2];

function times(v) {
  const b = v.tl.scenes[v.index].start, w = (pj, wi) => wordTime(v.tl, 2, pj, wi) - b;
  const count = w(0, 5) - 0.05, CT = timesFor(v.tl);
  // YOU lands on "sit down", but never before the zoom into the cabin has settled
  const settle = SHOT.cabin.travel - 0.1;
  return { you: Math.max(w(0, 3) - 0.1, settle), count, fwd: count + 0.05, step: 0.22, back: CT.backCount - b, stepB: 0.17, smoke: w(1, 0) - 0.05, touch: w(1, 3) - 0.15 };
}

function disc(c, x, y, n, k, { r = 22, col = CD.yellow, ink = CD.ink, size = 28 } = {}) {
  if (k <= 0) return;
  const s = L.ease.outBack(L.clamp(k), 2);
  c.save();
  c.translate(x, y); c.scale(Math.max(0.001, s), Math.max(0.001, s));
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 8;
  c.fillStyle = L.rgba(col); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = L.rgba(ink); c.font = L.font(size, 700, L.FONT.din); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(String(n), 0, 2);
  c.restore();
}
function exitRing(c, x, y, w, h, k) {
  if (k <= 0) return;
  const e = L.ease.outCubic(L.clamp(k));
  c.save();
  c.strokeStyle = L.rgba(EXITG, 0.95 * Math.min(1, k * 2)); c.lineWidth = 4;
  c.shadowColor = L.rgba(EXITG, 0.9); c.shadowBlur = 14;
  const pad = 14 + 18 * (1 - e);
  L.roundRect(c, x - w / 2 - pad, y - h / 2 - pad, w + 2 * pad, h + 2 * pad, 14); c.stroke();
  c.restore();
}

export default {
  beat: 2,
  chapter: null,
  captions: true,
  layer: 4,
  cues(d) {
    return [
      { t: 0.0, name: 'whoosh', gain: 0.2, pitch: 0.7 },
      { t: 1.0, name: 'blip', gain: 0.14, pitch: 1.0 },
      { t: 3.42, name: 'ping', gain: 0.16, pitch: 1.2 },
      { t: 4.33, name: 'swell', gain: 0.14, pitch: 0.6 },
      { t: 6.9, name: 'ping', gain: 0.16, pitch: 1.0 },
    ];
  },
  drawOverlay(c, v) {
    const T = times(v), t = v.t;
    const sm = smokeK(v.gt, v.tl);
    c.save();
    c.globalAlpha = v.k;
    const yHead = -3.62, yBack = -3.25;
    // ---- YOU: the seat lights yellow (drawn over env's seat), chip + leader
    const yk = L.prog(t, T.you, 0.45);
    if (yk > 0) {
      const [sx, sy] = lpt(v, rowX(YOU_ROW) - 0.02, -3.2);
      const px = v.ws(1);   // px per metre
      const ek = L.ease.outCubic(yk), ca = L.clamp((yk - 0.2) / 0.5);
      c.save();
      // the seat frame
      c.save();
      c.globalAlpha *= L.clamp(yk * 2.5);
      c.strokeStyle = L.rgba(CD.yellow); c.lineWidth = 3.5;
      c.shadowColor = L.rgba(CD.yellow, 0.8); c.shadowBlur = 12;
      L.roundRect(c, sx - 0.2 * px, sy - 0.6 * px, 0.78 * px, 0.88 * px, 10); c.stroke();
      c.restore();
      // chip above the hull: an OPAQUE plate that scales up from its leader end (kept inside x 40…1040)
      c.font = L.font(32, 800, L.FONT.display); c.letterSpacing = '3px';
      const tw = c.measureText('YOU · ROW 15').width; c.letterSpacing = '0px';
      const pw = tw + 40, [hx0, hy] = lpt(v, rowX(YOU_ROW) + 0.18, -5.25);
      const hx = L.clamp(hx0, 40 + pw / 2, 1040 - pw / 2), cy = hy - 76;
      const ax = sx + 0.2 * px, ay = sy - 0.6 * px;
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(L.lerp(ax, hx, ek), L.lerp(ay, cy + 25, ek)); c.stroke();
      c.translate(hx, cy + 25); c.scale(L.lerp(0.4, 1, ek), L.lerp(0.4, 1, ek)); c.translate(-hx, -(cy + 25));
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 14;
      c.fillStyle = L.rgba(CD.black); L.roundRect(c, hx - pw / 2, cy - 25, pw, 50, 10); c.fill();
      c.shadowBlur = 0; c.shadowColor = 'transparent';
      c.strokeStyle = L.rgba(CD.yellow, 0.75); c.lineWidth = 1.5; c.stroke();
      c.globalAlpha *= ca;
      c.fillStyle = L.rgba(CD.yellow); c.textBaseline = 'middle';
      L.trackedText(c, 'YOU · ROW 15', hx, cy + 2, 3, 'center');
      c.restore();
    }
    // ---- counting (fades as the smoke rolls in)
    const ck = 1 - L.smoothstep(L.prog(t, T.smoke + 0.1, 0.5));
    if (ck > 0) {
      c.save();
      c.globalAlpha *= ck;
      // guides along the headrests: YOU → forward exit, YOU → rear exit
      const guide = (rows, t0, step, ex) => {
        const n = rows.length, gk = L.clamp((t - t0) / (step * n + 0.2));
        if (gk <= 0) return;
        const [ax, ay] = lpt(v, rowX(YOU_ROW) - 0.05, yHead - 0.12), [bx] = lpt(v, ex.x, yHead - 0.12);
        c.strokeStyle = L.rgba(CD.yellow, 0.75); c.lineWidth = 3; c.setLineDash([10, 9]);
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(L.lerp(ax, bx, gk), ay); c.stroke(); c.setLineDash([]);
      };
      guide(FWD, T.fwd, T.step, EX_F);
      guide(BACK, T.back, T.stepB, EX_B);
      FWD.forEach((r, i) => { const [x, y] = lpt(v, rowX(r) + 0.02, yBack); disc(c, x, y, i + 1, L.prog(t, T.fwd + i * T.step, 0.3)); });
      BACK.forEach((r, i) => { const [x, y] = lpt(v, rowX(r) + 0.02, yBack); disc(c, x, y, i + 1, L.prog(t, T.back + i * T.stepB, 0.3)); });
      for (const [ex, t0] of [[EX_F, T.fwd + FWD.length * T.step], [EX_B, T.back + BACK.length * T.stepB]]) {
        const [x0, y0] = lpt(v, ex.x - ex.w / 2, ex.top), [x1, y1] = lpt(v, ex.x + ex.w / 2, ex.bot);
        exitRing(c, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, L.prog(t, t0, 0.45));
      }
      c.restore();
    }
    // ---- by touch: a dashed path along the seat backs to the overwing exit, each seat back pulses as it is reached
    const tk = L.prog(t, T.touch, 1.5);
    if (tk > 0) {
      const xs = [rowX(YOU_ROW) - 0.08, ...FWD.map((r) => rowX(r) - 0.08), EX_F.x];
      const pts = xs.map((x) => lpt(v, x, yHead + 0.02));
      const segs = pts.length - 1, u = tk * segs;
      c.save();
      c.strokeStyle = L.rgba(CD.yellow, 0.95); c.lineWidth = 4; c.lineCap = 'round'; c.setLineDash([12, 10]);
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6;
      c.beginPath(); c.moveTo(...pts[0]);
      for (let i = 1; i <= segs; i++) {
        const f = L.clamp(u - (i - 1));
        if (f <= 0) break;
        // a small hop over each headrest (hand moving from seat back to seat back)
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const N = 8;
        for (let j = 1; j <= N; j++) { const s = (j / N) * f; c.lineTo(L.lerp(ax, bx, s), L.lerp(ay, by, s) - Math.sin(Math.PI * s) * 16); }
      }
      c.stroke(); c.setLineDash([]); c.shadowBlur = 0;
      // touch pulses + small counts
      for (let i = 1; i < segs; i++) {
        const pk = L.clamp(u - i + 0.02);
        if (pk <= 0) continue;
        const [x, y] = pts[i], age = (u - i) / segs * 1.5;
        c.strokeStyle = L.rgba(CD.yellow, Math.max(0, 0.9 - age * 1.4)); c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, 8 + age * 40, 0, TAU); c.stroke();
        disc(c, x, y - 34, i, L.clamp(pk * 3), { r: 15, size: 20 });
      }
      // the exit lights green when the path arrives
      const ek = L.prog(u, segs - 0.05, 0.5);
      const [x0, y0] = lpt(v, EX_F.x - EX_F.w / 2, EX_F.top), [x1, y1] = lpt(v, EX_F.x + EX_F.w / 2, EX_F.bot);
      exitRing(c, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, ek);
      c.restore();
    }
    // ---- STEP 1 badge + sub
    const bk = L.ease.outCubic(L.prog(t, 0.02, 0.75));
    stepBadge(c, v, 1, 'COUNT THE ROWS', { k: bk });
    const s1 = L.ease.outCubic(L.prog(t, T.count + 0.1, 0.45)) * (1 - L.ease.inCubic(L.prog(t, T.smoke - 0.05, 0.2)));
    if (s1 > 0) stepSub(c, 'TO THE NEAREST EXITS, FRONT AND BACK', s1);
    const s2 = L.ease.outCubic(L.prog(t, T.smoke + 0.2, 0.45));
    if (s2 > 0) stepSub(c, 'SMOKE? FEEL YOUR WAY ALONG THE SEAT BACKS', s2);
    void sm; void TEXT;
    c.restore();
  },
};
