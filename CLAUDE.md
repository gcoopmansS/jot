# CLAUDE.md — Jot

This file gives Claude Code project context, the current tech stack, and conventions to follow.
Claude Code reads this automatically at the start of every session in this repo.

**Context for Claude:** the person building this is not a professional developer. Prioritize
simple, readable, well-commented solutions over clever or highly abstracted ones. Prefer boring,
obvious code. Work in small steps; don't rewrite far more than what was asked for.

---

## 1. Product context

Jot is a low-friction notetaking app. The core insight it's built around: people usually only
realize they need to take notes _after_ something (like a meeting) has already started. Every
mainstream tool (Notion, Obsidian) optimizes for organizing _before_ you write. Jot flips that:
**capture first, categorize after — and categorizing is always optional.**

Core flow:

1. One click/tap → blank note, cursor active immediately, zero setup.
2. User writes, uninterrupted, using a rich-text editor (see Section 7).
3. Only after writing, a lightweight prompt: "What are these notes about?" — Type, Project, Topic,
   all optional.
4. Skipping is fine — the note goes to an "Unsorted" inbox, filed whenever, using the same
   categorize step.

**The capture flow is sacred.** No form, modal, or required field may ever appear before the user
can start typing. This is the single most protected rule in the whole app.

Two distinct content types live under a Project:

- **Meetings** — a named, recurring-capable thread. Can be marked "recurring" (single toggle, no
  required cadence). Entries accumulate chronologically. Shows a "last session" shortcut.
- **General notes** — a consultant's own analysis, reasoning, drafts. Organized by optional Topic.
  Never recurring — that concept is exclusive to Meetings.

**Terminology, kept deliberately consistent — do not drift from these:**

- The type toggle is **"Meeting" / "General"** — NOT "Note," "Personal," "Analysis," or
  "Standalone." These alternatives were all considered and rejected (see decision log below).
- The action of filing an unsorted note, or saving via the categorize step, is always called
  **"File"** (e.g. "File note" button) — never "categorize," "sort," or "organize" in any
  user-facing text. This matches the tagline "Capture first, file later."
- The combined recency feed (previously called "Everything") is called **"Recent"** and is sorted
  newest-first.

**Explicitly excluded / deliberately parked — do not build speculatively:**

- Tags (cross-cutting labels) — considered and removed early; Project/Topic covers this for now.
- Re-filing a note between projects/meetings after the fact.
- Calendar integration.
- AI-generated title suggestions or auto-summaries — considered and parked specifically because an
  auto-summary risks misrepresenting messy real notes, and adds a second external API dependency
  before the core loop has been proven in real use. If revisited, it must be opt-in (a button the
  user clicks), never silent/background.
- Google/OAuth sign-in — considered, parked to avoid added complexity (external Google Cloud setup,
  and Account Settings would need conditional logic for password-less accounts) until after a period
  of solo real use.
- Full phone-sized mobile responsiveness — the app supports down to ~640px (split-screen/narrow
  desktop use), but true phone-optimized touch layouts are a separate, larger future project.

**Known open items — not yet built, don't assume they exist:**

- In-app feedback mechanism (never implemented despite being discussed).
- "Export my data as JSON" feature.
- Terms of Service (separate from the Privacy Policy, which does exist — see Section 9).
- Database backup/point-in-time-recovery plan tier has not been confirmed.
- Row Level Security policies should exist (see Section 5) but re-verify directly in the Supabase
  dashboard rather than assuming — this has been flagged multiple times as needing confirmation.

---

## 2. Core concepts: Projects, Meetings, Topics

Every note lives inside a **Project** (e.g. "Client Migration"). A Project is just a named
container with no recurring concept of its own.

### Meetings

A named, recurring-capable thread (e.g. "Stakeholder sync"). Key attributes:

- `recurring` (boolean) — marking a meeting recurring is a **single click, no required fields**.
- `cadence` (optional free text, e.g. "Every 3 weeks") and `attendees` (optional free text) —
  enrichments added later via "Edit details," never required to mark something recurring.
- Unmarking recurring preserves `cadence`/`attendees` rather than clearing them, in case it's
  re-marked recurring later.
- Shows a "last session" expandable inline preview (not just a link away).
- A "+ Add note to this meeting" shortcut exists on the meeting's own page, skipping the
  Project/Topic categorize fields since they're already known from context — this still goes
  through the full reliability-protected save path (Section 8), it's not a separate lighter path.
- Meetings marked recurring appear in a pinned **"Recurring"** sidebar section (flat list across
  all projects, one click to any of them) — this has no date/schedule logic, it's purely a list of
  everything currently marked recurring.
- An empty, non-recurring meeting (its last note deleted) is auto-deleted. A recurring meeting is
  **exempt** from this auto-cleanup even at zero notes, since marking it recurring represents
  deliberate intent.

### General notes / Topics

Organized by an optional **Topic** (e.g. "Requirements analysis"). Topics have no recurring
concept, no cadence, no attendees — those are exclusive to Meetings. If no topic is given, it
defaults to a "General" topic bucket, never blocking the save.

Same auto-cleanup rule applies: an empty Notes-topic is deleted when its last note is removed (no
recurring exemption applies here, since Topics never have that concept).

**Meetings and Topics remain structurally separate — not one model with a type flag driving UI.**

### Navigation structure

- **Unsorted** — the holding pen for skipped/uncategorized notes. Kept intentionally guilt-free:
  neutral badge color (not alarming red), no age-based labels, no nagging to "clean it up."
- **Recent** — combined feed across everything, sorted newest-first.
- **Recurring** — pinned flat list of all recurring meetings (see above).
- **Projects** — expandable in the sidebar into their Meetings and Notes-topics subsections.
- Each **Project** also has its own overview page (clicking the project name, distinct from the
  expand/collapse caret) listing its Meetings and Topics with note counts.

---

## 3. Tech stack

| Layer            | Choice                                              | Why                                                         |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Framework        | **Next.js (App Router, TypeScript)**                | One codebase for frontend + backend (API routes).           |
| Language         | **TypeScript**                                      | Visible errors for mistakes that would otherwise be silent. |
| Styling          | **Tailwind CSS**                                    | Styles live next to markup.                                 |
| Rich text editor | **Tiptap**                                          | Live markdown-style formatting (see Section 7).             |
| Database + Auth  | **Supabase** (project region: `eu-west-1`, Ireland) | Postgres + auth + visual table editor in one place.         |
| Database access  | **Supabase JS client** — **no ORM**                 | One library, no extra schema/migrate layer.                 |
| Data fetching    | **TanStack Query**                                  | Handles loading/caching/error states consistently.          |
| Hosting          | **Vercel** (app) + **Supabase** (database)          | Low-ops, generous free tiers.                               |

### Explicitly avoid

- No ORM (Prisma etc.) — plain Supabase client queries only.
- No separate backend service — Next.js API routes are enough.
- No Redux/MobX — local state + TanStack Query is enough.
- No localStorage as a _source of truth_ for saved notes (it's used only for transient drafts —
  see Section 8) — Supabase is the source of truth from the very first version.
- No hand-written CLI migrations — use the Supabase dashboard's SQL editor.
- Never use emojis anywhere in the UI. Icons are inline SVG using `currentColor`, never an icon
  font.

---

## 4. Data model

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,  -- the owner-of-record; see membership note below
  name text not null,
  created_at timestamp with time zone default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  name text not null,
  recurring boolean default false,
  cadence text,
  attendees text,
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
  text text not null,                 -- stored as plain markdown
  title text,                         -- optional, set at the top of the note itself (see Section 7)
  type text not null check (type in ('meeting', 'general')),
  meeting_id uuid references meetings,
  topic_id uuid references note_topics,
  is_unsorted boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Foundation for Team/shared Projects (see jot-analysis/TODO.md). Every project's owner is
-- also inserted here as "member #1" via a trigger on projects insert - membership, not
-- projects.user_id, is what every RLS policy now actually checks against.
create table project_members (
  project_id uuid references projects not null,
  user_id uuid references auth.users not null,
  joined_at timestamp with time zone default now(),
  primary key (project_id, user_id)
);

-- Public mirror of auth.users.email, kept in sync by trigger. Needed because the RLS-constrained
-- client can't query auth.users directly - used to resolve a user_id to an email for member
-- lists/author attribution (not yet built - see TODO) and invite-acceptance email matching.
create table profiles (
  id uuid primary key references auth.users(id),
  email text not null,
  created_at timestamp with time zone default now()
);
```

Notes:

- `title` is optional and edited in exactly ONE place: a dedicated field at the top of the note
  itself (capture overlay and note detail view share this same field) — it was deliberately removed
  from the categorize bar to avoid two simultaneously-editable inputs for the same value (see the
  race-condition rule in Section 8).
- `is_unsorted = true` must ONLY be set when the user explicitly clicks "Skip for now" — clicking
  "File note" must always set it to `false`, even if every field (Project, Topic, Type) was left
  blank and defaults were used. This has regressed once before; treat it as a specific regression
  risk to test after touching the save logic.
- `text` is markdown. Card previews and snippets must strip markdown formatting characters (no
  visible `**`, `#`, `-`) — reuse one shared stripping function, don't reimplement it per view.

**Row Level Security — membership-based, not a raw `user_id` match (changed 2026-07-30 as the
foundation for Team/shared Projects).** For `projects`/`meetings`/`note_topics`/`notes`: viewing
any row requires the current user to have a `project_members` row for that project (checked via
the `is_project_member(project_id)` helper function); editing/deleting a **note's** text is
additionally restricted to that note's original author (`notes.user_id`), while everything else
(meetings, topics, and inserting/deleting notes) is symmetric across any member. `projects` itself
stays owner-only for UPDATE/DELETE (`user_id = auth.uid()`, unchanged). Unsorted notes
(`is_unsorted = true`) are untouched by any of this — always private to their own `user_id`, never
routed through project membership at all, since they don't belong to a project. Re-verify this
directly in the Supabase dashboard rather than assuming it's already correctly configured.

---

## 5. Critical, standing rules — regression risks, not just history

These come from two serious bugs that were found and fixed. Both are structural principles that
must hold going forward, not just patches applied once.

### 5.1 Account data isolation (security-critical)

A bug once caused one account's data to appear inside another account's session after switching
accounts in the same browser. The fix touched several layers, and **all of them must remain true**:

- TanStack Query cache keys must be scoped by user ID, and the entire query cache must be fully
  cleared on sign-out AND again on a new sign-in success — never allow previously-fetched data to
  persist across a session change.
- Any local draft persistence (Section 8) must be scoped per-user, never a fixed key, and cleared
  on sign-out regardless.
- No in-memory component/context state should survive an auth state change without being reset.
- RLS (Section 4) is defense-in-depth underneath all of this, not a substitute for it.

**Test whenever touching auth or data-fetching logic:** sign in as Account A, create a distinctly
named note, sign out, sign in as Account B in the same tab, confirm Account A's content is not
visible anywhere (not even briefly during loading).

### 5.2 Never let a save overwrite live editing state (data-loss risk)

A bug caused text typed _during_ an in-flight save to be silently erased once that save completed —
because the save's success handler was writing a stale snapshot back into the editor.

**Standing rule:** the editor holds the single source of truth for what's currently being typed, at
all times. A save/autosave function may only ever _read_ from that state to persist it — it must
never _write back_ into the editor when it resolves, regardless of timing. If multiple
saves can be in flight, a stale/slower response must never overwrite state after a newer one has
already started (same category of guard as the debounced search race-condition guard, Section 6).

**Test whenever touching autosave logic, in both the capture overlay and the note detail view:**
type, wait for "Saving...", type more before it finishes, confirm nothing typed during that window
is lost. Also confirm that closing a note **flushes any pending debounced save immediately** rather
than allowing an edit to be lost because the debounce timer hadn't fired yet before closing.

---

## 6. Search

Global search (a dropdown appearing below the search bar, not a full-page navigation) queries
Supabase directly (not just client-loaded data), matching note title, body text, Meeting/Topic
name, and Project name, across Meetings, Notes-topics, and Unsorted. Debounced (~300ms), with a
stale-response guard so an older query can't overwrite newer results — and the search input must
never lose focus while a debounced search fires or resolves.

---

## 7. Rich-text editor (Tiptap)

The writing surface uses live, Notion-style formatting (not raw markdown syntax visible while
typing), stored as plain markdown text in `notes.text`. Supported: headings, bold/italic, bullet
and numbered lists, checkboxes/task lists (stored as markdown task syntax, interactive — clicking
toggles checked state and persists through autosave), blockquotes, inline code, and
autolinked/clickable URLs (styled as underlined accent-teal links, opening in a new tab).

Discoverability is handled two ways, both required:

- A **slash command menu** (typing `/`) with Heading, Bullet List, Numbered List, Checkbox, Quote,
  Code.
- A **selection bubble toolbar** with Bold, Italic, Heading, Bullet List, Checkbox, Quote.

Both must reflect identical underlying formatting commands — a checkbox created via the slash menu
and one created via the toolbar must produce identical markdown and identical interactivity.

Browser spellcheck is disabled on the editor (`spellcheck="false"`) — too noisy for names/jargon.

**Title** lives in a dedicated field at the top of the writing surface (capture overlay and note
detail view), separate from the body — never "first line of text becomes the title," since that
would be ambiguous with the body's own heading support.

---

## 8. Capture flow specifics

- **Finishing a note**: an explicit "Done" button (real tappable button, works without a keyboard)
  plus the `⌘⏎` / `Ctrl+Enter` shortcut as an equivalent, not a replacement. The shortcut hint is
  plain muted text next to the button, not a second bordered/boxed element that could read as a
  second button.
- **Discarding a note**: a separate, deliberate, low-emphasis "Discard" text link — never bound to
  any keyboard shortcut (so no accidental keystroke can destroy content). If there's any text,
  discarding requires an explicit confirmation step before anything is deleted. This is a genuinely
  separate code path from "finish/save" — not the same function with a flag.
- **Going back from the categorize bar to editing**: a "← Back to note" action, AND clicking
  anywhere in the note-text area above the categorize bar does the same thing (reusing the same
  function) — except clicks inside the categorize bar's own fields, which must not trigger this.
  Project/Topic/Type values already entered must be preserved when going back and forth.
- **Reliability layer**: local draft persistence to localStorage while typing (debounced, ~500ms,
  user-scoped per Section 5.1), retry-with-backoff on failed Supabase saves (client-generated note
  ID used for upsert so a retry can't create a duplicate), a visible save-status indicator
  ("Saving…" / "Saved" / "Couldn't save — retrying"), and a `beforeunload` warning if the user tries
  to leave while something genuinely unsaved/failed is still at risk (not shown once everything's
  confirmed saved).

---

## 9. Auth and Account Settings

- Sign-up requires an explicit, unticked checkbox ("I agree to the Privacy Policy," linking to
  `/privacy` in a new tab) before account creation — not just a passive text link.
- Email changes use Supabase's **secure (double-confirmation) email change** — confirmation sent to
  both the old and new address; the change only completes once required steps are done. The old
  address's email functions as a security notice.
- Password changes require the current password.
- **Account deletion** is a genuine hard delete: all of a user's projects/meetings/topics/notes,
  then the auth user itself via Supabase's admin delete-user call — which **must only ever be
  invoked from a server-side API route using the service role key**. The service role key must
  never be imported into any client-side/browser-executed file. Deletion requires explicit,
  effortful confirmation (not a single click) given it's irreversible.
- A Privacy Policy exists at `/privacy`, publicly accessible whether logged in or out, linked from
  the landing page footer, the sign-up checkbox, and Account Settings.

---

## 10. Landing page and interactive demo

A public landing page (`/`) exists for logged-out visitors, redirecting authenticated users straight
into the app. It includes an embedded, self-contained interactive demo of the capture flow.

**The demo must never touch the real database.** It reuses the real capture/categorize/card
components but runs entirely on local React state, seeded with fake example data, and must never
call Supabase or any API route. This boundary must hold even as the demo or the real components it
shares evolve — re-verify this explicitly if either changes.

---

## 11. Design language

Full design tokens (colors, fonts, spacing, shadows, component patterns) are defined as CSS
variables in `app/globals.css` and must be used via those variables, never guessed or hardcoded:

- **Palette**: warm paper background (`--paper` `#F1F0EA`), dark ink text (`--ink` `#1B2521`), teal
  accent for Meetings/primary actions (`--accent` `#3D6B66`), purple for General notes (`--purple`
  `#6B4F8A`), amber for Unsorted/attention cues (`--amber` `#EFAE24`) — amber is also used for
  informational security notices (never blue, never red — red is reserved for destructive/danger
  actions only, e.g. the account-deletion "Danger Zone").
- **Fonts**: Space Grotesk (headings/UI chrome), IBM Plex Sans (body UI text), IBM Plex Mono
  (metadata — timestamps, counts, uppercase field labels), Source Serif 4 (note-writing surface
  only, deliberately distinct from UI chrome).
- **Cards are context-aware**: inside a specific Meeting or Notes-topic view, cards omit the Type
  pill and location tag (redundant with the breadcrumb) and must collapse that space cleanly (no
  leftover empty gap). In "Recent," search results, and Unsorted, cards show the full Type pill +
  location tag, since content is mixed there.
- **Recurring meeting icon**: an inline SVG repeat/loop glyph (two curved arrows), never a text
  character like "↻" — renders inconsistently across fonts.
- **Responsive**: supports down to ~640px width (split-screen/narrow-desktop use case, e.g. next to
  a video call) — full phone-sized layouts are explicitly out of scope for now (Section 1).
- Icons are inline SVG using `currentColor`, never an icon font or emoji.

---

## 12. Working with Claude Code as a non-developer

- **Work in small steps**, one feature/screen at a time, confirming each works before moving on.
- **Commit after every step that works** — use the diff viewer in Claude Desktop's Code tab to
  actually look at what changed before accepting, especially if the diff is much larger than
  expected for what was asked.
- **Ask for a plain-English explanation before accepting anything unclear.**
- **Test manually after every change** using a simple checklist: can I still capture a note? File
  it? Search for it? Does it survive closing and reopening? Don't do this testing yourself. Give me a test plan, I can do myself manually
- **Paste exact error messages back**, rather than paraphrasing from memory.
- **Keep this file up to date as decisions change** — it's the shared context across sessions, and
  stale context leads to re-litigating or reversing decisions already made for good reasons.
