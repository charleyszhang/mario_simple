#!/usr/bin/env python3
from PIL import Image
from collections import deque
import os

BASE = r"c:\phpstudy_pro\WWW\mario\mario_simple\images"

def cutout(src_name, dst_name):
    src = os.path.join(BASE, src_name)
    dst = os.path.join(BASE, dst_name)
    if not os.path.exists(src):
        print("skip", src)
        return
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_bg(r, g, b):
        return (r + g + b) / 3 > 210 and max(r, g, b) - min(r, g, b) < 40

    seen = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h or seen[y][x]:
            continue
        seen[y][x] = True
        r, g, b, a = px[x, y]
        if is_bg(r, g, b):
            px[x, y] = (0, 0, 0, 0)
            q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    img.save(dst, "PNG")
    print("saved", dst)

if __name__ == "__main__":
    cutout("element.jpg", "element.png")
    cutout("element2.jpg", "element2.png")
