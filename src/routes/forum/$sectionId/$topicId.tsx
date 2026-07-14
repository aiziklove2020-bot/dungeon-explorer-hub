import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { SiteAuthProvider } from "@/context/AuthContext";
import { ForumAuthProvider } from "@/context/ForumAuthContext";
import ForumTopic from "@/pages/ForumTopic";

export const Route = createFileRoute("/forum/$sectionId/$topicId")({
  head: () => ({
    meta: [
      { title: "פורום | מסיבות ליברליות בישראל" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ForumTopicRoute,
});

function ForumTopicRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <SiteAuthProvider>
          <ForumAuthProvider>
            <ForumTopic />
          </ForumAuthProvider>
        </SiteAuthProvider>
      </LanguageProvider>
    </PageLayout>
  );
}
