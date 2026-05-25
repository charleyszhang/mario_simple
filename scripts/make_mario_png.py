from PIL import Image
from collections import deque

src = r'c:\phpstudy_pro\WWW\mario\images\mario.jpg'
dst = r'c:\phpstudy_pro\WWW\mario\images\mario.png'

img = Image.open(src).convert('RGBA')
w, h = img.size
pixels = img.load()


def is_bg(r, g, b):
    brightness = (r + g + b) / 3
    diff = max(r, g, b) - min(r, g, b)
    return brightness > 200 and diff < 40


visited = [[False] * w for _ in range(h)]
q = deque()

for x in range(w):
    q.append((x, 0))
    q.append((x, h - 1))
for y in range(h):
    q.append((0, y))
    q.append((w - 1, y))

while q:
    x, y = q.popleft()
    if x < 0 or x >= w or y < 0 or y >= h or visited[y][x]:
        continue
    visited[y][x] = True
    r, g, b, _ = pixels[x, y]
    if is_bg(r, g, b):
        pixels[x, y] = (0, 0, 0, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        brightness = (r + g + b) / 3
        diff = max(r, g, b) - min(r, g, b)
        if brightness > 215 and diff < 30:
            pixels[x, y] = (0, 0, 0, 0)

bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

target_h = 48
scale = target_h / img.height
target_w = max(1, int(img.width * scale))
img = img.resize((target_w, target_h), Image.NEAREST)

img.save(dst, 'PNG')
print(f'Saved {dst}, size={img.size}')
