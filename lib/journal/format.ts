/** 47 → "0047". The schematic mockup pads to 4 digits. */
export function padEntryNumber(n: number) {
  return n.toString().padStart(4, "0")
}

/** "2026-05-13" → "05.13.2026". Parses as a plain date string, no Date round-trip. */
export function formatEntryDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-")
  return `${month}.${day}.${year}`
}

/** "2026-05-13" → "MAY 13, 2026". */
export function formatLongDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date
    .toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    .toUpperCase()
}

/** Today's date as YYYY-MM-DD in the runtime's local timezone. */
export function todayDateString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Normalize a raw tag string for Obsidian wiki-link compatibility:
 *   " Writing Skills " → "writing-skills"
 * Strips non-alphanumeric except hyphens, collapses repeats, trims hyphens.
 * Matches the DB CHECK constraint on tags.name.
 */
export function normalizeTag(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** "Writing, Recovery, atomic-thoughts" → ["writing", "recovery", "atomic-thoughts"] (deduped). */
export function parseTags(raw: string): string[] {
  const out: string[] = []
  for (const piece of raw.split(",")) {
    const t = normalizeTag(piece)
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}
