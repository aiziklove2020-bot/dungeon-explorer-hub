import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "חנות | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "חנות הקהילה — כלים, אביזרים וביגוד לעולם הליברלי. כלים חדשים נוספים כל הזמן.",
      },
      { property: "og:title", content: "חנות | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "כלים ואביזרים לקהילה." },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  component: Shop,
});

const products = [
  { name: "אזיקי עור קלאסיים", price: "₪149", emoji: "🔗" },
  { name: "כיסוי עיניים משי", price: "₪59", emoji: "🖤" },
  { name: "שוט עור איכותי", price: "₪199", emoji: "🥃" },
  { name: "ערכת מתחילים", price: "₪289", emoji: "🎁" },
  { name: "נר עיסוי חם", price: "₪79", emoji: "🕯️" },
  { name: "חבל באמבוק רך", price: "₪89", emoji: "🪢" },
];

function Shop() {
  return (
    <PageLayout>
      <PageHeader title="חנות" subtitle="כלים חדשים נוספים כל הזמן" />
      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.name}
              className="flex flex-col items-center rounded-2xl border border-border bg-card p-7 text-center"
            >
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-4xl">
                {p.emoji}
              </div>
              <h3 className="text-lg font-bold">{p.name}</h3>
              <span className="mt-1 text-gold">{p.price}</span>
              <button className="mt-4 w-full rounded-full border border-primary px-6 py-2 font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                הוסף לסל
              </button>
            </div>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
