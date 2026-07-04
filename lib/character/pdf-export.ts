import type { DerivedCharacter } from "@/lib/character/types"
import type { DerivedStatBreakdowns } from "@/lib/character/stat-contributions"
import { breakdownLines } from "@/lib/character/get-derived-breakdowns"

export type CharacterPdfExportInput = {
  name: string
  level: number
  classSummary: string
  derived: DerivedCharacter
  breakdowns?: DerivedStatBreakdowns
  sheetUrl?: string
}

/** Build a plain-text character summary suitable for PDF or print fallback. */
export function buildCharacterPdfText(input: CharacterPdfExportInput): string {
  const { derived, breakdowns, name, level, classSummary, sheetUrl } = input
  const lines: string[] = [
    name,
    `Level ${level} · ${classSummary}`,
    "",
    `AC ${derived.armorClass} · Initiative ${derived.initiative >= 0 ? "+" : ""}${derived.initiative} · Speed ${derived.speed} ft`,
    `HP ${derived.maxHp}`,
    "",
    "Ability scores",
    ...Object.entries(derived.abilityScores).map(
      ([key, score]) => `  ${key}: ${score} (${derived.abilityMods[key as keyof typeof derived.abilityMods] >= 0 ? "+" : ""}${derived.abilityMods[key as keyof typeof derived.abilityMods]})`,
    ),
    "",
    "Saving throws",
    ...derived.saves.map(
      (save) =>
        `  ${save.ability}: ${save.modifier >= 0 ? "+" : ""}${save.modifier}${save.proficient ? " (prof)" : ""}`,
    ),
  ]

  if (breakdowns) {
    lines.push("", "AC breakdown")
    for (const line of breakdownLines(breakdowns, "ac")) {
      lines.push(`  ${line.label}: ${line.amount >= 0 ? "+" : ""}${line.amount}`)
    }
  }

  if (sheetUrl) {
    lines.push("", `Sheet: ${sheetUrl}`)
  }

  return lines.join("\n")
}

/** Download character summary as a text file (pdf-lib optional enhancement). */
export function downloadCharacterPdfFallback(input: CharacterPdfExportInput): void {
  const text = buildCharacterPdfText(input)
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${input.name.replace(/\s+/g, "-").toLowerCase()}-sheet.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Attempt PDF via dynamic pdf-lib import; falls back to text download. */
export async function downloadCharacterPdf(input: CharacterPdfExportInput): Promise<void> {
  try {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([612, 792])
    const text = buildCharacterPdfText(input)
    const fontSize = 10
    const margin = 50
    let y = 742

    for (const line of text.split("\n")) {
      if (y < margin) {
        y = 742
        doc.addPage([612, 792])
      }
      page.drawText(line.slice(0, 90), { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) })
      y -= fontSize + 4
    }

    const bytes = await doc.save()
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)], {
      type: "application/pdf",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${input.name.replace(/\s+/g, "-").toLowerCase()}-sheet.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch {
    downloadCharacterPdfFallback(input)
  }
}
