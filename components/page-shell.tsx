import type { ReactNode } from "react"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"

type PageShellProps = {
  id?: string
  mainId?: string
  children: ReactNode
  className?: string
  mainClassName?: string
  showFooter?: boolean
}

export function PageShell({
  id,
  mainId,
  children,
  className = "min-h-screen bg-background flex flex-col",
  mainClassName = "flex-1",
  showFooter = true,
}: PageShellProps) {
  return (
    <div id={id} className={className}>
      <MainNav />
      <main id={mainId} className={mainClassName}>
        {children}
      </main>
      {showFooter ? <SiteFooter /> : null}
    </div>
  )
}
