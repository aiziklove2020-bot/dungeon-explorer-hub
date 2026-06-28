import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "בלוג | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "סיפורים אישיים, טיפים ומדריכים מעולם המסיבות הליברליות והפתיחות בישראל.",
      },
      { property: "og:title", content: "בלוג | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "סיפורים ומדריכים מהקהילה." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: Blog,
});

const posts = [
  {
    title: "להתעורר באמת — סיפור אישי",
    excerpt:
      "הפעם הראשונה שלי במסיבה ליברלית הייתה אחרי שנה קשה. ראיתי אנשים שפשוט היו עצמם, בלי שיפוט ובלי מסכות.",
    tag: "סיפור אישי",
  },
  {
    title: "מדריך למתחילים: הפעם הראשונה שלכם",
    excerpt:
      "כל מה שצריך לדעת לפני האירוע הראשון — מקוד לבוש ועד גבולות והסכמה. נכנסים בראש שקט.",
    tag: "מדריך",
  },
  {
    title: "על הסכמה, גבולות ומילות בטיחות",
    excerpt:
      "הסכמה היא הבסיס לכל אינטראקציה. כך מגדירים גבולות ברורים ובוחרים מילת בטיחות שעובדת.",
    tag: "בטיחות",
  },
  {
    title: "דרס קוד: איך מתלבשים למסיבה",
    excerpt:
      "ביגוד קינקי, פטיש או פשוט שחור מכובד? סוקרים את אפשרויות הלבוש ואיך לבחור את הלוק שלכם.",
    tag: "סטייל",
  },
];

function Blog() {
  return (
    <PageLayout>
      <PageHeader title="בלוג" subtitle="סיפורים, טיפים ומדריכים מהקהילה" />
      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-2">
          {posts.map((p) => (
            <article
              key={p.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 text-right"
            >
              <span className="mb-3 self-start rounded-full bg-secondary px-3 py-1 text-xs font-bold text-gold">
                {p.tag}
              </span>
              <h3 className="mb-2 text-xl font-bold">{p.title}</h3>
              <p className="mb-5 flex-1 leading-relaxed text-foreground/80">
                {p.excerpt}
              </p>
              <Link
                to="/blog"
                className="self-start font-bold text-primary hover:underline"
              >
                קרא עוד ←
              </Link>
            </article>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
