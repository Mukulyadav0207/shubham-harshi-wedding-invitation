#!/usr/bin/env python3
"""Regenerate public/og-image.webp with correct name/ampersand layout."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-image.webp"
PHOTO = ROOT / "public" / "assets" / "images" / "bg" / "mr-photo.webp"

WIDTH, HEIGHT = 1200, 630
GOLD = (196, 168, 118)
BLUE = (58, 92, 128)
WINE = (116, 41, 73)
PANEL = (228, 238, 243, 214)


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


def fit_cover(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.LANCZOS,
    )
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    box_width: int,
    x_offset: int = 0,
) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = x_offset + (box_width - text_width) // 2
    draw.text((x, y), text, font=font, fill=fill)
    return y + text_height


def load_original() -> Image.Image | None:
    try:
        raw = subprocess.check_output(
            ["git", "show", "2e52916:public/og-image.webp"],
            cwd=ROOT,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    from io import BytesIO

    return Image.open(BytesIO(raw)).convert("RGBA")


def sample_panel_color(image: Image.Image) -> tuple[int, int, int]:
    pixels = [
        image.getpixel((96, 120)),
        image.getpixel((118, 420)),
        image.getpixel((360, 250)),
    ]
    return tuple(sum(channel[i] for channel in pixels) // len(pixels) for i in range(3))


def patch_names_on_original(image: Image.Image) -> Image.Image:
    canvas = image.copy()
    panel_color = sample_panel_color(canvas)

    cover = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    cover_draw = ImageDraw.Draw(cover)
    panel_left = 64
    panel_right = 438
    cover_draw.rectangle((panel_left, 154, panel_right, 372), fill=panel_color + (255,))
    canvas = Image.alpha_composite(canvas, cover)

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    text_left = panel_left + 18
    text_width = panel_right - panel_left - 36

    name_font = load_font(58, bold=True)
    amp_font = load_font(30, italic=True)
    y = 158
    y = draw_centered(draw, "Shubham", y, name_font, BLUE, text_width, text_left)
    y += 12
    y = draw_centered(draw, "&", y, amp_font, GOLD, text_width, text_left)
    y += 6
    draw_centered(draw, "Harshi", y, name_font, BLUE, text_width, text_left)

    return Image.alpha_composite(canvas, overlay)


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

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(overlay)
    panel_left = 34
    panel_top = 34
    panel_right = 470
    panel_bottom = HEIGHT - 34
    panel_draw.rounded_rectangle(
        (panel_left, panel_top, panel_right, panel_bottom),
        radius=18,
        fill=PANEL,
    )

    draw = ImageDraw.Draw(overlay)
    text_left = panel_left + 34
    text_width = panel_right - panel_left - 68
    y = panel_top + 54

    label_font = load_font(20)
    name_font = load_font(62, bold=True)
    amp_font = load_font(34, italic=True)
    invite_font = load_font(22, bold=True)
    date_font = load_font(24, bold=True)
    tagline_font = load_font(30, italic=True)

    y = draw_centered(draw, "THE WEDDING OF", y, label_font, GOLD, text_width, text_left)
    y += 18
    y = draw_centered(draw, "Shubham", y, name_font, BLUE, text_width, text_left)
    y += 8
    y = draw_centered(draw, "&", y, amp_font, GOLD, text_width, text_left)
    y += 6
    y = draw_centered(draw, "Harshi", y, name_font, BLUE, text_width, text_left)
    y += 24
    y = draw_centered(draw, "WEDDING INVITATION", y, invite_font, WINE, text_width, text_left)
    y += 16
    y = draw_centered(draw, "21 NOVEMBER 2026", y, date_font, GOLD, text_width, text_left)
    y += 18
    draw_centered(
        draw,
        "With love, joy, and forever.",
        y,
        tagline_font,
        WINE,
        text_width,
        text_left,
    )

    accent = ImageDraw.Draw(overlay)
    accent.line((panel_left + 24, panel_top + 24, panel_left + 110, panel_top + 24), fill=GOLD, width=2)
    accent.line((panel_left + 24, panel_top + 24, panel_left + 24, panel_top + 110), fill=GOLD, width=2)
    accent.ellipse((panel_left + 18, panel_top + 18, panel_left + 30, panel_top + 30), outline=GOLD, width=2)

    composed = Image.alpha_composite(canvas, overlay)

    border = ImageDraw.Draw(composed)
    border.rounded_rectangle((10, 10, WIDTH - 10, HEIGHT - 10), radius=16, outline=GOLD, width=2)
    return composed


def main() -> None:
    original = load_original()
    image = patch_names_on_original(original) if original is not None else build_from_photo()
    image.convert("RGB").save(OUT, format="WEBP", quality=92)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
