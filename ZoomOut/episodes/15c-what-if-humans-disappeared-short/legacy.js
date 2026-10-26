// 15c (the ~50 s cut of 15b): the LEGACY TIMELINE adapter.
//
// 15c's episode.json has 10 film lines; 15b had 14. Every scene, env.js and camera.js were written (and audited) against
// 15b's 14 beats, so instead of rewriting their indices, 15c rebuilds a 15b-shaped timeline from the real 15c one and
// hands THAT to the 15b code. Each 15b beat is mapped onto 15c's beats (all times derived from build/timeline.json:
// beat starts and word times, nothing absolute):
//
//   15b beat                                  15c beat / window
//   0  hook                                   0  hook
//   1  "At first, the lights would stay on"   (cut: zero length at the start of 15c beat 1)
//   2  power plants shut down                 1  from its start to just before "and the lights…"
//   3  "One by one, the lights would go out"  1  from just before "and the lights…" to its end (merged line)
//   4  pumps keep the subway dry              2  from its start to "pumps" (merged line "Without its pumps, …")
//   5  the subway floods in two days          2  from "pumps" to its end
//   6  forest . 7 bridges . 8 plastic         3 . 4 . 5
//   9  bronze statues                         (cut: zero length at the start of 15c beat 6)
//   10 last trace . 11 broadcasts . 12 bubble . 13 question   6 . 7 . 8 . 9
//
// Scenes get a view whose tl is the legacy timeline and whose t / d / index / beat / active are those of their 15b beat
// (adapt below); env.js and camera.js convert the engine's view / timeline the same way (lview, legacy).
import * as L from '../../../engine/runtime/lib.js';

/** 15c main-film beat indices (= episode.json lines/scenes order; the preroll is not counted). */
export const NB = { hook: 0, grid: 1, subway: 2, forest: 3, bridges: 4, plastic: 5, trace: 6, broadcasts: 7, bubble: 8, question: 9 };

// the weighted word timing the captions use, on the SPOKEN words ({numeral~spoken} lines show numerals)
const SPOKEN = { '2': 'two', '20': 'twenty', '1,000': 'a thousand', '100': 'a hundred', '10,000': 'ten thousand' };
const spokenText = (txt) => txt.replace(/\/(?=\s|$)/g, '').replace(/\d[\d,]*/g, (n) => SPOKEN[n] ?? n);
/** Start time (global s) of the n-th word matching `re` in line `li` of timeline `tl` (15c indices). */
export function wordTime(tl, li, re, n = 0) {
  const ln = tl.lines[li];
  for (const ph of ln.phrases ?? [ln]) {
    const words = spokenText(ph.text).split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (re.test(words[i]) && n-- === 0) return ph.start + ((ph.end - ph.start) * acc) / tot;
      acc += wts[i];
    }
  }
  return ln.start;
}

const MEMO = new WeakMap();
/** The 15b-shaped (14-beat) timeline for a 15c main timeline (the engine's tl, preroll already removed). */
export function legacy(tl) {
  if (tl.__legacy) return tl;
  let T = MEMO.get(tl);
  if (T) return T;
  const S = tl.scenes, N = (b) => S[NB[b]].start;
  // the blackout (15b beat 3) starts just before "and the lights would go out"
  const t3 = wordTime(tl, NB.grid, /^and$/) - 0.2;
  // the pumps die and the flood (15b beat 5) starts on "pumps" ("Without its pumps, …")
  const t5 = wordTime(tl, NB.subway, /^pumps/);
  // the flood locks on 2 DAYS (with the HUD clock) on "two days"; the label arrives on "flood"
  const lock5 = wordTime(tl, NB.subway, /^two$/) + 0.12;
  const label5 = wordTime(tl, NB.subway, /^flood$/) - 0.1;
  const starts = [N('hook'), N('grid'), N('grid'), t3, N('subway'), t5, N('forest'), N('bridges'), N('plastic'),
    N('trace'), N('trace'), N('broadcasts'), N('bubble'), N('question')];
  const scenes = starts.map((s, i) => ({ start: s, end: i < starts.length - 1 ? starts[i + 1] : S[NB.question].end }));
  const blank = (i) => ({ text: '', start: scenes[i].start, end: scenes[i].start, phrases: [] });
  const Ln = tl.lines, nl = (b) => Ln[NB[b]];
  const lines = [nl('hook'), blank(1), nl('grid'), blank(3), nl('subway'), nl('subway'), nl('forest'), nl('bridges'),
    nl('plastic'), blank(9), nl('trace'), nl('broadcasts'), nl('bubble'), nl('question')];
  const marks = { t3, t5, lock5: lock5 - t5, label5: label5 - t5 };   // lock5 / label5: 15b-beat-5 seconds
  // the time-lapse clock (hours since everyone vanished, reached in each 15b beat; null = the clock leaves).
  // `at` / `dur`: when the count runs, in seconds after the 15b beat start. Beats 1 and 9 have no length any more.
  const YR = 8766;
  const elapsed = [
    { h: 0 },
    { h: 0.5 },                                         // 1 (cut) "30 MINUTES" as the clock fades in
    { h: 4, at: 0.3, dur: 1.8 },                        // 2 within hours: plants shut down
    { h: 8, at: 0.15, dur: 1.55 },                      // 3 the blackout
    { h: 12, at: 0.05, dur: 0.6 },                      // 4 the pumps (a short window now)
    { h: 48, at: 0.3, dur: Math.max(0.6, marks.lock5 - 0.3) },   // 5 the flood: locks on 2 DAYS on "two days"
    { h: 20 * YR, at: 0.1, dur: 0.7 },                  // 6 twenty years: forest
    { h: 300 * YR, at: 0.1, dur: 1.9 },                 // 7 a few centuries: bridges fall
    { h: 1000 * YR, at: 0.2, dur: 1.5 },                // 8 plastic
    null,                                               // 9 (cut: no "millions of years")
    null, null, null, null,                             // 10-13 the clock gives way to the light-year scale
  ];
  T = { ...tl, scenes, lines, marks, elapsed, __legacy: true, __tl: tl };
  MEMO.set(tl, T);
  return T;
}

/** 15b beat index at global time gt (zero-length beats are never current). */
export function oldBeat(T, gt) { let b = 0; T.scenes.forEach((s, i) => { if (s.start <= gt) b = i; }); return b; }

/** An engine view with the legacy timeline (env.js; t / d untouched). Idempotent. */
export const lview = (v) => (v.tl.__legacy ? v : { ...v, tl: legacy(v.tl) });

/** A scene view for 15b beat o: legacy tl, and t / d / index / beat / active of that 15b beat. */
export function oview(v, o, extra = {}) {
  const T = legacy(v.tl), s = T.scenes[o], b = oldBeat(T, v.gt);
  return { ...v, tl: T, t: v.gt - s.start, d: s.end - s.start, index: o, beat: b, active: b === o, ...extra };
}

/** Wrap a 15b scene object (15b beat o) so the engine can play it as a 15c beat. */
export function adapt(S, o, over = {}) {
  return {
    ...S,
    drawWorld: S.drawWorld && ((c, v) => S.drawWorld(c, oview(v, o))),
    drawOverlay: S.drawOverlay && ((c, v) => S.drawOverlay(c, oview(v, o))),
    ...over,
  };
}

/** Engine-style overlay strength for a legacy window (fade in 0.45 s, gone by its end). */
export function windowK(T, o, gt) {
  const s = T.scenes[o];
  return Math.min(L.ease.outCubic(L.prog(gt, s.start, 0.45)), 1 - L.ease.inCubic(L.prog(gt, s.end - 0.3, 0.3)));
}
