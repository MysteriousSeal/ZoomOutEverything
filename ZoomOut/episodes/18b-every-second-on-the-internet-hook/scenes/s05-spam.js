// Beat 5 — "Nearly half of them are spam."
// Builds on s04's envelope stream (imported: `envelopes(v)`, `drawEnvelope`; every envelope carries a deterministic
// ~45% `spam` flag). On "half" a fine accent filter line scans down the frame. As it passes, each spam envelope is
// CAUGHT: it snaps grey (a small grey ping), hangs for a beat, then drops away, falling back down to its roof as it
// shrinks and fades. Clean mail flashes accent and keeps rising. After the scan the filter stays on: every new spam
// envelope is caught just after take-off, so the steady stream visibly loses about half its envelopes.
// Label "≈ 45%" / "of all email is spam".
//
// Contract with s04 (sharedRequest): s04 skips drawing an envelope once `isFiltered(v, e)` is true; s05 draws it from
// then on (grey, falling). `isFiltered` only needs v.gt, v.tl and e.{spam, u, sy}.
import * as L from '../../../../engine/runtime/lib.js';
import { ACCENT } from '../env.js';
import { envelopes, drawEnvelope } from './s04-emails.js';

const ACC = ACCENT;
const CORAL = [255, 104, 88];
const { W, H } = L;
const LIFE = 2.2;          // s04's envelope flight time (s)
const SCAN = 0.95;         // the filter line's sweep from y 300 to y 1500 (s)
const LABEL_AT = 0.3;      // label starts once the scan is under way (it clears the label zone ~0.35 s in)

function times(tl) {
  const s = tl.scenes[5].start, ph = tl.lines[5].phrases[0];
  const half = ph.start + (ph.end - ph.start) * 0.21;   // "half"
  return { s, scan: half - 0.08 };
}
const scanY = (gt, T) => L.lerp(300, 1500, L.ease.inOutCubic(L.prog(gt, T.scan, SCAN)));
/** When the scan line passes screen row y (inverse of scanY, approximately). */
function scanAt(y, T) {
  const p = L.clamp((y - 300) / 1200);
  // invert inOutCubic
  const q = p < 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt((1 - p) / 4);
  return T.scan + SCAN * q;
}
/** Catch time of envelope e (or Infinity: never caught). */
function catchTime(gt, tl, e) {
  if (!e.spam) return Infinity;
  const T = times(tl);
  const te = gt - e.u * LIFE;
  const tc = Math.max(te + 0.32, scanAt(e.sy, T));
  return tc - te < LIFE * 0.6 ? tc : Infinity;
}
/** s04 should stop drawing e from here on: s05 owns it (grey, falling away). */
export function isFiltered(v, e) { return v.gt >= catchTime(v.gt, v.tl, e); }

// s04's rise model: screen position / size of an envelope at flight fraction u
function at(e, u, cx, cy) {
  const ee = L.ease.inCubic(u) * 0.7 + 0.3 * u;
  const f = 1 / (1 - 0.68 * ee);
  return { x: cx + (e.sx - cx) * f, y: cy + (e.sy - cy) * f, size: (e.size / e.f) * f, f };
}
const lifeFade = (u) => L.clamp(u / 0.1) * (1 - L.ease.inCubic(L.prog(u, 0.62, 0.38)));

export default {
  beat: 5,
  chapter: { num: '05', title: 'Spam', sub: 'Nearly half' },
  captions: true,
  layer: 4,
  cues(d) {
    // the scan starts on "half" (beat-relative ~0.42)
    return [
      { t: 0.4, name: 'swish', gain: 0.24, pitch: 0.9 },
      { t: 0.46, name: 'shimmer', gain: 0.16, pitch: 1.3 },
      { t: 0.5, name: 'ping', gain: 0.22, pitch: 1.0 },
      { t: 0.85, name: 'blip', gain: 0.12, pitch: 0.7 },
      { t: 1.1, name: 'blip', gain: 0.1, pitch: 0.6 },
      { t: 1.4, name: 'blip', gain: 0.08, pitch: 0.55 },
    ];
  },

  drawWorld(c, v) {
    const T = times(v.tl);
    const gt = v.gt;
    if (gt < T.scan - 0.1 || gt > v.tl.scenes[6].end) return;
    const list = envelopes(v);
    const labK = L.prog(gt, T.scan + LABEL_AT, 0.45);
    const cx = W / 2, cy = H * (v.cam.anchor ?? 0.47);
    c.save();
    // ---- caught spam: grey, hang, then drop back down to the roof
    for (const e of list) {
      if (!e.spam) continue;
      const tc = catchTime(gt, v.tl, e);
      if (gt < tc) continue;
      const te = gt - e.u * LIFE, uc = (tc - te) / LIFE;
      const A = L.clamp(e.a / Math.max(0.04, lifeFade(e.u)));        // s04's zone / zoom fades
      const p = at(e, uc, cx, cy);
      const k = gt - tc;
      // hang briefly in the mesh, then drop clearly away: falls 60-120 px, tilts, shrinks and fades
      const d = L.ease.inCubic(L.prog(k, 0.24, 0.7));
      const hang = Math.sin(L.clamp(k / 0.25) * Math.PI) * 4 * (1 - d);
      const fall = L.lerp(60, 120, L.clamp(p.size / 50)) * d;
      const x = p.x + (e.sx < cx ? -1 : 1) * 10 * d, y = p.y + fall - hang;
      const size = p.size * (1 - 0.35 * d) * (1 + 0.08 * Math.sin(L.clamp(k / 0.18) * Math.PI));
      const rot = (e.sx < cx ? -1 : 1) * 0.55 * d;
      // caught: darkens to ~0.45 of its alpha within 0.2 s, then fades out with the fall
      const dim = L.lerp(1, 0.45, L.ease.outCubic(L.clamp(k / 0.2)));
      let a = A * lifeFade(uc) * dim * (1 - d);
      if (x < 660 && y > 310 && y < 640) a *= 1 - 0.85 * labK;     // keep the label clean
      if (y > 1250 && y < 1420) a *= 0.35;                          // and the caption band
      if (a <= 0.01) continue;
      // the bit of filter mesh that caught it: a fine line under the envelope, sagging with its weight
      const mk = L.ease.outCubic(L.prog(k, 0, 0.18)) * (1 - L.prog(k, 0.3, 0.35));
      if (mk > 0) {
        const hw = size * 1.15 * mk, my = p.y + size * 0.42, sag = 6 * Math.sin(L.clamp(k / 0.25) * Math.PI);
        c.strokeStyle = L.rgba(L.mix([190, 225, 255], [160, 168, 182], L.clamp(k / 0.2)), 0.85 * a * mk);
        c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(p.x - hw, my); c.quadraticCurveTo(p.x, my + sag * 2, p.x + hw, my); c.stroke();
      }
      const ss = size * (1 + 0.12 * L.ease.outBack(L.clamp(k / 0.2)) * (1 - d));
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      drawEnvelope(c, { x: 0, y: 0, size: ss, a, sx: 0, sy: 0 }, { kind: 'spam', trail: false });
      // a coral flag at the catch: tint + a small cross, ~0.25 s
      const fk = L.clamp(k / 0.05) * (1 - L.prog(k, 0.18, 0.2));
      if (fk > 0) {
        const hw = ss * 0.62, hh = ss * 0.42;
        c.fillStyle = L.rgba(CORAL, 0.28 * fk * A);
        c.fillRect(-hw, -hh, hw * 2, hh * 2);
        c.strokeStyle = L.rgba(CORAL, 0.95 * fk * A);
        c.lineWidth = Math.max(1.6, ss * 0.07);
        c.lineCap = 'round';
        const xr = ss * 0.24;
        c.beginPath(); c.moveTo(-xr, -xr); c.lineTo(xr, xr); c.moveTo(xr, -xr); c.lineTo(-xr, xr); c.stroke();
      }
      c.restore();
    }
    // ---- clean mail flashes as the scan passes it
    c.globalCompositeOperation = 'lighter';
    for (const e of list) {
      if (e.spam) continue;
      const ts = scanAt(e.y, T);
      const fl = 1 - Math.abs(gt - ts) / 0.22;
      if (fl > 0) L.lightBlob(c, e.x, e.y, e.size * 1.6, ACC, 0.55 * fl * e.a);
      // having passed the filter, clean mail glows a little brighter
      if (gt > ts && e.y < 1250) L.lightBlob(c, e.x, e.y, e.size * 1.1, ACC, 0.2 * e.a * L.clamp((gt - ts) / 0.3));
    }
    // ---- the filter line: a fine accent scan with a mesh of ticks and a soft wake above it
    const sp = L.prog(gt, T.scan, SCAN);
    if (sp > 0 && sp < 1) {
      const y = scanY(gt, T);
      const a = Math.min(1, sp * 8, (1 - sp) * 6) * (1 - 0.8 * L.clamp(1 - Math.abs(y - 1335) / 95));
      const X0 = 40, X1 = 1000;
      const wake = c.createLinearGradient(0, y - 120, 0, y);
      wake.addColorStop(0, L.rgba(ACC, 0));
      wake.addColorStop(1, L.rgba(ACC, 0.09 * a));
      c.fillStyle = wake;
      // the wake fades out over the caption band
      if (!(y > 1260 && y < 1530)) c.fillRect(X0, y - 120, X1 - X0, 120);
      const lg = c.createLinearGradient(X0, 0, X1, 0);
      lg.addColorStop(0, L.rgba([190, 225, 255], 0));
      lg.addColorStop(0.1, L.rgba([190, 225, 255], 0.9 * a));
      lg.addColorStop(0.9, L.rgba([190, 225, 255], 0.9 * a));
      lg.addColorStop(1, L.rgba([190, 225, 255], 0));
      c.fillStyle = L.rgba(ACC, 0.18 * a);
      c.fillRect(X0, y - 3, X1 - X0, 6);
      c.fillStyle = lg;
      c.fillRect(X0, y - 0.75, X1 - X0, 1.5);
      c.fillStyle = L.rgba(ACC, 0.45 * a);
      for (let x = 80; x < 960; x += 9) c.fillRect(x, y - 5, 1, 10);
    }
    c.restore();
  },

  drawOverlay(c, v) {
    const T = times(v.tl);
    const lk = v.k * L.prog(v.gt, T.scan + LABEL_AT, 0.45);
    if (lk <= 0) return;
    c.save();
    c.globalAlpha = L.clamp(lk);
    // centred on the label block (number + sub-line) so the envelopes drifting under "OF ALL EMAIL" fall back too
    const g = c.createRadialGradient(290, 515, 20, 290, 515, 400);
    g.addColorStop(0, 'rgba(3,6,12,0.72)');
    g.addColorStop(0.6, 'rgba(3,6,12,0.45)');
    g.addColorStop(1, 'rgba(3,6,12,0)');
    c.fillStyle = g;
    c.fillRect(0, 100, 720, 840);
    c.restore();
    L.bigLabel(c, { x: 96, y: 520, big: '≈ 45%', small: 'of all email is spam', k: lk, accent: ACC });
  },
};
