"use client"

import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import Link from "next/link"
import { Sparkles, Users, BookOpen, Upload, ArrowRight, Sword, Shield, Wand2 } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Easy Character Creation",
    description: "Build your hero step-by-step with our intuitive 6-step wizard following D&D 2024 rules.",
    color: "bg-primary",
  },
  {
    icon: BookOpen,
    title: "Complete Compendium",
    description: "Browse species, classes, backgrounds, spells, feats, and equipment from the SRD and beyond.",
    color: "bg-secondary",
  },
  {
    icon: Upload,
    title: "Import Any Content",
    description: "Upload PDFs or import from web sources to expand your content library.",
    color: "bg-accent",
  },
]

const classHighlights = [
  { name: "Fighter", icon: Sword, color: "from-red-500 to-orange-500" },
  { name: "Wizard", icon: Wand2, color: "from-blue-500 to-purple-500" },
  { name: "Paladin", icon: Shield, color: "from-yellow-500 to-amber-500" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                D&D 2024 Ready
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 text-balance">
                Sheet
                <span className="text-primary"> Happens</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
                The most intuitive D&D 5.5e character builder. Create characters, 
                track stats, and manage your adventure - all in one place.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/builder"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all hover:scale-105"
                >
                  Create Character
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/compendium"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-card border-2 border-border text-foreground rounded-2xl font-bold text-lg hover:border-primary/50 transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  Browse Compendium
                </Link>
              </div>
            </motion.div>
          </div>
          
          {/* Floating class icons */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {classHighlights.map((cls, index) => (
              <motion.div
                key={cls.name}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.2, duration: 0.5 }}
                className={`absolute w-32 h-32 rounded-full bg-gradient-to-br ${cls.color} blur-3xl`}
                style={{
                  top: `${20 + index * 30}%`,
                  left: index % 2 === 0 ? "10%" : "80%",
                }}
              />
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
                Everything You Need
              </h2>
              <p className="text-muted-foreground text-lg">
                All the tools to bring your characters to life
              </p>
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
                    className="bg-card rounded-2xl p-6 border-2 border-border hover:border-primary/50 transition-all hover:-translate-y-1"
                  >
                    <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-3xl p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-8">
                Start Your Adventure
              </h2>
              
              <div className="grid grid-cols-3 gap-8 mb-8">
                {[
                  { value: "12", label: "Classes" },
                  { value: "9", label: "Species" },
                  { value: "20+", label: "Spells" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-4xl md:text-5xl font-black text-primary">{stat.value}</p>
                    <p className="text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
              
              <Link
                href="/import"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
              >
                <Upload className="w-5 h-5" />
                Import more content from PDFs or websites
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-primary">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Users className="w-16 h-16 text-primary-foreground/20 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-black text-primary-foreground mb-4">
                Ready to Roll?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Create your first character in minutes. No account required to get started.
              </p>
              <Link
                href="/builder"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary rounded-2xl font-bold text-lg hover:bg-white/90 transition-all hover:scale-105"
              >
                Create Your Character
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground text-sm">
          <p>Sheet Happens - D&D 5.5e Character Builder</p>
          <p className="mt-1">Uses content from the D&D SRD 5.2 under the Creative Commons license.</p>
        </div>
      </footer>
    </div>
  )
}
