import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import { getContent } from "@/firebase/settings";
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
  component: AboutRoute,
});

function AboutRoute() {
  return (
    <PageLayout>
      <About />
    </PageLayout>
  );
}

function About() {
  const [about, setAbout] = useState<any>({});

  useEffect(() => {
    let cancelled = false;
    getContent()
      .then((data: any) => {
        if (!cancelled) setAbout(data?.about || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const infoCards = about.infoCards || [];

  return (
    <>
      <PageHeader
        title="אודות"
        subtitle={about.roleTitle || "קהילת המסיבות הליברליות המובילה בישראל"}
      />
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          {about.roleText && (
            <p className="mb-4 text-center text-lg leading-relaxed text-foreground/80">
              {about.roleText.replace(/\*\*/g, "")}
            </p>
          )}
          {about.roleSubtext && (
            <p className="mb-12 text-center text-muted-foreground">
              {about.roleSubtext.replace(/\*\*/g, "")}
            </p>
          )}
          <div className="grid gap-8 md:grid-cols-2">
            {infoCards.map((s: any, i: number) => (
              <div
                key={s.title || i}
                className="rounded-2xl border border-border bg-card p-7 text-right"
              >
                <h3 className="mb-3 text-xl font-bold text-primary">
                  {s.title}
                </h3>
                <p className="leading-relaxed text-foreground/80">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border-2 border-primary bg-primary/10 p-6 text-center">
            <p className="text-lg font-bold text-primary">
              חשוב: מי שנרשם דרך האתר חייב לציין בכניסה שהגיע/ה דרך חן ואיציק
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
