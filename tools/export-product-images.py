#!/usr/bin/env python3
"""Exports the product screenshots the marketing site uses.

Source: the full-size captures in ../marketing-assets/after (2880x1800
desktop, 1170x2532 phone). Output: assets/product/, as WebP at the width the
page actually needs (desktop 1440 wide, phone and crops 600 wide, quality 82),
plus a JPEG copy of the hero image for browsers without WebP.

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


def export(name, source, width, box):
    im = Image.open(os.path.join(SRC, source)).convert('RGB')
    if box:
        im = im.crop(box)
    ratio = width / im.width
    im = im.resize((width, round(im.height * ratio)), Image.LANCZOS)
    webp = os.path.join(OUT, f'{name}.webp')
    im.save(webp, 'WEBP', quality=QUALITY, method=6)
    sizes = [(webp, os.path.getsize(webp))]
    if name in JPEG_FALLBACKS:
        jpg = os.path.join(OUT, f'{name}.jpg')
        im.save(jpg, 'JPEG', quality=80, optimize=True, progressive=True)
        sizes.append((jpg, os.path.getsize(jpg)))
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
