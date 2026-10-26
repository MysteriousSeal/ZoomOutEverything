# 23 — What If the Oceans Drained? (hook format, ~78 s)

- **Series:** What If
- **Anchor:** the real globe (NOAA ETOPO1 bathymetry and elevation) and one number, the SEA LEVEL gauge
- **Ladder:** −50 m (Alaska joins Russia) → −60 m (Britain rejoins Europe across Doggerland) → −120 m (the real Ice Age low, 20,000 years ago: people and mammoths cross the land bridges) → −2.5 km (the mid-ocean ridge surfaces: 65,000 km, the longest mountain range on Earth) → −5 km (most of the sea floor is dry: abyssal plains) → −6 km (Mauna Kea stands 10.2 km from base to peak, taller than Everest) → −10,935 m (the last water, in the Mariana Trench) → gone
- **Reveal:** on a 30 cm classroom globe, all that ocean would be about 0.09 mm thick, about a coat of paint. Then the oceans flow back: a thin blue skin that keeps the planet alive.
- **Length:** 77.8 s including the preroll (5.7 s) and the closing question (7.9 s); 14 lines + preroll
- **Accent colour:** ocean blue `(70, 180, 255)` · music preset `deep` · voice af_heart @ 0.92
- **Production:** set up on the motion engine (camera.js, env.js, data/ridge.js, stub scenes). Sources: `BRIEF.md`, `episode.json`, `camera.js`, `env.js`, `scenes/`
- **Signature transition:** one continuous camera over the real, turning globe while the sea level is a live threshold on the real bathymetry. Every coastline is recomputed every frame, and the exposed sea floor is the true relief, coloured as real sediments. The planet goes from blue to bare rock and back without a single cut. The mid-ocean ridge rises out of the dark as a glowing seam that traces itself around Antarctica.
- **Not episode 09 / 14:** ep 09 gathered the water into a sphere (we never show that). Ep 14 RAISED the sea by melting ice. This film lowers it all the way to empty, and ends on the paint-thin skin.

## Narration script

> *(preroll, over the slowed ridge emergence)* Drain the oceans, and Earth's longest mountain range rises out of the dark.
>
> What if all the oceans drained away?
> Drop the sea by just fifty meters, | and you could walk from Alaska to Russia.
> By sixty, Britain has rejoined Europe, | across a lost land called Doggerland.
> Twenty thousand years ago, | the seas really were about a hundred and twenty meters lower.
> People and mammoths walked across these land bridges.
> Keep draining. At two and a half kilometers, | a hidden mountain range appears.
> The mid-ocean ridge winds sixty-five thousand kilometers around the planet, the longest on Earth.
> At five kilometers, most of the seafloor is dry: | vast, flat abyssal plains.
> Hawaii's Mauna Kea now stands over ten kilometers tall, | taller than Everest.
> The last water pools in the Mariana Trench, | eleven kilometers down.
> Then it's gone.
> On a classroom globe, | all that ocean is about as thin as a coat of paint.
> A thin blue skin, | and it's what keeps this planet alive.
> If the seas dropped tonight, | where would you walk first? | Tell me in the comments.

TTS: `{Mauna Kea~Mouna Kayah}` (/maʊnə keɪə/; Kokoro otherwise says "Mawna Kee") and `{winds~weinds}` (the verb, /waɪndz/). Checked with the STT pass: Doggerland, Mariana and abyssal read correctly as written.

Wording changes from the brief:
- "At about sixty, Britain rejoins Europe" became **"By sixty, Britain has rejoined Europe"**. In the 0.1° grid Britain is already joined at about −30 m, through the Dover Strait. Published sill estimates vary, and post-glacial rebound complicates them. "By sixty" is true either way.
- "all that ocean was thinner than a coat of paint" became **"all that ocean is about as thin as a coat of paint"**. 0.087 mm is comparable to a wet coat (≈ 0.1 mm), but it is thicker than a typical dry coat (0.03–0.05 mm). So "about as thin" is the honest claim.
- Pauses were trimmed to fit 78 s: no "|" in the preroll line or in line 6, and "Yet" was dropped from line 11.

## Scene breakdown

| # | Chapter | Visual | On-screen label |
|---|---------|--------|-----------------|
| P | — (preroll) | Slow-motion replay (0.25×) of the Atlantic as the sea passes −2,200 → −2,500 m: the Mid-Atlantic Ridge surfaces as a pale seam out of the navy deep | DRAIN THE OCEANS, AND FIND / EARTH'S **LONGEST MOUNTAINS** |
| 0 | — (hook) | The blue planet, Pacific face, today's sea level | WHAT IF THE OCEANS / **DRAINED?** |
| 1 | 01 Bering Strait | Dive to the Bering Strait. The sea drops 50 m and the shelf between Chukotka and Alaska surfaces as sandy sea floor. Today's coast stays as a thin white ghost line | **−50 m** · Alaska joins Russia |
| 2 | 02 Doggerland | Fly over the pole to the North Sea at −60 m: Britain joined to the continent by a broad plain | **DOGGERLAND** · flooded ≈ 8,000 years ago |
| 3 | 03 The last ice age | Pull out to the North Pole view; the sea falls to −120 m and both land bridges widen | **−120 m** · 20,000 years ago |
| 4 | — | Push in to Beringia: small, accurate silhouettes of people and woolly mammoths crossing the land bridge | (BERINGIA tag) |
| 5 | 04 Keep draining | The Atlantic face; the sea drains to −2,500 m; the Mid-Atlantic Ridge surfaces as a pale seam | **2.5 km** · a hidden mountain range |
| 6 | 05 The mid-ocean ridge | Oblique south view: a glowing seam traces the ridge from Iceland down the Atlantic, round Antarctica and up the Pacific; the planet turns | **65,000 km** · the longest mountain range |
| 7 | 06 Abyssal plains | The North Atlantic basins at −5 km: vast rust-brown plains, pools left in the deepest basins | **5 km** · most of the sea floor is dry |
| 8 | 07 Mauna Kea | Hawaii on the dry floor; a side-profile inset to scale: Mauna Kea 10.2 km from its base vs Everest 8.85 km above sea level | **10.2 km** vs **8.85 km** |
| 9 | 08 Mariana Trench | The trench arc; the pools shrink to one last glint at the Challenger Deep | **10,935 m** · Challenger Deep |
| 10 | — | Pull back: the whole dry planet | — |
| 11 | 09 To scale | The globe shrinks onto a classroom-globe stand (30 cm); a cross-section inset shows the ocean as a paint-thin skin | **≈ 0.09 mm** |
| 12 | — | The oceans flow back in; hold on the blue planet | — |
| 13 | — (question) | Opaque card over the held blue globe | YOUR TURN · A) ALASKA TO RUSSIA B) BRITAIN TO FRANCE C) INTO THE MARIANA TRENCH |

## YouTube metadata

See `youtube.md`.

## FACT-CHECK

All depth claims were checked against the same data the film draws: `engine/assets/etopo6.bin`, NOAA ETOPO1 (ice surface) averaged to 0.1°. Scratch scripts: hypsometry, connectivity flood-fill and ridge snapping.

- **Bering Strait, −50 m.** The strait is about 30–50 m deep (NOAA; Britannica). In the grid, Alaska and Chukotka join through the strait once the sea drops **45 m**, so at −50 m you could walk across. ✓
- **Britain and Europe, "by sixty".**
  - Sources usually give the southern North Sea and Dover Strait link at roughly 40–60 m (the Strait of Dover is ≤ ~60 m deep along its shallowest crossing).
  - In the 0.1° grid, Britain is already land-linked at −30 m. Averaging makes narrow channels look shallower.
  - At −60 m the whole southern North Sea (Doggerland, Dogger Bank at ~15–36 m) is dry. "By sixty, Britain has rejoined Europe" ✓.
  - Doggerland was finally flooded about **8,500–8,000 years ago**. The Storegga tsunami was ≈ 8,150 years ago, and Britain was fully separated by ≈ 6,500–6,000 BC. On screen, write "≈ 8,000 years ago".
- **The last glacial maximum.**
  - Around 26,000–19,000 years ago (Clark et al. 2009, *Science*), "twenty thousand years ago".
  - Global sea level was about **120–130 m** lower (Lambeck et al. 2014, *PNAS*: ≈ −134 m ice-volume equivalent; far-field relative sea level ≈ −120 to −130 m). "About a hundred and twenty" ✓. The display reads −120 m.
  - Caveat: the film lowers today's bathymetry (a bathtub model). Real ice-age coasts also differed through ice loading and rebound, and ice covered northern Britain and Scandinavia. The film is a thought experiment, not an ice-age map. Do not draw ice sheets.
- **People and mammoths on the land bridges.**
  - Beringia: woolly mammoths lived across the Bering land bridge; island populations survived on St Paul Island until ≈ 5,600 years ago.
  - People crossed from Siberia into the Americas via Beringia. The "Beringian standstill" model has the Americas peopled by ≥ 16,000 years ago, and the White Sands footprints are ≈ 21,000–23,000 years old.
  - Doggerland: mammoth bones are routinely trawled from the southern North Sea (Brown Bank, Dogger Bank), and Mesolithic people lived there (the Leman & Ower antler point). ✓
  - These were not necessarily the same moment for every animal and place; the line stays general.
  - Visual rule: correct woolly mammoth anatomy:
    - high domed head, sloping back down to low hindquarters, shoulder hump;
    - long curved tusks curving up and in; small ears; short tail;
    - shaggy coat; pillar legs.
  - Humans upright, in hide clothing, possibly carrying spears. No cartoon faces.
- **Mid-ocean ridge, ~2.5 km.**
  - Ridge crests lie at about **2,500 m** depth on average (NOAA Ocean Exploration).
  - In the 0.1° grid, the snapped crest line's median depth is ≈ 2.7–3.0 km, because averaging deepens narrow crests. So at −2,500 m the shallowest crest segments (Iceland, the Azores, parts of the MAR and the EPR) break the surface and the rest is just under water. The film continues to −3,000 m while the ridge is traced, and it is then broadly emerged. "At two and a half kilometers, a hidden mountain range appears" ✓.
- **Length: 65,000 km.**
  - "More than 65,000 km long, the longest mountain range on Earth" (NOAA Ocean Exploration; USGS *This Dynamic Earth* gives > 60,000 km; some sources give up to 80,000 km with all branches).
  - The drawn line in `data/ridge.js` (12 branches, snapped to the grid's crests) sums to ≈ 68,000 km, which agrees. On screen: "65,000 km".
- **Abyssal plains: "most of the seafloor is dry" at 5 km.**
  - Hypsometry from the grid: of today's ocean area, **79 %** is shallower than 5,000 m (63 % shallower than 4,500 m, 93 % than 5,500 m, 99 % than 6,000 m). ✓ `wetFraction(s)` in env.js gives it live (≈ 0.21 wet at −5 km).
  - Abyssal plains lie at about 3,000–6,000 m and are among the flattest surfaces on Earth (slopes < 1:1,000).
- **Mauna Kea: over 10 km tall.**
  - Summit 4,207 m above sea level.
  - Its base on the sea floor is ≈ 6,000 m below sea level, because the volcano's weight presses the crust into a moat. That gives **≈ 10,200 m base to peak** (USGS HVO; usually quoted as "over 10,000 m").
  - Everest is **8,849 m** above sea level (2020 China–Nepal survey). 10.2 > 8.85 ✓.
  - Honest framing: compare Mauna Kea BASE TO PEAK with Everest ABOVE SEA LEVEL (Everest's own base-to-peak is only ~3.6–4.6 km). The inset must label the two measures.
  - At −6,000 m the moat around Hawaii is dry in the grid (its deepest cell nearby is −5,759 m), so Mauna Kea stands on dry ground for that beat.
- **The Mariana Trench, 10,935 m.**
  - The Challenger Deep is **10,935 m** deep (Greenaway et al. 2021 consensus, ± ~6 m; other surveys give 10,920–10,994 m), at ≈ 11.37° N, 142.59° E. "Eleven kilometers down" ✓.
  - Data note: the 0.1° grid averages the trench floor to **−10,460 m** (11.35° N, 142.45° E), and that is still the deepest cell on Earth in the grid. (Tonga is next at −10,385 m, so the last pool really is in the Mariana Trench.)
  - The display sea level is therefore mapped linearly below −6,000 m onto the data (`dataSea`), so the HUD reads −10,935 m exactly when the last cell runs dry.
- **The coat of paint.**
  - Mean ocean depth **3,682 m** (Charette & Smith 2010, *Oceanography*). Earth's mean diameter is 12,742 km.
  - On a **30 cm** globe: 3,682 / 12,742,000 × 300 mm = **0.087 mm ≈ 0.09 mm**. The deepest point (10,935 m) would be **0.26 mm**.
  - One coat of household paint is ≈ 0.1 mm wet (at ~10 m² per litre) and ≈ 0.03–0.05 mm dry, so "about as thin as a coat of paint" ✓. For comparison, a sheet of copy paper is ≈ 0.1 mm.
  - Visual rule: the cross-section inset is labelled "≈ 0.09 mm" and must not imply a paint layer far thicker or thinner than that.
- **"A thin blue skin … what keeps this planet alive."** The ocean holds ≈ 97 % of Earth's water, and marine phytoplankton produce roughly half of the oxygen made by photosynthesis. It stores heat and carbon. Fair.
- **Globe scale.** The real-data globe is drawn at true orthographic proportions. Relief is shaded, not vertically exaggerated in geometry. The ridge seam and the shoreline glows are graphic overlays.
