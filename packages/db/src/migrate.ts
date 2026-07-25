import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import crypto from "crypto"

const MIGRATIONS_TABLE = "__lightreach_migrations"
const STATEMENT_BREAKPOINT = "--> statement-breakpoint"

function getDrizzleDir(): string {
  return (
    process.env["DRIZZLE_DIR"] ??
    path.join(process.cwd(), "packages", "db", "drizzle")
  )
}

function computeHash(sql: string): string {
  return crypto.createHash("sha256").update(sql).digest("hex").slice(0, 20)
}

export async function migrate(): Promise<void> {
  const dbPath =
    process.env["DATABASE_URL"]?.replace("file:", "") ??
    path.join(process.cwd(), "data.db")

  const sqlite = new Database(dbPath)
  sqlite.pragma("journal_mode = WAL")

  const drizzleDir = getDrizzleDir()

  if (!fs.existsSync(drizzleDir)) {
    console.log("[Lightreach] Migrations directory not found, skipping.")
    return
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      hash TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL
    )
  `)

  const drizzleApplied = new Set<string>()
  const drizzleTableExists = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
  ).get()
  if (drizzleTableExists) {
    const rows = sqlite
      .prepare("SELECT hash FROM __drizzle_migrations")
      .all() as { hash: string }[]
    rows.forEach((r) => drizzleApplied.add(r.hash))
  }

  const ourApplied = new Set(
    (sqlite
      .prepare(`SELECT hash FROM ${MIGRATIONS_TABLE}`)
      .all() as { hash: string }[])
      .map((r) => r.hash),
  )

  const files = fs.readdirSync(drizzleDir).filter((f) => f.endsWith(".sql"))
  const entries = files
    .sort()
    .map((file) => {
      const filePath = path.join(drizzleDir, file)
      const sql = fs.readFileSync(filePath, "utf-8")
      const hash = computeHash(sql)
      const tag = file.replace(/\.sql$/, "")
      return { file, sql, hash, tag }
    })

  const toExecute = entries.filter(
    (e) => !ourApplied.has(e.hash) && !drizzleApplied.has(e.hash),
  )
  const toRecord = entries.filter(
    (e) => !ourApplied.has(e.hash) && drizzleApplied.has(e.hash),
  )

  if (toExecute.length === 0 && toRecord.length === 0) {
    console.log("[Lightreach] No pending migrations.")
    return
  }

  const insertRecord = sqlite.prepare(
    `INSERT INTO ${MIGRATIONS_TABLE} (hash, tag) VALUES (?, ?)`,
  )

  if (toExecute.length > 0) {
    console.log(
      `[Lightreach] Applying ${toExecute.length} pending migration(s)...`,
    )

    const transaction = sqlite.transaction(() => {
      for (const entry of toExecute) {
        const statements = entry.sql
          .split(STATEMENT_BREAKPOINT)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

        for (const stmt of statements) {
          sqlite.exec(stmt)
        }

        insertRecord.run(entry.hash, entry.tag)
        console.log(`[Lightreach] Applied migration: ${entry.file}`)
      }
    })

    try {
      transaction()
    } catch (err) {
      console.error("[Lightreach] Migration failed:", err)
      throw err
    }
  }

  for (const entry of toRecord) {
    insertRecord.run(entry.hash, entry.tag)
    console.log(`[Lightreach] Recorded existing migration: ${entry.file}`)
  }
}
