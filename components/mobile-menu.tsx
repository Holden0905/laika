"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { signOut } from "@/app/login/actions"
import { CornerMarks, Ruler, StatusDot } from "@/components/ui/schematic"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV_ITEMS = [
  { name: "Journal", href: "/journal" },
  { name: "Reflections", href: "/reflections" },
  { name: "Prompts", href: "/prompts" },
  { name: "Satellites", href: "/satellites" },
  { name: "Export", href: "/export" },
]

/**
 * Hamburger trigger + full-screen drawer for narrow viewports. Rendered alongside
 * (not in place of) AppNav — the parent layout shows whichever is appropriate
 * via Tailwind responsive classes (md:hidden vs hidden md:flex).
 */
export function MobileMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  // Menu closes on each Link's onClick rather than via a pathname-change effect,
  // which keeps us inside react-hooks/set-state-in-effect rules.

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center border border-line-dim transition-colors hover:border-line-mid",
          className
        )}
      >
        <CornerMarks />
        <HamburgerIcon />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 flex flex-col bg-void"
        >
          {/* Drawer top bar */}
          <div className="flex items-center justify-between border-b border-line-dim px-6 py-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-baseline gap-3 transition-opacity hover:opacity-80"
            >
              <span className="text-[22px] font-light uppercase tracking-[0.2em] text-line">
                ЛАЙКА
              </span>
              <span className="text-[10px] tracking-[0.16em] text-amber-dim">LAIKA</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="relative flex h-10 w-10 items-center justify-center border border-line-dim transition-colors hover:border-line-mid"
            >
              <CornerMarks />
              <CloseIcon />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto px-6 py-6">
            <ul className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "relative flex items-center gap-4 border px-4 py-4 text-[12px] uppercase tracking-[0.18em] transition-colors",
                        active
                          ? "border-line-mid text-line"
                          : "border-line-dim text-amber-dim hover:border-line-mid hover:text-amber"
                      )}
                    >
                      <CornerMarks />
                      <StatusDot
                        active={active}
                        color={active ? "var(--phosphor)" : "var(--line-dim)"}
                      />
                      <span className="flex-1">{item.name}</span>
                      {active ? (
                        <span className="text-[9px] tracking-[0.14em] text-phosphor">
                          ACTIVE
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-line-ghost px-6 pb-6 pt-4">
            <Ruler count={30} />
            <div className="mt-4 flex flex-col gap-2">
              <ThemeToggle variant="row" />
              <form action={signOut}>
                <button
                  type="submit"
                  className="relative flex w-full items-center justify-between border border-line-dim px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-amber-dim transition-colors hover:border-amber-dim hover:text-amber"
                >
                  <CornerMarks />
                  <span>Terminate Session</span>
                  <StatusDot active color="var(--amber)" />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function HamburgerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1" />
      <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
