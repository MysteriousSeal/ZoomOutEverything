# 02 — How Does the Internet Work?

- **Category:** Tech & internet
- **Length:** ~30s (83 words)
- **Core idea:** Data is split into labeled packets that travel as light through fiber, take different routes, and get reassembled on your device.
- **Hook:** A phone playing a video while packets rain into it: "Where does this video actually come from?"
- **Accent colour:** cyan `(100, 225, 210)`
- **Production:** ✅ rendered (`out/` in this folder)

## Narration script

> Where does this video actually come from?
> Every file online gets chopped into thousands of tiny pieces, called packets.
> Each one is labeled with where it's going, and where it fits.
> They travel as pulses of light through fiber-optic cables, even across the ocean floor.
> Every packet can take a different route, so some arrive out of order.
> Your phone sorts them, asks again for anything missing, and rebuilds the file.
> All of that happens in milliseconds, just to show you this sentence.

## Scene breakdown

| # | Chapter | Visuals | On-screen labels |
|---|---------|---------|------------------|
| 0 | — (hook) | Phone playing a video, packets streaming into it from above | WHERE DOES THIS VIDEO **COME FROM?** |
| 1 | 01 — Packets | "video.mp4 · 38 MB" block cracks along a grid and shatters into drifting packets | ≈ 1,500 bytes each / 1 minute of HD video ≈ 25,000 packets |
| 2 | 02 — The Label | One packet enlarged into a card: header fields type on, hex payload scrolls | FROM 203.0.113.7 · TO 198.51.100.24 · PIECE 4,812 of 25,000 |
| 3 | 03 — Fiber | Ocean cross-section, cable on the seafloor with light pulses; magnified fiber shows light bouncing inside the glass core | light in glass ≈ 200,000 km/s / ~99% of data between continents runs under the sea |
| 4 | 04 — Routing | Router network from SERVER to YOU; six numbered packets take different paths, routers flash as they pass | each router picks the next hop / ARRIVED 2 5 1 4 3 6 |
| 5 | 05 — Reassembly | Packets land in numbered slots out of order, #7 is missing (red pulse), "RESEND #7" goes out, #7 returns, everything merges into "video.mp4 · complete" | missing pieces get requested again |
| 6 | 06 — Milliseconds | Back to the phone (loops to the hook) with a counter running up to 35 ms | 35 ms · New York to London, one way |

## YouTube metadata

- **Title:** How Does the Internet Actually Work? #shorts
- **Description:** This video reached you in tens of thousands of pieces, through cables on the ocean floor, in milliseconds.
- **Hashtags:** #internet #tech #howitworks #ELI5 #explained #shorts
- **Pinned comment:** "Next: what happens when you type a website name? 🌐"

## Fact-check notes

- **Packet size:** Ethernet's standard MTU is 1,500 bytes, so "≈ 1,500 bytes each" is typical. 1 minute of HD video at ~5 Mbps ≈ 37 MB ≈ 25,000 packets.
- **Labels:** IP headers carry source/destination addresses; TCP adds sequence numbers ("where it fits"). The IPs shown come from ranges reserved for documentation (RFC 5737), so they aren't real hosts.
- **Fiber:** light travels at about two-thirds of c in glass (~200,000 km/s). Submarine cables carry the vast majority (often cited ~99%) of intercontinental traffic.
- **Routing:** each router forwards packets hop by hop. Packets of one flow *usually* follow the same path, but they can take different ones and arrive out of order. The video simplifies this.
- **Resend:** TCP (and QUIC) detect missing data and retransmit it.
- **Latency:** New York to London one-way is roughly 30–40 ms over fiber.
- **Simplification:** most video actually comes from a nearby cache (CDN) rather than one distant server.
