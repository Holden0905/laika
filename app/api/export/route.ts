import { NextRequest, NextResponse } from "next/server"
import { zipSync, strToU8 } from "fflate"
import { createClient } from "@/lib/supabase/server"
import {
  fetchJournalEntriesForExport,
  fetchReflectionResponsesForExport,
} from "@/lib/export/queries"
import {
  buildJournalMarkdown,
  buildReflectionMarkdown,
  type ExportFile,
} from "@/lib/export/markdown"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const entryIds = new Set(formData.getAll("entryIds").map((v) => String(v)))
  const responseIds = new Set(formData.getAll("responseIds").map((v) => String(v)))

  if (entryIds.size === 0 && responseIds.size === 0) {
    return NextResponse.redirect(
      new URL("/export?error=Select+at+least+one+artifact+to+extract.", request.url),
      { status: 303 }
    )
  }

  try {
    const files: ExportFile[] = []
    const exportedEntryIds: string[] = []
    const exportedResponseIds: string[] = []

    if (entryIds.size > 0) {
      const entries = await fetchJournalEntriesForExport(supabase)
      for (const e of entries) {
        if (!entryIds.has(e.id)) continue
        files.push(buildJournalMarkdown(e))
        exportedEntryIds.push(e.id)
      }
    }
    if (responseIds.size > 0) {
      const responses = await fetchReflectionResponsesForExport(supabase)
      for (const r of responses) {
        if (!responseIds.has(r.response_id)) continue
        files.push(buildReflectionMarkdown(r))
        exportedResponseIds.push(r.response_id)
      }
    }

    if (files.length === 0) {
      return NextResponse.redirect(
        new URL("/export?error=Selected+artifacts+were+not+found.", request.url),
        { status: 303 }
      )
    }

    // Log bulk header for the home-page diagnostics count, and the per-artifact
    // stamps the picker reads. Failure here is non-fatal — the user still gets
    // their files; the next picker render just won't badge these as exported.
    const scope =
      exportedEntryIds.length > 0 && exportedResponseIds.length > 0
        ? "all"
        : exportedEntryIds.length > 0
          ? "journal"
          : "reflections"

    await Promise.all([
      supabase
        .from("exports")
        .insert({ user_id: user.id, scope, file_count: files.length }),
      supabase.from("exports_log").insert([
        ...exportedEntryIds.map((id) => ({
          user_id: user.id,
          artifact_type: "entry",
          artifact_id: id,
        })),
        ...exportedResponseIds.map((id) => ({
          user_id: user.id,
          artifact_type: "response",
          artifact_id: id,
        })),
      ]),
    ])

    const datestamp = new Date().toISOString().slice(0, 10)

    if (files.length === 1) {
      const file = files[0]
      const filename = file.path.split("/").pop() ?? `laika-export-${datestamp}.md`
      return new NextResponse(file.content, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    const zipPayload: Record<string, Uint8Array> = {}
    for (const f of files) {
      zipPayload[f.path] = strToU8(f.content)
    }
    const zipped = zipSync(zipPayload, { level: 6 })
    const zipName = `laika-export-${datestamp}.zip`

    return new NextResponse(new Blob([new Uint8Array(zipped)], { type: "application/zip" }), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed."
    return NextResponse.redirect(
      new URL(`/export?error=${encodeURIComponent(message)}`, request.url),
      { status: 303 }
    )
  }
}
