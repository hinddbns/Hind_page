# Design System

Referenced from [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

Everything below is implemented as **Tailwind CSS v4 tokens** in `src/app/globals.css` under
`@theme inline` — there is no `tailwind.config.js` and no separate design-tokens file. If you
need a new color/spacing value, add it there, not inline as an arbitrary Tailwind value, unless
it's truly one-off.

## Language & direction

**Arabic only, RTL, no locale switch.** `<html lang="ar" dir="rtl">` is set once in the root
layout and never changes. This has real layout consequences already accounted for throughout the
codebase:
- Use **logical Tailwind properties**, not physical ones: `ps-*`/`pe-*` (not `pl-*`/`pr-*`),
  `border-s-*`/`border-e-*` (not `border-l-*`/`border-r-*`), `start-*`/`end-*` (not `left-*`/
  `right-*`), `-start-*`/`-end-*` for negative offsets. Grep the codebase for examples
  (`PasswordInput.tsx`'s eye-icon button, the hub's decorative blur circles) before writing a
  physical-direction class — mixing the two silently breaks in RTL.
- Icons that imply directionality (arrows, chevrons) should be checked visually in the RTL
  layout, not assumed to look right by default.

## Color palette

Warm, muted, "coaching brand" palette — terracotta as the primary accent, sarcelle
(teal-ish green) as a secondary/calming accent, gold as a tertiary accent used specifically for
the adolescent workspace.

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#fbf6f0` | Page background (`--background`) |
| `cream-dark` | `#f2e9de` | Alternating section background tint (`bg-cream-dark/60`) |
| `ink` | `#2b2320` | Primary text (`--foreground`) |
| `ink-soft` | `#5a4f47` | Secondary/muted text |
| `primary` | `#b5654a` | Terracotta — buttons, links, parents/teachers workspace accent |
| `primary-dark` | `#8f4d37` | Hover state for primary |
| `primary-light` | `#e7cabb` | Borders, light backgrounds |
| `secondary` | `#4f6f76` | Sarcelle — "about the coach" section, credentials/track-record icons |
| `secondary-dark` | `#3b555b` | Hover/emphasis for secondary |
| `secondary-light` | `#dde8e7` | Stat tile backgrounds |
| `accent` | `#ffc107` | Vivid yellow — adolescent workspace (`/ados`) identity color |
| `accent-dark` | `#ffa000` | Darker step of accent, used for hover states and the `/ados` badge/testimonial-card background — always paired with `text-ink`, never `text-cream` (too bright for white text to stay legible; see the contrast note below) |
| `accent-light` | `#ffe9a8` | Borders, light backgrounds for accent |
| `olive` | `#6b7a3f` | Olive green — parents/teachers workspace identity color |
| `olive-dark` | `#4f5c2e` | Hover state for olive; also dark enough to pair with `text-cream` directly |
| `olive-light` | `#dde3c4` | Borders, light backgrounds for olive |
| `success` | `#4d7c5f` | Approved status, success banners |
| `danger` | `#b3423a` | Rejected status, delete buttons, error banners |
| `app-tint` | `#eef4f3` | Logged-in app shell background (distinct from marketing `cream`) |
| `ados-bg` | `#fff6da` | `/ados` page background (replaces `cream` on that page only) |
| `ados-bg-alt` | `#ffeeba` | `/ados` alternating section band (replaces `cream-dark`) |
| `parents-bg` | `#e9ebe2` | `/parents-enseignants` page background (replaces `cream` on that page only) |
| `parents-bg-alt` | `#d6dac9` | `/parents-enseignants` alternating section band (replaces `cream-dark`) |

**Workspace color convention**: the parents/teachers side of the app (`/parents-enseignants`, and
the accent bar in `AppNav` for parent-teacher-workspace users) leans on `olive`, the adolescent
side (`/ados`, and the accent bar in `AppNav` for adolescent-workspace users) leans on `accent`
(gold). `primary` (terracotta) remains the general/neutral CTA color used everywhere that isn't
tied to a specific workspace — the hub page, auth flows, and the admin panel (which stays
workspace-neutral by design). `secondary` (sarcelle) is used for the personal/"about Hind" content
regardless of workspace. When adding UI to a workspace-specific page, match this convention rather
than introducing a new color — this includes shared components rendered on a workspace page
(e.g. `CourseCard`'s `variant` prop), not just the page's own markup.

**Workspace page background**: `/ados` and `/parents-enseignants` don't use the shared `cream`/
`cream-dark` background — they wrap their content in `bg-ados-bg`/`bg-parents-bg` (and swap the
alternating section bands to `-bg-alt`) so the whole page, including `Footer`'s background/border
and `Nav`'s header border, carries a faint tint of the workspace color. The hub, auth pages, and
`(app)` shell are unaffected and keep `cream`/`app-tint` — this tint is specific to the two
workspace marketing pages.

**Testimonial cards**: on all three public pages (hub, `/ados`, `/parents-enseignants`), the
témoignages section uses a dark card rather than the `bg-white` card used elsewhere — `bg-primary-dark`
+ `text-cream` on the hub, `bg-olive-dark` + `text-cream` on `/parents-enseignants`, and
`bg-accent-dark` + `text-ink` on `/ados` (accent is bright enough that dark text, not white,
is what keeps it legible — see below). This is a deliberate exception to the "white card,
colored border" pattern used by every other card on these pages; don't generalize it back to
white without reason.

**Why `/ados` uses dark text on its dark boxes**: `accent`/`accent-dark` are both a genuinely
bright yellow, unlike `primary-dark`/`olive-dark` which are dark enough for white text on their
own. `text-cream` on `bg-accent-dark` only measures ~1.9:1 (fails WCAG AA badly); `text-ink` on
the same background measures ~7.5:1. So `/ados`'s badge, sign-up button, and testimonial cards all
use `text-ink`, not `text-cream`, even though the equivalent elements on the hub and
`/parents-enseignants` use `text-cream` — this asymmetry is intentional, driven by accent's
brightness, not an inconsistency to "fix."

## Typography

Single font family everywhere: **Tajawal** (Google Font, Arabic + Latin), loaded once in
`src/app/layout.tsx` via `next/font/google` with weights `400/500/700`, exposed as the
`--font-tajawal` CSS variable and mapped to **both** `--font-sans` and `--font-serif` in the
Tailwind theme. This means `font-serif` in this codebase does **not** mean a serif typeface — it's
used as a convention for "heading weight/size context" (headings, quotes, stat numbers) while
Tajawal is technically a single sans-serif face throughout. Don't import a second font without a
strong reason; the whole visual identity is built around this one typeface at different
sizes/weights.

Heading scale in practice (`font-serif` + size):
- `text-5xl`/`text-6xl` — hub hook / hero-scale statements (rare, top-of-page only)
- `text-3xl`/`text-4xl` — section `<h2>`s
- `text-2xl` — card/sub-section `<h3>`s
- `text-lg` — card titles, quote text

Body text is plain (no `font-serif`), `text-ink` for primary copy, `text-ink-soft` for
secondary/supporting copy, `text-xs` uppercase tracked (`tracking-wide`) for small eyebrow
labels (e.g. the role label above a section title).

## Spacing & layout

- Page-level horizontal padding: `px-6`, capped by a `max-w-*` wrapper (`max-w-6xl` for
  wide content, `max-w-4xl`/`max-w-3xl`/`max-w-2xl`/`max-w-md` progressively narrower for
  reading-width content and forms).
- Section vertical rhythm: `py-20` (or `py-24` for hero-scale/final-CTA sections), consistently.
- Cards: `rounded-2xl` (most cards) or `rounded-3xl` (feature/hero-scale cards like the
  choose-your-space cards), `border border-primary-light/50` (or a workspace-tinted border),
  `bg-white` on a tinted section / plain on an untinted one, `p-6` to `p-10` depending on card
  prominence.
- **Alternating section backgrounds**: on long single-scroll pages (the hub, `/ados`,
  `/parents-enseignants`), sections alternate between no background (inherits page `cream`) and
  `bg-cream-dark/60`, to create visual rhythm without hard borders. When inserting a new section
  into one of these pages, check its neighbors and alternate — see the hub's section-by-section
  background assignment in `src/app/(marketing)/page.tsx` for the current pattern.
- Grids: `grid gap-6` (or `gap-4` for denser lists like the credentials grid), responsive via
  `md:grid-cols-2` / `md:grid-cols-3` / `md:grid-cols-4` (mobile is always single-column first).

## Components / visual patterns

- **Buttons**: pill-shaped (`rounded-full`), two variants — filled (`bg-primary text-cream`,
  `hover:bg-primary-dark`) for primary actions, outlined (`border border-primary text-primary`,
  `hover:bg-primary hover:text-cream`) for secondary actions. Danger actions use the `danger`
  color pair instead of `primary`.
- **Status badges**: small pill (`rounded-full border px-3 py-1 text-xs font-medium`) with a
  three-way color scheme reused everywhere a status appears (enrollment status, published/draft,
  questionnaire on/off): success-tinted, danger-tinted, or accent-tinted for a
  pending/in-between state.
- **Form fields**: `rounded-lg border border-primary-light bg-white px-4 py-2.5` (marketing/user
  forms) or `px-3 py-2 text-sm` (denser admin forms), `outline-none focus:border-primary` for
  focus state (no visible focus ring beyond the border color change — see Known Issues in
  PROJECT_CONTEXT.md re: focus-visible accessibility).
- **Icons**: `lucide-react` exclusively, sized `h-5 w-5` to `h-9 w-9` depending on context, never
  mixed with another icon set.
- **Toggle-button groups** (profile category picker, admin course-filter tabs): a row of pill
  buttons where the active one gets `border-primary bg-primary text-cream` and inactive ones get
  `border-primary-light text-ink-soft hover:border-primary hover:text-primary` — this exact
  active/inactive class pair is copy-pasted in ~4 places; if you touch the pattern, update it
  everywhere or extract a shared component (not done yet, see Known Issues).

## Animations

Minimal, intentional, and respect `prefers-reduced-motion`:
- `.animate-shell-arrive` (defined in `globals.css`): a 0.45s fade+slide-up applied to the
  `<main>` of every layout shell (marketing, app, cours). Disabled entirely under
  `prefers-reduced-motion: reduce`.
- Tailwind's built-in `animate-bounce` is used once, on the hub hook's scroll-cue chevron —
  deliberately sparse, not a general-purpose micro-interaction library.
- Hover transitions on buttons/cards use plain `transition` + color/border/shadow changes, no
  custom easing or duration tokens beyond Tailwind's defaults.

## Responsive behavior

Mobile-first throughout: base styles target small screens, `md:` breakpoint (768px) is used for
the marketing/app grid layouts to go from 1 to 2/3/4 columns and to switch the nav from a
hamburger menu to an inline bar. There is no `sm:`/`lg:`/`xl:` usage beyond a handful of
`sm:grid-cols-2` cases (credentials grid, category picker) — the design intentionally targets
"mobile vs. desktop," not a full 5-breakpoint system.

## Logo & imagery

`public/logo.jpg` is a single portrait-orientation (922×1152) branded graphic (arch motif with
two intertwined figures + Arabic calligraphy of the site name) used at multiple sizes via
`next/image` with `width`/`height` set to its true intrinsic size and displayed size controlled
by Tailwind `h-*` classes (`h-8` to `h-24` depending on placement) plus `w-auto`. It is **not**
cropped/transparent — placing it on a non-cream background will show a visible edge. The same
file backs the favicon (`src/app/icon.jpg`) and Apple touch icon (`src/app/apple-icon.jpg`) via
Next's file-convention icons (see `app-icons.md` in the Next docs) — at 16×16/32×32 favicon size
the fine linework compresses into a soft blob; a purpose-cropped square version would render
sharper if that's ever revisited.

`CoachPortrait.tsx` is a **placeholder** (gradient blob + initial letter) standing in for a real
photo of the coach — this is a known temporary state, not a finished design choice (see
PROJECT_CONTEXT.md § Known Issues).
