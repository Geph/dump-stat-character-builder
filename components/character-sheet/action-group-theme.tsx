import { Crosshair, Shield, Sparkles, Swords, Zap } from "lucide-react"

const themes = {
  action: { Icon: Swords, color: "text-amber-800 dark:text-amber-300", well: "bg-amber-500/15 border-amber-600/25", header: "from-amber-500/20 to-amber-500/5", edge: "border-amber-600/30" },
  bonus: { Icon: Zap, color: "text-cyan-800 dark:text-cyan-300", well: "bg-cyan-500/15 border-cyan-600/25", header: "from-cyan-500/20 to-cyan-500/5", edge: "border-cyan-600/30" },
  reaction: { Icon: Shield, color: "text-violet-800 dark:text-violet-300", well: "bg-violet-500/15 border-violet-600/25", header: "from-violet-500/20 to-violet-500/5", edge: "border-violet-600/30" },
  triggered: { Icon: Sparkles, color: "text-emerald-800 dark:text-emerald-300", well: "bg-emerald-500/15 border-emerald-600/25", header: "from-emerald-500/20 to-emerald-500/5", edge: "border-emerald-600/30" },
  weapons: { Icon: Crosshair, color: "text-primary", well: "bg-primary/10 border-primary/25", header: "from-primary/15 to-primary/5", edge: "border-primary/30" },
}

export function actionGroupTheme(id: string) {
  return themes[id as keyof typeof themes] ?? themes.weapons
}
