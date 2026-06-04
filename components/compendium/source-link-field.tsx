interface SourceLinkFieldProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SourceLinkField({ value, onChange, className }: SourceLinkFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-foreground mb-2">Source Link</label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/source"
        className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />
      <p className="text-xs text-muted-foreground mt-1">Optional link to the original source material.</p>
    </div>
  )
}

export function normalizeCreatorUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed
}
