import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import event1 from "@/assets/event1.jpg";
import event2 from "@/assets/event2.jpg";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "כרטיסים | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "הזמנת כרטיסים לאירועים והמסיבות הקרובות.",
      },
      { property: "og:title", content: "כרטיסים | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "הזמנת כרטיסים לאירועים." },
      { property: "og:image", content: event1 },
      { property: "og:url", content: "/tickets" },
    ],
    links: [{ rel: "canonical", href: "/tickets" }],
  }),
  component: Tickets,
});

const events = [
  {
    title: "Summer Fetish Party 2.7",
    day: "חמישי",
    date: "2.7.26",
    price: "₪350 לזוג",
    img: event2,
  },
  {
    title: "Diva's Sexy Summer Night 3.7",
    day: "שישי",
    date: "3.7.26",
    price: "₪380 לזוג",
    img: event1,
  },
];

function Tickets() {
  return (
    <PageLayout>
      <PageHeader title="כרטיסים" />
      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-2">
          {events.map((e) => (
            <article
              key={e.title}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <img
                src={e.img}
                alt={e.title}
                loading="lazy"
                width={768}
                height={1024}
                className="h-72 w-full object-cover"
              />
              <div className="p-6 text-right">
                <h3 className="text-xl font-bold">{e.title}</h3>
                <p className="mt-1 text-muted-foreground">
                  {e.day} · {e.date}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-gold">{e.price}</span>
                  <button className="btn-glow rounded-full bg-primary px-8 py-2 font-bold text-primary-foreground transition-transform hover:scale-105">
                    הזמנה
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          הכניסה מגיל 18 ומעלה · הרישום מותנה באישור הצוות ובשמירה על איזון מגדרי.
        </p>
      </section>
    </PageLayout>
  );
}
