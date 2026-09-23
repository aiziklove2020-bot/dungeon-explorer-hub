---
name: rewire-admin-design
description: Use when the user wants to change the visual design/layout of the admin management panel (/admin) — colors, sidebar, tab styling, card layout — while keeping every tab, button and data flow working exactly as before. Also use when debugging why an admin-panel restyle broke a feature, or when deciding whether a change belongs in this panel vs the public site.
---

# Rewiring a new design into the admin panel (`/admin`)

This is the counterpart to `rewire-public-design`, for the **other** codebase
in this repo:

1. **`public/*.html`** — the public site. Covered by `rewire-public-design`.
2. **`src/`** — a React + TanStack Start SPA that is **only** the admin panel
   at `/admin`, entered through `src/routes/admin.tsx` → `src/pages/Admin.jsx`.
   **This skill is about (2).**

A visual redesign of the admin panel must never touch `public/*.html` or
`public/assets/site-data.js` — those serve real site visitors and have
nothing to do with how the business owner manages the site.

## Why this skill exists: don't lose things during a restyle

The admin panel isn't one page — it's ~25 independent tab sections, each
wired to its own Firestore collection(s) through its own `firebase/*.js`
functions. A "redesign" request is almost always about the **shell**
(colors, sidebar, spacing, card chrome) — the temptation is to rewrite
`Admin.jsx` wholesale, which risks silently dropping a tab, a handler, or a
prop a section needs. Restyle the shell in place; treat every tab section as
a black box you pass the same props to.

## The shell: `src/pages/Admin.jsx`

This is the one file that owns the visual frame — sidebar, mobile tab pills,
header, "advanced" tools toggle. Everything below `<div className="space-y-6">`
is just `{activeSection === 'X' && <XSection showSaved={showSaved} />}` for
each tab — **restyle around this block, don't restructure it**. If a new
design wants a different layout (e.g. cards instead of a sidebar, tabs on
top instead of the side), change the JSX that wraps the tab buttons and the
content `<div>`, but keep:

- The `adminTabs.filter(tab => !tab.advanced).map(...)` / `.filter(tab =>
  tab.advanced)` split — the "advanced" tools (DB backup, DB read-log, git
  history) are real working features the owner asked to be de-cluttered,
  not removed. A redesign that flattens them back into the main nav
  contradicts that decision.
- `activeSection` state driving which section renders — don't switch to
  routing per tab (e.g. real URLs per section) without checking first;
  nothing else in the codebase expects `/admin/parties` to exist.
- Every `showSaved={showSaved}` / `refreshKey={partiesRefreshKey}` prop
  passed into a section — these are the toast-on-save feedback and a party
  list refresh trigger respectively. Dropping them silently kills that
  section's "saved!" feedback or its refresh-after-post button.

## `adminTabs.js` — the tab list

`src/components/admin/adminTabs.js` is the single source of truth for which
tabs exist, their Hebrew labels, and which are "advanced". A redesign that
changes tab labels, icons or grouping edits **this file and the `TAB_ICONS`
map at the top of `Admin.jsx`** — never hardcode a duplicate tab list inside
new shell JSX, or the two will drift.

## Auth gate: `AdminAuthForm.jsx`

`Admin.jsx` renders `<AdminAuthForm onAuthenticated={...} />` instead of the
panel whenever `sessionStorage.admin_authenticated !== 'true'`. This is
sessionStorage-based (`admin_authenticated`, plus `admin_id`/`admin_username`
set elsewhere), not real routing-level auth — a redesign of the login screen
itself should restyle `AdminAuthForm.jsx` directly rather than working
around it. Do not remove the `useEffect` that defers reading
`sessionStorage` until after mount (`Admin.jsx:55-59`) — reading it during
the initial render causes an SSR/client hydration mismatch, since the server
never has a session.

## Each tab section is a self-contained black box

A `*Section.jsx` component (`SubscriptionsSection`, `ForumUsersSection`,
`PartiesSection`, `TelegramSection`, etc.) owns its own:

- Data fetching, usually via the shared `useAdminSection(fetchFn)` hook
  (`src/hooks/useAdminSection.js`) — gives `{ data, loading, error, reload }`.
- Firestore writes, always through named functions in `src/firebase/*.js`
  (`users.js`, `forumUsers.js`, `parties.js`, `subscriptions.js`,
  `crm.js`, etc.) — never raw Firestore calls inline in a section.
- Its own modals (`NewSubscriberModal`, `RenewSubscriptionModal`,
  `UserCrmModal`, ...) and inline edit-forms.

**Restyling a section's cards/forms is safe and expected** — colors,
spacing, button styling, layout of the fields. What's *not* safe without
checking first:

- Removing a button because "it looks cluttered" — verify with the user
  first; several of these are recent additions solving a specific reported
  pain point (e.g. the "🔑 איפוס סיסמה" button on each subscriber card
  exists because jumping to a separate tab to reset a login password was
  the exact complaint that got it added — see the two `SubscriptionsSection`
  commits in git history for the reasoning before "simplifying" it away).
  Read a section's file top-to-bottom before touching it — the code comments
  in this codebase consistently explain *why* a control exists, and that
  context also belongs in the redesign, not just the code today.
- Changing which two things live in one card vs. two tabs — see the note
  below on the subscriber/login-account split; that's intentional, not
  clutter to merge away.
- Reordering `handleX` calls inside a submit handler — several do
  multi-step writes in a specific order (e.g. create the login doc → approve
  it → link it to the subscriber → set its password) where getting the
  order wrong leaves an orphaned or unlinked record.

## Two records behind "one subscriber" — don't conflate them

A person the admin manages can have up to two separate Firestore docs:

- **`users/{id}`** — the subscriber/registration record: name, phone, gender,
  subscription tier & expiry, payment history. Managed in the
  **"ניהול משתמשים ומנויים"** tab (`SubscriptionsSection.jsx`).
- **`forumUsers/{id}`** — the site **login account**: nickname + bcrypt
  password, role, block state, email verification. Managed in the
  **"מנויי האתר"** tab (`ForumUsersSection.jsx`), and linked to a `users`
  doc via `linkedUserId`.

These used to back an actual discussion forum (removed — see
`git log --grep="discussion forum"`); the collection/component/function
names still say "forum" everywhere (`forumUsers.js`, `ForumAuthContext`,
etc.) purely as leftover naming, not because a forum still exists. A
redesign should **not** try to rename this collection or merge the two
tabs/collections into one — that's a real data-model change, not a visual
one, and would need to touch every `firebase/forumUsers.js` caller
(`ForumAuthContext`, `api/forum-auth.js`, `functions/issueForumChatToken.js`,
Firestore rules) plus a migration for existing docs. `SubscriptionsSection`
already surfaces the login-account actions (reset/create password) that
matter day-to-day directly on the subscriber card, precisely so the admin
doesn't need to think about the two collections separately — extend that
pattern (add more cross-links from one section into the other's data) rather
than merging the collections themselves.

## Styling conventions already in place

- Tailwind utility classes for layout/spacing/typography; **inline `style={}`
  for the actual color values** (`#0B0B0F`, `#121218`, `#ff5708` →
  `#ff7a29` gradient, `#94A3B8` muted text, `#93000a` danger). This split is
  consistent across the whole panel — a new palette should update these
  literal hex values everywhere they appear (there is no CSS variable/theme
  token layer to edit in one place) rather than introducing a second styling
  method alongside them.
- `lucide-react` icons throughout, mapped per-tab in `TAB_ICONS` and inline
  in each section's buttons.
- `src/styles/admin.css` holds a handful of extra rules referenced by class
  name (check it before assuming everything is inline-style-driven).
- RTL (`dir="rtl"`) and Hebrew copy throughout — a redesign keeps both.

## Verify after any admin-panel restyle

1. `npm run build` — this is a real Vite/TanStack Start build of `src/`; it
   will catch broken imports/JSX immediately.
2. Manually click through **every** tab in `adminTabs.js`, not just the ones
   touched — a shell change (e.g. the sidebar's `activeSection` wiring) can
   silently break tabs the diff never mentions.
3. Confirm the "advanced" toggle still shows/hides `db` / `dbLogger` /
   `gitHistory`, and that mobile's horizontal pill row still matches desktop's
   sidebar tab list (both read from the same `adminTabs` array — don't let
   a redesign special-case one of them into a separately hand-maintained list).
