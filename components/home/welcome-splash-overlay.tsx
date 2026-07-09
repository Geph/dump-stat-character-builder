"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ImageIcon } from "lucide-react"
import { SwipeVisualPicker } from "@/components/builder/swipe-visual-picker"
import { cn } from "@/lib/utils"
import { withBasePath } from "@/lib/config/deploy-mode"
import {
  isWelcomeSplashSuppressed,
  setWelcomeSplashSuppressed,
} from "@/lib/site-settings/welcome-splash"
import {
  APP_PRESENTATION_MODE_STORAGE_KEY,
  setAppPresentationMode,
} from "@/lib/site-settings/app-presentation-mode"
import {
  BUILDER_LAYOUT_STORAGE_KEY,
  setBuilderLayout,
} from "@/lib/site-settings/builder-layout"
import { clearBuilderDraft } from "@/lib/builder/draft-storage"

type VersionOption = {
  id: string
  title: string
  description: ReactNode
  href: string
  imageSrc?: string
  imageBackgroundClass?: string
  imageObjectFit?: "contain" | "cover"
  placeholderClass?: string
  icon?: typeof ImageIcon
  /** External links open in the same tab when true (default: new tab). */
  sameTab?: boolean
}

const VISUAL_COMPACT_SPLASH_IMAGE = withBasePath("/images/welcome-splash/visual-compact.webp")
const COMPACT_INTERFACE_SPLASH_IMAGE = withBasePath("/images/welcome-splash/compact-interface.png")
const NO_AI_SPLASH_IMAGE = withBasePath("/images/welcome-splash/no-ai.png")

const VERSION_OPTIONS: VersionOption[] = [
  {
    id: "visual-compact",
    title: "Visual + Compact",
    description: (
      <>
        Includes generated art from{" "}
        <a
          href="https://www.midjourney.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          Midjourney
        </a>
      </>
    ),
    href: "#",
    imageSrc: VISUAL_COMPACT_SPLASH_IMAGE,
    imageBackgroundClass: "bg-card",
    imageObjectFit: "cover",
  },
  {
    id: "compact-only",
    title: "Compact Only",
    description: "Clean and simple, no art",
    href: "#",
    imageSrc: COMPACT_INTERFACE_SPLASH_IMAGE,
    imageBackgroundClass: "bg-card",
    imageObjectFit: "cover",
  },
  {
    id: "no-ai",
    title: "No AI Whatsoever",
    description: "TTRPG and tech tools entirely without AI",
    href: "https://www.daggerheart.com/",
    imageSrc: NO_AI_SPLASH_IMAGE,
    imageBackgroundClass: "bg-white",
    sameTab: true,
  },
]

const SPLASH_LINK_CLASS =
  "block text-inherit no-underline hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded-lg"

function VersionOptionCard({
  option,
  onChoose,
}: {
  option: VersionOption
  onChoose: (id: string) => void
}) {
  const Icon = option.icon ?? ImageIcon
  const isExternalLink = option.href.startsWith("http")
  const openInNewTab = isExternalLink && !option.sameTab

  const handleActivate = () => {
    onChoose(option.id)
  }

  const imageBlock = option.imageSrc ? (
    <div
      className={cn(
        "relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-t-xl",
        option.imageBackgroundClass ?? "bg-muted",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={option.imageSrc}
        alt=""
        className={cn(
          "h-full w-full",
          option.imageObjectFit === "cover" ? "object-cover object-top" : "object-contain p-4",
        )}
      />
    </div>
  ) : (
    <div
      className={cn(
        "relative flex aspect-[4/3] w-full shrink-0 items-center justify-center rounded-t-xl bg-gradient-to-br",
        option.placeholderClass,
      )}
      aria-hidden
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-background/70 shadow-inner">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <span className="absolute bottom-2 right-2 rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Placeholder
      </span>
    </div>
  )

  const titleBlock = (
    <h3
      className="px-4 pt-3 text-xl font-bold text-foreground sm:text-2xl"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {option.title}
    </h3>
  )

  const linkedHeader = isExternalLink ? (
    <a
      href={option.href}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={SPLASH_LINK_CLASS}
      onClick={handleActivate}
    >
      {imageBlock}
      {titleBlock}
    </a>
  ) : (
    <Link
      href={option.href}
      className={SPLASH_LINK_CLASS}
      onClick={(event) => {
        event.preventDefault()
        handleActivate()
      }}
    >
      {imageBlock}
      {titleBlock}
    </Link>
  )

  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {linkedHeader}
      <p className="px-4 pb-4 pt-2 text-center text-sm leading-relaxed text-muted-foreground">
        {option.description}
      </p>
    </article>
  )
}

export function WelcomeSplashOverlay() {
  const [open, setOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    if (isWelcomeSplashSuppressed()) return
    setOpen(true)
    if (typeof localStorage !== "undefined") {
      if (!localStorage.getItem(APP_PRESENTATION_MODE_STORAGE_KEY)) {
        setAppPresentationMode("visual-compact")
      }
      if (!localStorage.getItem(BUILDER_LAYOUT_STORAGE_KEY)) {
        setBuilderLayout("visual")
      }
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const dismiss = useCallback(
    (persistSuppress: boolean) => {
      if (persistSuppress) {
        setWelcomeSplashSuppressed(true)
      }
      setOpen(false)
    },
    [],
  )

  const handleChoose = useCallback(
    (id: string) => {
      if (id === "visual-compact") {
        setAppPresentationMode("visual-compact")
        setBuilderLayout("visual")
        clearBuilderDraft()
      } else if (id === "compact-only") {
        setAppPresentationMode("compact-only")
        setBuilderLayout("compact")
        clearBuilderDraft()
      }
      dismiss(dontShowAgain)
    },
    [dismiss, dontShowAgain],
  )

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss(dontShowAgain)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, dismiss, dontShowAgain])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="welcome-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-splash-title"
          aria-describedby="welcome-splash-description"
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label="Dismiss welcome splash"
            onClick={() => dismiss(dontShowAgain)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-[1] flex w-[70vw] max-h-[min(85vh,680px)] max-w-[1100px] min-w-[min(100%,320px)] flex-col overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-3 rounded-xl border border-primary/20" aria-hidden />

            <div className="flex min-h-0 flex-col overflow-y-auto px-5 py-4 sm:px-8 sm:py-5">
              <header className="shrink-0 text-center">
                <h2
                  id="welcome-splash-title"
                  className="text-3xl font-bold text-foreground sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Choose your app version
                </h2>
                <p
                  id="welcome-splash-description"
                  className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:max-w-none lg:whitespace-nowrap"
                >
                  This app was developed with use of{" "}
                  <a
                    href="https://cursor.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-base font-bold tracking-wide text-primary underline decoration-primary/50 underline-offset-[3px] shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_15%,transparent)] transition-colors hover:decoration-primary sm:text-lg"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Cursor
                  </a>
                  , a <span className="font-bold text-foreground">natural language programming</span>{" "}
                  (AI-assisted coding) tool.
                </p>
              </header>

              <div className="mt-4 sm:mt-5">
                <SwipeVisualPicker
                  enabled={isNarrow}
                  className={cn(
                    "gap-4",
                    "max-sm:flex max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-smooth max-sm:pb-2 max-sm:[touch-action:pan-x]",
                    "sm:grid sm:grid-cols-3 sm:items-stretch",
                  )}
                >
                  {VERSION_OPTIONS.map((option) => (
                    <VersionOptionCard key={option.id} option={option} onChoose={handleChoose} />
                  ))}
                </SwipeVisualPicker>
              </div>

              <label className="mt-4 flex shrink-0 cursor-pointer items-center justify-center gap-2 text-sm text-muted-foreground sm:mt-5">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(event) => setDontShowAgain(event.target.checked)}
                  className="size-4 rounded border-border accent-primary"
                />
                Don&apos;t show this again
              </label>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
