import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, Facebook, Send, MessageCircle } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import aboutImg from "@/assets/about.jpg";
import { PageLayout } from "@/components/PageLayout";
import { getActiveParties, deleteExpiredParties } from "@/firebase/parties";
import { getPartySettings } from "@/firebase/partySettings";
import { getSocialLinks } from "@/firebase/settings";
import { isPartyExpiredByDate } from "../../shared/partyExpiry.js";

const SOCIAL_ICONS = [
  { key: "instagram", Icon: Instagram, label: "אינסטגרם" },
  { key: "facebook", Icon: Facebook, label: "פייסבוק" },
  { key: "telegramChannel", Icon: Send, label: "ערוץ טלגרם" },
  { key: "telegramGroup", Icon: Send, label: "קבוצת טלגרם" },
  { key: "whatsapp", Icon: MessageCircle, label: "וואטסאפ" },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "קהילת המסיבות הליברליות המובילה בישראל. אירועים, מסיבות, פורום וצ'אט במרחב בטוח, מאפשר ומכבד. הכניסה מגיל 18.",
      },
      {
        property: "og:title",
        content: "מסיבות ליברליות בישראל",
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
    title: "בית לכל סוגי המסיבות",
    text: "מליברליות פתוחות ולילות קינק ופטיש סוערים, דרך מסיבות טראנס פסיכדליות ועד אירועי מזרחית שמרימים כל רחבה — אנחנו הכתובת המרכזית לתרבות המסיבות בישראל. כל אירוע, בכל סגנון, נבנה על פי קוד SSC (שפוי, בטוח ובהסכמה) ותוך שמירה על איזון מגדרי.",
  },
  {
    title: "אירועים לכל טעם",
    text: "בין אם אתם מחפשים ערב חושני ומשוחרר, מסיבת פטיש עם דרמה ותשוקה, לילה טראנסי תוסס עד הזריחה או מסיבת מזרחית עם אנרגיה שלא נגמרת — תמיד תמצאו אצלנו את הליין המתאים, עם השקעה רבה במוזיקה, הופעות ותפאורה.",
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

function EventDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-3">
      <p
        className={`whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${
          expanded ? "" : "line-clamp-4"
        }`}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-sm font-bold text-primary hover:underline"
      >
        {expanded ? "הצג פחות" : "קרא עוד"}
      </button>
    </div>
  );
}

function IndexRoute() {
  return (
    <PageLayout>
      <Index />
    </PageLayout>
  );
}

function formatEventDate(date: Date) {
  return `${date.getDate()}.${date.getMonth() + 1}`;
}

function Index() {
  const [parties, setParties] = useState<any[] | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getActiveParties(), getPartySettings()])
      .then(([allParties, settings]) => {
        if (cancelled) return;
        const retentionHours = settings?.retentionHours;
        const visible = (allParties || []).filter(
          (p: any) => !isPartyExpiredByDate(p.date, retentionHours)
        );
        setParties(visible);
      })
      .catch(() => {
        if (!cancelled) setParties([]);
      });
    // Best-effort: actually delete party docs whose retention window has
    // passed, instead of only ever hiding them client-side. Previously this
    // only ran when an admin opened the Parties tab, so ended parties stayed
    // in Firestore indefinitely until someone happened to open admin.
    deleteExpiredParties().catch(() => {});
    getSocialLinks()
      .then((links: any) => {
        if (!cancelled) setSocialLinks(links || {});
      })
      .catch(() => {
        if (!cancelled) setSocialLinks({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-background">
        <img
          src={heroImg}
          alt="מסיבות ליברליות בישראל"
          width={1600}
          height={639}
          className="w-full h-auto object-contain"
        />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-6 pt-8 pb-6 text-center">
          <Link
            to="/register"
            className="btn-glow rounded-full bg-primary px-12 py-4 text-lg font-bold text-primary-foreground transition-transform hover:scale-105"
          >
            הרשמה למסיבה
          </Link>
          {socialLinks && (
            <div className="mt-5 flex items-center justify-center gap-4">
              {SOCIAL_ICONS.filter(({ key }) => socialLinks[key]).map(({ key, Icon, label }) => (
                <a
                  key={key}
                  href={socialLinks[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground/80 transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Events */}
      <section id="events" className="bg-background pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4">
          <SectionTitle>האירועים הקרובים</SectionTitle>
          {parties === null ? (
            <p className="mt-8 text-center text-muted-foreground">טוען אירועים...</p>
          ) : parties.length === 0 ? (
            <p className="mt-8 text-center text-muted-foreground">
              אין אירועים פעילים כרגע — נא לבדוק שוב בקרוב.
            </p>
          ) : (
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {parties.map((e: any, i: number) => (
                <article
                  key={e.id || `${e.title}-${i}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="relative">
                    <img
                      src={e.imageURL || heroImg}
                      alt={e.title}
                      loading="lazy"
                      width={768}
                      height={1024}
                      className="h-[26rem] w-full bg-secondary object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute right-4 top-4 rounded-md bg-primary px-4 py-1 text-center">
                      <span className="block text-sm font-bold text-primary-foreground">{e.day}</span>
                      <span className="block text-xs text-primary-foreground/80">
                        {formatEventDate(e.date)}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold">{e.title}</h3>
                        {e.dj && (
                          <p className="mt-1 text-sm text-muted-foreground">{e.dj}</p>
                        )}
                      </div>
                      {e.partyType === "external" && e.registrationLink ? (
                        <a
                          href={e.registrationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-full border border-primary px-6 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          הזמנה
                        </a>
                      ) : (
                        <Link
                          to="/register"
                          search={{ partyId: e.id || undefined }}
                          className="shrink-0 rounded-full border border-primary px-6 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          הזמנה
                        </Link>
                      )}
                    </div>
                    {e.description && <EventDescription text={e.description} />}
                  </div>
                </article>
              ))}
            </div>
          )}
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
