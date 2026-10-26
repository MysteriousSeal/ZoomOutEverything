// Beat 6 — "So stay inside for at least twenty-four hours. | Don't go looking for family: they should shelter where they are."
//   phrase 0  (camera 'h24', building roof ≈ 720–738) STEP 4 badge STAY INSIDE · 24 H (y 372) + an opaque CLOCK CARD under
//             it (x 64–470, y 498–704, left of / above the roof line, never over the building): a 24-tick ring fills green
//             with a sweeping hand while the readout counts AT LEAST / 0 → 24 / HOURS (whole digits, frame-stable).
//   phrase 1  (camera 'family', wide city at dawn) the badge + clock leave; a green SHELTER card (env stepBadge, icon tile) takes the same slot:
//             house tile + SHELTER WHERE YOU ARE, sub strip DON'T GO LOOKING FOR FAMILY. In the world, every sheltering
//             skyline building (timed by env cityShelterK; env itself no longer draws glows) gets a lit green ground floor, a glow and one ping ring,
//             staggered — the whole city sheltering in place. Occluded bases are skipped (drawWorld runs over env).
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, cityShelterK, LAYERS, layerProj, skylineTop, BLD, RECTS, toScreen, TEXT, SAFE, CD, SUB_Y } from '../env.js';

const ph = (v, j) => v.tl.lines[v.index].phrases[j].start - v.tl.scenes[v.index].start;
const TAU = Math.PI * 2;
const tq = (v) => Math.round(v.gt * 30) / 30 - v.tl.scenes[v.index].start;   // frame-stable beat time (quantised on film
// frames, not beat-relative: the beat start is off-grid, so v.t rounding let motion-blur sub-frames straddle two digits)

function houseIcon(c, x, y, s, col) {
  c.save();
  c.translate(x, y);
  c.fillStyle = L.rgba(col);
  c.beginPath();
  c.moveTo(0, -30 * s); c.lineTo(34 * s, -2 * s); c.lineTo(25 * s, -2 * s); c.lineTo(25 * s, 28 * s);
  c.lineTo(-25 * s, 28 * s); c.lineTo(-25 * s, -2 * s); c.lineTo(-34 * s, -2 * s); c.closePath(); c.fill();
  // door
  c.fillStyle = L.rgba(SAFE);
  c.fillRect(-7 * s, 8 * s, 14 * s, 20 * s);
  c.restore();
}

export default {
  beat: 6,
  chapter: null,
  captions: true,
  layer: 5,
  cues() { return []; },

  // the whole city shelters in place: stronger green glows on every sheltering skyline building (beat 6 → beat 7 fade)
  drawWorld(c, v) {
    const shk = cityShelterK(v.gt, v.tl);
    if (shk <= 0) return;
    const fade = 1 - L.enter(v.t, v.d - 0.2, 1.0, L.ease.inOutCubic);   // ease off under the question card
    if (fade <= 0) return;
    const near = layerProj(v, LAYERS.near.p);
    const bx0 = v.wx(BLD.x0) - 4, bx1 = v.wx(BLD.x1) + 4, broof = v.wy(BLD.parapet);
    const home = (bx0 + bx1) / 2;
    c.save();
    // nothing of the city's glow draws over our foreground building
    c.beginPath(); c.rect(-10, -10, L.W + 20, L.H + 20); c.rect(bx0, broof - 6, bx1 - bx0, v.wy(BLD.foot) - broof + 12); c.clip('evenodd');
    // our own shelter's basement joins in (brighter than env's steady safe glow)
    {
      const ba = toScreen(v, RECTS.basement), a = shk * fade;
      L.lightBlob(c, ba.cx, ba.cy, ba.w * 0.7, SAFE, 0.35 * a);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = L.rgba(SAFE, 0.22 * a);
      c.fillRect(ba.x, ba.y, ba.w, ba.h);
      c.restore();
    }
    for (const Ly of [LAYERS.mid, LAYERS.near]) {
      const pr = layerProj(v, Ly.p), s = pr.s, by = pr.y(Ly.base);
      for (const b of Ly.b) {
        const x0 = pr.x(b.X), x1 = pr.x(b.X + b.w);
        if (x1 < -10 || x0 > 1090 || x1 - x0 < 10) continue;
        const m = (x0 + x1) / 2;
        // a wave of light spreading out from our shelter across the city
        const kb = L.smoothstep(L.clamp(shk * 1.9 - Math.abs(m - home) / 1100 - b.hs * 0.15));
        if (kb <= 0) continue;
        // occlusion: the foreground building, and (for mid) a near-layer building standing in front of the base
        if (m > bx0 && m < bx1 && by > broof) continue;
        if (Ly === LAYERS.mid) {
          const top = skylineTop('near', near.X(m));
          if (top !== null && near.y(top) < by - 4) continue;
        }
        const a = kb * fade, bw = x1 - x0;
        const gh = Math.min(Math.max(26, b.h * s * 0.35), 90 * s);
        // lower floors lit green (the building's own shelter), a bright base line, a soft glow
        c.save();
        c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, by - gh, 0, by);
        g.addColorStop(0, L.rgba(SAFE, 0));
        g.addColorStop(1, L.rgba(SAFE, 0.38 * a));
        c.fillStyle = g;
        c.fillRect(x0 + 2, by - gh, bw - 4, gh);
        c.restore();
        L.lightBlob(c, m, by - 6 * s, Math.max(30, bw * 0.55), SAFE, 0.32 * a);
        c.fillStyle = L.rgba([160, 255, 196], 0.95 * a);
        c.fillRect(x0 + bw * 0.14, by - 9 * s, bw * 0.72, 4.5 * s);
        // one soft ping as the building lights up (a small gradient halo, not a drawn circle)
        const pk = L.clamp((kb - 0.15) / 0.85);
        if (pk > 0 && pk < 1) {
          const rr = Math.max(1, (8 + 30 * L.ease.outCubic(pk)) * s), py = by - 8 * s;
          const g2 = c.createRadialGradient(m, py, rr * 0.45, m, py, rr);
          g2.addColorStop(0, L.rgba(SAFE, 0));
          g2.addColorStop(0.7, L.rgba(SAFE, 0.32 * (1 - pk) * fade));
          g2.addColorStop(1, L.rgba(SAFE, 0));
          c.fillStyle = g2;
          c.fillRect(m - rr, py - rr, rr * 2, rr * 2);
        }
      }
    }
    c.restore();
  },

  drawOverlay(c, v) {
    const p1 = ph(v, 1), t = tq(v);
    c.save();
    c.globalAlpha = v.k;
    // ---------------- phrase 0: STEP 4 + the 24-hour clock card
    const out0 = 1 - L.smoothstep(L.prog(t, p1 - 0.1, 0.3));
    const k0 = L.enter(t, 0.0, 0.42) * out0;
    if (k0 > 0) {
      stepBadge(c, v, 4, 'STAY INSIDE · 24 H', { k: k0 });
      const ck = L.enter(t, 0.45, 0.6) * out0;
      if (ck > 0) {
        const f = L.ease.inOutCubic(L.prog(t, 0.75, 1.9));
        const X = 64, Y = 552 + (1 - ck) * -12, Wc = 406, Hc = 206;
        c.save();
        c.globalAlpha *= ck;
        c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 22; c.shadowOffsetY = 6;
        c.fillStyle = L.rgba(CD.black, 0.93);
        L.roundRect(c, X, Y, Wc, Hc, 16); c.fill();
        c.shadowColor = 'transparent';
        // ring
        const cx = X + 106, cy = Y + Hc / 2, r = 70;
        c.lineCap = 'butt';
        c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 14;
        c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
        if (f > 0) {
          c.save();
          c.strokeStyle = L.rgba(SAFE); c.lineWidth = 14;
          c.shadowColor = L.rgba(SAFE, 0.7); c.shadowBlur = 14;
          c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); c.stroke();
          c.restore();
        }
        // 24 hour ticks (every 6 h longer)
        for (let i = 0; i < 24; i++) {
          const a = -Math.PI / 2 + (i / 24) * TAU, big = i % 6 === 0;
          const r0 = r - 7 - (big ? 16 : 9), r1 = r - 11;
          const lit = i / 24 <= f + 1e-6 && f > 0;
          c.strokeStyle = lit ? 'rgba(235,255,240,0.95)' : 'rgba(255,255,255,0.3)';
          c.lineWidth = big ? 3.5 : 2;
          c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
        }
        // hand
        const ha = -Math.PI / 2 + TAU * f;
        c.strokeStyle = L.rgba(TEXT); c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ha) * (r - 26), cy + Math.sin(ha) * (r - 26)); c.stroke();
        c.fillStyle = L.rgba(TEXT);
        c.beginPath(); c.arc(cx, cy, 6, 0, TAU); c.fill();
        // readout: the target from the start (the ring + hand do the counting)
        const tx = X + 206;
        c.textBaseline = 'alphabetic'; c.textAlign = 'left';
        c.font = L.font(24, 700, L.FONT.body);
        c.fillStyle = 'rgba(205,212,228,0.9)';
        L.trackedText(c, 'AT LEAST', tx, Y + 52, 3);
        c.font = L.font(112, 700, L.FONT.din);
        c.fillStyle = L.rgba(L.mix(TEXT, SAFE, L.smoothstep(L.prog(f, 0.9, 0.1))));
        c.fillText('24', tx, Y + 152);
        c.font = L.font(24, 700, L.FONT.body);
        c.fillStyle = 'rgba(205,212,228,0.9)';
        L.trackedText(c, 'HOURS', tx, Y + 186, 3);
        c.restore();
      }
    }
    // ---------------- phrase 1: SHELTER WHERE YOU ARE
    const k1 = L.enter(t, p1 + 0.2, 0.6);
    if (k1 > 0) {
      // the caption says "don't go looking for family": the chip says what everyone else does
      stepBadge(c, v, null, 'SHELTER WHERE YOU ARE', {
        k: k1, accent: SAFE, icon: (cc) => houseIcon(cc, 0, 2, 1, CD.ink),
        sub: 'EVERYONE SHELTERS IN PLACE', subK: L.enter(t, p1 + 0.45, 0.45),
      });
    }
    // official guidance (Ready.gov): the whole beat, under STEP 4 then under the SHELTER card
    const ok = L.enter(t, 0.5, 0.5);
    if (ok > 0) {
      const oy = L.lerp(SUB_Y, SUB_Y + 62, L.smoothstep(L.prog(t, p1 + 0.15, 0.35)));
      stepSub(c, [{ t: 'UNLESS OFFICIALS SAY OTHERWISE · ' }, { t: 'RADIO ON', col: L.mix(SAFE, [255, 255, 255], 0.3) }], ok, { y: oy, size: 22, bar: SAFE });
    }
    c.restore();
  },
};
