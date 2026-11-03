"""Generates the Telegram campaign pool: one image per campaign (public/assets/campaigns/cNN.jpg)
and the matching shared/telegramCampaigns.js read by api/telegram-webhook.js.

Run from the repo root:  python3 scripts/campaigns/make_campaigns.py <fonts-dir>
<fonts-dir> must hold heebo-{hebrew,latin}-{400,800}-normal.woff
(from `npm pack @fontsource/heebo`, the package's files/ folder).
Edit CAMPAIGNS below to add or change campaigns, then re-run and commit the output."""
import datetime, json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONTS = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fontt/package/files"
ROOT = os.getcwd()
W, H = 1080, 1350
SITE = "https://www.libralparty.net"
BG = {
    "dance": "public/assets/design/dancefloor.webp",
    "lounge": "public/assets/design/lounge.webp",
    "pool": "public/assets/design/pool.webp",
    "social": "public/assets/design/social-banner.webp",
    "suite": "public/assets/design/liberal-suite/suite-beds.jpeg",
    "suitebar": "public/assets/design/liberal-suite/suite-bar.jpeg",
    "suitelounge": "public/assets/design/liberal-suite/lounge-main.jpeg",
    "suitesofa": "public/assets/design/liberal-suite/lounge-sofa.jpeg",
}

# id, background, headline lines (last line is highlighted), subline, button text, page, caption
# Campaigns are only about Avi Swingers' club (the parties on the site, registration by WhatsApp with Avi)
# and the Liberal Suite advertised on the site. Never about balancing, memberships or site accounts.
CAMPAIGNS = [
    # What is new first
    ("n2", "dance", ["האתר החדש", "של המועדון."], "כל המסיבות בדף אחד, והרשמה בהודעה אחת בוואטסאפ", "כניסה לאתר", "/",
     "🆕 האתר של המועדון של אבי סווינגרס מחכה לכם!\nכל המסיבות הקרובות בדף אחד, וההרשמה בהודעה אחת בוואטסאפ.\n\n👇 כניסה לאתר:"),
    ("s1", "suitebar", ["ערב פרטי", "בסוויטה."], "בר יוקרתי, סאונד מתקדם ואזור לריקודים", "לפרטים ולהזמנה", "/liberal-suite",
     "🍸 ערב פרטי בסוויטה הליברלית!\nסלון אירוח מפנק עם בר יוקרתי, מערכות סאונד מתקדמות ואזור מרווח לריקודים.\n\n👇 לפרטים ולהזמנה:"),
    ("k1", "pool", ["מה קורה", "בסוף השבוע?"], "המסיבות הקרובות של אבי סווינגרס מחכות באתר", "למסיבות הקרובות", "/events",
     "🎶 מה קורה בסוף השבוע?\nכל המסיבות הקרובות של המועדון באתר, עם התאריכים.\n\n👇 בוחרים לילה:"),
    ("s2", "suite", ["מיטות ענק", "וחופש מוחלט."], "עיצוב יוקרתי ברמת הגימור הגבוהה ביותר", "לפרטים ולהזמנה", "/liberal-suite",
     "🛏 סוויטה ברמה אחרת!\nחלל מעוצב ברמת גימור גבוהה, עם מיטות ענק יוקרתיות.\n\n👇 לפרטים ולהזמנה:"),
    ("k2", "lounge", ["הודעה אחת", "וסגרתם מסיבה."], "לוחצים על הרשמה בוואטסאפ, ואבי חוזר אליכם", "לכל המסיבות", "/events",
     "💬 הודעה אחת וסגרתם מסיבה!\nלוחצים על \"הרשמה בוואטסאפ\" ליד המסיבה, ואבי חוזר אליכם עם כל הפרטים.\n\n👇 בוחרים מסיבה:"),
    ("s3", "suitesofa", ["אפטר לילי", "לשש שעות."], "על בסיס מקום פנוי, ופונים לאבי לבדיקת זמינות", "לפרטים", "/liberal-suite",
     "🌙 אפטר בלילה? אפשר!\nשש שעות בסוויטה הליברלית, על בסיס מקום פנוי. לבדיקת זמינות פונים לאבי.\n\n👇 לפרטים:"),
    ("k3", "social", ["מפנים מקום", "ביומן."], "לוח המסיבות של המועדון, תאריך אחרי תאריך", "ללוח האירועים", "/calendar",
     "📅 מפנים מקום ביומן!\nלוח המסיבות של המועדון מחכה לכם, תאריך אחרי תאריך.\n\n👇 ללוח האירועים:"),
    ("s4", "suitelounge", ["מזוג אחד", "ועד עשרה זוגות."], "סוויטת אירוח אקסקלוסיבית ופרטית", "לפרטים ולהזמנה", "/liberal-suite",
     "🥂 מזוג אחד ועד עשרה זוגות!\nסוויטת אירוח אקסקלוסיבית, בפרטיות מלאה.\n\n👇 לפרטים ולהזמנה:"),
    ("k4", "dance", ["ערב בלתי נשכח", "מחכה במועדון."], "כל המסיבות הקרובות של אבי סווינגרס באתר", "למסיבות", "/events",
     "✨ ערב בלתי נשכח מחכה במועדון של אבי סווינגרס!\nכל המסיבות הקרובות באתר.\n\n👇 למסיבות:"),
    ("s5", "suite", ["חדר רחצה", "שלא ראיתם."], "ענק ושקוף, במרכז הסוויטה", "לפרטים ולהזמנה", "/liberal-suite",
     "💦 חדר רחצה מרהיב, ענק ושקוף, במרכז הסוויטה הליברלית!\n\n👇 לפרטים ולהזמנה:"),
    ("k5", "pool", ["מסיבות חדשות", "עולות באתר."], "מצטרפים לקבוצת הטלגרם הגדולה ולא מפספסים", "להצטרפות לקבוצה", "https://t.me/libralparty",
     "📲 מסיבות חדשות עולות באתר!\nמצטרפים לקבוצת הטלגרם הגדולה ולא מפספסים אף מסיבה.\n\n👇 להצטרפות לקבוצה:"),
    ("s6", "suitesofa", ["יש לכם ליין", "קבוע?"], "דברו עם אבי לתנאים מותאמים אישית", "לפרטים", "/liberal-suite",
     "🔁 ליין קבוע בסוויטה?\nדברו עם אבי לתנאים מותאמים אישית.\n\n👇 לפרטים:"),
]

def merged_font(weight):
    """Heebo's Hebrew and Latin subsets merged into one TTF (Hebrew-only has no ? . : punctuation)."""
    out = f"/tmp/heebo-merged-{weight}.ttf"
    if not os.path.exists(out):
        from fontTools.merge import Merger
        from fontTools.ttLib import TTFont
        parts = []
        for kind in ("hebrew", "latin"):
            f = TTFont(f"{FONTS}/heebo-{kind}-{weight}-normal.woff")
            f.flavor = None
            p = f"/tmp/heebo-{kind}-{weight}.ttf"
            f.save(p)
            parts.append(p)
        Merger().merge(parts).save(out)
    return out

def font(weight, size):
    return ImageFont.truetype(merged_font(weight), size, layout_engine=ImageFont.Layout.RAQM)

def he(weight, size): return font(weight, size)
def lat(weight, size): return font(weight, size)

def cover(img, w, h):
    r = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * r), round(img.height * r)), Image.LANCZOS)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))

def text_c(d, y, s, f, fill, w=W):
    d.text((w // 2, y), s, font=f, fill=fill, anchor="ma", direction="rtl", language="he")

def wrap(d, s, f, maxw):
    words, lines, cur = s.split(" "), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=f, direction="rtl", language="he") <= maxw: cur = t
        else: lines.append(cur); cur = wd
    if cur: lines.append(cur)
    return lines

def make(cid, bg, head, sub, btn, page):
    base = cover(Image.open(os.path.join(ROOT, BG[bg])).convert("RGB"), W, H)
    base = base.filter(ImageFilter.GaussianBlur(2))
    shade = Image.new("RGBA", (W, H))
    px = ImageDraw.Draw(shade)
    for y in range(H):  # dark at the top and bottom, lighter in the middle
        t = abs(y - H * 0.45) / (H * 0.55)
        px.line([(0, y), (W, y)], fill=(16, 9, 16, int(120 + 110 * min(1, t ** 1.4))))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-200, H - 700, W + 200, H + 300), fill=(255, 67, 139, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(Image.alpha_composite(base.convert("RGBA"), shade), glow)
    d = ImageDraw.Draw(img)

    logo = Image.open(os.path.join(ROOT, "public/assets/design/couples-logo.png")).convert("RGBA")
    logo = logo.resize((150, round(150 * logo.height / logo.width)), Image.LANCZOS)
    img.alpha_composite(logo, ((W - logo.width) // 2, 70))
    d.text((W // 2, 70 + logo.height + 8), "LIBRAL-PARTY", font=lat(800, 46), fill=(246, 200, 135), anchor="ma")
    text_c(d, 70 + logo.height + 66, "מסיבות ליברליות בישראל", he(400, 34), (240, 215, 229))

    y = 470
    size = 112
    while size > 60 and max(d.textlength(l, font=he(800, size), direction="rtl", language="he") for l in head) > W - 130:
        size -= 4
    big = he(800, size)
    for i, line in enumerate(head):
        col = (255, 120, 170) if i == len(head) - 1 else (255, 255, 255)
        text_c(d, y + 3, line, big, (0, 0, 0))
        text_c(d, y, line, big, col)
        y += 150
    y += 20
    d.rounded_rectangle((W // 2 - 90, y, W // 2 + 90, y + 8), 4, fill=(255, 67, 139))
    y += 50
    sf = he(400, 46)
    for line in wrap(d, sub, sf, W - 220):
        text_c(d, y, line, sf, (245, 228, 238))
        y += 66

    by = 1090
    pill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pill)
    pd.rounded_rectangle((190, by, W - 190, by + 110), 55, fill=(255, 67, 139, 255))
    img = Image.alpha_composite(img, pill.filter(ImageFilter.GaussianBlur(0)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((190, by, W - 190, by + 110), 55, fill=(244, 52, 125), outline=(255, 150, 190), width=3)
    text_c(d, by + 20, btn, he(800, 52), (255, 255, 255))
    d.text((W // 2, by + 140), "libralparty.net", font=lat(800, 40), fill=(246, 200, 135), anchor="ma")
    out = os.path.join(ROOT, "public/assets/campaigns", f"{cid}.jpg")
    img.convert("RGB").save(out, quality=88, optimize=True, progressive=True)
    return os.path.getsize(out)

def main():
    os.makedirs(os.path.join(ROOT, "public/assets/campaigns"), exist_ok=True)
    items = []
    for n, (_, bg, head, sub, btn, page, caption) in enumerate(CAMPAIGNS, 1):
        cid = f"c{n:02d}"
        size = make(cid, bg, head, sub, btn, page)
        url = page if page.startswith("http") else f"{SITE}{page}"
        items.append({"id": cid, "image": f"{SITE}/assets/campaigns/{cid}.jpg", "caption": f"{caption}\n{url}"})
        print(cid, size // 1024, "KB")
    version = datetime.date.today().isoformat()  # a new month's pool starts again from its first campaign
    js = "// Generated by scripts/campaigns/make_campaigns.py — do not edit by hand.\nexport const TELEGRAM_CAMPAIGNS_VERSION = " + json.dumps(version) + ";\nexport const TELEGRAM_CAMPAIGNS = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n"
    open(os.path.join(ROOT, "shared/telegramCampaigns.js"), "w", encoding="utf-8").write(js)

main()
