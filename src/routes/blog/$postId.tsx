import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { SiteAuthProvider } from "@/context/AuthContext";
import { ForumAuthProvider } from "@/context/ForumAuthContext";
import BlogPost from "@/pages/BlogPost";

export const Route = createFileRoute("/blog/$postId")({
  head: () => ({
    meta: [
      { title: "בלוג | מסיבות ליברליות בישראל" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: BlogPostRoute,
});

function BlogPostRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <SiteAuthProvider>
          <ForumAuthProvider>
            <BlogPost />
          </ForumAuthProvider>
        </SiteAuthProvider>
      </LanguageProvider>
    </PageLayout>
  );
}
