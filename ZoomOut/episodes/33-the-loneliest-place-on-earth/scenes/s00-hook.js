// Beat 0 — "There's a place on Earth so remote | that the closest humans are often in space."
// Shot 'hook': one continuous log pull-up from ≈ 220 km of open ocean (Point Nemo, the lone cyan point, at the centre)
// to the whole South Pacific (continues into beat 1). The ISS crosses high above the point.
// Headline THE CLOSEST HUMANS / ARE OFTEN IN SPACE (SPACE in the accent) + kicker THE LONELIEST PLACE ON EARTH, readable on
// FRAME 1; drawn in drawWorld so it can hold past the beat cut and cross-fade with the POINT NEMO card (beat 1).
// Close-up ocean texture: world-anchored glints that converge on the point as the camera climbs (parallax).
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT, NEMO, KM_PER_DEG, drawISS, globe, geo, geoTrace, smallCircle, dest, scrim, mapLabel, tw, WD } from '../env.js';

const { W, H } = L;
const MAXW = 900, TOP = 640;
const KICK = 'THE LONELIEST PLACE ON EARTH';
const L1 = [['THE CLOSEST HUMANS', null]];
const L2 = [['ARE OFTEN IN ', null], ['SPACE', 'acc']];
const txt = (p) => p.map((q) => q[0]).join('');

// glints: positions in km around Nemo (deterministic)
const GL = (() => { const r = L.rng(331), out = []; for (let i = 0; i < 520; i++) out.push({ x: (r() - 0.5) * 900, y: (r() - 0.5) * 1500, ph: r() * 6.28, f: 0.6 + r() * 1.4, l: 0.5 + r() }); return out; })();

/** headline out: fully gone before the beat-1 card opens ("Point" − 0.3 s) */
const outT = (tl) => WD(1, 0, 2, -0.62)(tl);

/** the ISS crossing: screen path across the upper ocean during beat 0 */
function issAt(gt, tl) {
  const u = L.prog(gt, 0, tl.scenes[1].start - 0.5);
  const x = L.lerp(200, 900, u), y = L.lerp(436, 400, u);
  return { x, y, span: L.lerp(230, 180, u), ang: -0.08, u };
}

export default {
  beat: 0,
  chapter: null,
  captions: false,
  overlayIn: false,
  layer: 20,
  cues() {
    return [
      { t: 0.0, name: 'deep', gain: 0.38, pitch: 0.62 },
      { t: 2.55, name: 'shimmer', gain: 0.12, pitch: 0.8 },   // the ISS sweep, in the 2.44 → 2.89 gap
    ];
  },
  drawWorld(c, v) {
    const gt = v.gt, tl = v.tl;
    const g = globe(v);
    // (the open-ocean swell texture is drawn by env.drawBackground whenever the camera is this low)
    // ---- close-up ocean glints (only while the ocean fills the frame)
    const gk = L.smoothstep(L.invLerp(3500, 12000, g.r)) * (1 - L.prog(gt, tl.scenes[1].start, 0.5));
    if (gk > 0.01) {
      const pxkm = g.r / 6371;   // px per km at the centre
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const q of GL) {
        const x = g.cx + q.x * pxkm * 0.3, y = g.cy + q.y * pxkm * 0.3;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        const a = 0.5 + 0.5 * Math.sin(gt * q.f * 2.2 + q.ph);
        const len = Math.max(1.2, Math.min(16, pxkm * q.l * 1.6));
        c.fillStyle = `rgba(160,210,240,${gk * 0.4 * a * a})`;
        c.fillRect(x - len / 2, y, len, Math.max(1, len * 0.18));
      }
      c.restore();
    }
    // ---- range rings around the point (100 / 300 / 1,000 km), world-anchored: they shrink as the camera climbs
    const rk = 1 - L.smoothstep(L.prog(gt, WD(1, 0, 2, -0.6)(tl), 0.4));
    if (rk > 0.01) {
      const pxkm = g.r / 6371;
      for (const km of [100, 300, 1000]) {
        const rp = km * pxkm;
        // labels only while the ring is big enough to clear the pin's glow, and inside the frame
        const a = rk * L.smoothstep(L.invLerp(36, 90, rp)) * (1 - L.smoothstep(L.invLerp(900, 1300, rp)));
        const la = rk * L.smoothstep(L.invLerp(110, 170, rp)) * (1 - L.smoothstep(L.invLerp(640, 820, rp)));
        if (a <= 0.01) continue;
        c.save();
        c.globalAlpha = a;
        c.beginPath(); geoTrace(c, v, smallCircle(NEMO.lat, NEMO.lon, km / KM_PER_DEG, 120), true, 1.0);
        c.strokeStyle = L.rgba(ACCENT, 0.45); c.lineWidth = 1.5; c.setLineDash([6, 8]); c.stroke();
        c.restore();
        const q = geo(v, ...dest(NEMO.lat, NEMO.lon, 180, km / KM_PER_DEG));   // the ring's bottom, label just inside it
        mapLabel(c, `${L.fmt(km)} KM`, q.x, q.y - 20, { size: 20, alpha: la * 0.9, color: [170, 205, 230] });
      }
    }
    // ---- grading: a cold edge vignette (fades over the beat-1 pull-out)
    const fade = 1 - L.smoothstep(L.prog(gt, tl.scenes[1].start, 2));
    if (fade > 0.002) {
      c.save();
      const vg = c.createRadialGradient(W / 2, 1060, 260, W / 2, 1060, 1250);
      vg.addColorStop(0, 'rgba(2,6,16,0)');
      vg.addColorStop(0.7, `rgba(2,6,16,${0.32 * fade})`);
      vg.addColorStop(1, `rgba(1,3,10,${0.6 * fade})`);
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
      c.restore();
    }
    // ---- the ISS crossing high above
    const s = issAt(gt, tl);
    const ik = 1 - L.smoothstep(L.invLerp(0.82, 1, s.u));   // fades out before it reaches the edge
    if (ik > 0) {
      // its faint track (from the left edge, fading)
      c.save();
      const tg = c.createLinearGradient(0, 0, s.x, 0);
      tg.addColorStop(0, L.rgba(ACCENT, 0)); tg.addColorStop(1, L.rgba(ACCENT, 0.35 * ik));
      c.strokeStyle = tg;
      c.setLineDash([10, 12]); c.lineWidth = 2;
      const dy = Math.tan(s.ang);
      c.beginPath(); c.moveTo(0, s.y - s.x * dy); c.lineTo(s.x - s.span * 0.55, s.y - s.span * 0.55 * dy); c.stroke();
      c.restore();
      drawISS(c, s.x, s.y, s.span, s.ang, ik, 0.8);
      // small tag, under the station, from phrase 1 ("the closest humans")
      // (kept fully inside the frame: its centre is clamped, and it fades before the station nears the edge)
      const tk = L.enter(gt, WD(0, 1, 2, -0.15)(tl), 0.4) * (1 - L.smoothstep(L.invLerp(0.7, 0.8, s.u)));
      if (tk > 0) {
        const lw = tw(c, 'INTERNATIONAL SPACE STATION', 22, 600, L.FONT.body, 4);
        const lx = L.clamp(s.x, 60 + lw / 2, W - 60 - lw / 2);
        mapLabel(c, 'INTERNATIONAL SPACE STATION', lx, s.y + s.span * 0.38 + 24, { size: 22, alpha: tk, color: [215, 230, 245] });
      }
    }
    // ---- headline (frame 1)
    const ok = 1 - L.ease.inCubic(L.prog(gt, outT(tl), 0.25));
    if (ok <= 0) return;
    c.save();
    c.globalAlpha = ok;
    scrim(c, W / 2, TOP + 110, 620, 220, 0.5);
    const size = Math.min(L.fitSize(c, txt(L1), MAXW, 128, 800, L.FONT.display, 50), L.fitSize(c, txt(L2), MAXW, 128, 800, L.FONT.display, 50));
    // kicker
    c.font = L.font(28, 700, L.FONT.body);
    c.textBaseline = 'alphabetic';
    c.fillStyle = L.rgba([205, 220, 238], 0.95);
    c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 12;
    const kw = L.trackedText(c, KICK, W / 2 + 0, TOP, 5, 'center');
    c.fillStyle = L.rgba(ACCENT);
    c.fillRect(W / 2 - kw / 2 - 64, TOP - 12, 44, 4);
    c.fillRect(W / 2 + kw / 2 + 20, TOP - 12, 44, 4);
    const b1 = TOP + 34 + size * 0.8, b2 = b1 + size * 0.98;
    c.font = L.font(size, 800, L.FONT.display);
    const breath = 0.5 + 0.5 * Math.cos(gt * 2 * Math.PI / 2.2);
    const draw = (parts, y) => {
      let x = W / 2 - c.measureText(txt(parts)).width / 2;
      for (const [t, col] of parts) {
        const w = c.measureText(t).width;
        c.save();
        if (col) {
          c.shadowColor = L.rgba([60, 170, 230], 0.5 + 0.3 * breath); c.shadowBlur = 24 + 14 * breath;
          c.fillStyle = L.rgba(ACCENT);
        } else { c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 18; c.fillStyle = '#fff'; }
        c.fillText(t, x, y);
        c.restore();
        x += w;
      }
    };
    draw(L1, b1);
    draw(L2, b2);
    c.restore();
  },
};
