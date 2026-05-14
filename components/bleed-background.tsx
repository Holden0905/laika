import Image from "next/image"

/**
 * Subtle full-viewport decorative backdrop. Renders both dark and light variants
 * of the chosen schematic illustration; CSS picks the active one via dark:/light
 * visibility classes (the dark variant is shown when html has the `dark` class).
 *
 * Positioned fixed so it stays put during scroll. pointer-events-none so it never
 * intercepts clicks. Aria-hidden so screen readers skip it.
 */

const VARIANTS = {
  impact: {
    dark: "/bleed/satellite-impact.png",
    light: "/bleed/satellite-impact-light.png",
    alt: "Industrial satellite impact diagnostic illustration",
  },
  throne: {
    dark: "/bleed/laika-throne.png",
    light: "/bleed/laika-throne-light.png",
    alt: "Laika on command throne schematic illustration",
  },
} as const

export type BleedVariant = keyof typeof VARIANTS

export function BleedBackground({ variant }: { variant: BleedVariant }) {
  const sources = VARIANTS[variant]
  // Source images are 1536 × 1024; preserving that ratio for next/image.
  const W = 1536
  const H = 1024

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Light variant — shown when html has no `dark` class. */}
      <Image
        src={sources.light}
        alt=""
        width={W}
        height={H}
        priority={false}
        sizes="(max-width: 768px) 90vw, 70vw"
        className="absolute left-[-12%] bottom-[-10%] h-auto w-[90vw] max-w-[820px] opacity-[0.18] dark:hidden md:w-[70vw]"
      />
      {/* Dark variant — shown when html has `dark`. */}
      <Image
        src={sources.dark}
        alt=""
        width={W}
        height={H}
        priority={false}
        sizes="(max-width: 768px) 90vw, 70vw"
        className="absolute left-[-12%] bottom-[-10%] hidden h-auto w-[90vw] max-w-[820px] opacity-[0.18] dark:block md:w-[70vw]"
      />
    </div>
  )
}
