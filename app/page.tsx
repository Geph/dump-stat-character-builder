"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import Link from "next/link"
import { Sparkles, BookOpen, Upload, ArrowRight, Sword, Shield, Wand2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const features = [
  {
    icon: Sparkles,
    title: "Easy Character Creation",
    description: "Build your hero step-by-step with a simple 6-step wizard following D&D 2024 rules.",
    accent: "bg-primary",
    glow: "glow-primary",
  },
  {
    icon: BookOpen,
    title: "Build Your Compendium",
    description: "Browse species, classes, backgrounds, spells, feats, and equipment from the D&D 5.5e SRD and beyond.",
    accent: "bg-lime",
    glow: "glow-lime",
  },
  {
    icon: Upload,
    title: "Import External Content",
    description: "Upload PDFs or import from web sources to expand your content library.",
    accent: "bg-orange",
    glow: "glow-orange",
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

const HERO_IMAGES = [
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rotating%20%282%29.png-lTMAKAxAk9aiCH20M7OEgf7cCAjfz4.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rotating%20%281%29.png-jkIOsnsjzDsuQGxDZ9aEuKojaqHbbX.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rotating%20%285%29.png-RP5MWN94zgr6Ju284Ct4ZtHSBL6gmr.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rotating%20%283%29.png-PtWc4DkQOWfQklKa5PYDBmOxjSuCud.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rotating%20%284%29.png-CuA5DQzxgCl6Paw1PmtYUgDG65Xu6a.jpeg",
]

const LIBRARY_STATS_BG = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/library-stats-section.png-xI6gFjkk9x6YETqOPgj8680eSlMkL2.jpeg"

export default function HomePage() {
  const [stats, setStats] = useState<LibraryStats>({
    classes: 0, species: 0, backgrounds: 0, spells: 0, feats: 0, subclasses: 0, equipment: 0,
  })

  // Fixed initial image so SSR and hydration match; randomize after mount.
  const [heroBg, setHeroBg] = useState(HERO_IMAGES[0])

  useEffect(() => {
    setHeroBg(HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)])
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()
      const [
        { count: classes },
        { count: species },
        { count: backgrounds },
        { count: spells },
        { count: feats },
        { count: subclasses },
        { count: equipment },
      ] = await Promise.all([
        supabase.from("classes").select("*", { count: "exact", head: true }),
        supabase.from("species").select("*", { count: "exact", head: true }),
        supabase.from("backgrounds").select("*", { count: "exact", head: true }),
        supabase.from("spells").select("*", { count: "exact", head: true }),
        supabase.from("feats").select("*", { count: "exact", head: true }),
        supabase.from("subclasses").select("*", { count: "exact", head: true }),
        supabase.from("equipment").select("*", { count: "exact", head: true }),
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
            backgroundImage: `url(${heroBg})`,
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

              <p className="text-lg mb-10 max-w-2xl mx-auto text-pretty">
                A vibe-coded D&D 5.5e character creator with support for custom classes and content
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
        <section id="features-section" className="py-20 px-4 border-t border-border bg-card-lighter relative">
          {/* Inset purple border */}
          <div className="absolute inset-4 border-2 border-primary/30 rounded-xl pointer-events-none" />
          <div className="max-w-6xl mx-auto relative z-10">
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

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center text-center bg-card rounded-xl p-6 border border-border hover:border-primary/40 transition-all hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 shrink-0 ${feature.accent} ${feature.glow} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3
                      className="text-lg font-bold text-foreground mb-2"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Library Stats Section */}
        <section
          id="library-stats-section"
          className="py-20 px-4 border-t border-border relative overflow-hidden"
          style={{
            backgroundImage: `url(${LIBRARY_STATS_BG})`,
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
            href="_https://www.dndbeyond.com/srd"
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
