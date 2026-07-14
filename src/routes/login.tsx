import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "התחברות | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content: "כניסת חברים לאזור האישי, הפורום והצ'אט של הקהילה.",
      },
      { property: "og:title", content: "התחברות | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "כניסת חברים." },
      { property: "og:url", content: "/login" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: Login,
});

function Login() {
  return (
    <PageLayout>
      <PageHeader title="התחברות" subtitle="כניסת חברי הקהילה" />
      <section className="py-16">
        <div className="mx-auto max-w-md px-4">
          <form
            className="space-y-4 rounded-2xl border border-border bg-card p-8"
            onSubmit={(e) => e.preventDefault()}
          >
            <div>
              <label className="mb-1 block text-sm font-bold">אימייל</label>
              <input
                type="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">סיסמה</label>
              <input
                type="password"
                className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="btn-glow w-full rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              היכנס
            </button>
            <p className="text-center text-sm text-muted-foreground">
              אין לכם חשבון עדיין?{" "}
              <Link to="/contact" className="font-bold text-primary hover:underline">
                בקשו הצטרפות
              </Link>
            </p>
          </form>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="mb-3 font-bold">בעל עסק ורוצה לפרסם מסיבה באתר?</p>
            <Link
              to="/advertiser/register"
              className="inline-block rounded-full border border-primary px-8 py-3 font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              הרשמה כמפרסם
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
