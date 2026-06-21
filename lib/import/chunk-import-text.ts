const DEFAULT_CHUNK_SIZE = 42_000

/** Split long PDF/plain text into page-aware chunks for multi-pass AI extraction. */
export function chunkImportText(text: string, maxChunkSize = DEFAULT_CHUNK_SIZE): string[] {
  const trimmed = text.trim()
  if (trimmed.length <= maxChunkSize) return [trimmed]

  const pageParts = trimmed.split(/(?=--\s*\d+\s+of\s+\d+\s+--)/)
  if (pageParts.length <= 1) {
    const chunks: string[] = []
    for (let offset = 0; offset < trimmed.length; offset += maxChunkSize) {
      chunks.push(trimmed.slice(offset, offset + maxChunkSize))
    }
    return chunks
  }

  const chunks: string[] = []
  let current = ""
  for (const part of pageParts) {
    const next = current ? `${current}\n${part}` : part
    if (next.length > maxChunkSize && current) {
      chunks.push(current.trim())
      current = part
    } else {
      current = next
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter((chunk) => chunk.length >= 50)
}
