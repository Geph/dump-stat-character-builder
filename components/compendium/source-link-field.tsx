/** Short author/publisher label shown on compact pickers (DB allows 64). */
export const SOURCE_AUTHOR_MAX_LENGTH = 24

interface SourceDetailsFieldProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

/** Freeform source citation (book title, URL, version, notes). Stored as `creator_url`. */
export function SourceLinkField({ value, onChange, className }: SourceDetailsFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-foreground mb-2">Source Details</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={512}
        placeholder="Player's Handbook (2024) · https://example.com · v1.2 · other notes"
        className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-y min-h-[3.25rem]"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Optional. Include full source names, URL, version number, or other notes.
      </p>
    </div>
  )
}

export function normalizeCreatorUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed
}
