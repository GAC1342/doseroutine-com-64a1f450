#!/usr/bin/env python3
"""Shared DoseRoutine 1200x630 card renderer.

Used by scripts/generate-blog-og.py (blog posts) and
scripts/generate-page-og.py (marketing / tool pages) so every card in the
image sitemap carries the same brand identity: teal gradient, coral rule,
wordmark, eyebrow chip and headline. No stock or generic imagery.
"""
from PIL import Image, ImageDraw, ImageFont

FONT = "/nix/store/dg3hd9mqha517djbgpgnq8r4q1j1wn30-noto-fonts-2025.11.01/share/fonts/noto/NotoSans[wdth,wght].ttf"

W, H = 1200, 630
TEAL = (14, 124, 134)
TEAL_DARK = (7, 62, 70)
CORAL = (255, 107, 94)
WHITE = (255, 255, 255)


def font(size, weight=400):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_axes([weight, 100])
    except Exception:
        pass
    return f


def wrap(draw, text, f, max_w):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=f) <= max_w:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def render_card(
    heading,
    eyebrow,
    url_label,
    footer="Research-backed peptide & supplement tracking",
):
    """Return a finished brand card image for `heading`."""
    img = Image.new("RGB", (W, H), TEAL_DARK)
    d = ImageDraw.Draw(img)
    for y in range(H):  # vertical brand gradient
        t = y / H
        d.line(
            [(0, y), (W, y)],
            fill=tuple(int(TEAL_DARK[i] + (TEAL[i] - TEAL_DARK[i]) * t) for i in range(3)),
        )
    d.rectangle([0, 0, W, 10], fill=CORAL)

    d.text((72, 64), "DOSEROUTINE", font=font(30, 800), fill=WHITE)
    d.text((72, 104), url_label, font=font(22, 400), fill=(190, 226, 229))

    label = eyebrow.upper()
    lf = font(22, 700)
    lw = d.textlength(label, font=lf)
    d.rounded_rectangle([72, 176, 72 + lw + 40, 224], radius=24, fill=CORAL)
    d.text((92, 187), label, font=lf, fill=(52, 16, 12))

    size = 62
    while size > 34:
        hf = font(size, 800)
        lines = wrap(d, heading, hf, W - 144)
        if len(lines) <= 4:
            break
        size -= 4
    y = 268
    for line in lines[:4]:
        d.text((72, y), line, font=hf, fill=WHITE)
        y += int(size * 1.22)

    d.text((72, H - 78), footer, font=font(26, 500), fill=(206, 233, 235))
    return img
