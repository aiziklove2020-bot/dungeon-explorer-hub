import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "צ'אט | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content: "הצ'אט בשיפוצים ויחזור בקרוב.",
      },
      { property: "og:title", content: "צ'אט | מסיבות ליברליות בישראל" },
      { property: "og:url", content: "/chat" },
    ],
    links: [{ rel: "canonical", href: "/chat" }],
  }),
  component: ChatRoute,
});

function ChatRoute() {
  return (
    <PageLayout>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-2xl font-bold">הצ'אט בשיפוצים</h1>
        <p className="text-muted-foreground">
          אנחנו עובדים על שיפור הצ'אט. הוא יחזור בקרוב.
        </p>
      </div>
    </PageLayout>
  );
}
