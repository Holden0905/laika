"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const ITEMS: Array<{ name: string; href: string; live: boolean }> = [
  { name: "Journal", href: "/journal", live: true },
  { name: "Reflections", href: "/reflections", live: true },
  { name: "Prompts", href: "/prompts", live: true },
  { name: "Satellites", href: "/satellites", live: true },
  { name: "Export", href: "/export", live: true },
]

export function AppNav() {
  const pathname = usePathname()
  return (
    <ul className="flex items-center gap-5">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const base =
          "text-[9px] uppercase tracking-[0.14em] pb-[3px] border-b transition-colors"
        if (!item.live) {
          return (
            <li key={item.name}>
              <span
                className={cn(base, "border-transparent text-amber-dim/50 cursor-default")}
                aria-disabled
                title="Subsystem offline"
              >
                {item.name}
              </span>
            </li>
          )
        }
        return (
          <li key={item.name}>
            <Link
              href={item.href}
              className={cn(
                base,
                active
                  ? "border-phosphor text-line"
                  : "border-transparent text-amber-dim hover:text-line"
              )}
            >
              {item.name}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
