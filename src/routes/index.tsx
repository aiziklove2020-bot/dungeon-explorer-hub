import { createFileRoute, redirect } from "@tanstack/react-router";

// The public homepage is now the static LIBRAL_PARTY design served from
// /public/index.html (and its sibling *.html pages). This route only exists
// so visits to the bare "/" land there. /admin is untouched and still the
// real React admin app.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ href: "/index.html" });
  },
});
