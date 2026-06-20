/**
 * Free MySQL connections when "Too many connections" blocks migrate or setup.
 *
 *   $env:MYSQL_ROOT_PASSWORD = '...'
 *   node scripts/db-flush-connections.mjs
 *
 * Kills idle (Sleep) connections for the app database, except this session.
 * Use --all to kill idle connections on any database (still skips system threads).
 */

import mysql from "mysql2/promise"

const host = process.env.MYSQL_HOST?.trim() || "localhost"
const port = Number(process.env.MYSQL_PORT?.trim() || "3306")
const database = process.env.MYSQL_DATABASE?.trim() || "dump_stat"
const rootPassword = process.env.MYSQL_ROOT_PASSWORD ?? "tEa%loss2"
const killAll = process.argv.includes("--all")

if (!rootPassword) {
  console.error("Set MYSQL_ROOT_PASSWORD, then run again.")
  process.exit(1)
}

let connection
try {
  connection = await mysql.createConnection({
    host,
    port,
    user: "root",
    password: rootPassword,
  })

  const [[threadsRow]] = await connection.query(
    "SHOW STATUS LIKE 'Threads_connected'",
  )
  const [[maxRow]] = await connection.query(
    "SHOW VARIABLES LIKE 'max_connections'",
  )
  const threads = Number(threadsRow?.Value ?? 0)
  const maxConnections = Number(maxRow?.Value ?? 0)
  console.log(`Connections: ${threads} / ${maxConnections}`)

  const [processes] = await connection.query("SHOW FULL PROCESSLIST")
  const myId = connection.threadId
  const candidates = processes.filter((row) => {
    if (row.Id === myId) return false
    if (row.Command !== "Sleep") return false
    if (!killAll && row.db !== database) return false
    return true
  })

  if (candidates.length === 0) {
    console.log("No idle connections to kill.")
    if (threads >= maxConnections - 1) {
      console.log(
        "Server is still at the limit. Stop extra `pnpm dev` processes or restart MySQL.",
      )
    }
    process.exit(threads >= maxConnections ? 1 : 0)
  }

  let killed = 0
  for (const row of candidates) {
    try {
      await connection.query(`KILL ?`, [row.Id])
      killed++
      console.log(`killed ${row.Id} (${row.User}@${row.Host}, db=${row.db ?? "—"}, idle ${row.Time}s)`)
    } catch (err) {
      console.warn(`failed to kill ${row.Id}:`, err instanceof Error ? err.message : err)
    }
  }

  const [[afterRow]] = await connection.query(
    "SHOW STATUS LIKE 'Threads_connected'",
  )
  console.log(`Done. Killed ${killed}. Connections now: ${afterRow?.Value ?? "?"}`)
} catch (err) {
  if (err instanceof Error && err.message.includes("Too many connections")) {
    console.error(
      "Cannot connect — server is full. Restart MySQL (XAMPP/WAMP/services.msc) or wait for idle timeouts.",
    )
  } else {
    console.error(err instanceof Error ? err.message : err)
  }
  process.exit(1)
} finally {
  await connection?.end()
}
