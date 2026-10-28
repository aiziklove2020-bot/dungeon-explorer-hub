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
}

# id, background, headline lines (last line is highlighted), subline, button text, page, caption
CAMPAIGNS = [
    # Join the community (first in the rotation, so the new pool starts with them)
    ("g1", "social", ["הקבוצה שלנו", "בוואטסאפ."], "מסיבות חדשות ועדכונים, ישר לנייד", "להצטרפות לקבוצה", "https://chat.whatsapp.com/LHo4Spoy73b38mDI5XEcF7",
     "💬 הקבוצה שלנו בוואטסאפ!\nמסיבות חדשות ועדכונים, ישר לנייד. מצטרפים בלחיצה.\n\n👇 להצטרפות לקבוצה:"),
    ("g2", "dance", ["הקהילה בפייסבוק.", "מצטרפים עכשיו."], "קבוצה של אנשים שאוהבים לצאת למסיבות", "להצטרפות לקבוצה", "https://www.facebook.com/share/g/1D7ng47o28/",
     "👥 הקבוצה שלנו בפייסבוק!\nמסיבות, חדשות מהקהילה והכרויות. מצטרפים ורואים הכל ראשונים.\n\n👇 להצטרפות לקבוצה:"),
    ("g3", "lounge", ["עוקבים אחרינו", "באינסטגרם."], "תמונות, מסיבות חדשות וחדשות מהקהילה", "לעמוד באינסטגרם", "https://www.instagram.com/liberl_party/",
     "📸 עוקבים אחרינו באינסטגרם!\nתמונות, מסיבות חדשות וחדשות מהקהילה, בכל יום.\n\n👇 לעמוד שלנו:"),
    ("g4", "pool", ["תביאו חברים.", "הקהילה גדלה."], "שולחים את הקישור לחברים ומצטרפים ביחד", "כניסה לאתר", "/",
     "🤝 תביאו חברים והקהילה גדלה!\nשולחים להם את הקישור, והם מצטרפים לקבוצות ולמסיבות שלנו.\n\n👇 הקישור לשליחה:"),
    ("g5", "social", ["מצטרפים אלינו", "בכל מקום."], "אתר, וואטסאפ, פייסבוק ואינסטגרם: בוחרים איפה נוח", "כניסה לאתר", "/",
     "🌐 מצטרפים אלינו בכל מקום!\nהאתר, קבוצת הוואטסאפ, קבוצת הפייסבוק והאינסטגרם. בוחרים מה נוח לכם.\n\n👇 כניסה לאתר וכל הקישורים:"),
    ("g6", "lounge", ["הערוץ שלנו", "בטלגרם."], "מסיבות חדשות ועדכונים. שולחים לחברים שיאהבו", "לערוץ בטלגרם", "https://t.me/libralparty",
     "✈️ הערוץ שלנו בטלגרם!\nמסיבות חדשות ועדכונים מהקהילה. מכירים מישהו שיאהב? שולחים לו את הקישור.\n\n👇 מצטרפים לערוץ:"),
    # What's new on the site (first in the rotation, so the news goes out first)
    ("c01", "dance", ["חדש באתר:", "התראה ישירות לנייד."], "מסיבות חדשות — מקבלים עדכון לנייד", "לאתר ולהפעלת התראות", "/",
     "📲 חדש באתר: התראות ישירות לנייד!\nמאשרים התראות פעם אחת, ומקבלים עדכון בכל פעם שעולה מסיבה חדשה.\n\n👇 נכנסים לאתר ומאשרים התראות:"),
    ("c05", "dance", ["האתר החדש", "מהיר ויפה יותר."], "עיצוב חדש, טעינה מהירה ונוחות גם במחשב", "כניסה לאתר", "/",
     "✨ האתר התחדש!\nעיצוב חדש, טעינה מהירה בהרבה ותצוגה נוחה גם במחשב.\n\n👇 בואו להתרשם:"),
    # Evergreen campaigns
    ("c07", "lounge", ["חבל לפספס", "איזון בסוף השבוע."], "מסיבות סוף השבוע כבר באתר, נרשמים בוואטסאפ", "למסיבות סוף השבוע", "/events",
     "⏰ סוף השבוע מתקרב, וחבל לפספס איזון!\nנרשמים בוואטסאפ, בכל שעה.\n\n👇 כל המסיבות באתר:"),
    ("c08", "pool", ["מסיבות חדשות", "עלו לאתר."], "תאריכים, מקומות ופרטי הרשמה, הכל במקום אחד", "לכל המסיבות", "/events",
     "🔥 מסיבות חדשות עלו עכשיו לאתר!\nכל התאריכים, המקומות וההרשמה, הכל במקום אחד.\n\n👇 מה מתאים לכם הלילה?"),
    ("c09", "dance", ["זוגות?", "נרשמים בדקה."], "בוחרים מסיבה ושולחים הודעה בוואטסאפ", "להרשמה למסיבה", "/events",
     "💑 זוגות, ההרשמה למסיבה לוקחת דקה!\nבוחרים מסיבה, שולחים הודעה בוואטסאפ ומגיעים ליהנות.\n\n👇 מסיבות פתוחות להרשמה:"),
    ("c10", "social", ["המסיבה הבאה", "במרחק קליק."], "פחות שגרה. יותר לילה.", "למסיבה הבאה שלי", "/events",
     "✨ פחות שגרה, יותר לילה!\nהמסיבה הבאה שלכם כבר מחכה באתר.\n\n👇 לוחצים ונרשמים:"),
    ("c12", "pool", ["קהילה מכבדת.", "חיבורים מעניינים."], "מרחב של חופש ושל כבוד הדדי. 18+", "להכיר את הקהילה", "/about",
     "🩶 קהילה מכבדת, חיבורים מעניינים.\nמרחב של חופש ושל כבוד הדדי, להכיר, לרקוד ולצאת מהרגיל.\n\n👇 קצת עלינו:"),
    ("c13", "dance", ["כל האירועים", "בלוח אחד."], "מפנים מקום ביומן ובוחרים מסיבה", "ללוח האירועים", "/calendar",
     "📅 כל המסיבות בלוח אחד!\nמפנים מקום ביומן ובוחרים את הלילה הבא.\n\n👇 ללוח האירועים:"),
    ("c16", "dance", ["הלילה הבא", "מתחיל כאן."], "מסיבות, איזונים וקהילה, הכל במקום אחד", "כניסה לאתר", "/",
     "🌙 הלילה הבא מתחיל כאן!\nמסיבות, איזונים וקהילה, הכל באתר LIBRAL PARTY.\n\n👇 כניסה לאתר:"),
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
