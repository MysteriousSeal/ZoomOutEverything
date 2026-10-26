# Creative brief — Zoom Out 10: The Universe in One Year (60 s)

**North star:** *Make a dynamic 60-second motion graphics video that shows what an incredible motion designer you are. And not too fast: people should actually understand what the video is about.*
Read `../../../MOTION-PRINCIPLES.md` and `../../../engine/README.md` first. Finished references: `../02-million-billion-trillion-seconds/scenes/` (time visualisation) and `../03-how-deep-is-the-ocean/scenes/`.

## The film

Carl Sagan's **Cosmic Calendar**: 13.8 billion years squeezed into one year.
- A full-year calendar grid (`env.js` draws it at every zoom: months, days, then Dec 31's hours, 23:00's minutes and 23:59's seconds).
- Events light up in their cells: Big Bang Jan 1 · the Sun early September · first life late September · months of microbes · dinosaurs from Christmas, gone Dec 30.
- The camera **dives** into Dec 31 → 11:48 pm (humans) → the last 12 seconds (history) → 1.2 s (Columbus) → a 0.18 s sliver (your life). Then it pulls back out to the whole year.

**World:** calendar units (1 = one day cell). `camera.js` exports `MONTHS`, `DAYS_IN`, `monthRect`, `dayRect`, `hourRect`, `minuteRect`, `secondRect`, `centre`, `dayOfYear(yearsAgo)`, `UNIVERSE_AGE`. Place every event at its true calendar position (use `dayOfYear` and the rect functions). Sub-second positions: inside `secondRect(59)`, the fraction of the last second.

**Look:** elegant, cosmic, editorial: a premium printed calendar meets a planetarium. Dark plum background, fine grid lines (env), event cells that **glow** in accent `[240, 120, 220]`, refined small icons (a Big Bang flash, a sun, a microbe, a dinosaur silhouette, a human silhouette, a quill for writing, a ship for Columbus), and clean labels. No cartoon faces or emoji.

**Motion:** an event lights its cell with an ignition (a glow bloom plus particles) as the narrator names it. When the camera dives into a cell, that cell becomes the frame, and the parent level's labels slide out as the child level's appear. One focal point per beat.

## Timing (build/timeline.json, ~59.0 s)

Beats start at: 0.0, 5.2, 9.6, 13.6, 17.7, 21.8, 26.0, 32.2, 39.6, 44.1, 48.5, 50.9, 53.8.

Camera:
- **0:** the whole year
- **1–2:** January
- **3–4:** September
- **5:** Oct–Dec
- **6:** December
- **7:** Dec 31 hours
- **8:** the 23:00 minutes
- **9:** the 23:59 seconds
- **10–11:** the last second
- **12:** back out to the year

## Scenes

- **s00-hook.js** (no captions, no chapter): the year grid fades in cell by cell (a fast diagonal wave). Headline `THE UNIVERSE` / `IN ONE YEAR` ("ONE YEAR" in accent), readable ≥ 1.2 s.
- **s01-big-bang.js:** Jan 1 00:00, a bright flash in the first cell that ripples out across the grid. Label "Jan 1" / "13.8 billion years ago".
- **s02-one-day.js:** one cell measured: "1 day ≈ 38 million years".
- **s03-sun.js:** cells fill or brighten progressively through to Sept 2; a sun glyph ignites in Sept 2. Label "Sept 2" / "the Sun forms · 4.6 billion years ago".
- **s04-first-life.js:** a microbe glyph in late September (≈ Sept 21). Label "late Sept" / "first life · ~3.7 billion years ago".
- **s05-microbes.js:** Oct–Nov cells tick by mostly empty with faint microbe dots; "for months: only microbes".
- **s06-dinosaurs.js:** in December, a dinosaur silhouette spans Dec 25 → Dec 30, then an asteroid streak ends it on Dec 30. Labels "Dec 25" and "Dec 30 · 66 million years ago".
- **s07-humans.js:** Dec 31 as 24 hour cells; a human silhouette at 23:48 (inside `hourRect(23)`, minute 48). Label "11:48 pm" / "Homo sapiens · 300,000 years ago".
- **s08-history.js:** the minutes of 23:00 → the last 12 seconds glow ("all recorded history"), with markers for writing, pyramids and Rome as tiny ticks. Label "last 12 s".
- **s09-columbus.js:** the seconds of 23:59; a ship glyph at −1.22 s. Label "−1.2 s" / "Columbus, 1492".
- **s10-you.js, s11-fifth-second.js:** inside the last second, a sliver of 0.18 s glows with a human silhouette. Label "0.18 s" / "an 80-year life".
- **s12-arrived.js:** the pull-back to the whole year; every event cell softly lit; the final line lands on the tiny last sliver. Final hold.

## Ownership

Builders own **only** their scene files. Do **not** edit `engine/*`, `camera.js`, `env.js`, `episode.json`, any `.md`, or other scenes. Shared needs go in "sharedRequests".
