import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageLayout, PageHeader } from "@/components/PageLayout";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "צ'אט | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "צ'אט הקהילה — הצטרפו לשיחה בזמן אמת עם חברי הקהילה במרחב מכבד ובטוח.",
      },
      { property: "og:title", content: "צ'אט | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "שיחה בזמן אמת עם הקהילה." },
      { property: "og:url", content: "/chat" },
    ],
    links: [{ rel: "canonical", href: "/chat" }],
  }),
  component: Chat,
});

const initial = [
  { user: "מאיה", text: "היי לכולם, מישהו הולך למסיבה בחמישי?" },
  { user: "דניאל", text: "אני כן! מתרגש, זאת הפעם השנייה שלי 🔥" },
  { user: "צוות", text: "ברוכים הבאים! זכרו לשמור על כבוד והסכמה תמיד 💬" },
];

function Chat() {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");

  return (
    <PageLayout>
      <PageHeader title="צ'אט" subtitle="הצטרפו לשיחה בזמן אמת" />
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex h-96 flex-col gap-3 overflow-y-auto p-6">
              {messages.map((m, i) => (
                <div key={i} className="text-right">
                  <span className="text-sm font-bold text-primary">
                    {m.user}:
                  </span>{" "}
                  <span className="text-foreground/90">{m.text}</span>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                setMessages((prev) => [...prev, { user: "את/ה", text }]);
                setText("");
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
                placeholder="כתבו הודעה..."
              />
              <button
                type="submit"
                className="rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground"
              >
                שליחה
              </button>
            </form>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            הצ'אט פתוח לחברי הקהילה הרשומים בלבד, מגיל 18 ומעלה.
          </p>
        </div>
      </section>
    </PageLayout>
  );
}
