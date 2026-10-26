# The Short Answer — Channel Bible

**Tagline:** Big questions. Thirty seconds.

**Concept:** Big subjects explained simply, in 30 seconds, for adults. The explanation is simple ("explain like I'm 5"); the presentation is not: documentary-style motion graphics, real numbers, and a natural narrator.

Suggested handle: `@TheShortAnswer` (check that it's available before creating the channel; fallback: `@ShortAnswerShow`).

## Folder layout

```
TheShortAnswer/
├── README.md                ← this channel bible
├── .venv/                   ← Python env (Kokoro TTS, numpy, Pillow, scipy)
├── models/                  ← Kokoro voice model files
└── episodes/
    ├── 01-why-is-the-sky-blue/          ✅ rendered
    ├── 02-how-does-the-internet-work/   ✅ rendered
    ├── 03-what-is-inflation/            📝 script
    ├── 04-why-do-we-need-sleep/         📝 script
    └── 05-how-does-ai-chatbot-work/     📝 script
```

Each episode folder has a `script.md`. Episodes 01–02 were rendered with the older Pillow renderer (their code is in the episode folder, outputs in `out/`). **New episodes use the shared [motion engine](../engine/README.md)** (headless-Chrome Canvas, camera, motion blur) with the build → review → fix workflow described in [`../MOTION-PRINCIPLES.md`](../MOTION-PRINCIPLES.md). Use `../ZoomOut/episodes/03-how-deep-is-the-ocean/` as the template.

## Guiding principle

> Make a dynamic 30-second motion graphics video about the subject that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.

The concrete rules (pacing, camera, transitions, checklist) are in [`../MOTION-PRINCIPLES.md`](../MOTION-PRINCIPLES.md).

## Script rules

- **Length:** 55–70 words (voice at `SPEED=0.92`, 0.4 s between lines) ≈ 28–30s. Episodes 01–02 predate this rule (76 and 83 words) and feel denser.
- **Structure:** exactly **7 lines**, each line one scene:
  1. **Hook:** the question itself, no intro. Shown as a headline; no captions.
  2–5. **Mechanism:** one core idea, built step by step. Each line adds one fact.
  6. **Consequence:** a surprising real-world number or effect.
  7. **Payoff/loop:** a short closing line that lands the idea and leads back into the first frame.
- **Tone:** calm, confident, conversational. Grown-up analogies only, no "imagine a classroom", no cartoon voices.
- **Accuracy:** every on-screen number goes in the fact-check notes with its source or derivation. Simplifications are named explicitly.
- **Engagement:** pinned comment teases the next episode or a follow-up question.

## Visual style

- Documentary motion graphics: deep navy palettes, glowing light, real diagrams and units.
- One accent colour per episode (sky blue, cyan, amber, violet, mint…).
- Numbered chapter markers (`01 — SUNLIGHT`) for scenes 2–7, plus small technical labels on dark backings.
- Bold word-by-word captions at y≈1300; keep text out of the bottom ~20% and the right edge (YouTube UI).
- Human silhouettes instead of mascots; no faces on objects, no emoji, no kid fonts.
- Film grain and vignette, ambient score, subtle synthesized sound design.

## Voice

- Kokoro neural TTS (offline, Apache-2.0, fine for a monetized channel), or a real recording dropped in `voice_override/`.
- Default voice `af_heart`. Samples to compare are in `episodes/01-why-is-the-sky-blue/build/auditions/`. Use the same voice on every episode.

## Episodes

| # | Episode | Category | Accent | Status |
|---|---------|----------|--------|--------|
| 1 | [Why Is the Sky Blue?](episodes/01-why-is-the-sky-blue/script.md) | Science & nature | sky blue | ✅ rendered |
| 2 | [How Does the Internet Work?](episodes/02-how-does-the-internet-work/script.md) | Tech & internet | cyan | ✅ rendered |
| 3 | [What Is Inflation?](episodes/03-what-is-inflation/script.md) | Money & economy | amber | 📝 script |
| 4 | [Why Do We Need Sleep?](episodes/04-why-do-we-need-sleep/script.md) | Body & health | violet | 📝 script |
| 5 | [How Does an AI Chatbot Work?](episodes/05-how-does-ai-chatbot-work/script.md) | Tech & internet | mint | 📝 script |

## `script.md` template

1. Metadata: category, length, core idea, hook, accent colour, signature transition, production status
2. Narration: 7 lines
3. Scene table: chapter, visuals, on-screen labels
4. YouTube title, description, hashtags, pinned comment
5. Fact-check notes
