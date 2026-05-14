import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppNav } from "@/components/app-nav"
import { MobileMenu } from "@/components/mobile-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { Label, Ruler, StatusDot } from "@/components/ui/schematic"
import { signOut } from "@/app/login/actions"

function systemDate() {
  const now = new Date()
  const date = now
    .toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\//g, ".")
  const day = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
  return { date, day }
}

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle()

  const handle = (profile?.display_name ?? user.email?.split("@")[0] ?? "operator").toUpperCase()
  const assetId = `USR-${handle.replace(/[^A-Z0-9]/g, "")}-01`
  const { date, day } = systemDate()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top status bar */}
      <div className="flex items-center justify-between gap-3 border-b border-line-dim px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {/* ASSET ID + divider hidden on mobile to keep the bar single-line. */}
          <span className="hidden truncate sm:inline-block">
            <Label>ASSET ID: {assetId}</Label>
          </span>
          <span className="hidden h-[10px] w-px shrink-0 bg-line-ghost sm:inline-block" aria-hidden />
          <Label>STATUS: ONLINE</Label>
          <StatusDot active />
        </div>
        <Label>
          {/* Day-of-week trimmed on mobile to keep the right side compact. */}
          <span className="sm:hidden">{date}</span>
          <span className="hidden sm:inline">
            {date} — {day}
          </span>
        </Label>
      </div>

      {/* Nav */}
      <nav className="flex items-center justify-between gap-3 border-b border-line-ghost px-4 py-4 sm:px-6">
        <Link
          href="/"
          aria-label="Return to mission home"
          className="group flex min-w-0 items-baseline gap-3 transition-opacity hover:opacity-80"
        >
          <span className="text-[22px] font-light uppercase tracking-[0.2em] text-line">
            ЛАЙКА
          </span>
          <span className="hidden text-[10px] tracking-[0.16em] text-amber-dim transition-colors group-hover:text-amber sm:inline">
            LAIKA
          </span>
          <span className="hidden text-[9px] tracking-[0.06em] text-amber-dim/50 sm:inline">
            v0.1
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex lg:gap-8">
          <AppNav />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-2 border border-transparent px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-line-ghost hover:text-amber"
              >
                <span>Terminate</span>
                <StatusDot active color="var(--amber)" />
              </button>
            </form>
          </div>
        </div>

        {/* Mobile menu */}
        <MobileMenu className="md:hidden" />
      </nav>

      {/* Page content */}
      <div className="flex-1">{children}</div>

      {/* Footer */}
      <footer className="px-4 pb-6 pt-10 sm:px-6">
        <Ruler count={60} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-y-1">
          <Label>LAIKA v0.1 — TRANSMITTING FROM ORBIT</Label>
          <div className="flex items-center gap-2">
            <StatusDot active />
            <Label>All Systems Nominal</Label>
          </div>
        </div>
      </footer>
    </div>
  )
}
