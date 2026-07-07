"use client"

import type { ReactNode } from "react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import {
  findBackgroundGrantedFeat,
  formatBackgroundAbilityBonuses,
  formatBackgroundEquipment,
  formatBackgroundGrantedSpells,
  getBackgroundProficiencySections,
} from "@/lib/compendium/background-display"
import type { Background, Feat, Spell } from "@/lib/types"

function BackgroundDetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
      <div className="mt-0.5 text-[11px] leading-snug text-white/90">{children}</div>
    </div>
  )
}

type BackgroundDetailStripProps = {
  background: Background
  feats: Feat[]
  spells: Spell[]
}

/** Wide detail-overlay layout — three columns, no vertical scroll. */
export function BackgroundDetailStrip({ background, feats, spells }: BackgroundDetailStripProps) {
  const abilityText = formatBackgroundAbilityBonuses(background.ability_bonuses)
  const equipmentText = formatBackgroundEquipment(background)
  const grantedFeat = findBackgroundGrantedFeat(background.feat_granted, feats)
  const grantedSpellLines = formatBackgroundGrantedSpells(background, spells)
  const proficiencySections = getBackgroundProficiencySections(background)

  return (
    <div className="grid h-full gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      <div className="min-w-0 overflow-hidden">
        {background.description?.trim() ? (
          <RichTextContent
            html={background.description}
            className="text-[11px] leading-snug [&_p]:line-clamp-5 [&_p]:text-white/85"
          />
        ) : (
          <p className="text-[11px] text-white/70">No description listed.</p>
        )}
      </div>

      <div className="min-w-0 space-y-2 overflow-hidden">
        {abilityText ? (
          <BackgroundDetailField label="Ability Scores">{abilityText}</BackgroundDetailField>
        ) : null}
        {background.skill_proficiencies && background.skill_proficiencies.length > 0 ? (
          <BackgroundDetailField label="Skills">
            {background.skill_proficiencies.join(", ")}
          </BackgroundDetailField>
        ) : null}
        {background.feat_granted ? (
          <BackgroundDetailField label="Origin Feat">
            <span className="font-semibold">{background.feat_granted}</span>
            {grantedFeat?.description ? (
              <RichTextContent
                html={grantedFeat.description}
                className="mt-1 [&_p]:line-clamp-2 [&_p]:text-white/75"
              />
            ) : null}
          </BackgroundDetailField>
        ) : null}
      </div>

      <div className="min-w-0 space-y-2 overflow-hidden sm:col-span-2 lg:col-span-1">
        {proficiencySections.map((section) => (
          <BackgroundDetailField key={section.label} label={section.label}>
            {section.items.join(", ")}
          </BackgroundDetailField>
        ))}
        {grantedSpellLines.length > 0 ? (
          <BackgroundDetailField label="Granted Spells">
            <ul className="space-y-0.5">
              {grantedSpellLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </BackgroundDetailField>
        ) : null}
        {equipmentText ? (
          <BackgroundDetailField label="Starting Equipment">
            <p className="whitespace-pre-wrap line-clamp-4">{equipmentText}</p>
          </BackgroundDetailField>
        ) : null}
      </div>
    </div>
  )
}
