import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "פורום | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "פורום הקהילה — מקום לשאלות, היכרויות, שיתוף חוויות ודיונים בעולם המסיבות הליברליות.",
      },
      { property: "og:title", content: "פורום | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "דיונים והיכרויות בקהילה." },
      { property: "og:url", content: "/forum" },
    ],
    links: [{ rel: "canonical", href: "/forum" }],
  }),
  component: Forum,
});

const boards = [
  {
    name: "מתחילים ושאלות",
    desc: "חדשים בעולם? כאן שואלים בלי בושה ומקבלים תשובות מהקהילה.",
    topics: 128,
    posts: 1543,
  },
  {
    name: "אירועים ומסיבות",
    desc: "עדכונים, המלצות וחוויות מהמסיבות האחרונות.",
    topics: 86,
    posts: 942,
  },
  {
    name: "היכרויות ואיזונים",
    desc: "מחפשים בן/בת זוג לאירוע? כאן מתאזנים.",
    topics: 203,
    posts: 3187,
  },
  {
    name: "כלים וציוד",
    desc: "המלצות, ביקורות ושאלות על כלים מהחנות ומעבר לה.",
    topics: 54,
    posts: 611,
  },
];

function Forum() {
  return (
    <PageLayout>
      <PageHeader title="פורום" subtitle="הלב הפועם של הקהילה" />
      <section className="py-16">
        <div className="mx-auto max-w-4xl space-y-4 px-4">
          {boards.map((b) => (
            <div
              key={b.name}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-right sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="text-xl font-bold text-primary">{b.name}</h3>
                <p className="text-foreground/80">{b.desc}</p>
              </div>
              <div className="flex shrink-0 gap-6 text-center text-sm">
                <div>
                  <span className="block text-lg font-bold text-gold">
                    {b.topics}
                  </span>
                  <span className="text-muted-foreground">נושאים</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-gold">
                    {b.posts}
                  </span>
                  <span className="text-muted-foreground">הודעות</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
