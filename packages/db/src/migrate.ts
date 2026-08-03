import postgres from "postgres";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const MIGRATIONS_TABLE = "__lightreach_migrations";
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

function getDrizzleDir(): string {
  return (
    process.env["DRIZZLE_DIR"] ??
    path.join(process.cwd(), "packages", "db", "drizzle")
  );
}

function computeHash(sql: string): string {
  return crypto
    .createHash("sha256")
    .update(sql)
    .digest("hex")
    .slice(0, 20);
}

export async function migrate(): Promise<void> {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    console.log("[Lightreach] DATABASE_URL not set, skipping migrations.");
    return;
  }

  const client = postgres(connectionString, { prepare: false });

  const drizzleDir = getDrizzleDir();

  if (!fs.existsSync(drizzleDir)) {
    console.log("[Lightreach] Migrations directory not found, skipping.");
    return;
  }

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `);

  const rows = await client.unsafe(`SELECT hash FROM ${MIGRATIONS_TABLE}`);
  const applied = new Set<string>(
    (rows as unknown as Array<{ hash: string }>).map((r) => r.hash)
  );

  const drizzleMigrationsApplied = new Set<string>();
  try {
    const drizzleRows = await client.unsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
    );
    if ((drizzleRows as unknown as Array<{ name: string }>).length > 0) {
      const drizzleHashes = await client.unsafe(
        "SELECT hash FROM __drizzle_migrations"
      );
      (drizzleHashes as unknown as Array<{ hash: string }>).forEach((r) =>
        drizzleMigrationsApplied.add(r.hash)
      );
    }
  } catch {
    // __drizzle_migrations does not exist or is not accessible
  }

  const files = fs
    .readdirSync(drizzleDir)
    .filter((f: string) => f.endsWith(".sql"))
    .sort();

  const toExecute: { file: string; sql: string; hash: string }[] = [];
  const toRecord: { file: string; hash: string }[] = [];
  for (const file of files) {
    const filePath = path.join(drizzleDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");
    const hash = computeHash(sql);
    if (!applied.has(hash)) {
      if (drizzleMigrationsApplied.has(hash)) {
        toRecord.push({ file, hash });
      } else {
        toExecute.push({ file, sql, hash });
      }
    }
  }

  if (toExecute.length === 0 && toRecord.length === 0) {
    console.log("[Lightreach] No pending migrations.");
    await client.end();
    return;
  }

  console.log(
    `[Lightreach] Applying ${toExecute.length} migration(s), recording ${toRecord.length} existing migration(s)...`
  );

  for (const entry of toRecord) {
    await client.unsafe(
      `INSERT INTO ${MIGRATIONS_TABLE} (hash, tag) VALUES ($1, $2)`,
      [entry.hash, entry.file.replace(/\.sql$/, "")],
    );
    console.log(`[Lightreach] Recorded existing migration: ${entry.file}`);
  }

  for (const entry of toExecute) {
    const statements = entry.sql
      .split(STATEMENT_BREAKPOINT)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await client.unsafe("BEGIN");
    try {
      for (const stmt of statements) {
        await client.unsafe(stmt);
      }

      await client.unsafe(
        `INSERT INTO ${MIGRATIONS_TABLE} (hash, tag) VALUES ($1, $2)`,
        [entry.hash, entry.file.replace(/\.sql$/, "")],
      );

      await client.unsafe("COMMIT");
      console.log(`[Lightreach] Applied migration: ${entry.file}`);
    } catch (err) {
      await client.unsafe("ROLLBACK");
      console.error(`[Lightreach] Migration failed: ${entry.file}`, err);
      throw err;
    }
  }

  await client.end();
}
