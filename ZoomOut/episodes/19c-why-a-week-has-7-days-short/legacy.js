// 19c (the ~52 s cut of 19, with the same cold open and closing question as 19b): the LEGACY TIMELINE adapter.
//
// 19c's episode.json has 14 film lines (13 + the comment question); 19 had 19. Every scene, env.js and camera.js were
// written (and audited) against 19's 19 beats, so instead of rewriting their indices, 19c rebuilds a 19-shaped
// timeline (20 beats: 19's 19 + the question) from the real 19c one and hands THAT to the 19 code (as 17c does).
// Cut beats get zero length at the start of the next kept beat, so every `tl.scenes[N]` reference still resolves:
//
//   19 beat                                   19c beat (engine, preroll not counted)
//   0 hook . 1 from the sky . 2 day . 3 month . 4 year . 5 no week          0 . 1 . 2 . 3 . 4 . 5
//   6  Moon phases                            (cut: zero length at the start of 6; the camera dives from the Sun's
//                                              orbit straight into Babylon)
//   7  Babylon . 8 seven lights               6 . 7
//   9  wanderers . 10 Sabbath . 11 spread     (cut: zero length at the start of 8; the camera stays in the rooftop sky,
//                                              and the Babylon skyline cross-dissolves into the Roman one)
//   12 Roman days . 13 Saturday/Sunday/Monday 8 . 9
//   14 French . 15 Norse                      (cut: zero length at the start of 10; no French morphs / exits)
//   16 ten-day week . 17 Soviet . 18 outlived 10 . 11 . 12
//   19 the question                           13
//
// Scenes get a view whose tl is the legacy timeline and whose t / d / index / beat / active are those of their 19 beat
// (adapt below); env.js and camera.js convert the engine's timeline the same way (legacy() is idempotent). The legacy
// lines carry the SPOKEN words ("seven", "five planets"), so the 19 code's text needles still match.
/** 19c main-film beat (= episode.json lines order, preroll not counted) of each 19 beat; null = cut (zero length). */
const MAP = [0, 1, 2, 3, 4, 5, null, 6, 7, null, null, null, 8, 9, null, null, 10, 11, 12, 13];
export const CUT = MAP.map((m, i) => (m === null ? i : -1)).filter((i) => i >= 0);
/** Is 19 beat o cut? */
export const isCut = (o) => MAP[o] === null;

// ------------------------------------------------------------------ the timeline + spoken lines
const RAW = await (await fetch(new URL('./build/timeline.json', import.meta.url))).json();
const EP = await (await fetch(new URL('./episode.json', import.meta.url))).json();
/** The engine-shaped 19c main timeline (preroll line removed, absolute times kept), loaded at import. */
export const TL = RAW.preroll ? { ...RAW, scenes: RAW.scenes.slice(1), lines: RAW.lines.slice(1) } : RAW;
/** Spoken phrases of each 19c film line ("{shown~spoken}" -> spoken, caption break markers dropped). */
const SPOKEN = EP.lines.map((ln) => ln.replace(/\{([^}~]*)~([^}]*)\}/g, '$2').replace(/\/(?=\s|$)/g, '').split('|').map((p) => p.trim()));

/** Start time (global s) of the n-th word starting with `needle` in 19c line li (caption-style weighting, spoken words). */
export function wordAt(tl, li, needle, n = 0) {
  const ln = tl.lines[li];
  const phs = ln.phrases ?? [ln];
  for (let pi = 0; pi < phs.length; pi++) {
    const ph = phs[pi];
    const words = (SPOKEN[li]?.[pi] ?? ph.text).split(/\s+/);
    const wts = words.map((w) => w.replace(/\W/g, '').length + 1.5 + (/[,.?!:]$/.test(w) ? 3 : 0));
    const tot = wts.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase().replace(/[^a-z0-9-]/g, '').startsWith(needle) && n-- === 0) return ph.start + ((ph.end - ph.start) * acc) / tot;
      acc += wts[i];
    }
  }
  return ln.start;
}

const MEMO = new WeakMap();
/** The 19-shaped (20-beat) timeline for a 19c main timeline (the engine's tl, preroll already removed). Idempotent. */
export function legacy(tl) {
  if (!tl || tl.__legacy) return tl;
  let T = MEMO.get(tl);
  if (T) return T;
  const S = tl.scenes;
  const startOf = (o) => { for (let j = o; j < MAP.length; j++) if (MAP[j] !== null) return S[MAP[j]].start; return tl.total; };
  const scenes = MAP.map((m, o) => (m === null ? { start: startOf(o), end: startOf(o) } : { start: S[m].start, end: S[m].end }));
  const lines = MAP.map((m, o) => {
    const s = scenes[o].start;
    if (m === null) return { text: '', start: s, end: s, phrases: [{ text: '', start: s, end: s }] };
    const ln = tl.lines[m];
    const phrases = (ln.phrases ?? [ln]).map((p, pi) => ({ ...p, text: SPOKEN[m]?.[pi] ?? p.text }));
    return { ...ln, text: phrases.map((p) => p.text).join(' '), phrases };
  });
  // 19c word marks (global s) the 19 code used to take from its own line timing
  const marks = {
    gaze: wordAt(tl, 6, 'seven') - 0.3,              // s07's gaze line rises on "…and its seven moving lights"
    planets: wordAt(tl, 7, 'five'),                  // the five planets rise, staggered, from "five planets"
    five: wordAt(tl, 11, 'five'), six: wordAt(tl, 11, 'six'), seven: wordAt(tl, 11, 'seven'),
    tenDay: wordAt(tl, 10, 'ten-day'),
    twelve: wordAt(tl, 10, 'twelve'),
    weekEnd: wordAt(tl, 12, 'week'), outlived: wordAt(tl, 12, 'outlived'), all: wordAt(tl, 12, 'all'),
  };
  T = { ...tl, scenes, lines, marks, __legacy: true, __tl: tl };
  MEMO.set(tl, T);
  return T;
}

/** 19 beat index at global time gt (zero-length beats are never current). */
export function oldBeat(T, gt) { let b = 0; T.scenes.forEach((s, i) => { if (s.start <= gt + 1e-9) b = i; }); return b; }

/** An engine view with the legacy timeline (t / d untouched). Idempotent. */
export const lview = (v) => (v.tl.__legacy ? v : { ...v, tl: legacy(v.tl) });

/** A scene view for 19 beat o: legacy tl, and t / d / index / beat / active of that 19 beat. */
export function oview(v, o, extra = {}) {
  const T = legacy(v.tl), s = T.scenes[o], b = oldBeat(T, v.gt);
  return { ...v, tl: T, t: v.gt - s.start, d: s.end - s.start, index: o, beat: b, active: b === o, ...extra };
}

/** Wrap a 19 scene object (19 beat o) so the engine can play it as a 19c beat. `kOver(v)` may replace the overlay k. */
export function adapt(S, o, over = {}, kOver = null) {
  return {
    ...S,
    drawWorld: S.drawWorld && ((c, v) => S.drawWorld(c, oview(v, o))),
    drawOverlay: S.drawOverlay && ((c, v) => { const ov = oview(v, o); if (kOver) ov.k = kOver(ov, v.k); if (ov.k > 0.001) S.drawOverlay(c, ov); }),
    ...over,
  };
}

/**
 * Like adapt, for a scene whose overlay outlives its beat: the engine stops calling drawOverlay at the beat end (its
 * overlayK is 0 there), so from 0.1 s before the end the overlay is drawn from drawWorld instead (as s04's count
 * carry does). k(ov) gives the overlay's own visibility for the whole span (fade-in and the late fade-out).
 */
export function carry(S, o, k, over = {}) {
  const ov_ = (v) => { const ov = oview(v, o); ov.k = k(ov); return ov; };
  return {
    ...S,
    drawWorld(c, v) {
      if (S.drawWorld) S.drawWorld(c, oview(v, o));
      const ov = ov_(v);
      if (ov.t >= ov.d - 0.1 && ov.k > 0.001) { c.save(); S.drawOverlay(c, ov); c.restore(); }
    },
    drawOverlay(c, v) {
      const ov = ov_(v);
      if (ov.t < ov.d - 0.1 && ov.k > 0.001) S.drawOverlay(c, ov);
    },
    ...over,
  };
}

/** The engine's overlay fade-in (main.js overlayK) at view v (legacy beat window), with NO fade-out. */
export const kIn = (v) => Math.min(1, 1 - Math.pow(1 - Math.min(1, Math.max(0, v.t / 0.45)), 3));

/** The legacy timeline of the loaded 19c timeline (module-level constants: cue times). */
export const LT = legacy(TL);
/** Seconds after 19 beat o's start of global time t (for beat-relative cue lists). */
export const rel = (o, t) => t - LT.scenes[o].start;
