#!/usr/bin/env python3
"""Regenerate public/og-image.webp — link preview art for WhatsApp / social."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-image.webp"
PHOTO = ROOT / "public" / "assets" / "images" / "bg" / "mr-photo.webp"

WIDTH, HEIGHT = 1200, 630
GOLD = (196, 168, 118)
GOLD_LIGHT = (232, 210, 168)
BLUE = (58, 92, 128)
WINE = (116, 41, 73)
WINE_SOFT = (134, 58, 88)
CREAM = (255, 252, 248)


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


def add_edge_vignette(base: Image.Image) -> Image.Image:
    vignette = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(vignette)
    for i in range(28):
        alpha = int(8 + i * 3.2)
        inset = i * 5
        draw.rounded_rectangle(
            (inset, inset, WIDTH - inset, HEIGHT - inset),
            radius=max(4, 22 - i),
            outline=(24, 36, 58, min(255, alpha)),
            width=2,
        )
    return Image.alpha_composite(base, vignette)


def draw_frosted_panel(
    overlay: Image.Image,
    panel_left: int,
    panel_top: int,
    panel_right: int,
    panel_bottom: int,
    radius: int = 22,
) -> None:
    panel = Image.new("RGBA", overlay.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(panel)

    shadow_offset = 6
    draw.rounded_rectangle(
        (
            panel_left + shadow_offset,
            panel_top + shadow_offset,
            panel_right + shadow_offset,
            panel_bottom + shadow_offset,
        ),
        radius=radius + 2,
        fill=(40, 52, 72, 72),
    )

    for layer, alpha in enumerate((235, 220, 200), start=0):
        inset = layer * 2
        draw.rounded_rectangle(
            (
                panel_left + inset,
                panel_top + inset,
                panel_right - inset,
                panel_bottom - inset,
            ),
            radius=max(8, radius - inset),
            fill=(248, 250, 252, alpha),
        )

    draw.rounded_rectangle(
        (panel_left, panel_top, panel_right, panel_bottom),
        radius=radius,
        fill=(255, 255, 255, 168),
    )

    draw.rounded_rectangle(
        (panel_left, panel_top, panel_right, panel_bottom),
        radius=radius,
        outline=GOLD_LIGHT + (255,),
        width=3,
    )
    draw.rounded_rectangle(
        (panel_left + 5, panel_top + 5, panel_right - 5, panel_bottom - 5),
        radius=max(6, radius - 4),
        outline=(255, 255, 255, 200),
        width=1,
    )
    draw.rounded_rectangle(
        (panel_left + 2, panel_top + 2, panel_right - 2, panel_bottom - 2),
        radius=max(8, radius - 2),
        outline=WINE + (90,),
        width=1,
    )

    accent = ImageDraw.Draw(panel)
    accent.line(
        (panel_left + 28, panel_top + 28, panel_left + 118, panel_top + 28),
        fill=GOLD,
        width=2,
    )
    accent.line(
        (panel_left + 28, panel_top + 28, panel_left + 28, panel_top + 118),
        fill=GOLD,
        width=2,
    )
    accent.ellipse(
        (panel_left + 22, panel_top + 22, panel_left + 34, panel_top + 34),
        outline=GOLD,
        width=2,
    )
    accent.ellipse(
        (panel_right - 34, panel_bottom - 34, panel_right - 22, panel_bottom - 22),
        outline=GOLD_LIGHT,
        width=2,
    )

    overlay.alpha_composite(panel)


def draw_outer_frame(image: Image.Image) -> Image.Image:
    frame = image.copy()
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((5, 5, WIDTH - 5, HEIGHT - 5), radius=20, outline=GOLD, width=4)
    draw.rounded_rectangle((11, 11, WIDTH - 11, HEIGHT - 11), radius=16, outline=CREAM + (220,), width=2)
    draw.rounded_rectangle((16, 16, WIDTH - 16, HEIGHT - 16), radius=14, outline=WINE + (140,), width=1)
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

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    panel_left = 32
    panel_top = 28
    panel_right = 478
    panel_bottom = HEIGHT - 28
    draw_frosted_panel(overlay, panel_left, panel_top, panel_right, panel_bottom, radius=24)

    draw = ImageDraw.Draw(overlay)
    text_left = panel_left + 36
    text_width = panel_right - panel_left - 72
    y = panel_top + 52

    label_font = load_font(19)
    name_font = load_font(60, bold=True)
    amp_font = load_font(32, italic=True)
    invite_font = load_font(21, bold=True)
    date_font = load_font(26, bold=True)
    tagline_font = load_font(28, italic=True)

    y = draw_centered(draw, "THE WEDDING OF", y, label_font, GOLD, text_width, text_left)
    y += 16
    y = draw_centered(draw, "Shubham", y, name_font, BLUE, text_width, text_left)
    y += 6
    y = draw_centered(draw, "&", y, amp_font, GOLD, text_width, text_left)
    y += 4
    y = draw_centered(draw, "Harshi", y, name_font, BLUE, text_width, text_left)
    y += 22
    draw.line(
        (text_left + 40, y, text_left + text_width - 40, y),
        fill=GOLD_LIGHT + (200,),
        width=1,
    )
    y += 14
    y = draw_centered(draw, "WEDDING INVITATION", y, invite_font, WINE, text_width, text_left)
    y += 14
    y = draw_centered(draw, "21 NOVEMBER 2026", y, date_font, GOLD, text_width, text_left)
    y += 16
    draw_centered(
        draw,
        "With love, joy, and forever.",
        y,
        tagline_font,
        WINE_SOFT,
        text_width,
        text_left,
    )

    composed = Image.alpha_composite(canvas, overlay)
    composed = draw_outer_frame(composed)
    return composed.filter(ImageFilter.UnsharpMask(radius=1.2, percent=85, threshold=2))


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


def main() -> None:
    image = build_from_photo()
    image.convert("RGB").save(OUT, format="WEBP", quality=93)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
