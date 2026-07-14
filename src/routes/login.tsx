import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import { LanguageProvider } from "../i18n/LanguageContext";
import { SiteAuthProvider } from "@/context/AuthContext";
import { ForumAuthProvider, useForumAuth } from "@/context/ForumAuthContext";
import ForumLoginModal from "@/components/forum/ForumLoginModal";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "התחברות | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content: "כניסת חברים לאזור האישי, הפורום והצ'אט של הקהילה.",
      },
      { property: "og:title", content: "התחברות | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "כניסת חברים." },
      { property: "og:url", content: "/login" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <SiteAuthProvider>
          <ForumAuthProvider>
            <Login />
          </ForumAuthProvider>
        </SiteAuthProvider>
      </LanguageProvider>
    </PageLayout>
  );
}

function Login() {
  const { forumUser } = useForumAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <PageHeader title="התחברות" subtitle="כניסת חברי הקהילה" />
      <section className="py-16">
        <div className="mx-auto max-w-md px-4">
          {forumUser ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-lg font-bold">מחוברים בתור {forumUser.nickname}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/forum"
                  className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:scale-105"
                >
                  לפורום
                </Link>
                <Link
                  to="/blog"
                  className="rounded-full border border-border px-6 py-3 font-bold transition-colors hover:border-primary hover:text-primary"
                >
                  לבלוג
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="mb-6 text-muted-foreground">
                התחברות/הרשמה עם כינוי וסיסמה — פותח גישה לפורום, לבלוג ולצ'אט הקהילה.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn-glow inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-transform hover:scale-105"
              >
                <LogIn size={18} /> התחבר / הירשם
              </button>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="mb-3 flex items-center justify-center gap-2 font-bold">
              <UserPlus size={18} /> בעל עסק ורוצה לפרסם מסיבה באתר?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/advertiser"
                className="inline-block rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-transform hover:scale-105"
              >
                כניסת מפרסמים
              </Link>
              <Link
                to="/advertiser/register"
                className="inline-block rounded-full border border-primary px-8 py-3 font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                הרשמה כמפרסם
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ForumLoginModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
