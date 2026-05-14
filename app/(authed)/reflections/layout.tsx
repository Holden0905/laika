import { BleedBackground } from "@/components/bleed-background"

export default function ReflectionsLayout({
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
