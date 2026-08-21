# Roadmap

Referenced from [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). This is a living list, not a
commitment — update it as items are picked up, finished, or reprioritized. Nothing here is
scheduled; it's organized by how blocking it is for a real public launch.

## Blocking a real public launch

These aren't bugs — the app works correctly — but the content/config is still placeholder and
**must** be replaced before this goes in front of real customers:

- **Real social media URLs**: `src/lib/site.ts`'s `social.parents.{instagram,facebook}` and
  `social.ados.{instagram,facebook,tiktok}` all point at the bare `instagram.com`/`facebook.com`/
  `tiktok.com` homepages. Needs the owner's actual account URLs, one set per workspace.
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

## Infrastructure for serverless (Vercel) deployment

- **Database**: done (2026-08-21) — moved from SQLite to Postgres/Supabase specifically for this.
  See `docs/PROJECT_CONTEXT.md` § "Why Postgres/Supabase" for the connection-string setup and a
  documented `prisma migrate` hang encountered along the way.
- **File storage — still open, now urgent**: receipts and lesson videos live on local disk
  (`/uploads`, gitignored, not public). Vercel's filesystem is not persistent across
  invocations, so this will silently break (uploads disappearing, receipts/videos 404ing) once
  the app is actually live there. Needs to move to object storage (S3, R2, Supabase Storage,
  etc.) with the auth-gated serving routes (`api/receipts/**`, `api/videos/**`) updated to stream
  from there instead of `node:fs`.
- **Demo videos** (`public/uploads/demos/`) are committed to the repo and served as static
  files — fine at their current tiny placeholder size (~28KB each); revisit if real demo videos
  are large, since they'd bloat the git repo and the deployed bundle.

## Known gaps worth closing (not launch-blocking, but real)

- **`/cours` legacy flat catalog**: still live, still linked from `AppNav`'s fallback and from
  nowhere else in the public marketing nav. Either fully retire it (theme every remaining
  reference to route through the workspace-aware catalogs) or keep it intentionally as a
  "browse everything" escape hatch and document that decision — currently it's neither, just
  inertia.
- **JWT session staleness**: promoting/demoting a user, or changing their `profileCategory`,
  doesn't affect their *current* session (see ARCHITECTURE.md § Auth & session) until they log
  in again. Low-impact today (small user base, admin changes are rare) but worth a session
  refresh mechanism (e.g. a `session.update()` trigger, or shortening JWT lifetime) if the app
  grows.
- **No rate limiting on public endpoints** other than the login-lockout added for
  `/api/auth`. `/api/inscription` (sign-up), `/api/enrollments` (receipt upload), and
  `/api/messages` (send message) have no throttling — a scripted client could spam accounts,
  fake enrollment requests, or flood the message inbox. Not urgent for a low-traffic single-coach
  site, but worth revisiting if abuse becomes a real concern.
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
  similar) Prisma model + admin CRUD + a public listing/detail page if built out, following the
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
