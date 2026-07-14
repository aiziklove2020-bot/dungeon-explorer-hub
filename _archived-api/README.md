# Archived API routes

These 3 files were moved out of `/api` (so Vercel stops trying to deploy them
as serverless functions) because:

1. They import `../shared/partyExpiry.js`, a file that does not exist
   anywhere in this project export. That missing import was causing the
   deployment build to fail.
2. Nothing in the current live site (the pages under `src/routes/`) calls
   these endpoints or the legacy `/admin` panel they belong to — there is no
   `admin` route registered in `src/routes`, so this Firestore-driven
   content-publishing/git-sync system is not currently wired up.

If you still need this content-publishing workflow (publish-content,
publish-content-local, import-content-from-git) and the old `/admin` panel:

- You'll need to restore `shared/partyExpiry.js` (it likely still exists in
  your real GitHub repo's history — check the `main` branch there, or an
  earlier commit, since it's referenced consistently across the codebase).
- Move these files back into `/api`.
- Re-connect an `/admin` route in `src/routes` (or restore the legacy
  `src/App.jsx` + `src/pages/Admin.jsx` app shell), since none of that is
  part of the current TanStack Start site.

Until then, these files are safe to leave here — they're not deployed and
don't affect the live site.
