const PLACEHOLDER = /your-|placeholder|example\.com|changeme/i

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (url && !PLACEHOLDER.test(url)) return url

  const host = process.env.MYSQL_HOST?.trim()
  const user = process.env.MYSQL_USER?.trim()
  const password = process.env.MYSQL_PASSWORD ?? ""
  const database = process.env.MYSQL_DATABASE?.trim()
  const port = process.env.MYSQL_PORT?.trim() || "3306"

  if (host && user && database && !PLACEHOLDER.test(host)) {
    const encodedPassword = encodeURIComponent(password)
    return `mysql://${user}:${encodedPassword}@${host}:${port}/${database}`
  }

  throw new Error(
    "Database is not configured. Set DATABASE_URL or MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE in .env.local.",
  )
}

export function getDatabaseConfigError(): string | null {
  try {
    getDatabaseUrl()
    return null
  } catch (e) {
    return e instanceof Error ? e.message : "Database is not configured."
  }
}

export function formatDatabaseError(context: string, message: string): string {
  if (
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("Access denied")
  ) {
    return (
      `${context}: Could not connect to MySQL. Check DATABASE_URL (or MYSQL_* vars), ` +
      "ensure your Dreamhost database allows connections from this host, and restart the dev server."
    )
  }
  if (message.includes("doesn't exist") || message.includes("Unknown table")) {
    return (
      `${context}: Database tables are missing. Run mysql/schema.sql on your Dreamhost MySQL database, then try again.`
    )
  }
  return `${context}: ${message}`
}
