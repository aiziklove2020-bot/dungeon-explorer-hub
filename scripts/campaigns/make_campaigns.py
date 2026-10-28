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
    # The news first: the site's new management
    ("n1", "dance", ["ניהול חדש לאתר:", "אבי סווינגרס."], "כל המסיבות של המועדון באתר אחד, וההרשמה בוואטסאפ מול אבי", "כניסה לאתר", "/",
     "📣 עדכון חשוב: LIBRAL PARTY בניהול חדש!\nהאתר עובר לניהול של אבי סווינגרס. כל המסיבות של המועדון מופיעות באתר, וההרשמה נעשית בוואטסאפ מול אבי.\n\n👇 כל המסיבות באתר:"),
    ("s1", "suite", ["הסוויטה הליברלית", "פתוחה להזמנות."], "סוויטת יוקרה לזוג אחד ועד 10 זוגות", "לפרטים ולהזמנה", "/liberal-suite",
     "✨ הסוויטה הליברלית פתוחה להזמנות!\nסוויטת אירוח יוקרתית, מזוג אחד ועד 10 זוגות, עם פרטיות מלאה.\n\n👇 כל הפרטים והמחירון:"),
    ("k1", "pool", ["המסיבות של", "המועדון של אבי."], "כל התאריכים הקרובים מחכים באתר", "לכל המסיבות", "/events",
     "🔥 המסיבות של המועדון של אבי סווינגרס!\nכל התאריכים הקרובים מופיעים באתר. בוחרים מסיבה ונרשמים בוואטסאפ מול אבי.\n\n👇 המסיבות הקרובות:"),
    ("s2", "suitelounge", ["יום הולדת", "בלתי נשכח."], "ימי הולדת ומסיבות פרטיות בסוויטה הליברלית", "לפרטים ולהזמנה", "/liberal-suite",
     "🎂 יום הולדת שלא שוכחים!\nימי הולדת ומסיבות פרטיות ברמת פרימיום, בסוויטה הליברלית.\n\n👇 לפרטים ולהזמנה:"),
    ("k2", "lounge", ["נרשמים בוואטסאפ", "מול אבי."], "בוחרים מסיבה באתר ושולחים הודעה, זה הכל", "לכל המסיבות", "/events",
     "💬 ההרשמה למסיבות פשוטה!\nבוחרים מסיבה באתר, לוחצים על \"הרשמה בוואטסאפ\" ושולחים הודעה לאבי. הוא חוזר אליכם עם כל הפרטים.\n\n👇 בוחרים מסיבה:"),
    ("s3", "suitebar", ["אפטר בלילה?", "יש לנו מקום."], "אפטרים של 6 שעות, לפי מקום פנוי", "לבדיקת זמינות", "/liberal-suite",
     "🌙 חדש בסוויטה הליברלית: אפטרים גם בלילה!\nשש שעות של חופש, על בסיס מקום פנוי.\n\n👇 לבדיקת זמינות:"),
    ("k3", "dance", ["סוף השבוע", "מתחיל במועדון."], "המסיבות הקרובות של אבי סווינגרס", "למסיבות הקרובות", "/events",
     "🎉 סוף השבוע מתחיל במועדון של אבי סווינגרס!\nכל המסיבות הקרובות באתר, וההרשמה בוואטסאפ.\n\n👇 המסיבות הקרובות:"),
    ("s4", "suite", ["ערב זוגי", "ברמה אחרת."], "לינה וערב רומנטי בסוויטה הליברלית", "לפרטים ולהזמנה", "/liberal-suite",
     "🌹 ערב זוגי ברמה אחרת.\nלינה וערב רומנטי ומיוחד בסוויטה הליברלית, בפרטיות מלאה.\n\n👇 לפרטים ולהזמנה:"),
    ("k4", "social", ["לוח המסיבות", "של המועדון."], "מפנים מקום ביומן ובוחרים את הלילה הבא", "ללוח האירועים", "/calendar",
     "📅 כל המסיבות של המועדון בלוח אחד!\nמפנים מקום ביומן ובוחרים את הלילה הבא.\n\n👇 ללוח האירועים:"),
    ("s5", "suitesofa", ["מתחם אבזור", "מושקע."], "נדנדה, ספת טנטרה וצלב, בסוויטה הליברלית", "לפרטים ולהזמנה", "/liberal-suite",
     "🖤 מתחם אבזור מושקע בסוויטה הליברלית!\nנדנדת פליי, חמור, ספת טנטרה וצלב, וחדר רחצה מרהיב.\n\n👇 לכל הפרטים:"),
    ("k5", "pool", ["הלילה הבא", "מתחיל כאן."], "המועדון של אבי סווינגרס, כל המסיבות באתר", "כניסה לאתר", "/",
     "🌙 הלילה הבא מתחיל כאן!\nכל המסיבות של המועדון של אבי סווינגרס, באתר אחד.\n\n👇 כניסה לאתר:"),
    ("s6", "suitelounge", ["מסיבה פרטית", "משלכם."], "סלון אירוח, בר ומערכת סאונד, מזוג ועד 10 זוגות", "לפרטים ולהזמנה", "/liberal-suite",
     "🥂 מסיבה פרטית משלכם!\nסלון אירוח מפנק, בר יוקרתי ומערכות סאונד, מזוג אחד ועד 10 זוגות.\n\n👇 לפרטים ולהזמנה:"),
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
