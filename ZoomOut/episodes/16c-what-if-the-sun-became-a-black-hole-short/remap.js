// 16c (the ~50 s cut of 16): the TIME REMAP.
//
// Every scene of 16, env.js and its story state (the light front, the clock, the freeze, the star's state, the label
// and tag tracks) run on episode 16's ABSOLUTE film time (orig16.js). 16c keeps those modules (with a few retimed
// constants, notes "16c" in each file) and renders them at a remapped time: og = toOrig(gt), a monotone piecewise-
// linear map anchored on the spoken words (each 16c phrase onto the 16 phrase it says), so every visual still lands on
// its word. Between the anchors the map is linear; where 16 beats were cut it runs through a short RAMP (0.12-0.2 s)
// across the cut window, in a moment where the outgoing labels have already faded (each crossing is commented below).
//
//   16c beat (main timeline)                         16 beats / window
//   0  hook "What if the Sun suddenly…"               0 (+ the rewind, retimed to 2.85-3.35 s, then 1 is skipped)
//   1  "For 8 minutes and 20 seconds, …"              2
//   2  "That's how long sunlight…, | and gravity…"    3 + the first 1.65 s of 4 (the gravity ripple), rest of 4 skipped
//   3  "Then, | the sky would go dark."               5 (6 skipped)
//   4  "But Earth would keep the same orbit. |        7 (to 28.85 s; the year sweep is retimed into it), then 9
//       Only mass and distance matter."                  (7's second phrase and 8 skipped between the two phrases)
//   5  "So how small is a black hole…"                10
//   6  "About 6 km wide. | Smaller than a city."      11 (12 skipped)
//   7  "Back on Earth, | within weeks … −18 °C."      13 (first phrase; its second phrase is crossed in the phrase
//                                                       gap) + 14 (15 skipped)
//   8  "But here's the twist: …"                      16
//   9  "It's far too light. | …20 times heavier."     17
//   10 the question card                              17's last 0.46 s, slowed (18 never starts)
//
// The CAMERA does not use this map for its moves: camera.js flies 16c's own keys on the 16c timeline (so no move is
// ever sped up through a ramp); scenes that sample the camera on 16 time are converted back with fromOrig().
import * as L from '../../../engine/runtime/lib.js';
import { ORIG } from './orig16.js';

// the 16c main timeline (the preroll line removed, absolute times kept: the engine's own `tl`)
const RAW = await (await fetch(new URL('./build/timeline.json', import.meta.url))).json();
export const TL = RAW.preroll ? { ...RAW, scenes: RAW.scenes.slice(1), lines: RAW.lines.slice(1) } : RAW;
export { ORIG };

/** 16c beat index -> the 16 beats it plays (first = its own; used for overlays, k and cues). */
export const MAP = [[0, 1], [2], [3, 4], [5], [7, 9], [10], [11], [13, 14], [16], [17], [17]];
export const QUESTION = 10;

// ------------------------------------------------------------------ anchors [16c s, 16 s]
const P = (li, pi, e) => { const ph = TL.lines[li].phrases; return ph[Math.min(pi, ph.length - 1)][e ? 'end' : 'start']; };
const O = (li, pi, e) => { const ph = ORIG.lines[li].phrases; return ph[pi][e ? 'end' : 'start']; };
const B = (b) => TL.scenes[b].start;

/** 16 time at which the hook's rewind starts / ends (s00-hook.js RW0 / RW1, retimed for 16c). */
export const RW = { a: 2.85, b: 3.35 };
/** 16 time where story time resumes after the skipped beat 1 (s00-hook.js storyT holds still across the ramp). */
export const SKIP1_TO = O(2, 0) - 0.06;

const A = [];
const add = (n, o) => A.push([n, o]);
{
  // 0 hook: 1:1 on the line (16c beat 0 starts 0.15 s before the line, 16's 0.35 s), then the rewind (0.5 s, 1:1),
  //   then a 0.14 s ramp across the rest of 16's beat 1 (story time frozen there, the sky Sun already restored)
  const off = P(0, 0) - O(0, 0);
  add(B(0), B(0) - off);
  add(P(0, 0, 1), O(0, 0, 1));
  add(RW.a + off, RW.a);
  add(RW.b + off, RW.b);
  add(P(1, 0) - 0.06, SKIP1_TO);
  // 1 "For 8 minutes and 20 seconds, | nothing would change."
  add(P(1, 0), O(2, 0)); add(P(1, 0, 1), O(2, 0, 1)); add(P(1, 1), O(2, 1)); add(P(1, 1, 1), O(2, 1, 1));
  // 2 "That's how long sunlight takes to reach us, |" = 16 line 3; "and gravity is no faster." = the 1.65 s after it
  //   (the ripple packet, s04 retimed). Ramp across the rest of 16's beat 4 in the line gap (s03's label is gone).
  add(P(2, 0), O(3, 0)); add(P(2, 0, 1), O(3, 0, 1));
  const g0 = O(3, 0, 1) + (P(2, 1) - P(2, 0, 1));
  add(P(2, 1), g0); add(P(2, 1, 1), g0 + (P(2, 1, 1) - P(2, 1)));
  //   16c audit: the ramp widened from 0.18 to 0.30 s (+0.05 / -0.05) so the HUD clock and the light front do not leap
  add(P(2, 1, 1) + 0.05, g0 + (P(2, 1, 1) - P(2, 1)) + 0.05);
  add(P(3, 0) - 0.05, O(5, 0) - 0.05);
  // 3 "And then, | the sky would go dark." = 16 line 5 (+ a 0.6 s voice hold); 1:1 to the 16c beat end so "Lights out"
  //   holds 1.5 s and is gone by it (s06 draws the label track in 16's beat 6), then a 0.15 s ramp across 16's beat 6
  //   (the fly-off) into 7
  add(P(3, 0), O(5, 0)); add(P(3, 0, 1), O(5, 0, 1)); add(P(3, 1), O(5, 1)); add(P(3, 1, 1), O(5, 1, 1));
  add(B(4), O(5, 1, 1) + (B(4) - P(3, 1, 1)));
  add(P(4, 0), 27.45);
  // 4 "But Earth would keep the same orbit. |" = 16's 27.45-28.85 (the year sweep, retimed to 27.55-28.55), "Only mass and distance
  //   matter." = 16 line 9; the phrase gap ramps across 16's 29.0-37.41 (the radius, "same pull": all retimed away)
  add(P(4, 0, 1), 28.85);
  add(P(4, 0, 1) + 0.15, 29.0);
  add(P(4, 1) - 0.05, O(9, 0) - 0.05);
  add(P(4, 1), O(9, 0)); add(P(4, 1, 1), O(9, 0, 1));
  // 5 the dive (16 line 10), 6 six kilometers (16 line 11)
  add(P(5, 0), O(10, 0)); add(P(5, 0, 1), O(10, 0, 1));
  add(P(6, 0), O(11, 0)); add(P(6, 0, 1), O(11, 0, 1)); add(P(6, 1), O(11, 1)); add(P(6, 1, 1), O(11, 1, 1));
  // 6 -> 7: 1:1 for 0.25 s (the labels fade by the beat end), then a 0.12 s ramp across 16's beat 12 (the drive: not
  //   drawn; the hole and the city plate are s11's and unchanged through it)
  add(P(6, 1, 1) + 0.25, O(11, 1, 1) + 0.25);
  add(P(7, 0) - 0.05, O(13, 0) - 0.05);
  // 7 "Back on Earth, |" = 16 line 13's first phrase; its second phrase ("the cold would set in fast") is crossed in
  //   the phrase gap (the clock races to days, the ice creeps: time-lapse); "within weeks … −18 °C" = 16 line 14
  add(P(7, 0), O(13, 0)); add(P(7, 0, 1), O(13, 0, 1));
  add(P(7, 1), O(14, 0)); add(P(7, 1, 1), O(14, 1, 1));
  // 7 -> 8: 1:1 for 0.2 s, then a 0.17 s ramp across 16's beat 15 (the oceans: not drawn, the camera never goes there)
  add(P(7, 1, 1) + 0.2, O(14, 1, 1) + 0.2);
  add(P(8, 0) - 0.05, O(16, 0) - 0.05);
  // 8 the twist (16 line 16), 9 too light (16 line 17): the same phrases, ~1:1
  add(P(8, 0), O(16, 0)); add(P(8, 0, 1), O(16, 0, 1)); add(P(8, 1), O(16, 1)); add(P(8, 1, 1), O(16, 1, 1));
  add(P(9, 0), O(17, 0)); add(P(9, 0, 1), O(17, 0, 1)); add(P(9, 1), O(17, 1)); add(P(9, 1, 1), O(17, 1, 1));
  // 10 the question: 16's last 0.46 s of beat 17, slowed down (the 20x star and the Sun hold; 16's star exit at
  //   79.49 s and the future clock at 79.85 s are never reached)
  add(TL.total, 79.40);
}
for (let i = 1; i < A.length; i++) {
  if (!(A[i][0] > A[i - 1][0] && A[i][1] > A[i - 1][1])) throw new Error(`16c remap: anchors ${i - 1}/${i} not increasing: ${A[i - 1]} ${A[i]}`);
}
export const ANCHORS = A;

function interp(x, xi, yi) {
  if (x <= A[0][xi]) return A[0][yi] + (x - A[0][xi]);
  const n = A.length - 1;
  if (x >= A[n][xi]) return A[n][yi] + (x - A[n][xi]);
  let lo = 0, hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (A[m][xi] <= x) lo = m; else hi = m; }
  const a = A[lo], b = A[hi];
  return a[yi] + (b[yi] - a[yi]) * (x - a[xi]) / (b[xi] - a[xi]);
}
/** 16c global time -> 16 film time. */
export const toOrig = (gt) => interp(gt, 0, 1);
/** 16 film time -> 16c global time (inverse). */
export const fromOrig = (og) => interp(og, 1, 0);

/** 16 beat at 16 time og. */
export function origBeat(og) { let b = 0; ORIG.scenes.forEach((s, i) => { if (s.start <= og + 1e-9) b = i; }); return b; }
/** 16c beat at 16c time gt. */
export function newBeat(gt) { let b = 0; TL.scenes.forEach((s, i) => { if (s.start <= gt + 1e-9) b = i; }); return b; }
/** 16c beat that plays 16 beat ob (null: cut). */
export const beatOf16 = (ob) => { const i = MAP.findIndex((m, j) => j !== QUESTION && m.includes(ob)); return i < 0 ? null : i; };

/** The engine's overlay curve (main.js overlayK) on 16's timeline: fade in 0.45 s, out over the last 0.3 s. */
function origK(ob, og, overlayIn) {
  const s = ORIG.scenes[ob];
  const kin = overlayIn === false ? (og >= s.start - 0.05 ? 1 : 0) : L.ease.outCubic(L.prog(og, s.start, 0.45));
  const kout = ob === ORIG.scenes.length - 1 ? 1 : 1 - L.ease.inCubic(L.prog(og, s.end - 0.3, 0.3));
  return Math.min(kin, kout);
}
/** The fade-out half of the engine curve on 16c's timeline (labels are gone by the 16c beat end). */
function newKout(nb, gt) {
  if (nb == null) return 1;
  const s = TL.scenes[nb];
  return nb === TL.scenes.length - 1 ? 1 : 1 - L.ease.inCubic(L.prog(gt, s.end - 0.3, 0.3));
}

/** An engine view on 16 time (env, HUD): gt = 16 time, ngt = 16c time, tl = 16's timeline, beat / t / d of 16. */
export function ov(v) {
  if (v.tl?.__orig) return v;
  const og = toOrig(v.gt), b = origBeat(og), s = ORIG.scenes[b];
  return { ...v, gt: og, ngt: v.gt, tl: ORIG, beat: b, t: og - s.start, d: s.end - s.start };
}
/** A scene view for 16 scene `ob` (as main.js sceneView would have built it in 16), from any 16c view. k = 16's overlay
 *  curve for ob x the fade-out of the 16c beat nb that draws it (so every label is gone by its 16c beat end). */
export function oview(v, ob, S, nb = beatOf16(ob)) {
  const ngt = v.ngt ?? v.gt;
  const og = v.tl?.__orig ? v.gt : toOrig(v.gt);
  const b = origBeat(og), s = ORIG.scenes[ob];
  const k = origK(ob, og, S?.overlayIn) * newKout(nb, ngt);
  return { ...v, gt: og, ngt, tl: ORIG, beat: b, t: og - s.start, d: s.end - s.start, k, index: ob, active: b === ob };
}

/** 16c cue list for 16 scene S (16 beat ob): its cue times moved through the map, relative to 16c beat nb. */
export function mapCues(S, ob, nb, keep = () => true) {
  const s = ORIG.scenes[ob];
  const out = [];
  for (const q of S.cues?.(s.end - s.start) ?? []) {
    const o = s.start + q.t;
    if (!keep(o, q)) continue;
    out.push({ ...q, t: Math.max(0, fromOrig(o) - TL.scenes[nb].start) });   // (the hook's first 0.2 s of 16 is skipped)
  }
  return out;
}
