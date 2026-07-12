import { IMPORT_CONTENT_TYPE_HINTS } from "@/lib/import/content-type-hints"

type ImportContentTypeHintSelectProps = {
  value: string
  onChange: (value: string) => void
  focusRingClassName?: string
  /** Defaults to "Content type hint:". */
  label?: string
}

export function ImportContentTypeHintSelect({
  value,
  onChange,
  focusRingClassName = "focus:ring-primary",
  label = "Content type hint:",
}: ImportContentTypeHintSelectProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-3 py-1.5 bg-muted rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 ${focusRingClassName}`}
      >
        {IMPORT_CONTENT_TYPE_HINTS.map((hint) => (
          <option key={hint.value} value={hint.value}>
            {hint.label}
          </option>
        ))}
      </select>
    </div>
  )
}
