import { createFileRoute, redirect } from "@tanstack/react-router";

// This route used to render a hard-coded, long-stale placeholder list of
// events (fake titles/dates/prices baked into the source, with a "הזמנה"
// button that had no onClick at all) — anyone who reached /tickets directly
// (an old bookmark or external link; nothing in the live site's own nav
// links here, see public/*.html) saw fictitious events and could not
// actually buy or register for anything. The real, live, Firestore-backed
// events list is public/events.html — same pattern as the "/" route above,
// which redirects to the real static homepage instead of rendering its own
// (now unmaintained) React version.
export const Route = createFileRoute("/tickets")({
  beforeLoad: () => {
    throw redirect({ href: "/events.html" });
  },
});
