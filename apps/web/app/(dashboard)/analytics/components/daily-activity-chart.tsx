"use client"

import {
  Card,
  CardContent,
  CardDescription,
} from "@workspace/ui/components/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

const chartConfig = {
  sent: { label: "Sent", color: "var(--chart-1)" },
  opens: { label: "Opens", color: "var(--chart-3)" },
  clicks: { label: "Clicks", color: "var(--chart-4)" },
} satisfies ChartConfig

export function DailyActivityChart({
  data,
}: {
  data: { date: string; day: string; sent: number; opens: number; clicks: number }[]
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel={false} />} />
        <Bar dataKey="sent" fill="var(--color-sent)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="opens" fill="var(--color-opens)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
