"""
Generate 20 unique level backgrounds for Bubble Gum Factory Adventure.
Super Mario Galaxy inspired macaron pink factory aesthetic.
"""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

OUT_DIR = r'c:\phpstudy_pro\WWW\mario\images\backgrounds'
W, H = 1280, 720


def lerp(a, b, t):
    return int(a + (b - a) * t)


def gradient_bg(colors, vertical=True):
    img = Image.new('RGB', (W, H))
    draw = ImageDraw.Draw(img)
    n = len(colors) - 1
    steps = H if vertical else W
    for i in range(steps):
        t = i / max(steps - 1, 1)
        seg = min(int(t * n), n - 1)
        lt = (t * n) - seg
        c1, c2 = colors[seg], colors[seg + 1]
        c = tuple(lerp(c1[j], c2[j], lt) for j in range(3))
        if vertical:
            draw.line([(0, i), (W, i)], fill=c)
        else:
            draw.line([(i, 0), (i, H)], fill=c)
    return img


def add_glow_circles(draw, palette, count=15):
    import random
    random.seed(42)
    for _ in range(count):
        x = random.randint(0, W)
        y = random.randint(0, H // 2)
        r = random.randint(30, 120)
        c = random.choice(palette)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)


def draw_pipe(draw, x, y, w, h, color='#50c878', rim='#70e898'):
    draw.rectangle([x, y, x + w, y + h], fill=color)
    draw.ellipse([x - 8, y - 12, x + w + 8, y + 12], fill=rim)
    draw.rectangle([x + 6, y + 20, x + 14, y + h - 10], fill='rgba')


def draw_bubble(draw, x, y, r, fill, outline=None):
    draw.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=outline or fill)


def draw_factory_silhouette(draw, base_y, color, layers=3):
    import random
    random.seed(7)
    x = 0
    while x < W + 200:
        lw = random.randint(80, 200)
        lh = random.randint(60, 180)
        draw.rectangle([x, base_y - lh, x + lw, base_y], fill=color)
        draw.rectangle([x + 10, base_y - lh - 40, x + lw - 10, base_y - lh], fill=tuple(min(255, c + 30) for c in color))
        x += lw - random.randint(10, 40)


def draw_clouds(draw, y_base, color):
    for i in range(8):
        cx = i * 180 + 50
        cy = y_base + (i % 3) * 20
        draw.ellipse([cx, cy, cx + 80, cy + 35], fill=color)
        draw.ellipse([cx + 30, cy - 15, cx + 110, cy + 30], fill=color)
        draw.ellipse([cx + 60, cy, cx + 140, cy + 35], fill=color)


def save(img, name):
    path = os.path.join(OUT_DIR, name)
    img.save(path, 'JPEG', quality=88)
    print('Saved', path)


def theme_01_bouncy():
    img = gradient_bg([(45, 27, 78), (255, 158, 207), (255, 214, 235), (255, 182, 217)])
    d = ImageDraw.Draw(img)
    draw_clouds(d, 80, (255, 240, 250))
    for i in range(12):
        bx = i * 110 + 30
        by = H - 120 - (i % 4) * 25
        draw_bubble(d, bx, by, 35 + (i % 3) * 10, (255, 182, 217, ), '#ff69b4')
    draw_factory_silhouette(d, H - 60, (200, 100, 160))
    d.rectangle([0, H - 60, W, H], fill=(255, 150, 200))
    save(img, 'bg01.jpg')


def theme_02_gel():
    img = gradient_bg([(60, 20, 80), (140, 80, 180), (200, 150, 220), (230, 200, 240)])
    d = ImageDraw.Draw(img)
    for y in range(H // 2, H, 8):
        d.rectangle([0, y, W, y + 6], fill=(180, 120, 210))
    for i in range(20):
        x = i * 70
        d.ellipse([x, H - 200, x + 90, H - 110], fill=(160, 100, 200))
    draw_factory_silhouette(d, H - 80, (100, 60, 130))
    save(img, 'bg02.jpg')


def theme_03_wind():
    img = gradient_bg([(30, 50, 100), (100, 180, 230), (180, 220, 255), (255, 200, 230)])
    d = ImageDraw.Draw(img)
    for i in range(6):
        px = 150 + i * 200
        d.rectangle([px, 200, px + 50, H - 100], fill=(80, 180, 220))
        d.ellipse([px - 10, 190, px + 60, 220], fill=(120, 210, 255))
        for j in range(5):
            d.line([(px + 25, 250 + j * 60), (px + 80 + j * 20, 270 + j * 60)], fill=(200, 240, 255), width=4)
    draw_clouds(d, 60, (240, 250, 255))
    save(img, 'bg03.jpg')


def theme_04_bubble_monster():
    img = gradient_bg([(80, 30, 90), (200, 100, 170), (255, 180, 220)])
    d = ImageDraw.Draw(img)
    for i in range(10):
        bx = 80 + i * 130
        by = 150 + (i % 3) * 80
        r = 50 + (i % 4) * 15
        draw_bubble(d, bx, by, r, (255, 200, 230), '#ff69b4')
        d.ellipse([bx - 8, by - 5, bx - 2, by + 8], fill=(50, 30, 60))
        d.ellipse([bx + 2, by - 5, bx + 8, by + 8], fill=(50, 30, 60))
    draw_factory_silhouette(d, H - 70, (160, 80, 130))
    save(img, 'bg04.jpg')


def theme_05_factory_layers():
    img = gradient_bg([(40, 30, 70), (120, 80, 140), (255, 170, 210)])
    d = ImageDraw.Draw(img)
    for layer in range(5):
        y = H - 100 - layer * 90
        c = (180 + layer * 15, 100 + layer * 10, 150 + layer * 10)
        for i in range(6):
            x = i * 220 + layer * 30
            d.rectangle([x, y, x + 180, y + 60], fill=c)
            d.rectangle([x + 20, y - 30, x + 60, y], fill=tuple(min(255, v + 40) for v in c))
    save(img, 'bg05.jpg')


def theme_06_melting():
    img = gradient_bg([(120, 40, 60), (255, 120, 150), (255, 200, 120), (255, 230, 180)])
    d = ImageDraw.Draw(img)
    for i in range(W // 40):
        x = i * 40
        drip = 30 + (i * 17) % 80
        d.polygon([(x, H - 80), (x + 20, H - 80 - drip), (x + 40, H - 80)], fill=(255, 100, 130))
    d.rectangle([0, H - 80, W, H], fill=(255, 150, 100))
    for i in range(8):
        d.ellipse([i * 160, H - 200, i * 160 + 100, H - 100], fill=(255, 180, 140))
    save(img, 'bg06.jpg')


def theme_07_galaxy():
    img = gradient_bg([(10, 10, 40), (60, 30, 100), (255, 120, 80), (255, 200, 100)])
    d = ImageDraw.Draw(img)
    import random
    random.seed(99)
    for _ in range(120):
        x, y = random.randint(0, W), random.randint(0, H // 2)
        s = random.randint(1, 3)
        d.rectangle([x, y, x + s, y + s], fill=(255, 255, 200))
    d.ellipse([W // 2 - 120, H // 3 - 80, W // 2 + 120, H // 3 + 80], fill=(255, 180, 60))
    d.ellipse([W // 2 - 80, H // 3 - 50, W // 2 + 80, H // 3 + 50], fill=(255, 220, 100))
    save(img, 'bg07.jpg')


def theme_08_moving_platforms():
    img = gradient_bg([(50, 40, 80), (150, 100, 170), (255, 190, 220)])
    d = ImageDraw.Draw(img)
    for i in range(5):
        y = 200 + i * 80
        d.rectangle([100 + i * 50, y, W - 100, y + 25], fill=(200, 130, 180))
        d.rectangle([100 + i * 50, y - 8, W - 100, y], fill=(230, 170, 210))
    draw_factory_silhouette(d, H - 60, (130, 70, 120))
    for i in range(4):
        d.rectangle([300 + i * 250, H - 250, 330 + i * 250, H - 60], fill=(80, 200, 120))
    save(img, 'bg08.jpg')


def theme_09_rest():
    img = gradient_bg([(255, 220, 240), (255, 200, 230), (255, 240, 250), (200, 240, 255)])
    d = ImageDraw.Draw(img)
    draw_clouds(d, 100, (255, 255, 255))
    d.rounded_rectangle([W // 2 - 200, H - 280, W // 2 + 200, H - 80], radius=30, fill=(255, 180, 210))
    d.rounded_rectangle([W // 2 - 180, H - 260, W // 2 + 180, H - 100], radius=20, fill=(255, 210, 230))
    for i in range(5):
        draw_bubble(d, 200 + i * 200, H - 150, 20, (255, 230, 245))
    save(img, 'bg09.jpg')


def theme_10_rollers():
    img = gradient_bg([(60, 30, 70), (180, 80, 140), (255, 160, 200)])
    d = ImageDraw.Draw(img)
    for i in range(7):
        cx = 100 + i * 170
        r = 55
        d.ellipse([cx - r, H - 180, cx + r, H - 70], fill=(255, 150, 190), outline=(255, 80, 150))
        d.line([(cx - r, H - 125), (cx + r, H - 125)], fill=(255, 100, 160), width=3)
        d.line([(cx, H - 180), (cx, H - 70)], fill=(255, 100, 160), width=3)
    draw_factory_silhouette(d, H - 60, (140, 60, 110))
    save(img, 'bg10.jpg')


def theme_11_fake_platform():
    img = gradient_bg([(30, 20, 50), (80, 50, 90), (160, 100, 150), (220, 160, 200)])
    d = ImageDraw.Draw(img)
    for i in range(8):
        x = i * 160 + 40
        y = 250 + (i % 3) * 60
        d.rectangle([x, y, x + 100, y + 20], fill=(200, 140, 180))
        d.rectangle([x + 10, y - 40, x + 90, y], fill=(180, 120, 160))
    d.rectangle([0, 0, W, H // 3], fill=(20, 15, 35))
    save(img, 'bg11.jpg')


def theme_12_elevator():
    img = gradient_bg([(40, 35, 70), (100, 80, 140), (200, 150, 200)])
    d = ImageDraw.Draw(img)
    for i in range(4):
        x = 150 + i * 280
        d.rectangle([x, 80, x + 80, H - 60], fill=(90, 70, 110))
        d.rectangle([x + 10, 120, x + 70, 200], fill=(255, 180, 210))
        d.rectangle([x + 10, 350, x + 70, 430], fill=(255, 180, 210))
    draw_factory_silhouette(d, H - 50, (120, 80, 130))
    save(img, 'bg12.jpg')


def theme_13_pipe_moved():
    img = gradient_bg([(30, 60, 40), (60, 120, 80), (150, 200, 170), (255, 200, 220)])
    d = ImageDraw.Draw(img)
    for i in range(10):
        px = i * 130
        ph = 150 + (i % 4) * 60
        d.rectangle([px, H - ph, px + 45, H - 60], fill=(60, 180, 100))
        d.ellipse([px - 5, H - ph - 15, px + 50, H - ph + 15], fill=(80, 210, 120))
    draw_factory_silhouette(d, H - 55, (80, 140, 100))
    save(img, 'bg13.jpg')


def theme_14_powerup():
    img = gradient_bg([(20, 10, 50), (80, 40, 120), (255, 150, 100), (255, 220, 150)])
    d = ImageDraw.Draw(img)
    import random
    random.seed(55)
    colors = [(255, 100, 180), (255, 200, 80), (180, 100, 255), (100, 200, 255)]
    for _ in range(40):
        x, y = random.randint(0, W), random.randint(H // 3, H - 100)
        c = random.choice(colors)
        d.ellipse([x - 15, y - 15, x + 15, y + 15], fill=c)
    d.ellipse([W // 2 - 100, 100, W // 2 + 100, 250], fill=(255, 200, 80))
    save(img, 'bg14.jpg')


def theme_15_spikes():
    img = gradient_bg([(50, 20, 40), (120, 40, 60), (200, 80, 100), (255, 150, 170)])
    d = ImageDraw.Draw(img)
    for i in range(W // 25):
        x = i * 25
        d.polygon([(x, H - 80), (x + 12, H - 140), (x + 25, H - 80)], fill=(200, 50, 80))
    d.rectangle([0, H - 80, W, H], fill=(180, 60, 90))
    draw_factory_silhouette(d, H - 80, (100, 40, 60))
    save(img, 'bg15.jpg')


def theme_16_low_grav():
    img = gradient_bg([(15, 10, 40), (60, 40, 100), (150, 100, 180), (255, 200, 240)])
    d = ImageDraw.Draw(img)
    import random
    random.seed(66)
    for _ in range(25):
        x, y = random.randint(0, W), random.randint(50, H - 150)
        r = random.randint(15, 45)
        draw_bubble(d, x, y, r, (255, 200, 230))
    for i in range(6):
        d.rectangle([i * 220, H - 300 - i * 20, i * 220 + 150, H - 250], fill=(180, 130, 200))
    save(img, 'bg16.jpg')


def theme_17_switches():
    img = gradient_bg([(35, 30, 60), (90, 70, 120), (180, 130, 190), (255, 190, 220)])
    d = ImageDraw.Draw(img)
    for i in range(8):
        sx = 100 + i * 150
        d.ellipse([sx, H - 200, sx + 40, H - 160], fill=(0, 220, 120) if i % 2 == 0 else (100, 100, 110))
        d.rectangle([sx + 15, H - 160, sx + 25, H - 100], fill=(150, 150, 160))
    draw_factory_silhouette(d, H - 70, (110, 70, 130))
    save(img, 'bg17.jpg')


def theme_18_chase():
    img = gradient_bg([(40, 20, 60), (180, 60, 100), (255, 140, 80), (255, 200, 120)])
    d = ImageDraw.Draw(img)
    for i in range(12):
        bx = 50 + i * 100
        r = 40 + (i % 3) * 12
        draw_bubble(d, bx, 180 + (i % 4) * 50, r, (255, 180, 200, ), '#ff4080')
    d.ellipse([W - 200, 80, W - 40, 200], fill=(255, 220, 100))
    save(img, 'bg18.jpg')


def theme_19_ultimate():
    img = gradient_bg([(30, 15, 50), (100, 50, 100), (200, 100, 160), (255, 180, 100), (255, 220, 180)])
    d = ImageDraw.Draw(img)
    draw_factory_silhouette(d, H - 60, (130, 60, 120))
    for i in range(5):
        d.rectangle([i * 260, 150, i * 260 + 200, 170], fill=(255, 150, 180))
    for i in range(8):
        draw_bubble(d, 80 + i * 150, 100 + (i % 3) * 40, 25, (255, 200, 220))
    d.rectangle([0, H - 60, W, H], fill=(255, 140, 180))
    save(img, 'bg19.jpg')


def theme_20_summit():
    img = gradient_bg([(255, 200, 220), (255, 180, 200), (200, 220, 255), (150, 200, 255)])
    d = ImageDraw.Draw(img)
    draw_clouds(d, 50, (255, 255, 255))
    # Castle on hill
    cx = W // 2
    d.polygon([(cx, 120), (cx - 200, H - 100), (cx + 200, H - 100)], fill=(100, 200, 120))
    d.rectangle([cx - 120, H - 350, cx + 120, H - 100], fill=(240, 240, 250))
    for i in range(-1, 2):
        d.rectangle([cx + i * 80 - 30, H - 420, cx + i * 80 + 30, H - 350], fill=(240, 240, 250))
        d.polygon([(cx + i * 80 - 40, H - 420), (cx + i * 80, H - 460), (cx + i * 80 + 40, H - 420)], fill=(255, 120, 160))
    d.polygon([(cx - 40, H - 460), (cx, H - 520), (cx + 40, H - 460)], fill=(255, 100, 150))
    d.rectangle([0, H - 100, W, H], fill=(255, 180, 210))
    save(img, 'bg20.jpg')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    themes = [
        theme_01_bouncy, theme_02_gel, theme_03_wind, theme_04_bubble_monster,
        theme_05_factory_layers, theme_06_melting, theme_07_galaxy, theme_08_moving_platforms,
        theme_09_rest, theme_10_rollers, theme_11_fake_platform, theme_12_elevator,
        theme_13_pipe_moved, theme_14_powerup, theme_15_spikes, theme_16_low_grav,
        theme_17_switches, theme_18_chase, theme_19_ultimate, theme_20_summit,
    ]
    for fn in themes:
        fn()


if __name__ == '__main__':
    main()
