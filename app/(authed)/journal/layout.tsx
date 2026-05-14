import { BleedBackground } from "@/components/bleed-background"

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BleedBackground variant="throne" />
      {children}
    </>
  )
}
