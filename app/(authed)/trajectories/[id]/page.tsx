import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  CheckIndicator,
  CornerMarks,
  Ruler,
  SectionHeader,
} from "@/components/ui/schematic"
import { TagPill } from "@/components/journal/tag-pill"
import { StatusPill } from "@/components/trajectories/status-pill"
import { StatusControl } from "@/components/trajectories/status-control"
import { AddLogForm } from "@/components/trajectories/add-log-form"
import { AttachDirectiveForm } from "@/components/trajectories/attach-directive-form"
import { CopyContextButton } from "@/components/trajectories/copy-context-button"
import { DictationButton } from "@/components/ui/dictation-button"
import { DangerActionButton } from "@/components/trajectories/danger-action-button"
import { VaporizeButton } from "@/components/trajectories/vaporize-button"
import { updateTrajectoryDetails } from "@/app/(authed)/trajectories/actions"
import { buildTrajectoryMarkdown } from "@/lib/export/markdown"
import { fetchTrajectoryBundle, toExportShape } from "@/lib/trajectories/queries"
import {
  formatContactAge,
  formatShortStamp,
  isStaleContact,
  localDateString,
  padTrajectoryNumber,
} from "@/lib/trajectories/format"

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ error?: string }>

export default async function TrajectoryDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const bundle = await fetchTrajectoryBundle(supabase)
  const trajectory = bundle.trajectories.find((t) => t.id === id)
  if (!trajectory) notFound()

  const number = bundle.numberById.get(trajectory.id) ?? 0
  // Stored oldest-first; the page reads newest-first.
  const log = [...(bundle.logByTrajectory.get(trajectory.id) ?? [])].reverse()
  const directives = bundle.directivesByTrajectory.get(trajectory.id) ?? []
  const stale = isStaleContact(trajectory.status, trajectory.last_contact_at)

  // Same builder the export uses, so COPY CONTEXT and the .md file agree byte for byte.
  const markdown = buildTrajectoryMarkdown(toExportShape(bundle, trajectory)).content

  return (
    <main className="mx-auto w-full max-w-[940px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <Link
          href="/trajectories"
          className="text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:text-amber"
        >
          ← All Trajectories
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="relative mb-6 flex items-start gap-2 border border-red/40 px-3 py-2"
          style={{ background: "var(--red-dim)" }}
        >
          <CornerMarks />
          <span
            className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
            style={{ background: "var(--red)" }}
            aria-hidden
          />
          <p className="text-[10.5px] leading-relaxed text-red">{error}</p>
        </div>
      ) : null}

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeader
          label={`Trajectory T-${padTrajectoryNumber(number)} — Vector Profile`}
          className="mb-3"
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[9px] tracking-[0.12em] text-amber-dim">
            T-{padTrajectoryNumber(number)}
          </span>
          <StatusPill status={trajectory.status} />
          <span
            className="text-[9px] tracking-[0.08em]"
            style={{ color: stale ? "var(--red)" : "var(--amber-dim)" }}
            title={stale ? "No contact in over 30 days" : undefined}
          >
            LAST CONTACT {formatContactAge(trajectory.last_contact_at)}
          </span>
          <span className="text-[9px] tracking-[0.08em] text-amber-dim">
            SEEDED {formatShortStamp(trajectory.created_at)}
          </span>
        </div>
        <h1 className="mt-3 text-[20px] font-light leading-snug tracking-[0.04em] text-line sm:text-[24px]">
          {trajectory.title}
        </h1>
        {trajectory.summary ? (
          <p className="mt-3 max-w-[70ch] text-[11.5px] leading-relaxed tracking-[0.02em] text-line-mid">
            {trajectory.summary}
          </p>
        ) : null}
        {trajectory.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-[6px]">
            {trajectory.tags.map((t) => (
              <TagPill key={t} name={t} />
            ))}
          </div>
        ) : null}
        <div className="mt-5">
          <StatusControl trajectoryId={trajectory.id} status={trajectory.status} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <CopyContextButton markdown={markdown} />
          <span className="text-[9px] tracking-[0.14em] text-amber-dim">
            {log.length} LOG {log.length === 1 ? "ENTRY" : "ENTRIES"} · {directives.length}{" "}
            {directives.length === 1 ? "DIRECTIVE" : "DIRECTIVES"}
          </span>
        </div>
        <div className="mt-5">
          <Ruler count={40} />
        </div>
      </div>

      {/* ─── Edit details ────────────────────────────────────────────────── */}
      <details className="group mb-10">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:text-amber">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>
            ▸
          </span>
          <span>Edit Vector Profile — Title, Summary, Tags</span>
          <span className="ml-1 h-px flex-1 bg-line-ghost" aria-hidden />
        </summary>
        <form
          action={updateTrajectoryDetails}
          className="relative mt-4 flex flex-col gap-4 border border-line-dim p-5"
        >
          <CornerMarks />
          <input type="hidden" name="trajectory_id" value={trajectory.id} />
          <label className="flex flex-col gap-2">
            <span className="text-[9px] uppercase tracking-[0.14em] text-amber-dim">
              Title
            </span>
            <input
              name="title"
              type="text"
              required
              maxLength={300}
              defaultValue={trajectory.title}
              className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors focus:border-phosphor"
            />
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex min-h-[24px] items-center gap-2">
              <label
                htmlFor="trajectory-summary"
                className="text-[9px] uppercase tracking-[0.14em] text-amber-dim"
              >
                Summary
              </label>
              <div className="ml-auto">
                <DictationButton
                  targetId="trajectory-summary"
                  fieldLabel="the trajectory summary"
                />
              </div>
            </div>
            <textarea
              id="trajectory-summary"
              name="summary"
              rows={2}
              maxLength={500}
              defaultValue={trajectory.summary ?? ""}
              className="resize-none border border-line-ghost bg-transparent p-2 text-[11px] leading-relaxed tracking-[0.02em] text-line-mid outline-none transition-colors focus:border-line-dim"
            />
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-[9px] uppercase tracking-[0.14em] text-amber-dim">
              Tags — comma separated, normalized to lowercase-hyphenated
            </span>
            <input
              name="tags"
              type="text"
              defaultValue={trajectory.tags.join(", ")}
              placeholder="writing, recovery, long-game"
              className="border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
            />
          </label>
          <button
            type="submit"
            className="relative flex items-center justify-between border border-line-dim px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
          >
            <CornerMarks />
            <span>Commit Profile</span>
            <span className="text-amber-dim">{"//"}</span>
          </button>
        </form>
      </details>

      {/* ─── Log ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeader
          label={`Contact Log — ${log.length} ${log.length === 1 ? "Entry" : "Entries"}`}
          className="mb-4"
        />
        <div className="mb-6">
          <AddLogForm trajectoryId={trajectory.id} />
        </div>
        {log.length === 0 ? (
          <div className="relative border border-line-dim px-6 py-10 text-center">
            <CornerMarks />
            <p className="text-[11px] uppercase tracking-[0.14em] text-amber-dim">
              No Contact Logged
            </p>
            <p className="mt-3 text-[11px] tracking-[0.04em] text-line-mid">
              The log is empty. Append the first entry above to start the accretion record.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {log.map((entry) => (
              <li key={entry.id} className="relative border border-line-dim px-4 py-3">
                <CornerMarks />
                <div className="flex items-baseline gap-2">
                  <span className="text-[9px] tracking-[0.12em] text-amber">
                    {localDateString(entry.created_at)}
                  </span>
                  <span className="h-px flex-1 bg-line-ghost" aria-hidden />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed tracking-[0.02em] text-line-mid">
                  {entry.body}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ─── Attached directives ─────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeader
          label={`Attached Directives — ${directives.length} Queued`}
          className="mb-4"
        />
        <div className="mb-4">
          <AttachDirectiveForm trajectoryId={trajectory.id} />
        </div>
        {directives.length === 0 ? (
          <p className="text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
            No directives attached. Queue one above when this vector needs a concrete step —
            it will appear in the main manifest too.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {directives.map((d) => (
              <li
                key={d.id}
                className="relative flex items-start gap-3 border border-line-dim px-4 py-3"
              >
                <CornerMarks />
                <CheckIndicator checked={d.is_complete} className="mt-[2px]" />
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] tracking-[0.12em] text-amber-dim">
                    D-{d.directive_number.toString().padStart(3, "0")}
                  </span>
                  <p
                    className={
                      "mt-1 text-[12px] leading-relaxed tracking-[0.02em] " +
                      (d.is_complete
                        ? "text-line-mid line-through decoration-phosphor/60 decoration-1"
                        : "text-line")
                    }
                  >
                    {d.title}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end">
          <Link
            href="/directives"
            className="text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:text-amber"
          >
            Open Manifest →
          </Link>
        </div>
      </section>

      {/* ─── Terminal actions ────────────────────────────────────────────── */}
      <section>
        <SectionHeader label="Terminal Actions" className="mb-4" />
        <div className="relative border border-line-dim p-5">
          <CornerMarks />
          <p className="mb-4 text-[10.5px] leading-relaxed tracking-[0.02em] text-line-mid">
            <span className="text-amber">Abandon</span> marks the vector ABANDONED — it stays
            readable and exportable in the archive.{" "}
            <span className="text-amber">Archive</span> soft-deletes it: the row and its log
            are preserved but it drops off every list.{" "}
            <span className="text-red">Vaporize</span> is the only one that destroys anything —
            the trajectory and its entire log are erased from the database, permanently.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {trajectory.status === "ABANDONED" ? null : (
              <DangerActionButton trajectoryId={trajectory.id} variant="abandon" />
            )}
            <DangerActionButton trajectoryId={trajectory.id} variant="archive" />
          </div>
          <div className="mt-4 border-t border-line-ghost pt-4">
            <VaporizeButton
              trajectoryId={trajectory.id}
              title={trajectory.title}
              logCount={log.length}
              directiveCount={directives.length}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
