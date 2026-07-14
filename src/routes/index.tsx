import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";
import aboutImg from "@/assets/about.jpg";
import { PageLayout } from "@/components/PageLayout";
import { ContentProvider, useContent } from "@/context/ContentContext";
import { LanguageProvider } from "../i18n/LanguageContext";
import { isPartyExpiredByExpiration } from "../../shared/partyExpiry.js";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "מסיבות ליברליות בישראל | הצד הנועז של התשוקה" },
      {
        name: "description",
        content:
          "קהילת המסיבות הליברליות המובילה בישראל. אירועים, מסיבות, פורום וצ'אט במרחב בטוח, מאפשר ומכבד. הכניסה מגיל 18.",
      },
      {
        property: "og:title",
        content: "מסיבות ליברליות בישראל | הצד הנועז של התשוקה",
      },
      {
        property: "og:description",
        content: "קהילת המסיבות הליברליות המובילה בישראל.",
      },
      { property: "og:image", content: heroImg },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: IndexRoute,
});

const aboutBlocks = [
  {
    title: "החווייה במסיבות",
    text: "אנחנו קהילת המסיבות הליברליות המובילה בישראל, ומעניקים כרטיס כניסה לעולם של הנאה חושית, פתיחות וחופש. כל אירוע נבנה על פי קוד SSC (שפוי, בטוח ובהסכמה) ותוך שמירה על איזון מגדרי.",
  },
  {
    title: "בילוי איכותי וייחודי",
    text: "כבר שנים אנחנו מספקים תחושה של 'בית' המאפשרת לכם ליהנות מפתיחות ולחקור את עצמכם באווירה סקסית, מאפשרת והרפתקנית, עם השקעה רבה במוזיקה, הופעות ותפאורה.",
  },
  {
    title: "דרס קוד",
    text: "הכניסה למסיבות מחייבת עמידה בקוד לבוש: ביגוד קינקי ופטישיסטי, עם דרישת מינימום של לבוש מכובד בצבע שחור.",
  },
  {
    title: "יצירת מרחב מוגן",
    text: "מרחב בטוח לבליינים הוא העיקרון המנחה והחשוב ביותר עבורנו. צוות מיומן דואג למנוע הטרדות ופגיעה בפרטיות, ולשמור על העונג והחוויה.",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-center gap-4">
      <span className="h-px w-12 bg-gold/60" />
      <h2 className="section-title text-3xl md:text-4xl">{children}</h2>
      <span className="h-px w-12 bg-gold/60" />
    </div>
  );
}

function IndexRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <ContentProvider>
          <Index />
        </ContentProvider>
      </LanguageProvider>
    </PageLayout>
  );
}

function Index() {
  const { content, isInitialized } = useContent();
  const partyRetentionHours = content.partyRetentionHours;
  const visibleEvents = (content.events || []).filter(
    (ev: any) => !isPartyExpiredByExpiration(ev?.expiration, ev?.date, partyRetentionHours)
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-background">
        <img
          src={heroImg}
          alt="הצד הנועז של התשוקה"
          width={1600}
          height={639}
          className="w-full h-auto object-contain"
        />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-6 py-10 text-center">
          <Link
            to="/register"
            className="btn-glow rounded-full bg-primary px-12 py-4 text-lg font-bold text-primary-foreground transition-transform hover:scale-105"
          >
            הרשמה למסיבה
          </Link>
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
          {!isInitialized ? (
            <p className="text-center text-muted-foreground">טוען אירועים...</p>
          ) : visibleEvents.length === 0 ? (
            <p className="text-center text-muted-foreground">
              אין אירועים פעילים כרגע — נא לבדוק שוב בקרוב.
            </p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {visibleEvents.map((e: any, i: number) => (
                <article
                  key={e.id || `${e.title}-${i}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="relative">
                    <img
                      src={e.img || heroImg}
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
                    <Link
                      to="/register"
                      search={{ partyId: e.id || undefined }}
                      className="shrink-0 rounded-full border border-primary px-6 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      הזמנה
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-10 text-center">
            <Link
              to="/tickets"
              className="inline-block rounded-full bg-secondary px-10 py-3 font-bold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              אירועים עתידיים
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="relative py-20">
        <img
          src={aboutImg}
          alt="האווירה במסיבות"
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
          <div className="mt-10 text-center">
            <Link
              to="/about"
              className="inline-block rounded-full border border-border px-10 py-3 font-bold transition-colors hover:border-primary hover:text-primary"
            >
              קראו עוד עלינו
            </Link>
          </div>
        </div>
      </section>

      {/* Personal story */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <SectionTitle>הפעם הראשונה שלי</SectionTitle>
          <h3 className="mb-6 mt-8 text-2xl font-bold text-gold">להתעורר באמת</h3>
          <p className="text-lg leading-relaxed text-foreground/80">
            הפעם הראשונה שלי במסיבה ליברלית הייתה אחרי שנה קשה. כזו שבה שכחתי איך
            מרגיש חופש. חברה גררה אותי לשם כמעט בכוח. אמרה לי: "רק תבואי. לא צריך
            לעשות כלום". לבשתי שחור כדי להרגיש בלתי נראית, אבל קרה בדיוק ההפך.
            ראיתי אנשים שפשוט היו עצמם, בלי שיפוט ובלי מסכות…
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/blog"
              className="rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-transform hover:scale-105"
            >
              לכל הסיפורים
            </Link>
            <Link
              to="/forum"
              className="rounded-full border border-border px-8 py-3 font-bold transition-colors hover:border-primary hover:text-primary"
            >
              לפורום הקהילה
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
