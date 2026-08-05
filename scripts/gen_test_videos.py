import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 480, 270
FPS = 24
DURATION = 4  # seconds

def make_clip(path, bg_color, lines):
    frames = []
    total = FPS * DURATION
    for i in range(total):
        t = i / FPS
        pulse = 0.85 + 0.15 * abs(((t * 2) % 2) - 1)
        color = tuple(int(c * pulse) for c in bg_color)
        img = Image.new("RGB", (W, H), color)
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 22)
            font_small = ImageFont.truetype("arial.ttf", 14)
        except Exception:
            font = ImageFont.load_default()
            font_small = font
        y = H // 2 - (len(lines) * 26) // 2
        for j, line in enumerate(lines):
            f = font if j == 0 else font_small
            bbox = draw.textbbox((0, 0), line, font=f)
            tw = bbox[2] - bbox[0]
            draw.text(((W - tw) / 2, y), line, fill=(255, 255, 255), font=f)
            y += 30
        draw.text((10, H - 24), f"{t:0.1f}s / test placeholder", fill=(255, 255, 255, 180), font=font_small)
        frames.append(np.array(img))
    imageio.mimwrite(path, frames, fps=FPS, quality=6, macro_block_size=None)
    print("wrote", path, os.path.getsize(path), "bytes")

if __name__ == "__main__":
    import sys
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)

    make_clip(os.path.join(out_dir, "demo-communiquer.mp4"), (181, 101, 74), ["Communiquer avec son ado", "Video de presentation (test)"])
    make_clip(os.path.join(out_dir, "demo-classe.mp4"), (100, 130, 160), ["Gerer une classe difficile", "Video de presentation (test)"])
    make_clip(os.path.join(out_dir, "demo-coaching.mp4"), (150, 110, 160), ["Coaching de vie general", "Video de presentation (test)"])
    make_clip(os.path.join(out_dir, "lesson-1.mp4"), (77, 124, 95), ["Lecon 1", "Contenu video (test)"])
    make_clip(os.path.join(out_dir, "lesson-2.mp4"), (77, 124, 95), ["Lecon 2", "Contenu video (test)"])
