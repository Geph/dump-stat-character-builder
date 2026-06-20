import { drizzle, type MySql2Database } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import { getDatabaseUrl } from "./config"
import * as schema from "./schema"

export type Db = MySql2Database<typeof schema>

type PoolCache = {
  pool: mysql.Pool
  db: Db
}

const globalForDb = globalThis as typeof globalThis & {
  __dumpStatDb?: PoolCache
}

function createPoolCache(): PoolCache {
  const isDev = process.env.NODE_ENV !== "production"
  const pool = mysql.createPool({
    uri: getDatabaseUrl(),
    connectionLimit: isDev ? 3 : 10,
    waitForConnections: true,
    maxIdle: isDev ? 1 : 10,
    idleTimeout: isDev ? 10_000 : 60_000,
  })
  const db = drizzle(pool, { schema, mode: "default" })
  return { pool, db }
}

function getPoolCache(): PoolCache {
  if (!globalForDb.__dumpStatDb) {
    globalForDb.__dumpStatDb = createPoolCache()
  }
  return globalForDb.__dumpStatDb
}

export function getPool(): mysql.Pool {
  return getPoolCache().pool
}

export function getDb(): Db {
  return getPoolCache().db
}

export async function closeDbPool(): Promise<void> {
  const cache = globalForDb.__dumpStatDb
  if (!cache) return
  await cache.pool.end()
  globalForDb.__dumpStatDb = undefined
}

export { schema }
