# Project Context — هند بنياس (Hind Benyas) Coaching Platform

**This is the single source of truth for this repository.** Read this file first, in full,
before making any change. It links out to four companion documents for depth:

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — folder structure, routing, data model, auth, file
  uploads, i18n mechanics.
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — colors, typography, spacing, components, RTL rules.
- [`ROADMAP.md`](ROADMAP.md) — what's placeholder, what's missing, what's planned.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — coding conventions, verification workflow, what not to
  change casually.

Also read [`AGENTS.md`](AGENTS.md) at the repo root before writing any code — it's short, and it
matters: **this Next.js version has APIs and conventions that differ from what you may already
know** (e.g. `params`/`searchParams` are `Promise`s, `error.js` prefers `unstable_retry` over
`reset`). Check `node_modules/next/dist/docs/` before using an App Router API you're not certain
about. `HANDOFF.md` at the repo root is a point-in-time audit log from earlier in this project's
history — useful historical context, not a current status document (this file supersedes it).

---

## 1. Project Overview

**Purpose**: a coaching platform for **Hind Benyas** (هند بنياس), a certified awareness/mindset
coach (مدربة وعي معتمدة من مؤسسة صناع القرار الدولية). The site sells access to video courses
via a manual bank-transfer + receipt-upload flow (no payment gateway), and provides a small
in-app messaging channel between enrolled users and the coach.

**Target audience** — explicitly split into **two workspaces**:
1. **Adolescents** (`/ados`) — teens themselves, as direct users.
2. **Mothers & female teachers** (`/parents-enseignants`) — women who accompany teenagers, plus
   general self-development seekers. This is a deliberate scope decision, not an oversight: all
   Arabic copy for this workspace uses feminine forms (`الأمهات والأستاذات`, not `الأساتذة`) —
   don't reintroduce a masculine "أستاذ" form when touching this workspace's copy.

Every user account belongs to exactly one workspace, derived from their `profileCategory` at
sign-up (`ADOLESCENT` → ados workspace; `MOTHER`/`TEACHER`/`OTHER`/unset → parents/teachers
workspace). See `ARCHITECTURE.md` § Auth & session.

**Goals**: let each audience land on content and courses that feel specifically made for them
(distinct hero copy, palette accent, social-media presence) while sharing one login system, one
payment/approval flow, and one admin panel behind the scenes — avoid building two separate apps.

**Current development status**: **functionally complete, content-incomplete.** Every flow works
end-to-end and has been manually verified (see `CONTRIBUTING.md` § Verification workflow): sign-up
→ browse → enroll → upload receipt → admin approves → watch lessons → message the coach. The
gaps are all *content*, not *code* — see `ROADMAP.md` § Blocking a real public launch for the
exact list (real photo, real social URLs, real bank details, real course videos, adolescent
workspace has zero real courses yet).

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), **React 19** |
| Language | **TypeScript**, strict mode |
| Styling | **Tailwind CSS v4** (`@theme inline` tokens in `globals.css`, no config file) |
| Database | **Postgres (Supabase)** via **Prisma 6** — pooled `DATABASE_URL` for runtime, session-pooler `DIRECT_URL` for migrations |
| Auth | **NextAuth v5 (beta)**, Credentials provider, JWT sessions (no DB session table) |
| Icons | **lucide-react**, exclusively |
| Password hashing | **bcryptjs** |
| Fonts | **Tajawal** (Google Font, via `next/font/google`) — the only typeface in the app |
| Dev seed | `tsx prisma/seed.ts` (creates 1 admin + 3 example courses + demo videos) |
| Linting | **ESLint 9**, `eslint-config-next` |
| Testing | **None.** No test framework, no CI. Verification is manual (see `CONTRIBUTING.md`). |
| File storage (receipts) | **Supabase Storage**, private `receipts` bucket, same project as the
  database. Accessed only server-side via the service-role key — see `ARCHITECTURE.md` § File
  uploads & serving. |
| Deployment | **Vercel**, connected to the `hinddbns/Hind_page` GitHub repo. Database moved to
  Postgres/Supabase to support this (SQLite's local file doesn't survive serverless). Local-disk
  storage for lesson videos (`/uploads/videos`) remains a known gap under serverless — see
  `ROADMAP.md`. Receipts were migrated off local disk to Supabase Storage (2026-08-23) for the
  same reason. |

Full dependency list: `package.json`. Notably minimal — no state-management library, no
data-fetching library (SWR/React Query/tRPC), no UI component library, no CSS-in-JS. Data
fetching is `async` Server Components calling `prisma` directly; the only client-side data
fetching is a few `fetch()` calls in client components for messaging/polling.

---

## 3. Architecture

Full detail in [`ARCHITECTURE.md`](ARCHITECTURE.md). Summary:

- **Three route "shells"**: `(marketing)` (public), `(app)` (authenticated), and a standalone
  `cours/` tree that switches its own nav/footer based on session — used because course detail
  pages must work identically for logged-out and logged-in-but-pending visitors.
- **Two layers of auth gating**: `src/proxy.ts` (Next.js middleware) redirects at the edge;
  `(app)/layout.tsx` and `(app)/admin/layout.tsx` redirect again server-side. Deliberate
  defense-in-depth, not redundant by accident.
- **Server Actions for admin mutations** (`admin/actions.ts`), **Route Handlers for everything
  else** (`app/api/**`). This split is deliberate and documented in `ARCHITECTURE.md` — don't mix
  the two patterns.
- **File uploads have a trust boundary**: user-submitted receipts are validated by actual file
  signature (magic bytes), not just the client-declared MIME type, because that's spoofable and
  was a real (now-closed) stored-XSS risk. See `ARCHITECTURE.md` § File uploads & serving.
- **No React Context for i18n** — `useLocale()`/`getT()` just return the single imported Arabic
  dictionary directly. There is no locale switching today.
- **State management**: none beyond `next-auth`'s `SessionProvider` and ordinary component-local
  `useState`. No Redux/Zustand/Jotai — not missing, just genuinely not needed at this app's scale.
- **Styling system**: Tailwind utility classes only, tokens defined in `globals.css`. See
  `DESIGN_SYSTEM.md`.
- **Assets**: `public/logo.jpg` (brand mark, used everywhere), `public/uploads/demos/` (public
  demo videos), a **separate, non-public** `uploads/` directory at the repo root (gitignored)
  holding lesson videos, and a private Supabase Storage bucket (`receipts`) holding enrollment
  receipts — all three served only through auth-gated API routes, never as static assets.

---

## 4. Pages

Route segments are French, all visible content is Arabic (RTL) — see `CONTRIBUTING.md` §
Naming conventions for why.

### Marketing (public, route group `(marketing)`)

| Route | File | Purpose | Status |
|---|---|---|---|
| `/` | `page.tsx` | **The hub.** Neutral, audience-agnostic landing page. Opens with a personal "hook" statement + scroll cue, then: expanded about-Hind (photo, role, message, real stats), Mission & Vision, full credentials list, track record, values, services, then a "choose your space" section linking to `/ados` and `/parents-enseignants`, then generic how-it-works/testimonials/final-CTA. | Fully built. |
| `/ados` | `ados/page.tsx` | Adolescent-workspace landing page (gold/`accent`-toned): hero photo, mission statement + "why this space" story + 3 goals, 3 "why this space" cards, how-it-works, a course grid filtered to `audience: ADOLESCENT`, 2 real testimonials, final CTA. | Fully built; course grid is empty (honest "coming soon" state) since no adolescent courses exist yet. |
| `/parents-enseignants` | `parents-enseignants/page.tsx` | Parents/teachers-workspace landing page (olive-toned): hero photo, mission statement + "why this space" story + 3 goals, "pour qui" (mothers / teachers / general self-development) cards, how-it-works, course grid filtered to `audience: PARENT_TEACHER`, 3 real testimonials, final CTA. | Fully built and populated — this is where all 3 seeded example courses currently live. |
| `/connexion` | `connexion/page.tsx` | Login. Client component, `signIn("credentials", { redirect: false })`, then `router.push`. Shows a generic error for any failure (wrong password *or* locked-out account — deliberately not distinguished, see `ARCHITECTURE.md` § Auth). Reads an optional `?workspace=ADOLESCENT\|PARENT_TEACHER` search param (via `src/lib/authTheme.ts`) to show a gold/olive space badge and a "welcome back to your space" subtitle instead of the generic one — purely cosmetic continuity, doesn't affect auth logic. | Fully built. |
| `/inscription` | `inscription/page.tsx` | Sign-up. Collects name/email/phone(optional)/date-of-birth(optional)/profile-category(mother, teacher, adolescent, other)/password+confirm. Client-side mismatch check before hitting `/api/inscription`, then auto-signs-in on success. Same `?workspace=` param as `/connexion`: for `ADOLESCENT` it pre-selects the "مراهق(ة)" category (still changeable) and applies the gold theme; for `PARENT_TEACHER` it applies the olive theme without pre-selecting a category (ambiguous between mother/teacher/other). Every entry point on `/ados` and `/parents-enseignants` (hero CTA, final CTA, `Nav`, `Footer`) links here with the matching `workspace` value already set; links from the neutral hub stay bare. | Fully built. |

### Shared (`cours/`, not in a route group)

| Route | File | Purpose | Status |
|---|---|---|---|
| `/cours` | `cours/page.tsx` | Flat, unfiltered catalog of every published course. **Legacy** — no longer linked from the public nav (superseded by the two workspace-specific catalogs) but still functional; kept as a safe fallback. See `ROADMAP.md` for the open question of whether to retire it fully. | Functional, low-priority to revisit. |
| `/cours/[slug]` | `cours/[slug]/page.tsx` | Public course detail: demo video (public preview), lesson list (titles only if not enrolled), and the enrollment/receipt-upload UI (`UploadReceiptForm`). The "back to catalog" link routes to `/ados` or `/parents-enseignants` based on the course's own `audience`, not the visitor's login state. | Fully built. |

### Authenticated app (route group `(app)`)

| Route | File | Purpose | Status |
|---|---|---|---|
| `/tableau-de-bord` | `tableau-de-bord/page.tsx` | User dashboard: personalized `CoachReminder` widget, list of the user's enrollments with status badges, "discover courses"/"see more courses" links (workspace-aware). | Fully built. |
| `/tableau-de-bord/cours/[slug]` | `.../[slug]/page.tsx` | Actual course content for an **approved** enrollment only (redirects to the public detail page otherwise). Gates on an unanswered questionnaire first if the course has one enabled; otherwise shows lessons with `SecureVideoPlayer`. | Fully built. |
| `/tableau-de-bord/messages` | `.../messages/page.tsx` | User's chat thread with the coach (`ChatPanel`), shows the configured availability text. | Fully built. |
| `/profil` | `profil/page.tsx` | Account info (read-only email/role) + `PersonalInfoForm` (name/phone/DOB/category) + `PasswordChangeForm`. | Fully built. |
| `/admin` | `admin/page.tsx` | Overview: total stat tiles (pending/approved/users/courses) **and** a per-workspace breakdown of the same four numbers, recent pending requests. | Fully built. |
| `/admin/demandes` | `admin/demandes/page.tsx` | Enrollment review queue: workspace filter tabs, receipt link, approve/reject (`ConfirmActionForm`). | Fully built. |
| `/admin/cours` | `admin/cours/page.tsx` | Course list + create form (`CourseForm`), workspace filter tabs, audience badge per row, publish/unpublish/delete. | Fully built. |
| `/admin/cours/[id]` | `admin/cours/[id]/page.tsx` | Single course: read-only overview, edit form (`CourseForm`), lesson list with edit (`LessonForm`) + delete, add-lesson form. | Fully built. |
| `/admin/cours/[id]/questionnaire` | `.../questionnaire/page.tsx` | Questionnaire builder for one course: on/off toggle (with a warning if questions exist but it's off), question list with edit/delete (`QuestionForm`), add-question form. | Fully built. |
| `/admin/cours/[id]/questionnaire/[userId]` | `.../[userId]/page.tsx` | Read-only view of one user's answers to one course's questionnaire. | Fully built. |
| `/admin/utilisateurs` | `admin/utilisateurs/page.tsx` | User list: workspace filter tabs, category column, link to detail. | Fully built. |
| `/admin/utilisateurs/[id]` | `.../[id]/page.tsx` | User detail: info, promote/demote (self-demotion and last-admin-demotion both blocked server-side), enrollment list with links to questionnaire responses. | Fully built. |
| `/admin/messages` | `admin/messages/page.tsx` | Inbox: one row per user with any messages, unread dot, last-message preview. | Fully built. |
| `/admin/messages/[userId]` | `.../[userId]/page.tsx` | One conversation thread (`ChatPanel`, admin mode). | Fully built. |
| `/admin/parametres` | `admin/parametres/page.tsx` | Single form: the "availability" text shown to users on the messages page. | Fully built. |

### System pages

| Route | File | Purpose |
|---|---|---|
| (any unmatched URL) | `src/app/not-found.tsx` | Branded 404 — logo, "404", message, link home. Renders inside the root layout only (no marketing/app nav+footer, since an unmatched URL doesn't belong to either route group). |
| API routes | `src/app/api/**/route.ts` | See `ARCHITECTURE.md` § Server Actions vs. API Routes for the full list and the error-code contract they follow. |

---

## 5. Reusable Components

All in `src/components/` unless noted. Every prop type is inlined at the component (no separate
`Props` type) — see `CONTRIBUTING.md`.

### Layout / shell

| Component | Does | Used in | Key props |
|---|---|---|---|
| `Nav.tsx` | Public top nav: logo, "من نحن"/"مساحة الشباب والمراهقين"/"مساحة الأمهات والأستاذات" links, connexion/inscription buttons, mobile hamburger menu. Client component (`useSession` to decide auth-state links). Its connexion/inscription hrefs append `?workspace=ADOLESCENT`/`PARENT_TEACHER` when `usePathname()` is `/ados`/`/parents-enseignants`, so those buttons carry the space's identity into the auth pages (see `src/lib/authTheme.ts`). | `(marketing)/layout.tsx` | none |
| `Footer.tsx` | Public footer: logo, workspace links, `SocialLinks`. Picks the `parents` vs `ados` social variant based on `usePathname()` (`/ados` → ados set, everything else → parents set). Its own connexion link is workspace-aware the same way `Nav.tsx`'s are. Client component. | `(marketing)/layout.tsx`, `cours/layout.tsx` (logged-out branch) | none |
| `AppNav.tsx` | Logged-in top nav: logo, workspace-aware "courses" link (`/ados` or `/parents-enseignants` depending on `session.user.workspace`), messages (with `UnreadBadge`), profile, sign-out. Top accent bar switches color for adolescent-workspace users. Client component. | `(app)/layout.tsx`, `cours/layout.tsx` (logged-in branch) | none |
| `AppFooter.tsx` | Logged-in footer: logo, `SocialLinks` with variant chosen server-side from `session.user.workspace`. Server component. | `(app)/layout.tsx`, `cours/layout.tsx` (logged-in branch) | none |

### Marketing content

| Component | Does | Used in | Key props |
|---|---|---|---|
| `CoachPortrait.tsx` | **Placeholder** for the coach's photo — gradient blob + initial letter + caption. Replace with a real `next/image` once the photo is available (see `ROADMAP.md`). | Hub `/` "about" section | `caption: string`, `alt: string` |
| `CoachAvatar.tsx` | Small circular avatar (initial letter on a gradient), used where a tiny brand mark fits better than the full photo/logo. | `CoachReminder.tsx` | `size?: number` |
| `CoachReminder.tsx` | Dashboard widget: avatar + role + a personalized blurb chosen by the user's `profileCategory` (mother/teacher/adolescent text, or the general "رسالتي" message otherwise) + real stats. | `tableau-de-bord/page.tsx` | `t: Dictionary`, `category?: ProfileCategory \| null` |
| `CourseCard.tsx` | Course preview card: demo-video badge or title-initial placeholder, title, summary, price, CTA link. | Both workspace pages, `/cours` | `course: {...}`, `ctaLabel`, `demoLabel` |
| `SocialLinks.tsx` | Renders Instagram/Facebook(/TikTok) icon links from `site.social[variant]`. | `Footer`, `AppFooter`, both workspace pages | `className?`, `variant?: "parents" \| "ados"` (default `"parents"`) |
| `WhatsAppButton.tsx` | Fixed floating WhatsApp button, one shared number for the whole site. | Root `layout.tsx` (every page) | `label: string` |

### Forms & auth

| Component | Does | Used in | Key props |
|---|---|---|---|
| `PasswordInput.tsx` | Password `<input>` with a single-click show/hide eye toggle (`lucide-react` `Eye`/`EyeOff`). Reusable across every password field in the app. | `inscription`, `connexion`, `PasswordChangeForm` | `value`, `onChange`, `required?`, `minLength?`, `id?`, `autoComplete?`, `className?` |
| `PersonalInfoForm.tsx` | Client form: name/phone/DOB/profile-category, posts to `/api/profil/info`. | `/profil` | `initialName`, `initialPhone`, `initialDateOfBirth`, `initialProfileCategory` |
| `PasswordChangeForm.tsx` | Client form: current/new/confirm password, posts to `/api/profil/password`. | `/profil` | none |
| `UploadReceiptForm.tsx` | The enrollment UI: locked read-only card while `PENDING` (view receipt, withdraw), full form when no enrollment or `REJECTED` (upload/replace receipt + optional note). | `/cours/[slug]` | `courseId`, `existing?: { id, note, status }` |
| `QuestionnaireForm.tsx` | Respondent-facing form for a course's onboarding questionnaire — renders the right input per `QuestionType` (textarea/radio/checkbox/scale-buttons), validates completeness client-side before submit. | `tableau-de-bord/cours/[slug]/page.tsx` | `courseId`, `questions`, `initialAnswers` |
| `QuestionForm.tsx` | Admin-facing add/edit form for **one** questionnaire question (type selector + conditional fields for choices/scale). Uses `useId()` since multiple instances render on one page. | `admin/cours/[id]/questionnaire/page.tsx` | `action`, `mode: "add" \| "edit"`, `submitLabel`, `initialType?`, `initialText?`, `initialOrder?`, `initialOptions?`, `initialScaleMin?`, `initialScaleMax?`, `initialScaleMinLabel?`, `initialScaleMaxLabel?` |

### Messaging

| Component | Does | Used in | Key props |
|---|---|---|---|
| `ChatPanel.tsx` | Full chat UI: polls `GET /api/messages` every 5s, posts new messages, auto-scrolls, distinguishes "mine"/"theirs"/system messages by side/color. Works for both the user and admin side via `isAdmin`. | `tableau-de-bord/messages`, `admin/messages/[userId]` | `targetUserId`, `isAdmin`, `placeholder?` |
| `UnreadBadge.tsx` | Small red count pill, polls `/api/messages/unread-count` every 20s independently wherever mounted. Renders nothing if count is 0. | `AppNav`, `admin/layout.tsx` sidebar | none |
| `SecureVideoPlayer.tsx` | `<video>` wrapper: disables download button, PiP, remote playback, and right-click context menu. **Honest limitation**: does not and cannot prevent screen recording — see the README/`ROADMAP.md` note on this. | `tableau-de-bord/cours/[slug]/page.tsx` | `src`, `className?` |

### Admin-only (`src/components/admin/`)

| Component | Does | Used in | Key props |
|---|---|---|---|
| `ConfirmActionForm.tsx` | Wraps **any** `ActionState`-returning Server Action in a zero-visible-field form; the submit button optionally gates on `window.confirm(confirmMessage)` before submitting, shows pending state via `useFormStatus`, shows `state.error` inline. **The** pattern for every destructive/state-changing admin button. | Everywhere in `/admin` (delete, publish toggle, approve/reject, promote/demote, questionnaire toggle) | `action`, `confirmMessage?`, `label`, `pendingLabel`, `className` |
| `CourseForm.tsx` | Create/edit course: title, slug (create-only), price, audience selector, summary, description, demo video (file or URL). Self-managed open/close state (a button, not `<details>`, so it survives the server-driven re-render after a successful save). Uses `useId()` for label association. | `admin/cours`, `admin/cours/[id]` | `action`, `mode: "create" \| "edit"`, `initial?`, `defaultOpen?` |
| `LessonForm.tsx` | Add/edit lesson: title, order, video (file or URL), content. Same self-managed open/close + `useActionState` pattern as `CourseForm`. | `admin/cours/[id]` | `action`, `mode: "add" \| "edit"`, `initial?`, `defaultOpen?` |
| `SettingsForm.tsx` | Single-field form for the availability text. | `admin/parametres` | `action`, `initialAvailability` |

---

## 6. Design System

Full detail in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Summary:

- **Arabic, RTL, single language** — always use logical Tailwind properties (`ps-*`, `pe-*`,
  `start-*`, `end-*`), never physical ones.
- **One typeface** (Tajawal) at different sizes/weights; `font-serif` is a heading-weight
  convention, not a different font family.
- **Warm palette**: terracotta `primary` for the parents/teachers side and general CTAs, gold
  `accent` for the adolescent workspace's identity, sarcelle `secondary` for personal/about-Hind
  content, plus `success`/`danger` for status.
- **Consistent primitives**: pill buttons (filled/outlined), pill status badges (3-way
  success/danger/accent color scheme), `rounded-2xl`/`rounded-3xl` cards, alternating
  `bg-cream-dark/60` section tints for rhythm on long pages.
- **Minimal animation**: one shared `.animate-shell-arrive` fade-in on every layout's `<main>`,
  respecting `prefers-reduced-motion`; Tailwind's `animate-bounce` used once for the hub's
  scroll-cue.
- **Mobile-first**, single `md:` breakpoint for the vast majority of responsive behavior.

---

## 7. Current Features

**Fully implemented** (built, wired end-to-end, manually verified working):
- Two-workspace landing experience (`/ados`, `/parents-enseignants`) with workspace-derived
  session data, workspace-scoped course catalogs, and workspace-scoped social links.
- Full course lifecycle: create/edit/publish/delete (admin) → browse/preview demo → enroll via
  bank-transfer receipt upload → admin review (approve/reject) → protected lesson video
  streaming with seek support.
- Optional per-course onboarding questionnaire (4 question types) gating first access to lessons.
- In-app messaging (user ↔ admin) with an automatic first-contact reply and unread-count badges.
- Full admin panel: courses, lessons, questionnaire builder + response viewer, enrollment queue,
  user management (promote/demote with safety checks), messaging inbox, availability setting —
  all now workspace-aware (filters, badges, and a per-workspace stats breakdown on the overview).
- Account system: sign-up with profile category, login, profile editing, password change —
  every password field has a confirm step where relevant and a single-click show/hide toggle.
- Security hardening: login lockout after repeated failures, real file-signature validation on
  uploads (not just client-declared MIME type), `nosniff` headers on file-serving routes.
- Accessibility: every form field in the app has a properly associated `<label>` (`htmlFor`/`id`
  or native wrapping), verified across all ~10 forms in the codebase.
- Branding: logo integrated into every nav/footer/favicon/auth-page touchpoint, custom branded
  404 page.
- Rich, real "about Hind" content on the hub: hook statement, mission, vision, full credentials
  list, track record, services overview — replacing earlier placeholder copy.

**Partially implemented** (the code path exists and works, but the content behind it is
placeholder or the audience side is empty):
- `/ados` workspace: fully functional page and course-filtering logic, but **zero real courses**
  assigned to it yet — shows an honest "coming soon" empty state.
- Coach photo: the "about" section is built and photo-shaped, but still shows the
  `CoachPortrait` gradient-blob placeholder.
- Social media links, bank transfer details, testimonials: all real UI, all placeholder data.

**Planned / not started** (see `ROADMAP.md` for full detail):
- Individual-consultation booking flow, books/articles content type (currently just described on
  the hub, no functionality behind them).
- Guardian-mediated enrollment for minors (deliberately deferred; adolescents currently
  self-enroll like adults).
- A second language.
- Automated tests of any kind.
- Real DRM-grade video protection (current protection is UI-level deterrents only, documented as
  an accepted limitation, not a gap to silently close).

---

## 8. Development Decisions

**Why Server Actions for admin, Route Handlers for everything else.** The original admin
mutations threw raw `Error`s directly from form actions, which crashed the whole page to Next's
default error boundary on any validation failure (see `HANDOFF.md` for the original incident).
The fix — `ActionState` + `runAction()` + `ConfirmActionForm` — is now the mandatory pattern for
admin; user-facing flows use ordinary `fetch()`-driven API routes because they need
client-side-only concerns (file previews, optimistic local state) that don't fit the Server
Action model as cleanly, and because the error-code-mapping pattern was already well-established
there before the admin rewrite.

**Why the workspace is derived from `profileCategory`, not a separate field.** Adding a second
top-level `workspace` column would create two sources of truth that could disagree. A one-line
pure function (`workspaceFromCategory`) computed at auth time and cached on the session is
simpler and can't drift out of sync with the category a user actually chose.

**Why Postgres/Supabase (moved from SQLite 2026-08-21).** The app was originally SQLite —
single-coach, single-server-instance, zero external infrastructure. Deploying to Vercel
(serverless) made that untenable: a local SQLite file doesn't persist across invocations. Moved
to Supabase Postgres instead of standing up separate infrastructure, since it's a managed
Postgres with a connection pooler built for exactly this (many short-lived serverless
connections). Two connection strings are used deliberately: `DATABASE_URL` (transaction pooler,
port 6543, `?pgbouncer=true` to disable prepared-statement caching) for the app's runtime
queries, and `DIRECT_URL` (session pooler, port 5432) for `prisma migrate`/`db execute` — the
project's true direct-connection host is IPv6-only, which isn't reachable from every network, so
the session pooler is the practical substitute. `prisma migrate dev`/`deploy` were found to hang
indefinitely against this pooler setup in local testing; the working pattern is
`prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ... --script` (or
`--from-empty` for a from-scratch diff) to generate migration SQL offline, then
`prisma db execute --file ... --url "$DIRECT_URL?connect_timeout=10"` to apply it directly. If
you hit the same hang, don't spend more time retrying `migrate dev`/`deploy` — use this pattern
instead.

**Root cause confirmed (2026-08-23, V2 Phase 8 pass): `prisma migrate resolve --applied` hits
the exact same wall, and now with a precise error** — `P1002: ... Timed out trying to acquire a
postgres advisory lock`. PgBouncer in transaction-pooling mode (what `DATABASE_URL` uses) doesn't
preserve session state across statements, so a session-scoped advisory lock can never succeed
against it — this isn't a timing fluke, `migrate resolve` will never complete against the pooled
URL, no amount of retrying fixes it. Unlike `db execute`, `migrate resolve` has no `--url` flag
to point it at `DIRECT_URL` instead. The workaround: insert the bookkeeping row into
`_prisma_migrations` yourself, matching the columns Prisma itself would write (`id` as a random
UUID, `checksum` as `sha256(migration.sql contents)` hex-encoded, `finished_at`/`started_at` both
`now()`, `migration_name`, `logs: ''`, `applied_steps_count: 1`) via a one-off script using the
already-working Prisma Client (see next paragraph — the client itself isn't affected by this,
only the CLI's migrate commands are). A checksum computed this way is only used for local
drift-detection warnings, not correctness, so a script-level SHA-256 match is sufficient.

**Also confirmed: `prisma generate`'s failure mode on Windows is narrower than it looks.** The
documented `EPERM: ... rename query_engine-windows.dll.node.tmp... -> query_engine-windows.dll.node`
error (when another process — e.g. a second `next dev`/`next start` — has the current engine
binary loaded) only blocks the *native binary* replacement step. The generated TypeScript client
code and `.d.ts` types are written *before* that step and typically succeed regardless — so
`prisma generate` reporting EPERM does not necessarily mean the client is stale. Verify directly
(`npx tsx` a one-off script that queries a newly-added model) before concluding you're blocked;
in practice the existing engine binary is usually still ABI-compatible since it doesn't change
per schema edit, only per Prisma version. What *does* stay stale is any **already-running**
`node` process (like a long-lived `next dev`) that imported `@prisma/client` before the schema
change — Node doesn't hot-reload `node_modules` internals, so that process's in-memory client
genuinely won't know about new models until it restarts, even though the files on disk and a
freshly-started process are fine. If you don't own that running process, don't kill it — verify
against a disposable `next start` (after `npm run build`) on a different port instead.

**Why JWT sessions instead of database sessions.** Same reasoning — one fewer table, one fewer
round-trip per request, acceptable given the app's scale. The tradeoff (session data can go
stale until re-login — see `ARCHITECTURE.md`) is accepted, not unnoticed.

**Why polling instead of WebSockets for messaging.** A single coach, presumably a modest number
of concurrent users, and a 5s/20s polling interval is imperceptible in practice while being far
simpler to reason about, deploy, and debug than a persistent-connection architecture.

**Why file-signature validation was added reactively.** An initial security audit found that
upload validation trusted the client-declared `Content-Type` alone, which is trivially spoofable
and could enable a stored-XSS-via-upload attack against the admin (who views user-submitted
receipts). `lib/fileSignature.ts` closes this by checking actual magic bytes, applied to both the
untrusted (receipts) and trusted (admin video) upload paths for consistency.

**Why login lockout was added.** Same audit pass — no brute-force protection existed on the
login endpoint. Added a straightforward 5-attempts/15-minutes lockout tracked on the `User` row
itself (no separate rate-limit infrastructure), matching the app's overall infrastructure-light
philosophy.

**Why routes are French and content is Arabic.** This was already the established convention
before any of the recent work (`/connexion`, `/tableau-de-bord`, etc.) and was deliberately
preserved and extended (`/ados`, `/parents-enseignants`) rather than switched to English or
Arabic route segments, for consistency with the existing codebase.

**Why the hub, `/ados`, and `/parents-enseignants` are separate pages instead of one page with
client-side tabs.** Each needs its own `<title>`/metadata, its own server-fetched (and
audience-filtered) course list, and a shareable URL — a client-side tab switch would cost SEO,
metadata correctness, and direct-linkability for no benefit.

---

## 9. Known Issues & Technical Debt

(See `ROADMAP.md` for the fuller, prioritized version — this is the condensed list.)

- **Legacy `/cours` flat catalog** still exists, unlinked from the public nav but still
  reachable and functional. Not broken, just an unresolved "retire or keep" decision.
- **JWT session staleness**: role/category changes don't affect an already-logged-in user's
  session until they log in again — no session-invalidation mechanism exists.
- **No rate limiting** on sign-up, receipt upload, or messaging endpoints — only login has
  lockout protection. Low risk at current scale, worth revisiting if abuse appears.
- **No automated tests** — every verification has been manual (see `CONTRIBUTING.md`). This is
  the single highest-leverage gap if the codebase keeps growing.
- **Toggle-button-group styling is copy-pasted** in ~4 places (profile-category pickers, admin
  filter tabs) rather than extracted into one shared component.
- **`Record<string, ...>` maps keyed by a Prisma enum's string values are easy to under-cover** —
  this already happened once (a category-label map missing the `ADOLESCENT` case, found during
  documentation review and fixed) and could happen again if `ProfileCategory` or
  `CourseAudience` gains another value without grepping for every such map.
- **`ProfileCategory` union type is redeclared by hand** in several client components
  (`"MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER"`) instead of importing the Prisma-generated
  type — works today, but two definitions can drift if the enum changes.
- **Placeholder content**: coach photo, social media URLs, bank details, testimonials all need
  real data before public launch (full list in `ROADMAP.md`).
- **Favicon fidelity**: the favicon/apple-icon are the full portrait-orientation logo
  illustration rather than a square-cropped simplified mark, so fine linework compresses at
  16×16/32×32 — acceptable but not optimal.

---

## 10. Future Roadmap

Full detail in [`ROADMAP.md`](ROADMAP.md). Highest-level summary:
- **Before public launch**: swap every placeholder (photo, socials, bank details, real course
  content, testimonials, `AUTH_SECRET`) for real values.
- **Database is now Postgres/Supabase** (moved off SQLite for Vercel deployment, see § 9 "Why
  Postgres/Supabase"). Local-disk uploads → object storage is still an open gap under
  serverless.
- **Feature ideas raised but not built**: individual consultation booking, books/articles content
  type, guardian-mediated enrollment for minors, a second language, real DRM-grade video
  protection.

---

## 11. Development Guidelines

Full detail in [`CONTRIBUTING.md`](CONTRIBUTING.md). The essentials:
- Every user-facing string goes through `src/i18n/dictionaries/ar.ts` — never hardcode copy.
- Follow the Server-Actions-for-admin / Route-Handlers-for-everything-else split exactly.
- Every destructive admin action goes through `ConfirmActionForm`; every mutation shows inline
  pending/success/error state — never let a validation failure crash to the default error page.
- Use logical CSS properties (RTL app) and the existing color/spacing tokens — no raw hex, no
  physical-direction utilities.
- Never trust a client-declared file MIME type — validate the actual bytes (`fileSignature.ts`)
  for any new upload path.
- No test suite exists — verification is `tsc` + `eslint` + `npm run build` + manual browser
  click-through with a throwaway QA account that gets deleted afterward, every time.

---

## 12. How to Continue the Project

**Read this file and its four companions before writing code.** They were written by fully
auditing the live codebase (every route, every component, every API route, the schema, the
design tokens) specifically so a future session doesn't have to re-derive any of this from
scratch.

**Default to consistency over novelty.** This codebase has strong, repeated patterns —
`ActionState`/`runAction`/`ConfirmActionForm` for admin mutations, the dictionary for every
string, logical CSS properties, pill buttons/badges, alternating section tints. When adding
something new, find the closest existing example and match it, rather than introducing a new way
to solve an already-solved problem. `CONTRIBUTING.md` § "What to avoid changing without a clear
reason" lists the specific things that should not be swapped out casually (the Postgres/Supabase
database, Tailwind-only styling, no state-management library, the dictionary structure, the
`ConfirmActionForm` pattern).

**Treat placeholder content as placeholder, not as done.** Several pieces of the app *look*
finished but are explicitly marked throughout this documentation as placeholder (coach photo,
social URLs, bank details, testimonials). Don't "fix" them by inventing plausible-looking fake
data — either leave them as clearly-labeled placeholders or get real values from the site owner.

**Verify like the project has always verified**, because it has no test suite to catch you
otherwise: `tsc --noEmit`, `eslint`, `npm run build`, and a manual click-through with a
disposable QA account for anything user-visible — then delete the QA account and any test data
it created. This has been done for every change in this project's history; don't be the first
change that skips it.

**When you find a real bug while working on something else** (as happened with the missing
`ADOLESCENT` case in a category-label map, found during the audit that produced this
documentation), fix it in the same pass if it's small and low-risk, and note it — don't leave
known-broken code because it wasn't the original task.

**Ask before guessing on real business decisions.** Bank details, social media accounts, pricing,
whether to keep or retire `/cours`, whether adolescents should self-enroll or go through a
guardian — these were all explicit decisions made in conversation with the site owner, not
architectural defaults. If a future task touches one of these axes and the answer isn't already
recorded in this documentation, ask rather than assume.

**Keep this documentation current.** If you add a page, component, route, or make a
decision worth remembering, update the relevant file here in the same change — don't let this
document drift out of sync with the codebase it describes.
