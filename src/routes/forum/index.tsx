import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import { getVisibleForumSections } from "@/firebase/forum";

export const Route = createFileRoute("/forum/")({
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

function Forum() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVisibleForumSections()
      .then(setSections)
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <PageHeader title="פורום" subtitle="הלב הפועם של הקהילה" />
      <section className="py-16">
        <div className="mx-auto max-w-4xl space-y-4 px-4">
          {loading ? (
            <p className="text-center text-muted-foreground">טוען מדורים...</p>
          ) : sections.length === 0 ? (
            <p className="text-center text-muted-foreground">
              אין מדורים בפורום עדיין.
            </p>
          ) : (
            sections.map((s) => (
              <Link
                key={s.id}
                to="/forum/$sectionId"
                params={{ sectionId: s.id }}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-right transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-xl font-bold text-primary">{s.title}</h3>
                  {s.description && (
                    <p className="text-foreground/80">{s.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-6 text-center text-sm">
                  <div>
                    <span className="block text-lg font-bold text-gold">
                      {s.topicCount || 0}
                    </span>
                    <span className="text-muted-foreground">נושאים</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </PageLayout>
  );
}
