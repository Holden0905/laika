/**
 * Markdown export builders. Output is Obsidian-friendly: plain tag names in YAML
 * frontmatter (so the Tags panel resolves them), wiki-links in the body footer
 * (so they resolve in the graph view — quoted "[[tag]]" in frontmatter does not).
 * One .md file per artifact.
 */

import { isoWeekString } from "@/lib/reflections/format"

const JOURNAL_INDEX = "journal-index"
const REFLECTION_INDEX = "reflection-index"

/** Sentence-case long date, e.g. "2026-05-13" → "May 13, 2026". Matches CLAUDE.md spec. */
function longDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

/** Double-quoted YAML string with backslash, double-quote, and newlines escaped. */
function yamlQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "")}"`
}

/** Collapse whitespace (incl. newlines) in a heading. */
function singleLine(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

/**
 * Footer block: index link on its own line, then wiki-link tags (if any).
 * Body lives in the file body — not the frontmatter — because YAML breaks on bare `[[...]]`,
 * and the quoted form `"[[x]]"` doesn't resolve in Obsidian.
 */
function bodyFooter(indexNote: string, tags: string[]): string[] {
  const out: string[] = []
  out.push("")
  out.push(`[[${indexNote}]]`)
  if (tags.length > 0) {
    out.push("")
    out.push(tags.map((t) => `[[${t}]]`).join(" "))
  }
  return out
}

export type JournalEntryForExport = {
  entry_number: number
  title: string | null
  body: string
  entry_date: string
  mood: number | null
  tags: string[]
}

export type ReflectionResponseForExport = {
  response_id: string
  body: string
  mood: number | null
  prompt_text: string
  prompt_number: number
  reflection_year: number
  reflection_week_number: number
  reflection_week_start: string
  tags: string[]
}

export type ExportFile = {
  path: string
  content: string
}

/** Build a single journal-entry .md file (frontmatter + heading + body + index footer). */
export function buildJournalMarkdown(entry: JournalEntryForExport): ExportFile {
  const lines: string[] = []
  lines.push("---")
  lines.push(`date: ${entry.entry_date}`)
  lines.push(`type: journal`)
  if (entry.mood !== null) lines.push(`mood: ${entry.mood}`)
  if (entry.tags.length > 0) {
    lines.push(`tags:`)
    for (const tag of entry.tags) {
      lines.push(`  - ${tag}`)
    }
  }
  lines.push("---")
  lines.push("")
  const title = entry.title?.trim() || `Journal Entry — ${longDate(entry.entry_date)}`
  lines.push(`# ${singleLine(title)}`)
  lines.push("")
  lines.push(entry.body.trimEnd())
  lines.push(...bodyFooter(JOURNAL_INDEX, entry.tags))
  lines.push("")

  const padded = entry.entry_number.toString().padStart(4, "0")
  return {
    path: `journal/journal-${entry.entry_date}-${padded}.md`,
    content: lines.join("\n"),
  }
}

/** Build a single reflection-response .md file. One file per response. */
export function buildReflectionMarkdown(r: ReflectionResponseForExport): ExportFile {
  const week = isoWeekString(r.reflection_year, r.reflection_week_number)

  const lines: string[] = []
  lines.push("---")
  // Use the reflection's week_start (Monday) — stable, no timezone drift from response timestamps.
  lines.push(`date: ${r.reflection_week_start}`)
  lines.push(`type: reflection`)
  lines.push(`week: ${week}`)
  lines.push(`prompt: ${yamlQuote(r.prompt_text)}`)
  if (r.mood !== null) lines.push(`mood: ${r.mood}`)
  if (r.tags.length > 0) {
    lines.push(`tags:`)
    for (const tag of r.tags) {
      lines.push(`  - ${tag}`)
    }
  }
  lines.push("---")
  lines.push("")
  lines.push(`# ${singleLine(r.prompt_text)}`)
  lines.push("")
  lines.push(r.body.trimEnd())
  lines.push(...bodyFooter(REFLECTION_INDEX, r.tags))
  lines.push("")

  const paddedPrompt = r.prompt_number.toString().padStart(3, "0")
  return {
    path: `reflections/reflection-${week}-P${paddedPrompt}.md`,
    content: lines.join("\n"),
  }
}
