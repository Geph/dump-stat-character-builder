"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import Link from "next/link"
import { BookOpen, Upload, ArrowRight, Sword, Shield, Wand2 } from "lucide-react"
import { createClient } from "@/lib/db/client"
import {
  FEATURE_CARD_IMAGES,
  HERO_ROTATING_IMAGES,
  LIBRARY_STATS_BACKGROUND,
} from "@/lib/site-images"
import {
  getCustomHeroBackground,
  HERO_BG_CHANGE_EVENT,
} from "@/lib/site-settings/hero-background"

const features = [
  {
    href: "/builder",
    image: FEATURE_CARD_IMAGES.characterCreation,
    imageAlt: "Easy Character Creation",
    title: "Easy Character Creation",
    description:
      "Build characters step-by-step with a live sheet preview—species, backgrounds, multiclass levels, spells, and equipment following D&D 2024 rules.",
  },
  {
    href: "/compendium",
    image: FEATURE_CARD_IMAGES.compendium,
    imageAlt: "Build Your Compendium",
    title: "Build Your Compendium",
    description:
      "Browse and edit classes, subclasses, species, spells, feats, equipment, and class resources. Toggle SRD entries on or off and add your own homebrew.",
  },
  {
    href: "/import",
    image: FEATURE_CARD_IMAGES.importContent,
    imageAlt: "Import External Content",
    title: "Import External Content",
    description:
      "Paste text, upload PDFs, or drop in Dump Stat JSON—AI extracts structured compendium data from homebrew documents and web sources.",
  },
  {
    href: "/characters",
    image: FEATURE_CARD_IMAGES.characterSheet,
    imageAlt: "Interactive Character Sheet",
    title: "Interactive Character Sheet",
    description:
      "Play at the table with clickable d20 rolls, editable HP and temp HP, spell slot tracking, conditions, and weapon attack and damage rollers.",
  },
  {
    href: "/characters",
    image: FEATURE_CARD_IMAGES.appearance,
    imageAlt: "Customized Appearance",
    title: "Customized Appearance",
    description:
      "Pick from five color themes in the settings menu and upload a custom home page hero background—your sheet and UI update instantly.",
  },
  {
    href: "/import",
    image: FEATURE_CARD_IMAGES.exportDatabase,
    imageAlt: "Export and Database",
    title: "Export and Database",
    description:
      "Store compendium data in your browser (IndexedDB) or MySQL when hosted. Export as JSON for restoration later.",
  },
]

const classHighlights = [
  { name: "Fighter", icon: Sword },
  { name: "Wizard", icon: Wand2 },
  { name: "Paladin", icon: Shield },
]

type LibraryStats = {
  classes: number
  species: number
  backgrounds: number
  spells: number
  feats: number
  subclasses: number
  equipment: number
}

export default function HomePage() {
  const [stats, setStats] = useState<LibraryStats>({
    classes: 0, species: 0, backgrounds: 0, spells: 0, feats: 0, subclasses: 0, equipment: 0,
  })

  // Fixed initial image so SSR and hydration match; randomize after mount unless custom.
  const [heroBg, setHeroBg] = useState(HERO_ROTATING_IMAGES[0])
  const [customHeroBg, setCustomHeroBg] = useState<string | null>(null)

  useEffect(() => {
    const syncHero = () => {
      const custom = getCustomHeroBackground()
      setCustomHeroBg(custom)
      if (!custom) {
        setHeroBg(HERO_ROTATING_IMAGES[Math.floor(Math.random() * HERO_ROTATING_IMAGES.length)])
      }
    }
    syncHero()
    window.addEventListener(HERO_BG_CHANGE_EVENT, syncHero)
    return () => window.removeEventListener(HERO_BG_CHANGE_EVENT, syncHero)
  }, [])

  const heroBackgroundUrl = customHeroBg ?? heroBg

  useEffect(() => {
    const fetchStats = async () => {
      const db = createClient()
      const [
        { count: classes },
        { count: species },
        { count: backgrounds },
        { count: spells },
        { count: feats },
        { count: subclasses },
        { count: equipment },
      ] = await Promise.all([
        db.from("classes").select("*", { count: "exact", head: true }),
        db.from("species").select("*", { count: "exact", head: true }),
        db.from("backgrounds").select("*", { count: "exact", head: true }),
        db.from("spells").select("*", { count: "exact", head: true }),
        db.from("feats").select("*", { count: "exact", head: true }),
        db.from("subclasses").select("*", { count: "exact", head: true }),
        db.from("equipment").select("*", { count: "exact", head: true }),
      ])
      setStats({
        classes: classes ?? 0,
        species: species ?? 0,
        backgrounds: backgrounds ?? 0,
        spells: spells ?? 0,
        feats: feats ?? 0,
        subclasses: subclasses ?? 0,
        equipment: equipment ?? 0,
      })
    }
    fetchStats()
  }, [])

  const libraryStatItems = [
    { value: stats.classes,     label: "Classes",     color: "text-primary" },
    { value: stats.subclasses,  label: "Subclasses",  color: "text-secondary" },
    { value: stats.species,     label: "Species",     color: "text-lemon" },
    { value: stats.backgrounds, label: "Backgrounds", color: "text-orange" },
    { value: stats.spells,      label: "Spells",      color: "text-magenta" },
    { value: stats.feats,       label: "Feats",       color: "text-lime" },
    { value: stats.equipment,   label: "Equipment",   color: "text-lemon" },
  ]

  return (
    <div id="home-root" className="min-h-screen bg-background">
      <MainNav />

      <main id="home-main">
        {/* Hero Section */}
        <section
          id="hero-section"
          className="relative overflow-hidden pt-[170px] pb-20 px-4"
          style={{
            backgroundImage: `url(${heroBackgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Dark overlay so text stays readable */}
          <div className="absolute inset-0 bg-background/50 pointer-events-none" />
          {/* Subtle bottom fade into background */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1
                className="text-6xl md:text-8xl font-bold text-foreground mb-6 text-balance"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Dump Stat
              </h1>

              <p className="mb-10 max-w-2xl mx-auto">
                <span className="text-lg font-bold text-pretty inline rounded-lg px-[5px] py-[2px] bg-card/92 backdrop-blur-sm shadow-sm border border-border/40 [box-decoration-break:clone]">
                  A vibe-coded D&D 5.5e character creator with support for custom classes and content
                </span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/builder"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:brightness-110 transition-all glow-primary"
                >
                  Create Character
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/compendium"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-lemon text-lemon-foreground rounded-xl font-bold text-lg hover:brightness-110 transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  Browse Compendium
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Floating class icons */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {classHighlights.map((cls, index) => {
              const Icon = cls.icon
              return (
                <motion.div
                  key={cls.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.07 }}
                  transition={{ delay: 0.5 + index * 0.3 }}
                  className="absolute text-primary"
                  style={{
                    top: `${25 + index * 25}%`,
                    left: index % 2 === 0 ? "8%" : "84%",
                  }}
                >
                  <Icon className="w-24 h-24" />
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Features Section */}
        <section id="features-section" className="py-20 px-6 md:px-10 lg:px-12 border-t border-border bg-card-lighter relative">
          {/* Inset purple border */}
          <div className="absolute inset-6 md:inset-8 lg:inset-10 border-2 border-primary/30 rounded-xl pointer-events-none" />
          <div className="max-w-6xl mx-auto relative z-10 px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2
                className="text-3xl md:text-4xl font-bold text-foreground mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Make Everything You Need
              </h2>
              <p className="text-muted-foreground">Build the components to bring your characters to life with custom classes and abilities</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={feature.href}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-center transition-all hover:-translate-y-1 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card-lighter"
                  >
                    <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={feature.image}
                        alt={feature.imageAlt}
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="flex flex-col items-center p-6">
                      <h3
                        className="mb-2 text-lg font-bold text-foreground group-hover:text-primary transition-colors"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Library Stats Section */}
        <section
          id="library-stats-section"
          className="py-20 px-4 border-t border-border relative overflow-hidden"
          style={{
            backgroundImage: `url(${LIBRARY_STATS_BACKGROUND})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-background/55 pointer-events-none" />
          <div className="max-w-5xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative bg-card-lighter border border-border rounded-2xl p-8 md:p-12"
            >
              {/* Inset purple border */}
              <div className="absolute inset-3 border-2 border-primary/30 rounded-xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
                <div>
                  <h2
                    className="text-3xl md:text-4xl font-bold text-foreground"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Library Stats
                  </h2>
                  <p className="text-muted-foreground mt-1">Content currently in your database</p>
                </div>
                <Link
                  href="/import"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-lime text-lime-foreground rounded-xl font-bold text-sm hover:brightness-110 transition-all glow-lime shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  Import More Content
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6">
                {libraryStatItems.map((stat) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="text-center"
                  >
                    <p className={`text-4xl font-bold ${stat.color}`} style={{ fontFamily: "var(--font-display)" }}>
                      {stat.value}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1 font-medium uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="home-footer" className="py-8 px-4 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground text-sm space-y-1">
          <p>Dump Stat — D&D 5.5e Character Builder</p>
          <p className="pt-0">Uses content from the 
            <a
            href="https://www.dndbeyond.com/srd"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            >
            D&D 5.5e SRD under the Creative Commons license
            </a>.</p>
          <p>
            Logo icon:{" "}
            <a
              href="https://game-icons.net/1x1/delapouite/spiked-dragon-head.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Spiked Dragon Head
            </a>{" "}
            by{" "}
            <a
              href="https://delapouite.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Delapouite
            </a>{" "}
            under{" "}
            <a
              href="http://creativecommons.org/licenses/by/3.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CC BY 3.0
            </a>
            {" · "}
            Fonts: Solbera&apos;s D&D Fonts by{" "}
            <a
              href="https://jonathonf.github.io/solbera-dnd-fonts/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Solbera / Ryrok
            </a>{" "}
            under CC BY-SA 4.0
          </p>
        </div>
      </footer>
    </div>
  )
}
