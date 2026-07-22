import { db } from "@workspace/db"
import { appSettings, emailOpens, messages } from "@workspace/db/schema"
import { NextRequest, NextResponse } from "next/server"
import { sql, eq } from "drizzle-orm"
import { recordClick } from "@/lib/analytics"

const CLICK_TRACKING_SETTING = "enable_link_tracking"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> },
) {
  const trackingId = (await params).trackingId

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
      let campaignId: number | null = openRow?.campaignId ?? null
      let leadId: number | null = openRow?.leadId ?? null
      let sequenceId: number | null = null

      if (!messageId) {
        const msgRow = await db
          .select({ id: messages.id, campaignId: messages.campaignId, leadId: messages.leadId, sequenceId: messages.sequenceId })
          .from(messages)
          .where(
            sql`${messages.renderedBody} LIKE ${`%/api/tracking/click/${trackingId}%`}`,
          )
          .limit(1)

        if (msgRow.length > 0) {
          messageId = String(msgRow[0]!.id)
          campaignId = msgRow[0]!.campaignId ?? null
          leadId = msgRow[0]!.leadId ?? null
          sequenceId = msgRow[0]!.sequenceId ?? null
        }
      } else {
        const seqRow = await db
          .select({ sequenceId: messages.sequenceId })
          .from(messages)
          .where(eq(messages.id, Number(messageId)))
          .limit(1)
        sequenceId = seqRow[0]?.sequenceId ?? null
      }

      const ua = _req.headers.get("user-agent") ?? undefined
      const ip =
        _req.headers.get("x-forwarded-for") ??
        _req.headers.get("x-real-ip") ??
        undefined

      if (messageId) {
        await recordClick({
          trackingId,
          messageId,
          campaignId,
          leadId,
          sequenceId,
          originalUrl: targetUrl,
          userAgent: ua,
          ipAddress: ip,
        })
      }
    } catch {
      // Analytics failures must not block the redirect.
    }
  }

  return NextResponse.redirect(targetUrl, { status: 302 })
}
