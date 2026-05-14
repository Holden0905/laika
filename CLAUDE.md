# CLAUDE.md — Laika

This file gives Claude Code context about the Laika project. Read it fully before making any changes.

---

## Most Important Rules

1. **Every table gets a `user_id` column.** Even though Brian is the only user right now, this app may become multi-user. All tables that store user data must include `user_id uuid references auth.users(id)` and all queries must be scoped by user.
2. **GRANT statements after every table creation.** Run the standard GRANT block immediately after creating any table — without these, RLS policies are never evaluated and you get empty `{}` error objects.
3. **Journal data is personal — treat it with care.** Never seed, fabricate, or generate placeholder journal entries. Test with clearly labeled test data that Brian can delete.
4. **Follow the design system exactly.** Laika has a specific visual identity documented in this file. Do not deviate from the color palette, typography, or component patterns. Reference `design/reference/laika-home-v3.jsx` for the canonical implementation.
5. **When uncertain, try to fix it. If you can't, flag it and move on.** This is a low-risk personal project.

---

## What Laika Is

Laika is a personal journaling app with two modes: freeform journal entries and structured weekly reflections driven by a customizable prompt library. The core idea is that prompts are "satellites" — recurring questions that keep important life domains in orbit — and the user curates which satellites are active each week. Entries and reflections can be tagged with Obsidian-compatible wiki-links and exported as individual markdown files for integration with the Brozosphere (Brian's Obsidian vault). The app also supports photo attachments and mood tracking on entries.

Named after the first dog in space — a lone traveler sent into the unknown to see what happens.

This is a personal side project. Low risk. Brian is the only user.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | PES baseline |
| Styling | Tailwind CSS v4, shadcn/ui | Custom theme — see Design System below |
| Backend | Supabase (PostgreSQL, Auth, RLS, Storage) | Storage used for photo attachments |
| Hosting | Vercel | Auto-deploys on push to main |
| Editor | Cursor IDE / Claude Code | Full autonomy — MCP access to Supabase |
| Package manager | npm | |

---

## Environments

| Environment | URL | Supabase Project Ref |
|---|---|---|
| Production | TBD (Vercel) | TBD (create before first build) |

---

## Database Rules

You have MCP access. Create tables, run migrations, seed data. Flag destructive operations (`DELETE`, `TRUNCATE`, `DROP TABLE`) before running them.

After every table creation, run:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
```

Soft deletes over hard deletes — always. Use `is_active = false`, never `ON DELETE CASCADE` for business entities.

Input validation must exist at two layers — UI prevents bad input, database rejects it if it gets through (`CHECK` constraints, `NOT NULL`, `UNIQUE`).

Run schema before UI — verify tables exist and contain expected data before building components that depend on them.

---

## File Structure

```
laika/
├── app/
│   ├── layout.tsx              # Root layout, theme provider, auth wrapper
│   ├── page.tsx                # Home — transmission log + reflection status
│   ├── login/                  # Auth pages
│   ├── journal/                # Freeform journal entries
│   │   ├── page.tsx            # Entry list / timeline
│   │   ├── [id]/               # Entry detail / edit
│   │   └── new/                # New entry
│   ├── reflections/            # Weekly structured reflections
│   │   ├── page.tsx            # Reflection list / weekly view
│   │   ├── [id]/               # Reflection detail
│   │   └── new/                # New weekly reflection (prompt picker)
│   ├── prompts/                # Prompt library management
│   │   └── page.tsx            # Add / edit / retire prompts
│   ├── export/                 # Markdown export
│   └── api/                    # API routes
│       └── export/             # Markdown file generation endpoint
├── components/
│   ├── ui/                     # shadcn components (themed to design system)
│   ├── journal/                # Journal-specific components
│   ├── reflections/            # Reflection-specific components
│   └── theme-toggle.tsx        # Dark/light mode toggle
├── lib/
│   ├── supabase/               # Supabase client config
│   └── utils.ts                # Shared utilities
├── design/
│   ├── reference/              # Design mockups and reference images
│   │   ├── laika-home-v3.jsx   # Canonical home screen mockup
│   │   ├── laika-throne.png    # Schematic art — Laika on command throne
│   │   └── satellite-impact.png # Schematic art — destroyed satellite
│   └── assets/                 # Custom imagery (Nano Banana generated)
├── public/
└── CLAUDE.md
```

Update this map as the project grows.

---

## Design System

Laika's visual identity is **technical schematic** — the aesthetic of 1960s aerospace engineering documentation and NASA mission control terminals. The app should feel like a spacecraft diagnostic interface being used for self-examination.

### Design Philosophy

- **Not warm, not cozy, not a gratitude journal.** This is an instrument for examining yourself at a quantum level.
- **Structured but with moments of visual depth.** Not purely spartan — intentional and designed, just not soft.
- **Dark mode = terminal display. Light mode = blueprint printout.** Same visual language, inverted.
- Black/white foundation with three accent colors. Nothing else.
- Corner bracket markers on cards and containers (schematic registration marks).
- Crosshair markers on section headers (coordinate reference points).
- Ruler/tick marks as dividers (measurement scale details).
- Technical annotation language throughout: "Transmission Log," "Reflection Cycle," "System Diagnostics," "Active Satellites," "Power Output."
- Entry numbering as 4-digit padded IDs (ENTRY 0047).
- Prompt IDs as P-001, P-002, etc.

### Reference Imagery

The `design/reference/` folder contains the canonical mockup and two reference images generated by ChatGPT in a technical schematic / aerospace blueprint style. These set the tone: white wireframe line art on black void, monospace annotation callouts, asset classification headers, coordinate axes, scale rulers. All custom imagery for the app should match this visual language.

### Color Palette — Dark Mode

```
VOID (background):        #000000
LINE (primary text):       #ffffff
LINE-MID (body text):      rgba(255,255,255, 0.55)
LINE-DIM (borders):        rgba(255,255,255, 0.22)
LINE-GHOST (subtle divs):  rgba(255,255,255, 0.08)

PHOSPHOR (active/complete): #3abd6f  — CRT terminal green, "signal received"
PHOSPHOR-DIM:               rgba(58,189,111, 0.15)
Glow shadow on active:      0 0 6px rgba(58,189,111, 0.2)

AMBER (labels/metadata):    #e0b84a  — 60s readout warmth
AMBER-MID:                  rgba(224,184,74, 0.8)
AMBER-DIM:                  rgba(224,184,74, 0.55)

RED (warnings/alerts):      #b84040  — used sparingly
RED-DIM:                    rgba(184,64,64, 0.15)
```

### Color Palette — Light Mode

Invert the foundation. White background, black primary text. Phosphor green and red carry over unchanged. **Amber swaps to blueprint blue** — the secondary-accent token (`--amber`) holds `#e0b84a` in dark mode and `#1e5a9e` in light, so the page reads like an actual aerospace blueprint document rather than a recoloured terminal. The class names (`text-amber`, `border-amber-dim`, etc.) stay the same; only the resolved color flips per theme.

```
VOID (background):         #ffffff
LINE (primary text):        #000000
LINE-MID (body text):       rgba(0,0,0, 0.55)
LINE-DIM (borders):         rgba(0,0,0, 0.22)
LINE-GHOST (subtle divs):   rgba(0,0,0, 0.08)

PHOSPHOR, RED:              Same values as dark mode

AMBER → BLUEPRINT BLUE:     #1e5a9e
AMBER-MID:                  rgba(30,90,158, 0.8)
AMBER-DIM:                  rgba(30,90,158, 0.55)
```

### Color Usage Rules

| Color | Meaning | Used For |
|---|---|---|
| White (dark) / Black (light) | Primary content | Titles, entry text, nav items, active states |
| Amber | Secondary / metadata | Labels, dates, prompt IDs, tags, section headers, small text that needs to be readable but not primary |
| Phosphor green | Signal active / complete | Answered prompts, progress bars, streaks, status dots, mood bars (4+), active nav indicator |
| Red | Warning / attention | Decaying satellites, missed reflections, broken streaks, error states |

### Typography

Single font family: **IBM Plex Mono** (all weights: 300–700).

| Element | Size | Weight | Spacing | Color |
|---|---|---|---|---|
| App title (ЛАЙКА) | 22px | 300 | 0.2em | LINE |
| Page header questions | 24px (desktop) / 20px (mobile) | 300 | 0.06em | LINE |
| Entry titles | 13–14px | 600–700 | 0.04em | LINE |
| Body / excerpt text | 10.5–11px | 400 | 0.04em | LINE-MID |
| Labels / metadata | 9px | 400 | 0.12–0.14em | AMBER-DIM |
| Status badges | 8px | 400 | 0.08em | AMBER-DIM |
| Tags (wiki-links) | 9px | 400 | 0.04em | AMBER |

All text is uppercase for labels, mixed case for body content. Tags render as `[[tag-name]]` with amber text and amber-dim borders.

### Component Patterns

**Corner Marks:** Every card and container has 6px corner bracket marks at all four corners using LINE-MID borders. This is the registration mark pattern from technical schematics.

**Section Headers:** Crosshair icon (8px SVG) + AMBER-DIM label text + ghost horizontal rule extending to fill remaining width.

**Rulers:** Tick mark dividers using alternating heights (3px / 5px / 8px at intervals of 1 / 5 / 10) in LINE-DIM, with every 10th tick in AMBER-DIM.

**Status Dots:** 5px circles. Phosphor green with subtle glow for active/stable. Amber for new. No fill + LINE-DIM border for inactive.

**Mood Bars:** 5 segments, 12px × 3px each. Filled segments use PHOSPHOR at 0.7 opacity. Empty segments use LINE-GHOST.

**Checkboxes:** 14px squares with 1px borders. Unchecked: LINE-DIM border, transparent fill. Checked: PHOSPHOR border and fill with glow, black checkmark.

**Buttons / Actions:** Transparent background, LINE-DIM border, corner marks. Hover raises border to LINE-MID. Status indicator in top-right corner using appropriate accent color.

---

## User Roles

| Role | Access |
|---|---|
| authenticated | Full access to own data (scoped by user_id). Only role for now. |

Single-user app currently. No admin/viewer distinction needed yet. If this becomes multi-user, roles would be added to a `profiles` table.

---

## Key Tables

| Table | Purpose | Notes |
|---|---|---|
| `profiles` | User profile, extends auth.users | `id` references `auth.users(id)`. Display name, preferences, theme setting. |
| `entries` | Freeform journal entries | `user_id`, `title` (optional), `body` (text), `mood` (integer 1-5), `entry_date` (date), `is_active` |
| `prompts` | The customizable prompt library | `user_id`, `text`, `is_active`, `created_at`. Users add/retire prompts over time. |
| `weekly_reflections` | Container for a week's reflection | `user_id`, `week_start` (date, always a Monday), `week_number` (integer), `year` (integer), `is_active` |
| `reflection_prompts` | Junction: which prompts are picked for a given weekly reflection | `reflection_id` (FK → weekly_reflections), `prompt_id` (FK → prompts), `user_id`. Separate from `reflection_responses` so a prompt can be "in scope" for a week without yet being answered. |
| `reflection_responses` | Answers to prompts for a given week | `user_id`, `reflection_id` (FK → weekly_reflections), `prompt_id` (FK → prompts), `body` (text), `mood` (integer 1-5, optional) |
| `tags` | Obsidian wiki-link compatible tags | `user_id`, `name` (text, unique per user). Rendered as `[[tag-name]]` in markdown export. |
| `entry_tags` | Junction: entries ↔ tags | `entry_id`, `tag_id` |
| `response_tags` | Junction: reflection_responses ↔ tags | `response_id`, `tag_id` |
| `entry_photos` | Photo attachments on entries | `entry_id`, `user_id`, `storage_path` (text, references Supabase Storage), `caption` (optional) |

**Schema gotchas:**
- `mood` is an integer 1-5, not a string. Validate at both DB (`CHECK (mood >= 1 AND mood <= 5)`) and UI level.
- `week_start` is always a Monday. Enforce in application logic when creating reflections.
- `entry_date` is a `date` type, not `timestamp`. Never pass through `new Date()` — parse as local date to avoid off-by-one errors.
- Tags are unique per user (`UNIQUE(user_id, name)`), not globally unique.
- Tag names must be normalized — lowercase, trimmed, spaces replaced with hyphens — for consistent Obsidian wiki-link rendering.
- `prompts.is_active` controls whether a prompt appears in the picker. Retired prompts stay in the DB so historical reflections still reference them.
- Per-week prompt selection is materialized in `reflection_prompts`. Progress on a reflection = `count(reflection_responses where reflection_id = X) / count(reflection_prompts where reflection_id = X)`. A prompt being retired mid-week does NOT remove it from already-created reflections.
- `entry_photos.storage_path` must follow the convention `{user_id}/{entry_id}/{filename}` — the first segment drives Storage RLS, the second groups by entry. A DB `CHECK` enforces the prefix. The matching bucket is `entry-photos` (private, 10MB cap, image MIME types only). Photos are served via signed URLs, never public.

---

## RLS Policy Pattern

User-scoped via `auth.uid()`. Every table with a `user_id` column gets:

```sql
-- SELECT: users see only their own data
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: users can only insert as themselves
CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: users can only update their own data
CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- DELETE: users can only delete their own data (prefer soft delete in practice)
CREATE POLICY "Users can delete own data" ON table_name
  FOR DELETE USING (user_id = auth.uid());
```

Both `USING` and `WITH CHECK` clauses must be included. Missing `WITH CHECK` on INSERT policies causes silent failures.

---

## TypeScript Conventions

**Supabase joined query types — single FK relations return objects, not arrays:**
```typescript
// CORRECT
type ReflectionResponse = { prompts: { text: string } | null }
// Access: response.prompts?.text

// WRONG
type ReflectionResponse = { prompts: { text: string }[] }
```

**Date handling — never pass Supabase date strings through `new Date()`:**
```typescript
// CORRECT — parse as local date
const [year, month, day] = dateStr.split('-')
const date = new Date(Number(year), Number(month) - 1, Number(day))

// WRONG — causes off-by-one day errors from UTC offset
const date = new Date(dateStr)
```

**Mood values are integers 1-5.** Use a controlled vocabulary or enum, not arbitrary strings.

**Error messages must use error styling (red). Success messages must use success styling (phosphor green).** Never mix them.

---

## Markdown Export Format

Each entry/response exports as a separate `.md` file. The format:

**Freeform entry:**
```markdown
---
date: 2026-05-13
type: journal
mood: 4
tags:
  - writing
  - recovery
---

# {title or "Journal Entry — May 13, 2026"}

{body text}

[[journal-index]]

[[writing]] [[recovery]]
```

**Weekly reflection (one file per response):**
```markdown
---
date: 2026-05-11
type: reflection
week: 2026-W20
prompt: "Did you write this week?"
mood: 4
tags:
  - writing
  - poetry
---

# Did you write this week?

{response body text}

[[reflection-index]]

[[writing]] [[poetry]]
```

**Why the split between frontmatter and body for tags:** Obsidian resolves frontmatter `tags` as flat categories (Tags panel, search via `tag:`) but treats quoted `"[[wiki-link]]"` strings there as literal text — they don't appear in the graph. Bare `[[…]]` in YAML breaks parsing (it's a flow sequence). So tags live in two places: plain names in frontmatter for categorization, and `[[wiki-link]]` form in the body footer so they show up in the graph view. Every export also gets a hardcoded `[[journal-index]]` or `[[reflection-index]]` link in the footer so all artifacts can be reached from a single index note.

**Reflection date:** Uses the reflection's `week_start` (the Monday) — stable, no timezone drift from response timestamps.

**Bundling:** Single-file exports return raw `.md`; multi-file exports return a `.zip` with `journal/` and `reflections/` subdirectories.

---

## Environment Variables

| Variable | Description | Public? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (formerly called "anon key") | Yes |
| `SUPABASE_SECRET_KEY` | Supabase secret key (formerly called "service role key", server-side only) | No |

Add more as needed (e.g., Resend API key if email is added later).

---

## Git Conventions

- **Branch strategy:** Work on `main` for now. Create feature branches if complexity warrants it.
- **Commit prefix:** Use conventional commits — `feat:`, `fix:`, `chore:`, `docs:`.
- **Claude Code can commit** with conventional commit messages. Brian pushes to remote.
- **Sync workflow:** `npm run lint && npm run build` before every push. If either fails, don't push.

---

## Build & Deploy

```bash
npm run lint
npm run build
# If either fails, don't push
```

Vercel auto-deploys on push to `main`. No manual deploy steps.

---

## QA/QC Protocol

### Tier 1 — Per-Feature Testing (Continuous)

After building a feature, verify it before moving on. Three passes:

**Pass 1 — Technical verification (does it function?)**
- Hit the endpoint or server action and verify the response
- Query the database directly to confirm records were created/updated correctly
- Confirm the UI renders the data correctly
- Verify joins, filters, and sorting return expected results

**Pass 2 — User perspective (can someone actually use it?)**
- Navigate to the page as a user would — is the flow intuitive?
- Check that labels, messages, and feedback are clear
- Verify error messages use red styling and success messages use phosphor green

**Pass 3 — Adversarial (what breaks with bad input?)**
- Submit empty forms
- Enter invalid data — negative numbers, special characters, extremely long strings
- Click buttons twice rapidly
- Test with no data — what does the page look like when the table is empty?

### Tier 2 — Sprint QA (On Demand)

Trigger: Brian says "run QA," "sprint review," or "pre-deploy check."

1. Generate user stories for all features built since the last QA pass
2. Run through every user story — execute test steps, record pass/fail
3. Produce a QA summary with pass/fail counts and specific failure details
4. The user story suite is cumulative — new features add stories, old stories persist

### Pre-Deploy Checklist

**Build & Code Quality:**
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` passes with no TypeScript errors
- [ ] No `console.log` statements in production code
- [ ] No hardcoded localhost URLs
- [ ] Environment variables set in Vercel for production

**Authentication:**
- [ ] Login flow works end-to-end
- [ ] Logout clears session and redirects to login
- [ ] Protected pages redirect to login without a session
- [ ] Middleware excludes `/login`, `/signup`, `/forgot-password`, `/auth/callback`

**Data Integrity:**
- [ ] All data scoped by `user_id` — no cross-user data leaks
- [ ] Soft deletes work — retired prompts don't appear in picker but still exist for historical reflections
- [ ] Required fields enforced at DB level (NOT NULL)
- [ ] Input validation at both UI and database layers
- [ ] Tag uniqueness enforced per user
- [ ] Mood values constrained to 1-5

**UI & UX:**
- [ ] All pages load without console errors
- [ ] Empty states handled — zero entries, zero prompts
- [ ] Dark/light mode toggle works and persists
- [ ] Mobile responsive — test on phone or narrow window
- [ ] Photo upload works and displays correctly
- [ ] Markdown export produces valid, correctly formatted files
- [ ] Design system followed — correct colors, typography, component patterns

---

## What to Ask Brian Before Doing

- Changing the auth flow or adding new auth providers
- Changing the markdown export format (Obsidian compatibility matters)
- Adding new tables that don't have `user_id`
- Any structural changes to how prompts relate to reflections
- Deviating from the design system (colors, typography, component patterns)

Everything else — go for it.

---

*Laika is built and maintained by Brian Jones using an AI-assisted development workflow (Claude + Claude Code). The codebase prioritizes personal utility, Obsidian integration, and a distinctive visual identity above all else.*
