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

const VALID_SCOPES = new Set(["all", "journal", "reflections"])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const scope = String(formData.get("scope") ?? "all")
  if (!VALID_SCOPES.has(scope)) {
    return NextResponse.json({ error: "Invalid scope." }, { status: 400 })
  }

  try {
    const files: ExportFile[] = []

    if (scope === "all" || scope === "journal") {
      const entries = await fetchJournalEntriesForExport(supabase)
      for (const e of entries) files.push(buildJournalMarkdown(e))
    }
    if (scope === "all" || scope === "reflections") {
      const responses = await fetchReflectionResponsesForExport(supabase)
      for (const r of responses) files.push(buildReflectionMarkdown(r))
    }

    if (files.length === 0) {
      return NextResponse.redirect(
        new URL("/export?error=No+data+to+export+for+this+scope.", request.url),
        { status: 303 }
      )
    }

    // Log this export. Failure to log shouldn't fail the download — diagnostics
    // can be slightly stale rather than blocking the user from getting their files.
    await supabase
      .from("exports")
      .insert({ user_id: user.id, scope, file_count: files.length })

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

    // Multi-file: zip with subdirectory structure baked into the file.path.
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
