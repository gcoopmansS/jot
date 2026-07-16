# Copilot Instructions — Jot (working title)

This file gives GitHub Copilot project context, the chosen tech stack, and conventions to follow.
Place this file at `.github/copilot-instructions.md` in the repo root — Copilot Chat and inline
suggestions in VS Code read it automatically.

**Context for Copilot:** the person building this is not a professional developer. Prioritize simple,
readable, well-commented solutions over clever or highly abstracted ones, even if a more "elegant"
approach exists. Prefer boring, obvious code.

---

## 1. Product context

Jot is a low-friction notetaking app. The core insight it's built around: people usually only realize
they need to take notes _after_ something (like a meeting) has already started. Every mainstream tool
(Notion, Obsidian) optimizes for organizing _before_ you write, which creates friction at exactly the
wrong moment. Jot flips that: **capture first, categorize after — and categorizing is always optional.**

Core flow:

1. One click/tap → blank note, cursor active immediately, zero setup.
2. User writes, uninterrupted.
3. Only after writing, a lightweight prompt: "What's this about?" — Project + Topic, both optional.
4. Skipping is fine — the note goes to an "Unsorted" inbox, filed whenever.

Two distinct content types live under a Project, not one shared structure:

- **Meetings** — a named, recurring-capable thread. Each meeting can optionally be marked "recurring"
  (no fixed cadence required — it's just a label + a "last session" shortcut). Entries accumulate
  chronologically.
- **Notes** — general/analysis content (a consultant's own reasoning, drafts, findings). Flat, optionally
  grouped by Topic, but never recurring — recurring is a meeting-only concept.

MVP explicitly excludes: tags, markdown rendering, re-filing notes between projects, calendar integration.
These are known future items — don't add them speculatively.

Initial user: solo consultant/analyst (the founder), building this themselves with Copilot's help, not a
professional developer. Multi-user/team support is a planned v2, not v1 — but the data model is designed
so that adding it later doesn't require restructuring.

---

## 2. Core concepts: Projects and Topics

Every note lives inside a **Project** (e.g. "Client Migration", "Internal Tooling"). A Project is just a
named container — nothing fancy. Projects themselves have no recurring concept. **In the sidebar, you
expand a Project to reveal its Meetings and Topics, which are the actual navigable items you click to
view notes.**

Within a Project, there are **two separate kinds of content**:

### Meetings

A **Meeting** is a named, recurring-capable thread (e.g. "Stakeholder sync", "Kickoff call"). Each meeting
can optionally be marked "recurring." Marking it recurring is a single toggle with no required fields —
`cadence` and `attendees` are optional extras you can add later, never required upfront. A recurring
meeting shows a "last session" shortcut so the user can quickly reference what was discussed previously.
New notes just get added to the same meeting thread over time — there's no separate "add a new instance"
action.

**In the sidebar:** Meetings appear under their parent Project. Clicking a Meeting shows all notes for
that specific meeting.

**Key attributes of Meetings:**

- Can be marked `recurring` (boolean toggle)
- Optional `cadence` field (free text, e.g. "Every 3 weeks")
- Optional `attendees` field (free text)
- Notes accumulate chronologically in the same thread
- Concept of "last session" for quick reference

### Topics (general/analysis notes)

**Topics** organize general analysis content, a consultant's own reasoning, drafts, and findings (e.g.
"Requirements analysis"). Topics are flat groupings — they never have `recurring`, `cadence`, or
`attendees`. Those concepts are exclusive to Meetings. If no topic is given when categorizing a note, it
defaults to a "General" bucket rather than blocking the user.

**In the sidebar:** Topics appear under their parent Project in a "Notes" subsection. Clicking a Topic
shows all notes for that specific topic.

**Key attributes of Topics:**

- Just a name and a reference to a Project
- No recurring concept at all
- No cadence or attendees
- Optional — notes can exist without a topic

### Important distinction

**Meetings and Topics are structurally two separate things, not the same concept with a flag.** Don't merge
their data models or their UI components just because they're both "a named grouping under a Project" —
keep them as distinct as the product concept requires, even where the underlying code could technically be
shared.

**Recurring only exists at the Meeting level** — never at the Project or Topic level. A Project is just a
container; a Topic is just a label. Only Meetings have the recurring/cadence/attendees concepts.

**Navigation hierarchy:** Projects contain Meetings and Topics. In the sidebar, you expand a Project to
see its Meetings and Topics, then click on a specific Meeting or Topic to view those notes.

---

## 3. Tech stack

Chosen specifically to minimize the number of separate tools and concepts a non-developer has to hold in
their head, while still being a real, production-capable stack.

| Layer           | Choice                                                        | Why                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | **Next.js (App Router, TypeScript)**                          | One codebase for frontend + backend (API routes) — no separate backend project to run or deploy.                                                                                                         |
| Language        | **TypeScript**                                                | Gives visible red-squiggly errors in the editor for mistakes that would otherwise be silent bugs — genuinely helpful when you can't eyeball subtle logic errors yourself.                                |
| Styling         | **Tailwind CSS**                                              | Styles live next to the markup; nothing to keep in sync across separate CSS files.                                                                                                                       |
| Database + Auth | **Supabase**                                                  | Postgres database, authentication, and a visual table editor all in one dashboard. You can literally open a spreadsheet-like view of your data to check it's correct — no separate database tool needed. |
| Database access | **Supabase JS client** (`@supabase/supabase-js`) — **no ORM** | One library, one way of talking to the database. Skipping an ORM (like Prisma) removes a whole extra layer (schema file → generate → migrate) that isn't necessary at this scale.                        |
| Data fetching   | **TanStack Query (React Query)**                              | Handles loading/error states and caching consistently, so Copilot doesn't have to reinvent that logic in every component.                                                                                |
| Hosting         | **Vercel** (app) + **Supabase** (database, hosted)            | Both have generous free tiers and simple "connect your GitHub repo and deploy" flows — no server to configure.                                                                                           |
| Version control | **GitHub Desktop** (GUI) or the VS Code Source Control panel  | Avoids needing to learn git commands on the command line.                                                                                                                                                |

### Explicitly avoid

- **No Prisma or other ORM.** Use the Supabase client directly with plain queries.
- **No separate backend service.** Next.js API routes are enough.
- **No Redux/MobX/etc.** Local component state + TanStack Query is enough.
- **No local-only storage (localStorage) as the source of truth.** Use Supabase from the start, even
  though there's only one user right now — this avoids a painful migration later.
- **No command-line database migrations to hand-write.** Create/change tables through the Supabase
  dashboard's table editor, or ask Copilot to write the SQL and paste it into Supabase's SQL editor —
  don't set up a separate migration tool.

---

## 4. Data model

Create these tables in the Supabase dashboard (Table Editor, or paste this into the SQL Editor there).

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  name text not null,
  recurring boolean default false,
  cadence text,      -- optional free text, e.g. "Every 3 weeks" — never required
  attendees text,    -- optional free text — never required
  created_at timestamp with time zone default now()
);

create table note_topics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  name text not null,
  created_at timestamp with time zone default now()
);

-- A single captured note. Exactly one of meeting_id / topic_id is set, or neither if unsorted.
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  text text not null,
  type text not null check (type in ('meeting', 'general')),
  meeting_id uuid references meetings,
  topic_id uuid references note_topics,
  is_unsorted boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

Notes on the design:

- `recurring` on `meetings` is a plain boolean with **no required cadence** — marking something
  recurring is a single toggle; `cadence`/`attendees` are optional enrichments, never required.
- `note_topics` has no recurring-related columns at all — that concept only exists on `meetings`.
- Unsorted notes have `is_unsorted = true` and both `meeting_id`/`topic_id` left empty. Filing a note
  later is just setting one of those and flipping `is_unsorted` to false — never re-entering the text.

**Row Level Security (important, ask Copilot to help set this up early):** Supabase tables are open by
default until you enable Row Level Security (RLS) and add policies. For a single-user app, a simple
policy like "a user can only see/edit rows where `user_id` matches their own logged-in id" on every table
is enough. Ask Copilot: _"Write RLS policies for these tables so each user can only access their own
rows"_ once the tables exist.

---

## 5. Suggested folder structure

```
/app
  /(app)                    # authenticated app shell
    /projects/[id]/page.tsx
    /unsorted/page.tsx
    /everything/page.tsx
  /api
    /notes/route.ts
    /notes/[id]/route.ts
    /meetings/route.ts
    /meetings/[id]/route.ts
    /topics/route.ts
    /projects/route.ts
/components
  /capture/                 # capture overlay, categorize bar
  /note-card/
  /note-detail/
  /sidebar/
  /series-banner/           # recurring meeting banner + edit form
/lib
  /supabase.ts              # Supabase client setup (one file, reused everywhere)
```

---

## 6. Conventions Copilot should follow

- **Simple over clever.** Favor plain `if`/`for` logic and small functions over advanced patterns.
  Add a short comment explaining _why_, not just _what_, for anything non-obvious.
- **TypeScript types for all data shapes** (e.g. a `Note` type matching the `notes` table) — this is
  what makes red-squiggly errors show up when something doesn't match, which is the main safety net here.
- **The capture flow is sacred:** the "+ New note" action must never show a form, modal, or required
  field before the user starts typing. Any new feature that adds a pre-capture step is out of scope.
- **Meetings and Notes are separate concepts, not variants of one model with a type flag driving totally
  different behavior in the UI.** Keep their components and API routes separate even though they share
  the underlying `notes` table.
- **Optional fields stay optional in the UI, not just the database.** Never make "cadence" or
  "attendees" required in a form just because the column exists.
- Prefer small, composable components matching the prototype's visual language (see below) over large
  monolithic page components — smaller files are easier for both Copilot and you to reason about.
- **Never use emojis anywhere in the UI.** Use text, icons (inline SVG), or badges instead.

---

## 7. Design language (refined from working prototype)

**IMPORTANT:** These design tokens are the single source of truth. All new UI work must follow these exact
values — the CSS variables in `app/globals.css` mirror this system. Never guess colors or spacing.

### Color palette

All colors are defined as CSS variables in `globals.css`. Use these variables, not raw hex values, in
components:

| Token            | Hex       | Usage                                           |
| ---------------- | --------- | ----------------------------------------------- |
| `--paper`        | `#F1F0EA` | Main background (warmer than pure white)        |
| `--paper-raised` | `#FFFFFF` | Cards, popovers, raised surfaces                |
| `--ink`          | `#1B2521` | Primary text (dark with subtle green undertone) |
| `--ink-soft`     | `#5B655F` | Secondary text, labels, hints                   |
| `--line`         | `#DEDBCF` | Borders, dividers, subtle separators            |
| `--accent`       | `#3D6B66` | Teal for Meeting type, primary interactive      |
| `--accent-soft`  | `#E4ECEA` | Soft teal backgrounds                           |
| `--amber`        | `#EFAE24` | Amber for Unsorted badge/notifications          |
| `--amber-soft`   | `#FBF0D9` | Soft amber backgrounds                          |
| `--purple`       | `#6B4F8A` | Purple for General note type                    |
| `--purple-soft`  | `#EFE7F5` | Soft purple backgrounds                         |

**Color usage rules:**

- Meeting-related UI (type badge, toggle button when selected): `--accent` (teal)
- General note-related UI (type badge, toggle button when selected): `--purple`
- Unsorted inbox badge: `--amber` background with `--ink` text
- Interactive elements: `--ink` for primary buttons, `--accent` on hover
- All text defaults to `--ink` unless it's secondary (`--ink-soft`)

### Typography

Use these font families via CSS variables (defined in Next.js font loading):

| Font           | Usage                                                      | Weights       |
| -------------- | ---------------------------------------------------------- | ------------- |
| Space Grotesk  | Headings, section titles, emphasized UI text               | 500, 600      |
| IBM Plex Sans  | All body UI text (buttons, labels, navigation)             | 400, 500, 600 |
| IBM Plex Mono  | Metadata (timestamps, counts, technical hints)             | 400           |
| Source Serif 4 | Note content ONLY (writing surface, deliberately distinct) | 400, 600      |

**Font usage rules:**

- Headings in sidebar/header → Space Grotesk
- All UI text (buttons, form labels) → IBM Plex Sans
- Timestamps, "3 notes", field hints → IBM Plex Mono, usually 11-12px, uppercase for labels
- The capture overlay textarea and note preview → Source Serif 4

### Spacing and layout

| Token        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| `--radius`   | `10px` (all rounded corners: buttons, inputs, cards, badges) |
| Sidebar      | `240px` fixed width                                          |
| Main padding | `px-10` (40px horizontal) for consistent content margins     |

**Layout patterns:**

- Max content width: `max-w-3xl` (768px) for reading surfaces and forms
- Vertical rhythm: use `gap-4` (16px) between form rows, `gap-6` (24px) between sections
- Card padding: `p-6` (24px) for standard cards
- Inline elements: `gap-2` (8px) or `gap-3` (12px)

### Shadows

| Token           | CSS Value                                                              | Usage                        |
| --------------- | ---------------------------------------------------------------------- | ---------------------------- |
| `--shadow-card` | `0 1px 2px rgba(27, 37, 33, 0.06), 0 1px 1px rgba(27, 37, 33, 0.04)`   | Note cards, subtle elevation |
| `--shadow-pop`  | `0 12px 32px rgba(27, 37, 33, 0.16), 0 2px 8px rgba(27, 37, 33, 0.08)` | Dropdowns, popovers, modals  |

**Shadow usage:**

- Default cards → `--shadow-card`
- Floating overlays, categorize bar → `--shadow-pop`
- Sidebar/header → no shadow, use `border-color: var(--line)` for separation

### Component patterns

**Buttons:**

- Primary action: `bg: var(--ink)`, `color: var(--paper)`, `hover:bg: var(--accent)`
- Secondary action: underlined text, `color: var(--ink-soft)`, no background
- Toggle buttons (type selector): filled background when selected (Meeting → `--accent`, General → `--purple`),
  light gray `--paper` when unselected

**Form inputs:**

- Use `<input>` with `list` attribute + `<datalist>` for autocomplete, NOT `<select>` dropdowns
- Border: `1px solid var(--line)`, `:focus` → `border-color: var(--accent)`
- Background: `var(--paper)` for active fields, `#f8f6f4` (slightly darker) for disabled
- Labels: uppercase, `IBM Plex Mono`, `11px`, `color: var(--ink-soft)`, tracking-wide

**Type badges:**

- Meeting: `bg: var(--accent)`, `color: white`, uppercase, small rounded pill
- General: `bg: var(--purple)`, `color: white`, uppercase, small rounded pill
- Consistent style: `px-2 py-1 text-xs font-semibold rounded uppercase`

**Animations:**

- Slide-up (categorize bar): `transform: translateY(110%)` → `translateY(0)`, `duration-300`,
  `cubic-bezier(.2, .8, .2, 1)` easing
- Fade-in: `opacity-0` → `opacity-100`, `duration-200`
- Hover transitions: `transition-colors`, no explicit duration (use browser default ~150ms)

**UI patterns (from prototype):**

- Sidebar: no top border, clean typography hierarchy, collapsible sections with `▶`/`▼` Unicode triangles
- Header: white background, `border-bottom: 1px solid var(--line)`, contains page title + search + "New note" button
- Search bar: light gray `--paper` background, rounded (`--radius`), icon on left, placeholder in `--ink-soft`
- Categorize bar: fixed to bottom, white background, slide-up animation, soft shadow from top
- Close button (capture overlay): simple text `×`, hover shows light background, positioned top-right
- Keyboard shortcuts: styled `<kbd>` elements with subtle background, e.g., `⌘N` for New Note
- Collapsible sections: use `▶`/`▼` Unicode triangles for expand/collapse indicators
- Small, uppercase, subtle color fills for badges

**Note cards (for when we implement them):**

- White background, subtle border (`var(--line)`)
- Type badge (MEETING/GENERAL) top-left
- Timestamp and project/topic metadata top-right, small, `IBM Plex Mono`
- Title or first line in bold
- Preview text in `Source Serif 4` (the serif font signals "this is note content")
- Generous padding, clean spacing

**Icons:**

- Inline SVG only (never icon fonts)
- Use `currentColor` so they inherit text color
- Simple, minimal line icons (search, close, repeat/loop for recurring meetings)

---

## 8. Working with Copilot as a non-developer

A few habits that make a real difference when you can't fully read the code Copilot writes:

- **Work in small steps, and get each one running before moving to the next.** Ask for one feature or
  one screen at a time — not "build the whole app." If something breaks, you want to know it was the
  last small change, not one of twenty.
- **Commit to git after every step that works.** This is your safety net — if a later change breaks
  something, you can go back to the last working version instead of untangling it. GitHub Desktop makes
  this a one-click action; you don't need to learn git commands.
- **Ask Copilot to explain before accepting anything you don't understand.** In Copilot Chat: _"Explain
  what this code does in plain English before I accept it."_ If the explanation doesn't match what you
  asked for, that's a signal to ask for a different approach, not to accept and hope.
- **Be skeptical of large, sweeping changes.** If you ask for one small thing and Copilot rewrites ten
  files, ask _"Why did this change so much? Can you do this more minimally?"_ — a much bigger diff than
  expected is usually a sign it took a more complex or roundabout approach than needed.
- **Test manually after every change using a simple checklist**, e.g.: can I still capture a note? Can I
  still file it? Does search still work? Catching a regression immediately is far easier than finding it
  three features later.
- **When something doesn't work, paste the exact error message back to Copilot** rather than describing
  the problem from memory — error messages are precise; your paraphrase of one may lose the detail that
  matters.
- **Keep this instructions file up to date as decisions change.** If you decide to add tags back, or
  change a design choice, update this file too — it's the shared context between sessions with Copilot,
  and stale context leads to Copilot re-suggesting things you already decided against.
