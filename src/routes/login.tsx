import { createFileRoute, redirect } from "@tanstack/react-router";

// Every public/*.html page's header "כניסה / הרשמה" icon links to /login
// (see app.js's data-dashboard-link handling — "keep the anchor's own href
// (/login) — it's only a dashboard link once logged in"), expecting the
// site's real phone-number + password login at public/login.html. This
// route used to render its own, unrelated NICKNAME + password login
// (ForumLoginModal) instead — a leftover from before the site moved to the
// static public/*.html pages (same class of drift as the old /tickets
// route). A subscriber given a password by an admin (who only knows their
// phone number, not a forum nickname) could never log in here, with a
// confusing "wrong password" error instead of a clear "wrong screen".
// Redirect to the real page instead of rendering the mismatched one.
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ href: "/login.html" });
  },
});
