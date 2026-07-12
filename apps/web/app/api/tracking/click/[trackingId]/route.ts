import { db } from "@workspace/db"
import { appSettings, emailOpens, messages, linkClicks } from "@workspace/db/schema"
import { NextRequest, NextResponse } from "next/server"
import { sql, eq } from "drizzle-orm"

const CLICK_TRACKING_SETTING = "enable_link_tracking"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> },
) {
  const { trackingId } = await params

  let trackingEnabled = true
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, CLICK_TRACKING_SETTING))
    trackingEnabled = rows.length > 0 ? rows[0]!.value === "true" : true
  } catch {
    trackingEnabled = true
  }

  const targetUrl = _req.nextUrl.searchParams.get("url")
  if (!targetUrl || !targetUrl.startsWith("http")) {
    return new NextResponse("Bad request", { status: 400 })
  }

  if (trackingEnabled) {
    try {
      const [openRow] = await db
        .select({ messageId: emailOpens.messageId, campaignId: emailOpens.campaignId, leadId: emailOpens.leadId })
        .from(emailOpens)
        .where(eq(emailOpens.trackingId, trackingId))
        .limit(1)

      let messageId = openRow?.messageId
      let campaignId: number | undefined = openRow?.campaignId ?? undefined
      let leadId: number | undefined = openRow?.leadId ?? undefined

      if (!messageId) {
        const msgRow = await db
          .select({ id: messages.id, campaignId: messages.campaignId, leadId: messages.leadId })
          .from(messages)
          .where(
            sql`${messages.renderedBody} LIKE ${`%/api/tracking/click/${trackingId}%`}`,
          )
          .limit(1)

        if (msgRow.length > 0) {
          messageId = String(msgRow[0]!.id)
          campaignId = msgRow[0]!.campaignId ?? undefined
          leadId = msgRow[0]!.leadId
        }
      }

      const ua = _req.headers.get("user-agent") ?? undefined
      const ip =
        _req.headers.get("x-forwarded-for") ??
        _req.headers.get("x-real-ip") ??
        undefined

      if (messageId) {
        try {
          await db.insert(linkClicks).values({
            trackingId,
            messageId,
            campaignId,
            leadId,
            originalUrl: targetUrl,
            clickedAt: Math.floor(Date.now() / 1000),
            userAgent: ua,
            ipAddress: ip,
          })
        } catch {
          // unique_violation — silently swallow
        }
      }
    } catch {
      // Silently ignore tracking errors
    }
  }

  return NextResponse.redirect(targetUrl, { status: 302 })
}
