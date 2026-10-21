#!/usr/bin/env python3
"""Regenerate public/og-image.webp — Mandeep & Ritika style link preview."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-image.webp"
PHOTO = ROOT / "public" / "assets" / "images" / "bg" / "sh-photo.webp"

WIDTH, HEIGHT = 1200, 630
GOLD = (196, 168, 118)
NAVY = (48, 78, 112)
TAGLINE_BLUE = (68, 98, 128)

TEXT_COL_LEFT = 40
TEXT_COL_WIDTH = 488
PANEL_CORE_RIGHT = 548
PANEL_FADE_END = 640


def load_font(size: int, bold: bool = False, italic: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf"
        if italic
        else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
        if italic
        else "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    box_width: int,
    x_offset: int = 0,
) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = x_offset + (box_width - text_width) // 2
    draw.text((x, y), text, font=font, fill=fill)
    return y + text_height


def add_white_text_shade(overlay: Image.Image) -> None:
    """Opaque sky-white left shade + soft merge into photo (reference card)."""
    shade = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shade)

    draw.rectangle((0, 0, PANEL_CORE_RIGHT, HEIGHT), fill=(248, 251, 255, 255))
    draw.rectangle((0, 0, PANEL_CORE_RIGHT, HEIGHT), fill=(242, 248, 254, 248))

    fade_span = max(1, PANEL_FADE_END - PANEL_CORE_RIGHT)
    for x in range(PANEL_CORE_RIGHT, PANEL_FADE_END):
        t = (x - PANEL_CORE_RIGHT) / fade_span
        ease = (1 - t) ** 1.55
        alpha = int(248 * ease)
        draw.line(
            [(x, 0), (x, HEIGHT)],
            fill=(245, 250, 255, alpha),
            width=1,
        )

    overlay.alpha_composite(shade)


def draw_gold_swirls(overlay: Image.Image) -> None:
    deco = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(deco)
    d.arc((10, 8, 152, 150), start=208, end=330, fill=GOLD + (255,), width=2)
    d.arc((8, HEIGHT - 152, 150, HEIGHT - 10), start=28, end=152, fill=GOLD + (235,), width=2)
    for px, py in ((30, 24), (44, 16), (58, 26), (36, HEIGHT - 30), (50, HEIGHT - 22)):
        d.ellipse((px - 2, py - 2, px + 2, py + 2), fill=GOLD + (245,))
    overlay.alpha_composite(deco)


def build_from_photo() -> Image.Image:
    photo = Image.open(PHOTO).convert("RGBA")
    scale = max(WIDTH / photo.width, HEIGHT / photo.height)
    resized = photo.resize(
        (round(photo.width * scale), round(photo.height * scale)),
        Image.LANCZOS,
    )
    # Couple on the right; left side stays clear for text + white shade.
    left = max(0, (resized.width - WIDTH) // 2 + 165)
    top = (resized.height - HEIGHT) // 2
    canvas = resized.crop((left, top, left + WIDTH, top + HEIGHT))

    rgb = ImageEnhance.Color(canvas.convert("RGB")).enhance(0.96)
    canvas = rgb.convert("RGBA")

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    add_white_text_shade(overlay)
    draw_gold_swirls(overlay)

    draw = ImageDraw.Draw(overlay)
    y = 108

    label_font = load_font(20)
    name_font = load_font(54, bold=True)
    invite_font = load_font(24, bold=True)
    date_font = load_font(22, bold=True)
    tagline_font = load_font(27, italic=True)

    y = draw_centered(
        draw, "THE WEDDING OF", y, label_font, GOLD + (255,), TEXT_COL_WIDTH, TEXT_COL_LEFT
    )
    y += 16
    y = draw_centered(
        draw,
        "Shubham & Harshi",
        y,
        name_font,
        NAVY + (255,),
        TEXT_COL_WIDTH,
        TEXT_COL_LEFT,
    )
    y += 20
    y = draw_centered(
        draw,
        "WEDDING INVITATION",
        y,
        invite_font,
        NAVY + (255,),
        TEXT_COL_WIDTH,
        TEXT_COL_LEFT,
    )
    y += 14
    y = draw_centered(
        draw, "21 NOVEMBER 2026", y, date_font, GOLD + (255,), TEXT_COL_WIDTH, TEXT_COL_LEFT
    )
    y += 18
    draw_centered(
        draw,
        "With love, joy, and forever.",
        y,
        tagline_font,
        TAGLINE_BLUE + (255,),
        TEXT_COL_WIDTH,
        TEXT_COL_LEFT,
    )

    composed = Image.alpha_composite(canvas, overlay)
    return composed.convert("RGB").filter(
        ImageFilter.UnsharpMask(radius=0.85, percent=82, threshold=2)
    )


def main() -> None:
    image = build_from_photo()
    image.save(OUT, format="WEBP", quality=93)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
