/**
 * Directives manifest builder — emits a single Obsidian-friendly markdown
 * checklist file. Unlike entries/responses (one file per artifact), directives
 * are batched into one checklist per extraction so they read as a unified to-do
 * list inside the vault.
 */

export type DirectiveForExport = {
  directive_number: number
  title: string
  description: string | null
  is_complete: boolean
  completed_at: string | null
  created_at: string
}

const DIRECTIVES_INDEX = "directives-index"

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function longDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function padDirectiveNumber(n: number): string {
  return n.toString().padStart(3, "0")
}

function singleLine(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

function checklistLine(d: DirectiveForExport): string {
  const box = d.is_complete ? "[x]" : "[ ]"
  const id = `D-${padDirectiveNumber(d.directive_number)}`
  let line = `- ${box} ${id} — ${singleLine(d.title)}`
  if (d.is_complete && d.completed_at) {
    const completedDate = d.completed_at.slice(0, 10)
    line += ` _(completed ${completedDate})_`
  }
  if (d.description && d.description.trim().length > 0) {
    // Indented sub-line so Obsidian keeps it grouped under the checkbox.
    line += `\n  - ${singleLine(d.description)}`
  }
  return line
}

export type DirectivesExportOptions = {
  includePending: boolean
  includeCompleted: boolean
}

export function buildDirectivesManifest(
  directives: DirectiveForExport[],
  options: DirectivesExportOptions
): { filename: string; content: string } {
  const today = isoDate(new Date())
  const pending = options.includePending
    ? directives.filter((d) => !d.is_complete)
    : []
  const completed = options.includeCompleted
    ? directives.filter((d) => d.is_complete)
    : []

  const lines: string[] = []
  lines.push("---")
  lines.push(`date: ${today}`)
  lines.push(`type: directives`)
  lines.push("---")
  lines.push("")
  lines.push(`# Directives Manifest — ${longDate(today)}`)
  lines.push("")

  if (options.includePending) {
    lines.push("## Active Queue")
    lines.push("")
    if (pending.length === 0) {
      lines.push("_No active directives in queue._")
    } else {
      for (const d of pending) lines.push(checklistLine(d))
    }
    lines.push("")
  }

  if (options.includeCompleted) {
    lines.push("## Archive")
    lines.push("")
    if (completed.length === 0) {
      lines.push("_No completed directives on file._")
    } else {
      for (const d of completed) lines.push(checklistLine(d))
    }
    lines.push("")
  }

  lines.push(`[[${DIRECTIVES_INDEX}]]`)
  lines.push("")

  return {
    filename: `directives-${today}.md`,
    content: lines.join("\n"),
  }
}
