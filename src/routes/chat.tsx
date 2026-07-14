import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import LoginGate from "@/components/LoginGate";
import ChatRoomView from "@/components/chat/ChatRoomView";
import { useForumAuth } from "@/context/ForumAuthContext";
import { useSiteAuth } from "@/context/AuthContext";
import { MAIN_ROOM_ID, ensureMainRoom, joinRoom } from "@/firebase/liveChat";

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
  component: ChatRoute,
});

function ChatRoute() {
  return (
    <PageLayout>
      <div className="flex min-h-[70vh] flex-col">
        <LoginGate>
          <MainRoom />
        </LoginGate>
      </div>
    </PageLayout>
  );
}

function MainRoom() {
  const { forumUser } = useForumAuth();
  const { siteUser } = useSiteAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!forumUser?.id) return;
      try {
        await ensureMainRoom();
        await joinRoom(MAIN_ROOM_ID, forumUser, siteUser, { observeMode: false });
        if (!cancelled) setReady(true);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "שגיאה בטעינת הצ'אט");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forumUser?.id]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-destructive">
        {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        טוען...
      </div>
    );
  }

  return (
    <ChatRoomView
      roomId={MAIN_ROOM_ID}
      navigate={(path: string) => navigate({ to: path })}
    />
  );
}
