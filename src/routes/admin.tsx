import { createFileRoute } from "@tanstack/react-router";
import { ContentProvider } from "@/context/ContentContext";
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

// Deliberately NOT wrapped in <PageLayout> — the admin panel is its own
// standalone page (own header, own full-page background) and shouldn't show
// the public site's nav/RSS ticker/banners/popup/footer. It also used to
// wrap its own local <SiteAuthProvider>, but that context is global at the
// app root now — the extra local instance created a second, disconnected
// copy that nothing outside this tree could see, which is what caused the
// "two connections" conflict (SiteHeader reading the global one, this page's
// tree reading an isolated empty one). Nothing under /admin actually calls
// useSiteAuth() at all, so it's just removed rather than reconnected.
function AdminRoute() {
  return (
    <LanguageProvider>
      <ContentProvider>
        <Admin />
      </ContentProvider>
    </LanguageProvider>
  );
}
