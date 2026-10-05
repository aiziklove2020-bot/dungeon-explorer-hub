"""TikTok content pack: 1080x1920 (9:16) slides in public/assets/tiktok/tNN.jpg and docs/tiktok-pack.md.

Run from the repo root:  python3 scripts/tiktok/make_tiktok.py <fonts-dir>   (same fonts-dir as make_campaigns.py)
Content is deliberately brand/community/nightlife only: no nudity, no sexual wording, no explicit terms,
because TikTok's Community Guidelines and ad policies do not allow sexual content or adult services.
Text stays inside the safe area (TikTok's interface covers the bottom ~25% and the right edge)."""
import os, re, sys
src = open(os.path.join(os.path.dirname(__file__), "..", "campaigns", "make_campaigns.py"), encoding="utf-8").read()
src = re.sub(r"\nmain\(\)\s*$", "\n", src)  # reuse the helpers without running the Telegram generator
exec(compile(src, "make_campaigns", "exec"))

TW, TH = 1080, 1920
SLIDES = [  # id, background, headline lines, subline, caption, hashtags
    ("t01", "dance", ["הלילה הבא", "מתחיל כאן."], "מסיבות, מוזיקה וקהילה. מעל גיל 18", "הלילה הבא שלכם מתחיל כאן 🌙 מסיבות, מוזיקה וקהילה מכבדת בישראל. הקישור בביו. 18+"),
    ("t02", "lounge", ["קהילה מכבדת.", "חיבורים מעניינים."], "מרחב של חופש ושל כבוד הדדי", "קהילה מכבדת, חיבורים מעניינים 🩶 מרחב של חופש וכבוד הדדי. הקישור בביו. 18+"),
    ("t03", "pool", ["פחות שגרה.", "יותר לילה."], "המסיבה הבאה שלכם כבר מחכה", "פחות שגרה, יותר לילה ✨ המסיבה הבאה שלכם כבר מחכה. הקישור בביו. 18+"),
    ("t04", "social", ["חדש באתר:", "התראות לנייד."], "מקבלים עדכון ברגע שיש מסיבה חדשה", "חדש באתר 📲 התראות ישירות לנייד על מסיבות חדשות. הקישור בביו. 18+"),
    ("t05", "dance", ["כל המסיבות", "בלוח אחד."], "בוחרים לילה ונרשמים בדקה", "כל המסיבות בלוח אחד 📅 בוחרים לילה ונרשמים בדקה. הקישור בביו. 18+"),
    ("t06", "lounge", ["מפיקים?", "פרסמו אצלנו."], "הרשמה כמפרסם והמסיבה באתר", "מפיקי אירועים 📣 מפרסמים את האירוע באתר הקהילה. הקישור בביו. 18+"),
    ("t07", "pool", ["מנוי = הכל", "במקום אחד."], "אזור אישי, מועדפים והתראות", "מנוי באתר = הכל במקום אחד 💎 אזור אישי, מועדפים והתראות. הקישור בביו. 18+"),
    ("t08", "social", ["חבל להישאר", "בחוץ."], "מצטרפים לקהילה", "חבל להישאר בחוץ 🌟 מצטרפים לקהילה. הקישור בביו. 18+"),
]
TAGS = "#מסיבות #חיי_לילה #קהילה #ישראל #18plus #LIBRALPARTY"

def make_t(tid, bg, head, sub):
    base = cover(Image.open(os.path.join(ROOT, BG[bg])).convert("RGB"), TW, TH).filter(ImageFilter.GaussianBlur(2))
    shade = Image.new("RGBA", (TW, TH)); px = ImageDraw.Draw(shade)
    for y in range(TH):
        t = abs(y - TH * 0.42) / (TH * 0.6)
        px.line([(0, y), (TW, y)], fill=(16, 9, 16, int(120 + 110 * min(1, t ** 1.4))))
    glow = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-200, TH - 1100, TW + 200, TH - 100), fill=(255, 67, 139, 70))
    img = Image.alpha_composite(Image.alpha_composite(base.convert("RGBA"), shade), glow.filter(ImageFilter.GaussianBlur(120)))
    d = ImageDraw.Draw(img)
    logo = Image.open(os.path.join(ROOT, "public/assets/design/couples-logo.png")).convert("RGBA")
    logo = logo.resize((170, round(170 * logo.height / logo.width)), Image.LANCZOS)
    img.alpha_composite(logo, ((TW - logo.width) // 2, 230))   # below TikTok's top bar
    d.text((TW // 2, 230 + logo.height + 8), "LIBRAL-PARTY", font=lat(800, 52), fill=(246, 200, 135), anchor="ma")
    y, size = 700, 112
    while size > 60 and max(d.textlength(l, font=he(800, size), direction="rtl", language="he") for l in head) > TW - 260:
        size -= 4
    big = he(800, size)
    for i, line in enumerate(head):
        col = (255, 120, 170) if i == len(head) - 1 else (255, 255, 255)
        text_c(d, y + 3, line, big, (0, 0, 0), TW); text_c(d, y, line, big, col, TW); y += 150
    y += 20
    d.rounded_rectangle((TW // 2 - 90, y, TW // 2 + 90, y + 8), 4, fill=(255, 67, 139)); y += 50
    sf = he(400, 48)
    for line in wrap(d, sub, sf, TW - 320):
        text_c(d, y, line, sf, (245, 228, 238), TW); y += 68
    d.text((TW // 2, 1380), "18+  |  libralparty.net", font=lat(800, 40), fill=(246, 200, 135), anchor="ma")
    out = os.path.join(ROOT, "public/assets/tiktok", tid + ".jpg")
    img.convert("RGB").save(out, quality=88, optimize=True, progressive=True)

md = ["# חבילת תוכן לטיקטוק", "", "תמונות 1080x1920 ב-`public/assets/tiktok/`. מעלים כסרטון תמונות (Photo Mode) או מחברים כמה תמונות לסרטון קצר עם מוזיקה מספריית הצלילים של טיקטוק.", ""]
for tid, bg, head, sub, cap in SLIDES:
    make_t(tid, bg, head, sub)
    md += [f"## {tid}", f"קובץ: `public/assets/tiktok/{tid}.jpg`", "", f"כיתוב: {cap} {TAGS}", ""]
md += ["## כללים שהחבילה בנויה לפיהם", "- בלי עירום, בלי רמיזות מיניות ובלי מילים מפורשות (טיקטוק אוסר תוכן מיני ושירותים למבוגרים).",
       "- התמונות והכיתובים מציגים קהילה, מסיבות ואווירה בלבד. אין לצלם משתתפים בלי הסכמה בכתב.",
       "- הקישור לאתר רק בביו של החשבון (קישורים בכיתוב לא לחיצים). בכיתוב כתוב 18+.",
       "- בהגדרות החשבון והסרטון מסמנים קהל מבוגרים (18+) והגבלת גיל אם האפשרות קיימת.",
       "- פרסום ממומן בטיקטוק: מודעות לאירועי סווינגרס ובדסמ אינן מאושרות במדיניות המודעות. אפשר לפרסם רק תוכן אורגני, או מודעה כללית על אתר קהילה ללא רמיזה מינית, בכפוף לאישור של טיקטוק.",
       "- לא להשתמש בהאשטגים מיניים. ההאשטגים בחבילה כלליים.", ""]
open(os.path.join(ROOT, "docs/tiktok-pack.md"), "w", encoding="utf-8").write("\n".join(md))
print("done")
