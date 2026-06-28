import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "צור קשר | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "יצירת קשר עם צוות המסיבות הליברליות בישראל. שאלות על הצטרפות, אירועים ורישום.",
      },
      { property: "og:title", content: "צור קשר | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "דברו איתנו." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <PageLayout>
      <PageHeader title="צור קשר" subtitle="נשמח לשמוע מכם" />
      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-2">
          <form
            className="space-y-4 rounded-2xl border border-border bg-card p-7"
            onSubmit={(e) => e.preventDefault()}
          >
            <div>
              <label className="mb-1 block text-sm font-bold">שם מלא</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
                placeholder="השם שלך"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">אימייל</label>
              <input
                type="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">הודעה</label>
              <textarea
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
                placeholder="במה נוכל לעזור?"
              />
            </div>
            <button
              type="submit"
              className="btn-glow w-full rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              שליחה
            </button>
          </form>
          <div className="space-y-6 text-right">
            <div>
              <h3 className="mb-2 text-xl font-bold text-primary">
                ערוצי תקשורת
              </h3>
              <p className="leading-relaxed text-foreground/80">
                ניתן ליצור איתנו קשר דרך הרשתות החברתיות, קבוצות הוואטסאפ
                והטלגרם של הקהילה. נשתדל לחזור אליכם בהקדם.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {["אינסטגרם", "טלגרם", "וואטסאפ", "פייסבוק"].map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border px-5 py-2 text-sm font-bold text-foreground/80"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              הכניסה והפנייה אלינו מותרות מגיל 18 ומעלה בלבד.
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
