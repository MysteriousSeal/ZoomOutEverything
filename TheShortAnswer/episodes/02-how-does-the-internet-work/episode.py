"""Episode 02 — How Does the Internet Work? Script lines and the seven scenes.

Each scene maps to one narration line. Scene timing comes from the recorded
voice (build/timeline.json): every scene gets its local time `t`, its duration
`d`, and the global time `gt`. `cues(d)` lists sound effects as
(local_time, sfx_name, gain, pitch).
"""
import math
import random

from common import (FONT_AVENIR, FONT_MONO, HEAVY, DEMI, SKY_DEEP, WHITE, annotation, clamp, draw_stars,
                    ease_in_out, ease_out, font, lerp, lerp_col, prog, soft_glow)

SLUG = "02-how-does-the-internet-work"
TITLE = "How Does the Internet Work?"

LINES = [
    "Where does this video actually come from?",
    "Every file online gets chopped into thousands of tiny pieces, called packets.",
    "Each one is labeled with where it's going, and where it fits.",
    "They travel as pulses of light through fiber-optic cables, even across the ocean floor.",
    "Every packet can take a different route, so some arrive out of order.",
    "Your phone sorts them, asks again for anything missing, and rebuilds the file.",
    "All of that happens in milliseconds, just to show you this sentence.",
]

CYAN = (100, 225, 210)
RED_ALERT = (255, 95, 90)
PANEL = (14, 24, 48)


def packet(c, x, y, size, color=CYAN, num=None, alpha=1.0, glow=0.6):
    """A data packet: small rounded square, optional sequence number."""
    if size < 1 or alpha <= 0:
        return
    a = int(255 * alpha)
    h = size / 2
    if glow:
        g = glow * alpha * min(1.0, 34 / size)
        c.gcircle(x, y, size * 0.75, tuple(int(v * g) for v in color))
    c.rrect(x - h, y - h, x + h, y + h, size * 0.22, fill=lerp_col(color, (10, 20, 40), 0.25) + (a,))
    c.rrect(x - h, y - h, x + h, y - h * 0.2, size * 0.22, fill=(255, 255, 255, int(45 * alpha)))
    if num is not None:
        c.text(x, y + size * 0.02, str(num), size * 0.5, fill=(8, 16, 30, a), index=HEAVY)


def phone(c, cx, cy, w, h):
    c.rrect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, 64, fill=(16, 20, 34), outline=(90, 110, 150), width=4)
    c.rrect(cx - w / 2 + 16, cy - h / 2 + 16, cx + w / 2 - 16, cy + h / 2 - 16, 50, fill=(6, 10, 24))
    c.rrect(cx - 50, cy - h / 2 + 30, cx + 50, cy - h / 2 + 56, 13, fill=(16, 20, 34))


def play_screen(c, cx, cy, w, gt, k=1.0):
    """Abstract video playing on the phone: play glyph + progress bar."""
    a = int(255 * k)
    s = 70
    c.poly([(cx - s * 0.4, cy - s * 0.55), (cx - s * 0.4, cy + s * 0.55), (cx + s * 0.55, cy)], fill=WHITE + (a,))
    c.gcircle(cx, cy, 70 * k, (30, 70, 90))
    bw = w * 0.7
    y = cy + 300
    c.rrect(cx - bw / 2, y - 4, cx + bw / 2, y + 4, 4, fill=(255, 255, 255, int(60 * k)))
    f = (gt * 0.08) % 1
    c.rrect(cx - bw / 2, y - 4, cx - bw / 2 + bw * f, y + 4, 4, fill=CYAN + (a,))


rng = random.Random(8)
STREAM = [(rng.uniform(-1, 1), rng.uniform(0, 1), rng.uniform(10, 20), rng.uniform(0.7, 1.3)) for _ in range(46)]


def draw_stream(c, gt, cx, top, spread=420, speed=700, alpha=1.0):
    """Packets raining down into the phone from above."""
    for dx, ph, size, sp in STREAM:
        span = top + 80
        y = ((gt * speed * sp / span + ph) % 1) * span - 80
        x = cx + dx * spread * (1 - y / span) ** 1.5 * 0.9
        fade = clamp((top - y) / 120) * alpha
        packet(c, x, y, size, CYAN, alpha=fade, glow=0.5)


class Scene:
    chapter = None
    captions = True

    def sky(self, t, d):
        return SKY_DEEP

    def accent(self, t, d):
        return CYAN

    def cues(self, d):
        return []

    def draw(self, c, t, d, gt):
        raise NotImplementedError


PHONE = (540, 1180, 400, 790)


class Hook(Scene):
    captions = False

    def cues(self, d):
        return [(0.0, "impact", 0.7, 1.1), (0.2, "data", 0.35, 1.0), (0.6, "shimmer", 0.3, 1.2)]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.4)
        cx, cy, w, h = PHONE
        draw_stream(c, gt, cx, cy - h / 2 + 30)
        phone(c, cx, cy, w, h)
        play_screen(c, cx, cy, w, gt)
        for line, y, col, st in [("WHERE DOES", 330, WHITE, 0.0), ("THIS VIDEO", 440, WHITE, 0.15),
                                 ("COME FROM?", 560, CYAN, 0.35)]:
            k = ease_out(prog(t, st, 0.45))
            if k > 0:
                c.text(540, y + (1 - k) * 24, line, 96, fill=col + (int(255 * k),), index=HEAVY, path=FONT_AVENIR,
                       stroke=3, stroke_fill=(4, 8, 22, 200))


rng = random.Random(3)
GRID_C, GRID_R, CELL = 8, 9, 54
BLOCK = (540 - GRID_C * CELL / 2, 680)
SHARDS = []
for r in range(GRID_R):
    for col in range(GRID_C):
        SHARDS.append((col, r, rng.uniform(60, 1020), rng.uniform(420, 1600), rng.uniform(0, 0.25),
                       lerp_col(CYAN, (70, 140, 255), rng.random()), rng.uniform(0, 6.28)))


class Packets(Scene):
    chapter = ("01", "PACKETS")

    def split(self, d):
        return 0.32 * d

    def cues(self, d):
        ts = self.split(d)
        return [(0.0, "blip", 0.3, 1.0), (ts - 0.35, "riser", 0.25, 1.4), (ts, "shatter", 0.55, 1.0),
                (ts + 0.1, "data", 0.3, 1.2)]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.2)
        ts = self.split(d)
        bx, by = BLOCK
        bw, bh = GRID_C * CELL, GRID_R * CELL
        if t < ts:
            k = ease_out(prog(t, 0, 0.4))
            c.gcircle(540, by + bh / 2, 300 * k, (8, 20, 36))
            c.rrect(bx, by, bx + bw, by + bh, 24, fill=(18, 40, 76, int(255 * k)), outline=CYAN + (int(200 * k),), width=3)
            c.text(540, by + bh / 2 - 30, "video.mp4", 54, fill=WHITE + (int(255 * k),), index=HEAVY)
            c.text(540, by + bh / 2 + 40, "38 MB", 40, fill=CYAN + (int(230 * k),), index=DEMI)
            crack = prog(t, ts * 0.45, ts * 0.55)
            if crack > 0:
                a = int(170 * crack)
                for i in range(1, GRID_C):
                    c.line([(bx + i * CELL, by), (bx + i * CELL, by + bh * crack)], (160, 240, 230, a), 1.5)
                for j in range(1, GRID_R):
                    c.line([(bx, by + j * CELL), (bx + bw * crack, by + j * CELL)], (160, 240, 230, a), 1.5)
            return
        c.gcircle(540, by + bh / 2, 300 * (1 - prog(t, ts, 0.4)), (40, 90, 110))
        for col, r, tx, ty, delay, color, ph in SHARDS:
            k = ease_out(prog(t, ts + delay, 0.9))
            x0, y0 = bx + col * CELL + CELL / 2, by + r * CELL + CELL / 2
            x = lerp(x0, tx, k) + math.sin(gt * 1.3 + ph) * 6 * k
            y = lerp(y0, ty, k) + math.cos(gt * 1.1 + ph) * 6 * k
            packet(c, x, y, lerp(CELL - 6, 26, k), color, glow=0.5)
        annotation(c, 540, 430, "≈ 1,500 bytes each", t - ts - 0.4, anchor="mm")
        annotation(c, 540, 1420, "1 minute of HD video ≈ 25,000 packets", t - ts - 0.9, anchor="mm")


HEX = [" ".join(f"{random.Random(i * 31 + j).randrange(256):02x}" for j in range(10)) for i in range(40)]


def typed(s, t, rate=28):
    return s[: max(0, int(t * rate))]


class Label(Scene):
    chapter = ("02", "THE LABEL")
    CARD = (150, 560, 930, 1200)

    def cues(self, d):
        return ([(0.0, "blip", 0.3, 1.0), (0.1, "whoosh", 0.3, 1.2)]
                + [(0.45 + k * 0.45, "keys", 0.3, 1.0 + k * 0.1) for k in range(3)])

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.2)
        for i, (col, r, tx, ty, _, color, ph) in enumerate(SHARDS[::3]):
            packet(c, tx + math.sin(gt * 1.3 + ph) * 6, ty + math.cos(gt * 1.1 + ph) * 6, 26, color,
                   alpha=0.25, glow=0.15)
        k = ease_out(prog(t, 0, 0.5))
        x0, y0, x1, y1 = self.CARD
        y0 += (1 - k) * 60
        y1 += (1 - k) * 60
        a = int(255 * k)
        soft_glow(c, 540, (y0 + y1) / 2, 520, (30, 90, 110), 0.5 * k)
        c.rrect(x0, y0, x1, y1, 30, fill=PANEL + (a,), outline=CYAN + (int(220 * k),), width=3)
        c.text(x0 + 40, y0 + 55, "HEADER", 28, fill=CYAN + (a,), index=DEMI, anchor="lm")
        c.line([(x0 + 30, y0 + 300), (x1 - 30, y0 + 300)], (100, 225, 210, int(120 * k)), 2)
        fields = [("FROM", "203.0.113.7"), ("TO", "198.51.100.24"), ("PIECE", "4,812 of 25,000")]
        for i, (key, val) in enumerate(fields):
            st = 0.45 + i * 0.45
            y = y0 + 120 + i * 62
            kk = ease_out(prog(t, st - 0.1, 0.3))
            c.text(x0 + 40, y, key, 30, fill=(150, 170, 210, int(255 * kk)), index=DEMI, anchor="lm")
            shown = typed(val, t - st)
            c.text(x0 + 220, y, shown, 40, fill=WHITE + (int(255 * kk),), path=FONT_MONO, index=1, anchor="lm")
            if 0 < len(shown) < len(val) or (len(shown) == len(val) and (gt * 3) % 1 < 0.5 and i == 2):
                cw = font(40, 1, FONT_MONO).getlength(shown) / 2
                c.rect(x0 + 220 + cw + 4, y - 20, x0 + 240 + cw, y + 20, CYAN + (a,))
        c.text(x0 + 40, y0 + 345, "DATA", 28, fill=CYAN + (a,), index=DEMI, anchor="lm")
        off = int(gt * 6)
        for row in range(5):
            c.text(x0 + 40, y0 + 405 + row * 46, HEX[(row + off) % len(HEX)], 32,
                   fill=(130, 160, 200, int(150 * k)), path=FONT_MONO, index=0, anchor="lm")
        annotation(c, 540, 430, "where it's going  ·  where it fits", t - 1.6, anchor="mm")


SEA_TOP, FLOOR = 640, 1560
FLOOR_PTS = [(x, FLOOR - 30 * math.sin(x * 0.006 + 1) - 14 * math.sin(x * 0.017)) for x in range(-20, 1120, 20)]
CABLE = [(x, y - 12) for x, y in FLOOR_PTS]


def along(pts, f):
    """Point at fraction f along a polyline."""
    seg = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])]
    target = f * sum(seg)
    for (a, b), L in zip(zip(pts, pts[1:]), seg):
        if target <= L:
            u = target / L
            return lerp(a[0], b[0], u), lerp(a[1], b[1], u)
        target -= L
    return pts[-1]


class Fiber(Scene):
    chapter = ("03", "FIBER")
    INSET = (540, 1010, 190)

    def sky(self, t, d):
        return ((0.0, (4, 8, 24)), (0.33, (8, 20, 46)), (0.34, (6, 26, 58)), (1.0, (2, 8, 20)))

    def cues(self, d):
        return [(0.0, "blip", 0.3, 1.0), (0.0, "underwater", 0.5, 1.0), (0.5, "data", 0.25, 0.8),
                (0.8, "whoosh", 0.25, 1.4)]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.3, max_y=SEA_TOP - 20)
        waves = [(x, SEA_TOP + 6 * math.sin(x * 0.02 + gt * 2)) for x in range(-20, 1120, 20)]
        c.line(waves, (120, 190, 240, 140), 2)
        for k in range(14):
            x = (k * 83 + gt * 40) % 1160 - 40
            y = SEA_TOP + 80 + (k * 137) % 700
            c.circle(x, y - (gt * 30 + k * 50) % 700 * 0.2, 3, fill=(150, 200, 255, 50))
        c.poly(FLOOR_PTS + [(1120, 2000), (-20, 2000)], fill=(14, 18, 30))
        c.line(CABLE, (40, 46, 60), 12)
        c.line(CABLE, (70, 80, 100), 4)
        for k in range(10):
            f = (gt * 0.45 + k / 10) % 1
            x, y = along(CABLE, f)
            c.gcircle(x, y, 26, (60, 200, 255))
            c.circle(x, y, 5, fill=(220, 250, 255))
        # magnified fibre: light bouncing inside a glass core
        ix, iy, ir = self.INSET
        k = ease_out(prog(t, 0.6, 0.5))
        if k > 0:
            ax, ay = along(CABLE, 0.5)
            c.line([(ax, ay - 10), (ix, iy + ir * k)], (180, 220, 255, int(120 * k)), 2)
            c.circle(ix, iy, ir * k, fill=(8, 16, 34, int(240 * k)), outline=(150, 200, 240, int(200 * k)), width=3)
            core = 46 * k
            half = math.sqrt(max(0, (ir * k) ** 2 - core ** 2)) - 8
            c.rect(ix - half, iy - core, ix + half, iy + core, (60, 120, 170, int(70 * k)))
            c.line([(ix - half, iy - core), (ix + half, iy - core)], (150, 210, 240, int(160 * k)), 2)
            c.line([(ix - half, iy + core), (ix + half, iy + core)], (150, 210, 240, int(160 * k)), 2)
            zig, x, up = [], ix - half, True
            phase = (gt * 260) % 80
            x -= phase
            while x < ix + half:
                zig.append((max(ix - half, x), iy - core if up else iy + core))
                x += 40
                up = not up
            if len(zig) > 1:
                c.glow_line(zig, (140, 230, 255), 3, glow=4)
        annotation(c, 540, 430, "light in glass ≈ 200,000 km per second", t - 0.9, anchor="mm")
        annotation(c, 540, 500, "~99% of data between continents runs under the sea", t - 1.6, anchor="mm", size=30)


NODES = [(90, 830), (260, 570), (300, 900), (250, 1150), (470, 470), (500, 760), (480, 1050), (700, 560),
         (720, 880), (690, 1170), (880, 610), (870, 1010), (990, 830)]
PATHS = {1: [0, 3, 6, 9, 11, 12], 2: [0, 2, 5, 8, 12], 3: [0, 1, 4, 7, 10, 12], 4: [0, 2, 6, 8, 11, 12],
         5: [0, 1, 5, 7, 10, 12], 6: [0, 3, 6, 5, 8, 12]}
EDGES = sorted({tuple(sorted(e)) for p in PATHS.values() for e in zip(p, p[1:])} | {(1, 2), (4, 5), (7, 8), (8, 9), (10, 11), (5, 6)})
SPEED_FACTOR = {1: 1.0, 2: 0.8, 3: 1.25, 4: 1.0, 5: 0.75, 6: 1.1}  # congestion: some hops are slower


def path_len(p):
    return sum(math.dist(NODES[a], NODES[b]) for a, b in zip(p, p[1:]))


class Routing(Scene):
    chapter = ("04", "ROUTING")

    def schedule(self, d):
        travel = 0.5 * d
        out = {}
        for n, p in PATHS.items():
            st = 0.15 + (n - 1) * 0.12
            out[n] = (st, travel * path_len(p) / path_len(PATHS[2]) * SPEED_FACTOR[n] * 0.85)
        return out

    def cues(self, d):
        sched = self.schedule(d)
        return [(0.0, "blip", 0.3, 1.0)] + [(st + dur, "tick", 0.35, 1.0 + 0.08 * n) for n, (st, dur) in sched.items()]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.2)
        for a, b in EDGES:
            c.line([NODES[a], NODES[b]], (100, 150, 210, 130), 3)
        sched = self.schedule(d)
        hot = {}
        arrived = []
        moving = []
        for n, (st, dur) in sched.items():
            p = PATHS[n]
            if t < st:
                continue
            f = (t - st) / dur
            if f >= 1:
                arrived.append((st + dur, n))
                continue
            pts = [NODES[i] for i in p]
            x, y = along(pts, ease_in_out(f) * 0.15 + f * 0.85)
            for i in p:
                if math.dist((x, y), NODES[i]) < 40:
                    hot[i] = 1
            moving.append((x, y, n))
        for i, (x, y) in enumerate(NODES):
            end = i in (0, 12)
            r = 22 if end else 13
            if i in hot:
                c.gcircle(x, y, 50, (60, 180, 200))
            c.circle(x, y, r, fill=(14, 26, 50), outline=CYAN + (220 if end or i in hot else 120,), width=3)
        c.text(100, 890, "SERVER", 26, fill=(150, 170, 210), index=DEMI)
        c.text(980, 890, "YOU", 26, fill=(150, 170, 210), index=DEMI)
        for x, y, n in moving:
            packet(c, x, y, 58, CYAN, num=n, glow=0.7)
        annotation(c, 540, 400, "each router picks the next hop", t - 0.4, anchor="mm")
        if arrived:
            order = [n for _, n in sorted(arrived)]
            c.text(540, 1420, "ARRIVED   " + "  ".join(str(n) for n in order), 40, fill=WHITE, path=FONT_MONO, index=1)


class Reassembly(Scene):
    chapter = ("05", "REASSEMBLY")
    COLS, ROWS, CELL = 4, 3, 150
    ORDER = [3, 1, 2, 5, 4, 9, 6, 8, 11, 10, 12]  # #7 lost on the way
    MISSING = 7

    def slot(self, n):
        i = n - 1
        x0 = 540 - self.COLS * self.CELL / 2 + self.CELL / 2
        return x0 + (i % self.COLS) * self.CELL, 640 + (i // self.COLS) * self.CELL

    def times(self, d):
        return 0.04 * d, 0.045 * d, 0.55 * d, 0.72 * d, 0.86 * d  # first, spacing, resend, refill, merge

    def cues(self, d):
        first, gap, resend, refill, merge = self.times(d)
        return ([(0.0, "blip", 0.3, 1.0)] + [(first + k * gap + 0.25, "tick", 0.25, 1.0 + k * 0.05) for k in range(11)]
                + [(resend - 0.3, "alert", 0.35, 1.0), (resend, "whoosh", 0.3, 1.5), (refill, "tick", 0.4, 1.4),
                   (merge, "bloom", 0.45, 1.2)])

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.2)
        first, gap, resend, refill, merge = self.times(d)
        m = ease_out(prog(t, merge, 0.4))
        gx0 = 540 - self.COLS * self.CELL / 2
        gy0 = 640 - self.CELL / 2
        if m < 1:
            for n in range(1, 13):
                x, y = self.slot(n)
                h = self.CELL / 2 - 10
                miss = n == self.MISSING and t < refill
                col = RED_ALERT if miss and t > resend - 0.4 else (90, 130, 190)
                alpha = 0.5 + 0.5 * math.sin(gt * 10) if miss and t > resend - 0.4 else 0.6
                c.rrect(x - h, y - h, x + h, y + h, 18, outline=col + (int(200 * alpha * (1 - m)),), width=2)
                c.text(x, y, str(n), 30, fill=col + (int(110 * (1 - m)),), index=DEMI)
            for k, n in enumerate(self.ORDER):
                f = ease_out(prog(t, first + k * gap, 0.35))
                if f <= 0:
                    continue
                tx, ty = self.slot(n)
                x, y = lerp(tx, gx0 + self.COLS * self.CELL / 2, m), lerp(ty, gy0 + self.ROWS * self.CELL / 2, m)
                packet(c, lerp(1180, x, f), lerp(1100 + n * 20, y, f), self.CELL - 30, CYAN, num=n, alpha=1 - m, glow=0.5)
            if t > resend:
                f = prog(t, resend, refill - resend)
                if f < 0.5:
                    px = lerp(self.slot(7)[0] + 60, 1160, f * 2)
                    c.rrect(px - 10, 1410 - 26, px + 210, 1410 + 26, 26, fill=RED_ALERT + (220,))
                    c.text(px + 100, 1410, "RESEND #7", 26, fill=WHITE, index=HEAVY)
                else:
                    tx, ty = self.slot(7)
                    g = ease_out((f - 0.5) * 2)
                    packet(c, lerp(1180, tx, g), lerp(1410, ty, g), self.CELL - 30, CYAN, num=7, alpha=1 - m, glow=0.8)
            if t > refill:
                tx, ty = self.slot(7)
                packet(c, lerp(tx, 540, m), lerp(ty, 790, m), self.CELL - 30, CYAN, num=7, alpha=1 - m, glow=0.8)
            annotation(c, 540, 430, "missing pieces get requested again", t - resend + 0.2, anchor="mm")
        if m > 0:
            soft_glow(c, 540, 790, 420 * m, (60, 160, 170), 0.6)
            c.rrect(540 - 240 * m, 790 - 160 * m, 540 + 240 * m, 790 + 160 * m, 26, fill=(18, 40, 76, int(255 * m)),
                    outline=CYAN + (int(220 * m),), width=3)
            c.text(540, 760, "video.mp4", 54, fill=WHITE + (int(255 * m),), index=HEAVY)
            c.text(540, 830, "complete", 34, fill=CYAN + (int(255 * m),), index=DEMI)


class Milliseconds(Scene):
    chapter = ("06", "MILLISECONDS")

    def cues(self, d):
        return [(0.0, "blip", 0.3, 1.0), (0.1, "count", 0.35, 1.0), (0.8, "data", 0.3, 1.0), (d - 1.8, "swell", 0.3, 1.0)]

    def draw(self, c, t, d, gt):
        draw_stars(c, gt, 0.4)
        cx, cy, w, h = PHONE
        z = ease_in_out(prog(t, 0.3, 0.8))
        draw_stream(c, gt, cx, cy - h / 2 + 30, alpha=z)
        phone(c, cx, cy, w, h)
        play_screen(c, cx, cy, w, gt, z)
        ms = int(35 * ease_out(prog(t, 0.1, 0.9)))
        c.text(540, 470, f"{ms} ms", 130, fill=CYAN, index=HEAVY, stroke=3, stroke_fill=(4, 8, 22, 200))
        annotation(c, 540, 580, "New York to London, one way", t - 0.6, anchor="mm")


SCENES = [Hook(), Packets(), Label(), Fiber(), Routing(), Reassembly(), Milliseconds()]


def thumbnail(c, gt=2.0):
    draw_stars(c, gt, 0.4)
    cx, cy, w, h = PHONE
    draw_stream(c, gt, cx, cy - h / 2 + 30)
    phone(c, cx, cy, w, h)
    play_screen(c, cx, cy, w, gt)
    for line, y, col in [("WHERE DOES", 330, WHITE), ("THIS VIDEO", 440, WHITE), ("COME FROM?", 560, CYAN)]:
        c.text(540, y, line, 104, fill=col, index=HEAVY, stroke=3, stroke_fill=(4, 8, 22, 200))
