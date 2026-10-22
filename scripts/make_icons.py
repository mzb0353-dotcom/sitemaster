# יצירת אייקוני ה-PWA מהלוגו הרשמי (דורש Pillow):
#   python3 scripts/make_icons.py brand/mt-master-logo.jpg public/icons
import sys
from PIL import Image, ImageDraw, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')

# תוכן הלוגו (קסדה, MT, הכיתוב) מתוך פני האייקון, בלי המסגרת הכסופה
box = (106, 94, 446, 462)
content = im.crop(box)
cw, ch = content.size

# מסכה עם קצוות רכים כדי שהמעבר לרקע לא ייראה
feather = 16
mask = Image.new('L', (cw, ch), 0)
ImageDraw.Draw(mask).rounded_rectangle((feather, feather, cw - feather, ch - feather), radius=40, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(feather / 2))

def background(size):
    top, bottom = (238, 164, 52), (214, 118, 26)
    bg = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return bg

def full_bleed(size, fill):
    # fill: חלק מגובה הריבוע שהתוכן תופס
    bg = background(size)
    h = round(size * fill); w = round(h * cw / ch)
    c = content.resize((w, h), Image.LANCZOS); m = mask.resize((w, h), Image.LANCZOS)
    bg.paste(c, ((size - w) // 2, (size - h) // 2), m)
    return bg

def rounded(size, fill):
    img = full_bleed(size, fill).convert('RGBA')
    a = Image.new('L', (size, size), 0)
    ImageDraw.Draw(a).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255)
    img.putalpha(a)
    return img

full_bleed(180, 0.86).save(f'{out}/apple-touch-icon.png')
full_bleed(512, 0.66).save(f'{out}/maskable-512.png')
rounded(512, 0.84).save(f'{out}/icon-512.png')
rounded(192, 0.84).save(f'{out}/icon-192.png')
rounded(32, 0.92).save(f'{out}/favicon-32.png')
rounded(256, 0.86).save(f'{out}/logo-256.png')
