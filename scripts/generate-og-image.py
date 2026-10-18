#!/usr/bin/env python3
"""Regenerate public/og-image.webp — link preview art for WhatsApp / social."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-image.webp"
PHOTO = ROOT / "public" / "assets" / "images" / "bg" / "mr-photo.webp"

WIDTH, HEIGHT = 1200, 630
GOLD = (210, 178, 118)
GOLD_DEEP = (176, 142, 88)
NAVY = (42, 68, 98)
CREAM = (255, 250, 244)
WINE = (108, 38, 62)
WINE_SOFT = (128, 52, 78)

TEXT_LEFT = 44
TEXT_WIDTH = 500


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
    stroke: int = 0,
    stroke_fill: tuple[int, int, int, int] | None = None,
) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = x_offset + (box_width - text_width) // 2
    draw.text(
        (x, y),
        text,
        font=font,
        fill=fill,
        stroke_width=stroke,
        stroke_fill=stroke_fill,
    )
    return y + text_height


def add_photo_scrim() -> Image.Image:
    """Left-to-right cream wash fading into the photo — no solid white panel."""
    scrim = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(scrim)
    fade_end = int(WIDTH * 0.62)

    for x in range(fade_end):
        t = x / fade_end
        ease = (1 - t) ** 2.15
        r = int(248 * ease + 32 * (1 - ease))
        g = int(242 * ease + 40 * (1 - ease))
        b = int(232 * ease + 52 * (1 - ease))
        a = int(198 * ease)
        draw.line([(x, 0), (x, HEIGHT)], fill=(r, g, b, a), width=1)

    for x in range(int(WIDTH * 0.35)):
        t = 1 - x / (WIDTH * 0.35)
        a = int(48 * t)
        draw.line([(x, 0), (x, HEIGHT)], fill=(255, 252, 248, a), width=1)

    return scrim.filter(ImageFilter.GaussianBlur(radius=1.2))


def add_edge_vignette(base: Image.Image) -> Image.Image:
    vignette = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(vignette)
    for i in range(18):
        alpha = int(6 + i * 2.8)
        inset = i * 6
        draw.rounded_rectangle(
            (inset, inset, WIDTH - inset, HEIGHT - inset),
            radius=max(6, 20 - i),
            outline=(18, 28, 48, min(200, alpha)),
            width=2,
        )
    return Image.alpha_composite(base, vignette)


def draw_outer_frame(image: Image.Image) -> Image.Image:
    frame = image.copy()
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((4, 4, WIDTH - 4, HEIGHT - 4), radius=18, outline=GOLD_DEEP + (220,), width=3)
    draw.rounded_rectangle((9, 9, WIDTH - 9, HEIGHT - 9), radius=14, outline=CREAM + (120,), width=1)
    return frame


def build_from_photo() -> Image.Image:
    photo = Image.open(PHOTO).convert("RGBA")
    scale = max(WIDTH / photo.width, HEIGHT / photo.height)
    resized = photo.resize(
        (round(photo.width * scale), round(photo.height * scale)),
        Image.LANCZOS,
    )
    left = max(0, (resized.width - WIDTH) // 2 - 120)
    top = (resized.height - HEIGHT) // 2
    canvas = resized.crop((left, top, left + WIDTH, top + HEIGHT))
    canvas = add_edge_vignette(canvas)

    scrim = add_photo_scrim()
    canvas = Image.alpha_composite(canvas, scrim)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    accent = ImageDraw.Draw(overlay)
    accent.line((TEXT_LEFT + 8, 36, TEXT_LEFT + 8, HEIGHT - 36), fill=GOLD + (160,), width=2)
    accent.line((TEXT_LEFT + 8, 36, TEXT_LEFT + 88, 36), fill=GOLD + (180,), width=2)

    draw = ImageDraw.Draw(overlay)
    shadow = (24, 36, 52, 100)
    y = 52

    label_font = load_font(24)
    name_font = load_font(76, bold=True)
    amp_font = load_font(40, italic=True)
    invite_font = load_font(28, bold=True)
    date_font = load_font(36, bold=True)
    tagline_font = load_font(32, italic=True)

    y = draw_centered(
        draw,
        "THE WEDDING OF",
        y,
        label_font,
        GOLD,
        TEXT_WIDTH,
        TEXT_LEFT,
        stroke=1,
        stroke_fill=shadow,
    )
    y += 14
    y = draw_centered(
        draw,
        "Shubham",
        y,
        name_font,
        NAVY,
        TEXT_WIDTH,
        TEXT_LEFT,
        stroke=2,
        stroke_fill=shadow,
    )
    y += 4
    y = draw_centered(
        draw,
        "&",
        y,
        amp_font,
        GOLD_DEEP,
        TEXT_WIDTH,
        TEXT_LEFT,
        stroke=1,
        stroke_fill=shadow,
    )
    y += 2
    y = draw_centered(
        draw,
        "Harshi",
        y,
        name_font,
        NAVY,
        TEXT_WIDTH,
        TEXT_LEFT,
        stroke=2,
        stroke_fill=shadow,
    )
    y += 20
    draw.line(
        (TEXT_LEFT + 24, y, TEXT_LEFT + TEXT_WIDTH - 24, y),
        fill=GOLD + (200,),
        width=2,
    )
    y += 16
    y = draw_centered(
        draw,
        "WEDDING INVITATION",
        y,
        invite_font,
        WINE,
        TEXT_WIDTH,
        TEXT_LEFT,
        stroke=1,
        stroke_fill=shadow,
    )
    y += 12
    y = draw_centered(
        draw,
        "21 NOVEMBER 2026",
        y,
        date_font,
        GOLD,
        TEXT_WIDTH,
        TEXT_LEFT,
        stroke=2,
        stroke_fill=shadow,
    )
    y += 14
    draw_centered(
        draw,
        "With love, joy, and forever.",
        y,
        tagline_font,
        WINE_SOFT,
        TEXT_WIDTH,
        TEXT_LEFT,
        stroke=1,
        stroke_fill=shadow,
    )

    composed = Image.alpha_composite(canvas, overlay)
    composed = draw_outer_frame(composed)
    return composed.filter(ImageFilter.UnsharpMask(radius=1.1, percent=90, threshold=2))


def main() -> None:
    image = build_from_photo()
    image.convert("RGB").save(OUT, format="WEBP", quality=93)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
