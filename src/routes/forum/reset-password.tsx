import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { LanguageProvider } from "../../i18n/LanguageContext";
import ForumPasswordReset from "@/pages/ForumPasswordReset";

export const Route = createFileRoute("/forum/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ title: "איפוס סיסמה | מסיבות ליברליות בישראל" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ForumPasswordResetRoute,
});

function ForumPasswordResetRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <ForumPasswordReset />
      </LanguageProvider>
    </PageLayout>
  );
}
