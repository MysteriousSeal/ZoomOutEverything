# Zoom Out — Channel Bible

**Tagline:** Let's zoom out.

**Concept:** Short, premium motion-graphics videos (30–60 s) on anything that makes people stop scrolling: science, space, the human body, history, culture, money, technology. Every episode follows the channel's signature move. Start close on something familiar, then **zoom out** step by step until the real picture shows, and land on one reveal that makes people rewatch, share and argue in the comments.

Suggested handle: `@ZoomOut` (check availability; fallbacks `@ZoomOutShorts`, `@LetsZoomOut`, `@ZoomOutExplained`).

## Series

The channel mixes topics, but each video belongs to a recurring series so viewers know what they're getting:

| Series | Promise | Examples |
|--------|---------|----------|
| **True Scale** | How big, small, fast or old things really are | episodes 01–10 below |
| **What If** | One impossible premise, followed honestly | episodes 11–16 below |
| **By the Numbers** | One huge number made visible | ep 18 Every Second on the Internet |
| **Hidden History** | A familiar thing with a surprising origin | ep 19 Why Does a Week Have 7 Days? |
| **Inside You** | The body, at the scale where it gets strange | ep 17 Your Body in One Second |
| **How It Works** | Everyday tech, opened up | ep 20 How Does GPS Know Where You Are? |

Pick topics with the widest possible audience: a question anyone has wondered about, a number nobody can picture, or a fact people will want to correct. Avoid niche jargon in titles.

## Folder layout

```
ZoomOut/
├── README.md          ← this channel bible
└── episodes/
    ├── 01-a-billion-dollars-in-cash/
    ├── 02-million-billion-trillion-seconds/
    ├── 03-how-deep-is-the-ocean/
    ├── 04-if-the-sun-were-a-basketball/
    ├── 05-every-human-on-earth/
    ├── 06-how-high-is-space/
    ├── 07-how-small-is-an-atom/
    ├── 08-how-fast-is-light/
    ├── 09-how-much-water-is-on-earth/
    ├── 10-the-universe-in-one-year/
    ├── 11-what-if-the-moon-disappeared/
    ├── 12-what-if-you-fell-through-the-earth/
    ├── 13-what-if-the-earth-stopped-spinning/
    ├── 14-what-if-all-the-ice-melted/
    ├── 15-what-if-humans-disappeared/
    ├── 16-what-if-the-sun-became-a-black-hole/
    ├── 17-your-body-in-one-second/
    ├── 18-every-second-on-the-internet/
    ├── 19-why-a-week-has-7-days/
    └── 20-how-gps-knows-where-you-are/
```

Every episode ships `out/<slug>.mp4`, `out/cover.png` (the video frame at `coverTime`) and `out/thumbnail.png` (designed YouTube thumbnail, from `thumbnail.json` via `engine/node/thumb.mjs`).

Each episode folder starts with a `script.md`. Production uses the shared [motion engine](../engine/README.md) (headless-Chrome Canvas, motion blur, ElevenLabs voice: Brittney on Eleven v4 by default). An episode in production adds `episode.json` (7 lines + settings), `BRIEF.md` (creative brief for the builder agents), `camera.js` and `env.js` (shared, orchestrator-owned), and `scenes/` (one file per beat). Episode 03 is the template.

## Guiding principle

> Make a dynamic 30-second motion graphics video about the subject that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.

The concrete rules (pacing, camera, transitions, checklist) are in [`../MOTION-PRINCIPLES.md`](../MOTION-PRINCIPLES.md).

## Script rules (the "ladder", used by every series)

- **Length:** new Shorts run **about 60 s**: roughly 120–135 words over 7–8 lines with Brittney on Eleven v4 at natural pace. Visuals do the heavy lifting, so leave room for them.
- **Ending:** the last line always ends with a call to comment, e.g. "Tell me in the comments."
- **Top bar:** episodes are released out of order, so leave `episodeLabel` out; the top bar then reads ZOOM OUT · <TITLE>.
- **Structure:** 7 lines, one scene each:
  1. **Hook:** a question or a familiar object, shown immediately. No intro.
  2–6. **The ladder:** 4–5 steps, each clearly bigger (or deeper, or older) than the last. One number per line.
  7. **The reveal:** the step nobody expects, or a comparison that reframes everything. It should be comment bait ("that can't be right").
- **Anchor objects:** compare to things everyone knows (briefcase, football field, Burj Khalifa, Everest, a city). Reuse the same anchors across episodes so viewers learn the yardsticks.
- **Units:** narrate in metric, and show imperial on screen next to every number (a big share of the Shorts audience is American).
- **Accuracy:** every number goes in the fact-check notes with its source or the maths behind it. Round honestly ("about", "almost"). Commenters will check.
- **Tone:** calm, matter-of-fact, slightly awed. Let the numbers be the drama; no hype words ("INSANE", "mind-blowing").

## Visual style

- Clean 3D-look or isometric motion graphics on a dark neutral background, one accent colour per episode.
- A **persistent scale bar or counter** in every shot (metres, $, seconds) that updates as the camera moves.
- Camera language: continuous zoom-out, scroll-down or pan between steps. Avoid hard cuts when you can, so the scale stays continuous.
- A small human silhouette (1.75 m) appears whenever it helps as a size reference.
- Labels: a big number in the accent colour plus a small grey unit line, e.g. **10 t** / `22,000 lb`.
- Word-by-word captions at y≈1300; keep the bottom ~20% and right edge clear of the YouTube UI.

## Sound

- A low, rising drone that climbs in pitch with each ladder step, and a deep hit on the reveal.
- A soft "tick" whenever a counter jumps. No music with vocals.

## Titles and thumbnails

- Title formulas: "What $1 Billion Actually Looks Like", "How Deep Is the Ocean, Really?", "If the Sun Were a Basketball…", "What If the Moon Disappeared?", "Why Does a Week Have 7 Days?"
- Cover frame: the biggest step of the ladder plus one big number. Shorts use a frame from the video, so make sure one frame works as a poster.

## Episodes

Episodes 01–10 are the **True Scale** series.

| # | Episode | Length | Anchor | Reveal | Accent | Status |
|---|---------|--------|--------|--------|--------|--------|
| 1 | [A Billion Dollars in Cash](episodes/01-a-billion-dollars-in-cash/script.md) | 30 s | $100 bill | $1 trillion covers a football field | money green | ✅ rendered |
| 2 | [Million vs Billion vs Trillion Seconds](episodes/02-million-billion-trillion-seconds/script.md) | 30 s | a clock | counting the US debt takes 1M+ years | gold | ✅ rendered |
| 3 | [How Deep Is the Ocean?](episodes/03-how-deep-is-the-ocean/script.md) | 30 s | a swimmer | Everest fits in the Mariana Trench | deep teal | ✅ rendered |
| 4 | [If the Sun Were a Basketball](episodes/04-if-the-sun-were-a-basketball/script.md) | 60 s | basketball | nearest star ≈ New York to Rome | solar orange | ✅ rendered |
| 5 | [Could Every Human Fit in One Place?](episodes/05-every-human-on-earth/script.md) | 60 s | one person | 7% of everyone who ever lived; 13 before each of us | coral | ✅ rendered |
| 6 | [How High Is Space?](episodes/06-how-high-is-space/script.md) | 60 s | a person looking up | an hour's drive straight up; ISS ≈ 1 cm on a globe | sky violet | ✅ rendered |
| 7 | [How Small Is an Atom?](episodes/07-how-small-is-an-atom/script.md) | 60 s | a hair | stadium-sized atom, sand-grain nucleus | electric mint | ✅ rendered |
| 8 | [How Fast Is Light?](episodes/08-how-fast-is-light/script.md) | 60 s | one second | 13+ billion years for the farthest light | photon gold | ✅ rendered |
| 9 | [How Much Water Is on Earth?](episodes/09-how-much-water-is-on-earth/script.md) | 60 s | the blue planet | lakes and rivers = a 56 km ball | water blue | ✅ rendered |
| 10 | [The Universe in One Year](episodes/10-the-universe-in-one-year/script.md) | 60 s | a calendar | your life = 0.18 s on New Year's Eve | cosmic magenta | ✅ rendered |

Episodes 11–15 are the **What If** series: one impossible premise, then what would actually happen, then a real-world twist.

| # | Episode | Length | Anchor | Reveal | Accent | Status |
|---|---------|--------|--------|--------|--------|--------|
| 11 | [What If the Moon Disappeared?](episodes/11-what-if-the-moon-disappeared/script.md) | 60 s | a moonlit beach | the Moon is leaving anyway, 3.8 cm a year | moon silver-blue | ✅ rendered |
| 12 | [What If You Fell Through the Earth?](episodes/12-what-if-you-fell-through-the-earth/script.md) | 60 s | a hole in the ground | 42 minutes, between any two cities | core orange | ✅ rendered |
| 13 | [What If the Earth Stopped Spinning?](episodes/13-what-if-the-earth-stopped-spinning/script.md) | 60 s | an equator street | 400 million years ago a year had ~400 days | cyan | ✅ rendered |
| 14 | [What If All the Ice Melted?](episodes/14-what-if-all-the-ice-melted/script.md) | 60 s | an ice cube | 20,000 years ago the sea was 120 m lower | glacier mint | ✅ rendered |
| 15 | [What If Humans Disappeared Tomorrow?](episodes/15-what-if-humans-disappeared/script.md) | 60 s | a city at night | our radio bubble, ~100 light-years wide | amber | ✅ rendered |

Episodes 16–20 are the first **90-second** episodes (19 lines, ≈ 200–215 words, a mini-payoff every 10–15 s, camera in 2–3 linked acts). They span five series; all clear TikTok's 1-minute minimum.

| # | Episode | Series | Length | Reveal | Accent | Status |
|---|---------|--------|--------|--------|--------|--------|
| 16 | [What If the Sun Became a Black Hole?](episodes/16-what-if-the-sun-became-a-black-hole/script.md) | What If | 90 s | the Sun crushed to 6 km; it never will, it ends as a white dwarf | violet | ✅ rendered |
| 17 | [What Happens in Your Body in One Second?](episodes/17-your-body-in-one-second/script.md) | Inside You | 90 s | ≈ 4 million cells replaced every second | blood red | ✅ rendered |
| 18 | [Every Second on the Internet](episodes/18-every-second-on-the-internet/script.md) | By the Numbers | 90 s | one day of YouTube uploads = 82 years to watch | signal blue | ✅ rendered |
| 19 | [Why Does a Week Have 7 Days?](episodes/19-why-a-week-has-7-days/script.md) | Hidden History | 90 s | France tried a 10-day week; the USSR tried 5 | parchment gold | ✅ rendered |
| 20 | [How Does GPS Know Where You Are?](episodes/20-how-gps-knows-where-you-are/script.md) | How It Works | 90 s | relativity: 38 µs/day, 10 km/day uncorrected | GPS green | ✅ rendered |

**60-second episodes** use 13 lines (≈ 130–145 words) with longer pauses (`lineGap` 0.8–1.3 s) so every beat can breathe; the 30-second rules above scale ×2.

## `script.md` template

1. Metadata: anchor, ladder, reveal, length, accent, signature transition
2. Narration: 7 lines
3. Scene table: step, visual, on-screen label (metric + imperial)
4. YouTube title, description, hashtags, pinned comment
5. Fact-check notes with the maths

## Long-form videos (`long/`)

Regular 16:9 YouTube videos (1920×1080), rendered with the same engine (`"format": "landscape"`).

| # | Video | Length | Status |
|---|---|---|---|
| L01 | [From Your Hand to the Edge of the Universe](long/01-from-your-hand-to-the-edge-of-the-universe/) | 4:53 | ✅ rendered: mp4, thumbnail.jpg, .en.srt, youtube.md |

L01 is one continuous zoom of 28 powers of ten. Its world is a stack of scale layers (`layers/`), built from real data: NYC coastlines, NOAA ETOPO1, planet positions for 15 July 2026, real star and galaxy coordinates. Its BRIEF.md explains the layer contract and has the fact sheet. Render it with `node engine/node/render.mjs <ep> --sub 4 --workers 6 --pipe`, which streams frames to ffmpeg with no PNGs on disk (about 22 min).
