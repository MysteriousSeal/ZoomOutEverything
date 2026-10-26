// Beat 5 — "When the plane stops, leave your bag. | Planes are built so everyone can get out in ninety seconds. |
//           Grabbing luggage has cost lives."
// Camera 'evac': pulls out (1.6 s) from YOU's seat to the whole aircraft at rest on the runway (ground y ≈ 1090).
//   beat +0.08     STEP 4 LEAVE YOUR BAG badge (with the line).
//   "leave" (−0.18)  an ISO prohibition sign with a roller bag scales in over the sky
//                    (centre (540, 700)); its slash wipes across on "bag".
//   phrase 1         the sign leaves as the 90-second dial (s00's) takes its place: EVERYONE OUT / 90 / SECONDS. The doors
//                    open, the slides inflate (env), the cabin empties: one dot per seat walks the aisle to its nearest
//                    exit and slides out (env evacDots); green chevrons stream along the floor toward the exits. The dial's
//                    ring sweeps once as the last dots leave (it stands for the certified 90 s, no counting digits) and
//                    turns green with a check. Sub: BUILT TO EMPTY IN 90 S · HALF THE EXITS (this side's exits are half).
//   phrase 2         the dial leaves; a red hazard tile with the bag glyph takes its place (a slow red pulse); the sub
//                    turns red: GRABBING BAGS HAS COST LIVES. The opaque tile scales away at d − 0.32 (never fades through).
import * as L from '../../../../engine/runtime/lib.js';
import { stepBadge, stepSub, hazardTile, prohibition, glyphBag, CD, EXITG, DANGER, EXITS, lpt, evacState, wordTime, EVAC } from '../env.js';
import { dial } from './s00-hook.js';

const TAU = Math.PI * 2;
const SIGN = { x: 540, y: 735, r: 118 };

export default {
  beat: 5,
  chapter: null,
  captions: true,
  layer: 6,
  cues(d) {
    return [
      { t: 0.05, name: 'whoosh', gain: 0.18, pitch: 0.75 },
      { t: 1.3, name: 'blip', gain: 0.16, pitch: 1.0 },
      { t: 2.3, name: 'tick', gain: 0.18, pitch: 0.8 },
      { t: 3.18, name: 'swell', gain: 0.14, pitch: 0.9 },
      { t: 6.82, name: 'ping', gain: 0.18, pitch: 1.3 },
      { t: 7.22, name: 'deep', gain: 0.2, pitch: 0.7 },
    ];
  },
  drawOverlay(c, v) {
    const t = v.t, d = v.d;
    const b = v.tl.scenes[v.index].start, w = (pj, wi) => wordTime(v.tl, 5, pj, wi) - b;
    const ph = (j) => v.tl.lines[5].phrases[j].start - b;
    const tLeave = w(0, 4) - 0.18, tBag = w(0, 6) - 0.1, p1 = ph(1), p2 = ph(2);
    const ev = evacState(v.gt, v.tl);
    c.save();
    c.globalAlpha = v.k;
    // ---- green flow chevrons along the cabin floor toward the exits (while the cabin empties)
    const fk = L.smoothstep(L.prog(ev.t, 0.3, 0.4)) * (1 - L.smoothstep(L.prog(ev.t, EVAC.last + 0.1, 0.5)));
    if (fk > 0) {
      c.save();
      c.globalAlpha *= fk;
      c.strokeStyle = L.rgba(EXITG, 0.95); c.lineWidth = 4.5; c.lineCap = 'round'; c.lineJoin = 'round';
      const sp = 1.2, ph0 = (v.gt * 1.6) % sp;
      for (let x = -6.5; x < 12.2; x += sp) {
        const xx = x + ph0;
        let best = EXITS[0], bd = 1e9;
        for (const e of EXITS) { const dd = Math.abs(e.x - xx); if (dd < bd) { bd = dd; best = e; } }
        if (bd < 0.6) continue;
        const dir = Math.sign(best.x - xx);
        const [sx, sy] = lpt(v, xx, -2.62), s = 11;
        c.beginPath(); c.moveTo(sx - dir * s, sy - s); c.lineTo(sx + dir * s * 0.4, sy); c.lineTo(sx - dir * s, sy + s); c.stroke();
      }
      c.restore();
    }
    // ---- the prohibition sign (leave your bag)
    const sIn = L.prog(t, tLeave, 0.5), sOut = L.ease.inCubic(L.prog(t, p1 - 0.2, 0.25));
    if (sIn > 0 && sOut < 1) {
      prohibition(c, SIGN.x, SIGN.y, SIGN.r, sIn * (1 - sOut), L.prog(t, tBag, 0.35), (g, s) => glyphBag(g, s * 0.82, 'rgb(246,244,238)'));
    }
    // ---- the 90 s dial: sweeps once while the cabin empties, then turns green
    // (the done dial is gone before the bag hazard arrives: no overlap)
    const dIn = L.prog(t, p1 - 0.05, 0.45), dOut = L.ease.inCubic(L.prog(t, p2 - 0.55, 0.25));
    if (dIn > 0 && dOut < 1) {
      const prog = L.clamp((ev.t - 0.1) / (EVAC.last + 0.45 - 0.1));
      const done = L.prog(ev.t, EVAC.last + 0.45, 0.3);
      const col = L.mix(CD.yellow, EXITG, L.smoothstep(done));
      dial(c, SIGN.x, SIGN.y, 124, dIn * (1 - dOut), prog, { col, top: 'ALL OUT IN', big: '90', small: 'SECONDS', done });
    }
    // ---- phrase 2: the red bag hazard
    const hIn = L.prog(t, p2 - 0.15, 0.5);
    if (hIn > 0) {
      const pulse = 0.5 + 0.5 * Math.sin((t - p2) * 4);
      c.save();
      c.strokeStyle = L.rgba(DANGER, 0.55 * L.clamp(hIn * 2) * (1 - pulse)); c.lineWidth = 3;
      c.beginPath(); c.arc(SIGN.x, SIGN.y, 112 + 26 * pulse, 0, TAU); c.stroke();
      c.restore();
      // the tile is opaque: it scales away at the beat's end instead of fading through
      const hOut = L.ease.inCubic(L.prog(t, d - 0.32, 0.22));
      c.save(); c.globalAlpha = 1;
      if (hOut < 1) hazardTile(c, Math.min(1, hIn) * (1 - hOut) + (hIn > 1 ? 0 : 0), (g, s) => glyphBag(g, s * 0.95, L.rgba(DANGER)), { x: SIGN.x - 84, y: SIGN.y - 84, h: 168, color: DANGER });
      c.restore();
    }
    // ---- STEP 4 badge + sub
    const bk = L.ease.outCubic(L.prog(t, 0.08, 0.75));   // with the line: no text-free stretch after the brace card
    stepBadge(c, v, 4, 'LEAVE YOUR BAG', { k: bk });
    const s1 = L.ease.outCubic(L.prog(t, p1 + 0.1, 0.45)) * (1 - L.ease.inCubic(L.prog(t, p2 - 0.2, 0.2)));
    if (s1 > 0) stepSub(c, [{ t: 'BUILT TO EMPTY IN 90 S' }, { t: '  ·  HALF THE EXITS', col: [170, 178, 194] }], s1);
    const s2 = L.ease.outCubic(L.prog(t, p2 + 0.05, 0.45));
    if (s2 > 0) stepSub(c, [{ t: 'GRABBING BAGS HAS COST LIVES', col: [255, 150, 136] }], s2, { bar: DANGER });
    c.restore();
  },
};
