import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { IconMail, IconSend, IconUsers, IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"
import { ActivityChart } from "./activity-chart"
import { db } from "@workspace/db"
import { connections, campaigns, leads, messages } from "@workspace/db/schema"
import { count, and, eq, gte, inArray } from "drizzle-orm"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

async function getDashboardStats() {
  const connectionRow = await db.select({ total: count() }).from(connections)
  const connectionCount = connectionRow[0]?.total ?? 0

  const activeCampaignRow = await db
    .select({ total: count() })
    .from(campaigns)
    .where(inArray(campaigns.status, ["running", "scheduled"]))
  const activeCampaignCount = activeCampaignRow[0]?.total ?? 0

  const leadRow = await db.select({ total: count() }).from(leads)
  const leadCount = leadRow[0]?.total ?? 0

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const weekStart = days[0]!
  const sentMessages = await db
    .select({ sentAt: messages.sentAt })
    .from(messages)
    .where(and(eq(messages.status, "sent"), gte(messages.sentAt, weekStart)))

  const chartData = days.map((d) => ({
    day: DAY_LABELS[d.getDay()]!,
    emails: sentMessages.filter((m) => {
      if (!m.sentAt) return false
      const msg = new Date(m.sentAt)
      msg.setHours(0, 0, 0, 0)
      return msg.getTime() === d.getTime()
    }).length,
  }))

  return { connectionCount, activeCampaignCount, leadCount, chartData }
}

export default async function DashboardPage() {
  const { connectionCount, activeCampaignCount, leadCount, chartData } =
    await getDashboardStats()

  const stats = [
    {
      label: "Connected Mailboxes",
      value: connectionCount,
      description: "SMTP accounts ready to send",
      icon: IconMail,
      href: "/connections",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      glowColor: "bg-blue-500/5",
    },
    {
      label: "Active Campaigns",
      value: activeCampaignCount,
      description: "Campaigns currently running",
      icon: IconSend,
      href: "/campaigns",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      glowColor: "bg-amber-500/5",
    },
    {
      label: "Total Leads",
      value: leadCount,
      description: "Contacts across all lists",
      icon: IconUsers,
      href: "/leads",
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
      glowColor: "bg-violet-500/5",
    },
  ]

  return (
    <div className="relative z-10 space-y-8">
      <div>
        <h1 className="text-display">Dashboard</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Your cold-email command center.
        </p>
        <div className="accent-line mt-4" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((stat) => (
          <Link key={stat.href} href={stat.href} className="group block">
            <div className="glass card card-hover relative overflow-visible rounded-[min(var(--radius-4xl),20px)] p-5 transition-all duration-200 hover:-translate-y-0.5 h-full">
              <div
                className={`absolute -inset-0.5 rounded-[inherit] ${stat.glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />
              <div className="relative z-0 space-y-3">
                <div
                  className={`flex items-center justify-center size-10 rounded-xl ${stat.bgColor}`}
                >
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <div className="text-2xl font-bold tracking-tight">
                    {stat.value}
                  </div>
                  <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                    {stat.description}
                    <IconArrowRight className="size-3 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <Card className="hover:shadow-[0_4px_24px_rgba(59,130,246,0.08)] transition-shadow duration-300">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-heading">Emails sent</CardTitle>
            <CardDescription>Activity over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={chartData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
