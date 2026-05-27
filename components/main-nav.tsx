"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Users, BookOpen, Upload, Sparkles, Home } from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/builder", label: "Builder", icon: Sparkles },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/compendium", label: "Compendium", icon: BookOpen },
  { href: "/import", label: "Import", icon: Upload },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo — Spiked Dragon Head by Delapouite (CC BY 3.0) */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow-primary shrink-0">
              {/* Inline SVG: spiked-dragon-head by Delapouite, game-icons.net, CC BY 3.0 */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                className="w-6 h-6 fill-primary-foreground"
                aria-hidden="true"
              >
                <path d="M461.3 77.8c-13.7-10.2-32.5-8.3-44.1 4.3l-47.1 51.8-28.7-31.5 26.4-29c11.6-12.7 11.6-32.3 0-45l-18.6-20.4c-11.6-12.7-30.6-14.6-44.3-4.4L230 64.7 192.4 23c-11.6-12.7-30.6-14.6-44.3-4.4L18.7 109.1C5 119.3 2.3 138.7 12.5 152.4l30.2 40.3c6.2 8.3 15.9 13.2 26.2 13.2h14.3l-45 60c-10.9 14.5-8.6 35 5.2 46.7l23.8 20.2c8.1 6.9 18.8 9.8 29.2 8L160 330l-10.9 32.8c-3.3 9.9-1.1 20.8 5.8 28.7 6.9 7.9 17.4 11.4 27.6 9.2l53.2-11.5 18 54.1c3.1 9.3 10.7 16.3 20.2 18.7 9.5 2.4 19.5-.2 26.6-6.9l81.1-76.1c13.5-12.7 20.9-30.4 20.5-48.8-.2-8.6-2-17-5.1-24.7l30.9-8.3c10.4-2.8 18.5-10.9 21.3-21.3l8.1-30.3c2.7-10.3-.1-21.3-7.4-29l-18.5-19.6 43.8-48.2c11.6-12.7 11.6-32.4 0-45.1l-33.9-37.2z"/>
              </svg>
            </div>
            <span
              className="text-xl font-bold text-primary hidden sm:inline tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sheet Happens
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-3 py-2 rounded-lg transition-colors"
                >
                  <span className={`flex items-center gap-2 relative z-10 font-semibold text-sm ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-primary/15 rounded-lg border border-primary/30"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
