# Roadmap

Referenced from [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). This is a living list, not a
commitment — update it as items are picked up, finished, or reprioritized. Nothing here is
scheduled; it's organized by how blocking it is for a real public launch.

## Blocking a real public launch

These aren't bugs — the app works correctly — but the content/config is still placeholder and
**must** be replaced before this goes in front of real customers:

- **Real social media URLs**: social links are now admin-managed (`/admin/parametres`, backed
  by the `SocialLink`/`SocialLinkAssignment` tables) instead of hardcoded — but no
  real links have been entered yet for any platform/surface, so every public footer currently
  renders empty. Needs the owner to add her actual Instagram/Facebook/YouTube/TikTok/WhatsApp
  URLs through the admin UI, choosing which of Global/Parents/Adolescents each one targets.
- **Real bank details**: `site.bankDetails` (bank name, holder, RIB, IBAN) are placeholder
  values shown on every course's payment instructions.
- **Real course content & videos**: all 3 seeded courses and their lesson videos are
  placeholder/test content (`scripts/gen_test_videos.py` generates synthetic filler clips). None
  of them are `ADOLESCENT`-audience yet, so `/ados` currently shows an honest empty state.
- **`AUTH_SECRET` and admin credentials**: must be regenerated for production, not carried over
  from `.env`/seed defaults.
- **`/ados` hero photo (`public/ados.png`) shows a teenage girl; the workspace copy was updated to
  "الشباب والمراهقين" (youth and teens) and a new hero photo of a confident young man was
  requested** — once supplied, replace `site.adosPhoto` the same way `ados.png` replaced the
  original placeholder.
- **Real email sending domain**: no production domain has been chosen yet, so `EMAIL_FROM` in
  `.env`/Vercel is unset and outbound mail (password reset, enrollment notifications) falls back
  to Resend's test sender — see § Email transport below. Once a domain exists, verify it in
  Resend and set `EMAIL_FROM`/`RESEND_API_KEY`.

## Infrastructure for serverless (Vercel) deployment

- **Database**: done (2026-08-21) — moved from SQLite to Postgres/Supabase specifically for this.
  See `docs/PROJECT_CONTEXT.md` § "Why Postgres/Supabase" for the connection-string setup and a
  documented `prisma migrate` hang encountered along the way.
- **Receipt storage → Supabase Storage: done (2026-08-23).** Enrollment receipts moved off local
  disk to a private `receipts` bucket in the same Supabase project as the database — `api/receipts/[enrollmentId]/route.ts`
  and `api/enrollments/route.ts` now go through `src/lib/receiptStorage.ts` instead of `node:fs`.
  Object keys are flat `${randomUUID()}.${ext}` (unchanged naming scheme, only the backend moved)
  stored in the same `Enrollment.receiptPath` column — no schema migration was needed. The
  auth-gated serving route, ownership checks, and magic-byte upload validation are all unchanged.
  Verified end-to-end against the real bucket (upload → serve → withdraw → object actually
  removed, confirmed via `list()`) with a disposable QA account, since there were no real
  production receipts yet to worry about (pre-launch). Requires `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` in `.env` (local) and Vercel's environment variables (production).
- **Lesson video storage — still open, now the only remaining piece.** Lesson videos still live on
  local disk (`/uploads/videos`, gitignored, not public). Vercel's filesystem is not persistent
  across invocations, so this will silently break (videos 404ing) once the app is actually live
  there. Demo videos (`public/uploads/demos/`) are unaffected — they're committed static assets,
  not runtime uploads. Video migration was intentionally not bundled with the receipt migration
  above (different urgency, and the video plan already points at Bunny Stream, not generic object
  storage — see below) — **still blocked on Bunny credentials**, see next entry.
- **Video delivery → Bunny Stream — planned for V2, blocked on credentials.** Same status: no
  Bunny.net account, library ID, or API key exist anywhere in this repo. See the "Real DRM/
  screen-recording-resistant video delivery" entry further down — the V2 plan already settled on
  Bunny Stream specifically (signed playback URLs, player stays in-app, local video kept as a
  `bunnyVideoId ? Bunny : local` fallback during migration). Needs: a Bunny Stream library created,
  its Library ID, and a Stream API key with permission to create videos and generate signed
  playback URLs.
- **Demo videos** (`public/uploads/demos/`) are committed to the repo and served as static
  files — fine at their current tiny placeholder size (~28KB each); revisit if real demo videos
  are large, since they'd bloat the git repo and the deployed bundle.

## Email transport — infrastructure and templates done, production sender not configured

Password reset and sign-up OTP confirmation are both owned by Supabase Auth as of the 2026-08
migration off NextAuth — Supabase sends those emails itself (through Resend as the project's
configured SMTP provider), not through this app's `sendEmail()`/`emailTemplates.ts`.

> **Manual dashboard step for the OTP-based password reset (2026-08-27).** The reset flow no
> longer uses a clickable link — `/reinitialiser-mot-de-passe` expects the user to type a
> 6-digit code. Supabase's default **Authentication → Email Templates → "Reset Password"**
> template only renders `{{ .ConfirmationURL }}`, so it must be edited **in the Supabase
> dashboard** (this project has no `supabase/` config dir — templates are dashboard-only) to
> prominently display `{{ .Token }}` and explain the code is entered on the website. Until that
> edit is made, recovery emails arrive with no visible code and the flow cannot be completed.
> Suggested body: a short line such as "رمز إعادة تعيين كلمة المرور:" followed by
> `{{ .Token }}` in a large weight, plus "أدخلي هذا الرمز في الموقع لإتمام إعادة التعيين. تنتهي
> صلاحيته خلال ساعة." The link/`{{ .ConfirmationURL }}` markup should be removed so users aren't
> offered a dead path.

What this
app's own email pipeline still sends: enrollment-approved/rejected notifications (V2 Phase 8,
2026-08-23), routed through one shared function, `sendEmail()` in `src/lib/email.ts`, via Resend.
Their branded HTML + plain-text templates live in `src/lib/emailTemplates.ts` (shared RTL layout,
terracotta/cream brand colors, escaped user-supplied content). The sender is entirely
environment-driven (2026-08-24) — `EMAIL_FROM`
(a full `"Name <address@domain>"` string), not hardcoded anywhere. With no `EMAIL_FROM` set, it
falls back to Resend's own test sender (`onboarding@resend.dev`, sends real mail without a
verified domain) so dev/staging can be exercised without a domain decision. With no
`RESEND_API_KEY` set at all, it logs the message instead of sending it (visible in server logs),
so the rest of the app was built and tested against a stable interface either way. **What's
still open**: the real production `EMAIL_FROM` (a verified sending domain) — blocked on the same
"real domain not chosen yet" gap as the rest of the launch content, see § Blocking a real public
launch. Once a domain exists: verify it in Resend, set `EMAIL_FROM` and `RESEND_API_KEY` in
Vercel's environment variables — no code changes needed. This isn't a placeholder that fakes
success; the app just doesn't claim to have sent anything it hasn't (the forgot-password page
redirects to the OTP-entry screen regardless of whether the address has an account, since the
no-enumeration requirement means it can't reveal more than that regardless of transport).

## Known gaps worth closing (not launch-blocking, but real)

- **`/cours` legacy flat catalog**: still live, still linked from `AppNav`'s fallback and from
  nowhere else in the public marketing nav. Either fully retire it (theme every remaining
  reference to route through the workspace-aware catalogs) or keep it intentionally as a
  "browse everything" escape hatch and document that decision — currently it's neither, just
  inertia.
- **JWT session staleness**: promoting/demoting a user, or changing their `profileCategory`,
  doesn't affect their *current* session (see ARCHITECTURE.md § Auth & session) until they log
  in again. Re-reviewed during the V2 Phase 8 pass (2026-08-23) and deliberately left as-is —
  still low-impact (small user base, admin changes are rare), and a session-refresh mechanism
  would touch the auth core for a benefit that doesn't justify it yet. Revisit if the app grows.
- **Rate limiting beyond login: done (V2, 2026-08-23).** A small DB-backed sliding-window
  limiter (`src/lib/rateLimit.ts`, backed by the `RateLimitHit` table — no external infra, works
  fine across stateless serverless instances since Postgres is the shared state) now covers
  `/api/inscription` (10/hour/IP), `/api/enrollments` (10/hour/user), `/api/messages` POST
  (30/min/user), `/api/auth/forgot-password` (5/hour/IP), and `/api/lessons/[lessonId]/progress`
  (60/min/user — generous headroom over the ~12/min legitimate heartbeat cadence; this is
  volume/DoS protection, not the forgery defense, which is the rate-limited `furthestSeconds` math
  already in that route).
- **RLS: explicitly reviewed, not needed.** All application database access goes through the
  server-only **service-role** Supabase client (`src/lib/supabase/db.ts`), which bypasses RLS
  by design — the same trust model as any server-side Postgres app. The service-role key has no
  `NEXT_PUBLIC_` prefix and is never imported by a `"use client"` module, so it is never bundled
  into browser code; the browser only ever gets the anon key, which is used solely for Supabase
  **Auth**, not data. RLS matters for a browser-side PostgREST/anon-key data-access pattern,
  which this app does not use. Revisit only if that changes. (Note: the Prisma→Supabase
  migration changed the *mechanism* — PostgREST over HTTPS instead of a raw pooled connection —
  but not this trust boundary.)
- **Public course search: still deferred.** 3 published courses total as of 2026-08-23 — nowhere
  near enough to justify search/filter UI. Revisit once the catalog actually grows (the admin
  side already has search/filter/bulk actions, built when that volume justified it — see
  PROJECT_CONTEXT.md's "Honest gaps" note).
- **No automated tests.** Every verification pass in this project so far has been manual
  (`tsc`, `eslint`, `npm run build`, and a throwaway QA account clicking through the browser).
  There is no unit/integration/e2e test suite. If the codebase keeps growing, this is the single
  highest-leverage investment to reduce regressions — see CONTRIBUTING.md for how manual
  verification is currently done in its place.
- **Toggle-button-group pattern is duplicated** (profile-category picker in 3 places, admin
  filter tabs in 2 places) rather than extracted into a shared component. Low cost today, worth
  consolidating if a 4th instance shows up.
- **`CATEGORY_LABEL`-style maps keyed by enum values are easy to forget a case for** — this
  already happened once (the admin user-detail page's category label map was missing
  `ADOLESCENT`, found and fixed during a later audit). Whenever `ProfileCategory` or
  `CourseAudience` gains a new value, grep for every `Record<string, ...>` keyed by that enum's
  string values and update all of them, not just the one you're working on.

## Feature ideas raised but not started

These came up in conversation with the site owner as intent ("خدماتنا" services list) but only
the landing-page *description* of them exists — none has actual functionality yet:

- **Individual consultations** (استشارات فردية) — currently just a labeled card on the hub; no
  booking/scheduling flow exists anywhere in the app.
- **Books & articles** (كتب ومقالات) — no content model, no page. Would need a new `Article` (or
  similar) table + admin CRUD + a public listing/detail page if built out, following the
  same pattern as `Course`.
- **Guardian-mediated enrollment for minors** — explicitly considered and deferred: adolescents
  currently self-enroll exactly like adult users (same receipt-upload flow). A more realistic
  "parent/guardian account manages a linked child's enrollment" model was discussed but scoped
  out of v1 as a materially bigger feature (new data model, linked-account UX).
- **Per-workspace payment details / WhatsApp number** — considered and explicitly decided
  *against* for now: one shared bank account and one shared WhatsApp number serve both
  workspaces. Revisit only if the business itself splits these.

## Long-term / vision-level ideas (not committed, just plausible directions)

- A second language (French, given the business context) — would require dictionary
  restructuring (see ARCHITECTURE.md § i18n) since the app currently hardcodes a single Arabic
  dictionary rather than a locale-keyed lookup.
- Real DRM/screen-recording-resistant video delivery (Mux, Bunny Stream, Cloudflare Stream) if
  course-content piracy becomes a real business concern — explicitly documented in the README as
  a known, accepted limitation of the current plain-`<video>` approach, not a bug.
- Splitting the admin's enrollment/messages/users views with more granular workspace filtering
  (already done for courses, users, and requests — could extend to messages if the coach wants
  to triage adolescent vs. parent/teacher conversations separately).
