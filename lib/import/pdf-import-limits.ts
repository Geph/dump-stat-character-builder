/** PDF import size and parse time limits (defense-in-depth for hosted import). */
export const PDF_IMPORT_MAX_BYTES = 12 * 1024 * 1024
export const PDF_IMPORT_PARSE_TIMEOUT_MS = 45_000

export async function withPdfParseTimeout<T>(
  promise: Promise<T>,
  timeoutMs = PDF_IMPORT_PARSE_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("PDF parsing timed out."))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
