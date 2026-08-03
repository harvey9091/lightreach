import { NextRequest, NextResponse } from "next/server";
import { tick } from "@/lib/scheduler";
import { requireCronSecret } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  if (!requireCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await tick();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Lightreach][cron] scheduler-tick error:", err);
    return NextResponse.json({ error: "Tick failed" }, { status: 500 });
  }
}
