import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RP = os.path.join(ROOT, "resource_pack")
BP = os.path.join(ROOT, "behavior_pack")

OUTLINE = (24, 16, 32, 255)

def rgb(r, g, b):
    return (r, g, b, 255)

class Canvas:
    def __init__(self, w=16, h=16):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1-x0), -abs(y1-y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            self.put(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                self.put(x, y, c)

    def outline(self):
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is not None:
                    continue
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0 <= nx < self.w and 0 <= ny < self.h and self.px[ny][nx] is not None:
                        add.append((x,y))
                        break
        for x,y in add:
            self.px[y][x] = OUTLINE
        return self

    def rows(self):
        return [[p if p else (0,0,0,0) for p in row] for row in self.px]

def write_png(path, rows):
    h, w = len(rows), len(rows[0])
    raw = b"".join(b"\x00" + b"".join(bytes(p) for p in row) for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xffffffff)

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w,h,8,6,0,0,0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)

def sword(blade, edge, guard, grip, tip=(14,1)):
    c = Canvas()
    x,y = tip
    c.line(5,9,x-1,y,edge)
    c.line(6,9,x,y,blade)
    c.line(3,8,7,12,guard)
    c.line(4,11,2,13,grip)
    c.put(1,14,guard)
    return c.outline()

def spear():
    c = Canvas()
    c.line(2,13,10,5,rgb(110,76,44))
    c.line(1,14,2,13,rgb(70,50,30))
    c.line(10,4,13,1,rgb(120,210,255))
    c.line(11,5,14,2,rgb(70,140,220))
    c.line(11,4,14,1,rgb(235,250,255))
    c.put(9,6,rgb(255,230,90))
    return c.outline()

def maul():
    c = Canvas()
    c.line(1,14,9,6,rgb(110,76,44))
    c.line(2,14,10,6,rgb(80,56,32))
    c.rect(7,1,14,6,rgb(120,110,140))
    c.rect(7,1,14,2,rgb(180,170,200))
    c.rect(7,5,14,6,rgb(70,60,90))
    c.rect(10,3,11,4,rgb(180,90,255))
    return c.outline()

def staff():
    c = Canvas()
    c.line(1,14,10,5,rgb(110,76,44))
    c.line(2,14,11,5,rgb(80,56,32))
    for y in range(16):
        for x in range(16):
            d = (x-12)**2 + (y-3)**2
            if d <= 7:
                c.put(x,y,rgb(60,200,90))
            if d <= 2:
                c.put(x,y,rgb(190,255,190))
    c.put(10,5,rgb(255,215,80))
    return c.outline()

def gem(core, light, dark, wide=5, tall=5):
    c = Canvas()
    for y in range(16):
        for x in range(16):
            dx,dy = abs(x-7.5),abs(y-7.5)
            if dx/wide + dy/tall <= .9:
                c.put(x,y,core)
                if x < 8 and y < 8:
                    c.put(x,y,light)
                if x >= 9 and y >= 9:
                    c.put(x,y,dark)
    return c.outline()

SPRITES = {
    "ember_blade": sword(rgb(255,130,30),rgb(255,220,90),rgb(90,40,20),rgb(60,30,20)),
    "void_dagger": sword(rgb(150,60,220),rgb(220,160,255),rgb(40,20,60),rgb(30,15,45),(11,4)),
    "storm_spear": spear(),
    "gravity_maul": maul(),
    "lifebloom_staff": staff(),
    "arcane_essence": gem(rgb(160,80,230),rgb(225,170,255),rgb(100,40,160),6,6),
    "mana_crystal": gem(rgb(60,150,255),rgb(170,230,255),rgb(30,80,190),3.6,6.5),
}

def pack_icon(path):
    bg = Canvas()
    for y in range(16):
        for x in range(16):
            t = (x+y)/30
            bg.put(x,y,rgb(int(60-35*t),int(25-10*t),int(110-50*t)))
    sprite = SPRITES["ember_blade"]
    for y in range(16):
        for x in range(16):
            if sprite.px[y][x] is not None:
                bg.put(x,y,sprite.px[y][x])
    rows = []
    for row in bg.rows():
        big = [p for p in row for _ in range(4)]
        rows.extend([list(big) for _ in range(4)])
    write_png(path,rows)

def main():
    for name, canvas in SPRITES.items():
        write_png(os.path.join(RP,"textures","items",name+".png"),canvas.rows())
    pack_icon(os.path.join(RP,"pack_icon.png"))
    pack_icon(os.path.join(BP,"pack_icon.png"))
    print("Generated",len(SPRITES),"textures and pack icons")

if __name__ == "__main__":
    main()
