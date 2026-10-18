#!/usr/bin/env python3
"""Regenerate public/og-image.webp — Mandeep & Ritika style link preview."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-image.webp"
PHOTO = ROOT / "public" / "assets" / "images" / "bg" / "mr-photo.webp"

WIDTH, HEIGHT = 1200, 630
GOLD = (196, 168, 118)
NAVY = (52, 82, 118)
SKY = (228, 238, 248)
TAGLINE_BLUE = (72, 102, 132)

TEXT_COL_LEFT = 36
TEXT_COL_WIDTH = 500


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


def add_merged_sky_wash(overlay: Image.Image) -> None:
    """Full-height sky-white gradient into photo (no hard panel box)."""
    wash = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(wash)
    fade_end = int(WIDTH * 0.56)

    for x in range(fade_end):
        t = x / fade_end
        ease = (1 - t) ** 1.75
        r = int(248 * ease + 220 * (1 - ease))
        g = int(246 * ease + 228 * (1 - ease))
        b = int(252 * ease + 238 * (1 - ease))
        a = int(248 * ease)
        draw.line([(x, 0), (x, HEIGHT)], fill=(r, g, b, a), width=1)

    wash = wash.filter(ImageFilter.GaussianBlur(radius=1.4))
    overlay.alpha_composite(wash)


def draw_gold_swirls(overlay: Image.Image) -> None:
    deco = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(deco)
    d.arc((8, 6, 148, 146), start=210, end=328, fill=GOLD + (255,), width=2)
    d.arc((18, 16, 128, 126), start=215, end=320, fill=GOLD + (180,), width=1)
    d.arc((6, HEIGHT - 148, 146, HEIGHT - 8), start=32, end=148, fill=GOLD + (230,), width=2)
    for px, py in ((28, 22), (42, 14), (56, 24), (34, HEIGHT - 28), (48, HEIGHT - 20)):
        d.ellipse((px - 2, py - 2, px + 2, py + 2), fill=GOLD + (240,))
    overlay.alpha_composite(deco)


def build_from_photo() -> Image.Image:
    photo = Image.open(PHOTO).convert("RGBA")
    scale = max(WIDTH / photo.width, HEIGHT / photo.height)
    resized = photo.resize(
        (round(photo.width * scale), round(photo.height * scale)),
        Image.LANCZOS,
    )
    left = max(0, (resized.width - WIDTH) // 2 + 125)
    top = (resized.height - HEIGHT) // 2
    canvas = resized.crop((left, top, left + WIDTH, top + HEIGHT))

    # Slightly soften photo so text area feels merged like reference.
    rgb = canvas.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(0.94)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.03)
    canvas = rgb.convert("RGBA")

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    add_merged_sky_wash(overlay)
    draw_gold_swirls(overlay)

    draw = ImageDraw.Draw(overlay)
    y = 118

    label_font = load_font(20)
    name_font = load_font(56, bold=True)
    invite_font = load_font(24, bold=True)
    date_font = load_font(22, bold=True)
    tagline_font = load_font(28, italic=True)

    y = draw_centered(
        draw, "THE WEDDING OF", y, label_font, GOLD + (255,), TEXT_COL_WIDTH, TEXT_COL_LEFT
    )
    y += 18
    y = draw_centered(
        draw,
        "Shubham & Harshi",
        y,
        name_font,
        NAVY + (255,),
        TEXT_COL_WIDTH,
        TEXT_COL_LEFT,
    )
    y += 22
    y = draw_centered(
        draw,
        "WEDDING INVITATION",
        y,
        invite_font,
        NAVY + (255,),
        TEXT_COL_WIDTH,
        TEXT_COL_LEFT,
    )
    y += 16
    y = draw_centered(
        draw, "21 NOVEMBER 2026", y, date_font, GOLD + (255,), TEXT_COL_WIDTH, TEXT_COL_LEFT
    )
    y += 20
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

    frame = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, 255))
    frame.paste(composed, (0, 0), composed)
    return frame.convert("RGB").filter(
        ImageFilter.UnsharpMask(radius=0.9, percent=85, threshold=2)
    )


def main() -> None:
    image = build_from_photo()
    image.save(OUT, format="WEBP", quality=93)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
