import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { SiteAuthProvider } from "@/context/AuthContext";
import { ForumAuthProvider } from "@/context/ForumAuthContext";
import ForumSection from "@/pages/ForumSection";

export const Route = createFileRoute("/forum/$sectionId/")({
  head: () => ({
    meta: [
      { title: "פורום | מסיבות ליברליות בישראל" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ForumSectionRoute,
});

function ForumSectionRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <SiteAuthProvider>
          <ForumAuthProvider>
            <ForumSection />
          </ForumAuthProvider>
        </SiteAuthProvider>
      </LanguageProvider>
    </PageLayout>
  );
}
