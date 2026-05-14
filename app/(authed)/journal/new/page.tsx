import { randomUUID } from "crypto"
import { redirect } from "next/navigation"
import { Ruler, SectionHeader } from "@/components/ui/schematic"
import { EntryForm } from "@/components/journal/entry-form"
import { createClient } from "@/lib/supabase/server"
import { createEntry } from "../actions"

type SearchParams = Promise<{ error?: string }>

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Pre-generate the entry_id server-side so the client can direct-upload photos
  // to {user_id}/{entry_id}/... before submitting the form. createEntry will use
  // this id as the row's primary key. A page refresh generates a new id and
  // orphans any previously uploaded files — acceptable for a personal app.
  const entryId = randomUUID()

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <SectionHeader label="New Transmission — Compose" className="mb-3" />
        <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
          INITIATE TRANSMISSION
        </h1>
        <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
          Capture the signal. Title and mood are optional; body is required. Tags will be
          normalized for Brozosphere export. Photos are direct-uploaded as you attach them.
        </p>
        <div className="mt-4">
          <Ruler count={32} />
        </div>
      </div>

      <EntryForm
        action={createEntry}
        error={error}
        submitLabel="Transmit Entry"
        photos={{
          entryId,
          userId: user.id,
          mode: "new",
        }}
      />
    </main>
  )
}
