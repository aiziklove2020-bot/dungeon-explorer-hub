import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import { ContentProvider, useContent } from "@/context/ContentContext";
import { LanguageProvider } from "../i18n/LanguageContext";

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
  component: ContactRoute,
});

function ContactRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <ContentProvider>
          <Contact />
        </ContentProvider>
      </LanguageProvider>
    </PageLayout>
  );
}

function Contact() {
  const { content } = useContent();
  const contact = content.contact || {};

  return (
    <>
      <PageHeader title="צור קשר" subtitle="נשמח לשמוע מכם" />
      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-7 text-right">
            {contact.alertText && (
              <p className="rounded-md bg-secondary px-4 py-2 text-sm font-bold text-gold">
                {contact.alertText}
              </p>
            )}
            {contact.description && (
              <p className="leading-relaxed text-foreground/80">
                {contact.description}
              </p>
            )}
            {contact.whatsappLink && (
              <a
                href={contact.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow block w-full rounded-full bg-primary px-8 py-3 text-center font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                שליחת הודעה ב-WhatsApp
              </a>
            )}
          </div>
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
            {contact.importantNote && (
              <p className="text-sm text-muted-foreground">
                {contact.importantNote}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
