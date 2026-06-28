import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import aboutImg from "@/assets/about.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "אודות | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "מי אנחנו: קהילת המסיבות הליברליות המובילה בישראל, הפועלת לפי קוד SSC במרחב בטוח, מאפשר ומכבד.",
      },
      { property: "og:title", content: "אודות | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "מי אנחנו וערכי הקהילה שלנו." },
      { property: "og:image", content: aboutImg },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

const sections = [
  {
    title: "החזון שלנו",
    text: "אנחנו מאמינים שלכל אדם מגיע מרחב לחקור את התשוקה, הסקרנות והמיניות שלו בחופשיות, בכבוד וללא שיפוט. הקהילה שלנו היא בית לאנשים שמחפשים פתיחות אמיתית.",
  },
  {
    title: "קוד SSC",
    text: "כל אירוע מתנהל לפי העיקרון העולמי SSC — שפוי (Sane), בטוח (Safe) ובהסכמה (Consensual). הסכמה היא הבסיס לכל אינטראקציה אצלנו, תמיד.",
  },
  {
    title: "איזון מגדרי",
    text: "בשל אופיים הייחודי של האירועים, אנחנו שומרים על איזון מגדרי ואיננו מאפשרים כניסה ליחידים. כך נשמרת אווירה נעימה, מכבדת ובטוחה לכולם.",
  },
  {
    title: "אומנות וקהילה",
    text: "אנחנו מקדמים ביטוי אמנותי ומשלבים ציירים, צלמים, פרפורמרים ומעצבים באירועים שלנו. הקהילה היא לב העשייה, ואנחנו גאים בה.",
  },
];

function About() {
  return (
    <PageLayout>
      <PageHeader
        title="אודות"
        subtitle="קהילת המסיבות הליברליות המובילה בישראל"
      />
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="mb-12 text-center text-lg leading-relaxed text-foreground/80">
            כבר שנים רבות אנחנו מספקים תחושה של 'בית' המאפשרת לכם ליהנות מפתיחות
            ולחקור את עצמכם באווירה סקסית, מאפשרת והרפתקנית. בכל אירוע יש השקעה
            רבה במוזיקה מגוונת, בהופעות מעוררות השראה, בצוות אכפתי ובתפאורה יוצאת
            דופן.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {sections.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-border bg-card p-7 text-right"
              >
                <h3 className="mb-3 text-xl font-bold text-primary">
                  {s.title}
                </h3>
                <p className="leading-relaxed text-foreground/80">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
