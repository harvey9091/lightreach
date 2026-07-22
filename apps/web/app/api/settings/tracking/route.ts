import { db } from "@workspace/db"
import { appSettings } from "@workspace/db/schema"
import { NextRequest, NextResponse } from "next/server"
import { inArray } from "drizzle-orm"

const TRACKING_KEYS = ["enable_open_tracking", "enable_link_tracking"]

export async function GET() {
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, TRACKING_KEYS))

  const result: Record<string, boolean> = {}
  for (const key of TRACKING_KEYS) {
    const row = rows.find((r) => r.key === key)
    result[key] = row ? row.value === "true" : true
  }

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, boolean>

  for (const key of TRACKING_KEYS) {
    if (key in body) {
      await db
        .insert(appSettings)
        .values({ key, value: body[key] ? "true" : "false", updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: body[key] ? "true" : "false", updatedAt: new Date() },
        })
    }
  }

  return NextResponse.json({ ok: true })
}
