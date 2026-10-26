---
name: zoomout-channel
description: "Channel 2 renamed from True Scale to Zoom Out (broad viral topics) in /Users/colas/ELI5Shorts/ZoomOut; eps 01-10 True Scale + 11-15 What If series, all rendered + thumbnails"
metadata:
  node_type: memory
  type: project
  originSessionId: 0269dd66-0632-4ea5-b673-52aab4ca9f38
  modified: 2026-10-19T18:59:15.998Z
---

On 2026-10-19 the user picked the "scale & comparisons" idea and asked for a second channel. Named **True Scale** (tagline "See how big things really are."), folder `/Users/colas/ELI5Shorts/TrueScale/` with `README.md` (channel bible: 7-line "ladder" scripts, 60–80 words, metric narration + imperial on-screen, persistent scale bar) and `episodes/01..05/script.md` (billion dollars, million/billion/trillion seconds, ocean depth, Sun as a basketball, every human on Earth). Production uses the shared engine in /Users/colas/ELI5Shorts/engine ([[eli5-production-pipeline]]) with the Python env in TheShortAnswer/.venv.

**Why:** the user wants viral, high-click faceless Shorts; I recommended scale comparisons as the best fit for the code-rendered pipeline.

**How to apply:** keep the True Scale script rules from its README; time-sensitive numbers (US debt, richest people, population, scuba record) are flagged in the fact-check notes for re-checking before publishing. Mature style still applies ([[mature-style]]).


**Status 2026-10-19:** episodes 01 (billion dollars, isometric pull-back), 02 (seconds, vertical timeline) and 03 (ocean) are rendered in `episodes/<slug>/out/`. Each was built with a build → review → fix Workflow (03: 16 agents over 2 rounds; 01+02 together: 21 agents) plus orchestrator fixes to shared files. Lesson: never run two renders of the same episode at once (ffmpeg writes the same out file → corrupt MP4).

**Update 2026-10-20:** 04 and 05 were made 60 s long at the user's request (13 lines, lineGap 0.8) and rendered. The user then asked for 5 more 60 s episodes on themes I chose: 06 space height, 07 atom, 08 speed of light, 09 water spheres, 10 cosmic calendar. All set up (scripts, BRIEF, camera/env using engine/runtime/kit.js) and built by the reusable workflow script `truescale-episodes` (args = episode/group list). Lesson: env loops must be bounded by screen extent (an O(mpp²) town-block loop hung ep04).

**Update 2026-10-20 (later):** 06–10 rendered (59–61 s each) in `TrueScale/episodes/<slug>/out/`. The user briefly moved 01–05 to `/Volumes/COLAS_SSD/TrueScale/`, then moved them back into `TrueScale/episodes/`. The local copies are canonical. Lessons:
- Each 60 s render writes ~3 GB of PNG frames and the review shots another ~1.5 GB, so the disk filled up (ENOSPC). render.mjs now deletes the frames after encoding (`--keep` keeps them). Clear `build/shots` after shipping.
- Motion-blur sub-frames hit times that the review shots never do, so a negative `arc` radius crashed one final render. Clamp radii computed from easing (`outBack` undershoots).
- The film reviews' shared-file items (camera, HUD, coverTime) were applied by a second short workflow, one fixer per episode that owns all of that episode's files, followed by an independent checker. That worked well.

**Thumbnails (2026-10-20):** each episode has a `thumbnail.json` spec that `engine/node/thumb.mjs` renders to `out/thumbnail.png`. The spec gives a clean world-only frame, reframed, plus a two-line headline with an accent word and one stat plate. Hero numbers come from the narration lines.

**Rebrand (2026-10-20):** at the user's request the channel is now **Zoom Out** (tagline "Let's zoom out."). The folder is `/Users/colas/ELI5Shorts/ZoomOut/` and the on-screen channel label is "ZOOM OUT". The user wants science, culture, history, money and anything else that could get massive views, not only size comparisons. "True Scale" survives as the first series (eps 01–10). The planned series are What If, By the Numbers, Hidden History, Inside You and How It Works (listed in the ZoomOut README). I suggested merging The Short Answer into Zoom Out, but the user hasn't decided.

**Why:** the user wants reach over a niche.
**How to apply:** pitch new topics across all the series, and keep the zoom-out reveal as the signature move.

**What If series (eps 11–15, done 2026-10-20):** Moon disappeared, fell through Earth, Earth stopped spinning, all ice melted, humans disappeared. All about 60 s. Built with the same full workflow script (setup → build/review/fix → film review → film fix → check), with a fact-check pass that adds hedges like "in the simplest model" and "many models say". The episodes rendered in 2–11 min each with `--sub 8 --workers 6`. Delete build/shots before a render; render.mjs deletes the frames itself. Thumbnails use the headline pattern "WHAT IF …" + a stat plate. In a thumbnail.json reframe, keep `ty ≤ fy*zoom`, or a black band appears at the top.

**90-second batch (eps 16–20, done 2026-10-20):** at the user's request, eps 16 (Sun as black hole), 17 (body in one second), 18 (internet per second), 19 (why 7-day week) and 20 (GPS) are 90 s long and cover the series What If, Inside You, By the Numbers, Hidden History and How It Works. They were built with workflow script `zoomout-episodes-90s.js` (19 lines, ≈200–215 words, 4 builder groups, `ep.series` arg). Each rendered in 3–11 min at sub 8. Hook frames bake the headline into the world layer, so don't use t≈0–3 s for thumbnails.

**Realism QA pass (2026-10-20):** after user feedback (people over cars, fake Earths) a workflow watched all 20 MP4s and fixed about 200 defects; all 20 were re-rendered and their thumbnails remade. Each episode folder has youtube.md (title, description, hashtags, tags, sources). The channel branding prompts and description are in ZoomOut/BRANDING-PROMPTS.md. Episode 12's script.md is missing; its facts are in BRIEF.md and youtube.md.

**Launch data (2026-10-20):** ep 01 was the first Short posted. After about 4 h it had 605 views, 154 engaged, 11 likes; only 27% stayed to watch (73% swiped), average view 0:19. Diagnosis: ep 01's first second is weak (small bill, no headline question). The user said not to edit any episode for now; suggest changes only, and do not re-render unless asked.

**Long-form (2026-10-21):** ZoomOut/long/01-from-your-hand-to-the-edge-of-the-universe is a 4:53 landscape video, one continuous zoom from 10⁻¹ to 10²⁷ m and back. It was built by 5 parallel builders, each owning one layer range; I owned the camera, env, HUD and park-data.
- Engine additions:
  - landscape format;
  - `render.mjs --pipe`: frames stream to ffmpeg; a 1080p film would otherwise need ~22 GB of PNGs;
  - `srt.mjs`;
  - voice `holds` and the `{shown~spoken}` syntax;
  - music preset `vast`;
  - protocolTimeout 900 s.
- I check pronunciation with faster-whisper in a scratch venv; Kokoro misread Laniakea, Oort, "a path" and "where a".
- The user said it must be "perfect", so I reviewed every section's frames and sent sections back for polish.

**Hook versions (2026-10-21):** 03b and 04b are copies of 03 and 04 with a cold-open hook (the payoff shown as the first frame) and a closing A/B/C question card. The originals are untouched. Approach for a new one:
- Copy the folder.
- Prepend and append lines and scenes.
- Shift every hard-coded beat index (camera `b ===`, `tl.scenes[N]`, env HUD timings, `cues`).
- Use voice `holds` so the payoff beat keeps its original duration.
- Use `overlayIn: false` on the cold scene.
The user had said not to touch the other videos yet.

**Eps 21–22 (2026-10-21, hook format from the start):**
- Ep 21 is "How Many Ants Are on Earth?" (76.8 s). Ep 22 is "How Old Is Everything?" (71.3 s, timeline and 100 m track).
- Both were built with Agent-tool subagents, not a Workflow: one setup agent per episode, 3 builders, then my whole-film review and targeted fix requests.
- Shared rules for those agents are in the scratchpad ctx.md.
- Lessons:
  - Inspect the final MP4. The `--sub 8` motion blur turned a tiled texture into radial moiré that the agents' shots missed. Use `shots --sub 8` at fast zooms.
  - lib.js roundRect now clamps r ≥ 0, because a negative eased size crashed a render.
  - thumb.js moves the stat number below the accent rule.

**Eps 23–24 and the 04b/05b audit (2026-10-21):**
- Ep 23 (oceans drained, 77.8 s) and ep 24 (10 days vanished, 77.9 s) are shipped in the hook format.
- The user asked for an agent audit of 04b and 05b with a change list and timestamps. The setup was 6 read-only auditors (1 content + 2 visual halves per episode), then 4 fixers split by file ownership.
- Lessons:
  - Hook reworks that shift beats must also re-index voClock(N) and any beat-relative timing. Preroll episodes keep absolute gt, so `v.gt`-based intros silently never play.
  - Engine changes made: captions never split spoken numbers and stay ≤ x 940; bigLabel keeps m²/km²; the HUD clock uses integer frames.
- Known but left alone, pending the user: the earth.js polar-ice smear (gE / coslat), the chapter-chip blank frames at cuts, and a preroll-inclusive HUD clock.

**07b/08b/09b (2026-10-22):** hook versions built from 06b's recipe, then the same audit process as 04b/05b (9 auditors, 6 fixers).
- Engine changes:
  - chapter cards hand over in place;
  - captions keep numbers and prepositions together and fade before pauses;
  - motion-blur sub-frames are clamped at the preroll cut;
  - earth.js polar relief is capped and the pack-ice edge feathered.
- Question cards must be opaque from their first frame, gated on output-frame time, with placeholder pills. 03b and 06b still use the older translucent fade.
- 08b's Voyager figures are date-sensitive: "almost a full day" is only true before ~15 Nov 2026.

## 10b–12c batch (22 Oct 2026)
- **Hook versions** 10b/11b/12b (70–78 s) and **50 s cuts** 10c/11c/12c (52–54 s), for a length A/B test. Each c cut has its own title and thumbnail.
- **Advice I gave:** don't post a b and its c at the same time. Alternate lengths across episodes.

### Engine changes (main.js)
- **Caption grouping:**
  - numerals stay with their unit and lead-in;
  - months, NEW and auxiliary verbs (would, could, doesn't…) are joiners;
  - phrasal verbs stay together;
  - no lone-word groups;
  - groups of 7+ words are split at natural points;
  - `{word/~word}` = caption-only forced break.
- **Captions:** word lift is now 6 px.
- **Preroll:** the headline holds to the cut; the HUD fades in over 0.35 s.
- **Chapters:** the handover has no title overlap.
- **thumb.js:** the stat plate is 0.92 opaque.

### Audit lessons
Every step was audited by content + visual agents per episode. Fixes from the b versions had to be ported into the c cuts. Recurring defects:
- a crude person figure;
- a static or tiny cold open;
- visuals that give away the closing question's answer (the 10b pyramids);
- physics errors (12 gravity arrows);
- leftover visuals from cut lines (12c's reversed fall-back).

## 13b–15c batch (23 Oct 2026): dead-canvas frames
- **Symptom:** long or heavy renders (15b/15c, after the SDF bull and forest scenes) produced dead frames late in the film. Some were all black; others showed only the HUD over an empty scene layer. A fresh page renders the same frames fine.
- **Render fixes (engine/node/render.mjs):**
  - Each worker reloads its page every 250 frames.
  - After rendering, a scan flags any frame whose mean luma is far below the median of the 9 frames around it, and redraws it in fresh pages (up to 3 passes).
  - A size-only guard is NOT enough: dead frames can still be large PNGs.
- **Checking a final MP4:** run `node <scratchpad>/darkscan.mjs <mp4>`. Flags that survive all 3 passes are intentional dips, such as the preroll→film cut or the dim before the question card. Confirm them by eye.
- **Shell gotchas:**
  - Use `ffmpeg -nostdin` inside `while read` loops.
  - zsh doesn't word-split `$x`; use `${=x}`.
  - Never queue renders with `pgrep -f` wait loops: they deadlock on each other. Use one sequential chain, or wait on the previous chain's "ALL DONE" line.

## 16b–17c batch (25 Oct 2026)
- **Lengths:** the 90 s originals give long b versions (16b 106.9 s, 17b 104.0 s, full film). The c cuts run 53.5 / 52.7 s.
- **Question beat:** set `voice.tail` to 1.0 so it lasts about 10 s.
- **c cuts built in parallel** straight from the original, using a time map (16c remap.js, 17c legacy.js). Port the b-audit fixes into the c cut afterwards.
- **Render queue:** `$S/qworker.sh` pops `$S/queue.txt`; append a folder name to queue it. Watch the worker's output with Monitor.
- **Engine changes:**
  - The preroll headline is held at k=1 until pre.end (any fade window caught the last frame).
  - The caption splitter adds +8 when a half would show for under 0.8 s, so such groups don't split.
  - The lone-word merge can join a next group of up to 5 words.
- **STT:** the old `stt` venv broke; use `HF_HUB_OFFLINE=1 $S/stt2/bin/python -I $S/stt.py`.
- **Open:** the 17b/17c glass hand was reworked, but still reads stylised (tube fingers).
- **18b/18c (25 Oct):**
  - 18b is 105.5 s; 18c is 53.2 s and cut the data-centres / France act to fit.
  - 17b/17c hand rebuilt into a realistic grip (backups of the old hand in scratchpad/hand/).
  - env.js `drawLights` cell cap 60000→160000: the finer light level was being skipped mid-crossfade and the city lights strobed. Check other episodes' env.js for the same cap.
  - Engine: groups under 0.8 s now merge into a neighbour when the result is ≤6 words and ≤28 chars.
- **19b/19c (25 Oct):**
  - 19b is 105.4 s; 19c is 53.2 s.
  - Question: "Soviet 5-day week: same day off for everyone?" Answer B, it rotated.
  - The original 19 colours the 5-day page as rotating worker groups, which spoils that answer. The b and c versions show both Soviet pages plain.
  - Scenes that read build/timeline.json directly must drop the preroll line.

## ElevenLabs voice (26 Oct 2026)
- **Voice settings:** the user chose ElevenLabs **Brittney** (`kPzsL2i3teMYv0FxEYQ6`, saved in My Voices) on **eleven_multilingual_v2 at speed 1.1**. Eleven v4 ignores the speed setting and reads about 30% slower, so it doesn't suit Shorts.
- **Key:** the API key is in the project `.env` as ELEVENLABS_API_KEY (Creator plan, 131k credits a month). Never print it.
- **voice.py:** set `"voice": {"engine": "elevenlabs", "id": …, "model": …, "settings": {"speed": 1.1}}`.
  - It calls /with-timestamps, cuts each phrase at its first and last character (−30/+90 ms) and adds 5/30 ms fades.
  - Each phrase is levelled to 0.16 voiced RMS, about −17.8 LUFS, which matches Kokoro.
  - Phrases are cached in `.tts_cache/`. Re-generating gives different takes, so changing text or settings changes the timing: scene word times, preroll.from, card fractions and thumbnail time then need re-tuning.
- **Status:** 09b is the first episode re-voiced with Brittney (73.7 s). The Kokoro backup is in scratchpad/09b-kokoro-backup.

## SFX level (2026-10-26)
User found SFX too loud (only 4–6 dB under voice). audio.py now: tanh soft-cap at 0.6 on the sfx bus, sfx gain 0.45 ducked to 0.25 under speech (was flat 0.7). User approved on 09b. Existing episodes can be fixed audio-only: re-run audio.py, then remux mp4 video copy + loudnorm=I=-14:TP=-1.5:LRA=11 (no frame re-render).

## Default voice (2026-10-26)
User made Brittney the default for future episodes. voice.py: no "voice.name" → ElevenLabs with EL_DEFAULT (Brittney kPzsL2i3teMYv0FxEYQ6, eleven_multilingual_v2, speed 1.1). All 51 older episodes have a Kokoro "name" so they stay Kokoro. Pacing ≈ Kokoro 0.92 (09b: 52.0 s vs 53.0 s of speech), so word-count guidance is unchanged.

## Eps 25–28 (2026-10-26, ~60 s, Brittney v4, title in top bar)
25 The Man Who Saved the World (Petrov, 67.4 s), 26 The Monster in the Pacific (2026 super El Niño news, 63.6 s, date-sensitive: publish soon), 27 How to Survive a Nuclear Blast (60.1 s), 28 How to Survive a Riot (59.0 s). "How to Survive" = new series: STEP badges + ISO-style pictograms (drawFigure in 27/28 env.js; 28's curl pose is a hand-built CURL_J). Process per ep: setup agent → 2 builders → finisher+render → 1 content + 2 visual auditors → fixer → my own contact-sheet check (I caught misses each time: empty hook bottom, kneeling "curl", count-up numbers, head poking out of card).
Engine: kit.js/thumb.js top bar uses title when no episodeLabel; main.js captions never merge across a sentence end (stop flag) and EL/YOUR/MY… are joiners. Open choices left with user: 25 hook "STOPPED" vs "PREVENTED", "satellites" plural.

## Posting tracker
`ZoomOut/PUBLISHED.md` lists which version of each topic is posted (one version per topic). As of 2026-10-26 posted: 01, 02, 03b–08b, 25. Update it (and push) whenever the user says they posted something.

## Voice trim rewrite (2026-10-26, after a voice audit of 26–28)
voice.py eleven(): 0.12 s pre-roll + onset search (30 ms clipped consonants), tail cut at first −40 dB silence after the last char, plus a safety net cutting a ≥250 ms gap followed by sound (ElevenLabs alignment can stretch the last chars across the gap, leaking the next phrase's first sound as a blip). level() soft-limits instead of capping gain. render.mjs: alimiter after loudnorm (an AAC left-channel over at +1.9 dBTP was measured). main.js captions weight numerals by spoken length. Re-running voice.py now re-cuts timing: do NOT re-voice posted episodes (09b, 25) casually.
