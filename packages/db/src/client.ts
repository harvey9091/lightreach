import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env["DATABASE_URL"];

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is required. Set it to a PostgreSQL connection string."
      );
    }
    _client = postgres(connectionString, { prepare: false });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

function getRawClient(): ReturnType<typeof postgres> {
  if (!_client) {
    getDb();
  }
  return _client!;
}

const handler: ProxyHandler<ReturnType<typeof drizzle>> = {
  get(_, prop) {
    const instance = getDb();
    const value = (instance as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
  set(_, prop, value) {
    const instance = getDb();
    (instance as unknown as Record<string, unknown>)[prop as string] = value;
    return true;
  },
};

export const db = new Proxy({} as ReturnType<typeof drizzle>, handler);

export type DB = ReturnType<typeof drizzle>;

export async function rawQuery(query: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  return getRawClient().unsafe(query, params as never[]);
}
