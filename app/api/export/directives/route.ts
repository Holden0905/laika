import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  buildDirectivesManifest,
  type DirectiveForExport,
} from "@/lib/export/directives"

type DirectiveRecord = {
  title: string
  description: string | null
  is_complete: boolean
  completed_at: string | null
  created_at: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 })
  }

  const includeParams = request.nextUrl.searchParams.getAll("include")
  const includePending = includeParams.includes("pending")
  const includeCompleted = includeParams.includes("completed")

  if (!includePending && !includeCompleted) {
    return NextResponse.redirect(
      new URL(
        "/directives?error=Select+pending,+completed,+or+both+to+extract.",
        request.url
      ),
      { status: 303 }
    )
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("title, description, is_complete, completed_at, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.redirect(
      new URL(`/directives?error=${encodeURIComponent(error.message)}`, request.url),
      { status: 303 }
    )
  }

  const records = (data as DirectiveRecord[] | null) ?? []
  const directives: DirectiveForExport[] = records.map((d, i) => ({
    directive_number: i + 1,
    title: d.title,
    description: d.description,
    is_complete: d.is_complete,
    completed_at: d.completed_at,
    created_at: d.created_at,
  }))

  const { filename, content } = buildDirectivesManifest(directives, {
    includePending,
    includeCompleted,
  })

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
