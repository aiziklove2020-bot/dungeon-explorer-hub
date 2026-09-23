---
name: rewire-public-design
description: Use when the user wants to swap in a new visual design/HTML for the public LIBRAL PARTY site (pages under public/*.html) while keeping it wired to the existing admin panel and data. Also use when debugging why a change to public/ isn't showing live, or when editing public/assets/site-data.js.
---

# Rewiring a new design into the public site

This site has two separate codebases living in one repo. Keeping them separate is
the whole point of this skill: a new visual design only ever touches bucket (1),
never (2).

1. **`public/*.html`** — plain static HTML/CSS/vanilla-JS pages (about, contact,
   events, my-area, event, register, login, admin-facing advertiser pages, etc).
   This is what real visitors see. **This is what gets restyled when the user
   brings a new design.**
2. **`src/`** — a React + TanStack Start SPA that is the **admin panel only**
   (`/admin`). The business owner manages parties, subscribers, balance matches,
   Telegram, etc. here. A redesign of the public site never needs to touch this.

The two talk to the same Firestore data through one shared contract, described
below. As long as the new HTML calls the same functions, the admin panel
"just works" with zero changes on the admin side.

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
`public/assets/site-data.js`). A new design's JS should call these by name —
never reach into Firestore directly, never duplicate this logic:

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
| `requestSubscription()` | "I want to be a subscriber" lead form |
| `toggleFavorite()` / `loadMyFavorites()` / `loadFavoriteAlerts()` | favorites (subscriber-only) |
| `loadMyBalanceMatch()` / `shareMyBalancePhone()` | balance-match display + phone-share toggle |
| `loadMyPersonalArea(phone)` | **the big one for `/my-area`** — returns `{profile, registrations, balanceMatch, favorites}` in one call, keyed by phone number, no login required |
| `uploadMyProfilePhoto()` | personal-area avatar upload |
| `loadMyForumPersonalArea()` / `changeMyForumPassword()` | forum-account personal area |
| `registerPushSubscription()` | Web Push opt-in |

Other globals a new design can rely on (defined in `public/assets/app.js`,
loaded via plain `<script src="assets/app.js?v=...">`, not a module):

- `toast(msg, kind)` — the site's toast/snackbar notification
- `window.LP.current()` / `LP.setCurrent()` — the **forum/advertiser** logged-in
  session (localStorage-based, separate from the phone lookup below)
- `window.lpWireFavHearts(container)` — wires up ♥ buttons inside a container
- `window.lpEnablePushNotifications(phone)` — the "enable push" button handler

## Two identity models — don't conflate them

- **Phone-only lookup** (`/my-area`): no password. Visitor types the phone
  number they registered a party with; `loadMyPersonalArea(phone)` looks up
  everything by that number. This is how one-time registrants *and*
  subscribers alike see their balance match, registrations, favorites.
  Session is just `localStorage.setItem("lp_my_area_phone", phone)` for
  convenience — not real auth.
- **Forum accounts** (`login.html` / `register.html`): nickname + password,
  a genuinely separate feature (`forumUsers` collection, `LP.current()`
  session). Do not merge this with the phone lookup when redesigning — the
  business owner confirmed these must stay separate.
- **Advertiser accounts**: their own login (`advertiser-login.html`), session
  also via `LP.current()` with `role: "advertiser"`, admin-approved before
  first use.

## Routing: keep `vercel.json` in sync

Clean URLs are Vercel rewrites, not real folders:

```json
{ "source": "/about", "destination": "/about.html" }
```

If a redesign **renames** a page file, add/update the matching entry in both
`rewrites` (clean URL → file) and `redirects` (old `.html` URL → clean URL,
301) in `vercel.json`, and delete any stale entry whose target file no longer
exists (a dead rewrite silently 404s if anyone still links to it).

## `public/assets/site-data.js` — hand-maintained, edit with care

This file is a **pre-minified bundle, not generated by any build step** —
there is no `vite build` for it. Editing it means hand-patching minified code
by finding known variable names. A new design should almost never need to
touch this file (it should only need to *call* `window.LPData.*`). If a new
UI genuinely needs a new backend function:

1. **Never** insert a new function as `name = async (x) => {...}` or
   `let name = ...` in the middle of one of this file's many
   `var a, b, c = o((() => { ...body... })())` lazy-init chunks. Those
   chunks' variable names (`a, b, c, ...`) are the *only* legally declared
   identifiers in that scope; anything else assigned there either throws
   `ReferenceError` at module-load time (killing the **entire site**, not
   just that feature — this happened once already) or silently shadows an
   exported variable if written with `let`/`const`.
2. **Always** add new logic as a standalone top-level declaration instead:
   ```js
   async function myNewHelper_(arg) { ... }
   ```
   A real function declaration hoists safely regardless of the surrounding
   `var` chains, and can be referenced from anywhere below it in the file.
3. Add it to the `window.LPData = {...}` object at the end so pages can call
   it as `window.LPData.myNewHelper`.
4. After any edit: `node --check public/assets/site-data.js` (syntax only —
   does **not** catch the ReferenceError class of bug above, since that's a
   runtime/strict-mode error, not a syntax error) and
   `grep -c "myNewHelper_" public/assets/site-data.js` to confirm exactly the
   expected number of occurrences (no accidental duplicate declarations).

## Cache-busting — bump the version on every site-data.js change

Every `public/*.html` file imports it as
`./assets/site-data.js?v=YYYYMMDDHHmm`. `vercel.json` serves `/assets/(.*)`
with `Cache-Control: public, max-age=300, stale-while-revalidate=3600` —
keyed by the full URL including `?v=`. **If you edit `site-data.js` without
bumping this query string on every page that imports it, visitors and the
CDN can keep serving the old cached file indefinitely after deploy**, making
a real fix look like it didn't work. Bump it with one search-and-replace
across all `public/*.html` files whenever `site-data.js` content changes.

HTML pages themselves are served with `Cache-Control: no-store` (never
cached), so this only matters for `/assets/*.js`.

## Deploy workflow

1. `npm run build` locally after any change — sanity-checks the whole repo
   (Vite build of `src/`, plus copies `public/` through).
2. `git status --short` — confirm only the intended files changed.
3. Commit, push to the branch named in this session's system prompt, open a
   **new** PR (a branch whose previous PR already merged needs a fresh PR —
   don't try to reuse a merged one), merge it.
4. Vercel auto-deploys `main` on merge — **but the project is on a plan with
   a 100-deployments/24h cap**. If many small pushes happen in one session,
   this cap can be hit, and *both* preview and production auto-deploys go
   silently quiet (no error anywhere in GitHub) until it resets ~24h later.
   Symptom: a merged PR's content is verifiably correct on `main`, but the
   live site doesn't change. Fix/workaround: in the Vercel dashboard →
   Deployments → "..." (top-level menu, not a specific deployment's menu) →
   **Create Deployment** → pick the `main` branch (it'll show the latest
   commit) → **Deploy to Production**. This one-off manual deploy is not
   subject to the same block in the same way and reliably gets unstuck.
