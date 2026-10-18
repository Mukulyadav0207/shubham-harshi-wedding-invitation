#!/usr/bin/env python3
"""Regenerate public/og-image.webp — link preview art for WhatsApp / social."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-image.webp"
PHOTO = ROOT / "public" / "assets" / "images" / "bg" / "mr-photo.webp"

WIDTH, HEIGHT = 1200, 630
GOLD = (196, 168, 118)
GOLD_LIGHT = (228, 204, 158)
NAVY = (48, 78, 112)
SKY_PANEL = (236, 244, 252)
WINE = (108, 38, 62)
WINE_SOFT = (124, 48, 72)

PANEL_LEFT = 24
PANEL_TOP = 22
PANEL_RIGHT = 542
PANEL_BOTTOM = HEIGHT - 22
TEXT_LEFT = 48
TEXT_WIDTH = PANEL_RIGHT - PANEL_LEFT - 48


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


def draw_soft_panel(overlay: Image.Image) -> None:
    """Light frosted panel (reference style) with soft fade into the photo."""
    panel = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(panel)

    draw.rounded_rectangle(
        (PANEL_LEFT, PANEL_TOP, PANEL_RIGHT, PANEL_BOTTOM),
        radius=22,
        fill=SKY_PANEL + (235,),
    )

    fade_w = 96
    for i in range(fade_w):
        x = PANEL_RIGHT - fade_w + i
        t = i / fade_w
        alpha = int(235 * (1 - t) ** 1.6)
        draw.line(
            [(x, PANEL_TOP), (x, PANEL_BOTTOM)],
            fill=SKY_PANEL + (alpha,),
            width=1,
        )

    draw.rounded_rectangle(
        (PANEL_LEFT, PANEL_TOP, PANEL_RIGHT, PANEL_BOTTOM),
        radius=22,
        outline=GOLD_LIGHT + (200,),
        width=2,
    )
    draw.rounded_rectangle(
        (PANEL_LEFT + 4, PANEL_TOP + 4, PANEL_RIGHT - 4, PANEL_BOTTOM - 4),
        radius=18,
        outline=(255, 255, 255, 160),
        width=1,
    )

    accent = ImageDraw.Draw(panel)
    accent.arc(
        (PANEL_LEFT - 6, PANEL_TOP - 6, PANEL_LEFT + 118, PANEL_TOP + 118),
        start=200,
        end=310,
        fill=GOLD,
        width=2,
    )
    accent.arc(
        (PANEL_LEFT - 10, PANEL_BOTTOM - 118, PANEL_LEFT + 108, PANEL_BOTTOM + 6),
        start=30,
        end=140,
        fill=GOLD_LIGHT + (220,),
        width=2,
    )
    for px, py in (
        (PANEL_LEFT + 18, PANEL_TOP + 16),
        (PANEL_LEFT + 32, PANEL_TOP + 10),
        (PANEL_LEFT + 46, PANEL_TOP + 18),
        (PANEL_LEFT + 22, PANEL_BOTTOM - 20),
        (PANEL_LEFT + 38, PANEL_BOTTOM - 14),
    ):
        accent.ellipse((px - 3, py - 3, px + 3, py + 3), fill=GOLD + (230,))

    panel = panel.filter(ImageFilter.GaussianBlur(radius=0.6))
    overlay.alpha_composite(panel)


def draw_outer_frame(image: Image.Image) -> Image.Image:
    frame = image.copy()
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((5, 5, WIDTH - 5, HEIGHT - 5), radius=16, outline=GOLD + (210,), width=2)
    return frame


def build_from_photo() -> Image.Image:
    photo = Image.open(PHOTO).convert("RGBA")
    scale = max(WIDTH / photo.width, HEIGHT / photo.height)
    resized = photo.resize(
        (round(photo.width * scale), round(photo.height * scale)),
        Image.LANCZOS,
    )
    # Shift crop right so the couple sits more on the right (like reference).
    left = max(0, (resized.width - WIDTH) // 2 + 95)
    top = (resized.height - HEIGHT) // 2
    canvas = resized.crop((left, top, left + WIDTH, top + HEIGHT))

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw_soft_panel(overlay)

    draw = ImageDraw.Draw(overlay)
    y = PANEL_TOP + 38

    label_font = load_font(22)
    name_font = load_font(68, bold=True)
    amp_font = load_font(36, italic=True)
    invite_font = load_font(26, bold=True)
    date_font = load_font(34, bold=True)
    tagline_font = load_font(30, italic=True)

    y = draw_centered(draw, "THE WEDDING OF", y, label_font, GOLD + (255,), TEXT_WIDTH, TEXT_LEFT)
    y += 12
    y = draw_centered(draw, "Shubham", y, name_font, NAVY + (255,), TEXT_WIDTH, TEXT_LEFT)
    y += 2
    y = draw_centered(draw, "&", y, amp_font, GOLD + (255,), TEXT_WIDTH, TEXT_LEFT)
    y += 0
    y = draw_centered(draw, "Harshi", y, name_font, NAVY + (255,), TEXT_WIDTH, TEXT_LEFT)
    y += 18
    draw.line(
        (TEXT_LEFT + 32, y, TEXT_LEFT + TEXT_WIDTH - 32, y),
        fill=GOLD_LIGHT + (210,),
        width=2,
    )
    y += 14
    y = draw_centered(
        draw,
        "WEDDING INVITATION",
        y,
        invite_font,
        NAVY + (255,),
        TEXT_WIDTH,
        TEXT_LEFT,
    )
    y += 10
    y = draw_centered(draw, "21 NOVEMBER 2026", y, date_font, GOLD + (255,), TEXT_WIDTH, TEXT_LEFT)
    y += 12
    draw_centered(
        draw,
        "With love, joy, and forever.",
        y,
        tagline_font,
        WINE_SOFT + (255,),
        TEXT_WIDTH,
        TEXT_LEFT,
    )

    composed = Image.alpha_composite(canvas, overlay)
    composed = draw_outer_frame(composed)
    return composed.filter(ImageFilter.UnsharpMask(radius=1.0, percent=88, threshold=2))


def main() -> None:
    image = build_from_photo()
    image.convert("RGB").save(OUT, format="WEBP", quality=93)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
