/**
 * Home-page statistics helpers. Pure functions over already-fetched rows so the
 * server component can compose data without extra queries.
 */

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * Consecutive days with at least one entry, ending today (or yesterday — today
 * gets a grace pass since the day isn't over yet).
 *
 * @param entryDates  any set of YYYY-MM-DD strings; duplicates fine.
 * @param now         pass `new Date()` from the caller so tests can fix the clock.
 */
export function computeStreak(entryDates: Iterable<string>, now: Date = new Date()): number {
  const dates = new Set(entryDates)
  if (dates.size === 0) return 0

  const todayStr = localDateString(now)
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // If today has no entry yet, give it a grace pass and start from yesterday.
  if (!dates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (dates.has(localDateString(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * Averaged mood per day for the last 14 days (index 0 = 13 days ago, index 13 = today).
 * Null when the day had no entries with mood set.
 */
export function build14DayMoodArray(
  entries: Array<{ entry_date: string; mood: number | null }>,
  now: Date = new Date()
): Array<number | null> {
  const moodsByDate = new Map<string, number[]>()
  for (const e of entries) {
    if (e.mood == null) continue
    const arr = moodsByDate.get(e.entry_date) ?? []
    arr.push(e.mood)
    moodsByDate.set(e.entry_date, arr)
  }

  const out: Array<number | null> = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    d.setDate(d.getDate() - i)
    const moods = moodsByDate.get(localDateString(d))
    if (!moods || moods.length === 0) {
      out.push(null)
    } else {
      out.push(moods.reduce((a, b) => a + b, 0) / moods.length)
    }
  }
  return out
}

/** Average mood across all entries that have one set. Null when nobody has set a mood. */
export function averageMood(entries: Array<{ mood: number | null }>): number | null {
  const moods = entries.map((e) => e.mood).filter((m): m is number => m != null)
  if (moods.length === 0) return null
  return moods.reduce((a, b) => a + b, 0) / moods.length
}
