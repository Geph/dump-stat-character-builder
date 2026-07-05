import { CompendiumTopGradient } from "@/components/compendium/compendium-top-gradient"

export default function CompendiumLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CompendiumTopGradient />
      <div className="relative z-[2]">{children}</div>
    </>
  )
}
