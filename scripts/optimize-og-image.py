#!/usr/bin/env python3
"""Build share-sized OG assets from public/og-image.png (source of truth)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "og-image.png"
SHARE_WIDTH = 1200


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing {SRC}")

    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    share_h = round(h * SHARE_WIDTH / w)
    share = im.resize((SHARE_WIDTH, share_h), Image.LANCZOS)

    jpg = ROOT / "public" / "og-image.jpg"
    webp = ROOT / "public" / "og-image.webp"
    share.save(jpg, "JPEG", quality=88, optimize=True, progressive=True)
    share.save(webp, "WEBP", quality=85, method=4)

    print(f"source {w}x{h} ({SRC.stat().st_size} bytes)")
    print(f"share  {SHARE_WIDTH}x{share_h}")
    print(f"  {jpg.name}: {jpg.stat().st_size} bytes")
    print(f"  {webp.name}: {webp.stat().st_size} bytes")


if __name__ == "__main__":
    main()
