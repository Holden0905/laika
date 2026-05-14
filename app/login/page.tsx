import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  CornerMarks,
  Crosshair,
  Label,
  Ruler,
  SectionHeader,
  StatusDot,
} from "@/components/ui/schematic"
import { BleedBackground } from "@/components/bleed-background"
import { signIn } from "./actions"

type SearchParams = Promise<{ error?: string; next?: string }>

function systemDate() {
  const now = new Date()
  const date = now
    .toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\//g, ".")
  const day = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
  return { date, day }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/")

  const { error, next } = await searchParams
  const { date, day } = systemDate()

  return (
    <div className="relative flex min-h-screen flex-col">
      <BleedBackground variant="impact" />
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-line-dim px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="hidden truncate sm:inline-block">
            <Label>ASSET ID: USR-UNVERIFIED</Label>
          </span>
          <span className="hidden h-[10px] w-px shrink-0 bg-line-ghost sm:inline-block" aria-hidden />
          <Label>STATUS: STANDBY</Label>
          <StatusDot active color="var(--amber)" />
        </div>
        <Label>
          <span className="sm:hidden">{date}</span>
          <span className="hidden sm:inline">
            {date} — {day}
          </span>
        </Label>
      </div>

      {/* Nav-style header */}
      <div className="flex items-center justify-between gap-3 border-b border-line-ghost px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="text-[22px] font-light uppercase tracking-[0.2em] text-line">
            ЛАЙКА
          </span>
          <span className="hidden text-[10px] tracking-[0.16em] text-amber-dim sm:inline">
            LAIKA
          </span>
          <span className="hidden text-[9px] tracking-[0.06em] text-amber-dim/50 sm:inline">
            v0.1
          </span>
        </div>
        <Label>Access Control</Label>
      </div>

      {/* Main */}
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        {/* Header block */}
        <div className="mb-8">
          <SectionHeader label="Authentication Cycle — Standby" className="mb-3" />
          <h1 className="text-[24px] font-light leading-snug tracking-[0.06em] text-line">
            PRESENT CREDENTIALS
          </h1>
          <p className="mt-3 text-[10.5px] leading-relaxed tracking-[0.04em] text-line-mid">
            Identify yourself to resume the transmission log. Session tokens persist on this
            instrument until manually terminated.
          </p>
          <div className="mt-4">
            <Ruler count={32} />
          </div>
        </div>

        {/* Form panel */}
        <div className="relative border border-line-dim p-5">
          <CornerMarks />
          <form action={signIn} className="flex flex-col gap-5">
            <input type="hidden" name="next" value={next ?? "/"} />

            <div className="flex items-center gap-2">
              <Crosshair />
              <Label>Field 01 // Operator Email</Label>
            </div>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              placeholder="operator@orbit"
              className="-mt-2 border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
            />

            <div className="flex items-center gap-2">
              <Crosshair />
              <Label>Field 02 // Passphrase</Label>
            </div>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="-mt-2 border-b border-line-dim bg-transparent px-0 py-2 text-[13px] tracking-[0.04em] text-line outline-none transition-colors placeholder:text-line-dim focus:border-phosphor"
            />

            {error ? (
              <div
                role="alert"
                className="relative flex items-start gap-2 border border-red/40 px-3 py-2"
                style={{ background: "var(--red-dim)" }}
              >
                <CornerMarks />
                <span
                  className="mt-[6px] inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ background: "var(--red)", boxShadow: "0 0 6px var(--red)" }}
                  aria-hidden
                />
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-red">
                    Auth Failure
                  </span>
                  <p className="text-[10.5px] leading-relaxed text-red">{error}</p>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              className="relative mt-2 flex items-center justify-between border border-line-dim px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-line transition-colors hover:border-line-mid focus:border-phosphor focus:outline-none"
            >
              <CornerMarks />
              <span>Authenticate</span>
              <span className="flex items-center gap-2 text-amber-dim">
                <span>{"//"}</span>
                <StatusDot active />
              </span>
            </button>
          </form>
        </div>

        {/* Annotation block */}
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-line-ghost pt-4">
          <div className="flex items-center justify-between">
            <Label>Mode</Label>
            <span className="text-[9px] tracking-[0.08em] text-line-mid">SINGLE-OPERATOR</span>
          </div>
          <div className="flex items-center justify-between">
            <Label>Build</Label>
            <span className="text-[9px] tracking-[0.08em] text-line-mid">0001</span>
          </div>
        </div>
      </main>

      {/* Footer status line */}
      <footer className="px-4 pb-6 sm:px-6">
        <Ruler count={60} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-y-1">
          <Label>LAIKA v0.1 — TRANSMITTING FROM ORBIT</Label>
          <div className="flex items-center gap-2">
            <StatusDot active color="var(--amber)" />
            <Label>STATUS · AWAITING AUTH</Label>
          </div>
        </div>
      </footer>
    </div>
  )
}
