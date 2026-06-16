"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { PieChartIcon } from "lucide-react"

const chartConfig: ChartConfig = {
  count: { label: "Incidents" },
}

export function PostureBreakdown({
  activate,
  hold,
  reject,
}: {
  activate: number
  hold: number
  reject: number
}) {
  const data = [
    { posture: "Activate", count: activate, color: "var(--destructive)" },
    { posture: "Hold", count: hold, color: "var(--warning)" },
    { posture: "Reject", count: reject, color: "var(--success)" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Recommended posture mix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="posture"
              tickLine={false}
              axisLine={false}
              width={64}
              fontSize={12}
            />
            <Bar dataKey="count" radius={4} barSize={28}>
              {data.map((entry) => (
                <Cell key={entry.posture} fill={entry.color} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
