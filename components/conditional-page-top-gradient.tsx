"use client"

import { usePathname } from "next/navigation"
import { PageTopGradient } from "@/components/page-top-gradient"

/** Top fade for app pages with decorative backgrounds — not home or compendium. */
export function ConditionalPageTopGradient() {
  const pathname = usePathname()
  if (!pathname || pathname === "/" || pathname.startsWith("/compendium")) {
    return null
  }
  return <PageTopGradient size="half" />
}
