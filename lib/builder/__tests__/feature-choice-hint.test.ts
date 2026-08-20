import { describe, expect, it } from "vitest"
import {
  FEATURE_CHOICE_HINT_MAX_CHARS,
  featureChoiceHintFromDescription,
  firstSentenceFromText,
} from "@/lib/builder/feature-choice-hint"

describe("firstSentenceFromText", () => {
  it("returns the first sentence", () => {
    expect(
      firstSentenceFromText(
        "You inject a Mutagen. You gain one of the following benefits of your choice.",
      ),
    ).toBe("You inject a Mutagen.")
  })

  it("strips HTML before splitting", () => {
    expect(firstSentenceFromText("<p>You inject a Mutagen.</p><p>You gain a benefit.</p>")).toBe(
      "You inject a Mutagen.",
    )
  })

  it("does not split on e.g. abbreviations", () => {
    expect(firstSentenceFromText("Choose a score (e.g. Dexterity). Then inject.")).toBe(
      "Choose a score (e.g. Dexterity).",
    )
  })

  it("returns the whole string when there is no sentence break", () => {
    expect(firstSentenceFromText("Choose a mutagen")).toBe("Choose a mutagen")
  })
})

describe("featureChoiceHintFromDescription", () => {
  it("hides details when the whole blurb is a short sentence", () => {
    const hint = featureChoiceHintFromDescription("Choose a mutagen.")
    expect(hint).toMatchObject({ preview: "Choose a mutagen.", showDetails: false })
  })

  it("shows details when later sentences remain", () => {
    const hint = featureChoiceHintFromDescription(
      "You inject a Mutagen. You gain one of the following benefits of your choice for 1 minute.",
    )
    expect(hint?.preview).toBe("You inject a Mutagen.")
    expect(hint?.showDetails).toBe(true)
  })

  it("shows details when a single sentence exceeds the character cap", () => {
    const sentence = `${"A".repeat(FEATURE_CHOICE_HINT_MAX_CHARS + 1)}.`
    const hint = featureChoiceHintFromDescription(sentence)
    expect(hint?.showDetails).toBe(true)
    expect(hint?.preview).toBe(sentence)
  })
})
