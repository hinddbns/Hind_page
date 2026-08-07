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
- **Prisma 6** + **SQLite** (`prisma/dev.db`, gitignored) — single-file DB, fine for one server
  instance, not for multi-instance/serverless deployment as-is.
- **NextAuth v5 (beta)**, Credentials provider only, JWT session strategy.
- **No test framework, no CI configured.** Verification today is manual: `tsc --noEmit`,
  `eslint`, `npm run build`, and manual browser click-through (see `CONTRIBUTING.md`).

## Folder structure

```
prisma/
  schema.prisma          Data model (see below)
  seed.ts                 Seeds one admin + 3 example courses + demo videos
  migrations/              One migration per schema change, applied in order
scripts/
  gen_test_videos.py      Generates the tiny placeholder demo/lesson videos used by seed.ts
src/
  app/
    layout.tsx             Root layout: <html lang="ar" dir="rtl">, font, Providers, WhatsAppButton
    not-found.tsx           Global 404 (branded)
    icon.jpg, apple-icon.jpg  Favicon / iOS icon (file-convention based, see app-icons.md)
    globals.css             Design tokens + Tailwind import (see DESIGN_SYSTEM.md)
    providers.tsx           Wraps children in NextAuth's <SessionProvider>

    (marketing)/            Route group: public, unauthenticated-friendly pages
      layout.tsx             <Nav /> + <Footer />
      page.tsx                The hub ("/") — see PROJECT_CONTEXT.md § Pages
      ados/page.tsx
      parents-enseignants/page.tsx
      connexion/page.tsx
      inscription/page.tsx

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
      auth/[...nextauth]/     NextAuth handler
      inscription/            Sign-up
      enrollments/            Receipt upload (POST), withdraw (DELETE)
      questionnaire/          Submit onboarding answers
      messages/, messages/unread-count/
      profil/info/, profil/password/
      receipts/[enrollmentId]/  Serves a receipt file (auth-gated, nosniff)
      videos/[lessonId]/       Serves a lesson video with Range support (auth-gated, nosniff)

  components/               Shared React components (see PROJECT_CONTEXT.md § Reusable Components)
    admin/                   Components used only inside /admin

  lib/
    prisma.ts                Singleton PrismaClient (global-cached in dev to survive HMR)
    site.ts                  Brand config: name, tagline, logo, bank details, social links, WhatsApp
    workspace.ts             workspaceFromCategory(): ProfileCategory -> "ADOLESCENT" | "PARENT_TEACHER"
    format.ts                formatPrice()
    uploads.ts               Upload dirs, allowed MIME sets, size limits, extensionForMime()
    fileSignature.ts         Magic-byte validation (matchesFileSignature) — see Security below

  i18n/
    dictionaries/ar.ts       ALL user-facing strings, one flat-ish nested object (see below)
    LocaleProvider.tsx       useLocale() — client-side access to the dictionary (NOT React context;
                             just returns the imported dictionary directly, see note below)
    server.ts                getT() — async server-side equivalent
    config.ts                interpolate(template, vars) — `{siteName}`-style placeholder substitution

  auth.ts                  NextAuth config: Credentials provider, JWT callbacks, login lockout
  proxy.ts                 Next.js Proxy/Middleware: auth-gates /admin, /tableau-de-bord, /profil;
                            redirects logged-in users away from /, /connexion, /inscription
  types/next-auth.d.ts     Module augmentation: session.user.{id,role,workspace}

public/
  logo.jpg                 Brand logo (used in Nav, AppNav, Footer, AppFooter, auth pages, favicon)
  uploads/demos/            Public demo videos (served as static files, NOT through an API route)
uploads/                  PRIVATE, gitignored: uploads/receipts, uploads/videos — served only
                          through the authenticated API routes above, never as static assets
```

## Routing model

Three parallel "shells", all under the Next.js **App Router**:

1. **`(marketing)`** — public. Rendered via `Nav` (top bar with logo + `من نحن` / `مساحة
   المراهقين` / `مساحة الأمهات والأساتذة` links) and `Footer`.
2. **`(app)`** — authenticated. Rendered via `AppNav` (workspace-tinted accent bar) and
   `AppFooter`. The layout itself calls `auth()` and `redirect()`s to `/connexion` if there's no
   session — this is a **second, redundant layer of protection** on top of `proxy.ts`
   middleware, which is intentional defense-in-depth, not an oversight.
3. **`cours/`** (no group, no parentheses) — shared. Its own `layout.tsx` calls `auth()` and
   picks which nav/footer pair to render. This exists because `/cours/[slug]` (view a course,
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
`session.user.workspace`) but nothing currently prevents a stray link to `/cours` from someone
who bookmarked it; it's a safe no-op page, not dead code that breaks.

## Auth & session

NextAuth v5, `Credentials` provider only (email + password, bcrypt-hashed), **JWT** session
strategy (no `Session` table).

- `authorize()` in `src/auth.ts`: checks `lockedUntil`, compares password, tracks
  `failedLoginAttempts` (locks for 15 min after 5 failures, resets on success), and computes
  `workspace` via `workspaceFromCategory()`.
- `jwt` / `session` callbacks copy `id`, `role`, `workspace` from the DB user onto the token and
  then onto `session.user`. **Important**: because this is JWT-based, `session.user.workspace`
  and `.role` are snapshotted at login time — if an admin promotes/demotes a user or their
  category changes, that user's own session won't reflect it until they log in again. There is
  no session invalidation mechanism.
- Module augmentation lives in `src/types/next-auth.d.ts` — extend this file (not a local
  interface) whenever you add a field to `session.user`.

## Data model (`prisma/schema.prisma`)

`User` — `profileCategory` (`MOTHER | TEACHER | ADOLESCENT | OTHER`, nullable — many existing
rows are `null`, see the NULL-handling pitfall below) drives which workspace a user belongs to.
`role` (`USER | ADMIN`) is separate from category. `failedLoginAttempts` / `lockedUntil` back the
login lockout.

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

**NULL-handling pitfall (already hit once, now fixed in two places)**: `profileCategory` is
nullable. A Prisma filter like `{ profileCategory: { not: "ADOLESCENT" } }` does **not** match
rows where the column is `NULL` (standard SQL three-valued-logic behavior) — it silently
undercounts. The correct pattern, used in `admin/utilisateurs/page.tsx` and `admin/page.tsx`, is:
```ts
{ OR: [{ profileCategory: null }, { profileCategory: { in: ["MOTHER", "TEACHER", "OTHER"] } }] }
```
If you add another "everyone except ADOLESCENT" filter anywhere, use this pattern, not `not:`.

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

Two upload paths, same shape:

1. **Receipts** (`api/enrollments/route.ts`, user-facing, untrusted): client-declared
   `File.type` is checked against `ALLOWED_RECEIPT_TYPES` (fast pre-filter) **and then** the
   actual bytes are checked against `matchesFileSignature()` (magic-byte check) before writing
   to disk. This two-step exists because `File.type` is fully attacker-controlled — a user could
   upload an HTML/script file with a spoofed `image/jpeg` Content-Type, and the receipt-serving
   route re-uses that same (attacker-influenced) extension to set the response
   `Content-Type` — that's the concrete stored-XSS-via-upload scenario this closes off, on top
   of the `X-Content-Type-Options: nosniff` header on the serving route.
2. **Videos** (`admin/actions.ts` → `saveVideoIfPresent()`, admin-only, trusted): same
   signature-check function is applied here too, for consistency/defense-in-depth, even though
   the threat model is much lower (only an admin can upload).

`extensionForMime()` (in `lib/uploads.ts`) is the single place mapping MIME → file extension —
used both when writing the file and (duplicated as a local `CONTENT_TYPES` map, not imported)
when serving it back in `api/receipts/[enrollmentId]/route.ts` and `api/videos/[lessonId]/route.ts`.
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
