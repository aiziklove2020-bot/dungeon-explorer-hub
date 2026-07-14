import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import { getBlogPosts } from "@/firebase/blog";

export const Route = createFileRoute("/blog/")({
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

function stripHtml(html: string) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function Blog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <PageHeader title="בלוג" subtitle="סיפורים, טיפים ומדריכים מהקהילה" />
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          {loading ? (
            <p className="text-center text-muted-foreground">טוען פוסטים...</p>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground">
              אין פוסטים עדיין. היו הראשונים לכתוב!
            </p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {posts.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col rounded-2xl border border-border bg-card p-7 text-right"
                >
                  {p.tags?.[0] && (
                    <span className="mb-3 self-start rounded-full bg-secondary px-3 py-1 text-xs font-bold text-gold">
                      {p.tags[0]}
                    </span>
                  )}
                  <h3 className="mb-2 text-xl font-bold">{p.title}</h3>
                  <p className="mb-5 flex-1 leading-relaxed text-foreground/80 line-clamp-3">
                    {stripHtml(p.content)}
                  </p>
                  <Link
                    to="/blog/$postId"
                    params={{ postId: p.id }}
                    className="self-start font-bold text-primary hover:underline"
                  >
                    קרא עוד ←
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
