# 12b — What If You Fell Through the Earth? (hook version)

- **Anchor:** a person at the lip of a shaft drilled straight through the planet
- **Ladder:** crust 35 km → mantle ~2,900 km → outer core (liquid iron) → inner core (~5,200 °C) → centre at ~8 km/s → far surface 12,742 km
- **Reveal:** one way takes ~42 minutes, and in the simplest model a straight tunnel between any two cities (London–New York included) takes the same ~42 minutes
- **Closing question:** through the Moon instead, shorter or longer? (Answer: longer, ~54 min)
- **Length:** 75.1 s (cold-open preroll 5.83 s + main film)
- **Accent colour:** `(255, 140, 70)`
- **Production:** `out/12b-what-if-you-fell-through-the-earth-hook.mp4`, `out/thumbnail.png`. See `BRIEF.md`, `episode.json`, `camera.js`, `env.js`, `scenes/`.

## Narration script

> *(cold open)* Jump into a hole through the Earth, and you'd reach the other side in forty-two minutes.
> What if you jumped into a hole straight through the Earth?
> First, you'd fall through the crust: about thirty-five kilometers of solid rock.
> Then the mantle: nearly three thousand kilometers of hot rock.
> Next, the outer core, an ocean of liquid iron.
> The inner core is about as hot as the surface of the Sun.
> With no air to slow you, you'd pass the center at about eight kilometers a second.
> That's roughly eight times faster than a rifle bullet.
> Then gravity flips, and starts slowing you down.
> You coast up the other side and reach the surface, twelve thousand seven hundred kilometers away.
> Unless someone grabs you, you fall straight back in.
> The whole trip takes about forty-two minutes.
> And in the simplest model, a straight tunnel between any two cities takes the same time.
> London to New York? Also about forty-two minutes.
> If you fell through the Moon instead, would the trip be shorter or longer? Tell me in the comments.

## The model

An idealised thought experiment: a vacuum tunnel (no air drag), no heat, no rotation, and a **uniform-density Earth** (R = 6,371 km, g = 9.81 m/s²). Inside a uniform sphere, gravity grows linearly with distance from the centre (g·r/R), so the faller moves in simple harmonic motion with ω = √(g/R).

- **One-way time:** T = π·√(R/g) = π·√(6.371e6 / 9.81) = 2,532 s = **42.2 min** (Cooper 1966). The film says "about 42 minutes", and the trip clock locks at 42:00, not 42:12. That rounding is deliberate (`camera.js` `T_HALF`).
- **Top speed at the centre:** v = √(g·R) = √(9.81 × 6.371e6) = 7,906 m/s ≈ **7.9 km/s**, said as "about 8 km/s"; 17,700 mph, 4.9 mi/s.
- **Any chord, same time:** along a straight chord, the gravity component along the tunnel is again proportional to distance from the chord's midpoint, with the same ω. So every chord takes π·√(R/g) ≈ 42 min, whatever its length.
- **Gravity "flips":** past the centre, gravity points back towards it and decelerates the faller to rest at the far surface (energy conservation, no drag).
- **On-screen HUD:** the depth readout and `SPEED x KM/S` use `speedAt(depth) = √(gR)·√(1 − r²)` with r = |R − depth|/R, so speed is always consistent with depth in this model. The dive itself is time-lapsed (no clock runs during it). The trip clock (s09–s12) is driven by `tripFraction(depth) = acos(1 − depth/R)/π` during the fall back, so clock and faller agree.

**Caveat (real Earth):** Earth is much denser toward the core (PREM), so gravity actually *increases* down to the core–mantle boundary. With the real density profile, the straight-through drop takes about **38 min** and the top speed is close to 10 km/s (Klotz 2015). The film signals the idealisation with "A THOUGHT EXPERIMENT" in the hook and "in the simplest model" before the chord claim; `youtube.md` mentions the real-density result.

## Fact-check notes

- **Crust ≈ 35 km (22 mi):** average continental crust thickness (~30–50 km; oceanic crust is 5–10 km). The label says "continental crust" (USGS; PREM uses a 24.4 km mean crust, but continental average ~35 km is standard).
- **Mantle "nearly 3,000 km" / label "≈ 2,900 km · 1,800 mi":** core–mantle boundary at 2,891 km depth (PREM, radius 3,480 km). Mantle thickness 2,891 − 35 = 2,856 km ≈ 2,900 km; 1,800 mi = 2,897 km.
- **Outer core, liquid iron (and nickel), "2,260 km thick · 1,400 mi":** from 2,891 km to the inner-core boundary at 5,150 km depth (radius 1,221 km): 2,259 km ≈ 1,404 mi. Liquid because it does not transmit S-waves (PREM).
- **Inner core ≈ 5,200 °C (9,400 °F), "about as hot as the surface of the Sun":** inner-core temperature estimates ~5,000–6,000 °C (≈5,400 °C at the inner-core boundary). Sun's photosphere: 5,772 K ≈ 5,500 °C. 5,200 °C = 9,392 °F → 9,400 °F.
- **≈ 8 km/s / 17,700 mph:** 7.906 km/s × 2,237 = 17,690 mph.
- **8× a rifle bullet:** typical rifle muzzle velocities are 0.8–1.2 km/s (e.g. 5.56 NATO ~0.94 km/s); 7.9 / ~1 ≈ 8, "roughly eight times". The on-screen card uses 1 km/s vs 8 km/s.
- **12,700 km straight through:** Earth's mean diameter 12,742 km = 7,918 mi (label "12,742 km / 7,918 MI").
- **42 minutes:** π·√(R/g) = 42.2 min (above).
- **London–New York:** great-circle distance ≈ 5,570 km → central angle 5,570 / 6,371 = 0.874 rad = 50.1° (`CITY_HALF_ANGLE` 25.05°). Chord = 2R·sin(25.05°) = 5,395 km → "5,400 KM LONG"; deepest point R·(1 − cos 25.05°) = 599 km → "600 KM DEEP". Trip time: the same 42.2 min (any chord); top speed only v = √(gR)·sin(25.05°) ≈ 3.3 km/s.
- **Scale bars:** "5,000 km" at 15 km/px (globe Ø 850 px = 12,742 km); "2,000 km" at the 7.4 km/px chord view.

## Closing question (answer, not for posting)

**Longer: about 54 minutes.** In the uniform model T = π·√(R/g) = π·√(3/(4πGρ)), which depends only on density ρ, not on size.
- Moon mean density 3,344 kg/m³, Earth 5,513 kg/m³ (NASA fact sheets).
- T_Moon = 42.2 × √(5,513/3,344) = 42.2 × 1.284 ≈ **54.2 min**.
- Cross-check with R and g: π·√(1.737e6 / 1.62) = π × 1,035 s = 3,253 s = 54.2 min.

## Sources

- Cooper, P. W. (1966). Through the Earth in forty minutes. *American Journal of Physics* 34, 68.
- Klotz, A. R. (2015). The gravity tunnel in a non-uniform Earth. *American Journal of Physics* 83, 231.
- Dziewonski, A. M. & Anderson, D. L. (1981). Preliminary reference Earth model. *Physics of the Earth and Planetary Interiors* 25, 297–356.
- USGS, *This Dynamic Earth*: The Interior of the Earth.
- NASA NSSDCA Earth and Moon Fact Sheets (mean density, radius, surface gravity): https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html, https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
