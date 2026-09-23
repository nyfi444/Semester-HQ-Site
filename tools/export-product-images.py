#!/usr/bin/env python3
"""Exports the product screenshots the marketing site uses.

Source: the full-size captures in ../marketing-assets/after (2880x1800
desktop, 1170x2532 phone). Output: assets/product/, as WebP at the width the
page actually needs (desktop 1440 wide, phone and crops 600 wide, quality 82),
plus a JPEG copy of the hero image for browsers without WebP.

Each image is ALSO written at 2x (name@2x.webp) for high-density screens.
Without it a Mac renders the 1x file stretched and it looks soft — which is
exactly what happened: the hero was a 1440px file filling ~1600-2200 device
pixels. The 2x files are quality 72, not 82: at double density the artefacts
are invisible and the file stays close to the 1x size. Reference them with
srcset="... 1x, ...@2x.webp 2x".

Re-run after the screenshots are re-captured:

    python3 tools/export-product-images.py

Needs Pillow. Nothing else.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
SRC = os.path.normpath(os.path.join(SITE, '..', 'marketing-assets', 'after'))
OUT = os.path.join(SITE, 'assets', 'product')

DESKTOP_W = 1440
PHONE_W = 600
QUALITY = 82
# 2x is downsampled less (or not at all — the desktop source is exactly
# 2880 wide), so it can afford a lower quality for the same perceived result.
QUALITY_2X = 72

# (output name, source file, target width, optional crop box in source pixels)
EXPORTS = [
    ('dashboard-desktop',   'dashboard-desktop.png',   DESKTOP_W, None),
    ('class-page-desktop',  'class-page-desktop.png',  DESKTOP_W, None),
    ('todos-desktop',       'todos-desktop.png',       DESKTOP_W, None),
    ('calendar-desktop',    'calendar-desktop.png',    DESKTOP_W, None),
    ('assignments-desktop', 'assignments-desktop.png', DESKTOP_W, None),
    ('studygroups-desktop', 'studygroups-desktop.png', DESKTOP_W, None),
    # The syllabus panel of the class page: professor, office hours, TA,
    # attendance. This is what an uploaded syllabus turns into.
    ('syllabus-panel',      'class-page-desktop.png',  PHONE_W, (1900, 612, 2748, 1732)),
    ('dashboard-phone',     'dashboard-phone.png',     PHONE_W, None),
    # The phone capture filed as class-page-phone is the Courses list.
    ('courses-phone',       'class-page-phone.png',    PHONE_W, None),
    ('calendar-phone',      'calendar-phone.png',      PHONE_W, None),
    ('exams-phone',         'exams-phone.png',         PHONE_W, None),
    ('projects-phone',      'projects-phone.png',      PHONE_W, None),
    ('flashcards-phone',    'flashcards-phone.png',    PHONE_W, None),
    ('applications-phone',  'applications-phone.png',  PHONE_W, None),
]
# The hero image is the largest contentful paint, so it also gets a JPEG.
JPEG_FALLBACKS = ['dashboard-desktop']


def _scaled(src, width):
    """src resized to `width`, or returned as-is if it is already narrower.

    Never upscales: asking for 2x from a source that cannot supply it would
    invent detail and defeat the point.
    """
    if src.width <= width:
        return src.copy()
    return src.resize((width, round(src.height * width / src.width)), Image.LANCZOS)


def export(name, source, width, box):
    src = Image.open(os.path.join(SRC, source)).convert('RGB')
    if box:
        src = src.crop(box)

    im = _scaled(src, width)
    webp = os.path.join(OUT, f'{name}.webp')
    im.save(webp, 'WEBP', quality=QUALITY, method=6)
    sizes = [(webp, os.path.getsize(webp))]

    # 2x, capped at whatever the source actually has.
    two = _scaled(src, min(width * 2, src.width))
    if two.width > im.width:
        webp2 = os.path.join(OUT, f'{name}@2x.webp')
        two.save(webp2, 'WEBP', quality=QUALITY_2X, method=6)
        sizes.append((webp2, os.path.getsize(webp2)))

    if name in JPEG_FALLBACKS:
        jpg = os.path.join(OUT, f'{name}.jpg')
        im.save(jpg, 'JPEG', quality=80, optimize=True, progressive=True)
        sizes.append((jpg, os.path.getsize(jpg)))
        if two.width > im.width:
            jpg2 = os.path.join(OUT, f'{name}@2x.jpg')
            two.save(jpg2, 'JPEG', quality=72, optimize=True, progressive=True)
            sizes.append((jpg2, os.path.getsize(jpg2)))

    return im.size, sizes


if __name__ == '__main__':
    if not os.path.isdir(SRC):
        sys.exit(f'Expected the screenshots at {SRC}')
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name, source, width, box in EXPORTS:
        (w, h), sizes = export(name, source, width, box)
        for path, size in sizes:
            total += size
            print(f'{os.path.basename(path):26s} {w}x{h}  {size // 1024} KB')
    print(f'total {total // 1024} KB')
