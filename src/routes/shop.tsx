import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import { getProducts, getStoreSettings } from "@/firebase/store";

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

function Shop() {
  const [products, setProducts] = useState<any[]>([]);
  const [storeEnabled, setStoreEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProducts(true), getStoreSettings()])
      .then(([prods, settings]) => {
        setProducts(prods);
        setStoreEnabled(!!settings?.enabled);
      })
      .catch(() => {
        setProducts([]);
        setStoreEnabled(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <PageHeader title="חנות" subtitle="כלים חדשים נוספים כל הזמן" />
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          {loading ? (
            <p className="text-center text-muted-foreground">טוען מוצרים...</p>
          ) : !storeEnabled ? (
            <p className="text-center text-muted-foreground">
              החנות סגורה כרגע — נא לבדוק שוב בקרוב.
            </p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground">
              אין מוצרים זמינים כרגע.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center rounded-2xl border border-border bg-card p-7 text-center"
                >
                  <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-secondary text-4xl">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "🛍️"
                    )}
                  </div>
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <span className="mt-1 text-gold">₪{p.price}</span>
                  <button
                    disabled={!p.stock}
                    className="mt-4 w-full rounded-full border border-primary px-6 py-2 font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {p.stock ? "הוסף לסל" : "אזל מהמלאי"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
