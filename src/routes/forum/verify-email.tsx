import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { SiteAuthProvider } from "@/context/AuthContext";
import { ForumAuthProvider } from "@/context/ForumAuthContext";
import ForumEmailVerify from "@/pages/ForumEmailVerify";

export const Route = createFileRoute("/forum/verify-email")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ title: "אימות אימייל | מסיבות ליברליות בישראל" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ForumEmailVerifyRoute,
});

function ForumEmailVerifyRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <SiteAuthProvider>
          <ForumAuthProvider>
            <ForumEmailVerify />
          </ForumAuthProvider>
        </SiteAuthProvider>
      </LanguageProvider>
    </PageLayout>
  );
}
