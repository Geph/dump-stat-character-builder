import { IMPORT_CONTENT_TYPE_HINTS } from "@/lib/import/content-type-hints"

type ImportContentTypeHintSelectProps = {
  value: string
  onChange: (value: string) => void
  focusRingClassName?: string
  /** Defaults to "Type:". */
  label?: string
}

export function ImportContentTypeHintSelect({
  value,
  onChange,
  focusRingClassName = "focus:ring-primary",
  label = "Type:",
}: ImportContentTypeHintSelectProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">{label}</label>
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
