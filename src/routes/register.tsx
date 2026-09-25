import { createFileRoute, redirect } from "@tanstack/react-router";

// index.html's own "הצטרפות" (join) button links to /register, expecting
// the real "request to become a subscriber" page (public/register.html,
// which calls LPData.requestSubscription — the same subscriptionRequests
// queue the admin panel's "בקשות ממתינות" reviews). This route instead
// rendered a per-PARTY registration form (RegistrationForm, expecting
// day/partyId query params that a generic "join" link never provides) —
// the same class of stale link as the old /login and /tickets routes.
// No live code links here with those params either: per-event registration
// actually goes through public/register-event.html?partyId=... instead.
export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    throw redirect({ href: "/register.html" });
  },
});
