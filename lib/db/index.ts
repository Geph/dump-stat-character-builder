import { drizzle, type MySql2Database } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import { getDatabaseUrl } from "./config"
import * as schema from "./schema"

export type Db = MySql2Database<typeof schema>

let pool: mysql.Pool | null = null
let db: Db | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      uri: getDatabaseUrl(),
      connectionLimit: 10,
      waitForConnections: true,
    })
  }
  return pool
}

export function getDb(): Db {
  if (!db) {
    db = drizzle(getPool(), { schema, mode: "default" })
  }
  return db
}

export { schema }
