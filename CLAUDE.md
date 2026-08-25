@AGENTS.md

# Operating Principles — هند بنياس Coaching Platform

This file is written **for you, a Claude Code session**, not for a human contributor. It exists
to transmit the *philosophy* behind this codebase, not just its facts — the facts live in
`docs/PROJECT_CONTEXT.md` and its companions. Read this file first; it tells you how to think
about the project before you go read what it's made of.

---

## Product Quality Mission

Your objective on this project is not "implement the feature that was asked for." It's **make
this product feel world-class.** Every change should move at least one of these, and never
regress another: **simplicity, speed, consistency, delight, accessibility, reliability,
maintainability.**

Before writing code for any non-trivial change, look at it through each of these lenses (you
don't need to write this analysis down — just actually think it through):
- **Senior frontend engineer**: is this the simplest component shape? Will it re-render more
  than it needs to? Does it belong in `src/components/` at all, or is it a one-off?
- **Senior backend engineer**: does this validate at the right boundary? Does it follow the
  Server-Action-vs-Route-Handler split? Does it handle the failure case, not just the happy path?
- **UX designer**: does the user always know where they are, what they can do, and what just
  happened? Is there a simpler flow that gets to the same outcome in fewer steps?
- **Product designer**: does this fit the two-workspace narrative and the warm/restrained visual
  language, or does it feel bolted on?
- **QA engineer**: what's the first input that breaks this — empty string, huge file, double
  click, slow network, RTL layout, keyboard-only navigation?
- **Accessibility specialist**: can this be operated with a keyboard alone, understood by a
  screen reader, and used with `prefers-reduced-motion` on?
- **Performance engineer**: does this add client JS that didn't need to ship? Does it introduce
  a layout shift, a blocking request, or a render that runs more often than the data actually
  changes?

Before calling any implementation finished, ask: *Is this the simplest solution? Is this the
most intuitive UX? Would a first-time user understand it immediately? Is it visually consistent
with the rest of the app? Does it make the overall product better, not just "done"? Is there a
cleaner approach?* If the honest answer to any of these is no, don't ship it as-is — rethink it
first.

**Continuous improvement, not scope creep.** When you finish a task, look at what you touched
and its immediate neighbors for small, low-risk wins in consistency, accessibility, or
polish — a missing `aria-label`, an inconsistent border-radius, a status badge that doesn't
match the pattern used two files over. Fix those in the same change. Do **not** use this as
license for unrequested rewrites, new abstractions, or wandering into unrelated parts of the
app — see "Reusable component philosophy" and "Extract after real duplication appears, not
preemptively" below. Polish what you touched; don't go looking for a bigger project.

**Honest gaps against this bar, as of the last full audit (2026-08-25)** (don't assume these are
fixed unless you've verified it yourself): free-text search (`AdminSearchForm`), bulk approve/
reject (`BulkEnrollmentList`), and a card layout that reflows on mobile are now in place across
`admin/cours`, `admin/utilisateurs`, and `admin/demandes` — this was a real gap in an earlier
audit but has since been closed. Confirmation dialogs also moved off `window.confirm` onto a
real accessible `ConfirmDialog` component (focus trap, `Escape`, `role="dialog"`), and a shared
global toast system (`src/lib/toast.ts` + `ToastViewport`, mounted once in the root layout) now
backs every `ConfirmActionForm`/admin-form mutation via `useToastActionState` — this specifically
fixes a case where approving/rejecting an enrollment or promoting/demoting a user made its own
"success" confirmation disappear before it could be read, because the very status change the
action caused unmounted the button showing it (see the 2026-08-25 action-UX audit for the full
writeup). What's still genuinely missing: for enrollment review specifically, approve/reject can
still be flipped back and forth freely with no history of who changed what or when (the audit log
records each flip, but there's no dedicated undo affordance). Also, `site.bankDetails`,
`site.social`, and `site.whatsappNumber` in
`src/lib/site.ts` are still fake-but-realistic-looking placeholder values (a made-up RIB/IBAN, a
placeholder WhatsApp number, generic social homepage URLs) shown live on the authenticated
enrollment/receipt page and in the app footer — not just the marketing pages. Don't invent real
values for these; get them from the site owner. None of this is broken; it's below the bar this
section sets, and worth closing opportunistically when you're already working nearby rather than
as a standalone rewrite no one asked for.

## Project vision

A coaching platform for **Hind Benyas**, a certified awareness/mindset coach, built around one
idea: **two audiences, one system.** Adolescents and the adults who accompany them (parents,
teachers) get distinct, tailored spaces (`/ados`, `/parents-enseignants`) — different tone,
different palette accent, different course catalog, different social presence — while sharing
one account system, one payment/approval pipeline, and one admin panel underneath. Every
decision in this codebase should be evaluated against whether it serves that split cleanly
without duplicating infrastructure to do it.

## Design philosophy

- **Warm, personal, restrained.** This is a solo coach's brand, not a SaaS product — the visual
  language (terracotta/sarcelle/gold, one serif-weight typeface, soft rounded cards) should feel
  like a person, not a platform. Don't introduce corporate/SaaS visual tropes (hard shadows,
  neon accents, dense dashboards) even in the admin panel.
- **Content-led, not chrome-led.** The hub page's long single-scroll narrative (hook → who she
  is → mission/vision → credentials → track record → values → services → choose your space →
  how it works → testimonials → CTA) is the model: let real content carry the page, don't pad
  with decorative UI that isn't saying something.
- **One workspace, one accent.** Terracotta (`primary`) = general/neutral CTAs (hub, auth, admin —
  nothing workspace-specific), goldenrod (`accent`) = adolescents (`/ados`), olive (`olive`) =
  parents/teachers (`/parents-enseignants`), sarcelle (`secondary`) = personal/about-Hind content
  regardless of workspace. Don't invent a fifth accent color without a reason tied to a real new
  audience or section, and don't cross-wire the three workspace colors (don't put gold on a
  parents/teachers page, or olive/terracotta on `/ados`) — see `docs/DESIGN_SYSTEM.md` for the
  full token reference.
- **If two screens look like they were designed by different people, fix them.** Spacing
  (`py-20` sections, `gap-6` grids), typography (`font-serif` + size scale for headings), color
  tokens, iconography (`lucide-react` only), button hierarchy (filled vs. outlined pill), border
  radius (`rounded-lg` inputs, `rounded-2xl`/`rounded-3xl` cards), and animation (the shared
  `.animate-shell-arrive` + sparse hover transitions) are all meant to be identical across every
  page in the app. Before adding a new visual pattern, grep for how the same kind of element
  (a card, a badge, a button) already looks elsewhere and match it — see `docs/DESIGN_SYSTEM.md`
  for the full token reference.

## UX principles

- **No silent mutations.** Every action that changes data shows pending → success/error state,
  and success is confirmed via the shared global toast (`src/lib/toast.ts`/`ToastViewport`) so it
  survives even if the mutating component itself unmounts as a result of the action (e.g.
  approving an enrollment removes the "Approve" button in the same update). A user or admin
  should never wonder "did that work?"
- **Every destructive/hard-to-reverse action confirms first.** Delete, unpublish, demote, reject
  — all gated behind `ConfirmDialog` (an accessible modal: focus trap, `Escape`, `role="dialog"`)
  via `ConfirmActionForm`, not the browser's native `window.confirm`. This is not optional
  ceremony; it was added after a real incident where these fired instantly with no confirmation.
- **Never crash to the default error boundary for an expected failure.** Validation errors,
  wrong passwords, duplicate slugs — these are normal user input problems, not exceptions. Only
  genuinely unexpected errors should hit `error.tsx`.
- **Respect the workspace the user is in.** A logged-in adolescent should never be routed to
  `/parents-enseignants` (or vice versa) by a stale hardcoded link — always derive the target
  from `session.user.workspace` when linking to "the courses" generically.

## Navigation principles

The user should never have to wonder: *where am I? what should I do next? did my action
succeed? how do I get back?* Concretely, in this codebase:
- Every layout shell (`Nav`/`AppNav`, `Footer`/`AppFooter`) is consistent across every page in
  its group — don't give one admin sub-page a different sidebar or a marketing page a different
  header without a documented reason.
- "Back" links (`← جميع الدورات`, `← مساحتي`, etc.) go to a predictable, specific place — the
  catalog you actually came from, not always the same generic home. `cours/[slug]`'s back link
  already does this correctly (routes by the *course's* audience, not a hardcoded destination) —
  match that specificity for any new "back" affordance.
- Reduce clicks: prefer inline actions (`ConfirmActionForm` buttons directly on a list row) over
  navigating to a separate page to perform a one-field mutation, the way `admin/cours` already
  handles publish/unpublish/delete without leaving the list.
- Predictable patterns beat novel ones: a new list page should look and behave like the existing
  ones (`admin/cours`, `admin/utilisateurs`, `admin/demandes` all share the same filter-tabs +
  card-list shape) — don't invent a fourth layout for a fifth list.

## Form standards

Every form in this app is expected to: validate early, explain errors in plain Arabic (not a
raw error code), preserve whatever the user already typed on failure, show a pending state,
prevent double submission, and confirm success inline. This is already the pattern throughout
the codebase — controlled inputs naturally preserve their value on a failed submit,
`useFormStatus()`/`loading` state disables the submit button while pending, and every mutation
shows `state.error`/`state.ok` (or an equivalent local `error`/`success` state) inline near the
form. When you add a new form, match this exactly — don't ship one that clears on error, submits
twice on a double-click, or leaves the user staring at a blank screen with no feedback.

## Admin panel philosophy

The admin panel should feel like professional internal software a coach actually enjoys running
her business from, not an afterthought bolted onto the public site. It already does several of
these well — keep them, and close the gaps honestly noted in "Product Quality Mission" above
when you're working nearby:
- **Fast workflows**: every list-level mutation (publish, delete, approve, promote) happens
  inline via `ConfirmActionForm`, without a page navigation. Preserve this for anything new.
- **Clear status indicators**: the three-way success/danger/accent badge pattern is used
  everywhere a status exists (enrollment, published/draft, questionnaire on/off) — reuse it,
  don't invent a new status-color scheme per feature.
- **Confirmation for destructive actions**: non-negotiable, via `ConfirmActionForm`'s
  `confirmMessage` — see "UX principles" above for why.
- **Gaps to close opportunistically, not as a standalone rewrite**: search, bulk actions, and
  mobile card layouts are done (see the "Honest gaps" note above) — what's left is that there's
  still no explicit undo affordance beyond re-toggling a status. If you're already touching one
  of these pages for an unrelated task and it's a small addition, close the gap; don't hold an
  unrelated task hostage to fixing all of them at once.

## User dashboard philosophy

`/tableau-de-bord` should feel welcoming and orient the user immediately: a personalized
greeting, a `CoachReminder` widget tailored to their category, their enrollments with clear
status badges, and an obvious next action (discover courses if they have none, access their
course if approved). Keep this "most important thing first" ordering — don't bury the user's
actual enrollment status below decorative content, and don't add a dashboard widget that doesn't
answer "where am I / what's next" at a glance.

## Coding principles

- TypeScript strict, no `any` without a specific, stated reason.
- Server Components by default; `"use client"` only when state/effects/events/browser APIs are
  actually needed.
- Every user-facing string goes through `src/i18n/dictionaries/ar.ts` — zero hardcoded copy in
  JSX, ever, even for "just one small string."
- Comments are rare and explain *why*, never *what* — match the codebase's existing near-zero
  comment density.
- Prefer importing Prisma-generated types (`import type { ProfileCategory } from
  "@prisma/client"`) over hand-redeclaring the same union — the codebase has some pre-existing
  hand-redeclarations that are tolerated debt, not a pattern to copy forward.

## Architecture principles

- **Server Actions for `/admin` mutations, Route Handlers for everything else.** This split is
  deliberate (see `docs/ARCHITECTURE.md`) — do not blur it for a new feature "because it's
  easier."
- **Supabase Auth owns credentials/verification/reset; Prisma holds only profile data.**
  `getAppUser()` (`src/lib/session.ts`) does a live, cached-per-request Prisma lookup for role/
  workspace on every call rather than trusting a snapshotted token, so a promotion/demotion or
  category change is live on the user's very next request — there is no re-login-to-refresh
  tradeoff here (unlike the NextAuth-era JWT session this replaced). Don't add a caching layer on
  top of it "for performance" without a measured reason; the lookup is one indexed query.
- **Postgres via Supabase (moved off SQLite 2026-08-21 for Vercel deployment).** Don't add a
  second database or an ORM abstraction "for flexibility." See `docs/PROJECT_CONTEXT.md` §
  "Why Postgres/Supabase" for the connection-string setup (pooled `DATABASE_URL` for runtime,
  session-pooler `DIRECT_URL` for migrations) and a documented `prisma migrate` hang to avoid
  re-debugging from scratch.
- **No state-management library, no data-fetching library.** Component-local `useState` +
  server-fetched data has been sufficient for every feature so far. If you think you need Redux
  or React Query, first check whether the actual problem is that data should be fetched in a
  Server Component instead.

## Performance expectations

- Default to Server Components so the client JS bundle stays small — every `"use client"` is a
  bundle-size decision, not a free action.
- Lesson videos stream via `Range`-aware byte-serving (seekable, not fully downloaded);
  demo videos are plain static files (no auth overhead needed, they're meant to be public).
  Don't change either without preserving these properties.
- Polling intervals (5s for active chat, 20s for unread badges) were chosen deliberately for
  this app's scale — don't tighten them "for responsiveness" without considering server load, and
  don't add WebSockets/SSE to replace them without a concrete reason traffic has grown.
- Images go through `next/image` with real intrinsic dimensions, never a bare `<img>`.

## Accessibility expectations

- **Every form field has a real, programmatic label association** (`htmlFor`/`id`, or native
  label-wraps-input) — this was audited and fixed across the entire app once already; don't
  regress it when adding a new field.
- Icon-only interactive elements (the password show/hide eye, the WhatsApp button) need
  `aria-label`.
- Respect `prefers-reduced-motion` for any new animation, matching `.animate-shell-arrive`'s
  existing guard.
- This is an RTL-only app — a change that looks right in a physical (LTR-authored) mental model
  can be wrong in the actual rendered RTL layout. Use logical CSS properties (see
  `docs/DESIGN_SYSTEM.md`) and actually look at the rendered page, not just the code.

## SEO expectations

- The three public marketing pages (`/`, `/ados`, `/parents-enseignants`) are the only pages
  that matter for SEO — everything under `(app)` is behind auth and irrelevant to crawlers.
  `/ados` and `/parents-enseignants` already export their own `metadata` (page title); keep this
  pattern for any new public page instead of relying on the root layout's generic title.
  There is no `robots.txt`/`sitemap.xml` yet (see `docs/ROADMAP.md`) — add one if/when this goes
  to production, not speculatively now.
- Heading hierarchy matters: one `<h1>` per page, `<h2>` per section, `<h3>` for cards within a
  section — the hub page is the reference example.

## Animation philosophy

**Minimal and purposeful, never decorative-by-default.** The entire animation surface of this
app today is: one shared fade-in-and-rise on every layout's `<main>`, one bouncing scroll-cue
chevron on the hub, and ordinary Tailwind `transition` on hover states. If you're adding motion
and can't articulate what it communicates to the user (not just "it looks nice"), don't add it.
No animation library will ever be justified at this app's current scope.

## Responsive philosophy

Mobile-first, and genuinely test mobile — not just assume Tailwind's defaults handle it. The
overwhelming majority of responsive logic in this app is a single `md:` breakpoint switching
1-column to multi-column grids and a hamburger menu to an inline nav. Don't introduce `sm:`/`lg:`/
`xl:` breakpoint sprawl for a design that can be expressed with `md:` alone — that's over-fitting
to a device matrix nobody asked for.

## Reusable component philosophy

- **Extract after real duplication appears, not preemptively.** Several patterns in this
  codebase (the profile-category toggle-button-group, admin filter tabs) are copy-pasted 2-4
  times rather than abstracted — this is accepted, documented debt, not an oversight to silently
  "fix" by extracting a component mid-way through an unrelated task. If you're about to write a
  5th copy of something, that's the signal to extract; a 2nd copy usually isn't yet.
- One component, one responsibility. `ConfirmActionForm` only wraps a confirm+submit+feedback
  cycle; it doesn't know what the action does. `PasswordInput` only handles masking/reveal; it
  doesn't know if it's a login field or a signup field.
- Admin-only components live in `src/components/admin/`; anything usable outside `/admin` lives
  directly in `src/components/`. Keep this boundary when adding new components.
- Props are inlined at the component signature, not lifted into a separate exported `Props`
  type — match this even though it's a minor stylistic choice, for consistency.

## Things intentionally not implemented

Don't "complete" these without being asked — they were scoped out deliberately, not forgotten:
- Guardian-mediated enrollment for minors (adolescents self-enroll exactly like adults, by
  explicit decision).
- A second language / locale switching.
- Real DRM-grade video protection (current protection is UI-level deterrents; screen-recording
  is an accepted, documented limitation, not a bug to fix).
- Rate limiting beyond the login endpoint.
- Per-workspace bank details or WhatsApp number (one shared set serves both, by explicit
  decision).
- Any automated test suite (verification is manual today — see `docs/CONTRIBUTING.md`).
- Booking/scheduling for individual consultations, and a books/articles content type — both are
  described on the hub's "خدماتنا" section as *offerings*, with zero functionality behind them.

## Things that should rarely be changed

- Postgres (Supabase) as the database.
- Tailwind-only styling (no CSS modules, no styled-components, no component library).
- The single Arabic dictionary structure and the French-routes/Arabic-content convention.
- The `ActionState` / `runAction` / `ConfirmActionForm` pattern for admin mutations — it exists
  specifically because the alternative (raw throws) already crashed the app once in production
  use.
- The single-typeface (Tajawal), RTL-only assumption baked into the root layout.
- The workspace-derived-from-`profileCategory` model (not a separate `workspace` column) — see
  `docs/PROJECT_CONTEXT.md` § Development Decisions for why.

If a task seems to require changing one of these, treat that as a signal to stop and confirm
with the user rather than a normal implementation detail.

## Current priorities

The app is **functionally complete, content-incomplete** (see `docs/ROADMAP.md`). In order:
1. ~~Real coach photo~~ — done (verified 2026-08-21: `public/personal.webp`, `public/me.png`,
   `public/coach-work.jpg`, `public/maman.png`, `public/ados.jpeg` all exist as real files, not
   placeholder stubs).
2. Real social media URLs — no longer hardcoded (moved to an admin-managed `SocialLink`/
   `SocialLinkAssignment` model, editable at `/admin/parametres`, each link targeting any
   combination of Global/Parents/Adolescents surfaces), but nothing has been entered yet, so
   every footer (marketing pages and the authenticated `AppFooter`) currently renders no icons at
   all. Needs the owner to add her real links through the admin UI — see `docs/ARCHITECTURE.md`
   § Data model for how the platform/surface model works.
3. Real bank transfer details — still a fake-but-realistic-looking placeholder RIB/IBAN
   (`site.bankDetails` in `src/lib/site.ts`), shown live on the enrollment/receipt-upload page
   real users see. Do not invent a real value for this — get it from the site owner.
4. Real course content for `/ados` (currently zero courses assigned to that audience).
5. Real or removed testimonials (currently explicitly-labeled placeholder quotes).

Do not treat any of the above as "already done" just because the UI around them is fully built.

## Long-term vision

Not committed, but plausible directions if the business grows: a second language (French);
real DRM-backed video delivery if piracy becomes a concern; the "خدماتنا" services (individual
consultations, books/articles) growing actual functionality behind them; splitting admin
messages/filtering further by workspace if volume grows; moving local-disk uploads (`/uploads`)
to object storage, now that serverless (Vercel) deployment is real, not hypothetical — see
`docs/ROADMAP.md` § Infrastructure for serverless deployment.

## Known pitfalls

- **Prisma `{ field: { not: X } }` on a nullable column silently excludes `NULL` rows** (SQL
  three-valued logic) — this already caused a real undercounting bug once. Use
  `{ OR: [{ field: null }, { field: { in: [...] } }] }` instead whenever "not X" should include
  "unset."
- **`params`/`searchParams` are `Promise`s** in this Next.js version — `await` them, always, in
  both pages and layouts.
- **`npx prisma migrate dev`/`generate` can fail with `EPERM`** on Windows if a dev server is
  currently running (it locks the native query-engine binary) — ask the user to stop their dev
  server rather than killing their process yourself.
- **Enum-keyed `Record<string, ...>` lookup maps are easy to under-cover.** This already happened
  once (a category-label map missing the `ADOLESCENT` case). Whenever `ProfileCategory` or
  `CourseAudience` gains a value, grep for every map keyed by that enum and check all of them.
- **A Supabase-confirmed user with no matching Prisma `User` row is treated as logged out.**
  `getAppUser()` returns `null` if the Prisma lookup misses, even when `supabase.auth.getUser()`
  succeeds — this is the normal state for the brief window between `verifyOtp()` succeeding and
  `POST /api/auth/create-profile` completing (the client always calls both in sequence, but if
  you're testing/scripting against Supabase Auth directly, don't forget the second step or
  protected pages will bounce to `/connexion` with no obvious error).
- **`supabase.auth.signUp()` grants no session while email confirmation is pending.** Don't
  expect to read `user_metadata` or an id back from a live session right after `signUp()` — the
  session only exists once `verifyOtp()` succeeds.

## Common mistakes to avoid

- Hardcoding an Arabic string directly in JSX instead of adding a dictionary key.
- Using `pl-*`/`pr-*`/`left-*`/`right-*` instead of `ps-*`/`pe-*`/`start-*`/`end-*` (breaks
  silently in this RTL-only app).
- Trusting a client-declared `File.type` without also checking `matchesFileSignature()` on the
  actual bytes for any new upload path.
- Wiring a new admin button directly to a raw form submit instead of `ConfirmActionForm`.
- Adding a new admin Server Action that throws a raw `Error` instead of `AdminActionError`
  wrapped in `runAction()`.
- Calling a task "done" without running `tsc --noEmit`, `eslint`, and `npm run build` — there is
  no test suite catching you otherwise.
- Leaving throwaway QA accounts, test enrollments, or test uploads in the database after manual
  verification. Every session's history has ended with a clean DB; don't be the exception.
- Inventing plausible-looking fake content (a fake Instagram handle, a fake bank RIB, a fake
  testimonial) to make a placeholder "look finished." Leave it clearly placeholder, or get the
  real value from the user.

## Preferred workflow when implementing a new feature

1. Read `docs/PROJECT_CONTEXT.md`, and whichever companion doc is most relevant
   (`ARCHITECTURE.md` for data/routing questions, `DESIGN_SYSTEM.md` for visual questions,
   `CONTRIBUTING.md` for conventions, `ROADMAP.md` to check if this is already a known gap with
   context on why it wasn't done).
2. Find the closest existing analogous page/component in the actual codebase and read it fully
   — mirror its pattern (Server Action vs. Route Handler choice, form-feedback pattern, styling)
   rather than inventing a new approach.
3. Check `prisma/schema.prisma` directly if the feature touches data — it's the ground truth,
   more reliable than remembering a field name from documentation.
4. Implement, adding dictionary keys for every new string as you go (not as a cleanup pass
   after).
5. Verify: `tsc --noEmit` → `eslint` → `npm run build` → manual browser click-through. Use a
   disposable QA account for anything requiring auth if real credentials aren't available/known;
   delete it and any test data afterward.
6. If the change affects architecture, features, or a documented decision, update the relevant
   file in `docs/` in the same change — don't let documentation drift from the code it describes.

## Files that should always be consulted first

1. **`AGENTS.md`** (auto-loaded via the `@AGENTS.md` import at the top of this file) — this
   Next.js version has real API differences from older training data.
2. **`docs/PROJECT_CONTEXT.md`** — the map of the entire project.
3. **`prisma/schema.prisma`** — ground truth for the data model, faster and more reliable than
   any prose description of it.
4. **`src/i18n/dictionaries/ar.ts`** — check before adding any new string; the right namespace
   probably already exists.
5. Whichever existing file is the closest sibling to what you're building (a similar page, a
   similar form component, a similar API route) — the fastest way to write idiomatic code here
   is to read one real example first.

---

## First Steps for a New Claude Session

Do this, in order, before writing any code in this repository:

1. **Read this file (`CLAUDE.md`) completely.** You just did, if you're reading this line.
2. **Read `docs/PROJECT_CONTEXT.md` completely.** It is the factual map this file's philosophy
   sits on top of — don't skip it because this file felt sufficient.
3. **Skim `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, and `docs/CONTRIBUTING.md`** so you
   know what's in each — you don't need to memorize them now, just know where to go back to for
   data-model/routing questions, visual/styling questions, and coding-convention questions
   respectively, when they come up.
4. **Check `docs/ROADMAP.md`** for whatever you're about to work on — it may already be a known,
   deliberately-deferred gap with documented reasoning, not something to "discover" and solve
   from scratch.
5. **Identify what kind of task you've been given**:
   - A new page/feature → find the closest existing analogous page first (step 2 of the
     "Preferred workflow" above).
   - A bug fix → check "Known pitfalls" and "Common mistakes to avoid" above before assuming it's
     novel; check whether it's the same class of bug as one already documented (e.g. another
     enum-keyed map missing a case, another nullable-field `not:` filter).
   - A content change (copy, images, business details) → check whether it's one of the "Current
     priorities" placeholders, and whether the real value should come from the user rather than
     being invented.
   - A "make it better/perfect" open-ended request → don't manufacture busywork; audit for
     concrete, verifiable gaps (missing label association, an enum case not handled everywhere,
     a stale link) the way past sessions have, rather than cosmetic churn.
6. **Never guess on real business decisions** (pricing, bank details, social accounts, whether
   to retire a legacy route, whether a workspace should be merged or split) — these were made in
   conversation with the site owner, not derived from the code. If the answer isn't already
   recorded in `docs/`, ask.
7. **Before declaring anything done**: `tsc --noEmit`, `eslint`, `npm run build`, and a manual
   browser check for anything user-visible — clean up any throwaway test data afterward.
8. **If you learn something worth remembering** (a decision, a new pitfall, a completed
   priority), update the relevant `docs/` file in the same change. This file and its companions
   are only useful to the *next* session if they stay current — that responsibility falls on
   whichever session made the change.
