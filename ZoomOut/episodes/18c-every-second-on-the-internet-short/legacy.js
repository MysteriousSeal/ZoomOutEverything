// 18c (the ~53 s cut of 18, with 18b's cold open and closing question): the LEGACY TIMELINE adapter.
//
// 18c's episode.json has 10 film lines (9 + the comment question); 18 had 19. Every scene, env.js and camera.js were
// written (and audited) against 18's 19 beats, so instead of rewriting their indices, 18c rebuilds an 18-shaped
// timeline (20 beats: 18's 19 + the question) from the real 18c one and hands THAT to the 18 code (as 17c does).
// Cut beats get zero length at the start of the next kept beat, so every `tl.scenes[N]` reference still resolves.
// Unlike 17c, some 18c lines carry two 18 beats, split at a phrase break (the 18 beat starts 0.13 s before its phrase,
// mid-way through the 0.26 s phrase gap):
//
//   18 beat                                   18c line / phrase
//   0  hook . 1 one phone . 2 searches         0 . 1 . 2           ("It starts with one phone." has no second phrase:
//                                                                   its "lighting up" moment starts with the line)
//   3  one day . 4 emails . 5 spam             (cut: zero length at the start of 6)
//   6  new video                               3, phrase 0  "YouTube gets about 8 hours of new video."
//   7  every second                            3, phrase 1  "Every second." (the "Not every minute" ring is not drawn)
//   8  data centres . 9 power . 10 France . 11 not through space   (cut: zero length at the start of 12; the camera
//                                                                   climbs straight from the city to the planet)
//   12 under the sea                           4            "And between continents, | it goes under the sea."
//   13 1.4 million km . 14 35 times            5, phrase 0 . phrase 1
//   15 garden hose . 16 99%                    6 . 7
//   17 back to the phone (the dive)            starts 0.05 s after line 7 ends (the voice holds 1.4 s there), runs
//                                              through line 8 phrase 0 "Back on that one phone,"
//   18 82 years                                8, phrases 1-3 "one day of YouTube uploads | would take… | Longer…"
//   19 the question                            9
//
// Scenes get a view whose tl is the legacy timeline and whose t / d / k / index / beat / active are those of their 18
// beat (oview); env.js and camera.js convert the engine's timeline the same way (legacy() is idempotent). The legacy
// lines carry the SPOKEN words, so the scenes' wordTime() needles ("ninety", "eighty", "hundred") still match.
import * as L from '../../../engine/runtime/lib.js';

// ------------------------------------------------------------------ the 18c timeline + spoken lines
const RAW = await (await fetch(new URL('./build/timeline.json', import.meta.url))).json();
const EP = await (await fetch(new URL('./episode.json', import.meta.url))).json();
/** The engine-shaped 18c main timeline (preroll line removed, absolute times kept), loaded at import. */
export const TL = RAW.preroll ? { ...RAW, scenes: RAW.scenes.slice(1), lines: RAW.lines.slice(1) } : RAW;
/** Spoken phrases of each 18c film line ("{shown~spoken}" -> spoken, caption break markers dropped). */
const SPOKEN = EP.lines.map((ln) => ln.replace(/\{([^}~]*)~([^}]*)\}/g, '$2').replace(/\/(?=\s|$)/g, '').split('|').map((p) => p.trim()));

/** Start time (global s) of the first word starting with `needle` in 18c line li (caption-style weighting). */
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

/** 18 beat -> [18c line, first phrase, last phrase] (null = cut). */
const MAP = [
  [0, 0, 0], [1, 0, 0], [2, 0, 1], null, null, null, [3, 0, 0], [3, 1, 1], null, null, null, null,
  [4, 0, 1], [5, 0, 0], [5, 1, 1], [6, 0, 1], [7, 0, 0], [8, 0, 0], [8, 1, 3], [9, 0, 3],
];
export const CUT = MAP.map((m, i) => (m === null ? i : -1)).filter((i) => i >= 0);
/** The dive (18 beat 17) starts this long after line 7's last word (inside the 1.4 s voice hold). */
export const DIVE_AFTER = 0.05;

const ph = (tl, li, pi) => { const p = tl.lines[li].phrases ?? [tl.lines[li]]; return p[Math.min(pi, p.length - 1)]; };
const spokenPh = (tl, li, pi) => ({ ...ph(tl, li, pi), text: SPOKEN[li]?.[pi] ?? ph(tl, li, pi).text });

const MEMO = new WeakMap();
/** The 18-shaped (20-beat) timeline for an 18c main timeline (the engine's tl, preroll already removed). Idempotent. */
export function legacy(tl) {
  if (!tl || tl.__legacy) return tl;
  let T = MEMO.get(tl);
  if (T) return T;
  const S = tl.scenes;
  // start of each mapped 18 beat
  const own = (o) => {
    const m = MAP[o];
    if (o === 17) return ph(tl, 7, 0).end + DIVE_AFTER;
    return m[1] === 0 ? S[m[0]].start : ph(tl, m[0], m[1]).start - 0.13;
  };
  const startOf = (o) => { for (let j = o; j < MAP.length; j++) if (MAP[j] !== null) return own(j); return tl.total; };
  const starts = MAP.map((m, o) => startOf(o));
  const scenes = MAP.map((m, o) => ({ start: starts[o], end: o + 1 < MAP.length ? starts[o + 1] : tl.total }));
  const lines = MAP.map((m, o) => {
    const s = scenes[o].start;
    if (m === null) return { text: '', start: s, end: s, phrases: [{ text: '', start: s, end: s }] };
    const [li, p0, p1] = m;
    let phrases = [];
    for (let p = p0; p <= p1; p++) phrases.push(spokenPh(tl, li, p));
    if (o === 1) {
      // "It starts with one phone." -> the 18 code's second phrase ("lighting up in the dark", which lights the screen
      // and starts the one-second ring) 0.1 s into the line, so the ring completes its second inside this short beat
      const on = phrases[0].start + 0.1;
      phrases = [{ ...phrases[0], end: on - 0.02 }, { text: 'It starts with one phone.', start: on, end: phrases[0].end }];
    }
    if (o === 7) phrases = [{ text: '', start: phrases[0].start, end: phrases[0].start }, phrases[0]];   // no "Not every minute."
    if (o === 17) phrases = [phrases[0], spokenPh(tl, 8, 1)];   // the HUD swaps to hours on "one day of YouTube uploads"
    return { text: phrases.map((p) => p.text).join(' '), start: phrases[0].start, end: phrases[phrases.length - 1].end, phrases };
  });
  T = { ...tl, scenes, lines, __legacy: true, __tl: tl };
  MEMO.set(tl, T);
  return T;
}

/** 18 beat index at global time gt (zero-length beats are never current). */
export function oldBeat(T, gt) { let b = 0; T.scenes.forEach((s, i) => { if (s.start <= gt + 1e-9) b = i; }); return b; }

/** An engine view with the legacy timeline (t / d untouched). Idempotent. */
export const lview = (v) => (v.tl.__legacy ? v : { ...v, tl: legacy(v.tl) });

/** The engine's overlay curve (main.js overlayK) on the legacy beat o. Beat 18 holds (it stays behind the card). */
export function oldK(T, o, gt, S, endO = o) {
  const s = T.scenes[o], e = T.scenes[endO].end;
  const kin = S?.overlayIn === false ? (gt >= s.start - 0.05 ? 1 : 0) : L.ease.outCubic(L.prog(gt, s.start, 0.45));
  const kout = o >= 18 ? 1 : 1 - L.ease.inCubic(L.prog(gt, e - 0.3, 0.3));
  return Math.min(kin, kout);
}

/** A scene view for 18 beat o: legacy tl, and t / d / k / index / beat / active of that 18 beat. */
export function oview(v, o, extra = {}) {
  const T = legacy(v.tl), s = T.scenes[o], b = oldBeat(T, v.gt);
  return { ...v, tl: T, t: v.gt - s.start, d: s.end - s.start, index: o, beat: b, active: b === o, ...extra };
}

/**
 * An 18c scene that plays 18 scenes `parts` ([{o, S, kEnd?}]): every part's drawWorld always (they gate themselves on
 * time, as in 18), and its drawOverlay inside its own legacy beat window with the engine curve of that beat (kEnd: an
 * 18 beat whose end the fade-out uses instead, to hold a label over the next part). `over` adds / replaces fields.
 */
export function wrap(parts, over = {}) {
  const first = parts[0].S;
  return {
    chapter: first.chapter ?? null,
    captions: first.captions ?? true,
    layer: first.layer ?? 0,
    drawWorld(c, v) {
      for (const { o, S } of parts) if (S.drawWorld) { c.save(); S.drawWorld(c, oview(v, o, { k: oldK(legacy(v.tl), o, v.gt, S) })); c.restore(); }
    },
    drawOverlay(c, v) {
      const T = legacy(v.tl);
      for (const { o, S, kEnd } of parts) {
        if (!S.drawOverlay) continue;
        const s = T.scenes[o], e = T.scenes[kEnd ?? o].end;
        if (v.gt < s.start - 0.01 || v.gt > e + 0.5) continue;
        const k = oldK(T, o, v.gt, S, kEnd ?? o);
        if (k > 0.001) { c.save(); S.drawOverlay(c, oview(v, o, { k })); c.restore(); }
      }
    },
    ...over,
  };
}

/** The legacy timeline of the loaded 18c timeline (module-level constants: cue times). */
export const LT = legacy(TL);
/** 18c beat index (engine) that contains global time t. */
const engineBeat = (t) => { let b = 0; TL.scenes.forEach((s, i) => { if (s.start <= t + 1e-9) b = i; }); return b; };
/**
 * Cue list for the 18c beat `nb` from 18 scene S (18 beat o): its own cue times (relative to its 18 beat start, which
 * the legacy timeline already places on the right words for scenes timed from their beat start), shifted to nb.
 * `fix(q, d)` may return a new time (relative to the 18 beat start) or null to drop the cue.
 */
export function cuesOf(S, o, nb, fix = (q) => q.t) {
  const s = LT.scenes[o], d = s.end - s.start, base = TL.scenes[nb].start;
  const out = [];
  for (const q of S.cues?.(d) ?? []) {
    const t = fix(q, d);
    if (t == null) continue;
    out.push({ ...q, t: s.start + t - base });   // may be < 0: 18 beat 17 starts before its 18c beat (the dive in the hold)
  }
  return out;
}
export { engineBeat };
