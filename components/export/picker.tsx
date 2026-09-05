"use client"

import { useMemo, useState } from "react"
import {
  CheckIndicator,
  CornerMarks,
  Crosshair,
  Label,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import { formatEntryDate, padEntryNumber } from "@/lib/journal/format"
import {
  formatWeekRange,
  isoWeekString,
} from "@/lib/reflections/format"

export type PickerEntry = {
  id: string
  entry_number: number
  title: string | null
  body: string
  entry_date: string
  mood: number | null
  exported_at: string | null
}

export type PickerTrajectory = {
  id: string
  trajectory_number: number
  title: string
  summary: string | null
  status: string
  log_count: number
  directive_count: number
  exported_at: string | null
}

export type PickerResponse = {
  id: string
  prompt_text: string
  prompt_number: number
  body: string
  reflection_year: number
  reflection_week_number: number
  reflection_week_start: string
  exported_at: string | null
}

type Props = {
  entries: PickerEntry[]
  responses: PickerResponse[]
  trajectories: PickerTrajectory[]
}

function excerpt(body: string, max = 140) {
  const flat = body.replace(/\s+/g, " ").trim()
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}

function formatExportedDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${m}.${day}.${y}`
}

export function ExportPicker({ entries, responses, trajectories }: Props) {
  // Default: only un-exported items selected. Matches the spec — first thing
  // Brian sees is the new-since-last-export set, ready to download.
  const defaultEntries = useMemo(
    () => new Set(entries.filter((e) => !e.exported_at).map((e) => e.id)),
    [entries]
  )
  const defaultResponses = useMemo(
    () => new Set(responses.filter((r) => !r.exported_at).map((r) => r.id)),
    [responses]
  )
  const defaultTrajectories = useMemo(
    () => new Set(trajectories.filter((t) => !t.exported_at).map((t) => t.id)),
    [trajectories]
  )

  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(defaultEntries)
  const [selectedResponses, setSelectedResponses] =
    useState<Set<string>>(defaultResponses)
  const [selectedTrajectories, setSelectedTrajectories] =
    useState<Set<string>>(defaultTrajectories)

  const totalSelected =
    selectedEntries.size + selectedResponses.size + selectedTrajectories.size
  const totalAvailable = entries.length + responses.length + trajectories.length

  function toggleEntry(id: string) {
    setSelectedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleResponse(id: string) {
    setSelectedResponses((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleTrajectory(id: string) {
    setSelectedTrajectories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedEntries(new Set(entries.map((e) => e.id)))
    setSelectedResponses(new Set(responses.map((r) => r.id)))
    setSelectedTrajectories(new Set(trajectories.map((t) => t.id)))
  }
  function selectNewOnly() {
    setSelectedEntries(new Set(entries.filter((e) => !e.exported_at).map((e) => e.id)))
    setSelectedResponses(
      new Set(responses.filter((r) => !r.exported_at).map((r) => r.id))
    )
    setSelectedTrajectories(
      new Set(trajectories.filter((t) => !t.exported_at).map((t) => t.id))
    )
  }
  function clearAll() {
    setSelectedEntries(new Set())
    setSelectedResponses(new Set())
    setSelectedTrajectories(new Set())
  }

  // Group reflections by week for readability — schematic frames each cycle.
  const responsesByWeek = useMemo(() => {
    const groups = new Map<
      string,
      {
        year: number
        week: number
        week_start: string
        items: PickerResponse[]
      }
    >()
    for (const r of responses) {
      const key = isoWeekString(r.reflection_year, r.reflection_week_number)
      const bucket = groups.get(key) ?? {
        year: r.reflection_year,
        week: r.reflection_week_number,
        week_start: r.reflection_week_start,
        items: [] as PickerResponse[],
      }
      bucket.items.push(r)
      groups.set(key, bucket)
    }
    // Newest week first to mirror the journal list.
    return Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, group]) => ({ key, ...group }))
  }, [responses])

  const downloadKind =
    totalSelected === 0 ? "—" : totalSelected === 1 ? ".MD" : ".ZIP"
  const submitDisabled = totalSelected === 0

  return (
    <form action="/api/export" method="POST" className="flex flex-col gap-8">
      {/* Hidden inputs carry the selection. Browsers POST repeated names as a list. */}
      {Array.from(selectedEntries).map((id) => (
        <input key={`e-${id}`} type="hidden" name="entryIds" value={id} />
      ))}
      {Array.from(selectedResponses).map((id) => (
        <input key={`r-${id}`} type="hidden" name="responseIds" value={id} />
      ))}
      {Array.from(selectedTrajectories).map((id) => (
        <input key={`t-${id}`} type="hidden" name="trajectoryIds" value={id} />
      ))}

      {/* Action bar — sticky on scroll so shortcuts and submit stay reachable. */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-line-dim bg-void px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <ShortcutButton onClick={selectAll} label="Select All" accent="var(--line)" />
            <ShortcutButton
              onClick={selectNewOnly}
              label="Select New Only"
              accent="var(--phosphor)"
            />
            <ShortcutButton onClick={clearAll} label="Clear" accent="var(--line-dim)" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] uppercase tracking-[0.14em] text-amber-dim">
              Selected
            </span>
            <span className="text-[12px] tracking-[0.04em] text-line">
              {totalSelected} / {totalAvailable}
            </span>
            <button
              type="submit"
              disabled={submitDisabled}
              className="relative flex items-center gap-2 border border-line-dim px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-dim"
            >
              <CornerMarks />
              <span>Extract {downloadKind}</span>
              <StatusDot
                active={!submitDisabled}
                color={submitDisabled ? "var(--line-dim)" : "var(--phosphor)"}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Journal section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <SectionHeader
            label={`Journal Entries — ${entries.length} on file`}
          />
          <span className="ml-3 shrink-0 text-[9px] uppercase tracking-[0.14em] text-amber-dim">
            {selectedEntries.size} selected
          </span>
        </div>
        {entries.length === 0 ? (
          <EmptyState>No transmissions logged yet.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                checked={selectedEntries.has(entry.id)}
                onToggle={() => toggleEntry(entry.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Reflection section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <SectionHeader
            label={`Reflection Responses — ${responses.length} on file`}
          />
          <span className="ml-3 shrink-0 text-[9px] uppercase tracking-[0.14em] text-amber-dim">
            {selectedResponses.size} selected
          </span>
        </div>
        {responses.length === 0 ? (
          <EmptyState>No reflection responses recorded yet.</EmptyState>
        ) : (
          <div className="flex flex-col gap-6">
            {responsesByWeek.map((group) => (
              <div key={group.key}>
                <div className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-amber-dim">
                  <Crosshair />
                  <span>
                    {group.key} — {formatWeekRange(group.week_start)}
                  </span>
                  <span className="ml-1 h-px flex-1 bg-line-ghost" aria-hidden />
                </div>
                <ul className="flex flex-col gap-2">
                  {group.items.map((r) => (
                    <ResponseRow
                      key={r.id}
                      response={r}
                      checked={selectedResponses.has(r.id)}
                      onToggle={() => toggleResponse(r.id)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trajectory section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <SectionHeader
            label={`Trajectories — ${trajectories.length} on file`}
          />
          <span className="ml-3 shrink-0 text-[9px] uppercase tracking-[0.14em] text-amber-dim">
            {selectedTrajectories.size} selected
          </span>
        </div>
        {trajectories.length === 0 ? (
          <EmptyState>No trajectories seeded yet.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {trajectories.map((t) => (
              <TrajectoryPickerRow
                key={t.id}
                trajectory={t}
                checked={selectedTrajectories.has(t.id)}
                onToggle={() => toggleTrajectory(t.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </form>
  )
}

function TrajectoryPickerRow({
  trajectory,
  checked,
  onToggle,
}: {
  trajectory: PickerTrajectory
  checked: boolean
  onToggle: () => void
}) {
  const padded = trajectory.trajectory_number.toString().padStart(3, "0")
  return (
    <li>
      <label
        className="group relative flex cursor-pointer items-start gap-3 border border-line-dim px-4 py-3 transition-colors hover:border-line-mid"
        style={checked ? { borderColor: "rgba(58,189,111,0.45)" } : undefined}
      >
        <CornerMarks />
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onToggle}
        />
        <span className="mt-[2px]">
          <CheckIndicator checked={checked} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-amber-dim">
                T-{padded}
              </span>
              <span className="text-[9px] tracking-[0.08em] text-amber-dim">
                {trajectory.status} · {trajectory.log_count} LOG ·{" "}
                {trajectory.directive_count} DIR
              </span>
            </div>
            {trajectory.exported_at ? (
              <ExportedBadge exportedAt={trajectory.exported_at} />
            ) : null}
          </div>
          <h3 className="mt-1 text-[13px] font-semibold leading-snug tracking-[0.04em] text-line">
            {trajectory.title}
          </h3>
          {trajectory.summary ? (
            <p className="mt-1 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
              {excerpt(trajectory.summary)}
            </p>
          ) : null}
        </div>
      </label>
    </li>
  )
}

function ShortcutButton({
  onClick,
  label,
  accent,
}: {
  onClick: () => void
  label: string
  accent: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative border border-line-dim px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid"
    >
      <CornerMarks />
      <span className="inline-flex items-center gap-2">
        <span
          className="inline-block h-[5px] w-[5px] rounded-full"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}33` }}
          aria-hidden
        />
        {label}
      </span>
    </button>
  )
}

function ExportedBadge({ exportedAt }: { exportedAt: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 border px-1.5 py-[2px] text-[8px] uppercase tracking-[0.14em]"
      style={{
        color: "var(--phosphor)",
        borderColor: "var(--phosphor-dim, rgba(58,189,111,0.35))",
        background: "var(--phosphor-dim)",
      }}
    >
      <span
        className="inline-block h-[4px] w-[4px] rounded-full"
        style={{ background: "var(--phosphor)" }}
        aria-hidden
      />
      Exported · {formatExportedDate(exportedAt)}
    </span>
  )
}

function EntryRow({
  entry,
  checked,
  onToggle,
}: {
  entry: PickerEntry
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <label
        className="group relative flex cursor-pointer items-start gap-3 border border-line-dim px-4 py-3 transition-colors hover:border-line-mid"
        style={
          checked
            ? { borderColor: "rgba(58,189,111,0.45)" }
            : undefined
        }
      >
        <CornerMarks />
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onToggle}
        />
        <span className="mt-[2px]">
          <CheckIndicator checked={checked} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-amber-dim">
                ENTRY {padEntryNumber(entry.entry_number)}
              </span>
              <span className="text-[9px] tracking-[0.08em] text-amber-dim">
                {formatEntryDate(entry.entry_date)}
              </span>
            </div>
            {entry.exported_at ? <ExportedBadge exportedAt={entry.exported_at} /> : null}
          </div>
          <h3 className="mt-1 truncate text-[13px] font-semibold tracking-[0.04em] text-line">
            {entry.title?.trim() || "UNTITLED TRANSMISSION"}
          </h3>
          {entry.body ? (
            <p className="mt-1 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
              {excerpt(entry.body)}
            </p>
          ) : null}
        </div>
      </label>
    </li>
  )
}

function ResponseRow({
  response,
  checked,
  onToggle,
}: {
  response: PickerResponse
  checked: boolean
  onToggle: () => void
}) {
  const paddedPrompt = response.prompt_number.toString().padStart(3, "0")
  return (
    <li>
      <label
        className="group relative flex cursor-pointer items-start gap-3 border border-line-dim px-4 py-3 transition-colors hover:border-line-mid"
        style={
          checked
            ? { borderColor: "rgba(58,189,111,0.45)" }
            : undefined
        }
      >
        <CornerMarks />
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onToggle}
        />
        <span className="mt-[2px]">
          <CheckIndicator checked={checked} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[9px] uppercase tracking-[0.12em] text-amber-dim">
              P-{paddedPrompt}
            </span>
            {response.exported_at ? (
              <ExportedBadge exportedAt={response.exported_at} />
            ) : null}
          </div>
          <h3 className="mt-1 text-[13px] font-semibold leading-snug tracking-[0.04em] text-line">
            {response.prompt_text}
          </h3>
          {response.body ? (
            <p className="mt-1 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
              {excerpt(response.body)}
            </p>
          ) : null}
        </div>
      </label>
    </li>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative border border-line-dim px-4 py-6 text-center text-[10.5px] tracking-[0.04em] text-line-mid">
      <CornerMarks />
      <Label>{children}</Label>
    </div>
  )
}
