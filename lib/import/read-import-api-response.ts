export type ImportApiJsonResult =
  | { ok: true; data: Record<string, unknown>; status: number }
  | { ok: false; message: string; status: number }

/** Parse import API responses without throwing on empty or non-JSON bodies. */
export async function readImportApiJson(response: Response): Promise<ImportApiJsonResult> {
  const status = response.status
  const text = await response.text()
  const trimmed = text.trim()

  if (!trimmed) {
    return {
      ok: false,
      status,
      message:
        status === 404
          ? "Import API is not available on this deployment. Use a hosted build with MySQL, or run the app locally with pnpm dev."
          : `Import API returned an empty response (HTTP ${status}). Check that the dev server is running and MySQL is reachable.`,
    }
  }

  try {
    const data = JSON.parse(trimmed) as unknown as Record<string, unknown>
    return { ok: true, status, data }
  } catch {
    return {
      ok: false,
      status,
      message: `Import API returned non-JSON (HTTP ${status}): ${trimmed.slice(0, 240)}`,
    }
  }
}
