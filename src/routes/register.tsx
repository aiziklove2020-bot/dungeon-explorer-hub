import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { ContentProvider } from "@/context/ContentContext";
import { SiteAuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "../../i18n/LanguageContext";
import RegistrationForm from "@/components/RegistrationForm";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): { day?: string; partyId?: string } => ({
    day: typeof search.day === "string" ? search.day : undefined,
    partyId: typeof search.partyId === "string" ? search.partyId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "הרשמה לאירוע | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content: "הרשמה למסיבות וארועי מסיבות ליברליות בישראל.",
      },
      {
        property: "og:title",
        content: "הרשמה לאירוע | מסיבות ליברליות בישראל",
      },
      { property: "og:url", content: "/register" },
    ],
    links: [{ rel: "canonical", href: "/register" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const search = Route.useSearch();

  return (
    <PageLayout>
      <LanguageProvider>
        <ContentProvider>
          <SiteAuthProvider>
            <div className="mx-auto max-w-2xl px-4 py-12">
              <RegistrationForm
                onCancel={() => {
                  window.location.href = "/";
                }}
                clickedDay={search.day}
                partyId={search.partyId}
              />
            </div>
          </SiteAuthProvider>
        </ContentProvider>
      </LanguageProvider>
    </PageLayout>
  );
}
