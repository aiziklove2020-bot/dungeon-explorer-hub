import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import LoginGate from "@/components/LoginGate";
import SimpleChatRoom from "@/components/chat/SimpleChatRoom";

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
      { property: "og:url", content: "/chat" },
    ],
    links: [{ rel: "canonical", href: "/chat" }],
  }),
  component: ChatRoute,
});

function ChatRoute() {
  return (
    <PageLayout>
      <div className="flex min-h-[70vh] flex-col">
        <LoginGate>
          <SimpleChatRoom />
        </LoginGate>
      </div>
    </PageLayout>
  );
}
