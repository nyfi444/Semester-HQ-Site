#!/usr/bin/env python3
"""Exports the home page's product images (assets/v2) from the captures
tools/shoot-product.mjs writes to ../marketing-assets/after.

Every image is written at two or three widths for srcset w-descriptors, as
WebP. Desktop captures are 2880x1800 (1440x900 at 2x), phone captures are
1170x2532 (390x844 at 3x).

Also writes assets/v2/club-spots.json: where each part of the club page sits
inside the club crop, in percent, for the clubs section's highlight
(css/home-v2.css .spot-ring, js/home-v2.js). Re-run both after any app UI
change:

    node tools/shoot-product.mjs && python3 tools/export-home-images.py
"""
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
SRC = os.path.normpath(os.path.join(SITE, '..', 'marketing-assets', 'after'))
OUT = os.path.join(SITE, 'assets', 'v2')
Q = 80

RECTS = json.load(open(os.path.join(SRC, 'rects.json')))
CLUB = RECTS['club']

# The club crop, in CSS px of the full-page club capture: the page's content
# column from the cover down through the week strip.
CX0, CY0 = CLUB['cover']['x'] - 20, CLUB['cover']['y'] - 16
CX1 = CLUB['cover']['x'] + CLUB['cover']['w'] + 20
CY1 = CLUB['agenda']['y'] + 190
# The week strip and Coming up sit under the Next up card, in its column.
_N = CLUB['next']
WEEK = CLUB.get('week') or {'x': _N['x'], 'y': _N['y'] + _N['h'] + 12, 'w': _N['w'], 'h': 0}

# (name, source, crop box in CSS px or None, widths)
JOBS = [
    ('dash', 'dashboard-desktop.png', None, [1100, 2200]),
    ('cal-month', 'calendar-desktop.png', (244, 0, 1440, 900), [1196, 2392]),
    ('timer', 'timer-desktop.png', (244, 0, 1440, 760), [1000, 2000]),
    ('club', 'clubs-desktop.png', (CX0, CY0, CX1, CY1), [1100, 2200]),
    ('p-dash', 'dashboard-phone.png', None, [390, 780, 1170]),
    ('p-week', 'calendar-week-phone.png', None, [330, 660, 990]),
    ('p-month', 'calendar-phone.png', None, [390, 780, 1170]),
    ('p-flash', 'flashcards-phone.png', None, [330, 660, 990]),
    ('p-club', 'clubs-phone.png', None, [390, 780, 1170]),
    ('p-group', 'studygroups-phone.png', None, [330, 660, 990]),
    # Feature tiles: the top of each screen, where its point is.
    ('t-course', 'course-phone.png', (0, 0, 390, 420), [390, 780]),
    ('t-exams', 'exams-phone.png', (0, 0, 390, 420), [390, 780]),
    ('t-flash', 'flashcards-phone.png', (0, 0, 390, 420), [390, 780]),
    ('t-timer', 'timer-phone.png', (0, 0, 390, 420), [390, 780]),
    ('t-projects', 'projects-phone.png', (0, 0, 390, 420), [390, 780]),
    ('t-apps', 'applications-phone.png', (0, 0, 390, 420), [390, 780]),
    ('t-todos', 'todos-phone.png', (0, 0, 390, 420), [390, 780]),
    ('t-notebook', 'notebook-desktop.png', (560, 72, 1080, 632), [390, 780]),
    # The phone hero: the dashboard screen as a flat card, no handset.
    ('p-dash-top', 'dashboard-phone.png', (0, 0, 390, 600), [390, 780, 1170]),
]


def run():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.webp'):
            os.remove(os.path.join(OUT, f))
    total = 0
    for name, source, box, widths in JOBS:
        im = Image.open(os.path.join(SRC, source)).convert('RGB')
        scale = 2 if im.width == 2880 else 3
        if box:
            im = im.crop(tuple(round(v * scale) for v in box))
        for w in widths:
            w = min(w, im.width)
            out = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            path = os.path.join(OUT, f'{name}-{w}.webp')
            out.save(path, 'WEBP', quality=Q, method=6)
            total += os.path.getsize(path)
            print(f'{name}-{w}.webp  {out.width}x{out.height}  {os.path.getsize(path) // 1024} KB')

    cw, ch = CX1 - CX0, CY1 - CY0

    def pct(r, pad=6):
        x0, y0 = max(r['x'] - pad, CX0), max(r['y'] - pad, CY0)
        x1, y1 = min(r['x'] + r['w'] + pad, CX1), min(r['y'] + r['h'] + pad, CY1)
        return {k: round(v, 2) for k, v in {
            'x': (x0 - CX0) / cw * 100, 'y': (y0 - CY0) / ch * 100,
            'w': (x1 - x0) / cw * 100, 'h': (y1 - y0) / ch * 100}.items()}

    spots = {
        'size': [round(cw), round(ch)],
        'calendar': pct({'x': WEEK['x'], 'y': WEEK['y'], 'w': WEEK['w'], 'h': CY1 - WEEK['y']}),
        'answer': pct(CLUB['next']),
        'pinned': pct(CLUB['needs']),
        'officers': pct(CLUB['officers']),
    }
    json.dump(spots, open(os.path.join(OUT, 'club-spots.json'), 'w'), indent=1)
    print(json.dumps(spots))
    print(f'total {total // 1024} KB')


if __name__ == '__main__':
    run()
