---
name: libral-party-site
description: Use for ANY work on the LIBRAL PARTY codebase (libralparty.net) — public pages in public/*.html, the hand-maintained public/assets/site-data.js (window.LPData), the React admin panel in src/, the Vercel API in api/, the Telegram bot and campaign jobs, the agent team and its chat, TikTok/SEO content, mobile layout, and debugging why a change isn't live. This is the single, complete skill for the whole site and reflects its current state.
---

# LIBRAL PARTY — the complete map of the site (current state)

One skill for the whole repo. Read the section you need; every rule here exists
because of a real incident or an explicit owner decision.

## 0. Working with the owner

- The owner writes Hebrew, short messages, and is "the manager": **do what is
  asked, nothing extra**. Do not invent behaviour (a past example: adding a
  forced password reset nobody asked for was rejected and removed).
- If a request is genuinely ambiguous, ask one short question (use the
  question tool with concrete options); otherwise act.
- Answer in short Hebrew. Say plainly what was done, what was *not* verified,
  and what only the owner can do (opening accounts, approvals, deleting data).
- The owner pre-approved merging PRs automatically (also for the Claude
  routines). Merge with the GitHub MCP tool `merge_pull_request`, method
  `merge`, after tests/build pass. Never rewrite published history.
- There is **no Lovable connection**. Do not mention Lovable.
- Never put secrets (bot tokens, `ADMIN_API_SECRET`, `TELEGRAM_PROMO_SECRET`,
  Firebase credentials) in code, commits, docs or chat. `settings/telegram`
  holds bot tokens in Firestore — never print them.
- Deleting production data (e.g. a Firestore party) is blocked by the auto-mode
  classifier. Do the code fix, then tell the owner exactly what to delete in
  the admin panel.

## 1. The codebase

| Path | What it is |
|---|---|
| `public/*.html` | The **live public site** (static HTML + vanilla JS). Served with clean URLs via `vercel.json` rewrites. |
| `public/assets/site-data.js` | ~1.25 MB hand-maintained, pre-minified bundle; exposes `window.LPData`. See §4. |
| `public/assets/app.js` | Shared site JS (toast, session, favourite hearts, cookie/push banners, form enhancer). |
| `public/assets/design/style.css` | The single stylesheet (many appended rule blocks; later rules win). |
| `src/` | React + TanStack admin panel only (`/admin`, `src/pages/Admin.jsx`, tabs in `src/components/admin/`). |
| `api/` | Vercel serverless functions, **one function per file**. `api/telegram-webhook.js` holds all scheduled/jobs (`?job=...`). `api/admin-settings.js` is the authenticated settings/agent-chat endpoint. |
| `shared/` | Plain JS used by both server and admin: `agentsRoster.js`, `agentCommands.js`, `a2a.js`, `registrationAccess.js`, `telegramCampaigns.js` (generated), `tiktokPack.js` (generated). |
| `scripts/campaigns/make_campaigns.py`, `scripts/tiktok/make_tiktok.py` | Generators for campaign / TikTok images and the generated `shared/*.js`. |
| `tests/api/` | Vitest unit tests for the server/shared logic. |
| `docs/` | `agents-roster.md`, `tiktok-pack.md`. |
| `public/.well-known/agent-card.json` | Generated from `teamCard()` in `shared/a2a.js`; a test asserts it matches the roster. |

A redesign or fix of `public/` never touches `src/` and vice versa. `src/routes/*.tsx`
may contain stale routes (`/login`, `/register`…) that predate the static pages;
unless a route is the admin panel or a deliberate redirect shim, verify what it
really renders before trusting the `.html` file is what's live.

## 2. Hosting, deploys, git

- Hosted on **Vercel** (domain libralparty.net, `www.` canonical). Firebase
  project `tbdsm-5acca` (Firestore). Two Vercel projects exist.
- Vercel caps **100 deployments / 24 h** (error `api-deployments-free-per-day`).
  Symptom: merged code is correct but the site doesn't change; the admin panel
  runs on the same Vercel site so it also stops updating. Fix: wait for the reset
  or Vercel → Deployments → Create Deployment from `main`. **Push as little as
  possible; batch work into few commits/PRs.** The owner was advised to add an
  Ignored Build Step so docs-only pushes don't deploy.
- Branch for this work: `claude/liberal-suite-followup` (or the branch the
  session names). Flow: commit → push → PR (`create_pull_request`, base `main`)
  → `merge_pull_request` (method `merge`). A merged branch must be restarted
  from `main` before new work (never stack on a merged PR).
- Commit messages end with the attribution lines the session specifies; PR
  bodies end with the generated-with line. **Never name a model in
  commits/PRs/code.**
- Cron (`vercel.json`): `0 9 * * 0-4` → `/api/telegram-webhook` (daily jobs:
  reminders, campaign, group promo, TikTok prep, instagram, health) and
  `0 3 * * *` → `?job=cleanup-parties`.
- The sandbox cannot reach libralparty.net. It *can* read Firestore REST for
  public collections (`settings/*`, `parties`). Writes to `settings/*` need the
  Admin SDK / `api/admin-settings.js` (bearer secret) — not available from the
  sandbox. Job URLs (`?job=...&key=<TELEGRAM_PROMO_SECRET>`) are run by the owner.

## 3. Cache-busting (check all three every time)

Every `public/*.html` loads `assets/site-data.js?v=YYYYMMDDHHmm`,
`assets/app.js?v=…`, `assets/design/style.css?v=…`. `/assets/*` is cached for
a day (+stale-while-revalidate); HTML is `no-store`. After editing any of the
three files bump **all** pages:

```bash
V=$(date +%Y%m%d%H%M)
sed -i -E "s/(site-data\.js\?v=)[0-9]{12}/\1$V/g; s/(assets\/app\.js\?v=)[0-9]{12}/\1$V/g; s/(design\/style\.css\?v=)[0-9]{12}/\1$V/g" public/*.html
```

Replacing an image under the same name (e.g. the hero) needs a `?v=` on its URL
too. Some pages import site-data.js inside a module with its own `?v=` — grep
before assuming the bump reached it.

## 4. `public/assets/site-data.js` — edit with care

- Not generated by any build step; it duplicates logic from `src/firebase/*.js`.
  **A fix in `src/` that also has a live-site path must be ported here.**
- **Never** insert code in the middle of the giant `var a, b, c = o((...)())`
  lazy-init chains (throws ReferenceError at load and kills the whole site).
  Add a standalone top-level `function name_()` / `async function name_()` and
  expose it on `window.LPData` at the end.
- After editing: `node --check public/assets/site-data.js`, then grep that the
  new name occurs the expected number of times. Syntax check does not catch
  scope ReferenceErrors — also load a page in a browser with the real file
  when the edit is non-trivial.

### `window.LPData` (the only API public pages use)

`loadEvents`, `loadSocialLinks`, `loadNewsFeed`, `loadAbout`, `loadContact`,
`supportChat`, `loadStore`/`createStoreOrder`, `communityChat`,
`registerAdvertiserAccount`/`loginAdvertiser`, `register`/`login`,
`checkMyAccountStatus`, `getMembershipStatus`, `updateMyProfile`/`uploadImage`,
`createAdvertiserParty`/`loadAdvertiserParties`/`getAdvertiserParty`/
`updateAdvertiserParty`/`deleteAdvertiserParty`, `publishPartyToTelegram`,
`registerForParty`, **`requestSubscription(name, phone, note, plan)`**
(plan = `bdsm` | `swingers` | `combined`), `toggleFavorite`/`loadMyFavorites`/
`loadFavoriteAlerts`, `loadMyBalanceMatch`/`shareMyBalancePhone`,
`loadMyPersonalArea(phone)`, `uploadMyProfilePhoto`, `loadMyForumPersonalArea`/
`changeMyForumPassword`, `registerPushSubscription`.

Globals from `app.js`: `toast(msg, kind)`, `window.LP.current()/setCurrent()`
(forum/advertiser session), `lpWireFavHearts(container)`,
`lpEnablePushNotifications(phone)`, `lpEasyForms` (form enhancer).

## 5. Identity, accounts, personal area

- Three separate identity models — never merge them: **members** (phone +
  password; `users` + `forumUsers`), **advertisers/producers**
  (`advertiser-login.html`, admin-approved, `LP.current()` with
  `role:"advertiser"`), and the phone-only lookup used by `/my-area`.
- `users/{id}` = subscriber record (tier, expiry, payments); `forumUsers/{id}` =
  login account (linked via `linkedUserId`). Legacy name "forum"; do not rename
  or merge the collections/tabs.
- **Women**: free lifetime membership. Every woman gets an account with the
  starter password **`102040`** (created by the nightly cleanup job,
  `WOMEN_STARTER_PASSWORD`, with `displayName`). **Nobody is forced to change
  the password** (no `mustResetPassword`) — owner decision.
- **Personal area**: `/profile` lets a signed-in member edit name, password and
  photo; `/my-area` redirects signed-in members there. Both pages exist.
- **Favourites** (members only, never producers): a heart on a producer's party
  saves *all* of that producer's parties in the member's favourites, without
  showing the producer's name. Hearts are hidden for advertisers.
- Producers receive registrations for their own parties in their own area.
- Signed-in members never retype their details in registration forms
  (`register-event.html` prefills/hides name/phone); only one-time customers
  fill everything. Producer **ticket-link** parties start with no registration
  type selected ("בחרו סוג הרשמה").
- Membership signup (`/register`): the plan is a required field, prefilled from
  `/membership` buttons (`/register?plan=bdsm|swingers|combined`), saved as
  `plan` on `subscriptionRequests`, shown in the admin and in the Telegram
  notification.

## 6. Registration rules (parties)

- `parties/{id}.registrationMode`: `auto` | `open` | `closed`, set per party in
  the admin PartyEditor ("מצב ההרשמה"). **Only `closed` blocks**, for every
  type including couples. **There is no time-based cutoff** (the old 21:00 rule
  was removed; the party starts 23:30 and the owner opens/closes manually).
- Single registration is allowed any time; shared logic in
  `shared/registrationAccess.js` (`registrationBlockedReason`), used by
  `src/firebase/parties.js` and mirrored in `site-data.js`
  (`lpRegistrationBlockedReason_`; mapper fields `registrationMode`,
  `registrationClosed`, `singlesClosed:false`). `register-event.html` shows
  `#regClosed`.
- Parties that are external links and not related to the site are not "ours".
- Registrations must be done inside a Firestore **transaction** (duplicate +
  capacity check + write together) in both `src/firebase/parties.js` and the
  bundle copies — a race once let two people take the last spot.
- A party's `date` is Israel-midnight of its labeled day; "is it still current"
  must use the stored `expiration` first (`isPartyExpiredByDate` only as
  fallback), or same-day registrations vanish from "my area".
- **Producer duplicates**: `createAdvertiserParty` (`YU` in the bundle) refuses a
  second party by the same producer with the same title within 24 h of the same
  date; `create-event.html` keeps the submit button disabled after success and
  shows a toast + scrolls to the message on error. A double-click once created
  two identical parties one second apart.
- **Balance (איזון)**: matches live in `parties.balanceMatches`. A woman may
  reveal her phone to her match herself; the admin can also toggle it
  ("📱 חשוף את הנייד לגבר" / "📵 הסתר…") on a matched pair in the matches tab
  (`handleTogglePhoneShared`, only for non-couple matches).

## 7. Public pages & front-end behaviour

- **Home (`index.html`)**: hero image `assets/design/hero-v3(.webp|-800.webp)`
  (square 1254²; text and icons are part of the image) with clickable hotspot
  `<a class="hs">` areas positioned in % over it (two buttons, four feature
  tiles, five social icons: Instagram, Facebook, Telegram group, Telegram
  channel, WhatsApp). Social links come from `loadSocialLinks()`; an area with
  `href="#"` and no configured link is disabled; Facebook defaults to the group
  link. When the hero image changes, **re-measure every hotspot** and verify by
  drawing the rectangles over the image.
- **Banners** (WhatsApp, Instagram, Facebook group) are grid pieces rotating
  between the party cards: one after every 2 cards on phones, after every full
  row of 3 on desktop (a banner spans `grid-column:1/-1`). With few parties one
  banner goes at the end. Facebook group link (clean, no tracking params):
  `https://www.facebook.com/share/g/1D7ng47o28/`.
- **Cookie notice** (`lpWireCookieBanner` in `app.js`) styled like the push
  banner; the push banner is deferred so they don't collide. **Privacy policy**
  `public/privacy.html` (draft Hebrew text — needs lawyer review).
- **Forms**: `lpEasyForms` / `lpEnhanceField_` normalise phones (`lpNormalizePhone_`),
  set correct `autocomplete`/`inputmode`/`type`, via a MutationObserver. New forms
  get this for free; do not fight it.
- **Support chat** widget (`pW()` in the bundle): header buttons are
  **התנתקות** (clears `support_chat_session` + `lp_support_chat_name`, rebuilds the
  widget), minimise and close. Icons are inline SVG (Material Symbols text once
  rendered as raw words).
- **SEO**: landing pages `/swingers-parties` and `/bdsm-parties` (FAQPage JSON-LD,
  rewrites in `vercel.json`, in `sitemap.xml`, footer links on every page).
  `robots.txt` allows everything public. The owner must verify the domain in Google
  Search Console and submit the sitemap — it cannot be done from the repo. No
  guarantee of ranking.
- **Mobile**: the viewport meta must **not** contain `maximum-scale`/`user-scalable=no`.
  Tap targets ≥44 px (`.btn`, menu, footer links, breadcrumbs), checkboxes 24 px,
  body text not tiny. Verify at 320, 360, 390, 430 px that
  `document.documentElement.scrollWidth` equals the viewport width (the header
  brand needed special rules at ≤340 px). Appended CSS blocks at the end of
  `style.css` are the place for fixes.
- Desktop party cards are compact (a long card was rejected by the owner);
  keep them short.

## 8. Admin panel (`src/`)

- `Admin.jsx` owns the shell; `adminTabs.js` is the single list of tabs (add a
  tab there **and** the icon map and the lazy route). ~25 independent sections,
  each fetching through named `src/firebase/*.js` functions — never raw
  Firestore inline. Don't restructure `Admin.jsx`; restyle around it.
- Auth: `sessionStorage.admin_authenticated` after mount (not routing-level).
  Privileged writes go through `api/admin-settings.js` (`callAdminSettings`).
- Styling: Tailwind layout + inline hex colours, lucide icons, RTL Hebrew.
- **Telegram tab** (`TelegramSection.jsx`): bots, channels, messages. A channel
  entry may carry `allowedAdvertiserIds`: absent = everyone; an array = only
  those producers' parties (an empty array = nobody). The bot records every
  non-private chat it hears from (including being added, via `my_chat_member`)
  in `settings/telegramSeenChats` (max 60; groups the bot left are removed). The
  tab polls it every 20 s, shows a pink badge with the number of groups not yet
  in the list, and a **"הוספה לרשימה"** button; added groups start with an empty
  `allowedAdvertiserIds` so nothing is posted until a producer is ticked, then
  the owner saves. Only the main bot (`TELEGRAM_BOT_TOKEN`) is detected.
- **Agents tab** (`AgentsSection.jsx`): roster cards ("כתוב ל<name>"), a message
  box (`callAdminSettings('agent-chat-post')`) and the team chat grouped by task
  thread. The owner commands agents in plain Hebrew; he does not want to be
  handed steps when an agent can act.
- Verify after admin changes: `npm run build` and click through every tab.

## 8b. The admin panel in full — every tab, every endpoint, every credential

**Entering the panel**: `/admin` (not linked publicly, disallowed in `robots.txt`). The
login form (`AdminAuthForm.jsx`) calls `api/admin-settings.js` action `admin-login`
with a username + password. Admin accounts are documents in `users` with
`isAdmin`; the built-in default admin has username **`admin`**. If an admin has no
password yet, the first login asks for a new one (min. 8 characters, stored as a
bcrypt hash; a legacy plain-text password is upgraded to bcrypt on its first
successful login). Accounts are added, disabled, promoted, removed and reset in the
**ניהול אדמינים** tab (`admin-set-password`, `admin-set-active`, `admin-make-admin`,
`admin-remove-admin`). A disabled admin cannot log in; if no active admin exists the
default admin is re-activated so the owner can never be locked out. The session is
`sessionStorage.admin_authenticated`.

**Tabs** (`adminTabs.js`, in this order):

| id | label | what it manages |
|---|---|---|
| subscriptions | ניהול משתמשים ומנויים | everyone on the site (`users`): approvals/requests (incl. the plan), tier & expiry, renew, CRM notes, payments, women's lifetime membership |
| matching | התאמות | balance matching per party (`BalanceTables`), manual match, swap partner, "entered" checkbox, **reveal/hide the woman's phone**, WhatsApp send |
| parties | מסיבות | create/edit parties (`PartyEditor`: registration mode auto/open/closed, balance, images), registrations list + export, convert client to user, remove from party |
| siteDesign | עיצוב האתר | logo, banners, popup (`SiteDesignSection`/`HeroSection`) |
| forumUsers | מנויי האתר | login accounts (`forumUsers`): block, role, reset password |
| about / contact | אודות / צור קשר | page copy, WhatsApp link, alert text |
| links | קישורים וקבוצות | the social links used by the site icons (instagram, facebook, telegramChannel, telegramGroup, whatsapp) |
| deleteRequests | בקשות מחיקה | account-deletion requests (`delete-account.html`) |
| admins | ניהול אדמינים | admin accounts (above) |
| advertisers | מפרסמים | approve/block producers, their parties |
| rss | RSS Feeds | RSS feeds shown on the news page (`add/update/delete/restore-rss-feed`) |
| telegram | טלגרם | bots, channels (+ allowed producers, new-group detection), message templates, send-now |
| agents | צוות הסוכנים | the 11 agents, team chat, commands |
| db (advanced) | DB | backup & restore |
| dbLogger (advanced) | לוג קריאות DB | Firestore read-volume tracking |
| gitHistory (advanced) | היסטוריית Git | recent publish commits (`api/git-history.js`) |

**API files** (`api/`, one function each): `admin-settings.js` (settings writes, agent
chat, admin/user mutations, RSS — Bearer `ADMIN_API_SECRET`), `advertiser-auth.js`
(producer register/login/admin actions; bcrypt hashes never leave the server),
`forum-auth.js` (email verification + password reset, `?action=`),
`telegram-webhook.js` (webhook + every scheduled job), `telegram-relay.js`
(Telegram Bot API proxy for the SPA; `sendMessage`/`sendPhoto` stay open to the
public registration flow), `support-chat-send.js` (support bubble → Telegram),
`send-push.js` (Web Push, needs the VAPID private key), `publish-content.js` /
`publish-content-local.js` / `import-content-from-git.js` (explicit "publish to
Git" and import — never automatic), `git-history.js`.

**Credentials & secrets — where each one lives (values are NOT stored here)**.
This skill is committed to Git and read by automatic routines, so real passwords,
tokens and keys must **never** be written into it, into code, or into chat. What
exists and where to rotate it:

| Credential | Lives in | Notes |
|---|---|---|
| Admin panel passwords | bcrypt hash in `users/{adminId}.password` | set at first login or via ניהול אדמינים → `admin-set-password` (≥8 chars); there is no way to read one back |
| `ADMIN_API_SECRET` / `VITE_ADMIN_API_SECRET` | Vercel env vars (the second is inlined at build time via `vite.config.js`) | must match; bearer for every privileged write; the SPA bundle contains it, so treat the admin panel URL as sensitive |
| `TELEGRAM_PROMO_SECRET` | Vercel env var | the `key=` of every `?job=` URL (campaign, promo, health, tiktok…) — it was once pasted in chat, so rotate it if in doubt |
| `CRON_SECRET` | Vercel env var | lets Vercel cron call the jobs |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Vercel env vars | main bot; other bots' tokens are stored in Firestore `settings/telegram.bots` (publicly readable doc — rotate those tokens with BotFather if exposed) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GCLOUD_PROJECT` | Vercel env vars | Firebase Admin service account; project `tbdsm-5acca` |
| Support-chat bot + owner chat id | Firestore `settings/private/supportChat/config` | used by health alerts and the TikTok agent to message the owner |
| `VAPID_PRIVATE_KEY` | Vercel env var | Web Push (public half is in the code) |
| `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_FILE_PATH` | Vercel env vars | publish/import content, git history |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Vercel env vars | forum verification / reset emails |
| `WHATSAPP_BOT_PUBLIC_URL`, `WHATSAPP_BOT_API_KEY`, `VITE_WHATSAPP_BOT_*` | Vercel env vars | WhatsApp bot |
| `WINDSOR_API_KEY`, `WINDSOR_INSTAGRAM_ACCOUNT_ID` | Vercel env vars | Instagram stats |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Vercel env vars | image uploads |
| `DEPLOY_STATUS_SECRET`, `PUBLIC_SITE_URL`, `VITE_SITE_URL` | Vercel env vars | deploy status + site URL |
| Member / producer / forum passwords | bcrypt hashes (`users`, `forumUsers`, `advertisers`) | users reset them in their area; admins reset in the matching tab |

Non-secret facts about passwords: every woman's account is created with the
starter password **`102040`** and is never forced to change it; the default admin
username is `admin`. If the owner needs a secret's real value he reads it in the
Vercel dashboard (Settings → Environment Variables) — Claude does not have it.

## 9. Agents & the team chat (A2A)

Roster in `shared/agentsRoster.js` (the owner chose the names). Categories:
marketing, ops, health, systems.

| id | name | role | schedule |
|---|---|---|---|
| publisher | עומר | campaign posts to the channel `@libralparty` | Sun/Tue/Thu |
| recruiter | ליאור | group promo "want to publish your party?" | Mon/Thu |
| tiktok | נועם | prepares the next TikTok post and sends it to the owner on Telegram | Sun/Thu 12:00 |
| creator | שחר | Claude agent: monthly campaign-pool refresh (auto-merge) | 1st of month |
| secretary | אדם | party reminders | Sun–Thu 12:00 |
| cleaner | ניק | nightly cleanup, lifetime women, starter accounts | 03:00 |
| doctor | דין | daily health check (`settings/healthCheck`) | daily 12:00 |
| fixer | שון | Claude agent: reads the check + owner requests, fixes code, merges | daily |
| support | רוי | support-chat FAQ answers | always |
| matcher | דור | automatic gender balance | on registration |
| notifier | איתי | push notifications | on events |

- Each agent has A2A-style **skills** (Hebrew tags). `runTask` (`shared/a2a.js`)
  picks the agent by best skill match (up to 2 delegation hops), returns lines
  `from/to/taskId/state` (working/completed/input-required). Requests the server
  cannot do become `kind:"request"` for שון. Chat is stored in `settings/agentChat`
  (cap 150), per-agent config (days, paused) in `settings/agentConfig`.
- Commands (`shared/agentCommands.js`): days ("רק בימי ראשון וחמישי"), pause
  ("תעצור"), resume ("תמשיך"), run now (publisher/recruiter/tiktok/doctor/cleaner).
  "Run now" goes through `NOW_JOBS` in `api/admin-settings.js`.
- **Adding or changing an agent**: update the roster, `CONTROLLABLE`/`NOW_BY_AGENT`
  if controllable, `NOW_JOBS` if it can run now, regenerate
  `public/.well-known/agent-card.json` (`teamCard()`), update the count asserted in
  `tests/api/agentChat.test.js` and `docs/agents-roster.md`, add tests.
- Claude routines (שון daily fixer, שחר monthly refresh) run in Claude sessions and
  merge their own PRs; the owner must delete the two old Instagram routines by hand.

## 10. Telegram, campaigns, TikTok, health

- Channel campaigns: pool in `shared/telegramCampaigns.js` (22 campaigns, version
  stamp `YYYY-MM`; a new version restarts from the first). Generate with
  `python3 scripts/campaigns/make_campaigns.py <fonts-dir>` (needs the merged Heebo
  Hebrew+Latin font via fonttools — Hebrew-only Heebo lacks punctuation). Posts only
  to `@libralparty`; captions use plain links with **no tracking parameters**;
  Hebrew must be proofread (no spelling errors). `?job=campaign&force=1` posts now.
- Group promo: `?job=promo-now`; message link is `/advertiser-register`.
- **TikTok**: TikTok's posting API needs an approved developer app, so it is *not*
  automatic. `scripts/tiktok/make_tiktok.py` makes 8 slides 1080×1920
  (`public/assets/tiktok/tNN.jpg`), `shared/tiktokPack.js`, and
  `docs/tiktok-pack.md`. Agent נועם (`sendTiktokPostIfDue`, `?job=tiktok&force=1`)
  sends the next image + caption to the owner's chat
  (`settings/private/supportChat/config`). Content must stay brand/community only:
  no nudity, no sexual wording; link only in the profile bio; "18+" marked;
  paid TikTok ads for swingers/BDSM are not allowed. If the owner gets a developer
  app approved, the direct-post integration can replace the manual step.
- Health check (`runHealthCheck`, `?job=health&noalert=1`) writes
  `settings/healthCheck` {lastRunAt, ok, problems}; stale >30 h means the daily
  cron did not run.
- Telegram settings, bot tokens and channel list live in `settings/telegram`
  (public-read doc — treat contents as sensitive).

## 11. Firestore & rules

- `settings/*` publicly readable; writes via Admin SDK / `api/admin-settings.js`.
  `parties` updates are open to clients (`safePartyShape`). `users` delete is
  `allow delete: if false` — user deletion goes through `api/admin-settings.js`.
- Rule helpers: use `.data.get('field', default)` for optional fields (a thrown
  error denies the whole request). Rules must be provable from the query's own
  filters (an `!=` rule fails an unconstrained list query).
- Don't gate shared endpoints (`api/telegram-relay.js`) entirely behind the admin
  secret: anonymous public flows call `sendMessage`/`sendPhoto`; gate only
  bot/webhook management.
- Any change that removes or narrows a permission check is a "Security Weaken"
  action: get the owner's explicit approval first; if git is still blocked, give
  him the exact file content to apply on GitHub.

## 12. Routing (`vercel.json`)

Clean URLs are `rewrites` (`/about` → `/about.html`) plus `redirects` (old `.html`
→ clean URL, 301). When adding/renaming a page add both, remove stale entries,
and add it to `public/sitemap.xml` if it should be indexed (not private routes,
which `robots.txt` disallows). Verify actual live behaviour rather than assuming
from the file alone.

## 13. Verification checklist (run before every push)

```bash
npx vitest run tests/api          # ~50 tests; 14 live-Firebase tests fail in the sandbox and on main — ignore those only
npm run build                     # Vite/Nitro build of src/
node --check public/assets/site-data.js
git status --short                # only intended files; no scratch scripts
```

Browser checks use Playwright (Chromium at `/opt/pw-browsers/chromium`, launch with
`executablePath`; never `playwright install`): serve `public/` with
`python3 -m http.server 8940`, stub `site-data.js` with a route, and delete any
script created inside the repo before committing (a scratch file was once
committed by accident). Take screenshots at 390 and 1280 px for visual work.
The bundle can't be served as-is in the sandbox because Firestore calls hang,
so stub it.

## 14. Known pitfalls (do not reintroduce)

- Inserting code into the bundle's `var` chains (kills the site).
- Forgetting to bump `style.css`/`app.js`/`site-data.js` versions (fix invisible in prod).
- Registration without a transaction; comparing a party `date` to now.
- A forced password change for women; showing the producer's name on favourites;
  favourites/hearts for producers.
- Time-based registration cutoffs (removed); blocking anything other than
  `registrationMode === "closed"`.
- Reintroducing `maximum-scale=1,user-scalable=no`.
- Tracking parameters (`utm_*`) in campaign links.
- Posting to Telegram channels other than `@libralparty` for campaigns; adding a
  group to a channel list without a producer restriction.
- Re-enabling the submit button right after a successful party
  publish (duplicate parties).
- Claiming something works on the live site without having verified it — say what
  was and wasn't tested.
