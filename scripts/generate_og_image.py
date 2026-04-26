"""Generate the social-share preview at public/og-default.png.

Targets the same Bloomberg-terminal palette used across the site:

  bg     #0F0E0C
  rule   #1A1816
  ink    #F2EDE4
  ink-2  #C9C1B3
  ink-3  #8A8276
  ink-4  #5A5348
  accent #DA7756

Custom web fonts (JetBrains Mono, Instrument Serif, Inter) aren't bundled
with Pillow, so we walk a list of common system TTF/TTC paths and pick
the best available substitute for each role. The image still looks
restrained and professional even when only DejaVu/Helvetica/Times are
present.
"""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = "public/og-default.png"
W, H = 1200, 630

BG = (15, 14, 12)        # #0F0E0C
RULE = (26, 24, 22)      # #1A1816
INK = (242, 237, 228)    # #F2EDE4
INK2 = (201, 193, 179)   # #C9C1B3
INK3 = (138, 130, 118)   # #8A8276
INK4 = (90, 83, 72)      # #5A5348
ACCENT = (218, 119, 86)  # #DA7756


# Font candidates, in preference order. First file that exists on disk
# is used. macOS (.ttc) and DejaVu (Linux) are both covered.
SANS_CANDIDATES = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/SFNSDisplay.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial.ttf",
]
SERIF_CANDIDATES = [
    "/Library/Fonts/Times New Roman.ttf",
    "/System/Library/Fonts/Times.ttc",
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
]
MONO_CANDIDATES = [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/SFNSMono.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/Library/Fonts/Courier New.ttf",
]


def _load(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    # Fallback: Pillow's bitmap default. Tiny but never breaks.
    return ImageFont.load_default()


def _text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def main() -> int:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Subtle 12-column vertical grid in #1A1816, very low contrast.
    for i in range(1, 12):
        x = i * (W / 12)
        draw.line([(x, 0), (x, H)], fill=RULE, width=1)

    # Outer 1px frame in #1A1816 to define the canvas edge.
    draw.rectangle([(0, 0), (W - 1, H - 1)], outline=RULE, width=1)

    # Top-left terracotta accent bar (4 px tall × 200 px wide), at the
    # margin we use for the rest of the layout.
    margin_x = 80
    margin_top = 96
    draw.rectangle(
        [(margin_x, margin_top), (margin_x + 200, margin_top + 4)],
        fill=ACCENT,
    )

    # Main name — large sans, slightly compressed letter-spacing visually
    # achieved by drawing a single big string.
    title_font = _load(SANS_CANDIDATES, 96)
    subtitle_font = _load(SERIF_CANDIDATES, 44)
    body_font = _load(MONO_CANDIDATES, 22)
    foot_font = _load(MONO_CANDIDATES, 18)

    y = margin_top + 28
    draw.text((margin_x, y), "SHRI ARRAVINDHAR", font=title_font, fill=INK)
    _, t_h = _text_size(draw, "SHRI ARRAVINDHAR", title_font)
    y += t_h + 16

    # Italic subtitle in serif. Pillow doesn't synthesize italic from a
    # roman; we just use the serif candidate and accept its native style.
    draw.text((margin_x, y), "Data & BI Portfolio", font=subtitle_font, fill=INK2)
    _, s_h = _text_size(draw, "Data & BI Portfolio", subtitle_font)
    y += s_h + 32

    draw.text(
        (margin_x, y),
        "Energy Security  ·  Defense Intelligence  ·  Investment Portfolio",
        font=body_font,
        fill=INK3,
    )

    # Bottom-left URL.
    foot_y = H - 56
    draw.text(
        (margin_x, foot_y),
        "arravindportfolio.tech",
        font=foot_font,
        fill=INK4,
    )

    # Bottom-right "● FABRIC · DAILY" pill.
    badge_text = "● FABRIC · DAILY"
    bw, bh = _text_size(draw, badge_text, foot_font)
    draw.text(
        (W - margin_x - bw, foot_y),
        badge_text,
        font=foot_font,
        fill=ACCENT,
    )

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({W}x{H})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
