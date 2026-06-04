"use client"

type ChoiceOption = { name: string; description?: string }

type MultiSelectChoicesProps = {
  title: string
  hint?: string
  options: ChoiceOption[]
  maxCount: number
  selected: string[]
  onChange: (selected: string[]) => void
  accentClass?: string
  /** Options that cannot be selected (e.g. already chosen elsewhere). */
  unavailableOptions?: string[]
}

export function MultiSelectChoices({
  title,
  hint,
  options,
  maxCount,
  selected,
  onChange,
  accentClass = "border-primary bg-primary/10",
  unavailableOptions = [],
}: MultiSelectChoicesProps) {
  const unavailable = new Set(unavailableOptions)

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((entry) => entry !== name))
      return
    }
    if (unavailable.has(name) || selected.length >= maxCount) return
    onChange([...selected, name])
  }

  return (
    <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-bold text-sm text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {selected.length}/{maxCount} selected
        </span>
      </div>
      {hint && <p className="text-xs text-muted-foreground mb-3">{hint}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.name)
          const isTakenElsewhere = !isSelected && unavailable.has(option.name)
          const isDisabled = isTakenElsewhere || (!isSelected && selected.length >= maxCount)
          return (
            <button
              key={option.name}
              type="button"
              disabled={isDisabled}
              onClick={() => toggle(option.name)}
              className={`p-2 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? accentClass
                  : isDisabled
                    ? "border-border bg-card opacity-50 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <p className="font-semibold text-sm text-foreground">{option.name}</p>
              {isTakenElsewhere && (
                <p className="text-xs text-muted-foreground mt-0.5">Already chosen</p>
              )}
              {option.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{option.description}</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
