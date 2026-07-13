import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { ContentProvider } from "@/context/ContentContext";
import { SiteAuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "../i18n/LanguageContext";
import Admin from "@/pages/Admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ניהול | מסיבות ליברליות בישראל" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <ContentProvider>
          <SiteAuthProvider>
            <Admin />
          </SiteAuthProvider>
        </ContentProvider>
      </LanguageProvider>
    </PageLayout>
  );
}
