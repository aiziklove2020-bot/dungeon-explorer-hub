---
name: libral-party-site
description: Use for ANY work on the LIBRAL PARTY codebase — swapping in a new visual design (public site or admin panel, e.g. from Stitch), debugging why a change isn't showing live, editing public/assets/site-data.js, or fixing a bug anywhere in the site. Covers the two-codebase architecture, the window.LPData data contract, and a running list of real bugs already found and fixed (so they don't get reintroduced).
---

# The LIBRAL PARTY site — architecture, data contract, and known pitfalls

This is the one skill for this whole repo. It replaces two earlier separate
skills (`rewire-public-design`, `rewire-admin-design`) — merged here because
a new visual design, a bug fix, and a Stitch-based redesign all need the same
underlying map of the codebase, and keeping that map in one place is what
stops it from drifting out of date.

## The two-codebase split — the single most important fact about this repo

1. **`public/*.html`** — plain static HTML/CSS/vanilla-JS pages (home, about,
   contact, events, my-area, event, register, login, advertiser pages, etc).
   **This is the real, live public site every visitor sees.**
2. **`src/`** — a React + TanStack Start SPA that is **only** the admin panel
   at `/admin`, entered through `src/routes/admin.tsx` → `src/pages/Admin.jsx`.
   The business owner manages parties, subscribers, balance matches, Telegram
   settings, etc. here.

**A visual redesign of one never touches the other.** They share data through
one contract only (below) — never let a redesign reach into Firestore
directly from new code, and never let "restyle the admin panel" turn into
editing `public/*.html` or vice versa.

**A third trap**: `src/routes/*.tsx` also defines routes like `/login`,
`/register`, `/tickets` that predate the site's move to static `.html`
pages. These can still be live and reachable (via routing/rewrites) even
though they render completely different, stale functionality — e.g. a real
incident where `/login` served a dead nickname-login form instead of the
site's actual phone+password login on `public/login.html`. If a route file
under `src/routes/` isn't the admin panel and isn't a deliberate redirect
shim (`throw redirect({ href: "/whatever.html" })`), treat it as suspect and
verify what it actually renders before assuming the `.html` file is what's
live.

## The data contract: `window.LPData`

Every public page that needs live data does:

```html
<script type="module">
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await import("./assets/site-data.js?v=<CURRENT_VERSION>");
  } catch (err) {
    console.error("site-data.js failed to load:", err);
    return; // fail visibly, don't leave the page half-registered
  }
  // window.LPData.* is now available
});
</script>
```

`window.LPData` is the entire public API surface (defined at the bottom of
`public/assets/site-data.js`). New page JS should call these by name — never
reach into Firestore directly, never duplicate this logic:

| Function | Used for |
|---|---|
| `loadEvents()` | homepage/events/calendar party listings |
| `loadSocialLinks()` | footer/homepage social icons |
| `loadNewsFeed()` | news page |
| `loadAbout()` | about page copy |
| `loadContact()` | contact page (description, WhatsApp link, alert text) |
| `supportChat()` | the floating support-chat widget |
| `loadStore()` / `createStoreOrder()` | merch store |
| `communityChat()` | community page |
| `registerAdvertiserAccount()` / `loginAdvertiser()` | advertiser signup/login |
| `register()` / `login()` | forum (nickname+password) accounts |
| `checkMyAccountStatus()` | forum session validity check |
| `getMembershipStatus()` | subscription tier lookup |
| `updateMyProfile()` / `uploadImage()` | forum profile editing |
| `createAdvertiserParty()` / `loadAdvertiserParties()` / `getAdvertiserParty()` / `updateAdvertiserParty()` / `deleteAdvertiserParty()` | advertiser's own party CRUD |
| `publishPartyToTelegram()` | manual Telegram publish button |
| `registerForParty()` | party registration form |
| `requestSubscription()` | "I want to be a subscriber" lead form — this is also where a login page's "don't have an account?" link should point, not `/contact` |
| `toggleFavorite()` / `loadMyFavorites()` / `loadFavoriteAlerts()` | favorites (subscriber-only) |
| `loadMyBalanceMatch()` / `shareMyBalancePhone()` | balance-match display + phone-share toggle |
| `loadMyPersonalArea(phone)` | **the big one for `/my-area`** — returns `{profile, registrations, balanceMatch, favorites}` in one call, keyed by phone number, no login required |
| `uploadMyProfilePhoto()` | personal-area avatar upload |
| `loadMyForumPersonalArea()` / `changeMyForumPassword()` | forum-account personal area |
| `registerPushSubscription()` | Web Push opt-in |

Other globals a page can rely on (defined in `public/assets/app.js`, loaded
via plain `<script src="assets/app.js?v=...">`, not a module):

- `toast(msg, kind)` — the site's toast/snackbar notification
- `window.LP.current()` / `LP.setCurrent()` — the **forum/advertiser** logged-in
  session (localStorage-based, separate from the phone lookup below)
- `window.lpWireFavHearts(container)` — wires up ♥ buttons inside a container
- `window.lpEnablePushNotifications(phone)` — the "enable push" button handler

## Two identity models — don't conflate them

- **Phone-only lookup** (`/my-area`, and the real subscriber login flow):
  the site's actual login is **phone number + password**, not a nickname.
  `loadMyPersonalArea(phone)` looks up everything by that number — no
  separate account needed. Session is just
  `localStorage.setItem("lp_my_area_phone", phone)` for convenience, not
  real auth.
- **Forum accounts** (`login.html` / `register.html`, `forumUsers`
  collection): nickname + password internally, but the login page bridges
  this to phone+password by looking up a `forumUsers` doc by its `phone`
  field first. Do not merge this with the phone-only lookup above — the
  business owner confirmed these must stay separate, even though they now
  share the same login page.
- **Advertiser accounts**: their own login (`advertiser-login.html`), session
  also via `LP.current()` with `role: "advertiser"`, admin-approved before
  first use.

## The admin panel (`src/`)

The panel isn't one page — it's ~25 independent tab sections, each wired to
its own Firestore collection(s) through its own `firebase/*.js` functions.
A "redesign" request is almost always about the **shell** (colors, sidebar,
spacing, card chrome) — restyle it in place; treat every tab section as a
black box you pass the same props to. Don't rewrite `Admin.jsx` wholesale.

- **`src/pages/Admin.jsx`** owns the visual frame (sidebar, mobile tab pills,
  header, "advanced" tools toggle). Restyle around
  `{activeSection === 'X' && <XSection showSaved={showSaved} />}`, don't
  restructure it. Keep: the `tab.advanced` filter split, `activeSection`
  state (don't switch to per-tab routing), and every prop passed into a
  section (`showSaved`, `refreshKey`, etc. — these drive real save-feedback
  and refresh behavior, not decoration).
- **`src/components/admin/adminTabs.js`** is the single source of truth for
  which tabs exist, their Hebrew labels, and which are "advanced". Edit this
  (and the `TAB_ICONS` map in `Admin.jsx`) — never hardcode a duplicate tab
  list in new shell JSX.
- **`AdminAuthForm.jsx`** gates the whole panel via
  `sessionStorage.admin_authenticated`, checked only after mount (avoids an
  SSR hydration mismatch) — not real routing-level auth.
- Each `*Section.jsx` owns its own data fetching (usually
  `useAdminSection(fetchFn)`), its own Firestore writes (always through
  named `src/firebase/*.js` functions, never raw Firestore calls inline),
  and its own modals. Restyling cards/forms is safe; removing a button or
  reordering a multi-step submit handler is not, without checking first —
  several exist to solve a specific reported pain point (read the section's
  top-of-file comments before "simplifying" anything away).
- **Two records behind "one subscriber"** — don't conflate or merge these:
  - `users/{id}` — the subscriber/registration record (name, phone, gender,
    subscription tier & expiry, payments). Managed in "ניהול משתמשים ומנויים"
    (`SubscriptionsSection.jsx`).
  - `forumUsers/{id}` — the site **login account** (nickname + bcrypt
    password, role, block state), linked via `linkedUserId`. Managed in
    "מנויי האתר" (`ForumUsersSection.jsx`). The "forum" naming is legacy (an
    actual discussion forum was removed) — don't rename the collection or
    merge the two tabs; that's a data-model migration, not a visual one.
- Styling: Tailwind for layout/spacing, **inline `style={}` for actual color
  values** (no CSS variable/theme layer — a new palette updates literal hex
  values everywhere they appear). `lucide-react` icons. RTL + Hebrew
  throughout.
- Verify after any admin restyle: `npm run build`, then click through
  **every** tab (not just the ones touched), and confirm the "advanced"
  toggle and mobile pill row still match `adminTabs.js`.

## Routing: keep `vercel.json` in sync

Clean URLs are Vercel rewrites, not real folders:

```json
{ "source": "/about", "destination": "/about.html" }
```

If a redesign **renames** a page file, add/update the matching entry in both
`rewrites` (clean URL → file) and `redirects` (old `.html` URL → clean URL,
301), and delete stale entries whose target no longer exists. **Caveat**:
this file's rewrites/redirects have not always matched observed live
routing behavior during this project's history (a page's real behavior was
once traced to a `src/routes/*.tsx` file shadowing the intended static
page, not to anything in `vercel.json`) — verify a page's actual live
behavior rather than assuming it from `vercel.json` alone.

## `public/assets/site-data.js` — hand-maintained, edit with care

This file is a **pre-minified bundle, not generated by any build step** —
there is no `vite build` for it, and it has its **own independent
implementations** of business logic (registration, phone normalization,
Telegram sending, etc.) that can silently drift out of sync with the
"canonical" logic in `src/firebase/*.js`. **Any bug fix made in `src/` that
also has a live-site code path must be ported here too** — this has already
been the root cause of multiple real incidents (see Known pitfalls below).

If a new UI genuinely needs a new/changed backend function here:

1. **Never** insert a new function as `name = async (x) => {...}` or
   `let name = ...` in the middle of one of this file's many
   `var a, b, c = o((() => { ...body... })())` lazy-init chunks. Those
   chunks' variable names (`a, b, c, ...`) are the *only* legally declared
   identifiers in that scope; anything else assigned there either throws
   `ReferenceError` at module-load time (killing the **entire site**, not
   just that feature) or silently shadows an exported variable if written
   with `let`/`const`.
2. **Always** add new logic as a standalone top-level declaration instead:
   ```js
   async function myNewHelper_(arg) { ... }
   ```
   A real function declaration hoists safely regardless of the surrounding
   `var` chains, and can be referenced from anywhere below it in the file.
   Existing top-level helper functions (e.g. the `isPartyExpiredByDate`
   family, `OO`/`kO`/`jO`/etc. — see Known pitfalls) are already available
   this way without re-importing anything.
3. Add it to the `window.LPData = {...}` object at the end so pages can call
   it as `window.LPData.myNewHelper`.
4. After any edit: `node --check public/assets/site-data.js` (syntax only —
   does **not** catch the ReferenceError class of bug above) and
   `grep -c "myNewHelper_" public/assets/site-data.js` to confirm exactly
   the expected number of occurrences (no accidental duplicate
   declarations).

## Cache-busting — bump the version on every site-data.js/app.js change

Every `public/*.html` file imports it as
`./assets/site-data.js?v=YYYYMMDDHHmm` (same pattern for `app.js`).
`vercel.json` serves `/assets/(.*)` with a long cache lifetime keyed by the
full URL including `?v=`. **If you edit either file without bumping this
query string on every page that imports it, visitors and the CDN can keep
serving the old cached version indefinitely after deploy**, making a real
fix look like it didn't work. Bump with one search-and-replace across all
`public/*.html` files whenever either file's content changes:

```bash
NEWV=$(date -u +%Y%m%d%H%M)
for f in public/*.html; do sed -i -E "s/(site-data\.js|app\.js)\?v=[0-9]+/\1?v=$NEWV/g" "$f"; done
```

HTML pages themselves are served with `Cache-Control: no-store`, so this
only matters for `/assets/*.js`.

## Deploy workflow

1. `npm run build` locally after any change — sanity-checks the whole repo
   (Vite build of `src/`, plus copies `public/` through).
2. `git status --short` — confirm only the intended files changed.
3. Commit, push to the branch named in this session's system prompt.
4. **Direct merge to `main` is blocked by an auto-mode classifier
   ("Merge Without Review") — open a PR instead and have the site owner
   click Merge in the GitHub UI.** A branch whose previous PR already
   merged needs a fresh PR for new commits — never stack on a merged PR.
5. A change that **removes or narrows an existing permission/auth check**
   (even to fix a bug an unrelated tightening caused) is flagged as
   "Security Weaken" and needs the owner's explicit approval **before**
   attempting the edit, and every git command touching that file (add,
   commit, even `node --check`) may still be blocked afterward regardless
   of that approval — in that case the owner has to apply the diff
   themselves directly on GitHub (give them the exact file content).
6. Vercel auto-deploys `main` on merge — **but the project is on a plan
   with a 100-deployments/24h cap**. If many small pushes happen in one
   session, this cap can be hit, and both preview and production
   auto-deploys go silently quiet (no error anywhere in GitHub) until it
   resets ~24h later. Symptom: a merged PR's content is verifiably correct
   on `main`, but the live site doesn't change. Fix: Vercel dashboard →
   Deployments → "..." (top-level menu) → **Create Deployment** → `main` →
   **Deploy to Production**.

## Known pitfalls already found and fixed — don't reintroduce these

- **Registration race condition**: both `registerToPartyNew`/
  `registerCoupleToParty` (`src/firebase/parties.js`) and their live-bundle
  copies (`lM`/`fM` in `site-data.js`) must do their duplicate-check,
  capacity-check, and write **inside a single Firestore transaction**
  (fresh `tx.get()`, not a cached read; `tx.update()`, not a plain
  `updateDoc`). Without this, two near-simultaneous registrations for the
  same last spot (or same phone) can both pass the checks and both
  succeed — this happened live. The bundle's `runTransaction` alias is
  `hd`; find it via `runTransaction: () => hd` in its exports map.
- **Party `date` vs `expiration`**: a party's `date` field is Israel-midnight
  of its *labeled* day (a "Friday" party is stored as Friday's own 00:00) —
  comparing it directly against "now" makes the party look expired partway
  through its own day, hours before it actually happens. Any "is this party
  still current" check must prefer the stored `expiration` Timestamp
  (already computed correctly elsewhere, accounting for the admin's
  retention window) and only fall back to `isPartyExpiredByDate()` for
  legacy parties without one. This broke `getMyRegistrations` (silently
  hiding same-day registrations from "my area") in both `src/` and the
  live bundle (where the equivalent helpers already exist as top-level
  functions — no need to reimplement the Israel-timezone math there).
- **`api/telegram-relay.js` / similar shared endpoints**: don't assume an
  endpoint's only caller is the admin panel just because that's the only
  *documented* caller — `sendMessage`/`sendPhoto` here are also called
  anonymously by the public registration flow (with no admin secret
  available, since that code is public). Gating a shared endpoint entirely
  behind `requireAdminApiSecret` silently broke that flow. When narrowing
  access to an endpoint, gate only the genuinely admin-only actions
  (bot/webhook management) and keep the ones a public flow legitimately
  needs open.
- **`users/{userId}` delete is `allow delete: if false`** in
  `firestore.rules` (no real per-user Firebase Auth for the rule to trust)
  — a plain client `deleteDoc()` on a user always fails with "insufficient
  permissions". Route any user-delete through `api/admin-settings.js`
  (Admin SDK + `requireAdminApiSecret`), same pattern as every other
  admin-only user mutation there (`admin-remove-admin`, `admin-set-level`,
  etc.) — don't add a new direct client write/delete on `users` or
  `forumUsers` without checking whether the rule already blocks it.
- **`targetUserIsAdmin()`-style rule helpers**: dot-notation on a possibly-
  missing field (`resource.data.isAdmin`) throws a runtime error inside a
  Firestore security rule, and a thrown error denies the *whole* request —
  use `.data.get('isAdmin', false)` for optional fields instead.
- **Firestore query-provability**: a rule like
  `allow read: if resource.data.isAdmin != true` looks fine for a
  single-doc `get()`, but an unconstrained `getDocs(collection(...))` query
  against that same rule fails entirely with permission-denied (Firestore
  rules must be provable from the query's own filters, it never
  fetch-then-filters) — this broke the entire admin subscriber list.
