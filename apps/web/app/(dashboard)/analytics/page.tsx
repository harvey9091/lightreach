import { DailyActivityChart } from "./components/daily-activity-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@workspace/ui/components/table"
import {
  IconMail,
  IconEye,
  IconMouse,
  IconMessageReply,
  IconTrendingUp,
  IconSend,
} from "@tabler/icons-react"
import { db } from "@workspace/db"
import {
  campaigns,
  messages,
  leads,
  emailOpens,
  linkClicks,
} from "@workspace/db/schema"
import {
  count,
  and,
  eq,
  desc,
  gte,
  sql,
} from "drizzle-orm"

function pct(num: number, denom: number): string {
  if (denom === 0) return "—"
  return `${((num / denom) * 100).toFixed(1)}%`
}

function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—"
  return n.toLocaleString()
}

async function getOverviewStats() {
  const [sentRow] = await db
    .select({ total: count() })
    .from(messages)
    .where(eq(messages.status, "sent"))
  const totalSent = sentRow?.total ?? 0

  const [openCountRow] = await db
    .select({ total: count() })
    .from(emailOpens)
  const totalOpens = openCountRow?.total ?? 0

  const [clickCountRow] = await db
    .select({ total: count() })
    .from(linkClicks)
  const totalClicks = clickCountRow?.total ?? 0

  const [replyRow] = await db
    .select({ total: count() })
    .from(leads)
    .where(eq(leads.status, "replied"))
  const totalReplies = replyRow?.total ?? 0

  return { totalSent, totalOpens, totalClicks, totalReplies }
}

async function getCampaignStats() {
  const sentCampaignIds = await db
    .select({ campaignId: messages.campaignId })
    .from(messages)
    .where(eq(messages.status, "sent"))

  const uniqueCampaignIds = [
    ...new Set(sentCampaignIds.map((r) => r.campaignId).filter((id): id is number => id != null)),
  ]

  const results = await Promise.all(
    uniqueCampaignIds.map(async (cid) => {
      const [sentRow] = await db.select({ total: count() }).from(messages).where(and(eq(messages.status, "sent"), eq(messages.campaignId, cid)))
      const [openedRow] = await db.select({ total: count() }).from(emailOpens).where(eq(emailOpens.campaignId, cid))
      const [clickedRow] = await db.select({ total: count() }).from(linkClicks).where(eq(linkClicks.campaignId, cid))
      const campRow = await db.select({ name: campaigns.name, status: campaigns.status }).from(campaigns).where(eq(campaigns.id, cid)).limit(1)

      const sent = sentRow?.total ?? 0
      return {
        campaignId: cid,
        campaignName: campRow[0]?.name ?? "—",
        sent,
        opened: openedRow?.total ?? 0,
        clicked: clickedRow?.total ?? 0,
        openPct: pct(openedRow?.total ?? 0, sent),
        ctrPct: pct(clickedRow?.total ?? 0, sent),
        status: campRow[0]?.status,
      }
    }),
  )

  return results
}

async function getDailyStats() {
  const now = new Date()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const weekStartMs = days[0]!.getTime()

  const sentMessages = await db
    .select({ sentAt: messages.sentAt })
    .from(messages)
    .where(and(eq(messages.status, "sent"), gte(messages.sentAt, days[0]!)))
  const openRows = await db
    .select({ openedAt: emailOpens.openedAt })
    .from(emailOpens)
    .where(gte(emailOpens.openedAt, days[0]!))
  const clickRows = await db
    .select({ clickedAt: linkClicks.clickedAt })
    .from(linkClicks)
    .where(gte(linkClicks.clickedAt, Math.floor(weekStartMs / 1000)))

  return days.map((d) => {
    const dayStart = d.getTime()
    const dayEnd = dayStart + 86_400_000
    const sent = sentMessages.filter((m) => (m.sentAt?.getTime() ?? 0) >= dayStart && (m.sentAt?.getTime() ?? 0) < dayEnd).length
    const opens = openRows.filter((r) => (r.openedAt?.getTime() ?? 0) >= dayStart && (r.openedAt?.getTime() ?? 0) < dayEnd).length
    const clicks = clickRows.filter((r) => { const ts = typeof r.clickedAt === "number" ? r.clickedAt * 1000 : 0; return ts >= dayStart && ts < dayEnd }).length
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]!,
      sent,
      opens,
      clicks,
    }
  })
}

async function getRecentActivity() {
  const activities: { type: string; label: string; time: number; campaign?: string; url?: string }[] = []

  const recentOpens = await db
    .select({
      openedAt: emailOpens.openedAt,
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
      campaignName: campaigns.name,
    })
    .from(emailOpens)
    .leftJoin(messages, eq(messages.messageId, emailOpens.messageId))
    .leftJoin(leads, eq(leads.id, messages.leadId))
    .leftJoin(campaigns, eq(campaigns.id, messages.campaignId))
    .orderBy(desc(emailOpens.openedAt))
    .limit(5)

  for (const o of recentOpens) {
    activities.push({
      type: "open",
      label: `${o.leadFirstName ?? ""} ${o.leadLastName ?? ""}`.trim() || "Someone",
      time: o.openedAt.getTime(),
      campaign: o.campaignName ?? undefined,
    })
  }

  const recentClicks = await db
    .select({
      clickedAt: linkClicks.clickedAt,
      originalUrl: linkClicks.originalUrl,
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
      campaignName: campaigns.name,
    })
    .from(linkClicks)
    .leftJoin(messages, eq(messages.messageId, linkClicks.messageId))
    .leftJoin(leads, eq(leads.id, messages.leadId))
    .leftJoin(campaigns, eq(campaigns.id, messages.campaignId))
    .orderBy(desc(linkClicks.clickedAt))
    .limit(5)

  for (const c of recentClicks) {
    let displayUrl = c.originalUrl
    try { const u = new URL(c.originalUrl); displayUrl = u.hostname + u.pathname } catch {}
    const clickedAtMs = (c.clickedAt ?? 0) * 1000
    activities.push({
      type: "click",
      label: `${c.leadFirstName ?? ""} ${c.leadLastName ?? ""}`.trim() || "Someone",
      time: clickedAtMs,
      campaign: c.campaignName ?? undefined,
      url: displayUrl,
    })
  }

  activities.sort((a, b) => b.time - a.time)
  return activities.slice(0, 10)
}

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Server component
// ---------------------------------------------------------------------------

export default async function AnalyticsPage() {
  const stats = await getOverviewStats()
  const campaignStats = await getCampaignStats()
  const dailyData = await getDailyStats()
  const recentActivity = await getRecentActivity()

  const openRatePct = pct(stats.totalOpens, stats.totalSent)
  const clickRatePct = pct(stats.totalClicks, stats.totalSent)
  const replyRatePct = pct(stats.totalReplies, stats.totalSent)

  return (
    <div className="relative z-10 max-w-5xl space-y-8">
      <div>
        <h1 className="text-display">Analytics</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Email outreach performance across all campaigns.
        </p>
        <div className="accent-line mt-4" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Emails Sent" value={fmtCount(stats.totalSent)} sub="Total sent across all campaigns" icon={IconSend} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Unique Opens" value={fmtCount(stats.totalOpens)} sub={openRatePct !== "—" ? `Open rate ${openRatePct}` : "Open rate —"} icon={IconEye} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Unique Clicks" value={fmtCount(stats.totalClicks)} sub={clickRatePct !== "—" ? `CTR ${clickRatePct}` : "CTR —"} icon={IconMouse} color="text-violet-400" bg="bg-violet-500/10" />
        <StatCard label="Replies" value={fmtCount(stats.totalReplies)} sub={replyRatePct !== "—" ? `Reply rate ${replyRatePct}` : "Reply rate —"} icon={IconMessageReply} color="text-amber-400" bg="bg-amber-500/10" />
      </div>

      <Card>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
              <IconTrendingUp className="text-primary size-4" />
            </div>
            <div>
              <CardTitle className="text-heading">Daily Activity</CardTitle>
              <CardDescription>Last 14 days</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DailyActivityChart data={dailyData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
              <IconMail className="text-primary size-4" />
            </div>
            <div>
              <CardTitle className="text-heading">Campaign Performance</CardTitle>
              <CardDescription>Top-performing outreach campaigns</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{campaignStats.length} campaign{campaignStats.length === 1 ? "" : "s"} with sends</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11">Campaign</TableHead>
                <TableHead className="h-11 text-right">Sent</TableHead>
                <TableHead className="h-11 text-right">Opened</TableHead>
                <TableHead className="h-11 text-right">Clicked</TableHead>
                <TableHead className="h-11 text-right">Open %</TableHead>
                <TableHead className="h-11 text-right">CTR %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <p className="text-body">No campaign data yet.</p>
                      <p className="text-xs mt-1">Data will appear after you send emails.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                campaignStats.map((campaign) => (
                  <TableRow key={campaign.campaignId}>
                    <TableCell className="px-4 py-3 font-medium text-sm">{campaign.campaignName}</TableCell>
                    <TableCell className="px-3 py-3.5 text-right text-xs tabular-nums">{fmtCount(campaign.sent)}</TableCell>
                    <TableCell className="px-3 py-3.5 text-right text-xs tabular-nums">{fmtCount(campaign.opened)}</TableCell>
                    <TableCell className="px-3 py-3.5 text-right text-xs tabular-nums">{fmtCount(campaign.clicked)}</TableCell>
                    <TableCell className="px-3 py-3.5 text-right text-xs tabular-nums">{campaign.openPct}</TableCell>
                    <TableCell className="px-3 py-3.5 text-right text-xs tabular-nums">{campaign.ctrPct}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
              <IconTrendingUp className="text-primary size-4" />
            </div>
            <div>
              <CardTitle className="text-heading">Recent Activity</CardTitle>
              <CardDescription>Latest opens and clicks across all campaigns</CardDescription>

            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No activity yet.</p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((item, i) => (
                <div
                  key={`${item.type}-${item.time / 1000 | 0}-${i}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs tabular-nums w-28 shrink-0">
                      {formatTimeAgo(item.time)}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.type === "open" ? "opened email" : `clicked ${item.url ?? "a link"}`}
                      {item.campaign ? ` in ${item.campaign}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label, value, sub, icon: Icon, color, bg,
}: { label: string; value: string; sub: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-3">
          <div className={`flex items-center justify-center size-9 rounded-xl ${bg}`}>
            <Icon className={`size-4 ${color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
