import {
  CornerMarks,
  Crosshair,
  Label,
  Ruler,
  StatusDot,
} from "@/components/ui/schematic"

/**
 * Offline fallback served by the service worker when a navigation request fails.
 * Pure-static, no auth, no network — caches cleanly and renders in either theme.
 */
export const metadata = {
  title: "ЛАЙКА — Transmission Lost",
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="flex w-full max-w-[480px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <StatusDot active color="var(--red)" />
            <span className="text-[22px] font-light tracking-[0.2em] text-line">
              ЛАЙКА
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Crosshair />
            <Label>Signal Lost · Offline Mode</Label>
          </div>
        </header>

        <div className="relative border border-line-dim p-6">
          <CornerMarks />
          <h1 className="text-[20px] font-light leading-snug tracking-[0.06em] text-line">
            TRANSMISSION LOST
          </h1>
          <p className="mt-3 text-[11px] leading-relaxed tracking-[0.04em] text-line-mid">
            No connection to ground station detected. The instrument cannot reach Supabase to
            sync your transmissions. Restore network and reload — your local session will resume.
          </p>
          <div className="mt-5">
            <Ruler count={28} />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.14em]">
            <Label>Auto-Retry On Reconnect</Label>
            <div className="flex items-center gap-2">
              <StatusDot active color="var(--amber)" />
              <span className="text-amber">Standby</span>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-line-ghost pt-4">
          <Label>LAIKA v0.1 — TRANSMITTING FROM ORBIT</Label>
        </footer>
      </div>
    </main>
  )
}
