// 17c (the ~50 s cut of 17, with 17b's cold open and closing question): the LEGACY TIMELINE adapter.
//
// 17c's episode.json has 14 film lines (13 + the comment question); 17 had 19. Every scene, env.js and camera.js were
// written (and audited) against 17's 19 beats, so instead of rewriting their indices, 17c rebuilds a 17-shaped
// timeline (20 beats: 17's 19 + the question) from the real 17c one and hands THAT to the 17 code. Cut beats get zero
// length at the start of the next kept beat, so every `tl.scenes[N]` reference still resolves:
//
//   17 beat                                   17c beat
//   0  hook                                   0  hook ("What happens inside your body in a single second?")
//   1  "Start the clock…"                     (cut: zero length at the start of 17c beat 1; the crown click now lands
//                                              on the hook line's last word, marks.cs)
//   2  heart . 3 seventy ml . 4 nerve . 5 soccer field . 6 dive . 7 25 trillion    1 . 2 . 3 . 4 . 5 . 6
//   8  "Each one laps your body…"             (cut: zero length at the start of 17c beat 7)
//   9  marrow map . 10 cell factory           7 . 8
//   11 lifespan . 12 breath . 13 100 W        (cut: zero length at the start of 17c beat 9)
//   14 strangest . 15 330 billion . 16 every second                              9 . 10 . 11
//   17 "Mostly blood and gut…"                (cut: zero length at the start of 17c beat 12)
//   18 the new you . 19 question              12 . 13
//
// The heart rhythm (whole stopwatch seconds after marks.cs) drives s02/s03: marks.label2 / pump / handoff are the
// heartbeats those scenes used to take at cs + 5 / 8 / 10 in 17.
// Scenes get a view whose tl is the legacy timeline and whose t / d / index / beat / active are those of their 17 beat
// (adapt below); env.js and camera.js convert the engine's timeline the same way (legacy() is idempotent).
import * as L from '../../../engine/runtime/lib.js';

/** 17c main-film beat (= episode.json lines order, preroll not counted) of each 17 beat; null = cut (zero length). */
const MAP = [0, null, 1, 2, 3, 4, 5, 6, null, 7, 8, null, null, null, 9, 10, 11, null, 12, 13];
export const CUT = MAP.map((m, i) => (m === null ? i : -1)).filter((i) => i >= 0);

// ------------------------------------------------------------------ the timeline + spoken lines (for TT and cues)
const RAW = await (await fetch(new URL('./build/timeline.json', import.meta.url))).json();
const EP = await (await fetch(new URL('./episode.json', import.meta.url))).json();
/** The engine-shaped 17c main timeline (preroll line removed, absolute times kept), loaded at import. */
export const TL = RAW.preroll ? { ...RAW, scenes: RAW.scenes.slice(1), lines: RAW.lines.slice(1) } : RAW;
/** Spoken phrases of each 17c line ("{shown~spoken}" -> spoken, caption break markers dropped). */
const SPOKEN = EP.lines.map((ln) => ln.replace(/\{([^}~]*)~([^}]*)\}/g, '$2').replace(/\/(?=\s|$)/g, '').split('|').map((p) => p.trim()));

/** Start time (global s) of the n-th word matching `re` in 17c line `li` (caption-style weighting on the spoken words). */
export function wordTime(tl, li, re, n = 0) {
  const ln = tl.lines[li];
  const phs = ln.phrases ?? [ln];
  for (let pi = 0; pi < phs.length; pi++) {
    const ph = phs[pi];
    const words = (SPOKEN[li]?.[pi] ?? ph.text).split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (re.test(words[i].replace(/[^\w'-]/g, '')) && n-- === 0) return ph.start + ((ph.end - ph.start) * acc) / tot;
      acc += wts[i];
    }
  }
  return ln.start;
}

const MEMO = new WeakMap();
/** The 17-shaped (20-beat) timeline for a 17c main timeline (the engine's tl, preroll already removed). Idempotent. */
export function legacy(tl) {
  if (tl.__legacy) return tl;
  let T = MEMO.get(tl);
  if (T) return T;
  const S = tl.scenes;
  const startOf = (o) => { for (let j = o; j < MAP.length; j++) if (MAP[j] !== null) return S[MAP[j]].start; return tl.total; };
  const scenes = MAP.map((m, o) => (m === null ? { start: startOf(o), end: startOf(o) } : { start: S[m].start, end: S[m].end }));
  const lines = MAP.map((m, o) => {
    if (m !== null) return tl.lines[m];
    const s = scenes[o].start;
    return { text: '', start: s, end: s, phrases: [{ text: '', start: s, end: s }] };
  });
  // the crown click: just after the hook line, so the heartbeats (whole seconds after it) fall where s02/s03 want them
  const cs = S[1].start - 0.45;                                    // on "…second?" (the hook line's last word)
  const label2 = cs + 1;                                           // "≈ 1 BEAT" (17: cs + 5)
  let pump = cs + Math.ceil(S[2].start + 0.5 - cs);                // the first heartbeat ≥ 0.5 s into the 70 ml beat (17: cs + 8)
  const handoff = pump + 1;                                        // the eye goes to the thumb (17: cs + 10)
  const marks = {
    cs, label2, pump, handoff,
    // beat-relative label times on the spoken words
    lab4: wordTime(tl, 3, /^a$/) - 0.2 - S[3].start,               // "120 m/s" just before "a hundred and twenty"
  };
  T = { ...tl, scenes, lines, marks, __legacy: true, __tl: tl };
  MEMO.set(tl, T);
  return T;
}

/** 17 beat index at global time gt (zero-length beats are never current). */
export function oldBeat(T, gt) { let b = 0; T.scenes.forEach((s, i) => { if (s.start <= gt) b = i; }); return b; }

/** An engine view with the legacy timeline (t / d untouched). Idempotent. */
export const lview = (v) => (v.tl.__legacy ? v : { ...v, tl: legacy(v.tl) });

/** A scene view for 17 beat o: legacy tl, and t / d / index / beat / active of that 17 beat. */
export function oview(v, o, extra = {}) {
  const T = legacy(v.tl), s = T.scenes[o], b = oldBeat(T, v.gt);
  return { ...v, tl: T, t: v.gt - s.start, d: s.end - s.start, index: o, beat: b, active: b === o, ...extra };
}

/** Wrap a 17 scene object (17 beat o) so the engine can play it as a 17c beat. */
export function adapt(S, o, over = {}) {
  return {
    ...S,
    drawWorld: S.drawWorld && ((c, v) => S.drawWorld(c, oview(v, o))),
    drawOverlay: S.drawOverlay && ((c, v) => S.drawOverlay(c, oview(v, o))),
    ...over,
  };
}

/** The legacy timeline of the loaded 17c timeline (module-level constants: TT, cue times). */
export const LT = legacy(TL);
/** Seconds after 17 beat o's start of global time t (for beat-relative cue lists). */
export const rel = (o, t) => t - LT.scenes[o].start;
