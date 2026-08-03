import { NextRequest, NextResponse } from "next/server";
import { pollAllInboxes } from "@/lib/inbox-poller";
import { requireCronSecret } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  if (!requireCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await pollAllInboxes();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Lightreach][cron] inbox-poll error:", err);
    return NextResponse.json({ error: "Poll failed" }, { status: 500 });
  }
}
