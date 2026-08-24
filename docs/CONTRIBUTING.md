# Contributing / Development Guidelines

Referenced from [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). Read `AGENTS.md` first — this Next.js
version has real API differences from older training data; check
`node_modules/next/dist/docs/` before using an App Router API you're not certain about.

## Before writing any code

1. Read the relevant existing file(s) fully before editing — this codebase has consistent,
   repeated patterns (see below), and the fastest way to introduce an inconsistency is to write
   a new component/route without looking at 2-3 existing siblings first.
2. If the change touches the schema, plan the migration name and run
   `npx prisma migrate dev --name <descriptive_name>` — never hand-edit `migrations/`.
3. If a dev server (`npm run dev`) is already running when you need to run
   `npx prisma migrate dev` or `npx prisma generate`, it may hold a lock on the Prisma client's
   native binary on Windows (`EPERM` renaming `query_engine-windows.dll.node`). Ask the user to
   stop their dev server rather than killing it yourself.

## Coding conventions

- **TypeScript strict mode** — no `any` without a specific reason; prefer deriving types from
  Prisma (`import type { ProfileCategory } from "@prisma/client"`) over redefining unions by
  hand. Several components currently redeclare `"MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER"`
  locally instead of importing the Prisma type — don't propagate this, prefer the import in new
  code (see Known Issues in PROJECT_CONTEXT.md).
- **Server Components by default.** Only add `"use client"` when the component needs state,
  effects, event handlers, or browser-only APIs. Data fetching happens directly in `async`
  Server Components via `prisma.*` calls — there is no data-fetching library (no SWR/React
  Query/tRPC).
- **`params`/`searchParams` are `Promise`s** in this Next.js version — always `await params`
  before destructuring, in both `page.tsx` and `layout.tsx` files with dynamic segments.
- **No default exports named generically** — every component file's default export matches its
  filename (`CourseForm.tsx` exports `CourseForm`). Keep this.
- **Comments are rare and intentional.** The existing code has almost no comments; the few that
  exist explain a non-obvious *why* (e.g. the NULL-handling note inline near the workspace
  filter queries). Don't add comments explaining *what* the code does — match the existing
  density, not zero and not verbose.

## Naming conventions

- **Routes are French, content is Arabic.** This is deliberate and consistent throughout:
  `/connexion`, `/inscription`, `/tableau-de-bord`, `/cours`, `/parametres`, `/utilisateurs`,
  `/demandes`, `/ados`, `/parents-enseignants`. Follow this for any new route — don't introduce
  English or Arabic route segments.
- **Dictionary keys are English/camelCase**, values are Arabic strings:
  `t.admin.confirmDeleteCourse`, `t.auth.errorPasswordMismatch`. Namespace by page/feature area
  (`about`, `hub`, `ados`, `admin`, `receipt`, `questionnaire`, ...) — check
  `src/i18n/dictionaries/ar.ts`'s top-level keys before creating a new namespace; there's likely
  already one that fits.
- **Prisma models/enums**: PascalCase models, SCREAMING_SNAKE-ish enum values matching how they
  read as constants (`PARENT_TEACHER`, `SINGLE_CHOICE`).
- **Component prop types are inlined**, not extracted to a separate `type Props = {...}` — see
  any component in `src/components/`. Keep this pattern for consistency rather than introducing
  named prop types for new components.

## i18n rules

- **Every user-facing string goes through the dictionary.** Never hardcode Arabic (or any)
  copy directly in a `.tsx` file — always add a key to `src/i18n/dictionaries/ar.ts` and
  reference `t.namespace.key`. This is a single-language app today, but the dictionary
  discipline is what would make adding a second language tractable later, and it's also just
  the established pattern — breaking it for "just one string" is how the pattern erodes.
- Server Components: `const { t } = await getT();`. Client Components: `const { t } =
  useLocale();`. Both return the exact same object — pick based on whether the component is
  already a Server or Client Component, not based on any difference in the data.
- Use `interpolate(template, { key: value })` for any string with a `{placeholder}` — don't use
  template literals to build translated strings piecemeal.

## Styling conventions

See `DESIGN_SYSTEM.md` in full. The short version: Tailwind utility classes only, no CSS
modules, no styled-components, no inline `style=` except for genuinely dynamic values
(`CoachAvatar`'s computed `size`). Use the named color tokens (`text-ink`, `bg-primary`, etc.),
never raw hex values in `className`. Use **logical properties** (`ps-*`, `pe-*`, `start-*`,
`end-*`) everywhere — this app is RTL-only and physical-direction classes (`pl-*`, `right-*`)
will render backwards.

## Server Actions vs. API Routes

Follow the existing split exactly (detailed in `ARCHITECTURE.md`):
- New **admin** mutation → Server Action in `admin/actions.ts`, signature
  `(...boundArgs, prevState: ActionState, formData: FormData) => Promise<ActionState>`, wrapped
  in `runAction()`, throwing `AdminActionError` for expected/validation failures.
- New **user-facing** mutation (anything outside `/admin`) → Route Handler under `app/api/**`,
  returning `NextResponse.json({ error: "some_code" }, { status })`. The client component maps
  error codes to translated messages locally — codes are the contract, not message text.

## Confirmation & feedback patterns

- Any **destructive or hard-to-reverse admin action** (delete, unpublish, demote, reject) must
  go through `<ConfirmActionForm>` with a `confirmMessage` prop (uses `window.confirm`) — never
  wire a delete button directly to a bare form submit.
- Every mutation-driven form must show **inline pending/success/error state** (the
  `useActionState` + `state.ok`/`state.error` pattern used throughout `admin/*Form.tsx`
  components) — never let a failed validation crash to Next's default error boundary, and never
  leave a successful save with zero visible feedback.

## Security checklist for anything touching file uploads or auth

- Never trust a client-declared `File.type` alone — see `lib/fileSignature.ts` and use
  `matchesFileSignature()` on the actual buffer before writing to disk, in addition to the
  MIME-allowlist pre-check.
- Any new file-serving route must set `X-Content-Type-Options: nosniff` and gate access with
  `auth()` + an ownership/role check, matching `api/receipts/[enrollmentId]/route.ts` and
  `api/videos/[lessonId]/route.ts`.
- Any new authentication-adjacent endpoint should consider the login-lockout pattern in
  `src/auth.ts` as precedent if brute-force is a concern.

## Verification workflow (there is no test suite — this replaces it)

Every change in this project has been verified this way; keep doing it:

1. `npx tsc --noEmit` — must be clean.
2. `npx eslint .` — must show no new errors (16 pre-existing `no-unused-vars` warnings on
   intentionally-unused `_prev`/`_formData` Server Action params are expected and fine).
3. `npm run build` — a full production build catches issues dev mode hides (e.g. metadata
   conflicts, static-generation errors). Run this before considering a non-trivial change done.
4. **Manual browser verification** for anything user-visible: start the dev server, click
   through the actual flow. If real credentials aren't known (do not guess or brute-force a real
   account's password), create a throwaway QA account (`qa.xxx.verifyN@example.com` /
   `QaVerify123!` has been the convention), test with it, **then delete it and any test
   data/files it created** before finishing. Never leave QA accounts, disposable test
   courses/lessons, or test uploads behind — every session in this project's history has
   confirmed a clean DB state at the end.
   - **Signup now requires OTP email verification** before an account gets real access (see
     "Auth & session" in `ARCHITECTURE.md`). Resend rejects sending to `@example.com` addresses
     (`422 validation_error`), so the `qa.xxx.verifyN@example.com` convention above doesn't work
     for testing signup/verification specifically — use Resend's own test recipient
     `delivered@resend.dev` instead, and read the OTP back via the Resend API
     (`GET https://api.resend.com/emails/{id}`, using the id from `GET /emails`) rather than a
     real inbox.
5. If verifying a form's behavior specifically, prefer letting the real client code run
   (`form.requestSubmit()`, native input events with the React-aware value setter) over
   reimplementing the request by hand — reimplementing risks validating a different code path
   than what a real user hits.

## What to avoid changing without a clear reason

- Don't switch away from Postgres/Supabase, or restructure the Prisma schema's relations, without
  understanding why it's set up this way (Vercel serverless deployment forced the move off
  SQLite) — see `docs/PROJECT_CONTEXT.md` § "Why Postgres/Supabase".
- Don't introduce a second styling approach (CSS modules, a component library, styled-jsx)
  alongside Tailwind.
- Don't add a state-management library (Redux, Zustand, Jotai) — the app has no client-side
  global state need; session identity is read fresh server-side via `getAppUser()` on every
  request, and component-local `useState` plus server-fetched data have been sufficient
  throughout.
- Don't rename or restructure the dictionary namespaces casually — many components destructure
  `t.someNamespace.someKey` and a rename is a find-and-replace across potentially many files.
- Don't remove the `runAction`/`ActionState`/`ConfirmActionForm` pattern in favor of something
  "simpler" — it was specifically added to fix a real, previously-shipped bug (admin mutations
  crashing the whole page on validation failure). See `HANDOFF.md` for the original incident.
