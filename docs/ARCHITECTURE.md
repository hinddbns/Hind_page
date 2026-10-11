# Architecture

Referenced from [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). This document covers folder
structure, routing, data flow, and the mechanical "how it's wired together" details.

## Stack summary

- **Next.js 16** (App Router, Turbopack, React 19) — see the note at the top of `AGENTS.md`:
  this Next.js version has APIs and conventions that differ from older training data (e.g.
  `error.js` prefers `unstable_retry` over `reset`, `PageProps`/`LayoutProps` typed helpers
  exist, `params`/`searchParams` are `Promise`s). **Always check
  `node_modules/next/dist/docs/` before using an App Router API you're not 100% sure about.**
- **TypeScript**, strict mode.
- **Tailwind CSS v4** — configured via `@theme inline` in `globals.css`, not a `tailwind.config.js`.
- **Postgres (Supabase)** — moved off SQLite to support serverless deployment (Vercel). The
  application's only data-access path is the server-only, service-role Supabase client in
  `src/lib/supabase/db.ts` (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Prisma was removed
  once every runtime call site had been migrated to that client; the SQL under
  `prisma/migrations/` is retained purely as schema history. Schema changes are now applied
  directly in Supabase.
- **Supabase Auth** (`@supabase/ssr`), email+password with a 6-digit OTP email-confirmation gate.
  `auth.users` (Supabase's own table) is the sole authority for credentials, email verification,
  and password reset; the `User` table holds only application profile data (name, phone,
  category, role) keyed on the same `id`. See "Auth & session" below.
- **No test framework, no CI configured.** Verification today is manual: `tsc --noEmit`,
  `eslint`, `npm run build`, and manual browser click-through (see `CONTRIBUTING.md`).

## Folder structure

```
prisma/
  migrations/              Historical SQL migration history (schema reference only — Prisma
                          itself has been removed; schema changes are applied in Supabase)
scripts/
  gen_test_videos.py      Generates the tiny placeholder demo/lesson videos used by seed.ts
src/
  app/
    layout.tsx             Root layout: <html lang="ar" dir="rtl">, font, Providers, WhatsAppButton
    not-found.tsx           Global 404 (branded)
    icon.jpg, apple-icon.jpg  Favicon / iOS icon (file-convention based, see app-icons.md)
    globals.css             Design tokens + Tailwind import (see DESIGN_SYSTEM.md)

    (marketing)/            Route group: public, unauthenticated-friendly pages
      layout.tsx             <Nav /> + <Footer />
      page.tsx                The hub ("/") — see PROJECT_CONTEXT.md § Pages
      ados/page.tsx
      parents-enseignants/page.tsx
      connexion/page.tsx
      inscription/page.tsx
      mot-de-passe-oublie/page.tsx     Password-reset request — emails a 6-digit code (Supabase resetPasswordForEmail)
      reinitialiser-mot-de-passe/page.tsx  Recovery-OTP entry → new password (Supabase verifyOtp type:"recovery" → updateUser)
      verification-email/page.tsx     6-digit OTP entry, shown right after sign-up

    (app)/                  Route group: authenticated app shell
      layout.tsx              Redirects to /connexion if no session; <AppNav/> + <AppFooter/>
      tableau-de-bord/         User dashboard + per-course content + messages
      profil/page.tsx
      admin/                   Redirects non-admins to /tableau-de-bord
        layout.tsx              Sidebar nav
        actions.ts               ALL admin server actions live here (see below)
        page.tsx                 Overview / stats
        demandes/                Enrollment review queue
        cours/                   Course + lesson CRUD, questionnaire builder
        utilisateurs/            User list + detail (promote/demote)
        messages/                Admin inbox
        parametres/              Availability text setting

    cours/                  NOT in a route group — shared by both logged-out and logged-in
      layout.tsx              Picks Nav/Footer vs AppNav/AppFooter based on session
      page.tsx                 Flat catalog of ALL published courses (legacy, see below)
      [slug]/page.tsx          Public course detail + enrollment/receipt upload

    api/                    Route Handlers (REST-ish JSON/form endpoints, not used for admin
                             mutations — those are Server Actions in admin/actions.ts)
      auth/create-profile/    Creates the application User row right after a Supabase signup is
                               email-confirmed (sign-up itself is client-side, straight to
                               Supabase Auth — see "Auth & session" below)
      enrollments/            Receipt upload (POST), withdraw (DELETE)
      questionnaire/          Submit onboarding answers
      messages/, messages/unread-count/
      profil/info/, profil/password/
      receipts/[enrollmentId]/  Serves a receipt file (auth-gated, nosniff)
      videos/[lessonId]/       Serves a lesson video with Range support (auth-gated, nosniff)

  components/               Shared React components (see PROJECT_CONTEXT.md § Reusable Components)
    admin/                   Components used only inside /admin

  lib/
    supabase/db.ts           Server-only service-role Supabase client — the app's data-access
                             layer (replaced Prisma); also pgTimestampToDate() + atomic-op RPC wrappers
    supabase/database.types.ts  Generated types for the Supabase schema (Tables<>, Enums<>)
    site.ts                  Brand config: name, tagline, logo, bank details, social links, WhatsApp
    workspace.ts             workspaceFromCategory(): ProfileCategory -> "ADOLESCENT" | "PARENT_TEACHER"
    format.ts                formatPrice()
    uploads.ts               Upload dir (videos only), allowed MIME sets, size limits, extensionForMime()
    fileSignature.ts         Magic-byte validation (matchesFileSignature) — see Security below
    receiptStorage.ts        Supabase Storage wrapper for receipts (upload/download/delete)
    session.ts               getAppUser(): the Supabase-Auth equivalent of the old auth() — see
                              "Auth & session" below
    authGuard.ts             requireVerifiedSession(): the choke point every student-facing
                              Route Handler calls instead of re-checking session + verification
    supabase/
      client.ts                Browser-side Supabase client (Auth calls only, never queries data)
      server.ts                Server Component / Route Handler Supabase client
      middleware.ts            updateSupabaseSession(): refreshes the session cookie, called by proxy.ts
      signOut.ts                signOutAndRedirect(): full-page nav sign-out for client components

  i18n/
    dictionaries/ar.ts       ALL user-facing strings, one flat-ish nested object (see below)
    LocaleProvider.tsx       useLocale() — client-side access to the dictionary (NOT React context;
                             just returns the imported dictionary directly, see note below)
    server.ts                getT() — async server-side equivalent
    config.ts                interpolate(template, vars) — `{siteName}`-style placeholder substitution

  proxy.ts                 Next.js Proxy/Middleware: auth-gates /admin, /tableau-de-bord, /profil;
                            redirects logged-in users away from /, /connexion, /inscription;
                            redirects unverified sessions to /verification-email

public/
  logo.jpg                 Brand logo (used in Nav, AppNav, Footer, AppFooter, auth pages, favicon)
  uploads/demos/            Public demo videos (served as static files, NOT through an API route)
uploads/                  PRIVATE, gitignored: uploads/videos — served only through the
                          authenticated API route above, never as static assets. Receipts no
                          longer live here — see Supabase Storage note below.
```

Receipts live in a private **Supabase Storage** bucket (`receipts`), not on local disk — see
"File uploads & serving" below for why (`/uploads` doesn't survive Vercel's serverless
filesystem). Lesson videos are still local disk pending their own migration (see `ROADMAP.md`).

## Routing model

Three parallel "shells", all under the Next.js **App Router**:

1. **`(marketing)`** — public. Rendered via `Nav` (top bar with logo + `من نحن` / `مساحة الشباب
   والمراهقين` / `مساحة الأمهات والأستاذات` links) and `Footer`.
2. **`(app)`** — authenticated. Rendered via `AppNav` (workspace-tinted accent bar) and
   `AppFooter`. The layout itself calls `getAppUser()` and `redirect()`s to `/connexion` if
   there's no session — this is a **second, redundant layer of protection** on top of `proxy.ts`
   middleware, which is intentional defense-in-depth, not an oversight.
3. **`cours/`** (no group, no parentheses) — shared. Its own `layout.tsx` calls `getAppUser()`
   and picks which nav/footer pair to render. This exists because `/cours/[slug]` (view a course,
   upload a receipt) needs to work identically for logged-out visitors deciding whether to sign
   up and logged-in users still in `PENDING` status.

**`proxy.ts`** (the middleware) is the first gate, matched via `config.matcher` to `/`,
`/admin/:path*`, `/tableau-de-bord/:path*`, `/profil/:path*`, `/connexion/:path*`,
`/inscription/:path*`:
- Unauthenticated + hitting `/admin/*` or `/tableau-de-bord/*` or `/profil/*` → redirect to
  `/connexion?next=<path>`.
- Authenticated + hitting `/admin/*` but not `ADMIN` role → redirect to `/tableau-de-bord`.
- Authenticated + hitting `/`, `/connexion`, `/inscription` → redirect to `/admin` or
  `/tableau-de-bord` (respecting a `?next=` param if present).

**Legacy flat catalog**: `/cours` (the plain list of all published courses, unfiltered by
workspace) still exists and still works, but is no longer linked from the public nav — visitors
are steered to `/ados` or `/parents-enseignants` instead. It's kept because the logged-in
`AppNav` "الدورات" link is workspace-aware (`/ados` or `/parents-enseignants` depending on
`user.workspace` from `getAppUser()`) but nothing currently prevents a stray link to `/cours` from someone
who bookmarked it; it's a safe no-op page, not dead code that breaks.

## Auth & session

**Supabase Auth** (`@supabase/ssr`) is the sole authority for credentials, email verification,
and password reset — `auth.users` (Supabase's own table) stores the password hash,
confirmation status, and OTP/reset tokens. The application `User` table holds only profile
data (`name`, `phone`, `dateOfBirth`, `profileCategory`, `role`) and is keyed on the **same id**
as the matching `auth.users` row (`User.id = authUser.id`, not a separate FK — Supabase's id is
authoritative). There is no `passwordHash` column and no custom OTP/reset-token tables in the
application schema any more; that's Supabase's job now. (This replaced an earlier NextAuth v5 + bcrypt + custom-OTP
system in full — see `docs/PROJECT_CONTEXT.md` § Development Decisions if you find a reference to
that older design anywhere and aren't sure whether it's still accurate.)

- **Sign-up** (`/inscription`, client component): calls `supabase.auth.signUp({ email, password,
  options: { data: { name, phone, dateOfBirth, profileCategory } } })` directly — no application-DB
  write happens here. Supabase requires email confirmation, so `signUp()` grants **no session** while
  confirmation is pending; the client then routes to `/verification-email?email=...`.
- **Email verification (OTP gate)**: `/verification-email` calls
  `supabase.auth.verifyOtp({ email, token, type: "signup" })` with the 6-digit code Supabase
  emailed. Only once that succeeds does a session exist — at which point the page calls
  `POST /api/auth/create-profile`, which reads the now-authenticated Supabase user (id, email via
  `getUser()`, never trusted from the request body) and the `user_metadata` set at sign-up time,
  and creates the one-time `User` row (`id` copied from `authUser.id`). This is the only
  place a `User` row gets created — until this call succeeds, the person has a confirmed
  Supabase identity but no application profile (see the "verified-but-no-profile" case in
  `getAppUser()` below).
- **Login** (`/connexion`): `supabase.auth.signInWithPassword({ email, password })`. An
  `email_not_confirmed` error routes straight to `/verification-email` instead of showing a
  generic error, since an unconfirmed account can't establish a session at all under Supabase
  Auth (this differs from the old NextAuth flow, which used to let an unverified session through
  and gate it downstream).
- **Password reset (OTP-based)**: `/mot-de-passe-oublie` calls
  `supabase.auth.resetPasswordForEmail(email)` (no `redirectTo` — the flow uses no clickable
  link) and redirects to `/reinitialiser-mot-de-passe?email=…`. That page collects the 6-digit
  recovery code from the email, verifies it with
  `supabase.auth.verifyOtp({ email, token, type: "recovery" })` — which establishes the
  short-lived recovery session — then calls `supabase.auth.updateUser({ password })`. It has
  three steps (`otp` → `password` → `done`) plus a countdown + resend-with-cooldown, mirroring
  `/verification-email`. **The Supabase "Reset Password" email template must render `{{ .Token }}`**
  (dashboard-managed — see `ROADMAP.md`), otherwise the user receives no visible code. Changing
  your password while logged in
  (`PasswordChangeForm`, on `/profil`) re-authenticates with the current password first via
  `signInWithPassword` before calling `updateUser`, since `updateUser()` alone only requires an
  active session — without the re-auth check, anyone with a live (e.g. shared-device) session
  could change the password without knowing it.
- **Session reads**: `getAppUser()` (`src/lib/session.ts`) is the single choke point every Server
  Component/Route Handler uses — the equivalent of the old `auth()`. It always calls
  `supabase.auth.getUser()` (never `getSession()`), which revalidates identity against Supabase's
  servers rather than trusting a client-modifiable cookie payload, then does **one indexed
  lookup** (`select("name, role, profileCategory")` via `src/lib/supabase/db.ts`) for the
  application data Supabase's own session doesn't know about. Wrapped in React's `cache()` since
  a layout and its page routinely both call it in the same request. If the Supabase user exists
  but has no matching `User` row
  yet (confirmed via `verifyOtp` but `create-profile` hasn't run — shouldn't happen in the normal
  client flow, since the client always calls it immediately after `verifyOtp` succeeds, but is
  reachable via direct API use), `getAppUser()` returns `null`, i.e. treated as logged out.
  **Important**: because `getAppUser()` does a live lookup on every call rather than caching role/
  workspace in a token, there's no JWT-staleness problem for role — a promotion/demotion is live
  on the next request; the only thing cached across requests is Supabase's own session cookie
  (refreshed by `updateSupabaseSession()` in `proxy.ts`, standard `@supabase/ssr` cookie-refresh
  pattern), not application data.
- **Sign-out**: `signOutAndRedirect()` (`src/lib/supabase/signOut.ts`) calls
  `supabase.auth.signOut()` then does a full `window.location.href` navigation (not
  `router.push`) so the entire Server Component tree re-fetches with the now-cleared session.
- Every student-facing Route Handler (videos, enrollments, messages, progress, receipts,
  questionnaire, profile) calls `requireVerifiedSession()` from `src/lib/authGuard.ts` instead of
  checking `getAppUser()` directly — it 401s if there's no session, 403s
  (`email_not_verified`) if `!user.verified`, matching the return shape the old NextAuth-era
  version used so none of those call sites needed editing when this migrated.
- The verification gate itself is enforced in layers: `src/proxy.ts` redirects an unauthenticated
  request for `/admin`, `/tableau-de-bord`, or `/profil` to `/connexion`, and a
  logged-in-but-unverified one to `/verification-email`; `src/app/(app)/layout.tsx` and
  `admin/layout.tsx` re-check via `getAppUser()` server-side as defense-in-depth (Next 16's Proxy
  is explicitly documented as an optimistic check, not a full authorization solution); and
  `requireVerifiedSession()` covers the API surface. Note the "logged-in-but-unverified" proxy
  branch is defensive rather than reachable through the normal sign-up flow today, since
  `signUp()` grants no session until confirmed — it exists for any future path (OAuth, an admin-
  created account, a Supabase project-setting change) that could produce a session before
  confirmation.

## Data model

(Table/column reference. The historical `prisma/migrations/` SQL is the schema of record;
generated Supabase types live in `src/lib/supabase/database.types.ts`.)

`User` — `id` matches the corresponding Supabase `auth.users.id` (see "Auth & session" above);
this table holds application profile data only, not credentials. `profileCategory`
(`MOTHER | TEACHER | ADOLESCENT | OTHER`, nullable — many existing rows are `null`, see the
NULL-handling pitfall below) drives which workspace a user belongs to. `role` (`USER | ADMIN`) is
separate from category.

`Course` — `audience` (`ADOLESCENT | PARENT_TEACHER`, defaults to `PARENT_TEACHER`) is what
splits the catalog between `/ados` and `/parents-enseignants`. `published` hides a course from
catalogs without deleting it (existing approved enrollments keep access). `questionnaireEnabled`
gates whether newly-approved users must answer the course's `Question`s before seeing `Lesson`s.

`Enrollment` — one row per `(userId, courseId)` pair (unique constraint), `status` is
`PENDING | APPROVED | REJECTED`. A user can only have zero or one enrollment per course; the
"upload a new receipt" flow re-uses the same row (see `api/enrollments/route.ts`).

`Question` / `QuestionOption` / `QuestionAnswer` — per-course onboarding questionnaire, 4 types
(`OPEN`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `SCALE`). `QuestionAnswer.selectedOptionIds` is a
**JSON-stringified array stored in a String column**, not a relation — parsed manually wherever
read (see `admin/cours/[id]/questionnaire/[userId]/page.tsx` and
`tableau-de-bord/cours/[slug]/page.tsx`).

`Message` — flat list per user, `sender` is `USER | ADMIN | SYSTEM`. No thread/conversation
table; "conversations" in the admin inbox are derived by grouping on `userId` in application
code (`admin/messages/page.tsx`). Unread state is tracked via two timestamp columns on `User`
(`messagesReadByUserAt`, `messagesReadByAdminAt`) compared against message `createdAt` — not a
per-message `read` boolean.

`LessonProgress` — one row per `(userId, lessonId)` pair (unique constraint), added in the V2
lesson-progress work. `furthestSeconds` is the server-validated, rate-limited high-water mark
(never trusts a client-reported jump faster than real elapsed time since the last accepted
update — see `api/lessons/[lessonId]/progress/route.ts`); `lastPositionSeconds` is just the
resume point, trusted directly since it isn't a security boundary. `completed` gates sequential
lesson locking (`lib/lessonAccess.ts`'s `getLessonsWithAccess`): first non-completed lesson in
`order` is `current`, everything after is `locked`, enforced server-side on every lesson-content
access path (the lesson page, `api/videos/[lessonId]`, and the progress route itself all
independently re-check this — don't add a fourth lesson-content path without the same check).
Lessons with no `videoPath` (external `videoUrl` or text-only — the majority of real lesson
content as of 2026-08-23) have no timeline to validate, so they're completed via an explicit
`{event: "complete"}` request instead (`components/LessonCompleteButton.tsx`).

`AuditLog` — minimal admin action trail (`lib/auditLog.ts`), written for enrollment approve/
reject and user promote/demote. `targetId` is a plain string, not a real FK (it points at
different tables depending on `targetType`), so it doesn't cascade-delete — fine today since
nothing in the app deletes users or enrollments outright. Rendered read-only on
`admin/parametres`. Don't build this into a bigger analytics feature without being asked.

`SocialLink` / `SocialLinkAssignment` — replaces the old hardcoded `site.social` object.
`SocialLink` is one URL for one `platform` (`INSTAGRAM | FACEBOOK | YOUTUBE | TIKTOK |
WHATSAPP`); a platform can have several `SocialLink` rows (several configs). Each
`SocialLinkAssignment` points a link at exactly one `surface` (`GLOBAL | PARENTS |
ADOLESCENTS`), and a link can have several assignments — that's how one URL targets multiple
surfaces at once. `platform` is denormalized onto `SocialLinkAssignment` (not just reachable via
the `link` relation) specifically so `@@unique([platform, surface])` can enforce "at most one
link per platform+surface" at the database level — this is the actual guarantee against
ambiguous double-assignment, not just an application-level check (`lib/socialLinks.ts`'s
`getSocialLinksByVariant()` does the read side; `admin/actions.ts`'s `createSocialLink` does a
friendlier pre-check before hitting the constraint). Rendering only ever looks up a single
surface's assignments — there's no "Global also shows on Parents/Adolescents" fallback; the three
surfaces are independent, per the product requirement that "a surface must render only the link
assigned to it."

`RateLimitHit` — backs `lib/rateLimit.ts`'s `checkRateLimit(key, max, windowSeconds)`, a small
DB-backed sliding-window limiter (delete-then-count-then-insert against this table). No external
infra (Redis, etc.) — Postgres is already the shared state every serverless instance can see, and
traffic at this app's scale doesn't need anything more. Keys are typically `"<route>:<userId>"`
for authenticated routes or `"<route>:<ip>"` for public ones.

**NULL-handling pitfall (already hit once, now fixed in two places)**: `profileCategory` is
nullable. A "not ADOLESCENT" filter (`.neq("profileCategory", "ADOLESCENT")`, or the old
Prisma `{ not: "ADOLESCENT" }`) does **not** match rows where the column is `NULL` (standard
SQL three-valued-logic behavior) — it silently undercounts. The correct pattern, used in
`admin/utilisateurs/page.tsx` and `admin/page.tsx`, is an explicit OR that includes NULL:
```ts
.or("profileCategory.is.null,profileCategory.in.(MOTHER,TEACHER,OTHER)")
```
If you add another "everyone except ADOLESCENT" filter anywhere, use this pattern, not a bare `neq`.

## Server Actions vs. API Routes — the deliberate split

- **Admin mutations** (`src/app/(app)/admin/actions.ts`): React 19 Server Actions, always typed
  `(...boundArgs, prevState: ActionState, formData: FormData) => Promise<ActionState>` where
  `ActionState = { error?: string; ok?: boolean }`. Every one is wrapped in `runAction()`, which
  catches a custom `AdminActionError` and turns it into `{ error }` instead of crashing to Next's
  error boundary — unexpected/programmer errors still throw and surface normally. Bound with
  `.bind(null, id, ...)` when passed to `<ConfirmActionForm>` / `<CourseForm>` / etc. This exists
  because the original code threw raw `Error`s straight into form actions, which crashed the
  whole page on any validation failure — see `HANDOFF.md` for the original audit that found this.
- **Everything else user-facing** (sign-up, receipt upload, messaging, profile edits,
  questionnaire submission): plain Route Handlers under `app/api/**/route.ts`, called via
  `fetch()` from client components, returning `NextResponse.json({ error: "some_code" })` on
  failure. The client maps error codes to translated messages via a local
  `Record<string, string>` (see `UploadReceiptForm.tsx`, `inscription/page.tsx`) — **error codes
  are the contract between route handler and UI, not the message text**.

Do not mix these patterns — don't add a new admin mutation as a `route.ts`, and don't add a new
Server Action for user-facing flows unless there's a specific reason.

## File uploads & serving — the trust boundary

Two upload paths, different storage backends since 2026-08-23:

1. **Receipts** (`api/enrollments/route.ts`, user-facing, untrusted): client-declared
   `File.type` is checked against `ALLOWED_RECEIPT_TYPES` (fast pre-filter) **and then** the
   actual bytes are checked against `matchesFileSignature()` (magic-byte check) before the
   validated buffer is handed to `lib/receiptStorage.ts`, which uploads it to a private Supabase
   Storage bucket (`receipts`) via the service-role key. This two-step validation exists because
   `File.type` is fully attacker-controlled — a user could upload an HTML/script file with a
   spoofed `image/jpeg` Content-Type, and the receipt-serving route re-uses that same
   (attacker-influenced) extension to set the response `Content-Type` — that's the concrete
   stored-XSS-via-upload scenario this closes off, on top of the `X-Content-Type-Options: nosniff`
   header on the serving route. The bucket is private and only ever touched server-side with the
   service-role key — the client never gets a Storage URL or signed link, only
   `/api/receipts/[enrollmentId]`, so the existing owner-or-admin auth check is the only gate,
   unchanged by the migration.
2. **Videos** (`admin/actions.ts` → `saveVideoIfPresent()`, admin-only, trusted): still local disk
   (`uploads/videos`, `node:fs`) — **not yet migrated**, see `ROADMAP.md`. Same signature-check
   function is applied here too, for consistency/defense-in-depth, even though the threat model is
   much lower (only an admin can upload).

`extensionForMime()` (in `lib/uploads.ts`) is the single place mapping MIME → file extension —
used both when naming the uploaded object (local file for videos, Storage object key for
receipts) and (duplicated as a local `CONTENT_TYPES` map, not imported) when serving it back in
`api/receipts/[enrollmentId]/route.ts` and `api/videos/[lessonId]/route.ts`.
If you add a new allowed MIME type, you must update **three** places: `ALLOWED_*_TYPES` in
`lib/uploads.ts`, `matchesFileSignature()` in `lib/fileSignature.ts`, and the `CONTENT_TYPES` map
in the relevant serving route.

**Demo videos are different**: they're admin-uploaded but stored under `public/uploads/demos/`
and referenced by URL (`demoVideoPath`), so Next.js/the OS serves them as plain static files —
no auth check, no Range-request handling written by us (the browser/OS filesystem server
handles it). This is intentional: demo videos are meant to be publicly viewable before signup.
Lesson videos go through `api/videos/[lessonId]/route.ts` specifically because they must be
access-controlled and support seeking (`Range` header → `206 Partial Content`).

## i18n — single language, dictionary pattern

There is **no locale switching**. `src/i18n/dictionaries/ar.ts` is the only dictionary; `type
Dictionary = typeof ar` is derived from it, so every other file that types a `t: Dictionary`
prop gets full autocomplete/type-checking against the real keys. `LocaleProvider.tsx`'s
`useLocale()` is misleadingly named — it is **not** React Context, it just imports and returns
the dictionary directly (safe to call from any client component, no `<Provider>` wrapper
needed). `i18n/server.ts`'s `getT()` is the `async` server-component equivalent, same shape.
`interpolate(template, vars)` handles `{siteName}`-style placeholders inside dictionary strings.

If a second language is ever added, this is the seam: `dictionaries/` would gain a second file,
and `useLocale()`/`getT()` would need to actually read a locale (cookie, path segment, etc.)
instead of hardcoding the one import. Nothing else in the codebase currently anticipates this.

## Messaging & unread counts — polling, not push

`ChatPanel.tsx` polls `GET /api/messages?userId=...` every 5s and marks messages read (updates
`messagesReadByUserAt`/`messagesReadByAdminAt`) as a side effect of that same `GET`. `UnreadBadge.tsx`
polls `GET /api/messages/unread-count` every 20s, independently, wherever it's mounted (nav
links). There are no WebSockets/SSE. This is a deliberate simplicity choice for a low-traffic
single-coach app — see `PROJECT_CONTEXT.md` § Development Decisions.

## Free course (`/cours-gratuit`) — standalone public page, admin-managed

One free course made of a single Bunny Stream video, on its own public page. It is deliberately
**not** a `Course` row (Course requires an audience and price, joins enrollments/payments, and is
read by every catalog) and appears in **no** catalog, audience space, dashboard or admin stat.

### Pieces

| Piece | Path |
|---|---|
| Public route (own minimal layout: logo, page, footer — no `Nav`/`Footer`/auth buttons; the root layout's WhatsApp button and toasts stay) | `src/app/cours-gratuit/{layout,page,error}.tsx` |
| Admin page (sidebar entry "الدورة المجانية") | `src/app/(app)/admin/cours-gratuit/page.tsx` + `src/components/admin/FreeCourseForm.tsx` |
| Server Actions | `updateFreeCourse`, `setFreeCoursePublished` in `src/app/(app)/admin/actions.ts` |
| Data access + viewer rule | `src/lib/freeCourse.ts` (`getFreeCourseForViewer` is the single access check) |
| Pure validation (shared by actions, page, tests) | `src/lib/freeCourseRules.ts` |
| Bunny reference parsing / embed URL | `src/lib/bunny.ts` |
| Migration | `prisma/migrations/20261011120000_add_free_course/migration.sql` |
| Unit tests (`npm test`) | `src/lib/bunny.test.ts`, `src/lib/freeCourseRules.test.ts` |

### Data model — `FreeCourse` (singleton, `id = 'main'`, enforced by a CHECK)

All page content lives here and is edited only through `/admin/cours-gratuit` — never hardcode
course copy in the page, the dictionary, or `site.ts`. Code-defined on purpose: the route, layout,
UI labels, and the host's name/role/portrait (`site.name`, `site.tagline`, `site.coachPhoto`).
Social links come from the existing **Global** social-link surface (`/admin/parametres`); the
section disappears entirely, heading included, when none are configured.

**Page order (fixed in code):** logo → `eyebrow` label → introduction paragraphs → video → booking
CTA → presenter (circular `site.coachPhoto`, `site.name`, `hostIntro`) → social links → © footer.
`title` is not displayed but is still the page's single `<h1>` (`sr-only`), the iframe's accessible
title and the metadata fallback — keep it filled. There is no link back to the main site.

**Booking CTA:** heading/subheading/button labels are shared dictionary text
(`t.freeCourse.cta*`); the link is `https://wa.me/{Settings.whatsappNumber}` built by
`buildWhatsAppUrl()` (`src/lib/whatsapp.ts`) — the same shared number as the floating button,
edited at `/admin/parametres`. When the number is missing, malformed, or still the placeholder
`212600000000`, the CTA is **not rendered** (admins previewing a draft see a notice instead), and
the admin status card flags it.

| Column | Type | Rules |
|---|---|---|
| `title` | text, default `''` | ≤ 120; required to publish |
| `eyebrow` | text, nullable | ≤ 60; hidden when empty |
| `introduction` | text, default `''` | ≤ 1,200 (raised from 600 by `20261012120000_free_course_introduction_1200`); required to publish. Shown above the video; blank lines separate paragraphs (`splitParagraphs()`), single newlines are kept |
| `bunnyLibraryId` | text, nullable | `^[1-9][0-9]{0,9}$`; required to publish |
| `bunnyVideoId` | text, nullable | lowercase GUID; required to publish |
| `videoAspect` | enum `VideoAspect` (`LANDSCAPE`/`PORTRAIT`/`SQUARE`) | default `LANDSCAPE` |
| `showHost` / `hostIntro` | boolean (default true) / text ≤ 200, nullable | presenter block below the booking CTA; `hostIntro` is the presenter's **professional description** (falls back to `site.tagline`; don't repeat the name in it) |
| `seoTitle` / `seoDescription` | text ≤ 70 / ≤ 160, nullable | fall back to `title` / start of `introduction` |
| `indexable` | boolean, default **false** | robots meta only — not privacy |
| `published` / `publishedAt` | boolean (default false) / timestamp | publication state |
| `updatedAt` | timestamp | **content** version: bumped on every content save (not on publish/unpublish) and used for the edit form's optimistic-concurrency check |

The limits and the publish-completeness rule exist twice on purpose: in `freeCourseRules.ts`
(friendly Arabic errors) and as CHECK constraints (`FreeCourse_publish_complete` etc.), so the
database itself refuses a published row without title, introduction and valid Bunny IDs.

### Access rules

- `getFreeCourseForViewer()` returns the row to anyone only if it is published and complete;
  otherwise only to an admin (live `getAppUser()` role check, server-side), flagged `preview`.
  Everyone else gets `notFound()`. Both the page and `generateMetadata` go through it, so draft
  text never reaches HTML, metadata or the RSC payload. Draft previews are always `noindex`.
- The page is `force-dynamic`: publish/unpublish/edits are visible on the next request.
- Admin page: protected by `admin/layout.tsx`; both actions call `requireAdmin()` inside
  `runAction()`. Mutations write `FREE_COURSE_UPDATED` / `FREE_COURSE_PUBLISHED` /
  `FREE_COURSE_UNPUBLISHED` audit entries (labels in `admin/parametres`).
- Editing an already-published course updates the live page immediately (no separate draft copy).
  A save that would empty a required field of a published course is refused — unpublish first.
- The edit form uses controlled inputs: React 19 resets uncontrolled fields after a form action,
  which would wipe the admin's input on a rejected save.
- An unexpected failure on this route (e.g. database unreachable) is caught by the route's own
  `error.tsx` (branded message, error logged, never displayed).

### Applying the migration (manual — Supabase SQL editor)

Schema changes are applied by hand in Supabase; the SQL file is committed as the record. Apply
`20261011120000_add_free_course/migration.sql` **before** deploying the code (the page and admin
page error until the table exists). It is purely additive. Later forward-only migrations, applied
the same way and never by editing the original: `20261012120000_free_course_introduction_1200`
(replaces only the introduction length CHECK). Then run these **read-only** checks:

```sql
-- 1. RLS on (expect relrowsecurity = true)
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'FreeCourse';
-- 2. Grants: expect ONLY service_role with INSERT, SELECT, UPDATE — no anon/authenticated/PUBLIC
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_name = 'FreeCourse' ORDER BY grantee, privilege_type;
-- 3. No policies (expect 0 rows)
SELECT * FROM pg_policies WHERE tablename = 'FreeCourse';
-- 4. Seeded draft (expect: main | false)
SELECT id, published, "updatedAt" FROM "FreeCourse";
-- 5. Constraints present
SELECT conname FROM pg_constraint WHERE conrelid = '"FreeCourse"'::regclass ORDER BY conname;
```

Note: `information_schema.role_table_grants` only lists grants visible to the current role; run
it as `postgres` (the SQL editor's default). Also check the anon-key path — it must **not**
return rows (expect a permission error such as `42501`, or `[]`):

```bash
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/FreeCourse?select=*" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

`database.types.ts` was updated by hand to match (the repo has no type-generation script); if you
regenerate with the Supabase CLI, the `FreeCourse` / `VideoAspect` entries should come out identical.

### Bunny Stream — public library, no credentials in the app

- Use a **dedicated public Bunny Stream library** for this video: token authentication **off**,
  allowed domains = the production domain (plus the Vercel domain and `localhost` if wanted).
  Keep it separate from the future protected lesson library: token auth is a library-wide
  setting, and the lesson migration (see `ROADMAP.md`) is planned around **signed** URLs.
- The admin pastes an embed URL (`https://iframe.mediadelivery.net/embed/{library}/{video}`), a
  play URL (`…/play/{library}/{video}`), the dashboard's `<iframe>` snippet, or a bare video GUID
  plus the library ID. `player.mediadelivery.net` is also accepted. Anything else (other hosts,
  ports, credentials, `http:`, other paths) is rejected with an Arabic error.
- Only the validated library ID and video GUID are stored. The iframe `src` is always rebuilt by
  `buildBunnyEmbedUrl()` on `iframe.mediadelivery.net` with fixed parameters (no autoplay).
- V1 makes no Bunny API calls and needs no API key: a well-formed reference is accepted even if
  the video doesn't exist yet. Playback is confirmed through the preview. Captions, thumbnail and
  processing are managed in the Bunny dashboard; a missing/processing video shows Bunny's own
  player message inside the frame (the app cannot detect it cross-origin).

### Editing content from the Supabase SQL Editor

The owner may update content directly (example below; dollar-quoting avoids escaping Arabic).
SQL edits bypass the app's validation messages and the audit log — the CHECK constraints still
apply (lengths, Bunny ID formats, publish completeness). Always bump `"updatedAt"`, or an admin
form opened earlier could overwrite the SQL edit without a conflict warning. Don't toggle
`published` from SQL; use the admin buttons.

```sql
UPDATE "FreeCourse"
SET "introduction" = $$first paragraph…

second paragraph…$$,
    "hostIntro" = $$professional description…$$,
    "updatedAt" = (now() AT TIME ZONE 'utc')
WHERE "id" = 'main';
```

### Workflow

1. `/admin/cours-gratuit` → fill the content, paste the Bunny reference, **حفظ** (drafts may be
   incomplete; every supplied value is still validated).
2. **معاينة الصفحة** opens `/cours-gratuit`; admins see the draft with a "معاينة" banner.
3. **نشر** (confirmation dialog) — only offered once title, introduction and video are saved.
4. **إلغاء النشر** (confirmation dialog) hides the page immediately (visitors get the 404).

### Metadata / `SITE_URL`

`SITE_URL` (optional, non-secret, e.g. `https://example.com`) sets the root `metadataBase`
(`src/lib/siteUrl.ts`). When it is set, the page emits a canonical URL and `og:url`; when unset
they're omitted (no build error, no guessed domain). There is no Open Graph image yet — link
previews show title and description only.
