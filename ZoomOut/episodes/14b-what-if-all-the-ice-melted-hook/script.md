# 14b — What If All the Ice Melted? (hook version, ~78.3 s)

Hook cut of episode 14 (the original stays in ../14-what-if-all-the-ice-melted/). Changes: a cold open before the film
and a closing comment question after it. The film itself is unchanged in its timing.

- **Cold open (preroll, 5.6 s):** the film's Statue of Liberty payoff replayed at 0.3x, the sea already up the pedestal
  on frame 1 and rising to her chest. Headline "MELT ALL THE ICE / THE SEA RISES ABOUT 70 METERS". Voice:
  > Melt all the ice on Earth, | and the sea rises about seventy meters.
- **Closing question (beat 13, card):** choices A "About 20 centimeters", B "About 2 meters" (answer: A, ~20-23 cm since 1900).
  > How much has the sea already risen since nineteen hundred? | About twenty centimeters, | or about two meters? | Tell me in the comments.

---

# 14 — What If All the Ice Melted? (60 s)

- **Series:** What If
- **Anchor:** a single ice cube on a table
- **Ladder:** one ice cube → Antarctica (about 90% of the world's ice, more than 4 km thick in places) → all land ice melts: sea level about +70 m → almost up to the Statue of Liberty's chest → most of Florida, Venice, Amsterdam and Shanghai under water → every coastline redrawn
- **Reveal:** the sea has also gone the other way. About 20,000 years ago, at the peak of the last ice age, it was about 120 m **lower**, and you could have walked from France to England, or from Siberia to Alaska. Coastlines aren't fixed: the ice decides where they are.
- **Length:** ~60.9 s (13 lines, 138 words)
- **Accent colour:** glacial mint `(150, 235, 215)`. Exposed ice-age sea floor is sand `(196, 168, 118)`.
- **Music:** `bright`
- **Production:** in production on the motion engine. Sources: `BRIEF.md`, `episode.json`, `camera.js`, `env.js`, `data/etopo6.bin`, `scenes/`
- **Signature transition:** the planet is real elevation data, so the sea level is just a threshold and the coastlines redraw themselves in both directions. Also, the camera dives into the top edge of the globe to land side-on beside the Statue of Liberty, then climbs back out to the planet without a cut.

## Narration script

> What if all the ice on Earth melted?
> Now zoom out from a single ice cube, | all the way to Antarctica.
> Antarctica holds about ninety percent of the world's ice.
> In places, it's more than four kilometers thick.
> If all the ice on land melted, | the oceans would rise about seventy meters.
> That's almost up to the chest of the Statue of Liberty.
> Most of Florida | would be underwater.
> Venice would vanish. | So would Amsterdam.
> Shanghai, too. | Every coastline on Earth would have to be redrawn.
> But the sea has moved the other way, too.
> Twenty thousand years ago, at the peak of the last ice age, | the sea was about one hundred twenty meters lower.
> You could have walked from France to England, | or from Siberia to Alaska.
> Coastlines aren't fixed. | The ice decides where they are.

## Scene breakdown

| # | Chapter | Visual | On-screen label |
|---|---------|--------|-----------------|
| 0 | — (hook) | A clear ice cube on a dark stone table, seen from above, sweating a little meltwater | WHAT IF ALL THE **ICE MELTED?** |
| 1 | 01 Zoom out | A continuous pull-back from the cube: the table dissolves into an ice field, then the whole continent | scale bar 1 cm to 1,000 km |
| 2 | 02 Antarctica | The whole ice sheet, top-down, on the real globe | **≈ 90%** · of the world's ice |
| 3 | 03 The ice sheet | A cross-section slice lifts out of the continent (vertical scale exaggerated, and marked as such) | **4 km+** · 13,000+ ft thick in places |
| 4 | 04 All the ice melts | The ice caps melt as the globe turns to the Atlantic; the camera dives into the edge of the planet at New York; the sea rises | **+70 m** · 230 ft |
| 5 | 05 Statue of Liberty | Side view: the water stands almost at her chest (93 m to the torch) | **+70 m** · almost to her chest |
| 6 | 06 Florida | Climb out of the limb, glide to Florida: the peninsula is mostly mint shallows | **Florida** · mostly under the sea |
| 7 | 07 Venice · Amsterdam | Europe: the Po valley and the Low Countries are under water | **Venice** / **Amsterdam** · gone |
| 8 | 08 Shanghai | The Yangtze delta under water, then a pull-back: every coastline glows as it redraws itself | **Shanghai** |
| 9 | 09 The other way | The globe turns to the Arctic; the water drains back to today | — |
| 10 | 10 Last ice age | Ice sheets spread over North America and Scandinavia; the sea falls and the shelves turn to sand | **−120 m** · 390 ft · 20,000 years ago |
| 11 | 11 Land bridges | Flight to the dry English Channel and North Sea, then across the Arctic to dry Beringia | **On foot** · France to England / Siberia to Alaska |
| 12 | 12 Not fixed | Pull back; the sea returns to today; the −120 m and +70 m coastlines remain as faint outlines | — |

## YouTube metadata

- **Title:** What If All the Ice Melted? #shorts
- **Description:** If every glacier and ice sheet on land melted, the sea would rise about 70 m. Twenty thousand years ago it was about 120 m lower. Coastlines are drawn by the ice.
- **Hashtags:** #climate #sealevel #iceage #antarctica #earth #science #shorts
- **Pinned comment:** "The map in this video is real elevation data (NOAA ETOPO1) with the sea simply raised or lowered, the simplest 'bathtub' model. Melting all of it would take thousands of years, but even 1 m matters for hundreds of millions of people."

## Fact-check notes

- **About 90% of the world's ice is in Antarctica:** NSIDC, "Quick facts on ice sheets", and the British Antarctic Survey (Antarctica holds ~90% of Earth's ice and ~70% of its fresh water).
- **More than 4 km thick in places:** the maximum ice thickness is 4,897 m, in the Astrolabe Subglacial Basin (Fretwell et al. 2013, *Bedmap2*, The Cryosphere 7); on screen "up to 4.9 km thick". (4,776 m was the older BEDMAP1 figure.) The average is about 1.9–2.1 km.
- **"Ice on land" (not sea ice):** floating sea ice and ice shelves already displace their own weight of water, so they add almost nothing when they melt. The narration says "on land" for this reason.
- **About +70 m:**
  - Sea-level equivalents: Antarctic ice sheet ≈ 58 m (Bedmap2), Greenland ≈ 7.4 m (Morlighem et al. 2017, *BedMachine*), mountain glaciers ≈ 0.3–0.4 m (Farinotti et al. 2019). Total ≈ 66 m. The USGS and NSIDC round this to "about 70 m" (older USGS figures said ~80 m).
  - This ignores thermal expansion, the land rising as the ice weight is removed, and gravity effects. "About" covers it.
  - In reality it would take thousands of years.
  - Imperial: 70 m ≈ 230 ft.
- **Statue of Liberty:**
  - Ground to torch tip is 93 m (305 ft). Ground to top of pedestal is 46.9 m (154 ft). Heel to top of head is 33.9 m (111 ft).
  - Liberty Island sits ~3 m above sea level, so +70 m water stands ~67 m above the ground, ~20 m above her heel. That is ~60% of the figure's height: above the waist, just below the chest. Hence "almost up to the chest".
- **Florida:** the highest point is Britton Hill, 105 m (345 ft), and the mean elevation is ~30 m (100 ft). On the ETOPO1 grid, most of the peninsula is below +70 m.
- **Venice** (~1 m), **Amsterdam** (around sea level; large parts of the Netherlands are below it), **Shanghai** (average ~4 m; the Yangtze delta plain is far below 70 m). All are submerged in the +70 m bathtub map.
- **Last Glacial Maximum ~20,000 years ago:**
  - The peak ice extent was about 26,000–19,000 years ago (Clark et al. 2009, *Science* 325).
  - Global mean sea level was about 120–130 m lower (Fairbanks 1989: ~120 m; Lambeck et al. 2014, *PNAS*: ~134 m). "About 120 m lower" is the conventional, conservative figure.
  - Imperial: 120 m ≈ 394 ft, shown as "390 ft".
- **Land bridges:**
  - The Dover Strait is ≤ ~60 m deep, and most of the southern North Sea is < 50 m. Both were dry land (Doggerland) at −120 m.
  - The Bering Strait is ~30–50 m deep. Beringia was a land bridge up to ~1,000 km wide.
  - "Could have walked" is literal: people and animals did cross Beringia.
- **Map data and model:**
  - NOAA NGDC ETOPO1 Ice Surface (Amante & Eakins 2009), via NOAA ERDDAP `etopo180`, averaged to a 0.1° grid.
  - Flooding uses a pure threshold ("bathtub"): no defences, isostasy or connectivity checks. Coastlines are approximate at ~11 km resolution.

## Pacing notes (original episode 14, not this hook cut)

- 14b: the timeline is 78.33 s (5.63 s preroll + film + closing question); see build/timeline.json for its beat starts. The figures below are the original 60 s film.

- Timeline: 60.86 s. `lineGap` 0.8, `phraseGap` 0.65, `hookHold` 0.5, `tail` 3.0.
- Beat starts: 0.00, 3.30, 8.39, 12.61, 16.28, 22.07, 25.89, 29.63, 33.32, 38.37, 41.24, 48.83, 53.92.
