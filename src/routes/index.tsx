import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";
import event1 from "@/assets/event1.jpg";
import event2 from "@/assets/event2.jpg";
import aboutImg from "@/assets/about.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dungeon | הצד הנועז של התשוקה" },
      {
        name: "description",
        content:
          "מועדון הפטיש והבדס\"מ הראשון בישראל. חוויה אולטימטיבית של הנאה חושית, אירועים, מסיבות ואומנות במרחב בטוח ומאפשר.",
      },
      { property: "og:title", content: "Dungeon | הצד הנועז של התשוקה" },
      {
        property: "og:description",
        content: "מועדון הפטיש והבדס\"מ הראשון בישראל והמוביל בתחומו.",
      },
      { property: "og:image", content: heroImg },
    ],
  }),
  component: Index,
});

const navLinks = [
  "אירועים",
  "גלריות",
  "חנות",
  "תקשורת",
  "שאלות ותשובות",
  "נהלי המועדון",
  "אודות",
  "יצירת קשר",
];

const events = [
  {
    title: "Summer Fetish Party 2.7",
    day: "חמישי",
    date: "2.7.26",
    img: event2,
  },
  {
    title: "Diva's Sexy Summer Night 3.7",
    day: "שישי",
    date: "3.7.26",
    img: event1,
  },
];

const aboutBlocks = [
  {
    title: "החווייה במועדון",
    text: "המועדון, כמועדון הפטיש והבדס\"מ הראשון בישראל והמוביל בתחומו בארץ ובעולם, מספק חוויה אולטימטיבית ומעניק כרטיס כניסה לעולם של הנאה חושית וגופנית משכרת. המועדון פועל ויוצר את אירועיו על פי קוד הבדס\"מ העולמי SSC (שפוי בטוח ובהסכמה) ושומר על איזון מגדרי.",
  },
  {
    title: "בילוי איכותי וייחודי",
    text: "כבר שנים רבות המועדון מספק תחושה של 'בית' המאפשרת לכם ליהנות מפתיחות ולחקור את המיניות שלכם באווירה סקסית, מאפשרת והרפתקנית, עם השקעה רבה במוזיקה, הופעות ותפאורה יוצאת דופן.",
  },
  {
    title: "דרס קוד",
    text: "הכניסה למסיבות מחייבת עמידה בקוד לבוש, שכולל ביגוד קינקי ופטישיסטי, עם דרישת מינימום של לבוש מכובד בצבע שחור.",
  },
  {
    title: "יצירת מרחב מוגן",
    text: "מרחב בטוח לבליינים הוא העיקרון המנחה והחשוב ביותר עבורנו. צוות מאבטחים מיומן דואג למנוע הטרדות ופגיעה בפרטיות, ובכך לשמור על העונג והחוויה במסיבה.",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 mb-3">
      <span className="h-px w-12 bg-gold/60" />
      <h2 className="section-title text-3xl md:text-4xl">{children}</h2>
      <span className="h-px w-12 bg-gold/60" />
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <a href="/" className="text-2xl font-black tracking-wide text-primary">
            Dungeon
          </a>
          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((l) => (
              <a
                key={l}
                href="#"
                className="text-sm text-foreground/80 transition-colors hover:text-primary"
              >
                {l}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="הצד הנועז של התשוקה"
          width={1280}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--hero-gradient)" }}
        />
        <div className="relative mx-auto flex min-h-[80vh] max-w-7xl flex-col items-end justify-center px-6 text-right">
          <h1 className="max-w-md text-5xl font-black leading-tight md:text-7xl">
            הצד הנועז
            <br />
            של התשוקה
          </h1>
          <a
            href="#events"
            className="btn-glow mt-8 rounded-full bg-primary px-12 py-4 text-lg font-bold text-primary-foreground transition-transform hover:scale-105"
          >
            הזמנת כרטיס
          </a>
          <p className="mt-3 text-muted-foreground">לאירועים קרובים</p>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionTitle>האירועים הקרובים</SectionTitle>
          <p className="mb-12 text-center text-muted-foreground">
            כל כרטיס הוא כרטיס זוגי
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {events.map((e) => (
              <article
                key={e.title}
                className="group overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative">
                  <img
                    src={e.img}
                    alt={e.title}
                    loading="lazy"
                    width={768}
                    height={1024}
                    className="h-[26rem] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute right-4 top-4 rounded-md bg-primary px-4 py-1 text-sm font-bold text-primary-foreground">
                    {e.date}
                  </div>
                  <div className="absolute left-4 top-4 rounded-md bg-black/70 px-4 py-2 text-center">
                    <span className="block text-sm font-bold">{e.day}</span>
                    <span className="block text-xs text-muted-foreground">
                      {e.date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 p-6">
                  <h3 className="text-xl font-bold">{e.title}</h3>
                  <a
                    href="#"
                    className="shrink-0 rounded-full border border-primary px-6 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    הזמנה
                  </a>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href="#"
              className="inline-block rounded-full bg-secondary px-10 py-3 font-bold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              אירועים עתידיים
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="relative py-20">
        <img
          src={aboutImg}
          alt="האווירה במועדון"
          loading="lazy"
          width={1280}
          height={854}
          className="absolute inset-0 h-full w-full object-cover opacity-15"
        />
        <div className="relative mx-auto max-w-5xl px-4">
          <SectionTitle>קצת עלינו</SectionTitle>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {aboutBlocks.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-border bg-card/80 p-7 text-right backdrop-blur"
              >
                <h3 className="mb-3 text-xl font-bold text-primary">{b.title}</h3>
                <p className="leading-relaxed text-foreground/80">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personal story */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <SectionTitle>הפעם הראשונה שלי בדאנג'ן</SectionTitle>
          <h3 className="mb-6 mt-8 text-2xl font-bold text-gold">להתעורר באמת</h3>
          <p className="text-lg leading-relaxed text-foreground/80">
            הפעם הראשונה שלי בדאנג'ן הייתה אחרי שנה קשה. כזו שבה שכחתי איך מרגיש
            חופש. חברה גררה אותי לשם כמעט בכוח. אמרה לי: "רק תבואי. לא צריך לעשות
            כלום". לבשתי שחור כדי להרגיש בלתי נראית. אבל בדאנג'ן קרה בדיוק ההפך.
            ראיתי נשים שנראו כמו יצירות אמנות, וגברים שלא ניסו להרשים אף אחד…
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#"
              className="rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-transform hover:scale-105"
            >
              קרא עוד
            </a>
            <a
              href="#"
              className="rounded-full border border-border px-8 py-3 font-bold transition-colors hover:border-primary hover:text-primary"
            >
              לכל הסיפורים
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center">
          <span className="text-2xl font-black text-primary">Dungeon</span>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {navLinks.map((l) => (
              <a
                key={l}
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {l}
              </a>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Dungeon · מועדון הפטיש והבדס"מ הראשון
            בישראל · הכניסה מגיל 18 ומעלה
          </p>
        </div>
      </footer>
    </div>
  );
}
