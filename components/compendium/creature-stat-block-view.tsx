import type {
  CompanionNamedBlock,
  CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

const ABILITY_ORDER: { key: AbilityScoreKey; label: string }[] = [
  { key: "strength", label: "STR" },
  { key: "dexterity", label: "DEX" },
  { key: "constitution", label: "CON" },
  { key: "intelligence", label: "INT" },
  { key: "wisdom", label: "WIS" },
  { key: "charisma", label: "CHA" },
]

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

function fixedTotal(value: CompanionStatBlockTemplate["ac"]): number {
  return value.parts.reduce((sum, part) => (part.type === "fixed" ? sum + part.value : sum), 0)
}

function formatScaled(value: CompanionStatBlockTemplate["ac"]): string {
  if (value.label) return value.label
  const fixed = fixedTotal(value)
  const hasScale = value.parts.some((p) => p.type === "scale")
  if (!hasScale) return String(fixed)
  return String(fixed)
}

function NamedBlocks({ title, blocks }: { title: string; blocks?: CompanionNamedBlock[] | null }) {
  if (!blocks?.length) return null
  return (
    <div className="mt-3">
      <h4 className="text-xs font-bold uppercase tracking-wide text-white/60 border-b border-white/15 pb-1 mb-2">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {blocks.map((block) => (
          <li key={block.name} className="text-sm text-white/85">
            <span className="font-semibold italic text-white">{block.name}.</span>{" "}
            {block.description}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Renders a companion/creature stat block. Used in the compendium detail overlay and the
 * creature editor preview. Shows fixed values as-is; scaled values fall back to their label.
 */
export function CreatureStatBlockView({
  template,
  variant = "dark",
}: {
  template: CompanionStatBlockTemplate
  variant?: "dark" | "light"
}) {
  const muted = variant === "dark" ? "text-white/50" : "text-muted-foreground"
  const strong = variant === "dark" ? "text-white/90" : "text-foreground"

  const headerRows: { label: string; value: string }[] = []
  headerRows.push({ label: "AC", value: formatScaled(template.ac) })
  if (template.initiative) headerRows.push({ label: "Initiative", value: template.initiative })
  headerRows.push({
    label: "HP",
    value: template.hitDiceNote
      ? `${formatScaled(template.hp)} (${template.hitDiceNote})`
      : formatScaled(template.hp),
  })
  if (template.speed) headerRows.push({ label: "Speed", value: template.speed })
  if (template.senses) headerRows.push({ label: "Senses", value: template.senses })
  if (template.skills) headerRows.push({ label: "Skills", value: template.skills })
  if (template.savingThrows) headerRows.push({ label: "Saving Throws", value: template.savingThrows })
  if (template.proficiencies) headerRows.push({ label: "Proficiencies", value: template.proficiencies })
  if (template.gear) headerRows.push({ label: "Gear", value: template.gear })
  if (template.vulnerabilities?.length) {
    headerRows.push({ label: "Vulnerabilities", value: template.vulnerabilities.join(", ") })
  }
  if (template.resistances?.length) {
    headerRows.push({ label: "Resistances", value: template.resistances.join(", ") })
  }
  if (template.damageImmunities?.length || template.conditionImmunities?.length) {
    const parts = [
      ...(template.damageImmunities ?? []),
      ...(template.conditionImmunities ?? []),
    ]
    headerRows.push({ label: "Immunities", value: parts.join(", ") })
  }
  if (template.languages) headerRows.push({ label: "Languages", value: template.languages })
  if (template.cr) headerRows.push({ label: "CR", value: template.cr })

  const abilities = template.abilityScores

  return (
    <div className="text-sm">
      {template.sizeTypeAlignment ? (
        <p className={`italic ${muted} mb-2`}>{template.sizeTypeAlignment}</p>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {headerRows.map((row) => (
          <div key={row.label} className="contents">
            <dt className={`font-semibold ${muted}`}>{row.label}</dt>
            <dd className={strong}>{row.value}</dd>
          </div>
        ))}
      </dl>

      {abilities && Object.keys(abilities).length ? (
        <table className="mt-3 w-full text-center text-xs">
          <thead>
            <tr className={muted}>
              <th className="text-left font-semibold">&nbsp;</th>
              <th className="font-semibold">Score</th>
              <th className="font-semibold">Mod</th>
              <th className="font-semibold">Save</th>
            </tr>
          </thead>
          <tbody>
            {ABILITY_ORDER.filter(({ key }) => abilities[key]).map(({ key, label }) => {
              const row = abilities[key]!
              return (
                <tr key={key} className={strong}>
                  <td className={`text-left font-semibold ${muted}`}>{label}</td>
                  <td>{row.score}</td>
                  <td>{signed(row.modifier)}</td>
                  <td>{signed(row.save)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      <NamedBlocks title="Traits" blocks={template.traits} />
      <NamedBlocks title="Actions" blocks={template.actions} />
      <NamedBlocks title="Bonus Actions" blocks={template.bonusActions} />
      <NamedBlocks title="Reactions" blocks={template.reactions} />
    </div>
  )
}
