/**
 * ISO 8601 week utilities. All dates here are LOCAL dates — never round-trip
 * through UTC. Matches the CLAUDE.md gotcha: date columns must be parsed as local.
 *
 * Definitions:
 *   - ISO weeks start on Monday.
 *   - Week 1 of a year contains the first Thursday of that year (i.e., contains Jan 4).
 *   - "ISO year" can differ from calendar year near year boundaries
 *     (e.g., 2025-01-01 is a Wednesday → ISO week 1 of 2025 starts 2024-12-30).
 */

export type IsoWeek = {
  year: number
  week: number
  /** Monday of the week, as YYYY-MM-DD (local). */
  monday: string
  /** Canonical ISO week string, e.g. "2026-W20". */
  isoString: string
}

function localYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function dayOfWeekMondayBased(d: Date): number {
  // JS: Sun=0..Sat=6. ISO: Mon=0..Sun=6.
  return (d.getDay() + 6) % 7
}

/** ISO week number for a local Date. */
function isoWeekNumber(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  target.setDate(target.getDate() - dayOfWeekMondayBased(target) + 3)
  const firstThursdayTime = target.getTime()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }
  return 1 + Math.round((firstThursdayTime - target.getTime()) / 604_800_000)
}

/** ISO year (the year of the Thursday in the same ISO week). */
function isoWeekYear(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  target.setDate(target.getDate() - dayOfWeekMondayBased(target) + 3)
  return target.getFullYear()
}

/** Returns the Monday (LOCAL) of the ISO week given by (year, week). */
export function isoWeekToMonday(year: number, week: number): string {
  // Jan 4 is always in ISO week 1 of its ISO year.
  const jan4 = new Date(year, 0, 4)
  const jan4Mon = dayOfWeekMondayBased(jan4)
  const week1Monday = new Date(year, 0, 4 - jan4Mon)
  const target = new Date(week1Monday)
  target.setDate(week1Monday.getDate() + (week - 1) * 7)
  return localYYYYMMDD(target)
}

/** "2026-W20" → { year: 2026, week: 20 }, or null on malformed input. */
export function parseIsoWeek(str: string): { year: number; week: number } | null {
  const match = str.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  if (week < 1 || week > 53) return null
  return { year, week }
}

/** Builds the canonical "YYYY-Www" string. */
export function isoWeekString(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`
}

/** Today's ISO week. */
export function currentIsoWeek(): IsoWeek {
  const now = new Date()
  const year = isoWeekYear(now)
  const week = isoWeekNumber(now)
  return {
    year,
    week,
    monday: isoWeekToMonday(year, week),
    isoString: isoWeekString(year, week),
  }
}

/** Local Date → full IsoWeek record. */
export function dateToIsoWeek(date: Date): IsoWeek {
  const year = isoWeekYear(date)
  const week = isoWeekNumber(date)
  return {
    year,
    week,
    monday: isoWeekToMonday(year, week),
    isoString: isoWeekString(year, week),
  }
}

/** "2026-05-11" → "MAY 11 – 17, 2026". */
export function formatWeekRange(mondayStr: string): string {
  const [y, m, d] = mondayStr.split("-").map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(y, m - 1, d + 6)
  const startMonth = start.toLocaleDateString("en-US", { month: "long" }).toUpperCase()
  const endMonth = end.toLocaleDateString("en-US", { month: "long" }).toUpperCase()
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
}

/** "WEEK 20 — 2026". */
export function formatWeekLabel(year: number, week: number): string {
  return `WEEK ${String(week).padStart(2, "0")} — ${year}`
}
